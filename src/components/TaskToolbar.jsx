import React from 'react';
import { useCategories } from '../hooks/useCategories';

export default function TaskToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  currentSort,
  onSortChange
}) {
  const { categories } = useCategories();

  return (
    <div id="task-toolbar" className="task-toolbar" aria-label="Task search and sorting">
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">&#128269;</span>
        <input
          id="task-search"
          type="search"
          placeholder="Search tasks..."
          aria-label="Search tasks"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            id="search-clear"
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={onClearSearch}
          >
            &times;
          </button>
        )}
      </div>

      <div className="sort-box">
        <label htmlFor="task-sort" className="sort-label">Sort by:</label>
        <select
          id="task-sort"
          aria-label="Sort tasks"
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="dueDate-asc">Due Date (Earliest)</option>
          <option value="dueDate-desc">Due Date (Latest)</option>
          <option value="priority-desc">Priority (High to Low)</option>
          <option value="priority-asc">Priority (Low to High)</option>
          <option value="alphabetical-asc">Title (A &rarr; Z)</option>
          <option value="alphabetical-desc">Title (Z &rarr; A)</option>
        </select>
      </div>

      <div className="category-box">
        {categories.length > 0 && (
          <div style={{ marginLeft: '8px', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#86868b', fontSize: '11px', marginRight: '4px' }}>Cat:</span>
            {categories.map((cat, i) => (
              <span
                key={cat}
                style={{
                  display: 'inline-block',
                  marginLeft: '2px',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  color: '#f5f5f7',
                  backgroundColor: 'rgba(10, 132, 255, 0.15)',
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          className="category-add-btn"
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            fontSize: '11px',
            borderColor: 'var(--border)',
            borderRadius: '6px',
            background: 'transparent',
            color: '#86868b',
            cursor: 'pointer',
          }}
          aria-label="Add new category"
          onClick={() => {
            const name = prompt('Enter new category name:');
            if (name && name.trim()) {
              window.dispatchEvent(new CustomEvent('add-category', { detail: name.trim() }));
            }
          }}
        >
          +Add
        </button>
      </div>
    </div>
  );
}
