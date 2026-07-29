---
name: roblox-best-practices
description: Framework-agnostic Roblox/Luau coding standards. Use when writing, reviewing, or refactoring any Luau code (Script, LocalScript, ModuleScript) in a Roblox project, or when the user asks to keep best practices in mind as standing guidance — enforces the VARIABLES/FUNCTIONS/INITIALIZATION section layout, naming rules, performance, memory, networking, and security best practices regardless of the project's framework, folder structure, or game genre. Supports two modes — Default (apply this skill's conventions as-is) and Adaptive (study the project's existing coding conventions first, confirm with the user, then apply best practices in the project's own style) — adapts to community libraries (ProfileStore, Packet, Trove, Knit, Fusion, ...) when the project uses them, and honors user-selected supervision levels (!ask / !bal / !go) controlling how often the agent confirms before acting.
---

# Roblox Game Development Best Practices

Framework-agnostic standards for writing clean, efficient, lightweight, and resource-frugal Luau code. These rules fit any architecture (single-script, module-based, Knit, actor-based, ECS, etc.) — they govern *how each script is written*, not how the project is structured.

**Goals, in priority order:** correct → secure (server-authoritative) → efficient (CPU/memory/network) → readable → consistent.

## Session Invariants (must survive compaction)

Long sessions get summarized, and a summary that drops these rules silently downgrades every file written afterwards. The card below is the irreducible core. Two standing obligations:

1. **Carry it forward verbatim.** Any summary, handoff, plan, or task note you produce reproduces this card as-is. It is active instruction, not background context — never compress it into "follow the Roblox skill".
2. **Re-read before acting when it is gone.** Before writing or reviewing any Luau, if the card's full text is not visible in your current context, re-read this file first. Never reconstruct these rules from memory; a half-remembered layout or doc-comment rule is worse than none, because it looks deliberate.

```text
ROBLOX LUAU SKILL - INVARIANT CARD
1  Three sections, this order:
   -- // VARIABLES // --   Services > Modules > Objects > Configuration > State Management
   -- // FUNCTIONS // --   definitions only (ModuleScript: Private before Public)
   -- // INITIALIZATION // --   everything that runs
2  UDD (doc comments) - every function gets a --[[ ]] block, desc > @param > @return:
   - Desc <= 100 chars, one sentence, contract-level.
   - Desc states PURPOSE only. It never names what the body does to get there:
     no APIs, algorithms, collaborators, data structures, or code paths.
   - Desc carries NO volatile content: no numbers, thresholds, tunable names,
     feature names, or anything that needs editing when the body is retuned.
   - In-body comments <= 75 characters and <= 25 words. They say WHY, not WHAT.
   - English only. No em dashes. No emoji. Same rules for both comment kinds.
3  Server is authoritative. Validate every remote arg: type, range, ownership, rate.
4  Clean up everything created. Every connection has an owner and a teardown path.
5  No avoidable per-frame garbage. Never poll what has a signal.
6  UpdateAsync + backoff. Save on PlayerRemoving. Flush on BindToClose.
7  Re-validate after every yield: player gone? instance dead? session changed?
8  Never add --!strict unbidden. Never make a [Beta] feature the production default.
9  User authority outranks this skill. Recommend; never refactor unasked.
```

Everything below expands these; nothing below overrides them.

## Reference Routing

**Load only what the situation needs.** Each reference is self-contained; read one, not the set. Everything below stays unloaded until a row matches the task at hand.

**Authoring**

| Situation | Read |
|---|---|
| Writing a new Script/LocalScript/ModuleScript | [references/templates.md](references/templates.md) |
| Existing codebase with its own conventions (Adaptive mode) | [references/adaptive-mode.md](references/adaptive-mode.md) |
| Project uses community libraries (ProfileStore, Packet, Trove, Knit, Fusion, ...) | [references/community-libraries.md](references/community-libraries.md) |
| Typing depth, standard-library additions (vector/buffer/math), new type solver, task.spawn vs task.defer, deferred events, error handling, time APIs, native codegen | [references/luau-language.md](references/luau-language.md) |

