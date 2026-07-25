# API Currency — Confirmed Baseline for "Verify First"

The verify-first rule ([SKILL.md](../SKILL.md#environment--scale)) says: confirm a newer API exists in the target environment before relying on it, and never flag an API as nonexistent from memory. This file is the **baseline that rule reads against** — a dated list of what is already confirmed, so the agent stops re-litigating shipped APIs while still verifying the genuinely bleeding-edge.

**Snapshot basis: July 2026.** Sources: Luau releases through **0.731** (24 July 2026), the Luau 2025 runtime recap, and Roblox announcements through late July 2026.

**Maturity tags:** **[GA]** generally available, safe as a default · **[Beta]** opt-in and may change, document as an option but never make it the default · **[Verify]** confirm in the target place before relying on it · **[UNVERIFIED]** this skill could not confirm it; treat with suspicion.

**Authority order when a claim is in doubt:** create.roblox.com Engine API Reference (primary) → the API dump / `ReflectionService` → a quick in-Studio test. Absence from this file is **not** evidence an API is missing — Roblox ships continuously; this list removes friction, it never overrides the docs.

## Luau language and libraries

| Area | Status | Notes |
|---|---|---|
| `vector` library (`create`, `magnitude`, `normalize`, `dot`, `cross`, `angle`, `zero`/`one`) | **[GA]** | Native, SIMD-backed; distinct from the engine `Vector3` datatype |
| `buffer` library, including `readbits`/`writebits` | **[GA]** | Binary data and network serialization; 1 GB ceiling |
| `math.map`, `math.lerp`, `math.isnan`/`isinf`/`isfinite` | **[GA]** | |
| Native codegen `--!native` and the `@native` function attribute | **[GA]** | Costs memory; reserve for compute-heavy code |
| Modern syntax (interpolation, generalized iteration, `continue`, compound assignment, `//`, if-expressions, `table.freeze`) | **[GA]** | |
| `task` library (`spawn`/`defer`/`delay`/`wait`/`cancel`) | **[GA]** | The bare `wait`/`spawn`/`delay` globals remain deprecated |
| Inlining of immediately invoked lambdas; refinements preserved across loops | **[GA]** | Luau 0.730–0.731, July 2026 |
| New type solver | **[GA]** default for `nocheck`/`nonstrict`; **opt-in** for `strict` | Configure via `UseNewLuauTypeSolver` and `LuauTypeCheckMode`; old solver available through 2026 ([luau-language.md](luau-language.md#the-new-type-solver--what-is-on-by-default)) |
| User-defined `type function`, `keyof`, `issubtypeof` | **[Verify]** — requires the new solver | `issubtypeof` implemented in Luau 0.724 (June 2026) |

**Not applicable to Roblox Studio** despite appearing in Luau release notes: embedder C APIs (`lua_memorydump`, `lua_callhook`, ...), double-precision vector builds, and require-by-string / `@self`.

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
| `Players:BanAsync`/`UnbanAsync` (`ExcludeAltAccounts`, `ApplyDeviceBlock`, `ApplyToUniverse`) | **[GA]** | |
| `game.ServerRestartScheduled` | **[GA]** | Now also fires on delayed restarts |
| Analytics: Client CPU Time Breakdown | **[GA]** | Scripts / Networking / Physics / Animation / Misc |
| `InstanceHandle` attributes (Instance references) | **[Beta]** 23 July 2026 | Option, not a default ([patterns.md](patterns.md#behavior-binding-works-with-any-framework)) |
| `ScriptDebuggerService` | **[Beta]** | Programmatic breakpoints and inspection |
| Input Action Manager (visual mapping editor) | **[Beta]** July 2026 | Studio tooling, not a runtime API |
| Acoustic simulation with Occlusion/Reverb subcategories | **[UNVERIFIED]** | Engine release notes indicate it shipped; the 2026 roadmap lists acoustic simulation as later-2026 work. Confirm before relying on it |
| Current engine release-notes version number | **[UNVERIFIED]** | The release-notes index could not be read (JS-rendered, absent from the docs index). Do not cite a version number from this skill |

## Studio MCP tooling

Tool names, limits, and variants are recorded in [studio-mcp.md](studio-mcp.md) as a **July 2026 snapshot only**. Unlike engine APIs, the MCP surface has no single authority: the official built-in server, the older standalone Rust server, and community forks all expose different tools. **The connected tool list and each tool's own schema always override that file.** Never assert that an MCP tool does or does not exist based on this skill.

## Deprecated (report as findings)

- `wait`/`spawn`/`delay`, `tick`, lowercase `:connect`/`:wait`
- `Body*` movers, `Humanoid:LoadAnimation`, `Part.Velocity`/`RotVelocity`
- `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`, `Camera.CoordinateFrame`
- `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`
- InputContext/InputAction camera replication → `Player:GetCameraState()`

Discouraged-but-functional APIs are **not** in this list; the split is in [false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).

## Maintaining this file

When a release confirms an API this skill previously told the agent to verify, move it to the correct maturity tag and update the snapshot line. Keep it a *baseline*, not a changelog: one row per capability, newest snapshot wins. Never invent a date or version number — if it could not be confirmed, mark it **[UNVERIFIED]**.
