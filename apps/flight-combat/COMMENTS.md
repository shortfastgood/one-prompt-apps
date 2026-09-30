# Notes and Comments on Generating the Flight Combat Game

## Codex

Codex is used to generate a good reference application.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: green;">&#10003;</span> | 1 | GPT-6 Astra (High) | OpenAI | Codex26.917.62051 | OpenAI | macOS Tahoe 26.6.2 

### Notes:
1. **2026-09-28** The prompt, written for a frontier model, produced a bug-free application with very good graphics for a vintage game. The game is playable and isn't too easy or trivial.


## Claude Code

The Claude setup uses an extension of the basic rules of Andrej Karpathy and a front-end skill.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: red;">&#10007;</span> | 1 | Ornith-1.0-35B-4bit | Ornith | Claude Code 2.1.193 | oMLX 0.5.3 | macOS Tahoe 26.5.2 |
| <span style="color: red;">&#10007;</span> | 2 | Qwen3.8-flash-next:4bit | Alibaba | Claude Code 2.1.283 | slotstream 0.2.24 | macOS Tahoe 26.5.2 |

### Notes:

1. **2026-07-24** The prompt, similar to the one used for the frontier model, produced an application that can be used with a mouse, albeit with a few flaws. The corrections were made with two additional prompts. The result therefore falls within the acceptable tolerance. The game, from the player's point of view, remains boring and hard to use even after the corrections, because the model isn't at the same level as the frontier one. **2026-09-28** This implementation was discarded.

2. **2026-09-28** After four attempts, with the same prompt as before, under different settings, this setup wasn't able to complete the task or produce a playable game. Generating from scratch, even following a good example, is out of range for this setup. The generated code was discarded.

## GitHub Copilot

The Copilot setup uses a trivial set of instructions. The version of GitHub Copilot corresponds to the version of VSCode.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: red;">&#10007;</span> | 1 | Qwen3.8-27b-mlx | Alibaba | GitHub Copilot | Ollama 0.34.4 | macOS Tahoe 26.6.2
| <span style="color: green;">&#10003;</span> | 2 | Qwen3.8-27b-mlx | Alibaba | GitHub Copilot | Ollama 0.34.4 | macOS Tahoe 26.6.2

### Notes:

1. **2026-09-29** The prompt, the same as the one in run 2 with Claude Code, wasn't able to generate a playable application. The run confirms that it is really hard for a local model to generate a technically complex application from scratch, even with a very good example. The model lacks skill in geometry and maths, and the result is an extremely long session in which the model tries to fix a great many bugs, using hours of CPU/GPU time. The generated code was discarded.

2. **2026-09-29** A different approach, using a prompt that asks only for enhancements or changes, did complete the task. The model wasn't successful on the first loop; it did quite a lot of bug fixing, but in the end the resulting game matches the quality of the frontier model. 
