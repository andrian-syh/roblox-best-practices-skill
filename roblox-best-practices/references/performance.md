# Performance, Memory & Network Optimization

Rules for writing lightweight, fast, resource-frugal Luau. Ordered by impact.

**This file makes the code cheap.** For the budget it has to fit inside — frame time in milliseconds, time-slicing bulk work, device tiers, the quality degradation ladder, per-player bandwidth, and low-end memory ceilings — see [device-performance.md](device-performance.md).

## Contents

- [Start here: find what is actually slow](#start-here-find-what-is-actually-slow)
- [What costs what (relative, not measured)](#what-costs-what-relative-not-measured)
- [CPU](#cpu)
- [Physics queries and contact detection](#physics-queries-and-contact-detection)
- [Memory](#memory)
- [Network](#network)
- [Instances & Rendering](#instances--rendering)
- [Measurement (never optimize blind)](#measurement-never-optimize-blind)

## Start here: find what is actually slow

**Measure before optimizing, always.** The [Measurement](#measurement-never-optimize-blind) section is the entry point to this file, not an appendix. An optimization chosen from a symptom you did not measure is a guess that costs readability and buys nothing.

Match the symptom to where the cost actually lives. Guessing this wrong is why "optimized" code often changes nothing:

| Symptom | Usual cause | Read |
|---|---|---|
| Client FPS low everywhere, even standing still | Rendering and instance count, not Luau | [Instances & Rendering](#instances--rendering), [device-performance.md](device-performance.md) |
| Client FPS degrades as players or entities increase | Per-entity Luau, or replication volume | [CPU](#cpu), [Network](#network) |
| Server lag, high ping for everyone at once | Server physics (unanchored parts, Humanoids) or outbound replication | [Physics queries and contact detection](#physics-queries-and-contact-detection), [Network](#network) |
| Memory climbs across a session and never recovers | A leak: connections, or module tables keyed by Player/Instance | [Memory](#memory) |
| A spike at one moment (round start, teleport, first hit) | Bulk work in a single frame, or assets loading on demand | [device-performance.md](device-performance.md) time-slicing, plus pooling and preloading |
| Only low-end devices suffer | Memory ceiling or fill rate, not algorithmic cost | [device-performance.md](device-performance.md) |
| Stutter only when a network event fires | Payload size or a burst of remote calls | [Network](#network) |

**Know which side pays.** A rule aimed at the wrong side is worse than no rule: rendering and input cost only the client, physics simulation and replication fan-out cost the server, and Luau costs whichever side runs it. Rules below are marked **(client)**, **(server)**, or left unmarked where both pay. Placing a client-only API in a server Script is an error, not an inefficiency.

## What costs what (relative, not measured)

When two correct designs compete, pick by order of magnitude rather than instinct. These are **relative orderings, not measurements** — they say which side of a choice to start on, and the MicroProfiler settles anything close ([Measurement](#measurement-never-optimize-blind)).

| Cheaper | Than | Why it matters in practice |
|---|---|---|
| Reading a Luau table field | Reading an Instance property | Property access crosses into the engine; cache what you read repeatedly |
| Reading an Instance property | Writing one that replicates | A write reaches every client that can see the instance, so a per-frame write is network traffic, not just CPU |
| A cached local reference | `FindFirstChild` or a deep `a.b.c.d` path per frame | Resolve once at connection time; the path does not change between frames |
| Reusing a pooled instance | `Instance.new` plus `Destroy` | Churn costs GC pressure and physics re-registration ([patterns/lifecycle.md](patterns/lifecycle.md#object-pooling)) |
| One remote carrying ten fields | Ten remotes carrying one field each | Every call has overhead beyond its payload |
| A distance or magnitude comparison | A raycast or shapecast | Reject the obvious misses with cheap math **before** paying for a cast |
| `table.clear` on a reused table | A fresh table each iteration | Same result, no allocation ([false-positives.md](false-positives.md#performance--hot-loops--define-hot-first) scopes when this is worth doing) |
| `table.concat` | `..` inside a loop | Repeated concatenation allocates a new string every time |

**Order guards cheapest-first.** A handler that raycasts before checking whether the target is even in range has already paid the expensive question to answer the cheap one. This applies to validation too: type check, then ownership, then anything that touches the world.

## CPU

- **Hoist out of hot loops.** Anything inside `RunService` callbacks, `while` loops, or per-entity iteration must not: create tables/closures, concatenate strings, call `Instance:FindFirstChild`/`WaitForChild`/`GetChildren`, or index deep Instance paths. Resolve references once in VARIABLES or at connection time. What counts as a *hot* path, and which allocations are genuinely irreducible, is defined in [false-positives.md](false-positives.md#performance--hot-loops--define-hot-first) — hoist only what can be hoisted, and reuse with `table.clear` when a per-iteration table is unavoidable.
- **Cache repeated lookups.** `local floor = math.floor` matters only in extreme hot paths; caching *Instance* lookups and *attribute reads* matters everywhere.
- **Prefer `Heartbeat` over `RenderStepped` (client).** `PreRender`/`RenderStepped` blocks the frame — client-only, camera/visual work only. Gameplay logic belongs on `Heartbeat`. (Naming note: `Heartbeat` = `PostSimulation`, `RenderStepped` = `PreRender`, `Stepped` = `PreSimulation` — either name is acceptable; never flag one as wrong.)
- **`RunService:BindToSimulation(callback, frequency, priority)`** is for *fixed-rate physics/prediction code*: it requires `Workspace.UseFixedSimulation`, `frequency` is an `Enum.StepFrequency` (default 30 Hz), and the callback errors if it touches unsynchronized properties/methods. **Whether to use it depends on the place's authority mode:**
  - **Without Server Authority (the default):** do **not** use it for general gameplay logic — accumulate `deltaTime` on `Heartbeat` instead.
  - **Under Server Authority:** it is **required** for custom gameplay logic that must take part in the fixed simulation and client resimulation.

  Establish the mode before recommending or flagging either way ([server-authority.md](server-authority.md)).
- **Throttle naturally-slow work.** AI targeting, proximity scans, leaderboard sorts don't need 60 Hz. Accumulate `deltaTime` and run at 5–10 Hz, or stagger entities across frames (process `i % N == frame % N`).
- **Use the right primitives:** `vector`/`Vector3` math over per-component arithmetic; `buffer` for binary data and large numeric arrays; `table.create(n)` when the final size is known; `table.clear()` to reuse tables instead of reallocating.
- **String building:** collect into a table and `table.concat`, or use interpolation backticks; never `..` in a loop.
- **Native codegen:** for genuinely compute-heavy ModuleScripts (procedural generation, pathfinding math), add `--!native`. Don't scatter it everywhere — it costs memory.
- **Parallel Luau:** only for embarrassingly-parallel heavy work (raycast batches, terrain edits, procedural generation) via Actors. **The script must be a descendant of an `Actor` for any of this to apply** — `task.desynchronize()` in an ordinary script does nothing useful, which is the most common way this feature is written wrong. Each Actor runs its scripts in its own VM; call `task.desynchronize()` to enter the parallel phase and `task.synchronize()` to return before touching the DataModel (most write APIs are unsafe in parallel and error if called there). Share data across Actors with **`SharedTable`** (a thread-safe table visible to every VM) rather than passing Luau tables directly. Don't parallelize chatty logic — cross-VM synchronization overhead outweighs the gain; parallelize only when per-item compute dwarfs the coordination cost.

## Physics queries and contact detection

Contact detection is where a working feature turns into a lagging server, and the cost is paid by the **server** for anything gameplay-authoritative.

- **`Touched` is a trigger, not a hit test.** It fires from physics contacts, so it misses fast movers that pass through a part between steps, fires repeatedly while two parts rest together, and gets expensive when many parts have handlers. Keep it for coarse triggers where a miss is acceptable (a lava pad, a checkpoint), and debounce per pair. For anything that grants damage, currency, or progress, **query deliberately instead**.
- **Query instead of waiting to be told.** `workspace:Raycast`, the shapecasts (`Blockcast`, `Spherecast`, `Shapecast`), and the bounds queries (`GetPartBoundsInBox`, `GetPartBoundsInRadius`, `GetPartsInPart`) ask the exact question at the exact moment, which is both cheaper and easier to validate server-side. `Region3` is superseded by the bounds queries.
- **Reuse the params object.** `RaycastParams`/`OverlapParams` created inside a per-frame callback is the hoisting rule ([CPU](#cpu)) in its most common disguise. Build one at connection time and reuse it. Assigning `FilterDescendantsInstances` **copies the table**, so rebuild that list only when the filtered set actually changes, never once per cast.
- **Filter in the query, not in Luau.** A collision group or a filter list applied by the engine skips parts before they cost anything; a loop that discards unwanted results afterwards has already paid for them. Cap bounds queries with `OverlapParams.MaxParts` so a crowded moment cannot return an unbounded list.
- **Take parts out of the broadphase entirely.** `CanQuery = false` and `CanTouch = false` remove a part from raycasts and touch events; `CanCollide = false` removes it from collision resolution. Decoration should have all three off ([Instances & Rendering](#instances--rendering)).
- **Humanoids are not free (server).** Each `Humanoid` runs a state machine, and a server holding many NPC Humanoids pays for all of them continuously. Disable the states an NPC never uses with `Humanoid:SetStateEnabled`, and for simple movers consider no Humanoid at all ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)).
- **In review, an existing `Touched` trigger is not a finding on its own.** It is the right tool for coarse triggers, and allocations inside its callback are not hot-path findings ([false-positives.md](false-positives.md#performance--hot-loops--define-hot-first)). Report it only where a concrete failure follows: a fast projectile passing through, or a reward granted on an unvalidated contact.
- **A client-side query is a prediction, never a verdict.** Cast on the client for responsiveness if you must, but the server casts again before anything is granted ([security.md](security.md#movement--physics-sanity-checks)).

## Memory

- **Instances:** `Destroy()` everything you spawn when done. Destroying an Instance disconnects its connections and unparents descendants — it is the cheapest cleanup primitive. Never just `.Parent = nil` something you mean to discard.
- **Connections:** every `:Connect()` whose owner outlives the connected object leaks. Patterns:
  - Per-player tables of connections, disconnected in `PlayerRemoving`.
  - Connections on an Instance you own → let `Destroy()` handle them.
  - One-shot listeners → `:Once()` instead of `:Connect()` + manual disconnect.
- **Module-level tables keyed by Player/Instance** are the #1 leak source. Every insertion needs a matching removal path (`PlayerRemoving`, `Destroying`). Do not rely on weak tables (`__mode`) as a cleanup strategy.
- **Object pooling:** for frequently created/destroyed things (projectiles, VFX parts, damage numbers), keep a pool: take → reset properties → use → return. `Destroy`/`Instance.new` churn causes GC pressure and physics re-registration. A pool needs a ceiling and a full reset list to be worth it — [patterns/lifecycle.md](patterns/lifecycle.md#object-pooling) has both, and the reuse-specific failures are in [edge-cases.md](edge-cases.md#pooled-and-reused-objects).
- **Animations:** load each `Animation` once per `Animator` and keep the returned `AnimationTrack`; calling `LoadAnimation` every time something plays leaks tracks and re-downloads nothing but still costs. Play animations on the side that owns the character so they replicate once rather than being driven per client.
- **Effects and sounds churn like projectiles do.** A `ParticleEmitter` or `Sound` cloned per hit and destroyed afterwards is the same `Instance.new`/`Destroy` pattern pooling exists to fix — prefer `:Emit()` on a persistent emitter and a reused `Sound`, and remember that emitter cost scales with `Rate` × `Lifetime`, not with how visible the effect is.
- **Textures/assets:** reuse asset IDs; identical IDs share memory. Avoid loading giant one-off textures for tiny UI.

## Network

- **Server-authoritative always.** Client sends *intents*, server validates and executes. Validate every remote argument: `typeof` check, range clamp, ownership check, rate limit. Treat all client input as hostile.
- **RemoteEvent hygiene:**
  - Batch: one `UpdateState` remote with a payload table beats ten tiny remotes per frame.
  - Delta, don't dump: send changed fields, not the whole state table.
  - `UnreliableRemoteEvent` for high-frequency loss-tolerant data (cosmetic positions, VFX triggers, voice-adjacent pings). Reliable remotes for anything gameplay-critical.
  - `FireClient` targeted lists instead of `FireAllClients` when only some players care.
- **Prefer replication you get for free:** Attributes, tags, and property replication reach clients without custom remotes and are automatically streamed. Use remotes for *actions*, attributes for *state*.
  - **But an attribute is a broadcast.** Attributes and properties replicate to **every** client, so this rule holds only for state that is genuinely public (a door's locked flag, a match timer, a player's visible level). Per-player state that others should not see — inventory contents, currency, cooldowns, anything an exploiter could read to plan around — goes to its owner through a targeted remote instead. Choosing an attribute for private state is a security decision disguised as a performance one.
  - Writing a property to the value it already holds does not replicate and fires no change signal, so a `if newValue ~= currentValue then` guard around a per-frame write costs almost nothing and removes the traffic entirely.
- **StreamingEnabled awareness:** never assume workspace descendants exist on the client, and plan LoD around mesh streaming (default on modern engine versions). The full streaming pattern — `WaitForChild` timeouts, tag signals, `Model.ModelStreamingMode`, `RequestStreamAroundAsync` — lives in [patterns/network.md](patterns/network.md#streaming-streamingenabled).
- **Payload size:** numbers are cheap, strings and nested tables are not. For bulk data use `buffer` serialization.

## Instances & Rendering

Rendering cost is paid by the **client**; physics simulation of the same parts is paid by the **server**. Both are listed here because one instance choice usually moves both.

- Anchor everything static. Unanchored parts cost physics even when idle.
- Minimize part count: union/mesh static decoration, but beware overly complex collision — set `CollisionFidelity` to `Box`/`Hull` for decoration.
- `CanCollide = false`, `CanQuery = false`, `CanTouch = false` on parts that don't need them — each flag off removes work from physics/raycast broadphase.
- Use `Model.StreamingMode`/persistence deliberately; keep gameplay-critical anchors persistent.
- UI: avoid `UIGradient`/heavy effects on elements updated every frame; prefer native styling (UICorner, UIShadow, Styling/StyleQueries) over image assets.

## Measurement (never optimize blind)

- **MicroProfiler** (`Ctrl+F6`) for frame-time hotspots; wrap suspect code in `debug.profilebegin/profileend`.
- **ScriptProfiler** and **Developer Console → Memory** for scripts and leaks (watch `Instances` and `LuaHeap` trend over a long session).
- **Memory attribution:** `debug.setmemorycategory("SystemName")` at the top of a system's thread tags its subsequent allocations as a distinct category in the Developer Console memory view (`debug.resetmemorycategory()` restores the default) — it turns "LuaHeap is growing" into "the pet system is growing". `gcinfo()` (current heap in KB) logged periodically gives leak trend lines in telemetry.
- **Analytics → Client CPU Time Breakdown** attributes client frame cost across **Scripts, Networking, Physics, Animation, and Miscellaneous** from live sessions. Use it to decide *where* to optimize before touching code: a physics-bound experience is not fixed by micro-optimizing Luau.
- **Studio's Advanced Network Simulation** to test under packet loss/latency before shipping netcode.
- Structured logging (`LogService` `Info`/`Warn`/`Error` methods where available) with contextual data instead of bare `print` spam.

**Measuring afterwards is not optional either.** An optimization is a claim, and an unverified claim costs readability for nothing:

1. **Record the number before you change anything** — frame time, memory, or call count for the specific thing you suspect.
2. **Change one thing.** Two changes at once make an improvement and a regression cancel out invisibly.
3. **Measure again on the target device**, not in Studio. Studio runs client and server in one process and reports memory and frame time that no player will ever see ([device-performance.md](device-performance.md), [verification.md](verification.md#principles)).
4. **Revert what did not move the number.** Complexity kept on faith is complexity a future reader has to justify.
5. **Report the measurement, not the intent.** "Cut the per-frame table allocation; heap growth over five minutes fell from X to Y" is a result. "Optimized the update loop" is not.
