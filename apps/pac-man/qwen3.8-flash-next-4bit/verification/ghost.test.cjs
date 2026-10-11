'use strict';

// Q-ghost — ghost movement & release. (Q-ghost 01-05)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, openBoard, plain } = require('./harness.cjs');

function play(seed) {
  const g = game(seed);
  const maze = openBoard();
  // Add a couple collectibles so the win-check does not end the game before
  // ghost-movement assertions run (openBoard() is empty by default).
  maze[2][2] = 2;
  maze[3][3] = 3;
  g.maze = maze;
  g.player = { x: 1, y: 1, dir: g.DIRS[0], timer: 0, mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0 };
  g.ghosts = [];
  return g;
}

test('Q-ghost 01 released ghost moves each 15 ticks', () => {
  const g = play(1);
  const gh = { def: g.GHOST_DEFS[0], x: 14, y: 7, dir: g.DIRS[0], timer: 0, waiting: null };
  g.ghosts.push(gh);
  for (let i = 0; i < 14; i++) { g.step(); assert.equal(gh.x, 14); }
  g.step(); // 15th
  assert.equal(gh.x, 15, 'moved after 15 ticks');
});

test('Q-ghost 02 ghost stuck until release — jumps to (14,7) at timer 0', () => {
  const g = play(1);
  // Ghost well clear of the player spawn (1,1) so no accidental collision.
  const gh = { def: g.GHOST_DEFS[0], x: 15, y: 10, dir: g.DIRS[0], timer: 0, waiting: 3 };
  g.ghosts.push(gh);
  g.step();
  g.step(); // waiting counts 3 -> 1; ghost still home
  assert.equal(gh.x, 15, 'still home before release');
  g.step(); // waiting 1 -> 0 -> jump out, keep dir
  assert.equal(gh.waiting, null, 'released');
  assert.equal(gh.x, 14, 'jumped to (14,7)');
  assert.equal(gh.y, 7, 'jumped to (14,7)');
  assert.equal(gh.timer, 0, 'timer 0 on release');
});

test('Q-ghost 03 ghost blocked picks among neighbors', () => {
  const g = play(1);
  g.player.powered = false;
  // Ghost at (1,5) facing LEFT, with the forward cell (0,5) a border wall → the
  // straight move is blocked, so the ghost must pick among valid neighbors.
  const gh = { def: g.GHOST_DEFS[0], x: 1, y: 5, dir: g.DIRS[1], timer: 14, waiting: null };
  gh.timer = 14;
  g.ghosts.push(gh);
  // Deterministic RNG so the chosen neighbor is predictable: (0,5) is a wall,
  // so the neighbor that survives the DIRS filter is (2,5) (dir [1,0]).
  g.setRandom(() => 0);
  g.step();
  assert.equal(gh.x, 2, 'ghost moved to a valid neighbor');
  assert.equal(gh.y, 5, 'ghost kept its row (no open neighbor vertically)');
  assert.deepEqual(gh.dir, g.DIRS[0], 'ghost reoriented to the available neighbor dir');
});

test('Q-ghost 04 released ghost continues straight when path clear', () => {
  const g = play(1);
  const gh = { def: g.GHOST_DEFS[0], x: 5, y: 5, dir: g.DIRS[0], timer: 14, waiting: null };
  g.ghosts.push(gh);
  g.step();
  assert.equal(gh.x, 6, 'continued straight');
  assert.equal(gh.y, 5, 'continued straight');
});

test('Q-ghost 05 power does not affect ghost movement', () => {
  const g = play(1);
  // One ghost 14 ticks from its next move, with a fixed RNG stream so its
  // (blocked→neighbor) decision is deterministic.
  const gh = { def: g.GHOST_DEFS[0], x: 5, y: 5, dir: g.DIRS[0], timer: 14, waiting: null };
  g.ghosts.push(gh);
  g.setRandom(() => 0.5);
  // Unpowered step: record where the ghost ends up.
  g.player.powered = false;
  g.step();
  const a = { x: gh.x, y: gh.y };
  // Powered step: same RNG, same ghost state → identical movement.
  g.player.powered = true;
  g.player.powerTimer = 300;
  g.step();
  assert.equal(gh.x, a.x, 'movement independent of power');
  assert.equal(gh.y, a.y, 'movement independent of power');
});
