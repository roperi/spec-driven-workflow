# Shared SDW lifecycle instructions

This file is shared workflow content installed by SDW. It is not a selectable
agent; the sdw.workflow and sdw.resume entrypoints read it in their primary
session, and every sdw.* stage prompt applies the relevant part of it. Every sdw.* prompt reads the relevant part of its content in the same
primary session; a stage never requires spawning another agent process.

## Communication with the user

Every stage reports to the user in two layers, in this order: a plain summary,
then the technical detail. The plain summary comes first so a reader without the
project's technical background can follow the outcome and stop there when that
is all they need; the technical detail follows for readers and downstream agents
who need it. This is a reporting contract, not a style preference.

The plain summary is short (a few sentences) and uses ordinary language. It
avoids undefined jargon, acronyms, and internal terms; when a technical term
cannot be avoided, it is defined in plain words at first use. It states, in
plain language:

- what was done or decided, and the result the user can observe;
- what the user must know, review, approve, or decide next;
- each material decision, why it was made, and the alternative that was
  rejected;
- known risks, limitations, or open questions that could affect the user later.

The technical detail keeps the full precision the artifacts and downstream
agents need. The plain layer is added to the report; it never replaces a
technical record, and it never hides, softens, or omits a material decision,
risk, failure, or uncertainty. When the user asks for plain English or an
overview, answer with the plain summary first and add the technical detail only
as needed. Where an artifact is itself the thing the user must read or approve,
its plain statement accompanies it in the report rather than weakening the
artifact's required content.

## Progression loop

When you own a stage responsibility (sdw.scope, sdw.spec, sdw.plan, sdw.task,
sdw.execute, sdw.validate, sdw.review, sdw.publish, sdw.finalize,
sdw.retrospect, sdw.wrap):

1. Read the work item's `next.md` and the prerequisite records for your
   responsibility. Reconcile the saved context against the actual repository
   state before editing.
2. Perform that responsibility and save its named artifact. Report completion
   with enough evidence for another session to verify it.
3. Record the next responsibility explicitly in `next.md` (work_id,
   record_format, next_agent, status, plus the Agreement / Next action /
   Waiting on / Work context sections) and run the matching helper check.
4. When the primary lifecycle session (sdw.workflow) is running, continue by
   applying the next canonical instructions in this same session within the
   recorded agreement. Do not end the user session merely because a stage
   completed, and do not spawn a new agent for the next stage.
5. Stop only for a user-requested boundary or handoff, a material decision or
   missing prerequisite outside the agreement, or completed work. Failed
   checks prompt bounded repair inside the authorized scope.

## Direct bounded-stage invocation

A directly invoked stage prompt performs its requested responsibility, records
the next one, and stops. It does not gain broader delivery authority, and it
does not end a lifecycle session that invoked it in place: the lifecycle
session keeps control after the stage completes.

## Stopping and handoff

Record an explicit stop in `next.md` status (`waiting`) plus its condition and
owner, or as a precise instruction in the Agreement section when the outgoing
session must stop while the incoming session is authorized to start. Existing
authority persists across stages and fresh sessions; a newer explicit
review-only, plan-only, or other bounded instruction constrains only its own
session. A missing reply is never approval. Publication, merge, deletion of
alternatives, and migration of another project require actual applicable
authority beyond a generic request.

## Terminal state and reconciliation

`next.md` status is one of five closed values with distinct meaning:

- `ready` — the next responsibility is a local lifecycle stage; nothing
  external is awaited.
- `waiting` — externally blocked on a person, credential, service, or other
  condition outside the agent's authority. Record the condition and its owner in
  Waiting on.
- `reconcile` — an external action (merge, issue closure, publication) is
  observable as complete but the record has not been reconciled against it.
  Record the observed condition and its evidence source in Waiting on.
- `complete` — the work item reached its authorized endpoint with
  `next_agent: none`.
