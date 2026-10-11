# Pac-Man verification test-suite generation plan

**Target application:** `apps/pac-man/qwen3.8-flash-next-4bit/index.html` (the tagged file).
**Goal:** Generate a **complete Node.js test suite from scratch** — no files may be reused or copied from
another app. You may **reference** the reference suite in
`apps/pac-man/by-codex-gpt-6/verification/` (same repo) for harness/coverage *techniques* and to see the
verification-prompt intent, but the suite below must be **tailored to the qwen3.8-flash-next-4bit app**
whose real functions are described in this plan.

**Runtime:** `node:test` + `node:assert/strict`. Run via `run.cjs` with 100% line/branch/function coverage
enforced on the extracted game script. Node.js 24 or newer is required.
**Output location:** this `plan/` directory. The generated suite files live in
`apps/pac-man/qwen3.8-flash-next-4bit/verification/`.

---

## 0. Important context — this suite must be generated, not copied

- **Do not copy** any file from the reference implementation, from the removed
  `apps/pac-man/qwen3.8-flash-next-4bit/verification/` (it was intentionally deleted), or from anywhere
  else. Reuse only **concepts** (VM harness technique, coverage flags, seedable RNG, `emit` event
  dispatch) and **adapt** them to the qwen3.8 app.
- The reference suite is written for the **`by-codex-gpt-6`** app, whose function names (`choose`,
  `makeGhost`, `movePlayer`, `steer`, `autoMove`, `moveGhost`, `tick`, `circle`, `clearInput`, `reset`)
  and path IDs (`T..`, `G..`, `E..`, `F..`, `D..`) do **not** exist in the qwen3.8 app.
- The qwen3.8 app folds its whole loop into `step()`, uses `resetGame()` (not `reset()`), and generates
  the maze with a different API. The mapping below is the authority.

| Prompt / by-codex name | qwen3.8 name (target) |
| --- | --- |
| `reset()` | `resetGame()` |
| `makeGhost(type, initial)` / `placeGhost` | inline ghost creation in `resetGame()` / `respawnGhost(g)` |
| `movePlayer` / `steer` | event phase of `step()` |
| `autoMove` | movement phase of `step()` |
| `moveGhost` | ghost phase of `step()` |
| `tick()` | `step()` (event phase → movement → mouth/power → ghosts → collisions → win-check) |
| `circle(x,y,r,color)` | `drawPlayer()` / `drawGhost(g)` |
| `draw()` | `render()` |
| `valid(x,y)` | inline `blocked(v)` (valid ⟺ `!blocked`) |
| `clearInput()` / blur | inline `queue.length = 0` |
| `frame(now)` | `frame(now)` |

---

## 1. Phase 1 — Build the harness

Create `verification/harness.cjs` **from scratch**. It must:

1. **Extract** the `<script>` body of `index.html` *verbatim* (regex `<script>([\s\S]*?)<\/script>`),
   **write** it to `verification/game.generated.js`, and **run** it in a `node:vm` context.
2. **Mock** the DOM: `window`/`document` event listeners (a listener table keyed by event name),
   `document.getElementById('game')` → a canvas stub `{ width:1200, height:800, getContext: kind => ctx }`
   (assert `kind === '2d'`).
3. **Mock** the Canvas `2d` context: record every call to `{ method, args, color, align, baseline, font }`.
   Support the methods used by the game: `beginPath, arc, fill, fillRect, moveTo, lineTo, closePath,
   fillText`.
4. **Mock** `requestAnimationFrame` (push callback to an array; the game calls it once per `frame()`),
   `performance.now` (backed by a settable virtual clock), and `Math.random` (seedable).
5. **Expose a getter/setter bridge** (evaluated inside the same VM context) over the game's top-level
   `let`s (`maze, player, ghosts, score, lives, gameOver, stopped`) and game functions (`step, resetGame,
  respawnGhost, render, frame, inHouse, inRing`) so a host-side API object can read live state and call
  functions directly.

### Required host-side API surface (what `game(seed)` must return)

- **State getters/setters:** `maze, player, ghosts, score, lives, gameOver, stopped, queue`.
- **Constants getters:** `COLS, ROWS, CELL, DIRS, SECTORS, GHOST_DEFS`.
- **Function getters:** `step, resetGame, respawnGhost, render, drawPlayer, drawGhost, frame, inHouse,
  inRing, blocked, genMaze, fixConnectivity`.
- **Mutation helpers:** `setRandom(fn)` (swap RNG fn), `setSeed(s)` (reseed), `setClock(t)` (set virtual
  `performance.now`), `setHidden(h)` (set `document.hidden`).
