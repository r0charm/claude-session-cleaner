export const READ_BATCH = 20

const USER_LINES = 16
const TITLE_LINES = 4

export const userLinesArgv = (path: string) => ['grep', '-E', '-m', String(USER_LINES), '-e', '"type": ?"user"', '--', path]

export const titleLinesArgv = (path: string) => ['grep', '-E', '-e', '"type": ?"(custom-title|summary|last-prompt)"', '--', path]

export function lastTitleLines(stdout: string): string {
  return stdout.split('\n').filter(Boolean).slice(-TITLE_LINES).join('\n')
}

export const aliveArgv = (pids: readonly string[]) => ['ps', '-o', 'pid=', '-p', pids.join(',')]

export function splitPids(stdout: string): string[] {
  return stdout.split('\n').map(line => line.trim()).filter(Boolean)
}

export const deleteArgv = (paths: readonly string[]) => ['rm', '-rf', '--', ...paths]
