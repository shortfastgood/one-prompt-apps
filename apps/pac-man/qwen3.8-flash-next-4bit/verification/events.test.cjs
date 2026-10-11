'use strict';

// Q-events — input handlers via the harness `emit` dispatcher (index.html 291-301).
//
//   keydown:  key in ARROWS → enqueue {steer, dir} + preventDefault()
//             else ' '      → enqueue {restart} + preventDefault()
//             else Escape  → enqueue {escape}   (no preventDefault)
//             every enqueue is guarded by !e.repeat
//   blur        → queue.length = 0
//   visibilitychange → hidden: queue.length = 0; visible: acc = 0; last = performance.now()
//
// Q-events 01-09 below map one-to-one to the plan's Q-events list.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq } = require('./harness.cjs');

test('Q-events 01 ArrowRight enqueues {steer,[1,0]}, preventDefault=true, no immediate move', () => {
  const g = game();
  const prevented = g.emit('keydown', 'ArrowRight');
  eq(g.queue, [{ type: 'steer', dir: g.DIRS[0] }], 'mapped to DIRS[0]');
  eq(prevented, true, 'default prevented for an arrow');
  eq(g.player.x, 1, 'no movement on enqueue (deferred to step)');
});

test('Q-events 02 ArrowLeft/Up/Down map to their DIRS vectors', () => {
  const g = game();
  g.emit('keydown', 'ArrowLeft');
  g.emit('keydown', 'ArrowUp');
  g.emit('keydown', 'ArrowDown');
  eq(g.queue, [
    { type: 'steer', dir: g.DIRS[1] }, // ArrowLeft  [-1,0]
    { type: 'steer', dir: g.DIRS[3] }, // ArrowUp    [0,-1]
    { type: 'steer', dir: g.DIRS[2] }, // ArrowDown  [0,1]
  ], 'each arrow mapped to the canonical DIRS[] by identity');
});

test('Q-events 03 Space enqueues a restart', () => {
  const g = game();
  const prevented = g.emit('keydown', ' ');
  eq(g.queue, [{ type: 'restart' }], 'Space queues restart');
  eq(prevented, true, 'default prevented for Space');
});

test('Q-events 04 Escape enqueues an escape (no preventDefault)', () => {
  const g = game();
  const prevented = g.emit('keydown', 'Escape');
  eq(g.queue, [{ type: 'escape' }], 'Escape queues escape');
  eq(prevented, false, 'Escape does NOT call preventDefault');
});

test('Q-events 05 repeat:true suppresses the enqueue', () => {
  const g = game();
  g.emit('keydown', 'ArrowRight', { repeat: true });
  g.emit('keydown', ' ', { repeat: true });
  g.emit('keydown', 'Escape', { repeat: true });
  eq(g.queue, [], 'all repeated presses are dropped');
});

test('Q-events 06 blur clears the queue', () => {
  const g = game();
  g.emit('keydown', 'ArrowRight');
  g.emit('keydown', 'ArrowLeft');
  assert.ok(g.queue.length === 2);
  g.listeners.window['blur']({}); // dispatch the captured blur handler
  eq(g.queue, [], 'blur empties the queue');
});

test('Q-events 07 visibilitychange: hidden clears queue, visible resets acc/last but keeps queue', () => {
  const g = game();
  g.emit('keydown', 'ArrowRight'); // one item already queued
  g.setHidden(true);
  g.emit('keydown', 'ArrowLeft');
  g.emit('visibilitychange'); // hidden branch
  eq(g.queue, [], 'hidden empties the queue');

  g.emit('keydown', 'ArrowUp');
  g.setHidden(false);
  g.emit('visibilitychange'); // visible branch: resets timing, keeps queue
  eq(g.acc, 0, 'visible resets the accumulator');
  eq(g.last, 0, 'visible resets last to performance.now() (clock 0)');
  eq(g.queue.length, 1, 'visible keeps the queue');
});

test('Q-events 08 an unrelated key enqueues nothing and does not preventDefault', () => {
  const g = game();
  const prevented = g.emit('keydown', 'a');
  eq(g.queue, [], 'no enqueue for an unknown key');
  eq(prevented, false, 'no preventDefault for an unknown key');
});

test('Q-events 09 a keydown during stopped enqueues; the subsequent step drains it and sets stopped', () => {
  const g = game();
  g.emit('keydown', 'ArrowRight');
  g.emit('keydown', 'Escape'); // escape queued after the steer
  g.step(); // event phase: steer first, then escape → stopped
  eq(g.stopped, true, 'the escape sets stopped');
  eq(g.queue, [], 'the whole queue is drained by the escape');
  eq(g.player.x, 2, 'the steer moved the player before the escape froze the step');
});
