#!/bin/bash
# builds the unit CSVs from parsed JSON in tmp/library/rosters/MW/work (below-normal priority, one process at a time)
W=../../../../../tmp/library/rosters/MW/work
b() { cmd //c "start /low /wait /b python -I -X utf8 build_unit.py $*"; }
b IN $W/in14.json U-14IN 14th_Indiana_Infantry 14th-indiana-infantry IN-AGR-v4 muster
b IN $W/in19.json U-19IN 19th_Indiana_Infantry 19th-indiana-infantry IN-AGR-v4 muster
b IN $W/in20.json U-20IN 20th_Indiana_Infantry 20th-indiana-infantry IN-AGR-v4 muster
b IN $W/in27.json U-27IN 27th_Indiana_Infantry 27th-indiana-infantry IN-AGR-v4 muster
b IN $W/in3cav.json U-3IN-CAV 3rd_Indiana_Cavalry 3rd-indiana-cavalry IN-AGR-v5 muster
b WI $W/wis2nd.json U-2WI 2nd_Wisconsin_Infantry 2nd-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis3rd.json U-3WI 3rd_Wisconsin_Infantry 3rd-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis5th.json U-5WI 5th_Wisconsin_Infantry 5th-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis7th.json U-7WI 7th_Wisconsin_Infantry 7th-wisconsin-infantry WI-ROSTER-1886-v1 enlist
b WI $W/wis26th.json U-26WI 26th_Wisconsin_Infantry 26th-wisconsin-infantry WI-ROSTER-1886-v2 enlist
b IL $W/il82.json U-82IL 82nd_Illinois_Infantry 82nd-illinois-infantry IL-AGR-1900-v5 enlist
b IL $W/il8cav.json U-8IL-CAV 8th_Illinois_Cavalry 8th-illinois-cavalry IL-AGR-1900-v8 enlist
b IL $W/il12cav.json U-12IL-CAV 12th_Illinois_Cavalry 12th-illinois-cavalry IL-AGR-1900-v8 enlist
b MN $W/mn1.json U-1MN 1st_Minnesota_Infantry 1st-minnesota-infantry MN-CIVILINDIAN-1890-v1 enlist
b MI $W/mi3.json U-3MI 3rd_Michigan_Infantry 3rd-michigan-infantry MI-ROS-v3 enlist
