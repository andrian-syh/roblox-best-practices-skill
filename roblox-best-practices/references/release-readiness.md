# Production Release Readiness & Live-Ops Checklist

A pre-publish and live-operations gate for shipping a Roblox experience safely. Read this when preparing a place for public release, setting up Open Cloud deployments, or reviewing production readiness across data, monetization, compliance, and telemetry.

> **No dates live here.** All dated API availability and engine version baselines live in [api-currency.md](api-currency.md).

## Contents

- [1. Server Shutdown & Restart Lifecycle (`BindToClose`)](#1-server-shutdown--restart-lifecycle-bindtoclose)
- [2. PolicyService, Chat & Privacy Compliance](#2-policyservice-chat--privacy-compliance)
- [3. Monetization & Economy Integrity](#3-monetization--economy-integrity)
- [4. Open Cloud CI/CD & Secrets Hygiene](#4-open-cloud-cicd--secrets-hygiene)
- [5. Live-Ops Telemetry & Device Baselines](#5-live-ops-telemetry--device-baselines)

---

## 1. Server Shutdown & Restart Lifecycle (`BindToClose`)

When a server shuts down or restarts for an update, Roblox gives all `game:BindToClose` callbacks a shared **30-second hard deadline** before terminating the process:

- **Save all active sessions in parallel, never serially.** Waiting for each player's `UpdateAsync` one by one will exceed the 30-second window on a full server. Spawn one thread per active player and block `BindToClose` only until the counter hits zero or the deadline approaches ([patterns/data.md](patterns/data.md)).
- **Guard Studio playtests.** In Studio, `BindToClose` runs when stopping a playtest and freezes the UI if it yields on soft-shutdown teleports. Check `RunService:IsStudio()` before running migration teleports, and keep Studio shutdown saves bounded.
- **Listen to `game.ServerRestartScheduled` ([GA]).** When an experience update triggers a rolling or delayed restart, use `game.ServerRestartScheduled` to warn players in-UI, lock high-stakes trades or matchmaking queues, and flush state ahead of the final `BindToClose`.

---

## 2. PolicyService, Chat & Privacy Compliance

Platform compliance failures can get an experience moderated or broken in restricted regions:

- **Paid random items (`PolicyService:GetPolicyInfoForPlayerAsync`).** Before displaying or prompting any paid loot box, crate, or random spin costing Robux (directly or via purchased currency), check `policy.ArePaidRandomItemsRestricted`. If `true`, hide or disable the paid random purchase for that player and disclose odds where required ([monetization-policy.md](monetization-policy.md)).
- **Player-to-player trading and external links.** Check `policy.IsPaidItemTradingAllowed` before allowing trades of paid items, and verify `policy.AllowedExternalLinkReferences` before displaying social/community references in UI.
- **Custom text and direct chat gating.** Every custom player-entered string (pet names, signs, guild tags, custom chat) must be filtered on the server via `TextService:FilterStringAsync` and formatted per recipient (`GetNonChatStringForBroadcastAsync` / `GetNonChatStringForUserAsync`). Never call the deprecated `TextFilterResult:GetChatForUserAsync`, which returns an empty string ([security.md](security.md#user-generated-text-filtering)). Custom chat flows must gate general chat with `TextChatService:CanUserChatAsync` and 1:1 messaging with `TextChatService:CanUsersDirectChatAsync`.
- **Right-to-be-Forgotten (RTBF) readiness.** Key player DataStores using a predictable `{UserId}` pattern (e.g., `Player_{UserId}`) so Data Stores Manager deletion templates can purge erased accounts automatically, and pass `{ player.UserId }` in the `UserIds` parameter of `DataStore:SetAsync` / `UpdateAsync` ([patterns/data.md](patterns/data.md#deleting-data-on-request-rtbf)).

---

## 3. Monetization & Economy Integrity

- **Exactly one `MarketplaceService.ProcessReceipt` assignment per place.** Assigning `ProcessReceipt` in multiple scripts silently overwrites the previous callback, causing players to pay Robux without receiving their items. Route all Developer Products through a single central handler module ([monetization-policy.md](monetization-policy.md)).
- **Idempotent receipt persistence inside `UpdateAsync`.** Record the `PurchaseId` in the player's profile inside the same atomic `UpdateAsync` call that grants the currency or item. Only return `Enum.ProductPurchaseDecision.PurchaseGranted` **after** the DataStore write succeeds; on any error or missing session, return `Enum.ProductPurchaseDecision.NotProcessedYet` so Roblox retries on the next join.
- **Regional pricing display.** Never hardcode Robux prices in UI labels. Fetch the localized price for the player via `MarketplaceService:GetProductInfoAsync` (`PriceInRobux`) so players in regional-pricing tiers see the actual price they will be charged.

---

## 4. Open Cloud CI/CD & Secrets Hygiene

- **Never commit API keys or webhooks in Luau source.** Store third-party tokens and webhook credentials in Creator Hub Secrets and read them at runtime with `HttpService:GetSecret(name)` ([GA]). Because `GetSecret` is unavailable in local Studio playtests unless configured in local secrets, wrap secret retrieval in `pcall` and provide a safe no-op or mock path when `RunService:IsStudio()` is true ([security.md](security.md#threat-model-assume-all-of-these-exist)).
- **Open Cloud Place Publishing (`VersionType`).** In automated CI/CD pipelines (`universes/{universeId}/places/{placeId}/versions`), use `versionType=Saved` for staging builds and `versionType=Published` only when releasing to live servers, gated after automated checks pass: selene, StyLua, `npx roblox-optimum --check` where installed, and Studio CLI / `TestService` suites.

---

## 5. Live-Ops Telemetry & Device Baselines

Before and immediately after publishing, verify these Creator Hub telemetry thresholds ([performance.md](performance.md), [device-performance.md](device-performance.md)):

| Metric | Production Gate | Action When Breached |
|---|---|---|
| **Client Crash Rate** | **< 2%** (investigate above 2–3%) | Check memory growth on 2–4 GB Android tier (`SceneAnalysisService`, untracked connections, uncompressed textures > 512×512). |
| **Server Memory** | **< 50%** of `6.25 GiB + (100 MiB × maxPlayers)` | Server memory is not returned when players leave; audit `PlayerRemoving` cleanup for leaked player tables and instances. |
| **Server Heartbeat** | **60 Steps/Sec** steady | Profile server scripts with `debug.profilebegin` / Script Profiler (`Self Time > 5%`) and offload heavy raycasts or pathfinding. |
| **Client Frame Time** | **≤ 16.67 ms** (60 FPS) / GPU Wait **≤ 2.5 ms** | Keep baseline scenes under **1,000 draw calls** and **1,000,000 triangles**; enable `StreamingEnabled` and `Model.LevelOfDetail = SLIM` where appropriate. |
| **Structured Error Logs** | Zero unhandled server stack traces in `LogService` | Monitor Creator Hub Error Report after every release; wrap external yields (`DataStore`, `HttpService`, `TeleportService`, `MarketplaceService`, `PolicyService`) in `pcall`. |
