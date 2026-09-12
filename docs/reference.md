# Command and stage reference

The installed helper accepts these commands:

```text
node .sdw/sdw.mjs init WORK_DIR [--format normal|compact]
node .sdw/sdw.mjs start WORK_DIR OBJECTIVE [--format normal|compact]
node .sdw/sdw.mjs save WORK_DIR ARTIFACT < CONTENT
node .sdw/sdw.mjs check WORK_DIR ACTIVITY
node .sdw/sdw.mjs resume WORK_DIR
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
responsibilities or `none`; `status` is `ready`, `waiting`, or `complete`.
`waiting` records the condition and its owner. Unknown or contradictory
metadata is reported, never silently mapped, and nothing is inferred from
approval-sounding prose; closure checks report unresolved blockers and
pending tasks.

Compact work uses `work.md` (purpose/boundary, intended result, approach,
actions/progress, checks/results, outcome/lessons) plus `next.md`; expand to
normal records only through an explicit superseding decision, keeping one
mutable authority.

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
