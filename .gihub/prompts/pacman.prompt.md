---
description: Self-contained browser reproduction of the Python Pac-Man game
agent: agent
---

Build a complete, playable browser game titled **Pac-Man** using the specification below. It describes a particular simple Python/Pygame game, including its quirks, except that player movement is press-only and the random maze must be connected as specified below; do not substitute the rules, maze, pacing, or artwork of the commercial arcade game. All necessary information is here. Do not look up references, read the original Python program, fetch assets, or use external services.

## Deliverable and browser implementation

- Produce a self-contained `index.html` with embedded CSS and JavaScript using HTML5 Canvas and browser APIs only. It must run by opening the file directly, offline, with no server, build step, packages, fonts, images, audio, or CDN dependencies.
- Set the document title to `Pac-Man`. Start a new game immediately on load, with no menu. Use a black page and an 800 × 600 logical-pixel canvas. CSS may proportionally shrink it to fit the viewport, but retain the same internal coordinates and aspect ratio.
- Keep the implementation small and readable. Use explicit game state, maze generation, player and ghost state, input handling, simulation updates, and rendering. Do not add levels, sound, touch controls, pathfinding, high scores, pause menus, or other features.
- Use `requestAnimationFrame` to render and a fixed 60 Hz simulation step so gameplay does not accelerate on high-refresh-rate monitors. All frame counts below mean simulation ticks. Suspend simulation while the tab is hidden and reset the timing accumulator on return, avoiding a burst of catch-up movement. Clear queued input on blur or visibility loss.
- Prevent default browser actions for arrows and Space. Ignore OS-generated repeated `keydown` events (`event.repeat === true`). Never move the player from held-key state or simulation ticks alone.
- Escape stops the simulation and input and leaves the last frame visible, approximating the original program's exit without trying to close the browser tab. After Escape, all input including Space is ignored until the page is reloaded. Reloading starts again.

## Board and initial state

- The board is 20 columns × 15 rows, with square 40-pixel cells. Grid coordinates are zero-based `(x, y)`, with x increasing right and y increasing down. Use `maze[y][x]`.
- Cell values: `0` = empty floor, `1` = wall, `2` = regular dot, `3` = power pellet.
- Generate a fresh random maze on initial load and each restart. Every cell along x = 0, x = 19, y = 0, or y = 14 is a wall. For each interior cell other than `(1, 1)`, independently assign a wall with probability 20%. For each remaining interior floor cell, assign a power pellet with probability 10%, otherwise a regular dot. Finally force `(1, 1)` to empty floor.
- After random generation, ensure every non-wall cell is reachable from `(1, 1)` through orthogonal floor moves. Force ghost spawn cells `(18, 1)`, `(1, 13)`, `(18, 13)`, and `(10, 7)` to be walkable, replacing any wall there with a regular dot. Flood-fill from the player spawn; while an unreachable floor cell remains, connect it to the nearest reached cell by Manhattan distance, carving a horizontal-then-vertical corridor and replacing only walls with regular dots, then repeat the flood-fill. Never carve boundary walls or overwrite existing collectibles. This guarantees reachable collectibles and an exit from every spawn while retaining a random maze.
- Start with score 0, lives 3, and `gameOver = false`.
- The player starts at `(1, 1)`, facing right `(1, 0)`, mouth open, mouth timer 0, not powered, power timer 0.
- Create ghosts in this order, each with movement timer 0 and a uniformly random direction from right `(1, 0)`, left `(-1, 0)`, down `(0, 1)`, up `(0, -1)`:

| Ghost | Initial cell | Normal color |
| --- | --- | --- |
| Red | `(18, 1)` | `#ff0000` |
| Pink | `(1, 13)` | `#ffc0cb` |
| Cyan | `(18, 13)` | `#00ffff` |
| Orange | `(10, 7)` | `#ffa500` |

## Player controls and movement

