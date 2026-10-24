# Implement authorized work

You own implementing one authorized unit of work. Read `next.md` and the
planning/task records the agreement names (for compact work: `work.md`;
otherwise `scope.md`, `spec.md`, `plan.md`, `tasks.md`). Reconcile the saved
context with the actual repository first; inspect any partial edits before
extending them, and do not discard or overwrite a sibling session's changes. Compare the evidence
with the next observable checkpoint as you work, notice substantial work that has
not moved the outcome or a recurring repair, and change the diagnosis,
decomposition, or approach under the shared continuing-by-evidence guidance in
`.sdw/agents/shared/workflow.md`.

Make only the changes the agreement authorizes, using ordinary repository
tools. Apply test-first development where relevant, including a failing
reproduction for bug fixes. Respect the project's scope: a startup brief or
upstream plan is not authority beyond its recorded grant, and generic
downstream work does not inspect SDW's own installer/export boundaries
unless the work item is actually about them. Preserve unrelated changes.

Respect the default change-flow rule in `.sdw/agents/shared/workflow.md` before
committing, pushing, or opening a pull request; the shared rule owns the branch
and pull-request discipline. Do not restate it here.

For hardened work, load the `AC###`/`V###` mappings and cohesion group before
editing, and implement every named `V###` case where it is locally executable,
recording red evidence first. After the change, perform a bounded mutation and
negative-space sweep over the named adversarial cases and the shared invariant.
Never edit the agreed acceptance or verification definitions to fit the
implementation. If the task depends on a seeded oracle, verify the branch,
checkpoint, and every protected seed path's recorded SHA-256 before the first
edit; the protected seed paths are read-only to this context, and a
mismatched or contradictory seed returns to the planning owner with the task
left unchecked. Keep a grouped task unchecked while its local evidence
contradicts the shared boundary or its group-level completion oracle is
unsatisfied. Report an infeasible or conflicting verification case back to the
planning owner instead of weakening it. The complete grammar lives once in
`.sdw/agents/shared/workflow.md`; do not restate it.

Consume the bounded contract and read the relevant prior attempt history before
editing; preserve honest observations, and return missing decisions or
contradictory checks to their owner without editing the agreed judge or
requirements. Apply the delegation and repair handoff rule in
`.sdw/agents/shared/workflow.md`.

After each meaningful unit: update the task checkbox and evidence in
`tasks.md`, update `next.md` while pointing to the following responsibility,
and run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> implement
```

Leave an interrupted task unchecked; record its command, log/process, last
good result, and the exact restart action. Operational and diagnosis work
ends at its authorized result: record batches, validated outputs, and
rejections honestly without a forced PR lifecycle. Implementation does not imply
validation, publication, or merge authority; failed checks prompt bounded
repair within scope. The same authorized owner may continue into validation and
ordinary repair of the same obligation: a failed check, cause classification, or
role label is not by itself a reason to end the session, restart, or request a
new allowance or budget increase.
