# Changelog

All notable changes to the roblox-best-practices skill are documented here. The format loosely follows [Keep a Changelog](https://keepachangelog.com); the skill version tracks `package.json`.

## [1.18.1] - 2026-08-26

**Two documentation passes, one theme: every claim now names a source, and the invented ones are gone.** The first read the Creator Hub performance-optimization guides (`design`, `identify`, `improve`, `monitor`, `scene-analysis`, `test-on-hardware`, `microprofiler/*`) and the `Workspace` class reference, confirming most of what 1.17.2–1.18.0 added, correcting the rest, and filling in the tooling those releases had described from memory. The second read the Luau reference, the scripting and security guides, and the whole *Coding Fundamentals* tutorial series, which surfaced the language fundamentals the skill had been assuming rather than stating — truthiness, table and `require` semantics, and what actually survives a remote call.

### Fixed
- **Stale StyleQuery claim.** `performance.md` still told the agent StyleQuery was unconfirmed; `api-currency.md` had it [GA] since 1.17.1. The exact class of error 1.17.1 exists to prevent, in the file that release did not touch.
- **`Model.StreamingMode`** in `performance.md` is `Model.ModelStreamingMode`, the spelling every other file already used.
- **The `Instance.new` parent argument was listed as a deprecated API** in `adaptive-mode.md`'s non-negotiable column and as "reject on sight" in `patterns/world.md`, while `style-rules.md` and `false-positives.md` correctly class it as discouraged-but-functional. Both now say Advisory.
- **Invented MicroProfiler thresholds removed.** The per-tag millisecond budgets (4 ms FastClusters, 2–3 ms `stepHumanoid`, and the rest) are published nowhere. The tag table now carries the documented tag paths and Roblox's own mitigations, and the judgment rule is a tag's share of a frame that missed its target, against that place's baseline capture.
- **Five mislabeled cross-references** (`security.md` pointing at `monetization-policy.md`, `ui-crossplatform.md` at `verification.md`).
- `SceneAnalysisService`, `Workspace.PlayerCharacterDestroyBehavior`, and `Workspace.ImprovedPhysicsReplication` were held at [Verify]/[UNVERIFIED]; all three are documented. Promoted to [GA].

### Added
- **MicroProfiler, properly.** Shortcuts per environment (`Ctrl+F6` Studio and desktop, `Ctrl+Alt+F6`/`Ctrl+Shift+F6` in the client, `Ctrl+P` pause, `Ctrl+F` search), mobile web UI and its frame-count URL, dump filenames and their log directories, the 60-frame/4-second server capture limits, the frame-time bars for 30/60/120/240 FPS, the 2.5 ms GPU-wait red-bar rule, the six modes, the three threads, `debug.profilebegin`/`profileend` custom scopes, and the network view's rows, colors, and verbosity levels.
- **Scene Analysis in full:** all six views including Instance Composition and Audio Memory, plus the six `SceneAnalysisService` methods.
- **Task scheduler phases.** `PreSimulation` for logic feeding physics **and for `Motor6D.Transform` writes** (Animators overwrite later writes), `PostSimulation` for logic reacting to physics, `PreRender`/`BindToRenderStep` for camera and input only.
- **Join time** as a first-class metric in `device-performance.md` — Roblox measures frame rate, memory, **and** join time; `PreloadAsync` scope, the join-size audit, and the teleport trade-off live there now.
- **Post-ship monitoring** in `verification.md`: the Performance Dashboard, correlating metrics with release dates, and the 2–3% client crash rate investigation line.
- **Non-scriptable settings called out.** `Workspace.StreamingEnabled`, `PhysicsSteppingMethod`, and `EnableSLIMAvatars` cannot be assigned from Luau, and `AuthorityMode` is read-only to scripts — recommending one means asking the user to change a Studio setting. `Workspace:ApplyRecommendedStreamingSettings()` (plugin security) applies the recommended streaming values in one call.
- **Parallel Luau constraints:** `require()` is unavailable during a parallel phase, `Terrain:WriteVoxels` is serial-only, and the three entry points are `task.desynchronize`, `ConnectParallel`, and `Actor:BindToMessageParallel`.
- `api-currency.md` gained a **Performance figures** section splitting published Roblox numbers from this skill's heuristics, so a reader can tell which is which.
- Device testing: Roblox's own example baseline device set, and what only real hardware shows (thermal, cellular, touch targets, arm's-length readability, input switching).

### Added (language fundamentals pass)
- **`luau-language.md` gained the fundamentals the skill assumed everyone knew.** Three new sections, all sourced from the Luau reference pages:
  - **Values, truth, and coercion** — only `false` and `nil` are falsy, so `0` and `""` pass an `if`; `and`/`or` return values rather than booleans, which is what makes `x and y or z` a trap; string/number coercion in both directions; full enum names over coerced numbers; `"100" < "20"` lexicographic ordering; doubles with ~15 digits and exact integers to 2^53; `0x`/`0b`/`1_000_000` literal forms.
  - **Tables: references, copies, and shape** — assignment aliases rather than copies, `table.clone` and `table.freeze` are both shallow, `table.isfrozen`, mixed tables and `nil` holes break `#` and DataStore encoding alike, no mutation during iteration, and weak tables are not a cleanup strategy.
  - **Modules: what `require` actually returns** — cached once per context, and **a separate instance per side of the client-server boundary**, which is shared code and never shared state.
