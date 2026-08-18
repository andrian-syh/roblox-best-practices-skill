# Binding, Input, and Anti-Patterns

Attaching behavior to the world, reading player input, and the shapes to reject on sight. Part of the framework-agnostic pattern set indexed in [patterns.md](../patterns.md).

## Contents

- [Behavior Binding (works with any framework)](#behavior-binding-works-with-any-framework)
- [Input (client)](#input-client)
- [Anti-Patterns (reject on sight)](#anti-patterns-reject-on-sight)

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
- **Attribute limits:** attributes support a fixed set of value types (booleans, numbers, strings, and Roblox data types like `Vector3`/`Color3`/`UDim2`) — **no tables**. For structured per-instance data, keep a module-side registry keyed by the instance (with a removal path per the cleanup rules); don't make JSON-encoded attribute blobs a habit. Full ceilings, including the Server Authority replication window: [limits-budgets.md](../limits-budgets.md#attributes).
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
| `pcall` whose failure branch is silently ignored | Log the error with context or recover; a genuinely ignorable failure earns a one-line in-line note saying why ([luau-language.md](../luau-language.md#error-handling)) |
| Per-character state (connections, buffs) never cleared on respawn | Key by character, clear in `CharacterRemoving`/`Destroying` (see Character Lifecycle) |
