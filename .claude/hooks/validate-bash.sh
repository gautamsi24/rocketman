#!/usr/bin/env bash
# PreToolUse hook — validates Bash commands before execution.
# Blocks patterns that are destructive or irreversible without explicit intent.
# Input: JSON on stdin with { "tool_name": "...", "tool_input": { "command": "..." } }

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')

# Block force-push to main/master
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f).*(main|master)'; then
  echo '{"decision":"block","reason":"Force-push to main/master is not allowed. Use a feature branch."}'
  exit 0
fi

# Block hard reset (destructive)
if echo "$COMMAND" | grep -qE 'git reset --hard'; then
  echo '{"decision":"block","reason":"git reset --hard discards uncommitted work. Confirm you want this before running manually."}'
  exit 0
fi

# Block rm -rf on source directories (protect source files)
if echo "$COMMAND" | grep -qE 'rm -rf.*(app|lib|components|supabase|\.claude)'; then
  echo '{"decision":"block","reason":"Refusing to delete source directories. Delete files individually if intentional."}'
  exit 0
fi

# Allow everything else
echo '{"decision":"approve"}'
