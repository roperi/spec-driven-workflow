# Command and stage reference

The installed helper accepts these commands:

```text
node .sdw/sdw.mjs init WORK_DIR [--format normal|compact]
node .sdw/sdw.mjs start WORK_DIR OBJECTIVE [--format normal|compact]
node .sdw/sdw.mjs save WORK_DIR ARTIFACT < CONTENT
node .sdw/sdw.mjs check WORK_DIR ACTIVITY
node .sdw/sdw.mjs resume WORK_DIR
node .sdw/sdw.mjs reconcile WORK_DIR
```

`start` is the initialization primitive used by `sdw.workflow`: it creates a
new work directory and meaningful initial records from the user's objective,
preserving existing bytes. `init` remains the low-level template initializer
for callers that want to write the first artifacts themselves. The default
record shape is normal; `--format compact` creates `work.md` plus `next.md`
for genuinely small work, and a work item cannot silently change its record
shape on a repeated call — expansion is an explicit superseding decision.

`save` accepts the named Markdown artifacts `scope.md`, `spec.md`, `plan.md`,
`tasks.md`, `validation.md`, `retrospect.md`, `next.md`, `review.md`, and
`work.md`. It rejects traversal, absolute paths, symlinks, empty required
sections, and sections that still contain only template placeholders (a
literal TODO quoted in real prose is accepted). Writes use a sibling temporary
file and atomic replacement per file; multi-file saves are not transactional,
so save substantive artifacts before `next.md`.

The canonical stages and their helper checks:

| Stage (`sdw.*`) | Main files | Stop/check |
| --- | --- | --- |
| Start (`sdw.workflow`) | initial records + `next.md` | choose a work item and boundary |
| Scope (`sdw.scope`) | `scope.md` | `check WORK_DIR scope` |
| Specification (`sdw.spec`) | `scope.md`, `spec.md` | `check WORK_DIR spec` |
| Plan (`sdw.plan`) | `scope.md`, `spec.md`, `plan.md`, `next.md` | `check WORK_DIR plan`; stop if planning-only was requested; no `tasks.md` required |
| Tasks (`sdw.task`) | plan files + `tasks.md` | `check WORK_DIR task` |
| Implement (`sdw.implement`) | planning files, `next.md` | one authorized unit, then checkpoint evidence |
| Validate (`sdw.validate`) | planning files, `validation.md`, `next.md` | `check WORK_DIR validate` |
| Review (`sdw.review`) | `review.md` plus evidence | pre-publication review; records context `self`/`fresh`/`independent` |
| Publish (`sdw.publish`) | validation + review evidence | actual applicable authority required |
| Finalize (`sdw.finalize`) | tasks, validation, `next.md` | actual delivery reconciliation |
| Retrospect (`sdw.retrospect`) | all relevant records | evidence-based process retrospective |
| Wrap (`sdw.wrap`) | closure record | `check WORK_DIR wrap`; `next_agent: none` + `status: complete` for honest closure |

SDW follows a **default change flow**: an agent must never push the default branch
directly — an unconditional prohibition that no project policy overrides. Unless
the project declares a different change flow, a **project change** (a change to
the project's tracked product, content, tooling, or shipped surfaces) lands on a
feature branch and stops at a pull request for the human to merge. The session's
own SDW **bookkeeping records** are not project changes and are exempt from that
required route; the project's bookkeeping/change-flow policy governs how they
land, and they still may never be pushed directly to the default branch. The
default branch is resolved from `origin/HEAD`, falling back to a local `main` or
`master`; if it cannot be determined the session does not guess and acts
conservatively. A brand-new remote with no default branch yet is the initial-seed
case: the agent follows a documented bootstrap path only when it does not require
a direct default-branch push, and otherwise stops and requests the project- or
human-owned initialization before resolving the established default branch and
continuing. No bootstrap path authorizes a direct push to the default branch. A
documented project change-flow policy — in project context
(`.sdw/project-context/`), the repository's contribution guidance, or an
equivalent project-owned document the session reads before acting — may replace
the default landing route, but it cannot authorize a direct push to the default
branch. The rule binds every responsibility that commits, pushes, or opens a pull
request. Merge and publication remain explicit, separately authorized human
actions. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md).

