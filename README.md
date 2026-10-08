# One Prompt Applications

This project started as a way to test how far a large language model, and the environment running it, could actually get. By mid-2026 things had changed: several models now run entirely on a laptop, which matters for two reasons. It keeps the work, and the code it produces, on your own machine, and it ends the dependence on a handful of cloud providers.

## Table of Contents

- [Base Rule](#base-rule)
- [Scope](#scope)
- [Tools](#tools)
- [Methods](#methods)
- [Applications](./apps/APPLICATIONS.md)
- [References](#references)

## Base Rule

A single-prompt application is an MVP for its category: it does the essential job and is actually usable. I allow one or two follow-up prompts, but only to *fix* the code, not to add to it. Otherwise the bar drops and weak implementations slip through.

## Scope

Every app here is a small, self-contained project meant to show how far one well-written prompt can carry you. They cover the practical bits (game logic, interface, and core features), so the collection works both as a showcase and as something you can learn from.

Underneath that, I'm really comparing two things: the approaches used by different model runtimes, and the gap between a big remote model and one running locally.

## Tools

I started with GitHub Copilot, Claude, Gemini, and Codex to get a reference point and check that the prompts were any good. The logic is simple: if a model with effectively unlimited resources can't produce something usable, the prompt is the problem, not the model.

Then the cost shot up (first through Copilot's billing changes, then through higher token usage), and the focus moved to running models locally.

The hardware is a MacBook Pro M4 Max, 64 GB, latest macOS. The stack for running the models is [Ollama](https://ollama.com), [oMLX](https://omlx.ai), and [Slotstream](https://github.com/carloslfu/slotstream), all built on Apple's [MLX](https://opensource.apple.com/projects/mlx/).

Ollama and oMLX load the whole model into memory, so memory size limits your choice of model. Slotstream uses the disk to extend that, so you want a mixture-of-experts (MoE) model here, and now the limit is disk read speed.

At the top, I use GitHub Copilot inside VS Code next to Claude Code. Copilot reaches Ollama through a plugin; Claude Code runs from the terminal over Ollama or oMLX. Slotstream goes through the Claude Code VS Code extension.

## Methods

The four targets are **Flight Combat**, **PacMan**, **Tetris**, and **Tower Defense**, each rebuilt in the style of a 1990s PC game, ideally as a fully self-contained browser implementation.

The bar is high, especially for a local model. It needs to reason well *and* produce code that runs without errors. If it can't do that, it's not worth much to a developer: the complex prompting, the checking, and the debugging end up costing more than the model saves.

Early tests already showed that many local models fail this. The usual cause is "vibe coding": one prompt describes the product the way you'd brief a human. At least one local model, though, already pulls it off.

That said, vibe coding shouldn't be the direct route to code or automation. A planning step works better, because it gives you more control. Use the agent's planning feature where you have one; if not, write the plan out by hand. Either way you end up with a set of instructions to steer generation, and it widens the range of models that are still usable, including the ones running on weaker hardware.

## Lessons Learned

**October 2026.** After several sessions trying different approaches, one thing stood out: every model I tested, without one exception, had trouble writing verification code and burned a lot of time setting up tests. None produced a real test suite with measurable coverage, even when I asked for it.

So, starting with PacMan, I stopped asking the implementation prompt to verify itself and split the job: a second prompt, written and structured only for testing, runs in a separate session, optionally on a different model. First results with a frontier model were great, and because the suite is separate, you can rerun it after each change to catch regressions and side effects.

## References

- https://www.linkedin.com/pulse/coffee-breaks-games-daniele-denti-argof
- https://www.linkedin.com/pulse/may-2026-goodbye-github-copilot-daniele-denti-o6c8f
