# Changelog

All notable changes to the roblox-best-practices skill are documented here. The format loosely follows [Keep a Changelog](https://keepachangelog.com); the skill version tracks `package.json`.

## [1.9.9] - 2026-07-25

**2026 engine refresh, case playbook, and MCP safety.** Brings the skill in line with the July 2026 Roblox engine and Luau state, adds implementation blueprints for common systems, and teaches the agent to operate a Studio MCP connection without destroying work or wasting tokens.

### Added
- **Case playbook** — `references/cases/` with 22 system blueprints across 7 domain files (data-economy, monetization, progression, combat, session-flow, world-interaction, client-infra). Each recipe gives recognition cues, assembly order, case-specific failure modes, budget, and verification, and delegates the general rules to the existing references rather than restating them.
- `references/server-authority.md` — Server Authority [GA, 9 July 2026] as a first-class architecture mode: the five settings `AuthorityMode = "Server"` forces, the predict-and-reconcile model, a with-SA vs without-SA comparison for input, simulation stepping, camera, anti-cheat, attributes and animation, known limitations, adoption trade-offs, and review discipline.
- `references/studio-mcp.md` — operating a Roblox Studio MCP connection. Built around capabilities rather than fixed tool names so it survives any MCP variant: ground-truth rules (the connected tool list always wins, never assert a tool does not exist), session-cached variant identification (official built-in, standalone Rust lineage, community forks), a decision tree for unfamiliar or missing tools that separates "older build" from "different server", a capability map carrying the safety and token rule for each operation, a four-step preflight before the first write, the irreversible-operation list (play-mode discard, wrong Studio instance, mistyped paths creating scripts, no-undo Luau execution, backdoored assets), the Edit-context VM trap, and token discipline.
- `references/limits-budgets.md` — platform ceilings in one place: DataStore size and request budgets, MemoryStore, messaging, attributes, animation tracks, Luau runtime, network payload, server compute.
- **Server Authority confirmation gate** in SKILL.md — SA is never assumed. A trigger list (movement, physics, input, camera, animation timing, `BindToSimulation`, network ownership, movement anti-cheat) requires detection or a one-time user confirmation, cached per session, defaulting to OFF.
- **System Design Preflight** — five ordered steps before implementing any non-trivial system: match the case, check ceilings, fix the server/client split, check for a library overlay, decide verification.
- **Maturity tags** ([GA] / [Beta] / [Verify] / [UNVERIFIED]) with a standing rule that a [Beta] feature is never made the default in production code.
- Character Controller Library [GA] as a documented choice alongside `Humanoid`, which is not deprecated.
- New verification levers: Studio CLI (`--task RunScript`, `--openScriptPath`) and `ScriptDebuggerService` [Beta].

### Changed
- Reference routing regrouped into four blocks (Authoring, Implementing a known system, Deepening a concern, Checking yourself) to keep on-demand loading precise as the reference set grows.
- Project environments expanded from two to three: Studio-native, Rojo/filesystem, and Studio Script Sync.
- `api-currency.md` rewritten to a July 2026 baseline with per-row maturity tags, and honest [UNVERIFIED] markers where confirmation was not possible.
- New type solver documented as [GA] and default for `nocheck`/`nonstrict`, opt-in for `strict`, configured via `UseNewLuauTypeSolver` and `LuauTypeCheckMode`.
- Luau standard-library section extended with 2026 compiler behavior (inlined immediately invoked lambdas, refinements preserved across loops) and an explicit list of Luau features that do **not** apply to Studio.

### Fixed
- **Attributes can hold Instance references** via `InstanceHandle` [Beta]; the previous blanket "no Instance references" was wrong. Documented with its handle semantics, streaming behavior, and the `GetAttributeChangedSignal` caveat.
- **`BindToSimulation` guidance is now conditional** rather than a blanket prohibition: forbidden for general gameplay without Server Authority, required for custom gameplay logic under it.
- Server Authority described as [GA] and off-by-default, replacing "opt-in and still evolving".
- DataStore limits updated for the unified in-game/Open Cloud request budget and raised storage, with the effective date marked.
- Added the InputContext/InputAction camera replication deprecation.
- New false-positive carve-outs so 2026 features are not flagged as nonexistent, a project is not flagged for declining Server Authority, and a quiet `--!nonstrict` file is not treated as a gap.

## [1.7.7] - 2026-07-22

**False-positive hardening and engine/Luau currency refresh.** Systematizes the anti-false-positive guidance so reviews stay objective, and refreshes the skill against the then-current engine and Luau feature set.

### Added
- `roblox-best-practices/references/false-positives.md` — the "what NOT to flag" catalog: the three-tier severity taxonomy (Blocker / Correctness / Advisory), the four-step confidence gate, category guardrails (hot-loop definition, not-a-leak list, not-a-trust-boundary list, complete-handler note, streaming, typing, deprecated-vs-discouraged), and a regression set of correct snippets that must review clean.
- `roblox-best-practices/references/api-currency.md` — a dated baseline of confirmed engine/Luau APIs (Luau Recap 2025, engine release notes through v728) so the verify-first rule stops re-litigating already-shipped APIs; also lists gated features (new type solver, require-by-string) and newly deprecated APIs.
- `patterns.md`: a centralized **Streaming (StreamingEnabled)** section (`ModelStreamingMode`, `RequestStreamAroundAsync`, tag signals) and **DataStore version history** guidance (`ListVersionsAsync`/`GetVersionAsync`/`ListKeysAsync`).
- `security-monetization.md`: an engine-level **Server Authority** section (Input Action System, attribute replication budget, `GetCameraState`).
- `performance.md`: deeper **Parallel Luau** guidance (`task.synchronize`/`desynchronize`, `SharedTable`).
- `luau-language.md`: a standard-library refresh (`vector` library, `math.map`/`lerp`/`isnan`/`isinf`/`isfinite`, `buffer.readbits`/`writebits`) and expanded user-defined type functions (`keyof`, `issubtypeof`, the `types` library).

### Changed
- **Type safety is now opt-in.** `--!strict` is no longer added on the skill's own initiative; it requires an explicit user request or an existing project convention to match.
- Doc-comment (UDD) rules tightened: one terse technical sentence (≤ ~100 characters), contract-level, English, no em dashes or emoji, and no line-count bloat.
- Review mode reframed around the Blocker/Correctness/Advisory severity vocabulary and the false-positives gate; missing doc comments on trivial private helpers are Advisory, not violations.
- Reference Routing table extended with `false-positives.md` and `api-currency.md`; streaming, Server Authority, and DataStore versioning surfaced in existing rows.

### Fixed
- `Instance.new(class, parent)` recategorized from "deprecated" to a discouraged performance choice (Advisory), correcting a mislabel that produced false findings.
- Added the `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` -> `GroupService:GetRolesInGroupAsync` deprecation.

## [1.5.1] and earlier

See the git history.
