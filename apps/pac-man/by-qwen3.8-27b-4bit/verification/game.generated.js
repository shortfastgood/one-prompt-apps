
"use strict";

// ================= Constants =================
const COLS = 30, ROWS = 20, CELL = 40;
const W = COLS * CELL, H = ROWS * CELL;
const WALL = 1, DOT = 2, PELLET = 3, DOOR = 4; // 0 = empty floor
const HOUSE = { x0: 11, y0: 8, x1: 18, y1: 11 };
const RING  = { x0: 10, y0: 7, x1: 19, y1: 12 };
const EXIT = { x: 14, y: 7 };
const SPAWN = { x: 1, y: 1 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // right, left, down, up
const KEY_DIRS = {
  ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1],
};
const GHOST_DEFS = [
  { red: true,  color: "#ff0000", pos: [14, 7],  home: [12, 10], initWait: null  },
  { red: false, color: "#ffc0cb", pos: null,     home: [13, 10], initWait: 900   },
  { red: false, color: "#00ffff", pos: null,     home: [14, 10], initWait: 1800  },
  { red: false, color: "#ffa500", pos: null,     home: [15, 10], initWait: 2700  },
  { red: false, color: "#00ff00", pos: null,     home: [16, 10], initWait: 3600  },
  { red: false, color: "#9b30ff", pos: null,     home: [17, 10], initWait: 4500  },
];
const POWER_TICKS = 300, RESPAWN_WAIT = 900;

// ================= Maze =================
function inBounds(x, y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }
function inHouse(x, y) { return x >= HOUSE.x0 && x <= HOUSE.x1 && y >= HOUSE.y0 && y <= HOUSE.y1; }
function inRing(x, y) { return x >= RING.x0 && x <= RING.x1 && y >= RING.y0 && y <= RING.y1 && !inHouse(x, y); }
function onBorder(x, y) { return x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1; }
function isFloor(v) { return v === 0 || v === DOT || v === PELLET; }
function walkable(x, y) { return inBounds(x, y) && isFloor(maze[y][x]); }

let maze = null;

function generateMaze() {
  maze = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (let x = 0; x < COLS; x++) { maze[0][x] = WALL; maze[ROWS - 1][x] = WALL; }
  for (let y = 0; y < ROWS; y++) { maze[y][0] = WALL; maze[y][COLS - 1] = WALL; }
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (inHouse(x, y)) {
        if (y === 8 && (x === 14 || x === 15)) maze[y][x] = DOOR;
        else if (x >= 12 && x <= 17 && y >= 9 && y <= 10) maze[y][x] = 0;
        else maze[y][x] = WALL;
      } else if (inRing(x, y)) {
        maze[y][x] = Math.random() < 0.1 ? PELLET : DOT;
      } else if (x === SPAWN.x && y === SPAWN.y) {
        maze[y][x] = 0;
      } else if (Math.random() < 0.2) {
        maze[y][x] = WALL;
      } else {
        maze[y][x] = Math.random() < 0.1 ? PELLET : DOT;
      }
    }
  }
  fixConnectivity();
}

// Flood-fill from the spawn over floor cells (doors and walls block).
function floodFill(sx, sy) {
  const reached = new Set([sx + "," + sy]);
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny) || !isFloor(maze[ny][nx])) continue;
      const key = nx + "," + ny;
      if (!reached.has(key)) { reached.add(key); stack.push([nx, ny]); }
    }
  }
  return reached;
}

// Shortest path from (sx, sy) to any reached cell, travelling only through
// interior cells outside the ghost-house footprint (walls are passable).
function bfsToReached(sx, sy, reached) {
  const start = sx + "," + sy;
  const prev = new Map();
  const visited = new Set([start]);
  const frontier = [[sx, sy]];
  let head = 0;
  while (head < frontier.length) {
    const [x, y] = frontier[head++];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny) || inHouse(nx, ny) || onBorder(nx, ny)) continue;
      const key = nx + "," + ny;
      if (visited.has(key)) continue;
      visited.add(key);
      prev.set(key, x + "," + y);
      if (reached.has(key)) {
        const path = [[nx, ny]];
        let k = key;
        while (k !== start) { path.push(k.split(",").map(Number)); k = prev.get(k); }
        path.reverse();
        return path;
      }
      frontier.push([nx, ny]);
    }
  }
  return null;
}

function fixConnectivity() {
  for (;;) {
    const reached = floodFill(SPAWN.x, SPAWN.y);
    let target = null;
    outer:
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (inHouse(x, y) || !isFloor(maze[y][x])) continue;
        if (!reached.has(x + "," + y)) { target = [x, y]; break outer; }
      }
    }
    if (!target) return;
    const path = bfsToReached(target[0], target[1], reached); // a path always exists: the interior minus the house is connected and contains the spawn
    for (const [x, y] of path) {
      if (!inHouse(x, y) && !onBorder(x, y) && maze[y][x] === WALL) maze[y][x] = DOT;
    }
  }
}

