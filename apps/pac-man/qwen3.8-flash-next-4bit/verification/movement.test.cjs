'use strict';

// Q-step-movement — player movement, mouth, power. (Q-step-movement 01-05)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, openBoard, plain } = require('./harness.cjs');

function play(seed) {
  const g = game(seed);
  g.maze = openBoard();
  g.player = { x: 1, y: 1, dir: g.DIRS[0], timer: 0, mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0 };
  g.ghosts = [];
  return g;
}

test('Q-step-movement 01 auto-move advances, consumes pellet, powers up', () => {
  const g = play(1);
  g.player.dir = g.DIRS[0];
  g.player.timer = 10;
  g.maze[1][2] = 3; // pellet ahead at (2,1)
  g.step();
  assert.equal(g.player.x, 2, 'advanced one cell');
  assert.equal(g.player.timer, 0, 'timer reset after move');
  assert.equal(g.score, 50, 'pellet +50');
  assert.equal(g.maze[1][2], 0, 'pellet consumed');
  assert.equal(g.player.powered, true, 'powered');
  assert.equal(g.player.powerTimer, 299, 'powerTimer 300 then decremented by power phase');
});

test('Q-step-movement 02 steer then auto-move both advance timer', () => {
  const g = play(1);
  g.player.dir = g.DIRS[0];
  g.player.timer = 6;
  g.queue = [{ type: 'steer', dir: g.DIRS[2] }];
  g.step();
  // Event phase: new heading, timer reset to 0. Movement phase: +1 → 1.
  assert.equal(g.player.timer, 1, 'moved through both phases');
});

test('Q-step-movement 03 move stops at a wall — dir null', () => {
  const g = play(1);
  g.player.dir = g.DIRS[1]; // right toward wall at x=29
  g.player.timer = 10;
  g.step();
  assert.equal(g.player.dir, null, 'dir cleared at wall');
  assert.equal(g.player.x, 1, 'did not move');
});

test('Q-step-movement 04 mouth toggles at timer 10, independent of movement', () => {
  const g = play(1);
  g.player.mouthOpen = true;
  g.player.mouthTimer = 10;
  // No dir → no movement, only mouth toggle.
  g.player.dir = null;
  g.step();
  assert.equal(g.player.mouthOpen, false, 'mouth closed at timer 10');
});

test('Q-step-movement 05 power expiry before collision phase', () => {
  const g = play(1);
  g.player.powered = true;
  g.player.powerTimer = 1;
  // A ghost standing on the player.
  g.ghosts.push({ def: g.GHOST_DEFS[0], x: g.player.x, y: g.player.y, dir: g.DIRS[0], timer: 0, waiting: null });
  g.lives = 3;
  g.step();
  assert.equal(g.player.powered, false, 'powerTimer 1 expired in the power phase');
  // Power already expired before the collision phase → collision is treated as unpowered.
  assert.equal(g.lives, 2, 'unpowered collision decrements a life after power expiry');
  assert.equal(g.ghosts.length, 1, 'ghost not respawned (was unpowered)');
});
