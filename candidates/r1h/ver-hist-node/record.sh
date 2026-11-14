#!/bin/bash
# Writes the record of ver-hist-node (candidates/r1h/ver-hist-node/STATUS.json) with the full list of commands, from the repository root.
# Every --test command is run by record.mjs and must exit 0; the last one reads the two logs of the paired run (run-suites.sh), so the record cannot say passes without them.
#   run-suites.sh calls this at its end, still holding the machine lock; run by hand only behind the lock:
#   tools/horde/bench.sh bash candidates/r1h/ver-hist-node/record.sh
# Red first: the same atime test command on the tree before the change (the old times.mjs) stops with a SyntaxError under the default Node; the capture is red-atime-node22.log.
cd "$(dirname "$0")/../../.." || exit 2
exec node candidates/r1h/_lib/record.mjs ver-hist-node \
  --test "node --test tests/historian/times-node22.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/times-node22.test.mjs" \
  --test "node --test tests/historian/verify-ingest-clock.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/verify-ingest-clock.test.mjs" \
  --test "node --test tests/historian/atime.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/atime.test.mjs" \
  --test "node candidates/r1h/ver-hist-node/check-totals.mjs" \
  --red-cmd "node --test tests/historian/atime.test.mjs" --red-exit 1 --red-log candidates/r1h/ver-hist-node/red-atime-node22.log \
  --files tools/historian/ingest/times.mjs,tests/historian/times-node22.test.mjs,candidates/r1h/ver-hist-node/STATUS.json,candidates/r1h/ver-hist-node/HANDOFF.md
