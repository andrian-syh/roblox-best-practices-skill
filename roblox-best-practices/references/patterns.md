# Framework-Agnostic Patterns

Reusable patterns that work in any project structure. Each fits the VARIABLES/FUNCTIONS/INITIALIZATION layout.

> If the project uses a community library owning one of these concerns (ProfileStore for data, Packet/ByteNet for networking, Trove/Maid for cleanup, ...), the library's idioms replace the corresponding pattern here — see [community-libraries.md](community-libraries.md).

## Data Persistence

- **`UpdateAsync` over `SetAsync`** — atomic read-modify-write prevents lost updates from multiple servers.
- **Retry with exponential backoff** around every DataStore call (`pcall` + `2^attempt` delay, 3–5 attempts).
- **Save triggers:** `PlayerRemoving` (always), periodic autosave (2–5 min), `game:BindToClose` (iterate remaining players synchronously — you get 30 s), and `game.ServerRestartScheduled` where available (fires before scheduled restarts; flush early).
- **Versioned store names** (`PlayerData_v2`) + a migration function on load, so schema changes never corrupt old data.
- **Version history is a built-in backup.** DataStore retains prior versions of each key: `DataStore:ListVersionsAsync` enumerates them and `DataStore:GetVersionAsync` reads a specific one, so a corruption or dupe report can be investigated and rolled back without a bespoke backup system. `ListKeysAsync` enumerates keys for migration/audit sweeps; the `DataStoreKeyInfo` returned alongside `GetAsync`/`UpdateAsync` carries version ids and metadata. These are diagnostic/read tools — the live save path stays `UpdateAsync`.
- **Session cache:** load once on join into a server-side table; all gameplay reads/writes hit the cache; DataStore only on save triggers. Never read DataStores during gameplay.
- **Session locking** (write a lock key with server id + timestamp, or use MemoryStore) if item duplication via server-hopping matters for your economy.
- **Know the ceilings before designing the payload.** 4 MB per key, 50-character key names, a per-experience storage pool, and a request budget now **shared between in-game and Open Cloud** calls — an external batch job and live gameplay draw from the same allowance, so self-throttle both. Numbers and effective dates: [limits-budgets.md](limits-budgets.md#data-stores).
- **Store only serializable shapes.** DataStore values must survive JSON encoding: strings valid UTF-8; table keys either a contiguous `1..n` array or all strings (mixed or sparse keys fail); no `NaN`/`±inf`; no Instances or userdata (`Vector3`, `CFrame`, `Color3`, EnumItems — convert to primitive tables/numbers on save, rebuild on load); no cycles; value ≤ 4 MB, key name ≤ 50 characters. A violation makes the **save call itself fail** — so keep session data in a serializable shape from the start rather than sanitizing at save time, and make the retry wrapper log the error so these failures are never silent.

## Remote Communication

Server-side handler skeleton — every remote handler follows this shape:

```lua
-- Validates and executes a client request to equip an item
local function onEquipRequest(player: Player, itemId: unknown)
	-- 1. Type validation
	if typeof(itemId) ~= "string" then return end
	-- 2. Rate limit
	if not RateLimiter.Allow(player, "Equip", 5) then return end
	-- 3. Authorization / ownership
	if not Inventory.Owns(player, itemId) then return end
	-- 4. Execute server-side
	Inventory.Equip(player, itemId)
end
```

- A handler that type-checks and early-returns on bad input is already **complete**: the skeleton is the maximum shape, not a mandatory checklist. A harmless, idempotent action needs no rate/ownership layer, and silent rejection is correct (an error reply aids fuzzing). Don't report a lean handler as missing layers — see [false-positives.md](false-positives.md#security--validation--a-handler-can-already-be-complete).
- Prefer `RemoteEvent` + a response event over `RemoteFunction` server→client (a client that never returns hangs your thread). Client→server `RemoteFunction` is acceptable with a server-side timeout mindset.
- Namespace remotes in one folder (`ReplicatedStorage/Remotes`); create them in one server script or build step so clients can `WaitForChild` deterministically.
- State that clients merely *display* → replicate via Attributes on the player/character instead of remotes.

## Behavior Binding (works with any framework)

`CollectionService` tags decouple behavior from hierarchy — the same script works no matter where instances live:

```lua
--[[
	Attaches hazard behavior to a part.
]]
local function bindLava(part: BasePart)
	part.Touched:Connect(onLavaTouched)
end

for _, part in CollectionService:GetTagged("Lava") do
	bindLava(part)
end
CollectionService:GetInstanceAddedSignal("Lava"):Connect(bindLava)
```

- Pair with `GetInstanceRemovedSignal` to clean up per-instance state (mandatory with StreamingEnabled — instances come and go).
- Per-instance tuning via **Attributes** (`part:GetAttribute("Damage")`), not name-parsing or config child-values.
- **Attribute limits:** attributes support a fixed set of value types (booleans, numbers, strings, and Roblox data types like `Vector3`/`Color3`/`UDim2`) — **no tables**. For structured per-instance data, keep a module-side registry keyed by the instance (with a removal path per the cleanup rules); don't make JSON-encoded attribute blobs a habit. Full ceilings, including the Server Authority replication window: [limits-budgets.md](limits-budgets.md#attributes).
- **Instance references via `InstanceHandle` [Beta]** (announced 23 July 2026). An attribute can point at another Instance, replacing the `ObjectValue` workaround:

```lua
part:SetAttribute("Target", workspace.TargetPart)

local handle = part:GetAttribute("Target") -- an InstanceHandle, not the Instance
local target = handle:Get()                -- the Instance, or nil if unavailable
local resolved = handle:Wait(5)            -- streaming-aware, optional timeout
```

  - `GetAttribute` returns a **handle**, never the Instance directly. A missing attribute returns `nil`; an attribute pointing at an instance that has not replicated returns a handle whose `Get()` is `nil` — that distinction is the point of the design under StreamingEnabled.
  - **`GetAttributeChangedSignal` fires only when the attribute itself changes**, not when the referenced instance streams in or out. Do not use it to track availability; use `Wait` or a tag signal.
  - Handles are weak references and are garbage-collected automatically.
  - It is **[Beta]**: document it as an option, keep `ObjectValue` or a module-side registry as the default for production code until it reaches GA.

## Lifecycle & Cleanup

Minimal connection-bag pattern (use a maid/janitor/trove module if the project has one; otherwise this suffices):

```lua
-- | State Management | --
local cleanupByPlayer: {[Player]: {() -> ()}} = {}

-- Registers a cleanup task owned by the player
local function addCleanup(player: Player, cleanupTask: () -> ())
	local bag = cleanupByPlayer[player]
	if not bag then bag = {}; cleanupByPlayer[player] = bag end
	table.insert(bag, cleanupTask)
end

-- Runs and clears all cleanup tasks for a leaving player
local function onPlayerRemoving(player: Player)
	for _, cleanupTask in cleanupByPlayer[player] or {} do
		cleanupTask()
	end
	cleanupByPlayer[player] = nil
end
```

Rules:
- Whatever creates a resource registers its destruction in the same place.
- Handle players already present before your `PlayerAdded` connection (`for _, p in Players:GetPlayers()`), and characters already spawned before `CharacterAdded`.
- Module init/start: expose an idempotent `Module.Init()` if setup order matters; call it from INITIALIZATION of a single bootstrap script rather than relying on require-order side effects.

## Character Lifecycle

Characters respawn; players persist. Confusing the two lifetimes is a standing leak/bug source:

- Connect `player.CharacterAdded` **and** handle an already-existing `player.Character` (same both-cases rule as `PlayerAdded`).
- Inside `CharacterAdded`, descendants may not have arrived yet — `character:WaitForChild("Humanoid")` (or `HumanoidRootPart`) rather than direct indexing; `Humanoid.Died` for death logic.
- **Per-life state** (connections, temporary buffs, hitbox registrations, active tweens on the character) is keyed by the *character* and cleared in `CharacterRemoving` or the character model's `Destroying` — respawn does not clean your module tables for you. **Per-player state** persists across respawns and clears in `PlayerRemoving`.
- Connections made *on the character's own instances* die with the character; connections held elsewhere that merely *reference* the character do not — those are the ones that need the explicit teardown.

### Humanoid vs the Character Controller Library

The **Character Controller Library (CCL)** reached **[GA]** in April 2026. It reimplements character movement as configurable Luau on top of `ControllerManager` instead of hard-coded `Humanoid` behavior, adding ground friction, momentum conservation, and tunable acceleration curves.

**`Humanoid` is not deprecated.** This is an architectural *choice*, not a migration mandate — existing experiences keep working unchanged.

- Select the implementation with `StarterPlayer.LuaCharacterController`, which takes a `CharacterControlMode`: `Default`, `Legacy`, `NoCharacterController`, or `LuaCharacterController`.
- Movement is composed from **AvatarAbilities** (Walk, Run, Jump, Swim, Climb, Sit) driven by physics controllers (`GroundController`, `AirController`) under a `ControllerManager`.
- Tune per-controller rather than fighting the defaults. `GroundController` exposes `MoveSpeedFactor`, `TurnSpeedFactor`, `AccelerationTime`, `DecelerationTime`, `Friction`, `FrictionWeight`, `BalanceMaxTorque`, and `BalanceSpeed`.
- Configure it the same way as any other per-character state: resolve the `ControllerManager` on `CharacterAdded` (handling the already-spawned character too) and apply settings there. Per-life teardown rules above apply unchanged.
- **Choosing:** prefer CCL for new projects that need custom movement feel or plan to extend abilities; keep `Humanoid` when the default feel is fine or the project depends on Humanoid-specific APIs and states. Never migrate an existing project on this skill's initiative.
- Do not flag a project for using either one ([false-positives.md](false-positives.md)).

## Streaming (StreamingEnabled)

The single home for streaming rules; other references point here. With StreamingEnabled, workspace descendants replicate to a client only near the player and can arrive late or leave mid-session. Nothing outside the persistent set is guaranteed to exist client-side.

- **Never assume a workspace descendant exists on the client.** Reach it through `WaitForChild(name, timeout)` (with a timeout, so a never-streamed instance fails gracefully) or, better, a `CollectionService` tag signal (`GetInstanceAddedSignal`/`GetInstanceRemovedSignal`) so behavior binds as instances stream in and unbinds as they leave. Bare, timeout-less `WaitForChild` stays correct for always-replicated containers (`ReplicatedStorage`, `PlayerGui`) — see [false-positives.md](false-positives.md#streaming--bare-waitforchild-is-often-correct).
- **Pair every per-instance setup with a removal path.** Streamed-out instances fire `GetInstanceRemovedSignal`/`Destroying`; clear their per-instance state there, exactly as with player and character lifetimes.
- **Control what streams via `Model.ModelStreamingMode`** — `Atomic` (the model streams in/out as one unit), `Nonatomic`, `Default`, and `Persistent`/`PersistentPerPlayer` (never streamed out). Keep gameplay-critical anchors persistent; let cosmetic or distant content stream.
- **`Player:RequestStreamAroundAsync(position)`** hints the engine to stream a region in before a teleport or camera cut, reducing pop-in. It is a hint, not a guarantee — still design for missing instances.
- Server scripts see the whole DataModel regardless of streaming; these rules govern **client** code and replication timing. Verify with a multi-client session, not single-Play ([verification.md](verification.md)).

## Cross-Server Communication

- **MemoryStore** (sorted maps, queues, hash maps) for *ephemeral* shared state: matchmaking queues, live global leaderboards, session locks. Items always expire (45 days maximum); request quotas scale with player count and throttle under load — wrap calls in `pcall` + backoff exactly like DataStore, and keep values small. It is not a database: anything that must survive belongs in a DataStore.
- **MessagingService** for small cross-server broadcasts (announcements, cache-invalidation pings). Delivery is **best-effort** — design so a lost message is recoverable (receivers re-read the authoritative state from MemoryStore/DataStore; the message is a hint, not the source of truth). Messages are size-capped (~1 KB) — send ids/references, not data blobs. Route through one topic-subscriber module per server rather than ad-hoc subscribes scattered across scripts.
- **Reserved servers** (`TeleportService:ReserveServer`) for private instances/rooms. Teleport data travels via the client and is tamperable — treat it as a hint and re-validate anything security-relevant server-side on arrival (or pass it through MemoryStore keyed by a server-generated token instead).

## Object Pooling

```lua
-- | State Management | --
local projectilePool: {BasePart} = {}

-- Takes a projectile from the pool or creates one if empty
local function takeProjectile(): BasePart
	local part = table.remove(projectilePool)
	if not part then
		part = projectileTemplate:Clone()
	end
	part.Parent = workspace.Projectiles
	return part
end

-- Resets and returns a projectile to the pool
local function returnProjectile(part: BasePart)
	part.Parent = nil
	part.AssemblyLinearVelocity = Vector3.zero
	table.insert(projectilePool, part)
end
```

Pool anything spawned more than ~once per second. Always reset *all* mutated properties on return.

## Input (client)

- New projects: use the **Input Action System** (`InputAction`/`InputBinding`) rather than raw `UserInputService` — it handles rebinding and cross-device out of the box. Verify availability in the target environment first (SKILL.md → Environment & Scale); fall back to `ContextActionService` if absent.
- Legacy projects: `ContextActionService` over raw `UserInputService.InputBegan` for gameplay actions — it stacks/unbinds cleanly with UI and tools.
- Never read input on the server; the client sends validated *intents*.

## Anti-Patterns (reject on sight)

| Anti-pattern | Replace with |
|---|---|
| `while task.wait() do` polling a condition that has a signal | Event / `GetPropertyChangedSignal` / attribute signal. (Timed loops for genuinely periodic work — round timers, autosave, throttled scans — are fine) |
| `wait()`, `spawn()`, `delay()` | `task.wait()`, `task.spawn()`, `task.delay()` |
| Logic in `Touched` without debounce | Debounce table keyed by character + cooldown |
| `FindFirstChild` chains every frame | Resolve once in VARIABLES / on bind |
| Client-computed damage/currency sent to server | Server computes; client sends intent only |
| `RemoteFunction` server→client | RemoteEvent pair |
| Giant God-script | One module per responsibility; bootstrap script calls Init |
| `Instance.new("Part", parent)` (parent arg) | Create, set properties, parent last |
| Storing player data only in leaderstats | Session cache table; leaderstats is display-only |
| `getfenv`/`setfenv`/`loadstring` | Never — kills Luau optimization and is a security hole |
| `pcall` whose failure branch is silently ignored | Log the error with context or recover; a genuinely ignorable failure earns a one-line in-body comment, which is one of the few that do ([luau-language.md](luau-language.md#error-handling)) |
| Per-character state (connections, buffs) never cleared on respawn | Key by character, clear in `CharacterRemoving`/`Destroying` (see Character Lifecycle) |
