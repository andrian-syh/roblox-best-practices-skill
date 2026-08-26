# Remotes, Replication, and Cross-Server

Everything that crosses a boundary: client to server, server to client, and server to server. Part of the framework-agnostic pattern set indexed in [patterns.md](../patterns.md).

## Contents

- [Remote Communication](#remote-communication)
- [What survives a remote call](#what-survives-a-remote-call)
- [Cross-Server Communication](#cross-server-communication)
- [Streaming (StreamingEnabled)](#streaming-streamingenabled)

## Remote Communication

Server-side handler skeleton — every remote handler follows this shape:

```lua
--[[
	Executes a client request to equip an item, rejecting anything invalid.

	@param itemId unknown -- Untrusted client argument; validated before use
]]
local function onEquipRequest(player: Player, itemId: unknown)
	if typeof(itemId) ~= "string" then return end
	if not RateLimiter.Allow(player, "Equip", 5) then return end
	if not Inventory.Owns(player, itemId) then return end
	Inventory.Equip(player, itemId)
end
```

- A handler that type-checks and early-returns on bad input is already **complete**: the skeleton is the maximum shape, not a mandatory checklist. A harmless, idempotent action needs no rate/ownership layer, and silent rejection is correct (an error reply aids fuzzing). Don't report a lean handler as missing layers — see [false-positives.md](../false-positives.md#security--validation--a-handler-can-already-be-complete).
- **Every client-triggerable instance is a remote in disguise.** An exploiter can fire a `ProximityPrompt`, `ClickDetector`, or `DragDetector` from anywhere, at any rate, regardless of `Enabled`, `MaxActivationDistance`, or where their character actually is. Treat the resulting server-side event exactly like a `RemoteEvent` handler: re-verify distance, state, and ownership at execution time ([cases/world-interaction.md](../cases/world-interaction.md#interactable-objects-and-prompts)).
- Prefer `RemoteEvent` + a response event over `RemoteFunction` server→client (a client that never returns hangs your thread). Client→server `RemoteFunction` is acceptable with a server-side timeout mindset.
- Namespace remotes in one folder (`ReplicatedStorage/Remotes`); create them in one server script or build step so clients can `WaitForChild` deterministically.
- State that clients merely *display* → replicate via Attributes on the player/character instead of remotes.

## What survives a remote call

Remote arguments are **serialized, not passed**. The receiving side gets a copy built by the engine, and several shapes do not survive the trip. Each of these is a silent `nil` or a changed value rather than an error, which is why they are found in production instead of in review:

| Sent | Received |
|---|---|
| A function | `nil` |
| A table with non-string, non-numeric keys | Keys converted to strings |
| A mixed table (array part **and** string keys) | Mangled; send a pure array or a pure dictionary |
| A `nil` inside a table | Truncates or holes the table; never send one |
| A table with a metatable | Contents only; the metatable is stripped, so an OOP object arrives as plain data |
| An instance the receiver cannot see (`ServerStorage`, streamed out) | `nil` |
| Any table | A **copy**; the two sides no longer share identity, and mutating one does nothing to the other |

Consequences worth designing around: send **ids and plain data**, never live objects or class instances; rebuild behavior on the receiving side from a shared catalog module; and never use table identity as a token, because it does not survive.

## Cross-Server Communication

- **MemoryStore** (sorted maps, queues, hash maps) for *ephemeral* shared state: matchmaking queues, live global leaderboards, session locks. Items always expire (45 days maximum); request quotas scale with player count and throttle under load — wrap calls in `pcall` + backoff exactly like DataStore, and keep values small. It is not a database: anything that must survive belongs in a DataStore.
- **Pick the structure by shape, not habit.** A **sorted map** orders by sort key (numeric first, then string, then unkeyed) and is right below roughly a thousand keys; a **hash map** partitions itself automatically and is the choice above that; a **queue** is for work handed between servers. All three cap keys at 128 characters and values at 32 KB, and every item carries a TTL up to 45 days.
- **Queues hand work over safely through an invisibility timeout.** `ReadAsync` hides the item for a configurable window (30 seconds by default) and returns an id; `RemoveAsync` with that id completes the handoff. Crash or overrun the window and the item reappears for someone else — that is the delivery guarantee, so the read-process-remove sequence has to fit inside the timeout, and the processing has to tolerate running twice.
- **Spread hot keys across partitions.** Throttling is per partition, not per experience, so one key taking all the traffic throttles while the quota still looks fine. Shard deliberately: split a sorted map by key range, rotate across several queues, and in a hash map store fields as separate keys (`metadata_user_count`) rather than one nested object that forces every request onto a single partition.
- **Counters have their own primitive.** `MemoryStoreService:GetDistributedCounter` gives a shared counter for cross-server totals (concurrent players, global event progress) without the read-modify-write race a sorted map invites. It is **[Undocumented]** ([api-currency.md](../api-currency.md#engine)): the method and its `MemoryStoreDistributedCounter` class are both confirmed present, but no reference page describes their quota behavior, so confirm the counter's limits against your request budget in the target environment before designing around it. The sorted-map approach remains the fallback.
- **MessagingService** for small cross-server broadcasts (announcements, cache-invalidation pings). Delivery is **best-effort** — design so a lost message is recoverable (receivers re-read the authoritative state from MemoryStore/DataStore; the message is a hint, not the source of truth). Messages are size-capped (~1 KB) — send ids/references, not data blobs. Route through one topic-subscriber module per server rather than ad-hoc subscribes scattered across scripts.
- **Reserved servers** for private instances/rooms. `TeleportService:ReserveServer` is **deprecated** — reserve with `ReserveServerAsync`, or skip the separate reservation entirely by setting `TeleportOptions.ShouldReserveServer = true` and passing the options to `TeleportAsync`. To send players to an *existing* reserved server, set `TeleportOptions.ReservedServerAccessCode` instead; the two properties are mutually exclusive and combining them errors. Teleport data travels via the client and is tamperable — treat it as a hint and re-validate anything security-relevant server-side on arrival (or pass it through MemoryStore keyed by a server-generated token instead).

## Streaming (StreamingEnabled)

The single home for streaming rules; other references point here. With StreamingEnabled, workspace descendants replicate to a client only near the player and can arrive late or leave mid-session. Nothing outside the persistent set is guaranteed to exist client-side.

- **Never assume a workspace descendant exists on the client.** Reach it through `WaitForChild(name, timeout)` (with a timeout, so a never-streamed instance fails gracefully) or, better, a `CollectionService` tag signal (`GetInstanceAddedSignal`/`GetInstanceRemovedSignal`) so behavior binds as instances stream in and unbinds as they leave. Bare, timeout-less `WaitForChild` stays correct for always-replicated containers (`ReplicatedStorage`, `PlayerGui`) — see [false-positives.md](../false-positives.md#streaming--bare-waitforchild-is-often-correct).
- **Pair every per-instance setup with a removal path.** Streamed-out instances fire `GetInstanceRemovedSignal`/`Destroying`; clear their per-instance state there, exactly as with player and character lifetimes.
- **Control what streams via `Model.ModelStreamingMode`** — `Atomic` (the model streams in/out as one unit), `Nonatomic`, `Default`, and `Persistent`/`PersistentPerPlayer` (never streamed out). Keep gameplay-critical anchors persistent; let cosmetic or distant content stream.
- **`Player:RequestStreamAroundAsync(position)`** hints the engine to stream a region in before a teleport or camera cut, reducing pop-in. It is a hint, not a guarantee — still design for missing instances.
- Server scripts see the whole DataModel regardless of streaming; these rules govern **client** code and replication timing. Verify with a multi-client session, not single-Play ([verification.md](../verification.md)).
