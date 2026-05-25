// Render the game board and pieces
class Renderer {
    constructor(boardElement, nextPieceElement, holdPieceElement) {
        this.boardElement = boardElement;
        this.nextPieceElement = nextPieceElement;
        this.holdPieceElement = holdPieceElement;
        this.setupBoard();
    }

    setupBoard() {
        // Clear existing board
        this.boardElement.innerHTML = '';
        
        // Create cells for the board
        for (let row = 0; row < TETRIS_CONSTANTS.BOARD_HEIGHT; row++) {
            for (let col = 0; col < TETRIS_CONSTANTS.BOARD_WIDTH; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.boardElement.appendChild(cell);
            }
        }
    }

    render(board, currentPiece, currentPosition, nextPiece, holdPiece) {
        // Clear the board
        this.clearBoard();
        
        // Render placed pieces
        this.renderBoard(board);
        
        // Render current piece
        if (currentPiece) {
            this.renderPiece(currentPiece, currentPosition);
        }
        
        // Render next piece
        this.renderNextPiece(nextPiece);
        
        // Render hold piece
        this.renderHoldPiece(holdPiece);
    }

    clearBoard() {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });
    }

    renderBoard(board) {
        for (let row = 0; row < board.height; row++) {
            for (let col = 0; col < board.width; col++) {
                if (board.grid[row][col] !== 0) {
                    const cell = this.boardElement.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        cell.classList.add('filled', board.grid[row][col]);
                    }
                }
            }
        }
    }

    renderPiece(piece, position) {
        if (!piece || !position) return;
        
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const newRow = position.y + r;
                    const newCol = position.x + c;
                    
                    if (newRow >= 0 && newRow < TETRIS_CONSTANTS.BOARD_HEIGHT && newCol >= 0 && newCol < TETRIS_CONSTANTS.BOARD_WIDTH) {
                        const cell = this.boardElement.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
                        if (cell) {
                            cell.classList.add('filled', piece.color);
                        }
                    }
                }
            }
        }
    }

    renderNextPiece(piece) {
        // Clear next piece container
        this.nextPieceElement.innerHTML = '';
        
        if (!piece) return;
        
        // Create a grid for the next piece
        const grid = document.createElement('div');
        grid.className = 'next-piece-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gridTemplateRows = 'repeat(4, 1fr)';
        grid.style.gap = '1px';
        grid.style.width = '100px';
        grid.style.height = '100px';
        
        // Determine the size of the piece (max 4x4)
        const size = Math.max(piece.shape.length, piece.shape[0].length);
        
        // Create grid cells
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.aspectRatio = '1 / 1';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                
                // Check if this cell should be filled
                if (r < piece.shape.length && c < piece.shape[0].length && piece.shape[r][c] !== 0) {
                    cell.classList.add('filled', piece.color);
                }
                
                grid.appendChild(cell);
            }
        }
        
        this.nextPieceElement.appendChild(grid);
    }

    renderHoldPiece(piece) {
        // Clear hold piece container
        this.holdPieceElement.innerHTML = '';
        
        if (!piece) return;
        
        // Create a grid for the hold piece
        const grid = document.createElement('div');
        grid.className = 'hold-piece-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gridTemplateRows = 'repeat(4, 1fr)';
        grid.style.gap = '1px';
        grid.style.width = '100px';
        grid.style.height = '100px';
        
        // Determine the size of the piece (max 4x4)
        const size = Math.max(piece.shape.length, piece.shape[0].length);
        
        // Create grid cells
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.aspectRatio = '1 / 1';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                
                // Check if this cell should be filled
                if (r < piece.shape.length && c < piece.shape[0].length && piece.shape[r][c] !== 0) {
                    cell.classList.add('filled', piece.color);
                }
                
                grid.appendChild(cell);
            }
        }
        
        this.holdPieceElement.appendChild(grid);
    }

    updateStats(score, level) {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
    }

    showGameOver(score) {
        document.getElementById('final-score').textContent = score;
        document.getElementById('game-over').style.display = 'block';
    }

    hideGameOver() {
        document.getElementById('game-over').style.display = 'none';
    }
}