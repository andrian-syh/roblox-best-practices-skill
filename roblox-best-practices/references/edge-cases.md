# Edge Cases — The Robustness Pass

A catalog of the states Roblox code actually meets in production, grouped by what triggers them. Run it against a function before considering it finished.

**This is an authoring aid, not a review checklist.** When reviewing someone else's code, a missing guard is a finding only if it clears the four-step confidence gate with a concrete failure scenario ([false-positives.md](false-positives.md#confidence-gate-all-four-must-pass-before-reporting)). Walking this list is not licence to report hypotheticals.

**Handling these is not optional padding.** Terse code and complete code are the same goal ([minimal-code.md](minimal-code.md#1-minimalism-never-reduces-what-gets-delivered)); a guard that prevents a real failure is never the thing to cut for brevity.

## Contents

- [Player lifetime](#player-lifetime)
- [Character lifetime](#character-lifetime)
- [Instance lifetime](#instance-lifetime)
- [Pooled and reused objects](#pooled-and-reused-objects)
- [Numbers](#numbers)
- [Collections](#collections)
- [Timing and ordering](#timing-and-ordering)
- [Network and client input](#network-and-client-input)
- [Data and schema](#data-and-schema)
- [Cloud calls](#cloud-calls)
- [UI](#ui)
- [The finishing pass](#the-finishing-pass)

## Player lifetime

| State | What breaks | Guard |
|---|---|---|
| Player joined **before** your script ran | `PlayerAdded` never fires for them; they get no setup at all | Iterate `Players:GetPlayers()` at startup as well as connecting the event |
| Player leaves **mid-operation** | Writes to a departed player's data; `player.Parent` is nil | Re-check liveness after any yield (Non-Negotiable #7); clear per-player state in `PlayerRemoving` |
| Data not loaded yet | Gameplay reads defaults and later overwrites the real save | Gate gameplay on a loaded flag; never let an unloaded session write |
| Load failed | Defaults get saved over real progress, destroying it | Mark the session unsaveable and tell the player, rather than saving defaults |
| Player rejoins the same server | Stale per-player entries from the previous session still present | Clear on `PlayerRemoving`, and treat setup as idempotent |
| Last player leaves, server shuts down | Final save races the shutdown | `BindToClose` and `game.ServerRestartScheduled` flush ([patterns/data.md](patterns/data.md#data-persistence)) |

## Character lifetime

Characters respawn; players persist. Confusing the two lifetimes is a standing source of leaks and ghost state ([patterns/lifecycle.md](patterns/lifecycle.md#character-lifecycle)).

| State | What breaks | Guard |
|---|---|---|
| Character not spawned yet | `player.Character` is nil at the moment you read it | Handle the existing character **and** connect `CharacterAdded` |
| Not parented to Workspace yet | `CharacterAdded` fires **before** the character is parented and before it is moved to the spawn point, so position reads and workspace queries are premature | Do position or workspace work after parenting, not in the handler's first lines |
| Accessories and clothing missing | The `Humanoid` and body parts exist at `CharacterAdded`, but appearance items take seconds to arrive, so accessory counts and appearance edits silently see nothing | `Player.CharacterAppearanceLoaded` (server only) when appearance matters |
| Descendants not arrived on the client | Replication order is not guaranteed, so indexing `character.Humanoid` errors | `WaitForChild` for `Humanoid` and `HumanoidRootPart` in client code |
| Character dies mid-action | Effects apply to a corpse; state never clears | Check `Humanoid.Health` after yields; clear per-life state on `Died` |
| Respawn during a yield | Work resumes against the **old** character model | Capture the character before the yield and compare identity after |
| R6 versus R15 | Part names and joint structure differ | Do not hard-code rig parts unless the project fixes the rig |
| `Humanoid` absent entirely | Custom or CCL-driven characters may not have one | Check for it; do not assume ([patterns/lifecycle.md](patterns/lifecycle.md#humanoid-vs-the-character-controller-library)) |

## Instance lifetime

| State | What breaks | Guard |
|---|---|---|
| Destroyed mid-operation | Property access on a destroyed instance errors | Re-check after yields; prefer connections that die with the instance |
| Streamed out on the client | The instance never existed there, or vanished mid-session | Tag signals with a removal path; `WaitForChild` with a timeout for workspace descendants ([patterns/network.md](patterns/network.md#streaming-streamingenabled)) |
| Not yet replicated | Client code runs before the server's instance arrives | Wait on the container, or drive from a replicated attribute instead |
| Parent set to nil rather than destroyed | The instance is invisible but alive, and its connections still fire | `Destroy()` what you mean to discard |
| `Destroying` fires after the fact | Reading the instance inside the handler yields nothing useful | Capture what you need **before** it dies ([luau-language.md](luau-language.md#deferred-engine-events)) |

## Pooled and reused objects

Reuse trades allocation cost for state that outlives one use. Every entry here is a bug that only exists because the object was not freshly created ([patterns/lifecycle.md](patterns/lifecycle.md#object-pooling)).

| State | What breaks | Guard |
|---|---|---|
| Returned to the pool twice | The pool holds two entries for one object and hands it to two owners, who then fight over it | Mark the object as parked on return (an attribute or a set) and ignore a second return |
| Used after being returned | Writes land on an object someone else now owns, or on one already reset | Drop the reference at the return call site; never keep a pooled object in long-lived state |
| Not every mutated property reset | The next use inherits the last one: stale velocity, invisibility, disabled collision | Reset on **return**, not on take, so a leaked object cannot enter the pool dirty |
| Per-use connections never disconnected | Handlers accumulate one per cycle and all of them fire on the next use | One cleanup object per checkout, emptied on return |
| Attributes and tags left set | Tag-bound behavior re-triggers, or an owner attribute names a player who left | Clear both on return, exactly like properties |
| `Destroy()` called on a parked object | The pool later hands out a destroyed instance and every property access errors | Objects leave the pool before they are destroyed, never while in it |
| Pool grows to the worst spike and stays there | Memory never comes back after the burst that caused it | Cap the pool and destroy the overflow |
| Pool drained under load | `table.remove` returns nil and the take path silently returns nothing | Create on empty rather than assuming the pool has stock |

## Numbers

| State | What breaks | Guard |
|---|---|---|
| Zero, tested with `if value then` | **`0` is truthy in Luau**, so the guard passes and the "missing value" branch never runs | Compare explicitly: `if count > 0 then`, `if value ~= nil then` ([luau-language.md](luau-language.md#values-truth-and-coercion)) |
| Zero | Division by zero yields `inf`, which then poisons everything downstream | Guard the divisor, not the result |
| Negative where positive was assumed | Damage heals, currency is minted, sizes invert | Clamp or reject at the boundary |
| `NaN` | Every comparison is false, so range checks silently pass | `math.isnan`; reject before it enters state |
| Infinity | Propagates into positions and CFrames, corrupting the physics state | `math.isfinite` on anything derived from client input or division |
| Beyond 2^53 | Integer precision is lost; counters stop incrementing correctly | Big-number representation for idle and simulator economies ([genres.md](genres.md#simulator--tycoon--idle)) |
| `NaN` or `inf` in a save | The DataStore rejects anything it cannot serialize, so the write **itself** fails and nothing saves. The error is generic and does not name the offending field | Keep values valid at write time, not at save time; log the failure so it is never silent ([patterns/data.md](patterns/data.md#data-persistence)) |

## Collections

| State | What breaks | Guard |
|---|---|---|
| Empty | `#t == 0` paths: averages divide by zero, `table.remove` returns nil | Handle empty explicitly; it is the common case at startup |
| Single element | Logic that assumes a pair, a next, or a previous | Check before indexing neighbours |
| Mutated during iteration | Skipped entries or undefined behavior | Collect first, mutate after; or iterate a copy |
| Empty string, tested with `if text then` | **`""` is truthy**, so an empty name or message passes validation and reaches display or storage | `if text ~= "" then`, after the type check |
| Sparse or mixed keys | Length is undefined; DataStore encoding fails outright, **and a remote mangles the table in transit** | Keep arrays contiguous and dictionaries all-string ([patterns/network.md](patterns/network.md#what-survives-a-remote-call)) |
| Grows without bound | Memory climbs until the server degrades | Cap it, and decide what gets evicted |

## Timing and ordering

| State | What breaks | Guard |
|---|---|---|
| Two events in the same frame | Both pass an affordability or availability check before either commits | Apply the check and the commit in one non-yielding step |
| Deferred signal ordering | Side effects are not visible on the line after the change that caused them | Never assume synchronous handlers ([luau-language.md](luau-language.md#deferred-engine-events)) |
| Connection made after the fire | The handler misses the event entirely | Connect before causing the event |
| Re-entrant fire chains | Depth-limited, then dropped silently | Restructure as a queue |
| A yield splits check from use | Everything validated before the yield may now be false | Non-Negotiable #7 |
| Pending `task.delay` after teardown | Fires against a destroyed owner | Keep the handle and `task.cancel` it |
| Shutdown mid-flow | Partial work persists, or nothing does | Make the persist step the last step |

## Network and client input

| State | What breaks | Guard |
|---|---|---|
| Remote fires before the receiver is ready | The event is lost with no error | Create remotes in one place at startup; have clients `WaitForChild` |
| Duplicate delivery | Double grants, double spends | Idempotency by request id; `ProcessReceipt` already requires this ([monetization-policy.md](monetization-policy.md#processreceipt-developer-products--correctness-rules)) |
| Arguments of any type, at any rate | Type errors, or the handler acting on garbage | Validate type, range, ownership, rate ([patterns/network.md](patterns/network.md#remote-communication)) |
| Flooding | The handler starves the server | One shared rate limiter ([cases/client-infra.md](cases/client-infra.md#rate-limiting-and-the-anti-cheat-layer)) |
| A table sent through a remote arrives changed | Functions become `nil`, metatables are stripped so an OOP object arrives as plain data, non-string keys become strings, a `nil` inside truncates it, and instances the receiver cannot see arrive `nil` | Send ids and plain data; rebuild behavior from a shared catalog on the far side ([patterns/network.md](patterns/network.md#what-survives-a-remote-call)) |
| Table identity used as a token across a remote | Every table is **copied**, so the two sides never share identity and an equality check always fails | Pass an explicit id |
| A prompt, `ClickDetector`, or `DragDetector` "proves" the player was there | All of them fire from any distance regardless of `Enabled`, and a `DragDetector` with `RunLocally = true` replicates nothing | Re-verify distance and state server-side at execution time ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| Client-reported position or time | Trivially forged | Treat as a hint; validate outcomes server-side |
| Teleport data | Travels through the client and is tamperable | Re-validate on arrival, or pass a server-generated token |

## Data and schema

| State | What breaks | Guard |
|---|---|---|
| First-time player | Every field is nil; the code assumed a shape | Fill defaults on load, or reconcile against a schema |
| Old schema version | Missing or renamed fields read as nil mid-gameplay | Version the store name and migrate on load |
| Partial write | Half-applied state that is internally inconsistent | Persist in one call; do not split a transaction across saves |
| Value exceeded a ceiling | The save fails and the player silently loses progress | Design the payload against the limits ([limits-budgets.md](limits-budgets.md#data-stores)) |
| Concurrent servers on one key | Lost updates from a read-modify-write race | `UpdateAsync`, plus session locking where duplication matters |

## Cloud calls

Every row here is a failure the call itself reports as success, which is what makes them expensive.

| State | What breaks | Guard |
|---|---|---|
| A read taken right after a write | `GetAsync` serves a **four-second cache**, so the verification read can confirm a value that never saved | `DataStoreGetOptions.UseCache = false` for any authoritative read ([patterns/data.md](patterns/data.md#data-persistence)) |
| A yield inside an `UpdateAsync` callback | The transform function **may not yield**; the call errors rather than waiting | Compute from what was passed in; do the yielding work before the call |
| Autosaving several times within one UTC hour | Writes inside the same hour overwrite each other permanently, so version history has nothing to roll back to | Space saves out; treat version history as the backup it is ([limits-budgets.md](limits-budgets.md#data-stores)) |
| One hot key under load | Per-key throughput (25 MB/min read, 4 MB/min write) and per-partition MemoryStore limits throttle while the experience-wide quota still looks healthy | Shard the key space; check `GetRequestBudgetForRequestType()` before assuming headroom |
| A MemoryStore queue item processed slowly | The invisibility timeout expires mid-processing and another server reads the same item | Fit read-process-remove inside the timeout, and make the processing idempotent ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| Data keyed by something other than `UserId` | A right-to-be-forgotten template cannot match it, and the 30-day obligation cannot be met | Key player data by `UserId` from the start ([patterns/data.md](patterns/data.md#deleting-data-on-request-rtbf)) |
| A secret needed during a local playtest | Secrets resolve only in live servers and Team Test, so the code path silently takes its failure branch in Studio | Test that path in Team Test; never fall back to a hardcoded key |
| An Open Cloud job running against the live experience | Both draw from the same request budget, so a batch job starves gameplay | Self-throttle the job, or schedule it off-peak |

## UI

| State | What breaks | Guard |
|---|---|---|
| Character respawns | `ScreenGui.ResetOnSpawn` defaults to **true**, so the HUD is rebuilt and every reference and piece of state inside it is stale | Set it to `false` for persistent UI, or rebuild state on the new instance |
| Code edits `StarterGui` at runtime | That is the template, not the live UI; nothing visible changes | Script the player's `PlayerGui` copy |
| Position set on a child of a layout | `UIListLayout`/`UIGridLayout` own `Position` and `Size`; the assignment is silently discarded | Change `LayoutOrder`, padding, or the layout's properties ([ui-crossplatform.md](ui-crossplatform.md#position-size-and-who-wins)) |
| A `SurfaceGui`/`BillboardGui` button that never responds | Buttons take input only when the GUI is under `PlayerGui` **and** the part has `CanQuery = true` | Check both before debugging the handler |
| Rotated or rounded container expected to clip | `ClipsDescendants` ignores rotation without `StarterGui.ClipsDescendantsSupportsRotation`, and never clips to rounded corners | Use a `CanvasGroup` |
| Localized text loses its formatting | Localization strips rich text tags | Reapply formatting to translated strings |
| Text filtered as the player types | Filtering per keystroke burns the budget and is explicitly warned against | Filter on the server after submission ([ui-crossplatform.md](ui-crossplatform.md#text-input-and-filtering)) |

## The finishing pass

Before calling a function done, ask in order:

1. **What is nil here that I assumed exists?** Player, character, instance, save field.
2. **What happens if this number is zero, negative, or not a number?**
3. **What happens if this collection is empty?**
4. **What is stale after each yield in this function?**
5. **What if this runs twice, or two clients trigger it in the same frame?**
6. **What if the player leaves right now?**
7. **If this reads back something it just wrote, is the read authoritative or cached?**
8. **If this object is reused rather than created, what does it still carry from its last use?**

Eight questions, most answered in seconds. They catch the failures that only appear in a live server with real players, which is precisely where they are most expensive to find.
