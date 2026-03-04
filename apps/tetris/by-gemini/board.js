import { Piece } from './Piece.js';
import { SHAPES, COLORS } from './tetrominoes.js';

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export class Board {
    constructor(ctx, ctxNext, ctxHold) {
        this.ctx = ctx;
        this.ctxNext = ctxNext;
        this.ctxHold = ctxHold;
        this.reset();
    }

    getEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    reset() {
        this.grid = this.getEmptyBoard();
        this.piece = null;
        this.ghost = null;
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.score = 0;
        this.lines = 0;
        this.level = 1;

        for (let i = 0; i < 3; i++) {
            this.nextPieces.push(this.randomPiece());
        }
    }

    randomPiece() {
        const id = Math.floor(Math.random() * 7) + 1; // 1 to 7
        return new Piece(this.ctx, id);
    }

    draw() {
        // Draw grid background
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * BLOCK_SIZE, 0);
            this.ctx.lineTo(i * BLOCK_SIZE, this.ctx.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < ROWS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * BLOCK_SIZE);
            this.ctx.lineTo(this.ctx.canvas.width, i * BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Draw locked blocks
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                let value = this.grid[y][x];
                if (value > 0) {
                    this.drawBlock(this.ctx, x, y, COLORS[value], BLOCK_SIZE);
                }
            }
        }

        // Draw ghost piece
        if (this.ghost) {
            this.ghost.draw(0, 0, true);
        }

        // Draw active piece
        if (this.piece) {
            this.piece.draw();
        }
    }

    drawBlock(context, x, y, color, size) {
        context.fillStyle = color;
        context.fillRect(x * size, y * size, size, size);

        context.strokeStyle = 'rgba(0,0,0,0.5)';
        context.lineWidth = 1;
        context.strokeRect(x * size, y * size, size, size);

        // 3D effect highlight
        context.fillStyle = 'rgba(255,255,255,0.3)';
        context.fillRect(x * size, y * size, size, 4);
        context.fillRect(x * size, y * size, 4, size);
    }

    drawNext() {
        this.ctxNext.clearRect(0, 0, this.ctxNext.canvas.width, this.ctxNext.canvas.height);
        this.nextPieces.forEach((p, index) => {
            this.drawMiniPiece(this.ctxNext, p, 60, index * 100 + 60);
        });
    }

    drawHold() {
        this.ctxHold.clearRect(0, 0, this.ctxHold.canvas.width, this.ctxHold.canvas.height);
        if (this.holdPiece) {
            this.drawMiniPiece(this.ctxHold, this.holdPiece, 60, 60);
        }
    }

    drawMiniPiece(ctx, p, cx, cy) {
        const bSize = 25;
        const shapeWidth = p.shape[0].length * bSize;
        const shapeHeight = p.shape.length * bSize;

        // Handle specifics based on shapes for centering (some have trailing empty columns)
        let exactWidth = shapeWidth;
        let exactHeight = shapeHeight;

        let ox = cx - exactWidth / 2;
        let oy = cy - exactHeight / 2;

        // Adjust vertically for 'I' piece
        if (p.id === 1) oy -= bSize / 2;

        p.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    const blockX = ox + x * bSize;
                    const blockY = oy + y * bSize;

                    ctx.fillStyle = p.color;
                    ctx.fillRect(blockX, blockY, bSize, bSize);
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.strokeRect(blockX, blockY, bSize, bSize);

                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect(blockX, blockY, bSize, 3);
                    ctx.fillRect(blockX, blockY, 3, bSize);
                }
            });
        });
    }

    updateGhost() {
        if (!this.piece) return;
        this.ghost = this.piece.clone();
        while (this.isValid(this.ghost, this.ghost.x, this.ghost.y + 1)) {
            this.ghost.y++;
        }
    }

    hold() {
        if (!this.canHold) return;

        if (this.holdPiece === null) {
            this.holdPiece = new Piece(this.ctx, this.piece.id);
            this.spawnPiece();
        } else {
            const temp = this.piece.id;
            this.piece = new Piece(this.ctx, this.holdPiece.id);
            this.holdPiece = new Piece(this.ctx, temp);

            // Re-spawn pos
            this.piece.x = (this.piece.id === 4) ? 4 : 3;
            this.piece.y = 0;
            this.updateGhost();
        }
        this.canHold = false;
        this.drawHold();
    }

    spawnPiece() {
        this.piece = this.nextPieces.shift();
        this.nextPieces.push(this.randomPiece());
        this.drawNext();
        this.updateGhost();

        if (!this.isValid(this.piece, this.piece.x, this.piece.y)) {
            return false; // Game Over
        }
        return true;
    }

    rotateMatrix(p) {
        // Transpose
        for (let y = 0; y < p.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [p[x][y], p[y][x]] = [p[y][x], p[x][y]];
            }
        }
        // Reverse rows
        p.forEach(row => row.reverse());
        return p;
    }

    rotatePiece() {
        if (this.piece.id === 4) return; // Don't rotate O piece

        let p = this.piece.clone();
        p.shape = this.rotateMatrix(p.shape);

        // Wall kicks
        let kickX = 0;
        let kickY = 0;
        if (!this.isValid(p, p.x, p.y)) {
            if (this.isValid(p, p.x + 1, p.y)) kickX = 1;
            else if (this.isValid(p, p.x - 1, p.y)) kickX = -1;
            else if (this.isValid(p, p.x + 2, p.y)) kickX = 2; // I Piece kicks
            else if (this.isValid(p, p.x - 2, p.y)) kickX = -2;
            else if (this.isValid(p, p.x, p.y - 1)) kickY = -1; // Floor kick
            else if (this.isValid(p, p.x, p.y - 2)) kickY = -2; // I Piece floor kick
            else return; // Cannot rotate
        }

        p.x += kickX;
        p.y += kickY;
        this.piece.move(p);
        this.updateGhost();
    }

    drop() {
        let p = this.piece.clone();
        p.y++;
        if (this.isValid(p, p.x, p.y)) {
            this.piece.move(p);
            this.updateGhost();
            return true;
        } else {
            this.lock();
            this.canHold = true;
            this.clearLines();
            return this.spawnPiece();
        }
    }

    hardDrop() {
        this.piece.y = this.ghost.y;
        this.lock();
        this.canHold = true;
        this.clearLines();
        return this.spawnPiece();
    }

    lock() {
        this.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.grid[this.piece.y + y][this.piece.x + x] = value;
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.grid[y].every(value => value > 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; // check same index again since it pulled a new row down
            }
        }

        if (linesCleared > 0) {
            const points = [0, 100, 300, 500, 800];
            this.score += points[linesCleared] * this.level;
            this.lines += linesCleared;
            // Level up every 10 lines
            this.level = Math.floor(this.lines / 10) + 1;
        }
    }

    isValid(piece, px, py) {
        return piece.shape.every((row, dy) => {
            return row.every((value, dx) => {
                let x = px + dx;
                let y = py + dy;
                return (
                    value === 0 ||
                    (this.isInsideWalls(x) && this.isAboveFloor(y) && this.isNotOccupied(x, y))
                );
            });
        });
    }

    isInsideWalls(x) { return x >= 0 && x < COLS; }
    isAboveFloor(y) { return y < ROWS; }
    isNotOccupied(x, y) { return this.grid[y] && this.grid[y][x] === 0; }
}
