import { PIECE_TYPES } from "./tetrominoes.js";

function shuffledBag() {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export class BagRandomizer {
  constructor() {
    this.queue = [];
  }

  ensure(minLength) {
    while (this.queue.length < minLength) {
      this.queue.push(...shuffledBag());
    }
  }

  next() {
    this.ensure(1);
    return this.queue.shift();
  }

  peek(count) {
    this.ensure(count);
    return this.queue.slice(0, count);
  }
}
