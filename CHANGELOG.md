# Changelog

All notable user-facing changes to Spec Driven Workflow are documented in this
file.

## [Unreleased]

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
