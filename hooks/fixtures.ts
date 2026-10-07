import type { Session } from './sessions'

export const lines = (...entries: object[]) => entries.map(e => JSON.stringify(e)).join('\n')

export const session = (over: Partial<Session> = {}): Session => ({
  id: '11111111-1111-1111-1111-111111111111',
  path: '/c/projects/-w-a/11111111-1111-1111-1111-111111111111.jsonl',
  project: '-w-a',
  cwd: '/w/a',
  title: 'fix the login bug',
  mtimeMs: 0,
  size: 0,
  ...over,
})
