# Performance, Memory & Network Optimization

Rules for writing lightweight, fast, resource-frugal Luau. Ordered by impact.

**This file makes the code cheap.** For the budget it has to fit inside — frame time in milliseconds, time-slicing bulk work, device tiers, the quality degradation ladder, per-player bandwidth, and low-end memory ceilings — see [device-performance.md](device-performance.md).

## Contents

- [Start here: find what is actually slow](#start-here-find-what-is-actually-slow)
- [What costs what (relative, not measured)](#what-costs-what-relative-not-measured)
- [What the VM rewards](#what-the-vm-rewards)
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
| Ping high for everyone while client FPS looks fine | The **server** is missing its frame: check Server Jobs → Heartbeat → Steps Per Sec (capped at 60) | [Physics queries and contact detection](#physics-queries-and-contact-detection), [Network](#network) |
| Data Ping far above Network Ping | Replication queues are backed up, not the connection | [Network](#network), [device-performance.md](device-performance.md#bandwidth-per-player) |
| Crashes on low-end devices, fine elsewhere | Memory, not compute | [device-performance.md](device-performance.md#memory-on-low-end-devices) |
| Slow to get into the game | Join payload and asset loading, not runtime cost | [device-performance.md](device-performance.md#join-time) |

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

## What the VM rewards

From Luau's own performance documentation — these are properties of the implementation, not heuristics.

- **Constant field names hit the inline cache.** Luau predicts the hash slot for `t.field` and corrects itself at runtime. `t[key]` with a computed key cannot be predicted, so a hot loop indexing by a variable pays every time where the dotted form does not.
- **`#t` is effectively constant-time** — the length is cached and the element at `#t` is guaranteed to live in the array part. Caching `#t` into a local before a loop is a micro-optimization, not a requirement.
- **`ipairs`, `pairs`, and generalized `for ... in` all have specialized bytecode** with no per-iteration function call. This is the implementation reason the skill never flags `pairs`/`ipairs` ([false-positives.md](false-positives.md)).
- **Preallocate when the size is known:** `table.create(n)` or a literal with every field present beats growing a table field by field.
- **`loadstring`, `getfenv`, and `setfenv` force dynamic deoptimization** for the enclosing script. Their cost is not the call — it is everything around them getting slower.
- Values are 16 bytes (tagged storage, not NaN-boxing), and `vector` is a native 32-bit 3-wide SIMD type rather than a table — which is why `vector` math is cheap and a `{x, y, z}` table is not ([luau-language.md](luau-language.md#standard-library--recent-additions)).

## CPU

- **Hoist out of hot loops.** Anything inside `RunService` callbacks, `while` loops, or per-entity iteration must not: create tables/closures, concatenate strings, call `Instance:FindFirstChild`/`WaitForChild`/`GetChildren`, or index deep Instance paths. Resolve references once in VARIABLES or at connection time. What counts as a *hot* path, and which allocations are genuinely irreducible, is defined in [false-positives.md](false-positives.md#performance--hot-loops--define-hot-first) — hoist only what can be hoisted, and reuse with `table.clear` when a per-iteration table is unavoidable.
- **Cache repeated lookups.** `local floor = math.floor` matters only in extreme hot paths; caching *Instance* lookups and *attribute reads* matters everywhere.
- **Put work on the right scheduler phase.** The frame runs `PreAnimation` → `PreSimulation` → physics → `PostSimulation` → `PreRender`/`BindToRenderStep` → render, and the phase decides whether your work is seen or overwritten:
  - **`PreSimulation`** for gameplay logic that *feeds* physics (applying a velocity), and for **`Motor6D.Transform` writes** — Animators overwrite transforms written later in the frame.
  - **`PostSimulation`** (`Heartbeat`) for logic that *reacts* to physics results, such as reading a resulting position. This is where general gameplay logic belongs.
  - **`PreRender`/`BindToRenderStep`** only for camera and input-dependent visual work, client-side. It blocks the frame.
  (Naming note: `Heartbeat` = `PostSimulation`, `RenderStepped` = `PreRender`, `Stepped` = `PreSimulation` — either name is acceptable; never flag one as wrong.)
- **`RunService:BindToSimulation(callback, frequency, priority)`** is for *fixed-rate physics/prediction code*: it requires `Workspace.UseFixedSimulation`, `frequency` is an `Enum.StepFrequency` (default 30 Hz), and the callback errors if it touches unsynchronized properties/methods. **Whether to use it depends on the place's authority mode:**
  - **Without Server Authority (the default):** do **not** use it for general gameplay logic — accumulate `deltaTime` on `Heartbeat` instead.
  - **Under Server Authority:** it is **required** for custom gameplay logic that must take part in the fixed simulation and client resimulation.

  Establish the mode before recommending or flagging either way ([server-authority.md](server-authority.md)).
- **Throttle naturally-slow work.** AI targeting, proximity scans, leaderboard sorts don't need 60 Hz. Accumulate `deltaTime` and run at 5–10 Hz, or stagger entities across frames (process `i % N == frame % N`).
- **Use the right primitives:** `vector`/`Vector3` math over per-component arithmetic; `buffer` for binary data and large numeric arrays; `table.create(n)` when the final size is known; `table.clear()` to reuse tables instead of reallocating.
- **String building:** collect into a table and `table.concat`, or use interpolation backticks; never `..` in a loop.
- **Native codegen & compiler optimization:** for genuinely compute-heavy ModuleScripts (procedural generation, pathfinding math, raycast batches), add `--!native` and `--!optimize 2` (or the `@native` function attribute for specific hot functions). Don't scatter `--!native` everywhere — native code generation increases code size and memory footprint.
- **Client-side tweening mandate:** **never run `TweenService` on the server to animate part positions or visuals.** Server-side tweening replicates the interpolated property to every client at 60 Hz, creating massive network traffic and jittery movement under latency. The server sets or replicates the target state; the client executes the tween locally.
- **FastCluster & Avatar Hierarchy Stability:**
  - For procedural animations, update `Motor6D.Transform` (on `PreSimulation`, or an Animator will overwrite it) instead of `JointInstance.C0` or `JointInstance.C1`, which triggers full FastCluster rebuilds every frame.
  - Skinned MeshParts in a Model without a Humanoid use spatial FastClusters, which rebuild whenever the parts move; embedding a `Humanoid` overrides this behavior and forces a single, unified FastCluster for the Model.
  - Avoid adding, removing, or re-scaling parts inside avatar hierarchies at runtime during gameplay.
- **Parallel Luau & Actor Model:** reserved for compute-heavy, embarrassingly-parallel workloads (raycast batches, noise generation, procedural terrain/chunk calculations, heavy spatial AI).
  - **Hierarchy prerequisite:** the running script **must be a descendant of an `Actor`** instance (or bind via `Actor:BindToMessageParallel`) for multi-threading to take effect; calling `task.desynchronize()` in a regular script outside an Actor does nothing useful.
  - **Thread-safety split:**
    - **Four documented safety levels, not two.** Every API carries one: **Unsafe** (never in parallel), **Read Parallel** (read-only in parallel), **Local Safe** (read/write within the same actor; other actors may only read), and **Safe** (read/write across actors). The engine's thread-safety reference is the authority for a given member; the shapes below are the common cases.
    - **ReadParallel / Safe:** `workspace:Raycast`, spatial bounds reads, instance property reads, pure math/geometry, `buffer` operations, and `SharedTable` reads/writes are safe to execute concurrently in the parallel phase (`task.desynchronize()`). `SharedTable` is the thread-safe structure for results several actors update, and its updates are atomic.
    - **Unsafe (Serial only):** DataModel mutation (changing `CFrame`, `Parent`, creating/destroying Instances, `workspace:BulkMoveTo`, `Terrain:WriteVoxels`) is unsafe in parallel and throws errors or creates race conditions. **`require()` cannot be called during a parallel phase** — resolve every module in serial before desynchronizing.
    - **Entering parallel:** `task.desynchronize()` from inside an `Actor`, `signal:ConnectParallel(callback)` for a signal handler, or `Actor:BindToMessageParallel(name, callback)` for actor messages. The engine's thread-safety documentation is the authority on whether a specific API is callable in parallel; the split above is the shape, not the whole list.
  - **Execution pattern (Parallel Compute → Batch Serial Write):**
    1. Call `task.desynchronize()` to enter parallel execution.
    2. Perform heavy calculations, spatial reads, or raycasts.
    3. Store computed results in a local buffer or `SharedTable`.
    4. Call `task.synchronize()` to return to the serial main thread.
    5. Batch-apply mutations to the DataModel (e.g. `workspace:BulkMoveTo` for moving multiple parts in one go).
  - **Anti-patterns to avoid:**
    - *Chatty sync/desync:* repeatedly switching between parallel and serial phases inside small loops introduces context-switching overhead that negates multi-core gains.
    - *Thread contention:* do not let hundreds of individual entity scripts independently call `task.synchronize()` in the same frame to update their own parts. Instead, aggregate work into a central coordinator or batch mover.
    - *An actor per entity:* more actors is not more speed. Pick a granularity you can still reason about, and never parent an `Actor` under another `Actor`.
    - *A long computation is still long in parallel:* the parallel phase has to finish before the frame does, so slicing across frames still applies ([device-performance.md](device-performance.md#time-slicing-bulk-work)).

## Physics queries and contact detection

Contact detection is where a working feature turns into a lagging server, and the cost is paid by the **server** for anything gameplay-authoritative.

- **`Touched` is a trigger, not a hit test.** It fires from physics contacts, so it misses fast movers that pass through a part between steps, fires repeatedly while two parts rest together, and gets expensive when many parts have handlers. Keep it for coarse triggers where a miss is acceptable (a lava pad, a checkpoint), and debounce per pair. For anything that grants damage, currency, or progress, **query deliberately instead**.
- **Query instead of waiting to be told.** `workspace:Raycast`, the shapecasts (`Blockcast`, `Spherecast`, `Shapecast`), and the bounds queries (`GetPartBoundsInBox`, `GetPartBoundsInRadius`, `GetPartsInPart`) ask the exact question at the exact moment, which is both cheaper and easier to validate server-side. `Region3` is superseded by the bounds queries.
- **Reuse the params object.** `RaycastParams`/`OverlapParams` created inside a per-frame callback is the hoisting rule ([CPU](#cpu)) in its most common disguise. Build one at connection time and reuse it. Assigning `FilterDescendantsInstances` **copies the table**, so rebuild that list only when the filtered set actually changes, never once per cast.
- **Filter in the query, not in Luau.** A collision group or a filter list applied by the engine skips parts before they cost anything; a loop that discards unwanted results afterwards has already paid for them. Cap bounds queries with `OverlapParams.MaxParts` so a crowded moment cannot return an unbounded list.
- **Take parts out of the broadphase entirely.** `CanQuery = false` and `CanTouch = false` remove a part from raycasts and touch events; `CanCollide = false` removes it from collision resolution. Decoration should have all three off ([Instances & Rendering](#instances--rendering)).
- **Keep physics on adaptive stepping.** `Workspace.PhysicsSteppingMethod` defaults to `Adaptive`, which assigns each assembly 240, 120, or 60 Hz by need; `Fixed` runs everything at 240 Hz for maximum stability and maximum cost. It is **not scriptable** — it is set in Studio, so a recommendation here is a Studio change for the user to make, never a line of code. Watch the island distribution across the three rates in the MicroProfiler.
- **Humanoids are not free (server).** Each `Humanoid` runs a state machine, and a server holding many NPC Humanoids pays for all of them continuously. Disable the states an NPC never uses with `Humanoid:SetStateEnabled`, and for simple movers consider no Humanoid at all ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)).
- **In review, an existing `Touched` trigger is not a finding on its own.** It is the right tool for coarse triggers, and allocations inside its callback are not hot-path findings ([false-positives.md](false-positives.md#performance--hot-loops--define-hot-first)). Report it only where a concrete failure follows: a fast projectile passing through, or a reward granted on an unvalidated contact.
- **A client-side query is a prediction, never a verdict.** Cast on the client for responsiveness if you must, but the server casts again before anything is granted ([security.md](security.md#movement--physics-sanity-checks)).

## Memory

- **Instances:** `Destroy()` everything you spawn when done. Destroying an Instance disconnects its connections and unparents descendants — it is the cheapest cleanup primitive. Never just `.Parent = nil` something you mean to discard.
- **Player & Character Lifecycle:** the engine **does not** automatically destroy `Player` and character models when a user disconnects if active connections still reference them. Enable `Workspace.PlayerCharacterDestroyBehavior` for automatic cleanup, or clean them up explicitly with `task.defer(character.Destroy, character)` on `PlayerRemoving`.
- **Server Memory Ceiling:** total server memory is `6.25 GiB + (100 MiB * largest_number_of_connected_players)`. Servers allocate memory when players join but **do not deallocate it when players leave**. Keep total server memory consumption **below 50%** of capacity to prevent server crashes.
- **Connections:** every `:Connect()` whose owner outlives the connected object leaks. Patterns:
  - Per-player tables of connections, disconnected in `PlayerRemoving`.
  - Connections on an Instance you own → let `Destroy()` handle them.
  - One-shot listeners → `:Once()` instead of `:Connect()` + manual disconnect.
- **Drop the reference, not just the parent.** A large table or an unparented instance stays in memory as long as any variable still names it; assigning `nil` to that variable is what lets the collector take it. In a long-lived script, releasing a big intermediate result is the difference between a flat heap and a climbing one.
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
- Use `Model.ModelStreamingMode`/persistence deliberately; keep gameplay-critical anchors persistent.
- UI: avoid `UIGradient`/heavy effects on elements updated every frame; prefer native styling (UICorner, UIShadow) over image assets. Reach for `StyleQuery` **[GA]** before writing a Luau branch on screen size, input device, or an accessibility setting ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)).

## Measurement (never optimize blind)

- **Script Profiler (Studio & In-Game Dev Console):**
  - Run sampling for 10 seconds under realistic entity/player load.
  - Analyze the **Call Tree** and **Flame Graph** views.
  - Sort by **Self Time %** (time spent exclusively in that function, excluding child calls). `Self Time > 5%` or `Total Time > 15%` marks a candidate — a working heuristic of this skill's, not a published figure ([api-currency.md](api-currency.md#performance-figures-and-where-they-come-from)); what matters is which function tops the list in a capture that missed its frame target.
  - Inspect **Rate (Hz)** / Call Count: functions running at 60 Hz that could be event-driven or throttled to 5–10 Hz should be rescheduled.
- **MicroProfiler.** Studio and desktop client: `Ctrl+F6` (`⌘F6`); in the running client the toggle is `Ctrl+Alt+F6` or `Ctrl+Shift+F6`. `Ctrl+P` pauses a capture and opens detailed mode, `Ctrl+F` searches tasks. On mobile, enable it in the settings menu and read the web UI at the printed `IP:port` (30 frames by default; append `/90` for more). Dumps save as standalone HTML named `microprofile-<date>-<time>.html` under `%LOCALAPPDATA%\Roblox\logs` (Windows) or `~/Library/Logs/Roblox` (macOS). A server capture is limited to 60 frames with at most a 4-second delay before it starts.
  - **Read the bar heights first.** Uniformly tall bars are a sustained frame-time problem; isolated spikes are a different investigation. The frame-time bars to compare against: **33.33 ms** = 30 FPS, **16.67 ms** = 60 FPS, **8.33 ms** = 120 FPS, **4.17 ms** = 240 FPS. Red bars appear when **GPU Wait Time exceeds 2.5 ms**, which points at the GPU rather than at your Luau.
  - **Modes** switch what the capture tells you: **Detailed** (per-task timeline), **Timers** (labels with processing time and call counts), **Counters** (instance counts and memory in bytes; the one mode that keeps whole-runtime data), plus **Groups** and **Threads** in the web UI, and **Hidden** on desktop for saving frames without the bar clutter.
  - **Tag your own code.** `debug.profilebegin("Label")` / `debug.profileend()` around a suspect section makes it a named scope in the capture, which is how you confirm the code you suspect is the code that costs.
  - **The three threads** are Main (CPU rendering), Worker (networking and physics), and Render (GPU communication).
  - Engine tag names and their documented mitigations are in the official tag table; the ones this skill's rules bear on:

  | Engine tag (documented path) | What it covers | Documented mitigation |
  |---|---|---|
  | `Prepare/UpdatePrepare/updateInvalidatedFastClusters` | Geometry prep for humanoids and skinned meshes | Minimize visual model changes; drive procedural animation through `Motor6D.Transform`, and embed a `Humanoid` in moving skinned models |
  | `Simulation/gameStepped/stepHumanoid` | Humanoid state changes and movement | Reduce Humanoid count; disable unused states via `SetStateEnabled`; `AnimationController` for static NPCs |
  | `Simulation/gameStepped/stepAnimation` | Animators stepping playing animations | Lower animator and animated-joint counts; play NPC animations on the client |
  | `Replicator/ProcessPackets`, `Allocate Bandwidth and Run Senders/...` | Inbound packet processing and outbound sends | Replicate fewer objects and events; send incremental updates; reduce streaming radii |
  | `Perform/Scene/computeLightingPerform/ShadowMapSystem`, `.../LightGridCPU` | Shadow maps and voxel lighting | Fewer lights; disable `CastShadow` on less important instances; anchor parts and use lower-resolution geometry |
  | `Simulation/physicsSteppedTotal/physicsStepped` (`worldStep`, `stepContacts`) | Physics simulation, contacts, solver | Fewer simulated bodies; simple collision shapes; fewer simultaneous collisions |
  | `GC` | Luau garbage collection | Pool tables; create fewer temporary objects |
  | `WaitingHybridScriptJob` | Scripts resuming from `WaitForChild`/`wait` | Fewer waiting scripts, less work before the yield |

  **Threshold discipline:** the documentation publishes the frame bars and the 2.5 ms GPU-wait rule, not a per-tag millisecond budget. A tag is a finding when it is a large share of a frame that misses your target, not because it crossed a number someone made up. Compare a tag against its own baseline capture.
- **Network view (inside a MicroProfiler capture).** The top row is received traffic, the bottom row is sent; stacked bars are colored **blue for physics, green for data, red for assets**. Verbosity is **High** (item-level batch contents, deserialization tasks, asset ids), **Low** (cheaper, more frames per dump), or **Off**. Right-click opens the Network events window with size, direction, and packet type. This is where a payload problem becomes visible as a specific event rather than a suspicion.
- **Scene Analysis (`Window` → `Performance Summary` → `Scene Analysis`)** compares client and server scenes during a play session as a treemap plus a searchable list, with right-click to jump to the instance in Explorer. Six views:
  - **Unparented Instances** — which scripts or modules still hold references to destroyed instances. The leak view.
  - **Script Memory** — Luau VM memory per Script/LocalScript/ModuleScript (tables and allocations, not asset memory).
  - **Instance Composition** — current instances by category, where an unexpected count (a thousand particle emitters) shows up.
  - **Animation Memory** — animation asset memory; scripts commonly keep animations alive after the parent model is destroyed.
  - **Audio Memory** — memory per audio asset; it unloads when the referencing instances go.
  - **Triangle Composition** — triangles and draw calls split by pass (Shadows, Opaque, Transparent, Terrain, Grass, Particles, Sky, UI).

  `SceneAnalysisService` exposes the same data to code: `GetInstanceCompositionAsync`, `GetScriptMemoryAsync`, `GetUnparentedInstancesAsync`, `GetTriangleCompositionAsync`, `GetAnimationMemoryAsync`, `GetAudioMemoryAsync`.
- **Developer Console (`F9`) & Memory Tags:**
  - Monitor `LuaGarbageCollector` / `LuaHeap` (Luau allocations), `Signals` (active event listeners), `Instances`, and `PhysicsParts`; `PlaceMemory` labels attribute client memory to assets.
  - **Server heartbeat** is the server's frame rate: **Server Jobs → Heartbeat → Steps Per Sec**, capped at 60. Anything below means the server is not keeping up, and it surfaces to players as ping rather than as frame drops.
  - Use `debug.setmemorycategory("SystemName")` at the root of a subsystem to isolate memory growth.
- **Overlays:** **Performance Stats** (`Ctrl+Alt+F7`) for memory, CPU, GPU, network and ping; **Performance Summary** (`Ctrl+Shift+F5`) for the frame rate against the 60 FPS target; **Debug Stats** (`Shift+Ctrl+F1` summary, `F2` render, `F3` physics and Data Ping, `F5` memory).
- **Network Simulation (`Alt+S`)** applies latency, jitter, and packet loss in Studio. Netcode that was only ever tested on localhost has not been tested.
- **Performance Dashboard (Creator Dashboard)** carries live-session client crash rate, client and server memory, frame rate, average session time, and a `PlaceScriptMemory` breakdown, over a date range you choose. **Investigate a client crash rate above 2–3%.** This is the only tool that sees real players on real hardware, so it decides what is worth optimizing; the rest only explain it.
- **Analytics → Client CPU Time Breakdown** attributes client frame cost across **Scripts, Networking, Physics, Animation, and Miscellaneous** from live sessions. Use it to decide *where* to optimize before touching code: a physics-bound experience is not fixed by micro-optimizing Luau.
- **Studio's Advanced Network Simulation** to test under packet loss/latency before shipping netcode.
- Structured logging (`LogService` `Info`/`Warn`/`Error` methods where available) with contextual data instead of bare `print` spam.

**Measuring afterwards is not optional either.** An optimization is a claim, and an unverified claim costs readability for nothing:

1. **Record the number before you change anything** — frame time, memory, or call count for the specific thing you suspect.
2. **Change one thing.** Two changes at once make an improvement and a regression cancel out invisibly.
3. **Measure again on the target device**, not in Studio. Studio runs client and server in one process and reports memory and frame time that no player will ever see ([device-performance.md](device-performance.md), [verification.md](verification.md#principles)).
4. **Revert what did not move the number.** Complexity kept on faith is complexity a future reader has to justify.
5. **Report the measurement, not the intent.** "Cut the per-frame table allocation; heap growth over five minutes fell from X to Y" is a result. "Optimized the update loop" is not.
