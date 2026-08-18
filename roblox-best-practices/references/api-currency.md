# API Currency — Confirmed Baseline for "Verify First"

The verify-first rule ([SKILL.md](../SKILL.md#environment--scale)) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the **baseline that rule reads against** — a dated list of what is already confirmed, so the agent stops re-litigating shipped APIs while still verifying the genuinely bleeding-edge.

**Snapshot basis: 18 August 2026.** Sources: Luau releases through **0.734** (14 August 2026), the Luau 2025 runtime recap (19 December 2025), the Luau RFC repository, and Roblox engine release notes through **734** (10 August 2026).

**Maturity tags:** **[GA]** generally available, safe as a default · **[Beta]** opt-in and may change, document as an option but never make it the default · **[Verify]** confirm in the target place before relying on it · **[UNVERIFIED]** this skill could not confirm it; treat with suspicion.

**Authority order when a claim is in doubt:** create.roblox.com Engine API Reference (primary) → the API dump / `ReflectionService` → a quick in-Studio test. Absence from this file is **not** evidence an API is missing — Roblox ships continuously; this list removes friction, it never overrides the docs.

### Upstream Luau is not Roblox Studio

**A feature shipping in a `luau-lang/luau` release does not mean it is usable in Studio.** Three distinct states, and conflating them is the most expensive mistake this file can cause:

| State | Meaning | How to treat it |
|---|---|---|
| **RFC merged** | The design was accepted. Nothing has shipped. | Not an API. Never write code against it. |
| **Upstream released** | It exists in a numbered Luau release. | Studio gets it later, or never. **[Verify]** unless a Studio source confirms it. |
| **Live in Studio** | Confirmed working in-game or in Studio. | **[GA]**, safe to use. |

The lag is real and variable: `const` took roughly two months from merged RFC (February 2026) to live in Studio (April 2026). Some upstream features never arrive at all, because they target standalone runtimes. The **Studio** column below records this state explicitly — read it before recommending anything.

## Luau language and libraries

| Area | Studio | Notes |
|---|---|---|
| `vector` library (`create`, `magnitude`, `normalize`, `dot`, `cross`, `angle`, `zero`/`one`) | **[GA]** | Native, SIMD-backed; distinct from the engine `Vector3` datatype |
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
| 64-bit integer type; `math` constants (`phi`, `sqrt2`) | **RFC merged only** | Accepted designs (RFCs #153/#176/#182 and #169, February–March 2026). **No implementation confirmed.** Do not write code against these |
| `class` syntax | **RFC merged only** | RFC #191 accepted April 2026; upstream shows early implementation work in 0.721 and nothing more. Keep using metatable OOP |

**Not applicable to Roblox Studio** despite appearing in Luau release notes: embedder C APIs (`lua_memorydump`, `lua_callhook`, `lua_atbreakpoint`, ...), double-precision vector builds (a VM build-time option), and require-by-string / `@self` (standalone runtimes; Studio resolves modules through Instances). These will never arrive — do not present them as "coming soon".

## Engine

| Area | Status | Notes |
|---|---|---|
| Server Authority (`Workspace.AuthorityMode`) | **[GA]** 9 July 2026 | **Off by default.** Full contract and the confirmation gate: [server-authority.md](server-authority.md) |
| `Player:GetCameraState()` | **[GA]** | Returns CFrame, FieldOfView, ViewportSize; replaces the deprecated InputContext/InputAction camera replication path |
| Character Controller Library (`ControllerManager`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) | **[GA]** April 2026 | `Humanoid` is **not** deprecated; CCL is a choice ([patterns.md](patterns.md#humanoid-vs-the-character-controller-library)) |
| Input Action System | **[GA]** | Mandatory under Server Authority |
| Animation Graphs | **[GA]** July 2026 | |
| Studio Script Sync (external editors, bidirectional) | **[GA]** June 2026 | A third project environment alongside Studio-native and Rojo |
| Studio CLI (`--task RunScript`, `--openScriptPath`) | **[Verify]** | Verification lever ([verification.md](verification.md#newer-verification-levers)) |
| `GroupService:GetRolesInGroupAsync(userId, groupId)` | **[GA]** | Deprecates `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` |
| Structured `LogService` `Info`/`Warn`/`Error` | **[GA]** | Instances render via `GetFullName()`; caught errors suppressed under `pcall` |
| DataStore versioning (`GetVersionAsync`, `ListVersionsAsync`, `ListKeysAsync`) | **[GA]** | |
| Unified DataStore limits and raised storage | **[Verify]** — effective **29 July 2026** | Numbers in [limits-budgets.md](limits-budgets.md#data-stores) |
| Streaming (`Model.ModelStreamingMode`, `Player:RequestStreamAroundAsync`) | **[GA]** | |
| `Player.FrustumStreaming` + `FrustumStreamingMode` enum | **[Verify]** | Release notes 734, August 2026. Streams by view frustum rather than radius alone; test the camera-turn case before adopting ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `MemoryStoreService:GetDistributedCounter` (`MemoryStoreDistributedCounter`) | **[Verify]** | Release notes 733, August 2026. A counter primitive for cross-server totals, replacing hand-rolled sorted-map arithmetic ([patterns.md](patterns.md#cross-server-communication)) |
| CollectionService tag signal methods | **[Verify]** | Release notes 732, July 2026. Additions alongside `GetInstanceAddedSignal`/`GetInstanceRemovedSignal`; confirm the exact names against the API reference before using them |
| `WorldRoot` collision groups (`RegisterCollisionGroup`, `UnregisterCollisionGroup`, ...) | **[Verify]** | Release notes 732–734. Brings `WorldModel` raycasts to parity with `Workspace` |
| `GuiService:GetUIScaleMultiplier`/`SetUIScaleMultiplier`, `UserGameSettings.UIScaleMultiplierHundredths` | **[Verify]** | Release notes 734, August 2026. A player-facing UI scale factor; read it rather than inferring scale from viewport size ([ui-ux-testing.md](ui-ux-testing.md)) |
| `ViewportCamera`, `Logger` classes | **[Verify]** | Release notes 734, August 2026. `Logger` may overlap structured `LogService`; confirm which one the target environment expects |
| `UIShadow` (`ApplyShadowMode`, `Inset`, `ShowBehindParent`, `Mode`) | **[Verify]** | Release notes 732–733 |
| EditableMesh methods promoted from Unsafe to Safe (thread safety) | **[Verify]** | Release notes 733, August 2026 |
| `Players:BanAsync`/`UnbanAsync` (`ExcludeAltAccounts`, `ApplyDeviceBlock`, `ApplyToUniverse`) | **[GA]** | |
| `game.ServerRestartScheduled` | **[GA]** | Now also fires on delayed restarts |
| Analytics: Client CPU Time Breakdown | **[GA]** | Scripts / Networking / Physics / Animation / Misc |
| `Workspace.EnableSLIMAvatars`, `Model.LevelOfDetail = SLIM` | **[GA]** | Lightweight avatar and model stand-ins under streaming. `EnableSLIMAvatars` **cannot be set from a script**; it is configured in Studio. Excludes R6, NPCs, and custom proportions ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| Streaming tuning (`ModelStreamingBehavior`, `StreamingIntegrityMode`, `StreamingMinRadius`, `StreamingTargetRadius`, `StreamOutBehavior`) | **[GA]** | Recommended low-end values in [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| `InstanceHandle` attributes (Instance references) | **[Beta]** 23 July 2026 | Option, not a default ([patterns.md](patterns.md#behavior-binding-works-with-any-framework)) |
| `ScriptDebuggerService` | **[Beta]** | Programmatic breakpoints and inspection |
| Input Action Manager (visual mapping editor) | **[Beta]** July 2026 | Studio tooling, not a runtime API |
| Acoustic simulation with Occlusion/Reverb subcategories | **[UNVERIFIED]** | Engine release notes indicate it shipped; the 2026 roadmap lists acoustic simulation as later-2026 work. Confirm before relying on it |
| Current engine release-notes version | **734**, 10 August 2026 | The latest published release notes at this snapshot. The docs pages render client-side, so read the DevForum Release Notes category instead when checking for newer ones. A number here is a floor, never a ceiling |

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

## Maintaining this file

When a release confirms an API this skill previously told the agent to verify, move it to the correct maturity tag and update the snapshot line. Keep it a *baseline*, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version number — if it could not be confirmed, mark it **[UNVERIFIED]**.

**Record the state, not just the tag.** Every Luau row answers one question: *can someone use this in Studio today?* A row promoted on the strength of an upstream Luau release alone is a bug in this file. The promotion path is one-directional and each step needs its own evidence:

`RFC merged` → `upstream released` (a numbered `luau-lang/luau` release) → `[Verify]` → `[GA]` (a Roblox source: release notes, a DevForum announcement, or a confirmed in-Studio test)

Two checks per maintenance cycle: the newest Luau release number, and the newest Roblox engine release-notes number. They move independently, and the gap between them is exactly where wrong advice comes from.
