# Performance, Memory & Network Optimization

Rules for writing lightweight, fast, resource-frugal Luau. Ordered by impact.

**This file makes the code cheap.** For the budget it has to fit inside — frame time in milliseconds, time-slicing bulk work, device tiers, the quality degradation ladder, per-player bandwidth, and low-end memory ceilings — see [device-performance.md](device-performance.md).

## CPU

- **Hoist out of hot loops.** Anything inside `RunService` callbacks, `while` loops, or per-entity iteration must not: create tables/closures, concatenate strings, call `Instance:FindFirstChild`/`WaitForChild`/`GetChildren`, or index deep Instance paths. Resolve references once in VARIABLES or at connection time. What counts as a *hot* path, and which allocations are genuinely irreducible, is defined in [false-positives.md](false-positives.md#performance--hot-loops--define-hot-first) — hoist only what can be hoisted, and reuse with `table.clear` when a per-iteration table is unavoidable.
- **Cache repeated lookups.** `local floor = math.floor` matters only in extreme hot paths; caching *Instance* lookups and *attribute reads* matters everywhere.
- **Prefer `Heartbeat` over `RenderStepped`.** `PreRender`/`RenderStepped` blocks the frame — client-only, camera/visual work only. Gameplay logic belongs on `Heartbeat`. (Naming note: `Heartbeat` = `PostSimulation`, `RenderStepped` = `PreRender`, `Stepped` = `PreSimulation` — either name is acceptable; never flag one as wrong.)
- **`RunService:BindToSimulation(callback, frequency, priority)`** is for *fixed-rate physics/prediction code*: it requires `Workspace.UseFixedSimulation`, `frequency` is an `Enum.StepFrequency` (default 30 Hz), and the callback errors if it touches unsynchronized properties/methods. **Whether to use it depends on the place's authority mode:**
  - **Without Server Authority (the default):** do **not** use it for general gameplay logic — accumulate `deltaTime` on `Heartbeat` instead.
  - **Under Server Authority:** it is **required** for custom gameplay logic that must take part in the fixed simulation and client resimulation.

  Establish the mode before recommending or flagging either way ([server-authority.md](server-authority.md)).
- **Throttle naturally-slow work.** AI targeting, proximity scans, leaderboard sorts don't need 60 Hz. Accumulate `deltaTime` and run at 5–10 Hz, or stagger entities across frames (process `i % N == frame % N`).
- **Use the right primitives:** `vector`/`Vector3` math over per-component arithmetic; `buffer` for binary data and large numeric arrays; `table.create(n)` when the final size is known; `table.clear()` to reuse tables instead of reallocating.
- **String building:** collect into a table and `table.concat`, or use interpolation backticks; never `..` in a loop.
- **Native codegen:** for genuinely compute-heavy ModuleScripts (procedural generation, pathfinding math), add `--!native`. Don't scatter it everywhere — it costs memory.
- **Parallel Luau:** only for embarrassingly-parallel heavy work (raycast batches, terrain edits, procedural generation) via Actors. Each Actor runs its scripts in its own VM; call `task.desynchronize()` to enter the parallel phase and `task.synchronize()` to return before touching the DataModel (most write APIs are unsafe in parallel and error if called there). Share data across Actors with **`SharedTable`** (a thread-safe table visible to every VM) rather than passing Luau tables directly. Don't parallelize chatty logic — cross-VM synchronization overhead outweighs the gain; parallelize only when per-item compute dwarfs the coordination cost.

## Memory

- **Instances:** `Destroy()` everything you spawn when done. Destroying an Instance disconnects its connections and unparents descendants — it is the cheapest cleanup primitive. Never just `.Parent = nil` something you mean to discard.
- **Connections:** every `:Connect()` whose owner outlives the connected object leaks. Patterns:
  - Per-player tables of connections, disconnected in `PlayerRemoving`.
  - Connections on an Instance you own → let `Destroy()` handle them.
  - One-shot listeners → `:Once()` instead of `:Connect()` + manual disconnect.
- **Module-level tables keyed by Player/Instance** are the #1 leak source. Every insertion needs a matching removal path (`PlayerRemoving`, `Destroying`). Do not rely on weak tables (`__mode`) as a cleanup strategy.
- **Object pooling:** for frequently created/destroyed things (projectiles, VFX parts, damage numbers), keep a pool: take → reset properties → use → return. `Destroy`/`Instance.new` churn causes GC pressure and physics re-registration.
- **Textures/assets:** reuse asset IDs; identical IDs share memory. Avoid loading giant one-off textures for tiny UI.

## Network

- **Server-authoritative always.** Client sends *intents*, server validates and executes. Validate every remote argument: `typeof` check, range clamp, ownership check, rate limit. Treat all client input as hostile.
- **RemoteEvent hygiene:**
  - Batch: one `UpdateState` remote with a payload table beats ten tiny remotes per frame.
  - Delta, don't dump: send changed fields, not the whole state table.
  - `UnreliableRemoteEvent` for high-frequency loss-tolerant data (cosmetic positions, VFX triggers, voice-adjacent pings). Reliable remotes for anything gameplay-critical.
  - `FireClient` targeted lists instead of `FireAllClients` when only some players care.
- **Prefer replication you get for free:** Attributes, tags, and property replication reach clients without custom remotes and are automatically streamed. Use remotes for *actions*, attributes for *state*.
- **StreamingEnabled awareness:** never assume workspace descendants exist on the client, and plan LoD around mesh streaming (default on modern engine versions). The full streaming pattern — `WaitForChild` timeouts, tag signals, `Model.ModelStreamingMode`, `RequestStreamAroundAsync` — lives in [patterns.md](patterns.md#streaming-streamingenabled).
- **Payload size:** numbers are cheap, strings and nested tables are not. For bulk data use `buffer` serialization.

## Instances & Rendering

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
