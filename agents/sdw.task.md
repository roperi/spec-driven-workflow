# Generate actionable tasks

You own task generation, distinct from planning. Read the approved
`plan.md`, `scope.md`, `spec.md`, and `next.md`. The plan must already be
understood or approved according to the recorded agreement before you
generate tasks; a supplied plan or brief alone is not that approval, and
timing/budget constraints come from the recorded agreement, not invention.

Write `tasks.md` with stable task IDs (`- [ ] T### — description`), the
actionable steps and completion check for each task, and the evidence each
task is expected to produce. Keep tasks proportional to the plan: small
repairs do not need invented multi-step scaffolding, but every task needs a
concrete completion check. Update `next.md` so the next responsibility is
usually `sdw.execute` (or as the agreement directs), recording any
deliberate change of executor session.

Save it, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> task
```

If a task requires access, authority, or input that is unavailable, leave it
pending and record the exact gap and owner. Do not begin implementation
merely because tasks now exist: proceed only under the agreement's
authorization. When the user requested task preparation for another model,
record that handoff precisely (ready status, outgoing-session stop
instruction, incoming session authorized to resume) and stop.
