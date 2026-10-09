// Only dependency resolution and browser startup are optional. Test failures are not.
async function browserSupport(load = () => require('playwright')) {
  let playwright;
  try {
    playwright = load();
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return { reason: 'Playwright is unavailable; install with npm install --save-dev playwright.' };
  }
  const failures = [];
  for (const channel of [undefined, 'chrome']) {
    try {
      const browser = await playwright.chromium.launch({ headless: true, channel, timeout: 5000 });
      return { browser };
    } catch (error) {
      failures.push(`${channel || 'bundled Chromium'}: ${error.message.split('\n')[0]}`);
    }
  }
  return { reason: `No usable browser. Run npx playwright install chromium or install Google Chrome. ${failures.join('; ')}` };
}
module.exports = { browserSupport };
