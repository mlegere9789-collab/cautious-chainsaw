# OJC roster family: independent audit (30 October 2026)

Auditor: a second agent that did not build the family. Governing text: CLAUDE.md, `rosters/PLAN.md` sections 2.2 and 4.3 to 4.4. Machine rules kept: below-normal priority for the pipeline scripts, no browser, no build, short foreground commands, standard library plus Pillow for cropping page images. Nothing was published or deployed.

## 1. Verdict

The builder's report is **not accepted as it stood**. The headline counts were arithmetically right (every total recounts, every hash matches, no restricted or blocked source), but the parse outputs had systematic defects that gave wrong labels, wrong units, wrong ranks and wrong company letters, and the name transcription misses gate R-G1 by a wide margin. The defects that could be repaired from the cached text layer were repaired (sections 5 and 6); the family now stands at **55,062 rows: 1,097 Present-Documented, 21,050 Absent-Documented, 32,915 Unknown** (15,177 of them `unreadable-or-ambiguous`). Gates R-G1, R-G2, R-G3, R-G8 and R-G9 are **not met** and the family must not be published as complete (section 3). What could not be fixed is in section 8.

| | builder | after audit |
|---|---:|---:|
| rows (names) | 55,525 | 55,062 |
| Present-Documented | 1,059 | 1,097 |
| Absent-Documented | 20,560 | 21,050 |
| Unknown | 33,906 | 32,915 |
| of which `unreadable-or-ambiguous` | 15,575 (28.1 %) | 15,177 (27.6 %) |
| rows with a name flag | 8,830 | 8,684 |
| rows with no name in the text layer | 3,011 | 3,207 |

## 2. What was checked

