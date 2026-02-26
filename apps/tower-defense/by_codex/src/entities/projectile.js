export class Projectile {
  constructor({ x, y, target, damage, speed, color }) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.radius = 4;
    this.active = true;
  }

  update(dt) {
    if (!this.active) {
      return { remove: true, reward: 0 };
    }

    if (!this.target || !this.target.alive) {
      this.active = false;
      return { remove: true, reward: 0 };
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const hitDistance = this.target.radius + this.radius;

    if (distance <= hitDistance || distance <= this.speed * dt) {
      const killed = this.target.takeDamage(this.damage);
      this.active = false;
      return { remove: true, reward: killed ? this.target.reward : 0 };
    }

    const move = this.speed * dt;
    this.x += (dx / distance) * move;
    this.y += (dy / distance) * move;
    return { remove: false, reward: 0 };
  }

  draw(ctx) {
    if (!this.active) {
      return;
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

