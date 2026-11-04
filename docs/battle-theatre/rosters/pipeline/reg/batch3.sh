#!/bin/sh
cd /c/Users/mlege/gettysburg-map
F="python -I -X utf8 docs/battle-theatre/rosters/pipeline/reg/regfetch.py ia-xml"
for id in historyrosterofm01mary officialregister00rhod; do $F $id; done
echo DONE
