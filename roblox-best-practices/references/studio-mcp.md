# Operating the Roblox Studio MCP

How to drive a Studio MCP connection without destroying work, corrupting a place, or burning the user's tokens. This governs *how the agent uses its tools*, not how Luau is written.

## Contents

- [Ground truth rules](#ground-truth-rules)
- [When no MCP tools are present](#when-no-mcp-tools-are-present)
- [Identify the variant once per session](#identify-the-variant-once-per-session)
- [Capability map](#capability-map)
- [MCP preflight](#mcp-preflight)
- [Irreversible operations](#irreversible-operations)
- [The Edit-context VM trap](#the-edit-context-vm-trap)
- [Token discipline](#token-discipline)
- [Standard workflows](#standard-workflows)
- [Snapshot note](#snapshot-note)

## Ground truth rules

**1. The connected tool list wins over this document.** Whatever tools are actually available in the session are the authority. This file helps you interpret them; it never decides what exists.

**2. Never call a tool you have not confirmed is present, and never invent parameters.** Read the tool's schema before the first call. Some harnesses list tool names first and load schemas on request, so a visible name is not a known signature.

**3. Safety attaches to the capability, not the tool name.** "Execute arbitrary Luau" is equally dangerous whether the tool is called `execute_luau` or `run_code`. Classify by what a tool *does*, then apply the matching rule below.

**4. Never tell the user a tool does not exist** because it is missing from this file. Roblox ships continuously and the MCP ecosystem includes forks and custom servers. Absence here is not evidence of absence.

**5. Check what you actually have, every session, before the first call.** Tool sets change between Studio builds and between servers, and a session inherits nothing from the last one. Enumerate the connected tools, classify them ([below](#identify-the-variant-once-per-session)), and cache that for the session — never assume the set from memory, from this file, or from a previous conversation.

**6. The connection is a real permission grant.** Roblox states it plainly: an MCP client can read and modify content in the open place, so only trusted clients should be connected. That is the user's decision to make, not something to encourage; what it means for you is that every write lands in the user's actual working file ([Irreversible operations](#irreversible-operations)).

## When no MCP tools are present

If the user expects a Studio connection and no MCP tools are in your session, the server is probably off rather than broken. It ships **inside Studio**: **Assistant → … → Manage MCP Servers → Enable Studio as MCP server**. Quick connect covers Claude Code, Claude Desktop, Codex CLI, Cursor, Gemini CLI, VS Code, and Antigravity, and any client speaking `stdio` transport can attach.

Say that once, then continue in whatever environment you actually have — a filesystem/Rojo project needs no MCP at all, and the file-based tools are usually the better path when one exists.

## Identify the variant once per session

Read the available tools and classify. Cache the result for the session, the same way the community-library and Server Authority checks are cached ([SKILL.md](../SKILL.md#session-setup-decide-once-then-cache)).

| Variant | Signature tools | Treatment |
|---|---|---|
| **Official built-in Studio MCP** (assume this by default) | Scripts: `script_read`, `multi_edit`, `script_search`, `script_grep` · Exploration: `search_game_tree`, `inspect_instance`, `subagent` · Execution: `execute_luau` · Playtest: `get_studio_state`, `start_stop_play`, `get_console_output`, `screen_capture` · Input: `character_navigation`, `user_keyboard_input`, `user_mouse_input` · Generation: `generate_mesh`, `generate_material`, `generate_procedural_model`, `wait_job_finished`, `search_asset`, `insert_asset`, `upload_image`, `store_image` · Reference: `http_get`, `skill` · Session: `list_roblox_studios`. The exact set varies by build — older ones lack some, newer ones add others | Full guidance below applies |
| **Standalone Rust server** (`Roblox/studio-rust-mcp-server`, the older separate lineage) | `run_code`, `insert_model`, `run_script_in_play_mode`, `get_studio_mode` | Narrower capability set; map through the capability table |
| **Community, custom, or fork** | A mix, or names outside both sets | Rely entirely on each tool's own schema |

The official built-in server is the common case and the one Roblox recommends. Assume it, but verify against what you actually see.

### When a tool is unfamiliar or missing

| Situation | Reading | Action |
|---|---|---|
| An expected official tool is **absent** | Likely an **older build** of the official server, or a different variant | Do not conclude the setup is broken. Find another tool with the equivalent capability; if none exists, tell the user what you cannot do |
| An **unknown tool** is present | Either an official tool **newer** than this snapshot, or a community server's own | Read its description and schema. **Never infer semantics from the name alone** |
| Names match the **Rust standalone** lineage | The older separate server | Map through the capability table; do not expect the official tool set |
| Nothing matches anything known | A custom server | Treat side effects as **unknown until the schema proves otherwise** |

**Extra caution:** for any unfamiliar tool whose name suggests `publish`, `save`, `delete`, `clear`, `reset`, or `overwrite`, confirm with the user before calling it, regardless of how harmless the description sounds. These are the calls that cannot be walked back.

## Capability map

Attach the rules to the capability. Blank cells mean no dedicated tool is known for that variant, not that the capability is impossible; it may be reachable through Luau execution.

| Capability | Official | Rust standalone | Primary risk | Token discipline |
|---|---|---|---|---|
| Read a script | `script_read` (line ranges) | via `run_code` | — | Locate with grep first, then read a range. Do not pull whole files |
| Search scripts or patterns | `script_search` (max 10) · `script_grep` (max 50) | — | Results truncate **silently** | Narrow the query rather than repeating a broad one |
| Write or edit a script | `multi_edit` | via `run_code` | **Creates a new script when the path is mistyped** | Batch multiple edits into one call |
| Execute Luau | `execute_luau` (Edit / Client / Server) | `run_code`, `run_script_in_play_mode` | **No undo; the Edit context is a separate VM** | Do not use for what an inspect call answers |
| Explore the data model | `search_game_tree`, `inspect_instance` | via `run_code` | — | Always filter; start narrow and widen only if needed |
| Autonomous sub-task | `subagent` (explore / playtest) | — | Expensive; a full sub-run | Only for genuinely multi-step exploration |
| Control playtesting | `start_stop_play`, `get_studio_state` | `start_stop_play`, `get_studio_mode` | **Play-mode changes are discarded** | Check state once; never poll |
| Read console output | `get_console_output` | `get_console_output` | — | Capture around the action, not the whole session |
| Capture the viewport | `screen_capture` | — | — | Images are costly. Use only when visual confirmation is genuinely required |
| Insert an asset | `insert_asset`, `search_asset` | `insert_model` | **Free models can carry backdoor scripts** | — |
| Generate assets | `generate_mesh`, `generate_material`, `generate_procedural_model`, `wait_job_finished`, `run_as_job` | — | — | Each generation is a billed job. Iterate the prompt, do not spam generate; `run_as_job` runs one asynchronously and returns a job id |
| Convert local images to asset URIs | `store_image`, `upload_image` | — | Uploads leave the local machine | Only when a tool demands an `IMAGEID_<id>` argument |
| Simulate input | `character_navigation`, `user_keyboard_input`, `user_mouse_input` | — | Drives the real session | — |
| Fetch documentation | `http_get`, `skill` | — | — | Fetch `https://create.roblox.com/docs/en-us/reference/engine/classes/<Class>.md` and grep the member for **semantics**. **Absence from a docs page never settles nonexistence** — the site trails the engine, so existence is settled by the API dump or an in-Studio probe ([api-currency.md](api-currency.md#how-to-verify-the-toolbox)). `skill` returns Roblox's own guidance, which is a second opinion, not an override of the user's project conventions |
| Manage sessions | `list_roblox_studios`, plus a **`studio_id` argument carried by the individual tools** | — | **Wrong instance means the wrong place** | One listing per session; pass the id rather than re-listing |

## MCP preflight

Run these four before the **first write or execute** of a session. Each is one cheap call that prevents an expensive mistake.

1. **Which Studio?** Enumerate connected instances with the listing tool. One client can hold several Studio windows at once, and the documented way to target one is the **`studio_id` argument on each call**, not a separate "set active" tool (some builds do expose one). The default target may not be the place the user means — confirm before the first write.
2. **Which mode?** Query the Studio state. **Edit mode persists; play mode does not.** Never begin authoring work without knowing which one you are in.
3. **Does the target exist?** Before an edit, confirm the script path by reading or searching for it. Do not let an edit call be the thing that discovers a typo.
4. **Is this destructive?** If the operation deletes, overwrites broadly, publishes, or saves, confirm with the user first.

## Irreversible operations

MCP writes into a live place. Most of these have no undo through the protocol.

- **Play-mode work is discarded.** Anything created or edited while playtesting disappears when play stops. Author in Edit mode. If you must run something during play, treat it as throwaway and re-apply it in Edit mode afterwards.
- **Confirm the active Studio instance before writing.** Writing to the wrong connected place is silent and easy.
- **A mistyped script path can create a new script instead of editing the intended one**, leaving an orphan and leaving the real bug unfixed. Verify the path first; treat script creation as a deliberate, announced act.
- **Arbitrary Luau execution has no undo.** `Destroy`, `ClearAllChildren`, and mass property writes are permanent. Before a destructive run, count the affected instances and report the number, then get confirmation. Prefer a dry run that only reports what *would* change.
- **Inserted assets can contain malicious scripts.** After inserting anything from the Creator Store or an unknown source, inspect its descendants for scripts before playtesting. This is a long-standing Roblox attack vector, not a hypothetical.
- **Input simulation drives the real session.** Keyboard, mouse, and navigation calls act on the live Studio window; do not fire them speculatively.
- **Ask the user to save before wide-reaching changes.** The place is the user's working file, and a large refactor is worth a save point.
- **Never publish on your own initiative.** Publishing is outward-facing and affects live players.

## The Edit-context VM trap

The Edit-mode Luau execution context runs in a **separate VM from game scripts**. `require()` there produces a *fresh* module instance with empty state.

- Asserting on that state tells you nothing about the running game.
- Calling a module's init or setup function from that context can **double-register** handlers on real shared resources such as remotes and tags.
- To assert on live game state, inject a real `Script` or `LocalScript` into the running session instead, so it shares the game's module registry.

Full workflow and the injection pattern: [verification.md](verification.md#studio-native--mcp-environments).

## Token discipline

Each of these is a common way to spend the user's budget without gaining information.

- **Grep before reading.** Locate the lines, then read that range. Reading a whole large script to find one function is the single biggest waste.
- **Filter every tree query.** An unfiltered data-model walk on a large place returns an enormous payload.
- **Do not poll.** If a wait or job-completion capability exists, use it. Repeatedly querying state or console output in a loop burns tokens and tells you little.
- **Respect truncation limits.** Search results cap out (commonly 10 names, 50 matches). A broad query silently hides matches and tempts a re-query. Narrow it instead.
- **Screenshots are a last resort.** Console output answers most verification questions far more cheaply. Capture the viewport only when the question is genuinely visual.
- **Reserve autonomous sub-tasks.** A subagent-style tool runs a whole sub-session. Do not use it for something a single inspect or grep answers.
- **Do not re-read what you already read.** Track what you have loaded this session.
- **Scope console reads.** Pull output around the action you just took, rather than an entire long session's log.
- **Generation jobs cost real resources.** Refine the prompt between attempts instead of regenerating repeatedly.

## Standard workflows

**Read, modify, verify**
1. Grep or search to locate the target.
2. Read only the relevant range.
3. Apply the change as one batched edit.
4. Verify with the cheapest sufficient signal: console output first, a screenshot only if the result is visual.

**Auditing an existing place**
1. Scope it to named systems, not the whole place ([evaluation-matrix.md](evaluation-matrix.md#scoping-the-audit)).
2. Answer what static reads can answer first: grep the remote handlers, the connection sites, and the store calls. Four of the six dimensions need no session at all.
3. Only then start a playtest, and only for the dimensions that require one.
4. Report which systems were skipped and which dimensions the evidence could not support.

**Playtest loop**
1. Confirm the current mode before starting.
2. Make all authoring changes in Edit mode first, since play-mode changes are lost.
3. Start play, drive the flow (input simulation or an injected test script), and read console output scoped to that run.
4. Stop play, then apply any fixes in Edit mode.

## Snapshot note

Tool names and limits here reflect a **point-in-time snapshot** (dated in [api-currency.md](api-currency.md)) of the official built-in server as documented at `create.roblox.com/docs/studio/mcp`, plus the known standalone lineage. They are an aid to interpretation, never an authority: the connected tool list and each tool's own schema always take precedence ([api-currency.md](api-currency.md)).
