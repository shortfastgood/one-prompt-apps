'use strict';

// Runner for the qwen3.8-flash-next-4bit Pac-Man verification suite.
//
// Generates game.generated.js from ../index.html (via harness.cjs) and runs every
// Q-*.cjs file in a single `node --test` process with 100% line / branch / function
// coverage enforced on game.generated.js. Node 24+ required.

const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Generate (or refresh) the extracted, never-edited coverage target first.
require('./harness.cjs');

const dir = __dirname;
const generated = path.join(dir, 'game.generated.js');
const files = [
  'unit.test.cjs',
  'reset.test.cjs',
  'maze.test.cjs',
  'step.test.cjs',
  'movement.test.cjs',
  'ghost.test.cjs',
  'collision.test.cjs',
  'render.test.cjs',
  'frame.test.cjs',
  'events.test.cjs',
  'real-browser.test.cjs',
].map((f) => path.join(dir, f));
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    '--test-timeout=30000',
    '--experimental-test-coverage',
    `--test-coverage-include=${generated}`,
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    ...files,
  ],
  { cwd: dir, stdio: 'inherit' }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
