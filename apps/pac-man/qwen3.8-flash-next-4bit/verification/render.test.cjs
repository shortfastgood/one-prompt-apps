'use strict';

// Q-render — drawing (Q-render 01-05).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, eq, baseBoard, openBoard } = require('./harness.cjs');

const CELL = 40;

function clean() {
  const g = game(1);
  g.maze = openBoard();
  g.maze[2][2] = 2; // keep a collectible so the win-check does not end the game
  g.gameOver = false;
  g.lives = 3;
  g.player = { x: 1, y: 1, dir: g.DIRS[0], timer: 0, mouthOpen: false, mouthTimer: 0, powered: false, powerTimer: 0 };
  g.ghosts = [];
  return g;
}

test('Q-render 01 background fill + HUD text/coordinates/font/baseline/alignment', () => {
  const g = clean();
  g.score = 12;
  g.lives = 2;
  g.render();
  const bg = g.calls.find((c) => c.method === 'fillRect' && c.args.length === 4 && c.args[2] === 1200);
  assert.ok(bg, 'background fillRect 1200x800 present');
  assert.equal(bg.color, '#000000', 'background black');

  const score = g.calls.find((c) => c.method === 'fillText' && typeof c.args[0] === 'string' && c.args[0].startsWith('Score:'));
  assert.ok(score, 'Score text present');
  assert.equal(score.args[0], 'Score: 12', 'score value');
  assert.deepEqual(score.args.slice(1), [10, 10], 'score coords (10,10)');
  assert.equal(score.font, '36px sans-serif', 'score font');
  assert.equal(score.baseline, 'top', 'score baseline top');
  assert.equal(score.align, 'left', 'score align left');
  assert.equal(score.color, '#ffffff', 'score white');

  const lives = g.calls.find((c) => c.method === 'fillText' && c.args[0].startsWith('Lives:'));
  assert.equal(lives.args[0], 'Lives: 2', 'lives value');
  assert.deepEqual(lives.args.slice(1), [1190, 10], 'lives coords (1190,10)');
  assert.equal(lives.align, 'right', 'lives align right');
});

test('Q-render 02 player closed circle vs open pie (all 4 directions)', () => {
  const g = clean();
  // Closed (mouth closed) → single arc + fill, no moveTo/lineTo/arc-range/closePath.
  g.render();
  const closedMoves = g.calls.filter((c) => c.method === 'moveTo');
  assert.equal(closedMoves.length, 0, 'no moveTo when mouth closed');
  const closedArcs = g.calls.filter((c) => c.method === 'arc');
  assert.ok(closedArcs.length >= 1, 'arc present');

  // Pie (mouth open) for each direction → moveTo, lineTo, arc(range,true), closePath.
  for (const dir of g.DIRS) {
    g.player.dir = dir;
    g.player.mouthOpen = true;
    g.calls.length = 0;
    g.render();
    const moves = g.calls.filter((c) => c.method === 'moveTo');
    assert.ok(moves.length >= 1, `moveTo for dir ${dir}`);
    const lineTo = g.calls.filter((c) => c.method === 'lineTo');
    assert.ok(lineTo.length >= 1, `lineTo for dir ${dir}`);
    const close = g.calls.filter((c) => c.method === 'closePath');
    assert.ok(close.length >= 1, `closePath for dir ${dir}`);

    // Sector angles from SECTORS must match the arc call for this direction.
    const key = dir.join(',');
    const [s, e] = g.SECTORS[key];
    const a0 = -s * Math.PI / 180, a1 = -e * Math.PI / 180;
    const cx = g.player.x * CELL + 20, cy = g.player.y * CELL + 20;
    const arc = g.calls.find((c) => c.method === 'arc' && c.args[0] === cx && c.args[1] === cy && c.args[2] === 18);
    assert.ok(arc, `arc for dir ${dir}`);
    assert.ok(Math.abs(arc.args[3] - a0) < 1e-9, `arc start ${arc.args[3]} ~= ${a0}`);
    assert.ok(Math.abs(arc.args[4] - a1) < 1e-9, `arc end ${arc.args[4]} ~= ${a1}`);
    assert.equal(arc.args[5], true, 'counterclockwise pie');
  }
});

