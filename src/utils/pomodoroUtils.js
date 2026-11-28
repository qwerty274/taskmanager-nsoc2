export const DEFAULT_CONFIG = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4
};

export const LIMITS = {
  focusMinutes: [1, 120],
  shortBreakMinutes: [1, 60],
  longBreakMinutes: [1, 60],
  sessionsUntilLongBreak: [1, 20]
};

export function clampSetting(key, value) {
  const [min, max] = LIMITS[key];
  const number = parseInt(value, 10);
  if (Number.isNaN(number)) return DEFAULT_CONFIG[key];
  return Math.max(min, Math.min(max, number));
}

export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function getPhaseSeconds(phase, config) {
  if (phase === 'short') return config.shortBreakMinutes * 60;
  if (phase === 'long') return config.longBreakMinutes * 60;
  return config.focusMinutes * 60;
}

export function nextPhase(phase, completedFocus, config) {
  if (phase !== 'focus') return { phase: 'focus', completedFocus };
  const done = completedFocus + 1;
  if (done >= config.sessionsUntilLongBreak) return { phase: 'long', completedFocus: 0 };
  return { phase: 'short', completedFocus: done };
}

export function secondsLeft(endAt, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}