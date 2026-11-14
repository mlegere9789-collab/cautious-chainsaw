# Roster production plan (OA03): the names of both armies, one tracked file per unit

Written 13 November 2026 by the roster workstream (planning run). Scope of this run: read what exists, fix the unit list, find the open roster publications state by state, define the compact tracked format and prove it on two real sources, and cut the work into items that engineers can run in parallel. When this plan was written no unit file of the new data set had been produced (two prototype files outside the tree, not product data); **section 9 gives the state of 14 November 2026 (53 of the 640 units have files) and the run order, and governs where it differs from sections 0 to 8.** Network use: archive.org only (search and item metadata, three OCR text files, one 70.7 MB word-box file that was deleted after use, cached and one request at a time), plus one probe each of three New York State Military Museum addresses that did not answer; no host that forbids automated access, no account, key or licence, nothing committed or deployed.

Evidence labels follow `PLAN.md`: **Documented** (a source or a file says it; named), **Measured** (a command run in this pass produced it), **Computed** (arithmetic on those), **Modelled** (an estimate from stated assumptions), **Unknown**. A label says what a source supports; it never lowers a gate.

Files of this plan: `PRODUCTION-PLAN.md` (this), `work-items.json` (36 work items with units, sources, first tasks, estimates, gaps, owner steps), `data2/units.json` (the 640 units and their cross-references), `data2/sources/ia_catalogue.json` (the 212 Internet Archive items the plan cites, with the facts of their metadata), `pipeline2/` (the tools), `../GOVERNANCE/horde/ws-rosters/` (measurements). Run `python3 -I docs/battle-theatre/rosters/pipeline2/build_units.py` and `.../make_work_items.py` from the repository root to rebuild the two JSON files.

---

## 0. What you need to know first

1. **Names of the whole war, not of the 1-3 July men, is what the open sources give.** State rosters print every man who served in a unit, with his service history. A man's presence at Gettysburg is therefore stated only where a printed remark, a participants list, a casualty list or a burial list says so (Law 4). The new format carries no presence label at all: each row is what the source line prints, with its locator; the page marks the rows whose printed remark names Gettysburg and the segments that are lists of men at the battle. The earlier labels (`Present-Documented` and the rest) stay in `rosters/data` as a second reading and are not copied.
2. **The unit list is fixed: 640 units, 366 Union and 274 Confederate** (418 infantry, 70 cavalry, 142 batteries, 10 others), built from the two Official Records organization tables and cross-referenced to the history registry, the baseline order of battle, the kit and the earlier roll files (481 of the 640 units have one). 91 units whose numeral the OCR of the table misreads follow the owner's governing text (PDF B.3) and are flagged. Section 2.
3. **The format is `roster2/2`: one gzip JSON-lines file per unit, name as printed, rank, company, remarks as printed, source id, volume, printed page and the character offset of the name in a pinned OCR text.** Measured on two real sources: 91 bytes a row on a flow source (the 26th North Carolina), 110 on a table source (the 10th Vermont); 57 percent and 20 percent of the rows are 90 bytes or less. The 90-byte aim holds for the structure of a row; the remarks as printed are the rest and are never cut (Law 1). Section 3.
4. **Locatability is checked by machine for every row** (name, remarks, page and rank are found in the pinned text at the recorded offset): 1,737 of 1,737 rows of the Moore prototype pass; the table prototype aligns 25,422 of 25,423 word boxes to the text and 1,031 of 1,031 rows pass the remark and page checks, while 149 names fail because the prototype puts rank-heading words into the name. The check proves a row exists where it says; it cannot prove that remarks belong to that name, so the independent page-image sample (R-G9) stays a gate. Section 6.
5. **Where the open record is thin the plan says so.** Open whole-war rolls were found for 16 of the 18 Union states (thin: Michigan and Delaware; the Regular Army has officers only) and for two Confederate states (North Carolina: Moore; Louisiana: Booth), plus parts of others; Virginia, Georgia, Alabama, Mississippi, South Carolina, Tennessee and Arkansas rest on regimental histories, survivors lists and officers lists. Each such group has source search as its first task and a gap to register (request note written). Section 4.
6. **`rosters/data` is 389 MiB for 472,000 rows and is not extended.** 202.8 MB are the live CSVs (about 430 bytes a row, 20 columns, whole-war rolls), 139.9 MB are frozen pre-audit copies, 52.3 MB are intermediate JSON. It stays as an independent second reading for reconciliation; the closing step proposes removing the frozen copies after the new files pass their gates. Section 1.
7. **Cost (Modelled): about 15.5 million tokens and 168 agent-hours for the 32 state and army items, plus four cross-cutting items; 143 MB of OCR text to fetch; one transient 30 to 106 MB word-box file at a time per table source.** Section 5.
8. **Owner-only steps are written, none was done**: allowing two New York hosts in the cloud environment, a browser download of Digital Maine files, the Georgia and Delaware image hosts, a decision on the second-reading route for page images. Section 8.

---

## 1. What exists and what it is worth

### 1.1 The folder (Measured)

| path | what | size |
|---|---|---|
| `PLAN.md`, `SOURCES.csv` (131 rows), `GAPS.md`, `PERMISSION-REQUESTS-DRAFT.md` | the 19 October plan, the source ledger, 17 gaps G01 to G17 and later family gaps; the permission drafts were withdrawn under DEC-019 | 0.2 MB |
| `schema/` | person and source-ledger schemas of the labelled CSV design | 16 KB |
| `pilot/` | three regiments (6th Wisconsin, 20th Maine, 26th North Carolina), 5,379 rows with labels | 1.5 MB |
| `pipeline/` | the scripts of the pilot and the nine family runs (Python, standard library) | 1.2 MB |
| `data/` | nine family runs of 30 October: NE, NY, PA, MW, OJC, REG, C-NCLA, C-VASCGA, C-ALMSTX | 402.7 MB (389 MiB) |
| `pipeline2/`, `data2/units.json` | the tools and unit list of this run (started in the interrupted run earlier today and finished here) | 0.7 MB |

### 1.2 Why `data/` is 389 MiB (Measured: sizes of the 1,830 files)

| part | files | MB | what it is |
|---|---|---|---|
| live roster CSVs | 674 | 202.8 | 471,917 rows with a name (counted by `pipeline2/size_budget.py`): name, rank, company, residence, age, dates, remarks, a label, a basis sentence, a roll status, flags, source locator: about 430 bytes a row |
| `_pre_audit/` frozen copies | 794 | 139.9 | the whole parse output of eight families as the builders left it before the independent audit of 30 October: every CSV exists twice |
| `C-NCLA/work/` intermediate JSON | 34 | 52.3 | Moore classified twice (18.2 and 18.1 MB, the two Internet Archive scans), Booth entries (5.5 MB), logs |
| audit samples, tombstones, coverage tables | 95 | 3.1 | |
| other JSON (ledgers `acquired.json`, stats) | 49 | 3.1 | |
| scripts, markdown, logs, quarantine | 184 | 1.5 | |
| **total** | **1,830** | **402.7** | (`du` counts 389 MiB) |

Three causes: the rows carry derived text beside the printed text (a basis sentence and a label per row), the whole set exists twice, and the rolls are whole-war (472,000 rows against about 166,000 men present on the field). The families document that the name and label gates were not met after the independent audit (NE 45 of 60 sample rows faithful, REG 42 of 60 before repair, C-VASCGA states R-G1, R-G3 and R-G9 not passed); the others state that nothing is product data until the gates pass.

### 1.3 What is reused and what is not

Reused (finished work is not redone): the Internet Archive identifiers and which volume holds which unit; page ranges; parser rules for each table family; the defect lists in each `AUDIT.md` and `GAPS.md`; the row counts per unit as a reconciliation target; the leads (sources named and not yet read). 481 of the 640 units are linked to an earlier roll file with its row count (466,531 rows).

