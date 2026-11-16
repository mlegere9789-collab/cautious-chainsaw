#!/bin/bash
# Locked job A of the sixth pass of GATE-SPEC-B.md (2026-11-16, from 02:30 UTC). Start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/heavy_a.sh
# One lock slot, steps one after the other, cheapest first so that partial results exist early:
#   1 the browser capability probe (after the container restart of about 02:20 UTC);
#   2 the seven gate runners that have a stored result, each run into a SCRATCH folder (tmp/bt-gates/pass6/results; GOVERNANCE/gate_results is NOT touched), to measure their cost and to compare with the stored files;
#   3 the heavy realization test file of tests/governance (realize-inputs.test.mjs: it runs check_coverage.py and compares its Q17 block with the harness);
#   4 the two test files of tests/bt-pack (the copy audit of the shipped dist);
#   5 tools/bt/check_figures.py WITHOUT --write.
# Every output goes to this folder (one .out per step, heavy-a-runs.tsv one line per step with wall and CPU seconds). Nothing else is written.
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6
S=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
R=tmp/bt-gates/pass6/results
export PYTHONIOENCODING=utf-8 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
mkdir -p "$R" tmp/bt-gates/pass6
TIMEFORMAT='%R %U %S'
: > "$E/heavy-a-runs.tsv"
echo "locked job A started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy-a-runs.tsv"
step() { name="$1"; shift
  t0=$(date -u +%FT%TZ)
  tm=$( { time "$@" > "tmp/bt-gates/pass6/$name.raw" 2>&1; echo "rc=$?" > "tmp/bt-gates/pass6/$name.rc"; } 2>&1 )
  rc=$(sed 's/rc=//' "tmp/bt-gates/pass6/$name.rc"); rm -f "tmp/bt-gates/pass6/$name.rc"
  set -- $tm
  { echo "# start $t0   exit $rc   wall $1 s   cpu $(echo "$2 + $3" | bc) s"
    case "$name" in
      *test*) python3 -I "$E/summarize_tap.py" "tmp/bt-gates/pass6/$name.raw" ;;
      *) tail -n 70 "tmp/bt-gates/pass6/$name.raw" ;;
    esac; } > "$E/$name.out" 2>&1
  printf '%s\t%s\texit %s\twall %s s\tcpu %s s\n' "$t0" "$name" "$rc" "$1" "$(echo "$2 + $3" | bc)" >> "$E/heavy-a-runs.tsv"
}
step browser_caps    node "$S/browser_caps.mjs"
step run_q25         python3 tools/bt/gates/q25_library.py --out "$R" --quiet
step run_q23         python3 tools/bt/gates/q23_marking.py --out "$R" --quiet
step run_q19         python3 tools/bt/gates/q19_claims.py --out "$R" --quiet
step run_q02         python3 tools/bt/gates/q02_provenance.py --out "$R" --quiet
step run_q01         python3 tools/bt/gates/q01_oob.py --out "$R" --quiet
step run_q14         python3 tools/bt/gates/q14_ordnance.py --out "$R" --quiet
step run_q20         python3 tools/bt/gates/q20_cavalry.py --out "$R" --quiet
step realize_inputs_test node --test --test-reporter=tap tests/governance/realize-inputs.test.mjs
step bt_pack_test    node --test --test-reporter=tap tests/bt-pack/pack.test.mjs tests/bt-pack/verify.test.mjs
step check_figures   python3 -I tools/bt/check_figures.py --quiet
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-a-runs.tsv"
