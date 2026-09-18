// Pure logic for StudyFlow. No DOM access here, so it can be unit tested with Node.

export const MODES = {
  focus: { label: 'Focus' },
  short: { label: 'Short break' },
  long: { label: 'Long break' },
};

export const DEFAULT_MINUTES = { focus: 25, short: 5, long: 15 };

export function clampMinutes(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(180, Math.max(1, n));
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// completedFocus = number of focus sessions finished so far (including the one that just ended).
export function nextMode(current, completedFocus, longBreakEvery = 4) {
  if (current !== 'focus') return 'focus';
  return completedFocus > 0 && completedFocus % longBreakEvery === 0 ? 'long' : 'short';
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createTask(title, estimate = 1) {
  const clean = String(title ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return null;
  const est = Math.min(12, Math.max(1, Math.round(Number(estimate)) || 1));
  return { id: makeId(), title: clean.slice(0, 120), estimate: est, spent: 0, done: false };
}

export function toggleDone(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function removeTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

export function recordSession(history, minutes, date = new Date()) {
  const key = dateKey(date);
  const prev = history[key] || { sessions: 0, minutes: 0 };
  return { ...history, [key]: { sessions: prev.sessions + 1, minutes: prev.minutes + minutes } };
}

export function lastDays(history, n = 7, today = new Date()) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dateKey(d);
    const entry = history[key] || { sessions: 0, minutes: 0 };
    days.push({
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      sessions: entry.sessions,
      minutes: entry.minutes,
    });
  }
  return days;
}

// Consecutive days with at least one session. Today may still be empty without breaking the streak.
export function currentStreak(history, today = new Date()) {
  let offset = history[dateKey(today)]?.sessions > 0 ? 0 : 1;
  let streak = 0;
  for (;;) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    if (!(history[dateKey(d)]?.sessions > 0)) break;
    streak++;
    offset++;
  }
  return streak;
}
