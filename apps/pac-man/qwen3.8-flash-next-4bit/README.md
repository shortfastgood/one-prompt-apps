# Pac-Man

A self-contained maze game, written in JavaScript with HTML5 Canvas. No libraries, installation, build step, CDN, fonts, images, or network access are required. The maze and characters are drawn by the game.

## Play

Open **index.html** in a current browser. It works directly from disk. Alternatively, serve this directory:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

The game starts immediately with a new random maze and three lives.

| Control | Action |
| --- | --- |
| Arrow keys | Move one cell per fresh press |
| Space | Start a new game after winning or losing |
| Escape | Stop the game until the page is reloaded |

Holding an arrow does not repeat movement. Release and press again to move another cell. Walls block movement. Escape freezes the last frame and disables gameplay input, including Space; reload the page to play again.

## Maze and ghosts

- The board contains 30 × 20 cells on a 1200 × 800 canvas, scaled to fit smaller windows. Every floor cell and collectible is reachable, and all ghost spawn positions have an exit.
- White dots award 10 points. Larger power pellets award 50 points and turn ghosts blue for five seconds. Another pellet refreshes the duration.
- Six ghosts move one cell every quarter-second (slightly slower than the player, who moves at one cell per third of a second). They continue straight until blocked, then choose a random available direction, which may include reversing. They may overlap each other.
- Ghosts leave their house on staggered delays, so the player acts alone briefly at the start.
- Touching a blue ghost awards 200 points and immediately respawns it in the house. Power does not change ghost speed.
- Touching a ghost without power costs one life. With lives remaining, the player returns to the upper-left starting cell and all ghosts return to their spawn positions with their original release schedules. Score and collected dots are retained.
- Collect every dot and power pellet to win. Losing all three lives ends the game. Space after either ending resets the score, lives, characters, and maze.
- Simulation runs at a fixed 60 ticks per second and suspends while the browser tab is hidden. Ghosts and power timers continue while the player stands still in a visible tab.

## Source

- `index.html`: page layout, styling, maze generation and connectivity, keyboard input, game rules, animation, and Canvas rendering.
- [`plan/pacman.verification.plan.md`](plan/pacman.verification.plan.md): plan for generating the verification suite.
- [`verification/`](verification/): the generated verification suite. `harness.cjs` extracts the inline script and runs it in a VM; `run.cjs` runs the tests with 100% line/branch/function coverage enforced on the extracted script. See [`verification/PATHS.md`](verification/PATHS.md) for the ID-to-test mapping.

The game has no persistent data or backend. Reloading starts a new game.
