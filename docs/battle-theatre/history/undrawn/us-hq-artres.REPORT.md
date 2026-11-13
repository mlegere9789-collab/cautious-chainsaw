# us-hq-artres: Union army headquarters, Hancock, the Artillery Reserve and its guards: report of the researcher

Workstream bt-units, 2026-11-13. File: `history/undrawn/us-hq-artres.jsonl` (129 records, claim ids U-us-hq-artres-0002 to 0131; the numbers 0001 (a test record) and 0095 (the record of Company C, 32d Massachusetts, which the checker refuses: section 6) are not used). Proposed register entries: `GOVERNANCE/horde/ws-units/proposed-register/us-hq-artres-*.md` (8). Request note: `GOVERNANCE/horde/requests/bt-units-us-hq-artres-32ma-co-c.md`.

## 1. Result

`python3 -I history/undrawn/tools/check_undrawn.py us-hq-artres --complete` exits 0: 0 errors, 0 warnings, 0 of the 24 units still owed anything (0 of 86 items), and `--all` (with the file of us-1c-1d-art present) exits 0. The checker's `--self-test` passes. Nothing was committed, merged or deployed; no file outside the ownership list was written except the request note and one line of `GOVERNANCE/progress.md`.

Records by kind: unit 18, arrival 24, arrival_road 7, march 4, position 25, engagement 7, night_position 3, movement 2, departure 1, strength 21, absent 6, line_order 1, road_identification 1, gap 9. Tiers: documented 75, inferred 45, open gap 9 (no plausible-procedural: the builder's share stays the builder's).

Every quote is at most 14 words, found by code in the local text at the recorded offset and report or section; every `printed` field stands in the passage read; the passage was read in full before the record was written (passages are listed in `tmp/units-us-hq-artres/passages.log`, untracked). The records were produced by a builder (`tmp/units-us-hq-artres/lib.py`, `s10_*.py` to `s96_*.py`, `run.py`, `ids.json` keeps the claim ids stable): re-run `python3 -I tmp/units-us-hq-artres/run.py` to rebuild the file after an edit of a spec.

## 2. What closed each unit of the group

