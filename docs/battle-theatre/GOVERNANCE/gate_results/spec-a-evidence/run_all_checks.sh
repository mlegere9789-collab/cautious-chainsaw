#!/usr/bin/env bash
# Re-run the six read-only checks of GATE-SPEC-A.md and save their output as <check>_v3.out (or the suffix given as the first argument).
# Each check reads the plan text, the spec and the governance files and writes nothing else; all are light (a few seconds of CPU).
# The other scripts of this folder (facts_a.py, library_words.py, corrections_census.py, night_count.mjs) are cited by name in section 11.3 of the spec.
# Usage: bash run_all_checks.sh [suffix]
set -u
cd "$(dirname "$0")"
suf="${1:-v3}"
rc=0
for s in check_counts check_structure check_gate_parts check_paths check_pages check_quotes; do
  python3 -I "$s.py" > "${s}_${suf}.out" 2>&1; code=$?
  echo "$s exit=$code"; [ $code -ne 0 ] && rc=1
done
exit $rc
