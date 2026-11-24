# Kit evidence report: us-5c

Army of the Potomac, V Corps: corps headquarters and the infantry of the three divisions (Barnes, Ayres, Crawford). 49 units of `groups.json` (1 corps, 3 divisions, 8 brigades, 35 regiments, 1 company, 1 kit-only record). Workstream `bt-oob-kit`. Evidence file `us-5c.jsonl`. Register proposals `GOVERNANCE/horde/ws-kit/proposed-register/us-5c-01-strength.md`, `-02-arms.md`, `-03-dress.md`. Request notes `GOVERNANCE/horde/requests/bt-oob-kit-us-5c-library.md`, `-catalog.md`, `-roster.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-us-5c/` (`kb.py` and the packages `p1_table.py` to `p8_gaps.py`) locates each quote through the evidence library, so offset, report id and (Official Records, state volumes) page come from the tool. The rows of the return of casualties (pp. 179-180), the abstract rows (p. 153) and the inclosure of Sweitzer's report (p. 613) were read from the scan at 300 to 400 dpi and added up against the printed totals (the checker verifies each row). Thirteen texts were fetched from archive.org and declared (library note); the Bates volumes and Michigan in the War were on disk from group us-1c. The archive download path redirects to a refused host, so the full-text page of each item was used. Not run: `kit_verified.py build`, `kit_overrides.py compile` (only `--dry-run`).

## Counts

