// Canvas rendering: map, path, towers, enemies, projectiles, placement ghost.

import { TILE, GRID_COLS, GRID_ROWS, TOWER_TYPES } from './config.js';

export function render(ctx, game) {
  const width = GRID_COLS * TILE;
  const height = GRID_ROWS * TILE;
  ctx.clearRect(0, 0, width, height);

  drawMap(ctx, game);
  drawTowers(ctx, game);
  drawEnemies(ctx, game);
  drawProjectiles(ctx, game);
  drawGhost(ctx, game);
}

function drawMap(ctx, game) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, GRID_COLS * TILE, GRID_ROWS * TILE);

  // Path cells
  ctx.fillStyle = '#334155';
  for (const key of game.pathCells) {
    const [col, row] = key.split(',').map(Number);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }

  // Subtle grid
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= GRID_COLS; c++) { ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, GRID_ROWS * TILE); }
  for (let r = 0; r <= GRID_ROWS; r++) { ctx.moveTo(0, r * TILE); ctx.lineTo(GRID_COLS * TILE, r * TILE); }
  ctx.stroke();
}

function drawTowers(ctx, game) {
  for (const tower of game.towers) {
    const stats = tower.stats;

    // Range circle for the selected tower
    if (game.selected === tower) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range * TILE, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = TOWER_TYPES[tower.type].color;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Level pips
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tower.level), tower.x, tower.y);
  }
}

function drawEnemies(ctx, game) {
  for (const enemy of game.enemies) {
    const pos = game.path.positionAt(enemy.dist);
    if (pos.done) continue;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();

    // Health bar
    const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pos.x - 10, pos.y - 16, 20, 4);
    ctx.fillStyle = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(pos.x - 10, pos.y - 16, 20 * hpFrac, 4);
  }
}

function drawProjectiles(ctx, game) {
  for (const proj of game.projectiles) {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = proj.color;
    ctx.fill();
  }
}

function drawGhost(ctx, game) {
  if (!game.placing || !game.hover) return;
  const { col, row } = game.hover;
  const type = TOWER_TYPES[game.placing];
  const stats = type.levels[0];
  const x = (col + 0.5) * TILE;
  const y = (row + 0.5) * TILE;
  const ok = game.canPlace(col, row) && game.money >= type.cost;

  ctx.beginPath();
  ctx.arc(x, y, stats.range * TILE, 0, Math.PI * 2);
  ctx.fillStyle = ok ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)';
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(74,222,128,0.5)' : 'rgba(239,68,68,0.5)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = ok ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)';
  ctx.fill();
}