test('Q-render 03 ghosts of all six colors + powered (blue); eyes white, pupils black', () => {
  const g = clean();
  for (let t = 0; t < 6; t++)
    g.ghosts.push({ def: g.GHOST_DEFS[t], x: 5, y: 5, dir: g.DIRS[0], timer: 0, waiting: null });
  g.render();
  // Body arc + skirt + rect + eyes present per ghost; first arc is the body.
  const rects = g.calls.filter((c) => c.method === 'fillRect' && c.args.length === 4 && c.args[2] === 36);
  assert.ok(rects.length >= 1, 'body rect present');
  const bodyArcs = g.calls.filter((c) => c.method === 'arc' && c.args[2] === 18);
  assert.ok(bodyArcs.length >= 1, 'ghost body arcs present');

  // Powered: a ghost body arc must be blue.
  g.player.powered = true;
  g.render();
  const blue = g.calls.find((c) => c.method === 'arc' && c.args[2] === 18 && c.color === '#0000ff');
  assert.ok(blue, 'powered ghost body is blue');

  // Eye whites and pupils.
  const whiteArcs = g.calls.filter((c) => c.method === 'arc' && c.color === '#ffffff');
  assert.ok(whiteArcs.length >= 1, 'eye white arcs');
  const blackArcs = g.calls.filter((c) => c.method === 'arc' && c.color === '#000000' && c.args[2] === 3);
  assert.ok(blackArcs.length >= 1, 'pupil arcs');
});

test('Q-render 04 wall/door/dot/pellet tile rendering (colors, sizes)', () => {
  const g = clean();
  // Build a small maze with exactly one of each tile type at known cells.
  const m = g.maze;
  m[2][5] = 1; // wall
  m[2][6] = 4; // door
  m[2][7] = 2; // dot
  m[2][8] = 3; // pellet
  g.maze = m;
  g.render();

  // Wall: fillRect x,y,CELL,CELL color #0000ff
  const wall = g.calls.find((c) => c.method === 'fillRect' && c.color === '#0000ff' && c.args[0] === 5 * CELL && c.args[1] === 2 * CELL && c.args[2] === CELL && c.args[3] === CELL);
  assert.ok(wall, 'wall fillRect present');

  // Door: black base then pink bar (height 8) at py+16.
  const doorPink = g.calls.find((c) => c.method === 'fillRect' && c.color === '#ffb8de' && c.args[0] === 6 * CELL && c.args[1] === 2 * CELL + 16 && c.args[2] === CELL && c.args[3] === 8);
  assert.ok(doorPink, 'door pink bar');

  // Dot: black base then white 4x4 at px+18,py+18.
  const dotWhite = g.calls.find((c) => c.method === 'fillRect' && c.color === '#ffffff' && c.args[0] === 7 * CELL + 18 && c.args[1] === 2 * CELL + 18 && c.args[2] === 4 && c.args[3] === 4);
  assert.ok(dotWhite, 'dot 4x4 white');

  // Pellet: black base then white circle r8.
  const pellet = g.calls.find((c) => c.method === 'arc' && c.color === '#ffffff' && c.args[0] === 8 * CELL + 20 && c.args[1] === 2 * CELL + 20 && c.args[2] === 8);
  assert.ok(pellet, 'pellet circle');
});

test('Q-render 05 gameOver HUD win (yellow) vs loss (red) at (300,400)', () => {
  const g = clean();
  g.gameOver = true;
  // Loss: lives <= 0 → red.
  g.lives = 0;
  g.render();
  const loss = g.calls.find((c) => c.method === 'fillText' && c.args[0] === 'Game Over! Press SPACE to restart');
  assert.ok(loss, 'loss text present');
  assert.equal(loss.color, '#ff0000', 'loss red');
  assert.deepEqual(loss.args.slice(1), [300, 400], 'loss at (300,400)');

  // Win: lives > 0 → yellow.
  g.raf.length = 0;
  g.lives = 2;
  g.render();
  const win = g.calls.find((c) => c.method === 'fillText' && c.args[0] === 'You Win! Press SPACE to restart');
  assert.ok(win, 'win text present');
  assert.equal(win.color, '#ffff00', 'win yellow');
  assert.deepEqual(win.args.slice(1), [300, 400], 'win at (300,400)');
});

test('Q-render 06 player with no dir — full circle, no pie moveTo/lineTo', () => {
  // drawPlayer's `player.dir ? ... : null` ternary: when dir is null the key is
  // falsy so the closed-circle arc branch runs and no pie arc/moveTo/lineTo.
  const g = clean();
  g.player.dir = null;
  g.player.mouthOpen = true; // force the branch to matter — mouth open still means circle
  g.calls.length = 0;
  g.drawPlayer();
  const closedArcs = g.calls.filter((c) => c.method === 'arc' && c.args[0] === 60 && c.args[1] === 60 && c.args[2] === 18 && c.args[4] === 2 * Math.PI);
  assert.equal(closedArcs.length, 1, 'one full-circle arc');
  assert.equal(g.calls.filter((c) => c.method === 'moveTo').length, 0, 'no moveTo for null dir');
  assert.equal(g.calls.filter((c) => c.method === 'lineTo').length, 0, 'no lineTo for null dir');
});
