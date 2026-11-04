# Roster data, family MW (Michigan, Wisconsin, Indiana, Illinois, Minnesota)

Built 30 October 2026 under DEC-019 (the owner: the roster information is public and Claude must obtain it itself; no permission requests). Only open sources were used: Internet Archive items whose metadata shows no access restriction, read-only, one request per file about 2 to 3 seconds apart, user agent `gettysburg-map-research/1.0`, cached under `tmp/library/rosters/MW/` with sha256 in `acquired.json` (40 files, 355 MB downloaded in this run, the budget is 1.5 GB). No login, account, licence acceptance, API key or bot-check circumvention. No browser was used and every Python process ran at below-normal priority, one at a time.

## Result

26 of 26 OOB units of the family (26: Michigan 7 infantry + 4 cavalry, Wisconsin 6, Indiana 4 + 1 cavalry, Illinois 1 + 2 cavalry, Minnesota 1) have named rows. **16 units have the full printed roll; 10 Michigan units have only the names printed in the 1913 survivors list** (a gap, see below). 27,098 rows, 26,094 with a name (1,004 rows are real roll lines whose name the OCR text layer lost: kept with an empty name, never invented). Labels over all rows: Unknown 15,281, Absent-Documented 9,550, Present-Documented 1,507, Duplicate-Xref 760. 26.4 percent of all rows are Unknown because a date or remark is unreadable in the OCR layer.

| unit | file | rows | name not in OCR | Present-Doc | Absent-Doc | Unknown | Xref | of Unknown: unreadable | OOB strength | monument 1889 effective strength | coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| U-12IL-CAV | 12th-illinois-cavalry.csv | 2653 | 46 | 8 | 1109 | 1343 | 193 | 695 | 378 |  | full roll |
| U-14IN | 14th-indiana-infantry.csv | 1142 | 109 | 14 | 537 | 591 | 0 | 162 | 311 |  | full roll |
| U-16MI | 16th-michigan-infantry.csv | 15 | 0 | 15 | 0 | 0 | 0 | 0 | 263 | 365 | PARTIAL: 1913 survivors list only |
| U-19IN | 19th-indiana-infantry.csv | 1328 | 153 | 58 | 309 | 961 | 0 | 311 | 308 |  | full roll |
| U-1MI | 1st-michigan-infantry.csv | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 145 | 261 | PARTIAL: 1913 survivors list only |
| U-1MI-CAV | 1st-michigan-cavalry.csv | 16 | 0 | 16 | 0 | 0 | 0 | 0 | 427 |  | PARTIAL: 1913 survivors list only |
| U-1MN | 1st-minnesota-infantry.csv | 1322 | 55 | 241 | 404 | 677 | 0 | 208 | 262 |  | full roll |
| U-20IN | 20th-indiana-infantry.csv | 1370 | 171 | 41 | 149 | 1180 | 0 | 354 | 401 |  | full roll |
| U-24MI | 24th-michigan-infantry.csv | 24 | 0 | 24 | 0 | 0 | 0 | 0 | 496 | 496 | PARTIAL: 1913 survivors list only |
| U-26WI | 26th-wisconsin-infantry.csv | 1139 | 0 | 225 | 274 | 639 | 1 | 435 | 443 |  | full roll |
| U-27IN | 27th-indiana-infantry.csv | 1036 | 121 | 9 | 82 | 945 | 0 | 207 | 339 |  | full roll |
| U-2WI | 2nd-wisconsin-infantry.csv | 1433 | 0 | 226 | 473 | 730 | 4 | 460 | 302 |  | full roll |
| U-3IN-CAV | 3rd-indiana-cavalry.csv | 1389 | 182 | 0 | 131 | 1258 | 0 | 275 | 377 |  | full roll |
| U-3MI | 3rd-michigan-infantry.csv | 1758 | 0 | 56 | 1079 | 516 | 107 | 379 | 238 | 286 | full roll |
| U-3WI | 3rd-wisconsin-infantry.csv | 2918 | 0 | 10 | 1099 | 1802 | 7 | 1349 | 246 |  | full roll |
| U-4MI | 4th-michigan-infantry.csv | 50 | 0 | 50 | 0 | 0 | 0 | 0 | 342 | 403 | PARTIAL: 1913 survivors list only |
| U-5MI | 5th-michigan-infantry.csv | 83 | 0 | 83 | 0 | 0 | 0 | 0 | 261 | 283 | PARTIAL: 1913 survivors list only |
| U-5MI-CAV | 5th-michigan-cavalry.csv | 28 | 0 | 28 | 0 | 0 | 0 | 0 | 654 |  | PARTIAL: 1913 survivors list only |
| U-5WI | 5th-wisconsin-infantry.csv | 1510 | 0 | 10 | 587 | 901 | 12 | 343 | 309 |  | full roll |
| U-6MI-CAV | 6th-michigan-cavalry.csv | 14 | 0 | 14 | 0 | 0 | 0 | 0 | 477 |  | PARTIAL: 1913 survivors list only |
| U-6WI | 6th-wisconsin-infantry.csv | 2098 | 0 | 177 | 982 | 929 | 10 | 559 | 344 |  | full roll |
| U-7MI | 7th-michigan-infantry.csv | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 165 | 165 | PARTIAL: 1913 survivors list only |
| U-7MI-CAV | 7th-michigan-cavalry.csv | 16 | 0 | 16 | 0 | 0 | 0 | 0 | 369 |  | PARTIAL: 1913 survivors list only |
| U-7WI | 7th-wisconsin-infantry.csv | 1710 | 0 | 154 | 621 | 933 | 2 | 539 | 364 |  | full roll |
| U-82IL | 82nd-illinois-infantry.csv | 1047 | 77 | 14 | 318 | 715 | 0 | 236 | 267 |  | full roll |
| U-8IL-CAV | 8th-illinois-cavalry.csv | 2985 | 90 | 4 | 1396 | 1161 | 424 | 649 | 466 |  | full roll |

