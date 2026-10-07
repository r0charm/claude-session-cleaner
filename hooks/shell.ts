const MARK = '\u0001SC\u0001'

export const READ_SCRIPT = [
  'for f in "$@"; do',
  `printf '${MARK}%s\\n' "$f";`,
  `grep -E '"type": ?"user"' "$f" | grep -v -E '"tool_result"|"isMeta": ?true' | head -n 8 | cut -c1-20000;`,
  `printf '\\n${MARK}\\n';`,
  `grep -E '"type": ?"(custom-title|summary|last-prompt)"' "$f" | tail -n 4 | cut -c1-4000;`,
  'done',
].join(' ')

export const READ_BATCH = 20

export type TranscriptLines = { userLines: string; titleLines: string }

export function splitRead(stdout: string): Map<string, TranscriptLines> {
  const out = new Map<string, TranscriptLines>()
  const parts = stdout.split(MARK)
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const named = parts[i] ?? ''
    const nl = named.indexOf('\n')
    out.set(named.slice(0, nl), { userLines: named.slice(nl + 1), titleLines: parts[i + 1] ?? '' })
  }
  return out
}

export const SIZE_SCRIPT = 'for p in "$@"; do [ -e "$p" ] && printf "%s\\t%s\\n" "$(du -sk "$p" | cut -f1)" "$p"; done; true'

export function splitSizes(stdout: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const line of stdout.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab > 0) out.set(line.slice(tab + 1), Number(line.slice(0, tab)) * 1024)
  }
  return out
}

export const ALIVE_SCRIPT = 'for p in "$@"; do kill -0 "$p" 2>/dev/null && echo "$p"; done; true'
