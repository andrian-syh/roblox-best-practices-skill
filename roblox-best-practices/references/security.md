# Security and Anti-Exploit

What an exploiter can reach, and the server-side layers that stop them. Purchases and platform policy live in [monetization-policy.md](monetization-policy.md).

## Contents

- [Threat model (assume all of these exist)](#threat-model-assume-all-of-these-exist)
- [Server-side validation layers](#server-side-validation-layers)
- [Movement & physics sanity checks](#movement--physics-sanity-checks)
- [Server Authority (engine-level)](#server-authority-engine-level)
- [User-generated text (filtering)](#user-generated-text-filtering)
- [Logging & response](#logging--response)

## Threat model (assume all of these exist)

Exploiters can: fire any RemoteEvent/RemoteFunction with any arguments at any rate; read *all* client-replicated code and data (LocalScripts, ModuleScripts in ReplicatedStorage, attribute values); move their character anywhere at any speed; delete/modify anything client-side. They can **not**: run code on the server, see ServerStorage/ServerScriptService, or modify other clients.

Consequences:
- Never put secrets (API keys, admin lists used for enforcement, loot tables you don't want mined) in ReplicatedStorage or any client-visible location. Enforcement data lives server-side; ReplicatedStorage holds only what clients legitimately need.
- Client-side anti-cheat is a speed bump, not a wall — it may exist for honest-player UX, but every *decision* is server-side.
- Validate **client-reachable inputs**: RemoteEvents, RemoteFunctions, UnreliableRemoteEvents, and teleport data. Server-side `BindableEvent`/`BindableFunction` and internal module calls are **not** a trust boundary (an exploiter cannot reach them) — don't apply client-style validation there ([false-positives.md](false-positives.md#security--validation--what-is-not-a-trust-boundary)).
- Never execute strings or dynamic requires from client input; `loadstring`/`getfenv`/`setfenv` stay banned.

## Server-side validation layers

Every remote handler, in order (cheapest check first):

1. **Type/shape** — `typeof()` every argument; reject `nil`/wrong types silently (no error replies that help fuzzing).
2. **Rate** — per-player, per-action token bucket or fixed window. Reference implementation:

```lua
-- | State Management | --
local buckets: {[Player]: {[string]: {count: number, windowStart: number}}} = {}

--[[
	Decides whether a player may perform an action under its rate policy.

	@param window number? -- Seconds; defaults to a one-second window
	@return boolean -- False when the request should be rejected
]]
local function allowRate(player: Player, action: string, maxPerWindow: number, window: number?): boolean
	local now = os.clock()
	local windowSize = window or 1
	local playerBuckets = buckets[player]
	if not playerBuckets then playerBuckets = {}; buckets[player] = playerBuckets end
	local bucket = playerBuckets[action]
	if not bucket or now - bucket.windowStart > windowSize then
		playerBuckets[action] = {count = 1, windowStart = now}
		return true
	end
	bucket.count += 1
	return bucket.count <= maxPerWindow
end
```

Clear `buckets[player]` in `PlayerRemoving`. Escalate repeat offenders (log → soft-fail → kick) instead of kicking on the first violation — mobile lag spikes cause honest bursts.

3. **Ownership/authorization** — does this player own the item / have the role / stand in the right place?
4. **Game-state plausibility & state machines** — is the action allowed right now? (Alive? Not stunned/recovering in the combat state machine? Cooldown elapsed via `os.clock()`? Enough currency — checked server-side?)

## Movement & physics sanity checks

Character physics is client-owned; validate *outcomes*, not inputs:

- **Teleport/speed:** on a slow loop (1–2 Hz, staggered), compare position delta vs `WalkSpeed * elapsed * tolerance` (tolerance ≥ 1.5 — physics, lag, and legitimate mechanics overshoot). On violation: rubber-band back, log; kick only on sustained patterns.
- **Raycast origin & muzzle verification:** for combat/hitscan remotes, verify that the shot's starting origin is within a tight proximity window of the player's server-recorded character position (`(origin - characterRoot.Position).Magnitude <= MAX_MUZZLE_DISCREPANCY`). Never cast rays directly from an unvalidated client-supplied origin.
- Account for legitimate causes before punishing: server teleports, vehicle exits, knockback, streaming pauses. Maintain an "expected displacement" allowlist window after such events.
- **Hit/interaction range:** re-verify distance server-side at execution time, with a bounded lag allowance (~10–15 studs beyond nominal range, and a temporal rewind cap of ~300–500 ms).
- Don't build honeypots that punish automatically (invisible parts that kick on touch) without long observation first — false positives destroy trust.

## Server Authority (engine-level)

Roblox offers an **engine-level server-authoritative mode** [GA] that moves physics simulation and movement validation onto the server, closing the client-owned-movement gap that the manual sanity checks above only *mitigate*.

**It is off by default.** Roblox does not enable it for you; a place has it only if `Workspace.AuthorityMode = "Server"` was set explicitly. Confirm the mode before assuming either way — the gate, the full behavior contract, and the with/without comparison live in [server-authority.md](server-authority.md).

Two rules hold regardless of mode:

- Server Authority *strengthens* Non-Negotiable #1; it does not replace validation. Remote handlers and input consumers still validate type, range, ownership, and rate — server-authoritative transport is not the same as trusted intent.
- Where it is **not** enabled, the manual movement and physics sanity checks above remain the baseline, and using them is correct rather than outdated.

## User-generated text (filtering)

Any user-written text displayed to *any other player* — pet names, guild names, signs, notes, custom messages — **must** pass text filtering. This is a platform requirement, not a style choice; it applies in every genre (a pet name in a simulator is as much UGC text as a chat message).

- Filter **on the server** via `TextService:FilterStringAsync(text, fromUserId, context)`; the result object yields per-audience strings: `GetNonChatStringForBroadcastAsync()` for everyone, `GetNonChatStringForUserAsync(toUserId)` per recipient. Client-side filtering does not exist as a trust boundary.
- Wrap the call in `pcall`; on failure **reject the text or fall back to a safe default** — never display the unfiltered original.
- Store the raw original server-side and filter at display time (filters improve over time); cache the filtered result per session to avoid repeated calls for the same string.
- Chat through `TextChatService` is filtered automatically — this section is about *custom* text surfaces you build yourself.

## Logging & response

- Log validation failures with context (player, action, args, rate) via structured logging ([performance.md](performance.md#measurement-never-optimize-blind)) or AnalyticsService custom events — you tune thresholds from data, not guesses.
- `Players:BanAsync` for confirmed cheaters. Evasion-resistance knobs in the ban config: alt-account propagation is **on by default** (`ExcludeAltAccounts = true` to opt out); `ApplyDeviceBlock = true` additionally blocks the banned user's *device* from rejoining for 24 h **[Verify]** — that duration is not stated in the API reference; confirm before relying on it (`UnbanAsync` overrides the block); `ApplyToUniverse` controls universe-wide scope. Reserve automated bans for high-confidence signals only.
