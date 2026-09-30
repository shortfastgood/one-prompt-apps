// Entry point: wires the DOM to the game and runs the frame loop.

import { Game } from './game.js';
import { render } from './render.js';
import { TILE, TOWER_TYPES, WAVES } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game();

const els = {
  wave: document.getElementById('wave'),
  lives: document.getElementById('lives'),
  money: document.getElementById('money'),
  start: document.getElementById('start'),
  speed: document.getElementById('speed'),
  pause: document.getElementById('pause'),
  restart: document.getElementById('restart'),
  shop: document.getElementById('shop'),
  info: document.getElementById('info'),
};

// --- Tower shop -------------------------------------------------------------

function buildShop() {
  els.shop.innerHTML = '';
  for (const [key, type] of Object.entries(TOWER_TYPES)) {
    const btn = document.createElement('button');
    btn.className = 'shop-btn';
    btn.dataset.type = key;
    btn.innerHTML = `
      <span class="swatch" style="background:${type.color}"></span>
      <span>${type.name} · $${type.cost}</span>`;
    btn.title = type.desc;
    btn.addEventListener('click', () => {
      game.placing = game.placing === key ? null : key;
      game.selected = null;
      refresh();
    });
    els.shop.appendChild(btn);
  }
}

// --- Canvas interaction -----------------------------------------------------

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

canvas.addEventListener('mousemove', (e) => {
  game.hover = cellFromEvent(e);
});

canvas.addEventListener('mouseleave', () => {
  game.hover = null;
});

canvas.addEventListener('click', (e) => {
  const { col, row } = cellFromEvent(e);
  if (game.placing) {
    game.placeTower(game.placing, col, row);
  } else {
    game.selected = game.towers.find(t => t.col === col && t.row === row) || null;
  }
  refresh();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  game.placing = null;
  game.selected = null;
  refresh();
});

// --- Control buttons --------------------------------------------------------

els.start.addEventListener('click', () => {
  game.startWave();
  refresh();
});

els.speed.addEventListener('click', () => {
  game.speed = game.speed === 1 ? 2 : 1;
  els.speed.textContent = `Speed ${game.speed}x`;
});

els.pause.addEventListener('click', () => {
  game.paused = !game.paused;
  els.pause.textContent = game.paused ? 'Resume' : 'Pause';
});

els.restart.addEventListener('click', () => {
  game.reset();
  els.pause.textContent = 'Pause';
  els.speed.textContent = 'Speed 1x';
  refresh();
});

// --- HUD --------------------------------------------------------------------

function updateStats() {
  els.wave.textContent = `${game.waveNumber}/${WAVES.length}`;
  els.lives.textContent = String(game.lives);
  els.money.textContent = `$${game.money}`;
  els.start.disabled = game.state !== 'idle';
}

function renderPanel() {
  for (const btn of els.shop.querySelectorAll('.shop-btn')) {
    btn.classList.toggle('active', btn.dataset.type === game.placing);
  }

  if (game.selected) {
    const t = game.selected;
    const s = t.stats;
    const next = t.upgradeCost !== null ? TOWER_TYPES[t.type].levels[t.level] : null;
    els.info.innerHTML = `
      <h3>${TOWER_TYPES[t.type].name} Lv.${t.level}</h3>
      <p>${TOWER_TYPES[t.type].desc}</p>
      <p>Damage ${s.damage} · Range ${s.range} · Rate ${s.fireRate}s</p>
      ${next ? `<p>Upgrade → damage ${next.damage}, range ${next.range}</p>` : '<p>Max level</p>'}
      <div class="row">
        ${t.upgradeCost !== null ? `<button id="upgrade">Upgrade $${t.upgradeCost}</button>` : ''}
        <button id="sell">Sell $${t.sellValue}</button>
      </div>`;
    els.info.querySelector('#upgrade')?.addEventListener('click', () => {
      if (game.upgradeTower(t)) refresh();
    });
    els.info.querySelector('#sell')?.addEventListener('click', () => {
      game.sellTower(t);
      refresh();
    });
  } else {
    els.info.innerHTML = '<p>Select a tower to build, or click a placed tower.</p>';
  }
}

function refresh() {
  updateStats();
  renderPanel();
}

// --- Frame loop -------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  game.update(dt);
  render(ctx, game);
  updateStats();
  requestAnimationFrame(frame);
}

buildShop();
refresh();
requestAnimationFrame(frame);
