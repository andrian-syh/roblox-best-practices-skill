# Maintaining

How content moves into this repository and how a release is cut. For contributors, see [Contributing](README.md#contributing).

## Source of the content

Guidance is written in [roblox-optimum](https://github.com/andrian-syh/roblox-optimum) first, in its `best-practices` skill. This repository receives it in batches, every few roblox-optimum releases. The two repositories share no code and no runtime dependency: a port is a one-way copy, and nothing here reads roblox-optimum at install or run time.

## Port from roblox-optimum

1. Check out roblox-optimum at the release tag you are porting, next to this repository.
2. Create a branch here, for example `port/optimum-1.11.5`.
3. Copy the references:

   ```bash
   node scripts/port-from-optimum.mjs ../roblox-optimum
   ```

   The script reads roblox-optimum and never writes to it. It replaces `roblox-best-practices/references/`, then lists every line that names a part only roblox-optimum has, and prints a summary of how the two `SKILL.md` files differ.
4. Rewrite each listed line so it works standalone:
   - A sibling skill (`code-review`, `diagnose`, `studio-ops`, `roblox-auditor`) becomes the local reference that holds the same guidance: `review-checklist.md`, `diagnosis.md`, `verification.md` or `studio-mcp.md`, `evaluation-matrix.md`.
   - `roblox-optimum`'s checker or MCP tools are replaced with selene and StyLua, or mentioned once as an optional add-on.
   - Plugin-only settings such as `${user_config.supervision}` are removed.
   - `/roblox-optimum:best-practices` becomes `/roblox-best-practices`.
5. Merge `SKILL.md` by hand. Keep `name: roblox-best-practices`, keep the review, Studio MCP, and external-editor routing that roblox-optimum moves to sibling skills, and take every other change.
6. Run `python scripts/validate-skill.py` until it passes.
7. Run the [evaluations](evaluations/README.md) and update any scenario whose expected behaviour the port changed.

## Refresh the engine baseline

`roblox-best-practices/references/api-currency.md` holds the only dated facts in the skill. Refresh it as part of a port, not independently, so the two repositories do not drift. The validator rejects a year in any other file.

## Release

1. Choose the version under [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A change to the invariant card or to required behaviour is major; new guidance is minor; corrections are patch.
2. Set it in `package.json` (`npm version X.Y.Z --no-git-tag-version`), in the `*Skill version*` line of `SKILL.md`, and in `metadata.version`. The validator fails if they differ.
3. Move `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) into a dated version section, name the roblox-optimum version it was ported from, and add the compare link at the bottom.
4. Merge to `main`, tag `vX.Y.Z`, and push the tag. The fallback installers download the newest tag, so a tag is what users receive.