`sdw.review` is the **pre-publication** review: it records the review context
(`self`, `fresh`, or `independent`) and a ready/not-ready conclusion, and its
`review.md` is frozen once the work item is published, so later external findings
never append to it. External review of a published candidate is a separate, later
activity: the pull request is its system of record, the primary lifecycle session
owns requesting and addressing it under the user's direction, and a deferred,
declined, or escalated finding is recorded at item level (owner and trigger) and
is never auto-filed as a per-finding tracker issue. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md).

The retrospective is a **process retrospective**: `Outcome`, `What Worked`,
`Friction`, and a few bounded `Improvements` (each owned, with an explicit
trigger). Deferred product or technical work is out of it: route those items to
the issue tracker and/or `next.md`, which closure names as their destination.
Older records that still carry `## Follow-up` remain readable; the helper accepts
either `## Follow-up` or `## Improvements` and still requires one of them.

`next.md` records four required fixed fields (`work_id`, `record_format`,
`next_agent`, `status`) plus readable Agreement / Next action / Waiting on /
Work context sections. `next_agent` is one of the eleven bounded
responsibilities or `none`; `status` is one of `ready`, `waiting`, `reconcile`,
`complete`, or `abandoned`. `ready` means a local next responsibility is pending;
`waiting` records an external condition and its owner; `reconcile` records an
external action observable as complete that the record has not been reconciled
against, with its observed condition and evidence source; `complete` and
`abandoned` are terminal with `next_agent: none`, and `abandoned` records why the
work ended without completion or was superseded. Unknown or contradictory
metadata is reported, never silently mapped, and nothing is inferred from
approval-sounding prose; closure checks report unresolved blockers and pending
tasks.

A work directory keeps a clean top level: only the canonical artifacts in use
plus an optional `README.md`. Decision memos, findings, change tables,
superseded handoffs and raw logs belong under `evidence/` and are linked from
the canonical records by that path; `evidence/decisions/`,
`evidence/findings/` and `evidence/history/` are a suggested, non-mandatory
sub-layout. At wrap, durable knowledge a future unrelated task would need is
promoted to project-owned documents and linked from `validation.md` or
`retrospect.md`. `check` and `resume` print a non-blocking layout warning naming
stray top-level files, capped at ten names; it never changes an exit status or
the authorized read set. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), installed as
`.sdw/agents/shared/workflow.md`.

`next.md` also accepts one optional fixed field, `closure`, whose closed values
declare the completion path: `full` (the default when absent), `planning-only`,
`parked`, `interrupted`, `superseded`, or `abandoned`. Normal completion is
proportional to that path: a `closure: full` normal record whose position has
passed the review or retrospect responsibility must carry `review.md` and
`retrospect.md`, while a declared exception (`planning-only`, `parked`,
`interrupted`, `superseded`, `abandoned`) bounds the endpoint and does not
require them. `parked` requires `status: waiting`; `interrupted` requires
`waiting` or `abandoned`; `superseded` and `abandoned` require `abandoned`.
Compact records bypass the closure contract. A missing
responsibility is reported with a diagnostic naming it (for example, `normal
completion requires review.md (the review responsibility) or a recorded closure
exception`), so a historical complete record that omitted an artifact is flagged
rather than silently passing; the migration is to add the artifact or record the
applicable closure exception. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), installed as
`.sdw/agents/shared/workflow.md`.

