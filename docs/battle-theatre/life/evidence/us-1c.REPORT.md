# I Corps (us-1c): evidence report for OA11

Date: 2026-11-16 (third run; the first two runs of 2026-11-14 and 2026-11-15/16 wrote the file, this run read it again). Group: us-1c, the First Army Corps (Reynolds, Doubleday, Newton) and Wainwright's artillery brigade, 26 June to 14 July 1863.
File: `docs/battle-theatre/life/evidence/us-1c.jsonl`, 297 rows. `python3 -I tools/bt/life/validate_evidence.py us-1c`: 297 row(s) in 1 file(s): 0 error(s), 0 warning(s). `--all`: 1382 row(s) in 7 file(s): 0 error(s), 31 warning(s) (the warnings belong to the files of other groups; none to this one). `--self-test`: SELF-TEST OK (55 checks, 0 failed).
Proposed register entries: `docs/battle-theatre/GOVERNANCE/horde/ws-life/proposed-register/us-1c-EG-LIFE-0101.md` to `-0115.md`.
This report marks no milestone as complete. OA-G11, Q08 and Q17 are later steps; the checks run on the file are the validator (and the self-test), the mechanical cross-checks of section 0 and the page-image checks of section 0.

## 0. The third run: the second reading

The earlier report (written the same day at 00:35) listed a second reading by someone other than the writer as not done (PLAN section 10). This run did it, row by row, with the quote beside its context in the text, and then against the scan pages:

* **Official Records.** All 184 Official Records rows were looked at on the scan page (leaf found by the leaf map of `docs/battle-theatre/kit/evidence/or27_leaf_pages.json`, the line by the text layer of the scan PDF `tmp/kit-plan/or27-pdf/`; crops in `tmp/life-us-1c/review/img/`). Four first crops missed their line (L040, L058, R107, R186): three were cropped again, and the sentence of L040 was read on the crop of L020, which stands on the same page. The scans print what the rows say except in the cases below, where the OCR text the validator reads differs from the page. The rows keep the OCR text as the quote (the contract: errors as printed) and carry the page reading in `ocr_repairs` (basis `page_image`) and in the notes.
* **State volumes.** The rows with an hour or a number from Pennsylvania at Gettysburg 1904 (6 rows) and 1914 (6), New York at Gettysburg vol. 3 (5) and Maine at Gettysburg (2) were checked on scan pages of copies fetched from archive.org (scratch, `tmp/life-us-1c/scans/`; the Maine scan is the `maineatgettysbur01main` copy local in `tmp/library/rosters/_pdf/`). New York at Gettysburg vol. 2: the rows with an hour or a number (L010, L012, R043, R044, R045, R070, R120, R121) are NOT checked on a page: the only local scan is a Google copy without a text layer whose leaves do not map to printed pages in a simple way; owed.
* **What the page images changed.** (1) R095 (94th New York): the print says "On the morning of the 5th", the OCR text "6th": the row moved from 6 July to 5 July. (2) The 11th Pennsylvania (L059) and the 88th Pennsylvania (L062) print "July 12" for the Funkstown/Hagerstown works; the OCR text reads 13 (and "At 13 m." for "At 12 m."): both rows are now `documented` with the page reading declared, and the scenario 11PA-88PA-12JUL (both regiments "print July 13") is withdrawn: it was an OCR artefact. (3) Headings the OCR garbled and the earlier run repaired by sequence are printed: R006 "June 28." and R021 "June 29." (88th Pennsylvania), R060 "July 5." (16th Maine), L066 "July 2." (Newton): `documented`, not `inferred`. (4) R014: "26 miles" on the page, the OCR text "36" (declared). (5) R031: the missing hour before "p. m." ("until p. m.") is missing in the print, not in the OCR. (6) L028 (88th Pennsylvania, "About 6 p. m." on 3 July): the digit and the date were confirmed on the page.
* **Other corrections.** 48 builder keys had leaked into the notes and tier bases ("row L_PAUL_robinson"): every key now reads as a row id. 12 conflict links were one-way (L002 named by six rows' place and form scenarios but carrying none; R105 and R018/R020/R021 likewise; L067-L069 missing from the builder list): every member of a scenario now carries it and lists every other member, and the builder refuses a file where one does not. 9 windows gave an hour no source gives (DD-LIFE-02: a period word is carried with the bounds of the stated day, a tighter bound only from a stated clock; morning ends and afternoon begins at noon): L046, L052, L074, L075, R046, R104, R180, R194, R203 repaired; R106 and L035 got the note that says where their hour comes from. Seven rows whose night window rested on "left camp on the morning of D" (R034, R035, R043, R176, R179, R181, R182) are `inferred` (the camp and the departure are stated, the night is reasoned); R118 (the 150th Pennsylvania "reposed on their arms": the passage speaks of all the troops) is `inferred`. R083 (24th Michigan served the guns) is `other_routine`, not `ammunition_issue`; R135 (a company "at corps headquarters": duty not named) is `other_routine`, not `guard_duty`; R009 no longer carries the orator's "thousand fires" as a count; R117 has its subject in the context quote; R172 (plausible-procedural breakfast) no longer starts at sunrise although the manual puts the cooks' call before Reveille; L010 (the 104th New York narrative) gives the arrival at the seminary "about 1 1 o'clock in the forenoon" while the same regiment's colonel (Fry, L005) says about 1 o'clock: it is now a member of the arrival scenario.
* **Duplicates and ownership.** L076 (Little Round Top stone works, National Park Service handbook, E-14) duplicated `us-5c-L042` (`--all` error); the work is us-5c's and its row the fuller (it carries the scenario C-E14-TIME): L076 is removed and its id stays unused (no id of this file moved: the builder pins them). S-009 (McMillan's fences) was a gap because the only statement is in the inventory of Pickett's Charge Battlefield, a text read by group us-2c, which wrote no row for it: the statement is now row L092 (documented, modern secondary text, builder unknown); the gap row L089 narrows to unit, men and length (EG-LIFE-0106 rewritten). If us-2c writes the same passage later, `--all` will say so and one of the two rows goes.

