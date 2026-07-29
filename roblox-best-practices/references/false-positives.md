# False-Positive Guardrails — What NOT to Flag

The anti-false-positive filter for review/refactor mode. This file collects the carve-outs that are otherwise scattered across the skill (the scoped exceptions in the Non-Negotiable Runtime Rules, "trace before flag" in [verification.md](verification.md), the review-mode softening in [SKILL.md](../SKILL.md#reviewrefactor-mode)) and adds the specific cases that most often produce wrong findings.

Read this **before reporting any finding**. A rule in this skill says what good code does; every such rule has a matching set of shapes that *look* like violations but are correct. Reporting those erodes trust faster than missing a real issue.

## Severity taxonomy (use these three words everywhere)

Every finding carries exactly one severity. This is the shared vocabulary for SKILL.md review mode, [verification.md](verification.md), and the Review Checklist.

| Severity | Meaning | What qualifies | Action |
|---|---|---|---|
| **Blocker** | Security hole, data loss, or a guaranteed leak | Unvalidated remote acts on client input; `PlayerAdded` state with no removal path; `SetAsync` overwrite that drops concurrent writes; secret in a client-visible location | Report; fix if asked |
| **Correctness** | A real bug with a concrete failure scenario | Deprecated API that changes behavior; use-after-yield of a departed player; paired writer/reader that genuinely diverge | Report with the inputs → wrong-outcome scenario |
| **Advisory** | Style, layout, or micro-optimization | Section-layout deviation; missing doc comment on a trivial private helper; `FireAllClients` where a targeted list would do; a discouraged-but-functional API | **Propose** as a suggestion; never report as a violation, never silently rewrite |

If a finding cannot be placed above **Advisory**, it is a suggestion the user is free to decline, not a defect. When in doubt about severity, it is Advisory.

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

### Cleanup / leaks — what does NOT leak

Non-Negotiable #2 requires a teardown for everything created. These already have one:

- Connections on an Instance you later `Destroy()` — destroying disconnects them.
- `:Once()` listeners — they self-disconnect after firing.
- Connections made **on the character's own instances** — they die with the character model; only connections held elsewhere that merely *reference* the character need explicit teardown.
- Anything added to a trove/maid/janitor or a connection bag that has a teardown path.
- A `task.delay`/`task.spawn` whose handle is `task.cancel`ed in the owner's teardown.

Flag a leak only when the owner **outlives** the connected object **and** no teardown path exists. A per-player/per-instance table with a matching `PlayerRemoving`/`Destroying` clear is correct, not a leak.

### Security / validation — what is NOT a trust boundary

Non-Negotiable #1 and [security-monetization.md](security-monetization.md) demand validation of client input. That applies to **client-reachable inputs only**:

- **`BindableEvent`/`BindableFunction` fired on the server are not a trust boundary** — an exploiter cannot fire them; they run server-to-server. Do not demand client-style type/rate/ownership checks on a server-side bindable handler.
- Internal module function calls and server-side custom signals are not client input either.
- Values already validated upstream in the same non-yielding flow do not need re-checking at each callee (re-validation is only required across a **yield**, per Non-Negotiable #7).

Still a trust boundary, always validate: `RemoteEvent`, `RemoteFunction`, `UnreliableRemoteEvent`, teleport data, and anything derived from them. (Client-side bindables *can* be fired by that client's exploiter, but the blast radius is only that client — server decisions remain server-side.)

### Security / validation — a handler can already be complete

A remote handler that type-checks its arguments and **early-returns on bad input is complete**:

- Do not demand it also log every rejection. Silent rejection is often deliberate (an error reply helps fuzzing); logging is Advisory, and only where the team wants telemetry.
- Do not demand a reply — many actions are fire-and-forget by design.
- The skeleton in [patterns.md](patterns.md#remote-communication) is the *maximum* shape; a handler that needs only type + execute (no rate/ownership because the action is harmless and idempotent) is not missing layers.

### Streaming — bare `WaitForChild` is often correct

- `WaitForChild` **without** a timeout on always-replicated containers (`ReplicatedStorage`, `PlayerGui`, the local player's `PlayerScripts`) is fine — those always arrive. Do not flag them.
- Only flag a missing timeout on **workspace descendants under StreamingEnabled**, where the instance may never stream in. See [patterns.md](patterns.md#streaming-streamingenabled).

### Newer APIs — do not flag what simply postdates your memory

Every engine release creates a fresh crop of "that API does not exist" false positives. Check [api-currency.md](api-currency.md) before doubting any of these:

- **`InstanceHandle` attributes** — an attribute *can* hold an Instance reference [Beta]. `GetAttribute` returning a handle rather than the Instance is the design, not a bug.
- **CCL instances and properties** (`ControllerManager`, `GroundController`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) — all real. Equally, a project still using `Humanoid` is correct; `Humanoid` is not deprecated.
- **`Player:GetCameraState()`**, `GroupService:GetRolesInGroupAsync`, `game.ServerRestartScheduled`, DataStore version APIs, `Model.ModelStreamingMode` — all shipped.
- **`vector` library, `buffer.readbits`/`writebits`, `math.map`/`lerp`/`isnan`/`isinf`/`isfinite`** — all shipped Luau.
- **`const` bindings** — a real keyword, live in Studio since April 2026. `const MAX = 100` is not a syntax error and not a typo for `local`. Equally, **do not demand `const`**: a file using `local` throughout is correct, and converting a codebase to `const` is a stylistic sweep only the user can request.
- **`read` / `write` table members** (`{ read x: number }`), **yielding inside a custom iterator**, and **`declare extern type`** — all shipped upstream. Verify the solver before flagging the first, and never "correct" `declare extern type` back to `declare class`, which was removed.
- **The `@deprecated` attribute** — real, with optional `use` and `reason`. A project marking its own function deprecated is doing the right thing, not leaving dead code.

### Code economy and device scalability — authoring goals, not review standards

The reuse ladder ([minimal-code.md](minimal-code.md)), the frame and device budgets ([device-performance.md](device-performance.md)), and the edge-case catalog ([edge-cases.md](edge-cases.md)) bind **what you write**. They are not a rubric for judging an existing codebase:

- Do **not** flag a project for lacking device tiers, adaptive quality, or a degradation ladder. Most experiences ship without them, and adding one is a feature the user requests, not a defect you found.
- Do **not** flag a hand-written helper as a violation because an engine API exists. Propose the replacement as **Advisory**; the team may have had a reason, and a deliberate, justified reimplementation is not a defect.
- Do **not** report a missing edge-case guard on suspicion. It is a finding only with a concrete failure scenario, exactly like every other finding — the catalog is a prompt for your own writing, not a list of things to demand.
- Do **not** flag code for being longer than you would have written it. Length alone is Advisory at most, and rewriting for brevity is an unrequested refactor.

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

### Doc comments — one real finding, the rest Advisory

The UDD rules ([SKILL.md](../SKILL.md#udd-is-mandatory-and-outranks-mode-selection)) are **mandatory for code you author** and **not a standard you hold other people's code to**. That asymmetry is deliberate: binding your own output keeps what you add consistent, while judging an existing codebase by it would produce a flood of noise findings.

In review the rules collapse to a single distinction:

| Situation | Severity |
|---|---|
| A description that is **factually wrong** about the contract, or documents behavior the function no longer has | **Correctness** — it will mislead the next reader into a real bug |
| A description naming the mechanism, or carrying a number/tunable/collaborator that has since drifted | **Advisory** — propose the contract-level rewrite |
| An over-length or unnecessary in-body comment, a missing doc block, an em dash, formatting deviations | **Advisory** |
| A doc comment written in the project's own established house style | **Not a finding at all** |
| Existing in-body comments in code you did not write | **Not a finding at all** |

Do not open a review by rewriting comments. Do not count characters across a file and report the total as a violation. Never delete an existing comment to satisfy a length cap — shorten it, or leave it and propose. And do not report a project for having a house comment style: the no-adaptation rule governs what *you* write, not what already exists.

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
--[[ Applies a server-computed buff. Server-internal signal, not client input. ]]
local function onBuffApplied(player: Player, buffId: string)
	Buffs.Grant(player, buffId)
end
buffAppliedBindable.Event:Connect(onBuffApplied) -- BindableEvent: no client-style validation needed
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
-- Intentionally ignorable failure, documented: not a swallowed error.
pcall(function()
	ContentProvider:PreloadAsync({ decorativeSound }) -- cosmetic; safe to skip on failure
end)
```
