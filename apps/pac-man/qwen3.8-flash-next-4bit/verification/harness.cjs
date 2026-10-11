'use strict';

// Verification harness for the qwen3.8-flash-next-4bit Pac-Man app.
//
// Extracts the inline <script> from ../index.html verbatim, writes it to
// game.generated.js (the coverage target — never edited by hand), and evaluates
// it in an isolated node:vm context with a mocked DOM / canvas / rAF / RNG.
// Everything here is test-only infrastructure and is excluded from coverage.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const HTML = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const SOURCE = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
const FILENAME = path.join(__dirname, 'game.generated.js');
fs.writeFileSync(FILENAME, SOURCE);
const SCRIPT = new vm.Script(SOURCE, { filename: FILENAME });

const COLS = 30, ROWS = 20;

const plain = (v) => JSON.parse(JSON.stringify(v));

const eq = (actual, expected, message) =>
  assert.deepEqual(plain(actual), plain(expected), message);

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} ~= ${b} (tol ${tol})`);

function blocked(v) {
  return v === 1 || v === 4;
}

// Independent exterior reachability from the player spawn (1,1) over walkable cells.
function reach(maze) {
  const seen = new Set();
  const stack = [[1, 1]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    if (blocked(maze[y][x])) continue;
    seen.add(key);
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return seen;
}

// All non-house floor cells reachable from spawn.
function allFloorReached(maze) {
  const r = reach(maze);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const c = maze[y][x];
      if (c !== 0) continue;
      const house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
      if (house) continue; // house interior floor is enclosed; not part of "reachable"
      if (!r.has(`${x},${y}`)) return false;
    }
  return true;
}

// Structural invariant shared by every maze this app can produce.
function mazeInvariant(maze) {
  assert.equal(maze.length, ROWS, 'maze rows');
  for (let y = 0; y < ROWS; y++) {
    assert.equal(maze[y].length, COLS, `row ${y} cols`);
    for (let x = 0; x < COLS; x++) {
      const c = maze[y][x];
      assert.ok([0, 1, 2, 3, 4].includes(c), `cell ${x},${y} value ${c}`);
      if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1)
        assert.equal(c, 1, `border ${x},${y}`);
    }
  }
  // Ghost house: all walls, interior floor, two door cells at row 8 cols 14/15.
  for (let y = 8; y <= 11; y++)
    for (let x = 11; x <= 18; x++) {
      if (y === 8 && (x === 14 || x === 15))
        assert.equal(maze[y][x], 4, `door ${x},${y}`);
      else if (x >= 12 && x <= 17 && y >= 9 && y <= 10)
        assert.equal(maze[y][x], 0, `house floor ${x},${y}`);
      else
        assert.equal(maze[y][x], 1, `house wall ${x},${y}`);
    }
  assert.equal(maze[1][1], 0, 'spawn corner empty');
  const r = reach(maze);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const c = maze[y][x];
      if (c === 2 || c === 3) assert.ok(r.has(`${x},${y}`), `unreachable collectible ${x},${y}`);
    }
  assert.ok(r.has('14,7') && r.has('15,7'), 'ghost exit reachable');
}

// A fully-open maze: all interior floor outside the house. Guaranteed connected.
function openBoard() {
  const m = baseBoard(0);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) continue;
      if (x >= 11 && x <= 18 && y >= 8 && y <= 11) continue;
      m[y][x] = 0;
    }
  return m;
}

// A fixed maze grid: boundary walls, ghost house, everything else = `fill`.
function baseBoard(fill = 2) {
  const m = Array.from({ length: ROWS }, () => Array(COLS).fill(fill));
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) { m[y][x] = 1; continue; }
      if (x >= 11 && x <= 18 && y >= 8 && y <= 11) {
        if (y === 8 && (x === 14 || x === 15)) m[y][x] = 4;
        else if (x >= 12 && x <= 17 && y >= 9 && y <= 10) m[y][x] = 0;
        else m[y][x] = 1;
      }
    }
  m[1][1] = 0;
  return m;
}

// Push a ghost into the given game's ghost array (fixture helper).
function ghost(g, type = 0, x = 5, y = 5, dir = 0, waiting = null) {
  const created = {
    def: g.GHOST_DEFS[type],
    x, y,
    dir,
    timer: 0,
    waiting,
  };
  g.ghosts.push(created);
  return created;
}

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// RECORD_METHODS must cover every canvas call the game makes.
const RECORD_METHODS = ['beginPath', 'arc', 'fill', 'fillRect', 'moveTo', 'lineTo', 'closePath', 'fillText'];

function game(seed = 1) {
  let random = seeded(seed);
  const calls = [];
  const raf = [];
  const listeners = { window: {}, document: {} };
  const ctx = { fillStyle: '#000000', textAlign: 'left', textBaseline: 'top' };
  for (const method of RECORD_METHODS) {
    ctx[method] = (...args) => calls.push({
      method, args,
      color: ctx.fillStyle, align: ctx.textAlign, font: ctx.font, baseline: ctx.textBaseline,
    });
  }
  const canvas = {
    width: 1200, height: 800,
    getContext: (kind) => { assert.equal(kind, '2d', 'getContext(2d)'); return ctx; },
  };
  const window = { addEventListener: (name, fn) => { listeners.window[name] = fn; } };
  const document = {
    hidden: false,
    getElementById: (id) => { assert.equal(id, 'game', 'getElementById(game)'); return canvas; },
    addEventListener: (name, fn) => { listeners.document[name] = fn; },
  };
  const math = Object.create(Math);
  math.random = () => random();
  let clock = 0;
  const performance = { now: () => clock };

  const context = vm.createContext({
    window, document, Math: math,
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
    performance,
  });

  SCRIPT.runInContext(context, { timeout: 2000 });

  // Bridge over top-level bindings (closure over the VM's lexical scope).
  const STATE = ['maze', 'player', 'ghosts', 'score', 'lives', 'gameOver', 'stopped', 'queue', 'acc', 'last'];
  const CONSTS = ['COLS', 'ROWS', 'CELL', 'DIRS', 'SECTORS', 'GHOST_DEFS'];
  const FUNCS = ['step', 'resetGame', 'resetPositions', 'respawnGhost', 'render', 'drawPlayer', 'drawGhost', 'frame', 'inHouse', 'inRing', 'blocked', 'genMaze', 'fixConnectivity', 'bfsPath', 'floodFill'];
  const access = [...STATE, ...CONSTS, ...FUNCS]
    .map((n) => `get ${n}(){return ${n}},set ${n}(v){${n}=v}`)
    .join(',');
  const api = vm.runInContext(`({${access}})`, context);

  Object.assign(api, {
    calls, raf, ctx,
    document, listeners,
    setRandom: (fn) => { random = fn; },
    setSeed: (s) => { random = seeded(s); },
    setClock: (t) => { clock = t; },
    setHidden: (h) => { document.hidden = h; },
    emit(name, code, extra = {}) {
      let prevented = false;
      const event = { key: code, code, repeat: false, preventDefault() { prevented = true; }, ...extra };
      (listeners.window[name] || listeners.document[name])(event);
      return prevented;
    },
    run: (code) => vm.runInContext(code, context, { timeout: 2000 }),
  });

  return api;
}

module.exports = {
  game, plain, eq, near,
  ghost, baseBoard, openBoard, reach, mazeInvariant, allFloorReached,
};
