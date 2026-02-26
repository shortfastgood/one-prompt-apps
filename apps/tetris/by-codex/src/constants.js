export const BOARD_WIDTH = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const BOARD_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;
export const CELL_SIZE = 30;

export const LINES_PER_LEVEL = 10;
export const LOCK_DELAY_MS = 500;
export const SOFT_DROP_SPEED_FACTOR = 20;
export const PREVIEW_COUNT = 3;

export const LINE_CLEAR_SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export const DROP_SCORES = {
  soft: 1,
  hard: 2,
};

export const PIECE_COLORS = {
  I: "#39d9ff",
  O: "#ffd447",
  T: "#c57bff",
  S: "#54e28e",
  Z: "#ff6f7b",
  J: "#4f8dff",
  L: "#ffad5a",
};

export function getFallIntervalMs(level) {
  const n = Math.max(0, level - 1);
  const base = Math.max(0.1, 0.8 - n * 0.007);
  return Math.max(60, Math.floor((base ** n) * 1000));
}

export function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_WIDTH).fill(null));
}
