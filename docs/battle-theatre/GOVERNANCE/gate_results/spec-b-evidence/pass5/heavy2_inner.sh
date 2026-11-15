#!/bin/bash
# Second locked job of the fifth pass of GATE-SPEC-B.md (2026-11-15, after 23:05 UTC): the three evidence validators of the OA10, OA11 and OA12 workstreams, which read large local texts
# (the Official Records, the medical works) and may need more than 30 s of CPU. They are read-only (no --json, no --write): they print their verdict and write nothing.
#   tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5/heavy2_inner.sh
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5
export PYTHONIOENCODING=utf-8
: > "$E/heavy2-runs.tsv"
echo "locked job 2 started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy2-runs.tsv"
TIMEFORMAT='%R %U %S'
step() { name="$1"; shift
  t0=$(date -u +%FT%TZ)
  tm=$( { time "$@" > "$E/$name.out" 2>&1; echo "rc=$?" > "$E/$name.rc"; } 2>&1 )
  rc=$(sed 's/rc=//' "$E/$name.rc"); rm -f "$E/$name.rc"
  set -- $tm
  printf '%s\t%s\texit %s\twall %s s\tcpu %s s\n' "$t0" "$name" "$rc" "$1" "$(echo "$2 + $3" | bc)" >> "$E/heavy2-runs.tsv"
}
step life_validate_all     python3 -I tools/bt/life/validate_evidence.py --all
step medical_validate_all  python3 -I tools/bt/medical/validate_evidence.py --all --summary
step town_validate_all     python3 -I tools/bt/town/validate_evidence.py --all --allow-missing
echo "done $(date -u +%FT%TZ)" >> "$E/heavy2-runs.tsv"
