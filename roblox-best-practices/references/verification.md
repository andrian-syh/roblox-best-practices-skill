# Verification Workflow

How to prove a change actually works — in the running engine, not just by reading the code. Testable architecture, multi-client sessions, and error telemetry now live here too.

## Principles

- **Drive the affected flow end-to-end.** A change to a purchase path is verified by executing a purchase in a live session and observing the result. A clean typecheck or a passing pure-logic unit test is necessary, not sufficient, for anything that touches Instances, replication, or scheduling.
- **Condition-driven waits, not blind sleeps.** Test code waits for the observable condition with a bounded timeout (`repeat task.wait(0.1) until done or os.clock() > deadline`) instead of a fixed `task.wait(3)` — fixed sleeps make tests both slow and flaky. (Polling is legitimate *in test code*; the no-polling rule targets production code.)
- **Assert through observable markers.** Emit structured, greppable lines (`print("[TEST] key=", value)`) at the assertion points and read them from console output — a verification whose pass/fail can't be seen from the log wasn't a verification.
- **Replication needs multiple clients.** Anything involving remotes, replication timing, or StreamingEnabled gets a multi-client session (Team Test / Start Server+Players) — a single-Play session hides every networking bug.
- **Leave no residue.** Test scripts, tags, and instances created for verification are removed when done; prefer mechanisms that clean themselves up (see play-mode note below).

## Studio-native / MCP environments

