import { GAME_CONFIG, TOWER_TYPES, UI_COLORS } from "../config.js";

export class Tower {
  constructor({ id, typeKey, gridX, gridY }) {
    this.id = id;
    this.typeKey = typeKey;
    this.type = TOWER_TYPES[typeKey];
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2;
    this.y = gridY * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2;
    this.levelIndex = 0;
    this.cooldownRemaining = 0;
    this.rotation = -Math.PI / 2;
    this.totalSpent = this.type.levels[0].cost;
  }

  getLevelStats(levelIndex = this.levelIndex) {
    return this.type.levels[levelIndex];
  }

  getCurrentStats() {
    return this.getLevelStats(this.levelIndex);
  }

  canUpgrade() {
    return this.levelIndex < this.type.levels.length - 1;
  }

  getUpgradeCost() {
    if (!this.canUpgrade()) {
      return null;
    }
    return this.type.levels[this.levelIndex + 1].upgradeCost;
  }

  upgrade() {
    if (!this.canUpgrade()) {
      return false;
    }
    const upgradeCost = this.getUpgradeCost();
    this.levelIndex += 1;
    this.totalSpent += upgradeCost;
    return true;
  }

  getSellValue(refundRate) {
    return Math.round(this.totalSpent * refundRate);
  }

  containsPoint(x, y) {
    return Math.hypot(x - this.x, y - this.y) <= GAME_CONFIG.towerRadius + 5;
  }

  getRange() {
    return this.getCurrentStats().range;
  }

  update(dt, enemies) {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
    if (this.cooldownRemaining > 0) {
      return null;
    }

    const stats = this.getCurrentStats();
    const target = this.findTarget(enemies, stats.range);
    if (!target) {
      return null;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    this.rotation = Math.atan2(dy, dx);
    this.cooldownRemaining = stats.cooldown;

    return {
      x: this.x + Math.cos(this.rotation) * (this.type.barrelLength - 3),
      y: this.y + Math.sin(this.rotation) * (this.type.barrelLength - 3),
      target,
      damage: stats.damage,
      speed: stats.projectileSpeed,
      color: this.type.accent,
    };
  }

  findTarget(enemies, range) {
    const rangeSq = range * range;
    let best = null;

    for (const enemy of enemies) {
      if (!enemy.alive) {
        continue;
      }

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) {
        continue;
      }

      if (!best || enemy.progress > best.progress) {
        best = enemy;
      }
    }

    return best;
  }

  drawRange(ctx) {
    const range = this.getRange();
    ctx.save();
    ctx.fillStyle = UI_COLORS.range;
    ctx.strokeStyle = UI_COLORS.rangeStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx, { selected = false } = {}) {
    const stats = this.getCurrentStats();
    const radius = GAME_CONFIG.towerRadius;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(16, 26, 38, 0.95)";
    ctx.strokeStyle = selected ? UI_COLORS.selection : "rgba(180, 210, 255, 0.18)";
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = "rgba(8, 14, 20, 0.55)";
    ctx.fillRect(-3, -4, this.type.barrelLength + 2, 8);
    ctx.fillStyle = this.type.accent;
    ctx.fillRect(-2, -3, this.type.barrelLength, 6);
    ctx.restore();

    ctx.fillStyle = "rgba(8, 14, 20, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "10px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(this.levelIndex + 1), this.x, this.y + 0.5);

    if (selected) {
      ctx.strokeStyle = "rgba(120, 200, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    const dpsScale = Math.min(1, (stats.damage / stats.cooldown) / 120);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius + 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dpsScale);
    ctx.stroke();

    ctx.restore();
  }
}

