const { test } = require('node:test');
const assert = require('node:assert/strict');
const { browserSupport } = require('./browser-support.cjs');

test('optional browser support reports a missing package', async () => {
  const result = await browserSupport(() => { throw Object.assign(new Error('missing'), { code: 'MODULE_NOT_FOUND' }); });
  assert.match(result.reason, /Playwright is unavailable/);
  assert.equal(result.browser, undefined);
});
test('optional browser support reports unusable browsers and tries Chrome', async () => {
  const channels = [];
  const result = await browserSupport(() => ({ chromium: { launch: async options => { channels.push(options.channel); throw new Error('executable missing'); } } }));
  assert.deepEqual(channels, [undefined, 'chrome']);
  assert.match(result.reason, /No usable browser/);
});
test('optional browser support returns a launched browser, including Chrome fallback', async () => {
  for (const fallback of [false, true]) {
    const browser = {}, channels = [];
    const result = await browserSupport(() => ({ chromium: { launch: async options => {
      channels.push(options.channel);
      if (fallback && !options.channel) throw new Error('missing Chromium');
      return browser;
    } } }));
    assert.equal(result.browser, browser);
    assert.deepEqual(channels, fallback ? [undefined, 'chrome'] : [undefined]);
  }
});
test('optional browser support does not hide unexpected module errors', async () => {
  await assert.rejects(browserSupport(() => { throw new SyntaxError('broken module'); }), /broken module/);
});
