import { BOARD_ROWS, CELL_SIZE, HIDDEN_ROWS, PIECE_COLORS } from "./constants.js";
import { getPieceCells } from "./tetrominoes.js";

const BOARD_BG = "#091120";
const GRID_COLOR = "rgba(255,255,255,0.06)";

function darken(hex, amount = 0.2) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const scale = 1 - amount;
  const toHex = (n) =>
    Math.max(0, Math.min(255, Math.round(n * scale)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clearCanvas(ctx, width, height, fill = BOARD_BG) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, width, height, cellSize) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCell(ctx, gridX, gridY, size, color, alpha = 1) {
  const px = gridX * size;
  const py = gridY * size;
  const inset = 2;
  const innerX = px + inset;
  const innerY = py + inset;
  const innerSize = size - inset * 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = darken(color, 0.5);
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.fillStyle = color;
  ctx.fillRect(innerX, innerY, innerSize, innerSize);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillRect(innerX, innerY, innerSize, Math.max(2, innerSize * 0.16));
  ctx.strokeStyle = darken(color, 0.3);
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerSize - 1, innerSize - 1);
  ctx.restore();
}

function drawPlayfieldPiece(ctx, piece, alpha = 1) {
  if (!piece) {
    return;
  }

  for (const [cellX, cellY] of getPieceCells(piece.type, piece.rotation)) {
    const x = piece.x + cellX;
    const y = piece.y + cellY - HIDDEN_ROWS;
    if (y < 0) {
      continue;
    }
    drawCell(ctx, x, y, CELL_SIZE, PIECE_COLORS[piece.type], alpha);
  }
}

function drawPreviewPiece(ctx, canvas, type) {
  clearCanvas(ctx, canvas.width, canvas.height, "#0a1321");
  const gridSize = Math.min(canvas.width / 4, canvas.height / 4);
  drawGrid(ctx, canvas.width, canvas.height, gridSize);

  if (!type) {
    return;
  }

  const cells = getPieceCells(type, 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const pieceWidth = maxX - minX + 1;
  const pieceHeight = maxY - minY + 1;
  const cellSize = Math.min(canvas.width / 5, canvas.height / 5);
  const offsetX = (canvas.width - pieceWidth * cellSize) / 2 - minX * cellSize;
  const offsetY = (canvas.height - pieceHeight * cellSize) / 2 - minY * cellSize;

  for (const [x, y] of cells) {
    const gridX = (offsetX + x * cellSize) / cellSize;
    const gridY = (offsetY + y * cellSize) / cellSize;
    drawCell(ctx, gridX, gridY, cellSize, PIECE_COLORS[type]);
  }
}

export class CanvasRenderer {
  constructor(elements) {
    this.boardCanvas = elements.boardCanvas;
    this.boardCtx = this.boardCanvas.getContext("2d");
    this.holdCanvas = elements.holdCanvas;
    this.holdCtx = this.holdCanvas.getContext("2d");
    this.nextCanvases = elements.nextCanvases;
    this.nextCtxs = this.nextCanvases.map((canvas) => canvas.getContext("2d"));

    this.scoreEl = elements.scoreEl;
    this.levelEl = elements.levelEl;
    this.linesEl = elements.linesEl;
    this.stateEl = elements.stateEl;
    this.overlayEl = elements.overlayEl;
    this.pauseBtn = elements.pauseBtn;
  }

  render(state) {
    this.renderBoard(state);
    this.renderPanels(state);
    this.renderOverlay(state);
  }

  renderBoard(state) {
    const ctx = this.boardCtx;
    const width = this.boardCanvas.width;
    const height = this.boardCanvas.height;
    clearCanvas(ctx, width, height);
    drawGrid(ctx, width, height, CELL_SIZE);

    for (let row = HIDDEN_ROWS; row < BOARD_ROWS; row += 1) {
      const visibleY = row - HIDDEN_ROWS;
      for (let col = 0; col < state.board[row].length; col += 1) {
        const type = state.board[row][col];
        if (type) {
          drawCell(ctx, col, visibleY, CELL_SIZE, PIECE_COLORS[type]);
        }
      }
    }

    if (state.ghostPiece && state.activePiece && !state.isGameOver) {
      drawPlayfieldPiece(ctx, state.ghostPiece, 0.22);
    }
    if (state.activePiece && !state.isGameOver) {
      drawPlayfieldPiece(ctx, state.activePiece, 1);
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.restore();
  }

  renderPanels(state) {
    this.scoreEl.textContent = String(state.score);
    this.levelEl.textContent = String(state.level);
    this.linesEl.textContent = String(state.lines);

    if (state.isGameOver) {
      this.stateEl.textContent = "Game Over";
      this.stateEl.style.color = "#ff9a9a";
    } else if (state.isPaused) {
      this.stateEl.textContent = "Paused";
      this.stateEl.style.color = "#ffd98f";
    } else {
      this.stateEl.textContent = "Running";
      this.stateEl.style.color = "#7ae7c7";
    }

    this.pauseBtn.textContent = state.isPaused ? "Resume" : "Pause";
    drawPreviewPiece(this.holdCtx, this.holdCanvas, state.holdType);
    for (let i = 0; i < this.nextCanvases.length; i += 1) {
      drawPreviewPiece(this.nextCtxs[i], this.nextCanvases[i], state.nextQueue[i]);
    }
  }

  renderOverlay(state) {
    if (state.isGameOver) {
      this.overlayEl.textContent = "Game Over\nPress R or Restart";
      this.overlayEl.classList.add("is-visible");
      return;
    }
    if (state.isPaused) {
      this.overlayEl.textContent = "Paused\nPress P / Esc or Resume";
      this.overlayEl.classList.add("is-visible");
      return;
    }
    this.overlayEl.textContent = "";
    this.overlayEl.classList.remove("is-visible");
  }
}