## 1. Counts

| kind | documented | inferred | plausible-procedural | open gap | total |
|---|---|---|---|---|---|
| labour | 76 | 7 | 0 | 8 | 91 |
| routine | 185 | 10 | 4 | 7 | 206 |
| both | 261 | 17 | 4 | 15 | 297 |

Labour rows by kind: breastwork_infantry 46, other_labour 9, rail_barricade 9, fence_taken_down 8, earth_parapet 7, gun_pit_or_epaulement 5, rifle_pits 2, tools_issue_or_carry 2, abatis_or_slashing 1, log_works 1, wall_improved 1.
Routine rows by kind: sleep_bivouac 60, camp_made 40, picket_duty 31, rest_halt 21, roll_call 13, ammunition_issue 9, guard_duty 6, burial_party 5, other_routine 5, meal 3, music_calls 3, ration_issue 3, forage_requisition 2, water_carrying 2, cooking 1, horse_care 1, idle_camp_life 1.
By source: Official Records part 1 (OR-27-1) 184; Pennsylvania at Gettysburg vol. 2 (1914) 23; Pennsylvania at Gettysburg vol. 1 (1904) 13; New York at Gettysburg 1900 vol. 2 15; 1902 vol. 3 10; Maine at Gettysburg 12; Michigan at Gettysburg 4; National Park Service texts 17 (NPS-CLI-1STDAY 7, NPS-CLI-PCB 1, NPS-CLR-1STDAY 5, NPS-HB9-1954 1, NPS-HS-MCPHERSON 3); period manuals 4 (BUTTERFIELD-1863 3, REGS-US-1861 1; the plausible-procedural rows); gap rows 15 (no source).
By unit: Second Division 130, Third Division 62, First Division 42, Artillery Brigade 17, corps level 18, other units 15, no unit (builder unknown or gap) 13.
Windows: stated_date 84, stated_period 75, stated_clock 64, sun_event 57, report_span 12, procedural 4, other_row 1. Men are stated in 10 rows and tools in 48 rows; everywhere else the number of men is `unknown`.
Rows with `ocr_repairs` (a page reading that differs from the OCR text): 8 (L059, L062, L066, R006, R014, R021, R060, R095). The inferred rows (17: L001, L002, L005, L011, L052, L054, L072, R034, R035, R043, R118, R131, R175, R176, R179, R181, R182) each state their basis in `tier_basis` (a date counted, a builder not named, an activity or a night not stated).

## 2. The works of the group

