# Server Authority — Engine-Level Authoritative Simulation

Server Authority moves physics simulation and movement validation onto the server, with client prediction and rollback for responsiveness. It reached **[GA] general release** ([api-currency.md](api-currency.md#engine)).

> **Never assume it is on.** Roblox does **not** enable Server Authority by default; a place has it only if someone explicitly set `Workspace.AuthorityMode = "Server"`. Most existing places are **not** server-authoritative. Confirm before writing or reviewing anything in the trigger list below — the confirmation gate is defined in [SKILL.md](../SKILL.md#session-setup-decide-once-then-cache).

## Contents

- [When this file matters (the SA-adjacent trigger list)](#when-this-file-matters-the-sa-adjacent-trigger-list)
- [What AuthorityMode = "Server" forces](#what-authoritymode--server-forces)
- [The mental model: predict, then reconcile](#the-mental-model-predict-then-reconcile)
- [Writing code: with SA vs without SA](#writing-code-with-sa-vs-without-sa)
- [Known limitations (as of GA)](#known-limitations-as-of-ga)
- [Deciding whether to adopt it](#deciding-whether-to-adopt-it)
- [Migration notes](#migration-notes)
- [Review discipline](#review-discipline)
- [Deciding whether a place is server-authoritative](#deciding-whether-a-place-is-server-authoritative)

## When this file matters (the SA-adjacent trigger list)

Character movement or physics · input handling · camera control · animation timing · `BindToSimulation` · network ownership · hit registration and lag compensation · movement anti-cheat.

Touching any of these means the answer differs depending on whether the place uses Server Authority. Resolve that first; then follow the matching column below.

## What `AuthorityMode = "Server"` forces

Enabling it automatically configures five settings, and each has downstream consequences:

| Setting forced | Consequence you must design for |
|---|---|
| `NextGenerationReplication` | Replication semantics differ from the legacy path |
| `PlayerScriptsUseInputActionSystem` | Input flows through the Input Action System, not raw input events |
| `SignalBehavior = Deferred` | Handlers run at the next invocation point, never synchronously at fire time ([luau-language.md](luau-language.md#deferred-engine-events)) |
| `StreamingEnabled` | Client code must tolerate missing workspace instances ([patterns/network.md](patterns/network.md#streaming-streamingenabled)) |
| `UseFixedSimulation` | Gameplay runs on a fixed simulation step, enabling `BindToSimulation` |

A project cannot adopt Server Authority and opt out of these; they arrive together.

## The mental model: predict, then reconcile

The client predicts its own inputs instantly so play feels responsive, the server simulates authoritatively, and the client **resimulates** when its prediction diverges from the server result. Two rules follow:

- **Prediction is cosmetic until the server confirms it.** Never let a predicted outcome grant currency, damage, or items on the client.
- **Mispredictions are normal, not errors.** Reconcile them quietly; do not surface them to players as glitches or rollback messages.
- **Debug the loop, don't guess at it.** `RunService.Misprediction` reports per-instance predicted-vs-authoritative values, `RunService.Rollback` lets non-replicated custom state rewind before resimulation, and `Instance.PredictionMode` controls per-instance participation ([api-currency.md](api-currency.md#engine)).

## Writing code: with SA vs without SA

| Concern | Under Server Authority | Without Server Authority (the default) |
|---|---|---|
| Input for core simulation | **Input Action System**, replayed during resimulation. Do not drive core simulation from `UserInputService.InputBegan` | `ContextActionService`, or the Input Action System where available; raw `UserInputService` is acceptable ([patterns/world.md](patterns/world.md#input-client)) |
| Custom gameplay logic step | **`BindToSimulation` is required** for logic that must participate in the fixed simulation and resimulation | **Do not use `BindToSimulation`** for general gameplay; accumulate `deltaTime` on `Heartbeat` ([performance.md](performance.md#cpu)) |
| Camera state across the boundary | **`Player:GetCameraState()`** (returns CFrame, FieldOfView, ViewportSize). Camera InputAction synchronization is discontinued and the InputContext/InputAction camera replication path is **deprecated** | Camera is client-owned; the server orchestrates *when*, never *how* ([genres.md](genres.md#horror--story--atmosphere)) |
| Movement anti-cheat | Largely handled by the engine; the server simulates movement | Manual plausibility checks: speed/teleport deltas on a slow loop, with tolerance ([security.md](security.md#movement--physics-sanity-checks)) |
| Attribute state sync | First **64** attributes, name ≤ 50 chars, string value ≤ 50 chars ([limits-budgets.md](limits-budgets.md#attributes)) | Attributes are more permissive; the 64/50/50 window does not apply |
| Animation layering | Maximum **8** concurrent tracks per `Animator` | No Server Authority track cap |

Everything else in this skill is unchanged by Server Authority. Remote validation, cleanup, data safety, and the section layout apply identically in both columns.

## Known limitations (as of GA)

Design around these rather than discovering them late:

- **8 animation tracks** maximum per `Animator`.
- **Tool welds can be deleted during a misprediction** — rebuild rather than assuming persistence.
- **Remote events are not synchronized with the shared simulation timeline** — do not use a remote's arrival to order simulation-relevant work.
- **Emote and strafing animation support is limited.**

## Deciding whether to adopt it

Server Authority is a **choice with a real cost**, not a universal upgrade. It raises server CPU utilization in proportion to existing load; Extended Services for Compute can raise the per-player CPU allowance [Verify] ([limits-budgets.md](limits-budgets.md#server-compute)).

| Favors adopting | Favors staying on the default |
|---|---|
| Competitive PvP, fighting, shooters where movement exploits decide outcomes | Obby, idle/simulator, social, story games where movement exploits cost little |
| Games already using StreamingEnabled and deferred signals | Projects that cannot absorb forced StreamingEnabled or the server CPU cost |
| Physics-heavy interactions needing consistent server truth | Heavy layered animation needs (the 8-track cap binds) |

Never migrate a project to Server Authority on this skill's initiative. Recommend, explain the cost, and let the user decide ([SKILL.md](../SKILL.md#user-authority)).

## Migration notes

- Simple character-driven games need minimal changes; complex custom gameplay needs scripts adapted to `BindToSimulation` and Input Actions.
- **Back up the place before converting** — the forced settings change replication, streaming, and signal behavior at once.
- Migration is a wide-impact change: confirm with the user before starting, regardless of supervision level.

## Review discipline

These are **not** findings ([false-positives.md](false-positives.md)):

- A project **not** using Server Authority. It is a design choice with a real CPU cost, never a defect.
- `BindToSimulation` in a confirmed Server Authority project. It is required there.
- `UserInputService` in a non-SA project. It is valid outside Server Authority.
- Manual movement plausibility checks in a non-SA project. They remain the correct baseline.

Before flagging anything from the trigger list, establish which mode the place is in. A finding that assumes the wrong mode is a false positive by construction.

## Deciding whether a place is server-authoritative

Engine-level **Server Authority** is [GA], but **Roblox does not enable it by default** — a place is server-authoritative only if someone set `Workspace.AuthorityMode = "Server"`. Most places are not. Assuming the wrong mode produces confidently wrong code and false review findings, because the correct answer for input, camera, simulation stepping, and movement anti-cheat *inverts* between the two modes.

**Trigger topics.** The first time a task touches any of these, resolve the mode before writing or flagging anything: character movement or physics · input handling · camera control · animation timing · `BindToSimulation` · network ownership · hit registration or lag compensation · movement anti-cheat.

**Procedure:**
1. **Detect first.** Read `Workspace.AuthorityMode` where the environment allows it, or scan the project for `AuthorityMode`, `BindToSimulation`, and Input Action usage.
2. **If undetermined, ask once:** *"Does this place have Server Authority enabled (`Workspace.AuthorityMode = "Server"`)? It changes how input, camera, and the gameplay loop must be written."*
3. **Cache the answer for the session**, exactly like the community-library check. Do not re-ask per file.
4. **Default assumption is OFF.** Never write Server Authority-only advice as if it were universal.

| Supervision level | Behavior |
|---|---|
| Supervised (`!ask`) | Always ask |
| Balanced (`!bal`) | Ask once, at the first SA-adjacent task |
| Autonomous (`!go`) | Detect; if inconclusive, assume **not** server-authoritative and record the assumption in the summary |

Both code paths, the forced settings, known limitations, and the adoption trade-off: the sections below. Never migrate a project to Server Authority on this skill's initiative — recommend, explain the cost, let the user decide.
