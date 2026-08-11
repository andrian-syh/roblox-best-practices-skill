# Device Performance — Fitting the Frame and the Weakest Device

[performance.md](performance.md) makes the code cheap. **This file makes it fit**: the frame budget it must live inside, and the low-end device it must still run on. Read it when the work is frame-critical, when it spawns bulk work, or when the target audience includes weak hardware, which on Roblox it always does.

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

Assume a wide spread of hardware and design for the bottom of it.

| Tier | Reality |
|---|---|
| **Low** | Older phones and tablets. Thermal-throttles under sustained load, tight memory, weak fill rate. **This is the baseline.** |
| **Mid** | Recent phones, low-end laptops, older consoles. |
| **High** | Desktops and current consoles. |

- **Pick a named baseline device and test on it throughout development**, watching frame rate and memory. This is Roblox's own recommendation, not a nicety.
- **Published budgets for a baseline device: under 1,000 draw calls and under 1,000,000 triangles.** Use `Shift+F2` debug stats to see where a scene stands.
- **Build for low and scale up.** Adding effects for strong devices is easy; discovering the game is unplayable on a phone after launch is not.
- **Never infer power from input type.** `UserInputService.TouchEnabled` says a touchscreen exists, not that the device is weak, and the reverse is equally wrong. The existing rule against branching on it for input ([ui-ux-testing.md](ui-ux-testing.md#cross-platform-ux)) applies here for the same reason.
- Infer capability from **observed frame time**, which is the only honest signal available at runtime, and let the player override it.
- Test with a full server at the maximum realistic entity and player count, not with two testers in an empty place.
- **Studio's device emulator is not a memory test.** It runs the server and client in one process, which inflates the reading. Memory conclusions come from real hardware ([verification.md](verification.md)).

## Engine levers before script levers

Roblox ships settings that buy more headroom than most script optimization, and they cost no runtime code. Reach for these first.

**Streaming settings tuned for low-end devices** ([patterns.md](patterns.md#streaming-streamingenabled) covers the code-side rules):

| Property | Recommended | Why |
|---|---|---|
| `EnableSLIMAvatars` | `Enabled` | Renders avatars outside the streamed area as lightweight animated stand-ins |
| `ModelStreamingBehavior` | `Improved` | More efficient model streaming |
| `StreamingIntegrityMode` | `PauseOutsideLoadedArea` | Balanced integrity |
| `StreamingMinRadius` | `64` (default) | Maximizes scaling headroom for low-end devices |
| `StreamingTargetRadius` | `1024` (default) | Balances visibility against memory |
| `StreamOutBehavior` | `Opportunistic` | Aggressive client-side collection, lower memory |

**SLIM avatars** deserve their own note in crowded experiences, where avatars dominate cost. The engine swaps between SLIM and real models based on available resources and throttles SLIM animation by scene importance and bandwidth. It covers standard-rig avatars including body, head, layered clothing, and accessories, plus changes made between `CharacterAdded` and `CharacterAppearanceLoaded`. It **excludes** R6, NPCs, custom proportions or body parts, and appearance changes made after `CharacterAppearanceLoaded`. `Workspace.EnableSLIMAvatars` **cannot be set from a script** — it is configured in Studio. Set `Model.LevelOfDetail` to `SLIM` for non-avatar models in the same situation.

**Asset and rendering choices that cost nothing at runtime:**

- **Avoid partial transparency.** Use `0` or `1`, never a value in between, since partial transparency forces overdraw.
- **Prefer built-in materials to custom textures**, which conserves memory directly.
- **Reuse meshes and textures** by resizing and rotating rather than importing near-duplicates, and use packages so the same asset does not enter the place under several IDs.
- **Keep client-unnecessary assets in `ServerStorage`, not `ReplicatedStorage`** — anything in ReplicatedStorage is downloaded and held by every client.

## The degradation ladder

Roblox does not publish an official cut order, so treat this as a **practical default** rather than doctrine: adjust it once profiling tells you where a specific experience is actually bound. What matters is that the order is *fixed and deliberate*, so quality drops predictably instead of arbitrarily. Cut from the top:

1. **Particle density and lifetime** — highest cost per visual value, and the easiest to halve unnoticed.
2. **Shadows** — expensive on fill-rate-bound devices.
3. **Post-processing** — bloom, blur, colour correction.
4. **Texture and mesh detail tier** — cheaper assets, fewer unique textures.
5. **Draw distance and streaming radius** — smaller streamed region ([patterns.md](patterns.md#streaming-streamingenabled)).
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

## Bandwidth per player

Server cost is shared, but bandwidth is paid per client, and weak devices usually sit on weak connections.

- Budget replication per player, not per server: fifty players each receiving a per-frame position stream is fifty streams.
- Prefer free replication (attributes, tags, property replication) over custom remotes for state clients merely display ([performance.md](performance.md#network)).
- Send deltas rather than whole states, batch into one payload per tick, and use `UnreliableRemoteEvent` for loss-tolerant high-frequency data.
- For bulk or high-frequency numeric data, `buffer` serialization is dramatically smaller than tables of numbers.
- Hard ceilings for stores, messaging, and attributes: [limits-budgets.md](limits-budgets.md).
- Verify under real conditions with Advanced Network Simulation at 100 to 200 ms with loss, not on localhost alone.

## Memory on low-end devices

Memory is the most common cause of a mobile crash, and it fails hard rather than degrading. Low-end devices have severe limits and are genuinely susceptible to out-of-memory exits, so memory is monitored alongside frame rate from the start rather than investigated after reports arrive.

Ordered by how quickly each pushes a low-end device over:

1. **Textures** — resolution and count. Reuse asset IDs, since identical IDs share memory, and prefer built-in materials.
2. **Avatar accessories and layered clothing** — dominant in social and hangout experiences. SLIM avatars are the engine's answer here; cap simultaneously loaded avatars where SLIM does not apply.
3. **Instance count** — every part carries overhead even when idle and anchored. Streaming with `StreamOutBehavior = Opportunistic` reclaims aggressively.
4. **Luau heap** — module-level tables keyed by player or instance are the usual leak ([performance.md](performance.md#memory)).

Watch the trend over a long session rather than a snapshot, and on real hardware rather than the emulator: the Developer Console memory view, `debug.setmemorycategory` for per-system attribution, and `gcinfo()` logged periodically for a leak trend line.
