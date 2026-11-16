# Request from bt-life (group us-2c) to the owner of `report_assignments.json`: five Second Corps reports assigned to other groups by the header rules

Date: 2026-11-15. From: workstream bt-life, evidence group us-2c. To: the owner of `tools/bt/life/assign_groups.py` and `docs/battle-theatre/life/evidence/report_assignments.json`; copy for the engineers of the groups `campaign-elsewhere`, `bridges-roads` and `us-army`.

## What

Five Official Records reports (vol. 27 part 1) that name units of the Second Corps are assigned to other groups, so that group us-2c does not own them. Group us-2c read them (a unit of its corps speaks in each) and wrote the rows below, each flagged with the extra keys `x_record_owner` (the group `report_assignments.json` names) and `x_record_owner_note` ("request note bt-life-us-2c-reassign-records"):

| Record | Report | Assigned to (how) | Rows of us-2c.jsonl |
|---|---|---|---|
| OR27-1-R079 | Maj. Richard E. Cross, Fifth New Hampshire Infantry, Camp near Harper's Ferry, W. Va., 16 July 1863 (Cross's brigade, First Division, Second Corps), printed p. 383 | campaign-elsewhere (header: "department or garrison outside the Army of the Potomac") | us-2c-L057 (intrenchments of the forenoon of 3 July), us-2c-R147 (picket line) |
| OR27-1-R098 | Brig. Gen. John Gibbon, commanding the Second Division and for part of the battle the Second Corps, Baltimore, Md., 7 August 1863, printed p. 416 | campaign-elsewhere (header, same reason: the place line is Baltimore) | us-2c-L058 (the two regiments sent to the Emmitsburg road: rails) |
| OR27-1-R114 | Capt. William McFadden, Fifty-ninth New York Infantry (Hall's brigade, Second Division, Second Corps), near Harper's Ferry, 16 July 1863, printed p. 452 | campaign-elsewhere (header, same reason) | us-2c-R148 (the battalion lay down to rest on the battle-field) |
| OR27-1-R118 | Capt. Nathan Willard, Fourteenth Indiana Infantry, commanding the pioneer corps of Carroll's brigade (Third Division, Second Corps), printed p. 459 | bridges-roads (`header:engineers_pioneers_railroads`) | us-2c-L059 (fences levelled and the field cleared), us-2c-R149 (burial: 4 officers and 38 men of the brigade, 37 rebels) |
| OR27-1-R127 | Capt. George F. Hopper, Tenth New York Infantry (a battalion of Smyth's brigade, Third Division, Second Corps, that encamped at division headquarters and guarded prisoners), printed p. 471 | us-army (`default_for_side`, `needs_hand_check: true`) | us-2c-R150 to us-2c-R153 (the line deployed in the rear against stragglers on 2 July, the camps of 3 July, the guard over about 1,800 prisoners) |

None of the five is an Artillery Reserve, Army headquarters or garrison report. The first three were assigned by the place line of the heading ("Camp near Harper's Ferry", "Baltimore", "In the Field, Md.") read as a department outside the Army of the Potomac; R118 by its subject (pioneers); R127 by the default of its side after the header check failed.

## Why

Extract-once: a record is read by the group whose units it names, so that no passage is read twice. If the five stay where they are, either the other groups read them and write rows that duplicate these (the validator's dedupe rule keeps the row of the group that owns the text, so one set would have to be dropped), or nobody reads them and their rows are lost. Nothing is lost now: the rows exist and validate (`validate_evidence.py us-2c`: 0 errors).

## The exact change asked

In `report_assignments.json` set `group: "us-2c"` for `OR27-1-R079`, `OR27-1-R098`, `OR27-1-R114`, `OR27-1-R118` and `OR27-1-R127` (with `how: "reassigned: Second Corps report (request bt-life-us-2c-reassign-records)"`), then run `python3 -I tools/bt/life/build_groups.py` to refresh `groups.json`. If the owner prefers to keep them where they are, the engineers of the three other groups should be told that the five records are read and that their rows are in `us-2c.jsonl`, so that none writes a second set. No row of this file changes either way (the extra keys `x_record_owner*` may stay).