1. **Totals.** Every row of the 39 unit CSVs was counted and compared with `stats.json`: rows, label split, roll-status split, per-unit rows, per-unit labels, unreadable rows, name-flag rows. All matched the builder's numbers before the repair (55,525 = sum of unit rows; 1,059 + 20,560 + 33,906 = 55,525) and match the regenerated `stats.json` after it.
2. **Hashes.** All 49 builder entries of `acquired.json` were re-hashed against `tmp/library/rosters/OJC/` (sha256 and byte size): 49 of 49 match, none missing. The 61 page images the audit fetched were added to the same ledger (110 entries, 110 match); `AUDIT-images.json` holds the same entries. The cached files not in the ledger are derived files (`*.pages.json`, `*_rows.json`, `*_stats.json`, the frozen `*.pre_audit.json`).
3. **Rights and blocks.** `acquired.json` has `blocked: []`; all 49 original URLs are on `archive.org`; no 401, 403, 429 or 451 is recorded. The audit re-read the Internet Archive flags of every item: Ohio vols 3, 5, 6, 7, 10, 11, Stryker vols 1 and 2 and the Connecticut Catalogue carry `possible-copyright-status: NOT_IN_COPYRIGHT` and no `access-restricted-item`; none is in a lending collection (`inlibrary`, `lendinglibrary`, `printdisabled`); every file downloaded without login, which a borrow-only item does not allow. `bwb_W9-BTC-637` (Ohio vol 2, collection `internetarchivebooks`) has no copyright flag and no restriction flag; it is an 1886 US printing. The OR 27/1 text (`cu31924077699761`, Cornell, collection `pub_official-records-of-union-and-confederate-armies`) is a US government publication. **No lending-restricted or bot-blocked source was used.**
4. **Independent sample, seed 41, 60 rows.** From the frozen CSVs (`_pre_audit/`) with `random.Random(41)`: one row from each of the 39 units, then 8 officer or staff rows (sections `staff` or `field-staff`) and 13 Present-Documented rows spread over different units. Each row was opened on the IA page image (`archive.org/download/ID/page/n{leaf-1}_w1500.jpg`, each fetched once, 2 s gap, identified user agent, below-normal priority, 57 images for the 60 rows) and checked for name, rank, company, unit, the date or remark that drives the label, and the label against PLAN 2.2. The text layer was not the reference; the page image was. One row (no. 1, 107th Ohio leaf 665) lies on a page the builder used while writing the parser; no row lies on the builder's four QA pages. The rows are in section 4.
5. **Targeted checks after the repairs** (page images again): 22 rows of repaired kinds, 23 New Jersey rows (12 SEP-BEFORE, 6 ENL-AFTER, 5 Present; seed 41 over the New Jersey pages already fetched) and a fresh draw of 16 label-asserting rows (seed 42, pages already fetched). Result: **0 label-direction errors in these 61 rows**; 1 wrong-basis label (11th New Jersey, John B. Faussett: "resigned July 19, '64" read as "July 10, '61"; he was enrolled in September 1863, so Absent is right but the stated reason was false), which led to rule D9; the defects the 22 repaired-kind rows still showed are in section 8.
6. **Scans of the whole family** (not sampled): every Present-Documented remark (clause-level test that the casualty verb and Gettysburg or a 1 to 3 July 1863 date sit in the same clause); every row whose remark names Gettysburg but is not Present; running page headers against the assigned unit (Ohio and Connecticut) and company headings against the assigned regiment (New Jersey); duplicate and fragment rows; remarks that join more than one man. The scans found three **false labels outside the sample**, all repaired: 25th Ohio `Foutz` and `Buckner` (Present-Documented from a remark merged from other men's rows) and 75th Ohio `Parrent` and a 25th Ohio man (Absent-Documented from a year read as 1863 or 1862 where the page shows 1864 or 1865; both now Present-Documented because the remark names a capture or wound at Gettysburg).

## 3. Result against the accuracy gates (PLAN 4.3)

| gate | measure | result | threshold | status |
|---|---|---|---|---|
| R-G1 name | name exact against the page image after case and punctuation normalisation | 40 of 59 rows with a man's name exact (67.8 %); 19 wrong, of which 12 were not flagged by the builder's name flag and 7 were; 4 of the 19 lose part of the name (surname missing in `Kane, Dainel`, given name in `Flavel W. Sullivan`, rank text inside the name, an initial). One-sided 95 % upper bound on the error rate 43.6 % | 99 % exact | **fail** |
| R-G2 dates | the date or remark that drives the label, exact | lost or misread in 12 of 60 rows (New Jersey 9, Ohio 3): year read `'(12`, `'05`, `'dl`, day `IS`, or the cell absent from the text layer (6,769 of 24,281 New Jersey rows have an empty enrolled and mustered-in cell) | 99 % | **fail** |
| R-G3 label | label equals the label a reader derives from the page; zero hard errors | 0 hard errors in 60 (one-sided 95 % upper bound 4.9 %; PLAN needs 299 rows without one to bound it at 1 %, so n = 60 cannot show better). Of the 59 rows that are men, 12 labels were **weaker than the page supports** (Unknown where the page shows a documented absence): 4 fixed by the repairs, 8 not fixable without a second OCR. Four hard errors outside the sample were found by the scans (section 2.6) | 99 %, zero hard errors | **fail** |
| R-G4 unit reconciliation | every unit Reconciled, Short or Contested, never silent | all 39 units Short against the OOB strength (second-hand, no primary `S_doc`) | 100 % shown | pass in form, `S_doc` open |
| R-G5 casualties named | named casualties over documented casualties | not computed (Fox and OR regiment losses not parsed) | 98 % | open |
| R-G6 citation | every Present and Absent row has `source_id` and a locator that resolves to a page image; ledger hashes match | every row carries `source_id` and the IA leaf; 110 of 110 ledger hashes match | 100 % | pass (structural); the labels rest on OCR text |
| R-G7 conservation | rows raw, parsed, published reconcile with tombstones | closes after the audit: 55,525 builder rows - 395 rows of other regiments' pages + 334 rows recovered from merged remarks = 55,464 parsed; - 402 tombstoned furniture or fragment rows = 55,062 published; every removed row is in `_audit_removed/`. It did not close before: 113 header rows and more than 250 running-title and narrative rows were published as men | zero silent drops | **pass** |
| R-G8 no invented names | a row exists only because a source row exists | 1 spurious row in the 60 (7th Ohio continuation fragment); 402 furniture rows and 395 other-regiment rows found and removed; some fragment rows remain (section 8) | 100 % | **fail** (residual) |
| R-G9 independent sample | PLAN 4.4 passed per stratum | the PLAN 4.4 draw (about 40 strata, 628 rows each, a third from the lowest OCR-confidence decile) was not run; this is a 60-row independent check plus 61 targeted rows | pass | **not passed** |

## 4. The 60 rows (seed 41)

"Row as read" is the name on the page image. "Label before / after" is the label in the builder's CSV and in the CSV after the repairs. "Weaker than page" means the page shows a documented absence and the CSV says Unknown. Names are never corrected, so the name column does not change.

| # | unit | leaf | row as read on the page image | name in CSV (before) | name exact | label before | label after | verdict |
|---:|---|---:|---|---|:--:|---|---|---|
| 1 | U-107OH | 665 | Lopendall, Nicholas | Lopendall, Nicholas | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 2 | U-11NJ | 564 | Gallagher, Henry | Gallagher, Henry | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (deserted Aug 18 1862) |
| 3 | U-12NJ | 602 | Monahan, James | Monahan, James ! | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (enrolled Apr 1865) |
| 4 | U-13NJ | 641 | Clark, Thomas | Clark, Thomas | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (enrolled June 1864) |
| 5 | U-14CT | 607 | McDonald, Robert A. | McDonald, Hubert A | NO | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page |
| 6 | U-17CT | 686 | Smith, Charles H., 2d | Smith, Charles H., 2d | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 7 | U-1NJ-1 | 105 | Kane, Dainel | Dainel | NO | Absent- ENL-AFTER | Absent- ENL-AFTER | label as page |
| 8 | U-1NJ-CAV | 301 | Mease, Jacob D. | Mease. Jacob D | yes | Absent- ENL-AFTER | Absent- ENL-AFTER | label as page |
| 9 | U-20CT | 735 | Jones, George S. | Jones, George S | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 10 | U-23NJ | 796 | Hammond, John | Hammond, John | yes | Unknown OCR-DATE-LOST | Absent- SEP-BEFORE | weaker than page, fixed by the audit: Absent (23rd NJ, must'd out June 27 1863 by ditto marks) |
| 11 | U-25OH | 220 | Penn, Greenberry | Penn Greenberrv | NO | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page |
| 12 | U-27CT | 877 | Patterson, William E. | Patterson, William E | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 13 | U-29OH | 400 | Lowary, Daniel V. | Lowarv, Daniel V | NO | Absent- ENL-AFTER | Absent- ENL-AFTER | label as page |
| 14 | U-2NJ | 109 | Flavel W. Sullivan | W.Sullivan | NO | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | weaker than page: Absent (discharged Oct 1861) |
| 15 | U-3NJ | 181 | Shann, Frederick | Shaun, Frederick | NO | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Unknown or Absent (deserted en route, undated) |
| 16 | U-4NJ | 203 | Kelly, James | j Kelly,. James | NO | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (enrolled Dec 1864) |
| 17 | U-4OH | 109 | James Cantwell | James Cantwell | yes | Unknown ONROLL-NO-STATUS | Absent- SEP-BEFORE | weaker than page, fixed by the audit: Absent (promoted out Dec 1861) |
| 18 | U-55OH | 76 | Rathburn, Hiram L. | Rat hi turn, Hiram L | NO | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 19 | U-5CT | 260 | Woodward, Calvin H. | Woodward, Calvin H | yes | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page |
| 20 | U-5NJ | 240 | Barrett, John | Barrett, John | yes | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page |
| 21 | U-5OH | 178 | Schmidt, Michael | Schmidt, Michael | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 22 | U-61OH | 323 | Sweeney, Daniel | Sweeney, Daniel | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 23 | U-66OH | 539 | Swartz, John | Swartz, John | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 24 | U-6NJ | 285 | Davis, Joseph P. | Davis, Joseph P | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | label as page |
| 25 | U-6OH-CAV | 370 | Knopp, Lester | Knopp, Lester | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | label as page |
| 26 | U-73OH | 179 | William H. Myers, Sr. | William H.Myen, Sr | NO | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 27 | U-75OH | 262 | Daniel, Samuel J. | Daniel, Samuel J | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 28 | U-7NJ | 362 | Warner, William | Warner, William | yes | Absent- ENL-AFTER | Absent- ENL-AFTER | label as page |
| 29 | U-7OH | 223 | (not a man: continuation fragment) | an | - | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | spurious row (continuation fragment), not fixed |
| 30 | U-82OH | 536 | Cicero C. Smith | Cicero C. Smith | yes | Absent- ENL-AFTER | Absent- ENL-AFTER | label as page |
| 31 | U-8NJ | 433 | Boonsal, Cregg | Hoonsal Creg | NO | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (enrolled July 1864) |
| 32 | U-8OH | 258 | Peter J. Hosler | Peter) 3. Hosler | NO | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | label as page; company FS should be A, fixed |
| 33 | U-ART-1CTB | 147 | Kain, George W. | Kain, George W | yes | Unknown ONROLL-NO-STATUS | Absent- SEP-BEFORE | weaker than page, fixed by the audit: Absent (drowned Jan 1863) |
| 34 | U-ART-1CTM | 194 | Wheeler, Francis O. | Wheeler, Francis 0 | NO | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 35 | U-ART-B1NJ | 437 | Kendrick, William H. | Kendrick, William | NO | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | weaker than page: Absent (enrolled Sept 1864) |
| 36 | U-ART-H1OH | 426 | Luke Carr | Luke Carr | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | label as page |
| 37 | U-ART-I1OH | 435 | Harders, Henry | Harders, Henry | yes | Unknown OCR-DATE-LOST | Unknown OCR-DATE-LOST | label as page |
| 38 | U-ART-K1OH | 445 | Stroup, Erastus H. | Stroup, Erastus H | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 39 | U-ART-L1OH | 446 | George Bodine | George Bodine | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 40 | U-25OH | 176 | James H. McBride | James 11. McBride | NO | Unknown ONROLL-NO-STATUS | Unknown OCR-DATE-LOST | label as page |
| 41 | U-55OH | 51 | Henry K. Spooner | Henry K. Spooner | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 42 | U-8OH | 258 | Francis McBride | Francis McBride | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page; company FS should be A, fixed |
| 43 | U-6OH-CAV | 326 | Oliver H. Simmons | Oliver H. Simmons | yes | Unknown ONROLL-NO-STATUS | Absent- ENL-AFTER | weaker than page, fixed by the audit: Absent (entered Nov 1863) |
| 44 | U-27CT | 863 | Hart L. Harrison | Hart L. Harrison | yes | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page; rank offset in the CT staff table, fixed |
| 45 | U-4OH | 109 | James H. Godman | James H. Godman | yes | Unknown ONROLL-NO-STATUS | Unknown ONROLL-NO-STATUS | label as page |
| 46 | U-14CT | 574 | Alfred G. Mollan | Alfred G. Mollan, Prin. Musicians | NO | Absent- SEP-BEFORE | row re-parsed or removed | label as page; rank offset in the CT staff table, fixed |
| 47 | U-5OH | 145 | James D. Fuller | James D. Fuller | yes | Absent- SEP-BEFORE | Absent- SEP-BEFORE | label as page |
| 48 | U-8OH | 258 | John C. Kipka | JOHD:C) Kipkascecs ean | NO | Present CAS-REMARK | Present CAS-REMARK | label as page; company FS should be A, fixed |
| 49 | U-82OH | 558 | Jeremiah Deady | Jeremiah Deady | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 50 | U-107OH | 644 | Otto Weber | Otto Weber | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 51 | U-5NJ | 267 | Thomas Norcross | Thomas Norcross | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 52 | U-25OH | 205 | Lewis Zeigler | (empty) | NO | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 53 | U-ART-K1OH | 443 | George, William | George, William | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 54 | U-61OH | 311 | George Larkin | George Larkin | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 55 | U-11NJ | 557 | Andrew H. Ackerman | Andrew II. AckiTinan | NO | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 56 | U-8NJ | 384 | Meeker, Charles | Meeker, Charles | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 57 | U-73OH | 156 | McGee, William | McGee, William | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 58 | U-7OH | 230 | Burns, John M. | Burns, John M | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 59 | U-14CT | 586 | Goodell, William W. | Goodell, William W | yes | Present CAS-REMARK | Present CAS-REMARK | label as page |
| 60 | U-75OH | 238 | Castor, William A. | (empty) | NO | Present CAS-REMARK | Present CAS-REMARK | label as page |

