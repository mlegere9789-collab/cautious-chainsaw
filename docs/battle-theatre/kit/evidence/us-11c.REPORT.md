# Kit evidence report: us-11c

Army of the Potomac, XI Corps: corps headquarters and the infantry of the three divisions (Barlow and Ames, von Steinwehr, Schurz). 36 units of `groups.json` (1 corps, 3 divisions, 6 brigades, 26 regiments). Workstream `bt-oob-kit`. Evidence file: `us-11c.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/us-11c-01-strength.md`, `us-11c-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-us-11c-roster.md`, `-library.md`, `-catalog.md`. Written on 24 November 2026.

How the file was made. A builder in `tmp/kit-us-11c/` (`kb.py`, `build.py` and the packages `p1_table.py` to `p6_gaps.py`) locates each quote in the text through the evidence library, so offset, report id and printed page come from the tool and not from hand. The figures the OCR scrambles (the rows of the return of casualties on pp. 182 and 183 and the abstract rows of pp. 151 to 153) were read from the scan at 260 to 300 dpi and added up against the printed totals; the checker verifies the row arithmetic. No new text was declared and no host was contacted: every citation is to a text of `sources.json`. `python -I tools/bt/kit_overrides.py compile --dry-run --group us-11c` (writes nothing) runs: 28 operations, 44 unapplied (36 routed to the verified tables by design, 8 to review: see the catalog note).

## Counts

