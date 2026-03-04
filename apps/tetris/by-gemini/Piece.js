import { SHAPES, COLORS } from './tetrominoes.js';

export class Piece {
    constructor(ctx, id) {
        this.ctx = ctx;
        this.id = id;
        this.color = COLORS[id];
        this.shape = SHAPES[id];

        // Spawn position
        this.x = 3;
        if (id === 4) this.x = 4; // Shift 'O' piece nicely to center
        this.y = 0;
    }

    draw(offsetX = 0, offsetY = 0, isGhost = false) {
        this.ctx.fillStyle = isGhost ? this.color + '66' : this.color;
        // Adding borders
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;

        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    const drawX = (this.x + x) * 30 + offsetX;
                    const drawY = (this.y + y) * 30 + offsetY;

                    this.ctx.fillRect(drawX, drawY, 30, 30);
                    this.ctx.strokeRect(drawX, drawY, 30, 30);

                    if (!isGhost) {
                        // 3D highlight effect
                        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        this.ctx.fillRect(drawX, drawY, 30, 4);
                        this.ctx.fillRect(drawX, drawY, 4, 30);
                        this.ctx.fillStyle = this.color;
                    }
                }
            });
        });
    }

    move(p) {
        this.x = p.x;
        this.y = p.y;
        this.shape = p.shape;
    }

    clone() {
        const newPiece = new Piece(this.ctx, this.id);
        newPiece.x = this.x;
        newPiece.y = this.y;
        // Deep copy the internal 2D array
        newPiece.shape = this.shape.map(r => [...r]);
        return newPiece;
    }
}
