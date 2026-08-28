# API Currency — Confirmed Baseline for "Verify First"

The verify-first rule ([SKILL.md](../SKILL.md#environment--scale)) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the **baseline that rule reads against** — a dated list of what is already confirmed, so the agent stops re-litigating shipped APIs while still verifying the genuinely bleeding-edge.

**Snapshot basis: 26 August 2026.** Sources: Luau releases through **0.735** (22 August 2026), the Luau 2025 runtime recap (19 December 2025), the Luau RFC repository, Roblox engine release notes through **736** (week of 24 August 2026, read from the weekly updates pages described in step 5 below), and the versioned API dump at `robloxapi.github.io/ref` reflecting **v0.735.0.7351131** (17 August 2026). The performance figures and tooling in [performance.md](performance.md), [device-performance.md](device-performance.md), and [verification.md](verification.md) were read directly from the Creator Hub performance-optimization guides (`create.roblox.com/docs/performance-optimization`, its `design`, `identify`, `improve`, `monitor`, `scene-analysis`, `test-on-hardware`, and `microprofiler/*` pages) and the `Workspace` class reference.

**Maturity tags:** **[GA]** generally available, safe as a default · **[Beta]** opt-in and may change, document as an option but never make it the default · **[Undocumented]** confirmed present in the API dump with a known version, but create.roblox.com has not caught up — usable, with no reference page to read · **[Verify]** confirm in the target place before relying on it · **[UNVERIFIED]** this skill could not confirm it; treat with suspicion.

**Authority order when a claim is in doubt** — and the order depends on how new the API is:

- **Does it exist at all?** The **versioned API dump is primary** (`robloxapi.github.io/ref/class/<Class>.html`, or a local `--api` dump). It carries the exact engine version each member was added in, and it leads the documentation site by weeks to months.
- **What does it do, and how do I use it?** create.roblox.com Engine API Reference is primary. It is the authority on semantics, parameters, and guidance — not on existence.
- **How does it behave here?** An in-Studio probe settles what neither source answers.

**The documentation site lags the engine, and absence from it proves nothing.** A member missing from a reference page is undocumented, not unshipped. Treating the two as the same thing is how correct code gets flagged — see [Maintaining this file](#maintaining-this-file). Absence from *this* file is likewise not evidence an API is missing; the list removes friction, it never overrides the dump or the docs.

## Contents

- [How to verify (the toolbox)](#how-to-verify-the-toolbox)
- [Luau language and libraries](#luau-language-and-libraries)
- [Engine](#engine)
- [Performance figures and where they come from](#performance-figures-and-where-they-come-from)
- [Studio MCP tooling](#studio-mcp-tooling)
- [Deprecated (report as findings)](#deprecated-report-as-findings)
- [Dates live here, and only here](#dates-live-here-and-only-here)
- [Maintaining this file](#maintaining-this-file)

## How to verify (the toolbox)

The concrete procedures behind every tag in this file, cheapest first:

1. **This file.** A row marked [GA] is settled — do not re-litigate shipped APIs from memory.
2. **The versioned API dump — the existence check.** `https://robloxapi.github.io/ref/class/<Class>.html` renders the dump for every class with the engine version each member was added in, and a per-version change index at `/ref/updates/`. This is the cheapest way to settle *does this member exist*, it needs no Studio, and it is **ahead of the documentation site**. Use it whenever a name is newer than a few months old, and whenever a reference page fails to mention something a release note announced.
3. **Engine API Reference as markdown — the semantics check.** Every reference page serves raw markdown when you append `.md` to its URL: `https://create.roblox.com/docs/en-us/reference/engine/classes/<Class>.md`, same pattern under `/enums/`, `/datatypes/`, `/libraries/`, and guide pages (`/docs/en-us/<topic>.md`). Fetch and grep for the member name to learn parameters, semantics, and guidance. **Absence here does not mean absence from the engine** — fall back to step 2 before concluding anything, and never state that a member does not exist on the strength of this step alone.
4. **Documentation indexes.** `https://create.roblox.com/docs/llms.txt` lists every docs page; `https://create.roblox.com/docs/reference/engine/llms.txt` lists the documented Engine API surface. Find the slug there, then fetch that page's `.md`. Same caveat as step 3: this indexes what is *documented*.
5. **Weekly updates pages — what changed and whether it is live yet.** Roblox now publishes engine changes as one page per week at `https://create.roblox.com/docs/updates/<YYYY-MM-DD>`, dated to the Monday of that week, each entry carrying a **Status** column and a `Previous` link chaining backwards through earlier weeks. **Append `.md` and these fetch as raw markdown**, so this is the cheapest read of recent changes — walk the chain back from the current week when catching up. Two traps: the sibling page `https://create.roblox.com/docs/updates/pending`, which lists changes **not yet live**, renders client-side and has no `.md` variant, so a fetch returns an empty page and the absence of an entry there proves nothing; and a dated page's own tables render client-side too, so fetch the `.md` and not the HTML. `devforum.roblox.com/c/updates/release-notes` still carries the same notes as server-rendered topics, plus the feature-flag list and developer replies. Either way a release note announces intent — a name from one is provisional until step 2 confirms it.
6. **Studio CLI API dumps.** `RobloxStudioBeta.exe --api out.json` (also `--fullApi`, `--apiV2`) writes the installed engine's API surface as JSON — the same ground truth as step 2, for exactly the build you target rather than the newest one.
7. **In-Studio probe.** One Edit-mode Luau call settles existence in seconds (`print(typeof(workspace.AuthorityMode))`); for behavior questions inject a real Script so it runs in the game VM ([verification.md](verification.md#studio-native--mcp-environments)).

Never assert existence or nonexistence from training memory alone. Name which step above backs an engine-fact claim, or say explicitly that it is unverified and what check would settle it. **An existence claim needs step 2, 6, or 7** — steps 3–5 cannot support one.

## Luau language and libraries

| Area | Studio | Notes |
|---|---|---|
| `vector` library (`create`, `magnitude`, `normalize`, `dot`, `cross`, `angle`, `floor`, `ceil`, `abs`, `sign`, `clamp`, `lerp`, `max`, `min`, `zero`/`one`) | **[GA]** | Native, SIMD-backed; distinct from the engine `Vector3` datatype |
| `table.clone`, `table.isfrozen` | **[GA]** | Shallow copy and frozen-state check; both documented members of the `table` library |
| `buffer` library, including `readbits`/`writebits` | **[GA]** | Binary data and network serialization; 1 GB ceiling |
| `math.map`, `math.lerp`, `math.isnan`/`isinf`/`isfinite` | **[GA]** | |
| Native codegen `--!native` and the `@native` function attribute | **[GA]** | Costs memory; reserve for compute-heavy code. `@native` is **not** recursive into nested functions |
| `@deprecated` function attribute (optional `use`, `reason`) | **[GA]** | Linter warning at call sites plus autocomplete styling. Attributes are **not** user-definable ([luau-language.md](luau-language.md#attributes)) |
| **`const` bindings** | **[GA]** April 2026 | Contextual keyword, valid wherever `local` is. Freezes the **binding**, not the value; not a substitute for `table.freeze` ([luau-language.md](luau-language.md#const-bindings)) |
| Modern syntax (interpolation, generalized iteration, `continue`, compound assignment, `//`, if-expressions, `table.freeze`) | **[GA]** | |
| `task` library (`spawn`/`defer`/`delay`/`wait`/`cancel`) | **[GA]** | The bare `wait`/`spawn`/`delay` globals remain deprecated |
| Inlining of immediately invoked lambdas; refinements preserved across loops | **[GA]** | Luau 0.730–0.731, July 2026 |
| **Cheaper `pcall`/`xpcall`** (`LOP_FASTPCALL`) | **[GA]** | Luau 0.735, August 2026: roughly half the previous call overhead. Protected calls were never expensive enough to justify removing one; they are now cheaper still. Never strip a `pcall` for cost ([false-positives.md](false-positives.md)) |
| Script Editor: autocomplete inserts `:` for method calls; inferred generics stringified as `T`/`U`/`V`; compound-assignment type errors restored | **[GA]** | Luau 0.735 upstream, August 2026, and announced in engine release notes 735. Editor and analysis behavior, not a runtime API — a release note is the correct authority for this class of change |
| `pcall`/`xpcall` inside user-defined `type function` | **[Verify]** | Upstream Luau 0.734, August 2026. Requires the new solver |
| New type solver | **[GA]** default for `nocheck`/`nonstrict`; **opt-in** for `strict` | General release 20 November 2025. Configure via `UseNewLuauTypeSolver` and `LuauTypeCheckMode`; old solver available through 2026 ([luau-language.md](luau-language.md#the-new-type-solver--what-is-on-by-default)) |
| **Read-only members `{ read x: T }`, `{ read [K]: V }`** (and the `write` mirror) | **[Verify]** | Upstream Luau 0.721, May 2026. Full enforcement needs the new solver |
| **Yielding inside custom iterators** | **[Verify]** | Upstream Luau 0.722, May 2026 |
| **`declare extern type`** (replaces `declare class` / `extern class`) | **[Verify]** | Old spellings removed upstream in 0.727, June 2026. Affects hand-written declaration files only |
| **`export` value semantics** (exported values are `const` by default) | **[Verify]** | Upstream Luau 0.723, May 2026; Studio availability **not confirmed** by this skill. Keep the `local M = {} ... return M` shape until verified |
| User-defined `type function`, `keyof`, `issubtypeof` | **[Verify]** — requires the new solver | `issubtypeof` implemented in Luau 0.724 (June 2026) |
| `math` constants (`phi`, `sqrt2`, `e`, `nan`, `tau`) | **[GA]** | Documented members of the engine `math` library alongside `pi`/`huge`; use them instead of hand-rolled literals |
| 64-bit integer type | **RFC merged only** | Accepted design from the same February–March 2026 RFC batch as the constants. **No implementation confirmed.** Do not write code against these |
| `class` syntax | **RFC merged only** | RFC #191 accepted April 2026; upstream shows early implementation work in 0.721 and nothing more. Keep using metatable OOP |

**Not applicable to Roblox Studio** despite appearing in Luau release notes: embedder C APIs (`lua_memorydump`, `lua_callhook`, `lua_atbreakpoint`, ...), double-precision vector builds (a VM build-time option), and the standalone `@self` require alias. Require-by-string is the scoped exception: experiences opted into `PlayerScriptsUseInputActionSystem` can use `require("@rbx/PlayerModule")` (release notes 735, August 2026). Confirm scope before relying on aliases beyond `@rbx`; do not present the rest as "coming soon".

## Engine

| Area | Status | Notes |
|---|---|---|
| Server Authority (`Workspace.AuthorityMode`) | **[GA]** 9 July 2026 | **Off by default.** Full contract and the confirmation gate: [server-authority.md](server-authority.md) |
| `PlayerControlState` instance | **[Undocumented]** | Added in engine **v735**, August 2026 (API dump). Replicates scripted inputs under Server Authority ([server-authority.md](server-authority.md)). No reference page yet — probe in Studio for its member set before designing around it |
| Prediction introspection (`RunService.Misprediction`, `RunService.Rollback`, `RunService:GetPredictionStatus()`, `RunService:SetPredictionMode()`, `Instance.PredictionMode`) | **[GA]** | Present in the Engine API Reference; per-instance predicted-vs-authoritative data for debugging Server Authority mispredictions ([server-authority.md](server-authority.md)) |
| `Player:GetCameraState()` | **[GA]** | Returns CFrame, FieldOfView, ViewportSize; replaces the deprecated InputContext/InputAction camera replication path |
| Character Controller Library (`ControllerManager`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) | **[GA]** April 2026 | `Humanoid` is **not** deprecated; CCL is a choice ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)) |
| Input Action System | **[GA]** | Mandatory under Server Authority |
| Animation Graphs | **[GA]** July 2026 | |
| Studio Script Sync (external editors, bidirectional) | **[GA]** — full release 17 June 2026 | Syncs only `Script`, `LocalScript`, `ModuleScript`, and `Folder`; **attributes and tags on synced scripts are ignored and can be lost**; ceilings of 10,000 scripts per top-level instance and 128 top-level instances; no debugger control from the external editor. Full behavior in [external-editors.md](external-editors.md#studio-script-sync--the-official-one) |
| Rojo `syncback` (`rojo syncback <project> --input <file.rbxl>`) | **[GA]** — Rojo 7.7.0, 1 July 2026 | The supported way to pull a place back into a project, governed by `syncbackRules`. The plugin's live Two-Way Sync setting remains experimental and is not the same feature. Same release moved `rojo serve` to websockets ([external-editors.md](external-editors.md#rojo)) |
| Studio CLI (`--task RunScript --runScriptFile <path>`, `--outputFile`, `--quitAfterExecution`; `--openScriptPath`; `--api`/`--fullApi`/`--apiV2` JSON dumps) | **[GA]** | Officially documented under create.roblox.com/docs/studio/command-line-interface; scripts run at command-bar permission ([verification.md](verification.md#newer-verification-levers)). The API-dump flags are the strongest offline currency check |
| `GroupService:GetRolesInGroupAsync(userId, groupId)` | **[GA]** | Deprecates `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` |
| Structured `LogService` `Info`/`Warn`/`Error` | **[GA]** | Instances render via `GetFullName()`; caught errors suppressed under `pcall` |
| DataStore versioning (`GetVersionAsync`, `ListVersionsAsync`, `ListKeysAsync`) | **[GA]** | |
| DataStore limits, storage, and budgets | **[GA]** | Confirmed against `create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits`. Per-type request budgets, per-key throughput, and the `500 MB + 1 MB × lifetime users` storage pool are in [limits-budgets.md](limits-budgets.md#data-stores) |
| `DataStoreGetOptions.UseCache` | **[GA]** | `GetAsync` serves a four-second local cache; this is how an authoritative read is taken |
| `DataStore:BatchGetAsync` | **[GA]** | Reads several keys in one call |
| `DataStoreService:GetRequestBudgetForRequestType()` | **[GA]** | The documented way to self-throttle instead of guessing |
| `HttpService:GetSecret()` and the `Secret` datatype (`AddPrefix`, `AddSuffix`) | **[GA]** | Credentials that Luau cannot read back; domain-scoped, unavailable in local playtests ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| Right-to-be-forgotten deletion templates (Data Stores Manager, Open Cloud Configs API) | **[GA]** | A `{UserId}` key pattern configured ahead of time; 30 days to comply with a request ([patterns/data.md](patterns/data.md#deleting-data-on-request-rtbf)) |
| Extended Services (data stores, memory stores, compute, speech) | **[GA]** | Paid expansion past default ceilings; ID-verified 18+ owner, pay-as-you-go |
| Streaming (`Model.ModelStreamingMode`, `Player:RequestStreamAroundAsync`) | **[GA]** | |
| `Workspace:ApplyRecommendedStreamingSettings()` | **[GA]** | Plugin security. Applies Roblox's recommended streaming property values in one call ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| **Not scriptable — Studio-only settings:** `Workspace.StreamingEnabled`, `Workspace.PhysicsSteppingMethod`, `Workspace.EnableSLIMAvatars`; `Workspace.AuthorityMode` is read-only to scripts | **[GA]** | Recommending any of these means asking the user to change a Studio setting, never writing an assignment. Reading them is fine and is how the environment checks in [workflow.md](workflow.md#session-setup-resolving-the-five-decisions) work |
| `Player.FrustumStreaming` + `FrustumStreamingMode` enum | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). Streams by view frustum rather than radius alone; test the camera-turn case before adopting ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `Player:GetGlobalUserId()` | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). Non-yielding, returns `int64`. Semantics undocumented — probe before using it as an identity key; `Player.UserId` remains the settled choice |
| `Player:GetFriendsInUniverseAsync()` | **[Undocumented]** | Added in engine **v735**, August 2026 (API dump). Yields, returns an array. Wrap in `pcall` like any yielding call |
| `MemoryStoreService:GetDistributedCounter` (`MemoryStoreDistributedCounter`) | **[Undocumented]** | Added in engine **v733**, August 2026 (API dump); both the method and the class are present. A counter primitive for cross-server totals, replacing hand-rolled sorted-map arithmetic ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| CollectionService `TagAdded` / `TagRemoved` events | **[GA]** | Documented in the Engine API Reference. They fire when a tag enters or leaves use **across the place**, not per instance — per-instance binding is still `GetInstanceAddedSignal`/`GetInstanceRemovedSignal`, and confusing the two is a real bug |
| `CollectionService:CreateCollection()` | **[GA]** | Documented in the Engine API Reference; added in engine **v734**. Creates a named collection as an organizational primitive. Note `GetCollection` is the deprecated member on this class |
| `WorldRoot` collision groups | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump): `RegisterCollisionGroup`, `UnregisterCollisionGroup`, `RenameCollisionGroup`, `IsCollisionGroupRegistered`, `GetRegisteredCollisionGroups`, `GetMaxCollisionGroups`, `CollisionGroupSetCollidable`, `CollisionGroupsAreCollidable`, plus `CollisionGroupData`/`CollisionGroupCollidableChanged` from **v732**. Brings `WorldModel` raycasts to parity with `Workspace`. The setter is `CollisionGroupSetCollidable`, **not** `SetCollisionGroupsCollidable` |
| `GuiService.PreferredTextSize` / `PreferredTransparency` / `ViewportDisplaySize` (player UI-scale and display-class preferences) | **[GA]** | Documented members; read these instead of inferring scale from viewport size ([ui-crossplatform.md](ui-crossplatform.md)) |
| `GuiService:GetUIScaleMultiplier()` / `:SetUIScaleMultiplier()` | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). A previous snapshot of this file called these "release-note names that never shipped" on the strength of their absence from the reference — that was wrong, and it is the mistake the authority order above now prevents. **Never flag them as nonexistent** |
| `ViewportCamera`, `Logger` classes (`Logger` obtained via `GetLogger`) | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). `Logger` may overlap structured `LogService`; confirm which one the target environment expects |
| `AudioWindSynthesizer` | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump) |
| `UIShadow` class (`BlurRadius`, `Color`, `Offset`, `Spread`, `Transparency`, `ZIndex`, plus `Enabled` from **v724** and `Mode` from **v732**) | **[GA]** | Documented in the Engine API Reference. `Mode` is in the dump and is **not** an invented name; only `ApplyShadowMode` has no counterpart |
| Child `UIGradient` over `UIShadow`; `UIShadow.Inset` / `ShowBehindParent` | **[Undocumented]** | Both properties added in engine **v733**, August 2026 (API dump). Gradient-tinted and inset shadow rendering |
| UI styling system (`StyleSheet`, `StyleRule`, `StyleLink`, `StyleDerive`, tokens, themes, transitions, Style Editor) | **[GA]** | Documented under `create.roblox.com/docs/ui/styling`. Selectors cover class, `.tag`, `#name`, `:state`, `::pseudo-instance`, `@query`, with `>` and `>>` combinators; one sheet per tree; `StyleSheet:SetDerives()` swaps themes from code ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)) |
| `UIFlexItem` (`FlexMode`) and `UIListLayout.HorizontalFlex`/`VerticalFlex`/`ItemLineAlignment`/`Wraps` | **[GA]** | Flex is a property set on the list layout plus a per-child item. **There is no `UIFlexLayout` class** |
| `UIDragDetector` / `DragDetector` (`DragStyle`, `ResponseStyle`, `RunLocally`) | **[GA]** | `RunLocally = true` replicates nothing to the server ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| `Path2D`, `CanvasGroup`, `VideoFrame` | **[GA]** | `VideoFrame` carries hard platform limits (format, five minutes, two concurrent, paid upload) |
| `StarterGui.ClipsDescendantsSupportsRotation` | **[GA]** | Without it, `ClipsDescendants` does not clip rotated descendants; rounded clipping always needs a `CanvasGroup` |
| `GuiObject.InputSink` (`Enum.InputSink`) | **[GA]** | Present in the Engine API Reference. Absorbs input at the element, replacing `Active`-style input blocking |
| EditableMesh methods promoted from Unsafe to Safe (thread safety) | **[GA]** | Confirmed in the API dump at engine **v734**, August 2026 |
| Terrain water flow methods | **[Undocumented]** | Added in engine **v735**, August 2026 (API dump). No reference page yet |
| `Players:BanAsync`/`UnbanAsync` (`ExcludeAltAccounts`, `ApplyDeviceBlock`, `ApplyToUniverse`) | **[GA]** | |
| `game.ServerRestartScheduled` | **[GA]** | Now also fires on delayed restarts |
| `SceneAnalysisService` (`GetInstanceCompositionAsync`, `GetScriptMemoryAsync`, `GetUnparentedInstancesAsync`, `GetTriangleCompositionAsync`, `GetAnimationMemoryAsync`, `GetAudioMemoryAsync`) | **[GA]** | Documented with the Scene Analysis tool (`create.roblox.com/docs/performance-optimization/scene-analysis`). Six views, six methods ([performance.md](performance.md#measurement-never-optimize-blind)) |
| `Workspace.PlayerCharacterDestroyBehavior` | **[GA]** | Documented in the performance-improvement guidance as the automatic-cleanup path for character models on disconnect ([performance.md](performance.md#memory)) |
| `Workspace.PhysicsSteppingMethod` (`Default`/`Fixed`/`Adaptive`) | **[GA]** | Documented enum. `Default` **is** `Adaptive` (per-assembly 240/120/60 Hz); `Fixed` runs everything at 240 Hz for accuracy at a cost |
| `Workspace.ImprovedPhysicsReplication` | **[GA]** | Documented on the `Workspace` class reference as an optimized server/client state-synchronization path |
| `debug.profilebegin` / `debug.profileend`, `debug.setmemorycategory` | **[GA]** | Custom MicroProfiler scopes and memory attribution; the documented way to confirm a suspected hot section is the one that costs |
| Analytics: Client CPU Time Breakdown | **[GA]** | Scripts / Networking / Physics / Animation / Misc |
| `Workspace.EnableSLIMAvatars`, `Model.LevelOfDetail = SLIM` | **[GA]** | Lightweight avatar and model stand-ins under streaming. `EnableSLIMAvatars` **cannot be set from a script**; it is configured in Studio. Excludes R6, NPCs, and custom proportions ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| Streaming tuning (`ModelStreamingBehavior`, `StreamingIntegrityMode`, `StreamingMinRadius`, `StreamingTargetRadius`, `StreamOutBehavior`) | **[GA]** | Recommended low-end values in [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| `InstanceHandle` attributes (Instance references) | **[Beta]** 23 July 2026 | Official Studio Beta with no setup required; `handle:Get()` confirmed via the announcement thread. No datatype page exists in the Engine API Reference yet, so treat method specifics beyond `Get()` as unconfirmed ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)) |
| Script capabilities / sandboxed containers (`Workspace.SandboxedInstanceMode = Experimental`, `Sandboxed`, `Capabilities`) | **[Beta]** — documented as experimental | Per-container permission sets for third-party and user-generated scripts ([security.md](security.md#third-party-assets-and-script-capabilities)). Never a production default on this skill's initiative |
| `debug.dumpcodesize()` | **[GA]** | Reports natively compiled code consumption against the per-experience ceiling ([luau-language.md](luau-language.md#native-and-native-codegen)) |
| `ScriptDebuggerService` | **[Beta]** | Programmatic breakpoints and inspection |
| Input Action Manager (visual mapping editor) | **[Beta]** July 2026 | Studio tooling, not a runtime API |
| Conditional styling: `StyleQuery` (with `StyleRule` / `StyleSheet`) | **[GA]** | Documented in the Engine API Reference and present in the API dump. Property `IsActive`; methods `SetCondition`/`SetConditions`/`GetCondition`/`GetConditions`. Conditions: `MaxSize`, `MinSize`, `AspectRatioRange`, `PreferredInput`, `PreferredTextSize`, `ReducedMotionEnabled`, `ViewportDisplaySize`. A previous snapshot marked this [UNVERIFIED] as "not present" — it was present ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)) |
| Acoustic simulation with Occlusion/Reverb subcategories | **[Verify]** | Release notes 734–735, August 2026: acoustic settings divide into Occlusion and Reverb subcategories (rolling out). Confirm the target place exposes both before designing around them |
| Current engine version | Dump: **735** (`v0.735.0.7351131`), 17 August 2026. Notes: **736**, week of 24 August 2026 | The two sources disagree at this snapshot, and that is normal in the direction shown: **release notes lead the dump**, because notes ship the week the change goes live while the dump is regenerated per version. So a member announced for 736 and absent from the dump is *unconfirmed*, not absent — the same trap as step 3, from the other side. Check both: the weekly updates pages for what shipped (step 5) and `/ref/updates/` for what the dump carries. A number here is a floor, never a ceiling |

**In the dump but not yours to call.** A class appearing in the API dump is not the same as a class you may use. These were added at engine **v735** and are dead ends for experience code — do not build on them, and do not present them to the user as new capabilities:

- `ScriptScannerService` — every member carries `RobloxSecurity` and is marked hidden. Roblox-internal script scanning; a script cannot call any of it.
- `IntentService`, `BranchService` — registered as services, but each defines **zero custom members**. Empty shells with nothing to call. Their presence is a placeholder for future work, not an API.

The general rule: after step 2 confirms a member exists, check its **security tag** and whether the class has members of its own. Existence, accessibility, and usefulness are three different questions.

## Performance figures and where they come from

Numbers are engine facts too, and the same rule binds them: state the basis. Everything in the first table is published by Roblox under `create.roblox.com/docs/performance-optimization`; everything in the second is this skill's heuristic and must never be quoted as a platform limit.

**Published — quote them as facts:**

| Figure | Value | Used in |
|---|---|---|
| Frame budget | 60 FPS = **16.67 ms**; 30 = 33.33, 120 = 8.33, 240 = 4.17 | [device-performance.md](device-performance.md#the-frame-budget), [performance.md](performance.md#measurement-never-optimize-blind) |
| Baseline scene budget | **< 1,000 draw calls**, **< 1,000,000 triangles** | [device-performance.md](device-performance.md#device-tiers) |
| Server memory | `6.25 GiB + (100 MiB × largest_number_of_connected_players)`; keep usage **below 50%**; memory is not released when players leave | [performance.md](performance.md#memory) |
| Server frame rate | Heartbeat **capped at 60**; read Server Jobs → Heartbeat → Steps Per Sec | [performance.md](performance.md#measurement-never-optimize-blind) |
| Client crash rate | **Investigate above 2–3%** | [performance.md](performance.md#measurement-never-optimize-blind) |
| Device demographics | **~65% Android**; of those ~60% at 2–4 GB RAM, ~35% at 4–8 GB, ~5% above; **50%+ of players** on devices scoring **10,000–20,000** Passmark | [device-performance.md](device-performance.md#device-tiers) |
| Thermal test length | **10–15 minutes** of active gameplay | [device-performance.md](device-performance.md#device-tiers) |
| GPU wait | MicroProfiler bars turn red above **2.5 ms** GPU Wait Time | [performance.md](performance.md#measurement-never-optimize-blind) |
| Texture sizes | **≤ 512×512** for environment textures, **≤ 256×256** for minor images | [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| MicroProfiler capture limits | Server captures **≤ 60 frames**, **≤ 4 s** delay; mobile web UI defaults to **30 frames** | [performance.md](performance.md#measurement-never-optimize-blind) |

**This skill's heuristics — present them as starting points, never as limits:**

| Heuristic | Where |
|---|---|
| Script Profiler candidates at `Self Time > 5%` / `Total Time > 15%` | [performance.md](performance.md#measurement-never-optimize-blind) |
| Throttling naturally-slow work to 5–10 Hz | [performance.md](performance.md#cpu) |
| Pooling above roughly one spawn per second | [patterns/lifecycle.md](patterns/lifecycle.md#object-pooling) |
| Client bandwidth target of 30–50 KB/s per player | [device-performance.md](device-performance.md#bandwidth-per-player) |
| Client RAM 400–500 MB on the low tier; the mid/high draw-call and triangle rows | [device-performance.md](device-performance.md#device-tiers) |

**No per-tag millisecond budget exists.** Roblox publishes the frame bars and the GPU-wait rule, not "`stepHumanoid` above 2 ms". Earlier releases of this skill printed such a table; a MicroProfiler tag is a finding when it dominates a frame that missed its target, judged against that place's own baseline capture.

## Studio MCP tooling

Tool names, limits, and variants are recorded in [studio-mcp.md](studio-mcp.md) as a **July 2026 snapshot only**. Unlike engine APIs, the MCP surface has no single authority: the official built-in server, the older standalone Rust server, and community forks all expose different tools. **The connected tool list and each tool's own schema always override that file.** Never assert that an MCP tool does or does not exist based on this skill.

## Deprecated (report as findings)

- `wait`/`spawn`/`delay`, `tick`, lowercase `:connect`/`:wait`
- `Body*` movers, `Humanoid:LoadAnimation`, `Part.Velocity`/`RotVelocity`
- `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`, `Camera.CoordinateFrame`
- `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`
- InputContext/InputAction camera replication → `Player:GetCameraState()`
- `AdGui.OnAdEvent` (deprecated in release notes 734, August 2026)
- **`TeleportService:ReserveServer`** (deprecated at engine v702, December 2025) → `TeleportService:ReserveServerAsync`, or let the teleport reserve for you with `TeleportOptions.ShouldReserveServer = true` ([patterns/network.md](patterns/network.md#cross-server-communication))
- **`TeleportService:TeleportToPlaceInstance` / `TeleportToPrivateServer` / `TeleportPartyAsync`** (all deprecated at engine v735, August 2026) → `TeleportService:TeleportAsync` with a `TeleportOptions`. Plain `TeleportService:Teleport` is **not** deprecated

Discouraged-but-functional APIs are **not** in this list; the split is in [false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).

## Dates live here, and only here

**No other file in this skill carries a date or a year.** They carry the maturity tag — **[GA]**, **[Beta]**, **[Verify]**, **[UNVERIFIED]** — and link back to the row here that holds the evidence.

The reason is maintenance, not style: when a feature's status changes, exactly one file needs editing. A date copied into `luau-language.md` or `patterns/` is a second thing to remember, and the one that gets forgotten is the one that quietly starts lying. `scripts/validate-skill.py` enforces this — a four-digit year anywhere outside this file fails the check.

The same applies to "new", "recent", and "coming soon": a feature described that way stays described that way long after it stopped being true. State the tag instead.

## Maintaining this file

When a release confirms an API this skill previously told the agent to verify, move it to the correct maturity tag and update the snapshot line. Keep it a *baseline*, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version number — if it could not be confirmed, mark it **[UNVERIFIED]**.

**Record the state, not just the tag.** Every Luau row answers one question: *can someone use this in Studio today?* A row promoted on the strength of an upstream Luau release alone is a bug in this file. The promotion path is one-directional and each step needs its own evidence:

`RFC merged` → `upstream released` (a numbered `luau-lang/luau` release) → `[Verify]` → `[GA]` (a Roblox source: release notes, a DevForum announcement, or a confirmed in-Studio test)

Engine rows have their own path, and it is **not** the same one:

`release note` → `[Undocumented]` (the API dump shows the member and the version that added it) → `[GA]` (a reference page documents its semantics)

Two checks per maintenance cycle: the newest Luau release number, and the newest engine version in the dump. They move independently, and the gap between them is exactly where wrong advice comes from.

**The failure this file has actually suffered, twice.** A previous pass treated *absent from the Engine API Reference* as *does not exist*, and on that basis declared `GuiService:GetUIScaleMultiplier`, `UIShadow.Mode`, and `UIShadow.Inset`/`ShowBehindParent` to be release-note names that never shipped. All of them had shipped — v734, v732, and v733 respectively — and the claim propagated into `style-rules.md` and `false-positives.md` as an instruction to **flag correct code**. Five further rows were held at [Verify] for the same reason while already present in the dump.

The lesson is not "check harder". It is that the documentation site is a lagging index of a moving engine, and a lagging index can only ever prove presence. **Never let step 3 conclude an absence.** When a release-note name is missing from the reference, that is the moment to open the dump, not the moment to write it off.

**Refresh workflow per maintenance pass:**
1. Newest Luau release from `github.com/luau-lang/luau/releases`.
2. Newest engine version and its per-version diff from `robloxapi.github.io/ref/updates/`.
3. Newest engine notes from the weekly updates pages (step 5) — walk `Previous` back to the last covered week — for the intent behind what the dump shows, and read `/docs/updates/pending` in a browser for what is announced but not yet live.
4. Diff both against every [Undocumented]/[Verify]/[UNVERIFIED]/[Beta] row above. Promote to [Undocumented] once the dump carries the member; promote to [GA] once a reference page carries its semantics. **A row is never demoted or deleted because a reference page lacks it** — only the dump can retire a member.
5. For every newly confirmed member, check its security tag and whether its class has members of its own before writing a row.
6. Skim luau.org/news and the Creator Roadmap for status changes not yet visible anywhere else.
7. Update only the snapshot line plus affected rows — this stays a baseline, not a changelog.
