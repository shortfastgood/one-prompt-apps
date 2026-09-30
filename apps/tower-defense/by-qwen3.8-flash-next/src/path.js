// The fixed enemy path: waypoint geometry plus helpers.

import { TILE, PATH_WAYPOINTS } from './config.js';

export function buildPath() {
  const pts = PATH_WAYPOINTS.map(([col, row]) => ({
    x: (col + 0.5) * TILE,
    y: (row + 0.5) * TILE,
  }));

  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: total });
    total += len;
  }

  return {
    segs,
    total,

    // Position along the path at `dist` pixels travelled from the start.
    positionAt(dist) {
      if (dist >= total) return { ...segs[segs.length - 1].b, done: true };
      let s = 0;
      while (s < segs.length - 1 && dist >= segs[s].start + segs[s].len) s++;
      const seg = segs[s];
      const t = (dist - seg.start) / seg.len;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
        done: false,
      };
    },

    // Grid cells ("col,row") covered by the path — not buildable.
    cells() {
      const cells = new Set();
      for (const { a, b } of segs) {
        const c1 = Math.floor(a.x / TILE), r1 = Math.floor(a.y / TILE);
        const c2 = Math.floor(b.x / TILE), r2 = Math.floor(b.y / TILE);
        if (r1 === r2) {
          for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) cells.add(`${c},${r1}`);
        } else {
          for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) cells.add(`${c1},${r}`);
        }
      }
      return cells;
    },
  };
}
