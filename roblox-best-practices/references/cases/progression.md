# Cases: Progression & Rankings

Blueprints for systems that compare players or gate rewards on time. Both are ordinary-looking systems with sharp, well-known edges.

**Preflight:** identify the case → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → check for a library overlay ([community-libraries.md](../community-libraries.md)) → decide how you will verify it ([verification.md](../verification.md)).

## Leaderboards

**Recognize:** "leaderboard", "top players", "global ranking", "high score", "podium"
**Dominant risk:** request budget exhaustion, and confusing the two very different kinds of leaderboard.
**Server/client:** the server writes and reads rankings; clients receive a rendered snapshot.
**Assembly:**
1. Decide the kind first. **In-server** (current match, scoreboard) is plain in-memory state and needs no store. **Global persistent** uses an OrderedDataStore. **Live cross-server** (short-lived, frequently updated) belongs in MemoryStore sorted maps — and above roughly a thousand keys, a hash map partitions itself where a sorted map would not ([patterns/network.md](../patterns/network.md#cross-server-communication)).
2. For global boards, write on a **throttled cadence** (session end, milestone, or a periodic flush), never on every score change.
3. Read the top N on an interval and cache the result server-side; broadcast that snapshot to clients rather than letting each client trigger a query.
4. Wrap every store call in `pcall` with backoff, and keep serving the last good snapshot when a refresh fails.
5. Reset periods (daily, weekly) use a **new key per period** derived from a server-computed date, not a mutation of the old key.
**Never:** query a store per player per frame · accept a client-submitted score · let a leaderboard refresh block gameplay.
**Failure modes:** a popular experience burning the shared request budget on leaderboard refreshes and starving player-data saves. Ordered stores have their own tighter per-server write and remove budgets, and the whole allowance is shared with Open Cloud; read what is left with `GetRequestBudgetForRequestType()` rather than assuming ([limits-budgets.md](../limits-budgets.md#data-stores)).
**Also:** one global board is one hot key. Sharding the sorted map by key range, or rotating across several, is what stops per-partition throttling while the experience-wide quota still looks healthy.
**Verify:** run with a short refresh interval under load and confirm data saves still succeed.
**Deeper:** [patterns/network.md](../patterns/network.md#cross-server-communication)

## Time-gated rewards (daily, streaks, offline progress)

**Recognize:** "daily reward", "login streak", "come back tomorrow", "offline earnings", "AFK progress"
**Dominant risk:** time manipulation. The client clock and the client-reported elapsed time are both attacker-controlled.
**Server/client:** every timestamp is server-side; the client displays a countdown it cannot influence.
**Assembly:**
1. Store the **last claim timestamp** with `os.time()` (persistent Unix epoch) in the player's data.
2. On load, compute elapsed time as `os.time() - lastClaim` on the **server**, and derive eligibility or offline earnings from that.
3. Clamp offline accrual to a maximum window so a long absence cannot mint an unbounded reward.
4. Write the new timestamp and the granted amount in the same save as the reward.
5. For streaks, store the streak counter alongside the timestamp and evaluate continuity server-side.
**Never:** accept a client-reported duration or date · use `tick()` or `time()` for anything persisted · grant before persisting the new timestamp.
**Failure modes:** granting the reward, failing to save, and letting the player rejoin to claim again. Persist the timestamp first, or grant and persist atomically in one save.
**Budget:** these run on join for every player, so keep them inside the same load/save round-trip as player data rather than adding separate store calls.
**Verify:** claim, force a shutdown before autosave, rejoin, and confirm the reward cannot be claimed twice.
**Deeper:** [luau-language.md](../luau-language.md#time-apis--one-job-each) · [genres.md](../genres.md#simulator--tycoon--idle)