Records under `.sdw/work/` are committed on the work item's own branch and pull
request by default, so their handoff survives checkout, branch, and worktree
changes. Intentional untracking is a committed repository `.gitignore` decision,
not a per-record reason and not a checkout-local, global, or uncommitted exclude:
an untracked work directory that a committed repository `.gitignore` does not
ignore fails closure regardless of any `durability` reason, while a directory
ignored by a committed repository `.gitignore` is reported as intentionally
untracked and does not fail. The default is therefore not silently permissive.
`next.md` accepts three optional durable-continuity references: `branch` (the
branch where the work item's copy lives), `candidate` (the exact candidate
commit), and `durability` (an optional reason documenting a work directory
intentionally untracked under a committed repository `.gitignore`). A
read-only durability assessment in `resume` and in the `handoff`, `finalize`, and
`wrap` checks inspects the work directory's
enclosing Git repository and reports an untracked work directory, a
recorded candidate that is unreachable from every local branch and remote (or
absent from the repository), a recorded branch the current checkout cannot see,
and a recorded branch that does not contain the work item, naming the condition,
the evidence source, the owner, and the next responsibility. A resolving
reference still makes an untracked work directory durable; a work directory
outside Git control is reported as unknown and does not fail. The assessment is
read-only: it never fetches and never mutates records, refs, or remotes, and it
never grants commit, push, merge, closure, or publication authority. The fields
are optional, so existing records remain readable, and the exact rule lives in
the [shared workflow instructions](../agents/shared/workflow.md).

`reconcile WORK_DIR` is a read-only terminal-state check. It reports the
reconciliation outcome (externally blocked, awaiting reconciliation, complete,
abandoned, or external state unknown), the observed local Git condition, the
evidence source, and the next responsibility; `resume` reports the same. It
never fetches, mutates records, branches, remotes, or issues. Local Git ancestry
is local evidence only and does not prove a remote PR merge or GitHub issue
closure; unknown, inaccessible, or absent remote state stays explicitly unknown
and fails closed, and reconciliation never grants merge, closure, or publication
authority. A record written before an external action completed moves from
`waiting` to `reconcile` and then to `complete` or `abandoned` once reconciled.

Compact work uses `work.md` (purpose/boundary, intended result, approach,
actions/progress, checks/results, outcome/lessons) plus `next.md`; expand to
normal records only through an explicit superseding decision, keeping one
mutable authority.

## Delegation and repair handoffs

Before releasing delegated implementation, the planning/task owner assesses the
material decisions and coupled reasoning still left to the implementer and either
resolves them, bounds a smaller coherent vertical unit, or records why ordinary
implementation discretion suffices; a task ID, cohesion group, file count, or
many AC/V references is not by itself delegation fitness. A blocking finding or
failed validation states the original obligation, the reproduced failure, the
expected result, and the finite completion evidence. Route by cause: an ordinary
concrete defect against an unchanged contract returns to implementation; a missing
design or delegation decision returns to the planning/task owner; a
contradictory, stale, or infeasible verification returns to its author or the
planning owner; a new requirement returns to scope/spec. Preserve observation
strength — an invalid invocation, a missing capability, or an unrelated error
does not establish intended rejection or positive success. Before another repair
handoff, compare the evidence for the same underlying obligation; recurring
absence, an adjacent invariant escape, or an apparent resolution resting on
invalid evidence triggers lifecycle-owner reassessment and a changed handoff,
while a genuinely new bounded defect may still return directly to implementation.
Existing records carry the requirement and rationale, prior attempts and
evidence with their limits, unresolved decisions and owners, the candidate,
authority, and the exact next action so a fresh model or harness can continue;
`next.md` points to those records rather than duplicating them. The same owner
may resolve implementation, planning and verification responsibilities: a role
name is not a requirement to restart or ask again, and a user-chosen stage stop
or harness/model change is a supported continuation from the durable records. No
command, retry, or execution allowance is invented, and an evidence-driven rerun
needs no budget-extension request. The rule is
proportional and adds no required field, schema, ledger, stage, or automatic
reviewer. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), installed as
`.sdw/agents/shared/workflow.md`.

## Early demonstrable value and material decisions

SDW keeps the whole intended outcome explicit while choosing the earliest safe
useful observable checkpoint within it. That first useful demonstration — a small
working path, a necessary safety proof, an exercised infrastructure boundary, or
an inspectable documentation result — is not automatically final acceptance.
Scope and plan state the first observable result and its recipient, the important
real dependency or uncertainty it exercises, the prerequisites required with
their evidence, and the breadth deliberately deferred; a small complete path is
ordered before independent breadth, and early delivery never waives a safety
prerequisite. Implementation compares evidence with the next observable checkpoint and
changes the diagnosis, decomposition, or approach under the existing recurrence
rules rather than repeating the same repair. Validation and review assess the
actually demonstrated behavior, the necessity of the prerequisites, and the
unresolved real boundaries, keeping simulations, automated checks, real service
acceptance, and human demonstrations distinct.

