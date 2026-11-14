# Independent sample of the stored lines against page images, round 1 (Maine, New Hampshire, Vermont, Massachusetts) (work item roster-qa, OA03)

Written 14 November 2026, 01:31 UTC by the roster workstream. Evidence labels as in `PLAN.md`: **Measured** (a command run for this report produced it), **Documented** (a source text or a file says it), **Computed**, **Inferred**, **Not run**. Every number below is computed by `pipeline2/roster_qa/qa_report.py` from `data2/qa/` (frame, draw, one verdict file per page looked at, statistics, claims check, second-reading tests, recovered lines), the unit files and the logs under `GOVERNANCE/horde/ws-rosters/roster-qa/`; none is typed. No stored line, flag file or ledger of another item was changed.

## 0. Summary

* **The sample (Measured).** 34 pages of the four closed items were drawn by a seeded rule (seed `roster-qa-round1-2026-11-14`, 3,412 pages in the frame, 11 strata: six source families by layout, each split into pages of officers and other pages; at least a third of every stratum's pages from its lowest OCR-confidence decile) and **looked at** one by one with the Read tool on the page image (the item PDF through `archive.org/cors`, one page cut out with pdftoppm, transient, never stored). **1,139 stored lines were compared with the print** (name, rank or heading, company, and, where the stratum had not already failed the gate, dates and remarks). Page numbers, row numbers, the stored and the printed text of every difference are in `data2/qa/pages/*.verdict.json`.
* **Result (Measured).** **All 11 of 11 strata fail at least one gate decisively** (4 or more errors at the gate concerned, which is more than the ladder of PLAN.md 4.4 allows at its largest sample of 773 lines): R-G1 names failed in 9 strata, R-G2 dates in 6, R-G3 in 4 (structure) and 9 (reading of the remark). **No stratum passes R-G9; none of the four items may be published as checked.** Section 2.2 gives every count with its one-sided 95 percent Clopper-Pearson bound; where a gate is still open (too few lines to decide) the table says OPEN and no pass is claimed.
* **What is wrong (Measured, section 2.3).** The text layer differs from the print in characters (digits read as letters or as other digits, `1S63`, `'03`, `6i`; letters, `Julv`, `reed`, `Mclntire`, `II` for H; whole names garbled); the flag files mark only part of the lines in error. Besides: the ditto mark stored as the digits 66 (Maine returns), margin marks stored as letters (Massachusetts), run-in paragraphs and run-over lines stored as fragment rows or on the wrong row, several printed rows stored as one (Maine Field and Staff returns), rank words in the name field of officer lines (Maine at Gettysburg). The checks V1 to V3 cannot see any of this; the sample is the only check that does.
* **The claims of the four reports hold (Measured, section 3).** 546 claims of the reports of Maine, New Hampshire and Vermont (per-unit line counts, lines per segment, ocr_uncertain, on-the-rolls counts, Gettysburg counts, damage codes, totals), the flag-file hashes of all four items and every hash and size of the pointer files and ledgers kept locally were recomputed from the files: 546 hold, 0 do not. `verify_unit.py --all` on the four items: 54 files, 0 V1 and 0 V3 defects; `build_index.py --lint`: 0 defects; the 23 node tests of the New Hampshire item pass.
* **The second-reading route (Measured, section 4).** 13 of the 13 lines that the first layer lost and that were tried (the 6 Vermont lines of `diag-no-name.json` and 7 of the 106 Maine index lines of `diag-index.json`) were read by tesseract and are recovered, each with its own locator in a derived text (`data2/qa/pageread-ledger.json`) and confirmed by looking at the line on the page image; none is written into a unit file. The eight Maine index leaves without text are scanner-deleted leaves (`pageType Delete`) between consecutive printed pages: nothing is lost there. Compared with the first layer, tesseract marks as SUSPECT between 94 and 100 percent of the lines that the sample reader found in error (4.1); the agreement of the two engines on 20 pages per family is in 4.2.
* **Not run / owed (section 7).** The Pennsylvania muster years and the Florida 6.1 percent (no unit files of those items yet); the cells sidecar of the Vermont files (page-order reading of the lines flagged O) as a second reading; the 299 to 628 lines per stratum that the plan asks for were not reached because every stratum failed first; fresh pages after the parsers are fixed; browser, timing, real-GPU checks (not part of this work).

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
| union-vt | 3rd Vermont Infantry | 1,958 | 349 | 5.6 | 3 | 147 | 79 | 0 |
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
| union-ma | 9th Massachusetts Infantry | 1,692 | 412 | 4.1 | 1 | 25 | 2 | 0 |
| **all** | | **94,404** | | | | **1,139** | **405** | **13** |

Reading the table. The files hold lines of men who served up to 1865, several lines per man (index, return and participants list for Maine; a line per rank held for Vermont), so lines exceed the strength by a large factor, as the four reports say; nothing is merged. "Lines of the unit on those pages" counts the lines that were compared, not a sample estimate of the file. Lines that the first layer lost and the second reading recovered are not in the unit files and are not counted in "lines in the file" (section 4.4).

## 2. The sample

### 2.1 Design (as run)

* **Frame.** A page is a leaf of an Internet Archive item that holds at least one stored line of the four items (unit files and the `_other-` file of Maine): 3,412 pages, 94,312 lines. Excluded: the one pilot page that the author of the pilot read in development (`pilot/QA-SAMPLE.md`, Maine report 1863 book p. 579, leaf 798). The frame was built at its first run from the files as they stood; the sha256 of the raw lines of every file is in `data2/qa/frame.json`. **The 24 Massachusetts files were rewritten by their engineer during the run** (22 of 24 differ from the frame hashes; the lines read 33,748 at the frame and 33,787 now); the lines on every Massachusetts page that was looked at are identical (name, rank, company, remarks, offset) in the commits of 00:46 and 00:56 and in the current files, so the verdicts stand for the current files. The Maine, New Hampshire and Vermont files are unchanged since the frame.
* **Strata.** Source family by layout (6 families) x kind of page: an officers page holds at least 3 lines of which at least a quarter are officer lines (rule in `qa_frame.py`); all other pages are "other". Inside a stratum the damage score of a page is the share of its lines that the flag file marks ocr_uncertain; the lowest OCR-confidence decile is the 10 percent of pages (at least 1) with the highest score.
* **Draw.** Pages are ordered by sha256 of `seed | stratum | identifier | leaf` (a published, recomputable pseudo-random order); decile pages and other pages form two lists; the draw order takes a decile page at positions 1, 4, 7 and so on, so that every prefix of m pages holds at least m/3 decile pages (PLAN.md 4.4). The order of every stratum is in `data2/qa/draw.json`; a sample is a prefix of it. **Where the sample is not a prefix** (ME-RET-other: draw position 3 was looked at first and positions 1 and 2 after it; no page was passed over because of what it showed) the verdict file says the position of every page.
* **Reader.** The sample reader is the engineer of this item, who did not write or see the builders of the four items; the page image is looked at with the Read tool (200 dpi view of the page; 300 dpi crops of tables; zoom to 600 dpi for a doubtful character). Tesseract 5.3.4 (psm 6, 300 dpi, the table rules whitened first with a threshold relative to the page background) is a **pre-screen only**: it lists the stored tokens it does not read and the tokens it reads that the line lacks; the sample reader decides every line. A line that both readings agree on was still compared by eye with the page (names, headings, dates, remarks); the detector figures in 4.3 say how often two readings agreeing was not enough.
* **Levels.** N: name, rank or carried heading, company, existence and cut of the line; D: the dates of the remarks; R: the other words of the remarks. The first pages of every family were looked at at all three levels (the smoke sample, to see the kinds of error). A level that a stratum had already failed decisively (4 errors; the ladder allows 3 at 773 lines) was not looked at on its further pages; `levels` in each verdict says what was compared. This stops the work where the result is decided, it does not lower a gate: a gate that was not decided is shown as OPEN.
* **Comparison rule.** Case, punctuation and spacing are ignored (they are not errors); any other differing character is an error, a digit read as a letter included. The kinds of error (`qa_verdict.py`): `name-char` a character of the name differs from the print; `name-cut` the boundary of the name is wrong (rank word or part of the remarks in the name field, a name split); `name-nonperson` the stored name is no person (a heading, a fragment of a paragraph); `rank` the rank or the carried heading is wrong; `company` the company is wrong; `rem-char` a character of a remark word differs; `rem-date` a date or number of the remarks differs; `rem-missing` printed remark text is missing; `rem-extra` text that is not the line's stands in the remarks; `rem-bound` the remarks are those of another line; `rem-order` the printed words are all there but in another order; `rem-ditto` a printed ditto mark is stored as the digits 66; `merge` several printed lines stored as one; `split` one printed line stored as several. Gates: R-G1 = any `name-*` kind; R-G2 = `rem-date`; R-G3 structure = `rank`, `company`, `merge`, `split`; R-G3 reading of the remark = `rem-char`, `rem-missing`, `rem-extra`, `rem-bound`, `rem-order`, `rem-ditto`.
* **Decision rule (never lowered).** PASS when n >= 299 with 0 errors, n >= 473 with at most 1, n >= 628 with at most 2 or n >= 773 with at most 3 (one-sided 95 percent Clopper-Pearson upper bound 1.0 percent, `qa_lib.cp_upper`, which reproduces the values of PLAN.md 4.4); FAIL when 4 or more errors are found; OPEN otherwise. Lines of one page are not independent draws; the plan's own arithmetic treats them as such and so does this table (a caveat, not a change of rule).
* **What a page verdict states.** The sample reader looked at the page image and compared every stored line of the page with it (except lines named as unreadable; none was). The verdict carries the sha256 of the rendered page, of the PDF and of the tesseract text, the stored text of every line in error (`stored`) and the printed text (`printed`), and the printed lines of the units that no stored line accounts for (`missed_lines`).

### 2.2 Result per stratum

Errors / lines compared, one-sided 95 percent Clopper-Pearson upper bound, decision. R-G2 and R-G3 reading are counted only on pages looked at at that level.

| stratum | pages in the frame | lines in the frame | pages looked at (decile pages) | lines compared | R-G1 names | R-G2 dates | R-G3 structure | R-G3 reading of the remark |
|---|---|---|---|---|---|---|---|---|
| MA-SSM-officers | 19 | 329 | 2 (1) | 32 | 0 / 32, 8.94%, **OPEN** | 5 / 32, 30.08%, **FAIL** | 1 / 32, 13.98%, **OPEN** | 9 / 32, 43.94%, **FAIL** |
| MA-SSM-other | 1344 | 33,419 | 4 (2) | 97 | 6 / 97, 11.84%, **FAIL** | 11 / 97, 18.07%, **FAIL** | 1 / 97, 4.8%, **OPEN** | 27 / 97, 36.29%, **FAIL** |
| ME-GET-officers | 8 | 195 | 3 (1) | 74 | 9 / 74, 20.26%, **FAIL** | not compared (no dates in this source) | 0 / 74, 3.97%, **OPEN** | 3 / 74, 10.15%, **OPEN** |
| ME-GET-other | 75 | 4,227 | 3 (1) | 171 | 16 / 171, 13.86%, **FAIL** | not compared (no dates in this source) | 3 / 171, 4.47%, **OPEN** | 19 / 171, 15.88%, **FAIL** |
| ME-IDX-officers | 6 | 104 | 3 (1) | 46 | 9 / 46, 31.66%, **FAIL** | not compared (no dates in this source) | 2 / 46, 13.06%, **OPEN** | 16 / 46, 47.92%, **FAIL** |
| ME-IDX-other | 1145 | 19,559 | 3 (1) | 49 | 16 / 49, 45.28%, **FAIL** | not compared (no dates in this source) | 15 / 49, 43.16%, **FAIL** | 17 / 49, 47.38%, **FAIL** |
| ME-RET-officers | 22 | 555 | 2 (1) | 29 | 15 / 29, 67.97%, **FAIL** | 1 / 15, 27.94%, **OPEN** | 4 / 29, 28.84%, **FAIL** | 2 / 15, 36.34%, **OPEN** |
| ME-RET-other | 296 | 12,078 | 3 (1) | 113 | 13 / 113, 17.67%, **FAIL** | 4 / 51, 17.06%, **FAIL** | 10 / 113, 14.55%, **FAIL** | 42 / 51, 90.47%, **FAIL** |
| NH-AYL-other | 185 | 6,992 | 3 (1) | 110 | 16 / 110, 21.25%, **FAIL** | 34 / 77, 54.16%, **FAIL** | 0 / 110, 2.69%, **OPEN** | 48 / 77, 71.58%, **FAIL** |
| VT-REV-officers | 66 | 2,347 | 3 (1) | 114 | 1 / 114, 4.09%, **OPEN** | 19 / 37, 65.72%, **FAIL** | 0 / 114, 2.59%, **OPEN** | 13 / 37, 49.95%, **FAIL** |
| VT-REV-other | 246 | 14,507 | 5 (2) | 304 | 11 / 304, 5.92%, **FAIL** | 69 / 116, 67.16%, **FAIL** | 5 / 304, 3.43%, **FAIL** | 65 / 116, 63.86%, **FAIL** |

Pages looked at, one line each (stratum, draw position, D = in the lowest decile, levels, lines, lines in error):

| page (identifier / leaf) | printed page | stratum | draw position | decile | levels | lines | in error | notes of printed lines of the units that no stored line accounts for |
|---|---|---|---|---|---|---|---|---|
| `massachusettssol21931mass/143` | 133 | MA-SSM-officers | 1 | D | NDR | 16 | 10 | 0 |
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
| `annualreportofad1863main/224` | None | ME-RET-officers | 1 | D | N | 14 | 12 | 0 |
| `annualreportofad1863main/685` | 465 | ME-RET-officers | 2 |  | NDR | 15 | 5 | 1 |
| `annualreportofad1863main/414` | 194 | ME-RET-other | 1 | D | N | 16 | 11 | 0 |
| `annualreportofad1863main/789` | 569 | ME-RET-other | 2 |  | N | 46 | 5 | 1 |
| `annualreportofad1863main/365` | 145 | ME-RET-other | 3 |  | NDR | 51 | 44 | 0 |
| `cu31924096263136/63` | 644 | NH-AYL-other | 1 | D | NDR | 37 | 36 | 0 |
| `cu31924096263128/98` | 77 | NH-AYL-other | 2 |  | NDR | 40 | 21 | 0 |
| `cu31924096263136/322` | 903 | NH-AYL-other | 3 |  | N | 33 | 4 | 0 |
| `cu31924080774148/88` | 73 | VT-REV-officers | 1 | D | NDR | 37 | 25 | 0 |
| `cu31924080774148/117` | 102 | VT-REV-officers | 2 |  | N | 40 | 1 | 0 |
| `cu31924080774148/225` | 210 | VT-REV-officers | 3 |  | N | 37 | 0 | 0 |
| `cu31924080774148/74` | 59 | VT-REV-other | 1 | D | NDR | 46 | 43 | 0 |
| `cu31924080774148/116` | 101 | VT-REV-other | 2 |  | NDR | 70 | 53 | 0 |
| `cu31924080774148/248` | 233 | VT-REV-other | 3 |  | N | 66 | 0 | 0 |
| `cu31924080774148/60` | 45 | VT-REV-other | 4 | D | N | 72 | 2 | 0 |
| `cu31924080774148/52` | 37 | VT-REV-other | 5 |  | N | 50 | 6 | 0 |

Findings on the sample itself. (1) The lowest-decile pages carry most errors, and the draw takes a third of its pages from the decile, so a pooled rate is an upper estimate of the rate of a whole stratum; the page table above gives every page. (2) Pages with no error at all exist (2: `cu31924080774148/225`, `cu31924080774148/248`), all of them compared at the name level only; **no page compared at the level of dates and remarks is free of error**, and the pages of the better kind still carry names that differ from the print (for example 1 line in 54 on `maineatgettysbur01main/220`, 1 in 25 on `massachusettssol11931mass/662`). (3) The pooled rates are not estimates of the files: they come from 2 to 5 pages per stratum, and lines of one page are not independent.

### 2.3 What kinds of error, by source family

Counts are instances (a line can carry several kinds). "flagged" = the line is in `ocr_uncertain` of its flag file; "not flagged" = it is not.

| family | pages | lines compared | lines with a name error | lines in error (all levels compared) | kinds (instances: flagged / not flagged) |
|---|---|---|---|---|---|
| Vermont: Revised Roster 1892 (cols) | 8 | 418 | 12 (2.9 percent) | 121 of 153 (79 percent) | `rem-date` 88 (86 / 2); `rem-char` 46 (44 / 2); `rem-order` 40 (40 / 0); `name-char` 12 (12 / 0); `rank` 5 (5 / 0); `rem-extra` 3 (3 / 0); `rem-missing` 2 (2 / 0) |
| Massachusetts: Soldiers, Sailors and Marines 1931 (flow) | 6 | 129 | 6 (4.7 percent) | 51 of 129 (40 percent) | `rem-char` 21 (5 / 16); `rem-date` 16 (13 / 3); `rem-extra` 15 (6 / 9); `name-char` 6 (1 / 5); `rank` 2 (2 / 0) |
| New Hampshire: Ayling, Revised Register 1895 (flow) | 3 | 110 | 16 (14.5 percent) | 57 of 77 (74 percent) | `rem-char` 46 (32 / 14); `rem-date` 34 (31 / 3); `name-char` 16 (9 / 7); `rem-extra` 3 (3 / 0) |
| Maine: Adjutant General report 1863, Appendix D, company returns (cols) | 5 | 142 | 28 (19.7 percent) | 49 of 66 (74 percent) | `rem-ditto` 41 (0 / 41); `name-char` 15 (3 / 12); `rank` 10 (2 / 8); `name-nonperson` 8 (7 / 1); `name-cut` 6 (1 / 5); `rem-extra` 5 (0 / 5); `rem-date` 5 (1 / 4); `merge` 4 (0 / 4); `rem-char` 4 (0 / 4); `rem-missing` 3 (0 / 3) |
| Maine: Supplement 1867, Alphabetical Index (cols) | 6 | 95 | 25 (26.3 percent) | not compared at all levels | `rem-char` 31 (2 / 29); `name-char` 25 (7 / 18); `rank` 17 (0 / 17); `rem-missing` 2 (0 / 2) |
| Maine at Gettysburg 1898, participants lists (lists) | 6 | 245 | 25 (10.2 percent) | not compared at all levels | `name-cut` 21 (11 / 10); `rem-missing` 17 (4 / 13); `name-nonperson` 6 (5 / 1); `rem-char` 4 (0 / 4); `rank` 3 (2 / 1); `name-char` 2 (0 / 2); `rem-extra` 1 (1 / 0) |

Of the 117 instances on name fields, 56 (48 percent) stand on lines that the flag file marks ocr_uncertain and 61 do not; of all 585 instances 340 (58 percent) are flagged. **The flags are not a safe measure of the lines that are right.** The kinds, with what each means for the parsers of the later items, are written up in `PRODUCTION-PLAN.md` 9.8 (appended 14 November) and summarised in 2.4.

### 2.4 Defect lists returned to the items (dated 14 November 2026; stored lines are not changed)

**union-me**

* Maine: Adjutant General report 1863, Appendix D, company returns (cols): `rem-ditto` (41) e.g. `annualreportofad1863main/365` row 2: ditto mark stored as the digits 66; `name-char` (15) e.g. `annualreportofad1863main/224` row 0: stored name '- 1 TT All.' printed 'Samuel H Allen' (Colonel); `rank` (10) e.g. `annualreportofad1863main/414` row 3: stored rank 'JLst Sergt' printed '1st Sergt'; `name-nonperson` (8) e.g. `annualreportofad1863main/224` row 7: stored name 'Discharged and Deceased' (a heading of the prose list below the table); `name-cut` (6) e.g. `annualreportofad1863main/365` row 27: the initial H of 'Buswell Charles H' is stored as 'II' at the start of the remarks after a stray ' '; `rem-extra` (5) e.g. `annualreportofad1863main/365` row 3: stray 'g' in the cells; `rem-date` (5) e.g. `annualreportofad1863main/365` row 10: 'Dee. 22' for 'Dec. 22'.
* Maine: Supplement 1867, Alphabetical Index (cols): `rem-char` (31) e.g. `supplementtoannu00main/269` row 2: company 'T' for 'I' (Hutchinson Joseph, 1 Cavalry); `name-char` (25) e.g. `supplementtoannu00main/269` row 4: stored 'Illsley Hollia C' printed 'Illsley Hollis C'; `rank` (17) e.g. `supplementtoannu00main/269` row 16: rank 'An do'; cells 'i \ u o An do' for 'D 9 do'; `rem-missing` (2) e.g. `supplementtoannu00main/46` row 10: 'Bisbee Andrew Corporal B do' lacks the regiment 7 (printed 'B 7 do'); the line is filed to no unit for that reason.
* Maine at Gettysburg 1898, participants lists (lists): `name-cut` (21) e.g. `maineatgettysbur01main/146` row 14: stored name 'St. Clair' remarks 'Isaac P.,'; printed 'St. Clair, Isaac P., Lisbon,' (Lisbon lost); `rem-missing` (17) e.g. `maineatgettysbur01main/146` row 9: stored 'Columbia,' printed 'Columbia, N. H.,'; `name-nonperson` (6) e.g. `maineatgettysbur01main/146` row 10: stored name 'N. H.' remarks 'Mitchell,'; printed entry 'Mitchell, Stephen, Paris,'; `rem-char` (4) e.g. `maineatgettysbur01main/146` row 15: 'Hallowed,' for 'Hallowell,'; `rank` (3) e.g. `maineatgettysbur01main/447` row 58: stored rank 'ist Sergt.' printed '1st Sergt.'; `name-char` (2) e.g. `maineatgettysbur01main/146` row 37: 'Spider, Francis J.' printed 'Spiller, Francis J.'; `rem-extra` (1) e.g. -.

**union-nh**

* New Hampshire: Ayling, Revised Register 1895 (flow): `rem-char` (46) e.g. `cu31924096263128/98` row 5: 'gd. f I'om mis.' for 'gd. from mis.'; `rem-date` (34) e.g. `cu31924096263128/98` row 2: 'age 2i3' for 'age 23'; 'Hai-bor' for 'Harbor'; `name-char` (16) e.g. `cu31924096263128/98` row 0: stored 'Plaisted, Charles B.' printed 'Plaisted, Charles E.'; `rem-extra` (3) e.g. `cu31924096263128/98` row 32: stray marks '. t. „ .' after the remark.

**union-vt**

* Vermont: Revised Roster 1892 (cols): `rem-date` (88) e.g. `cu31924080774148/74` row 1: second date cell: stored 'July- •63', printed 'July 27,'63'; `rem-char` (46) e.g. `cu31924080774148/74` row 7: 'Flainfield' for 'Plainfield'; '6i'; issue date day lost; `rem-order` (40) e.g. `cu31924080774148/88` row 7: words of the remark out of order ('2, '62; Wd. Corp. Co. C.; ...'); 'reed'; `name-char` (12) e.g. `cu31924080774148/52` row 0: stored 'iMarquis E. Tenney,' printed 'Marquis E. Tenney,' (stray i); `rank` (5) e.g. `cu31924080774148/74` row 41: carried heading 'tst Lieutenants.' for '1st Lieutenants.'; `rem-extra` (3) e.g. -; `rem-missing` (2) e.g. -.