Counts: names exact 40 of 59; labels as the page shows 47 of 59 men before the repairs and 51 of 59 after (the 8 left are rows whose date cells are missing or garbled in the text layer: table rows 2, 3, 4, 14, 15, 16, 31, 35); hard errors 0; spurious rows 1; company letter wrong 3 (all 8th Ohio, fixed); rank wrong 2 (Connecticut field and staff, fixed); unit wrong 0.

## 5. Systematic defects found

| id | defect | evidence | rows touched |
|---|---|---|---:|
| D1 | **Ohio and New Jersey rows merged.** A line whose name cell is missing from the OCR text but whose date and period cells (Ohio) or row number (New Jersey) are present was appended to the remark of the row above: one row carried the remarks of two or three men, labels followed the wrong remark, and the other men vanished | 25th Ohio leaf 217 (Foutz, Newman, Gillispie) and 6th Ohio Cavalry leaf 330 (Bigelow, Biggin, Bassett): the page images show each as its own row | 334 rows recovered (Ohio 242, New Jersey 92) |
| D2 | **Unit pages ran on into the next regiment**: the page-range finder and the explicit ranges included the next regiment's title, narrative and first roster pages | title rows `26TH REGIMENT`, `30TH`, `56th`, `62nd`, `67th`, `Sixth Regiment` inside the 25th, 29th, 55th, 61st, 66th and 5th Ohio CSVs | 395 rows filed under the wrong unit |
| D3 | **Page furniture and narrative published as men**: `Names.`, `Rank.`, running titles (`25TH REGIMENT`), "Mustered in from Oct. ..." paragraphs, "This Regiment was organized ...", the 1st New Jersey company-strength table | `_audit_removed/` | 402 rows |
| D4 | **Remark start in the wrong cell**: on many pages the remark column starts left of the measured boundary, so `Killed`, `Wounded`, `Discharged`, `Deserted` sit in the period or date cell and the label rules never saw them; killed-at-Gettysburg rows came out Unknown | 11th New Jersey leaf 560 (period cell `Killed`, remark `in action at Gettysburg, July 2`), 4th Ohio leaf 131 | 1448 rows touched (17 Present, 436 Absent, 995 Unknown after) |
| D5 | **Casualty words and clauses**: OCR forms (`iilled`, `Wouuded`, `Raptured`, `Mis,sing`, `Cajitured`) missed; a stray semicolon inside an OCR year (`186:;,`) cut the clause so the casualty word and Gettysburg fell in different segments | 107th Ohio, 11th New Jersey | 45 matched rows and 4 new rows became Present together with D4 (each clause read) |
| D6 | **Separation verbs missing**: drowned, accidentally killed or shot, executed, suicide; promotion out to another regiment or to general officer (PLAN 2.1 lists promotion out) | Kain (drowned Jan 1863) Unknown; Cantwell (promoted Colonel 82d Ohio Dec 1861) Unknown | 26 rows |
| D7 | **Ohio officers and staff never ENL-AFTER**: the builder's rule (taken from the Wisconsin pilot's rank-from dates) suppressed ENL-AFTER for every officer and staff row; the Ohio column is headed "Date of entering the service" on every page and PLAN 2.2 rule 8 reads "enlisted or commissioned in after 3 July" | Simmons (Ser. Maj., entered Nov 4, 1863) Unknown | 813 rows now use the entering date; 24 became Absent |
| D8 | **23rd New Jersey ditto rows**: the book prints the must'd-out date once per company and ditto marks in every column of the rows below; the OCR drops the dittos, so men whose four date cells are empty stayed Unknown | page images leaf 790 and 796 | 504 rows (503 Absent-Documented), flag `must-d-out-by-ditto` |
| D9 | **New Jersey two-digit years**: `'64` read as `'61` gave a separation before the battle although a date written earlier in the same remark is later; enrolled and mustered-in cells that give dates on opposite sides of the battle | Faussett | 185 separations and 283 enlistment dates withheld (the label is `OCR-DATE-LOST`, Unknown) |
| D10 | **Company letters**: 8th Ohio company A listed as `FS`, company H as G (`COMPANY He` heading lost); 75th Ohio company K as I | page images 258 and 264 | 268 rows |
| D11 | **Connecticut field and staff ranks**: the italic rank line is printed above the name; a garbled rank word was glued onto the name above and the next man got a stale rank | 27th CT leaf 863, 14th CT leaf 574 | 92 staff rows |
| D12 | **Remarks of several men joined** where no row could be recovered (11th and 12th New Jersey and others) | 11th New Jersey `Beatty`, `Gulick` | 198 rows flagged; 60 labels withheld (`MERGED-REMARK`: 8 Present, 52 Absent); 138 kept because every joined entry gives the same label |

