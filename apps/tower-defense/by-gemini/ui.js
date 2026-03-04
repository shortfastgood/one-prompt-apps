const UI = {
    selectedToBuild: null, // 'basic', 'rapid', 'sniper'
    selectedTower: null, // Reference to placed tower for context menu
    hoverX: undefined,
    hoverY: undefined,

    init() {
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        canvas.addEventListener('mousemove', this.handleCanvasMove.bind(this));
        canvas.addEventListener('mouseleave', () => {
            this.hoverX = undefined;
            this.hoverY = undefined;
        });

        this.updateHUD();
    },

    updateHUD() {
        document.getElementById('stat-wave').innerText = Game.state.wave;
        document.getElementById('stat-lives').innerText = Game.state.lives;
        document.getElementById('stat-money').innerText = Game.state.money;
    },

    selectTowerToBuild(type) {
        this.closeContextMenu();

        if (this.selectedToBuild === type) {
            this.selectedToBuild = null;
        } else {
            this.selectedToBuild = type;
        }
        this.updateBuildMenuSelection();
    },

    updateBuildMenuSelection() {
        document.querySelectorAll('.tower-btn').forEach(btn => {
            if (btn.dataset.type === this.selectedToBuild) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    },

    handleCanvasMove(e) {
        const rect = e.target.getBoundingClientRect();
        // Adjust for canvas scaling vs pixel size, though here it's 1:1 usually
        const scaleX = document.getElementById('game-canvas').width / rect.width;
        const scaleY = document.getElementById('game-canvas').height / rect.height;

        this.hoverX = (e.clientX - rect.left) * scaleX;
        this.hoverY = (e.clientY - rect.top) * scaleY;
    },

    handleCanvasClick(e) {
        if (Game.state.status !== 'playing') return;

        const rect = e.target.getBoundingClientRect();
        const scaleX = document.getElementById('game-canvas').width / rect.width;
        const scaleY = document.getElementById('game-canvas').height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const gridX = Math.floor(x / window.TILE_SIZE);
        const gridY = Math.floor(y / window.TILE_SIZE);

        // 1. Check if clicking an existing tower
        const clickedTower = Game.towers.find(t => t.gridX === gridX && t.gridY === gridY);

        if (clickedTower) {
            this.openContextMenu(clickedTower);
            this.selectedToBuild = null;
            this.updateBuildMenuSelection();
            return;
        }

        // 2. Build tower if selected
        if (this.selectedToBuild) {
            if (Game.isPathTile(gridX, gridY)) {
                this.showMessage("Cannot build on path!");
                return;
            }

            const cost = window.Entities.TOWER_TYPES[this.selectedToBuild].cost;
            if (Game.state.money < cost) {
                this.showMessage("Not enough money!");
                return;
            }

            // Build it
            Game.state.money -= cost;
            Game.towers.push(new window.Entities.Tower(gridX, gridY, this.selectedToBuild));

            this.updateHUD();
        } else {
            this.closeContextMenu();
        }
    },

    openContextMenu(tower) {
        this.selectedTower = tower;
        const menu = document.getElementById('context-menu');
        menu.classList.remove('hidden');
        this.updateContextMenu();
    },

    updateContextMenu() {
        if (!this.selectedTower) return;
        const t = this.selectedTower;

        document.getElementById('context-level').innerText = t.level;
        document.getElementById('context-range').innerText = Math.round(t.range);
        document.getElementById('context-damage').innerText = Math.round(t.damage);

        const upCost = t.getUpgradeCost();
        document.getElementById('upgrade-cost').innerText = upCost;
        document.getElementById('sell-value').innerText = t.getSellValue();

        const upBtn = document.getElementById('btn-upgrade');
        if (Game.state.money >= upCost) {
            upBtn.disabled = false;
            upBtn.style.opacity = 1;
            upBtn.style.cursor = 'pointer';
        } else {
            upBtn.disabled = true;
            upBtn.style.opacity = 0.5;
            upBtn.style.cursor = 'not-allowed';
        }
    },

    closeContextMenu() {
        this.selectedTower = null;
        document.getElementById('context-menu').classList.add('hidden');
    },

    upgradeSelected() {
        if (!this.selectedTower) return;
        const cost = this.selectedTower.getUpgradeCost();
        if (Game.state.money >= cost) {
            this.selectedTower.upgrade();
            this.updateContextMenu();
            this.updateHUD();
        } else {
            this.showMessage("Not enough money!");
        }
    },

    sellSelected() {
        if (!this.selectedTower) return;
        Game.state.money += this.selectedTower.getSellValue();

        // Remove from array
        Game.towers = Game.towers.filter(t => t !== this.selectedTower);

        this.closeContextMenu();
        this.updateHUD();
    },

    showMessage(msg) {
        const div = document.getElementById('context-message');
        div.innerText = msg;
        div.classList.remove('hidden');
        div.style.opacity = 1;

        // Reset animation if called multiple times rapidly
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            clearTimeout(this.hideTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            div.style.opacity = 0;
            this.hideTimeout = setTimeout(() => div.classList.add('hidden'), 500);
        }, 2000);
    },

    showGameOver() {
        const overlay = document.getElementById('screen-overlay');
        document.getElementById('screen-title').innerText = 'GAME OVER';
        document.getElementById('screen-subtitle').innerText = 'You survived until Wave ' + Game.state.wave + '.';
        overlay.classList.remove('hidden');
        this.closeContextMenu();
    },

    hideGameOver() {
        document.getElementById('screen-overlay').classList.add('hidden');
    },

    draw(ctx) {
        // Draw grid hover if building
        if (this.selectedToBuild && this.hoverX !== undefined && this.hoverY !== undefined) {
            const gx = Math.floor(this.hoverX / window.TILE_SIZE);
            const gy = Math.floor(this.hoverY / window.TILE_SIZE);

            const px = gx * window.TILE_SIZE;
            const py = gy * window.TILE_SIZE;

            let canBuild = true;
            if (Game.isPathTile(gx, gy) || Game.towers.some(t => t.gridX === gx && t.gridY === gy)) {
                canBuild = false;
            }

            ctx.fillStyle = canBuild ? 'rgba(78, 205, 196, 0.3)' : 'rgba(242, 95, 92, 0.3)';
            ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);

            // Draw range circle
            const range = window.Entities.TOWER_TYPES[this.selectedToBuild].range;
            ctx.strokeStyle = canBuild ? 'rgba(78, 205, 196, 0.5)' : 'rgba(242, 95, 92, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px + window.TILE_SIZE / 2, py + window.TILE_SIZE / 2, range, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw range for selected context tower
        if (this.selectedTower) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.selectedTower.x, this.selectedTower.y, this.selectedTower.range, 0, Math.PI * 2);
            ctx.stroke();

            // Highlight tower box
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.selectedTower.x - window.TILE_SIZE / 2, this.selectedTower.y - window.TILE_SIZE / 2, window.TILE_SIZE, window.TILE_SIZE);
        }
    }
};

window.UI = UI;

window.addEventListener('load', () => {
    UI.init();
});
