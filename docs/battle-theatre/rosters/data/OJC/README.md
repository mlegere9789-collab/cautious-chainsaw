# OJC roster family: Ohio, New Jersey, Connecticut

Built 30 October 2026 for the roster program (PLAN sections 1.4, 2, 3, 4.1). Every number below was produced by the scripts in `scripts/` from the cached Internet Archive files listed in `acquired.json` (sha256 recorded). Nothing here is product data yet: it is the measured output of the pipeline, with every row carrying its source, page and the rule that set its presence label. Evidence labels follow the site vocabulary: **Documented** (a source says it), **Measured** (a command produced it), **Computed** (arithmetic on those), **Unknown**.

**Independent audit, 30 October 2026**: a second agent re-checked this family against the page images (sample of 60 rows, seed 41, plus 45 targeted rows), recounted every total, verified every hash and rights flag, and repaired the systematic defects it found in the parse outputs. The numbers in this file are the numbers after that repair; the parse outputs before it are frozen in `_pre_audit/`; every change, the sample results and what could not be fixed are in `AUDIT.md`. The builder's own page-image sample below is kept as written and is superseded by the audit for the accuracy gates.

## Coverage

* **39 of 39 units** of this family in the order of battle file (`baseline/dist/data/oob/`) have a roster CSV: 13 Ohio infantry, 12 New Jersey infantry, 5 Connecticut infantry, 6th Ohio Cavalry, 1st New Jersey Cavalry, Batteries H, I, K, L of the 1st Ohio Light Artillery, Battery B of the 1st New Jersey Artillery, Batteries B and M of the 1st Connecticut Heavy Artillery.
* **55,062 names** (one row per man per printed name, whole-war roll of the unit, officers and enlisted men, as in the pilot). 1,097 are Present-Documented, 21,050 Absent-Documented, 32,915 Unknown, of which 15,177 rows (27.6 percent) are `unreadable-or-ambiguous` because a date or remark word is missing or garbled in the OCR text layer.
* Not covered because the order of battle file does not list them: other Ohio, New Jersey and Connecticut men present in headquarters escorts, signal, provost or detached details, and any OJC regiment the order of battle omits (see Conflicts).

## Sources (rights status and what was fetched)

| source id | work | Internet Archive item | rights | files |
|---|---|---|---|---|
| OH-ROSTER-1886-v2 | Official Roster of the Soldiers of the State of Ohio, vol 2 (1st to 20th infantry) | `bwb_W9-BTC-637` | published 1886; the item carries no `possible-copyright-status` and no `access-restricted-item` flag; treated as public domain by date, not by an IA flag (open for owner review) | djvu.txt, djvu.xml |
| OH-ROSTER-1886-v3, v5, v6, v10, v11 | same work, vols 3 (21st to 36th), 5 (54th to 69th), 6 (70th to 87th), 10 (artillery), 11 (cavalry) | `ohiowarroster03howerich`, `05`, `06`, `10howerich`, `officialrosterof11ohio` | `possible-copyright-status` NOT_IN_COPYRIGHT, not access-restricted | djvu.txt, djvu.xml |
| OH-ROSTER-1886-v7 | same work, vol 7 (107th infantry) | `officialrosterof07ohio` | NOT_IN_COPYRIGHT | djvu.txt, djvu.xml |
| NJ-STRYKER-1876, -v2 | Stryker, Record of Officers and Men of New Jersey in the Civil War, vols 1 and 2 | `newjerseyincivil01recorich`, `02recorich` | NOT_IN_COPYRIGHT | djvu.txt (vol 1, 2), djvu.xml (vol 1, 2) |
| CT-CAT-1869 | Catalogue of Connecticut Volunteer Organizations (infantry, cavalry, artillery), 1869 | `connecticutvolorg00catarich` | NOT_IN_COPYRIGHT | djvu.txt, djvu.xml |
| US-OR-27-1 | War of the Rebellion, Official Records, Series I vol 27 part 1: lists of Union officers killed and mortally wounded | `cu31924077699761` | US government publication, public domain | already cached in `tmp/library/or27` by earlier work (sha256 added to `acquired.json`); not downloaded again |
| (QA images) | page images `archive.org/download/ID/page/nN_w1500.jpg` | the items above | as above | 6 JPEGs, each requested once, for the page-image sample and parser development |

