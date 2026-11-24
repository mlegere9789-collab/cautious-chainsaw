# Kit evidence report: us-6c

Army of the Potomac, VI Corps: corps headquarters and the infantry of the three divisions (Wright, Howe, Newton and Wheaton). 49 units of `groups.json` (1 corps, 3 divisions, 8 brigades, 36 regiments and the roster unit `us-6c-2d-1brig`, which the record says did not exist). Workstream `bt-oob-kit`. Evidence file: `us-6c.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/us-6c-01-strength.md`, `us-6c-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-us-6c-roster.md`, `-library.md`, `-catalog.md`. Written on 24 November 2026.

How the file was made. A builder in `tmp/kit-us-6c/` (`kb.py`, `build.py` and the packages `p1_table.py` to `p6_gaps.py`) locates each quote in the text through the evidence library, so offset, report id and printed page come from the tool and not from hand. The figures the OCR scrambles (the rows of the return of casualties on pp. 180 to 182, the abstract rows of pp. 151 to 153 and Torbert's table on p. 668) were read from the scan at 300 to 500 dpi and added up against the printed totals; the checker verifies the row arithmetic. No new text was declared and no host was contacted: every citation is to a text of `sources.json`. `python -I tools/bt/kit_overrides.py compile --dry-run --group us-6c` (writes nothing) runs: 38 operations, 50 entries unapplied (48 routed to the verified tables by design, 2 to review: see the catalog note).

## Counts

`python -I tools/bt/kit_evidence_check.py us-6c --coverage --require-complete` exits 0:
`us-6c: 275 lines (260 evidence, 15 gap, 0 source); accepted 255 (documented 205, inferred 50); rejected 0; superseded 5; 0 errors, 73 warnings; coverage: 266 of 266 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Accepted lines by field (active, not superseded):

| field | documented | inferred | note |
|---|---|---|---|
| roster | 52 | 0 | the 49 units from the organization table (OR27-1-R009 pp. 162 to 163), two units the plan lacks (null lines), one state-volume line (33d New York) |
| commander | 56 | 0 | every commander the table prints, in order, with the changes of 1 to 4 July from the reports (5 table lines superseded by dated lines) and Toombs' colonels of the 2d and 3d New Jersey as the other side of two conflict sets |
| officer | 7 | 0 | the lists of officers killed and mortally wounded (Garsed, Gilfillan, Sample), Sample and others from the reports |
| strength | 22 | 9 | corps abstracts of 10, 20 and 30 June and 10, 20 and 31 July (present for duty and aggregate); the Adjutant General's letters (7 Pennsylvania regiments); 3 Maine estimates; inferred: the 4 July field return (corps, three divisions) and Torbert's table (brigade, four regiments) |
| casualties | 47 | 11 | 37 rows of the return (`casualty_return`, read from the scan), 10 `report_statement`; 11 inferred zeros (regiments with no row whose brigade total proves it) |
| arms | 5 | 2 | 49th Pennsylvania (two documented, one inferred), 93d Pennsylvania (two documented, one inferred), 49th New York (one) |
| dress | 12 | 28 | badge 36 regiments (the corps order, 4 New Jersey, 5th, 6th and 7th Maine and 49th New York documented; 28 inferred), coat of the 95th Pennsylvania, shoes of the 139th Pennsylvania and 7th Maine |
| detachment | 4 | 0 | 49th Pennsylvania (four companies), 7th Maine (six companies; four at Portland), 33d New York |

Strength lines by kind (31 active): `present_for_duty` 22 (6 abstract rows of the corps, 7 Pennsylvania regiments, 9 inferred), `aggregate_present` 6 (corps), `estimate_in_report` 3. Casualty lines by basis: `casualty_return` 37, `report_statement` 10, `derived` 11 (inferred). Sources of the active lines: OR27-1 182; PA-GB-1914-v2 8; ME-GB-1898 8; NJ-TOOMBS-1888 6; NY-GB-1900 5; PA-GB-1914a 3; PA-GB-1904 2; 41 derived lines carry no source.

Verified status by the rule of section 9 (roster, commander and strength each with a documented line): 11 units `verified` (the corps and the 23d, 82d, 93d, 95th, 96th, 98th, 139th Pennsylvania and 5th, 6th and 7th Maine), 38 `partly` (roster, commander and casualties, strength inferred or gap), none without evidence. Of the 266 required pairs, 203 hold a line and 63 hold only a gap line (the strength of 29 units, the commander of the nonexistent brigade, the arms of 33 regiments); the dress pair of each regiment holds the badge line and nine gap lines for the other fields, and the arms pair of the three regiments with a line holds gap lines for the bayonet and sword.

Warnings (73, all information): `OCR_CORRECTED` 30, `OFF_FIELD` 22 (the abstract rows of June, the arms of 1861 and 1862, the badge order of April 1863, the Zouave uniform of 1862), `NO_IDENTITY` 12 (abstract rows with no identity of the row), `PAGE_UNCHECKED` 6 (Toombs, whose volume has no page model; the page is not given), `NUMBERS_WAIVED` 3.

## Corrections

What the PDF or the kit had, against what the record says. "kit now" is what `groups.json` prints (tiers: P plausible-procedural, I inferred, E empty). Line numbers are `us-6c:` ids.

| unit | field | kit now | evidence value | source, page | line |
|---|---|---|---|---|---|
| VI Corps | strength | 13,601 (Stone Sentinels via the PDF; an equal share for every regiment) | present for duty 15,710 on 30 June (1,031 officers, 14,679 men; aggregate present 17,625); 16,387 on 10 June and 15,424 on 20 June; 14,645 on 10 July, 14,252 on 20 July, 13,700 on 31 July; 12,832 on the field return of 4 July (kind not stated for this corps) | R008 pp. 151 to 153 | 0178 to 0189, 0193 |
| VI Corps | casualties | 242 (PDF) | 242: 2 + 25 killed, 14 + 171 wounded, 30 missing (the Artillery Brigade's 12 included); the OCR prints the killed enlisted 85 | R013 p. 182 | 0156 |
| divisions | strength | none | 4,173, 3,424 and 4,228 on 4 July (287 + 3,886; 215 + 3,209; 281 + 3,947) | R008 p. 153 | 0190 to 0192 |
| divisions, brigades | casualties | none | First Division 18, Second 16, Third 196; brigades 11, 5, 2, 1, 15, 74, 69, 53 | R013 pp. 181 to 182 | 0120 to 0156 |
| Bartlett's brigade | commander | Bartlett; Upton | Bartlett; Upton commanded from the evening of 1 July until Bartlett returned on the march to Round Top | R227 p. 673 | 0104 |
| Third Division | commander | Newton/Wheaton | Newton (table, footnote p. 155), Wheaton from 2 July (Sedgwick, Shaler), Bartlett assigned on 4 July | R009 p. 163; R223 p. 663; R226 p. 671 | the table lines of the division, 0105, 0106 |
| Wheaton's brigade | commander | Wheaton/Nevin | Wheaton; Nevin of the 62d New York in command from the evening of 1 July to that of 4 July | R234 pp. 684 to 685 | 0107 |
| regiments | commander | none (the plan gives none below the brigade) | every regiment's commander as the table prints him (36 regiments), with Hamilton (62d New York) and Moody (139th Pennsylvania, Collier shot himself through the foot on 3 July) | R009 pp. 162 to 163; R234, R237 | 0014 to 0101, 0108 to 0110 |
| 2d and 3d New Jersey | commander | none | Wiebecke and Campbell (table, lieutenant colonels); Buck and Brown (Toombs, colonels): a conflict set | R009 p. 162; NJ-TOOMBS-1888 | 0031, 0033 and the Toombs lines 0111, 0112 |
| regiments | casualties | none | 36 lines: the rows of the return (the 2d to 4th brigade totals check), statements of the reports and the Adjutant General; 11 zeros proved by brigade totals | R013 pp. 180 to 182 | 0120 to 0177 |
| regiments | strength | an equal share of 13,601 | 23d 538, 82d 320, 93d 270, 95th 356, 96th 356, 98th 406, 139th 511 (present for duty 30 June); 1st NJ 356, 2d 448, 3d 367, 15th 492 (return of 17 July, kind not stated); 5th Maine about 275, 6th about 350, 7th about 200 | PA-GB-1914-v2; R225 p. 668; ME-GB-1898 | 0194 to 0208 |
| 49th Pennsylvania | arms | default draw (Enfield, 1861 Springfield, Lorenz, Mississippi, smoothbore) | Harper's Ferry muskets converted to percussion, .68 (Sept. 1861); Austrian .54 rifles from the winter of 1861-62; the Austrian rifle on 2 July (inferred) | PA-GB-1904 (PA1-S016) | 0246 to 0248 |
| 93d Pennsylvania | arms | default draw | Belgian rifles, then Springfield muskets before the Peninsular campaign, Springfield rifles in May 1864; Springfield on 2 July (inferred) | PA-GB-1914a (PA1B-S030) | 0249 to 0251 |
| 49th New York | arms | default draw | 846 smoothbore muskets calibre .69, buck and ball (Sept. 1861); no later statement | NY-GB-1900 p. 387 | 0252 |
| 36 regiments | badge | E or I | Greek cross, red, white or blue by division (Hooker's order of April 1863); documented for 4 New Jersey, 5th, 6th, 7th Maine, 49th New York; inferred for 28 | NJ-TOOMBS-1888; ME-GB-1898; NY-GB-1900 (NY1-S081 p. 388) | 0209 to 0245 |
| 95th Pennsylvania | dress (coat) | P | Gosline's Zouaves: "bright handsome zouave uniform", soiled by the Peninsular campaign of 1862; nothing for July 1863 | PA-GB-1914a (PA1B-S031) | 0255 |
| 139th Pennsylvania, 7th Maine | dress (shoes) | P | shoes worn out on the march of June 1863 (feet tied up in cloths, bare feet); "the shoes of the men were badly worn" on the march to Gettysburg | PA-GB-1914-v2 (PA2-S008); ME-GB-1898 p. 426 | 0253, 0254 |
| 33d New York | roster | a regiment | a small detachment of three-years men attached to the 49th New York; the regiment was mustered out on 2 June 1863 | NY-GB-1900 | 0259, 0260 |
| 7th Maine | detachment | none | six companies at Gettysburg, Companies A, E, G and H at Portland | R009 p. 163; ME-GB-1898 | 0257, 0258 |

Other differences from the kit: the PDF's corps casualties 242 agree with the return; its strength 13,601 matches none of the figures of the record (present for duty 12,832 on 4 July, 15,710 on 30 June, 14,645 on 10 July). The PDF's `us-6c-2d-1brig` has no counterpart in the record.

## Conflicts

Two conflict sets, each value a selectable scenario with no default picked:

| key | alternatives | where |
|---|---|---|
| 2d New Jersey, commander in July 1863 | A Lieut. Col. Charles Wiebecke (organization table, OR27-1-R009 p. 162; Torbert's report names him in charge of the picket line on 3 July); B Col. Samuel L. Buck (Toombs 1888, the list of the corps' New Jersey regiments) | 0031 (A); 0111 (B) |
| 3d New Jersey, commander in July 1863 | A Lieut. Col. Edward L. Campbell (table); B Col. Henry W. Brown (Toombs) | 0033 (A); 0112 (B) |

Not conflicts (different basis or date, two lines each with its own basis): the 121st New York (the return 2 wounded, Upton's report 1: 0124 and 0159); the 119th Pennsylvania (the return 2 wounded, Russell's report of no casualties on 2 to 4 July: 0128 and 0160, a discrepancy for the integration); the 98th Pennsylvania (the return 2 officers and 9 men wounded; the Adjutant General 2 officers and 11 men, of whom one died; Kohler 1 officer and 9 men on 2 July and Lieutenant Manthe on the 3d); the 2d Rhode Island (the return 1 killed, 5 wounded and 1 missing; Rogers 1 killed and 5 wounded); Neill's brigade (the report's 1 officer and 13 men killed and wounded agrees with the return's 14 killed and wounded and 2 missing); Bartlett's brigade (2 privates wounded on 2 July; the return 5 over the whole period). A strength of the corps on 4 July (12,832) against the return of 30 June (15,710) is two dates.

OCR digit errors found against the scan:
- R013 return of casualties: the corps killed enlisted "85" (25); the Third Brigade "S3" (53); Eustis' brigade missing "26" (25); Shaler's missing "8" (3); Bartlett's total "S" (5); the 37th Massachusetts' missing cell is smeared (read 19 by two checks: the row aggregate 47 and the brigade total of missing 25); the labels "16th New Jersey" (15th), "8Bd Pennsylvania" (82d), "P5th" (95th), "98th" for the 96th Pennsylvania, "ad Shode Island" (2d Rhode Island), "121st New Tork".
- R009 organization table: "131st New York" (121st); "10:M Pennisylvania" (102d); "Co)." (Col.); "95tli", "98tli", "49tli", "lOtli", "FrankUn", "Cliarles", "HuUngs", "Tlieodore", "Frederick II." (H.); the OCR drops the surnames Lessig (96th Pennsylvania) and, for the 2d Rhode Island, the suffix "jr.", which fall on the next column line.
- R008 abstract: the field return's corps infantry men "11,012" (11,042); 4 July divisional rows run together without labels.
- R237 (Moody): "afternoon of the 3d" (the scan reads the 2d); R234 (Nevin): "1 was placed" for I.

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | 7 brigades (all but Torbert's) | OR27-1 R223 to R237 read through; R008; PA-GB-1914-v2 | not found (line 0261) | kit-us-6c-01 |
| strength | 22 regiments (121st NY, 49th and 119th PA, 5th WI, 2d to 6th VT, 33d, 43d, 49th, 62d, 65th, 67th, 77th, 122d NY, 61st PA, 7th, 10th, 37th MA, 2d RI) | R223 to R237; the Adjutant General letters (none for the 49th, 61st, 119th); NY, ME, VT, NJ, PA volumes and Fox, regex for strength words near each designation | not found (line 0262) | kit-us-6c-01 |
| commander | `us-6c-2d-1brig` | R009 p. 163 footnote; R229, R223, R013 p. 181 | not found: the brigade did not exist (line 0263) | none (roster note) |
| arms (weapon) | 33 regiments | R223 to R237; the sections of the regiments in the Pennsylvania, New York and Maine volumes; Toombs, VT-GB, Fox | not found (line 0264) | kit-us-6c-02 |
| arms (bayonet, sidearm_sword) | all 36 regiments | the same sources, regex bayonet, sword, sabre, scabbard | not found (lines 0265, 0266) | kit-us-6c-02 |
| dress (headgear, coat, shirt, trousers, shoes, accoutrements, sash, pack_state, flag_or_instrument) | the regiments without a line in the field | the dress regex over R223 to R237 and the sections above | not found (lines 0267 to 0275) | kit-us-6c-02 |

## Roster

- Units the record shows and the plan lacks (reported, never applied): the 102d Pennsylvania (Patterson, "not engaged in the battle", Wheaton's brigade; line 0102), the 4th New Jersey provost guard of the First Division (three companies, Maxwell; line 0103); the corps headquarters cavalry companies (1st New Jersey Company L, 1st Pennsylvania Company H, Capt. Craft) are named in the request note without a line.
- A unit the plan has and the record does not show: `us-6c-2d-1brig`, a First Brigade in the Second Division (line 0013, "No First Brigade in division").
- Mislabelled: the 33d New York is a detachment of three-years men under the 49th New York, the regiment having been mustered out on 2 June 1863 (0259, 0260). The section index of the state volumes names NY2-S003 for the 62d New York, which is right (the 62d's address of 2 July 1888); NY1-S006 and NY1-S038 are the monument title and the missing-in-action list for the 43d and give no history.

## For other groups

- `us-art-corps` (Tompkins' VI Corps Artillery Brigade): the return of casualties p. 182 has one row, "New York Light, 1st Battery" (4 killed enlisted, 2 wounded officers, 6 wounded enlisted, 12 in all; OCR "New Tork light, 1st Batteiy 4 2 6 12"), and the brigade total 12; the field return of 4 July p. 153 gives the Artillery Brigade 29 officers and 978 men, 1,007 (`python -I tools/bt/kit_evidence_lib.py cite OR27-1 "Total Sixth Army Corps 783 11,012 29 978 12,832"` for the corps row, whose artillery columns are those). Neill's report (R231 p. 678) names "Captain Martin's battery of rifled pieces" and later "Lieutenant Martin's battery of rifled pieces" with the Light Division of 6 July.
- `us-cav`: Neill's Light Division of 6 to 12 July included "Colonel McIntosh's brigade of cavalry, two pieces of light artillery accompanying it" (R231 pp. 678 to 680); McIntosh's 9 July action at Zeigler's Mills (4 wounded, 1 mortally).
- `us-5c`: Bartlett's brigade and Nevin's brigade (62d New York, 93d, 98th, 139th Pennsylvania) fought beside the Pennsylvania Reserves of Crawford's division on the evening of 2 July and in the reconnaissance of 3 July (R226 p. 671; R234 pp. 684 to 685; the 139th's recapture of a Napoleon gun and three caissons of the Ninth Massachusetts Battery).
- `us-12c`: Shaler's First Brigade, Third Division, reported to Geary on the morning of 3 July (R232 pp. 680 to 683), the 122d New York relieving the 111th Pennsylvania at 9 a.m. and the 82d relieving the 122d at 11.30 a.m.; Neill's Third Brigade was under Slocum (R231 p. 680).

## Sources

OR27-1 (R008, R009, R013, R223 to R237) for the table, the returns, the reports; PA-GB-1904 (49th Pennsylvania arms), PA-GB-1914a (93d Pennsylvania arms, 95th Pennsylvania uniform), PA-GB-1914-v2 (Adjutant General's letters for the 23d, 82d, 93d, 95th, 96th, 98th and 139th; the 139th's address), NY-GB-1900 (49th New York arms and badge, the Sixth Corps order, the 33d New York footnote), ME-GB-1898 (5th, 6th and 7th Maine strength, badge, 7th Maine shoes and companies), NJ-TOOMBS-1888 (badge list, colonels). No new source was declared and no host contacted; no host was refused. The texts of the Benedict, Bates and Quiner volumes on disk from other groups were searched and not cited.

## Not done

Every required (unit, field) pair has a line or a gap line (0 open). What the pass did not do, by choice of the record held:
- The strength of 7 brigades and 22 regiments, the arms of 33 regiments, the bayonet and sword of all 36 and nine dress fields of the regiments are gap lines: the record held locally is silent after the searches above. Regimental histories of the Vermont, Massachusetts, Rhode Island, Wisconsin and most of the New York regiments are not on disk and none was fetched (library note).
- The abstract rows of the corps give the equipped infantry, cavalry and artillery columns; only the present for duty and aggregate columns were read into lines (the equipped columns were not read with the same care and are not entered).
- Fox's Regimental Losses and the Official Records' index were not used for casualties; the return, the reports and the Adjutant General's letters were.
- The `officer` lines are the ones that bear on commanders and the lists of the killed (7 lines); the company officers of the regiments are not listed.
