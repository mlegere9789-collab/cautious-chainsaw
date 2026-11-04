# Independent audit of the C-NCLA roster family, 30 October 2026

Auditor: a second agent working from PLAN sections 2.2, 4.3 and 4.4, the cached source text (`tmp/library/rosters/C-NCLA/`, via `acquired.json`) and two page images. Machine rules of the builder kept: below-normal priority, no browsers, no builds, short foreground commands. Two public-domain page images were fetched from archive.org (plain GET, same user agent, 2 s apart) to settle questions the text could not: Moore vol 2 n465 and Booth vol 3 bk 2 pt 2 n646.

Status after the audit: **not publishable as complete**. R-G1, R-G2, R-G3 and R-G9 are not met (section 6). The first output had hard errors; they are repaired, the sample after repair has none, but 60 rows prove nothing at the PLAN threshold.

A frozen copy of the first output is in `_pre_audit/` (units, scripts, stats, README, QA-SAMPLE, acquired.json, booth_entries.json). Everything below that says "before" is that copy; "after" is the current `units/`.

## 1. Sampling (PLAN 4.4, scaled down to what one session can read)

* Seed 41, 60 rows from the first output. Units shuffled with `random.Random(41)`; the draw cycles through the shuffled unit list (50 units, then 10 more) and takes category PD (Present-Documented), OFF (officers section; for Booth any row if the unit has no officers section) or ANY in turn, so every one of the 50 units appears, 20 rows are Present-Documented and 20 are officers or senior ranks. Ids: C-28NC-1125 C-7NC-0014 C-14NC-0617 C-16NC-0909 C-ART-Richardson-0009 C-43NC-0218 C-ART-Reilly-0103 C-21NC-0915 C-47NC-0044 C-34NC-1307 C-8LA-0404 C-9LA-0235 C-6NC-0046 C-52NC-0010 C-4NC-0276 C-14LA-0066 C-6LA-0469 C-20NC-0822 C-12NC-0761 C-15LA-0545 C-55NC-0572 C-22NC-1383 C-38NC-S-0007 C-3NC-0029 C-13NC-1038 C-7LA-0329 C-ART-Manly-0045 C-2NC-B-0070 C-33NC-0016 C-53NC-0081 C-18NC-0423 C-ART-Norcom-0042 C-30NC-1444 C-57NC-0292 C-1LA-T-1501 C-45NC-0846 C-11NC-0144 C-26NC-0996 C-10LA-0541 C-ART-Maurin-0129 C-ART-Miller-WA-0038 C-2LA-T-0101 C-5LA-0449 C-2NC-0134 C-5NC-0895 C-ART-Squires-0053 C-1NC-1298 C-23NC-0941 C-32NC-1158 C-37NC-1453 C-28NC-0840 C-7NC-1452 C-14NC-0021 C-16NC-1370 C-ART-Richardson-0039 C-43NC-0586 C-ART-Reilly-0054 C-21NC-0638 C-47NC-0184 C-34NC-0772 (row ids of `_pre_audit/units`).
* Each row was read against its cached source line and the lines after it (name spelling, rank, company, unit, date and remark that drive the label, the label by PLAN 2.2). Company letters of the 44 NC rows were also checked against the nearest preceding company heading in the text (44 of 44 agree once OCR forms such as `COMPANY 1`, `COMPANY G` for C and `COMPANY I.*` are read as the pipeline reads them).
* Not independent of the repairs: the same agent that sampled also repaired, and the strata of PLAN 4.4 (about 40 strata, 628 rows each) were not drawn. Sample size 60 supports no gate; it is a defect finder.

## 2. Result on the first output (60 rows)