## 6. Repairs (frozen originals in `_pre_audit/`)

Frozen before any change: all 39 unit CSVs, `OR27-officer-casualties.csv`, `stats.json`, `acquired.json`, `README.md`, `unit_table.md`, `scripts/` (all in `_pre_audit/`), and the row caches `tmp/library/rosters/OJC/{oh,nj,ct}_rows.pre_audit.json` with their `*_stats.pre_audit.json`. Each change was re-run through the whole chain (`ct_parse`, `nj_parse`, `oh_parse`, the three emit scripts, `or_officers`, `final_stats`, `make_readme`).

| change | file | effect |
|---|---|---|
| a line with a month in the date column and a period cell opens a row even without name, rank or age; a remark-only line at the row-start indent that opens with an event word opens a row | `scripts/oh_parse.py` (D1) | +242 Ohio rows (104 by the indent rule, flag `row-recovered-from-remark-indent`) |
| a row number in the NO. column opens a row even without name and date | `scripts/nj_parse.py` (D1) | +92 New Jersey rows |
| a regiment title line naming another regiment ends the unit's pages (digits or spelled ordinal; OCR garbles such as `77H` ignored) | `scripts/oh_parse.py` (D2) | 395 rows leave the 5th, 25th, 29th, 55th, 61st and 66th Ohio (`_audit_removed/other-regiment-pages.csv`) |
| company heading accepts trailing lowercase; company overrides for the 8th Ohio (A from leaf 258) and the 75th Ohio (K from leaf 264) | `scripts/oh_parse.py` (D10) | 268 rows, flag `company-letter-set-by-audit` |
| a name-only line in the Connecticut field and staff table is a rank heading | `scripts/ct_parse.py` (D11) | ranks and names fixed |
| page furniture, narrative paragraphs and stray-numeral fragments (no month, no word of five letters) go to a tombstone file per unit | `scripts/emit.py`, `_audit_removed/*.csv` (D3) | 402 rows |
| words of the remark that landed in the date or period cell are put back in front of the remark | `scripts/emit.py` (`leaked_remark`), `oh_emit.py`, `nj_emit.py` (D4) | 1448 rows, flags `remark-start-in-period-cell`, `remark-start-in-date-or-period-cell` |
| fuzzy casualty words (similarity 0.74 or more to killed, wounded, captured, missing, wounds, prisoner) inside the clause of the place name; a clause is cut at a semicolon only when a word follows | `scripts/lab.py` (D5) | 45 + 4 rows to Present |
| separation verbs: drowned, accidentally killed or shot, executed, suicide, promotion out | `scripts/lab.py` (D6) | 26 rows |
| a separation date earlier than a date written before it in the same remark gives no label | `scripts/lab.py` (D9) | 185 rows |
| the Ohio printed entering date drives ENL-AFTER for officers and staff | `scripts/oh_emit.py` (D7) | 813 rows flagged `officer-or-staff-entering-date-used`; an unreadable one now stays `OCR-DATE-LOST` (it used to be called `ONROLL-NO-STATUS`) |
| 23rd New Jersey: four empty date cells and a printed June 27, 1863 in the company: take it | `scripts/nj_emit.py` (D8) | 504 rows |
| New Jersey enrolled and mustered-in cells on opposite sides of the battle: no enlistment date | `scripts/nj_emit.py` (D9) | 283 rows |
| remarks joining several men flagged; label withheld unless every joined entry gives the same label | `scripts/emit.py` (D12) | 198 flagged, 60 withheld |

