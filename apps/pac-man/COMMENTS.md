# Notes and Comments on Generating the Pac-Man Game

## Codex

Codex is used to generate a high-quality reference application.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: green;">&#10003;</span> | 1 | GPT-6 Astra (High) | OpenAI | Codex26.917.62051 | OpenAI | macOS Tahoe 26.6.2 

### Notes:
1. **2026-10-04** Rather than starting with a prompt, I used an existing Python implementation. The frontier model analysed the game and generated a prompt to guide its reimplementation. The original code was too basic, making the game difficult to play and a poor approximation of the world-famous arcade classic. I refined both the implementation and the prompt through an iterative process with Codex. The result is much closer to the original arcade game.


## Claude Code

The Claude setup uses an extended version of Andrej Karpathy's basic rules, along with a front-end skill.

|  | Seq | Model | Publisher | Agent | Engine | Operating System 
|--|-----|-------|-----------|-------|--------|------------------
| <span style="color: red;">&#10007;</span> | 1 | Ternary-Bonsai-27b-mlx-2bit | Prism | Claude Code 2.1.205 | oMLX 0.7.0 | macOS Tahoe 26.6.2 |
| <span style="color: green;">&#10003;</span> | 2 | Qwen3.8-27B-MLX-4bit | lmstudio-community | Claude Code 2.1.205 | oMLX 0.7.0 | macOS Tahoe 26.6.2 |
| <span style="color: green;">&#10003;</span> | 3 | Qwen3.8-27B-MLX-4bit | inco.ai | Claude Code 2.1.205 | Splash 1.3.0 | macOS Tahoe 26.6.2 |
| <span style="color: green;">&#10003;</span> | 4 | Qwen3.8-flash-next-4bit | pipenetwork | Claude Code 2.1.205 | Slotstream 0.2.27 | macOS Tahoe 26.6.2 |

### Notes:

1. **2026-10-06** The first attempt failed due to insufficient memory just after the code had been generated for testing. I was surprised by how much memory oMLX used when running a small model (about 8 GB), but the fatal error was caused by an incorrect oMLX configuration. The second attempt also used a great deal of memory and was stopped after four hours because this setup was too slow. Prompt processing (prefill) at fewer than 100 tokens per second and generation at fewer than 20 tokens per second are too slow for development work.

2. **2026-10-07** The attempt was successful, although a minor functional bug remained. The engine was too slow on two occasions, but Claude Code was able to retry and complete the work. Performance (just over 100 tokens per second for prefill and just over 20 tokens per second for output) is adequate for simple development tasks, although Pac-Man pushes this setup to its limits. Using Claude Code's auto mode is inadvisable because of the classifier, overly short timeouts and the lack of a pause to restart the engine. Test suite generation could not be completed because the context window limit was exceeded.

3. **2026-10-09** This run successfully completed the work left unfinished by the previous attempt. The Splash engine appears to handle the demanding bug-fixing phase more effectively. Resuming and completing the work took one hour and twenty minutes. Overall performance is better than with oMLX.

4. **2026-10-07** Slotstream use the disk as extension of the memory, this allows the usage of models that are bigger than the available memory, but has a limitig factor in the disk reading speed. Despite this limitation the code generation didn't take longer as with other endgine and the code was bug free.