**union-ma**

* Massachusetts: Soldiers, Sailors and Marines 1931 (flow): `rem-char` (21) e.g. `massachusettssol11931mass/662` row 4: 'OflBcer' for 'Officer' (See Officer U. S. Colored Troops); `rem-date` (16) e.g. `massachusettssol21931mass/143` row 1: '1S63'; `rem-extra` (15) e.g. `massachusettssol11931mass/758` row 2: stray 'j' tokens ('out j June 24, 1864. j'): margin marks; `name-char` (6) e.g. `massachusettssol11931mass/662` row 12: stored 'Marrln, Thomas' printed 'Marrin, Thomas'; `rank` (2) e.g. `massachusettssol21931mass/373` row 22: rank 'I*riv.' for 'Priv.'; '1S63'.

Requirements for the parsers (the same list is in PRODUCTION-PLAN 9.8): flag generously (digits and the letters that OCR confuses with them, a lower-case letter inside a name, an unusual letter pair); never store a ditto mark as digits; drop lone marks between punctuation on shadowed margins or keep them flagged; parse run-in paragraphs into entries or leave them out, never as fragment rows; keep the state after a residence (`N. H.`, `Vt.`, `Mass.`) in the remarks; assert one stored line per printed line on every table page; do not file a rank word in the name field.

