const HANDLED_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "Space",
  "KeyA",
  "KeyD",
  "KeyS",
  "KeyW",
  "KeyX",
  "KeyZ",
  "KeyC",
  "KeyP",
  "KeyR",
  "Escape",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
]);

export class InputController {
  constructor(game) {
    this.game = game;
    this.onKeyDown = (event) => this.handleKeyDown(event);
    this.onKeyUp = (event) => this.handleKeyUp(event);
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  handleKeyDown(event) {
    if (HANDLED_CODES.has(event.code)) {
      event.preventDefault();
    }

    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        this.game.moveLeft();
        break;
      case "ArrowRight":
      case "KeyD":
        this.game.moveRight();
        break;
      case "ArrowDown":
      case "KeyS":
        this.game.setSoftDropActive(true);
        if (!event.repeat) {
          this.game.softDropStep();
        }
        break;
      case "Space":
        if (!event.repeat) {
          this.game.hardDrop();
        }
        break;
      case "ArrowUp":
      case "KeyW":
      case "KeyX":
        if (!event.repeat) {
          this.game.rotateCW();
        }
        break;
      case "KeyZ":
      case "ControlLeft":
      case "ControlRight":
        if (!event.repeat) {
          this.game.rotateCCW();
        }
        break;
      case "KeyC":
      case "ShiftLeft":
      case "ShiftRight":
        if (!event.repeat) {
          this.game.hold();
        }
        break;
      case "KeyP":
      case "Escape":
        if (!event.repeat) {
          this.game.togglePause();
        }
        break;
      case "KeyR":
        if (!event.repeat) {
          this.game.restart();
        }
        break;
      default:
        break;
    }
  }

  handleKeyUp(event) {
    if (event.code === "ArrowDown" || event.code === "KeyS") {
      this.game.setSoftDropActive(false);
    }
  }
}