Before a material decision — one that changes material cost, deployment, safety,
scope, or ongoing operational burden — the user receives a plain-language
explanation of the outcome, exclusions, operational prerequisites and their
ongoing burden, the simplest credible alternative, the risks and effort
uncertainty, and the effect on time to first value. The rationale and the trigger
that would reopen the decision are recorded in the existing records, and an
earlier blanket approval is neither evidence of comprehension nor authority for
unagreed expansion. Human-facing reports, `next.md`, and handoffs name the
user's exact next action — or that no action is needed — in plain language. The
exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), installed as
`.sdw/agents/shared/workflow.md`.

## Project context

Project-owned context lives in `.sdw/project-context/` and is reused across work
items rather than copied into each one. Two files are conventional:

- `constitution.md` — durable development law governing how specifications
  become code, not operational procedure or product policy: a preamble and a
  small set of project-specific, checkable articles in MUST/MUST NOT/SHOULD
  form, plus enforcement and amendments. It constrains every scope,
  specification, plan, implementation, validation, and review. Commands, stack,
  boundaries, and data handling belong in `technical-context.md`; product
  direction belongs in the roadmap or product docs.
- `technical-context.md` — the current technical orientation: project and stack,
  repository map, authoritative commands, environment and tooling, and hard
  boundaries.

The installer projects guidance templates to `.sdw/templates/constitution.md`
and `.sdw/templates/technical-context.md`. The constitution template follows the
Spec-Kit convention of a preamble plus numbered, checkable articles and states
that the constitution governs how specifications become code, not operational
procedure or product policy; operational detail goes to `technical-context.md`
and product direction to the roadmap or product docs. The technical-context
template carries a greenfield note so a brand-new project records what is
decided and marks the rest open rather than inventing commands. Both require
every placeholder and guidance comment to be replaced with project-specific
content. When useful context is absent for first non-trivial work, hardened, or
cross-cutting work, `sdw.workflow`/`sdw.scope`
elicit the minimum and record it here; trivial bounded changes are exempt. When
the user defers, the assumed conventions and invariants are recorded as a context
posture in `scope.md` under Constraints. `.sdw/project-context/` is user-owned:
install and update never create or modify it. The exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), which are installed
as `.sdw/agents/shared/workflow.md`.

## Assurance profiles

Normal work records one explicit assurance profile in `plan.md` under an exact
`## Assurance` heading:

```text
Assurance profile: standard
```

or

```text
Assurance profile: hardened
```

The value is exact and case-sensitive; surrounding ASCII whitespace is ignored.
Compact work skips assurance. A normal plan saved without an exact declaration
keeps the current structural behavior and is not required to add hardened
fields. There is no record marker that can distinguish an intentionally removed
declaration, so the plan template, the planning prompt, and semantic review own
that limitation.

`standard` is the default experience and keeps the concise task and validation
shapes. `hardened` is an explicit choice for safety-boundary work and activates
stable `AC###`/`V###` traceability, the eight-field hardened plan and cohesion
groups, mapped tasks with a negative-space readiness audit, and one validation
result per `V`. Hardened `tasks.md` and `validation.md` repeat `Assurance
profile: hardened` and must match the plan.

The hardened gates are progressive: `check plan` verifies the profile and the
hardened plan and specification; `check task` adds tasks, readiness, mappings,
and cohesion groups; `check validate` adds complete results and requires every
task checked with nonpending evidence. A passing hardened check appends the
structural-only disclaimer. The helper checks exact syntax, IDs, mappings,
required fields, declared oracle/status coherence, and summaries only. It never
judges prose or test truth, infers approval or independence, or executes project
commands. The installed [shared workflow
instructions](../agents/shared/workflow.md) own the exact grammar; this page
does not restate it.