- **What survives a remote call (`patterns/network.md`).** Remote arguments are serialized, not passed: functions arrive `nil`, non-string keys become strings, mixed tables are mangled, `nil` inside a table truncates it, metatables are stripped so an OOP object arrives as plain data, instances the receiver cannot see arrive `nil`, and every table is a copy with a new identity. Silent wrong values, all of them.
- **`security.md` grew the layers the engine's own security guides call for:**
  - **Design it out before detecting it** — the guiding question, plus structural answers (sequential checkpoints, server-computed damage, making the reward not worth taking).
  - **`NaN` as a validation hole** — its `typeof` is `"number"` and it fails every comparison, so it walks through a range check untouched. `math.isfinite` before the range check, not after.
  - **Payload shape spoofing** — a table can impersonate an instance; `typeof(x) == "Instance"` plus `:IsDescendantOf()` is the real check.
  - **Detection and the consequence ladder** — completion times, rate of gain, robotic action cadence, honeypots; then logging → quiet mitigation → temporary restriction → visible enforcement, with suspicion accumulated across signals rather than acted on singly.
  - **Third-party assets and script capabilities** — backdoors in inserted models, and the sandboxed-container answer (`Workspace.SandboxedInstanceMode`, `Sandboxed`, `Capabilities`), with Network / DataStore / AssetRequire / CapabilityControl / LoadString named as the capabilities to withhold. Experimental, so never a default.
  - **Client-visible code is decompilable** — including disabled and unused scripts — and **network ownership is authority**: an owning client can forge or suppress `Touched` and set velocity freely.
  - Client-triggerable instances (`ProximityPrompt`, `ClickDetector`, `DragDetector`) fire from any distance regardless of `Enabled`, and are now stated as remotes in disguise in both `security.md` and `patterns/network.md`.
- **Transparent batching (`patterns/data.md`).** Concurrent web calls are batched by the engine into far fewer HTTP requests; `task.spawn` the independent ones instead of awaiting each in turn, since sequential awaits defeat it.
- **Native codegen limits (`luau-language.md`)** — 64K instructions per code block, 32K internal blocks, 1M per script, a shared per-experience allocation ceiling, `debug.dumpcodesize()`, plus where native compiles badly (unannotated parameters, `getfenv`/`setfenv`, engine-API-bound code) and why annotating `Vector3` arguments matters.
- `table.clone`/`table.isfrozen` in the do-not-hand-roll catalog and in `api-currency.md`; script capabilities and `debug.dumpcodesize` recorded there too.
- Review checklist gained a remote-serialization and `math.isfinite` gate.

- **Where code lives (`style-rules.md`).** A container table the skill never carried: what replicates, what executes, and what each Starter container is for — plus **`Script.RunContext`** (`Legacy`/`Server`/`Client`), which is how client code lives in `ReplicatedFirst` or `ReplicatedStorage` without a LocalScript. LocalScripts remain correct and are never a finding.
- **The full script-directive set (`luau-language.md`):** the three type modes, `--!native`, `--!optimize 0|1|2`, and `--!nolint`, with the note that Studio bolds the word after `TODO`.
- **Bindables marshal like remotes** (`security.md`): copied tables, stringified keys, stripped metatables, and an `Invoke()` that yields forever with no `OnInvoke`. Not a trust boundary, but not a correctness free pass either.

- **Where the official tutorials differ (`patterns/world.md`).** Reading the whole *Coding Fundamentals* series showed its shapes are simplified for teaching, not wrong: a script per button, `Touched` with no debounce and a blocking `task.wait` inside the handler, `CanTouch = false` as a cooldown, `leaderstats` as the value's home, points granted with no validation or persistence. A table now names each one against what ships, so a user citing the tutorial gets the gap explained rather than dismissed, and tutorial-shaped code in an existing project is never a defect on its own. (The one genuinely dated idiom found across the series: an occasional `BrickColor.Red()`.)
- **Parallel Luau has four documented safety levels**, not the two the skill listed: Unsafe, Read Parallel, Local Safe, and Safe. Added, with `SharedTable`'s atomic updates, and two more anti-patterns: an actor per entity, and nesting actors.
- **Removing several entries in place walks the array backwards** — `table.remove` shifts later indices down, so a forward loop skips whatever slid into the gap.
- **Naming:** spell words out, and do not shout acronyms (`aJsonVariable`, not `aJSONVariable`).
- **Releasing references** — an unparented instance or a large intermediate table stays in memory while any variable still names it; clearing that variable is what lets the collector work.
- `MemoryStoreService` queues added to the do-not-hand-roll catalog.