- `abandoned` — the work item ended without completion or was superseded, with
  `next_agent: none` and the reason recorded in Waiting on.

`waiting`, `reconcile`, and `abandoned` require a recorded condition or reason
in Waiting on. `complete` requires no unresolved Waiting on and no unchecked
task. `reconcile` is not terminal and requires a canonical next responsibility.

When a session resumes or finalizes a work item, reconcile the record against
visible state before trusting a `waiting` status. Run the read-only helper:

```sh
node .sdw/sdw.mjs reconcile .sdw/work/<work-id>
```

`resume` reports the same reconciliation. The result names the observed
condition, the evidence source, and the next responsibility. It is read-only: it
never mutates records, branches, remotes, or issues, and it never fetches.

Reconciliation is evidence, not authority. Local Git ancestry is local evidence
only: it does not prove a remote PR merge or GitHub issue closure. Unknown,
inaccessible, or absent remote state stays explicitly unknown and fails closed;
never guess completion. A reconciliation result never grants merge, closure, or
publication authority, and observing a changed external state never authorizes a
remote action. A record written before an external action completed is handled
explicitly: once the action is observed complete, move the record to `reconcile`,
then reconcile it to `complete` or `abandoned` with the observed evidence
recorded. A work item whose endpoint was a merge, issue closure, or publication
is not `complete` until a human with that authority confirms it or the record
carries the applicable external evidence.

## Saving checkpoints

Save substantive artifacts before `next.md`; `next.md` is written last as the
entry pointer. Saves are atomic per file, not a multi-file transaction. On
resume after an interruption, inspect actual results before retrying, never
overwrite partial edits, and never repeat an uncertain external action
blindly.

## Records

Normal work uses `scope.md`, `spec.md`, `plan.md`, `tasks.md`,
`validation.md`, `next.md`, and `retrospect.md` as each responsibility
occurs, with optional `review.md` or other linked evidence. Genuinely small or
bounded work may use the compact `work.md` plus `next.md` shape instead;
expand explicitly if the work grows, keeping one mutable authority. Do not
manufacture completed work to fill a template; honest pending or unresolved
sections are correct when they are true.

## Project context

SDW keeps project context reusable across work items rather than inside one:
product direction (or an equivalent README/initiative brief), a constitution of
durable principles, and technical context (stack, architecture, conventions,
commands, boundaries). Reuse existing project-owned documents by reference and
never copy their full text into `.sdw/work/`.

Before agreeing scope for a new work item, discover what exists: `README.md`,
`AGENTS.md`, `docs/`, an existing `.sdw/project-context/`, or an equivalent
conventions, architecture, or principles document. Prefer those over creating
new documents.

If useful context is absent:

- For greenfield or first work, hardened work, or cross-cutting work, elicit the
  minimum in plain language and record `.sdw/project-context/constitution.md`
  and/or `.sdw/project-context/technical-context.md`, using
  `.sdw/templates/constitution.md` and `.sdw/templates/technical-context.md` as
  shapes. A recorded constitution is durable project law governing how
  specifications become code, not operational procedure or product policy: a
  short preamble plus a few project-specific articles in MUST/MUST NOT/SHOULD
  form, then Enforcement and Amendments, with every article a checkable
  principle rather than a procedure. Direct operational detail (commands, stack,
  boundaries, data handling) to `technical-context.md` and product direction to
  the roadmap or product docs. Record technical context as the present-day
  stack, repository map, authoritative commands, environment, and hard
  boundaries. Keep each concise; replace all template
  guidance, placeholders, and TODO text with real content; do not invent a
  principle, command, or boundary the project has not established, and record a
  genuine unknown as an open question. For a brand-new project, record only what
  is actually decided.
- For a trivial bounded change in a repository whose conventions are already
  visible, do not create context for ceremony.

If the user declines or defers creation, record a short context posture in
`scope.md` under Constraints naming the conventions, invariants, and assumptions
the work relies on, and proceed only within that stated posture. Never claim a
principle or invariant that was not established. A missing context file is not
by itself an error once the posture is recorded.

