# I Corps (us-1c): evidence report for OA11

Date: 2026-11-16. Group: us-1c, the First Army Corps (Reynolds, Doubleday, Newton) and Wainwright's artillery brigade, 26 June to 14 July 1863.
File: `docs/battle-theatre/life/evidence/us-1c.jsonl`, 297 rows. `python3 -I tools/bt/life/validate_evidence.py us-1c`: 297 rows, 0 errors, 0 warnings. `--all`: 0 errors (the warnings it prints belong to the files of other groups).
Proposed register entries: `docs/battle-theatre/GOVERNANCE/horde/ws-life/proposed-register/us-1c-EG-LIFE-0101.md` to `-0115.md`.
This report marks no milestone as complete. OA-G11, Q08 and Q17 are later steps; the only check run on the file is the validator and a mechanical date and unit cross-check (section 11).

## 1. Counts

| kind | documented | inferred | plausible-procedural | open gap | total |
|---|---|---|---|---|---|
| labour | 73 | 10 | 0 | 8 | 91 |
| routine | 190 | 5 | 4 | 7 | 206 |
| both | 263 | 15 | 4 | 15 | 297 |

Labour rows by kind: breastwork_infantry 46, rail_barricade 9, other_labour 9, earth_parapet 7, fence_taken_down 7, gun_pit_or_epaulement 5, rifle_pits 2, tools_issue_or_carry 2, log_works 1, wall_improved 1, stone_works 1, abatis_or_slashing 1.
Routine rows by kind: sleep_bivouac 60, camp_made 40, picket_duty 31, rest_halt 21, roll_call 13, ammunition_issue 10, guard_duty 7, burial_party 5, meal 3, other_routine 3, ration_issue 3, music_calls 3, forage_requisition 2, water_carrying 2, idle_camp_life 1, horse_care 1, cooking 1.
By source: Official Records part 1 (OR-27-1) 184; Pennsylvania at Gettysburg vol. 2 (1914) 23 and vol. 1 (1904) 13; New York at Gettysburg 1900 vol. 2 15 and 1902 vol. 3 10; Maine at Gettysburg 12; Michigan at Gettysburg 4; National Park Service texts 17 (NPS-CLI-1STDAY 7, NPS-CLR-1STDAY 5, NPS-HS-MCPHERSON 3, NPS-HB9-1954 2); Butterfield 1863 3 and Army Regulations 1861 1 (the four plausible-procedural rows); gap rows 15 (no source).
By unit: Second Division 130, Third Division 62, First Division 42, Artillery Brigade 17, corps level 18, other units met in the owned texts 15 (cavalry, XI and XII Corps, Confederate), no unit (builder unknown or gap) 13.
Windows: stated_date 84, stated_period 74, stated_clock 64, sun_event 58, report_span 12, procedural 4, other_row 1. Men are stated in 10 rows and tools in 48 rows; everywhere else the number of men is `unknown`.
Each of the 15 inferred rows states its basis in `tier_basis` (a date counted, a builder not named, an activity not stated).

## 2. The works of the group

| work | rows | note |
|---|---|---|
| E-01 Seminary Ridge rail work | 16 (12 documented, 3 inferred, 1 gap) | builder, place, form and hour are carried as conflicts (section 3); men and tools: gap EG-LIFE-0101 |
| E-02 Culp's Hill works, evening of 1 July | 4 (2 documented, 2 gaps) | the 7th Indiana (Grover) and Cutler's brigade (95th New York narrative); the tools of the 6th Wisconsin and the order of work: gaps EG-LIFE-0102 and 0103 |
| S-014 Culp's Hill north slope (schedule row) | the E-02 rows | the same labour as E-02: no row of its own (the same passage twice is refused); named in the notes of the four E-02 rows and in EG-LIFE-0102 and 0103 |
| G-02 gun works of the I Corps batteries | 1 gap | no text says the gunners built anything on Seminary Ridge: EG-LIFE-0104 |
| S-009 McMillan fences | 1 gap | the statement is in another group's text (Cultural Landscapes Inventory of Pickett's Charge): EG-LIFE-0106 |
| S-010 Seminary Ridge fences | 1 inferred, 1 gap | 3,108 rails lost from Schmucker's farm (inferred); the 600 yards of the plan is stated by no text: EG-LIFE-0107 |
| W-13MA-RIFLE-PIT | 1 gap | the only statement is in a regimental history not yet citable: EG-LIFE-0105 |
| W-COULTER-BREASTWORKS | 2 documented | Coulter's brigade and the 107th Pennsylvania, behind Cemetery Hill, evening of 1 July |
| W-SEMINARY-BREASTWORKS-94NY | 1 inferred | the 94th New York "ordered to throw up" on 1 July |
| other works met in the owned texts | G-03 1, G-18 4, E-04 1, E-14 1, W-CEM-RIDGE-RAIL-STONE 8 (7 documented, 1 gap), W-CONFED-OAK-HILL-BENNER 2, W-CONFED-SEMINARY-WORKS 2 | cross-listed |

