#!/bin/sh
cd /c/Users/mlege/gettysburg-map
F="python -I -X utf8 docs/battle-theatre/rosters/pipeline/reg/regfetch.py ia-text"
for id in historyrosterofm01mary historicalregist01heitrich historicalregist02heitrich annualreportadj07offigoog annualreportsofa00west delawarearchives03dela delawarearchives04dela delawarearchives05dela loyalwestvirgin00langgoog augustussecond00woodrich; do $F $id; done
echo DONE
