# Changelog

All notable changes to the roblox-best-practices skill are documented here. The format loosely follows [Keep a Changelog](https://keepachangelog.com); the skill version tracks `package.json`.

## [1.10.6] - 2026-07-29

**Compaction-durable invariants, stricter comment discipline, and the late-July Luau refresh.** Makes the skill's core rules survive a summarized session, tightens what a description is allowed to say, and brings the language baseline up to Luau 0.731 / engine 731.

### Added
- **Session Invariants card** in SKILL.md — a compact, verbatim-quotable block holding the section layout, the UDD rules, the seven runtime non-negotiables, and user authority. Carries two standing obligations: reproduce it verbatim in any summary or handoff, and re-read SKILL.md before writing Luau whenever the card is not visible in context. Long sessions get compacted, and a summary that silently drops these rules downgrades every file written afterwards.
- **`const` bindings** [GA in Studio, April 2026] — contextual keyword valid wherever `local` is; freezes the binding, not the value. Documented with the `table.freeze` distinction, where to use it (Services, Modules, Configuration) and where not (State Management, and existing files without being asked).
- **`export` value semantics** [Verify] — upstream Luau 0.723; exported values are `const` by default. Studio availability explicitly unconfirmed.
- **Read-only table members** `{ read x: T }` / `{ read [K]: V }` and the `write` mirror [Verify] — upstream 0.721.
- **Yielding inside custom iterators** [Verify] — upstream 0.722, with the Non-Negotiable #7 consequence spelled out.
- **`declare extern type`** [Verify] — replaces `declare class` / `extern class`, removed upstream in 0.727.
- **Attributes section** in `luau-language.md` — `@native` (not recursive into nested functions) and `@deprecated` (`use`, `reason`), with the standing fact that attributes are not user-definable.
- **Upstream-vs-Studio state model** in `api-currency.md` — a three-state promotion path (RFC merged → upstream released → live in Studio) with a Studio column on every Luau row, plus maintenance instructions to track the Luau release number and the engine release number separately.
- Doc-comment review guardrails in `false-positives.md`: a factually wrong description is Correctness, everything else about comments is Advisory, and comments are never deleted to satisfy a length cap.

### Changed
- **UDD rules restructured into three explicit tests.** The description must be *implementation-agnostic* (names no API, algorithm, collaborator, or internal data structure) and *free of volatile content* (no numbers, thresholds, Configuration constant names, or renameable feature names), with a one-line check: if retuning a constant or rewriting the body would require editing the comment, the comment is wrong. Added a rejected-descriptions table showing four distinct failure modes for the same function.
- **In-body comments are now capped at 75 characters and 25 words**, must explain why rather than what, and are never allowed to grow into paragraphs or line-by-line narration.
- Review Checklist split the single doc-comment item into three: block/format, the two description tests, and the in-body cap.
- `api-currency.md` snapshot moved to 29 July 2026; sources now name the Luau RFC repository and the engine release-notes number.
- Language & Style Rules gained the `const` entry and now reference the volatile-content and in-body length rules.

### Fixed
- **Current engine release-notes version is 731 (24 July 2026)**, replacing the `[UNVERIFIED]` row that told the agent no version number could be cited. The docs pages render client-side; the DevForum Release Notes category is the readable source.
- Two doc comments in the skill's own examples violated the rules they illustrate: the rate-limiter in `security-monetization.md` and the tag-binding example in `patterns.md` used single-line `--` comments instead of `--[[ ]]` blocks, and both described the mechanism (one naming a parameter, one naming a tag literal) rather than the contract. Both rewritten at contract level.
- Four code-block comments in `SKILL.md`, `templates.md`, and `false-positives.md` exceeded the new 75-character cap and were shortened, so the skill no longer visibly contradicts its own rule — agents pattern-match on examples more reliably than on prose.
- New Luau features added to the "do not flag as nonexistent" catalog (`const`, `read`/`write` members, yielding iterators, `declare extern type`, `@deprecated`), plus an explicit carve-out that a project using `local` throughout is correct and must never be pushed to adopt `const`.
- 64-bit integers, `math` constants, and `class` syntax are now recorded as **RFC merged only** with no confirmed implementation, closing the gap where an accepted design could be mistaken for a shipped API.

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
