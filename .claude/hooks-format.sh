#!/usr/bin/env bash
# PostToolUse: run this repo's Prettier on the file Claude just edited.
# Only files inside this repository or one of its git worktrees are formatted,
# and only with this repository's own Prettier binary. Never blocks.
self_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P) || exit 0
p="$self_root/node_modules/.bin/prettier"
[ -x "$p" ] || exit 0
self_common=$(git -C "$self_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0

f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
case "$f" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.md|*.css|*.scss|*.json) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0
dir=$(cd "$(dirname "$f")" 2>/dev/null && pwd -P) || exit 0
# Same repository (main checkout or a worktree of it), otherwise skip.
file_common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
[ "$file_common" = "$self_common" ] || exit 0

"$p" --write --cache --ignore-unknown -- "$f" >/dev/null 2>&1
exit 0
