import React from 'react';
import { useCategories } from '../hooks/useCategories';

export default function FilterTabs({ currentFilter, onSelectFilter, currentCategory, onSelectCategory, tasks }) {
  const { categories, removeCategory, renameCategory } = useCategories();

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' },
    { id: 'overdue-task', label: 'Overdue Tasks' }
  ];

  const categoryOptions = categories.map(cat => ({
    id: cat,
    label: cat
  }));

  const handleRemove = (cat) => {
    const ok = window.confirm(`Remove category "${cat}"?\nTasks in this category will be uncategorized (category removed).`);
    if (ok) {
      const success = removeCategory(cat, tasks);
      if (success) {
        onSelectCategory(''); // clear filter
        return true;
      }
      alert('Cannot remove: tasks are assigned to this category.');
    }
    return false;
  };

  const handleRename = (oldCat) => {
    const newName = window.prompt(`Rename category "${oldCat}" to:`, oldCat);
    if (newName && newName.trim() && newName.trim() !== oldCat) {
      const success = renameCategory(oldCat, newName.trim());
      if (!success) {
        alert('A category with that name already exists.');
      }
    }
  };

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
      {categories.length > 0 && (
        <div className="category-filter-separator">
          <span>Category:</span>
        </div>
      )}
      {categoryOptions.map(option => (
        <button
          key={option.id}
          type="button"
          data-filter={option.id}
          className={`filter-btn ${currentCategory === option.id ? 'active' : ''}`}
          aria-pressed={currentCategory === option.id}
          onClick={() => onSelectCategory(option.id)}
        >
          {option.label}
        </button>
      ))}
      {categories.length > 0 && (
        <div style={{ marginLeft: '12px', fontSize: '11px', color: '#86868b', display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <span>{cat}</span>
              <span
                style={{ marginLeft: '2px', cursor: 'pointer', opacity: 0.7 }}
                title="Remove category"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(cat);
                }}
              >
                ×
              </span>
              <span
                style={{ marginLeft: '1px', cursor: 'pointer', opacity: 0.7 }}
                title="Rename category"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename(cat);
                }}
              >
                ⋮
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
