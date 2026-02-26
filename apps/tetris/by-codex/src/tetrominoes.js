import { PIECE_COLORS } from "./constants.js";

const RAW_SHAPES = {
  I: ["....", "IIII", "....", "...."],
  O: [".OO.", ".OO.", "....", "...."],
  T: [".T..", "TTT.", "....", "...."],
  S: [".SS.", "SS..", "....", "...."],
  Z: ["ZZ..", ".ZZ.", "....", "...."],
  J: ["J...", "JJJ.", "....", "...."],
  L: ["..L.", "LLL.", "....", "...."],
};

export const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

function rowsToMatrix(rows) {
  return rows.map((row) => row.split("").map((cell) => cell !== "."));
}

function rotateMatrixCW(matrix) {
  const size = matrix.length;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => matrix[size - 1 - x][y]),
  );
}

function matrixToCells(matrix) {
  const cells = [];
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x]) {
        cells.push([x, y]);
      }
    }
  }
  return cells;
}

function buildRotations(type) {
  const base = rowsToMatrix(RAW_SHAPES[type]);
  if (type === "O") {
    const cells = matrixToCells(base);
    return [cells, cells, cells, cells];
  }

  const rotations = [];
  let current = base;
  for (let i = 0; i < 4; i += 1) {
    rotations.push(matrixToCells(current));
    current = rotateMatrixCW(current);
  }
  return rotations;
}

export const TETROMINOES = Object.fromEntries(
  PIECE_TYPES.map((type) => [
    type,
    {
      type,
      color: PIECE_COLORS[type],
      rotations: buildRotations(type),
    },
  ]),
);

// SRS kick data adapted for y-down coordinates.
const JLSTZ_KICKS = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export function getPieceCells(type, rotation) {
  const normalized = ((rotation % 4) + 4) % 4;
  return TETROMINOES[type].rotations[normalized];
}

export function getKickTests(type, fromRotation, toRotation) {
  if (type === "O") {
    return [[0, 0]];
  }

  const key = `${fromRotation}>${toRotation}`;
  return (type === "I" ? I_KICKS : JLSTZ_KICKS)[key] ?? [[0, 0]];
}

export function createSpawnPiece(type) {
  return {
    type,
    x: 3,
    y: 0,
    rotation: 0,
  };
}
