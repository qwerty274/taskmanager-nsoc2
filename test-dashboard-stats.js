import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardStats, formatStreak } from './src/utils/dashboardStats.js';
import { getTodayDate } from './src/utils/taskUtils.js';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

test('empty list gives all zeros and 0 percent, no NaN', () => {
  assert.deepEqual(getDashboardStats([]), { total: 0, active: 0, completed: 0, overdue: 0, percent: 0 });
});

test('bad input is treated as empty', () => {
  assert.equal(getDashboardStats(undefined).total, 0);
  assert.equal(getDashboardStats(null).percent, 0);
});

test('counts active, completed and percent', () => {
  const s = getDashboardStats([{ completed: true }, { completed: true }, { completed: false }]);
  assert.equal(s.total, 3);
  assert.equal(s.completed, 2);
  assert.equal(s.active, 1);
  assert.equal(s.percent, 67);
});

test('overdue counts only past-due open tasks', () => {
  const tasks = [
    { completed: false, dueDate: day(-1) },
    { completed: true, dueDate: day(-1) },
    { completed: false, dueDate: getTodayDate() },
    { completed: false, dueDate: day(3) },
    { completed: false }
  ];
  assert.equal(getDashboardStats(tasks).overdue, 1);
});

test('formatStreak handles missing, singular and best values', () => {
  assert.deepEqual(formatStreak(undefined), { current: 0, unit: 'days', best: '' });
  assert.deepEqual(formatStreak({ current: 1, longest: 1 }), { current: 1, unit: 'day', best: 'best 1' });
  assert.deepEqual(formatStreak({ current: 4, longest: 0 }), { current: 4, unit: 'days', best: '' });
});
