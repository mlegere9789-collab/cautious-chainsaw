#!/bin/bash
# The heavy runs of the third pass of GATE-SPEC-B.md (2026-11-13, after 23:00 UTC) as ONE locked job: start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass3/heavy_inner.sh
# Steps, cheapest first so that partial results exist early: the vegetation gate hook on the committed data, the three realization test files of tests/governance, the two pack test files of
# tests/bt-pack (the copy audit of the shipped dist), then the whole node suite of the app (once). It takes one slot of the machine lock once; every output goes to this folder; the raw TAP of
# the node suite goes to tmp/bt-gates/ (scratch, not committed). The pack tests write into an OS temp directory they remove; nothing else is written.
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass3
export PYTHONIOENCODING=utf-8
mkdir -p tmp/bt-gates
: > "$E/heavy-runs.tsv"
echo "locked job started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy-runs.tsv"
tap() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  "$@" > "tmp/bt-gates/$name.tap" 2>&1; rc=$?
  e=$(date +%s.%N)
  { echo "# $*   start $t0   exit $rc   wall $(printf '%.1f' "$(echo "$e - $s" | bc)") s"
    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/summarize_tap.py "tmp/bt-gates/$name.tap"; } > "$E/$name.out" 2>&1
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/heavy-runs.tsv"
}
s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
node "$E/veg_check.mjs" > "$E/veg_check.out" 2>&1; rc=$?
printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" veg_check "$rc" "$(echo "$(date +%s.%N) - $s" | bc)" "node pass3/veg_check.mjs" >> "$E/heavy-runs.tsv"
tap realize_tests node --test --test-reporter=tap tests/governance/realize.test.mjs tests/governance/realize-rules.test.mjs tests/governance/realize-inputs.test.mjs
tap bt_pack_tests node --test --test-reporter=tap tests/bt-pack/pack.test.mjs tests/bt-pack/verify.test.mjs
head=$(git rev-parse --short HEAD)
tap node_suite node --test --test-concurrency=2 --test-reporter=tap docs/battle-theatre/app/tests/*.test.mjs
echo "# HEAD at the start of the node suite step: $head" >> "$E/node_suite.out"
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
