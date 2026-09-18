import {
  MODES, DEFAULT_MINUTES, clampMinutes, formatTime, nextMode,
  createTask, toggleDone, removeTask, recordSession, lastDays, currentStreak, dateKey,
} from './core.js';

const STORAGE_KEY = 'studyflow:v1';
const RING_LENGTH = 2 * Math.PI * 110;

const $ = (id) => document.getElementById(id);
const el = {
  digits: $('digits'), now: $('now'), ring: $('ring-bar'),
  toggle: $('toggle'), reset: $('reset'), skip: $('skip'),
  modes: document.querySelectorAll('.mode'),
  form: $('task-form'), title: $('task-title'), est: $('task-est'),
  list: $('task-list'), empty: $('empty'),
  bars: $('bars'), today: $('stat-today'), sessions: $('stat-sessions'), streak: $('stat-streak'),
  exportBtn: $('export'), clearBtn: $('clear'),
  settings: { focus: $('set-focus'), short: $('set-short'), long: $('set-long') },
};

/* ---------- State ---------- */

const defaults = () => ({
  tasks: [], activeId: null, history: {}, completedFocus: 0,
  settings: { ...DEFAULT_MINUTES },
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const saved = JSON.parse(raw);
    return { ...defaults(), ...saved, settings: { ...DEFAULT_MINUTES, ...saved.settings } };
  } catch {
    return defaults();
  }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

let state = load();

// Timer state lives in memory only. The end timestamp keeps it accurate in background tabs.
let mode = 'focus';
let remaining = state.settings.focus * 60;
let running = false;
let endAt = 0;
let tickId = null;

const total = () => state.settings[mode] * 60;
const activeTask = () => state.tasks.find((t) => t.id === state.activeId) || null;

/* ---------- Timer ---------- */

function setMode(next) {
  clearInterval(tickId);
  running = false;
  mode = next;
  remaining = total();
  render();
}

function start() {
  if (running) return;
  running = true;
  endAt = Date.now() + remaining * 1000;
  tickId = setInterval(tick, 250);
  render();
}

function pause() {
  if (!running) return;
  remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  running = false;
  clearInterval(tickId);
  render();
}

function tick() {
  remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  if (remaining <= 0) return complete();
  renderTimer();
}

function complete() {
  clearInterval(tickId);
  running = false;
  beep();
  if (mode === 'focus') {
    state.completedFocus += 1;
    state.history = recordSession(state.history, state.settings.focus);
    const task = activeTask();
    if (task) task.spent += 1;
  }
  const next = nextMode(mode, state.completedFocus);
  save();
  setMode(next);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch { /* audio blocked or unsupported */ }
}

/* ---------- Rendering ---------- */

function renderTimer() {
  const text = formatTime(remaining);
  el.digits.textContent = text;
  el.ring.style.strokeDasharray = RING_LENGTH;
  el.ring.style.strokeDashoffset = RING_LENGTH * (1 - remaining / total());
  el.toggle.textContent = running ? 'Pause' : remaining < total() ? 'Resume' : 'Start';
  document.title = running ? `${text} - ${MODES[mode].label}` : 'StudyFlow';
}

function renderModes() {
  document.body.dataset.mode = mode;
  el.modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  const task = activeTask();
  if (mode === 'focus' && task) {
    el.now.textContent = task.title;
    el.now.className = 'now has-task';
  } else {
    el.now.textContent = mode === 'focus' ? 'No task selected' : 'Take a break';
    el.now.className = 'now';
  }
}

function pips(task) {
  const wrap = document.createElement('span');
  wrap.className = 'pips';
  wrap.setAttribute('aria-label', `${task.spent} of ${task.estimate} sessions done`);
  const count = Math.max(task.estimate, task.spent);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'pip' + (i < task.spent ? ' filled' : '');
    wrap.append(p);
  }
  return wrap;
}

function renderTasks() {
  el.list.replaceChildren();
  el.empty.hidden = state.tasks.length > 0;
  for (const task of state.tasks) {
    const li = document.createElement('li');
    li.className = 'task' + (task.id === state.activeId ? ' active' : '') + (task.done ? ' done' : '');
    li.dataset.id = task.id;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.setAttribute('aria-label', `Mark "${task.title}" as done`);
    check.dataset.action = 'toggle';

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'task-title';
    title.textContent = task.title;
    title.title = 'Focus on this task';
    title.dataset.action = 'select';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = '\u00d7';
    remove.setAttribute('aria-label', `Delete "${task.title}"`);
    remove.dataset.action = 'remove';

    li.append(check, title, pips(task), remove);
    el.list.append(li);
  }
}

function renderStats() {
  const days = lastDays(state.history, 7);
  const today = days[days.length - 1];
  el.today.textContent = today.minutes;
  el.sessions.textContent = today.sessions;
  el.streak.textContent = currentStreak(state.history);

  const max = Math.max(30, ...days.map((d) => d.minutes));
  el.bars.replaceChildren();
  days.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col' + (i === days.length - 1 ? ' today' : '');
    const val = document.createElement('span');
    val.className = 'bar-val';
    val.textContent = d.minutes;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.round((d.minutes / max) * 85)}%`;
    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = d.label;
    col.append(val, bar, label);
    el.bars.append(col);
  });
}

function render() {
  renderModes();
  renderTimer();
  renderTasks();
  renderStats();
  for (const key of Object.keys(el.settings)) el.settings[key].value = state.settings[key];
}

/* ---------- Events ---------- */

el.toggle.addEventListener('click', () => (running ? pause() : start()));
el.reset.addEventListener('click', () => setMode(mode));
el.skip.addEventListener('click', () => setMode(nextMode(mode, state.completedFocus)));
el.modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const task = createTask(el.title.value, el.est.value);
  if (!task) return;
  state.tasks.push(task);
  if (!state.activeId) state.activeId = task.id;
  el.title.value = '';
  save();
  render();
  el.title.focus();
});

el.list.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  const li = e.target.closest('.task');
  if (!target || !li) return;
  const id = li.dataset.id;
  if (target.dataset.action === 'select') state.activeId = id;
  if (target.dataset.action === 'toggle') state.tasks = toggleDone(state.tasks, id);
  if (target.dataset.action === 'remove') {
    state.tasks = removeTask(state.tasks, id);
    if (state.activeId === id) state.activeId = null;
  }
  save();
  render();
});

for (const key of Object.keys(el.settings)) {
  el.settings[key].addEventListener('change', () => {
    state.settings[key] = clampMinutes(el.settings[key].value, DEFAULT_MINUTES[key]);
    save();
    if (!running && key === mode) remaining = total();
    render();
  });
}

el.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `studyflow-${dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

el.clearBtn.addEventListener('click', () => {
  if (!confirm('Delete all tasks and history? This cannot be undone.')) return;
  state = defaults();
  save();
  setMode('focus');
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'BUTTON', 'SUMMARY'].includes(tag)) return;
  e.preventDefault();
  running ? pause() : start();
});

render();
