# Limits & Budgets — Hard Numbers in One Place

Platform ceilings an implementation must fit inside. Read this **before designing a system**, not after it hits a wall: most of these cannot be raised, and a design that ignores them fails in production rather than in Studio.

**Maturity tags** used throughout this skill: **[GA]** generally available · **[Beta]** opt-in, may change, never the default · **[Verify]** confirm in the target place before relying on it. Numbers below are a snapshot; treat the live docs as authoritative when they disagree ([api-currency.md](api-currency.md)).

## Contents

- [Data stores](#data-stores)
- [Memory stores](#memory-stores)
- [Messaging](#messaging)
- [Attributes](#attributes)
- [Animation](#animation)
- [HTTP requests](#http-requests)
- [Secrets](#secrets)
- [Raising a ceiling](#raising-a-ceiling)
- [Luau runtime](#luau-runtime)
- [Network payload](#network-payload)
- [Server compute](#server-compute)

## Data stores

| Limit | Value | Notes |
|---|---|---|
| Value size per key | **4 MB** (4,194,304 characters) | The real constraint on inventory and progress blobs |
| Data store name / key name / scope | **50 characters** each | |
| User-defined metadata | **250 characters** | |
| Storage per experience | **500 MB + 1 MB × lifetime user count** | Only latest versions count, measured compressed |
| Value shape | JSON-serializable only | No userdata, no mixed/sparse keys, no NaN/inf, no cycles ([patterns/data.md](patterns/data.md#data-persistence)) |

**Per-key throughput**, which is separate from the request budget and is what a hot key hits first:

| Direction | Limit |
|---|---|
| Read | **25 MB per minute per key** |
| Write | **4 MB per minute per key** |

**Request budgets, per minute.** Two ceilings apply at once — the experience-wide one and the per-server one — and the per-server one is usually what throttles a busy server first:

| Request type | Per experience | Per server (standard) |
|---|---|---|
| Read | 300 + CCU × 40 | 60 + players × 40 |
| Write | 300 + CCU × 20 | 60 + players × 40 |
| List | 300 + CCU × 2 | 5 + players × 2 |
| Remove | 300 + CCU × 40 | 60 + players × 40 |

Ordered data stores carry the same experience-level numbers; their per-server write and remove budgets are tighter at **30 + players × 5**. Read the remaining allowance at runtime with `DataStoreService:GetRequestBudgetForRequestType()` rather than guessing, and remember the budget is **shared with Open Cloud** — a batch job run from outside can starve live gameplay.

**Caching and versions**, both of which change what a read means:

- `GetAsync` serves a **local cache for four seconds**. Cached reads cost no budget and no throughput, and they can return a value the backend no longer holds. Set `DataStoreGetOptions.UseCache = false` when the answer must be authoritative — above all when checking whether a failed write actually landed before retrying or refunding.
- Overwritten versions are retained **30 days**; the latest version never expires. **Multiple writes to the same key within one UTC hour overwrite each other permanently**, so a tight autosave loop destroys its own version history.
- `ListKeysAsync` with **key prefixes** is the current way to organize a store. Legacy scopes still work; prefixes are what new work should use.

Consequences for design:
- **Self-throttle.** The unified budget means an Open Cloud tool and live gameplay now compete for the same allowance. A batch job run against Open Cloud can starve the running experience; schedule it or rate-limit it.
- Storage scales with lifetime players, so a **new or test place has the least headroom** relative to its per-player data. Budget the per-player payload against the early-life ceiling, not the mature one.
- The 4 MB per key is the real constraint on inventory/progress blobs. Split large data across keys with a stable partition scheme rather than growing one value.
- Extended Services raises data store allowances where the base tier is genuinely insufficient ([Raising a ceiling](#raising-a-ceiling)).

## Memory stores

| Limit | Value |
|---|---|
| Item expiry | **45 days maximum** (3,888,000 seconds); everything expires |
| Memory quota | **64 KB + 1.2 KB × users** |
| Request quota | **1,000 + 120 × CCU request units per minute** |
| Key length | **128 characters** |
| Value size | **32 KB per item** |
| Sort key length | **128 characters** (sorted maps) |
| Quota traceback after a user leaves | **8 days** before their allowance is removed |

MemoryStore is ephemeral coordination (queues, session locks, live leaderboards), never a database. Wrap calls in `pcall` with backoff exactly like DataStore.

**Exceeding the memory quota fails writes** until items expire or are removed — it does not evict for you, so a structure with a long TTL and no cleanup path degrades into a wall of failures. **Per-partition throttling is separate from the quota**: a single hot key or one oversized structure throttles while the experience-wide quota still looks healthy, and the exact partition limit is not published. The fix is spreading load, not asking for more ([patterns/network.md](patterns/network.md#cross-server-communication)).

## Messaging

| Limit | Value |
|---|---|
| Message size | **1,024 characters** (1 KB) |
| Topic name | **80 characters** |
| Throughput and subscriptions | Scale with players and active servers; there are per-server caps on both subscriptions and subscribe requests |
| Delivery | **Best-effort** (a lost message must be recoverable) |

Send ids and references, not data blobs; receivers re-read authoritative state from DataStore/MemoryStore. Open Cloud publishing shares the same quotas as the in-engine service.

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

## HTTP requests

| Limit | Value |
|---|---|
| General outbound requests | **500 per minute per server** |
| Open Cloud requests | **2,500 per minute per server**, counted separately |
| Protocol | **HTTPS only** |
| Ports | Below 1024 rejected, except **80** and **443** |
| Paths | `..` is rejected |

`HttpService` is off until *Allow HTTP Requests* is enabled in experience settings, and it is server-only. Exceeding the Open Cloud ceiling stalls calls for roughly 30 seconds before erroring, so a burst is worse than a queue. Credentials belong in the **secrets store**, never in a script ([security.md](security.md#threat-model-assume-all-of-these-exist)).

## Secrets

| Limit | Value |
|---|---|
| Secrets per experience | **500** |
| Secret value length | **1,024 characters** |
| Availability | Live servers and Team Test only — **not local playtests** |

## Raising a ceiling

**Extended Services** is the paid path past the defaults, covering memory store requests and storage, data store operations and storage, compute, and speech services. It is pay-as-you-go from the Creator Dashboard with a small minimum monthly budget, and it requires an ID-verified 18+ owner in a supported country. Treat it as a business decision to surface, never as the answer to a design that leaks requests: a system that throttles at default limits will usually throttle again at paid ones.

## Luau runtime

| Limit | Value |
|---|---|
| `buffer` size | **1 GB** (1,073,741,824 bytes) |
| Re-entrant deferred event depth | **10**, then dropped silently ([luau-language.md](luau-language.md#deferred-engine-events)) |
| Integer precision | exact to **2^53**; beyond that use mantissa+exponent ([genres.md](genres.md#simulator--tycoon--idle)) |

## Network payload

No single hard cap to design against, but the cost order is fixed: **numbers are cheap; strings and nested tables are not.** For bulk or high-frequency data use `buffer` serialization, send deltas rather than whole states, and prefer attribute/tag replication over custom remotes for state clients merely display ([performance.md](performance.md#network)).

## Server compute

Server Authority raises server CPU usage relative to client-authoritative movement, proportional to existing load. **Extended Services** raises the per-player CPU allowance where needed ([Raising a ceiling](#raising-a-ceiling)). Treat this as a real cost line when deciding whether Server Authority is worth it for a given experience ([server-authority.md](server-authority.md#deciding-whether-to-adopt-it)).
