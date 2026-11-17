import React, { useState, useRef } from 'react';
import { getTodayDate, createTaskId } from '../utils/taskUtils';
import { useCategories } from '../hooks/useCategories';

export default function TaskForm({ onAddTask, historyMode, onToggleHistory }) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [isPressed, setIsPressed] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const { categories, addCategory } = useCategories();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please enter a task title.');
      inputRef.current?.focus();
      return;
    }
    setError('');

    onAddTask({
      id: createTaskId(),
      text: trimmed,
      dueDate: dueDate || getTodayDate(),
      priority,
      completed: false,
      completedAt: null,
      category: category || undefined
    });

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 180);

    setText('');
    setCategory('');
    inputRef.current?.focus();
  };

  return (
    <>
      <form id="todo-form" aria-label="Add new task" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          id="todo-input"
          type="text"
          placeholder="New Task..."
          aria-label="New task title"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'todo-form-error' : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          required
        />
      <input
        id="todo-date"
        type="date"
        aria-label="Task due date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <select
        id="todo-priority"
        aria-label="Task priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      {/* Category selector */}
      <div className="category-selector">
        <select
          id="todo-category"
          aria-label="Task category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Category (none)</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="button"
          className="category-add-btn"
          aria-label="Add new category"
          onClick={() => {
            const name = prompt('Enter new category name:');
            if (name && addCategory(name.trim())) {
              setCategory(name.trim());
            }
          }}
        >
          +
        </button>
      </div>

      <button
        type="submit"
        className={isPressed ? 'btn-pressed' : ''}
      >
        Add task
      </button>
      <button
        id="history-toggle"
        className="history-button"
        type="button"
        onClick={onToggleHistory}
        aria-pressed={historyMode}
      >
        {historyMode ? 'Back to tasks' : 'History'}
      </button>
    </form>
    <p id="todo-form-error" className="form-error" role="alert">
      {error}
    </p>
    </>
  );
}