const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
mkdirSync(path.join(__dirname, 'coverage'), { recursive: true });
const result = spawnSync(process.execPath, [
  '--test', '--test-concurrency=1', '--test-timeout=30000',
  '--experimental-test-coverage',
  '--test-coverage-include=**/verification/game.generated.js',
  '--test-coverage-lines=100', '--test-coverage-branches=100', '--test-coverage-functions=100',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  'logic.test.cjs', 'browser-boundaries.test.cjs', 'browser-support.test.cjs', 'real-browser.test.cjs',
], { cwd: __dirname, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
