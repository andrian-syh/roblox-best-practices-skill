# Data, Ownership, and Failure

Who owns each fact, how it is persisted, and what happens when a call finally fails. Part of the framework-agnostic pattern set indexed in [patterns.md](../patterns.md).

## Contents

- [One Owner Per Fact](#one-owner-per-fact)
- [Data Persistence](#data-persistence)
- [Failure Policy (what happens after the last retry)](#failure-policy-what-happens-after-the-last-retry)
- [Serialized Operations (per-owner locks)](#serialized-operations-per-owner-locks)

## One Owner Per Fact

Before any of the patterns below, settle **who owns each piece of state**. A fact has exactly one owner that writes it; every other copy is a **view**, derived after the authoritative change and never written back. Two writable copies of the same fact will diverge — not might, will — and the resulting bug reproduces only under timing you cannot reproduce on demand.

- **Name the owner before writing either side.** This is step 3 of the System Design Preflight ([SKILL.md](../../SKILL.md#system-design-preflight)); the answer is a specific module or side, not "the server" in general.
- **Views are written in one direction only.** `leaderstats`, attributes, UI labels, and client caches all display a fact; none of them is where it lives. Update them **after** the owner changes, never as the change itself ([cases/data-economy.md](../cases/data-economy.md#currency-and-transactions)).
- **A client cache is a view even when it is convenient.** The client may hold a copy for rendering and prediction; the server never reads it back to decide anything.
- **Two server modules writing the same field is the same bug.** If two systems both need to change a value, one of them owns it and exposes a function the other calls.
- **Derived values are computed, not stored twice.** A total, a rank, or a "can afford" flag recomputed from the owner is always consistent; the same value cached in a second place is consistent only until someone forgets to update it.

The test: **if these two copies disagreed right now, which one is right?** If the answer takes thought, the ownership is not settled yet.

## Data Persistence

- **`UpdateAsync` over `SetAsync`** — atomic read-modify-write prevents lost updates from multiple servers.
- **Retry with exponential backoff** around every DataStore call (`pcall` + `2^attempt` delay, 3–5 attempts).
- **Save triggers:** `PlayerRemoving` (always), periodic autosave (2–5 min), `game:BindToClose` (iterate remaining players synchronously — you get 30 s), and `game.ServerRestartScheduled` where available (fires before scheduled restarts; flush early).
- **Versioned store names** (`PlayerData_v2`) + a migration function on load, so schema changes never corrupt old data.
- **Version history is a built-in backup.** DataStore retains prior versions of each key: `DataStore:ListVersionsAsync` enumerates them and `DataStore:GetVersionAsync` reads a specific one, so a corruption or dupe report can be investigated and rolled back without a bespoke backup system. `ListKeysAsync` enumerates keys for migration/audit sweeps; the `DataStoreKeyInfo` returned alongside `GetAsync`/`UpdateAsync` carries version ids and metadata. These are diagnostic/read tools — the live save path stays `UpdateAsync`.
- **Session cache:** load once on join into a server-side table; all gameplay reads/writes hit the cache; DataStore only on save triggers. Never read DataStores during gameplay.
- **Session locking** (write a lock key with server id + timestamp, or use MemoryStore) if item duplication via server-hopping matters for your economy.
- **Know the ceilings before designing the payload.** 4 MB per key, 50-character key names, a per-experience storage pool, and a request budget now **shared between in-game and Open Cloud** calls — an external batch job and live gameplay draw from the same allowance, so self-throttle both. Numbers and effective dates: [limits-budgets.md](../limits-budgets.md#data-stores).
- **Store only serializable shapes.** DataStore values must survive JSON encoding: strings valid UTF-8; table keys either a contiguous `1..n` array or all strings (mixed or sparse keys fail); no `NaN`/`±inf`; no Instances or userdata (`Vector3`, `CFrame`, `Color3`, EnumItems — convert to primitive tables/numbers on save, rebuild on load); no cycles; value ≤ 4 MB, key name ≤ 50 characters. A violation makes the **save call itself fail** — so keep session data in a serializable shape from the start rather than sanitizing at save time, and make the retry wrapper log the error so these failures are never silent.

## Failure Policy (what happens after the last retry)

`pcall` plus backoff is required on every external or yielding call, but the retry loop only postpones the decision. **Every such call needs a stated answer to "and if it still fails?"** — chosen when the call is written, not improvised in the failure branch.

Three classes cover almost everything:

| Class | Applies to | Behavior on final failure |
|---|---|---|
| **Fail closed** | Money, permissions, ownership, policy checks, anything granting an advantage | Deny. Treat the player as the **most** restricted, never the least. An unavailable check is not a passing check |
| **Fail open** | Cosmetics, telemetry, analytics, optional decoration, non-blocking enrichment | Continue without it. Log once and carry on; a missing hat never blocks a session |
| **Fail loud** | Persistence: loading or saving player data | Neither of the above. Mark the session, tell the player, and **stop writing** |

**Fail loud is the one that gets written wrong,** and it is the most expensive. When a load fails after its retries, falling through to defaults produces a player with an empty profile whose next autosave **overwrites their real history**. The retry loop looked correct; the data is gone anyway. The rule: a session whose load failed is flagged unsaveable, the player is told plainly, and every save path checks that flag before writing ([cases/data-economy.md](../cases/data-economy.md#player-data-persistence)).

- **Say which class you chose.** One line at the call site is enough, and it is exactly the kind of non-obvious external constraint an in-line note is for ([section-layout.md](../section-layout.md#in-line-notes-inside-the-body)).
- **Never swallow silently.** A `pcall` whose failure branch does nothing hides the outage that caused it. Log with context even when the policy is to continue ([luau-language.md](../luau-language.md#error-handling)).
- **Bound the retries.** Retrying forever converts a transient outage into a hung session and burns the request budget everyone else needs ([limits-budgets.md](../limits-budgets.md)).
- **A degraded session should be visible.** The player being told "your progress could not be loaded, changes will not be saved" is vastly better than discovering it after an hour of play.

## Serialized Operations (per-owner locks)

Anything that yields between checking a condition and acting on it can run twice concurrently for the same owner. Two purchase remotes in one frame both pass an affordability check before either debits; a rejoin racing a save loads a profile the previous session is still writing. This is the pattern several recipes call for — "serialize per-player economy operations", "a per-player trade lock" — and it is small enough to write inline:

```lua
-- | State Management | --
local busyPlayers: {[Player]: true} = {}

-- // FUNCTIONS // --

--[[
	Runs an operation for a player, refusing to start a second one concurrently.

	@param operation (() -> ()) -- Runs only when the player has nothing else in flight
	@return boolean -- False when the player was already busy and nothing ran
]]
local function runExclusive(player: Player, operation: () -> ()): boolean
	if busyPlayers[player] then
		return false
	end
	busyPlayers[player] = true

	local ok, err = pcall(operation)

	busyPlayers[player] = nil
	if not ok then
		warn(`exclusive operation failed for {player.UserId}: {err}`)
	end
	return ok
end
```

- **The lock releases on every path**, including the error path — hence the `pcall`. A lock leaked by an early `return` or a thrown error leaves that player permanently unable to act, which is worse than the race it was guarding.
- **Clear the lock in `PlayerRemoving`** like any other per-player table entry ([Lifecycle & Cleanup](lifecycle.md#lifecycle--cleanup)). A departed player holding a lock is a leak.
- **Locks are per owner, not global.** One player's purchase must not block another's; a global lock turns a race into a queue and a queue into lag.
- **Rejecting is a valid outcome.** The second call returning `false` and doing nothing is correct behavior for a double-click; it does not need to be queued and replayed.
- **This does not replace re-validation.** The lock stops two *operations* from interleaving; state can still change during a yield **inside** one operation, so post-yield checks still apply ([SKILL.md](../../SKILL.md#non-negotiable-runtime-rules) rule 7).
- **Only where a real interleaving exists.** An operation with no yield between its check and its effect cannot interleave and needs no lock — adding one there is ceremony ([minimal-code.md](../minimal-code.md)).

