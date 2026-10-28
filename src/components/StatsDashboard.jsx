import React from 'react';
import { isOverdue } from '../utils/taskUtils';

export default function StatsDashboard({ tasks, streak, points, currentFilter, onSelectFilter }) {
  const total = tasks.length;
  const active = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section id="stats-dashboard" className="stats-dashboard" aria-label="Productivity overview">
      <div className="stats-grid">
        <button
          type="button"
          className={`stat-card ${currentFilter === 'all' ? 'active-filter' : ''}`}
          data-stat-filter="all"
          onClick={() => onSelectFilter('all')}
          aria-label="Filter all tasks"
          aria-pressed={currentFilter === 'all'}
        >
          <span className="stat-value" id="stat-total">{total}</span>
          <span className="stat-label">Total</span>
        </button>
        <button
          type="button"
          className={`stat-card ${currentFilter === 'active' ? 'active-filter' : ''}`}
          data-stat-filter="active"
          onClick={() => onSelectFilter('active')}
          aria-label="Filter active tasks"
          aria-pressed={currentFilter === 'active'}
        >
          <span className="stat-value" id="stat-active">{active}</span>
          <span className="stat-label">Active</span>
        </button>
        <button
          type="button"
          className={`stat-card ${currentFilter === 'done' ? 'active-filter' : ''}`}
          data-stat-filter="done"
          onClick={() => onSelectFilter('done')}
          aria-label="Filter completed tasks"
          aria-pressed={currentFilter === 'done'}
        >
          <span className="stat-value" id="stat-completed">{completed}</span>
          <span className="stat-label">Completed</span>
        </button>
        <button
          type="button"
          className={`stat-card stat-overdue ${currentFilter === 'overdue-task' ? 'active-filter' : ''}`}
          data-stat-filter="overdue-task"
          onClick={() => onSelectFilter('overdue-task')}
          aria-label="Filter overdue tasks"
          aria-pressed={currentFilter === 'overdue-task'}
        >
          <span className="stat-value" id="stat-overdue">{overdue}</span>
          <span className="stat-label">Overdue</span>
        </button>
      </div>

      <div className="streak-row" aria-label="Streak and points">
        <span>
          Streak: <strong id="streak-current">{streak ? streak.current : 0}</strong>{' '}
          {streak && streak.current === 1 ? 'day' : 'days'}
          {streak && streak.longest > 0 ? ` (best ${streak.longest})` : ''}
        </span>
        <span>
          Points: <strong id="points-balance">{points || 0}</strong>
        </span>
      </div>

      <div className="progress-container" aria-label="Task completion progress">
        <div className="progress-header">
          <span className="progress-title">Completion Rate</span>
          <span id="progress-percent" className="progress-percent">{percent}%</span>
        </div>
        <div
          id="progress-bar-wrapper"
          className="progress-bar-bg"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            id="progress-bar-fill"
            className="progress-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
