# AGENTS.md

Read `README.md` and the relevant canonical prompt under `.sdw/agents/` before
starting workflow work. When the user explicitly asks for SDW or spec-driven work,
`sdw.workflow` owns creating `.sdw/work/<work-id>/` and the initial artifacts; use
`sdw.resume` to continue an existing work item. Do not activate SDW for unrelated
requests. Continue from
`.sdw/work/<work-id>/` and use `node .sdw/sdw.mjs` for starts, saves, checks,
and read-only resume.

The project owns its instructions and configuration. Preserve user-owned
files, model settings, permissions, harness configuration, and unrelated
changes. Workflow stages stop where `next.md` says they stop; no automatic
approval or publication is implied.
