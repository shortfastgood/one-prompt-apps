import { COLS, ROWS, COLORS } from './constants.js';

export class Board {
    constructor() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill('EMPTY'));
    }

    clearBoard() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill('EMPTY'));
    }

    setCell(row, col, color) {
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            this.grid[row][col] = color;
        }
    }

    getCell(row, col) {
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            return this.grid[row][col];
        }
        return 'WALL'; // Treat out of bounds as wall for collision
    }

    isValidMove(piece, rowOffset, colOffset) {
        const shape = piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const targetRow = rowOffset + r;
                    const targetCol = colOffset + c;

                    if (targetCol < 0 || targetCol >= COLS || targetRow >= ROWS) return false;
                    if (targetRow >= 0 && this.grid[targetRow][targetCol] !== 'EMPTY') return false;
                }
            }
        }
        return true;
    }

    lockPiece(piece) {
        const shape = piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const targetRow = piece.row + r;
                    const targetCol = piece.col + c;
                    if (targetRow >= 0) {
                        this.grid[targetRow][targetCol] = piece.color;
                    }
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every(cell => cell !== 'EMPTY')) {
                linesCleared++;
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill('EMPTY'));
                r++; // Check the same row index again
            }
        }
        return linesCleared;
    }
}