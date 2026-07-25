# Luau Language & Runtime

Language-level and scheduler-level rules that go deeper than SKILL.md's Language & Style section. For the newest items, the verify-first rule from SKILL.md → Environment & Scale applies: confirm availability in the target environment before relying on them.

## Typing

- `--!strict` per SKILL.md; annotate public signatures, Configuration constants, and State tables.
- **Share types through a dedicated types module:** `export type Loadout = { ... }` in one ModuleScript, consumed as `Types.Loadout` on both server and client — one definition, zero drift.
- **The cast operator `::` silences the checker — treat every cast as a claim you must have already proven.** Cast to *narrow* after a runtime check (`value :: string` after `typeof(value) == "string"`), never to force incompatible shapes through. An unchecked cast is a suppressed error, not a fix.
- Generics (`local function first<T>(list: {T}): T?`) and type packs (`T...`) beat `any` in reusable utilities.
- **User-defined type functions** run at analysis time and can build types programmatically: a `type function` body uses the `types` library (`types.unionof`, `types.singleton`, `types.newfunction`) and can inspect its inputs (`ty:is("table")`, `ty:properties()`). Built-ins such as `keyof` and `issubtypeof` sit alongside them (`issubtypeof` landed in Luau 0.724, June 2026). These require the **new type solver** — see below for what that means today, and never flag their absence in old-solver projects ([false-positives.md](false-positives.md#typing--do-not-flag-the-project-for-tools-it-does-not-use)).

### The new type solver — what is on by default

Reached **[GA] general release on 20 November 2025**. It is a rewrite, not a tweak: better inference, fewer false positives, read-only table properties, refinements that track variable changes, type functions, and relaxed casting rules.

- **Default for `--!nocheck` and `--!nonstrict`** for all users. Projects on those modes are already using it.
- **`--!strict` stays on the old solver by default** and must opt in explicitly. The old solver remains available through 2026 for migration.
- Configure per place with the workspace properties **`UseNewLuauTypeSolver`** and **`LuauTypeCheckMode`** (nocheck / nonstrict / strict).
- **`nonstrict` was redesigned to report only definite runtime errors**, not speculative warnings. A nonstrict file that stays quiet is behaving correctly — never flag that as missing type safety.
- It is **not fully backwards compatible**: enabling it under strict mode on a large existing codebase can surface a wall of new errors. That is a migration project the user chooses, never something this skill starts on its own ([SKILL.md](../SKILL.md#language--style-rules)).

## Modern idioms

- **Generalized iteration:** `for k, v in t do` — no `pairs`/`ipairs` needed. (`pairs`/`ipairs` still work and are not deprecated; never flag either style, just prefer the direct form in new code.)
- **String interpolation:** `` `Hello {player.Name}` `` over concatenation chains.
- `continue`, compound assignment (`+=`, `-=`, `*=`, `..=`), floor division (`//`), and `if x then a else b` expressions are standard Luau — use them where they read better.
- **`table.freeze` constant tables.** Module-level config/constant tables should be frozen at declaration: writes then error at the mutation site instead of silently corrupting shared state. Freezing is *shallow* (nested tables need their own freeze) and checkable with `table.isfrozen`. Don't freeze tables that legitimately mutate.

## Standard library — recent additions

Confirmed available per [api-currency.md](api-currency.md) — use them, and don't treat them as unknown.

- **`vector` library** — a native, SIMD-backed vector value type: `vector.create(x, y, z)` (3 or 4 components), component access (`.x`/`.y`/`.z`), the `vector.zero`/`vector.one` constants, first-class operator support, and `vector.magnitude`/`normalize`/`dot`/`cross`/`angle`. Prefer it for heavy vector math to cut GC pressure ([performance.md](performance.md#cpu)). It is distinct from the engine `Vector3` datatype; both coexist in Roblox.
- **`buffer` library** — fixed-size mutable binary blocks for serialization and large numeric arrays ([performance.md](performance.md#memory)); recent engine versions add **`buffer.readbits`/`buffer.writebits`** for bit-level packing.
- **`math` additions** — `math.map` (remap a value between two ranges), `math.lerp`, and the classifiers `math.isnan`/`math.isinf`/`math.isfinite` (clearer and cheaper than hand-rolled checks; pair `isnan`/`isinf` with the DataStore serialization guards in [patterns.md](patterns.md#data-persistence)).

### Compiler and analysis changes worth knowing (2026)

- **Immediately invoked lambdas are now inlined** — the `(function() ... end)()` idiom no longer carries a call-overhead penalty, so use it freely where it improves scoping.
- **Refinements survive loops** — a narrowed type stays narrowed across loop iterations, removing a common source of spurious "possibly nil" errors.
- Improved inference for function arguments passed as table literals, and a `math.round` fix for negative zero.

Not applicable to Studio work, despite appearing in Luau release notes: the embedder **C API** additions (`lua_memorydump`, `lua_callhook`, and similar), **double-precision vector** builds (a VM build-time option), and **require-by-string / `@self`** (standalone runtimes; Studio resolves modules through Instances). Do not recommend these for a Roblox project.

## Scheduling: the task library

- `task.spawn(fn, ...)` resumes the new thread **immediately** (the caller continues after the thread's first yield). `task.defer(fn, ...)` schedules it for the **end of the current resumption cycle**. Prefer `defer` when nothing depends on the code having run before the caller's next line — it batches better and avoids re-entrancy surprises; use `spawn` only when immediate execution is genuinely required.
- **Errors inside spawned/deferred/delayed threads do not propagate to the caller** — they only reach the output. Anything important launched this way carries its own `pcall`/`xpcall` with logging.
- `task.cancel(thread)` aborts a scheduled thread. Keep the handle for anything that may need aborting (delayed effects, timers) and cancel it in the owner's teardown — a pending `task.delay` on a destroyed object is a latent bug.

## Deferred engine events

`Workspace.SignalBehavior` defaults to **Deferred** in new experiences; older places may still run Immediate — check the property, never assume either way. Under Deferred:

- Handlers run at the next invocation point later in the frame, **not synchronously at fire time**. Never write code that assumes a handler's side effects are visible on the line after the state change that fired it.
- A connection made after a fire within the same resumption cycle does not receive that fire — connect before you cause the event.
- Re-entrant fire chains are depth-limited (10) and then dropped — recursive fire-inside-handler designs fail silently; restructure them as queues.
- `Instance.Destroying` handlers run after destruction has already completed — capture any state you need from the instance *before* it dies, not inside the handler.

Code that follows the skill's normal rules (connect at setup time, react to events, no hidden ordering dependencies) is automatically safe under both behaviors — this section matters when reviewing code that isn't.

## Error handling

- **Every `pcall` needs a handled failure branch.** `local ok, err = pcall(...)` where `ok == false` is silently ignored hides real bugs; log the error with context or recover explicitly. If a failure is genuinely ignorable (optional cosmetic load), say so in a comment.
- For telemetry, use `xpcall(fn, function(err) return debug.traceback(tostring(err), 2) end)` — the handler runs at throw time so the stack is still live; a plain `pcall` has already unwound it.
- `assert(value, message)` evaluates `message` eagerly even on success — in hot paths use `if not value then error(...) end`, or keep the message a precomputed string, never a concatenation/format call.
- `error(msg, 2)` blames the *caller* — use level 2 in argument-validation helpers so the reported location is the misuse site. Error values may be tables (`error({ code = "NO_FUNDS" })`) for structured handling; document that contract wherever it's used.

## Time APIs — one job each

| API | Use for | Not for |
|---|---|---|
| `os.clock()` | Durations and benchmarks (monotonic, high precision) | Wall-clock timestamps |
| `time()` | Gameplay timers (seconds since this game instance began running) | Anything persisted across sessions |
| `os.time()` | Persistent timestamps (Unix epoch, UTC): offline progress, cooldown expiry in saved data | Sub-second precision |
| `DateTime` | Storing, formatting, and parsing calendar timestamps (timezone-safe) | — |
| `workspace:GetServerTimeNow()` | Client-server synchronized clock: lag compensation, synced countdowns | — |

`tick()` is deprecated (timezone-dependent wall clock) — replace it per the table.

## Native codegen

- `--!native` for whole compute-heavy ModuleScripts, per [performance.md](performance.md#cpu) — don't scatter it; it costs memory.
- The `@native` **function attribute** compiles just one function natively — finer-grained than the whole-script directive; prefer it when a single hot function qualifies. Verify availability in the target environment first.
