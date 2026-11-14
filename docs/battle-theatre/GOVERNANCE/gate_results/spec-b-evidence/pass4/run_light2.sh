#!/bin/bash
# Fourth pass, second light script (2026-11-14, about 00:45 UTC): ten of the 33 test files of the app's node suite whose test time was under 5 s in the second pass's run
# (cavalry-ws10, scenario-defaults, figures3d-acw, figures3d-evidence, figures3d-commanders, audio3d-round2, audio-host, weather3d, structures3d, anim3d-onetoone),
# one after the other (--test-concurrency=1), no lock: each is a few seconds of CPU. The other 23 files and the whole suite are in the locked job (heavy_inner.sh).
# Usage: bash run_light2.sh    Writes pass4/light2-<name>.out and one line per file to light2-runs.tsv.
cd "$(dirname "$0")/../../../../../.." || exit 2
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence
P=$E/pass4
export PYTHONIOENCODING=utf-8
TIMEFORMAT='%R %U %S'
: > "$P/light2-runs.tsv"
echo "# light2 started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$P/light2-runs.tsv"
for n in cavalry-ws10 scenario-defaults figures3d-acw figures3d-evidence figures3d-commanders audio3d-round2 audio-host weather3d structures3d anim3d-onetoone; do
  t0=$(date -u +%FT%TZ)
  tm=$( { time timeout 180 nice -n 10 node --test --test-reporter=tap docs/battle-theatre/app/tests/$n.test.mjs > "$P/light2-$n.raw" 2>&1; echo "rc=$?" > "$P/light2-$n.rc"; } 2>&1 )
  rc=$(sed 's/rc=//' "$P/light2-$n.rc"); rm -f "$P/light2-$n.rc"
  set -- $tm
  { echo "# node --test $n.test.mjs  exit $rc"; python3 -I $E/summarize_tap.py "$P/light2-$n.raw"; } > "$P/light2-$n.out"; rm -f "$P/light2-$n.raw"
  printf '%s\t%s\texit %s\twall %s s\tcpu %s s\n' "$t0" "$n" "$rc" "$1" "$(echo "$2 + $3" | bc)" >> "$P/light2-runs.tsv"
done
echo "# light2 done $(date -u +%FT%TZ)" >> "$P/light2-runs.tsv"
