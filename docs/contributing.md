# Contributing to Spec Driven Workflow

Thanks for your interest in improving Spec Driven Workflow.

## Reporting issues

Use the project's issue tracker to report a bug or propose a feature. A good
report includes:

- what you expected to happen
- what actually happened
- the smallest reproduction you can describe
- the harness (Codex or OpenCode) and versions you used

Issues are the authoritative intake path for reports and proposals. Public pull
requests are not the development path for this project.

## Local evaluation

From a checkout of this repository, run the public smoke. It installs into an
isolated temporary Git repository and does not modify the checkout:

```bash
bash scripts/public-smoke.sh
```

To try the installer manually, create and enter a throwaway Git repository
first, then run the checkout's launcher against that directory:

```bash
fixture=$(mktemp -d)
git -C "$fixture" init -q
(
  cd "$fixture"
  SPEC_DRIVEN_WORKFLOW_SOURCE_DIR=/path/to/checkout \
    bash /path/to/checkout/install.sh --tools codex,opencode
)
```

Keep examples small, preserve user-owned files, and avoid attaching sensitive
material to an issue.
