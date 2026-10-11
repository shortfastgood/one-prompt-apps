'use strict';

// Q-reset — resetGame / resetPositions / respawnGhost. (Q-reset 01-04)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq, mazeInvariant, plain } = require('./harness.cjs');

test('Q-reset 01 resetGame — seeded state', () => {
  const g = game(42);
  assert.equal(g.score, 0);
  assert.equal(g.lives, 3);
  assert.equal(g.gameOver, false);
  assert.equal(g.stopped, false);
  assert.deepEqual(plain(g.queue), [], 'queue empty');
  mazeInvariant(g.maze);
  // Player shape, idle (no initial direction).
  eq(g.player, {
    x: 1, y: 1, dir: null, timer: 0, mouthOpen: true, mouthTimer: 0,
    powered: false, powerTimer: 0,
  }, 'player');
  // Six ghosts.
  assert.equal(g.ghosts.length, 6);
  // All ghosts start at their spawn pos with a canonical dir and timer 0.
  for (let i = 0; i < 6; i++) {
    assert.equal(g.ghosts[i].x, g.GHOST_DEFS[i].pos.x);
    assert.equal(g.ghosts[i].y, g.GHOST_DEFS[i].pos.y);
    assert.equal(g.ghosts[i].timer, 0);
    assert.ok(g.DIRS.includes(g.ghosts[i].dir));
  }
  // Red (type 0) released immediately; others wait on their delays.
  assert.equal(g.ghosts[0].waiting, null);
  eq([1, 2, 3, 4, 5].map((i) => g.ghosts[i].waiting), [900, 1800, 2700, 3600, 4500], 'waiting delays');
});

test('Q-reset 02 resetGame determinism — same seed → equal maze', () => {
  const a = game(7);
  const b = game(7);
  eq(a.maze, b.maze, 'maze identical for same seed');
  eq(a.player, b.player, 'player identical');
});

test('Q-reset 03 resetPositions — restores positions, retains dir/timers', () => {
  const g = game(3);
  g.step(); // move player and ghosts a bit
  const dir = g.player.dir;
  const timer = g.player.timer;
  const mouthOpen = g.player.mouthOpen;
  g.player.x = 20; g.player.y = 15;
  for (const gh of g.ghosts) { gh.x = 2; gh.y = 2; gh.timer = 7; }
  g.resetPositions();
  assert.equal(g.player.x, 1);
  assert.equal(g.player.y, 1);
  // Retained (not reset).
  assert.equal(g.player.dir, dir, 'dir retained');
  assert.equal(g.player.timer, timer, 'timer retained');
  assert.equal(g.player.mouthOpen, mouthOpen, 'mouth state retained');
  // Ghost positions restored to spawn; direction/timer retained.
  for (let i = 0; i < g.ghosts.length; i++) {
    assert.equal(g.ghosts[i].x, g.GHOST_DEFS[i].pos.x, `ghost ${i} x`);
    assert.equal(g.ghosts[i].y, g.GHOST_DEFS[i].pos.y, `ghost ${i} y`);
    assert.equal(g.ghosts[i].timer, 7, `ghost ${i} timer retained`);
  }
});

test('Q-reset 04 respawnGhost — replaces eaten ghost at slot, waiting 900, length preserved', () => {
  const g = game(5);
  const before = g.ghosts.length;
  const target = g.ghosts[2];
  const savedColor = target.def.color;
  g.respawnGhost(target);
  assert.equal(g.ghosts.length, before, 'length preserved');
  const idx = g.ghosts.findIndex((gh) => gh === target);
  assert.equal(idx, -1, 'original removed');
  const replacer = g.ghosts.find((gh) => gh.def.color === savedColor);
  assert.ok(replacer);
  assert.equal(replacer.waiting, 900, 'waiting 900');
  assert.equal(replacer.timer, 0, 'timer 0');
  assert.equal(replacer.x, g.GHOST_DEFS[2].slot.x, 'slot x');
  assert.equal(replacer.y, g.GHOST_DEFS[2].slot.y, 'slot y');
});
