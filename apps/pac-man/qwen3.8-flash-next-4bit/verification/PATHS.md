# PATHS — qwen3.8-flash-next-4bit verification suite

Every `Q` path ID in the [verification plan](../plan/pacman.verification.plan.md) maps below to the
exact test title(s) that cover it. The `Q` prefix avoids colliding with the reference suite's
`U/M/P/G/D/E/F` IDs.

Each test title begins with its `Q` path ID; `node --test` prints those titles, so this file is a
stable index from plan intent → test → file.

## Q-unit — pure helpers (`unit.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-unit 01 | `inHouse` — all edges/boundaries; inclusive booleans |
| Q-unit 02 | `inRing` — ring box minus house footprint; booleans |
| Q-unit 03 | `blocked` — values 0–4; `true` only for 1 and 4 |

## Q-reset — resetGame / resetPositions / respawnGhost (`reset.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-reset 01 | resetGame seeded — score/lives/gameOver/queue, player shape+facing, six ghosts, ghost[0] at (14,7) with waiting=null, others at release delays, mazeInvariant |
| Q-reset 02 | resetGame determinism — two games(seed) produce equal maze (via eq) |
| Q-reset 03 | resetPositions — after a life loss, positions restored; directions/timers retained |
| Q-reset 04 | respawnGhost — eaten ghost replaced at slot, waiting=900, length preserved |

## Q-maze — genMaze / fixConnectivity / connectivity (`maze.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-maze 01 | genMaze several seeds — mazeInvariant each; no house leak, ring always pellet, unreachable collectible absent |
| Q-maze 02 | genMaze constant RNG 0.5 — every interior non-ring/floor becomes a dot; mazeInvariant |
| Q-maze 03 | fixConnectivity on a disconnected board — allFloorReached false pre-repair; mazeInvariant post |
| Q-maze 04 | fixConnectivity on a connected maze — maze unchanged (eq) |
| Q-maze 05 | reach on a hand-built maze — independent traversal matches expected reachable set |
| Q-maze 07 | floodFill OOB guard — a walkable border cell is traversed and its out-of-bounds neighbour is skipped |

## Q-step-event — step() event phase (`step.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-step-event 01 | empty queue during active play — no state change |
| Q-step-event 02 | queue during gameOver — event drains but simulation frozen |
| Q-step-event 03 | escape clears queue & stops — stopped=true; remaining queue discarded |
| Q-step-event 04 | steer arrival order — two steers in one step move in order; queue empty after |
| Q-step-event 05 | steer into a wall — blocked, no move |
| Q-step-event 06 | duplicate-heading steer — no move (array-identity check) |
| Q-step-event 07 | steering then auto-move both consume ticks — movement advances |
| Q-step-event 08 | restart while gameOver — resetGame applied; fresh state |
| Q-step-event 09 | Space via emit('keydown',' ') — enqueues restart |

## Q-step-movement — player movement, mouth, power (`movement.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-step-movement 01 | auto-move at timer 10 — advances a cell, consumes pellet, powered/powerTimer set |
| Q-step-movement 02 | steer then auto-move both advance the timer |
| Q-step-movement 03 | move stops at a wall — dir=null |
| Q-step-movement 04 | mouth closed → open toggle at timer 10; animation independent of movement |
| Q-step-movement 05 | power expiry — powered false when powerTimer≤0, before ghost/collision phase |

## Q-ghost — ghost movement & release (`ghost.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-ghost 01 | released ghost moves each 15 ticks — correct cadence |
| Q-ghost 02 | ghost stuck until its release timer — jumps to (14,7) at timer 0 |
| Q-ghost 03 | ghost blocked, picks among neighbors (uniform RNG, R/L/U/D order) |
| Q-ghost 04 | released ghost continues straight when path is clear |
| Q-ghost 05 | power does not affect ghost movement — same movement with/without power |

## Q-collision — collisions & endings (`collision.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-collision 01 | no collision — no score/life change |
| Q-collision 02 | powered collision — score+=200, ghost respawned at slot, waiting=900 |
| Q-collision 03 | unpowered collision, lives=3 → lives=2, resetPositions() |
| Q-collision 04 | unpowered collision, lives=1 → gameOver, no reset |
| Q-collision 05 | multiple ghosts in the snapshot — all processed (no early break) |
| Q-collision 06 | win-check with no collectibles → gameOver; collectibles present → continue |

## Q-render — drawing (`render.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-render 01 | background fill + HUD text/coordinates/font/baseline/alignment |
| Q-render 02 | player closed circle vs open pie sectors (all 4 directions) |
| Q-render 03 | ghosts of all six colors + powered (blue); eyes white, pupils black |
| Q-render 04 | wall/door/dot/pellet tile rendering (colors, sizes) |
| Q-render 05 | gameOver HUD win (yellow) vs loss (red) at (300,400) |
| Q-render 06 | drawPlayer `player.dir ? ... : null` — null dir draws a full closed circle, no pie moveTo/lineTo |

## Q-frame — timing & lifecycle (`frame.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-frame 01 | stopped frame — no step(), but RAF still scheduled (called before the guard) |
| Q-frame 02 | hidden frame — no step(), no render(), RAF scheduled before the guard |
| Q-frame 03 | accumulator < 16.67ms — no tick; accumulator retained |
| Q-frame 04 | accumulator ≥ 16.67ms (one step) — one step(); then render() |
| Q-frame 05 | escape during a catch-up loop — loop stops; remaining accumulator retained |
| Q-frame 06 | fixed-timestep independence — same total duration yields the same tick count |
| Q-frame 07 | `now - last > 1000` long-stall clamp — frame(2000) with last=0 fires the true-branch, acc clamped to 0 |

## Q-events — browser event handlers via emit (`events.test.cjs`)
| ID | Test title |
| --- | --- |
| Q-events 01 | ArrowRight enqueues {steer,[1,0]}, preventDefault=true, no immediate move |
| Q-events 02 | ArrowLeft/Up/Down map to their DIRS vectors |
| Q-events 03 | Space enqueues a restart |
| Q-events 04 | Escape enqueues an escape (no preventDefault) |
| Q-events 05 | repeat:true suppresses the enqueue |
| Q-events 06 | blur clears the queue |
| Q-events 07 | visibilitychange: hidden clears queue, visible resets acc/last but keeps queue |
| Q-events 08 | unrelated key enqueues nothing and does not preventDefault |
| Q-events 09 | a keydown during stopped enqueues; the subsequent step drains it with no movement |

## Q-real-browser — real browser suite (`real-browser.test.cjs`)
Optional at 100% coverage. Runs headless Chromium if available; otherwise **skips** with an explicit
reason (a skip is not evidence of browser verification).

| ID | Test title |
| --- | --- |
| Q-real-browser 01 | loads the real index.html offline; HUD state live (score 0, lives 3), no console errors, no external network requests |
| Q-real-browser 02 | arrow keys steer; Space restarts — real keyboard against the page's own rAF loop |

## Coverage note
Coverage is measured only on `game.generated.js` (the extracted, never-edited script). All harness and
test code is test-only and excluded. 100% line / branch / function coverage is enforced by
`run.cjs`.
