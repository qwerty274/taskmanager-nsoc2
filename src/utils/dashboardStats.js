import { isOverdue } from './taskUtils.js';

// The numbers the dashboard cards show. Same counting the component did
// inline before, pulled out so it can be tested.
export function getDashboardStats(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const total = list.length;
  const completed = list.filter(t => t.completed).length;
  const active = total - completed;
  const overdue = list.filter(t => isOverdue(t)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, active, completed, overdue, percent };
}

export function formatStreak(streak) {
  const current = streak && streak.current ? streak.current : 0;
  const longest = streak && streak.longest ? streak.longest : 0;
  return {
    current,
    unit: current === 1 ? 'day' : 'days',
    best: longest > 0 ? `best ${longest}` : ''
  };
}
