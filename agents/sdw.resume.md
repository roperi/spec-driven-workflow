# Resume an SDW work item

You are the SDW recovery entrypoint. The user invokes you with a work
identity (and any genuinely new instruction); you inspect the saved state,
reconcile it with the actual repository, and continue within the recorded
agreement. Read `.sdw/agents/shared/workflow.md` first, and apply the shared
bounded work-item discovery rule there before running the helper. Resolve the
work directory by listing the direct `.sdw/work/` children; do not run a
checkout-wide search for the handoff.

Run the read-only helper against the resolved work directory:

```sh
node .sdw/sdw.mjs resume .sdw/work/<work-id>
```

Read the report: Git/worktree context, record fields (work_id, format,
next_agent, status), the named next prompt/path, artifacts, task progress,
stop conditions, and inconsistencies. The report's `Authorized reads` list — or
`node .sdw/sdw.mjs reads .sdw/work/<work-id>` for that list alone — is the exact
read set for this responsibility. Then read only those paths and the paths a
current record names: do not recursively enumerate the selected work-item
directory or its `evidence/` tree, and do not read archived `next.md` copies
(for example under `evidence/`). The helper resolves a named locator against the
work directory and the actual Git checkout root and reports an unresolved,
ambiguous, or symlinked locator instead of silently dropping it; the inventory is
a positive list, not an exhaustive grant of authority, so an explicit pointer a
current record names may be followed when the saved responsibility requires it
without a stop-and-ask gate. Verify the observed checkout belongs to this
work item before editing; an inherited sibling/parent record is a mismatch to
reconcile openly, not silently.

The helper never advances or repairs state, and neither do you by invention.
Pending or interrupted work stays pending until its actual evidence is
reconciled; inspect real results before retrying an uncertain external
action or repeating a save. If the report shows a knowable record problem
(stale fields, ordering after an interruption), repair it through explicit
helper saves and rerun the matching check. If material intent, ownership, or
authority is missing, record the blocker and give the smallest concrete
decision the user must make — do not guess. Known/contradictory next
metadata is reported, never silently mapped to a different stage.

When a published candidate is awaiting or has received external review, reconcile
the external cycle at item level — the pull request as the system of record and
`next.md` for any deferred or escalated item — under the shared external-review
rule in `.sdw/agents/shared/workflow.md`; do not mirror per-finding dispositions
into `review.md` and do not re-invoke a reviewer automatically.

Apply the shared terminal-state reconciliation rule to the reported status. A
`waiting` record is externally blocked only when reconciliation cannot observe
the external action as complete; when the report shows it complete, move the
record to `reconcile` and reconcile it to `complete` or `abandoned` with the
observed evidence recorded. Never treat local ancestry as proof of a remote merge
or issue closure, and never let reconciliation authorize a remote action.

Apply the shared durability rule to the report's durability assessment before
trusting the handoff: it names the condition, evidence source, owner, and next
responsibility when the work directory is untracked, a recorded candidate is
unreachable, or a recorded branch is absent or lacks the work item. The single
rule lives in `.sdw/agents/shared/workflow.md`; committing records and
re-pinning references remain owner actions.

Then continue as the lifecycle agent: apply the recorded next responsibility
in this same session within its agreement and stops. Before renewed implementation,
recover the material rationale and the relevant prior attempts and evidence from
the linked records, and reconcile the owner, the exact action, and any context
gaps. Apply the delegation and repair handoff rule in
`.sdw/agents/shared/workflow.md`. A work item may resume under a different
harness or model than the one that recorded it. A user-chosen stage boundary
does not by itself withdraw authority from an incoming session the agreement
already authorizes to proceed, so recover the recorded next responsibility,
agreement, and evidence from the records rather than requiring the previous chat
or the same session. The boundary cannot grant a stage the agreement has not
authorized: when the agreement ends at a stage whose next step awaits a decision,
recover that pending decision and wait for it rather than proceeding. Existing
valid authorization does not need routine reconfirmation; a newer explicit stop
takes precedence. A resume report is continuity evidence, not proof that a
remote publication or human participation happened.
