# Night Patrol — implementation plan

Adopt the proven core of `apps/flight-combat/by-codex-gpt-6/` (flight model + math) and layer NEW visuals/audio/tests on top. No from-scratch rewrite. No network/CDN. No new deps.

## Roster (PLANES array order must stay [fighter, prop, new])
- `PLANES[0]` **Falcon** — multirole fighter jet (carry over "Peregrine" fighter: fast, light).
- `PLANES[1]` **Kite** — propeller / maneuvering (carry over "Kite" P-51: slow, best turn).
- `PLANES[2]` **Scythe** — *rocket-powered interceptor* (new). Highest climb; high top speed but a short `burnout` timer caps sustained top speed; lowest turn rate; modest hp.

New sim invariant tests: `PLANES[2].maxSpeed > PLANES[0].maxSpeed`, `PLANES[1].turn > PLANES[2].turn` (rewrite old invariants).

## Namespace renames (carry-over, mechanical)
- `Airframe3D` → `NyxPatrol` (engine.js export + game.js destructure + engine.test.cjs sandbox key)
- `FlightSim` → `NyxSim` (simulation.js export + game.js destructure)
- `window.airframeStatus` → `window.nyxStatus` (game.js)
- Title → "Night Patrol"; brand/eyebrow copy → "NIGHT PATROL / OVERNIGHT SQUADRON".

## Phases (verify after each)
1. New 3rd plane (Scythe) + `burnout` field in sim + flight-model support + updated invariant tests.
2. Shader: add `uSun`/`uSunColor`/`uAmbient` + Blinn-Phong specular; night sun (low warm/dim) + cool ambient.
3. Sky: skydome (inside-out gradient ellipsoid) + far-quad stars + `Renderer.renderSky()`; night color grade.
4. Tracers: additive `drawGlow(mesh,matrix,color)` (blendFunc ONE,ONE + high emissive, thin ribbon). Friendly gold, enemy red-orange.
5. Damage: deterministic `wounded` event when any plane <45% hp; two-tier smoke→fire particles distinct from explosion bursts.
6. Audio: twilight engine hum (filtered sawtooth, pitch tracks speed) + fire/explosion SFX.
7. Polish + `night-patrol.realtime.cjs` (playwright-cli, headless swiftshader) + README.md "Night Patrol".

## Verification
- `node --check` all .js clean.
- `node --test simulation.test.cjs engine.test.cjs` green (explicit per-branch asserts for ~80%/module coverage).
- `node night-patrol.realtime.cjs` (playwright-cli): WebGL ctx ok, 3 `.aircraft-card` + meters, click+Launch → `nyxStatus.state==='flying'` & `enemies>0`, fire → `bullets` increases, no uncaught errors, zero network requests.
- Asset check: all `src`/`href` local `./`, no network APIs.

## Constraints
- Keep DOM ids + event names + sim interface identical so game.js glue works unchanged.
- Only add; carry over usable math/flight logic verbatim; retheme visuals/colors/audio.
