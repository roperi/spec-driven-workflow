// Canonical SDW agent inventory.
//
// Single source of truth for the thirteen sdw.* agents. The helper, renderer,
// and installer consume this module so their inventories cannot drift.
// agents/shared/workflow.md is shared lifecycle instruction content, not a
// native selectable agent; it must never be counted or projected as one.

export const SHARED_WORKFLOW_FILE = 'shared/workflow.md'

export const AGENTS = Object.freeze({
  'sdw.workflow': {
    description: 'Own an authorized SDW work item through its full lifecycle: start, progress, stop, or hand it off explicitly.',
    entrypoint: true,
  },
  'sdw.resume': {
    description: 'Inspect a saved SDW work item and its actual repository state, then continue the authorized work without inventing state.',
    entrypoint: true,
  },
  'sdw.scope': {
    description: 'Agree and record the bounded contribution, rationale, exclusions, constraints, and useful result of a work item.',
  },
  'sdw.spec': {
    description: 'Turn an agreed scope into intended behavior, acceptance criteria, and validation targets.',
  },
  'sdw.plan': {
    description: 'Turn scope and specification into a technical implementation and verification plan with explicit stops.',
  },
  'sdw.task': {
    description: 'Break an approved plan into actionable tasks with stable IDs, steps, and completion checks.',
  },
  'sdw.execute': {
    description: 'Implement one authorized task and save its checkpoint evidence and next action.',
  },
  'sdw.validate': {
    description: 'Run the checks appropriate to the changed surface and record exact commands, results, and limitations.',
  },
  'sdw.review': {
    description: 'Review a candidate and report findings, distinguishing ordinary code review from independently requested review.',
  },
  'sdw.publish': {
    description: 'Publish an accepted candidate through authorized channels with truthful source and publication evidence.',
  },
  'sdw.finalize': {
    description: 'Reconcile the actual delivered result and perform only ordinary Git cleanup that is authorized.',
  },
  'sdw.retrospect': {
    description: 'Record the evidence-based outcome, what worked, friction, and bounded follow-up.',
  },
  'sdw.wrap': {
    description: 'Record work-item closure, preserve relevant records and context, and close the work item honestly.',
  },
})

export const AGENT_FILES = Object.freeze(Object.keys(AGENTS).map((id) => `${id}.md`))

// sdw.workflow and sdw.resume are entrypoints, not next responsibilities.
// next.md records one of the eleven bounded responsibilities, or none.
export const ENTRYPOINT_AGENTS = Object.freeze(
  Object.keys(AGENTS).filter((id) => AGENTS[id].entrypoint === true),
)

// Declaration order here is the canonical lifecycle order (scope through wrap);
// the helper uses it to decide whether a record has advanced past a
// responsibility whose artifact must exist at completion.
export const NEXT_RESPONSIBILITIES = Object.freeze(
  Object.keys(AGENTS).filter((id) => AGENTS[id].entrypoint !== true),
)

export const RECORD_FORMATS = Object.freeze(['normal', 'compact'])
// ready     — a local next responsibility is pending; no external wait.
// waiting   — externally blocked on a person, credential, service, or condition.
// reconcile — an external action is observable as complete but the record has
//             not been reconciled against it.
// complete  — terminal: the authorized endpoint was reached.
// abandoned — terminal: the work ended without completion or was superseded.
export const RECORD_STATUSES = Object.freeze(['ready', 'waiting', 'reconcile', 'complete', 'abandoned'])
export const TERMINAL_RECORD_STATUSES = Object.freeze(['complete', 'abandoned'])
export const PENDING_RECORD_STATUSES = Object.freeze(['waiting', 'reconcile', 'abandoned'])

// Declared completion path for normal records. `full` (the default when the
// field is absent) requires the review and retrospect artifacts at completion;
// `planning-only` is bounded at planning; the remaining kinds are explicit
// recorded exceptions that stay distinguishable from a completed item.
// full          — the authorized full lifecycle endpoint.
// planning-only — the authorized endpoint is planning; review/retrospect do not apply.
// parked        — intentionally paused with a recorded condition/owner.
// interrupted   — stopped before its endpoint by session loss or an internal blocker.
// superseded    — replaced by another work item, with the reason recorded.
// abandoned     — ended without completion, with the reason recorded.
export const CLOSURE_KINDS = Object.freeze(['full', 'planning-only', 'parked', 'interrupted', 'superseded', 'abandoned'])

// The four fixed record fields are required; `closure` is optional and defaults
// to 'full', so records written before this field stay readable.
//
// Durable-continuity references are also optional and default to absent:
//   branch     — the branch where the durable copy of this work item lives.
//   candidate  — the exact candidate commit the record names.
//   durability — an explicit recorded reason that permits an intentionally
//                untracked or branch-only record; without it an untracked work
//                directory is reported as not durable.
// The read-only assessment reads live Git state; these fields carry the
// reference, not a claim the helper can infer.
export const NEXT_FIELDS = Object.freeze(['work_id', 'record_format', 'next_agent', 'status'])
export const NEXT_OPTIONAL_FIELDS = Object.freeze(['closure', 'branch', 'candidate', 'durability'])
export const NEXT_ALL_FIELDS = Object.freeze([...NEXT_FIELDS, ...NEXT_OPTIONAL_FIELDS])
