import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACTIVITY_KEY,
  LEDGER_KEY,
  MILESTONES,
  TASK_COMPLETE_POINTS,
  applyCompletion,
  awardPoints,
  calcStreak,
  getBalance,
  loadEngineState,
  rebuildFromActivity,
  recordActivity,
  recordTaskCompletion
} from './src/utils/streakEngine.js';
import { isOverdue, sortTasks } from './src/utils/taskUtils.js';

// Minimal localStorage stand-in.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); }
  };
}

const days = (...keys) => Object.fromEntries(keys.map(k => [k, { count: 1 }]));

test('recordActivity counts repeats on the same day and does not mutate', () => {
  const before = days('2026-03-01');
  const after = recordActivity(recordActivity(before, '2026-03-01'), '2026-03-02');
  assert.equal(after['2026-03-01'].count, 2);
  assert.equal(after['2026-03-02'].count, 1);
  assert.equal(before['2026-03-01'].count, 1);
  assert.deepEqual(recordActivity(null, '2026-03-01'), days('2026-03-01'));
});

test('calcStreak handles empty, gaps, month and year boundaries', () => {
  assert.deepEqual(calcStreak({}, '2026-03-01'), { current: 0, longest: 0 });
  assert.deepEqual(calcStreak(undefined, '2026-03-01'), { current: 0, longest: 0 });

  const gap = days('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-10', '2026-03-11');
  assert.deepEqual(calcStreak(gap, '2026-03-11'), { current: 2, longest: 3 });

  const crossing = days('2025-12-30', '2025-12-31', '2026-01-01');
  assert.equal(calcStreak(crossing, '2026-01-01').current, 3);

  // 2028 is a leap year.
  const leap = days('2028-02-28', '2028-02-29', '2028-03-01');
  assert.equal(calcStreak(leap, '2028-03-01').current, 3);
});

test('the current streak survives until the end of the next day, then resets', () => {
  const run = days('2026-03-01', '2026-03-02');
  assert.equal(calcStreak(run, '2026-03-02').current, 2);
  assert.equal(calcStreak(run, '2026-03-03').current, 2);
  assert.deepEqual(calcStreak(run, '2026-03-04'), { current: 0, longest: 2 });
});

test('awardPoints is idempotent per key and ignores a bad ledger', () => {
  const entry = { key: 'k', reason: 'r', points: 5, date: '2026-03-01' };
  const once = awardPoints([], entry);
  assert.equal(once.length, 1);
  assert.equal(awardPoints(once, entry), once);
  assert.equal(awardPoints('broken', entry).length, 1);
});

test('getBalance sums valid points and tolerates junk', () => {
  assert.equal(getBalance([{ points: 10 }, { points: '5' }, { points: 'x' }, {}]), 15);
  assert.equal(getBalance(null), 0);
});

test('applyCompletion gives task points once per task id', () => {
  const start = { activityDays: {}, ledger: [] };
  const first = applyCompletion(start, 't1', '2026-03-01');
  assert.equal(getBalance(first.ledger), TASK_COMPLETE_POINTS);

  const again = applyCompletion(first, 't1', '2026-03-01');
  assert.equal(getBalance(again.ledger), TASK_COMPLETE_POINTS);
  assert.equal(again.activityDays['2026-03-01'].count, 2);

  const other = applyCompletion(again, 't2', '2026-03-01');
  assert.equal(getBalance(other.ledger), TASK_COMPLETE_POINTS * 2);
});

test('milestone bonuses are awarded once when the streak reaches them', () => {
  let state = { activityDays: {}, ledger: [] };
  for (const [i, date] of ['2026-03-01', '2026-03-02', '2026-03-03'].entries()) {
    state = applyCompletion(state, `t${i}`, date);
  }
  const three = MILESTONES.find(m => m.days === 3);
  assert.equal(state.ledger.filter(e => e.key === 'milestone:3').length, 1);
  assert.equal(getBalance(state.ledger), 3 * TASK_COMPLETE_POINTS + three.points);

  const more = applyCompletion(state, 't3', '2026-03-03');
  assert.equal(more.ledger.filter(e => e.key === 'milestone:3').length, 1);
});

