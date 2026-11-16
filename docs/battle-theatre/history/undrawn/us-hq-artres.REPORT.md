# us-hq-artres: Union army headquarters, Hancock, the Artillery Reserve and its guards: report of the researcher (third version)

Workstream bt-units. First version 2026-11-13 (129 records), second version 2026-11-14 (301 records), this version 2026-11-15 and 2026-11-16 (353 records, claim ids U-us-hq-artres-0002 to 0359). It continues from the file of the second version: 52 records are new (0308 to 0359), 35 of the old ones were edited without changing their ids (section 3), none was removed. Proposed register entries: `GOVERNANCE/horde/ws-units/proposed-register/us-hq-artres-*.md` (10: nine of the second version, one new for the Provost-Marshal-General's command). The request note of the first version about Company C (`GOVERNANCE/horde/requests/bt-units-us-hq-artres-32ma-co-c.md`) stays as the record of its answer.

## 1. Result

[[CHECKS]]

Records by kind: position 87, engagement 78, strength 49, arrival 31, movement 25, unit 22, departure 13, night_position 12, gap 11, arrival_road 8, absent 6, march 5, line_order 4, road_identification 1, source 1. Tiers: documented 190, inferred 152, open gap 11 (no plausible-procedural). The third pass added 52 records: strength 22, position 12, engagement 11, arrival 2, and one each of unit, march, movement, arrival_road and gap; 27 documented, 24 inferred, 1 open gap. Every quote is at most 14 words and was found by code at its offset in the named report or section; every `printed` field stands in the passage read, except the six listed in the warnings above (digits read on the page image, each flagged `ocr_uncertain` with the reading in `fidelity_note`). The records come from a builder in `tmp/units-us-hq-artres/` (`lib.py`, `auth.py`, `auth2.py`, specs `s10` to `s96`, `t10` to `t80`, and `u10` to `u40` of this pass; `run.py` rebuilds the file; `ids.json` keeps claim ids stable; `audit/` holds the dry-run and comparison tools of this pass). Scratch files are untracked and are not shipped.

## 2. What the third pass added

| Source | Records | What |
|---|---|---|
| Abstract of returns for 30 June 1863 (R008, printed p. 151), read on the page image because the text layer is scrambled | 0317 to 0331 | Artillery Reserve (Tyler): 104 officers, 2,464 men, aggregate present 2,745 (the row also prints 110 pieces, against 150 reported in a footnote); general headquarters 50 officers; Signal Corps 6 officers; the row Guards and orderlies (Ingalls) 2 officers, 47 men, 57 aggregate, taken as the Oneida Cavalry (inferred); Engineer Brigade 40 officers, 906 men, 1,131; the row Provost-guard (Patrick) 84 officers, 1,445 men, 1,787, taken as the Provost-Marshal-General's command (inferred). The column sums of the 30 June block (6,629 / 97,627 / 117,930 and the equipped columns) were added and agree with the printed totals |
| Toombs, New Jersey commands (1888, a compiler's table of the strength present for duty on 30 June 1863) | 0332 to 0337 | 4th New Jersey as train guard: 20 officers, 274 men, 294 (the other 4 officers and 88 men were with the First Division, Sixth Corps; the whole regiment is 24, 362, 386); Battery A, 1st New Jersey: 4 officers, 112 men, 116 (agrees with the figures of the first version). Tier inferred |
| Footnote of Phillips' report (R319, p. 884), page image | 0308, 0309 and the edits of 0016 to 0025 | Thompson's consolidated Batteries C and F, Pennsylvania: 5 officers (the text layer prints "i"); the 15th New York's 2 officers (the text layer prints 3) |
| Provost-Marshal-General's command (organization table, R009, p. 155) | 0328 (new unit), 0329 to 0331, 0357, 0358, 0359 (gap) | A command that the table places between general headquarters and five units the roster hangs directly under headquarters (93d New York, eight companies of the 8th U. S., the Pennsylvania cavalry of Col. Price, Companies E and I of the 6th Pennsylvania Cavalry, regular cavalry detachments); Ewing (R335) turned about 400 to 500 stragglers over to General Patrick about noon on 3 July; Hopper (R127) reached General Patrick's headquarters about 6 p. m. on 3 July with some 1,800 prisoners |
| Datelines of Meade's dispatches to Halleck (R006) | 0338 to 0340 | Headquarters at Taneytown at 12 m. on 1 July; at Headquarters Army of the Potomac at 8 p. m. on 2 July (place inferred: troop-map label TM2-142); near Gettysburg at 8.35 p. m. on 3 July |
| Second witnesses found by searching all of part 1 for the batteries' names | 0314, 0315, 0316, 0341 to 0345 | Harrow (R099, the First Minnesota moved to the left of Thomas's battery on 2 July; Thomas destroyed large numbers); Randolph (R181, Ames placed in the peach orchard, Bigelow's Ninth Massachusetts placed in the open field left of Ames and fighting there); McCartney (R238, the 1st New Hampshire on the left of the cemetery at about 4 p. m. on 3 July); Coons (R117, Ricketts' two batteries at about dark on 2 July) |
| Hunt in Battles and Leaders, vol. 3 (1887: a staff officer writing 24 years later, so each record carries that date in its note) | 0310 to 0313, 0346 to 0353, 0355 | The headquarters' march from Taneytown toward 11 p. m. and arrival after midnight; the Reserve's arrival at 10:30 a. m. on 2 July and its park on the cross-road; the Ninth Massachusetts' stand by the Trostle house; the Plum Run line; McGilvery's 41 guns on 3 July; Ricketts' batteries overrun on 2 July; Fitzhugh, Parsons and Weir put in "near the clump of trees" when the fire was ordered to cease on 3 July; the Reserve and its trains sent to a safer place during the cannonade |
| Hunt's report (R028, p. 239) and Gillett's report (R316) | 0354, 0356 | Weir at about 3 p. m. on 3 July; the road of the 4th New Jersey (the train guard) from Taneytown, entered as the Taneytown road (inferred) |

Places and times follow the rules of the contract: a record whose passage prints no hour is entered as a day part or a sequence and never given a clock; places that no troop-map label, gazetteer entry or monument holds stay words with the reason in `note` (the two new ones are Taneytown and General Patrick's headquarters). No unit is placed before its earliest documented arrival: the new records of Ames, Bigelow, McCartney's relief and the Reserve all follow the arrival records already in the file, and the headquarters' arrival after midnight (0312) is entered as a day only so that it does not move the gate.

## 3. Corrections of earlier records

A line-by-line read of the 307 records of the second version against their passages, and a code check that every number of a statement stands in its passage, found these defects; each was repaired in place with the id kept:

- Statements that went beyond their passage, repaired by widening the passage or trimming the statement: 0139, 0199, 0213, 0239, 0250, 0070, 0079, 0232 (Weir's "got off but three of his guns", the four guns recaptured in Randall's report R070 are in the note).
- 0257 (headquarters leave on 5 July) said 5 a. m.: the passage prints 5.30 a. m. (5 a. m. is Mendell's order in the same dispatch); corrected.
- 0205 and 0209 (Thompson's consolidated battery on the night of 2 July): the period "morning" taken from "until morning" would have set the battery at 04:35 on 2 July; they are now `night_position` records, placed after the retirement, lasting until the morning of 3 July.
- 0020, 0021 and 0056 (Fifteenth New York officers): the text layer of p. 884 prints 3; the page image prints 2 officers and 68 men and the footnote's printed total (15 officers, 368 men) agrees with 2. The conflict with the New York volume that the first version carried (2 against 3) was an OCR artefact and is removed; the volume now corroborates. Thompson's 5 officers are new (0308, 0309).
- 0016 to 0025 (strengths in the footnote of p. 884): the text layer also prints "the action of July 3 and 3", the page image prints July 2 and 3, which the statements follow; the note is in each `fidelity_note`.
- Found by the second reading of the scan pages (section 8) and repaired in place:
  - 0174 (McGilvery's retirement at about a quarter to 6 on 2 July): the text layer prints "retire 350 yards", the page image prints 250 yards. The statement, the distance behind the troop-map label (it places the battery to the rear of the first line) and the reasoning now say 250; the quote stops before the figure (the text layer's 350 stays in the passage, so the record is `ocr_uncertain` with the reading in `fidelity_note`). The earlier record put the position 100 yards too far to the rear.
  - 0196 and 0197 (Milton, Ninth Massachusetts, the end of the stay on 3 to 5 July): the statement of 0197 said "about 10 p. m. on 5 July" from the damaged "10 ^. m."; the page image prints "about 10 a. m. of the 5th". Both records now carry the hour (10:00 on 5 July, approximate) and the statement says a. m.
  - 0300 (Newton at the cemetery gate): the earlier note called the heading "July 3" a defect of the report; the page image prints "July 2.—In obedience to an order...", so the text layer was misread and the date is printed (the record keeps `ocr_uncertain` because the passage as held reads July 3).
  - 0233 (Weir told he was not wanted with "light 12-pounders"): the text layer prints 13-pounders; the page image prints 12 (the statement already said 12; the note is added).
- 0083, 0084, 0085, 0087, 0088 (the five units of the Provost command): `parent` changed from `us-aop-hq` to the new `us-aop-hq-provost`, because the table puts the command between them and headquarters. The roster of groups still hangs them under `us-aop-hq`; the integrator must read the `parent` of these records (new unit id, parent-id plus slug as the contract asks; not pre-assigned in `roster-gaps.json`). The unit record of the Pennsylvania cavalry (0085, 0086) now also says that the page image prints 2d where the text layer prints 3d.
- Conflict links added to existing records for the new witnesses: 0058, 0065, 0066, 0067, 0125, 0129, 0130, 0228; the McGilvery line-order record (0181) now carries the guns conflict with Hunt's 41 (it was one-way); gap records 0060 to 0063 and 0111 updated for what the abstract, Toombs and the inscriptions now give.

## 4. Conflicts carried (every disagreeing record names the others in `conflicts_with`; none chosen)

New in this pass:

- Headquarters leaves Taneytown at 10 p. m. (Meade), toward 11 p. m. (Hunt, 1887) or after waiting until 12 (Butterfield's note); reaches the field at 1 a. m. (Meade), about 2 a. m. (Hunt's report) or after midnight (Hunt, 1887).
- Ames on 2 July: in the orchard before the fire renewed at about 3 p. m. (Randolph) against behind the woods near the stone barn until 3 p. m. and then forward on Randolph's order (Ames).
- Thomas (C, 4th U. S.) on 2 July: held a place beside the line of the Second Corps' division (Harrow, Tyler; Hancock names the battery on that line) against ordered forward to Humphreys' division (Hunt).
- McGilvery's line on the morning of 3 July: 39 guns (McGilvery) against 41 guns (Hunt, 1887).
- Fitzhugh's and Parsons' batteries on 3 July: 1 p. m. (Fitzhugh), about 3 p. m. (Hunt, Parsons, the New Jersey inscription), after the first repulse (Hancock), and now Hunt's 1887 account that they were put in near the clump of trees when the fire was ordered to cease.

Carried from the earlier versions and unchanged: the arrival of the 1st Regular and 4th Volunteer Brigades (Tyler's 22:30 on 1 July as a floor, Weir, Fitzhugh about 8 a. m.) and of Hancock (3, 4 or about 4 p. m.); Weir on 2 July (ordered forward to Humphreys against ordered by Hancock and Gibbon about 4 o'clock); Hart's battery on 2 and 3 July; Thompson's neighbours on 3 July (Battery K, 4th U. S. on the right in Thompson's report against Thomas in McGilvery's, Hunt's and Phillips'); Ames on the morning of 3 July; Rigby (from the morning of 2 July against soon after daylight on 3 July); Battery H, 1st Ohio (Norton against Edgell); the night of 6 July at Gettysburg (Meade) or Frederick (Ingalls). The hour at which the cannonade of 3 July opened is carried in each unit's record as printed (about 10, 11, 12, 12.30, 1, 1.30, 2 and 3).

## 5. Open gaps (11 gap records; each has its proposed register entry)

| Gap record | What | Register entry |
|---|---|---|
| 0060, 0061, 0062, 0063 | strength of 13 roster batteries (the `covers` list them): the reports, the returns, the state volumes on this machine and Fox print no figure; Ricketts' F and G, Thompson's C and F and the 4th New Jersey's train guard, Battery A (1st New Jersey) and the Engineer Brigade have figures now and are out of the list | us-hq-artres-strength-ransom, -taft, -huntington, -fitzhugh |
| 0111 | strength of army headquarters: the abstract gives 50 officers; the staff, the orderlies and the quartermaster's and other departments' men are in no row read | us-hq-artres-strength-aop-hq |
| 0112 | strength of Hancock's party | us-hq-artres-strength-hancock |
| 0113 | roster: the 11th New York Battery attached to Battery K (the footnote of p. 168 is lost in the text layer) | us-hq-artres-roster-11ny |
| 0115, 0116 | positions of the 93d New York and the eight companies of the 8th U. S. at headquarters | us-hq-artres-hq-guards-positions |
| 0296 | Company C, 32d Massachusetts: the road, a place on 1 and 2 July and the number of men | us-hq-artres-32ma-co-c |
| 0359 (new) | the Provost-Marshal-General's command as a whole: arrival, path and positions of 1 and 2 July (the units below it are covered by 0115 and 0116 and by the records of the table) | us-hq-artres-provost-command |

Busey and Martin remain NOT-ACQUIRED in every strength gap (only the owner can acquire it). In the third pass no new host was needed: the new texts are the Battles and Leaders section files, Toombs and the Official Records already on this machine.

## 6. Roster actions

Unchanged from the second version (18 `unit` records for the 18 roster-gap entries, the status of the 4th New Jersey and Batteries B and M, the merged consolidated batteries, the Engineer Brigade, Company C of the 32d Massachusetts reparented to the Artillery Reserve) plus: the new unit `us-aop-hq-provost` (action `add`, parent `us-aop-hq`, level command, arm headquarters; record 0328) and the new parent of the five units of its command (section 3).

## 7. Defects found

1. Text-layer misreads that change a fact, found by looking at the page image or at a second reading of the scan: p. 884, "July 3 and 3" for July 2 and 3, "3 officers" for 2, "i officers" for 5; p. 155, "3d Pennsylvania Cavalry" for 2d and "let" for 1st; p. 151, the abstract of returns is scrambled (labels separated from the columns, "l,78r" for 1,787, "67" cells). The earlier second-version defects stay: Milton's "7.80 p. m.", Weir's "1.3( o'clock", Milton's "10 ^. m.", Tyler's "li miles", Newton's heading "July 3" over an entry of 2 July, Meade's "extreme l^f t".
2. The first version's request about Company C (assigned to two groups) was answered by the plan; the note stays as the record of it. The footnotes of p. 168 of the organization table (stars of the two Connecticut heavy batteries, dagger of Battery K) are lost in the text layer of both copies read.
3. Tyler's "about eight batteries" of 1 July does not match the batteries of the two brigades he names; the roster draws Batteries F and K, 3d U. S., C and F Pa., and F and G, 1st Pa., as six units while the table prints three consolidated batteries (the records on both ids say so).
4. State-volume index: section `PA2-S036` (heading BATTERY "H"*) holds the inscriptions of Ricketts' and Thompson's batteries; `NY3-S024` (heading Battery G) holds the inscription of Battery K; `ME-S021` holds the roster of the Sixth Maine under another heading. The index is not changed.
5. Hunt (p. 232) puts Osborn's batteries "in the cemetery grounds, to the north of the Baltimore road" and (p. 233) "on the south of the road": the records use "Cemetery Hill" and carry neither side.
6. The Itinerary (R007) is a compilation of the 1880s by Kirkley, so it is a `compiler` source (tier inferred); Thompson's report names Battery K, 4th U. S. on his right where Hunt, McGilvery and Phillips name Thomas (carried as a conflict of neighbours).
7. Hunt's account of 1887 (Battles and Leaders) is a staff officer's later writing; it is entered with that date in each note and its tier follows the claim (documented where it names its own act or the order of an hour, inferred where the place is a reading).

## 8. Checks of the readings

[[DIGITS]]

## 9. Read and not read

Read in full: OR27-1 R315 to R335 (all 21 reports and enclosures of the Reserve), R028 (Hunt), R264 (Osborn), R017 (Norton, pp. 201 to 207), R007 (the entries of 28 June to 7 July), R009 (the Artillery Reserve sections and the Provost command), R008 (the 30 June abstract, page image), OR27-3 D0982, D1001, D1003, D2099, D1120 and D1207; PA2 pp. 1046 to 1050 and the sketch of Ricketts (PA2-S035); NY3-S024, S026, S029; ME-S021, NJ-FINAL-1891; this pass: Battles and Leaders vol. 3, Hunt's two articles (BL3-S030 and S038), Toombs (NJ-TOOMBS-1888, the table of 30 June strengths). Read in the parts that name the group: R076 (Hancock), R006 (Meade, the datelines and the passages of the first version), R099 (Harrow, pp. 419 and 420), R181 (Randolph, pp. 582 and 583), R238 (McCartney, p. 689), R117 (Coons, p. 459), R127 (Hopper, p. 471), R158, R133, R071, R075, R044, R243, R030, R024, R186, R271, R272; R025 (Patrick: the report is an estimate of prisoners and names no unit or place of the command: no result); OH-DED-1887 (a fragment of 10,832 characters: no positions); STORY-32MA-1880 (three passages). Not read: R013, R016, the full reports of Gibbon, Webb, Hays, Caldwell, Wainwright, Slocum and Williams, the sections of the state volumes beyond the passages cited, and any text the owner has not supplied.

## 10. Owed

- Strengths of the batteries named in the strength gaps: Busey and Martin (owner), or a state volume of New Hampshire, Connecticut, West Virginia, Maryland or Ohio with the figure; a muster roll of Company C, 32d Massachusetts (owner); a regimental history of the 93d New York, the 8th U. S. or the 2d Pennsylvania Cavalry for the Provost command (owner).
- Monument anchors for the batteries whose state volumes are not on this machine (Massachusetts, Connecticut, New Hampshire, West Virginia, Maryland, Ohio).
- Second witnesses for the 3 July positions of Weir, Thomas, Fitzhugh and Parsons from the reports of Gibbon, Webb, Hays and Caldwell (they belong to the groups of the Second Corps); positions of 4 July; the identification of Ames' "Frederick and Gettysburg pike".
- The roster of groups must take the new parent of the five Provost units (section 3).

## 11. What was not run

No browser, node suite, gate, timing run or machine-lock (`bench.sh`) job was run for this group; no milestone is claimed complete and `FINAL-ACCEPTANCE.md` was not run. Nothing was committed, merged or deployed; no gate, flag, roster, ledger or layer file was touched, and no request note was needed.
