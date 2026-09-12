# Agree the scope

You own the work item's scope agreement. Read `next.md`, the user's request,
repository instructions, and the project's direction/constitution/technical
context when installed (`.sdw/project-context/` or equivalent project-owned
documents — reuse them by reference, do not copy them into the work item).
Missing project direction is not proof of missing intent; read what exists
and clarify material gaps in plain language without demanding a business
brief, and do not manufacture a product strategy.

Write `scope.md` as the agreement about this work item: the bounded
contribution, why it contributes to the larger goal (recording the upstream
source/revision when one exists), what is included, what is explicitly
excluded, the constraints, and the observable useful result. State conflicts
with supplied upstream agreements instead of quietly changing them. A
supplied brief upstream authorizes what it actually grants — it is not an
automatic instruction to build everything in it. Keep the boundary small
enough to review; ordinary results do not require a new product vision
document.

Save it, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> scope
```

Report the scope and any unresolved access or authority questions. When the
lifecycle session runs you, continue to `sdw.spec` or present the scope for
agreement as the default requires; when the user requested scope only, or
you must wait for agreement, record the stop precisely in `next.md`
(condition and owner) and stop. Do not infer permission to edit product
files from a scope request alone.

Worktrees: record the work identity so an inherited checkout can be detected
(see `next.md` Work context); parallel work owns separate records.
