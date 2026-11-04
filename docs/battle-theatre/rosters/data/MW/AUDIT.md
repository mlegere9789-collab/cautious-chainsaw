# Independent audit of family MW, 30 October 2026

Auditor: a second agent that did not build the family. Method follows PLAN 4.3 and 4.4 on a reduced scale: a seeded draw of 60 rows (Python `random.seed(41)`; the draw script is not kept in the repo, the 60 rows are listed below by unit, page and name), checked against the cached source text layer (`tmp/library/rosters/MW/*.pages.json`, word boxes rebuilt into lines) and, for five pages, against the IA page image (`tmp/library/rosters/MW/audit/`, hashes in `AUDIT-images.json`). The 6th Wisconsin (pilot data) and the builder's three QA pages were excluded from the draw. The draw took one Present-Documented row and one other row per unit where available (24 PD, 15 other), then 21 officer rows (seed 41 drew them all from Wisconsin rolls, which hold most of the "officers" section rows), total 60 over 25 units. This is not the PLAN 4.4 test (about 40 strata, 628 rows each); it cannot demonstrate any 99 percent gate.

## Totals, sources, hashes (recounted)

* Row counts and label counts in `stats.json` were recounted from the 26 CSVs: they matched the builder's report exactly (27,098 rows, 26,094 names; Unknown 15,281, Absent-Documented 9,550, Present-Documented 1,507, Duplicate-Xref 760) before the repair. After the repair see `stats.json` and the README (27,083 rows, 26,079 names).
* All 40 files in `acquired.json` exist in `tmp/library/rosters/MW/` and their sha256 values match. Nothing is in the cache that `acquired.json` does not list, except the page-index JSON files and `work/` derived by the pipeline.
* No lending-restricted or bot-blocked source was used. Every IA item used for names has `access-restricted-item` absent in `ia_audit.json`; the restricted item `minnesotaincivil0001unse` is not in the cache or in any script path that downloads it. Six downloaded items had no recorded audit entry (four Official Army Register 1865 volumes and two copies of Michigan in the War 1882); the auditor checked their IA metadata (`AUDIT-ia-metadata.json`): none is access-restricted or in a lending collection. None of the six feeds a CSV row. The Lee 1902 failures (HTTP 504, 503, 500) are recorded in `acquired.json` as failed. HathiTrust and Michiganology were not touched.
* Latent builder defect (not a data error): `boies_merge.py` is not idempotent for rows that match a roll row (a second run duplicates the `other_sources` text and the "Prior basis" phrase). The audit run order never re-runs it.

## The 60 rows (verdicts against the source line; D = defect)

Result before repair: 3 hard label errors (false Present-Documented), 1 further wrong label (Absent for a transfer inside the regiment), 2 under-labelled rows, 20 rows with the wrong section (Wisconsin enlisted men typed as officers), 11 rows with a name that differs from the printed name (OCR or contamination), 1 row that is a heading and not a man, 1 wrong enlistment year.

