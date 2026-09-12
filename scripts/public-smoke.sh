#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
TMP_ROOT=$(mktemp -d)
SANDBOX_ROOT="${TMP_ROOT}/consumer"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT
fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

for required in git node bash; do
  command -v "$required" >/dev/null 2>&1 || fail "missing required command: $required"
done

for relative in README.md CHANGELOG.md AGENTS.md LICENSE install.sh update.sh runtime/agents.mjs runtime/sdw.mjs runtime/installer.mjs runtime/render.mjs docs/README.md docs/quickstart.md agents/sdw.workflow.md agents/shared/workflow.md templates/tasks.md; do
  [[ -f "${REPO_ROOT}/${relative}" ]] || fail "missing public path: ${relative}"
done

mkdir -p "$SANDBOX_ROOT"
git -C "$SANDBOX_ROOT" init -q
git -C "$SANDBOX_ROOT" config user.name "Spec Driven Workflow Public Smoke"
git -C "$SANDBOX_ROOT" config user.email "spec-driven-workflow-public-smoke@example.com"
printf 'consumer instructions\n' >"${SANDBOX_ROOT}/AGENTS.md"

(
  cd "$SANDBOX_ROOT"
  SPEC_DRIVEN_WORKFLOW_SOURCE_DIR="$REPO_ROOT" bash "${REPO_ROOT}/install.sh" --tools codex,opencode
  SPEC_DRIVEN_WORKFLOW_SOURCE_DIR="$REPO_ROOT" bash "${REPO_ROOT}/update.sh" --dry-run
  SPEC_DRIVEN_WORKFLOW_SOURCE_DIR="$REPO_ROOT" bash "${REPO_ROOT}/update.sh"
)

for relative in .sdw/sdw.mjs .sdw/installer.mjs .sdw/install.json .sdw/agents/sdw.workflow.md .sdw/agents/shared/workflow.md .sdw/templates/tasks.md .sdw/docs/integrations.md .codex/agents/sdw.workflow.toml .opencode/agents/sdw.workflow.md; do
  [[ -f "${SANDBOX_ROOT}/${relative}" ]] || fail "missing installed path: ${relative}"
done
grep -q 'consumer instructions' "${SANDBOX_ROOT}/AGENTS.md" || fail 'consumer instructions were not preserved'
printf 'Public smoke passed\n'
