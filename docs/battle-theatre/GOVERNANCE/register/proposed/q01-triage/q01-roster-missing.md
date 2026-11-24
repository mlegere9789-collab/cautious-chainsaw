# q01-roster-missing: Kit rows of the Official Records tables that the roster does not hold (not drawn)

| Field | Content |
|---|---|
| ID | q01-roster-missing |
| Requirement IDs | R04, R10 |
| Category | evidence missing (unit not in the roster) |
| Description | 78 FAIL item(s) of gate Q01 (Q01.2 78) over 78 unit(s). Units: CS.5ALBN, CS.ART.1st_Md, CS.ART.1st_NC_A, CS.ART.1st_Richmond_Howitzers, CS.ART.2nd_Rockbridge, CS.ART.2nd_and_3rd_Richmond_Howitzers, CS.ART.Alleghany, CS.ART.Amherst, CS.ART.Blount_s, CS.ART.Branch_NC, CS.ART.Breathed, CS.ART.Charleston_German_SC, CS.ART.Charlottesville, CS.ART.Chesapeake, CS.ART.Chew, CS.ART.Courtney, CS.ART.Crenshaw, CS.ART.Danville, CS.ART.Donaldsonville, CS.ART.Fauquier, CS.ART.Fluvanna, CS.ART.Fredericksburg, CS.ART.Griffin, CS.ART.HURT, CS.ART.Hampden, CS.ART.Hart, CS.ART.Huger, CS.ART.Jefferson_Davis_AL, CS.ART.Johnson_s, CS.ART.King_William, CS.ART.Lee, CS.ART.Letcher, CS.ART.Lewis, CS.ART.Louisiana_Guard, CS.ART.McGregor, CS.ART.Milledge_GA, CS.ART.Miller, CS.ART.Moorman, CS.ART.Morris, CS.ART.Norcom, CS.ART.Norfolk_Blues, CS.ART.Orange, CS.ART.Palmetto_SC, CS.ART.Pee_Dee, CS.ART.Powhatan, CS.ART.Pulaski_GA, CS.ART.Purcell, CS.ART.Richardson, CS.ART.Richmond_Fayette, CS.ART.Rockbridge, CS.ART.Rowan_NC, CS.ART.Salem, CS.ART.Squires, CS.ART.Staunton, CS.ART.Troup_GA, CS.CAV.11VA, CS.CAV.12VA, CS.CAV.18VA, CS.CAV.4NC, CS.CAV.5NC, CS.CAV.62VA, CS.CAV.6VA, CS.CAV.7VA, CS.CAV.MCNEILL, CS.OTHERS, CS.SCSSBN, CS.SS_GENERIC, US.5NY_INF, US.ART.1st_US_E_G, US.ART.1st_US_K, US.ART.2nd_US_A, US.ART.2nd_US_B_L, US.ART.2nd_US_M, US.ART.4th_US_E, US.ART.6th_NY, US.ART.9th_Mich, US.CAV.PURNELL_A, US.MN_CO_L. |
| Why literal 100% is not possible or blocked | The roster (history/units.json) lacks these units; history/undrawn/roster-gaps.json lists the Official Records entries the roster lacks, and the undrawn-units research has not yet added them to the layer. |
| Evidence searched | roster-gaps.json: entries with action add or absent; kit/verified_oob.json rows with in_roster false and no crosswalk alias. |
| Autonomous substitute applied | The units are not drawn; Q01.2 fails for each. |
| Strongest evidence-based reconstruction | The Official Records organization tables name each unit and its parent; the kit row carries the same parent. |
| Confidence tier | documented |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | Add each unit to the roster through the undrawn-units pipeline with its arrival record (a march, never a spawn), or record the unit as documented absent. |
| Owner decision requested | - |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
