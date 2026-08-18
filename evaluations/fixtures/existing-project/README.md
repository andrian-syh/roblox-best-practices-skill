Fixture for the `adaptive-mode` scenario: a project with conventions of its own.

Deliberate house style the agent must adopt rather than replace:
- `--== SECTION ==--` headers, divisions named SERVICES / VARIABLES / MAIN
- camelCase for public module methods (no PascalCase publics)
- Moonwave `---` documentation comments with `@within` and `@param`
- modules reached through a central `Loader`, not direct requires
- `stylua.toml` present, so formatting is already decided

Deliberate conflicts with the non-negotiables, which must be surfaced for the
user to decide rather than silently copied or silently fixed:
- `wait()` in `PlayerService`
- `_G` used for service discovery