Label transitions against the builder's CSVs, rows matched on unit, leaf, first twelve letters of the name and last 24 characters of the remark: Unknown to Absent 721, Unknown to Present 45, Absent to Unknown 293 (136 by the enrolled and mustered-in rule, 90 by the earlier-date rule, 49 merged remarks, 18 other), Present to Unknown 6 (D12), Absent to Present 2, Present to Absent 1; rows that no longer match one to one: 1,379 builder rows (merged, cut or removed) against 923 new rows (4 Present, 275 Absent, 644 Unknown). The 24 fuzzy-only Present rows were all read: each is a real casualty remark (82nd Ohio `Filled July 1, 186?, in battle of Gettysburg`, Battery K `villed Julv 1 1863`).

## 7. What this family can and cannot be used for now

* **Use**: the 1,097 `Present-Documented` rows rest on a casualty, capture or death remark naming Gettysburg or 1 to 3 July 1863; the clause-level scan found no remaining false one. 9 officers are upgraded from the OR 27/1 lists by surname and given name; 31 of the 40 listed officers belong to units in this family, 22 matched a roster row, 9 did not (see `OR27-officer-casualties.csv`).
* **Do not use** names for display or matching until a second reading exists (R-G1). Do not read an Unknown row as "not at Gettysburg": it means no document; 46 % of the Unknown rows are Unknown because a date cell is missing or garbled, not because the man was absent.
* The 23rd New Jersey stays contested with the OOB (G-OJC4); 504 of its 1,009 rows are Absent-Documented by the ditto repair and the 24 printed ones.
* Not publishable as complete (R-G4, R-G8, R-G9) until the items of section 8 are closed.

