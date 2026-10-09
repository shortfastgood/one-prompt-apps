const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, arena, board, ghost, state, eq, html } = require('./harness.cjs');
const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', ' ', 'Escape', 'KeyA'];
const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

test('E01 keydown filtering and default prevention', () => {
  const g = arena(game()), before = state(g);
  for (const key of keys) {
    // Arrows and Space are default-suppressed; Escape and other keys are not.
    assert.equal(g.emit('keydown', key), key.startsWith('Arrow') || key === ' ');
  }
  eq(g.queue, [
    { type: 'steer', dir: g.DIRS[0] }, { type: 'steer', dir: g.DIRS[1] }, { type: 'steer', dir: g.DIRS[2] }, { type: 'steer', dir: g.DIRS[3] },
    { type: 'space' }, { type: 'escape' },
  ]); // KeyA never queues
  eq(state(g), before); // queuing never moves immediately
});
test('E02 repeated and post-Escape presses are rejected, default suppression still applies', () => {
  for (const mode of ['repeat', 'escaped']) for (const key of keys) {
    const g = arena(game());
    if (mode === 'escaped') g.escaped = true;
    assert.equal(g.emit('keydown', key, { repeat: mode === 'repeat' }), key.startsWith('Arrow') || key === ' ');
    eq(g.queue, []);
  }
  // This handler does not check document.hidden: queued input is instead CLEARED on blur or
  // visibility loss (E05), and a hidden window also blurs. The spec requires that clearing.
});
test('E03 no keyup handler is registered; default suppression happens on keydown', () => {
  const g = arena(game());
  // This implementation registers keydown, blur, and visibilitychange only; keyup has no
  // default action to suppress for these keys, and the spec requires no keyup behavior.
  assert.equal(g.listeners.window.keyup, undefined);
  const before = state(g);
  assert.equal(g.emit('keydown', 'ArrowRight'), true); // suppression lives on keydown
  eq(g.queue, [{ type: 'steer', dir: g.DIRS[0] }]);
  eq(state(g), before);
});
test('E04 E05 blur and visibility changes clear pending input and timing', () => {
  const g = arena(game());
  for (const queued of [[], [{ type: 'steer', dir: g.DIRS[0] }]]) {
    g.queue = queued.slice(); g.clearInput(); eq(g.queue, []);
    g.queue = queued.slice(); g.emit('blur'); eq(g.queue, []);
    g.tick(); assert.equal(g.player.x, 5); // a discarded steer never executes later
  }
  for (const hidden of [true, false]) {
    g.document.hidden = hidden; g.performanceNow(1234);
    g.queue = [{ type: 'steer', dir: g.DIRS[0] }]; g.last = 100; g.acc = 5;
    g.emit('visibilitychange');
    eq(g.queue, []); // both transitions clear queued input
    if (hidden) eq([g.last, g.acc], [100, 5]); // hidden: input only
    else eq([g.last, g.acc], [1234, 0]); // visible: clock re-anchored, accumulator reset
  }
});
test('E06 repeated held arrow cannot start movement after restart', () => {
  const g = arena(game()); g.gameOver = true; g.random(() => .5);
  g.emit('keydown', ' '); // the spacebar reports key " " (as in E01/E02)
  g.emit('keydown', 'ArrowRight', { repeat: true });
  g.tick(); // restarts, but the repeat never steers
  assert.equal(g.gameOver, false); assert.equal(g.player.dir, null); assert.equal(g.player.x, 1);
  g.emit('keydown', 'ArrowRight'); // release + fresh press is a new keydown
  g.tick();
  assert.equal(g.player.x, 2); assert.deepEqual(g.player.dir, g.DIRS[0]);
});
test('E07 F01 F06 after Escape the simulation and input stop; frames keep the last board visible', () => {
  const g = arena(game());
  g.last = 0; g.acc = 0; g.queue = [{ type: 'escape' }];
  g.frame(1000 / 60); // one tick processes the Escape
  assert.equal(g.escaped, true);
  assert.equal(g.player.mouthTimer, 0); // no active simulation after the stop
  const before = state(g);
  g.emit('keydown', ' '); g.emit('keydown', 'ArrowRight');
  eq(g.queue, []); // input is ignored from now on
  g.frame(2 * 1000 / 60); // a later frame with pending steps: ticks no-op, board redrawn
  eq(state(g), before); // still frozen; the unchanged render keeps the last frame visible
  assert.equal(g.emit('keydown', 'Escape'), false);
});
test('F02 F03 frame accumulator boundaries and scheduling', () => {
  const step = 1000 / 60;
  for (const [dt, ticks] of [[5, 0], [step, 1], [3 * step + 5, 3], [step - 1e-6, 0], [step + 1e-6, 1], [2 * step - 1e-6, 1], [2 * step + 1e-6, 2]]) {
    const g = arena(game());
    g.calls.length = 0; g.raf.length = 0;
    g.last = 0; g.acc = 0; g.performanceNow(0);
    g.frame(dt);
    assert.equal(g.player.mouthTimer, ticks); // one mouth increment per active tick
    assert.ok(Math.abs(g.acc - (dt - ticks * step)) < 1e-9); // remainder retained
    assert.equal(g.raf.length, 1); // exactly one frame scheduled
    assert.equal(g.calls.filter(c => c.method === 'fillRect' && c.args[2] === 1200).length, 1); // exactly one background fill
  }
});
test('F04 equal simulated durations at 30/60/120/144 Hz give the same simulation', () => {
  const measure = (g, frames) => {
    // Count ticks by the mouth timer (it increments once per active tick, wrapping at 10).
    let prevOpen = g.player.mouthOpen, prevTimer = g.player.mouthTimer, ticks = 0;
    const frame = g.raf[0];
    for (const now of frames) {
      frame(now);
      const open = g.player.mouthOpen;
      ticks += open !== prevOpen ? 10 - prevTimer + g.player.mouthTimer : g.player.mouthTimer - prevTimer; // a toggle can be crossed mid-frame
      prevOpen = open; prevTimer = g.player.mouthTimer;
    }
    return ticks;
  };
  // One second at each rate: the strict comparison has no explicit tolerance, so IEEE-754
  // accumulation of the quantized deltas can land one step short of 60; it never runs ahead.
  for (const hz of [30, 60, 120, 144]) {
    const g = arena(game());
    g.last = 0; g.acc = 0; g.performanceNow(0);
    g.frame(0); // establish the first timestamp
    const ticks = measure(g, Array.from({ length: hz }, (_, i) => (i + 1) * (1000 / hz)));
    assert.ok(ticks <= 60, `${hz}Hz produced ${ticks} ticks in 1s: gameplay would accelerate`);
    assert.ok(ticks >= 59, `${hz}Hz produced ${ticks} ticks in 1s`);
  }
  // Ten seconds: every rate converges to the same tick count and the same gameplay state.
  let expected;
  for (const hz of [30, 60, 120, 144]) {
    const g = arena(game());
    g.player.dir = g.DIRS[0]; g.player.powered = true; g.player.powerTimer = 300;
    g.last = 0; g.acc = 0; g.performanceNow(0);
    g.frame(0);
    const ticks = measure(g, Array.from({ length: 10 * hz }, (_, i) => (i + 1) * (1000 / hz)));
    assert.ok(ticks >= 598 && ticks <= 600, `${hz}Hz produced ${ticks} ticks in 10s`);
    if (expected) eq(state(g), expected); else expected = state(g);
  }
});
test('F05 long gaps, backwards timestamps, and visibility return never fast-forward', () => {
  const g = arena(game());
  g.last = 0; g.acc = 7;
  g.frame(10000); // dt > 250: the guard discards the gap
  eq([g.acc, g.player.mouthTimer], [0, 0]);
  g.last = 0; g.acc = 5;
  g.frame(250); // dt exactly 250 is not a long gap: it accumulates (15 ticks)
  assert.equal(g.player.mouthTimer, 5);
  g.last = 0; g.acc = 5;
  g.frame(251); // one past the boundary: discarded
  assert.equal(g.acc, 0);
  g.last = 100; g.acc = 5;
  g.frame(50); // a backwards timestamp is clamped to zero, not subtracted
  assert.equal(g.acc, 5);
  const h = arena(game()); // fresh state for the visibility assertion
  h.last = 10; h.acc = 7; h.document.hidden = true;
  h.performanceNow(9999);
  h.emit('visibilitychange'); // hidden: clears input only
  eq([h.last, h.acc], [10, 7]);
  h.document.hidden = false;
  h.performanceNow(20000);
  h.emit('visibilitychange'); // visible: re-anchors the clock and resets the accumulator
  eq([h.last, h.acc], [20000, 0]);
  h.frame(20000 + 1000 / 60); // one step after the re-anchored clock
  assert.equal(h.player.mouthTimer, 1); // no burst of ticks for the hidden interval
});
test('F07 terminal frames continue drawing and scheduling while the simulation freezes', () => {
  const g = arena(game()); g.gameOver = true;
  const before = state(g);
  g.calls.length = 0; g.raf.length = 0;
  g.last = 0; g.acc = 0;
  g.frame(1000); // a long dt after the ending: the gap guard plus the terminal check keep it frozen
  eq(state(g), before);
  assert.equal(g.raf.length, 1); // still scheduled
  assert.equal(g.calls.filter(c => c.method === 'fillText').length, 3); // board and terminal message drawn
});
test('D01 circle emits a filled full arc with the effective style', () => {
  const g = game(); g.calls.length = 0;
  g.ctx.fillStyle = '#123456';
  g.circle(10, 20, 6); // color comes from the active fill style
  eq(g.calls.map(c => [c.method, c.args, c.color]), [
    ['beginPath', [], '#123456'],
    ['arc', [10, 20, 6, 0, Math.PI * 2], '#123456'],
    ['fill', [], '#123456'],
  ]);
});
test('D02 D07 maze primitives, draw order and immutable game state', () => {
  const g = arena(game());
  g.maze = board();
  g.maze[2][2] = 1; g.maze[2][3] = 2; g.maze[2][4] = 3; g.maze[8][14] = 4;
  g.player.x = 2; g.player.y = 2; g.player.mouthOpen = false;
  g.ghosts = [ghost(g, 0, 2, 2), ghost(g, 1, 2, 2)]; // overlapping entities, on a wall cell
  const before = state(g);
  g.calls.length = 0;
  g.render();
  eq(state(g), before); // drawing mutates no gameplay state
  const find = (method, args, color) => g.calls.findIndex(c => c.method === method && JSON.stringify(c.args) === JSON.stringify(args) && c.color === color);
  assert.equal(find('fillRect', [0, 0, 1200, 800], '#000000'), 0); // black background first
  const wall = find('fillRect', [80, 80, 40, 40], '#0000ff');
  assert.ok(wall > 0);
  assert.ok(find('fillRect', [138, 98, 4, 4], '#ffffff') > 0); // dot 4x4 at +18,+18 of cell (3,2)
  assert.ok(find('arc', [180, 100, 8, 0, Math.PI * 2], '#ffffff') > 0); // pellet r8 at +20,+20
  assert.ok(find('fillRect', [560, 336, 40, 8], '#ffb8de') > 0); // door bar at y+16
  assert.equal(find('fillRect', [240, 80, 40, 40], '#000000'), -1); // floor draws nothing
  const player = find('arc', [100, 100, 18, 0, Math.PI * 2], '#ffff00');
  const red = find('arc', [100, 100, 18, 0, Math.PI * 2], '#ff0000');
  const pink = find('arc', [100, 100, 18, 0, Math.PI * 2], '#ffc0cb');
  assert.ok(wall < player && player < red && red < pink); // background, maze, player, ghosts in order
  assert.ok(g.calls.findIndex(c => c.method === 'fillText') > pink); // HUD last
});
test('D03 player mouth sectors and closed circle in every direction, including the initial null facing', () => {
  for (const powered of [false, true]) for (const open of [false, true]) for (const dir of [...dirs, null]) {
    const g = arena(game());
    g.player.dir = dir; g.player.mouthOpen = open; g.player.powered = powered;
    g.player.x = 2; g.player.y = 2;
    g.calls.length = 0;
    g.drawPlayer();
    const arcs = g.calls.filter(c => c.method === 'arc' && c.color === '#ffff00');
    assert.equal(arcs.length, 1);
    const [start, end] = dir === null || dir[0] === 1 ? [30, 330] : dir[0] === -1 ? [150, 210] : dir[1] === -1 ? [60, 120] : [240, 300];
    eq(arcs[0].args, open ? [100, 100, 18, -start * Math.PI / 180, -end * Math.PI / 180, true] : [100, 100, 18, 0, Math.PI * 2]);
    const path = g.calls.filter(c => c.color === '#ffff00').map(c => c.method);
    eq(path, open ? ['beginPath', 'moveTo', 'arc', 'closePath', 'fill'] : ['beginPath', 'arc', 'fill']);
  }
});
test('D04 D05 ghost geometry, colors and negative pupil floor offsets', () => {
  for (const powered of [false, true]) for (let def = 0; def < 6; def++) for (const [dx, dy] of dirs) {
    const g = arena(game());
    g.player.powered = powered;
    const a = ghost(g, def, 2, 2); a.dx = dx; a.dy = dy;
    g.ghosts = [a];
    g.calls.length = 0;
    g.drawGhost(a);
    const color = powered ? '#0000ff' : a.color;
    eq(g.calls.filter(c => c.method === 'arc' && c.color === color).map(c => c.args), [
      [100, 100, 18, 0, Math.PI * 2], [91, 118, 6, 0, Math.PI * 2], [100, 118, 6, 0, Math.PI * 2], [109, 118, 6, 0, Math.PI * 2],
    ]);
    assert.ok(g.calls.some(c => c.method === 'fillRect' && c.color === color && JSON.stringify(c.args) === '[82,100,36,18]'));
    eq(g.calls.filter(c => c.method === 'arc' && c.color === '#ffffff').map(c => c.args), [[94, 94, 6, 0, Math.PI * 2], [106, 94, 6, 0, Math.PI * 2]]);
    const ox = Math.floor(dx * 3 / 2), oy = Math.floor(dy * 3 / 2); // Python floor division, including negatives
    eq(g.calls.filter(c => c.method === 'arc' && c.color === '#000000').map(c => c.args), [[94 + ox, 94 + oy, 3, 0, Math.PI * 2], [106 + ox, 94 + oy, 3, 0, Math.PI * 2]]);
  }
});
test('D06 HUD and terminal messages, styles and repeated drawing', () => {
  for (const [over, lives] of [[false, 3], [true, 3], [true, 0], [true, -2]]) {
    const g = arena(game()); g.score = 123; g.lives = lives; g.gameOver = over;
    for (let n = 0; n < 2; n++) {
      g.calls.length = 0;
      g.drawText();
      const texts = g.calls.filter(c => c.method === 'fillText');
      assert.equal(texts.length, over ? 3 : 2);
      eq(texts[0].args, ['Score: 123', 10, 10]);
      eq(texts[1].args, [`Lives: ${lives}`, 1190, 10]);
      eq(texts.slice(0, 2).map(c => [c.color, c.align, c.font, c.baseline]), [
        ['#ffffff', 'left', '36px sans-serif', 'top'], ['#ffffff', 'right', '36px sans-serif', 'top'],
      ]);
      if (over) {
        eq(texts[2].args, [lives <= 0 ? 'Game Over! Press SPACE to restart' : 'You Win! Press SPACE to restart', 300, 400]);
        assert.equal(texts[2].color, lives <= 0 ? '#ff0000' : '#ffff00');
        assert.equal(texts[2].align, 'left'); // repeated draws restore left alignment
      }
    }
  }
});
test('D09 startup initializes state, requests one frame, and registers the browser entry points', () => {
  const g = game(); // script startup already ran
  eq([g.score, g.lives, g.player.x, g.player.y, g.player.dir, g.gameOver, g.escaped], [0, 3, 1, 1, null, false, false]);
  assert.equal(g.ghosts.length, 6);
  assert.equal(g.raf.length, 1);
  assert.equal(g.raf[0], g.frame);
  eq(Object.keys(g.listeners.window), ['keydown', 'blur']);
  eq(Object.keys(g.listeners.document), ['visibilitychange']);
  assert.equal(g.last, 0); assert.equal(g.acc, 0); // performance.now() was 0 at load
  // This implementation defers the first paint to the first RAF callback rather than drawing synchronously.
  g.calls.length = 0;
  g.frame(16); // 16ms < one step: no tick, but the board is drawn
  assert.equal(g.player.mouthTimer, 0);
  assert.equal(g.calls.filter(c => c.method === 'fillRect' && c.args[2] === 1200).length, 1);
  g.calls.length = 0;
  g.frame(16 + 1000 / 60); // exactly one step: one tick, one draw
  assert.equal(g.player.mouthTimer, 1);
  assert.equal(g.calls.filter(c => c.method === 'fillRect' && c.args[2] === 1200).length, 1);
});
test('D08 static offline prerequisites (real browser check is separate)', () => {
  assert.match(html, /<title>Pac-Man<\/title>/);
  assert.match(html, /<canvas id="game" width="1200" height="800">/);
  assert.match(html, /width: min\(1200px, 100vw, 150vh\)/); // proportional viewport scaling, never above the intrinsic 1200px
  assert.match(html, /background: #000/); // black page
  assert.doesNotMatch(html, /<(?:script|img|link|audio|video|source)[^>]+(?:src|href)=/i); // no external resources
});
