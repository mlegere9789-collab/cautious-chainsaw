# us-2c: II Corps (Hancock) and its artillery brigade: evidence pass of OA11

Date: 2026-11-15 and 2026-11-16 (first run); resumed run of 2026-11-16 (section 1a). Group us-2c of the OA11 evidence pass (`docs/battle-theatre/life/evidence/PLAN.md`, `groups.json`). Output: `docs/battle-theatre/life/evidence/us-2c.jsonl`. Governing rules: the Law of the project's standing instructions (never fabricate; gaps registered and shown; conflicts carried, no default); the contract of `contract.json`.

## 1. Result

**394 rows**: 96 labour, 298 routine. By tier: documented 310, inferred 64, plausible-procedural 15, open gap 5. Conflicts carried as selectable scenarios: 24 conflict ids on 70 rows. Validator, run on the final file:

* `python3 -I tools/bt/life/validate_evidence.py us-2c`: 394 row(s) in 1 file(s): 0 error(s), 20 warning(s)
* `... us-2c --strict` (no quote may need the OCR or edit-distance fold): 394 row(s) in 1 file(s): 0 error(s), 20 warning(s)
* `... --all` (every group file present, cross-file checks): 1382 row(s) in 7 file(s): 0 error(s), 31 warning(s)
* `... --self-test`: SELF-TEST OK (55 checks, 0 failed), run on 2026-11-15; the validator was not changed since.

