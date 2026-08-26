# Cases: Session & Multi-Server Flow

Blueprints for the systems that move players through time and across servers. These fail quietly in a single-Play test and loudly in production.

**Preflight:** identify the case → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → decide how you will verify it, with **multiple clients** ([verification.md](../verification.md)).

## Round and match lifecycle

**Recognize:** "round", "match", "lobby", "intermission", "game loop", "start the game"
**Dominant risk:** state leaking between rounds, and connections accumulating each cycle.
**Server/client:** the server owns the phase; clients render the current phase and its timer.
**Assembly:**
1. Model phases as an explicit **state machine** (waiting → intermission → in-round → ending), with one function per transition. Not a chain of nested `task.wait` calls.
2. Give each round a **generation id**. Any deferred work checks the id before acting, so a callback from the previous round cannot mutate the new one.
3. Create round-scoped resources through a single cleanup scope (a trove, or a connection bag) and tear it down in exactly one place at round end.
4. Timers are a **timed loop**, which is scheduling and legitimate, not polling. Broadcast the deadline once and let clients count down locally rather than replicating every tick.
5. Handle players joining mid-round and leaving mid-round explicitly; both are the normal case.
**Never:** rely on `task.wait` chains to sequence a round · leave per-round connections attached to persistent objects · assume the player set is stable across a phase.
**Failure modes:** a `task.delay` from round N firing during round N+1. The generation id check is what prevents it; a pending delay should also be cancelled in teardown ([luau-language.md](../luau-language.md#scheduling-the-task-library)).
**Verify:** run several rounds back to back and watch connection and instance counts stay flat.
**Deeper:** [patterns/lifecycle.md](../patterns/lifecycle.md#lifecycle--cleanup)

## Matchmaking and reserved servers

**Recognize:** "private server", "lobby queue", "matchmaking", "teleport to game", "party"
**Dominant risk:** trusting teleport data, and losing players to failed teleports.
**Server/client:** the server reserves, validates, and teleports; the client only requests.
**Assembly:**
1. Teleport the party together with `TeleportService:TeleportAsync`, reserving in the same call via `TeleportOptions.ShouldReserveServer = true` (or `ReserveServerAsync` when the code is needed up front). `ReserveServer`, `TeleportToPrivateServer`, `TeleportToPlaceInstance`, and `TeleportPartyAsync` are all deprecated ([style-rules.md](../style-rules.md)).
2. **Teleport data travels through the client and is tamperable.** Treat it as a hint; re-validate anything security-relevant on arrival, or pass a server-generated token and look the real payload up in MemoryStore.
3. Wrap teleports in `pcall` with retry, and handle failure by returning the player to a known-good place rather than leaving them stuck.
4. Save player data **before** teleporting; a teleport is a session end for persistence purposes.
5. Use MemoryStore queues for cross-server matchmaking state, with the expiry and quota limits in mind. `ReadAsync` hides an item for its invisibility timeout (30 seconds by default) and `RemoveAsync` completes the handoff, so the whole match-and-remove step must fit inside that window — and must tolerate running twice if it does not ([patterns/network.md](../patterns/network.md#cross-server-communication)).
**Never:** grant rewards or permissions based on unvalidated teleport data · teleport without a failure path · assume the destination server exists when the player arrives.
**Failure modes:** data saved on the origin server after the teleport begins, racing the load on the destination. Save, confirm, then teleport.
**Verify:** teleport with a forced failure injected and confirm the player lands somewhere valid with data intact.
**Deeper:** [patterns/network.md](../patterns/network.md#cross-server-communication)

## Cross-server events and announcements

**Recognize:** "global announcement", "server-wide event", "boss spawned everywhere", "cross-server"
**Dominant risk:** treating a best-effort message as a source of truth.
**Server/client:** servers coordinate through the platform; clients hear only what their own server tells them.
**Assembly:**
1. Put the authoritative state in **MemoryStore or a DataStore**. `MessagingService` carries only a **hint** that the state changed.
2. Design so a **lost message is recoverable**: on receipt, and on a slow periodic tick, re-read the authoritative state. Delivery is best-effort.
3. Keep messages small (ids and references, not payloads) and within the size cap.
4. Route all subscriptions through **one** topic-subscriber module per server, not ad-hoc subscribes scattered across scripts.
5. Wrap publish and subscribe in `pcall`; a messaging outage must not break gameplay.
**Never:** send game state as a message body · assume every server received a broadcast · subscribe from multiple scripts to the same topic.
**Failure modes:** an event that "mostly works" in testing and desynchronizes servers in production. The periodic re-read is what makes it converge.
**Budget:** message size and MemoryStore quotas in [limits-budgets.md](../limits-budgets.md#messaging).
**Verify:** drop a message deliberately and confirm the affected server converges on the next re-read.
**Deeper:** [patterns/network.md](../patterns/network.md#cross-server-communication)
