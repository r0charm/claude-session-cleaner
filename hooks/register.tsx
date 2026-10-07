import type { EngineInterface, Register, RenderPropsOf } from 'claude-code'

import {
  FILTER,
  asking,
  cancelled,
  deleted,
  freshState,
  rowKey,
  rows,
  view,
  withFocus,
  withFound,
  withNote,
  withQuery,
  withScopeToggled,
  type State,
} from './picker'
import { leftovers, parseTranscript, sessionId, type Leftover, type Session } from './sessions'
import { retentionDays } from './settings'
import { ALIVE_SCRIPT, READ_BATCH, READ_SCRIPT, SIZE_SCRIPT, splitRead, splitSizes } from './shell'

const PANE = 'session-cleaner'

const FIXED_ROWS = 5

async function configRoot($: EngineInterface): Promise<string> {
  return (await $.env.get('CLAUDE_CONFIG_DIR')) || `${await $.env.get('HOME')}/.claude`
}

async function readRetention($: EngineInterface, root: string, cwd: string): Promise<number> {
  const files = [`${root}/settings.json`, `${cwd}/.claude/settings.json`, `${cwd}/.claude/settings.local.json`]
  return retentionDays(await Promise.all(files.map(f => $.fs.read(f).catch(() => ''))))
}

async function listDir($: EngineInterface, path: string) {
  return $.fs.list(path).catch(() => [])
}

async function sh($: EngineInterface, script: string, args: readonly string[]): Promise<string> {
  return (await $.process.run(['sh', '-c', script, 'sh', ...args])).stdout
}

async function loadSessions($: EngineInterface, root: string): Promise<Session[]> {
  const projects = `${root}/projects`
  const dirs = (await listDir($, projects)).filter(d => d.kind === 'dir')
  const perDir = await Promise.all(
    dirs.map(async dir =>
      (await listDir($, `${projects}/${dir.name}`)).flatMap((file): Session[] => {
        const id = file.kind === 'file' ? sessionId(file.name) : ''
        if (!id) return []
        const path = `${projects}/${dir.name}/${file.name}`
        return [{ id, path, project: dir.name, cwd: '', title: '', mtimeMs: file.mtimeMs, size: file.size }]
      }),
    ),
  )
  const found = perDir.flat()
  const batches: Session[][] = []
  for (let i = 0; i < found.length; i += READ_BATCH) batches.push(found.slice(i, i + READ_BATCH))
  await Promise.all(
    batches.map(async batch => {
      const read = splitRead(await sh($, READ_SCRIPT, batch.map(s => s.path)))
      for (const s of batch) {
        const lines = read.get(s.path)
        Object.assign(s, parseTranscript(lines?.userLines ?? '', lines?.titleLines ?? ''))
      }
    }),
  )
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs)
}

async function runningIds($: EngineInterface, root: string): Promise<Set<string>> {
  const files = (await listDir($, `${root}/sessions`)).filter(f => f.name.endsWith('.json'))
  const byPid = new Map<string, string>()
  await Promise.all(
    files.map(async f => {
      try {
        const data = JSON.parse(await $.fs.read(`${root}/sessions/${f.name}`))
        if (Number.isInteger(data.pid) && typeof data.sessionId === 'string') byPid.set(String(data.pid), data.sessionId)
      } catch {}
    }),
  )
  if (byPid.size === 0) return new Set()
  const alive = await sh($, ALIVE_SCRIPT, [...byPid.keys()])
  return new Set(alive.split('\n').flatMap(pid => byPid.get(pid) ?? []))
}

async function sessionLeftovers($: EngineInterface, root: string, s: Session): Promise<Leftover[]> {
  const todos = (await listDir($, `${root}/todos`)).map(f => f.name)
  return leftovers(root, s, todos)
}

async function measure($: EngineInterface, root: string, s: Session) {
  const all = await sessionLeftovers($, root, s)
  const sizes = splitSizes(await sh($, SIZE_SCRIPT, all.map(l => l.path)))
  return all.filter(l => sizes.has(l.path)).map(l => ({ kind: l.kind, bytes: sizes.get(l.path) ?? 0 }))
}

async function deleteSession($: EngineInterface, root: string, s: Session): Promise<string> {
  const paths = (await sessionLeftovers($, root, s)).map(l => l.path)
  const { exitCode, stderr } = await $.process.run(['rm', '-rf', '--', ...paths])
  return exitCode === 0 ? '' : stderr.trim() || `rm exited ${exitCode}`
}

