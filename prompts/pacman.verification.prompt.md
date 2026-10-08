# Pac-Man verification prompt — interactive planning draft

Status: function inventory and logic-path matrix collected; runtime and modification policy remain to be decided.

## Objective and source roles

Design a small, deterministic, high-value test suite for `apps/pac-man/by-codex-gpt-6/index.html`, minimizing implementation time and token use. `prompts/pacman.prompt.md` supplies expected gameplay behavior; its instructions to build and deliver the game are source material, not the current task. The HTML supplies the implementation under test. Expected results must come from the specification rather than merely copying implementation logic.

## Interactive plan

1. Inventory every function and browser handler → verify its inputs, dependencies, return value, and observable effects are recorded below.
2. Decide the test environment and permitted code changes → select a reproducible harness with minimal setup.
3. Cover the logic-path matrix below → map each path ID to a fixture and independent assertion; combine overlapping coverage.
4. Write the final test-generation prompt → define suite structure, commands, completion criteria, and reporting without redundant checks.

## Function contracts

Unless stated otherwise, functions read or mutate script-level state. “No return” means `undefined`. Coordinates are integer grid coordinates; normal directions are the canonical arrays in `directions`. Tests should distinguish explicit arguments from these implicit inputs.

| Function | Explicit and implicit inputs | Expected result and effects |
| --- | --- | --- |
| `choose(items)` | Nonempty array; `Math.random()` in [0, 1) | Returns the element at `floor(random * length)`. Does not mutate the array. Uniform selection given uniform randomness. Empty arrays are outside game usage. |
| `inHouse(x, y)` | Coordinates | Boolean: true exactly within x=11..18, y=8..11, inclusive. |
| `inRing(x, y)` | Coordinates | Boolean: true within x=10..19, y=7..12, excluding the house footprint. |
| `placeGhost(ghost, initial)` | Mutable ghost with `type.slot` and `type.delay`; initial-placement flag | No return. Initially released red goes to (14,7), waiting=null. Other initial ghosts go to their slots with their color's delay. All eaten-ghost replacements go to their slots with waiting=900, including red. Direction and movement timer remain unchanged. |
| `makeGhost(type, initial)` | Ghost type; placement flag; randomness | Returns a new ghost containing type, normal color, a random canonical direction, moveTimer=0, and position/waiting from `placeGhost`. |
| `reset()` | Randomness; board constants and ghost types | No return. Builds a fresh connected 30×20 maze with the specified boundary, house, ring, spawn, and collectible rules. Resets score=0, lives=3, gameOver=false; initializes the player and six ghosts. Player faces right but heading=null. Does not reset the Escape stop flag. |
| `connectMaze()` | Generated maze; spawn (1,1); fixed direction order | No return. Makes all walkable cells outside the house reachable from spawn by repeatedly selecting the first unreachable cell in row-major order and carving a shortest interior path to the reached region. Only walls on those paths become dots. Preserves boundaries, house, and existing collectibles. A connected maze remains unchanged. |
| `valid(x, y)` | Coordinates and maze | Returns true for in-bounds destinations with values 0, 2, or 3; false for out-of-bounds, wall=1, or door=4. House interior floor is valid by this function alone; movement barriers isolate it. |
| `movePlayer(direction)` | Direction; player position; maze; score and power state | Returns false with no state change if blocked. Otherwise returns true, moves one cell, updates facing, consumes a dot for +10 or pellet for +50, and on a pellet sets powered=true and powerTimer=300. Does not change heading or movement timer, animate, or check collisions. |
| `steer(direction)` | Direction; player heading and movement state | No return. Current heading is ignored. A different open direction immediately moves, sets heading, and resets moveTimer=0. A blocked attempt changes nothing. Implementation compares array identity: normal-input tests must use canonical directions; separately record that equal-valued fresh arrays are not recognized as the same heading. |
| `autoMove()` | Player heading, moveTimer, destination | No return. No heading leaves timer unchanged. Otherwise increments timer, moving once when it reaches 10 and resetting it to 0. A blocked scheduled move clears heading. Successful movement consumes collectibles through `movePlayer`. |
| `moveGhost(ghost)` | Mutable ghost; maze; randomness | No return. Waiting ghosts decrement waiting and stay still until zero, then jump to (14,7), clear waiting, reset moveTimer, and do not move further that tick. Released ghosts move every 15 ticks, continuing straight if possible; when blocked choose uniformly among valid neighbors in right/left/down/up order and move immediately. With no neighbors they remain in place with timer reset. Never consume collectibles. Power does not affect movement. |
| `tick()` | Queued key codes in arrival order; all game state | No return. Processes input first; Escape sets stopped, clears queue, and exits; arrows steer during active play; Space resets only after game over. Clears consumed queue. An active tick then performs automatic player movement, mouth toggle every 10 ticks, power decrement, ghost updates, collision snapshot iteration, and collectible exhaustion check. Pellet collected in this tick ends with timer=299. Powered collisions give +200 and append a same-type replacement waiting 900. Unpowered collisions decrement lives and, while lives remain, reset positions/release schedules while retaining directions and timers. Snapshot iteration continues, including after lives reach zero. No collectibles sets gameOver. Terminal ticks freeze simulation unless restarted. |
| `circle(x, y, radius, color)` | Pixel geometry, color, Canvas context | No return. Sets fill color, starts a path, draws a full circle, and fills it. Leaves that fill color active for following drawing operations. |
| `draw()` | Maze, player, ordered ghosts, score, lives, gameOver; canvas/context | No return. Renders background → maze → player → ghosts → HUD → terminal message. Uses specified geometry/colors, asymmetric mouth sectors, floored pupil offsets, and fixed text coordinates. Power makes ghosts blue. Loss text is red when lives<=0; win text yellow otherwise. Does not mutate gameplay state. |
| `clearInput()` | Input queue | No return. Replaces queue with an empty array; used on blur and visibility changes. |
| `frame(now)` | RAF timestamp in milliseconds; previous timestamp, accumulator, visibility, stopped | No return. Uses fixed 1000/60 ms ticks, drawing once per visible frame and scheduling the next RAF. First visible frame establishes timing without catch-up. Hidden frames clear timing. Stopped frames neither draw nor schedule; Escape during catch-up exits before drawing. Test equal simulated durations at different refresh rates, allowing the implementation's 1e-7 ms comparison tolerance. |