| work | rows | tiers | note |
|---|---|---|---|
| E-01 | 16 | 12 documented, 3 inferred, 1 open gap | Seminary Ridge rail work: builder, place, form, arrival hour carried as conflicts; men and tools: gap EG-LIFE-0101 |
| E-02 | 4 | 2 documented, 2 open gap | Culp's Hill works, evening of 1 July (and S-014, the schedule row, the same labour): the 7th Indiana (Grover) and Cutler's brigade; tools of the 6th Wisconsin and the order of work: gaps EG-LIFE-0102 and 0103 |
| E-04 | 1 | 1 documented | Cemetery Hill, the remnants of 1 July (National Park Service) |
| G-02 | 1 | 1 open gap | gun works of the I Corps batteries on Seminary Ridge: no text says the gunners built anything (EG-LIFE-0104) |
| G-03 | 1 | 1 documented | the batteries outside the cemetery gate, earthworks "At dusk" |
| G-18 | 3 | 3 documented | Stevens' Knoll, the Fifth Maine Battery (earth thrown up in the night; the 33rd Massachusetts rebuilt it) |
| S-009 | 2 | 1 documented, 1 open gap | McMillan's fences: the act is a documented row (L092, National Park Service inventory); unit, men and length: gap row L089, EG-LIFE-0106 |
| S-010 | 2 | 1 inferred, 1 open gap | Seminary Ridge fences: 3,108 rails lost from Schmucker's farm (inferred); the 600 yards of the plan is stated by no text (EG-LIFE-0107) |
| W-13MA-RIFLE-PIT | 1 | 1 open gap | the only statement is in a regimental history not yet citable (EG-LIFE-0105) |
| W-CEM-RIDGE-RAIL-STONE | 8 | 7 documented, 1 open gap | the left-centre rail and stone works of 2-3 July (Gates, Dana, Randall, Musser, Coulter, 88th Pennsylvania) |
| W-CONFED-OAK-HILL-BENNER | 2 | 2 documented | Confederate works on Oak Ridge (National Park Service) |
| W-CONFED-SEMINARY-WORKS | 2 | 2 documented | Confederate works along Seminary Ridge, 4 July (National Park Service) |
| W-COULTER-BREASTWORKS | 2 | 2 documented | Coulter's brigade and the 107th Pennsylvania, behind Cemetery Hill, evening of 1 July |
| W-SEMINARY-BREASTWORKS-94NY | 1 | 1 inferred | the 94th New York "ordered to throw up" on 1 July (inferred) |
| (no work id: works of the pursuit, 3-4 July and 8-12 July, and the guns hauled by hand) | 45 | | the rows carry the unit and the place; no work of the register names them |

## 3. Conflicts carried (9 scenarios, no default chosen)

