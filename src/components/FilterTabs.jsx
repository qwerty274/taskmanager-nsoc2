import React from 'react';

export default function FilterTabs({ currentFilter, onSelectFilter }) {
  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' },
    { id: 'overdue-task', label: 'Overdue Tasks' },
    { id: 'archived', label: 'Archived' }
  ];

  return (
    <div id="filters">
      {filterOptions.map(option => (
        <button
          key={option.id}
          type="button"
          data-filter={option.id}
          className={`filter-btn ${currentFilter === option.id ? 'active' : ''}`}
          aria-pressed={currentFilter === option.id}
          onClick={() => onSelectFilter(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
