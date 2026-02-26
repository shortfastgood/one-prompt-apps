// ===================================================
//  Input – keyboard handling with DAS / ARR
// ===================================================

import { STATE } from './game.js';

// Delayed Auto Shift settings (ms)
const DAS = 167;   // delay before auto-repeat starts
const ARR = 33;    // auto-repeat interval (≈30 Hz)

export class InputHandler {
  constructor(game, onStart) {
    this.game = game;
    this.onStart = onStart;

    this._dasLeft  = null;
    this._dasRight = null;
    this._arrLeft  = null;
    this._arrRight = null;
    this._downInterval = null;

    this._held = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this._clearAll();
  }

  _onKeyDown(e) {
    if (this._held.has(e.code)) return; // ignore key repeat
    this._held.add(e.code);

    const g = this.game;

    // Allow starting / restarting from any state
    if (g.state === STATE.IDLE || g.state === STATE.GAMEOVER) {
      if (!['KeyP', 'Escape'].includes(e.code)) {
        this.onStart();
        return;
      }
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      g.pause();
      return;
    }

    if (g.state !== STATE.PLAYING) return;

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        g.moveLeft();
        this._startDAS('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        g.moveRight();
        this._startDAS('right');
        break;
      case 'ArrowDown':
        e.preventDefault();
        g.softDrop();
        this._startSoftDropRepeat();
        break;
      case 'ArrowUp':
      case 'KeyZ':
        e.preventDefault();
        g.rotateCW();
        break;
      case 'KeyX':
        e.preventDefault();
        g.rotateCCW();
        break;
      case 'Space':
        e.preventDefault();
        g.hardDrop();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        g.hold();
        break;
    }
  }

  _onKeyUp(e) {
    this._held.delete(e.code);
    switch (e.code) {
      case 'ArrowLeft':
        this._stopDAS('left');
        break;
      case 'ArrowRight':
        this._stopDAS('right');
        break;
      case 'ArrowDown':
        this._stopSoftDropRepeat();
        break;
    }
  }

  // -----------------------------------------------
  //  DAS helpers
  // -----------------------------------------------

  _startDAS(dir) {
    this._stopDAS(dir);
    const move = dir === 'left'
      ? () => this.game.moveLeft()
      : () => this.game.moveRight();
    const dasKey = dir === 'left' ? '_dasLeft' : '_dasRight';
    const arrKey = dir === 'left' ? '_arrLeft' : '_arrRight';

    this[dasKey] = setTimeout(() => {
      this[arrKey] = setInterval(() => {
        if (this.game.state === STATE.PLAYING) move();
      }, ARR);
    }, DAS);
  }

  _stopDAS(dir) {
    const dasKey = dir === 'left' ? '_dasLeft' : '_dasRight';
    const arrKey = dir === 'left' ? '_arrLeft' : '_arrRight';
    if (this[dasKey]) { clearTimeout(this[dasKey]);  this[dasKey] = null; }
    if (this[arrKey]) { clearInterval(this[arrKey]); this[arrKey] = null; }
  }

  _startSoftDropRepeat() {
    this._stopSoftDropRepeat();
    this._downInterval = setInterval(() => {
      if (this.game.state === STATE.PLAYING) this.game.softDrop();
    }, ARR);
  }

  _stopSoftDropRepeat() {
    if (this._downInterval) {
      clearInterval(this._downInterval);
      this._downInterval = null;
    }
  }

  _clearAll() {
    this._stopDAS('left');
    this._stopDAS('right');
    this._stopSoftDropRepeat();
  }
}
