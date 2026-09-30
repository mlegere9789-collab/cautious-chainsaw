#!/usr/bin/env bash
# usage: tools/commit.sh "message" path [path...]   (retries on index.lock; commits ONLY the given paths)
msg="$1"; shift
cd "$(dirname "$0")/.."
for i in $(seq 1 40); do
  if git add -- "$@" 2>/dev/null && git commit -q -m "$msg" -- "$@" 2>/dev/null; then echo "committed: $msg"; exit 0; fi
  if git diff --cached --quiet -- "$@" 2>/dev/null && git diff --quiet -- "$@" 2>/dev/null; then echo "nothing to commit"; exit 0; fi
  sleep $((RANDOM % 3 + 1))
done
echo "commit failed after retries" >&2; exit 1
