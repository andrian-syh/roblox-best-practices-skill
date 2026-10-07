# Install

How to install the roblox-best-practices skill, where it is installed, and how to remove it. For what the skill does, see the [README](README.md).

## Contents

- [Requirements](#requirements)
- [Run the installer](#run-the-installer)
- [Installer options](#installer-options)
- [Where the skill lands](#where-the-skill-lands)
- [Agent-specific notes](#agent-specific-notes)
- [Update](#update)
- [Uninstall](#uninstall)

## Requirements

A current Node.js LTS release for the interactive installer. Without Node, the scripts below fall back to a native shell menu that needs `git`, or `curl` plus `unzip` (PowerShell needs nothing extra).

## Run the installer

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.ps1 | iex
```

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.sh | bash
```

Or call the installer directly with npx:

```bash
npx --allow-git=all github:andrian-syh/roblox-best-practices-skill
```

`--allow-git=all` is needed on npm 12 and later, which block Git sources by default. The one-line scripts add it for you.

## Installer options

| Option | Effect |
|---|---|
| `--all`, `-a` | No prompts. Installs to the workspace path and to every agent detected in your home directory |
| `--tag <tag>`, `-t <tag>` | Installs a specific release, for example `v1.19.2`. Works with or without `--all` |
| `--help`, `-h` | Shows help |

## Where the skill lands

- **Always:** `./.agents/skills/roblox-best-practices/` in the current directory. Codex, Cursor, Antigravity, GitHub Copilot, OpenCode, Gemini CLI, Cline, and Zed read this path at project scope.
- **Optionally:** each agent's own global skills directory, for example `~/.claude/skills/`, `~/.cursor/skills/`, `~/.copilot/skills/`, or `~/.agents/skills/`. The installer checks your home directory, pre-selects the agents it finds, and lets you add others. The full list of 64 locations is in [`bin/agents.txt`](bin/agents.txt).

Each install replaces the destination folder, so files removed in a newer release do not linger. When two targets resolve to the same folder (for example when you run the installer from your home directory), the folder is written once.

The installer exits with a non-zero code and prints `[FAILED]` if any file could not be copied.

The fallback shell installers download the newest release tag, not the `main` branch.

## Agent-specific notes

### OpenCode

OpenCode requires skill names to be unique across its `.opencode`, `.claude`, and `.agents` locations. If you install to both `~/.claude/skills/` and an `.agents/skills/` path, OpenCode sees two copies. Pick one of them on any machine where you use OpenCode.

## Update

Run the installer again. It replaces each destination folder.

## Uninstall

Delete the `roblox-best-practices` folder from each skills directory it was installed into.
