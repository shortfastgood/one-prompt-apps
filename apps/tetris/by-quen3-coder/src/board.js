// Create a new empty board
function createBoard() {
    return {
        width: TETRIS_CONSTANTS.BOARD_WIDTH,
        height: TETRIS_CONSTANTS.BOARD_HEIGHT,
        grid: Array(TETRIS_CONSTANTS.BOARD_HEIGHT).fill().map(() => Array(TETRIS_CONSTANTS.BOARD_WIDTH).fill(TETRIS_CONSTANTS.EMPTY_CELL))
    };
}

// Check if the game is over (stack reached the top)
function isGameOver(board) {
    // Check if any cells in the top row are filled
    for (let col = 0; col < board.width; col++) {
        if (board.grid[0][col] !== TETRIS_CONSTANTS.EMPTY_CELL) {
            return true;
        }
    }
    return false;
}

// Clear completed lines and return number of lines cleared
function clearLines(board) {
    let linesCleared = 0;

    console.log(`Clearing lines. Current board state:`);
    console.table(board.grid);

    for (let row = board.height - 1; row >= 0; row--) {
        console.log(`Check row: ${row}`);
        
        // Check if the row is complete
        if (board.grid[row].every(cell => cell !== TETRIS_CONSTANTS.EMPTY_CELL)) {
            // Remove the completed line
            board.grid.splice(row, 1);
            // Add a new empty line at the top
            board.grid.unshift(Array(board.width).fill(TETRIS_CONSTANTS.EMPTY_CELL));
            linesCleared++;
            // Since we removed a row, we need to adjust the row index
            // We don't increment row because we want to check the new row that shifted into this position
        }
    }
    console.log(`Lines cleared: ${linesCleared}`);
    return linesCleared;
}

// Place a piece on the board
function placePiece(board, piece, position) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                const newRow = position.y + r;
                const newCol = position.x + c;
                
                if (newRow >= 0 && newRow < board.height && newCol >= 0 && newCol < board.width) {
                    board.grid[newRow][newCol] = piece.color;
                }
            }
        }
    }
}

// Check if a position is valid (within board boundaries)
function isValidPosition(board, piece, position) {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                const newRow = position.y + r;
                const newCol = position.x + c;
                
                // Check if out of bounds
                if (newRow >= board.height || newCol < 0 || newCol >= board.width) {
                    return false;
                }
                
                // Check if collides with placed pieces (only check if on the board)
                if (newRow >= 0 && board.grid[newRow][newCol] !== TETRIS_CONSTANTS.EMPTY_CELL) {
                    return false;
                }
            }
        }
    }
    return true;
}