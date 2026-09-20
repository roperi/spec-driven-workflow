# Codex and OpenCode integrations

Spec Driven Workflow keeps the full instructions in `.sdw/agents/`. The
renderer derives native files from those exact bodies. It does not select a
model, reasoning setting, permission mode, external service, or global
configuration. The repository `AGENTS.md` block routes an explicit SDW request to
`sdw.workflow`, the primary entrypoint that creates the work item and initial
artifacts from your objective.

## Codex CLI

Codex project custom agents use `.codex/agents/<name>.toml` with `name`,
`description`, and `developer_instructions`. SDW omits model and reasoning
fields so the active user or harness configuration remains authoritative. The
official schema and project-scoped config rules are documented in the [Codex
configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
and [custom agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).

The direct primary-session route is:

```sh
codex --cd . "Use SDW for work item fix-login-timeout: Fix the login timeout."
```

Codex also loads repository `AGENTS.md` guidance, so a plain-language SDW request
works from an ordinary session. Start the session from the repository root or pass
the directory explicitly; keep model and reasoning choices in the normal Codex
configuration. The generated `.codex/agents/` files are available to native Codex
delegation. Codex's primary CLI does not provide a project-agent selector, so its
route uses the repository bootstrap plus a goal-only prompt. The sdw.workflow
instructions perform the work-item initialization; sdw.resume continues an
existing work item.

## OpenCode

OpenCode project agents use `.opencode/agents/<name>.md` with YAML frontmatter
and a Markdown body. SDW emits `mode: primary` and leaves model and permission
fields unset, so the active OpenCode configuration remains authoritative. The
current V2 [agent format](https://opencode.ai/v2/docs/agents/) and
[instruction discovery](https://opencode.ai/v2/docs/instructions/) are the
source for this adapter.

The direct primary-session route is:

```sh
opencode run --dir . "Use SDW for work item fix-login-timeout: Fix the login timeout."
```

OpenCode combines project `AGENTS.md` instructions with the active agent, so a
plain-language SDW request is enough from an ordinary session. The generated
`.opencode/agents/` files provide a native primary-agent surface when you want to
pin the entrypoint explicitly:

```sh
opencode run --dir . --agent sdw.workflow "Use SDW for work item fix-login-timeout: Fix the login timeout."
```

The direct `opencode run` route does not spawn a child agent. The
[OpenCode CLI reference](https://opencode.ai/docs/cli/) documents `run`,
`--dir`, and `--agent`.

## Evidence boundary

The native file format, the direct route, and a live model run are separate
claims. Format and route are checked from the generated files themselves; a
live harness run is verified separately with the harness binary and reported
with its versions and results.
