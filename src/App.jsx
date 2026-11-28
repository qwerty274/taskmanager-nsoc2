import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TaskForm from './components/TaskForm';
import StatsDashboard from './components/StatsDashboard';
import TaskToolbar from './components/TaskToolbar';
import FilterTabs from './components/FilterTabs';
import TaskList from './components/TaskList';
import ChartsOverview from './components/ChartsOverview';
import BackupModal from './components/BackupModal';
import UndoToast from './components/UndoToast';
import PomodoroTimer from './components/PomodoroTimer';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useUndoDelete } from './hooks/useUndoDelete';
import { getTodayDate, createTaskId, addPomodoro } from './utils/taskUtils';
import { restoreTask } from './utils/undoDelete';
import { canReorder, moveTask, getMoveMessage } from './utils/reorderUtils';
import { loadEngineState, recordTaskCompletion, calcStreak, getBalance } from './utils/streakEngine';
import PomodoroTimer from "./components/PomodoroTimer";
export default function App() {
  const [tasks, setTasks, taskStorage] = useLocalStorage('tasks', []);
  const [engine, setEngine] = useState(() => loadEngineState());
  const { isLight, toggleTheme } = useTheme();
  const undoDelete = useUndoDelete();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState('default');
  const [moveMessage, setMoveMessage] = useState('');
  const reorderEnabled = canReorder(currentFilter, searchQuery, currentSort);
  const [, setLastRenderDate] = useState(getTodayDate());
  const [showTimer, setShowTimer] = useState(false);

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

  const handleAddTask = async (newTask) => {
    const saved = await setTasks(prev => [...prev, newTask]);
    if (!saved) return false;
    if (!historyMode && currentFilter !== 'all') {
      setCurrentFilter('active');
    }
    return true;
  };

  const handleToggleComplete = async (taskToToggle) => {
    let completedId;
    const saved = await setTasks(prev => prev.map(task => {
      if (task.id !== taskToToggle.id) return task;
      if (!task.completed) completedId = task.id;
      return { ...task, completed: !task.completed, completedAt: task.completed ? null : new Date().toISOString() };
    }));
    if (saved && completedId) setEngine(recordTaskCompletion(completedId));
  };

  const handleDeleteTask = async (taskToDelete) => {
    let deleted;
    const saved = await setTasks(prev => {
      const index = prev.findIndex(task => task.id === taskToDelete.id);
      if (index === -1) return prev;
      deleted = { task: prev[index], index, afterId: prev[index - 1]?.id };
      return prev.filter(task => task.id !== taskToDelete.id);
    });
    if (saved && deleted) undoDelete.recordDelete(deleted.task, deleted.index, deleted.afterId);
  };

  const handleUndoDelete = async () => {
    const entry = undoDelete.peek();
    if (!entry) return;
    undoDelete.pause();
    const saved = await setTasks(prev => restoreTask(prev, entry));
    if (saved && undoDelete.peek() === entry) undoDelete.undo();
    undoDelete.resume();
  };

  // An import replaces the whole list, so saved positions no longer mean anything.
  // Imported records have no id yet, and selecting and moving tasks go by id.
  const handleTasksUpdate = async (nextTasks) => {
    const saved = await setTasks(nextTasks.map(task => (task.id ? task : { ...task, id: createTaskId() })));
    if (saved) undoDelete.dismiss();
    return saved;
  };

  const handleUpdateTaskText = (taskToUpdate, newText) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskToUpdate.id ? { ...task, text: newText } : task
      )
    );
  };

  // Swaps one task for updater(task). Used for changes that do not need their
  // own handler, like the subtask checklist.
  const handleUpdateTask = (taskToUpdate, updater) => {
    setTasks(prev => prev.map(task => (task.id === taskToUpdate.id ? updater(task) : task)));
  };

  const handleToggleHistory = () => {
    setHistoryMode(prev => !prev);
  };

  // The tasks array is saved as is, so the new order survives a refresh.
  const handleMoveTask = async (task, target, place) => {
    let announcement = '';
    const saved = await setTasks(prev => {
      const current = prev.find(item => item.id === task.id);
      const destination = prev.find(item => item.id === target.id);
      if (!current || !destination) return prev;
      const next = moveTask(prev, current, destination, place);
      announcement = getMoveMessage(next, current);
      return next;
    });
    if (saved) setMoveMessage(announcement);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // A focus session that ran to the end adds one pomodoro to the chosen task.
  const handleSessionComplete = (sessionType, durationMinutes, taskId) => {
    if (sessionType !== 'focus' || !taskId) return;
    setTasks(prev => prev.map(task => (task.id === taskId ? addPomodoro(task) : task)));
  };

  return (
    <div className="app-shell">
      <Header
        isLight={isLight}
        onToggleTheme={toggleTheme}
        onOpenBackup={() => setIsBackupOpen(true)}
        showTimer={showTimer}
        onToggleTimer={() => setShowTimer(prev => !prev)}
      />

      <TaskForm
        onAddTask={handleAddTask}
        historyMode={historyMode}
        onToggleHistory={handleToggleHistory}
      />

      <StatsDashboard
        tasks={tasks}
        streak={calcStreak(engine.activityDays)}
        points={getBalance(engine.ledger)}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
      />
      <PomodoroTimer
  tasks={tasks.map(task => ({
    id: task.id,
    title: task.text
  }))}
/>

      <TaskToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={handleClearSearch}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
      />

      <PomodoroTimer
        taskId={taskId || undefined}
        onSessionComplete={handleSessionComplete}
      />

      {taskIdPrompt && (
        <div id="pomodoro-task-id-prompt" className="pomodoro-task-id-prompt">
          <label htmlFor="pomodoro-task-id-input" className="pomodoro-task-id-label">
            Associate timer with task ID:
            <input
              id="pomodoro-task-id-input"
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              aria-label="Task ID to associate with timer"
            />
          )}

          <TaskList
            tasks={tasks}
            currentFilter={currentFilter}
            searchQuery={searchQuery}
            reorderEnabled={reorderEnabled}
            onMoveTask={handleMoveTask}
            currentSort={currentSort}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskText={handleUpdateTaskText}
            onUpdateTask={handleUpdateTask}
          />

          {!reorderEnabled && tasks.length > 0 && (
            <p className="reorder-hint">
              To reorder tasks, open the Active list with no search and sort set to Default.
            </p>
          )}
          <p className="visually-hidden" role="status">{moveMessage}</p>

          {historyMode && <ChartsOverview tasks={tasks} isLight={isLight} />}

          </fieldset>
          </div>
          <div className="flip-face flip-face--back" aria-hidden={!showTimer} inert={!showTimer ? '' : undefined}>
            <PomodoroTimer tasks={tasks} onSessionComplete={handleSessionComplete} />
          </div>
        </div>
      </div>
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        tasks={tasks}
        onTasksUpdate={handleTasksUpdate}
      />

      <UndoToast
        task={undoDelete.latest}
        count={undoDelete.count}
        onUndo={handleUndoDelete}
        onDismiss={undoDelete.dismiss}
        onPause={undoDelete.pause}
        onResume={undoDelete.resume}
      />
    </div>
  );
}