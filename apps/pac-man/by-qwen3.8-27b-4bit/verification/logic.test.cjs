const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, arena, board, ghost, state, eq, plain, seeded, mazeInvariant } = require('./harness.cjs');
// The full mazeInvariant (ring collectibles, fixed boundary) applies to generated mazes.
// A handcrafted board only needs the connectivity guarantee: every floor cell reachable from the spawn.
function allFloorReached(maze) {
  const reached = new Set(), todo = [[1, 1]];
  while (todo.length) {
    const [x, y] = todo.pop(), key = `${x},${y}`;
    if (reached.has(key) || ![0, 2, 3].includes(maze[y]?.[x])) continue;
    reached.add(key); todo.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
    const house = x >= 11 && x <= 18 && y >= 8 && y <= 11; // house interior is sealed, by design
    if (!house && [0, 2, 3].includes(maze[y][x])) assert.ok(reached.has(`${x},${y}`), `unreachable ${x},${y}`);
  }
}

test('U01 randomDir selection boundaries (choose-equivalent)', () => {
  const g = game();
  for (const [r, i] of [[0,0],[.25-Number.EPSILON,0],[.25,1],[.5-Number.EPSILON,1],[.5,2],[.75-Number.EPSILON,2],[.75,3],[1-Number.EPSILON,3]]) {
    g.random(() => r);
    assert.equal(g.randomDir(), g.DIRS[i]);
  }
});
test('U02 U03 inclusive house and ring geometry', () => {
  const g = game();
  for (let y = 6; y <= 13; y++) for (let x = 9; x <= 20; x++) {
    const house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
    assert.equal(g.inHouse(x, y), house);
    const perimeter = ((y === 7 || y === 12) && x >= 10 && x <= 19) || ((x === 10 || x === 19) && y >= 7 && y <= 12);
    assert.equal(g.inRing(x, y), perimeter);
  }
});
test('U04 U05 walkable bounds and cell values', () => {
  const g = arena(game());
  for (const [x, y] of [[-1, 5], [30, 5], [5, -1], [5, 20]]) assert.equal(g.walkable(x, y), false);
  for (let c = 0; c <= 4; c++) { g.maze[5][6] = c; assert.equal(g.walkable(6, 5), [0, 2, 3].includes(c)); }
  g.maze[5][6] = 0; assert.equal(g.walkable(6, 5), true);
  g.maze[5][5] = 4; assert.equal(g.walkable(5, 5), false); // door blocks movement
  assert.equal(g.walkable(12, 9), true); // house interior floor: valid to this helper; the doors isolate it
  assert.equal(g.isFloor(0), true); assert.equal(g.isFloor(1), false); assert.equal(g.isFloor(2), true); assert.equal(g.isFloor(3), true); assert.equal(g.isFloor(4), false);
  assert.equal(g.inBounds(-1, 5), false); assert.equal(g.inBounds(30, 5), false); assert.equal(g.inBounds(5, -1), false); assert.equal(g.inBounds(5, 20), false); assert.equal(g.inBounds(5, 5), true);
  assert.equal(g.onBorder(0, 5), true); assert.equal(g.onBorder(29, 5), true); assert.equal(g.onBorder(5, 0), true); assert.equal(g.onBorder(5, 19), true); assert.equal(g.onBorder(5, 5), false);
});
test('M01 M02 M03 ghost construction: initial placement and replacement for every color', () => {
  const g = game();
  g.random(() => .5);
  for (let i = 0; i < 6; i++) {
    const a = g.makeGhost(g.GHOST_DEFS[i]), b = g.makeGhost(g.GHOST_DEFS[i]);
    assert.notEqual(a, b); // independently created ghosts share no mutable state
    assert.equal(a.color, g.GHOST_DEFS[i].color); assert.equal(a.red, g.GHOST_DEFS[i].red);
    assert.equal(a.dx, 0); assert.equal(a.dy, 1); // floor(.5*4)=2: down
    assert.equal(a.moveTimer, 0);
    eq([a.x, a.y, a.waiting], i === 0 ? [14, 7, null] : [12 + i, 10, i * 900]);
    assert.equal(a.home, g.GHOST_DEFS[i].home); assert.equal(a.initWait, g.GHOST_DEFS[i].initWait);
  }
  // Replacement: a new ghost of the same color at the original's slot, waiting 900, fresh direction, timer 0.
  g.random(() => .125);
  const original = Object.assign(g.makeGhost(g.GHOST_DEFS[2]), { x: 5, y: 5, dx: -1, dy: 0, moveTimer: 7, waiting: 12 });
  const r = g.respawnGhost(original);
  assert.notEqual(r, original);
  assert.equal(r.color, '#00ffff'); assert.equal(r.red, false);
  eq([r.x, r.y, r.dx, r.dy, r.moveTimer, r.waiting], [14, 10, 1, 0, 0, 900]); // floor(.125*4)=0: right
  assert.equal(original.x, 5); // the original is not mutated
  for (let i = 0; i < 6; i++) assert.equal(g.respawnGhost(g.makeGhost(g.GHOST_DEFS[i])).waiting, 900);
});
test('M04 M05 M12 newGame and fullReset replace dirty state, regenerate the maze, keep the escape flag contract', () => {
  const g = game();
  g.random(seeded(7)); g.newGame(); // dirty baseline state
  const old = [g.maze, g.player, g.ghosts];
  g.score = 400; g.lives = -2; g.gameOver = true; g.escaped = true;
  g.random(seeded(42)); g.fullReset();
  assert.equal(g.score, 0); assert.equal(g.lives, 3); assert.equal(g.gameOver, false);
  assert.equal(g.escaped, true); // fullReset does not reset the escape stop flag
  [g.maze, g.player, g.ghosts].forEach((v, i) => assert.notEqual(v, old[i]));
  eq(g.player, { x: 1, y: 1, dir: null, moveTimer: 0, mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0 });
  eq(g.ghosts.map(v => v.color), ['#ff0000', '#ffc0cb', '#00ffff', '#ffa500', '#00ff00', '#9b30ff']);
  g.ghosts.forEach((v, i) => eq([v.x, v.y, v.waiting, v.moveTimer], i ? [12 + i, 10, i * 900, 0] : [14, 7, null, 0]));
  mazeInvariant(g.maze);
  // Two deliberately different random streams both produce fresh, spec-valid state.
  const first = plain(g.maze);
  g.random(seeded(99)); g.fullReset();
  assert.notDeepEqual(plain(g.maze), first); mazeInvariant(g.maze);
  assert.equal(g.escaped, true);
  // newGame (startup path) additionally clears the escape flag and the queue.
  g.queue.push({ type: 'steer', dir: g.DIRS[0] });
  g.random(seeded(11)); g.newGame();
  assert.equal(g.escaped, false); assert.equal(g.queue.length, 0);
});
test('M05 generated maze cells with a constant random stream', () => {
  const g = game();
  g.random(() => .5); g.newGame();
  // .5 is below neither 0.2 (wall) nor 0.1 (pellet): every floor is a dot; the ring gets the pellet draw only.
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
    const border = !x || x === 29 || !y || y === 19, house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
    if (border) assert.equal(g.maze[y][x], 1, `border ${x},${y}`);
    else if (house) continue; // covered by the fixed-house invariant below
    else if (x === 1 && y === 1) continue; // spawn: forced to empty floor, asserted below
    else assert.equal(g.maze[y][x], 2, `floor ${x},${y}`);
  }
  assert.equal(new Set(g.maze).size, 20); // 20 distinct row objects
  assert.equal(g.maze[1][1], 0); // spawn forced to empty floor
  for (let y = 7; y <= 12; y++) for (let x = 10; x <= 19; x++) if (g.inRing(x, y)) assert.equal(g.maze[y][x], 2);
  mazeInvariant(g.maze);
});
test('M06 generation probability thresholds without repair interference', () => {
  const g = game();
  // (1,1) is the spawn: assigned 0 before any random draw. The first draws belong to (2,1): wall, then pellet.
  for (const [wall, pellet, expected] of [[.2 - Number.EPSILON, .5, 1], [.2, .1, 2], [.2, .1 - Number.EPSILON, 3]]) {
    const values = [wall, pellet]; g.random(() => values.length ? values.shift() : .5); g.newGame();
    assert.equal(g.maze[1][2], expected); assert.equal(g.maze[1][1], 0); mazeInvariant(g.maze);
  }
  // A zero stream: all ordinary cells become walls, the ring bypasses the wall draw and becomes pellets.
  // (No assertion on an ordinary cell: connectivity repair carves walls on routes to the spawn,
  // so only the ring — which the repair can never overwrite — is asserted here.)
  g.random(() => 0); g.newGame();
  for (let y = 7; y <= 12; y++) for (let x = 10; x <= 19; x++) if (g.inRing(x, y)) assert.equal(g.maze[y][x], 3);
  mazeInvariant(g.maze);
});
test('M07 connected maze is unchanged', () => {
  const g = game(); g.random(() => .5); g.newGame();
  const before = plain(g.maze); g.fixConnectivity(); eq(g.maze, before);
});
test('M08 M09 M10 shortest repair, row-major targets, and preservation', () => {
  const g = game();
  // Two separated pockets on row 1: the pellet pocket first (row-major), then the empty pocket.
  g.maze = board(1); g.maze[1][1] = 0; g.maze[1][3] = 3; g.maze[1][5] = 0;
  const before = plain(g.maze); g.fixConnectivity();
  assert.equal(g.maze[1][2], 2); assert.equal(g.maze[1][4], 2);
  const changed = []; for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) if (g.maze[y][x] !== before[y][x]) changed.push([x, y]);
  eq(changed, [[2, 1], [4, 1]]); assert.equal(g.maze[1][3], 3); assert.equal(g.maze[1][5], 0); // floors and pellets on routes retained
  // A target below the house must connect around its footprint, never through it or the boundary.
  g.maze = board(1); g.maze[1][1] = 0; g.maze[12][15] = 3; const fixed = plain(g.maze);
  g.fixConnectivity();
  assert.equal(g.maze[12][15], 3);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
    if (g.inHouse(x, y) || !x || x === 29 || !y || y === 19) assert.equal(g.maze[y][x], fixed[y][x], `${x},${y}`);
  }
  allFloorReached(g.maze); // ring cells stay walls on this handcrafted board; connectivity is the guarantee
  // A target near the bottom boundary, fully walled in except the spawn. Several equally short
  // routes exist, so assert the minimum carve count (18 interior cells of the 19-step route),
  // that no boundary or house cell is touched, and finite completion.
  g.maze = board(1); g.maze[1][1] = 0; g.maze[18][3] = 0; const fixed2 = plain(g.maze);
  g.fixConnectivity();
  const carved = []; for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) if (g.maze[y][x] === 2 && fixed2[y][x] === 1) carved.push([x, y]);
  assert.equal(carved.length, 18);
  carved.forEach(([x, y]) => assert.equal(g.inHouse(x, y) || g.onBorder(x, y), false, `carved ${x},${y}`));
  assert.equal(g.maze[18][3], 0); assert.equal(g.maze[0][5], 1); // boundary never carved
  allFloorReached(g.maze);
  // Defensive: a boundary start with no interior neighbours exhausts the search and yields no path.
  assert.equal(g.bfsToReached(0, 0, new Set()), null);
});
test('M09 row-major component choice is observable in carve order', () => {
  const g = game(); g.maze = board(1); g.maze[1][1] = 0; g.maze[1][3] = 3; g.maze[3][1] = 0;
  const writes = [];
  // Observe real writes without replacing the connectivity algorithm.
  g.maze = g.maze.map((row, y) => new Proxy(row, { set(target, x, value) { if (target[x] !== value) writes.push([Number(x), y, value]); target[x] = value; return true; } }));
  g.fixConnectivity(); eq(writes, [[2, 1, 2], [1, 2, 2]]);
});
for (let seed = 1; seed <= 20; seed++) test(`M11 generated maze invariants seed=${seed}`, () => mazeInvariant(game(seed).maze));
test('P01 P02 P03 P04 steer destinations, collectibles and preservation', () => {
  for (let d = 0; d < 4; d++) {
    const g = arena(game()), direction = g.DIRS[d];
    g.player.moveTimer = 7; g.player.dir = { dx: 0, dy: 0 };
    g.attemptSteer(direction);
    eq([g.player.x, g.player.y], [5 + direction[0], 5 + direction[1]]);
    assert.deepEqual(g.player.dir, direction);
    assert.equal(g.player.moveTimer, 0); // a successful steer resets the movement timer
    assert.equal(g.score, 0); assert.equal(g.player.powered, false); assert.equal(g.player.powerTimer, 0);
    assert.equal(g.player.mouthTimer, 0); // untouched
  }
  for (const cell of [1, 4]) {
    const g = arena(game()); g.maze[5][6] = cell; const before = state(g);
    g.attemptSteer(g.DIRS[0]); eq(state(g), before); // blocked: wall or door changes nothing
  }
  const g = arena(game()); g.player.x = 29; const before = state(g);
  g.attemptSteer(g.DIRS[0]); eq(state(g), before); // out of bounds
  g.player.x = 5; g.maze[5][6] = 2; g.attemptSteer(g.DIRS[0]);
  assert.equal(g.score, 10); assert.equal(g.maze[5][6], 0);
  g.attemptSteer(g.DIRS[1]); g.attemptSteer(g.DIRS[0]); assert.equal(g.score, 10); // no repeated award on revisit
  for (const x of [7, 8]) { // the pellet must be the cell the steer enters (player travels 6 -> 7 -> 8)
    g.maze[5][x] = 3; g.player.powerTimer = 13; g.player.dir = null; // heading cleared: a same-heading steer would be ignored (P06)
    g.attemptSteer(g.DIRS[0]);
    assert.equal(g.player.powered, true); assert.equal(g.player.powerTimer, 300); // reset, never accumulated
    assert.equal(g.maze[5][x], 0);
  }
  assert.equal(g.score, 110);
});
test('P05 P06 P07 steer start, duplicate by value, reverse and blocked turn', () => {
  const g = arena(game()); g.player.moveTimer = 7;
  g.attemptSteer(g.DIRS[0]);
  eq([g.player.x, g.player.y, g.player.moveTimer], [6, 5, 0]);
  assert.deepEqual(g.player.dir, g.DIRS[0]);
  g.player.moveTimer = 9;
  const before = state(g);
  g.attemptSteer(g.DIRS[0]); eq(state(g), before); // same heading: ignored
  g.attemptSteer([1, 0]); eq(state(g), before); // equal-valued fresh direction: also the same heading
  g.maze[4][6] = 1; g.attemptSteer(g.DIRS[3]); eq(state(g).player, before.player); // blocked: press consumed, heading kept; the wall is test setup
  g.attemptSteer(g.DIRS[1]); // reverse into open floor
  eq([g.player.x, g.player.y, g.player.moveTimer], [5, 5, 0]);
  assert.deepEqual(g.player.dir, g.DIRS[1]);
});
test('P08 P09 P10 automatic movement thresholds and wall stop', () => {
  // No heading: the tick-level guard leaves movement state untouched (stepPlayer is not called).
  const g = arena(game()); g.player.moveTimer = 8;
  g.tick();
  eq([g.player.x, g.player.y, g.player.moveTimer], [5, 5, 8]);
  assert.equal(g.player.mouthTimer, 1); // the tick itself still runs the animation
  for (const timer of [0, 8]) {
    arena(g); g.player.dir = g.DIRS[0]; g.player.moveTimer = timer;
    g.stepPlayer();
    assert.equal(g.player.moveTimer, timer + 1); assert.equal(g.player.x, 5); // below the threshold: no move
  }
  for (const cell of [0, 2, 3, 1, 4]) {
    arena(g); g.player.dir = g.DIRS[0]; g.player.moveTimer = 9; g.maze[5][6] = cell;
    g.stepPlayer();
    const blocked = [1, 4].includes(cell);
    assert.equal(g.player.x, blocked ? 5 : 6); assert.equal(g.player.moveTimer, 0);
    assert.equal(g.player.dir, blocked ? null : g.DIRS[0]);
    assert.equal(g.score, cell === 2 ? 10 : cell === 3 ? 50 : 0);
    if (cell === 3) assert.equal(g.player.powerTimer, 300);
    if (blocked) { g.tick(); eq([g.player.x, g.player.y, g.player.dir], [5, 5, null]); } // stands still until the next steer
  }
});
test('P11 P12 tick movement cadence and blocked input before the scheduled move', () => {
  const g = arena(game());
  g.queue.push({ type: 'steer', dir: g.DIRS[0] });
  g.tick();
  eq([g.player.x, g.player.moveTimer], [6, 1]); // the steer tick ends with timer 1
  for (let i = 0; i < 8; i++) g.tick();
  assert.equal(g.player.x, 6);
  g.tick(); assert.equal(g.player.x, 7); // first automatic move on the tenth active tick
  for (let i = 0; i < 9; i++) g.tick(); assert.equal(g.player.x, 7);
  g.tick(); assert.equal(g.player.x, 8); // further moves ten ticks apart
  g.player.moveTimer = 9; g.maze[4][8] = 1;
  g.queue.push({ type: 'steer', dir: g.DIRS[3] }); // blocked alternative: consumed, existing heading continues
  g.tick();
  assert.equal(g.player.x, 9); assert.equal(g.player.dir, g.DIRS[0]); assert.equal(g.player.moveTimer, 0);
});
test('G01 G02 G03 exact ghost release and movement cadence', () => {
  const g = arena(game());
  assert.equal(g.makeGhost(g.GHOST_DEFS[0]).waiting, null); // red starts released
  for (let i = 1; i < 6; i++) {
    const a = g.makeGhost(g.GHOST_DEFS[i]), direction = [a.dx, a.dy];
    a.moveTimer = 8;
    for (let t = 0; t < i * 900 - 1; t++) g.updateGhost(a);
    eq([a.x, a.y, a.waiting, a.moveTimer], [12 + i, 10, 1, 8]); // waits do not touch the movement timer
    g.updateGhost(a);
    eq([a.x, a.y, a.waiting, a.moveTimer], [14, 7, null, 0]); // release: jump, clear, reset
    assert.deepEqual([a.dx, a.dy], direction); // direction retained, no extra move
  }
  const a = g.makeGhost(g.GHOST_DEFS[0]); a.x = 14; a.y = 7; a.dx = 1; a.dy = 0; a.moveTimer = 0;
  for (let t = 0; t < 14; t++) g.updateGhost(a);
  eq([a.x, a.moveTimer], [14, 14]); // no move before the fifteenth tick
  g.updateGhost(a);
  eq([a.x, a.moveTimer], [15, 0]); // one cell, timer reset
});
test('G04 G05 G06 G07 G08 ghost straight, sole option, random choice, trapped and power parity', () => {
  for (let d = 0; d < 4; d++) for (const c of [0, 2, 3]) {
    const g = arena(game()), a = ghost(g), dir = g.DIRS[d];
    a.dx = dir[0]; a.dy = dir[1]; a.moveTimer = 14;
    g.maze[5 + dir[1]][5 + dir[0]] = c; // open forward, even with other valid neighbours
    g.random(() => { throw new Error('straight movement must not choose'); });
    g.updateGhost(a);
    eq([a.x, a.y], [5 + dir[0], 5 + dir[1]]);
    assert.equal(g.maze[a.y][a.x], c); // collectibles never consumed by ghosts
  }
  for (const powered of [false, true]) for (let choice = 0; choice < 3; choice++) {
    const g = arena(game()), a = ghost(g);
    g.player.powered = powered; g.maze[5][6] = 4; // forward door blocks
    a.moveTimer = 14; g.random(() => choice / 3);
    g.updateGhost(a);
    // options in right/left/down/up order: right is the door, so left, down, up
    eq([a.x, a.y], [[4, 5], [5, 6], [5, 4]][choice]);
    eq([a.dx, a.dy], [[-1, 0], [0, 1], [0, -1]][choice]);
    assert.equal(a.moveTimer, 0);
  }
  for (const trapped of [false, true]) {
    const g = arena(game()), a = ghost(g);
    for (const [dx, dy] of g.DIRS) g.maze[5 + dy][5 + dx] = 1;
    if (!trapped) g.maze[5][4] = 0; // sole valid neighbour is the reverse
    a.moveTimer = 14;
    g.updateGhost(a);
    eq([a.x, a.y, a.moveTimer], [trapped ? 5 : 4, 5, 0]);
    eq([a.dx, a.dy], [[1, 0], [-1, 0]][trapped ? 0 : 1]); // stays put when boxed in
  }
  // Boundary proximity under power and without: identical movement, never into wall/door/off-board.
  let expected;
  for (const powered of [true, false]) {
    const g = arena(game()), a = ghost(g, 0, 1, 1);
    g.player.powered = powered;
    a.dx = -1; a.dy = 0; a.moveTimer = 14; g.random(() => 0); // forward is the boundary wall
    g.updateGhost(a);
    assert.equal(g.walkable(a.x, a.y), true);
    if (powered) expected = plain([a.x, a.y, a.dx, a.dy]);
    else eq([a.x, a.y, a.dx, a.dy], expected);
  }
  eq(expected, [2, 1, 1, 0]); // reversed, stayed on the board
});
test('T01 T02 T03 T17 event ordering, terminal freeze and restart', () => {
  const g = arena(game()); g.maze[5][6] = 0;
  g.queue.push({ type: 'steer', dir: g.DIRS[0] }, { type: 'steer', dir: g.DIRS[0] }, { type: 'steer', dir: g.DIRS[3] }, { type: 'steer', dir: g.DIRS[2] });
  g.tick();
  eq([g.player.x, g.player.y], [6, 5]); // arrival order: move, duplicate ignored, up, back down
  assert.deepEqual(g.player.dir, g.DIRS[2]); eq(g.queue, []);
  for (const lives of [3, 0]) {
    arena(g); g.gameOver = true; g.lives = lives;
    g.queue.push({ type: 'steer', dir: g.DIRS[0] });
    const before = state(g); g.tick(); eq(state(g), before); eq(g.queue, []); // terminal tick drains input, freezes state
    g.random(() => .5);
    g.queue.push({ type: 'steer', dir: g.DIRS[3] }, { type: 'space' }, { type: 'steer', dir: g.DIRS[0] });
    g.tick();
    // Pre-restart arrow ignored, restart, post-restart arrow processed on the new state, then normal simulation.
    eq([g.player.x, g.player.y, g.player.moveTimer, g.player.mouthTimer, g.score, g.lives, g.gameOver], [2, 1, 1, 1, 10, 3, false]);
    assert.equal(g.ghosts[1].waiting, 899); // new ghosts updated in the same tick
  }
  const win = arena(game()); win.maze = board(); win.tick(); // no collectibles: win
  assert.equal(win.gameOver, true); assert.equal(win.lives, 3);
  const before = state(win); win.queue.push({ type: 'steer', dir: g.DIRS[0] }); win.tick(); eq(state(win), before); // frozen until restart
});
test('T04 Escape at different queue positions preserves only preceding event effects', () => {
  const g0 = arena(game());
  g0.queue.push({ type: 'escape' }, { type: 'steer', dir: g0.DIRS[0] });
  g0.tick();
  assert.equal(g0.player.x, 5); assert.equal(g0.escaped, true); assert.equal(g0.player.mouthTimer, 0); eq(g0.queue, []);
  const g1 = arena(game());
  g1.queue.push({ type: 'steer', dir: g1.DIRS[0] }, { type: 'escape' }, { type: 'steer', dir: g1.DIRS[2] });
  g1.tick();
  assert.equal(g1.player.x, 6); assert.equal(g1.escaped, true); assert.equal(g1.player.mouthTimer, 0); eq(g1.queue, []);
  const g2 = arena(game()); g2.gameOver = true;
  g2.queue.push({ type: 'space' }, { type: 'escape' }, { type: 'steer', dir: g2.DIRS[0] });
  g2.random(() => .5); g2.tick();
  assert.equal(g2.gameOver, false); assert.equal(g2.escaped, true); assert.equal(g2.player.mouthTimer, 0); eq(g2.queue, []);
});
test('T05 T06 animation and power timer boundaries while stationary', () => {
  for (const open of [false, true]) {
    const g = arena(game()); g.player.mouthOpen = open; g.player.mouthTimer = 8;
    g.tick(); eq([g.player.mouthOpen, g.player.mouthTimer], [open, 9]);
    g.tick(); eq([g.player.mouthOpen, g.player.mouthTimer], [!open, 0]);
  }
  const g = arena(game());
  g.player.powerTimer = 8; g.tick(); assert.equal(g.player.powerTimer, 8); // unpowered: untouched
  g.player.powered = true; g.player.powerTimer = 2;
  g.tick(); eq([g.player.powered, g.player.powerTimer], [true, 1]);
  g.tick(); eq([g.player.powered, g.player.powerTimer], [false, 0]); // off before ghost updates and collisions
});
test('T07 pellet collection and expiration precede collision outcomes', () => {
  for (const auto of [false, true]) {
    const g = arena(game()); g.maze[5][6] = 3; g.ghosts = [ghost(g, 0, 6, 5)];
    if (auto) { g.player.dir = g.DIRS[0]; g.player.moveTimer = 9; } else g.queue.push({ type: 'steer', dir: g.DIRS[0] });
    g.tick();
    eq([g.score, g.lives, g.player.powerTimer], [250, 3, 299]); // pellet +50 then same-tick decrement, collision while powered +200
  }
  const g = arena(game()); g.player.powered = true; g.player.powerTimer = 1; g.ghosts = [ghost(g, 0)];
  g.tick();
  assert.equal(g.lives, 2); assert.equal(g.score, 0); // power expired in this tick: unpowered outcome
});
test('T08 T09 collision phase ignores mismatches, swaps and intermediate positions', () => {
  for (const [x, y] of [[5, 6], [6, 5], [6, 6]]) {
    const g = arena(game()); g.ghosts = [ghost(g, 0, x, y)]; g.tick();
    assert.equal(g.lives, 3); assert.equal(g.score, 0); // only x equal, only y equal, neither
  }
  for (const scenario of ['converge', 'away', 'swap', 'intermediate']) {
    const g = arena(game());
    const a = ghost(g, 0, scenario === 'converge' ? 7 : 6, 5);
    g.ghosts = [a];
    g.queue.push({ type: 'steer', dir: g.DIRS[0] });
    if (scenario === 'intermediate') g.queue.push({ type: 'steer', dir: g.DIRS[2] });
    else { a.moveTimer = 14; a.dx = g.DIRS[scenario === 'away' ? 0 : 1][0]; a.dy = g.DIRS[scenario === 'away' ? 0 : 1][1]; }
    g.tick();
    assert.equal(g.lives, scenario === 'converge' ? 2 : 3, scenario);
  }
});
test('T10 T11 powered snapshot replacement preserves order and defers new ghosts', () => {
  const g = arena(game()); g.player.powered = true; g.player.powerTimer = 100; g.random(() => .75);
  const originals = Array.from({ length: 6 }, (_, i) => ghost(g, i));
  g.ghosts = originals.slice();
  g.tick();
  assert.equal(g.score, 1200); assert.equal(g.ghosts.length, 6);
  g.ghosts.forEach((a, i) => {
    assert.notEqual(a, originals[i]);
    assert.equal(a.color, originals[i].color);
    eq([a.x, a.y, a.waiting, a.moveTimer], [12 + i, 10, 900, 0]);
    eq([a.dx, a.dy], [0, -1]); // floor(.75*4)=3: up
  });
  g.tick();
  g.ghosts.forEach(a => assert.equal(a.waiting, 899)); // replacements update from the next tick
  assert.equal(g.score, 1200);
});
test('T10 replacement appends after surviving ghosts and retains collision order', () => {
  const g = arena(game()); g.player.powered = true; g.player.powerTimer = 10;
  const a = ghost(g, 0), survivor = ghost(g, 1, 20, 5), b = ghost(g, 2);
  g.ghosts = [a, survivor, b];
  g.tick();
  assert.equal(g.ghosts[0], survivor);
  eq(g.ghosts.map(v => v.color), ['#ffc0cb', '#ff0000', '#00ffff']);
  assert.equal(g.score, 400);
});
test('T12 T14 life loss resets positions but retains current timers, directions and score', () => {
  const g = arena(game());
  g.score = 70; g.player.dir = { dx: 0, dy: 1 }; g.player.moveTimer = 2;
  g.player.mouthTimer = 4; g.player.powerTimer = 17; g.player.mouthOpen = false;
  g.ghosts = [
    Object.assign(ghost(g, 0), { x: 5, y: 5 }),
    Object.assign(ghost(g, 1), { x: 13, y: 10, waiting: 899, moveTimer: 5 }), // a previously respawned pink
    Object.assign(ghost(g, 2), { x: 14, y: 10, waiting: 1799 }),
    Object.assign(ghost(g, 3), { x: 15, y: 10, waiting: 2699 }),
    Object.assign(ghost(g, 4), { x: 16, y: 10, waiting: 3599 }),
    Object.assign(ghost(g, 5), { x: 17, y: 10, waiting: 4499 }),
  ];
  const beforeMaze = plain(g.maze);
  g.tick(); // the red collides (the others are at home)
  eq([g.lives, g.score], [2, 70]);
  eq([g.player.x, g.player.y], [1, 1]); eq(g.maze, beforeMaze); // score and partly eaten maze retained
  assert.deepEqual(g.player.dir, { dx: 0, dy: 1 }); // facing/heading retained
  eq([g.player.moveTimer, g.player.mouthTimer, g.player.powerTimer, g.player.mouthOpen], [3, 5, 17, false]);
  g.ghosts.forEach((a, i) => {
    eq([a.x, a.y, a.waiting], i ? [12 + i, 10, i * 900] : [14, 7, null]);
    assert.equal(a.moveTimer, i === 0 ? 1 : i === 1 ? 5 : 0); // released red moved; waiting ones kept their timers
  });
  // Two ghosts overlapping the player cost exactly one life: later snapshot entries use the reset positions.
  const h = arena(game()); h.lives = 3;
  h.ghosts = [Object.assign(ghost(h, 1), { x: 5, y: 5, waiting: null }), Object.assign(ghost(h, 2), { x: 5, y: 5, waiting: null })];
  h.tick();
  assert.equal(h.lives, 2); // not 1
  h.ghosts.forEach((a, i) => eq([a.x, a.y], i ? [14, 10] : [13, 10])); // pink home [13,10], cyan home [14,10]
  eq([h.player.x, h.player.y], [1, 1]);
});
test('T13 simultaneous fatal collisions continue below zero without reset', () => {
  const g = arena(game()); g.lives = 1;
  g.ghosts = [ghost(g, 0), ghost(g, 1), ghost(g, 2)]; // all three on the player's cell
  g.tick();
  eq([g.lives, g.gameOver, g.player.x, g.player.y], [-2, true, 5, 5]); // no early break, no position reset
  g.ghosts.forEach(a => eq([a.x, a.y], [5, 5]));
});
test('T15 T16 collectibles and simultaneous terminal outcomes', () => {
  for (const c of [0, 2, 3]) for (const [x, y] of [[1, 2], [28, 18]]) { // early and late rows
    const g = arena(game()); g.maze = board(); g.maze[y][x] = c;
    g.tick(); assert.equal(g.gameOver, c === 0);
  }
  for (const fatal of [false, true]) {
    const g = arena(game()); g.maze = board(); g.maze[5][6] = 2;
    g.queue.push({ type: 'steer', dir: g.DIRS[0] }); // eat the only collectible this tick
    if (fatal) { g.lives = 1; g.ghosts = [ghost(g, 0, 6, 5)]; }
    g.tick();
    eq([g.gameOver, g.lives, g.score], [true, fatal ? 0 : 3, 10]);
  }
});
