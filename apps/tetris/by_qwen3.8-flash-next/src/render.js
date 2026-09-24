// Canvas rendering for the playfield and piece previews.

import { PIECES } from './pieces.js';

function drawCell(ctx, gx, gy, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * size, gy * size, size, size);
  // Top highlight for a slight bevel.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(gx * size, gy * size, size, Math.max(2, size * 0.12));
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.strokeRect(gx * size + 0.5, gy * size + 0.5, size - 1, size - 1);
}

export function drawBoard(ctx, game, size) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  for (let x = 1; x < 10; x++) {
    ctx.moveTo(x * size, 0);
    ctx.lineTo(x * size, ctx.canvas.height);
  }
  for (let y = 1; y < 20; y++) {
    ctx.moveTo(0, y * size);
    ctx.lineTo(ctx.canvas.width, y * size);
  }
  ctx.stroke();

  game.board.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color) drawCell(ctx, x, y, size, color);
    }),
  );

  if (!game.over) {
    const { shape, col } = game.piece;
    const ghost = game.ghostRow();
    shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) drawCell(ctx, col + c, ghost + r, size, 'rgba(148, 163, 184, 0.30)');
      }),
    );
    const color = PIECES[game.piece.type].color;
    shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) drawCell(ctx, col + c, game.piece.row + r, size, color);
      }),
    );
  }

  if (game.paused || game.over) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(
      game.over ? 'GAME OVER' : 'PAUSED',
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
    );
    ctx.font = '13px monospace';
    ctx.fillText(
      game.over ? 'Press R or Restart' : 'Press P to resume',
      ctx.canvas.width / 2,
      ctx.canvas.height / 2 + 24,
    );
  }
}

export function drawPiece(ctx, type, size, gx, gy) {
  if (!type) return;
  const shape = PIECES[type].shape;
  shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) drawCell(ctx, gx + c, gy + r, size, PIECES[type].color);
    }),
  );
}
