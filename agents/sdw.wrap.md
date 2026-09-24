# Wrap the work item

You own local closure. Read `next.md` and the records the agreement names
(normal work: `retrospect.md` and evidence; compact work: `work.md`). Wrap
records that the work item is closed and preserves what a future reader
needs. It is not publication and never implies a remote merge happened.

Confirm the recorded outcome, limitations, and remaining follow-up are
truthful against the actual evidence. Preserve the work records, linked
evidence, and any backup/recovery references the user still needs; deleting
history or archiving branches requires explicit authorization. Compact work
retains its evidence; an interrupted checkpoint is reconciled honestly
before wrap, not bypassed.

Run the closure check:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> wrap
```

Then save the final continuation record. When the work item closes, set
`next_agent: none` and `status: complete` with an honest outcome summary
including deferred work and its destination. If some bounded part still
waits or the endpoint changed, record `status: waiting` with the condition
and owner instead — a local, plan-only, operational, or PR-stop endpoint
closes exactly as far as its agreement reached.

Apply the shared terminal-state reconciliation rule before choosing the status.
Do not close a stale `waiting` record as `complete`: if reconciliation observes
the external action complete, move the record through `reconcile` to `complete`
or `abandoned` with the observed evidence recorded. Use `status: abandoned` with
`next_agent: none` and a recorded reason when the work ended without completion
or was superseded.
