# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and from 2.0.0 this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Earlier versions were numbered by the size of each change rather than by SemVer, so some numbers between releases were never used. The version is the one in `package.json`; the release tag is that version prefixed with `v`.

From 2.0.0, skill content is ported from [roblox-optimum](https://github.com/andrian-syh/roblox-optimum), and each release names the roblox-optimum version it was ported from.

## [Unreleased]

## [2.1.0] - 2026-10-07

This release is not a port. It aligns the skill with current skill-authoring guidance from the Agent Skills specification and vendor documentation, and corrects the Azul guidance in `external-editors.md` against Azul 2.3.0 and its documentation, as reported in [#1](https://github.com/andrian-syh/roblox-best-practices-skill/issues/1).

### Added

- A trigger test set, `evaluations/triggers.json`: ten queries that must load the skill and ten near-misses that must not.
- Evaluation procedures for comparing each scenario against a run without the skill, for trigger tests, and for testing in other languages.
- A language rule: the agent replies in the user's language, and code and Documentation Comments follow the project's language, with English as the default.
- The `liveFsSync` setting, which turns off the replication of filesystem actions to Studio during a live session, together with its `usePolling` and `pollInterval` options.
- Azul's best practices for distributing a project: when a sourcemap is needed at all, the `*.sourcemap.json` naming, and importing with `--from-sourcemap` and `--destructive`.

### Changed

- The `description` now states what the skill does and when to use it instead of summarizing its rules, says it applies to requests in any language, and names the nearby cases it does not cover.
- `SKILL.md` is within the 5,000-token guideline. The preflight and finishing-gate sections are merged, and wording that repeated the invariant card or a reference file is shortened. No rule was removed.
- Capitalized emphasis outside the invariant card is replaced with plain wording and, where it was missing, the reason for the rule.
- Evaluation queries are written in English.

### Fixed

- The skill no longer says Azul is unsuited to a Git-based workflow. Azul works with Git whether the repository holds only the code or the whole game.
- The skill now warns that Studio always wins over local state on session start, so offline edits on disk are overwritten when the plugin connects.
- `daemonPath` is removed from the list of CLI settings, since Azul does not have it.

## [2.0.0] - 2026-10-07

_Ported from roblox-optimum 1.11.5. Upgrade by running the installer again. No project changes are needed._

### Added
- Add `diagnosis.md`, which narrows a reported symptom to a confirmed cause before any fix.
- Add `team-workflow.md`: git alongside a place file, branch places, tree ownership, and the merge gate.
- Add a table of contents to `community-libraries.md`, with new sections on judging networking libraries and on Jecs.
- Add `INSTALL.md` with requirements, options, install locations, agent-specific notes, update, and uninstall.
- Add `MAINTAINING.md` with the port and release procedure.
- Add `scripts/port-from-optimum.mjs`, which copies references from a roblox-optimum checkout and lists the lines that need a standalone rewrite.
- Add a validator check that `SKILL.md` states the same version as `package.json`.
- Add `license` and `metadata.version` to the `SKILL.md` frontmatter.

### Changed
- **Breaking:** Revise the invariant card. Item 5 exempts cold paths and timer-driven work, item 7 applies only where a yield sits between a check and its use, and item 9 requires a search before any claim about a file.
- Port every reference from roblox-optimum 1.11.5. The largest updates are `api-currency.md` (engine 739 baseline, the three release-note pages, a probe that separates present, gated, and unreadable members, new deprecations), `limits-budgets.md` (MessagingService, HTTP, and remote limits), `patterns/network.md` (per-type remote rate limits, the unreliable payload cap), `minimal-code.md`, `templates.md`, and `luau-language.md` (stricter generic bodies, `if local` bindings in beta).
- Rewrite the `SKILL.md` description so the skill also triggers when a request never names Roblox or Luau, and on a reported symptom with no file named.
- Count runtime rules in `SKILL.md` and `runtime-rules.md` as card items 3 to 7, with network budgeting kept in the file.
- Download the newest release tag in the fallback installers (`install.sh`, `install.ps1`) instead of `main`.
- Apply `--tag` in interactive mode, where it now skips the version menu.
- Install only to detected agents under `--all`.
- Point Kilo Code at `~/.kilo/skills`, and fold Codex and Warp into the Universal global entry (`~/.agents/skills`), which they read.
- Document every script to its language's convention: JSDoc in `bin/cli.js` and `scripts/port-from-optimum.mjs`, comment-based help in `install.ps1` (`Get-Help .\install.ps1`), a usage header in `install.sh`, and docstrings in `scripts/validate-skill.py`.
- Move installation detail from `README.md` to `INSTALL.md`, and rewrite `README.md`, `evaluations/README.md`, and this file to current documentation conventions.

### Removed
- Remove the unused `copyFileSync` helper and `execSync` import from `bin/cli.js`.
- Remove the hard-coded v1.1.7 and v1.0.0 menu entries shown when GitHub is unreachable. Any tag can still be typed.

### Fixed
- Stop the installers from printing `[INSTALLED] (Assumed)` for agents they did not install to.
- Exit with code 1 and print `[FAILED]` in `bin/cli.js` when a file cannot be copied, instead of reporting success.
- Read the `install.sh` confirmation prompt from `/dev/tty`. Under `curl | bash` it read from the script itself.
- Print colours correctly in `install.sh` under bash, whose `echo` does not expand `\033`.
- Correct the `external-editor-environment` evaluation for Azul 2.0, where files created during a live session reach Studio.

## [1.19.2] - 2026-08-28

_A validation pass over the Luau reference on luau.org, and a fix for an installer that wrote the same folder twice._

### Added
- Recommend `unknown` over `any` for untrusted input, so the type checker demands the validation a remote handler owes.
- State that a method's `self` needs its own annotation in every method.
- List what refines a type: truthiness, `type(x) == "..."`, literal equality, `assert`, `IsA`, and their `and`/`or`/`not` compositions.
- Note that a `require` path the checker cannot resolve statically is silently untyped.
- Add a "What the sandbox removes" section: `io`, `package`, `dofile`, `loadfile`, `string.dump`/`load`, most of `os`, `collectgarbage` beyond `"count"`, and the features rejected by design (`goto`, integer types, bitwise operators, ephemeron tables, `__gc`).
- Add a "What the VM rewards" section to `performance.md`: inline caches for constant field names, specialised iteration bytecode, `table.create`, and the deoptimisation caused by `loadstring`, `getfenv`, and `setfenv`.
- Tabulate the linter's 28 warning names.

### Fixed
- Remove `vector.lerp`, which does not exist. Use `math.lerp` for scalars and `a + (b - a) * t` for vectors.
- Describe `issubtypeof` as a method on a type inside a type function, not a built-in type function.
- Write each install destination once. Running from the home directory made the workspace and global `.agents/skills` paths the same folder, and the second write deleted the first.

## [1.19.1] - 2026-08-28

_An audit of every listed agent against its vendor's documentation. Skill content is unchanged._

### Added
- Add `~/.agents/skills/` as an install target. Cline, Dexto, Kimi Code CLI, Loaf, Zed, and Warp read it as their global path, and several other agents read it as an alias.
- Add Antigravity, Antigravity CLI, OpenCode, Warp, Grok Build, Kimchi, MiniMax Code, Posit Assistant, ZCode, Amp and Replit, and Zencoder and Zenflow.

### Removed
- Remove Roo Code, which shut down, and Continue, which was discontinued and never had a skills directory.
- Remove Eve and PromptScript, which have no home-directory skills path.

### Fixed
- Correct 20 global paths that were project paths, including GitHub Copilot (`~/.copilot/skills`), Windsurf (`~/.codeium/windsurf/skills`), Goose, Crush, Devin for Terminal, Cortex Code, Tabnine, Pi, DeepAgents, AstrBot, OpenClaw, and Zenflow.
- List Gemini CLI (`~/.gemini/skills`) and Antigravity (`~/.gemini/config/skills`) as separate products.
- Detect agents by the folder that holds `skills`, so every agent under `~/.config/` is no longer pre-selected when `~/.config` exists.
- Say that the workspace `.agents/skills` path is project scope only, and correct the agent count in `install.sh`.

## [1.19.0] - 2026-08-28

_Coverage of editing outside Studio, read from each sync tool's own documentation._

### Added
- Add `external-editors.md`. It settles which side is the source of truth first, then covers Studio Script Sync, Rojo, Argon, Azul, and Lync, how to detect each from disk, the surrounding toolchain (Rokit, Wally, Luau LSP, StyLua, selene, roblox-ts, darklua, Tarmac, Lune, rbxmk), moving a game out of Studio, and a symptom table.
- Add two standing rules: never assume a disk write reached the place, and never start, stop, or reconfigure a sync session unasked.
- Add Pronghorn to `community-libraries.md`.

### Changed
- Read Roblox release notes from the weekly `/docs/updates/<date>` pages, fetched with a `.md` suffix, instead of from the DevForum.
- Treat a member announced for an engine version the API dump lacks as unconfirmed, not absent.
- Route the `SKILL.md` environment bullet to `external-editors.md`.
- Check in `verification.md` that a change reached the place before a playtest is trusted.
- Read `foreman.toml` and `argon.toml` in `adaptive-mode.md`, and treat a bare `sourcemap.json` as Script Sync or Azul.

### Fixed
- Add nine external-editor shapes to `false-positives.md` that are not defects, including `Script` and `LocalScript` in a Rojo project, `init.luau`, and Lync's `--@` directive comment, whose removal turns a `Script` into a `ModuleScript`.
- Note that Wally thunks drop exported types (fixed by `wally-package-types`), and that Wally's `realm` is a security boundary.
- State Lune's lack of sandboxing and its partial Instance API, and record rbxmk as Lua rather than Luau.

### Security
- Flag `rojo upload --cookie` and Lune's `roblox.getAuthCookie()` as `.ROBLOSECURITY` handlers that must never appear in a command, a config file, a repository, or a log.

## [1.18.2] - 2026-08-26

_The full UI and cloud-services documentation, the official Studio MCP page, and an audit that gathers evidence instead of impressions._

### Added
- Add scoping, evidence gathering, a "Not assessed" cell, and a verdict capped by the lowest dimension to `evaluation-matrix.md`.
- Add an audit workflow to `studio-mcp.md`, and require enumerating the connected tools before the first call in every session.
- Rewrite `ui-crossplatform.md` against 28 UI pages: container lifetimes, layout precedence, clipping limits, the styling system, rich text and filtering, interaction objects, and specialty frames.
- Add real cloud limits to `limits-budgets.md`: DataStore budgets at both ceilings, per-key throughput, MemoryStore quota formulas, HTTP, secrets, and Extended Services.
- State that an `UpdateAsync` transform may not yield, that `GetAsync` serves a four-second cache, and how version history overwrites same-hour writes.
- Add right-to-be-forgotten obligations, MemoryStore structure selection, and the secrets store.
- Add Cloud calls and UI sections to `edge-cases.md`, six near-miss pairs to `false-positives.md`, and matching gates to `review-checklist.md`.

### Fixed
- Stop treating absence from a documentation page as proof that a Studio MCP tool does not exist.
- Target one of several Studio instances with a `studio_id` argument per call, not a "set active studio" tool.
- Remove `UIFlexLayout`, which does not exist. Flex lives on `UIListLayout` plus `UIFlexItem`.

## [1.18.1] - 2026-08-26

_Every claim now names a source. Read against the Creator Hub performance guides, the `Workspace` reference, the Luau reference, and the Coding Fundamentals series._

### Added
- Document the MicroProfiler in full: shortcuts, dump locations, capture limits, modes, threads, custom scopes, and the network view.
- Document Scene Analysis (six views) and the six `SceneAnalysisService` methods.
- Add task scheduler phases, join time as a metric, post-ship monitoring, and non-scriptable Studio settings.
- Add Parallel Luau constraints and its four safety levels.
- Separate Roblox's published performance figures from the skill's heuristics in `api-currency.md`.
- Add language fundamentals to `luau-language.md`: truthiness and coercion, table copy semantics, and per-context `require` caching.
- Document what survives a remote call in `patterns/network.md`.
- Add to `security.md`: designing exploits out, `NaN` in range checks, payload shape spoofing, the consequence ladder, script capabilities for third-party assets, decompilable client code, and network ownership as authority.
- Add where code lives and `Script.RunContext` to `style-rules.md`, the full script-directive set, and bindable marshalling.
- Add a table of where the official tutorials differ from shipping code.

### Changed
- Scope `evaluation-matrix.md` to audits the user asks for.
- Add server-heartbeat, ping, low-end crash, and join-time rows to the `performance.md` symptom table.
- Trim `SKILL.md` back under 5,000 tokens.

### Removed
- Remove the per-tag MicroProfiler millisecond budgets added in 1.18.0, which Roblox publishes nowhere.

### Fixed
- Correct the `SignalBehavior` default: `Default` resolves to Immediate, not Deferred.
- Fix a stale StyleQuery claim, the `Model.ModelStreamingMode` spelling, and five mislabelled cross-references.
- Class the `Instance.new` parent argument as Advisory everywhere.
- Promote `SceneAnalysisService`, `Workspace.PlayerCharacterDestroyBehavior`, and `Workspace.ImprovedPhysicsReplication` to [GA].

## [1.18.0] - 2026-08-26

_Studio diagnostic scopes, Scene Analysis, and low-end hardware budgets._

### Added
- Map six MicroProfiler engine scopes to their mitigations in `performance.md`.
- Add Scene Analysis and `SceneAnalysisService` procedures for leak detection.
- Add low-end device budgets for draw calls, triangles, and client memory to `device-performance.md`.
- Note that texture GPU memory depends on pixel dimensions, and that deduplicated assets instance automatically.
- Require client-side tweening of part movement in `performance.md` and `review-checklist.md`.
- Add four performance test gates to `verification.md`.

## [1.17.2] - 2026-08-26

_A system health evaluation matrix, combat origin checks, and Parallel Luau patterns._

### Added
- Add `evaluation-matrix.md`, a 1 to 5 rubric across six dimensions.
- Add the Parallel Luau parallel-compute, serial-write pattern to `performance.md`.
- Validate shot origins against the attacker's server-side position in `cases/combat.md` and `security.md`.
- Add `--!optimize 2` guidance and optional dictionary typing to `luau-language.md`.

### Changed
- Separate staggered loops from Actor coordinators in the NPC recipe.
- Rename evaluation fixtures from `.lua` to `.luau`.

## [1.17.1] - 2026-08-26

_The 1.17.0 verification procedure read absence from a reference page as proof a member did not exist, and nine rows were wrong as a result._

### Added
- Add the `[Undocumented]` maturity tag for members in the API dump with no reference page.
- Add conditional styling with `StyleQuery` to `ui-crossplatform.md`.
- Add an "In the dump but not yours to call" section to `api-currency.md`.
- Add new engine rows and Luau 0.735.

### Changed
- Record in `api-currency.md` how the 1.17.0 error happened, and forbid demoting a row on documentation absence.
- Restructure the README and complete its reference map.
- Move the snapshot to Luau 0.735 and engine 735.

### Fixed
- Settle existence with the API dump or a probe, and semantics with the Engine API Reference.
- Stop flagging `GuiService:GetUIScaleMultiplier`, `UIShadow.Mode`, and `UIShadow.Inset` as unshipped. All three shipped.
- Promote five rows held at [Verify] that the dump already confirmed, and `StyleQuery` to [GA].
- Correct the `WorldRoot` collision-group method names and the `CollectionService` tag events.
- Replace `TeleportService:ReserveServer`, deprecated since engine 702, with `TeleportAsync` and `ShouldReserveServer`.
- Quote the `SKILL.md` description so the frontmatter parses as YAML.
- Fix two README links to files that did not exist.

## [1.17.0] - 2026-08-22

_Comments move out of function bodies, and every engine fact names its source._

### Added
- Add "How to verify (the toolbox)" to `api-currency.md`.
- Add a misremembered-API table to `style-rules.md`.
- Add severity calibration and cold-path carve-outs to `false-positives.md`.
- Add an invocation argument for the supervision level (`argument-hint: "[ask|bal|go]"`).
- Add `workflow.md` and `runtime-rules.md`, which hold session setup and the runtime rules in full.

### Changed
- **Breaking:** Ban in-body comments in code the skill writes. Existing comments stay, and their removal is only proposed.
- Cap Documentation Comment descriptions at 3 lines as well as 250 characters.
- Require every engine fact to name its basis, or be labelled unverified.
- Document the Studio CLI flags, and match `studio-mcp.md` to the shipped tool set.
- Record that Knit is archived, BridgeNet unmaintained, and Roact superseded by React-lua.
- Bring `SKILL.md` from about 7,170 to about 4,984 tokens without dropping a rule.

### Fixed
- Correct ten claims stated as fact in 1.16.1, including the `math` constants, the `vector` library members, require-by-string, and the Input Action System status. Three of these corrections were themselves reversed in 1.17.1.
- Move the snapshot to engine release notes 735.

## [1.16.1] - 2026-08-18

_Dates live in one file, enforced by the validator._

### Added
- Add a validator check that fails on any four-digit year outside `api-currency.md`.

### Changed
- Remove 16 dates from eight files and replace each with a maturity tag linked to its evidence.

## [1.16.0] - 2026-08-18

_One session-setup procedure, and two bundled references split by domain._

### Added
- Add grep hints for the table-style references.
- Add validator checks for table-of-contents accuracy and frontmatter limits.
- Add a version marker to `SKILL.md`.

### Changed
- Merge the supervision and mode sections into one Session Setup table.
- Split `ui-ux-testing.md` into `ui-crossplatform.md` and `verification.md`.
- Split `security-monetization.md` into `security.md` and `monetization-policy.md`.
- Add an anti-trigger clause to the description.

### Fixed
- Keep the function-ordering rule only in `section-layout.md`.

## [1.15.0] - 2026-08-18

_Restructured to match Anthropic's Agent Skills authoring guidance._

### Added
- Add `evaluations/` with five scenarios and their fixtures.
- Add `scripts/validate-skill.py`.
- Split the pattern set into `patterns/data.md`, `network.md`, `lifecycle.md`, and `world.md`.
- Add `section-layout.md`, `style-rules.md`, and `review-checklist.md`.
- Add tables of contents to every reference over 100 lines.

### Changed
- Cut `SKILL.md` from about 12,300 to about 7,100 tokens by moving detail into references.

### Fixed
- Remove a duplicated confidence gate from `false-positives.md`, and correct link labels in 18 files.

## [1.14.0] - 2026-08-18

_Object reuse, navigable performance guidance, and three design rules the recipes assumed._

### Added
- Add pool ceilings, a full reset table, and pooled-object edge cases.
- Add a symptom-to-cause triage table, physics query guidance, relative costs, and a measurement discipline to `performance.md`.
- Add One Owner Per Fact, Failure Policy, and Serialized Operations to the patterns, with matching false-positive carve-outs.
- Add five review checklist items.

### Changed
- Ask who owns each fact in System Design Preflight step 3.

### Fixed
- State that Parallel Luau needs the script to be a descendant of an `Actor`.
- Bound attributes to public state; per-player private state uses a targeted remote.

## [1.13.1] - 2026-08-18

_API baseline refreshed to Luau 0.734 and engine 734._

### Added
- Add `pcall` and `xpcall` inside user-defined type functions, and eight engine rows at [Verify].
- Add the distributed counter for cross-server totals, and frustum streaming.

### Deprecated
- Record `AdGui.OnAdEvent` as deprecated.

## [1.13.0] - 2026-08-11

_Documentation Comments use official terminology and Moonwave tags, and adapt to the project again._

### Changed
- Rename "UDD" to Luau Comments and Documentation Comments.
- Let comment style follow the project's own.
- Adopt Moonwave tag syntax: `@param <name> <type> -- <description>` and `@return <type> -- <description>`.
- Accept `--[=[ ]=]` and `---` blocks where they are the project's style.
- Raise the description limit from 100 to 250 characters.

### Removed
- Remove the in-body comment prohibition and the two-permitted-outcomes rule from 1.12.2.

## [1.12.2] - 2026-07-29

_Writing less code without delivering less, fitting a frame budget, and walking edge cases before calling a function done._

### Added
- Add `minimal-code.md` with a reuse ladder, a catalogue of commonly hand-rolled helpers, and three precedence rules that brevity never breaks.
- Document Ponytail as an optional agent-side overlay.
- Add `device-performance.md`: frame budgets, time-slicing, device tiers, a degradation ladder, and per-player bandwidth.
- Add `edge-cases.md` with a six-question finishing pass.

### Changed
- **Breaking:** Make Documentation Comment rules mandatory, with no project adaptation.
- Cap descriptions at one sentence and 100 characters.
- Broaden System Design Preflight step 4 to "Does this already exist?".

### Removed
- Remove in-body comments except for constraints the code cannot show.

### Fixed
- Resolve four contradictions between `SKILL.md`, `adaptive-mode.md`, and `cases/combat.md`.
- Correct the character-lifetime entry: body parts exist at `CharacterAdded`, appearance does not.
- Verify frame, draw-call, and triangle figures against Roblox's own documentation.

## [1.10.6] - 2026-07-29

_Rules that survive a summarised session, and the late-July Luau refresh._

### Added
- Add the Session Invariants card to `SKILL.md`.
- Add `const` bindings, `export` value semantics, read-only table members, yielding iterators, `declare extern type`, and the `@native` and `@deprecated` attributes.
- Add an upstream-versus-Studio state model to `api-currency.md`.

### Changed
- Restructure description rules into implementation-agnostic and no-volatile-content tests.
- Cap in-body comments at 75 characters and 25 words.
- Move the snapshot to 29 July 2026.

### Fixed
- Record engine release notes 731 as current.
- Fix doc comments in the skill's own examples that broke its rules.
- Record 64-bit integers, `math` constants, and `class` syntax as RFC only.

## [1.9.9] - 2026-07-25

_A 2026 engine refresh, implementation blueprints, and Studio MCP safety._

### Added
- Add 22 system blueprints in `references/cases/`.
- Add `server-authority.md`, `studio-mcp.md`, and `limits-budgets.md`.
- Add a Server Authority confirmation gate and the System Design Preflight.
- Add maturity tags ([GA], [Beta], [Verify], [UNVERIFIED]).

### Changed
- Regroup reference routing, and expand project environments to Studio-native, Rojo, and Script Sync.
- Rewrite `api-currency.md` to a July 2026 baseline.

### Fixed
- Allow Instance references in attributes through `InstanceHandle` [Beta].
- Make `BindToSimulation` guidance conditional on Server Authority.
- Update DataStore limits for the unified request budget.

## [1.7.7] - 2026-07-22

_False-positive hardening, an API baseline, and installer hardening._

### Added
- Add `false-positives.md` with the Blocker, Correctness, and Advisory severities and a four-step confidence gate.
- Add `api-currency.md`, a dated baseline of confirmed engine and Luau APIs.
- Add streaming and DataStore version history to `patterns.md`, Server Authority to `security-monetization.md`, and Parallel Luau to `performance.md`.
- Add `bin/agents.txt` as the single agent list for all three installers.
- Limit the version menu to the bundled release and the five newest tags, with manual entry for older ones.

### Changed
- **Breaking:** Make type safety opt-in. `--!strict` is no longer added unasked.
- Read the bundled version from `package.json`, and clear the destination before each install.

### Deprecated
- Record `Player:GetRankInGroupAsync` and `GetRoleInGroupAsync` as deprecated in favour of `GroupService:GetRolesInGroupAsync`.

### Fixed
- Class `Instance.new(class, parent)` as discouraged (Advisory), not deprecated.
- Pass printf data as an argument in `install.sh`, not as the format string.

### Security
- Validate `--tag` and call git, curl, unzip, and PowerShell with argument arrays, so a crafted tag cannot run as a shell command.

## [1.5.1] - 2026-07-18

_Two new references and broader guidance._

### Added
- Add `luau-language.md`: typing, task scheduling, deferred events, error handling, time APIs, and native codegen.
- Add `verification.md`: proving a change works, and tracing before flagging in review.
- Add runtime rule 7: re-validate after every yield.
- Add Tower Defense and Battlegrounds to `genres.md`.
- Add serializable DataStore shapes, attribute limits, character lifecycle, and cross-server communication to `patterns.md`.
- Add memory attribution with `debug.setmemorycategory`, text filtering, and PolicyService.
- Detect agent folders in the home directory, and add Gemini CLI and Codex targets.

## [1.1.7] - 2026-07-09

_Rule scoping and an installer with version selection._

### Added
- Read toolchain files (`stylua.toml` and others) first in Adaptive mode.
- Add a version selection menu and `--tag` to the installer.

### Changed
- Scope runtime rules 3 and 4 to avoidable garbage and to polling state that has a signal.
- Rewrite the purchase rate limiter in the templates as a time window.

### Fixed
- Pass `--allow-git=all` to npx on npm 12 and later.

## [1.0.0] - 2026-07-09

_First release._

### Added
- Add the `roblox-best-practices` skill: the three-section script layout, naming and style rules, the runtime rules, supervision levels, Default and Adaptive modes, and a review checklist.
- Add references for templates, patterns, performance, security and monetisation, UI and testing, genres, adaptive mode, and community libraries.
- Add an npx installer (`bin/cli.js`) and PowerShell and shell installers, with an always-included Universal path and a searchable list of additional agents.

[Unreleased]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.19.2...v2.0.0
[1.19.2]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.19.1...v1.19.2
[1.19.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.19.0...v1.19.1
[1.19.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.18.2...v1.19.0
[1.18.2]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.18.1...v1.18.2
[1.18.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.17.2...v1.18.0
[1.17.2]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.17.1...v1.17.2
[1.17.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.17.0...v1.17.1
[1.17.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.16.1...v1.17.0
[1.16.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.15.0...v1.16.0
[1.15.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.13.1...v1.14.0
[1.13.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.13.0...v1.13.1
[1.13.0]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.12.2...v1.13.0
[1.12.2]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.10.6...v1.12.2
[1.10.6]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.9.9...v1.10.6
[1.9.9]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.7.7...v1.9.9
[1.7.7]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.5.1...v1.7.7
[1.5.1]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.1.7...v1.5.1
[1.1.7]: https://github.com/andrian-syh/roblox-best-practices-skill/compare/v1.0.0...v1.1.7
[1.0.0]: https://github.com/andrian-syh/roblox-best-practices-skill/releases/tag/v1.0.0
