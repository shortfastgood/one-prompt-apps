# Flight Combat Simulator

A 3D aerial combat game built as a single-prompt app using Three.js.

![screenshot](screenshot.png)

## Play

Open `index.html` directly in a browser — no build step required. The game loads [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) from a CDN, so an internet connection is needed for the first load.

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` | Pitch (nose up / down) |
| `A` / `D` | Roll (bank left / right) |
| `Q` / `E` | Yaw (turn left / right) |
| `Shift` / `Ctrl` | Throttle up / down |
| Mouse | Aim direction |
| Left Click | Fire weapons |

## Features

- **Three selectable aircraft** — F-22 Raptor (fast fighter jet), P-51 Mustang (armored propeller plane), AH-64 Apache (attack helicopter)
- **Each plane has unique stats** — speed, turn rate, acceleration, health, and fire rate, creating distinct playstyles
- **Wave-based enemy encounters** — defeat increasing numbers of hostile aircraft across escalating levels
- **Smart enemy AI** — enemies patrol, pursue, and attack the player with state-machine-driven behavior; accuracy improves per level
- **3D rendered plane models** — detailed low-poly aircraft with animated propellers and rotors, visible from all angles
- **First-person cockpit perspective** — crosshair aiming with pointer-lock mouse control
- **Full HUD** — health bar, score, level indicator, speed readout, ammo counter, and a mini-radar showing enemy positions
- **Proximity warning system** — on-screen alert when hostile aircraft draw near
- **Explosion & particle effects** — fireballs, smoke trails, flying debris on destruction
- **Screen shake and damage feedback** — visual flash and camera shake on hits

## File structure

```text
flight-combat/
  by-ornith-1.0/
    index.html       – complete game (markup, styles, logic, models)
    screenshot.png   – preview image
```