`.sdw/project-context/` is user-owned: SDW reads it and may create it
deliberately, but install and update never modify it.

## External review consumption

When a published candidate receives findings from an external reviewer (human or
automated), consume them in the cumulative `review.md` before any re-invocation.
Record one `F###` entry per finding with origin, path/lines, claim, and the
reviewer's severity when supplied (advisory only). Give each exactly one outcome
with rationale and evidence: `applied`; `declined` with reproduced evidence and a
re-open trigger; `deferred` with owner and trigger; `duplicate of F###`; or
`escalated`. No finding is deleted and every outcome is re-openable.

Classify each finding material or immaterial. Material means it implicates an
`AC###`/`V###` route, the protected seed set, a safety, authority, or containment
boundary, a default-path regression, or a claim the contract makes; everything
else is immaterial. Only material repairs require a protected-byte re-freeze and
fresh re-verification; immaterial findings are batched. Reconcile new findings
against prior dispositions before repairing or re-invoking: a re-raise cites the
prior `F###` id and is `duplicate` unless it brings new evidence, which re-opens
the prior disposition without consuming a repair round.

A factual decline requires reproduced evidence. A semantic or design decline
about the judge or contract the implementing context authored is never
self-closed: leave it `open` (blocking the stop) or record it `escalated` to the
planning owner. No decline is permanent; re-opening needs no new authority.

A cycle stops when every posted finding has exactly one disposition, no material
finding is open, the latest completed full-surface pass added no new material
finding, and no protected or judge path has changed since that pass — or when the
authorized owner records a stop with rationale. Record the stop in `next.md` and
the `review.md` conclusion; it is never silent and is not a dismissal. After the
recorded pass budget with continuing new material findings, stop and escalate any
open material finding to the planning owner with a convergence assessment
instead of re-invoking again. The budget is a guidance value set with the
agreement.

For a work item carrying a protected verification seed or a claimed complete or
universal observation or comparison oracle, the fresh review names the judge's
central claim, exercises the observable (removing a claimed dimension makes the
oracle fail, or the claimed operations execute), records claim, method, observed
result, and verdict, and reports a claim establishable only declaratively as a
blocking finding or an explicit recorded limitation — never as accepted.

This convention uses existing Markdown, Git, and test facilities; it adds no
command, stage, artifact, required section, parser field, or default-path
requirement, treats human and automated reviewers alike, and names no provider.

## Progressive assurance

Normal work records an assurance profile in `plan.md` under an exact
`## Assurance` heading. The only authoritative declaration is one exact line:

```text
Assurance profile: standard
```

or

```text
Assurance profile: hardened
```

The value is case-sensitive and closed; surrounding ASCII whitespace is
ignored, and whitespace inside the label or value is not normalized. A
declaration anywhere else is ordinary prose. Compact work bypasses assurance
entirely. A normal plan with no exact declaration keeps the existing structural
behavior and gains no assurance checks. `standard` activates declaration syntax
and coherence only and adds no hardened fields. `hardened` activates every rule
below for each checked artifact that the activity already requires. Hardened
`tasks.md` and `validation.md` repeat `Assurance profile: hardened` under their
own exact `## Assurance` heading, and any repeated declaration must match the
plan. New normal work chooses one profile; the shipped plan template makes the
choice explicit.

Recommend `hardened` when the work touches filesystem containment or deletion,
symlinks, transactions, interruption or recovery, migrations, authentication or
private data, external mutation or publication, concurrency, or multiple
persisted projections. Uncertain safety-boundary cases resolve to hardened. The
user may override the proposed profile; a change from standard to hardened
returns to specification and task preparation until every hardened record is
complete. It is never an automatic classifier.

### Hardened identifiers and enums

