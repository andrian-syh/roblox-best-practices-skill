# Cases: Combat & Entities

Blueprints for systems where fairness and server CPU collide. Every recipe here depends on the place's authority mode, so **resolve that first** ([server-authority.md](../server-authority.md)) — the answers differ.

**Preflight:** identify the case → confirm the authority mode → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → decide how you will verify it ([verification.md](../verification.md)).

## Damage and hit validation

**Recognize:** "damage", "hit detection", "hitbox", "melee", "shoot", "kill credit"
**Dominant risk:** cheating, and latency making honest hits feel wrong.
**Server/client:** the client shows feedback immediately; the server decides whether damage happened.
**Assembly:**
1. Client sends an **intent** (fired, swung, with a timestamp, target hint, and alleged muzzle origin), never a damage number or confirmed hit.
2. Server validates in cheap-to-expensive order:
   - Type and shape of remote arguments.
   - Fire-rate and cooldown check via `os.clock()`.
   - Character state via server-authoritative state machine (alive, not stunned, not in recovery).
   - **Muzzle/origin proximity check:** verify that the claimed shot origin is close to the attacker's server-recorded position (`(origin - rootPart.Position).Magnitude <= MAX_MUZZLE_DISCREPANCY`) to prevent ghost shooting or shooting through walls.
   - Spatial range and line of sight from the verified origin, with a bounded lag allowance.
   - Ammo and resource consumption.
3. Apply a **bounded lag allowance** (e.g. rewind window capped at 300–500 ms) on the spatial check rather than an exact server raycast; an exact check feels broken at 150 ms ping, while an unbounded rewind invites lag-switch exploits.
4. Server computes damage from server-side stats, applies it, and replicates the result.
5. Kill credit and rewards are computed once, server-side.
**Never:** accept a client-sent damage value · trust client-reported positions or raycast origins without server proximity checks · run the damage formula on the client · allow unbounded rewinds for high-ping clients.
**Failure modes:** validating against the attacker's *current* position when the shot was fired hundreds of milliseconds ago. Either rewind to the fire timestamp (capped) or widen the tolerance deliberately. Pick one, and give the tolerance a named Configuration constant rather than a literal, so the value documents itself and stays out of comments.
**Under Server Authority:** movement is engine-validated, so the position inputs are trustworthy and tolerances can shrink. Without it, the manual plausibility checks in [security.md](../security.md#movement--physics-sanity-checks) remain the baseline.
**Verify:** test at 100–200 ms simulated latency with multiple clients; confirm honest hits register and impossible ones do not.
**Deeper:** [genres.md](../genres.md#combat--fps--pvp)

## Abilities and cooldowns

**Recognize:** "ability", "skill", "cooldown", "ultimate", "combo", "cast"
**Dominant risk:** client-side cooldowns being the only enforcement.
**Server/client:** the client predicts the animation and VFX; the server owns the cooldown clock and the effect.
**Assembly:**
1. Model combat state as a **server-authoritative state machine** (`Idle`, `Attacking`, `Stunned`, `Blocking`, `Recovery`) and keep per-player, per-ability cooldown state **server-side**, keyed by player and cleared in `PlayerRemoving`.
2. Client sends a cast intent; the server checks the cooldown, resource cost, and state machine (alive, not stunned, not in recovery) before applying anything.
3. Start the client-side visual immediately for feel; reconcile quietly if the server rejects it.
4. Buffer at most **one** queued input. Deeper queues become macro exploits.
5. Store cooldown timestamps with `os.clock()` for in-session durations; persist only what must survive a rejoin, using `os.time()`.
**Never:** let the client report that a cooldown elapsed · trust a client-sent ability id without checking the player actually has it · leave per-character ability state uncleared on respawn.
**Failure modes:** per-character state (active buffs, channel handles) surviving a respawn because it was keyed by player. Key per-life state by the **character** and clear it on `CharacterRemoving` ([patterns/lifecycle.md](../patterns/lifecycle.md#character-lifecycle)).
**Verify:** spam the cast remote far above the intended rate and assert the server applies exactly the allowed number.
**Deeper:** [security.md](../security.md#server-side-validation-layers) · [genres.md](../genres.md#battlegrounds--fighting--melee-pvp)

## Projectiles

**Recognize:** "bullet", "arrow", "projectile", "fireball", "tracer"
**Dominant risk:** allocation churn and per-projectile scripts.
**Server/client:** the server owns the authoritative trajectory or hit resolution; clients render.
**Assembly:**
1. **Pool** projectile instances; take, reset every mutated property, use, return ([patterns/lifecycle.md](../patterns/lifecycle.md#object-pooling)).
2. Drive all active projectiles from **one** update loop iterating a table, never a script or loop per projectile.
3. Replicate a compact spawn message (origin, direction, speed, id) and let clients simulate the visual; do not stream per-frame positions.
4. Use `UnreliableRemoteEvent` for cosmetic tracers and impacts; reliable remotes for damage events.
5. Despawn on hit, on range limit, and on a hard lifetime cap so a leaked projectile cannot live forever.
**Never:** `Instance.new` per shot in a hot fire loop · a `Touched` connection per projectile without debounce · trust a client-reported impact point for damage.
**Failure modes:** returning a projectile to the pool without resetting velocity or transparency, so the next use inherits stale state. Reset **all** mutated properties on return.
**Verify:** sustain the maximum expected fire rate and watch instance count and frame time stay flat.
**Deeper:** [performance.md](../performance.md#memory)

## NPCs, mobs, and AI at scale

**Recognize:** "enemy AI", "mob", "spawner", "wave", "pathfinding", "npc"
**Dominant risk:** server CPU. This is the most common cause of a server that degrades as the round progresses.
**Server/client:** the server owns AI decisions; clients interpolate movement from minimal replicated state.
**Assembly:**
1. **One** staggered update system iterates all entities (or a central Parallel Luau Actor coordinator for heavy batch raycasting/spatial AI). Never an uncoordinated script per NPC.
2. Throttle deliberately: AI targeting and proximity scans run at 5–10 Hz, not 60. Stagger work across frames (`i % N == frame % N`).
3. Pool NPC models and any projectiles they spawn.
4. Compute paths on a **path-change event**, share the waypoint list across every unit following it, and never recompute per unit per frame.
5. Downgrade or disable AI beyond a player radius; despawn entities nobody can see.
6. Replicate path id plus a progress scalar rather than per-frame CFrames; when applying server-side kinematic transforms in bulk, batch in the serial phase (e.g. `workspace:BulkMoveTo`) rather than setting individual CFrames.
**Never:** a `while true` loop per entity · a pathfinding request per entity per tick · unbounded spawning with no live cap.
**Failure modes:** entity count growing until the server stalls. Enforce a hard concurrent cap and make the spawner refuse rather than queue indefinitely.
**Verify:** run at the maximum intended entity count and check server frame time and the Physics/Scripts split in the CPU breakdown ([performance.md](../performance.md#measurement-never-optimize-blind)).
**Deeper:** [performance.md](../performance.md#cpu) · [genres.md](../genres.md#tower-defense--wave-defense)