| field | agree with the print | defects |
|---|---|---|
| name | 56 of 60 (93.3 percent) | C-ART-Manly-0045 `e. June 8th W. A.` (the name was cut off by the scan margin, row is a fragment); C-2LA-T-0101 `John Mj` (two columns mixed, flagged); C-5NC-0895 `C. C Xewsom` (OCR X for N, not flagged); C-ART-Miller-WA-0038 `Pielert, George, Artificer` (rank in the name) |
| rank | 57 of 60 | C-2NC-0134 rank `1st Lieut.; p. from `; C-1NC-1298 rank `Captain; cm. November` (the commission date fell into the rank); the Miller-WA row above |
| company, unit | 60 of 60 | none (NC companies 44 of 44 against the headings; Booth unit from the command phrase) |
| dates | 57 of 60 | C-1NC-1298 date lost; C-21NC-0915 and C-55NC-0572 blank because the OCR printed `'02` and `2Sth` (honest blanks, counted as misses) |
| label (PLAN 2.2) | 58 of 60 (96.7 percent) | **C-ART-Richardson-0039 (R. Urquhart) Present-Documented by rule 6 although the entry says En. June 23, 1863, Mobile (page image n646 read): a hard error**; C-9LA-0235 (R. T. Forest) Unknown, should be Absent-Documented (roll May 1863 to Feb 1864 Absent; the OCR month `Fell.` was not read) |
| basis text | 53 of 60 | C-ART-Richardson-0009 says no later roll is abstracted though the entry gives one (Absent, wounded 6 July at Williamsport); C-15LA-0545 and C-ART-Norcom-0042 say `enlisted before the battle` with no enlistment date; C-38NC-S-0007 and C-14NC-0021 quote an invented `1862-08-15` and `1861-09-15` for month-only dates; C-ART-Miller-WA-0038 (Transfd. to Maryland line, 1862) left Unknown |

Against the gates (PLAN 4.3): R-G1 name 93.3 percent against 99; R-G2 dates 95 percent against 99; R-G3 label 96.7 percent against 99 with one hard error against zero. All three fail on the first output.

## 3. Totals (recounted from the CSVs, not from the builder's tables)

Rows, labels, roll statuses, per-unit rows, per-unit labels, per-unit roll statuses, name-flagged counts, the NC and LA split and the excluded count were recomputed from `units/*.csv`. **The builder's `stats.json` matched exactly, 0 mismatches over 50 units (57,801 rows; 592 excluded)**. After the repairs `stats.json` was regenerated and recounted the same way: 0 mismatches (58,483 rows; 747 excluded). No duplicate `row_id`; every row has a locator with a scan page index; every Present-Documented row has a basis.

| | before | after |
|---|---|---|
| rows | 57,801 (NC 49,400; LA 8,401) | 58,483 (NC 49,347; LA 9,136) |
| Present-Documented | 5,316 | 5,468 (NC 4,113 to 4,130; LA 1,203 to 1,338) |
| Absent-Documented | 13,889 | 14,229 (NC 11,798 to 11,820; LA 2,091 to 2,409) |
| Unknown | 38,596 | 38,786 |
| contested | 170 | 220 |
| unreadable-or-ambiguous | 12,560 (21.7 percent) | 11,761 (20.1 percent) |
| withheld, UNIT-UNRESOLVED | 592 | 747 |
| withheld, no recoverable name | 0 | 398 (NC 162, LA 236) |
| tombstoned comma-less NC fragments | 0 (17 silently dropped) | 19 |

## 4. Sources

* `acquired.json`: 34 files, **0 sha256 or size mismatches** against the cache (562 MB). Rechecked after the repairs.
* Hosts: archive.org only (`/download/<id>/..._djvu.txt` and `_djvu.xml`, `/metadata/`, one advancedsearch). `robots.txt` read and saved. FamilySearch, Fold3, Ancestry, Find a Grave, NPS and NARA not touched.
* Lending: IA metadata `access-restricted-item` is null for all 13 items and every full-text file was served; no borrow, login, key or cookie. No bot block: the one `blocked` entry is the transient HTTP 500 on the Moore v4 xml, retried and fetched (recorded). Sources are 1882 and 1920 US publications.
* Page images: the two fetched for this audit are not part of the family data (kept in the session scratch folder). Page n465 shows `Tackett, John W., e. June 18th, '61; Yadkin co.; m. at Gettysburg.` on book p.456 (row C-28NC-1121 label and locator correct); page n646 (book p.899) shows `Urquhart, R. ... En. June 23, 1863, Mobile, Ala.` and `Urquhart, Robert, Jr. ... En. June 22, 1863, Mobile`.

