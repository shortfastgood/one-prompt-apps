# Tetris Game implementation plan

We will build a clean, web-based Tetris MVP using HTML5 Canvas for the game board, and standard HTML/CSS for the UI. The game will follow standard modern Tetris rules where possible, though simplified for MVP (e.g., standard shapes, basic rotation).

## Proposed Changes

### Game Files

#### [NEW] [index.html](file:///Users/dden/gitroot/one-prompt-apps-g/tetris/index.html)
The main structure containing the canvas for the game board, side panels for the 'Hold' queue and 'Next' piece queue, and UI overlays for pause, game over, score, and level.

#### [NEW] [styles.css](file:///Users/dden/gitroot/one-prompt-apps-g/tetris/styles.css)
A sleek, dark-themed CSS styling to give it a modern arcade feel. Grid will be used for layout.

#### [NEW] [game.js](file:///Users/dden/gitroot/one-prompt-apps-g/tetris/game.js)
The core game loop and state management. Handles the requestAnimationFrame loop, key events, drawing to the canvas, and overall game integration.

#### [NEW] [tetrominoes.js](file:///Users/dden/gitroot/one-prompt-apps-g/tetris/tetrominoes.js)
Constants and definitions for the 7 standard shapes (I, J, L, O, S, T, Z) with their initial rotation states, colors.

#### [NEW] [board.js](file:///Users/dden/gitroot/one-prompt-apps-g/tetris/board.js)
The logic for the 10x20 grid, active piece state, collision detection, locking pieces, and clearing lines.

## Verification Plan

### Manual Verification
- Load `index.html` in a browser.
- Verify that moving (Left/Right) and soft dropping (Down) works cleanly.
- Verify that hard dropping (Space) locks the piece instantly.
- Verify rotation (Up) works without clipping walls.
- Verify hold mechanism works (C or Shift), and swaps/queues.
- Verify lines clear, score updates, and level advances correctly.
- Verify pause and game over states.
