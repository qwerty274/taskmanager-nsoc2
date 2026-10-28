export const priorityWeights = { high: 3, medium: 2, low: 1 };

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a unique id for a task.
 */
export function createTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Checks whether a stored record has the required task fields and types.
 */
export function isValidTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;

  const hasValidCompletedAt =
    task.completedAt === null ||
    (typeof task.completedAt === 'string' && !Number.isNaN(Date.parse(task.completedAt)));

  return (
    typeof task.text === 'string' &&
    task.text.trim() !== '' &&
    typeof task.dueDate === 'string' &&
    ['low', 'medium', 'high'].includes(task.priority) &&
    typeof task.completed === 'boolean' &&
    hasValidCompletedAt
  );
}

/**
 * Checks if an active task is overdue using local calendar-day boundaries.
 * Tasks due today or without a due date are not overdue.
 */
export function isOverdue(task) {
  return Boolean(task.dueDate && task.dueDate < getTodayDate() && !task.completed);
}

/**
 * Sorts an array of tasks based on the given sort criteria without mutating the original array.
 */
export function sortTasks(taskList, sortOption = 'default') {
  const listCopy = [...taskList];
  if (sortOption === 'default') {
    return listCopy;
  }

  return listCopy.sort((a, b) => {
    if (sortOption === 'dueDate-asc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortOption === 'dueDate-desc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return b.dueDate.localeCompare(a.dueDate);
    }
    if (sortOption === 'priority-desc') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      return weightB - weightA;
    }
    if (sortOption === 'priority-asc') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      return weightA - weightB;
    }
    if (sortOption === 'alphabetical-asc') {
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    }
    if (sortOption === 'alphabetical-desc') {
      return b.text.localeCompare(a.text, undefined, { sensitivity: 'base' });
    }
    return 0;
  });
}

/**
 * Groups tasks by year and month.
 */
export function groupTasksByMonth(taskList, currentSort = 'default') {
  const groups = new Map();

  taskList.forEach(task => {
    const taskDate = task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : null;
    const monthLabel = taskDate
      ? taskDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : 'No due date';
    const sortKey = task.dueDate ? task.dueDate.slice(0, 7) : '9999-99';

    if (!groups.has(sortKey)) {
      groups.set(sortKey, { monthLabel, tasks: [] });
    }

    groups.get(sortKey).tasks.push(task);
  });

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(entry => ({
      monthLabel: entry[1].monthLabel,
      tasks: sortTasks(entry[1].tasks, currentSort)
    }));
}