let state: State = freshState()
let draws = 0

function set($: EngineInterface, next: State): void {
  state = next
  $.ui.invalidate('ui.render')
}

async function waitForRedraw($: EngineInterface): Promise<void> {
  const before = draws
  $.ui.invalidate('ui.render')
  for (let waited = 0; draws === before && waited < 1000; waited += 20) await $.clock.sleep(20)
}

async function focusAfterRedraw($: EngineInterface, key: string): Promise<void> {
  await waitForRedraw($)
  state = { ...state, focused: key }
  await $.ui.focus({ requestId: PANE, key })
}

function show($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Sessions', focus: true, closeOnEscape: true, rows: 18, columns: 110 })
}

async function openPicker($: EngineInterface): Promise<void> {
  const root = await configRoot($)
  const cwd = await $.session.cwd()
  const [current, sessions, live, days] = await Promise.all([
    $.session.id(),
    loadSessions($, root),
    runningIds($, root),
    readRetention($, root, cwd),
  ])
  state = freshState({ root, cwd, sessions, hidden: new Set([current, ...live]), retentionDays: days })
  await show($)
}

async function ask($: EngineInterface): Promise<void> {
  set($, asking(state))
  const s = state.sessions.find(one => one.id === state.confirming)
  if (s) set($, withFound(state, s.id, await measure($, state.root, s)))
}

async function remove($: EngineInterface, s: Session): Promise<void> {
  const error = await deleteSession($, state.root, s)
  if (error) return set($, withNote({ ...state, confirming: '' }, `delete failed: ${error.slice(0, 80)}`))
  state = deleted(state, s)
  await focusAfterRedraw($, state.focused)
}

async function render($: EngineInterface, elements: ReturnType<EngineInterface['ui']['resolve']>, props: RenderPropsOf['Pane']) {
  draws += 1
  const { Box, Text, Button } = elements
  const Input = 'Input' in elements ? elements.Input : undefined
  const v = view(state, Math.max(3, props.scroll.bodyRows - FIXED_ROWS), props.bodyColumns, await $.clock.now())
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{v.title}</Text>
        <Button key="scope" plain dimColor label={v.scope} onPress={() => set($, withScopeToggled(state))} />
      </Box>
      <Text color={v.isAsking ? 'error' : undefined} dimColor={!v.isAsking}>
        {v.hint}
      </Text>
      {Input && (
        <Input
          key={FILTER}
          label="> "
          placeholder="filter"
          value={state.query}
          autoFocus
          submitLabel="go to list"
          onInput={(query: string) => set($, withQuery(state, query))}
          onSubmit={(query: string) => {
            const first = rows(withQuery(state, query))[0]
            set($, withQuery(state, ''))
            if (!first) return
            void focusAfterRedraw($, rowKey(first.id))
          }}
        />
      )}
      {v.rows.length === 0 && <Text dimColor>No sessions.</Text>}
      {v.rows.map(row => (
        <Box key={`box:${row.key}`} flexDirection="row" justifyContent="space-between">
          <Button
            key={row.key}
            plain
            label={row.label}
            onPress={() => void (state.confirming === row.session.id ? remove($, row.session) : ask($))}
          />
          <Text color={row.isAsked ? 'error' : undefined} dimColor={!row.isAsked}>
            {row.meta}
          </Text>
        </Box>
      ))}
      <Box flexDirection="row" justifyContent="space-between">
        <Text dimColor>{v.retention}</Text>
        <Button key="delete" dimColor hotkey="d" label={v.count} onPress={() => void ask($)} />
      </Box>
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sessions', description: 'Delete Claude Code sessions' })
    return next(e)
  })
  on('command.run', { command: 'sessions' }, async $ => {
    await openPicker($)
    return {}
  })
  on('ui.focus', { requestId: PANE }, async ($, e, next) => {
    const moved = await next(e)
    if (!moved.deny) set($, withFocus(state, e.element ?? ''))
    return moved
  })
  on('ui.close', { id: PANE }, ($, e, next) => {
    if (e.origin.kind !== 'person' || !state.confirming) return next(e)
    set($, cancelled(state))
    const row = state.focused
    void show($).then(() => focusAfterRedraw($, row))
    return { deny: 'delete cancelled' }
  })
  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => render($, $.ui.resolve(e), e.props))
}
