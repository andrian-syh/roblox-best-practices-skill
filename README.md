<div align="center">

# Roblox Best Practices Skill

**A working standard for Roblox and Luau, written for AI coding assistants.**

[![Version](https://img.shields.io/badge/version-v1.18.2-0a7bbb)](https://github.com/andrian-syh/roblox-best-practices-skill/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/standard-Agent%20Skills-8a3ffc)](https://agentskills.io)
[![Engine](https://img.shields.io/badge/engine-735-lightgrey)](roblox-best-practices/references/api-currency.md)

</div>

It covers how each script is written, how systems are assembled, and where the platform's real limits sit — without assuming anything about your framework, folder layout, or genre.

Works with Claude Code, Cursor, Codex, Gemini, Windsurf, Cline, Zed, and any other tool that reads the [Agent Skills](https://agentskills.io) standard.

```powershell
irm https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.sh | bash
```

<sub>[Installation details](#installation) · [How the skill behaves](#how-the-skill-behaves) · [Reference map](#reference-map) · [Changelog](CHANGELOG.md)</sub>

---

## Why this exists

Most coding standards tell an agent what good code looks like. That is the easy half. The hard half is everything an agent gets wrong *because it cannot see your game*: a remote handler that trusts the client, a connection nobody disconnects, a data store call with no answer for what happens after the last retry, an API recalled from training data that was deprecated two years ago.

This skill is the other half.

## What it gives your agent

|  | |
|---|---|
| **22 implementation blueprints** | Player data, currency, inventory, trading, developer products, gacha, leaderboards, damage validation, abilities, projectiles, NPC AI at scale, round lifecycles, matchmaking, placement, pets, HUD sync, rate limiting, and more. Each carries its assembly order, the failure modes specific to that case, the budget it must fit inside, and how to prove it works. |
| **A review that does not cry wolf** | Three severities — Blocker, Correctness, Advisory — behind a four-step confidence gate, plus a catalog of what *not* to flag: which allocations are actually hot, what does not leak, what is not a trust boundary, and where a discouraged API is simply not a deprecated one. |
| **Platform ceilings, up front** | Data store request budgets at both ceilings and per-key throughput, memory store quota formulas, message and HTTP limits, secrets, attribute windows, animation track limits. Checked while designing, not discovered in production. |
| **Studio MCP safety** | Identifies which MCP variant it is connected to from the tools actually present, runs a preflight before the first write, and knows which operations cannot be undone — play mode discarding work, a mistyped path silently creating a new script, inserted assets carrying backdoor scripts. |

Four things deserve more than a table row.

### It knows the platform's actual numbers

Request budgets at both the experience and per-server ceiling, per-key throughput, memory store quota formulas, the four-second read cache, HTTP and secret limits, frame and draw-call budgets, device demographics. Published Roblox figures are quoted as facts and kept separate from the skill's own heuristics, so an agent never invents a threshold and presents it as a platform limit.

### It verifies APIs instead of remembering them

An agent's training data has a cutoff; Roblox does not. So the skill treats existence as a question with a procedure attached rather than a thing to recall.

Two authorities, for two different questions. *Does this member exist* is settled by the versioned API dump or a probe in Studio. *What does it do* is settled by the Engine API Reference. The distinction matters more than it sounds: the documentation site trails the engine by weeks, so a member missing from a reference page is undocumented, not unshipped. Every engine fact the agent states has to name the check behind it, and anything it could not confirm is labeled unverified rather than asserted.

### It knows upstream Luau is not Roblox Studio

A feature landing in a `luau-lang/luau` release is not a feature you can use in Studio, and the gap runs to months. Every language row carries its actual Studio state, and an accepted RFC is recorded as a design rather than an API — so the agent never writes code against something that does not exist yet.

### Its rules survive a summarized session

Long agent sessions get compacted, and the usual casualty is exactly the guidance that was loaded first. The skill opens with an invariant card that the agent is instructed to carry verbatim into any summary, and to re-read the skill whenever that card is no longer in view.

### Less code, running on weaker hardware

The agent reaches for the engine API before writing one, keeps functions dense, and budgets frame time in milliseconds rather than guessing. Bulk work is spread across frames, quality degrades in a fixed order instead of arbitrarily, and low-end mobile is the baseline rather than an afterthought.

It also knows how to *measure* rather than assert: the MicroProfiler's real shortcuts, modes, dump locations and tag names, Scene Analysis and its six views, the Developer Console figures worth watching, and the Performance Dashboard that is the only view of real players. Published Roblox numbers are quoted as facts and kept separate from the skill's own heuristics, so an agent never invents a threshold and calls it a platform limit.

Brevity applies to the implementation, never to what you asked for. Pairs with the optional [Ponytail](https://github.com/DietrichGebert/ponytail) plugin when installed, and works fully without it.

---

## Installation

### One-liners

The scripts above launch the Node installer when Node is available, and fall back to a native menu when it is not.

### Direct npx

```bash
npx --allow-git=all github:andrian-syh/roblox-best-practices-skill
```

`--allow-git=all` is required on npm v12 and later, which block Git fetches by default. The one-liners handle this for you.

### Flags

| Flag | Effect |
|---|---|
| `--all`, `-a` | Install for the Universal path and every supported agent |
| `--tag <tag>`, `-t <tag>` | Install a specific released version, for example `v1.0.0` |
| `--help`, `-h` | Show CLI help |

### What the installer does

The skill always lands in `./.agents/skills/roblox-best-practices/`, the standard workspace path any conforming tool reads. Beyond that, the installer scans your home directory for known agent configuration folders, pre-selects the ones it finds, and lets you filter as you type — folders that do not exist are skipped.

Version selection offers the bundled release plus the five most recent tags. Older versions stay installable through manual entry or `--tag`.

| Scope | Directory | Tools |
|---|---|---|
| Universal (always) | `./.agents/skills/` | Antigravity, Amp, Cline, Codex, Kimi Code CLI, OpenCode, Warp, Zed, and others |
| Global | `~/.claude/skills/` | Claude Code |
| Global | `~/.cursor/skills/` | Cursor |
| Global | `~/.gemini/config/skills/` | Gemini |
| Global | `~/.codex/skills/` | Codex |
| Global | `~/.windsurf/skills/` | Windsurf and Cascade |
| Global | `~/.roo/skills/` | Roo Code |
| Global | `~/.trae/skills/` | Trae AI |
| Global | *(and more)* | 63 agents in total, listed in [`bin/agents.txt`](bin/agents.txt) |

---

## How the skill behaves

### Two modes

**Default** applies the skill's conventions as written, which suits new or greenfield work.

**Adaptive** studies the project's existing conventions first, presents what it found alongside a proposed standard, and waits for your approval before writing code. Safety rules still apply in full; only style and structure adapt.

### Three supervision levels

Pass the level as an invocation argument (`/roblox-best-practices bal`) or as an inline token. Absence is not an error — it means Balanced, and the agent never stops to ask which level you want.

| Argument | Token | Level | Behavior |
|---|---|---|---|
| `ask` | `!ask` | Supervised | Confirms before every meaningful decision |
| `bal` | `!bal` | Balanced *(default)* | Proceeds normally; stops for real ambiguity or wide-impact changes |
| `go` | `!go` | Autonomous | Decides, and records every assumption in the summary |

### Confirmation gates

Two facts get resolved once per session rather than assumed: which community libraries own a concern (ProfileStore, Packet, Trove, Fusion), and whether the place actually runs Server Authority.

The second one matters. Roblox does not enable Server Authority by default, and guessing wrong inverts the correct answer for input, camera, simulation stepping, and movement validation.

---

## Script layout

Every script is divided into three top-level sections, with a five-level header hierarchy for subdivision.

```lua
-- // VARIABLES // --
-- | Services | --
-- | Modules | --
-- | Objects | --
-- | Configuration | --
-- | State Management | --

-- // FUNCTIONS // --
-- | Private | --
-- | Public | --

-- // INITIALIZATION // --
```

Ceremony scales to the script: small files use the three headers alone, and pure data or type modules are exempt entirely.

## Non-negotiable runtime rules

1. **Server is authoritative.** Validate every remote argument for type, range, ownership, and rate.
2. **Clean up everything you create.** Every connection has an owner and a teardown path.
3. **No avoidable per-frame garbage.** Hoist what can be hoisted out of genuinely hot paths.
4. **React, do not poll.** Use signals rather than loops that watch a condition.
5. **Save data safely.** `UpdateAsync` with backoff, saved on leave, flushed on shutdown.
6. **Budget the network.** Batch, send deltas, use unreliable events for loss-tolerant data.
7. **Re-validate after every yield.** The player may have left; the instance may be gone.

Each rule carries scoped exceptions, documented so that legitimate code is not reported as a violation.

---

## Reference map

36 files, of which exactly one loads on activation. Everything below is routed on demand, so a task pulls the reference it needs and nothing more.

**Authoring**

| Reference | Covers |
|---|---|
| [templates.md](roblox-best-practices/references/templates.md) | Annotated layouts for Scripts, LocalScripts, and ModuleScripts |
| [section-layout.md](roblox-best-practices/references/section-layout.md) | The header hierarchy, subsection contents, and Documentation Comment rules |
| [style-rules.md](roblox-best-practices/references/style-rules.md) | Naming, deprecated and misremembered APIs, where code lives and `RunContext`, module hygiene |
| [minimal-code.md](roblox-best-practices/references/minimal-code.md) | Reuse before writing, what the engine already provides, code density |
| [edge-cases.md](roblox-best-practices/references/edge-cases.md) | The states production actually produces — player and instance lifetimes, numbers, timing, cloud calls, UI — and the guard for each |
| [adaptive-mode.md](roblox-best-practices/references/adaptive-mode.md) | Analyzing and adopting an existing project's conventions |
| [community-libraries.md](roblox-best-practices/references/community-libraries.md) | ProfileStore, Packet, ByteNet, Trove, Fusion, and friends |
| [luau-language.md](roblox-best-practices/references/luau-language.md) | Truthiness and coercion, table and `require` semantics, typing, scheduling, deferred events |

**Implementation blueprints**

| Reference | Covers |
|---|---|
| [cases/data-economy.md](roblox-best-practices/references/cases/data-economy.md) | Player data, currency, inventory, trading |
| [cases/monetization.md](roblox-best-practices/references/cases/monetization.md) | Developer products, passes, subscriptions, gacha |
| [cases/progression.md](roblox-best-practices/references/cases/progression.md) | Leaderboards, daily rewards, streaks, offline progress |
| [cases/combat.md](roblox-best-practices/references/cases/combat.md) | Damage validation, abilities, projectiles, NPC AI at scale |
| [cases/session-flow.md](roblox-best-practices/references/cases/session-flow.md) | Round lifecycle, matchmaking, cross-server events |
| [cases/world-interaction.md](roblox-best-practices/references/cases/world-interaction.md) | Interactables, placement and building, pets |
| [cases/client-infra.md](roblox-best-practices/references/cases/client-infra.md) | HUD sync, rate limiting and anti-cheat, analytics |

**Patterns**

| Reference | Covers |
|---|---|
| [patterns/data.md](roblox-best-practices/references/patterns/data.md) | State ownership, data stores, failure policy, per-owner locks |
| [patterns/network.md](roblox-best-practices/references/patterns/network.md) | Remotes, what survives serialization, memory store structures, cross-server messaging, streaming |
| [patterns/lifecycle.md](roblox-best-practices/references/patterns/lifecycle.md) | Connection cleanup, character lifecycle, object pooling |
| [patterns/world.md](roblox-best-practices/references/patterns/world.md) | Tag and attribute binding, client input, anti-patterns |

**Depth and guardrails**

| Reference | Covers |
|---|---|
| [performance.md](roblox-best-practices/references/performance.md) | Hot loops, memory, network, physics queries, rendering, the full profiling toolkit |
| [device-performance.md](roblox-best-practices/references/device-performance.md) | Frame budgets, join time, low-end devices, quality degradation, time-slicing |
| [security.md](roblox-best-practices/references/security.md) | Threat model, designing exploits out, validation depth, detection, script capabilities |
| [monetization-policy.md](roblox-best-practices/references/monetization-policy.md) | `ProcessReceipt`, products and passes, PolicyService compliance |
| [server-authority.md](roblox-best-practices/references/server-authority.md) | Authoritative simulation, with it and without it |
| [limits-budgets.md](roblox-best-practices/references/limits-budgets.md) | Platform ceilings for data stores, memory stores, messaging, HTTP, secrets, attributes, animation |
| [ui-crossplatform.md](roblox-best-practices/references/ui-crossplatform.md) | Containers, layout precedence, the styling system, text and filtering, interaction objects, cross-platform input, accessibility |
| [genres.md](roblox-best-practices/references/genres.md) | Risk profiles per genre, from simulators to horror |

**Process**

| Reference | Covers |
|---|---|
| [workflow.md](roblox-best-practices/references/workflow.md) | Session setup, supervision behavior, review gate, design preflight |
| [runtime-rules.md](roblox-best-practices/references/runtime-rules.md) | The seven runtime rules in full, each with its scope |
| [false-positives.md](roblox-best-practices/references/false-positives.md) | Severity taxonomy and the catalog of what not to flag |
| [review-checklist.md](roblox-best-practices/references/review-checklist.md) | The completion gate before any task is called done |
| [evaluation-matrix.md](roblox-best-practices/references/evaluation-matrix.md) | Auditing a live project on request: scoping, gathering evidence, scoring 1–5, reporting honestly |
| [api-currency.md](roblox-best-practices/references/api-currency.md) | Dated baseline of confirmed engine and Luau APIs, and how to verify one |
| [verification.md](roblox-best-practices/references/verification.md) | Proving a change works, and the command-bar VM pitfall |
| [studio-mcp.md](roblox-best-practices/references/studio-mcp.md) | Operating a Studio MCP connection safely: checking the connected tools, the preflight, and what cannot be undone |

Entry point: [SKILL.md](roblox-best-practices/SKILL.md).

---

## Maintenance

Roblox ships changes continuously, and guidance that is a year old quietly becomes wrong. This skill is maintained against that, aiming for an update at **the end of each month** across both fronts:

- **Luau, the language.** New syntax and standard library additions, type solver behavior, compiler and runtime changes.
- **Roblox Studio and the engine.** New and deprecated APIs, systems moving between beta and general release, changed platform limits, and Studio tooling that affects how an agent works.

Each cycle carries improvements beyond the refresh: sharper guardrails, new blueprints, and corrections where reality has moved past what the skill says. The current baseline is engine **735** and Luau **0.735**.

Corrections are tracked honestly. When a maintenance pass finds that the skill was wrong, the changelog says so plainly rather than describing the fix as an enhancement.

Released versions are tagged and documented in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome at the [repository](https://github.com/andrian-syh/roblox-best-practices-skill/issues). Corrections are especially valuable: if the skill states something the engine no longer does, that is a bug worth reporting.

## License

[MIT](LICENSE).
