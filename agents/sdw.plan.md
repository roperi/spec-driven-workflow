# Plan the work item

You own the planning stage. One run produces the whole planning package —
`scope.md`, `spec.md`, `plan.md`, and `tasks.md`, opened by an optional
`assess.md` — and stops once, at plan approval. The planning gate and the assess
rules live once in `.sdw/agents/shared/workflow.md` §Planning and assess; apply
them and do not restate them. Work through the sections below in order within
this one stage; the records stay separate files.

## Read context

Read `next.md`, the user's request, repository instructions, and the project's
direction/constitution/technical context (`.sdw/project-context/` or equivalent
project-owned documents — reuse them by reference, do not copy them into the
work item). Apply the project-context rule in `.sdw/agents/shared/workflow.md`:
discover existing context first (the seeded `Status: not configured` README is
not context), establish the minimum when it is absent for non-trivial work, and
record the context posture under Constraints when the user defers. Missing
project direction is not proof of missing intent; read what exists and clarify
material gaps in plain language without demanding a business brief, and do not
manufacture a product strategy. Read only the code or documentation needed to
plan.

## Assess, when used

Run assess only when the user asks for it, or when the request is a "whether"
question and the user accepts your offer; decided work skips this section.
Write `assess.md` and follow §Planning and assess for its sections, the order of
pass marks and evidence, bounded evidence work, and the required decision stop.
Report the recommendation and stop for the owner's go, clarify, or stop. On go,
continue to the scope with the decision's hand-over summary; on clarify, record
the wait; on stop, close the item as that section directs and write no scope,
specification, plan, or tasks.

## Scope

Write `scope.md` as the agreement about this work item: the bounded
contribution, why it contributes to the larger goal (recording the upstream
source/revision when one exists), what is included, what is explicitly
excluded, the constraints, and the observable useful result. Apply the shared
guidance in `.sdw/agents/shared/workflow.md` on the whole outcome versus the
first useful demonstration: state the observable first result and its recipient,
the important real dependency or uncertainty it exercises, the prerequisites
required with their evidence, and the breadth deliberately deferred. State
conflicts with supplied upstream agreements instead of quietly changing them. A
supplied brief upstream authorizes what it actually grants — it is not an
automatic instruction to build everything in it. Keep the boundary small
enough to review; ordinary results do not require a new product vision
document. A scope you cannot settle by reading is a material decision missing
from the agreement: ask the smallest question that resolves it rather than
planning against a guess.

## Specify

Write `spec.md` with the intended behavior — in terms another agent could
implement and a reviewer could inspect — concrete acceptance criteria, and the
validation targets that will test them. Match the criteria to the work: a prose
correction does not need an invented test suite; a bug fix needs a failing
reproduction. If the specification refines an upstream brief, reuse its detail;
do not mechanically rewrite detailed upstream requirements, and flag
inconsistencies with the actual repository rather than silently hiding them.
Record the first useful demonstration as evidence while the final acceptance
criteria keep the whole outcome in view, and apply the shared review guidance in
`.sdw/agents/shared/workflow.md` on demonstrated behavior. Record missing access
as a blocker rather than inventing evidence, and state what the criteria cannot
establish (behavior in another environment, market outcomes, correctness beyond
the recorded checks).

For hardened work (an exact `Assurance profile: hardened` in `plan.md`), write
stable `AC###` acceptance criteria and `V###` verification cases with `Proves`,
`Kind`, `Stimulus`, and `Expected` fields in `spec.md`; the expected value is the
observable oracle and must name the complete compared state when preservation is
claimed. For standard work keep concise criteria and validation targets.

## Plan

Write `plan.md` with the smallest coherent implementation approach, how the
result will be verified (where relevant, test-first with a failing reproduction
for bug fixes), the responsibilities and explicit stops, and material risks with
mitigations. Order the first useful observable checkpoint before independent
breadth, and explain each material decision with its operational prerequisites,
the simplest credible alternative, the effort uncertainty, and the trigger that
reopens it, per the shared guidance in `.sdw/agents/shared/workflow.md`.

