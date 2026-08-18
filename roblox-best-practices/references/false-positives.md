# False-Positive Guardrails — What NOT to Flag

The anti-false-positive filter for review/refactor mode. This file collects the carve-outs that are otherwise scattered across the skill (the scoped exceptions in the Non-Negotiable Runtime Rules, "trace before flag" in [verification.md](verification.md), the review-mode softening in [SKILL.md](../SKILL.md#reviewrefactor-mode)) and adds the specific cases that most often produce wrong findings.

Read this **before reporting any finding**. A rule in this skill says what good code does; every such rule has a matching set of shapes that *look* like violations but are correct. Reporting those erodes trust faster than missing a real issue.

## Contents

- [Severity taxonomy (use these three words everywhere)](#severity-taxonomy-use-these-three-words-everywhere)
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

### Streaming — bare `WaitForChild` is often correct

- `WaitForChild` **without** a timeout on always-replicated containers (`ReplicatedStorage`, `PlayerGui`, the local player's `PlayerScripts`) is fine — those always arrive. Do not flag them.
- Only flag a missing timeout on **workspace descendants under StreamingEnabled**, where the instance may never stream in. See [patterns/network.md](patterns/network.md#streaming-streamingenabled).

### Newer APIs — do not flag what simply postdates your memory

Every engine release creates a fresh crop of "that API does not exist" false positives. Check [api-currency.md](api-currency.md) before doubting any of these:

- **`InstanceHandle` attributes** — an attribute *can* hold an Instance reference [Beta]. `GetAttribute` returning a handle rather than the Instance is the design, not a bug.
- **CCL instances and properties** (`ControllerManager`, `GroundController`, `AvatarAbilities`, `StarterPlayer.LuaCharacterController`) — all real. Equally, a project still using `Humanoid` is correct; `Humanoid` is not deprecated.
- **`Player:GetCameraState()`**, `GroupService:GetRolesInGroupAsync`, `game.ServerRestartScheduled`, DataStore version APIs, `Model.ModelStreamingMode` — all shipped.
- **`vector` library, `buffer.readbits`/`writebits`, `math.map`/`lerp`/`isnan`/`isinf`/`isfinite`** — all shipped Luau.
- **`const` bindings** — a real keyword, **[GA]** in Studio ([api-currency.md](api-currency.md)). `const MAX = 100` is not a syntax error and not a typo for `local`. Equally, **do not demand `const`**: a file using `local` throughout is correct, and converting a codebase to `const` is a stylistic sweep only the user can request.
- **`read` / `write` table members** (`{ read x: number }`), **yielding inside a custom iterator**, and **`declare extern type`** — all shipped upstream. Verify the solver before flagging the first, and never "correct" `declare extern type` back to `declare class`, which was removed.
- **The `@deprecated` attribute** — real, with optional `use` and `reason`. A project marking its own function deprecated is doing the right thing, not leaving dead code.

### Code economy and device scalability — authoring goals, not review standards

The reuse ladder ([minimal-code.md](minimal-code.md)), the frame and device budgets ([device-performance.md](device-performance.md)), and the edge-case catalog ([edge-cases.md](edge-cases.md)) bind **what you write**. They are not a rubric for judging an existing codebase:

- Do **not** flag a project for lacking device tiers, adaptive quality, or a degradation ladder. Most experiences ship without them, and adding one is a feature the user requests, not a defect you found.
- Do **not** flag a hand-written helper as a violation because an engine API exists. Propose the replacement as **Advisory**; the team may have had a reason, and a deliberate, justified reimplementation is not a defect.
- Do **not** report a missing edge-case guard on suspicion. It is a finding only with a concrete failure scenario, exactly like every other finding — the catalog is a prompt for your own writing, not a list of things to demand.
- Do **not** flag code for being longer than you would have written it. Length alone is Advisory at most, and rewriting for brevity is an unrequested refactor.

### State ownership, failure policy, and locks — design decisions, not defects

Three patterns added for authoring ([patterns/data.md](patterns/data.md#one-owner-per-fact), [Failure Policy](patterns/data.md#failure-policy-what-happens-after-the-last-retry), [Serialized Operations](patterns/data.md#serialized-operations-per-owner-locks)) describe how to *write* a system. Applied backwards to existing code they generate noise, because each has a legitimate shape that looks like its own violation:

- **A second copy of a value is not automatically a divergence bug.** Caches, mirrors, and denormalized fields are common and often deliberate. It is a finding only when you can show the two copies being written independently **and** a scenario where they disagree — otherwise propose the ownership cleanup as **Advisory**.
- **Fail-open is a valid policy, not a missing guard.** A `pcall` that logs and continues is correct for cosmetics, telemetry, and optional enrichment. Do not demand a fail-closed branch without showing what the failure lets a player get away with. The one case that clears the bar on its own: a **failed data load falling through to defaults on a path that later saves** — that is Blocker severity, because it destroys real data.
- **A missing lock is a finding only with a real interleaving.** Name the yield between the check and the effect, and the two callers that reach it in one frame. An operation with no yield in that window cannot interleave, and a lock added there would be ceremony. Equally, do **not** flag an existing lock as unnecessary without tracing the same path.
- **Do not propose a global lock as a fix.** Serializing all players to remove one player's race is a performance regression dressed as a correctness fix.
- Absent all three patterns, a small project is not defective. These matter at the scale where concurrency and data loss are real risks; a one-script experience does not need a lock table.

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

### Documentation Comments — one real finding, the rest Advisory

The Documentation Comment style ([section-layout.md](section-layout.md#documentation-comments-the-default-style-and-how-it-flexes)) is a **default for code you author**, not a standard you hold other people's code to. Style is adaptable by design; judging an existing codebase against this skill's default would produce a flood of noise findings.

In review the rules collapse to a single distinction:

| Situation | Severity |
|---|---|
| A description that is **factually wrong** about the contract, or documents behavior the function no longer has | **Correctness** — it will mislead the next reader into a real bug |
| A description naming the mechanism, or carrying a number/tunable/collaborator that has since drifted | **Advisory** — propose the contract-level rewrite |
| An over-length comment, a missing doc block, an em dash, formatting deviations | **Advisory** |
| A comment written in the project's own established house style, in any block form (`--[[ ]]`, `--[=[ ]=]`, `---`) | **Not a finding at all** |
| An in-line note that explains why a statement is there | **Not a finding at all** |
| Existing in-body comments in code you did not write | **Not a finding at all** |

Do not open a review by rewriting comments. Do not count characters across a file and report the total as a violation. Never delete an existing comment to satisfy a length cap — shorten it, or leave it and propose. Do not report a project for its comment style: style adapts, and a Moonwave-documented codebase is doing it right. In-line notes are permitted, so their mere presence is never a finding — only a note that is wrong, or that restates the code it sits beside, is worth proposing.

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

## Review mode: what happens to a finding once it is real

The gate above decides **whether** a finding is real; the taxonomy decides **how bad**. This section covers what to do with it. It does not restate either — apply them.

- **Blocker / Correctness** — violations of the Non-Negotiable Runtime Rules and misused deprecated APIs are reported (and fixed if asked). Apply those rules *as scoped*: the exceptions written into them — periodic loops, cold-path allocations, small state snapshots — are not violations, and discouraged-but-functional APIs are not deprecated ones.
- **Advisory** — layout and naming deviations, require ordering, and missing doc comments on trivial private helpers are **proposed**, never reported as violations and never silently rewritten. The user decides.
- **Never reformat code unrelated to the request.** Consistency within the file beats consistency with this skill.
- **Deliver the severity with the finding.** A list of observations without severities forces the user to triage what you were asked to triage.
