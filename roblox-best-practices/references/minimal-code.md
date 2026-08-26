# Minimal Code — Reuse First, Then Write Less

The cheapest code is the code never written. This file governs **how much** code to produce; [performance.md](performance.md) governs how cheap it is to run, and [device-performance.md](device-performance.md) governs whether it fits the frame.

## Contents

- [Three precedence rules (read these before the ladder)](#three-precedence-rules-read-these-before-the-ladder)
- [The ladder](#the-ladder)
- [Already exists — do not hand-roll these](#already-exists--do-not-hand-roll-these)
- [Searching the project first](#searching-the-project-first)
- [Density rules](#density-rules)
- [When reimplementation is justified](#when-reimplementation-is-justified)
- [Ponytail (optional agent-side overlay)](#ponytail-optional-agent-side-overlay)

## Three precedence rules (read these before the ladder)

### 1. Minimalism never reduces what gets delivered

**Short code is a property of the implementation, never of the feature set.** The user asked for a behavior; they get that behavior, complete and working. Fewer lines is only ever a better *route to the same destination*.

This is the failure mode the ladder invites, so it is the rule that comes first:

| Legitimate | Not minimalism, just under-delivery |
|---|---|
| Replacing thirty hand-written lines with one engine call | Dropping a requested capability because it "may not be needed" |
| Removing a wrapper that only forwards | Leaving a case unhandled to keep a function short |
| Collapsing nested branches into guard clauses | Stopping at a partial implementation and calling it minimal |
| Reusing an existing helper instead of writing a second | Silently narrowing the scope the user described |

Rung 1 of the ladder ("does this need to exist?") applies to **things you invented** — speculative abstractions, unrequested options, scaffolding for a caller nobody asked for. It never applies to what the user asked for. If something they requested genuinely should not be built, say so and let them decide; do not quietly omit it ([SKILL.md](../SKILL.md#user-authority)).

The result must still be robust: edge cases handled ([edge-cases.md](edge-cases.md)), failures guarded, cleanup present. Terse and complete are not in tension. A function that is short *because it does less than asked* has failed, however elegant it reads.

### 2. Minimalism never costs readability

**"Fewer lines" is not the goal. Less *code* is.** The two come apart the moment compression starts hurting the reader, and at that point compression is the thing that is wrong.

Never do these in the name of brevity:

| Forbidden | Instead |
|---|---|
| Packing several statements onto one line, with or without semicolons | One statement per line |
| Collapsing a multi-step expression into an unreadable chain | Name the intermediate value |
| Dropping blank lines between logical groups | Keep the breathing room; whitespace is free at runtime |
| Shortening `purchaseRemote` to `pr`, `humanoid` to `h` | Descriptive names, per the naming rules |
| Removing section headers or subsections to save lines | The three-section layout is mandatory and never counts as padding |
| Clever one-liners a reader has to decode | The obvious version, even if it is a line longer |
| Reformatting existing code tighter while passing through | Leave formatting alone unless asked |

**Rung 6 of the ladder means:** if the whole solution is *naturally* a single expression, do not wrap it in a function and a module. It does **not** mean take a five-statement function and squeeze it into one line. A dense function is one with no wasted **work**, not one with no whitespace.

The test: **would a teammate reading this at 2 a.m. understand it faster than the longer version?** If not, the longer version was correct. Readability is the point of writing less code in the first place; sacrificing it inverts the goal.

### 3. Minimalism never removes a requirement

The ladder asks "does this need to exist?", and the answer is always **yes** for:

- Server-side validation of remote arguments
- Cleanup and teardown paths for anything created
- The three-section layout and the Documentation Comment on each function
- `pcall` coverage on yielding external calls
- Re-validation after a yield

These are Non-Negotiable Runtime Rules ([SKILL.md](../SKILL.md#non-negotiable-runtime-rules)). Deleting one is not a simplification; it is a defect that happens to be short. Trim mechanism, never guarantees.

## The ladder

Before writing a function, walk these in order and stop at the first that answers:

1. **Does this need to exist at all?** The requested behavior may already be a side effect of something else, or may not be needed yet. Do not build for a caller that does not exist.
2. **Does the project already have it?** Search the codebase before writing. A second implementation of the same helper is a bug factory: the two drift, and the wrong one gets fixed.
3. **Does the Luau standard library do it?** See the catalog below.
4. **Does a Roblox engine API do it?** See the catalog below. This rung is the one agents skip most often.
5. **Does an installed library do it?** If the project uses ProfileStore, Trove, Packet, or similar, its idiom wins for the concern it owns ([community-libraries.md](community-libraries.md)).
6. **Can it be one line?** Then it is one line, not a function.
7. **Only then:** write the minimum that works.

## Already exists — do not hand-roll these

The concrete payload of this file. Each left-hand entry is something agents routinely reimplement in Roblox projects.

| Commonly hand-rolled | Use instead |
|---|---|
| Interpolation, clamping, remapping, sign, rounding | `math.lerp`, `math.clamp`, `math.map`, `math.sign`, `math.round` |
| Numeric validity checks | `math.isnan`, `math.isinf`, `math.isfinite` |
| Linear search, preallocation, range copy, joining, reuse, immutability | `table.find`, `table.create`, `table.move`, `table.concat`, `table.clear`, `table.freeze`/`table.isfrozen` |
| A shallow copy of a table | `table.clone` (deep copies stay recursive, and the project usually has one) |
| Manual per-frame property interpolation | `TweenService` |
| A registry of instances by kind or role | `CollectionService` tags plus its added/removed signals |
| `ObjectValue`/`StringValue`/`IntValue` config trees | Attributes |
| Distance-check loops for "press E to interact" | `ProximityPrompt` |
| Custom pathfinding | `PathfindingService` |
| Hand-positioned UI children | `UIListLayout` (with `UIFlexItem` for flexible children), `UIGridLayout`, `UITableLayout`, plus `AutomaticSize` |
| A Luau loop that applies colors, corners, or hover states across many UI instances | A `StyleSheet` with `StyleRule` selectors, and `StyleQuery` for responsive and accessibility conditions ([ui-crossplatform.md](ui-crossplatform.md#the-styling-system)) |
| A scaling border built from nine frames or several images | One image with `ScaleType = Slice` and `SliceCenter` |
| Hand-written drag handling for a slider or a draggable panel | `UIDragDetector`, or `DragDetector` for 3D parts |
| A bespoke Signal class | `BindableEvent`, or the signal library the project already uses |
| Manual delayed destruction | `Debris`, or `task.delay` with a handle you can cancel |
| Hand-written ray, box, or overlap math | `workspace:Raycast`, `Blockcast`, `Shapecast`, `GetPartBoundsInBox`, `GetPartsInPart` |
| String building in a loop | `table.concat`, or interpolation backticks |
| Manual serialization of tables | `HttpService:JSONEncode`/`JSONDecode`, or `buffer` for bulk binary |
| Manual date and epoch arithmetic | `os.time`, `DateTime` |
| A custom scheduler or coroutine wrapper | the `task` library |
| A deep-copy or merge helper written from scratch | Check the project first; these almost always already exist |
| A rate limiter written per feature | One shared limiter, called from every handler ([cases/client-infra.md](cases/client-infra.md#rate-limiting-and-the-anti-cheat-layer)) |
| A cross-server queue built out of a sorted map | `MemoryStoreService` queues, which are a first-class structure ([patterns/network.md](patterns/network.md#cross-server-communication)) |
| An API key pasted into a ModuleScript, or a "hidden" config store | The secrets store via `HttpService:GetSecret` ([security.md](security.md#threat-model-assume-all-of-these-exist)) |
| A hand-built backup system for player data | DataStore version history (`ListVersionsAsync`, `GetVersionAsync`) ([patterns/data.md](patterns/data.md#data-persistence)) |
| A hand-rolled guess at how much request budget is left | `DataStoreService:GetRequestBudgetForRequestType()` |

Availability of the newer entries is recorded in [api-currency.md](api-currency.md). If an API is not available in the target environment, fall back to the stable equivalent rather than treating the gap as licence to build a framework.

## Searching the project first

Rung 2 requires evidence, not memory:

- Grep for the concept before writing it: the function name you were about to use, plus one or two synonyms.
- Look in the obvious homes: a `Shared`, `Common`, `Util`, or `Modules` folder, and whatever the project's own convention is.
- If you find something close but imperfect, **extend or call it** rather than writing a parallel version. If it genuinely cannot serve, say so when you present the work.
- In Studio-native or MCP environments, use the script search and grep tools rather than guessing ([studio-mcp.md](studio-mcp.md#capability-map)).

## Density rules

These target code volume, never structure. The three-section layout, the doc block, and the guard rules stay regardless of length.

- **Guard clauses over nesting.** Validate and return early; do not wrap the body in a pyramid of `if` blocks.
- **No forwarding wrappers.** A function whose entire body is a call to another function with the same arguments earns nothing. Call the target.
- **No defensive code for excluded states.** If a prior guard or the type already rules a case out, do not check it again. Re-validation across a **yield** is a different thing and is required.
- **No abstraction for a single caller.** Generalize at the second caller, not in anticipation of one.
- **Do not re-derive what is already in scope.** Pass the value rather than recomputing or re-looking-up the instance.
- **One concept per function.** A function that needs "and" in its description is two functions, and its doc comment will say so.

Anti-goal: code that looks substantial. Length is not evidence of quality, and a long function is harder to verify, slower to read, and more likely to hide an edge case.

Two opposite anti-goals matter just as much. **A function that is short because it does less than it was asked to** has failed, and so has **a function that is short because it was compressed past readability.** Every density rule above removes ceremony, never capability and never clarity. When they pull against each other, completeness and readability win, and the extra lines are the correct price.

## When reimplementation is justified

Two cases, both requiring you to say so rather than deciding silently:

- **A measured performance need.** The engine API was profiled and is the bottleneck. State the measurement.
- **A contract mismatch.** The API genuinely cannot express the requirement, not merely that it is inconvenient.

"I could write it faster than reading the docs" is not one of them.

## Ponytail (optional agent-side overlay)

[Ponytail](https://github.com/DietrichGebert/ponytail) is an **AI-agent plugin, not a Roblox plugin and not a Luau library.** It enforces exactly this concern through a seven-rung ladder, which is what the ladder above is adapted from.

- **Detect it** by its commands (`/ponytail`, `/ponytail-review`, `/ponytail-audit`) or its rule files in the repository.
- **If present, it owns minimalism.** Follow its ladder, and respect whatever intensity the user has set (`lite`, `full`, `ultra`, `off`) rather than overriding it with this file. Its review and audit commands are the user's to invoke, not yours to run unprompted.
- **If absent, this file is the equivalent.** The skill is complete without it and never requires installing it. Mention it at most once, as an option.
- **All three precedence rules at the top of this file still apply.** No intensity setting, including `ultra`, authorizes dropping validation, cleanup, or any other Non-Negotiable; none authorizes delivering less than the user asked for; and none authorizes unreadable code.
