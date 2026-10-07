import { expect, test } from 'claude-code/testing'

import { lines, session } from './fixtures'
import { folderName, isInFolder, leftovers, parseTranscript, projectName, sessionId } from './sessions'

const prompt = { type: 'user', cwd: '/w/a', message: { content: [{ type: 'text', text: 'fix  the\nlogin bug' }] } }
const command = { type: 'user', isMeta: true, cwd: '/w/a', message: { content: '<command-name>/x' } }

test('title is the first typed prompt, skipping slash commands', () => {
  expect(parseTranscript(lines(command, prompt), '')).toEqual({ cwd: '/w/a', title: 'fix the login bug' })
})

test('title prefers the custom name, then the summary, then the last prompt last', () => {
  const titles = (...entries: object[]) => parseTranscript(lines(prompt), lines(...entries)).title
  expect(titles({ type: 'summary', summary: 'Refactor parser' })).toBe('Refactor parser')
  expect(titles({ type: 'summary', summary: 'Refactor parser' }, { type: 'custom-title', customTitle: 'orders API' })).toBe('orders API')
  expect(titles({ type: 'last-prompt', lastPrompt: 'later' })).toBe('fix the login bug')
  expect(parseTranscript(lines(command), lines({ type: 'last-prompt', lastPrompt: 'later' })).title).toBe('later')
})

test('no prompt is an empty title, and a cut line is skipped', () => {
  expect(parseTranscript(lines(command), '').title).toBe('')
  expect(parseTranscript('{"type":"us', '').title).toBe('')
})

test('only uuid transcripts are sessions', () => {
  expect(sessionId('11111111-1111-1111-1111-111111111111.jsonl')).toBe('11111111-1111-1111-1111-111111111111')
  expect(sessionId('notes.jsonl')).toBe('')
  expect(sessionId('11111111-1111-1111-1111-111111111111')).toBe('')
})

test('a session belongs to a folder by its cwd or its projects name', () => {
  expect(projectName('/Users/me/my.app')).toBe('-Users-me-my-app')
  expect(isInFolder(session(), '/w/a')).toBe(true)
  expect(isInFolder(session({ cwd: '' }), '/w/a')).toBe(true)
  expect(isInFolder(session(), '/w/b')).toBe(false)
  expect(folderName(session())).toBe('a')
  expect(folderName(session({ cwd: '' }))).toBe('-w-a')
})

test('delete reaches only paths named by the session id', () => {
  const s = session()
  const paths = leftovers('/c', s, [`${s.id}-agent-x.json`, 'other-agent.json'])
  expect(paths[0]).toEqual({ kind: 'transcript', path: s.path })
  expect(paths).toContainEqual({ kind: 'todos', path: `/c/todos/${s.id}-agent-x.json` })
  for (const p of paths) expect(p.path.includes(s.id)).toBe(true)
  expect(paths.some(p => p.path.includes('memory'))).toBe(false)
})