### Fixed (language fundamentals pass)
- **`SignalBehavior` default was stated backwards.** The skill said Deferred is the default for new experiences; the enum value `Default` currently resolves to **Immediate**, with Deferred shipped in Roblox's place templates and forced by Server Authority. Corrected, and the deferred resumption points are now listed by name rather than as "the next invocation point".

### Changed
- **`evaluation-matrix.md` is scoped to audits the user asks for.** Scoring 3 is a pass; the distance from 3 to 5 is headroom, not a findings list. `review-checklist.md` and `false-positives.md` say the same, closing a conflict where the matrix demanded ceremony the false-positive rules forbid.
- `performance.md`'s symptom table gained the documented server-heartbeat, Data-Ping-vs-Network-Ping, low-end-crash, and join-time rows.
- SKILL.md trimmed back under the 5,000-token guideline.

## [1.18.0] - 2026-08-26

**Adds official Roblox Studio diagnostic scopes, Scene Analysis suite, low-end hardware baseline hardening (anti-OOM Error 292), and structured proof-of-performance verification protocols.**

### Added
- **Official MicroProfiler Engine Scopes (`references/performance.md`):** Complete diagnostic mapping for 6 core engine scopes (`updateInvalidatedFastClusters`, `stepHumanoid`, `stepAnimation`, `ProcessPackets`, `ShadowMapSystem`, `physicsStepped`) with warning thresholds and concrete architectural mitigations.
- **Studio Scene Analysis & Leak Detection (`references/performance.md`):** Comprehensive procedures for using the Studio Scene Analysis tool (`Window` > `Performance Summary` > `Scene Analysis`) and `SceneAnalysisService` to detect unparented instance leaks, animation memory churn, and render pass triangle breakdowns.
- **Hardware Baseline Hardening for Low-End Devices (`references/device-performance.md`):** Defined concrete budgets for the ~65% Android demographic (Draw calls <= 1,000, Triangles <= 1,000,000, Client RAM <= 400–500 MB) to prevent out-of-memory crashes (Error 292), along with 10–15 min continuous thermal throttling tests.
- **GPU Texture Memory Physics & Draw Call Instancing (`references/device-performance.md`):** Codified that texture GPU RAM is strictly pixel-bound (1024x1024 = 4x the RAM of 512x512, independent of disk compression) and established single-package asset deduplication for automatic 1-draw-call GPU instancing.
- **Client-Side Tweening Mandate (`references/performance.md` & `references/review-checklist.md`):** Explicitly banned server-side `TweenService` for part movements (which causes 60 Hz per-client replication floods) in favor of client-side tween execution and server target replication.
- **Proof-of-Performance Verification Protocols (`references/verification.md`):** Added 4-step test gates (20x Respawn Memory Leak Audit, Data Ping Saturation Check, Full-Load Baseline Frame Test, and Sustained Thermal Test).

## [1.17.2] - 2026-08-26

**Adds the System Health & Architecture Evaluation Matrix, strengthens Server-Authoritative Combat security, and formalizes Parallel Luau concurrency patterns.**

### Added
- **System Health & Architecture Evaluation Matrix (`references/evaluation-matrix.md`):** An objective 1–5 scoring rubric across six core pillars (Security & Server Authority, Memory & Lifecycle, CPU & Performance Budget, Network & Replication, Data Safety & Persistence, Code Structure & Maintainability) designed for developers and AI to audit systems under development in Roblox Studio.
- **Parallel Luau & Actor Model Architecture (`references/performance.md`):** Comprehensive concurrency guide detailing thread safety classifications (`ReadParallel` vs `Unsafe`), the 5-step Parallel Compute → Batch Serial Write execution pattern (`workspace:BulkMoveTo` in serial phase), and anti-pattern mitigations against *chatty sync/desync* and *thread contention*.
- **Muzzle / Raycast Origin Verification (`references/cases/combat.md` & `references/security.md`):** Added explicit validation of shot origins against attacker server character positions (`(origin - rootPart.Position).Magnitude <= MAX_MUZZLE_DISCREPANCY`) to prevent ghost shooting and shoot-through-walls exploits.
- **Compiler Directives & Subtyping Guidance (`references/luau-language.md`):** Added `--!optimize 2` alongside `--!native` / `@native` for compute-heavy math/simulation, and reinforced precise optional dictionary typing (`{ [K]: V? }`).

### Changed
- **NPC & AI at Scale (`references/cases/combat.md`):** Updated assembly recipes to distinguish single staggered loops from Parallel Luau Actor coordinators, and clarified batch transforms in the serial phase.
- **Evaluations Migration:** Standardized all test fixtures and scenarios in `evaluations/` from `.lua` to modern `.luau`.

## [1.17.1] - 2026-08-26

