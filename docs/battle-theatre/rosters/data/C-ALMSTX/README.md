# Roster data, family C-ALMSTX (Confederate Alabama, Mississippi, Texas, Arkansas, Florida, Tennessee, Maryland; artillery and cavalry of those states)

Built 30 October 2026 from open sources only (Internet Archive items that are not lending-restricted, public-domain imprints). Nothing here is product data yet. Every row keeps the name as printed, its source, a locator and the rule that set its presence label (PLAN section 2.2). Labels and CSV columns follow `../../pilot/`; two columns were added (`unit_id`, `locator`) and `moore_1882_entry` became the generic `source_entry`.

## Scope against the order of battle (`baseline/dist/data/oob/`)

45 OOB entries: 39 infantry regiments (AL 17 incl. the 5th Alabama Battalion, MS 11, TX 3, AR 1, FL 3, TN 3, MD 1), the Jeff Davis Legion, and 5 batteries (Hurt's Alabama, and four Maryland entries). Artillery and cavalry of other states belong to other families.

| depth of names | units |
|---|---|
| Full rolls (officers and enlisted men, whole service) | 2nd, 5th, 8th Florida; 14th and 15th Alabama; 1st, 4th, 5th Texas; C-1MD-CSA (identity contested); the Maryland batteries Dement, Doll (Baltimore Light) and Brown-C (Chesapeake; Brown-J is the same company) |
| Partial | 12th Alabama (casualty lists, Appomattox paroles), 16th Mississippi (Company E only), 3rd Arkansas (Appomattox survivors only, 141 men) |
| Officers only | the other 16 Alabama units (Brewer), 11 Mississippi units and the Jeff Davis Legion (Rowland), Hurt's battery |
| Field officers only | 1st (Provisional), 7th, 14th Tennessee (Estes; no roll found) |

Every one of the 45 has at least one named man (field officers from Estes for 38 of them), but only the first group has the men needed to draw a regiment. `coverage_by_unit.csv` lists rows per unit and source. No unit was reconciled against its strength (PLAN 2.3): rolls cover whole service (15th Alabama 1,562 rows against 499 present), so named-versus-present is not computed here.

## Totals (`stats.json`)

14,423 rows over 44 unit ids after the 2026-10-30 audit repairs (the builder's figures were 14,257 rows: 702 / 1,817 / 11,738): Present-Documented 701, Absent-Documented 1,771, Unknown 11,951. 12.2 percent of rows (1,766) are flagged unreadable or ambiguous (garbled or missing name, merged row, undated or unreadable date). The audit found and repaired systematic parse and label defects; `AUDIT.md` lists each change, `_pre_audit/` holds the frozen pre-audit CSVs and scripts, and `scripts/run_all.sh` rebuilds everything. Rows are per source: a man in Hurst, Brewer and Estes appears three times; `dup_group` joins repeats inside one source only. 1,242 of the C-1MD-CSA rows are two different Goldsborough rosters (see below). 232 Mississippi Register rows carry `multi-name-entry`: the Register prints a remark after the man it belongs to, so a remark after a list of names is given to the last name only.

## Sources used (identifiers, rights)

See `acquired.json` (URL, sha256, bytes, time per file; 47.8 MB downloaded, far under the 1.5 GB cap) and the rows added to `../../SOURCES.csv`. All are Internet Archive items with `access-restricted-item` unset: Soldiers of Florida 1903 (`soldiersofflorid00flor`), Oates 1905 (`01897724.3053.emory.edu`), Hurst 1863 (`historyoffourtee01hurs`), Goldsborough (`marylandlineinco00gold`), Mississippi Register 1908 (`officialstatisti00missuoft`), Brewer 1872 (`alabamaherhistor00brew`), Polley 1910 (`hoodstexasbrigad00poll`), Park 1906 (`04680903.3233.emory.edu`), Quitman Guards 1866 (`historicalsketch00newo`), Estes 1912 (`listoffieldoffic00este`), OR 27 (file reused from `tmp/library/or27/`). Downloaded but not parsed: Chilton 1911 (Texas Brigade monument book, second source for 4th Texas Co. H) and the Montgomery Greys roster (OCR too poor).

## Parse method

Python 3.11 standard library, `-I -X utf8`, below-normal priority, one process at a time, scripts in `scripts/` (`run.sh` starts them). Florida and Polley use the djvu.xml word boxes (columns found from the page header and line starts; Polley pages are two-column with page-wide company headings). The other books are parsed from the plain text (Oates paragraph entries; Hurst and Goldsborough name lines; Rowland, Brewer and Estes entry lists). `scripts/rlib.py` holds the label rules: casualty or a remark naming Gettysburg (OCR-tolerant) gives Present-Documented; a separation dated before 1 July 1863, or killed at a battle every instance of which precedes it, gives Absent-Documented; enlistment after 3 July 1863 gives Absent-Documented; a Gettysburg remark that also says absent or doubtful, or a separation before it, gives Unknown with `contested`; everything else is Unknown. "Gettysburg campaign" is not "Gettysburg". Hurst's roll was compiled before the battle (its latest event is 3 May 1863), so a man listed there as died, discharged, transferred or killed is Absent-Documented. Nothing is Present-Probable.

## OCR quality and what was checked

* Florida: the OCR layer of the 1903 book drops names (6.1 percent of Florida CSV rows have an empty name; the builder counted 13 of 58 on one page image, so the true loss may be higher, unmeasured); such rows are kept with an empty name and flags `name-missing-ocr;name-garbled`. A second OCR pass or reading from the images would restore them (G02 in `../../GAPS.md`; no OCR engine was installed). Enlistment year is often not printed (ditto marks) so it is not inferred.
* Polley: a 82-row check against the page image (djvu p.357, book p.303) matched every row; a few OCR spellings (Fostlethwaite for Postlethwaite) are kept as printed by the OCR and flagged where noisy. Company E and K lists of the 4th Texas are run-on name lists; rows with several names are flagged `merged-row-suspected`.
* `QA-SAMPLE.md` and `qa_sample.csv`: 30 sampled rows across 9 sources (surname found in the cached source text 30 of 30; this checks only that the surname exists in the book, 28 of the 30 rows are Unknown, and it did not test labels) plus the two page-image checks. The independent audit (60-row stratified sample, seed 41, 49 faithful, 11 defective) is in `AUDIT.md`.

## What is missing and why (details in `GAPS.md` of this family and `../../GAPS.md`)

* No open enlisted-man roll was found for: Mississippi (11 regiments and the Jeff Davis Legion), Alabama 3rd, 4th, 5th, 6th, 8th, 9th, 10th, 11th, 12th (casualties only), 13th, 26th, 44th, 47th, 48th, 5th Battalion, 3rd Arkansas, 1st/7th/14th Tennessee. State databases (Alabama ADAH, Mississippi MDAH, Texas TSLAC) were not queried: no bulk download, terms unread; Tennessee and Florida Memory answered 403 and were left alone.
* Gettysburg presence is documented for only 701 rows. The Florida and Texas rolls annotate casualties; the Alabama, Mississippi and Maryland rolls mostly do not.
* Presence rule 6 (30 June muster rolls) could not be applied anywhere: no open source gives those rolls.
* OR 27 was used only as 22 unread leads; extracting officers present from the reports is not done.
