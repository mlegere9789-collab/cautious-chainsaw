#!/usr/bin/env bash
# Re-run the read-only checks of GATE-SPEC.md and save each output as <check>_v4.out (or the suffix given as the first argument).
# All are light (a few seconds of CPU); none writes anything but its output file. Usage: bash run_checks.sh [suffix]
set -u
cd "$(dirname "$0")"
suf="${1:-v4}"; rc=0
python3 -I check_gs_structure.py   > "check_gs_structure_${suf}.out" 2>&1; c=$?; echo "check_gs_structure exit=$c"; [ $c -ne 0 ] && rc=1
python3 -I ../spec-a-evidence/check_quotes.py ../GATE-SPEC.md > "check_quotes_${suf}.out" 2>&1; echo "check_quotes done"
python3 -I ../spec-a-evidence/check_pages.py  ../GATE-SPEC.md > "check_pages_${suf}.out"  2>&1; echo "check_pages done"
python3 -I check_gs_paths.py       > "check_gs_paths_${suf}.out" 2>&1; c=$?; echo "check_gs_paths exit=$c"; [ $c -ne 0 ] && rc=1
python3 -I check_gs_counts.py      > "check_gs_counts_${suf}.out" 2>&1; c=$?; echo "check_gs_counts exit=$c"; [ $c -ne 0 ] && rc=1
bash negative_controls.sh          > "negative_controls_${suf}.out" 2>&1; c=$?; echo "negative_controls exit=$c"; [ $c -ne 0 ] && rc=1
exit $rc
