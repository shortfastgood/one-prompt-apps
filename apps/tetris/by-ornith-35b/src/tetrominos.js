// ===================================================
//  Tetrominoes – piece definitions & SRS wall kicks
// ===================================================

// 7 standard colors
export const PIECE_COLORS = {
  I: '#00F0F0',
  O: '#F0F000',
  T: '#A000F0',
  S: '#00F000',
  Z: '#F00000',
  J: '#0000F0',
  L: '#F0A000',
};

// Each piece: 4 rotation states, each state = 16-element array (4×4 grid, row-major).
// Cell is filled (1) or empty (0).
export const PIECE_SHAPES = {
  I: [
    // Rotation 0 – flat
    [0, 0, 0, 0,
     1, 1, 1, 1,
     0, 0, 0, 0,
     0, 0, 0, 0],
    // Rotation 1 – vertical (col 1)
    [0, 0, 1, 0,
     0, 0, 1, 0,
     0, 0, 1, 0,
     0, 0, 1, 0],
    // Rotation 2 – flat
    [0, 0, 0, 0,
     0, 0, 0, 0,
     1, 1, 1, 1,
     0, 0, 0, 0],
    // Rotation 3 – vertical (col 2)
    [0, 1, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0],
  ],

  O: [
    // Rotation 0 (only one useful rotation)
    [0, 0, 0, 0,
     0, 1, 1, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
    // Rotations 1-3 are identical for O
    [0, 0, 0, 0,
     0, 1, 1, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
    [0, 0, 0, 0,
     0, 1, 1, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
    [0, 0, 0, 0,
     0, 1, 1, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
  ],

  T: [
    // Rotation 0 – face up
    [0, 0, 0, 0,
     1, 1, 1, 0,
     0, 1, 0, 0,
     0, 0, 0, 0],
    // Rotation 1 – face right
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 1, 0,
     0, 1, 0, 0],
    // Rotation 2 – face down
    [0, 0, 0, 0,
     0, 1, 0, 0,
     1, 1, 1, 0,
     0, 0, 0, 0],
    // Rotation 3 – face left
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 1, 0,
     0, 0, 1, 0],
  ],

  S: [
    // Rotation 0 – horizontal
    [0, 0, 0, 0,
     0, 1, 1, 0,
     1, 1, 0, 0,
     0, 0, 0, 0],
    // Rotation 1 – vertical
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 1, 0,
     0, 0, 1, 0],
    // Rotation 2 – horizontal
    [0, 0, 0, 0,
     0, 1, 1, 0,
     1, 1, 0, 0,
     0, 0, 0, 0],
    // Rotation 3 – vertical
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 1, 0,
     0, 0, 1, 0],
  ],

  Z: [
    // Rotation 0 – horizontal
    [0, 0, 0, 0,
     1, 1, 0, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
    // Rotation 1 – vertical
    [0, 0, 0, 0,
     0, 0, 1, 0,
     0, 1, 1, 0,
     0, 1, 0, 0],
    // Rotation 2 – horizontal
    [0, 0, 0, 0,
     1, 1, 0, 0,
     0, 1, 1, 0,
     0, 0, 0, 0],
    // Rotation 3 – vertical
    [0, 0, 0, 0,
     0, 0, 1, 0,
     0, 1, 1, 0,
     0, 1, 0, 0],
  ],

  J: [
    // Rotation 0 – face right
    [0, 0, 0, 0,
     1, 0, 0, 0,
     1, 1, 1, 0,
     0, 0, 0, 0],
    // Rotation 1 – face down
    [0, 0, 0, 0,
     1, 1, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0],
    // Rotation 2 – face left
    [0, 0, 0, 0,
     0, 0, 0, 0,
     1, 1, 1, 0,
     0, 0, 1, 0],
    // Rotation 3 – face up
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0,
     1, 1, 0, 0],
  ],

  L: [
    // Rotation 0 – face left
    [0, 0, 0, 0,
     0, 0, 1, 0,
     1, 1, 1, 0,
     0, 0, 0, 0],
    // Rotation 1 – face down
    [0, 0, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0,
     1, 1, 0, 0],
    // Rotation 2 – face right
    [0, 0, 0, 0,
     0, 0, 0, 0,
     1, 1, 1, 0,
     0, 1, 0, 0],
    // Rotation 3 – face up
    [0, 0, 0, 0,
     1, 1, 0, 0,
     0, 1, 0, 0,
     0, 1, 0, 0],
  ],
};

