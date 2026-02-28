# Tower Defense Game Implementation Plan

We will build a complete, balanced Tower Defense game using Vanilla HTML, CSS, and JavaScript (Canvas API) to ensure it is lightweight, performant, and modular.

## User Review Required
No immediate blockers. This plan relies on vanilla web technologies for simplicity and modularity. I will proceed automatically.

## Proposed Changes

### Project Setup
- Create `/Users/dden/gitroot/one-prompt-apps-g/tower-defense/` directory.
#### [NEW] [index.html](file:///Users/dden/gitroot/one-prompt-apps-g/tower-defense/index.html)
#### [NEW] [style.css](file:///Users/dden/gitroot/one-prompt-apps-g/tower-defense/style.css)
#### [NEW] [game.js](file:///Users/dden/gitroot/one-prompt-apps-g/tower-defense/game.js)
#### [NEW] [entities.js](file:///Users/dden/gitroot/one-prompt-apps-g/tower-defense/entities.js)
#### [NEW] [ui.js](file:///Users/dden/gitroot/one-prompt-apps-g/tower-defense/ui.js)

### Core Game Engine & Architecture (`game.js`)
- **Game State**: Manages money, lives, wave number, and game status (playing, paused, game over).
- **Game Loop**: Standard `requestAnimationFrame` loop for updating logic and rendering via Canvas 2D API.
- **Map & Pathfinding**: Define a fixed, winding path using an array of grid coordinates. Rendering of the grid and map path overlay.

### Entity System (`entities.js`)
- **Enemy Class**: Handles movement along path, health, taking damage, and reaching the end. Spawning is managed by a Wave Manager system based on intervals and stats scaling.
- **Base Tower**: Abstract logic for targeting (e.g., first enemy in range), cooldowns, rotation, and shooting projectiles.
- **Tower Types**:
  1. **Basic Tower**: Balanced range, damage, and speed.
  2. **Sniper Tower**: High range, high damage, very slow speed.
  3. **Rapid Fire Tower**: Short range, very high speed, low damage.
- **Projectiles**: Render and move toward target linearly. On collision, applies damage.

### UI & Polish (`ui.js` & `style.css`)
- **HUD**: Display current Wave, Lives, Money.
- **Build Menu**: Select towers to place. Highlights the selected tower type.
- **Context Menu**: Click a placed tower to upgrade (increases stats, costs money) or sell it (refunds portion of total cost).
- **Controls**: Pause/Resume, Start Next Wave, Restart Game.

## Verification Plan

### Manual Verification
1. I will launch a local HTTP server and test the game in the browser via `python3 -m http.server 8081` in the `tower-defense` directory.
2. Verify all towers can be placed, and that money is correctly deducted.
3. Verify enemies follow the path, take damage, and reduce lives upon reaching the end.
4. Verify upgrades apply stat changes and selling works as intended.
5. Verify waves scale gracefully.
