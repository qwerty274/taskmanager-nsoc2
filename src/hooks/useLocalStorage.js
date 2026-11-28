import { useState, useEffect, useCallback } from 'react';
import { parseTasks, commitTasks } from '../utils/taskStorage';

export function useLocalStorage(key, initialValue) {
  const [error, setError] = useState('');
  const read = useCallback(() => {
    const raw = window.localStorage.getItem(key);
    return key === 'tasks' ? parseTasks(raw) : raw === null ? initialValue : JSON.parse(raw);
  }, [key]);
  const [storedValue, setStoredValue] = useState(() => {
    try { return read(); }
    catch { return initialValue; }
  });
  const writable = key !== 'tasks' || Boolean(navigator.locks?.request);

  useEffect(() => {
    const refresh = () => {
      try { setStoredValue(read()); setError(''); }
      catch { setError('Saved tasks could not be read. Existing data has been kept.'); }
    };
    const onStorage = event => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) refresh();
    };
    window.addEventListener('storage', onStorage);
    // Reconcile events that happened between the initial render and subscription.
    refresh();
    return () => window.removeEventListener('storage', onStorage);
  }, [key, read]);

  const setValue = useCallback(async update => {
    try {
      if (key === 'tasks') {
        await commitTasks(localStorage, navigator.locks, update);
      } else {
        const previous = read();
        const next = typeof update === 'function' ? update(previous) : update;
        localStorage.setItem(key, JSON.stringify(next));
      }
      // Another tab may have committed while this promise resumed.
      setStoredValue(read());
      setError('');
      return true;
    } catch (failure) {
      setError('Tasks were not saved: ' + failure.message);
      return false;
    }
  }, [key, read]);

  return [storedValue, setValue, { writable, error }];
}