**The verification procedure this skill added last release was itself wrong, and it was telling the agent to flag correct code.** 1.17.0 required every engine fact to name its source and made the Engine API Reference the authority. The rule was right; the procedure built on it was not. It instructed the agent to read absence from a reference page as proof a member does not exist — and create.roblox.com trails the engine by weeks. Nine rows were wrong as a result. This release fixes the procedure, then fixes everything downstream of it.

### Fixed
- **Existence and semantics are now two questions with two authorities.** *Does this member exist* is settled by the versioned API dump (`robloxapi.github.io/ref`, which carries the engine version each member was added in) or by an in-Studio probe. *What does it do* is settled by the Engine API Reference. `api-currency.md` states the split, the toolbox is reordered around it, and a closing rule makes it enforceable: an existence claim may only cite the dump, a probe, or a CLI dump — never a documentation page. Propagated to SKILL.md.
- **Three shipped members were listed as fabrications.** `style-rules.md` and `false-positives.md` instructed the agent to flag `GuiService:GetUIScaleMultiplier`/`SetUIScaleMultiplier` (engine v734), `UIShadow.Mode` (v732), and `UIShadow.Inset`/`ShowBehindParent` (v733) as release-note names that never shipped. All three had shipped. A reviewer following 1.17.0 would have raised a confident false finding against correct code, citing this skill — the exact failure `false-positives.md` exists to prevent. The misremembered-API table now distinguishes *absent from the dump* (invented) from *absent from the docs* (undocumented), and `false-positives.md` gained a worked example of the latter.
- **Five further rows were held at [Verify] while already present in the dump:** `PlayerControlState` (v735), `Player.FrustumStreaming` (v734), `MemoryStoreService:GetDistributedCounter` and its `MemoryStoreDistributedCounter` class (v733), the `WorldRoot` collision-group methods (v734), and `ViewportCamera`/`Logger` (v734). Promoted, with the downstream guidance in `device-performance.md` and `patterns/network.md` updated to match.
- **`StyleQuery` was marked [UNVERIFIED] as "not present in the Engine API Reference".** It is present, fully documented, and in the dump. Promoted to [GA].
- **Wrong member names corrected.** The `WorldRoot` setter is `CollisionGroupSetCollidable`, not `SetCollisionGroupsCollidable`; the row now names all eight v734 methods plus the two from v732. `UIShadow` gained its missing `Enabled` (v724) and `Mode` (v732). The unresolved "CollectionService tag signal methods" row is settled: the additions are the `TagAdded`/`TagRemoved` **events**, which fire per-place rather than per-instance — a distinction that is a real bug when confused with `GetInstanceAddedSignal`. `CollectionService:CreateCollection` promoted to [GA].
- **`TeleportService:ReserveServer` was the skill's recommendation in four files and has been deprecated since engine v702.** Replaced throughout with `TeleportAsync` plus `TeleportOptions.ShouldReserveServer`, or `ReserveServerAsync` where the access code is needed up front, including the note that `ShouldReserveServer` and `ReservedServerAccessCode` are mutually exclusive. `TeleportToPlaceInstance`, `TeleportToPrivateServer`, and `TeleportPartyAsync` were deprecated at v735 and are now listed; plain `Teleport` is not deprecated and is not listed.
- **README:** two reference-map entries pointed at files that do not exist (`security-monetization.md`, `ui-ux-testing.md`), and eleven references were missing from the map entirely. The map is now complete and the file count corrected from 22 to 36.

### Added
- **A `[Undocumented]` maturity tag** — confirmed present in the API dump with a known engine version, but with no reference page. Previously this state was folded into `[Verify]`, which also meant "exists upstream in Luau, confirm Studio" and "a release note mentioned a name". Three different risks under one tag is what let the wrong rows sit unexamined. Documented in SKILL.md and applied across `api-currency.md`.
- **A section on conditional styling in `ui-crossplatform.md`.** `StyleQuery` resolves screen size, aspect ratio, input preference, text size, display class, and reduced-motion declaratively, replacing hand-rolled Luau branching — three of its six conditions are accessibility settings, which makes it the cheapest correct answer to supporting them. Includes the full condition table and the warning that an invalid condition name fails silently rather than erroring.
- **"In the dump but not yours to call"** in `api-currency.md`. `ScriptScannerService` carries `RobloxSecurity` on every member; `IntentService` and `BranchService` define zero members of their own. Existence, accessibility, and usefulness are three separate questions, and the maintenance workflow now checks all three before a row is written.
- New engine rows: `Player:GetGlobalUserId` (v734), `Player:GetFriendsInUniverseAsync` (v735), `AudioWindSynthesizer` (v734), Terrain water flow methods (v735). `EditableMesh` thread-safety promotion confirmed at v734 and moved to [GA].
- **Luau 0.735** (22 August 2026): `LOP_FASTPCALL` roughly halves `pcall`/`xpcall` overhead — recorded with the standing rule that a protected call is never removed for cost. The Script Editor autocomplete and generic-stringification changes moved from the Engine table to the Luau table, where they belong.

