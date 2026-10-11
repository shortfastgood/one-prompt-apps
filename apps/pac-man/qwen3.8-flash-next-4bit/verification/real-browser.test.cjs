'use strict';

// Q-real-browser — a real renderer (DOM, keyboard, Canvas, rAF) loads the actual
// index.html offline. This is a browser-level confirmation that complements the
// VM harness suites; it is optional and must not fail a 100%-coverage run when
// Playwright or a launchable browser is unavailable.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const htmlPath = path.join(__dirname, '../index.html');
const url = pathToFileURL(htmlPath).href;

// Resolve Playwright and start a headless Chromium; skip cleanly if unavailable.
async function launch() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return { reason: 'Playwright is unavailable; install with `npm install --save-dev playwright`.' };
    }
    throw error;
  }
  for (const channel of [undefined, 'chrome']) {
    try {
      const browser = await playwright.chromium.launch({ headless: true, channel, timeout: 5000 });
      return { browser };
    } catch (error) {
      // fall through to the next channel
    }
  }
  return { reason: 'No usable browser. Run `npx playwright install chromium` or install Google Chrome.' };
}

test('Q-real-browser loads the real index.html offline and renders the HUD', async t => {
  const support = await launch();
  if (!support.browser) return t.skip(support.reason);
  const browser = support.browser;
  t.after(() => browser.close());

  const context = await browser.newContext({ offline: true, viewport: { width: 1200, height: 800 } });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(4000);

  const errors = [], network = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });

  await page.goto(url);
  const title = await page.title();
  assert.equal(title, 'Pac-Man', 'the page title is Pac-Man');

  // Real canvas is present at the documented size and the HUD state is live.
  const init = await page.evaluate(() => ({ size: [canvas.width, canvas.height], score, lives, gameOver, stopped }));
  assert.deepEqual(init.size, [1200, 800], 'canvas is 1200x800');
  assert.deepEqual([init.score, init.lives], [0, 3], 'HUD start state: score 0, lives 3');
  assert.equal(init.gameOver, false, 'no game-over state at load');
  assert.equal(init.stopped, false, 'game is running at load');

  assert.deepEqual(errors, [], 'no console errors');
  assert.deepEqual(network, [], 'no external network requests while offline');
}, { timeout: 25000 });

test('Q-real-browser arrow keys steer and Space restarts (real keyboard, real rAF)', async t => {
  const support = await launch();
  if (!support.browser) return t.skip(support.reason);
  const browser = support.browser;
  t.after(() => browser.close());

  const context = await browser.newContext({ offline: true, viewport: { width: 1200, height: 800 } });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  page.on('pageerror', e => assert.ok(false, `pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') assert.ok(false, `console error: ${m.text()}`); });

  await page.goto(url);
  await page.waitForFunction(() => typeof step === 'function' && typeof frame === 'function');

  // Open a clear corridor to the right of the spawn so the (randomly generated)
  // maze never blocks the very first steer. genMaze() may place a wall at (1,2),
  // which would leave the player stuck and make this test flaky.
  await page.evaluate(() => { for (let x = 1; x <= 5; x++) maze[1][x] = 2; });

  // Real keyboard: a held ArrowRight steers the player in the page's own rAF loop.
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => player.x > 1, null, { timeout: 4000 }).catch(() => {});
  const moved = await page.evaluate(() => player.x);
  await page.keyboard.up('ArrowRight');
  assert.ok(moved > 1, 'ArrowRight steered the player right (player.x advanced)');

  // Simulate a game-over state, then restart with a real Space press.
  await page.evaluate(() => { gameOver = true; stopped = false; });
  await page.keyboard.down(' ');
  // The queued restart only drains once a step() runs while not stopped;
  // advancing one frame does exactly that.
  await page.waitForFunction(() => !gameOver, null, { timeout: 4000 }).catch(() => {});
  const restarted = await page.evaluate(() => gameOver);
  await page.keyboard.up(' ');
  assert.equal(restarted, false, 'Space restarts the game from the game-over state');
}, { timeout: 25000 });
