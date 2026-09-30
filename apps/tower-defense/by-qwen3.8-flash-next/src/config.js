// Static game data: map, towers, enemies, waves.

export const TILE = 40;
export const GRID_COLS = 20;
export const GRID_ROWS = 13;

// Waypoints in grid coordinates (col, row). The first and last points sit
// off-screen so enemies enter and exit smoothly.
export const PATH_WAYPOINTS = [
  [-1, 1], [4, 1], [4, 5], [9, 5], [9, 1],
  [14, 1], [14, 8], [7, 8], [7, 11], [20, 11],
];

export const START_MONEY = 120;
export const START_LIVES = 20;

export const TOWER_TYPES = {
  gunner: {
    name: 'Gunner',
    desc: 'Cheap and fast-firing. Good all-rounder.',
    color: '#4ade80',
    cost: 50,
    levels: [
      { damage: 8, range: 2.5, fireRate: 0.4, projSpeed: 420 },
      { damage: 12, range: 2.8, fireRate: 0.35, projSpeed: 440, cost: 40 },
      { damage: 18, range: 3.1, fireRate: 0.3, projSpeed: 460, cost: 60 },
    ],
  },
  cannon: {
    name: 'Cannon',
    desc: 'Slow but hits hard, with splash damage.',
    color: '#f97316',
    cost: 90,
    levels: [
      { damage: 30, range: 2.8, fireRate: 1.6, projSpeed: 300, splash: 1.2 },
      { damage: 45, range: 3.0, fireRate: 1.5, projSpeed: 300, splash: 1.4, cost: 70 },
      { damage: 65, range: 3.2, fireRate: 1.4, projSpeed: 300, splash: 1.6, cost: 100 },
    ],
  },
  frost: {
    name: 'Frost',
    desc: 'Low damage, but slows enemies down.',
    color: '#38bdf8',
    cost: 70,
    levels: [
      { damage: 4, range: 2.5, fireRate: 0.9, projSpeed: 380, slow: 0.5, slowDur: 1.2 },
      { damage: 6, range: 2.8, fireRate: 0.8, projSpeed: 380, slow: 0.4, slowDur: 1.4, cost: 50 },
      { damage: 9, range: 3.0, fireRate: 0.7, projSpeed: 380, slow: 0.35, slowDur: 1.6, cost: 80 },
    ],
  },
};

export const ENEMY_TYPES = {
  grunt: { name: 'Grunt', hp: 30, speed: 55, reward: 6, leak: 1, color: '#f87171' },
  runner: { name: 'Runner', hp: 18, speed: 105, reward: 5, leak: 1, color: '#fbbf24' },
  tank: { name: 'Tank', hp: 140, speed: 38, reward: 18, leak: 2, color: '#a78bfa' },
  boss: { name: 'Boss', hp: 600, speed: 32, reward: 80, leak: 5, color: '#22d3ee' },
};

// Each wave is a list of spawn groups; groups spawn one after another.
export const WAVES = [
  { groups: [{ type: 'grunt', count: 8, interval: 0.9 }] },
  { groups: [{ type: 'grunt', count: 10, interval: 0.8 }, { type: 'runner', count: 4, interval: 0.7 }] },
  { groups: [{ type: 'runner', count: 6, interval: 0.6 }, { type: 'tank', count: 2, interval: 2.5 }] },
  { groups: [{ type: 'grunt', count: 12, interval: 0.7 }, { type: 'runner', count: 6, interval: 0.5 }] },
  { groups: [{ type: 'tank', count: 4, interval: 2.2 }, { type: 'runner', count: 8, interval: 0.5 }] },
  { groups: [{ type: 'grunt', count: 14, interval: 0.6 }, { type: 'tank', count: 2, interval: 2 }], hpMul: 1.2 },
  { groups: [{ type: 'runner', count: 8, interval: 0.5 }, { type: 'tank', count: 4, interval: 2 }], hpMul: 1.2 },
  { groups: [{ type: 'grunt', count: 10, interval: 0.5 }, { type: 'runner', count: 8, interval: 0.4 }], hpMul: 1.3 },
  { groups: [{ type: 'tank', count: 6, interval: 1.8 }, { type: 'runner', count: 6, interval: 0.5 }], hpMul: 1.3 },
  { groups: [{ type: 'boss', count: 1, interval: 1 }, { type: 'runner', count: 8, interval: 0.6 }], hpMul: 1.4 },
  { groups: [{ type: 'tank', count: 10, interval: 1.5 }, { type: 'runner', count: 10, interval: 0.4 }], hpMul: 1.5 },
  { groups: [{ type: 'boss', count: 2, interval: 12 }, { type: 'tank', count: 6, interval: 1.5 }], hpMul: 1.6 },
];

export const WAVE_BONUS = 20;
