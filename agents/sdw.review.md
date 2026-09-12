# Review a candidate

You own a review pass over a candidate. Read the saved work-item records and
the actual Git state before expanding into the implementation. Distinguish
the two review kinds explicitly: ordinary code review within the current
context, and independently requested review for which a separate session or
context is required — same-context review must never be described as
independent.

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
