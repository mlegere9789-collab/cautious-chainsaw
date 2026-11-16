# Independent sample of the stored lines against page images, rounds 1 and 2 (round 1: Maine, New Hampshire, Vermont, Massachusetts; round 2: North Carolina, section 8) (work item roster-qa, OA03)

Written 16 November 2026, 03:44 UTC by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text or a file says it), **Computed**, **Inferred**, **Not run**. Every number below is computed by `pipeline2/roster_qa/qa_report.py` from `data2/qa/` (frame, draw, one verdict file per page looked at, statistics, claims check, second-reading tests, recovered lines), the unit files and the logs under `GOVERNANCE/horde/ws-rosters/roster-qa/`; no count is typed (figures quoted from the reports and plans of other items are named with their source). No stored line, flag file or ledger of another item was changed.

## 0. Summary

* **The sample (Measured).** 35 pages of the four closed items were drawn by a seeded rule (seed `roster-qa-round1-2026-11-14`, 3,412 pages in the frame, 11 strata: six source families by layout, each split into pages of officers and other pages; at least a third of every stratum's pages from its lowest OCR-confidence decile) and **looked at** one by one with the Read tool on the page image (the item PDF through `archive.org/cors`, one page cut out with pdftoppm, transient, never stored). **1,158 stored lines were compared with the print** (name, rank or heading, company, and, where the stratum had not already failed the gate, dates and remarks). Page numbers, row numbers, the stored and the printed text of every difference are in `data2/qa/pages/*.verdict.json` and `*.addendum.json`. Two sittings of the sample reader: the first (14 November) looked at 34 pages; the second (15 November) looked at draw position 2 of MA-SSM-officers, which the first had passed over (no file records why), re-read 5 pages (section 2.5) and compared the dates and remarks of the Vermont officers page where the first sitting had compared names only.
* **Result (Measured).** **All 11 of 11 strata fail at least one gate by the ladder** (4 or more errors at the gate concerned, which is more than the ladder of PLAN.md 4.4 allows at its largest sample of 773 lines): R-G1 names failed in 9 strata, R-G2 dates in 6, R-G3 in 4 (structure) and 9 (reading of the remark). **No stratum passes R-G9; none of the four items may be published as checked.** Section 2.2 gives every count with its one-sided 95 percent Clopper-Pearson bound; where a gate is still open (too few lines to decide) the table says OPEN and no pass is claimed. Of the 28 failing gate cells 27 also have a one-sided 95 percent lower bound above 1.0 percent, so the true error rate is above the requirement at that confidence (the exception: VT-REV-other R-G3a 5 / 304, lower bound 0.65 percent). Without the lowest-decile pages (section 2.6) 9 strata still fail by count (4 or more errors), 2 more have a gate whose lower bound is above 1.0 percent (ME-GET-officers, ME-RET-officers).
* **What is wrong (Measured, section 2.3).** The text layer differs from the print in characters (digits read as letters or as other digits, `1S63`, `'03`, `6i`; letters, `Julv`, `reed`, `Mclntire`, `II` for H; whole names garbled); the flag files mark only part of the lines in error. Besides: the ditto mark stored as the digits 66 (Maine returns), margin marks stored as letters (Massachusetts), run-in paragraphs and run-over lines stored as fragment rows or on the wrong row, several printed rows stored as one (Maine Field and Staff returns), rank words in the name field of officer lines (Maine at Gettysburg). The checks V1 to V3 cannot see any of this; the sample is the only check that does.
* **Second sitting (Measured, section 2.5).** The plan sends disagreements to a third reader and the first sitting had one reader. A second sitting re-read 5 pages (101 lines) that decide strata or that the two machine readings and the first reader disagreed on: all 32 rows that the first verdicts call errors on those pages are errors against the print (0 not confirmed); it added 23 rows with errors at the levels D and R of one Vermont officers page, and it found printed lines that no stored line accounts for and that the first verdict does not list (2: 2 on `annualreportofad1863main/224`, listed in 2.5). The verdicts of all 35 pages (1,158 lines) are identical to the stored lines as they are now (`qa_current.py`).
* **The claims of the four reports (Measured, section 3).** 920 claims of the reports of Maine, New Hampshire, Vermont and Massachusetts (per-unit line counts, lines per segment, ocr_uncertain, on-the-rolls counts, Gettysburg counts, damage codes, totals), the flag-file and unit-file hashes of the pointer files of all four items and every hash and size of the ledgers and manifests kept locally were recomputed from the files: 920 hold, 0 do not. **At the start of the second sitting 53 of 919 claims did not hold, all of union-ma** (the damage-code counts of its report and the bytes and sha256 of its 24 flag files in its pointer file: the flag files were rewritten on 14 November at 01:30, after the report and the pointer file); they were regenerated from the files by the scripts of that item (section 3) and the check is clean now, and its node test passes 124 of 124 (it passed 100 of 124 before). `verify_unit.py --all` on the four items: 54 files, 0 V1 and 0 V3 defects; `build_index.py --lint`: 0 defects; 23 node tests of the New Hampshire item (23 pass, 0 fail) and 124 node tests of the Massachusetts item (124 pass, 0 fail).
* **The second-reading route (Measured, section 4).** 13 of the 13 lines that the first layer lost and that were tried (the 6 Vermont lines of `diag-no-name.json` and 7 of the 106 Maine index lines of `diag-index.json`) were read by tesseract and are recovered, each with its own locator in a derived text (`data2/qa/pageread-ledger.json`) and confirmed by looking at the line on the page image (and again by the second sitting on the stored crops: 13 of 13 agree); none is written into a unit file. The eight Maine index leaves without text are scanner-deleted leaves (`pageType Delete`) between consecutive printed pages: nothing is lost there. Compared with the first layer, tesseract marks as SUSPECT between 94 and 100 percent of the lines that the sample reader found in error (4.1); the agreement of the two engines on 20 pages per family (4.2) is OWED: the test was queued through the machine lock and had not run when this report was written.
* **Not run / owed (section 7).** The Pennsylvania muster years and the Florida 6.1 percent (no unit files of those items yet); the cells sidecar of the Vermont files (page-order reading of the lines flagged O) as a second reading; the 299 to 628 lines per stratum that the plan asks for were not reached because every stratum failed first; fresh pages after the parsers are fixed; a third reader on every disagreement (the second sitting re-read 5 of the 35 pages and is the same role, not an independent person); browser, timing, real-GPU checks (not part of this work).

* **Round 2, North Carolina (Measured, section 8).** 25 pages of the 41 units of conf-nc (Moore, Roster of North Carolina Troops, 1882; two scans of each of four volumes) were looked at in 4 strata (source scan x officers pages or other pages; seed `roster-qa-round2-2026-11-16`): **939 stored lines compared with the print; 4 of 4 strata fail at least one gate by the ladder of PLAN.md 4.4 and no gate of any stratum passes (R-G9 not passed for conf-nc)**; 16 of the 16 gate cells fail; no gate cell is open. The verdicts of all 25 pages describe the stored lines as they are now (`qa_current.py`: 21 identical, 4 with the same lines under new row numbers). The claims of the conf-nc report: 1,474 of 1,501 recomputed claims hold, 27 do not (section 8.6). The second-reading route test on the two Moore scan families is owed (section 8.7).

## 1. Lines per unit against the strength

"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it); no strength range with a declared basis exists for these units in the registry (`history/units.json` has `strength: null`). A whole-war roll is not comparable with the strength present on 1 to 3 July 1863 (PLAN.md 2.4, gap EG-ROS-010); the ratio is context only. The sample parses nothing new: the lines are those of the four items as they stand in the tree; the right-hand columns say how much of each unit the sample touched.

| item | unit | lines in the file | baseline strength | lines / strength | pages of the sample that hold a line of the unit | lines of the unit on those pages | of them in error | lines recovered by the second reading |
|---|---|---|---|---|---|---|---|---|
| union-me | 10th Maine Infantry | 746 | no baseline row | - | 0 | 0 | 0 | 0 |
| union-me | 16th Maine Infantry | 3,302 | 298 | 11.1 | 4 | 22 | 6 | 0 |
| union-me | 17th Maine Infantry | 3,072 | 350 | 8.8 | 3 | 5 | 0 | 0 |
| union-me | 19th Maine Infantry | 3,156 | 439 | 7.2 | 7 | 56 | 8 | 0 |
| union-me | 1st Maine Cavalry | 4,274 | 421 | 10.2 | 5 | 23 | 15 | 1 |
| union-me | 20th Maine Infantry | 3,614 | 386 | 9.4 | 5 | 13 | 1 | 2 |
| union-me | 2nd Maine Battery (B) | 548 | 107 | 5.1 | 1 | 1 | 1 | 0 |
| union-me | 3rd Maine Infantry | 2,978 | 210 | 14.2 | 3 | 54 | 45 | 2 |
| union-me | 4th Maine Infantry | 2,602 | 287 | 9.1 | 4 | 58 | 3 | 1 |
| union-me | 5th Maine Battery (E) | 507 | no baseline row | - | 2 | 53 | 18 | 0 |
| union-me | 5th Maine Infantry | 2,407 | 395 | 6.1 | 6 | 141 | 25 | 0 |
| union-me | 6th Maine Battery (F) | 509 | no baseline row | - | 0 | 0 | 0 | 0 |
| union-me | 6th Maine Infantry | 2,671 | 381 | 7.0 | 2 | 2 | 1 | 1 |
| union-me | 7th Maine Infantry | 2,719 | 225 | 12.1 | 5 | 23 | 9 | 0 |
| union-me | lines filed to no unit (index lines whose unit cannot be read) | 3,666 | no baseline row | - | 4 | 31 | 31 | 0 |
| union-nh | 12th New Hampshire Infantry | 1,470 | 224 | 6.6 | 1 | 37 | 36 | 0 |
| union-nh | 1st New Hampshire Battery | 260 | 107 | 2.4 | 1 | 33 | 4 | 0 |
| union-nh | 2nd New Hampshire Infantry | 2,655 | 354 | 7.5 | 1 | 40 | 21 | 0 |
| union-nh | 5th New Hampshire Infantry | 2,607 | 179 | 14.6 | 0 | 0 | 0 | 0 |
| union-vt | 12th Vermont Infantry | 1,033 | no baseline row | - | 0 | 0 | 0 | 0 |
| union-vt | 13th Vermont Infantry | 1,008 | 649 | 1.6 | 0 | 0 | 0 | 1 |
| union-vt | 14th Vermont Infantry | 976 | 647 | 1.5 | 0 | 0 | 0 | 0 |
| union-vt | 15th Vermont Infantry | 969 | no baseline row | - | 0 | 0 | 0 | 2 |
| union-vt | 16th Vermont Infantry | 997 | 612 | 1.6 | 0 | 0 | 0 | 0 |
| union-vt | 1st Vermont Cavalry | 2,517 | 611 | 4.1 | 1 | 66 | 0 | 1 |
| union-vt | 2nd Vermont Infantry | 1,998 | 374 | 5.3 | 3 | 168 | 51 | 1 |
| union-vt | 3rd Vermont Infantry | 1,958 | 349 | 5.6 | 3 | 147 | 101 | 0 |
| union-vt | 4th Vermont Infantry | 1,810 | 320 | 5.7 | 0 | 0 | 0 | 0 |
| union-vt | 5th Vermont Infantry | 1,763 | 313 | 5.6 | 0 | 0 | 0 | 0 |
| union-vt | 6th Vermont Infantry | 1,825 | 230 | 7.9 | 1 | 37 | 0 | 1 |
| union-ma | 10th Massachusetts Infantry | 1,258 | 286 | 4.4 | 0 | 0 | 0 | 0 |
| union-ma | 11th Massachusetts Infantry | 2,039 | no baseline row | - | 2 | 48 | 19 | 0 |
| union-ma | 12th Massachusetts Infantry | 1,592 | 261 | 6.1 | 0 | 0 | 0 | 0 |
| union-ma | 13th Massachusetts Infantry | 1,448 | 284 | 5.1 | 0 | 0 | 0 | 0 |
| union-ma | 15th Massachusetts Infantry | 1,726 | 239 | 7.2 | 1 | 16 | 10 | 0 |
| union-ma | 16th Massachusetts Infantry | 1,369 | 243 | 5.6 | 0 | 0 | 0 | 0 |
| union-ma | 18th Massachusetts Infantry | 1,371 | 139 | 9.9 | 1 | 24 | 16 | 0 |
| union-ma | 19th Massachusetts Infantry | 1,938 | 163 | 11.9 | 0 | 0 | 0 | 0 |
| union-ma | 1st Company Massachusetts Sharpshooters | 186 | no baseline row | - | 0 | 0 | 0 | 0 |
| union-ma | 1st Massachusetts Battery (A) | 265 | no baseline row | - | 0 | 0 | 0 | 0 |
| union-ma | 1st Massachusetts Cavalry | 2,341 | 421 | 5.6 | 0 | 0 | 0 | 0 |
| union-ma | 1st Massachusetts Infantry | 1,699 | 321 | 5.3 | 0 | 0 | 0 | 0 |
| union-ma | 20th Massachusetts Infantry | 2,484 | 243 | 10.2 | 0 | 0 | 0 | 0 |
| union-ma | 22nd Massachusetts Infantry | 1,452 | 137 | 10.6 | 1 | 16 | 4 | 0 |
| union-ma | 28th Massachusetts Infantry | 2,065 | 224 | 9.2 | 0 | 0 | 0 | 0 |
| union-ma | 2nd Massachusetts Infantry | 2,013 | 316 | 6.4 | 0 | 0 | 0 | 0 |
| union-ma | 32nd Massachusetts Infantry | 2,168 | 263 | 8.2 | 0 | 0 | 0 | 0 |
| union-ma | 33rd Massachusetts Infantry | 1,282 | 527 | 2.4 | 0 | 0 | 0 | 0 |
| union-ma | 37th Massachusetts Infantry | 1,310 | 590 | 2.2 | 0 | 0 | 0 | 0 |
| union-ma | 3rd Massachusetts Battery (C) | 258 | 107 | 2.4 | 0 | 0 | 0 | 0 |
| union-ma | 5th Massachusetts Battery (E) | 331 | 104 | 3.2 | 0 | 0 | 0 | 0 |
| union-ma | 7th Massachusetts Infantry | 1,171 | 359 | 3.3 | 0 | 0 | 0 | 0 |
| union-ma | 9th Massachusetts Battery | 329 | 104 | 3.2 | 0 | 0 | 0 | 0 |
| union-ma | 9th Massachusetts Infantry | 1,692 | 412 | 4.1 | 2 | 44 | 6 | 0 |
| **all** | | **94,404** | | | | **1,158** | **431** | **13** |

Reading the table. The files hold lines of men who served up to 1865, several lines per man (index, return and participants list for Maine; a line per rank held for Vermont), so lines exceed the strength by a large factor, as the four reports say; nothing is merged. "Lines of the unit on those pages" counts the lines that were compared, not a sample estimate of the file. Lines that the first layer lost and the second reading recovered are not in the unit files and are not counted in "lines in the file" (section 4.4).

## 2. The sample

### 2.1 Design (as run)

* **Frame.** A page is a leaf of an Internet Archive item that holds at least one stored line of the four items (unit files and the `_other-` file of Maine): 3,412 pages, 94,312 lines. Excluded: the one pilot page that the author of the pilot read in development (`pilot/QA-SAMPLE.md`, Maine report 1863 book p. 579, leaf 798). The frame was built at its first run from the files as they stood; the sha256 of the raw lines of every file is in `data2/qa/frame.json`. On 15 November 22 of the 54 files differ from the frame hashes (all of union-ma; the lines of union-ma read 33,748 at the frame and 33,787 now) and the stored lines of every page that was looked at are identical to the lines its verdict lists (`qa_current.py`, `data2/qa/verdicts-vs-files.json`: 35 of 35 pages identical, 1,158 lines), so the verdicts stand for the files as they are now.
* **Strata.** Source family by layout (6 families) x kind of page: an officers page holds at least 3 lines of which at least a quarter are officer lines (rule in `qa_frame.py`); all other pages are "other". Inside a stratum the damage score of a page is the share of its lines that the flag file marks ocr_uncertain; the lowest OCR-confidence decile is the 10 percent of pages (at least 1) with the highest score.
* **Draw.** Pages are ordered by sha256 of `seed | stratum | identifier | leaf` (a published, recomputable pseudo-random order); decile pages and other pages form two lists; the draw order takes a decile page at positions 1, 4, 7 and so on, so that every prefix of m pages holds at least m/3 decile pages (PLAN.md 4.4). The order of every stratum is in `data2/qa/draw.json`; a sample is a prefix of it. **In every stratum the pages looked at are now a prefix of the draw order (positions looked at, per stratum: MA-SSM-officers 1,2,3; MA-SSM-other 1,2,3,4; ME-GET-officers 1,2,3; ME-GET-other 1,2,3; ME-IDX-officers 1,2,3; ME-IDX-other 1,2,3; ME-RET-officers 1,2; ME-RET-other 1,2,3; NH-AYL-other 1,2,3; VT-REV-officers 1,2,3; VT-REV-other 1,2,3,4,5).** The first sitting had looked at positions 1 and 3 of MA-SSM-officers (leaves 143 and 661) and passed over position 2 (leaf 631); no file records why; the second sitting looked at it (verdict `massachusettssol11931mass-0631.verdict.json`, draw position 2). Order of looking where it differs from the order of the draw (from the time of the verdicts): MA-SSM-other: looked at in the order 2, 3, 4, 1; ME-GET-officers: looked at in the order 1, 3, 2; ME-GET-other: looked at in the order 2, 1, 3; ME-IDX-officers: looked at in the order 2, 3, 1; ME-IDX-other: looked at in the order 2, 3, 1; ME-RET-officers: looked at in the order 2, 1; ME-RET-other: looked at in the order 3, 1, 2; the verdict file says the position of every page.
* **Readers.** Two sittings of one role, the sample reader: the engineer of this item on 14 November and the engineer who closed it on 15 November, in different sessions; the first sitting records that it did not write or see the builders of the four items, and the second had not read them when it looked at the pages (it read the Massachusetts scripts afterwards, for the repair of section 3). The page image is looked at with the Read tool (200 dpi view of the page; 300 dpi crops of tables; 500 or 600 dpi for a doubtful character). Tesseract 5.3.4 (psm 6, 300 dpi, the table rules whitened first with a threshold relative to the page background) is a **pre-screen only**: it lists the stored tokens it does not read and the tokens it reads that the line lacks; the sample reader decides every line. A line that both readings agree on was still compared by eye with the page (names, headings, dates, remarks); the detector figures in 4.1 say how often two readings agreeing was not enough. The plan's third reader for disagreements does not exist as a third person: the second sitting re-read the pages of section 2.5 in that place, with the first verdict and the stored lines in front of it (a check of the recorded disagreements against the page, not a blind second reading; the levels D and R of leaf 117 and the whole of leaf 631 had no recorded errors to check), and a doubtful character was zoomed and, where still doubtful, not counted as an error.
* **Levels.** N: name, rank or carried heading, company, existence and cut of the line; D: the dates of the remarks; R: the other words of the remarks. The first pages of every family were looked at at all three levels (the smoke sample, to see the kinds of error). A level that a stratum had already failed decisively (4 errors; the ladder allows 3 at 773 lines) was not looked at on its further pages; `levels` in each verdict says what was compared. This stops the work where the result is decided, it does not lower a gate: a gate that was not decided is shown as OPEN. Because the failure of VT-REV-officers then rested on one page (the lowest-decile page), the second sitting added the levels D and R on leaf 117 (section 2.5).
* **Comparison rule.** Case, punctuation and spacing are ignored (they are not errors); any other differing character is an error, a digit read as a letter included. The kinds of error (`qa_verdict.py`): `name-char` a character of the name differs from the print; `name-cut` the boundary of the name is wrong (rank word or part of the remarks in the name field, a name split); `name-nonperson` the stored name is no person (a heading, a fragment of a paragraph); `rank` the rank or the carried heading is wrong; `company` the company is wrong; `rem-char` a character of a remark word differs; `rem-date` a date or number of the remarks differs; `rem-missing` printed remark text is missing; `rem-extra` text that is not the line's stands in the remarks; `rem-bound` the remarks are those of another line; `rem-order` the printed words are all there but in another order; `rem-ditto` a printed ditto mark is stored as the digits 66; `merge` several printed lines stored as one; `split` one printed line stored as several. Gates: R-G1 = any `name-*` kind; R-G2 = `rem-date`; R-G3 structure = `rank`, `company`, `merge`, `split`; R-G3 reading of the remark = `rem-char`, `rem-missing`, `rem-extra`, `rem-bound`, `rem-order`, `rem-ditto`.
* **Decision rule (never lowered).** PASS when n >= 299 with 0 errors, n >= 473 with at most 1, n >= 628 with at most 2 or n >= 773 with at most 3 (one-sided 95 percent Clopper-Pearson upper bound 1.0 percent, `qa_lib.cp_upper`, which reproduces the values of PLAN.md 4.4); FAIL when 4 or more errors are found; OPEN otherwise. Lines of one page are not independent draws; the plan's own arithmetic treats them as such and so does this table (a caveat, not a change of rule).
* **What a page verdict states.** The sample reader looked at the page image and compared every stored line of the page with it (except lines named as unreadable; none was). The verdict carries the sha256 of the rendered page, of the PDF and of the tesseract text, the stored text of every line in error (`stored`) and the printed text (`printed`), and the printed lines of the units that no stored line accounts for (`missed_lines`).

### 2.2 Result per stratum

Errors / lines compared, one-sided 95 percent Clopper-Pearson upper bound, decision. R-G2 and R-G3 reading are counted only on pages looked at at that level.

| stratum | pages in the frame | lines in the frame | pages looked at (decile pages) | lines compared | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |
|---|---|---|---|---|---|---|---|---|
| MA-SSM-officers | 19 | 329 | 3 (1) | 51 | 1 / 51, 8.97%, **OPEN** | 6 / 51, 21.91%, **FAIL** | 1 / 51, 8.97%, **OPEN** | 11 / 51, 33.17%, **FAIL** |
| MA-SSM-other | 1344 | 33,419 | 4 (2) | 97 | 6 / 97, 11.84%, **FAIL** | 11 / 97, 18.07%, **FAIL** | 1 / 97, 4.8%, **OPEN** | 27 / 97, 36.29%, **FAIL** |
| ME-GET-officers | 8 | 195 | 3 (1) | 74 | 9 / 74, 20.26%, **FAIL** | not compared (no dates in this source) | 0 / 74, 3.97%, **OPEN** | 3 / 74, 10.15%, **OPEN** |
| ME-GET-other | 75 | 4,227 | 3 (1) | 171 | 16 / 171, 13.86%, **FAIL** | not compared (no dates in this source) | 3 / 171, 4.47%, **OPEN** | 19 / 171, 15.88%, **FAIL** |
| ME-IDX-officers | 6 | 104 | 3 (1) | 46 | 9 / 46, 31.66%, **FAIL** | not compared (no dates in this source) | 2 / 46, 13.06%, **OPEN** | 16 / 46, 47.92%, **FAIL** |
| ME-IDX-other | 1145 | 19,559 | 3 (1) | 49 | 16 / 49, 45.28%, **FAIL** | not compared (no dates in this source) | 15 / 49, 43.16%, **FAIL** | 17 / 49, 47.38%, **FAIL** |
| ME-RET-officers | 22 | 555 | 2 (1) | 29 | 15 / 29, 67.97%, **FAIL** | 1 / 15, 27.94%, **OPEN** | 4 / 29, 28.84%, **FAIL** | 2 / 15, 36.34%, **OPEN** |
| ME-RET-other | 296 | 12,078 | 3 (1) | 113 | 13 / 113, 17.67%, **FAIL** | 4 / 51, 17.06%, **FAIL** | 10 / 113, 14.55%, **FAIL** | 42 / 51, 90.47%, **FAIL** |
| NH-AYL-other | 185 | 6,992 | 3 (1) | 110 | 16 / 110, 21.25%, **FAIL** | 34 / 77, 54.16%, **FAIL** | 0 / 110, 2.69%, **OPEN** | 48 / 77, 71.58%, **FAIL** |
| VT-REV-officers | 66 | 2,347 | 3 (1) | 114 | 1 / 114, 4.09%, **OPEN** | 36 / 77, 56.72%, **FAIL** | 0 / 114, 2.59%, **OPEN** | 20 / 77, 35.46%, **FAIL** |
| VT-REV-other | 246 | 14,507 | 5 (2) | 304 | 11 / 304, 5.92%, **FAIL** | 69 / 116, 67.16%, **FAIL** | 5 / 304, 3.43%, **FAIL** | 65 / 116, 63.86%, **FAIL** |

Pages looked at, one line each (stratum, draw position, D = in the lowest decile, levels, lines, lines in error):

| page (identifier / leaf) | printed page | stratum | draw position | decile | levels | lines | in error | notes of printed lines of the units that no stored line accounts for |
|---|---|---|---|---|---|---|---|---|
| `massachusettssol21931mass/143` | 133 | MA-SSM-officers | 1 | D | NDR | 16 | 10 | 0 |
| `massachusettssol11931mass/631` | 617 | MA-SSM-officers | 2 |  | NDR | 19 | 4 | 0 |
| `massachusettssol21931mass/661` | 651 | MA-SSM-officers | 3 |  | NDR | 16 | 4 | 0 |
| `massachusettssol21931mass/373` | 363 | MA-SSM-other | 1 | D | NDR | 24 | 16 | 0 |
| `massachusettssol11931mass/813` | 799 | MA-SSM-other | 2 |  | NDR | 24 | 4 | 0 |
| `massachusettssol11931mass/662` | 648 | MA-SSM-other | 3 |  | NDR | 25 | 2 | 0 |
| `massachusettssol11931mass/758` | 744 | MA-SSM-other | 4 | D | NDR | 24 | 15 | 0 |
| `maineatgettysbur01main/513` | 433 | ME-GET-officers | 1 | D | NR | 16 | 7 | 1 |
| `maineatgettysbur01main/220` | 168 | ME-GET-officers | 2 |  | NR | 54 | 2 | 1 |
| `maineatgettysbur01main/365` | 297 | ME-GET-officers | 3 |  | NR | 4 | 2 | 0 |
| `maineatgettysbur01main/146` | 102 | ME-GET-other | 1 | D | NR | 52 | 17 | 1 |
| `maineatgettysbur01main/447` | 371 | ME-GET-other | 2 |  | NR | 62 | 7 | 1 |
| `maineatgettysbur01main/446` | 370 | ME-GET-other | 3 |  | NR | 57 | 6 | 1 |
| `supplementtoannu00main/1093` | 1079 | ME-IDX-officers | 1 | D | NR | 10 | 3 | 1 |
| `supplementtoannu00main/269` | 261 | ME-IDX-officers | 2 |  | NR | 24 | 15 | 1 |
| `supplementtoannu00main/46` | 38 | ME-IDX-officers | 3 |  | NR | 12 | 2 | 0 |
| `supplementtoannu00main/979` | 965 | ME-IDX-other | 1 | D | NR | 13 | 5 | 1 |
| `supplementtoannu00main/964` | 950 | ME-IDX-other | 2 |  | NR | 19 | 18 | 0 |
| `supplementtoannu00main/681` | 669 | ME-IDX-other | 3 |  | NR | 17 | 2 | 1 |
| `annualreportofad1863main/224` | None | ME-RET-officers | 1 | D | N | 14 | 12 | 2 |
| `annualreportofad1863main/685` | 465 | ME-RET-officers | 2 |  | NDR | 15 | 5 | 1 |
| `annualreportofad1863main/414` | 194 | ME-RET-other | 1 | D | N | 16 | 11 | 0 |
| `annualreportofad1863main/789` | 569 | ME-RET-other | 2 |  | N | 46 | 5 | 1 |
| `annualreportofad1863main/365` | 145 | ME-RET-other | 3 |  | NDR | 51 | 44 | 0 |
| `cu31924096263136/63` | 644 | NH-AYL-other | 1 | D | NDR | 37 | 36 | 0 |
| `cu31924096263128/98` | 77 | NH-AYL-other | 2 |  | NDR | 40 | 21 | 0 |
| `cu31924096263136/322` | 903 | NH-AYL-other | 3 |  | N | 33 | 4 | 0 |
| `cu31924080774148/88` | 73 | VT-REV-officers | 1 | D | NDR | 37 | 25 | 0 |
| `cu31924080774148/117` | 102 | VT-REV-officers | 2 |  | NDR | 40 | 23 | 0 |
| `cu31924080774148/225` | 210 | VT-REV-officers | 3 |  | N | 37 | 0 | 0 |
| `cu31924080774148/74` | 59 | VT-REV-other | 1 | D | NDR | 46 | 43 | 0 |
| `cu31924080774148/116` | 101 | VT-REV-other | 2 |  | NDR | 70 | 53 | 0 |
| `cu31924080774148/248` | 233 | VT-REV-other | 3 |  | N | 66 | 0 | 0 |
| `cu31924080774148/60` | 45 | VT-REV-other | 4 | D | N | 72 | 2 | 0 |
| `cu31924080774148/52` | 37 | VT-REV-other | 5 |  | N | 50 | 6 | 0 |

Reading the decisions. FAIL means 4 or more errors at the gate: more than the ladder allows even at 773 lines, whatever further lines are drawn. 27 of the 28 failing gate cells have a one-sided 95 percent lower bound above 1.0 percent as well (the true rate is above the 1.0 percent of the requirement at that confidence); the failing cell whose lower bound is not above 1.0 percent: VT-REV-other R-G3a, 5 / 304, lower bound 0.65 percent (4 or more errors by the ladder, not yet proven above 1.0 percent by the bound). A gate shown OPEN is not decided and no pass is claimed.

Findings on the sample itself. (1) The lowest-decile pages hold 32.6 percent of the lines compared and 46.9 percent of the lines in error, and the draw takes a third of its pages from the decile, so a pooled rate is an upper estimate of the rate of a whole stratum; section 2.6 gives the counts without them. (2) Pages with no error at all exist (2: `cu31924080774148/225`, `cu31924080774148/248`), all of them compared at the name level only; **no page compared at the level of dates and remarks is free of error**, and the pages of the better kind still carry names that differ from the print (the lowest shares among pages of 20 lines or more: 1 line in 70 on `cu31924080774148/116`; 1 line in 54 on `maineatgettysbur01main/220`; 1 line in 40 on `cu31924080774148/117`). (3) The pooled rates are not estimates of the files: they come from 2 to 5 pages per stratum, and lines of one page are not independent.

### 2.3 What kinds of error, by source family

Counts are instances (a line can carry several kinds). "flagged" = the line is in `ocr_uncertain` of its flag file; "not flagged" = it is not.

| family | pages | lines compared | lines with a name error | lines in error (all levels compared) | kinds (instances: flagged / not flagged) |
|---|---|---|---|---|---|
| Vermont: Revised Roster 1892 (cols) | 8 | 418 | 12 (2.9 percent) | 144 of 193 (75 percent) | `rem-date` 105 (103 / 2); `rem-char` 49 (45 / 4); `rem-order` 40 (40 / 0); `name-char` 12 (12 / 0); `rem-extra` 5 (3 / 2); `rank` 5 (5 / 0); `rem-missing` 4 (3 / 1) |
| Massachusetts: Soldiers, Sailors and Marines 1931 (flow) | 7 | 148 | 7 (4.7 percent) | 55 of 148 (37 percent) | `rem-char` 23 (6 / 17); `rem-date` 17 (14 / 3); `rem-extra` 15 (6 / 9); `name-char` 7 (2 / 5); `rank` 2 (2 / 0) |
| New Hampshire: Ayling, Revised Register 1895 (flow) | 3 | 110 | 16 (14.5 percent) | 57 of 77 (74 percent) | `rem-char` 46 (32 / 14); `rem-date` 34 (31 / 3); `name-char` 16 (9 / 7); `rem-extra` 3 (3 / 0) |
| Maine: Adjutant General report 1863, Appendix D, company returns (cols) | 5 | 142 | 28 (19.7 percent) | 49 of 66 (74 percent) | `rem-ditto` 41 (0 / 41); `name-char` 15 (3 / 12); `rank` 10 (2 / 8); `name-nonperson` 8 (7 / 1); `name-cut` 6 (1 / 5); `rem-extra` 5 (0 / 5); `rem-date` 5 (1 / 4); `merge` 4 (0 / 4); `rem-char` 4 (0 / 4); `rem-missing` 3 (0 / 3) |
| Maine: Supplement 1867, Alphabetical Index (cols) | 6 | 95 | 25 (26.3 percent) | not compared at all levels | `rem-char` 31 (2 / 29); `name-char` 25 (7 / 18); `rank` 17 (0 / 17); `rem-missing` 2 (0 / 2) |
| Maine at Gettysburg 1898, participants lists (lists) | 6 | 245 | 25 (10.2 percent) | not compared at all levels | `name-cut` 21 (11 / 10); `rem-missing` 17 (4 / 13); `name-nonperson` 6 (5 / 1); `rem-char` 4 (0 / 4); `rank` 3 (2 / 1); `name-char` 2 (0 / 2); `rem-extra` 1 (1 / 0) |

Of the 118 instances on name fields, 57 (48 percent) stand on lines that the flag file marks ocr_uncertain and 61 do not; of all 613 instances 362 (59 percent) are flagged. **The flags are not a safe measure of the lines that are right.** The kinds, with what each means for the parsers of the later items, are written up in `PRODUCTION-PLAN.md` 9.8 (appended 14 November) and summarised in 2.4.

Lines in error (a line counted once) that the flag file marks ocr_uncertain, when the verdict was written and in the flag files as they are now (`qa_current.py`): ME-RET 11 of 77 (14 percent) and 11 (14 percent); VT-REV 143 of 152 (94 percent) and 143 (94 percent); NH-AYL 42 of 61 (69 percent) and 42 (69 percent); ME-GET 13 of 41 (32 percent) and 13 (32 percent); MA-SSM 23 of 55 (42 percent) and 51 (93 percent); ME-IDX 9 of 45 (20 percent) and 9 (20 percent). Only MA-SSM differ: the Massachusetts flag files were rewritten on 14 November at 01:30 with wider rules after the verdicts of the first sitting (section 3); the legend of the new rules names `1S63`, `Ist` and `disabUity`, which these pages showed, so the share now is not an independent measure of the new rules and fresh pages are owed.

### 2.4 Defect lists returned to the items (dated 14 and 15 November 2026; stored lines are not changed)

**union-me**

* Maine: Adjutant General report 1863, Appendix D, company returns (cols): `rem-ditto` (41) e.g. `annualreportofad1863main/365` row 2: ditto mark stored as the digits 66; `name-char` (15) e.g. `annualreportofad1863main/224` row 0: stored name '- 1 TT All.' printed 'Samuel H Allen' (Colonel); `rank` (10) e.g. `annualreportofad1863main/414` row 3: stored rank 'JLst Sergt' printed '1st Sergt'; `name-nonperson` (8) e.g. `annualreportofad1863main/224` row 7: stored name 'Discharged and Deceased' (a heading of the prose list below the table); `name-cut` (6) e.g. `annualreportofad1863main/365` row 27: the initial H of 'Buswell Charles H' is stored as 'II' at the start of the remarks after a stray ' '; `rem-extra` (5) e.g. `annualreportofad1863main/365` row 3: stray 'g' in the cells; `rem-date` (5) e.g. `annualreportofad1863main/365` row 10: 'Dee. 22' for 'Dec. 22'.
* Maine: Supplement 1867, Alphabetical Index (cols): `rem-char` (31) e.g. `supplementtoannu00main/269` row 2: company 'T' for 'I' (Hutchinson Joseph, 1 Cavalry); `name-char` (25) e.g. `supplementtoannu00main/269` row 4: stored 'Illsley Hollia C' printed 'Illsley Hollis C'; `rank` (17) e.g. `supplementtoannu00main/269` row 16: rank 'An do'; cells 'i \ u o An do' for 'D 9 do'; `rem-missing` (2) e.g. `supplementtoannu00main/46` row 10: 'Bisbee Andrew Corporal B do' lacks the regiment 7 (printed 'B 7 do'); the line is filed to no unit for that reason.
* Maine at Gettysburg 1898, participants lists (lists): `name-cut` (21) e.g. `maineatgettysbur01main/146` row 14: stored name 'St. Clair' remarks 'Isaac P.,'; printed 'St. Clair, Isaac P., Lisbon,' (Lisbon lost); `rem-missing` (17) e.g. `maineatgettysbur01main/146` row 9: stored 'Columbia,' printed 'Columbia, N. H.,'; `name-nonperson` (6) e.g. `maineatgettysbur01main/146` row 10: stored name 'N. H.' remarks 'Mitchell,'; printed entry 'Mitchell, Stephen, Paris,'; `rem-char` (4) e.g. `maineatgettysbur01main/146` row 15: 'Hallowed,' for 'Hallowell,'; `rank` (3) e.g. `maineatgettysbur01main/447` row 58: stored rank 'ist Sergt.' printed '1st Sergt.'; `name-char` (2) e.g. `maineatgettysbur01main/146` row 37: 'Spider, Francis J.' printed 'Spiller, Francis J.'; `rem-extra` (1) e.g. -.

**union-nh**

* New Hampshire: Ayling, Revised Register 1895 (flow): `rem-char` (46) e.g. `cu31924096263128/98` row 5: 'gd. f I'om mis.' for 'gd. from mis.'; `rem-date` (34) e.g. `cu31924096263128/98` row 2: 'age 2i3' for 'age 23'; 'Hai-bor' for 'Harbor'; `name-char` (16) e.g. `cu31924096263128/98` row 0: stored 'Plaisted, Charles B.' printed 'Plaisted, Charles E.'; `rem-extra` (3) e.g. `cu31924096263128/98` row 32: stray marks '. t. „ .' after the remark.

**union-vt**

* Vermont: Revised Roster 1892 (cols): `rem-date` (105) e.g. `cu31924080774148/74` row 1: second date cell: stored 'July- •63', printed 'July 27,'63'; `rem-char` (49) e.g. `cu31924080774148/74` row 7: 'Flainfield' for 'Plainfield'; '6i'; issue date day lost; `rem-order` (40) e.g. `cu31924080774148/88` row 7: words of the remark out of order ('2, '62; Wd. Corp. Co. C.; ...'); 'reed'; `name-char` (12) e.g. `cu31924080774148/52` row 0: stored 'iMarquis E. Tenney,' printed 'Marquis E. Tenney,' (stray i); `rem-extra` (5) e.g. `cu31924080774148/117` row 2: the run-over of the remark of the row below (Disch. Dec. 14, ['63, for disab.) is printed at the right of this line and stored on it; `rank` (5) e.g. `cu31924080774148/74` row 41: carried heading 'tst Lieutenants.' for '1st Lieutenants.'; `rem-missing` (4) e.g. `cu31924080774148/117` row 3: stored Disch. Dec. 14,, printed Disch. Dec. 14, ['63, for disab..

**union-ma**

* Massachusetts: Soldiers, Sailors and Marines 1931 (flow): `rem-char` (23) e.g. `massachusettssol11931mass/631` row 14: stored Ist Lieut., July 3, 1862, printed 1st Lieut., July 3, 1862; `rem-date` (17) e.g. `massachusettssol11931mass/631` row 3: stored S. O. i3l8, printed S. O. #318; `rem-extra` (15) e.g. `massachusettssol11931mass/758` row 2: stray 'j' tokens ('out j June 24, 1864. j'): margin marks; `name-char` (7) e.g. `massachusettssol11931mass/631` row 1: stored Cromwell G. Rowel!, printed Cromwell G. Rowell; `rank` (2) e.g. `massachusettssol21931mass/373` row 22: rank 'I*riv.' for 'Priv.'; '1S63'.

Requirements for the parsers (the same list is in PRODUCTION-PLAN 9.8): flag generously (digits and the letters that OCR confuses with them, a lower-case letter inside a name, an unusual letter pair); never store a ditto mark as digits; drop lone marks between punctuation on shadowed margins or keep them flagged; parse run-in paragraphs into entries or leave them out, never as fragment rows; keep the state after a residence (`N. H.`, `Vt.`, `Mass.`) in the remarks; assert one stored line per printed line on every table page; do not file a rank word in the name field.

### 2.5 Second sitting (15 November 2026): pages read again

Why these pages. (1) The two Massachusetts officers pages that decided MA-SSM-officers (R-G2 and R-G3b rested on 32 lines), page 685 of the Maine returns (tesseract and the text layer agreed with each other on three lines that the first reader called errors) and page 224 (12 of 14 lines in error) were read again by a second sitting. (2) The failure of VT-REV-officers rested on one page, the lowest-decile page (leaf 88); leaf 117 had been compared at the name level only; it is compared now at the levels D and R. (3) Draw position 2 of MA-SSM-officers had been passed over and is a verdict of its own (`massachusettssol11931mass-0631`: 19 lines, 4 in error). An addendum never rewrites a first verdict (`qa_lib.merge_addendum` merges it when the statistics are computed); the second sitting is `pipeline2/roster_qa/qa_second_pass.py` and `data2/qa/pages/*.addendum.json`.

| page | stratum | what was read again | lines compared | rows in error in the first verdict | confirmed | not confirmed | rows with errors added | printed lines added that no stored line accounts for |
|---|---|---|---|---|---|---|---|---|
| `annualreportofad1863main/224` | ME-RET-officers | the recorded errors | 14 | 12 | 12 | 0 | 0 | 2 |
| `annualreportofad1863main/685` | ME-RET-officers | the recorded errors | 15 | 5 | 5 | 0 | 0 | 0 |
| `cu31924080774148/117` | VT-REV-officers | levels DR added | 40 | 1 | 1 | 0 | 23 | 0 |
| `massachusettssol21931mass/143` | MA-SSM-officers | the recorded errors | 16 | 10 | 10 | 0 | 0 | 0 |
| `massachusettssol21931mass/661` | MA-SSM-officers | the recorded errors | 16 | 4 | 4 | 0 | 0 | 0 |

* `annualreportofad1863main/224`: the print shows 19 men: 15 in the table and 4 in the block Joined Field and Staff since Nov. 1, 1862 (Charles H Smith, Stephen Boothby, Addison P Russell, Samuel Fuller); the first verdict counts 15 + 2 = 17 men; the stored rows 0 to 6 hold 17 of the 19 and no stored row holds Charles H Smith or Stephen Boothby, whose names the text layer has (offsets below). the 12 rows in error of the first verdict are confirmed: row 0 stored - 1 TT All. for Samuel H Allen; rows 1, 3, 5, 6 hold 3, 2, 7 and 2 printed lines; rows 7 to 13 are fragments of the prose list Discharged and Deceased in 1862.
  * Not in the first verdict (printed line that no stored line accounts for): Charles H Smith, Major, Eastport, Feb 16 '63, remark 'Prom. Lieut. Col. & Col.' (first line of the block Joined Field and Staff since Nov. 1, 1862 of the 1st Maine Cavalry return); the name stands in the pinned text ME-AGR-1863-APPD.1863 at offset 697204 (leaf 224) and in no stored row of the page
  * Not in the first verdict (printed line that no stored line accounts for): Stephen Boothby, Major (ditto), Portland (second line of the same block; remark 'Prom. to Lieut. Col.'); the name stands in the pinned text ME-AGR-1863-APPD.1863 at offset 697222 (leaf 224) and in no stored row of the page
* `annualreportofad1863main/685`: rows 5 and 6: the print shows [Aug. at the right end of the line of Charles Alexander and, on the line below, the remark In charge 2d div. hosp. since of Joseph B Baxter: the run-over belongs to the row below (tesseract and the text layer agree with each other on the stored text and not with the layout of the print); row 13 is the printed note Rank not shown in present organization at close of company returns (no person); row 11 prints Charles H Parlin (stored IT); row 14 prints James D Maxfield with the remark promoted Sergt. Major from company A; disc. for disability Sept. 9 (stored 1) and Sopt.).
* `cu31924080774148/117`: 40 stored lines compared at D and R: 17 lines with a date that differs from the print (rows 0, 1, 9, 15 to 21, 23, 24, 27, 28, 30, 31, 39), 7 lines with another remark difference (rows 2, 3, 4, 26, 31, 32, 38); the first sitting's one error (row 20, Joshua 0. for Joshua O.) is confirmed; this page is not in the lowest OCR-confidence decile.
* `massachusettssol21931mass/143`: all 10 rows in error of the first verdict are errors against the print (1S63, 1S62 and 1S65 for 1863, 1862 and 1865 in rows 1, 3 and 13: the digit 8 of the typeface read as S; Xov. for Nov. in rows 4 and 5; L'. S. and f. S. for U. S.; Batten,- for Battery; Millburj- for Millbury; clergjTnan; Gk)rham; disabiUty); the 6 other rows agree with the print (spacing and punctuation apart).
* `massachusettssol21931mass/661`: all 4 rows in error of the first verdict are errors against the print (Ist for 1st in the rank of row 4; Gcnl. for Genl. in row 10; Maiden for Malden in row 13; Ist and let for 1st in row 15); the 12 other rows agree with the print (Charlestow-n differs by a hyphen only).

What the second sitting does not claim: it is the same role as the first, not an independent person; on the pages it re-read it had the first verdict and the stored lines in front of it, so it confirms recorded disagreements against the page (every stored line of those pages was compared with the print, and no difference was found that the first verdict had not recorded, except the two missed lines of leaf 224 and the levels D and R of leaf 117, which the first sitting had not compared); it re-read 5 of the 35 pages, and the other 30 pages stand on the first sitting alone (1 of them on the second sitting alone: draw position 2 of MA-SSM-officers).

### 2.6 The same without the lowest-decile pages

The draw takes at least a third of the pages of a stratum from its lowest OCR-confidence decile, which are the pages with the most damage, and the plan counts them in the pooled sample. To see how far the failures depend on them, the table counts only the pages that are not in the lowest decile: errors / lines compared (one-sided 95 percent lower bound of the error rate; * = 4 or more errors). A cell is empty where that level was not compared on those pages.

| stratum | pages not in the decile (lines) | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |
|---|---|---|---|---|---|
| MA-SSM-officers | 2 (35) | 1 / 35 (0.15 percent) | 1 / 35 (0.15 percent) | 1 / 35 (0.15 percent) | 5 / 35 (5.8 percent) * |
| MA-SSM-other | 2 (49) | 4 / 49 (2.84 percent) * | 0 / 49 (0.0 percent) | 0 / 49 (0.0 percent) | 2 / 49 (0.73 percent) |
| ME-GET-officers | 2 (58) | 3 / 58 (1.42 percent) |  | 0 / 58 (0.0 percent) | 2 / 58 (0.62 percent) |
| ME-GET-other | 2 (119) | 6 / 119 (2.22 percent) * |  | 3 / 119 (0.69 percent) | 7 / 119 (2.79 percent) * |
| ME-IDX-officers | 2 (36) | 6 / 36 (7.52 percent) * |  | 1 / 36 (0.14 percent) | 14 / 36 (25.27 percent) * |
| ME-IDX-other | 2 (36) | 11 / 36 (18.18 percent) * |  | 15 / 36 (27.72 percent) * | 17 / 36 (32.75 percent) * |
| ME-RET-officers | 1 (15) | 3 / 15 (5.68 percent) | 1 / 15 (0.34 percent) | 0 / 15 (0.0 percent) | 2 / 15 (2.42 percent) |
| ME-RET-other | 2 (97) | 11 / 97 (6.49 percent) * | 4 / 51 (2.72 percent) * | 0 / 97 (0.0 percent) | 42 / 51 (71.23 percent) * |
| NH-AYL-other | 2 (73) | 12 / 73 (9.77 percent) * | 6 / 40 (6.74 percent) * | 0 / 73 (0.0 percent) | 15 / 40 (24.73 percent) * |
| VT-REV-officers | 2 (77) | 1 / 77 (0.07 percent) | 17 / 40 (29.18 percent) * | 0 / 77 (0.0 percent) | 7 / 40 (8.51 percent) * |
| VT-REV-other | 3 (186) | 7 / 186 (1.78 percent) * | 29 / 70 (31.46 percent) * | 0 / 186 (0.0 percent) | 45 / 70 (53.82 percent) * |

Reading. Without the decile pages 9 of the 11 strata still reach 4 or more errors at one gate (MA-SSM-officers, MA-SSM-other, ME-GET-other, ME-IDX-officers, ME-IDX-other, ME-RET-other, NH-AYL-other, VT-REV-officers, VT-REV-other); 2 more have a gate whose lower bound is above 1.0 percent (ME-GET-officers, ME-RET-officers); 0 show neither. A stratum that does not reach 4 errors on the other pages still cannot pass: its lower bound is above the 1.0 percent of the requirement.

## 3. The claims of the closed items' reports, re-verified against their files

920 claims were recomputed from the files (script `pipeline2/roster_qa/qa_claims.py`, result `data2/qa/claims-check.json`): **920 hold, 0 do not.**

| item | what was recomputed | claims | hold |
|---|---|---|---|
| ledgers | ledger sha256 of the pinned text, page-index and page-number files | 63 | 63 |
| union-ma | company lines | 24 | 24 |
| union-ma | cross-reference lines | 24 | 24 |
| union-ma | field and staff, non-commissioned staff and band lines | 24 | 24 |
| union-ma | flag file unit_file_raw_lines_sha256 equals the unit file | 24 | 24 |
| union-ma | lines | 24 | 24 |
| union-ma | lines with damage code C | 1 | 1 |
| union-ma | lines with damage code G | 1 | 1 |
| union-ma | lines with damage code H | 1 | 1 |
| union-ma | lines with damage code N | 1 | 1 |
| union-ma | lines with damage code Q | 1 | 1 |
| union-ma | lines with damage code R | 1 | 1 |
| union-ma | lines with damage code W | 1 | 1 |
| union-ma | lines with damage code Y | 1 | 1 |
| union-ma | manifest sha256 of the files kept locally | 36 | 36 |
| union-ma | ocr_uncertain lines | 1 | 1 |
| union-ma | on the rolls inferred yes / no / unknown | 24 | 24 |
| union-ma | pointer file bytes of the files kept locally | 36 | 36 |
| union-ma | pointer file sha256 of the files kept locally | 36 | 36 |
| union-ma | pointer file: bytes of the flag file | 24 | 24 |
| union-ma | pointer file: bytes of the unit file | 24 | 24 |
| union-ma | pointer file: rows of the unit file | 24 | 24 |
| union-ma | pointer file: sha256 of the flag file | 24 | 24 |
| union-ma | pointer file: sha256 of the raw lines of the unit file | 24 | 24 |
| union-ma | pointer file: sha256 of the unit file | 24 | 24 |
| union-ma | remark names Gettysburg | 24 | 24 |
| union-ma | summary | 4 | 4 |
| union-ma | the code table of the report lists every damage code of the flag files | 1 | 1 |
| union-ma | unassigned lines | 24 | 24 |
| union-ma | verify_unit.py --all | 1 | 1 |
| union-ma | with a 1-3 July 1863 date | 24 | 24 |
| union-me | "Same" lines | 14 | 14 |
| union-me | all lines | 14 | 14 |
| union-me | index 1867 lines | 14 | 14 |
| union-me | manifest sha256 of the files kept locally | 12 | 12 |
| union-me | ocr_uncertain lines | 14 | 14 |
| union-me | on rolls inferred yes / no / unknown | 14 | 14 |
| union-me | participants 1898 lines | 14 | 14 |
| union-me | printed remark names Gettysburg | 14 | 14 |
| union-me | returns 1863 lines | 14 | 14 |
| union-me | summary | 3 | 3 |
| union-me | verify_unit.py --all | 1 | 1 |
| union-nh | flag file unit_file_raw_lines_sha256 equals the unit file | 4 | 4 |
| union-nh | lines | 4 | 4 |
| union-nh | lines with a damage code | 4 | 4 |
| union-nh | lines with code A | 4 | 4 |
| union-nh | lines with code C | 4 | 4 |
| union-nh | lines with code G | 4 | 4 |
| union-nh | lines with code H | 4 | 4 |
| union-nh | lines with code N | 4 | 4 |
| union-nh | lines with code Y | 4 | 4 |
| union-nh | manifest sha256 of the files kept locally | 24 | 24 |
| union-nh | on the rolls inferred yes / no / unknown | 4 | 4 |
| union-nh | pointer file bytes of the files kept locally | 24 | 24 |
| union-nh | pointer file sha256 of the files kept locally | 24 | 24 |
| union-nh | pointer file: bytes of the flag file | 4 | 4 |
| union-nh | pointer file: bytes of the unit file | 4 | 4 |
| union-nh | pointer file: rows of the unit file | 4 | 4 |
| union-nh | pointer file: sha256 of the flag file | 4 | 4 |
| union-nh | pointer file: sha256 of the raw lines of the unit file | 4 | 4 |
| union-nh | pointer file: sha256 of the unit file | 4 | 4 |
| union-nh | remarks name Gettysburg | 4 | 4 |
| union-nh | summary | 1 | 1 |
| union-nh | verify_unit.py --all | 1 | 1 |
| union-vt | "See ..." lines | 11 | 11 |
| union-vt | event dated 1-3 July 1863 | 11 | 11 |
| union-vt | lines | 11 | 11 |
| union-vt | lines under an officer heading | 11 | 11 |
| union-vt | manifest sha256 of the files kept locally | 5 | 5 |
| union-vt | name damaged | 11 | 11 |
| union-vt | ocr_uncertain | 11 | 11 |
| union-vt | on rolls inferred yes / no / unknown | 11 | 11 |
| union-vt | pointer file bytes of the files kept locally | 4 | 4 |
| union-vt | pointer file sha256 of the files kept locally | 4 | 4 |
| union-vt | remark names Gettysburg | 11 | 11 |
| union-vt | summary | 2 | 2 |
| union-vt | verify_unit.py --all | 1 | 1 |

* Two readings of the check were corrected before its first result: the Maine "Same" lines were first counted by the exact word (7 units differed by 1 to 5 lines) while the report counts the flag S, the printed ditto word with its OCR variants (`Samo`, `fcame`), which is the right definition; and the first run of the check (14 November, 01:30) found no Massachusetts report and no Massachusetts claims to check: the report exists since 01:18 and is checked here (the second sitting added its tables and the `unit_files` entries of the pointer files of New Hampshire and Massachusetts to `qa_claims.py`).

**Claims that did not hold when the second sitting started** (`data2/qa/claims-check-before-repair.json`: 53 of 919): union-ma: lines with damage code G (1); union-ma: lines with damage code N (1); union-ma: lines with damage code Y (1); union-ma: ocr_uncertain lines (all units) (1); union-ma: pointer file: bytes of the flag file (24); union-ma: pointer file: sha256 of the flag file (24); union-ma: the code table of the report lists every damage code of the flag files (1). All are claims of union-ma. Cause (Inferred from the file times and the legends of the flag files): the unit files and the flag files of the 24 Massachusetts units were rewritten on 14 November at 01:30, with flag rules extended after the first sample (a new code W, a wider N, G and Y; the legend of every flag file says "since 14 November 2026"), after the pointer file (01:13), `stats.json` and the report (01:18) had been written; the unit files came out byte for byte the same, the flag files did not. Before the repair the node test of the item failed 24 of 124 tests on "the pointer file records this file's size and sha256". Repair (15 November; the scripts of the item, nothing typed, no unit file, flag file or row changed): `ma_sources.py` (pointer file, manifest: the `generated` time and the bytes and sha256 of the 24 flag files changed, nothing else), `ma_stats.py` (only flag fields of `stats.json` changed: the codes G, N, Y, the new code W, the flag bytes and `ocr_uncertain`), `ma_report.py` (the flag-byte column, the code table with its legends and the new code W, the ocr_uncertain total, anomaly 3 and the line of EG-ROS-MA-03; every other line of the report is identical), `ma_closure.py` for the proposed entry EG-ROS-MA-03 (the code W added to its text) and a dated correction line under G-MA03 in `GAPS.md`. After the repair: 920 claims, 920 hold, 0 do not; the node test of the item 124 of 124.

* `verify_unit.py --all --root data2/union/me`: 15 files, 36,771 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/nh`: 4 files, 6,992 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/vt`: 11 files, 16,854 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/ma`: 24 files, 33,787 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `build_index.py --lint`: 53 of 640 units have a file, 90738 rows, 11583248 raw bytes, 2599566 gzipped bytes; **0 defects, 0 warnings**.
* `node --test docs/battle-theatre/app/tests/roster-union-nh.test.mjs`: 23 tests, 23 pass, 0 fail.
* `verify_unit.py --all` of 15 November (the planning step; log `GOVERNANCE/horde/ws-rosters/plan/verify-all-2026-11-15.jsonl`, read here): 54 files, 94,404 lines, **0 V1 name defects, 0 V3 page defects, 0 problems**.
* The four verify runs of 14 November were run directly, not through `tools/horde/bench.sh`; their logs do not hold the CPU times, which the first sitting recorded as under 30 s each (not re-measured); the `--all` figure above is the log of the planning step of 15 November. The lint and the two node tests were re-run on 15 November, directly and each under 1 s of CPU (measured with `time`: `build_index.py --lint` 0.5 s, `roster-union-nh` 0.25 s, `roster-union-ma` 0.64 s, `roster-qa` 0.14 s; `qa_claims.py` 1.0 s, `qa_current.py` 0.4 s). The logs read above are those outputs; the figures of this section are read from them, none is typed.

**An open question of the Maine report answered.** The report says of eight leaves of the index without text (328, 329, 560, 561, 838, 839, 1220, 1221) that "whether they are blank, plates or unread is not known". The scan data of the item (`supplementtoannu00main_scandata.xml`, Documented) gives `pageType Delete` and `addToAccessFormats false` for exactly these leaves, which are therefore not in the access PDF, and the printed page number advances by exactly one across each pair (319 to 320, 549 to 550, 825 to 826, 1205 to 1206; `PageMap.printed`). They are not book pages; no printed page of the index is missing there. The same holds for no other leaf of the item inside the range that carries stored lines (23 leaves of the item have no text; 15 lie before the first or after the last printed page).

**Claims not recomputed here (Not run):** statements of prose in the reports (for example the readings of the Official Records for the strength of the 2nd and 5th New Hampshire, the explanations of the Summary residuals, the unit-by-unit notes on the sources) are not checked by this item; the counts that depend on a rule of the item (the "on the rolls" inference) were checked for consistency with the flag files, not for the correctness of the rule.

## 4. The second-reading route

Route (Measured, `pipeline2/page_image.py` and `pipeline2/roster_qa/qa_render.py`): the item PDF from `https://archive.org/cors/<id>/<id>.pdf` (one request, 1.2 s after the previous one, generic client name), the leaf found through the scan data where the PDF has fewer pages than the item has leaves, the page cut out with pdftoppm at 300 dpi, the table rules whitened (a threshold relative to the page background: the Maine scans are grey, about 155 on a scale of 255, and a fixed threshold erased the text and made tesseract return nothing on two pages before it was fixed), tesseract 5.3.4 `eng` psm 6 at one thread (0.9 to 4.2 s of CPU a page on the pages looked at, from their read records). The PDFs are transient (955,974,126 bytes in all; kept on disk until the route test of 4.2 has run, then dropped with `qa_render.py drop`; sha256 in the pointer file).

### 4.1 What a second reading is worth, on the pages that were looked at

The comparison of qa_compare.py (every stored line AGREE when all its tokens are matched by the tesseract reading of the page, NEAR when only spacing differs, SUSPECT otherwise) against the verdict of the sample reader, on the pages looked at at all three levels:

| family | lines | in error (reader) | of them SUSPECT | of them AGREE | clean lines (reader) | of them AGREE | of them SUSPECT |
|---|---|---|---|---|---|---|---|
| ME-RET | 66 | 49 | 46 (94 percent) | 3 | 17 | 10 (59 percent) | 7 |
| VT-REV | 193 | 144 | 143 (99 percent) | 1 | 49 | 25 (51 percent) | 16 |
| NH-AYL | 77 | 57 | 57 (100 percent) | 0 | 20 | 12 (60 percent) | 6 |
| MA-SSM | 148 | 55 | 54 (98 percent) | 1 | 93 | 78 (84 percent) | 15 |

Reading. The comparison finds nearly every line that is in error (it is a good detector where the layout is one line of text per printed line: Vermont, Ayling, the Massachusetts volumes, the Maine returns) and it also marks a share of the lines that are right (tesseract's own errors on a damaged page): the SUSPECT list is a work list, not a verdict. Lines that both readings agree on and that were still in error (5 on these pages) show that agreement of two engines is not proof either; the sample reader looked at the page for every line. Two-column lists (Maine at Gettysburg) and the index pages (Maine) are read by tesseract as one run per printed line, so the line-level comparison is not usable there and was not used.

### 4.2 Agreement of the two engines on 20 pages per family

**Not finished when this report was written.** `qa_route_test.py run` (120 pages, about 8 s of CPU a page as measured on one page, so about 16 minutes) was submitted through `tools/horde/bench.sh` and was still waiting for a slot of the machine lock; the command, its output file (`GOVERNANCE/horde/ws-rosters/roster-qa/route-test.out`) and the writer of this section (`qa_report.py`) are in place: re-run `python3 -I pipeline2/roster_qa/qa_report.py` when `data2/qa/second-reading.json` exists. No number of this section is claimed until then.

### 4.3 Lines that the first layer lost, recovered

Each recovered row has its own locator: a text id of the ledger `data2/qa/pageread-ledger.json` (the tesseract reading of that page, pinned by sha256, kept under `tmp/library/rosters/_qa/pageread/`) and the offset of the first name character in it; V1 (the name tokens stand at the offset) and V2 (the remark tokens follow in order) were checked by `r2lib`; the line was cropped at 300 dpi and **looked at** before the row was written; the name is the OCR tokens of the derived text, never corrected. The rows are plain JSON beside the sample results (`data2/qa/recovered/union-vt.json`, `union-me.json`), never lines of a unit file: no existing row was changed and `verify_unit.py --all` does not see them. The second sitting looked at the stored crop of each of the 13 lines (transient files, not tracked) and wrote down the printed name, or the printed ditto word, that it reads there: 13 of 13 agree with the recovered name (`data2/qa/recovered/second-sitting-check.json`).

**Vermont (diag-no-name.json: the six printed lines whose name the text layer lost): 6 of 6 recovered.**

| unit | leaf (printed page) | name as read in the derived text | company, heading (carried from the stored neighbour) | V1 / V2 | the line as the first layer read it |
|---|---|---|---|---|---|
| u-vt-2nd-vermont-infantry | 79 (64) | `Higgins, William` | K, Privates. | True / True | `Shoreham, May '61 June 20/61 |Taken pris.. July 2, '62: Par. Aug. 5. "62; Prom. Corp. Dec.` |
| u-vt-6th-vermont-infantry | 202 (187) | `Daggett, Charles R.` | B, Privates. | True / True | `Putney. July '3/63 July '3/63 Drafted; joined ambulance train May 17, '64; died , in Hanov` |
| u-vt-13th-vermont-infantry | 514 (497) | `Drugg, Cliffus` | H, Privates. | True / True | `Stowe, Aug. 2s,,62lOct. 10/62 Must, out July 21, '63.` |
| u-vt-15th-vermont-infantry | 543 (526) | `Dennis Duhigg,` | NCS, Sergeant-Majors. | True / True | `Lyndon, Sept 17/62 Oct 22/62 Priv. Co. G. ; Prom. Sergt.-Maj. Nov. 14, "62; Must out Aug. ` |
| u-vt-15th-vermont-infantry | 559 (542) | `Samuel H. Kellogg,` | K, Corporals. | True / True | `Concord, Aug. 28/62 Oct. 22/6: Red. May 3. '63 ; Must, out Aug. 5. '63.` |
| u-vt-1st-vermont-cavalry | 246 (231) | `Langdon H. Nichols,` | C, Corporals. | True / True | `Roxbury, Oct. 3,-61 Nov. i9,'6i Taken pris. May 24, '62, and died at Lynchburg, Va., July ` |

**Maine (diag-index.json, 106 index lines of the units whose name the first layer did not read; 7 tried, one per call of the draw below the first seven of the list sorted by unit): 7 of 7 recovered.** Five of the seven are the printed ditto word `Same` (a man named on the line above); two are names (`Coan Elisha S`, `Ellis Osco A`). The first layer's y position of each line (word-box frame) divided by 1.68 equals the top of the line in the 300 dpi read within the distance given, which ties the recovered line to the lost one.

| unit | leaf (printed page) | name as read | rank, company, regiment, corps as read (not split) | V1 / V2 | y check (px, distance) |
|---|---|---|---|---|---|
| u-me-3rd-maine-infantry | 56 (48) | `same` | `Corporal 4 3 , do` | True / True | 1683, 2 |
| u-me-3rd-maine-infantry | 126 (118) | `Same` | `Corporal A | 3} | do` | True / True | 2021, 3 |
| u-me-4th-maine-infantry | 78 (70) | `Same` | `Sergeant B 4 do` | True / True | 1953, 4 |
| u-me-20th-maine-infantry | 103 (95) | `Coan Elisha S` | `(Private \ D 20 | do` | True / True | 1969, 1 |
| u-me-20th-maine-infantry | 201 (193) | `Same` | `Lieut. Colonel 20 do` | True / True | 1572, 1 |
| u-me-6th-maine-infantry | 31 (23) | `Same` | `‘Captain Cc 6 | do` | True / True | 741, 9 |
| u-me-1st-maine-cavalry | 162 (154) | `Ellis Osco A` | `Lieutenant E 1 do` | True / True | 1953, 4 |

Not tried: the other 99 lost Maine index lines (the route is proved on the 7; the rest is a batch job for round 2 of union-me, EG-ROS-ME-05: read the leaf, find the line by the y position, look at it); the 119 lines of the 1863 returns that the Maine item left out (`non_person_lines`: they are prose lists and notes whose names the text layer has, not lost names; the item registers them as a gap of cut, not of reading); **the Pennsylvania muster years on 2,039 pages and the Florida 6.1 percent** (no unit file of those items exists yet, so there is no row to which a second reading could be attached; owed to the round of roster-qa that follows their items).

## 5. Anomalies seen

1. **Two pages could not be read by tesseract at first** (Maine returns leaves 365 and 414: zero words, 0.2 s of CPU): the rule remover used a fixed grey threshold of 140 and the Maine scans are grey (about 155); it whitened the text with the rules. Fixed (threshold relative to the page background) before any verdict was written; the pages read afterwards are unaffected. Recorded because the next engineer meets the same scans.
2. **The page-number map and the PDF disagree on some items** (the PDF of the Maine index has 1,226 pages for 1,236 leaves; the MA volumes 1 and 2 are mapped through the scan data): `page_image.leaf_to_pdf_page` handled all of them; every rendered page was checked by the share of its words in the pinned leaf (all above 0.7; lowest see 4.2).
3. **The digit 8 of the Massachusetts typeface is inked like an S** in many places (`1S62`, zoom at 600 dpi): the first layer reads S. Counted as an error in the date (the printed meaning is a year); the page shows what a reader sees.
4. **Two lines of one source are both "Same".** The index prints the ditto word `Same` for a man named above; a stored `Same` row has no man: which man is read from the line above in print and is not in the row (flag S). Three `Same` rows of one page belonged to three different men.
5. **Printed lines of the units are missing on the pages looked at** (`missed_lines` in the verdicts and the addenda): 13 in all (3rd Maine C-company index lines, 7th Maine lines, one line of the 1st Cavalry, the 2nd Battery and others; on the returns leaf 224 two printed men whose names stand in the text layer and in no stored row, found by the second sitting); the Maine item registers the unreadable-unit lines (EG-ROS-ME-05) but not these, whose regiment cell was read and whose line was not stored.
6. **Run-over lines of table remarks** (a remark that wraps is printed with its overflow bracketed at the right of the line below or above it: `[for wds.`, `[May 12, '64.`, on Vermont leaf 117 `['63, for disab.` stands on the line above the remark it completes and `[19, '65.` on the line below) are stored on the row of the line they stand beside in Vermont, Maine returns and the Massachusetts margin; the printing convention is the cause, the geometry rule cannot tell.
7. **Draw position 2 of MA-SSM-officers was passed over by the first sitting** (it looked at positions 1 and 3; no file records why) and the first report called the sample a prefix of the draw order; the second sitting looked at the page (leaf 631: 19 lines, 4 in error) and section 2.1 states the prefix test from the verdicts.
8. **A verdict miscounted the men of a printed table** (Maine returns, leaf 224, 1st Cavalry): the first verdict counts 17 men (15 in the table and 2 below); the print shows 19 (the block Joined Field and Staff since Nov. 1, 1862 has 4 men); the text layer holds all 19 names, the stored rows 17 of them. Recorded in the addendum of the page (section 2.5); no stored line was changed.
9. **Copy audit (Law; rule 6 of the task).** A word search (AI, Claude, Anthropic, agent, subagent, LLM, GPT, artificial intelligence) over the 195 files this item wrote under `data2/qa`, `GOVERNANCE/horde/ws-rosters/roster-qa` and the pointer file found 2 file(s) with a hit: `docs/battle-theatre/rosters/data2/qa/round2/pages/rosterofnorthcar02nort-0192.verdict.json`: Ai; `docs/battle-theatre/rosters/data2/qa/pages/maineatgettysbur01main-0513.verdict.json`: Ai. The hits are words of the sources or of their text layers, not statements about how this work was made; the context of the first hit of each file is: `maineatgettysbur01main-0513.verdict.json`: "...infantry#2457",    "name": "Ai Waterhouse",    "off": 1128..."; `rosterofnorthcar02nort-0192.verdict.json`: "...  ],    "stored": "Adolphus Ai Moss",    "printed": "Adolp...". They are kept as stored (Law 1 and 4). None of these files is loaded by the roster page; `data2/qa` is a work area and must not be packed (request note `GOVERNANCE/horde/requests/bt-rosters-roster-qa-work-files.md`); the derived-text ledger is kept there, not under `data2/sources/`, because the packer audits that folder for statements of how a file was made.

## 6. Sources and rights

Only the item PDFs of sources that the four items parsed were fetched (archive.org `/cors/` only; one request at a time, 1.2 s apart; no login, key or workaround). The pointer file `rosters/sources/roster-qa.json` (form roster2-sources-pointer/1) lists identifier, title, year, url, bytes, sha256 of each PDF and scan-data file and the rights block copied from the pointer file of the item that parsed the source; the manifest is `tmp/library/rosters/MANIFEST-roster-qa.json`. The basis "public domain (United States publication before 1929)" appears only where that is true (imprint 1863 to 1898); **the two Massachusetts volumes (printed 1931) carry the basis the Massachusetts item wrote: after the 1929 cutoff, public domain not established by the date, Internet Archive flag NOT_IN_COPYRIGHT, owner step 4 open (EG-ROS-MA-01).** The derived texts (tesseract readings of single pages) carry the rights of the item they were read from.

| source id | volume | Internet Archive item | printed year | PDF bytes | PDF sha256 | rights basis |
|---|---|---|---|---|---|---|
| ME-AGR-1863-APPD | - | `annualreportofad1863main` | 1863 | 97,509,913 | `d77de6af...75e1635c` | public domain (United States publication before 1929) |
| ME-SUPP-1867 | - | `supplementtoannu00main` | 1867 | 87,612,393 | `cc4dd37f...b3150ae7` | public domain (United States publication before 1929) |
| ME-GETT-1898 | - | `maineatgettysbur01main` | 1898 | 36,209,220 | `f187290d...cafa3961` | public domain (United States publication before 1929) |
| NH-AYLING-1895 | 1 | `cu31924096263128` | 1895 | 66,582,516 | `a6d90192...4cffabec` | public domain (United States publication before 1929) |
| NH-AYLING-1895 | 2 | `cu31924096263136` | 1895 | 78,255,418 | `b45802d1...2f4e5757` | public domain (United States publication before 1929) |
| VT-ROSTER-1892 | 1 | `cu31924080774148` | 1892 | 67,408,335 | `df49af98...0bb600a4` | public domain (United States publication before 1929) |
| MA-SSM-1931 | 1 | `massachusettssol11931mass` | 1931 | 63,757,338 | `86b9901e...c687003b` | printed 1931 (state publication, NORWOOD, MASS. PRINTED AT THE NORWOOD PRESS), after the 1929 cutoff: public d |
| MA-SSM-1931 | 2 | `massachusettssol21931mass` | 1931 | 67,278,670 | `c76ba611...97d4d6b1` | printed 1931 (state publication, NORWOOD, MASS.), after the 1929 cutoff: public domain is not established by t |
| NC-MOORE-1882 | 1 | `rosternorthcaro00moorgoog` | 1882 | 26,310,300 | `bf870c7b...5bfab123` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 1 | `05913252.3309.emory.edu` | 1882 | 23,839,734 | `1dda26b2...5805c3c1` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 2 | `rosterofnorthcar02nort` | 1882 | 53,035,273 | `6c66da28...38ccaeab` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 2 | `05913252.3310.emory.edu` | 1882 | 30,304,591 | `e59c6997...f8a55f36` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 3 | `rosterofnorthcar03moor` | 1882 | 118,245,709 | `cd19cd7b...465cf299` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 3 | `05913252.3311.emory.edu` | 1882 | 29,467,409 | `38d20850...b829cd92` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 4 | `rosterofnorthcar04moor` | 1882 | 88,928,230 | `5d70f052...3a96742e` | public domain (United States publication before 1929) |
| NC-MOORE-1882 | 4 | `05913252.3312.emory.edu` | 1882 | 14,905,058 | `80fda651...4b120121` | public domain (United States publication before 1929) |

Rights per name: a recovered row names its derived text (`QA-PAGEREAD.<identifier>-<leaf>`), whose ledger entry gives the item, the leaf, the sha256 of the PDF and of the text, and the rights note above.

## 7. Gaps, defects returned, owed

Registered (lines appended to `rosters/GAPS.md` as G-QA01 to G-QA06: G-QA01 is EG-ROS-QA-01, G-QA02 to G-QA05 are the defect lists of 2.4 of the four items (also EG-ROS-QA-01), G-QA06 is EG-ROS-QA-02 to -05; proposed entries under `GOVERNANCE/horde/ws-rosters/proposed-register/roster-qa-EG-ROS-QA-*.md`; none is in `register/` yet):

* **EG-ROS-QA-01** R-G9 not passed: every stratum of the four items fails (section 2.2); the items may not be published as checked; the defect lists of 2.4 go back to the parsers of union-me, union-nh, union-vt and union-ma, and a fresh draw (seed with the round number) of every stratum is owed after each fix.
* **EG-ROS-QA-02** Gates not decided by this round: the strata and gates shown OPEN in 2.2 (for example R-G1 of the Vermont officers pages: 1 error in 114 lines; the structure gate of New Hampshire: 0 in 110) need 299 to 628 lines each; no pass is claimed.
* **EG-ROS-QA-03** The cells sidecar of the Vermont files (the page-order reading of the lines flagged O) is not sampled; the unit-file line stays in text-layer order by design.
* **EG-ROS-QA-04** Second reading of the Maine index lost lines beyond the 7 tried (99 left), of the lines that the first layer stored garbled (every `_other-ME-SUPP-1867` line on the pages looked at had a garbled rank or regiment cell), and of the Pennsylvania muster years and the Florida losses (items not built yet).
* **EG-ROS-QA-05** Printed lines of the units missing in the stored lines (section 5, item 5): index lines whose regiment cell was read and two men of the 1st Maine Cavalry return (leaf 224, Charles H Smith and Stephen Boothby, names in the text layer, no stored row); not counted as unreadable-unit lines by the Maine item.

Owner steps: none new. Delegated decisions made here: DD-ROS-QA-01 to DD-ROS-QA-05 (appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`).

**Not run in this item:** a browser, any timing, a real-GPU or phone check; the Pennsylvania and Florida tests; the cells sidecar; more than 2 to 5 pages per stratum; the 299 to 628 lines per stratum of the plan (every stratum failed first); an independent third person as reader of the disagreements (the second sitting is the same role and re-read 5 of the 35 pages).

## 8. Round 2: North Carolina (work item conf-nc, Moore 1882)

Written 16 November 2026, 03:44 UTC by the roster workstream, appended to this report by `qa_report.py` (sections 0 to 7 are round 1 and are unchanged; their numbers are those of 15 November). Round 2 is run with the same tools as round 1 (`RQA_ROUND=2`: `qa_lib.py` writes to `data2/qa/round2` and reads the 41 unit files of conf-nc; `qa_frame.py` builds the frame and the draw with its own seed; `qa_render.py`, `qa_compare.py`, `qa_verdict.py` and `qa_stats.py` are unchanged); the round 1 evidence is not touched. Every number below is computed by `pipeline2/roster_qa/qa_report_r2.py` from `data2/qa/round2/`, the unit files and the flag files; none is typed.

### 8.0 Summary

* **The sample (Measured).** 25 pages, 939 stored lines compared with the print, in 4 strata (two scans of the Moore roll x officers pages and other pages), seeded draw (seed `roster-qa-round2-2026-11-16`, 1,305 pages and 54,236 lines in the frame; at least a third of every stratum's pages from its lowest OCR-confidence decile), every page looked at one by one with the Read tool on the page image (the item PDF through `archive.org/cors`, one page cut out with pdftoppm, transient, never stored).
* **Result (Measured).** **4 of 4 strata fail at least one gate by the ladder of PLAN.md 4.4** (4 or more errors at the gate; the ladder allows 3 at its largest sample of 773 lines): 16 of the 16 gate cells fail; **no stratum passes R-G9, and conf-nc may not be published as checked.** Every gate cell is decided.
* **What is wrong (Measured, section 8.4).** The text layer differs from the print in characters (the digit 6 read 0, G, B or (; the digit 1 read l, i or I; the letter e read c, o or a mark; m read in or rn; whole names garbled) and, more than in the four Union items, in the cut of the entries: the text layer runs the entries of a roll together, so that the first words of the next entry stand at the end of a line (rem-extra), a name loses its first word or its initials (name-cut), the rank word or the carried heading stands in the name or in the rank field, and two or more printed entries are stored as one line (merge). The flag files mark only part of the lines in error (section 8.4).
* **The texts differ (Measured, section 8.4).** The roll was read from two scans of the same print, and the file of each unit is built from the scan with the better measured score; the texts differ in what the pages show: of the texts with at least 30 compared lines, the lowest share of lines with a name error is 4.8 percent (NC-MOORE-1882.3, 12 of 251 lines) and the highest 35.7 percent (NC-MOORE-1882.1, 25 of 70 lines); the table of 8.4 gives every text.
* **Verdicts against the files (Measured, section 8.3).** The stored lines of every page that was looked at are the lines its verdict lists (21 of 25 pages identical, 4 with the same lines under new row numbers because the rebuild of the item removed lines earlier in the file; 939 lines; `qa_current.py`).
* **The claims of the conf-nc report (Measured, section 8.6).** 1,501 claims of the report (per-unit lines, damage codes, flags, company letters, field and staff lines, totals, file sizes and sha256 values of the pointer file) were recomputed from the unit files, the flag files and the pointer file: 1,474 hold, 27 do not hold; they are listed in 8.6.
* **The second-reading route (Measured, section 8.7).** The test on 20 pages per Moore scan family is OWED: it was queued through the machine lock and had not run when this section was written.

### 8.1 Lines per unit against the strength

"Strength" is the value of the baseline order of battle (`baseline/dist/data/oob`, second hand, from Busey and Martin as the earlier families recorded it); **no strength range with a declared basis exists for these units** (`history/units.json` holds `strength: null` for the 41 units, as the conf-nc report says in its section 1). A whole-war roll is not comparable with the strength present on 1 to 3 July 1863: Moore prints every man who served in a unit at any time of the war. "Printed total" is Moore's own count of the regiment or battalion, read by the conf-nc item from the Recapitulation; it is shown as the report gives it (`reports/conf-nc.md` 1.1) and is not read again here.

| unit | lines in the file | baseline strength | lines / strength | scan the file was read from | pages of the sample that hold a line of the unit | lines of the unit on those pages | of them in error |
|---|---|---|---|---|---|---|---|
| 11th North Carolina Infantry | 1,393 | 617 | 2.26 | NC-MOORE-1882.1~b (1,393) | 0 | 0 | 0 |
| 12th North Carolina Infantry | 1,562 | 219 | 7.13 | NC-MOORE-1882.1~b (1,562) | 1 | 47 | 6 |
| 13th North Carolina Infantry | 1,455 | 232 | 6.27 | NC-MOORE-1882.1~b (1,455) | 1 | 32 | 30 |
| 14th North Carolina Infantry | 1,476 | 292 | 5.05 | NC-MOORE-1882.1~b (1,476) | 0 | 0 | 0 |
| 16th North Carolina Infantry | 1,435 | 321 | 4.47 | NC-MOORE-1882.2 (1,435) | 5 | 195 | 49 |
| 18th North Carolina Infantry | 1,752 | 346 | 5.06 | NC-MOORE-1882.2~b (1,752) | 0 | 0 | 0 |
| 1st North Carolina Cavalry | 1,658 | no baseline row | - | NC-MOORE-1882.1~b (1,658) | 0 | 0 | 0 |
| 1st North Carolina Infantry | 1,582 | 359 | 4.41 | NC-MOORE-1882.1~b (1,582) | 0 | 0 | 0 |
| 20th North Carolina Infantry | 1,208 | 372 | 3.25 | NC-MOORE-1882.2~b (1,208) | 0 | 0 | 0 |
| 21st North Carolina Infantry | 1,363 | 472 | 2.89 | NC-MOORE-1882.2 (1,363) | 4 | 140 | 20 |
| 22nd North Carolina Infantry | 1,951 | 263 | 7.42 | NC-MOORE-1882.2~b (1,951) | 0 | 0 | 0 |
| 23rd North Carolina Infantry | 1,461 | 406 | 3.60 | NC-MOORE-1882.2~b (1,461) | 0 | 0 | 0 |
| 26th North Carolina Infantry | 1,927 | 843 | 2.29 | NC-MOORE-1882.2~b (1,927) | 0 | 0 | 0 |
| 28th North Carolina Infantry | 1,815 | 346 | 5.25 | NC-MOORE-1882.2~b (1,815) | 0 | 0 | 0 |
| 2nd North Carolina Battalion | 552 | 240 | 2.30 | NC-MOORE-1882.4~b (552) | 0 | 0 | 0 |
| 2nd North Carolina Cavalry | 1,291 | no baseline row | - | NC-MOORE-1882.2~b (1,291) | 0 | 0 | 0 |
| 2nd North Carolina Infantry | 1,359 | 247 | 5.50 | NC-MOORE-1882.1~b (1,359) | 1 | 17 | 11 |
| 30th North Carolina Infantry | 1,538 | 233 | 6.60 | NC-MOORE-1882.2~b (1,538) | 0 | 0 | 0 |
| 32nd North Carolina Infantry | 1,296 | 465 | 2.79 | NC-MOORE-1882.2~b (1,296) | 1 | 18 | 10 |
| 33rd North Carolina Infantry | 1,708 | 291 | 5.87 | NC-MOORE-1882.2~b (1,708) | 0 | 0 | 0 |
| 34th North Carolina Infantry | 1,343 | 310 | 4.33 | NC-MOORE-1882.2~b (1,343) | 0 | 0 | 0 |
| 37th North Carolina Infantry | 1,761 | 347 | 5.07 | NC-MOORE-1882.3 (1,761) | 0 | 0 | 0 |
| 38th North Carolina Infantry | 1,273 | 221 | 5.76 | NC-MOORE-1882.3 (1,273) | 1 | 41 | 1 |
| 3rd North Carolina Infantry | 1,699 | 479 | 3.55 | NC-MOORE-1882.1~b (1,699) | 2 | 81 | 14 |
| 43rd North Carolina Infantry | 1,238 | 568 | 2.18 | NC-MOORE-1882.3~b (1,238) | 0 | 0 | 0 |
| 45th North Carolina Infantry | 1,433 | 431 | 3.32 | NC-MOORE-1882.3 (1,433) | 2 | 84 | 7 |
| 47th North Carolina Infantry | 1,283 | 567 | 2.26 | NC-MOORE-1882.3 (1,283) | 1 | 54 | 5 |
| 4th North Carolina Cavalry | 881 | no baseline row | - | NC-MOORE-1882.3 (881) | 0 | 0 | 0 |
| 4th North Carolina Infantry | 1,590 | 252 | 6.31 | NC-MOORE-1882.1~b (1,590) | 0 | 0 | 0 |
| 52nd North Carolina Infantry | 1,296 | 553 | 2.34 | NC-MOORE-1882.3 (1,296) | 0 | 0 | 0 |
| 53rd North Carolina Infantry | 1,316 | 375 | 3.51 | NC-MOORE-1882.3 (1,316) | 2 | 72 | 4 |
| 55th North Carolina Infantry | 1,206 | 640 | 1.88 | NC-MOORE-1882.3 (1,206) | 0 | 0 | 0 |
| 57th North Carolina Infantry | 1,032 | 326 | 3.17 | NC-MOORE-1882.3~b (1,032) | 0 | 0 | 0 |
| 5th North Carolina Cavalry | 1,323 | no baseline row | - | NC-MOORE-1882.4 (1,323) | 0 | 0 | 0 |
| 5th North Carolina Infantry | 1,803 | 473 | 3.81 | NC-MOORE-1882.1~b (1,803) | 1 | 33 | 15 |
| 6th North Carolina Infantry | 1,788 | 443 | 4.04 | NC-MOORE-1882.1~b (1,788) | 1 | 55 | 28 |
| 7th North Carolina Infantry | 1,506 | 400 | 3.77 | NC-MOORE-1882.1~b (1,506) | 0 | 0 | 0 |
| Battery A, 1st North Carolina Artillery | 284 | 80 | 3.55 | NC-MOORE-1882.1~b (284) | 0 | 0 | 0 |
| Branch Artillery | 142 | no baseline row | - | NC-MOORE-1882.4~b (142) | 0 | 0 | 0 |
| Charlotte Artillery | 148 | no baseline row | - | NC-MOORE-1882.1 (148) | 2 | 70 | 25 |
| Rowan Artillery | 212 | 95 | 2.23 | NC-MOORE-1882.1~b (212) | 0 | 0 | 0 |
| **all** | **54,339** | | | | | **939** | **225** |

Reading the table. The files hold lines of men who served up to 1865 (a line per name entry of the printed roll, rank headings and officers included), so lines exceed the strength by a factor of 1.88 to 7.42 for the units with a baseline row (35 of 41); nothing is merged and nothing is capped. "Lines of the unit on those pages" counts the lines that were compared, not a sample estimate of the file.

### 8.2 The sample (design as run in round 2)

* **Frame.** A page is a leaf of an Internet Archive item that holds at least one stored line of conf-nc: 1,305 pages, 54,236 lines (the first draw of the item gave 54,387 lines on 1,310 pages including the 5 excluded pages). Excluded, as the pilot page was in round 1: the pages that an engineer of conf-nc or the author of the pilot had already looked at (rosterofnorthcar02nort leaf 130; 05913252.3310.emory.edu leaf 126; rosterofnorthcar02nort leaf 406; 05913252.3310.emory.edu leaf 392; 05913252.3310.emory.edu leaf 391). The frame was built on 16 November 2026 from the files as they stood; the sha256 of the raw lines of every file is in `data2/qa/round2/frame.json`; the item was rebuilt by its own engineer while the sample was taken (8.3 says what that changed).
* **Strata.** The roll is one source printed once and read from two scans, two text layers of the same print with different errors (the item picks, per unit, the scan with the better measured score). A stratum is therefore the scan x the kind of page: NC-MOO-E (the four Emory scans, Moore 1882, second scan (Emory University copies, identifiers 05913252.33NN.emory.edu)) and NC-MOO-G (the four Internet Archive scans, Moore 1882, first scan (Internet Archive items rosternorthcaro00moorgoog, rosterofnorthcar02nort, 03moor, 04moor)), each as officers pages (at least 3 lines and at least a quarter officer lines; rule in `qa_frame.py`) and other pages. Frame: NC-MOO-E-officers: 214 pages, 6,480 lines, 21 decile pages (damage score 0.297 or more); NC-MOO-E-other: 730 pages, 33,029 lines, 73 decile pages (damage score 0.300 or more); NC-MOO-G-officers: 71 pages, 1,999 lines, 7 decile pages (damage score 0.273 or more); NC-MOO-G-other: 290 pages, 12,728 lines, 29 decile pages (damage score 0.200 or more).
* **Draw.** As round 1 (sha256 of `seed | stratum | identifier | leaf`, decile pages at positions 1, 4, 7, ...). Order and decile of every stratum: `data2/qa/round2/draw.json`. Positions looked at: NC-MOO-E-officers 1,2,3,4; NC-MOO-E-other 1,2,3,4; NC-MOO-G-officers 1,2,3,4; NC-MOO-G-other 1,2,3,4,5,6,7,8,9,10,11,12,13.
* **Reader.** One sitting of the sample reader (16 November 2026), who had not written the parsers of conf-nc (before the first page it read the report of the item, the flag file of one unit and the five-line change of the head rule in `nc_parse.py` that the rebuild then in progress carried, to judge what the rebuild would change; it did not read the parser further). The page image is looked at with the Read tool (200 dpi view; 300 to 800 dpi crops for a doubtful character); tesseract 5.3.4 (psm 6, the table rules whitened first) is a pre-screen only and decides nothing. The company letter of a page that has no heading of its own is read from the running heads of the pages before and after it (Moore prints "Company X-Nth Regiment" on the odd pages). The third reader of the plan does not exist as a third person; a doubtful character, zoomed and still doubtful, is not counted as an error (the verdict says so in its note).
* **Levels, comparison rule, decision rule.** As in 2.1: levels N (name, rank or carried heading, company, existence and cut of the line), D (the dates of the remarks), R (the other remark words); the first pages of a stratum are compared at all three levels; a level that a stratum has already failed decisively (4 errors at the gate) is not compared on its further pages (`levels` in every verdict says what was compared; this stops the reading where the result is decided and does not lower a gate: a gate that was not decided is shown OPEN). Case, punctuation and spacing are ignored; every other differing character is an error. Gates and kinds as in 2.1; PASS needs the ladder (299 lines with 0 errors, 473 with at most 1, 628 with at most 2, 773 with at most 3), FAIL is 4 or more errors, never lowered.
* **What is new in the reading (round 2).** (1) The pages are single-column with one printed entry to a line or two, so the comparison is entry by entry; an entry whose text stands inside the remarks of the line before it is a `merge` at that line (not a missed line), an entry that no stored line holds at all is a missed line (`missed_lines`). (2) The first words or the initials of the next entry at the end of a line are `rem-extra` at that line and `name-cut` at the next one (each counted at its own gate). (3) A damaged carried heading (PRIVATES read PRIVATE-) is a `rank` error at every line under it, as in round 1 (ME-RET leaf 414); a page with such a heading says so in its note, as one defect that costs many lines.

### 8.3 Result per stratum

Errors / lines compared, one-sided 95 percent Clopper-Pearson upper bound, decision. R-G2 and R-G3b are counted only on pages looked at at that level.

| stratum | pages in the frame | lines in the frame | pages looked at (decile pages) | lines compared | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |
|---|---|---|---|---|---|---|---|---|
| NC-MOO-E-officers | 214 | 6,480 | 4 (2) | 102 | 21 / 102, 28.28%, **FAIL** | 15 / 102, 21.74%, **FAIL** | 4 / 102, 8.75%, **FAIL** | 22 / 102, 29.34%, **FAIL** |
| NC-MOO-E-other | 730 | 33,029 | 4 (2) | 181 | 18 / 181, 14.39%, **FAIL** | 27 / 102, 34.61%, **FAIL** | 29 / 181, 21.2%, **FAIL** | 8 / 102, 13.71%, **FAIL** |
| NC-MOO-G-officers | 71 | 1,999 | 4 (2) | 99 | 16 / 99, 23.51%, **FAIL** | 15 / 99, 22.37%, **FAIL** | 9 / 99, 15.33%, **FAIL** | 18 / 99, 25.76%, **FAIL** |
| NC-MOO-G-other | 290 | 12,728 | 13 (5) | 557 | 54 / 557, 12.01%, **FAIL** | 14 / 126, 16.82%, **FAIL** | 5 / 557, 1.88%, **FAIL** | 8 / 126, 11.16%, **FAIL** |

Pages looked at, one line each (stratum, draw position, D = in the lowest decile, levels, lines, lines in error, kind of the first error rows):

| page (identifier / leaf) | printed page | unit(s) | stratum | draw position | decile | levels | lines | in error | lines named as printed but stored only inside another line | printed lines with no stored line |
|---|---|---|---|---|---|---|---|---|---|---|
| `05913252.3309.emory.edu/62` | 46 | 2nd North Carolina Infantry | NC-MOO-E-officers | 1 | D | NDR | 17 | 11 | 0 | 1 |
| `05913252.3309.emory.edu/116` | 100 | 3rd North Carolina Infantry | NC-MOO-E-officers | 2 |  | NDR | 34 | 12 | 0 | 0 |
| `05913252.3310.emory.edu/580` | 570 | 32nd North Carolina Infantry | NC-MOO-E-officers | 3 |  | NDR | 18 | 10 | 0 | 0 |
| `05913252.3309.emory.edu/193` | 177 | 5th North Carolina Infantry | NC-MOO-E-officers | 4 | D | NDR | 33 | 15 | 2 | 0 |
| `05913252.3309.emory.edu/472` | 456 | 12th North Carolina Infantry | NC-MOO-E-other | 1 | D | NDR | 47 | 6 | 0 | 0 |
| `05913252.3309.emory.edu/250` | 234 | 6th North Carolina Infantry | NC-MOO-E-other | 2 |  | NDR | 55 | 28 | 0 | 0 |
| `05913252.3309.emory.edu/111` | 95 | 3rd North Carolina Infantry | NC-MOO-E-other | 3 |  | N | 47 | 2 | 0 | 0 |
| `05913252.3309.emory.edu/511` | 495 | 13th North Carolina Infantry | NC-MOO-E-other | 4 | D | N | 32 | 30 | 2 | 1 |
| `rosterofnorthcar02nort/191` | 175 | 21st North Carolina Infantry | NC-MOO-G-officers | 1 | D | NDR | 17 | 8 | 1 | 0 |
| `rosterofnorthcar03moor/291` | 283 | 45th North Carolina Infantry | NC-MOO-G-officers | 2 |  | NDR | 29 | 4 | 0 | 0 |
| `rosterofnorthcar02nort/192` | 176 | 21st North Carolina Infantry | NC-MOO-G-officers | 3 |  | NDR | 30 | 10 | 0 | 0 |
| `rosterofnorthcar02nort/32` | 22 | 16th North Carolina Infantry | NC-MOO-G-officers | 4 | D | NDR | 23 | 18 | 4 | 1 |
| `rosterofnorthcar02nort/20` | 10 | 16th North Carolina Infantry | NC-MOO-G-other | 1 | D | NDR | 40 | 21 | 0 | 0 |
| `rosterofnorthcar03moor/536` | 528 | 53rd North Carolina Infantry | NC-MOO-G-other | 2 |  | NDR | 31 | 4 | 0 | 0 |
| `rosterofnorthcar03moor/286` | 278 | 45th North Carolina Infantry | NC-MOO-G-other | 3 |  | NDR | 55 | 3 | 0 | 0 |
| `rosterofnorthcar02nort/38` | 28 | 16th North Carolina Infantry | NC-MOO-G-other | 4 | D | N | 41 | 4 | 0 | 0 |
| `rosterofnorthcar02nort/202` | 186 | 21st North Carolina Infantry | NC-MOO-G-other | 5 |  | N | 53 | 1 | 0 | 0 |
| `rosterofnorthcar02nort/14` | None | 16th North Carolina Infantry | NC-MOO-G-other | 6 |  | N | 52 | 1 | 0 | 0 |
| `rosterofnorthcar02nort/29` | 19 | 16th North Carolina Infantry | NC-MOO-G-other | 7 | D | N | 39 | 5 | 1 | 0 |
| `rosterofnorthcar02nort/217` | 201 | 21st North Carolina Infantry | NC-MOO-G-other | 8 |  | N | 40 | 1 | 0 | 0 |
| `rosterofnorthcar03moor/68` | 60 | 38th North Carolina Infantry | NC-MOO-G-other | 9 |  | N | 41 | 1 | 0 | 0 |
| `rosternorthcaro00moorgoog/384` | 351 | Charlotte Artillery | NC-MOO-G-other | 10 | D | N | 52 | 22 | 0 | 0 |
| `rosterofnorthcar03moor/512` | 504 | 53rd North Carolina Infantry | NC-MOO-G-other | 11 |  | N | 41 | 0 | 0 | 0 |
| `rosterofnorthcar03moor/352` | 344 | 47th North Carolina Infantry | NC-MOO-G-other | 12 |  | N | 54 | 5 | 0 | 0 |
| `rosternorthcaro00moorgoog/383` | 350 | Charlotte Artillery | NC-MOO-G-other | 13 | D | N | 18 | 3 | 0 | 0 |

**The verdicts against the files as they are now** (`qa_current.py`, `data2/qa/round2/verdicts-vs-files.json`, 2026-11-16T03:41:20Z): of 25 pages, 21 have exactly the lines of their verdict, 4 have the same lines under other row numbers (the rebuild of conf-nc removed lines earlier in the same unit file; offset, name, rank, company and remarks of every line are unchanged) and 0 have changed lines (939 lines in the verdicts). The frame was built from the first build of the item (54,387 lines in all); the rebuild of the item at 03:05 UTC on 16 November, with a changed rule for the heads of entries (`nc_parse.py`, a short lower-case word is no surname), leaves 54,339 lines in the 41 files now, and 29 of the 41 files differ from the frame hashes.

One page was looked at again against the rebuilt lines because its lines changed: `05913252.3309.emory.edu-0511.verdict.build1-0202-UTC.json`; the earlier verdict is kept under `data2/qa/round2/superseded/` and is not counted.

Reading the decisions. FAIL means 4 or more errors at the gate: more than the ladder allows even at 773 lines, whatever further lines are drawn. A gate shown OPEN is not decided and no pass is claimed. Lines of one page are not independent draws (a damaged heading costs every line under it; entries run together cost two lines at once); the plan's own arithmetic treats lines as independent and so does this table.

16 of 16 gate cells fail; of them 15 also have a one-sided 95 percent lower bound above 1.0 percent (the true rate is above the 1.0 percent of the requirement at that confidence).

### 8.4 What kinds of error, by stratum and by scan

Rows with the kind (a row with two kinds counts at both), from the verdicts of all levels compared (a level that was not compared on a page does not count there):

| kind | NC-MOO-E-officers | NC-MOO-E-other | NC-MOO-G-officers | NC-MOO-G-other | all |
|---|---|---|---|---|---|
| `name-char` | 12 | 14 | 11 | 47 | 84 |
| `name-cut` | 9 | 4 | 5 | 9 | 27 |
| `rank` | 3 | 28 | 4 | 4 | 39 |
| `merge` | 2 | 2 | 5 | 1 | 10 |
| `rem-char` | 12 | 6 | 12 | 7 | 37 |
| `rem-date` | 15 | 27 | 15 | 14 | 71 |
| `rem-missing` | 1 | 0 | 1 | 0 | 2 |
| `rem-extra` | 9 | 2 | 5 | 1 | 17 |

**The flag files and the lines in error (Measured).** Of the 225 lines found in error, 100 (44.4 percent) are marked ocr_uncertain by the flag file of the unit as it stood when the page was looked at; 100 (44.4 percent) carry at least one damage code of that file (N name, H head cut by a rule that is a reading, C company letter inferred, R rank text damaged, Y year or date damaged, G garbage marks, M possible second entry, W word damaged; the legend of each file is in the file); the other lines in error are lines that no pattern of the flag file matched. Rows in error by code: C 21, G 22, H 34, M 5, N 33, R 8, W 21, Y 15.

**How well the flag sees the errors (Measured, the pages compared at all three levels).** 429 lines were compared; the flag files mark 140 of them ocr_uncertain; 150 lines are in error; 71 of the lines in error are marked (recall 47.3 percent); 71 of the marked lines are in error (precision 50.7 percent). A mark is a pattern of damage that the parser knows, not a reading of the page: lines that no pattern matched are wrong as often as the flag misses them.

**The same two measures in the flag files as they are now (Measured, 25 of 25 pages, those whose lines are unchanged).** 100 of the 225 lines in error are marked (44.4 percent); on the pages compared at all three levels the flag marks 140 lines, 71 of the 150 lines in error are marked (recall 47.3 percent) and 71 of the marked lines are in error (precision 50.7 percent). These are the figures above: the flag files were not rewritten between the sitting and this report.

**The two scans (Measured).** Pooled over the pages looked at (not a stratified estimate: the number of pages per stratum is in 8.3, the draw puts a third of the pages in the lowest decile, and the stopping rule leaves the levels D and R on fewer pages):

| scan family | pages | lines compared | lines with a name error (R-G1) | lines with a structure error (R-G3a) | lines with any error at the pages compared at all three levels | lines at all three levels |
|---|---|---|---|---|---|---|
| NC-MOO-E | 8 | 283 | 39 (13.8 percent) | 33 (11.7 percent) | 82 (40.2 percent) | 204 |
| NC-MOO-G | 17 | 656 | 70 (10.7 percent) | 14 (2.1 percent) | 68 (30.2 percent) | 225 |

**The texts (Measured).** The same pages by the text (volume and scan) that holds the lines:

| text id | pages | lines compared | lines with a name error | lines with a structure error | lines at all three levels | of them in error |
|---|---|---|---|---|---|---|
| NC-MOORE-1882.1 | 2 | 70 | 25 (35.7 percent) | 2 (2.9 percent) | 0 | 0 (n/a) |
| NC-MOORE-1882.1~b | 7 | 265 | 32 (12.1 percent) | 33 (12.5 percent) | 186 | 72 (38.7 percent) |
| NC-MOORE-1882.2 | 9 | 335 | 33 (9.9 percent) | 11 (3.3 percent) | 110 | 57 (51.8 percent) |
| NC-MOORE-1882.2~b | 1 | 18 | 7 (38.9 percent) | 0 (0.0 percent) | 18 | 10 (55.6 percent) |
| NC-MOORE-1882.3 | 6 | 251 | 12 (4.8 percent) | 1 (0.4 percent) | 115 | 11 (9.6 percent) |

**Without the lowest-decile pages (Measured).** The decile pages hold the lines that the flag files mark most; the pooled rates above are upper estimates of a whole stratum. The same counts on the pages outside the decile:

| stratum | pages outside the decile | lines | R-G1 | R-G2 | R-G3a | R-G3b |
|---|---|---|---|---|---|---|
| NC-MOO-E-officers | 2 | 52 | 11 / 52 | 7 / 52 | 0 / 52 | 7 / 52 |
| NC-MOO-E-other | 2 | 102 | 9 / 102 | 25 / 55 | 0 / 102 | 6 / 55 |
| NC-MOO-G-officers | 2 | 59 | 8 / 59 | 2 / 59 | 1 / 59 | 4 / 59 |
| NC-MOO-G-other | 8 | 367 | 13 / 367 | 1 / 86 | 1 / 367 | 2 / 86 |

**Mechanisms seen (Measured; the counts are rows with the mechanism, taken from the notes of the verdicts):** a damaged carried heading is the rank of every line under it: 26; the first word or the initials of a name stand in the remarks of the line above: 21; the first words or initials of the next entry stand at the end of a line: 15; two or more printed entries stored as one line: 10; a carried heading stands where the printed rank belongs: 5.

**The pre-screen (Measured, `second-reading-detector.json`).** On the pages compared at all three levels, how often tesseract's comparison with the stored text points at the lines the reader found in error:

| scan family | lines at all three levels | lines in error | in error and marked SUSPECT | in error and marked AGREE | clean lines marked AGREE |
|---|---|---|---|---|---|
| NC-MOO-E | 204 | 82 | 73 (89.0 percent) | 8 | 58 of 122 (47.5 percent) |
| NC-MOO-G | 225 | 68 | 66 (97.1 percent) | 2 | 62 of 157 (39.5 percent) |

### 8.5 Defect list returned to conf-nc (dated 16 November 2026; stored lines are not changed)

What the parser or a second reading must change, from the verdicts (examples are the stored and the printed text of a recorded error; the page and the row are in `data2/qa/round2/pages/*.verdict.json`):

1. **A damaged carried heading is the rank of every line under it** (26 rows). Example, `05913252.3309.emory.edu/511`: stored `^PRIVATE-`, printed `PRIVATES`.
2. **The first word or the initials of a name stand in the remarks of the line above** (21 rows). Example, `05913252.3309.emory.edu/62`: stored `B. Hughes`, printed `James B. Hughes`.
3. **The first words or initials of the next entry stand at the end of a line** (15 rows). Example, `05913252.3309.emory.edu/62`: stored `Pitt co. James`, printed `Pitt co.`.
4. **Two or more printed entries stored as one line** (10 rows). Example, `05913252.3309.emory.edu/193`: stored `Joseph L. Hayes ... May 5th, '62. Frank Strange, 1st Lieu-t.; Cumberland co.; p. from 2d Lieutenant.`, printed `two entries, Joseph L. Hayes and Frank Strange, 1st Lieut.`.
5. **A carried heading stands where the printed rank belongs** (5 rows). Example, `05913252.3309.emory.edu/62`: stored `^FIELD AND STAFF`, printed `Assistant-Surgeon`.
6. **Characters of the text layer**: the digit 6 read 0, G, B or an opening bracket, the digit 1 read l, i or I (`Ist`, `ls%`), the digit 5 read o, the letter e read c, o or a mark, m read rn or in, u read ii, and whole names garbled (`Upcliurc&` for Upchurch); the rows of this kind are the `name-char`, `rem-char` and `rem-date` rows of 8.4; no parser rule repairs them (a stored line is the text layer as it reads), they need the second reading of the page image (EG-ROS-NC-02 of the item).
7. **Printed lines with no stored line**: 3 printed entries with no stored line at all (`missed_lines` of the verdicts); 10 printed entries stored only inside the remarks of another line (merge).

Strata and gates failed: NC-MOO-E-officers: R-G1/R-G2/R-G3a/R-G3b; NC-MOO-E-other: R-G1/R-G2/R-G3a/R-G3b; NC-MOO-G-officers: R-G1/R-G2/R-G3a/R-G3b; NC-MOO-G-other: R-G1/R-G2/R-G3a/R-G3b.

### 8.6 The claims of the conf-nc report, re-verified against its files

`qa_claims_nc.py` (2026-11-16T03:37:51Z; `data2/qa/round2/claims-check.json`) recomputed from the unit files, the flag files, the pointer file and the ledger: the per-unit lines, damage codes, ocr_uncertain, on-the-rolls, Gettysburg counts, company letters and field and staff lines of the report tables, the totals of its summary, the bytes and sha256 of the files named in its pointer file (the 41 unit files and flag files; the eight texts of the ledger), and the sha256 of the raw lines kept in each flag file. **1,501 claims were checked: 1,474 hold, 27 do not hold.**

* 1st North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1583, the files say 1582.
* 2nd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1361, the files say 1359.
* 3rd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1701, the files say 1699.
* 4th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1594, the files say 1590.
* 5th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1804, the files say 1803.
* 6th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1791, the files say 1788.
* 7th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1507, the files say 1506.
* 1st North Carolina Cavalry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1661, the files say 1658.
* 12th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1564, the files say 1562.
* 13th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1460, the files say 1455.
* 14th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1478, the files say 1476.
* 16th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1436, the files say 1435.
* 20th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1210, the files say 1208.
* 21st North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1364, the files say 1363.
* 23rd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1462, the files say 1461.
* 26th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1929, the files say 1927.
* 28th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1818, the files say 1815.
* 32nd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1297, the files say 1296.
* 33rd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1709, the files say 1708.
* 37th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1762, the files say 1761.
* 38th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1275, the files say 1273.
* 43rd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1239, the files say 1238.
* 45th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1434, the files say 1433.
* 52nd North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1297, the files say 1296.
* 57th North Carolina Infantry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1033, the files say 1032.
* 5th North Carolina Cavalry, reconciliation.json: the lines it reconciled equal the unit file: the report says 1325, the files say 1323.
* 2nd North Carolina Battalion, reconciliation.json: the lines it reconciled equal the unit file: the report says 553, the files say 552.

* verify_unit.py on the 41 files has not been run (owed): output expected in GOVERNANCE/horde/ws-rosters/roster-qa/r2/verify-nc.jsonl

### 8.7 The second-reading route on the Moore scans

NOT RUN: the test on 20 pages per scan family (`RQA_ROUND=2 python3 -I qa_route_test.py run`) is queued through `tools/horde/bench.sh` and had not been given a slot when this section was written; it is owed (G-QA06 of `GAPS.md` for round 1 and G-QA08 for round 2).

### 8.8 Sources and rights (round 2)

Only the item PDFs of the Moore scans that were drawn were fetched (archive.org `/cors/` only; one request at a time, 1.2 s apart; the file names of the Emory items differ from the identifiers, `page_image.pdf_remote_name`). The pointer file `rosters/sources/roster-qa.json` lists identifier, title, year, url, bytes and sha256 of each; the rights block is copied from `rosters/sources/conf-nc.json` (public domain, United States publication before 1929: Raleigh, 1882); the PDFs are transient (bytes and sha256 stay in the pointer file and in `tmp/library/rosters/MANIFEST-roster-qa.json`).

| text id | Internet Archive item | printed year | PDF bytes | PDF sha256 | rights basis |
|---|---|---|---|---|---|
| NC-MOORE-1882.1 | `rosternorthcaro00moorgoog` | 1882 | 26,310,300 | `bf870c7b...5bfab123` | public domain (United States publication before 1929) |
| NC-MOORE-1882.1~b | `05913252.3309.emory.edu` | 1882 | 23,839,734 | `1dda26b2...5805c3c1` | public domain (United States publication before 1929) |
| NC-MOORE-1882.2 | `rosterofnorthcar02nort` | 1882 | 53,035,273 | `6c66da28...38ccaeab` | public domain (United States publication before 1929) |
| NC-MOORE-1882.2~b | `05913252.3310.emory.edu` | 1882 | 30,304,591 | `e59c6997...f8a55f36` | public domain (United States publication before 1929) |
| NC-MOORE-1882.3 | `rosterofnorthcar03moor` | 1882 | 118,245,709 | `cd19cd7b...465cf299` | public domain (United States publication before 1929) |
| NC-MOORE-1882.3~b | `05913252.3311.emory.edu` | 1882 | 29,467,409 | `38d20850...b829cd92` | public domain (United States publication before 1929) |
| NC-MOORE-1882.4 | `rosterofnorthcar04moor` | 1882 | 88,928,230 | `5d70f052...3a96742e` | public domain (United States publication before 1929) |
| NC-MOORE-1882.4~b | `05913252.3312.emory.edu` | 1882 | 14,905,058 | `80fda651...4b120121` | public domain (United States publication before 1929) |

### 8.9 Anomalies seen (round 2; each is in the verdict of the page named)

1. **The page number of the text layer and the print differ.** `05913252.3309.emory.edu/62`: the text layer prints the running head page as 48 and the page map says 46 (the print says 46); `rosterofnorthcar02nort/14`: the page map has no printed page number for the leaf and the print shows 4. The stored `page` of a line is the page map's; the leaf and offset are exact.
2. **The first entry of a page can be missing from the stored lines although the text layer holds it.** `05913252.3309.emory.edu/62`: Charles C. Tew, Colonel (the first line of the 2nd North Carolina Infantry roll), is in the text layer and in no stored line (a garbled initial in the head: `('.`); `05913252.3309.emory.edu/511` (rebuilt file): B. P. Jenkins, 1st Sergt.; `rosterofnorthcar02nort/32`: C. M. McLeod, 1st Sergeant. The conf-nc report says that unparsed text is counted in the diagnostics; these lines are lines of the roll.
3. **A printed misprint is stored as printed.** `rosterofnorthcar03moor/536`: John F. Lipps, "pr. September 22d, '24" (the same capture as the line of Wm. C. Fletcher below, '64): the print says '24 and so does the stored line; it is not counted as an error, and a reader of the file sees a year before the enlistment of the man (enlisted 1862).
4. **A dash prints an unknown date.** `rosterofnorthcar03moor/536` ("e. --;") and `05913252.3309.emory.edu/250` ("Fullbright, --,"): the stored line keeps a bullet or nothing where the print has the dash (punctuation only, not an error, but the name field of `Fullbright` has no given name).
5. **Margin marks become letters (volume 3 page 344, `rosterofnorthcar03moor/352`).** The ink marks of the copy in the left margin (check marks) stand in the stored name of 3 of the 5 lines in error of this page as a stray letter or character in front of the name (`V Bowden, Rufus`, `J Carlisle, James PI.`, and a triangle in front of `Bowden, Wm.`); the other lines in error of the page are character misreads (`Bfockley` for Blockley, where the print has a speck on the l; `R S.` for P. S.). The free-text note of the verdict says "four of the five names carry a stray letter or character": that count is a slip of the note, the count here is made from the error lines of the verdict, which are as written. The same pattern as the Massachusetts margins of round 1 (section 5, item 3).
6. **The artillery pages of volume 1 in the first scan are dark and bold** (`rosternorthcaro00moorgoog/384` and `/383`, the Charlotte Artillery): 22 of 52 lines of leaf 384 have a name error (leaf 383: 3 of 18); the file of the unit is built from this text (conf-nc report, table of the text ids: NC-MOORE-1882.1, leaves 383 to 386).
7. **A damaged heading is inherited by every line under it** (`05913252.3309.emory.edu/511`: PRIVATES read PRIVATE- and NON-COMMISSIONED OFFICERS read XOX-COMMI8SIOXED OFFICERS; of the 32 lines of the page 28 carry a wrong rank word, and 30 lines are in error in all).
8. **A clean page can be marked uncertain wholesale** (`05913252.3309.emory.edu/472`): the flag file marks 47 of the 47 lines of the page ocr_uncertain (in the flag files as they are now: 47) because the company heading is damaged (flag C); 6 of the 47 lines are in error (the lines read well) and the company letter is right on every line (checked against the running heads of the neighbouring pages). The same measure on `rosterofnorthcar02nort/20`: the flag file marks 8 of 40 lines and 21 lines are in error (the free-text note of that verdict says that the flag file marks all 40 lines: a slip of the note, the verdict data and the file show 8); the flag does not follow the quality of the page in either direction.
9. **A rebuild while the sample was taken** (8.3): the lines of 4 verdict pages moved to other row numbers (same lines); the lines of 1 page changed after the first verdict, which is kept under `superseded/` and not counted, and the page was looked at again against the new lines (the Jenkins entry of `05913252.3309.emory.edu/511` lost the fragment line that the earlier build stored for its tail); 0 verdict pages differ from the files as they are now; the row number of a line in a unit file is not a stable name for it, its offset in the pinned text is.

### 8.10 Not run, owed

* The pages that the stopping rule left uncompared: the gates shown OPEN in 8.3 and the levels D and R of the strata whose first pages already failed them need fresh pages after conf-nc is corrected (a later round draws a new seed and excludes the pages of this one, `EXCLUDED_BY_ROUND` in `qa_frame.py`).
* The second reading of the damaged lines of conf-nc from page images (EG-ROS-NC-02 of the item; the route is tested in 8.7 and in section 4) and of the printed lines that no stored line holds; the Pennsylvania muster years (union-pa had no report when this section was written) and the Florida losses (conf-fl has no unit file).
* A third person as reader of the disagreements; a browser, any timing, a real-GPU or phone check (not part of this work).

