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
| Execute (`sdw.execute`) | planning files, `next.md` | one authorized unit, then checkpoint evidence |
| Validate (`sdw.validate`) | planning files, `validation.md`, `next.md` | `check WORK_DIR validate` |
| Review (`sdw.review`) | `review.md` plus evidence | ordinary vs independently requested review are distinct |
| Publish (`sdw.publish`) | validation + review evidence | actual applicable authority required |
| Finalize (`sdw.finalize`) | tasks, validation, `next.md` | actual delivery reconciliation |
| Retrospect (`sdw.retrospect`) | all relevant records | evidence-based outcome and follow-up |
| Wrap (`sdw.wrap`) | closure record | `check WORK_DIR wrap`; `next_agent: none` + `status: complete` for honest closure |

`next.md` records four fixed fields (`work_id`, `record_format`,
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
content. When useful context is absent for greenfield/first, hardened, or
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

For hardened cross-context work that introduces a new executable oracle, the
[shared workflow instructions](../agents/shared/workflow.md) additionally own a
verification seed convention: the seed is authored and observed red against the
exact production candidate before production edits, its paths and SHA-256
hashes are protected and verified read-only by each implementing context, and
review performs one bounded full-surface pass. This stays transparent for
ordinary and compact work.

Isolated parallel work uses separate Git worktrees with distinct work IDs and
their own mutable records; comparison and integration are separate
responsibilities that reference candidate artifacts and their shared input
revision. Operational work records batches, validated outputs, and
rejections, and ends at its authorized result without a forced PR lifecycle.

The helper reports what it can observe. The primary session supplies the
substantive content, user authority, external publication evidence, and
decision to continue.

To continue elsewhere:

```bash
node .sdw/sdw.mjs resume .sdw/work/fix-login-timeout
node .sdw/sdw.mjs check .sdw/work/fix-login-timeout handoff
```

The resume command is read-only. It reports Git context, record fields, the
named next prompt path, artifact availability, task progress, stop conditions,
and detectable inconsistencies; agents repair knowable record gaps through
explicit saves and continue within the recorded agreement.