## Browser event handlers and startup

| Procedure | Input | Expected result |
| --- | --- | --- |
| `keydown` handler | Event code, repeat flag; document.hidden; stopped | Prevents default for arrows/Space. Queues arrows, Space, or Escape only when visible, not stopped, and not repeated. Does not move immediately before a tick. Other keys are ignored. |
| `keyup` handler | Event code | Prevents default for arrows/Space; does not enqueue or move. |
| `visibilitychange` handler | Visibility-change event; timing/input state | Clears queued input, sets previous=null and accumulator=0 on either transition. Returning to visibility cannot replay elapsed hidden time. |
| `blur` handler | Window blur | Invokes named `clearInput`; discards pending input. |
| Script startup | DOM canvas/context and randomness | Calls reset, draws the initial board immediately, and requests the first animation frame. |

## Inline callback inventory

These are included for completeness, but should be tested through their enclosing functions rather than given separate duplicate tests.

- `reset`: outer `Array.from` callback accepts a row index and returns a row; inner callback accepts a column index and returns the specified cell value. `ghostTypes.map` accepts a type and returns its initialized ghost.
- `moveGhost`: `directions.filter` receives each direction and retains it exactly when its destination is valid.
- `tick`: `ghosts.forEach` calls `moveGhost` for each current ghost. Nested `maze.some` callbacks accept rows and cells and report whether any dot or pellet remains.

## Logic-path coverage requirements

Generate tests for the paths below. Target 100% of reachable functions, statements, and branches in the embedded game script, including callbacks and handlers. Report measured percentages and uncovered source locations; do not claim coverage from the number of tests alone. Exhaustive execution paths are unbounded because of loops, random layouts, and event sequences: cover every reachable branch, meaningful condition boundary, and specified interaction instead.

Each test must identify the path IDs it covers, arrange explicit state, execute the real implementation, and assert observable results. Parameterize equivalent cases. Use exact expected values for deterministic cases and independent invariants for generated mazes. Do not copy game functions into the suite, replace the behavior under test with mocks, or weaken assertions to make existing behavior pass. If specification and implementation disagree, retain the specification assertion and report the defect.

### Harness and fixture requirements

