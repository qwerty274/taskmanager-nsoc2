import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TaskForm from './components/TaskForm';
import StatsDashboard from './components/StatsDashboard';
import TaskToolbar from './components/TaskToolbar';
import FilterTabs from './components/FilterTabs';
import TaskList from './components/TaskList';
import ChartsOverview from './components/ChartsOverview';
import BackupModal from './components/BackupModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { getTodayDate } from './utils/taskUtils';

export default function App() {
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const { isLight, toggleTheme } = useTheme();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState('default');
  const [, setLastRenderDate] = useState(getTodayDate());

  // Automatic overdue refresh when midnight passes or tab becomes visible
  useEffect(() => {
    const handleDateRefresh = () => {
      setLastRenderDate(prev => {
        const today = getTodayDate();
        if (today !== prev) {
          return today;
        }
        return prev;
      });
    };

    const interval = setInterval(handleDateRefresh, 60 * 1000);
    const handleVisibility = () => {
      if (!document.hidden) handleDateRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleAddTask = (newTask) => {
    setTasks(prev => [...prev, newTask]);
    if (!historyMode && currentFilter !== 'all') {
      setCurrentFilter('active');
    }
  };

  const handleToggleComplete = (taskToToggle) => {
    setTasks(prev =>
      prev.map(task => {
        if (task === taskToToggle) {
          const nextCompleted = !task.completed;
          return {
            ...task,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null
          };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (taskToDelete) => {
    setTasks(prev => prev.filter(task => task !== taskToDelete));
  };

  const handleUpdateTaskText = (taskToUpdate, newText) => {
    setTasks(prev =>
      prev.map(task =>
        task === taskToUpdate ? { ...task, text: newText } : task
      )
    );
  };

  const handleToggleHistory = () => {
    setHistoryMode(prev => !prev);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="app-shell">
      <Header
        isLight={isLight}
        onToggleTheme={toggleTheme}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      <TaskForm
        onAddTask={handleAddTask}
        historyMode={historyMode}
        onToggleHistory={handleToggleHistory}
      />

      <StatsDashboard
        tasks={tasks}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
      />

      <TaskToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={handleClearSearch}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
      />

      {historyMode && (
        <FilterTabs
          currentFilter={currentFilter}
          onSelectFilter={setCurrentFilter}
        />
      )}

      <TaskList
        tasks={tasks}
        currentFilter={currentFilter}
        searchQuery={searchQuery}
        currentSort={currentSort}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        onUpdateTaskText={handleUpdateTaskText}
      />

      {historyMode && <ChartsOverview tasks={tasks} isLight={isLight} />}

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        tasks={tasks}
        onTasksUpdate={setTasks}
      />
    </div>
  );
}
