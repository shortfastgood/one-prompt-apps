# Notes and Comment Generating the Tetris Game

The **hardware** is allways a MacBook Pro M4 Max with 64GB unified memory.

Ho deciso di usare GitHub Copilot e Claude (command line version) per valutare anche l'influsso degli agenti sul risultato.

## Claude Code

Claude setup uses an extension of the basic rules of Andrey Karpathy and a frontend skill.

|  | Seq | Model | Publisher | Agent | Engine | Operating System | Observations |
|--|-----|-------|-----------|-------|--------|------------------|--------------|
| <span style="color: red;">&#10007;</span> | 1 | quen3.6:35b-a3b-coding-nvfp4 | Alibaba | Claude Code 2.1.153| Ollama 0.30.7 | macOS Tahoe 26.5.1 | Did run more that one hour and was still correcting and testing, it takes too many times and even if the result would be good unsuitable for any usage. **Tetris unusable.**

## GitHub Copilot

Copilot setup uses a trivial set of instructions. The version of GitHub Copilot corresponds to the version of VSCode.

|  | Seq | Model | Publisher | Agent | Engine | Operating System | Observations |
|--|-----|-------|-----------|-------|--------|------------------|--------------|
| <span style="color: green;">&#10003;</span> | 1 | qwen3-coder:30b | Alibaba | GitHub Copilot | Ollama 0.30.1 | macOS Tahoe 26.5.1 | Fast enough, excellent graphic, the code requires some adjustments. **Tetris works.**
| <span style="color: red;">&#10007;</span> | 2 | quen3.5:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1 | Fast but unreliable, **Tetris remains unusable** even after many prompts.
| <span style="color: red;">&#10007;</span> | 3 | quen3.6:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1 | Fast but unreliable, **Tetris remains unusable** even after many prompts.
| <span style="color: green;">&#10003;</span> | 4 | gemma4:31b-nvfp4| Google DeepMind | GitHub Copilot | Ollama 0.30.7 | macOS Tahoe 26.5.1 | The result is excellent: the Tetris application was implemented with all its features from a single prompt. Simple graphics and good verall design.
