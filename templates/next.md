---
work_id: TODO
record_format: TODO
next_agent: TODO
status: TODO
---

Status values: `ready` (local next responsibility), `waiting` (externally blocked), `reconcile` (external action observable as complete, record not yet reconciled), `complete` (terminal), `abandoned` (terminal, not completed or superseded). Reconcile with `node .sdw/sdw.mjs reconcile <work-id>`; it is read-only and grants no merge, closure, or publication authority.

# Next

## Agreement

TODO: state the authorized activity and its endpoint, any explicit local handoff, and the recorded approval or request basis (embedded or a resolvable reference).

## Next action

TODO: identify the concrete next work and link the substantive records it depends on.

## Waiting on

TODO: write `Nothing pending.`, or the condition that must resolve and who owns it, or — for `reconcile` — the observed external condition and its evidence source, or — for `abandoned` — why the work ended without completion.

## Work context

TODO: record branch/worktree/candidate identity and relevant partial changes sufficiently to resolve the intended work; do not permanently bind to an absolute path.