| Unit | Arrival | Path | Positions (days with no place) | Strength |
|---|---|---|---|---|
| 1st Regular Brigade (formation) and its batteries | brigade: vicinity 22:30 on 1 July and field "in the morning" of 2 July (Tyler); 5th U. S. C: own day (Weir) | brigade: Taneytown road (Tyler, inferred) | 1st U. S. H, 3d U. S. F and K, 4th U. S. C: 3 July (Hunt; Milton for Battery K); 5th U. S. C: 3 July park and Webb's position (Weir) | gap (Ransom, covers the five) |
| 1st Volunteer Brigade: 5th and 9th Mass., 15th N. Y., Pa. C and F | brigade 10.30 a. m. (Tyler); 9th Mass. own 10 a. m. | brigade: Taneytown road (Milton, inferred) | none missing | officers and men taken into action (Phillips) for all five; brigade total; N. Y. volume for the 15th N. Y. |
| 2nd Volunteer Brigade: 2nd Conn., 5th N. Y. | brigade 10.30 a. m.; 5th N. Y. own 10.30 a. m. (Taft) | brigade: Taneytown road (inferred) | 3 July: 2nd Conn. in McGilvery's line (McGilvery); 5th N. Y. (Taft, Hunt) | gap (Taft, covers both) |
| 3rd Volunteer Brigade: 1st N. H., 1st Ohio H, 1st Pa. F and G, W. Va. C | brigade 10.30 a. m.; 1st N. H. 10 a. m. (Edgell); Pa. F and G about noon (Ricketts) | brigade: Taneytown road (inferred) | 3 July: Ohio H (Norton, with Edgell's hour of relief carried as a conflict), Pa. F and G (Hunt), W. Va. C (Hunt) | gap (Huntington, covers the five) |
| 4th Volunteer Brigade: 6th Me., Md. A, 1st N. J., 1st N. Y. G and K | brigade: vicinity 22:30 on 1 July, field "in the morning" (Tyler) and about 8 a. m. (Fitzhugh); K and A N. J. own (Fitzhugh); A N. J. also Parsons 1889 | brigade: Taneytown road (Tyler, inferred) | none missing; added: Md. A, G First N. Y., A N. J. | 6th Me.: morning report of 30 June (Maine volume); A N. J.: 116 present for duty on 30 June (New Jersey report); gap for G and K First N. Y. and Md. A |
| Army headquarters | 1 a. m. (Meade) and about 2 a. m. (Hunt), carried as a conflict | the road between Taneytown and Gettysburg = Taneytown Road (identification record, inferred) | 2 July (Tyler's crest near the headquarters; the council of the evening and to nearly 12 o'clock), 3 July (Norton's station near Cemetery Hill; the move to the woods on the Taneytown road in the evening) | gap |
| Hancock acting for Meade | 3 p. m. (Hancock), 4 p. m. (Howard), about 4 p. m. (Meade), carried as a conflict | the road to Gettysburg = Taneytown Road (inferred) | 1 July (Cemetery Hill; departure at dark), 2 July (with the corps at 7 a. m.; right of the corps near Cemetery Hill at dusk), 3 July (wounded, with the corps) | gap |
| 1st Conn. Heavy B and M, 4th N. J. (train guard) | not on the field (B, M); 4th N. J.: 2 July with the ammunition train (Ewing; Gillett) | | | |

The 24 leaf units are covered; formations were covered by the records of their brigades (arrival, path) and by a gap record (strength).

## 3. Conflicts carried (both records kept, each names the other in `conflicts_with`)

- Arrival of the 1st Regular and 4th Volunteer Brigades: Tyler has the two brigades at Gibbon's about 10.30 p. m. on 1 July, in camp on the Taneytown road, and in park near Gettysburg "in the morning" of 2 July (U-...-0002 to 0007); Weir's own report (Battery C, 5th U. S.) leaves camp near Taneytown on 2 July (0037); Fitzhugh arrives about 8 a. m. on 2 July (0038). I read Tyler's 22:30 as short of the field (vicinity): a floor, not a gate.
- Army headquarters reaches the field at 1 a. m. (Meade, 0067) or about 2 a. m. (Hunt, 0066).
- Hancock's arrival at 3 p. m. (his report, 0075), 4 p. m. (Howard, 0073), about 4 p. m. (Meade, 0074).
- Battery H, 1st Ohio: Norton keeps it on Cemetery Hill until the battle ends on 3 July (0036); Edgell relieved "Captain Huntington's Ohio battery" at 2.30 p. m. (0035).
- 15th New York: Phillips prints 3 officers and 68 men (the figure of the Official Records), the New York volume 2 officers and 68 men (the strength records of 15ny).
- Battery K, First New York with the 11th New York attached: Fitzhugh keeps K and A, First New Jersey unengaged on the turnpike until 1 p. m. on 3 July; the sketch of the attached battery sends it to the left of the Clump of Trees on the evening of 2 July (0058, 0059).
- Battery A, First New Jersey: into action at 1 p. m. (Fitzhugh) or 3 p. m. (monument inscription and Parsons) on 3 July.

## 4. Open gaps (9 gap records; each has its proposed register entry)

| Gap record | What | Register entry |
|---|---|---|
| 0060, 0061, 0062, 0063 | strength of 17 batteries (covers lists them): no figure in the reports, the returns (OCR scrambled) or the state volumes searched | us-hq-artres-strength-ransom, -taft, -huntington, -fitzhugh |
| 0111 | strength of army headquarters | us-hq-artres-strength-aop-hq |
| 0112 | strength of Hancock's party | us-hq-artres-strength-hancock |
| 0113 | roster: the 11th New York Battery attached to Battery K, First New York (not in the roster; the footnote of p. 168 of the table is lost in the OCR of both copies read) | us-hq-artres-roster-11ny |
| 0115, 0116 | positions of the 93d New York and the eight companies of the 8th U. S. at headquarters | us-hq-artres-hq-guards-positions |

Busey and Martin (regimental and battery strengths) is named NOT-ACQUIRED in every strength gap; only the owner can acquire it. The 1876 map labels (TM2-156, TM2-142, TM3-031, TM3-032) are used only as anchors of places the Official Records name without a coordinate.

## 5. Roster actions (18 `unit` records for the 18 roster-gap entries of the group, one of them answered by a request note)

Added: `us-aop-hq-pacav-price` (the number is doubtful in the OCR: 3d; the 1914 Pennsylvania volume's reprint prints 2d, a rename record carries that), `us-aop-hq-6pacav-e-i`, `us-aop-hq-regular-cav-det`, `us-aop-hq-signal`, `us-aop-hq-oneida-cav`. Not engaged (status never_main_field): `us-aop-hq-93ny`, `us-aop-hq-8us`. Engineer Brigade (status never_on_field, the footnote: all but the regular battalion ordered to Washington): `us-aop-engineers-15ny`, `-50ny`, `-usbn` (the regular battalion was ordered to Westminster at 5 a. m. on 2 July, OR27-3-D1003, with an `absent` record), `us-aop-engineers`. Merged consolidated batteries: `us-art-reserve-ransom-3usfk`, `us-art-reserve-mcgilvery-pacf`, `us-art-reserve-huntington-1pafg` (strength and arrival entered on both roster ids with a note, not doubled). Attached: `us-art-reserve-mcgilvery-10ny` to the 5th Mass. Status: `us-4nj-train-guard` becomes on_field (Ewing arrives 2 July with the train); `us-art-reserve-taft-1ctheavy-b` stays never_on_field (Tyler; Hunt; with `absent` records of B, M and the regiment). Documented absence of B and M has two passages each (Tyler plus Hunt for B, Tyler plus Pratt for M).

## 6. Defects found

1. `roster-gaps.json` gives `us-5c-1d-sweitzer-32ma-co-c` to this group while `groups.json` holds the unit in `us-5c`: the checker refuses a record of this file that names it. Request note written (two ways out, with the Tyler quote and offset). Not recorded in this file.
2. The footnotes of p. 168 of the organization table (the stars of the two Connecticut heavy batteries, the dagger of Battery K) are lost in the OCR of both copies of vol. 27 pt. 1 read (the local one and the second witness `tmp/fence-1/dl/or27_w2/warofrebellion012701rootrich_djvu.txt`); the dagger of p. 167 reads "10th New York Battery attached" at the 5th Mass.; Fitzhugh and the New York volume attach the 11th New York to Battery K.
3. `OR27-1-R008` (abstract of returns) is too scrambled by the OCR to read a headquarters or Artillery Reserve line: no strength was taken from it.
4. Tyler's "about eight batteries" of 1 July does not match the batteries of the two brigades he names (Ransom's and Fitzhugh's together hold 9 or 10 roster batteries); the report names Sheldon's Battery B, First New York, separately (not in the roster of this group). Recorded as stated.
5. The roster draws Batteries F and K, 3d U. S., C and F Pa., and F and G, 1st Pa., as six units; the table prints three consolidated batteries. Records on both ids say so in `note`; the integrator applies the `merge` records.

## 7. Read and not read

Read in full: OR27-1 R315 to R335 (the Artillery Reserve and its batteries and train guard), R009 (the head of the table and the Artillery Reserve section), R025, R026, R027, R018 to R023 (by their mentions of headquarters: they concern 7 to 15 July and add nothing for 1 to 3 July), OR27-3-D1001 and D1003. Read in the parts that name the group: R028 (Hunt, pp. 228 to 241), R006 (Meade, pp. 69 to 72, 115, 116, 124 to 127), R017 (Norton, pp. 199 to 206), R076 (Hancock, pp. 367 to 376), R243 (Howard's note), R008 (read, not usable). State volumes: ME-S021 (6th Maine roster and report), NY3-S026, NY3-S029 (the sketches of the 15th and the 11th Batteries), NY3-S057, NY3-S013 (searched), PA1B (the reprint of the table), PA2-S033 and S035 (searched for figures), NJ-FINAL-1891 (p. 17 and Parsons' letter), NJ-TOOMBS-1888 and OH-DED-1887 and FOX (searched for figures). Not read: R007 (the itinerary), R013 (casualty return), R016 (Letterman), R024 (searched by terms), the reports of the corps commanders and divisions that mention the reserve batteries on 2 and 3 July (Gibbon, Webb, Humphreys, Osborn, Wainwright and others; they belong to other groups and the batteries' own reports were taken first), and the sections of the New York and Pennsylvania volumes on the batteries beyond the passages cited. The monument locations of the state volumes were not used as evidence of 1863 places.

## 8. Owed

- A second pass for departure records (4 and 5 July) and the 2 July positions with facing of the batteries whose reports name no compass word: the ledgers hold the 2 July places; the compass facings printed in the group's texts (Thompson, Taft, the McGilvery line of 3 July) are entered.
- The reports of corps and divisions that place the reserve batteries on 2 and 3 July (Osborn on Cemetery Hill, Humphreys and Webb on Turnbull's, Weir's and Thomas's batteries) would add second witnesses and could settle conflicts; they belong to the groups of those corps.
- No browser or rendering check was needed or run for this task; nothing was run through the machine lock.