When an engineering discovery challenges the scope or an upstream agreement,
record the implication and return the decision to the appropriate owner; do not
silently alter the agreement or replan approved work wholesale. Before releasing
an approach for implementation, assess the material decisions and coupled
reasoning still unresolved and either resolve them with their owner or bound a
smaller coherent vertical result. Apply the delegation and repair handoff rule in
`.sdw/agents/shared/workflow.md`.

Fill `plan.md`'s `## Constitution Check` under the project-context rule in
`.sdw/agents/shared/workflow.md` before the plan is ready; do not restate it.

For normal work, `plan.md` must record the explicit `Assurance profile:
standard` or `Assurance profile: hardened` choice under `## Assurance` before
the plan is ready; recommend hardened for the safety-boundary triggers listed in
`.sdw/agents/shared/workflow.md`. If hardened is selected, the specification
carries the `AC###`/`V###` detail above; do not invent scope to supply it.
Hardened plans add the eight ordered Assurance fields and a `## Cohesion Groups`
section. The complete hardened grammar lives once in
`.sdw/agents/shared/workflow.md`; do not restate it.

## Break down into tasks

Write `tasks.md` with stable task IDs (`- [ ] T### — description`), the
actionable steps and completion check for each task, and the evidence each task
is expected to produce. Keep tasks proportional to the plan: small repairs do
not need invented multi-step scaffolding, but every task needs a concrete
completion check. Order a small complete path to the first useful demonstration
before independent breadth, with each completion check naming its observable
checkpoint, per the shared guidance in `.sdw/agents/shared/workflow.md`. Before
handing off a task, assess the actual delegated unit rather than the task count,
and give each actionable unit finite completion evidence and a decision owner
for any material gap. Timing and progress constraints come from the recorded
agreement rather than an invented command, retry, model-call, or execution
allowance.

For hardened work, `tasks.md` repeats the hardened declaration and adds an
exact `## Negative-Space Readiness Audit` and task entries whose fields are
`Satisfies`, `Verifies`, `Depends on`, `Cohesion group`, `Authority`,
`Mutation boundary`, `Preserved invariants`, `Adversarial cases`,
`Completion check`, and `Evidence`. Map every task to its V route, keep coupled
work in one cohesion group, and record one pending or interpreted evidence item
per `Verifies` ID. When the agreed assurance approach explicitly chooses a
protected verification seed, split verification seeding from production
implementation into two dependent tasks: the seed task is tests/oracles only and
stops before production edits, and the implementation task's authority excludes
the protected seed set. A new test, hardened assurance, or cross-context work
alone does not force that split. Standard tasks keep the concise shape.

Record the durable location early: when the work will live on a branch, set the
optional `branch` and `candidate` references in `next.md` so a resume can
resolve the handoff; records are committed on the work item's branch by default,
and intentional untracking is a repository `.gitignore` entry, not a
`durability` reason. The shared durability rule lives in
`.sdw/agents/shared/workflow.md`.

## Plan approval

Save the records, update `next.md` last (fields plus the Agreement describing
what is authorized next and where to stop), and run:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> plan
```

Present the package for approval in the plain-summary contract. At approval,
state the effective Delivery policy (project default plus any item override, or
the named default when the project has none) in plain language and record it in
the Agreement; the rule lives in `.sdw/agents/shared/workflow.md` §Delivery
policy. When the work ships through more than one pull request, record the
split in the Agreement as well: the slices, their order, and which pull
request is the last. Without that record the item ships through one pull request.
Approval covers the scope, specification, plan, tasks, and Delivery policy at
once. Apply the planning gate in §Planning and assess: stop for approval unless
the request was precise and already authorized. After approval, record
`next_agent: sdw.implement` and continue under the progression loop when the
lifecycle session owns you.

If a part of the package needs access, authority, or input that is absent, leave
it pending and record the exact gap and owner. Do not begin implementation
because the plan or tasks now exist. When the user requested an earlier boundary
(scope only, plan before tasks, planning only) or task preparation for another
model, record that stop precisely in `next.md` (condition and owner, or ready
status with the outgoing-session stop and the incoming session authorized to
resume) and stop. Worktrees: record the work identity so an inherited checkout
can be detected (see `next.md` Work context); parallel work owns separate
records.
