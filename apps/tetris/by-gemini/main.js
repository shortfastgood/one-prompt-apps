import { Board } from './board.js';

const canvas = document.getElementById('board-canvas');
const ctx = canvas.getContext('2d');

const nextCanvas = document.getElementById('next-canvas');
const ctxNext = nextCanvas.getContext('2d');

const holdCanvas = document.getElementById('hold-canvas');
const ctxHold = holdCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');

let board = new Board(ctx, ctxNext, ctxHold);
let requestId;
let time = { start: 0, elapsed: 0, level: 1000 };
let isPaused = false;
let isGameOver = false;

function resetGame() {
    board.reset();
    time = { start: performance.now(), elapsed: 0, level: 1000 };
    isPaused = false;
    isGameOver = false;
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    board.spawnPiece();
    updateStats();
    if (requestId) cancelAnimationFrame(requestId);
    animate();
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(requestId);
    finalScoreEl.innerText = board.score;
    gameOverScreen.classList.remove('hidden');
}

function togglePause() {
    if (isGameOver) return;

    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(requestId);
        pauseScreen.classList.remove('hidden');
    } else {
        time.start = performance.now();
        pauseScreen.classList.add('hidden');
        animate();
    }
}

function updateStats() {
    scoreEl.innerText = board.score;
    levelEl.innerText = board.level;
    linesEl.innerText = board.lines;

    // Level speed formula: 10% faster per level
    time.level = Math.max(100, 1000 * Math.pow(0.85, board.level - 1));
}

function animate(now = 0) {
    if (!time.start) time.start = now;
    time.elapsed = now - time.start;

    if (time.elapsed > time.level) {
        time.start = now;
        if (!board.drop()) {
            gameOver();
            return;
        }
        updateStats();
    }

    board.draw();
    requestId = requestAnimationFrame(animate);
}

document.addEventListener('keydown', event => {
    if (isGameOver) {
        if (event.code === 'Enter' || event.code === 'Space') {
            resetGame();
        }
        return;
    }

    // Prevent default scrolling for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'KeyP' || event.code === 'Escape') {
        togglePause();
        return;
    }

    if (isPaused) return;

    let p = board.piece.clone();

    switch (event.code) {
        case 'ArrowLeft':
            p.x--;
            if (board.isValid(p, p.x, p.y)) {
                board.piece.move(p);
                board.updateGhost();
                board.draw();
            }
            break;
        case 'ArrowRight':
            p.x++;
            if (board.isValid(p, p.x, p.y)) {
                board.piece.move(p);
                board.updateGhost();
                board.draw();
            }
            break;
        case 'ArrowDown':
            if (board.drop()) {
                time.start = performance.now(); // reset drop timer
            } else {
                gameOver();
            }
            updateStats();
            board.draw();
            break;
        case 'ArrowUp':
            board.rotatePiece();
            board.draw();
            break;
        case 'Space':
            if (!board.hardDrop()) {
                gameOver();
            }
            updateStats();
            board.draw();
            break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
            board.hold();
            board.draw();
            break;
    }
});

restartBtn.addEventListener('click', resetGame);
resumeBtn.addEventListener('click', togglePause);

// Blur buttons after click so spacebar doesn't trigger them again
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function () {
        this.blur();
    });
});

resetGame();
