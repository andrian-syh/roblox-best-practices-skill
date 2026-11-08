# Server Authority: Engine-Level Authoritative Simulation

Server Authority moves physics simulation and movement validation onto the server, with client prediction and rollback for responsiveness. It reached **[GA] general release** ([api-currency.md](api-currency.md#engine)).

> **Never assume it is on.** Roblox does **not** enable Server Authority by default; a place has it only if someone set `Workspace.AuthorityMode = "Server"`. Most existing places are **not** server-authoritative. The correct answer for input, camera, simulation stepping, and movement anti-cheat *inverts* between the two modes, so resolve the mode first.

## Contents

- [Deciding whether a place is server-authoritative](#deciding-whether-a-place-is-server-authoritative)
- [What AuthorityMode = "Server" forces](#what-authoritymode--server-forces)
- [The mental model: predict, then reconcile](#the-mental-model-predict-then-reconcile)
- [Writing code: with SA vs without SA](#writing-code-with-sa-vs-without-sa)
- [Known limitations](#known-limitations)
- [Deciding whether to adopt it](#deciding-whether-to-adopt-it)
- [Review discipline](#review-discipline)

## Deciding whether a place is server-authoritative

**Trigger topics.** The first time a task touches any of these, resolve the mode before writing or flagging anything: character movement or physics, input handling, camera control, animation timing, `BindToSimulation`, network ownership, hit registration or lag compensation, movement anti-cheat.

1. **Detect first.** Read `Workspace.AuthorityMode`, or scan the project for `AuthorityMode`, `BindToSimulation`, and Input Action usage. Scripts, plugins, and MCP `execute_luau` can read the property from engine 746; scripts cannot set it. On an older Studio the read throws `lacking capability RobloxScript`, which says **nothing** about the mode, so a failed read sends you to step 2, never to a default.
2. **If undetermined, ask once:** *"Does this place have Server Authority enabled (`Workspace.AuthorityMode = "Server"`)? It changes how input, camera, and the gameplay loop must be written."*
3. **Cache the answer for the session**, like the community-library check. Do not re-ask per file.
4. **Default assumption is OFF.** Never write Server Authority-only advice as if it were universal.

| Supervision level | Behavior |
|---|---|
| Supervised (`!ask`) | Always ask |
| Balanced (`!bal`) | Ask once, at the first SA-adjacent task |
| Autonomous (`!go`) | Detect; if inconclusive, assume **not** server-authoritative and record the assumption in the summary |

## What `AuthorityMode = "Server"` forces

Enabling it configures five settings, and each has downstream consequences:

| Setting forced | Consequence you must design for |
|---|---|
| `NextGenerationReplication` | Replication semantics differ from the legacy path |
| `PlayerScriptsUseInputActionSystem` | Input flows through the Input Action System, not raw input events |
| `SignalBehavior = Deferred` | Handlers run at the next resumption point, never synchronously at fire time ([luau-language.md](luau-language.md#deferred-engine-events)) |
| `StreamingEnabled` | Client code must tolerate missing workspace instances ([patterns/network.md](patterns/network.md#streaming-streamingenabled)) |
| `UseFixedSimulation` | Gameplay runs on a fixed simulation step, enabling `BindToSimulation` |

A project cannot adopt Server Authority and opt out of these; they arrive together.

## The mental model: predict, then reconcile

The client predicts its own inputs instantly so play feels responsive, the server simulates authoritatively, and the client **resimulates** when its prediction diverges from the server result.

- **Prediction is cosmetic until the server confirms it.** Never let a predicted outcome grant currency, damage, or items on the client.
- **Mispredictions are normal, not errors.** Reconcile them quietly; do not surface them to players as glitches.
- **Debug the loop, don't guess at it.** `RunService.Misprediction` reports per-instance predicted and authoritative values, `RunService.Rollback` lets non-replicated custom state rewind before resimulation, and `Instance.PredictionMode` controls per-instance participation ([api-currency.md](api-currency.md#engine)).
- **`RunService:SetPredictionMode()` needs no `IsClient()` guard.** On the server the call is a no-op, and the warning it once logged from shared code is gone. **Do not add the guard, and do not flag shared code for lacking it.**
- **`PredictionMode = Off` means off.** Older clients still simulated an `Off` part inside the local simulation region, so it drifted from the server position (a character dropping to the ground). Contact simulation is unchanged: an `Off` object that touches a locally simulated one still interacts. If a report describes this drift, establish the client's engine version before treating it as a code bug.
- **Destroying or reparenting an `InputContext` is safe.** On older clients it could stop input reaching the server for the rest of the session. A "my input died mid-session" report against an older client is this, not a lifecycle mistake.

## Writing code: with SA vs without SA

| Concern | Under Server Authority | Without Server Authority (the default) |
|---|---|---|
| Input for core simulation | **Input Action System**, replayed during resimulation. Do not drive core simulation from `UserInputService.InputBegan` | `ContextActionService`, or the Input Action System where available; raw `UserInputService` is acceptable ([patterns/world.md](patterns/world.md#input-client)) |
| Custom gameplay logic step | **`BindToSimulation` is required** for logic that must take part in the fixed simulation and resimulation | **Do not use `BindToSimulation`** for general gameplay; accumulate `deltaTime` on `Heartbeat` ([performance.md](performance.md#cpu)) |
| Camera state across the boundary | **`Player:GetCameraState()`** (CFrame, FieldOfView, ViewportSize). The InputContext/InputAction camera replication path is **deprecated** | Camera is client-owned; the server orchestrates *when*, never *how* ([genres.md](genres.md#horror--story--atmosphere)) |
| Movement anti-cheat | Largely handled by the engine; the server simulates movement | Manual plausibility checks: speed and teleport deltas on a slow loop, with tolerance ([security.md](security.md#movement--physics-sanity-checks)) |
| Attribute state sync | First **64** attributes, name ≤ 50 chars, string value ≤ 50 chars ([limits-budgets.md](limits-budgets.md#attributes)) | The 64/50/50 window does not apply |
| Animation layering | At most **8** concurrent tracks per `Animator` | No Server Authority track cap |

Everything else in this skill is unchanged by Server Authority. Remote validation, cleanup, data safety, and the section layout apply identically in both columns.

## Known limitations

Design around these rather than discovering them late:

- **8 animation tracks** at most per `Animator`.
- **Tool welds can be deleted during a misprediction**: rebuild rather than assuming persistence.
- **Remote events are not synchronized with the shared simulation timeline**: do not use a remote's arrival to order simulation-relevant work.
- **Emote and strafing animation support is limited.**

## Deciding whether to adopt it

Server Authority is a **choice with a real cost**, not a universal upgrade. It raises server CPU use in proportion to existing load; Extended Services for Compute more than doubles the per-player CPU a server gets ([limits-budgets.md](limits-budgets.md#server-compute)).

| Favors adopting | Favors staying on the default |
|---|---|
| Competitive PvP, fighting, shooters where movement exploits decide outcomes | Obby, idle, simulator, social, and story games where movement exploits cost little |
| Games already using StreamingEnabled and deferred signals | Projects that cannot absorb forced StreamingEnabled or the server CPU cost |
| Physics-heavy interactions needing consistent server truth | Heavy layered animation (the 8-track cap binds) |

**Never migrate a project to Server Authority on this skill's initiative.** Recommend, explain the cost, and let the user decide ([SKILL.md](../SKILL.md#user-authority)). When the user does choose it: simple character-driven games need few changes, complex custom gameplay needs scripts adapted to `BindToSimulation` and Input Actions, and the place is backed up first, because replication, streaming, and signal behavior all change at once.

## Review discipline

These are **not** findings ([false-positives.md](false-positives.md)):

- A project **not** using Server Authority. It is a design choice with a real CPU cost.
- `BindToSimulation` in a confirmed Server Authority project. It is required there.
- `UserInputService` in a non-SA project. It is valid outside Server Authority.
- Manual movement plausibility checks in a non-SA project. They remain the correct baseline.

Before flagging anything from the trigger list, establish which mode the place is in. A finding that assumes the wrong mode is a false positive by construction.
