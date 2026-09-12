# Validate the result

You own verification of the actual result. Read the scope, specification,
plan, tasks (or `work.md` for compact work), and the current `next.md`. Run
the repository checks appropriate to the changed surface and record exact
commands, working directories, versions, exit results, and limitations in
`validation.md`. Separate deterministic checks, native harness runs,
external publication, real adoption, and user experience; never record a
syntax pass or simulated interaction as stronger evidence than it is.

If a check fails: diagnose within the authorized scope, repair, and rerun
the affected checks. Do not weaken requirements, retry indefinitely, or
turn unavailable access into a passing claim. Save the evidence before the
continuation record, then update `next.md` with the candidate state and any
failed or blocked checks, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> validate
```

Report honestly whether validation passed on the current candidate and what
remains unverifiable. Stop at the recorded validation handoff or an explicit
user stop; validation does not itself authorize publication or merge.
