// Core game state: waves, towers, enemies, projectiles, money, lives.

import {
  TILE, GRID_COLS, GRID_ROWS, START_MONEY, START_LIVES,
  WAVES, WAVE_BONUS, TOWER_TYPES,
} from './config.js';
import { buildPath } from './path.js';
import { Enemy, Tower, Projectile } from './entities.js';

export class Game {
  constructor() {
    this.path = buildPath();
    this.pathCells = this.path.cells();
    this.reset();
  }

  reset() {
    this.money = START_MONEY;
    this.lives = START_LIVES;
    this.waveIndex = 0;          // waves completed / currently running
    this.state = 'idle';         // idle | running | won | lost
    this.speed = 1;              // 1 or 2 (fast-forward)
    this.paused = false;
    this.enemies = [];
    this.projectiles = [];
    this.towers = [];
    this.occupied = new Set();   // "col,row" cells holding a tower
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.selected = null;        // tower the player clicked
    this.placing = null;       // tower type being placed, or null
    this.hover = null;         // {col, row} under the cursor
  }

  get waveNumber() {
    return Math.min(this.waveIndex + 1, WAVES.length);
  }

  canPlace(col, row) {
    const key = `${col},${row}`;
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
      && !this.pathCells.has(key) && !this.occupied.has(key);
  }

  placeTower(typeKey, col, row) {
    if (this.state === 'lost' || this.state === 'won') return false;
    const cost = TOWER_TYPES[typeKey].cost;
    if (!this.canPlace(col, row) || this.money < cost) return false;
    this.money -= cost;
    this.towers.push(new Tower(typeKey, col, row));
    this.occupied.add(`${col},${row}`);
    return true;
  }

  upgradeTower(tower) {
    const cost = tower.upgradeCost;
    if (cost === null || this.money < cost) return false;
    this.money -= cost;
    tower.level++;
    tower.invested += cost;
    return true;
  }

  sellTower(tower) {
    if (!this.towers.includes(tower)) return false;
    this.money += tower.sellValue;
    this.towers = this.towers.filter(t => t !== tower);
    this.occupied.delete(`${tower.col},${tower.row}`);
    if (this.selected === tower) this.selected = null;
    return true;
  }

  startWave() {
    if (this.state !== 'idle') return;
    const wave = WAVES[this.waveIndex];
    this.spawnQueue = [];
    for (const group of wave.groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ type: group.type, delay: group.interval });
      }
    }
    this.spawnTimer = this.spawnQueue[0].delay;
    this.state = 'running';
  }

  update(dt) {
    if (this.paused || this.state === 'lost' || this.state === 'won') return;
    dt *= this.speed;

    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);

    if (this.state === 'running'
      && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveIndex++;
      if (this.waveIndex >= WAVES.length) {
        this.state = 'won';
      } else {
        this.money += WAVE_BONUS;
        this.state = 'idle';
      }
    }
  }

  spawnEnemies(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      const next = this.spawnQueue.shift();
      const hpMul = WAVES[this.waveIndex].hpMul || 1;
      this.enemies.push(new Enemy(next.type, hpMul));
      if (this.spawnQueue.length === 0) break;
      this.spawnTimer += this.spawnQueue[0].delay;
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.update(dt);
      if (enemy.isDead) {
        this.money += enemy.reward;
        enemy.gone = true;
      } else if (enemy.dist >= this.path.total) {
        this.lives = Math.max(0, this.lives - enemy.leak);
        if (this.lives === 0) this.state = 'lost';
        enemy.gone = true;
      }
    }
    this.enemies = this.enemies.filter(e => !e.isDead && !e.gone);
  }

  // Towers target the enemy furthest along the path within range.
  updateTowers(dt) {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      const target = this.findTarget(tower);
      tower.target = target;
      if (target && tower.cooldown <= 0) {
        this.projectiles.push(new Projectile(tower, target));
        tower.cooldown = tower.stats.fireRate;
      }
    }
  }

  findTarget(tower) {
    const range = tower.stats.range * TILE;
    let best = null;
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const pos = this.path.positionAt(enemy.dist);
      if (Math.hypot(pos.x - tower.x, pos.y - tower.y) <= range) {
        if (!best || enemy.dist > best.dist) best = enemy;
      }
    }
    return best;
  }

  updateProjectiles(dt) {
    for (const proj of this.projectiles) {
      if (proj.target.isDead) {
        proj.dead = true;
        continue;
      }
      const pos = this.path.positionAt(proj.target.dist);
      const dx = pos.x - proj.x;
      const dy = pos.y - proj.y;
      const dist = Math.hypot(dx, dy);
      const step = proj.speed * dt;
      if (dist <= step) {
        this.explode(proj, pos);
        proj.dead = true;
      } else {
        proj.x += (dx / dist) * step;
        proj.y += (dy / dist) * step;
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  explode(proj, impact) {
    if (proj.splash > 0) {
      const radius = proj.splash * TILE;
      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;
        const pos = this.path.positionAt(enemy.dist);
        if (Math.hypot(pos.x - impact.x, pos.y - impact.y) <= radius) {
          enemy.hp -= proj.damage;
          if (proj.slow) enemy.applySlow(proj.slow, proj.slowDur);
        }
      }
    } else if (!proj.target.isDead) {
      proj.target.hp -= proj.damage;
      if (proj.slow) proj.target.applySlow(proj.slow, proj.slowDur);
    }
  }
}