/**
 * Build a lookup table: key = "fromRot>toRot", value = array of [dx, dy] kicks.
 * Uses standard SRS wall kick data for JLSTZ pieces (4 kicks each).
 */
function buildJLSTZKickTable() {
  // Core kicks (shared between all JLSTZ pieces)
  const baseKicks = [
    // 0→1 (CW): up-left
    [ [0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2] ],
    // 1→0 (CCW): down-right
    [ [0, 0], [1, 0], [1, 1], [0, -2], [1, -2] ],
    // 1→2 (CW): up-right
    [ [0, 0], [1, 0], [1, 0], [0, -1], [1, -1] ],
    // 2→1 (CCW): down-left
    [ [0, 0], [-1, 0], [-1, 0], [0, 1], [-1, 1] ],
    // 2→3 (CW): down-right
    [ [0, 0], [1, 0], [1, 1], [0, 2], [1, 2] ],
    // 3→2 (CCW): up-left
    [ [0, 0], [-1, 0], [-1, -1], [0, -2], [-1, -2] ],
    // 3→0 (CW): down-left
    [ [0, 0], [-1, 0], [-1, 1], [0, -1], [-1, -1] ],
    // 0→3 (CCW): up-right
    [ [0, 0], [1, 0], [1, -1], [0, 1], [1, 1] ],
  ];

  const table = {};
  const transitions = [
    '0>1', '1>0', '1>2', '2>1',
    '2>3', '3>2', '3>0', '0>3',
  ];
  for (let i = 0; i < transitions.length; i++) {
    table[transitions[i]] = baseKicks[i];
  }
  return table;
}

/**
 * Build SRS wall kick table for the I-piece (6 kicks per transition).
 */
function buildIKickTable() {
  // Core kicks for I-piece (6 kicks each)
  const baseKicks = [
    // 0→1 (CW): up-left
    [ [0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2] ],
    // 1→0 (CCW): down-right
    [ [0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2] ],
    // 1→2 (CW): up-right
    [ [0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2] ],
    // 2→1 (CCW): down-left
    [ [0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2] ],
    // 2→3 (CW): down-right
    [ [0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1] ],
    // 3→2 (CCW): up-left
    [ [0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1] ],
    // 3→0 (CW): down-left
    [ [0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1] ],
    // 0→3 (CCW): up-right
    [ [0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1] ],
  ];

  const table = {};
  const transitions = [
    '0>1', '1>0', '1>2', '2>1',
    '2>3', '3>2', '3>0', '0>3',
  ];
  for (let i = 0; i < transitions.length; i++) {
    table[transitions[i]] = baseKicks[i];
  }
  return table;
}

export const WALL_KICKS_JLSTZ = buildJLSTZKickTable();
export const WALL_KICKS_I = buildIKickTable();

/**
 * Create a fresh 7-bag randomizer.
 * Guarantees each bag contains exactly one of each piece type, in random order.
 */
export function newBag() {
  const bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/** Combined piece definitions: { type: { color, rotations } } */
export const PIECES = {
  I: { color: PIECE_COLORS.I, rotations: PIECE_SHAPES.I },
  O: { color: PIECE_COLORS.O, rotations: PIECE_SHAPES.O },
  T: { color: PIECE_COLORS.T, rotations: PIECE_SHAPES.T },
  S: { color: PIECE_COLORS.S, rotations: PIECE_SHAPES.S },
  Z: { color: PIECE_COLORS.Z, rotations: PIECE_SHAPES.Z },
  J: { color: PIECE_COLORS.J, rotations: PIECE_SHAPES.J },
  L: { color: PIECE_COLORS.L, rotations: PIECE_SHAPES.L },
};
