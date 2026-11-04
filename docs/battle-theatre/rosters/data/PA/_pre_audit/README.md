# Pennsylvania roster data (family PA)

Built 30 October 2026 by the PA roster agent. Rule for this run (DEC-019 and the owner's chat): no permission requests; names come from open sources the agent obtains itself. Nothing here is product data until the Section Z gates pass.

## What is here

| file or folder | what |
|---|---|
| `units/<unit_id>.csv` | one file per unit (77 files: 74 OOB units with their own roll + 3 extra Pennsylvania regiments that the sources document at Gettysburg and the repository OOB lacks, ids `X-46PA`, `X-107PA`, `X-139PA`). One row per roll entry as printed. |
| `stats.json` | family statistics and per-unit counts (names, labels, roll status, flags) |
| `reconciliation.csv` | per unit: documented strength present (monument inscription) against the repository OOB strength, N Present-Documented, N on roll undetermined, N unreadable, N absent, PLAN section 2.3 status |
| `strength_present_inscriptions.csv` | "Present at Gettysburg N officers and M men" from the 1914 monument inscriptions (verbatim lines, line locator in the cached text, heading mapping noted) |
| `datecol_second_ocr.json` | second reading of the muster-date column (see "Second OCR") |
| `acquired.json` | every file downloaded or hashed: URL, local path, bytes, sha256, time; blocked requests |
| `progress.md`, `qa/` | step log; structural QA table and a seeded 30-row sample per unit (`qa/<unit>_sample30.csv`), `qa/QA.md` the visual QA record |
| `scripts/` | the pipeline (Python 3.11 standard library only; the second OCR calls Windows' own OCR component from `winocr.ps1`); `scripts/README.md` gives the run order |
| `units.json`, `ia_meta.json`, `ia_candidates.json` | the OOB Pennsylvania units found; Internet Archive metadata read |

## Sources used (all public domain, all Internet Archive items verified `access-restricted-item` absent)

| id | source | identifier | rights | use |
|---|---|---|---|---|
| BATES-1869-v01..v05 | Bates, *History of Pennsylvania Volunteers 1861-5*, 5 vols (1869-71) | `historyofpennsyl01bate`, `02bate`, `03bate`, `04bate`, `00bate` (vol 5) | possible-copyright-status NOT_IN_COPYRIGHT on vols 1, 3, 4; absent on vols 2 and 5 (ACPL scans), published 1869-71: public domain in the US by date | the rolls: field and staff, company officers and men with date of muster and final status |
| PA-AT-GETTYSBURG-1914-v2 | *Pennsylvania at Gettysburg*, vol II (1914) | `pennsgettysburg02reynrich` (local copy in `tmp/library/misc`, hashed) | NOT_IN_COPYRIGHT | monument inscriptions with strength present |
| PA-AT-GETTYSBURG-1914-v1 | same, vol I | local copies (hashed) | PD | narrative; 18 strength sentences copied as leads to `strength_sentences_vol1.csv` (not used for labels) |
| SNC-1867 | Revised report on the Soldiers' National Cemetery (1867) | `revisedreportma00cemegoog` | NOT_IN_COPYRIGHT | fetched; Pennsylvania burial tables located but NOT used for labels (column parse incomplete, see GAPS) |
| IIIF crops | IA image service, same scanned pages | `iiif.archive.org/iiif/<id>$<leaf>/...` | PD book | second reading of the date column |

Not used: Pennsylvania State Archives Civil War Veterans' Card File (phmc.pa.gov answered the robots.txt request with a bot challenge: recorded as BLOCKED, not circumvented); FamilySearch, Fold3, Ancestry, Find a Grave (terms forbid automated access); Official Army Register (officers only, would add rank dates, not presence). Busey and Martin is lending-restricted and untouched.

## Parse method

1. `pages.py`: IA `djvu.xml` (ABBYY) to word boxes per page (5 volumes, about 5,800 pages).
2. `layout.py`: the Bates roll is a four-column table (name, rank, date of muster into service, remarks) with a term-of-service digit. Columns are found per page from the x of the month words (date column), the left margin (names) and the first word after each year token (remarks). Rows are anchored on the name-start words (or a month word when a name is missing) and every other word is attached to the last anchor above it, so multi-line remarks stay with their man. Narrative pages are dropped by two tests (share of rows with a month, share of rows whose remark starts with a service verb); the Burial Record pages at the end of each volume (name, rank, date of death, place, grave) are recognised by their running head and dropped (GAPS G-PA12).
3. `assemble.py`: regiment number per page from the running head ("ONE HUNDRED AND FORTIETH REGIMENT"), outliers removed by a longest-non-decreasing-subsequence filter inside the volume's number range; company from the centred "Company X" headings (letter sequence enforced, missed headings inferred from the "Recruited at ..." line); new regiment from "Field and staff" or company A restarting.
4. `classify.py` applies PLAN 2.2 in order (rule codes in `basis_code`): CAS-REMARK (a wound, death, capture or burial named with Gettysburg in the same remark clause, OCR-tolerant, Petersburg excluded), CAS-REMARK-DATE (capture or casualty dated 1 to 3 July 1863 without the place), BURIAL (buried in the Soldiers' National Cemetery, Gettysburg), DIED-AT-GETTYSBURG (flagged: place, no wound stated), SEP-BEFORE (discharge, death, desertion, transfer out, resignation, dismissal, or muster-out of the regiment, dated before 1 July 1863; a transfer to another company of the same regiment is not a separation), ENL-AFTER (muster date after 3 July 1863), CONFLICT (Gettysburg casualty and a separation before it in one remark: Unknown, flag contested), ONROLL-NO-STATUS, OCR-DATE-LOST. Bates records only the final status of each man, never a June 1863 muster, so **no row is Present-Probable** and a roll-only man is Unknown.
5. `emit.py` writes the CSVs; ranks printed as "do" are carried from the row above; duplicate-name groups are marked (`dup_group`), never merged.

## Columns

`unit_id, regiment, company, section, name_as_printed, name_clean, rank_as_printed, rank_carried, officer, muster_date (ISO, empty if not read), remarks_as_printed, presence_label, roll_status, basis_code, presence_basis, events (verb:date;...), dup_group, source_id (BATES-1869-vNN), source_page_idx_ia (1-based djvu page index; image URL: https://archive.org/download/<identifier>/page/n<idx-1>_w1200.jpg), parse_flags`. A superset of the pilot columns. Labels are exactly Present-Documented, Absent-Documented, Unknown; `roll_status` is named-present, off-roll-before-battle, not-yet-enlisted, on-roll-undetermined, unreadable-or-ambiguous.

## Results (Measured; numbers in `stats.json`)

See the end of this file (generated numbers) and `reconciliation.csv`. 74 of the 77 OOB Pennsylvania units have a roll of their own; the other three OOB entries (`U-11PA-B`, `U-11PA-R-F`, `U-18PA-CAV-b`) are detachments, subsets of a parent roll and Bates does not say who was detached: they have no file of their own and are listed under their parent.

## OCR quality and what is wrong

* The `djvu.xml` and the plain text are one ABBYY reading. It loses text in these ways: the **muster year** (the "'61" after the day) is missing on a large share of pages and the term digit with it; whole dates; some names; remark words ("Gettysburg" misread as "Geitysuurg", "Get- tysburg" split across lines). Those rows keep their status in `parse_flags` and, where a date is lost, `roll_status` = `unreadable-or-ambiguous`.
* Where a row's month and day are read but the year is not, the year is inferred only if at least 5 rows of the same regiment read that month and day with a year and at least 90 percent agree (flag `muster-year-inferred`, Modelled; it can only move a row to on-roll-undetermined, never to Absent).
* Page-image check by the agent (`qa/QA.md`): see there for counts.

## Second OCR (date column)

Windows 10/11 ships an offline OCR component (Windows.Media.Ocr). It is a local operating-system function: no account, key, install or licence step. `datecol_fetch.py` fetches a narrow crop (the date column) of each roll page that has rows without a readable muster date from the IA IIIF image service (2 to 3 s politeness delay, cached, hashed in `acquired.json`); `winocr.ps1` reads them at below-normal priority; `datecol_apply.py` joins the OCR fragments of a table line and matches them to rows by vertical position; `classify.py` uses the result only (a) where the first OCR had no muster date, or (b) to add the day where the first OCR read month and year only. Flag `muster-date-second-ocr`.

Measured (qa/QA.md): where both readings exist they disagree on 6.4 percent of dates, so a second-OCR-only date is not trusted for an Absent label unless at least 3 other rows of the unit read the same muster date in the first OCR (flag `second-ocr-date-uncorroborated` otherwise). The IIIF service answers in 5 to 10 s per crop; the run was ordered by unit (units with most Gettysburg casualties first) and covers 373 of 2,039 pages that need it (`datecol_second_ocr.json`). The rest is pending and the same commands resume it (`datecol_fetch.py` skips pages already fetched). Pages not reached keep the first-OCR status.

## Contested and conflicting items (carried, never resolved silently)

* Strength: monument inscriptions against the repository OOB (second-hand Busey and Martin) differ by more than 3 percent for most units (see `reconciliation.csv`); both are shown. 91st: two inscriptions (258 and 270). 143rd: heading number lost in OCR, read from brigade and the 465 figure: confirm on the image.
* 127th Pennsylvania: the repository OOB lists it at Gettysburg (165); Bates prints muster-out on 8 and 29 May 1863 for the regiment; 502 rows are Absent-Documented by muster-out date (GAPS G-PA11).
* A Gettysburg casualty remark that also carries a separation dated before the battle is Unknown with `contested` (10 rows at the last run).
* The repository OOB lacks three Pennsylvania regiments documented at Gettysburg (46th, 107th, 139th) and Thompson's Independent Battery C (inscription found, roll not extracted); rows for the first three are provided as `X-*` units, flagged `not in repository OOB`.

Generated numbers follow.

<!-- RESULTS-BEGIN -->
## Generated results (stats.json, 2026-10-30)

* OOB Pennsylvania units: 77; with a roll of names: 74 (all); 3 further detachment entries covered through their parent roll; extra units not in the OOB: X-46PA, X-107PA, X-139PA.
* Names (roll rows as printed, whole-war roll of each regiment, duplicates not merged): 111495 in OOB units, 4803 more in the three extra regiments.
* Labels in OOB units: Present-Documented 2479 (2.2%), Absent-Documented 41897 (37.6%), Unknown 67119 (60.2%).
* Roll status: named-present 2479 (2.2%), not-yet-enlisted 20711 (18.6%), off-roll-before-battle 21186 (19.0%), on-roll-undetermined 38059 (34.1%), unreadable-or-ambiguous 29060 (26.1%).
* Rows unreadable or ambiguous (a date lost in the OCR text layer): 29060 = 26.1% of OOB rows.
* Second OCR of the date column applied on 373 roll pages (resumable; see above).
* Documented strength present (1914 monument inscription) found for 52 of 77 OOB units; for the other units no "Present at Gettysburg" inscription was found in the cached OCR text of vol II (not determined whether the inscription is absent from that volume or lost in the OCR; see GAPS G-PA6 and G-PA7).

| unit | rows | Present-Documented | Absent-Documented | Unknown | unreadable | S_doc (inscription) | OOB strength | status |
|---|---|---|---|---|---|---|---|---|
| U-11PA | 2085 | 73 | 1116 | 896 | 268 | 292 | 135 | Short; inscription vs repository OOB differ by 116% |
| U-23PA | 1506 | 0 | 493 | 1013 | 393 | - | 310 | No S_doc found |
| U-26PA | 1553 | 110 | 651 | 792 | 162 | 365 | 386 | Short; inscription vs repository OOB differ by -5% |
| U-27PA | 1378 | 28 | 536 | 814 | 368 | 324 | 284 | Short; inscription vs repository OOB differ by 14% |
| U-28PA | 2732 | 12 | 1428 | 1292 | 660 | 303 | 303 | Short |
| U-29PA | 2087 | 29 | 927 | 1131 | 517 | - | 357 | No S_doc found |
| U-1PA-R | 1154 | 14 | 413 | 727 | 244 | 444 | 337 | Short; inscription vs repository OOB differ by 32% |
| U-2PA-R | 871 | 34 | 345 | 492 | 192 | 273 | 232 | Short; inscription vs repository OOB differ by 18% |
| U-5PA-R | 1068 | 1 | 467 | 600 | 121 | 334 | 266 | Short; inscription vs repository OOB differ by 26% |
| U-6PA-R | 1078 | 5 | 443 | 630 | 184 | 380 | 254 | Short; inscription vs repository OOB differ by 50% |
| U-9PA-R | 1113 | 0 | 482 | 631 | 187 | 377 | 280 | Short; inscription vs repository OOB differ by 35% |
| U-10PA-R | 1122 | 2 | 433 | 687 | 236 | 420 | 401 | Short; inscription vs repository OOB differ by 5% |
| U-11PA-R | 1184 | 9 | 516 | 659 | 241 | 392 | 327 | Short; inscription vs repository OOB differ by 20% |
| U-12PA-R | 1103 | 2 | 432 | 669 | 254 | 320 | 340 | Short; inscription vs repository OOB differ by -6% |
| U-13PA-R | 1202 | 20 | 409 | 773 | 313 | 349 | 298 | Short; inscription vs repository OOB differ by 17% |
| U-1PA-CAV | 1643 | 2 | 535 | 1106 | 420 | 418 | 329 | Short; inscription vs repository OOB differ by 27% |
| U-49PA | 1511 | 0 | 608 | 903 | 392 | - | 325 | No S_doc found |
| U-53PA | 2284 | 8 | 851 | 1425 | 903 | - | 135 | No S_doc found |
| U-56PA | 1220 | 14 | 522 | 684 | 593 | 252 | 252 | Short |
| U-57PA | 1717 | 21 | 619 | 1077 | 678 | 207 | 207 | Short |
| U-62PA | 1516 | 44 | 440 | 1032 | 509 | 426 | 426 | Short |
| U-63PA | 2592 | 9 | 826 | 1757 | 1231 | 296 | 246 | Short; inscription vs repository OOB differ by 20% |
| U-68PA | 1036 | 71 | 319 | 646 | 244 | 383 | 317 | Short; inscription vs repository OOB differ by 21% |
| U-69PA | 1689 | 114 | 747 | 828 | 337 | - | 284 | No S_doc found |
| U-71PA | 2162 | 58 | 915 | 1189 | 477 | - | 261 | No S_doc found |
| U-72PA | 1337 | 45 | 459 | 833 | 381 | 458 | 380 | Short; inscription vs repository OOB differ by 21% |
| U-73PA | 1065 | 9 | 339 | 717 | 325 | 332 | 263 | Short; inscription vs repository OOB differ by 26% |
| U-74PA | 942 | 1 | 593 | 348 | 262 | 381 | 318 | Short; inscription vs repository OOB differ by 20% |
| U-75PA | 1353 | 70 | 494 | 789 | 337 | 258 | 208 | Short; inscription vs repository OOB differ by 24% |
| U-81PA | 1471 | 12 | 508 | 951 | 411 | 175 | 175 | Short |
| U-82PA | 2183 | 1 | 748 | 1434 | 774 | - | 327 | No S_doc found |
| U-83PA | 2328 | 44 | 1126 | 1158 | 696 | 308 | 295 | Short; inscription vs repository OOB differ by 4% |
| U-3PA-CAV | 2344 | 10 | 819 | 1515 | 773 | - | 422 | No S_doc found |
| U-6PA-CAV | 1940 | 3 | 648 | 1289 | 639 | 365 | 299 | Short; inscription vs repository OOB differ by 22% |
| U-88PA | 2057 | 16 | 848 | 1193 | 673 | 296 | 274 | Short; inscription vs repository OOB differ by 8% |
| U-90PA | 1588 | 9 | 645 | 934 | 287 | - | 209 | No S_doc found |
| U-91PA | 2193 | 18 | 1108 | 1067 | 532 | 258|270 | 224 | Short (two inscription values 258/270: Contested between them); inscription vs repository OOB differ by 21% |
| U-93PA | 2003 | 7 | 1211 | 785 | 269 | - | 410 | No S_doc found |
| U-95PA | 2332 | 1 | 917 | 1414 | 519 | 356 | 307 | Short; inscription vs repository OOB differ by 16% |
| U-96PA | 1196 | 0 | 527 | 669 | 209 | - | 332 | No S_doc found |
| U-98PA | 1973 | 11 | 820 | 1142 | 608 | - | 408 | No S_doc found |
| U-99PA | 2164 | 65 | 755 | 1344 | 399 | 339 | 277 | Short; inscription vs repository OOB differ by 22% |
| U-102PA | 2092 | 0 | 1046 | 1046 | 426 | - | 316 | No S_doc found |
| U-105PA | 1990 | 36 | 1084 | 870 | 426 | 274 | 274 | Short |
| U-106PA | 1042 | 13 | 366 | 663 | 216 | 335 | 280 | Short; inscription vs repository OOB differ by 20% |
| U-109PA | 1059 | 1 | 144 | 914 | 286 | 149 | 149 | Short |
| U-110PA | 1538 | 16 | 333 | 1189 | 455 | 152 | 152 | Short |
| U-111PA | 1930 | 21 | 935 | 974 | 401 | - | 209 | No S_doc found |
| U-114PA | 1119 | 48 | 282 | 789 | 317 | - | 259 | No S_doc found |
| U-115PA | 788 | 9 | 79 | 700 | 201 | 182 | 209 | Short; inscription vs repository OOB differ by -13% |
| U-116PA | 1703 | 28 | 644 | 1031 | 224 | 142 | 66 | Short; inscription vs repository OOB differ by 115% |
| U-118PA | 1330 | 9 | 350 | 971 | 313 | 332 | 232 | Short; inscription vs repository OOB differ by 43% |
| U-8PA-CAV | 1923 | 0 | 551 | 1372 | 583 | - | 300 | No S_doc found |
| U-119PA | 1227 | 0 | 311 | 916 | 444 | - | 381 | No S_doc found |
| U-121PA | 902 | 40 | 268 | 594 | 153 | 306 | 263 | Short; inscription vs repository OOB differ by 16% |
| U-127PA | 833 | 0 | 571 | 262 | 141 | - | 165 | No S_doc found |
| U-140PA | 1143 | 146 | 213 | 784 | 224 | 589 | 515 | Short; inscription vs repository OOB differ by 14% |
| U-141PA | 1067 | 93 | 256 | 718 | 296 | 209 | 209 | Short |
| U-142PA | 960 | 79 | 217 | 664 | 217 | 336 | 336 | Short |
| U-143PA | 1534 | 52 | 485 | 997 | 495 | 465 | 465 | Short |
| U-145PA | 1538 | 35 | 576 | 927 | 492 | 228 | 203 | Short; inscription vs repository OOB differ by 12% |
| U-147PA | 1161 | 8 | 373 | 780 | 484 | 298 | 298 | Short |
| U-148PA | 1391 | 48 | 434 | 909 | 385 | 468 | 392 | Short; inscription vs repository OOB differ by 19% |
| U-149PA | 1554 | 188 | 585 | 781 | 366 | 450 | 400 | Short; inscription vs repository OOB differ by 12% |
| U-150PA | 1042 | 78 | 193 | 771 | 308 | 397 | 400 | Short |
| U-151PA | 962 | 277 | 81 | 604 | 163 | 467 | 467 | Short |
| U-153PA | 943 | 219 | 58 | 666 | 57 | 569 | 569 | Short |
| U-155PA | 1584 | 10 | 588 | 986 | 453 | - | 362 | No S_doc found |
| U-16PA-CAV | 2924 | 2 | 918 | 2004 | 854 | - | 353 | No S_doc found |
| U-17PA-CAV | 2000 | 0 | 664 | 1336 | 539 | - | 464 | No S_doc found |
| U-18PA-CAV | 2141 | 4 | 835 | 1302 | 630 | - | 490 | No S_doc found |
| U-ART-B1PA | 331 | 8 | 170 | 153 | 51 | 114 | 80 | Short; inscription vs repository OOB differ by 42% |
| U-ART-F1PA | 266 | 6 | 103 | 157 | 74 | 144 | 117 | Short; inscription vs repository OOB differ by 23% |
| U-ART-EPA | 403 | 3 | 146 | 254 | 168 | 139 | 107 | Short; inscription vs repository OOB differ by 30% |
| X-46PA | 1810 | 2 | 935 | 873 | 571 | 262 | - | Short |
| X-107PA | 1849 | 91 | 1093 | 665 | 301 | 255 | - | Short |
| X-139PA | 1144 | 21 | 215 | 908 | 364 | 511 | - | Short |
<!-- RESULTS-END -->
