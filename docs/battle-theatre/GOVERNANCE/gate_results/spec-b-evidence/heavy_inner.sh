#!/bin/bash
# The heavy runs of GATE-SPEC-B.md section 7 as ONE locked job: start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/heavy_inner.sh
# Steps: the browser capability probe, gates Q11 and Q22 in memory (astropy venv), drill_check against the scratch OCR texts, tools/bt/check_figures.py without --write (every drawn figure against the B.6.12 validator), the app node suite.
# It takes one slot of the machine lock once (a lock wait can be long; four separate waits would be four times that), runs the four steps one after the other, and writes every output
# to this folder; the raw TAP of the node suite goes to tmp/bt-gates/ (scratch). Nothing outside this folder, tmp/bt-gates and (as the checkers themselves do) nothing else is written.
cd "$(dirname "$0")/../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8
mkdir -p tmp/bt-gates
: > "$E/heavy-runs.tsv"
step() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  "$@" > "$E/$name.out" 2>&1; rc=$?
  e=$(date +%s.%N)
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/heavy-runs.tsv"
}
step browser_caps         node "$E/browser_caps.mjs"
step q11_q22_inmemory     tmp/bt-gates/venv-astropy/bin/python "$E/q11_q22_inmemory.py"
step drill_check_scratch  python -I "$E/drill_check_scratch.py"
step check_figures         python tools/bt/check_figures.py --quiet
# the whole node suite of the app, once
s=$(date +%s.%N); t0=$(date -u +%FT%TZ); head=$(git rev-parse --short HEAD)
node --test --test-concurrency=2 --test-reporter=tap docs/battle-theatre/app/tests/*.test.mjs > tmp/bt-gates/node-suite.tap 2>&1; rc=$?
e=$(date +%s.%N)
{ echo "# node --test --test-concurrency=2 docs/battle-theatre/app/tests/*.test.mjs   start $t0   HEAD $head   exit $rc   wall $(printf '%.1f' "$(echo "$e - $s" | bc)") s"
  python3 -I "$E/summarize_tap.py" tmp/bt-gates/node-suite.tap; } > "$E/node-suite-summary.out" 2>&1
printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" node_suite "$rc" "$(echo "$e - $s" | bc)" "node --test --test-concurrency=2 app/tests/*.test.mjs" >> "$E/heavy-runs.tsv"
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
# appended while the job was running (the first attempt of the drill step used only drill_text.LIB and failed on the two usage-search volumes that drill_check reads through drill_text.ROOT; the script now builds a scratch root):
step drill_check_scratch2 python -I "$E/drill_check_scratch.py"
echo "done2 $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
