#!/bin/sh
# Full rebuild of the family CSVs from the cached sources (added in the 2026-10-30 audit). Below-normal priority, one process at a time.
# usage: cmd //c "start /low /wait /b sh run_all.sh" from the repository root
cd /c/Users/mlege/gettysburg-map
D=docs/battle-theatre/rosters/data/C-ALMSTX/scripts
for s in hurst_parse oates_parse md_parse ms_parse brewer_parse estes_parse park_parse quitman_parse or_parse polley_parse fl_parse audit_postfix consolidate; do
  echo "== $s"
  python -I -X utf8 $D/$s.py 2>&1 | tail -4 | cut -c1-260
done
