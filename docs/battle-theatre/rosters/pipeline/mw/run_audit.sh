#!/bin/bash
# MW audit stage (30 Oct 2026). Restores the pre-audit pipeline output, rebuilds the Wisconsin units with the repaired parser, applies audit_fix.py and refreshes stats.json.
# Run from this directory. The frozen pre-audit CSVs are in ../../data/MW/_pre_audit/.
D=../../data/MW
W=../../../../../tmp/library/rosters/MW/work
for f in $D/_pre_audit/*.csv; do cp "$f" $D/; done
bash run_wis.sh
b() { cmd //c "start /low /wait /b python -I -X utf8 build_unit.py $*"; }
b WI $W/wis2nd.json U-2WI 2nd_Wisconsin_Infantry 2nd-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis3rd.json U-3WI 3rd_Wisconsin_Infantry 3rd-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis5th.json U-5WI 5th_Wisconsin_Infantry 5th-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis7th.json U-7WI 7th_Wisconsin_Infantry 7th-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis26th.json U-26WI 26th_Wisconsin_Infantry 26th-wisconsin-infantry WI-ROSTER-1886-v2 enlist
# NOTE: the rebuilt Wisconsin CSVs carry no Boies 1913 matches (Boies lists Michigan residents; none matched a Wisconsin row in the original build either).
cmd //c "start /low /wait /b python -I -X utf8 audit_fix.py"
MW_KEEP_6WI=1 cmd //c "start /low /wait /b python -I -X utf8 final_stats.py"
