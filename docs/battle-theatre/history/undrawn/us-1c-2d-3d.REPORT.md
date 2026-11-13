# us-1c-2d-3d: Union I Corps, Robinson's division (Paul, Baxter) and Doubleday/Rowley's division (Biddle, Stone, Stannard): report of the group

Workstream bt-units, group `us-1c-2d-3d`, 2026-11-13. File: `docs/battle-theatre/history/undrawn/us-1c-2d-3d.jsonl` (217 records).

## 1. What was run and what it says

| Check | Result |
|---|---|
| `python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-1c-2d-3d --complete` | exit 0: 217 records, 29 units named, 0 errors, 0 warnings, 0 of 87 items owed (87 = the missing words of the 21 leaf units, a day without a place counted once) |
| `check_undrawn.py --all` (ids across the group files present) | no claim id of this group is used in another file |
| Browser, node suite, `check_governance.py` | not run (the task is a data file; nothing of the layer, the roster or a ledger was changed) |

Records by tier: 104 documented, 107 inferred, 2 open gap, 4 source records. By kind: arrival 43, arrival_road 15, road_identification 7, march 4, position 31, movement 14, engagement 10, night_position 22, strength 50, absent 10, unit 3, line_order 2, gap 2, source 4. Fifteen conflict groups are carried (section 5); no value is chosen anywhere.

Before the last build every statement was compared with the passage that carries it (a scratch script lists the numbers, names and other words of a statement that the passage does not contain, and each was read): clauses that went beyond the passage were cut or the passage was widened to hold them (for example the Wolf Run Shoals place and a wrong "five and a half months" on the three Vermont figures of 15 February 1863, which are about four and a half months before 1 July; a "Fifth United States Artillery" that Stannard's report does not print; "for 30 June" in Fox's footnote on the First Corps returns).

## 2. The 21 leaf units: how each missing word is closed

