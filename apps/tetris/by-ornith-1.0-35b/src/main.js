// ===================================================
//  Main – entry point, wire Game + Renderer + Input
// ===================================================

import { Game } from './game.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const renderer = new Renderer(game);
  const input = new InputHandler(game, () => game.start());

  // Wire renderer to game updates
  game.onUpdate = () => {
    renderer.render(game);
  };

  // Button click handler (start/restart)
  const btn = document.getElementById('overlay-btn');
  btn.addEventListener('click', () => {
    game.start();
  });
});
