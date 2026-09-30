---
name: flight-combat
description: Flight Combat Simulator Game Development Prompt
agent: Plan
tools: [execute, read, edit, search, web, agent, todo]
---
Design and create flight combat simulator game. The game must feature 3d graphics in any style you choose.

A Start Screen that allows the user to select the plane they will use. The user may select from three potential options as follows: A fighter Jet, A Propeller Plane, An option of your choosing.

Each Plane must have realistic limitations on its performance, which should also be displayed graphically on the plane selection screen.

Once the plane is selected and the game started, there will be a dynamic number of opposing planes the user can engage in a dogfight with. There MUST be visible ammunition traces, as well as functional damage implementation for both enemy and player planes.

If the player defeats all enemy planes in a round, the level repeats with increased difficulty. If the player loses, the plane they are in becomes uncontrollable and falls to the ground, returning them to the home screen following a 2 second black screen.

There is already a very good implementation of the game available for reference in the folder apps/flight-combat/by-codex-gpt-6. Your task is to provide a new implementation having unique design choices and improvements while maintaining the core gameplay mechanics. Do not re-invent or change usable code from the reference implementation.

A very important aspect is the graphics quality and visual fidelity, which should be carefully considered and implemented to enhance the overall gaming experience.

Provide a detailed plan for the new implementation, including the overall architecture, key modules, and any unique features or improvements you intend to introduce. Proceed with small, incremental steps, ensuring each part is well-designed and tested before moving on to the next.

Do not proceed with implementation until a detailed plan has been created and approved.

Place the code in the folder /Users/dden/gitroot/one-prompt-apps/apps/flight-combat/by-\<model name>/
