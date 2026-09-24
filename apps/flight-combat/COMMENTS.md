# Notes and Comments on Generating the Flight Combat Game

## Claude Code

The Claude setup uses an extension of the basic rules of Andrej Karpathy and a front-end skill.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
|<span style="color: green;">&#10003;</span> | 1 | Ornith-1.0-35B-4bit | Ornith | Claude Code 2.1.193 | oMLX 0.5.3 | macOS Tahoe 26.5.2

### Notes:

1. **2026-07-24** The prompt produced an application that can be used with a mouse, albeit with a few flaws. The corrections were made with two additional prompts. The result therefore falls within the acceptable tolerance. The game, from the player's point of view, remains boring and hard to use even after the corrections, because the prompt lacks some information about the required dynamics of this kind of game.
