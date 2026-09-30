// Game entities: enemies, towers and projectiles.

import { TOWER_TYPES, ENEMY_TYPES, TILE } from './config.js';

export class Enemy {
  constructor(typeKey, hpMul) {
    const t = ENEMY_TYPES[typeKey];
    this.type = typeKey;
    this.name = t.name;
    this.maxHp = Math.round(t.hp * hpMul);
    this.hp = this.maxHp;
    this.baseSpeed = t.speed;
    this.reward = t.reward;
    this.leak = t.leak;
    this.color = t.color;
    this.dist = 0;        // pixels travelled along the path
    this.slowMul = 1;    // current speed multiplier
    this.slowTimer = 0;  // seconds of slow remaining
  }

  get speed() {
    return this.slowTimer > 0 ? this.baseSpeed * this.slowMul : this.baseSpeed;
  }

  get isDead() {
    return this.hp <= 0;
  }

  update(dt) {
    this.dist += this.speed * dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowMul = 1;
    }
  }

  applySlow(mul, dur) {
    if (mul < this.slowMul) {
      this.slowMul = mul;
      this.slowTimer = dur;
    } else if (dur > this.slowTimer) {
      this.slowTimer = dur;
    }
  }
}

export class Tower {
  constructor(typeKey, col, row) {
    this.type = typeKey;
    this.col = col;
    this.row = row;
    this.x = (col + 0.5) * TILE;
    this.y = (row + 0.5) * TILE;
    this.level = 1;
    this.cooldown = 0;
    this.target = null;
    this.invested = TOWER_TYPES[typeKey].cost;
  }

  get stats() {
    return TOWER_TYPES[this.type].levels[this.level - 1];
  }

  get maxLevel() {
    return TOWER_TYPES[this.type].levels.length;
  }

  // Cost to reach the next level, or null when maxed out.
  get upgradeCost() {
    return this.level < this.maxLevel
      ? TOWER_TYPES[this.type].levels[this.level].cost
      : null;
  }

  get sellValue() {
    return Math.floor(this.invested * 0.7);
  }
}

export class Projectile {
  constructor(tower, target) {
    const s = tower.stats;
    this.x = tower.x;
    this.y = tower.y;
    this.speed = s.projSpeed;
    this.damage = s.damage;
    this.splash = s.splash || 0;
    this.slow = s.slow || 0;
    this.slowDur = s.slowDur || 0;
    this.target = target;
    this.color = TOWER_TYPES[tower.type].color;
    this.dead = false;
  }
}