Not reused: the rows. They have no text offsets; their `name_as_printed` is not always the text order (the Moore rows give `M. T. Hill` for the printed `Hill, M. T.`, and `S Hinson` for the printed `Hinson, S, M.`, Measured on the 26th North Carolina text); the labels are a derived reading. The new files are parsed again from the pinned OCR text, and the old CSVs are an independent second reading: the differences are listed per unit and none is resolved by guessing.

### 1.4 What `data/` becomes

Frozen. Nothing is added to it. When the new files pass their gates the owner can decide to remove `_pre_audit/` and `C-NCLA/work/` (192 MB) from the tree; the closing step lists the exact paths. Nothing was deleted in this run.

---

## 2. The unit list

`data2/units.json` (built by `pipeline2/build_units.py` from `pipeline2/units_data.py`; re-run it to rebuild). Authority: the organization of the Army of the Potomac (OR Ser. I vol. 27 pt. 1, No. 9, printed pp. 155-168) and of the Army of Northern Virginia (pt. 2, pp. 283-291), typed once from the tables, every unit but three re-found in the OCR text of the volumes (`or_check`: exact 540, ocr-numeral 91, ocr-spelling 4, not applicable 2, pdf-only 3). Cross-references: history registry 527 units, baseline order of battle 548, kit 189 units carry a kit id (of 187 kit ids; 2 stay unmatched, the Alexander battalion batteries the PDF names Richmond and Bath, "not decided"), earlier roll files 481.

| group id | units | infantry | cavalry | artillery | other | rows in earlier CSVs | units with no earlier rows | wave |
|---|---|---|---|---|---|---|---|---|
| union-me | 14 | 10 | 1 | 3 | 0 | 13,522 | 3 | 1 |
| union-nh | 4 | 3 | 0 | 1 | 0 | 6,239 | 0 | 1 |
| union-vt | 11 | 10 | 1 | 0 | 0 | 0 | 11 | 1 |
| union-ma | 24 | 18 | 1 | 4 | 1 | 31,520 | 2 | 1 |
| union-ri | 6 | 1 | 0 | 5 | 0 | 2,389 | 0 | 2 |
| union-ct | 8 | 5 | 0 | 3 | 0 | 7,882 | 1 | 1 |
| union-ny | 98 | 69 | 8 | 19 | 2 | 123,274 | 15 | 2 |
| union-nj | 15 | 12 | 1 | 2 | 0 | 23,272 | 2 | 1 |
| union-pa | 82 | 68 | 9 | 5 | 0 | 110,595 | 9 | 1 |
| union-de | 2 | 2 | 0 | 0 | 0 | 29 | 0 | 3 |
| union-md | 6 | 3 | 2 | 1 | 0 | 5,686 | 0 | 2 |
| union-wv | 4 | 1 | 2 | 1 | 0 | 2,742 | 0 | 2 |
| union-oh | 19 | 13 | 2 | 4 | 0 | 22,899 | 1 | 1 |
| union-in | 7 | 5 | 2 | 0 | 0 | 6,263 | 2 | 2 |
| union-il | 3 | 1 | 2 | 0 | 0 | 6,679 | 0 | 2 |
| union-mi | 12 | 7 | 4 | 1 | 0 | 2,018 | 1 | 3 |
| union-wi | 6 | 6 | 0 | 0 | 0 | 10,803 | 0 | 1 |
| union-mn | 2 | 1 | 0 | 0 | 1 | 1,320 | 1 | 2 |
| union-us | 43 | 11 | 4 | 23 | 5 | 196 | 8 | 3 |
| conf-nc | 41 | 33 | 4 | 4 | 0 | 49,347 | 6 | 1 |
| conf-la | 17 | 10 | 0 | 7 | 0 | 9,883 | 2 | 1 |
| conf-va | 105 | 42 | 21 | 42 | 0 | 3,148 | 65 | 3 |
| conf-sc | 18 | 11 | 2 | 5 | 0 | 4,506 | 10 | 2 |
| conf-ga | 45 | 37 | 2 | 6 | 0 | 7,896 | 16 | 2 |
| conf-al | 19 | 17 | 0 | 2 | 0 | 3,681 | 1 | 3 |
| conf-ms | 13 | 11 | 1 | 1 | 0 | 1,718 | 1 | 3 |
| conf-fl | 3 | 3 | 0 | 0 | 0 | 3,667 | 0 | 2 |
| conf-tn | 3 | 3 | 0 | 0 | 0 | 32 | 0 | 3 |
| conf-tx | 3 | 3 | 0 | 0 | 0 | 3,527 | 0 | 2 |
| conf-ar | 1 | 1 | 0 | 0 | 0 | 151 | 0 | 3 |
| conf-md | 5 | 1 | 1 | 3 | 0 | 1,647 | 1 | 2 |
| conf-cs-staff | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 3 |
| **all** | **640** | **418** | **70** | **142** | **10** | **466,531** | **159** | |

Findings of the list (Measured, each in `units.json`):

