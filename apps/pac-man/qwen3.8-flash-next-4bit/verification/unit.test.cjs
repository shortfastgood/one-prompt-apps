'use strict';

// Q-unit — pure helpers: inHouse, inRing, blocked. (Q-unit 01-03)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./harness.cjs');

test('Q-unit 01 inHouse — edges and boundaries', () => {
  const g = game(1);
  // Interior of the house footprint.
  assert.equal(g.inHouse(11, 8), true);
  assert.equal(g.inHouse(18, 11), true);
  assert.equal(g.inHouse(14, 9), true);
  // Inclusive corners.
  assert.equal(g.inHouse(11, 8), true);
  assert.equal(g.inHouse(18, 11), true);
  // Just outside each edge.
  assert.equal(g.inHouse(10, 9), false);
  assert.equal(g.inHouse(19, 9), false);
  assert.equal(g.inHouse(14, 7), false);
  assert.equal(g.inHouse(14, 12), false);
  // Non-corner edges.
  assert.equal(g.inHouse(11, 10), true);
  assert.equal(g.inHouse(18, 8), true);
});

test('Q-unit 02 inRing — ring box minus house footprint', () => {
  const g = game(1);
  // Corners of the ring box are outside the house.
  assert.equal(g.inRing(10, 7), true);
  assert.equal(g.inRing(19, 7), true);
  assert.equal(g.inRing(10, 12), true);
  assert.equal(g.inRing(19, 12), true);
  // House footprint cells are NOT in the ring.
  assert.equal(g.inRing(14, 9), false);
  assert.equal(g.inRing(11, 8), false);
  assert.equal(g.inRing(18, 11), false);
  // Door cells sit on the house (not ring).
  assert.equal(g.inRing(14, 8), false);
  // Just outside the ring box.
  assert.equal(g.inRing(9, 10), false);
  assert.equal(g.inRing(20, 10), false);
  assert.equal(g.inRing(14, 6), false);
  assert.equal(g.inRing(14, 13), false);
  // Inclusive interior ring cell (edge of house, not in house).
  assert.equal(g.inRing(10, 10), true);
  assert.equal(g.inRing(19, 8), true);
});

test('Q-unit 03 blocked — values 0..4 true only for 1 and 4', () => {
  const g = game(1);
  assert.equal(g.blocked(0), false);
  assert.equal(g.blocked(2), false);
  assert.equal(g.blocked(3), false);
  assert.equal(g.blocked(1), true);
  assert.equal(g.blocked(4), true);
});
