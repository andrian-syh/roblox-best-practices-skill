# Limits & Budgets — Hard Numbers in One Place

Platform ceilings an implementation must fit inside. Read this **before designing a system**, not after it hits a wall: most of these cannot be raised, and a design that ignores them fails in production rather than in Studio.

**Maturity tags** used throughout this skill: **[GA]** generally available · **[Beta]** opt-in, may change, never the default · **[Verify]** confirm in the target place before relying on it. Numbers below are a snapshot; treat the live docs as authoritative when they disagree ([api-currency.md](api-currency.md)).

## Data stores

| Limit | Value | Notes |
|---|---|---|
| Value size per key | **4 MB** | Unchanged by the latest limit revision |
| Key name length | **50 characters** | |
| Storage per experience | **500 MB + 1 MB × lifetime players** | Raised from a 100 MB base, **[Verify]** — effective date in [api-currency.md](api-currency.md#engine) |
| Request budget | **300 baseline + (CCU × multiplier), per minute** | Separate budget per request type (Standard Read, Ordered List, ...) |
| Budget scope | **Unified across in-game and Open Cloud** | Both increment the same counters, **[Verify]** — effective date in [api-currency.md](api-currency.md#engine) |
| Value shape | JSON-serializable only | No userdata, no mixed/sparse keys, no NaN/inf, no cycles ([patterns/data.md](patterns/data.md#data-persistence)) |

Consequences for design:
- **Self-throttle.** The unified budget means an Open Cloud tool and live gameplay now compete for the same allowance. A batch job run against Open Cloud can starve the running experience; schedule it or rate-limit it.
- Storage scales with lifetime players, so a **new or test place has the least headroom** relative to its per-player data. Budget the per-player payload against the early-life ceiling, not the mature one.
- The 4 MB per key is the real constraint on inventory/progress blobs. Split large data across keys with a stable partition scheme rather than growing one value.
- Extended Services for Data Stores raises service allowances where the base tier is insufficient [Verify].

## Memory stores

| Limit | Value |
|---|---|
| Item expiry | **45 days maximum** (everything expires) |
| Request quota | Scales with player count; throttles under load |

MemoryStore is ephemeral coordination (queues, session locks, live leaderboards), never a database. Wrap calls in `pcall` with backoff exactly like DataStore.

## Messaging

| Limit | Value |
|---|---|
| Message size | **~1 KB** |
| Delivery | **Best-effort** (a lost message must be recoverable) |

Send ids and references, not data blobs; receivers re-read authoritative state from DataStore/MemoryStore.

## Attributes

| Limit | Value | Scope |
|---|---|---|
| Supported types | booleans, numbers, strings, Roblox datatypes (`Vector3`, `Color3`, `UDim2`, ...) | Always. **No tables** |
| Instance references | via **`InstanceHandle`** | **[Beta]** ([patterns/world.md](patterns/world.md#behavior-binding-works-with-any-framework)) |
| Replicated attribute count | **first 64 attributes** on the instance | **Server Authority only** |
| Attribute name length | **≤ 50 characters** | Server Authority only |
| String value length | **≤ 50 characters** | Server Authority only |

The 64/50/50 window applies under Server Authority ([server-authority.md](server-authority.md)). Outside it, attributes are more permissive, but designing within the window keeps a later migration cheap.

## Animation

| Limit | Value | Scope |
|---|---|---|
| Concurrent animation tracks per `Animator` | **8** | **Server Authority only** |

Layered animation designs (base locomotion + upper body + facial + emote + ...) can exceed this quickly. Budget tracks explicitly before adopting Server Authority.

## Luau runtime

| Limit | Value |
|---|---|
| `buffer` size | **1 GB** (1,073,741,824 bytes) |
| Re-entrant deferred event depth | **10**, then dropped silently ([luau-language.md](luau-language.md#deferred-engine-events)) |
| Integer precision | exact to **2^53**; beyond that use mantissa+exponent ([genres.md](genres.md#simulator--tycoon--idle)) |

## Network payload

No single hard cap to design against, but the cost order is fixed: **numbers are cheap; strings and nested tables are not.** For bulk or high-frequency data use `buffer` serialization, send deltas rather than whole states, and prefer attribute/tag replication over custom remotes for state clients merely display ([performance.md](performance.md#network)).

## Server compute

Server Authority raises server CPU usage relative to client-authoritative movement, proportional to existing load. **Extended Services for Compute** raises per-player CPU allowance where needed [Verify]. Treat this as a real cost line when deciding whether Server Authority is worth it for a given experience ([server-authority.md](server-authority.md#deciding-whether-to-adopt-it)).
