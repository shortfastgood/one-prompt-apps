'use strict';

// Q-step-event — step() event phase. (Q-step-event 01-09)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq, openBoard, plain } = require('./harness.cjs');

function play(seed) {
  const g = game(seed);
  g.maze = openBoard();
  g.player = { x: 1, y: 1, dir: g.DIRS[0], timer: 0, mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0 };
  g.ghosts = [];
  return g;
}

test('Q-step-event 01 empty queue during active play — no state change', () => {
  const g = play(1);
  g.score = 42;
  g.lives = 2;
  const beforePos = { x: g.player.x, y: g.player.y };
  g.step();
  eq(plain(g.queue), [], 'queue drained');
  assert.equal(g.score, 42, 'score unchanged');
  assert.equal(g.lives, 2, 'lives unchanged');
  assert.deepEqual({ x: g.player.x, y: g.player.y }, beforePos, 'player position unchanged');
});

test('Q-step-event 02 queue during gameOver — drains but simulation frozen', () => {
  const g = play(1);
  g.step();
  g.gameOver = true;
  g.queue = [{ type: 'steer', dir: g.DIRS[0] }, { type: 'steer', dir: g.DIRS[2] }];
  g.step();
  // Queue drained.
  eq(plain(g.queue), [], 'queue drained');
  // Movement does not happen while gameOver (player stuck).
  assert.equal(g.player.x, 1, 'player did not move');
  assert.equal(g.player.y, 1, 'player did not move');
});

test('Q-step-event 03 escape clears queue & stops', () => {
  const g = play(1);
  g.queue = [{ type: 'steer', dir: g.DIRS[0] }, { type: 'escape' }, { type: 'steer', dir: g.DIRS[1] }];
  g.step();
  assert.equal(g.stopped, true, 'stopped set');
  eq(plain(g.queue), [], 'queue cleared');
});

test('Q-step-event 04 steer arrival order — two steers move in order, queue empty after', () => {
  const g = play(1);
  // Point the player up so both steers (right then down) are new headings.
  g.player.dir = g.DIRS[3];
  g.queue = [{ type: 'steer', dir: g.DIRS[0] }, { type: 'steer', dir: g.DIRS[2] }];
  g.step();
  // First steer (right) to (2,1), second (down) to (2,2).
  assert.equal(g.player.x, 2, 'steer 1 applied');
  assert.equal(g.player.y, 2, 'steer 2 applied');
  assert.equal(g.player.dir, g.DIRS[2], 'final heading down');
  eq(plain(g.queue), [], 'queue drained');
});

test('Q-step-event 05 steer into a wall — blocked, no move', () => {
  const g = play(1);
  g.player.x = 1; g.player.y = 1;
  g.queue = [{ type: 'steer', dir: g.DIRS[1] }]; // left into wall
  g.step();
  assert.equal(g.player.x, 1, 'no move');
  assert.equal(g.player.y, 1, 'no move');
});

test('Q-step-event 06 duplicate-heading steer — no move (array-identity)', () => {
  const g = play(1);
  g.player.dir = g.DIRS[0];
  g.queue = [{ type: 'steer', dir: g.DIRS[0] }]; // same heading as current
  const before = g.player.x;
  g.step();
  // The event-phase steer is suppressed (identical heading); no move in event phase.
  assert.equal(g.player.x, before, 'no movement from duplicate-heading steer');
});

test('Q-step-event 07 steering then auto-move both consume ticks', () => {
  const g = play(1);
  g.player.dir = g.DIRS[0]; // facing right
  g.player.timer = 10; // already at movement threshold
  g.queue = [{ type: 'steer', dir: g.DIRS[2] }];
  const beforeX = g.player.x;
  g.step();
  // Event phase: steer down is a new heading, moves to (1,2), timer reset to 0,
  // then the movement phase advances the counter to 1.
  assert.equal(g.player.x, 1, 'steered x');
  assert.equal(g.player.y, 2, 'steered y');
  assert.equal(g.player.dir, g.DIRS[2], 'heading changed');
  assert.equal(g.player.timer, 1, 'event steer reset then movement advanced');
});

test('Q-step-event 08 restart while gameOver — resetGame applied', () => {
  const g = play(1);
  g.step();
  g.gameOver = true;
  g.queue = [{ type: 'restart' }];
  g.step();
  assert.equal(g.gameOver, false, 'game restarted');
  assert.equal(g.score, 0, 'score reset');
  assert.equal(g.lives, 3, 'lives reset');
  eq(plain(g.queue), [], 'queue drained');
});

test('Q-step-event 09 Space via emit enqueues restart', () => {
  const g = play(1);
  g.step();
  g.gameOver = true;
  g.emit('keydown', ' ');
  assert.equal(g.queue.length, 1, 'restart queued');
  assert.equal(g.queue[0].type, 'restart', 'restart type');
  g.step();
  assert.equal(g.gameOver, false, 'space restarts');
});
