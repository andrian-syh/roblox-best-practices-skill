# API Currency: the confirmed baseline for "verify first"

The verify-first rule (invariant card item 11) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the dated baseline that rule reads against, so settled APIs are not re-checked and the newest ones still are.

**Snapshot: 8 November 2026.** Engine and API dump **746** (Studio `0.746.0.7461269` in the mirror's `version.txt`; first 746 build 3 November 2026, live in `setup.rbxcdn.com/DeployHistory.txt`; dump from the `MaximumADHD/Roblox-Client-Tracker` mirror); release notes 746 and weekly notes through **2 November 2026**; Luau **0.746** (7 November 2026); the deprecation index; Studio probes on build 745. Platform, MCP, and Open Cloud rows carry their own dates.

**Maturity tags**

| Tag | Meaning |
|---|---|
| **[GA]** | Generally available. Safe as a default. |
| **[Beta]** | Opt-in and may change. Document as an option, never as the default. |
| **[Undocumented]** | In the API dump with a known version, but no reference page yet. Usable. |
| **[Verify]** | Confirm in the target place before relying on it. |
| **[UNVERIFIED]** | Could not be confirmed. Treat with suspicion. |

**Which source settles what**

- **Does it exist?** The versioned API dump. It leads the documentation site by weeks to months.
- **What does it do?** The Engine API Reference on create.roblox.com.
- **How does it behave here?** An in-Studio probe.

The documentation site lags the engine, so a member missing from a reference page is undocumented, not unshipped. Absence from this file proves nothing either.

## Contents

- [How to verify (the toolbox)](#how-to-verify-the-toolbox)
- [Luau language and libraries](#luau-language-and-libraries)
- [Engine](#engine)
- [Performance figures and where they come from](#performance-figures-and-where-they-come-from)
- [Studio MCP tooling](#studio-mcp-tooling)
- [Publishing platform state](#publishing-platform-state)
- [Deprecated (report as findings)](#deprecated-report-as-findings)
- [Dates live here, and only here](#dates-live-here-and-only-here)
- [Maintaining this file](#maintaining-this-file)

## How to verify (the toolbox)

Cheapest first:

1. **This file.** A [GA] row is settled.
2. **The versioned API dump** (existence). `https://robloxapi.github.io/ref/class/<Class>.html` shows every member with the engine version that added it; `/ref/updates/` indexes changes by version. Use it for any name a few months old or newer, and whenever a reference page misses something a release note announced.
3. **The Engine API Reference as Markdown** (semantics). Append `.md` to a page URL: `https://create.roblox.com/docs/en-us/reference/engine/classes/<Class>.md`, and the same under `/enums/`, `/datatypes/`, `/libraries/`, and guides. Grep for the member. Absence here never proves absence from the engine.
4. **Documentation indexes.** `https://create.roblox.com/docs/llms.txt` lists every page, and `/docs/reference/engine/llms.txt` the documented Engine API. Same caveat as step 3.
5. **Release notes.** Three pages answer three different questions (structure documented at `https://create.roblox.com/docs/releases`):

   | Page | URL | Answers | How to read |
   |---|---|---|---|
   | Versioned | `/docs/release-notes/release-notes-<N>` | What version N introduced, live and pending, each with a `Status` | No `.md`. Read `props.pageProps.data.releaseNoteContents.content` from `<script id="__NEXT_DATA__">` |
   | Weekly | `/docs/updates/<YYYY-MM-DD>` (Mondays) | What went live that week | Fetch the `.md`; the HTML tables render client-side |
   | Pending | `/docs/updates/pending` | Introduced but not live yet | No `.md`. Read `props.pageProps.data.pendingReleaseContents` (`introducedInVersion`) |

   "Introduced in version N" is not "available in version N": code ships behind a flag and turns on later. Leaving the pending list does not mean live; confirm on a weekly page. Never size a version from a weekly page, since it lists only what went live. The DevForum release-notes topics add flag names and staff replies. A name from any release note is provisional until step 2 confirms it.
6. **Studio CLI dumps.** `RobloxStudioBeta.exe --api out.json` (also `--fullApi`, `--apiV2`) writes the installed build's API surface, the same ground truth as step 2 for exactly the build you target.
7. **In-Studio probe.** A bare read can throw a capability error from the command bar, a plugin, or MCP `execute_luau`, so wrap it and classify the failure:

   ```lua
   local function probe(obj, name)
       local ok, res = pcall(function() return obj[name] end)
       if ok then return "PRESENT", typeof(res) end
       local msg = tostring(res)
       if msg:find("lacking capability") then
           return "GATED", msg:match("lacking capability (%w+)")
       elseif msg:find("is not a valid member") then
           return "UNREADABLE-HERE", "absent, or hidden from this security context"
       end
       return "ERROR", msg
   end
   ```

   | Result | Proves |
   |---|---|
   | `PRESENT` | Exists and is readable here. Readable is not callable: `workspace.Simulate` reads as a function, yet calling it throws `lacking capability RobloxEngine`. |
   | `GATED` | Exists; the named capability is missing. |
   | `UNREADABLE-HERE` | Nothing. A fabricated name and a real hidden member return the same thing. |

   The command bar, plugins, and MCP run above shipped code, so `PRESENT` does not mean a live `Script` can use it. For behavior, inject a real Script ([verification.md](verification.md#studio-native--mcp-environments)).

Name the step behind every engine-fact claim, or say it is unverified and what would settle it. **Existence needs step 2, 6, or 7. Nonexistence needs step 2 or 6.** Steps 3 to 5 prove neither, and step 7 cannot prove a negative.

## Luau language and libraries

**Settled [GA], no check needed:** the `vector` library (native, SIMD-backed, distinct from `Vector3`); `table.clone`, `table.isfrozen`, `table.freeze`; `buffer` including `readbits`/`writebits` (1 GB ceiling); `math.map`, `math.lerp`, `math.isnan`/`isinf`/`isfinite`, and the constants `phi`, `sqrt2`, `e`, `nan`, `tau`; the `task` library (the bare `wait`/`spawn`/`delay` globals stay deprecated); string interpolation, generalized iteration, `continue`, compound assignment, `//`, if-expressions; `--!native` and `@native` (costs memory, not recursive into nested functions); `@deprecated` (attributes are not user-definable, [luau-language.md](luau-language.md#attributes)).

| Area | Status | Notes |
|---|---|---|
| `const` bindings | **[GA]** April 2026 | Valid wherever `local` is. Freezes the binding, not the value ([luau-language.md](luau-language.md#const-bindings)) |
| New type solver | **[GA]** default for `nocheck`/`nonstrict`; opt-in for `strict` | General release 20 November 2025. `UseNewLuauTypeSolver`, `LuauTypeCheckMode`; old solver available through 2026 ([luau-language.md](luau-language.md#the-new-type-solver-what-is-on-by-default)) |
| Read-only and write-only members (`{ read x: T }`, `{ read [K]: V }`, `write`) | **[GA]**, new solver | Luau 0.721 (May 2026); clearer mutation errors in the weekly update of 12 October 2026 |
| `pcall`/`xpcall` inside `type function` | **[GA]**, new solver | Luau 0.734; live in Studio the week of 10 August 2026 |
| Stricter checking inside generic function bodies | **[GA]**, behavior change | Release notes 739. `function call<T>(f: (T) -> T) f(nil) end` no longer type checks. The new error is correct ([false-positives.md](false-positives.md)) |
| Cheaper `pcall`/`xpcall` (`LOP_FASTPCALL`) | **[GA]** | Luau 0.735 (August 2026), about half the old overhead. Never strip a `pcall` for cost ([false-positives.md](false-positives.md)) |
| `coroutine.finally(co, callback)` | **[GA]** | RFC #187 merged 16 October 2026, shipped without Beta, probed in Studio 745. The callback gets `"finished"` plus the return values, `"error"` plus the error, or `"cancelled"` (`coroutine.close`, `task.cancel`). Runs at most once, last registered first, may yield. An error in one callback stops the rest. Registering on a dead coroutine errors; a coroutine with callbacks finishing through `coroutine.wrap` raises "cannot run finalizers from a wrapped coroutine" |
| Script Editor: `:` on method autocomplete, generics shown as `T`/`U`/`V`, `require(instance:GetAttribute("ModuleRef"))` resolved | **[GA]** | Luau 0.735 and the weekly update of 5 October 2026. Editor behavior, not a runtime API |
| `if local` / `if const` bindings | **[Beta]** 6 October 2026 | Studio Beta toggle "If Local/Const Bindings" ([DevForum](https://devforum.roblox.com/t/beta-if-local-statements-and-expressions/4918297)). One name and value per condition, truthiness only, no multi-return. Live-server support unannounced: never write it into shipping code unasked, never flag it where a project uses it. StyLua 2.6.0 and selene 0.32.0 parse it |
| `while local` / `while const` loops; private class fields | **Experimental upstream** | `while local` parses from Luau 0.745 and is announced as supported in 0.746 (7 November 2026); private fields runtime in 0.744. No Roblox Studio announcement yet: not for Roblox code |
| `table.create`/`table.clear` fastcalls; hot-function promotion in native codegen | **[Verify]** | Luau 0.745. Roblox `@native` behavior unconfirmed; no code change |
| Yielding inside custom iterators | **[Verify]** | Luau 0.722 (May 2026) |
| `declare extern type` (replaces `declare class`) | **[Verify]** | Old spellings removed in Luau 0.727 (June 2026). Hand-written declaration files only |
| `export` value semantics (exports `const` by default) | **[Verify]** | Luau 0.723 (May 2026), Studio unconfirmed. Keep `local M = {} ... return M` |
| User-defined `type function`, `keyof`, `issubtypeof` | **[Verify]**, new solver | `issubtypeof` in Luau 0.724 (June 2026) |
| Faster table access, metamethod dispatch, `table.find`; register reuse against the 200-local limit | **[Verify]** | Release notes 739 and Luau 0.741 to 0.743. A reason to freeze class metatables, never to restructure working code ([performance.md](performance.md)) |
| `class` syntax | **RFC merged only** | RFC #191 (April 2026); the prototype continues in Luau 0.746 (RFC PR #242) behind `DebugLuauUserDefinedClasses` debug flags. Keep metatable OOP |
| 64-bit integer type | **Cancelled** | Withdrawal proposed in RFC PR #269 (29 October 2026, PR open); release 746 or 747 is the last with flagged support. Do not write code against `integer` |
| Exact table types | **Abandoned** | RFC #11 closed unmerged 28 October 2026. Do not present as coming |

**Not for Roblox** despite appearing in Luau release notes: embedder C APIs (`lua_memorydump`, `lua_callhook`, ...), double-precision vector builds, and the `@self` require alias. One require alias does apply: experiences opted into `PlayerScriptsUseInputActionSystem` can `require("@rbx/PlayerModule")` (release notes 735). `loadstring` leaving the upstream type definitions (Luau 0.742) does not affect `ServerScriptService.LoadStringEnabled`.

## Engine

**Settled [GA], no check needed:** `TextChatService` as the only chat (legacy removed 30 April 2025); Character Controller Library (`ControllerManager`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`; `Humanoid` is not deprecated, [patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)); Input Action System (`InputAction`, `InputContext`, `InputBinding`); Animation Graphs; `GroupService:GetRolesInGroupAsync`; structured `LogService`; DataStore versioning (`GetVersionAsync`, `ListVersionsAsync`, `ListKeysAsync`), `BatchGetAsync`, `DataStoreGetOptions.UseCache`, `GetRequestBudgetForRequestType`; Extended Services; streaming (`ModelStreamingMode`, `RequestStreamAroundAsync`, `ModelStreamingBehavior`, `StreamingIntegrityMode`, `StreamOutBehavior`); `Players:BanAsync`/`UnbanAsync`; `game.ServerRestartScheduled` (also on delayed restarts); `SceneAnalysisService` ([performance.md](performance.md#measurement-never-optimize-blind)); `ImprovedPhysicsReplication`; regional pricing ([monetization-policy.md](monetization-policy.md#choosing-the-product-type)); `Player:GetCameraState()`; `InputAction.DisplayName`; `DataStoreService:SetRateLimitForRequestType()`; RTBF deletion templates ([patterns/data.md](patterns/data.md#deleting-data-on-request-rtbf)); `Workspace:ApplyRecommendedStreamingSettings()` (plugin); `Workspace.PhysicsSteppingMethod` (`Default` is `Adaptive`); `LayerCollector:GetGuiObjectsAtPosition`; `Logger`; Studio CLI ([verification.md](verification.md#newer-verification-levers)); DataStore limits ([limits-budgets.md](limits-budgets.md#data-stores)); `CollectionService:GetCollections`; Analytics Client CPU Time Breakdown; `Enum.GradientType.Elliptical` (`UIGradient.Type`, `Scale`, `TileMode` visible in Properties since v746); `debug.profilebegin`/`profileend`, `debug.setmemorycategory`, `debug.dumpcodesize`; `Path2D`, `CanvasGroup`, `VideoFrame` (format, five-minute, two-concurrent limits); `UIShadow`; UI styling (`StyleSheet`, `StyleRule`, `StyleLink`, `StyleDerive`, `StyleQuery` with conditions `MaxSize`, `MinSize`, `AspectRatioRange`, `PreferredInput`, `PreferredTextSize`, `ReducedMotionEnabled`, `ViewportDisplaySize`; tokens, themes, transitions, [ui-crossplatform.md](ui-crossplatform.md#the-styling-system)); `GuiService.PreferredTextSize`, `PreferredTransparency`, `ViewportDisplaySize`; CollectionService `TagAdded`/`TagRemoved` (they fire when a tag enters or leaves use across the place; per-instance binding is `GetInstanceAddedSignal`/`GetInstanceRemovedSignal`).

| Area | Status | Notes |
|---|---|---|
| `PlayerCharacterDestroyBehavior` `Default` = `Enabled` | **Scheduled** for 11 November 2026 (announced 4 November) | [DevForum](https://devforum.roblox.com/t/4975616). `Player` destroyed 5 s after `PlayerRemoving` handlers, character right after `CharacterRemoving`; late child reads and reparenting fail. `Disabled` is a temporary opt-out ([patterns/data.md](patterns/data.md)) |
| `*Content` property save | **[GA]** 11 November 2026 | [DevForum](https://devforum.roblox.com/t/4975546). Studio saves `MeshContent`, `TextureContent`, `ImageContent`; legacy names keep working, so never a finding. Rojo 7.7.1+ ([external-editors.md](external-editors.md#rojo)) |
| `DataModel.ServerLowMemoryWarning` | **[GA]** | Dump 745; live 2 November 2026 ([DevForum](https://devforum.roblox.com/t/4972486), titled `ServerMemoryWarning`; dump wins). Re-fires every 60 s ([performance.md](performance.md#memory)) |
| `Color3:GetContrastingColor(...: Color3)`, `GetContrastRatio(other: Color3)` (1 to 21, WCAG), `GetLuminance()` (0 to 1) | **[GA]** | Documented. 3 November 2026 ([DevForum](https://devforum.roblox.com/t/4974212)) |
| Server Authority (`Workspace.AuthorityMode`) | **[GA]** 9 July 2026 | Off by default. Full contract and confirmation gate: [server-authority.md](server-authority.md) |
| Prediction introspection (`RunService.Misprediction`, `.Rollback`, `GetPredictionStatus`, `SetPredictionMode`, `Instance.PredictionMode`) | **[GA]** | For debugging mispredictions ([server-authority.md](server-authority.md)) |
| `ControlState` + `StateSchema` (replaced `PlayerControlState`) | **[Undocumented]** | `PlayerControlState` added v735, removed v738: **do not write it**. `ControlState` is constructible and has `Owner`, `GetState`, `GetChangedState`, `SetField`, `UpdateFields`, `GetReplicationWeight`, `OnStateChanged` (probed v739). `StateSchema` (`Add*Field`) is not constructible with `Instance.new`; find how it is obtained first |
| `Workspace.ReplicationFrequency`, `ReplicationThroughput`, `Enum.ReplicationMode` | **[Undocumented]** | v742; weekly update of 5 October 2026 under `NextGenerationReplication` |
| Updated TextChatService (`PlatformIntegratedChat`, `TextChannelWindow`, `TextChannel.AddPlayersOnJoin`) | Opt-in now; automatic February 2027; required May 2027 | Announced 21 October 2026 ([DevForum](https://devforum.roblox.com/t/-/4948433)). Opted in: `TextChatMessage.Text`, `.Translation`, `.PrefixText` read `""`, and `OnIncomingMessage` and `Player.Chatted` give no content. All user chat through a `TextChannel`; non-chat text surfaces update at most once a minute. Opt out with `PlatformIntegratedChat = Disabled` until March or May 2027 (the post gives both) ([security.md](security.md#user-generated-text-filtering)) |
| Custom chat gates | **[GA]** | `TextChatService:CanUserChatAsync` and `CanUsersDirectChatAsync` (the announcement's `CanUserDirectChatAsync` is wrong; the reference wins) ([security.md](security.md#user-generated-text-filtering)) |
| Device Trust (`IntegrityService.EvaluatePlayerDeviceTrust`, `Player.DeviceTrustLevel`) | **[GA]**, Android and web only | 27 October 2026 ([DevForum](https://devforum.roblox.com/t/-/4961129)). `Unknown`, `None`, `Standard`, `Full`; `Unknown` on unsupported platforms. Server-side only ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| Orthographic camera (`Camera.ProjectionType`, `OrthographicMode`, `OrthographicSize`, `ViewStretch`) | **[Beta]**, Studio only | 30 October 2026. Published games cannot use it yet; API may change |
| Studio Script Sync | **[GA]** 17 June 2026 | Syncs `Script`, `LocalScript`, `ModuleScript`, `Folder` only; attributes and tags on synced scripts are lost; 10,000 scripts per top-level instance, 128 top-level instances; no debugger control ([external-editors.md](external-editors.md#studio-script-sync)) |
| `InstanceFileSyncService` (`GetStatus`, `GetSyncedInstance`, `GetAllInstances`) | **[GA]** | PluginSecurity: command bar, plugin, or MCP only |
| Rojo `syncback` | **[GA]**, Rojo 7.7.0 (1 July 2026) | The supported way to pull a place into a project (`syncbackRules`). Live Two-Way Sync stays experimental ([external-editors.md](external-editors.md#rojo)) |
| `HttpService:GetSecret()`, `Secret` (`AddPrefix`, `AddSuffix`) | **[GA]** | Unreadable from Luau, domain-scoped. Local playtests need **Local Secrets** (File, Experience Settings, Security) or fail with `Can't find secret with given key` |
| Studio-only settings | **[GA]** | Scripts cannot set `PhysicsSteppingMethod`, `EnableSLIMAvatars`, or `AuthorityMode` (readable from scripts since v746). `StreamingMinRadius`, `StreamingTargetRadius`, `StreamingIntegrityMode`, `StreamOutBehavior`, `PredictiveStreamingMode` are `PluginOrOpenCloud` since v746: plugins, MCP, Open Cloud only. `StreamingEnabled` and `LuauTypeCheckMode` show `WriteSecurity: None` but stay place settings in practice. `StarterPlayer.CreateDefaultPlayerModule` is `PluginOrOpenCloud`. Wrap reads in the probe |
| Script-writable since v740 to v742 | **[GA]** | `Lighting.LightingStyle`, `PrioritizeLightingQuality`, `PartOperation.RenderFidelity`, `SmoothingAngle`, `TriangleMeshPart.CollisionFidelity`, `FluidFidelity`, `MeshPart.RenderFidelity`, `Model.LevelOfDetail`, `Workspace.FallHeightEnabled`, `FallenPartsDestroyHeight` |
| `Workspace.EnableSLIMAvatars`, `Model.LevelOfDetail = SLIM` | **[GA]** | Studio setting only. Excludes R6, NPCs, custom proportions ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| Streaming low-end values | **[GA]** | In [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| `Instance:QueryDescendants()` | **[GA]** | Spatial radius filter and inferred return types (21 September, 5 October 2026) |
| `Player.FrustumStreaming`, `FrustumStreamingMode` | **[GA]** | v734. `Default` behaves like `Disabled`. Test camera turns first ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `Player:GetFriendsInUniverseAsync()`, `GetFriendsInServerAsync()` | **[Undocumented]** | v735, v741. Both yield; wrap in `pcall` |
| `RunService:BindToAnimation()`, `BindToAnimationParallel()` | **[GA]** | v738. `(function, frequency?: StepFrequency, priority?: int): RBXScriptConnection`. The pre-animation sibling of `BindToSimulation` ([performance.md](performance.md)) |
| `Workspace.StreamingAdaptiveRadius` | **[Undocumented]** | v738. A boolean; from v746 it reads and writes only from a plugin or Open Cloud (`PluginOrOpenCloud`, like the other streaming properties). Behavior undocumented ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `WorldRoot:Simulate()`, `AutoSimulate`, `SimulationRate`, `GravityDirection`, `Wind`, `WindDirection` | **[Undocumented]**, gated | v737 to v738. Release notes 737 call them scriptable; the engine throws `lacking capability RobloxEngine` (probed v739). **Do not write them**; manual stepping is not available |
| `QueueService` / `StandardQueue` | **[Undocumented]** | v739. Quotas, durability, and delivery guarantees undescribed ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| `TeleportOptions.ReservedServerId`, `.VipServerId` | **[GA]** | v740, announced 28 October 2026 ([DevForum](https://devforum.roblox.com/t/-/4963250)). A GUID string: `HttpService:GenerateGUID(false)` for a new reserved server, or a stored `game.PrivateServerId`. Set at most one. Handle `TeleportInitFailed` |
| `Player.PauseTeleports` | **[Undocumented]** | v738, an event, still `RobloxSecurity` at v745 |
| `Workspace.UseInputSink`, `PrimalPhysicsSolver` (+ enum) | Removed | v746. **Do not write them**; `InputSinkEnabled` (RobloxScript) and `NextGenerationPhysicsSolver` (PluginOrOpenCloud) are not script levers |
| `AnimatedImage`, `Enum.AnimatedImagePlaybackState` | Removed | Added v738, removed v742. **Do not write them** |
| `TestService` suite runner (`RegisterSuite`, `RegisterTest`, `RunTestsAsync`, `TestSuite`, `TestCase`, `TestResult`) | **[Undocumented]**, still moving | v741 to v745. `RegisterTest(testName, callback, options?)` since v745. `TestCase:Require`/`Check(actual, expected, message?)` since v743 (old form: `RequireLegacy`). `TestExecutionContext:Skip(reason)` since v745. Read the dump before writing a call |
| `MemoryStoreService:GetDistributedCounter` (`MemoryStoreDistributedCounter`) | **[Undocumented]** | v733. Cross-server totals without sorted-map arithmetic ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| `CollectionService:CreateCollection(query, root?)`, `Collection` | **[Verify]**, not enabled | v734. Documented: `Enabled`, `ForEach`, `Destroy`, and one-time callbacks `OnAdded`, `OnRemoved`, `OnHeartbeat`, `OnPreRender`, `OnPreAnimation`, `OnPreSimulation`, `OnPostSimulation`, `OnSimulate`. No `Root`, `Query`, `Id`, `GetSize`, `GetCount`. Studio 745 raises `Collections are not enabled`. Keep tag signals as the default |
| `WorldRoot` collision groups | **[GA]** | v732 to v734. The setter is `CollisionGroupSetCollidable`, **not** `SetCollisionGroupsCollidable` |
| `GuiService:SetUIScaleMultiplier()`, `GetAutoUIScaleHundredths`, `GetEffectiveUIScaleHundredths` | **[Undocumented]**, RobloxScriptSecurity | v734 to v738 (`GetUIScaleMultiplier` removed v738). Shipped code cannot call them; read `GuiService.PreferredTextSize` instead ([ui-crossplatform.md](ui-crossplatform.md)) |
| `ViewportCamera` | **[Undocumented]** | v734. Studio upgrades pasted `Camera` under `ViewportFrame` to it (28 September 2026) |
| `AudioWindSynthesizer`; `AudioTextToSpeech.AutoLocalize` | **[Undocumented]**; **[GA]** | v734; v740, live 21 September 2026 |
| `UIBlur`, `Enum.UIBlurStrength` | **[Undocumented]** | v742 |
| `UIShadow.Inset`, `ShowBehindParent`, `Mode` (`Enum.ApplyShadowMode` `Shape` or `Text`) | **[GA]** | Documented. `Mode = Text` shadows the glyphs of a `TextLabel`, `TextButton`, or `TextBox`; `Spread`, `Inset`, and `ShowBehindParent` do nothing in text mode ([ui-crossplatform.md](ui-crossplatform.md#appearance-modifiers)) |
| `UIFlexItem` (`FlexMode`), `UIListLayout.HorizontalFlex`/`VerticalFlex`/`ItemLineAlignment`/`Wraps` | **[GA]** | **There is no `UIFlexLayout` class** |
| `UIDragDetector` / `DragDetector` | **[GA]** | `RunLocally = true` replicates nothing ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| `StarterGui.ClipsDescendantsSupportsRotation` | **[GA]** | Without it, rotated descendants are not clipped; rounded clipping needs a `CanvasGroup` |
| `GuiObject.InputSink` (`None`, `Activate`, `All`); `GuiObject.Sink` | **[GA]**; **[Verify]** | Write `InputSink`; defaults to `None` (probed v739). `InputSink` is `[NotReplicated]` and unsaved since v738. `Sink` is in the dump (v738) but unreadable from MCP. Never flag either as nonexistent |
| EditableMesh and EditableImage | **[GA]** | Safe for parallel use since v734; ID and 13+ requirements removed 28 September 2026 |
| Terrain water flow methods | **[Undocumented]** | v735 |
| `Stats:GetMemoryUsageMbFiltered()`, `GetMemoryUsageMbAllCategoriesFiltered()` | **[Undocumented]** | v742 (`Core`, `Developer`, `All`) |
| `InstanceHandle` attributes | **[Beta]** 23 July 2026 | `InstanceHandle.new(instance?)`, `Get()`, `Wait(timeout?)`. A weak reference, never `nil` itself. Pass a timeout to `Wait` ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)) |
| Script capabilities (`Workspace.SandboxedInstanceMode = Experimental`) | **[Beta]** | Never a production default unasked ([security.md](security.md#third-party-assets-and-script-capabilities)) |
| `ScriptDebuggerService` | **[Beta]** | Programmatic breakpoints |
| Input Action Manager | **[GA]** 29 October 2026 | Studio mapping editor, Window > Input > Actions |
| Acoustic Occlusion and Reverb subcategories | **[Verify]** | Release notes 734 to 735, rolling out |

**In the dump but not yours to call.** These are dead ends for experience code; never present them as new capabilities:

- `ScriptScannerService` (v735), `ProjectService` (v741), `FriendsCallingInstance`/`FriendsCallingParticipant` (v741), `ModerationService` (v742), `AnimationPlayer` (v742): every member is `RobloxSecurity` or `RobloxScriptSecurity`. `Player:GetGlobalUserId()` (v734) is `RobloxScriptSecurity`; keep `UserId`.
- `IntentService`, `BranchService` (v735), `BackendReplicatedStorage`, `BackendServerScriptService`, `BackendServerStorage` (v741): no members of their own. `SnippetService` was removed at v740.

After step 2 confirms a member exists, check its security tag and whether the class has members. Existence, access, and usefulness are separate questions.

## Performance figures and where they come from

Published by Roblox under `create.roblox.com/docs/performance-optimization`. **Quote these as facts:**

| Figure | Value | Used in |
|---|---|---|
| Frame budget | 60 FPS = **16.67 ms**; 30 = 33.33, 120 = 8.33, 240 = 4.17 | [device-performance.md](device-performance.md#the-frame-budget) |
| Baseline scene budget | **< 1,000 draw calls**, **< 1,000,000 triangles** | [device-performance.md](device-performance.md#device-tiers) |
| Server memory | `6.25 GiB + (100 MiB × largest_number_of_connected_players)`; keep **below 50%**; not released when players leave | [performance.md](performance.md#memory) |
| Server frame rate | Heartbeat **capped at 60**; Server Jobs → Heartbeat → Steps Per Sec | [performance.md](performance.md#measurement-never-optimize-blind) |
| Client crash rate | Investigate **above 2–3%** | [performance.md](performance.md#measurement-never-optimize-blind) |
| Devices | **~65% Android**; of those ~60% at 2–4 GB RAM, ~35% at 4–8 GB; **50%+** of players at **10,000–20,000** Passmark | [device-performance.md](device-performance.md#device-tiers) |
| Thermal test | **10–15 minutes** of active play | [device-performance.md](device-performance.md#device-tiers) |
| GPU wait | Red above **2.5 ms** in the MicroProfiler | [performance.md](performance.md#measurement-never-optimize-blind) |
| Textures | **≤ 512×512** environment, **≤ 256×256** minor images | [device-performance.md](device-performance.md#engine-levers-before-script-levers) |
| MicroProfiler captures | Server **≤ 60 frames**, **≤ 4 s** delay; mobile web UI **30 frames** | [performance.md](performance.md#measurement-never-optimize-blind) |

This skill's heuristics. **Present these as starting points, never as limits:** Script Profiler candidates at `Self Time > 5%` or `Total Time > 15%`, throttling slow work to 5–10 Hz ([performance.md](performance.md#cpu)); pooling above about one spawn per second ([patterns/lifecycle.md](patterns/lifecycle.md#object-pooling)); 30–50 KB/s client bandwidth ([device-performance.md](device-performance.md#bandwidth-per-player)); 400–500 MB client RAM on the low tier and the mid and high tier rows ([device-performance.md](device-performance.md#device-tiers)).

Roblox publishes no per-tag millisecond budget. A MicroProfiler tag is a finding only when it dominates a frame that missed its target, judged against that place's own baseline.

## Studio MCP tooling

The tool list in [studio-mcp.md](studio-mcp.md) is a snapshot of **31 October 2026**: `create.roblox.com/docs/studio/mcp` and the live schemas of Studio 745. **The connected tool list and each tool's schema always override it.** Never say an MCP tool does or does not exist on the strength of this skill.

- **Tools.** On 31 October 2026 the live server listed 33 tools, 8 beyond the docs page: `generate_texture`, `generate_scene`, `segment_mesh`, `auto_setup_avatar`, `generate_avatar` (beta, 29 October 2026), `list_skills`, `create_skill`, `edit_skill`. Every call carries `studio_id` since 19 August 2026, when `set_active_studio` was removed. External clients connect without opening Assistant since 21 September 2026. The Assistant plugin updates over the air, so behavior can change without an engine release.
- **Probed in Studio 745 (31 October 2026).** Each `execute_luau` call is its own change-history recording (`TryBeginRecording` returns `nil`), and `ChangeHistoryService:Undo()` in the next call reverts it. During play, a Script parented to `ServerScriptService` and a LocalScript parented to `PlayerGui` run; a LocalScript parented to `StarterPlayerScripts` does not.
- **Other servers.** `Roblox/studio-rust-mcp-server` was archived on 3 April 2026. Forks expose their own tool sets.
- **`open_cloud_invoke` and MCP Permissions (documented 4 November 2026).** [mcp-open-cloud](https://create.roblox.com/docs/studio/mcp-open-cloud) and DevForum [4975849](https://devforum.roblox.com/t/4975849): a Studio-managed token holds only the scopes enabled for the current game; grants are per game and per person, for external clients only; access levels Safe, Balanced (the default), Full access, and Custom (in the docs by 8 November 2026); nine sections, five high-impact; some scopes are never grantable; data stores and memory stores go through `execute_luau` with **Enable Studio Access to API Services**; **Connect to the internet** gates `HttpService`; uploads are permanent. Skills `rbx-open-cloud-usage`, `rbx-permissions`, `rbx-import-asset`. `openapi.json` lists every operation with `x-roblox-scopes`. The Safe, Balanced, Full access presets seen on 3 November 2026 are not in the docs.
- **Probed in a private experience (3 November 2026), now explained.** A denied scope fails before the request and again at the server. Studio enforces upload folders. `universe-messaging-service:publish` succeeds with no dialog. Data store reads returned 403 even when granted: by design, they go through `execute_luau`. The `Edit` DataModel was refused `DataStoreService` (**[Verify]** with Studio API access on); the `Server` DataModel in play was not. Usage: [open-cloud.md](open-cloud.md).

## Publishing platform state

Dates behind [publishing.md](publishing.md), [live-ops.md](live-ops.md), [growth-apis.md](growth-apis.md), and the policy parts of [monetization-policy.md](monetization-policy.md). **Snapshot: 1 November 2026**, from Creator Hub, staff DevForum posts, and the Q2 and Q3 2026 shareholder letters. Policy has no version dump, so re-read the linked page before quoting a number.

| Fact | State | Source |
|---|---|---|
| Recommended for You uses a 28-day window, up from 7, and favors retentive games | Since 15 June 2026 | [Roblox newsroom](https://about.roblox.com/newsroom/2026/06/optimizing-discovery-great-games-reach-millions-players-roblox) |
| Deep play-through rate and 7-day qualified play sessions are signals; "Not interested" feedback integrated | 9 and 26 March 2026 | [DevForum](https://devforum.roblox.com/t/-/4502571) |
| Gameplay video autoplays in Recommended for You | Since 29 July 2026 | [DevForum](https://devforum.roblox.com/t/-/4502571) |
| Roblox Kids (5 to 8), Roblox Select (9 to 15), standard (age-checked 16+); a new game reaches 16+ only until it passes evaluation | Global since 16 June 2026 | [DevForum](https://devforum.roblox.com/t/-/4685717) |
| Evaluation threshold: docs (rechecked 8 November 2026) say 250 unique plays by highly engaged age-checked users in 60 days; the staff post says 500 Highly Engaged Players | **[Verify]** conflict; read the Audience Reach dashboard | [Kids and Select](https://create.roblox.com/docs/production/publishing/kids-and-select) |
| Expedited review fee: docs say 50,000 Robux refundable; the staff post says 100,000 | **[Verify]** conflict | same |
| Social media links shown only to age-checked users 16+ | Since 30 June 2026 (13+ from 23 February 2026) | [DevForum](https://devforum.roblox.com/t/-/4685717) |
| Links, handles, and invites inside experiences banned; `AllowedExternalLinkReferences` returns an empty list | Early 2026, announced 18 November 2025 | [DevForum](https://devforum.roblox.com/t/-/4079702) |
| Chat needs an age check worldwide | Since January 2026 | [DevForum](https://devforum.roblox.com/t/-/4079702) |
| Paid random items: per-item odds before purchase; numeric disclosure of luck boosts and pity | Clarified 26 May 2026 | [DevForum](https://devforum.roblox.com/t/-/4654622) |
| Advertising integrations registered 5 business days before going live, with the standard Studio label | Since 4 May 2026; revenue share for campaigns after 1 January 2027 | [DevForum](https://devforum.roblox.com/t/-/4527365) |
| Ads Manager: one Home and Search flow with automatic bids | 20 November 2025; classic flow ended January 2026 | [DevForum](https://devforum.roblox.com/t/-/4084863) |
| Search ads: Visits campaigns with up to 10 exact-match keywords per ad set, second-price auction weighted by query relevance, 13+ and all regions | Documented, checked 8 November 2026 | [Search ads](https://create.roblox.com/docs/production/promotion/search-ads) |
| Creator Rewards replaced Engagement-Based Payouts and Creator Affiliate | 24 July 2025 | [Creator Rewards](https://create.roblox.com/docs/creator-rewards) |
| Roblox Plus replaced new Premium sign-ups | 30 April 2026 | [Roblox Plus](https://create.roblox.com/docs/production/monetization/roblox-plus) |
| DevEx rate 0.0038 USD per Robux | Since 5 September 2025 | [DevEx](https://create.roblox.com/docs/production/monetization/developer-exchange) |
| Thumbnail personalization keeps the current winner's traffic when it is in a new test | Since 1 July 2025 | [DevForum](https://devforum.roblox.com/t/-/3793665) |
| Promotional Text in beta for all creators (Creator Hub, Game details) | 3 November 2026 | [DevForum](https://devforum.roblox.com/t/4973915) |
| Game Issues & Appeals page (Creations > Game > Safety); shared IP alone triggers no action | 2 November 2026 | [DevForum](https://devforum.roblox.com/t/4972565) |
| Retention benchmark: median D1 10.3%, D7 1.6%, D30 0.5%; top 1% D1 22.2% (games over 1M MAU, August 2025 to July 2026) | Third-party, secondary summary | [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-key-roblox-and-roblox) |

## Deprecated (report as findings)

| Deprecated | Use instead |
|---|---|
| `wait`, `spawn`, `delay`, `tick`, lowercase `:connect`/`:wait` | `task.*`, `os.clock`, `:Connect`/`:Wait` |
| `Body*` movers, `Part.Velocity`/`RotVelocity` | Constraints, `AssemblyLinearVelocity` |
| `Humanoid:LoadAnimation`, `AnimationController:LoadAnimation` | `Animator:LoadAnimation` |
| `AnimationClipProvider:GetAnimationClip`/`GetAnimationClipById` | `GetAnimationClipAsync` |
| `MakeJoints`/`BreakJoints`; `Attachment.WorldRotation` | `WeldConstraint` or `HingeConstraint`; `WorldOrientation` |
| `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`; `Camera.CoordinateFrame` | `PivotTo`/`GetPivot`; `Camera.CFrame` |
| `ContentProvider:Preload`; `BadgeService:AwardBadge`/`UserHasBadge` | `PreloadAsync`; the `Async` names |
| `LocalizationService:GetTranslatorForPlayer` (dump v740) | `GetTranslatorForPlayerAsync` |
| `Chat:FilterStringForPlayerAsync` | `Chat:FilterStringAsync` or `FilterStringForBroadcast`; new work uses `TextService:FilterStringAsync` |
| `TextFilterResult:GetChatForUserAsync`, which now **returns an empty string**: report as Correctness | `TextChatService`; `GetNonChatStringForUserAsync`/`GetNonChatStringForBroadcastAsync` |
| `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` | `GroupService:GetRolesInGroupAsync` |
| `Player:LoadCharacter`/`LoadCharacterWithHumanoidDescription`, `Humanoid:ApplyDescription`/`ApplyDescriptionReset`, `Player:IsInGroup`, `Player:GetFriendsOnline` (dump v745) | Their `Async` names |
| `MarketplaceService:GetProductInfo`/`PlayerOwnsAsset` | `GetProductInfoAsync`/`PlayerOwnsAssetAsync` |
| `CollectionService:GetCollection` | `GetTagged` |
| `WorldRoot:FindPartOnRay`, `FindPartOnRayWithIgnoreList`, `FindPartOnRayWithWhitelist` | `Raycast` with `RaycastParams` |
| `DataModel.VIPServerId`/`VIPServerOwnerId` | `PrivateServerId`/`PrivateServerOwnerId` |
| `TeleportService:TeleportToSpawnByName`, `TeleportToPlaceInstance`, `TeleportPartyAsync`, `TeleportToPrivateServer` (v735); `CustomizedTeleportUI` does nothing | `TeleportAsync` with `TeleportOptions`. Plain `Teleport` is **not** deprecated |
| `TeleportService:ReserveServer` (v702) | `TeleportAsync` with `TeleportOptions.ReservedServerId` |
| `ReserveServerAsync`, `TeleportOptions.ShouldReserveServer`, `.ReservedServerAccessCode` (dump v746) | Server ID targeting. `TeleportAsyncResult.ReservedServerAccessCode` is not tagged. Old codes keep working ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| `UserInputService.ModalEnabled`; `GetUserCFrame`/`UserCFrameChanged`; `UserHeadCFrame` | `GuiService.TouchControlsEnabled`; the `VRService` equivalents |
| `Mouse.KeyDown`/`KeyUp`; `ContextActionService:BindActionToInputTypes` | `UserInputService` or the Input Action System; `BindAction` |
| InputContext/InputAction camera replication | `Player:GetCameraState()` |
| `AdGui.OnAdEvent` (release notes 734) | None listed |
| `TestService:RegisterTestLegacy` (v742) | `RegisterTest(testName, callback, options)` |
| `GuiObject:TweenPosition`/`TweenSize`/`TweenSizeAndPosition` (v738, common in old code) | `TweenService:Create` |
| `GuiObject.Transparency` (v738) | `BackgroundTransparency`, or `TextTransparency` |
| `GuiObject.BorderColor`, `Draggable`, `DragBegin`, `DragStopped` | See the deprecated index |
| `Lighting.Technology` (v744): `RobloxScriptSecurity`, so a place setting, not a script finding | `Lighting.LightingStyle` |
| `InputAction:Fire`: not pattern-matched, since `BindableEvent:Fire` shares the name | `InputBinding:Fire` on a scriptable binding |

**Removed, not deprecated** (a plain runtime error): `Workspace.UseInputSink`, `PrimalPhysicsSolver` (v746), `BasePart.siz` (v736), `Part.shap` (v731), `AssetService:PromptCreateAssetAsync` (v738, use `PromptCreatePlatformContentAsync`), `Enum.CollisionFidelity.Scalable` (v738, use `Tunable`), `AnimatedImage` (v742).

Discouraged-but-functional APIs are not in this list ([false-positives.md](false-positives.md#deprecated-vs-discouraged-do-not-conflate-them)). The full inventory with replacements is `https://create.roblox.com/docs/reference/engine/deprecated.md`; report from it only when a name is unambiguous, since community libraries reuse many of these names. The index lagged the v738 dump tags by about two weeks, so a dump tag is enough to report on.

## Dates live here, and only here

No other file in this skill carries a date or a year. Other pages carry the maturity tag and link back to the row here that holds the evidence, so a status change edits one file. The repository's audit fails the build on a four-digit year anywhere else. The same goes for "new", "recent", and "coming soon": state the tag instead.

## Maintaining this file

Keep it a baseline, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version; mark it **[UNVERIFIED]**.

**Promotion paths, one step at a time, each with its own evidence:**

- **Luau:** `RFC merged` → `upstream released` (a numbered `luau-lang/luau` release) → `[Verify]` → `[GA]` (a Roblox release note, a DevForum announcement, or an in-Studio test). An upstream release alone never makes a row [GA].
- **Engine:** `release note` → `[Undocumented]` (the dump shows the member and its version) → `[GA]` (a reference page documents it).

**Never demote or delete a row because a reference page lacks it.** Only the dump retires a member. This file has twice shipped rows that flagged correct code by reading "absent from the reference" as "does not exist".

Between releases the dump moves ahead of this file. Confirm a deprecation against the current dump, or, where roblox-optimum is installed, the `roblox-optimum://references/live-currency.md` resource that `roblox-optimum sync` builds. Settled [GA] rows move into the "Settled" lines above or into their domain page. The full refresh procedure and the size policy are in `MAINTAINING.md` at the repository root.
