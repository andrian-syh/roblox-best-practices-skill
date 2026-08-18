# Changelog

All notable changes to the roblox-best-practices skill are documented here. The format loosely follows [Keep a Changelog](https://keepachangelog.com); the skill version tracks `package.json`.

## [1.13.1] - 2026-08-18

**API currency refreshed to Luau 0.734 and engine 734.** A maintenance pass over `api-currency.md` plus the three references the new APIs touch.

### Changed
- **Snapshot moved from 29 July to 18 August 2026**: Luau releases through **0.734** (14 August), Roblox engine release notes through **734** (10 August).
- **No new Luau language features in 0.732–0.734.** The three releases carry type-solver fixes, `table.move` performance, `export` keyword optimizations, and cyclic-module infrastructure. One row added: `pcall`/`xpcall` are now allowed inside user-defined `type function` (0.734, **[Verify]**, new solver only). `class` syntax and the 64-bit integer type remain **RFC merged only** — re-confirmed, not assumed.
- **Eight engine rows added, all [Verify]** — released too recently for this skill to confirm in Studio: `Player.FrustumStreaming` + `FrustumStreamingMode`, `MemoryStoreService:GetDistributedCounter`, CollectionService tag signal methods, `WorldRoot` collision groups, `GuiService:GetUIScaleMultiplier`/`SetUIScaleMultiplier`, `ViewportCamera`/`Logger`, `UIShadow` properties, and the EditableMesh Unsafe→Safe promotions.
- `AdGui.OnAdEvent` added to the deprecated list (734).
- `patterns.md` → Cross-Server Communication: the distributed counter is named as the primitive for cross-server totals, with the read-modify-write race it avoids and the sorted-map fallback.
- `device-performance.md` → Engine levers: frustum streaming documented with its trade-off (content behind a fast-turning camera) and the low-end test it requires.
- `ui-ux-testing.md`: read the player's UI scale from `GuiService` rather than inferring it from viewport size.

## [1.13.0] - 2026-08-11

**Documentation Comments: official terminology, Moonwave tag syntax, and style flexibility restored.** The comment rules are re-grounded in what Roblox and the Luau ecosystem actually document, and they go back to adapting to the project instead of overriding it.

### Changed
- **"UDD" is gone; the terms are now Luau Comments and Documentation Comments.** The old label appeared in no Roblox or Luau source. The rules are now stated as this skill's default style layered on [Roblox's own comment guidance](https://create.roblox.com/docs/luau/comments) (block comment above the item, single-line notes in-line, explain why not what).
- **Comment style adapts to the project again.** It returns to the adaptable column in `adaptive-mode.md`, replacing "Comments never adapt" with "Comments follow the project". A project that documents with Moonwave keeps documenting with Moonwave. What does not adapt is the content discipline: implementation-agnostic and free of volatile content in any style. When the user asks which style to use or asks for a restyle, this skill's default is the recommendation, offered rather than imposed.
- **Moonwave tag syntax adopted:** `@param <name> <type> -- <description>` and `@return <type> -- <description>`, each repeatable, type omissible where the signature declares it. The previous `@param name description` form parsed incorrectly under Moonwave and luau-lsp. Every example across `templates.md`, `security-monetization.md`, and `device-performance.md` updated.
- **Block form: `--[[ ... ]]` stays the default, `--[=[ ... ]=]` and `---` are now equally correct** where they are the project's style — and are the forms tooling actually parses. Mixing two forms in one file remains wrong.
- **Description limit raised from 100 to 250 characters**, and the one-sentence requirement dropped. The limit is a ceiling, not a target.
- Em dashes, double-hyphen dashes used as punctuation, and emoji remain out; the `--` separator inside a Moonwave tag is explicitly exempt as a separator, not punctuation. English moves from "only" to "preferred as the universal language".
- **Both description rules now bind in-line notes too**, with a new escape valve: where a detail cannot be stated agnostically, state it at the most general level that stays true after the body changes.
- Review severities in `false-positives.md` updated — a house comment style in any block form is not a finding, and neither is the presence of an in-line note.

### Removed
- **The in-body comment prohibition.** In-line notes are allowed again, subject to the same two content rules and to explaining *why* rather than restating the code, matching Roblox's own recommendation of `--` for in-line remarks. The `≤ 75 characters` cap and the "narrow exception" framing are gone; "never delete an existing comment" stays.
- **The two-permitted-outcomes rule** (a compliant block or nothing) and the "outranks Adaptive mode" precedence, both superseded by style flexibility.

## [1.12.2] - 2026-07-29

**Code economy, device scalability, edge-case robustness, and non-negotiable comment rules.** Teaches the agent to write less code without writing less software, to fit a frame budget on weak hardware, and to walk a Roblox-specific edge-case list before calling a function done. Comment rules become mandatory and stop adapting to the project.

### Added
- `references/minimal-code.md` — the reuse-and-restraint discipline. A seven-rung ladder (does it need to exist, does the project have it, stdlib, engine API, installed library, one line, then the minimum), a catalog of eighteen things agents routinely hand-roll in Roblox alongside what already provides them, a search-the-project procedure, density rules (guard clauses over nesting, no forwarding wrappers, no abstraction without a caller), and the two cases where reimplementation is justified.
- **Three precedence rules** at the head of that file, guarding the failure modes minimalism invites: brevity never reduces **what gets delivered** (a function short because it does less than asked has failed), never costs **readability** (one statement per line, descriptive names, blank lines and section headers intact, no clever one-liners — "less code" means less work, not less whitespace), and never removes a **requirement** (validation, cleanup, layout, UDD, `pcall` coverage are not YAGNI candidates). All three are mirrored onto the Session Invariant Card so they survive compaction.
- **Ponytail** documented as an optional agent-side overlay: detected by its commands or rule files, deferred to for minimalism when present including the user's intensity setting, and fully replaceable by this skill when absent. Recorded as an AI-agent plugin, explicitly not a Roblox plugin or a Luau library, and never a prerequisite.
- `references/device-performance.md` — fitting the frame and the weakest device. Frame budget arithmetic (16.6 ms at 60 FPS, 33.3 ms at 30, of which scripts get a few), a time-slicing pattern that budgets in time rather than item count, device tiers with the rule against inferring power from `TouchEnabled`, a fixed six-rung degradation ladder that never touches gameplay-critical visuals, adaptive quality with asymmetric hysteresis, per-player bandwidth budgeting, and the low-end memory ceiling ordered by what breaches it first.
- `references/edge-cases.md` — a Roblox-specific catalog of the states production actually produces, grouped by trigger (player lifetime, character lifetime, instance lifetime, numbers, collections, timing and ordering, network and client input, data and schema), each naming the failure and its guard, closing with a six-question finishing pass. Non-Negotiable #7 is referenced rather than restated.

### Changed
- System Design Preflight step 4 broadened from "Does a library own this concern?" to **"Does this already exist?"**, checking the project's own modules, the standard library, and the engine API before reaching a library.
- Language & Style gained a reuse-and-density rule carrying the completeness guarantee.
- `performance.md` and `device-performance.md` state their split explicitly: one makes the code cheap, the other makes it fit. The `ui-ux-testing.md` performance-tiers bullet became a pointer.
- `community-libraries.md` scoped to Luau libraries the project runs, with agent-side tooling routed elsewhere so Ponytail is never expected in a `wally.toml`.
- Four Review Checklist items added, covering reuse, delivered-in-full, frame budgeting, and the finishing pass.
- **UDD now outranks Adaptive mode.** Doc-comment style moved out of the adaptable column in `adaptive-mode.md` and into the non-negotiable one. Adaptive mode adapts section headers, naming, ordering, and file organization; it never adapts comments. A new "Comments never adapt" section states the rule at the point where an agent would otherwise inherit a house style.
- **Exactly two permitted outcomes per authored function:** a UDD block written exactly as specified, or no doc comment at all. A third style, a half-compliant block, or a partial carry-over of the project's habit are all forbidden. The reasoning is stated where the rule lives: a missing comment costs one function's worth of context, while a wrong one misleads a reader into a bug.
- **The project's comment style applies only on an explicit user instruction** naming it. Detecting a house style during codebase analysis is a finding to report, not a convention to adopt, and Adaptive mode being active is not an instruction. Step 1 and the Step 2 summary template in `adaptive-mode.md` now say so.
- **Descriptions are one sentence, hard-capped at 100 characters.** The previous "~50 words for the rare two-clause case" escape hatch is gone; it contradicted the 100-character limit it sat beside.
- Comments are now the documented exception to the file-matching rule in Adaptive Step 3: an authored doc comment follows the skill or is omitted regardless of the surrounding file's style.

### Removed
- **In-body comments are no longer written at all.** The previous allowance (≤ 75 characters and ≤ 25 words, explaining why) is replaced by a prohibition with a narrow exception: a constraint the reader cannot recover from the code, such as an engine quirk, an externally imposed ordering requirement, a deliberate deviation that will read as a mistake, or a deliberately swallowed failure. Even then it is one line and ≤ 75 characters. Two standing prohibitions accompany it: never add commentary to code being edited, and never delete a comment that already exists.
- The "≤ 25 words" cap is gone from every file, having no remaining rule to qualify.

### Fixed
- **Contradiction:** `adaptive-mode.md` listed doc-comment style as adaptable while SKILL.md treated the UDD rules as mandatory. The two now agree.
- **Contradiction:** the SKILL.md heading "The two description rules" introduced three numbered items. The in-body rule is now its own section and the heading is accurate.
- **Contradiction:** a description was capped at "≤ ~100 characters" and simultaneously allowed "~50 words", which is roughly triple that limit.
- **Contradiction:** `cases/combat.md` instructed the agent to "document the number" for a lag tolerance, which the volatile-content rule forbids in a description. It now directs the value into a named Configuration constant instead.
- The skill's own examples were brought in line with the rule they teach: the in-body comment in the SKILL.md `applyDamage` example and the placeholder comment in the server-script template were removed, and the template's newly referenced module is now declared in its Modules subsection.
- `luau-language.md` and `patterns.md` framed the ignorable-`pcall` comment as general guidance; both now name it as one of the few cases that earn an in-body comment and carry the length cap.
- Review guidance in `false-positives.md` makes the authoring-versus-review asymmetry explicit: the UDD mandate binds what the agent writes and is never a standard for judging existing code. Existing in-body comments and house comment styles are explicitly not findings.
- New false-positive carve-outs so the additions cannot become review noise: a project is not flagged for lacking device tiers, a hand-written helper is Advisory rather than a violation, a missing edge-case guard still needs a concrete failure scenario, and code is never flagged merely for being longer than the reviewer would have written it.

### Verified against current documentation

Every performance and edge-case claim was checked against Roblox's own sources before shipping, which confirmed six figures and corrected one of this skill's own statements:

- **16.67 ms per frame at 60 FPS** is Roblox's published figure, not an estimate.
- **Under 1,000 draw calls and under 1,000,000 triangles** is the published baseline-device budget.
- **`Workspace.EnableSLIMAvatars`** and **`Model.LevelOfDetail = SLIM`** added, including the constraint that `EnableSLIMAvatars` cannot be set from a script and that R6, NPCs, and custom proportions are excluded.
- **Recommended streaming values for low-end devices** recorded (`ModelStreamingBehavior`, `StreamingIntegrityMode`, `StreamingMinRadius`, `StreamingTargetRadius`, `StreamOutBehavior`).
- **Partial transparency forces overdraw**; use `0` or `1` only. Built-in materials conserve memory over custom textures.
- **Studio's device emulator inflates memory readings** by running server and client in one process, so memory conclusions come from real hardware.
- **Correction:** the character-lifetime entry claimed descendants may be missing at `CharacterAdded`. The `Humanoid` and body parts *do* exist then; what is missing is appearance (accessories and clothing take seconds), and the character is not yet parented to Workspace. Split into three accurate entries with `CharacterAppearanceLoaded` as the appearance guard.
- The **degradation ladder is labelled a practical default rather than doctrine**, since Roblox publishes no official cut order.

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
