# Roblox Best Practices Skill

An Agent Skill that gives AI coding assistants a working standard for Roblox and Luau development. It covers how each script is written, how systems are assembled, and where the platform's real limits sit, without assuming anything about your framework, folder layout, or game genre.

Works with Claude Code, Cursor, Codex, Gemini, Windsurf, Cline, Zed, and any other tool that reads the [Agent Skills](https://agentskills.io) standard.

---

## What it gives your agent

**Implementation blueprints, not just rules.** Twenty-two recipes for the systems Roblox developers actually build: player data, currency, inventory, trading, developer products, gacha, leaderboards, damage validation, abilities, projectiles, NPC AI at scale, round lifecycles, matchmaking, placement systems, pets, HUD sync, rate limiting, and more. Each one carries its assembly order, the failure modes specific to that case, the budget it has to fit inside, and how to prove it works.

**A review that does not cry wolf.** A severity taxonomy (Blocker, Correctness, Advisory) and a catalog of what *not* to flag: which allocations are actually hot, what does not leak, what is not a trust boundary, and where a discouraged API is simply not a deprecated one. Findings must clear a four step confidence gate before they are reported.

**Current to the July 2026 engine.** Server Authority, the Character Controller Library, the new Luau type solver, `const` bindings, `InstanceHandle` attributes, unified data store limits, and the 2026 Luau standard library. Every capability is tagged for maturity, and anything the skill could not confirm is marked as unverified rather than asserted.

**It knows upstream Luau is not Roblox Studio.** A feature landing in a `luau-lang/luau` release is not a feature you can use in Studio, and the gap can be months. Every language row carries its actual Studio state, and an accepted RFC is recorded as a design rather than an API, so the agent never writes code against something that does not exist yet.

**Rules that survive a summarized session.** Long agent sessions get compacted, and the usual casualty is exactly the guidance that was loaded first. The skill opens with an invariant card the agent is instructed to carry verbatim into any summary, and to re-read the skill whenever that card is no longer in view.

**Platform ceilings in one place.** Data store size and request budgets, memory store quotas, message size caps, attribute windows, animation track limits. The agent checks them while designing, instead of discovering them in production.

**Safe hands on the Studio MCP.** When the agent drives Studio directly, it identifies which MCP variant it is connected to from the tools actually present, runs a preflight before the first write, and knows which operations cannot be undone: play mode discarding work, a mistyped path silently creating a new script, inserted assets carrying backdoor scripts. It also knows which calls quietly burn your budget, and avoids them.

**Context that stays cheap.** The skill is 22 files, but only the entry point loads on activation. Everything else is routed on demand, so a task pulls the one reference it needs and nothing more.

---

## Installation

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.ps1 | iex
```

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.sh | bash
```

Both scripts launch the Node installer when Node is available and fall back to a native menu when it is not.

### Direct npx

```bash
npx --allow-git=all github:andrian-syh/roblox-best-practices-skill
```

The `--allow-git=all` flag is required on npm v12 and later, which block Git fetches by default. The one liners above handle this for you.

### Flags

| Flag | Effect |
|---|---|
| `--all`, `-a` | Install for the Universal path and every supported agent |
| `--tag <tag>`, `-t <tag>` | Install a specific released version, for example `v1.0.0` |
| `--help`, `-h` | Show CLI help |

---

## How installation works

**Version selection.** The installer fetches published tags from GitHub and offers the bundled version plus the five most recent releases. Older versions stay installable through the manual entry option or the `--tag` flag.

**Universal destination.** The skill always installs to `./.agents/skills/roblox-best-practices/`, which makes it available to any tool reading the standard workspace path.

**Additional agents.** The installer scans your home directory for known agent configuration folders, pre-selects the ones it finds, and lets you filter the list as you type. Folders that do not exist are skipped.

### Supported agents

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

**Default.** Applies this skill's conventions as written. Suited to new or greenfield work.

**Adaptive.** Studies the project's existing conventions first, presents what it found alongside a proposed standard, and waits for your approval before writing code. Safety rules still apply in full; only stylistic and structural conventions adapt.

### Three supervision levels

| Token | Level | Behavior |
|---|---|---|
| `!ask` | Supervised | Confirms before every meaningful decision |
| `!bal` | Balanced (default) | Proceeds normally, stops for real ambiguity or wide impact changes |
| `!go` | Autonomous | Decides and records every assumption in the summary |

### Confirmation gates

The agent resolves these once per session rather than assuming: which community libraries own a concern (ProfileStore, Packet, Trove, Knit, Fusion), and whether the place actually runs Server Authority. Roblox does not enable Server Authority by default, and assuming the wrong mode inverts the correct answer for input, camera, simulation stepping, and movement validation.

---

## Reference map

Only the entry point loads by default. Everything below is read on demand.

**Authoring**

| Reference | Covers |
|---|---|
| [templates.md](roblox-best-practices/references/templates.md) | Annotated layouts for Scripts, LocalScripts, and ModuleScripts |
| [adaptive-mode.md](roblox-best-practices/references/adaptive-mode.md) | Analyzing and adopting an existing project's conventions |
| [community-libraries.md](roblox-best-practices/references/community-libraries.md) | ProfileStore, Packet, ByteNet, Trove, Knit, Fusion, and friends |
| [luau-language.md](roblox-best-practices/references/luau-language.md) | Typing, the new type solver, scheduling, deferred events, time APIs |

**Implementation blueprints**

| Reference | Covers |
|---|---|
| [cases/data-economy.md](roblox-best-practices/references/cases/data-economy.md) | Player data, currency, inventory, trading |
| [cases/monetization.md](roblox-best-practices/references/cases/monetization.md) | Developer products, passes, subscriptions, gacha |
| [cases/progression.md](roblox-best-practices/references/cases/progression.md) | Leaderboards, daily rewards, streaks, offline progress |
| [cases/combat.md](roblox-best-practices/references/cases/combat.md) | Damage validation, abilities, projectiles, NPC AI at scale |
| [cases/session-flow.md](roblox-best-practices/references/cases/session-flow.md) | Round lifecycle, matchmaking, cross server events |
| [cases/world-interaction.md](roblox-best-practices/references/cases/world-interaction.md) | Interactables, placement and building, pets |
| [cases/client-infra.md](roblox-best-practices/references/cases/client-infra.md) | HUD sync, rate limiting and anti cheat, analytics |

**Depth and guardrails**

| Reference | Covers |
|---|---|
| [performance.md](roblox-best-practices/references/performance.md) | Hot loops, memory, network, rendering, profiling |
| [patterns.md](roblox-best-practices/references/patterns.md) | Data stores, remotes, cleanup, pooling, streaming, character lifecycle |
| [security-monetization.md](roblox-best-practices/references/security-monetization.md) | Threat model, validation layers, purchases, text filtering, policy |
| [server-authority.md](roblox-best-practices/references/server-authority.md) | Authoritative simulation, with it and without it |
| [limits-budgets.md](roblox-best-practices/references/limits-budgets.md) | Platform ceilings for data, messaging, attributes, animation |
| [ui-ux-testing.md](roblox-best-practices/references/ui-ux-testing.md) | UI construction, cross platform input, testable architecture |
| [genres.md](roblox-best-practices/references/genres.md) | Risk profiles per genre, from simulators to horror |
| [false-positives.md](roblox-best-practices/references/false-positives.md) | Severity taxonomy and the catalog of what not to flag |
| [api-currency.md](roblox-best-practices/references/api-currency.md) | Dated baseline of confirmed engine and Luau APIs |
| [verification.md](roblox-best-practices/references/verification.md) | Proving a change works, and the command bar VM pitfall |
| [studio-mcp.md](roblox-best-practices/references/studio-mcp.md) | Operating a Studio MCP connection safely and without wasting tokens |

Full entry point: [SKILL.md](roblox-best-practices/SKILL.md).

---

## Script layout

Every script is divided into three top level sections, with a five level header hierarchy for subdivision.

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

Ceremony scales to the script. Small files use the three headers alone, and pure data or type modules are exempt entirely.

## Non negotiable runtime rules

1. **Server is authoritative.** Validate every remote argument for type, range, ownership, and rate.
2. **Clean up everything you create.** Every connection has an owner and a teardown path.
3. **No avoidable per frame garbage.** Hoist what can be hoisted out of genuinely hot paths.
4. **React, do not poll.** Use signals rather than loops that watch a condition.
5. **Save data safely.** `UpdateAsync` with backoff, saved on leave, flushed on shutdown.
6. **Budget the network.** Batch, send deltas, and use unreliable events for loss tolerant data.
7. **Re-validate after every yield.** The player may have left and the instance may be gone.

Each rule carries scoped exceptions, documented so that legitimate code is not reported as a violation.

---

## Maintenance

Roblox ships changes continuously, and guidance that is a year old quietly becomes wrong. This skill is maintained against that.

The aim is an update at **the end of each month**, tracking what Roblox actually shipped that month across both fronts:

- **Luau**, the language itself: new syntax and standard library additions, type solver behavior, compiler and runtime changes.
- **Roblox Studio and the engine**: new and deprecated APIs, systems moving between beta and general release, changed platform limits, and Studio tooling that affects how an agent works.

Each cycle also carries improvements beyond the refresh: sharper guardrails, new implementation blueprints, and corrections where reality has moved past what the skill says. Anything that cannot be confirmed against the official documentation is marked unverified rather than asserted, so the skill stays honest about its own edges.

Released versions are tagged and documented in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome at the [repository](https://github.com/andrian-syh/roblox-best-practices-skill/issues). Corrections are especially valuable: if the skill states something the engine no longer does, that is a bug worth reporting.

## License

[MIT](LICENSE).
