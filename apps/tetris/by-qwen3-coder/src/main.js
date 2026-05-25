// Initialize game components
const boardElement = document.getElementById('board');
const nextPieceElement = document.getElementById('next-piece');
const holdPieceElement = document.getElementById('hold-piece');
const pauseButton = document.getElementById('pause-btn');
const restartButton = document.getElementById('restart-btn');

// Create game instance
const game = new Game();
const input = new InputHandler(game);
const renderer = new Renderer(boardElement, nextPieceElement, holdPieceElement);

console.log('Game initialized:', game);

// Game loop
function gameLoop(timestamp) {
    // Handle input regardless of game state (for pause/restart controls)
    input.handleMovement();
    
    if (game.state === 'playing') {
        // Update game state
        game.update();
        
        // Render game
        renderer.render(
            game.board,
            game.currentPiece,
            game.currentPosition,
            game.nextPiece,
            game.holdPiece
        );
        
        // Update stats
        renderer.updateStats(game.score, game.level);
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Event listeners
pauseButton.addEventListener('click', () => {
    console.log('Pause button clicked');
    game.togglePause();
});

restartButton.addEventListener('click', () => {
    console.log('Restart button clicked');
    game.restart();
});

// Start the game when the player presses a key or clicks the start button
// The game starts only when the player explicitly starts it