## 5. Defects found, repaired and measured (all in `scripts/`; before and after counts)

| # | defect | before | after | repair |
|---|---|---|---|---|
| D1 | NC: an enlistment dated after the battle, or a separation (often the next man's, glued on), was applied before a casualty or capture at Gettysburg; the label was Absent-Documented. A label asserting the opposite of the remark (hard errors) | 38 NC rows Absent with Gettysburg in the entry (eg C-26NC `e. Sept. 10th, '63 ... w. July 1st, '63, at Gettysburg`, C-23NC `w. and pr. at Gettysburg; d. July 7th, '62`) | 0; 34 rows Unknown, `contested`, both statements quoted | PLAN order: rule 2 before 7 and 8, disagreement is rule 10 (`moore_pipeline.py` classify) |
| D2 | NC: OCR forms of Gettysburg not read (`Jettysburg`, `Get ysburg`, `Get' tysburg`, `Grettysburg`, `( icttysburg`) | about 20 rows Unknown | read (word-initial `Gett`, letter-fuzzy match; `Badgett` is not Gettysburg) | `GETT`, `GFUZZ` |
| D3 | Moore: month-only dates stored as the 15th and quoted as exact; 8 men who enlisted `July, '63` were Absent-Documented on an invented 15 July | 656 enlistment dates, 2,048 quoted basis dates, 8 labels | `YYYY-MM`, `(day not printed)`; July 1863 month-only is Unknown | `dates()`, `fmt_date` |
| D4 | Booth: `Present on all Rolls to Dec. 1863` was read from January 1861, so men enlisted after the battle were Present-Documented by rule 6 | 14 rows (eg enlisted 16 July, 20 July, 3 Aug 1863) | 0 (one man, `En. July 3, 1863, Gettysburg`, is a real statement) | roll start clamped to the enlistment month |
| D5 | Booth: every day number cut to 28 | 153 enlistment dates (`Aug. 30` stored as the 28th; separation dates too) | 0 | `calendar.monthrange` |
| D6 | Booth: a second man glued into the first man's paragraph (the OCR dropped the blank line). His rolls, captures and deaths were read as the first man's and he himself was lost | 559 of 8,993 entries (6.2 percent); wrong-unit contamination (a 6th La. man inside a 5th La. entry) | 10,119 entries (1,126 men recovered); contamination removed | `split_inside`: split at `Surname, Given, Pvt.`, locator by character offset |
| D7 | Booth: a capture or casualty at Gettysburg was overridden by an earlier separation (a deserter who returned and was captured, a death text that names Gettysburg) | 12 men Absent though captured or wounded there (eg Bois, F., 15th La.: deserted 1862, returned, captured at Gettysburg 4 July 1863) | 0; Present when the entry says he returned, otherwise Unknown, `contested` | rule 2 before 7, rule 10 |
| D8 | Booth: roll abstracts unread because of OCR (`Polls`, `Roil`, `Pulls`, month `Fell.`, `llospl.`) and desertion not a roll separation | 73 rows said `following roll not abstracted` (21 had one); R. T. Forest Unknown | rolls read; Forest Absent (ABS-NOTATION); `Deserted` counted | `booth_rolls.py`, `booth_parse.py`, `booth_classify.py` |
| D9 | Booth: the withholding of Western-theatre entries (Chickamauga, Chattanooga, Missionary Ridge ...) was applied only to the 1st La.; a 15th La. `captured at Chickamauga` was published as a Gettysburg man | 592 withheld | 747 withheld (all 10 LA units) | `WEST2` |
| D10 | NC: rank read to the next comma, so remarks fell into the rank and the Gettysburg word was lost; a comma after an initial or given name read by the OCR as a double quote made the remark part of the name | 698 rank fields with remarks (4 hid Gettysburg); 876 names with date or remark text | 23; 27 | `RANKP`, comma repair, name split at the enlistment word |
| D11 | NC: entries glued on one line without a `cm.` or `e.` head (officers), a name at the end of the previous line (`Henry K. Burgwyn,` / `Colonel, cm. ...`), a rank word taken for a surname (`cm. in September Colonel`), a continuation line `Seven Pines, 2d Manassas and Gettysburg.` taken for an officer, a page head run into an entry | 107 rows with two enlistment words; fragments such as `Captain` as name | 87 rows with two words (residue, GN05) | `SPLIT_OFF`, `NOTRANK`, `RUNIN`, `TAILNAME`, `OFFICER_START` guard |
| D12 | NC batteries read from the Google scan, which drops pages and cuts the margin | Manly's Company A 187 rows, Reilly 211 | 304 and 220 (Emory scan) | `EMORY_UNITS` |
| D13 | R-G7: Moore rows without a comma dropped silently | 17 rows, no tombstone | 19 in `units/_tombstones_unparsed-rows.csv` | classify returns them |
| D14 | Locators: `djvu.txt line N` was the 0-based index (one line early) and in glued Booth entries pointed at the first man of the paragraph | all 57,801 rows | 1-based; sub-entries located by offset | `build_nc.py`, `booth_classify.py` |
| D15 | Basis text that states something the entry does not (`enlisted before the battle` for men with no enlistment date; `no later roll` where one is printed) | 2,486 LA rows with the first wording | wording states what is known | `booth_classify.py` |
| D16 | Fragments published as men (no name: `Pvt. Co. K. 10th La. Infty. Appears on ...`, `'63 July`, `e. June 8th W. A.`) | 593 rows with a rank word or date text as name | 398 withheld and kept in `units/_tombstones_no-name-rows_*.csv`; 5 remain | `no_name` |
| D17 | Booth rule 6 for men enlisted in June 1863 (a depot enlistment 1 to 23 June with rolls Present from enlistment) | 1 in the sample (R. Urquhart) | 13 Unknown, `contested` | `booth_classify.py` |

Objective whole-population checks (`work/checks_pre.txt` and `work/checks_post.txt`): NC Absent-Documented with Gettysburg named 38 to 0; LA Absent with a Gettysburg casualty word 12 to 0; LA Present with an enlistment after 3 July 1863 14 to 1 (the 3 July man); NC Present with an enlistment after the battle 0 to 0; Present rows with no Gettysburg word and no dated casualty 11 to 13 (all are OCR variants or `c July 1st, '63`, read by hand: genuine).

Conservation (R-G7), recomputed per unit on the final output: NC rows after splitting 49,528 = published 49,347 + 162 no-name fragments + 19 comma-less fragments; LA entries 10,119 = published 9,136 + 236 no-name fragments + 747 unit-unresolved. 0 mismatching units out of 35 NC and 15 LA. (Moore scan-repeat tombstones, kept in `work/moore_classified_*.json`, are a separate earlier step.)

## 6. Sample after repair (60 rows, seed 42, drawn on the repaired output)

Ids: C-38NC-S-0968 C-34NC-0031 C-2NC-B-0387 C-20NC-0175 C-14LA-0569 C-ART-Miller-WA-0037 C-3NC-1574 C-1LA-T-1031 C-47NC-0740 C-28NC-1702 C-52NC-0024 C-32NC-0142 C-21NC-0134 C-13NC-0994 C-7LA-0237 C-6NC-1362 C-1NC-0156 C-37NC-0163 C-5LA-0431 C-10LA-0106 C-ART-Manly-0194 C-2NC-0926 C-55NC-0404 C-ART-Richardson-0040 C-8LA-0514 C-4NC-0645 C-45NC-0758 C-30NC-0921 C-33NC-0053 C-9LA-0548 C-ART-Norcom-0010 C-5NC-0411 C-53NC-1093 C-ART-Maurin-0167 C-22NC-1215 C-ART-Squires-0020 C-ART-Reilly-0160 C-12NC-0691 C-43NC-0552 C-6LA-0741 C-14NC-0320 C-57NC-0664 C-15LA-0055 C-18NC-0422 C-23NC-0065 C-26NC-1305 C-2LA-T-0413 C-11NC-0548 C-16NC-0365 C-7NC-0335 C-38NC-S-1162 C-34NC-1037 C-2NC-B-0135 C-20NC-1023 C-14LA-0362 C-ART-Miller-WA-0059 C-3NC-0292 C-1LA-T-0659 C-47NC-0017 C-28NC-0505.

Label 60 of 60, hard errors 0. Name 58 of 60 (C-7LA-0237 `Martin)` fragment, flagged; C-23NC-0065 `M Freeman` loses the second initial). Entry or unit: C-10LA-0106 held a 9th Battalion man glued to a 10th La. man and C-47NC-0017 holds a glued second man (E. P. Harris); the first was repaired afterwards (the glued head follows `Infty` without a period) and the second is residue. Locator: C-ART-Maurin-0167 and C-6LA-0741 pointed at a different man with the same surname before the offset fix (repaired). C-ART-Miller-WA-0059 (T. Toledano, June 1863 Mobile) is correctly Unknown, `contested`.

Gates: R-G1 not shown (96.7 percent, 60 rows); R-G2 not shown; R-G3 no hard error in 60 rows, needs 299 rows with zero; R-G4 not assessed (no S_doc derived for 42 units); R-G6 locator and page index present on every row, image agreement checked on 2 pages here and 4 by the builder; R-G7 met; R-G8 met in the sense that every row has a source row, 398 fragments were withheld; **R-G9 not met** (not the PLAN 4.4 draw).

## 7. Not fixed

1. Name accuracy cannot be raised from the text: 2,164 rows still carry `name-garbled` or `ocr-noise-in-name` (3.7 percent), 398 more are withheld. A second OCR or a reading of the page images is needed (GAPS GN04).
2. Entries glued without any recognisable head are still merged (about 1 percent of sampled rows; GN05).
3. Event years with an OCR digit error (`pr. July 1st, '68`) leave the man Unknown; the section label `officers` is kept for NCOs after a lost NON-COMMISSIONED heading in 18 entries; Moore `name_as_printed` is the given-name-first reordering, the printed `Surname, Given` is not stored.
4. Booth men with no theatre evidence cannot be told from men of a Western regiment of the same number (GL05); the Washington Artillery and Maurin rolls for June 1863 are not in Booth (GL06).
5. No `S_doc` and no reconciliation per unit beyond the OOB figures (R-G4), no Present-Probable model (rule 11), `event-4-14-july-1863` and `present-30-june-then-absent` rows (eg C-ART-Richardson-0009, wounded at Williamsport 6 July) are flagged for it.
6. Moore under-annotates Gettysburg (builder's finding stands: 26th NC 518 named against 708 casualties; 4th NC 19).
7. The audit of the 26th NC rows copied from the pilot was not repeated; they are re-parsed here.

## 8. Files changed by the audit

`scripts/moore_pipeline.py`, `build_nc.py`, `booth_parse.py`, `booth_rolls.py`, `booth_classify.py`, `finalize.py`, `gen_docs.py` (all with `audit fix` comments); regenerated `units/*.csv`, `units/_tombstones_*`, `units/*_excluded-unit-unresolved.csv`, `stats.json`, `unit-table.md`, `README.md`, `work/*`; new `AUDIT.md`, `_pre_audit/`, `work/checks_pre.txt`, `work/checks_post.txt`; `../../GAPS.md` rows GN04, GN05, GL05, GL06. `QA-SAMPLE.md`, `progress.md` and the cache are untouched. Re-run: `moore_pipeline.py primary`, `moore_pipeline.py emory`, `build_nc.py`, `booth_parse.py`, `booth_classify.py`, `finalize.py`, `gen_docs.py` (about 40 seconds in all).
