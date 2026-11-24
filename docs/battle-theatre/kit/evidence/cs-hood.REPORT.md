# Kit evidence report: cs-hood

Army of Northern Virginia, First Corps: Hood's division (Law, Robertson, G. T. Anderson, Benning). 23 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-hood.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-hood-01-strength.md`, `cs-hood-02-arms-dress.md`. Request note: `GOVERNANCE/horde/requests/bt-oob-kit-cs-hood-library.md`. Written 24 November 2026. Builder and drafts in `tmp/kit-cs-hood/` (`build_h.py`, `org_h.py`, `part2.py`).

## Counts
`--coverage --require-complete` exits 0: 161 lines (153 evidence, 5 gap, 3 source); 132 accepted (129 documented, 3 inferred), 21 superseded (organization-table lines replaced by the same commander with a change of command), 0 errors. Pairs 128 of 128. By field: roster 23, commander 64, casualties 52, strength 13, detachment 1, gap lines 5. Compile dry run: 0 operations, 23 unapplied (all routed to the verified tables by design).

## Corrections
No kit value was compared with `--diff` for contradictions beyond the checker run; the lines stand as written. The record settles: commanders of every regiment and brigade as printed on OR27-2 p. 284-285 (Law second under Hood in the division entry; Sheffield second under Law); Hood wounded (Longstreet), Law commanding the division on 3 July (McDaniel); Luffman then White commanding Anderson's brigade; the changes of command in the 9th, 11th, 47th, 59th Georgia/Alabama, 5th Texas, 20th and 2d Georgia.

## Conflicts
No conflict set: the two casualty returns (Guild's, `casualty_return`, and the Addenda, `corrected_return`) and the regimental statements are different bases and are kept as separate lines (for example the 44th Alabama: wounded 64 in the return, 66 in Perry's report; the 15th Georgia 72 in the returns against 171 by its report and 70 + 101 in DuBose's words). Brigade totals of the Addenda (Law 74/276/146, Anderson 105/512/54, Robertson 84/393/120, Benning 76/299/122) differ from the sum of their regiment rows: the preface says they are the commanders' figures; each is a line with `waive_numbers`.
OCR digit errors found against the scan: Benning's brigade wounded printed 299 (OCR 209, fixed by 76+299+122=497); 9th Georgia carried into the field 340 (OCR 3-1:0); 57th and 52d labels of Hoke's and Smith's brigades (cs-early); p. 330 totals of Anderson's brigade (OCR lo:j and 001, scan 103 and 601).

## Gaps
Strength: 4 brigades and 15 regiments (no division report, none by Law; Robertson and Benning give losses only); arms (weapon, bayonet, side arm) and dress (all fields) of all 18 regiments: Polley, Confederate Military History Texas and Georgia, OR reports, SHSP and the memoirs searched. Register: kit-cs-hood-01-strength, kit-cs-hood-02-arms-dress. Alabama volume of Confederate Military History returned an empty text (source_unavailable).

## Roster
No unit the plan lacks. Robertson's brigade has no regiment mislabelled. Hood's abstract rows are division rows; the corps-level rows belong to cs-mclaws.

## For other groups
Return of casualties pp. 330 and 339-340 hold the Alexander and Washington artillery battalion totals (Guild: 19/103/122 and 4/32/36; Addenda 19/114/139 and 3/26/45) for cs-art-1c; Henry's battalion is "not reported in detail". Polley and CMH Texas on disk: `tmp/kit-cs-hood/lib/`.

## Sources
OR27-2 (R424 table pp. 284-285, R425 abstracts pp. 291-292, R427 returns pp. 330, 339, 340, R430 and R441 to R462 reports), ALEXANDER-1907 (31 May strength). Declared: Polley (searched), CMH Texas (searched), CMH Georgia (on disk from cs-mclaws, searched). Fetched 24 November 2026, one request per second, none refused.

## Not done
None open. Not read: the nominal rolls of Hood's brigade reports in the Addenda footnotes beyond what is quoted; Moore and state rosters were not applicable (no NC units).
