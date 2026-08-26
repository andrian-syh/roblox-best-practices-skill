# Script Section Layout and Documentation Comments

The full specification behind Invariant Card items 1 and 2: the three-section layout, the header hierarchy, what belongs in each section, and the Documentation Comment rules. SKILL.md carries the summary; this file carries the detail and the worked examples.

Annotated end-to-end templates for Script, LocalScript, and ModuleScript: [templates.md](templates.md).

## Contents

- [Section header hierarchy](#section-header-hierarchy)
- [1. -- // VARIABLES // --](#1-----variables----)
- [2. -- // FUNCTIONS // --](#2-----functions----)
- [3. -- // INITIALIZATION // --](#3-----initialization----)


Every script is divided into exactly three top-level sections, in this order:

```lua
-- // VARIABLES // --

-- // FUNCTIONS // --

-- // INITIALIZATION // --
```

## Section header hierarchy

Five nesting levels. Use deeper levels only when a section genuinely needs subdivision:

```lua
-- // Level 1 // --    top-level sections only (the three below)
-- | Level 2 | --      standard subsections (Services, Modules, ...)
-- [ Level 3 ] --      grouping within a subsection
-- { Level 4 } --      rare, fine-grained grouping
-- / Level 5 / --      rarest, last resort
```

## 1. `-- // VARIABLES // --`

Subsections in this fixed order (omit any that are empty):

| Subsection | Content |
|---|---|
| `-- \| Services \| --` | Roblox services via `game:GetService()`, one per line, only the ones actually used |
| `-- \| Modules \| --` | `require()` calls, ordered by source location: **ServerScriptService → ServerStorage → ReplicatedStorage → Workspace**, then script-relative requires (`script.Parent.X`) last. A `Packages`/`ServerPackages` folder sorts as its containing service. Only locations the script can legally reach apply (client scripts skip server locations) |
| `-- \| Objects \| --` | References to Instances (models, folders, remotes, UI). Optional — only if needed |
| `-- \| Configuration \| --` | Constants and tunable values used across the script. `UPPER_SNAKE_CASE` |
| `-- \| State Management \| --` | Mutable runtime state variables (counters, caches, flags, connection tables) |

## 2. `-- // FUNCTIONS // --`

- **ModuleScripts** split functions into `-- | Private | --` (used only inside this script, `local function`) and `-- | Public | --` (exposed on the returned table). Private comes first.
- **Scripts/LocalScripts** usually skip the Private/Public split — just list functions under the section header (use level-2 headers to group by topic if the script is large).

#### Documentation Comments: the default style, and how it flexes

The official terms are **Luau Comments** (Roblox's own name for the `--` and `--[[ ]]` forms) and **Documentation Comments** (the comment block that documents an item). Roblox's own guidance is deliberately loose: use a block comment at the top of a file to describe its purpose, a block comment before a function or object to describe its intent, single-line comments for in-line notes, and focus on *why* rather than *what*. Everything below is this skill's default layered on that guidance — one part stricter: **this skill writes no prose comments inside function bodies**, because a name cannot drift from what it names while a note beside the code can. The tag syntax is borrowed from Moonwave, the de-facto standard for Luau doc comments.

**This style is a default, not a mandate.** Where a project has an established comment style, that style wins — see [references/adaptive-mode.md](adaptive-mode.md#comments-follow-the-project). When the user asks which style to use, or asks to restyle the comments, **recommend this one** and explain why; never impose it on code that already has a convention.

#### Writing the block

- **Every function gets a documentation comment** placed directly above it. Structure, in this fixed order: **description → params → returns**. Keep the block tight: documentation comments document, they must not inflate the file's line count. If a function needs paragraphs to explain, that is a signal to simplify the function, not to write an essay.- **Block form.** The default is `--[[ ... ]]`. The Moonwave forms `--[=[ ... ]=]` and `---` are equally correct and are the ones tooling parses ([luau-lsp](https://github.com/JohnnyMorganz/luau-lsp) recognises Moonwave style; Studio's hover tips accept any comment above the function). Use whichever the project uses; where there is no project convention, use `--[[ ... ]]`. Whatever the form, do not mix two forms within one file.
  - **Description** — technical prose in clear English, **at most 3 lines and 250 characters**. Both are ceilings, not targets. If the contract does not fit inside them, the function is doing too much.
  - **Tone** — write like an engineer, not a bot. No stiff, robotic, or "AI-slop" phrasing. **No em dashes and no double-hyphen dashes used as punctuation** (the `--` inside a `@param`/`@return` tag is Moonwave's separator, not punctuation), and **no emoji**. English is preferred as the universal language, so developers of any origin can read it.
  - **`@param` / `@return`** — Moonwave syntax: `@param <name> <type> -- <description>` and `@return <type> -- <description>`, each repeatable. The type may be omitted when the signature already declares it (Moonwave infers typed signatures automatically). Include a tag only when it adds information beyond what the signature shows — non-obvious meaning, units, constraints, nil-behavior — and omit it entirely when obvious.
  - Other Moonwave tags (`@within`, `@class`, `@prop`, `@error`, `@yields`, `@deprecated`, `@server`/`@client`) are available and correct when the project generates Moonwave docs. Do not scatter them into a project that does not.

#### The two description rules

Both must hold for **every documentation comment you write**. They are the rules most often lost when a session is summarized, which is why they are on the Invariant Card.

**1. Agnostic to the implementation.** A description states *what the function is for*, never *what it does to get there*. Name the purpose and the contract; do not name the mechanism. Concretely, a description must not mention:

| Never in a description | Because |
|---|---|
| Engine/library APIs the body calls | The body gets refactored; the comment quietly becomes a lie |
| Algorithms, loops, branches, or ordering of steps | That is the code's job, and the reader already has the code |
| Collaborating modules or services by name | Renaming or swapping a collaborator should not touch this comment |
| Data structures or field names used internally | Internals are free to change without a contract change |

**2. Free of volatile content.** Nothing that a routine tuning pass would invalidate: no numbers, thresholds, or limits · no names of Configuration constants · no feature, system, or product names that may be renamed · no version, date, or environment specifics. Test it this way: **if someone rebalances a constant or replaces the body, would this comment need editing?** If yes, the comment is carrying volatile detail and must be rewritten at contract level.

**When a detail genuinely cannot be avoided** — an engine quirk that only makes sense named, a platform constraint tied to a specific API — state it at the **most general level that still communicates the point**. "Rounded to the engine's replication precision" survives a refactor; "rounded to 3 decimals because SetAttribute truncates" does not. Aim for a comment that is still *relevant* after the next change, even if it is less specific today.

#### In-body comments: banned; self-documenting code instead

**Code you deliver contains no prose comments inside function bodies.** The reasoning, in priority order:

1. **Self-documenting code is the primary standard.** A comment beside a statement is the first thing to go stale when that statement changes; a well-chosen name cannot drift from what it names. Before reaching for a note, make the code say it: rename the variable or function, extract a small well-named helper, replace a magic value with an `UPPER_SNAKE_CASE` constant, return early so shape carries meaning.
2. **Contract-level "why" belongs above, not beside.** If after that something still needs saying — an engine quirk, an ordering requirement imposed from outside, a deliberate deviation that will look like a mistake, a genuinely ignorable failure being swallowed — it goes in the Documentation Comment block above the function, held to both description rules there.
3. **Existing comments are not yours to delete.** An in-body note in code you did not write stays put ([User Authority](../SKILL.md#user-authority)); when the task touches that file anyway, propose migrating its content into self-documenting code or the block above, once, as **Advisory**.
4. **Adaptive carve-out:** a project whose established style documents inside bodies keeps doing so — project convention wins ([adaptive-mode.md](adaptive-mode.md#comments-follow-the-project)). The ban binds *this skill's default output*, never a rewrite of someone else's convention.

```lua
--[[
	Applies damage to a character and resolves the resulting state.

	@param amount number -- Damage in health points; must be positive
	@return boolean -- True when the damage was lethal
]]
local function applyDamage(humanoid: Humanoid, amount: number): boolean
	...
end
```

The same block in Moonwave form, for a project that generates docs from source:

```lua
--[=[
	Applies damage to a character and resolves the resulting state.

	@within Combat
	@param amount number -- Damage in health points; must be positive
	@return boolean -- True when the damage was lethal
]=]
```

The body carries no commentary here because nothing in it needs explaining — under this standard that is not the usual case by luck; it is the requirement, met by naming things well.

Rejected descriptions for that same function, and why:

| Rejected | Fault |
|---|---|
| `Subtracts amount from Humanoid.Health, then triggers the ragdoll module if health reaches zero` | Describes the mechanism; dies with the next refactor |
| `Applies damage, capped at 100, after the 0.25 armor multiplier` | Carries tunable numbers; wrong the moment balance changes |
| `Applies damage by calling DamageService:Resolve` | Names a collaborator; wrong when it is renamed or replaced |
| `Handles the damage flow for the new combat system` | Names a system that will not stay "new"; says nothing about the contract |

The accepted form survives all four of those changes, because it commits only to the contract: damage goes in, lethality comes out.

- Order functions so dependencies come first (callee above caller) — Luau requires it for locals anyway.

## 3. `-- // INITIALIZATION // --`

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

Full annotated templates (Script, LocalScript, ModuleScript): see [references/templates.md](templates.md).