No host answered 403, a bot challenge, a login or a terms page. No `blocked` entry was needed (`acquired.json` has `blocked` empty). Failed requests (all transient): Ohio vol 2 `officialrosters02commgoog` answered HTTP 504 on three attempts for the text and the xml, so vol 2 was taken from the second Internet Archive copy `bwb_W9-BTC-637`; two single HTTP 500 answers succeeded on retry; item metadata requests were slow and were stopped after seven (copyright flags came from the `advancedsearch` API instead). Total downloaded: 706 MB of the 1.5 GB allowance (about a third of it volumes that were fetched to find which volume holds a regiment and not used: Ohio vols 4, 8, 9, 12 and the part-2 copies). Rate: one sequential requester, 2 s minimum gap, below-normal priority, identified user agent; one short overlap of two download processes while the Ohio volumes were fetched is noted in `acquired.json`. No account, key, login or licence acceptance was used. No browser was used. FamilySearch, Fold3, Ancestry and Find a Grave were not touched.

Web searches (3) were used only to learn which open works exist; no page they returned was scraped. They are listed under Gaps as leads, not as sources.

## Parse method

All three sources were read from the Internet Archive `djvu.xml` word boxes (ABBYY OCR), not the plain text, because the plain text separates the table columns. `scripts/djvu_pages.py` stores words per page; `showpage.py` groups them into lines; one parser per source:

