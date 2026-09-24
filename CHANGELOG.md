# Changelog

All notable user-facing changes to Spec Driven Workflow are documented in this
file.

## [Unreleased]

- **NEW**: Durable continuity records — a work item's handoff no longer depends
  silently on an untracked directory, an unmerged branch, or a dangling commit.
  `next.md` gains three optional fields — `branch`, `candidate`, and
  `durability` — that record where the work item is durable, and `resume` plus
  the `handoff`, `finalize`, and `wrap` checks run a read-only durability
  assessment against the repository. It reports an untracked or gitignored work
  directory, a recorded candidate that is unreachable from every branch and
  remote or absent, a recorded branch that this checkout cannot see, and a
  recorded branch that does not contain the work item, naming the condition, the
  evidence source, the owner, and the next responsibility. An untracked work
  directory must now carry an explicit `durability` reason or a resolving
  reference, so the default is not silently permissive; a work directory outside
  Git control is reported as unknown and does not fail. The assessment is
  read-only and grants no commit, merge, closure, or publication authority, and
  existing records remain readable.

- **NEW**: Consistent completion — a normal work item can no longer report that
  it is complete while its review or retrospective record is missing. A normal
  `full` completion now requires `review.md` and `retrospect.md`, and a record
  that advanced past those responsibilities without the artifact is reported
  with a message that names the missing responsibility. A new optional `closure`
  field in `next.md` (`full` by default, plus the recorded exceptions
  `planning-only`, `parked`, `interrupted`, `superseded`, and `abandoned`)
  declares the completion path; a declared exception bounds the required records
  to what its endpoint produces, so planning-only and genuinely abandoned or
  superseded work stay representable without inventing artifacts. Compact work
  keeps its smaller `work.md` plus `next.md` contract, and existing records
  remain readable.

- **NEW**: Terminal-state reconciliation — a work item whose external action
  (PR merge, issue closure, publication) completed after its record was written
  can no longer stay silently marked as waiting. `next.md` status is now a closed
  set (`ready`, `waiting`, `reconcile`, `complete`, `abandoned`) that separates an
  external wait from an external action observed complete but not yet reconciled,
  and from the terminal `complete` and `abandoned`/superseded states. A new
  read-only `node .sdw/sdw.mjs reconcile <work-id>` command, also included in
  `resume`, reports the observed condition, the evidence source, and the next
  responsibility using visible local Git state without fetching or mutating
  anything. Local Git ancestry is local evidence only and does not prove a remote
  merge or issue closure; unknown or inaccessible remote state stays explicitly
  unknown, and reconciliation never grants merge, closure, or publication
  authority. Existing normal and compact records remain readable.

- **DOCS**: Constitution guardrail — the constitution guidance now states that a
  constitution governs how specifications become code (development law), not
  operational procedure or product policy. Operational detail such as commands,
  stack, boundaries, and data handling is directed to `technical-context.md`,
  product direction to the roadmap or product docs, and project-defined articles
  must be principles a reviewer can check rather than procedures.

- **DOCS**: Refreshed the project README — a clearer value proposition covering
  continuity across sessions, models, and tools, a quick start that reflects
  normal use inside your coding agent, prerequisites and install footprint, a
  "What you get" feature list, and a dated comparison table of SDW against other
  spec-driven development tools. The quick start, integrations, and product guide
  were aligned with the README, and a plain-language SDW request is now the
  documented path for both supported harnesses.

- **NEW**: Plain-language-first reporting — every SDW stage now explains what
  happened to the user in a short, plain-language summary before any technical
  detail. The summary states the outcome, what the user must decide next, each
  material decision with the alternative that was rejected, and any known risks
  or open questions, and it defines an unavoidable technical term on first use.
  The technical detail stays complete for readers who need it; the plain summary
  never replaces the record or hides a decision, risk, or failure.

- **NEW**: Self-guided project-context templates — the shipped
  `.sdw/templates/constitution.md` and `.sdw/templates/technical-context.md` now
  explain what each document is, what it is not, and how to build one from
  scratch. The constitution template follows a preamble plus numbered,
  checkable articles with enforcement and amendments; the technical-context
  template covers project and stack, repository map, authoritative commands,
  environment, and hard boundaries, with a greenfield note. Both require
  replacing every guidance comment and placeholder with project-specific
  content.

- **NEW**: Project context for new projects — on the first non-trivial work
  item, SDW checks for existing project guidance and, when none is present, asks
  a few plain-language questions and records a concise constitution and
  technical context under `.sdw/project-context/`. Trivial bounded edits in a
  repository whose conventions are already visible do not need this. Project
  context remains user-owned and is never created or overwritten by install or
  update.
- **NEW**: External review consumption — when a published candidate receives
  review findings from a human or automated reviewer, SDW records exactly one
  disposition per finding in the cumulative `review.md` (`applied`, `declined`,
  `deferred`, `duplicate`, or `escalated`) with rationale and evidence. Material
  findings are repaired and re-verified while immaterial ones are batched;
  re-raises are recognized as duplicates unless they bring new evidence; a
  factual decline needs reproduced evidence and a semantic decline about the
  implementer's own judge is never self-closed; a convergence condition with a
  recorded pass budget ends re-invocation and escalates open material findings;
  and a protected seed's claimed complete/universal oracle must be demonstrated
  by an executable probe rather than accepted declaratively. No new stage,
  artifact, required section, or runtime change.
- **NEW**: Canonical Markdown prompts for the full lifecycle — scope, spec,
  plan, task, execute, validate, review, publish, finalize, retrospect, and
  wrap — installed under `.sdw/agents/` and operating on work artifacts under
  `.sdw/work/<work-id>/`, with `sdw.workflow` as the primary entrypoint and
  `sdw.resume` for continuation.
- **NEW**: `node .sdw/sdw.mjs` helper with `init`/`start`, `save`, `check`, and a
  read-only `resume`, plus structural record checks that never infer approval
  from prose.
- **NEW**: Native Codex and OpenCode projections rendered from the same
  canonical prompt bodies, with `install.sh --tools codex,opencode` and
  `update.sh` preserving the selected tools.
