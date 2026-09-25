// Game logic: state machine, flight model, AI, guns, damage.
//
// Flight model (the part that was broken in the first attempt):
//   - W/S rotate the nose around the LOCAL X axis (elevator).
//   - A/D rotate around the LOCAL Z axis (ailerons) — this only BANKS
//     the plane.
//   - The actual TURN comes from a coordinated-turn rule: the world-Y
//     yaw rate is proportional to the bank angle, so you bank and the
//     plane curves. Without this, rolling never changes heading.

const Game = {
  state: "menu",          // menu | playing | dying | clear
  level: 0,
  player: null,           // {group, def, speed, hp, maxHp, cd, dead, isPlayer}
  enemies: [],
  bullets: [],            // {mesh, vel, life, fromPlayer, dmg}
  clearTimer: 0,
  dyingTimer: 0,
  scene: null,
  camera: null,
  keys: {},

  init(scene, camera) {
    this.scene = scene;
    this.camera = camera;
  },

  forwardOf(p) {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(p.group.quaternion);
  },

  // Rotate the plane's heading toward `dir` (unit vector), capped by its
  // turn rate, then apply bank-to-turn yaw around WORLD Y.
  steer(p, dir, dt) {
    const fwd = this.forwardOf(p);
    const axis = new THREE.Vector3().crossVectors(fwd, dir);
    if (axis.lengthSq() > 1e-8) {
      p.group.rotateOnAxis(axis.normalize(), Math.min(fwd.angleTo(dir), p.def.turn * dt));
    }
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(p.group.quaternion);
    const bank = Math.asin(THREE.MathUtils.clamp(right.y, -1, 1));
    p.group.quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bank * 1.8 * dt));
  },

  makePlane(def, isPlayer) {
    return {
      group: buildPlane(def),
      def,
      speed: (def.maxSpeed + def.minSpeed) / 2,
      hp: def.armor * 35,
      maxHp: def.armor * 35,
      cd: 0.5 + Math.random(),
      dead: false,
      isPlayer,
    };
  },

  startGame(planeIndex) {
    document.getElementById("menu").style.display = "none";
    document.getElementById("hud").classList.remove("hidden");
    this.clearWorld();
    this.player = this.makePlane(PLANES[planeIndex], true);
    this.player.group.position.set(0, 800, 0);
    this.scene.add(this.player.group);
    this.spawnLevel(1);
  },

  clearWorld() {
    this.enemies.forEach(e => this.scene.remove(e.group));
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.enemies = [];
    this.bullets = [];
  },

  spawnLevel(n) {
    this.clearWorld();
    this.level = n;
    const count = n + 1; // dynamic enemy count, grows every level
    const pPos = this.player ? this.player.group.position : new THREE.Vector3(0, 800, 0);
    for (let i = 0; i < count; i++) {
      const def = PLANES[Math.floor(Math.random() * PLANES.length)];
      const e = this.makePlane(def, false);
      e.hp = e.maxHp = 40 + 15 * n; // tougher enemies each level
      const ang = Math.random() * Math.PI * 2;
      const dist = 700 + Math.random() * 600; // close enough to always find you
      e.group.position.copy(pPos)
        .add(new THREE.Vector3(Math.cos(ang) * dist, -200 + Math.random() * 500, Math.sin(ang) * dist));
      if (e.group.position.y < 250) e.group.position.y = 250;
      this.scene.add(e.group);
      this.enemies.push(e);
    }
    this.banner(`LEVEL ${n} — ${count} ENEMIES INBOUND`);
    this.state = "playing";
  },

  banner(text) {
    const b = document.getElementById("banner");
    b.textContent = text;
    b.style.display = "block";
    setTimeout(() => { b.style.display = "none"; }, 2500);
  },

  fire(shooter, dmg) {
    const fwd = this.forwardOf(shooter);
    const geo = new THREE.CylinderGeometry(0.35, 0.35, 6, 4);
    geo.rotateX(Math.PI / 2); // tracer aligned with its velocity
    const mesh = new THREE.Mesh(geo,
      new THREE.MeshBasicMaterial({ color: shooter.isPlayer ? 0xffe040 : 0xff3030 }));
    mesh.position.copy(shooter.group.position).addScaledVector(fwd, 12);
    mesh.quaternion.copy(shooter.group.quaternion);
    this.scene.add(mesh);
    const vel = fwd.clone().multiplyScalar(520);
    if (!shooter.isPlayer) { // enemy aim wobble
      vel.x += (Math.random() - 0.5) * 24;
      vel.y += (Math.random() - 0.5) * 24;
      vel.z += (Math.random() - 0.5) * 24;
    }
    this.bullets.push({ mesh, vel, life: 2.4, fromPlayer: shooter.isPlayer, dmg });
  },

  killPlane(p) {
    boom(this.scene, p.group.position.clone(), 0xff6600, 24);
    this.scene.remove(p.group);
    if (p.isPlayer) this.killPlayer();
  },

  killPlayer() {
    this.player.dead = true;
    this.state = "dying";
    this.dyingTimer = 0;
    this.banner("AIRCRAFT DESTROYED");
  },

  update(dt) {
    if (this.state === "playing") this.updatePlaying(dt);
    else if (this.state === "clear") {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.spawnLevel(this.level + 1);
    } else if (this.state === "dying") this.updateDying(dt);
  },

  updatePlaying(dt) {
    const p = this.player;

    // --- player controls ---
    if (p && !p.dead) {
      if (this.keys["w"]) p.group.rotateX(-p.def.turn * dt);   // climb
      if (this.keys["s"]) p.group.rotateX(p.def.turn * dt);    // dive
      if (this.keys["a"]) p.group.rotateZ(p.def.turn * dt);    // bank left
      if (this.keys["d"]) p.group.rotateZ(-p.def.turn * dt);   // bank right
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(p.group.quaternion);
      const bank = Math.asin(THREE.MathUtils.clamp(right.y, -1, 1));
      p.group.quaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bank * 1.8 * dt));

      const target = this.keys["shift"] ? p.def.maxSpeed
        : this.keys["control"] ? p.def.minSpeed
        : (p.def.maxSpeed + p.def.minSpeed) / 2;
      p.speed += (target - p.speed) * Math.min(1, dt * 0.7);
      p.group.position.addScaledVector(this.forwardOf(p), p.speed * dt);
      if (p.group.position.y < 80) p.group.position.y = 80;
      if (p.group.position.y > 9000) p.group.position.y = 9000;

      p.cd -= dt;
      if (this.keys[" "] && p.cd <= 0) { this.fire(p, p.def.dmg); p.cd = p.def.fireRate; }
      if (p.hp < p.maxHp * 0.5 && Math.random() < dt * 5) {
        smokePuff(this.scene, p.group.position.clone());
      }
    }

    // --- enemy AI: always converge on the player so fights happen ---
    for (const e of this.enemies) {
      const aim = p && !p.dead ? p.group.position.clone() : null;
      if (!aim) continue;
      if (e.group.position.y < 250) aim.y = e.group.position.y + 400;
      const to = aim.clone().sub(e.group.position);
      const dist = to.length();
      to.normalize();
      this.steer(e, to, dt);
      e.group.position.addScaledVector(this.forwardOf(e), e.speed * dt);
      e.cd -= dt;
      if (p && !p.dead && dist < 700 && this.forwardOf(e).angleTo(to) < 0.12 && e.cd <= 0) {
        this.fire(e, 4 + this.level);
        e.cd = 1.3;
      }
      if (e.hp < e.maxHp * 0.5 && Math.random() < dt * 5) {
        smokePuff(this.scene, e.group.position.clone());
      }
    }

    // --- bullets ---
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      const targets = b.fromPlayer ? this.enemies : (p && !p.dead ? [p] : []);
      let hit = false;
      for (const t of targets) {
        if (t.dead || !t.group.visible) continue;
        if (t.group.position.distanceTo(b.mesh.position) < 22) { // generous hit radius
          t.hp -= b.dmg;
          boom(this.scene, b.mesh.position.clone(), 0xffaa00, 4);
          if (t.hp <= 0) {
            this.killPlane(t);
            if (t !== p) this.enemies = this.enemies.filter(x => x !== t);
          }
          hit = true;
          break;
        }
      }
      if (hit || b.life <= 0) { this.scene.remove(b.mesh); this.bullets.splice(i, 1); }
    }

    // --- chase camera ---
    if (p) {
      const fwd = this.forwardOf(p);
      const cam = p.group.position.clone().addScaledVector(fwd, -34);
      cam.y += 12;
      this.camera.position.lerp(cam, Math.min(1, dt * 4));
      this.camera.lookAt(p.group.position.clone().addScaledVector(fwd, 80));
    }

    // --- level cleared ---
    if (this.enemies.length === 0) {
      this.state = "clear";
      this.clearTimer = 3;
      this.banner(`LEVEL ${this.level} CLEARED — REINFORCEMENTS INBOUND`);
      if (p && !p.dead) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); // repair between levels
    }
  },

  updateDying(dt) {
    const p = this.player;
    if (!p) return;
    p.group.rotateX(2.2 * dt);
    p.group.rotateZ(3.1 * dt);
    p.speed = Math.max(120, p.speed - 60 * dt);
    p.group.position.addScaledVector(this.forwardOf(p), p.speed * dt);

    const cam = p.group.position.clone().addScaledVector(this.forwardOf(p), -34);
    cam.y += 12;
    this.camera.position.lerp(cam, Math.min(1, dt * 4));
    this.camera.lookAt(p.group.position);

    if (p.group.position.y < 120) {
      boom(this.scene, p.group.position.clone(), 0xff6600, 26);
      this.scene.remove(p.group);
      this.player = null;
      const bo = document.getElementById("blackout");
      bo.style.display = "block";
      setTimeout(() => { bo.style.opacity = "1"; }, 300);
      setTimeout(() => {
        bo.style.opacity = "0";
        setTimeout(() => { bo.style.display = "none"; }, 500);
        document.getElementById("menu").style.display = "flex";
        document.getElementById("hud").classList.add("hidden");
        this.state = "menu";
      }, 2300);
      this.state = "menu"; // stop simulating; the blackout timeout returns to menu
    }
  },

  updateHud() {
    if (this.state !== "playing" || !this.player) return;
    const p = this.player;
    document.getElementById("gauges").innerHTML =
      `SPD ${Math.round(p.speed * 3.6)} km/h<br>` +
      `ALT ${Math.round(p.group.position.y)} m<br>` +
      `THR ${Math.round(p.speed / p.def.maxSpeed * 100)}%`;
    const bar = document.querySelector("#hullbar i");
    bar.style.width = Math.max(0, p.hp / p.maxHp * 100) + "%";
    bar.className = p.hp < p.maxHp * 0.35 ? "low" : "";
    document.getElementById("threat").innerHTML =
      `LEVEL ${this.level}<br>ENEMIES ${this.enemies.length}`;
  },
};
