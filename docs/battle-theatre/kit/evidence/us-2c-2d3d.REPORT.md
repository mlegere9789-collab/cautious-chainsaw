# Kit evidence report: us-2c-2d3d

Army of the Potomac, II Corps: the 2nd Division (Gibbon, then Harrow: Harrow's, Webb's and Hall's brigades) and the 3rd Division (Alexander Hays: Carroll's, Smyth's and Willard's brigades). 36 units of `groups.json`: 2 divisions, 6 brigades, 25 regiments, 1 battalion (10th New York), 1 company (1st Company Massachusetts Sharpshooters) and the kit-only record of the 2d Company Minnesota Sharpshooters (Company L, 1st Minnesota). Workstream `bt-oob-kit`. First pass 2026-11-13 (lines 0001-0437, found interrupted on 2026-11-16 and continued); second pass 2026-11-16 (lines 0438-0547). Evidence file: `us-2c-2d3d.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/us-2c-2d3d-01.md` to `-04.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-us-2c-2d3d-library.md`, `-roster.md` and `-catalog.md`. Besides these files, the scratch directory `tmp/kit-us-2c-2d3d/` and its dated lines in `GOVERNANCE/progress.md`, nothing was written: no kit table or override was touched, no gate was run, no `passes` flag was set, nothing was deployed.

## How the file was made

