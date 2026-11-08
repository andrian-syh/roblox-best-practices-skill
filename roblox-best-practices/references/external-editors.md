# Editing Roblox Code Outside Studio

Roblox code can be authored in any editor through several sync tools that disagree about what matters most. Read this before writing a file into such a project. It governs *where code lives and which side wins*, not how Luau is written. For install steps and full option lists, read the tool's own docs ([Official links](#official-links)).

## Contents

- [The one question to answer first](#the-one-question-to-answer-first)
- [Detecting the environment from disk](#detecting-the-environment-from-disk)
- [Studio Script Sync](#studio-script-sync)
- [Rojo](#rojo)
- [Argon](#argon)
- [Azul](#azul)
- [Other sync and build tools](#other-sync-and-build-tools)
- [The toolchain alongside](#the-toolchain-alongside)
- [Moving an existing game out of Studio](#moving-an-existing-game-out-of-studio)
- [What breaks in every setup](#what-breaks-in-every-setup)
- [Official links](#official-links)

## The one question to answer first

**Which side is the source of truth?** Each tool answers differently, and a wrong answer destroys the user's work. Writing a file and assuming Studio follows is correct under Rojo and destructive under a Studio-first tool, where the next sync can overwrite what you wrote or push a half-finished file into a live place.

| Tool | Source of truth | Default port | Changes back into files |
|---|---|---|---|
| **Studio Script Sync** | the DataModel | in-process | yes, with a conflict dialog |
| **Rojo** | the filesystem | 34872 | `rojo syncback`, a deliberate command; live two-way sync is experimental |
| **Argon** | configurable (`Initial Sync Priority`) | 8000 | yes, but **off by default** |
| **Azul** | the DataModel | configurable | continuous; from 2.0, file creates, renames, moves, and deletes also reach Studio during a live session |

Two rules follow:

- **Never assume a write to disk has reached the place.** Say which side you wrote to and what the other side needs to see it: under Rojo, the serve session pushes it; under Script Sync, Studio should already show it, so confirm before a playtest; under Azul 2.0 or later, a live session carries file creates, moves, and deletes into Studio.
- **Never start, stop, or reconfigure a sync session on your own initiative.** A `--destructive` flag, a `syncback`, or turning off `Keep Unknowns` can delete instances that exist only in the place ([studio-mcp.md](studio-mcp.md#irreversible-operations) applies the same rule to MCP writes).

## Detecting the environment from disk

| Present | Environment |
|---|---|
| `*.project.json` (usually `default.project.json`) | Rojo, or Argon in its Rojo-compatible mode |
| `argon.toml` | Argon workspace config |
| `sourcemap.json` with no project file | Script Sync or Azul, with a sourcemap for the language server |
| Loose `.luau` files mirroring service names, no project file | Script Sync or Azul |
| A `sync/` directory mirroring service names | Azul's default `syncDir` |
| `Default.Project.JSON` with `experienceId` | Lync |
| `wally.toml` and `Packages/` | Wally dependencies, under any sync tool |
| `rokit.toml`, `aftman.toml`, or `foreman.toml` | a pinned toolchain: read it, it names each tool and version |
| `lune/` or `.lune/` holding `.luau` scripts | Lune automation, not game code |
| `stylua.toml`, `selene.toml`, `.luaurc` | formatting, lint, and strictness conventions that outrank sampled code ([adaptive-mode.md](adaptive-mode.md)) |
| None of the above | Studio-native; there is no filesystem to write to |

## Studio Script Sync

Roblox's own feature, generally available, with no plugin or CLI. In the Explorer, right-click an instance, choose **Sync to…**, and pick a local directory. Studio resumes the sync on restart.

**It syncs only `Script`, `LocalScript`, `ModuleScript`, and `Folder`.** A `Model`, `Part`, or `RemoteEvent` in the synced tree is not on disk.

| On disk | In the DataModel |
|---|---|
| `name.luau` | `ModuleScript` |
| `name.server.luau` | `Script`, `RunContext = Server` |
| `name.client.luau` or `name.local.luau` | `LocalScript` |
| `name.legacy.luau` | `Script`, `RunContext = Legacy` |
| `name.plugin.luau` | `Script`, `RunContext = Plugin` |
| a directory | `Folder` |

**Data-loss trap, from Roblox's docs:** the sync ignores attributes and tags on a synced script, so they can be lost. Before syncing a tree, check whether its scripts carry tags or attributes the game reads ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)).

Other limits:

- Deleting a top-level synced instance requires stopping the sync first.
- At most 10,000 scripts per top-level instance and 128 top-level instances.
- Breakpoints and stepping stay in Studio, so verification still happens in a Studio session ([verification.md](verification.md#newer-verification-levers)).
- **Team Create:** never let two people sync and edit the same script; each overwrites the other.
- Conflicts open a dialog listing what each side would add, change, or delete. Read it; never click through it for the user.

**Ask the sync for its state instead of inferring it.** `InstanceFileSyncService:GetStatus(instance)` returns `SyncedAsRoot`, `SyncedAsDescendant`, `NotSynced`, `Errored` (a sync root that stopped), or `AncestorErrored`. The two error states matter most, because a stopped sync looks like a working one from the file side. `GetSyncedInstance(filePath)` maps the other way. These are **PluginSecurity**: call them from the command bar, a plugin, or MCP `execute_luau`, never from shipped code.

For a full IDE, Roblox's answer is Script Sync plus the **Luau LSP** VS Code extension and its Studio companion plugin.

## Rojo

Filesystem-first: the project on disk defines the place, and `rojo serve` pushes it into Studio through the Rojo plugin, whose major version must match the CLI. **Use Rojo 7.7.1 or later:** Studio now saves asset references as `*Content` properties (`MeshContent`, `TextureContent`, `ImageContent`), and older Rojo does not handle them ([api-currency.md](api-currency.md#engine)).

**`rojo upload --cookie` takes a `.ROBLOSECURITY` cookie, an account credential.** Never put one in a proposed command, script, config file, repository, or chat. A leaked cookie is a full account takeover that a password change does not revoke. In CI it belongs only in the runner's secret store ([security.md](security.md#threat-model-assume-all-of-these-exist)).

What to know when reading a Rojo project:

- **`default.project.json`** requires `name` and `tree`. `servePlaceIds` guards against syncing into the wrong place. `emitLegacyScripts` defaults to `true`, which is why Rojo emits `Script` and `LocalScript` rather than `RunContext` scripts: configuration, not a mistake.
- **File mapping:** directory to `Folder`, `.luau` to `ModuleScript`, `.server.luau` to `Script`, `.client.luau` to `LocalScript`, `.rbxm`/`.rbxmx` to a model, `.json`/`.toml` to a table module. An `init.luau` (or `init.server.luau`, `init.client.luau`) turns its parent directory into that script; one init file per directory. A sibling `.meta.json` sets properties.
- **Properties:** prefer the implicit form (`"Anchored": true`), as Rojo's docs advise. `Ref`, `Region3`, `Region3int16`, and `SharedString` cannot be written in a project file at all.
- **Cannot sync live**, because the plugin API cannot set them: terrain, `MeshPart.MeshId`, `HttpService.HttpEnabled`. Not a misconfiguration.
- **Rojo 6 project files are stale under Rojo 7:** explicit properties changed from `{"Type": "Enum", "Value": 512}` to `{"Enum": 512}`, and `CFrame` became an object with `position` and `orientation`. One of the few project-file findings worth raising.
- **`rojo syncback`** pulls instances from a place file into the project under the project's `syncbackRules`. It rewrites the working tree, so run it only on the user's request and on a clean commit. The plugin's live Two-Way Sync is experimental; do not recommend it.
- `rojo sourcemap --watch default.project.json --output sourcemap.json` writes the file the language server needs.

Rojo documents two workflows: **partially managed** (Rojo owns scripts, Team Create owns the rest) and **fully managed** (Rojo owns the whole game). Most existing games start partial. The team process around either is in [team-workflow.md](team-workflow.md).

## Argon

Filesystem-first like Rojo and Rojo-compatible by default, with two-way sync as a supported feature. Default port 8000. Its `exec` command runs Luau inside Studio during a live session, and `debug` drives a playtest.

**Plugin defaults that matter, since users rarely change them:** `Two-Way Sync` off, `Only Code Mode` on (syncs back only scripts and their ancestors), **`Keep Unknowns` off (instances absent from the filesystem are destroyed)**, `Initial Sync Priority` set to `Server`. Check `argon.toml` before assuming any of these.

**Its project file is not Rojo's, despite the same filename.** Argon renames `serveAddress` to `host`, `servePort` to `port`, `servePlaceIds` to `placeIds` (Rojo's single `placeId` becomes an entry there), `globIgnorePaths` to `ignoreGlobs`, and `emitLegacyScripts` to `legacyScripts`. Its `.meta.json` writes `keepUnknowns` where Rojo writes `ignoreUnknownInstances`. **Never copy field names between the two tools.** With `legacyScripts` off, `.client.luau` becomes a `Script` with `Local` run context, not a `LocalScript`.

**Naming trap:** instance names become filenames, so they inherit the OS rules (on Windows, no `< > : " / \ | ? *`, no trailing period or space, no reserved names such as `CON` or `COM1`). With `rename_instances` on by default, Argon **silently strips forbidden characters**, so the instance in Studio can end up with a different name than the code expects. Name instances as legal filenames from the start.

**Porting a place** runs through the plugin with `Initial Sync Priority` set to `Client`; the confirmation prompt appears only in the CLI. Importing a saved `.rbxl` directly is not supported; that is Rojo `syncback` work.

roblox-ts is first-class in Argon, the main reason to pick it over a Studio-first tool for a TypeScript project. On Linux, `argon studio` and `argon debug` do not work.

## Azul

Studio-first: the DataModel is authoritative and Azul mirrors it into a local directory, so an existing place needs no conversion. A Node.js daemon (`azul-sync` on npm) plus the Azul Companion Plugin; both are required.

**Which side wins:**

- The first sync mirrors Studio to disk, and Studio wins a conflict.
- **On session start, Studio always wins over local state.** A file edited on disk while no session ran is overwritten when the plugin connects, so push it first with `azul push` or `azul build`.
- From **2.0**, a live session replicates file creates, renames, type changes, moves, and **deletes** into Studio. Deleting a file in `syncDir` deletes the instance, so treat a delete or bulk move on disk as a destructive Studio change. `liveFsSync.enabled = false` turns this off. Before 2.0, only script contents flowed back. Check `azul --version` and the setting before deciding.

**Files on disk:** `syncDir` (default `./sync`) mirrors the hierarchy. `*.server.luau` is a `Script`, `*.client.luau` a `LocalScript`, and a **`ModuleScript` has no suffix** unless `suffixModuleScripts` is on. There is **no `init.luau` convention**: a script with children gets a sibling folder of the same name. Do not carry Rojo filenames over.

**Commands that change Studio:** `azul build` pushes the whole tree, `azul push` a subtree, each with an optional `--destructive`. **`--no-warn` skips the confirmation prompts, so never put it in a proposed command.**

**Per-place config lives inside the place** at `ServerStorage.Azul.Config` and is merged with the CLI config on connect. **Read it before any push, because a `pushMappings` entry can carry `destructive = true`.** A dead connection is usually a plugin WebSocket URL that does not match the daemon port.

**Rojo mode (`--rojo`)** reads `default.project.json` with scripts, folders, and `*.model.json`, but not `.rbxm`/`.rbxmx` or `.meta.json`. Packages come in through `azul push --rojo`. Azul's docs advise against Wally; treat that as the author's preference and keep whatever the project uses.

**Version control:** a code-only project needs no sourcemap. When the project carries assets, attributes, or tags, distribute a `*.sourcemap.json` written by `azul pack -o`; collaborators import it with `--from-sourcemap`. The working `./sourcemap.json` is regenerated on every sync: never commit or edit it.

**Where its author says not to use it:** a non-standard feature-based layout, or a project that needs a battle-tested tool (it is newer and solo-maintained). **roblox-ts cannot work with it**: two-way sync cannot reconcile TypeScript sources with generated Luau.

## Other sync and build tools

- **Lync**: filesystem-first, and syncs **all content, not only scripts**: models, properties, attributes, tags, collision groups, terrain. **Its script class comes from a comment inside the file:** `--@script:server`, `--@script:client`, `--@localscript`, `--@disabled`. **Never delete or reorder these;** the ban on in-body comments does not reach them, because they are configuration in comment syntax. `LYNC BUILD` is documented but unavailable.
- **Lune**: a standalone Luau runtime for build post-processing, release automation, and pure-logic tests in CI ([verification.md](verification.md#rojo--filesystem-environments)). It supersedes **Remodel**; a project still on Remodel is dated, not broken. Before proposing a Lune script, say two things: **it has full access to the machine** with no sandbox, so never run one you did not read; and **`roblox.getAuthCookie()` reads the user's real `.ROBLOSECURITY`**, which is never printed, logged, written, or sent ([security.md](security.md#threat-model-assume-all-of-these-exist)). Its `roblox` library serializers take file *contents*, not paths, and its Instance API is a documented subset (no `Instance.new` parent argument), so check its API-status page before assuming engine parity. Use 0.11.1 or later for `net.request` with untrusted input.
- **rbxmk**: a Lua (not Luau) tool for transforming Roblox files. Its README says testing is incomplete and advises backups; repeat that, and never point it at the only copy of a place. Prefer Lune for new work.
- **darklua** (require conversion, bundling, minification) and **Tarmac** (uploads images and generates asset id modules) are build steps.

## The toolchain alongside

None of these sync anything. Roblox lists several on its third-party tools page with the caveat that **none is maintained by Roblox and any can stop working**.

- **Rokit**: pins tool versions per project in `rokit.toml` and also reads `aftman.toml` and `foreman.toml`. Prefer it for new setups; an existing Aftman or Foreman manifest is not a defect, and migrating it is not your call. **Read the manifest before reasoning about any other tool**: its pinned versions settle which project-file shape and CLI flags apply ([api-currency.md](api-currency.md#how-to-verify-the-toolbox)).
- **Wally**: the common package manager. **Commit `wally.lock`.** Stable Wally has no `--locked` flag, so CI runs `wally install` and fails if the lockfile changed (`git diff --exit-code wally.lock`). **`realm` is a security boundary:** `shared` packages replicate to clients, so a `server`-realm package mapped into `ReplicatedStorage` is readable by every exploiter, a real finding. **Trap:** Wally's generated thunks do not re-export types, so the language server reports errors in correct code; fix it with `wally-package-types` after generating a sourcemap. Diagnose this before treating a package type error as real. **pesde** is the main alternative. Never migrate a package manager unasked ([community-libraries.md](community-libraries.md)).
- **Luau LSP**: reads `sourcemap.json` to resolve the DataModel and preloads Roblox type definitions. A missing or stale sourcemap causes most "the LSP says this doesn't exist" reports: regenerate it before treating the complaint as a type error. Its Studio companion plugin covers instances no build knows about.
- **StyLua** (formatter, `-- stylua: ignore` for a block) and **selene** (linter, `std = "roblox"`): **whatever they are configured to do outranks this skill's formatting preferences** for that project.
- **roblox-ts**: compiles TypeScript to Luau. In such a project the `.luau` files are **build output**: never edit or review them as authored code. The sources are `.ts`.

## Moving an existing game out of Studio

1. **Decide the scope.** Scripts only (partially managed) is the low-risk move most live games make. Full management means the filesystem owns models, terrain, and settings too.
2. **Reorganize inside Studio first.** Consolidate scripts scattered across GUI elements, parts, and tools into `ServerScriptService`, `ReplicatedStorage`, and `StarterPlayer`, and replace duplicated per-instance scripts with one tag-bound handler ([patterns/world.md](patterns/world.md)).
3. **Pick the tool by who edits what.** Designers building in Studio while programmers leave fits a Studio-first tool or Script Sync. Git, code review, and reproducible builds fit a filesystem-first tool.
4. **Extract, do not retype.** `rbxlx-to-rojo` converts a saved place, `rojo syncback` pulls into an existing project, and Lune covers custom cases. Recreating a hierarchy by hand loses properties silently.
5. **Keep a saved copy of the place before the first push**, and never run a `--destructive` build against the live place.

## What breaks in every setup

| Symptom | Cause | What to do |
|---|---|---|
| Edits on disk never appear in Studio | no serve session, plugin not connected, or the wrong place open | check the connection before debugging code |
| Studio edits vanish on the next sync | filesystem-first tool with two-way sync off, as designed | edit in files, or turn two-way sync on deliberately |
| A file created or deleted on disk changes nothing in Studio | Azul before 2.0 | update Azul, do it in Studio, or import with `azul build`/`azul push` |
| Instances disappear after connecting | `Keep Unknowns` off, `$ignoreUnknownInstances`, or `--destructive` | restore from the saved place; these are opt-in destructive settings |
| Tags or attributes lost on a script | Script Sync ignores both | keep tag-bound configuration off the script instance |
| The language server flags real APIs as unknown | stale or missing `sourcemap.json` | regenerate it; not an engine-fact question ([api-currency.md](api-currency.md)) |
| Terrain, `MeshId`, or `HttpEnabled` will not sync | the plugin API cannot set them | change them in Studio |
| Two teammates overwrite each other | both syncing and editing the same script | one owner per synced tree |
| A `.luau` file regenerates after editing | roblox-ts or darklua output | edit the source, not the artifact |
| A Lune script errors on an API that works in Studio | Lune implements a subset of the Instance API | check its API-status page |

## Official links

- Script Sync: `create.roblox.com/docs/scripting/sync`
- Roblox third-party tools page: `create.roblox.com/docs/projects/external-tools`
- Rojo: `rojo.space/docs/v7/` · Argon: `argon.wiki` · Azul: `azul.ransomwave.games` · Lync: `github.com/Iron-Stag-Games/Lync`
- Rokit: `github.com/rojo-rbx/rokit` · Wally: `wally.run` · Luau LSP: `github.com/JohnnyMorganz/luau-lsp`
- StyLua: `github.com/JohnnyMorganz/StyLua` · selene: `kampfkarren.github.io/selene` · roblox-ts: `roblox-ts.com/docs`
- Lune: `lune-org.github.io/docs` · rbxmk: `github.com/Anaminus/rbxmk` · Tarmac: `github.com/Roblox/tarmac` · darklua: `darklua.com`
