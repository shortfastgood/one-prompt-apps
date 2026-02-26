export const GAME_CONFIG = {
  canvasWidth: 960,
  canvasHeight: 540,
  gridSize: 60,
  pathWidth: 40,
  towerRadius: 18,
  placementPathBuffer: 12,
  startMoney: 260,
  startLives: 20,
  sellRefundRate: 0.7,
  maxDt: 0.05,
  backgroundGridColor: "rgba(160, 210, 255, 0.07)",
};

export const PATH_POINTS = [
  { x: -40, y: 90 },
  { x: 210, y: 90 },
  { x: 210, y: 270 },
  { x: 450, y: 270 },
  { x: 450, y: 150 },
  { x: 720, y: 150 },
  { x: 720, y: 390 },
  { x: 1000, y: 390 },
];

export const TOWER_TYPES = {
  scout: {
    key: "scout",
    name: "Scout",
    color: "#57d7ff",
    accent: "#b4f3ff",
    description: "Balanced tower with reliable range and fire rate.",
    barrelLength: 16,
    levels: [
      { cost: 80, range: 140, damage: 13, cooldown: 0.42, projectileSpeed: 420 },
      { upgradeCost: 70, range: 156, damage: 19, cooldown: 0.38, projectileSpeed: 460 },
      { upgradeCost: 105, range: 172, damage: 27, cooldown: 0.33, projectileSpeed: 500 },
    ],
  },
  burst: {
    key: "burst",
    name: "Burst",
    color: "#47d6a3",
    accent: "#c6ffeb",
    description: "Short range, rapid shots. Great near corners and exits.",
    barrelLength: 14,
    levels: [
      { cost: 115, range: 118, damage: 7, cooldown: 0.16, projectileSpeed: 560 },
      { upgradeCost: 85, range: 128, damage: 10, cooldown: 0.14, projectileSpeed: 600 },
      { upgradeCost: 125, range: 140, damage: 14, cooldown: 0.12, projectileSpeed: 650 },
    ],
  },
  cannon: {
    key: "cannon",
    name: "Cannon",
    color: "#f08b57",
    accent: "#ffd1b7",
    description: "Long range heavy hitter with slow reload.",
    barrelLength: 18,
    levels: [
      { cost: 165, range: 196, damage: 36, cooldown: 1.05, projectileSpeed: 300 },
      { upgradeCost: 115, range: 210, damage: 52, cooldown: 0.95, projectileSpeed: 340 },
      { upgradeCost: 165, range: 228, damage: 74, cooldown: 0.86, projectileSpeed: 380 },
    ],
  },
};

export const ENEMY_BASE_TYPES = {
  grunt: {
    key: "grunt",
    name: "Grunt",
    color: "#a8c4ff",
    radius: 11,
    maxHp: 38,
    speed: 62,
    reward: 14,
    livesDamage: 1,
  },
  runner: {
    key: "runner",
    name: "Runner",
    color: "#d6ff7b",
    radius: 10,
    maxHp: 28,
    speed: 94,
    reward: 13,
    livesDamage: 1,
  },
  tank: {
    key: "tank",
    name: "Tank",
    color: "#ff9f8f",
    radius: 14,
    maxHp: 104,
    speed: 42,
    reward: 26,
    livesDamage: 2,
  },
};

export const UI_COLORS = {
  validPlacement: "rgba(71, 214, 163, 0.22)",
  invalidPlacement: "rgba(241, 92, 107, 0.22)",
  validStroke: "rgba(71, 214, 163, 0.9)",
  invalidStroke: "rgba(241, 92, 107, 0.9)",
  selection: "rgba(120, 200, 255, 0.9)",
  range: "rgba(120, 200, 255, 0.12)",
  rangeStroke: "rgba(120, 200, 255, 0.3)",
};

