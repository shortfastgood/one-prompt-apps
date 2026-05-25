// Input handling for the game
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.keyCooldowns = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for game keys to avoid scrolling
            if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'c', 'C', 'p', 'P', 'r', 'R'].includes(e.key)) {
                e.preventDefault();
            }
            
            // Handle specific controls
            if (e.key === 'p' || e.key === 'P') {
                this.handleKeyAction('p', () => this.game.togglePause());
            } else if (e.key === 'r' || e.key === 'R') {
                this.handleKeyAction('r', () => this.game.restart());
            } else if (e.key === 'c' || e.key === 'C') {
                this.handleKeyAction('c', () => this.game.holdPiece());
            } else if (e.key === 'ArrowLeft') {
                this.handleKeyAction('ArrowLeft', () => {
                    if (this.game.state === 'playing') {
                        this.game.movePiece(-1, 0);
                    }
                });
            } else if (e.key === 'ArrowRight') {
                this.handleKeyAction('ArrowRight', () => {
                    if (this.game.state === 'playing') {
                        this.game.movePiece(1, 0);
                    }
                });
            } else if (e.key === 'ArrowDown') {
                this.handleKeyAction('ArrowDown', () => {
                    if (this.game.state === 'playing') {
                        this.game.softDrop();
                    }
                });
            } else if (e.key === ' ') {
                this.handleKeyAction(' ', () => {
                    if (this.game.state === 'playing') {
                        this.game.hardDrop();
                    }
                });
            } else if (e.key === 'ArrowUp') {
                this.handleKeyAction('ArrowUp', () => {
                    if (this.game.state === 'playing') {
                        this.game.rotatePiece();
                    }
                });
            }
            
            this.keys[e.key] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            // Reset cooldown when key is released
            delete this.keyCooldowns[e.key];
        });
    }

    // Handle key action with cooldown to prevent repeat presses
    handleKeyAction(key, action) {
        // If key is already on cooldown, don't execute
        if (this.keyCooldowns[key]) {
            return;
        }
        
        // Execute the action
        action();
        
        // Set cooldown for this key (50ms cooldown)
        this.keyCooldowns[key] = true;
        setTimeout(() => {
            delete this.keyCooldowns[key];
        }, 50);
    }

    // Check if a key is pressed (for non-repeating actions)
    isPressed(key) {
        return this.keys[key];
    }

    // Handle movement controls (this is now handled in keydown)
    handleMovement() {
        // Movement is now handled directly in keydown events to prevent repetition
    }
}