### Changed
- **`api-currency.md` documents its own failure.** The maintenance section names the three members wrongly declared unshipped, the versions that prove otherwise, and the reasoning error behind them, because the next maintenance pass needs to know why the authority order is written the way it is. Engine rows gained their own promotion path (`release note → [Undocumented] → [GA]`), distinct from the Luau path, and the refresh workflow now forbids demoting a row on documentation absence: only the dump can retire a member.
- **README rewritten** for structure and readability: installation moved above the feature tour, the eight uniform bold-led paragraphs replaced with a summary table plus four sections that earn their prose, supervision levels documented with the `argument-hint` invocation added in 1.17.0, and the reference map split into Authoring / Blueprints / Patterns / Depth / Process.
- Snapshot basis moved to 26 August 2026: Luau **0.735**, engine **735** (`v0.735.0.7351131`).

## [1.17.0] - 2026-08-22

**Comments move out of function bodies, and every engine fact now has to name its source.** Two changes with one cause: a note beside a statement and an API recalled from memory go stale the same way, and neither carried a check. The verification discipline added here immediately falsified ten claims the previous release stated as fact.

### Changed
- **In-body comments are banned in delivered code.** `section-layout.md` reverses the previous allowance: self-documenting code is the primary standard (rename, extract a named helper, hoist a magic value to an `UPPER_SNAKE_CASE` constant, return early), and contract-level *why* moves into the Documentation Comment above the function. Propagated through SKILL.md, `style-rules.md`, `review-checklist.md`, `templates.md`, `adaptive-mode.md`, `luau-language.md`, and the `patterns/` files, whose examples lost their step-label comments.
  - **Existing comments in code the skill did not write stay put** — removal is proposed once, as Advisory, never performed. A project whose established style documents inside bodies keeps doing so; the ban binds this skill's default output, not someone else's convention.
- **Descriptions are capped at 3 lines as well as 250 characters.** Both are ceilings, not targets; a contract that does not fit means the function is doing too much.
- **Every engine fact stated to the user must name its basis** — an `api-currency.md` tag, a live docs check, an API dump, or an in-Studio probe. Absent one of those, the claim is labeled unverified and names the check that would settle it. Added to SKILL.md and to the review checklist, alongside a new Invariant Card row requiring `SignalBehavior`, `StreamingEnabled`, rig type, and the file's strictness header to be read once per session rather than assumed.
- `verification.md` documents the Studio CLI properly: `--runScriptFile`, `--placeId`/`--universeId`/`--localPlaceFile`, `--outputFile`, `--quitAfterExecution`, and the `--api`/`--fullApi`/`--apiV2` dumps.
- `studio-mcp.md` matches the shipped tool set — `script_search`/`script_grep`, `get_studio_state`, `start_stop_play`, `run_as_job`, `store_image`/`upload_image`, and `set_active_studio` marked as build-dependent rather than assumed.
- `community-libraries.md` states maintenance status: Knit is **archived** and must not be recommended for new projects, BridgeNet is unmaintained, Roact is superseded by React-lua.

### Added
- **`api-currency.md` gained "How to verify (the toolbox)"** — six procedures, cheapest first, the second of which does most of the work: appending `.md` to any Engine API Reference URL serves raw markdown, so grepping the class page settles whether a member exists without Studio running. A five-step refresh workflow closes the file, requiring release-note evidence to be reconfirmed against the reference before any row is promoted.
- **`style-rules.md` gained a misremembered-API table** — `Humanoid:LoadAnimation`, `Part.Velocity`, `player:GetMouse()` as an input plan, invented members, wrong service names, made-up enum members, and `BindToRenderStep` in server code. Binding in both directions: verify before writing one, never flag the correct form.
- **`false-positives.md` gained severity calibration** — six near-miss pairs whose severity follows context rather than shape (attribute state, `SetAsync`, per-spawn connections, deprecated APIs, missing validation, `task.wait` loops) — plus carve-outs for cold paths (`PlayerAdded`, purchase handlers, round setup are never hot), `pcall` demanded around calls that cannot yield or throw, the explicitly permitted `workspace` global, deliberate legacy choices, and enterprise ceremony retrofitted onto small projects.

### Added
- **Invocation argument for the supervision level.** `argument-hint: "[ask|bal|go]"` in the frontmatter makes the `/` menu show `/roblox-best-practices [ask|bal|go]`, and `workflow.md` defines how the argument resolves: it outranks an inline `!ask`/`!bal`/`!go` token, accepts the bare word or the token form, is case-insensitive, and takes the long names too. An empty or unrecognized argument is **Balanced** — never an error, and never a reason to ask the user which level they want.

### Restructured
**SKILL.md brought under the 5k-token Level 2 budget without dropping a rule.** It sat at ~7,170 tokens; it is now ~4,984. Nothing was deleted — process content moved behind two new reference files, and the passages that restated the Invariant Card were cut back to the card.

