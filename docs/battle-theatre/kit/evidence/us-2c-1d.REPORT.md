# Kit evidence report: us-2c-1d

Army of the Potomac, II Corps: corps headquarters and the 1st Division (Caldwell: Cross, Kelly, Zook, Brooke). 25 units of `groups.json` (1 corps, 1 division, 4 brigades, 18 regiments, the person-unit `us-hancock-acting`). Written 2026-11-13 by workstream `bt-oob-kit`. Evidence file: `us-2c-1d.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/us-2c-1d-01.md` to `-04.md`. Nothing outside the group's own files was written, no kit table or override was touched, no gate was run, no `passes` flag was set, nothing was deployed, no network host was contacted (every source is local).

How the file was made: a builder (kept in `tmp/kit-us-2c-1d/`: `build.py`, `kb.py`, `p1_table.py` to `p6_arms_gaps.py`) locates each quote in the local text through the evidence library, so offset, report id and printed page come from the tool and not from hand; the rows of the returns were read from the scanned pages (pp. 151-153, 157-159, 175-177, 188-191, 382-384, 386-390, 403, 405-406, 411) and checked by arithmetic. Every quote was also re-read from the raw source files with a separate matcher (`verify2.py`: 247 quotes, 245 identical, 2 differ only because the raw file has a running head inside the quote, which the library removes).

## Counts

