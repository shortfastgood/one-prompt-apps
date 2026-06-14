import { TYPES } from './constants.js';
import { Board } from './board.js';
import { Piece } from './piece.js';
import { Renderer } from './renderer.js';

class Game {
    constructor() {
        this.board = new Board();
        this.renderer = new Renderer('game-canvas', 'next-canvas', 'hold-canvas');
        
        this.score = 0;
        this.level = 1;
        this.linesClearedTotal = 0;
        this.paused = false;
        this.gameOver = false;

        this.activePiece = null;
        this.nextPiece = this.createRandomPiece();
        this.holdPiece = null;
        this.canHold = true;

        this.dropCounter = 0;
        this.dropInterval = 1000; // ms
        this.lastTime = 0;

        this.initInputs();
        this.spawnPiece();
        this.gameLoop();
    }

    createRandomPiece() {
        const type = TYPES[Math.floor(Math.random() * TYPES.length)];
        return new Piece(type);
    }

    spawnPiece() {
        this.activePiece = this.nextPiece;
        this.nextPiece = this.createRandomPiece();
        this.canHold = true;

        if (!this.board.isValidMove(this.activePiece, this.activePiece.row, this.activePiece.col)) {
            this.endGame();
        }
    }

    initInputs() {
        window.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            if (e.key === 'p' || e.key === 'P') this.togglePause();
            if (this.paused) return;

            switch(e.key) {
                case 'ArrowLeft': this.movePiece(-1, 0); break;
                case 'ArrowRight': this.movePiece(1, 0); break;
                case 'ArrowDown': this.movePiece(0, 1); this.score += 1; break;
                case 'ArrowUp': this.rotatePiece(); break;
                case ' ': this.hardDrop(); break;
                case 'c': case 'C': this.holdPieceAction(); break;
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => location.reload());
    }

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('overlay').classList.toggle('hidden', !this.paused);
        document.getElementById('overlay-title').textContent = 'PAUSED';
    }

    movePiece(dx, dy) {
        if (this.board.isValidMove(this.activePiece, this.activePiece.row + dy, this.activePiece.col + dx)) {
            this.activePiece.col += dx;
            this.activePiece.row += dy;
            return true;
        }
        return false;
    }

    rotatePiece() {
        const oldShape = JSON.parse(JSON.stringify(this.activePiece.shape));
        this.activePiece.rotate();
        if (!this.board.isValidMove(this.activePiece, this.activePiece.row, this.activePiece.col)) {
            this.activePiece.shape = oldShape; // Revert
        }
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2;
        }
        this.lockAndSpawn();
    }

    holdPieceAction() {
        if (!this.canHold) return;
        
        const currentType = this.activePiece.type;
        if (this.holdPiece) {
            const holdType = this.holdPiece.type;
            this.holdPiece = new Piece(currentType);
            this.activePiece = new Piece(holdType);
            this.activePiece.row = 0;
            this.activePiece.col = Math.floor((10 - this.activePiece.shape[0].length) / 2);
        } else {
            this.holdPiece = new Piece(currentType);
            this.spawnPiece();
        }
        this.canHold = false;
    }

    lockAndSpawn() {
        this.board.lockPiece(this.activePiece);
        const cleared = this.board.clearLines();
        this.linesClearedTotal += cleared;
        this.score += (cleared * 100) * this.level;
        
        // Level up every 10 lines
        this.level = Math.floor(this.linesClearedTotal / 10) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);

        this.spawnPiece();
    }

    endGame() {
        this.gameOver = true;
        this.paused = true;
        document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('overlay-title').textContent = 'GAME OVER';
        document.getElementById('final-score').textContent = `Final Score: ${this.score}`;
    }

    gameLoop(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (!this.paused && !this.gameOver) {
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                if (!this.movePiece(0, 1)) {
                    this.lockAndSpawn();
                }
                this.dropCounter = 0;
            }
        }

        this.renderer.renderBoard(this.board, this.activePiece);
        this.renderer.renderPreview(this.renderer.nextCtx, this.nextPiece);
        this.renderer.renderPreview(this.renderer.holdCtx, this.holdPiece);
        this.renderer.updateUI(this.score, this.level, this.linesClearedTotal);

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

new Game();