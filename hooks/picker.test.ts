import { expect, test } from 'claude-code/testing'

import { session } from './fixtures'
import { FILTER, asking, cancelled, deleted, freshState, rowKey, rows, view, withFocus, withFound, withQuery, withScopeToggled } from './picker'

const id = (n: number) => `${n}${n}${n}${n}${n}${n}${n}${n}-0000-0000-0000-000000000000`
const all = [
  session({ id: id(1), title: 'add pagination to the orders API' }),
  session({ id: id(2), title: 'fix flaky login test' }),
  session({ id: id(3), title: 'refactor auth middleware' }),
  session({ id: id(4), title: '' }),
  session({ id: id(5), title: 'open in another window' }),
  session({ id: id(6), cwd: '/w/b', project: '-w-b', title: 'other folder work' }),
]
const fresh = () => freshState({ root: '/c', cwd: '/w/a', sessions: all, hidden: new Set([id(5)]), retentionDays: 14 })
const titles = (s: ReturnType<typeof fresh>) => rows(s).map(r => r.title)

test('lists only sessions it can delete, in this folder unless all', () => {
  expect(titles(fresh())).toEqual(['add pagination to the orders API', 'fix flaky login test', 'refactor auth middleware'])
  expect(rows(withScopeToggled(fresh())).length).toBe(4)
})

test('d asks for the selected row, and only with one selected', () => {
  expect(asking(fresh()).confirming).toBe('')
  expect(asking(withFocus(fresh(), rowKey(id(2)))).confirming).toBe(id(2))
})

test('moving off the asked row or typing drops the question', () => {
  const asked = asking(withFocus(fresh(), rowKey(id(2))))
  expect(withFocus(asked, rowKey(id(3))).confirming).toBe('')
  expect(withFocus(asked, rowKey(id(2))).confirming).toBe(id(2))
  expect(withQuery(asked, 'x').confirming).toBe('')
})

test('escape drops the question and keeps the row', () => {
  const back = cancelled(asking(withFocus(fresh(), rowKey(id(2)))))
  expect(back.confirming).toBe('')
  expect(back.focused).toBe(rowKey(id(2)))
})

test('after a delete the next session is selected, so d deletes again', () => {
  let s = asking(withFocus(fresh(), rowKey(id(2))))
  s = deleted(s, all[1]!)
  expect(s.focused).toBe(rowKey(id(3)))
  s = deleted(asking(s), all[2]!)
  expect(s.focused).toBe(rowKey(id(1)))
  s = deleted(asking(s), all[0]!)
  expect(s.focused).toBe(FILTER)
  expect(rows(s)).toEqual([])
})

test('the question says what goes with the session, and the delete what it freed', () => {
  const asked = asking(withFocus(fresh(), rowKey(id(2))))
  expect(view(asked, 5, 80, 0).hint).toBe('Delete "fix flaky login test"? · enter confirm · esc cancel')
  const found = withFound(asked, id(2), [
    { kind: 'transcript', bytes: 88 * 1024 },
    { kind: 'file-history', bytes: 2 * 1024 * 1024 },
    { kind: 'todos', bytes: 4096 },
    { kind: 'todos', bytes: 4096 },
  ])
  expect(view(found, 5, 80, 0).hint).toContain('transcript + 2 more (file-history, todos)')
  expect(withFound(asked, id(3), []).found).toBe(asked.found)
  expect(deleted(found, all[1]!).note).toBe('deleted: fix flaky login test · 2M freed')
})

