import React from 'react';
import { getDashboardStats, formatStreak } from '../utils/dashboardStats';
import './dashboard.css';

export default function StatsDashboard({ tasks, streak, points, currentFilter, onSelectFilter }) {
  const { total, active, completed, overdue, percent } = getDashboardStats(tasks);
  const streakInfo = formatStreak(streak);

  return (
    <section id="stats-dashboard" className="stats-dashboard" aria-label="Productivity overview">
      <div className="dash-heading">
        <h2 className="dash-title">Overview</h2>
        <span className="dash-sub">
          {total === 0 ? 'No tasks yet' : `${completed} of ${total} done`}
        </span>
      </div>

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

      <div className="streak-row" role="group" aria-label="Streak and points">
        <span className="streak-item">
          <span className="streak-item-label">Streak</span>
          <span className="streak-item-value">
            <strong id="streak-current">{streakInfo.current}</strong> {streakInfo.unit}
            {streakInfo.best && <span className="streak-best"> ({streakInfo.best})</span>}
          </span>
        </span>
        <span className="streak-item">
          <span className="streak-item-label">Points</span>
          <span className="streak-item-value">
            <strong id="points-balance">{points || 0}</strong>
          </span>
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
          aria-label="Completion rate"
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
        {total === 0 && (
          <p className="dash-empty">Add a task and your completion rate will show up here.</p>
        )}
      </div>
    </section>
  );
}
