# Luau Language & Runtime

Language-level and scheduler-level rules that go deeper than SKILL.md's Language & Style section. For the newest items, the verify-first rule from SKILL.md → Environment & Scale applies: confirm availability in the target environment before relying on them.

## Contents

- [Values, truth, and coercion](#values-truth-and-coercion)
- [Tables: references, copies, and shape](#tables-references-copies-and-shape)
- [Modules: what require actually returns](#modules-what-require-actually-returns)
- [Typing](#typing)
- [Modern idioms](#modern-idioms)
- [What the sandbox removes](#what-the-sandbox-removes)
- [Standard library — recent additions](#standard-library--recent-additions)
- [Scheduling: the task library](#scheduling-the-task-library)
- [Deferred engine events](#deferred-engine-events)
- [Error handling](#error-handling)
- [Time APIs — one job each](#time-apis--one-job-each)
- [Attributes](#attributes)
- [The linter's vocabulary](#the-linters-vocabulary)

## Values, truth, and coercion

The rules that silently produce wrong behavior rather than an error. None is exotic; all are routinely written wrong by someone who learned another language first.

- **Only `false` and `nil` are falsy.** `0` and `""` are **truthy**. `if playerCount then` is true when the count is zero, and `if text then` is true when the text is empty. Test what you mean: `if playerCount > 0 then`, `if text ~= "" then`.
- **`and`/`or` return values, not booleans.** `a and b` yields `b` when `a` is truthy, else `a`; `a or b` yields `a` when truthy, else `b`. That makes `local name = customName or DEFAULT_NAME` idiomatic, and makes `x and y or z` a trap whenever `y` can itself be `false` or `nil` -- use the `if x then y else z` expression instead.
- **Arithmetic coerces strings, concatenation coerces numbers.** `100 + "7"` is `107`; `"Pi is " .. math.pi` is a string; a non-numeric string throws. Never lean on either direction across a trust boundary: `typeof()` first, then convert deliberately with `tonumber`/`tostring`/`string.format`.
- **Enums: write the full enum name.** Assigning a number or string to an enum-valued property works by coercion and reads as a magic value; `Enum.Material.Neon` says what it is.
- **String comparison is lexicographic**, so `"100" < "20"` is true. Sort numbers as numbers.
- **Numbers are doubles:** roughly 15 significant digits, exact integers to 2^53, past which counters stop incrementing ([genres.md](genres.md#simulator--tycoon--idle)). Roblox ids are int64 and must never take a lossy float path.
- Literals may be written `0xFF`, `0b1100`, `12e3`, and `1_000_000`; the underscore form is worth using for large tunables. `math.floor(n) == n` is the integer test, and `math.modf` splits a number toward zero.

## Tables: references, copies, and shape

- **A table variable is a reference.** `local b = a` gives two names for one table. Passing a table into a function passes that same reference, so a function that mutates its argument is mutating the caller's data unless that was the contract.
- **`table.clone` is shallow**, which is usually what you want; nested tables still share. A deep copy is a recursive helper, and one the project probably already has ([minimal-code.md](minimal-code.md#already-exists--do-not-hand-roll-these)).
- **`table.freeze` is shallow too.** Freeze nested tables as well when the whole config must be immutable, and check with `table.isfrozen`. A frozen table errors at the mutation site instead of corrupting shared state quietly.
- **Arrays are contiguous `1..n`; dictionaries are keyed.** Keep them apart. A mixed table has an undefined `#`, fails DataStore encoding, and is mangled in transit through a remote ([patterns/network.md](patterns/network.md#what-survives-a-remote-call)).
- **A `nil` in the middle of an array is a hole**, after which `#` may report either side of it. Remove with `table.remove`, which closes the gap, rather than assigning `nil` into the middle.
- **Generalized iteration is the modern default:** `for key, value in dictionary do`. `pairs`/`ipairs` still work, are not deprecated, and are never a finding -- Roblox's own introductory tutorials still teach them as the primary form ([false-positives.md](false-positives.md#typing--do-not-flag-the-project-for-tools-it-does-not-use)).
- **Do not mutate a table while iterating it.** Collect first and apply after, or iterate a copy. When you must remove several entries in place, **walk the array backwards** (`for i = #list, 1, -1`): `table.remove` shifts every later index down, so a forward loop skips the element that slid into the gap.
- **Weak tables (`__mode`) are not a cleanup strategy.** To know whether an instance still exists, use `CollectionService:GetInstanceRemovedSignal` or `AncestryChanged`; the engine documentation says so, and the cleanup rules here assume an explicit teardown path regardless ([patterns/lifecycle.md](patterns/lifecycle.md#lifecycle--cleanup)).

## Modules: what require actually returns

- **One instance per context, cached.** `require` runs a ModuleScript once and hands every later caller the same value, so module-level state is shared by every script that requires it on that side.
- **The client and the server get different copies.** A ModuleScript required from both sides of the boundary returns a **separate** instance to each, with separate state. Shared *code*, never shared *state*: anything both sides must agree on travels over a remote or an attribute.
- That same one-instance-per-VM rule is why a command-bar `require` cannot tell you anything about live game state ([verification.md](verification.md#studio-native--mcp-environments)).
- **A `require` path the checker cannot resolve statically is a path it cannot type.** Building a module path at runtime, or branching on one, does not error — it silently drops that module's types. Keep requires literal and at the top of the file, which the VARIABLES layout already forces.
- **Circular requires error** (`Requested module was required recursively`). Extract the shared part into a third module, or pass the dependency in at init time ([style-rules.md](style-rules.md)).
- Return a table of functions rather than a bare function unless the module genuinely is one operation: it names its members at the call site and leaves room for a second.

## Typing

- `--!strict` per SKILL.md; annotate public signatures, Configuration constants, and State tables.
- **Share types through a dedicated types module:** `export type Loadout = { ... }` in one ModuleScript, consumed as `Types.Loadout` on both server and client — one definition, zero drift.
- **Precise table & dictionary typing:** prefer explicit optionality `{ [string]: ItemData? }` when indexing an arbitrary key can return `nil`, rather than assuming `{ [string]: ItemData }`.
- **The cast operator `::` silences the checker — treat every cast as a claim you must have already proven.** Cast to *narrow* after a runtime check (`value :: string` after `typeof(value) == "string"`), never to force incompatible shapes through. An unchecked cast is a suppressed error, not a fix.
- Generics (`local function first<T>(list: {T}): T?`) and type packs (`T...`) beat `any` in reusable utilities.
- **`unknown` is the honest type for untrusted input, not `any`.** Both are top types, but `any` may be used as any other type with no further checks while `unknown` **forces a refinement first**. Typing a remote's payload `unknown` makes the checker demand the validation the server owes anyway ([security.md](security.md#server-side-validation-layers)); typing it `any` silently excuses it. `never` is the bottom type, and a branch inferred `never` is the checker telling you it is unreachable.
- **Refinements narrow on truthiness, `type(x) == "..."`, equality against a literal (which narrows to that singleton), and `assert`,** and compose through `and`/`or`/`not`. On Roblox types, **`IsA` refines too**, and `Instance.new` and `game:GetService` have their return types inferred — so an explicit annotation on those is redundant, never a defect.
- **A method's `self` is not typed for you.** Luau does not share `self` across a class's methods, because a caller may pass anything as `self`, so each `function Class.method(self: Class, ...)` needs its own annotation. Luau's docs state the intent to restrict `:`-defined functions to a shared `self` type later; until then, do not read the repetition as a mistake.
- **Read-only table members** — prefix a property or indexer with `read` to forbid writes through that type: `{ read x: number }` and `{ read [string]: Part }`. Use it on types handed to consumers that should only observe (config snapshots, replicated state views); it documents the contract and the checker enforces it, which is cheaper than a runtime guard. `write` exists as the mirror modifier. Landed in Luau 0.721; requires the new solver for full enforcement, so treat it as **[Verify]** in old-solver projects.
- **Extern types replace the old `class` tag.** Type declaration files now use `declare extern type`; the `declare class` and `extern class` spellings were removed in Luau 0.727. This only affects hand-written declaration files — ordinary gameplay code never declares extern types. Do not "fix" a project to the old spelling.
- **User-defined type functions** run at analysis time and can build types programmatically: a `type function` body uses the `types` library (`types.unionof`, `types.singleton`, `types.newfunction`) and can inspect its inputs (`ty:is("table")`, `ty:properties()`). `keyof` is the documented built-in type function, taking a table type and producing a union of singletons of its property names. `issubtypeof` is **not** a built-in of that kind — it is a method on a type inside a type function (`ty:issubtypeof(super)`), alongside `ty:is(tag)`. The type-function environment is restricted to a fixed set of globals (`assert`, `error`, `print`, `type`, `typeof`, `next`, `pairs`, `ipairs`, `getmetatable`, `setmetatable`, and the `math`/`table`/`string`/`bit32`/`utf8`/`buffer` libraries). These require the **new type solver** — see below for what that means today, and never flag their absence in old-solver projects ([false-positives.md](false-positives.md#typing--do-not-flag-the-project-for-tools-it-does-not-use)).

### The new type solver — what is on by default

Reached **[GA] general release** ([api-currency.md](api-currency.md#luau-language-and-libraries)). It is a rewrite, not a tweak: better inference, fewer false positives, read-only table properties, refinements that track variable changes, type functions, and relaxed casting rules.

- **Default for `--!nocheck` and `--!nonstrict`** for all users. Projects on those modes are already using it.
- **`--!strict` stays on the old solver by default** and must opt in explicitly. The old solver remains available during the migration window; confirm it is still there before relying on it ([api-currency.md](api-currency.md#luau-language-and-libraries)).
- Configure per place with the workspace properties **`UseNewLuauTypeSolver`** and **`LuauTypeCheckMode`** (nocheck / nonstrict / strict).
- **`nonstrict` was redesigned to report only definite runtime errors**, not speculative warnings. A nonstrict file that stays quiet is behaving correctly — never flag that as missing type safety.
- It is **not fully backwards compatible**: enabling it under strict mode on a large existing codebase can surface a wall of new errors. That is a migration project the user chooses, never something this skill starts on its own ([SKILL.md](../SKILL.md#language--style-rules)).

## Modern idioms

- **Generalized iteration:** `for k, v in t do` — no `pairs`/`ipairs` needed. (`pairs`/`ipairs` still work and are not deprecated; never flag either style, just prefer the direct form in new code.)
- **String interpolation:** `` `Hello {player.Name}` `` over concatenation chains.
- `continue`, compound assignment (`+=`, `-=`, `*=`, `..=`), floor division (`//`), and `if x then a else b` expressions are standard Luau — use them where they read better.
- **`table.freeze` constant tables.** Module-level config/constant tables should be frozen at declaration: writes then error at the mutation site instead of silently corrupting shared state. Freezing is *shallow* (nested tables need their own freeze) and checkable with `table.isfrozen`. Don't freeze tables that legitimately mutate.
- **Yielding inside iterators** is supported since Luau 0.722: a custom iterator function may now yield, so generator-style iteration over paged or async sources no longer has to be rewritten as a manual loop. The yield still costs a frame like any other — do not put one inside a hot loop, and the re-validate-after-yield rule (Non-Negotiable #7) applies to every iteration that yields, not just to the loop as a whole.

### `const` bindings

**[GA] in Roblox Studio** — the keyword is live in-game and in Studio with no beta flag ([api-currency.md](api-currency.md#luau-language-and-libraries)). `const` is a **contextual keyword**, valid exactly where `local` is valid, so adding it can never break existing code that uses `const` as an identifier.

```lua
const MAX_HEALTH = 100
const RETRY_DELAY: number = 0.5
const Players, ReplicatedStorage = game:GetService("Players"), game:GetService("ReplicatedStorage")
const function clamp01(n: number): number return math.clamp(n, 0, 1) end
```

Semantics that matter:

- **It freezes the binding, not the value.** A `const` table is still fully mutable through its fields. `const` is therefore **not** a replacement for `table.freeze` on shared configuration — they solve different problems and pair well: `const CONFIG = table.freeze({ ... })` locks both the name and the contents.
- **Initialization is required.** A bare `const x` is an error; there is no deferred assignment.
- **All reassignment is blocked**, including compound forms (`+=`, `..=`).
- Normal lexical scoping and shadowing apply.

Where to use it: Services, required modules, and Configuration constants — bindings that are never legitimately reassigned, which is most of the VARIABLES section. It makes accidental rebinding in a long file or a closure a compile-time error instead of a debugging session.

Where not to: State Management variables (they exist to change), and **existing files** — retrofitting `const` across a codebase is a stylistic sweep the user must ask for, not something to do while passing through ([SKILL.md](../SKILL.md#user-authority)).

### `export` value semantics

Luau 0.723 implemented export-by-value semantics for modules, extending `export` beyond `export type`. Exported values are **`const` by default**, which is the RFC's stated motivation for introducing `const` at all: it prevents a module reassigning a binding internally while external consumers still observe the original value.

**Status in Roblox Studio is [Verify].** Confirmed in upstream Luau; this skill could not confirm it is live in Studio. Until you verify it in the target place, keep using the standard `local Module = {} ... return Module` shape, which is unaffected and remains correct.

## What the sandbox removes

Luau is not Lua 5.1 minus nothing. These are gone or restricted at the language level, so an answer that reaches for them is wrong before it reaches Roblox's own restrictions.

- **Removed entirely:** the `io` and `package` libraries, `dofile`, `loadfile`, and `string.dump`/`string.load`. The `debug` library is cut back to the memory-safe parts (`debug.traceback`, `debug.profilebegin`/`profileend`, `debug.setmemorycategory`, `debug.dumpcodesize`).
- **`os` keeps only `clock`, `date`, `difftime`, and `time`.** No `os.execute`, `os.exit`, `os.getenv`, or `os.remove`.
- **`collectgarbage` accepts only `"count"`.** There is no way to force a collection, so "call `collectgarbage`" is never the answer to a memory problem — measure with it, then fix the retention ([performance.md](performance.md#memory)).
- **`newproxy` takes only `true`/`false`/`nil`.**
- **The global table, the library tables, and the string metatable are read-only.** Monkey-patching a built-in fails, whether by assignment, `rawset`, or `setmetatable`.
- **`getfenv`/`setfenv` still exist** in Roblox for backwards compatibility, but using either forces the compiler into a slower dynamic path for the whole script and is banned here regardless.

Rejected outright, so never suggested as a workaround: **`goto`**, **integer types and the `&`/`|` bitwise operators** (`bit32` is the answer — all numbers are doubles), **ephemeron weak tables**, and **`__gc` finalizers**. That last one matters: there is no finalizer to hang cleanup on, which is why every rule here demands an explicit teardown path ([patterns/lifecycle.md](patterns/lifecycle.md#lifecycle--cleanup)).

## Standard library — recent additions

Confirmed available per [api-currency.md](api-currency.md) — use them, and don't treat them as unknown.

- **`vector` library** — a native, SIMD-backed vector value type: `vector.create(x, y, z)` (3 or 4 components), component access (`.x`/`.y`/`.z`), the `vector.zero`/`vector.one` constants, first-class operator support, `vector.magnitude`/`normalize`/`dot`/`cross`/`angle`, plus the component-wise helpers `vector.floor`/`ceil`/`abs`/`sign`/`clamp`/`max`/`min`. **There is no `vector.lerp`** — the documented library has no interpolation function; `math.lerp` is the scalar one, and a vector lerp is `a + (b - a) * t`. Prefer it for heavy vector math to cut GC pressure ([performance.md](performance.md#cpu)). It is distinct from the engine `Vector3` datatype; both coexist in Roblox.
- **`buffer` library** — fixed-size mutable binary blocks for serialization and large numeric arrays ([performance.md](performance.md#memory)); recent engine versions add **`buffer.readbits`/`buffer.writebits`** for bit-level packing.
- **`math` additions** — `math.map` (remap a value between two ranges), `math.lerp`, and the classifiers `math.isnan`/`math.isinf`/`math.isfinite` (clearer and cheaper than hand-rolled checks; pair `isnan`/`isinf` with the DataStore serialization guards in [patterns/data.md](patterns/data.md#data-persistence)).

### Compiler and analysis changes worth knowing

- **Immediately invoked lambdas are now inlined** — the `(function() ... end)()` idiom no longer carries a call-overhead penalty, so use it freely where it improves scoping.
- **Refinements survive loops** — a narrowed type stays narrowed across loop iterations, removing a common source of spurious "possibly nil" errors.
- Improved inference for function arguments passed as table literals, and a `math.round` fix for negative zero.

Not applicable to Studio work, despite appearing in Luau release notes: the embedder **C API** additions (`lua_memorydump`, `lua_callhook`, and similar) and **double-precision vector** builds (a VM build-time option). Do not recommend these for a Roblox project. Require-by-string is the partial exception: string requires using the `@rbx` alias exist in Studio for experiences opted into the Input Action System path — see [api-currency.md](api-currency.md#luau-language-and-libraries) — while ordinary requires still resolve through Instances.

## Scheduling: the task library

- `task.spawn(fn, ...)` resumes the new thread **immediately** (the caller continues after the thread's first yield). `task.defer(fn, ...)` schedules it for the **end of the current resumption cycle**. Prefer `defer` when nothing depends on the code having run before the caller's next line — it batches better and avoids re-entrancy surprises; use `spawn` only when immediate execution is genuinely required.
- **Errors inside spawned/deferred/delayed threads do not propagate to the caller** — they only reach the output. Anything important launched this way carries its own `pcall`/`xpcall` with logging.
- `task.cancel(thread)` aborts a scheduled thread. Keep the handle for anything that may need aborting (delayed effects, timers) and cancel it in the owner's teardown — a pending `task.delay` on a destroyed object is a latent bug.

## Deferred engine events

`Workspace.SignalBehavior` decides whether a handler runs at fire time or later in the frame. **Read the property; never assume.** The enum value `Default` currently resolves to **Immediate** and is documented to become Deferred eventually, while new places from Roblox's templates ship set to **Deferred** and Server Authority forces it ([server-authority.md](server-authority.md)). Under Deferred:

- Handlers run at the next **resumption point** -- input processing, `PreRender`, `PreAnimation`, `PreSimulation`, `PostSimulation`, `Heartbeat`, a `task.wait`/`spawn`/`delay`, or `BindToClose` -- **not synchronously at fire time**. Never write code that assumes a handler's side effects are visible on the line after the state change that fired it.
- A connection made after a fire within the same resumption cycle does not receive that fire — connect before you cause the event.
- Re-entrant fire chains are depth-limited (10) and then dropped — recursive fire-inside-handler designs fail silently; restructure them as queues.
- `Instance.Destroying` handlers run after destruction has already completed — capture any state you need from the instance *before* it dies, not inside the handler.

Code that follows the skill's normal rules (connect at setup time, react to events, no hidden ordering dependencies) is automatically safe under both behaviors — this section matters when reviewing code that isn't.

## Error handling

- **Every `pcall` needs a handled failure branch.** `local ok, err = pcall(...)` where `ok == false` is silently ignored hides real bugs; log the error with context or recover explicitly. A genuinely ignorable failure (an optional cosmetic load) states its skip-safety in the function's Documentation Comment — the body carries no note ([section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead)).
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

## Attributes

Attributes are `@name` annotations placed before a function that adjust compiler, analyzer, or runtime behavior. **They are not user-definable** — only the documented set exists, so never invent one. The parameterized form is `@[name(...)]`, and several attributes may share a single `@[]` block.

Two are documented today:

| Attribute | Parameters | Effect |
|---|---|---|
| `@native` | none | Compiles this one function natively. Does **not** apply recursively to nested functions. |
| `@deprecated` | `use`, `reason` (both optional) | Linter warning at every call site, plus deprecated styling in autocomplete/LSP. |

### Script directives

Directives are comments beginning with `!` on the first lines of a script, and they are the whole set — there is no user-defined directive:

| Directive | Effect |
|---|---|
| `--!strict` / `--!nonstrict` / `--!nocheck` | Type-checking mode. Opt-in only; never added on this skill's initiative ([style-rules.md](style-rules.md)) |
| `--!native` | Native code generation for the whole script |
| `--!optimize 0` / `1` / `2` | Bytecode optimization level: disabled, baseline, enhanced. Pair `2` with `--!native` in compute-heavy modules |
| `--!nolint` | Suppresses lint warnings. A blunt instrument — prefer fixing the warning, and never add it to silence a real one |

Studio also bolds the word after `TODO` in a comment, which makes `-- TODO fix the respawn race` findable. That is a marker, not prose commentary: the in-body comment ban still holds for delivered code ([section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead)).

### `@native` and native codegen

- `--!native` for whole compute-heavy ModuleScripts, per [performance.md](performance.md#cpu) — don't scatter it; it costs memory.
- `--!optimize 2` instructs the compiler to apply maximum bytecode optimizations (inlining, constant folding, register allocation). Pair `--!native` with `--!optimize 2` in modules dedicated to heavy mathematical simulation, custom pathfinding, or batch raycast calculations.
- The `@native` **function attribute** compiles just one function natively, finer-grained than the whole-script directive; prefer it when a single hot function qualifies. Because it is not recursive, a hot closure defined *inside* an `@native` function is not itself native; hoist it or annotate it separately.
- **Where it pays:** functions called repeatedly, doing math over tables and `buffer`s. Top-level code that runs once gains nothing, and a script dominated by engine API calls gains little.
- **Where it compiles badly:** `getfenv`/`setfenv` (banned here anyway), unannotated parameters, and built-ins handed non-numeric arguments. **Annotate argument types**, `Vector3` especially, or the compiler guesses and pays for the check.
- **There are hard ceilings** on natively compiled code: 64K instructions per code block, 32K internal blocks, 1 million instructions per script, and a per-experience allocation limit that stops compiling further scripts once exhausted. `debug.dumpcodesize()` reports consumption. That shared budget is the concrete reason not to sprinkle `--!native` everywhere.

### `@deprecated`

Use it when retiring a public function in a shared module instead of deleting it mid-migration: callers get a linter warning pointing at the replacement, and nothing breaks at runtime.

```lua
--[[
	Grants a player their starting loadout.
]]
@[deprecated(use = "Loadout.Grant", reason = "superseded by the loadout module")]
function Inventory.GiveStarterItems(player: Player)
```

Two review consequences. Marking a project's own function `@deprecated` is a **suggestion**, never something to add unasked. And a call to an `@deprecated` function is a **Correctness** finding only when the replacement is named and reachable; otherwise it is Advisory ([false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them)).

## The linter's vocabulary

Luau ships a linter with a fixed set of named warnings. Naming the warning is more useful to the user than describing it, and several of them are the machine-checkable half of rules stated elsewhere in this skill — cite the name when one applies.

| Warning | Catches |
|---|---|
| `UnknownGlobal` | A global that is neither built in nor defined in the script — almost always a typo or a missing `local` |
| `LocalUnused` / `FunctionUnused` / `ImportUnused` | Dead bindings, which the review checklist already asks about |
| `DeprecatedGlobal` / `DeprecatedApi` | A deprecated global or member, including anything marked `@deprecated` ([style-rules.md](style-rules.md)) |
| `MisleadingAndOr` | The `x and y or z` trap — the linter finds the case where `y` can be `false` or `nil` |
| `ComparisonPrecedence` | `not X == Y` parsing as `(not X) == Y` |
| `TableOperations` | `#` or `ipairs` on a table with no numeric keys or indexer |
| `GlobalUsedAsLocal` / `BuiltinGlobalWrite` | A global that should have been a local; a write to a built-in global |
| `UninitializedLocal` / `DuplicateLocal` / `LocalShadow` | Binding mistakes |
| `ImplicitReturn` / `UnreachableCode` / `DuplicateCondition` / `DuplicateFunction` | Control-flow mistakes |
| `FormatString` / `IntegerParsing` | A malformed format string; a numeric literal that does not parse as intended |
| `UnknownType` / `ForRange` / `UnbalancedAssignment` / `PlaceholderRead` | A bad `type()` comparison string, an impossible numeric `for`, mismatched assignment arity, reading `_` |
| `SameLineStatement` / `MultiLineStatement` | Formatting that hides control flow |
| `CommentDirective` | A malformed or misplaced `--!` directive |

`--!nolint <Warning>` silences one by name, which is the only defensible use of that directive; bare `--!nolint` silences all of them and should be treated as a finding.
