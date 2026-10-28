import { useState, useEffect } from 'react';
import { isValidTask, createTaskId } from '../utils/taskUtils';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (key === 'tasks') {
        if (!Array.isArray(parsed)) return initialValue;
        // Older saved tasks have no id, so give them one.
        return parsed
          .filter(isValidTask)
          .map(task => (task.id ? task : { ...task, id: createTaskId() }));
      }
      return parsed;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