- **Event dispatcher:** `emit(name, code, extra = {})` — builds `{ key: code, code, repeat: false,
  preventDefault(){...}, ...extra }` and dispatches to the captured listener for `name`; returns the boolean
  `prevented`.
- **Canvas log** `calls` (array) and **RAF log** `raf` (array of callbacks).
- **Helper exports:** `plain(v)` (JSON deep clone), `eq(a, e, msg)` (deepStrictEqual over `plain`'d
  values), `near(a, b, tol)` (tolerance equal, for `Math.PI`/angle comparisons), `ghost(g, type=0, x=5,
  y=5, dir=0, waiting=null)` (push `{def, x, y, dir, timer, waiting}`), `baseBoard(fill=2)` and
  `openBoard()` (fixed maze fixtures), `reach(maze)` (independent exterior reachability from `(1,1)` as a
  `Set` of `"x,y"`), `mazeInvariant(maze)` and `allFloorReached(maze)`.

### Phase-1 gate

```bash
node --check harness.cjs                       # compiles
node -e "const {game}=require('./harness.cjs'); const g=game(1); g.step(); console.log('boot ok');"
```

Do not proceed until the harness compiles and boots without throwing.

---

## 2. Input-data model

- **Randomness is seeded.** `game(seed)` installs a deterministic seedable RNG; call `setRandom(fn)` for
  custom streams (e.g. `() => 0.5`) or `setSeed(s)` to reseed. Every test touching `Math.random` (maze
  gen, ghost dir/turn choice, respawn direction) must fix the stream and document the seed/stream.
- **Maze fixtures:** prefer `baseBoard(fill)` / `openBoard()` for deterministic grids; assert structure
  with `mazeInvariant` / `allFloorReached` / `reach`.
- **Player shape:** `{ x, y, dir (canonical DIRS[] or null), moveTimer, mouthOpen, mouthTimer, powered,
  powerTimer }`. Direction identity matters (arrays compared by reference).
- **Ghost shape:** `{ def, x, y, dir, timer, waiting }`. `waiting = null` ⇒ released; nonzero ⇒ ticking
  down before release at `(14,7)`.
- **Event queue:** `g.queue = [ { type: 'steer' | 'restart' | 'escape', dir? } ]`. `step()` drains it in
  arrival order.
- **Events via `emit`:**
  - `emit('keydown', ' ', { repeat })` — ` ' ' ` is the Space key.
  - `emit('keydown', 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown', { repeat })`
  - `emit('blur')`, `emit('visibilitychange', { target: { hidden: true|false } })`

---

## 3. Function contract inventory (qwen3.8 app — exact verified behavior)

Constants: `COLS=30, ROWS=20, CELL=40, DIRS=[[1,0],[-1,0],[0,1],[0,-1]]`;
`GHOST_DEFS` colors `['#ff0000','#ffc0cb','#00ffff','#ffa500','#00ff00','#9b30ff']`;
`SECTORS = { '1,0':[30,330], '-1,0':[150,210], '0,-1':[60,120], '0,1':[240,300] }`.

