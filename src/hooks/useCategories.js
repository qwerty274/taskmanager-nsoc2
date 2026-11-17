import { useState, useEffect } from 'react';

/**
 * useCategories.js - Manages custom task categories persisted to localStorage.
 *
 * Categories are stored as an array of unique strings (category names).
 * - Duplicate category names are not allowed.
 * - Attempting to delete a category that has assigned tasks is prevented.
 * - Existing tasks without a category continue to work unchanged.
 */

const CATEGORIES_KEY = 'taskmanager-categories';

export function useCategories() {
  const [categories, setCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);
      if (!stored) return ['Work', 'Personal', 'Urgent']; // default categories
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return ['Work', 'Personal', 'Urgent'];
      return parsed;
    } catch (error) {
      console.warn('Error reading categories from localStorage:', error);
      return ['Work', 'Personal', 'Urgent'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.warn('Error saving categories to localStorage:', error);
    }
  }, [categories]);

  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add a new category (reject duplicates)
  const addCategory = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    if (categories.some(c => c.trim().toLowerCase() === trimmed.toLowerCase())) return false;
    setCategories(prev => [...prev, trimmed]);
    return true;
  };

  // Remove a category (prevent if tasks are assigned to it)
  const removeCategory = (name, tasks = []) => {
    const trimmed = name.trim();
    // Prevent deletion if any task has this category
    if (tasks.some(task => task.category && task.category.trim() === trimmed)) {
      return false;
    }
    setCategories(prev => prev.filter(c => c.trim() !== trimmed));
    return true;
  };

  // Rename a category (reject duplicates)
  const renameCategory = (oldName, newName) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = (newName || '').trim();
    if (!trimmedNew) return false;
    if (trimmedNew.toLowerCase() === trimmedOld.toLowerCase()) return false;
    if (categories.some(c => c.trim().toLowerCase() === trimmedNew.toLowerCase() && c !== trimmedOld))
      return false;
    setCategories(prev =>
      prev.map(c => (c.trim().toLowerCase() === trimmedOld.toLowerCase() ? trimmedNew : c))
    );
    return true;
  };

  useEffect(() => {
    const handleAddCategoryEvent = (e) => {
      if (e.detail) {
        addCategory(e.detail);
      }
    };
    window.addEventListener('add-category', handleAddCategoryEvent);
    return () => window.removeEventListener('add-category', handleAddCategoryEvent);
  }, [categories]);

  // Start editing a category name
  const startEdit = (name) => setEditingCategory(name);
  const stopEdit = () => setEditingCategory(null);

  return {
    // State
    categories,
    editingCategory,
    newCategoryName,

    // Actions
    addCategory,
    removeCategory,
    renameCategory,
    startEdit,
    stopEdit,

    // Helpers
    hasCategory: (name) => categories.some(c => c.trim().toLowerCase() === name.trim().toLowerCase()),
    getCategoryIcon: () => 'tag',
  };
}
