// Get a random tetromino
function getRandomTetromino() {
    const tetrominoes = Object.keys(TETRIS_CONSTANTS.TETROMINOES);
    const randTetromino = tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
    return {
        shape: TETRIS_CONSTANTS.TETROMINOES[randTetromino].shape,
        color: TETRIS_CONSTANTS.TETROMINOES[randTetromino].color,
        type: randTetromino
    };
}

// Rotate a tetromino
function rotatePiece(piece) {
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    
    // Create a new rotated matrix
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = piece.shape[r][c];
        }
    }
    
    return {
        ...piece,
        shape: rotated
    };
}

// Check if a piece can be placed at a position
function canPlacePiece(board, piece, position) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                const newRow = position.y + r;
                const newCol = position.x + c;
                
                // Check if out of bounds
                if (newRow >= board.height || newCol < 0 || newCol >= board.width) {
                    return false;
                }
                
                // Check if collides with placed pieces
                if (newRow >= 0 && board.grid[newRow][newCol] !== TETRIS_CONSTANTS.EMPTY_CELL) {
                    return false;
                }
            }
        }
    }
    return true;
}