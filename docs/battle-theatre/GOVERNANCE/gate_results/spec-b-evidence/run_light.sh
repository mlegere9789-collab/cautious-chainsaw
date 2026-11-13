#!/bin/bash
# Light checks that GATE-SPEC-B.md section 7 cites. Each runs in well under 30 s of CPU; none needs the machine lock.
# Usage: bash run_light.sh   (from anywhere). Writes <name>.out and appends one line per command to light-runs.tsv.
# check_governance.py rewrites GOVERNANCE/check_report.json (a file of the bt-gates workstream); nothing else is written outside this folder.
cd "$(dirname "$0")/../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8
run() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  timeout 600 "$@" > "$E/$name.out" 2>&1; rc=$?
  e=$(date +%s.%N)
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/light-runs.tsv"
}
: > "$E/light-runs.tsv"
run check_governance   python tools/bt/check_governance.py
run check_coverage     python tools/bt/check_coverage.py
run test_coverage_py   python tests/governance/test_coverage.py
run coverage_test_mjs  node --test tests/governance/coverage.test.mjs
run check_arrivals     python tools/bt/check_arrivals.py
run check_kit_quiet    python tools/bt/check_kit.py --quiet
run check_structures   python tools/bt/check_structures.py