- **`workflow.md` (new)** — how to resolve the five session-setup decisions, the two modes, the supervision levels and their confirmation matrix, advisory invocation, the review severity gate, and the System Design Preflight. SKILL.md keeps every decision's **safe default**, so a compacted context still behaves correctly without the file.
- **`runtime-rules.md` (new)** — the seven Non-Negotiable Runtime Rules in full, each with the scope that keeps it from being over-applied and a link to its domain file. The rules themselves stay in SKILL.md as Invariant Card items 3-8, which is the copy required to survive compaction.
- **Card duplication removed.** The Script Section Layout section no longer restates the three-section block or the Documentation Comment rule; both are Card items already in context. The five-level header hierarchy lives only in `section-layout.md`, where it always had a copy.
- **Reference Routing became a list.** Same thirty-odd destinations and the same trigger keywords, without the two-column table repeating each path twice.

### Fixed
Verified against the Engine API Reference; each of these was wrong in 1.16.1.
- **`GuiService:GetUIScaleMultiplier()` never shipped.** `ui-crossplatform.md` now reads `GuiService.PreferredTextSize` and `GuiService.ViewportDisplaySize`, both confirmed present.
- **`UIShadow.ApplyShadowMode`/`Mode` and the `UIScaleMultiplier` setters** were release-note names absent from the reference; recorded as such rather than as API.
- **StyleQueries downgraded to [UNVERIFIED]** and withdrawn from the recommendations in `performance.md` and `ui-crossplatform.md`.
- **`InstanceHandle:Wait()` is unconfirmed** — `patterns/world.md` re-reads `Get()` at the point of use or tracks the instance with a tag signal instead.
- **`GroundController.MoveSpeedFactor` is inherited from `ControllerBase`**, not defined on `GroundController`; `GroundOffset` is.
- **`math.phi`, `sqrt2`, `e`, `nan`, `tau` are [GA]**, not RFC-only; only the 64-bit integer type remains unimplemented.
- **The `vector` library includes `floor`, `ceil`, `abs`, `sign`, `clamp`, `lerp`, `max`, `min`** beyond the previously listed set.
- **Require-by-string is not universally inapplicable** — `require("@rbx/PlayerModule")` exists for experiences opted into the Input Action System path; only the standalone `@self` alias never arrives.
- **The Input Action System is [GA]** and mandatory under Server Authority, no longer "verify availability".
- **`BanAsync`'s 24-hour device block is [Verify]** — the duration is not stated in the API reference.
- Snapshot basis moved to 21 August 2026, engine release notes 735; added `PlayerControlState` [Verify], the prediction-introspection members (`RunService.Misprediction`, `Rollback`, `GetPredictionStatus`, `SetPredictionMode`, `Instance.PredictionMode`) as [GA], and acoustic Occlusion/Reverb subcategories as [Verify].

## [1.16.1] - 2026-08-18

**Dates now live in one file, enforced by the validator.** The last open item from the Agent Skills audit: guidance that carries a date goes stale silently, and a date copied into eight files is eight things to remember when a status changes.

### Changed
- **Every date and year removed from all files except `api-currency.md`** — sixteen occurrences across `luau-language.md`, `limits-budgets.md`, `false-positives.md`, `security.md`, `server-authority.md`, `style-rules.md`, `studio-mcp.md`, and both split `patterns/` files. Each now carries the maturity tag it always should have (**[GA]**, **[Beta]**, **[Verify]**) and links to the row in `api-currency.md` holding the evidence.
- `luau-language.md` no longer says the old type solver "remains available through 2026" — a sentence with an expiry date built in. It now says the migration window is open and tells the reader to confirm it still is.
- `api-currency.md` gained a **"Dates live here, and only here"** section stating the rule and its reason, and extending it to "new", "recent", and "coming soon" — descriptions that stay attached long after they stop being true.

### Added
- **A seventh validator check:** any four-digit year outside `api-currency.md` fails. Verified by reintroducing one on purpose. It immediately caught an occurrence in `studio-mcp.md` that a manual grep had missed, because the grep filtered on link text rather than file path.

## [1.16.0] - 2026-08-18

**Structural pass: one session-setup procedure, and three bundled files split by domain.** Nothing was rewritten as guidance; the same rules are grouped so an agent loads only the domain it is working in, and runs the once-per-session decisions as one procedure instead of four scattered reminders.

### Changed
- **`## Session Setup (decide once, then cache)`** replaces the separate Supervision Level and Mode Selection sections. The four one-time decisions — supervision level, Default vs Adaptive, community libraries, Server Authority — now sit in one table with how to resolve each and what to assume when it cannot be resolved. Scattered one-time checks are the ones that get half-skipped; as one procedure they are read together.
- **`ui-ux-testing.md` split.** UI construction and cross-platform work became `ui-crossplatform.md`; the testing, testable-architecture, and telemetry halves folded into `verification.md`, which already owned that domain. Two files competing for one topic was the next duplication waiting to happen.
- **`security-monetization.md` split** into `security.md` (threat model, validation layers, movement sanity, text filtering, logging) and `monetization-policy.md` (purchases, `ProcessReceipt`, PolicyService). An anti-exploit question no longer loads receipt-processing rules.
- **Description gained an anti-trigger clause** — not for non-Roblox Lua, Studio UI or asset questions that do not touch code, or design discussion with no Luau involved — and was tightened to 803 characters to make room for it.
- SKILL.md carries a version marker, so a stale installed copy is identifiable from the file itself.