`arrival` = a record of kind arrival (scope field) of the unit or of a formation above it; `path` = an arrival_road with `enters_ground` of the unit or a formation above; `positions` = a record dated on each owed day (2 and 3 July for Paul's five regiments and Biddle's four, 2 July for Baxter's six; Stone's and Stannard's regiments owe none); `strength` = a strength record of the unit, or a gap.

| Unit | arrival | path | positions (owed days) | strength |
|---|---|---|---|---|
| 16th ME (Paul) | own (Farnham R045) | own, Small 1886: the Emmitsburg road; division and brigade (inferred) | own, 2 and 3 July (R045) | Fox: 248 engaged (inferred) |
| 13th MA (Paul) | own (R046; Davis 1894, about 11 o'clock) | own, Davis: left the road near the Codori house (inferred); division | own, 2 and 3 July (R046) | 260 muskets (R046) |
| 94th NY (Paul) | own (R047; NY volume, 7 a. m. start) | division, brigade (inferred) | own, 2 and 3 July (R047) | 30 officers, 415 men, 1 July morning (NY volume, inferred) |
| 104th NY (Paul) | own, about 1 o'clock (R048) | own, Prey 1888: the Emmitsburg Pike (inferred) | own, 2 and 3 July (R048), and the address of 1888 against it | **gap** (damaged sentence in the NY volume) |
| 107th PA (Paul) | division and brigade (the regiment's own hour, going into the fight at about 1 p. m. R050, is an engagement hour and is the ledger's POS-A-1D3-061) | division, brigade | own, 2 and 3 July (R051) | 230 guns, 25 officers (R050); 78/12 on 2 July, 72/11 on 3 July (R051) |
| 12th MA (Baxter) | own, Cook 1882 (no report in the Official Records); brigade 11 a. m. | division (inferred) | brigade, 2 July; own, 3 July (Cook) | about 200 (Cook; Fox) |
| 83rd NY (Baxter) | own, about noon (NY volume, inferred) | own, the pike to the Codori House (inferred) | own and brigade, 2 July | 148 including officers (1 July), about 75 (2 July) (NY volume, inferred) |
| 97th NY (Baxter) | own, 1 p. m. (R053); brigade 11 a. m. | brigade (inferred) | brigade, 2 July | **gap** |
| 11th PA (Baxter, then Paul) | own, about 11 a. m. (R044) | brigade (inferred) | own, 2 July (R049) | **gap** |
| 88th PA (Baxter) | own (R054) | brigade (inferred) | own (Wagner 1889) and brigade, 2 July | 296 (Wagner 1889, documented as an address by an officer) |
| 90th PA (Baxter) | brigade, 11 a. m. (R052) | brigade (inferred) | brigade, 2 July | **gap** |
| 80th NY (Biddle) | own (Gates, between 10 and 11) | own (R057): the Hagerstown road | own, 2 and 3 July (R057, two reports of Gates) | 28 officers, 259 men (R057); 375 on the monument: carried |
| 121st PA (Biddle) | own (A. Biddle R058) | brigade: the Hagerstown road (McFarland, documented) | own, 2 and 3 July (R056) | 258 muskets, 7 officers on 30 June (A. Biddle, narrative in PA2) |
| 142nd PA (Biddle) | brigade (C. Biddle, about 11 a. m.) | brigade (documented) | own, 2 and 3 July (R059) | 80 for duty on 1 July night (R059); 336 present (PA2, inferred) |
| 151st PA (Biddle) | own, 10.30 a. m. (R060) | own: the Hagerstown road (R060) | own, 2 and 3 July (R060, R057) | 21 officers, 446 men (R060); 8 officers, 113 men on 2 July |
| 143rd PA (Stone) | brigade, 11 a. m. and noon | brigade: the Emmitsburg road (Johnson 1889, documented) | none owed; brigade records of 1 to 3 July added (R062, R063) | 465 (R063, R064; Fox) |
| 149th PA (Stone) | brigade; march of Irvin (R066) | own: the Emmitsburg direction (R065); brigade (Johnson 1889) | none owed; own night record of 2 July (advanced some 600 yards, R063) | about 450 (R063, R065, R066) |
| 150th PA (Stone) | own, about noon (R067) | brigade (Johnson 1889) | none owed; own night record of 2 July (same) | 400 (R063, R067, R029); Fox 417: carried |
| 13th VT (Stannard) | own, about 5 p. m. (R070) | brigade: the Emmittsburg road (Benedict 1888, inferred) | none owed; own records of 2 and 3 July (Randall R070) | 831 on 15 February 1863 (Benedict; a dated figure about four and a half months before the battle, not the strength of 1 July) |
| 14th VT (Stannard) | brigade (Randall, Stannard, Benedict) | brigade (Benedict) | none owed; own movement of 3 July, 4 a. m. (R069) | 777 on 15 February 1863 (same) |
| 16th VT (Stannard) | brigade (same) | brigade (Benedict) | none owed; own picket record of 2 to 3 July (R069) | 684 on 15 February 1863 (same; the OCR prints G84, the printed total shows 684) |

The 7 formation rows have records of their own: Robinson's division (arrival, the road, the strength), Baxter's brigade (arrival by three witnesses, the pike, the line of 1 and 2 July, strength), Paul's brigade (the Emmitsburg Pike), Rowley's division (arrival toward 11 o'clock), Biddle's brigade (arrival, the Hagerstown road, strength, the line of 2 July, line order), Stone's brigade (arrival by four witnesses, the Emmitsburg road, strength), Stannard's brigade (arrival by eight witnesses, the road, the night position, the footnote).

## 3. The four roster-gap entries

| Entry | Answer |
|---|---|
| `us-1c-3d-stannard-12vt` | `unit` record (action absent, never_main_field) from the table line and its footnote; four `absent` records (the footnote, Stannard R069, Doubleday R029, the 1914 Vermont volume, Bachelder's note of Benedict) |
| `us-1c-3d-stannard-15vt` | `unit` record (never_main_field); `absent` records with windows: detached before the ground (1 July), back with the brigade in the morning of 2 July, ordered back about noon (R069); it was on the field for those hours, so the absence is partial |
| `us-1c-3d-stannard` (the footnote) | not a unit: the id is the brigade's own. Answered by one `absent` record of the brigade with `part` "the 12th and 15th Vermont" (`whole_battle` false); request note `bt-units-us-1c-2d-3d-roster-gap-entry.md` |
| `us-1c-2d-baxter-11pa` (status) | `unit` record (action status, on_field) from the table footnote "Transferred, in afternoon of July 1, to the First Brigade"; positions of 2 July of the regiment; request note `bt-units-us-1c-2d-3d-11pa-reparent.md` (the contract has no change of parent) |

## 4. Open gaps (visible, with proposed register entries)

| Gap record | What | Register entry |
|---|---|---|
| `U-us-1c-2d-3d-0203` | strength of the 97th New York, the 11th Pennsylvania, the 90th Pennsylvania (unit `us-1c-2d-baxter`, `covers` the three) | `docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/us-1c-2d-3d-baxter-strength.md` |
| `U-us-1c-2d-3d-0204` | strength of the 104th New York (a sentence of the NY volume, NY2-S021 p. 755, is damaged in the OCR and appears to print the number reported for duty on the morning of the fight) | `.../proposed-register/us-1c-2d-3d-104ny-strength.md` |

Searches are listed in the records (9 for the first, 8 for the second): Official Records part 1, Fox, NY1/NY2/NY3, PA1/PA1B, the four acquired texts, and `NOT-ACQUIRED:` entries for Busey and Martin (not on this machine, not public domain: an owner-only act) and for the regimental histories of the 97th New York, 90th and 11th Pennsylvania (archive.org title searches returned nothing).

## 5. Conflicts carried (none chosen)

| Key | What disagrees |
|---|---|
| `us-1c-3d-stannard|arrival|1863-07-01` (8 records) | about 5 p. m. (Randall, 13th VT, documented), the evening (Stannard), about twilight (Doubleday), nearly sunset (Benedict 1888), sundown (1914 volume), about dusk (Davis 1894), 2 July (Fox 1889) |
| `us-1c-3d-stannard|night_position|1863-07-01` | wheat-field on Cemetery Ridge on the right of Birney (Benedict), with the ledger's three versions (front line with the Third Corps; Cemetery Hill; the line with Sickles' troops) |
| `us-1c-2d-baxter|arrival|1863-07-01` (5) | 11 a. m. (Baxter; Coulter, twice), 1 p. m. (97th NY), about noon (83rd NY) |
| `us-1c-3d-biddle|arrival|1863-07-01` (3) | 10.30 a. m. (151st), between 10 and 11 (20th NY), about 11 (brigade); Rowley: toward 11 |
| `us-1c-3d-stone|arrival|1863-07-01` (4) | 11 a. m. (Stone, Dana), about 12 m. (Wister), about noon (150th) |
| `us-1c-2d|strength` (3), `us-1c-2d-baxter|strength` (2), `us-1c-3d-stone|strength` (2), `us-1c-3d-stone-150pa|strength` (4), `us-1c-3d-biddle-80ny|strength` (3) | less than 3,500 (OR text) against 2,500 (Cook, Davis); a few less than 1,200 against 1,100; 1,300 against 1,315; 400 against 417; 28 officers and 259 men against 375 engaged |
| `us-1c-2d-paul-104ny|position|1863-07-02` and `|1863-07-03` | Prey's report of 1863 against his address of 1888 (Baltimore Pike and Ziegler's Grove; the stone wall near the Emmitsburg Pike) |
| `us-1c-3d-biddle-80ny` and `-151pa|engagement|1863-07-03` | 12.30 p. m. (Gates, 4 July) against 1 o'clock (Gates, January 1864) |
| `us-1c-2d-paul-16me|march|1863-07-01` | 9 a. m. (Small 1886) against 6 a. m. (Farnham R045, ledger POS-A-1D3-027) |

Also in the notes of records (not as groups): the corps itinerary (R007) puts the First Corps on the road from Marsh Run on 1 July where Robinson, Baxter and the regiments print Emmitsburg; Davis puts the 13th Massachusetts at Marsh Creek on 30 June where Batchelder prints the Pennsylvania line; the 12th Massachusetts prints a start at 4 a. m., the 97th New York 7 a. m., the 83rd about 8, the 16th Maine 9 or 6.

## 6. Defects found in the texts or the layer data

1. OR27-1 (p. 291) text prints Robinson's strength as "less than 3,500" and 134 commissioned officers; Cook (1882) and Davis (1894) print 2,500 and 124 in quoting the report; 1,667 is "considerably more than half" of 2,500, not of 3,500. Request note `bt-units-us-1c-2d-3d-or27-r043-strength.md`.
2. The layer's gate of Stannard's brigade (2 July 18:00) is later than every printed arrival except Fox: request note `bt-units-us-1c-2d-3d-stannard-gate.md`.
3. The state-volume index heads NY2-S021 as the 95th New York; the 104th New York's address (pp. 755-758) is inside it: `bt-units-us-1c-2d-3d-statevol-index.md`.
4. Doubleday's second report prints "On the 3d" for the movement of the left wing of the 13th Vermont (Stannard and Randall print 2 July): not used as a record (no new fact).
5. The OCR of R045 to R070 damages numbers in places (R062 "13 m." for 12 m.; R069 "abovit noon" for about noon; R048 "SOth" for 30th; the NY2 104th sentence): such records carry `ocr_uncertain` and no clock is taken from a damaged digit.
6. `status.json` holds no place of its own on 2 and 3 July for 15 units although ledger A holds claims of them (for example the 3 July claims POS-A-1D3-065 and -066 of the 107th Pennsylvania, anchored to GZ-003); why those claims are not stops is for the integrator to say. The records here give anchored, timed records where the passages allow, and name the ledger claims in `corroborates`.

## 7. Texts read and not read

Read in full: OR27-1 R029, R030, R043 to R070 (R071 only for the line the ledger cites), the table R009 (First Corps), the itinerary R007 (29 June to 4 July). Read in part (searched, with the passages that state each claim read): OR27-3 (Reynolds' dispatches of 30 June, D0921, D0922, D0927, D0930, D0982: not cited); PA1/PA1B/PA2 sections S002, S007, S011, S012, S016, S017, S018, S032, S033, S040 and the Biddle, Wagner, Johnson, Chamberlain and Sellers addresses; NY2-S015, S017, S020, S021 (the 104th address); NY1, NY3 sections (rosters and monuments, no records); ME-S003, S004 (searched only); Fox (the pages of the 16th Maine, 12th Massachusetts, 83rd and 80th New York, 11th, 121st, 142nd, 143rd, 149th, 150th Pennsylvania); VT-GB-1914 (the narrative of the brigade); VT-MON-1890 (searched); BACH-STORY-1904 (the note on the Vermont regiments); JACOBS, BL3, PIERCE-F (searched for the Vermont brigade only). Not read: the state volumes' sections beyond those named, R013 and R008 (casualty and strength returns by corps).

Acquired from archive.org (reachable; 1 request a second; declared by `source` records; hashes checked by the checker): Benedict, Vermont in the Civil War, vol. 2 (`vermontincivilwa02bene`, 2,001,922 bytes); Cook, History of the Twelfth Massachusetts (`websterregiment00cookrich`, 379,115); Davis, Three years in the army (`threeyearsinarmy00davis`, 1,457,438); Small, The Sixteenth Maine Regiment (`sixteenthmainere00smal`, 689,513). Under `tmp/units-us-1c-2d-3d/texts/` (untracked). No host answered with a block.

Found and not acquired (leads for round 2): Gates, The "Ulster Guard" (20th N. Y. State Militia) and the War of the Rebellion, 1879 (`ulsterguard20thn00gate`) and The Ulster guard at Gettysburg (`ulsterguardatget00abbe`, 1891): the colonel's own history of the 80th New York, for its strength (287 or 375) and its marches. Not found on archive.org by title: regimental histories of the 97th New York, the 90th and 11th Pennsylvania, the 104th New York, the 107th Pennsylvania, the 88th Pennsylvania, the 83rd New York.

## 8. Requests made (files outside the group's own)

`bt-units-us-1c-2d-3d-11pa-reparent.md`, `bt-units-us-1c-2d-3d-roster-gap-entry.md`, `bt-units-us-1c-2d-3d-statevol-index.md`, `bt-units-us-1c-2d-3d-or27-r043-strength.md`, `bt-units-us-1c-2d-3d-stannard-gate.md` (all in `docs/battle-theatre/GOVERNANCE/horde/requests/`).

## 9. What is still owed (round 2) and what was not done

- Strength of the 97th New York, the 90th and 11th Pennsylvania, the 104th New York (the two gap records); the figure of the Vermont regiments for 1 July (only the 15 February 1863 figures are printed in the texts read); a re-read of NY2 p. 755 on the scan.
- Positions of 1 to 3 July of Stone's and Stannard's brigades were not owed (the ledger and the troop maps hold places); they were nevertheless entered from the reports of Dana, Wister, Stannard and Randall (night of 1 July, 2 July morning and afternoon, the advance of the 149th and 150th, the breastwork and the second line of 3 July; the brigade of Stannard at the break in the line, its front held for twenty-six hours, the 13th Vermont's two days). Not done: the 14th and 16th Vermont's own accounts (none is in the Official Records text read), the 143rd, 149th and 150th as separate units on 3 July, and the 13th Vermont's flank attack and pursuit as separate movement records.
- 3 July positions of Baxter's regiments (their places come from the troop map) were not extended beyond the 12th Massachusetts.
- The regiments' own accounts of the 90th Pennsylvania (Sellers 1888) and the 11th Pennsylvania were searched, not read in full.
- No record states an exact hour from a digit damaged in the OCR; the hours of the 13th Massachusetts (about 11), the 16th Maine (9 a. m. departure in words) and the 150th (perhaps 9.45, without a. m. or p. m.) are carried as printed, without a machine-readable clock.
- A `NOTES.md` under `ws-units/us-1c-2d-3d/` was not written (outside the paths of this task); sections 6 and 7 of this report hold its content.
- The builder of the file (scratch, untracked): `tmp/units-us-1c-2d-3d/tools/` (lib.py and the s*.py specs; run with `python3 -I tmp/units-us-1c-2d-3d/tools/run.py`).
