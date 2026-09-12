# Shared SDW lifecycle instructions

This file is shared workflow content installed by SDW. It is not a selectable
agent; the sdw.workflow and sdw.resume entrypoints read it in their primary
session, and every sdw.* stage prompt applies the relevant part of it. Every sdw.* prompt reads the relevant part of its content in the same
primary session; a stage never requires spawning another agent process.

## Progression loop

When you own a stage responsibility (sdw.scope, sdw.spec, sdw.plan, sdw.task,
sdw.execute, sdw.validate, sdw.review, sdw.publish, sdw.finalize,
sdw.retrospect, sdw.wrap):

1. Read the work item's `next.md` and the prerequisite records for your
   responsibility. Reconcile the saved context against the actual repository
   state before editing.
2. Perform that responsibility and save its named artifact. Report completion
   with enough evidence for another session to verify it.
3. Record the next responsibility explicitly in `next.md` (work_id,
   record_format, next_agent, status, plus the Agreement / Next action /
   Waiting on / Work context sections) and run the matching helper check.
4. When the primary lifecycle session (sdw.workflow) is running, continue by
   applying the next canonical instructions in this same session within the
   recorded agreement. Do not end the user session merely because a stage
   completed, and do not spawn a new agent for the next stage.
5. Stop only for a user-requested boundary or handoff, a material decision or
   missing prerequisite outside the agreement, or completed work. Failed
   checks prompt bounded repair inside the authorized scope.

## Direct bounded-stage invocation

A directly invoked stage prompt performs its requested responsibility, records
the next one, and stops. It does not gain broader delivery authority, and it
does not end a lifecycle session that invoked it in place: the lifecycle
session keeps control after the stage completes.

## Stopping and handoff

Record an explicit stop in `next.md` status (`waiting`) plus its condition and
owner, or as a precise instruction in the Agreement section when the outgoing
session must stop while the incoming session is authorized to start. Existing
authority persists across stages and fresh sessions; a newer explicit
review-only, plan-only, or other bounded instruction constrains only its own
session. A missing reply is never approval. Publication, merge, deletion of
alternatives, and migration of another project require actual applicable
authority beyond a generic request.

## Saving checkpoints

Save substantive artifacts before `next.md`; `next.md` is written last as the
entry pointer. Saves are atomic per file, not a multi-file transaction. On
resume after an interruption, inspect actual results before retrying, never
overwrite partial edits, and never repeat an uncertain external action
blindly.

## Records

Normal work uses `scope.md`, `spec.md`, `plan.md`, `tasks.md`,
`validation.md`, `next.md`, and `retrospect.md` as each responsibility
occurs, with optional `review.md` or other linked evidence. Genuinely small or
bounded work may use the compact `work.md` plus `next.md` shape instead;
expand explicitly if the work grows, keeping one mutable authority. Do not
manufacture completed work to fill a template; honest pending or unresolved
sections are correct when they are true.