### Added
- **Grep hints for the lookup-style references** (`limits-budgets.md`, `genres.md`, `edge-cases.md`), which are tables rather than narratives and should be searched for one row rather than read whole.
- **Two more validator checks:** tables of contents must match their file's headings, and the frontmatter must stay inside the spec's `name` and `description` limits. Both verified by breaking them on purpose — the description overran 1,024 characters while this entry was being written, and the check caught it.

### Fixed
- The function-ordering rule appeared in both SKILL.md and `section-layout.md` after the 1.15.0 split; it now lives only where the detail is.

## [1.15.0] - 2026-08-18

**Audited against Anthropic's Agent Skills authoring spec, and restructured to match it.** The skill's architecture already followed the spec; its density and its testing did not. Nothing was deleted — heavy reference material moved out of the always-loaded file and into routed reference files.

### Added
- **Evaluation fixtures**, so all five scenarios run: `review-target.lua` (four real defects plus deviations that must return Advisory), `correct-but-odd.lua` (entirely shapes carved out in `false-positives.md`; must return zero findings), and `existing-project/` (a small codebase with its own conventions and two deliberate non-negotiable conflicts).
- **`references/patterns/`** — the pattern set split by domain: `data.md` (ownership, persistence, failure policy, locks), `network.md` (remotes, cross-server, streaming), `lifecycle.md` (cleanup, character, pooling), `world.md` (binding, input, anti-patterns). `patterns.md` becomes a four-row index; a task about remotes reads ~1.4k tokens instead of ~7.1k.
- **Tables of contents in all thirteen reference files over 100 lines.** The spec requires this because agents preview long files with partial reads (`head -100`) and cannot see past the cut without one. Files under 100 lines are left alone.
- `references/section-layout.md` — the full three-section specification, header hierarchy, subsection contents, and the complete Documentation Comment rules with worked rejections, moved out of SKILL.md.
- `references/style-rules.md` — the complete Language & Style set, including the full deprecated-API list and `const` guidance.
- `references/review-checklist.md` — the completion gate, now read at the end of a task instead of loaded at the start of every one.
- `evaluations/` — five scenarios with explicit `expected_behavior` lists (remote-handler authoring, player data persistence, review triage, false-positive resistance, adaptive mode) plus notes on running them across models. The spec treats evaluations, not prose, as the source of truth for skill effectiveness; there were none.
- `scripts/validate-skill.py` — structural checks that were previously done by hand: every link and anchor resolves, every reference is reachable one level from SKILL.md, SKILL.md stays within its line and token ceilings, and long references carry a table of contents. Neither directory ships in the npm package.

### Changed
- **SKILL.md cut from ~12,300 to ~7,100 tokens (259 lines).** It now holds only what every task needs: the Invariant Card, the routing table, authority and supervision, mode selection, the environment rules, the non-negotiables, the preflight, and compact summaries pointing at the moved detail. The spec's 500-line ceiling was already met; its ~5k Level 2 token budget was not, and the remainder is decision-making content whose removal would cost capability rather than tokens.
- Server Authority detection detail moved into `server-authority.md`; review-mode finding procedure moved into `false-positives.md`. SKILL.md keeps the trigger list, the default-off rule, the severity vocabulary, and the gate.
- Three routing rows added so every moved file is reachable directly from SKILL.md; inbound links across five files repointed to the moved anchors.

### Fixed
- **Duplicated review guidance in `false-positives.md`** — the moved block restated the confidence gate sitting 200 lines above it, in different words. It now covers only what happens to a finding once the gate has passed it.
- `server-authority.md` crossed 100 lines during the move and lost its table of contents; the validator caught it on first run.
- Link labels reading `patterns.md` while pointing into `patterns/` corrected across 18 files.

## [1.14.0] - 2026-08-18

**Object reuse, navigable performance guidance, and three design rules the skill kept assuming.** Four areas that were referenced far more often than they were specified: pooling appeared in five files but was defined in nine lines, `performance.md` was a flat rule list with no way to choose between its rules, and state ownership, failure policy, and per-owner locks were each invoked by name in the case recipes without ever being written down. Every new rule ships with its matching carve-out in `false-positives.md`.

