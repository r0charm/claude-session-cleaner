export const READ_BATCH = 20

const USER_LINES = 16
const TITLE_LINES = 4

export const userLinesArgv = (path: string) => ['grep', '-E', '-m', String(USER_LINES), '-e', '"type": ?"user"', '--', path]

export const titleLinesArgv = (path: string) => ['grep', '-E', '-e', '"type": ?"(custom-title|summary|last-prompt)"', '--', path]

export function lastTitleLines(stdout: string): string {
  return stdout.split('\n').filter(Boolean).slice(-TITLE_LINES).join('\n')
}

export const sizesArgv = (paths: readonly string[]) => ['du', '-sk', '--', ...paths]

export function splitSizes(stdout: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const line of stdout.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab > 0) out.set(line.slice(tab + 1), Number(line.slice(0, tab)) * 1024)
  }
  return out
}

export const aliveArgv = (pids: readonly string[]) => ['ps', '-o', 'pid=', '-p', pids.join(',')]

export function splitPids(stdout: string): string[] {
  return stdout.split('\n').map(line => line.trim()).filter(Boolean)
}

export const deleteArgv = (paths: readonly string[]) => ['rm', '-rf', '--', ...paths]
