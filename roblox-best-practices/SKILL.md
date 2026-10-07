---
name: roblox-best-practices
argument-hint: "[ask|bal|go]"
description: "Roblox and Luau game code standards. Writes, reviews, and fixes Script, LocalScript, and ModuleScript code and game systems such as shops, DataStore saves, RemoteEvents, combat, NPCs, and UI. Use when a request involves Luau code or a Roblox Studio project, even when Roblox is never named, when a game bug is reported with no file named, and when the user asks to keep these standards active. Also covers Rojo, Argon, Azul, Script Sync, Studio MCP, and community libraries such as ProfileStore, Knit, Trove, and Fusion. Applies to requests written in any language. Not for plain Lua outside Roblox (Neovim, LOVE, Defold, other engines) or for game design with no Luau to write or review."
license: MIT
metadata:
  version: "2.1.0"
---

# Roblox Game Development Best Practices

Framework-agnostic standards for clean, resource-frugal Luau. They govern *how each script is written*, not how the project is structured.

**Goals, in priority order:** correct → secure (server-authoritative) → efficient (CPU/memory/network) → readable → consistent.

*Skill version 2.1.0. If this contradicts a newer release, the installed copy is stale; see [CHANGELOG.md](https://github.com/andrian-syh/roblox-best-practices-skill/blob/main/CHANGELOG.md).*


## Session Invariants (must survive compaction)

A summary that drops these rules silently downgrades every file written afterwards. Two standing obligations:

1. **Carry it forward verbatim** in any summary, handoff, plan, or task note. It is active instruction, never compressed into "follow the Roblox skill".
2. **Re-read this file before acting** whenever the card's full text is not visible in your context. Never reconstruct these rules from memory — a half-remembered layout rule looks deliberate and is worse than none.

```text
ROBLOX LUAU SKILL - INVARIANT CARD
1  Three sections, this order:
   -- // VARIABLES // --   Services > Modules > Objects > Configuration > State Management
   -- // FUNCTIONS // --   definitions only (ModuleScript: Private before Public)
   -- // INITIALIZATION // --   everything that runs
2  Documentation Comments (Luau Comments) - default style, adapts to the project.
   Default block: --[[ ]] above the function, desc > @param > @return.
   Moonwave --[=[ ]=] or --- is equally correct when that is the project's style.
   - Desc <= 3 lines and <= 250 chars, contract-level, states PURPOSE.
   - Desc never names what the body does to get there: no APIs, algorithms,
     collaborators, data structures, or code paths.
   - Desc carries NO volatile content: no numbers, thresholds, tunable names,
     feature names, or anything that needs editing when the body is retuned.
     When a detail cannot be avoided, state it at the most general level
     that stays true after the body changes.
   - Tags use Moonwave syntax: @param <name> <type> -- <description>
     and @return <type> -- <description>. Only when they add what the
     signature cannot show.
   - English preferred as the universal language. No em dashes or double-hyphen
     dashes as punctuation (the -- in a tag is a separator, not punctuation).
     No emoji.
   - IN-BODY COMMENTS: banned in code you write. Make names and
      structure say it; put the why in the block above. Never delete
      an existing one; propose removal once, Advisory only.
   - Self-documenting code outranks commentary everywhere.
   - Existing project comment style wins. Recommend this style when the user
     asks to restyle; never impose it.
3  Server is authoritative. Validate every remote arg: type, range, ownership, rate.
4  Clean up everything created. Every connection has an owner and a teardown path.
5  No avoidable per-frame garbage. Never poll what has a signal.
   Cold paths are exempt, and periodic work on a timer is scheduling.
6  UpdateAsync + backoff. Save on PlayerRemoving. Flush on BindToClose.
7  Re-validate after every yield: player gone? instance dead? session changed?
   Only where a yield sits between the check and its use.
8  Never add --!strict unbidden. Never make a [Beta] feature the production default.
9  Reuse before writing: project, then stdlib, then engine API. Search, never
   assume - no claim about a file you have not opened. No wrapper or
   abstraction without a caller. But brevity has two hard limits:
   - It NEVER reduces what was asked for. Short because it does less = failed.
   - It NEVER costs readability. One statement per line, descriptive names,
     blank lines kept. Less code means less WORK, not less whitespace.
10 User authority outranks this skill. Recommend; never refactor unasked.
```

Everything below expands these; nothing below overrides them.

## Reference Routing

**Load only what the task needs.** Each reference is self-contained; read the one whose line matches, not the set.

**Authoring**

- [templates.md](references/templates.md) — writing a new Script/LocalScript/ModuleScript
- [section-layout.md](references/section-layout.md) — layout detail, subsection contents, Documentation Comment rules, rejected examples
- [style-rules.md](references/style-rules.md) — naming, deprecated APIs, misremembered APIs, `const`, typing opt-in, module hygiene
- [adaptive-mode.md](references/adaptive-mode.md) — existing codebase with its own conventions
- [community-libraries.md](references/community-libraries.md) — ProfileStore, Packet, Trove, Knit, Fusion, ...
- [minimal-code.md](references/minimal-code.md) — about to write a helper that may already exist; keeping code dense
- [edge-cases.md](references/edge-cases.md) — nil, empty, stale, duplicate, reused, or departed state a function will meet
- [luau-language.md](references/luau-language.md) — language semantics: coercion, table copies, `require`, typing depth, `vector`/`buffer`, `task.spawn` vs `task.defer`, error handling, time APIs, native codegen

**Implementing a known system** — read the one file whose domain matches; each gives assembly order and case-specific failure modes.

- [cases/data-economy.md](references/cases/data-economy.md) — player data, currency, inventory, trading
- [cases/monetization.md](references/cases/monetization.md) — Developer Products, passes/subscriptions, gacha/loot boxes
- [cases/progression.md](references/cases/progression.md) — leaderboards, daily rewards, streaks, offline progress
- [cases/combat.md](references/cases/combat.md) — damage/hit validation, abilities and cooldowns, projectiles, NPC/mob AI
- [cases/session-flow.md](references/cases/session-flow.md) — round/match lifecycle, matchmaking and reserved servers, cross-server events
- [cases/world-interaction.md](references/cases/world-interaction.md) — interactables and prompts, placement/building, pets and followers
- [cases/client-infra.md](references/cases/client-infra.md) — HUD/state sync, rate limiting and anti-cheat, analytics instrumentation

**Deepening a concern**

- [performance.md](references/performance.md) — hot loops, memory, network traffic, physics queries and contact detection, rendering, profiling
- [device-performance.md](references/device-performance.md) — frame budget in ms, low-end and "potato" devices, quality degradation, time-slicing, per-player bandwidth
- [patterns/data.md](references/patterns/data.md) — state ownership, data stores (+ version history), failure policy after the last retry, per-owner locks
- [patterns/network.md](references/patterns/network.md) — remotes, cross-server (MemoryStore, MessagingService, reserved servers), StreamingEnabled
- [patterns/lifecycle.md](references/patterns/lifecycle.md) — connection cleanup, character lifecycle (Humanoid vs CCL), object pooling
- [patterns/world.md](references/patterns/world.md) — CollectionService binding and attributes, client input, anti-patterns to reject on sight
- [patterns.md](references/patterns.md) — index of the four pattern files above
- [security.md](references/security.md) — anti-exploit, remote validation depth, movement sanity checks, text filtering
- [monetization-policy.md](references/monetization-policy.md) — `ProcessReceipt`, Developer Products and passes, PolicyService compliance
- [server-authority.md](references/server-authority.md) — anything touching movement, physics, input, camera, animation timing, `BindToSimulation`, network ownership
- [ui-crossplatform.md](references/ui-crossplatform.md) — UI construction, cross-platform and accessibility, input device handling
- [genres.md](references/genres.md) — simulator, FPS, obby, RPG, racing, horror, social, tower defense, battlegrounds

**Process**

- [workflow.md](references/workflow.md) — resolving a session-setup decision, supervision behavior, opening a review, the preflight before a non-trivial system
- [verification.md](references/verification.md) — proving a change works: playtests, multi-client sessions, test injection, telemetry, the command-bar VM pitfall
- [studio-mcp.md](references/studio-mcp.md) — Studio MCP connection: which tool, what is irreversible, how not to burn tokens
- [external-editors.md](references/external-editors.md) — the project is edited outside Studio: Script Sync, Rojo, Argon, Azul, and the toolchain around them
- [team-workflow.md](references/team-workflow.md) — git alongside a place file, branch places, who owns which tree, the review gate, shipping
- [diagnosis.md](references/diagnosis.md) — a reported symptom with no file named yet: narrowing, reproducing, and confirming the cause before any fix
- [false-positives.md](references/false-positives.md) — reviewing code: whether a finding is real, how severe, what not to flag
- [review-checklist.md](references/review-checklist.md) — **finishing any task**: the completion gate before calling work done
- [evaluation-matrix.md](references/evaluation-matrix.md) — auditing a project on request: scope, evidence, a 1–5 score across security, lifecycle, and performance, and an honest report
- [api-currency.md](references/api-currency.md) — whether a newer engine/Luau API is confirmed before relying on it or flagging it missing
- [limits-budgets.md](references/limits-budgets.md) — platform ceilings: DataStore size/requests, MemoryStore, messaging, attributes, animation tracks

**Lookup files** (`limits-budgets.md`, `genres.md`, `edge-cases.md`) are tables: grep the row you need.

## User Authority

This skill is guidance, not a mandate — **full control always stays with the user**:

- The user's explicit instructions override any convention in this skill. If an instruction conflicts with a Non-Negotiable Runtime Rule, state the risk once, briefly, then follow the user's decision.
- Never act unasked on the strength of this skill alone: no unrequested refactors, restructuring, new files, or "while I'm here" cleanups. Recommend; don't act.
- **Language:** reply in the language the user writes in. Code, identifiers, and Documentation Comments follow the language the project already uses, and English when there is no precedent (card item 2). A request in any language gets the full skill; no rule here depends on the language of the request.
- Invoked with no task ("use best practices", "follow this skill from now on"): acknowledge that the standards are active and stop — no codebase analysis, no setup questions ([references/workflow.md](references/workflow.md#advisory-invocation-no-specific-task)).

## Session Setup (decide once, then cache)

Five decisions govern every later task. Resolve each **once** and **lazily**, at the first task that needs it, then cache it; never re-ask per file. How to resolve each, and how the supervision level modifies it: [references/workflow.md](references/workflow.md#session-setup-resolving-the-five-decisions).

| Decision | Default when unresolved |
|---|---|
| **Supervision level** — invocation argument `ask`/`bal`/`go`, or `!ask`/`!bal`/`!go` inline | **Balanced**; never ask which level the user wants, absence *is* the answer |
| **Default vs Adaptive mode** | **Default** for new files; for edits, match the file being edited and note the assumption |
| **Community libraries** | **None** — use the built-in patterns |
| **Server Authority** | **OFF** — most places are not server-authoritative, and assuming otherwise produces confidently wrong code |
| **Environment facts** — `SignalBehavior`, `StreamingEnabled`, rig type, strictness header | Assume none of them; each inverts correct guidance between values |

*Default* applies these conventions as written; *Adaptive* proposes an adaptation of the project's own style and waits for confirmation ([references/adaptive-mode.md](references/adaptive-mode.md)). Only style and structure ever adapt, and community libraries win for the concern they own. **Never migrate a project to Server Authority on this skill's initiative**: it changes how movement, physics, and input work across the whole place.

### Review/refactor mode

One severity per finding (**Blocker / Correctness / Advisory**), after the confidence gate; Advisory is proposed, never forced, and unrelated code is never reformatted. Gate and calibration: [references/workflow.md](references/workflow.md#reviewrefactor-mode). What not to flag: [references/false-positives.md](references/false-positives.md).

A reported symptom with no file named is diagnosed before anything is changed — reaching for the first plausible file produces a change that looks like a fix and leaves the defect in place: [references/diagnosis.md](references/diagnosis.md).

## Environment & Scale

- **Detect the project environment first** — **Studio-native**, or a filesystem project synced by Script Sync, Rojo, Argon, or Azul. **Which side is the source of truth differs per tool**, and assuming wrong overwrites the user's work: [references/external-editors.md](references/external-editors.md). Never start, stop, or reconfigure a sync session unasked. On an MCP connection, [references/studio-mcp.md](references/studio-mcp.md) applies before any write.
- **Verify newer APIs, and state the basis for every engine fact**; memory is never presented as fact. Existence comes from the versioned API dump or an in-Studio probe, behaviour from the Engine API Reference. The docs site lags the engine, so a member missing from it is undocumented, not nonexistent. Cite the check, or say "unverified" and name the check that would settle it: [references/api-currency.md](references/api-currency.md#how-to-verify-the-toolbox).
- **Maturity tags:** **[GA]** safe as a default · **[Beta]** opt-in, may change · **[Undocumented]** shipped, but no reference page — probe its semantics · **[Verify]** confirm in the target place · **[UNVERIFIED]** unconfirmed by this skill. **Never make a [Beta] feature a production default** — offer it, state its status, recommend the stable path.
- **Scale the ceremony to the script.** Tiny scripts (< ~40 lines) may use the three top-level headers alone; add deeper headers only when needed, never empty placeholders. **Pure data/type modules** (config tables, item catalogs, shared types) are exempt from the three-section layout.

## Script Section Layout

Card items 1–2 hold the layout and Documentation Comment rules. The card omits two things:

- **Module requires** are ordered by source: ServerScriptService → ServerStorage → ReplicatedStorage → Workspace → script-relative, counting only locations the script can legally reach.
- **Function order inside FUNCTIONS** and what belongs in each VARIABLES subsection are specified, not free.

**Full specification** — header hierarchy, subsection contents, description rules with worked rejections, self-documenting code: [references/section-layout.md](references/section-layout.md). Annotated templates: [references/templates.md](references/templates.md).

## Language & Style Rules

Those that apply on nearly every task:
- **Naming:** `PascalCase` services and module tables · `camelCase` locals, functions, Instance references · `UPPER_SNAKE_CASE` Configuration constants. Module publics `PascalCase`, privates `camelCase`.
- Always `game:GetService()`; never direct indexing (the `workspace` global is fine).
- **No deprecated APIs** such as `wait`/`spawn`/`delay`, `tick`, `Body*` movers, or `Humanoid:LoadAnimation`; full list in [references/style-rules.md](references/style-rules.md). Discouraged-but-functional APIs (the `Instance.new` parent argument, `FireAllClients`) are not deprecated and are Advisory at most.
- **Type safety is opt-in.** Never add or raise `--!strict` unbidden; match what the file or project already declares.
- Guard external and yielding calls (`DataStore`, `MarketplaceService`, `HttpService`, `TeleportService`) with `pcall` plus a retry policy and a stated failure policy ([references/patterns/data.md](references/patterns/data.md#failure-policy-what-happens-after-the-last-retry)).
- **Reuse before writing, and keep it dense** — search the project, the standard library, then the engine API. Brevity never reduces what gets delivered and never costs readability.
- **Stay framework-agnostic:** bind by tags and attributes, discover by service, assume no folder layout.

**Complete set** — `const` bindings, `CollectionService` binding, circular requires, one responsibility per module, the full deprecation list, and the commonly-misremembered-API table: [references/style-rules.md](references/style-rules.md).

## Non-Negotiable Runtime Rules

Card items 3-7 are the rules; network budgeting is the one the card leaves out. Full statements, the scope that keeps each from being over-applied, and the domain file behind each: [references/runtime-rules.md](references/runtime-rules.md).

They hold in every mode, level, and library. Before flagging a violation, check the scoped exceptions in [references/false-positives.md](references/false-positives.md) — each rule has shapes that only look like violations.

## Before and After a System

- **Before** any non-trivial system, settle the five preflight questions in order: which case, which ceilings, which server/client split and owner per fact, whether it already exists, and how it will be proven: [references/workflow.md](references/workflow.md#system-design-preflight). Movement, input, camera, animation timing, or simulation stepping resolve the Server Authority decision first, since it changes the answers.
- **After**, before calling any Luau work finished, run the finishing gate in [references/review-checklist.md](references/review-checklist.md). Read it at the end of the task, not the start.
