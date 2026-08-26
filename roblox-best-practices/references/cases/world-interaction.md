# Cases: World & Interaction

Blueprints for things players touch, build, and bring along. All three are streaming-sensitive: assume any workspace instance may not exist on a given client ([patterns/network.md](../patterns/network.md#streaming-streamingenabled)).

**Preflight:** identify the case → check ceilings ([limits-budgets.md](../limits-budgets.md)) → fix the server/client split → decide how you will verify it ([verification.md](../verification.md)).

## Interactable objects and prompts

**Recognize:** "press E", "interact", "door", "button", "pickup", "ProximityPrompt", "kill brick"
**Dominant risk:** a script per object, and polling for proximity.
**Server/client:** the prompt is client-side UX; the effect is server-validated.
**Assembly:**
1. Bind behavior by **CollectionService tag**, not by hierarchy or name parsing. One handler script serves every tagged instance.
2. Handle both existing instances (`GetTagged`) and future ones (`GetInstanceAddedSignal`), and clean up on `GetInstanceRemovedSignal` — mandatory under streaming.
3. Per-instance tuning through **attributes** (cooldown, damage, prompt text), not config child values.
4. Use `ProximityPrompt` for hold-to-interact rather than a distance loop; if you must check distance, do it on a throttled loop, not per frame.
5. On the server, re-verify distance and state when the interaction fires. **An exploiter fires a `ProximityPrompt`, `ClickDetector`, or `DragDetector` from any distance, ignoring `Enabled` and `MaxActivationDistance`** — those properties shape the honest player's experience, never the security boundary ([security.md](../security.md#threat-model-assume-all-of-these-exist)).
6. Handle prompts centrally through `ProximityPromptService` rather than a script per prompt, which is also where their appearance is customized once ([ui-crossplatform.md](../ui-crossplatform.md#interaction-objects)).
7. Debounce `Touched` handlers with a table keyed by character plus a cooldown.
**Never:** a script parented to every door · a `while task.wait()` proximity scan · trust that a prompt firing means the player was actually in range.
**Failure modes:** per-instance state accumulating for objects that streamed out. The removed-signal cleanup is what prevents the leak.
**Verify:** stream the area out and back in, and confirm behavior rebinds exactly once with no duplicate connections.
**Deeper:** [patterns/world.md](../patterns/world.md#behavior-binding-works-with-any-framework)

## Placement and building (plots, tycoons)

**Recognize:** "place a block", "build mode", "tycoon plot", "furniture", "base building", "grid snap"
**Dominant risk:** client-authoritative placement, and unbounded instance growth.
**Server/client:** the client renders a **cosmetic preview**; the server validates and creates the real object.
**Assembly:**
1. Client sends a placement intent (item id, position, rotation). The preview is never the object. A `DragDetector` makes the preview feel right across every input device, but **`RunLocally = true` replicates nothing**, so its resulting position is a client claim that comes back through the same validated remote as any other ([ui-crossplatform.md](../ui-crossplatform.md#interaction-objects)).
2. Server validates in order: ownership of the item → plot ownership → position within plot bounds → grid/rotation legality → collision with existing objects → per-plot object cap → cost.
3. Server creates the instance and records it in the plot's data model. The instance is a *view* of that data, not the source of truth.
4. Persist the plot as a compact list of `{itemId, relative position, rotation}` — **relative to the plot origin** so a plot can be rebuilt anywhere.
5. Rebuild the plot from data on load; destroy and unregister on unload.
6. Enforce a hard object cap per plot, chosen against the 4 MB key ceiling for the serialized layout.
**Never:** trust a client-sent world position without bounds and collision checks · store absolute world coordinates · let placement create instances without a cap.
**Failure modes:** a saved layout that no longer fits the 4 MB key once players max out their plot. Compute the worst-case serialized size during design, not after launch.
**Verify:** fill a plot to its cap, save, rejoin, and assert the layout rebuilds identically.
**Deeper:** [genres.md](../genres.md#simulator--tycoon--idle) · [limits-budgets.md](../limits-budgets.md#data-stores)

## Pets, followers, and companions

**Recognize:** "pet", "follower", "companion", "minion", "trail of pets"
**Dominant risk:** per-entity update cost. In simulators this is usually the single largest client and server cost.
**Server/client:** the server owns ownership and stats; movement is best rendered client-side.
**Assembly:**
1. **One** update system iterates all pets for all players, staggered across frames. Never a script or loop per pet.
2. Render followers **client-side** from replicated state (owner, pet id, slot index) rather than replicating per-frame CFrames from the server.
3. Pool pet models; equipping and unequipping should reuse instances, not churn `Instance.new` and `Destroy`.
4. Cap simultaneously equipped pets, and cap rendered pets separately for low-end devices.
5. Keep pet stats and ownership in player data as ids referencing a catalog module ([data-economy.md](data-economy.md#inventory-and-items)).
6. Anchor or use lightweight movement; unanchored physics per pet multiplies physics cost.
**Never:** a `Heartbeat` connection per pet · server-driven per-frame pet positions · unanchored physics pets at high counts.
**Failure modes:** frame time collapsing once a whale equips the maximum pets in a crowded server. Test at maximum pets times maximum players, not with one tester.
**Verify:** measure client frame time with a full server at the pet cap; check the Animation and Physics categories in the CPU breakdown.
**Deeper:** [performance.md](../performance.md#cpu) · [genres.md](../genres.md#simulator--tycoon--idle)
