# Cases: Monetization

Blueprints for anything involving Robux. Money bugs are the most expensive kind: a lost grant costs a refund and a review, a double grant costs the economy.

**Preflight:** identify the case → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → check for a data library overlay ([community-libraries.md](../community-libraries.md)) → decide how you will verify it ([verification.md](../verification.md)).

## Developer Product purchase (ProcessReceipt)

**Recognize:** "buy coins", "consumable", "revive", "developer product", "ProcessReceipt"
**Dominant risk:** double-granting or losing a paid item.
**Server/client:** the client may prompt the purchase; only the server grants anything.
**Assembly:**
1. Register **exactly one** `ProcessReceipt` callback game-wide, in one server script.
2. On receipt: look up the `PurchaseId` in the player's durably stored history. Already present means already granted, so return `PurchaseGranted` immediately.
3. Otherwise apply the grant, record the `PurchaseId` in the same data profile, and **persist it**.
4. Only after the write is durable, return `PurchaseGranted`.
5. Return `NotProcessedYet` when the player left, their data is not loaded, or the grant or save failed. Roblox retries; that is the mechanism, not an error.
6. Wrap the whole handler body in `pcall` so a thrown error cannot silently drop the receipt.
**Never:** return `PurchaseGranted` before the grant is saved · grant from the client · assume the player is online during a retry.
**Failure modes:** a server crash between granting and saving. Ordering the grant, the save, and the acknowledgement in that exact sequence is what makes the retry safe.
**Where the history lives:** inside the player's own profile, as a capped list of handled `PurchaseId`s saved in the same write as the grant. One object, one write, one consistent state — a separate "purchases" store can succeed while the grant fails. **Session locking is what removes the cross-server race**: it guarantees no other server read or wrote the profile between this server's load and save ([patterns/data.md](../patterns/data.md#data-persistence)).
**Reading back after a failure:** if a save fails and the handler needs to know whether the grant actually landed before returning `NotProcessedYet`, take that read with `DataStoreGetOptions.UseCache = false`. The default four-second cache will otherwise answer from exactly the state you are trying to check.
**Verify:** grant a product, then force a shutdown before the autosave; rejoin and confirm exactly one grant exists.
**Deeper:** [monetization-policy.md](../monetization-policy.md#processreceipt-developer-products--correctness-rules)

## Pass and subscription gating

**Recognize:** "VIP", "game pass", "double coins", "subscription", "premium perk"
**Dominant risk:** trusting a client claim of ownership, and stale entitlement after a mid-session purchase.
**Server/client:** ownership is verified server-side and cached per session; the client may render a locked state but never enforces it.
**Assembly:**
1. Check ownership server-side on join (`UserOwnsGamePassAsync` or the subscription status API), wrapped in `pcall`.
2. Cache the result for the session so the check is not repeated per use.
3. Invalidate and re-check on `PromptGamePassPurchaseFinished` and on subscription status change, so a mid-session purchase takes effect immediately.
4. Gate the **effect** server-side at the point of use, not only in the UI.
5. Handle lapse for subscriptions: entitlement can end mid-session.
**Never:** accept a client-sent "I own this" · gate only in the UI · re-query the API on every perk use.
**Failure modes:** an API failure on join silently treated as "does not own", stripping a paying player's perks. Distinguish "confirmed not owned" from "check failed"; on failure retry rather than downgrading.
**Verify:** buy the pass mid-session and confirm the perk applies without a rejoin.
**Deeper:** [monetization-policy.md](../monetization-policy.md#choosing-the-product-type)

## Randomized rewards (gacha, loot boxes, crates)

**Recognize:** "crate", "loot box", "spin", "random reward", "drop rate", "banner"
**Dominant risk:** policy compliance, then odds integrity. Getting this wrong is a platform problem, not just a bug.
**Server/client:** the roll happens on the server. The client plays an animation of a result it has already been told.
**Assembly:**
1. **Gate on policy first.** Call `PolicyService:GetPolicyInfoForPlayerAsync` once per session, cache it, and hide or disable paid random items when `ArePaidRandomItemsRestricted` is true. On API failure, **fail closed** and treat the player as most restricted.
2. Keep loot tables **server-side only**; a table in ReplicatedStorage is readable by every exploiter.
3. Roll server-side, grant, and persist before telling the client what it won.
4. Disclose odds wherever the offer is presented.
5. Rate-limit rolls per player like any other remote action.
**Never:** roll on the client · replicate the loot table · retrofit the policy branch after monetization ships · let the animation determine the outcome.
**Failure modes:** the client learning the result early and disconnecting to reroll. Persist the outcome before the reveal, so a disconnect cannot undo it.
**Verify:** disconnect mid-animation and confirm the reward is already committed on rejoin.
**Deeper:** [monetization-policy.md](../monetization-policy.md#policy-compliance-policyservice) · [genres.md](../genres.md#simulator--tycoon--idle)
