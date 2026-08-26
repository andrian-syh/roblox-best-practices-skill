# System Health & Architecture Evaluation Matrix

An objective 1–5 scoring rubric for developers, tech leads, and AI to audit game systems and evaluate architectural maturity in an active Roblox Studio project.

## Contents

- [How to use this matrix](#how-to-use-this-matrix)
- [Scoping the audit](#scoping-the-audit)
- [Gathering evidence](#gathering-evidence)
- [Scorecard dimensions](#scorecard-dimensions)
  - [1. Security & Server Authority](#1-security--server-authority)
  - [2. Memory & Lifecycle Management](#2-memory--lifecycle-management)
  - [3. CPU & Performance Budget](#3-cpu--performance-budget)
  - [4. Network & Replication Efficiency](#4-network--replication-efficiency)
  - [5. Data Safety & Persistence](#5-data-safety--persistence)
  - [6. Code Structure & Maintainability](#6-code-structure--maintainability)
- [Turning scores into a verdict](#turning-scores-into-a-verdict)
- [Audit report template](#audit-report-template)

## How to use this matrix

**Scope: run this only when the user asks for an audit.** It is a maturity rubric, not a review rubric, and the two grade differently. A finding in review has to clear the confidence gate and carry a concrete failure scenario; a score here is a comparison against a ceiling most shipped experiences never reach. Scoring 3 is a **pass** — the invariants hold. A 3 is not a defect list, and the gap between 3 and 5 is never reported as findings: demanding Parallel Luau, adaptive quality, or zero-allocation hot loops from a small finished project is exactly the enterprise ceremony [false-positives.md](false-positives.md#code-economy-and-device-scalability--authoring-goals-not-review-standards) forbids. Anything you would report as Blocker or Correctness stands on its own evidence, not on a low score.

Evaluate systems against concrete, falsifiable technical indicators rather than subjective aesthetics. Each dimension is scored from 1 (Critical Hazard) to 5 (Studio Elite).

- **1 — Critical Hazard (Blocker):** Active exploit vulnerability, catastrophic data loss risk, or unbounded memory leak.
- **2 — Fragile (High Risk):** Missing recovery paths, heavy polling, deprecated core APIs, or noticeable frame spikes under load.
- **3 — Functional Baseline (Passing):** Core invariants met; safe against honest players, event-driven cleanup, runs without runtime errors.
- **4 — Production Ready (Robust):** Structured state machines, bounded exponential backoffs, tight payload budgets, and clean module contracts.
- **5 — Studio Elite (Highly Optimized):** Full server-authoritative state reconciliation, parallel computation where beneficial, zero per-frame allocations, and multi-device scaling.

## Scoping the audit

**Score a system, not a place.** "This game is a 3" is not actionable and is usually wrong in both directions at once: the combat code can be exploitable while the data layer is excellent. One scorecard covers one system with one owner — the data layer, the combat loop, the shop, the round lifecycle.

- **Ask what to audit, or state what you chose.** If the user named a system, score that. If they asked for "the project", pick the systems that carry the risk (anything touching money, saved data, or remotes first) and say which ones you covered and which you did not.
- **Bound it before starting.** A place with two hundred scripts is not one audit. Three systems audited with evidence beat ten scored by impression.
- **Audit what runs, not what is left over.** Disabled scripts, unused modules, and abandoned prototypes are noted in passing, never scored as if they were live.

## Gathering evidence

**Every score names the check behind it.** A rubric read against a hunch produces a number with the authority of a measurement and the accuracy of a guess, which is worse than no audit. Work cheapest-first: static reads answer four of the six dimensions, and only two genuinely need a session.

**Static pass (no playtest needed).** In a Studio-native or MCP setup use script search and grep rather than reading whole files ([studio-mcp.md](studio-mcp.md#token-discipline)); on a filesystem project, grep the tree.

| Dimension | What to look for | Where |
|---|---|---|
| **1. Security** | `OnServerEvent`/`OnServerInvoke` handlers and what each does before acting; `typeof` checks; a shared rate limiter or none; whether damage, currency, and cooldowns are computed server-side; secrets or loot tables in `ReplicatedStorage` | Remote handler call sites, `ServerScriptService`, `ReplicatedStorage` |
| **2. Lifecycle** | `:Connect(` counts against teardown paths; `PlayerRemoving`/`CharacterRemoving`/`Destroying` handlers; per-player tables and whether each has a clear; a trove/maid or a bare bag | Every script that connects anything |
| **5. Data safety** | `SetAsync` versus `UpdateAsync`; `pcall` and backoff around every store call; `BindToClose`; what happens when a load fails after its retries | The data module and every store call site |
| **6. Structure** | Section layout; deprecated APIs (`wait`, `spawn`, `tick`, Body movers); one writer per piece of state; magic numbers; module contracts | Sampled representative scripts, not all of them |

**Session pass (dimensions 3 and 4 need a running place).** These cannot be read off source, and guessing them is how an audit loses credibility. The full tooling is in [performance.md](performance.md#measurement-never-optimize-blind); the minimum that supports a score:

- **A playtest at realistic load**, not an empty place with one tester. Entity counts and player counts are what make the difference visible.
- **Frame time against 16.67 ms**, from the MicroProfiler (`Ctrl+F6` in Studio), plus which tags dominate the frames that miss.
- **Script Profiler for 10 seconds under load**, read from the top of the Self Time list.
- **Scene Analysis** for Unparented Instances, Script Memory, and Animation Memory — the leak evidence dimension 2 needs when the static pass looks clean but memory climbs.
- **The 20x respawn audit** ([verification.md](verification.md#performance--memory-verification-proof-of-performance)) when lifecycle is the concern.
- **Data Ping against Network Ping** and the MicroProfiler network view for dimension 4.
- **Where a live game exists, the Performance Dashboard** outranks everything above: real crash rates and real memory from real devices.

**When a dimension cannot be measured, it is "Not assessed", never a number.** An unaudited dimension reported as 3 is a fabrication, and it is the one an owner will act on.

---

## Scorecard dimensions

### 1. Security & Server Authority

| Score | Technical Criteria |
|---|---|
| **1** | Client submits authoritative damage, currency, or stats directly; remotes lack type/shape checks; client-supplied raycast origins accepted without verification. |
| **2** | Basic type checking present but lacks rate-limiting; client-reported positions trusted without distance bounds; cooldowns enforced only on the client. |
| **3** | All remote arguments validated with `typeof()`; basic rate-limiting in place; server computes damage and awards from server-side configurations. |
| **4** | Server-authoritative state machine (`Idle`, `Attacking`, `Stunned`, `Recovery`); cooldowns tracked server-side with `os.clock()`; raycast origins validated against server character proximity (`(origin - rootPart.Position).Magnitude <= MAX_MUZZLE_DISCREPANCY`). |
| **5** | Bounded lag compensation (temporal rewind capped at 300–500 ms); token-bucket rate limiter with structured escalation; zero trust in client physics beyond display. Reference: [security.md](security.md) & [cases/combat.md](cases/combat.md). |

---

### 2. Memory & Lifecycle Management

| Score | Technical Criteria |
|---|---|
| **1** | Event connections created without disconnect paths; per-player tables accumulate indefinitely without cleanup in `PlayerRemoving`; persistent memory grows unbounded. |
| **2** | Connections cleaned up manually in some scripts but missed in others; instance references stored in global tables; lack of teardown for streaming-out instances. |
| **3** | Clear owner for every connection; per-player state cleared on `PlayerRemoving`; per-character state cleared on `CharacterRemoving`; handles pre-existing players. |
| **4** | Centralized lifecycle scopes (Trove, Maid, or connection bag); instance pooling for high-frequency objects (projectiles, effects, mob models); explicit cleanup on `CollectionService` tag removal. |
| **5** | Zero lingering references across multi-round lifecycles; deterministic teardown verified under stress testing; streaming memory stays flat over multi-hour sessions. Reference: [patterns/lifecycle.md](patterns/lifecycle.md). |

---

### 3. CPU & Performance Budget

| Score | Technical Criteria |
|---|---|
| **1** | Polling loops (`while task.wait() do`) used for state detection; table/closure allocations inside `RunService.Heartbeat` or `RenderStepped`; frame time regularly exceeds 16.67 ms. |
| **2** | Heavy per-frame spatial queries without caching; string concatenation (`..`) inside loops; `FindFirstChild` or property indexing repeated across hot paths. |
| **3** | Event-driven architecture replaces polling; references hoisted to VARIABLES; AI targeting and proximity scans throttled to 5–10 Hz with staggered execution. |
| **4** | Zero per-frame GC allocations in hot loops; reuse of `RaycastParams`/`OverlapParams`; usage of `table.create` and `table.clear` for reusable buffers; native math optimization (`--!optimize 2`). |
| **5** | Compute-heavy algorithms offloaded to Parallel Luau via `Actor` model with structured ReadParallel/Serial phases; SIMD-optimized `vector` library usage; gameplay frame time well within low-end device ceilings. Reference: [performance.md](performance.md) & [device-performance.md](device-performance.md). |

---

### 4. Network & Replication Efficiency

| Score | Technical Criteria |
|---|---|
| **1** | RemoteEvents fired per-frame with uncompressed tables; private player balances or secrets exposed via replicated `Attributes`; network saturation causing high ping. |
| **2** | Full state tables replicated on every minor update instead of state deltas; reliable remotes used for ephemeral visual effects (tracers, particles). |
| **3** | Remotes fired only on state transitions; distinct separation between private player data and public replicated attributes; throttled network traffic. |
| **4** | `UnreliableRemoteEvent` used for high-frequency, loss-tolerant visuals; server-to-client traffic sends minimal state diffs; remote payloads stay within byte budgets. |
| **5** | Bulk data serialized into binary `buffer` structures; client-side interpolation with server dead-reckoning; bandwidth consumption profile tuned across network tiers. Reference: [patterns/network.md](patterns/network.md) & [limits-budgets.md](limits-budgets.md#messaging). |

---

### 5. Data Safety & Persistence

| Score | Technical Criteria |
|---|---|
| **1** | Raw `SetAsync` used for player progression; failed DataStore loads fall through to default data upon saving (catastrophic player data wipe risk). |
| **2** | Unhandled DataStore error states; missing `BindToClose` data flush; saving on every score change instead of throttled session saves. |
| **3** | `UpdateAsync` used with basic retry logic; data loaded into session RAM on join and served from memory; saves executed on `PlayerRemoving` and `BindToClose`. |
| **4** | Fail-loud session policy (session marked unsaveable if load fails after retries, refusing to overwrite real data); bounded exponential backoff; clean JSON-serializable schema enforcement. |
| **5** | Robust schema migration / versioning pipeline; graceful handling of `ServerRestartScheduled`; durable session locking to prevent multi-server race conditions. Reference: [patterns/data.md](patterns/data.md) & [cases/data-economy.md](cases/data-economy.md). |

---

### 6. Code Structure & Maintainability

| Score | Technical Criteria |
|---|---|
| **1** | Unstructured monolithic scripts mixing logic, rendering, and networking; deprecated APIs (`wait()`, `spawn()`, `BodyMovers`); hardcoded magic numbers scattered everywhere. |
| **2** | Inconsistent file layout; scattered inline requires; logic tightly coupled to Workspace hierarchy instead of modular services. |
| **3** | Standard three-section layout (`VARIABLES`, `FUNCTIONS`, `INITIALIZATION`); modern `task.*` APIs; clear separation of Service, Module, and Configuration constants. |
| **4** | Single authoritative writer per piece of state; contract-level Documentation Comments (free of volatile numbers and implementation details); shared type definitions. |
| **5** | Decoupled pure logic modules suitable for automated unit testing (TestEZ / Jest-Lua); modular architecture adapting seamlessly across toolchains. Reference: [section-layout.md](section-layout.md) & [verification.md](verification.md). |

---

## Turning scores into a verdict

- **A mean across six dimensions hides the thing that matters.** A place scoring 5 everywhere and **1 on Data Safety** averages to 4.3, reads as "Production Ready", and will still delete a player's progress. **The overall verdict is capped by the lowest dimension** whenever any dimension sits at 1 or 2: report the average if it helps, but the verdict is the floor, and the floor is named.
- **A 1 or a 2 is also a finding in its own right**, and it goes through the normal severity taxonomy with a concrete failure scenario attached ([false-positives.md](false-positives.md#severity-taxonomy-use-these-three-words-everywhere)). The score says how mature; the finding says what breaks and when.
- **Rank action items by consequence, not by dimension order.** Data loss and exploitable economy first, frame time later. Two or three items an owner will actually do beat a list of twelve.
- **Say what you did not audit.** The systems skipped, the dimensions not assessed, and the load you tested at. An audit's honesty is what makes the next one worth running.
- **Re-scoring is the point.** A score is only useful against a previous one, so record the date-free baseline conditions (which systems, what load, which tools) so the same audit can be run again after the fixes.

## Audit report template

When performing a system audit, format the evaluation summary using this structure:

```markdown
**System Health Audit: [System Name]**

| Dimension | Score | Status | Evidence | Key Findings & Recommendations |
|---|:---:|---|---|---|
| 1. Security & Server Authority | 4/5 | Robust | Read all 7 remote handlers | Origin proximity check present; shared rate limiter called from every handler. |
| 2. Memory & Lifecycle | 5/5 | Elite | 20x respawn, Scene Analysis | Centralized Trove cleanup; Unparented Instances empty after GC. |
| 3. CPU & Performance Budget | 4/5 | Robust | Script Profiler, 10 s at 40 NPCs | No function above 5% Self Time; AI staggered at 10 Hz. |
| 4. Network & Replication | 2/5 | Fragile | MicroProfiler network view | Full inventory table replicated on every pickup. Send deltas. |
| 5. Data Safety & Persistence | 5/5 | Elite | Read data module + forced shutdown | UpdateAsync with fail-loud session flag; schema versioned. |
| 6. Structure & Maintainability | — | Not assessed | — | Sampled 3 of ~60 scripts; too little to score. |

**Overall System Maturity:** **Fragile** — capped by Network & Replication (2/5), not the 4.0 mean.

**Priority Action Items:**
1. Replicate inventory changes as deltas; the full-table send is the frame-time and bandwidth cost behind the reported stutter.
2. [Next item, ordered by consequence]

**Not audited:** the shop and matchmaking systems; structure scored on too small a sample. Tested at 12 players / 40 NPCs in Studio, not on device.
```

The example is shaped the way an honest audit usually comes out: strong in most places, one real problem, one dimension the evidence did not support scoring, and a verdict that refuses to average the problem away.