* **Ohio** (`oh_parse.py`): columns Names, Rank, Age, Date of entering the service, Period, Remarks; column offsets are measured from the printed "Names" header of each page and scaled for the smaller vol 2 scan; the date cell is anchored on the month word so that a month in a remark never becomes the muster date; remark continuation lines are attached to the row above; company headings, `Mustered in` paragraphs and a company sequence rule recover company letters. Page ranges per regiment come from the running page headers (explicit ranges for the four vol 2 regiments and the cavalry).
* **New Jersey** (`nj_parse.py`): columns NO., NAME, RANK, ENROLLED, MUST'D IN, PERIOD, MUST'D OUT, REMARKS; company headings (`Company X, Nth Regiment`) with a letter-sequence rule; page ranges from the printed table of contents (printed page + 6 in vol 1, - 946 in vol 2, measured on 480 and 376 pages). Rows whose name words are missing from the text layer are kept when the row number and a date are present (name left empty and flagged).
* **Connecticut** (`ct_parse.py`): columns Name and Rank, Residence, Date of Muster, Remarks; the date cell is anchored on the month word; rank headings (Captain, Sergeants, Privates) and recruit blocks are tracked; the printed ditto marks in the Residence and Remarks columns are resolved from the row above (`remark-ditto-resolved`, `remark-dropped-ditto-filled`), and the printed text is kept in the CSV only after that resolution, which is flagged.
* Labels: `scripts/lab.py`, PLAN section 2.2, applied to the remark and the muster date only:
  * `CAS-REMARK` (rule 2): a casualty or capture word within 110 characters of "Gettysburg" (OCR variants and hyphenation tolerated), or a casualty word directly followed by a date inside 1 to 3 July 1863. A death, transfer or discharge dated 1 to 3 July, or a hospital death at Gettysburg with no wound stated, is **not** Present (flagged `gettysburg-named-no-casualty`, 59 rows). Casualty words are also matched fuzzily (`iilled`, `Wouuded`, `Raptured`, `Mis,sing`) inside the same clause as the place name; the clause is cut on a semicolon only when a word follows it (an OCR year such as `186:;,` had cut clauses in two). Remark words that landed in the date or period cell (the remark column starts left of the measured boundary on some pages: `Killed`, `Wounded`, `Discharged`) are put back in front of the remark (flags `remark-start-in-period-cell`, `remark-start-in-date-or-period-cell`).
  * `POW-BURIAL`: burial in the Soldiers' National Cemetery named in the remark.
  * `CAS-OR27`: officer named in the OR 27/1 killed or mortally wounded list (see below).
  * `SEP-BEFORE` (rule 7): a separation verb (discharged, resigned, dismissed, died, killed, deserted, mustered out, transferred out, Veteran Reserve or Invalid Corps) followed by a date before 1 July 1863 (audit additions: drowned, accidentally killed or shot, executed, suicide, and promotion out to another regiment or to general officer). A separation date earlier than a date written before it in the same remark is an OCR year misread and gives no label. Transfers between companies, transfers in from another regiment and promotions are not separations. A remark that also shows a return or re-enlistment becomes `CONFLICT` (Unknown).
  * `ENL-AFTER` (rule 8): muster-in date after 3 July 1863 (Ohio: the printed column is "Date of entering the service" for every man, so it is used for officers and staff too, flag `officer-or-staff-entering-date-used`; New Jersey and Connecticut officer and staff dates are still not used). When the New Jersey enrolled and mustered-in cells give dates on opposite sides of the battle, one year is an OCR misread and no enlistment date is taken (`enlist-dates-disagree`).
  * A separation date that precedes the legible muster-in date is an OCR year misread: with a muster-in after the battle the row is `ENL-AFTER`, otherwise `CONFLICT` (Unknown, `date-order-conflict`, 274 rows).
  * `ONROLL-NO-STATUS` (rule 12) and `OCR-DATE-LOST` (rule 13) make the Unknown rows. Present-Probable is not assigned: a roll alone supports no per-man claim (PLAN 2.4). The Absent label from the New Jersey must'd-out column is used for the 23rd New Jersey only (24 rows with a printed June 27, 1863, and 504 rows whose four date cells are all empty because the book prints ditto marks the OCR drops, resolved from the company's printed June 27, 1863, flag `must-d-out-by-ditto`, checked on page images leaf 790 and 796); for the other New Jersey units the column is not read (a limit, see Gaps).