`python -I tools/bt/kit_evidence_check.py us-2c-1d --require-complete` exits 0:
`us-2c-1d: 265 lines (256 evidence, 9 gap, 0 source); accepted 235 (documented 229, inferred 6); rejected 0; superseded 21; 0 errors, 27 warnings; coverage: 134 of 134 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active lines by field and tier (the 21 superseded lines are the table-only commander lines that a later line replaces with the same man plus an event):

| field | documented | inferred | note |
|---|---|---|---|
| roster | 26 | 0 | 25 units and the 6th New York Cavalry companies (unit the plan lacks) |
| commander | 49 | 0 | 21 more superseded; every unit has its commanders in order |
| officer | 43 | 0 | 24 killed or mortally wounded from the lists printed with the return; 18 staff officers named in the reports; Col. Kelly's reported wound (a volume) |
| strength | 39 | 3 | 3 inferred lines are sums of two printed figures or a remainder (never above `inferred`) |
| casualties | 50 | 0 | 28 rows of the return (`casualty_return`), 16 `report_statement`, 6 `state_volume` |
| arms | 8 | 2 | see Corrections; no weapon is promoted |
| dress | 5 | 1 | see Corrections |
| detachment | 8 | 0 | companies present (table), the 53d Pennsylvania's three companies at corps headquarters |
| ammunition | 1 | 0 | 63d New York, 60 rounds of buck and ball a man |

Strength lines by kind: `taken_into_action` 27, `estimate_in_report` 5, `present_for_duty` 4, `aggregate_present` 2, `effective_total` 1, `derived` 3 (inferred). Casualty rows of the return: every row of the group (18 regiments, 4 brigades, the division, the corps total on p. 177) plus the corps headquarters, the 6th New York Cavalry companies and the two brigade staff rows (unit_id null, reported and never applied). Each row's figures add to its printed aggregate and each brigade and the division add up from their parts (checked by hand, and by the checker for every row).

Warnings (27, all information): OFF_FIELD 10 (dated outside 26 June to 16 July 1863: the 1862 arms and boxwood statements, the 1864 breech-loaders, the 116th's march of June 1863 from 14 June), NUMBERS_WAIVED 7 (aggregate-only statements; the OCR splits "hundred"; sums of listed officers; the printed total of the 4 July return that does not add), NO_IDENTITY 5 (aggregate-present and similar abstract cells), OCR_CORRECTED 4 (the 2d Delaware table row and the 5th New Hampshire's strength: the OCR reads 3d and July 3, the scan 2d and July 2), PAGE_UNCHECKED 1 (Haskell's narrative has no page model).

## Corrections

What the PDF or the kit had, against what the record says. "kit now" is what `groups.json` prints for the unit (the PDF's value, tier in brackets).

| unit | field | kit now | evidence value | source, page | line |
|---|---|---|---|---|---|
| II Corps | strength | 11,216 (Stone Sentinels via the PDF; plausible-procedural share for every regiment) | about 10,000 in the action (estimate in Hancock's report); 13,056 present for duty 30 June (968 officers + 12,088 men, aggregate present 14,373; infantry present for duty equipped 11,436 men and 927 officers); 6,924 present for duty 4 July (the print does not add: 531 + 5,923 + 475 = 6,929); 8,245 on 10 July (aggregate 9,389) | OR27-1-R076 p. 375; R008 pp. 151-153 | 0138-0146 |
| II Corps | casualties | 4,358 | 4,369 in the return (66, 731 killed; 270, 2,924 wounded; 13, 365 missing); 4,323 in Hancock's report | R013 p. 177; R076 p. 375 | 0117, 0137 |
| II Corps | commander | Hancock (w); Gibbon; Hays | Hancock; Gibbon (took the corps 1 July when Hancock went to the front, and again on the afternoon of the 2d when Hancock was given the Third Corps); Hancock wounded on the 3d and handed the corps to Caldwell; Caldwell; Brig. Gen. William Hays assigned (the table's footnote breaks off at "com-"; the abstract of 10 July names the corps "(Hays)"). Caldwell is missing from the PDF. | R076 pp. 367-375, R009 p. 157, HASKELL-1908 | 0064-0068, 0265 |
| Maj. Gen. Hancock acting for Meade, 1 Jul | roster | "II Corps commander acting for Meade" | Hancock was ordered to the front shortly before 1 p.m. to take command of the First, Third and Eleventh Corps (the table: "all the troops on the field of battle") and decide whether to fight at Gettysburg; he arrived about 3 p.m. and handed the command to Slocum between 5 and 6 p.m. He commanded those corps, not the army. | R076 pp. 367-368; R009 p. 157 footnote | 0069-0070 |
| First Division | commander | Caldwell | Caldwell; Brooke commanding the division on the evening of 2 July (the 69th New York's report); Caldwell took the corps on the 3d | R085 p. 389; R076 p. 375 | 0071-0072 |
| First Brigade | commander | Cross | Cross (mortally wounded 2 July), then McKeen (81st Pennsylvania); McKeen gave the brigade to McFarlane on 18 July | R077 p. 380; R078 pp. 382-383 | 0073-0074 |
| Third Brigade | commander | Zook | Zook (mortally wounded 2 July); then Fraser (140th Pennsylvania, per the table and the 140th's adjutant) and Chapman (57th New York, per the 66th's report); the order is not stated | R090, R091 p. 398, PA-GB-1914-v2 | 0075-0077 |
| Fourth Brigade | commander | Brooke | Brooke, slightly wounded (his own words: severely bruised), stayed in command | R076 p. 369; R092 p. 401 | 0078 |
| 18 regiments | commander | none ("the plan gives no commander below the brigade") | the table names 30 commanders of the 18 regiments in order; the reports add who fell and who took over: 5th NH Hapgood, then Maj. R. E. Cross; 63d NY Bentley (wounded), Touhy; 69th NY Moroney (wounded), Lieut. Smith; 66th NY Morris and Hammell (wounded), Nelson; 140th PA Roberts (killed), Fraser; 27th CT Merwin (killed), Coburn; 64th NY Bingham (wounded), Bradley; 145th PA Brown (wounded), Reynolds (wounded), Oliver | R009 p. 157 and the reports | 0011-0063, 0079-0093 |
| 15 regiments, 3 brigades, division | strength | equal share of 11,216 each | figures from the reports and volumes, with conflicts (next section); First Brigade 780 muskets, Second Brigade 530 men taken into action; First Division 1,846 present for duty on 4 July | R078 p. 382; R082 p. 386; R008 p. 153 | 0147-0179 |
| 63d New York | arms | m1842_smoothbore (documented, weak source) | confirmed: "smooth-bore Springfield muskets, caliber .69" and 60 rounds of buck-and-ball cartridges a man, 2 July. The passage does not name the model year | R084 p. 388 | 0238 |
| 69th and 88th New York | arms | m1842_smoothbore (documented, weak source) | only inferred for July 1863: buck-and-ball muskets are stated for 1862, and the 63d, consolidated with them, had .69 smoothbores. The kit's "documented" is not supported by what was read | NY-GB-1900-v2 (88th's history); R084 | 0239-0243 |
| 28th Massachusetts | arms | p1853_enfield (documented, weak source) | not confirmed: no source read states the regiment's arms (no Massachusetts regimental volume in the library) | gap 0257 | |
| 116th Pennsylvania | arms | smoothbore_69_musket_unspecified (inferred, weak source; the catalog marks that id a placeholder) | not confirmed: no source read gives this regiment's arms. (Mulholland's "buck and ball" sentence is about the Confederates opposite) | gap 0256 | |
| 145th Pennsylvania | arms | default draw (plausible-procedural) | smooth-bore Harper's Ferry muskets issued in September 1862; nothing for July 1863 | PA-GB-1914-v2 | 0244 |
| 148th Pennsylvania | arms | default draw (plausible-procedural) | nothing for July 1863; Fox says one regiment of each division, the 148th for the division, was armed with breech-loading rifles in September 1864 (the pattern is not named) | FOX-1889 | 0247 |
| 53d Pennsylvania; 66th New York | arms (bayonet) | default (plausible-procedural) | 53d: bayonets fixed for the charge; 66th: advanced "without waiting to load or even fix bayonets" | R095 p. 411; R091 p. 398 | 0245-0246 |
| Irish Brigade (63d, 69th, 88th NY) | dress (headgear) | default draw (plausible-procedural; no headgear record of the unit's own) | boxwood sprigs in the hats are stated for Fredericksburg, December 1862 (catalog item kepi_irish_boxwood_sprig); no source dated July 1863 | NY-GB-1900-v2 | 0248-0250 |
| 116th Pennsylvania | dress (pack, accoutrements) | pack_state plausible-procedural, accoutrements inferred | knapsack, cartridge box, shelter tent and blanket, canteen, rations carried on the march of June 1863 | PA-GB-1914-v2 | 0251-0252 |
| 53d Pennsylvania | dress (badge) | empty | the red trefoil of the Second Corps, undated (inferred, not stated, for 2 July) | PA-GB-1904 | 0253 |

Differences between the report of a unit and the revised statement (the return, p. 175) are carried as two bases (`report_statement` beside `casualty_return`), not as conflicts: the reports themselves carry the editors' footnote "see revised statement". 63d New York 24 against 23; 64th New York 94 against 98; 53d Pennsylvania 79 against 80 (officers wounded 8 against 11); 52d New York 34 for the action of the 2d against 38; 2d Delaware 87 against 84; 145th Pennsylvania 89 against 90; 5th New Hampshire 79 against 80; 88th New York 28 in both with a different split; First Brigade 330 in both with a different split; Second Brigade 202 against 198; the corps 4,323 against 4,369. The 116th Pennsylvania's own volume says "thirty-seven killed and wounded" where the return has 22 in all: not entered as a line (the contract has no field for a combined figure); likewise the 140th's adjutant (14 officers and 227 men lost by official records = the return's 241).

## Conflicts

Each set is declared (`conflict: {key, alt}`) and no default is chosen. All are `taken_into_action` strength.

| key | alternatives (line, value, source) |
|---|---|
| `us-2c-1d-cross-5nh\|strength\|taken_into_action` | A 0150: 14 officers + 165 men = 179 (R079 p. 383); B 0151: 12 officers + 165 men = 177 (Fox sketch and table); C 0152: about 200 (an estimate by a New York speaker) |
| `us-2c-1d-cross-61ny\|...` | A 0153: 90 muskets (R080 p. 384); B 0154: 97 men (NY-GB-1900-v2); C 0155: 93 men (the same address, further on) |
| `us-2c-1d-cross-148pa\|...` | A 0157: 210 engaged (Fox table); B 0158: 400 "of actual strength" (PA-GB-1914-v2); C 0159: 300 or 400 (estimate, NY-GB-1900-v2) |
| `us-2c-1d-kelly-63ny\|...` | A 0161: 75 aggregate (R084); B 0162: 80 men in the two companies (NY-GB-1900-v2) |
| `us-2c-1d-kelly-116pa\|...` | A 0165: 142 officers and men (Mulholland, PA-GB-1914-v2); B 0166: 66 (inferred remainder of Kelly's 530 after the four regiments that report; the record does not say the 530 includes the 116th) |
| `us-2c-1d-zook-140pa\|...` | A 0168: 25 officers + 490 men = 515 (the adjutant's count, PA-GB-1914-v2); B 0169: 589 engaged (Fox) |
| `us-2c-1d-brooke-64ny\|...` | A 0170: 185 + 19 = 204 (Bradley, 17 July); B 0171: 203 + 19 = 222 (Bradley, 15 August); C 0172: 20 officers + 185 men = 205 (Fox); D 0173: 187 (NY-GB-1900-v2) |
| `us-2c-1d-brooke-145pa\|...` | A 0177: 228 (PA-GB-1914-v2); B 0178: "two hundred strong" (same section, another address); C 0179: 202 engaged (Fox) |

Other disagreements carried as plain lines or in notes: (1) who commanded the 148th Pennsylvania when the brigade went in: the table gives Lieut. Col. McFarlane (line 0024), McKeen's own report says he did (0081); two commander lines, neither chosen. (2) The order of Fraser and Chapman in the Third Brigade (0076, 0077). (3) Whether Kelly was wounded: one address says "Brooke and Kelly wounded" (line for Kelly in `officer`), Hancock names Zook, Cross and Brooke as the three of four brigade commanders disabled. (4) The 2d Delaware: the report says Capt. Christman commanded "in the action on July 3" (the scan prints 3) and puts the loss of Lieuts. Ottey and Plank in "the action of the 2d". (5) The list of officers killed names Lieut. Horatio F. Lewis of the 145th Pennsylvania; the return shows no officer of that regiment killed and nine wounded; Reynolds's report says one killed, eight wounded. (6) The printed 4 July corps total 6,924 does not equal the sum of its columns (6,929). (7) OCR digit errors found against the scan (the checker cannot see them): R079 "July 3" is "July 2"; R094 "July 3 and 3" is "July 2 and 3"; R093 "action of the 3d" is "the 2d"; the 63d's Lieut. Col. is "R. C. Bentley" where the OCR reads "E. C."; "E. Byrnes" is "R. Byrnes"; the table's "3d Delaware" is the 2d; "53d Infantry" in the list of officers killed (Venuti) is the 52d.

## Gaps

| line | field, units | searched | result | register |
|---|---|---|---|---|
| 0256 | arms (weapon): 5th NH, 61st NY, 81st and 148th PA, 28th MA, 116th PA, 52d, 57th, 66th NY, 140th PA, 27th CT, 2d DE, 64th NY, 53d and 145th PA | R076-R097 whole text for arms words (the only statement of arms is the 63d New York's); state-volume sections of the group's regiments; FOX-1889 sketches (only the 148th's September 1864 breech-loaders) | not_found | us-2c-1d-01 |
| 0257 | arms and dress: 5th NH, 28th MA, 27th CT, 2d DE | MA-BURIAL-1863 (0 hits), BL-3 (0 hits for the four regiments near arms or dress words), HASKELL-1908 | source_unavailable (no regimental or state volume for NH, MA, CT, DE in the library) | us-2c-1d-01 |
| 0258, 0259 | arms: bayonet and sidearm_sword, all regiments (bayonet except the 53d PA and 66th NY) | R076-R097 for bayonet, sword, revolver, pistol, saber; the volumes | not_found | us-2c-1d-01 |
| 0260 | dress, all other kit fields, 18 regiments | R076-R097 (the only clothing statement is the 64th New York "issued clothing to the men" on 16 July, garments not named); NY and PA sections; Fox | not_found | us-2c-1d-02 |
| 0261 | strength: 57th, 66th NY, 27th CT, 2d DE | the reports, NY1-S083, NY2-S006, Fox | not_found | us-2c-1d-03 |
| 0262 | strength: Third and Fourth Brigades | R077, R088, R092 | not_found | us-2c-1d-03 |
| 0263 | strength: First Division, men taken into action | R077, R076 (only present for duty, 4 July, is documented) | not_found | us-2c-1d-03 |
| 0264 | commander: First Division 3-4 July, Third Brigade order, 2d Delaware, 148th Pennsylvania | the reports and the table | not_found | us-2c-1d-04 |

## Roster

- **Unit the record shows and the plan lacks** (`unit_id` null, reported, never applied): the 6th New York Cavalry, Companies D and K, Capt. Riley Johnson, escort of Second Corps headquarters (roster 0254, commander 0255; its casualty row 0119); the corps headquarters staff (3 officers wounded, 0118); the First Brigade staff (1 officer wounded, 0120) and Third Brigade staff (1 officer killed, Zook, 0121).
- **Every unit of the plan is in the record.** The table prints the 63d, 69th and 88th New York and the 27th Connecticut as "(two companies)", the 116th Pennsylvania "(four companies)", the 145th Pennsylvania "(seven companies)" (detachment lines); the 53d Pennsylvania had seven companies with the brigade and three at corps headquarters (Capt. Mintzer).
- **Mislabelled:** `us-hancock-acting` ("II Corps commander acting for Meade") overstates his authority: see Corrections. The table calls the brigades First to Fourth and does not use the name Irish Brigade.
- Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-us-2c-1d-requests.md`.