Stable IDs are a nonzero three-digit suffix: `AC###` acceptance criteria,
`V###` verification cases, `T###` tasks, `G###` cohesion groups, and `N###`
readiness-audit defects. An ID list separates IDs with exactly `, `; its written
order matters for rendering but mappings compare as sets. Reference only
defined IDs. Definition lines have no leading indentation, child fields use
exactly two leading spaces, and evidence items use exactly four.

- Verification kind: `positive`, `negative`, `failure-injection`,
  `end-to-end`, `manual`, or `external`.
- Result status: `PASS`, `FAIL`, `BLOCKED`, or `SKIPPED`.
- Validation context: `self`, `fresh`, or `independent`.
- Validation summary: `PASS`, `FAIL`, or `BLOCKED`.
- Oracle match: `yes`, `no`, or `unknown`.

`TODO`, `TBD`, `FIXME`, and `pending` are not meaningful prose except where
`pending` is explicitly allowed.

The grammar is line-oriented and exact: headings, field labels, enum values, and
the em dash (`—`) are case-sensitive; newlines may be LF or CRLF; tabs are never
indentation. A definition line has no leading indentation, a child field uses
exactly two leading spaces, and an evidence item uses exactly four. Blank lines
may occur between complete entries but not within one entry. Each named hardened
section occurs exactly once, and outside fenced code blocks its nonblank content
must be the applicable productions; introductory prose belongs outside the
section. Definitions in prose, fenced code, or block quotes are not
authoritative. Only surrounding ASCII whitespace is ignored on declaration
lines.

### Hardened specification

Under `## Acceptance Criteria`, write `- AC### — condition`. Under
`## Validation`, write a `- V### — name` entry followed by exactly these
two-space child fields in order: `- Proves:` (an AC ID list), `- Kind:`,
`- Stimulus:` (fixture or precondition, action, and injected failure), and
`- Expected:` (the observable oracle, including the complete compared state
when preservation is claimed). Every AC has at least one V route and every
referenced AC exists.

### Hardened plan

Under the exact `## Assurance` heading, follow the declaration with these eight
ordered, nonempty fields: `Authoritative state`, `Mutation points`,
`Preconditions`, `Postconditions`, `Preserved invariants`, `Recovery states`,
`Unchanged-state comparison`, and `Known limitations`. `none` alone is not a
reason; state why a field does not apply. Under `## Cohesion Groups`, provide
one or more `- G### — shared invariant and group completion oracle` entries, or
one reasoned `- none — ...` entry, never both. Expand broad claims: `atomic`
needs a transaction boundary, mutation sequence, failure points, and permitted
residual state; `safe` needs a threat surface, rejected inputs, and a complete
unchanged-state oracle; `deterministic` needs canonical inputs and every bound
field; `complete` needs a closed shape and cross-field invariants;
`recoverable` needs recognized crash states, the exact recovery result, and
fail-closed tamper states.

### Hardened tasks and readiness

`tasks.md` repeats the hardened declaration and adds an exact
`## Negative-Space Readiness Audit` section with at least one
`- N### — plausible escaped defect` entry. Each entry has exactly one
`- Disposition:` child, either `covered by <V-id-list>` or
`accepted limitation — <reason and review consequence>`.

Each task is `- [ ] T### — description` with every field in this order:
`Satisfies`, `Verifies`, `Depends on` (`none` or earlier T IDs), `Cohesion
group` (`none` or a defined G ID), `Authority`, `Mutation boundary`,
`Preserved invariants`, `Adversarial cases` (named failures, not a category
label), `Completion check`, and `Evidence`. `Satisfies` equals the union of ACs
proved by `Verifies`. `Evidence` holds exactly one four-space `- V###: ...`
item per `Verifies` ID in the same order; a checked task may hold no `pending`
item. A green local example does not complete a cohesion group while a shared
invariant is contradicted.

### Hardened execution