For hardened cross-context work whose agreed assurance approach explicitly
chooses a protected verification seed, the
[shared workflow instructions](../agents/shared/workflow.md) additionally own a
verification seed convention: the seed is authored and observed red against the
exact production candidate before production edits, its paths and SHA-256
hashes are protected and verified read-only by each implementing context, and
review performs one bounded full-surface pass. A new test, hardened assurance,
or cross-context work alone does not require a separate author. This stays
transparent for ordinary and compact work.

Isolated parallel work uses separate Git worktrees with distinct work IDs and
their own mutable records; comparison and integration are separate
responsibilities that reference candidate artifacts and their shared input
revision. Operational work records batches, validated outputs, and
rejections, and ends at its authorized result without a forced PR lifecycle.

The helper reports what it can observe. The primary session supplies the
substantive content, user authority, external publication evidence, and
decision to continue.

## Resuming a work item

To continue elsewhere, resolve the work item before reading records. Given a
short identity — an explicit work directory, a work ID, or an issue reference —
consider only the direct work-item directories under `.sdw/work/` in the
checkout you are operating in (direct children such as `.sdw/work/<work-id>/`);
a direct-child listing or glob is an example, not a required platform API. An
explicit directory takes precedence but still has to reconcile. Discover them
with a single bounded listing or glob; do not run a recursive `find` or `grep`
for `next.md` across the checkout, and do not enumerate archive or evidence
trees or any retired layout to find candidates. Match by
evidence: the directory name, the direct `next.md` identity and context when
present, and then the actual Git/worktree. Records outside the direct work-item
directories — nested evidence copies, archived handoffs, and any retired layout
— are never candidate handoffs. Exactly one match is the work item; a matching
directory with no `next.md` is a missing-handoff blocker; no candidate, or more
than one plausible candidate, is an explicit identity question for the user —
never a guessed selection or an archive-wide search.

```bash
node .sdw/sdw.mjs resume .sdw/work/fix-login-timeout
node .sdw/sdw.mjs reads .sdw/work/fix-login-timeout
node .sdw/sdw.mjs check .sdw/work/fix-login-timeout handoff
```

Bounded recovery is an instruction to the agent, not an enforced read sandbox.
The native resume pilot still observed extra probing after an identity question,
framework inspection beyond the saved responsibility, and recursive work/evidence
enumeration. The helper's inventory does not prevent these actions, and the
observation does not establish reliable model compliance or improved efficiency.

The resume command is read-only. It reports Git context, record fields, the
named next prompt path, artifact availability, task progress, stop conditions,
detectable inconsistencies, and the authorized read set. The `reads` command
prints only that set: the current records plus the explicit paths those records
name, the next stage prompt, and the shared lifecycle instructions. A named
locator resolves against the work directory and the actual Git checkout root: an
explicit `./` locator is work-relative only, one distinct safe file resolves, two
distinct matches are an ambiguity diagnostic, and a symlinked path component or
no match is reported rather than silently dropped. The inventory is a positive
list, not an exhaustive grant of authority, so an explicit pointer a current
record names may be followed when the saved responsibility requires it without a
stop-and-ask gate. After
selecting the exact directory, read the current `next.md` and the records the
saved responsibility needs — current decisions, blockers, material rationale,
relevant prior failed attempts, and explicit source/evidence locators — and read
only those records and the paths they name: do not recursively enumerate the
selected work-item directory or its `evidence/` tree, and do not read archived
`next.md` copies (for example under `evidence/`) or any retired layout. Expand
into historical records only when a current pointer or an unresolved obligation
requires them. The recorded
`next_agent`, Agreement, Next action, Waiting on and Work context govern; a task
or validate handoff does not become implement, and agents repair knowable record
gaps through explicit saves and continue within the recorded agreement. A work
item may resume under a different harness or model than the one that recorded it.
A user-chosen stage boundary does not by itself withdraw authority from an
incoming session the agreement already authorizes to proceed, so the recorded
next responsibility is recovered from the records alone without the previous chat
or routine reapproval. The boundary cannot grant a stage the agreement has not
authorized: when the agreement ends at a stage whose next step awaits a decision,
that pending decision is recovered and waited on rather than treated as
authorized. The
exact rule lives in the
[shared workflow instructions](../agents/shared/workflow.md), installed as
`.sdw/agents/shared/workflow.md`.
