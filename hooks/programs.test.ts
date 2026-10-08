import { expect, test } from 'claude-code/testing'

import { lastTitleLines, splitPids, splitSizes } from './programs'

test('title lines keep the last four', () => {
  expect(lastTitleLines('a\nb\nc\nd\ne\n')).toBe('b\nc\nd\ne')
})

test('du output maps each path to bytes', () => {
  expect(splitSizes('8\t/c/a b\n4\t/c/x\n')).toEqual(new Map([['/c/a b', 8192], ['/c/x', 4096]]))
})

test('ps output is the live pids, trimmed', () => {
  expect(splitPids('  101\n 2002\n')).toEqual(['101', '2002'])
})