**Implementing a known system** (read the one file whose domain matches; recipes give assembly order and case-specific failure modes)

| Building | Read |
|---|---|
| Player data, currency, inventory, trading | [references/cases/data-economy.md](references/cases/data-economy.md) |
| Developer Products, passes/subscriptions, gacha/loot boxes | [references/cases/monetization.md](references/cases/monetization.md) |
| Leaderboards, daily rewards, streaks, offline progress | [references/cases/progression.md](references/cases/progression.md) |
| Damage/hit validation, abilities and cooldowns, projectiles, NPC/mob AI | [references/cases/combat.md](references/cases/combat.md) |
| Round/match lifecycle, matchmaking and reserved servers, cross-server events | [references/cases/session-flow.md](references/cases/session-flow.md) |
| Interactables and prompts, placement/building, pets and followers | [references/cases/world-interaction.md](references/cases/world-interaction.md) |
| HUD/state sync, rate limiting and anti-cheat, analytics instrumentation | [references/cases/client-infra.md](references/cases/client-infra.md) |

**Deepening a concern**

| Situation | Read |
|---|---|
| Hot loops, memory, network traffic, rendering, profiling | [references/performance.md](references/performance.md) |
| Data stores (+ version history), remotes, cleanup, pooling, input, character lifecycle (Humanoid vs CCL), streaming, cross-server, anti-patterns | [references/patterns.md](references/patterns.md) |
| Purchases, anti-exploit, remote validation depth, text filtering, policy compliance | [references/security-monetization.md](references/security-monetization.md) |
| Anything touching movement, physics, input, camera, animation timing, `BindToSimulation`, or network ownership | [references/server-authority.md](references/server-authority.md) |
| UI/UX, cross-platform, testing, debugging, telemetry | [references/ui-ux-testing.md](references/ui-ux-testing.md) |
| Genre is known (simulator, FPS, obby, RPG, racing, horror, social, tower defense, battlegrounds) | [references/genres.md](references/genres.md) |

**Checking yourself**

| Situation | Read |
|---|---|
| Verifying that a change works (playtest workflow, test injection, command-bar VM pitfall) or verifying a review finding | [references/verification.md](references/verification.md) |
| Working through a Roblox Studio MCP connection — which tool to use, what is irreversible, and how not to burn tokens | [references/studio-mcp.md](references/studio-mcp.md) |
| Reviewing code — deciding whether a finding is real and how severe, and what NOT to flag | [references/false-positives.md](references/false-positives.md) |
| Whether a newer engine/Luau API is confirmed available before relying on it or flagging it as missing | [references/api-currency.md](references/api-currency.md) |
| Designing against a platform ceiling (DataStore size/requests, MemoryStore, messaging, attributes, animation tracks) | [references/limits-budgets.md](references/limits-budgets.md) |

## User Authority

This skill is guidance, not a mandate — **full control always stays with the user**:

- The user's explicit instructions override any convention in this skill. If an instruction conflicts with a Non-Negotiable Runtime Rule, state the risk once, briefly, then follow the user's decision.
- Never take actions the user didn't ask for on the strength of this skill alone: no unrequested refactors, restructuring, file creation, or "while I'm here" cleanups. Recommend; don't act.

### Advisory invocation (no specific task)

Users may invoke this skill purely as a standing reminder — "use best practices", "ikuti skill ini mulai sekarang" — without a concrete coding task. In that case:

- **Do not** start codebase analysis or ask the mode/library setup questions yet. Briefly acknowledge that the standards are now active, and stop.
- Hold these rules as active guidance for all subsequent Luau work in the session.
- Resolve Mode Selection and the community-library check **lazily** — at the first actual coding/review task, and only the parts that task needs.

## Supervision Level (how often to confirm)

The user controls how much the agent asks before acting. Three levels:

