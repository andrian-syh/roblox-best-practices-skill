# Review Checklist

Run this before calling any Luau work finished. It is the last gate, not background reading, so it is kept out of SKILL.md and read at the end of a task.

## Checklist

Before finishing any Luau code, verify:

- [ ] Supervision level respected (inline token > session declaration > Balanced); in Autonomous, all assumptions listed in the summary
- [ ] Mode determined (default vs adaptive); in adaptive mode, the convention was confirmed by the user before coding (or reported, in Autonomous)
- [ ] Community libraries identified (asked or detected); overlapping patterns deferred to them
- [ ] For SA-adjacent work (movement, physics, input, camera, animation timing, `BindToSimulation`, network ownership): authority mode detected or confirmed, never assumed; default is OFF
- [ ] For a non-trivial system: the five-step System Design Preflight was run, and the matching case recipe read
- [ ] No [Beta] feature made the default in production code; its status stated wherever it was proposed
- [ ] Three top-level sections present and correctly ordered (except exempt pure data/type modules); correct header syntax at each level (or the confirmed adapted equivalent); ceremony scaled to script size, no empty headers
- [ ] In review mode: each finding triaged as Blocker/Correctness/Advisory and run through the false-positives gate; Advisory items proposed not forced; unrelated code untouched. Where the **user asked for** a system health evaluation or maturity audit, score against [evaluation-matrix.md](evaluation-matrix.md); a score below 5 is not itself a finding
- [ ] Services/Modules/Objects/Configuration/State ordered per spec; module requires ordered SSS → SS → RS → Workspace → script-relative (only reachable locations count)
- [ ] Every function authored carries a Documentation Comment in the project's block form (`--[[ ]]` by default, Moonwave `--[=[ ]=]`/`---` where that is the project's style), ordered desc → params → returns, ≤ 3 lines and ≤ 250 chars, English preferred, no em dashes or double-hyphen punctuation, no emoji; tags in Moonwave syntax (`@param <name> <type> -- <description>`) and only where they add what the signature cannot show
- [ ] **Every Documentation Comment** passes **both** tests: implementation-agnostic (names no API, algorithm, collaborator, or internal structure) and free of volatile content (no numbers, tunable names, or renameable feature/system names); where a detail was unavoidable it was stated at the most general level that stays true after the body changes
- [ ] No prose comments inside any delivered body (self-documenting names instead; contract-level why lives in the block above); every description ≤ 3 lines and ≤ 250 characters; no pre-existing comment was deleted
- [ ] `--!strict` present only where the user asked or the project already uses it (never added unbidden); no deprecated APIs (discouraged-but-functional APIs are not violations)
- [ ] All connections have an owner and a teardown path; no leaked Instances or unparented model references (passes the 20x respawn leak audit)
- [ ] No allocation or Instance-tree lookup inside hot loops; nothing polled that could be event-driven
- [ ] Visual animations and part motions use client-side `TweenService` or `Motor6D.Transform`; no server-side tweening of moving parts
- [ ] Per-player state that others should not see went to its owner through a targeted remote, not an attribute or replicated property (attributes reach every client)
- [ ] Any performance claim rests on a measurement, not an assumption: the cheaper guard runs before the expensive one, and nothing was called "optimized" without a before/after number; scene fits inside baseline device budgets (Draw calls <= 1,000, Triangles <= 1,000,000)
- [ ] Nothing was hand-written that the project, the Luau standard library, or an engine API already provides; no wrapper or abstraction added without a caller
- [ ] **Everything the user asked for was delivered in full** — brevity trimmed ceremony, never capability, and no requested behavior was silently dropped as "not needed"
- [ ] Brevity cost no readability: one statement per line, descriptive names kept, blank lines and section headers intact, no compressed one-liners a reader must decode
- [ ] Frame-critical or bulk work is budgeted in time and spread across frames rather than stalling one; the design still runs on a low-end device
- [ ] The finishing pass was run: nil assumptions, zero/negative/NaN, empty collections, staleness after each yield, double-fire in one frame, the player leaving mid-operation, and state carried over by a reused or pooled object
- [ ] Remote payloads survive serialization (no functions, no mixed tables, no `nil` holes, no metatable-bearing objects, no instances the receiver cannot see) and numeric arguments from clients are rejected with `math.isfinite` before any range check
- [ ] All remote handlers validate arguments; all yielding external calls wrapped in `pcall` with retry, each with a stated policy for the final failure (closed / open / loud) — a failed data load never falls through to defaults on a path that saves
- [ ] Each piece of state has exactly one writing owner; mirrors and caches are updated after the authoritative change, never read back to decide anything
- [ ] Where a yield sits between a check and its effect, concurrent operations for the same owner are serialized, and the lock releases on every path including errors
- [ ] Handlers that yield between a check and its use re-validate state after resuming (player still present, instance alive, session unchanged)
- [ ] Data bound for DataStores keeps a JSON-serializable shape (no mixed keys, NaN, userdata); user-generated text shown to other players goes through server-side filtering, **after submission rather than per keystroke**
- [ ] No `UpdateAsync` transform callback yields; any read used to confirm a write took `UseCache = false`; player data is keyed by `UserId` so a deletion request can match it; no credential is hardcoded where the secrets store belongs
- [ ] UI written against the player's `PlayerGui` copy, with `ResetOnSpawn` decided deliberately; nothing sets `Position`/`Size` on a child a layout owns; interactive elements sit inside the safe area
- [ ] Works regardless of the project's framework — no assumptions about folder layout beyond standard Roblox services
- [ ] Every engine fact stated to the user names its basis (api-currency tag, live docs check, API dump, or in-Studio probe); anything unverifiable is labeled unverified with the check that would settle it
- [ ] The closing summary states what was verified and how, open uncertainties, and every assumption made
