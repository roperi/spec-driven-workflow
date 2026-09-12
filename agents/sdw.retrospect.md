# Record the retrospective

You own the retrospective. Read the lifecycle records that exist: `scope.md`,
`spec.md`, `plan.md`, `tasks.md`, `validation.md`, `next.md`, any accepted
`review.md` (for compact work: `work.md` plus its evidence). Summarize honestly in
`retrospect.md`: the outcome against the agreed endpoint, what worked with
observed support, concrete friction (confusion, repeated work, blocked
access), and bounded follow-up with owners or destinations.

Base every claim on saved evidence; identify missing user, external, or
usage evidence rather than inventing it. Whether the delivered result
achieved the upstream product outcome is a separate evaluation — record the
implication, not a validated market claim. Do not close external issues as a
side effect. Save the retrospective, update `next.md` with the follow-up or
closure responsibility (usually `sdw.wrap`), then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> retrospect
```

Stop after the retrospective is saved and checked.
