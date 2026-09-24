// Entry point: wires the game model to the canvases, stats and controls.

import { Game } from './game.js';
import { drawBoard, drawPiece } from './render.js';

const game = new Game();

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next');
const holdCanvas = document.getElementById('hold');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const pauseBtn = document.getElementById('pause');
const restartBtn = document.getElementById('restart');

const CELL = 30;

function render() {
  drawBoard(boardCanvas.getContext('2d'), game, CELL);

  const nextCtx = nextCanvas.getContext('2d');
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  game.next.forEach((type, i) => drawPiece(nextCtx, type, 15, 2, i * 4));

  const holdCtx = holdCanvas.getContext('2d');
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  drawPiece(holdCtx, game.hold, 15, 2, 0);

  scoreEl.textContent = game.score;
  levelEl.textContent = game.level;
  linesEl.textContent = game.lines;
  pauseBtn.textContent = game.paused ? 'Resume' : 'Pause';
}

const KEYS = {
  ArrowLeft: () => game.move(-1),
  KeyA: () => game.move(-1),
  ArrowRight: () => game.move(1),
  KeyD: () => game.move(1),
  ArrowDown: () => game.softDrop(),
  KeyS: () => game.softDrop(),
  ArrowUp: () => game.rotate(1),
  KeyW: () => game.rotate(1),
  KeyX: () => game.rotate(1),
  KeyZ: () => game.rotate(-1),
  Space: () => game.hardDrop(),
  KeyC: () => game.holdPiece(),
  KeyR: () => game.reset(),
  KeyP: () => {
    if (!game.over) game.paused = !game.paused;
  },
};

document.addEventListener('keydown', (e) => {
  const fn = KEYS[e.code];
  if (!fn) return;
  e.preventDefault();
  fn();
  render();
});

pauseBtn.addEventListener('click', () => {
  if (!game.over) game.paused = !game.paused;
  render();
});

restartBtn.addEventListener('click', () => {
  game.reset();
  render();
});

let last = performance.now();

function loop(now) {
  if (game.paused || game.over) {
    last = now;
  } else if (now - last >= game.dropInterval()) {
    game.step();
    last = now;
  }
  render();
  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
