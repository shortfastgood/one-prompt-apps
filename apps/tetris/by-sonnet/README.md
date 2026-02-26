# Tetris

A complete, playable Tetris implementation built as a single-prompt app.

## Play

Open `index.html` directly in a browser — no build step required. Because the code uses ES modules you need to serve it from a local HTTP server (or use VS Code's Live Server extension):

```bash
# Python
python -m http.server 8080
# Node
npx serve .
```

Then navigate to `http://localhost:8080`.

## Controls

| Key | Action |
|-----|--------|
| ← → | Move left / right |
| ↑ or Z | Rotate clockwise |
| X | Rotate counter-clockwise |
| ↓ | Soft drop |
| Space | Hard drop |
| C / Shift | Hold piece |
| P / Esc | Pause / Resume |
| R | Restart |

## Features

- **10 × 20 playfield** with 2 hidden buffer rows for spawning
- **7-bag randomiser** – all 7 tetrominos appear before any repeats
- **SRS (Super Rotation System)** with full wall-kick tables for all pieces
- **Ghost piece** shows where the active piece will land
- **Hold queue** – hold one piece per drop (grayed out when unavailable)
- **Next queue** – previews the next 3 pieces
- **Lock delay** with up to 15 movement/rotation resets (500 ms timer)
- **DAS / ARR** – smooth auto-repeat for horizontal movement and soft drop
- **Scoring** – standard Tetris points (×level): 1L=100, 2L=300, 3L=500, 4L=800
- **Soft drop** earns 1 pt/cell, **hard drop** earns 2 pts/cell
- **15 speed levels** – gravity accelerates from 800 ms/row down to 60 ms/row
- Level advances every 10 lines cleared
- **Visual feedback** – canvas glow flash on line clears (colour varies with count)
- **Pause / Game Over** overlays with final stats

## File structure

```
tetris/
  index.html        – markup + layout
  styles.css        – dark-theme styling
  src/
    tetrominos.js   – piece shapes, colours, SRS wall-kick tables, 7-bag
    board.js        – 10×22 grid, collision, line clearing, ghost, SRS rotate
    game.js         – state machine, gravity loop, scoring, hold/next queue
    renderer.js     – canvas drawing (board, pieces, ghost, previews, overlays)
    input.js        – keyboard events with DAS/ARR
    main.js         – wires everything together
```
