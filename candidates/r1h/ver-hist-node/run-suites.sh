#!/bin/bash
# The acceptance run of ver-hist-node: the whole tests/historian suite under the container's default Node and under Node 24, one after the other, on the same tree, alone on the machine
# (engine.test.mjs holds a latency assertion, so the two runs must not compete with other jobs for the CPU):
#   tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh
# Writes candidates/r1h/ver-hist-node/suite-node22.log and suite-node24.log; node candidates/r1h/ver-hist-node/check-totals.mjs reads them.
# 2026-11-14 (merge pass): other entries of the same batch write NEW files into these directories while this job waits for the lock or runs (wp-hist-36, wp-hist-22-units,
# wp-time-05, wp-time-18), so the two things that must be equal for both runs are fixed once, at the start, instead of being read again from the live tree:
#   * the list of test files: both runs get the same explicit list (the shell glob of tests/historian/*.test.mjs expanded once), so a test file added meanwhile is in neither run;
#   * the content hash covers the files that existed at the start (the list is kept in the log's directory): an edit or a deletion of such a file during either run still
#     changes the hash and is reported by check-totals.mjs; a new file that nothing in the first run could have read does not.
#   The one kind of file left out of the hash is a TypeScript declaration (*.d.ts): Node never loads one and no test of the historian reads one (a search of tools/historian, tests/historian,
#   historian-src, src/lib/time and data-src/time finds no reference to a .d.ts), while wp-time-18 edits src/lib/time/index.d.ts; an edit of a file no run can read must not void a run that costs hours of waiting.
# 2026-11-14 (record step): a second wait for the lock after this one can take as long as the first, so the job does not end at the two logs. Still under the exclusive lock it reads the logs
# (check-totals.mjs --write: totals, exit codes, tree hashes, per-test outcomes, merged into STATUS.json as node_totals) and, only when that holds, writes the record with the full command list
# (record.sh: record.mjs runs every command and sets passes from their exit codes). The output of both steps is kept in tmp/r1h-cand/ver-hist-node/check-totals.out and record.out.
# VHN_NO_RECORD=1 in the environment stops the job after the two logs.
cd "$(dirname "$0")/../../.." || exit 2
O=candidates/r1h/ver-hist-node
# a content hash of what the historian suites read: the tools, the tests, the sources and the committed hx, the time model's code and its anchors (another job editing files elsewhere does not matter)
TREE_DIRS="tools/historian tests/historian historian-src src/lib/time data-src/time"
LIST=$O/.files-at-start.list0
find $TREE_DIRS -type f -not -path '*/node_modules/*' -not -name '*.d.ts' -print0 | sort -z > "$LIST"
tree() { xargs -0 -a "$LIST" sha256sum 2>&1 | sha256sum | cut -c1-12; }   # a file that vanished adds an error line, so the hash changes
TESTS=$(ls tests/historian/*.test.mjs)
for v in 22 24; do
  if [ "$v" = 22 ]; then N=node; else N=/opt/node24/bin/node; fi
  L=$O/suite-node$v.log
  { echo "# ver-hist-node: node --test tests/historian/*.test.mjs"
    echo "# node: $($N --version) ($(command -v $N))"
    echo "# started: $(date -u +%FT%TZ), load average $(cut -d' ' -f1-3 /proc/loadavg)"
    echo "# tools/historian/ingest/times.mjs blob $(git hash-object tools/historian/ingest/times.mjs), tests/historian/times-node22.test.mjs blob $(git hash-object tests/historian/times-node22.test.mjs)"
    echo "# test files: $(echo "$TESTS" | wc -l); content hash of $TREE_DIRS at the start: $(tree)"
    echo "#"; } > "$L"
  $N --test $TESTS >> "$L" 2>&1; rc=$?
  { echo "# finished: $(date -u +%FT%TZ), load average $(cut -d' ' -f1-3 /proc/loadavg); content hash at the end: $(tree)"; echo "# exit: $rc"; } >> "$L"
done
if [ "${VHN_NO_RECORD:-0}" != 1 ]; then
  P=tmp/r1h-cand/ver-hist-node; mkdir -p "$P"
  node $O/check-totals.mjs --write > "$P/check-totals.out" 2>&1; crc=$?
  if [ "$crc" = 0 ]; then
    bash $O/record.sh > "$P/record.out" 2>&1; rrc=$?; echo "# record.sh exit: $rrc" >> "$P/record.out"
  else
    echo "# check-totals.mjs exit: $crc; the record was not written (see check-totals.out)" > "$P/record.out"
  fi
fi
