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

- The board contains 30 × 20 cells on a 1200 × 800 canvas, scaled to fit smaller windows. A fresh random maze is generated on load and on every restart; a connectivity pass guarantees every floor cell and collectible is reachable.
- A fixed ghost house sits in the center of every maze, with a door on its top wall. The red ghost starts just outside the door; the other five (pink, cyan, orange, green, violet) wait inside and jump out one by one, every fifteen seconds.
- The player moves one cell every six ticks. White dots award 10 points. Larger power pellets award 50 points and turn all ghosts blue for five seconds. Another pellet refreshes the duration.
- Ghosts move one cell every fifteen ticks. They continue straight until blocked, then choose a random available direction. They can reverse direction and overlap each other.
- Touching a blue ghost awards 200 points and immediately respawns it in the ghost house, released again after fifteen seconds. Power does not change ghost speed or direction choices.
- Touching a ghost without power costs one life. With lives remaining, the player returns to the upper-left starting cell and every ghost returns to its initial position and release schedule. Score and collected dots are retained.
- Collect every dot and power pellet to win. Losing all three lives ends the game. Space after either ending resets the score, lives, characters, and maze.
- Simulation runs at a fixed 60 ticks per second and suspends while the browser tab is hidden, without fast-forwarding on return. Ghosts and power timers continue while the player stands still in a visible tab.

## Source

- `index.html`: page layout, styling, maze generation and connectivity, keyboard input, game rules, animation, and Canvas rendering.
- [`pacman.prompt.md`](../../../prompts/pacman.prompt.md): self-contained implementation specification.

The game has no persistent data or backend. Reloading starts a new game.