- Load the actual embedded script. Keep any test access bridge or instrumentation in the harness unless code changes are separately agreed. Exclude harness/bridge code from game coverage.
- Isolate state for every test. Control randomness, event dispatch, visibility, timestamps, and RAF scheduling. Advance ticks directly; never wait seconds for release or power timers.
- Mock only browser boundaries when running outside a browser. Capture Canvas operations with their effective styles and order; capture RAF callbacks without automatically recursing.
- Provide a small set of explicit fixtures: an open corridor, a blocked turn, a junction, a trapped cell, separated maze components, and controlled collision positions. Use full board dimensions where game logic depends on them.
- Keep at least one remote collectible in fixtures that must remain active. Keep ghosts away from the player unless collision is the subject. Preserve the fixed house and boundaries for valid gameplay fixtures.
- Use controlled random values at selection/probability boundaries. For maze-generation threshold tests, identify the relevant random decision without relying on a brittle total random-call count. Connectivity repair can carve generated walls, so choose a fixture where it cannot obscure the cell being asserted.
- Compare relevant state before and after early returns and reset operations. Assert both required changes and required preservation. Avoid giant snapshots of unrelated state or Canvas logs.
- Label deliberately artificial states as defensive branch tests. Do not infer new gameplay requirements from them. Do not spend tests on unsupported argument types or malformed objects absent an explicit contract.

### Selection, geometry, and cell access

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| U01 | `choose` on one item and on four items, random=0, each selection boundary, just below each boundary, and just below 1 | Correct element/reference; every index reachable; array unchanged. Never stub random to 1. |
| U02 | `inHouse` at all corners, interior, and one cell outside each edge with the other coordinate inside | Inclusive bounds; each coordinate predicate can independently make the result false. |
| U03 | `inRing` on all four sides/corners, inside the house, and just beyond each outer edge | Entire corridor included; footprint and outer cells excluded. |
| U04 | `valid` at x=-1, x=30, y=-1, y=20 with other coordinate valid | False without invalid row/cell access. |
| U05 | `valid` on each value 0..4, including house floor, boundary wall, and both doors | True only for 0/2/3. This helper checks destination cells, not reachability. |

### Creation, reset, and maze connectivity

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| M01 | `placeGhost` with initial=true for all six types | Exact positions, slots, delays, and red waiting=null; existing direction and moveTimer retained. |
| M02 | `placeGhost` with initial=false for all six types | Own slot and waiting=900, including red; direction/timer retained. |
| M03 | `makeGhost` for initial and replacement cases with controlled random choices | Fresh object, correct type/color, chosen direction, timer=0, correct placement; independently created ghosts do not share mutable ghost state. |
| M04 | `reset` from dirty score/lives/player/ghost/maze/gameOver state | All specified initial values restored; six ghosts in specified order; new maze/player/ghost objects; right-facing player with heading=null. |
| M05 | Inspect every cell after controlled `reset` | 20 distinct rows × 30 cells; intact boundaries; exact house walls, 12 empty interior cells, and two doors; empty spawn; ring only dots/pellets; all values permitted. |
| M06 | Ordinary eligible cell with wall random just below .2 and equal to .2; floor pellet random just below .1 and equal to .1 | Wall below .2; no wall at .2; pellet below .1; dot at .1. Ring bypasses random-wall assignment; spawn finishes empty. |
| M07 | Already-connected maze passed to `connectMaze` | No cell changes, including collectible types; termination with no target. |
| M08 | One disconnected floor component requiring a unique one-wall route | Correct shortest route carved into dots; floor/pellets on route retained; all components become reachable. |
| M09 | Multiple disconnected components, including empty floor and pellet targets, with competing paths | First target selected row-major; shortest route to any reached cell; repeat until connected. Use a unique shortest route for exact-cell assertions. For tied routes, assert minimum length and preservation unless testing documented direction-order traversal. |
| M10 | Repair route near boundary and house; loops and previously visited neighbors | No carving through excluded cells; visited cells are not repeatedly enqueued; finite completion; BFS can traverse walls as well as floor. |
| M11 | Fixed small set of recorded seeds for `reset` (start with 20) | Independent flood-fill proves all exterior floor/collectibles and both exits reachable, house interior unreachable, boundaries/house preserved. Report seed on failure. Increase seed count only for an uncovered case or reproduced defect. |
| M12 | Restart using two deliberately different controlled random streams | Fresh layout/state is generated; same specification invariants hold. Do not assert that arbitrary random runs must differ. |

