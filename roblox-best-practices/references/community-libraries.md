# Community Libraries — Adapting the Skill's Rules

When a project uses a community library that owns a concern, **the library's idioms win over this skill's built-in pattern for that concern**. The Non-Negotiable Runtime Rules (validation, cleanup, no deprecated APIs, data safety) always hold — they are just expressed *through* the library instead of raw APIs.

For an unknown/in-house library: read 2–3 existing usages in the codebase before writing against it; never guess its API.

**Scope note.** This file covers **Luau libraries the project runs**. Agent-side tooling that shapes how the agent writes code, such as the optional Ponytail overlay, is not a project dependency and is handled in [minimal-code.md](minimal-code.md#ponytail-optional-agent-side-overlay). Do not add it to the community-library check or expect it in a `wally.toml`.

## Data: ProfileStore / ProfileService

Replaces the raw DataStore patterns in [patterns.md](patterns.md) (`UpdateAsync`, manual retry, session locking) — the library handles all of that.

Skill rules become:
- Start the session in `PlayerAdded` (`ProfileStore:StartSessionAsync` / `ProfileService:LoadProfileAsync`); end it in `PlayerRemoving` (`Profile:EndSession()` / `:Release()`).
- Handle load failure (returns `nil`) — kick the player politely; never let them play unsaved.
- Check `Profile:IsActive()` before writes; hook `OnSessionEnd`/`ListenToRelease` for cleanup.
- Mutate `Profile.Data` directly as the session cache — do **not** build a second cache layer on top, and do **not** call DataStore APIs directly alongside it.
- `Profile:Reconcile()` on load replaces manual default-filling; still version your schema for migrations.
- `BindToClose` flushing is handled by the library — don't duplicate it.
- **What the library does not take over:** the request budget is still the experience's, the four-second `GetAsync` cache still applies to any raw read you take alongside it, and the **right-to-be-forgotten obligation is still yours** — the profile key still has to contain the `UserId` a deletion template can match ([patterns/data.md](patterns/data.md#deleting-data-on-request-rtbf)).

## Networking: Packet / ByteNet / Zap / BridgeNet

**Maintenance status:** BridgeNet is unmaintained. The adaptation below applies to any of these in an existing project; check repository activity before picking one for new work.

Replaces raw RemoteEvent/RemoteFunction hygiene in [patterns.md](patterns.md): batching, buffer serialization, and remote creation are the library's job.

Skill rules become:
- Define packets/messages in one shared module (typed definitions are the point — use them fully).
- **Server-side validation is still mandatory.** Type-safe deserialization ≠ trusted input: still check range, ownership, rate, and game-state in every server handler.
- Use the library's unreliable variant for loss-tolerant high-frequency data, mirroring the `UnreliableRemoteEvent` rule.
- Don't mix raw remotes and the library in the same feature; pick one transport per project.
- **These libraries serialize for you**, so the raw-remote marshalling rules ([patterns/network.md](patterns/network.md#what-survives-a-remote-call)) describe what the *engine* does, not what the library does. Read its own documentation for which types it packs; do not assume either that it fixes the mixed-table problem or that it inherits it.

## Cleanup: Trove / Maid / Janitor

Replaces the manual cleanup-bag pattern in [patterns.md](patterns.md).

- One instance per lifetime scope (per player, per round, per component); `:Destroy()`/`:Clean()` it in the scope's teardown.
- Add *everything* the scope creates (connections, instances, other troves) at creation time — an untracked connection is still a leak.
- Declare the trove in `-- | State Management | --`.

## Events/Async: GoodSignal (Signal libs), Promise

- Custom signals: declare in State Management (module-level) or create per-object; fire/connect follows the same cleanup rules as RBXScriptConnections (add to the trove/bag).
- Promise: use for chaining yielding operations; still wrap external calls in the promise equivalent of `pcall` (`Promise.try`/`:catch`). Never leave a rejection unhandled.
- These don't change the section layout — they're just values in it.

## Frameworks: Knit / Flamework

**Maintenance status:** Knit is **archived** — its author states it will receive no further updates. Existing projects keep working and the adaptation below still applies, but never recommend Knit for a *new* project; prefer plain modules with a bootstrap script, or Flamework on roblox-ts.

The section layout applies *inside* each Service/Controller file:

- VARIABLES: services, requires, the `local MyService = Knit.CreateService{...}` declaration (its `Client = {}` table counts as structure, not state).
- FUNCTIONS: methods on the service table; `-- | Private | --` for local functions, `-- | Public | --` for `MyService:Method()` and `MyService.Client:Method()`.
- INITIALIZATION: `KnitInit`/`KnitStart` (or `onInit`/`onStart`) bodies are the initialization — wire connections there, not at require time. The bootstrap script's `Knit.Start()` is the project's single entry point.
- Knit's Client remotes replace raw remote creation, but server handlers still validate every argument.

**Pronghorn** (Iron Stag Games, LGPL-2.1) is a lighter alternative in the same slot — "no Controllers or Services, just Modules and Remotes". Treat it the way this file treats any framework: it owns module discovery and remote creation, the section layout still applies inside each module, and server handlers still validate every argument themselves.

## UI: Fusion / React-lua / Roact

**Maintenance status:** Roact is deprecated upstream in favor of React-lua; treat a Roact codebase as legacy — adapt it, don't extend it.

Declarative UI component bodies have their own internal structure (state → derived values → render tree) — **do not force section headers inside a component function**. The section layout applies to the *file*: VARIABLES (requires, tokens/constants), FUNCTIONS (the component(s) + helpers, each with a doc comment), INITIALIZATION (mount/`New`-tree creation, story export).

- Fusion: scope/`doCleanup` handles cleanup — treat the scope like a trove.
- React-lua: effects clean up in their return function; never connect RBXScriptSignals outside `useEffect`.

## Precedence summary

| Concern | If library present | Skill fallback |
|---|---|---|
| Player data | ProfileStore/ProfileService lifecycle | patterns.md Data Persistence |
| Client-server transport | Packet/ByteNet/Zap definitions | patterns.md Remote Communication |
| Cleanup | Trove/Maid/Janitor | patterns.md Lifecycle & Cleanup bag |
| Service architecture | Knit/Flamework lifecycle | Plain modules + bootstrap Init |
| UI construction | Fusion/React idioms inside components | Instance-based UI + section layout |
| Validation, rate limiting, security | **Never delegated — always yours** | — |
