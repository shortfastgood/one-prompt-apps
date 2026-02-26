// ===================================================
//  Board – 10-column × 20-row playfield
// ===================================================

import { PIECES, WALL_KICKS_JLSTZ, WALL_KICKS_I } from './tetrominos.js';

export const COLS = 10;
export const ROWS = 20;
// Two hidden rows above the visible field (for spawning)
export const BUFFER_ROWS = 2;
const TOTAL_ROWS = ROWS + BUFFER_ROWS;

/** A piece in flight: { type, rotation, x, y } */
export class Piece {
  constructor(type) {
    this.type = type;
    this.rotation = 0;
    this.x = 3; // spawn column (left edge of the 4×4 bounding box)
    this.y = -BUFFER_ROWS; // spawn above visible area
  }

  get cells() {
    return Piece.getCells(this.type, this.rotation);
  }

  static getCells(type, rotation) {
    return PIECES[type].rotations[rotation];
  }

  clone() {
    const p = new Piece(this.type);
    p.rotation = this.rotation;
    p.x = this.x;
    p.y = this.y;
    return p;
  }
}

export class Board {
  constructor() {
    // grid[row][col] = null | colorString
    this.grid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
  }

  reset() {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      this.grid[r].fill(null);
    }
  }

  /** Check if a piece at (piece.x, piece.y) with given rotation is valid */
  isValid(piece, dx = 0, dy = 0, rotation = piece.rotation) {
    const cells = Piece.getCells(piece.type, rotation);
    for (let i = 0; i < 16; i++) {
      if (!cells[i]) continue;
      const col = piece.x + (i % 4) + dx;
      const row = piece.y + Math.floor(i / 4) + dy;
      if (col < 0 || col >= COLS) return false;
      if (row >= TOTAL_ROWS) return false;
      if (row >= 0 && this.grid[row][col]) return false;
    }
    return true;
  }

  /** Lock the piece onto the board. Returns number of lines cleared. */
  lock(piece) {
    const cells = piece.cells;
    const color = PIECES[piece.type].color;
    for (let i = 0; i < 16; i++) {
      if (!cells[i]) continue;
      const col = piece.x + (i % 4);
      const row = piece.y + Math.floor(i / 4);
      if (row >= 0) this.grid[row][col] = color;
    }
    return this.clearLines();
  }

  clearLines() {
    let linesCleared = 0;
    for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(null));
        linesCleared++;
        r++; // recheck same index
      }
    }
    return linesCleared;
  }

  /** Compute ghost piece position */
  getGhost(piece) {
    const ghost = piece.clone();
    while (this.isValid(ghost, 0, 1)) {
      ghost.y++;
    }
    return ghost;
  }

  /** Try to rotate a piece using SRS wall kicks. Returns true if successful. */
  rotate(piece, dir) {
    // dir: +1 = CW, -1 = CCW
    const nextRot = ((piece.rotation + dir) % 4 + 4) % 4;
    const from = piece.rotation;
    const to = nextRot;
    const key = `${from}>${to}`;
    const kicks = piece.type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
    const tests = kicks[key] ?? [[0, 0]];

    for (const [dx, dy] of tests) {
      if (this.isValid(piece, dx, dy, nextRot)) {
        piece.x += dx;
        piece.y += dy;
        piece.rotation = nextRot;
        return true;
      }
    }
    return false;
  }

  /** Move piece. Returns true if move was valid. */
  move(piece, dx, dy) {
    if (this.isValid(piece, dx, dy)) {
      piece.x += dx;
      piece.y += dy;
      return true;
    }
    return false;
  }

  /** Hard drop: move piece down as far as possible. Returns cells dropped. */
  hardDrop(piece) {
    let dropped = 0;
    while (this.isValid(piece, 0, 1)) {
      piece.y++;
      dropped++;
    }
    return dropped;
  }

  /** Check if the board has any cells in the buffer rows (game over condition) */
  isTopOut() {
    for (let r = 0; r < BUFFER_ROWS; r++) {
      if (this.grid[r].some(cell => cell !== null)) return true;
    }
    return false;
  }

  /** Get only the visible portion of the grid (rows BUFFER_ROWS .. BUFFER_ROWS+ROWS-1) */
  get visibleGrid() {
    return this.grid.slice(BUFFER_ROWS);
  }
}
