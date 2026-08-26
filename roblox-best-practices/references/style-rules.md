# Language & Style Rules

Luau-level conventions that apply to every script this skill writes. SKILL.md keeps the ones needed on every task; this file is the complete set. Deeper language and runtime semantics live in [luau-language.md](luau-language.md).

## Rules

- **Type safety is opt-in.** Do not add `--!strict` (or raise a file's strictness) on your own initiative — it requires an explicit request from the user. When a file or the surrounding project already declares a strictness level, match it for consistency, but never introduce or upgrade strictness unbidden; forcing strict can surface false type errors against loosely-typed engine APIs. Where strict is in use, type-annotate public function signatures, Configuration constants, and State tables.
- **Naming:** `PascalCase` for services and required module tables; `camelCase` for local variables, functions, and Instance references (`purchaseRemote`, `coinLabel`); `UPPER_SNAKE_CASE` for Configuration constants. Module public methods `PascalCase` (`Inventory.AddItem`), private functions `camelCase`. **Spell words out** — abbreviations are quicker to write and slower to read — and do not shout acronyms: `aJsonVariable`, not `aJSONVariable`.
- Always `game:GetService()` — never `game.Workspace`-style direct indexing (exception: `workspace` global is fine).
- **Never use deprecated APIs:** `wait()`/`spawn()`/`delay()` → `task.wait()`/`task.spawn()`/`task.delay()`; `:connect()`/`:wait()` lowercase → `:Connect()`/`:Wait()`; `Body*` movers (`BodyVelocity`/`BodyGyro`/`BodyPosition`/...) → constraints (`LinearVelocity`, `AlignOrientation`, `AlignPosition`); `Humanoid:LoadAnimation` → `Animator:LoadAnimation`; `Part.Velocity`/`RotVelocity` → `AssemblyLinearVelocity`/`AssemblyAngularVelocity`; `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame` → `PivotTo`/`GetPivot`; `Camera.CoordinateFrame` → `Camera.CFrame`; `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`; InputContext/InputAction camera replication → `Player:GetCameraState()`; `tick()` → the right time API per [references/luau-language.md](luau-language.md#time-apis--one-job-each).
- **Deprecated is not the same as discouraged.** Setting `Instance.new`'s second `parent` argument (create → set properties → parent last is a *performance* preference), or `FireAllClients` where a targeted list would do, are Advisory choices, not deprecated APIs — don't report them as violations. Full split: [references/false-positives.md](false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).
- Guard external/yielding calls (`DataStore`, `MarketplaceService`, `HttpService`, `TeleportService`) with `pcall` and a retry policy. Never let an unprotected yield crash a player flow.
- **Reuse before writing, and keep it dense.** Search the project, the Luau standard library, and the engine API before writing a helper — a second implementation of the same thing is a bug factory. Prefer guard clauses to nesting, and add no wrapper, abstraction, or defensive branch that has no caller. Two limits bound this: it **never reduces what gets delivered** (a function short because it does less than asked has failed), and it **never costs readability** — one statement per line, descriptive names, blank lines between logical groups, no clever one-liners. "Less code" means less *work*, not less whitespace. Catalog of what already exists, the density rules, and the optional Ponytail overlay: [references/minimal-code.md](minimal-code.md).
- One responsibility per ModuleScript. No circular `require`s — if two modules need each other, extract the shared part into a third module or pass dependencies at init time.
- Prefer `CollectionService` tags + `Attributes` to bind behavior to Instances — this is the most framework-agnostic wiring mechanism and survives any folder structure.
- **Stay framework-agnostic by construction.** Core logic relies only on standard Roblox services and engine features; a community library's way of doing something is an overlay ([references/community-libraries.md](community-libraries.md)), never the baseline. Never assume a folder layout or framework beyond standard services — bind by tags/attributes, discover by service, and let the community-library check (not a hard-coded path) decide which idioms apply.
- **Documentation Comments follow the project; this skill's style is the recommendation.** Default block: `--[[ ... ]]` above the function, ordered desc params returns; Moonwave `--[=[ ... ]=]` or `---` when that is the project's style. Descriptions are at most 3 lines and 250 characters, implementation-agnostic and free of volatile detail, English preferred, no em dashes or double-hyphen dashes as punctuation, no emoji. Tags use Moonwave syntax (`@param <name> <type> -- <description>`). **In-body comments are banned in delivered code** — write self-documenting names and structure instead; existing notes in others' code stay untouched ([section-layout.md](section-layout.md#in-body-comments-banned-self-documenting-code-instead)).
- **`const` for bindings that must not be rebound** [GA in Studio]. `const` is a contextual keyword valid anywhere `local` is, and it freezes the *binding*, not the value — a `const` table is still mutable, so it is not a substitute for `table.freeze` on shared config. Use it for Services, required modules, and Configuration constants, which are never legitimately reassigned; it is not required, and never retrofit it across an existing file unasked. Details and the `export` interaction: [references/luau-language.md](luau-language.md#const-bindings).
- Deeper language/runtime rules — typing discipline, `task.spawn` vs `task.defer`, deferred engine events, error handling, time APIs, `@native`: [references/luau-language.md](luau-language.md).

## Where code lives, and what runs it

Placement is a correctness decision before it is an organizational one: the container decides whether code runs at all, on which side, and whether an exploiter can read it.

| Container | Replicates to clients | What runs there |
|---|---|---|
| `ServerScriptService` | No | Server `Script`s (`RunContext` `Server` or `Legacy`) and ModuleScripts. The default home for game logic |
| `ServerStorage` | No | Nothing executes; ModuleScripts and assets wait here to be required or cloned |
| `ReplicatedStorage` | Yes | ModuleScripts shared by both sides, and `Script`s with `RunContext = Client`. **Not** LocalScripts |
| `ReplicatedFirst` | Yes, first | The minimum needed before anything else loads (a loading screen). Keep it small |
| `StarterPlayerScripts` | Copied to the player | Client scripts that live for the session |
| `StarterCharacterScripts` | Copied per character | Client scripts that die and respawn with the character |
| `StarterGui`, `StarterPack` | Copied to the player | UI scripts, and tools with their scripts |
| `Workspace` | Yes | Server scripts driving specific instances. Everything here is visible to every client |

- **`Script.RunContext` is the modern control**, with values `Legacy` (run only where a server Script legitimately runs), `Server`, and `Client`. A `Script` with `RunContext = Client` is how client code lives outside the Starter containers, in `ReplicatedFirst` or `ReplicatedStorage`. `LocalScript` has no `RunContext` and is client-only by definition; it is **not deprecated**, and a project built on LocalScripts is correct — never flag it.
- **Anything in a replicating container is readable by an exploiter**, including scripts that are disabled or never run ([security.md](security.md#threat-model-assume-all-of-these-exist)). Secrets, enforcement lists, and loot tables live server-side, and the split is a project decision made at the start rather than a cleanup later.

## Commonly misremembered APIs (check before writing, before flagging)

These are repeatedly invented or misremembered. As author, verify a member you are not certain of against the **versioned API dump** ([api-currency.md](api-currency.md#how-to-verify-the-toolbox)) — the reference page tells you what a member does, the dump tells you whether it exists; as reviewer, never flag the correct form of any row below.

**A member missing from create.roblox.com is not an invented member.** The documentation site trails the engine, so a name you cannot find there may simply be new. Confirm against the dump before calling anything nonexistent — this skill has previously flagged three shipped members as fabrications on exactly that mistake.

| Often written or claimed | Reality |
|---|---|
| `Humanoid:LoadAnimation(track)` | Deprecated — load through an `Animator`: `humanoid:FindFirstChildOfClass("Animator"):LoadAnimation(anim)` |
| `Part.Velocity = v` / `.RotVelocity` | Deprecated — use `AssemblyLinearVelocity` / `AssemblyAngularVelocity` |
| `player:GetMouse()` as the input plan | Legacy mouse object; prefer the Input Action System, else `UserInputService`/`ContextActionService` |
| Invented members (`Script.Running`, `Player.IsPlaying`, ...) | Not real. A name absent from **the API dump** does not exist; absence from the reference page only means it is undocumented |
| `UIShadow.ApplyShadowMode` | Never shipped under that spelling. `UIShadow.Mode` **is** real and is not a misremembering — see [api-currency.md](api-currency.md#engine) |
| `GuiService:GetUIScaleMultiplier`/`SetUIScaleMultiplier` | **Real and shipped.** Undocumented, not fabricated. Never flag these |
| `TeleportService:ReserveServer` | Deprecated — use `ReserveServerAsync`, or `TeleportOptions.ShouldReserveServer` with `TeleportAsync` |
| `workspace.Players`, `game.CoreScriptService` | Wrong names; services come only from `game:GetService("...")` |
| `UIFlexLayout` | **Not a class.** Flex lives on `UIListLayout` (`HorizontalFlex`/`VerticalFlex`/`ItemLineAlignment`) plus a `UIFlexItem` parented to the child that should flex ([ui-crossplatform.md](ui-crossplatform.md#layouts)) |
| Made-up enum members (`Enum.Material.Whatever`) | Enums are closed sets — grep the enum's `.md` page instead of guessing |
| `RunService:BindToRenderStep(...)` in server code | Client-only; server frame work belongs on `Heartbeat` |
