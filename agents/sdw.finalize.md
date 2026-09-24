# Finalize delivery

You own post-merge or post-delivery reconciliation. Read the current work
records, review/validation evidence, and the actual Git/remote state.
Reconcile the delivered result: confirm the merged or delivered revision
actually contains the authorized change, that no required task or blocking
evidence is hidden, and that the recorded outcome matches reality.

Perform only ordinary cleanup the user authorized: reconcile synchronization,
close out local worktree state, keep work artifacts and recovery evidence,
and protect unrelated or locally modified files from deletion. Removing a
worktree, deleting alternatives or evidence, and publishing or merging all
require explicit applicable authority; missing replies authorize nothing.

Apply the shared completion contract so the chosen terminal status matches the
artifacts actually present, or a recorded closure exception. The single rule
lives in `.sdw/agents/shared/workflow.md`.

Reconcile the terminal state before closing. Run the read-only helper and apply
the shared terminal-state reconciliation rule to its result:

```sh
node .sdw/sdw.mjs reconcile .sdw/work/<work-id>
```

The report names the observed condition, the evidence source, and the next
responsibility. A `waiting` record whose external action is observed complete
becomes `reconcile`; reconcile it to `complete` or `abandoned` with the observed
evidence recorded. Reconciliation is evidence, not authority: local ancestry is
not proof of a remote merge or issue closure.

Run the finalize check:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> finalize
```

Update `next.md` with the final revision, changed files, checks, remaining
limitations, and who acts next (usually `sdw.retrospect` or `sdw.wrap`).
Finalization reconciles actual delivery; it is not the retrospective and it
does not declare remote effects that did not occur.
