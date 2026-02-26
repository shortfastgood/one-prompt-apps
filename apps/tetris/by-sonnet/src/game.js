// ===================================================
//  Game – state machine, scoring, and game loop
// ===================================================

import { Board, Piece, BUFFER_ROWS } from './board.js';
import { newBag } from './tetrominos.js';

export const STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

// Points for clearing n lines at a given level
const LINE_POINTS = [0, 100, 300, 500, 800];

// Fall interval (ms) per level (1-indexed, capped at level 15)
function fallInterval(level) {
  const speeds = [
    800, 720, 630, 550, 470, 380, 300, 220, 140, 80,
    80,  80,  70,  70,  60,
  ];
  return speeds[Math.min(level, speeds.length) - 1];
}

const NEXT_QUEUE_SIZE = 3;
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

export class Game {
  constructor() {
    this.board = new Board();
    this.state = STATE.IDLE;
    this._bag = [];
    this._nextQueue = [];
    this.current = null;
    this.held = null;
    this.holdUsed = false;

    this.score = 0;
    this.level = 1;
    this.lines = 0;

    this._lastFall = 0;
    this._lockTimer = null;
    this._lockResets = 0;
    this._raf = null;

    this.onUpdate = null;   // callback(game)
    this.onLinesClear = null; // callback(n)
  }

  // -----------------------------------------------
  //  Public API
  // -----------------------------------------------

  start() {
    this.board.reset();
    this._bag = [];
    this._nextQueue = [];
    this.current = null;
    this.held = null;
    this.holdUsed = false;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this._lockTimer = null;
    this._lockResets = 0;

    // Fill the queue
    while (this._nextQueue.length < NEXT_QUEUE_SIZE) {
      this._nextQueue.push(this._drawNext());
    }

    this.state = STATE.PLAYING;
    this._spawnPiece();
    this._lastFall = performance.now();
    this._loop(performance.now());
  }

  pause() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.PAUSED) return;
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      if (this._raf) cancelAnimationFrame(this._raf);
    } else {
      this.state = STATE.PLAYING;
      this._lastFall = performance.now();
      this._loop(performance.now());
    }
    this._notify();
  }

  moveLeft()  { this._move(-1, 0); }
  moveRight() { this._move( 1, 0); }
  softDrop()  { this._move( 0, 1, true); }

  rotateCW()  { this._rotate(+1); }
  rotateCCW() { this._rotate(-1); }

  hardDrop() {
    if (this.state !== STATE.PLAYING || !this.current) return;
    const dropped = this.board.hardDrop(this.current);
    this.score += dropped * 2;
    this._lockPiece();
  }

  hold() {
    if (this.state !== STATE.PLAYING || !this.current || this.holdUsed) return;
    const type = this.current.type;
    if (this.held) {
      this.current = new Piece(this.held);
      this._centerSpawn(this.current);
    } else {
      this._spawnNext();
    }
    this.held = type;
    this.holdUsed = true;
    this._clearLockTimer();
    this._notify();
  }

  // -----------------------------------------------
  //  Internal helpers
  // -----------------------------------------------

  _drawNext() {
    if (this._bag.length === 0) this._bag = newBag();
    return this._bag.pop();
  }

  _spawnPiece() {
    this.current = new Piece(this._nextQueue.shift());
    this._nextQueue.push(this._drawNext());
    this._centerSpawn(this.current);

    if (!this.board.isValid(this.current)) {
      this._endGame();
    }
  }

  _spawnNext() {
    this._spawnPiece();
  }

  _centerSpawn(piece) {
    piece.x = 3;
    piece.y = -BUFFER_ROWS;
  }

  _move(dx, dy, isSoftDrop = false) {
    if (this.state !== STATE.PLAYING || !this.current) return;
    const ok = this.board.move(this.current, dx, dy);
    if (ok) {
      if (isSoftDrop) this.score += 1;
      // If moving horizontally while lock timer is active, count as a reset
      if (dx !== 0 && this._lockTimer !== null) {
        this._resetLockTimer();
      }
      this._notify();
    }
  }

  _rotate(dir) {
    if (this.state !== STATE.PLAYING || !this.current) return;
    const ok = this.board.rotate(this.current, dir);
    if (ok) {
      if (this._lockTimer !== null) {
        this._resetLockTimer();
      }
      this._notify();
    }
  }

  _lockPiece() {
    this._clearLockTimer();
    const linesCleared = this.board.lock(this.current);
    this.current = null;

    if (linesCleared > 0) {
      this.lines += linesCleared;
      this.score += LINE_POINTS[linesCleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      if (this.onLinesClear) this.onLinesClear(linesCleared);
    }

    if (this.board.isTopOut()) {
      this._endGame();
      return;
    }

    this.holdUsed = false;
    this._spawnPiece();
    this._lastFall = performance.now();
    this._notify();
  }

  _endGame() {
    this.state = STATE.GAMEOVER;
    cancelAnimationFrame(this._raf);
    this._notify();
  }

  _startLockTimer() {
    if (this._lockTimer !== null) return;
    this._lockTimer = setTimeout(() => this._lockPiece(), LOCK_DELAY_MS);
  }

  _clearLockTimer() {
    if (this._lockTimer !== null) {
      clearTimeout(this._lockTimer);
      this._lockTimer = null;
    }
  }

  _resetLockTimer() {
    if (this._lockResets >= MAX_LOCK_RESETS) return;
    this._lockResets++;
    this._clearLockTimer();
    this._startLockTimer();
  }

  _notify() {
    if (this.onUpdate) this.onUpdate(this);
  }

  // -----------------------------------------------
  //  Game loop (gravity)
  // -----------------------------------------------

  _loop(ts) {
    if (this.state !== STATE.PLAYING) return;

    const interval = fallInterval(this.level);

    if (ts - this._lastFall >= interval) {
      this._lastFall = ts;
      if (this.current) {
        const fell = this.board.move(this.current, 0, 1);
        if (!fell) {
          // Piece has landed – start lock delay
          if (this._lockTimer === null) {
            this._lockResets = 0;
            this._startLockTimer();
          }
        } else {
          this._clearLockTimer();
          this._lockResets = 0;
        }
        this._notify();
      }
    }

    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }
}
