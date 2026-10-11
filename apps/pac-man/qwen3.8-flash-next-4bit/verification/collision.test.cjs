'use strict';

// Q-collision — collisions & endings (snapshot, no early break). (Q-collision 01-06)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, openBoard } = require('./harness.cjs');

function play(seed) {
  const g = game(seed);
  g.maze = openBoard();
  // dir=null so step() does not auto-move the player; place ghosts exactly on the player.
  g.player = { x: 5, y: 5, dir: null, timer: 0, mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0 };
  g.ghosts = [];
  return g;
}

test('Q-collision 01 no collision — no score/life change', () => {
  const g = play(1);
  g.ghosts.push({ def: g.GHOST_DEFS[0], x: 10, y: 10, dir: g.DIRS[0], timer: 0, waiting: null });
  g.lives = 2; g.score = 30;
  g.step();
  assert.equal(g.lives, 2, 'no life lost');
  assert.equal(g.score, 30, 'no score gained');
});

test('Q-collision 02 powered collision — score += 200, ghost respawned', () => {
  const g = play(1);
  g.player.powered = true;
  g.player.powerTimer = 300;
  g.ghosts.push({ def: g.GHOST_DEFS[1], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.score = 10;
  g.step();
  assert.equal(g.score, 210, 'score += 200');
  assert.equal(g.ghosts.length, 1, 'ghost replaced, length preserved');
  const e = g.ghosts.find((h) => h.def.color === g.GHOST_DEFS[1].color);
  assert.ok(e);
  assert.equal(e.waiting, 900, 'respawned ghost waits 900');
});

test('Q-collision 03 unpowered collision, lives=3 → lives=2, resetPositions', () => {
  const g = play(1);
  g.ghosts.push({ def: g.GHOST_DEFS[0], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.step();
  assert.equal(g.lives, 2, 'one life lost');
  assert.equal(g.player.x, 1, 'player reset');
  assert.equal(g.player.y, 1, 'player reset');
});

test('Q-collision 04 unpowered collision, lives=1 → gameOver, no reset', () => {
  const g = play(1);
  g.lives = 1;
  g.ghosts.push({ def: g.GHOST_DEFS[0], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.step();
  assert.equal(g.gameOver, true, 'game over at zero lives');
  assert.equal(g.lives, 0, 'lives at 0');
});

test('Q-collision 05 multiple ghosts in snapshot — all processed, no early break', () => {
  const g = play(1);
  g.player.powered = true;
  g.player.powerTimer = 300;
  // Two powered ghosts standing on the player; the collision phase iterates
  // the full snapshot (no early break), eating each.
  g.ghosts.push({ def: g.GHOST_DEFS[0], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.ghosts.push({ def: g.GHOST_DEFS[1], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.score = 10;
  g.lives = 3;
  g.step();
  assert.equal(g.score, 410, 'score += 200 per eaten ghost (no early break)');
  assert.equal(g.ghosts.length, 2, 'both respawned, length preserved');
});

test('Q-collision 06 win-check — no collectibles → gameOver; collectibles present → continue', () => {
  const g = play(1);
  // add collectibles (dots) to the otherwise-empty openBoard
  g.maze[2][2] = 2; g.maze[3][3] = 3;
  g.step();
  assert.equal(g.gameOver, false, 'collectibles present → continue');
  // Clear all collectibles.
  for (const row of g.maze) for (let i = 0; i < row.length; i++)
    if (row[i] === 2 || row[i] === 3) row[i] = 0;
  g.step();
  assert.equal(g.gameOver, true, 'no collectibles → win');
});
