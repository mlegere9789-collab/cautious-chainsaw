#!/bin/bash
# The two runs that must fail in this container, recorded as failures (GATE-SPEC-B.md 7.1): check_environment.py needs astropy, drill_check.py needs sixteen OCR texts of which nine are absent.
# Both are called so that nothing can be written: check_environment functions in memory (never main(), which writes environment/check_environment_results.json), drill_check.py as it stands (it writes nothing).
# Usage: bash run_negative.sh   (no lock needed: both stop within seconds)
cd "$(dirname "$0")/../../../../.." || exit 2
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
export PYTHONIOENCODING=utf-8
rec() { printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$E/light-runs.tsv"; }
s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
{ echo "# system python (no astropy): functions of check_environment.py called in memory, never main()"
  python3 -I -c "
import sys; sys.path.insert(0, 'tools/bt')
import check_environment as ce
try:
    ce.gate_q11(False); print('gate_q11(False): ran')
except Exception as e: print('gate_q11(False):', type(e).__name__ + ':', e)
try:
    ce.pdf_figure_checks(); print('pdf_figure_checks: ran')
except Exception as e: print('pdf_figure_checks:', type(e).__name__ + ':', e)
"; } > "$E/check_environment_noastropy.out" 2>&1; rc=$?
rec "$t0" check_environment_noastropy "$rc" "$(echo "$(date +%s.%N) - $s" | bc)" "python3 -I -c 'import check_environment; gate_q11(False); pdf_figure_checks()' (in memory)"
s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
timeout 120 python3 -I tools/bt/drill_check.py > "$E/drill_check_system.out" 2>&1; rc=$?
echo "exit $rc" >> "$E/drill_check_system.out"
rec "$t0" drill_check_system "$rc" "$(echo "$(date +%s.%N) - $s" | bc)" "python3 -I tools/bt/drill_check.py"
