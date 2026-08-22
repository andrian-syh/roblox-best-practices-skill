# Remotes, Replication, and Cross-Server

Everything that crosses a boundary: client to server, server to client, and server to server. Part of the framework-agnostic pattern set indexed in [patterns.md](../patterns.md).

## Contents

- [Remote Communication](#remote-communication)
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
- Prefer `RemoteEvent` + a response event over `RemoteFunction` server→client (a client that never returns hangs your thread). Client→server `RemoteFunction` is acceptable with a server-side timeout mindset.
- Namespace remotes in one folder (`ReplicatedStorage/Remotes`); create them in one server script or build step so clients can `WaitForChild` deterministically.
- State that clients merely *display* → replicate via Attributes on the player/character instead of remotes.

## Cross-Server Communication

- **MemoryStore** (sorted maps, queues, hash maps) for *ephemeral* shared state: matchmaking queues, live global leaderboards, session locks. Items always expire (45 days maximum); request quotas scale with player count and throttle under load — wrap calls in `pcall` + backoff exactly like DataStore, and keep values small. It is not a database: anything that must survive belongs in a DataStore.
- **Counters have their own primitive.** `MemoryStoreService:GetDistributedCounter` gives a shared counter for cross-server totals (concurrent players, global event progress) without the read-modify-write race a sorted map invites. It is **[Verify]** — recent enough that you confirm it in the target environment before designing around it ([api-currency.md](../api-currency.md#engine)); the sorted-map approach remains the fallback.
- **MessagingService** for small cross-server broadcasts (announcements, cache-invalidation pings). Delivery is **best-effort** — design so a lost message is recoverable (receivers re-read the authoritative state from MemoryStore/DataStore; the message is a hint, not the source of truth). Messages are size-capped (~1 KB) — send ids/references, not data blobs. Route through one topic-subscriber module per server rather than ad-hoc subscribes scattered across scripts.
- **Reserved servers** (`TeleportService:ReserveServer`) for private instances/rooms. Teleport data travels via the client and is tamperable — treat it as a hint and re-validate anything security-relevant server-side on arrival (or pass it through MemoryStore keyed by a server-generated token instead).

## Streaming (StreamingEnabled)

The single home for streaming rules; other references point here. With StreamingEnabled, workspace descendants replicate to a client only near the player and can arrive late or leave mid-session. Nothing outside the persistent set is guaranteed to exist client-side.

- **Never assume a workspace descendant exists on the client.** Reach it through `WaitForChild(name, timeout)` (with a timeout, so a never-streamed instance fails gracefully) or, better, a `CollectionService` tag signal (`GetInstanceAddedSignal`/`GetInstanceRemovedSignal`) so behavior binds as instances stream in and unbinds as they leave. Bare, timeout-less `WaitForChild` stays correct for always-replicated containers (`ReplicatedStorage`, `PlayerGui`) — see [false-positives.md](../false-positives.md#streaming--bare-waitforchild-is-often-correct).
- **Pair every per-instance setup with a removal path.** Streamed-out instances fire `GetInstanceRemovedSignal`/`Destroying`; clear their per-instance state there, exactly as with player and character lifetimes.
- **Control what streams via `Model.ModelStreamingMode`** — `Atomic` (the model streams in/out as one unit), `Nonatomic`, `Default`, and `Persistent`/`PersistentPerPlayer` (never streamed out). Keep gameplay-critical anchors persistent; let cosmetic or distant content stream.
- **`Player:RequestStreamAroundAsync(position)`** hints the engine to stream a region in before a teleport or camera cut, reducing pop-in. It is a hint, not a guarantee — still design for missing instances.
- Server scripts see the whole DataModel regardless of streaming; these rules govern **client** code and replication timing. Verify with a multi-client session, not single-Play ([verification.md](../verification.md)).

