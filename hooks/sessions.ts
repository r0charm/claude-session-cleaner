export type Session = {
  id: string
  path: string
  project: string
  cwd: string
  title: string
  mtimeMs: number
  size: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function sessionId(fileName: string): string {
  const id = fileName.replace(/\.jsonl$/, '')
  return id !== fileName && UUID.test(id) ? id : ''
}

type Entry = Record<string, unknown>

function* entries(raw: string): Generator<Entry> {
  for (const line of raw.split('\n')) {
    if (!line.startsWith('{')) continue
    try {
      const entry: unknown = JSON.parse(line)
      if (entry && typeof entry === 'object') yield entry as Entry
    } catch {}
  }
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const part = content.find(p => p && typeof p === 'object' && (p as Entry).type === 'text') as Entry | undefined
  return String(part?.text ?? '')
}

const NOT_TYPED = /^<(command-|local-command|system-reminder)|^Caveat:/

function promptOf(entry: Entry): string {
  if (entry.type !== 'user' || entry.isMeta || entry.isSidechain) return ''
  const text = textOf((entry.message as Entry | undefined)?.content).trim()
  return NOT_TYPED.test(text) ? '' : text
}

export function parseTranscript(userLines: string, titleLines: string): { cwd: string; title: string } {
  let cwd = ''
  let first = ''
  for (const entry of entries(userLines)) {
    cwd ||= typeof entry.cwd === 'string' ? entry.cwd : ''
    first ||= promptOf(entry)
  }
  const titles: Record<string, string> = {}
  for (const entry of entries(titleLines)) {
    const value = entry.customTitle ?? entry.summary ?? entry.lastPrompt
    if (typeof entry.type === 'string' && typeof value === 'string' && value) titles[entry.type] = value
  }
  const title = titles['custom-title'] || titles.summary || first || titles['last-prompt'] || ''
  return { cwd, title: title.split(/\s+/).join(' ').trim() }
}

export function projectName(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]/g, '-')
}

export function isInFolder(session: Session, cwd: string): boolean {
  return session.cwd === cwd || session.project === projectName(cwd)
}

export function matches(session: Session, query: string): boolean {
  const hay = `${session.title} ${session.id} ${session.cwd}`.toLowerCase()
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(word => hay.includes(word))
}

export function folderName(session: Session): string {
  return session.cwd.split('/').pop() || session.project
}

export type Leftover = { kind: string; path: string }

export function leftovers(root: string, session: Session, todos: readonly string[] = []): Leftover[] {
  const dir = session.path.slice(0, session.path.lastIndexOf('/'))
  return [
    { kind: 'transcript', path: session.path },
    { kind: 'subagents', path: `${dir}/${session.id}` },
    { kind: 'session-env', path: `${root}/session-env/${session.id}` },
    { kind: 'file-history', path: `${root}/file-history/${session.id}` },
    { kind: 'tasks', path: `${root}/tasks/${session.id}` },
    { kind: 'debug', path: `${root}/debug/${session.id}.txt` },
    ...todos
      .filter(name => name.startsWith(`${session.id}-`))
      .map(name => ({ kind: 'todos', path: `${root}/todos/${name}` })),
  ]
}

export function ago(mtimeMs: number, now: number): string {
  const s = Math.max(0, (now - mtimeMs) / 1000)
  for (const [unit, n] of [['y', 31536000], ['mo', 2592000], ['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]] as const) {
    if (s >= n) return `${Math.floor(s / n)}${unit}`
  }
  return 'now'
}

export function human(size: number): string {
  let n = size
  for (const unit of ['B', 'K', 'M']) {
    if (n < 1024) return `${Math.round(n)}${unit}`
    n /= 1024
  }
  return `${Math.round(n)}G`
}
