# OJC roster family: Ohio, New Jersey, Connecticut

Built 30 October 2026 for the roster program (PLAN sections 1.4, 2, 3, 4.1). Every number below was produced by the scripts in `scripts/` from the cached Internet Archive files listed in `acquired.json` (sha256 recorded). Nothing here is product data yet: it is the measured output of the pipeline, with every row carrying its source, page and the rule that set its presence label. Evidence labels follow the site vocabulary: **Documented** (a source says it), **Measured** (a command produced it), **Computed** (arithmetic on those), **Unknown**.

## Coverage

* **39 of 39 units** of this family in the order of battle file (`baseline/dist/data/oob/`) have a roster CSV: 13 Ohio infantry, 12 New Jersey infantry, 5 Connecticut infantry, 6th Ohio Cavalry, 1st New Jersey Cavalry, Batteries H, I, K, L of the 1st Ohio Light Artillery, Battery B of the 1st New Jersey Artillery, Batteries B and M of the 1st Connecticut Heavy Artillery.
* **{{TOTAL_ROWS}} names** (one row per man per printed name, whole-war roll of the unit, officers and enlisted men, as in the pilot). {{PD}} are Present-Documented, {{AD}} Absent-Documented, {{UK}} Unknown, of which {{UNR}} rows ({{UNRP}}) are `unreadable-or-ambiguous` because a date or remark word is missing or garbled in the OCR text layer.
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
  * `CAS-REMARK` (rule 2): a casualty or capture word within 110 characters of "Gettysburg" (OCR variants and hyphenation tolerated), or a casualty word directly followed by a date inside 1 to 3 July 1863. A death, transfer or discharge dated 1 to 3 July, or a hospital death at Gettysburg with no wound stated, is **not** Present (flagged `gettysburg-named-no-casualty`, 105 rows).
  * `POW-BURIAL`: burial in the Soldiers' National Cemetery named in the remark.
  * `CAS-OR27`: officer named in the OR 27/1 killed or mortally wounded list (see below).
  * `SEP-BEFORE` (rule 7): a separation verb (discharged, resigned, dismissed, died, killed, deserted, mustered out, transferred out, Veteran Reserve or Invalid Corps) followed by a date before 1 July 1863. Transfers between companies, transfers in from another regiment and promotions are not separations. A remark that also shows a return or re-enlistment becomes `CONFLICT` (Unknown).
  * `ENL-AFTER` (rule 8): muster-in date after 3 July 1863 (officer and staff dates are never used as enlistment dates).
  * A separation date that precedes the legible muster-in date is an OCR year misread: with a muster-in after the battle the row is `ENL-AFTER`, otherwise `CONFLICT` (Unknown, `date-order-conflict`, 301 rows).
  * `ONROLL-NO-STATUS` (rule 12) and `OCR-DATE-LOST` (rule 13) make the Unknown rows. Present-Probable is not assigned: a roll alone supports no per-man claim (PLAN 2.4). The Absent label from the New Jersey must'd-out column is used for the 23rd New Jersey only (24 rows); for the other New Jersey units the column is not read (a limit, see Gaps).
