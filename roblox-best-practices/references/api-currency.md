# API Currency — Confirmed Baseline for "Verify First"

The verify-first rule ([SKILL.md](../SKILL.md#environment--scale)) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the **baseline that rule reads against** — a dated list of what is already confirmed, so the agent stops re-litigating shipped APIs while still verifying the genuinely bleeding-edge.

**Snapshot basis: 21 August 2026.** Sources: Luau releases through **0.734** (14 August 2026), the Luau 2025 runtime recap (19 December 2025), the Luau RFC repository, and Roblox engine release notes through **735** (20 August 2026).

**Maturity tags:** **[GA]** generally available, safe as a default · **[Beta]** opt-in and may change, document as an option but never make it the default · **[Verify]** confirm in the target place before relying on it · **[UNVERIFIED]** this skill could not confirm it; treat with suspicion.

**Authority order when a claim is in doubt:** create.roblox.com Engine API Reference (primary) → the API dump / `ReflectionService` → a quick in-Studio test. Absence from this file is **not** evidence an API is missing — Roblox ships continuously; this list removes friction, it never overrides the docs.

## Contents

- [How to verify (the toolbox)](#how-to-verify-the-toolbox)
- [Luau language and libraries](#luau-language-and-libraries)
- [Engine](#engine)
- [Studio MCP tooling](#studio-mcp-tooling)
- [Deprecated (report as findings)](#deprecated-report-as-findings)
- [Dates live here, and only here](#dates-live-here-and-only-here)
- [Maintaining this file](#maintaining-this-file)

## How to verify (the toolbox)

The concrete procedures behind every tag in this file, cheapest first:

1. **This file.** A row marked [GA] is settled — do not re-litigate shipped APIs from memory.
2. **Engine API Reference as markdown.** Every reference page serves raw markdown when you append `.md` to its URL: `https://create.roblox.com/docs/en-us/reference/engine/classes/<Class>.md`, same pattern under `/enums/`, `/datatypes/`, `/libraries/`, and guide pages (`/docs/en-us/<topic>.md`). Fetch and grep for the member name — absence from the page means the member does not exist today, whatever a release note claimed. Works without Studio running.
3. **Documentation indexes.** `https://create.roblox.com/docs/llms.txt` lists every docs page; `https://create.roblox.com/docs/reference/engine/llms.txt` lists the Engine API surface. Find the slug there, then fetch that page's `.md`.
4. **DevForum Release Notes category** (`devforum.roblox.com/c/updates/release-notes`) — topic pages render server-side, unlike the client-rendered release-notes doc pages.
5. **Studio CLI API dumps.** `RobloxStudioBeta.exe --api out.json` (also `--fullApi`, `--apiV2`) writes the installed engine's API surface as JSON — ground truth for exactly the build you target.
6. **In-Studio probe.** One Edit-mode Luau call settles existence in seconds (`print(typeof(workspace.AuthorityMode))`); for behavior questions inject a real Script so it runs in the game VM ([verification.md](verification.md#studio-native--mcp-environments)).

Never assert existence or nonexistence from training memory alone. Name which step above backs an engine-fact claim, or say explicitly that it is unverified and what check would settle it.

## Luau language and libraries

| Area | Studio | Notes |
|---|---|---|
| `vector` library (`create`, `magnitude`, `normalize`, `dot`, `cross`, `angle`, `floor`, `ceil`, `abs`, `sign`, `clamp`, `lerp`, `max`, `min`, `zero`/`one`) | **[GA]** | Native, SIMD-backed; distinct from the engine `Vector3` datatype |
| `buffer` library, including `readbits`/`writebits` | **[GA]** | Binary data and network serialization; 1 GB ceiling |
| `math.map`, `math.lerp`, `math.isnan`/`isinf`/`isfinite` | **[GA]** | |
| Native codegen `--!native` and the `@native` function attribute | **[GA]** | Costs memory; reserve for compute-heavy code. `@native` is **not** recursive into nested functions |
| `@deprecated` function attribute (optional `use`, `reason`) | **[GA]** | Linter warning at call sites plus autocomplete styling. Attributes are **not** user-definable ([luau-language.md](luau-language.md#attributes)) |
| **`const` bindings** | **[GA]** April 2026 | Contextual keyword, valid wherever `local` is. Freezes the **binding**, not the value; not a substitute for `table.freeze` ([luau-language.md](luau-language.md#const-bindings)) |
| Modern syntax (interpolation, generalized iteration, `continue`, compound assignment, `//`, if-expressions, `table.freeze`) | **[GA]** | |
| `task` library (`spawn`/`defer`/`delay`/`wait`/`cancel`) | **[GA]** | The bare `wait`/`spawn`/`delay` globals remain deprecated |
| Inlining of immediately invoked lambdas; refinements preserved across loops | **[GA]** | Luau 0.730–0.731, July 2026 |
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
| `PlayerControlState` instance | **[Verify]** | Release notes 735, August 2026. Replicates scripted inputs under Server Authority ([server-authority.md](server-authority.md)) |
| Prediction introspection (`RunService.Misprediction`, `RunService.Rollback`, `RunService:GetPredictionStatus()`, `RunService:SetPredictionMode()`, `Instance.PredictionMode`) | **[GA]** | Present in the Engine API Reference; per-instance predicted-vs-authoritative data for debugging Server Authority mispredictions ([server-authority.md](server-authority.md)) |
| `Player:GetCameraState()` | **[GA]** | Returns CFrame, FieldOfView, ViewportSize; replaces the deprecated InputContext/InputAction camera replication path |
| Character Controller Library (`ControllerManager`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) | **[GA]** April 2026 | `Humanoid` is **not** deprecated; CCL is a choice ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)) |
| Input Action System | **[GA]** | Mandatory under Server Authority |
| Animation Graphs | **[GA]** July 2026 | |
| Studio Script Sync (external editors, bidirectional) | **[GA]** June 2026 | A third project environment alongside Studio-native and Rojo |
| Studio CLI (`--task RunScript --runScriptFile <path>`, `--outputFile`, `--quitAfterExecution`; `--openScriptPath`; `--api`/`--fullApi`/`--apiV2` JSON dumps) | **[GA]** | Officially documented under create.roblox.com/docs/studio/command-line-interface; scripts run at command-bar permission ([verification.md](verification.md#newer-verification-levers)). The API-dump flags are the strongest offline currency check |
| Script Editor autocomplete inserts `:` for method calls; inferred generics named `T`/`U`/`V`; compound-assignment type errors restored | **[Verify]** | Release notes 735, August 2026. Editor and analysis behavior, not runtime APIs |
| `GroupService:GetRolesInGroupAsync(userId, groupId)` | **[GA]** | Deprecates `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` |
| Structured `LogService` `Info`/`Warn`/`Error` | **[GA]** | Instances render via `GetFullName()`; caught errors suppressed under `pcall` |
| DataStore versioning (`GetVersionAsync`, `ListVersionsAsync`, `ListKeysAsync`) | **[GA]** | |
| Unified DataStore limits and raised storage | **[Verify]** — effective **29 July 2026** | Numbers in [limits-budgets.md](limits-budgets.md#data-stores) |
| Streaming (`Model.ModelStreamingMode`, `Player:RequestStreamAroundAsync`) | **[GA]** | |
| `Player.FrustumStreaming` + `FrustumStreamingMode` enum | **[Verify]** | Release notes 734, August 2026. Streams by view frustum rather than radius alone; test the camera-turn case before adopting ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `MemoryStoreService:GetDistributedCounter` (`MemoryStoreDistributedCounter`) | **[Verify]** | Release notes 733, August 2026. A counter primitive for cross-server totals, replacing hand-rolled sorted-map arithmetic ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| CollectionService tag signal methods | **[Verify]** | Release notes 732, July 2026. Additions alongside `GetInstanceAddedSignal`/`GetInstanceRemovedSignal`; confirm the exact names against the API reference before using them |
| `CollectionService:CreateCollection()` | **[Verify]** | Release notes 735, August 2026. Creates a named collection as an organizational primitive |
| `WorldRoot` collision groups (`RegisterCollisionGroup`, `UnregisterCollisionGroup`, ...) | **[Verify]** | Release notes 732–734. Brings `WorldModel` raycasts to parity with `Workspace` |
| `GuiService.PreferredTextSize` / `PreferredTransparency` / `ViewportDisplaySize` (player UI-scale and display-class preferences) | **[GA]** | Verified members of the Engine API Reference; read these instead of inferring scale from viewport size. The release-note names `Get/SetUIScaleMultiplier` and `UserGameSettings.UIScaleMultiplierHundredths` are **absent from the reference** — treat them as unshipped ([ui-crossplatform.md](ui-crossplatform.md)) |
| `ViewportCamera`, `Logger` classes | **[Verify]** | Release notes 734, August 2026. `Logger` may overlap structured `LogService`; confirm which one the target environment expects |
| `UIShadow` class (`BlurRadius`, `Color`, `Offset`, `Spread`, `Transparency`, `ZIndex`) | **[GA]** | Documented in the Engine API Reference. Earlier release-note property names (`ApplyShadowMode`, `Mode`) never shipped under those spellings; treat reference-absent names as unconfirmed |
| Child `UIGradient` over `UIShadow`; `UIShadow.Inset`/`ShowBehindParent` | **[Verify]** | Release notes 735, August 2026. Gradient-tinted and inset shadow rendering; names not yet in the Engine API Reference |
| `GuiObject.InputSink` (`Enum.InputSink`) | **[GA]** | Present in the Engine API Reference. Absorbs input at the element, replacing `Active`-style input blocking |
| EditableMesh methods promoted from Unsafe to Safe (thread safety) | **[Verify]** | Release notes 733, August 2026 |
| `Players:BanAsync`/`UnbanAsync` (`ExcludeAltAccounts`, `ApplyDeviceBlock`, `ApplyToUniverse`) | **[GA]** | |
| `game.ServerRestartScheduled` | **[GA]** | Now also fires on delayed restarts |
| Analytics: Client CPU Time Breakdown | **[GA]** | Scripts / Networking / Physics / Animation / Misc |
| `Workspace.EnableSLIMAvatars`, `Model.LevelOfDetail = SLIM` | **[GA]** | Lightweight avatar and model stand-ins under streaming. `EnableSLIMAvatars` **cannot be set from a script**; it is configured in Studio. Excludes R6, NPCs, and custom proportions ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| Streaming tuning (`ModelStreamingBehavior`, `StreamingIntegrityMode`, `StreamingMinRadius`, `StreamingTargetRadius`, `StreamOutBehavior`) | **[GA]** | Recommended low-end values in [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| `InstanceHandle` attributes (Instance references) | **[Beta]** 23 July 2026 | Official Studio Beta with no setup required; `handle:Get()` confirmed via the announcement thread. No datatype page exists in the Engine API Reference yet, so treat method specifics beyond `Get()` as unconfirmed ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)) |
| `ScriptDebuggerService` | **[Beta]** | Programmatic breakpoints and inspection |
| Input Action Manager (visual mapping editor) | **[Beta]** July 2026 | Studio tooling, not a runtime API |
| Styling system conditional styling (StyleQueries) | **[UNVERIFIED]** | Announced on the Creator Roadmap; not present in release notes or the Engine API Reference at this snapshot. Do not rely on it unverified |
| Acoustic simulation with Occlusion/Reverb subcategories | **[Verify]** | Release notes 734–735, August 2026: acoustic settings divide into Occlusion and Reverb subcategories (rolling out). Confirm the target place exposes both before designing around them |
| Current engine release-notes version | **735**, 20 August 2026 | The latest published release notes at this snapshot. The docs pages render client-side, so read the DevForum Release Notes category instead when checking for newer ones. A number here is a floor, never a ceiling |

## Studio MCP tooling

Tool names, limits, and variants are recorded in [studio-mcp.md](studio-mcp.md) as a **July 2026 snapshot only**. Unlike engine APIs, the MCP surface has no single authority: the official built-in server, the older standalone Rust server, and community forks all expose different tools. **The connected tool list and each tool's own schema always override that file.** Never assert that an MCP tool does or does not exist based on this skill.

## Deprecated (report as findings)

- `wait`/`spawn`/`delay`, `tick`, lowercase `:connect`/`:wait`
- `Body*` movers, `Humanoid:LoadAnimation`, `Part.Velocity`/`RotVelocity`
- `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`, `Camera.CoordinateFrame`
- `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`
- InputContext/InputAction camera replication → `Player:GetCameraState()`
- `AdGui.OnAdEvent` (deprecated in release notes 734, August 2026)

Discouraged-but-functional APIs are **not** in this list; the split is in [false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).

## Dates live here, and only here

**No other file in this skill carries a date or a year.** They carry the maturity tag — **[GA]**, **[Beta]**, **[Verify]**, **[UNVERIFIED]** — and link back to the row here that holds the evidence.

The reason is maintenance, not style: when a feature's status changes, exactly one file needs editing. A date copied into `luau-language.md` or `patterns/` is a second thing to remember, and the one that gets forgotten is the one that quietly starts lying. `scripts/validate-skill.py` enforces this — a four-digit year anywhere outside this file fails the check.

The same applies to "new", "recent", and "coming soon": a feature described that way stays described that way long after it stopped being true. State the tag instead.

## Maintaining this file

When a release confirms an API this skill previously told the agent to verify, move it to the correct maturity tag and update the snapshot line. Keep it a *baseline*, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version number — if it could not be confirmed, mark it **[UNVERIFIED]**.

**Record the state, not just the tag.** Every Luau row answers one question: *can someone use this in Studio today?* A row promoted on the strength of an upstream Luau release alone is a bug in this file. The promotion path is one-directional and each step needs its own evidence:

`RFC merged` → `upstream released` (a numbered `luau-lang/luau` release) → `[Verify]` → `[GA]` (a Roblox source: release notes, a DevForum announcement, or a confirmed in-Studio test)

Two checks per maintenance cycle: the newest Luau release number, and the newest Roblox engine release-notes number. They move independently, and the gap between them is exactly where wrong advice comes from.

**Refresh workflow per maintenance pass:**
1. Newest Luau release from `github.com/luau-lang/luau/releases`.
2. Newest engine notes from the DevForum Release Notes category.
3. Diff new notes against every [Verify]/[UNVERIFIED]/[Beta] row above — promote what shipped, and re-check any row whose evidence was a release note alone against the Engine API Reference `.md` page before promoting. Two rows failed exactly this check before (UIShadow property names; GuiService scale methods): release-note names are provisional until the reference confirms them.
4. Skim luau.org/news and the Creator Roadmap for status changes not yet visible in release notes.
5. Update only the snapshot line plus affected rows — this stays a baseline, not a changelog.
