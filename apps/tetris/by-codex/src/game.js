import {
  BOARD_ROWS,
  BOARD_WIDTH,
  DROP_SCORES,
  HIDDEN_ROWS,
  LINE_CLEAR_SCORES,
  LINES_PER_LEVEL,
  LOCK_DELAY_MS,
  PREVIEW_COUNT,
  SOFT_DROP_SPEED_FACTOR,
  createEmptyBoard,
  getFallIntervalMs,
} from "./constants.js";
import { BagRandomizer } from "./randomBag.js";
import { createSpawnPiece, getKickTests, getPieceCells } from "./tetrominoes.js";

function normalizeRotation(rotation) {
  return ((rotation % 4) + 4) % 4;
}

function clonePiece(piece) {
  return piece ? { ...piece } : null;
}

export class TetrisGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createEmptyBoard();
    this.bag = new BagRandomizer();
    this.activePiece = null;
    this.holdType = null;
    this.canHold = true;

    this.score = 0;
    this.lines = 0;
    this.level = 1;

    this.gravityAccumulator = 0;
    this.lockAccumulator = 0;
    this.softDropActive = false;

    this.isPaused = false;
    this.isGameOver = false;

    this.spawnNextPiece();
  }

  getState() {
    return {
      board: this.board,
      activePiece: clonePiece(this.activePiece),
      ghostPiece: this.getGhostPiece(),
      holdType: this.holdType,
      nextQueue: this.bag.peek(PREVIEW_COUNT),
      score: this.score,
      lines: this.lines,
      level: this.level,
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
    };
  }

  update(deltaMs) {
    if (this.isPaused || this.isGameOver || !this.activePiece) {
      return;
    }

    const clampedDelta = Math.min(deltaMs, 100);
    this.gravityAccumulator += clampedDelta;

    const baseInterval = getFallIntervalMs(this.level);
    const fallInterval = this.softDropActive
      ? Math.max(16, Math.floor(baseInterval / SOFT_DROP_SPEED_FACTOR))
      : baseInterval;

    while (this.gravityAccumulator >= fallInterval) {
      this.gravityAccumulator -= fallInterval;
      const moved = this.tryMove(0, 1, {
        awardSoftDrop: this.softDropActive,
        resetLock: false,
      });
      if (!moved) {
        break;
      }
    }

    if (this.isGrounded()) {
      this.lockAccumulator += clampedDelta;
      if (this.lockAccumulator >= LOCK_DELAY_MS) {
        this.lockPiece();
      }
    } else {
      this.lockAccumulator = 0;
    }
  }

  togglePause() {
    if (this.isGameOver) {
      return this.isPaused;
    }
    this.isPaused = !this.isPaused;
    this.softDropActive = false;
    this.gravityAccumulator = 0;
    return this.isPaused;
  }

  restart() {
    this.reset();
  }

  moveLeft() {
    return this.tryMove(-1, 0, { resetLock: true });
  }

  moveRight() {
    return this.tryMove(1, 0, { resetLock: true });
  }

  softDropStep() {
    if (this.isPaused || this.isGameOver) {
      return false;
    }
    return this.tryMove(0, 1, {
      awardSoftDrop: true,
      resetLock: false,
    });
  }

  setSoftDropActive(active) {
    this.softDropActive = Boolean(active) && !this.isPaused && !this.isGameOver;
  }

  hardDrop() {
    if (this.isPaused || this.isGameOver || !this.activePiece) {
      return false;
    }

    let distance = 0;
    while (!this.wouldCollide(this.activePiece, 0, 1)) {
      this.activePiece.y += 1;
      distance += 1;
    }

    if (distance > 0) {
      this.score += distance * DROP_SCORES.hard;
    }

    this.lockPiece();
    return true;
  }

  rotateCW() {
    return this.rotate(1);
  }

  rotateCCW() {
    return this.rotate(-1);
  }

  hold() {
    if (this.isPaused || this.isGameOver || !this.activePiece || !this.canHold) {
      return false;
    }

    const currentType = this.activePiece.type;
    const heldType = this.holdType;
    this.holdType = currentType;
    this.canHold = false;
    this.gravityAccumulator = 0;
    this.lockAccumulator = 0;
    this.softDropActive = false;

    if (heldType) {
      this.spawnSpecificPiece(heldType);
    } else {
      this.spawnNextPiece();
    }

    return true;
  }

  spawnNextPiece() {
    this.spawnSpecificPiece(this.bag.next());
  }

  spawnSpecificPiece(type) {
    this.activePiece = createSpawnPiece(type);
    this.gravityAccumulator = 0;
    this.lockAccumulator = 0;

    if (this.collides(this.activePiece)) {
      this.isGameOver = true;
      this.softDropActive = false;
    }
  }

  rotate(direction) {
    if (this.isPaused || this.isGameOver || !this.activePiece) {
      return false;
    }

    const fromRotation = this.activePiece.rotation;
    const toRotation = normalizeRotation(fromRotation + direction);
    const kicks = getKickTests(this.activePiece.type, fromRotation, toRotation);

    for (const [dx, dy] of kicks) {
      const candidate = {
        ...this.activePiece,
        rotation: toRotation,
        x: this.activePiece.x + dx,
        y: this.activePiece.y + dy,
      };

      if (!this.collides(candidate)) {
        this.activePiece = candidate;
        this.lockAccumulator = 0;
        return true;
      }
    }

    return false;
  }

  tryMove(dx, dy, options = {}) {
    if (this.isPaused || this.isGameOver || !this.activePiece) {
      return false;
    }

    const { awardSoftDrop = false, resetLock = false } = options;
    const candidate = {
      ...this.activePiece,
      x: this.activePiece.x + dx,
      y: this.activePiece.y + dy,
    };

    if (this.collides(candidate)) {
      return false;
    }

    this.activePiece = candidate;

    if (awardSoftDrop && dy > 0) {
      this.score += dy * DROP_SCORES.soft;
    }

    if (resetLock) {
      this.lockAccumulator = 0;
    }

    return true;
  }

  collides(piece) {
    const cells = getPieceCells(piece.type, piece.rotation);
    for (const [cellX, cellY] of cells) {
      const x = piece.x + cellX;
      const y = piece.y + cellY;

      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_ROWS) {
        return true;
      }

      if (y >= 0 && this.board[y][x]) {
        return true;
      }
    }
    return false;
  }

  wouldCollide(piece, dx, dy) {
    return this.collides({
      ...piece,
      x: piece.x + dx,
      y: piece.y + dy,
    });
  }

  isGrounded() {
    if (!this.activePiece) {
      return false;
    }
    return this.wouldCollide(this.activePiece, 0, 1);
  }

  lockPiece() {
    if (!this.activePiece || this.isGameOver) {
      return;
    }

    let toppedOut = false;
    const cells = getPieceCells(this.activePiece.type, this.activePiece.rotation);

    for (const [cellX, cellY] of cells) {
      const x = this.activePiece.x + cellX;
      const y = this.activePiece.y + cellY;

      if (y < 0) {
        toppedOut = true;
        continue;
      }

      if (y >= 0 && y < BOARD_ROWS && x >= 0 && x < BOARD_WIDTH) {
        if (y < HIDDEN_ROWS) {
          toppedOut = true;
        }
        this.board[y][x] = this.activePiece.type;
      }
    }

    const cleared = this.clearLines();
    if (cleared > 0) {
      this.score += (LINE_CLEAR_SCORES[cleared] ?? 0) * this.level;
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / LINES_PER_LEVEL);
    }

    if (toppedOut) {
      this.isGameOver = true;
      this.softDropActive = false;
      return;
    }

    this.canHold = true;
    this.spawnNextPiece();
  }

  clearLines() {
    let cleared = 0;
    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      if (this.board[row].every(Boolean)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(null));
        cleared += 1;
        row += 1;
      }
    }
    return cleared;
  }

  getGhostPiece() {
    if (!this.activePiece) {
      return null;
    }

    const ghost = { ...this.activePiece };
    while (!this.collides({ ...ghost, y: ghost.y + 1 })) {
      ghost.y += 1;
    }
    return ghost;
  }
}
