import { DEFAULT_RETENTION_DAYS } from './settings'
import { ago, folderName, human, isInFolder, matches, type Session } from './sessions'

export type Found = { kind: string; bytes: number }

export const FILTER = 'filter'
const ROW = 'row:'

export const rowKey = (id: string) => ROW + id

export type State = {
  root: string
  cwd: string
  sessions: Session[]
  hidden: ReadonlySet<string>
  query: string
  isAll: boolean
  focused: string
  confirming: string
  found: Found[]
  note: string
  retentionDays: number
}

type Opened = Pick<State, 'root' | 'cwd' | 'sessions' | 'hidden' | 'retentionDays'>

export function freshState(opened: Partial<Opened> = {}): State {
  const state: State = {
    root: '',
    cwd: '',
    sessions: [],
    hidden: new Set(),
    retentionDays: DEFAULT_RETENTION_DAYS,
    ...opened,
    query: '',
    isAll: false,
    focused: '',
    confirming: '',
    found: [],
    note: '',
  }
  return { ...state, isAll: rows(state).length === 0 }
}

export function rows(state: State): Session[] {
  return state.sessions.filter(
    s =>
      s.title &&
      !state.hidden.has(s.id) &&
      (state.isAll || isInFolder(s, state.cwd)) &&
      matches(s, state.query),
  )
}

export function selected(state: State): Session | undefined {
  return rows(state).find(s => rowKey(s.id) === state.focused)
}

export const withNote = (state: State, note: string): State => ({ ...state, note })

export const withQuery = (state: State, query: string): State => ({ ...state, query, confirming: '', found: [] })

export const withScopeToggled = (state: State): State => ({ ...state, isAll: !state.isAll })

export function withFocus(state: State, key: string): State {
  const isStill = key === rowKey(state.confirming)
  return { ...state, focused: key, confirming: isStill ? state.confirming : '', found: isStill ? state.found : [], note: '' }
}

export function asking(state: State): State {
  const s = selected(state)
  return s ? { ...state, confirming: s.id, found: [] } : withNote(state, 'move to a session first (↓)')
}

export function withFound(state: State, id: string, found: Found[]): State {
  return state.confirming === id ? { ...state, found } : state
}

export function cancelled(state: State): State {
  return { ...state, focused: rowKey(state.confirming), confirming: '', found: [] }
}

export function deleted(state: State, gone: Session): State {
  const at = rows(state).indexOf(gone)
  const freed = state.confirming === gone.id ? state.found.reduce((sum, f) => sum + f.bytes, 0) : 0
  const after = { ...state, sessions: state.sessions.filter(s => s !== gone), confirming: '', found: [] }
  const left = rows(after)
  const next = left[Math.min(at, left.length - 1)]
  const note = `deleted: ${gone.title.slice(0, 50)}${freed ? ` · ${human(freed)} freed` : ''}`
  return { ...after, focused: next ? rowKey(next.id) : FILTER, note }
}

export type Row = { key: string; session: Session; label: string; meta: string; isAsked: boolean }

export type View = {
  title: string
  scope: string
  hint: string
  isAsking: boolean
  rows: Row[]
  count: string
  retention: string
}

const HINT = '↑↓ move · enter or d delete · shift+tab scope · esc close'
const CONFIRM = 'enter confirm · esc cancel'

function question(state: State): string {
  const s = state.sessions.find(one => one.id === state.confirming)
  const title = s ? `"${s.title.length > 30 ? `${s.title.slice(0, 29)}…` : s.title}"` : 'session'
  const others = [...new Set(state.found.map(f => f.kind).filter(kind => kind !== 'transcript'))]
  const what = state.found.length === 0 ? '' : others.length === 0 ? ' transcript only' : ` transcript + ${others.length} more (${others.join(', ')})`
  return `Delete ${title}?${what} · ${CONFIRM}`
}

export function view(state: State, room: number, width: number, now: number): View {
  const list = rows(state)
  const at = Math.max(0, list.findIndex(s => rowKey(s.id) === state.focused))
  const start = Math.max(0, Math.min(at - Math.floor(room / 2), list.length - room))
  const shown = list.slice(start, start + room)
  return {
    title: `Sessions (${state.isAll ? 'All' : 'Current Folder'})`,
    scope: state.isAll ? '○ Current Folder | ● All' : '● Current Folder | ○ All',
    hint: state.confirming ? question(state) : state.note || HINT,
    isAsking: Boolean(state.confirming),
    rows: shown.map(s => {
      const meta = `${human(s.size)} ${ago(s.mtimeMs, now)}`
      const label = `${state.isAll ? `${folderName(s)}: ` : ''}${s.title}`
      return {
        key: rowKey(s.id),
        session: s,
        label: label.slice(0, Math.max(10, width - meta.length - 4)),
        meta,
        isAsked: state.confirming === s.id,
      }
    }),
    count: list.length > room ? `${start + 1}-${start + shown.length} of ${list.length}` : `${list.length}`,
    retention: `Claude Code deletes sessions older than ${state.retentionDays} days (cleanupPeriodDays)`,
  }
}
