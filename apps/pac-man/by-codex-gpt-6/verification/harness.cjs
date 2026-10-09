const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const filename = path.join(__dirname, 'game.generated.js');
// Exact extracted source, so Node can attribute coverage without instrumenting the game.
fs.writeFileSync(filename, source);
const script = new vm.Script(source, { filename });
const plain = value => JSON.parse(JSON.stringify(value));
const eq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function game(seed = 1) {
  let random = seeded(seed);
  const calls = [], raf = [], listeners = { window: {}, document: {} };
  const ctx = { fillStyle: '#000000', textAlign: 'left' };
  for (const method of ['beginPath', 'arc', 'fill', 'fillRect', 'moveTo', 'closePath', 'fillText']) {
    ctx[method] = (...args) => calls.push({ method, args, color: ctx.fillStyle, align: ctx.textAlign, font: ctx.font, baseline: ctx.textBaseline });
  }
  const canvas = { width: 1200, height: 800, getContext: kind => { assert.equal(kind, '2d'); return ctx; } };
  const window = { addEventListener: (name, fn) => { listeners.window[name] = fn; } };
  const document = { hidden: false, getElementById: id => { assert.equal(id, 'game'); return canvas; }, addEventListener: (name, fn) => { listeners.document[name] = fn; } };
  const math = Object.create(Math);
  math.random = () => random();
  const context = vm.createContext({ window, document, Math: math, requestAnimationFrame: fn => { raf.push(fn); return raf.length; } });
  script.runInContext(context, { timeout: 2000 });
  const names = ['events', 'maze', 'player', 'ghosts', 'score', 'lives', 'gameOver', 'stopped', 'previous', 'accumulator'];
  const access = names.map(n => `get ${n}(){return ${n}},set ${n}(v){${n}=v}`).join(',');
  const api = vm.runInContext(`({${access},directions,ghostTypes,step,choose,inHouse,inRing,placeGhost,makeGhost,reset,connectMaze,valid,movePlayer,steer,autoMove,moveGhost,tick,circle,draw,clearInput,frame})`, context);
  Object.assign(api, { calls, raf, ctx, document, listeners, random: fn => { random = fn; }, emit(name, code, extra = {}) {
    let prevented = false;
    const event = { code, repeat: false, preventDefault() { prevented = true; }, ...extra };
    (listeners.window[name] || listeners.document[name])(event);
    return prevented;
  }, run(code) { return vm.runInContext(code, context, { timeout: 2000 }); } });
  return api;
}
function board(fill = 0) {
  return Array.from({ length: 20 }, (_, y) => Array.from({ length: 30 }, (_, x) => {
    if (!x || x === 29 || !y || y === 19) return 1;
    if (x >= 11 && x <= 18 && y >= 8 && y <= 11) {
      if (y === 8 && (x === 14 || x === 15)) return 4;
      return x >= 12 && x <= 17 && y >= 9 && y <= 10 ? 0 : 1;
    }
    return fill;
  }));
}
function arena(g) {
  g.maze = board(); g.maze[18][28] = 2;
  Object.assign(g.player, { x: 5, y: 5, heading: null, direction: g.directions[0], moveTimer: 0, mouthTimer: 0, mouthOpen: true, powered: false, powerTimer: 0 });
  g.ghosts = []; g.score = 0; g.lives = 3; g.gameOver = false; g.events = [];
  return g;
}
function ghost(g, type = 0, x = 5, y = 5) {
  return Object.assign(g.makeGhost(g.ghostTypes[type], true), { x, y, waiting: null, moveTimer: 0, direction: g.directions[0] });
}
function state(g) { return plain({ player: g.player, ghosts: g.ghosts, maze: g.maze, score: g.score, lives: g.lives, gameOver: g.gameOver }); }
function mazeInvariant(maze) {
  assert.equal(maze.length, 20); assert.equal(new Set(maze).size, 20);
  const reached = new Set(), todo = [[1, 1]];
  while (todo.length) {
    const [x, y] = todo.pop(), key = `${x},${y}`;
    if (reached.has(key) || ![0, 2, 3].includes(maze[y]?.[x])) continue;
    reached.add(key); todo.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  for (let y = 0; y < 20; y++) {
    assert.equal(maze[y].length, 30);
    for (let x = 0; x < 30; x++) {
      const c = maze[y][x], house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
      assert.ok([0, 1, 2, 3, 4].includes(c));
      if (!x || x === 29 || !y || y === 19) assert.equal(c, 1);
      else if (house) {
        const expected = y === 8 && [14, 15].includes(x) ? 4 : y >= 9 && y <= 10 && x >= 12 && x <= 17 ? 0 : 1;
        assert.equal(c, expected, `house ${x},${y}`); assert.ok(!reached.has(`${x},${y}`));
      } else {
        if ([0, 2, 3].includes(c)) assert.ok(reached.has(`${x},${y}`), `unreachable ${x},${y}`);
        if (x >= 10 && x <= 19 && y >= 7 && y <= 12) assert.ok([2, 3].includes(c));
      }
    }
  }
  assert.equal(maze[1][1], 0);
  assert.ok(reached.has('14,7') && reached.has('15,7'));
}
module.exports = { game, arena, board, ghost, state, eq, plain, seeded, mazeInvariant, html };
