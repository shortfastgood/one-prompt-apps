'use strict';

// Q-maze — genMaze / fixConnectivity / connectivity invariants. (Q-maze 01-05)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq, mazeInvariant, allFloorReached, reach, baseBoard, openBoard } = require('./harness.cjs');

test('Q-maze 01 several seeds — mazeInvariant each', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const g = game(seed);
    mazeInvariant(g.maze);
    assert.ok(allFloorReached(g.maze), `all floor reachable seed ${seed}`);
  }
});

test('Q-maze 02 constant RNG 0.5 — every non-ring interior floor becomes a dot', () => {
  const g = game(1);
  g.setRandom(() => 0.5);
  g.resetGame();
  mazeInvariant(g.maze);
  // Cell (1,1) is always forced to 0 (spawn corner) by genMaze; skip it.
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 30; x++) {
      const c = g.maze[y][x];
      if (x === 0 || x === 29 || y === 0 || y === 19) continue;
      if (x === 1 && y === 1) continue; // forced spawn corner
      const house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
      if (house) continue;
      const ring = x >= 10 && x <= 19 && y >= 7 && y <= 12;
      if (!ring) assert.equal(c, 2, `interior ${x},${y}`);
      else assert.ok(c === 2 || c === 3, `ring ${x},${y}`);
    }
});

test('Q-maze 03 disconnected board — allFloorReached false pre-repair, mazeInvariant post', () => {
  // Build a maze with an isolated non-house floor cell, well clear of the
  // spawn corner (1,1).
  const m = openBoard();
  // Ring the cell (3,3) with walls on its 4 cardinal neighbours so it is cut
  // off from the reachable flood (1,1) before fixConnectivity runs.
  m[2][3] = 1; // up
  m[4][3] = 1; // down
  m[3][2] = 1; // left
  m[3][4] = 1; // right
  m[3][3] = 0; // still floor (enclosed)
  assert.ok(!allFloorReached(m), 'enclosed cell unreachable before repair');
  // fixConnectivity must repair it (carve a path, turning carved walls to dots).
  g_fix(m);
  mazeInvariant(m);
  assert.ok(allFloorReached(m), 'repaired maze fully reachable');
});

// Wrapper to call the internal fixConnectivity via a fresh game's maze.
function g_fix(m) {
  const g = game(99);
  g.maze = m;
  g.fixConnectivity(m);
}

test('Q-maze 04 fixConnectivity on a connected maze — maze unchanged', () => {
  const g = game(1);
  g.setRandom(() => 0.3);
  g.resetGame();
  const m = g.maze;
  mazeInvariant(m);
  assert.ok(allFloorReached(m), 'connected baseline');
  const before = JSON.stringify(m);
  g.fixConnectivity(m);
  eq(m, JSON.parse(before), 'maze unchanged on a fully-connected maze');
});

test('Q-maze 05 reach on a hand-built maze — independent traversal matches', () => {
  const m = baseBoard(0);
  const r = reach(m);
  const expected = new Set();
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 30; x++)
      if (x === 0 || x === 29 || y === 0 || y === 19) continue; // border is wall
      else if (x >= 11 && x <= 18 && y >= 8 && y <= 11) continue; // house is walls/floor-only interior
      else expected.add(`${x},${y}`);
  // spawn corner is floor (walkable)
  expected.add('1,1');
  // Reach does not include border walls or house walls.
  for (const k of expected) assert.ok(r.has(k), `expected reachable ${k}`);
  assert.ok(r.has('1,1'));
  assert.ok(!r.has('0,0')); // wall
});

test('Q-maze 06 bfsPath fallback returns [] when no reached cell is reachable', () => {
  // bfsPath's terminal `return []` only fires when BFS from `start` never
  // encounters a cell in `reached`. That cannot happen via fixConnectivity
  // (which always seeds `reached` with the spawn), so exercise bfsPath directly
  // with an empty reachable set to cover the fallback path.
  const g = game(1);
  const m = openBoard();
  const path = g.bfsPath(m, { x: 1, y: 1 }, new Set());
  eq(path, [], 'no reachable cell -> empty path');
});

test('Q-maze 07 floodFill OOB guard — a walkable border cell is traversed and its out-of-bounds neighbour is skipped', () => {
  // Through normal play every border cell is a wall and is dropped by
  // `blocked()`, so floodFill never steps onto a border and the OOB guard
  // below (now `continue`) is dead code. Here we make one top-edge border
  // cell walkable so traversal reaches it; its neighbour (-1, 1) then trips
  // the guard. We verify the border cell itself was reached.
  const g = game(1);
  const m = baseBoard(2);
  m[0][1] = 0; // open the top border at column 1 so (1,1) reaches the edge
  const seen = g.floodFill(m);
  eq(seen.has(1), true, 'border cell (x=1,y=0) reached; its neighbour (1,-1) trips the OOB guard');
});