| # | unit | page | name as stored | verdict |
|---|---|---|---|---|
| 1 | U-12IL-CAV | Boies 10 | Benton, A. | ok (initials only as printed) |
| 2 | U-12IL-CAV | 362 | Sheldon, Frederick | ok (dates not in OCR layer, Unknown) |
| 3 | U-14IN | 292 | Dunn, William H | ok |
| 4 | U-14IN | 298 | StaggB Samuel | D name (OCR junk "StaggB"); label ok (Feb 4 '64 recruit) |
| 5 | U-16MI | Boies | Burtch, R. W. | ok |
| 6 | U-19IN | 416 | Smolser, Adam | ok |
| 7 | U-19IN | 412 | Lloyd Oliver B | D under-labelled: "Died Jan. 20, 'C2" is 1862 (C for 6), kept Unknown |
| 8 | U-1MI | Boies 18 | Stevens, R. H. | ok |
| 9 | U-1MI-CAV | Boies 15 | McCreery, H. | ok |
| 10 | U-1MN | 77 | Waite, Daniel H | ok |
| 11 | U-1MN | 79 | Marshall, David | ok |
| 12 | U-20IN | 431 | Fitzpatrick, Walter | ok |
| 13 | U-20IN | 419 | Ireland, Amos P | ok |
| 14 | U-24MI | Boies 13 | Halter, Ignaz | ok |
| 15 | U-26WI | 341 | Youug, Nicholaus | D name (printed "Young", image checked), D date (printed Aug. 15, '62; stored 1863-08-15), label ok (killed July 1 '63 Gettysburg) |
| 16 | U-26WI | 348 | Orth. Carl | D section (enlisted man typed officers); label Unknown ok |
| 17 | U-27IN | 626 | Box Thomas J | ok |
| 18 | U-27IN | 629 | Gilly Martin V | ok |
| 19 | U-2WI | 369 | Coffin, Harbin. | ok |
| 20 | U-2WI | 372 | CouiUard, George | D name (OCR), D section |
| 21 | U-3IN-CAV | 408 | ^Brown, Jacob H | ok (flagged name-garbled) |
| 22 | U-3MI | 113 | Gardner, Oliver | ok |
| 23 | U-3MI | 179 | Miller, Andrew N. | ok (Unknown) |
| 24 | U-3WI | 442 | Carle, James F' | D HARD label: "M. O. July 1,'6.3" was read as an event in the battle and labelled Present-Documented; D section |
| 25 | U-3WI | 446 | Carey, James | D name (glyph lost, flagged); label ok (Nov 28 '63) |
| 26 | U-4MI | Boies | Bush, B. F. | ok |
| 27 | U-5MI | Boies | Burnett, Joseph | ok |
| 28 | U-5MI-CAV | Boies 19 | Warner, C. S. | ok |
| 29 | U-5WI | 486 | Zimpfer, Martin | D HARD label: "trans. to Co. A, Ind. Batt., July 1.3, '64" (13 July 1864) was read as 1 July 1863 and labelled Present-Documented |
| 30 | U-5WI | 457 | Peter Sclierfirs | D name (OCR); label ok (disch. Mar 4 '62) |
| 31 | U-6MI-CAV | Boies | Lobdell, Abraham | ok (residence OCR garbled) |
| 32 | U-7MI | Boies | Lyon, F. V. | ok |
| 33 | U-7MI-CAV | Boies | Dubois, Francis | ok |
| 34 | U-7WI | 563 | Bronson, Spencer H. | ok label (pris. Gettysburg); D section |
| 35 | U-7WI | 592 | Teaehout, Alfred | D name (OCR); label ok |
| 36 | U-82IL | 114 | Gustav Garn | D HARD label: "Tr. to Inv. Corps July 3,'63" is a transfer, labelled Present-Documented |
| 37 | U-82IL | 121 | First Lieutenants | D a rank heading stored as a soldier |
| 38 | U-8IL-CAV | 149 | Cole, Amos R. | ok (Boies match) |
| 39 | U-8IL-CAV | 120 | Westbrook, Charles | ok |
| 40 | U-5WI | 471 | Bonnell, Cornelius | D section; printed "Aug. 14, '62" dropped |
| 41 | U-7WI | 568 | Nye, Ansel L. F | ok label; D section |
| 42 | U-26WI | 323 | Oswald Schubert | D label: "trans. to Co. I" (same regiment) labelled Absent-Documented |
| 43 | U-26WI | 348 | Lehmann, Henry | D section only |
| 44 | U-26WI | 343 | Roth, John C | ok (xref); D section |
| 45 | U-2WI | 363 | Andrew J. Ward . Madison 1st Asst. Surgeons | D name field holds residence and rank heading; residence stored as "Aug"; label ok |
| 46 | U-7WI | 576 | Bettis Richard R | D section; surname-first comma missing |
| 47 | U-2WI | 367 | Marsh, Eri C. | D section |
| 48 | U-26WI | 332 | Gerhaeuser, John L. | ok label; D section |
| 49 | U-2WI | 381 | Hinton, John E | D under-labelled ("died Oct. 14, '6J" of Antietam wounds, year not recoverable by rule) |
| 50 | U-2WI | 388 | Cornelius Wheeler . . . Second Lieutenants. | D name contaminated by a heading |
| 51 | U-2WI | 374 | George F. Saunders | ok |
| 52 | U-7WI | 563 | Farrand, Lvman | D name OCR ("Lyman"), label ok; D section |
| 53 | U-26WI | 324 | Graetz, Bernhardt | ok label; D section |
| 54 | U-7WI | 562 | Beecham, Henry | ok label; D section |
| 55 | U-5WI | 473 | Spencer, Albert G. | ok label; D section |
| 56 | U-2WI | 367 | Pardee, Marcus | ok label; D section |
| 57 | U-3WI | 427 | Jewell, William | D section; label Unknown although "Sept. 26, '64" (draftee) is legible: should be Absent-Documented |
| 58 | U-26WI | 332 | Klein, Heinrich | D section, date "Aug. 20, '62" dropped |
| 59 | U-2WI | 384 | Marsh, G.^orge W | D name (OCR glyph, flagged) |
| 60 | U-3WI | 413 | Thomas Slagg | ok |

Image check (page images fetched at one request per file, 3 seconds apart, user agent as the builder): `wis2_p341` (row 15) confirmed the printed name Young and the year '62; the other four fetched pages (Indiana vol 4 p298, Wisconsin vol 1 p372 and p592, Illinois vol 5 p114) were fetched but not individually read out because the OCR line and the neighbouring rows already settled each question in the text layer; no claim rests on them.

Reading of the sample (not a gate result): name transcription against the printed page is far below the 99 percent gate (about one named roll row in five carries an OCR error or a contaminated field; only row 15 was confirmed on the page image, the others are visible garbles in the text layer); date and label gates were also failed by the hard errors above. R-G1, R-G2, R-G3 are NOT demonstrated and the family must not be presented as meeting them.

## Systematic defects found, repair, effect (all repairs in `pipeline/mw/audit_fix.py`, `wis_gen.py` and `run_audit.sh`; each changed row is in `AUDIT-CHANGES.csv`)

| rule | defect | repair | rows |
|---|---|---|---|
| F3 | Wisconsin company rolls stayed in section "officers" to the end of the company when the OCR garbled the heading "ENLISTED MEN" (EKLISTED, ENXISTED, ESI.ISTED, E.VI-ISTED) or dropped it; about 2,240 enlisted men (officer-section rows fell from 2,872 to 631) lost their printed enlistment date, so recruits and draftees were never found after the battle and enlisted men were typed as officers | `wis_gen.py`: tolerant heading match, plus a switch at the first run of 12 rows in alphabetical order (officer lists are not alphabetical) when no heading exists. Parsed again; CSV rebuilt | 2nd, 3rd, 5th, 7th, 26th Wisconsin; Absent-Documented rose by 230 from this alone (recruits and draftees dated after the battle, plus separations whose date had been dropped), and the enlistment date is kept for the rest |
| R1 | EVENT-DATED-IN-BATTLE labelled Present-Documented any date from 1 to 3 July 1863 in the remarks, including transfers to the Veteran Reserve Corps or Invalid Corps, muster-outs, desertions, promotions, and "July 1.3, '64" (13 July 1864). Only a casualty documents presence (PLAN 2.2 rule 2) | re-evaluated by segment; casualty or Gettysburg-naming rows kept, the rest demoted to Unknown (Absent-Documented if the muster date is after the battle) | 57 demoted, 13 kept |
| R2 | The Wisconsin parser did not treat "M. O." as a separation (band and other men mustered out in 1862 stayed Unknown); also Illinois 8th Cavalry | Absent-Documented only when the year is 1862 or printed in four digits, no "term exp.", no "to date" | 22 |
| R3 | A transfer to another company of the same regiment (including the Oct. 20, 1862 5th Wisconsin consolidation moves) was labelled Absent-Documented, but PLAN 2.2 rule 7 says transfer out | Duplicate-Xref to the receiving-company row when it is matched uniquely, else Unknown | 58 Xref, 30 Unknown |
| R5 | Absent-Documented resting on a misread year: separation dated in 1861, 1862 or 1863 in an entry that names a later battle (Wilderness, Peach Tree Creek, Hatcher's Run and others; the OCR reads the digit 4 as 1, 2 or 3), year 1860 (for example "'Go" for '65 on Indiana cavalry rolls, "I860"), and rank promotions read as discharges or deaths ("Isc Lieut." read as Disch., "2Dd Lieut." as Died) | demoted to Unknown with the reason in `presence_basis`; the printed text is unchanged | 43 |
| R7 | Drafted men with a legible draft date in 1864 or 1865 stayed Unknown because the draft-year rule was tested before the enlisted-after rule | Absent-Documented ENL-AFTER | 153 (3rd WI 119, 7th WI 34) |
| R4 | Rank headings glued to the end of names ("John William Fuchs First Lieutenants"); five rows whose whole name is a rank heading; the 1st Minnesota "Lieutenant Colonels", the 3rd Indiana Cavalry "Recruits," and others | `name_clean` stripped (`name_as_printed` keeps the parsed text; `parse_flags` records the stripped heading); 15 heading-only rows removed to `AUDIT-REMOVED.csv` (conservation: zero silent drops) | about 190 names, 15 rows removed |

Row count after the repair: 27,083 (27,098 less the 15 removed). Present-Documented fell from 1,507 to 1,447 (the false ones), Absent-Documented rose to 9,823, Duplicate-Xref to 818, unreadable share fell from 26.4 to 24.1 percent. Every one of the repairs lowers a claim or adds an explicit documented separation; none adds a Present label.

## Not fixed, and why

1. OCR name and date errors in the text layer (rows 4, 15, 20, 25, 30, 35, 52, 59 and many more; about one named roll row in five). Correction needs a second OCR engine or reading the page images (PLAN 4.3 R-G1/R-G2 stratum rebuild); none is installed (G02) and installing one is an owner decision. The builder's flags (`name-garbled`, `ocr-noise-in-name`) catch only some.
2. Year digits misread by the OCR (4 read as 1, 2 or 3, 6 as C or G): 24.1 percent of rows stay Unknown with `unreadable-or-ambiguous`. R5 removes the false Absent labels the misreads caused; recovering the true year needs the images.
3. The 6th Wisconsin (pilot copy): companies G and I are typed "officers" (about 390 enlisted rows) and their enlistment dates were never stored, so these rows cannot be repaired from the CSV; R1, R2, R3, R5 and R4 were applied to it. A re-parse needs the pilot parser (`pipeline/wis_parse.py`) and the same heading repair.
4. Rank of Wisconsin officers: the rank headings ("Captains.", "First Lieutenants.") were dropped by the parser, so every officer row has rank `officers`. The headings are in the page text; assigning ranks needs a parser pass that keeps them (only a glued heading is now recorded, in `parse_flags`).
5. Residence and rank text inside the name of about 16 field-and-staff rows of the 2nd and 5th Wisconsin ("Edwin M. Hunter Milwaukee Adjutants", residence "Aug"): not repaired.
6. Veteran re-enlistment sections, cross-unit transfers (14th to 20th Indiana) and "From Co. X" duplicates across companies are not merged beyond R3.
7. Ten Michigan units have only the 1913 survivors list; Indiana officers are unreadable in the rotated print; 1,004 rows have no name in the OCR layer (kept empty, never invented). These are the builder's recorded gaps GMW01 to GMW10 and remain open. The owner's instruction that the information is public and Claude must obtain it applies: the next steps are the Michigan volumes outside IA through sources whose terms permit it, and a second OCR for the Indiana officer pages; this audit did not attempt them.
8. The audit's own sample was used to find the rules above, so it cannot also certify them; a fresh seeded draw (PLAN 4.4, new pages) is required before R-G9 can be considered.

## Files

`_pre_audit/` frozen builder output (26 CSVs, stats.json, README.md, QA-SAMPLE.md, acquired.json); `AUDIT-CHANGES.csv`; `AUDIT-REMOVED.csv`; `AUDIT-images.json`; `AUDIT-ia-metadata.json`; pipeline: `wis_gen.py` (section repair), `audit_fix.py`, `run_audit.sh`, `final_stats.py` (env `MW_KEEP_6WI=1` keeps the repaired 6th Wisconsin; audit CSVs skipped).
