# Flight Combat

The Flight Combat example is an MVP implementation of a 3D aerial dogfighting game, built to demonstrate aircraft selection, distinct flight characteristics, combat mechanics, and progressively challenging enemy encounters in a compact format. It is intended as a practical example of how a single prompt can produce a playable flight combat game with only limited post-generation refinements.

## Table of Contents

- [Approach](#approach)
- [Prompt](#prompt)
  - [GPT 6 Astra](#gpt-6-astra)
  - [Local Model](#local-model)
- [Preview](#preview)
- [Documentation](#documentation)

## Approach

I adopted a different approach for this example, as I realised that the task was complex and required more detailed context and greater capabilities from the selected model. I generated a reference application from a single prompt using GPT 6 Astra through Codex. The resulting implementation has several strengths:

- Excellent graphics for a retro-style PC game
- Well-structured, compact code
- A bug-free generated implementation
- Module tests beyond the prompt's requirements
- Mouse support beyond the prompt's requirements

The game is challenging to play, and I would welcome joystick support, but it provides a solid foundation for developing a polished retro-style game.

This game serves as the reference implementation. Ideally, I would write the reference application myself, but achieving a comparable result would take days rather than minutes. I require the local model to use this implementation as a reference and produce a plan to reimplement it from scratch with variations in colours, scenery and other visual elements. I expect a bug-free implementation and a test suite providing 80% code coverage for each JavaScript module.

## Prompt

### GPT 6 Astra

*Design and create flight combat simulator game. The game must feature 3d graphics in any style you choose.*

*A Start Screen that allows the user to select the plane they will use. The user may select from three potential options as follows: A fighter Jet, A Propeller Plane, An option of your choosing.*

*Each Plane must have realistic limitations on its performance, which should also be displayed graphically on the plane selection screen.*

*Once the plane is selected and the game started, there will be a dynamic number of opposing planes the user can engage in a dogfight with. There MUST be visible ammunition traces, as well as functional damage implementation for both enemy and player planes.*

*If the player defeats all enemy planes in a round, the level repeats with increased difficulty. If the player loses, the plane they are in becomes uncontrollable and falls to the ground, returning them to the home screen following a 2 second black screen.*

*You may use any library for this implementation, but all of them must be copied locally. The code should not rely on any external CDN or online resources. You may split the code in modules for better organization. Do not rely on existing local implementations all code you generate must be generated from scratch.*

*Place the code in the folder ./apps/flight-combat/by-codex-gpt-6/*

### Local Model

*Design and create flight combat simulator game. The game must feature 3d graphics in any style you choose.*

*A Start Screen that allows the user to select the plane they will use. The user may select from three potential options as follows: A fighter Jet, A Propeller Plane, An option of your choosing.*

*Each Plane must have realistic limitations on its performance, which should also be displayed graphically on the plane selection screen.*

*Once the plane is selected and the game started, there will be a dynamic number of opposing planes the user can engage in a dogfight with. There MUST be visible ammunition traces, as well as functional damage implementation for both enemy and player planes.*

*If the player defeats all enemy planes in a round, the level repeats with increased difficulty. If the player loses, the plane they are in becomes uncontrollable and falls to the ground, returning them to the home screen following a 2 second black screen.*

*The game in apps/flight-combat/by-codex-gpt-6 is the reference implementation. I expect you to study it carefully to understand the structure and functionality, but all new code must be written from scratch. I expect a reimplementation plan to be created before any coding begins. I expect a detailed outline of the new implementation, including module structure, key algorithms, and any deviations from the reference implementation, before any coding starts.*

*You should apply some variation and creativity in the design and implementation of the game, while still adhering to the core mechanics and structure outlined in the reference implementation.*

*I expect all new code to be thoroughly tested and documented. Each module should include clear comments explaining its purpose and functionality. Additionally, any deviations from the reference implementation should be justified and documented.*

*Place the code in the folder ./apps/flight-combat/by-\<model name>/*

### Preview

<img src="./by-codex-gpt-6/screenshot.png" width=960>

### Documentation

- [GPT 6 Astra version documentation](./by-codex-gpt-6/README.md)

### Credits

The prompt was inspired by [Bijan Bowen](https://www.youtube.com/@bijanbowen) who’s been running similar tests on YouTube.

### History

| Date | Author | Description |
|------|--------|-------------|
| 2026-09-27 | Daniele Denti | New approach with reference implementation |

