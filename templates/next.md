---
work_id: TODO
record_format: TODO
next_agent: TODO
status: TODO
closure: full
---

Status values: `ready` (local next responsibility), `waiting` (externally blocked), `reconcile` (external action observable as complete, record not yet reconciled), `complete` (terminal), `abandoned` (terminal, not completed or superseded). Reconcile with `node .sdw/sdw.mjs reconcile <work-id>`; it is read-only and grants no merge, closure, or publication authority.

The optional `closure` field declares the completion path for normal records: `full` (default, requires the review and retrospect artifacts at completion), `planning-only` (bounded at planning), or a recorded exception — `parked`, `interrupted`, `superseded`, or `abandoned`. Compact records bypass the closure contract. The exact rule lives in `.sdw/agents/shared/workflow.md`.

A reviewed, published PR is a valid normal endpoint: the work item closes on its own branch before the merge, and the PR records the human merge. If the agreement explicitly names the merge itself as the endpoint, the existing not-complete-until-human-confirmation rule applies; a post-merge bookkeeping record rides on the next change's branch or the project's documented bookkeeping route, not the default branch. A project that archives closed items does so on the work branch before merge; archived-ness is `status: complete` plus `next_agent: none`.

Three optional fixed fields record where the work item is durable: `branch` (the branch where its copy lives), `candidate` (the exact candidate commit), and `durability` (an optional reason documenting a work directory intentionally untracked under a committed repository `.gitignore`). A read-only durability assessment in `resume` and in the `handoff`/`finalize`/`wrap` checks reports an untracked work directory, an unreachable candidate, or an absent branch, and explains whether a committed repository `.gitignore` accounts for it. When the recorded branch is absent, the assessment resolves the work item's current path (including an archive path) in a locally resolved default branch and qualifies the result as local evidence only; it fails closed when no default contains the item. A merge-ending record that pins a candidate keeps it reachable or omits it. Records are committed on the work item's branch/pull request by default; a work directory is intentionally untracked only when a committed repository `.gitignore` entry excludes it, and a `durability` reason no longer permits a merely-untracked directory. The exact rule lives in `.sdw/agents/shared/workflow.md`.

# Next

## Agreement

TODO: state the authorized activity and its endpoint, any explicit local handoff, and the recorded approval or request basis (embedded or a resolvable reference). A user-chosen stage stop and a harness/model change are supported handoffs when recorded here; the next responsibility resumes from the records without the previous chat or routine reapproval.

## Next action

TODO: identify the concrete next work and link the substantive records it depends on. Apply the shared delegation and repair handoff rule in `.sdw/agents/shared/workflow.md` to name the current responsibility and its authority. State the human's next action in plain English, or that no action is needed; a stage label, task ID, or link alone is not enough. Keep this prose standalone and consistent with the final report's plain summary. Keep one current pointer: update the owner, candidate, action, and authority in place and link superseded history in the existing evidence rather than appending another contradictory current-owner section.

## Waiting on

TODO: write `Nothing pending.`, or the condition that must resolve and who owns it, or — for `reconcile` — the observed external condition and its evidence source, or — for `abandoned` — why the work ended without completion. Where a person must act, say in plain English what they must do and why the work is waiting.

## Work context

TODO: record branch/worktree/candidate identity and relevant partial changes sufficiently to resolve the intended work; link the current records the next session needs and any historical evidence by explicit path so a fresh session can recover context without an archive-wide search; do not permanently bind to an absolute path.
