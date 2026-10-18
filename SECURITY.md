# Security policy

## Contents

- [Supported versions](#supported-versions)
- [Report a vulnerability](#report-a-vulnerability)
- [Scope](#scope)
- [What the skill contains](#what-the-skill-contains)
- [What the installer does](#what-the-installer-does)
- [Official sources](#official-sources)
- [Report impersonation or malicious copies](#report-impersonation-or-malicious-copies)

## Supported versions

Security fixes are released for the current minor version only.

| Version | Supported |
|---|---|
| `2.2.x` | Yes |
| `< 2.2.0` | No. Run the installer again to upgrade |

## Report a vulnerability

Do not open a public issue for a security vulnerability.

1. Open the repository's [Security tab](https://github.com/andrian-syh/roblox-best-practices-skill/security).
2. Select **Report a vulnerability** to open a private advisory.
3. Include the skill version, your agent and operating system, and the smallest steps that reproduce the issue.

What happens next:

- You receive an acknowledgment within 72 hours and a triage update within 7 days.
- The report stays private until a fix is released.
- The fix is announced in [CHANGELOG.md](CHANGELOG.md) and in a GitHub security advisory. You are credited in the advisory unless you ask not to be.

## Scope

In scope:

- The installers: `bin/cli.js`, `install.ps1`, and `install.sh`.
- The skill's text, where it could make an agent act against the user.

Out of scope:

- Guidance that is wrong or out of date. Report it as a normal [issue](https://github.com/andrian-syh/roblox-best-practices-skill/issues).
- Vulnerabilities in an agent host, Roblox Studio, Node.js, or the `prompts` package. Report them to their vendor.
- A copy of this skill that was not published from an [official source](#official-sources).

## What the skill contains

The installed folder, `roblox-best-practices/`, holds `SKILL.md` and Markdown files under `references/`. Nothing else is installed:

- No executables, binaries, archives, or scripts for the agent to run.
- No network calls, telemetry, or analytics.
- No instruction that asks the agent or the user to download or install another file, package, or extension.

A copy of the skill that contains any of these was changed by someone else. Do not use it.

## What the installer does

The installer (`bin/cli.js`, `install.ps1`, `install.sh`) copies the skill folder into skills directories, and does nothing else:

- **Writes:** only `./.agents/skills/roblox-best-practices/` and the `roblox-best-practices/` folder inside each agent skills directory you select. The list of directories is [`bin/agents.txt`](bin/agents.txt). Each install replaces only that folder.
- **Network:** read-only HTTPS requests to `api.github.com` (to list release tags), and a `git clone` or archive download from `github.com/andrian-syh/roblox-best-practices-skill`. When Node.js is present, `npx` also fetches the installer's dependencies from the npm registry. No other host is contacted.
- **Dependencies:** the Node installer uses one npm package, [`prompts`](https://www.npmjs.com/package/prompts), for its menus. `package-lock.json` pins it and its two dependencies, `kleur` and `sisteransi`. None of the three has an install script.
- **Input handling:** a `--tag` value must match `vX.Y.Z` before it reaches any command, and commands are run with argument lists, not a shell string.
- **Privileges:** the installer needs no administrator or root rights. Run it as your normal user.

To install without running any script, copy the `roblox-best-practices/` folder from a release into your agent's skills directory yourself.

## Official sources

The skill is published only from these places:

- GitHub: [`github.com/andrian-syh/roblox-best-practices-skill`](https://github.com/andrian-syh/roblox-best-practices-skill), including its release tags.
- The skills.sh listing for that repository: [`skills.sh/andrian-syh/roblox-best-practices-skill`](https://skills.sh/andrian-syh/roblox-best-practices-skill/roblox-best-practices).

The companion plugin, [roblox-optimum](https://github.com/andrian-syh/roblox-optimum), has its own security policy.

## Report impersonation or malicious copies

The MIT License allows forks and redistribution. It does not allow anyone to use this project's name to deliver malware. Known lures copy this README and replace the install steps with a link to an `.exe` or to a "releases" website.

If you find such a copy:

1. Do not download or run anything from it.
2. Report the repository to GitHub with **Report repository**, or at [support.github.com/contact/report-abuse](https://support.github.com/contact/report-abuse).
3. Tell the maintainer through the private [vulnerability report](#report-a-vulnerability) link, with the copy's URL.
