#!/bin/bash
# The acceptance run of ver-hist-node: the whole tests/historian suite under the container's default Node and under Node 24, one after the other, on the same tree, alone on the machine
# (engine.test.mjs holds a latency assertion, so the two runs must not compete with other jobs for the CPU):
#   tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh
# Writes candidates/r1h/ver-hist-node/suite-node22.log and suite-node24.log; node candidates/r1h/ver-hist-node/check-totals.mjs reads them.
cd "$(dirname "$0")/../.." && cd .. || exit 2
O=candidates/r1h/ver-hist-node
tree() { git status --short -- tools/historian tests/historian historian-src src data-src tools/time tools/data | sort | md5sum | cut -c1-12; }
for v in 22 24; do
  if [ "$v" = 22 ]; then N=node; else N=/opt/node24/bin/node; fi
  L=$O/suite-node$v.log
  { echo "# ver-hist-node: node --test tests/historian/*.test.mjs"
    echo "# node: $($N --version) ($(command -v $N))"
    echo "# started: $(date -u +%FT%TZ), load average $(cut -d' ' -f1-3 /proc/loadavg)"
    echo "# tools/historian/ingest/times.mjs blob $(git hash-object tools/historian/ingest/times.mjs), tests/historian/times-node22.test.mjs blob $(git hash-object tests/historian/times-node22.test.mjs)"
    echo "# test files: $(ls tests/historian/*.test.mjs | wc -l); state of the working tree under tools/historian tests/historian historian-src src data-src tools/time tools/data at the start: $(tree)"
    echo "#"; } > "$L"
  $N --test tests/historian/*.test.mjs >> "$L" 2>&1; rc=$?
  { echo "# finished: $(date -u +%FT%TZ), load average $(cut -d' ' -f1-3 /proc/loadavg); working tree state at the end: $(tree)"; echo "# exit: $rc"; } >> "$L"
done
