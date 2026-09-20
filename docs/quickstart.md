# Quick start

From a checked-out consumer repository, run the public launcher and select the
native projections you use:

```bash
bash install.sh --tools codex,opencode
```

The launcher installs the shared helper and canonical prompts under `.sdw/`,
then renders the selected native files. It does not change global harness
configuration. Keep `AGENTS.md` project instructions; the installer adds one
marker-delimited workflow block.

Start a work item by invoking the installed `sdw.workflow` entrypoint with
your objective. The primary session creates `.sdw/work/<work-id>/` and its
initial artifacts; you do not need to initialize the helper separately.

For a new or non-trivial project, that first session also checks for project
context under `.sdw/project-context/` — a constitution of durable, checkable
articles and a technical context. If none exists it asks a few plain-language
questions and records a minimal version from the shipped guidance templates, so
later work stays aligned. Trivial edits in a repository whose conventions are
already visible do not need this.

For Codex, use the direct primary-session route:

```bash
codex --cd . "Use SDW sdw.workflow for work item fix-login-timeout: Fix the login timeout."
```

For OpenCode, select the installed primary agent:

```bash
opencode run --dir . --agent sdw.workflow "Use work item fix-login-timeout: Fix the login timeout."
```

The primary lifecycle session may continue through scope, specification, and
planning when your request authorizes that work. It must preserve an explicit
planning-only stop in `next.md`. For genuinely small work it records the compact
`work.md` shape instead of the normal seven-file set. To inspect a saved handoff
without changing it, run:

```bash
node .sdw/sdw.mjs resume .sdw/work/fix-login-timeout
```

For a small documentation task, the session can create a scope, plan, and
tasks document, stop after planning, and leave `next.md` naming that stop. A
later session reads the handoff, runs the relevant `check` activity, then
continues only after resolving any reported inconsistency.

Ordinary normal work stays standard: the only added planning step is recording
`Assurance profile: standard` in `plan.md`. Hardened work is opt-in for
safety-boundary changes and adds traceability, readiness, and evidence fields;
see [reference.md](reference.md) for the profiles and gates.

Update installed prompts after reviewing the dry run:

```bash
bash update.sh --dry-run
bash update.sh
```

Updates preserve the selected tools from `.sdw/install.json` and refuse locally
modified owned files. Read [reference.md](reference.md) for artifact commands.