- Each individual move attempt moves the player exactly one grid cell. There is no interpolation, automatic forward travel, buffered turn, wrapping, or diagonal movement.
- Each fresh arrow key press queues exactly one move attempt for the next event-processing phase. Holding an arrow causes no additional movement, regardless of hold duration or OS key repeat. Release and press again to move another cell. Process separate fresh presses in arrival order, with no direction priority or additional held-key move. A blocked press is consumed and is not retried automatically.
- A move succeeds only if its destination is within the board and is not a wall. On success, update both position and facing direction. A blocked move changes neither facing nor position.
- When entering a regular dot cell, clear it to 0 and add 10 points. When entering a power pellet cell, clear it, add 50 points, set powered to true, and set the power timer to 300 ticks. Another pellet resets the timer to 300; durations do not accumulate.
- Player animation updates even while standing still. Each active tick increments the mouth timer; at 10 ticks, toggle the mouth state and reset the timer to 0.
- After updating the mouth, decrement the power timer by one if powered. At zero, turn powered off. Nominal power duration is five seconds; a pellet collected during movement is decremented in that same tick.

## Ghost movement

- Each active tick increments every ghost's movement timer. When it reaches 15, reset it to zero and attempt a one-cell move, giving four moves per second.
- Continue in the current direction whenever the destination is in bounds and is not a wall. Ghosts do not randomly turn at open junctions.
- Only when blocked, enumerate all valid neighboring destinations in right, left, down, up order and uniformly choose one of their directions. Reversing is allowed. Set the direction and move during this same tick. If there are no valid neighbors, stay in place with the timer reset.
- Ghost moves require a walkable destination. All initial and respawn positions are walkable and connected to the player spawn. Ghosts can overlap each other and never consume collectibles.
- Power changes ghost color and collision outcomes only. It does not alter their speed, movement strategy, or direction selection.

## Tick order, collisions, and endings

Process queued key events in arrival order first, including restart or Escape. Event phase: if `gameOver` is false, each fresh, non-repeated arrow keydown immediately calls the move attempt for that direction. Space while `gameOver` is true resets the state; the same tick then continues as an active tick. Then, if the game is active, execute exactly this order:

1. Update player mouth animation and power timer.
2. Update movement for all ghosts.
3. Check collisions against a shallow snapshot of the ghost list in its current order.
4. Scan the maze for any cell containing 2 or 3; if none remain, set `gameOver = true`.

Collision rules:

- A collision means the ghost and player occupy the same grid cell at the collision-check phase. Do not check swept paths, cell swaps, intermediate player positions, or sprite overlap. Fast movement can skip over a ghost.
- If the player is powered, remove that ghost, award 200 points, and immediately append a new ghost of the same normal color at `(10, 7)`, with a new random direction and movement timer 0. There is no respawn delay or immunity. The center cell is already guaranteed walkable by maze generation; preserve any collectible there on respawn. The new ghost is not in the current collision snapshot and therefore cannot collide until a later tick.
- If the player is not powered, subtract one life. At zero or fewer lives, set `gameOver = true` without resetting positions. Otherwise, reset only the player's coordinates to `(1, 1)` and all existing ghosts' coordinates to `(18, 1)`. Retain the player's facing, animation state, and timers and each ghost's direction and movement timer. Retain score and the partly eaten maze. Do not add invulnerability or a countdown.
- Continue the collision snapshot loop after a collision, using current mutable positions. Do not insert an early break when lives reach zero: simultaneous collisions can reduce lives below zero, as in the source.
- Once an active tick finishes with `gameOver = true`, freeze movement, mouth animation, and timers, but continue rendering the board. Winning and losing use the same terminal flag. If lives are zero or negative, show the loss message; otherwise show the win message.
- Space has no effect during active play. A fresh Space press after game over resets score to 0, lives to 3, player state, all four ghosts at their initial positions, and the entire maze using a new random layout. Resume immediately. Arrow presses processed while game over are ignored. An arrow already held during restart must be released and pressed again to move.

## Drawing specification

Render in this order: black background, maze, player, ghosts in list order, score and lives, then terminal message. Use flat opaque colors, with no textures, shadows, gradients, grid outlines, or decorative interface. Entities are drawn even if their cell is a wall.

### Maze

- Walls are solid pure blue `#0000ff` rectangles covering the full cell, with square corners and no gaps.
- Empty floor is black `#000000`.
- Regular dots are white `#ffffff` 4 × 4 squares centered in the cell, with top-left at `(x * 40 + 18, y * 40 + 18)`.
- Power pellets are white circles of radius 8 centered at `(x * 40 + 20, y * 40 + 20)`. They do not blink.

### Player