- **Command-bar VM isolation (critical pitfall).** The Studio command bar — and an MCP Luau-execution tool running in the **Edit** context — uses a **separate Luau VM** from game scripts. `require()` there creates a *fresh instance* of the module with its own empty state: asserting on it tells you nothing about the running game, and calling its init/setup functions can double-register handlers on real shared resources (remotes, tags). Never assert game state through a command-bar `require`. Where the execution tool offers Client or Server contexts during a running session, those reach the live VMs; the Edit context does not. Tool-side rules: [studio-mcp.md](studio-mcp.md#the-edit-context-vm-trap).
- **Inject test scripts into the game VM instead.** Write the test as a real `Script` (in `ServerScriptService`) or `LocalScript` (in a player's `PlayerGui`) whose `Source` is set from the command/plugin context — those run in the game's VM and share the game's module registry, so `require` returns the live module instances.
- **Play mode discards its changes.** Instances created *during* a play session are discarded when the session stops — injected play-mode test scripts clean themselves up. Anything injected in edit mode must be deleted manually afterward. The same property makes play mode the wrong place to do authoring work: real edits made while playtesting are lost when play stops ([studio-mcp.md](studio-mcp.md#irreversible-operations)).
- Outbound network calls from a command-bar-required networking module can still be useful: the *traffic* reaches the real server handlers. What is invalid is asserting on the fresh module's local state.

## Newer verification levers

Confirm availability in the target environment before relying on these ([api-currency.md](api-currency.md)).

- **Studio CLI** — officially documented (`create.roblox.com/docs/studio/command-line-interface`). `--task RunScript --runScriptFile <path>` executes a `.luau` file, optionally against `--placeId`/`--universeId` or `--localPlaceFile`, with `--outputFile` capturing output and `--quitAfterExecution` exiting when done; `--openScriptPath` opens a specific script; and `--api` / `--fullApi` / `--apiV2` write the installed engine's API surface as JSON — the strongest offline check for whether an API exists in your target build. CLI scripts run at command-bar permission, so the command-bar VM caveat above still applies.
- **`ScriptDebuggerService` [Beta]** — programmatic debugging from Luau: conditional breakpoints, logpoints, call-stack and variable inspection, and execution control. Useful for pinpointing a failure that logging alone cannot localize. Being Beta, it is a debugging aid, not something to build a permanent test harness on.
- **Studio Script Sync** — scripts edited as files in an external editor with bidirectional sync. Verification still happens in a Studio session; the editor is only the authoring surface, and **the Studio debugger cannot be driven from it** ([external-editors.md](external-editors.md#studio-script-sync--the-official-one)).

## Rojo / filesystem environments

- Pure-logic modules (no Instances, no services — see [unit-testable architecture](#unit-testable-architecture-framework-agnostic)) run under the Luau CLI or lune in CI; match the project's runner (TestEZ, Jest-Lua, plain asserts) if one exists.
- **Confirm the change actually reached the place before trusting a playtest.** A file written on disk is not a synced instance: the serve session may be down, the plugin disconnected, or the wrong place open. Which tool is in use decides which direction even flows — settle that first ([external-editors.md](external-editors.md#the-one-question-to-answer-first)).
- CI passing does not exempt engine-touching paths from an in-Studio session — sync the change in and drive the flow there too.

## Review verification discipline (trace before flag)

When reviewing code (rather than writing it), findings must survive this filter before being reported:

1. **Trace paired logic on both sides.** Writer/reader, serializer/deserializer, encoder/decoder, fire/handler: an asymmetry between paired sites is only a bug if tracing *both* sides end-to-end shows a divergent outcome — one side may deliberately compensate for the other's behavior.
2. **Consider that the design is intentional.** Patterns that look wrong in isolation — state created before its data exists, caches that self-heal instead of invalidating, redundant-looking guards — are often deliberate. Check the usage sites and any header contract before judging.
3. **Demand a concrete failure scenario.** A reportable finding states inputs/state → wrong outcome. "This could maybe fail" without a scenario is not a finding; when practical, reproduce it (in a playtest or a unit harness) before reporting.
4. **Verify APIs against the target environment** before flagging them as wrong or nonexistent (SKILL.md → Environment & Scale) — never from memory alone.

These four steps are what keep a review objective: they filter out bias toward "code that looks different from how I'd write it".

Once a finding passes all four steps, assign it a severity — **Blocker**, **Correctness**, or **Advisory** — using the taxonomy and the full "what NOT to flag" catalog in [false-positives.md](false-positives.md). The gate decides *whether* a finding is real; the severity decides *how bad* it is. Advisory items are proposed, never reported as violations, and never silently rewritten.

## Studio testing workflow

- **Multi-client testing:** Studio's multi-client Team Test / Start Server+Players for anything involving replication — single-Play sessions hide every networking bug. Server-script breakpoints during Team Test where available.
- **Network conditions:** Advanced Network Simulation (Studio Settings → Network) — test remotes and prediction at 100–200 ms latency with loss *before* shipping; it always works on localhost.
- **Profiling:** MicroProfiler/ScriptProfiler workflow and memory-leak watching per [performance.md](performance.md#measurement-never-optimize-blind).
- **Cloud paths need the right session.** DataStore access is off in Studio until enabled, and **secrets resolve only in live servers and Team Test** — a local playtest silently takes the failure branch of any code that reads one. Drive save, load, and purchase flows in a session where those calls actually reach the backend, and force a shutdown mid-session to test the flush path.
- **Change verification:** prove a change works by driving the affected flow in a live session and asserting observable results — full workflow, condition-driven waits, and the command-bar VM-isolation pitfall below.

## Performance & memory verification (proof of performance)

Before closing any performance-sensitive system or optimization pass, validate against four concrete test gates:

0. **Know which of the three you are proving.** Roblox measures an experience on **frame rate, memory, and join time**; a gate that only watches frame time can pass while join time doubles. Pick the axis the change touches, and record its number before and after.
1. **Respawn Memory Leak Audit (20x Respawn Test):**
   - Playtest in Studio and record baseline `LuaGarbageCollector`, `Signals`, and `Instances` in Developer Console (`F9`).
   - Force character respawn / re-entry 20 times consecutively.
   - Inspect **Scene Analysis → Unparented Instances** and **Animation Memory**: active signal counts and Lua heap must return to baseline after garbage collection, with zero unparented model references leaking.
2. **Replication & Data Ping Saturation Test:**
   - Run a simulated combat / interaction scene with maximum players and entities under Studio Network Simulation (`Alt+S`, 100–150 ms latency with loss).
   - Check `Shift + F3` (Debug Stats) and Developer Console Server Stats: **Data Ping must not blow out significantly beyond Network Ping**. If Data Ping spikes, throttle remote firing rates or compress payloads into binary buffers.
3. **Full-Load Baseline Frame Test (Device Emulator):**
   - Test with maximum realistic entity counts (100+ entities/projectiles).
   - In Script Profiler, record 10 seconds under full load and read the top of the list; `Self Time > 5%` is this skill's candidate threshold, not a platform limit ([api-currency.md](api-currency.md#performance-figures-and-where-they-come-from)).
   - In the MicroProfiler (`Ctrl+F6` in Studio, `Ctrl+Alt+F6` in the client), confirm no frame overruns 16.67 ms and that GPU Wait Time stays out of the red (2.5 ms).
   - In Viewport Render Stats (`Shift + F2`), verify **Draw Calls <= 1,000** and **Triangles <= 1,000,000**.
4. **Thermal & Sustained Play Test:**
   - Execute a 10–15 minute continuous active session on a physical test device (or observe frame time stability window).
   - Verify that frame pacing remains stable at 60 FPS without sustained degradation over time.

## After it ships: monitor

Verification does not end at the playtest, because the playtest is two people on good hardware. The **Performance Dashboard** on the Creator Dashboard is the only view of real players: client crash rate, client and server memory, frame rate, average session time, and a `PlaceScriptMemory` breakdown, across whatever date range you pick.

- **Correlate with releases.** Read the dashboard against the dates you shipped changes; a memory line that starts climbing on a release day names its own cause.
- **Watch trends, not snapshots.** Memory that grows across a session is the shape of a leak; a single reading cannot show it.
- **Client crash rate above 2–3% is an investigation**, and usually a memory one on low-end devices.
- **Reproduce in Studio with a long session**, then use Scene Analysis and `debug.setmemorycategory` attribution to find which system is growing ([performance.md](performance.md#measurement-never-optimize-blind)).

## Unit-testable architecture (framework-agnostic)

You don't need a test framework mandate — you need testable *shape*:

- Keep pure logic (damage formulas, economy math, inventory operations, state machines) in ModuleScripts that touch **no Instances and no services** — pass data in, get data out. These run under any runner (TestEZ, Jest-Lua, or a plain assert script) and even in CI via Luau CLI/lune.
- Push Instance access, remotes, and DataStores to thin edge scripts that *call* the pure modules. If a function needs a `Player`, pass the data it actually uses (userId, profile table) instead.
- If the project has a test runner, match its conventions; if not, offer a `Tests` folder with plain assert-based specs rather than forcing a framework.

## Error telemetry & logging

- Capture unhandled errors: `ScriptContext.Error` (server + client), forward client errors to the server via a rate-limited remote; log with script name and stack.
- Structured logging (`LogService` `Info`/`Warn`/`Error` with context where available; else prefix-tagged `warn`) — consistent, greppable, and off by default for debug-level spam behind a Configuration flag.
- **AnalyticsService** custom events for funnels (onboarding steps, purchase flows, feature usage) and economy events — instrument at ship time, not after the retention problem appears.
- Wrap telemetry itself in `pcall`; diagnostics must never crash gameplay.
