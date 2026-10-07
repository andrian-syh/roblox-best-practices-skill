# Team Workflow — Git, Branch Places, and Shipping

Working with other people on one Roblox project, with the code in git and the world in a place file. [external-editors.md](external-editors.md) covers the sync tools themselves; this file covers the process around them. A solo developer who wants the same discipline reads it the same way — every rule here holds at a team of one, and the ones about coordination simply cost nothing.

## Contents

- [What the official guidance does and does not say](#what-the-official-guidance-does-and-does-not-say)
- [Draw the ownership line first](#draw-the-ownership-line-first)
- [The daily loop](#the-daily-loop)
- [What git cannot merge](#what-git-cannot-merge)
- [Rewriting history](#rewriting-history)
- [Branches, places, and how they map](#branches-places-and-how-they-map)
- [The review gate](#the-review-gate)
- [Shipping](#shipping)
- [When a credential reaches the repository](#when-a-credential-reaches-the-repository)
- [Onboarding a new member](#onboarding-a-new-member)
- [Failure modes worth naming](#failure-modes-worth-naming)
- [Where the evidence stops](#where-the-evidence-stops)

## What the official guidance does and does not say

Three facts set the boundary of everything below, and stating them prevents the most common wrong assumption — that some supported integration exists and the team merely has not found it.

**Roblox endorses the file-first route.** Its own third-party tools page names Rojo for teams managing a project as local files, Script Sync for a lighter setup, Rokit for pinning tool versions across a team, Wally for dependencies, and git through GitHub, GitLab, or Bitbucket for review and history. It also says plainly that none of those tools are maintained by Roblox and can stop working at any time, and that there is no lock-in.

**Team Create and git do not know about each other.** The collaboration documentation describes no external version control integration. Nothing in Team Create reads a branch, and nothing in git sees a Team Create session. Two systems of record run side by side, and keeping them coherent is the team's job, not a feature.

**The recommended team shape is documented; its procedure is not.** Rojo names two workflows — *partially managed*, where Rojo owns the scripts and Team Create owns everything else, and *fully managed*, where Rojo owns the whole game and hermetic builds and continuous deployment become possible. Both sections are still `TODO`. The one concrete sentence they carry is the important one:

> it is generally recommended that each programmer on a project have their own place to work in

That sentence is the origin of the branch-place habit. The steps that make it work are community practice, and this file labels them as such wherever they are not documented.

## Draw the ownership line first

Before any process question, answer this one: **for each tree in the DataModel, which side is the source of truth?**

| Tree | Owner in a partially managed setup |
|---|---|
| `ServerScriptService`, `ReplicatedStorage` modules, `StarterPlayerScripts` | git |
| `Workspace` geometry, lighting, terrain | the canonical place |
| UI instances under `StarterGui` | usually the place, sometimes git |
| `RemoteEvent` / `RemoteFunction` / `BindableEvent` objects | whichever side the team names, in writing |
| `Packages` from Wally | git, regenerated, never edited |

The line is per-tree, never per-person. Two people working the same tree from opposite sides is the failure, regardless of which branch either is on.

**Remote objects are where teams get hurt.** Code needs them, they are not scripts, and Rojo does not carry them in a partially managed project. Two workable answers, and picking one and writing it down matters more than which:

- **Create them from code.** A server module builds every remote it owns under a known folder at startup. They then live in git for free, because the code that makes them is in git.
- **Keep them in the place, named in a manifest.** A single module lists every remote name the code expects, and a startup assertion fails loudly when one is missing rather than erroring at first use.

The second is what most existing games do; the first is what removes the coordination cost entirely. Either beats leaving it implicit ([patterns/network.md](patterns/network.md)).

## The daily loop

The shape below is community practice built on the branch-place recommendation. It assumes partially managed Rojo, which is the setup most existing games adopt.

**Before touching a script:**

1. `git pull` on the branch you are about to work in. Do this before Studio is open, not after — a sync session running against a stale working tree writes stale code into your place.
2. `rokit install`, then `wally install`, whenever the manifests changed in what you just pulled. A branch that bumped a dependency and a machine still on the old one produce a bug that belongs to neither.
3. Refresh your branch place from the canonical place if the world changed. A branch place is created once, through **File**, then **Publish to Roblox As…**, choosing the experience and **Add as a new place**; refreshing it afterwards means opening the canonical place and saving it over yours.
4. `git lfs locks` before opening any tracked binary — a place file, a model, an image. Someone else holding it means coordinate now, not discover at save time. Take your own with `git lfs lock <path>`, release it when you push.
5. Start the sync server, connect the plugin, and confirm the direction of the first sync before accepting it. The first sync after a pull is the one that overwrites.

**While working:** one person per script. Studio's own documentation warns that two people syncing *and* editing the same script will overwrite each other, and no tool in this space resolves that for you. Split by file, not by feature, when two people must work the same system at once.

**Before stopping:** commit the scripts, push the branch, and note anything you changed in the place that is not in git. That note is the only record of it. Skipping it is how a UI change that a feature depends on reaches nobody.

**The step that is easy to skip and costly to skip:** run the project's static checks over what you touched before you push.

```
selene src
stylua --check src
```

Wire them as a pre-commit hook so it is not a habit anyone has to keep. The [roblox-optimum](https://github.com/andrian-syh/roblox-optimum) plugin adds a checker for this skill's own rules, when installed.

## What git cannot merge

**Place files do not merge.** `.rbxl` is binary. `.rbxlx` is XML, but it carries referent identifiers and instance ordering that change on every save, so a textual merge produces a file that opens and is wrong. Git LFS stores large place files without bloating history; **it does not merge them.** A conflict on an LFS-tracked place surfaces as a pointer conflict, and resolving it means picking one whole file and discarding the other.

The consequence is structural, not a matter of discipline:

- **A place file has exactly one writer at a time.** Not one per branch — one, full stop.
- **Branching is a property of the code, never of the world.** Two branches of scripts are ordinary. Two branches of a place is a fiction that ends in someone's work being thrown away.
- **The canonical place is a serialized hand-off, not a shared document.** Whoever last saved it is the version everyone else pulls from.

**Make the single writer a lock rather than an agreement.** Git LFS carries a locking API for exactly this case, and it is the only mechanism in the git side of this stack that enforces what the paragraph above only asserts. Tracking a pattern as lockable both stores it in LFS and marks it:

```
git lfs track "*.rbxl"  --lockable
git lfs track "*.rbxlx" --lockable
git lfs track "*.rbxm"  --lockable
```

A lockable pattern in `.gitattributes` makes matching files **read-only on every clone until someone locks them**, which turns "I forgot you had it open" into a file that will not save. One holder at a time, only the holder can release it, and the release belongs with the push. `git lfs locks` answers who holds what before anyone opens Studio, which is why the daily loop checks it.

This is the same answer the rest of the game industry reached for binary assets, and Unreal teams apply it to `*.uasset` and `*.umap` identically. It does not merge anything — nothing merges these files — it only stops two people from producing two versions that cannot be reconciled.

**Non-script changes have no automated path back.** This is the unsolved problem of partially managed Rojo, and it is worth stating rather than working around silently: a programmer who edits UI or adds an instance to support their code has no supported way to merge that back to the canonical place. One team's attempt at automating it with a place-combining step in CI was abandoned as impractical — the round trip of change a property, trigger the job, wait, reopen the place was slower than doing it by hand, and the job's usage limits made it worse. The question has been asked again since and still has no answer.

Live with it deliberately:

- Keep the number of non-script changes a programmer needs as close to zero as the ownership line allows. This is the real argument for building remotes from code.
- When one is unavoidable, it becomes a request to whoever owns the canonical place, with the branch name attached, not a change the programmer makes twice.
- Never let a feature branch depend on a place change that has not landed in the canonical place. That branch cannot be tested by anyone else.

## Rewriting history

A commit is immutable. Editing one — amend, rebase, squash, filter — does not change it; it builds a replacement with a different hash and leaves the original orphaned. Everything below follows from that one fact, and none of it is Roblox-specific, which is why it is easy to leave unstated on a game team and expensive the first time it bites.

Git's own documentation states the rule without hedging:

> Do not rebase commits that exist outside your repository and that people may have based work on.

Rebasing published commits abandons them for new ones, so a teammate who pulls gets your work twice — once as the commits they already had, once as their replacements — and the conflict that follows is between a branch and itself. The safe half of the same advice: clean up local commits by rebasing **before** the first push, never after.

Three rules that carry the whole of it:

- **`git revert`, never `git reset`, for anything already pushed.** A revert is a new commit that undoes an old one, so history stays intact and everyone's clone agrees. This is also the git-side equivalent of the place-restore caveat under [Shipping](#shipping): both undo forward rather than erase.
- **`--force-with-lease` if a force is genuinely needed, never bare `--force`.** The lease refuses when the remote moved under you, which is the case where a bare force silently destroys someone's push. Confine it to a branch that is yours alone and that nobody has based work on.
- **Protect the branch that maps to production.** No direct pushes, no force pushes, no deletion, CI green as a merge condition. The branch that publishes the start place should be no easier to overwrite than the place itself.

**Keep branches short and few.** The evidence for this is the DevOps Research and Assessment program's, measured across years of delivery data: teams doing well on delivery and stability keep fewer than three active branches and merge them in under a day. On a Roblox team the reason is sharper than the general one. A branch's place is a copy of a world that keeps moving; a week-old branch is a week-old world, and the cost of that divergence is paid in a refresh that discards work rather than a merge that keeps it. Split the work, or hide it behind a flag, before splitting the branch for a week.

## Branches, places, and how they map

Two independent hierarchies. Keep the mapping explicit; teams that leave it implicit publish the wrong thing eventually.

| Git | Roblox place | Who writes it |
|---|---|---|
| feature branch | the developer's own branch place | that developer alone |
| integration branch | a shared test place | CI, or one release owner |
| release tag | the production start place | CI only |

Community practice from a published pipeline: developers commit to a `dev` branch, a merge into `main` deploys to the staging place, and a version tag starting with `v` deploys to production. The branch names are a convention; the property that matters is that **the production place is written by exactly one automated path and by no human**.

Roblox's own place model supports this directly. An experience holds multiple places, one of which is the start place, and a new place is added through **Publish to Roblox As…**. A staging place inside the same experience shares the experience's data stores, so decide deliberately whether that is what you want — a staging place writing to live player data is a data-loss incident waiting for a bad deploy ([patterns/data.md](patterns/data.md)).

## The review gate

What must hold before a branch merges. Everything here runs without a human, which is the point — a gate a reviewer has to remember is a gate that lapses under deadline.

- **The linter and the formatter.** `selene` and `stylua --check`, both named on Roblox's own tools page.
- **The type check**, where the project runs the language server in CI.
- **The lockfile is honoured.** `wally install --locked` in CI, so a build cannot silently resolve a different dependency version than a developer had.

**Everything above reads the code without running it, which is the ceiling of a static gate.** Runtime tests in CI are reachable, and Roblox publishes the shape: [`Roblox/place-ci-cd-demo`](https://github.com/Roblox/place-ci-cd-demo) runs selene, then StyLua, then builds a place with Rojo, uploads it to a **dedicated test place**, and executes the suite there through the Open Cloud Luau Execution API before deploying. It assumes a fully managed project and a branch that maps to production — the same mapping the table above describes. Two facts about it are worth carrying even if the pipeline is not copied: **Luau Execution allows two concurrent requests per universe**, so jobs need a concurrency group or they fail on contention rather than on the code, and the demo's own Python wrappers are written for the demonstration and are stated not to be general-purpose clients. A test place inside the production experience shares that experience's data stores; give the runtime suite its own experience unless the tests are meant to write live player data ([patterns/data.md](patterns/data.md)).

Then the part that needs a person: read the diff against the standards the project has adopted, not against taste. [review-checklist.md](review-checklist.md) drives that reading, and [evaluation-matrix.md](evaluation-matrix.md) the whole-project version of it when a branch is large enough to need one.

**A review comment is not a merge blocker unless it names a rule.** Teams that skip this end up with review as a matter of who is most senior in the thread.

## Shipping

Publishing from CI uses Open Cloud. The endpoint is `POST /universes/v1/{universeId}/places/{placeId}/versions?versionType=Published`, authenticated with an `x-api-key` header, requiring the `universe-places` scope with write access on the target place. Send `.rbxlx` as `application/xml` or `.rbxl` as `application/octet-stream`.

**Five instance types are not updated by that API:** `EditableImage`, `EditableMesh`, `PartOperation`, `SurfaceAppearance`, and `BaseWrap`. A change to any of them reaches players only through a Studio publish. A pipeline that does not know this reports a successful deploy that shipped none of that work.

Three more facts about rolling back, all from Roblox's own documentation, all counter-intuitive enough to state:

- **Restoring a place version does not publish it.** The restore creates a new version; players keep seeing the old one until someone publishes.
- **A revert can be overwritten by an active editor's autosave.** Turn collaboration off before reverting, or the revert loses a race it never announced.
- **Autosave runs on two different clocks** — the place saves on one interval and scripts on another — so "nothing was saved yet" is rarely true and never worth assuming.

Version notes are required at publish and are the only durable record of what a release contained. Write them for the person doing the next rollback.

## When a credential reaches the repository

An Open Cloud API key, a `.ROBLOSECURITY` cookie, or a platform token committed by accident. This has a wrong first move that feels like the right one, so the order matters more than the tooling.

**Deleting it in a new commit does nothing.** The value stays in every clone, every fork, and every CI cache that ever fetched the repository, and it is one `git log -p` away for anyone who has read access now or had it once. A private repository is not a mitigation either; the set of people who can read it is larger than the set anyone can name.

1. **Rotate first, before touching git at all.** Revoke the old value, issue a new one, update the CI secret store. Treat the credential as public from the moment it was pushed, because the cleanup takes minutes and an automated scanner takes seconds. For `.ROBLOSECURITY` specifically this is urgent past the point of ordinary key rotation — it is a full account takeover and **a password change does not revoke it** ([external-editors.md](external-editors.md#rojo)).
2. **Then rewrite the history**, with `git filter-repo` or the BFG Repo-Cleaner. This is the one case where the rule against rewriting published history is outranked, and it stays a coordinated operation: everyone re-clones afterwards, and any branch based on the old history is rebuilt rather than merged.
3. **Close the path that let it in.** A `.gitignore` entry for the file's shape, and a secret scanner on the platform if one is available. The same file gets committed twice by default.

Nothing in this procedure recovers a leaked value. It only limits what the leaked value can still reach, which is why step 1 is not allowed to wait for step 2.

## Onboarding a new member

The whole setup, in the order that works:

1. Clone the repository.
2. `rokit install` — installs every tool at the version the project pins, from the manifest in the repository. Rokit supersedes Aftman and Foreman and reads their manifests unchanged, so an older project needs no migration to adopt it.
3. `wally install` — resolves dependencies against the committed lockfile, so the new machine gets the versions everyone else has.
4. Get Team Create access. Edit permission on a user-owned experience requires being a friend of the owner; a group-owned experience grants it by role instead, which is the reason serious teams are group-owned.
5. Create their branch place from the canonical place.
6. Connect the sync tool and confirm the direction before the first sync.

7. `git lfs install`, then `git lfs pull`, on any project that tracks place files or models. Without it the tracked binaries arrive as pointer text, the lockable ones are never made read-only, and the lock discipline in [What git cannot merge](#what-git-cannot-merge) silently does not exist on that machine.

**What belongs in git:** source, project files, `wally.toml`, `wally.lock`, the tool manifest, `.gitattributes`, CI configuration.
**What does not:** `Packages/` and `ServerPackages/` (regenerated by Wally), build output, `sourcemap.json`, Studio lock files, and any API key.

## Failure modes worth naming

Each of these has a symptom that points somewhere other than its cause. When one is suspected, [diagnosis.md](diagnosis.md) owns the narrowing.

| Symptom | Actual cause |
|---|---|
| A revert appears to work, then undoes itself | An active editor's autosave overwrote it; collaboration was never turned off |
| Two people's changes to one script keep vanishing | Both are syncing and editing the same file; no tool arbitrates this |
| A feature works for its author and nobody else | It depends on a place change that never reached the canonical place |
| A branch that passed CI breaks after merge | The lockfile was not honoured, or the branch place was stale relative to the world |
| A deploy reports success but the change is invisible | It touched one of the five instance types Open Cloud does not update |
| Attributes or tags on a script disappear | Script Sync ignores both ([external-editors.md](external-editors.md#studio-script-sync--the-official-one)) |
| A drafts setting refuses to change | Toggling Drafts Mode requires every collaborator to leave first |
| A pushed commit reappears after someone pulls | Published history was rebased; the old commits came back from a teammate's clone |
| Someone's push vanished with no conflict | A bare `git push --force` overwrote it; `--force-with-lease` would have refused |
| Two people saved the same place and one version is simply gone | No lock was held; place files do not merge, and nothing warned either of them |
| A CI job fails on Luau execution but passes on retry | Two jobs hit the two-concurrent-request ceiling for that universe |

## Where the evidence stops

Held apart on purpose, because a process recommendation that quietly mixes the two is how a team adopts a stranger's habit as a rule.

**Documented by Roblox or by the tool's own maintainers:** the ownership model of experiences and places, Team Create permissions and their friendship and role requirements, the autosave intervals, script version history and its revert caveat, the place restore behaviour, the Open Cloud endpoint and its five excluded instance types, the two-concurrent-request ceiling on Luau Execution and the pipeline shape in Roblox's own CI/CD demonstration, Script Sync's limits, Rojo's two workflow shapes and the one-place-per-programmer recommendation, Rokit's role and its compatibility with the managers it supersedes, Wally's lockfile guarantee, git's own rule against rebasing published commits, and Git LFS's locking behaviour for lockable patterns.

**Measured rather than documented:** the branch count and branch lifetime figures, which come from the DevOps Research and Assessment program's delivery data and describe a correlation across many teams, not a threshold any tool enforces. The reason they bind harder on a Roblox team — a branch place ages against a world that keeps moving — is this file's reasoning, not theirs.

**Community practice, working but unofficial:** the daily pull-then-refresh order, the three-tier branch and place mapping, the deploy-on-tag pipeline, and every convention here for handling remote objects.

**Unsolved by anyone:** merging non-script changes back from a developer's place into the canonical one. Treat any claim to have solved it as a claim to check, not a tool to adopt.

Two toolchain notes, because the most widely shared write-up of this pipeline predates both changes and is still linked as current: **Remodel is archived and deprecated in favour of Lune**, and **Aftman is superseded by Rokit**. A guide naming either as current is old enough that its other advice deserves checking too.
