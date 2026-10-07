# Diagnosis — From Symptom to Confirmed Cause

The loop for a reported symptom whose cause is not yet known, and the Roblox-specific reasons a defect hides. This
file is read when the symptom does not fall cleanly into one area, when the first hypothesis
fails, or when the report cannot be reproduced.

Everything here stops at the cause. The fix belongs to the authoring skill, and the judgement of
existing code to the review skill.

## Contents

- [Classify the symptom first](#classify-the-symptom-first)
- [The four questions that come before any file](#the-four-questions-that-come-before-any-file)
- [Narrowing the surface](#narrowing-the-surface)
- [Environments that fake a defect](#environments-that-fake-a-defect)
- [Intermittent means a race, a yield, or a retry](#intermittent-means-a-race-a-yield-or-a-retry)
- [Data symptoms](#data-symptoms)
- [Impossible states are usually inputs](#impossible-states-are-usually-inputs)
- [When it cannot be reproduced](#when-it-cannot-be-reproduced)
- [Stop conditions](#stop-conditions)


## Classify the symptom first

Five classes. The class decides which question is worth asking next, and asking the wrong one
first is where most of the time goes.

| Class | Looks like | First move |
|---|---|---|
| **Wrong value** | A number, flag, or text is not what it should be | Find who last wrote it, not who read it |
| **Missing or duplicated action** | Something happened zero times or twice | Count connections before reading logic |
| **Timing** | Works sometimes, or works on the second try | Look for a yield between a check and its use |
| **Environment-only** | Works in Studio, fails live, or the reverse | Compare the two environments before the code |
| **Impossible state** | The game reached a state the rules forbid | Assume an untrusted input until shown otherwise |

A report often carries a conclusion rather than an observation. "Data resets" is a conclusion;
"the coin count showed zero after rejoining" is an observation. Convert it before classifying,
because the conclusion may already contain the wrong hypothesis.


## The four questions that come before any file

Answer these before opening code. Each one eliminates a large part of the search space, and
each is cheap.

1. **Which side owns this state?** Server-owned state that a client observes has one failure
   mode; client-owned state the server trusts has a different one. A value that both sides
   write is a defect by itself.
2. **Does it replicate, and when?** Replication is not instant and not ordered relative to
   script execution. A read that happens before the value arrives sees the old one, and the
   symptom is a wrong value rather than a timing complaint.
3. **Could a client have caused this?** If yes, the search moves from logic to validation. See
   [Impossible states are usually inputs](#impossible-states-are-usually-inputs).
4. **What changed?** A defect that appeared has a cause that arrived. When nothing in the place
   changed, something outside it did: an engine release, a library update, a player count, or a
   device class that was never exercised before.

Question 4 has a corollary worth stating: when the answer is "nothing changed", the defect is
old and the *trigger* is new. Look for what is newly reaching the path, not for a new bug in it.


## Narrowing the surface

Halve the search space per probe rather than reading everything at once.

- **By side.** Reproduce with the server doing nothing, then with the client doing nothing.
  Whichever half still fails owns the defect.
- **By path.** A structured print at the entry and exit of the suspect path costs one edit and
  removes half the candidates. Emit something greppable, not a bare value.
- **By input.** Feed the path a value known to be safe. If the symptom persists, the input is
  not the cause.
- **By time.** A defect that appears only after a while is a leak, an accumulating table, or a
  retry loop that never terminates. Measure the quantity over the session rather than reading
  the code that allocates it.

One change per probe. Two edits at once produce a result that cannot be attributed to either,
and the honest response is to run both again separately.

Probes are temporary. Every print, tag, attribute, and test instance added to observe is removed
before the diagnosis is reported. A probe left behind becomes someone else's defect.


## Environments that fake a defect

The most expensive diagnosis is one aimed at a defect that does not exist in the environment
where it was reported. Each of these differs from a live server in a way that hides or invents
failures.

| Environment | What it changes | What it hides or invents |
|---|---|---|
| Play Solo | Separate client and server simulations, one player | Defects that need a second player: ownership disputes, replication order between clients |
| The Edit context | A separate VM from the running game | State the game holds; results that do not carry over |
| Play mode in Studio | Changes are discarded when it stops | A fix that appears to work and was never saved |
| Studio on a developer machine | Higher frame rate, no network latency unless the Network Simulator adds latency, jitter, and loss | Races that only lose on slow devices or slow links |
| A single client | No second peer to disagree | Ownership, replication order, and streaming defects |

Before treating a Studio observation as evidence about the live game, say which of these applies.
How to drive each one is in [verification.md](verification.md) and [studio-mcp.md](studio-mcp.md); what they distort belongs
here.


## Intermittent means a race, a yield, or a retry

Logic that is correct when read line by line, and wrong sometimes at runtime, is almost never
wrong logic. Three causes account for most of it.

- **A yield between a check and its use.** Anything that waits gives the world time to change.
  The player can leave, the instance can be destroyed, and the session can end between the
  guard and the statement it was guarding. Re-validating after every yield is a standing rule;
  the shapes it protects are in [patterns/lifecycle.md](patterns/lifecycle.md).
- **A race between two writers.** Two scripts, or two servers, writing the same state without
  an owner. The symptom is a value that is correct most of the time, which is what makes it
  survive testing.
- **A retry that is not idempotent.** The first attempt succeeded and reported failure, so the
  second ran too. This produces duplicates, which read as a logic defect and are not one.

Frequency is evidence. Something that fails one time in ten is a different cause from something
that fails one time in a thousand, and the report should carry the number when it is known.


## Data symptoms

Persistence has its own failure modes, and they present as ordinary defects.

- **Reset to default** — a read failed and the failure policy substituted a fresh profile
  instead of refusing to load. What happens after the last retry is a design decision, and
  reading zero as "new player" is the most damaging version of it.
- **Rolled back** — a write was lost, or a stale server wrote last. Session ownership is what
  prevents this, not save frequency.
- **Duplicated across servers** — the same identity is live in two places. The state is not
  wrong; the ownership is.
- **Lost on shutdown** — the flush on close did not complete, or was never wired.

The patterns behind each, including per-owner locking and the failure policy that must be
stated rather than defaulted, are in [patterns/data.md](patterns/data.md). Platform ceilings
that produce the same symptoms under load are in [limits-budgets.md](limits-budgets.md);
grep the row rather than reading it whole.


## Impossible states are usually inputs

When the game reaches a state its rules forbid, the first hypothesis is not that the rule is
wrong. It is that something reached the rule from outside.

Ask in this order:

1. **Did a client send this?** Any value crossing a remote is attacker-controlled, including
   values a legitimate client would never send. A remote that trusts its arguments produces
   exactly this symptom.
2. **Did a client send it faster than intended?** Rate is a validation dimension. A call that is
   safe once is not safe a thousand times a second.
3. **Did the client own the instance?** Ownership is per-instance, and a client that owns an
   assembly can move it in ways the server will accept as physics.
4. **Only then, is the rule itself wrong?**

Free items, impossible positions, negative currency, and progress that skips a step are the
usual shapes. The validation depth each needs is in [security.md](security.md), and what the
server must own rather than accept in
[server-authority.md](server-authority.md).

Reporting an exploit as a logic defect sends the fix to the wrong layer: a guard is added at
the call site, and every other caller of the same remote stays open.


## When it cannot be reproduced

An unreproduced defect is not a failure of the diagnosis. It is a result, and it has a correct
report: what was tried, what it ruled out, and the one observation that would settle it.

What to reach for before giving up:

- **Widen the environment, not the code.** A second client, a slower device, a real server.
  The environment table above lists what each adds.
- **Ask for the missing half of the observation.** Frequency, timing, device, player count, and
  whether it survived a rejoin are usually absent from the first report and usually decisive.
- **Read what the live game already recorded.** The Analytics **Error Report** keeps client and server errors with stack traces and filters to errors new since a place version; the Developer Console **Luau Heap** snapshots, compared over time on client or server, show what still pins an unparented instance in a live session.
- **Observe without editing.** A Studio **logpoint** logs values without pausing or changing code, and **Trigger At** limits it to Client, Server, or Edit, so it leaves nothing to remove.
- **Add the observation to the game rather than the guess.** Structured logging on the suspect
  path turns the next occurrence into evidence. This is the honest answer when the symptom is
  rare, and it is cheaper than a speculative fix that cannot be verified either.

Never close an unreproduced report with a speculative change. A fix that cannot be shown to
work also cannot be shown to have failed, and it will be trusted anyway.


## Stop conditions

The diagnosis is done when all four hold:

1. The failing path is named — file, function, and the line where the wrong value or wrong
   action originates.
2. There is evidence, not inference. Something was observed failing, or the input that produces
   the failure is known.
3. The conditions are stated: what has to be true for it to fail, and why it does not fail
   otherwise.
4. Every probe added along the way has been removed.

Anything short of that is reported as unconfirmed, with the probe that would confirm it. Then
the fix is handed to the authoring skill, and the finishing gate in
[review-checklist.md](review-checklist.md) applies to the work that follows.