| Level | Token | Behavior |
|---|---|---|
| **Supervised** | `!ask` | Confirm before every meaningful decision: convention choices, the list of files to create/modify, any deviation from this skill, and before writing code. The user sees and approves everything. |
| **Balanced** (default) | `!bal` | Ask only when genuinely needed: real ambiguity, conflict with a Non-Negotiable Runtime Rule, or wide-impact/destructive changes. Otherwise proceed. |
| **Autonomous** | `!go` | Don't ask; make sensible best-practice decisions and record every assumption in the final summary. Stop only for destructive/irreversible actions. |

**How the level is set:**
1. **Session declaration** — the user states it in any words ("supervised mode", "awasi penuh", "jangan banyak tanya", "bebas saja") → holds for the whole session until changed.
2. **Inline token** — `!ask` / `!bal` / `!go` anywhere in a prompt → overrides the session level for that prompt only.

**Precedence:** inline token > session declaration > Balanced default. Never ask the user which level they want — absence of a declaration *is* the Balanced choice. Explicit user instructions (User Authority) outrank the level itself.

**Effect on this skill's confirmation points:**

| Confirmation point | Supervised | Balanced | Autonomous |
|---|---|---|---|
| Default/adaptive mode question | Always ask | Ask once if a codebase exists | Infer; report the assumption |
| Adaptive convention confirmation (Step 2) | Wait for approval | Wait for approval | Present as a report; proceed |
| Community-library check | Ask | Ask once / detect | Detect via `require()`s |
| Conflict with a non-negotiable | Ask | Ask | Warn in summary; choose the safe option |
| Review mode: stylistic restructuring | Propose, wait | Propose, wait | Still propose only (User Authority — unchanged) |

## Mode Selection (before the first coding task)

This skill runs in one of two modes. Determine the mode before writing any code:

- **Default mode** — apply this skill's conventions exactly as written below (section layout, naming, ordering). Use when: the user asked for it, the project is new/empty, or the existing code has no consistent conventions worth preserving.
- **Adaptive mode** — first study the project's existing coding structure and conventions, present what you found together with a proposed adapted convention, **get the user's confirmation**, then write code following the confirmed convention. The universal rules (Non-Negotiable Runtime Rules, Language & Style safety items, everything in the performance/patterns references) still apply in full — only *stylistic/structural* conventions adapt.

How to decide:
1. If the user explicitly stated a mode (e.g., "pakai default", "ikuti struktur project ini", "pelajari dulu kode kami") → obey it.
2. Otherwise, if there is an existing codebase with visible conventions → ask the user once: *"Use this skill's default conventions, or should I study your project's existing structure first and adapt to it (with your confirmation)?"*
3. If asking is impossible (autonomous run) → default mode for new files; for edits to existing files, match the file's existing style and note the assumption in your summary.

Adaptive-mode procedure (analysis checklist, confirmation format, precedence rules): see [references/adaptive-mode.md](references/adaptive-mode.md).

### Community-library check (part of mode selection)

Also determine, once, whether the project uses community libraries that replace built-in APIs — ask the user (*"Does this project use community libraries such as ProfileStore/ProfileService for data, Packet/ByteNet for networking, Trove/Maid for cleanup, Knit/Flamework, Fusion/React-lua, ...?"*) or, in autonomous runs, detect them by scanning `require()`s. If any are in use, read [references/community-libraries.md](references/community-libraries.md) and defer the overlapping built-in patterns to the library — library idioms win for the concern they own; the Non-Negotiable Runtime Rules still hold through them.

### Server Authority check (part of mode selection)

Engine-level **Server Authority** is [GA], but **Roblox does not enable it by default** — a place is server-authoritative only if someone set `Workspace.AuthorityMode = "Server"`. Most places are not. Assuming the wrong mode produces confidently wrong code and false review findings, because the correct answer for input, camera, simulation stepping, and movement anti-cheat *inverts* between the two modes.

**Trigger topics.** The first time a task touches any of these, resolve the mode before writing or flagging anything: character movement or physics · input handling · camera control · animation timing · `BindToSimulation` · network ownership · hit registration or lag compensation · movement anti-cheat.

