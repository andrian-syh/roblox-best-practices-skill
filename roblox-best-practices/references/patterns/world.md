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
- **Instance references via `InstanceHandle` [Beta]** ([api-currency.md](../api-currency.md#engine)). An attribute can point at another Instance, replacing the `ObjectValue` workaround:

```lua
part:SetAttribute("Target", workspace.TargetPart)

local targetHandle = part:GetAttribute("Target")
local targetInstance = targetHandle:Get()
```

  - `GetAttribute` returns a **handle**, never the Instance directly. A missing attribute returns `nil`; an attribute pointing at an instance that has not replicated returns a handle whose `Get()` is `nil` — that distinction is the point of the design under StreamingEnabled.
  - **`GetAttributeChangedSignal` fires only when the attribute itself changes**, not when the referenced instance streams in or out. Do not use it to track availability; re-read `Get()` at the point of use, or track the instance with a tag signal (`handle:Wait` appears in announcements but not the Engine API Reference — treat it as unconfirmed).
  - Handles are weak references and are garbage-collected automatically.
  - It is **[Beta]**: document it as an option, keep `ObjectValue` or a module-side registry as the default for production code until it reaches GA.

## Input (client)

- New projects: use the **Input Action System** (`InputAction`/`InputBinding`) rather than raw `UserInputService` — it is **[GA]** ([api-currency.md](../api-currency.md#engine)) and mandatory under Server Authority; it handles rebinding and cross-device out of the box. Fall back to `ContextActionService` where a legacy environment predates it.
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
| `Instance.new("Part", parent)` (parent arg) — **discouraged, not deprecated**: Advisory in review, never a violation | Create, set properties, parent last |
| Storing player data only in leaderstats | Session cache table; leaderstats is display-only |
| `getfenv`/`setfenv`/`loadstring` | Never — kills Luau optimization and is a security hole |
| `pcall` whose failure branch is silently ignored | Log the error with context or recover; a genuinely ignorable failure says why it is safe to skip in the function's Documentation Comment ([luau-language.md](../luau-language.md#error-handling)) |
| Per-character state (connections, buffs) never cleared on respawn | Key by character, clear in `CharacterRemoving`/`Destroying` (see Character Lifecycle) |

### Where the official tutorials differ, and why

Roblox's *Coding Fundamentals* series is teaching material, and its shapes are simplified on purpose. A user citing it is not wrong about what it says; the tutorials simply stop before the production concern. Explain the gap rather than dismissing the source, and never treat tutorial-shaped code in an existing project as a defect on its own:

| The tutorials teach | What ships |
|---|---|
| One script parented to each button, door, or trap | One tag-bound handler serving every tagged instance |
| `Touched` with no debounce, and a blocking `task.wait` inside the handler | A debounce keyed by character, and no yield holding the handler open |
| `CanTouch = false` as the cooldown mechanism | Explicit cooldown state; toggling engine properties as flags hides intent and affects other systems |
| `leaderstats` as where the value lives | A session cache owns the value; `leaderstats` displays it ([patterns/data.md](data.md#one-owner-per-fact)) |
| Points granted with no validation, rate limit, or persistence | Server-side validation, one shared rate limiter, and a real save path |
| `pairs`/`ipairs` as the only iteration form | Generalized iteration in new code; `pairs`/`ipairs` remain correct ([luau-language.md](../luau-language.md#tables-references-copies-and-shape)) |

The one place the tutorials are simply behind rather than simplified: an occasional `BrickColor.Red()` where `Color3.fromRGB` is the modern form.