### Player movement and collection

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| P01 | `movePlayer` toward empty floor in each direction | True; exact one-cell displacement and facing; score/power/heading/timers otherwise unchanged. |
| P02 | Move toward wall, door, or out-of-bounds | False; all player/maze/score state unchanged. |
| P03 | Enter dot, then revisit the emptied cell | +10 once; cell becomes 0; no repeated award. |
| P04 | Enter pellet unpowered, then enter another while powered | +50 each; consumed cells become 0; powered=true and timer exactly 300 on each direct call, never accumulated. |
| P05 | `steer` with heading=null into open floor | Immediate one-cell movement; facing and heading set; timer reset to 0. |
| P06 | `steer` with the same canonical heading, including timer=9 | No movement, consumption, or timer reset. |
| P07 | Different open heading, including reverse; blocked alternative heading | Open turn moves immediately and resets timer; blocked turn preserves heading, facing, and timer. |
| P08 | `autoMove` with no heading; with timer=0 and timer=8 | No-heading state unchanged; active timer becomes 1 or 9 without displacement. |
| P09 | `autoMove` with timer=9 toward open floor/dot/pellet | One move, timer=0, heading retained, correct collection effects. |
| P10 | `autoMove` with timer=9 toward wall/door | No displacement; timer=0; heading=null; subsequent ticks remain stationary until successful steering. |
| P11 | Successful steer followed by active-tick processing | Same tick ends with moveTimer=1; first automatic move occurs on the tenth active tick counting that tick. Further moves are ten ticks apart. |
| P12 | Blocked different-direction steer while existing heading has timer=9 | Blocked input is consumed; scheduled movement in the existing heading still occurs that tick. |

`steer` uses reference equality internally. Record this constraint, but do not require a separate equal-valued array to behave like real keyboard input unless that API contract is intentionally expanded.

### Ghost movement and release

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| G01 | Waiting ghost with waiting=2, then waiting=1, and nonzero movement timer | First call only decrements waiting. Second jumps to exit, waiting=null, timer=0, direction retained, no extra movement. |
| G02 | Advance startup waits to immediately before and at 900/1800/2700/3600/4500 ticks | Each color releases at its exact tick; red starts released. Isolate this from accidental collisions. |
| G03 | Released ghost with timer=0, 13, then 14 | No move before fifteenth tick; then exactly one cell and timer=0. After release, first movement takes 15 additional ticks. |
| G04 | Open forward cell at a junction with other valid neighbors | Continue straight without random selection. Parameterize directions and destination values 0/2/3; collectibles unchanged. |
| G05 | Blocked forward cell with one valid neighbor, including only reverse | Select sole valid direction and move in the same call. |
| G06 | Blocked forward cell with several valid neighbors and controlled random index | Filter in right/left/down/up order; each valid choice selectable; invalid neighbors excluded; chosen direction and position correct. |
| G07 | No valid neighbors | Position/direction unchanged; timer reset to 0. |
| G08 | Near door/boundary; powered and unpowered runs from identical state/randomness | Never enter wall/door or leave board; identical movement regardless of power. Ghost overlap allowed. |