- Color is yellow `#ffff00`; center is the cell center and radius is 18 pixels. Power does not change player appearance.
- Preserve the source's unusual directional arc rendering rather than replacing it with a conventional mouth wedge in every direction. With mouth open, draw a filled circular sector spanning these mathematical angles, measured counterclockwise with 0° pointing right and 90° pointing up:

| Facing | Start angle | End angle |
| --- | --- | --- |
| Right | 30° | 330° |
| Left | 150° | 210° |
| Up | 60° | 120° |
| Down | 240° | 300° |

- The right-facing open frame fills a 300° sector, leaving a 60° gap on the right. The other open frames fill only the listed 60° sector. This asymmetry approximates the Python renderer's 18-pixel-thick arc inside a 36 × 36 box and is intentional. For Canvas, use the cell center, a line to the start point, `arc` with negative start/end radians and `counterclockwise = true`, then close and fill the path. Do not draw a thin arc outline.
- When the mouth is closed, draw a full yellow circle of radius 18 regardless of facing. The original draws a narrow-angle arc first and then covers it with this circle; only the resulting full circle matters.

### Ghosts

- Use the normal color from the table, or pure blue `#0000ff` for every ghost while the player is powered.
- At cell center `(cx, cy)`, draw a circle of radius 18, then a rectangle at `(cx - 18, cy)` of width 36 and height 18.
- Draw three skirt circles of radius 6 centered at `(cx - 9, cy + 18)`, `(cx, cy + 18)`, and `(cx + 9, cy + 18)`. Let the skirt extend beyond its cell.
- Draw white eye circles of radius 6 centered at `(cx - 6, cy - 6)` and `(cx + 6, cy - 6)`.
- Draw black pupils of radius 3 inside each eye. For direction `(dx, dy)`, offset pupils by `Math.floor(dx * 3 / 2)` horizontally and `Math.floor(dy * 3 / 2)` vertically; this preserves Python's floor division, including the negative offsets.

### Text

- Use a locally available sans-serif font at approximately 36 pixels, normal weight, with a top-aligned text baseline. No external font is needed; browser glyph metrics may differ from Pygame's default font.
- Draw white `Score: {score}` at `(10, 10)` and white `Lives: {lives}` at `(680, 10)`. These overlay the top wall row; do not reserve a separate HUD area or background panel.
- On game over with lives <= 0, draw red `Game Over! Press SPACE to restart` at `(200, 300)`.
- On game over with lives > 0, draw yellow `You Win! Press SPACE to restart` at `(200, 300)`.
- Use those fixed message coordinates, not measured text centering. Leave the board visible with no modal or dimming layer.

## Verification before delivery

Check that the file opens offline without console errors or network requests. Verify normal play and use temporary controlled maze/state setups to check rare cases; remove debugging controls before delivery:

- Across many generated mazes and restarts, flood-fill from the player spawn and verify every floor cell and collectible is reachable, all ghost spawn cells are walkable with an exit, and boundary walls remain intact. Also verify board dimensions, empty player spawn, entity colors and positions, draw order, HUD, and mouth timing.
- Each fresh arrow press moves exactly one cell when unblocked. Holding an arrow across many ticks and repeated keydown events causes no additional movement; releasing and pressing again moves one more cell. A blocked press is not retried later. Holding an arrow through restart does not move the player. Browser scrolling is suppressed and queued input is cleared on blur.
- Dots score 10, pellets score 50, eaten ghosts score 200, and consumed collectibles disappear. Power refreshes on another pellet and expires after its tick countdown.
- Ghosts advance once per 15 ticks, continue straight until blocked, can reverse when blocked, and remain stationary when trapped. Powered ghosts keep their normal movement behavior.
- Powered collisions immediately respawn the same-colored ghost at the center. Unpowered collisions decrement lives and apply the exact coordinate-only reset. Cell swaps and intermediate movement positions do not cause collisions.
- Clearing all collectibles wins; exhausting lives loses. Both endings freeze simulation and display the correct text. Space fully resets only after an ending. Escape stops the game.
- Simulation timing is consistent across display refresh rates, and returning from a hidden tab does not fast-forward the game.

Deliver the working file and brief instructions to open it and use arrows, Space after an ending, and Escape. Report what you actually verified and any unavailable browser checks. Do not require the user to supply assets, references, or missing gameplay decisions.
