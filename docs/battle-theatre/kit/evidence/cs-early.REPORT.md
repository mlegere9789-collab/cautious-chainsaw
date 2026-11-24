# Kit evidence report: cs-early

Army of Northern Virginia, Second Corps headquarters and Early's division (Hays, Smith, Hoke and Avery, Gordon). 25 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-early.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-early-01-strength.md`, `cs-early-02-arms-dress.md`, `cs-early-03-58va.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-early-library.md`, `-roster.md`. Written 24 November 2026. Builder in `tmp/kit-cs-early/` (`build_e.py`, `part2e.py`, `gaps_e.py`; helpers shared from `tmp/kit-cs-hood/sh.py`).

## Counts
`--coverage --require-complete` exits 0: 191 lines (184 evidence, 5 gap, 2 source); 181 accepted (120 documented, 61 inferred), 3 superseded, 0 errors. Pairs 130 of 130. By field: roster 25, commander 32, casualties 44, strength 31, officer 1, arms 17, dress 34, gap lines 5. Compile dry run: 0 operations applied for lack of catalog ids; the 17 headgear lines say "hats issued at York" with no catalog id (listed to review).

## Corrections
Order of command as printed: Avery then Godwin under Hoke's brigade (Avery mortally wounded 2 July, Godwin in command on the morning of 3 July); Smith's brigade: Smith until 10 July, then Hoffman; Hoke's brigade was commanded by Avery because General Hoke was absent, wounded at Fredericksburg. The 13th and 58th Virginia were left at Winchester and were not engaged.

## Conflicts
No conflict set. Brigade returns of 10 and 20 June (Early) and the division return of 20 July differ by date, not by basis. Casualties: Guild's return has no figure for Hoke's brigade (blank rows); the Addenda gives 35, 216, 94 (345). Gordon's own count of killed and wounded (350) lies between the returns (323 and 380 with missing). The Addenda division total for Early (806 wounded, 1,188) is one less than its brigade totals add to; line carries `waive_numbers`.
OCR digit and label errors found against the scan: 57th North Carolina printed as 67th and 52d Virginia as 63d (Addenda p. 340); Hays' total aggregate 194 printed 191 by the OCR (p. 330); Hoke's label Hoka's in the table.

## Gaps
Strength of 17 regiments and the brigades of Hays, Smith, Hoke; bayonet and side arm of 17 regiments; all other dress fields of 17 regiments; commander of the 58th Virginia (the record names none for July 1863). The North Carolina volume of Confederate Military History returned an empty text (source_unavailable).

## Roster
13th and 58th Virginia (never_on_field in the plan) are shown by Hoffman's and Early's reports as regiments of Smith's brigade left near Winchester: roster lines say engaged no. The table (p. 286) lists three regiments under Smith. The 54th North Carolina of Hoke's brigade (Murchison) is not in the plan: it too was at Williamsport and Staunton (OR27-2-R467, R475); not applied.

## For other groups
Rodes' and Johnson's division rows of the casualty returns and abstracts (pp. 331-332, 341-342, 291-292) are read for cs-rodes and cs-johnson by their own passes. Jones' artillery battalion of Early's division: Guild 3/7/10; Addenda rows: Garber 1,1; Green 2,5,7; total 2/6/8 (p. 341).

## Sources
OR27-2 (R424 pp. 285-286, R425, R427 pp. 330-332, 340-343, R470, R473, R474, R476, R477), ALEXANDER-1907, SHSP-04 (returns of 10 and 20 June). Declared: Early, Autobiographical Sketch (participant account), CMH Virginia (searched). Fetched 24 November 2026, none refused.

## Not done
None open. Not read in full: R471 (Early's nominal return of casualties, pp. 474-476), whose figures duplicate the returns already read by regiment; the officers killed in the lists of OR27-2-R471 were not written as officer lines.

## QC sweep 2026-11-24
Corrections after the independent check of the evidence (checker exit 0 with `--coverage --require-complete`); details in `GOVERNANCE/horde/ws-kit/QC-SWEEP-2026-11-24.md`.
- Sweep A, dagger and asterisk marks of the Addenda return of casualties (pp. 338-346): 1 lines (0069).
cs-early:0069 carries the asterisk footnote of p. 332.
