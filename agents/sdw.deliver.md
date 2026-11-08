# Deliver an accepted candidate

You own delivery of an accepted candidate to a merged, synced, clean state in
one run. The Delivery policy and the authority guard live in
`.sdw/agents/shared/workflow.md` §Delivery policy; read them and apply them here
without restating them. Before pushing or opening a pull request, follow the
default change-flow rule in the same file; it owns the branch discipline.

Do these in order:

1. **Confirm authority.** Read the review, validation evidence, `next.md`, and
   the actual repository status. The Agreement and the effective Delivery policy
   must authorize each action you take, and the candidate must be exactly the
   reviewed and validated one, on the current checkout. A missing reply is not
   authority. Inspect the accepted review, the validation evidence, and the exact
   candidate identity yourself; the helper does not establish them. Then run the
   structural precondition check, which verifies record structure only and does not
   need the close-out records written in step 3:

   ```sh
   node .sdw/sdw.mjs check .sdw/work/<work-id> review
   ```

2. **Publish.** Push the work branch and open the pull request with the
   repository's ordinary Git/PR tooling. Commit the work item's
   `.sdw/work/<work-id>/` records with the deliverable (the durability rule owns
   that obligation). Get CI to the result the policy requires: fix failures
   within the item's scope, or report them. A local commit, dry run, or
   simulated PR interface does not establish hosted publication.

3. **Close out on the branch, before external review.** Reconcile the records
   against the actual branch, PR, and CI (`node .sdw/sdw.mjs reconcile
   .sdw/work/<work-id>`). For normal work write the short process
   `retrospect.md`: outcome against the agreed endpoint, what worked, friction,
   and a few bounded Improvements; deferred product or technical work goes to
   the issue tracker and/or `next.md`, not the retrospective. Compact work
   records its outcome in `work.md` and `next.md` and writes no retrospective.
   Apply the shared layout rule in `.sdw/agents/shared/workflow.md` §Records
   (file stray records under `evidence/` and promote durable findings to
   project-owned documents) and the shared retention rule in the same section,
   the shared terminal-state
   reconciliation rule (§Terminal state and reconciliation), and the shared
   completion contract, then set the final `next.md` by endpoint, because nothing may be written
   after the merge. If the Agreement's endpoint is the reviewed PR: `next_agent:
   none`, `status: complete`, and an outcome that says plainly
   "delivered to PR #N; awaiting review/merge" while unmerged. If the Agreement names the merge,
   issue closure, or publication as the endpoint: `next_agent: none`,
   `status: waiting`, with the condition and its owner in Waiting on, to be
   reconciled later from observed evidence. Do not close a stale `waiting` record
   as `complete`; use `status: abandoned` with a recorded reason when the work
   ended without completion. Run the final check, then commit and push. Do not
   claim an unobserved merge, and never create a second records-only PR:

   ```sh
   node .sdw/sdw.mjs check .sdw/work/<work-id> deliver
   ```

4. **External review, per the policy.** Request, wait for, and address review
   under the shared external-review rule in `.sdw/agents/shared/workflow.md`. Fix feedback with ordinary
   bounded implementation and re-validate material repairs. Amend the closing
   records in the same push only when something changed; record a deferred
   finding once in `next.md` with owner and trigger. Never mirror findings into
   `review.md`, which stays frozen at publication.

5. **Merge when merge-ready.** The PR is merge-ready when CI is at the required
   result, the closing records are in the PR, the review mode is satisfied, and
   no material finding is unresolved. Merge only if the policy grants it;
   otherwise report merge-ready and wait for the owner's word.

6. **Sync and clean after an observed merge** of the item's own PR, within the
   shared sync-and-clean authority. Then give the final report: what was
   delivered, the PR and merge revision, deferred work and its destination, and
   that nothing else is owed. If the effective policy grants issue closure to the
   agent, close the item's issue after the observed merge, confirm it reads closed
   in the hosting tool, and report that state; otherwise follow the policy's
   other closure modes and never close an issue without that grant. Closure mode
   does not change the status: a PR-ending item stays `complete`; an item whose
   Agreement names issue closure as its endpoint was already set `waiting` in step
   3 and is reconciled later from the observed evidence.

Write nothing to the repository after the merge. Stop truthfully when an
authorized action completes or is blocked, and preserve unrelated dirty work.
