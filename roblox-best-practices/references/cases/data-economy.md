# Cases: Data & Economy

Blueprints for persistence and the systems built directly on top of it. Each recipe gives recognition cues, assembly order, and the failure modes specific to that case. It does **not** restate the general rules — follow the cross-references for those.

**Preflight for every case here:** identify the case → check ceilings in [limits-budgets.md](../limits-budgets.md) → fix the server/client split → decide whether a community library owns the concern ([community-libraries.md](../community-libraries.md)) → decide how you will verify it ([verification.md](../verification.md)).

## Player data persistence

**Recognize:** "save progress", "player data", "profile", "leaderstats", "why did my data reset"
**Dominant risk:** data loss and duplication. This is the highest-consequence system in most experiences.
**Server/client:** the server owns every write; the client only displays.
**Assembly:**
1. Load once into a session cache on `PlayerAdded`, wrapped in `pcall` with exponential backoff; handle the already-joined players too.
2. All gameplay reads and writes hit the **cache**, never the DataStore.
3. Save on `PlayerRemoving`, on a periodic autosave, in `BindToClose`, and on `game.ServerRestartScheduled`.
4. Keep the value JSON-serializable **at write time**, not by sanitizing at save time.
5. Version the store name and migrate on load.
**Never:** read a DataStore during gameplay · accept a client-reported balance or progress value · return success before the write is durable.
**Failure modes:** a failed load silently falling through to defaults, which then overwrites real data on save. Guard it: if the load failed, mark the session unsaveable and tell the player, rather than saving defaults over their history — the fail-loud class in [patterns/data.md](../patterns/data.md#failure-policy-what-happens-after-the-last-retry).
**Budget:** 4 MB per key, 50-character keys, shared in-game/Open Cloud request budget ([limits-budgets.md](../limits-budgets.md#data-stores)).
**Verify:** rejoin after a change, then force a shutdown mid-session; assert values survive both. When checking whether a failed write landed, read with `DataStoreGetOptions.UseCache = false` — the default four-second cache will happily confirm the value you just failed to save.
**Also design for deletion:** key player data by `UserId` so a right-to-be-forgotten template can match it ([patterns/data.md](../patterns/data.md#deleting-data-on-request-rtbf)).
**Deeper:** [patterns/data.md](../patterns/data.md#data-persistence) · ProfileStore/ProfileService overlay: [community-libraries.md](../community-libraries.md#data-profilestore--profileservice)

## Currency and transactions

**Recognize:** "coins", "gems", "buy", "sell", "reward", "economy"
**Dominant risk:** duplication and negative balances.
**Server/client:** every balance change is computed server-side from server state; the client sends intent only.
**Assembly:**
1. Represent a transaction as one server-side function that validates, applies, and records — never as separate "deduct" and "grant" calls that can interleave.
2. Check affordability and apply the debit in the same non-yielding step; if a yield is unavoidable, re-validate the balance after it ([SKILL.md](../../SKILL.md#non-negotiable-runtime-rules) rule 7).
3. Clamp and type-check every amount; reject non-integers and negatives outright.
4. Mirror to `leaderstats` or attributes for display **after** the authoritative change, never as the source of truth.
**Never:** let the client compute a price, a discount, or a total · store balance only in `leaderstats` · grant before the debit is confirmed.
**Failure modes:** two remotes arriving in the same frame both passing an affordability check before either deducts. Serialize per-player economy operations ([patterns/data.md](../patterns/data.md#serialized-operations-per-owner-locks)), or re-check inside the applying step.
**Verify:** fire the purchase remote twice in the same frame and assert the balance cannot go negative.
**Deeper:** [security.md](../security.md#server-side-validation-layers) · [patterns/network.md](../patterns/network.md#remote-communication)

## Inventory and items

**Recognize:** "inventory", "backpack", "items", "equip", "stack"
**Dominant risk:** state complexity and payload growth.
**Server/client:** server holds the authoritative inventory; the client receives a view.
**Assembly:**
1. Store items as **ids plus instance metadata** referencing a static catalog module; never store full item definitions per player.
2. Define the item and inventory shapes in a shared types module so server and client agree.
3. Enforce capacity and stack limits server-side on every mutation.
4. Replicate changes as **deltas** (added/removed/changed entries), not the whole inventory.
5. Equip/unequip is an intent the server validates against ownership before applying.
**Never:** trust a client-sent item id without an ownership check · send the entire inventory every change · let item definitions drift between a client copy and the server catalog.
**Failure modes:** unbounded growth pushing the player payload toward the 4 MB key ceiling. Cap counts, prune expired entries, and measure the serialized size of a maxed-out inventory during design.
**Verify:** fill an inventory to its cap, save, rejoin, and assert the payload round-trips intact.
**Deeper:** [genres.md](../genres.md#rpg--adventure--open-world) · [limits-budgets.md](../limits-budgets.md#data-stores)

## Player-to-player trading

**Recognize:** "trade", "gift", "swap items", "trade window"
**Dominant risk:** duplication. Trading is the single most exploited system in Roblox economies; treat every step as hostile.
**Server/client:** the entire trade state machine lives on the server. The client UI only reflects server state and sends intents.
**Assembly:**
1. Model an explicit server-side state machine: offer → both parties lock → both parties confirm → atomic swap → recorded.
2. **Re-validate ownership of every item at the moment of the swap**, not when it was offered. Anything can change in between.
3. Any change to either side's offer resets both confirmations.
4. Perform the swap as one server-side step with no yields inside it; if a yield is unavoidable, re-validate both inventories after resuming.
5. Persist both sides before releasing the trade lock, and log the trade with both user ids and the item ids.
**Never:** trust client-reported item ids or quantities · allow a trade to proceed while either player is leaving, teleporting, or has unloaded data · run a trade across servers.
**Failure modes:** a player disconnecting mid-swap so one side persists and the other does not. Guard with a per-player trade lock ([patterns/data.md](../patterns/data.md#serialized-operations-per-owner-locks)), cancel on `PlayerRemoving`, and make the swap-and-save sequence the last step.
**Verify:** run a trade where one client leaves immediately after confirming; assert no item is created or destroyed.
**Deeper:** [security.md](../security.md) · [false-positives.md](../false-positives.md#security--validation--what-is-not-a-trust-boundary)
