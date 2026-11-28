import { isValidTask, clearInvalidDueDate, clearInvalidPomodoros } from './taskUtils.js';
import { sanitizeSubtasks } from './subtaskUtils.js';

// Legacy IDs must agree between tabs before the first mutation persists them.
function legacyId(task, index) {
  const value = JSON.stringify(task);
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return 'legacy-' + (hash >>> 0).toString(36) + '-' + index;
}

export function parseTasks(raw) {
  if (raw === null) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Saved tasks are not a list.');
  const cleaned = parsed.map(clearInvalidDueDate).map(sanitizeSubtasks).map(clearInvalidPomodoros);
  if (!cleaned.every(isValidTask)) throw new Error('Saved task records are malformed.');
  return cleaned
    .map((task, index) => task.id ? task : { ...task, id: legacyId(task, index) });
}

export async function commitTasks(storage, locks, update) {
  if (!locks?.request) throw new Error('This browser cannot safely edit tasks across tabs. Use a browser with Web Locks support.');
  return locks.request('taskmanager:tasks', () => {
    const previous = parseTasks(storage.getItem('tasks'));
    const next = typeof update === 'function' ? update(previous) : update;
    if (!Array.isArray(next) || !next.every(isValidTask)) throw new Error('The task update is invalid.');
    storage.setItem('tasks', JSON.stringify(next));
    return next;
  });
}