## 3. The claims of the closed items' reports, re-verified against their files

546 claims were recomputed from the files (script `pipeline2/roster_qa/qa_claims.py`, result `data2/qa/claims-check.json`): **546 hold, 0 do not.**

| item | what was recomputed | claims | hold |
|---|---|---|---|
| ledgers | ledger sha256 of the pinned text, page-index and page-number files | 63 | 63 |
| union-ma | flag file unit_file_raw_lines_sha256 equals the unit file | 24 | 24 |
| union-ma | manifest sha256 of the files kept locally | 36 | 36 |
| union-ma | pointer file bytes of the files kept locally | 36 | 36 |
| union-ma | pointer file sha256 of the files kept locally | 36 | 36 |
| union-ma | verify_unit.py --all | 1 | 1 |
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

* Two readings of the check were corrected before the result above: the Maine "Same" lines were first counted by the exact word (7 units differed by 1 to 5 lines) while the report counts the flag S, the printed ditto word with its OCR variants (`Samo`, `fcame`), which is the right definition; and the Massachusetts total of the morning (33,748 lines) is stale by design (the files were regenerated after the reconciliation, 33,787 lines, `GAPS.md` G-MA04). Neither is a defect of a report; both are listed as information in `claims-check.json`.

* `verify_unit.py --all --root data2/union/me`: 15 files, 36,771 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/nh`: 4 files, 6,992 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/vt`: 11 files, 16,854 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `verify_unit.py --all --root data2/union/ma`: 24 files, 33,787 lines, **0 V1 name defects, 0 V3 page defects, 0 problems** (ledger hashes matched); 0 files not ok.
* `build_index.py --lint`: 53 of 640 units have a file, 90738 rows, 11583248 raw bytes, 2599566 gzipped bytes; **0 defects, 0 warnings**.
* `node --test docs/battle-theatre/app/tests/roster-union-nh.test.mjs`: 23 tests, 23 pass, 0 fail.
* The four verify runs, the lint and the node test were run directly, not through `tools/horde/bench.sh`: each measured under 30 s of CPU (user times 20 s, 0.3 s, 25 s and 0.3 s for Maine, New Hampshire, Vermont; the Massachusetts run was the one queued through the lock). Locked copies of the same commands were queued as well and may overwrite the same output files with identical content.