## For other groups

I wrote no line for any of these; the owning group or the integrator does.
- `us-art-corps`: the Artillery Brigade (Capt. John G. Hazard) rows of the return, p. 177 (read from the scan; they add up): 1st New York Battery B 26, 1st Rhode Island A 32 and B 28, 1st US I 25, 4th US A 38, total 149 (killed 3 + 24, wounded 5 + 114, missing 3); strength 475 men on 4 July (R008 p. 153).
- `us-2c-2d3d`: the Second Division returns (Harrow's, Webb's, Hall's brigades and the sharpshooters) and the Third Division returns are on pp. 176-177 with totals 1,647 and 1,291; the 4 July return gives 170 officers and 1,807 men (1,977) and 209 and 2,422 (2,631); Haskell tells Meade that Harrow was the senior officer of the (Second) Division on the evening of the 3d (HASKELL-1908); the footnote of the table says Gibbon commanded the corps on 1 July and Hancock was put in command of the Third Corps on the 2d.
- `army-hq`: Hancock's staff and the corps officers (Morgan, Mitchell, Parker, Miller, Bingham, Brownson, Dougherty, Bull, Hall, Batchelder, J. S. Smith) are written as `officer` lines of `us-2c`.

## Sources

`OR27-1` (organization table R009 pp. 157-159; abstracts R008 pp. 151-153; return of casualties R013 pp. 175-177 and the lists of officers killed and mortally wounded pp. 188-191; reports R076-R097); `NY-GB-1900`, `NY-GB-1900-v2` (regimental histories and monument addresses of the 52d, 57th, 61st, 63d, 64th, 66th, 88th New York); `PA-GB-1904` (53d), `PA-GB-1914-v2` (116th, 140th, 145th, 148th); `FOX-1889` (sketches and the table of heaviest percentage killed); `HASKELL-1908`. Searched with no result: `PA-GB-1914a` (81st), `NY-GB-1902-v3` (monument descriptions only), `MA-BURIAL-1863`, `BL-3`, `CEM-REPORT-1867`, `MEADE-LL-v2`, `LETTERMAN-1866`. No new text was declared and no host was contacted. The page numbers of OR27-1 are the leaf map's; the scans are in `tmp/kit-plan/or27-pdf/`.

## Not done

Every required pair is evidenced or recorded as a gap, so no pair is left open. What was not done:
- The state volumes were searched by keyword and their Gettysburg passages read; the 81st Pennsylvania's two sections (PA1-S028, PA1B-S024) were searched but not read through, and the long NY sections were read where the keywords led.
- Scan pages viewed: pp. 151-153, 157-159, 175-177, 188-191, 382-384, 386-390, 403, 405-406, 411. Quotes with numerals on other pages (R081 p. 385, R087 p. 393, R089 p. 396, R096 p. 414, R090-R092, R095 p. 410) were matched in the OCR text and, where a return exists, agree with it, but their pages were not viewed: the OCR misreads 2 and 3 on this scan.
- Abstract rows for 10 and 20 June and 20 and 31 July and the 14 July field return (II Corps 575 officers and 6,973 men infantry, aggregate 8,305) were not entered.
- Casualty statements of the state volumes that give only a combined or a rank split ("thirty-seven killed and wounded", the 140th's 14 officers and 227 men) are in notes, not lines.
- The integrator's commands (`kit_overrides.py compile`, `kit_verified.py build`, `build_kit_data.py`) were not run; neither was the full node suite. Owed to the integrator: the verified tables will show the eight conflict sets as alternatives; the compile applies only the 63d New York's arms line.
