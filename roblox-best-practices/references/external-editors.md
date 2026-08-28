# Editing Roblox Code Outside Studio

Roblox code can be authored in VS Code, Neovim, or any editor, through several tools that do not agree with each other about anything important. This file is what the agent reads before writing a file into such a project — it governs *where code lives and which side wins*, not how Luau is written.

## Contents

- [The one question to answer first](#the-one-question-to-answer-first)
- [Detecting the environment from disk](#detecting-the-environment-from-disk)
- [Studio Script Sync — the official one](#studio-script-sync--the-official-one)
- [Rojo](#rojo)
- [Argon](#argon)
- [Azul](#azul)
- [Other tools in the same space](#other-tools-in-the-same-space)
- [The toolchain that sits alongside](#the-toolchain-that-sits-alongside)
- [Moving an existing game out of Studio](#moving-an-existing-game-out-of-studio)
- [What breaks in every external-editor setup](#what-breaks-in-every-external-editor-setup)
- [Official links](#official-links)

## The one question to answer first

**Which side is the source of truth?** Every one of these tools answers differently, and answering wrong destroys the user's work rather than merely inconveniencing them. Writing a file and assuming Studio follows is correct under Rojo and catastrophic under a Studio-first tool, where the next sync tick can overwrite what you wrote — or push your half-finished file over a live place.

| Tool | Source of truth | Default port | Sync back into files |
|---|---|---|---|
| **Studio Script Sync** | the DataModel | n/a (in-process) | yes, with a conflict dialog |
| **Rojo** | the filesystem | 34872 | `rojo syncback`, a deliberate command; live two-way is experimental |
| **Argon** | configurable (`Initial Sync Priority`) | 8000 | yes, but **off by default** |
| **Azul** | the DataModel, **exclusively** for hierarchy | configurable | Studio to files is continuous; files to Studio only via `azul build`/`azul push` |

Two consequences the agent must act on:

- **Never assume a write to disk has reached the place.** Say which side you wrote to and what the user must do for the other side to see it. Under Rojo that is "the serve session will push it"; under Script Sync it is "Studio should already show it — confirm before you playtest"; under Azul a script body carries over but **a new or renamed file does not**, and needs `azul build` or `azul push`.
- **Never start, stop, or reconfigure a sync session on your own initiative.** A `--destructive` flag, a `syncback`, or flipping `Keep Unknowns` can delete instances that exist only in the place. Those are the user's calls ([studio-mcp.md](studio-mcp.md#irreversible-operations) applies the same principle to MCP writes).

## Detecting the environment from disk

Cheap, definitive, and worth doing before the first read:

| Present | Environment |
|---|---|
| `*.project.json` (usually `default.project.json`) | Rojo, or Argon in its default Rojo-compatible mode |
| `argon.toml` | Argon workspace config (overrides its global config) |
| `sourcemap.json` with no project file | Script Sync or Azul, with a sourcemap generated for the language server |
| Loose `.luau` files mirroring service names, no project file | Script Sync or Azul |
| A `sync/` directory mirroring service names | Azul's default `syncDir` |
| `wally.toml` + `Packages/` | Wally-managed dependencies, whichever sync tool is in use |
| `rokit.toml` / `aftman.toml` / `foreman.toml` | a pinned toolchain — read it, it names the exact tools and versions |
| `lune/` or `.lune/` holding `.luau` scripts | Lune automation — build, release, or place-file scripts, not game code |
| `stylua.toml`, `selene.toml`, `.luaurc` | formatting, lint, and type-strictness conventions that outrank sampled code ([adaptive-mode.md](adaptive-mode.md)) |
| None of the above | Studio-native; there is no filesystem to write to |

## Studio Script Sync — the official one

Roblox's own feature, generally available, no plugin and no CLI. In the Explorer, right-click an instance and choose **Sync to…**, then pick a local directory and open it in an editor. Studio remembers what was syncing and resumes on restart. Individual scripts also have **Open in External Editor**.

**It syncs four classes and ignores everything else:** `Script`, `LocalScript`, `ModuleScript`, `Folder`. A `Model`, a `Part`, a `RemoteEvent` in the synced tree simply is not represented on disk.

| On disk | In the DataModel |
|---|---|
| `name.luau` | `ModuleScript` |
| `name.server.luau` | `Script`, `RunContext = Server` |
| `name.client.luau` | `LocalScript` |
| `name.local.luau` | `LocalScript` |
| `name.legacy.luau` | `Script`, `RunContext = Legacy` |
| `name.plugin.luau` | `Script`, `RunContext = Plugin` |
| a directory | `Folder` |

**The data-loss trap, stated by Roblox's own docs:** attributes and tags on a synced script are **ignored** by the sync, so they can be lost. Before syncing a tree, check whether its scripts carry tags or attributes that the game reads — `CollectionService`-bound behavior often does ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)).

Other limits worth stating before a user commits to it:

- Deleting a top-level synced instance requires **stopping the sync first**.
- Ceilings: **10,000 scripts** per top-level instance, **128** top-level instances.
- **No debugger control from the external editor.** Breakpoints and stepping stay in Studio, so verification still happens in a Studio session ([verification.md](verification.md#newer-verification-levers)).
- No type checking of its own — that is the language server's job, below.
- **Team Create:** indicators show who else is syncing, and duplicate names auto-increment. Never let two people sync *and* edit the same script; each will overwrite the other.
- Conflicts open a resolution dialog itemizing what would be added, modified, or deleted on each side. Read it; do not click through it for the user.

For a full IDE experience the official answer is Script Sync plus the **Luau LSP** VS Code extension and its **Studio companion plugin** — not Rojo. That plugin supplies DataModel information for instances outside any build and exposes the endpoint the language server uses to map Script Sync's files.

## Rojo

The long-standing standard, and the only one of these whose model is *filesystem-first*: the project on disk defines the place, and `rojo serve` pushes it into Studio through the Rojo plugin. Each major version has its own plugin — a version 7 CLI needs the version 7 plugin.

Install the CLI with `rokit add rojo-rbx/rojo` then `rokit install`; install the plugin with `rojo plugin install`. The VS Code extension does **not** bundle the CLI and does not put it on `PATH`.

**The loop:** `rojo init <name>` scaffolds a project; `rojo build -o build.rbxlx` (or `.rbxl` for binary) writes a place file; `rojo serve` starts the sync server and prints its address and port, which the plugin's **Connect** button then attaches to.

**`rojo upload --asset_id <id> --cookie "<cookie>"` publishes to a live place, and that flag takes a `.ROBLOSECURITY` cookie — an account credential.** Never write one into a command you propose, a script, a config file, or anything that reaches a repository or a chat log; a leaked cookie is a full account takeover, and it is not revoked by changing a password. On Windows with Studio installed the flag can be omitted entirely. In CI, the value belongs in the runner's secret store and nowhere else ([security.md](security.md#threat-model-assume-all-of-these-exist)).

**`default.project.json`** — `name` and `tree` are required. Optional: `servePort`, `servePlaceIds` (a guard against syncing into the wrong place), `placeId`, `gameId`, `serveAddress`, `globIgnorePaths`, and `emitLegacyScripts` (**default `true`**, which is why a Rojo project emits `Script`/`LocalScript` rather than `RunContext` scripts — that is configuration, not a mistake). Inside `tree`, each node takes `$className`, `$path`, `$properties`, and `$ignoreUnknownInstances`; any other key becomes a child instance.

**File mapping:** a directory becomes a `Folder`; `.luau` a `ModuleScript`; `.server.luau` a `Script`; `.client.luau` a `LocalScript`; `.rbxm`/`.rbxmx` a model; `.csv` a `LocalizationTable`; `.txt` a `StringValue`; `.json`/`.toml` a `ModuleScript` returning a table. `init.luau`, `init.server.luau`, `init.client.luau`, and `init.plugin.luau` turn their *parent directory* into that script instead of a folder — **one init file per directory**. A sibling `.meta.json` attaches `properties`, `ignoreUnknownInstances`, and (in `init.meta.json` only) `className`.

**Properties** take an *implicit* form — the value's natural JSON, `"Anchored": true` — or an *explicit* one keyed by type, `{"Bool": false}`. **Rojo's own docs say to prefer implicit**: shorter, and it does not go stale. Explicit is for an enum value Rojo does not yet recognize, or a deliberate type override. Reaching for `.rbxm`/`.rbxmx` beats hand-typing a complex model's properties either way. Note that `Ref`, `Region3`, `Region3int16`, and `SharedString` have **no project-file representation** at all, and `BinaryString` does not live-sync — so some properties simply cannot live in the project file. Rojo labels this page a work in progress, so confirm an exotic type against the current page rather than this summary.

**What Rojo cannot sync live**, because the plugin API cannot set it: terrain, `MeshPart.MeshId`, `HttpService.HttpEnabled`. Do not diagnose these as project misconfiguration.

**Coming from Rojo 6:** the explicit property syntax changed. Version 6 wrote `{"Type": "Enum", "Value": 512}`; version 7 writes `{"Enum": 512}`, and `CFrame` became an object with `position` and `orientation` instead of a flat array. A project file in the old shape is genuinely stale under a version 7 CLI — that is one of the few project-file findings worth raising.

**`rojo syncback`** pulls instances *out* of a Roblox file into an existing project: `rojo syncback path/to/project --input path/to/file.rbxl`. It is governed by `syncbackRules` in the project file — `ignoreTrees` (paths in the Roblox file), `ignorePaths` (paths on disk), `ignoreProperties`, `syncCurrentCamera` (default `false`), and `syncUnscriptable` (default `true`). It rewrites the working tree, so it belongs behind the user's explicit request and a clean commit.

The plugin's live **Two-Way Sync** setting is a separate, long-standing experimental feature. Do not recommend it as the way to get changes back; `syncback` is.

`rojo sourcemap --watch default.project.json --output sourcemap.json` produces the file the language server needs. `rojo build` produces an `.rbxl`/`.rbxm`.

Two documented workflows: **partially managed** (Rojo owns the scripts, Team Create owns everything else — each programmer working in their own place) and **fully managed** (Rojo owns the whole game, enabling hermetic builds and continuous deployment). The partial one is what most existing games adopt first.

## Argon

A Rust CLI plus a VS Code extension and a Studio plugin, filesystem-first like Rojo and Rojo-compatible by default (`rojo_mode`), but with two-way sync as a supported feature rather than an experiment. Its default port is **8000**, so it does not collide with Rojo's.

Install with `rokit add argon-rbx/argon --global`, `cargo install argon-rbx`, or the standalone executable; the plugin installs itself by default.

Commands: `init`, `serve` (live sync), `build`, `sourcemap`, `stop`, `studio`, `debug` (drive a playtest: `play`, `run`, `start`, `stop`), `exec` (**run Luau inside Studio** during a live session), `update`, `plugin`, `config`, `doc`, `help`.

**The defaults that matter, because they are conservative and users often have not changed them:** in the plugin, `Two-Way Sync` is **`false`**, `Syncback Properties` is `false`, `Only Code Mode` is `true` (syncs back only scripts and their ancestors), `Keep Unknowns` is `false` (**instances absent from the filesystem get destroyed**), `Initial Sync Priority` is `Server`, and `Changes Threshold` is `5`. In the CLI, `lua_extension` is `false`, meaning `.luau`, and `rename_instances` is `true` — see the naming trap below. Check `argon.toml` before assuming any of these.

**Its project file is not Rojo's, despite the same filename.** Argon renames five fields: `serveAddress` is `host`, `servePort` is `port`, `servePlaceIds` is `placeIds`, `globIgnorePaths` is `ignoreGlobs`, and `emitLegacyScripts` is `legacyScripts` (still defaulting to `true`). Rojo's singular `placeId` must become an entry in the `placeIds` array. Argon adds `syncRules` — custom file interpretation by `type`, `pattern`, `childPattern`, `exclude`, and `suffix` — and a `syncback` section. **Do not copy field names between the two tools in either direction.**

It reads more file types than Rojo: on top of the shared set it handles `.yaml`/`.yml` and `.msgpack` as table modules, and `.md` as a `StringValue` with rich-text markup. Its `.meta.json` uses **`keepUnknowns`** where Rojo writes `ignoreUnknownInstances`. With `legacyScripts` disabled, `.server.luau` becomes a `Script` with Server run context and `.client.luau` a `Script` with **Local** run context rather than a `LocalScript`.

Property support is broader than Rojo's project files: `SharedString`, `Region3`, `Region3int16`, and `OptionalCFrame` are all representable. Bytecode is not, binary data such as terrain and CSG is limited during live sync, and `Lighting.Technology` cannot be applied through the plugin API at all.

**The naming trap.** Instance names become filenames, so they inherit the OS's rules: on Windows, no `< > : " / \ | ? *`, no trailing period or space, nothing over 255 characters, and none of the reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`); on macOS and Linux, no `/` and no null. Because `rename_instances` defaults to `true`, Argon **silently strips forbidden characters**, so the instance in Studio can end up named differently from what the code looks for. Name instances as legal filenames from the start ([style-rules.md](style-rules.md)).

**Porting an existing place** runs backwards through the plugin: start from an empty project whose file lists the services you want, set the plugin's `Initial Sync Priority` to **`Client`**, serve, connect, and accept the incoming changes — **the CLI is the only place that prompt appears**. Filter what comes across with `ignoreNames`, `ignoreClasses`, and `ignoreProperties` under `syncback`. Importing directly from a saved `.rbxl`/`.rbxlx` is **not supported**; that is Rojo's `syncback` territory.

**roblox-ts is first-class here** — `argon init`, `serve`, and `build` all take a TypeScript mode — which is the clearest reason to pick Argon over a Studio-first tool for a TypeScript project.

For plugin development, Argon's docs pair `--plugin` with Studio's **File → Studio Settings → Directories → Reload plugins on file changed**. **On Linux, `argon studio` and `argon debug` do not work**, and `--plugin`, `--focus`, and `--standalone` are partially unsupported — relevant whenever CI or a Linux workstation is involved.

## Azul

Studio-first: the DataModel is authoritative and Azul mirrors it into a local directory, so an existing place needs no conversion and no project file — connecting the plugin generates the file representation. A daemon plus a companion plugin, GPL-3.0, requiring Node.js. Install with `npm install -g azul-sync` and the **Azul Companion Plugin** (asset `79510309341601`) from the Creator Store; both are required. Update with `npm install -g azul-sync@latest` and, in Studio, **Plugins → Manage Plugins → Azul → Update**.

**The asymmetry that decides how you use it.** Azul's docs state that Studio is the **exclusive** source of truth for instance creation, deletion, and renaming. Studio changes reach the filesystem automatically; doing the same to files in `syncDir` during a session **will not affect Studio**. Script *contents* are what flows both ways. So: **manage the hierarchy in Studio, edit script bodies locally**, and use `azul build` or `azul push` to import anything structural from disk. Creating a file and expecting an instance to appear is the mistake this tool invites.

**Files on disk** mirror the hierarchy into `syncDir` (default `./sync`): `sync/ServerScriptService/MyScript.server.luau`. `*.server.luau` is a `Script`, `*.client.luau` a `LocalScript`, and a **`ModuleScript` carries no suffix at all** unless `suffixModuleScripts` is on, which makes it `*.module.luau`. There is **no `init.luau` convention** — a script with children gets a sibling folder named after it, keeping the mapping one-to-one. Do not carry Rojo's filenames over.

**Commands:** `azul` starts the daemon; `azul build` pushes the whole local tree into Studio (`--from-sourcemap`, `--rojo`, `--rojo-project`, `--destructive`); `azul push` pushes a subtree (`--source`, `--destination`, `--no-place-config`, plus the same `--rojo` and `--destructive`); `azul pack` serializes Studio's instance properties into `sourcemap.json` (`--scripts-only`, `-o` for a named output); `azul config` opens the config (`--path` prints its location). Global flags: `--sync-dir`, `--port`, `--debug`, and `--no-warn` — **`--no-warn` skips the confirmation prompts, so never put it in a command you propose.**

**Config lives in two places.** The CLI user config carries `daemonPath`, `port`, `syncDir`, `sourcemapPath`, `scriptExtension`, `fileWatchDebounce`, `deleteOrphansOnConnect`, `suffixModuleScripts`, `checkForUpdates`, and `debugMode`. Per-place config lives **inside the place**, as a ModuleScript at `ServerStorage.Azul.Config`, returning a table with `port`, `debugMode`, and `pushMappings` (each mapping taking `source`, `destination`, `destructive`, `rojoMode`, `fromSourcemap`, `deleteOrphansOnConnect`). The daemon merges it with the CLI config on connect, which is how a team shares settings — **read it before running any push, because a mapping can carry `destructive = true`.** Plugin settings cover the WebSocket URL (`ws://localhost:<port>`, and a mismatch here is the usual cause of a dead connection), a service include/exclude list, and excluded parents.

**Rojo compatibility mode (`--rojo`)** reads `default.project.json`, including nested project files, and handles scripts, folders, and `*.model.json`. It does **not** handle `*.rbxm`/`*.rbxmx` (use Rojo's own build) or `.meta.json` files. Plain text, `.csv` localization tables, and TOML modules are unimplemented.

**Packages** come in through `azul push --rojo`, since package managers lay out Rojo-style trees — typically `azul push -s Packages -d ReplicatedStorage.Packages --destructive --rojo`, or a `pushMappings` entry so the flags need not be repeated. **Azul's own documentation recommends against Wally** and points at "LPM" instead; treat that as the tool author's preference rather than a settled fact — Wally's repository is **not** archived, and this skill has not confirmed which "LPM" is meant. Use whatever the project already uses.

**Distribution:** `azul pack -o name.sourcemap.json` serializes a project others import with `azul push` or `azul build`. The working `./sourcemap.json` is regenerated automatically — **do not source-control it, edit it, or hand-modify it**.

**Where its own author says not to use it:** when Git-based version control is the primary workflow (a filesystem-first tool serves that better), when the project wants a non-standard feature-based layout, and when the project needs a battle-tested tool — it is newer and solo-maintained. **roblox-ts cannot work with it**, and that is structural, not a missing feature: two-way sync cannot reconcile a TypeScript source and its generated Luau.

## Other tools in the same space

- **Lync** (Iron-Stag-Games) — filesystem-first like Rojo, written in Node.js, and distinguished by syncing **all in-game content rather than only scripts**: models, properties, attributes, tags, collision groups, and terrain. Its live sync goes through the plugin API rather than parsing binary formats, which is why its docs claim it keeps working across Roblox updates. Install via Rokit or a release binary; the Studio plugin installs itself each time a session starts.

  **Its script class comes from a comment inside the file, not the filename.** A bare `.luau` is a `ModuleScript`; `--@script:server`, `--@script:client`, `--@script:legacy` (or plain `--@script`), and `--@localscript` select the class and run context, and `--@disabled` ships the script disabled. **Never delete or reorder these — the skill's ban on in-body comments does not reach them, because they are configuration wearing a comment's syntax.** Init files are `Init.LUA` or `<DirectoryName>.Init.LUA`, which turn the parent directory into the script while its siblings stay parented under it.

  The project file (`Default.Project.JSON`) **requires `port`, `experienceId`, `placeId`, and `tree`**, and its tree keys go past what other tools express: alongside `$className`, `$path`, and `$properties` it takes `$attributes`, `$tags`, `$clearOnSync`, `$terrainRegion`, and `$terrainMaterialColors`. It also drives `sources` (automated downloads) and `jobs` (automated tasks). Beyond the shared file types it reads `.yaml`, `.toml`, and `.Excel.JSON`.

  Modes: `LYNC SERVE` (live sync), `LYNC OPEN` (build, sync, and launch Studio), `LYNC FETCH` (download the project's sources), `LYNC CONFIG`, `LYNC HELP`. **State the gaps honestly before recommending it:** `LYNC BUILD` is documented but currently unavailable, the `LYNC INIT` conversion wizard does not exist yet (its docs point at the repository's sample project instead), localization tables are unimplemented in build mode, and building from source is Windows-only.
- **rbxmk** — a Go tool, MIT-licensed, whose one real subcommand is `rbxmk run <script>.lua`: a **Lua** (not Luau) environment for producing, transforming, and writing Roblox data, with libraries such as `fs`, `path`, and `rbxmk`, plus documented format, type, and enum tables and a `download-asset` path for `rbxassetid`. Install a prebuilt release or `go install github.com/anaminus/rbxmk/rbxmk@latest`. A build-pipeline tool, not a sync tool, and it overlaps heavily with Lune — **prefer Lune for new work**, since it is Luau, actively developed, and typed for the language server.

  **Its own README says thorough testing of all features is still in progress and advises keeping backups.** Repeat that caveat to the user rather than presenting rbxmk as a settled part of a pipeline, and never point it at the only copy of a place file.
- **Lune** — a standalone Luau runtime, the usual home for post-processing a build, automating releases, and running pure-logic tests in CI ([verification.md](verification.md#rojo--filesystem-environments)). It supersedes **Remodel**, which is legacy; a project still on Remodel is dated, not broken.

  Scripts are ordinary `.luau` files run with `lune run <name>`, which searches the current directory and then `lune/` and `.lune/` (locally, then in the home directory); `lune list` shows what is available, using a `-->` comment at the top of each file as its description; `lune run -` reads from stdin. The standard library is imported by alias — `require("@lune/fs")` — and covers `fs`, `net`, `process`, `stdio`, `task`, `datetime`, `luau`, `regex`, `serde`, and `roblox`. **`lune setup` generates the type definitions and writes a `.luaurc`** so `luau-lsp` understands all of it.

  Its `roblox` library reads and writes place and model files: `deserializePlace`/`deserializeModel` and `serializePlace`/`serializeModel` (each serializer takes an optional `xml` flag). **They take file *contents*, not paths** — pair them with `fs.readFile`, which is the mistake a Remodel habit produces. `getReflectionDatabase` exposes bundled class, enum, and property data; `implementProperty` and `implementMethod` let a script stub an API Lune lacks; and `studioApplicationPath`, `studioContentPath`, `studioPluginPath`, and `studioBuiltinPluginPath` locate a local Studio install.

  **A Lune script is not a Roblox script.** The implemented Instance surface is a documented subset — construction, hierarchy, finding, attributes, and tags — with `GetService`/`FindService` on the DataModel, and `Instance.new` **without** the second parent argument. Lune's own docs say an API not on that list may never be implemented, so check the API-status page instead of assuming engine parity. Datatypes are broadly covered but recently added members may be missing.

  **Two security facts that must be said out loud before proposing a Lune script.** First, **a Lune script has full access to the machine** — files, programs, network — with no sandbox by default; Lune's docs recommend a container or VM for anything untrusted. Never run one you did not read, and say so when you hand the user a script. Second, **`roblox.getAuthCookie()` reads the user's real `.ROBLOSECURITY`**. It exists so a build script can call the web API, and it is the same account-takeover credential as `rojo upload --cookie` — never print it, log it, write it to a file, or send it anywhere ([security.md](security.md#threat-model-assume-all-of-these-exist)).

## The toolchain that sits alongside

None of these sync anything; they are what make an external editor worth using. Roblox maintains its own page listing several of them — Rojo, Rokit, Wally, selene, StyLua, and the Luau Language Server — with the caveat that **none is maintained by Roblox and any of them can change or stop working at any time**. Being on that list is a signal of adoption, not a support guarantee.

- **Rokit** — the toolchain manager that pins tool versions per project, MIT-licensed and listed on Roblox's own third-party page. Its manifest is **`rokit.toml`**, and it reads existing `aftman.toml` and `foreman.toml` too — something neither of those does for the other. Commands: `rokit init`, `add`, `list`, `install` (set up every tool the project pins), `update`, `authenticate` (GitHub or another artifact provider), `self-install`, `self-update`. Install it with the vendor's script — `curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash` on macOS and Linux, `Invoke-RestMethod https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.ps1 | Invoke-Expression` on Windows — or `cargo install rokit --locked` followed by `rokit self-install`.

  Prefer it for new setups: Foreman is maintained for Roblox's internal use and Aftman's maintainer has moved on, while Rokit is the actively community-maintained one. **An existing `aftman.toml` or `foreman.toml` is not a defect, and migrating one is not your call.**

  **Read the manifest before reasoning about any other tool in the project.** It names the exact pinned version, which is what settles whether a project file follows Rojo 6's or Rojo 7's shape, whether `.luau` is expected, and which CLI flags exist at all — the same "check, don't remember" discipline the rest of this skill applies to engine APIs ([api-currency.md](api-currency.md#how-to-verify-the-toolbox)).
- **Wally** — the package manager, a CLI plus a registry server. Install it with Rokit or Aftman (Wally's own docs say `aftman add UpliftGames/wally`, and Rokit reads the same manifests), `brew install wally`, a release binary, or `cargo install --locked --path .`. Commands: `wally init`, `wally install`, `wally update`, `wally publish`, `wally login`/`logout`, `wally search`. **CI runs `wally install --locked`**, which is what makes `wally.lock` mean anything.

  `wally.toml`'s `[package]` takes `name` (`scope/name`, lowercase letters, numbers, and dashes), `description`, `version` (semver), `license` (an SPDX expression, required to publish publicly), `authors`, `realm`, `registry`, `homepage`, `repository`, `include`/`exclude` (gitignore is respected by default), and `private` to block publishing. Dependencies split across `[dependencies]`, `[server-dependencies]`, and `[dev-dependencies]`, which install into separate folders — conventionally `Packages`, `ServerPackages`, and `DevPackages`, each mapped somewhere different by the project file.

  **`realm` is a security boundary, not a label.** `shared` replicates to clients; `server` is for packages that must not. A server-realm package mapped into `ReplicatedStorage` is readable by every exploiter, and that is a real finding ([security.md](security.md#threat-model-assume-all-of-these-exist)).

  **The trap worth knowing: Wally's generated package thunks do not re-export types**, so a package's exported Luau types do not resolve and the language server reports errors in correct code. The fix is [`wally-package-types`](https://github.com/JohnnyMorganz/wally-package-types): `wally install`, then `rojo sourcemap default.project.json --output sourcemap.json` (Rojo 7.1.0 or later), then `wally-package-types --sourcemap sourcemap.json Packages/`, once per package folder. **Diagnose this before treating a package-typed error as a real one.**

  Registry policy worth relying on: packages are scoped to a GitHub user or organization, and a **published version can be yanked but not deleted**, so a pinned dependency does not vanish underneath a project. Full removal happens only for legal or conduct reasons. Registry ownership states who may modify a package — it is not a copyright claim.

  Wally is the most widely used option, is listed on Roblox's own third-party tools page, and its repository is active and unarchived. **pesde** is the notable alternative, and some tools argue against Wally in their own docs. Follow whatever the project already uses ([community-libraries.md](community-libraries.md)); never migrate a project's package manager unasked.
- **Luau LSP** (`JohnnyMorganz.luau-lsp`) — the reason intellisense works outside Studio. It reads `sourcemap.json` to resolve the DataModel tree, and preloads current Roblox type definitions by default. Settings: `luau-lsp.sourcemap.enabled`, `.autogenerate`, `.rojoProjectFile`, `.sourcemapFile`, `.includeNonScripts`, `.generatorCommand` (for non-Rojo generators), plus `luau-lsp.types.definitionFiles`, `luau-lsp.types.documentationFiles`, and `luau-lsp.platform.type`. Its **Studio companion plugin** covers instances that no build knows about. A missing or stale sourcemap is the cause of most "the LSP says this doesn't exist" reports — regenerate it before treating the complaint as a real type error.
- **StyLua** — the formatter. `stylua.toml` with `syntax = "Luau"`; defaults are `column_width = 120`, tabs, width 4. `stylua --check` in CI, `-- stylua: ignore` for a block, `.styluaignore` for paths. **Whatever it is configured to do outranks this skill's formatting preferences** for that project.
- **selene** — the linter. `selene.toml` with `std = "roblox"` generates the Roblox standard library automatically and refreshes it periodically; `selene update-roblox-std` forces it, and `roblox-std-source = "pinned"` with `selene generate-roblox-std` freezes it for offline or reproducible builds. `std = "roblox+testez"` adds TestEZ globals.
- **roblox-ts** — a TypeScript-to-Luau compiler with its own project layout. In a roblox-ts project the `.luau` files are **build output**: never edit them, and never review them as authored code. The sources are `.ts`.
- **darklua** — rule-based Lua transformation: require conversion, bundling, minification. A build step.
- **Tarmac** — asset and image manager (`tarmac.toml`, `tarmac sync`) that uploads images and generates modules mapping names to asset ids, which is what makes a Rojo build hermetic.
- **Verde** — a VS Code extension reproducing Studio's Explorer and Properties windows, working from the sourcemap of Rojo, Argon, or Azul, or from Script Sync plus Luau LSP.

## Moving an existing game out of Studio

The order that avoids losing work:

1. **Decide the scope honestly.** Scripts only (partially managed) is the low-risk move and is what most live games do. Full management means the filesystem owns models, terrain, and settings too — a much larger project.
2. **Reorganize inside Studio first, while it is still easy.** Scripts scattered across GUI elements, parts, and tools should be consolidated into `ServerScriptService`, `ReplicatedStorage`, and `StarterPlayer`, with duplicated per-instance scripts replaced by one tag-bound handler ([patterns/world.md](patterns/world.md)). Rojo's own porting guide recommends this before any tool is introduced.
3. **Pick the tool by the honest answer to "who edits what".** If designers keep building in Studio and only programmers leave, a Studio-first tool or Script Sync fits the team. If the goal is Git, code review, and reproducible builds, a filesystem-first tool does.
4. **Extract, don't retype.** `rbxlx-to-rojo` converts a saved place into a Rojo project; `rojo syncback` pulls a place into an existing one; Lune handles the cases needing custom logic. Manually recreating a hierarchy loses properties silently.
5. **Keep a saved copy of the place file before the first push**, and never run a `--destructive` build against the live place.

None of this locks the project in: these tools produce ordinary places and models, so a project can stop using them by editing the place directly.

## What breaks in every external-editor setup

| Symptom | Cause | What to do |
|---|---|---|
| Edits on disk never appear in Studio | no serve session, plugin not connected, or the wrong place is open | check the connection before debugging the code |
| Studio edits vanish on the next sync | filesystem-first tool with two-way sync off — the expected behavior | edit in files, or turn two-way sync on deliberately |
| A file created, renamed, or deleted on disk changes nothing in Studio | a Studio-first tool: hierarchy is Studio's alone | do it in Studio, or import with `azul build`/`azul push` |
| Instances disappear after connecting | `Keep Unknowns` off, `$ignoreUnknownInstances`, or a `--destructive` flag | restore from the saved place file; these are all opt-in destructive settings |
| Tags or attributes lost on a script | Script Sync ignores both | keep tag-bound configuration off the script instance |
| The language server flags real APIs as unknown | stale or missing `sourcemap.json` | regenerate it; this is not an engine-fact question ([api-currency.md](api-currency.md)) |
| Terrain, `MeshId`, or `HttpEnabled` will not sync | plugin API cannot set them | change them in Studio; it is a platform limit |
| Two teammates overwrite each other | both syncing and editing the same script | one owner per synced tree |
| A `.luau` file resists editing and regenerates | it is roblox-ts or darklua build output | edit the source, not the artifact |
| A Lune script errors on an API that works in Studio | Lune implements a documented subset of the Instance API | check its API-status page; stub it with `implementMethod` if it is genuinely needed |

## Official links

- Script Sync: `create.roblox.com/docs/scripting/sync`
- Rojo: `rojo.space/docs/v7/` · `github.com/rojo-rbx/rojo` · support in the Roblox OSS Community Discord's `#rojo` channel, bugs on the GitHub tracker
- Argon: `argon.wiki` (`/api/file-types`, `/api/project`, `/api/forbidden-characters`) · `github.com/argon-rbx`
- Azul: `azul.ransomwave.games` · `github.com/Ransomwave/azul` · npm `azul-sync`
- Roblox's own third-party tools page: `create.roblox.com/docs/projects/external-tools`
- Rokit: `github.com/rojo-rbx/rokit` · Wally: `wally.run` (`/install`, `/policies`) · Luau LSP: `github.com/JohnnyMorganz/luau-lsp`
- StyLua: `github.com/JohnnyMorganz/StyLua` · selene: `kampfkarren.github.io/selene` · roblox-ts: `roblox-ts.com/docs`
- Lune: `lune-org.github.io/docs` (`/roblox/4-api-status`, `/getting-started/4-security`) · `github.com/lune-org/lune`
- rbxmk: `github.com/Anaminus/rbxmk` · Tarmac: `github.com/Roblox/tarmac` · darklua: `darklua.com`