* `or_officers.py` reads the New Jersey, Ohio and Connecticut blocks of the Union officers killed list and the New Jersey and Ohio blocks of the mortally wounded list from OR Series I vol 27 part 1, writes `OR27-officer-casualties.csv` (40 officers; 9 belong to regiments outside this family's scope, 31 to its units) and upgrades or confirms the matching roster row on surname and given name (9 rows upgraded; 13 already Present-Documented, so a second source; 9 not matched because the OCR name is garbled or the row is absent, listed in the file). The OR block locators are the list heading and state block; no OR page number is asserted.

## What the OCR text layer costs (Measured)

* Rows `unreadable-or-ambiguous`: Connecticut 2 to 6 percent; Ohio infantry 8 to 27 percent (best the 55th and 82nd, worst the 29th and 25th), the 6th Ohio Cavalry 34 and the four batteries 10 to 22; New Jersey infantry 38 to 71 percent, the cavalry 18 and Battery B 42 (Stryker's date columns are the worst text layer of the three: month words such as `Mav`, `Kcl,.`, years such as `'(>•'`). These rows keep every printed field; the label stays Unknown.
* Names are the OCR text as printed and are never corrected. 8,830 rows carry a name flag (`name-garbled`, `ocr-noise-in-name`, `name-incomplete`); 3,011 rows have **no name in the text layer** (`name-missing-in-text-layer`: the words exist on the page image but not in the OCR): they are kept as rows with an empty name so that the count of men and their labels stay right, and no name is invented. The name error rate in the page-image sample is below.
* Duplicates: `dup_group` joins rows with identical normalised names inside one unit (3,901 rows; officers listed once per rank, men on two company rolls, or two different men with a common name). Nothing was merged; whether a group is one man needs the muster rolls.

## Per-unit result

{{UNIT_TABLE}}

Status: PLAN 2.3 needs a primary documented strength `S_doc` (a commander's report or a muster-roll total). This task did not obtain one; the OOB column is the repository file's value, which cites Busey and Martin second-hand, so every unit is **Short** (named present far below the strength; the remainder is "n present, names not recovered", a count, never invented names). Where Present-Documented exceeds the OOB casualty figure (73rd Ohio 114 against 16, 25th Ohio 95 against 63, 55th Ohio 31 against 12) the two numbers disagree and both are carried: the roster counts every man with a Gettysburg casualty or capture remark, the OOB figure is second-hand. Which is right needs Fox's Regimental Losses or the Official Records regiment returns, which this task did not parse.

## Page-image sample (R-G1 to R-G3 check, not independent)

Four pages read against the page images (author's own pages, so this is a development check and not the independent sample of PLAN 4.4; the pages are excluded from any later independent draw): Connecticut 17th, IA leaf 681 (68 rows); New Jersey 11th, leaf 576 (47 rows); Ohio 82nd, leaf 548 (48 rows); Ohio vol 2 5th, `bwb_W9-BTC-637` leaf 160 (49 rows). Pages used while writing the parsers (NJ 349, Ohio 107th 665) are not counted. Details in `QA-SAMPLE.md`.

* Row recall: 212 of 212 printed rows present after the fixes (two defects found by this check, both fixed and re-run on all units: rows whose name words are absent from the text layer, and a line-grouping tolerance).
* Hard errors (a label asserting the opposite of the page): 0 in 212 rows after the fixes. Five hard or near-hard defects were found by the sample and by a follow-up audit of every Present-Documented remark, and fixed in the rules before the final run (test strings are in `lab.py`'s self-test): a "Wd. May 2, '63. Mustered out July 19, '65" remark read as a separation before the battle (date taken from the wrong verb), a month in the remark column taken as the muster date, a 1864 date misread as 1861 giving a false separation, a transfer between companies read as a separation, and a transfer or death dated 1 to 3 July read as a casualty.
* Rows labelled more weakly than the page supports: about 39 of 212 (18 percent) by my reading of the images, 28 of them on the New Jersey page: a garbled verb or year in the text layer (for example "pe chared at Harper's Ferry, June 21, 1863", or a New Jersey substitute whose 1864 muster year reads `'dl`) leaves the row Unknown although the page shows an absence. This direction of error loses documented absences; it did not create a false presence or absence in the sample.
* Names with at least one OCR slip, counted by eye on the pages (approximate): Connecticut 9 of 68, New Jersey about 14 of 47, Ohio vol 6 about 4 of 48, Ohio vol 2 about 10 of 49 plus 3 rows with no name in the text layer; the automatic name flag caught only part of them. The R-G1 99 percent target is **not** met by the OCR names, as the pilot already found (PLAN 3.5). A second OCR or a vision read of the name column is the route.

## Gaps and conflicts (also filed in `../../GAPS.md`)

1. **Per-man presence on the day** is unknown for every on-roll man (same as PLAN G01). Muster rolls of 30 June 1863 are not open.
2. **OCR defects** above; no OCR engine was installed and none was installed here (hard rule: no heavy process during the performance run). A second reading of the New Jersey date columns would convert most of the 36 to 71 percent unreadable rows.
3. **Company letters**: 8th Ohio company A rows are listed under `FS` and company H under G (headings not found); 75th Ohio company K rows are listed under I. Row counts per unit are unaffected.
4. **New Jersey must'd-out column** is not used for labels except the 23rd New Jersey; a man mustered out before July 1863 who has no remark is therefore Unknown.
5. **Order of battle conflict, 23rd New Jersey**: the OOB file lists U-23NJ (strength 340, casualties 0) in the VI Corps. Stryker's roster calls it a nine-month regiment mustered out 27 June 1863 and its history says it volunteered for service at Harrisburg during the invasion. All 1,028 rows carry the flag `contested-oob-lists-unit-at-gettysburg`; the 24 rows whose printed must'd-out date reads 27 June 1863 are Absent-Documented. Owner decision needed on the unit's place in the Theatre.
6. **OOB omissions to check**: Stryker lists a 15th New Jersey Infantry and a 10th; the OOB file has neither. This task did not determine whether either was at Gettysburg.
7. **Ohio deaths-and-burials lists** printed after the rosters of vols 5, 6, 7 (name, company, rank, died, buried, remarks) and the New Jersey and Ohio unit narratives were not parsed; they would add documented presences.
8. **Open alternatives not yet used** (found by search, not fetched or read): Storrs, The Twentieth Connecticut (IA `twentiethconnec00storgoog`, Google scan); Page, History of the Fourteenth Connecticut; Case, Lockwood and Brainard, Record of Service of Connecticut Men (1889); the New Jersey Gettysburg Battlefield Commission final report (1891) and the 1892 monuments report (IA `reportofcommissi00newj`); regimental histories of the 7th, 8th and 107th Ohio. The Connecticut Catalogue gives fate (killed, died, discharged), not wounds that were survived, which is why the 5th Connecticut has no Present-Documented man.
9. **Fox and OR regiment losses** were not parsed, so R-G5 (named casualties divided by documented casualties) is not computed for these units.

## Reproduce

Python 3.11 standard library only, run with `python -I -X utf8`, at below-normal priority (`ojc_common.py` sets it). Order: `s1_search.py`, `s3_dl.py` / `s3_dlx.py` (downloads, polite, sha256 to `acquired.json`), `djvu_pages.py ID` for each item, then `ct_parse.py`, `ct_emit.py`; `nj_parse.py`, `nj_emit.py`; `oh_parse.py`, `oh_emit.py`; `or_officers.py`; `final_stats.py` (writes `stats.json`). The cache is `tmp/library/rosters/OJC/` (not committed). `s2_meta.py` was an abandoned metadata pass.

## Files

`*.csv` one per unit (same columns as the pilot plus `unit_id`, `rank_as_printed`, `name_clean`, `age`, `basis_code`; `source_page_idx_ia` is the IA djvu leaf, page image `archive.org/download/ID/page/n{leaf-1}_w1500.jpg`), `OR27-officer-casualties.csv`, `stats.json`, `acquired.json`, `progress.md`, `QA-SAMPLE.md`, `README.md`, `unit_table.md`, `scripts/`.
