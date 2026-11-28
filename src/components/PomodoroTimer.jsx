import React, { useState, useEffect, useRef } from 'react';
import './PomodoroTimer.css';
import {
  DEFAULT_CONFIG, LIMITS, clampSetting, formatTime, getPhaseSeconds, nextPhase, secondsLeft
} from '../utils/pomodoroUtils';

const SETTINGS = [
  { key: 'focusMinutes', label: 'Focus (minutes)' },
  { key: 'shortBreakMinutes', label: 'Short break (minutes)' },
  { key: 'longBreakMinutes', label: 'Long break (minutes)' },
  { key: 'sessionsUntilLongBreak', label: 'Focus sessions before long break' }
];

const PHASE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

/**
 * Pomodoro focus timer.
 * The countdown stores an end timestamp instead of counting ticks, so it stays
 * correct in background tabs. When a phase ends the timer stops and waits for
 * Start, and onSessionComplete(type, minutes, taskId) is called.
 * Starting a focus session first offers fullscreen (OK or Cancel); the timer
 * runs either way.
 */
export default function PomodoroTimer({ tasks = [], onSessionComplete }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [phase, setPhase] = useState('focus');
  const [completedFocus, setCompletedFocus] = useState(0);
  const [remaining, setRemaining] = useState(DEFAULT_CONFIG.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const rootRef = useRef(null);
  const dialogRef = useRef(null);
  const endAtRef = useRef(0);
  const finishingRef = useRef(false);

  // The latest callback, so the countdown effect does not restart on every render.
  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  // A deleted task cannot be credited, so drop the selection.
  useEffect(() => {
    if (selectedTaskId && !tasks.some(task => task.id === selectedTaskId)) {
      setSelectedTaskId('');
    }
  }, [tasks, selectedTaskId]);

  // Active tasks, plus the selected one if it was completed during the session.
  const taskOptions = tasks.filter(task => !task.completed || task.id === selectedTaskId);

  // Tick: recompute from the end timestamp, so a throttled tab only updates late.
  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => {
      const left = secondsLeft(endAtRef.current);
      setRemaining(left);
      if (left === 0) {
        if (finishingRef.current) return;
        finishingRef.current = true;
        setIsRunning(false);
        const finished = phase;
        const minutes = getPhaseSeconds(finished, config) / 60;
        const next = nextPhase(finished, completedFocus, config);
        setPhase(next.phase);
        setCompletedFocus(next.completedFocus);
        setRemaining(getPhaseSeconds(next.phase, config));
        setAnnouncement(`${PHASE_LABEL[finished]} finished. ${PHASE_LABEL[next.phase]} is next.`);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        // Only a focus session that ran to the end is credited, never a reset.
        if (onCompleteRef.current) {
          onCompleteRef.current(finished === 'focus' ? 'focus' : 'break', minutes, selectedTaskId || null);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRunning, phase, completedFocus, config, selectedTaskId]);

  const startTimer = () => {
    finishingRef.current = false;
    endAtRef.current = Date.now() + remaining * 1000;
    setAnnouncement(`${PHASE_LABEL[phase]} started.`);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setRemaining(secondsLeft(endAtRef.current));
    setIsRunning(false);
    setAnnouncement('Timer paused.');
  };

  const handleStartClick = () => {
    const canAsk =
      document.fullscreenEnabled && !document.fullscreenElement && phase === 'focus';
    const dialog = dialogRef.current;
    if (canAsk && dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    startTimer();
  };

  // requestFullscreen needs a user gesture, so it is called from the OK click.
  const handleFullscreenChoice = (accepted) => {
    dialogRef.current?.close();
    if (accepted) rootRef.current?.requestFullscreen?.().catch(() => {});
    startTimer(); // runs either way
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('focus');
    setCompletedFocus(0);
    setRemaining(getPhaseSeconds('focus', config));
    setAnnouncement('Timer reset.');
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  // Settings are only editable while stopped. The timer goes back to a fresh
  // focus session built from the NEW values (not the old config).
  const handleSettingChange = (key, rawValue) => {
    if (rawValue === '') return; // let the person clear the box while typing
    const next = { ...config, [key]: clampSetting(key, rawValue) };
    setConfig(next);
    setPhase('focus');
    setCompletedFocus(0);
    setRemaining(getPhaseSeconds('focus', next));
  };

  return (
    <div
      id="pomodoro-timer"
      ref={rootRef}
      className="pomodoro-timer"
      role="group"
      aria-label="Pomodoro focus timer"
    >
      <p className="visually-hidden" role="status">{announcement}</p>

      <label className="pomodoro-task-select">
        Focus on task
        <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
          <option value="">No task</option>
          {taskOptions.map(task => (
            <option key={task.id} value={task.id}>{task.text}</option>
          ))}
        </select>
      </label>

      <p className="pomodoro-phase">{PHASE_LABEL[phase]}</p>
      <div className="pomodoro-display" aria-label="Remaining time">
        {formatTime(remaining)}
      </div>
      <p className="pomodoro-session-info">
        Focus sessions done in this cycle: {completedFocus} of {config.sessionsUntilLongBreak}
      </p>

      <div className="pomodoro-controls">
        <button
          type="button"
          className="pomodoro-btn pomodoro-btn--play"
          onClick={isRunning ? pauseTimer : handleStartClick}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button type="button" className="pomodoro-btn pomodoro-btn--reset" onClick={resetTimer}>
          Reset
        </button>
      </div>

      <fieldset className="pomodoro-config" disabled={isRunning}>
        <legend>Timer settings</legend>
        {SETTINGS.map(({ key, label }) => (
          <label key={key}>
            {label}
            <input
              type="number"
              inputMode="numeric"
              min={LIMITS[key][0]}
              max={LIMITS[key][1]}
              value={config[key]}
              onChange={(e) => handleSettingChange(key, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <dialog ref={dialogRef} className="pomodoro-dialog" aria-labelledby="pomodoro-fs-title">
        <h2 id="pomodoro-fs-title">Entering full screen</h2>
        <p>The timer will fill your screen. Press Esc any time to leave full screen.</p>
        <div className="pomodoro-dialog-actions">
          <button type="button" className="pomodoro-btn" onClick={() => handleFullscreenChoice(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="pomodoro-btn pomodoro-btn--play"
            autoFocus
            onClick={() => handleFullscreenChoice(true)}
          >
            OK
          </button>
        </div>
      </dialog>
    </div>
  );
}