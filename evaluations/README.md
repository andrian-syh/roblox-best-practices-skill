# Evaluations

Five scenarios that check whether the skill still does its job. They exist because
[Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
treats evaluations, not the prose, as the source of truth for skill effectiveness.

There is no built-in runner. Run them by hand, or wire them into whatever harness you use.

## How to run one

1. Start a fresh session with the skill installed and nothing else in context.
2. Paste the scenario's `query` (and attach its `input_files` if it has any).
3. Score the response against every line of `expected_behavior`: met / partially met / missed.
4. Record the misses. A miss is a skill defect until proven otherwise.

## What to run them against

Run the full set on **every model you intend to use the skill with** — guidance that
reads as sufficient on a stronger model often turns out to be under-specified on a
faster one, and content that a stronger model finds redundant is worth trimming.

## When to run them

- Before releasing a version bump.
- After moving content between files, which is when routing regressions appear.
- After adding a rule, to confirm it did not raise the false-positive rate:
  `false-positive-resistance` is the canary for that and should stay at zero findings.

## Fixtures

`fixtures/` holds the inputs the scenarios reference:

- `review-target.luau` — four real defects (unvalidated remote argument, per-player table with
  no removal path, `wait()`, private balance published through an attribute) alongside style
  deviations that must come back Advisory rather than as violations.
- `correct-but-odd.luau` — code that is correct as written and looks wrong: a scheduled autosave
  loop, an allocation inside a `Touched` callback, a server-side bindable, a bare `WaitForChild`
  on `ReplicatedStorage`, `pairs`. Every construct is carved out in `false-positives.md`.
- `existing-project/` — a small project with its own conventions (`--== SECTION ==--` headers,
  camelCase publics, Moonwave `---` comments, a central `Loader`, a `stylua.toml`) plus two
  deliberate conflicts with the non-negotiables for the agent to surface.

When a real failure shows up in daily use, add it here rather than inventing a new one: the
suite is worth most when it tests the failures that actually happened.
