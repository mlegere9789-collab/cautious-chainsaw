#!/bin/bash
# Locked job C of the sixth pass of GATE-SPEC-B.md (2026-11-16, from 02:30 UTC). Start it with
#     tools/horde/bench.sh bash docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/heavy_c.sh
# The runners of the four gates that have NO stored result (Q03, Q04, Q05, Q06), each run into a SCRATCH folder (tmp/bt-gates/pass6/results-c; GOVERNANCE/gate_results is NOT touched), to measure what a run costs
# and what it finds today. Q04, Q05 and Q06 are run for the DEFAULT scenario only (Q04 and Q05 on the dense grid): that is the probe the runners' author prepared (tmp/bt-gates/q456/run_q04_probe.sh) and never ran;
# the full run over S* (333 scenarios in 10 interaction groups) is not attempted here: its verdict is INCOMPLETE by construction until it is, and it is the group builder's run, not this specification's.
# Q03 is run in full (its own docstring: about 300 s of CPU). Each step has a hang guard (timeout) far above the expected time, never a result.
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6
R=tmp/bt-gates/pass6/results-c
export PYTHONIOENCODING=utf-8
mkdir -p "$R" tmp/bt-gates/pass6
TIMEFORMAT='%R %U %S'
: > "$E/heavy-c-runs.tsv"
echo "locked job C started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/heavy-c-runs.tsv"
step() { name="$1"; shift
  t0=$(date -u +%FT%TZ)
  tm=$( { time timeout 5400 "$@" > "tmp/bt-gates/pass6/$name.raw" 2>&1; echo "rc=$?" > "tmp/bt-gates/pass6/$name.rc"; } 2>&1 )
  rc=$(sed 's/rc=//' "tmp/bt-gates/pass6/$name.rc"); rm -f "tmp/bt-gates/pass6/$name.rc"
  set -- $tm
  { echo "# start $t0   exit $rc   wall $1 s   cpu $(echo "$2 + $3" | bc) s"; tail -n 70 "tmp/bt-gates/pass6/$name.raw"; } > "$E/$name.out" 2>&1
  printf '%s\t%s\texit %s\twall %s s\tcpu %s s\n' "$t0" "$name" "$rc" "$1" "$(echo "$2 + $3" | bc)" >> "$E/heavy-c-runs.tsv"
}
step run_q06_default  python3 -W ignore tools/bt/gates/q06_path.py --out "$R" --scenarios default --quiet
step run_q05_default  python3 -W ignore tools/bt/gates/q05_speed.py --out "$R" --scenarios default --grid dense --quiet
step run_q04_default  python3 -W ignore tools/bt/gates/q04_arrival.py --out "$R" --scenarios default --grid dense --quiet
step run_q03_full     python3 -W ignore tools/bt/gates/q03_anachronism.py --out "$R" --quiet
echo "done $(date -u +%FT%TZ)" >> "$E/heavy-c-runs.tsv"
