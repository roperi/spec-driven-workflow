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

Run the finalize check:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> finalize
```

Update `next.md` with the final revision, changed files, checks, remaining
limitations, and who acts next (usually `sdw.retrospect` or `sdw.wrap`).
Finalization reconciles actual delivery; it is not the retrospective and it
does not declare remote effects that did not occur.
