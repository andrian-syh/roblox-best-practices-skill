---
name: roblox-best-practices
description: Framework-agnostic Roblox/Luau coding standards. Use when writing, reviewing, or refactoring any Luau code (Script, LocalScript, ModuleScript) in a Roblox project, or when the user asks to keep best practices in mind as standing guidance — enforces the VARIABLES/FUNCTIONS/INITIALIZATION layout, naming, performance, memory, networking, and security rules regardless of framework, folder structure, or genre. Two modes: Default (apply these conventions as-is) and Adaptive (study the project's existing style first, confirm, then apply). Adapts to community libraries (ProfileStore, Packet, Trove, Knit, Fusion, ...) and honors supervision levels (!ask / !bal / !go). Not for non-Roblox Lua, Studio UI or asset questions that do not touch code, or game design discussion with no Luau to write or review.
---

# Roblox Game Development Best Practices

Framework-agnostic standards for writing clean, efficient, lightweight, and resource-frugal Luau code. These rules fit any architecture (single-script, module-based, Knit, actor-based, ECS, etc.) — they govern *how each script is written*, not how the project is structured.

**Goals, in priority order:** correct → secure (server-authoritative) → efficient (CPU/memory/network) → readable → consistent.

*Skill version 1.16.0. If behaviour here contradicts a newer release, the installed copy is stale — check [CHANGELOG.md](https://github.com/andrian-syh/roblox-best-practices-skill/blob/main/CHANGELOG.md).*

## Session Invariants (must survive compaction)

Long sessions get summarized, and a summary that drops these rules silently downgrades every file written afterwards. The card below is the irreducible core. Two standing obligations:

1. **Carry it forward verbatim.** Any summary, handoff, plan, or task note you produce reproduces this card as-is. It is active instruction, not background context — never compress it into "follow the Roblox skill".
2. **Re-read before acting when it is gone.** Before writing or reviewing any Luau, if the card's full text is not visible in your current context, re-read this file first. Never reconstruct these rules from memory; a half-remembered layout or doc-comment rule is worse than none, because it looks deliberate.

```text
ROBLOX LUAU SKILL - INVARIANT CARD
1  Three sections, this order:
   -- // VARIABLES // --   Services > Modules > Objects > Configuration > State Management
   -- // FUNCTIONS // --   definitions only (ModuleScript: Private before Public)
   -- // INITIALIZATION // --   everything that runs
2  Documentation Comments (Luau Comments) - default style, adapts to the project.
   Default block: --[[ ]] above the function, desc > @param > @return.
   Moonwave --[=[ ]=] or --- is equally correct when that is the project's style.
   - Desc <= 250 chars, contract-level, states PURPOSE.
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
   - IN-BODY COMMENTS: allowed. Same two tests apply - agnostic and
     non-volatile. Never delete an existing one.
   - Existing project comment style wins. Recommend this style when the user
     asks to restyle; never impose it.
3  Server is authoritative. Validate every remote arg: type, range, ownership, rate.
4  Clean up everything created. Every connection has an owner and a teardown path.
5  No avoidable per-frame garbage. Never poll what has a signal.
6  UpdateAsync + backoff. Save on PlayerRemoving. Flush on BindToClose.
7  Re-validate after every yield: player gone? instance dead? session changed?
8  Never add --!strict unbidden. Never make a [Beta] feature the production default.
9  Reuse before writing: project, then stdlib, then engine API. No wrapper or
   abstraction without a caller. But brevity has two hard limits:
   - It NEVER reduces what was asked for. Short because it does less = failed.
   - It NEVER costs readability. One statement per line, descriptive names,
     blank lines kept. Less code means less WORK, not less whitespace.
10 User authority outranks this skill. Recommend; never refactor unasked.
```

Everything below expands these; nothing below overrides them.

## Reference Routing

**Load only what the situation needs.** Each reference is self-contained; read one, not the set. Everything below stays unloaded until a row matches the task at hand.

**Authoring**

| Situation | Read |
|---|---|
| Writing a new Script/LocalScript/ModuleScript | [references/templates.md](references/templates.md) |
| Section layout detail, what belongs in each subsection, Documentation Comment rules and rejected examples | [references/section-layout.md](references/section-layout.md) |
| Naming, deprecated-API list, `const`, typing opt-in, module hygiene — the full style set | [references/style-rules.md](references/style-rules.md) |
| Existing codebase with its own conventions (Adaptive mode) | [references/adaptive-mode.md](references/adaptive-mode.md) |
| Project uses community libraries (ProfileStore, Packet, Trove, Knit, Fusion, ...) | [references/community-libraries.md](references/community-libraries.md) |
| About to write a helper, a utility, or anything that might already exist; keeping code dense | [references/minimal-code.md](references/minimal-code.md) |
| Finishing a function: what nil, empty, stale, duplicate, reused, or departed state will it meet | [references/edge-cases.md](references/edge-cases.md) |
| Typing depth, standard-library additions (vector/buffer/math), new type solver, task.spawn vs task.defer, deferred events, error handling, time APIs, native codegen | [references/luau-language.md](references/luau-language.md) |

**Implementing a known system** (read the one file whose domain matches; recipes give assembly order and case-specific failure modes)

| Building | Read |
|---|---|
| Player data, currency, inventory, trading | [references/cases/data-economy.md](references/cases/data-economy.md) |
| Developer Products, passes/subscriptions, gacha/loot boxes | [references/cases/monetization.md](references/cases/monetization.md) |
| Leaderboards, daily rewards, streaks, offline progress | [references/cases/progression.md](references/cases/progression.md) |
| Damage/hit validation, abilities and cooldowns, projectiles, NPC/mob AI | [references/cases/combat.md](references/cases/combat.md) |
| Round/match lifecycle, matchmaking and reserved servers, cross-server events | [references/cases/session-flow.md](references/cases/session-flow.md) |
| Interactables and prompts, placement/building, pets and followers | [references/cases/world-interaction.md](references/cases/world-interaction.md) |
| HUD/state sync, rate limiting and anti-cheat, analytics instrumentation | [references/cases/client-infra.md](references/cases/client-infra.md) |

**Deepening a concern**

| Situation | Read |
|---|---|
| Hot loops, memory, network traffic, physics queries and contact detection, rendering, profiling | [references/performance.md](references/performance.md) |
| Frame budget in milliseconds, low-end/"potato" devices, quality degradation, time-slicing bulk work, per-player bandwidth | [references/device-performance.md](references/device-performance.md) |
| State ownership, data stores (+ version history), failure policy after a failed retry, per-owner locks | [references/patterns/data.md](references/patterns/data.md) |
| Remotes, cross-server (MemoryStore, MessagingService, reserved servers), StreamingEnabled | [references/patterns/network.md](references/patterns/network.md) |
| Connection cleanup, character lifecycle (Humanoid vs CCL), object pooling | [references/patterns/lifecycle.md](references/patterns/lifecycle.md) |
| CollectionService binding and attributes, client input, anti-patterns to reject on sight | [references/patterns/world.md](references/patterns/world.md) |
| Anti-exploit, remote validation depth, movement sanity checks, text filtering | [references/security.md](references/security.md) |
| Developer Products and passes, `ProcessReceipt`, PolicyService compliance | [references/monetization-policy.md](references/monetization-policy.md) |
| Anything touching movement, physics, input, camera, animation timing, `BindToSimulation`, or network ownership | [references/server-authority.md](references/server-authority.md) |
| UI construction, cross-platform and accessibility, input device handling | [references/ui-crossplatform.md](references/ui-crossplatform.md) |
| Genre is known (simulator, FPS, obby, RPG, racing, horror, social, tower defense, battlegrounds) | [references/genres.md](references/genres.md) |

**Lookup files** — these are tables, not narratives. Grep them for the row you need instead of reading them whole:

```bash
grep -i "datastore" references/limits-budgets.md      # a ceiling or quota
grep -i "obby"      references/genres.md              # one genre's rules
grep -i "yield"     references/edge-cases.md          # one failure state
```

**Checking yourself**

| Situation | Read |
|---|---|
| Proving a change works — playtest workflow, multi-client sessions, test injection, testable architecture, error telemetry, the command-bar VM pitfall | [references/verification.md](references/verification.md) |
| Working through a Roblox Studio MCP connection — which tool to use, what is irreversible, and how not to burn tokens | [references/studio-mcp.md](references/studio-mcp.md) |
| Reviewing code — deciding whether a finding is real and how severe, and what NOT to flag | [references/false-positives.md](references/false-positives.md) |
| **Finishing any task** — the completion gate before calling work done | [references/review-checklist.md](references/review-checklist.md) |
| Whether a newer engine/Luau API is confirmed available before relying on it or flagging it as missing | [references/api-currency.md](references/api-currency.md) |
| Designing against a platform ceiling (DataStore size/requests, MemoryStore, messaging, attributes, animation tracks) | [references/limits-budgets.md](references/limits-budgets.md) |

## User Authority

This skill is guidance, not a mandate — **full control always stays with the user**:

- The user's explicit instructions override any convention in this skill. If an instruction conflicts with a Non-Negotiable Runtime Rule, state the risk once, briefly, then follow the user's decision.
- Never take actions the user didn't ask for on the strength of this skill alone: no unrequested refactors, restructuring, file creation, or "while I'm here" cleanups. Recommend; don't act.

### Advisory invocation (no specific task)

Users may invoke this skill purely as a standing reminder — "use best practices", "ikuti skill ini mulai sekarang" — without a concrete coding task. In that case:

- **Do not** start codebase analysis or ask the mode/library setup questions yet. Briefly acknowledge that the standards are now active, and stop.
- Hold these rules as active guidance for all subsequent Luau work in the session.
- Resolve Mode Selection and the community-library check **lazily** — at the first actual coding/review task, and only the parts that task needs.

## Session Setup (decide once, then cache)

Four decisions govern every later task. Resolve each **once**, cache the answer for the session, and never re-ask per file. Resolve them **lazily** — at the first task that actually depends on one, not upfront.

| Decision | How to resolve | Default when unresolved | Detail |
|---|---|---|---|
| **Supervision level** | Inline token (`!ask`/`!bal`/`!go`) > session declaration in any words ("awasi penuh", "jangan banyak tanya") > default | **Balanced** — never ask which level the user wants; absence *is* the answer | table below |
| **Default vs Adaptive mode** | Obey an explicit statement; otherwise ask once if an existing codebase has visible conventions | **Default** for new files; for edits, match the file being edited and note the assumption | [references/adaptive-mode.md](references/adaptive-mode.md) |
| **Community libraries** | Ask once, or detect from `require()`s and `wally.toml` | **None** — use the built-in patterns | [references/community-libraries.md](references/community-libraries.md) |
| **Server Authority** | Read `Workspace.AuthorityMode`, or scan for `AuthorityMode`/`BindToSimulation`; ask once at the first task touching movement, physics, input, camera, animation timing, network ownership, or hit registration | **OFF** — most places are not server-authoritative, and assuming otherwise produces confidently wrong code | [references/server-authority.md](references/server-authority.md) |

**The two modes:** *Default* applies this skill's conventions as written. *Adaptive* studies the project's existing structure, proposes an adapted convention, and waits for confirmation before writing. Only stylistic and structural conventions adapt — the Non-Negotiable Runtime Rules and the safety items hold in full through either.

**Community libraries win for the concern they own.** Where one is in use, its idioms replace the overlapping built-in pattern; the non-negotiables still hold through them.

**Never migrate a project to Server Authority on this skill's initiative** — recommend, explain the cost, let the user decide.

### Supervision levels

| Level | Token | Behavior |
|---|---|---|
| **Supervised** | `!ask` | Confirm before every meaningful decision: convention choices, the file list, any deviation from this skill, and before writing code. |
| **Balanced** (default) | `!bal` | Ask only on real ambiguity, a conflict with a Non-Negotiable Runtime Rule, or a wide-impact/destructive change. Otherwise proceed. |
| **Autonomous** | `!go` | Don't ask; make sensible best-practice decisions and record every assumption in the final summary. Stop only for destructive or irreversible actions. |

The level modifies each decision above, and User Authority outranks the level itself:

| Confirmation point | Supervised | Balanced | Autonomous |
|---|---|---|---|
| Mode question | Always ask | Ask once if a codebase exists | Infer; report the assumption |
| Adaptive convention (Step 2) | Wait for approval | Wait for approval | Present as a report; proceed |
| Community-library check | Ask | Ask once / detect | Detect via `require()`s |
| Server Authority check | Always ask | Ask once, at the first SA-adjacent task | Detect; assume OFF if inconclusive and record it |
| Conflict with a non-negotiable | Ask | Ask | Warn in summary; choose the safe option |
| Review mode: stylistic restructuring | Propose, wait | Propose, wait | Still propose only (User Authority — unchanged) |

### Review/refactor mode

When reviewing rather than writing, give every finding exactly one severity — **Blocker** (security, data loss, guaranteed leak), **Correctness** (a real bug with a concrete failure scenario), or **Advisory** (style, layout, micro-optimization) — and run it through the confidence gate before reporting anything: trace both sides of paired logic, assume the odd shape may be intentional, demand a concrete failure scenario, verify the API against the target environment.

Advisory items are **proposed, never forced**, and unrelated code is never reformatted. The full "what NOT to flag" catalog, the taxonomy, and the gate: [references/false-positives.md](references/false-positives.md).

## Environment & Scale

- **Detect the project environment first.** Three exist: **Studio-native** (work through Studio/MCP tools; paths are Instance paths), **Rojo/filesystem** (work through files; requires may use path aliases and `src/` maps to services), and **Studio Script Sync** (scripts edited as files in an external editor with bidirectional sync to Studio — file-based authoring, but the DataModel remains the source of truth and there is no Rojo project file). Match how you read, write, and reference scripts accordingly. When the connection is an MCP one, the tool-safety and token rules in [references/studio-mcp.md](references/studio-mcp.md) apply before any write.
- **Verify newer APIs before use** — check they exist in the target environment rather than assuming; fall back to the stable equivalent if absent. **The official docs (create.roblox.com — Engine API Reference) are the primary authority**; the API dump/ReflectionService or a quick in-Studio test settle what the docs haven't caught up to. Roblox ships new APIs continuously — absence from your training knowledge is not evidence an API doesn't exist. A dated baseline of what is already confirmed, so you don't re-verify settled APIs: [references/api-currency.md](references/api-currency.md).
- **Maturity tags.** This skill marks features **[GA]** (safe as a default), **[Beta]** (opt-in, may change), **[Verify]** (confirm in the target place), or **[UNVERIFIED]** (this skill could not confirm it). **Never make a [Beta] feature the default in production code** — present it as an option, state its status, and keep the stable path as the recommendation unless the user chooses otherwise.
- **Scale the ceremony to the script.** Tiny scripts (< ~40 lines) may use just the three top-level headers with no subsections; only add level-2+ headers when a section has enough content to need them. Never emit empty placeholder headers. **Pure data/type modules** (config tables, item catalogs, shared type definitions — no runtime logic) are exempt from the three-section layout entirely; group their contents however reads best.

## Script Section Layout (MANDATORY)

Three top-level sections, always in this order, in every script:

```lua
-- // VARIABLES // --      Services > Modules > Objects > Configuration > State Management
-- // FUNCTIONS // --      definitions only (ModuleScript: Private before Public)
-- // INITIALIZATION // -- everything that runs
```

Nesting, deeper levels only when a section genuinely needs subdividing:

```lua
-- // Level 1 // --    the three sections above
-- | Level 2 | --      standard subsections (Services, Modules, ...)
-- [ Level 3 ] --      grouping within a subsection
-- { Level 4 } --      rare
-- / Level 5 / --      last resort
```

- **Module requires** are ordered by source: ServerScriptService → ServerStorage → ReplicatedStorage → Workspace → script-relative, counting only locations the script can legally reach.
- **Every function gets a Documentation Comment**: `--[[ ]]` above it (Moonwave `--[=[ ]=]`/`---` where that is the project's style), ordered description → `@param` → `@return`, description ≤ 250 characters, implementation-agnostic and free of volatile content. Tags use Moonwave syntax `@param <name> <type> -- <description>`.

**Full specification** — what belongs in each subsection, the header examples, the two description rules with worked rejections, in-line note guidance: [references/section-layout.md](references/section-layout.md). Annotated templates: [references/templates.md](references/templates.md).

## Language & Style Rules

The ones that apply on nearly every task:

- **Naming:** `PascalCase` services and module tables · `camelCase` locals, functions, Instance references · `UPPER_SNAKE_CASE` Configuration constants. Module publics `PascalCase`, privates `camelCase`.
- Always `game:GetService()`; never direct indexing (the `workspace` global is fine).
- **Never use deprecated APIs** — `wait`/`spawn`/`delay`, `tick`, lowercase `:connect`/`:wait`, `Body*` movers, `Humanoid:LoadAnimation`, `SetPrimaryPartCFrame`, and the rest of the list in [references/style-rules.md](references/style-rules.md). Discouraged-but-functional APIs are **not** deprecated ones.
- **Type safety is opt-in.** Never add or raise `--!strict` unbidden; match what the file or project already declares.
- Guard external and yielding calls (`DataStore`, `MarketplaceService`, `HttpService`, `TeleportService`) with `pcall` plus a retry policy and a stated failure policy ([references/patterns.md](references/patterns/data.md#failure-policy-what-happens-after-the-last-retry)).
- **Reuse before writing, and keep it dense** — search the project, the standard library, then the engine API. Brevity never reduces what gets delivered and never costs readability.
- **Stay framework-agnostic by construction:** bind by tags and attributes, discover by service, assume no folder layout.

**Complete set** — `const` bindings, `CollectionService` binding, circular requires, one responsibility per module, the full deprecation list: [references/style-rules.md](references/style-rules.md).

## Non-Negotiable Runtime Rules

1. **Server is authoritative.** Never trust the client: validate every RemoteEvent/RemoteFunction argument on the server (type, range, ownership, rate). Client only renders and requests.
2. **Clean up everything you create.** Store connections and disconnect them (or `Destroy()` the owning Instance — destroying disconnects its connections). Any `PlayerAdded` setup must have a `PlayerRemoving` teardown.
3. **No avoidable per-frame garbage.** Don't allocate tables/closures/strings inside `RunService` loops when they can be hoisted; hoist them. Judge by the hot path's actual frequency — a closure in a once-per-round callback is fine; only flag allocations that recur per frame/per entity. Use `RunService.Heartbeat` for gameplay, `PreRender`/`RenderStepped` only for camera/visual work on the client.
4. **Never poll for state — react.** Use events, `:GetPropertyChangedSignal()`, attribute-changed signals, or tag signals instead of `while task.wait() do` checks on a condition that has a signal. Genuinely *periodic* work (autosave interval, throttled AI scans, round timers) is legitimate on a timed loop — that's scheduling, not polling.
5. **Save data safely.** `UpdateAsync` over `SetAsync`, exponential-backoff retry, save on `PlayerRemoving`, and flush in `game:BindToClose()` and `game.ServerRestartScheduled`.
6. **Budget the network.** Batch remote traffic; use `UnreliableRemoteEvent` for high-frequency, loss-tolerant data (VFX, positions); for large or frequently-updated state send deltas, not whole states (a small, infrequent snapshot is fine as-is).
7. **Re-validate after every yield.** Wherever a yield (`task.wait`, a `pcall`ed async call, `WaitForChild`) separates a check from its use, re-check after resuming: the player may have left (`player.Parent` is nil), the instance may be destroyed, the round/session may have changed. Capture values you need *before* the yield; verify liveness *after* it. Scoped: straight-line non-yielding handlers need nothing — this rule triggers only when a yield sits between validation and action.

Details, patterns, and numbers: [references/performance.md](references/performance.md) (CPU, memory, network, instances) and [references/patterns.md](references/patterns.md) (data stores, remotes, cleanup, pooling). Before flagging a violation of any of these in review, check the scoped exceptions in [references/false-positives.md](references/false-positives.md) — each rule has shapes that only look like violations.

## System Design Preflight

Before implementing any non-trivial system (not needed for a one-off script or a small edit), settle these five in order. Each has a home; none requires guesswork:

1. **Which case is this?** Match it to a recipe in the Implementing-a-known-system routing block and read that one file. If nothing matches, proceed with the general rules.
2. **What are the ceilings?** Check [references/limits-budgets.md](references/limits-budgets.md) for the limits this design will approach (payload size, request budget, attribute window, entity counts). Designing into a ceiling is far cheaper than discovering it in production.
3. **What is the server/client split, and who owns each fact?** Name what the server owns authoritatively and what the client merely renders or requests, before writing either side. Every piece of state gets exactly one writing owner; all other copies are views updated after the fact ([references/patterns.md](references/patterns/data.md#one-owner-per-fact)).
4. **Does this already exist?** Check in order: the project's own modules, the Luau standard library, the engine API, then an installed library — whose idioms replace the built-in pattern if the project uses ProfileStore, Packet, Trove, Knit, Fusion, or similar ([references/minimal-code.md](references/minimal-code.md), [references/community-libraries.md](references/community-libraries.md)).
5. **How will this be proven to work?** Pick the observable outcome and the session type (multi-client for anything touching replication) up front ([references/verification.md](references/verification.md)).

If the system touches movement, input, camera, animation timing, or simulation stepping, resolve the Server Authority check first — it changes the answers to steps 3 and 5.

## Review Checklist

Before calling any Luau work finished, run the checklist in [references/review-checklist.md](references/review-checklist.md). It covers supervision, mode, layout, comments, cleanup, hot loops, ownership, failure policy, locks, edge cases, validation, and delivery completeness.

It is a **finishing gate**: read it at the end of the task, not at the start.