| Function | Arguments (explicit + implicit) | Expected input | Expected output / effect |
| --- | --- | --- | --- |
| `inHouse(x,y)` | coords | any ints | `x∈[11,18] && y∈[8,11]` → `true` else `false` |
| `inRing(x,y)` | coords | any ints | `x∈[10,19] && y∈[7,12] && !inHouse(x,y)` → `true` else `false` |
| `blocked(v)` | maze cell value | 0..4 | `v===1||v===4` → `true` else `false` |
| `genMaze()` | RNG | seeded | Returns 20×30 maze: boundary=1; house walls=1 (cols 11–18, rows 8–11) with interior floor 0 and door cells `m[8][14],m[8][15]=4`; random walls/dots/pellets; `m[1][1]=0`; then `fixConnectivity(m)`; returns maze. Invariant via `mazeInvariant`. |
| `floodFill(m)` (internal) | maze | — | Returns `Set` of walkable cells reachable from spawn `(1,1)`; key `y*COLS+x`. |
| `bfsPath(m,start,reached)` (internal) | maze, start, reached | — | Shortest interior path (carving through walls/floor, skipping house cells) from `start` to reached region; returns array of `{x,y}`. |
| `fixConnectivity(m)` (internal) | maze | `allFloorReached` false | Loops: flood from spawn, carve first unreachable non-house walkable cell to the reached region until all reachable. Only carved-wall cells become dots (2). Preserves boundaries/house/collectibles; a fully-connected maze is unchanged. |
| `resetGame()` | RNG | — | Builds maze via `genMaze`; `score=0, lives=3, gameOver=false, stopped=false, queue=[]`; player `{x:1,y:1,dir:[1,0],moveTimer:0,mouthOpen:true,mouthTimer:0,powered:false,powerTimer:0}`; six ghosts with `dir=DIRS[rand*4],timer=0`; red (type 0) `waiting=null` (released at slot (14,7)); others `waiting=delay`(900/1800/2700/3600/4500). |
| `resetPositions()` | player, ghosts | any | Restores player spawn + all ghost spawn positions and release schedules; **retains** player direction/timers, mouth state, power, powerTimer, and ghost direction/movement timers. |
| `respawnGhost(g)` | ghost g | g in `ghosts` | Removes g, pushes replacement same `def` at `g.def.slot`, `dir=DIRS[rand*4]`, `timer=0`, `waiting=900`. List length preserved. |
| `step()` | `queue` (implicit), all state, RNG | — | **Event phase:** drain queue in order — `escape`→`stopped=true,queue=[]`, return; `restart`→ if `gameOver` call `resetGame()`; else steer (different dir & valid dest → move, else nothing). Then `if (gameOver) return;`. **Movement:** if `player.dir` and `moveTimer≥10` (reset to 0) advance one cell if dest valid; consuming dot `+10`, pellet `+50` and `powered=true,powerTimer=300`; if blocked set `dir=null`. **Mouth/power:** `mouthTimer++`, toggle `mouthOpen` at ≥10; if `powered`, `powerTimer--`, set `powered=false` when ≤0. **Ghosts:** if `waiting!==null`: decrement; at 0 jump to (14,7), `waiting=null,timer=0`. Else `timer++`; at ≥15 advance straight if valid else random valid neighbor (uniform RNG, R/L/U/D order); if none, stay, timer=0. **Collisions:** loop `ghosts.slice()` (no early break); if ghost coords == player coords: if `powered` → `score+=200`, `respawnGhost(g)`; else `lives--`, if `lives≤0` `gameOver=true` else `resetPositions()`. **Win-check:** if any maze cell is 2 or 3 continue, else `gameOver=true`. |
| `drawPlayer()` | player, ctx | — | `fillStyle=#ffff00`; if no dir or mouth closed → arc full circle r=18 filled. Else pie mouth: moveTo(center) → line to `center+18*(cos a,sin a)` at start sector → arc(center,r,start,end,counterclockwise) → closePath → fill. Sector from `SECTORS[player.dir.join(',')]`, radians negated. |
| `drawGhost(g)` | ghost, ctx | — | Body: `player.powered?'#0000ff':g.def.color`; arc r=18; rect `cx-18,cy,36,18`; skirt 3 arc r=6. Eyes: whites r=6 at cx±6,cy-6; pupils r=3 at `floor(dir[0]*1.5),floor(dir[1]*1.5)` offsets. |
| `render()` | all state, ctx | — | Black 1200×800 fill; maze tiles (wall `#0000ff` solid, door black + pink bar, dot `#fff` 4×4 at +18,+18, pellet `#fff` circle r8 at +20,+20); `drawPlayer()`; drawGhost each ghost; HUD: `Score: <score>` white, left, (10,10), `36px sans-serif`, top baseline; `Lives: <lives>` white, right, (1190,10); if `gameOver`: at (300,400) white 36px — `lives≤0` red `"Game Over! Press SPACE to restart"`, else yellow `"You Win! Press SPACE to restart"`. **No state mutation.** |
| `frame(now)` | now, acc, last, stopped, document.hidden | — | `requestAnimationFrame(frame)` first (always scheduled). Then `if (stopped||document.hidden) return;`. Accumulate `acc += now-last` (fixed 16.67ms steps); run `step()` while `acc≥16.67`; then `render()`. |

---

## 4. Ordered test plan

