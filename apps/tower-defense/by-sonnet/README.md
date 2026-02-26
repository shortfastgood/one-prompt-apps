# Tower Defense (by Sonnet)

## Architect Requirement

The architect gave Claude Sonnet a single prompt to produce a complete, playable tower defense game as **one self-contained HTML file** — no build step, no external dependencies, no separate asset files. The full requirement was:

> Build a complete tower defense browser game in a single `index.html` file (HTML + CSS + JS, no external libraries). Requirements:
>
> - A fixed path that enemies follow across a grid
> - Wave-based enemy spawning with at least 4 enemy types (normal, fast, tank, boss)
> - At least 4 tower types with distinct roles (range, damage, fire rate, special effects)
> - Three upgrade levels per tower
> - Economy: earn money from kills, spend it on towers and upgrades, sell towers for a partial refund
> - Wave bonus money paid between waves
> - Stats bar showing wave, lives, money, and score
> - Pause, 2× speed toggle, and restart controls
> - Tower detail side panel (level, damage, range, rate, special stat, kill count)
> - Particle death effects
> - Clean dark-themed UI with a green grass grid, sandy path, and hover/range previews
> - Infinite wave scaling beyond the pre-defined set
> - Polished, balanced, playable MVP quality

## Implementation

The entire game is implemented in a single `index.html` file using vanilla HTML, CSS, and JavaScript — no frameworks or dependencies required.

### Architecture

The code is organised into clearly separated classes within one `<script>` block:

| Class | Responsibility |
|---|---|
| `PathManager` | Defines the fixed enemy route as tile waypoints, computes occupied path tiles, and renders the sandy path |
| `Enemy` | Tracks position, HP, speed, slow/freeze status, and movement along waypoints; renders health bar and body |
| `Projectile` | Travels toward a target enemy; resolves splash, pierce/railgun, or single-target hits on arrival |
| `Tower` | Manages level, cooldown, targeting (furthest-progress enemy in range), firing, and kill tracking |
| `Particle` | Short-lived burst particle spawned on enemy death |
| `WaveManager` | Builds and schedules per-wave spawn queues; handles infinite scaling beyond wave 10 |
| `Renderer` | Draws the background grid, path, hover/range previews, towers, enemies, and particles each frame |
| `UIManager` | Wires all DOM elements (stats bar, palette, side panel, overlays) to game state |
| `Game` | Central controller — owns state, runs the `requestAnimationFrame` loop, and dispatches all interactions |

### Grid and path

The canvas is **800 × 520 px** divided into a **20 × 13** tile grid (40 px per tile). Enemies enter from the left edge and exit to the right along a fixed 8-waypoint route that snakes across the grid.

### Tower types

| Tower | Cost | Role | Special |
|---|---|---|---|
| 🏹 Arrow | $80 | Balanced, fast-firing | Level 3 gains Multishot (fires at two targets) |
| 💣 Cannon | $150 | AoE burst, slow fire rate | Splash damage in a radius around the impact |
| 🎯 Sniper | $175 | Extreme range, high single-target damage | Level 2 gains Pierce (hits all enemies on the firing line); Level 3 becomes Railgun |
| ❄️ Frost | $100 | Area slow/freeze support | Splash + slows enemies 50 %; Level 3 adds a full freeze burst |

Each tower has **3 upgrade levels** with increasing damage, range, and fire rate. Sell value is always **80 % of total invested** (purchase + upgrades).

### Enemy types

| Enemy | HP | Speed | Reward | Notes |
|---|---|---|---|---|
| Basic (grey) | 80 | 80 px/s | $12 | Bread-and-butter filler |
| Fast (yellow) | 50 | 155 px/s | $18 | Low HP but hard to hit |
| Tank (red) | 420 | 45 px/s | $35 | Absorbs heavy fire |
| Boss (purple) | 1 600 | 35 px/s | $100 | Crown icon; hp scales with wave |

### Wave system

Waves 1–10 follow hand-crafted compositions that progressively introduce faster and tankier enemies. Bosses appear from wave 8. Beyond wave 10 the game scales indefinitely: enemy count and HP increase each wave, and a Boss group spawns every third wave. A **wave bonus** of `$25 + wave × $10` is awarded between every wave.

### Game loop

The loop runs via `requestAnimationFrame`. At **2× speed** the update step is applied twice per frame (dt is halved to keep physics correct). The game clamps `dt` to 50 ms to avoid large jumps after tab switches. Towers target the **furthest-along-path** enemy in range — prioritising enemies closest to the exit.

## How to Use

### Running the game

Open `index.html` directly in any modern browser. No server, no installation required.

### Controls

| Action | How |
|---|---|
| Select a tower to place | Click a tower button in the bottom palette |
| Place the tower | Click any green (valid) tile on the grid |
| Cancel placement | Press `Esc` or right-click the canvas |
| Inspect a placed tower | Click it on the canvas |
| Upgrade selected tower | Click **⬆ Upgrade** in the side panel (cost shown) |
| Sell selected tower | Click **💰 Sell** in the side panel (refund shown) |
| Start next wave | Click **▶ Start Wave N** on the between-waves overlay |
| Pause / Resume | Click **⏸ Pause** in the top bar or press `Space` |
| Toggle speed | Click **⚡ 1×** to switch to 2×, click again to return to 1× |
| Restart | Click **🔄 Restart** at any time |

### Game rules

1. **Defend the path.** Towers attack enemies automatically when they enter range.
2. **Targeting.** Each tower fires at the enemy furthest along the path within its range.
3. **Earn money.** Killing an enemy grants its reward. A bonus is paid at the end of each wave.
4. **Lose lives.** Every enemy that reaches the exit costs **1 life**. You start with **20 lives**.
5. **Game over.** Lives reach 0 → game over. Survive all waves → Victory.
6. **Waves don't overlap.** The next wave only starts when you click the Start button on the between-waves overlay.
7. **Economy.** Towers cost money to place and upgrade. Selling returns 80 % of what you spent on that tower.
8. **Infinite mode.** After wave 10 the game keeps scaling — there is no hard cap on waves.

### Strategy tips

- **Arrow towers** are gold-efficient early; place several before branching out.
- **Frost towers** near a long straight stretch maximise their slow uptime — pair them with Cannon or Sniper for amplified damage.
- **Cannon towers** excel at chokepoints where many enemies bunch together.
- **Sniper towers** (especially Pierce/Railgun at level 2–3) pay off against the long straight segments in the mid-path.
- Upgrade coverage towers before buying new ones — a level-3 Arrow beats two level-1 Arrows for the same money.
- Save some money going into late waves so you can react to Boss compositions.
