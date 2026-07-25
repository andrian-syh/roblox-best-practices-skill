# Cases: Combat & Entities

Blueprints for systems where fairness and server CPU collide. Every recipe here depends on the place's authority mode, so **resolve that first** ([server-authority.md](../server-authority.md)) — the answers differ.

**Preflight:** identify the case → confirm the authority mode → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → decide how you will verify it ([verification.md](../verification.md)).

## Damage and hit validation

**Recognize:** "damage", "hit detection", "hitbox", "melee", "shoot", "kill credit"
**Dominant risk:** cheating, and latency making honest hits feel wrong.
**Server/client:** the client shows feedback immediately; the server decides whether damage happened.
**Assembly:**
1. Client sends an **intent** (fired, swung, with a timestamp and target hint), never a damage number.
2. Server validates in cheap-to-expensive order: type and shape → fire-rate and cooldown → alive and in-state → range and line of sight → ammo.
3. Apply a **lag allowance** on the spatial check rather than an exact server raycast; an exact check feels broken at 150 ms ping.
4. Server computes damage from server-side stats, applies it, and replicates the result.
5. Kill credit and rewards are computed once, server-side.
**Never:** accept a client-sent damage value · trust client-reported positions for validation (only for display) · run the damage formula on the client.
**Failure modes:** validating against the attacker's *current* position when the shot was fired hundreds of milliseconds ago. Either rewind to the fire timestamp or widen the tolerance deliberately; pick one and document the number.
**Under Server Authority:** movement is engine-validated, so the position inputs are trustworthy and tolerances can shrink. Without it, the manual plausibility checks in [security-monetization.md](../security-monetization.md#movement--physics-sanity-checks) remain the baseline.
**Verify:** test at 100–200 ms simulated latency with multiple clients; confirm honest hits register and impossible ones do not.
**Deeper:** [genres.md](../genres.md#combat--fps--pvp)

## Abilities and cooldowns

**Recognize:** "ability", "skill", "cooldown", "ultimate", "combo", "cast"
**Dominant risk:** client-side cooldowns being the only enforcement.
**Server/client:** the client predicts the animation and VFX; the server owns the cooldown clock and the effect.
**Assembly:**
1. Keep per-player, per-ability cooldown state **server-side**, keyed by player and cleared in `PlayerRemoving`.
2. Client sends a cast intent; the server checks the cooldown, resource cost, and state (alive, not stunned) before applying anything.
3. Start the client-side visual immediately for feel; reconcile quietly if the server rejects it.
4. Buffer at most **one** queued input. Deeper queues become macro exploits.
5. Store cooldown timestamps with `os.clock()` for in-session durations; persist only what must survive a rejoin, using `os.time()`.
**Never:** let the client report that a cooldown elapsed · trust a client-sent ability id without checking the player actually has it · leave per-character ability state uncleared on respawn.
**Failure modes:** per-character state (active buffs, channel handles) surviving a respawn because it was keyed by player. Key per-life state by the **character** and clear it on `CharacterRemoving` ([patterns.md](../patterns.md#character-lifecycle)).
**Verify:** spam the cast remote far above the intended rate and assert the server applies exactly the allowed number.
**Deeper:** [security-monetization.md](../security-monetization.md#server-side-validation-layers) · [genres.md](../genres.md#battlegrounds--fighting--melee-pvp)

## Projectiles

**Recognize:** "bullet", "arrow", "projectile", "fireball", "tracer"
**Dominant risk:** allocation churn and per-projectile scripts.
**Server/client:** the server owns the authoritative trajectory or hit resolution; clients render.
**Assembly:**
1. **Pool** projectile instances; take, reset every mutated property, use, return ([patterns.md](../patterns.md#object-pooling)).
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
1. **One** staggered update system iterates all entities. Never a script per NPC.
2. Throttle deliberately: AI targeting and proximity scans run at 5–10 Hz, not 60. Stagger work across frames (`i % N == frame % N`).
3. Pool NPC models and any projectiles they spawn.
4. Compute paths on a **path-change event**, share the waypoint list across every unit following it, and never recompute per unit per frame.
5. Downgrade or disable AI beyond a player radius; despawn entities nobody can see.
6. Replicate path id plus a progress scalar rather than per-frame CFrames.
**Never:** a `while true` loop per entity · a pathfinding request per entity per tick · unbounded spawning with no live cap.
**Failure modes:** entity count growing until the server stalls. Enforce a hard concurrent cap and make the spawner refuse rather than queue indefinitely.
**Verify:** run at the maximum intended entity count and check server frame time and the Physics/Scripts split in the CPU breakdown ([performance.md](../performance.md#measurement-never-optimize-blind)).
**Deeper:** [genres.md](../genres.md#tower-defense--wave-defense)