`python -I tools/bt/kit_evidence_check.py us-11c --coverage --require-complete` exits 0:
`us-11c: 268 lines (254 evidence, 14 gap, 0 source); accepted 241 (documented 207, inferred 34); rejected 0; superseded 13; 0 errors, 99 warnings; coverage: 196 of 196 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Accepted lines by field (active, not superseded):

| field | documented | inferred | note |
|---|---|---|---|
| roster | 38 | 0 | the 36 units from the organization table (OR27-1-R009 p. 164), two units the plan lacks (null lines) |
| commander | 60 | 0 | every commander the table prints, in order; 13 table lines superseded by dated lines from the reports (Ames, Harris, Fowler, Brady, the 25th Ohio, Thomson, Ledig, Boebel, Fuchs, Lloyd, von Amsberg) and the additions the table lacks (Schurz for the corps, Schimmelfennig for the division, Noble, Morgan, Bourry) |
| strength | 45 | 0 | corps abstracts of 10, 20 and 30 June and 10, 20 and 31 July (present for duty and aggregate present) and the field return of 4 July (corps and three divisions, present for duty: the footnote names the Eleventh Corps); Schurz's two estimates; 12 regiments by report, Adjutant General, state volume or the Ohio commission's table |
| casualties | 54 | 0 | 36 rows of the return (1 corps, 3 divisions, 6 brigades, 26 regiments, read from the scan), 9 `report_statement`, 9 `state_volume` (monument inscriptions, Adjutant General letters, sketches) |
| arms | 2 | 0 | 154th New York (Enfield rifles), 45th New York (long-range Remington rifles) |
| dress | 5 | 34 | badge: the corps order (documented, 2 lines) and 26 regiments (inferred); the 54th New York coat (1861), the 45th New York shoes (7 July), the 41st New York detail's packs; shoes and packs of Smith's four regiments (inferred, 8 lines) |
| detachment | 3 | 0 | 41st New York (nine companies; 200 men detailed on 1 July), 75th Ohio (scouting party) |

Strength lines by kind (49 active): `present_for_duty` 17, `taken_into_action` 12 (45th New York two alternatives, 54th New York, 74th Pennsylvania, 17th Connecticut, seven Ohio regiments), `estimate_in_report` 10, `aggregate_present` 6 (corps). Casualty lines by basis: `casualty_return` 36, `report_statement` 9, `state_volume` 9. Sources of the active lines: OR27-1 177, OR-25-1 27, NY-GB-1900 13, OH-DED-1887 8, NY-GB-1900-v2 6, PA-GB-1914-v2 5, NY-GB-1902-v3 3, PA-GB-1914a 2.

Verified status by the rule of section 9 (roster, commander and strength each with a documented line): 23 units `verified` (the corps, the first and second divisions and the third division, and 20 regiments), 13 `partly` (the six brigades with no strength figure and the 27th Pennsylvania, 33d Massachusetts, 82d Illinois, 157th and 119th New York, 75th Pennsylvania and 26th Wisconsin), none without evidence. Of the 196 required pairs, 154 hold a line and 42 hold only a gap line (the strength of 13 units, the weapon of 24 regiments, the bayonet and side arm of 26, and the dress pair of each regiment for the fields without a line).

Warnings (99, all information): `OCR_CORRECTED` 33, `PAGE_UNCHECKED` 35 (OH-DED-1887 and OR-25-1 have no page model), `NO_IDENTITY` 12 (abstract rows), `OFF_FIELD` 11 (the March circular, the 1861 uniform, the 7 July march), `NUMBERS_WAIVED` 8.

## Corrections

What the PDF or the kit had, against what the record says ("kit now" is what `groups.json` prints). Line numbers are `us-11c:` ids.

| unit | field | kit now | evidence value | source, page | line |
|---|---|---|---|---|---|
| XI Corps | strength | 9,189 (Stone Sentinels via the PDF; an equal share for every regiment) | present for duty 10,576 on 30 June (603 officers, 9,973 men; aggregate present 12,096); 12,867 on 10 June (aggregate), 12,063 on 20 June, 8,206 on 10 July, 12,741 on 20 July, 11,857 on 31 July; 5,513 on the field return of 4 July; "hardly over 6,000 effective men" for two divisions going into battle | R008 pp. 151 to 153; R253 | 0149 to 0166 |
| divisions | strength | none | 1,182, 2,109 and 1,728 on 4 July (66 + 1,116; 127 + 1,982; 108 + 1,620); the Third Division about 1,500 on 2 July | R008 p. 153; R253 | 0161 to 0163, 0166 |
| XI Corps | casualties | 3,821 (PDF, weak source) | 3,801: 33 + 336 killed, 120 + 1,802 wounded, 62 + 1,448 missing; the OCR prints 180 and 1,441 | R013 p. 183 | 0148 |
| divisions, brigades | casualties | none | First Division 1,306, Second 946, Third 1,476; brigades 527, 778, 597, 348, 807, 669 | R013 pp. 182 to 183 | 0113 to 0147 |
| regiments | casualties | none | 26 rows of the return, each added to its printed aggregate and each brigade to its printed total | R013 pp. 182 to 183 | 0113 to 0147 |
| regiments | commander | none (the plan gives none below the brigade) | every regiment's commanders as the table prints them (26 regiments), with the changes of 1 to 4 July from the reports | R009 p. 164; R244 to R263 | 0005 to 0112 |
| regiments | strength | an equal share of 9,189 | 17th CT 386 taken into action; 41st NY 218 on arrival; 45th NY about 375 or about 400 (conflict); 54th NY 175 engaged on 2 and 3 July; 58th NY 222, 68th NY 267 or 277 (conflict), 73d PA 332, 136th NY 529 men, 153d PA 569, all present for duty on 30 June; 61st OH about 90 enlisted men in the line on 2 July; 74th PA 134 advancing; 82d OH 312 present for duty on 1 July; 75th OH about 160 (marched) and 91; 134th NY about 430; 154th NY about 300; the seven Ohio regiments 220, 375, 309, 338, 269, 258 and 480 engaged | R245, R246, R247, R258, R261; NY-GB-1900, -v2, -v3; PA-GB-1914-v2, -1914a; OH-DED-1887 | 0167 to 0193 |
| 154th New York | arms (weapon) | default draw | Enfield rifles, 1 July (pattern not stated) | NY-GB-1902-v3 (NY3-S009) | 0214 |
| 45th New York | arms (weapon) | `m1841_mississippi`, inferred, on Wikipedia (`Wiki-M1841`) | long-range Remington rifles, 1 July: the record contradicts the kit's weapon | NY-GB-1900 (NY1-S080) | 0215 |
| 26 regiments | badge | I or P (`badge_corps_unresolved`, `badge_none` for 10 of them) | crescent, red for the First Division, white for the Second, blue for the Third (circular of 21 March 1863: documented for the corps, inferred for each regiment) | OR-25-1; NY-GB-1902-v3 | 0227 to 0252 |
| 54th New York | dress (coat) | P | uniformed in black and silver in 1861 ("Black Rifles"); nothing for July 1863 | NY-GB-1900 (NY1-S082) | 0216 |
| 45th New York | dress (shoes) | P | most soldiers without shoes or in ragged shoes on 7 July | R256 | 0217 |
| Smith's four regiments | dress (shoes, pack) | P | shoes failing, many men barefooted; "fully equipped, with haversacks, knapsacks" on 1 July (brigade statement, inferred for each regiment) | R251 | 0218 to 0225 |

Other differences from the kit: the PDF's corps casualties 3,821 differ from the return's 3,801 by 20; its corps strength 9,189 matches no figure of the record (10,576 present for duty on 30 June, 5,513 on 4 July).

## Conflicts

Two conflict sets, each value a selectable scenario with no default picked:

| key | alternatives | where |
|---|---|---|
| 68th New York, present for duty on 30 June | A 16 officers and 251 men (267); B 277 "present for duty" at the muster of the previous day (the same sketch of the regiment, New York at Gettysburg vol. 2) | 0177 (A); 0178 (B) |
| 45th New York, taken into action on 1 July | A 25 officers and about 350 men (monument inscription); B about 400 officers and men in action (the sketch of the regiment, same volume) | 0181 (A); 0182 (B) |

Not conflicts (different basis, date or kind, two lines each with its own basis): casualties of the 136th New York (report 108, return 109), 119th New York (report 144, return 140), 26th Wisconsin (enlisted 200 in the report, 202 in the return), 74th Pennsylvania (speaker's parts sum to 103 and his total is 112; the return gives 110; the speaker's total is not entered); the 82d Ohio (312 present for duty, the Ohio table's 258 engaged); the 75th Ohio (about 160 marched, 91 on the hill, 269 engaged by the Ohio table); Bourry named as brigade commander on the morning of 1 July by a lieutenant of the 41st New York against Gilsa on the afternoon of 2 July (line 0111, a commander line for a different time).

OCR digit errors found against the scan:
- R013 return of casualties: corps wounded officers "180" (120) and missing enlisted "1,441" (1,448); Coster's wounded enlisted "880" (220); Smith's "873" (273); Schimmelfennig's "876" (276); Krzyzanowski's "86" (36) and "853" (352); Third Division "B6" (56), "688" (628); labels "184th New York" (134th), "65th Ohio" (55th), "158d" (153d), "sad Ohio" (82d), "fiftf.h Npw York" (58th), "I'lyth" (157th), "Tlieodore" style garbling in the headings; the labels of the 82d Illinois, 45th New York, 61st Ohio, 74th Pennsylvania, 27th and 73d Pennsylvania, 119th New York, 75th Pennsylvania and 26th Wisconsin are lost.
- R009 organization table: "37th Pennsylvania" (27th), "4oth New York" (45th), "26tli" (26th), "J53d" (153d), "Fme- auff" (Frueauff), "Botii" (Both), "KeUey" (Kelley), "Alien" (Allen), "Sal- IlUnois ... omon" (Salomon), "Mb-j." (Maj.), "Col." Mahler, "G«n.".
- R008 p. 153: the Eleventh Corps total aggregate "6,518" (5,513); p. 152: the July 20 officers figure is smeared (646, checked against the column total); the corps name of the 21 March circular is lost in OR-25-1 ("Teen. ame Corps").
- State volumes (no scan held): the 54th New York inscription dates ("UL YA2 1803: JuLty 3"); the 58th monument "MISSING 33" (3); the 45th monument "KILLED II" (11); the 136th New York "2^ officers" (an unreadable figure; only the 529 men are entered).

## Gaps

| field | units | what was searched | result | register proposal file |
|---|---|---|---|---|
| strength | 6 brigades | OR27-1 R243 to R263, R008, the state sections and volumes | not found (line 0255) | us-11c-01-strength |
| strength | 27th PA, 33d MA, 82d IL, 157th NY, 119th NY, 75th PA, 26th WI | the same, Fox, Ohio table | not found (line 0256) | us-11c-01-strength |
| arms (weapon) | 24 regiments | R243 to R263; the sections of the regiments; each designation in NY, PA, Fox, B&L, OH volumes | not found (line 0257) | us-11c-02-arms-dress |
| arms (bayonet, sidearm_sword) | all 26 regiments | the same | not found (lines 0258, 0259) | us-11c-02-arms-dress |
| dress (headgear, shirt, trousers, accoutrements, sash, flag_or_instrument) | all 26 regiments | the dress regex over the same | not found (lines 0260, 0262, 0263, 0265, 0266, 0268) | us-11c-02-arms-dress |
| dress (coat) | 25 regiments | the same | not found (line 0261) | us-11c-02-arms-dress |
| dress (shoes, pack_state) | 21 regiments each | the same | not found (lines 0264, 0267) | us-11c-02-arms-dress |

## Roster

- Units the record shows and the plan lacks (null lines, reported, never applied): the 1st Indiana Cavalry, Companies I and K (Capt. Abram Sharra; line 0003) and the 8th New York Infantry, one company (Lieut. Hermann Foerster; line 0004), both at corps headquarters.
- Commanders the table lacks: Colonel Noble (Second Brigade of the First Division from 4 July, line 0098), Major Benjamin Morgan (75th Ohio, per the Ohio commission, line 0112), Colonel W. H. Jacobs (26th Wisconsin, note of line 0109).
- No unit of the plan is absent from the table; the table's 27th Pennsylvania is misprinted "37th" in the OCR only.
- The Artillery Brigade (Osborn) belongs to `us-art-corps`; its table row (p. 165) and its return rows (p. 183: killed 1 + 6, wounded 3 + 50, missing 9, total 69) are included in the corps total only.

## For other groups

- `us-art-corps` (Osborn's artillery brigade, XI Corps): return rows of OR27-1-R013 p. 183: 1st New York Light Battery I 13 (killed 3, wounded 2 + 8), 13th New York Battery 11, 1st Ohio Battery I 13, 1st Ohio Battery K 15, 4th United States Battery G 17, total 1 + 6 killed, 3 + 50 wounded, 9 missing, 69 (the OCR keeps the figures but loses the labels of two rows; read from the scan). Field return of 4 July (p. 153): Artillery Brigade 10 officers, 484 men, 494 in all. Abstracts: R008 pp. 151 to 152 carry the XI Corps rows used here; the brigade is in the corps row.
- `us-12c`, `us-1c`, `us-2c-*`: `OH-DED-1887` (the Ohio memorials dedication, 1887) prints the number engaged and the aggregate loss for the Ohio commands: 4th Infantry 299 and 31, 5th 315 and 18, 7th 293 and 18, 8th 209 and 102, 29th 332 and 38, 66th 316 and 17; 1st Cavalry (two companies) 85 estimated, 6th Cavalry (ten companies) 370. The volume has no page model; the quotes are the row texts ("4th INFANTRY 299 31").
- `us-12c`, any group with New York regiments: the table "present for duty June 30 and carried into action" in New York at Gettysburg vol. 1 (NY1 front matter, running heads 103 to 104, after "the number officially reported by the regimental commandant as carried into action at Gettysburg") has the regiment names garbled in the OCR; the rows could not be matched to regiments without a scan.
- `us-1c`: PA-GB-1914-v2 section PA2-S036 holds the Adjutant General's letters for many Pennsylvania regiments (here the 27th, 73d and 153d); the letter of the 151st Pennsylvania says "21 officers and 446 men" at Gettysburg.

## Sources

`OR27-1` (R008 pp. 151 to 153, R009 pp. 164 to 165, R013 pp. 182 to 183, R243 to R263), `OR-25-1` (Hooker's circular of 21 March 1863), `NY-GB-1900`, `NY-GB-1900-v2`, `NY-GB-1902-v3` (sketches, inscriptions, dedication speeches of the New York regiments), `PA-GB-1914-v2` (Adjutant General letters), `PA-GB-1914a` (74th Pennsylvania), `OH-DED-1887` (the Ohio table, Morgan). New sources declared: none. Hosts contacted: none.

## Not done

No required pair is left open. What this pass did not do and why: strength of the six brigades and seven regiments (the record held is silent after the search; proposal kit-us-11c-01); the shoulder arms of 24 regiments, every bayonet and side arm and every dress field outside the lines listed (proposal kit-us-11c-02); officer lines from the lists of officers killed and mortally wounded (OR27-1-R013 pp. 188 to 192): the OCR of the lists pairs names with regiments out of order, so no officer line was written from them; the New York at Gettysburg table of 30 June against carried into action (labels garbled, no scan); Fox's regimental entries (not found by designation in the local text); the first-day casualties of the 41st New York in Einsiedel's report (the OCR scrambles the table: 15, 68, 3, 76 appear, which cannot be assigned to kinds); no register file under `register/` and no kit table was touched.
