# Security & Monetization

Deep-dive on the "server is authoritative" rule and on purchase handling. The remote-handler skeleton (type → rate → ownership → game-state) lives in [patterns.md](patterns.md#remote-communication) — this file adds the layers around it.

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

-- Returns true if the player is within maxPerWindow calls for the action; false to reject
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
4. **Game-state plausibility** — is the action possible *right now*? (Alive? In range? Cooldown elapsed? Enough currency — checked server-side?)

## Movement & physics sanity checks

Character physics is client-owned; validate *outcomes*, not inputs:

- **Teleport/speed:** on a slow loop (1–2 Hz, staggered), compare position delta vs `WalkSpeed * elapsed * tolerance` (tolerance ≥ 1.5 — physics, lag, and legitimate mechanics overshoot). On violation: rubber-band back, log; kick only on sustained patterns.
- Account for legitimate causes before punishing: server teleports, vehicle exits, knockback, streaming pauses. Maintain an "expected displacement" allowlist window after such events.
- Hit/interaction range: re-verify distance server-side at execution time, with a lag allowance (~10–15 studs beyond nominal range, tuned per game).
- Don't build honeypots that punish automatically (invisible parts that kick on touch) without long observation first — false positives destroy trust.

## Server Authority (engine-level)

Roblox offers an **engine-level server-authoritative mode** [GA, 9 July 2026] that moves physics simulation and movement validation onto the server, closing the client-owned-movement gap that the manual sanity checks above only *mitigate*.

**It is off by default.** Roblox does not enable it for you; a place has it only if `Workspace.AuthorityMode = "Server"` was set explicitly. Confirm the mode before assuming either way — the gate, the full behavior contract, and the with/without comparison live in [server-authority.md](server-authority.md).

Two rules hold regardless of mode:

- Server Authority *strengthens* Non-Negotiable #1; it does not replace validation. Remote handlers and input consumers still validate type, range, ownership, and rate — server-authoritative transport is not the same as trusted intent.
- Where it is **not** enabled, the manual movement and physics sanity checks above remain the baseline, and using them is correct rather than outdated.

## Purchases

### ProcessReceipt (Developer Products) — correctness rules

`MarketplaceService.ProcessReceipt` is the single most bug-prone monetization API. Rules:

- **Exactly one** callback game-wide; set it in one server script.
- **Idempotent:** Roblox retries receipts (server crash, prior `NotProcessedYet`, rejoin). Record processed `PurchaseId`s durably (in the player's data profile, as a capped history list) and return `PurchaseGranted` immediately for already-processed IDs — never grant twice.
- **Grant, persist, then acknowledge:** apply the product effect, *save it* (or mark it inside the already-managed data profile), and only then return `Enum.ProductPurchaseDecision.PurchaseGranted`. Returning `PurchaseGranted` before the grant is durable = paid item lost on crash.
- Return `NotProcessedYet` when: the player left, their data isn't loaded, or the grant failed. Roblox will retry — that's the mechanism, not an error.
- Wrap the whole handler logic in `pcall`; an error inside ProcessReceipt otherwise silently drops the receipt until retry.
- Player may be offline on retry: either handle `player == nil` by returning `NotProcessedYet`, or design grants to work through the data store directly.

### Choosing the product type

| Type | Use for | Notes |
|---|---|---|
| Game Pass | Permanent one-time perks (VIP, x2 coins) | Check `UserOwnsGamePassAsync` (cache per session; also listen to `PromptGamePassPurchaseFinished`) |
| Developer Product | Consumables, repeatable (currency, revives) | ProcessReceipt rules above |
| Subscription | Recurring benefits | Check status on join + `UserSubscriptionStatusChanged`; always handle lapse |
| Paid access / Managed Pricing | Whole-experience monetization | Managed Pricing (regional + optimization) is platform-side; don't hardcode price displays — read from `GetProductInfo` |

- Never trust a client claim of ownership — verify server-side, cache the result, invalidate on purchase-finished events.
- Prompt purchases from the client (`PromptProductPurchase` etc. work there), but *effects* only ever originate from server-side verification.

## User-generated text (filtering)

Any user-written text displayed to *any other player* — pet names, guild names, signs, notes, custom messages — **must** pass text filtering. This is a platform requirement, not a style choice; it applies in every genre (a pet name in a simulator is as much UGC text as a chat message).

- Filter **on the server** via `TextService:FilterStringAsync(text, fromUserId, context)`; the result object yields per-audience strings: `GetNonChatStringForBroadcastAsync()` for everyone, `GetNonChatStringForUserAsync(toUserId)` per recipient. Client-side filtering does not exist as a trust boundary.
- Wrap the call in `pcall`; on failure **reject the text or fall back to a safe default** — never display the unfiltered original.
- Store the raw original server-side and filter at display time (filters improve over time); cache the filtered result per session to avoid repeated calls for the same string.
- Chat through `TextChatService` is filtered automatically — this section is about *custom* text surfaces you build yourself.

## Policy compliance (PolicyService)

Some features are legal for one player and prohibited for another (region, age). On join, `pcall` `PolicyService:GetPolicyInfoForPlayerAsync(player)` once, cache it per session, and gate features with it. On API failure, **fail closed** — treat the player as most-restricted.

| Field | Gates |
|---|---|
| `ArePaidRandomItemsRestricted` | Loot boxes / random rewards purchasable (directly or indirectly) with Robux — hide or disable when `true`; where offered at all, disclose the odds |
| `AllowedExternalLinkReferences` | Which social links may be shown (Discord, YouTube, ...) — show only the ones in the list |
| `AreAdsAllowed` | Ad content of any kind |
| `IsPaidItemTradingAllowed` | Trading items bought with paid currency |
| `IsSubjectToChinaPolicies` | Additional China-specific compliance requirements |

Genre note: gacha/lootbox-heavy designs (simulators, RPGs) must build the `ArePaidRandomItemsRestricted` branch from day one — retrofitting it after monetization ships is far more expensive.

## Logging & response

- Log validation failures with context (player, action, args, rate) via structured logging ([performance.md](performance.md#measurement-never-optimize-blind)) or AnalyticsService custom events — you tune thresholds from data, not guesses.
- `Players:BanAsync` for confirmed cheaters. Evasion-resistance knobs in the ban config: alt-account propagation is **on by default** (`ExcludeAltAccounts = true` to opt out); `ApplyDeviceBlock = true` additionally blocks the banned user's *device* from rejoining for 24 h (`UnbanAsync` overrides it); `ApplyToUniverse` controls universe-wide scope. Reserve automated bans for high-confidence signals only.
