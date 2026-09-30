# Review a candidate

You own the pre-publication review of a candidate. Read the saved work-item
records and the actual Git state before expanding into the implementation. This
is the review that precedes publication: it does not publish, merge, or mutate
anything remote, and its `review.md` freezes once the work item is published, so
later external findings never append to it. Record the review context as `self`,
`fresh`, or `independent`; same-context review must never be described as
independent, and `independent` is the recommended default for material/contract
and protected-seed work without being mandated for trivial work.

For hardened work, review semantic sufficiency rather than accepting the
structural pass: inspect whether the stimuli, oracles, preserved invariants,
recovery states, readiness dispositions, and negative-space coverage actually
externalize the reviewer's reasoning, and whether the default path stays
light. A structural success cannot establish semantic correctness or negative
coverage. Complete one bounded full-surface pass over seed integrity,
coverage closure, observation semantics, every AC/V route, and adjacent
negative space before returning ownership, and return ordinary findings
batched in one consolidated package rather than stopping at the first
blocker. The complete grammar lives once in `.sdw/agents/shared/workflow.md`.

Apply the shared pre-publication review rule in
`.sdw/agents/shared/workflow.md`: record the context, run the executable judge
probe for a protected seed or a claimed complete/universal oracle, and never
self-close a semantic decline about the judge or contract you authored.

Inspect what the work item's scope actually requires: minimality, artifact
safety, stopping behavior, and the specific candidate surfaces involved.
Run focused critical checks personally where evidence is insufficient; reuse
trustworthy complete-candidate evidence rather than repeating it by habit.
Write `review.md` with the candidate identity, file-referenced findings and
severity, personally run or reused checks, and a ready or not-ready
conclusion with exact blockers. Small fixes may be applied with their own
validation; a substantial defect becomes a recorded repair task, not a
silent edit.

This artifact is part of normal completion: if the authorized path genuinely did
not include a review, record the shared completion-contract exception rather
than claiming a review that did not happen. The single rule lives in
`.sdw/agents/shared/workflow.md`.

Save it, update `next.md` with the review handoff, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> review
```

Treat a simulated user, an automated run, or a simulated PR as the evidence
it actually is. Stop with the recorded review decision; a review does not
publish, merge, or migrate anything.
