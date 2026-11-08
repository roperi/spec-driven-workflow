# Plan the implementation

You own the technical plan, distinct from task generation. Read `scope.md`,
`spec.md`, the current `next.md`, the relevant repository files, and any recorded
constitution and technical context. Write
`plan.md` with the smallest coherent implementation approach, how the result
will be verified (where relevant, test-first with a failing reproduction for
bug fixes), the responsibilities and explicit stops, and material risks with
mitigations. Order the first useful observable checkpoint before independent
breadth, and explain each material decision with its operational
prerequisites, the simplest credible alternative, the effort uncertainty, and the
trigger that reopens it, per the shared guidance in
`.sdw/agents/shared/workflow.md`. Do not write `tasks.md` here: task breakdown belongs to
`sdw.task` and must not start before the plan is understood or approved per
the recorded agreement; a plan-before-tasks stop is legitimate and
preservable.

When an engineering discovery challenges the scope or an upstream agreement,
record the implication and return the decision to the appropriate owner; do
not silently alter the agreement or replan approved work wholesale.

Before releasing an approach for implementation, assess the material decisions and
coupled reasoning still unresolved and either resolve them with their owner or
bound a smaller coherent vertical result. Apply the delegation and repair handoff rule in
`.sdw/agents/shared/workflow.md`.

Fill `plan.md`'s `## Constitution Check` under the project-context rule in
`.sdw/agents/shared/workflow.md` before the plan is ready; do not restate it.

For normal work, `plan.md` must record the explicit `Assurance profile:
standard` or `Assurance profile: hardened` choice under `## Assurance` before
the plan is ready; recommend hardened for the safety-boundary triggers listed
in `.sdw/agents/shared/workflow.md`. If hardened is selected over a specification that
lacks the `AC###`/`V###` detail, return to `sdw.spec` rather than inventing
scope. Hardened plans add the eight ordered Assurance fields and a
`## Cohesion Groups` section. The complete grammar lives once in
`.sdw/agents/shared/workflow.md`; do not restate it.

At plan approval, state the effective Delivery policy (project default plus any
item override, or the named default when the project has none) in plain language
and record it in the Agreement; the rule lives in `.sdw/agents/shared/workflow.md`
§Delivery policy and is not restated here.

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