### Added
- `edge-cases.md` gains a **"Pooled and reused objects"** section: double-return, use-after-return, incomplete reset, per-use connections accumulating, stale attributes and tags, `Destroy()` on a parked object, unbounded growth, and a drained pool. The finishing pass becomes seven questions, the new one asking what a reused object still carries from its last use.
- `patterns.md` → Object Pooling gains a **pool ceiling with overflow destruction** (an uncapped pool is a memory leak shaped like an optimization), a **full reset table** covering transform/physics, appearance, collision, per-use connections, attributes and tags, and children added during use, plus notes that `Parent = nil` frees nothing, that a parked object is never destroyed in place, and that tables pool the same way as Instances.
- A lower bound on when to pool at all: below roughly once per second, `Clone`/`Destroy` is simpler and the pool is pure complexity.
- `performance.md` gains **"Start here: find what is actually slow"** — a symptom-to-cause triage table (client FPS flat vs. scaling with entities, server-wide lag, memory climbing across a session, a spike at one moment, low-end-only, network-triggered stutter), each routed to the section that actually owns the cost. Measurement is promoted from an appendix to the file's stated entry point.
- `performance.md` gains **"Physics queries and contact detection"**, the gap most likely to produce a laggy server: `Touched` framed as a coarse trigger rather than a hit test, spatial queries and shapecasts as the deliberate alternative, `RaycastParams`/`OverlapParams` reuse (with the detail that assigning `FilterDescendantsInstances` copies the table), engine-side filtering and `MaxParts` over post-filtering in Luau, broadphase opt-out flags, Humanoid state-machine cost on the server, and the rule that a client-side cast is a prediction the server re-runs.
- **Which side pays** is now stated: rendering and input cost the client, physics and replication fan-out cost the server, and the rules that error when misplaced are marked rather than left to inference.
- `performance.md` gains **"What costs what (relative, not measured)"** — eight orderings (table field vs. property read vs. replicating write, cached reference vs. per-frame path resolution, pooled reuse vs. `Instance.new`, one fat remote vs. ten thin ones, distance check vs. raycast, `table.clear` vs. reallocation, `table.concat` vs. loop concatenation) stated explicitly as orderings rather than benchmarks, plus the rule to order guards cheapest-first.
- A **post-optimization discipline** in the Measurement section: record the number first, change one thing, re-measure on the target device rather than in Studio, revert what did not move, and report the measurement rather than the intent.
- Animation and effect churn added to Memory: load an `Animation` once per `Animator` and keep the track, prefer `:Emit()` on a persistent emitter and a reused `Sound` over cloning per hit, and note that emitter cost scales with `Rate` × `Lifetime`.
- Two Review Checklist items: private per-player state never travels by attribute, and no performance claim without a before/after number.
- `patterns.md` gains **"One Owner Per Fact"**: one writing owner per piece of state, every other copy a view updated after the fact and never read back to decide anything, derived values recomputed rather than stored twice, and the settling test — *if these two copies disagreed right now, which is right?*
- `patterns.md` gains **"Failure Policy (what happens after the last retry)"**: every guarded call states its behavior on final failure as **fail closed** (money, permissions, policy — an unavailable check is not a passing check), **fail open** (cosmetics, telemetry), or **fail loud** (persistence). The fail-loud case is spelled out because it is the expensive one: a failed load falling through to defaults produces an empty profile whose next autosave destroys the real history.
- `patterns.md` gains **"Serialized Operations (per-owner locks)"**, the pattern two recipes already demanded by name but no file defined. Includes the lock released on every path including errors, cleared on `PlayerRemoving`, scoped per owner rather than globally, and explicitly not a replacement for post-yield re-validation.
- `false-positives.md` gains the matching carve-out for all three: a second copy of a value is not automatically a divergence bug, fail-open is a valid policy rather than a missing guard, a missing lock needs a named yield and two concurrent callers before it is a finding, a global lock is never the proposed fix, and a small project lacking all three is not defective. The one shape that clears the bar alone stays Blocker: a failed load falling through to defaults on a path that later saves.
- Three Review Checklist items covering failure policy, single ownership, and lock release on every path.

### Fixed
- **Parallel Luau was missing its precondition:** the script must be a descendant of an `Actor` or `task.desynchronize()` does nothing useful — the most common way that feature is written wrong.
- **An attribute is a broadcast, and the old rule did not say so.** "Prefer attributes for state" is now bounded to genuinely public state; per-player data an exploiter could read — inventory, currency, cooldowns — goes through a targeted remote. Choosing an attribute for private state was a security decision disguised as a performance one. Paired with a note that rewriting a property to its current value neither replicates nor fires a change signal, so a compare-before-write guard removes the traffic outright.
- The `Touched` guidance is scoped for review as well as authoring: an existing trigger is not a finding on its own, only one with a concrete failure behind it.

### Changed
- The pooling snippet gains its Configuration constants and Documentation Comments in the current style; the remote-handler and cleanup-bag snippets in the same file were carried to that style too.
- `performance.md` pooling bullet now points at both the ceiling/reset rules and the reuse edge cases.
- SKILL.md: System Design Preflight step 3 now asks who owns each fact, not just the server/client split; the reference-routing rows name physics queries, state ownership, failure policy, locks, and reused state, and the finishing-pass checklist item covers state carried over by a pooled object.

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