test('rebuildFromActivity repairs a missing milestone from the longest streak', () => {
  const state = { activityDays: days('2026-03-01', '2026-03-02', '2026-03-03'), ledger: [] };
  const fixed = rebuildFromActivity(state, '2026-06-01');
  assert.deepEqual(fixed.ledger.map(e => e.key), ['milestone:3']);
  assert.equal(rebuildFromActivity(fixed, '2026-06-01').ledger.length, 1);
});

test('loadEngineState falls back to empty state for missing or broken data', () => {
  assert.deepEqual(loadEngineState(fakeStorage()), { activityDays: {}, ledger: [] });
  const broken = fakeStorage({ [ACTIVITY_KEY]: '{not json', [LEDGER_KEY]: '{"a":1}' });
  assert.deepEqual(loadEngineState(broken), { activityDays: {}, ledger: [] });
  const wrongShape = fakeStorage({ [ACTIVITY_KEY]: '[1,2]' });
  assert.deepEqual(loadEngineState(wrongShape).activityDays, {});
});

test('recordTaskCompletion persists to storage and re-reads it each call', () => {
  const storage = fakeStorage();
  recordTaskCompletion('a', '2026-03-01', storage);
  // Another tab writes in between.
  const other = JSON.parse(storage.data[ACTIVITY_KEY]);
  other['2026-02-28'] = { count: 1 };
  storage.data[ACTIVITY_KEY] = JSON.stringify(other);
  const next = recordTaskCompletion('b', '2026-03-01', storage);
  assert.ok(next.activityDays['2026-02-28']);
  assert.equal(getBalance(JSON.parse(storage.data[LEDGER_KEY])), TASK_COMPLETE_POINTS * 2);
});

test('recordTaskCompletion survives a storage that throws on write', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const original = console.error;
  console.error = () => {};
  try {
    const next = recordTaskCompletion('a', '2026-03-01', storage);
    assert.equal(getBalance(next.ledger), TASK_COMPLETE_POINTS);
  } finally {
    console.error = original;
  }
});

test('sortTasks orders by due date with undated tasks last, without mutating', () => {
  const list = [
    { text: 'c', dueDate: '' },
    { text: 'b', dueDate: '2026-05-02' },
    { text: 'a', dueDate: '2026-05-01' }
  ];
  const copy = [...list];
  assert.deepEqual(sortTasks(list, 'dueDate-asc').map(t => t.text), ['a', 'b', 'c']);
  assert.deepEqual(sortTasks(list, 'dueDate-desc').map(t => t.text), ['b', 'a', 'c']);
  assert.deepEqual(list, copy);
  assert.deepEqual(sortTasks(list, 'default'), list);
});

test('sortTasks orders by priority and alphabetically, ignoring case', () => {
  const list = [
    { text: 'beta', priority: 'low' },
    { text: 'Alpha', priority: 'high' },
    { text: 'gamma' },
    { text: 'delta', priority: 'medium' }
  ];
  assert.deepEqual(sortTasks(list, 'priority-desc').map(t => t.text), ['Alpha', 'delta', 'beta', 'gamma']);
  assert.deepEqual(sortTasks(list, 'priority-asc').map(t => t.text), ['gamma', 'beta', 'delta', 'Alpha']);
  assert.deepEqual(sortTasks(list, 'alphabetical-asc').map(t => t.text), ['Alpha', 'beta', 'delta', 'gamma']);
  assert.deepEqual(sortTasks(list, 'alphabetical-desc').map(t => t.text), ['gamma', 'delta', 'beta', 'Alpha']);
  assert.deepEqual(sortTasks(list, 'nonsense').map(t => t.text), list.map(t => t.text));
});

test('isOverdue ignores completed, undated, invalid and due-today tasks', () => {
  const today = '2026-03-10';
  assert.equal(isOverdue({ dueDate: '2026-03-09', completed: false }, today), true);
  assert.equal(isOverdue({ dueDate: '2026-03-09', completed: true }, today), false);
  assert.equal(isOverdue({ dueDate: '2026-03-10', completed: false }, today), false);
  assert.equal(isOverdue({ dueDate: '', completed: false }, today), false);
  assert.equal(isOverdue({ dueDate: '2026-02-30', completed: false }, today), false);
});
