# Cases: Client & Infrastructure

Blueprints for the cross-cutting layers: how state reaches the screen, how abuse is throttled, and how you find out what is actually happening in production.

**Preflight:** identify the case → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → decide how you will verify it ([verification.md](../verification.md)).

## HUD and state sync

**Recognize:** "update the UI", "show coins", "health bar", "HUD", "sync to client"
**Dominant risk:** building a remote for state that replicates for free, and re-laying out the UI every frame.
**Server/client:** the server owns state; the client renders and never computes authoritative values.
**Assembly:**
1. **Prefer free replication.** State a client merely displays belongs on **attributes** (on the player or character) or tags, not on a custom remote. Remotes are for *actions*.
2. Drive UI from change signals (`GetAttributeChangedSignal`, `GetPropertyChangedSignal`), never a per-frame poll of a value.
3. For values that genuinely change per frame (a depleting bar), tween or update the single element, and isolate it in its own container so it does not force layout recalculation of a large tree.
4. Batch multi-field updates into one payload rather than firing several remotes.
5. Set `Visible = false` on closed panels and destroy screens that will not reopen; an invisible frame still costs layout if it stays laid out. Disabling the whole `ScreenGui` is cheaper than hiding children individually.
6. Script against the player's `PlayerGui` copy, never `StarterGui`, and set `ResetOnSpawn = false` on any HUD that must survive a respawn ([ui-crossplatform.md](../ui-crossplatform.md#containers-where-ui-lives)).
7. Let layouts and a `StyleSheet` carry appearance and arrangement; a Luau loop that assigns colors or positions across many instances is the thing the styling system replaces.
**Never:** `while task.wait() do label.Text = ... end` · a remote per stat · recreating UI elements instead of updating them.
**Failure modes:** attribute updates firing far more often than the display can meaningfully change. Throttle at the source, or compare against the last displayed value and early-return when unchanged.
**Under Server Authority:** attribute replication is limited to the first 64 attributes with 50-character names and string values ([limits-budgets.md](../limits-budgets.md#attributes)).
**Verify:** watch frame time while the value updates at its maximum realistic rate.
**Deeper:** [ui-crossplatform.md](../ui-crossplatform.md#ui-performance) · [templates.md](../templates.md)

## Rate limiting and the anti-cheat layer

**Recognize:** "anti-cheat", "rate limit", "spam protection", "exploiter", "cooldown on remotes"
**Dominant risk:** punishing honest players, and scattering half-checks across dozens of handlers.
**Server/client:** entirely server-side. Client-side checks are UX, never enforcement.
**Assembly:**
1. Build **one** rate-limit module with a per-player, per-action budget, and call it from every remote handler rather than reimplementing per handler.
2. Apply the validation order from cheapest to most expensive: type and shape → rate → ownership and authorization → game-state plausibility.
3. Clear all per-player buckets in `PlayerRemoving`.
4. **Escalate, do not insta-kick.** Log, then soft-fail, then act. Mobile lag spikes produce honest bursts that look like spam.
5. Log rejections with context (player, action, arguments, rate) so thresholds are tuned from data rather than guesses.
6. Reserve `Players:BanAsync` for high-confidence signals; its alt-account and device options are strong medicine. Escalate along the documented ladder — silent logging, quiet mitigation, temporary restriction, visible enforcement — and require several independent signals before the last step ([security.md](../security.md#detection-and-the-consequence-ladder)).
**Never:** kick on a first violation · rely on client-side detection · build silent honeypots that auto-punish before a long observation period.
**Failure modes:** a rate limit tuned on a desktop LAN test that kicks mobile players on a train. Pick tolerances from logged production distributions.
**Not a trust boundary:** server-side `BindableEvent`s and internal module calls do not need client-style validation ([false-positives.md](../false-positives.md#security--validation--what-is-not-a-trust-boundary)).
**Verify:** replay a burst at several multiples of the intended rate and confirm the server rejects cleanly without erroring.
**Deeper:** [security.md](../security.md#server-side-validation-layers)

## Analytics and telemetry instrumentation

**Recognize:** "track", "funnel", "analytics", "why are players leaving", "economy metrics", "logging"
**Dominant risk:** instrumenting after the problem appears, and letting telemetry break gameplay.
**Server/client:** emit from the server where the authoritative event happens; forward client errors through a rate-limited remote.
**Assembly:**
1. Instrument **at ship time**, not after a retention problem shows up. The data you lack is the data you needed.
2. Use `AnalyticsService` custom events for funnels (onboarding steps, purchase flow, first session) and economy events (source and sink per currency).
3. Capture unhandled errors with `ScriptContext.Error` on both sides; forward client errors to the server through a **rate-limited** remote and log with script name and stack.
4. Use structured `LogService` methods with context rather than `print` spam; keep debug-level output behind a Configuration flag, off by default.
5. **Wrap every telemetry call in `pcall`.** Diagnostics must never crash gameplay.
6. For memory attribution, tag systems with `debug.setmemorycategory` so "LuaHeap is growing" becomes "the pet system is growing", and read the live picture from the Performance Dashboard rather than from Studio ([performance.md](../performance.md#measurement-never-optimize-blind)).
7. Cloud usage has its own dashboards: data store and memory store observability chart quota, throttling, and error status over 30 days, and memory stores raise alerts at 70% of quota. Instrument the game, but read those before concluding a cloud problem is a code problem.
**Never:** log per frame · send player-identifying free text without filtering · let an analytics failure propagate into a gameplay path.
**Failure modes:** a client error storm from one broken build saturating the error-forwarding remote. The rate limit on that remote is not optional.
**Verify:** trigger an error deliberately and confirm it appears with context, while gameplay continues unaffected.
**Deeper:** [verification.md](../verification.md#error-telemetry--logging) · [performance.md](../performance.md#measurement-never-optimize-blind)