| scenario key | kind | rows | values kept |
|---|---|---|---|
| E01-ARRIVAL-1100-vs-1300 | time | L001, L003, L004, L005, L010 | Robinson's division at the seminary about 11 a. m. (Baxter, Coulter; the 104th New York narrative, "about 1 1 o'clock in the forenoon") against about 1 p. m. (Wheelock, Fry, Small) |
| E01-BUILDER | builder | L002, L003, L004, L006, L007, L008, L009, L010, L067, L068, L069 | Paul's First Brigade; Robinson's troops; the Second Brigade, Second Division; "some of the other troops" (Rowley); "some of our troops in the earlier part of the day"; the 13th Massachusetts by Doubleday's order |
| E01-PLACE | place | L002, L006, L009, L010, L011, L069, L071 | "just in front of the seminary"; "through the west edge of the grove"; "some 40 yards in front of this battery"; "a little to the west of the building"; "north of the seminary buildings"; "along the west edge of Seminary Grove" |
| E01-FORM | other | L002, L006, L009 | "a redoubt of earth and fence rails, in a circular form" against "a temporary breastwork made of rails, stumps, &c" and "a slight breastwork of loose rails" |
| G03-5ME-DUSK-vs-NIGHT | time | L032, L033 | earthworks before the guns "At dusk" (Wainwright) against "During the night" (Whittier) |
| HALL-GUN-RECOVERY | other | L037, L038 | the abandoned gun brought off by Converse's party (Dawes, Doubleday) or by Hall with a limber and one sergeant |
| FUNKSTOWN-10-vs-12 | time | L043, R105 | front-line work near Funkstown "the 10th" (Irvin, Dana) against "Sunday" (12 July) |
| MARCH23-29-vs-30JUN | time | R018, R020, R021, R138 | the 23-mile march in rain on 29 June (three regiments of Baxter's and Paul's brigades) against 30 June (the 90th Pennsylvania address) |
| 104NY-30JUN-PLACE | place | R027, R072 | "north of Emmitsburg" across the State line (Fry) against "at Emmitsburg" (the regiment's narrative) |

Every member of a scenario carries it and lists every other member (198 links in all). The 150th Pennsylvania's camp of 30 June (Huidekoper: "left camp near Emmitsburg"; the 1914 address: a wood at Marsh Creek, three and a half miles beyond Emmitsburg) is kept in rows R181 and R195 and said so in their notes; the two need not conflict, so it is not a scenario.

## 4. Registered gaps (15 rows, 15 proposed entries)

| entry | row | gap |
|---|---|---|
| EG-LIFE-0101 | L084 | Seminary Ridge rail work (E-01): men and tools not stated |
| EG-LIFE-0102 | L085 | Culp's Hill works of the evening of 1 July (E-02, and its schedule row S-014): tools of the 6th Wisconsin |
| EG-LIFE-0103 | L086 | Culp's Hill works (E-02, and its schedule row S-014): which regiment began first, and at what hour |
| EG-LIFE-0104 | L087 | Gun works of the I Corps batteries on Seminary Ridge (G-02): none documented |
| EG-LIFE-0105 | L088 | 13th Massachusetts rifle pit of the night of 1-2 July (W-13MA-RIFLE-PIT) |
| EG-LIFE-0106 | L089 | McMillan's fences taken down on 1 July (S-009): the troops, their number and the length of fence are not stated |
| EG-LIFE-0107 | L090 | Length of fence taken down for the Seminary Ridge barricade (S-010): not stated |
| EG-LIFE-0108 | L091 | The slashing on the bluff before 3 July: who felled the trees and when |
| EG-LIFE-0109 | R165 | The corps' camps of 26 and 27 June: no statement in the texts read |
| EG-LIFE-0110 | R166 | First Division (Wadsworth), 4-14 July: camps, pickets and meals not stated |
| EG-LIFE-0111 | R167 | Artillery Brigade (Wainwright), 4-14 July: camps and routine not stated |
| EG-LIFE-0112 | R168 | Meals and rations of the corps on 2-3 July: no statement in the texts read |
| EG-LIFE-0113 | R188 | Third Division (Doubleday), 26-29 June: camps, pickets and meals not stated |
| EG-LIFE-0114 | R189 | Third Division, the night of 9-10 July: no statement |
| EG-LIFE-0115 | R190 | Artillery Brigade (Wainwright), 26-30 June: camps and routine not stated |

Each gap row carries a `searched` list (source, pattern, result); a hit that did not apply is recorded as such, a failed lookup as `no_hit`.

## 5. Plausible-procedural rows (4, all `generic`)

R169 (picket_duty, us-1c-1d, BUTTERFIELD-1863); R170 (picket_duty, us-1c-1d, BUTTERFIELD-1863); R171 (ration_issue, us-1c, REGS-US-1861); R172 (cooking, us-1c-2d-paul, BUTTERFIELD-1863). R169 and R170: Butterfield's rules for outposts, sentinels and the grand guard (Camp and Outpost Duty, 1863), applied to the First Division on the nights of 2-3 and 3-4 July (two different passages); R171: the ration table of the Army Regulations of 1861, for the corps on 2-3 July; R172: the company cooks called in time to prepare coffee and breakfast before Reveille (Butterfield), for Paul's brigade on the morning of 30 June (the window is the day's start to the documented 8 a. m. departure: the hour of Reveille that day is stated by no source). No meal hour is given by any of them. None is marked documented; each says in its notes that it is a manual of the period and not a statement about the unit.

## 6. The nights, 26/27 June to 13/14 July

Each cell counts routine rows of the night kinds (sleep_bivouac, camp_made, picket_duty, rest_halt, guard_duty) whose window overlaps the night from sunset to sunrise. A number is a row whose window is shorter than a day or has an hour or a part of the day; `d` is a row with a whole date or longer ("on the 6th ... encamped"); PP a plausible-procedural row; GAP an open-gap row; `-` no row and no gap row: only the generic basis of the period manuals applies, and nothing is claimed. The corps column counts rows of the corps as a whole; the corps gap EG-LIFE-0109 covers 26 and 27 June for every division. The `-` in the corps column from 2 July on means only that no row is written for the corps as a whole: the divisions have their rows. Inferred rows are counted with the others (section 1 lists them).

| night | 1st Div | 2nd Div | 3rd Div | Artillery | Corps |
|---|---|---|---|---|---|
| 6/26-6/27 | - | - | GAP | GAP | GAP |
| 6/27-6/28 | 1d | 2 | GAP | GAP | 2d GAP |
| 6/28-6/29 | 1 1d | 4 3d | GAP | GAP | 2d |
| 6/29-6/30 | 2 | 5 5d | 3d | GAP | 2 |
| 6/30-7/1 | 10 | 10 4d | 4 5d | 3 | 1 |
| 7/1-7/2 | 1 | 2 1d | 4 2d | 1 | 2 |
| 7/2-7/3 | 2 PP | 3 5d | 10 1d | 1 | - |
| 7/3-7/4 | PP GAP | 5 11d | 2 3d | GAP | - |
| 7/4-7/5 | GAP | 9d | 4d | GAP | - |
| 7/5-7/6 | 1 GAP | 4 7d | 4d | GAP | - |
| 7/6-7/7 | GAP | 2 6d | 2d | GAP | - |
| 7/7-7/8 | 1d GAP | 1 3d | 2d | GAP | - |
| 7/8-7/9 | 1d GAP | 1 2d | 1d | GAP | - |
| 7/9-7/10 | GAP | 3d | GAP | GAP | - |
| 7/10-7/11 | GAP | 4d | 1 1d | GAP | - |
| 7/11-7/12 | GAP | 1 4d | 1d | GAP | - |
| 7/12-7/13 | GAP | 1 1d | 1d | GAP | - |
| 7/13-7/14 | GAP | 3d | 2d | GAP | - |

## 7. What was searched

1. Official Records, series I, volume 27, part 1: the 47 reports assigned to this group by `report_assignments.json` (R029 to R073, R075, R328). Each was read through in the first run; every sentence of all 47 was tested against three lists of words (works and fortification; camp, bivouac, picket, rest and meal; roll-call, muster, food, water, forage, calls and kit) and compared with the rows. 38 of the 47 records give rows (184 rows). This run read all 184 rows again beside their context and on the scan pages.
2. State volumes: the 40 sections assigned to this group by regiment: Pennsylvania at Gettysburg 1904 (5 sections) and 1914 (6), New York at Gettysburg vol. 1 (11) and vol. 2 (5), vol. 3 (9), Maine at Gettysburg (3), Michigan at Gettysburg (1). Searched sentence by sentence with the same lists; the sections were not read from end to end. 16 sections give rows. The 11 New York vol. 1 sections hold lists of names and give none.
3. National Park Service texts: NPS-CLI-1STDAY, NPS-CLR-1STDAY, NPSGOV-FIRST-DAY, NPS-HS-MCPHERSON, NPS-HB9-1954, NPS-HB9-1962, and (this run, for S-009 only) NPS-CLI-PCB p. 72. They give rows (secondary, modern: said so in the notes); NPS-HB9-1962 and the NPSGOV page give none.
4. Period manuals (Army Regulations 1861, Butterfield 1863): only for the four plausible-procedural rows, each with its own quote.
5. For each gap row a list of searches, in the row.
6. Seven regimental histories on this machine that are not in the source registry were read: Dawes, Curtis, Davis, Cook and Small at the statements the work needed (35 staged rows, first and second run), and in the third run Williams (the campaign diary of the 14th Vermont, 26 June to 14 July 1864 print, read from the march to the pursuit) and Smith (the 76th New York: the chapters of the march to Gettysburg, the battle and the pursuit; sentences with the word lists, then read in their paragraphs): 26 more staged rows (section 10).

## 8. What was not found

Units with no row at all (the unit is named in the owned texts; nothing is written for it):

* 19th Indiana: no report of its own in the Official Records; its volume (IN-1913) belongs to another group and was not searched.
* 2nd Wisconsin: its report (Mansfield, R034) is tactical.
* 76th New York: its report (Cook, R039) is tactical; its history (Smith, 1867) is on this machine and not in the registry: 8 staged rows (section 10), none in the file.
* 12th Massachusetts: no report in the owned records; Cook (1882) has statements, staged.
* 14th Vermont: no statement in the owned records (the 13th Vermont and the brigade have rows); the Vermont volumes belong to another group; its history (Williams 1864) is on this machine and not in the registry: 18 staged rows (section 10), none in the file; Benedict (1886) was not read.
* Battery E, First New York (Wilber's section): no statement of its own.
* Battery L, First New York: its report (Breck, OR27-1-R074) is assigned to the XI Corps group by the header rule; it holds a labour statement for the guns on Cemetery Hill ("I caused to be intrenched"). Not written here under the one-owner rule; request note filed.
* Battery B, Fourth United States: no report of its own; Wainwright and Doubleday give its position and fire only.

Official Records reports of this group with no row: R031 (the ordnance officer: a table of arms captured and ammunition expended), R032 (Wadsworth: movements), R034 (2nd Wisconsin), R039 (76th New York), R050 (107th Pennsylvania: casualties), R053 (97th New York), R061 (Stone), R065 (149th Pennsylvania: Dwight) and R328 (Ricketts: Batteries F and G of the Artillery Reserve, assigned to this group by mistake; no labour or routine statement).

Not found for any unit:

* a tool or a count of tools at the Seminary Ridge works; the number of men at them (EG-LIFE-0101);
* any statement that the gunners built a pit or a platform on Seminary Ridge (EG-LIFE-0104);
* a meal hour of any unit in the registered texts read: the three meal rows state "breakfast" or "hardtack and coffee" without an hour (the 13th Massachusetts' history, staged and not citable, has hardtack "between 6 and 7 o'clock" on the evening of 1 July);
* the unit, the number of men and the length of fence at McMillan's fences (EG-LIFE-0106);
* a camp, a meal or a picket of the corps on 26 and 27 June (the diaries begin on 28 June);
* the camps of the First Division and the artillery on the pursuit, 4-14 July, beyond the two First Division rows (EG-LIFE-0110, 0111).

## 9. What was set aside, and why (so that it is not read as lost)

* A quotation of one text inside another is carried once: Rowley's sentence on the rails "hastily thrown up by some of the other troops" printed again in Doubleday's report ("General Rowley says"; carried in row L008); the reports of MacThomson and Roath inside McCoy's address on the 107th Pennsylvania. Where a different author states the same fact for the same unit and day it is written as a second witness.
* Datelines ("Camp near Boonsborough, Md., July 11, 1863" in R039; "Camp near Middletown, July 10" in R070; "Camp near Gettysburg, July 4" in R064; "Bivouac in the Field, July 2" in R058) place the writer, not an activity of the unit; they are not rows.
* Packs unslung and piled before the action on 1 July (R060, R062, R063, R067, R068): kit, not camp life; the kit texts belong to the equipment rows.
* "Lay down" or "lay under fire" in the line (R034, R036, R048 and others): tactical postures, not rest.
* The carrying and care of the wounded and the hospitals: other groups' rows.
* Statements before 26 June or after 14 July (the picket on the Occoquan, the picket on the Monocacy in "June 20th", the camps at Berlin, Waterford and Warrenton): outside the theatre clock.
* The nature of the 7th Indiana's duty "in the rear" on 1 July (R037, R038): not named; a row records the fact with a stand-in clip (R180).
* The Confederate use of McMillan's fencing in entrenchments (same passage as L092): works of the Southern groups.
* The rows from the seven regimental histories (section 10).

## 10. Staged and not in the file

61 rows from seven regimental histories (ids L301 to L332 and R301 to R344 as reserved for the first five, built from `tmp/life-us-1c/rows_p.py`; L401 and R401 to R417 for Williams, `rows_q.py`; L402 and R421 to R427 for Smith, `rows_r.py`) cannot be cited, because the validator accepts a quote only from a text in the source registry (`life/evidence/sources.json`, built 2026-11-14) and these texts are not in it: R. R. Dawes, Service with the Sixth Wisconsin Volunteers (1890); O. B. Curtis, History of the Twenty-fourth Michigan (1891); C. E. Davis, Three Years in the Army, the Thirteenth Massachusetts (1894); B. F. Cook, the Twelfth Massachusetts (1882); A. R. Small, the Sixteenth Maine (1886); (third run) Williams, Life in Camp, the Fourteenth Vermont (1864); A. P. Smith, the Seventy-sixth New York (1867). With a registry overlay (`tmp/life-us-1c/ovl.py`) the staged file validates alone (0 errors; the cross-file references are warnings) and merged with the rows of this file (`tmp/life-us-1c/pending/us-1c.merged.jsonl`, 358 rows) with 0 errors and 0 warnings. They hold: the tools of the 6th Wisconsin at Culp's Hill ("a dozen spades and shovels", E-02); the 13th Massachusetts' earthworks by Doubleday's order, the rifle pit and the hardtack at 6-7 p. m. on 1 July (E-01, W-13MA-RIFLE-PIT); the camps of the Iron Brigade on 26-27 June and of the 24th Michigan; the 16th Maine's camps, the picket of 27 June and an hour of departure on 30 June that differs from the Official Records (scenario 16ME-30JUN-8-vs-9); the 12th Massachusetts' camps and works; the Fourteenth Vermont's camps, halts, hours of reveille and breakfast, rations and works from 26 June to 10 July (Williams); the 76th New York's cherries, fences, muster and camp (Smith).
**To merge them** (after the registry change of the request note `bt-life-us-1c-register-regimental-histories.md`): do not append the staged lines to this file alone; the scenarios E01-ARRIVAL, E02-24MI-WHEN and 16ME-30JUN-8-vs-9 must list the new rows on the old ones. Run the builder: `cd tmp/life-us-1c && python3 -I build.py rows_a rows_b rows_c rows_c2 rows_c3 rows_d rows_e rows_f rows_g rows_h rows_i rows_j rows_k rows_l rows_m rows_n rows_p rows_q rows_r` (it writes `us-1c.jsonl` with the staged rows in, the links closed, every existing id unchanged), or copy `pending/us-1c.merged.jsonl`. Until the registry takes the texts the group carries the gaps above and no documented row for these statements.

## 11. Not run, not claimed, owed

* Page images: the rows from New York at Gettysburg vol. 2 (digits: L010, L012, R043, R044, R045, R070, R120, R121) were not checked on a scan page; the Michigan volume (no digit row) and the NPS texts (born-digital PDFs read as text) were not checked either.
* A third reader: this run was the second reading; the first two runs wrote the file. No reader other than the two sittings of this group has read it.
* Texts on this machine and not read for evidence: Benedict, Vermont in the Civil War vol. 2 (1886); and the oob-kit histories (88th Pennsylvania, Vautier 1894; 150th Pennsylvania, Chamberlin 1905; 142nd Pennsylvania reunions, Warren 1890; the Ulster Guard, Gates 1879; the 9th New York State Militia, Hussey 1889; the Fourteenth Brooklyn souvenir 1887; the 13th Vermont, Sturtevant 1910; Bates). The Indiana and Vermont state volumes (IN-1913, VT-GB-1914, VT-MON-1890) belong to another group.
* Official Records part 3 (the orders of 25 to 27 June) and the army-level diaries are not owned by this group.
* No page, view or animation was looked at; no browser, no GPU. No gate was run other than the validator (`check_governance.py` was not run by this pass).
* The scans find sentences by their words: a sentence about camp life or labour that uses none of the listed words, in a state volume or an address, is not found by this method.
* The validator does not read an hour written in words ("two p. m.") or "12 m.": rows L068, L059, L062 and R060 use `stated_period` and say so (request note `bt-life-us-1c-validator-and-conventions.md`).

## 12. Request notes written

* `bt-life-us-1c-register-regimental-histories.md`: register the histories so that the staged rows can enter (updated: how to merge).
* `bt-life-us-1c-or-record-assignment.md`: OR27-1-R074 (Breck, Battery L, First New York) is assigned to the XI Corps group; OR27-1-R328 (Ricketts) to this group although it is the Artillery Reserve.
* `bt-life-us-1c-validator-and-conventions.md`: the clock words in letters, the EG-LIFE block numbering (block 01, `0101` to `0115`), the report file name (`.REPORT.md` in the ownership list, `.report.md` in `groups.json` and PLAN), a sentence on one passage that names two units; (third run) the rule of DD-LIFE-02 applied to morning, afternoon and evening, and `ocr_repairs` on a quote that matches exactly.
* `bt-life-us-1c-second-reading-findings.md` (third run): the OCR date and digit errors found on the scans in a group's file (a risk for every group that reads the Official Records diaries), the duplicate with us-5c, and S-009.
