<div align="center">

# roblox-best-practices-skill

[![Version](https://img.shields.io/github/package-json/v/andrian-syh/roblox-best-practices-skill?label=version)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/github/license/andrian-syh/roblox-best-practices-skill)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/standard-Agent%20Skills-8a3ffc)](https://agentskills.io)

</div>

Roblox and Luau coding standards packaged as one Agent Skill for AI coding assistants.

The skill covers how each script is written, how game systems are assembled, and where the platform's real limits sit. It assumes nothing about your framework, folder layout, or genre. It works with Claude Code, Cursor, Codex, Gemini CLI, Antigravity, Windsurf, Cline, Zed, and any other tool that reads the [Agent Skills](https://agentskills.io) format.

> [!TIP]
> **Want the full toolkit?** [roblox-optimum](https://github.com/andrian-syh/roblox-optimum) ships this same standard plus separate review, diagnosis, and Studio-tooling skills, a Luau checker, an MCP server, and editor hooks for 11 agents. This repository stays available for anyone who wants the standard alone.

## Contents

- [Which one to install](#which-one-to-install)
- [Install](#install)
- [Usage](#usage)
- [What the skill covers](#what-the-skill-covers)
- [Reference map](#reference-map)
- [Release cadence](#release-cadence)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Which one to install

| | roblox-best-practices-skill | roblox-optimum |
|---|---|---|
| Coding standard (layout, runtime rules, blueprints, references) | Yes | Yes, released first |
| Review, diagnosis, and Studio-tooling guidance | Inside the one skill | Separate `code-review`, `diagnose`, and `studio-ops` skills |
| Static checker for the standard's rules | No | Yes, as a CLI and an MCP tool |
| Editor hooks that feed findings back to the agent | No | Yes |
| Install shape | A skill folder copied into each agent's skills directory | A plugin per host |

Both are maintained by the same author. Install one of them, not both: two copies of the standard in one agent compete for the same requests.

## Install

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.ps1 | iex
```

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.sh | bash
```

Requirements, installer options, install locations, per-agent notes, update, and uninstall are in [INSTALL.md](INSTALL.md).

## Usage

The skill activates on its own when you ask an agent to write, change, review, or fix Luau in a Roblox project. You can also invoke it by name, for example `/roblox-best-practices` in Claude Code.

```text
/roblox-best-practices bal
Write a server script that handles item purchase requests from the client.
```

### Supervision levels

Pass the level as the invocation argument or as an inline token anywhere in a message. With no level given, the agent uses Balanced and does not ask.

| Argument | Token | Level | Behaviour |
|---|---|---|---|
| `ask` | `!ask` | Supervised | Confirms before every meaningful decision |
| `bal` | `!bal` | Balanced (default) | Proceeds, and stops only for real ambiguity or wide-impact changes |
| `go` | `!go` | Autonomous | Decides, and lists every assumption in its summary |

### Default and Adaptive modes

**Default** applies the skill's conventions as written. **Adaptive** studies the project's existing conventions first, proposes a standard based on them, and waits for your approval before writing code. Safety rules apply in full in both modes; only style and structure adapt.

## What the skill covers

- **Script layout.** Every script has three sections in a fixed order: `VARIABLES`, `FUNCTIONS`, `INITIALIZATION`. Small scripts use the three headers alone, and pure data or type modules are exempt.
- **Runtime rules.** Server authority over every remote argument, a teardown path for every connection, no avoidable per-frame garbage, signals instead of polling, `UpdateAsync` with backoff and a `BindToClose` flush, a budgeted network, and re-validation after every yield. Each rule carries documented exceptions so correct code is not flagged.
- **22 implementation blueprints.** Player data, currency, inventory, trading, developer products, gacha, leaderboards, damage validation, abilities, projectiles, NPC AI, round lifecycles, matchmaking, placement, pets, HUD sync, rate limiting, and more. Each gives an assembly order, its failure modes, and how to prove it works.
- **Review without false alarms.** Three severities (Blocker, Correctness, Advisory) behind a four-step confidence gate, and a catalogue of what not to flag.
- **Diagnosis before a fix.** A reported symptom with no file named is narrowed, reproduced, and confirmed before anything is changed.
- **Platform numbers.** Data store, memory store, messaging, HTTP, remote, and attribute limits, quoted from Roblox's published figures and kept apart from the skill's own heuristics.
- **API checks, not recall.** Engine members are confirmed against the versioned API dump or an in-Studio probe. A member missing from the documentation site is reported as undocumented, not as nonexistent.
- **Tooling safety.** Studio MCP preflight and irreversible operations, and for Script Sync, Rojo, Argon, Azul, and Lync, which side is the source of truth.
- **Team workflow.** Git alongside a place file, branch places, ownership of each tree, and the merge gate.

The skill opens with an invariant card that the agent carries verbatim into any summary of a long session, so the rules survive context compaction.

## Reference map

[`SKILL.md`](roblox-best-practices/SKILL.md) is the only file loaded on activation. It routes each task to the one reference it needs among 39 files under [`references/`](roblox-best-practices/references/).

| Group | Files |
|---|---|
| Authoring | `templates`, `section-layout`, `style-rules`, `minimal-code`, `edge-cases`, `adaptive-mode`, `community-libraries`, `luau-language` |
| Blueprints | `cases/data-economy`, `cases/monetization`, `cases/progression`, `cases/combat`, `cases/session-flow`, `cases/world-interaction`, `cases/client-infra` |
| Patterns | `patterns`, `patterns/data`, `patterns/network`, `patterns/lifecycle`, `patterns/world` |
| Depth | `performance`, `device-performance`, `security`, `monetization-policy`, `server-authority`, `limits-budgets`, `ui-crossplatform`, `genres` |
| Process | `workflow`, `runtime-rules`, `review-checklist`, `false-positives`, `evaluation-matrix`, `diagnosis`, `verification`, `studio-mcp`, `external-editors`, `team-workflow`, `api-currency` |

The engine and Luau baseline, with the date it was checked, is kept in [`api-currency.md`](roblox-best-practices/references/api-currency.md).

## Release cadence

New guidance is written and released in [roblox-optimum](https://github.com/andrian-syh/roblox-optimum) first. This repository takes that content in batches, every few roblox-optimum releases, and adapts it to work as a single standalone skill. Each release here names the roblox-optimum version it was ported from, in [CHANGELOG.md](CHANGELOG.md).

Corrections are recorded as corrections. When a pass finds the skill was wrong, the changelog says so.

## Development

```bash
python scripts/validate-skill.py
```

The validator checks links and anchors, that every reference is reachable from `SKILL.md`, the `SKILL.md` size budget, tables of contents, frontmatter limits, that dates appear only in `api-currency.md`, and that every stated version matches `package.json`.

Manual evaluation scenarios live in [`evaluations/`](evaluations/README.md). The port and release procedure is in [MAINTAINING.md](MAINTAINING.md).

## Contributing

Issues and pull requests are welcome in the [issue tracker](https://github.com/andrian-syh/roblox-best-practices-skill/issues). Reports that the skill states something the engine no longer does are especially useful. Content fixes that also apply to roblox-optimum are best filed there, since this repository receives them on the next port.

## License

MIT © Muhammad Andriansyah. See [LICENSE](LICENSE).
