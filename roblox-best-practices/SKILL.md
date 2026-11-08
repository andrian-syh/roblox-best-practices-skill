---
name: roblox-best-practices
argument-hint: "[ask|bal|go]"
description: "Roblox and Luau game code standards. Writes, reviews, and fixes Script, LocalScript, and ModuleScript code and game systems such as shops, DataStore saves, RemoteEvents, combat, NPCs, and UI. Use when a request involves Luau code or a Roblox Studio project, even when Roblox is never named, when a game bug is reported with no file named, and when the user asks to keep these standards active. Also covers Rojo, Argon, Azul, Script Sync, Studio MCP and Open Cloud through it, community libraries such as ProfileStore, Knit, Trove, and Fusion, and taking a Roblox game public: store listing, discovery, age tiers, ads, and live ops. Applies to requests written in any language. Not for plain Lua outside Roblox (Neovim, LOVE, Defold, other engines) or for game design with no Luau to write or review."
license: MIT
metadata:
  version: "2.5.0"
---

# Roblox Game Development Best Practices

Framework-agnostic standards for clean, resource-frugal Luau. They govern *how each script is written*, not how the project is structured.

**Goals, in priority order:** correct, secure (server-authoritative), efficient (CPU, memory, network), readable, consistent.

*Skill version 2.5.0. If this contradicts a newer release, the installed copy is stale; see [CHANGELOG.md](https://github.com/andrian-syh/roblox-best-practices-skill/blob/main/CHANGELOG.md).*


## Session Invariants (must survive compaction)

A summary that drops these rules silently downgrades every file written afterwards. Two standing obligations:

1. **Carry it forward verbatim** in any summary, handoff, plan, or task note. It is active instruction, never compressed into "follow the Roblox skill".
2. **Re-read this file before acting** whenever the card's full text is not visible in your context. Never reconstruct these rules from memory: a half-remembered layout rule looks deliberate and is worse than none.

```text
ROBLOX LUAU SKILL - INVARIANT CARD
1  Three sections, this order:
   -- // VARIABLES // --   Services > Modules > Objects > Configuration > State Management
   -- // FUNCTIONS // --   definitions only (ModuleScript: Private before Public)
   -- // INITIALIZATION // --   everything that runs
   Omit a section that would be empty. Never write a placeholder header.
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
   - English preferred. No em dashes or double-hyphen dashes as punctuation
     (the -- in a tag is a separator, not punctuation). No emoji.
   - IN-BODY COMMENTS: banned in code you write. Make names and structure say
     it; put the why in the block above. Never delete an existing one;
     propose removal once, Advisory only.
   - Tool directives (--!strict, -- selene:, -- stylua:, any linter's allow
     comment) are not commentary. Never remove one. Never add a suppression
     unasked: fix the code, or report the finding and let the user decide.
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
9  Reuse before writing: project, then stdlib, then engine API. No wrapper or
   abstraction without a caller. But brevity has two hard limits:
   - It NEVER reduces what was asked for. Short because it does less = failed.
   - It NEVER costs readability. One statement per line, descriptive names,
     blank lines kept. Less code means less WORK, not less whitespace.
10 No deprecated APIs: wait, spawn, delay, tick, lowercase :connect,
   Humanoid:LoadAnimation, SetPrimaryPartCFrame, Body* movers.
11 Facts are cited, not remembered, the engine's and the project's alike.
   Confirm a newer API against the version dump or an in-Studio probe.
   Never describe what a file contains without opening it: a confident
   guess about code reads exactly like knowledge and is not.
12 User authority outranks these rules. Recommend; never refactor unasked.
```

Everything below expands these; nothing below overrides them.

## Reference Routing

**Load only what the task needs.** Each reference is self-contained; read the one whose line matches, not the set.

**Authoring**

- [templates.md](references/templates.md): writing a new Script, LocalScript, or ModuleScript
- [section-layout.md](references/section-layout.md): layout detail, subsection contents, Documentation Comment rules, rejected examples
- [style-rules.md](references/style-rules.md): naming, the full deprecated and misremembered API lists, `const`, typing opt-in, module hygiene
- [adaptive-mode.md](references/adaptive-mode.md): an existing codebase with its own conventions
- [community-libraries.md](references/community-libraries.md): ProfileStore, Packet, Trove, Knit, Fusion, and others
- [minimal-code.md](references/minimal-code.md): about to write a helper that may already exist; keeping code dense
- [edge-cases.md](references/edge-cases.md): nil, empty, stale, duplicate, reused, or departed state a function will meet
- [luau-language.md](references/luau-language.md): coercion, table copies, `require`, typing depth, `vector`, `buffer`, `math`, `task.spawn` vs `task.defer`, deferred events, error handling, time APIs, native codegen

**Implementing a known system.** Read the one file whose domain matches; each gives assembly order and case-specific failure modes.

- [cases/data-economy.md](references/cases/data-economy.md): player data, currency, inventory, trading
- [cases/monetization.md](references/cases/monetization.md): Developer Products, passes, subscriptions, paid random items
- [cases/progression.md](references/cases/progression.md): leaderboards, daily rewards, streaks, offline progress
- [cases/combat.md](references/cases/combat.md): hit validation, abilities and cooldowns, projectiles, NPC AI
- [cases/session-flow.md](references/cases/session-flow.md): rounds and matches, matchmaking and reserved servers, cross-server events
- [cases/world-interaction.md](references/cases/world-interaction.md): interactables and prompts, placement and building, pets and followers
- [cases/client-infra.md](references/cases/client-infra.md): HUD and state sync, rate limiting and anti-cheat, analytics instrumentation

**Deepening a concern**

- [performance.md](references/performance.md): hot loops, memory, network traffic, physics queries, rendering, profiling
- [device-performance.md](references/device-performance.md): frame budget in ms, low-end devices, quality degradation, time-slicing, per-player bandwidth
- [patterns/data.md](references/patterns/data.md): state ownership, data stores and version history, failure policy after the last retry, per-owner locks
- [patterns/network.md](references/patterns/network.md): remotes, cross-server (MemoryStore, MessagingService, reserved servers), StreamingEnabled
- [patterns/lifecycle.md](references/patterns/lifecycle.md): connection cleanup, character lifecycle (Humanoid vs CCL), object pooling
- [patterns/world.md](references/patterns/world.md): CollectionService binding and attributes, client input, anti-patterns to reject on sight
- [security.md](references/security.md): anti-exploit, remote validation depth, movement sanity checks, text filtering
- [monetization-policy.md](references/monetization-policy.md): `ProcessReceipt`, Developer Products and passes, regional prices in trades, PolicyService, paid random items and odds, ads, the in-experience link ban
- [growth-apis.md](references/growth-apis.md): AnalyticsService funnels, journeys, and events, player segments, experiments, experience notifications, referrals
- [server-authority.md](references/server-authority.md): movement, physics, input, camera, animation timing, `BindToSimulation`, network ownership
- [ui-crossplatform.md](references/ui-crossplatform.md): UI construction, cross-platform and accessibility, input devices
- [genres.md](references/genres.md): simulator, FPS, obby, RPG, racing, horror, social, tower defense, battlegrounds

**Process**

- [workflow.md](references/workflow.md): session-setup decisions, supervision behavior, opening a review, the preflight before a non-trivial system
- [verification.md](references/verification.md): proving a change works: playtests, multi-client sessions, test injection, telemetry, the command-bar VM pitfall
- [studio-mcp.md](references/studio-mcp.md): a Studio MCP connection: which tool, what is irreversible, how not to burn tokens
- [open-cloud.md](references/open-cloud.md): `open_cloud_invoke` and MCP Permissions: classifying each call, scopes, data stores, publishing, prices, bans, rollback
- [external-editors.md](references/external-editors.md): the project is edited outside Studio: Script Sync, Rojo, Argon, Azul, and the toolchain around them
- [team-workflow.md](references/team-workflow.md): git beside a place file, branch places, tree ownership, the review gate, shipping
- [diagnosis.md](references/diagnosis.md): a reported symptom with no file named yet: narrowing, reproducing, and confirming the cause before any fix
- [false-positives.md](references/false-positives.md): reviewing code: whether a finding is real, how severe, what not to flag
- [review-checklist.md](references/review-checklist.md): **finishing any task**, the completion gate before calling work done
- [evaluation-matrix.md](references/evaluation-matrix.md): auditing a project on request: scope, evidence, a 1 to 5 score per dimension, and an honest report
- [release-readiness.md](references/release-readiness.md): shipping a place: the pre-publish gate
- [publishing.md](references/publishing.md): no Luau to write: discovery, the store listing, icons and thumbnails, maturity and age tiers, marketing the platform forbids, the launch checklist
- [live-ops.md](references/live-ops.md): the game is live: reading analytics, retention targets, falling impressions, Ads Manager and search ads, events and notifications, the first 90 days
- [api-currency.md](references/api-currency.md): whether a newer engine or Luau API is confirmed before relying on it or calling it missing
- [limits-budgets.md](references/limits-budgets.md): platform ceilings for DataStore, MemoryStore, messaging, attributes, animation tracks

`limits-budgets.md`, `genres.md`, and `edge-cases.md` are lookup tables. Grep the row you need.

## User Authority

This skill is guidance, not a mandate. **Full control stays with the user.**

- The user's explicit instructions override any convention here. If an instruction conflicts with a runtime rule, state the risk once, briefly, then follow the user's decision.
- No unrequested refactors, restructuring, new files, or "while I'm here" cleanups. Recommend; don't act.
- **Language:** reply in the language the user writes in. Code, identifiers, and Documentation Comments follow the language the project already uses, and English when there is no precedent (card item 2). A request in any language gets the full skill; no rule here depends on the language of the request.
- Invoked with no task ("use best practices", "follow this skill from now on"): acknowledge that the standards are active and stop. No codebase analysis, no setup questions ([workflow.md](references/workflow.md#advisory-invocation-no-specific-task)).

## Session Setup (decide once, then cache)

Five decisions govern every later task. Resolve each **once**, at the first task that needs it, cache it, and never re-ask per file. How to resolve each, and how the supervision level modifies it: [workflow.md](references/workflow.md#session-setup-resolving-the-five-decisions).

| Decision | Default when unresolved |
|---|---|
| **Supervision level**: `!ask`/`!bal`/`!go` inline, or the invocation argument `ask`/`bal`/`go` | **Balanced**; never ask which level the user wants, absence *is* the answer |
| **Default vs Adaptive mode** | **Default** for new files; for edits, match the file being edited and note the assumption |
| **Community libraries** | **None**: use the built-in patterns |
| **Server Authority** | **OFF**: most places are not server-authoritative, and assuming otherwise produces confidently wrong code |
| **Environment facts**: `SignalBehavior`, `StreamingEnabled`, rig type, strictness header | Assume none of them; each inverts correct guidance between values |

*Default* applies these conventions as written; *Adaptive* proposes an adaptation of the project's own style and waits for confirmation ([adaptive-mode.md](references/adaptive-mode.md)). Only style and structure adapt, and a community library wins for the concern it owns. **Never migrate a project to Server Authority on this skill's initiative**: it changes how movement, physics, and input work across the whole place.

### Review/refactor mode

One severity per finding (**Blocker / Correctness / Advisory**), after the confidence gate; Advisory is proposed, never forced, and unrelated code is never reformatted. Gate and calibration: [workflow.md](references/workflow.md#reviewrefactor-mode). What not to flag: [false-positives.md](references/false-positives.md).

A reported symptom with no file named is diagnosed before anything is changed. Reaching for the first plausible file produces a change that looks like a fix and leaves the defect in place ([diagnosis.md](references/diagnosis.md)).

## Environment & Scale

- **Detect the project environment first**: Studio-native, or a filesystem project synced by Script Sync, Rojo, Argon, or Azul. **Which side is the source of truth differs per tool**, and assuming wrong overwrites the user's work ([external-editors.md](references/external-editors.md)). Never start, stop, or reconfigure a sync session unasked. On an MCP connection, [studio-mcp.md](references/studio-mcp.md) applies before any write, and [open-cloud.md](references/open-cloud.md) before any `open_cloud_invoke` call.
- **Two authorities for engine facts.** Whether a member exists: the versioned API dump or an in-Studio probe. What it does: the Engine API Reference. The docs site lags the engine, so a member missing from it is undocumented, not nonexistent. Cite the check, or say "unverified" and name the one that would settle it ([api-currency.md](references/api-currency.md#how-to-verify-the-toolbox)).
- **Maturity tags:** **[GA]** safe as a default, **[Beta]** opt-in and may change, **[Undocumented]** shipped with no reference page (probe its semantics), **[Verify]** confirm in the target place, **[UNVERIFIED]** unconfirmed by this skill. Offer a [Beta] feature with its status and recommend the stable path.
- **Scale the ceremony to the script.** Scripts under about 40 lines may use the three top-level headers alone. **Pure data and type modules** (config tables, item catalogs, shared types) are exempt from the three-section layout.

## Script Section Layout

Card items 1 and 2 hold the layout and comment rules. The card omits two things:

- **Module requires** are ordered by source: ServerScriptService, ServerStorage, ReplicatedStorage, Workspace, then script-relative, counting only locations the script can reach.
- **Function order inside FUNCTIONS** and the contents of each VARIABLES subsection are specified, not free.

Full specification, with the header hierarchy and worked rejections: [section-layout.md](references/section-layout.md). Annotated templates: [templates.md](references/templates.md).

## Language & Style Rules

Those that apply on nearly every task:

- **Naming:** `PascalCase` services and module tables, `camelCase` locals, functions, and Instance references, `UPPER_SNAKE_CASE` Configuration constants. Module publics `PascalCase`, privates `camelCase`.
- Always `game:GetService()`, never direct indexing (the `workspace` global is fine).
- Card item 10 lists the common deprecated APIs; the full list is in [style-rules.md](references/style-rules.md). Discouraged but working APIs (the `Instance.new` parent argument, `FireAllClients`) are not deprecated and are Advisory at most.
- Guard external and yielding calls (`DataStore`, `MarketplaceService`, `HttpService`, `TeleportService`) with `pcall`, a retry policy, and a stated failure policy ([patterns/data.md](references/patterns/data.md#failure-policy-what-happens-after-the-last-retry)).
- **Stay framework-agnostic:** bind by tags and attributes, discover by service, assume no folder layout.

## Runtime Rules

Card items 3 to 7 are the rules; network budgeting is the one the card leaves out. Full statements, the scope that keeps each from being over-applied, and the domain file behind each: [runtime-rules.md](references/runtime-rules.md). They hold in every mode, level, and library. Before flagging a violation, check the scoped exceptions in [false-positives.md](references/false-positives.md).

## Before and After a System

- **Before** any non-trivial system, settle the five preflight questions in order: which case, which ceilings, which server/client split and owner per fact, whether it already exists, and how it will be proven ([workflow.md](references/workflow.md#system-design-preflight)). Movement, input, camera, animation timing, or simulation stepping resolve the Server Authority decision first.
- **After**, before calling any Luau work finished, run [review-checklist.md](references/review-checklist.md). Read it at the end of the task, not the start.
