import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CONFIG, clampSetting, formatTime, getPhaseSeconds, nextPhase, secondsLeft
} from './src/utils/pomodoroUtils.js';
import {
  addPomodoro, getPomodoros, isValidPomodoros, isValidTask, clearInvalidPomodoros
} from './src/utils/taskUtils.js';
import {
  exportTasksToJSON, exportTasksToCSV, parseAndValidateJSON, parseAndValidateCSV
} from './src/utils/exportImportUtils.js';
import { parseTasks, commitTasks } from './src/utils/taskStorage.js';

test('formatTime pads minutes and seconds', () => {
  assert.equal(formatTime(1500), '25:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(-3), '00:00');
});

test('clampSetting keeps values in range and survives empty input', () => {
  assert.equal(clampSetting('focusMinutes', '50'), 50);
  assert.equal(clampSetting('focusMinutes', '0'), 1);
  assert.equal(clampSetting('focusMinutes', '999'), 120);
  assert.equal(clampSetting('focusMinutes', ''), DEFAULT_CONFIG.focusMinutes);
});

test('getPhaseSeconds follows the config', () => {
  const config = { ...DEFAULT_CONFIG, focusMinutes: 50 };
  assert.equal(getPhaseSeconds('focus', config), 3000);
  assert.equal(getPhaseSeconds('short', config), 300);
  assert.equal(getPhaseSeconds('long', config), 900);
});

test('long break comes after every Nth focus session, then the cycle repeats', () => {
  let state = { phase: 'focus', completedFocus: 0 };
  const seen = [];
  for (let i = 0; i < 12; i++) {
    state = nextPhase(state.phase, state.completedFocus, DEFAULT_CONFIG);
    if (state.phase !== 'focus') seen.push(state.phase);
  }
  assert.deepEqual(seen, ['short', 'short', 'short', 'long', 'short', 'short']);
});

test('a break is always followed by focus', () => {
  assert.deepEqual(nextPhase('short', 2, DEFAULT_CONFIG), { phase: 'focus', completedFocus: 2 });
  assert.deepEqual(nextPhase('long', 0, DEFAULT_CONFIG), { phase: 'focus', completedFocus: 0 });
});

test('secondsLeft rounds up and never goes negative', () => {
  assert.equal(secondsLeft(10_500, 10_000), 1);
  assert.equal(secondsLeft(9_000, 10_000), 0);
});

// ---- Task link: pomodoro count per task ----

const baseTask = { id: 'a', text: 'Write report', dueDate: '2026-12-01', priority: 'high', completed: false, completedAt: null };

test('older tasks without a pomodoros field count as 0 and stay valid', () => {
  assert.equal(getPomodoros(baseTask), 0);
  assert.equal(isValidTask(baseTask), true);
});

test('addPomodoro adds one and does not change the original', () => {
  const once = addPomodoro(baseTask);
  const twice = addPomodoro(once);
  assert.equal(once.pomodoros, 1);
  assert.equal(twice.pomodoros, 2);
  assert.equal(baseTask.pomodoros, undefined);
});

test('isValidPomodoros accepts missing or whole numbers from 0, rejects the rest', () => {
  for (const ok of [undefined, 0, 3]) assert.equal(isValidPomodoros(ok), true);
  for (const bad of [-1, 1.5, '2', null, NaN]) assert.equal(isValidPomodoros(bad), false);
});

test('a broken pomodoros value is dropped but the task is kept', () => {
  const stored = { ...baseTask, pomodoros: 'many' };
  assert.equal(isValidTask(stored), false);
  const cleaned = clearInvalidPomodoros(stored);
  assert.equal('pomodoros' in cleaned, false);
  assert.equal(isValidTask(cleaned), true);
});

test('JSON backup keeps the pomodoro count', () => {
  const json = exportTasksToJSON([{ ...baseTask, pomodoros: 4 }]);
  const result = parseAndValidateJSON(json);
  assert.equal(result.success, true);
  assert.equal(result.tasks[0].pomodoros, 4);
});

test('an old JSON backup without pomodoros still imports', () => {
  const { id, ...old } = baseTask;
  const result = parseAndValidateJSON(JSON.stringify([old]));
  assert.equal(result.success, true);
  assert.equal(getPomodoros(result.tasks[0]), 0);
});

test('JSON import rejects a bad pomodoros value', () => {
  const result = parseAndValidateJSON(JSON.stringify([{ ...baseTask, pomodoros: -2 }]));
  assert.equal(result.success, false);
});

test('CSV backup round-trips the count, and old CSVs without the column import', () => {
  const csv = exportTasksToCSV([{ ...baseTask, pomodoros: 3 }, { ...baseTask, text: 'Other' }]);
  assert.match(csv.split('\r\n')[0], /pomodoros/);
  const result = parseAndValidateCSV(csv);
  assert.equal(result.success, true);
  assert.equal(getPomodoros(result.tasks[0]), 3);
  assert.equal(getPomodoros(result.tasks[1]), 0);

  const oldCsv = 'text,dueDate,priority,completed,completedAt\r\n"Old task","2026-12-01",high,false,""';
  assert.equal(parseAndValidateCSV(oldCsv).success, true);
});

test('CSV without any pomodoros keeps the old columns', () => {
  const csv = exportTasksToCSV([baseTask]);
  assert.equal(csv.split('\r\n')[0], 'text,dueDate,priority,completed,completedAt');
});

test('saved tasks with a broken pomodoros count are kept, counted as 0', () => {
  const raw = JSON.stringify([{ ...baseTask, pomodoros: 'many' }, { ...baseTask, id: 'b', pomodoros: 2 }]);
  const tasks = parseTasks(raw);
  assert.equal(tasks.length, 2);
  assert.equal(getPomodoros(tasks[0]), 0);
  assert.equal(getPomodoros(tasks[1]), 2);
});

test('commitTasks saves a finished focus session on the chosen task only', async () => {
  const data = new Map([['tasks', JSON.stringify([baseTask, { ...baseTask, id: 'b', text: 'Other' }])]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const locks = { request: (name, run) => Promise.resolve(run()) };
  await commitTasks(storage, locks, prev => prev.map(task => (task.id === 'a' ? addPomodoro(task) : task)));
  const saved = JSON.parse(data.get('tasks'));
  assert.equal(saved[0].pomodoros, 1);
  assert.equal(saved[1].pomodoros, undefined);
});