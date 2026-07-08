// ===================================================
//  Game – state machine, 7-bag randomizer, scoring, gravity
// ===================================================

import { Board, Piece, BUFFER_ROWS } from './board.js';
import { newBag } from './tetrominos.js';

// Game states
export const STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

// Points for clearing n lines at a given level (Standard Nintendo scoring)
const LINE_POINTS = [0, 100, 300, 500, 800];

/**
 * Fall interval (ms) per level.
 * 15 speed tiers: level 1 (800ms) → level 15 (60ms).
 * After level 15, speed is capped.
 */
function fallInterval(level) {
  const speeds = [
    800, 720, 630, 550, 470, 380, 300, 220, 140, 80,   // levels 1-10
    80,  80,  70,  70,  60,                               // levels 11-15
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

    // Randomizer
    this._bag = [];
    this._nextQueue = [];

    // Current piece & hold
    this.current = null;
    this.held = null;
    this.holdUsed = false;

    // Stats
    this.score = 0;
    this.level = 1;
    this.lines = 0;

    // Timing & lock delay
    this._lastFall = 0;
    this._lockTimer = null;
    this._lockResets = 0;
    this._raf = null;

    // Callbacks
    this.onUpdate = null;   // callback(game)
    this.onLinesClear = null; // callback(n)
  }

  // -----------------------------------------------
  //  Public API
  // -----------------------------------------------

  /** Start (or restart) the game. */
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

    // Fill the next queue
    while (this._nextQueue.length < NEXT_QUEUE_SIZE) {
      this._nextQueue.push(this._drawNext());
    }

    this.state = STATE.PLAYING;
    this._spawnPiece();
    this._lastFall = performance.now();
    this._loop(performance.now());
  }

  /** Toggle pause/resume. */
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

  /** Move piece left by one cell. */
  moveLeft()  { this._move(-1, 0); }

  /** Move piece right by one cell. */
  moveRight() { this._move( 1, 0); }

  /** Soft drop: move piece down by one cell, awarding 1 point per cell. */
  softDrop()  { this._move( 0, 1, true); }

  /** Rotate piece clockwise. */
  rotateCW()  { this._rotate(+1); }

  /** Rotate piece counter-clockwise. */
  rotateCCW() { this._rotate(-1); }

  /**
   * Hard drop: move piece down as far as possible, awarding 2 points per cell.
   * Then lock the piece immediately.
   */
  hardDrop() {
    if (this.state !== STATE.PLAYING || !this.current) return;

    const dropped = this.board.hardDrop(this.current);
    this.score += dropped * 2;  // 2 points per cell
    this._lockPiece();
  }

  /**
   * Hold the current piece and bring up the next one.
   * Can only hold once per piece.
   */
  hold() {
    if (this.state !== STATE.PLAYING || !this.current || this.holdUsed) return;

    const type = this.current.type;

    if (this.held) {
      // Swap: bring back the held piece
      this.current = new Piece(this.held);
      this._centerSpawn(this.current);
    } else {
      // No held piece: spawn the next one from the queue
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

  /** Draw the next piece from the bag (refill if empty). */
  _drawNext() {
    if (this._bag.length === 0) {
      this._bag = newBag();
    }
    return this._bag.pop();
  }

  /** Spawn a new piece from the next queue. Check for game over. */
  _spawnPiece() {
    this.current = new Piece(this._nextQueue.shift());
    this._nextQueue.push(this._drawNext());
    this._centerSpawn(this.current);

    // If the new piece can't even spawn, it's game over
    if (!this.board.isValid(this.current)) {
      this._endGame();
    }
  }

  /** Spawn the next piece (called after a piece is locked). */
  _spawnNext() {
    this._spawnPiece();
  }

  /** Center a piece at the spawn position (column 3, row -2). */
  _centerSpawn(piece) {
    piece.x = 3;
    piece.y = -BUFFER_ROWS;
  }

  /**
   * Move the current piece by (dx, dy).
   * @param {number} dx
   * @param {number} dy
   * @param {boolean} isSoftDrop
   */
  _move(dx, dy, isSoftDrop = false) {
    if (this.state !== STATE.PLAYING || !this.current) return;

    const ok = this.board.move(this.current, dx, dy);
    if (ok) {
      if (isSoftDrop) {
        this.score += 1;  // 1 point per soft drop cell
      }

      // If moving horizontally while lock timer is active, reset the timer
      if (dx !== 0 && this._lockTimer !== null) {
        this._resetLockTimer();
      }

      this._notify();
    }
  }

  /**
   * Try to rotate the current piece.
   * If the rotation succeeds while the lock timer is active, reset it.
   */
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

  /**
   * Lock the current piece onto the board.
   * Handle line clears, level-ups, and game over conditions.
   */
  _lockPiece() {
    this._clearLockTimer();
    const linesCleared = this.board.lock(this.current);
    this.current = null;

    if (linesCleared > 0) {
      // Award points: base points × level
      this.lines += linesCleared;
      this.score += LINE_POINTS[linesCleared] * this.level;

      // Level up every 10 lines
      this.level = Math.floor(this.lines / 10) + 1;

      // Notify lines cleared callback
      if (this.onLinesClear) {
        this.onLinesClear(linesCleared);
      }
    }

    // Check for game over (any blocks in the top 2 rows)
    if (this.board.isTopOut()) {
      this._endGame();
      return;
    }

    // Reset hold flag and spawn the next piece
    this.holdUsed = false;
    this._spawnPiece();
    this._lastFall = performance.now();
    this._notify();
  }

  /** End the game. */
  _endGame() {
    this.state = STATE.GAMEOVER;
    cancelAnimationFrame(this._raf);
    this._notify();
  }

  /**
   * Start the lock delay timer.
   * The lock delay gives the player time to move/rotate before locking.
   */
  _startLockTimer() {
    if (this._lockTimer !== null) return;
    this._lockTimer = setTimeout(() => this._lockPiece(), LOCK_DELAY_MS);
  }

  /** Clear the lock delay timer. */
  _clearLockTimer() {
    if (this._lockTimer !== null) {
      clearTimeout(this._lockTimer);
      this._lockTimer = null;
    }
  }

  /**
   * Reset the lock delay timer (up to MAX_LOCK_RESETS times).
   * Called when the player moves or rotates while on the ground.
   */
  _resetLockTimer() {
    if (this._lockResets >= MAX_LOCK_RESETS) return;
    this._lockResets++;
    this._clearLockTimer();
    this._startLockTimer();
  }

  /** Notify the renderer of an update. */
  _notify() {
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }

  // -----------------------------------------------
  //  Game loop (gravity)
  // -----------------------------------------------

  /**
   * The main game loop.
   * Runs on requestAnimationFrame, applies gravity based on the current level.
   */
  _loop(ts) {
    if (this.state !== STATE.PLAYING) return;

    const interval = fallInterval(this.level);

    // Apply gravity
    if (ts - this._lastFall >= interval) {
      this._lastFall = ts;

      if (this.current) {
        const fell = this.board.move(this.current, 0, 1);

        if (!fell) {
          // Piece has landed on the ground
          if (this._lockTimer === null) {
            // Start the lock delay
            this._lockResets = 0;
            this._startLockTimer();
          }
        } else {
          // Piece is still falling – clear the lock timer
          this._clearLockTimer();
          this._lockResets = 0;
        }
        this._notify();
      }
    }

    // Schedule the next frame
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }
}
