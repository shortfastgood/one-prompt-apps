
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const columns = 30, rows = 20, cellSize = 40;
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const arrows = { ArrowRight: directions[0], ArrowLeft: directions[1], ArrowUp: directions[3], ArrowDown: directions[2] };
let events = [];
let maze, player, ghosts, score, lives, gameOver;
let stopped = false;
const choose = items => items[Math.floor(Math.random() * items.length)];
const releaseInterval = 900;
const exitCell = [14, 7];
const ghostTypes = [
  { color: '#ff0000', slot: [12, 10], delay: 0 },
  { color: '#ffc0cb', slot: [13, 10], delay: releaseInterval },
  { color: '#00ffff', slot: [14, 10], delay: 2 * releaseInterval },
  { color: '#ffa500', slot: [15, 10], delay: 3 * releaseInterval },
  { color: '#00ff00', slot: [16, 10], delay: 4 * releaseInterval },
  { color: '#9b30ff', slot: [17, 10], delay: 5 * releaseInterval }
];
const inHouse = (x, y) => x >= 11 && x <= 18 && y >= 8 && y <= 11;
const inRing = (x, y) => x >= 10 && x <= 19 && y >= 7 && y <= 12 && !inHouse(x, y);

function placeGhost(ghost, initial) {
  const type = ghost.type;
  if (initial && !type.delay) {
    [ghost.x, ghost.y] = exitCell;
    ghost.waiting = null;
  } else {
    [ghost.x, ghost.y] = type.slot;
    ghost.waiting = initial ? type.delay : releaseInterval;
  }
}

function makeGhost(type, initial) {
  const ghost = { type, color: type.color, direction: choose(directions), moveTimer: 0 };
  placeGhost(ghost, initial);
  return ghost;
}

function reset() {
  score = 0;
  lives = 3;
  gameOver = false;
  maze = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => {
    if (x === 0 || x === columns - 1 || y === 0 || y === rows - 1) return 1;
    if (inHouse(x, y)) return y === 8 && (x === 14 || x === 15) ? 4 : y >= 9 && y <= 10 && x >= 12 && x <= 17 ? 0 : 1;
    if (!(x === 1 && y === 1) && !inRing(x, y) && Math.random() < 0.2) return 1;
    return Math.random() < 0.1 ? 3 : 2;
  }));
  maze[1][1] = 0;
  connectMaze();
  player = { x: 1, y: 1, direction: directions[0], mouthOpen: true, mouthTimer: 0, powered: false, powerTimer: 0, heading: null, moveTimer: 0 };
  ghosts = ghostTypes.map(type => makeGhost(type, true));
}

