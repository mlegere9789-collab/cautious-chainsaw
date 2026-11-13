#!/bin/bash
# The runs of GATE-SPEC-B.md section 7 that need more than about 30 s of CPU or a browser. Each goes through the machine lock (tools/horde/bench.sh), one after the other, so this
# script holds at most one slot at a time. The raw TAP of the node suite goes to tmp/bt-gates/ (scratch); its summary and every other output go to this folder.
# Usage: bash run_heavy.sh   (from anywhere; it can wait a long time for its turns: do not kill it)
cd "$(dirname "$0")/../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8
mkdir -p tmp/bt-gates
step() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  tools/horde/bench.sh "$@" > "$E/$name.out" 2>&1; rc=$?
  e=$(date +%s.%N)
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/heavy-runs.tsv"
}
: > "$E/heavy-runs.tsv"
step browser_caps       node "$E/browser_caps.mjs"
step q11_q22_inmemory   tmp/bt-gates/venv-astropy/bin/python "$E/q11_q22_inmemory.py"
step drill_check_scratch python -I "$E/drill_check_scratch.py"
# the whole node suite, once (CLAUDE.md of the horde: at most once, at the end, through the lock)
s=$(date +%s.%N); t0=$(date -u +%FT%TZ); head=$(git rev-parse --short HEAD)
tools/horde/bench.sh node --test --test-concurrency=2 --test-reporter=tap docs/battle-theatre/app/tests/*.test.mjs > tmp/bt-gates/node-suite.tap 2>&1; rc=$?
e=$(date +%s.%N)
{ echo "# node --test --test-concurrency=2 docs/battle-theatre/app/tests/*.test.mjs   start $t0   HEAD $head   exit $rc   wall $(printf '%.1f' "$(echo "$e - $s" | bc)") s   (includes any wait for the machine lock)"
  python3 -I "$E/summarize_tap.py" tmp/bt-gates/node-suite.tap; } > "$E/node-suite-summary.out" 2>&1
printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" node_suite "$rc" "$(echo "$e - $s" | bc)" "node --test --test-concurrency=2 app/tests/*.test.mjs" >> "$E/heavy-runs.tsv"
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-runs.tsv"
