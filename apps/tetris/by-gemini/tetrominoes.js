// Export constant properties for all shapes
export const COLORS = [
    null,
    '#00ffff', // 1: I - Cyan
    '#0000ff', // 2: J - Blue
    '#ff7f00', // 3: L - Orange
    '#ffff00', // 4: O - Yellow
    '#00ff00', // 5: S - Green
    '#800080', // 6: T - Purple
    '#ff0000'  // 7: Z - Red
];

// Each shape corresponds to the color index above (1-7)
export const SHAPES = [
    [], // 0 empty
    // 1: I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // 2: J
    [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
    ],
    // 3: L
    [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ],
    // 4: O
    [
        [4, 4],
        [4, 4]
    ],
    // 5: S
    [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
    ],
    // 6: T
    [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    // 7: Z
    [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
];
