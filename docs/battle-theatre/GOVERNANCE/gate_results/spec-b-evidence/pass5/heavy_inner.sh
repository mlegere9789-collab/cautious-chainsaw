#!/bin/bash
# The heavy runs of the fifth pass of GATE-SPEC-B.md (2026-11-15, after 22:55 UTC) as ONE locked job. Start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5/heavy_inner.sh
# It takes one slot of the machine lock once and runs its steps one after the other, cheapest first so that partial results exist early.
# The steps are those of pass4/heavy_inner.sh, so that the figures are comparable:
#   1 the browser capability probe after the container restart (1.9 s at the fourth pass);
#   2 the heavy realization test file of tests/governance (realize-inputs.test.mjs, 119 s at the fourth pass);
#   3 the two test files of tests/bt-pack (the packer and the copy audit of the shipped dist; 3 copy-audit tests failed at the fourth pass);
#   4 tools/bt/check_figures.py WITHOUT --write (it reads the kit tables, which other workstreams keep rewriting; 99.6 s at the fourth pass);
#   5 the whole node suite of docs/battle-theatre/app/tests/*.test.mjs, once (658 tests, 313 s at the fourth pass).
# Every output goes to this folder; the raw TAP of the node suite goes to tmp/bt-gates/ (scratch, gitignored). Nothing else is written
# (the pack tests write into an OS temp directory they remove; check_figures.py without --write writes nothing).
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5
S=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
mkdir -p tmp/bt-gates
: > "$E/heavy-runs.tsv"
echo "locked job started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy-runs.tsv"
step() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  "$@" > "tmp/bt-gates/p5-$name.raw" 2>&1; rc=$?
  e=$(date +%s.%N)
  { echo "# $*   start $t0   exit $rc   wall $(printf '%.1f' "$(echo "$e - $s" | bc)") s"
    case "$name" in
      *test*|node_suite) python3 -I "$S/summarize_tap.py" "tmp/bt-gates/p5-$name.raw" ;;
      *) tail -n 60 "tmp/bt-gates/p5-$name.raw" ;;
    esac; } > "$E/$name.out" 2>&1
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/heavy-runs.tsv"
}
step browser_caps  node "$S/browser_caps.mjs"
step realize_inputs_test node --test --test-reporter=tap tests/governance/realize-inputs.test.mjs
step bt_pack_test  node --test --test-reporter=tap tests/bt-pack/pack.test.mjs tests/bt-pack/verify.test.mjs
step check_figures python3 -I tools/bt/check_figures.py --quiet
head=$(git rev-parse --short HEAD)
step node_suite    node --test --test-concurrency=2 --test-reporter=tap docs/battle-theatre/app/tests/*.test.mjs
echo "# HEAD at the start of the node suite step: $head" >> "$E/node_suite.out"
# keep the raw TAP of the node suite for the 'not ok' details (scratch folder, not committed)
cp "tmp/bt-gates/p5-node_suite.raw" "tmp/bt-gates/node-suite-p5.tap" 2>/dev/null
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
