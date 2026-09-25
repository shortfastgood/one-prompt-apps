// ===================================================
//  Board – 10×22 playfield (10 visible + 2 buffer rows)
// ===================================================

import { PIECES, WALL_KICKS_JLSTZ, WALL_KICKS_I } from './tetrominos.js';

export const COLS = 10;
export const ROWS = 20;
export const BUFFER_ROWS = 2;
const TOTAL_ROWS = ROWS + BUFFER_ROWS;

/**
 * A piece in flight: { type, rotation, x, y }
 * x is the column of the left edge of the 4×4 bounding box.
 * y is the row of the top edge of the 4×4 bounding box.
 */
export class Piece {
  constructor(type) {
    this.type = type;
    this.rotation = 0;
    this.x = 3;  // spawn column (centered in 10-col board)
    this.y = -BUFFER_ROWS;  // spawn just above the visible area
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
    // Total height = 22 (20 visible + 2 buffer rows above)
    this.grid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
  }

  reset() {
    for (let r = 0; r < TOTAL_ROWS; r++) {
      this.grid[r].fill(null);
    }
  }

  /**
   * Check if a piece at (piece.x, piece.y) with a given rotation is valid.
   * Allows offset parameters (dx, dy) for probes without mutating the piece.
   */
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
      if (row >= 0) {
        this.grid[row][col] = color;
      }
    }
    return this.clearLines();
  }

  /**
   * Remove any fully filled rows from bottom to top.
   * Returns the number of lines cleared.
   */
  clearLines() {
    let linesCleared = 0;

    // Scan from bottom up, removing full lines
    for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        // Remove this line and add a new empty line at the top
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(null));
        linesCleared++;
        r++;  // recheck this index (shifted down)
      }
    }

    return linesCleared;
  }

  /**
   * Compute ghost piece position (where the piece would land).
   */
  getGhost(piece) {
    const ghost = piece.clone();
    while (this.isValid(ghost, 0, 1)) {
      ghost.y++;
    }
    return ghost;
  }

  /**
   * Try to rotate a piece using SRS wall kicks. Returns true if successful.
   * @param {Piece} piece
   * @param {number} dir  +1 = CW, -1 = CCW
   */
  rotate(piece, dir) {
    // Calculate next rotation state (0-3)
    const nextRot = ((piece.rotation + dir) % 4 + 4) % 4;
    const from = piece.rotation;
    const to = nextRot;
    const key = `${from}>${to}`;

    // Select the correct wall kick table
    const kicks = (piece.type === 'I')
      ? WALL_KICKS_I
      : WALL_KICKS_JLSTZ;

    const tests = kicks[key] ?? [[0, 0]];

    // Try each kick offset until one works
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

  /**
   * Move piece by (dx, dy). Returns true if the move was valid.
   */
  move(piece, dx, dy) {
    if (this.isValid(piece, dx, dy)) {
      piece.x += dx;
      piece.y += dy;
      return true;
    }
    return false;
  }

  /**
   * Hard drop: move piece down as far as possible.
   * Returns the number of cells dropped.
   */
  hardDrop(piece) {
    let dropped = 0;
    while (this.isValid(piece, 0, 1)) {
      piece.y++;
      dropped++;
    }
    return dropped;
  }

  /**
   * Check if the board has any cells in the buffer rows (game over condition).
   */
  isTopOut() {
    for (let r = 0; r < BUFFER_ROWS; r++) {
      if (this.grid[r].some(cell => cell !== null)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get only the visible portion of the grid (rows BUFFER_ROWS .. BUFFER_ROWS+ROWS-1).
   */
  get visibleGrid() {
    return this.grid.slice(BUFFER_ROWS);
  }
}
