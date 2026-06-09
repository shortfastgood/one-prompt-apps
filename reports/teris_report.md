# Notes and Comment Generating the Tetris Game

The harware is allways a MacBook Pro M4 Max with 64GB unified memory.

|  | Seq | Model | Publisher | Agent | Engine | Operating System | Observations |
|--|-----|-------|-----------|-------|--------|------------------|--------------|
| <span style="color: green;">&#10003;</span> | 1 | qwen3-coder:30b | Alibaba | GitHub Copilot | Ollama 0.30.1 | macOS Tahoe 26.5.1 | Fast enough, excellent graphic, the code requires some adjustments. Tetris works.
| <span style="color: red;">&#10007;</span> | 2 | quen3.5:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1 | Fast but unreliable, Tetris remains unusable even after many prompts.
| <span style="color: red;">&#10007;</span> | 3 | quen3.6:35b-a3b-coding-nvfp4 | Alibaba | GitHub Copilot | Ollama 0.30.5 | macOS Tahoe 26.5.1 | Fast but unreliable, Tetris remains unusable even after many prompts.
| <span style="color: green;">&#10003;</span> | 4 | gemma4:31b-nvfp4| Google DeepMind | GitHub Copilot | Ollama 0.30.7 | macOS Tahoe 26.5.1 | Is a fast thinking model, the response isn't immediate but the overall performance is enough eve for interactive work. The result is excellent: the Tetris application was implemented with all its features from a single prompt. The graphics are simple, but the overall design is very good.
