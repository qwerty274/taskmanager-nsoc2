
import React, { useEffect, useRef, useState } from "react";
import "./PomodoroTimer.css";

const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const MODE_LABELS = {
  focus: "Focus Time",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

export default function PomodoroTimer({ tasks = [] }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [selectedTask, setSelectedTask] = useState("");

  const deadlineRef = useRef(null);

  // Keep the latest values accessible to the interval.
  const remainingRef = useRef(timeLeft);
  const modeRef = useRef(mode);
  const settingsRef = useRef(settings);
  const sessionsRef = useRef(completedSessions);

  remainingRef.current = timeLeft;
  modeRef.current = mode;
  settingsRef.current = settings;
  sessionsRef.current = completedSessions;

  const updateTime = (seconds) => {
    remainingRef.current = seconds;
    setTimeLeft(seconds);
  };

  // Stable interval: rerenders do not restart the countdown.
  useEffect(() => {
    if (!isRunning) return;

    deadlineRef.current =
      Date.now() + remainingRef.current * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (deadlineRef.current - Date.now()) / 1000
        )
      );

      if (remaining > 0) {
        updateTime(remaining);
        return;
      }

      clearInterval(interval);
      updateTime(0);
      setIsRunning(false);

      if (modeRef.current === "focus") {
        const nextSessions = sessionsRef.current + 1;

        sessionsRef.current = nextSessions;
        setCompletedSessions(nextSessions);

        const nextMode =
          nextSessions % 4 === 0
            ? "longBreak"
            : "shortBreak";

        modeRef.current = nextMode;
        setMode(nextMode);

        updateTime(
          settingsRef.current[nextMode] * 60
        );
      } else {
        modeRef.current = "focus";
        setMode("focus");

        updateTime(
          settingsRef.current.focus * 60
        );
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning]);

  const startTimer = () => {
    if (timeLeft <= 0) return;
    setIsRunning(true);
  };

  const pauseTimer = () => {
    if (deadlineRef.current !== null) {
      const remaining = Math.max(
        0,
        Math.ceil(
          (deadlineRef.current - Date.now()) / 1000
        )
      );

      updateTime(remaining);
    }

    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    deadlineRef.current = null;

    updateTime(settings[mode] * 60);
  };

  const changeMode = (newMode) => {
    setIsRunning(false);
    deadlineRef.current = null;

    modeRef.current = newMode;
    setMode(newMode);

    updateTime(settings[newMode] * 60);
  };

  const updateSetting = (key, value) => {
    if (value === "") {
      setSettings((prev) => ({
        ...prev,
        [key]: "",
      }));
      return;
    }

    const duration = Math.max(
      1,
      Math.min(120, Number(value))
    );

    setSettings((prev) => ({
      ...prev,
      [key]: duration,
    }));
  };

  const applySettings = () => {
    const normalized = {};

    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      normalized[key] = Math.max(
        1,
        Math.min(
          120,
          Number(settings[key]) || DEFAULT_SETTINGS[key]
        )
      );
    });

    settingsRef.current = normalized;
    setSettings(normalized);

    if (!isRunning) {
      updateTime(normalized[mode] * 60);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  };

  const selectedTaskTitle =
    tasks.find(
      (task) => String(task.id) === selectedTask
    )?.title || "No task selected";

  return (
    <section className="pomodoro-container">
      <div className="pomodoro-header">
        <div>
          <span className="pomodoro-eyebrow">
            PRODUCTIVITY
          </span>
          <h2>Pomodoro Focus Timer</h2>
          <p>Stay focused. Take meaningful breaks.</p>
        </div>
        <span className="pomodoro-icon" aria-hidden="true">
          🍅
        </span>
      </div>

      <div className="pomodoro-modes">
        {Object.keys(MODE_LABELS).map((item) => (
          <button
            key={item}
            type="button"
            className={
              mode === item ? "mode-btn active" : "mode-btn"
            }
            aria-pressed={mode === item}
            onClick={() => changeMode(item)}
          >
            {MODE_LABELS[item]}
          </button>
        ))}
      </div>

      <div className="pomodoro-clock">
        <div
          className="pomodoro-time"
          role="timer"
          aria-label={`${MODE_LABELS[mode]}: ${formatTime(timeLeft)} remaining`}
        >
          {formatTime(timeLeft)}
        </div>

        <p className="pomodoro-status" aria-live="polite">
          {isRunning
            ? "Timer is running"
            : timeLeft === 0
              ? "Session completed"
              : "Ready to focus"}
        </p>

        <div className="pomodoro-controls">
          {!isRunning ? (
            <button
              type="button"
              className="start-btn"
              onClick={startTimer}
              disabled={timeLeft === 0}
            >
              ▶ Start
            </button>
          ) : (
            <button
              type="button"
              className="pause-btn"
              onClick={pauseTimer}
            >
              ⏸ Pause
            </button>
          )}

          <button
            type="button"
            className="reset-btn"
            onClick={resetTimer}
          >
            ↻ Reset
          </button>
        </div>
      </div>

      <div className="pomodoro-progress">
        <span>Completed focus sessions</span>
        <strong>{completedSessions}</strong>
      </div>

      <div className="pomodoro-task">
        <label htmlFor="pomodoro-task">
          Associate with a task
        </label>

        <select
          id="pomodoro-task"
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
        >
          <option value="">No task selected</option>

          {tasks.map((task) => (
            <option
              key={task.id}
              value={String(task.id)}
            >
              {task.title}
            </option>
          ))}
        </select>

        <p>
          Current task: <strong>{selectedTaskTitle}</strong>
        </p>
      </div>

      <div className="pomodoro-settings">
        <h3>Timer Settings</h3>

        <div className="settings-grid">
          <div>
            <label htmlFor="focus-duration">
              Focus (minutes)
            </label>
            <input
              id="focus-duration"
              type="number"
              min="1"
              max="120"
              value={settings.focus}
              onChange={(e) =>
                updateSetting("focus", e.target.value)
              }
              onBlur={applySettings}
            />
          </div>

          <div>
            <label htmlFor="short-duration">
              Short Break (minutes)
            </label>
            <input
              id="short-duration"
              type="number"
              min="1"
              max="120"
              value={settings.shortBreak}
              onChange={(e) =>
                updateSetting("shortBreak", e.target.value)
              }
              onBlur={applySettings}
            />
          </div>

          <div>
            <label htmlFor="long-duration">
              Long Break (minutes)
            </label>
            <input
              id="long-duration"
              type="number"
              min="1"
              max="120"
              value={settings.longBreak}
              onChange={(e) =>
                updateSetting("longBreak", e.target.value)
              }
              onBlur={applySettings}
            />
          </div>
        </div>

        <button
          type="button"
          className="save-settings-btn"
          onClick={applySettings}
          disabled={isRunning}
        >
          Apply Settings
        </button>

        <p className="settings-note">
          Long break starts after every 4 completed focus sessions.
        </p>
      </div>

      <p className="pomodoro-footer">
        Focus sessions never automatically complete your tasks.
      </p>
    </section>
  );
}
