#!/bin/bash
# The seven gate runners that have a stored result, each run DIRECTLY (niced, no lock: each needs under about 30 s of CPU) into a SCRATCH folder, sixth pass of GATE-SPEC-B.md.
# GOVERNANCE/gate_results is NOT touched (--out is the scratch folder). Output: one .out per runner, light2-runs.tsv one line per runner (start, name, exit, wall, user+sys CPU).
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6
R=tmp/bt-gates/pass6/results
export PYTHONIOENCODING=utf-8
mkdir -p "$R"
TIMEFORMAT='%R %U %S'
: > "$E/light2-runs.tsv"
echo "# started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/light2-runs.tsv"
run() { name="$1"; shift
  t0=$(date -u +%FT%TZ)
  tm=$( { time nice -n 10 timeout 900 "$@" > "$E/$name.out" 2>&1; echo "rc=$?" > "$E/$name.rc"; } 2>&1 )
  rc=$(sed 's/rc=//' "$E/$name.rc"); rm -f "$E/$name.rc"
  set -- $tm
  printf '%s\t%s\texit %s\twall %s s\tcpu %s s\n' "$t0" "$name" "$rc" "$1" "$(echo "$2 + $3" | bc)" >> "$E/light2-runs.tsv"
}
run run_q25 python3 -W ignore tools/bt/gates/q25_library.py --out "$R" --quiet
run run_q23 python3 -W ignore tools/bt/gates/q23_marking.py --out "$R" --quiet
run run_q19 python3 -W ignore tools/bt/gates/q19_claims.py --out "$R" --quiet
run run_q02 python3 -W ignore tools/bt/gates/q02_provenance.py --out "$R" --quiet
run run_q01 python3 -W ignore tools/bt/gates/q01_oob.py --out "$R" --quiet
run run_q14 python3 -W ignore tools/bt/gates/q14_ordnance.py --out "$R" --quiet
run run_q20 python3 -W ignore tools/bt/gates/q20_cavalry.py --out "$R" --quiet
echo "# done $(date -u +%FT%TZ)" >> "$E/light2-runs.tsv"
