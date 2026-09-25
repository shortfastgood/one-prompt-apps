# Flight Combat — by qwen3.8-flash-next

A playable 3D dogfight game. Three.js (r128, loaded from cdnjs) renders
low-poly aircraft over a textured terrain with sky, clouds and mountains.

## Play

Open `index.html` in Chrome (internet access needed once, for the Three.js
CDN script). Click a plane card to start.

## Planes

| Plane | Top speed | Notes |
|-------|-----------|-------|
| F-22 Raptor | 260 m/s | Fastest, least maneuverable |
| P-51 Mustang | 150 m/s | Slow but turns on a dime |
| V-42 Stormbird | 210 m/s | Balanced experimental craft |

## Controls

| Key | Action |
|-----|--------|
| W / S | Climb / dive (elevator) |
| A / D | Roll left / right (banked turn) |
| Shift | Boost |
| Ctrl | Slow |
| Space | Fire cannons |

**Important:** rolling only banks the plane — the bank angle is what
makes you turn (coordinated-turn model). Bank, then the nose follows.

## Rules

- Each level spawns `level + 1` enemy planes with more HP each level.
- Clear all enemies → next level starts automatically (hull repairs
  30% between levels).
- Lose all hull → your plane tumbles out of the sky, crashes, and a
  2-second black screen returns you to the plane selection.

## Files

- `index.html` — DOM skeleton (menu, HUD, script tags)
- `styles.css` — HUD and menu styling
- `src/planes.js` — plane definitions + geometry builders
- `src/render.js` — world building (sky, terrain, clouds) and effects
- `src/game.js` — game logic: flight model, AI, guns, damage, levels
- `src/main.js` — bootstrap: renderer, input, menu, main loop