### Tick orchestration, collisions, and endings

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| T01 | Empty queue during active play; queue during gameOver | Active tick advances in required order. Terminal tick drains input but freezes player/ghost timers, animation, score, and maze unless restarted. |
| T02 | Queue two different open arrows, duplicate heading, and blocked arrow | Arrival order preserved; each successful different steer moves; duplicate/blocked attempts have their specified effects; queue empty afterward. |
| T03 | Space while active; arrow before Space while terminal; Space then arrow while terminal | Active Space ignored. Pre-restart arrow ignored. Post-restart arrow processed on new state. Restart tick also advances normal simulation. |
| T04 | Escape first, between arrows, and after terminal Space restart | Effects before Escape remain; later events and active simulation skipped; stopped=true and queue cleared. Frame integration leaves last drawn frame visible. |
| T05 | Mouth timer=8 then 9; mouth initially open and closed; player stationary | Timer=9 without toggle, then timer=0 and toggle; animation independent of movement. |
| T06 | Unpowered; powered timer=2; powered timer=1 | Unpowered timer untouched; powered decrements; at zero powered=false before ghost updates/collisions. |
| T07 | Pellet acquired by steer or auto movement during tick | Timer ends at 299; same-tick collision uses powered outcome. A power timer expiring that tick uses unpowered outcome. |
| T08 | No collision with only x equal, only y equal, and neither equal | No score/life/reset effects; both coordinate comparisons exercised. |
| T09 | Player/ghost converge on same cell during updates; ghost moves away before check | Collision in first case only. Player and ghost swap cells, or an intermediate queued steer passes through a ghost: no collision unless final cells match. |
| T10 | Powered collision with each color, including multiple ghosts in same cell | +200 per collided original ghost; remove each original and append same-type replacement in collision order with slot, random direction, timer=0, waiting=900; list length preserved. |
| T11 | Newly appended replacement during powered collision | Replacement is absent from current snapshot and is not processed again; waiting remains 900 this tick and becomes 899 next active tick. Assert final list identity/order. |
| T12 | Unpowered collision with lives=3 | Lives=2; player position resets; all existing ghosts regain color-specific initial positions/waits. Retain score, maze, player heading/facing/animation/timers, and ghost direction/movement timers as they stand at collision phase. Include a previously respawned ghost. |
| T13 | Unpowered collision with lives=1, then multiple overlapping ghosts | First collision sets lives=0 and gameOver without position reset; further snapshot collisions can make lives negative. No early break. |
| T14 | Multiple ghosts initially overlapping player while more than one life remains | First collision resets current positions; later snapshot entries use those mutated positions. Do not incorrectly lose one life per original overlap. |
| T15 | Maze containing only a remaining dot, only a pellet, then neither | Either collectible keeps play active; none sets gameOver. Put collectibles in early/late rows to cover scan continuation and short-circuiting. |
| T16 | Last collectible consumed, with/without simultaneous fatal collision | End-of-tick terminal flag set. Lives<=0 selects loss; positive lives selects win. Collision processing still occurs before collectible exhaustion ends play. |
| T17 | Tick after win and after loss, followed by fresh Space | Frozen until restart; complete reset; normal simulation resumes in restart tick. For exact reset defaults, also test `reset` directly because restart tick already advances timers. |

### Input and lifecycle handlers

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| E01 | Fresh visible keydown for every arrow, Space, Escape, unrelated key | Correct codes queued in order; no immediate simulation; preventDefault for arrows/Space only. |
| E02 | Keydown while stopped, repeated, or hidden; vary each condition independently | No queued input. Arrow/Space default suppression still occurs before the rejection. |
| E03 | Keyup for arrow, Space, Escape, unrelated key | Default prevention for arrows/Space only; queue/state otherwise unchanged. |
| E04 | `clearInput` and blur with empty and nonempty queues | Queue empty; discarded steering never executes later. |
| E05 | Visibility loss and return with queued input and fractional accumulated time | Queue cleared; previous=null; accumulator=0 on both transitions. |
| E06 | Arrow held through terminal restart, modeled as repeated keydowns; then release and fresh press | Repeats do not start movement; fresh press does. Test actual browser key behavior in smoke checks where available. |
| E07 | Escape processed, then Space/arrows and later scheduled frame | Simulation cannot restart; no further frame scheduling/drawing or state changes through normal event/frame entry points. Direct `tick()` is not the stopped-state guard. |

### Frame timing

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| F01 | `frame` with stopped=true | No tick, draw, or RAF request. |
| F02 | First visible frame with previous=null | Establish timestamp; draw once, schedule once; no elapsed-time ticks. |
| F03 | Elapsed time less than one step; exactly one step; several steps plus remainder | Zero/one/multiple ticks respectively; remainder retained; draw and schedule once per frame. Include values just outside the documented numeric tolerance around a step. |
| F04 | Split the same elapsed duration across 30, 60, 120, and 144 Hz frame timestamps | Same simulation tick count and gameplay state with identical initial state/randomness; no rendering-frequency dependence. |
| F05 | Hidden frame with existing timing state; long hidden interval; first frame after return | No hidden ticks/draws; timing cleared; first visible frame does not catch up; RAF continues while merely hidden. |
| F06 | Escape consumed during a frame with several pending ticks | Catch-up stops immediately; no later tick/draw/RAF request from that call. |
| F07 | Visible gameOver frames | Board continues drawing and RAF continues; active simulation state frozen. |

