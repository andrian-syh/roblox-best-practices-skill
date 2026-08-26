# Genre Playbook

Every rule in this skill applies to every genre — but each genre has a **dominant risk profile** that decides where to invest the most care. Real games mix genres: pick the profile *per feature* (a combat system in an RPG follows the Combat profile), not per game.

## Contents

- [Simulator / Tycoon / Idle](#simulator--tycoon--idle)
- [Tower Defense / Wave Defense](#tower-defense--wave-defense)
- [Combat / FPS / PvP](#combat--fps--pvp)
- [Battlegrounds / Fighting / Melee PvP](#battlegrounds--fighting--melee-pvp)
- [Obby / Platformer](#obby--platformer)
- [RPG / Adventure / Open World](#rpg--adventure--open-world)
- [Racing / Vehicle](#racing--vehicle)
- [Horror / Story / Atmosphere](#horror--story--atmosphere)
- [Social / Hangout / Roleplay](#social--hangout--roleplay)
- [Using this playbook](#using-this-playbook)

## Simulator / Tycoon / Idle

**Dominant risk: data integrity & economy.** Players grind for numbers; losing or duping them kills the game.

- Data rules from [patterns.md](patterns.md) (or ProfileStore via [community-libraries.md](community-libraries.md)) at full strictness: session locking matters here more than anywhere — server-hop duplication targets these games.
- All currency/progress math on the server; the client only *displays*. Rebirth/prestige multipliers recomputed server-side from source data, never accepted from the client.
- Offline/AFK progress: compute from timestamps (`os.time()` delta) on load — never from a client-reported duration.
- Big numbers: past ~2^53 doubles lose integer precision — use a big-number representation (mantissa+exponent) for display *and* storage before you get there.
- Autosave every 2–5 min; these games have long sessions and crashes must not erase an hour. Do not go tighter than hourly *thinking* it buys backups — repeated writes to one key inside a UTC hour overwrite each other permanently, so version history keeps only the last of them ([limits-budgets.md](limits-budgets.md#data-stores)).
- Update loops for hundreds of pets/generators: one staggered Heartbeat system iterating a table ([performance.md](performance.md) throttling), never a script or `while` loop per entity.

## Tower Defense / Wave Defense

**Dominant risk: server CPU at unit scale & economy integrity.**

- One staggered update system iterates *all* units — never a script or loop per unit; pool units and projectiles ([performance.md](performance.md), [patterns/lifecycle.md](patterns/lifecycle.md#object-pooling)).
- Pathfinding: compute a path once per path-change event (map edit, tower placement) and share the waypoint list across every unit on it — never per-unit, never per-frame. Clients interpolate movement from minimal replicated state (path id + progress scalar) instead of receiving per-frame CFrames.
- Tower placement fully server-validated: funds, grid/zone legality, collision and placement limits — the client-side preview is cosmetic only.
- Wave and economy state is server-side, data-driven config (wave tables, spawn schedules, scaling curves) — not bespoke scripts per wave.
- Damage, kill credit, and reward math on the server; in co-op, compute reward splits once server-side, never per-client.

## Combat / FPS / PvP

**Dominant risk: latency & cheating.** Fairness perception decides retention.

- Server-authoritative hits with *bounded lag tolerance*: validate the shot server-side (muzzle origin proximity, distance, line-of-sight, fire-rate via `os.clock()`, ammo) with a bounded lag allowance (e.g. rewind capped at 300–500 ms); a pure server raycast feels broken at 150 ms ping, but unbounded rewind enables artificial lag switches.
- Client predicts (muzzle flash, tracer, hit-marker immediately), server confirms (damage, kill). Reconcile visibly wrong predictions quietly.
- `UnreliableRemoteEvent` for tracers/VFX/footsteps; reliable remotes for damage events.
- Anti-cheat sanity checks ([security.md](security.md)): speed/teleport deltas, fire-rate caps, ammo accounting — all server-side.
- **Confirm the authority mode before designing the netcode.** Server Authority is [GA] but **off unless the place enables it**; under it, movement validation is engine-side and inputs flow through the Input Action System, while without it the manual checks above are the correct baseline. Both paths: [server-authority.md](server-authority.md). This genre is the strongest candidate for adopting it.
- Character physics is client-owned by design; never trust client-reported hit positions or raycast origins without server proximity checks.
- Fixed-rate combat logic (`RunService` Heartbeat with accumulated dt; `BindToSimulation` only for synchronized physics/prediction code under `Workspace.UseFixedSimulation` — see [performance.md](performance.md)) so higher-FPS clients gain no advantage.

## Battlegrounds / Fighting / Melee PvP

**Dominant risk: combat feel vs. authority.** Shares the Combat/FPS profile above; melee/combo specifics below.

- Combo, stun, and knockback state machines live server-side; the client plays animation and VFX instantly (prediction), the server confirms damage and state transitions. Reconcile mispredictions quietly.
- Animation-driven hitboxes are validated server-side by **timing windows** (the attack's active frames plus a lag allowance) and spatial checks (range, facing) — never by client-reported hits alone, and never by trusting the client's animation state.
- M1 chains and ability casts: per-action rate limits with cooldowns checked server-side; buffer at most one queued input — deeper input queues become macro exploits.
- Ragdolls: physics runs on the network owner for smoothness, but ragdoll *state* (start, duration, recovery) is server-authoritative so a client can't cancel its own stun.
- Engine **Server Authority** suits this genre, but check the **8 animation tracks per Animator** ceiling first — layered combat animation hits it fast ([server-authority.md](server-authority.md#known-limitations-as-of-ga)).

## Obby / Platformer

**Dominant risk: none — keep it simple.** Client-owned character physics does most of the work; over-engineering is the actual pitfall.

- Checkpoints: store stage number in data + an attribute; respawn via `Player.RespawnLocation` or `CharacterAdded` teleport. Validate stage *progression* server-side (stage N requires N-1) so exploiters can't remote themselves to the end.
- Kill-bricks/hazards via one CollectionService-tagged handler ([patterns.md](patterns.md) Behavior Binding) with debounce — not a script per part.
- Moving platforms: `TweenService` on anchored parts (or `AlignPosition`); beware `Touched` reliability on fast platforms — use zone checks for critical triggers.
- Minimal server load and data (stage + best time); this genre tolerates aggressive StreamingEnabled settings well.

## RPG / Adventure / Open World

**Dominant risk: state complexity.** Inventory, quests, and world state grow until they collapse.

- Schema-first: define typed data shapes for inventory items, quest states, world flags in a shared types module. Version the schema and write migrations on load ([patterns.md](patterns.md)).
- Items are IDs + metadata referencing a static catalog module — never store full item definitions per player.
- Quest logic server-side as data-driven state machines (stage, objectives, counters), not bespoke scripts per quest.
- Large worlds: StreamingEnabled with deliberate `ModelStreamingMode`; gameplay-critical anchors persistent; all client code tolerant of missing instances ([performance.md](performance.md) StreamingEnabled awareness).
- NPCs: stagger AI updates, pool pathfinding requests, disable/downgrade AI beyond player radius.

## Racing / Vehicle

**Dominant risk: physics ownership & replication.**

- Set network ownership explicitly: `vehicle:SetNetworkOwner(driver)` on enter, back to `nil` (server) or auto on exit. Unowned high-speed vehicles rubber-band.
- Constraint-based vehicles (`CylindricalConstraint`, `SpringConstraint`, `VectorForce`) — never legacy Body movers.
- Race outcomes validated server-side from checkpoint-crossing order and timestamps; lap times measured on the server, displayed from the client.
- `Workspace.ImprovedPhysicsReplication` **[GA]** takes the optimized server/client state-synchronization path ([api-currency.md](api-currency.md#engine)); test with Network Simulation at 100+ ms before shipping.
- Client-owned vehicle positions are cosmetic to other players — anti-cheat here means plausibility checks (max speed per vehicle class), not exact simulation.

## Horror / Story / Atmosphere

**Dominant risk: performance vs. fidelity.** The genre sells lighting, audio, and pacing on the lowest-end device.

- Lighting: prefer baked/local lighting moods per zone over global changes; changing many light properties per frame is expensive — tween sparingly.
- Audio: positional `AudioEmitter`/acoustic simulation where available; preload critical sounds (`ContentProvider:PreloadAsync`) at chapter starts, not mid-scare.
- Cutscenes/camera: client-side on `PreRender`/camera scriptable mode; server only orchestrates *when*, never *how* the camera moves.
- Event scripting: data-driven trigger zones (tags + attributes) → sequence runner module, not one script per scare.
- Monster AI server-side for authority, but telegraph movement client-side (animation lead-in) to hide latency.

## Social / Hangout / Roleplay

**Dominant risk: player density & platform features.**

- Avatars dominate memory/CPU: cap simultaneous loaded accessories where possible, and profile with 30+ avatars in one place — not with 2 testers.
- Chat: `TextChatService` (never the legacy chat), channel setup server-side, filtering is automatic but *any* custom text display must go through `TextService:FilterStringAsync` — on the server, after submission, never per keystroke as the player types ([ui-crossplatform.md](ui-crossplatform.md#text-input-and-filtering)).
- Voice/large servers: design POIs so 50–100 players spread out; density hotspots are the perf killer.
- Matchmaking/instances: reserved servers (`TeleportAsync` with `TeleportOptions.ShouldReserveServer`; `ReserveServer` is deprecated) for private rooms; `MemoryStoreService` for cross-server presence/queues; MessagingService for announcements.
- Emotes/animations: pooled and event-driven; never a loop per player scanning state.

## Using this playbook

1. Identify the dominant profile for the feature you're writing.
2. Read the linked reference sections for that profile *before* coding.
3. The section layout, cleanup, and validation rules are identical in every genre — only the emphasis moves.