// ================= State =================
let score = 0, lives = 3, gameOver = false, escaped = false;
let player = null, ghosts = [], queue = [];

function randomDir() { return DIRS[Math.floor(Math.random() * DIRS.length)]; }

function makeGhost(def) {
  const [dx, dy] = randomDir();
  const px = def.pos ? def.pos[0] : def.home[0];
  const py = def.pos ? def.pos[1] : def.home[1];
  return {
    color: def.color, red: def.red,
    x: px, y: py, dx, dy,
    moveTimer: 0, waiting: def.initWait,
    home: def.home, initWait: def.initWait,
  };
}

function makePlayer(dir) {
  return {
    x: SPAWN.x, y: SPAWN.y, dir,
    moveTimer: 0, mouthOpen: true, mouthTimer: 0,
    powered: false, powerTimer: 0,
  };
}

function newGame() { // initial load: no heading until the first arrow press
  generateMaze();
  score = 0; lives = 3; gameOver = false; escaped = false;
  player = makePlayer(null);
  ghosts = GHOST_DEFS.map(makeGhost);
  queue.length = 0;
}

function fullReset() { // Space after an ending: heading cleared
  generateMaze();
  score = 0; lives = 3; gameOver = false;
  player = makePlayer(null);
  ghosts = GHOST_DEFS.map(makeGhost);
}

// ================= Player =================
function collectAt(x, y) {
  const v = maze[y][x];
  if (v === DOT) { maze[y][x] = 0; score += 10; }
  else if (v === PELLET) { maze[y][x] = 0; score += 50; player.powered = true; player.powerTimer = POWER_TICKS; }
}

function attemptSteer(dir) {
  const [dx, dy] = dir;
  if (player.dir && player.dir[0] === dx && player.dir[1] === dy) return; // same heading
  const nx = player.x + dx, ny = player.y + dy;
  if (!walkable(nx, ny)) return; // blocked: press consumed, no effect
  player.x = nx; player.y = ny;
  player.dir = dir; // canonical direction array
  player.moveTimer = 0;
  collectAt(nx, ny);
}

function stepPlayer() { // called once per active tick when a heading is set
  player.moveTimer++;
  if (player.moveTimer < 10) return;
  player.moveTimer = 0;
  const [dx, dy] = player.dir;
  const nx = player.x + dx, ny = player.y + dy;
  if (walkable(nx, ny)) { player.x = nx; player.y = ny; collectAt(nx, ny); }
  else player.dir = null; // blocked: stand still until the next steer
}

// ================= Ghosts =================
function updateGhost(g) {
  if (g.waiting != null) {
    g.waiting--;
    if (g.waiting <= 0) { // release: jump to the exit, keep direction
      g.waiting = null;
      g.x = EXIT.x; g.y = EXIT.y;
      g.moveTimer = 0;
    }
    return;
  }
  g.moveTimer++;
  if (g.moveTimer < 15) return;
  g.moveTimer = 0;
  const nx = g.x + g.dx, ny = g.y + g.dy;
  if (walkable(nx, ny)) { g.x = nx; g.y = ny; return; }
  const options = [];
  for (const [dx, dy] of DIRS) {
    if (walkable(g.x + dx, g.y + dy)) options.push([dx, dy]);
  }
  if (options.length) {
    const [dx, dy] = options[Math.floor(Math.random() * options.length)];
    g.dx = dx; g.dy = dy;
    g.x += dx; g.y += dy;
  } // else: no valid neighbours: stay in place, timer already reset
}

function respawnGhost(original) {
  const [dx, dy] = randomDir();
  return {
    color: original.color, red: original.red,
    x: original.home[0], y: original.home[1],
    dx, dy, moveTimer: 0, waiting: RESPAWN_WAIT,
    home: original.home, initWait: original.initWait,
  };
}

// ================= Tick =================
function anyCollectible() {
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (maze[y][x] === DOT || maze[y][x] === PELLET) return true;
  return false;
}

function tick() {
  // 1. Event phase: queued key events in arrival order.
  for (const ev of queue) {
    if (escaped) break; // after Escape all input is ignored
    if (ev.type === "escape") { escaped = true; continue; }
    if (ev.type === "space") { if (gameOver) fullReset(); continue; }
    if (ev.type === "steer" && !gameOver) attemptSteer(ev.dir);
  }
  queue.length = 0;
  if (escaped || gameOver) return;

  // 2. Player movement (before the mouth/power update of step 3).
  if (player.dir) stepPlayer();

  // 3. Mouth animation, then power timer.
  player.mouthTimer++;
  if (player.mouthTimer >= 10) { player.mouthOpen = !player.mouthOpen; player.mouthTimer = 0; }
  if (player.powered) { player.powerTimer--; if (player.powerTimer <= 0) player.powered = false; }

  // 4. Ghost movement.
  for (const g of ghosts) updateGhost(g);

  // 5. Collisions against a shallow snapshot in current list order.
  const snapshot = ghosts.slice();
  for (const g of snapshot) {
    if (g.x !== player.x || g.y !== player.y) continue;
    if (player.powered) {
      score += 200;
      const idx = ghosts.indexOf(g);
      if (idx >= 0) ghosts.splice(idx, 1);
      ghosts.push(respawnGhost(g));
    } else {
      lives--;
      if (lives <= 0) { gameOver = true; } // no early break: lives can go below zero
      else {
        player.x = SPAWN.x; player.y = SPAWN.y; // facing, timers, score, maze retained
        for (const g2 of ghosts) {
          if (g2.red) { g2.x = EXIT.x; g2.y = EXIT.y; g2.waiting = null; }
          else { g2.x = g2.home[0]; g2.y = g2.home[1]; g2.waiting = g2.initWait; }
        }
      }
    }
  }

  // 6. Win: no collectibles left.
  if (!gameOver && !anyCollectible()) gameOver = true;
}

