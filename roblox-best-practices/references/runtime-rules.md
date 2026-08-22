# Non-Negotiable Runtime Rules

The expansion of Invariant Card items 3-8. SKILL.md carries the card, which is the version that must survive compaction; this file carries each rule's full statement and the scope that keeps it from being over-applied.

These hold through every mode, every supervision level, and every community library. Only the user can override one, and then only after the risk has been stated once ([SKILL.md](../SKILL.md#user-authority)).

Before flagging a violation of any of these in a review, check the scoped exceptions in [false-positives.md](false-positives.md) — each rule has shapes that only look like violations.

## The seven rules

1. **Server is authoritative.** Never trust the client: validate every RemoteEvent/RemoteFunction argument on the server — type, range, ownership, rate. The client renders and requests, nothing more. Validation depth and the threat model: [security.md](security.md).

2. **Clean up everything you create.** Store connections and disconnect them, or `Destroy()` the owning Instance — destroying disconnects the connections it owns. Any `PlayerAdded` setup has a matching `PlayerRemoving` teardown. Cleanup patterns and character lifecycle: [patterns/lifecycle.md](patterns/lifecycle.md).

3. **No avoidable per-frame garbage.** Don't allocate tables, closures, or strings inside `RunService` loops when they can be hoisted; hoist them. Use `RunService.Heartbeat` for gameplay and `PreRender`/`RenderStepped` only for camera and visual work on the client.
   - **Scope:** judge by the hot path's actual frequency. A closure created in a once-per-round callback is not garbage worth naming; only allocations that recur per frame or per entity are. Cold paths — `PlayerAdded`, purchase handlers, round setup — are exempt entirely.

4. **Never poll for state — react.** Use events, `:GetPropertyChangedSignal()`, attribute-changed signals, or tag signals rather than a `while task.wait() do` loop testing a condition that already has a signal.
   - **Scope:** genuinely *periodic* work — an autosave interval, a throttled AI scan, a round timer — is scheduling, not polling, and a timed loop is the correct shape for it.

5. **Save data safely.** `UpdateAsync` over `SetAsync` wherever concurrent writers are possible, exponential-backoff retry around every call, a save on `PlayerRemoving`, and a flush in both `game:BindToClose()` and `game.ServerRestartScheduled`. Session locking, version history, and what happens after the last retry fails: [patterns/data.md](patterns/data.md).

6. **Budget the network.** Batch remote traffic instead of firing per-item. Use `UnreliableRemoteEvent` for high-frequency, loss-tolerant data such as VFX triggers and positions. For large or frequently-updated state, send deltas rather than whole states — a small, infrequent snapshot is fine as it is. Remote design and cross-server messaging: [patterns/network.md](patterns/network.md).

7. **Re-validate after every yield.** Wherever a yield (`task.wait`, a `pcall`ed async call, `WaitForChild`) separates a check from its use, re-check after resuming: the player may have left (`player.Parent` is nil), the instance may be destroyed, the round or session may have changed. Capture the values you need *before* the yield; verify liveness *after* it.
   - **Scope:** straight-line non-yielding handlers need nothing. The rule triggers only when a yield sits between validation and action. The full catalog of post-yield failure states: [edge-cases.md](edge-cases.md).

Numbers, budgets, and the profiling behind rules 3 and 6: [performance.md](performance.md) and [device-performance.md](device-performance.md).