`stats.json` has the same numbers per unit and the share by label. "OOB strength" is the repository figure (second-hand from Busey and Martin, not verified here). The monument figures are Documented from the inscriptions printed in *Michigan at Gettysburg* (1889), IA `cu31924030924736`, and were not reconciled against names.

## Files and columns

One CSV per unit, the 6th Wisconsin copied unchanged from `../../pilot/`. Columns: regiment, unit_id (OOB regiment_id), company (FS field and staff, NCS non-commissioned staff, UNASSIGNED, REC recruits, `X-reorg` for the reorganised 3rd Michigan), section/rank as printed, name_as_printed (never corrected), name_clean (Surname, Given; only punctuation and order normalised), residence, age_as_printed (Minnesota), enlist_or_rank_date (ISO, only when the printed year was legible), muster_date_as_printed (Illinois), mustered_out_as_printed (Minnesota), remarks_as_printed, presence_label, presence_basis (rule code and reason in words, PLAN 2.2), dup_group, source_id, source_page_idx_ia (IA djvu page index, page image N-1: `https://archive.org/download/ID/page/nN_w1500.jpg`), parse_flags, roll_status, other_sources.

Labels follow PLAN 2.2 exactly. A roll name alone is never Present: `on-roll-undetermined` rows stay Unknown. Present-Documented comes from a casualty or Gettysburg remark (CAS-REMARK, GETTYSBURG-REMARK), an event dated 1 to 3 July (EVENT-DATED-IN-BATTLE), or the 1913 survivors list (PART-LIST). Absent-Documented comes from a separation dated before 1 July 1863 (SEP-BEFORE) or a muster/enlistment date after 3 July 1863 (ENL-AFTER). Where the survivors list names a man the roll shows separated before the battle the row is Unknown with roll_status `contested` and both sources shown (rule 10). Officer rank dates are never used as enlistment dates. Veteran re-enlistment sections (Illinois, Indiana) are Duplicate-Xref rows (the man is counted through his original row); the label says so.

## Sources used (IA identifiers; all PD-US, `possible-copyright-status` NOT_IN_COPYRIGHT or none, `access-restricted-item` absent)

