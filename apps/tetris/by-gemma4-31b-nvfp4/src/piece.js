import { TETROMINOES, TYPES, COLORS } from './constants.js';

export class Piece {
    constructor(type) {
        this.type = type;
        this.shape = JSON.parse(JSON.stringify(TETROMINOES[type]));
        this.color = COLORS[type];
        this.row = 0;
        this.col = Math.floor((10 - this.shape[0].length) / 2);
    }

    rotate() {
        const newShape = this.shape[0].map((_, i) => 
            this.shape.map(row => row[i]).reverse()
        );
        this.shape = newShape;
    }
}