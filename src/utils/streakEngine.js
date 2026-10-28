import { getTodayDate } from './taskUtils';

export const ACTIVITY_KEY = 'activityDays';
export const LEDGER_KEY = 'pointsLedger';

export const TASK_COMPLETE_POINTS = 10;

// Streak length -> bonus points, awarded once each.
export const MILESTONES = [
  { days: 3, points: 20 },
  { days: 7, points: 50 },
  { days: 30, points: 200 }
];

/**
 * Adds a day (YYYY-MM-DD) to the activity record. One entry per day;
 * extra activity on the same day only bumps its count.
 */
export function recordActivity(activityDays, dateKey) {
  const days = activityDays && typeof activityDays === 'object' ? activityDays : {};
  const existing = days[dateKey];
  return {
    ...days,
    [dateKey]: { count: (existing ? existing.count : 0) + 1 }
  };
}

function shiftDay(dateKey, offset) {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Build the date at local noon so DST changes cannot move it to another day.
  const date = new Date(y, m - 1, d + offset, 12);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns { current, longest } streaks in days.
 * The current streak stays alive if the last activity was yesterday.
 */
export function calcStreak(activityDays, today = getTodayDate()) {
  const days = Object.keys(activityDays || {}).sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = shiftDay(days[i - 1], 1) === days[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const last = days[days.length - 1];
  const alive = last === today || last === shiftDay(today, -1);
  return { current: alive ? run : 0, longest };
}

/**
 * Appends an entry to the ledger unless one with the same key exists.
 * Returns the same array when nothing was added.
 */
export function awardPoints(ledger, { key, reason, points, ref = null, date = getTodayDate() }) {
  const entries = Array.isArray(ledger) ? ledger : [];
  if (entries.some(entry => entry.key === key)) return entries;
  return [...entries, { key, reason, points, ref, date }];
}

export function getBalance(ledger) {
  if (!Array.isArray(ledger)) return 0;
  return ledger.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
}

function awardMilestones(ledger, streak, date) {
  return MILESTONES.reduce(
    (acc, { days, points }) =>
      streak >= days
        ? awardPoints(acc, { key: `milestone:${days}`, reason: `${days}-day streak`, points, ref: days, date })
        : acc,
    ledger
  );
}

/**
 * Applies one task completion to the state. Safe to call twice for the
 * same task: points are only given once per task id.
 */
export function applyCompletion(state, taskId, date = getTodayDate()) {
  const activityDays = recordActivity(state.activityDays, date);
  let ledger = state.ledger;
  if (taskId) {
    ledger = awardPoints(ledger, {
      key: `task-complete:${taskId}`,
      reason: 'Task completed',
      points: TASK_COMPLETE_POINTS,
      ref: taskId,
      date
    });
  }
  ledger = awardMilestones(ledger, calcStreak(activityDays, date).current, date);
  return { activityDays, ledger };
}

/**
 * Repairs the ledger from the activity record: any milestone that the
 * longest streak already reached but was never awarded gets added.
 */
export function rebuildFromActivity(state, date = getTodayDate()) {
  const { longest } = calcStreak(state.activityDays, date);
  return {
    activityDays: state.activityDays,
    ledger: awardMilestones(state.ledger, longest, date)
  };
}

function readJson(storage, key, fallback, isValid) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads the engine state from storage. Broken or missing data gives an empty state.
 */
export function loadEngineState(storage = window.localStorage) {
  return {
    activityDays: readJson(storage, ACTIVITY_KEY, {}, isPlainObject),
    ledger: readJson(storage, LEDGER_KEY, [], Array.isArray)
  };
}

function saveEngineState(state, storage) {
  try {
    storage.setItem(ACTIVITY_KEY, JSON.stringify(state.activityDays));
    storage.setItem(LEDGER_KEY, JSON.stringify(state.ledger));
  } catch (error) {
    console.error('Error saving streak data:', error);
  }
}

/**
 * Records a task completion in storage and returns the new state.
 * It re-reads storage first, so a second open tab does not get overwritten.
 */
export function recordTaskCompletion(taskId, date = getTodayDate(), storage = window.localStorage) {
  const next = applyCompletion(loadEngineState(storage), taskId, date);
  saveEngineState(next, storage);
  return next;
}
