// ===================================================
//  Main – entry point: wires Game, Renderer, Input
// ===================================================

import { Game, STATE } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

// -----------------------------------------------
//  Instantiate
// -----------------------------------------------

const game = new Game();
const renderer = new Renderer(game);

function startGame() {
  game.start();
  renderer.render(game);
}

const input = new InputHandler(game, startGame);

// -----------------------------------------------
//  React to game updates
// -----------------------------------------------

game.onUpdate = (g) => {
  renderer.render(g);
};

game.onLinesClear = (n) => {
  flashLines(n);
};

// -----------------------------------------------
//  Overlay play button
// -----------------------------------------------

document.getElementById('overlay-btn').addEventListener('click', startGame);

// -----------------------------------------------
//  Keyboard shortcut: R to restart anywhere
// -----------------------------------------------

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    startGame();
  }
});

// -----------------------------------------------
//  Visual feedback: brief canvas flash on line clear
// -----------------------------------------------

function flashLines(n) {
  const canvas = document.getElementById('board-canvas');
  const colors = ['', '#55ff55', '#ffff55', '#ff9900', '#ff00ff'];
  const color = colors[Math.min(n, 4)];
  let flashes = 0;
  const max = 3;
  const interval = setInterval(() => {
    canvas.style.boxShadow = flashes % 2 === 0
      ? `0 0 24px ${color}, inset 0 0 12px ${color}44`
      : '0 0 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)';
    flashes++;
    if (flashes >= max * 2) {
      clearInterval(interval);
      canvas.style.boxShadow = '0 0 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)';
    }
  }, 60);
}