**Procedure:**
1. **Detect first.** Read `Workspace.AuthorityMode` where the environment allows it, or scan the project for `AuthorityMode`, `BindToSimulation`, and Input Action usage.
2. **If undetermined, ask once:** *"Does this place have Server Authority enabled (`Workspace.AuthorityMode = "Server"`)? It changes how input, camera, and the gameplay loop must be written."*
3. **Cache the answer for the session**, exactly like the community-library check. Do not re-ask per file.
4. **Default assumption is OFF.** Never write Server Authority-only advice as if it were universal.

| Supervision level | Behavior |
|---|---|
| Supervised (`!ask`) | Always ask |
| Balanced (`!bal`) | Ask once, at the first SA-adjacent task |
| Autonomous (`!go`) | Detect; if inconclusive, assume **not** server-authoritative and record the assumption in the summary |

Both code paths, the forced settings, known limitations, and the adoption trade-off: [references/server-authority.md](references/server-authority.md). Never migrate a project to Server Authority on this skill's initiative — recommend, explain the cost, let the user decide.

### Review/refactor mode

When asked to *review or tidy existing code* (rather than write new code), give every finding exactly one severity — **Blocker** (security, data loss, or a guaranteed leak), **Correctness** (a real bug with a concrete failure scenario), or **Advisory** (style, layout, or micro-optimization). Before reporting anything, run it through [references/false-positives.md](references/false-positives.md): the "what NOT to flag" catalog, the severity taxonomy, and the four-step confidence gate.

