# False-Positive Guardrails — What NOT to Flag

The anti-false-positive filter for review/refactor mode. This file collects the carve-outs that are otherwise scattered across the skill (the scoped exceptions in the Non-Negotiable Runtime Rules, "trace before flag" in [verification.md](verification.md), the review-mode softening in [SKILL.md](../SKILL.md#reviewrefactor-mode)) and adds the specific cases that most often produce wrong findings.

Read this **before reporting any finding**. A rule in this skill says what good code does; every such rule has a matching set of shapes that *look* like violations but are correct. Reporting those erodes trust faster than missing a real issue.

## Contents

- [Severity taxonomy (use these three words everywhere)](#severity-taxonomy-use-these-three-words-everywhere)
- [Severity calibration: near-miss pairs](#severity-calibration-near-miss-pairs)
- [Confidence gate (all four must pass before reporting)](#confidence-gate-all-four-must-pass-before-reporting)
- [Guardrails by category](#guardrails-by-category)
  - [Performance / hot loops — define "hot" first](#performance--hot-loops--define-hot-first)
  - [Cleanup / leaks — what does NOT leak](#cleanup--leaks--what-does-not-leak)
  - [Security / validation — what is NOT a trust boundary](#security--validation--what-is-not-a-trust-boundary)
  - [Security / validation — a handler can already be complete](#security--validation--a-handler-can-already-be-complete)
  - [Streaming — bare WaitForChild is often correct](#streaming--bare-waitforchild-is-often-correct)
  - [Newer APIs — do not flag what simply postdates your memory](#newer-apis--do-not-flag-what-simply-postdates-your-memory)
  - [Code economy and device scalability — authoring goals, not review standards](#code-economy-and-device-scalability--authoring-goals-not-review-standards)
  - [State ownership, failure policy, and locks — design decisions, not defects](#state-ownership-failure-policy-and-locks--design-decisions-not-defects)
  - [External-editor project shapes are not defects](#external-editor-project-shapes-are-not-defects)
  - [Tutorial-shaped code is not a defect](#tutorial-shaped-code-is-not-a-defect)
  - [MCP tooling — not the code under review](#mcp-tooling--not-the-code-under-review)
  - [Authority mode — establish it before judging movement, input, or camera code](#authority-mode--establish-it-before-judging-movement-input-or-camera-code)
  - [Typing — do not flag the project for tools it does not use](#typing--do-not-flag-the-project-for-tools-it-does-not-use)
  - [Deprecated vs. discouraged — do not conflate them](#deprecated-vs-discouraged--do-not-conflate-them)
  - [Style / layout — propose, never report](#style--layout--propose-never-report)
  - [Documentation Comments — one real finding, the rest Advisory](#documentation-comments--one-real-finding-the-rest-advisory)
- [Regression set — these must pass a review clean](#regression-set--these-must-pass-a-review-clean)
- [Review mode: what happens to a finding once it is real](#review-mode-what-happens-to-a-finding-once-it-is-real)

## Severity taxonomy (use these three words everywhere)

Every finding carries exactly one severity. This is the shared vocabulary for SKILL.md review mode, [verification.md](verification.md), and the Review Checklist.

| Severity | Meaning | What qualifies | Action |
|---|---|---|---|
| **Blocker** | Security hole, data loss, or a guaranteed leak | Unvalidated remote acts on client input; `PlayerAdded` state with no removal path; `SetAsync` overwrite that drops concurrent writes; secret in a client-visible location | Report; fix if asked |
| **Correctness** | A real bug with a concrete failure scenario | Deprecated API that changes behavior; use-after-yield of a departed player; paired writer/reader that genuinely diverge | Report with the inputs → wrong-outcome scenario |
| **Advisory** | Style, layout, or micro-optimization | Section-layout deviation; missing doc comment on a trivial private helper; `FireAllClients` where a targeted list would do; a discouraged-but-functional API | **Propose** as a suggestion; never report as a violation, never silently rewrite |

If a finding cannot be placed above **Advisory**, it is a suggestion the user is free to decline, not a defect. When in doubt about severity, it is Advisory.

### Severity calibration: near-miss pairs

Severity follows the *context*, not the pattern. These pairs decide most mis-severed findings:

| Shape | This context | That context |
|---|---|---|
| Attribute holding player state | Public display state (nameplate, round timer) → not a finding | Private state an exploiter can use (balance, cooldowns, damage multiplier) → **Blocker** |
| `SetAsync` on a key | Hot key with concurrent server writers → **Blocker/Correctness** (lost updates) | Per-player key written from one code path → Advisory at most (prefer `UpdateAsync` going forward) |
| Connection created per spawn/event | Cleared in `CharacterRemoving`/`PlayerRemoving`/a bag → fine | Owner outlives the object with no teardown anywhere → **Blocker** if unbounded per join |
| Deprecated API in touched code | On the path this task modifies → **Correctness**, propose replacement | Untouched legacy far from the change → Advisory mention at most; never refactor unasked |
| Missing validation | Client-reachable remote or teleport data → **Blocker** | Server-to-server bindable or module call → not a finding |
| Loop with `task.wait(N)` | Scheduled periodic work (autosave, AI cadence) → fine | Polling a condition a signal already reports (`while not ready do task.wait() end`) → **Correctness** |
| `GetAsync` after a write | Reading current state in normal flow → fine, the four-second cache is harmless there | Verifying whether a **failed** write landed, or deciding a refund, without `UseCache = false` → **Correctness** (the cache can confirm a value that never saved) |
| `DragDetector` moving a part | `RunLocally = false`, the default, with the server handling the result → fine | `RunLocally = true` with the resulting position trusted and no validating remote → **Blocker** |
| Client-side interaction instance | `ProximityPrompt` firing a cosmetic or idempotent effect → fine | A prompt or `ClickDetector` granting currency, items, or progress with no server-side distance and state re-check → **Blocker** |
| `if value then` on a number or string | Testing for presence where `0` and `""` are both impossible → fine | Guarding a count, a balance, or user text where zero or empty is a real case → **Correctness** ([luau-language.md](luau-language.md#values-truth-and-coercion)) |
| Table sent through a remote | Plain arrays and string-keyed dictionaries → fine | A mixed table, a `nil` inside one, or an object whose metatable the receiver relies on → **Correctness**, it arrives changed |

## Confidence gate (all four must pass before reporting)

The four-step filter lives in [verification.md](verification.md#review-verification-discipline-trace-before-flag); do not duplicate it, apply it:

1. Traced **both sides** of any paired logic and found a divergent outcome.
2. Considered that the odd-looking shape is **intentional** (checked usage sites / header contract).
3. Have a **concrete failure scenario** (inputs/state → wrong result), not "could maybe fail".
4. **Verified the API** against the target environment (see [api-currency.md](api-currency.md)), not from memory.

A finding that fails any step is not reported. Blocker-severity items still pass the gate; severity is *how bad*, the gate is *whether it is real*.

## Guardrails by category

### Performance / hot loops — define "hot" first

Non-Negotiable #3 forbids avoidable per-frame garbage. It only bites on a **hot path**. Classify before flagging:

| Hot (allocation/lookup may be a finding) | Not hot (leave it alone) |
|---|---|
| Body of `RunService.Heartbeat`/`PreRender`/`Stepped`/`PostSimulation` | `Touched`, `OnServerEvent`, `GetPropertyChangedSignal`, attribute/tag signals |
| Per-entity work *inside* one of those callbacks | `PlayerAdded`, `CharacterAdded`, per-round, per-purchase setup |
| A tight `while` loop with no `task.wait` between iterations | A timed loop (`while task.wait(N)`) at autosave/AI cadence |
| A `BindToSimulation` callback | Module-load / `Init()` / bootstrap |

Two conditions must **both** hold to flag: (a) the code is on a hot path, **and** (b) the allocation or lookup can actually be hoisted or reused. If the value genuinely differs every iteration and cannot be reused, it is not a violation. Where reuse is possible, suggest `table.clear` on a hoisted table rather than reporting a leak. A single unavoidable allocation per frame (e.g. one payload table for one batched remote per network tick) is not garbage.

Cold paths are exempt entirely: a `GetChildren()` scan, a table build, or a deep Instance lookup inside `PlayerAdded`, a purchase handler, or round setup runs once per event, not per frame — never flag it.

### Cleanup / leaks — what does NOT leak

Non-Negotiable #2 requires a teardown for everything created. These already have one:

- Connections on an Instance you later `Destroy()` — destroying disconnects them.
- `:Once()` listeners — they self-disconnect after firing.
- Connections made **on the character's own instances** — they die with the character model; only connections held elsewhere that merely *reference* the character need explicit teardown.
- Anything added to a trove/maid/janitor or a connection bag that has a teardown path.
- A `task.delay`/`task.spawn` whose handle is `task.cancel`ed in the owner's teardown.

Flag a leak only when the owner **outlives** the connected object **and** no teardown path exists. A per-player/per-instance table with a matching `PlayerRemoving`/`Destroying` clear is correct, not a leak.

### Security / validation — what is NOT a trust boundary

Non-Negotiable #1 and [security.md](security.md) demand validation of client input. That applies to **client-reachable inputs only**:

- **`BindableEvent`/`BindableFunction` fired on the server are not a trust boundary** — an exploiter cannot fire them; they run server-to-server. Do not demand client-style type/rate/ownership checks on a server-side bindable handler.
- Internal module function calls and server-side custom signals are not client input either.
- Values already validated upstream in the same non-yielding flow do not need re-checking at each callee (re-validation is only required across a **yield**, per Non-Negotiable #7).

Still a trust boundary, always validate: `RemoteEvent`, `RemoteFunction`, `UnreliableRemoteEvent`, teleport data, and anything derived from them. (Client-side bindables *can* be fired by that client's exploiter, but the blast radius is only that client — server decisions remain server-side.)

### Security / validation — a handler can already be complete

A remote handler that type-checks its arguments and **early-returns on bad input is complete**:

- Do not demand it also log every rejection. Silent rejection is often deliberate (an error reply helps fuzzing); logging is Advisory, and only where the team wants telemetry.
- Do not demand a reply — many actions are fire-and-forget by design.
- The skeleton in [patterns/network.md](patterns/network.md#remote-communication) is the *maximum* shape; a handler that needs only type + execute (no rate/ownership because the action is harmless and idempotent) is not missing layers.
- Do not demand `pcall` around calls that cannot yield or throw in practice — attribute reads, pure math, `table` operations. The guard rule scopes to *external/yielding* calls; guarding non-failing code is ceremony.

### Streaming — bare `WaitForChild` is often correct

- `WaitForChild` **without** a timeout on always-replicated containers (`ReplicatedStorage`, `PlayerGui`, the local player's `PlayerScripts`) is fine — those always arrive. Do not flag them.
- Only flag a missing timeout on **workspace descendants under StreamingEnabled**, where the instance may never stream in. See [patterns/network.md](patterns/network.md#streaming-streamingenabled).

### Newer APIs — do not flag what simply postdates your memory

Every engine release creates a fresh crop of "that API does not exist" false positives — and its mirror image, confidently naming members that never shipped. Check [api-currency.md](api-currency.md) before doubting any of these, and the misremembered-API catalog in [style-rules.md](style-rules.md#commonly-misremembered-apis-check-before-writing-before-flagging) before asserting in either direction:

- **`InstanceHandle` attributes** — an attribute *can* hold an Instance reference [Beta]. `GetAttribute` returning a handle rather than the Instance is the design, not a bug.
- **CCL instances and properties** (`ControllerManager`, `GroundController`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) — all real. Equally, a project still using `Humanoid` is correct; `Humanoid` is not deprecated.
- **`Player:GetCameraState()`**, `GroupService:GetRolesInGroupAsync`, `game.ServerRestartScheduled`, DataStore version APIs, `Model.ModelStreamingMode` — all shipped.
- **`vector` library, `buffer.readbits`/`writebits`, `math.map`/`lerp`/`isnan`/`isinf`/`isfinite`** — all shipped Luau.
- **`const` bindings** — a real keyword, **[GA]** in Studio ([api-currency.md](api-currency.md)). `const MAX = 100` is not a syntax error and not a typo for `local`. Equally, **do not demand `const`**: a file using `local` throughout is correct, and converting a codebase to `const` is a stylistic sweep only the user can request.
- **`read` / `write` table members** (`{ read x: number }`), **yielding inside a custom iterator**, and **`declare extern type`** — all shipped upstream. Verify the solver before flagging the first, and never "correct" `declare extern type` back to `declare class`, which was removed.
- **The `@deprecated` attribute** — real, with optional `use` and `reason`. A project marking its own function deprecated is doing the right thing, not leaving dead code.
- **UI classes that postdate a lot of training data:** `UIFlexItem` with `FlexMode` (flex lives on `UIListLayout`, and **`UIFlexLayout` is the invented name**, not this one), `UIDragDetector` and 3D `DragDetector`, `CanvasGroup`, `Path2D`, `UIShadow`, and the whole styling system (`StyleSheet`, `StyleRule`, `StyleLink`, `StyleDerive`, `StyleQuery`). `GuiButton.SecondaryActivated` is real too.
- **Cloud members:** `DataStore:BatchGetAsync`, `DataStoreGetOptions.UseCache`, `DataStoreService:GetRequestBudgetForRequestType`, `HttpService:GetSecret` and the `Secret` datatype, `MemoryStoreService:GetHashMap`/`GetSortedMap`/`GetQueue`.
- **`table.clone`, `table.isfrozen`, `debug.dumpcodesize`** — all shipped.
- **`Script` with `RunContext = Client`** living in `ReplicatedStorage` or `ReplicatedFirst` is a supported modern shape, not a LocalScript in the wrong place. Equally, a project built entirely on LocalScripts is correct — `LocalScript` is not deprecated ([style-rules.md](style-rules.md#where-code-lives-and-what-runs-it)).

### Code economy and device scalability — authoring goals, not review standards

The reuse ladder ([minimal-code.md](minimal-code.md)), the frame and device budgets ([device-performance.md](device-performance.md)), and the edge-case catalog ([edge-cases.md](edge-cases.md)) bind **what you write**. They are not a rubric for judging an existing codebase:

- Do **not** flag a project for lacking device tiers, adaptive quality, or a degradation ladder. Most experiences ship without them, and adding one is a feature the user requests, not a defect you found.
- Do **not** flag a hand-written helper as a violation because an engine API exists. Propose the replacement as **Advisory**; the team may have had a reason, and a deliberate, justified reimplementation is not a defect.
- Do **not** report a missing edge-case guard on suspicion. It is a finding only with a concrete failure scenario, exactly like every other finding — the catalog is a prompt for your own writing, not a list of things to demand.
- Do **not** flag code for being longer than you would have written it. Length alone is Advisory at most, and rewriting for brevity is an unrequested refactor.
- Do **not** turn a maturity score into findings. [evaluation-matrix.md](evaluation-matrix.md) is an audit rubric the user asks for; a dimension scoring 3 has *passed*, and the distance to 5 is headroom, not defects.
- Do **not** flag a project for hand-setting UI properties instead of adopting the styling system, or for not using `UIFlexItem`, `StyleQuery`, or `CanvasGroup`. Those are authoring recommendations for new work ([ui-crossplatform.md](ui-crossplatform.md)); converting an existing interface is a project the user chooses.
- Do **not** flag a project for lacking right-to-be-forgotten templates, observability dashboards, or Extended Services. The first is an obligation the *owner* fulfils on the Creator Hub, and the rest are operational choices — mention them once where relevant, never as defects found in code.
- Do **not** demand enterprise ceremony at toy scale: pooling below roughly once-per-second spawn rates, telemetry scaffolding, degradation ladders, lock tables in a one-script experience. Those authoring catalogs bind what you write fresh; they are not retrofit mandates against a small finished project.

### State ownership, failure policy, and locks — design decisions, not defects

Three patterns added for authoring ([patterns/data.md](patterns/data.md#one-owner-per-fact), [Failure Policy](patterns/data.md#failure-policy-what-happens-after-the-last-retry), [Serialized Operations](patterns/data.md#serialized-operations-per-owner-locks)) describe how to *write* a system. Applied backwards to existing code they generate noise, because each has a legitimate shape that looks like its own violation:

- **A second copy of a value is not automatically a divergence bug.** Caches, mirrors, and denormalized fields are common and often deliberate. It is a finding only when you can show the two copies being written independently **and** a scenario where they disagree — otherwise propose the ownership cleanup as **Advisory**.
- **Fail-open is a valid policy, not a missing guard.** A `pcall` that logs and continues is correct for cosmetics, telemetry, and optional enrichment. Do not demand a fail-closed branch without showing what the failure lets a player get away with. The one case that clears the bar on its own: a **failed data load falling through to defaults on a path that later saves** — that is Blocker severity, because it destroys real data.
- **A missing lock is a finding only with a real interleaving.** Name the yield between the check and the effect, and the two callers that reach it in one frame. An operation with no yield in that window cannot interleave, and a lock added there would be ceremony. Equally, do **not** flag an existing lock as unnecessary without tracing the same path.
- **Do not propose a global lock as a fix.** Serializing all players to remove one player's race is a performance regression dressed as a correctness fix.
- Absent all three patterns, a small project is not defective. These matter at the scale where concurrency and data loss are real risks; a one-script experience does not need a lock table.

### External-editor project shapes are not defects

A project synced from outside Studio looks different from a Studio-native one, and none of the following is a finding.

- **`Script`/`LocalScript` throughout a Rojo project.** `emitLegacyScripts` defaults to `true`, so that is what the project file asked for. Do not "modernize" it to `RunContext`.
- **`.lua` rather than `.luau`.** Both are supported by every tool here; Argon even has a `lua_extension` switch. It is a project convention.
- **`init.luau` / `init.server.luau` / `init.client.luau`.** These make a directory into a script — correct Rojo structure, not a misnamed file.
- **No project file.** Script Sync and Azul need none. Absence is not misconfiguration, and demanding a `default.project.json` is wrong advice.
- **A flat `src/` that does not mirror service names.** The project file decides the mapping; read it before calling the layout wrong.
- **Generated `.luau` beside `.ts`, or darklua output.** That is build output. Never review it as authored code and never edit it.
- **A `--@`-prefixed comment at the top of a Luau file.** In a Lync project that line *is* the script's class and run context, and deleting it silently turns a server `Script` into a `ModuleScript`. Comment-shaped configuration is not an in-body comment ([external-editors.md](external-editors.md#other-tools-in-the-same-space)).
- **A committed `Packages/` folder, or a gitignored one.** Both are defensible — `wally.lock` makes either reproducible. Not a finding in either direction.
- **Explicit property syntax in a Rojo project file** (`{"Bool": false}` rather than `true`). Implicit is preferred by Rojo's docs, but explicit is valid and sometimes required; Advisory at most, never a finding.
- **`stylua.toml` conventions that differ from this skill's formatting.** The project's formatter wins ([external-editors.md](external-editors.md#the-toolchain-that-sits-alongside)).

### Tutorial-shaped code is not a defect

Roblox's own *Coding Fundamentals* series teaches a script per button, `Touched` without a debounce, `CanTouch = false` as a cooldown, and `leaderstats` as where a value lives. A project written that way was following the official material, so it is not evidence of carelessness.

- Judge it on **consequence, not shape**: an undebounced `Touched` that grants currency is a real finding with a real scenario; the same handler playing a sound is not.
- When the user cites the tutorial, **explain the gap rather than disputing the source** — the mapping from taught shape to shipped shape is in [patterns/world.md](patterns/world.md#where-the-official-tutorials-differ-and-why).

### MCP tooling — not the code under review

How the agent drove its own tools is not part of the codebase. Do not report tool choices, MCP call sequences, or the contents of a throwaway execution snippet as findings against the project. Equally, never claim an MCP tool does not exist because it is absent from this skill's snapshot — the connected tool list is the authority ([studio-mcp.md](studio-mcp.md#ground-truth-rules)).

### Authority mode — establish it before judging movement, input, or camera code

Server Authority is **off by default**. Code is only wrong *relative to the mode the place is actually in*:

- Do **not** flag a project for not using Server Authority. It carries a real server CPU cost and forces StreamingEnabled, deferred signals, and fixed simulation; declining it is a legitimate design decision.
- Do **not** flag `BindToSimulation` in a confirmed Server Authority project — it is required there for custom gameplay logic.
- Do **not** flag `UserInputService` or `ContextActionService` in a non-SA project — they are correct outside Server Authority.
- Do **not** flag manual movement plausibility checks as obsolete in a non-SA project — they are the baseline there.

Full comparison of both paths: [server-authority.md](server-authority.md).

### Typing — do not flag the project for tools it does not use

- Do not flag old-type-solver projects for lacking new-solver features (`keyof`, user-defined `type function`, `issubtypeof`) — verify the solver first ([api-currency.md](api-currency.md)).
- A `::` cast that **follows a proven runtime check** (`value :: string` after `typeof(value) == "string"`) is a valid narrow, not a suppressed error.
- Do not add or demand `--!strict` — it is opt-in per [SKILL.md](../SKILL.md#language--style-rules); requiring it is a user decision, and forcing it can surface false type errors against loosely-typed engine APIs.
- **A quiet `--!nonstrict` file is not a gap.** The new solver's nonstrict mode reports only *definite* runtime errors by design; silence means it found none, not that type checking is missing. Likewise `--!nocheck` is a valid project choice, not a safety violation.
- Never flag `pairs`/`ipairs`, nor `Heartbeat` vs `PostSimulation` naming — both forms are valid.

### Deprecated vs. discouraged — do not conflate them

Only the **deprecated** column is a Correctness (or Blocker) finding. The **discouraged** column is Advisory at most.

| Deprecated (behavior/removal risk — report) | Discouraged but functional (Advisory only) |
|---|---|
| `wait`/`spawn`/`delay`, `tick`, `:connect`/`:wait` lowercase | `Instance.new(class, parent)` parent-arg (a perf anti-pattern, not deprecated) |
| Body movers (`BodyVelocity`/`BodyGyro`/...) | `FireAllClients` where a targeted list would suffice |
| `Humanoid:LoadAnimation`, `Part.Velocity`/`RotVelocity` | `RemoteFunction` client→server (fine with a timeout mindset) |
| `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame`, `Camera.CoordinateFrame` | `pairs`/`ipairs` (never a finding) |
| `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync` | |

### Style / layout — propose, never report

Section-header deviations, subsection ordering, naming casing, module require ordering, and missing doc comments on trivial private helpers are **Advisory**. Propose them; do not report them as violations and do not silently rewrite. Consistency within the file outranks consistency with this skill. In Adaptive mode, the confirmed project convention wins outright.

Two more shapes that look like violations:

- The `workspace` global is explicitly allowed ([SKILL.md](../SKILL.md#language--style-rules)) — flagging it as service-indexing is simply wrong.
- A deliberate legacy choice (classic chat where `TextChatService` would fit, `ContextActionService` in a project that never adopted the Input Action System) is a design decision. Mention the modern alternative once as Advisory if genuinely useful, then drop it — never as a violation.

### Documentation Comments — one real finding, the rest Advisory

The Documentation Comment style ([section-layout.md](section-layout.md#documentation-comments-the-default-style-and-how-it-flexes)) is a **default for code you author**, not a standard you hold other people's code to. Style is adaptable by design; judging an existing codebase against this skill's default would produce a flood of noise findings.

In review the rules collapse to a single distinction:

| Situation | Severity |
|---|---|
| A description that is **factually wrong** about the contract, or documents behavior the function no longer has | **Correctness** — it will mislead the next reader into a real bug |
| A description naming the mechanism, or carrying a number/tunable/collaborator that has since drifted | **Advisory** — propose the contract-level rewrite |
| An over-length comment, a missing doc block, an em dash, formatting deviations | **Advisory** |
| A comment written in the project's own established house style, in any block form (`--[[ ]]`, `--[=[ ]=]`, `---`) | **Not a finding at all** |
| An in-body note inside code you did not write | **Not a finding at all** — never delete it; propose migrating its content into self-documenting code or the block above, once, as Advisory |
| An in-body comment in new code **this skill delivered** | **Delivery defect** against the documentation standard — fix before handing over, no proposal needed |
| Existing in-body comments in code you did not write | **Not a finding at all** |

Do not open a review by rewriting comments. Do not count characters across a file and report the total as a violation. Never delete an existing comment to satisfy a length cap — shorten it, or leave it and propose. Do not report a project for its comment style: style adapts, and a Moonwave-documented codebase is doing it right. In-body notes in code you did not write are never a finding; in code this skill delivered they are a defect to fix before handover, per [section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead).

## Regression set — these must pass a review clean

If a review would flag any of these, the review is over-firing. Each is correct as written.

```lua
-- Periodic autosave: scheduling, not polling (Non-Negotiable #4 carve-out).
while task.wait(AUTOSAVE_INTERVAL) do
	DataStoreManager.SaveAll()
end
```

```lua
-- Per-frame reuse via table.clear: no new garbage each frame.
local scratch = {}
RunService.Heartbeat:Connect(function()
	table.clear(scratch)
	gatherVisibleEntities(scratch)
	render(scratch)
end)
```

```lua
--[[ Grants a combat buff to a player when an internal server system reports one. ]]
local function onBuffApplied(player: Player, buffId: string)
	Buffs.Grant(player, buffId)
end
buffAppliedBindable.Event:Connect(onBuffApplied)
```

```lua
-- Cold path setup: parent-arg is discouraged, not a violation here.
local marker = Instance.new("Part", workspace.Markers)
```

```lua
-- Always-replicated container: bare WaitForChild is correct.
local hud = player:WaitForChild("PlayerGui"):WaitForChild("HUD")
```

```lua
-- One-shot listener that self-disconnects: not a leak.
part.Touched:Once(function(hit)
	triggerOnce(hit)
end)
```

```lua
-- Cast after a proven check: a valid narrow, not a suppressed error.
if typeof(payload) == "string" then
	local text = payload :: string
	handle(text)
end
```

```lua
--[[ Preloads a purely cosmetic sound; skipping it on failure costs polish, never gameplay. ]]
pcall(function()
	ContentProvider:PreloadAsync({ decorativeSound })
end)
```

```lua
-- const binding: a real keyword, [GA] in Studio — and equally NOT demanded of files using local.
const MAX_RETRIES = 3
```

```lua
-- Flex on the list layout plus a per-child item: the real API.
-- There is no UIFlexLayout class, and this is not it.
local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Horizontal
layout.HorizontalFlex = Enum.UIFlexAlignment.SpaceBetween
local flexItem = Instance.new("UIFlexItem")
flexItem.FlexMode = Enum.UIFlexMode.Fill
```

```lua
-- Authoritative read after a failed write: UseCache = false is the point,
-- not defensive ceremony to strip.
local options = Instance.new("DataStoreGetOptions")
options.UseCache = false
local ok, stored = pcall(store.GetAsync, store, key, options)
```

```lua
-- Non-yielding UpdateAsync transform: the yield-free body is required,
-- not an oversight to "improve" with a wait.
store:UpdateAsync(key, function(old)
	local profile = old or Defaults()
	profile.coins += amount
	return profile
end)
```

```lua
-- vector library helpers: shipped Luau, not hand-roll bait.
local dir = vector.normalize(target - origin)
local clamped = vector.clamp(dir, minVec, maxVec)
```

```lua
-- InstanceHandle [Beta] attribute: GetAttribute returning a handle whose Get() is
-- nil while the target streams in is the design, not a bug to flag.
local target = marker:GetAttribute("Target")
local resolved = target and target:Get()
```

```lua
-- Verified accessibility reads: PreferredTextSize/ViewportDisplaySize are real members.
-- Reading them is correctness, not ceremony.
applyScale(GuiService.PreferredTextSize)
GuiService:GetPropertyChangedSignal("PreferredTextSize"):Connect(applyScale)
```

```lua
-- Shipped but undocumented: present in the API dump, absent from create.roblox.com.
-- Not a fabrication, not a finding. Confirm against the dump before ever calling a
-- member nonexistent -- the docs site trails the engine by weeks.
local multiplier = GuiService:GetUIScaleMultiplier()
shadow.Inset = true
```

## Review mode: what happens to a finding once it is real

The gate above decides **whether** a finding is real; the taxonomy decides **how bad**. This section covers what to do with it. It does not restate either — apply them.

- **Blocker / Correctness** — violations of the Non-Negotiable Runtime Rules and misused deprecated APIs are reported (and fixed if asked). Apply those rules *as scoped*: the exceptions written into them — periodic loops, cold-path allocations, small state snapshots — are not violations, and discouraged-but-functional APIs are not deprecated ones.
- **Advisory** — layout and naming deviations, require ordering, and missing doc comments on trivial private helpers are **proposed**, never reported as violations and never silently rewritten. The user decides.
- **Never reformat code unrelated to the request.** Consistency within the file beats consistency with this skill.
- **Deliver the severity with the finding.** A list of observations without severities forces the user to triage what you were asked to triage.
