# REG family: independent audit (30 October 2026)

Auditor: a second agent that did not build the family. The builder's report was not trusted; every number below was re-derived from the files. Scope: PLAN 4.3 and 4.4 (accuracy gates, independent sampling). Machine rules kept: below-normal priority, no browser, no build, short commands. One page image (about 0.7 MB, Internet Archive, not lending-restricted) was fetched through the family's own polite fetcher to settle a row.

## 1. Result in one table

| check | result |
|---|---|
| Seeded sample (seed 41, 60 rows: 24 Present-Documented, 36 others, spread over 12 roll files plus the Regular Army, Delaware and staff files; officers included) | **42 of 60 rows faithful (70.0 percent)**. 6 hard errors (10.0 percent; one-sided 95 percent Clopper-Pearson upper bound 18.8 percent), 3 labels weaker than the source supports, 1 row that is page text and not a man, 6 name-field defects, 1 unit-attachment gap, 1 date in the wrong field (section 2) |
| Gate R-G1 (names, 99 percent) | **not met**: 53 of 60 names clean against the OCR text layer (88.3 percent); against the page image it is lower (the builder's own image check: 8 of 13 Rhode Island names exact) |
| Gate R-G2 (dates, 99 percent) | **not met**: 4 of 60 rows with a wrong or misplaced date |
| Gate R-G3 (labels, zero hard errors) | **not met before repair** (6 hard errors in 60). The cause of each hard error is fixed in code (section 3); the repaired rows have not been re-read against page images |
| Gate R-G9 (the full PLAN 4.4 draw: 299 rows with zero errors, or 628 with at most 2, per stratum, read from page images) | **not run**. This audit is a 60-row check, not the 4.4 test, and does not replace it |
| Totals in `stats.json` | the builder's totals were arithmetically right for the files as they stood: 11,365 rows (Present-Documented 359, Absent-Documented 3,402, Unknown 7,604; 3,451 unreadable), recounted from the CSVs with the 75 cross-reference rows and the 22 doubled battalion rows excluded as the builder said. "names: 11,365" is a count of rows, not of men (10,994 distinct unit-and-name pairs), and it contained 436 rows that are not men (N1 below) |
| Totals after the repair | 10,977 rows: Present-Documented 355 (3.2 percent), Absent-Documented 3,419 (31.1 percent), Unknown 7,203 (65.6 percent); unreadable-or-ambiguous 3,173 (28.9 percent); 436 rows tombstoned in `_quarantine/`. Recounted independently from the CSVs; equal to `stats.json` |
| Units in scope | 51 recounted from `baseline/dist/data/oob` (17 infantry, 9 cavalry, 5 horse batteries, 20 foot batteries); 49 have names; the two without are the ones the builder named |
| Hashes | all 36 files of `acquired.json` match sha256 and byte count in `tmp/library/rosters/REG/`; the reused OR 27/1 text (`tmp/bt/rosters/cache/or27_1.txt`) matches its recorded sha256; `qa_md_p639.jpg`, fetched in this audit, is ledgered |
| Lending-restricted or bot-blocked sources | **none used.** The metadata of every Internet Archive item is stored in `acquired.json` with `access_restricted_item` empty; hosts in the ledger: archive.org (30 files), civilwar.delaware.gov (4; no robots file, state-published volumes), researchonline.net (2: its robots.txt and one HTML page). NPS, FamilySearch, Fold3, Ancestry, Find a Grave and HathiTrust were not requested. One loose end: `ro_decw_unit2.htm` (researchonline.net, a commercial genealogy site that SOURCES.csv VSG17 describes as "no reuse licence stated") is cached and ledgered but no parser reads it and no row comes from it; it should be deleted or marked "not used" |
| Privacy | the fetcher's user agent carried the owner's account handle. It went to archive.org, civilwar.delaware.gov and researchonline.net on every request of the builder's run and was written into `acquired.json` and `regfetch.py`. Both files are scrubbed (new requests send a neutral agent); the earlier requests cannot be recalled. The handle also appears in four files outside this family (`docs/facts/FETCH-LOG.md`, `docs/historian/sources-v2/VERIFICATION-METHOD.md`, `docs/plan/specialists/deploy-history.md`, `docs/plan/specialists/infra-netlify.md`); not touched here |

## 2. How the sample was drawn and read

Seed 41 (`random.seed(41)`) over the frozen pre-audit CSVs: 14 Present-Documented rows from the Regular Army, Delaware and headquarters files, 10 Present-Documented rows from the roll files, then 3 non-Present-Documented rows from each of the twelve roll files (3rd MD, 1st MD Eastern Shore, 1st MD Potomac Home Brigade, 1st MD Cavalry, Purnell Legion, 2nd RI, Batteries A and B 1st RI, 7th WV, 1st WV Cavalry, 3rd WV Cavalry, Battery C WV).

Each row was opened against its cached source: the word-coordinate pages of the djvu.xml scans (Maryland, Rhode Island, West Virginia), the Heitman text (Part II and Part III), the Rhodes and Aldrich battery texts, the OR 27/1 text, Seville's text; the Dillon row also against the page image (book p. 617). For each row: name spelling, rank, company, unit, the date or remark that drives the label, and whether the label follows PLAN 2.2. Limit: "name spelling" means against the OCR text layer, except on the one page read as an image. A row can carry more than one finding; "faithful" means none.

Row numbers are 1 to 60; `file:n` is the line of the frozen copy in `_pre_audit/` (line 1 is the header).

| # | row | name as printed | label before repair | verdict [defect id] |
|---|---|---|---|---|
| 1 | u-3us-2:6 | Mourton, Stanley | Present-Documented | ok |
| 2 | u-2us:7 | Lacey, Francis E. | Present-Documented | ok |
| 3 | u-17us:16 | Wilson, Robert P. | Present-Documented | ok |
| 4 | u-12us-1:8 | Byrne, Thomas | Present-Documented | **HARD**: unit: brevet regiment taken from a later clause (12 inf); Heitman has him in the 2nd Infantry on 2 July 1863 [H1] |
| 5 | u-3us-2:8 | Asbury, Henry | Present-Documented | ok |
| 6 | u-1de:25 | David M. Sempler | Present-Documented | ok |
| 7 | u-1de:21 | Thomas P. Carey | Present-Documented | ok |
| 8 | u-3us-2:7 | Parker, Daingerfield | Present-Documented | ok |
| 9 | hq-engineer:3 | George H. Mendell | Present-Documented | ok |
| 10 | u-1de:7 | William Smith | Present-Documented | ok |
| 11 | hq-ordnance:2 | John R. Edie | Present-Documented | ok |
| 12 | u-6us-cav:12 | Gordon, David Stewart | Present-Documented | **HARD**: unit: 6th Cavalry (a 1892 clause); in 1863 he was in the 2nd Cavalry [H1] |
| 13 | u-12us-1:2 | Thomas S. Dunn | Present-Documented | ok |
| 14 | u-11us:14 | Field, Francis Almon | Present-Documented | ok |
| 15 | u-art-b1ri:224 | Hammond, Joseph | Present-Documented | ok |
| 16 | u-2ri:1054 | Fiskc, Thomas W. D. | Present-Documented | **HARD**: Present-Documented from "Deserted July 1, 1863"; a desertion is not a casualty at Gettysburg [L1] |
| 17 | u-1md-phb:534 | land Infantry. Kuhn, Leander H. Co | Present-Documented | **NAME**: name field holds page header, rank and dates [N2] |
| 18 | u-1md-phb:1484 | Lowry, Geo. G. | Present-Documented | ok |
| 19 | u-art-b1ri:108 | Austin, Russell | Present-Documented | ok |
| 20 | u-art-b1ri:195 | Felt, Daniel W | Present-Documented | ok |
| 21 | u-art-b1ri:66 | Charles H. Paine | Present-Documented | ok |
| 22 | u-art-b1ri:16 | Joseph S. Milne | Present-Documented | **UNIT**: attached to Cushing's Battery A, 4th US on 9 June 1863; shown only under Battery B 1st RI [A2] |
| 23 | u-1md-eh:444 | Dillon, Lewis J. | Present-Documented | **HARD**: a neighbour's remark joined: he is "Veteran, transferred to Co. D 11th Md", not killed at Gettysburg; dates wrong (page image) [M1] |
| 24 | u-1md-phb:234 | Thomas J. Humes 1st Lieut. Dec. 13 | Present-Documented | **NAME**: name field holds rank and dates [N2] |
| 25 | u-3md:1612 | Ahlers, Henry | Absent-Documented | ok |
| 26 | u-3md:1207 | O'Brian, John | Unknown | **WEAK**: "Transferred, January 3, 1863, to V. R. C." left Unknown; should be Absent-Documented [L4] |
| 27 | u-3md:69 | 9, 1862; promoted February Va.; mu | Unknown | **NOT A MAN**: row is page text ("9, 1862; promoted February Va.; mustered See roster") [N1] |
| 28 | u-1md-eh:450 | Thos. Numbers | Unknown | ok |
| 29 | u-1md-eh:294 | Lambdin. Thomas | Unknown | **NAME**: middle initial R. sits in the rank field [N2] |
| 30 | u-1md-eh:225 | Willey, Solomon | Unknown | ok |
| 31 | u-1md-phb:151 | Nuse, Jos. W. | Absent-Documented | ok |
| 32 | u-1md-phb:1509 | Myres, John H. | Absent-Documented | ok |
| 33 | u-1md-phb:752 | Beaver, Oliver | Absent-Documented | ok |
| 34 | u-1md-cav:1503 | Brown, Otto | Unknown | ok |
| 35 | u-1md-cav:977 | Brooks, Samuel | Unknown | **NAME**: middle initial H. sits in the rank field [N2] |
| 36 | u-1md-cav:259 | Miller, Charles | Unknown | ok |
| 37 | u-purnell-md:144 | Hillyard, Jas. A. | Unknown | ok |
| 38 | u-purnell-md:173 | Miller, John | Unknown | ok |
| 39 | u-purnell-md:6 | Jos. W. Strong | Unknown | ok |
| 40 | u-2ri:256 | Angell. .Marshall \V. | Unknown | **WEAK**: "Discharged Mar. 20, 1862" left Unknown (day garbled); should be Absent-Documented [L5] |
| 41 | u-2ri:204 | SuUey, Abran | Unknown | ok |
| 42 | u-2ri:297 | Goff, John | Unknown | ok |
| 43 | u-art-a1ri:197 | LAWRENCE, CHARLES A | Absent-Documented | **HARD**: Absent-Documented ENL-AFTER from a death date (killed Wilderness, 1864): the man may well have been at Gettysburg [L7] |
| 44 | u-art-a1ri:53 | DESMOND, MICHAEL | Absent-Documented | **HARD**: Absent-Documented ENL-AFTER from a wound date (Bristoe, Oct 1863) [L7] |
| 45 | u-art-a1ri:17 | FIFTH SERGT. CHARLES D. OWEX | Absent-Documented | **DATE**: resignation date stored in date_in; label right [L7] |
| 46 | u-art-b1ri:151 | Child, William D | Duplicate-Xref | ok |
| 47 | u-art-b1ri:177 | Cruikshank, James | Absent-Documented | ok |
| 48 | u-art-b1ri:129 | Brown, Fenner A | Unknown | ok |
| 49 | u-7wv:639 | Starkey, Nathan | Unknown | ok |
| 50 | u-7wv:28 | Riley, George | Unknown | ok |
| 51 | u-7wv:627 | Pethel, Morris | Unknown | ok |
| 52 | u-1wv-cav:374 | uucuiey, Jonn | Unknown | **NAME**: garbled name (uucuiey, Jonn) not flagged [N2] |
| 53 | u-1wv-cav:892 | Rittman, Daniel | Unknown | **WEAK**: remark "June 28, 63, at Winchester" has lost its verb; row says on-roll-undetermined [U3] |
| 54 | u-1wv-cav:119 | McCanless, John | Unknown | ok |
| 55 | u-3wv-cav:310 | Curry, Granville | Absent-Documented | ok |
| 56 | u-3wv-cav:411 | Mavse, John . . . KiUed in Action | Unknown | **NAME**: name field holds "... KiUed in Action" [N2] |
| 57 | u-3wv-cav:151 | Myers, Enos | Unknown | ok |
| 58 | u-art-cwv:15 | Kitchie, St. Clair | Unknown | ok |
| 59 | u-art-cwv:13 | Power, Thomas | Unknown | ok |
| 60 | u-art-cwv:54 | Wendlekin, Martin | Unknown | ok |

## 3. Defect register (what was wrong, how many rows, what was done)

Counts are for the whole family, not only the sample.

| id | defect | rows | action |
|---|---|---|---|
| H1 | `heitman_gb.py`: the pattern that reads the years of a service clause was stored with backspace characters (a `\b` escape written into a non-raw string), so it never matched, every clause updated "the regiment he served in", and each brevet was assigned to the last regiment named before the Gettysburg clause (often a post-war assignment). Examples: Byrne 12 inf -> 2 inf, Gordon 6 cav -> 2 cav, Lacey 3 inf -> 2 inf. Agreement of the brevet regiment with Heitman's own Part III regiment for the same men rose from 9 of 13 to 11 of 13 | 45 of 282 Heitman rows changed unit; about 25 unit files changed | fixed (raw escape); `heitman_gb.py` and `reg_assemble.py` re-run |
| H2 | Part II paragraphs holding two entries (the OCR lost the blank line): the Gettysburg clause was credited to the first name and the first entry's service | 1 man missing (Bancroft, Eugene Adolphus), 1 wrong service history (Byrne) | `split_entries()` added |
| H3 | A commission in a Regular regiment was taken as presence with that regiment: officers who held a volunteer general, colonel or staff rank before the battle (Doubleday, Ayres, Pleasonton, Weed, Goodhue, Paul) were filed under a Regular regiment | 6 | unit left empty, note `outside-regiment` in `heitman_gettysburg_officers.csv`; they stay in that file as named at Gettysburg, unit unresolved |
| A1 | `reg_assemble.py` deduplicated officers by surname plus first initial and silently dropped the second man when the source was the same (R-G7) | not countable from the output | replaced by a compatibility test (surname, first name, middle initial); the Perrin conflict (Walter S. / William S.) is still carried as two rows |
| A2 | Rhodes (1894): men "attached to Cushing's Battery A, Fourth United States Artillery" (Milne, mortally wounded at Gettysburg) appear only under Battery B | 1 flagged in B; Battery A officers who served elsewhere at the battle (Hazard, Blake) flagged | flags `attached-to-another-unit-at-the-battle`, `serving-outside-battery-a-at-the-battle`, `attached-elsewhere` |
| L1 | "Deserted" was a casualty word: men with "Deserted, July 1/2/3, 1863" were Present-Documented. A desertion is not a casualty at Gettysburg | 11 (3rd MD 1, 1st MD EH 2, 1st MD Cav 2, 2nd RI 5, PHB 1) | Unknown, flag `deserted-in-battle-window` (a plain "died" dated 1-3 July is likewise Unknown: 1 row) |
| L2 | hyphenated words in remarks ("Get- tysburg", "trans- ferred") were not matched | 4 | words joined before matching |
| L3 | garbled "Gettysburg" (Oettriborg, Gettrtbvg, Qet^tbun, Gettsyburg) and garbled casualty words (KlUed, Cilled, Woimded) were missed; "in action, July 1863, Gettysburg" with the casualty verb lost on the line above was Unknown | 12 became Present-Documented (PHB, 3rd MD, 2nd RI, 7th WV, Battery C WV); 7 of them flagged `casualty-word-not-legible` | fuzzy match with a tight threshold (the 3 non-pattern tokens it admits in the whole corpus were read: all are Gettysburg) |
| L4, L5, L10 | separations missed: a date between "Transferred" and "to" ("Transferred, January 3, 1863, to V. R. C."); a month and year with an unreadable day ("Discharged Mar. '2(1, 1862"); the date read from the first date of the clause instead of the date after the verb ("promoted ... Nov. 5, 1862: died ... 1864") | 70 Unknown -> Absent-Documented | rules widened; with an unreadable day the last day of the month is used, so it decides only when the whole month lies before 1 July 1863 |
| L6 | a remark that names a casualty or a death but has no legible date was `on-roll-undetermined`, which asserts the man was on the roll with no event | 84 -> `unreadable-or-ambiguous` | PLAN rule 13 applied |
| L7 | Batteries A and B: the enrolment date was taken from the first date anywhere in the remark, so men killed or wounded after the battle became "not yet enlisted" and Absent-Documented (Lawrence, Desmond: hard errors) | Battery A: every entry whose first date was an event date; Battery B: 6 rows now unreadable (garbled year in the Mustered phrase) | date read only from an Enrolled, Mustered, Enlisted, Commissioned or Drafted clause |
| L8 | Battery A parse: entries whose garbled all-capital name the parser could not recognise were appended to the entry above, so one man carried another's casualty or discharge (Hayden received Higgins's "died of wounds at Gettysburg"; Wickes received Zimala's "killed at Gettysburg"; Desmond was merged with Donegal) | 198 rows -> 246 rows | re-parsed by paragraph (the source prints one entry per paragraph); the recruits section is now separate from the original members; 42 narrative paragraphs excluded and counted |
| L9 | in a Battery A entry "transferred to Battery A" and "discharged to accept promotion as captain in Battery A" are inbound moves, not separations (Hazard, chief of artillery of the Second Corps at Gettysburg, was Absent-Documented) | 3 | rule added; Hazard is Present-Documented (OFFICER-HISTORY), flagged |
| L11 | where the enlistment date and a separation date disagree (an OCR error, or a neighbour's remark was joined to the man) the label stood unflagged | 21 rows (15 with an enlistment after the battle, 6 with both before it) | Absent-Documented stands (either reading puts the man off the roll on 1-3 July when the enlistment is after the battle); flag `dates-conflict-...` |
| N1 | page headers and narrative text became "men": "NAME." / "RANK.", "MUSTER IN. OR DISCHARGE.", "FIELD AND STAFF.", the running regimental narrative in the West Virginia returns, several names merged into one cell. These break R-G8 (no row without a source name) | **436 rows** (3rd MD 69, 1st MD EH 10, PHB 125, 1st MD Cav 23, Purnell 1, 2nd RI 5, 7th WV 98, 1st WV Cav 27, 3rd WV Cav 77, Battery C WV 1) | moved to `_quarantine/<file>.csv` with the reason (tombstones, not deletions); counted in `stats.json`. Some of them hold real men whose names the text layer merged; they are not lost, they are not publishable as rows |
| N2 | rank, dates or a status word sitting in the name field; a middle initial sitting in the rank field; garbled names unflagged | split out in 388 rows (rank and dates), 59 (status word), 62 (page-header text), ~500 (initial returned to the name); `ocr-suspect-name` on 596 rows | names are never silently corrected: the printed text stays, the flag says "check the page image" |
| M1 | Maryland p. 639 (and any page where the OCR dropped a name line): the dates and remark of the man whose line was lost were joined to the man above. Dillon, Lewis J. was made a Gettysburg casualty; the casualty belongs to Eaton, Wm. H., whose name line the OCR lost | 1 confirmed on the page image; others of this kind cannot be found without images | Dillon corrected; Eaton, Wm. H. and Dean, Bennett A. added from the page image (flag `added-from-page-image-in-audit`); the class of defect is open (section 5) |

Net effect on the twelve roll files: rows 11,183 -> 10,797 (436 quarantined, Battery A +48 net, 2 added from the page image); Present-Documented 103 -> 101; Absent-Documented 3,401 -> 3,418; the relabelled rows carry `audit-relabelled-from:<old label>/<old status>` in `parse_flags` (about 200). The officer, staff and Heitman files: 279 -> 276 rows (merges and unit changes), 70 files before and after. The frozen pre-repair files are in `_pre_audit/` (every CSV, `stats.json`, `README.md`, `heitman_gettysburg_officers.csv`).

## 4. Repairs: where they live

* `pipeline/reg/audit_fix.py` (new): reads `_pre_audit/*.csv`, applies L1 to L11, N1, N2, the Battery A re-parse and the two page-image additions and the one correction, writes the twelve roll CSVs and `_quarantine/`; `_audit_run.json` is the run log. It always starts from the frozen copies, so it can be re-run.
* `pipeline/reg/heitman_gb.py`, `reg_assemble.py`, `reg_stats.py`: H1 to H3, A1, quarantine counts in `stats.json`.
* `pipeline/reg/regfetch.py`: user agent without the account handle.
* Order to reproduce: `heitman_gb.py`, `reg_assemble.py`, `audit_fix.py`, `reg_stats.py` (the first-pass parsers `md_parse.py`, `md_units.py`, `ri_parse.py`, `ri_batteries.py`, `wv_parse.py`, `wv_units.py` produced the frozen copies and were not changed).
* Invariants that hold on the repaired roll files (checked by script): no Present-Documented row without a Gettysburg casualty clause, a casualty dated 1-3 July 1863, or a page-image addition; every ENL-AFTER row has an enlistment date after 3 July 1863; no SEP-BEFORE basis names a date on or after 1 July 1863; no Absent-Documented row carries a Gettysburg casualty clause.

## 5. What could not be fixed (open; filed in GAPS.md as GREG09 to GREG12)

1. **The PLAN 4.4 independent sample has not been run** (R-G9). The repaired files need it before publication; 60 rows with 6 hard errors is far from zero errors in 299.
2. **OCR drops and misaligns lines** (M1 class). Only a page-image pass finds them; the text layer was incomplete on the one page read as an image. The builder wrote that no OCR engine is installed; SOURCES.csv row PA-06 (Pennsylvania family) records an offline operating-system OCR component (Windows.Media.Ocr) as used on this machine. It was not tried here, but a second reading of the REG page images with it is the cheapest route to GREG09 and GREG10 (printed pages only; it will not read the Delaware handwriting).
3. **Names are OCR text, not image text.** The builder's 54-row image check stands (8 of 13 Rhode Island names exact, about 37 of 41 West Virginia). About 29 percent of rows remain `unreadable-or-ambiguous`, mostly because the text layer lost a year, month or remark word.
4. **Heitman brevets "in the Gettysburg campaign"** (not "at the battle") dated 3 July (Gordon, Williston, Norris, Pennington) are Present-Documented on the date alone; the clause says campaign. They need the OR or a regimental report to confirm.
5. **Regular regiment membership of Heitman brevet officers** rests on the regiment held on 2 July 1863; detached or staff duty other than the six flagged cases is not visible in Heitman.
6. **Battery A (Aldrich)** stays a partial source with garbled all-capital names (64 flagged); about three entries still carry a neighbour's text; the "attached men" sections name regiments, not men of this battery.
7. **Rows that carry a remark whose event verb is lost** ("June 28, '63, at Winchester") stay `on-roll-undetermined`; they should read `unreadable-or-ambiguous`.
8. Unchanged from the builder's list: Delaware enlisted men (the three cached state PDFs, about 160 handwritten pages), Regular Army enlisted men, Army Register parse, WV second scan, RI Battery C. Under DEC-019 (the owner's instruction that roster information is public and to be fetched without asking) the Delaware transcription and the Army Register parse need no permission and are the next jobs.

## 6. Reproduce the sample

`random.seed(41)`; rows from `_pre_audit/*.csv` except `heitman_gettysburg_officers.csv`: `random.sample` of 14 from the Present-Documented rows of the non-roll files, `random.sample` of 10 from the Present-Documented rows of the twelve roll files, then, for each roll file in the order 3md, 1md-eh, 1md-phb, 1md-cav, purnell-md, 2ri, art-a1ri, art-b1ri, 7wv, 1wv-cav, 3wv-cav, art-cwv, `random.sample` of 3 from its rows that are not Present-Documented (files read with `sorted(glob)`, rows in file order). The 60 verdicts in section 2 are the auditor's reading.
