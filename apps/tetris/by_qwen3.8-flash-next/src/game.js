// Game state: board, pieces, scoring, levels. Rendering and input live elsewhere.

import { PIECES, rotateCW, rotateCCW } from './pieces.js';

const COLS = 10;
const ROWS = 20;

// Wall-kick offsets [row, col] tried in order when a rotation fails.
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

const LINE_SCORES = [0, 100, 300, 500, 800];

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.over = false;
    this.paused = false;
    this.hold = null;
    this.canHold = true;
    this.next = [this.#draw(), this.#draw(), this.#draw()];
    this.#spawn();
  }

  // Speed of gravity, in ms per row, for the current level.
  dropInterval() {
    return Math.max(100, 1000 - (this.level - 1) * 100);
  }

  // Advance gravity by one step: move down, or lock when grounded.
  step() {
    if (this.#collides(this.piece.shape, this.piece.row + 1, this.piece.col)) {
      this.#lock();
    } else {
      this.piece.row++;
    }
  }

  move(dir) {
    if (this.over || this.paused) return;
    if (!this.#collides(this.piece.shape, this.piece.row, this.piece.col + dir)) {
      this.piece.col += dir;
    }
  }

  rotate(dir) {
    if (this.over || this.paused) return;
    const shape =
      dir === 1 ? rotateCW(this.piece.shape) : rotateCCW(this.piece.shape);
    for (const [dr, dc] of KICKS) {
      if (!this.#collides(shape, this.piece.row + dr, this.piece.col + dc)) {
        this.piece = { ...this.piece, shape, row: this.piece.row + dr, col: this.piece.col + dc };
        return;
      }
    }
  }

  softDrop() {
    if (this.over || this.paused) return;
    if (!this.#collides(this.piece.shape, this.piece.row + 1, this.piece.col)) {
      this.piece.row++;
      this.score += 1;
    }
  }

  hardDrop() {
    if (this.over || this.paused) return;
    let dist = 0;
    while (!this.#collides(this.piece.shape, this.piece.row + 1, this.piece.col)) {
      this.piece.row++;
      dist++;
    }
    this.score += dist * 2;
    this.#lock();
  }

  holdPiece() {
    if (this.over || this.paused || !this.canHold) return;
    const current = this.piece.type;
    if (this.hold === null) {
      this.hold = current;
      this.#spawn();
    } else {
      const shape = PIECES[this.hold].shape.map((r) => r.slice());
      const col = Math.floor((COLS - shape[0].length) / 2);
      this.piece = { type: this.hold, shape, row: 0, col };
      this.hold = current;
      if (this.#collides(shape, 0, col)) this.over = true;
    }
    this.canHold = false;
  }

  // Row where the current piece would land (for the ghost piece).
  ghostRow() {
    let r = this.piece.row;
    while (!this.#collides(this.piece.shape, r + 1, this.piece.col)) r++;
    return r;
  }

  #draw() {
    if (this.bag.length === 0) this.bag = shuffled(Object.keys(PIECES));
    return this.bag.pop();
  }

  #collides(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const y = row + r;
        const x = col + c;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && this.board[y][x] !== null) return true;
      }
    }
    return false;
  }

  #spawn() {
    const type = this.next.shift();
    this.next.push(this.#draw());
    const shape = PIECES[type].shape.map((r) => r.slice());
    const col = Math.floor((COLS - shape[0].length) / 2);
    this.piece = { type, shape, row: 0, col };
    this.canHold = true;
    if (this.#collides(shape, 0, col)) this.over = true;
  }

  #lock() {
    const { shape, row, col, type } = this.piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) this.board[row + r][col + c] = PIECES[type].color;
      }
    }
    this.#clearLines();
    this.#spawn();
  }

  #clearLines() {
    const full = this.board.filter((row) => row.every((cell) => cell !== null)).length;
    if (full === 0) return;
    this.board = this.board.filter((row) => row.some((cell) => cell === null));
    while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(null));
    this.score += LINE_SCORES[full] * this.level;
    this.lines += full;
    this.level = Math.floor(this.lines / 10) + 1;
  }
}
