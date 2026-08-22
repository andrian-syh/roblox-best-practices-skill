# Session Workflow

How a session is set up and how a task is opened. SKILL.md carries the decisions and their safe defaults; this file carries how to resolve each one, how the supervision level modifies it, and the preflight run before a non-trivial system is built.

Nothing here is a code rule. The Non-Negotiable Runtime Rules and the safety items in SKILL.md hold in full through every setting on this page.

## Contents

- [Session setup: resolving the five decisions](#session-setup-resolving-the-five-decisions)
- [The two modes](#the-two-modes)
- [Supervision levels](#supervision-levels)
- [Advisory invocation (no specific task)](#advisory-invocation-no-specific-task)
- [Review/refactor mode](#reviewrefactor-mode)
- [System Design Preflight](#system-design-preflight)

## Session setup: resolving the five decisions

Five decisions govern every later task. Resolve each **once**, cache the answer for the session, and never re-ask per file. Resolve them **lazily** — at the first task that actually depends on one, not upfront. SKILL.md holds the same five rows with their defaults; this table holds how to get an answer.

| Decision | How to resolve | Default when unresolved | Detail |
|---|---|---|---|
| **Supervision level** | Invocation argument (`/roblox-best-practices ask`) > inline token (`!ask`/`!bal`/`!go`) > session declaration in any words ("awasi penuh", "jangan banyak tanya") > default | **Balanced** — never ask which level the user wants; absence *is* the answer | [below](#supervision-levels) |
| **Default vs Adaptive mode** | Obey an explicit statement; otherwise ask once if an existing codebase has visible conventions | **Default** for new files; for edits, match the file being edited and note the assumption | [adaptive-mode.md](adaptive-mode.md) |
| **Community libraries** | Ask once, or detect from `require()`s and `wally.toml` | **None** — use the built-in patterns | [community-libraries.md](community-libraries.md) |
| **Server Authority** | Read `Workspace.AuthorityMode`, or scan for `AuthorityMode`/`BindToSimulation`; ask once at the first task touching movement, physics, input, camera, animation timing, network ownership, or hit registration | **OFF** — most places are not server-authoritative, and assuming otherwise produces confidently wrong code | [server-authority.md](server-authority.md) |
| **Environment facts** | On the first task touching signals, streaming, rigs, or typing: read `Workspace.SignalBehavior`, `StreamingEnabled`, the rig type, and the file's strictness header once; cache for the session like everything else here | Do not assume any of them — each inverts correct guidance between values | [luau-language.md](luau-language.md#deferred-engine-events) · [patterns/network.md](patterns/network.md#streaming-streamingenabled) |

**Never migrate a project to Server Authority on this skill's initiative** — recommend, explain the cost, let the user decide.

**Community libraries win for the concern they own.** Where one is in use, its idioms replace the overlapping built-in pattern; the non-negotiables still hold through them.

## The two modes

*Default* applies this skill's conventions as written. *Adaptive* studies the project's existing structure, proposes an adapted convention, and waits for confirmation before writing.

Only stylistic and structural conventions adapt. The Non-Negotiable Runtime Rules and the safety items hold in full through either mode. The full adaptation procedure, including what may never be adapted away: [adaptive-mode.md](adaptive-mode.md).

## Supervision levels

Set the level at invocation — `/roblox-best-practices bal` — or with an inline token anywhere in a message. The argument accepts the bare word or the token form (`ask` and `!ask` are the same thing), is case-insensitive, and the long names `supervised`/`balanced`/`autonomous` work too. **An empty or unrecognized argument is Balanced**; never ask the user to pick one, and never treat an unrecognized argument as an error — take the default and carry on.

Invoking with no argument at all is [advisory invocation](#advisory-invocation-no-specific-task): acknowledge that the standards are active, at Balanced, and stop.

| Level | Token | Behavior |
|---|---|---|
| **Supervised** | `!ask` | Confirm before every meaningful decision: convention choices, the file list, any deviation from this skill, and before writing code. |
| **Balanced** (default) | `!bal` | Ask only on real ambiguity, a conflict with a Non-Negotiable Runtime Rule, or a wide-impact/destructive change. Otherwise proceed. |
| **Autonomous** | `!go` | Don't ask; make sensible best-practice decisions and record every assumption in the final summary. Stop only for destructive or irreversible actions. |

The level modifies each setup decision, and User Authority outranks the level itself:

| Confirmation point | Supervised | Balanced | Autonomous |
|---|---|---|---|
| Mode question | Always ask | Ask once if a codebase exists | Infer; report the assumption |
| Adaptive convention (Step 2) | Wait for approval | Wait for approval | Present as a report; proceed |
| Community-library check | Ask | Ask once / detect | Detect via `require()`s |
| Server Authority check | Always ask | Ask once, at the first SA-adjacent task | Detect; assume OFF if inconclusive and record it |
| Conflict with a non-negotiable | Ask | Ask | Warn in summary; choose the safe option |
| Review mode: stylistic restructuring | Propose, wait | Propose, wait | Still propose only (User Authority — unchanged) |

No level authorizes an unrequested refactor. `!go` removes questions, never the boundary in [SKILL.md](../SKILL.md#user-authority).

## Advisory invocation (no specific task)

Users may invoke this skill purely as a standing reminder — "use best practices", "ikuti skill ini mulai sekarang" — without a concrete coding task. In that case:

- **Do not** start codebase analysis or ask the mode/library setup questions yet. Briefly acknowledge that the standards are now active, and stop.
- Hold these rules as active guidance for all subsequent Luau work in the session.
- Resolve the setup decisions **lazily** — at the first actual coding/review task, and only the parts that task needs.

## Review/refactor mode

Every finding gets exactly one severity, after passing the confidence gate:

- **Blocker** — security, data loss, a guaranteed leak.
- **Correctness** — a real bug with a concrete failure scenario.
- **Advisory** — style, layout, micro-optimization.

The confidence gate before reporting anything: trace both sides of paired logic, assume the odd shape may be intentional, demand a concrete failure scenario, verify the API against the target environment. Advisory items are **proposed, never forced**, and unrelated code is never reformatted.

Severity calibration for the near-miss pairs, and the full catalog of what NOT to flag: [false-positives.md](false-positives.md).

## System Design Preflight

Before implementing any non-trivial system — not needed for a one-off script or a small edit — settle these five in order. Each has a home; none requires guesswork.

1. **Which case is this?** Match it to a recipe in SKILL.md's Implementing-a-known-system routing block and read that one file. If nothing matches, proceed with the general rules.
2. **What are the ceilings?** Check [limits-budgets.md](limits-budgets.md) for the limits this design will approach (payload size, request budget, attribute window, entity counts). Designing into a ceiling is far cheaper than discovering it in production.
3. **What is the server/client split, and who owns each fact?** Name what the server owns authoritatively and what the client merely renders or requests, before writing either side. Every piece of state gets exactly one writing owner; all other copies are views updated after the fact ([patterns/data.md](patterns/data.md#one-owner-per-fact)).
4. **Does this already exist?** Check in order: the project's own modules, the Luau standard library, the engine API, then an installed library — whose idioms replace the built-in pattern if the project uses ProfileStore, Packet, Trove, Knit, Fusion, or similar ([minimal-code.md](minimal-code.md), [community-libraries.md](community-libraries.md)).
5. **How will this be proven to work?** Pick the observable outcome and the session type (multi-client for anything touching replication) up front ([verification.md](verification.md)).

If the system touches movement, input, camera, animation timing, or simulation stepping, resolve the Server Authority decision first — it changes the answers to steps 3 and 5.
