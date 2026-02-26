export class Enemy {
  constructor(id, stats, path) {
    this.id = id;
    this.typeKey = stats.typeKey;
    this.name = stats.name;
    this.color = stats.color;
    this.radius = stats.radius;
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
    this.speed = stats.speed;
    this.reward = stats.reward;
    this.livesDamage = stats.livesDamage;
    this.progress = 0;
    this.x = path.points[0]?.x ?? 0;
    this.y = path.points[0]?.y ?? 0;
    this.alive = true;
    this.reachedEnd = false;
  }

  update(dt, path, getPointAtDistance) {
    if (!this.alive) {
      return { escaped: false };
    }

    this.progress += this.speed * dt;

    if (this.progress >= path.totalLength) {
      this.alive = false;
      this.reachedEnd = true;
      const endPoint = getPointAtDistance(path, path.totalLength);
      this.x = endPoint.x;
      this.y = endPoint.y;
      return { escaped: true };
    }

    const point = getPointAtDistance(path, this.progress);
    this.x = point.x;
    this.y = point.y;
    return { escaped: false };
  }

  takeDamage(amount) {
    if (!this.alive) {
      return false;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) {
      return;
    }

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(this.x - 2, this.y - 2, 1, this.x, this.y, this.radius + 5);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1, 0, Math.PI * 2);
    ctx.stroke();

    const hpBarWidth = Math.max(18, this.radius * 2.2);
    const hpBarHeight = 4;
    const hpX = this.x - hpBarWidth / 2;
    const hpY = this.y - this.radius - 10;
    const hpPct = this.maxHp > 0 ? this.hp / this.maxHp : 0;

    ctx.fillStyle = "rgba(10, 15, 20, 0.8)";
    ctx.fillRect(hpX, hpY, hpBarWidth, hpBarHeight);
    ctx.fillStyle = hpPct > 0.5 ? "#59e8b0" : hpPct > 0.25 ? "#ffd36b" : "#ff7b8a";
    ctx.fillRect(hpX, hpY, hpBarWidth * hpPct, hpBarHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(hpX, hpY, hpBarWidth, hpBarHeight);

    ctx.restore();
  }
}

