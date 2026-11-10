#!/usr/bin/env bash
# PostToolUse: run the repo's Prettier on the file Claude just edited.
# Resolves the repo from the file itself (works in agent worktrees); never blocks.
f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
case "$f" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.md|*.css|*.scss|*.json) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0
dir=$(dirname "$f")
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || exit 0
p="$root/node_modules/.bin/prettier"
if [ ! -x "$p" ]; then
  common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
  p="$(dirname "$common")/node_modules/.bin/prettier"
fi
[ -x "$p" ] || exit 0
"$p" --write --cache --ignore-unknown "$f" >/dev/null 2>&1
exit 0
