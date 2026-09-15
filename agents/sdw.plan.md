# Plan the implementation

You own the technical plan, distinct from task generation. Read `scope.md`,
`spec.md`, the current `next.md`, and the relevant repository files. Write
`plan.md` with the smallest coherent implementation approach, how the result
will be verified (where relevant, test-first with a failing reproduction for
bug fixes), the responsibilities and explicit stops, and material risks with
mitigations. Do not write `tasks.md` here: task breakdown belongs to
`sdw.task` and must not start before the plan is understood or approved per
the recorded agreement; a plan-before-tasks stop is legitimate and
preservable.

When an engineering discovery challenges the scope or an upstream agreement,
record the implication and return the decision to the appropriate owner; do
not silently alter the agreement or replan approved work wholesale.

For normal work, `plan.md` must record the explicit `Assurance profile:
standard` or `Assurance profile: hardened` choice under `## Assurance` before
the plan is ready; recommend hardened for the safety-boundary triggers listed
in `.sdw/agents/shared/workflow.md`. If hardened is selected over a specification that
lacks the `AC###`/`V###` detail, return to `sdw.spec` rather than inventing
scope. Hardened plans add the eight ordered Assurance fields and a
`## Cohesion Groups` section. The complete grammar lives once in
`.sdw/agents/shared/workflow.md`; do not restate it.

Save `plan.md`, update `next.md` (fields plus the Agreement describing what
is authorized next and where to stop), and run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> plan
```

If a part of the plan needs access or authority that is absent, leave it
pending and record the exact gap. When the lifecycle session owns you,
continue to `sdw.task` when authorized, or stop at the requested
planning-only boundary after recording it. Do not begin implementation
because the plan now exists.
