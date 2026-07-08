# One Prompt Applications

The project's original purpose was to measure and demonstrate the real capabilities of a large language model and its working environment. By mid-2026, technical progress had made it possible to extend these assessments to several models that can run entirely in a local laptop environment. This development protects intellectual property and removes dependence on major providers.

## Table of Contents

- [Base Rule](#base-rule)
- [Scope](#scope)
- [Tools](#tools)
- [Methods](#methods)
- [Applications](./apps/APPLICATIONS.md)
- [References](#references)
## Base Rule

A single-prompt application is a Minimum Viable Product (MVP) that meets the essential requirements of its category. The application must be fully functional and fit for purpose. To avoid rejecting strong implementations because of minor defects, an application that requires one or two additional prompts to become fully functional is still considered valid, provided those prompts are used to correct the code rather than extend it.

## Scope

Each application in this repository is a small, self-contained project designed to demonstrate how far a single well-written prompt can go in producing usable software. The examples cover practical logic, interface behaviour, and core features, making the collection useful both as a showcase and as a learning resource for AI-driven development and publishing.

## Tools

GitHub Copilot, Claude, Gemini, and Codex were used initially to establish a reference point and validate the prompts. The underlying assumption was straightforward: if a model with virtually unlimited resources cannot produce a usable result, the prompt is poorly formulated.

As costs rose significantly, whether through changes to GitHub Copilot's billing model or increases in input and output token usage, attention shifted towards running models locally.

The hardware is a MacBook Pro M4 Max with 64 GB of memory, running the latest version of macOS. The core software stack for managing and running the models is provided by [Ollama](https://ollama.com) and [oMLX](https://omlx.ai), both of which are built on Apple's [MLX framework](https://opensource.apple.com/projects/mlx/).

At the top of the stack, GitHub Copilot is used within VS Code alongside Claude Code. GitHub Copilot connects to Ollama through a plugin, while Claude Code is launched from the terminal via Ollama or oMLX.

## Methods

The two target applications are **Tetris** and **Flight Combat**. Both should be recreated as they appeared on 1990s PCs, preferably as fully self-contained browser implementations.

The expectations are particularly high for a local model. It must combine strong analytical ability with the capacity to produce functional, error-free code. If those conditions are not met, the model is of limited practical use to a developer, because complex prompts, extensive checking, and costly debugging outweigh any benefit the AI might provide.

Early tests have already shown that many local models do not meet this benchmark. The main reason is their reliance on vibe coding: a single prompt describes the product in much the same way a human programmer would be briefed. At least one local model, however, already shows the required qualities.

Vibe coding should not be used as the direct route to producing code or automation. A planning step is more effective, because it gives far better control over the generative process. Where available, the agent's planning function should be used; otherwise, the plan can simply be written out explicitly. This quickly produces a set of instructions to guide generation and broadens the range of models that remain useful, including those that run on more limited hardware.

## References

- https://www.linkedin.com/pulse/coffee-breaks-games-daniele-denti-argof
- https://www.linkedin.com/pulse/may-2026-goodbye-github-copilot-daniele-denti-o6c8f
