# One Prompt Applications

The project's original purpose was to assess and demonstrate the practical capabilities of a large language model and its execution environment. By mid-2026, technical progress had made it possible to extend these assessments to several models that can run entirely on a laptop. This development protects intellectual property and removes dependence on major providers.

## Table of Contents

- [Base Rule](#base-rule)
- [Scope](#scope)
- [Tools](#tools)
- [Methods](#methods)
- [Applications](./apps/APPLICATIONS.md)
- [References](#references)

## Base Rule

A single-prompt application is a minimum viable product (MVP) that meets the essential requirements of its category. The application must be fully functional and fit for purpose. To avoid rejecting strong implementations because of minor defects, an application that requires one or two additional prompts to become fully functional is still considered valid, provided those prompts are used to correct the code rather than extend it.

## Scope

Each application in this repository is a small, self-contained project designed to demonstrate how far a single well-written prompt can go in producing usable software. The examples cover practical logic, interface behaviour, and core features, making the collection useful both as a showcase and as a learning resource for AI-driven development and publishing.

At a technical level, the aim is to evaluate the approaches used in different model execution environments and assess the differences between a large, remotely hosted model and one running on local hardware.

## Tools

GitHub Copilot, Claude, Gemini, and Codex were used initially to establish a reference point and validate the prompts. The underlying assumption was straightforward: if a model with virtually unlimited resources cannot produce a usable result, the prompt is poorly formulated.

As costs rose significantly, whether through changes to GitHub Copilot's billing model or increases in input and output token usage, attention shifted towards running models locally.

The hardware is a MacBook Pro M4 Max with 64 GB of memory, running the latest version of macOS. The core software stack for managing and running the models is provided by [Ollama](https://ollama.com), [oMLX](https://omlx.ai) and [Slotstream](https://github.com/carloslfu/slotstream), all of which are built on Apple's [MLX framework](https://opensource.apple.com/projects/mlx/).

Ollama and oMLX load the entire model into memory, so the available memory capacity constrains model selection. Slotstream uses disk storage to extend the available memory capacity. With this approach, the model should use a mixture-of-experts (MoE) architecture, and performance is constrained by disk read throughput.

At the top of the stack, GitHub Copilot is used within VS Code alongside Claude Code. GitHub Copilot connects to Ollama through a plugin, while Claude Code is launched from the terminal via Ollama or oMLX. Slotstream is used through the Claude Code extension for VS Code.

## Methods

The three target applications are **Flight Combat**, **Tetris** and **Tower Defense**. They should be recreated in the style of 1990s PC games, preferably as fully self-contained browser implementations.

The expectations are particularly high for a local model. It must combine strong analytical ability with the capacity to produce functional, error-free code. If those conditions are not met, the model is of limited practical use to a developer, because complex prompts, extensive checking, and costly debugging outweigh any benefit the AI might provide.

Early tests have already shown that many local models do not meet this benchmark. The main reason is their reliance on vibe coding: a single prompt describes the product in much the same way a human programmer would be briefed. At least one local model, however, already shows the required qualities.

Vibe coding should not be used as the direct route to producing code or automation. An explicit planning phase is more effective, as it provides greater control over the code generation process. Where available, the agent's planning function should be used; otherwise, the plan can be written out explicitly. This quickly produces a set of instructions to guide generation and broadens the range of models that remain useful, including those that run on more limited hardware.

## References

- https://www.linkedin.com/pulse/coffee-breaks-games-daniele-denti-argof
- https://www.linkedin.com/pulse/may-2026-goodbye-github-copilot-daniele-denti-o6c8f
