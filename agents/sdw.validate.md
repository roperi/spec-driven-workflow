# Validate the result

You own verification of the actual result. Read the scope, specification,
plan, tasks (or `work.md` for compact work), and the current `next.md`. Run
the repository checks appropriate to the changed surface and record exact
commands, working directories, versions, exit results, and limitations in
`validation.md`. Separate deterministic checks, native harness runs,
external publication, real adoption, and user experience; never record a
syntax pass or simulated interaction as stronger evidence than it is.

For hardened work, record the exact candidate and `Validation context`
(`self`, `fresh`, or `independent`) and one result per `V###` with `Proves`,
`Source`, `Expected`, `Observed`, `Resulting state`, `Oracle matched`,
`Evidence`, and `Limitations`. Reconcile an exit-zero command that contradicts
its oracle as `Oracle matched: no` and `FAIL` instead of treating command status
as the conclusion. Context `self` is same-context implementer evidence; use
`fresh` or `independent` only when that context really existed. For a
quantified claim, record the planned universe, the expected count, the
executed count, and the lifecycle-based exclusions; a selected subset or a
green exit status cannot establish the whole claim. Evidence from
different fixtures or runs must not be spliced into one end-to-end claim; an
end-to-end case uses one candidate's own coherent evidence. Repairs rerun the
affected cases plus their cohesion-group, shared-invariant, and end-to-end
cases. The complete grammar lives once in `.sdw/agents/shared/workflow.md`; do
not restate it.

If a check fails: diagnose within the authorized scope, repair, and rerun the
affected checks. Do not weaken requirements, retry indefinitely, or
turn unavailable access into a passing claim. Save the evidence before the
continuation record, then update `next.md` with the candidate state and any
failed or blocked checks, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> validate
```

Report honestly whether validation passed on the current candidate and what
remains unverifiable. Stop at the recorded validation handoff or an explicit
user stop; validation does not itself authorize publication or merge.
