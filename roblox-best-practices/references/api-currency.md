# API Currency — Confirmed Baseline for "Verify First"

The verify-first rule ([SKILL.md](../SKILL.md#environment--scale)) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the **baseline that rule reads against** — a dated list of what is already confirmed, so the agent stops re-litigating shipped APIs while still verifying the genuinely bleeding-edge.

**Snapshot basis: 18 September 2026.** Sources: Luau releases through **0.738** (11 September 2026), the Luau 2025 runtime recap (19 December 2025), the Luau RFC repository, Roblox engine release notes through version **739** and the weekly page for **14 September 2026** (read through the three-page model described in step 5 below), the pending list read the same day, and the versioned API dump at `robloxapi.github.io/ref` reflecting **v0.739.0.7390687** (14 September 2026).

**Never size a version from a weekly page** — it lists only what is already live, so a version read that way looks far thinner than it is. Step 5 says which of the three pages answers which question. Nothing in the pending list is a deprecation, but the API dump tagged four `GuiObject` members deprecated at v738 ahead of the published index; see [Deprecated](#deprecated-report-as-findings).

The performance figures and tooling in [performance.md](performance.md), [device-performance.md](device-performance.md), and [verification.md](verification.md) were read from the Creator Hub performance-optimization guides (`create.roblox.com/docs/performance-optimization`, its `design`, `identify`, `improve`, `monitor`, `scene-analysis`, `test-on-hardware`, and `microprofiler/*` pages) and the `Workspace` class reference.

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
5. **Release notes — three pages, three different questions.** Roblox restructured these in September 2026, and the structure is documented at `https://create.roblox.com/docs/releases` (which does serve `.md`). Reading the wrong one of the three is how a version gets mis-sized:

   | Page | URL | Answers |
   |---|---|---|
   | **Versioned** | `/docs/release-notes/release-notes-<N>` | What was *introduced* in version N — live and pending mixed, each entry carrying a `Status` |
   | **Weekly** | `/docs/updates/<YYYY-MM-DD>` (Monday-dated) | What became *live* that week, across any introduction version |
   | **Pending** | `/docs/updates/pending` | What is introduced but *not live yet* |

   **"Introduced in version N" is not "available in version N."** Roblox ships code behind a flag and enables it later, so an entry sits on a version page while the behavior is still off. A change belongs to its **earliest** introduction version and does not become a new introduction by reappearing in later versions. Pending defaults to the last 30 days, with *Show all* reaching back six months — and **leaving the pending list does not mean going live**, only that the window moved or the item was recorded live elsewhere. Confirm live status on a weekly page, never by absence from pending.

   How to fetch each, which differs per page:
   - **Weekly pages serve `.md`** — `https://create.roblox.com/docs/en-us/updates/2026-09-14.md` — and this is the cheapest read. Fetch the `.md`, never the HTML, whose tables render client-side.
   - **Versioned and pending pages have no `.md`** (both 404). Fetch the HTML and read the JSON in `<script id="__NEXT_DATA__">`: a versioned page holds `props.pageProps.data.releaseNoteContents.content`, each entry with `ReleaseNotesText`, `ReleaseNotesType`, and `Status`; the pending page holds `props.pageProps.data.pendingReleaseContents`, each entry with `introducedInVersion`.

   `devforum.roblox.com/c/updates/release-notes` still carries each version as a server-rendered topic, plus the feature-flag list and developer replies — useful when the flag name matters. Either way a release note announces intent, so a name from one is provisional until step 2 confirms it.
6. **Studio CLI API dumps.** `RobloxStudioBeta.exe --api out.json` (also `--fullApi`, `--apiV2`) writes the installed engine's API surface as JSON — the same ground truth as step 2, for exactly the build you target rather than the newest one.
7. **In-Studio probe — and it answers less than it looks like it does.** A bare read such as `print(typeof(workspace.AuthorityMode))` is **not** a usable probe: run from the command bar, a plugin, or MCP `execute_luau`, it throws `The current thread cannot read 'AuthorityMode' (lacking capability RobloxScript)`. Wrap every probe and classify the failure, because the engine has two different ways of refusing:

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

   | Result | What it proves |
   |---|---|
   | `PRESENT` | The member exists and is readable here. **Readable is not callable** — `workspace.Simulate` reads as a `function` yet calling it throws `lacking capability RobloxEngine`. |
   | `GATED` | The member exists. Only the capability is missing, and the message names it. |
   | `UNREADABLE-HERE` | **Nothing about existence.** Both a fabricated name and a real, dump-confirmed member return this identically — `workspace.NopeNotReal` and `workspace.StreamingMinRadius` are indistinguishable this way. |

   So a probe **cannot settle absence**, only presence. For anything that returns `UNREADABLE-HERE`, go back to step 2: the dump knows whether the member exists, and this step never overrides it. Remember too that the command bar, plugins, and MCP run at a *higher* security level than shipped code, so `PRESENT` here does not mean a `Script` in a live game can touch it. For behavior questions inject a real Script so it runs in the game VM ([verification.md](verification.md#studio-native--mcp-environments)).

Never assert existence or nonexistence from training memory alone. Name which step above backs an engine-fact claim, or say explicitly that it is unverified and what check would settle it. **A claim that something exists needs step 2, 6, or 7; a claim that something does not exist needs step 2 or 6** — steps 3–5 support neither, and step 7 cannot prove a negative.

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
| `pcall`/`xpcall` inside user-defined `type function` | **[GA]** — requires the new solver | Upstream Luau 0.734, August 2026, and shipped to Studio in engine release notes for the week of 10 August 2026, which list it Live |
| New type solver | **[GA]** default for `nocheck`/`nonstrict`; **opt-in** for `strict` | General release 20 November 2025. Configure via `UseNewLuauTypeSolver` and `LuauTypeCheckMode`; old solver available through 2026 ([luau-language.md](luau-language.md#the-new-type-solver--what-is-on-by-default)) |
| **Read-only members `{ read x: T }`, `{ read [K]: V }`** (and the `write` mirror) | **[Verify]** | Upstream Luau 0.721, May 2026. Full enforcement needs the new solver |
| **Yielding inside custom iterators** | **[Verify]** | Upstream Luau 0.722, May 2026 |
| **`declare extern type`** (replaces `declare class` / `extern class`) | **[Verify]** | Old spellings removed upstream in 0.727, June 2026. Affects hand-written declaration files only |
| **`export` value semantics** (exported values are `const` by default) | **[Verify]** | Upstream Luau 0.723, May 2026; Studio availability **not confirmed** by this skill. Keep the `local M = {} ... return M` shape until verified |
| User-defined `type function`, `keyof`, `issubtypeof` | **[Verify]** — requires the new solver | `issubtypeof` implemented in Luau 0.724 (June 2026) |
| `math` constants (`phi`, `sqrt2`, `e`, `nan`, `tau`) | **[GA]** | Documented members of the engine `math` library alongside `pi`/`huge`; use them instead of hand-rolled literals |
| 64-bit integer type | **RFC merged only** | Accepted design from the same February–March 2026 RFC batch as the constants. **No implementation confirmed.** Do not write code against these |
| `class` syntax | **RFC merged only** | RFC #191 accepted April 2026. Upstream prototype work continues behind a debug flag — constructors were wired into the type system in 0.737 (September 2026) — and it is absent from `luau.org/syntax`. Keep using metatable OOP |
| `if local` / `if const` bindings (statement and expression) | **[Beta]** 6 October 2026 | Studio Beta Features toggle "If Local/Const Bindings" ([DevForum announcement](https://devforum.roblox.com/t/beta-if-local-statements-and-expressions/4918297)). One name and one value per condition, truthiness test only, no multi-return such as `if local ok, r = pcall(f)`. The announcement does not say whether live servers accept it or when it leaves beta, so never write it into code that ships unless the user asks; never flag it in a project that uses it |
| **Dynamic-key table access, metamethod dispatch, frozen-metatable lookup** | **[Verify]** — pending | Release notes 739: `t[x]` reads 10–18% faster and writes 18–25% faster, rehash on new-key insertion is faster, metamethod dispatch costs 5–25% less, and metamethod lookup on a `table.freeze`-frozen metatable is "greatly" cheaper. Also: a non-numeric key insertion no longer shrinks a pre-allocated array part (`t = table.create(N); t.x = y`). All **Pending** at this snapshot — a version page lists introduction, not availability. Treat as a reason to freeze class metatables, never as a reason to restructure working code ([performance.md](performance.md)) |
| **Stricter checking inside generic function bodies** | **[GA]** — behavior change | Release notes 739 fixed type analysis that was too permissive in the bodies of generic functions under `--!strict`. `function call<T>(f: (T) -> T) f(nil) end` **no longer type checks**, because `nil` is not of `T`. This surfaces new errors in code that previously passed. The error is correct; see [false-positives.md](false-positives.md) before calling it a regression |

**Luau 0.736, 0.737, and 0.738 added no language feature, syntax, or library function a script author can call.** All three are compiler, type-solver, and JIT work: lambda generalization in table literals, fewer internal compiler errors, better cyclic-require messages, `keyof` unions ordered lexicographically, an upvalue fix for `continue` inside `repeat..until`, generalization anchored to function scope, and deprecation warnings that now fire inside union and intersection types. `coroutine.finally` appears in 0.738 as a **VM-side prototype only** — it is not callable, and describing it as coming is the mistake this file exists to prevent. Recorded so the next maintainer does not re-read them looking for a row to add.

**Not applicable to Roblox Studio** despite appearing in Luau release notes: embedder C APIs (`lua_memorydump`, `lua_callhook`, `lua_atbreakpoint`, ...), double-precision vector builds (a VM build-time option), and the standalone `@self` require alias. Require-by-string is the scoped exception: experiences opted into `PlayerScriptsUseInputActionSystem` can use `require("@rbx/PlayerModule")` (release notes 735, August 2026). Confirm scope before relying on aliases beyond `@rbx`; do not present the rest as "coming soon".

## Engine

| Area | Status | Notes |
|---|---|---|
| Server Authority (`Workspace.AuthorityMode`) | **[GA]** 9 July 2026 | **Off by default.** Full contract and the confirmation gate: [server-authority.md](server-authority.md) |
| ~~`PlayerControlState`~~ → `ControlState` + `StateSchema` | **[Undocumented]** — member set verified | `PlayerControlState` was added at **v735** and **removed at v738** (API dump). Probed at v739 from MCP `execute_luau`: `Instance.new("PlayerControlState")` fails with `Unable to create an Instance of type`, while `Instance.new("ControlState")` succeeds and carries every member below — `Owner`, `GetState`, `GetChangedState`, `SetField`, `UpdateFields`, `GetReplicationWeight` (all functions), and `OnStateChanged` (an `RBXScriptSignal`). `StateSchema` (`AddBoolField`, `AddCFrameField`, `AddInstanceField`, `AddIntField`, `AddNumberField`, `AddUnitVector3Field`, `AddVector2Field`, `AddVector3Field`) is in the dump but **is not constructible** with `Instance.new`, so it is obtained some other way — find out how before designing around it. Replicates scripted state under Server Authority ([server-authority.md](server-authority.md)). **Do not write `PlayerControlState`** |
| Prediction introspection (`RunService.Misprediction`, `RunService.Rollback`, `RunService:GetPredictionStatus()`, `RunService:SetPredictionMode()`, `Instance.PredictionMode`) | **[GA]** | Present in the Engine API Reference; per-instance predicted-vs-authoritative data for debugging Server Authority mispredictions ([server-authority.md](server-authority.md)) |
| `TextChatService` as the only chat | **[GA]** | Legacy chat removed 30 April 2025; Roblox then tried to auto-migrate each unmigrated experience and disabled chat where it could not ([DevForum](https://devforum.roblox.com/t/-/3237100)). Custom chat systems must gate chat with `TextChatService:CanUserChatAsync` and direct (1:1) chat with `CanUsersDirectChatAsync` (the announcement spells it `CanUserDirectChatAsync`; the reference name wins) ([security.md](security.md#user-generated-text-filtering)) |
| Regional pricing | **[GA]** | Passes and avatar items first; developer products opt-in per product from 1 October 2025 ([DevForum](https://devforum.roblox.com/t/-/3971235)). Regional price never above the default, at most 70% lower ([monetization-policy.md](monetization-policy.md#choosing-the-product-type)) |
| `Player:GetCameraState()` | **[GA]** | Returns CFrame, FieldOfView, ViewportSize; replaces the deprecated InputContext/InputAction camera replication path |
| Character Controller Library (`ControllerManager`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) | **[GA]** April 2026 | `Humanoid` is **not** deprecated; CCL is a choice ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)) |
| Input Action System | **[GA]** | Mandatory under Server Authority |
| Animation Graphs | **[GA]** July 2026 | |
| Studio Script Sync (external editors, bidirectional) | **[GA]** — full release 17 June 2026 | Syncs only `Script`, `LocalScript`, `ModuleScript`, and `Folder`; **attributes and tags on synced scripts are ignored and can be lost**; ceilings of 10,000 scripts per top-level instance and 128 top-level instances; no debugger control from the external editor. Full behavior in [external-editors.md](external-editors.md#studio-script-sync--the-official-one) |
| `InstanceFileSyncService` (`GetStatus`, `GetSyncedInstance`, `GetAllInstances`) with `Enum.InstanceFileSyncStatus` | **[GA]** | Queries Script Sync state from Luau. **PluginSecurity** — command bar, plugin, or MCP `execute_luau` only, never shipped code ([external-editors.md](external-editors.md#studio-script-sync--the-official-one)) |
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
| **Not scriptable — Studio-only settings:** `Workspace.StreamingEnabled`, `Workspace.PhysicsSteppingMethod`, `Workspace.EnableSLIMAvatars`; `Workspace.AuthorityMode` is read-only to scripts | **[GA]** | Recommending any of these means asking the user to change a Studio setting, never writing an assignment. **Reading them is not uniformly available, and the environment checks in [workflow.md](workflow.md#session-setup-resolving-the-five-decisions) must allow for that.** Verified from MCP `execute_luau` in Edit mode: `StreamingEnabled` reads fine; `AuthorityMode` throws `lacking capability RobloxScript`; `PhysicsSteppingMethod`, `EnableSLIMAvatars`, `StreamingMinRadius`, and `StreamingTargetRadius` all throw `is not a valid member of Workspace` despite being present in the dump. Wrap every one of these reads in the `probe` helper from step 7 and treat a failure as *unknown*, never as *off* or *absent* — then ask the user what the setting is |
| `Player.FrustumStreaming` + `FrustumStreamingMode` enum | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). Streams by view frustum rather than radius alone; test the camera-turn case before adopting ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `Player:GetGlobalUserId()` | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump). Non-yielding, returns `int64`. Semantics undocumented — probe before using it as an identity key; `Player.UserId` remains the settled choice |
| `Player:GetFriendsInUniverseAsync()` | **[Undocumented]** | Added in engine **v735**, August 2026 (API dump). Yields, returns an array. Wrap in `pcall` like any yielding call |
| `RunService:BindToAnimation()` | **[Undocumented]** | Added in engine **v738** (API dump; release notes 738 describe it as "fixed frequency callbacks prior to animation updates"). The fixed-rate sibling of `BindToSimulation` for the pre-animation phase ([performance.md](performance.md)). Parameter list unconfirmed — probe before writing a call |
| `Workspace.StreamingAdaptiveRadius` | **[Undocumented]** — confirmed readable and writable | Added in engine **v738** (API dump). Probed at v739 from MCP `execute_luau`: it is a **`boolean`**, it reads (`false` in the probed place), and assignment succeeds. It is **not** one of the Studio-only streaming properties an earlier snapshot of this row grouped it with. No reference page describes what the engine does with it, so confirm the behavior before recommending it ([device-performance.md](device-performance.md#engine-levers-before-script-levers)) |
| `Workspace.UseInputSink` | **[Verify]** | Added in engine **v738** (API dump). A probe from MCP `execute_luau` returns `is not a valid member of Workspace`, which per step 7 proves **nothing** — the dump says it exists, so it is hidden at that security level rather than absent. Do not write it, and do not report it as nonexistent |
| `WorldRoot:Simulate()`, `.AutoSimulate`, `.SimulationRate`, `.GravityDirection`, `.Wind`, `.WindDirection` | **[Undocumented]** — gated behind `RobloxEngine` | Added in engine **v737**–**v738** (API dump). Release notes 737 calls these "scriptable"; **the engine does not agree, and the release note is not the authority here.** Probed at v739 from MCP `execute_luau`: `Simulate` reads as a `function` on both `Workspace` and `WorldModel`, but `workspace:Simulate(0)` throws `The current thread cannot call 'Simulate' (lacking capability RobloxEngine)`, and `AutoSimulate`, `SimulationRate`, and `GravityDirection` throw the same on a plain read. Command-bar and plugin code already sit above shipped code, so a `Script` cannot reach these either. **Do not write them, and do not present manual physics stepping as available.** Treat the capability as the thing to re-check if this ever matters |
| `QueueService` / `StandardQueue` (`GetStandardQueue`, `PublishAsync`, `SubscribeAsync`, `BatchCommitAsync`, `Enum.QueueDecision`) | **[Undocumented]** | Added in engine **v739** (API dump). A subscribe-and-acknowledge queue primitive distinct from MemoryStore queues. Quotas, durability, and delivery guarantees are undescribed ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| `Player.PauseTeleports` | **[Undocumented]** | Added in engine **v738** (API dump). No reference page; confirm semantics before using it to gate a teleport flow |
| `AnimatedImage` / `AnimatedImageService` / `AnimatedImageTrack` (with `Enum.AnimatedImagePlaybackState`, `Enum.AnimatedImageScaleType`) | **[Undocumented]** | Added in engine **v738** (API dump), and announced as an engine capability at the September creator conference. Animated image containers with sprite-sheet import. No reference page yet |
| `MemoryStoreService:GetDistributedCounter` (`MemoryStoreDistributedCounter`) | **[Undocumented]** | Added in engine **v733**, August 2026 (API dump); both the method and the class are present. A counter primitive for cross-server totals, replacing hand-rolled sorted-map arithmetic ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| CollectionService `TagAdded` / `TagRemoved` events | **[GA]** | Documented in the Engine API Reference. They fire when a tag enters or leaves use **across the place**, not per instance — per-instance binding is still `GetInstanceAddedSignal`/`GetInstanceRemovedSignal`, and confusing the two is a real bug |
| `CollectionService:CreateCollection()` | **[GA]** | Documented in the Engine API Reference; added in engine **v734**. Creates a named collection as an organizational primitive. Note `GetCollection` is the deprecated member on this class |
| `WorldRoot` collision groups | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump): `RegisterCollisionGroup`, `UnregisterCollisionGroup`, `RenameCollisionGroup`, `IsCollisionGroupRegistered`, `GetRegisteredCollisionGroups`, `GetMaxCollisionGroups`, `CollisionGroupSetCollidable`, `CollisionGroupsAreCollidable`, plus `CollisionGroupData`/`CollisionGroupCollidableChanged` from **v732**. Brings `WorldModel` raycasts to parity with `Workspace`. The setter is `CollisionGroupSetCollidable`, **not** `SetCollisionGroupsCollidable` |
| `GuiService.PreferredTextSize` / `PreferredTransparency` / `ViewportDisplaySize` (player UI-scale and display-class preferences) | **[GA]** | Documented members; read these instead of inferring scale from viewport size ([ui-crossplatform.md](ui-crossplatform.md)) |
| `GuiService:SetUIScaleMultiplier()`, and the UI-scale getters | **[Undocumented]** — RobloxScriptSecurity | Added at **v734**. `SetUIScaleMultiplier` is still present. **`GetUIScaleMultiplier` was removed at v738**, replaced by `GetAutoUIScaleHundredths` and `GetEffectiveUIScaleHundredths` (same security, hundredths rather than a float). All of these sit behind **RobloxScriptSecurity**, so shipped code cannot call them at all — read player scale preference from `GuiService.PreferredTextSize` / `ViewportDisplaySize` instead ([ui-crossplatform.md](ui-crossplatform.md)). Kept as a row because the reasoning error attached to it still matters: an earlier snapshot declared these names never shipped, purely because the reference did not list them. They had shipped. **Existence and removal are both the dump's call, never the documentation site's** |
| `ViewportCamera`, `Logger` classes (`Logger` obtained via `GetLogger`) | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump); `ViewportCamera` has no class reference page yet. Its release note calls it a `Camera` that replicates, for `ViewportFrame` and Team Create thumbnail cameras set up at design time. `Logger` may overlap structured `LogService`; confirm which one the target environment expects |
| `AudioWindSynthesizer` | **[Undocumented]** | Added in engine **v734**, August 2026 (API dump) |
| `UIShadow` class (`BlurRadius`, `Color`, `Offset`, `Spread`, `Transparency`, `ZIndex`, plus `Enabled` from **v724** and `Mode` from **v732**) | **[GA]** | Documented in the Engine API Reference. `Mode` is in the dump and is **not** an invented name; only `ApplyShadowMode` has no counterpart |
| Child `UIGradient` over `UIShadow`; `UIShadow.Inset` / `ShowBehindParent` | **[Undocumented]** | Both properties added in engine **v733**, August 2026 (API dump). Gradient-tinted and inset shadow rendering |
| UI styling system (`StyleSheet`, `StyleRule`, `StyleLink`, `StyleDerive`, tokens, themes, transitions, Style Editor) | **[GA]** | Documented under `create.roblox.com/docs/ui/styling`. Selectors cover class, `.tag`, `#name`, `:state`, `::pseudo-instance`, `@query`, with `>` and `>>` combinators; one sheet per tree; `StyleSheet:SetDerives()` swaps themes from code ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)) |
| `UIFlexItem` (`FlexMode`) and `UIListLayout.HorizontalFlex`/`VerticalFlex`/`ItemLineAlignment`/`Wraps` | **[GA]** | Flex is a property set on the list layout plus a per-child item. **There is no `UIFlexLayout` class** |
| `UIDragDetector` / `DragDetector` (`DragStyle`, `ResponseStyle`, `RunLocally`) | **[GA]** | `RunLocally = true` replicates nothing to the server ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| `Path2D`, `CanvasGroup`, `VideoFrame` | **[GA]** | `VideoFrame` carries hard platform limits (format, five minutes, two concurrent, paid upload) |
| `StarterGui.ClipsDescendantsSupportsRotation` | **[GA]** | Without it, `ClipsDescendants` does not clip rotated descendants; rounded clipping always needs a `CanvasGroup` |
| `GuiObject.InputSink` (`Enum.InputSink` = `None`, `Activate`, `All`), and `GuiObject.Sink` | **[GA]** for `InputSink`; **[Verify]** for `Sink` | Absorbs input at the element, replacing `Active`-style input blocking. **Write `InputSink`.** Probed at v739 from MCP `execute_luau`: `InputSink` is present on a `Frame`, returns an `EnumItem`, and defaults to `Enum.InputSink.None`; the three enum values above are the real set, read off `Enum.InputSink:GetEnumItems()`. `Sink` returns `is not a valid member of Frame`, which per step 7 settles nothing either way — the dump added it at **v738** and the dump is what decides. The same version made `InputSink` `[NotReplicated]` with `CanLoad`/`CanSave` `false`, so a value set in Studio no longer survives a save, which is the part that affects authoring today. **Never flag either name as nonexistent** |
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
| Current engine version | Dump: **739** (`v0.739.0.7390687`), 14 September 2026. Notes: **739**, week of 14 September 2026. Live on 1 October 2026, not yet read into this file: dump `v0.740.19.7400003` (26 September) and Luau **0.740** (25 September) | The two sources agree at this snapshot, but they often do not, and the gap runs one way: **release notes lead the dump**, because notes ship the week the change goes live while the dump is regenerated per version. So a member announced for 736 and absent from the dump is *unconfirmed*, not absent — the same trap as step 3, from the other side. Check both: the weekly updates pages for what shipped (step 5) and `/ref/updates/` for what the dump carries. A number here is a floor, never a ceiling |

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

Tool names, limits, and variants are recorded in [studio-mcp.md](studio-mcp.md) as a **July 2026 snapshot only**. The standalone `Roblox/studio-rust-mcp-server` was archived on 3 April 2026 in favor of the built-in server. Unlike engine APIs, the MCP surface has no single authority: the official built-in server, the older standalone Rust server, and community forks all expose different tools. **The connected tool list and each tool's own schema always override that file.** Never assert that an MCP tool does or does not exist based on this skill.

## Deprecated (report as findings)

- `wait`/`spawn`/`delay`, `tick`, lowercase `:connect`/`:wait`
- `Body*` movers, `Humanoid:LoadAnimation`, `Part.Velocity`/`RotVelocity`
- `AnimationController:LoadAnimation` → `Animator:LoadAnimation`, `AnimationClipProvider:GetAnimationClip`/`GetAnimationClipById` → `GetAnimationClipAsync`
- `MakeJoints`/`BreakJoints` → a `WeldConstraint` or `HingeConstraint`, `Attachment.WorldRotation` → `WorldOrientation`
- Pre-`Async` web calls: `ContentProvider:Preload` → `PreloadAsync`, `BadgeService:AwardBadge`/`UserHasBadge` → their `Async` names, `Chat:FilterStringForPlayerAsync` → `Chat:FilterStringAsync` or `Chat:FilterStringForBroadcast`, as the deprecated index names them; new work filters through `TextService:FilterStringAsync`
- `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`, `Camera.CoordinateFrame`
- `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`
- `TextFilterResult:GetChatForUserAsync` now **returns an empty string**, so code still calling it silently shows nothing: report it as Correctness, not Advisory. Chat filtering belongs to `TextChatService`; other text uses `GetNonChatStringForUserAsync`/`GetNonChatStringForBroadcastAsync`
- `TeleportService:TeleportToSpawnByName` → `TeleportAsync`; `TeleportService.CustomizedTeleportUI` does nothing (its default message was removed)
- `UserInputService.ModalEnabled` → `GuiService.TouchControlsEnabled`; `UserInputService:GetUserCFrame`/`UserCFrameChanged` → their `VRService` equivalents; `UserHeadCFrame` → `VRService:GetUserCFrame`
- `Mouse.KeyDown`/`KeyUp` → `UserInputService` (or the Input Action System); `ContextActionService:BindActionToInputTypes` → `BindAction`
- InputContext/InputAction camera replication → `Player:GetCameraState()`
- `AdGui.OnAdEvent` (deprecated in release notes 734, August 2026)
- **`TeleportService:ReserveServer`** (deprecated at engine v702, December 2025) → `TeleportService:ReserveServerAsync`, or let the teleport reserve for you with `TeleportOptions.ShouldReserveServer = true` ([patterns/network.md](patterns/network.md#cross-server-communication))
- **`TeleportService:TeleportToPlaceInstance` / `TeleportToPrivateServer` / `TeleportPartyAsync`** (all deprecated at engine v735, August 2026) → `TeleportService:TeleportAsync` with a `TeleportOptions`. Plain `TeleportService:Teleport` is **not** deprecated

**Deprecated in the dump at v738, not yet in the published index** — report these, and say where the tag came from:

- **`GuiObject:TweenPosition()` / `:TweenSize()` / `:TweenSizeAndPosition()`** → `TweenService:Create`. These are common in older code and in tutorials, so expect them often.
- **`GuiObject.Transparency`** → `BackgroundTransparency`, or `TextTransparency` on a text element. Already `[Hidden, NotReplicated]` before the deprecation tag.

At the snapshot, `create.roblox.com/docs/reference/engine/deprecated.md` did not list these yet; by 1 October 2026 it lists all four, together with `GuiObject.BorderColor`, `GuiObject.Draggable`, `DragBegin`, and `DragStopped`; read the index for each one's replacement. The site caught up with the dump about two weeks later, which is the lag this file keeps warning about: report a member on the dump's authority, and do not treat the index's silence as a contradiction.

Also gone rather than deprecated, and worth recognizing because the failure is a plain runtime error: the abbreviated legacy property aliases **`BasePart.siz`** (v736) and **`Part.shap`** (v731) are no longer accessible, `AssetService:PromptCreateAssetAsync` was removed at v738 in favor of **`PromptCreatePlatformContentAsync`**, and **`Enum.CollisionFidelity.Scalable`** was removed at v738 in favor of **`Tunable`**.

Discouraged-but-functional APIs are **not** in this list; the split is in [false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).

The full inventory is published, and it is the authority when a name is not listed above: `https://create.roblox.com/docs/reference/engine/deprecated.md` is generated from the same YAML the reference pages are built from, and gives every deprecated member with its replacement. It lists far more than this skill reports, because a name a community library also exposes cannot be matched by pattern without accusing correct code. Read it before claiming a member is current; report from it only when the name is unambiguous.

## Dates live here, and only here

**No other file in this skill carries a date or a year.** They carry the maturity tag — **[GA]**, **[Beta]**, **[Verify]**, **[UNVERIFIED]** — and link back to the row here that holds the evidence.

The reason is maintenance, not style: when a feature's status changes, exactly one file needs editing. A date copied into `luau-language.md` or `patterns/` is a second thing to remember, and the one that gets forgotten is the one that quietly starts lying. `scripts/validate-skill.py` enforces this — a four-digit year on any other page fails the build.

The same applies to "new", "recent", and "coming soon": a feature described that way stays described that way long after it stopped being true. State the tag instead.

## Maintaining this file

When a release confirms an API this skill previously told the agent to verify, move it to the correct maturity tag and update the snapshot line. Keep it a *baseline*, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version number — if it could not be confirmed, mark it **[UNVERIFIED]**.

**Record the state, not just the tag.** Every Luau row answers one question: *can someone use this in Studio today?* A row promoted on the strength of an upstream Luau release alone is a bug in this file. The promotion path is one-directional and each step needs its own evidence:

`RFC merged` → `upstream released` (a numbered `luau-lang/luau` release) → `[Verify]` → `[GA]` (a Roblox source: release notes, a DevForum announcement, or a confirmed in-Studio test)

Engine rows have their own path, and it is **not** the same one:

`release note` → `[Undocumented]` (the API dump shows the member and the version that added it) → `[GA]` (a reference page documents its semantics)

Two checks per maintenance cycle: the newest Luau release number, and the newest engine version in the dump. They move independently, and the gap between them is exactly where wrong advice comes from.

This file has twice shipped rows that told the agent to flag correct code, both times by reading *absent from the Engine API Reference* as *does not exist*. The lesson is not "check harder". It is that the documentation site is a lagging index of a moving engine, and a lagging index can only ever prove presence. **Never let step 3 conclude an absence.** When a release-note name is missing from the reference, that is the moment to open the dump, not the moment to write it off.

**A row is never demoted or deleted because a reference page lacks it** — only the dump can retire a member.

The step-by-step refresh pass is a maintainer procedure, not something to load while answering a question about an API. It lives in `MAINTAINING.md` at the repository root.
