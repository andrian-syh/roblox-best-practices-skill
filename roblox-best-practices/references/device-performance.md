# Device Performance — Fitting the Frame and the Weakest Device

[performance.md](performance.md) makes the code cheap. **This file makes it fit**: the frame budget it must live inside, and the low-end device it must still run on. Read it when the work is frame-critical, when it spawns bulk work, or when the target audience includes weak hardware, which on Roblox it always does.

## Contents

- [The frame budget](#the-frame-budget)
- [Time-slicing bulk work](#time-slicing-bulk-work)
- [Device tiers](#device-tiers)
- [Engine levers before script levers](#engine-levers-before-script-levers)
- [The degradation ladder](#the-degradation-ladder)
- [Adaptive quality](#adaptive-quality)
- [Join time](#join-time)
- [Bandwidth per player](#bandwidth-per-player)
- [Memory on low-end devices](#memory-on-low-end-devices)

## The frame budget

A frame is a fixed amount of time shared by everything:

| Target | Total frame | Practical script share |
|---|---|---|
| 60 FPS | **16.67 ms** | a few ms at most |
| 30 FPS | **33.3 ms** | roughly double that, still small |

Roblox targets **60 FPS** and states the 16.67 ms per-frame budget directly in its performance guidance, so this is the number to design against, not an estimate.

Rendering, physics, animation, and networking take the rest, and on a low-end device they take more of it. The number to design against is **the few milliseconds your scripts actually get**, not the whole frame.

Consequences:

- A single `Heartbeat` callback that takes 8 ms has already spent half a 60 FPS frame on its own.
- Cost scales with entity count. Measure at the maximum realistic population, not with one test object ([verification.md](verification.md)).
- Work that cannot fit in a frame must be **spread across frames**, not made faster in place.
- Attribute the cost before optimizing: the Client CPU Time Breakdown splits Scripts, Networking, Physics, Animation, and Miscellaneous ([performance.md](performance.md#measurement-never-optimize-blind)). A physics-bound experience is not fixed by tightening Luau.

## Time-slicing bulk work

The correct shape for a large one-off job (world generation, bulk spawning, save migration, mass instance edits) that must not stall the frame: consume a work queue until a per-frame budget is spent, then yield and resume.

```lua
-- | Services | --
local RunService = game:GetService("RunService")

-- | Configuration | --
local FRAME_BUDGET = 0.004

--[[
	Drains a work queue without stalling the frame.

	@param queue {() -> ()} -- Consumed in place; empty when this returns
]]
local function processQueue(queue: {() -> ()})
	while #queue > 0 do
		local deadline = os.clock() + FRAME_BUDGET
		repeat
			local job = table.remove(queue)
			if job then job() end
		until #queue == 0 or os.clock() > deadline
		RunService.Heartbeat:Wait()
	end
end
```

- Budget in **time**, not item count: items vary in cost, so "50 per frame" stalls the moment items get heavier.
- The `Heartbeat:Wait()` is a yield, so Non-Negotiable #7 applies to anything captured before it.
- This pattern is legitimate polling in the same way a timed loop is scheduling: it is draining a queue, not watching for a condition.

## Device tiers

Assume a wide spread of hardware and design for the bottom of it. The demographics and budgets below are Roblox's own published figures.

| Tier | Reality & Demographic | Hard Budgets & Ceilings |
|---|---|---|
| **Low** | **~65% of players are on Android** (~60% have 2–4 GB RAM, ~35% have 4–8 GB). 50%+ player base scores 10,000–20,000 on Passmark. Susceptible to **Error 292 (OOM)**. Thermal-throttles under sustained load. **This is the baseline.** | Draw calls <= 1,000; Triangles <= 1,000,000; Client RAM <= 400–500 MB |
| **Mid** | Recent phones, low-end laptops, older consoles. | Draw calls <= 2,000; Triangles <= 2,500,000 |
| **High** | Desktops and current consoles. | Scaling headroom for post-fx & uncapped FPS |

- **Pick a named baseline device and test on it throughout development**, watching frame rate and memory. This is Roblox's own recommendation, not a nicety. Their worked example of a test set spanning tiers and manufacturers: an Infinix Smart 9, a Motorola Moto G05, an Oppo A18, an Amazon Fire HD 10, and a Samsung Galaxy S22 Ultra.
- **On the device itself:** Developer Console (`F9`) for memory, the MicroProfiler for frame data, and the Performance Stats overlay for FPS, memory, and ping. Check the things only real hardware shows: thermal behavior, cellular and weak-Wi-Fi conditions, touch target size, UI readability at arm's length, and input-method switching.
- **Published budgets for a baseline device: under 1,000 draw calls and under 1,000,000 triangles.** Use `Shift+F2` debug stats to see where a scene stands.
- **Build for low and scale up.** Adding effects for strong devices is easy; discovering the game is unplayable on a phone after launch is not.
- **Thermal throttling testing:** run a continuous 10–15 minute active gameplay session on hardware. A steady decline in FPS over time indicates CPU/GPU downclocking due to heat; isolate sustained hot paths in the MicroProfiler.
- **Never infer power from input type.** `UserInputService.TouchEnabled` says a touchscreen exists, not that the device is weak, and the reverse is equally wrong. The existing rule against branching on it for input ([ui-crossplatform.md](ui-crossplatform.md#cross-platform-ux)) applies here for the same reason.
- Infer capability from **observed frame time**, which is the only honest signal available at runtime, and let the player override it.
- Test with a full server at the maximum realistic entity and player count, not with two testers in an empty place.
- **Studio's device emulator is not a memory test.** It runs the server and client in one process, which inflates the reading. Memory conclusions come from real hardware ([verification.md](verification.md)).

## Engine levers before script levers

Roblox ships settings that buy more headroom than most script optimization, and they cost no runtime code. Reach for these first.

**Streaming settings tuned for low-end devices** ([patterns/network.md](patterns/network.md#streaming-streamingenabled) covers the code-side rules). These are Roblox's own recommended values, and `Workspace:ApplyRecommendedStreamingSettings()` sets them in one call from a **plugin** — `StreamingEnabled` itself is not scriptable and is switched on in Studio:

| Property | Recommended | Why |
|---|---|---|
| `EnableSLIMAvatars` | `Enabled` | Renders avatars outside the streamed area as lightweight animated stand-ins |
| `ModelStreamingBehavior` | `Improved` | More efficient model streaming |
| `StreamingIntegrityMode` | `PauseOutsideLoadedArea` | Balanced integrity |
| `StreamingMinRadius` | `64` (default) | Maximizes scaling headroom for low-end devices |
| `StreamingTargetRadius` | `1024` (default) | Balances visibility against memory |
| `StreamOutBehavior` | `Opportunistic` / `LowMemory` | Aggressive client-side collection, lower memory |

**Frustum streaming** (`Player.FrustumStreaming`, with the `FrustumStreamingMode` enum) streams by what the camera can see rather than by radius alone, which cuts loaded content sharply in experiences with a mostly forward-facing camera. It is **[Undocumented]** ([api-currency.md](api-currency.md#engine)) — shipped, with no reference page to read, so its exact enum values come from a probe rather than from docs — and it trades against fast camera turns: content behind the player may need to stream in when they spin. Test that case on a low-end device before enabling it, and keep gameplay-critical anchors persistent regardless.

**SLIM avatars** deserve their own note in crowded experiences, where avatars dominate cost. The engine swaps between SLIM and real models based on available resources and throttles SLIM animation by scene importance and bandwidth. It covers standard-rig avatars including body, head, layered clothing, and accessories, plus changes made between `CharacterAdded` and `CharacterAppearanceLoaded`. It **excludes** R6, NPCs, custom proportions or body parts, and appearance changes made after `CharacterAppearanceLoaded`. `Workspace.EnableSLIMAvatars` **cannot be set from a script** — it is configured in Studio. Set `Model.LevelOfDetail` to `SLIM` for non-avatar models in the same situation.

**Asset and rendering choices that cost nothing at runtime:**

- **GPU Texture Memory is Pixel-Bound, not Disk-Bound:** Roblox transcodes all images to internal GPU formats; disk compression and color profiles do **not** reduce GPU memory usage. A 1024x1024 texture consumes **4x the GPU memory** of a 512x512 texture. Cap environmental textures at <= 512x512, small props at <= 256x256, and bundle 2D UI into *Sprite Sheets* (`ImageRectOffset` / `ImageRectSize`).
- **GPU Draw Call Instancing:** the engine batches identical meshes into 1 draw call **only when they share the same Asset ID**, identical `SurfaceAppearance`, or identical material/texture. Importing an entire scene as one piece creates unique asset IDs and destroys instancing; import assets once as Packages and duplicate them in Studio.
- **Avoid Layered Transparency Overdraw:** placing multiple semi-transparent parts (glass, foliage alpha masks, layered particle emitters) in front of each other forces the GPU to redraw overlapping pixels repeatedly (hundreds of thousands of overdrawn pixels). Use transparency `0` or `1` where possible, and disable `BasePart.CastShadow` on decorative foliage.
- **Prefer built-in materials to custom textures**, which conserves memory directly.
- **Reuse meshes and textures** by resizing, rotating, and overlapping rather than importing near-duplicates, and use packages so the same asset does not enter the place under several IDs. Import map assets individually rather than as one whole map, which mints a unique id per piece and destroys instancing.
- **Trim sheets and a single tinted texture** beat separate colored variants: one texture plus `SurfaceAppearance.Color` covers what several uploads otherwise would.
- **Set `MeshPart.RenderFidelity` to `Automatic` or `Performance`**, and give identical meshes the same `MeshContent` and the same `SurfaceAppearance`/`TextureContent` so the engine can batch them.
- **Restrain `ContentProvider:PreloadAsync()`** to the first screen, and audit join payloads — both belong to [Join time](#join-time) below.
- **Keep client-unnecessary assets in `ServerStorage`, not `ReplicatedStorage`** — anything in ReplicatedStorage is downloaded and held by every client.

## The degradation ladder

Roblox does not publish an official cut order, so treat this as a **practical default** rather than doctrine: adjust it once profiling tells you where a specific experience is actually bound. What matters is that the order is *fixed and deliberate*, so quality drops predictably instead of arbitrarily. Cut from the top:

1. **Particle density and lifetime** — highest cost per visual value, and the easiest to halve unnoticed.
2. **Shadows** — expensive on fill-rate-bound devices.
3. **Post-processing** — bloom, blur, colour correction.
4. **Texture and mesh detail tier** — cheaper assets, fewer unique textures.
5. **Draw distance and streaming radius** — smaller streamed region ([patterns/network.md](patterns/network.md#streaming-streamingenabled)).
6. **Non-essential instances** — decorative props, ambient NPCs, secondary VFX.

Gameplay-critical visuals are never on this ladder. A player on a low tier must still be able to see hitboxes, telegraphs, and interactables; degrade the scenery, never the information.

## Adaptive quality

Measuring and adjusting at runtime beats a fixed setting, provided it is done with hysteresis:

- Average frame time over a **window** of frames, never a single frame. One spike is a garbage collection, not a trend.
- Step **down** one rung when the average stays over budget for a sustained period.
- Step **up** only after the average sits comfortably under budget for a longer period than the step-down threshold.
- The asymmetry is the point: without it, quality oscillates at the boundary and the flicker is worse than the low setting.
- Keep the whole thing on a timed loop at a low frequency; this is scheduling, not per-frame work.
- Expose a manual override. Players know their device better than a heuristic does.

## Join time

Roblox measures experience performance on **three** axes, and this is the one script rules never touch: frame rate, memory, and **the time from pressing play to a playable world**. It decides whether a player arrives at all, so it is a performance metric, not a loading detail.

- **Time it, on the baseline device.** If it runs to more than a few seconds, instance streaming is the first lever.
- **`ContentProvider:PreloadAsync()` is for the first screen only** — loading-screen images, menu buttons and icons, and the spawn area. Preloading the `Workspace` inflates join time and costs mobile players. Do not treat `ContentProvider.RequestQueueSize` as a completion signal, and give a **Skip Loading** button where the queue is large.
- **Audit what replicates at join.** Enable *Print Join Size Breakdown* in Network Studio Settings; anything in `ReplicatedStorage` is downloaded by every client, so client-unnecessary assets belong in `ServerStorage`.
- **Splitting a huge place across teleports trades one cost for another** — smaller joins, but a teleport wait each time. Decide deliberately.

## Bandwidth per player

Server cost is shared, but bandwidth is paid per client, and weak devices usually sit on weak connections.

- Budget replication per player, not per server: fifty players each receiving a per-frame position stream is fifty streams. Target <= 30–50 KB/s per client.
- **Diagnose Network Ping vs Data Ping (`Shift+F3` / Dev Console):**
  - *Network Ping:* physical transmission round-trip time (geography).
  - *Data Ping:* round-trip time through the replication system, queues, and TCP-like retransmissions.
  - If **Data Ping is significantly higher than Network Ping**, the replication queues are congested; throttle remote invocations or compress payloads.
- Prefer free replication (attributes, tags, property replication) over custom remotes for state clients merely display ([performance.md](performance.md#network)).
- Send deltas rather than whole states, batch into one payload per tick, and use `UnreliableRemoteEvent` for loss-tolerant high-frequency data.
- For bulk or high-frequency numeric data, `buffer` serialization is dramatically smaller than tables of numbers.
- Hard ceilings for stores, messaging, and attributes: [limits-budgets.md](limits-budgets.md).
- Verify under real conditions with Advanced Network Simulation at 100 to 200 ms with loss, not on localhost alone.

## Memory on low-end devices

Memory is the most common cause of a mobile crash, and it fails hard rather than degrading (Error 292). Low-end devices have severe limits and are genuinely susceptible to out-of-memory exits, so memory is monitored alongside frame rate from the start rather than investigated after reports arrive.

Ordered by how quickly each pushes a low-end device over:

1. **Textures** — resolution and count. Pixel count dictates GPU RAM. Reuse asset IDs, since identical IDs share memory, and prefer built-in materials.
2. **Avatar accessories and layered clothing** — dominant in social and hangout experiences. SLIM avatars are the engine's answer here; cap simultaneously loaded avatars where SLIM does not apply.
3. **Instance count** — every part carries overhead even when idle and anchored. Streaming with `StreamOutBehavior = LowMemory` or `Opportunistic` reclaims aggressively.
4. **Luau heap** — module-level tables keyed by player or instance are the usual leak ([performance.md](performance.md#memory)).

Watch the trend over a long session rather than a snapshot, and on real hardware rather than the emulator: the Developer Console memory view, `debug.setmemorycategory` for per-system attribution, and `gcinfo()` logged periodically for a leak trend line.
