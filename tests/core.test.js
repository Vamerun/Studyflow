import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime, nextMode, createTask, toggleDone, removeTask,
  recordSession, lastDays, currentStreak, dateKey, clampMinutes,
} from '../src/core.js';

test('formatTime pads minutes and seconds', () => {
  assert.equal(formatTime(1500), '25:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(-3), '00:00');
});

test('nextMode gives a long break after every 4th focus session', () => {
  assert.equal(nextMode('focus', 1), 'short');
  assert.equal(nextMode('focus', 3), 'short');
  assert.equal(nextMode('focus', 4), 'long');
  assert.equal(nextMode('focus', 8), 'long');
  assert.equal(nextMode('short', 4), 'focus');
  assert.equal(nextMode('long', 4), 'focus');
});

test('createTask trims, validates and clamps the estimate', () => {
  assert.equal(createTask('   '), null);
  const t = createTask('  Read   chapter 3 ', 99);
  assert.equal(t.title, 'Read chapter 3');
  assert.equal(t.estimate, 12);
  assert.equal(t.done, false);
  assert.equal(createTask('x', 'abc').estimate, 1);
});

test('toggleDone and removeTask do not mutate the input', () => {
  const a = createTask('A');
  const b = createTask('B');
  const list = [a, b];
  const toggled = toggleDone(list, a.id);
  assert.equal(toggled[0].done, true);
  assert.equal(list[0].done, false);
  assert.deepEqual(removeTask(list, a.id), [b]);
});

test('recordSession accumulates per day', () => {
  const day = new Date(2026, 8, 19);
  let h = recordSession({}, 25, day);
  h = recordSession(h, 25, day);
  assert.deepEqual(h['2026-09-19'], { sessions: 2, minutes: 50 });
});

test('lastDays returns oldest first and fills empty days', () => {
  const today = new Date(2026, 8, 19);
  const h = recordSession({}, 25, today);
  const days = lastDays(h, 7, today);
  assert.equal(days.length, 7);
  assert.equal(days[0].key, '2026-09-13');
  assert.equal(days[6].key, '2026-09-19');
  assert.equal(days[6].minutes, 25);
  assert.equal(days[0].minutes, 0);
});

test('currentStreak counts consecutive days and tolerates an empty today', () => {
  const today = new Date(2026, 8, 19);
  let h = {};
  assert.equal(currentStreak(h, today), 0);
  h = recordSession(h, 25, new Date(2026, 8, 18));
  h = recordSession(h, 25, new Date(2026, 8, 17));
  assert.equal(currentStreak(h, today), 2);
  h = recordSession(h, 25, today);
  assert.equal(currentStreak(h, today), 3);
  assert.equal(currentStreak(recordSession({}, 25, new Date(2026, 8, 10)), today), 0);
});

test('dateKey and clampMinutes', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(clampMinutes('40', 25), 40);
  assert.equal(clampMinutes('0', 25), 1);
  assert.equal(clampMinutes('999', 25), 180);
  assert.equal(clampMinutes('nope', 25), 25);
});
