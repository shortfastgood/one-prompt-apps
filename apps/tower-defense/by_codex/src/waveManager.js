import { clamp } from "./utils.js";

export class WaveManager {
  constructor() {
    this.waveNumber = 0;
    this.spawning = false;
    this.queue = [];
    this.spawnTimer = 0;
    this.lastStartedCount = 0;
  }

  canStartNextWave(enemyCount, gameOver) {
    return !gameOver && !this.spawning && enemyCount === 0;
  }

  startNextWave() {
    if (this.spawning) {
      return null;
    }

    this.waveNumber += 1;
    this.queue = buildWavePlan(this.waveNumber);
    this.lastStartedCount = this.queue.length;
    this.spawning = true;
    this.spawnTimer = 0.15;

    return {
      waveNumber: this.waveNumber,
      enemyCount: this.lastStartedCount,
    };
  }

  update(dt, spawnEnemy) {
    if (!this.spawning) {
      return;
    }

    this.spawnTimer -= dt;

    while (this.spawning && this.spawnTimer <= 0) {
      const next = this.queue.shift();
      if (!next) {
        this.spawning = false;
        this.spawnTimer = 0;
        break;
      }

      spawnEnemy(next);
      this.spawnTimer += next.delayAfter;

      if (this.queue.length === 0) {
        this.spawning = false;
      }
    }
  }

  isWaveRunning(enemyCount) {
    return this.spawning || enemyCount > 0;
  }
}

function buildWavePlan(waveNumber) {
  const queue = [];
  const baseCount = 8 + waveNumber * 2 + Math.floor(waveNumber / 3);
  const hpScaleBase = 1 + (waveNumber - 1) * 0.14;
  const rewardScaleBase = 1 + (waveNumber - 1) * 0.08;
  const speedScaleBase = 1 + Math.min(0.55, (waveNumber - 1) * 0.018);

  for (let i = 0; i < baseCount; i += 1) {
    let typeKey = "grunt";

    if (waveNumber >= 2 && i % 6 === 3) {
      typeKey = "runner";
    }
    if (waveNumber >= 4 && i % 10 === 8) {
      typeKey = "tank";
    }
    if (waveNumber >= 7 && i % 5 === 2) {
      typeKey = "runner";
    }
    if (waveNumber >= 9 && i % 8 === 6) {
      typeKey = "tank";
    }

    const elitePulse = waveNumber >= 6 && i % 11 === 5 ? 1.22 : 1;
    const typeHpBonus = typeKey === "tank" ? 1.15 : typeKey === "runner" ? 0.92 : 1;
    const typeSpeedBonus = typeKey === "runner" ? 1.2 : typeKey === "tank" ? 0.87 : 1;
    const typeRewardBonus = typeKey === "tank" ? 1.35 : typeKey === "runner" ? 1.02 : 1;

    const delayAfter = clamp(
      0.78 - waveNumber * 0.025 + (typeKey === "tank" ? 0.24 : 0) + ((i % 3) - 1) * 0.04,
      0.22,
      0.95,
    );

    queue.push({
      typeKey,
      hpScale: hpScaleBase * elitePulse * typeHpBonus,
      speedScale: speedScaleBase * typeSpeedBonus,
      rewardScale: rewardScaleBase * typeRewardBonus * (elitePulse > 1 ? 1.08 : 1),
      delayAfter,
    });
  }

  if (waveNumber % 5 === 0) {
    queue.push({
      typeKey: "tank",
      hpScale: hpScaleBase * 1.9,
      speedScale: speedScaleBase * 0.9,
      rewardScale: rewardScaleBase * 2.1,
      delayAfter: 0.5,
    });
  }

  return queue;
}

