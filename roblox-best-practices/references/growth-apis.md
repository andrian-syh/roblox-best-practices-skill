# Growth APIs: analytics, experiments, notifications, referrals

The engine APIs that measure players and bring them back. Each is server code with hard limits, and each fails quietly when misused: an event sent from the wrong side is dropped, a high-cardinality field turns into "Other", an experiment read on join dilutes itself. Taking money is in [monetization-policy.md](monetization-policy.md); the decisions about launch, store listing, and campaigns are in [publishing.md](publishing.md) and [live-ops.md](live-ops.md), not here.

## Contents

- [AnalyticsService](#analyticsservice)
- [Player segments](#player-segments)
- [Experiments (ConfigService)](#experiments-configservice)
- [Experience notifications](#experience-notifications)
- [Referrals and invites](#referrals-and-invites)

## AnalyticsService

Five event families, all logged **from the server, in a published game**. Events sent from a client or from a Studio session are not recorded ([funnel events](https://create.roblox.com/docs/production/analytics/funnel-events)).

| Method | Use |
|---|---|
| `LogOnboardingFunnelStepEvent` | The one-time first-session funnel. Each player completes each step once |
| `LogFunnelStepEvent` | Recurring funnels (shop visit, upgrade flow), keyed by `funnelName` and a `funnelSessionId` |
| `LogEconomyEvent` | Every source and sink of a currency, with the ending balance |
| `LogProgressionEvent` (and `Start`, `Complete`, `Fail`) | Levels, quests, stages |
| `LogCustomEvent` | Counters and values that fit no family above |

`FireCustomEvent`, `FireEvent`, `FireInGameEconomyEvent`, `FireLogEvent`, `FirePlayerProgressionEvent`, and the `ApiKey` property are deprecated; replace each with its `Log*` counterpart.

**Limits** ([event types](https://github.com/Roblox/creator-docs/blob/main/content/en-us/production/analytics/event-types.md)):

| Limit | Value |
|---|---|
| Request rate | 120 per minute plus 20 per concurrent user. Whether this is per server or per experience is not stated, so budget it per server |
| Custom fields | 3 per event, keys `CustomField01` to `CustomField03`, string values. Past 8,000 combined unique values, new values land in "Other" |
| Economy | 10 resource types; transaction types bucket after 20, item SKUs after 100 |
| Funnels | 10 per experience, 100 steps each. Only the 10 newest `funnelSessionId` values per player per funnel are tracked; progress expires after 180 days without an event |
| Custom events | 100 event names |
| Visibility | Charts appear about 24 hours after the first event; an event stays visible 90 days after its last data |

**Design rules:**

- **Start with the onboarding funnel,** since that is where most players are lost. Log step 1 in `Players.PlayerAdded` so the funnel starts on join, and keep step names stable: renaming or reordering steps splits the chart at the change.
- **A skipped step completes the steps before it,** and a repeated step counts once but still spends rate budget. Log each step at the moment the player reaches it, not in a batch afterwards.
- **A step the client reports is validated on the server.** Reject a step number above the funnel's last step or out of order for that player.
- **Few event names, low-cardinality fields.** One `PlantSeed` event with a plant field, not `PlantCabbage` and `PlantTurnip`. Never put a `UserId`, a timestamp, or free text in a custom field: each unique value spends the 8,000 budget.
- **Batch values to stay under the rate.** One `LogCustomEvent` with a value of 10 instead of ten calls of 1.
- **Economy events mirror the authoritative ledger.** Log after the write that changed the balance succeeded, with the balance it produced. Sources minus sinks drifting upward over time is the signal to add sinks.
- A recurring funnel's `funnelSessionId` is a fresh GUID per attempt (`HttpService:GenerateGUID`), or `<UserId>-<itemId>` for a per-item upgrade path.

## Player segments

`AnalyticsService:GetPlayerSegmentsAsync(player)` returns coarse buckets (spending behaviour, tenure, engagement) for tailoring offers and onboarding. It is **server-only and throws on the client**. When data is unavailable it does not throw: it returns `HasData = false` with every field `Unknown`. Read `HasData` first, and treat `false` as "no signal", never as the lowest bucket. Results are cached per player for the server session ([AnalyticsService](https://create.roblox.com/docs/reference/engine/classes/AnalyticsService)).

## Experiments (ConfigService)

- Read per player with `ConfigService:GetConfigForPlayerAsync(player)`. `GetConfigAsync` returns the default config and **does not apply experiments** ([experiments](https://create.roblox.com/docs/production/experiments)).
- The first `GetValue()` call on a key enrolls the player in that key's experiment. Call it where the player reaches the tested feature, not on join; enrolling players who never see the feature dilutes the result.
- One active experiment per config key, and the key is locked while it runs.
- Wrap the fetch in `pcall` and keep an in-code default for every key, so a failed fetch plays the control experience instead of breaking.
- Below roughly 1,000 daily players, experiments rarely reach significance. Funnels and before-and-after comparisons are the tools at that size.

## Experience notifications

- In the experience, `ExperienceNotificationService:CanPromptOptInAsync()` says whether the opt-in prompt may show, and `PromptOptIn()` shows it. The prompt text cannot be changed, it never shows to players under 13, and a player who saw it is not asked again for 30 days. Ask at a moment the player would want a reminder, such as after starting something that finishes later.
- Sending happens through Open Cloud, not Luau. Personalized notifications reach only opted-in players aged 13 and over; each player receives at most one per experience per day ([experience notifications](https://create.roblox.com/docs/production/promotion/experience-notifications)).
- Strings are at most 99 characters and `launchData` at most 200 bytes. The player who taps the notification joins with that data in `Player:GetJoinData()`.
- **Launch data is untrusted input.** Anyone can craft a link that carries it. Validate it on the server like a remote argument before acting on it.
- Gameplay never depends on notifications being on. No fake urgency, no bait-and-switch.

## Referrals and invites

- `SocialService:PromptGameInvite(player)` opens the invite modal; a button in the experience is how players find the referral reward banner set in Creator Hub. The experience must be live at least one day before referral rewards can run ([referral system](https://create.roblox.com/docs/production/promotion/referral-system)).
- On the server, `Player:GetJoinData().ReferredByPlayerId` names the inviter for every invite type. The platform fills it, but the reward logic, caps, and abuse checks are the experience's own.
- **One reward per invitee, recorded durably.** Store the rewarded invitee's `UserId` in the inviter's saved data before granting, so a rejoin or a second server cannot pay twice; this is the same grant-then-record rule as a receipt. Add a per-inviter cap and cooldown.
- A referral reward with a random prize falls under the contest and paid random rules. Keep it fixed.