A builder in `tmp/kit-us-2c-2d3d/` (first pass `kb.py`, `p0_sources.py` to `p8_new.py`; second pass `kb2.py`, `p9_a.py` to `p9_j.py`) locates each quote in the text through the evidence library, so the offset, the report id and (for the Official Records and the state volumes) the printed page come from the tool and not from hand. On 2026-11-16 the builder of the first pass reproduced the 437 lines; the quotes of the five dress lines of the 72d Pennsylvania (0392-0396) anchor differently in the builder than in the earlier draft file (the builder's version validates), and the note of the 20th Massachusetts arms line (0354) was reworded because the copy audit rejected a word of it. The 437 lines are otherwise unchanged; every later correction is a new line with `supersedes`, and the second pass appended lines 0438 to 0547.

The second pass closed the 32 (unit, field) pairs that the first pass had left open (168 of 200 became 200 of 200) with new lines and gap lines, then read the texts on disk a second time with two sweeps (a window of 200 to 450 characters round every designation of every unit; casualty statements over 35 texts, strength statements over 33, the reports of the group read separately). The second look found what the first had missed: the casualty tables printed inside the reports (Smyth, Darrow, Hesser, Carpenter, Ellis, Hill) and the division commanders' own totals (Gibbon, Harrow, Hays); the War Department's returns of 30 June 1863 for four Pennsylvania regiments (Pennsylvania at Gettysburg vol. 2); Fox's figures for Harrow's brigade; the 1st Minnesota's four casualty counts; and the strength tables of New York at Gettysburg vol. 1 (pp. 103-104). Pages read from the scans: the Return of Casualties (R013 pp. 175-177), the field return of 4 July (R008 p. 153), the tables in R103 p. 426, R107 p. 433, R119 p. 461, R123 p. 466, R124 p. 468 and R126 p. 471, the Pennsylvania commission's table (vol. 1, printed pp. 172-173) and New York at Gettysburg vol. 1 pp. 103-104. The OCR digits that the scans corrected are named in the notes of the lines (for example 362 for 352 in Smyth's total, 233 for 232 in Darrow's, 328 for 329 for the 69th Pennsylvania, 62 for 52 in Ellis's).

Every quote was searched again in the raw source files with a separate matcher (`tmp/kit-us-2c-2d3d/verify3.py`, which does not use the evidence library): 513 quotes; 430 found as written after folding typographic quotes and dashes; 27 `ocr_corrected` and 52 `image_row` labels that it does not re-read; 4 that it does not find: lines 0323 and 0324 (Bruce prints "thirty- one" over a line end; the library joins it, warning `HYPHEN`), line 0334 (the quote runs over a running head that the page model removes) and line 0438 (superseded by 0515: the OCR's "Seventyfirst" had been spelled with a hyphen).

## Counts

`python -I tools/bt/kit_evidence_check.py us-2c-2d3d --require-complete` exits 0:

`us-2c-2d3d: 547 lines (515 evidence, 15 gap, 17 source); accepted 465 (documented 433, inferred 32); rejected 0; superseded 50; 0 errors, 266 warnings; coverage: 200 of 200 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

The 50 superseded lines are: 40 commander lines (39 that held the table's name alone, replaced by the same man with what the reports say happened to him; 1 for Morris, line 0326, replaced by 0516); the first pass's inferred coat of the 72d Pennsylvania (0378 by 0397), arms of the 14th Connecticut (0348 by 0463, with its conflict marker) and of the 10th New York (0421 by 0514, given a date), badge of the 8th Ohio (0368 by 0465, dated to 1864), the 71st Pennsylvania's Fox line (0438 by 0515); the four Pennsylvania table lines read from the scan (0439-0442 by 0532-0535: the letters of the Adjutant General's Office give the kind and the date); and the derived sum for Harrow's brigade (0494 by 0538: its note said that no source states the brigade's strength).

Active lines by field and tier:

| field | documented | inferred | note |
|---|---|---|---|
| roster | 39 | 0 | 36 units and the Pioneer Corps (a unit the plan lacks); the organization table |
| commander | 62 | 0 | every unit has its commanders in order; 42 of the 62 lines carry an event (killed, wounded, relieved, assumed command) |
| officer | 72 | 0 | 72 officers named: 61 from the lists of officers killed or mortally wounded (R013 pp. 188-192), 11 from the reports |
| strength | 65 | 1 | kinds below |
| casualties | 98 | 0 | by basis below |
| arms | 39 | 4 | weapon 34, bayonet 8, sidearm_sword 1 |
| dress | 44 | 27 | badge 34, coat 13, trousers 7, headgear 7, flag_or_instrument 4, shoes 3, shirt 2, accoutrements 1 |
| detachment | 8 | 0 |  |
| ammunition | 6 | 0 |  |

Strength lines by kind (66 active): `taken_into_action` 30, `present_for_duty` 24, `estimate_in_report` 7, `muster_or_roll` 2, `aggregate_present` 2, `derived` 1. Casualty lines by basis (98 active): `casualty_return` 37, `state_volume` 33, `report_statement` 27, `corrected_return` 1.

Warnings (266, all information): `PAGE_UNCHECKED` 146, `OFF_FIELD` 67, `OCR_CORRECTED` 27, `LONG_QUOTE` 10, `NUMBERS_WAIVED` 8, `PAGE_RANGE` 4, `HYPHEN` 3, `NO_IDENTITY` 1. `OFF_FIELD` are dated outside 26 June to 16 July 1863 (the 1861-62 arms and dress, the 1864 badge, the strengths of 3 and 31 May); `NO_IDENTITY` is the 72d Pennsylvania's table row that was replaced (its losses add to 204 where the print says 197); `PAGE_RANGE` and `PAGE_UNCHECKED` are volumes whose page model gives a range or no page.

`python -I tools/bt/kit_overrides.py compile --dry-run --group us-2c-2d3d` (writes nothing): 35 operations, 57 lines not applied (36 routed to the verified tables by design, 21 for review). The review items are the integration's: badge lines that differ from a kit badge cell resting on an inference (1st Minnesota, 72d and 106th Pennsylvania, Company L), the division badge lines (no rule creates a record for a division), the 69th Pennsylvania's badge lines of two dates, items with no catalog id (see the catalog request) and the conflict sets.

## Corrections

What the PDF or the kit had, against what the record says. "kit now" is what `groups.json` prints for the unit (the PDF's value, with the tier in brackets: P plausible-procedural, I inferred, D* documented on a weak source, I* inferred on the unit's own record, E empty). Line ids are the last four digits of `us-2c-2d3d:NNNN`; a range names lines of consecutive ids.

| unit | field | kit now | evidence value | source, page | lines |
|---|---|---|---|---|---|
| Second Division | commander | Gibbon; Harrow (I) | Gibbon, wounded late in the repulse of 3 July ("I was wounded and left the field"), then Harrow, who signs the division's report of 16 July as commanding it. Gibbon had the Second Corps twice by his own account ("first at Taneytown, and again during the battle of the 2d, when General Hancock was ordered to take command of the Third Corps"), the second time until 1 o'clock on 3 July, "General Hancock having resumed command of the corps, I returned to my division". Who held the division in those intervals is not stated | R098 pp. 416-418; R099 pp. 419-421 | 0016-0017, 0187-0188; gap 0517 |
| First Brigade, Second Division | commander | Harrow (I) | Harrow, then Col. Francis E. Heath (the table prints both, Heath second). Joslin writes that Col. Ward, "who had been in command of the brigade, was here relieved" at about 4 p.m. on 2 July and took the 15th Massachusetts; Harrow calls the First Brigade "my own command". The record read does not say who had the brigade when | R009 p. 158; R101 p. 423; R099 p. 419 | 0019-0020, 0189; gap 0517 |
| Second Brigade, Second Division | commander | Webb (I) | Brig. Gen. Alexander S. Webb, who "took command at 5 p. m." on 28 June | R104 p. 429 | 0035, 0198 |
| Third Brigade, Second Division | commander | Hall (I) | Col. Norman J. Hall (7th Michigan), the only name the table gives; no change of command is recorded for him | R009 p. 158 | 0047 |
| Second Brigade, Third Division | commander | Smyth (I) | Smyth, who "having received a wound" in the cannonade of 3 July "was obliged to quit the field, and surrendered the command to Lieut. Col. Francis E. Pierce" (108th New York); Col. Dwight Morris (14th Connecticut) "had returned and assumed command of the brigade, in place of Colonel Smyth" by the afternoon of 5 July (the first reading dated it 3 July, from Seville: line 0326, replaced) | R123 p. 465; Page; Seville | 0212-0213, 0326, 0516 |
| Third Brigade, Third Division | commander | Willard (I) | Willard (killed on the evening of 2 July), then Col. Eliakim Sherrill (126th New York; killed about 4 p.m. on 3 July), then Lieut. Col. James M. Bull (126th New York), who signs the report of 8 July as commanding the brigade | R128 pp. 472-473 | 0218-0220, 0225-0226 |
| regiments, battalion, companies | commander | none: "the plan gives no commander below the brigade" (E) | every unit has its commanders in order (62 active lines: 19 from the organization table alone, 43 from reports, signatures and state volumes) and 42 lines carry an event: 15th Massachusetts Ward (mortally wounded 2 July; Gibbon and Hancock write killed), Joslin; 1st Minnesota Colvill (wounded 2d), Messick (killed 3d), Coates; 19th Maine Heath (wounded 3d), Cunningham; 20th Massachusetts Revere (mortally wounded 2d), Macy (wounded 3d), Abbott; 7th Michigan Steele (killed 3d), Curtis; 69th Pennsylvania O'Kane (killed 3d), Davis; 72d Pennsylvania Baxter (wounded 3d), Hesser; 82d New York Huston (killed 2d in Darrow's report; Harrow writes mortally wounded), Darrow; 59th New York Thoman (wounded 2d; Gibbon, Hall and Hancock write killed), McFadden; 1st Delaware Harris (arrested by Hancock on 2 July, restored on the morning of the 4th), Hizar (wounded 2d), William Smith (killed 3d), Dent; 111th New York MacDougall (wounded 3d), Lusk (thrown from his horse), Seeley; 8th Ohio Sawyer (wounded 3d: a ball pierced his corps badge); 7th West Virginia Lockwood (wounded, the day not stated); 39th New York Hildebrandt (severely wounded); 126th New York Sherrill (killed 3d), Bull; Company L Captain Russell, then Captain Berger | R009 pp. 158-159; R098-R131; ME-GB-1898; OH-8TH-1889; MN-1ST-1916 | 0021-0106, 0187-0226, 0329-0330, 0516 |
| Second and Third Divisions | strength | none printed (E) | Second Division: 4,331 present for duty on 30 June (309 officers and 4,022 men); about 3,800 "went into action" (Gibbon) or 3,773 (Harrow); 1,977 present for duty on 4 July (170 officers and 1,807 men). Third Division: 2,631 present for duty on 4 July (209 officers and 2,422 men); no figure for the Third Division in the action was found | NY-GB-1900 p. 104; R098 p. 418; R099 p. 421; R008 p. 153 | 0546, 0146-0149 |
| brigades | strength | none printed (E) | Harrow: 1,246 officers and men taken into action by the four regiments (Fox), beside the inferred sum 1,201 to 1,374; Webb: "about eight hundred men in line" on 3 July (monument address, PA-GB-1914a p. 557); Willard: "about two thousand" (Simons); Hall, Carroll and Smyth: none (gap 0495) | FOX-1889; PA-GB-1914a; Simons; derived | 0536, 0538, 0150, 0436; gap 0495 |
| regiments, battalion, companies | strength | no figure of its own: an equal share of 11,216 (P) | the figures with their kind and date, in the table below: 20 regiments, the 10th New York Battalion and Company L have one or more; no figure for the 42d New York, 14th Indiana, 7th West Virginia, 1st Delaware, 125th New York and the 1st Company Massachusetts Sharpshooters (gap 0496). Where the record gives several figures they are carried as alternatives (conflicts below); the four Pennsylvania regiments' June 30 returns "present for duty" (329, 331, 458, 335) are the figures of the "Present" column of the Pennsylvania commission's table | reports; FOX-1889; state volumes; PA-GB-1914-v2; NY-GB-1900; NJ-TOOMBS-1888; Kepler | 0151-0186, 0323, 0325, 0384, 0387, 0403-0404, 0431, 0443-0447, 0457, 0515, 0532-0535, 0544-0545, 0547 |
| every unit | casualties | none (E) | the revised Return of Casualties for the two divisions (1,647 and 1,291), six brigades and 27 regiments, battalion and company, with two staff rows that belong to no unit; the figures of the reports (the division commanders' totals and the tables printed in the reports of Smyth, Darrow, Hesser, Carpenter, Ellis, Hill, Sawyer and others), Fox, Walker and the state volumes, each with its basis, in the table below. The differences between the sources are real: the Second Division 1,647 (return), 1,657 (Harrow), "over 1,600 killed and wounded" (Gibbon), 1,634 (Walker); the Third Division 1,291 (return and Walker), 1,385 (Hays); Smyth's brigade 366 (return) and 352 (Smyth's own table); the 82d New York 192 (return) and 232 (Darrow's table, with 37 men "buried by regimental detail"); the 1st Minnesota 224, 232, 237 and 245 | R013 pp. 175-177; R098-R131; FOX-1889; Walker p. 301; state volumes | 0109-0145, 0299-0322, 0324, 0385-0386, 0388, 0450-0456, 0462, 0493, 0510-0513, 0518-0531, 0537, 0539-0543 |
| 20th Massachusetts | arms | default draw (P) | Enfield rifles, taken in the autumn of 1861 in exchange for the old smooth-bore muskets and "carried for the remainder of the war" (documented for 2-3 July) | Bruce (1906) | 0354 |
| 4th Ohio | arms | default draw (P) | smooth-bore muskets "on going into the fight", exchanged for good Springfield rifles captured from the enemy (Carpenter); Kepler: in 1861 Springfield muskets of caliber .69 with buck and ball for eight companies and Enfield rifles for the flank companies C and F; in 1863 the eight companies "that had thus far been armed with Springfield muskets" exchanged them on 4 July for Springfield rifles gathered on the field | R119 p. 460; Kepler | 0344-0345, 0459-0461 |
| 12th New Jersey | arms | m1842_smoothbore (D*) | smooth-bore, not contradicted: "armed with smooth-bore Springfields, carrying buck and ball" (Seville) and "smooth-bore muskets" (Potter); the fire of "buck and ball" in Smyth's report. Neither passage states the model year (1842) or the calibre | R123 p. 465; Seville; Potter | 0346-0347 |
| 14th Connecticut | arms | default draw (P) | Sharp's rifles, as two alternatives for 3 July: Hincks firing two Sharp's rifles of wounded men (A) against Rodenbough's "armed with Sharp's breech-loading rifles" for the regiment (B), both quoted by Page; Page for August 1862: Springfield rifles, Sharp's for Companies A and B | Page (1906) | 0348-0349, 0463-0464 |
| 1st Minnesota | arms | m1861_springfield (I*) | not confirmed: for April to June 1861 the history names Springfield rifled muskets, Mississippi rifles of .54 with sword bayonets and a .69 musket; nothing for July 1863 states the model "1861" | MN-1ST-1916 | 0353 |
| 1st Company Massachusetts Sharpshooters | arms | sharps; merrill carbine; scoped rifle (D*) | heavy telescopic rifles (September 1861); Sharp's rifles (October 1862); nothing for July 1863 | Ford (1898) | 0417-0418 |
| 10th New York Battalion | arms | default draw (P) | altered Springfield muskets of the model of 1842 (May-June 1861); "the Springfield rifled musket" in the months after Big Bethel (the first reading left this undated, which the rules would have applied to July 1863: dated by line 0514) | Cowtan (1882) | 0420, 0514 |
| every unit | dress (badge) | E for most | the Second Corps trefoil, white for the Second Division and blue for the Third (Ward 1906): documented for the two divisions and for the 19th Maine, 69th and 71st Pennsylvania, 4th Ohio (Kepler: "to our division, the Third, was assigned the blue treefoil", worn on the cap), 12th New Jersey (Toombs prints "Twelfth New Jersey, Second Division: Blue"; blue is the Third Division's colour), 111th New York (the dedication address: "you bore the Trefoil to victory at Gettysburg", colour not stated) and 8th Ohio (the trefoil on the front of Sawyer's hat, colour not stated); inferred from the division for 23 units | Ward; Kepler; Banes; McDermott; Smith; Toombs; OH-8TH-1889; NY-GB-1900-v2 | 0367, 0372, 0374, 0390-0391, 0402, 0406-0409, 0458, 0466-0486, 0492 |
| 8th Ohio | dress (badge) | E | Sawyer's "that of our division, the Second, a white trefoil" is the badge after the reorganization of March 1864 (in July 1863 the regiment was in the Third Division, blue: Kepler says the brigade changed from the blue trefoil to the white in 1864); the first reading dated it March 1863 (line 0368, replaced by 0465); blue is inferred for July 1863 (0466) | OH-8TH-1889; Sawyer (1881); Kepler | 0367-0368, 0465-0466 |
| 39th New York | dress | headgear P*; badge I* | Garibaldi hat with a black plume, uniform of dark blue cloth and black leather leggings (1861; whether they survived to July 1863 is not stated) | NY-GB-1900 p. 283 | 0375-0377 |
| 72d Pennsylvania | dress | badge I* | Zouave uniform of 1861 (cut-away jacket, bright shirt, light-blue pants cut wide with red stripes, white leggings, regulation cap); Banes says it was discarded for the regulation dress "after a few months' experience", so no Zouave coat in July 1863 is supported (the first reading's inferred coat 0378 is replaced by 0397) | Banes (1876) | 0392-0397 |
| 19th Maine, 1st Minnesota, 69th Pennsylvania, 126th New York | dress (flag) | P | the original regimental colors and the national flag carried in every engagement (19th Maine, told of 1865); a new flag from the ladies of Minnesota, April 1863 (1st Minnesota); a green flag on 2 July (69th Pennsylvania); colors received from the Government after the regiment's exchange, first borne at Gettysburg (126th New York) | Smith; MN-1ST-1916; McDermott; Willson | 0488-0491 |

The kit's other cells (shirt, shoes, sash and pack state of every unit, headgear and coat of most) have no statement for July 1863 and keep their tier; see the gaps.

## Strength figures by unit

Every active strength line, with its kind and, when it is not of the days of the battle, its date; `[A]` and the like mark the alternatives of a conflict set; the line id is in brackets. "into action" is a figure the source calls taken into or engaged in the action; "present for duty" is a return; "roll" is a figure the source gives as the regiment's number or muster (the Maine volume's "numbered", the 72d Pennsylvania's address); "estimate" is "about"; "sum" is a derived line. The kinds differ in what they count (officers and men or men only, the day, the companies): none is chosen here.

| unit | figures |
|---|---|
| 2nd Div Gibbon/Harrow | 4,331 present for duty 30 Jun New York at Gettysburg v1 (0546); 3,800 estimate OR27-1 R098 p. 418 (0146); 3,773 into action OR27-1 R099 p. 421 (0147); 1,977 present for duty OR27-1 R008 p. 153 (0148) |
| Harrow | 1,246 into action Fox (0536); 1,201-1,374 sum (0538) |
| 19th ME | 405 roll [A] Maine at Gettysburg (0151); 440 into action [B] Fox (0152); 400 estimate [C] Smith (0431) |
| 15th MA | 239 into action OR27-1 R101 p. 423 (0153); 239 into action Fox (0154) |
| 1st MN | 342 present for duty 31 May First Minnesota history (0159); 385 present for duty 30 Jun First Minnesota history (0158); 262 into action [A] First Minnesota history (0155); 330 estimate [B] First Minnesota history (0156); 262 into action [C] Fox (0157); 140 estimate First Minnesota history (0160); 144 present for duty 31 Jul First Minnesota history (0161) |
| 82nd NY | 355 present for duty 30 Jun New York at Gettysburg v2 (0162); 305 into action [A] New York at Gettysburg v2 (0163); 300 into action [B] New York at Gettysburg v2 (0164); 365 into action [C] Fox (0165) |
| Webb | 800 estimate Pennsylvania at Gettysburg 1914 v1 (0150) |
| 69th PA | 329 present for duty 30 Jun Pennsylvania at Gettysburg 1914 v2 (0532); 258 into action Pennsylvania at Gettysburg 1904 (0166); 258 into action McDermott (0387); 258 into action Banes (0384) |
| 71st PA | 331 present for duty 30 Jun Pennsylvania at Gettysburg 1914 v2 (0533); 421 into action Fox (0515) |
| 72nd PA | 458 present for duty 30 Jun Pennsylvania at Gettysburg 1914 v2 (0534); 458 roll Pennsylvania at Gettysburg 1904 (0167) |
| 106th PA | 335 present for duty 30 Jun Pennsylvania at Gettysburg 1914 v2 (0535); 343 present for duty Ward (0403); 300 estimate Ward (0404) |
| Hall | none (gap 0495) |
| 19th MA | 141 into action Fox (0168) |
| 20th MA | 243 into action Bruce (0323) |
| 7th MI | 238 present for duty 30 Jun New York at Gettysburg v1 (0544); 165 into action OR27-1 R112 p. 449 (0169); 165 into action Fox (0170); 165 present for duty Michigan at Gettysburg (0171) |
| 42nd NY | none (gap 0496) |
| 59th NY | 120 into action New York at Gettysburg v1 (0172) |
| 1st Co. Massachusetts Sharpshooters | none (gap 0496) |
| 3rd Div A. Hays | 2,631 present for duty OR27-1 R008 p. 153 (0149) |
| Carroll | none (gap 0495) |
| 14th IN | none (gap 0496) |
| 4th OH | 316 present for duty Kepler (0457); 299 into action OR27-1 R119 p. 460 (0173) |
| 8th OH | 209 present for duty Sawyer (0325); 209 present for duty Fox (0174) |
| 7th WV | none (gap 0496) |
| Smyth | none (gap 0495) |
| 14th CT | 219 into action 3 May Page (0547); 160 into action OR27-1 R124 p. 468 (0175) |
| 1st DE | none (gap 0496) |
| 12th NJ | 532 present for duty 30 Jun Toombs (0443); 596 aggregate present 30 Jun Toombs (0444); 401 present for duty 13 Jul Toombs (0445); 463 aggregate present 13 Jul Toombs (0446) |
| 10th NY Bn | 100 present for duty 3 May New York at Gettysburg v1 (0176) |
| 108th NY | 200 into action New York at Gettysburg v2 (0177); 200 into action New York at Gettysburg v2 (0447) |
| Willard | 2,000 estimate Simons (0436) |
| 39th NY | 322 present for duty New York at Gettysburg v1 (0178); 300 into action New York at Gettysburg v1 (0179) |
| 111th NY | 475 present for duty 30 Jun New York at Gettysburg v1 (0545); 390 present for duty New York at Gettysburg v2 (0184); 390 into action [A] OR27-1 R129 p. 475 (0180); 400 into action [B] OR27-1 R130 p. 476 (0181); 350 into action [C] New York at Gettysburg v2 (0182); 390 into action [D] Fox (0183) |
| 125th NY | none (gap 0496) |
| 126th NY | 455 into action New York at Gettysburg v2 (0185) |
| Minnesota Company L (sharpshooter detachment attached to the 1st Minnesota) | 31 present for duty 31 May First Minnesota history (0186) |

## Casualty figures by unit

Every active casualty line: the total as the line gives it (killed, wounded and missing together unless the cell says "killed and wounded" or "(parts)", the sum of the parts the source states), the source, and the line id. The return is the revised Return of Casualties (OR27-1-R013 pp. 175-177, the days 1 to 4 July; its footnote says it includes the losses in the skirmishes of 4 July); the other figures are of 2 and 3 July unless a day is named. A figure of one day or of the killed and wounded only is not a rival of the return's: it is a different quantity.

| unit | return | reports (OR27-1 and the regiments' own tables) | volumes, Fox, Walker, histories |
|---|---|---|---|
| 2nd Div Gibbon/Harrow | 1,647 (0109) | 1,600 killed and wounded [A] OR27-1 R098 p. 418 (0518); 1,657 [B] OR27-1 R099 p. 421 (0519) | 1,634 Walker (0450) |
| Harrow | 768 (0111) | 722 OR27-1 R099 p. 421 (0308) | 764 Walker (0452); 763 Fox (0537) |
| 19th ME | 203 (0113) |  | 206 [A] Maine at Gettysburg (0310); 213 [B] Maine at Gettysburg (0311); 215 [C] Maine at Gettysburg (0312); 199 [D] Fox (0313) |
| 15th MA | 148 (0114) | 143 OR27-1 R101 p. 423 (0299) |  |
| 1st MN | 224 (0115) |  | 224 [A] Fox (0539); 232 [B] First Minnesota history (0540); 245 [C] First Minnesota history (0541); 237 [D] First Minnesota history (0542); 215 killed and wounded 2 Jul Fox (0543) |
| 82nd NY | 192 (0116) | 153 killed and wounded 2 Jul OR27-1 R103 p. 426 (0510); 69 killed and wounded 3 Jul OR27-1 R103 p. 426 (0511); 232 OR27-1 R103 p. 426 (0526) | 192 New York at Gettysburg v2 (0309) |
| Webb | 491 (0117) | 525 OR27-1 R104 p. 428 (0513) | 482 Walker (0454) |
| 69th PA | 137 (0118) |  | 143 [A] Banes (0385); 135 (parts) [B] McDermott (0386) |
| 71st PA | 98 (0119) | 100 OR27-1 R106 p. 432 (0307) |  |
| 72nd PA | 192 (0120) | 197 OR27-1 R107 p. 433 (0527) | 192 (parts) Banes (0388) |
| 106th PA | 64 (0121) |  |  |
| Hall | 377 (0122) | 150 killed and wounded 2 Jul OR27-1 R109 p. 437 (0512) |  |
| 19th MA | 77 (0123) |  | 77 Fox (0315) |
| 20th MA | 127 (0124) |  | 127 [A] Fox (0314); 127 [B] Bruce (0324) |
| 7th MI | 65 (0125) | 65 OR27-1 R112 p. 450 (0301) |  |
| 42nd NY | 74 (0126) | 74 OR27-1 R113 p. 452 (0300) | 74 (parts) New York at Gettysburg v1 (0455) |
| 59th NY | 34 (0127) | 15 2 Jul OR27-1 R114 p. 452 (0305); 18 3 Jul OR27-1 R114 p. 452 (0306) |  |
| 1st Co. Massachusetts Sharpshooters | 8 (0128) |  |  |
| 3rd Div A. Hays | 1,291 (0129) | 1,385 OR27-1 R115 p. 455 (0520) | 1,291 Walker (0451) |
| Carroll | 211 (0130) |  |  |
| 14th IN | 31 (0131) |  |  |
| 4th OH | 31 (0132) | 30 OR27-1 R119 p. 461 (0528) | 32 (parts) Kepler (0462) |
| 8th OH | 102 (0133) | 102 OR27-1 R120 p. 462 (0529) | 102 Fox (0321) |
| 7th WV | 47 (0134) | 61 OR27-1 R122 p. 464 (0302) | 47 Fox (0322) |
| Smyth | 366 (0135) | 352 OR27-1 R123 p. 466 (0525) |  |
| 14th CT | 66 (0136) | 66 OR27-1 R124 p. 468 (0524) corrected return | 66 Fox (0316) |
| 1st DE | 77 (0137) | 32 2 Jul OR27-1 R125 p. 469 (0304); 63 OR27-1 R123 p. 466 (0521) | 77 Fox (0320) |
| 12th NJ | 115 (0138) | 113 OR27-1 R126 p. 471 (0523) | 115 Fox (0317) |
| 10th NY Bn | 6 (0139) | 6 OR27-1 R127 p. 471 (0303) |  |
| 108th NY | 102 (0140) | 102 OR27-1 R123 p. 466 (0522) | 102 (parts) New York at Gettysburg v2 (0456) |
| Willard | 714 (0141) |  | 714 Walker (0453) |
| 39th NY | 95 (0142) | 28 killed and wounded 2 Jul OR27-1 R128 p. 472 (0531) |  |
| 111th NY | 249 (0143) | 185 killed and wounded 2 Jul OR27-1 R129 p. 475 (0530) | 249 Fox (0318) |
| 125th NY | 139 (0144) |  | 139 Fox (0319) |
| 126th NY | 231 (0145) |  |  |
| Minnesota Company L (sharpshooter detachment attached to the 1st Minnesota) |  |  | 1 (parts) First Minnesota history (0493) |
| staff row (division staff, brigade staff) | 3 (0110); 1 (0112) |  |  |

## Conflicts

10 sets are declared (`conflict: {key, alt}`), and no default is chosen. The alternatives of a set are lines of one unit, field and kind that state different values of the same quantity; the compile leaves them for review.

| key | what it is | alternatives (line, value, source) |
|---|---|---|
| `us-2c-2d-harrow-19me\|strength\|battle` | the 19th Maine: 405 "numbered" (the Maine volume's own page says that Fox's 440 makes the regiment "stronger by 86 than the statement of its officers"), 440 "present, all told" (Fox), about 400 "in line of battle" (Smith) | A 0151: 405 (Maine at Gettysburg); B 0152: 440 (Fox); C 0431: 400 (Smith) |
| `us-2c-2d-harrow-1mn\|strength\|taken_into_action` | the 1st Minnesota: 262 for the eight companies that made the charge (the regiment's history and Fox) against "less than 330" engaged (Coates) | A 0155: 262 (First Minnesota history); B 0156: 330 (First Minnesota history); C 0157: 262 (Fox) |
| `us-2c-2d-harrow-82ny\|strength\|taken_into_action` | the 82d New York: 305 and 300 (New York at Gettysburg v2) against 365 (Fox) | A 0163: 305 (New York at Gettysburg v2); B 0164: 300 (New York at Gettysburg v2); C 0165: 365 (Fox) |
| `us-2c-3d-willard-111ny\|strength\|taken_into_action` | the 111th New York: about 390 (MacDougall), about 400 rank and file (Seeley), 350 (the regiment's address), 390 (Fox) | A 0180: 390 (OR27-1 R129 p. 475); B 0181: 400 (OR27-1 R130 p. 476); C 0182: 350 (New York at Gettysburg v2); D 0183: 390 (Fox) |
| `us-2c-2d-harrow-19me\|casualties\|state_volume` | the 19th Maine's loss as the Maine volume prints it three ways (the text 206; as returned before the results of the wounds were known 213; its roster table 215) and as Fox prints it (199); the revised return has 203 | A 0310: 206 (Maine at Gettysburg); B 0311: 213 (Maine at Gettysburg); C 0312: 215 (Maine at Gettysburg); D 0313: 199 (Fox) |
| `us-2c-2d-hall-20ma\|casualties\|state_volume` | the 20th Massachusetts: Fox 30 killed, 94 wounded; Bruce 31 and 93 (both 3 missing: 127, the return's total) | A 0314: 127 (Fox); B 0324: 127 (Bruce) |
| `us-2c-2d-webb-69pa\|casualties\|state_volume` | the 69th Pennsylvania: Banes 143 (258 entered the battle; 6 officers and 36 men killed, 7 and 76 wounded, 2 and 16 missing); McDermott 39 killed, 80 wounded and 16 taken among the men, 151 "aggregate loss" with the officers; the return has 137 | A 0385: 143 (Banes); B 0386: 135 (McDermott) |
| `us-2c-3d-smyth-14ct\|arms\|weapon_1863-07-03` | the 14th Connecticut's Sharp's rifles on 3 July: two borrowed rifles of wounded men (Hincks, A) against the whole regiment "armed with Sharp's breech-loading rifles" (Rodenbough, quoted by Page, B) | A 0463: Sharp's rifles (some) (Page); B 0464: Sharp's breech-loading rifles (all) (Page) |
| `us-2c-2d\|casualties\|report_statement` | the Second Division's loss in the two commanders' words: Gibbon "lost in killed and wounded over 1,600" (A), Harrow "lost 1,657" (B). They need not contradict each other (the return has 1,546 killed and wounded and 1,647 with the missing); the checker sees two statements of one quantity | A 0518: 1,600 killed and wounded (OR27-1 R098 p. 418); B 0519: 1,657 (OR27-1 R099 p. 421) |
| `us-2c-2d-harrow-1mn\|casualties\|state_volume` | the 1st Minnesota's loss in the two days: Fox 224 (51 killed, 173 wounded; the OCR prints "5 i"), Coates's report of 5 July 232 (4 officers and 47 men killed, 13 and 162 wounded, 6 missing), the nominal list of 31 August 245 (7 officers and 88 men killed and mortally wounded, 9 and 141 wounded), the list in the Adjutant General's office 237; the revised return has 224 | A 0539: 224 (Fox); B 0540: 232 (First Minnesota history); C 0541: 245 (First Minnesota history); D 0542: 237 (First Minnesota history) |

Differences between figures of another kind, date or source are not conflict sets: they are separate lines, each with its basis, and the two tables above show them side by side.

- **The revised return against the figures of the reports.** The return (OR27-1-R013) is the later and corrected statement (the loss tables of the reports are footnoted "But see revised statement, p. 176"), and it disagrees with the earlier figures of the same units: the 82d New York 192 against 232 in Darrow's table (the print adds 37 men "buried by regimental detail" in its total); the 72d Pennsylvania 192 against 197 (Hesser; the Pennsylvania table prints the same 197); the 12th New Jersey 115 against 113 (Hill, and Smyth's table); the 1st Delaware 77 against 63 (Smyth's table); the 4th Ohio 31 against 30 (Carpenter) and 32 (Kepler); the 15th Massachusetts 148 against 143; the 7th West Virginia 47 against 61 (Lockwood's count: 1 officer wounded, 5 men killed, 42 wounded, 13 missing); the 59th New York 34 against 15 and 18 on the two days; Smyth's brigade 366 against 352; Harrow's brigade 768 against 763 (Fox), 764 (Walker) and 722 (Harrow's own list, without the missing); Webb's brigade 491 against 482 (Walker) and 525 (Webb, "43 commissioned officers and 482 enlisted men", with "47 enlisted men" missing besides); the divisions: see the casualty table.
- **Strength of different kinds.** The 69th Pennsylvania 258 "entered the battle" (Banes, McDermott) against 329 present for duty on 30 June; the 71st 421 carried into action (Fox) against 331 present for duty on 30 June ("the number carried into action is not of record": the Adjutant General's Office); the 106th 335 on 30 June, 343 present for duty on 2 July (Ward) and "about three hundred" in the fight; the 4th Ohio 316 present for duty on the morning of 2 July (13 officers and 303 men, Kepler) against 299 going into the fight (22 officers and 277 men, Carpenter); the 1st Minnesota 385 present for duty on 30 June, 342 on 31 May ("regular organizations"), 262 to 330 in the charge, "about 140" on the morning of 3 July and 144 on 31 July; the 7th Michigan 238 on 30 June and 165 into action; the 111th New York 475 on 30 June and 350 to 400 in the charge; the 12th New Jersey 532 for duty (596 present) on 30 June and 401 (463) on 13 July.
- **Scan findings that the checker cannot see** (named in the notes of the lines): the printed missing enlisted men of Webb's brigade in the return (84) do not add up (the regiments give 34); the 72d Pennsylvania's losses in the Pennsylvania table (2 + 60 dead, 7 + 133 wounded, 2 missing = 204) do not add to its printed total 197; OR27-1 p. 459 prints "5(T enlisted men" for the Pioneer Corps (the scan reads 50, with an ink blot on the zero); Toombs's "June 30^ iSbj" is 30 June 1863; the OCR of the Second Division's June 30 row prints 3.773 for 3,773.

## Gaps

Fifteen gap lines (a gap line cannot be superseded), each with a register proposal:

| line | field | units | not found (searched) | register |
|---|---|---|---|---|
| 0495 | strength | Hall, Carroll, Smyth | division and brigade reports, the regiments' reports (R098-R131; regex of numbers with men, muskets, strong, effective, present and of numbered, strength, went into, took into, carried into), Walker (p. 301 and the Gettysburg chapter), Fox, NY-GB-1900, IN-1913, Toombs, the Minnesota history | us-2c-2d3d-01 |
| 0496 | strength | 42nd NY, 1st Co. Massachusetts Sharpshooters, 14th IN, 7th WV, 1st DE, 125th NY | division and brigade reports, the regiments' reports (R098-R131; regex of numbers with men, muskets, strong, effective, present and of numbered, strength, went into, took into, carried into), Walker (p. 301 and the Gettysburg chapter), Fox, NY-GB-1900, IN-1913, Toombs, the Minnesota history | us-2c-2d3d-01 |
| 0497 | arms/weapon | 10 units | the reports R098-R131 and R076 (the words of arms, bayonets, swords and revolvers), Fox, Walker, the state volumes and the declared histories: 35 sources, windows of 220 characters round every designation of the unit | us-2c-2d3d-02 |
| 0498 | arms/bayonet | 20 units | the reports R098-R131 and R076 (the words of arms, bayonets, swords and revolvers), Fox, Walker, the state volumes and the declared histories: 35 sources, windows of 220 characters round every designation of the unit | us-2c-2d3d-02 |
| 0499 | arms/sidearm_sword | 27 units | the reports R098-R131 and R076 (the words of arms, bayonets, swords and revolvers), Fox, Walker, the state volumes and the declared histories: 35 sources, windows of 220 characters round every designation of the unit | us-2c-2d3d-02 |
| 0500 | dress/headgear | 22 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0501 | dress/coat | 19 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0502 | dress/shirt | 26 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0503 | dress/trousers | 22 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0504 | dress/shoes | 25 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0505 | dress/accoutrements | 27 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0506 | dress/sash | 28 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0507 | dress/pack_state | 28 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0508 | dress/flag_or_instrument | 24 units | the same 35 sources with the words of dress (for flags and instruments a flag word near a word of description) | us-2c-2d3d-03 |
| 0517 | commander | 108th NY, 14th CT, 39th NY, 7th WV, 126th NY, Harrow, 2nd Div Gibbon/Harrow | R098-R131 (assumed, took, succeeded, devolved, resumed, relieved, turned over, surrendered with command), Seville, Page | us-2c-2d3d-04 |

The strength gaps are real after the second sweep: no source read states the strength of Hall's, Carroll's or Smyth's brigade, and none that of the 42d New York, 14th Indiana, 7th West Virginia, 1st Delaware, 125th New York or the 1st Company Massachusetts Sharpshooters (Colonel Devereux writes that the 19th Massachusetts and the 42d New York together "numbered but 290 men" when sent to Humphreys, R110 p. 443: a figure for two regiments, not divided). The arms and dress gaps are the cells for which the sources read say nothing for July 1863; where only an earlier or later date is stated the line carries that date and the cell keeps its tier (see register entries 02 and 03). The command gap (0517) lists the successions that no source states.

## Roster

- **Units the record shows and the plan lacks** (`unit_id` null, reported, never applied): the Pioneer Corps of the First Brigade, Third Division (Capt. Nathan Willard, 14th Indiana; line 0509); the Second Division's staff row of the return (3 officers wounded, 0110) and the First Brigade's (1 officer wounded, 0112). The provost guard of the First Brigade, Third Division (Capt. Craig, 8th Ohio) is a detachment line of the 8th Ohio (0336). Details in the roster request note.
- **Every unit of the plan is in the record.** The table prints the 59th and 39th New York as "(four companies)" and the 10th New York as a battalion; the 1st Company Massachusetts Sharpshooters is "Unattached" in the Second Division; the 2d Company Minnesota Sharpshooters (Company L, kit record `US.MN_CO_L`) is "attached" to the 1st Minnesota in a footnote of the table and is included in the 1st Minnesota's row of the return.
- **Labels.** The plan names the brigades by commander; the table calls them First, Second and Third Brigade of each division and prints a second or third commander for several.

## For other groups

Nothing was written for these; the owning group or the integrator may use them.
- `us-2c-1d` (and any group with Pennsylvania units): Pennsylvania at Gettysburg (1914) vol. 2 prints, for every Pennsylvania regiment, the letter of the Adjutant General's Office with the return of 30 June 1863 "present for duty" and the loss at Gettysburg (for example the 81st: 15 officers and 175 men "for duty"; the 140th: 29 officers and 561 men present for duty; the Pennsylvania regiments of group us-2c-1d, the 53d, 81st, 116th, 140th, 145th and 148th, should be searched there). The table of vol. 1 (printed pp. 172-173) is the same data: for the four regiments checked (69th, 71st, 72d, 106th) its "Present" column equals the return of 30 June; I read only those four rows, on p. 173 (the 53d is on p. 172).
- `us-2c-1d`: New York at Gettysburg (1900) vol. 1, pp. 103-104, tabulates for regiments and commands the numbers present for duty on 30 June and the numbers carried into action; its rows include the 5th New Hampshire, 28th Massachusetts, 53d Pennsylvania, 61st, 63d, 64th, 69th and 88th New York and the Irish Brigade, as well as Gibbon's division (used here) and the 7th Michigan and 111th New York (used here). The OCR garbles the names of the rows; the page images (pdf pages 153 and 154 of the scan) are clear.
- `us-art-corps`: Gibbon (R098 p. 416) puts Webb's brigade "on the right, partially behind a low stone wall, and protecting Cushing's battery, Fourth U. S. Artillery", Brown's Rhode Island battery on Webb's left, and says he sent "a 12-pounder battery to the right and rear" of the 15th Massachusetts and 82d New York; Harrow (R099 pp. 419-420) puts the 19th Maine "to the right of a battery commanded by Lieutenant Brown" and the 1st Minnesota "to the left of a battery commanded by Lieutenant Thomas", and says Heath retook three guns of the battery on his left, "most of the battery horses having been killed". Arms picked up on the field: Harrow's First Brigade 1,740 guns, his Second Brigade 1,284 rifles and 972 sets of accouterments (R099 p. 422), against Webb's own "1,400 stand of arms and 903 sets of accouterments" (R104 p. 428); Hall's brigade kept no count; the Second Corps in all, 5,976 stand of small arms (R076 p. 378).
- `us-2c`: Gibbon's two terms as commander of the Second Corps (at Taneytown on 1 July, and from the battle of 2 July until 1 o'clock on 3 July, R098 pp. 416-417) are given above from his own report; the corps group has Hancock's side. Colonel Dwight Morris of the 14th Connecticut, who took the Third Division's Second Brigade by 5 July, is in no table.

## Sources

Cited by the evidence lines (`sources.json`): `OR27-1` (organization table R009 pp. 158-159; the field return of 4 July R008 p. 153; the Return of Casualties R013 pp. 175-177 and its lists of officers killed or mortally wounded pp. 188-192; the reports R098 to R131; Hancock's report R076), `FOX-1889`, `ME-GB-1898`, `MI-GB-1889`, `MN-1ST-1916`, `NJ-TOOMBS-1888`, `NY-GB-1900`, `NY-GB-1900-v2`, `OH-8TH-1889`, `PA-GB-1904`, `PA-GB-1914-v2`, `PA-GB-1914a`. Searched without a citing line: `NJ-FINAL-1891`, `NY-GB-1902-v3`, `IN-1913`, `OH-DED-1887`, `BL-3`, `HASKELL-1908`. The page numbers of OR27-1 are the leaf map's; the page of a state volume is the page model's (a range where the model knows only a range).

Seventeen texts are declared by `type: source` lines (details, sha256 and use in the library request note): sixteen fetched from archive.org on 2026-11-13 by the first pass (Bruce, 20th Massachusetts; Seville and Murphy, 1st Delaware; Page, 14th Connecticut; Sawyer, 8th Ohio; Potter, 12th New Jersey; Banes, the Philadelphia Brigade; Ward, 106th Pennsylvania; McDermott, 69th Pennsylvania; Cowtan, 10th New York; Smith, 19th Maine; Ford, 15th Massachusetts; Simons, 125th New York; Willson, 126th New York; Kepler, 4th Ohio; Adams, Reminiscences of the 19th Massachusetts, which no line cites) and Walker, History of the Second Army Corps (the file of group us-2c-1d, fetched there on 2026-11-14, same sha256, copied).

Scans fetched on 2026-11-16 (one request each, no refusal): the PDF of `pennsylvaniaatge04penn` (48,690,061 bytes; read at printed pp. 172-173) and the PDF of `newyorkatgettysb0001unse` (36,983,800 bytes, sha256 `51e14b6e29b55d231e77d3fd875d14f1bc1fb5ff8f8fe9f01e2930d04fb64267`, after one request for the item's file list; read at pdf pages 153-154), both kept under `tmp/kit-us-2c-2d3d/scans/`; the library note lists the unusable items (the 19th Massachusetts and the 7th Michigan Cavalry) and the title searches. No host other than archive.org was contacted and none refused.

## Not done

Every required pair is evidenced or recorded as a gap, so no pair is left open. What was not done:
- The long texts were not read through. They were swept by windows round every designation of every unit (arms, dress, flags, swords, casualty and strength statements: the sweeps are described above and in the gap lines), and read where the sweeps and the battle narratives led. The 34 reports of the group (R098-R131) and Hancock's R076 were searched whole with regular expressions for successions of command, losses, strength, arms and dress and read where those matched; most of the Official Records quotes are matched in the OCR text only, and the figures that decide a claim in a table were read from the scan.
- Company officers are named only where the lists of officers killed or mortally wounded or the reports name them (72 officers). The rosters on disk under `tmp/library/rosters` (Bates for Pennsylvania, `MA-SSM-1931` for Massachusetts, the Maine rosters) could give the officers of those States' regiments of this group; I did not read them. No roster of the New York, Ohio, Indiana, Michigan, Delaware, New Jersey, Connecticut, Minnesota or West Virginia regiments is on disk.
- No regimental history was found for the 82d, 42d, 59th, 39th, 108th and 111th New York or the 7th West Virginia; the 14th Indiana's book on disk stops in 1862; the 1st Delaware has Seville and Murphy only. Their arms, dress and strength are therefore recorded as gaps where nothing was found.
- The lines of the first pass were checked by the checker and the independent matcher and spot-checked against their context; they were not all re-read in context. The page images of the state volumes were viewed only for the tables named above.
- The integrator's commands (`kit_overrides.py compile` without `--dry-run`, `kit_verified.py build`, `build_kit_data.py`) and the node suite were not run, and neither was any gate; the dry run is described above.
