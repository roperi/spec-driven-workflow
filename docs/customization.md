# Customization

Edit the work artifacts in `.sdw/work/<work-id>/` to fit the project. Add
project-specific constraints, acceptance criteria, tasks, and validation
commands there. Keep the canonical prompts under `.sdw/agents/` aligned with
the source package; managed prompt files are updated through `update.sh` and
are protected by `.sdw/install.json`.

Project instructions in `AGENTS.md`/`CLAUDE.md`, Codex configuration, OpenCode
configuration, Claude Code configuration, `.sdw/work/`, and
`.sdw/project-context/` remain user-owned. The installer preserves their unrelated
content. Do not put credentials or private raw logs in tracked work artifacts.
Keep raw or bulk output in an ignored location or an external archive and cite
it by pointer, as the shared retention rule requires.

Edit `.sdw/project-context/constitution.md` and
`.sdw/project-context/technical-context.md` deliberately as the project's durable
law and technical orientation. The constitution is a preamble plus a few
project-specific, checkable articles; it governs how specifications become code,
so operational procedure (commands, stack, boundaries, data handling) belongs in
the technical context and product direction belongs in the roadmap or product
docs. The technical context is the current stack, repository map, commands,
environment, and boundaries. Keep both concise, reuse
existing project documents instead of duplicating them, and replace all template
guidance and placeholders with real content. SDW reads them across work items;
their guidance templates live in `.sdw/templates/`.

## Adopting updated guidance

Updating SDW refreshes the managed prompts and templates under `.sdw/agents/`
and `.sdw/templates/`; it never creates or modifies `.sdw/project-context/` or
`.sdw/work/`. Treat these as three separate actions, in plain language:

1. **Updating managed guidance.** Run `update.sh` as usual; this is what changes
   the instructions and templates.
2. **Changing project-owned context.** Your constitution is your own durable
   law. The shipped `.sdw/templates/constitution.md` is an authoring worksheet,
   not adopted law. If the new guidance suggests an article your project does not
   have, decide deliberately whether to adopt it through your project's
   amendment route; SDW does not silently overwrite, migrate, or override an
   existing constitution.
3. **Re-assessing an existing plan.** New guidance does not by itself rewrite
   approval or restart unaffected work. Apply it to new planning, or to affected
   boundaries with the recorded owner; an existing approved plan continues until
   the owner decides otherwise.

See the early-demonstrable-value and material-decision rule in
`.sdw/agents/shared/workflow.md`.
