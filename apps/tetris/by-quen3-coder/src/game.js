// Game class
class Game {
    constructor() {
        this.board = createBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.holdUsed = false;
        this.currentPosition = { x: 0, y: 0 };
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.state = GAME_STATES.MENU;
        this.dropInterval = null;
        this.dropSpeed = LEVEL_SPEEDS[0];
        this.lastTime = 0;
        
        // Initialize the game
        this.init();
    }

    init() {
        this.nextPiece = getRandomTetromino();
        // Don't spawn immediately - let start() handle it
        // this.spawnPiece();
        this.updateDropSpeed();
    }

    start() {
        if (this.state === GAME_STATES.MENU || this.state === GAME_STATES.GAME_OVER) {
            this.state = GAME_STATES.PLAYING;
            this.resetGame();
            this.hideGameOver();
            // Now spawn the first piece
            this.spawnPiece();
        }
    }

    resetGame() {
        this.board = createBoard();
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.holdPiece = null;
        this.holdUsed = false;
        this.nextPiece = getRandomTetromino();
        this.spawnPiece();
        this.updateDropSpeed();
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = getRandomTetromino();
        this.currentPosition = { x: Math.floor(TETRIS_CONSTANTS.BOARD_WIDTH / 2) - 1, y: 0 };
        
        // Check if game is over when spawning a new piece
        if (!isValidPosition(this.board, this.currentPiece, this.currentPosition)) {
            this.gameOver();
        }
    }

    holdPiece() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        if (!this.holdUsed) {
            // If we have a hold piece, swap with current piece
            if (this.holdPiece) {
                const temp = this.holdPiece;
                this.holdPiece = this.currentPiece;
                this.currentPiece = temp;
                this.currentPosition = { x: Math.floor(TETRIS_CONSTANTS.BOARD_WIDTH / 2) - 1, y: 0 };
            } else {
                // If no hold piece, store current piece and get next piece
                this.holdPiece = this.currentPiece;
                this.spawnPiece();
            }
            this.holdUsed = true;
        }
    }

    movePiece(dx, dy) {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        const newPosition = { x: this.currentPosition.x + dx, y: this.currentPosition.y + dy };

        if (isValidPosition(this.board, this.currentPiece, newPosition)) {
            this.currentPosition = newPosition;
            return true;
        }
        return false;
    }

    rotatePiece() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        const rotatedPiece = rotatePiece(this.currentPiece);
        
        if (isValidPosition(this.board, rotatedPiece, this.currentPosition)) {
            this.currentPiece = rotatedPiece;
            return true;
        }
        return false;
    }

    softDrop() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        this.movePiece(0, 1);
    }

    hardDrop() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        while (this.movePiece(0, 1)) {
            // Keep moving down until can't move anymore
        }
        this.lockPiece();
    }

    lockPiece() {
        placePiece(this.board, this.currentPiece, this.currentPosition);
        
        // Clear completed lines
        const linesCleared = clearLines(this.board);
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
        }
        
        // Spawn a new piece
        this.holdUsed = false;
        this.spawnPiece();
    }

    updateDropSpeed() {
        this.dropSpeed = LEVEL_SPEEDS[Math.min(this.level - 1, LEVEL_SPEEDS.length - 1)];
    }

    updateScore(linesCleared) {
        // Update lines cleared and level
        this.linesCleared += linesCleared;
        this.level = Math.floor(this.linesCleared / 10) + 1;
        this.updateDropSpeed();
        
        // Update score
        this.score += LINE_POINTS[linesCleared] * this.level;
    }

    update() {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        // Move piece down automatically
        this.lastTime += 16; // Approximate 60fps
        
        if (this.lastTime >= this.dropSpeed) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.lastTime = 0;
        }
    }

    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
        } else if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
        }
    }

    gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        this.showGameOver();
    }

    showGameOver() {
        // This will be handled by the renderer
    }

    hideGameOver() {
        document.getElementById('game-over').style.display = 'none';
    }

    restart() {
        this.resetGame();
        this.start();
    }
}