## 3. Conflicts carried (10 scenarios, 33 links, no default chosen)

| scenario key | kind | rows | values kept |
|---|---|---|---|
| E01-ARRIVAL-1100-vs-1300 | time | L001, L003, L004, L005 | Robinson's division at the seminary about 11 a. m. (Baxter, Coulter) against about 1 p. m. (Wheelock, Fry, Small) |
| E01-BUILDER | builder | L002-L004, L006-L010, L067-L069 | Paul's First Brigade; Robinson's troops; the Second Brigade, Second Division; "some of the other troops" (Rowley); "some of our troops in the earlier part of the day"; the 13th Massachusetts by Doubleday's order |
| E01-PLACE | place | L002, L006, L009-L011, L069, L071 | "just in front of the seminary"; "through the west edge of the grove"; "some 40 yards in front of this battery"; "a little to the west of the building"; "some eighth of a mile in our rear and in front of Gettysburg College"; "north of the seminary buildings"; "in rear of the Seminary" |
| E01-FORM | other | L002, L006, L009 | "a redoubt of earth and fence rails, in a circular form" against "a temporary breastwork made of rails, stumps, &c" and "a slight breastwork of loose rails" |
| G03-5ME-DUSK-vs-NIGHT | time | L032, L033 | earthworks before the guns "At dusk" (Wainwright) against "During the night" (Whittier) |
| HALL-GUN-RECOVERY | other | L037, L038 | the abandoned gun brought off by Converse's party (Dawes, Doubleday) or by Hall with a limber and one sergeant |
| FUNKSTOWN-10-vs-12 | time | L043, R105 | front-line work near Funkstown "the 10th" (Irvin, Dana) against "Sunday" (12 July) |
| 11PA-88PA-12JUL | time | L059, L062 | both regiments print "July 13" for entries that describe 12 July |
| 104NY-30JUN-PLACE | place | R027, R072 | "north of Emmitsburg" across the State line (Fry) against "at Emmitsburg" (the regiment's narrative) |
| MARCH23-29-vs-30JUN | time | R018, R020, R021, R138 | the 23-mile march in rain on 29 June (three regiments) against 30 June (an address) |

The wordings of the 150th Pennsylvania's camp of 30 June (Huidekoper: "left camp near Emmitsburg"; the 1914 address: a wood at Marsh Creek, three and a half miles beyond Emmitsburg) are kept in rows R181 and R195 and said so in their notes; they are not entered as a scenario because they need not conflict.

## 4. Registered gaps (15 rows, 15 proposed entries)

| entry | row | gap | substitute named in the entry |
|---|---|---|---|
| EG-LIFE-0101 | L084 | E-01: number of men and tools at the Seminary Ridge rail work | procedural crew marked as such, no count |
| EG-LIFE-0102 | L085 | E-02 (and S-014): the 6th Wisconsin's tools ("a dozen spades and shovels" is in a memoir not yet citable) | tool count marked plausible-procedural until the text is registered |
| EG-LIFE-0103 | L086 | E-02 (and S-014): which regiment began first, and at what hour | the evening of 1 July as the sources give it; order and hour marked |
| EG-LIFE-0104 | L087 | G-02: no gun pit, platform or earth documented | guns shown without works, no construction animation |
| EG-LIFE-0105 | L088 | W-13MA-RIFLE-PIT: only in a regimental history not yet citable | pit marked plausible-procedural, place differs from the plan's |
| EG-LIFE-0106 | L089 | S-009 McMillan fences: statement lies in another group's text | the owner of that text writes the row |
| EG-LIFE-0107 | L090 | S-010: length of fence taken down | length marked "not documented" |
| EG-LIFE-0108 | L091 | the slashing on the bluff: who felled the trees, and when | standing with a gap marker, no felling animation |
| EG-LIFE-0109 | R165 | the camps of the corps, 26 and 27 June | generic rows (Regulations 1861, Butterfield 1863) |
| EG-LIFE-0110 | R166 | First Division, 4-14 July (two rows only after 3 July: 56th Pennsylvania 5 July, 7th Indiana 8 July) | generic rows |
| EG-LIFE-0111 | R167 | Artillery Brigade, 4-14 July | generic rows |
| EG-LIFE-0112 | R168 | meals and rations of the corps, 2-3 July | generic ration row, no meal hour |
| EG-LIFE-0113 | R188 | Third Division, 26-29 June | generic rows |
| EG-LIFE-0114 | R189 | Third Division, the night of 9-10 July | generic night row |
| EG-LIFE-0115 | R190 | Artillery Brigade, 26-30 June | generic rows |

Each gap row carries a `searched` list (source, pattern, result); a hit that did not apply is recorded as such, a failed lookup as `no_hit`.

## 5. Plausible-procedural rows (4, all `generic`)

R169 and R170: Butterfield's rules for outposts, sentinels and the grand guard (Camp and Picket Duty, 1863), applied to the First Division on the nights of 2-3 and 3-4 July (two different passages); R171: the ration table of the Army Regulations of 1861, for the corps on 2-3 July; R172: the company cooks called in time to prepare coffee and breakfast before reveille (Butterfield), for Paul's brigade on the morning of 30 June. No meal hour is given by any of them. None is marked documented; each says in its notes that it is a manual of the period and not a statement about the unit.

## 6. The nights, 26/27 June to 13/14 July

Each cell counts routine rows of the night kinds (sleep_bivouac, camp_made, picket_duty, rest_halt, guard_duty) whose window overlaps the night from sunset to sunrise. A number is a row whose window is shorter than a day or has an hour or a part of the day; `d` is a row with a whole date or longer ("on the 6th ... encamped"); PP a plausible-procedural row; GAP an open-gap row; `-` no row and no gap row: only the generic basis of the period manuals applies, and nothing is claimed. The corps column counts rows of the corps as a whole; the corps gap EG-LIFE-0109 covers 26 and 27 June for every division.

| night | 1st Div | 2nd Div | 3rd Div | Artillery | Corps |
|---|---|---|---|---|---|
| 6/26-6/27 | - | - | GAP | GAP | GAP |
| 6/27-6/28 | 1d | 2 | GAP | GAP | 2d GAP |
| 6/28-6/29 | 1 1d | 4 3d | GAP | GAP | 2d |
| 6/29-6/30 | 2 | 5 5d | 3d | GAP | 2 |
| 6/30-7/1 | 10 | 10 4d | 5 5d | 3 | 1 |
| 7/1-7/2 | 1 | 2 1d | 4 2d | 1 | 2 |
| 7/2-7/3 | 2 PP | 3 5d | 10 1d | 1 | - |
| 7/3-7/4 | PP GAP | 5 11d | 2 3d | GAP | - |
| 7/4-7/5 | GAP | 8d | 4d | GAP | - |
| 7/5-7/6 | 1 GAP | 4 7d | 4d | GAP | - |
| 7/6-7/7 | GAP | 2 7d | 2d | GAP | - |
| 7/7-7/8 | 1d GAP | 1 3d | 2d | GAP | - |
| 7/8-7/9 | 1d GAP | 1 2d | 1d | GAP | - |
| 7/9-7/10 | GAP | 3d | GAP | GAP | - |
| 7/10-7/11 | GAP | 4d | 1 1d | GAP | - |
| 7/11-7/12 | GAP | 2 3d | 1d | GAP | - |
| 7/12-7/13 | GAP | 1 1d | 1d | GAP | - |
| 7/13-7/14 | GAP | 3d | 2d | GAP | - |

The 1st and 2nd Division cells `-` for 26-27 June fall under the corps gap. The `-` in the corps column from 2 July on means only that no row is written for the corps as a whole: the divisions have their rows.
The night of 1-2 July has one to three rows per division: the reports say little of it beyond "lay on our arms".

## 7. What was searched

1. Official Records, series I, volume 27, part 1: the 47 reports assigned to this group by `report_assignments.json` (R029 to R073, R075, R328). Each was read through. Every sentence of all 47 was then tested against three lists of words (works and fortification; camp, bivouac, picket, rest and meal; roll-call, muster, food, water, forage, calls and kit) and compared with the rows: the sentences not inside the quote or the context of a row were listed, those with camp, meal, picket, rest, works or roll-call words that bear on a unit and a day were read one by one, and each was written as a row or set aside for a reason in section 9. 38 of the 47 records give rows (184 rows).
2. State volumes: the 40 sections assigned to this group by regiment: Pennsylvania at Gettysburg 1904 (PA1, 5 sections) and 1914 (PA2, 6), New York at Gettysburg 1900 vol. 1 (NY1, 11) and vol. 2 (NY2, 5), 1902 vol. 3 (NY3, 9), Maine at Gettysburg 1898 (3), Michigan at Gettysburg 1889 (1). Searched sentence by sentence with the same three lists; the uncovered sentences with camp, meal, picket, rest, works or roll-call words were listed and read one by one, and the paragraph of each that had a date or a unit. The sections were not read from end to end. 16 sections give rows (77 rows: PA1 13, PA2 23, NY2 15, NY3 10, ME 12, MI 4). The 11 NY1 sections hold lists of names (officers and enlisted men killed or wounded) and give none.
3. National Park Service texts: NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPSGOV-FIRST-DAY, NPS-HS-MCPHERSON, NPS-HB9-1954, NPS-HB9-1962. Searched by keyword and every hit read in its paragraph. They give 17 rows (secondary, modern: said so in the notes); NPS-HB9-1962 and the NPSGOV page give none (the one hit, "entrenching tools were in short supply", names no unit).
4. Period manuals (Army Regulations 1861, Butterfield's Camp and Picket Duty 1863): only for the four plausible-procedural rows, each with its own quote.
5. For each gap row a list of searches, in the row. For E-02, E-01 and the 13th Massachusetts the lists name the records and sections that were checked.
6. Five regimental histories on this machine that are not in the source registry (Dawes 6th Wisconsin 1890, Curtis 24th Michigan 1891, Davis 13th Massachusetts 1894, Cook 12th Massachusetts 1882, Small 16th Maine 1886) were read at the statements the work needed; 35 rows were written from them and staged (section 10).

## 8. What was not found

Units with no row at all (the unit is named in the owned texts; nothing is written for it):

* 19th Indiana: no report of its own in the Official Records; its volume (IN-1913) belongs to another group and was not searched.
* 2nd Wisconsin: its report (Mansfield, R034) is tactical.
* 76th New York: its report (Cook, R039) is tactical; its history (Smith, 1867) is on this machine and was not read.
* 12th Massachusetts: no report in the owned records; Cook (1882) has statements, staged.
* 14th Vermont: no statement in the owned records (the 13th Vermont and the brigade have rows); the Vermont volumes belong to another group; Benedict (1886) was not read.
* Battery E, First New York (Wilber's section): no statement of its own.
* Battery L, First New York: its report (Breck, OR27-1-R074) is assigned to the XI Corps group by the header rule; it holds a labour statement for the guns on Cemetery Hill ("I caused to be intrenched"). Not written here under the one-owner rule; request note filed.
* Battery B, Fourth United States: no report of its own; Wainwright and Doubleday give its position and fire only.

Official Records reports of this group with no row: R031 (the ordnance officer: a table of arms captured and ammunition expended, undated and badly printed), R032 (Wadsworth: movements), R034 (2nd Wisconsin), R039 (76th New York), R050 (107th Pennsylvania: casualties), R053 (97th New York), R061 (Stone), R065 (149th Pennsylvania: Dwight) and R328 (Ricketts: Batteries F and G of the Artillery Reserve, assigned to this group by mistake; no labour or routine statement).

Not found for any unit:

* a tool or a count of tools at the Seminary Ridge works; the number of men at them (EG-LIFE-0101);
* any statement that the gunners built a pit or a platform on Seminary Ridge (EG-LIFE-0104);
* a meal hour of any unit in the registered texts read: the three meal rows state "breakfast" or "hardtack and coffee" without an hour (the 13th Massachusetts' history, staged and not citable, has hardtack "between 6 and 7 o'clock" on the evening of 1 July);
* a camp, a meal or a picket of the corps on 26 and 27 June (the diaries begin on 28 June);
* the camps of the First Division and the artillery on the pursuit, 4-14 July, beyond the two First Division rows (EG-LIFE-0110, 0111).

## 9. What was set aside, and why (so that it is not read as lost)

* A quotation of one text inside another is carried once: Rowley's sentence on the rails "hastily thrown up by some of the other troops" printed again in Doubleday's report ("General Rowley says"; carried in row L008); the reports of MacThomson and Roath inside McCoy's address on the 107th Pennsylvania. A later retelling by the same author of a fact he already wrote is not repeated. Where a different author states the same fact for the same unit and day it is written as a second witness (for example the picket of the 16th Vermont in Doubleday's report and in Stannard's, or of the 149th and 150th Pennsylvania in Chamberlain's address and in Jones's report).
* Datelines ("Camp near Boonsborough, Md., July 11, 1863" in R039; "Camp near Middletown, July 10" in R070; "Camp near Gettysburg, July 4" in R064; "Bivouac in the Field, July 2" in R058) place the writer, not an activity of the unit; they are not rows. If the owner wants them as presence rows, these four datelines name a camp.
* Packs unslung and piled before the action on 1 July (R060, R062, R063, R067, R068): kit, not camp life; the kit texts belong to the equipment rows.
* "Lay down" or "lay under fire" in the line (R034, R036, R048 and others): tactical postures, not rest.
* The carrying and care of the wounded and the hospitals: other groups' rows.
* Statements before 26 June or after 14 July (the picket on the Occoquan before 24 June, the picket on the Monocacy in "June 20th" in the 94th New York narrative, the camps at Berlin, Waterford and Warrenton): outside the theatre clock.
* The nature of the 7th Indiana's duty "in the rear" on 1 July (R037, R038): not named; a row records the fact with a stand-in clip (R180).
* The rows from the five regimental histories (section 10).

## 10. Staged and not in the file

35 rows from the five regimental histories (ids L301 to L332 and R301 to R344 as reserved in `tmp/life-us-1c/pending/us-1c.pending.jsonl`, built from `tmp/life-us-1c/rows_p.py`) cannot be cited, because the validator accepts a quote only from a text in the source registry and these texts are not in it. They validate (0 errors, 0 warnings) in the merged file of 332 rows with a registry overlay (`pending/us-1c.merged.jsonl`). They hold: the tools of the 6th Wisconsin at Culp's Hill ("a dozen spades and shovels", E-02); the 13th Massachusetts' earthworks by Doubleday's order, the rifle pit and the hardtack at 6-7 p. m. on 1 July (E-01, W-13MA-RIFLE-PIT); the camps of the Iron Brigade on 26-27 June and of the 24th Michigan; the 16th Maine's camps, the picket of 27 June and an hour of departure on 30 June that differs from the Official Records (conflict C-16ME-30JUN); the 12th Massachusetts' camps and works. Request note: `docs/battle-theatre/GOVERNANCE/horde/requests/bt-life-us-1c-register-regimental-histories.md` (the registry change asked, sha256 of each copy, what is waiting). Until the registry takes them the group carries the gaps above and no documented row for these statements.

## 11. Not run, not claimed, owed

* Cross-check: `tmp/life-us-1c/xcheck.py` compared every row's dates in the quote with its window and every unit with the author of the record; it flags one date, row R175 (the 7th Indiana's camp of 8 July, counted from a printed "July 5"; tier inferred). A second reading of every row by someone other than the writer (PLAN section 10) is not done.
* Texts on this machine and not read for evidence: Smith, 76th New York (1867); Benedict, Vermont in the Civil War vol. 2 (1886); twelve further regimental texts of the oob-kit library (88th Pennsylvania, 9th New York State Militia, 150th Pennsylvania, 20th New York State Militia, 14th Brooklyn, 142nd Pennsylvania and others). The Indiana and Vermont state volumes (IN-1913, VT-GB-1914, VT-MON-1890) belong to another group.
* Official Records part 3 (the orders of 25 to 27 June) and the army-level diaries are not owned by this group.
* No page, view or animation was looked at; no browser, no GPU. No gate was run other than the validator (`check_governance.py` was not run by this pass).
* The scans find sentences by their words: a sentence about camp life or labour that uses none of the listed words, in a state volume or an address, is not found by this method.
* The validator does not read an hour written in words ("two p. m."): row L068 uses `stated_period` and says so (request note `bt-life-us-1c-validator-and-conventions.md`).

## 12. Request notes written

* `bt-life-us-1c-register-regimental-histories.md`: register five histories (and, when read, two more) so that the 35 staged rows can enter.
* `bt-life-us-1c-or-record-assignment.md`: OR27-1-R074 (Breck, Battery L, First New York, a battery of this corps) is assigned to the XI Corps group; OR27-1-R328 (Ricketts) to this group although it is the Artillery Reserve.
* `bt-life-us-1c-validator-and-conventions.md`: the clock words in letters, the EG-LIFE block numbering (block 01, `0101` to `0115`), the report file name (`.REPORT.md` in the ownership list, `.report.md` in `groups.json` and PLAN), and a sentence on one passage that names two units.