* **Three units come from the PDF and the kit, not from the OR table**: the 12th Virginia Cavalry (kit `CS.CAV.12VA`; the table prints Jones' brigade as the 6th, 7th and 11th Virginia only), the 35th Virginia Cavalry Battalion and the 3rd Georgia Battalion Sharpshooters. They are in the list with `or_check: pdf-only` and their source stated. Three units the PDF marks never on the field (13th and 58th Virginia, 44th North Carolina) are not in the list and are recorded under `not_in_or_table`.
* **The kit names the Connecticut heavy batteries "B and H"; the OR table prints B and M.** Both OR units are kept and the kit text is not corrected (`kit_ids[].note`).
* **24 batteries and cavalry units have no kit id** (for example the Sumter Battalion companies, the Albemarle and Charlotte artillery); the list is `units_without_kit_id`. This is a kit gap, not a roster gap.
* **11 earlier roll files, 8 OOB ids and 5 history entries attach to no unit, with their reasons** (the 11th New York, 127th Pennsylvania and 23rd New Jersey are not in the OR table; Massachusetts Batteries E and F and New York Battery C match no OR battery; Battery F, 4th US (XI Corps) conflicts with the table; the Regular artillery officers files do not name a battery; the 58th Virginia and the three never-on-field entries): `attached_to_no_unit`. Four roll files of regiments the OR table does not print (the 120th New York and the 46th, 107th and 139th Pennsylvania) stay unmatched and are listed.

---

## 3. The format

### 3.1 One file per unit

`rosters/data2/<army>/<state>/<unit>.jsonl.gz` (path in `units.json`), gzip with a fixed header (identical bytes for identical content), UTF-8, one JSON value per line, written and read by `pipeline2/r2lib.py` (`write_unit`, `read_unit`, `verify_rows`; the module docstring is the specification). Fields: name as printed, rank, company, remarks as printed, source id, volume, printed page, text offset. No page images, no labels, no corrected names.

```
{"f":"roster2/2","u":"c-nc-26th-north-carolina-infantry","army":"confederate","st":"nc","name":"26th North Carolina Infantry","n":1737}
{"s":"NC-MOORE-1882","v":"2","t":"NC-MOORE-1882.2","lay":"flow"}
{"co":"FS","pg":362}
[1222159,"Zebulon B. Vance","Colonel","cm. August 27th, '61; Buncombe co.; p. Governor of North Carolina and Commander-in-Chief September Sth, '62.",31]
[153,"Henry K. Burg^\\yn","Colonel","cm. in September, '62; Northampton co. ; p. from Lieutenant Colonel, and k. July 1st, '€3, at Gettysburg.",32]
...
[55,"Miller, Harrison","","e. May 17th, '61 ; Ashe co.-; pr. July 3*, '63, at Gettysburg.",20]
```

* Line 1 is the header; each **segment** line (`s` source id, `v` volume, `t` text id, `lay` flow or cols) starts the rows read from one pinned text; a unit with several sources (a roll, a participants list, a casualty list) has several segments.
* **State lines** (`co` company, `pg` printed page, `rk` the heading that carries the rank) set what the following rows inherit; a **row** is `[doff, name, rank, remarks, rd]` with trailing fields left out: `doff` is the character offset of the name minus the offset of the previous row, `rd` the offset of the first remark character minus the offset of the name.
* The text id points to a ledger `data2/sources/<source id>.json` (written by `fetch_text.py`) that pins the OCR text by sha256, with the Internet Archive identifier, title, date, the item's own copyright flag and the access flag. **Rights per name** are therefore source id, volume, printed page and the ledger entry; no rights text is repeated on a row.
* **No label.** A row says what the line prints. The prototype's known weakness (kept visible on purpose): where the OCR garbles the first letters of a name (`I<:irkland`) the entry head is not recognised, so the entry is glued into the remarks of the row above (the row of `Knight, Burwell J.` swallowed the next two men); the verifier cannot see that, the independent sample does (section 6).

Two kinds of source text (`kind` in the ledger): the Internet Archive `hocr_searchtext.txt.gz` with `hocr_pageindex.json.gz` and `page_numbers.json` (202 of the 212 cited items have all three; the Emory copies name them `<number>_<number>_hocr_searchtext.txt.gz`, which `fetch_text.py` now finds by its ending), and, for the 10 items without, text derived from `djvu.xml` by `pipeline2/xml_text.py` (xml deleted after the run, its sha256 kept). OCR text only is kept, under `tmp/library/rosters/<source id>/`: 143 MB gzipped for all 32 items, about four to five times that decoded, one volume at a time in memory.

### 3.2 The two layouts

* **flow**: one entry per line or paragraph (Moore, Massachusetts, New Hampshire, Booth, Thomas, Salley, the unit histories). The row is cut from the search text; the remarks follow the name within the same entry; verification steps over at most 200 characters (a running head at a page break).
* **cols**: a table whose columns are separate blocks of the text (Bates, Ohio, New Jersey, Connecticut, Wisconsin, Vermont, Maine returns, Illinois, Indiana, Michigan, Maryland, West Virginia). The row is built from the word boxes of the item's `djvu.xml` (a transient 30 to 106 MB download), each word aligned in order to the search text token by token, so that the name and every remark token get their exact offsets; the remarks are the row's cells in text order, and verification requires every remark token to stand, in order, in the leaf of the name. The alignment was measured: 25,422 of 25,423 words of 28 Vermont leaves.

### 3.3 Verification (`pipeline2/verify_unit.py`, exit 1 on a defect)

| check | rule | on failure |
|---|---|---|
| V1 name | the name tokens stand in the text at the offset, in order, separated only by white space (the last token may carry glued punctuation) | the row is a defect and is not published |
| V2 remarks | the remark tokens stand in the text in order from `offset + rd`, the first exactly at that place; flow: at most 200 characters stepped over; cols: inside the leaf | defect |
| V3 page | the offset lies in a leaf of the page index and the printed page of that leaf is the row's page (null when the page-number file gives none) | defect |
| V4 rank | a printed rank is found in the leaf; a carried heading is found above the row (case-folded) | counted |
| ledger | every text id exists in `data2/sources/` and the file matches its sha256 | defect |

What the checks do not prove: that a remark belongs to a name, or that an entry was cut at its true start. That is the independent sample (section 5.5).

### 3.4 Size (Measured on two prototypes, Modelled for the whole set)

Measured on the stored files (`GOVERNANCE/horde/ws-rosters/format_measurements.json`):

| prototype | rows | bytes a row (whole file) | row lines: median / 90th percentile | rows of 90 bytes or less | file raw | file gzipped | saving of roster2/2 over the earlier every-field form |
|---|---|---|---|---|---|---|---|
| 26th North Carolina (flow, Moore vol 2) | 1,737 | 91.4 | 84 / 129 | 57.3 percent | 158,786 | 35,327 (4.5:1) | 21 percent |
| 10th Vermont (cols, Revised Roster 1892) | 1,031 | 110.4 | 104 / 138 | 20.3 percent | 113,790 | 30,534 (3.7:1) | 10 percent |

The part of a row that is not remarks (name, rank, offsets, brackets) is 33 bytes (Moore) and 36 bytes (Vermont) on average (row line minus remark characters); the remarks printed are 58 and 74 characters on average. So "under about 90 bytes a line" is met on average by a flow roll and is not met by a table roll or by a source whose entries carry long service histories: the New York Registers print about 250 to 350 characters a man, and the model of the earlier New York rows gives a mean line of 296 bytes (`size_budget_old_rows.json`). Cutting remarks to fit would break "remarks as printed" (Law 1), so nothing is cut.

Whole set (Modelled): the rows lie between about 481,000 (the 466,531 rows of the earlier files linked to units, plus about 14,000 for Vermont) and about 860,000 (every unit given a roll of its arm's mean size in the earlier data: 1,576 Union infantry, 1,190 Confederate infantry, 2,105 cavalry, 300 batteries; 1,000 for sharpshooters and engineers, 300 for staff). With New York (123,000 rows) at 270 bytes a row, the length the earlier rows model to once the new form saves 10 percent, and every other row at the 91 to 110 bytes measured, the raw total is about 66 to 73 MB at the floor and about 102 to 116 MB at the ceiling: it straddles 80 MB. **Decision (delegated, DD-ROS-03): the per-unit files are gzipped from the start**, which the brief asks when the total would pass 80 MB; the gzipped total is Modelled at 15 to 31 MB (3.7:1 to 4.5:1 as measured). `roster-index` writes the measured raw total to `data2/index-summary.json`; if it ends under 80 MB the owner may choose plain `.jsonl` (one line in `write_unit`).

### 3.5 The index

`data2/units.json` is the unit master (640 units, cross-references, earlier files). `roster-index` writes `data2/index.json` (built as `data2/INDEX.json` and `rosters/status.json` by `pipeline2/build_index.py`, section 9.3) from the files that exist: per unit key, path, designation, segment list (source id, volume, text id, layout, rows), raw and gzipped bytes, sha256 of the raw lines, the coverage class (`full-roll`, `partial`, `officers-only`, `list-only`, `none`) with the gap id where a source is missing, and the verification result; and `data2/index-summary.json` with totals per army and state. The roster page reads the index first and a unit file on demand (a regiment of about 1,700 rows is 35 KB gzipped, the Moore measure).

### 3.6 What the page may say about presence

Only what a source says. A row whose printed remark names Gettysburg (an OCR-tolerant text match; 468 of the 1,737 rows of the 26th North Carolina prototype, a count not a judgement) is marked "the printed remark names Gettysburg" and shows the remark. A segment that is a list of men at the battle (participants, casualties, inscriptions, burials, a newspaper casualty list) is shown with its source. A unit shows its documented strength present and "n present, names not recovered" (PLAN 4.2). A date, a place or a wound is never read into a remark by the page: the remark is shown as printed. Whether a remark means present (a desertion "at Gettysburg" on 30 June is not) is a reading that needs a rule file and an independent check; it is not done here and is not claimed.

---

## 4. Sources

| group | principal sources (source id: Internet Archive identifiers) | status of the principal ones |
|---|---|---|
| union-me | ME-AGR-1863-APPD: `annualreportofad1863main`; ME-SUPP-1867: `supplementtoannu00main`; ME-APPD-1861: `appendixdofannua00main` | used-earlier, verified-meta |
| union-nh | NH-AYLING-1895: `cu31924096263128`, `cu31924096263136` | used-earlier |
| union-vt | VT-ROSTER-1892: `cu31924080774148` | verified-meta |
| union-ma | MA-SSM-1931: `massachusettssol11931mass`, `massachusettssol21931mass`, `massachusettssol31931mass` (+5); MA-SSM-1937-INDEX: `massachusettssol1937mass` | used-earlier, verified-meta |
| union-ri | RI-REG-1866: `officialregister00rhod`; RI-BATT-B-1894: `historyofbattery03rhod`, `historyofbattery01rhod`, `historyofbattery04rhod` | used-earlier |
| union-ct | CT-CAT-1869: `connecticutvolorg00catarich`; CT-CAT-1864: `catalogueconnec00offigoog`, `catalogueconnec00morsgoog`, `catalogueofconne00conn` (+1) | used-earlier, verified-meta |
| union-ny | NY-AGR-REGISTERS: `annualreportadj01unkngoog`, `annualreportadj02unkngoog`, `annualreportadj06offigoog` (+1); NY-RECORD-1864: `recordofcommissi00newy`, `recordofcommiss00newy`, `recordofcommis00newy` (+2) | verified-meta |
| union-nj | NJ-STRYKER-1876: `newjerseyincivil01recorich`, `newjerseyincivil02recorich` | used-earlier |
| union-pa | PA-BATES-1869: `historyofpennsyl01bate`, `historyofpennsyl02bate`, `historyofpennsyl03bate` (+2) | used-earlier |
| union-de | DE-MURPHEY-1866: `fouryearsinwarhi00murp`, `fouryearsinwarhi00murp_0`; blocked or not found: DE-STATE-ROLLS | used-earlier |
| union-md | MD-ROSTER-1898: `historyrosterofm01mary`, `historyandroste00assegoog`, `rosterormaryland00vernrich` (+1) | used-earlier |
| union-wv | WV-AGR-1864: `annualreportadj07offigoog`, `annualreportofad1864west`; WV-AGR-1866: `annualreportsofa00west` | used-earlier |
| union-oh | OH-ROSTER-1886: `bwb_W9-BTC-637`, `ohiowarroster03howerich`, `ohiowarroster05howerich` (+4); OH-ROSTER-2NDCOPIES: `officialrosters06commgoog`, `ohiowarroster04howerich`, `ohiowarroster08howerich` (+1) | used-earlier, verified-meta |
| union-in | IN-AGR-1865-69: `reportindiana04dougrich`, `reportindiana05dougrich`, `reportindiana06dougrich` (+4) | used-earlier |
| union-il | IL-AGR-1900: `reportofadjutantv5illi`, `reportofadjutantv8illi`, `reportofadjutant05illi1` (+1) | used-earlier |
| union-mi | MI-ROS-1905: `recordofserviceo03mich`, `recordofserviceo08mich`, `recordofserviceo17mich` (+2); MI-AGR-1865: `annualreporto186566mich`, `annualreportof186566mich`, `annualreportofa186566mich` (+1) | used-earlier, verified-meta |
| union-wi | WI-ROSTER-1886: `rosterofwisconsi01wisc`, `rosterofwisconsi02wisc`, `rosterofwisconsi01wisco` (+1) | used-earlier |
| union-mn | MN-CIVIL-1890: `minnesotacivil01minnrich`, `minnesotaincivil01minn`, `minnesotacivil02minnrich` (+1) | used-earlier |
| union-us | US-BERDAN-1892: `berdansunitedsta00stev`, `cu31924097557304` | verified-meta |
| conf-nc | NC-MOORE-1882: `rosternorthcaro00moorgoog`, `rosterofnorthcar02nort`, `rosterofnorthcar03moor` (+1) | used-earlier |
| conf-la | LA-BOOTH-1920: `recordsofl00loui`, `recordsoflo00loui`, `recordsoflouisi00loui` (+4) | used-earlier |
| conf-va | VA-LOEHR-1884: `warhistoryold00loehrich`; VA-BEALE-1899: `historyofninthvi00beal`; VA-PAGE-1885: `sketchofpagesbat00page`; VA-IRBY-1878: `historicalsketc00irbygoog`; VA-PENSIONERS-1917: `rosterofconfeder00virg`, `rosterofconfeder1917virg`, `rosterofconfede191921virg`; VA-PAROLES-1887: `cu31924030921773`; blocked or not found: VA-LIBRARY-OF-VA | used-earlier, verified-meta |
| conf-sc | SC-SALLEY-1914: `southcarolinatr00sallgoog`; SC-3RD-TENTATIVE-1908: `tentativerostero01sall`, `tentativerostero02sall`; SC-TOMPKINS-1897: `06269758.3416.emory.edu`; blocked or not found: SC-SALLEY-V1-V3 | used-earlier, verified-meta |
| conf-ga | GA-THOMAS-1903: `historyofdolesco00thom`, `cu31924032376414`; GA-WARREN-1863: `historyofelevent00warr`; GA-NICHOLS-1898: `01494987.3402.emory.edu`; blocked or not found: GA-VAULT, GA-HENDERSON | used-earlier |
| conf-al | AL-OATES-1905: `01897724.3053.emory.edu`; AL-HURST-1863: `historyoffourtee01hurs`; AL-MONTGOMERY-GREYS-1908: `19598551.3307.emory.edu`; blocked or not found: AL-ADAH | used-earlier |
| conf-ms | MS-QUITMAN-1866: `historicalsketch00newo`; blocked or not found: MS-MDAH | used-earlier |
| conf-fl | FL-SOLDIERS-1903: `soldiersofflorid00flor` | used-earlier |
| conf-tn | none that prints a whole-war roll; blocked or not found: TN-TSLA | see gaps |
| conf-tx | TX-POLLEY-1910: `hoodstexasbrigad00poll`, `cu31924032778817`, `hoodstexasbriga00poll` | used-earlier |
| conf-ar | AR-3RD-APPOMATTOX: `cu31924030921773`; blocked or not found: AR-OTHER | used-earlier |
| conf-md | MD-GOLDSBOROUGH-1900: `marylandlineinco00gold` | used-earlier |
| conf-cs-staff | none that prints a whole-war roll | see gaps |

Every identifier above is in `data2/sources/ia_catalogue.json` with its title, date, volume, image count, the item's `possible-copyright-status` (blank when absent: 89 of 212, mostly pre-1931 imprints), the access flag, and the sizes of its text and coordinate files. **One of the 212 is access-restricted (Henderson, Roster of the Confederate Soldiers of Georgia, vol. 4) and is marked blocked; it is never opened.** Statuses: `used-earlier` (parsed by a family run, layout and defects known), `verified-meta` (metadata read in this pass, content not inspected), `lead` (named by a search or a README, not inspected), `blocked`, `not-found`.

**Local library** (`GOVERNANCE/library/acquired_2.json`, 99 items, texts under `tmp/library/ws9`, read in this pass): the items that bear on a roster are the state Gettysburg volumes (`VT-MON-1890`, `VT-GB-1914`, `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `OH-DED-1887`, `OH-8TH-1889`, `IN-1913`, `MN-1ST-1916`), the burial lists (`MA-BURIAL-1863`, `CEM-REPORT-1867`, `CEM-BARTLETT-1874`, `CEM-INDIANA-1865`), five volumes of the Southern Historical Society Papers and the Official Records volumes. They are leads for lists of men stated present; none was inspected for names here, and they are assigned to `roster-gettysburg-lists` and to the state items. The 62 issues of the Gettysburg Compiler and the Adams Sentinel (June to December 1863) are local newspapers and are not roster sources.

### 4.1 Union (19 groups)

Whole-war rolls by regiment exist and are open for Maine (1863 returns, the 1867 name index), New Hampshire (Ayling), Vermont (Revised Roster, now reachable), Massachusetts (Soldiers, Sailors and Marines), Connecticut (Catalogue), New York (the 1864 muster-in Record on the Internet Archive; of the Registers only the 75th to 80th regiments are on the Internet Archive), New Jersey (Stryker), Pennsylvania (Bates), Ohio (Official Roster), Indiana (Terrell), Illinois (revised report), Wisconsin (Roster), Minnesota (Minnesota in the Civil and Indian Wars), Maryland (the 1898 roster), West Virginia (1864 report), Rhode Island (2nd Rhode Island, Batteries A and B). Thin: Michigan (one regiment's Record of Service on the Internet Archive), Delaware (26 and 3 rows from the text), the Regular Army (officers: Heitman, the Army Registers; the Sharpshooters: Stevens), and the headquarters and staff entries (named in the OR).

The main cost and risk are the table sources: Bates (110,595 rows earlier, five volumes of 1.4 to 1.5 thousand images), the Ohio roster (seven volumes) and the New York Registers (blocked host). Bates loses the muster year on a large share of pages (second reading of the date column covered 373 of 2,039 pages and needed Windows OCR, which is not available here).

### 4.2 Confederate (12 groups and the staff)

Whole-war rolls: North Carolina (Moore 1882, four volumes; the 33 infantry regiments, the cavalry and four batteries; the earlier run read two Internet Archive scans of each volume, a double reading) and Louisiana (Booth 1920, six books; known incomplete). Partial: South Carolina (Salley vol. II built from the 30 June 1863 muster rolls: the 2nd and 3rd; Salley vol. I and III are not open), Georgia (Thomas for four regiments, Warren, Nichols), Alabama (Oates for the 15th, Hurst for the 14th), Texas (Polley: all three regiments), Florida (all three, one scan that drops 6.1 percent of the names), Maryland (Goldsborough), Virginia (the 1st Virginia, the 9th Cavalry, Page's Battery, one company of the 18th). **Virginia, with 42 infantry regiments, 21 cavalry units and 42 batteries (105 of the 274 units), has no public-domain whole-war roll**: the Howard regimental series and Manarin are copyrighted print; the Library of Virginia holds pension and disability records; what is open is regimental and battery histories (some print rolls), the 1917 pensioner rosters (survivors of 1917), and the Appomattox paroles (survivors of April 1865). The first task of the Virginia group is a per-unit title search (about 105 queries at 1.2 s) so that the gap is known unit by unit.

### 4.3 Hosts and sources that are blocked or absent (Documented, recorded, not worked around)

| what | why | owner step, if any |
|---|---|---|
| New York State Military Museum (the Register PDFs of 79 NY units, used by the earlier run) | host does not answer from this machine (Measured: no HTTP status for `museum.dmna.ny.gov`, `www.nysmm.org`, `nysmm.org`); not on the reachable list | add the two hosts to the cloud environment's allowed hosts (an environment setting needing approval); the Internet Archive volumes are the fallback |
| Digital Maine (the 1864-65 Maine report, 20th Maine deceased list) | Cloudflare bot challenge (G03) | a person downloads the files in a browser into `tmp/library/rosters/ME-AGR-1864` |
| HathiTrust (`babel.hathitrust.org`), `ehistory.osu.edu` | bot block named by the brief | none |
| Henderson, Roster of the Confederate Soldiers of Georgia (1959-64) | copyrighted, lending-restricted (the catalogue shows `access-restricted-item`) | none |
| Georgia Archives Virtual Vault (original muster rolls), Alabama ADAH database, Mississippi MDAH, Tennessee TSLA, Florida Memory, Library of Virginia, Arkansas State Archives, Delaware Public Archives (image PDFs) | not on the reachable list; terms unread or a certificate failure that is not bypassed; image-only for Delaware and Georgia | host additions as above if the owner wants them; a second-reading route for page images (section 7) |
| Salley, South Carolina Troops in Confederate Service vol. I (1913) and III (1930) | not found as open Internet Archive items by title, creator or identifier; vol. III is a 1930 imprint | none |
| NPS Soldiers and Sailors database, FamilySearch, Fold3, Ancestry, Find a Grave | forbid automated access or disallow `/search/` in robots.txt | none; a name from them would be a lead, never a row |
| NARA compiled service records | catalogue access needs an API key; images are on Fold3 and FamilySearch | none (no keys by Claude) |
| Busey and Martin, Regimental Strengths and Losses | lending-restricted | none |
| Chronicling America (1863 newspapers) | recorded as blocked in the earlier run (HTTP 403 for its user agent); on this machine's reachable list | one test request, then at most 1 per second |

---

## 5. Production

### 5.1 Work items (`work-items.json`)

36 items: 32 state and army groups (ids `union-<state>`, `conf-<state>`, `union-us`, `conf-cs-staff`) and four cross-cutting items (14 November: 34 open items are returned, section 9.2). Each state item carries its units (key, designation, earlier row count, path), its sources with Internet Archive identifiers and facts, first tasks, gaps known, owner steps, wave and estimates. Common steps for every state item (`common.steps`): 1 resolve sources and pin the text (fetch_text.py); 2 parse (one parser per layout); 3 write one file per unit with `write_unit`; 4 verify (zero V1 and V3 defects); 5 reconcile with the earlier CSVs (differences listed, none resolved by guessing); 6 report and one progress line.

Cross-cutting items: **roster-index** (index, whole-set verification, size report, conservation per unit), **roster-qa** (independent sampling test, second reading of page images), **roster-gettysburg-lists** (officers named in OR 27, National Cemetery burial lists, 1863 newspaper casualty lists, the state Gettysburg commission volumes already in `tmp/library/ws9`: the statements of presence that no roll prints), **roster-app** (the reader and the page in `docs/battle-theatre/app/roster`, the copy audit).

### 5.2 Waves

| wave | groups | why this order |
|---|---|---|
| 1 | union-pa, union-oh, union-nj, union-ct, union-wi, union-nh, union-ma, union-me, union-vt, conf-nc, conf-la | a whole-war roll source is known for most units; they hold 61 percent of the earlier rows (285,962 of 466,531); the three layouts (flow, cols, index) are all in this wave, so the parsers are written once and reused |
| 2 | union-ny, union-in, union-il, union-mn, union-md, union-ri, union-wv, conf-fl, conf-tx, conf-ga, conf-sc, conf-md | partial sources or a source to resolve first (New York volume map, Indiana volumes) |
| 3 | union-mi, union-de, union-us, conf-va, conf-al, conf-ms, conf-tn, conf-ar, conf-cs-staff | the open record is thin: source search is most of the work and the gap is registered |
| 4 | roster-index, roster-qa, roster-gettysburg-lists, roster-app | `roster-gettysburg-lists` and `roster-qa`'s second-reading test can start at once; the index and the app need unit files |

### 5.3 Effort (Modelled; the basis is PLAN.md 5.2: 150,000 tokens and 2 agent-hours for the first regiment of a source family, 12,000 tokens and 6 agent-minutes for each further unit)

| group id | agent-hours | tokens (million) | OCR text to fetch (MB gz) | largest transient djvu.xml (MB) |
|---|---|---|---|---|
| union-me | 7.4 | 0.62 | 4.7 | 60.0 |
| union-nh | 2.4 | 0.20 | 2.6 | 0.0 |
| union-vt | 3.1 | 0.28 | 1.5 | 70.8 |
| union-ma | 6.4 | 0.59 | 8.2 | 0.0 |
| union-ri | 4.6 | 0.37 | 1.9 | 4.2 |
| union-ct | 4.8 | 0.40 | 4.6 | 53.0 |
| union-ny | 13.8 | 1.48 | 17.3 | 17.4 |
| union-nj | 3.5 | 0.33 | 3.4 | 81.4 |
| union-pa | 10.2 | 1.13 | 13.2 | 106.2 |
| union-de | 2.2 | 0.17 | 0.6 | 6.6 |
| union-md | 2.6 | 0.22 | 2.7 | 48.4 |
| union-wv | 4.4 | 0.35 | 2.3 | 27.6 |
| union-oh | 5.9 | 0.53 | 11.3 | 65.1 |
| union-in | 2.7 | 0.23 | 6.2 | 53.2 |
| union-il | 2.3 | 0.19 | 4.0 | 49.0 |
| union-mi | 5.2 | 0.44 | 6.7 | 22.0 |
| union-wi | 2.6 | 0.22 | 5.1 | 63.4 |
| union-mn | 2.2 | 0.17 | 4.4 | 51.0 |
| union-us | 6.3 | 0.67 | 12.3 | 0.0 |
| conf-nc | 6.1 | 0.64 | 5.9 | 0.0 |
| conf-la | 3.7 | 0.35 | 9.5 | 0.0 |
| conf-va | 22.5 | 2.16 | 2.2 | 13.0 |
| conf-sc | 7.8 | 0.67 | 0.6 | 0.0 |
| conf-ga | 10.5 | 0.99 | 1.3 | 2.2 |
| conf-al | 7.9 | 0.68 | 3.5 | 0.0 |
| conf-ms | 3.3 | 0.31 | 1.4 | 0.0 |
| conf-fl | 2.3 | 0.19 | 0.4 | 15.3 |
| conf-tn | 2.3 | 0.19 | 0.2 | 0.0 |
| conf-tx | 2.3 | 0.19 | 2.2 | 10.6 |
| conf-ar | 2.1 | 0.16 | 0.4 | 13.0 |
| conf-md | 2.5 | 0.21 | 0.4 | 0.0 |
| conf-cs-staff | 2.1 | 0.16 | 2.0 | 13.0 |
| **all 32** | **168** | **15.5** | **143.0** | |

The four cross-cutting items are not in this table: **roster-qa** is the largest (PLAN.md 4.4: about 520 pages for 40 strata, 3 to 6 million tokens); for **roster-gettysburg-lists** (about 1.5 million), **roster-index** and **roster-app** (about 1 million each) there is no measured base (guesses, Modelled). PLAN.md estimated 8 to 12 weeks with 3 to 4 agents in parallel for the whole open-source path and this plan has no measured throughput to improve on that; the machine limit is two heavy jobs at once (`tools/horde/bench.sh`), and every table volume is a one-at-a-time 30 to 106 MB transient file.

### 5.4 Rules every engineer follows

Name as printed, never repaired; no presence label; a row is filed to a unit only where the source states the unit (the rest goes to `_other-<source>.jsonl.gz` beside the unit files); an entry that cannot be cut cleanly is a counted defect, not a row; archive.org only, one request at a time, 1.2 s apart, a generic client name, a refused or challenged host is recorded and not retried; OCR text only is kept, the djvu.xml is deleted after its run, about 1 GB at most per item; never open a modern compilation or a lending-restricted item; the copy audit (no file mentions how the data was made).

### 5.5 Gates

R-G1 names, R-G2 dates, R-G3 reading of the remark (here: the cut of the entry), R-G6 locator, R-G7 conservation, R-G8 no invented row, R-G9 independent sample (PLAN.md section 4.3 and 4.4, unchanged; none is lowered). On the new format R-G6 is `verify_unit.py` (V1 to V3 and the ledger hash), R-G7 is the per-unit comparison with the earlier CSVs, R-G8 holds by construction (a row exists because a text token sequence exists at its offset). R-G1 to R-G3 and R-G9 need the sample: 299 rows with zero errors give an upper bound of 1.0 percent (one-sided 95 percent Clopper-Pearson); 628 rows with at most two errors per stratum. The sample is not run in this pass.

---

## 6. What the prototypes show (Measured, 13 November 2026)

Scripts: `pipeline2/proto_flow_moore.py` and `pipeline2/proto_cols_vt.py`; texts pinned in `data2/sources/NC-MOORE-1882.json` and `VT-ROSTER-1892.json`; outputs kept outside the tree in `tmp/library/rosters/_proto/`.

**Flow: 26th North Carolina, Moore vol. 2 (`rosterofnorthcar02nort`).** The section of 155,000 characters is cut into 1,737 rows by one rule (an entry head is a name followed by a rank word, `e.` or `cm.`; a line without a head continues the entry above; a line with two heads is cut). All 1,737 rows pass V1, V2, V3 and V4. The earlier CSV has 1,954 rows for the regiment: the prototype's rule loses rows where a garbled initial letter (`I<:irkland`) hides a head and glues entries, and in at least one place a name that wrapped lines ("p. and k." then the next name) is mis-cut; both are the parser's, not the format's, and the second reading by the earlier CSV is how the production parser is tuned. 468 rows have a printed remark that names Gettysburg.

**Cols: 10th Vermont, Revised Roster (`cu31924080774148`).** The 70.7 MB `djvu.xml` was fetched once, and the 28 leaves of the regiment (25,423 words) were aligned to the search text: 25,422 aligned, 1 not. 1,031 rows were built from the word boxes (name column, then the cells of the row by the vertical centre of its name line). All 1,031 pass V2 (813 of them need the leaf-bound step-over: the cells are separate text blocks) and V3. V1 fails for 149 names (14.5 percent) because the prototype lets a rank heading in the name column (`-Sergeants.`, `Hospital Stewards.`) join the name above; the production parser reads such a line as the carried rank (`rk`). A first version of the prototype attached the remarks of the first row of a page to the second row (a cut at the wrong vertical position); V2 did not notice. That is the reason the sample stays a gate and the reason each table parser must keep the residence and the name of a row on the same vertical band (a check built into the parser, with the count reported).

**What this does not show.** Only two layouts of about nine; no Confederate state but North Carolina; no artillery or cavalry; no source from the Internet Archive without a hocr text file (the fallback `xml_text.py` was written, not run on a real item); the real speed of a 100 MB word-box volume under the machine lock (the Vermont run took 1 second of CPU for 28 leaves; the 70.7 MB file downloaded in 5 seconds).

---

## 7. Second reading of the text layer (G02)

*Update 14 November: the page-image route is no longer untested; see section 9.5.*

The Florida rolls lose 6.1 percent of their names, the Warren roll about 3 names in 5 on a page, Bates the muster year on 2,039 pages (Documented, the PA README): the text layer is one ABBYY reading. A second reading of the page images is needed where a name or a date is lost. The route is a work item of `roster-qa` and is untested: a pip-installable CPU OCR whose models ship in the wheel (`rapidocr-onnxruntime` is the first candidate), run on 20 known pages and compared with the printed page before any use; page images are fetched transiently from `https://archive.org/download/<id>/page/nN_w1500.jpg` or the IIIF service and never stored. A row whose name the text layer lost stays out of the file (no empty-name row, no invented name) and is counted in the unit's report; the second reading can add it only with its own locator.

---

## 8. Gaps, decisions and owner steps

**Evidence-Gap Register entries proposed** (request note `GOVERNANCE/horde/requests/bt-rosters-register-gaps.md`): no open roll for the Regular Army enlisted men; Virginia (G11) at the unit level; Georgia, Alabama, Mississippi, Tennessee, Arkansas, South Carolina volumes I and III; Michigan Record of Service volumes; Delaware rolls; New York Registers not on the Internet Archive; Maine 1864-65 roster (G03); contested 20th Maine participants against strength (G04); Confederate dead reburied in Richmond (C15); the second-reading route (G02).

**Decisions made here** (appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` as DD-ROS-01 to DD-ROS-06; delegated, reversible, none is an owner decision): no presence label in the data; `roster2/2` and gzip; the unit list; the disposition of `rosters/data`; the New York route; the base text. No requirement is narrowed: the rosters stay complete wherever a source exists and the gap is registered where none does.

**Owner steps (written, not done)**: (1) allow `museum.dmna.ny.gov` and `nysmm.org` in the cloud environment if the New York Registers are wanted from the museum; (2) download the Digital Maine files in a browser (G03); (3) decide whether the Delaware and Georgia image hosts are added and a page-image reading route is used (G02); (4) decide whether the 1931-37 Massachusetts volumes are accepted as public domain by their Internet Archive flag (the ledger records the flag and the 2027 term question); (5) after the new files pass their gates, whether `rosters/data/_pre_audit` and `rosters/data/C-NCLA/work` (192 MB) are removed from the tree.

**Run at the end**: `tools/bt/check_governance.py` once, read only: `ok: true`, no fails (its notes on coverage Q17, Q18 and Q23 report other work's unfinished items). **Not run in this pass**: the independent sample, any parser beyond the two prototypes, `xml_text.py` on a real item, the second-reading test, a browser, a timing measurement, a real-GPU or phone check.

---

## 9. Status, run order and conventions (14 November 2026)

Written by the planning step on its fourth start. The machine restarted several times since 20:44 on 13 November (about every 40 minutes to 2 hours, `GOVERNANCE/horde/CAMPAIGN.md`) and each restart runs the planning step again and walks the item list from the top. Sections 0 to 8 are the planning-run text of 13 November and stay as written, except for the corrections in 9.7; this section says what has happened since and governs where it differs. Nothing is narrowed: every unit, source and gap of sections 2 to 8 stands.

### 9.1 What exists (Measured: `pipeline2/build_index.py`, `build_index.py --lint`, the stored verify logs, the four reports)

| item | unit files | lines | raw bytes | gzip bytes | sidecar bytes | report / pointer | `verify_unit.py` | open |
|---|---|---|---|---|---|---|---|---|
| union-me | 14 of 14 | 33,105 | 1,883,895 | 581,270 | 59,083 | yes / yes | 15 files, 0 name and 0 page defects (the report) | EG-ROS-ME-01 to -07 |
| union-nh | 4 of 4 | 6,992 | 1,570,341 | 331,878 | 74,468 | yes / yes | `--all` 0 and 0 (the report); 23 node tests pass (the report) | EG-ROS-NH-01 to -04 |
| union-vt | 11 of 11 | 16,854 | 1,893,438 | 478,529 | 359,789 | yes / yes | 11 of 11 ok in the stored log | EG-ROS-VT-01 to -06 |
| union-ma | 24 of 24 | 33,748 | 6,235,177 | 1,208,257 | 416,687 | no / no | 24 of 24 ok in the stored log | pointer file, rights, reconciliation, report, gaps |
| **all** | **53 of 640** | **90,699** | **11,582,851** | **2,599,934** | **910,027** | | | |

`build_index.py --lint`: 0 defects, 5 warnings (the Massachusetts pointer file does not exist yet). The independent sample (R-G9) has not been run on any item. 587 units have no file.

Measured line sizes (bytes a row line, whole file): 125.0 on average; 41.3 percent of the lines are 90 bytes or less (Maine 98.6 percent at 53.1, Vermont 24.9 at 110.6, Massachusetts 0.0 at 184.1, New Hampshire 9.4 at 214.8). The aim of about 90 bytes holds for index lines and not for sources that print service histories; remarks as printed are never cut (Law 1, DD-ROS-02). Size rule, Modelled again with the measured numbers: the whole set is 481,000 to 860,000 lines by the planning model (more where one man is printed by several sources: Maine has 2.4 lines per earlier row), that is 60 to 107 MB raw at 125 bytes, so the files stay gzipped (DD-ROS-03); gzip measured 22.4 percent of raw gives 13 to 24 MB, and the sidecars (10 bytes a line) add 5 to 9 MB.

### 9.2 How the workflow runs this plan, and what follows (Inferred from `tools/horde/workflows/bt-rosters.mjs`, the cap of concurrent agents in the workflow reference, and the file times)

* The planning step returns the work items. Each returned item gets a build engineer, then up to two independent reviewers (each followed by a fix engineer when the reviewer finds a defect); then an Integrate step builds the index and the page. The workflow caps concurrent agents at CPUs minus 2, which is **two** here: Maine (20:00 to 20:51) and New Hampshire (to 21:27) ran first and Vermont and Massachusetts took their places.
* A restart starts the planning step again and walks the returned list from the top. A finished item that is returned again costs a build and a review (about a quarter of an hour of one of the two slots) on every restart. **The planning step therefore returns only open items**, computed from files by `pipeline2/open_groups.py` (rule in its docstring; `--json` is exactly the return, `--all` shows every item). A state item is closed when every unit has a file or a recorded gap, the report `rosters/reports/<item>.md` and the pointer file `rosters/sources/<item>.json` exist, and `GOVERNANCE/horde/ws-rosters/<item>/CLOSED.json` is the last file written. Closed means built as far as the sources read allow with every gap named; it does not mean complete and it does not mean sampled.
* **Run order** (`RUN_ORDER` in `work_items_data.py`, 34 open items): Massachusetts first (its files exist), the first independent sample second (its findings change the parsers of everything after it), then long and short items alternate so that one slot is not blocked for hours while the other idles: conf-nc, union-pa, union-wi, union-ct, union-oh, union-nj, conf-la, union-ri, union-ny, union-md, union-wv, union-in, union-il, union-mn, conf-fl, conf-tx, conf-va, conf-md, conf-sc, conf-ga, roster-gettysburg-lists, then the thin-record items union-mi, union-de, union-us, conf-al, conf-ms, conf-tn, conf-ar, conf-cs-staff, and last the second rounds of union-me, union-nh and union-vt (depth for units that already have names comes after first-pass coverage of the units that have none). roster-qa returns again at the end of the list whenever new items have closed. roster-index and roster-app are not returned: the Integrate step does them (`build_index.py` already writes `data2/INDEX.json` and `rosters/status.json`).
* Items stay resumable: an engineer writes each unit file as soon as it verifies, appends a progress line per milestone, and a restarted engineer continues from the files (`open_groups.py` and `build_index.py --group <item>` show where).

### 9.3 Conventions fixed by the first four items (every item follows them; they are what `build_index.py --lint` and the page expect)

1. **Files of an item.** Unit files `data2/<army>/<state>/<unit>.jsonl.gz` (path in `units.json`); beside them `<unit>.flags.json.gz` (every unit), `<unit>.cells.json.gz` (cols sources, optional), `_other-<source id>.jsonl.gz` (lines whose unit cannot be read, filed to no unit); `<unit>.lists.jsonl.gz` is written only by roster-gettysburg-lists (9.2, DD-ROS-08). Ledger `data2/sources/<source id>.json` (`fetch_text.py`). Tracked pointer file `rosters/sources/<item>.json`, form `roster2-sources-pointer/1`: `work_item`, `sources[]` (`source_id`, `text_id`, `identifier`, `title`, `year`, `page_url`, `files[]` with role, name, bytes, sha256 and url, and `rights: {basis, evidence}`, where the evidence holds the item's own `ia_date`, `ia_possible_copyright_status`, `ia_access_restricted_item`, `ia_licenseurl`, `ia_contributor` and a quote of the printed imprint with its offset; `build_index.py` reads `rights.basis` for each text id), `derived_texts`, `blocked`, `access_rules`; the basis "public domain (United States publication before 1929)" only where that is true. Manifest `tmp/library/rosters/MANIFEST-<item>.json`. Report `rosters/reports/<item>.md`. Diagnostics, differences with the earlier CSVs and proposed register entries under `GOVERNANCE/horde/ws-rosters/<item>/`. Gaps as `G-<ST>nn` lines in `rosters/GAPS.md` and proposed entries `EG-ROS-<ST>-nn`; delegated decisions `DD-ROS-<ST>-nn` appended to the decisions file; one progress line per milestone; `CLOSED.json`.
2. **Flags sidecar `roster2-flags/1`.** Keys `f`, `u` (unit key), `n` (rows of the unit file), `codes` (the legend of that file: the codes differ between sources, so a reader shows the legend of the file), `ocr_uncertain` (row numbers), `on_rolls_july_1863` (`yes` and `no` from printed dates only, with its rule and basis in the file; every other row is unknown), optional `normalised_names`, `head_kinds`, `errata`, `unit_file_raw_lines_sha256`. Derived marks never go into a row (DD-ROS-01): the build prompt's wording about a normalised name and `ocr_uncertain` "in the line" is superseded by this (DD-ROS-NH-01, -02). The cells sidecar `roster2-cells/1` (`rows`) carries the words of each line cell by cell in page order where the text layer lists a table row's cells in another order (Vermont flag O).
3. **Lines.** A printed line whose name the text layer lost is not written (no empty-name row); it is listed with its text in the diagnostics and counted in the report (Vermont: six). Cross-reference lines ("See ...", "Same") stay as lines and are marked in the flags file, never merged or dropped. A row is filed to a unit only where the source states the unit.
4. **Report** in the section order of `reports/union-vt.md`: 0 summary, 1 lines per unit against the strength (baseline order of battle; "men who served" where the source prints an aggregate), 2 the unit files and flag codes, 3 sources and rights, 4 what was checked and what was not run, 5 anomalies, 6 gaps. Every number is computed by a script kept in `pipeline2/<item>/` (for example `make_report.py`), never typed.
5. **Closing an item**: `python3 -I pipeline2/build_index.py --lint` (no defect), `pipeline2/verify_unit.py` on the item's files (0 V1 and 0 V3), the copy-audit search of the files (a printed word such as Claude in a name field passes under DD-STG-02; the same word in a remark, rank or header is a hit to list in the report), `CLOSED.json`. A per-item node test is optional (`app/tests/roster-union-nh.test.mjs`, 23 tests, is the example); the Integrate step adds generic tests over `INDEX.json`.
6. **Texts.** 202 of the 212 cited Internet Archive items have the three hocr files; the 10 without are cited by union-mi (MI-GETT-1889), union-md (the 1898 Maryland roster `cu31924092925134`, 23 MB of word boxes), union-ri (RI-BATT-A-1904), union-de (DE-SEVILLE-1884), union-wv (WV-LANG-1895), union-pa (PA-CEM-1867 second copy), union-ct (CT-20TH-1886), conf-tx (one of three Polley copies) and conf-va (VA-FIELDOFFICERS-1912, VA-IRBY-1878); `xml_text.py` derives their text and has not yet been run on a real item (the first engineer to need it tests it and says so).

### 9.4 Toolkit (reuse, do not rewrite)

`r2lib.py` (format, writer, reader, verifier), `fetch_text.py` and `xml_text.py` (texts and ledger), `verify_unit.py`, `build_index.py` (`--write`, `--lint`, `--verify`, `--group`), `open_groups.py`, `page_image.py` (9.5). Flow sources: `parse_nh_ayling.py` with `nh_*.py` (heads, reviewed overrides, flags, summary check, reconciliation), `union_ma/` (sections per unit, cuts, dates, flags), `proto_flow_moore.py` (Moore, North Carolina). Cols sources: `union_vt/` (one 70 MB word-box file fetched once, aligned leaves cached, geometry rules, rows asserted before writing, flags and cells, report) and `union_me/` (table helpers `mtable.py`, positional text `pos_text.py`, an index parser, a returns parser, a participants-list parser, `assemble.py`). A new cols parser starts from `union_vt/` or `union_me/`; a new flow parser from `union_ma/` or `parse_nh_ayling.py`.

### 9.5 Page images: the route that works (replaces the untested route of section 7)

Refused by the proxy (Measured by the Vermont and New Hampshire engineers, 13 November): `archive.org/download/<id>/page/nN_wW.jpg` (redirects to a data host), `iiif.archive.org`, the zip-member route. Works (documented in the docstring of `pipeline2/page_image.py`, measured by its author on 14 November, and **re-run once by the planning step**: item `appendixdofannua00main` (ME-APPD-1861), leaf 100: 30.7 MB PDF through the cors endpoint, 598 of 604 leaves in the PDF and the leaf found through the scan data, page rendered at 200 dpi and read by tesseract (106 tokens of four letters or more, 68.9 percent of them in the pinned leaf, `right_page` true), 6.2 s wall and 2.1 s of CPU; the rendered page was looked at with the Read tool: printed page 144, legible names and columns; the PDF and the image were deleted afterwards): the item's text PDF through `https://archive.org/cors/<id>/<id>.pdf` (served by archive.org itself; 2.5 MB for a 170-page book, 67 MB for the Vermont volume of 886 leaves; Range is ignored, so the whole file comes), one page cut out with `pdftoppm`, read with `tesseract 5.3.4` (installed here, about 1.2 to 1.5 s of CPU a page); `page_image.py page TEXT_ID LEAF` does it and compares the read with the pinned text; the PDF is deleted after use (`page_image.py drop`). The rendered page can be looked at with the Read tool: that is the independent reader of the sample (R-G9) and tesseract is the bulk second reader. Limits: the PDF may have fewer pages than the item has leaves (here 6 fewer; the scan data maps them); a 2,039-page re-read of the Pennsylvania date column is about 50 minutes of CPU and goes through `tools/horde/bench.sh` after a 20-page test; a sideways printed page (the New Hampshire Adjutant General reports) needs an orientation test that nobody has run. The owner step "add image hosts" is no longer needed for the sample; it stays for the Delaware and Georgia image hosts.

### 9.6 What the four items leave open (their tails)

* **union-ma**: pointer file and rights note (the 1931-37 imprint question, owner step 4), `MANIFEST`, reconciliation with `data/NE/massachusetts`, the three batteries that match no OR battery (G-NE02), report, gaps, `CLOSED.json` (the item is returned first).
* **union-me** (round 2, last in the list): EG-ROS-ME-01 to -05 (1898 casualty and special-duty lists, 1861 muster-in returns, Appendix I of 1863, unreadable-unit lines); -06 Digital Maine is an owner step; -07 is roster-qa.
* **union-nh** (round 2): EG-ROS-NH-01 (the Register of Commissioned Officers as a segment), -02 and -04 (page reads), -03 (sideways Adjutant General reports: test a rotated read).
* **union-vt** (round 2): EG-ROS-VT-05 (1866 report as a second reading), -01 and -02 (six lost names, damaged dates), -03 (prose notes); -04 (no list of men present) is roster-gettysburg-lists; -06 is roster-qa.
* Every closed item: R-G9 (roster-qa) and the statements of presence that no roll prints (roster-gettysburg-lists).

### 9.7 Corrections to sections 0 to 8 (the earlier text is left as written)

* Header paragraph: 53 units have files now (9.1); the unit files are still gzip `roster2/2`.
* 3.5: the index is `data2/INDEX.json` and `rosters/status.json`, written by `build_index.py`; the sidecars `flags`, `cells` and `lists` are listed per unit.
* 5.1: 34 items are returned while nothing else is closed: 29 state and army items in round 1 (the 28 not started and union-ma), the second rounds of union-me, union-nh and union-vt, roster-qa and roster-gettysburg-lists; roster-index and roster-app are the Integrate step. The report of an item is `rosters/reports/<item>.md` (not `GOVERNANCE/horde/ws-rosters/<item>/report.md`).
* 7 and 8 (owner step 3): the page-image route is 9.5; hosts for it are not needed.
* Connecticut: the "Record of Service of Connecticut Men" in the Internet Archive search (`recordofserviceo00john` and copies, 1889) covers the Revolution, the War of 1812 and the Mexican War (its own title page text in the item metadata), not 1861-65; the Civil War rolls are the 1864 and 1869 Catalogue of Connecticut Volunteer Organizations (CT-CAT-1864, CT-CAT-1869), which the item uses.
