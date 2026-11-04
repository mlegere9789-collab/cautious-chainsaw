#!/bin/bash
W=../../../../../tmp/library/rosters/MW
t() { cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py $*"; }
b() { cmd //c "start /low /wait /b python -I -X utf8 build_unit.py $*"; }
t IL $W/reportofadjutantv5illi.pages.json 106 126 82IL $W/work/il82.json
t IL $W/reportofadjutantv8illi.pages.json 111 162 8ILCAV $W/work/il8cav.json
t IL $W/reportofadjutantv8illi.pages.json 339 386 12ILCAV $W/work/il12cav.json
b IL $W/work/il82.json U-82IL 82nd_Illinois_Infantry 82nd-illinois-infantry IL-AGR-1900-v5 enlist
b IL $W/work/il8cav.json U-8IL-CAV 8th_Illinois_Cavalry 8th-illinois-cavalry IL-AGR-1900-v8 enlist
b IL $W/work/il12cav.json U-12IL-CAV 12th_Illinois_Cavalry 12th-illinois-cavalry IL-AGR-1900-v8 enlist
