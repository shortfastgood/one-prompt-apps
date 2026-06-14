import { COLS, ROWS, BLOCK_SIZE, COLORS } from './constants.js';

export class Renderer {
    constructor(gameCanvasId, nextCanvasId, holdCanvasId) {
        this.gameCanvas = document.getElementById(gameCanvasId);
        this.nextCanvas = document.getElementById(nextCanvasId);
        this.holdCanvas = document.getElementById(holdCanvasId);
        
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCtx = this.holdCanvas.getContext('2d');
    }

    drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size, y * size, size, size);
    }

    renderBoard(board, activePiece) {
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // Draw locked blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const color = board.grid[r][c];
                if (color !== 'EMPTY') {
                    this.drawBlock(this.gameCtx, c, r, color);
                }
            }
        }

        // Draw active piece
        if (activePiece) {
            const shape = activePiece.shape;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawBlock(this.gameCtx, activePiece.col + c, activePiece.row + r, activePiece.color);
                    }
                }
            }
        }
    }

    renderPreview(canvasCtx, piece) {
        if (!piece) return;
        const ctx = canvasCtx;
        ctx.clearRect(0, 0, 100, 100);
        
        const shape = piece.shape;
        const size = 20;
        const offsetX = (100 - shape[0].length * size) / 2;
        const offsetY = (100 - shape.length * size) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(offsetX + c * size, offsetY + r * size, size, size);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(offsetX + c * size, offsetY + r * size, size, size);
                }
            }
        }
    }

    updateUI(score, level, lines) {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }
}