# Evaluations

Six manual behaviour scenarios and a trigger set that check whether the skill still does its job. [Anthropic's skill authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) treats evaluations, not the prose, as the measure of a skill, so these run before every release.

There is no automated runner. Run them by hand, or load [`scenarios.json`](scenarios.json) and [`triggers.json`](triggers.json) into your own harness.

## Scenarios

| ID | Checks | Input |
|---|---|---|
| `authoring-remote-handler` | A remote handler validates client input, rate-limits, and cleans up per-player state | None |
| `authoring-player-data` | Player data loads once into a cache and saves safely, and a failed load never falls through to defaults | None |
| `review-triage` | Real defects are reported at the right severity and style deviations stay Advisory | `fixtures/review-target.luau` |
| `false-positive-resistance` | Correct code that looks wrong returns zero findings | `fixtures/correct-but-odd.luau` |
| `adaptive-mode` | An existing project's conventions are studied and confirmed before code is written | `fixtures/existing-project/` |
| `external-editor-environment` | The source of truth under a Studio-first sync tool (Azul) is settled before anything is written | None |

## Scenario format

Each entry in `scenarios.json` has these fields:

| Field | Meaning |
|---|---|
| `id` | Stable name, used when recording results |
| `skills` | Skills that must be installed, always `roblox-best-practices` |
| `query` | The exact message to send |
| `input_files` | Optional. Files from `fixtures/` to attach |
| `gap_it_covers` | The agent failure the scenario guards against |
| `expected_behavior` | One line per behaviour the response must show |

## Run a scenario

1. Start a fresh session with only this skill installed and nothing else in context.
2. Send the scenario's `query`, with its `input_files` attached if it has any.
3. Score each line of `expected_behavior` as met, partly met, or missed.
4. Record every miss. Treat a miss as a skill defect until shown otherwise.

Run the full set on every model you plan to use the skill with. Guidance that is enough for a stronger model is often under-specified for a faster one.

## Compare against a baseline

A scenario that passes proves little on its own: the model may pass it without the skill. For each scenario, also run the same query in a fresh session with the skill not installed, and score both runs against the same `expected_behavior` lines. Keep a line only if it separates the two runs; a line both runs meet tests the model, not the skill. If the skill run scores lower than the baseline on any scenario, treat it as a regression.

## Trigger tests

[`triggers.json`](triggers.json) checks the skill's `description`, which is the only part an agent sees before it decides to load the skill. It holds ten queries that must load the skill and ten near-misses that must not: plain Lua outside Roblox, other engines, and Roblox-adjacent work with no Luau in it.

1. Start a fresh session with this skill and at least one unrelated skill installed.
2. Send each query three times, each in a new session, and record whether the skill loaded.
3. A `should_trigger` query passes when it loads in at least two of three runs. A `should_not_trigger` query passes when it loads in none.

Rerun the set after any change to the `description`. A near-miss that starts to trigger is a false positive, and the fix belongs in the `description`, not in a narrower query.

## Other languages

Every query is in English. To check another language, translate the queries into it and run them as separate cases, both the scenarios and the trigger set. The skill should load and apply in full, and the reply should come back in the language of the query.

## When to run them

- Before every release.
- After a port from roblox-optimum, or after moving content between files. Routing regressions appear then.
- After changing the `description`: run the trigger set.
- After adding a rule. `false-positive-resistance` must stay at zero findings; a new finding there means the rule is over-applied.

## Fixtures

- `review-target.luau` has four real defects: an unvalidated remote argument, a per-player table with no removal path, `wait()`, and a private balance published through an attribute. It also has style deviations that must come back as Advisory.
- `correct-but-odd.luau` is correct code that looks wrong: a scheduled autosave loop, an allocation inside a `Touched` callback, a server-side bindable, a bare `WaitForChild` on `ReplicatedStorage`, and `pairs`. Each construct is covered in `false-positives.md`.
- `existing-project/` is a small project with its own conventions (`--== SECTION ==--` headers, camelCase publics, Moonwave `---` comments, a central `Loader`, a `stylua.toml`) and two deliberate conflicts with the runtime rules for the agent to raise.

## Add a scenario

Add scenarios from real failures seen in use, not invented ones. The suite is most useful when it tests failures that actually happened. Keep each `expected_behavior` line observable in a single response.
