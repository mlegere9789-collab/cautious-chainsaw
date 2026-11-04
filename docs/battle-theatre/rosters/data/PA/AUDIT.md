# PA roster family: independent audit (30 October 2026)

Auditor: a second agent that did not build the family and did not see the classifier before drawing the sample. Method: PLAN section 4.3 and 4.4. Machine rules kept: below-normal priority, no browser, no builds, short commands. Page images were fetched from the Internet Archive page-image service the builder already used (about 2 to 3 s between requests, hashed in `_audit_acquired.json`, cached in `tmp/library/rosters/PA/audit_img/`). Nothing was fetched from phmc.pa.gov or any lending-restricted item.

Verdict: **the family does not meet gates R-G1 (names), R-G2 (dates) or R-G3 (labels), so R-G9 is not met and nothing in it is publishable as complete.** The structure (units, locators, hashes, conservation, label rules) is sound; the OCR text layer under it is not at gate level. Six systematic defects that produced wrong or missing labels were repaired in the parse outputs; two classes of defect cannot be repaired without a second image-level reading of the names and dates (see "Not fixed").

## 1. What was checked and what was found

### 1.1 Seeded sample of 60 rows (seed 41), every row opened against the page image

Draw: `random.Random(41)` over all 116,298 rows of the frozen pre-audit CSVs; 60 different units (every unit once where possible); 18 Present-Documented, 12 officers, 15 Absent-Documented (enlisted men), 15 Unknown (enlisted men). Per-row record: `AUDIT_sample_seed41.csv` (page index, what the page says, verdict). Each row was read in a crop of the page image (name, rank, muster date, remark), then the label was derived again from the rule sheet (PLAN 2.2) and compared. Company letters sit in headings above the crop and were not re-read (see "Not verified").

| measure | result | gate | met |
|---|---|---|---|
| name exact (R-G1) | 49 of 60 (81.7 percent); one-sided 95 percent upper bound of the error rate 28.5 percent | 99 percent | no |
| muster date and the date that drives the label exact (R-G2) | 39 of 60 (65 percent); 15 muster dates blank (lost in the OCR text layer), 6 wrong or taken from a neighbouring line | 99 percent | no |
| label equals the label read from the page (R-G3) | 52 of 60 (86.7 percent); the 8 disagreements are 4 hard errors and 4 labels weaker than the page supports | 99 percent | no |
| hard errors (a label asserting the opposite) | 4 of 60, upper bound 14.6 percent | zero | no |

Hard errors found (all before the repair): row 6 (82nd PA, Saunders): the next man's "Deserted July 2, 1863" was read into the remark, so a man killed at Cold Harbor in 1864 was labelled Present-Documented (CAS-REMARK-DATE). Row 30 (11th Reserves, Graham): the muster date of the next line (Feb. 1864) replaced "Sept. 21, 1861", so a 1861 volunteer was Absent-Documented (ENL-AFTER). Row 44 (68th PA, Esray): "Mustered out with company, June 9, 1865" read as 1863, Absent-Documented (SEP-BEFORE). Row 24 (83rd PA): Colonel William G. Murray is the first line of the 84th Pennsylvania field and staff, filed under company K of the 83rd.

Name defects (11): 4 blank names (OCR layer lost them: Lusk, Douthitt and two more), 1 name with the rank text glued on, 6 letter errors (Newton read Kowton, Linn read Ijnn, Coxe read Cose, Cyrus read Oyrus, Penfield read Penfteld, Henry read Heury, Emanuel read Einanuel). Date defects: 15 blank muster dates, plus the wrong ones above.

### 1.2 Fresh sample of 20 rows after the first repairs (seed 4141, `AUDIT_sample_seed4141.csv`)