// ================= Rendering =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

function drawMaze() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = maze[y][x];
      const px = x * CELL, py = y * CELL;
      if (v === WALL) {
        ctx.fillStyle = "#0000ff";
        ctx.fillRect(px, py, CELL, CELL);
      } else if (v === DOOR) {
        ctx.fillStyle = "#ffb8de";
        ctx.fillRect(px, py + 16, CELL, 8);
      } else if (v === DOT) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 18, py + 18, 4, 4);
      } else if (v === PELLET) {
        ctx.fillStyle = "#ffffff";
        circle(px + 20, py + 20, 8);
      }
    }
  }
}

// Mathematical angles (CCW, 0 = right, 90 = up) from the source renderer.
const MOUTH = {
  right: [30, 330], left: [150, 210], up: [60, 120], down: [240, 300],
};

function drawPlayer() {
  const cx = player.x * CELL + 20, cy = player.y * CELL + 20;
  ctx.fillStyle = "#ffff00";
  if (!player.mouthOpen) {
    circle(cx, cy, 18);
    return;
  }
  const d = player.dir || [1, 0];
  const [s, e] = d[0] === 1 ? MOUTH.right : d[0] === -1 ? MOUTH.left : d[1] === -1 ? MOUTH.up : MOUTH.down;
  const sr = s * Math.PI / 180, er = e * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 18, -sr, -er, true); // negative radians, counterclockwise
  ctx.closePath();
  ctx.fill();
}

function drawGhost(g) {
  const cx = g.x * CELL + 20, cy = g.y * CELL + 20;
  ctx.fillStyle = player.powered ? "#0000ff" : g.color;
  circle(cx, cy, 18);
  ctx.fillRect(cx - 18, cy, 36, 18);
  circle(cx - 9, cy + 18, 6);
  circle(cx, cy + 18, 6);
  circle(cx + 9, cy + 18, 6);
  ctx.fillStyle = "#ffffff";
  circle(cx - 6, cy - 6, 6);
  circle(cx + 6, cy - 6, 6);
  ctx.fillStyle = "#000000";
  const ox = Math.floor(g.dx * 3 / 2), oy = Math.floor(g.dy * 3 / 2); // Python floor division
  circle(cx - 6 + ox, cy - 6 + oy, 3);
  circle(cx + 6 + ox, cy - 6 + oy, 3);
}

function drawText() {
  ctx.fillStyle = "#ffffff";
  ctx.font = "36px sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 10, 10);
  ctx.textAlign = "right";
  ctx.fillText("Lives: " + lives, W - 10, 10);
  if (gameOver) {
    ctx.textAlign = "left";
    ctx.fillStyle = lives <= 0 ? "#ff0000" : "#ffff00";
    ctx.fillText(lives <= 0 ? "Game Over! Press SPACE to restart" : "You Win! Press SPACE to restart", 300, 400);
  }
}

function render() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  drawMaze();
  drawPlayer();
  for (const g of ghosts) drawGhost(g);
  drawText();
}

// ================= Input =================
function onKey(e) {
  const dir = KEY_DIRS[e.key];
  if (dir || e.key === " ") e.preventDefault();
  if (e.repeat) return; // OS key-repeat never steers
  if (escaped) return; // after Escape all input is ignored until reload
  if (dir) queue.push({ type: "steer", dir });
  else if (e.key === " ") queue.push({ type: "space" });
  else if (e.key === "Escape") queue.push({ type: "escape" });
}

function clearInput() { queue.length = 0; }

window.addEventListener("keydown", onKey);
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  clearInput(); // both transitions discard stale queued input
  if (!document.hidden) { last = performance.now(); acc = 0; } // no catch-up burst on return
});

// ================= Main loop: 60 Hz fixed simulation =================
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = now - last;
  last = now;
  if (dt < 0) dt = 0;
  if (dt > 250) acc = 0; // guard against long gaps (hidden tab, stalls)
  else acc += dt;
  while (acc + 1e-7 >= STEP) { acc -= STEP; tick(); } // tolerance: fixed-step accumulation is refresh-rate independent
  render();
}

newGame();
requestAnimationFrame(frame);
