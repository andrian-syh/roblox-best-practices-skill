# Operating the Roblox Studio MCP

How to drive a Studio MCP connection without destroying work, corrupting a place, or burning the user's tokens. This governs *how the agent uses its tools*, not how Luau is written.

## Contents

- [Ground truth rules](#ground-truth-rules)
- [Recipes](#recipes)
- [When no MCP tools are present](#when-no-mcp-tools-are-present)
- [Identify the variant once per session](#identify-the-variant-once-per-session)
- [Capability map](#capability-map)
- [MCP preflight](#mcp-preflight)
- [Which DataModel a call reaches](#which-datamodel-a-call-reaches)
- [Irreversible operations](#irreversible-operations)
- [Calls that report success but change nothing](#calls-that-report-success-but-change-nothing)
- [Errors and when to stop](#errors-and-when-to-stop)
- [Running Luau through the tool](#running-luau-through-the-tool)
- [The Edit-context VM trap](#the-edit-context-vm-trap)
- [Roblox skills over MCP](#roblox-skills-over-mcp)
- [Token discipline](#token-discipline)
- [Auditing an existing place](#auditing-an-existing-place)
- [Snapshot note](#snapshot-note)

## Ground truth rules

**1. The connected tool list wins over this document.** Whatever tools are actually available in the session are the authority. This file helps you interpret them; it never decides what exists.

**2. Never call a tool you have not confirmed is present, and never invent parameters.** Read the tool's schema before the first call. Some harnesses list tool names first and load schemas on request, so a visible name is not a known signature. Copy parameter names from the schema: `old_string` is not `old_str`.

**3. Safety attaches to the capability, not the tool name.** "Execute arbitrary Luau" is equally dangerous whether the tool is called `execute_luau` or `run_code`. Classify by what a tool *does*, then apply the matching rule below.

**4. Never tell the user a tool does not exist** because it is missing from this file. Roblox ships continuously and the MCP ecosystem includes forks and custom servers. Absence here is not evidence of absence.

**5. Check what you actually have, every session, before the first call.** Tool sets change between Studio builds and between servers, and a session inherits nothing from the last one. Enumerate the connected tools, classify them ([below](#identify-the-variant-once-per-session)), and cache that for the session. Never assume the set from memory, from this file, or from a previous conversation.

**6. The connection is a real permission grant.** Roblox states it plainly: an MCP client can read and modify content in the open place, so only trusted clients should be connected. That is the user's decision to make, not something to encourage; what it means for you is that every write lands in the user's actual working file ([Irreversible operations](#irreversible-operations)).

**7. A write is not done until a read shows it.** Several calls return success while nothing changed ([list](#calls-that-report-success-but-change-nothing)). After every write, read the result back in a separate call.

## Recipes

Follow these in order. Each step is one call unless it says otherwise. Stop at the stop condition; do not improvise around it.

**Session start** (once, at most four calls)
1. List the connected Studio instances. Note the `studio_id` of the place the user means. If several match or none does, ask.
2. Read the Studio state: Edit or Play.
3. Know who owns the files: a sync tool (Rojo, Argon, Script Sync, Azul) or Studio alone ([external-editors.md](external-editors.md)).
4. Write these three facts down in your reply. Write them again after any context compaction, before the next write.

Stop if the listing is empty or the place is unclear. Go to [Errors and when to stop](#errors-and-when-to-stop).

**Read a script**
1. Grep or search for the symbol.
2. Read only the lines around the match.

Stop when you have the lines you need. Never read a whole large script to find one function.

**Edit a script**
1. Confirm the mode is Edit.
2. Read the exact lines you will change. Copy `old_string` from that read, including tabs.
3. Send one edit call with every change to that script.
4. Read the changed lines back. Compile-check with `loadstring` when the tool allows ([below](#running-luau-through-the-tool)).

Stop if the read-back differs from what you sent. Report it; do not retry the same call.

**Change many scripts or instances**
1. Dry run: return the count and the list of what would change. Change nothing.
2. Show the count to the user. Get confirmation when anything is deleted or overwritten.
3. Write in one call, so the whole change is one undo step ([below](#irreversible-operations)).
4. Read back: return the count that changed and every miss.

Stop if the miss list is not empty. Do not delete the old thing until the miss list is empty.

**Playtest**
1. Decide where the probe runs: a Script made in Edit before play, or one parented during play to `ServerScriptService` (Server) or the player's `PlayerGui` (Client).
2. Write down the console line that will settle the question.
3. Start play. Read console output once. Stop play.
4. Remove any probe scripts made in Edit mode. Scripts made during play vanish when play stops.

Stop after one run answers or refuses to answer. Do not poll a property to catch an animation.

**Generate an asset**
1. Call the generator once.
2. If it returned a job id, call the wait tool once.

Stop after one result. Change the prompt before generating again.

## When no MCP tools are present

If the user expects a Studio connection and no MCP tools are in your session, the server is probably off rather than broken. It ships **inside Studio**: **Assistant → … → Manage MCP Servers → Enable Studio as MCP server**. Quick connect covers Claude Code, Claude Desktop, Codex CLI, Cursor, Gemini CLI, VS Code, and Antigravity, and any client speaking `stdio` transport can attach.

Say that once, then continue in whatever environment you actually have. A filesystem or Rojo project needs no MCP at all, and the file-based tools are usually the better path when one exists.

## Identify the variant once per session

Read the available tools and classify. Cache the result for the session, the same way the community-library and Server Authority checks are cached ([SKILL.md](../SKILL.md#session-setup-decide-once-then-cache)).

| Variant | Signature tools | Treatment |
|---|---|---|
| **Official built-in Studio MCP** (assume this by default) | Scripts: `script_read`, `multi_edit`, `script_search`, `script_grep` · Exploration: `search_game_tree`, `inspect_instance`, `subagent` · Execution: `execute_luau` · Playtest: `get_studio_state`, `start_stop_play`, `get_console_output`, `screen_capture` · Input: `character_navigation`, `user_keyboard_input`, `user_mouse_input` · Generation: `generate_mesh`, `generate_material`, `generate_procedural_model`, `generate_texture`, `generate_scene`, `generate_avatar`, `auto_setup_avatar`, `segment_mesh`, `wait_job_finished`, `search_asset`, `insert_asset`, `upload_image`, `store_image` · Reference: `http_get`, `skill`, `list_skills` · Skills: `create_skill`, `edit_skill` · Session: `list_roblox_studios`. The exact set varies by build, and the server can add tools during a session | Full guidance below applies |
| **Standalone Rust server** (`Roblox/studio-rust-mcp-server`, archived; Roblox recommends the built-in server) | `run_code`, `insert_model`, `run_script_in_play_mode`, `get_studio_mode` | Narrower capability set; map through the capability table |
| **Community, custom, or fork** | A mix, or names outside both sets | Rely entirely on each tool's own schema |

The official built-in server is the common case and the one Roblox recommends. Assume it, but verify against what you actually see. Its tools are implemented by Studio's built-in Assistant plugin, which updates without a Studio release, so behaviour can change between two sessions on the same build.

### When a tool is unfamiliar or missing

| Situation | Reading | Action |
|---|---|---|
| An expected official tool is **absent** | Likely an **older build** of the official server, or a different variant | Do not conclude the setup is broken. Find another tool with the equivalent capability; if none exists, tell the user what you cannot do |
| An **unknown tool** is present | Either an official tool **newer** than this snapshot, or a community server's own | Read its description and schema. **Never infer semantics from the name alone** |
| Names match the **Rust standalone** lineage | The archived standalone server | Map through the capability table; do not expect the official tool set. Suggest the built-in Studio MCP server once, since the archived one gets no fixes |
| Nothing matches anything known | A custom server | Treat side effects as **unknown until the schema proves otherwise** |

**Extra caution:** for any unfamiliar tool whose name suggests `publish`, `save`, `delete`, `clear`, `reset`, or `overwrite`, confirm with the user before calling it, regardless of how harmless the description sounds. These are the calls that cannot be walked back.

## Capability map

Attach the rules to the capability. Blank cells mean no dedicated tool is known for that variant, not that the capability is impossible; it may be reachable through Luau execution.

| Capability | Official | Rust standalone | Primary risk | Token discipline |
|---|---|---|---|---|
| Read a script | `script_read` (line ranges) | via `run_code` | A partial read can be refused; read the range through `execute_luau` instead | Locate with grep first, then read a range. Do not pull whole files |
| Search scripts or patterns | `script_search` (max 10) · `script_grep` (max 50) | — | Results truncate **silently**; grep line numbers can be off | Narrow the query rather than repeating a broad one |
| Write or edit a script | `multi_edit` (Edit only) | via `run_code` | **Creates a new script when the path is mistyped**; `replace_all` reads a pattern ([below](#calls-that-report-success-but-change-nothing)) | Batch multiple edits into one call |
| Execute Luau | `execute_luau` (Edit / Client / Server) | `run_code`, `run_script_in_play_mode` | **Freezes Studio until it yields; undo is not guaranteed; the Edit context is a separate VM** | Return a short answer; do not use for what an inspect call answers |
| Explore the data model | `search_game_tree`, `inspect_instance` | via `run_code` | — | Always pass a start path and a depth; widen only if needed |
| Autonomous sub-task | `subagent` (explore / playtest) | — | Expensive; a full sub-run. A playtest subagent can report a false pass | Only for genuinely multi-step exploration; confirm a pass with console output or a state read |
| Control playtesting | `start_stop_play`, `get_studio_state` | `start_stop_play`, `get_studio_mode` | **Play-mode changes are discarded** | Check state once at the start and once after your own start or stop; never poll |
| Read console output | `get_console_output` | `get_console_output` | — | Capture around the action, not the whole session |
| Capture the viewport | `screen_capture` | — | Omits some UI during Play (BillboardGui, default ProximityPrompt, top bar, sometimes a ScreenGui) | Images are costly. Prove UI by reading properties from the Client DataModel |
| Insert an asset | `insert_asset`, `search_asset` | `insert_model` | **Free models can carry backdoor scripts** | — |
| Generate assets | `generate_mesh`, `generate_material`, `generate_procedural_model`, `generate_scene`, `generate_avatar`, `wait_job_finished` | — | — | Each generation is a billed or capped job. Iterate the prompt, do not spam generate; a generate tool that takes `async: true` returns a job id at once, and `wait_job_finished` collects the result |
| Re-texture or split a mesh | `generate_texture`, `segment_mesh` | — | **`generate_texture` replaces the source mesh in place**; name it as irreversible before calling | `segment_mesh` leaves the source and inserts a new Model of up to 5 named parts beside it |
| Convert local images to asset URIs | `store_image`, `upload_image` | — | Uploads leave the local machine | Only when a tool demands an `IMAGEID_<id>` argument |
| Simulate input | `character_navigation`, `user_keyboard_input`, `user_mouse_input` (Client only) | — | Drives the real session | — |
| Fetch documentation | `http_get`, `skill`, `list_skills` | — | — | Fetch `https://create.roblox.com/docs/en-us/reference/engine/classes/<Class>.md` and grep the member for **semantics**. **Absence from a docs page never settles nonexistence**: the site trails the engine, so existence is settled by the API dump or an in-Studio probe ([api-currency.md](api-currency.md#how-to-verify-the-toolbox)). Roblox skills are covered [below](#roblox-skills-over-mcp) |
| Create or change a Roblox skill | `create_skill`, `edit_skill` | — | Publishes to the user's account at once and applies in every place they open | Only when the user asks |
| Manage sessions | `list_roblox_studios`, plus a **`studio_id` argument carried by the individual tools** | — | **Wrong instance means the wrong place** | One listing per session; pass the id rather than re-listing |

## MCP preflight

Run these four before the **first write or execute** of a session. Each is one cheap call that prevents an expensive mistake. The [session-start recipe](#recipes) is the short form.

1. **Which Studio?** Enumerate connected instances with the listing tool. One client can hold several Studio windows at once, and the documented way to target one is the **`studio_id` argument on each call**, not a separate "set active" tool (some older builds exposed one). The default target may not be the place the user means. Confirm before the first write.
2. **Which mode?** Query the Studio state. **Edit mode persists; play mode does not.** Never begin authoring work without knowing which one you are in.
3. **Does the target exist?** Before an edit, confirm the script path by reading or searching for it. Do not let an edit call be the thing that discovers a typo.
4. **Is this destructive?** If the operation deletes, overwrites broadly, publishes, or saves, confirm with the user first.

When a sync tool owns the files, an MCP edit in Studio is not the end of the change. Under a filesystem-first tool (Rojo, Argon with two-way sync off) the next sync overwrites it, so edit the file instead. Under Azul, a git checkout while connected rewrites the place ([external-editors.md](external-editors.md)).

## Which DataModel a call reaches

Tools that take `datamodel_type` reach one DataModel per call. Read the allowed values from the schema; the table below is how to choose.

| You want to | Mode | Use |
|---|---|---|
| Edit a script, or create one that must persist | Edit | `multi_edit`, or `execute_luau` in `Edit` |
| Read or compile source, count, sweep the tree | Edit | `execute_luau` in `Edit` |
| Read what the running server or client holds | Play | `execute_luau` or `search_game_tree` in `Server` or `Client` |
| Reach a module's live state (services, registries) | Play | A probe Script in `ServerScriptService` or a LocalScript in `PlayerGui` ([verification.md](verification.md#studio-native--mcp-environments)) |
| Drive input or move the character | Play | Input and navigation tools in `Client` |

- `Edit` is rejected while play runs. Stop play first, or use `Server` or `Client`.
- Only one Server and one Client DataModel are addressable, so a multi-client test cannot pick a second client window.
- Tools without a `datamodel_type` parameter, such as the script readers, read the edit place.

## Irreversible operations

MCP writes into a live place. Treat every write as permanent unless you have proven otherwise.

- **Play-mode work is discarded.** Anything created or edited while playtesting disappears when play stops. Author in Edit mode. If you must run something during play, treat it as throwaway and re-apply it in Edit mode afterwards.
- **Confirm the active Studio instance before writing.** Writing to the wrong connected place is silent and easy.
- **A mistyped script path can create a new script instead of editing the intended one**, leaving an orphan and leaving the real bug unfixed. Verify the path first; treat script creation as a deliberate, announced act.
- **Undo after arbitrary Luau is a safety net, never the plan.** The official server runs each `execute_luau` call inside its own change-history recording, so one call is one undo step for the user, and `ChangeHistoryService:TryBeginRecording` inside the call returns `nil`. Other servers and other tools may not do this. `Destroy`, `ClearAllChildren`, and mass property writes still count as permanent until an undo has been shown to restore them. Before a destructive run, count the affected instances and report the number, then get confirmation. Prefer a dry run that only reports what *would* change.
- **Inserted assets can contain malicious scripts.** After inserting anything from the Creator Store or an unknown source, inspect its descendants for scripts before playtesting. This is a long-standing Roblox attack vector, not a hypothetical.
- **Input simulation drives the real session.** Keyboard, mouse, and navigation calls act on the live Studio window; do not fire them speculatively.
- **Ask the user to save before wide-reaching changes.** The place is the user's working file, and a large refactor is worth a save point.
- **Never publish on your own initiative.** Publishing is outward-facing and affects live players.

## Calls that report success but change nothing

These return without an error while the place is unchanged or wrong. Each has a read-back that catches it.

| Call | What goes wrong | Do instead |
|---|---|---|
| `multi_edit` with `replace_all` | `old_string` is read as a Lua pattern. `?`, `.`, `-`, `%`, `(`, `[` are special, so `Icon: string?,` matches nothing. A `%` in `new_string` is special too | Escape those characters with `%`, or edit without `replace_all` using enough context to be unique |
| `multi_edit` on a path that does not exist | Creates a new script | Find the path first |
| `multi_edit` on a script named like a member of its parent (`Workspace.Remove`) | The call fails on the name lookup | Rename the script, or edit its `Source` through `execute_luau` |
| Assigning `.Source` from `execute_luau` | The change may not reach the script editor or a sync tool | `ScriptEditorService:UpdateSourceAsync(script, function(old) return new end)`, then read `#Source` in a second call |
| A bulk find-and-replace in Luau | A pattern slightly too narrow skips files without an error | Use plain find (`string.find(s, text, 1, true)`), log every miss, return the misses |
| A LocalScript put in `StarterPlayerScripts` during Play | Never runs: that folder is copied only when a player spawns | During play, parent a client probe to the player's `PlayerGui`, or create it in Edit before play |
| `script_read` or `script_grep` after an edit | Can return the old text | Confirm with `execute_luau` reading `.Source`, or `ScriptEditorService:GetEditorSource` for a script open in the editor |

## Errors and when to stop

| You see | It means | Do |
|---|---|---|
| A missing or invalid `studio_id` error | The call did not name a Studio | List the Studio instances and pass the id |
| The Studio listing is empty | The MCP toggle is off, the built-in plugin failed to load (common after joining a Team Create session), or the client failed to authenticate | Stop. Tell the user to restart Studio and check Manage MCP Servers. Do not retry in a loop |
| `Target is not reachable` during Play | A platform fault with Play-mode tools; it has come and gone between builds | Stop the playtest work and report it. Edit-mode calls may still work |
| `Edit` rejected | Play is running | Stop play, or target `Server` or `Client` |
| `execute_luau` cannot `require`, or `_G` is nil | The execution thread is capability-restricted in this build | Read `.Source` and compile with `loadstring` instead, or use a probe Script in play |
| The same error twice in a row | The call or the environment is wrong, not unlucky | Stop and report. Never send the same failing call a third time |

## Running Luau through the tool

- **Studio freezes until the code yields.** No unbounded loop. A wait loop calls `task.wait()` inside it. Split heavy work into batches of about 1000 items with one `task.wait()` per batch.
- **Return the answer.** End the code with `return` and a short value: a count, a list of names, at most about 50 lines. Print only from scripts that run inside the game, and read those prints with the console tool.
- **Compile-check edits.** `loadstring(script.Source, script.Name)` compiles without running and catches a broken edit. One call can check several scripts.
- **Probe the thread once per session** before relying on `require` or `_G`: run `return typeof(_G), pcall(require, someModule)`. What the thread may do has changed between builds.
- **Line numbers:** split with `Source:split("\n")`. A `gmatch("[^\n]*")` loop yields an extra empty match per line.
- **Long source as a string:** pick a long-bracket level the text cannot close, such as `[==[ ... ]==]`. The first newline after the opening bracket is dropped.

## The Edit-context VM trap

The Edit-mode Luau execution context runs in a **separate VM from game scripts**. `require()` there produces a *fresh* module instance with empty state.

- Asserting on that state tells you nothing about the running game.
- Calling a module's init or setup function from that context can **double-register** handlers on real shared resources such as remotes and tags.
- The `Server` and `Client` execution contexts during play have their own module cache too. Reading and writing instances there is safe; asking a live service for its state is not.
- To assert on live game state, run a real `Script` or `LocalScript` inside the session, so it shares the game's module registry.

Full workflow and the injection pattern: [verification.md](verification.md#studio-native--mcp-environments).

## Roblox skills over MCP

Roblox Assistant skills are Markdown instructions stored on the user's Roblox account. The official server exposes them.

- `list_skills` shows what exists. Skills named `rbx-` are written by Roblox. Read one with `skill` when its topic matches the task.
- A Roblox skill is a second opinion. The user's project conventions and this package win where they disagree.
- `create_skill` and `edit_skill` publish to the user's account immediately and apply in every place the user opens. Call them only when the user asks.

## Token discipline

Each of these is a common way to spend the user's budget without gaining information.

- **Grep before reading.** Locate the lines, then read that range. Reading a whole large script to find one function is the single biggest waste.
- **Filter every tree query.** Pass a start `path`, `max_depth`, and `head_limit`. An unfiltered walk from the root on a large place returns an enormous payload.
- **Do not poll.** If a wait or job-completion capability exists, use it. Repeatedly querying state or console output in a loop burns tokens and tells you little.
- **Respect truncation limits.** Search results cap out (commonly 10 names, 50 matches). A broad query silently hides matches and tempts a re-query. Narrow it instead. A whole-place sweep belongs in one `execute_luau` call over `GetDescendants`.
- **Know the host's ceiling.** Clients cap a single tool result, some near 25,000 tokens and some near 1 MB for images. Keep every result far below that: return counts and short lists, not dumps.
- **Batch reads.** One `execute_luau` call can concatenate several scripts' sources, or answer a question directly (a count, a match list), instead of one read per file.
- **Screenshots are a last resort.** Console output answers most verification questions far more cheaply. Capture the viewport only when the question is genuinely visual.
- **Reserve autonomous sub-tasks.** A subagent-style tool runs a whole sub-session. Do not use it for something a single inspect or grep answers.
- **Do not re-read what you already read.** Track what you have loaded this session.
- **Scope console reads.** Pull output around the action you just took, rather than an entire long session's log.
- **Generation jobs cost real resources.** Refine the prompt between attempts instead of regenerating repeatedly.

## Auditing an existing place

1. Scope it to named systems, not the whole place ([evaluation-matrix.md](evaluation-matrix.md#scoping-the-audit)).
2. Answer what static reads can answer first: grep the remote handlers, the connection sites, and the store calls. Four of the six dimensions need no session at all.
3. Only then start a playtest, and only for the dimensions that require one.
4. Report which systems were skipped and which dimensions the evidence could not support.

## Snapshot note

Tool names and limits here reflect a **point-in-time snapshot** (dated in [api-currency.md](api-currency.md)) of the official built-in server as documented at `create.roblox.com/docs/studio/mcp` and as its live schemas showed, plus the known standalone lineage. They are an aid to interpretation, never an authority: the connected tool list and each tool's own schema always take precedence ([api-currency.md](api-currency.md)).