10 Present-Documented, 5 Absent, 5 Unknown, 20 different units, all opened against the page image. Names exact 17 of 20 (Geurge for George, Bobbins for Robbins, a lost middle initial in Wandel); muster dates blank on 5 rows (Aug. 18 '62 and similar); one hard error: 1st Reserves, Pennypacker, remark text of two lines interleaved ("Transferred Corps, 25, on certificate 1862", printed "Transferred to Vet. Reserve Corps, Nov. 25, 1863"), labelled Absent-Documented. That class is now blocked (repair R10); the 20-row sample is too small to prove it gone. All 10 Present-Documented rows in this sample were right on name and label (two had a blank muster date); of the 28 Present-Documented rows in both samples, 1 was wrong (the Saunders row).

### 1.3 Totals, hashes, sources (recounted, no discrepancy in the data)

* Per-unit CSV row counts and label and roll-status counts equal `stats.json` for all 77 files, before and after the repair (0 mismatches). Total 116,298 rows before; 116,231 after (net minus 67 in the requested units: 179 narrative lines were tombstoned in all volumes, see R7, and some rows moved to regiments that have no file).
* A reporting slip, not a data fault: the builder's summary quoted "In OOB units: Present-Documented 2,593, Absent about 44,000, Unknown about 69,000". Those figures include the three extra regiments (46th, 107th, 139th). OOB-only before the repair: 2,479 / 41,897 / 67,119 (111,495 rows), as `README.md` already said. `stats.json` had only the all-units totals; `counts_by_label_oob_units` and `names_in_oob_units` were added. The summary sentence "inscriptions for 45 units" is 52 OOB units (55 incl. the extras) in the CSV.
* Ledger: 446 entries in `acquired.json`; all files exist; sha256 matches for all 446 (the five 80 to 106 MB djvu.xml files included). Hosts: archive.org (27 files) and iiif.archive.org (419). The only blocked request is phmc.pa.gov robots.txt (bot challenge), not circumvented. Python sources contain only archive.org and iiif.archive.org URLs.
* Rights: metadata of all eight Internet Archive items read from the cached JSON: no `access-restricted-item` flag on any (Bates vols 1, 3, 4: NOT_IN_COPYRIGHT; vols 2 and 5: no flag, ACPL scans, 1869-71; Pennsylvania at Gettysburg I and II and the 1867 Cemetery report: NOT_IN_COPYRIGHT). Busey and Martin: not used.
* Inscriptions (`strength_present_inscriptions.csv`): 10 rows spot-checked against the cached text of volume II at the stated line; all lines exist and say what the CSV says; the two 91st values (258 at line 23661, 270 at line 23682) are both real inscription lines (unresolved which belongs to the 91st, carried as Contested, as the builder did).
* The `source_id` plus `source_page_idx_ia` locator is present on every Present-Documented and Absent-Documented row (R-G6 structure; the page images do resolve by the documented URL pattern: 79 of 79 distinct pages fetched; `_audit_acquired.json`).
* Conservation (R-G7): rows of each volume parsed against rows emitted are recorded in `conservation.json` (regenerated); every row removed in the repair has a tombstone in `AUDIT_tombstones.csv`.

## 2. Repairs (frozen pre-audit copy: `_pre_audit/`; derived records frozen in `tmp/library/rosters/PA/derived/_pre_audit/`)

Scripts changed in `scripts/` (originals in `_pre_audit/scripts/`): `classify.py`, `dates.py`, `emit.py`, new `audit_boundary.py`; `conservation.py` reads the repaired records. Run order: `audit_boundary.py`, then `emit.py`, `stats.py`, `conservation.py`, `readme_results.py`. Counts below are rows in all 77 units (before the repair, after).

| id | defect (systematic) | repair | effect |
|---|---|---|---|
| R1 | Year digit of "Mustered out with company" misread (1865 as 1863 or 1861): men of at least 20 regiments were Absent-Documented by a muster-out that the page dates in 1864 or 1865 (hard error; 105 rows are flagged after the repair) | a pre-battle muster-out whose month and day equal the unit's own muster-out (8 or more men, year 1864 or later) is a year conflict: Unknown, `unreadable-or-ambiguous`, flag `mo-year-conflict`. Units whose real muster-out is 1863 (127th, 151st, 153rd) are unaffected | 105 rows: 87 now Unknown, 18 Absent-Documented by their own muster date (ENL-AFTER) |
| R2 | Two neighbouring remarks read as one clause (a full stop after a year, then a capital word, was not a boundary) | boundary added only after a three-digit year token (so "U. S. Army" is not split) | contaminated "Deserted July 2" no longer reads as a casualty |
| R3 | Date cell with two month-day tokens, the first without a year ("Sept. 21, Feb. 10, '64"): the second (next line) was taken | muster date left unread, flag `muster-date-two-dates-in-cell` | 14 rows flagged, one hard error |
| R4 | Verb read from the first word only: "Dishonorably discharged", "Honorably discharged", "Accidentally killed", "Drowned" were not events | adverbs skipped; drowned counts as death | about 115 Unknown rows now Absent-Documented where a date before 1 July 1863 is read |
| R6 | CAS-REMARK-DATE (casualty dated 1 to 3 July 1863, place not read as Gettysburg) fired on any date in the clause, a year-less "Prisoner July 1" of 1862, and any "at <other place>" | the in-window date must be the clause's first date, a place other than a Gettysburg reading excludes it; 77 rows reduced to 63 (14 false Present-Documented removed: Malvern Hill, Hanover, a muster-out misread, a July 1862 capture) | 14 rows Present-Documented to Unknown |
| R7 | Regiment boundaries: where the next regiment's "FIELD AND STAFF OFFICERS" heading shares a page with the end of the previous regiment's history, its field and staff rows were filed under the last company (K, M, L, A) of the previous regiment, and the history lines above the heading were read as roll rows (hard error: unit mis-assigned, PLAN rule 1) | `audit_boundary.py` finds the heading in the word boxes (65 pages), moves 1,453 rows to the next regiment as company FS and drops 179 narrative lines to `AUDIT_tombstones.csv` (`AUDIT_boundary.json` lists every page) | 1,453 rows re-filed, 179 tombstoned, no row lost |
| R8 | Rank text, table rules and the running head glued to names (831 names with "...do", 743 with digits such as "83- VOL") | cut from `name_clean` only; `name_as_printed` unchanged | name column cleaner; letter errors remain |
| R9 | A company whose heading was read as "BAND" (75th PA: 214 rows, 11th Reserves: 98 rows) | runs of 60 or more BAND rows between two company letters are relabelled by sequence (continuation of the previous company, or `C/D?` when two companies are mixed), flagged | 312 rows |
| R10 | A year-only separation accepted from a clause with a stray number and no month word (interleaved lines) | such clauses are Unknown, flag `separation-clause-interleaved` | 147 rows lose the Absent label (garbled month, stray number) |

Net label change after all repairs (OOB units): Present-Documented 2,479 to 2,460; Absent-Documented 41,897 to 41,792; Unknown 67,119 to 67,176; rows 111,495 to 111,428 (some rows re-filed to the next regiment, 179 tombstoned). The pre-audit label file is `_pre_audit/units/`. The label change is deliberately conservative: where a repair could not be verified the label became Unknown, never Absent or Present.

In the 60-row sample all four hard errors are gone after the repair (the sample guided the repairs, so this is not an independent measure): row 6 Unknown, row 30 Unknown, row 44 Unknown, row 24 no longer in the 83rd; the fresh 20-row sample's one hard error is blocked by R10. Row 47 (Wales, "Dishonorably discharged, September 17, 1861") became Absent-Documented through R4.

## 3. Not fixed (needs an image-level second reading; logged as GAPS G-PA13 to G-PA17)

1. **Names**: 18 percent of sampled names carry an OCR letter error or are blank (3 of 20 in the second sample). The word boxes carry per-word OCR confidence, but nothing here can recover a letter without reading the name column again. Next step: Windows.Media.Ocr (or a second engine) on the name column, as the builder did for the date column, then a majority of three readings.
2. **Dates**: 25 percent of muster dates are blank (OCR dropped the year or the date) and 26 percent of all rows are `unreadable-or-ambiguous`; the second OCR covers 373 of 2,039 pages. Single-digit errors in separation dates (5 read as 3, 6 as 0 or G) remain possible on any Absent-Documented row because one OCR reading is all there is; R1 catches only the muster-out case where the unit's own date shows the error.
3. **Interleaved remarks**: remark lines of adjacent men are mixed in the OCR text (rows 57, 58 and the Pennypacker row). R2 and R10 stop the worst effects; the root fix is to assign remark words by line position in `layout.py`. A false Present-Documented from an interleaved Gettysburg remark was not seen in 28 sampled Present-Documented rows but cannot be excluded.
4. **Company letters**: not verified on the page (headings are outside the crops). 172 rows of the 72nd and 169 of the 81st carry `FS?` (heading missing), 113 and 102 of the 18th and 1st Cavalry are `UNASSIGNED`: not repaired.
5. **Unit coverage**: the 127th Pennsylvania conflict (OOB lists it at Gettysburg, Bates prints muster-out 8 and 29 May 1863) stands; 571 of its 833 rows are Absent-Documented by muster-out and the rest Unknown. No owner decision exists; both views stay visible.
6. Not run: the PLAN 4.4 stratified draw (about 40 strata, 628 rows each, lowest OCR-confidence decile included). The 60 + 20 row audit is far below the 299-row minimum; it measures defects and does not certify any stratum.

## 4. Not verified

Company letters and rank_carried (ditto resolution) against the page; the 3 extra units' inclusion beyond the sample; birth or residence (not a column); Soldiers' National Cemetery parse (not used for labels, as the builder said); the second-OCR date file `datecol_second_ocr.json` beyond the corroboration rule.
