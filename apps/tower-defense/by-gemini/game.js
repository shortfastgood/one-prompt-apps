const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game Settings
const TILE_SIZE = 40;
const COLS = 25; // 1000 / 40 = 25
const ROWS = 17; // 700 / 40 = 17.5 -> we'll use 17 fully visible rows.

// State
const Game = {
    state: {
        money: 300,
        lives: 20,
        wave: 1,
        status: 'playing', // 'playing', 'paused', 'gameover'
    },

    // Arrays for entities
    enemies: [],
    towers: [],
    projectiles: [],

    // Map Path Nodes (Grid Coordinates)
    // Avoid top row (y=0,1) for HUD overlap
    path: [
        { x: -1, y: 3 },  // Start left
        { x: 5, y: 3 },
        { x: 5, y: 9 },
        { x: 2, y: 9 },
        { x: 2, y: 12 },
        { x: 10, y: 12 },
        { x: 10, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 12 },
        { x: 20, y: 12 },
        { x: 20, y: 4 },
        { x: 25, y: 4 }   // End right
    ],
    lastTime: 0,

    init() {
        canvas.width = 1000;
        canvas.height = 700;

        requestAnimationFrame(this.loop.bind(this));
    },

    loop(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000; // delta time in seconds

        // Prevent huge jumps if tab was inactive
        if (dt > 0.1) dt = 0.1;

        this.lastTime = timestamp;

        if (this.state.status === 'playing') {
            this.update(dt);
        }

        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    },

    update(dt) {
        if (window.Entities && window.Entities.WaveManager) {
            window.Entities.WaveManager.update(dt);
        }

        // Update entities
        this.enemies.forEach(e => e.update(dt));
        this.towers.forEach(t => t.update(dt));
        this.projectiles.forEach(p => p.update(dt));

        // Clean up arrays
        this.enemies = this.enemies.filter(e => e.isActive);
        this.projectiles = this.projectiles.filter(p => p.isActive);

        // Check game over
        if (this.state.lives <= 0 && this.state.status !== 'gameover') {
            this.gameOver();
        }

        if (window.UI) window.UI.updateHUD();
    },

    draw() {
        // Background
        ctx.fillStyle = '#272B30';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw map map base

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Draw path
        this.drawPath();

        if (window.UI) window.UI.draw(ctx);

        // Draw entities
        this.towers.forEach(t => t.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
    },

    drawPath() {
        ctx.strokeStyle = '#4A4E54';
        ctx.lineWidth = TILE_SIZE;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        ctx.beginPath();
        for (let i = 0; i < this.path.length; i++) {
            const p = this.path[i];
            const px = p.x * TILE_SIZE + TILE_SIZE / 2;
            const py = p.y * TILE_SIZE + TILE_SIZE / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Inner line path dirt
        ctx.strokeStyle = '#5E646A';
        ctx.lineWidth = TILE_SIZE - 4;
        ctx.stroke();
    },

    gameOver() {
        this.state.status = 'gameover';
        if (window.UI) window.UI.showGameOver();
    },

    togglePause() {
        if (this.state.status === 'playing') {
            this.state.status = 'paused';
            document.getElementById('btn-pause').innerText = 'RESUME';
        } else if (this.state.status === 'paused') {
            this.state.status = 'playing';
            this.lastTime = performance.now();
            document.getElementById('btn-pause').innerText = 'PAUSE';
        }
    },

    startNextWave() {
        if (window.Entities && window.Entities.WaveManager) {
            if (this.state.status === 'playing') {
                window.Entities.WaveManager.startWave();
            }
        }
    },

    restart() {
        this.state.money = 300;
        this.state.lives = 20;
        this.state.wave = 1;
        this.state.status = 'playing';
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];

        if (window.Entities && window.Entities.WaveManager) {
            window.Entities.WaveManager.reset();
        }
        if (window.UI) {
            window.UI.hideGameOver();
            window.UI.updateHUD();
        }
        this.lastTime = performance.now();
    },

    isPathTile(x, y) {
        // Simple way to check if a grid cell is on the path by doing line segment point overlap
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;

        const pathW = TILE_SIZE / 2;

        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];

            const minX = Math.min(p1.x, p2.x) * TILE_SIZE;
            const maxX = Math.max(p1.x, p2.x) * TILE_SIZE + TILE_SIZE;
            const minY = Math.min(p1.y, p2.y) * TILE_SIZE;
            const maxY = Math.max(p1.y, p2.y) * TILE_SIZE + TILE_SIZE;

            // Allow clicking EXACTLY on top of a tile
            if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
                return true;
            }
        }
        return false;
    }
};

window.Game = Game;
window.TILE_SIZE = TILE_SIZE;
window.COLS = COLS;
window.ROWS = ROWS;

window.addEventListener('load', () => {
    Game.init();
});