* `or_officers.py` reads the New Jersey, Ohio and Connecticut blocks of the Union officers killed list and the New Jersey and Ohio blocks of the mortally wounded list from OR Series I vol 27 part 1, writes `OR27-officer-casualties.csv` (40 officers; 9 belong to regiments outside this family's scope, 31 to its units) and upgrades or confirms the matching roster row on surname and given name (9 rows upgraded; 13 already Present-Documented, so a second source; 9 not matched because the OCR name is garbled or the row is absent, listed in the file). The OR block locators are the list heading and state block; no OR page number is asserted.

## What the OCR text layer costs (Measured)

* Rows `unreadable-or-ambiguous`: Connecticut 2 to 6 percent; Ohio infantry 7 to 27 percent (best the 55th and 73rd, worst the 29th and 25th), the 6th Ohio Cavalry 33 and the four batteries 9 to 23; New Jersey infantry 25 (the 23rd, after the ditto repair) and 38 to 71 percent, the cavalry 20 and Battery B 43 (Stryker's date columns are the worst text layer of the three: month words such as `Mav`, `Kcl,.`, years such as `'(>•'`). These rows keep every printed field; the label stays Unknown.
* Names are the OCR text as printed and are never corrected. 8,684 rows carry a name flag (`name-garbled`, `ocr-noise-in-name`, `name-incomplete`); 3,207 rows have **no name in the text layer** (`name-missing-in-text-layer`: the words exist on the page image but not in the OCR): they are kept as rows with an empty name so that the count of men and their labels stay right, and no name is invented. The name error rate in the page-image sample is below.
* Duplicates: `dup_group` joins rows with identical normalised names inside one unit (3,692 rows; officers listed once per rank, men on two company rolls, or two different men with a common name). Nothing was merged; whether a group is one man needs the muster rolls.

## Per-unit result

| unit_id | unit | source | OOB strength | OOB casualties | rows | Present-Documented | Absent-Documented | Unknown | of which unreadable or ambiguous | rows with a name flag | status (PLAN 2.3) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| U-5CT | 5th Connecticut Infantry | CT-CAT-1869 | 221 | 20 | 1806 | 0 | 1037 | 769 | 69 (4%) | 48 | Short |
| U-14CT | 14th Connecticut Infantry | CT-CAT-1869 | 318 | 95 | 2034 | 30 | 1330 | 674 | 83 (4%) | 64 | Short |
| U-17CT | 17th Connecticut Infantry | CT-CAT-1869 | 386 | 197 | 1193 | 55 | 381 | 757 | 70 (6%) | 26 | Short |
| U-20CT | 20th Connecticut Infantry | CT-CAT-1869 | 321 | 37 | 1285 | 12 | 505 | 768 | 50 (4%) | 30 | Short |
| U-27CT | 27th Connecticut Infantry | CT-CAT-1869 | 75 | 48 | 842 | 13 | 160 | 669 | 44 (5%) | 34 | Short |
| U-ART-1CTB | 1st Connecticut Heavy Artillery, Battery B | CT-CAT-1869 | 80 | 0 | 307 | 0 | 172 | 135 | 5 (2%) | 8 | Short |
| U-ART-1CTM | 1st Connecticut Heavy Artillery, Battery M | CT-CAT-1869 | 80 | 0 | 415 | 0 | 227 | 188 | 17 (4%) | 12 | Short |
| U-1NJ-1 | 1st New Jersey Infantry | NJ-STRYKER-1876 | 338 | 0 | 1290 | 0 | 363 | 927 | 738 (57%) | 293 | Short |
| U-2NJ | 2nd New Jersey Infantry | NJ-STRYKER-1876 | 370 | 0 | 2068 | 1 | 644 | 1423 | 1138 (55%) | 494 | Short |
| U-3NJ | 3rd New Jersey Infantry | NJ-STRYKER-1876 | 378 | 0 | 990 | 1 | 188 | 801 | 705 (71%) | 223 | Short |
| U-4NJ | 4th New Jersey Infantry | NJ-STRYKER-1876 | 380 | 0 | 1590 | 0 | 519 | 1071 | 844 (53%) | 376 | Short |
| U-5NJ | 5th New Jersey Infantry | NJ-STRYKER-1876 | 206 | 56 | 1727 | 27 | 660 | 1040 | 722 (42%) | 257 | Short |
| U-6NJ | 6th New Jersey Infantry | NJ-STRYKER-1876 | 207 | 44 | 1447 | 7 | 431 | 1009 | 795 (55%) | 316 | Short |
| U-7NJ | 7th New Jersey Infantry | NJ-STRYKER-1876 | 275 | 117 | 2797 | 21 | 970 | 1806 | 1246 (45%) | 554 | Short |
| U-8NJ | 8th New Jersey Infantry | NJ-STRYKER-1876 | 170 | 38 | 2530 | 11 | 717 | 1802 | 1432 (57%) | 489 | Short |
| U-11NJ | 11th New Jersey Infantry | NJ-STRYKER-1876 | 275 | 126 | 1766 | 40 | 547 | 1179 | 766 (43%) | 346 | Short |
| U-12NJ | 12th New Jersey Infantry | NJ-STRYKER-1876 | 400 | 97 | 1862 | 31 | 583 | 1248 | 887 (48%) | 283 | Short |
| U-13NJ | 13th New Jersey Infantry | NJ-STRYKER-1876 | 400 | 16 | 1408 | 3 | 477 | 928 | 538 (38%) | 286 | Short |
| U-23NJ | 23rd New Jersey Infantry | NJ-STRYKER-1876 | 340 | 0 | 1009 | 0 | 618 | 391 | 257 (25%) | 77 | Short |
| U-ART-B1NJ | Battery B, 1st New Jersey Artillery (Clark's) | NJ-STRYKER-1876-v2 | 107 | 19 | 634 | 5 | 271 | 358 | 273 (43%) | 69 | Short |
| U-1NJ-CAV | 1st New Jersey Cavalry | NJ-STRYKER-1876-v2 | 349 | 26 | 3163 | 0 | 1904 | 1259 | 627 (20%) | 371 | Short |
| U-4OH | 4th Ohio Infantry | OH-ROSTER-1886-v2 | 268 | 51 | 1309 | 22 | 462 | 825 | 174 (13%) | 126 | Short |
| U-5OH | 5th Ohio Infantry | OH-ROSTER-1886-v2 | 296 | 33 | 1978 | 5 | 679 | 1294 | 426 (22%) | 181 | Short |
| U-7OH | 7th Ohio Infantry | OH-ROSTER-1886-v2 | 299 | 73 | 1429 | 10 | 482 | 937 | 186 (13%) | 157 | Short |
| U-8OH | 8th Ohio Infantry | OH-ROSTER-1886-v2 | 209 | 36 | 1070 | 43 | 341 | 686 | 184 (17%) | 132 | Short |
| U-25OH | 25th Ohio Infantry | OH-ROSTER-1886-v3 | 220 | 63 | 2041 | 100 | 844 | 1097 | 516 (25%) | 423 | Short |
| U-29OH | 29th Ohio Infantry | OH-ROSTER-1886-v3 | 289 | 21 | 1608 | 12 | 651 | 945 | 435 (27%) | 315 | Short |
| U-55OH | 55th Ohio Infantry | OH-ROSTER-1886-v5 | 304 | 12 | 1479 | 31 | 637 | 811 | 97 (7%) | 357 | Short |
| U-61OH | 61st Ohio Infantry | OH-ROSTER-1886-v5 | 267 | 71 | 1143 | 26 | 301 | 816 | 113 (10%) | 297 | Short |
| U-66OH | 66th Ohio Infantry | OH-ROSTER-1886-v5 | 305 | 47 | 1613 | 3 | 847 | 763 | 151 (9%) | 367 | Short |
| U-73OH | 73rd Ohio Infantry | OH-ROSTER-1886-v6 | 338 | 16 | 1537 | 115 | 607 | 815 | 123 (8%) | 295 | Short |
| U-75OH | 75th Ohio Infantry | OH-ROSTER-1886-v6 | 266 | 103 | 1490 | 115 | 317 | 1058 | 323 (22%) | 404 | Short |
| U-82OH | 82nd Ohio Infantry | OH-ROSTER-1886-v6 | 284 | 115 | 2073 | 134 | 930 | 1009 | 184 (9%) | 450 | Short |
| U-107OH | 107th Ohio Infantry | OH-ROSTER-1886-v7 | 457 | 175 | 1184 | 200 | 254 | 730 | 180 (15%) | 81 | Short |
| U-ART-H1OH | Battery H, 1st Ohio Artillery | OH-ROSTER-1886-v10 | 107 | 0 | 275 | 2 | 103 | 170 | 33 (12%) | 12 | Short |
| U-ART-I1OH | Battery I, 1st Ohio Artillery (Dilger's Battery) | OH-ROSTER-1886-v10 | 107 | 12 | 353 | 9 | 110 | 234 | 81 (23%) | 25 | Short |
| U-ART-K1OH | Battery K, 1st Ohio Artillery (Heckman's) | OH-ROSTER-1886-v10 | 80 | 10 | 264 | 9 | 65 | 190 | 24 (9%) | 13 | Short |
| U-ART-L1OH | Battery L, 1st Ohio Artillery (Gibbs's) | OH-ROSTER-1886-v10 | 107 | 1 | 239 | 3 | 66 | 170 | 44 (18%) | 15 | Short |
| U-6OH-CAV | 6th Ohio Cavalry | OH-ROSTER-1886-v11 | 340 | 10 | 1814 | 1 | 650 | 1163 | 597 (33%) | 378 | Short |


Status: PLAN 2.3 needs a primary documented strength `S_doc` (a commander's report or a muster-roll total). This task did not obtain one; the OOB column is the repository file's value, which cites Busey and Martin second-hand, so every unit is **Short** (named present far below the strength; the remainder is "n present, names not recovered", a count, never invented names). Where Present-Documented exceeds the OOB casualty figure (73rd Ohio 115 against 16, 25th Ohio 100 against 63, 55th Ohio 31 against 12) the two numbers disagree and both are carried: the roster counts every man with a Gettysburg casualty or capture remark, the OOB figure is second-hand. Which is right needs Fox's Regimental Losses or the Official Records regiment returns, which this task did not parse.

## Page-image sample (R-G1 to R-G3 check, not independent)

Four pages read against the page images (author's own pages, so this is a development check and not the independent sample of PLAN 4.4; the pages are excluded from any later independent draw): Connecticut 17th, IA leaf 681 (68 rows); New Jersey 11th, leaf 576 (47 rows); Ohio 82nd, leaf 548 (48 rows); Ohio vol 2 5th, `bwb_W9-BTC-637` leaf 160 (49 rows). Pages used while writing the parsers (NJ 349, Ohio 107th 665) are not counted. Details in `QA-SAMPLE.md`.

* Row recall: 212 of 212 printed rows present after the fixes (two defects found by this check, both fixed and re-run on all units: rows whose name words are absent from the text layer, and a line-grouping tolerance).
* Hard errors (a label asserting the opposite of the page): 0 in 212 rows after the fixes. Five hard or near-hard defects were found by the sample and by a follow-up audit of every Present-Documented remark, and fixed in the rules before the final run (test strings are in `lab.py`'s self-test): a "Wd. May 2, '63. Mustered out July 19, '65" remark read as a separation before the battle (date taken from the wrong verb), a month in the remark column taken as the muster date, a 1864 date misread as 1861 giving a false separation, a transfer between companies read as a separation, and a transfer or death dated 1 to 3 July read as a casualty.
* Rows labelled more weakly than the page supports: about 39 of 212 (18 percent) by my reading of the images, 28 of them on the New Jersey page: a garbled verb or year in the text layer (for example "pe chared at Harper's Ferry, June 21, 1863", or a New Jersey substitute whose 1864 muster year reads `'dl`) leaves the row Unknown although the page shows an absence. This direction of error loses documented absences; it did not create a false presence or absence in the sample.
* Names with at least one OCR slip, counted by eye on the pages (approximate): Connecticut 9 of 68, New Jersey about 14 of 47, Ohio vol 6 about 4 of 48, Ohio vol 2 about 10 of 49 plus 3 rows with no name in the text layer; the automatic name flag caught only part of them. The R-G1 99 percent target is **not** met by the OCR names, as the pilot already found (PLAN 3.5). A second OCR or a vision read of the name column is the route.

## Gaps and conflicts (also filed in `../../GAPS.md`)

1. **Per-man presence on the day** is unknown for every on-roll man (same as PLAN G01). Muster rolls of 30 June 1863 are not open.
2. **OCR defects** above; no OCR engine was installed and none was installed here (hard rule: no heavy process during the performance run). A second reading of the New Jersey date columns would convert most of the 36 to 71 percent unreadable rows.
3. **Company letters**: repaired by the audit (8th Ohio company A was under `FS` and H under G; 75th Ohio company K under I; flag `company-letter-set-by-audit`, positions read on the page images). Company letters elsewhere are as the heading and sequence rules gave them and were not individually re-checked.
4. **New Jersey must'd-out column** is not used for labels except the 23rd New Jersey; a man mustered out before July 1863 who has no remark is therefore Unknown.
5. **Order of battle conflict, 23rd New Jersey**: the OOB file lists U-23NJ (strength 340, casualties 0) in the VI Corps. Stryker's roster calls it a nine-month regiment mustered out 27 June 1863 and its history says it volunteered for service at Harrisburg during the invasion. All 1,009 rows carry the flag `contested-oob-lists-unit-at-gettysburg`; the 24 rows whose printed must'd-out date reads 27 June 1863 and the 504 ditto rows are Absent-Documented (528 of 1,009). Owner decision needed on the unit's place in the Theatre.
6. **OOB omissions to check**: Stryker lists a 15th New Jersey Infantry and a 10th; the OOB file has neither. This task did not determine whether either was at Gettysburg.
7. **Ohio deaths-and-burials lists** printed after the rosters of vols 5, 6, 7 (name, company, rank, died, buried, remarks) and the New Jersey and Ohio unit narratives were not parsed; they would add documented presences.
8. **Open alternatives not yet used** (found by search, not fetched or read): Storrs, The Twentieth Connecticut (IA `twentiethconnec00storgoog`, Google scan); Page, History of the Fourteenth Connecticut; Case, Lockwood and Brainard, Record of Service of Connecticut Men (1889); the New Jersey Gettysburg Battlefield Commission final report (1891) and the 1892 monuments report (IA `reportofcommissi00newj`); regimental histories of the 7th, 8th and 107th Ohio. The Connecticut Catalogue gives fate (killed, died, discharged), not wounds that were survived, which is why the 5th Connecticut has no Present-Documented man.
9. **Fox and OR regiment losses** were not parsed, so R-G5 (named casualties divided by documented casualties) is not computed for these units.

## Audit changes to the parse (details and counts in AUDIT.md)

Ohio parser: unit page ranges end at the first title line that names another regiment (395 rows of the next regiment's title, narrative and roster pages had been filed under the 5th, 25th, 29th, 55th, 61st and 66th Ohio; frozen in `_audit_removed/other-regiment-pages.csv`); a line whose name cell is missing but whose date and period cells are present opens a row (it was joined to the row above, merging remarks and giving false labels); remark-only lines at the row-start indent open a row; company headings with trailing lowercase (`COMPANY He`); company overrides for the 8th and 75th Ohio. New Jersey parser: a row number in the NO. column opens a row. Connecticut parser: in the field and staff table the rank line is printed above the name and is a heading, never part of the name above. Emit stage: page furniture, narrative paragraphs and stray-numeral fragments are removed to `_audit_removed/` (tombstones, counted); remarks that join several men's entries are flagged `remark-merge-suspected` and the label is withheld when the joined entries would not give one label (`MERGED-REMARK`).

## Reproduce

Python 3.11 standard library only, run with `python -I -X utf8`, at below-normal priority (`ojc_common.py` sets it). Order: `s1_search.py`, `s3_dl.py` / `s3_dlx.py` (downloads, polite, sha256 to `acquired.json`), `djvu_pages.py ID` for each item, then `ct_parse.py`, `ct_emit.py`; `nj_parse.py`, `nj_emit.py`; `oh_parse.py`, `oh_emit.py`; `or_officers.py`; `final_stats.py` (writes `stats.json`). The cache is `tmp/library/rosters/OJC/` (not committed). `s2_meta.py` was an abandoned metadata pass.

## Files

`*.csv` one per unit (same columns as the pilot plus `unit_id`, `rank_as_printed`, `name_clean`, `age`, `basis_code`; `source_page_idx_ia` is the IA djvu leaf, page image `archive.org/download/ID/page/n{leaf-1}_w1500.jpg`), `OR27-officer-casualties.csv`, `stats.json`, `acquired.json`, `progress.md`, `QA-SAMPLE.md`, `AUDIT.md`, `AUDIT-images.json`, `_pre_audit/` (frozen outputs and scripts before the audit), `_audit_removed/` (tombstones), `README.md`, `unit_table.md`, `scripts/`.
