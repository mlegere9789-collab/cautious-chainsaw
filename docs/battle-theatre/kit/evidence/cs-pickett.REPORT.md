# Kit evidence report: cs-pickett

Army of Northern Virginia, First Corps: Pickett's division (Garnett, Kemper, Armistead; Corse's brigade not on the field). 20 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-pickett.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-pickett-01-strength.md`, `-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-pickett-library.md`. Written 24 November 2026.

How the file was made. Builder in `tmp/kit-cs-pickett/` (`build_p.py`, shared helpers in `tmp/kit-cs-mclaws/cc.py`). Casualty rows (Guild pp. 329-330, Addenda p. 339) and abstract rows (pp. 291-292) read from the scan and checked against totals. Three archive.org texts fetched 24 November 2026 by the `/stream/` path (one request per second, none refused) and declared: Hunton's Autobiography (1933), Harrison's Pickett's Men (1870), Confederate Military History vol. 3 (Virginia); the last two only appear in searched lists.

## Counts
`--coverage --require-complete` exits 0: 123 lines (115 evidence, 5 gap, 3 source); 109 accepted (106 documented, 3 inferred), 6 superseded, 0 errors, 42 warnings. Pairs 108 of 108. By field: roster 20, commander 37, casualties 41, strength 17, gap lines 5. Compile dry run: 0 operations, 20 unapplied (routed by design).

## Corrections
Garnett's strength: Peyton's report gives 1,287 men and about 140 officers on 3 July (1,427). Brigade order: table lists Peyton second under Garnett; his report is signed commanding the brigade. Kemper's and Armistead's commanders as the table lists them (Mayo and Aylett second).

## Conflicts
Strength of the division on 3 July, `estimate_in_report`, set `cs-1c-pickett|strength|estimate_in_report|1863-07-03`: A Longstreet 1896, 4,700 fresh troops; B SHSP-05, 4,500 bayonets (the writer says an earlier print gave 5,500); C Heth in SHSP-04, some 4,500; D Fremantle, under 5,000. No default. Return figures are kept apart by basis and date (5,200 present for duty on 31 May, Alexander; 20 and 31 July abstracts). Casualties: Guild's return (`casualty_return`) and the Addenda (`corrected_return`) differ (Garnett's brigade 325 against 941; Pickett's division 1,366 against 2,888); the Addenda preface says the missing of Pickett's division were largely killed or wounded.

OCR errors found against the scan: p. 330 Kemper's 3d Virginia killed "1C" is 16; p. 339 labels "*i7th Vireinia" is the 57th; p. 284 "l!)tli Virginia" is the 19th; Peyton's report prints the brigade's strength as "1,287 men" (read as text, no scan check needed beyond the quote).

## Gaps
- strength of 14 regiments and Kemper's and Armistead's brigades: not found (only division figures and Garnett's brigade, 8th Virginia exist). `cs-pickett-01-strength.md`.
- arms (three kit fields) and dress of all 15 regiments: not found; Hunton, Peyton, Longstreet say nothing of arms or dress. `cs-pickett-02-arms-dress.md`.

## Roster
Corse's brigade is not in the organization table; Taylor (SHSP-04) says it stayed at Hanover Junction and Longstreet's report names General Corse with his brigade on the march to the Gaps about 21 July (inferred commander line). The kit's `cs-corse-hanover-junction` unit stays as the plan has it. No unit absent from the plan was found.

## For other groups
cs-art-1c: Dearing's battalion casualties are "not reported in detail" (Addenda p. 339: 8 killed, 17 wounded, 25 total for the artillery battalion of Pickett's division). The Fremantle statement that two brigades were absent (Corse's and Jenkins') and Longstreet 1896's 1,700 (Corse) and 2,300 (Jenkins) deductions bear on cs-hood (Jenkins) and the army-wide strength.

## Sources
OR27-2 (R424, R425, R427, R430, R441), ALEXANDER-1907, LONGSTREET-1896, SHSP-04, SHSP-05, FREMANTLE-1864, Hunton (declared). Hosts: archive.org only; nothing refused.

## Not done
No required pair is open. Regimental strength, arms and dress stay gap lines (above). Armistead's death and Hunton's wound rest on Hunton's own account only (inferred).