**An open question of the Maine report answered.** The report says of eight leaves of the index without text (328, 329, 560, 561, 838, 839, 1220, 1221) that "whether they are blank, plates or unread is not known". The scan data of the item (`supplementtoannu00main_scandata.xml`, Documented) gives `pageType Delete` and `addToAccessFormats false` for exactly these leaves, which are therefore not in the access PDF, and the printed page number advances by exactly one across each pair (319 to 320, 549 to 550, 825 to 826, 1205 to 1206; `PageMap.printed`). They are not book pages; no printed page of the index is missing there. The same holds for no other leaf of the item inside the range that carries stored lines (23 leaves of the item have no text; 15 lie before the first or after the last printed page).

**Claims not recomputed here (Not run):** statements of prose in the reports (for example the readings of the Official Records for the strength of the 2nd and 5th New Hampshire, the explanations of the Summary residuals, the unit-by-unit notes on the sources) are not checked by this item; the counts that depend on a rule of the item (the "on the rolls" inference) were checked for consistency with the flag files, not for the correctness of the rule.

## 4. The second-reading route

Route (Measured, `pipeline2/page_image.py` and `pipeline2/roster_qa/qa_render.py`): the item PDF from `https://archive.org/cors/<id>/<id>.pdf` (one request, 1.2 s after the previous one, generic client name), the leaf found through the scan data where the PDF has fewer pages than the item has leaves, the page cut out with pdftoppm at 300 dpi, the table rules whitened (a threshold relative to the page background: the Maine scans are grey, about 155 on a scale of 255, and a fixed threshold erased the text and made tesseract return nothing on two pages before it was fixed), tesseract 5.3.4 `eng` psm 6 at one thread (about 1 to 4 s of CPU a page). The PDFs are transient (569,772,251 bytes in all, deleted after the run; sha256 in the pointer file).

