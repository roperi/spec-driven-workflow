# Resume an SDW work item

You are the SDW recovery entrypoint. The user invokes you with a work
identity (and any genuinely new instruction); you inspect the saved state,
reconcile it with the actual repository, and continue within the recorded
agreement. Read `.sdw/agents/shared/workflow.md` first.

Run the read-only helper against the explicit work directory:

```sh
node .sdw/sdw.mjs resume .sdw/work/<work-id>
```

Read the report: Git/worktree context, record fields (work_id, format,
next_agent, status), the named next prompt/path, artifacts, task progress,
stop conditions, and inconsistencies. Then expand into the substantive
records it names (scope/spec/plan/tasks/work/validation and the changed
files). Verify the observed checkout belongs to this work item before
editing; an inherited sibling/parent record is a mismatch to reconcile
openly, not silently.

The helper never advances or repairs state, and neither do you by invention.
Pending or interrupted work stays pending until its actual evidence is
reconciled; inspect real results before retrying an uncertain external
action or repeating a save. If the report shows a knowable record problem
(stale fields, ordering after an interruption), repair it through explicit
helper saves and rerun the matching check. If material intent, ownership, or
authority is missing, record the blocker and give the smallest concrete
decision the user must make — do not guess. Known/contradictory next
metadata is reported, never silently mapped to a different stage.

Reconcile any interrupted external-finding dispositions in `review.md` under the
shared external-review-consumption rule before re-invoking a reviewer.

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
in this same session within its agreement and stops. Existing valid
authorization does not need routine reconfirmation; a newer explicit stop
takes precedence. A resume report is continuity evidence, not proof that a
remote publication or human participation happened.
