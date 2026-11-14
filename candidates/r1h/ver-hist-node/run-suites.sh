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
cd "$(dirname "$0")/../../.." || exit 2
O=candidates/r1h/ver-hist-node
# a content hash of what the historian suites read: the tools, the tests, the sources and the committed hx, the time model's code and its anchors (another job editing files elsewhere does not matter)
TREE_DIRS="tools/historian tests/historian historian-src src/lib/time data-src/time"
LIST=$O/.files-at-start.list0
find $TREE_DIRS -type f -not -path '*/node_modules/*' -print0 | sort -z > "$LIST"
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