* Wisconsin: Roster of Wisconsin Volunteers 1886 (vol 1 `rosterofwisconsi01wisc`: 2nd, 3rd, 5th, 7th; vol 2 `rosterofwisconsi02wisc`: 26th; djvu.xml word boxes, pilot parser generalised in `pipeline/mw/wis_gen.py`). Page ranges: 2nd 363-396, 3rd 403-454, 5th 455-487, 7th 556-594, 26th (vol 2) 323-350. Not included: the Independent Battalion of the 2nd Infantry (djvu 397-402) and the reorganised 5th (from 488), which are different organisations formed after Gettysburg.
* Indiana: Report of the Adjutant General of the State of Indiana, vol 4 `reportindiana04dougrich` (14th, 19th, 20th, 27th: enlisted men) and vol 5 `reportindiana05dougrich` (3rd Cavalry = 45th Regiment). Enlisted men and non-commissioned staff only (see gaps).
* Illinois: Report of the Adjutant General of the State of Illinois, revised edition 1900, vol 5 `reportofadjutantv5illi` (82nd, djvu 106-126) and vol 8 `reportofadjutantv8illi` (8th Cavalry 111-162, 12th Cavalry 339-386; the 12th Consolidated is excluded).
* Minnesota: Minnesota in the Civil and Indian Wars vol 1 (1890) `minnesotacivil01minnrich` (First Regiment roster, djvu 69-86; the First Battalion is excluded). The item `minnesotaincivil0001unse` is access-restricted and was not touched.
* Michigan: Record of Service of Michigan Volunteers vol 3 `recordofserviceo03mich` (3rd Infantry, original and reorganised, djvu 35-449). Presence evidence for every Michigan unit and for Illinois and Indiana men living in Michigan: A. H. Boies, Roster of the Survivors of the Battle of Gettysburg living in the State of Michigan, 1913 (`rosterofsurvivor00boie`; 458 printed lines parsed, 275 in the family's units). Strengths: Michigan at Gettysburg 1889.

## Parse method

Word boxes from `djvu.xml` (Wisconsin, Indiana, Illinois, Minnesota; `pipeline/djvu_pages.py`), grouped into lines, columns found relative to a per-page fitted left margin (tilt corrected), continuation lines attached to the row above, headings give company and rank. Michigan: prose entries split at "Surname, Given. Enlisted in company ..." heads (`mi_ros.py`, `mi_rows.py`). Dates are read with an OCR-tolerant parser that refuses to guess a year (`cls_gen.py`); classification and CSV in `build_unit.py`. Dedupe groups same-name rows inside a unit only; cross-unit transfers (for example 14th Indiana veterans to the 20th) are not merged. Run order: `fetch_round1-4.py`, `djvu_pages.py`, `wis_gen.py`/`tab_gen.py`/`mi_ros.py`, `build_all.sh`, `boies_parse.py`, `boies_merge.py`, `final_stats.py`.

## OCR quality and QA

The text layer is ABBYY from the Internet Archive (no second OCR engine exists on this machine; installing one needs an owner decision, G02). QA: a 30-plus-row check against page images, see `QA-SAMPLE.md`. It is not an independent sample (PLAN 4.4) and the R-G1 to R-G3 gates are NOT shown to pass.

## What is missing and why

See the MW section of `../../GAPS.md` (GMW01 to GMW10). Short list: nine Michigan units (1st, 4th, 5th, 7th, 16th, 24th Infantry; 1st, 5th, 6th, 7th Cavalry) have no open full roll (only volumes 3, 8, 17 and 22 of the Record of Service are on the Internet Archive; HathiTrust robots.txt disallows the page routes and the Archives of Michigan terms forbid automated access; the 7th Cavalry book by Lee 1902 answered HTTP 500/503/504 on three attempts); Indiana officers are printed rotated in vol 2 and the OCR text is unreadable; about 1,000 rows lost their name in the OCR layer; Wisconsin, Indiana and Illinois rolls rarely annotate Gettysburg, so Present-Documented is far below the documented casualties.