The 20 warnings are of two kinds: 6 `window_date_not_in_quote` (the date of the entry is damaged in the print: "Jvly 13", "yth", "lath", "Jitne 30", "Wednesday, Jvly 8": us-2c-L014, us-2c-L017, us-2c-R008, us-2c-R028, us-2c-R048, us-2c-R300) and 14 `activity_hint` (the clip `lie_down`, or `cover_prone_drop` for the gunners behind the earthwork, on `rest_halt` or `picket_duty` rows whose passage says the men lay prone or flat: the contract's hint list for those subkinds does not contain them; a hint, not a check; see the request note). No gate was lowered and no check was bypassed. Any error that `--all` reports lies between rows of other groups (see the last line of the run above), not in this file.

### 1a. What the resumed run of 2026-11-16 changed

The file the first run left (370 rows, validator 0 errors, 17 warnings) was verified first: it validated as the report said, and a rebuild from its row definitions with stable row keys reproduced it byte for byte (the definitions are the source of truth; no row was edited by hand). Then:

* **Second reading of the 103 rows added after the 267-row stage** (the first run's REPORT said no second reader had seen them). Four defects, all fixed: us-2c-L082 (Col. Gates: the quote was the sentence before the claim, now "behind an old rail fence which I converted into a sort of breastwork" with the placement as context); us-2c-R206 (the 111th New York's striking of tents at Centreville was documented from an oration of 26 June 1891 saying "this morning"; the date is now inferred and carried as the conflict C-II-CORPS-CENTREVILLE-DEPART against the 125th New York's own report, "June 35", read 25 June, a day before the theatre clock); us-2c-R086 and us-2c-R275 (the burial table, below); 54 rows whose clock window states only one side now carry `x_window_open` (below).
* **Page images** (the earlier note said none could be fetched; the volume's PDF was already on the machine and the New York volume was fetched once from archive.org, 84 MB): (a) OR27-1 printed p. 378, the table of the dead buried by the Second Corps: the page prints "from July 2 to 5, inclusive" where the local text prints "July 3 to 5"; the table has the headings Officers, Enlisted men, Total and the cells Union 18, 369, 387, Rebel 60, 1,182, 1,242, Total 78, 1,551, 1,629 ("869" is 369). Row us-2c-R275 is now documented (it was inferred by arithmetic), the window of us-2c-R086 and us-2c-R275 starts on 2 July, and the gap row us-2c-R258 (EG-LIFE-0206) is withdrawn: its id is never reused. (b) OR27-1 printed p. 457: "At 12 m." where the local text prints "At 13 m." (row us-2c-R289). (c) New York at Gettysburg vol. 2, printed p. 541: "There we rested and made coffee." at Rock Creek on the march of the Sixth Corps (row us-2c-R300); the gap row us-2c-R259 (EG-LIFE-0207) is withdrawn.
* **An expanded cue sweep** (halted, for the night, remained in position, detailed, relieved, collected, gathered, arms and accouterments, issued, wagons, guard of trains, and the like: `cue_scan2.py`, `sv_uncov3.py`) over the 59 owned Official Records and the 56 owned state-volume sections found statements the first scans missed. 26 rows were added (us-2c-L096, us-2c-R276, us-2c-R277, us-2c-R278, us-2c-R279, us-2c-R280, us-2c-R281, us-2c-R282, us-2c-R283, us-2c-R284, us-2c-R285, us-2c-R286, us-2c-R287, us-2c-R288, us-2c-R289, us-2c-R290, us-2c-R291, us-2c-R292, us-2c-R293, us-2c-R294, us-2c-R295, us-2c-R296, us-2c-R297, us-2c-R298, us-2c-R299, us-2c-R300), none renumbering an existing row: waits in position under fire at stated hours (1st Minnesota, 53rd Pennsylvania, 14th Connecticut, Battery E 1st Rhode Island, 7th Michigan), the halt of 1 July at two miles (19th Massachusetts) and the 19th Maine's bivouac at 1 a. m. (both values of C-BIV-JUL1-PLACE), the 19th Maine's guard of the corps trains, the 69th Pennsylvania's picket detail of 3 July, the skirmish detail of the 14th Indiana, the 4th Ohio's relief at noon against 3 p. m. in its own report (C-4OH-RELIEF-TIME), the 8th Ohio's twenty-four hours in front, the **collection of arms from the field** (the corps' 5,976 stand; Harrow's three brigades; Webb's own 1,400 stand against the 1,284 rifles of Harrow's report: C-WEBB-ARMS-COLLECTED; Hays's 2,500; Smyth's 2,000; the 12th New Jersey's 751; the pioneers' 349; the 64th New York's detail), and three statements of II Corps units in the park's landscape report of treatment (the 14th Connecticut's picket reserve and line, the 145th Pennsylvania lifting a fence out of the way, the 14th Connecticut's first position), a text no group of the plan owns.
* **Windows with an unstated side.** 61 rows (end 25, start 36) carry the own field `x_window_open` (start, end): the passage states the other side only, and the stated value of the open side is a bound (the day's start or end, the start of a march, the end of a lasting cannonade), never a statement of when the act began or ended. A scene must not read the open side as a fact. Request note below.
* **Not run (queued)**: the second-OCR digit check of the Official Records rows (section 3) is queued under the machine lock and had not started.

## 1b. By tier and kind

| Kind | documented | inferred | plausible-procedural | open gap | Total |
|---|---|---|---|---|---|
| labour | 74 | 18 | 0 | 4 | 96 |
| routine | 236 | 46 | 15 | 1 | 298 |
| **Total** | **310** | **64** | **15** | **5** | **394** |

### By subkind and tier

| Kind / subkind | documented | inferred | plausible-procedural | open gap | Total |
|---|---|---|---|---|---|
| labour / abatis_or_slashing | 1 | 2 | 0 | 0 | 3 |
| labour / breastwork_infantry | 30 | 6 | 0 | 0 | 36 |
| labour / earth_parapet | 12 | 0 | 0 | 0 | 12 |
| labour / fence_taken_down | 3 | 1 | 0 | 0 | 4 |
| labour / gun_pit_or_epaulement | 1 | 0 | 0 | 2 | 3 |
| labour / other_labour | 1 | 1 | 0 | 0 | 2 |
| labour / rail_barricade | 13 | 5 | 0 | 0 | 18 |
| labour / rifle_pits | 4 | 0 | 0 | 1 | 5 |
| labour / tools_issue_or_carry | 1 | 0 | 0 | 0 | 1 |
| labour / wall_improved | 3 | 2 | 0 | 0 | 5 |
| labour / works_layout | 5 | 1 | 0 | 1 | 7 |
| routine / ammunition_issue | 2 | 1 | 0 | 0 | 3 |
| routine / burial_party | 10 | 6 | 0 | 0 | 16 |
| routine / camp_made | 39 | 1 | 0 | 0 | 40 |
| routine / cooking | 4 | 2 | 1 | 0 | 7 |
| routine / forage_requisition | 0 | 1 | 1 | 0 | 2 |
| routine / guard_duty | 13 | 0 | 6 | 0 | 19 |
| routine / idle_camp_life | 1 | 0 | 0 | 0 | 1 |
| routine / meal | 7 | 2 | 1 | 0 | 10 |
| routine / other_routine | 6 | 10 | 1 | 0 | 17 |
| routine / picket_duty | 40 | 8 | 2 | 0 | 50 |
| routine / ration_issue | 1 | 2 | 1 | 1 | 5 |
| routine / religious_service | 3 | 0 | 0 | 0 | 3 |
| routine / rest_halt | 38 | 5 | 0 | 0 | 43 |
| routine / roll_call | 6 | 0 | 1 | 0 | 7 |
| routine / sleep_bivouac | 64 | 6 | 1 | 0 | 71 |
| routine / washing_bathing | 1 | 0 | 0 | 0 | 1 |
| routine / water_carrying | 1 | 2 | 0 | 0 | 3 |
| **Total** | **310** | **64** | **15** | **5** | **394** |

### By source (every row is matched to its quote in the named local text)

| Source | Class | Rows |
|---|---|---|
| OR-27-1 | official_report | 263 |
| PA-GB-1904 | regimental_volume | 25 |
| PA-GB-1914-v2 | regimental_volume | 21 |
| NY-GB-1900-v2 | regimental_volume | 17 |
| NPS-COMMON-PRIDE-1 | park_report | 15 |
| ME-GB-1898 | regimental_volume | 9 |
| NY-GB-1900 | regimental_volume | 9 |
| REGS-US-1861 | period_manual | 9 |
| NPS-COMMON-PRIDE-2 | park_report | 5 |
| (open gap: none) | - | 5 |
| BILLINGS-1887 | period_manual | 4 |
| NPS-CLI-PCB | park_report | 4 |
| NPS-CLR-ROT-V1 | park_report | 3 |
| BUTTERFIELD-1863 | period_manual | 2 |
| NPS-BRIEN-FARM | park_report | 2 |
| NPS-COMMON-PRIDE-3 | park_report | 1 |

Official Records vol. 27 part 1: 263 rows from 59 records (54 owned by this group, 5 more of its corps placed with other groups). State-volume sections: 81 rows from 16 sections. NPS texts: NPS-BRIEN-FARM 2, NPS-CLI-PCB 4, NPS-CLR-ROT-V1 3, NPS-COMMON-PRIDE-1 15, NPS-COMMON-PRIDE-2 5, NPS-COMMON-PRIDE-3 1. Manuals: 15 plausible-procedural rows (REGS-US-1861 9, BILLINGS-1887 4, BUTTERFIELD-1863 2).

Window bases: stated_clock 134, stated_period 106, stated_date 63, sun_event 42, report_span 20, procedural 15, other_row 14. Place scopes: battlefield 236, outside_map 89, approach 54, unknown 15. Men: unknown on 378 rows, a stated detail or number on 16 (picket and provost details, a muster, men serving a battery: the number stands in the quote): no count of men is ever made up; no row carries a strength. Activity basis: procedural 180, inferred 111, stated 98 (`procedural` means the clip is a stand-in chosen by the scene; `stated` means the passage names the act the clip shows).

### By subject

| Subject | Rows |
|---|---|
| First Division (Caldwell) | 169 |
| Second Division (Gibbon/Harrow) | 101 |
| Third Division (Hays) | 59 |
| corps level (us-2c) | 24 |
| Artillery Brigade (Hazard) | 9 |
| (no unit: work or generic) | 8 |

24 rows concern units of other groups, found in texts this group owns (so the group that owns the text keeps the row): us-12c: us-12c-2d-greene (2); us-1c: us-1c-3d-biddle-80ny (1), us-1c-3d-stannard-13vt (1), us-1c-3d-stone-143pa (1); us-3c: us-3c-art-1rie (1); us-6c: us-6c-3d-shaler (1), us-6c-art-1ny (3), us-6c-art-1rig (13); us-art: us-art-reserve-mcgilvery (1). They are listed in section 9.

## 2. What was read

* **Official Records, Ser. I, vol. 27 part 1** (`tmp/library/or27/cu31924077699761_djvu.txt`): the 54 records `report_assignments.json` gives this group (R076 to R132 except R079, R098, R114, R118, R127, and R185, R242) and, because their text names units of the corps, the five that header rules gave to other groups (R079 Cross, R098 Gibbon, R114 McFadden, R118 Willard, R127 Hopper; rows flagged `x_record_owner`, request note `bt-life-us-2c-reassign-records`). Every sentence of the 59 records was tested against two lists of cue words: the first run's (built, dug, felled, hauled, laid, loopholed; ate, cooked, rested, slept, bivouacked, drew water, stood picket; burial, ammunition, guard) and the resumed run's expanded list (section 1a); the 377 leads of the planning step were checked, and every hit that no row covers was read and classified (the first run's list of 222 sentences was read again by the resumed run: its classification stands except the sentences now rows). Records with no row: R100 (R100 Heath, 19th Maine: positions and the advance only; R185 now has a row).
* **State volumes**: 56 sections the section index gives this group: Pennsylvania at Gettysburg 1904 (6) and 1914 (4), New York at Gettysburg 1900 (17 in vol. 1, 8 in vol. 2) and 1902 vol. 3 (15 monument-description pages), Maine at Gettysburg 1898 (6). 16 sections gave rows (table below); the others gave none: the New York vol. 1 roster entries (pp. 212 to 229) hold names, the vol. 3 monument pages the dimensions and cost of monuments, neither an act; the 71st Pennsylvania (Gen. Wistar's address), 81st Pennsylvania, 145th Pennsylvania (McCreary), 63rd, 66th, 108th and 126th New York orations and histories and Maine participants' sections ME-S017 to S019 and S033 were read with the strong-cue scan and have no statement in the window of 26 June to 14 July that is a work or routine of the classes asked (their windows are other campaigns, rhetoric, losses or monuments). The artillery sections of the volumes (NY vol. 3: the batteries of the 1st New York Light Artillery, among them Battery B, Rorty's) are not in the index's list for this group (no unit mapping) and are owned by the narrative group of the plan: not read here.
* **NPS texts**: NPS-COMMON-PRIDE-1, -2, -3 (the Park Service history of the repulse of Pickett's Division), NPS-CLI-PCB (Cultural Landscapes Inventory, Pickett's Charge Battlefield), NPS-BRIEN-FARM; rows from five of the seven. NPS-HSR-LEISTER-BARN and NPSGOV-US-LINE gave no statement of the classes for the units of this group. A modern description is never used as the 1863 state of a rebuilt feature (Culp's Hill, Little Round Top and Cemetery Ridge walls were not used for profiles); the Confederate works the inventory names are rows of the works W-CONFED-SEMINARY-WORKS and W-CONFED-WARFIELD-WORKS with the builders "Confederate troops" (`builder_unknown`). **Texts no group owns** (111 of the 190 registry texts have no owner in `groups.json`): the 49 newspapers of 1863 not owned by the town group, the 39 park reports about management, the cemetery and the commemorative landscape, the two civilian accounts (Jacobs, Tillie Pierce), the Michigan volume and OR vols. 25 and 29 and Ser. III (other campaigns, outside the clock) were searched for II Corps names in a sentence with a cue word. Only NPS-CLR-ROT-V1 (Cultural Landscape Report, Record of Treatment, vol. I) holds II Corps statements of the classes that are not already rows (three rows, section 1a; its other passages are second witnesses of rows already here, the First Corps or Confederate fences, or the park's own treatment); one newspaper (Adams Sentinel, 17 November 1863) has "our men lay down in the grass" during the cannonade with no unit. NPS-CLR-ROT-V1 also says of a fence line near Cemetery Ridge that it "may have been dismantled and repurposed into breastworks providing cover for Caldwell's Division ... however, specific references have not been discovered": a statement that no source is known, not a row (E-17, EG-LIFE-0204).
* **Period manuals** (REGS-US-1861, BUTTERFIELD-1863, BILLINGS-1887) only for the 15 plausible-procedural rows (section 6).
* **Leads**: `leads/us-2c.leads.jsonl` holds 377 keyword leads (all OR27-1); 356 lie within 800 characters of the quote or context of a row. The 21 others are names (Cook, Bacon, Graves), the adverb "well", "the rest of the regiment", the marches of 23 to 26 July in Virginia (outside the clock), the tactical lying down to let a retreating line pass (R110), a reserve advanced "to the picket front" in the fight (R120), the burial of Lieut. Milne's body on the field (R132: one man's grave) and one mention of "the breastwork" in a combat sentence of Smyth's report (R123: a state, no act). Nothing is dropped: they are classified here.

### Rows by Official Records record

| Record | Author | Unit of the report | Rows |
|---|---|---|---|
| R076 | G«n. Winfield S. Hancock | U. S. Army, commanding Second Army Corps. | 14 |
| R077 | John C. Caldwell | U. S. Army, commanding First Division. | 2 |
| R078 | H. Boyd McKeen | Eighty-first Pennsylvania Infantry, commanding First Brigade | 2 |
| R079 | (see request note) | (see request note) | 2 |
| R080 | K. Oscar Broady | Sixty-first New York Infantry. | 3 |
| R081 | Amos Stroh | Eighty-first Pennsylvania Infantry. | 1 |
| R082 | Patrick Kelly | Eighty-eighth New York Infantry, commanding Sec- ond BrigaLd | 6 |
| R083 | Richard Byrnes | Twenty-eighth Massachusetts Infantry. | 1 |
| R084 | Thomas Touhy | Sixty-third New York Infantry. | 2 |
| R085 | James J. Smith | Sixty-ninth New York Infantry. | 3 |
| R086 | Denis F. Burke | Eighty-eighth New York Infantry. | 5 |
| R087 | St. Clair A. Mulholland | One hundred and sixteenth Pennsylvania Infantry. | 6 |
| R088 | John Eraser | One hundred and fortieth Pennsylvania Infantry, commanding r | 1 |
| R089 | WiUiam Scherrer | Fifty-second New York Infantry. | 1 |
| R090 | Alford B. Chapman | Fifty-seventh New York Infantry. | 2 |
| R091 | Peter Nelson | Sixty-sixth New York Infantry. | 2 |
| R092 | John R. Brooke | Fifty-third Pennsylvania Infantry, commanding Fourth Brigade | 9 |
| R093 | 'WilUam P. BaUy | Second Delaware Infantry. | 17 |
| R094 | Leman W. Bradley | Sixty-fourth New York Infantry. | 20 |
| R095 | Ldeut. Col. Richards McMichael | Fifty-third Pennsylvania Infantry. | 14 |
| R096 | John W. Reynolds | One hundred and forty-fifth Pennsylvania In- fantry. | 17 |
| R097 | Moses W. Oliver | One hundred and forty-fifth Pennsylvania Infan- try. | 2 |
| R098 | (see request note) | (see request note) | 1 |
| R099 | William Harrow | U. S. Army, commanding Second Division. | 6 |
| R100 | Francis E. Heath | Nineteenth Maine Infantry. | 0 |
| R101 | George C. Joslin | Fifteenth Massachusetts Infantry. | 4 |
| R102 | Henry C. Coates | ' First Minnesota Infantry. | 2 |
| R103 | John Darrow | Eighty-second New York Infantry (Second Militia). | 1 |
| R104 | Alexander S. Webb | U. S. Army, commanding Second Bri- gade. | 14 |
| R105 | WiUlam Davis | Sixty-ninth Pennsylvania Infantry. | 3 |
| R106 | E. Penn Smith | Seventy-flrst Pennsylvania Infantry. | 1 |
| R107 | Theodore Hesser | Seventy-second Pennsylvania Infantry. | 1 |
| R108 | William L. Curry | One hundred and sixth Pennsylvania In- fantry. | 2 |
| R109 | Norman J. HaU | Seventh Michigan Infantry, commanding Third Bri- gade. | 3 |
| R110 | Arthur F. Devereux | Nineteenth Massachusetts Infantry. | 7 |
| R111 | Henry L. Abbott | Twentieth Massachusetts Infantry. | 3 |
| R112 | Sylvanus W. Curtis | Seventh Michigan Infantry. | 13 |
| R113 | James E. Mallon | Forty-second New York Infantry. | 1 |
| R114 | (see request note) | (see request note) | 1 |
| R115 | Alexander Hays | U. S. Army, comma,nding Third Division. | 8 |
| R116 | Samuel S. Carroll | Eighth Ohio Infantry, commanding First Brigade. | 4 |
| R117 | John Coons | Fourteenth Indiana Infantry. | 2 |
| R118 | Nathan WUlard | Fourteenth Indiana Infantiy,conunanding Pioneer Corps. | 3 |
| R119 | Leonard W. Carpenter | Fourth Ohio Infantry. | 4 |
| R120 | Franklin Savryer | Eighth Ohio Infantry. | 1 |
| R121 | Alfred T. Craig | Eighth Ohio Infantry, commanding Provost , Guard. | 2 |
| R122 | Jonathan H. Lockwood | Seventh West Virginia Infantry. | 1 |
| R123 | Thomas A. Smyth | First Delaware Infantry, commanding Second Brigade. | 3 |
| R124 | Theodore G. EUis | Fourteenth Connecticut Infantry. | 4 |
| R125 | John T. Dent | First Delaware Infantry. | 3 |
| R126 | John T. Hill | Twelfth New Jersey Infantry. | 3 |
| R127 | George F. Hopper | Tenth New York Infantry. | 4 |
| R128 | James M. Bull | One hundred and twenty-sixth New York In- fantry, commanding | 3 |
| R129 | CUnton D. MacDougall | One himdred and Eleventh New York In- fantry. | 1 |
| R130 | Aaron P. Seeley | One hundred and Eleventh New York Infantry. | 3 |
| R131 | Harry L. Haskell | One himdred and twenty-fifth New York Infan- try. | 2 |
| R132 | John G. Hazard | First Rhode Island Light Artillery, commanding ArtUlery Brig | 3 |
| R185 | Benjamin Freeborn | - Battery E, First Rhode Island Light ArtUlery. | 1 |
| R242 | George W. Adams | Battery G, First Rhode Island Light Artillery. | 13 |

### State-volume sections with rows

| Section | Source | Main unit of its rows | Rows |
|---|---|---|---|
| ME-S016 | ME-GB-1898 | us-2c-2d-harrow-19me | 5 |
| ME-S020 | ME-GB-1898 | us-2c-2d-harrow-19me | 4 |
| NY1-S075 | NY-GB-1900 | us-2c-3d-willard-39ny | 1 |
| NY1-S083 | NY-GB-1900 | us-2c-1d-zook-57ny | 6 |
| NY1-S085 | NY-GB-1900 | us-12c-2d-greene | 2 |
| NY2-S002 | NY-GB-1900-v2 | us-2c-1d-cross-61ny | 6 |
| NY2-S005 | NY-GB-1900-v2 | us-2c-1d-kelly-88ny | 5 |
| NY2-S016 | NY-GB-1900-v2 | us-2c-2d-harrow-82ny | 3 |
| NY2-S024 | NY-GB-1900-v2 | us-2c-3d-willard-111ny | 3 |
| PA1-S017 | PA-GB-1904 | us-2c-1d-brooke-53pa | 15 |
| PA1-S024 | PA-GB-1904 | us-2c-2d-webb-69pa | 1 |
| PA1-S026 | PA-GB-1904 | us-2c-2d-webb-72pa | 4 |
| PA1-S039 | PA-GB-1904 | us-2c-2d-webb | 5 |
| PA2-S004 | PA-GB-1914-v2 | us-2c-1d | 11 |
| PA2-S009 | PA-GB-1914-v2 | us-2c-1d-zook-140pa | 5 |
| PA2-S015 | PA-GB-1914-v2 | us-2c-1d-cross-148pa | 5 |

## 3. How the rows were made and checked

* One row per statement. A row needs a verbatim quote of 20 to 600 characters found in the named local text by the validator's matcher (whitespace, hyphenation and typography tolerant; no fold of OCR confusions is used: `--strict` passes), the record and printed page the quote stands on, a window on the page clock with its basis, a place as the source words it, a clip or a pose, and the tier with its reasoning. OCR errors stay as printed in the quotes; where the page image shows that a digit of the local text is wrong, the row says so in `ocr_repairs` (basis `page_image`, rows us-2c-L044, us-2c-R086, us-2c-R275, us-2c-R289, us-2c-R300) and its window follows the page.
* A unit with no statement has no documented row. Units of the corps with no row of their own (their brigade's or division's rows cover them where a report speaks for them): 27th Connecticut (us-2c-1d-brooke-27ct), 1st Company Massachusetts Sharpshooters (us-2c-2d-1comass), 108th New York (us-2c-3d-smyth-108ny), 126th New York (us-2c-3d-willard-126ny), Battery A and Battery B, 1st Rhode Island Light Artillery (us-2c-art-1ria, us-2c-art-1rib).
* **Second reading.** The first 267 rows (built by the first run) were reproduced from their builder, validated and read again against their quotes and records by the first run. The 103 rows added after that stage were read again by the resumed run against their quotes and their surrounding text, one by one (section 1a: four defects). The 1st-267 rows were not read a third time; they were checked mechanically instead: every `stated_clock` window was tested against the hours parsed from its quote and context (45 windows have a side that is not one of the quoted hours: each is a side computed from "about an hour", "two hours", a neighbouring statement or a march start, and its window note says which; none is unexplained).
* **Digit check against the page images.** The local Official Records text has wrong digits (the date of p. 378, "13 m." of p. 457, "June 35" of R131, "300 yards" for 200 on p. 457). A second OCR of the page images of every Official Records row (tesseract on the volume's PDF, cache `tmp/life-us-2c/ocr/`) compared with each quote and context is **queued under the machine lock and had not started when this report was written** (it waits behind two timing jobs that hold every other job back); it was not run directly because a timing job may start at any moment. Until it runs, the digits of the other Official Records rows are as the local text prints them. 
* **Rows added in the first run's last stage** (the six Cowan and Confederate-works rows, the seven gap rows, the 15 plausible-procedural rows, the 28 rows of the repaired scan below and the table row of the burial figures) were checked by the validator and by a listing of their windows, clips, tiers and conflicts by the first run, and read by the resumed run.
* **Repaired scan.** On 15 to 16 November the first run's cue scans were found never to match their multi-word cues ("lay down", "laid down", "stack arms", "slight works", "threw up": a verbose regular expression dropped the blanks). They were repaired and rerun over all owned records and sections; that scan, the review of the records that had no row and the lead check gave 28 rows (the 63rd, 71st, 72nd and 106th regiments, the 14th Indiana, the 7th West Virginia, the 1st Delaware, the 39th, 111th and 125th New York, the 19th and 20th Massachusetts, the 19th Maine, the 82nd New York, the 148th Pennsylvania and the 116th Pennsylvania's address, and Webb's and the 7th Michigan's value of the bivouac place). The remaining uncovered cue sentences are other campaigns, July 15 to 26 marches, rhetoric, names, rosters and combat postures (lying down to fire, to let a line pass); lying under artillery fire for hours is a row, lying down for a volley is not.
* **Not done.** No browser, GPU or render check (none is involved). Network: one request, the New York at Gettysburg vol. 2 PDF (archive.org, 84 MB, public domain, 2026-11-16); everything else is a local file (the Official Records PDF of part 1 was already local).

## 4. Conflicts carried (24), every value kept as a scenario; no default

| Conflict | Kind | Members (row: scenario key) |
|---|---|---|
| C-116PA-WORKS | other | us-2c-L030: p116_works_formidable_by_1100_or; us-2c-L062: p116_works_light_night_address |
| C-1D-CROSS-WORKS-DATE | time | us-2c-L019: cross_works_jul3_mckeen; us-2c-L022: cross_works_jul5_81pa_as_printed |
| C-3D-LEAVE-FIELD | time | us-2c-R115: leave_jul5_hays; us-2c-R204: leave_jul6_12nj |
| C-4OH-RELIEF-TIME | time | us-2c-R119: relief_3pm_carpenter_a; us-2c-R120: relief_3pm_carpenter_b; us-2c-R289: relief_noon_carroll |
| C-53PA-JUL1-NIGHT | other | us-2c-R018: night_jul1_picket_53pa_or; us-2c-R157: night_jul1_bivouac_53pa_address |
| C-53PA-WORKS-JUL12 | time | us-2c-L007: works_night_jul11_53pa_or; us-2c-L061: works_jul12_afternoon_53pa_address |
| C-53PA-WORKS-TIME | time | us-2c-L004: 53pa_works_morning_jul3; us-2c-L005: 53pa_works_night_of_the_3d_printed; us-2c-L006: 53pa_works_night_after_fight; us-2c-L060: 53pa_works_early_morning_jul3_address |
| C-69PA-WORKS | existence | us-2c-L036: works_slight_breastwork_hastily_built_hancock; us-2c-L044: works_rails_stone_davis; us-2c-L070: works_not_well_built_webb; us-2c-L071: works_none_no_tools_reilly1889; us-2c-L075: works_weak_stone_breastwork_park_report; us-2c-L076: works_few_rails_half_pits_morgan |
| C-ANGLE-SLASHING-TIME | time | us-2c-L077: slashing_felled_jul3_doubleday; us-2c-L078: slashing_felled_jul2_park_report |
| C-BIV-JUL1-PLACE | place | us-2c-R084: bivouac_3miles_rear_hancock; us-2c-R108: bivouac_4miles_south_7mi; us-2c-R129: bivouac_within_3miles_1de; us-2c-R165: bivouac_near_roundtop_mulholland; us-2c-R176: bivouac_slope_lrt_106pa; us-2c-R231: bivouac_within_4miles_webb; us-2c-R238: bivouac_3miles_south_7mi_jul16; us-2c-R277: bivouac_2miles_19ma_devereux; us-2c-R296: bivouac_3miles_taneytown_rd_1am_19me |
| C-BROOKE-DEPART-JUL2 | time | us-2c-R001: depart_0410_64ny; us-2c-R018: depart_daybreak_53pa; us-2c-R056: depart_0300_brooke |
| C-BROOKE-DEPART-JUL2b | time | us-2c-R001: depart_0410_64ny_b; us-2c-R056: depart_0300_brooke_b; us-2c-R084: depart_daylight_hancock |
| C-BROOKE-TWOTAV-DEPART | time | us-2c-R022: twotav_leave_midday_53pa; us-2c-R034: taneytown_halt_noon_2de; us-2c-R046: twotav_leave_morning_145pa; us-2c-R058: twotav_leave_0500_brooke; us-2c-R094: twotav_leave_0500_webb; us-2c-R160: twotav_leave_0500_53pa_address |
| C-BROOKE-UNIONTOWN-DEPART | time | us-2c-R026: uniontown_leave_0800_2de; us-2c-R054: uniontown_leave_0600_brooke |
| C-E05-START | time | us-2c-L065: start_early_morning_barnum_1889 |
| C-GIBBON-LUNCH-JUL3 | other | us-2c-R214: lunch_hancock_staff_bread_butter_1pm; us-2c-R221: brunch_meade_coffee_rooster_morning |
| C-II-CORPS-CENTREVILLE-DEPART | time | us-2c-R206: depart_jun26_macdougall_1891 |
| C-II-CORPS-TOOLS | tool | us-2c-L047: tools_none_hall; us-2c-L048: tools_one_shovel_20ma; us-2c-L052: tools_one_spade_7mi; us-2c-L062: tools_none_mulholland_address; us-2c-L064: tools_picks_shovels_borrowed_148pa; us-2c-L071: tools_none_69pa_address |
| C-IRISH-DEPART-JUL2 | time | us-2c-R064: irish_depart_0430_kelly; us-2c-R195: irish_depart_0400_88ny_sketch |
| C-IRISH-WORKS-TIME | time | us-2c-L023: irish_works_early_morning_kelly; us-2c-L024: irish_works_morning_28ma; us-2c-L027: irish_works_most_of_day_69ny; us-2c-L028: irish_works_night_88ny |
| C-MONOCACY-ARRIVE | time | us-2c-R019: monocacy_arrive_1500_53pa_or; us-2c-R039: monocacy_arrive_1400_145pa; us-2c-R156: monocacy_arrive_1600_53pa_address |
| C-TWOTAV-ARRIVE | time | us-2c-R022: twotav_jul5_53pa; us-2c-R032: twotav_jul5_2de; us-2c-R046: twotav_jul5_145pa; us-2c-R058: twotav_jul5_brooke; us-2c-R076: twotav_jul4_116pa |
| C-UNIONTOWN-ARRIVE | time | us-2c-R020: uniontown_arrive_midnight_53pa; us-2c-R026: uniontown_arrive_2200_2de; us-2c-R081: uniontown_arrive_2200_hancock; us-2c-R092: uniontown_arrive_2100_webb; us-2c-R164: uniontown_arrive_2130_53pa_address; us-2c-R215: uniontown_arrive_2300_mulholland_address |
| C-WEBB-ARMS-COLLECTED | number | us-2c-R280: arms_1284_972_harrow; us-2c-R281: arms_1400_903_webb |

C-E05-START has its other members in `us-12c.jsonl` (`us-12c-L001`); neither file lists the other (request note `bt-life-us-2c-conventions-and-cross-group`). C-II-CORPS-CENTREVILLE-DEPART has one row here; its other value (25 June, the 125th New York's report) lies before the theatre clock and cannot be a row: the scenario of 25 June exists in the conflict's note only. The conflicts of tools (C-II-CORPS-TOOLS: none furnished against one shovel, one spade, picks borrowed) and of the 69th Pennsylvania's works (C-69PA-WORKS: a slight breastwork hastily built, rails strengthened with stone, not well built, none, a weak stone breastwork, a few rails and half-built riflepits) are the ones the plan's E-17 and Angle rows need.

## 5. Open gaps (registered; proposed entries in `docs/battle-theatre/GOVERNANCE/horde/ws-life/proposed-register/us-2c-EG-LIFE-0201.md` to `...0205.md`; 0206 and 0207 are closed)

| Gap | Row | Kind / subkind | Subject | What is missing | Owed |
|---|---|---|---|---|---|
| EG-LIFE-0201 | us-2c-L092 | labour / rifle_pits | W-SKIRMISH-PITS-EMMITSBURG-RD | skirmish pits and rail piles on the Emmitsburg Road, 2-3 July: no text names one | nothing more is owed here; another group's text could name one |
| EG-LIFE-0202 | us-2c-L093 | labour / gun_pit_or_epaulement | us-2c-art-4usa | whether Cushing's battery at the Angle was prepared (pits, epaulement, platform) and who worked: no text says; Cowan's neighbouring battery had "no works" | none (the battery made no report in the volumes read) |
| EG-LIFE-0203 | us-2c-L094 | labour / gun_pit_or_epaulement | us-2c-art-1usi | whether the batteries at Ziegler's Grove (Woodruff, Arnold) were prepared and who worked | nothing more is owed here |
| EG-LIFE-0204 | us-2c-L095 | labour / works_layout | us-2c | E-17: continuity of the works on Cemetery Ridge, dimensions (six works only), men and tools (almost all) | nothing more is owed here |
| EG-LIFE-0205 | us-2c-R257 | routine / ration_issue | us-2c | rations and meals of the corps as a whole on 2-3 July: regiments only | nothing more is owed here |

Numbering: block 02 of the convention proposed by group us-1c (`bt-life-us-1c-validator-and-conventions`, item 2). Each gap row carries the list of what was searched and with what result (`no_hit`, `hit_not_applicable`, `hit_ambiguous`, `not_local`); a failed lookup is recorded as failed. **Closed by page images on 2026-11-16**: EG-LIFE-0206 (Hancock's table of the dead buried: now row us-2c-R275, documented; the proposed entry `us-2c-EG-LIFE-0206.md` says so and is not to be registered) and EG-LIFE-0207 (the coffee halt of Shaler's brigade: now row us-2c-R300; likewise `us-2c-EG-LIFE-0207.md`). The numbers 0206 and 0207 and the row ids us-2c-R258 and us-2c-R259 are not reused.

## 6. Plausible-procedural rows (generic: true; 15)

Where the record is silent for a unit that certainly held a position (a night, a march), a row gives the period practice with that manual's own words, marked plausible-procedural and never documented. No row gives a meal hour: the Revised Regulations (para. 231) leave the hours of meals, roll-calls and guard-mounting to the commanding officer, and the rows say so. The windows are placed inside a span (at most 14 days), not on a night: a scene uses a row only where no documented or inferred row of the unit covers the time.

| Row | Subkind | Subject | Source | Window (page clock) | Manual statement |
|---|---|---|---|---|---|
| us-2c-R260 | roll_call | us-2c | REGS-US-1861 | 26 Jun 00:00 to 09 Jul 23:59 | "There shall be daily at least three roll-calls, viz., at reveille, retreat, and tatt..." |
| us-2c-R261 | other_routine | us-2c | REGS-US-1861 | 26 Jun 00:00 to 09 Jul 23:59 | "Immediately after reveille roll-call (after stable-duty in the cavalry), the tents o..." |
| us-2c-R262 | ration_issue | us-2c | REGS-US-1861 | 26 Jun 00:00 to 09 Jul 23:59 | "On a campaign, or on marches, or on board of transports, the ration of hard bread is..." |
| us-2c-R263 | cooking | us-2c | BILLINGS-1887 | 26 Jun 00:00 to 09 Jul 23:59 | "boiling his coffee at the camp-fire, happy in the security of his ration from Jonahs..." |
| us-2c-R264 | meal | us-2c | BILLINGS-1887 | 26 Jun 00:00 to 09 Jul 23:59 | "who made it an almost invariable rule to cook their coffee first, after which a larg..." |
| us-2c-R265 | sleep_bivouac | us-2c | BILLINGS-1887 | 26 Jun 00:00 to 09 Jul 23:59 | "and roll up in their blankets for the night." |
| us-2c-R266 | forage_requisition | us-2c | BILLINGS-1887 | 26 Jun 00:00 to 09 Jul 23:59 | "would seize a rail from the nearest fence, and with this additional arm on the shoul..." |
| us-2c-R267 | picket_duty | us-2c | BUTTERFIELD-1863 | 26 Jun 18:00 to 10 Jul 05:00 | "No fires will be allowed on the line of the supports, or outside the line of reserve..." |
| us-2c-R268 | picket_duty | us-2c | BUTTERFIELD-1863 | 10 Jul 18:00 to 14 Jul 05:00 | "One relief of the supports will be allowed to sleep. One must constantly be on the a..." |
| us-2c-R269 | guard_duty | us-2c-2d | REGS-US-1861 | 26 Jun 18:00 to 10 Jul 05:00 | "The officer of the day satisfies himself frequently during the night, of the vigilan..." |
| us-2c-R270 | guard_duty | us-2c-3d | REGS-US-1861 | 26 Jun 18:00 to 10 Jul 05:00 | "The officer of the day satisfies himself frequently during the night, of the vigilan..." |
| us-2c-R271 | guard_duty | us-2c-3d | REGS-US-1861 | 10 Jul 18:00 to 14 Jul 05:00 | "When necessary, the camp is covered at night with small outposts, forming a double c..." |
| us-2c-R272 | guard_duty | us-2c-1d | REGS-US-1861 | 10 Jul 18:00 to 14 Jul 05:00 | "When necessary, the camp is covered at night with small outposts, forming a double c..." |
| us-2c-R273 | guard_duty | us-2c-art | REGS-US-1861 | 26 Jun 18:00 to 10 Jul 05:00 | "Sentinels for the park are furnished by the artillery, and, when necessary, by the o..." |
| us-2c-R274 | guard_duty | us-2c-art | REGS-US-1861 | 10 Jul 18:00 to 14 Jul 05:00 | "The officer of the day satisfies himself frequently during the night, of the vigilan..." |

## 7. Nights by unit (sunset to sunrise, 26 June to 14 July)

Each cell counts the documented or inferred rows of the unit (sleep, camp, rest, picket, guard, idle, meal, cooking) that overlap the night; where there is none the cell names the generic row that is the basis (a night guard or picket row of section 6). Rows of subordinate units count for the division. No night has neither.

| Night (sunset to sunrise) | corps | 1st Div | 2nd Div | 3rd Div | Artillery Bde |
|---|---|---|---|---|---|
| 26 Jun to 27 Jun | generic R267 | 1 row | generic R269 | generic R270 | generic R273 |
| 27 Jun to 28 Jun | 1 row | 1 row | 1 row | generic R270 | generic R273 |
| 28 Jun to 29 Jun | 1 row | 3 rows | 1 row | generic R270 | generic R273 |
| 29 Jun to 30 Jun | 3 rows | 9 rows | 1 row | 1 row | generic R273 |
| 30 Jun to 01 Jul | 3 rows | 15 rows | 6 rows | 3 rows | generic R273 |
| 01 Jul to 02 Jul | 2 rows | 31 rows | 20 rows | 15 rows | 1 row |
| 02 Jul to 03 Jul | generic R267 | 22 rows | 22 rows | 18 rows | generic R273 |
| 03 Jul to 04 Jul | generic R267 | 10 rows | 6 rows | 13 rows | generic R273 |
| 04 Jul to 05 Jul | generic R267 | 4 rows | generic R269 | 3 rows | generic R273 |
| 05 Jul to 06 Jul | generic R267 | 9 rows | 1 row | 2 rows | generic R273 |
| 06 Jul to 07 Jul | generic R267 | 7 rows | 1 row | 2 rows | generic R273 |
| 07 Jul to 08 Jul | generic R267 | 6 rows | generic R269 | generic R270 | generic R273 |
| 08 Jul to 09 Jul | generic R267 | 6 rows | generic R269 | generic R270 | generic R273 |
| 09 Jul to 10 Jul | generic R267 | 7 rows | 1 row | generic R270 | generic R273 |
| 10 Jul to 11 Jul | generic R268 | 7 rows | 1 row | generic R271 | generic R274 |
| 11 Jul to 12 Jul | generic R268 | 4 rows | 1 row | generic R271 | generic R274 |
| 12 Jul to 13 Jul | generic R268 | generic R272 | 1 row | generic R271 | generic R274 |
| 13 Jul to 14 Jul | generic R268 | 4 rows | 1 row | generic R271 | generic R274 |

## 8. Works

* E-17 (rails and stones on Cemetery Ridge): 15 rows, open gap for continuity, profile, men, tools (EG-LIFE-0204); W-CEM-RIDGE-RAIL-STONE 13 rows; the 20th Massachusetts' pit "a foot deep and a foot high" with a single shovel; the 7th Michigan's rails with one spade; Hall's brigade's "sticks and boards, no tools being obtainable"; the 13th Vermont's rails two feet high.
* The Angle (P-01, pre-existing wall): W-ANGLE-WALL-STRENGTHENED 7 rows; the five `wall_improved` rows (us-2c-L036, us-2c-L037, us-2c-L073, us-2c-L074, us-2c-L080) never build the wall; no animation of the construction of any pre-existing feature is asked by any row.
* G-12 (Cushing, Cowan): Cowan's statements are rows (the wall "not over two feet high", "nowhere over a foot in front of my guns", "We had no works--nothing but the wall, and some rails"); the plan's "prepared position" has no text behind it (EG-LIFE-0202). G-11 (a slight earthwork in front of McGilvery's guns): 1 row.
* Skirmish pits on the Emmitsburg Road: no text names one (EG-LIFE-0201); Ziegler's Grove: none (EG-LIFE-0203).
* Confederate works built after the repulse (W-CONFED-SEMINARY-WORKS 3 rows, W-CONFED-WARFIELD-WORKS 1) and Greene's works on Culp's Hill (E-05, Barnum's address, 1 row): rows with `builder_unknown` or the Twelfth Corps unit, extracted because the text is owned here: us-2c-L072, us-2c-L080, us-2c-L084, us-2c-L087, us-2c-L088, us-2c-L089, us-2c-L090.

## 9. Poses and clips; rows for other groups

* Clips named: sleep_side 71, dig_shovel 67, stand_picket 67, sit_fire 51, stand_rest 43, march_carry_rail 38, lie_down 14, eat_hardtack 11, cook_stir 7, chop_axe 3, drink_cup 3, lay_stone 2, gun_crew_n1 2, kneel_down 2, orderly_water 2, cover_prone_drop 1, officer_speak 1.
* Poses named in `pose_needed` (none is authored here; the demand is the count): POSE-L02 7, POSE-L08 17, POSE-L09 11, POSE-L10 1, POSE-L21 2, POSE-R01 9, POSE-R02 7, POSE-R03 1, POSE-R05 1, POSE-R06 2, POSE-R09 3, POSE-R12 3, POSE-R15 1, POSE-R16 4, POSE-R17 2, POSE-R18 8, POSE-R19 3, POSE-R20 1, POSE-R21 1, POSE-R28 3, POSE-R30 1, POSE-R33 15, POSE-R34 1, POSE-R35 1, POSE-R37 16, POSE-R42 3, POSE-R45 9. No pose exists for tidying a camp ground (row us-2c-R261 uses a stand-in), none for gathering arms from a field (the arms rows use `march_carry_rail` as a stand-in) and none for a regiment lying under artillery fire (the clip `lie_down` is named).
* Rows about units of other groups, from texts owned here: us-12c: us-12c-2d-greene (2); us-1c: us-1c-3d-biddle-80ny (1), us-1c-3d-stannard-13vt (1), us-1c-3d-stone-143pa (1); us-3c: us-3c-art-1rie (1); us-6c: us-6c-3d-shaler (1), us-6c-art-1ny (3), us-6c-art-1rig (13); us-art: us-art-reserve-mcgilvery (1). The owners of those units may copy or cite them; they are not to write a second row from the same passage. Two records assigned to this group name batteries of other corps (R185, Battery E 1st Rhode Island, Third Corps: one row, `us-3c-art-1rie`; R242, Battery G, Sixth Corps: 13 rows with the unit `us-6c-art-1rig`): request note `bt-life-us-2c-reassign-records`.

## 10. What was not found, and what was not read

* No statement of the hour of a meal, of a ration issued on a day, or of a count of men at work, for almost every unit; where a regiment prints one it is a row. 2 July: the 7th Michigan "destitute of food nearly two days"; 3 July: the 19th Maine "no rations until after the fighting", the 57th New York's "such a breakfast as could be gotten"; the corps as a whole: none (EG-LIFE-0205).
* No statement of who dug the skirmish pits, of any gun pit at the Angle or the Grove, of the continuity of the works (section 5).
* No statement of how many men collected the arms of the field (the counts are of arms) or of the hour of the collection (the rows take the span of the corps' burials, 2 to 5 July, as an inferred window).
* Post-battle diaries after 14 July (the marches of 15 to 26 July in Virginia in R092, R093, R094, R095, R096, R104, R115, R242 and the state volumes) are outside the theatre clock and are not rows; the day the 3rd Brigade, 3rd Division left Centreville (25 June) is before it.
* Passages in the passive voice with no unit as subject ("rations were served") are rows only where the report is the unit's own (the 19th Maine).
* Not read: the page images of the other Official Records rows (queued, section 3), the Pennsylvania State Archives claims, the regimental histories outside the registry (those belong to the narrative groups: Bates's histories of the Pennsylvania regiments of the corps, the Massachusetts, Minnesota and Delaware histories, the artillery sections of the state volumes), and any text of the other 21 groups.
* Owner-only acts: none arose (no account, licence, payment, request to a third party or deployment is involved).

## 11. Files

* Output: `docs/battle-theatre/life/evidence/us-2c.jsonl` (394 rows). This report: `docs/battle-theatre/life/evidence/us-2c.REPORT.md` (the plan and `groups.json` name it `us-2c.report.md`: item 3 of the first request note below).
* Proposed register entries: `docs/battle-theatre/GOVERNANCE/horde/ws-life/proposed-register/us-2c-EG-LIFE-0201.md` to `...0205.md` (open), `...0206.md` and `...0207.md` (closed by page images, kept for the record).
* Request notes in `docs/battle-theatre/GOVERNANCE/horde/requests/`: `bt-life-us-2c-reassign-records.md` (five Second Corps records placed elsewhere; two other-corps batteries placed here), `bt-life-us-2c-conventions-and-cross-group.md` (numbering block, report name, C-E05-START in two files, the manual rows, a works id for the slashing at the Angle, the clip hint; item 7, the two page images, is closed), `bt-life-us-2c-run2-window-open-and-validator.md` (the `x_window_open` field, three validator limits, digits of the local text, the texts no group owns, rows for other groups).
* Delegated decisions: `docs/battle-theatre/GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`, section "Added 2026-11-16 by bt-life (group us-2c)" (DD-LIFE-US2C-01 to -06).
* Scratch (not shipped): `tmp/life-us-2c/` (row definitions `rows/*.py`, `build2.py` with the frozen ids `ids_frozen.json`, scans, page-image crops `img/`, the New York volume `dl-ny2/`, backups of the output `backup/`).
* Progress lines: `docs/battle-theatre/GOVERNANCE/progress.md` (2026-11-15 and 2026-11-16 bt-life us-2c).