### 4.1 What a second reading is worth, on the pages that were looked at

The comparison of qa_compare.py (every stored line AGREE when all its tokens are matched by the tesseract reading of the page, NEAR when only spacing differs, SUSPECT otherwise) against the verdict of the sample reader, on the pages looked at at all three levels:

| family | lines | in error (reader) | of them SUSPECT | of them AGREE | clean lines (reader) | of them AGREE | of them SUSPECT |
|---|---|---|---|---|---|---|---|
| ME-RET | 66 | 49 | 46 (94 percent) | 3 | 17 | 10 (59 percent) | 7 |
| VT-REV | 153 | 121 | 121 (100 percent) | 0 | 32 | 18 (56 percent) | 10 |
| NH-AYL | 77 | 57 | 57 (100 percent) | 0 | 20 | 12 (60 percent) | 6 |
| MA-SSM | 129 | 51 | 50 (98 percent) | 1 | 78 | 64 (82 percent) | 14 |

Reading. The comparison finds nearly every line that is in error (it is a good detector where the layout is one line of text per printed line: Vermont, Ayling, the Massachusetts volumes, the Maine returns) and it also marks a share of the lines that are right (tesseract's own errors on a damaged page): the SUSPECT list is a work list, not a verdict. Lines that both readings agree on and that were still in error (4 on these pages) show that agreement of two engines is not proof either; the sample reader looked at the page for every line. Two-column lists (Maine at Gettysburg) and the index pages (Maine) are read by tesseract as one run per printed line, so the line-level comparison is not usable there and was not used.

### 4.2 Agreement of the two engines on 20 pages per family

**Not finished when this report was written.** `qa_route_test.py run` (120 pages, about 10 minutes of CPU) was submitted through `tools/horde/bench.sh` and was still waiting for a slot of the machine lock; the command, its output file (`GOVERNANCE/horde/ws-rosters/roster-qa/route-test.out`) and the writer of this section (`qa_report.py`) are in place: re-run `python3 -I pipeline2/roster_qa/qa_report.py` when `data2/qa/second-reading.json` exists. No number of this section is claimed until then.

### 4.3 Lines that the first layer lost, recovered

Each recovered row has its own locator: a text id of the ledger `data2/qa/pageread-ledger.json` (the tesseract reading of that page, pinned by sha256, kept under `tmp/library/rosters/_qa/pageread/`) and the offset of the first name character in it; V1 (the name tokens stand at the offset) and V2 (the remark tokens follow in order) were checked by `r2lib`; the line was cropped at 300 dpi and **looked at** before the row was written; the name is the OCR tokens of the derived text, never corrected. The rows are plain JSON beside the sample results (`data2/qa/recovered/union-vt.json`, `union-me.json`), never lines of a unit file: no existing row was changed and `verify_unit.py --all` does not see them.

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

Not tried: the other 99 lost Maine index lines (the route is proved on the 7; the rest is a batch job for round 2 of union-me: read the leaf, find the line by the y position, look at it); the 119 lines of the 1863 returns that the Maine item left out (`non_person_lines`: they are prose lists and notes whose names the text layer has, not lost names; the item registers them as a gap of cut, not of reading); **the Pennsylvania muster years on 2,039 pages and the Florida 6.1 percent** (no unit file of those items exists yet, so there is no row to which a second reading could be attached; owed to the round of roster-qa that follows their items).

## 5. Anomalies seen

1. **Two pages could not be read by tesseract at first** (Maine returns leaves 365 and 414: zero words, 0.2 s of CPU): the rule remover used a fixed grey threshold of 140 and the Maine scans are grey (about 155); it whitened the text with the rules. Fixed (threshold relative to the page background) before any verdict was written; the pages read afterwards are unaffected. Recorded because the next engineer meets the same scans.
2. **The page-number map and the PDF disagree on some items** (the PDF of the Maine index has 1,226 pages for 1,236 leaves; the MA volumes 1 and 2 are mapped through the scan data): `page_image.leaf_to_pdf_page` handled all of them; every rendered page was checked by the share of its words in the pinned leaf (all above 0.7; lowest see 4.2).
3. **The digit 8 of the Massachusetts typeface is inked like an S** in many places (`1S62`, zoom at 600 dpi): the first layer reads S. Counted as an error in the date (the printed meaning is a year); the page shows what a reader sees.
4. **Two lines of one source are both "Same".** The index prints the ditto word `Same` for a man named above; a stored `Same` row has no man: which man is read from the line above in print and is not in the row (flag S). Three `Same` rows of one page belonged to three different men.
5. **Index lines of the units are missing on the pages looked at** (`missed_lines` in the verdicts): 3rd Maine C-company lines, 7th Maine lines, one line of the 1st Cavalry, the 2nd Battery and others; the Maine item registers the unreadable-unit lines (EG-ROS-ME-05) but not these, whose regiment cell was read and whose line was not stored.
6. **Run-over lines of table remarks** (a remark that wraps is printed with its overflow bracketed at the right of the next line: `[for wds.`, `[May 12, '64.`) are stored on the row of the line they stand beside in Vermont, Maine returns and the Massachusetts margin; the printing convention is the cause, the geometry rule cannot tell.
7. **Copy audit (Law; rule 6 of the task).** A word search (AI, Claude, Anthropic, agent, subagent, LLM, GPT, artificial intelligence) over the 118 files this item wrote under `data2/qa`, `GOVERNANCE/horde/ws-rosters/roster-qa` and the pointer file found 1 file(s) with a hit: `docs/battle-theatre/rosters/data2/qa/pages/maineatgettysbur01main-0513.verdict.json`: Ai. The hit is a printed given name of the source (the Maine participants list prints a man named Ai), kept as printed (Law 1 and 4). None of these files is loaded by the roster page; `data2/qa` is a work area and must not be packed (request note `GOVERNANCE/horde/requests/bt-rosters-roster-qa-work-files.md`); the derived-text ledger is kept there, not under `data2/sources/`, because the packer audits that folder for statements of how a file was made.

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

Rights per name: a recovered row names its derived text (`QA-PAGEREAD.<identifier>-<leaf>`), whose ledger entry gives the item, the leaf, the sha256 of the PDF and of the text, and the rights note above.

## 7. Gaps, defects returned, owed

Registered (lines appended to `rosters/GAPS.md`; proposed entries under `GOVERNANCE/horde/ws-rosters/proposed-register/roster-qa-EG-ROS-QA-*.md`; none is in `register/` yet):

* **EG-ROS-QA-01** R-G9 not passed: every stratum of the four items fails (section 2.2); the items may not be published as checked; the defect lists of 2.4 go back to the parsers of union-me, union-nh, union-vt and union-ma, and a fresh draw (seed with the round number) of every stratum is owed after each fix.
* **EG-ROS-QA-02** Gates not decided by this round: the strata and gates shown OPEN in 2.2 (for example R-G1 of the Vermont officers pages: 1 error in 114 lines; the structure gate of New Hampshire: 0 in 110) need 299 to 628 lines each; no pass is claimed.
* **EG-ROS-QA-03** The cells sidecar of the Vermont files (the page-order reading of the lines flagged O) is not sampled; the unit-file line stays in text-layer order by design.
* **EG-ROS-QA-04** Second reading of the Maine index lost lines beyond the 7 tried (99 left), of the lines that the first layer stored garbled (every `_other-ME-SUPP-1867` line on the pages looked at had a garbled rank or regiment cell), and of the Pennsylvania muster years and the Florida losses (items not built yet).
* **EG-ROS-QA-05** Index lines of the units missing in the stored lines (section 5, item 5): not counted as unreadable-unit lines by the Maine item.

Owner steps: none new. Delegated decisions made here: DD-ROS-QA-01 to DD-ROS-QA-05 (appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`).

**Not run in this item:** a browser, any timing, a real-GPU or phone check; the Pennsylvania and Florida tests; the cells sidecar; more than 3 to 6 pages per stratum; the 299 to 628 lines per stratum of the plan (every stratum failed first); a second independent reader of the disagreements (the sample reader is one reader; the plan's third reader for disagreements was not available, so a doubtful character was zoomed to 600 dpi and, where still doubtful, not counted as an error).

