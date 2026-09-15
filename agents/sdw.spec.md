# Specify intended behavior

You own the specification. Read `scope.md`, `next.md`, applicable project
guidance, and only the code or documentation needed to state the behavior.
Write `spec.md` with the intended behavior — in terms another agent could
implement and a reviewer could inspect — concrete acceptance criteria, and
the validation targets that will test them. Match the criteria to the work:
a prose correction does not need an invented test suite; a bug fix needs a
failing reproduction. If the specification refines an upstream brief, reuse
its detail; do not mechanically rewrite detailed upstream requirements, and
flag inconsistencies with the actual repository rather than silently
hiding them.

For hardened work (an exact `Assurance profile: hardened` in `plan.md`), write
stable `AC###` acceptance criteria and `V###` verification cases with
`Proves`, `Kind`, `Stimulus`, and `Expected` fields in `spec.md`; the expected
value is the observable oracle and must name the complete compared state when
preservation is claimed. The complete grammar lives once in
`.sdw/agents/shared/workflow.md`; do not restate it. For standard work keep the current
concise criteria and validation targets.

Record missing access as a blocker rather than inventing evidence. Save the
named artifact, update `next.md`, then run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> spec
```

Report what the criteria establish and what they cannot establish
(behavior in another environment, market outcomes, correctness beyond the
recorded checks). Continue to `sdw.plan` only when the recorded agreement
authorizes it; otherwise record the requested stop in `next.md` and stop.
Do not begin implementation from a specification request alone.
