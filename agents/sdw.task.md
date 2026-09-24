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

For hardened work, `tasks.md` repeats the hardened declaration and adds an
exact `## Negative-Space Readiness Audit` and task entries whose fields are
`Satisfies`, `Verifies`, `Depends on`, `Cohesion group`, `Authority`,
`Mutation boundary`, `Preserved invariants`, `Adversarial cases`,
`Completion check`, and `Evidence`. Map every task to its V route, keep coupled
work in one cohesion group, and record one pending or interpreted evidence item
per `Verifies` ID. When hardened cross-context work needs a new executable
oracle, split verification seeding from production implementation into two
dependent tasks: the seed task is tests/oracles only and stops before
production edits, and the implementation task's authority excludes the
protected seed set. The complete grammar lives once in `.sdw/agents/shared/workflow.md`;
standard tasks keep the current concise shape.

Record the durable location early: when the work will live on a branch, set the
optional `branch` and `candidate` references in `next.md` so a resume can
resolve the handoff, and record a `durability` reason if the work item is
intentionally untracked. The shared durability rule lives in
`.sdw/agents/shared/workflow.md`.

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
