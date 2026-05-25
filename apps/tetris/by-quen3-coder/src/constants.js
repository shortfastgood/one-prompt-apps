// Game constants
const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 20;
const EMPTY_CELL = 0;

// Tetromino shapes
const TETROMINOES = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: 'I'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'J'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'L'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: 'O'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: 'S'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'T'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: 'Z'
    }
};

// Game speeds (ms per drop)
const LEVEL_SPEEDS = [
    1000, // Level 1
    800,  // Level 2
    600,  // Level 3
    500,  // Level 4
    400,  // Level 5
    300,  // Level 6
    250,  // Level 7
    200,  // Level 8
    150,  // Level 9
    120,  // Level 10
    100,  // Level 11
    80,   // Level 12
    60,   // Level 13
    50,   // Level 14
    40,   // Level 15
    30,   // Level 16
    20,   // Level 17
    15,   // Level 18
    10,   // Level 19
    5     // Level 20
];

// Scoring
const LINE_POINTS = [0, 40, 100, 300, 1200]; // Points for 0, 1, 2, 3, 4 lines cleared

// Game states
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// Make constants available globally
window.TETRIS_CONSTANTS = {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    TETROMINOES,
    LEVEL_SPEEDS,
    LINE_POINTS,
    GAME_STATES
};