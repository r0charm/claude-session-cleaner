import { expect, test } from 'claude-code/testing'

import { lastTitleLines, splitPids } from './programs'

test('title lines keep the last four', () => {
  expect(lastTitleLines('a\nb\nc\nd\ne\n')).toBe('b\nc\nd\ne')
})

test('ps output is the live pids, trimmed', () => {
  expect(splitPids('  101\n 2002\n')).toEqual(['101', '2002'])
})
