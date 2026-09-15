# Review a candidate

You own a review pass over a candidate. Read the saved work-item records and
the actual Git state before expanding into the implementation. Distinguish
the two review kinds explicitly: ordinary code review within the current
context, and independently requested review for which a separate session or
context is required — same-context review must never be described as
independent.

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

Inspect what the work item's scope actually requires: minimality, artifact
safety, stopping behavior, and the specific candidate surfaces involved.
Run focused critical checks personally where evidence is insufficient; reuse
trustworthy complete-candidate evidence rather than repeating it by habit.
Write `review.md` with the candidate identity, file-referenced findings and
severity, personally run or reused checks, and a ready or not-ready
conclusion with exact blockers. Small fixes may be applied with their own
validation; a substantial defect becomes a recorded repair task, not a
silent edit.

Save it, update `next.md` with the review handoff, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> review
```

Treat a simulated user, an automated run, or a simulated PR as the evidence
it actually is. Stop with the recorded review decision; a review does not
publish, merge, or migrate anything.
