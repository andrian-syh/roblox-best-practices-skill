# Lifecycle, Cleanup, and Reuse

What gets created, how it is torn down, and how it is reused instead of recreated. Part of the framework-agnostic pattern set indexed in [patterns.md](../patterns.md).

## Contents

- [Lifecycle & Cleanup](#lifecycle--cleanup)
- [Character Lifecycle](#character-lifecycle)
  - [Humanoid vs the Character Controller Library](#humanoid-vs-the-character-controller-library)
- [Object Pooling](#object-pooling)

## Lifecycle & Cleanup

Minimal connection-bag pattern (use a maid/janitor/trove module if the project has one; otherwise this suffices):

```lua
-- | State Management | --
local cleanupByPlayer: {[Player]: {() -> ()}} = {}

--[[
	Registers a cleanup task owned by the player.
]]
local function addCleanup(player: Player, cleanupTask: () -> ())
	local bag = cleanupByPlayer[player]
	if not bag then bag = {}; cleanupByPlayer[player] = bag end
	table.insert(bag, cleanupTask)
end

--[[
	Releases everything owned by a leaving player.
]]
local function onPlayerRemoving(player: Player)
	for _, cleanupTask in cleanupByPlayer[player] or {} do
		cleanupTask()
	end
	cleanupByPlayer[player] = nil
end
```

Rules:
- Whatever creates a resource registers its destruction in the same place.
- Handle players already present before your `PlayerAdded` connection (`for _, p in Players:GetPlayers()`), and characters already spawned before `CharacterAdded`.
- Module init/start: expose an idempotent `Module.Init()` if setup order matters; call it from INITIALIZATION of a single bootstrap script rather than relying on require-order side effects.

## Character Lifecycle

Characters respawn; players persist. Confusing the two lifetimes is a standing leak/bug source:

- Connect `player.CharacterAdded` **and** handle an already-existing `player.Character` (same both-cases rule as `PlayerAdded`).
- Inside `CharacterAdded`, descendants may not have arrived yet — `character:WaitForChild("Humanoid")` (or `HumanoidRootPart`) rather than direct indexing; `Humanoid.Died` for death logic.
- **Per-life state** (connections, temporary buffs, hitbox registrations, active tweens on the character) is keyed by the *character* and cleared in `CharacterRemoving` or the character model's `Destroying` — respawn does not clean your module tables for you. **Per-player state** persists across respawns and clears in `PlayerRemoving`.
- Connections made *on the character's own instances* die with the character; connections held elsewhere that merely *reference* the character do not — those are the ones that need the explicit teardown.

### Humanoid vs the Character Controller Library

The **Character Controller Library (CCL)** reached **[GA]** ([api-currency.md](../api-currency.md#engine)). It reimplements character movement as configurable Luau on top of `ControllerManager` instead of hard-coded `Humanoid` behavior, adding ground friction, momentum conservation, and tunable acceleration curves.

**`Humanoid` is not deprecated.** This is an architectural *choice*, not a migration mandate — existing experiences keep working unchanged.

- Select the implementation with `StarterPlayer.LuaCharacterController`, which takes a `CharacterControlMode`: `Default`, `Legacy`, `NoCharacterController`, or `LuaCharacterController`.
- Movement is composed from **AvatarAbilities** (Walk, Run, Jump, Swim, Climb, Sit) driven by physics controllers (`GroundController`, `AirController`) under a `ControllerManager`.
- Tune per-controller rather than fighting the defaults. `GroundController` exposes `AccelerationTime`, `DecelerationTime`, `TurnSpeedFactor`, `GroundOffset`, `Friction`, `FrictionWeight`, `BalanceMaxTorque`, and `BalanceSpeed` — `MoveSpeedFactor` is inherited from `ControllerBase`, not defined here.
- Configure it the same way as any other per-character state: resolve the `ControllerManager` on `CharacterAdded` (handling the already-spawned character too) and apply settings there. Per-life teardown rules above apply unchanged.
- **Choosing:** prefer CCL for new projects that need custom movement feel or plan to extend abilities; keep `Humanoid` when the default feel is fine or the project depends on Humanoid-specific APIs and states. Never migrate an existing project on this skill's initiative.
- Do not flag a project for using either one ([false-positives.md](../false-positives.md)).

## Object Pooling

```lua
-- | Configuration | --
local MAX_POOLED_PROJECTILES = 64
local RESTING_CFRAME = CFrame.new(0, -500, 0)

-- | State Management | --
local projectilePool: {BasePart} = {}

-- // FUNCTIONS // --

--[[
	Provides a projectile ready for use, growing the pool only when it runs dry.

	@return BasePart -- Parented and live; return it to the pool when finished
]]
local function takeProjectile(): BasePart
	local part = table.remove(projectilePool)
	if not part then
		part = projectileTemplate:Clone()
	end
	part.Parent = workspace.Projectiles
	return part
end

--[[
	Retires a projectile to its resting state and makes it available again.

	@param part BasePart -- Must not be referenced by the caller after this returns
]]
local function returnProjectile(part: BasePart)
	part.Parent = nil
	part.AssemblyLinearVelocity = Vector3.zero
	part.AssemblyAngularVelocity = Vector3.zero
	part.CFrame = RESTING_CFRAME
	part.Transparency = 0
	part.CanCollide = true

	if #projectilePool >= MAX_POOLED_PROJECTILES then
		part:Destroy()
		return
	end
	table.insert(projectilePool, part)
end
```

**Pool anything spawned more than ~once per second.** Below that rate, `Clone`/`Destroy` is simpler and the churn does not matter — a pool that saves nothing is pure complexity plus a new class of bug.

**Cap the pool.** An uncapped pool sized by the worst spike the server ever saw never shrinks, which is a memory leak that looks exactly like an optimization. Give it a ceiling and destroy the overflow, as above. Where a burst is predictable, pre-warm the pool at startup instead of paying the clone cost mid-fight.

**Reset every mutated property on return, not just the obvious one.** A pooled object carries its whole history forward, and the reset list is what people get wrong. Walk this on return:

| Reset | Why it bites |
|---|---|
| Transform and physics (`CFrame`, `AssemblyLinearVelocity`, `AssemblyAngularVelocity`) | The next use inherits last flight's motion |
| Appearance (`Transparency`, `Color`, `Material`, `Size`) | A faded-out object comes back invisible |
| Collision and behavior (`CanCollide`, `CanTouch`, `CanQuery`, `Anchored`) | A projectile that ended non-collidable never hits anything again |
| **Connections made per use** | The clearest leak: connections accumulate one per cycle and every old handler fires on the next use |
| **Attributes and CollectionService tags** | Behavior bound by tag re-triggers, or a stale attribute makes the object read as owned by a player who left |
| Children added during use (VFX, sounds, welds, constraints) | The object grows every cycle until it stops resembling the template |

The `Trove`/`Janitor` shape fits pooling well: one cleanup object per checkout, emptied on return ([community-libraries.md](../community-libraries.md)).

**`Parent = nil` does not free anything.** A parked object is still fully in memory with its connections intact; that is the point of a pool, and also why an uncapped one grows without bound. Never `Destroy()` an object while it sits in the pool — the pool would hand out a dead instance later.

**Pool tables, not only Instances.** The same take/reset/return shape applies to per-entity state tables in a hot system; `table.clear` resets one without reallocating ([minimal-code.md](../minimal-code.md)).

Two failures specific to pooling — returning the same object twice, and using it after returning it — are in [edge-cases.md](../edge-cases.md#pooled-and-reused-objects).