### Drawing branches and startup

| Path ID | Setup / execution | Required assertions |
| --- | --- | --- |
| D01 | `circle` with known center/radius/color | beginPath, full-circle arc, fill; effective fill color correct. |
| D02 | Maze containing all five cell types | Black full-canvas background; wall rectangle 40×40 blue; dot 4×4 white at +18,+18; pellet radius 8 at +20,+20; door pink 40×8 at y+16; floor leaves background visible. |
| D03 | Mouth closed and open in all four directions | Closed circle radius 18; open filled sectors 30..330, 150..210, 60..120, 240..300 with negative radians and counterclockwise arc, center connection, close/fill; yellow regardless of power. |
| D04 | Ghosts of all six colors, then powered | Head/body/skirt geometry and effective colors correct; every ghost blue under power; eyes white; pupils black. |
| D05 | Ghost directions right/left/down/up | Pupil offsets +1/-2 on the relevant axis, 0 on the other; retain floor behavior for negative values. |
| D06 | Active, terminal with positive lives, zero lives, and negative lives | HUD text/coordinates/font/baseline/alignment correct; no active terminal message; exact win/loss message/color at (300,400). Repeated draw restores left text alignment. |
| D07 | Overlapping entities and maze cell, ordered ghost list | Draw order matches specification; entities rendered even on walls; no gameplay state changes from draw. |
| D08 | Load actual HTML in a browser where available | Title, 1200×800 canvas, proportional viewport scaling, black page, initial render and controls work offline; no console errors or external requests. These checks supplement logic coverage. |
| D09 | Execute script startup in harness | Initial reset, then draw, then one RAF request; correct event listeners registered. |

### Coverage completion and efficient execution

1. Implement shared fixtures and parameterized cases once. Map all path IDs to test names; a single test may cover several IDs if each outcome is asserted clearly.
2. Run deterministic tests and source coverage together. Inspect uncovered functions/statements/branches in the actual inline script. Add the smallest meaningful case for each reachable gap; do not rerun broad exploration without a concrete gap.
3. For a compound condition, exercise each operand changing the outcome while preceding operands allow it to be evaluated. For loops, cover zero, one, and multiple iterations where feasible; document structurally impossible cases such as a zero-row fixed board.
4. A passing line is not evidence its result was checked. Confirm every matrix row has assertions, especially reset preservation, collision snapshot mutation, event order, and timing boundaries.
5. Report any remaining gap with source location and reason: unreachable under valid state, instrumentation limitation, unavailable browser check, or missing test. Never silently exclude reachable code to raise the percentage. Do not force exhaustive combinations or unsupported invalid inputs for a metric.
6. If coverage tooling is unavailable, report that limitation and the completed path matrix; do not invent a percentage. Keep browser smoke checks small and avoid repeated screenshots when deterministic checks already settle the question.
7. Deliver the suite, exact run command, measured coverage, path-ID mapping, and concise failure/gap report. Stop once the matrix and reachable coverage targets are satisfied; expand only for a demonstrated defect or uncovered behavior.

## Decisions to collect next

- Test runtime: lightweight Node harness with mocked DOM/Canvas/RAF, real browser automation, or a combination?
- Modification policy: keep the delivered HTML untouched, or allow a small separation of game logic for testing?
- Coverage scope is now comprehensive logic-path coverage, including drawing branches and browser lifecycle. Runtime and modification policy remain open; the matrix is independent of those choices.

## Issues to resolve when selecting assertions

- The specification distinguishes facing (initially right) from movement heading (initially none); preserve that distinction.
- Automatic player movement occurs after the event phase and before mouth/power updates in this HTML. Assert this explicitly alongside the specification's continuous-movement requirements.
- Test collisions at their stated phase, not along swept paths or intermediate steer positions.
- Direction identity in `steer` is an implementation dependency, not a new gameplay requirement.
- Random maze tests should use controlled random sequences or seeds and structural invariants. A finite sample cannot prove probabilities; avoid flaky frequency thresholds.
- Canvas call assertions verify drawing commands; actual browser rendering, offline loading, and event integration require separate browser checks if available.
