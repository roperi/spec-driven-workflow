# Customization

Edit the work artifacts in `.sdw/work/<work-id>/` to fit the project. Add
project-specific constraints, acceptance criteria, tasks, and validation
commands there. Keep the canonical prompts under `.sdw/agents/` aligned with
the source package; managed prompt files are updated through `update.sh` and
are protected by `.sdw/install.json`.

Project instructions in `AGENTS.md`, Codex configuration, OpenCode
configuration, `.sdw/work/`, and `.sdw/project-context/` remain user-owned.
The installer preserves their unrelated content. Do not put credentials or
private raw logs in tracked work artifacts.

Edit `.sdw/project-context/constitution.md` and
`.sdw/project-context/technical-context.md` deliberately as the project's durable
principles and technical orientation. Keep them concise, and reuse existing
project documents instead of duplicating their content. SDW reads them across
work items; their templates live in `.sdw/templates/`.
