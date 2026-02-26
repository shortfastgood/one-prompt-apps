import {
  ENEMY_BASE_TYPES,
  GAME_CONFIG,
  PATH_POINTS,
  TOWER_TYPES,
} from "./config.js";
import {
  createPath,
  distanceToPath,
  drawGrid,
  drawPath,
  drawPlacementPreview,
  getPointAtDistance,
} from "./path.js";
import { Enemy } from "./entities/enemy.js";
import { Projectile } from "./entities/projectile.js";
import { Tower } from "./entities/tower.js";
import { WaveManager } from "./waveManager.js";

export class TowerDefenseGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.path = createPath(PATH_POINTS);

    this.lastFrameTime = 0;
    this.rafId = null;

    this.mouse = { x: 0, y: 0, inside: false, hoverCell: null };

    this.bindCanvasEvents();
    this.resetGameState();
  }

  resetGameState() {
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.waveManager = new WaveManager();

    this.money = GAME_CONFIG.startMoney;
    this.lives = GAME_CONFIG.startLives;
    this.paused = false;
    this.gameOver = false;

    this.selectedBuildTypeKey = null;
    this.selectedTowerId = null;
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.lastClearedWaveNotice = 0;
    this.message = "Select a tower and prepare for the first wave.";
    this.mouse.inside = false;
    this.mouse.hoverCell = null;
  }

  bindCanvasEvents() {
    this.canvas.addEventListener("pointermove", (event) => {
      const point = this.getCanvasPoint(event);
      if (!point) {
        return;
      }
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.inside = true;
      this.mouse.hoverCell = this.getCellAtPoint(point.x, point.y);
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.mouse.inside = false;
      this.mouse.hoverCell = null;
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      const point = this.getCanvasPoint(event);
      if (!point) {
        return;
      }
      this.handleBoardClick(point.x, point.y);
    });
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    const x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    return { x, y };
  }

  getCellAtPoint(x, y) {
    if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) {
      return null;
    }
    const gridX = Math.floor(x / GAME_CONFIG.gridSize);
    const gridY = Math.floor(y / GAME_CONFIG.gridSize);
    return {
      gridX,
      gridY,
      centerX: gridX * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2,
      centerY: gridY * GAME_CONFIG.gridSize + GAME_CONFIG.gridSize / 2,
    };
  }

  handleBoardClick(x, y) {
    const clickedTower = this.getTowerAtPoint(x, y);
    if (clickedTower) {
      this.selectedTowerId = clickedTower.id;
      this.message = `Selected ${clickedTower.type.name} tower.`;
      return;
    }

    const cell = this.getCellAtPoint(x, y);
    if (!cell) {
      this.selectedTowerId = null;
      return;
    }

    if (this.selectedBuildTypeKey) {
      const preview = this.getPlacementPreview(cell);
      if (preview?.valid) {
        this.placeTower(cell, this.selectedBuildTypeKey);
      } else {
        this.message = preview?.reason || "Can't place a tower there.";
      }
      return;
    }

    this.selectedTowerId = null;
  }

  getTowerAtPoint(x, y) {
    for (let i = this.towers.length - 1; i >= 0; i -= 1) {
      if (this.towers[i].containsPoint(x, y)) {
        return this.towers[i];
      }
    }
    return null;
  }

  isCellOccupied(gridX, gridY) {
    return this.towers.some((tower) => tower.gridX === gridX && tower.gridY === gridY);
  }

  getPlacementPreview(cell = this.mouse.hoverCell) {
    if (!cell || !this.selectedBuildTypeKey) {
      return null;
    }

    const type = TOWER_TYPES[this.selectedBuildTypeKey];
    if (!type) {
      return null;
    }

    const point = { x: cell.centerX, y: cell.centerY };
    const minDistance = distanceToPath(this.path, point);
    const blockedDistance = GAME_CONFIG.pathWidth / 2 + GAME_CONFIG.placementPathBuffer;

    let valid = true;
    let reason = "";
    if (this.isCellOccupied(cell.gridX, cell.gridY)) {
      valid = false;
      reason = "Tile already occupied.";
    } else if (minDistance < blockedDistance) {
      valid = false;
      reason = "Too close to the path.";
    }

    return {
      valid,
      reason,
      x: point.x,
      y: point.y,
      towerRadius: GAME_CONFIG.towerRadius,
      range: type.levels[0].range,
    };
  }

  placeTower(cell, typeKey) {
    if (this.gameOver) {
      return;
    }

    const type = TOWER_TYPES[typeKey];
    const cost = type.levels[0].cost;
    if (this.money < cost) {
      this.message = `Need ${cost - this.money} more to place ${type.name}.`;
      return;
    }

    const tower = new Tower({
      id: this.nextTowerId++,
      typeKey,
      gridX: cell.gridX,
      gridY: cell.gridY,
    });

    this.towers.push(tower);
    this.money -= cost;
    this.selectedTowerId = tower.id;
    this.message = `${type.name} placed for $${cost}.`;
  }

  startNextWave() {
    if (!this.waveManager.canStartNextWave(this.enemies.length, this.gameOver)) {
      if (this.gameOver) {
        this.message = "Game over. Restart to play again.";
      } else {
        this.message = "Finish the current wave before starting the next one.";
      }
      return;
    }

    const info = this.waveManager.startNextWave();
    if (info) {
      this.paused = false;
      this.message = `Wave ${info.waveNumber} started (${info.enemyCount} enemies).`;
    }
  }

  togglePause() {
    if (this.gameOver) {
      return;
    }
    this.paused = !this.paused;
    this.message = this.paused ? "Game paused." : "Game resumed.";
  }

  restart() {
    this.resetGameState();
  }

  selectBuildType(typeKey) {
    if (!TOWER_TYPES[typeKey]) {
      return;
    }
    this.selectedBuildTypeKey = this.selectedBuildTypeKey === typeKey ? null : typeKey;
    this.message = this.selectedBuildTypeKey
      ? `${TOWER_TYPES[this.selectedBuildTypeKey].name} selected. Click an open tile to build.`
      : "Build selection cleared.";
  }

  clearBuildSelection() {
    if (!this.selectedBuildTypeKey) {
      return;
    }
    this.selectedBuildTypeKey = null;
    this.message = "Build selection cleared.";
  }

  getSelectedTower() {
    return this.towers.find((tower) => tower.id === this.selectedTowerId) ?? null;
  }

  upgradeSelectedTower() {
    if (this.gameOver) {
      return;
    }
    const tower = this.getSelectedTower();
    if (!tower) {
      return;
    }

    const cost = tower.getUpgradeCost();
    if (cost == null) {
      this.message = `${tower.type.name} is already max level.`;
      return;
    }
    if (this.money < cost) {
      this.message = `Need ${cost - this.money} more to upgrade ${tower.type.name}.`;
      return;
    }

    tower.upgrade();
    this.money -= cost;
    this.message = `${tower.type.name} upgraded to level ${tower.levelIndex + 1}.`;
  }

  sellSelectedTower() {
    if (this.gameOver) {
      return;
    }
    const tower = this.getSelectedTower();
    if (!tower) {
      return;
    }

    const value = tower.getSellValue(GAME_CONFIG.sellRefundRate);
    this.money += value;
    this.towers = this.towers.filter((candidate) => candidate.id !== tower.id);
    this.selectedTowerId = null;
    this.message = `${tower.type.name} sold for $${value}.`;
  }

  spawnEnemy(spawnSpec) {
    const base = ENEMY_BASE_TYPES[spawnSpec.typeKey];
    if (!base) {
      return;
    }

    const enemy = new Enemy(
      this.nextEnemyId++,
      {
        typeKey: base.key,
        name: base.name,
        color: base.color,
        radius: base.radius,
        maxHp: Math.max(1, Math.round(base.maxHp * spawnSpec.hpScale)),
        speed: Math.max(20, Math.round(base.speed * spawnSpec.speedScale)),
        reward: Math.max(1, Math.round(base.reward * spawnSpec.rewardScale)),
        livesDamage: base.livesDamage,
      },
      this.path,
    );

    this.enemies.push(enemy);
  }

  update(dt) {
    if (this.paused || this.gameOver) {
      return;
    }

    this.waveManager.update(dt, (spec) => this.spawnEnemy(spec));

    for (const enemy of this.enemies) {
      const result = enemy.update(dt, this.path, getPointAtDistance);
      if (result.escaped) {
        this.lives -= enemy.livesDamage;
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.alive);

    for (const tower of this.towers) {
      const shot = tower.update(dt, this.enemies);
      if (shot) {
        this.projectiles.push(new Projectile(shot));
      }
    }

    let income = 0;
    for (const projectile of this.projectiles) {
      const result = projectile.update(dt);
      income += result.reward;
    }
    if (income > 0) {
      this.money += income;
    }
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);

    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver = true;
      this.message = `Base breached on wave ${this.waveManager.waveNumber}. Restart to try again.`;
      return;
    }

    if (
      !this.waveManager.spawning &&
      this.enemies.length === 0 &&
      this.waveManager.waveNumber > 0 &&
      this.lastClearedWaveNotice < this.waveManager.waveNumber
    ) {
      this.lastClearedWaveNotice = this.waveManager.waveNumber;
      this.message = `Wave ${this.waveManager.waveNumber} cleared. Build and start the next wave.`;
    }

    if (!this.getSelectedTower()) {
      this.selectedTowerId = null;
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#101a25");
    gradient.addColorStop(1, "#0b1219");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const glow = ctx.createRadialGradient(130, 80, 0, 130, 80, 280);
    glow.addColorStop(0, "rgba(71,214,163,0.10)");
    glow.addColorStop(1, "rgba(71,214,163,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 12, 0.46)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const w = 360;
    const h = 126;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;

    ctx.fillStyle = "rgba(15, 23, 34, 0.94)";
    ctx.strokeStyle = this.gameOver ? "rgba(241, 92, 107, 0.35)" : "rgba(120, 200, 255, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pathRoundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ecf4ff";
    ctx.font = "600 28px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.fillText(this.gameOver ? "Base Breached" : "Paused", this.canvas.width / 2, y + 42);

    ctx.font = "15px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.fillStyle = "rgba(220, 233, 251, 0.9)";
    ctx.fillText(
      this.gameOver
        ? `Reached wave ${this.waveManager.waveNumber} with $${this.money}`
        : "Press Pause or Start Next Wave to resume",
      this.canvas.width / 2,
      y + 76,
    );

    ctx.fillStyle = "rgba(163, 179, 199, 0.95)";
    ctx.font = "13px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.fillText(`Lives: ${this.lives}  |  Towers: ${this.towers.length}`, this.canvas.width / 2, y + 101);
    ctx.restore();
  }

  drawBoardHint() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(8, 13, 18, 0.48)";
    ctx.strokeStyle = "rgba(151, 198, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    pathRoundRect(ctx, 10, 10, 340, 54, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(236, 244, 255, 0.92)";
    ctx.font = "13px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.fillText("Build mode stays active for quick multi-place setup.", 20, 31);
    ctx.fillStyle = "rgba(163, 179, 199, 0.95)";
    ctx.font = "12px Bahnschrift, Trebuchet MS, sans-serif";
    ctx.fillText("Blue = valid tile. Red = blocked/path/occupied.", 20, 49);
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    this.drawBackground();
    drawGrid(ctx);
    drawPath(ctx, this.path);

    const selectedTower = this.getSelectedTower();
    if (selectedTower) {
      selectedTower.drawRange(ctx);
    }

    if (this.selectedBuildTypeKey) {
      drawPlacementPreview(ctx, this.getPlacementPreview());
    }

    for (const tower of this.towers) {
      tower.draw(ctx, { selected: tower.id === this.selectedTowerId });
    }
    for (const projectile of this.projectiles) {
      projectile.draw(ctx);
    }
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }

    this.drawBoardHint();

    if (this.paused || this.gameOver) {
      this.drawOverlay();
    }
  }

  getStatusLabel() {
    if (this.gameOver) {
      return "Game Over";
    }
    if (this.paused) {
      return "Paused";
    }
    if (this.waveManager.isWaveRunning(this.enemies.length)) {
      return "Wave Active";
    }
    return "Intermission";
  }

  getSelectedTowerUiData() {
    const tower = this.getSelectedTower();
    if (!tower) {
      return null;
    }

    const stats = tower.getCurrentStats();
    const upgradeCost = tower.getUpgradeCost();

    return {
      name: tower.type.name,
      description: tower.type.description,
      level: tower.levelIndex + 1,
      maxLevel: tower.type.levels.length,
      range: stats.range,
      damage: stats.damage,
      cooldown: stats.cooldown,
      canUpgrade: upgradeCost != null,
      upgradeCost,
      affordUpgrade: upgradeCost != null && this.money >= upgradeCost,
      sellValue: tower.getSellValue(GAME_CONFIG.sellRefundRate),
    };
  }

  buildUiState() {
    return {
      wave: this.waveManager.waveNumber,
      lives: this.lives,
      money: this.money,
      enemies: this.enemies.length,
      status: this.getStatusLabel(),
      canStartWave: this.waveManager.canStartNextWave(this.enemies.length, this.gameOver),
      paused: this.paused,
      gameOver: this.gameOver,
      buildSelection: this.selectedBuildTypeKey,
      selectedTower: this.getSelectedTowerUiData(),
      message: this.message,
    };
  }

  frame = (timestamp) => {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const dt = Math.min(
      GAME_CONFIG.maxDt,
      Math.max(0, (timestamp - this.lastFrameTime) / 1000),
    );
    this.lastFrameTime = timestamp;

    this.update(dt);
    this.render();
    this.ui.render(this.buildUiState());

    this.rafId = window.requestAnimationFrame(this.frame);
  };

  start() {
    if (this.rafId != null) {
      return;
    }
    this.lastFrameTime = 0;
    this.rafId = window.requestAnimationFrame(this.frame);
  }
}

function pathRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.rect(x, y, w, h);
}
