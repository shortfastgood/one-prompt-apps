const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserSupport } = require('./browser-support.cjs');
const url = pathToFileURL(path.join(__dirname, '../index.html')).href;

// A real renderer, DOM, keyboard events, and Canvas; clock control avoids sleeps.
test('D08 real browser verification (optional)', { timeout: 25000 }, async t => {
  const support = await browserSupport();
  if (!support.browser) return t.skip(support.reason);
  const browser = support.browser;
  t.after(() => browser.close());
  const probe = await browser.newPage();
  if (!probe.clock) {
    await probe.close();
    return t.skip('Playwright clock support is missing; upgrade Playwright to 1.45 or newer.');
  }
  await probe.close();

  async function open(t, controlled = false) {
    const context = await browser.newContext({ offline: true, viewport: { width: 1200, height: 800 } });
    t.after(() => context.close());
    const page = await context.newPage();
    page.setDefaultTimeout(3000);
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    t.after(() => { assert.deepEqual(errors, [], 'browser errors'); assert.deepEqual(network, [], 'external requests'); });
    if (controlled) {
      await page.clock.install({ time: 1000 });
      await page.clock.pauseAt(2000);
    }
    await page.addInitScript(() => { Math.random = () => .5; });
    await page.goto(url);
    return page;
  }

  await t.test('D08 native RAF, offline load, real pixels and responsive canvas', async t => {
    const page = await open(t);
    assert.equal(await page.title(), 'Pac-Man');
    await page.waitForFunction(() => player.mouthTimer > 0);
    const pixels = await page.evaluate(() => {
      const pixel = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      return { size: [canvas.width, canvas.height], wall: pixel(10, 100), floor: pixel(500, 380), door: pixel(561, 337), dot: pixel(100, 60), player: pixel(50, 60), background: getComputedStyle(document.body).backgroundColor };
    });
    assert.deepEqual(pixels, { size: [1200,800], wall: [0,0,255,255], floor: [0,0,0,255], door: [255,184,222,255], dot: [255,255,255,255], player: [255,255,0,255], background: 'rgb(0, 0, 0)' });
    for (const [width,height] of [[600,800],[1200,400],[1600,1000]]) {
      await page.setViewportSize({ width,height });
      const box = await page.locator('canvas').boundingBox();
      assert.ok(Math.abs(box.width / box.height - 1.5) < .001);
      assert.ok(box.width <= width && box.height <= height);
      assert.ok(Math.abs(box.width - Math.min(1200,width,height*1.5)) < 1);
    }
  });

  async function corridor(page) {
    await page.evaluate(() => {
      ghosts = [];
      for (let x = 1; x < 9; x++) maze[1][x] = 0;
      maze[1][4] = 1;
      Object.assign(player, { x:1, y:1, heading:null, moveTimer:0 });
      score = 0; events = []; previous = null; accumulator = 0;
      window.keyObservations = [];
      window.addEventListener('keydown', event => window.keyObservations.push({ code: event.code, repeat: event.repeat, prevented: event.defaultPrevented }));
    });
    await page.clock.runFor(32); // Establish the first frame timestamp.
  }
  await t.test('E01 E02 D08 browser keyboard events, repeats and wall stopping', async t => {
    const page = await open(t, true); await corridor(page);
    await page.keyboard.down('ArrowRight'); await page.clock.runFor(32);
    assert.equal(await page.evaluate(() => player.x), 2);
    await page.keyboard.down('ArrowRight'); await page.clock.runFor(32);
    assert.equal(await page.evaluate(() => player.x), 2);
    assert.deepEqual(await page.evaluate(() => window.keyObservations), [
      { code:'ArrowRight', repeat:false, prevented:true }, { code:'ArrowRight', repeat:true, prevented:true },
    ]);
    await page.clock.runFor(500);
    assert.deepEqual(await page.evaluate(() => [player.x, player.heading, window.scrollX, window.scrollY]), [3,null,0,0]);
    await page.keyboard.up('ArrowRight');
  });

  await t.test('E06 T17 held key through real-browser restart', async t => {
    const page = await open(t, true); await corridor(page);
    await page.keyboard.down('ArrowRight'); await page.clock.runFor(32);
    await page.evaluate(() => { gameOver = true; });
    await page.keyboard.press('Space'); await page.clock.runFor(32);
    await page.keyboard.down('ArrowRight'); await page.clock.runFor(32);
    assert.deepEqual(await page.evaluate(() => [player.x, player.heading, lives, score]), [1,null,3,0]);
    await page.keyboard.up('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.clock.runFor(32);
    assert.equal(await page.evaluate(() => player.x), 2);
  });

  await t.test('E07 F06 Escape freezes rendered pixels and ignores later input', async t => {
    const page = await open(t, true); await corridor(page);
    const before = await page.evaluate(() => canvas.toDataURL());
    await page.keyboard.press('Escape'); await page.clock.runFor(32);
    assert.equal(await page.evaluate(() => stopped), true);
    const state = await page.evaluate(() => JSON.stringify({ player, score, lives }));
    await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); await page.clock.runFor(1000);
    assert.equal(await page.evaluate(() => canvas.toDataURL()), before);
    assert.equal(await page.evaluate(() => JSON.stringify({ player, score, lives })), state);
  });
});
