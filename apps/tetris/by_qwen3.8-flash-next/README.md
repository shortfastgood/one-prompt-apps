# Tetris — by qwen3.8-flash-next

A playable, modular Tetris implementation. No build step, no dependencies.

## Play

Serve the folder over HTTP (ES modules require it) and open `index.html`:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/index.html
```

## Controls

| Key | Action |
|-----|--------|
| ← / A | Move left |
| → / D | Move right |
| ↓ / S | Soft drop (1 pt/cell) |
| ↑ / W / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| Space | Hard drop (2 pts/cell) |
| C | Hold piece (once per drop) |
| P / Esc | Pause / resume |
| R | Restart |

## Features

- 10 × 20 playfield, seven tetrominoes with a 7-bag randomizer
- Rotation with wall-kick offsets; ghost piece shows the landing spot
- Hold slot and 3-piece next queue
- Line-clear scoring (100/300/500/800 × level), level up every 10 lines,
  gravity speeds up per level (1000 ms → 100 ms per row)
- Game over when a new piece spawns into an occupied cell
- On-screen stats (score, level, lines) and pause/restart buttons

## Structure

```text
index.html      – markup
styles.css      – styling
src/pieces.js   – tetromino shapes + rotation
src/game.js     – game state (board, scoring, levels)
src/render.js   – canvas drawing
src/main.js     – wiring: input, loop, stats
```
