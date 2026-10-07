import { expect, test } from 'claude-code/testing'

import { retentionDays } from './settings'

test('the most specific settings file wins, and invalid values are ignored', () => {
  expect(retentionDays(['{"cleanupPeriodDays": 90}', '{"cleanupPeriodDays": 7}'])).toBe(7)
  expect(retentionDays(['{"cleanupPeriodDays": 90}', '{"cleanupPeriodDays": 0}'])).toBe(90)
  expect(retentionDays(['{"cleanupPeriodDays": "10"}'])).toBe(30)
})
