import { TetrisGame } from "./game.js";
import { InputController } from "./input.js";
import { CanvasRenderer } from "./renderer.js";

const elements = {
  boardCanvas: document.getElementById("board"),
  holdCanvas: document.getElementById("holdCanvas"),
  nextCanvases: [
    document.getElementById("nextCanvas0"),
    document.getElementById("nextCanvas1"),
    document.getElementById("nextCanvas2"),
  ],
  scoreEl: document.getElementById("scoreValue"),
  levelEl: document.getElementById("levelValue"),
  linesEl: document.getElementById("linesValue"),
  stateEl: document.getElementById("stateValue"),
  overlayEl: document.getElementById("boardOverlay"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
};

const game = new TetrisGame();
const renderer = new CanvasRenderer(elements);
const input = new InputController(game);

elements.pauseBtn.addEventListener("click", () => {
  game.togglePause();
});

elements.restartBtn.addEventListener("click", () => {
  game.restart();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !game.isGameOver && !game.isPaused) {
    game.togglePause();
  }
});

input.attach();

let lastTime = performance.now();
function frame(now) {
  const delta = now - lastTime;
  lastTime = now;

  game.update(delta);
  renderer.render(game.getState());

  window.requestAnimationFrame(frame);
}

renderer.render(game.getState());
window.requestAnimationFrame(frame);