Load the `AC###`/`V###` mappings and cohesion group before editing. Implement
every named `V###` case where it is locally executable, recording red evidence
first. After the change, perform a bounded mutation and negative-space sweep
over the named adversarial cases and the shared invariant. Never edit the agreed
acceptance or verification definitions to fit the implementation; report an
infeasible or conflicting case back to the planning owner and keep a grouped
task unchecked while its local evidence contradicts the shared boundary or its
group-level completion oracle is unsatisfied.

### Hardened validation

`validation.md` repeats the hardened declaration. Under `## Results`, record
`Candidate:`, `Validation context:`, and `Validation summary:` on ordered single
lines, then one `- V### — STATUS` result per specification V with these ordered
fields: `Proves`, `Source`, `Expected`, `Observed`, `Resulting state`, `Oracle
matched`, `Evidence`, and `Limitations`. `Proves` and `Expected` must equal the
specification definition. `PASS` requires `Oracle matched: yes`; `FAIL` requires
`no`; `BLOCKED` and `SKIPPED` require `unknown`. A summary of `PASS` requires
every result to be `PASS`; `FAIL` requires at least one `FAIL`; `BLOCKED`
requires no `FAIL` and at least one `BLOCKED` or `SKIPPED`. An exit-zero command
that contradicts its oracle is recorded as `Oracle matched: no` and `FAIL`; the
command status is not the conclusion. Missing, skipped, blocked, failed, or
contradictory evidence prevents a passing summary. Only a complete all-PASS set
can satisfy the hardened validation gate, and validation or a later activity
requires every task checked with nonpending evidence. Use `fresh` or
`independent` only when that context really existed. Evidence from different
fixtures or runs must not be spliced into one end-to-end claim; an end-to-end
case uses one candidate's own coherent evidence. Repairs rerun the affected
cases plus their cohesion-group, shared-invariant, and end-to-end cases.

### Hardened verification seeding (cross-context)

When hardened cross-context work needs a new executable oracle for
transactions, recovery, filesystem safety, authentication or private data,
external mutation, concurrency, or multiple persisted projections, task
preparation separates verification seeding from production implementation as
two ordinary tasks on the existing checklist.

Before the seed is authored, the planning/verification owner performs a
reconciliation of the intended state and operation model against retained
behavior: every `all`, `every`, `complete`, or `cross-product` claim names its
finite inventory, expected cardinality, and permitted exclusions, and every
exclusion is justified by the lifecycle contract, never by fixture
convenience. Intentional changes to retained behavior are recorded
explicitly.

The seed task edits tests or oracle helpers and workflow evidence only. It
runs the seeded oracle red against the exact production candidate before any
production edits, records the candidate commit and every protected seed path
with its SHA-256 in the existing evidence and handoff records, writes the
normal handoff, and stops. The implementation task verifies the branch,
checkpoint, and every protected seed hash before its first edit; the
protected seed paths are read-only to it, and subordinate tests may be added
only outside the protected set. A mismatched, stale, infeasible, or
contradictory seed returns to the planning owner with the implementation task
left unchecked; the implementation context never edits its own judge.

Validation evidence for a quantified claim records the planned universe, the
expected count, the executed count, and the exclusions with their lifecycle
justification; a selected subset, convenient fixture order, green exit
status, or reconstructed post-edit red run cannot establish the full claim.
Review performs one bounded full-surface pass over seed integrity, coverage
closure, observation semantics, every AC/V route, and adjacent negative
space, and returns ordinary findings batched in one consolidated package
before handback, unless a recorded safety, cost, authority, or missing-evidence
stop prevents finishing the pass. Prompt wording, recorded hashes, and helper
checks observe bytes and structure only; chronology, semantic truth, and
model behavior remain the responsibility of honest records and fresh review.

The helper checks exact syntax, IDs, mappings, required fields, declared
oracle/status coherence, and summaries only. It never judges prose or test
truth, infers approval or independence, or executes project commands. A passing
hardened check means structural traceability only; semantic correctness,
approval, and validation independence remain the responsibility of strong
planning and fresh review.
