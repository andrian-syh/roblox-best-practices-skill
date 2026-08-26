# Monetization and Policy Compliance

Taking money correctly and staying inside platform rules. The validation layers these calls sit behind are in [security.md](security.md); the assembly order for a specific monetization system is in [cases/monetization.md](cases/monetization.md).

## Contents

- [Purchases](#purchases)
  - [ProcessReceipt (Developer Products) — correctness rules](#processreceipt-developer-products--correctness-rules)
  - [Choosing the product type](#choosing-the-product-type)
- [Policy compliance (PolicyService)](#policy-compliance-policyservice)

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
