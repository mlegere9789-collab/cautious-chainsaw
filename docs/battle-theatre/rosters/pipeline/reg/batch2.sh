#!/bin/sh
cd /c/Users/mlege/gettysburg-map
F="python -I -X utf8 docs/battle-theatre/rosters/pipeline/reg/regfetch.py ia-text"
for id in officialregister00rhod historyoffirstre00sevi briefaccountofse53smit fouryearsinwarhi00murp histbattery00aldrrich historyofbattery03rhod revisedreportmad00penn; do $F $id; done
echo DONE
