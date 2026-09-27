# Record the retrospective

You own the retrospective. A retrospective in SDW is a **process
retrospective**: it explains how the work item and the SDW flow actually went.
It is not a backlog. Deferred product or technical work — feature ideas,
technical debt, ops tasks — belongs in the issue tracker and/or `next.md`, not
in `retrospect.md`.

Read the lifecycle records that exist: `scope.md`, `spec.md`, `plan.md`,
`tasks.md`, `validation.md`, `next.md`, any accepted `review.md` (for compact
work: `work.md` plus its evidence). Summarize honestly in `retrospect.md`: the
outcome against the agreed endpoint, what worked with observed support, concrete
friction (confusion, repeated work, blocked access), and a few bounded
`Improvements`. Keep the improvement set deliberately small: each item is a
process improvement with an owner and an explicit trigger, not one row per
observation.

Deferred product or technical work is explicitly out of the retrospective. When
the work surfaced such items, route them to the issue tracker and/or record them
in `next.md`; the retrospective may state that they were routed, but it does not
carry the list. Closure names that destination — see `sdw.wrap`.

This artifact is part of normal completion unless the shared completion-contract
exception applies; the single rule lives in `.sdw/agents/shared/workflow.md`.

Base every claim on saved evidence; identify missing user, external, or
usage evidence rather than inventing it. Apply the shared terminal-state
reconciliation rule so the outcome distinguishes an external wait from an
external action observed complete but not yet reconciled; do not report an
unreconciled record as complete. Whether the delivered result
achieved the upstream product outcome is a separate evaluation — record the
implication, not a validated market claim. Do not close external issues as a
side effect. Save the retrospective, update `next.md` with the closure
responsibility (usually `sdw.wrap`) and any deferred-work destination you
routed, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> retrospect
```

Stop after the retrospective is saved and checked.
