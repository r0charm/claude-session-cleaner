export const DEFAULT_RETENTION_DAYS = 30

export function retentionDays(settings: readonly string[]): number {
  let days = DEFAULT_RETENTION_DAYS
  for (const text of settings) {
    try {
      const value: unknown = JSON.parse(text)?.cleanupPeriodDays
      if (Number.isInteger(value) && (value as number) >= 1) days = value as number
    } catch {}
  }
  return days
}
