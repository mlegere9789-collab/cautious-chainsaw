#!/bin/bash
# The heavy runs of the fourth pass of GATE-SPEC-B.md (2026-11-14, after 00:10 UTC) as ONE locked job. Start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass4/heavy_inner.sh
# It takes one slot of the machine lock once and runs its steps one after the other, cheapest first so that partial results exist early:
#   1 the browser capability probe after the container restart (1.8 s at the second pass);
#   2 the heavy realization test file of tests/governance (realize-inputs.test.mjs; it did not finish in two minutes when started by hand);
#   3 the two test files of tests/bt-pack (the packer and the copy audit of the shipped dist);
#   4 tools/bt/check_figures.py WITHOUT --write (the kit tables were rewritten at 23:56 UTC, so the stored figures-validation.json may be stale);
#   5 the whole node suite of docs/battle-theatre/app/tests/*.test.mjs, once.
# Every output goes to this folder; the raw TAP of the node suite goes to tmp/bt-gates/ (scratch, gitignored). Nothing else is written
# (the pack tests write into an OS temp directory they remove; check_figures.py without --write writes nothing).
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass4
S=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
mkdir -p tmp/bt-gates
: > "$E/heavy-runs.tsv"
echo "locked job started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy-runs.tsv"
step() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  "$@" > "tmp/bt-gates/p4-$name.raw" 2>&1; rc=$?
  e=$(date +%s.%N)
  { echo "# $*   start $t0   exit $rc   wall $(printf '%.1f' "$(echo "$e - $s" | bc)") s"
    case "$name" in
      *test*|node_suite) python3 -I "$S/summarize_tap.py" "tmp/bt-gates/p4-$name.raw" ;;
      *) tail -n 60 "tmp/bt-gates/p4-$name.raw" ;;
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
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
