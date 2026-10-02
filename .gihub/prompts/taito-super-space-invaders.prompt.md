---
name: super-space-invaders-91
description: Super Space Invaders '91 Remake Game Development Prompt
agent: agent
tools: [execute, read, edit, search, web, agent, todo]
---
# AI Coding Prompt: Super Space Invaders '91 Remake

Create a complete, single-file HTML5/JavaScript game based on Taito's 1990/1991 arcade game "Super Space Invaders '91" (Majestic Twelve). The game should be rendered entirely using an HTML5 <canvas> element, with modern retro styling (smooth animations, neon or high-contrast 16-bit pixel aesthetics, and colorful space backgrounds).

## 1. Core Mechanics & Controls
- **Movement:** The player controls a spaceship ("Laser Base") at the bottom of the screen, moving horizontally only.
- **Controls:** Arrow Keys (or A/D) to move left/right. Spacebar to fire the primary weapon. 
- **The Wave:** Aliens spawn in an 11x5 grid formation, moving horizontally. When they touch either edge of the screen, they descend one row and reverse direction.
- **Dynamic Speed:** As more invaders are destroyed, the remaining aliens move progressively and exponentially faster, accompanied by an accelerating audio beat (tempo matches alien speed).

## 2. Definitive "Super" Upgrades (Arcade Faithful)
- **Shield System:** Unlike the 1978 original, the player's ship begins with a Shield Gauge that can withstand 3 hits. Direct hits from alien projectiles or full-body collisions deplete the shield. A hit taken when shields are down results in the loss of a life.
- **Consequence of Landing:** If an alien reaches the bottom row of the screen, the game does not instantly end; instead, the player immediately loses 1 life/ship, and the wave resets or clears back.
- **The Mothership & Power-up Pods:** A special "Mystery/Mothership" saucer occasionally flies across the top of the screen. When destroyed, it drops a physical power-up pod that falls down for the player to collect.
- **Power-Up Types to Implement:**
  1. *Buster Laser:* Fires a wide, multi-hit vertical laser beam that pierces through a whole column of aliens.
  2. *Fire Flower / Fast Shot:* Drastically increases the firing rate or grants rapid double-shots.
  3. *Shield Restore:* Fully recharges the player’s shield gauge.
  4. *Time Stop (Butterfly):* Temporarily freezes all alien movement on screen for a few seconds.

## 3. Game Progression & Boss Fights
- **Multi-Level Structure:** Include at least 3 progressive stages, each featuring a unique colorful space backdrop image or procedurally generated nebula effect.
- **Boss Encounter:** At the end of Stage 3, introduce a screen-filling "Mega Monster" Boss Alien. The boss has a large visible health bar, shoots unique bullet patterns (e.g., tracking shots or spreading rings), and moves independently rather than in a grid.

## 4. "Cattle Mutilation" Bonus Stage
- Between Stage 1 and Stage 2, trigger the iconic "Cattle Mutilation" bonus mini-game.
- **Objective:** A row of cattle (cows) sits stationary at the bottom of the screen. Flying saucers rapidly swoop down from the top to abduct them via tractor beams.
- **Rules:** The player must shoot the saucers to rescue the cows. If a cow is being lifted, shooting the saucer drops the cow safely back down. The player must avoid accidentally shooting the cows. Points are awarded based on how many cows survive the time limit.

## 5. UI and Audio Visuals
- **HUD:** Display Score, High Score, Remaining Lives (icons), and a Shield Health Bar clearly at the top or bottom of the screen.
- **Visuals:** Add retro particle explosions when an alien is destroyed. Give the lasers and projectiles a bright glow effect.
- **Audio/Beeps:** Use the Web Audio API to procedurally generate classic arcade synthesizer effects: a deep repetitive rhythmic thud for moving aliens, a sharp laser synthesis sound for player shooting, and an explosion crash sound effect.
