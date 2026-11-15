#!/usr/bin/env bash
# Re-run the six read-only checks of GATE-SPEC-A.md and save their output as <check>_<suffix>.out (default v4), then say whether all six are clean.
# Each check reads the plan text, the spec and the governance files and writes nothing else; all are light (a few seconds of CPU).
# The other scripts of this folder (facts_a.py, library_words.py, corrections_census.py, night_count.mjs) are cited by name in section 11.3 of the spec.
# Exit 1 when any check reports a problem (report_problems.py); a STALE soft count is listed and is not a problem.
# Usage: bash run_all_checks.sh [suffix]
set -u
cd "$(dirname "$0")"
suf="${1:-v4}"
for s in check_counts check_structure check_gate_parts check_paths check_pages check_quotes; do
  python3 -I "$s.py" > "${s}_${suf}.out" 2>&1; echo "$s exit=$?"
done
python3 -I report_problems.py --saved "$suf"
