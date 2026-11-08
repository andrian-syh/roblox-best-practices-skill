# Monetization and Policy Compliance

Taking money correctly and staying inside platform rules. The validation layers these calls sit behind are in [security.md](security.md); the assembly order for a specific monetization system is in [cases/monetization.md](cases/monetization.md).

## Contents

- [Purchases](#purchases)
  - [ProcessReceipt (Developer Products): correctness rules](#processreceipt-developer-products-correctness-rules)
  - [Choosing the product type](#choosing-the-product-type)
- [Policy compliance (PolicyService)](#policy-compliance-policyservice)
- [Paid random items](#paid-random-items)
- [Ads in experiences](#ads-in-experiences)
- [External links and off-platform references](#external-links-and-off-platform-references)

## Purchases

### ProcessReceipt (Developer Products): correctness rules

`MarketplaceService.ProcessReceipt` is the single most bug-prone monetization API. Rules:

- **Exactly one** callback game-wide; set it in one server script.
- **Idempotent:** Roblox retries receipts (server crash, prior `NotProcessedYet`, rejoin). Record processed `PurchaseId`s durably (in the player's data profile, as a capped history list) and return `PurchaseGranted` immediately for already-processed IDs: never grant twice.
- **Grant, persist, then acknowledge:** apply the product effect, *save it* (or mark it inside the already-managed data profile), and only then return `Enum.ProductPurchaseDecision.PurchaseGranted`. Returning `PurchaseGranted` before the grant is durable = paid item lost on crash.
- Return `NotProcessedYet` when: the player left, their data isn't loaded, or the grant failed. Roblox will retry: that's the mechanism, not an error.
- Wrap the whole handler logic in `pcall`; an error inside ProcessReceipt otherwise silently drops the receipt until retry.
- Player may be offline on retry: either handle `player == nil` by returning `NotProcessedYet`, or design grants to work through the data store directly.

### Choosing the product type

| Type | Use for | Notes |
|---|---|---|
| Game Pass | Permanent one-time perks (VIP, x2 coins) | Check `UserOwnsGamePassAsync` (cache per session; also listen to `PromptGamePassPurchaseFinished`) |
| Developer Product | Consumables, repeatable (currency, revives) | ProcessReceipt rules above |
| Subscription | Recurring benefits | Check `MarketplaceService:GetUserSubscriptionStatusAsync` on join and listen to `Players.UserSubscriptionStatusChanged`; always handle lapse |
| Paid access / Managed Pricing | Whole-experience monetization | Managed Pricing (regional + optimization) is platform-side; don't hardcode price displays: read from `GetProductInfoAsync` |

- **Prices vary by region.** Passes, avatar items and opted-in developer products can sell below their default price in some regions (up to 70% lower, never higher), so never compare against or display a hardcoded Robux amount: read `PriceInRobux` from `MarketplaceService:GetProductInfoAsync` (or `GetDeveloperProductsAsync`) at display time ([DevForum](https://devforum.roblox.com/t/-/3971235), [api-currency.md](api-currency.md#engine)).
- **Trades and gifts cross price regions.** An item bought cheaply in one region and traded or gifted to a player in another is price arbitrage. `MarketplaceService:GetUsersPriceLevelsAsync(userIds)` returns each user's price level from 1 to 1000, where 1000 is the full global price; gate a transfer on the difference between the two levels ([regional pricing](https://create.roblox.com/docs/production/monetization/regional-pricing#protect-your-trades-and-gifts)).
- Never trust a client claim of ownership: verify server-side, cache the result, invalidate on purchase-finished events.
- Prompt purchases from the client (`PromptProductPurchase` etc. work there), but *effects* only ever originate from server-side verification.

## Policy compliance (PolicyService)

Some features are legal for one player and prohibited for another (region, age). On join, `pcall` `PolicyService:GetPolicyInfoForPlayerAsync(player)` once, cache it per session, and gate features with it. On API failure, **fail closed**: treat the player as most-restricted.

| Field | Gates |
|---|---|
| `ArePaidRandomItemsRestricted` | When `true`, the player cannot interact with any paid random item generator. Apply one of the treatments in [Paid random items](#paid-random-items) |
| `AllowedExternalLinkReferences` | Nothing. It returns an empty list, because off-platform links inside an experience are banned for every player. Never build UI on it ([External links](#external-links-and-off-platform-references)) |
| `AreAdsAllowed` | Ad content of any kind ([Ads in experiences](#ads-in-experiences)) |
| `IsPaidItemTradingAllowed` | When `false`, the player must not be able to trade paid random outcomes or any other paid item |
| `IsSubjectToChinaPolicies` | Additional China-specific compliance requirements |

The list of restricted regions and ages is kept by Roblox behind this API and changes without a release. Never hardcode a country list; gate on the field.

Genre note: gacha/lootbox-heavy designs (simulators, pet games, RPGs) must build the `ArePaidRandomItemsRestricted` branch from day one, because retrofitting it after monetization ships is far more expensive.

## Paid random items

**In scope:** any random outcome bought with Robux directly or indirectly: through purchased currency, keys, re-roll tokens, spin tickets, or a paid pack that bundles a random item. Roblox names four kinds ([paid random items](https://create.roblox.com/docs/production/monetization/paid-random-items)):

| Kind | Examples |
|---|---|
| Capsule | Egg hatching, prize wheels, loot chests |
| Enhancement | Random duration or random success chance on an upgrade |
| Combination | Fusing or crafting items for a chance at a better result |
| Probability modifier | Luck boosts, pity counters, rate-up scrolls |

Random rewards earned through play, with no Robux or purchased currency spent, are outside the disclosure rule.

**Rules:**

- Before the purchase, show every possible outcome with its numerical odds as a percentage. The percentages sum to exactly 100%. A long list may open in a pop-up, but the control that opens it carries a word: a bare (i) icon is not enough.
- Disclose before purchased currency is spent too, not only at the Robux prompt.
- While a probability modifier is active, the odds on screen are the boosted odds, and the modifier states its effect as a number.
- An outcome a player can win only once recalculates that player's remaining odds.
- Every outcome gives the player some benefit. No blank result.
- When `ArePaidRandomItemsRestricted` is `true`, choose one: an earnable free path, a fixed and disclosed order, a direct sale of a specific outcome at its expected value, hiding or removing the item, blocking the purchase with a message, or keeping the player out of that area.
- When `IsPaidItemTradingAllowed` is `false`, that player cannot trade paid random outcomes or other paid items.
- Promotional text such as "rare drop" agrees with the disclosed odds.

**Build it so the odds cannot drift.** Keep one odds table per generator, read by both the roll on the server and the disclosure UI, and check at startup that each table sums to 100%. Two copies of the odds, one for the roll and one for the label, is how a game ends up disclosing numbers it does not use.

## Ads in experiences

- **Gate on `AreAdsAllowed`.** A player for whom it is `false` sees no ad unit and no ad offer.
- **Rewarded video.** The reward is a developer product, never Robux and never a random item. `AdService:GetAdAvailabilityNowAsync` says whether an ad can show, `CreateAdRewardFromDevProductId` builds the reward, and `ShowRewardedVideoAdAsync` plays it; the grant arrives through `ProcessReceipt`, so the receipt rules above apply in full. Read the `AdService` reference for which side calls each one before writing the flow.
- Roblox publishes placement guidance and genre playbooks (obby, simulator, tycoon, RPG, shooter, survival, sports) for where a rewarded offer fits ([rewarded video optimization](https://create.roblox.com/docs/production/promotion/rewarded-video-optimization)).
- Check availability when the offer is about to show, not on join. The offer names its reward, the player opts in with one clear action, and the grant follows at once. An ad never gates progress or covers the screen, and the reward is small enough not to inflate the economy.
- **Players under 13 get no rewarded format,** and no mechanic may reward an under-13 player for engaging with an ad. Never show the offer where availability says no.
- **Immersive ads.** Portals use the `BasePortal` package unmodified apart from scale, position, and rotation. Ineligible players see a fallback image, which the platform provides.
- **Paid brand content** inside an experience is an advertising integration: it is registered with Roblox before it goes live and carries the standard ad label set in Studio. The registration steps belong to launch planning, not code.

## External links and off-platform references

- **No URL, social handle, or invite appears anywhere in the experience:** UI text, signs, billboards, system chat messages, or localized strings. This holds for every player, whatever their age.
- The one allowed form points to the experience's own page, for example "Check out our social media links on our game's page." Those links are set in Creator Hub and only age-checked users 16 and older can see them ([social media links](https://create.roblox.com/docs/production/promotion/social-media-links)).
- `PolicyService` `AllowedExternalLinkReferences` returns an empty list. Code that waits for it to allow a platform shows nothing, and code that shows a link anyway breaks the rule.
- A reward for joining an off-platform server points at a service the game may not name, so do not build one.
