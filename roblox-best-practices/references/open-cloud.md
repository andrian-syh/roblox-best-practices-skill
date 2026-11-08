# Open Cloud through the Studio MCP

How to use `open_cloud_invoke`, the Studio MCP tool that calls Roblox Open Cloud with a token Studio manages, without touching live players, data, or money by accident. Driving the Studio tools themselves is covered in [studio-mcp.md](studio-mcp.md); this page covers the cloud side. The source is Roblox's [Use Open Cloud with the Studio MCP server](https://create.roblox.com/docs/studio/mcp-open-cloud); this page wins where it is stricter.

## Contents

- [What the tool is](#what-the-tool-is)
- [The permission page](#the-permission-page)
- [What the permissions do and do not gate](#what-the-permissions-do-and-do-not-gate)
- [Classify every call before sending it](#classify-every-call-before-sending-it)
- [Preflight for a cloud call](#preflight-for-a-cloud-call)
- [Recipes by job](#recipes-by-job)
- [Rollback points](#rollback-points)
- [Permission profiles by project phase](#permission-profiles-by-project-phase)
- [Errors and when to stop](#errors-and-when-to-stop)
- [Rate limits](#rate-limits)
- [Verified and unverified](#verified-and-unverified)

## What the tool is

`open_cloud_invoke` sends one HTTP request to `https://apis.roblox.com` and returns the status and body.

- **Prerequisites.** The open place belongs to a published game (unpublished local places cannot use the permissions), the user may manage that game, and for a group-owned game their group role allows the actions granted.
- `endpoint` is a path that starts with `/`, query string included. Full URLs and other hosts are refused.
- `body` is a JSON string. Omit it for `GET` and `DELETE`. With `files` set, `body` is a JSON object whose keys become form fields (for the Assets API, `request`).
- `scopes` lists the Open Cloud scopes the endpoint needs. Optional, but it turns a missing scope into a clear error.
- `files` uploads local files as multipart form data: `POST`, `PUT`, or `PATCH` only, absolute paths, at most 5 files of 20 MB, asset file types only (`bmp fbx flac glb gltf jpeg jpg mov mp3 mp4 ogg png rbxm rbxmx tga wav`), and only from an approved upload folder. The Assets API field name is `fileContent`.
- The token is managed by Studio and holds only the scopes enabled for the current game. **Never pass an API key or an auth header**, and never ask the user to paste a key into chat or into `execute_luau`.
- Long jobs (asset uploads, Instance API reads, analytics queries) return an operation. Poll the operation path (for assets, `GET /assets/v1/operations/{operationId}`) until `done` is true. One poll per step, not a loop.

Read an endpoint's method, body, and scopes before the first call. The complete, machine-readable list is Roblox's [OpenAPI document](https://create.roblox.com/docs/cloud/reference/openapi) (`openapi.json` in `Roblox/creator-docs`), where each operation carries `x-roblox-scopes` and `x-roblox-rate-limits`. For one endpoint, `http_get` on its `https://create.roblox.com/docs/cloud/...md` reference page with a `query` is cheaper.

Roblox ships three skills for this tool: `rbx-open-cloud-usage` (endpoints and errors), `rbx-permissions` (which scopes a task needs, asking only for the missing ones), and `rbx-import-asset` (import a model from a 3D tool, then check and fix it). Load `rbx-permissions` when unsure which scope a task needs. This page wins where they disagree.

## The permission page

The user sets the grant in **Assistant** > **…** > **Settings** > **MCP Permissions** tab, also reachable from the MCP status indicator at the bottom right of Studio. The agent cannot read or change this page. Ask which sections are on, or infer it from the first denial.

- **Per game, per person.** Grants are saved to the user's account for each game. Collaborators set their own; enabling a scope for one person enables it for nobody else. A staging game and a production game are granted separately, but one person can grant both, so the agent's own environment check still applies.
- **External clients only.** The grants apply to external MCP clients, not to the built-in Assistant.
- **Access levels.** Every game starts at **Balanced** (low- and moderate-risk scopes). **Safe** turns on low-risk scopes only, **Full access** turns on every scope including the high-risk ones that cost Robux, affect players, or publish to the live game, and **Custom** appears once any toggle changes. Roblox assigns each scope its risk level, and a change applies to the client's next request. Never ask the user for Full access to save a step; ask for the one scope the task needs.

The nine sections and their scopes, from the docs:

| Section | What it allows | Scopes |
|---|---|---|
| Look at your game | Read game and place settings, version history, analytics, instances | `universe:read`, `universe.place:read`, `universe.analytics:read`, `universe.place.instance:read` |
| Edit your game | Change game and place settings, publish, restart servers, edit instances remotely | **`universe:write`**, `universe.place:write`, `universe.place.instance:write` |
| Players & social | Profiles and inventories, notifications, groups and forums, events, saved Creator Store items | `user.*`, `group:*`, `group-forum:read`, `universe.event:*`, `creator-store-save:*` |
| Save & load data | `DataStoreService` and `MemoryStoreService` from `execute_luau` | `universe-datastores.*`, `universe.ordered-data-store.*`, `memory-store.*` |
| Connect to the internet | HTTP requests from Luau to allowed domains, cross-server messages | `Network` capability, `universe-messaging-service:publish`, plus the HTTP domain allow list |
| Publish & manage assets | Upload assets and check status, share assets, Creator Store listings, place versions, thumbnails | `asset:*`, `asset-permissions:write`, `creator-store-product:*`, **`universe-places:write`**, `universe.thumbnail:*` |
| **Money & monetization** | Developer products, game passes, ad campaigns, subscriptions | `developer-product:*`, `game-pass:*`, `ad.campaign:*`, `ad.billing:read`, `universe.subscription-product.subscription:read` |
| **Player consequences** | Read, create, and remove bans | `universe.user-restriction:*` |
| **Security & credentials** | Read secret names, create secrets, run Luau in the cloud | `universe.secret:*`, `universe.place.luau-execution-session:*` |

The docs flag the bold entries as high impact: they can cost Robux, affect players, or publish to the live game. Enable them for one task and switch them off after.

**Never grantable to an MCP client:** badge scopes, `universe-datastores.control:*`, `universe-datastores.objects:create`, analytics alerts, and every `legacy-*` scope. Those tasks belong to the [Creator Dashboard](https://create.roblox.com/dashboard/creations) or an API key. Some other endpoints reject the MCP token even with the scope enabled.

## What the permissions do and do not gate

- **Data stores and memory stores go through `execute_luau`, not Open Cloud.** The client calls `DataStoreService` and `MemoryStoreService` from `execute_luau`. That needs the **Save & load data** scopes (`universe-datastores.objects:read` for reads, `universe-datastores.objects:update` for writes, `memory-store.*` for memory stores) plus **Game Settings** > **Security** > **Enable Studio Access to API Services**. These are the live data stores: a write changes real player data, so it carries the same W and X rules as a cloud call.
- **HTTP from Luau is gated.** **Connect to the internet** grants the `Network` script capability, and Studio refuses any domain not on the HTTP domain allow list. Other capabilities cannot be granted.
- **Other Studio tools are not gated.** `multi_edit`, edits to the open place, and `execute_luau` code that touches neither data stores nor HTTP keep working when **Edit your game** is off. Writes to the open place stay under the rules in [studio-mcp.md](studio-mcp.md#irreversible-operations).
- **The HTTP domain allow list does not gate `http_get`.** That tool has its own fixed list of documentation URLs.
- **Upload folders are enforced by Studio.** A file outside them is refused, even with `asset:write` on. Never copy or move a file into an approved folder to get around the refusal; the user moves it or approves its folder.
- **Uploads are permanent.** An uploaded asset is owned by the game's creator (the group for a group-owned game), and Open Cloud cannot archive or delete it. Removing one takes the Creator Dashboard.
- **Denial is checked twice.** With `scopes` filled in, a missing scope fails before the request. With `scopes` left out, the server returns 403. Leaving `scopes` out never widens access, so always fill it in for the clearer error.
- **Changes apply to the next request.** No Studio restart.
- **No confirmation dialog.** The tool does not ask before a granted write, so a granted `universe-messaging-service:publish` reaches live servers silently. Roblox's `rbx-*` skills tell the agent to ask; the confirmation the user sees is the one the agent asks for.

## Classify every call before sending it

Classify by method and path, never by the tool name. Unknown means X.

| Tier | Examples | Rule |
|---|---|---|
| **R** (read) | Any `GET` except a queue `items:read`; `POST` that only reads: `:query`, `:batchGet…`, `:search…`, `experiments:calculateMde`, analytics `metrics`, `dimension-values`, and `benchmarks` | Send. Keep the result small: page sizes, specific paths, never the root of a large tree |
| **W** (write, reversible) | Data store or ordered data store entry update with a recorded version, memory store queue or sorted-map item (a queue `items:read` dequeues, so it is W), config draft, asset update or rollback, instance edit, thumbnail | Show method, path, target universe, and the body. Ask once. One call per approval |
| **X** (outward or irreversible) | Any `DELETE`; asset upload (`POST /assets/v1/assets`) and any call with `files`; messaging publish; publishing a live place version or a config repository; price changes; bans; Luau execution tasks; user notifications; server restarts and matchmaking shutdowns; starting, completing, or scheduling an experiment | Name it as irreversible, show the rollback point or say there is none, ask, then send exactly once. Never retry automatically. Any game pass or developer product write, and any place version publish, `Saved` included, is X: the method and path cannot tell metadata from price, or staging from live |

Apply this table yourself before every call. Where roblox-optimum is installed, its PreToolUse hook (Claude Code, Antigravity) applies it too: R passes, W and X ask the user with the call, the universe, and whether it is listed as dev, and the break-glass calls below are denied; its MCP server's `classify_open_cloud_call` returns the same tier offline when given the method, endpoint, `files`, and `scopes`. Without either, this page is the whole check.

How to read a call (the hook reads it the same way):

- **The endpoint is normalised first**, the way the server would see it: dot segments resolved, `%`-escapes decoded, the query, `#` fragment, and trailing slashes dropped. A full URL, another host, or an escape that cannot be decoded is X.
- **`scopes` only raises the tier.** A write scope makes the call at least W, and a high-impact scope from the docs warning list makes it X. A declared scope never lowers a tier, since the agent writes it.
- **Some reasons carry a note without changing the tier.** A path that needs a scope Studio never grants (`legacy-*`, analytics alerts, data store snapshot or undelete) says to use the Creator Dashboard or an API key. A data store or memory store path says Studio routes data stores through `execute_luau`, so the call is likely refused.

Never send on the agent's own initiative, even when the scope is granted: a memory store flush, any secret write (`universe.secret:write`), asset permission changes (`asset-permissions:write`), group membership or join-request changes (`/cloud/v2/groups/{id}/memberships` and `join-requests`), ad campaign writes (`/ads-management/.../campaigns`, which spend Robux), and service-efficiency payments. The docs list most of them as grantable; refusing them is this page's policy, and the user runs them with their own key or the Creator Dashboard. Where roblox-optimum is installed, its hook denies them. Bans of more than one user belong to the same list, and no hook can count users, so this rule is the agent's to keep.

## Preflight for a cloud call

Run these before the first W or X call of a session, in addition to the [MCP preflight](studio-mcp.md#mcp-preflight).

1. **Which universe?** Resolve the universe id from the place id (`GET /universes/v1/places/{placeId}/universe`). Read `GET /cloud/v2/universes/{id}` once and state its `displayName` and `visibility`.
2. **Which environment?** Ask whether it is a dev, staging, or production experience, unless the project records it. A universe nobody named is production. Where roblox-optimum is installed, a project records its dev universes in `.roblox-optimum.json` at its root as `{"openCloud": {"devUniverses": [123]}}`; otherwise read the project's own notes or ask.
3. **Which scopes are granted for this game?** Ask the user, or learn it from the first denial. Never ask the user to widen the grant on speculation.
4. **What is the rollback point?** Record it before the write ([below](#rollback-points)).

## Recipes by job

Each recipe lists the least scope it needs. Ask for that, not a whole section.

**Read a place without opening it** (`universe.place.instance:read`). `GET .../instances/{id}:listChildren` returns an operation; poll it once. Start from a known instance id, never the root of a large place. For the place already open in Studio, `execute_luau` and `search_game_tree` are cheaper.

**Fix one player's data** (`universe-datastores.objects:read`, then `universe-datastores.objects:update` for the write, plus **Enable Studio Access to API Services**). Use `DataStoreService` from `execute_luau` in the `Server` DataModel during play, not `open_cloud_invoke`. Read the entry and record its version (the `DataStoreKeyInfo.Version` that `GetAsync` returns, or `ListVersionsAsync`). Show the diff. Write one entry. Read it back. Several entries follow [Change many](studio-mcp.md#recipes): dry run, count, confirm, one batch at a time under the live budget, read back with a miss list.

**Live ops** (`universe:write`). Write the config as a draft, show it, publish only on an explicit yes: a publish reaches live servers at once. Before a restart, read the forecast. A messaging publish is X even on a quiet server.

**Publish a place version** (`universe-places:write`). Use `versionType=Saved` for staging. `Published` only on an explicit instruction that names the place ([release-readiness.md](release-readiness.md)). Record the current version number first.

**Change a price** (`developer-product:write` or `game-pass:write`). Only when the user names the product and the number. Show the old and new price side by side before sending.

**Ban a player** (`universe.user-restriction:write`). Only with a user id, a duration, and a reason the user gave. One user per approval.

**Read analytics** (`universe.analytics:read`). Send the query, then poll the operation. Report aggregates. Do not copy per-player values into the reply ([publishing.md](publishing.md)).

**Upload an asset** (`asset:read` and `asset:write`, an approved folder). The upload is permanent, so confirm first and treat it as X. Upload, poll the operation, wait for moderation, report the asset id. For a 3D model, check each mesh against the triangle limit first and ask whether to split or simplify. Ask the user to approve a folder when none is set; do not move the file.

**CI and automation.** Do not route CI through the Studio token. CI uses its own API key with the fewest scopes, restricted to named experiences and an expiry ([team-workflow.md](team-workflow.md)). The same goes for scopes Studio never grants.

## Rollback points

| Change | Rollback | Record before writing |
|---|---|---|
| Data store entry update | Earlier versions are kept for 30 days; only the first write per key in each UTC hour is kept as a backup | Current version id |
| Data store entry delete | Same version history, if it still exists | Version id and the full value |
| Memory store flush, messaging publish, notification, ban already served | None | Say there is none |
| Asset upload | None through Open Cloud; the Creator Dashboard can remove it | Say there is none |
| Place version publish | Publish the previous version again | Current version number |
| Asset update | Asset rollback to an earlier version | Current asset version |
| Config publish | Restore an earlier revision; players saw the change meanwhile | Current revision |
| Price change | Set the old price again; purchases made meanwhile stand | Old price |

## Permission profiles by project phase

Recommend these as per-game grants. Switch write scopes on for one task, then off again.

- **Prototype** (dev experience, no real players): Look at your game in full; instance and place writes; data store read and update with Studio API access on; asset read and write with one upload folder; messaging publish off; flush off.
- **Team development** (dev and staging, testers): as Prototype, but data store delete off, asset write only while uploading, `user.advanced:read` and `user.inventory-item:read` off, Luau execution only for a separate CI experience. Each collaborator sets their own grants.
- **Live production**: reads only. Writes off, messaging publish off. Step up one scope for one task (`universe-datastores.objects:update` for one data fix, `universe-places:write` for one release, `developer-product:write` for one price change), then switch it off.

## Errors and when to stop

When a request is blocked, report what is missing. Never bypass a permission that is off.

| You see | It means | Do |
|---|---|---|
| "Scope '…' has not been granted" | The scope is off for this game, or misspelled | Stop. Name the one scope needed and ask the user to grant it. Do not retry or route around it |
| 403 "Scope not authorized." | Same denial, from the server | Same as above |
| 403 or 401 with the scope enabled | The endpoint does not accept the MCP token | Stop at once; repeating it changes nothing. Suggest the Creator Dashboard or the user's own API key |
| 401 | Token rejected | Retry once, then stop |
| `lacking capability <capability>` | A script needs a capability that is not granted | Ask for **Connect to the internet** for `Network`. Other capabilities cannot be granted |
| `domain <domain> is not in the Assistant HTTP allowlist` | The domain is not allowed | Ask the user to add it under **Connect to the internet** > **HTTP domain allow list** |
| `502 … Access forbidden` from a data store call | The matching **Save & load data** scope is off | Ask for the read or update scope |
| `Studio access to APIs is not allowed` | The game setting is off | Ask the user to enable **Game Settings** > **Security** > **Enable Studio Access to API Services** |
| `InternalError` from a memory store call | The `memory-store.*` scopes are off | Ask for the memory store scopes under **Save & load data** |
| "…not inside a directory approved for uploads" | Upload folder missing | Ask the user to approve the folder or move the file. Do not copy the file elsewhere |
| 429 or a `retry-after` header | Rate limit | Wait the stated time. Never retry a W or X call blindly |

## Rate limits

Data store and messaging calls share the experience's live budget, so a burst from the agent can starve real servers. The other limits are per token or per API key owner. Keep well below all of these. Per-endpoint limits are in each operation's `x-roblox-rate-limits` in `openapi.json` ([rate limits](https://create.roblox.com/docs/cloud/reference/rate-limits)).

| API | Limit |
|---|---|
| Luau execution task create / get / logs | 5 / 200 / 45 per minute |
| Instance API update | 45 per minute |
| Analytics query / poll | 30 / 3000 per minute |
| Asset upload or update / operation poll | 120 / 300 per minute |
| Place version publish | 30 per minute |
| Game pass write / developer product write | 5 / 3 per second |
| User restriction update | 10 per second per universe, 2 per minute per user |
| Secrets | 120 per minute |
| Messaging publish | Shared with the in-game MessagingService budget |
| Data stores | The per-universe throttle in [limits-budgets.md](limits-budgets.md), shared with live servers |

Responses may carry `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset`; slow down before `remaining` reaches 0. On 429, wait for `retry-after`; without it, back off exponentially, and only for reads.

The Open Cloud [risk levels](https://create.roblox.com/docs/cloud/reference/risk-levels) (Low to Critical) apply to the docs "try it out" feature and OAuth 2.0, not to MCP, and `openapi.json` carries no risk field, so this page does not use them.

## Verified and unverified

Facts here come from the [Open Cloud with Studio MCP](https://create.roblox.com/docs/studio/mcp-open-cloud) and [Studio MCP](https://create.roblox.com/docs/studio/mcp) pages, the tool schema, `openapi.json`, and live probes in a private dev experience; dates live in [api-currency.md](api-currency.md#studio-mcp-tooling).

- **Documented:** prerequisites; per-game, per-person grants for external clients only; the four access levels and the Balanced default; the nine sections and high-impact list; never-grantable scopes; data stores and memory stores through `execute_luau` with Studio API access; HTTP gated by `Network` and the allow list; permanent uploads; the troubleshooting errors; the three `rbx-*` skills.
- **Probed:** client and server denial; no gate on `multi_edit` or `http_get`; upload folder enforcement; Instance API as an operation; messaging publish with no dialog; data store reads refused through `open_cloud_invoke` even when granted.
- **Unverified:** exactly which scopes each access level turns on; whether the `Edit` DataModel reaches `DataStoreService` once Studio API access is on (probes before the docs saw it refused; use the `Server` DataModel); whether the MCP token accepts `POST /assets/v1/assets/{id}:archive`, which `openapi.json` lists under `asset:write`; whether `extended-services:*` scopes and the operations with no `x-roblox-scopes` are reachable at all; the Studio token's own rate limits; whether `universe.place.instance:read` reads the saved place or the open session.
