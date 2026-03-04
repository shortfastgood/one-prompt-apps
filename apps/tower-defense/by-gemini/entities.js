class Enemy {
    constructor(hp, speed, reward, isBoss = false) {
        this.pathIndex = 0;
        this.x = Game.path[0].x * window.TILE_SIZE + window.TILE_SIZE / 2;
        this.y = Game.path[0].y * window.TILE_SIZE + window.TILE_SIZE / 2;
        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.reward = reward;
        this.isBoss = isBoss;
        this.isActive = true;
        this.radius = isBoss ? 14 : 10;
        this.incomingDamage = 0; // Track projectiles homing in

        // Slight randomization so they don't look completely stacked if spawned fast
        this.offsetX = (Math.random() - 0.5) * 10;
        this.offsetY = (Math.random() - 0.5) * 10;
    }

    update(dt) {
        if (!this.isActive) return;

        const target = Game.path[this.pathIndex + 1];
        if (!target) {
            this.isActive = false;
            Game.state.lives -= this.isBoss ? 5 : 1;
            return;
        }

        const tx = target.x * window.TILE_SIZE + window.TILE_SIZE / 2;
        const ty = target.y * window.TILE_SIZE + window.TILE_SIZE / 2;

        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);

        const move = this.speed * dt;

        if (dist <= move) {
            this.x = tx;
            this.y = ty;
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * move;
            this.y += (dy / dist) * move;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && this.isActive) {
            this.isActive = false;
            Game.state.money += this.reward;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        const drawX = this.x + this.offsetX;
        const drawY = this.y + this.offsetY;

        // Draw body
        ctx.fillStyle = this.isBoss ? '#f25f5c' : '#ff9f1c';
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw HP bar
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        const barW = this.isBoss ? 30 : 20;
        const barH = 4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(drawX - barW / 2, drawY - this.radius - 8, barW, barH);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(drawX - barW / 2, drawY - this.radius - 8, barW * hpPercent, barH);
    }
}

const TOWER_TYPES = {
    basic: { color: '#4ecdc4', range: 120, damage: 25, cooldown: 1.0, cost: 100, bulletSpeed: 300, bulletColor: '#2980b9' },
    rapid: { color: '#f1c40f', range: 90, damage: 8, cooldown: 0.2, cost: 200, bulletSpeed: 400, bulletColor: '#d35400' },
    sniper: { color: '#9b59b6', range: 250, damage: 120, cooldown: 2.5, cost: 250, bulletSpeed: 800, bulletColor: '#8e44ad' }
};

class Tower {
    constructor(gridX, gridY, type) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * window.TILE_SIZE + window.TILE_SIZE / 2;
        this.y = gridY * window.TILE_SIZE + window.TILE_SIZE / 2;
        this.type = type;
        this.level = 1;

        const stats = TOWER_TYPES[type];
        this.range = stats.range;
        this.damage = stats.damage;
        this.cooldown = stats.cooldown;
        this.bulletSpeed = stats.bulletSpeed;
        this.color = stats.color;
        this.bulletColor = stats.bulletColor;
        this.cost = stats.cost;
        this.totalSpent = this.cost;

        this.timer = 0;
        this.target = null;
        this.angle = 0;
    }

    update(dt) {
        this.timer -= dt;

        if (!this.target || !this.target.isActive || this.getDist(this.target) > this.range) {
            this.target = this.findTarget();
        }

        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

            if (this.timer <= 0) {
                this.shoot();
                this.timer = this.cooldown;
            }
        }
    }

    findTarget() {
        for (let e of Game.enemies) {
            // Check if enemy is active, in range, and will survive currently incoming damage
            if (e.isActive && this.getDist(e) <= this.range && (e.hp - e.incomingDamage) > 0) {
                return e;
            }
        }
        return null;
    }

    getDist(entity) {
        return Math.hypot(entity.x - this.x, entity.y - this.y);
    }

    shoot() {
        Game.projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.bulletSpeed, this.bulletColor));
        this.target.incomingDamage += this.damage; // Register incoming damage
    }

    upgrade() {
        this.level++;
        const cost = this.getUpgradeCost();
        Game.state.money -= cost;
        this.totalSpent += cost;

        this.damage = Math.floor(this.damage * 1.5);
        this.range += 10;
        this.cooldown *= 0.9;
    }

    getUpgradeCost() {
        return Math.floor(this.cost * Math.pow(1.5, this.level - 1));
    }

    getSellValue() {
        return Math.floor(this.totalSpent * 0.6);
    }

    draw(ctx) {
        const TILE = window.TILE_SIZE;

        // Base
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.x - TILE / 2 + 4, this.y - TILE / 2 + 4, TILE - 8, TILE - 8);

        // Turret
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        if (this.type === 'sniper') {
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-10, -10);
            ctx.fill();
        } else if (this.type === 'rapid') {
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, -3, 15, 6);
        } else {
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, -4, 16, 8);
        }

        ctx.restore();

        // Level indicator
        ctx.fillStyle = 'white';
        ctx.font = '10px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('L' + this.level, this.x, this.y - TILE / 2 + 10);
    }
}

class Projectile {
    constructor(x, y, target, damage, speed, color) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.isActive = true;
    }

    update(dt) {
        if (!this.isActive) return;

        // If target died while projectile was in flight, just disappear (or could find new target)
        if (!this.target.isActive) {
            this.isActive = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const move = this.speed * dt;

        if (dist <= move) {
            this.target.takeDamage(this.damage);
            this.target.incomingDamage -= this.damage;
            this.isActive = false;
        } else {
            this.x += (dx / dist) * move;
            this.y += (dy / dist) * move;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

const WaveManager = {
    waveActive: false,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    spawnInterval: 1.0,

    startWave() {
        if (this.waveActive) return;
        this.waveActive = true;
        this.enemiesToSpawn = 10 + Game.state.wave * 2;
        this.spawnTimer = 0;
        this.spawnInterval = Math.max(0.3, 1.2 - Game.state.wave * 0.05);
    },

    update(dt) {
        if (!this.waveActive) return;

        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = this.spawnInterval;
                this.enemiesToSpawn--;
            }
        } else if (Game.enemies.length === 0) {
            this.waveActive = false;
            Game.state.wave++;
            Game.state.money += 100 + Game.state.wave * 10;
        }
    },

    spawnEnemy() {
        const wave = Game.state.wave;
        const hp = 50 + (wave * 25) * Math.pow(1.1, wave);
        const speed = 60 + Math.min(60, wave * 2);
        const reward = 5 + Math.floor(wave / 5);

        const isBoss = (this.enemiesToSpawn === 1 && wave % 5 === 0);

        Game.enemies.push(new Enemy(
            isBoss ? hp * 5 : hp,
            isBoss ? speed * 0.7 : speed,
            isBoss ? reward * 5 : reward,
            isBoss
        ));
    },

    reset() {
        this.waveActive = false;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
    }
};

window.Entities = { Enemy, Tower, Projectile, WaveManager, TOWER_TYPES };
