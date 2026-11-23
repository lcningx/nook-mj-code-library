#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link_to_dir() {
  local target_dir="$1"
  mkdir -p "$target_dir"

  ln -sfn "$REPO_ROOT" "$target_dir/mj-code-library"
  echo "[linked] $target_dir/mj-code-library -> $REPO_ROOT"

  if [ -d "$REPO_ROOT/mj-imagine" ] && [ -f "$REPO_ROOT/mj-imagine/SKILL.md" ]; then
    ln -sfn "$REPO_ROOT/mj-imagine" "$target_dir/mj-imagine"
    echo "[linked] $target_dir/mj-imagine -> $REPO_ROOT/mj-imagine"
  fi
}

if [ $# -gt 0 ]; then
  link_to_dir "$1"
else
  link_to_dir "$HOME/.gemini/config/skills"
  if [ -d "$HOME/.agents/skills" ]; then
    link_to_dir "$HOME/.agents/skills"
  fi
fi