## 8. What was not fixed, and why

1. **Names (R-G1).** 32 % of sampled names carry an OCR slip; the text layer has the wrong letters and no OCR engine is installed (none installed here: machine rule). Route: a second OCR of the name column (Windows has a built-in OCR engine, `Windows.Media.Ocr`, that needs no install; Tesseract would need one) or a vision read of cropped name columns, then the PLAN 4.4 sample per stratum.
2. **New Jersey dates.** 6,769 rows have an empty enrolled and mustered-in cell and thousands more a garbled one (`'(12`, `'6n`, `Mav`). A rule for the common garbles was tried and rejected: it would put a year on rows that the page shows differently. Same route as 1.
3. **Remarks still joined.** 198 rows are flagged `remark-merge-suspected` (60 labels withheld). The rows recovered by the row-start indent and in the 6th Ohio Cavalry can carry an overflow line of a neighbour (leaf 330, the `Berry, Lyman A.` row has a wrong tail), so the label of such a row comes from a mixed remark.
4. **Fragment rows.** Continuation fragments whose text holds a month name are still published as rows (7th Ohio leaf 223, "ity May 10"): 1 of the 60 sampled rows; the rest cannot be counted without reading the pages. Rows with no name in the text layer (3,207) are real men with a lost name, but some are also fragments.
5. **Year-first remarks** (`1863, in battle of Gettysburg, Pa.`): the verb sits in another cell or is absent from the OCR; 59 rows name Gettysburg and stay Unknown (`gettysburg-named-no-casualty`), among them men who were surely casualties, and desertions at Gettysburg on 2 to 4 July, which are not casualties under PLAN 2.2 rule 2.
6. **Unit and company assignment.** The unit was checked on every Ohio and Connecticut page by running header and on every New Jersey page by company headings. The 6th Ohio Cavalry and the four Light Artillery batteries (explicit page ranges; several batteries on the same pages) were not checked page by page. Company letters other than those in D10 follow the heading and sequence rules and were checked only on the sampled pages.
7. **Per-man presence on the day** for every on-roll man (no muster-roll source), the missing `S_doc`, R-G5, and the sources in README gap 8 (regimental histories, Fox, the New Jersey commission reports, the Ohio deaths-and-burials lists) remain the builder's open items.
8. **OR 27/1 matches** use surname and given name; 9 of 31 in-scope officers matched no row.
9. **Rights note.** Ohio vol 2 (`bwb_W9-BTC-637`) has no Internet Archive copyright flag. It is an 1886 US printing, public domain by date, and the item is open (not lending). No owner permission is involved; the note stays so product credits can name the scan.

## 9. Reproduce the audit

Frozen inputs: `_pre_audit/` and `tmp/library/rosters/OJC/*.pre_audit.json`. Sample draw: `random.Random(41)` over the frozen CSVs sorted by file name, one row per `unit_id` in sorted order, then 8 officer rows (`staff` or `field-staff` sections) and 13 Present-Documented rows, each drawn from a shuffled pool with at most one row per unit until the units run out. Page images: `archive.org/download/ID/page/n{leaf-1}_w1500.jpg` for the leaves in the table; each crop is the matched row plus two lines above and three below, cut at the row's measured position. Re-run: `python -I -X utf8 scripts/ct_parse.py; ct_emit.py; nj_parse.py; nj_emit.py; oh_parse.py; oh_emit.py; or_officers.py; final_stats.py; make_readme.py`.
