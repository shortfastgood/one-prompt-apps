// ===================================================
//  Renderer – canvas drawing for board, pieces, UI
// ===================================================

import { COLS, ROWS, BUFFER_ROWS, Piece } from './board.js';
import { PIECES } from './tetrominos.js';
import { STATE } from './game.js';

const CELL = 32;            // pixels per cell
const BORDER = 1;           // inner cell border
const GHOST_ALPHA = 0.22;

export class Renderer {
  constructor(game) {
    this.game = game;

    // Main board canvas
    this.canvas = document.getElementById('board-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width  = COLS * CELL;
    this.canvas.height = ROWS * CELL;

    // Hold preview canvas
    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');

    // Next piece canvases
    this.nextCanvases = [0, 1, 2].map(i => {
      const c = document.getElementById(`next-canvas-${i}`);
      c.width  = 100;
      c.height = i === 0 ? 100 : 80;
      return { canvas: c, ctx: c.getContext('2d'), scale: i === 0 ? 1 : 0.8 };
    });

    // Overlay elements
    this.overlay      = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayMsg   = document.getElementById('overlay-message');
    this.overlayBtn   = document.getElementById('overlay-btn');
    this.overlayScoreBlock = document.getElementById('overlay-score-block');
    this.pauseOverlay  = document.getElementById('pause-overlay');

    // Stat elements
    this.scoreEl = document.getElementById('score-value');
    this.levelEl = document.getElementById('level-value');
    this.linesEl = document.getElementById('lines-value');
    this.finalScore = document.getElementById('final-score');
    this.finalLevel = document.getElementById('final-level');
    this.finalLines = document.getElementById('final-lines');

    // Start with "press play" overlay
    this._showStartOverlay();
  }

  // -----------------------------------------------
  //  Public: called on every game update
  // -----------------------------------------------

  render(game) {
    this._drawBoard(game);
    this._drawStats(game);
    this._drawHold(game);
    this._drawNext(game);
    this._updateOverlays(game);
  }

  // -----------------------------------------------
  //  Board
  // -----------------------------------------------

  _drawBoard(game) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Background
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, width, height);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, height); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(width, r * CELL); ctx.stroke();
    }

    // Locked cells
    const grid = game.board.visibleGrid;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          this._drawCell(ctx, c, r, grid[r][c]);
        }
      }
    }

    if (game.state === STATE.PLAYING && game.current) {
      // Ghost piece
      const ghost = game.board.getGhost(game.current);
      const ghostColor = PIECES[ghost.type].color;
      const cells = ghost.cells;
      for (let i = 0; i < 16; i++) {
        if (!cells[i]) continue;
        const col = ghost.x + (i % 4);
        const row = ghost.y + Math.floor(i / 4) - BUFFER_ROWS;
        if (row < 0 || row >= ROWS) continue;
        this._drawGhostCell(ctx, col, row, ghostColor);
      }

      // Active piece
      const { current } = game;
      const color = PIECES[current.type].color;
      const pcells = current.cells;
      for (let i = 0; i < 16; i++) {
        if (!pcells[i]) continue;
        const col = current.x + (i % 4);
        const row = current.y + Math.floor(i / 4) - BUFFER_ROWS;
        if (row < 0 || row >= ROWS) continue;
        this._drawCell(ctx, col, row, color);
      }
    }
  }

  _drawCell(ctx, col, row, color) {
    const x = col * CELL + BORDER;
    const y = row * CELL + BORDER;
    const s = CELL - BORDER * 2;

    // Base fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    // Top/left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, s, 3);
    ctx.fillRect(x, y, 3, s);

    // Bottom/right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y + s - 3, s, 3);
    ctx.fillRect(x + s - 3, y, 3, s);
  }

  _drawGhostCell(ctx, col, row, color) {
    const x = col * CELL + BORDER;
    const y = row * CELL + BORDER;
    const s = CELL - BORDER * 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------
  //  Preview helpers
  // -----------------------------------------------

  _drawPreviewPiece(ctx, canvasWidth, canvasHeight, type, scale = 1) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!type) return;

    const cells = Piece.getCells(type, 0);
    const color = PIECES[type].color;
    const cellSize = Math.floor(CELL * scale);

    // Bounding box
    let minC = 4, maxC = -1, minR = 4, maxR = -1;
    for (let i = 0; i < 16; i++) {
      if (!cells[i]) continue;
      const c = i % 4, r = Math.floor(i / 4);
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }
    const pieceW = (maxC - minC + 1) * cellSize;
    const pieceH = (maxR - minR + 1) * cellSize;
    const ox = Math.round((canvasWidth  - pieceW) / 2);
    const oy = Math.round((canvasHeight - pieceH) / 2);

    for (let i = 0; i < 16; i++) {
      if (!cells[i]) continue;
      const c = (i % 4) - minC;
      const r = Math.floor(i / 4) - minR;
      const x = ox + c * cellSize + 1;
      const y = oy + r * cellSize + 1;
      const s = cellSize - 2;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y, s, 3);
      ctx.fillRect(x, y, 3, s);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x, y + s - 3, s, 3);
      ctx.fillRect(x + s - 3, y, 3, s);
    }
  }

  _drawHold(game) {
    const { holdCanvas: c, holdCtx: ctx } = this;
    ctx.clearRect(0, 0, c.width, c.height);

    // Dim if hold was used this turn
    ctx.globalAlpha = game.holdUsed ? 0.35 : 1;
    this._drawPreviewPiece(ctx, c.width, c.height, game.held, 0.85);
    ctx.globalAlpha = 1;
  }

  _drawNext(game) {
    game._nextQueue.forEach((type, i) => {
      const { canvas: c, ctx, scale } = this.nextCanvases[i];
      this._drawPreviewPiece(ctx, c.width, c.height, type, scale * 0.85);
    });
    // Clear any unused slots
    for (let i = game._nextQueue.length; i < this.nextCanvases.length; i++) {
      const { canvas: c, ctx } = this.nextCanvases[i];
      ctx.clearRect(0, 0, c.width, c.height);
    }
  }

  // -----------------------------------------------
  //  Stats
  // -----------------------------------------------

  _drawStats(game) {
    this.scoreEl.textContent = game.score.toLocaleString();
    this.levelEl.textContent = game.level;
    this.linesEl.textContent = game.lines;
  }

  // -----------------------------------------------
  //  Overlays
  // -----------------------------------------------

  _showStartOverlay() {
    this.overlayTitle.textContent = 'TETRIS';
    this.overlayMsg.textContent = 'Press PLAY or hit any key to start';
    this.overlayScoreBlock.classList.add('hidden');
    this.overlayBtn.textContent = 'PLAY';
    this.overlay.classList.remove('hidden');
    this.pauseOverlay.classList.add('hidden');
  }

  _updateOverlays(game) {
    if (game.state === STATE.GAMEOVER) {
      this.overlayTitle.textContent = 'GAME OVER';
      this.overlayMsg.textContent = '';
      this.finalScore.textContent = game.score.toLocaleString();
      this.finalLevel.textContent = game.level;
      this.finalLines.textContent = game.lines;
      this.overlayScoreBlock.classList.remove('hidden');
      this.overlayBtn.textContent = 'RESTART';
      this.overlay.classList.remove('hidden');
      this.pauseOverlay.classList.add('hidden');
    } else if (game.state === STATE.PAUSED) {
      this.overlay.classList.add('hidden');
      this.pauseOverlay.classList.remove('hidden');
    } else if (game.state === STATE.PLAYING) {
      this.overlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
    }
  }
}
