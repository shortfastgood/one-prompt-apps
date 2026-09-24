# Notes and Comments on Generating the Tetris Game

## Claude Code

The Claude setup uses an extension of the basic rules of Andrej Karpathy and a front-end skill.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: red;">&#10007;</span> | 1 | quen3.6:35b-a3b-coding-nvfp4 | Alibaba | Claude Code 2.1.153| Ollama 0.30.7 | macOS Tahoe 26.5.1 
| <span style="color: green;">&#10003;</span> | 2 | Ornith-1.0-35B-4bit | Ornith | Claude Code 2.1.193 | oMLX 0.4.4 | macOS Tahoe 26.5.2 
| <span style="color: green;">&#10003;</span> | 3 | Qwen3.8-flash-next:4bit | Alibaba | Claude Code 2.1.281 | slotstream 0.2.24 | macOS Tahoe 26.6.2 |

### Notes:

1. It ran for more than an hour and was still correcting and testing; it took too much time and, even if the result had been good, would have been unsuitable for any use. **Tetris unusable.**

2. The vibe coding didn't complete the generation without errors, even after a planning pre-step. But the model was able to fix all the errors and create one of the best implementations after a single correction step. Since the tolerance of 2 additional prompts wasn't exceeded, the test is positive. **Tetris usable**

3. The vibe did complete the generation without any errors. It was a long run, about one hour. The main reason is that the model size, despite 4-bit quantization, is much bigger (104GB) than the available memory. Slotstream uses the SSD of the Mac as an extension of the RAM, so the bottleneck is the disk reading speed. The result is a compact and clean game implementation.

## GitHub Copilot

The Copilot setup uses a trivial set of instructions. The version of GitHub Copilot corresponds to the version of VSCode.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: green;">&#10003;</span> | 1 | qwen3-coder:30b | Alibaba | GitHub Copilot | Ollama 0.30.1 | macOS Tahoe 26.5.1 
| <span style="color: red;">&#10007;</span> | 2 | quen3.5:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1
| <span style="color: red;">&#10007;</span> | 3 | quen3.6:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1 
| <span style="color: green;">&#10003;</span> | 4 | gemma4:31b-nvfp4| Google DeepMind | GitHub Copilot | Ollama 0.30.7 | macOS Tahoe 26.5.1 

### Notes:

1. Fast enough, excellent graphics, the code requires some adjustments. **Tetris works.**
2. Fast but unreliable, **Tetris remains unusable** even after many prompts.
3. Fast but unreliable, **Tetris remains unusable** even after many prompts.
4. The result is **excellent**: the Tetris application was implemented with all its features from a single prompt. Simple graphics and good overall design.