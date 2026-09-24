// Tetromino shapes (spawn orientation) and matrix rotation helpers.

export const PIECES = {
  I: {
    color: '#22d3ee',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    color: '#facc15',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    color: '#c084fc',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  S: {
    color: '#4ade80',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    color: '#f87171',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  J: {
    color: '#60a5fa',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    color: '#fb923c',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
};

// Rotate a square matrix clockwise / counter-clockwise.
export function rotateCW(m) {
  const n = m.length;
  return m.map((row, i) => row.map((_, j) => m[n - 1 - j][i]));
}

export function rotateCCW(m) {
  const n = m.length;
  return m.map((row, i) => row.map((_, j) => m[j][n - 1 - i]));
}