- **Blocker / Correctness** — violations of Non-Negotiable Runtime Rules and misused deprecated APIs → report as findings (and fix if asked). Apply the rules *as scoped*: the exceptions written into them (periodic loops, cold-path allocations, small state snapshots) are not violations, and discouraged-but-functional APIs are not deprecated ones.
- **Advisory** — section-layout/naming deviations, module-require ordering, and missing doc comments on trivial private functions → *propose* as suggestions; never report as violations, never silently rewrite; the user decides. The doc-comment mandate is an authoring rule, not a review cudgel.
- Never reformat code unrelated to the request; consistency within the file beats consistency with this skill.
- Before flagging an API as wrong/nonexistent, verify against the target environment (the [references/api-currency.md](references/api-currency.md) baseline; see Environment & Scale) — never flag from memory alone.
- **Trace before flagging.** Follow the full flow across both sides of paired logic (writer/reader, serializer/deserializer, fire/handler) before reporting a bug — an asymmetry between paired sites is only a defect if tracing both sides shows a divergent outcome; it may deliberately compensate for the other side. Unusual-looking designs (state created before data exists, self-healing caches) may be intentional — check usage sites first. A finding needs a concrete failure scenario (inputs → wrong outcome); "could maybe fail" is not a finding. Full procedure: [references/verification.md](references/verification.md#review-verification-discipline-trace-before-flag).

## Environment & Scale

- **Detect the project environment first.** Three exist: **Studio-native** (work through Studio/MCP tools; paths are Instance paths), **Rojo/filesystem** (work through files; requires may use path aliases and `src/` maps to services), and **Studio Script Sync** (scripts edited as files in an external editor with bidirectional sync to Studio — file-based authoring, but the DataModel remains the source of truth and there is no Rojo project file). Match how you read, write, and reference scripts accordingly. When the connection is an MCP one, the tool-safety and token rules in [references/studio-mcp.md](references/studio-mcp.md) apply before any write.
- **Verify newer APIs before use** — check they exist in the target environment rather than assuming; fall back to the stable equivalent if absent. **The official docs (create.roblox.com — Engine API Reference) are the primary authority**; the API dump/ReflectionService or a quick in-Studio test settle what the docs haven't caught up to. Roblox ships new APIs continuously — absence from your training knowledge is not evidence an API doesn't exist. A dated baseline of what is already confirmed, so you don't re-verify settled APIs: [references/api-currency.md](references/api-currency.md).
- **Maturity tags.** This skill marks features **[GA]** (safe as a default), **[Beta]** (opt-in, may change), **[Verify]** (confirm in the target place), or **[UNVERIFIED]** (this skill could not confirm it). **Never make a [Beta] feature the default in production code** — present it as an option, state its status, and keep the stable path as the recommendation unless the user chooses otherwise.
- **Scale the ceremony to the script.** Tiny scripts (< ~40 lines) may use just the three top-level headers with no subsections; only add level-2+ headers when a section has enough content to need them. Never emit empty placeholder headers. **Pure data/type modules** (config tables, item catalogs, shared type definitions — no runtime logic) are exempt from the three-section layout entirely; group their contents however reads best.

## Script Section Layout (MANDATORY)

Every script is divided into exactly three top-level sections, in this order:

```lua
-- // VARIABLES // --

-- // FUNCTIONS // --

-- // INITIALIZATION // --
```

### Section header hierarchy

Five nesting levels. Use deeper levels only when a section genuinely needs subdivision:

```lua
-- // Level 1 // --    top-level sections only (the three below)
-- | Level 2 | --      standard subsections (Services, Modules, ...)
-- [ Level 3 ] --      grouping within a subsection
-- { Level 4 } --      rare, fine-grained grouping
-- / Level 5 / --      rarest, last resort
```

### 1. `-- // VARIABLES // --`

Subsections in this fixed order (omit any that are empty):

| Subsection | Content |
|---|---|
| `-- \| Services \| --` | Roblox services via `game:GetService()`, one per line, only the ones actually used |
| `-- \| Modules \| --` | `require()` calls, ordered by source location: **ServerScriptService → ServerStorage → ReplicatedStorage → Workspace**, then script-relative requires (`script.Parent.X`) last. A `Packages`/`ServerPackages` folder sorts as its containing service. Only locations the script can legally reach apply (client scripts skip server locations) |
| `-- \| Objects \| --` | References to Instances (models, folders, remotes, UI). Optional — only if needed |
| `-- \| Configuration \| --` | Constants and tunable values used across the script. `UPPER_SNAKE_CASE` |
| `-- \| State Management \| --` | Mutable runtime state variables (counters, caches, flags, connection tables) |

### 2. `-- // FUNCTIONS // --`

- **ModuleScripts** split functions into `-- | Private | --` (used only inside this script, `local function`) and `-- | Public | --` (exposed on the returned table). Private comes first.
- **Scripts/LocalScripts** usually skip the Private/Public split — just list functions under the section header (use level-2 headers to group by topic if the script is large).
- **Every function gets a doc comment**, ALWAYS wrapped in a `--[[ ... ]]` block placed directly above the function — even when the description is a single line. Structure, in this fixed order: **description → params → returns**. Keep the whole block tight: doc comments document, they must not inflate the file's line count. If a function needs paragraphs to explain, that is a signal to simplify the function, not to write an essay.
  - **Description** — one concise, technical sentence in clear English, **≤ ~100 characters** (absolute ceiling ~50 words for the rare two-clause case; aim far shorter).
  - **Tone** — write like an engineer, not a bot. No stiff, robotic, or "AI-slop" phrasing, and **no em dashes and no emoji** inside doc comments. English only, so developers of any origin can read it.
  - **`@param` / `@return`** — just as terse (a few words each). Include only when they add information beyond what the signature already shows (non-obvious meaning, units, constraints, nil-behavior); omit them entirely when obvious.

#### The two description rules (apply to every comment you write)

These govern the doc-block description **and** every explanatory comment inside a body. They are the two rules most often lost when a session is summarized — they are on the Invariant Card for that reason.

**1. Agnostic to the implementation.** A description states *what the function is for*, never *what it does to get there*. Name the purpose and the contract; do not name the mechanism. Concretely, a description must not mention:

| Never in a description | Because |
|---|---|
| Engine/library APIs the body calls | The body gets refactored; the comment quietly becomes a lie |
| Algorithms, loops, branches, or ordering of steps | That is the code's job, and the reader already has the code |
| Collaborating modules or services by name | Renaming or swapping a collaborator should not touch this comment |
| Data structures or field names used internally | Internals are free to change without a contract change |

**2. Free of volatile content.** Nothing that a routine tuning pass would invalidate: no numbers, thresholds, or limits · no names of Configuration constants · no feature, system, or product names that may be renamed · no version, date, or environment specifics. Test it this way: **if someone rebalances a constant or replaces the body, would this comment need editing?** If yes, the comment is carrying volatile detail and must be rewritten at contract level.

**3. In-body comments are capped.** A comment placed among the statements of a function stays **≤ 75 characters and ≤ 25 words**. It explains *why*, never *what* — the code already says what. If the reasoning cannot fit, the function is too complicated or the reasoning belongs in the doc block. Never narrate code line by line, and never let an in-body comment grow into a paragraph.

```lua
--[[
	Applies damage to a character and resolves the resulting state.

	@param amount Damage in health points; must be positive
	@return true when the damage was lethal
]]
local function applyDamage(humanoid: Humanoid, amount: number): boolean
	-- Armor is server-owned; the client copy can lag.
	...
end
```

Rejected descriptions for that same function, and why:

| Rejected | Fault |
|---|---|
| `Subtracts amount from Humanoid.Health, then triggers the ragdoll module if health reaches zero` | Describes the mechanism; dies with the next refactor |
| `Applies damage, capped at 100, after the 0.25 armor multiplier` | Carries tunable numbers; wrong the moment balance changes |
| `Applies damage by calling DamageService:Resolve` | Names a collaborator; wrong when it is renamed or replaced |
| `Handles the damage flow for the new combat system` | Names a system that will not stay "new"; says nothing about the contract |

The accepted form survives all four of those changes, because it commits only to the contract: damage goes in, lethality comes out.

- Order functions so dependencies come first (callee above caller) — Luau requires it for locals anyway.

### 3. `-- // INITIALIZATION // --`

Everything that *runs*: function calls, event connections, loops. No function definitions here. Use level-2 subsections to group by context when the script wires up several concerns:

```lua
-- // INITIALIZATION // --

-- | Player Events | --
Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

-- | Remotes | --
purchaseRemote.OnServerEvent:Connect(onPurchaseRequest)

-- | Startup | --
loadWorldState()
```

Full annotated templates (Script, LocalScript, ModuleScript): see [references/templates.md](references/templates.md).

## Language & Style Rules

- **Type safety is opt-in.** Do not add `--!strict` (or raise a file's strictness) on your own initiative — it requires an explicit request from the user. When a file or the surrounding project already declares a strictness level, match it for consistency, but never introduce or upgrade strictness unbidden; forcing strict can surface false type errors against loosely-typed engine APIs. Where strict is in use, type-annotate public function signatures, Configuration constants, and State tables.
- **Naming:** `PascalCase` for services and required module tables; `camelCase` for local variables, functions, and Instance references (`purchaseRemote`, `coinLabel`); `UPPER_SNAKE_CASE` for Configuration constants. Module public methods `PascalCase` (`Inventory.AddItem`), private functions `camelCase`.
- Always `game:GetService()` — never `game.Workspace`-style direct indexing (exception: `workspace` global is fine).
- **Never use deprecated APIs:** `wait()`/`spawn()`/`delay()` → `task.wait()`/`task.spawn()`/`task.delay()`; `:connect()`/`:wait()` lowercase → `:Connect()`/`:Wait()`; `Body*` movers (`BodyVelocity`/`BodyGyro`/`BodyPosition`/...) → constraints (`LinearVelocity`, `AlignOrientation`, `AlignPosition`); `Humanoid:LoadAnimation` → `Animator:LoadAnimation`; `Part.Velocity`/`RotVelocity` → `AssemblyLinearVelocity`/`AssemblyAngularVelocity`; `SetPrimaryPartCFrame`/`GetPrimaryPartCFrame` → `PivotTo`/`GetPivot`; `Camera.CoordinateFrame` → `Camera.CFrame`; `Player:GetRankInGroupAsync`/`GetRoleInGroupAsync` → `GroupService:GetRolesInGroupAsync`; InputContext/InputAction camera replication → `Player:GetCameraState()`; `tick()` → the right time API per [references/luau-language.md](references/luau-language.md#time-apis--one-job-each).
- **Deprecated is not the same as discouraged.** Setting `Instance.new`'s second `parent` argument (create → set properties → parent last is a *performance* preference), or `FireAllClients` where a targeted list would do, are Advisory choices, not deprecated APIs — don't report them as violations. Full split: [references/false-positives.md](references/false-positives.md#deprecated-vs-discouraged--do-not-conflate-them).
- Guard external/yielding calls (`DataStore`, `MarketplaceService`, `HttpService`, `TeleportService`) with `pcall` and a retry policy. Never let an unprotected yield crash a player flow.
- One responsibility per ModuleScript. No circular `require`s — if two modules need each other, extract the shared part into a third module or pass dependencies at init time.
- Prefer `CollectionService` tags + `Attributes` to bind behavior to Instances — this is the most framework-agnostic wiring mechanism and survives any folder structure.
- **Stay framework-agnostic by construction.** Core logic relies only on standard Roblox services and engine features; a community library's way of doing something is an overlay ([references/community-libraries.md](references/community-libraries.md)), never the baseline. Never assume a folder layout or framework beyond standard services — bind by tags/attributes, discover by service, and let the community-library check (not a hard-coded path) decide which idioms apply.
- Comments explain *why*, not *what*. Doc comments are terse, technical English (≤ ~100-char descriptions, no em dashes or emoji), always a `--[[ ... ]]` block in desc → params → returns order. Descriptions are implementation-agnostic and free of volatile detail; in-body comments stay ≤ 75 characters and ≤ 25 words (see the FUNCTIONS section rules).
- **`const` for bindings that must not be rebound** [GA in Studio, April 2026]. `const` is a contextual keyword valid anywhere `local` is, and it freezes the *binding*, not the value — a `const` table is still mutable, so it is not a substitute for `table.freeze` on shared config. Use it for Services, required modules, and Configuration constants, which are never legitimately reassigned; it is not required, and never retrofit it across an existing file unasked. Details and the `export` interaction: [references/luau-language.md](references/luau-language.md#const-bindings).
- Deeper language/runtime rules — typing discipline, `task.spawn` vs `task.defer`, deferred engine events, error handling, time APIs, `@native`: [references/luau-language.md](references/luau-language.md).

## Non-Negotiable Runtime Rules

1. **Server is authoritative.** Never trust the client: validate every RemoteEvent/RemoteFunction argument on the server (type, range, ownership, rate). Client only renders and requests.
2. **Clean up everything you create.** Store connections and disconnect them (or `Destroy()` the owning Instance — destroying disconnects its connections). Any `PlayerAdded` setup must have a `PlayerRemoving` teardown.
3. **No avoidable per-frame garbage.** Don't allocate tables/closures/strings inside `RunService` loops when they can be hoisted; hoist them. Judge by the hot path's actual frequency — a closure in a once-per-round callback is fine; only flag allocations that recur per frame/per entity. Use `RunService.Heartbeat` for gameplay, `PreRender`/`RenderStepped` only for camera/visual work on the client.
4. **Never poll for state — react.** Use events, `:GetPropertyChangedSignal()`, attribute-changed signals, or tag signals instead of `while task.wait() do` checks on a condition that has a signal. Genuinely *periodic* work (autosave interval, throttled AI scans, round timers) is legitimate on a timed loop — that's scheduling, not polling.
5. **Save data safely.** `UpdateAsync` over `SetAsync`, exponential-backoff retry, save on `PlayerRemoving`, and flush in `game:BindToClose()` and `game.ServerRestartScheduled`.
6. **Budget the network.** Batch remote traffic; use `UnreliableRemoteEvent` for high-frequency, loss-tolerant data (VFX, positions); for large or frequently-updated state send deltas, not whole states (a small, infrequent snapshot is fine as-is).
7. **Re-validate after every yield.** Wherever a yield (`task.wait`, a `pcall`ed async call, `WaitForChild`) separates a check from its use, re-check after resuming: the player may have left (`player.Parent` is nil), the instance may be destroyed, the round/session may have changed. Capture values you need *before* the yield; verify liveness *after* it. Scoped: straight-line non-yielding handlers need nothing — this rule triggers only when a yield sits between validation and action.

Details, patterns, and numbers: [references/performance.md](references/performance.md) (CPU, memory, network, instances) and [references/patterns.md](references/patterns.md) (data stores, remotes, cleanup, pooling). Before flagging a violation of any of these in review, check the scoped exceptions in [references/false-positives.md](references/false-positives.md) — each rule has shapes that only look like violations.

## System Design Preflight

Before implementing any non-trivial system (not needed for a one-off script or a small edit), settle these five in order. Each has a home; none requires guesswork:

1. **Which case is this?** Match it to a recipe in the Implementing-a-known-system routing block and read that one file. If nothing matches, proceed with the general rules.
2. **What are the ceilings?** Check [references/limits-budgets.md](references/limits-budgets.md) for the limits this design will approach (payload size, request budget, attribute window, entity counts). Designing into a ceiling is far cheaper than discovering it in production.
3. **What is the server/client split?** Name what the server owns authoritatively and what the client merely renders or requests, before writing either side.
4. **Does a library own this concern?** If the project uses ProfileStore, Packet, Trove, Knit, Fusion, or similar, its idioms replace the built-in pattern ([references/community-libraries.md](references/community-libraries.md)).
5. **How will this be proven to work?** Pick the observable outcome and the session type (multi-client for anything touching replication) up front ([references/verification.md](references/verification.md)).

If the system touches movement, input, camera, animation timing, or simulation stepping, resolve the Server Authority check first — it changes the answers to steps 3 and 5.

## Review Checklist

Before finishing any Luau code, verify:

- [ ] Supervision level respected (inline token > session declaration > Balanced); in Autonomous, all assumptions listed in the summary
- [ ] Mode determined (default vs adaptive); in adaptive mode, the convention was confirmed by the user before coding (or reported, in Autonomous)
- [ ] Community libraries identified (asked or detected); overlapping patterns deferred to them
- [ ] For SA-adjacent work (movement, physics, input, camera, animation timing, `BindToSimulation`, network ownership): authority mode detected or confirmed, never assumed; default is OFF
- [ ] For a non-trivial system: the five-step System Design Preflight was run, and the matching case recipe read
- [ ] No [Beta] feature made the default in production code; its status stated wherever it was proposed
- [ ] Three top-level sections present and correctly ordered (except exempt pure data/type modules); correct header syntax at each level (or the confirmed adapted equivalent); ceremony scaled to script size, no empty headers
- [ ] In review mode: each finding triaged as Blocker/Correctness/Advisory and run through the false-positives gate; Advisory items proposed not forced; unrelated code untouched
- [ ] Services/Modules/Objects/Configuration/State ordered per spec; module requires ordered SSS → SS → RS → Workspace → script-relative (only reachable locations count)
- [ ] Every function has a `--[[ ... ]]` block doc comment in desc → params → returns order; the description is terse (≤ ~100 chars), technical English with no em dashes or emoji
- [ ] Every description passes **both** tests: implementation-agnostic (names no API, algorithm, collaborator, or internal structure) and free of volatile content (no numbers, tunable names, or renameable feature/system names) — retuning a constant or rewriting the body would not require editing it
- [ ] Every in-body comment is ≤ 75 characters and ≤ 25 words, and explains why rather than restating what the code already says
- [ ] `--!strict` present only where the user asked or the project already uses it (never added unbidden); no deprecated APIs (discouraged-but-functional APIs are not violations)
- [ ] All connections have an owner and a teardown path; no leaked Instances
- [ ] No allocation or Instance-tree lookup inside hot loops; nothing polled that could be event-driven
- [ ] All remote handlers validate arguments; all yielding external calls wrapped in `pcall` with retry
- [ ] Handlers that yield between a check and its use re-validate state after resuming (player still present, instance alive, session unchanged)
- [ ] Data bound for DataStores keeps a JSON-serializable shape (no mixed keys, NaN, userdata); user-generated text shown to other players goes through server-side filtering
- [ ] Works regardless of the project's framework — no assumptions about folder layout beyond standard Roblox services
