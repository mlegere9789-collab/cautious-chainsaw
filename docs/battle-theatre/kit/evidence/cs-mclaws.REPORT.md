# Kit evidence report: cs-mclaws

Army of Northern Virginia, First Corps headquarters and McLaws' division (Kershaw, Barksdale, Semmes, Wofford). 26 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-mclaws.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-mclaws-01-strength.md`, `-02-arms-dress.md`, `-03-commanders.md`, `-04-3ga-sharpshooters.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-mclaws-roster.md`, `-library.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-cs-mclaws/` (`build_m.py`, `cc.py`, `kb.py`) takes offset, report id and printed page from the evidence library. The casualty rows (Guild's return pp. 329-330, the Addenda compilation p. 338) and the abstract rows (pp. 291-292) were read from the scan at 170 to 250 dpi and added up against the printed totals; the checker verifies the row arithmetic. Three archive.org texts were fetched on 24 November 2026 from the `/stream/` path (one request per second, none refused) and declared as `type: source` lines: Confederate Military History vols. 5 (South Carolina), 6 (Georgia), 7 part 1 (Mississippi).

## Counts
`kit_evidence_check.py cs-mclaws --coverage --require-complete` exits 0: 152 lines (141 evidence, 8 gap, 3 source); 137 accepted (121 documented, 16 inferred), 4 superseded, 0 errors, 92 warnings (OCR_CORRECTED 23, PAGE_UNCHECKED 17 for the declared texts, OFF_FIELD 34, NO_IDENTITY 18). Required pairs 144 of 144 evidenced or recorded as gaps. By field: roster 26, commander 28, officer 3, casualties 50, strength 22, arms 1, ammunition 1, dress 10, gap lines 8. `kit_overrides.py compile --dry-run --group cs-mclaws`: 0 operations, 19 unapplied (all routed to the verified tables by design).

## Corrections
No kit value was compared line by line (the compile dry run applies nothing). What the record settles: the organization table (OR27-2-R424 p. 283) gives Bryan as Semmes' probable successor (footnote) and lists 3d South Carolina as Maffett then Nance; Nance's own report and Maffett's say Nance arrived on the afternoon of 3 July. The roster's 3rd Georgia Sharpshooters is not in the table (see Roster).

## Conflicts
No conflict set was needed. Different figures of one regiment are carried under different bases: Guild's return (`casualty_return`, killed, wounded, total) and the Addenda compilation (`corrected_return`, with the missing) differ for the 2d South Carolina (152 against 154), 7th South Carolina (102 against 110), 15th South Carolina (110 against 137) and others; the Addenda preface says why. Maffett's 83 killed and wounded (3d South Carolina) sits beside the return's 81 and 83.

OCR digit errors found against the scan: p. 329 label "60th Georgia" is the 50th; p. 330 total "lo:j 498 001" is Anderson's brigade (not this group); p. 338 Wofford total "80" is 30; p. 338 label "34th Georgia" is the 24th and "Sd" the 2d; p. 292 row labels lost.

## Gaps
- strength of 22 units (all regiments, Kershaw's and Wofford's brigades): `not_found`, search of R430 to R434, Alexander, Longstreet, Fremantle, B&L vol. 3 (Kershaw's article), SHSP 4, 5, 6, 11, 12 and the three Confederate Military History volumes. `cs-mclaws-01-strength.md`.
- arms (weapon, bayonet, sidearm) and dress of 20 regiments: not found; only Kershaw's 503 new arms of 23 June (a brigade statement before the window) and Fremantle's 25 June "well shod and efficiently clothed" for two brigades (inferred lines). `cs-mclaws-02-arms-dress.md`.
- commander of the 13th, 17th, 18th and 21st Mississippi, 16th, 18th and 51st Georgia: `ocr_unreadable`; the OCR of the block of p. 283 matches no quote at 0.88 per token. The scan was read and the reading is in the gap note, marked as unmatched. `cs-mclaws-03-commanders.md`.
- casualties of the 3rd Georgia Sharpshooters: no row in either return. `cs-mclaws-04-3ga-sharpshooters.md`.

## Roster
Units the record shows and the plan lacks: none reported with `unit_id: null`. Plan units the record does not show: `cs-1c-mclaws-wofford-3gasharpshooters` is not in the table or either return; Confederate Military History places the battalion in Wofford's brigade and says it went with Longstreet after Gettysburg (inferred roster line). Artillery of Cabell's battalion (table p. 283, returns) belongs to group cs-art-1c. The roster's `Cobb's Legion` is the infantry battalion of Wofford's brigade; the cavalry Cobb's Legion losses in Confederate Military History are another unit and were not used.

## For other groups
- cs-art-1c: Cabell's battalion rows, Guild p. 329 (9 killed, 25 wounded, 34) and Addenda p. 338 (8, 29, 37) with Carlton's, Fraser's, McCarthy's and Manly's batteries (1/6/7, 4/14/18, 2/3/5, 1/6/7 and 8/29/37).
- cs-pickett and cs-hood: the corps casualty table in Longstreet's report (OR27-2-R430 p. 363, brigade totals) agrees with the Addenda brigade totals; Alexander p. 443 prints the same figures.
- cs-hood: the abstract rows of pp. 291-292 for Hood's division (20 July 459 officers, 4,196 men, aggregate present 5,693; July 504, 4,874).

## Sources
OR27-2 (R424, R425, R427, R430 to R434), ALEXANDER-1907 (strength of 31 May), FREMANTLE-1864 (25 June), CMH vols. 5, 6, 7 (declared; vols. 6 and 7 cited for 3rd Georgia Sharpshooters and Humphreys, vol. 5 searched). Hosts: archive.org only; nothing refused.

## Not done
No required pair is open. Content limits: regimental strength, arms and dress stay gaps (above); seven regimental commanders rest on a gap line until the scan is read into a matching quote; Longstreet's own casualty table (R430 p. 363) and Kershaw's addenda table (R432 p. 370) were not written as lines (they repeat the Addenda brigade totals).
