# Changelog

All notable user-facing changes to Spec Driven Workflow are documented in this
file.

## [Unreleased]

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
