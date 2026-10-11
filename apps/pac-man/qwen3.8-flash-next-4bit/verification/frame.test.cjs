'use strict';

// Q-frame — the rAF animation loop: scheduling, hidden/stopped guards, and the
// fixed-timestep catch-up loop.
//
// Source contract (index.html):
//   function frame(now) {
//     requestAnimationFrame(frame);                     // scheduled first, always
//     if (stopped || document.hidden) return;           // early return, no work
//     if (now - last > 1000) { last = now; acc = 0; }    // clamp a long stall
//     acc += now - last; last = now;
//     while (acc >= 1000 / 60) {                        // fixed 16.667ms timestep
//       acc -= 1000 / 60; step();
//       if (stopped) break;
//     }
//     render();
//   }
//
// `last`/`acc` start at 0 (harness clock is 0). The init tail runs
// `requestAnimationFrame(frame)` once, so we clear `g.raf` before each call and
// assert exactly one was scheduled by *that* call.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq, near } = require('./harness.cjs');

test('Q-frame 01 rAF is still scheduled when already stopped', () => {
  const g = game();
  g.emit('keydown', 'Escape'); // enqueue escape
  g.step();                    // event phase sets stopped = true
  eq(g.stopped, true);
  g.calls.length = 0;
  g.raf.length = 0;            // drop the init-time schedule
  g.frame(100);
  // requestAnimationFrame(frame) ran before the guard returned.
  eq(g.raf.length, 1, 'one rAF callback queued');
  eq(g.stopped, true);
  eq(g.calls.length, 0, 'no render ran (early return before the loop)');
});

test('Q-frame 02 hidden tab: no step, no render, rAF still scheduled', () => {
  const g = game();
  g.setHidden(true);
  g.calls.length = 0;
  g.raf.length = 0;            // drop the init-time schedule
  g.frame(200);
  eq(g.raf.length, 1, 'rAF scheduled even when hidden');
  eq(g.calls.length, 0, 'render() skipped while hidden');
  eq(g.player.timer, 0, 'step() skipped while hidden (no movement)');
});

test('Q-frame 03 sub-throttle accumulator delta: no tick', () => {
  const g = game(); // last = 0
  g.setClock(10); // now - last = 10ms < 1000/60 ≈ 16.67ms
  g.frame(10);
  // accumulator (10) is below one timestep: movement never advances.
  eq(g.player.timer, 0, 'no step() ran');
  eq(g.score, 0, 'nothing collected');
});

test('Q-frame 04 one timestep: exactly one step() then render()', () => {
  const g = game(); // last = 0
  g.maze[2][2] = 2; // keep the game alive (win-check would otherwise end it)
  g.setClock(20); // now - last = 20ms -> one full 16.667ms tick, remainder 3.33ms
  g.calls.length = 0;
  g.raf.length = 0;
  g.frame(20);
  eq(g.player.mouthTimer, 1, 'exactly one fixed-step tick');
  near(g.acc, 20 - 1000 / 60, 1e-6, 'accumulator drained to the remainder');
  eq(g.calls.length > 0, true, 'render() ran after the tick');
  eq(g.raf.length, 1, 'rAF still scheduled');
});

test('Q-frame 05 escape during the catch-up loop stops the simulation', () => {
  const g = game(); // last = 0
  g.acc = 1000; // pre-load the accumulator (≈60 would-be ticks)
  g.emit('keydown', 'Escape'); // single queued escape
  g.raf.length = 0;
  g.frame(0); // now - last == 0, so acc is unchanged; the escape fires in-loop
  eq(g.stopped, true, 'the escape in the loop set stopped');
  eq(g.queue.length, 0, 'queue drained by the escape');
  eq(g.raf.length, 1, 'rAF still scheduled after the break');
});

test('Q-frame 06 fixed timestep: 33.34ms of delta advances exactly 2 steps', () => {
  const g = game(); // last = 0
  g.maze[2][2] = 2; // survive the per-step win-check
  g.acc = 33.34; // floor(33.34 / 16.667) === 2 fixed steps
  g.emit('keydown', 'ArrowRight'); // one steer consumed on the first tick
  g.raf.length = 0;
  g.frame(0);
  eq(g.player.timer, 2, 'two fixed timesteps executed for 33.34ms');
  eq(g.raf.length, 1, 'rAF still scheduled');
});

test('Q-frame 07 long stall clamps accumulator to 0', () => {
  // The `now - last > 1000` clamp only fires after a >1s gap. At init last=0;
  // calling frame(2000) gives a 2s gap, so the clamp runs (last=now, acc=0) and
  // nothing ticks.
  const g = game();
  g.raf.length = 0;
  g.frame(2000);
  eq(g.acc, 0, 'accumulator clamped to 0 after a >1s stall');
});
