#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SOURCE_DIR="${SPEC_DRIVEN_WORKFLOW_SOURCE_DIR:-}"
REPO_URL="${SPEC_DRIVEN_WORKFLOW_REPO_URL:-https://raw.githubusercontent.com/roperi/spec-driven-workflow/main}"
RUNTIME=""
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_DIR" ]]; then rm -rf "$TEMP_DIR"; fi
}
trap cleanup EXIT

if [[ -n "$SOURCE_DIR" ]]; then
  SOURCE_DIR=$(cd "$SOURCE_DIR" 2>/dev/null && pwd) || {
    echo "sdw installer: SOURCE_UNAVAILABLE: source directory does not exist: $SOURCE_DIR" >&2
    exit 1
  }
  RUNTIME="$SOURCE_DIR/runtime/installer.mjs"
elif [[ -f "$SCRIPT_DIR/runtime/installer.mjs" ]]; then
  SOURCE_DIR="$SCRIPT_DIR"
  RUNTIME="$SOURCE_DIR/runtime/installer.mjs"
elif [[ -f "$SCRIPT_DIR/../../../runtime/installer.mjs" ]]; then
  SOURCE_DIR=$(cd "$SCRIPT_DIR/../../.." && pwd)
  RUNTIME="$SOURCE_DIR/runtime/installer.mjs"
fi

if [[ -n "$RUNTIME" ]]; then
  [[ -f "$RUNTIME" ]] || {
    echo "sdw installer: SOURCE_UNAVAILABLE: missing runtime: $RUNTIME" >&2
    exit 1
  }
  exec node "$RUNTIME" update --source-dir "$SOURCE_DIR" "$@"
fi

command -v node >/dev/null 2>&1 || {
  echo "sdw installer: PREREQUISITE: node is required for installation" >&2
  exit 1
}
TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/sdw-installer.XXXXXX") || {
  echo "sdw installer: PREREQUISITE: could not create a temporary directory" >&2
  exit 1
}
RUNTIME="$TEMP_DIR/installer.mjs"
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --location --max-time 30 "$REPO_URL/runtime/installer.mjs" --output "$RUNTIME" || {
    echo "sdw installer: SOURCE_UNAVAILABLE: could not download the installer from $REPO_URL" >&2
    exit 1
  }
elif command -v wget >/dev/null 2>&1; then
  wget --quiet --timeout=30 --output-document="$RUNTIME" "$REPO_URL/runtime/installer.mjs" || {
    echo "sdw installer: SOURCE_UNAVAILABLE: could not download the installer from $REPO_URL" >&2
    exit 1
  }
else
  echo "sdw installer: PREREQUISITE: curl or wget is required when no local source is available" >&2
  exit 1
fi
exec node "$RUNTIME" update --source-url "$REPO_URL" "$@"