`python -I tools/bt/kit_evidence_check.py us-5c --require-complete` exits 0: `us-5c: 276 lines (254 evidence, 4 gap, 18 source); accepted 242 (documented 240, inferred 2); rejected 0; superseded 12; 0 errors, 80 warnings; coverage: 262 of 262 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field: roster 51 (50 documented, 1 inferred: the 5th New York), commander 62, casualties 56 (47 rows of the return read from the scan: 35 regiments, 8 brigades, 3 divisions and the corps; and 9 report statements; no state-volume lines), strength 47 (46 documented, 1 derived and inferred: the sum for McCandless's brigade), arms 11, dress 13, detachment 2. The 12 superseded lines are 11 of the table's commander lines replaced by dated lines of the same men with the event (Vincent, Rice, Conner, Weed, Garrard, O'Rorke, Freedley, Lay, Lee, McKee, Taylor) and the table's roster line of Company C, replaced by the line that adds its presence on 3 July; Elliott of the 16th Michigan (17 July) is a new line. All 49 units are addressed. Strength is a documented line for the corps, the three divisions, the brigades of Tilton, Sweitzer, Vincent and Burbank and 22 regiments; a gap line for 13 regiments and the brigades of Day, Weed and Fisher; McCandless has a derived (inferred) figure. Arms: evidenced for 8 of 35 regiments (none on a date in July 1863); dress: 13 lines for 11 regiments; both are gap lines for the rest.

## Corrections

What the kit or the PDF had, against what the record says ("kit now" from `--diff` and `groups.json`).

| unit | field | kit now | evidence value | source, page | line |
|---|---|---|---|---|---|
| V Corps | strength | 10,904 (Stone Sentinels via the PDF) | 9,553 present for duty on 4 July (626 + 8,483 infantry, 14 + 430 artillery); not the 10,904 | OR27-1-R008 p. 153 | the line `abs_corps` |
| First, Second, Third Division | strength | an equal share of the corps figure | present for duty 3,472, 3,022, 2,615 on 4 July; Barnes 2,664 entering the engagement | R008 p. 153; R189 p. 605 | |
| 20th Maine | weapon | springfield; enfield; lorenz (inferred) | spurious Enfield rifles on 6 September 1862 (Powell); 386 or 380 men on 2 July (conflict set), 358 muskets | Powell; R196, R189 | conflict set |
| 146th New York | coat | zouave jacket (inferred) | zouave-type uniforms ordered in the first week of April 1863 (Brainard); "in 1863 adopted the Zouave uniform" (NY-GB-1902-v3) | | the two dress lines |
| 155th Pennsylvania | coat | sack coat; frock coat (inferred) | zouave uniform in May-June 1864 only; nothing for July 1863 | PA-GB-1914-v2 | |
| 13th Pennsylvania Reserves | weapon | enfield; springfield (plausible-procedural) | Sharps rifles on 2 July (Thomson) or breech-loaders with Spencers in some companies (state volume): conflict set | | |
| 13th Pennsylvania Reserves | badge | badge V blue; none (inferred) | the Bucktail in the cap, 1861 | Thomson | |
| 140th New York | dress | variant "zouave from 3 June 1863" (a reading of the 146th's history, not matched to a text) | no statement for June or July 1863; "Zouaves" of 5 May 1864 (Cribben); Brainard gives April 1863 for the 146th and no day in June | | the 140th dress line |
| 9th Massachusetts | roster | in Sweitzer's brigade, on the field | absent on special duty on 2 July (Barnes); not in Sweitzer's inclosure of three regiments (1,010 men); 7 casualties in the return | R189; R193 p. 613; R013 p. 179 | detachment line |
| 5th New York (kit record only) | roster | absent (kit) | absent: not in the table; the order of 4 May 1863 sends the men leaving the army to New York | NY-GB-1900-v2 | inferred |

Casualties: the return gives the Fifth Corps 2,187 (28 officers and 337 men killed, 129 and 1,482 wounded, 1 and 210 missing); the report statements differ by basis and are separate lines (Barnes 897 against the return's 904; Tilton's brigade 109 on 2 July against 125; Chamberlain 136 against 125; Welch 59 killed and wounded of which 31 killed against 23 killed, 34 wounded). The Weed brigade total (200) and the Second Division total (1,029) add up; so do all brigade rows.

## Conflicts

| key | alternatives | lines |
|---|---|---|
| us-5c-1d-tilton, strength, 2 July | 654 "numbered in all" (Barnes, R189); 474 men remaining on the 2d (Tilton, R192) | 0178, 0179 |
| us-5c-1d-vincent-20me, strength, 2 July | 386 all told, 358 guns (Chamberlain, R196, taken into action); 380 men and officers (Barnes, R189); the Maine volume's 28 officers and 358 men present for duty equipped agrees with Chamberlain | 0183, 0184 |
| us-5c-1d-vincent, strength, muskets | about 1,000 (Rice, R195); 1,141 (Judson's footnote, the muskets of four regiments) | 0182, 0226 |
| us-5c-1d-vincent-16mi, strength, muskets | about 150 in line (Welch, R198); 188 (Judson) | 0185, 0224 |
| us-5c-2d-weed-155pa, arms, first issue 1862 | "the Belgian rifle" (PA-GB-1914-v2); "worthless Austrian rifles" exchanged at Washington for smooth-bore Springfield muskets (Bates) | 0234, 0235 |
| us-5c-3d-mccandless-13pareserves, arms, 2 July | Sharps rifles (Thomson); breech-loading rifles, some companies Spencers (PA-GB-1904) | 0246, 0247 |

No default is chosen. OCR digit and ordinal errors found against the scan or against the printed arithmetic: "23d Massachusetts" for the 22d, "33d" for the 32d, "130th Maine" for the 20th, "28d" and "82d" in the return for the 22d and 32d, "9tb" for 9th, "n8t;li" for 118th, "FDTH AEMT CORPS", "Ceawford", "Gaeeaed", "Ayrks", "THIED DIVISION", Judson's "*j8" for 358 (the total 1,141 fixes it), "enfagement", the 4th United States' "engagement of July 3" in Adams's report (R206; not used, the scan page 638 shows the same print, the date of the fight is not settled by that sentence), the Staff and 83d Pennsylvania cells of the return (read from the scan). 

## Gaps

| field | units | searched | result | register proposal |
|---|---|---|---|---|
| strength | 18th, 22d Massachusetts, 1st Michigan, 9th Massachusetts, 3d, 4th, 6th, 12th, 14th, 2d United States, 140th, 146th New York, 9th Pennsylvania Reserves | OR27-1 R187 to R220; PA volumes' Adjutant General letters (56 read); regimental histories; state volumes | not found | us-5c-01-strength |
| strength | brigades of Day, Weed and Fisher | same | not found; the regiments' figures are incomplete | us-5c-01-strength |
| arms | 27 regiments (18th Massachusetts, 1st, 4th, 16th Michigan, 118th, 62d Pennsylvania, 32d Massachusetts, 140th, 146th New York, the ten regulars, eight Reserves) | OR27-1 R187 to R220, state volumes, histories, Bates | not found | us-5c-02-arms |
| dress (all twelve kit fields) | 26 regiments (as above without the 62d, 83d, 91st, 140th, 146th) | same | not found | us-5c-03-dress |

The bayonet and side arms are not stated for any regiment (the required field is `arms`, satisfied by the weapon lines and the gap line).

## Roster

Units the record shows and the plan lacks (`unit_id` null): 12th New York Infantry Companies D and E (Capt. Henry W. Rider) and 17th Pennsylvania Cavalry Companies D and H (Capt. William Thompson), the corps headquarters. Mislabelled or misplaced: Company C of the 32d Massachusetts belongs to the Headquarters Guard of the Artillery Reserve (p. 167) and guarded its train on 3 July (R315); the 5th New York is absent. See `bt-oob-kit-us-5c-roster.md`.

## For other groups

- `us-art-corps` (Martin's artillery brigade, V Corps): the casualty rows of the return, p. 180: 3d Massachusetts (C) 6 wounded; 1st Ohio L 2 wounded; 5th United States D 1 officer and 6 men killed, 6 wounded, 13 in all; 5th United States I 1 killed, 1 officer and 18 wounded, 2 missing, 22; the brigade total 43 (the corps row includes it); the field return of 4 July gives the artillery brigade 14 officers and 430 men, 444 (p. 153).
- `us-6c`, `us-3c-2d`: nothing met.
- The Weed brigade's relation to the Third Corps (Sickles' move of Watson's battery) is in R187 p. 594, for `us-art-corps`.

## Sources

OR27-1 (the organization table pp. 161-162 and 167, the return of casualties pp. 179-180, the field return p. 153, reports R187 to R220 and R315), PA-GB-1914-v2 (Adjutant General's letters), PA-GB-1904, NY-GB-1900, NY-GB-1900-v2, NY-GB-1902-v3, and 18 declared texts (13 fetched on 24 November 2026: Judson, Nash, Brainard, Cribben, Powell, Parker's 22d Massachusetts and 32d Massachusetts, Macnamara, Thomson, the Corn Exchange history, Sypher, Hardin, the Third Brigade proceedings; Bates 1 to 4 and Michigan in the War from disk). The host `archive.org` was reached for the catalogue search and the full-text pages; the storage host behind `/download/` returned 403 and was not worked around.

## Not done

- Arms and dress pairs are closed by gap lines for the regiments in the Gaps table; the question of finding regimental histories for the 18th Massachusetts, the Michigan regiments, the regulars and seven Reserves regiments is left open (no history found by title).
- Strength gaps as listed; the 9th Reserves letter of the Adjutant General is missing from the volumes.
- Officers (lieutenant to captain) of the regiments were not collected beyond the commanders and the commanders' successors named in the reports; the lists of officers killed and mortally wounded (R013 pp. 188-192) were not entered as `officer` lines (they are not required pairs).
- The abstracts of 10, 20 and 30 June (R008 pp. 151-152) for the Fifth Corps were not read; the corps strength rests on the return of 4 July.
- Casualty lines of the state volumes (the Adjutant General's letters carry "casualties in action" for most Pennsylvania regiments) were not entered.

## QC sweep 2026-11-24
Corrections after the independent check of the evidence (checker exit 0 with `--coverage --require-complete`); details in `GOVERNANCE/horde/ws-kit/QC-SWEEP-2026-11-24.md`.
- Sweep B, organization-table lines under a footnote mark (CS pp. 283-290, US pp. 155-168): 1 lines (0008).