Each file below is **one `node --test` group** generated and run individually; verify compile (`node
--check`) and pass (`node --test`) before generating the next. Use the `Q` prefix (avoids colliding with
the reference suite's `U/M/P/G/D/E/F` IDs). Test **titles contain the `Q` path IDs** so they map to the
verification-prompt intent.

### Q-unit — pure helpers
- Q-unit 01 `inHouse` — all edges/boundaries; inclusive booleans.
- Q-unit 02 `inRing` — ring box minus house footprint; booleans.
- Q-unit 03 `blocked` — values 0–4; `true` only for 1 and 4.

### Q-reset — `resetGame` / `resetPositions` / `respawnGhost`
- Q-reset 01 `resetGame` — seeded; assert score=0, lives=3, gameOver=false, queue=[], player shape & facing-right, six ghosts, ghost[0] waiting=null at (14,7), others waiting=delays, `mazeInvariant`.
- Q-reset 02 `resetGame` determinism — two `game(seed)` with the same seed → equal maze (via `eq`).
- Q-reset 03 `resetPositions` — after a life loss, positions restored; directions/timers retained.
- Q-reset 04 `respawnGhost` — eaten ghost replaced at slot, waiting=900, length preserved.

### Q-maze — `genMaze` / `fixConnectivity` / connectivity invariants
- Q-maze 01 several seeds — `mazeInvariant` each; no house leak, ring always pellet, unreachable collectible absent.
- Q-maze 02 constant RNG 0.5 — every interior non-ring/floor becomes a dot; `mazeInvariant`.
- Q-maze 03 disconnected board — `allFloorReached` false pre-repair; `mazeInvariant` post.
- Q-maze 04 `fixConnectivity` on a connected maze — maze unchanged (compare with `eq`).
- Q-maze 05 `reach` on a hand-built maze — independent traversal matches expected reachable set.

### Q-step-event — `step()` event phase
- Q-step-event 01 empty queue during active play — no state change.
- Q-step-event 02 queue during `gameOver` — event drains but simulation frozen.
- Q-step-event 03 escape clears queue & stops — `stopped=true`; remaining queue discarded.
- Q-step-event 04 steer arrival order — two steers in one `step` move in order; `queue` empty after.
- Q-step-event 05 steer into a wall — blocked, no move.
- Q-step-event 06 duplicate-heading steer — no move (array-identity check).
- Q-step-event 07 steering then auto-move both consume ticks — movement advances.
- Q-step-event 08 restart while `gameOver` — `resetGame()` applied; fresh state.
- Q-step-event 09 Space via `emit('keydown',' ')` — enqueues restart (also in Q-events).

### Q-step-movement — player movement, mouth, power
- Q-step-movement 01 auto-move at timer 10 — advances one cell, consumes pellet, powered/powerTimer set.
- Q-step-movement 02 steer then auto-move both advance the timer.
- Q-step-movement 03 move stops at a wall — `dir=null`.
- Q-step-movement 04 mouth closed → open toggle at timer 10; animation independent of movement.
- Q-step-movement 05 power expiry — powered false when `powerTimer≤0`, before ghost/collision phase.

### Q-ghost — ghost movement & release
- Q-ghost 01 released ghost moves each 15 ticks — correct cadence.
- Q-ghost 02 ghost stuck until its release timer — jumps to (14,7) at timer 0.
- Q-ghost 03 ghost blocked, picks among neighbors (uniform RNG, R/L/U/D order).
- Q-ghost 04 released ghost continues straight when path is clear.
- Q-ghost 05 power does not affect ghost movement — same movement with/without power.

### Q-collision — collisions & endings (snapshot, no early break)
- Q-collision 01 no collision — no score/life change.
- Q-collision 02 powered collision — `score+=200`, ghost respawned at slot, waiting=900.
- Q-collision 03 unpowered collision, lives=3 → lives=2, `resetPositions()`.
- Q-collision 04 unpowered collision, lives=1 → gameOver, no reset.
- Q-collision 05 multiple ghosts in the snapshot — all processed (no early break); lives decremented once per overlapping snapshot entry.
- Q-collision 06 win-check with no collectibles → gameOver; collectibles present → continue.

### Q-render — drawing (mapped from prompt D01–D09 to the tagged app)
- Q-render 01 background fill + HUD text/coordinates/font/baseline/alignment.
- Q-render 02 player closed circle vs open pie sectors (all 4 directions) — sector angles from `SECTORS`.
- Q-render 03 ghosts of all six colors + powered (blue); eyes white, pupils black.
- Q-render 04 wall/door/dot/pellet tile rendering (colors, sizes).
- Q-render 05 gameOver HUD win (yellow) vs loss (red) at (300,400).

### Q-frame — timing & lifecycle
- Q-frame 01 `stopped` frame — no `step()`, but RAF still scheduled (the app calls `requestAnimationFrame(frame)` before the guard).
- Q-frame 02 `hidden` frame — no `step()`, no `render()`, RAF scheduled before the guard.
- Q-frame 03 accumulator < 16.67ms — no tick; accumulator retained.
- Q-frame 04 accumulator ≥ 16.67ms (one step) — one `step()`; then `render()`.
- Q-frame 05 escape during a catch-up loop — loop stops; remaining accumulator retained.
- Q-frame 06 fixed-timestep independence — the same total accumulated duration yields the same tick count regardless of per-frame interval.

### Q-events — browser event handlers (via `emit`)
- Q-events 01 `emit('keydown','ArrowRight')` — queued; returns `true` (default prevented); maps to `DIRS[0]`; no immediate move.
- Q-events 02 `emit('keydown','ArrowLeft'/'ArrowUp'/'ArrowDown')` — correct `DIRS` mapping.
- Q-events 03 `emit('keydown',' ',{...})` — enqueues restart.
- Q-events 04 `emit('keydown','Escape',{...})` — enqueues escape.
- Q-events 05 `emit('keydown',..., {repeat:true})` — no enqueue (repeat suppressed).
- Q-events 06 `emit('blur')` — queue cleared.
- Q-events 07 `emit('visibilitychange',{target:{hidden:false}})` — queue cleared / timing reset.
- Q-events 08 unrelated key — no enqueue.
- Q-events 09 keydown during `stopped` — no movement on the subsequent `step()` (queue drains, state frozen).

### Q-real-browser — real browser suite (generate last; optional at 100% time)
- Uses **Playwright** headless. Loads the actual `index.html` **offline** in a headless browser and asserts:
  - Title is `Pac-Man`; canvas 1200×800 with proportional viewport scaling; black page background.
  - Initial render draws HUD + first ghost/exit; keyboard controls respond (Space restarts; arrow steers).
  - No external network requests; no console errors.
- This file is **skipped** when Playwright or a launchable Chromium/Chrome is unavailable (it must not fail
  a 100%-coverage run for that reason). Test titles carry the `Q` path IDs and reference the reference
  suite's D08-style offline/offline-loading checks.

---

## 5. Run command, coverage, and completion

### Reference `run.cjs` shape (generate one for the qwen3.8 app, do not copy it)

```js
const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
mkdirSync(path.join(__dirname, 'coverage'), { recursive: true });
const result = spawnSync(process.execPath, [
  '--test', '--test-concurrency=1', '--test-timeout=30000',
  '--experimental-test-coverage',
  `--test-coverage-include=${path.join(__dirname, 'game.generated.js')}`,
  '--test-coverage-lines=100', '--test-coverage-branches=100', '--test-coverage-functions=100',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  'logic.test.cjs', 'step-movement.test.cjs', 'collision.test.cjs', 'render.test.cjs',
  'frame.test.cjs', 'events.test.cjs', 'maze.test.cjs', 'reset.test.cjs',
  'real-browser.test.cjs',
], { cwd: __dirname, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
```

- **Coverage is measured on `game.generated.js` only** (the extracted, never-edited script). All harness
  and test code is test-only and excluded.
- **Add every generated `Q-*.cjs` file to the `run.cjs` file list** so 100% coverage is actually measured.

### Per-file gate (during generation)

```bash
node --check <file>      # must compile
node --test <file>       # must pass before generating the next file
```

### Completion criteria

1. Every generated file compiles (`node --check`) and passes (`node --test`) **individually**, in the
   order in §4.
2. `node run.cjs` exits 0 and reports **100% line / 100% V8 branch / 100% function** coverage on
   `game.generated.js`.
3. The real-browser suite runs, or is skipped with an explicit reason when Playwright/browser is absent
   (a skip is **not** evidence of browser verification — document the reason).
4. If a coverage target is unmet, add the **smallest** test that covers the missing line/branch — never
   weaken an assertion or reduce coverage to hit the number.

---

## 6. Constraints

- **Never edit `index.html`.** All coverage targets apply to the extracted `game.generated.js`.
- Prefer `baseBoard`/`openBoard`/`mazeInvariant`/`reach` over hand-built mazes.
- Fix RNG per test (`setSeed`/`setRandom`); assert the game's canonical `DIRS[]` arrays for direction
  (array-identity) checks.
- Draw assertions verify canvas `calls` entries (`method, args, color, align, font, baseline`).
- Advance simulation by calling `step()` directly; never rely on real timers.
- Test titles contain the `Q` path IDs so every prompt intent maps to a test; document each `Q` ID in a
  companion `PATHS.md` that maps it to its tests.

---

## 7. Reference implementation location (for technique only)

Reference suite (read-only, do not copy files):
`apps/pac-man/by-codex-gpt-6/verification/` — contains `harness.cjs`, `run.cjs`, `game.generated.js`,
`logic.test.cjs`, `browser-boundaries.test.cjs`, `browser-support.cjs`, `browser-support.test.cjs`,
`real-browser.test.cjs`, `README.md`, `PATHS.md`, and `coverage/lcov.info`. Use it to confirm the
verification-prompt intent and coverage technique; **adapt** everything to the qwen3.8 app's real
functions.