function connectMaze() {
  while (true) {
    const reached = new Set(['1,1']);
    const queue = [[1, 1]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (valid(nx, ny) && !reached.has(key)) {
          reached.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    let target = null;
    for (let y = 1; y < rows - 1 && !target; y++) {
      for (let x = 1; x < columns - 1; x++) {
        if (!inHouse(x, y) && maze[y][x] !== 1 && !reached.has(`${x},${y}`)) { target = [x, y]; break; }
      }
    }
    if (!target) return;
    const from = new Map([[target.join(), null]]);
    const search = [target];
    let end = null;
    for (let i = 0; i < search.length && !end; i++) {
      const [x, y] = search[i];
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (nx < 1 || nx > columns - 2 || ny < 1 || ny > rows - 2 || inHouse(nx, ny) || from.has(key)) continue;
        from.set(key, [x, y]);
        if (reached.has(key)) { end = [nx, ny]; break; }
        search.push([nx, ny]);
      }
    }
    for (let cell = end; cell; cell = from.get(cell.join())) {
      if (maze[cell[1]][cell[0]] === 1) maze[cell[1]][cell[0]] = 2;
    }
  }
}

function valid(x, y) {
  return x >= 0 && x < columns && y >= 0 && y < rows && maze[y][x] !== 1 && maze[y][x] !== 4;
}

function movePlayer(direction) {
  const x = player.x + direction[0], y = player.y + direction[1];
  if (!valid(x, y)) return false;
  player.x = x;
  player.y = y;
  player.direction = direction;
  if (maze[y][x] === 2) {
    score += 10;
    maze[y][x] = 0;
  } else if (maze[y][x] === 3) {
    score += 50;
    maze[y][x] = 0;
    player.powered = true;
    player.powerTimer = 300;
  }
  return true;
}

function steer(direction) {
  if (player.heading === direction) return;
  if (!movePlayer(direction)) return;
  player.heading = direction;
  player.moveTimer = 0;
}

function autoMove() {
  if (!player.heading || ++player.moveTimer < 10) return;
  player.moveTimer = 0;
  if (!movePlayer(player.heading)) player.heading = null;
}

function moveGhost(ghost) {
  if (ghost.waiting !== null) {
    if (--ghost.waiting > 0) return;
    ghost.waiting = null;
    [ghost.x, ghost.y] = exitCell;
    ghost.moveTimer = 0;
    return;
  }
  if (++ghost.moveTimer < 15) return;
  ghost.moveTimer = 0;
  if (!valid(ghost.x + ghost.direction[0], ghost.y + ghost.direction[1])) {
    const possible = directions.filter(([dx, dy]) => valid(ghost.x + dx, ghost.y + dy));
    if (!possible.length) return;
    ghost.direction = choose(possible);
  }
  ghost.x += ghost.direction[0];
  ghost.y += ghost.direction[1];
}

function tick() {
  for (const code of events) {
    if (code === 'Escape') {
      stopped = true;
      events = [];
      return;
    }
    if (!gameOver && arrows[code]) {
      steer(arrows[code]);
    }
    else if (gameOver && code === 'Space') reset();
  }
  events = [];
  if (gameOver) return;
  autoMove();
  if (++player.mouthTimer >= 10) {
    player.mouthOpen = !player.mouthOpen;
    player.mouthTimer = 0;
  }
  if (player.powered && --player.powerTimer <= 0) player.powered = false;
  ghosts.forEach(moveGhost);
  for (const ghost of [...ghosts]) {
    if (ghost.x !== player.x || ghost.y !== player.y) continue;
    if (player.powered) {
      ghosts.splice(ghosts.indexOf(ghost), 1);
      score += 200;
      ghosts.push(makeGhost(ghost.type, false));
    } else {
      lives--;
      if (lives <= 0) gameOver = true;
      else {
        player.x = 1;
        player.y = 1;
        for (const g of ghosts) placeGhost(g, true);
      }
    }
  }
  if (!maze.some(row => row.some(cell => cell === 2 || cell === 3))) gameOver = true;
}

function circle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const cell = maze[y][x];
      if (cell === 1) {
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (cell === 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x * cellSize + (cellSize - 4) / 2, y * cellSize + (cellSize - 4) / 2, 4, 4);
      } else if (cell === 3) circle(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 8, '#ffffff');
      else if (cell === 4) {
        ctx.fillStyle = '#ffb8de';
        ctx.fillRect(x * cellSize, y * cellSize + 16, cellSize, 8);
      }
    }
  }
  const px = player.x * cellSize + cellSize / 2, py = player.y * cellSize + cellSize / 2;
  if (!player.mouthOpen) circle(px, py, 18, '#ffff00');
  else {
    const [dx, dy] = player.direction;
    const [start, end] = dx === 1 ? [30, 330] : dx === -1 ? [150, 210] : dy === -1 ? [60, 120] : [240, 300];
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 18, -start * Math.PI / 180, -end * Math.PI / 180, true);
    ctx.closePath();
    ctx.fill();
  }
  for (const ghost of ghosts) {
    const x = ghost.x * cellSize + cellSize / 2, y = ghost.y * cellSize + cellSize / 2;
    const color = player.powered ? '#0000ff' : ghost.color;
    circle(x, y, 18, color);
    ctx.fillRect(x - 18, y, 36, 18);
    for (const offset of [-9, 0, 9]) circle(x + offset, y + 18, 6, color);
    for (const offset of [-6, 6]) circle(x + offset, y - 6, 6, '#ffffff');
    const ox = Math.floor(ghost.direction[0] * 3 / 2), oy = Math.floor(ghost.direction[1] * 3 / 2);
    for (const offset of [-6, 6]) circle(x + offset + ox, y - 6 + oy, 3, '#000000');
  }
  ctx.font = '36px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Score: ${score}`, 10, 10);
  ctx.textAlign = 'right';
  ctx.fillText(`Lives: ${lives}`, canvas.width - 10, 10);
  ctx.textAlign = 'left';
  if (gameOver) {
    ctx.fillStyle = lives <= 0 ? '#ff0000' : '#ffff00';
    ctx.fillText(lives <= 0 ? 'Game Over! Press SPACE to restart' : 'You Win! Press SPACE to restart', 300, 400);
  }
}

window.addEventListener('keydown', event => {
  if (arrows[event.code] || event.code === 'Space') event.preventDefault();
  if (stopped || event.repeat || document.hidden) return;
  if (arrows[event.code] || event.code === 'Space' || event.code === 'Escape') events.push(event.code);
});
window.addEventListener('keyup', event => {
  if (arrows[event.code] || event.code === 'Space') event.preventDefault();
});
function clearInput() { events = []; }
window.addEventListener('blur', clearInput);
const step = 1000 / 60;
let previous = null, accumulator = 0;
document.addEventListener('visibilitychange', () => {
  clearInput();
  previous = null;
  accumulator = 0;
});
function frame(now) {
  if (stopped) return;
  if (!document.hidden) {
    if (previous !== null) accumulator += now - previous;
    previous = now;
    while (accumulator + 1e-7 >= step) {
      tick();
      accumulator -= step;
      if (stopped) return;
    }
    draw();
  } else {
    previous = null;
    accumulator = 0;
  }
  requestAnimationFrame(frame);
}
reset();
draw();
requestAnimationFrame(frame);
