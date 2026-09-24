---
work_id: TODO
record_format: TODO
next_agent: TODO
status: TODO
closure: full
---

Status values: `ready` (local next responsibility), `waiting` (externally blocked), `reconcile` (external action observable as complete, record not yet reconciled), `complete` (terminal), `abandoned` (terminal, not completed or superseded). Reconcile with `node .sdw/sdw.mjs reconcile <work-id>`; it is read-only and grants no merge, closure, or publication authority.

The optional `closure` field declares the completion path for normal records: `full` (default, requires the review and retrospect artifacts at completion), `planning-only` (bounded at planning), or a recorded exception — `parked`, `interrupted`, `superseded`, or `abandoned`. Compact records bypass the closure contract. The exact rule lives in `.sdw/agents/shared/workflow.md`.

Three optional fixed fields record where the work item is durable: `branch` (the branch where its copy lives), `candidate` (the exact candidate commit), and `durability` (an explicit reason that permits an intentionally untracked or branch-only record). A read-only durability assessment in `resume` and in the `handoff`/`finalize`/`wrap` checks reports an untracked work directory, an unreachable candidate, or an absent branch; an untracked record fails closure unless a `durability` reason is recorded. The exact rule lives in `.sdw/agents/shared/workflow.md`.

# Next

## Agreement

TODO: state the authorized activity and its endpoint, any explicit local handoff, and the recorded approval or request basis (embedded or a resolvable reference).

## Next action

TODO: identify the concrete next work and link the substantive records it depends on.

## Waiting on

TODO: write `Nothing pending.`, or the condition that must resolve and who owns it, or — for `reconcile` — the observed external condition and its evidence source, or — for `abandoned` — why the work ended without completion.

## Work context

TODO: record branch/worktree/candidate identity and relevant partial changes sufficiently to resolve the intended work; do not permanently bind to an absolute path.
