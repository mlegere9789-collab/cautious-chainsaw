# Medical evidence and hospital scenes: plan (owner addition OA12)

Written 2026-11-14 by the planning step of the workstream `bt-medical`. It governs the 22 group passes that follow and the integration step after them. Files beside it: `groups.json` (the 22 groups, machine form), `GROUPS.md` (the same, readable), `SITES-CANDIDATES.json` (the site inventory scan), the seed rows `<group>.jsonl`. One level up: `../SOURCES.md` (the source ledger), `../sources.json` (the registry the validator reads), `../sources-remote.json` (archive.org records fetched on 2026-11-14). The tools are in `tools/bt/medical/`.

**What this step ran and what it did not** is in section 11. In one line: the inventory, the source registry (171 sources, 222 local files, hashes checked), 18 texts downloaded and verified against archive.org's md5, the validator with an 88-check self-test, 79 seed rows that pass it, the 22 groups, the evidence contract and the scene plan were done; no group has been worked beyond its seed rows, no page image or picture was viewed, and nothing was drawn.

## 0. Quick start for a group engineer

1. Read your group in `GROUPS.md` (or `groups.json`): scope, the questions your rows answer, topics, kinds, local and to-acquire sources, what the scenes take from you, the conflicts and gaps expected.
2. Look at what is local: `../SOURCES.md` section 3 and the ledger (section 7), and `tmp/library/medical/`. Acquire what you still need from section 4 (priority A first). Download once, check the md5 against `../sources-remote.json`, read the title page and write the edition into the ledger row:
   ```
   mkdir -p tmp/library/medical/<SOURCE-ID> && curl -sS -o tmp/library/medical/<SOURCE-ID>/<file> https://archive.org/cors/<archive-id>/<file>    # one request a second
   printf '| %s | <SOURCE-ID> | <class> | no | <edition read from the title page> | tmp/library/medical/<SOURCE-ID>/<file> | %s | %s | public domain (US publication before 1929); the OCR text is machine output of the scan | <url> | <group> |\n' "$(date +%F)" "$(sha256sum tmp/library/medical/<SOURCE-ID>/<file> | cut -d' ' -f1)" "$(stat -c %s tmp/library/medical/<SOURCE-ID>/<file>)" >> docs/battle-theatre/medical/SOURCES.md
   ```
   A source that is in `sources.json` keeps its id; a new source gets a new id by its ledger row alone (class from the list in `SOURCES.md` section 1). A refused or blocked host is recorded as blocked and not worked around.
3. Find a passage and its offset: `python3 -I tools/bt/medical/validate_evidence.py --locate <SOURCE-ID> "the words" [--file <key>]` prints the character offsets and a page hint. `--template <kind> <group>` prints a skeleton row.
4. Write rows to `docs/battle-theatre/medical/evidence/<group>.jsonl`. Seed rows exist in 21 groups: **keep them, do not renumber, append the next id**; correct a seed row only if you find it wrong, and say so in your REPORT.
5. `python3 -I tools/bt/medical/validate_evidence.py <group>` until it exits 0. Write `<group>.REPORT.md` (what was read, what the rows cover, what is missing) and proposed register entries `GOVERNANCE/horde/ws-medical/proposed-register/<group>-*.md` in the register format (`plan-EG-MED-PLAN-01.md` is an example).
6. Never put a number, rate, name, date or quotation in a row that the quote does not carry. Never use modern medical knowledge as evidence. Where the record is silent, write an open gap row, not a guess.

## 1. What binds

* **The Law** (CLAUDE.md): all 22 requirements and OA01 to OA12 stand in full (cl. 1); where record or physics makes literal 100 per cent impossible the strongest evidence-based reconstruction is built, registered, marked in the product and escalated (cl. 3); nothing is invented (cl. 4): "documented" needs a non-lead source that supports exactly the claim, a verbatim quote matched in the text; a failed lookup is recorded as failed; missing evidence is a visible, marked gap (cl. 7).
* **DEC-OA10-12** (2026-11-13, delegated, reversible). OA12 maps to PDF B.8 (hospitals and the medics paragraph) and gate Q26. The product never claims literal 100 per cent (DEC-003 and cl. 3): what the record documents is drawn as documented, what is inferred as inferred, what is filled in as plausible-procedural, all tier-marked. Evidence base for trauma and treatment: public-domain medical sources and the Park Service hospital records. Treatment is drawn as the period practised it: no sterile technique, no antibiotics, chloroform and ether, amputation by flap or circular method, probes and bullet forceps, lint and water dressings, each item with its source and tier. The hospital layer opens with a content note; **Graphic detail: Documentary (default) or Reduced** (no open wounds, symbols and dressings only), reversible by the owner.
* **DEC-006**: no mention of how the page was made; tier marking of non-documented content stays. **DEC-001..005**: see `decision_log.md`; the PDF defaults of the conflict register stay PENDING OWNER; every alternative stays selectable, **no default is chosen by this workstream**.
* **Copy audit** (FINAL-ACCEPTANCE.md; `tests/real.spec.mjs`): the page body may not contain `AI`, `A.I.`, `Claude`, `Anthropic`, `LLM`, `language model`, `generated`, `automated`, `subagent`, `agent`, `prompt`, nor (in the About text) `accurate`, `historically accurate`, `exactly where`, `verified`. The validator refuses these in every field that may be shipped (E018). Period quotations may contain them ("agents of the Sanitary Commission"): the validator warns (W003) and the product shows the claim and the source, never a quotation containing such a word.
* **The extension contract** (`app/docs/EXT-CONTRACT.md`) for the scene module: tier marks by `tierMark`, nothing before its time and nothing pre-existing given a construction animation, same minute and camera give the same pixels (no `Math.random`, no wall clock), no capping of figures, clean console, everything released in `dispose`, no wording about the making of the page. The page clock counts minutes from 1 June 1863 00:00 local mean time (`tests/real.spec.mjs` `minOf`: 1 July 12:00 is 43,920).
* **Standing owner constraints**: nothing is deployed; no credentials or accounts; public sources only, one request a second; they/them for people whose pronouns a source does not give (quotations keep the source's words).

## 2. What exists (inventory)

### 2.1 In the repository

| asset | what it holds | what it lacks for OA12 |
|---|---|---|
| `app/src/history/casualties.mjs`, `CASUALTIES-NOTES.md`, `data/casualty-sources.json`, `data/engagements.json` | 564 units carry a loss number (21 printed from the PDF B.3 table, 543 procedural shares); the loss solver places 17,574 men in time, 14,553 fall where their unit stands (killed 2,352, wounded 8,902, missing 3,299; the killed and wounded lie down), 3,021 fall while the unit marches and are not drawn; army-level splits of killed, wounded and missing as ranges | **no carry path, no aid post, no hospital, no horse or prisoner event**; "a man who has fallen stays where he fell"; every regimental number is a procedural share, none is a record |
| `structures/hospitals.json` (PDF B.8.5, `seeded_unverified`) | 23 hospital records H-01 to H-23, eight counted conflicts (HC-01 to HC-08), the Letterman roles table, the casualty behaviours, Camp Letterman's printed features, the night-operations note | the sources of most records are weak (HMDB marker transcriptions, Wikipedia, HistoryNet, Civil War News, ECW, Aleteia): the tier rule marks a record documented only when a key outside the weak set is cited, "mechanical only: no source opened to confirm it supports the exact claim" |
| `app/data/structures3d-inventory.json`, `STRUCTURES-3D-NOTES.md` section 5 | the hospital records again; 11 of 23 name a drawn or marked building and get a badge "H" (hollow inside the setup or closing window, solid after, gone after the closing) | H-04, H-09, H-10, H-11, H-14, H-17, H-18, H-22, H-23 and others have no geometry: no tents, no corps hospital, no Camp Letterman |
| `GOVERNANCE/horde/ws-web/nps/extracts/hospitals.md` and `farm-buildings.md` | 35 extracts on hospital sites and 86 on farm buildings from Park Service reports, each with a quote verified letter for letter, a state date, a "use for the July 1863 scene" flag and a tier | no layout positions; counts rare |
| `docs/battle-theatre/BIBLE/plan-clean.txt` B.8.5 (pages 97 to 100) | the Letterman system as animation roles, the hospital table, night operations and working conditions, carrying behaviours, horses; the "medics" paragraph (A.8, PDF page 8) saying the research found no Total War title that shows medics, bearers or field hospitals | most facts rest on weak sources; "stretcher-bearer methods, bandsmen, blankets as litters, wheelbarrows, hospital stewards, 1863 training: no source retrieved" is an open gap |
| `app/data/anim3d/clips.json` (397 entries) | `surgeon_operate`, `orderly_water`, `stretcher4_lift|lower|carry_FL|FR|RL|RR` (12), `carry_litter_front|rear`, `ambulance_load_push|receive`, `limp_help_*` (4), `walk_wounded`, `crawl_wounded`, `lie_wounded_*`, `fall_*` and the work and camp clips of OA11 | all plausible-procedural, "no source acquired" (G-ANIM-16); no clip for dressing, tourniquet, holding the anaesthetic cloth, feeding, carrying a limb |
| `GOVERNANCE/timeline_verified.jsonl` | 691 rows (133 mention a medical word somewhere in the row, many incidentally) | the hospital rows are timeline text, not a medical record |
| `tmp/library/ws9`, `or27`, `web/nps`, `web` | 99 public-domain texts, OR vol. 27 parts 1 to 3, 73 Park Service texts, three Park Service medical pages | see 2.3 |

### 2.2 What the PDF says that must be re-sourced

The hospital table (23 rows) and the medical notes of B.8.5 are usable as a **list of things to look for**, not as evidence. Examples: four operating tables "night and day" under the Spangler forebay "which made the forebay safer for flammable anaesthesia" (the flammability remark is an inference of a lead source; chloroform is not flammable and the sources must say what was given); "surgeons did not wash hands or instruments; gangrene and typhoid spread" (HistoryNet, a lead); "houses marked with red flags" (HistoryNet); Camp Letterman's dates and counts (five sources in conflict, no default). Each is carried as an open gap or a lead row until a non-lead text states it.

### 2.3 Local texts that carry medicine (what each gives)

| source | what it gives | state |
|---|---|---|
| `OR27` part 1: report 16 Letterman (printed pp. 195 to 199), 3 Cuyler (24 to 25), 4 Vollum (25 to 28) | the system at Gettysburg, numbers, orders, the Twelfth Corps' timings, the Ambulance Corps' losses, the depot and the trains day by day, supplies ordered | read for the seed rows; Vollum's day-by-day table not yet used |
| `OR27` part 2: report 427 Guild (p. 326 on), 431 Patterson (p. 364); part 3 correspondence (for example D1547 Cuyler to Hammond, 20 July, p. 730) | the Confederate medical director's report and return; the surgeons left with McLaws's wounded; correspondence on the hospitals | not yet read |
| `LETTERMAN-1866` (pp. 153 to 160 for Gettysburg; the rest for the system) | Letterman's account of the organisation (ambulance corps, field hospitals by division), the transport cut, the orders, the staff, the numbers | read for seeds; the system chapters not yet |
| `JACOBS-1864`, `HOSPSCENES-1864`, `TPIERCE-1889`, `ADAMS-SENTINEL-1863` (31 issues), `GBG-COMPILER-1863` (30), `MA-BURIAL-1863`, `CEM-REPORT-1867`, `CEM-BARTLETT-1874`, `CEM-INDIANA-1865`, `EVERETT-1864` | eyewitness hospital and town accounts; burial; the cemetery | seeds from HOSPSCENES and MA-BURIAL only |
| `ME-GB-1898` and the other state volumes (`NY-GB-*`, `PA-GB-*`, `NJ-TOOMBS-1888`, `MI-GB-1889`, `MN-1ST-1916`, `VT-*`, `OH-8TH-1889`) | surgeons' and hospital narratives by regiment, named casualties | not read for medicine; `ME-GB-1898` has 123 occurrences of surgeon |
| `BL-3`, `SHSP-04/05/06/11/12`, `FREMANTLE-1864`, `ALEXANDER-1907`, `LONGSTREET-1896` | the Confederate side: Imboden on the retreat with the wounded, medical notes | not read |
| `ORSER3-v2` (Official Records Series III vol. 2), `OR-25-1` | the ambulance system's origin (the Surgeon General's letter of 7 September 1862 on "the frightful state of disorder"), Letterman on Chancellorsville | not read |
| Park Service: `NPS-CARE-WOUNDED-GUIDE` (the one document on Civil War medicine), `NPS-BOUNDARY-1988`, `NPS-CLR-1STDAY`, `NPS-HS-MCPHERSON`, `NPS-CLR-ROT-V1`/`V2`, `NPS-CLI-ERR`, `NPS-CLI-PCB`, `NPS-COMMON-PRIDE-1/2/3`, `NPS-HSR-LEISTER-BARN`, `NPS-SLYDER-GUIDE`, `NPS-CLR-CEMETERY`, `NPS-ADHI`, `NPS-GMP-1999-V1`, three web pages | hospital uses of farms and buildings, counts, named cases (Armistead, Sickles), the Camp Letterman site | extracts exist; seed rows from 8 of them |
| acquired by this step: `MSHWR-P1V2-1870`, `-P2V2-1876`, `-P3V2-1883` (and second issues), `GROSS-*` (4 printings), `TRIPLER-BLACKMAN-*` (4), `WOODWARD-STEWARD-1862/1863`, `USSC-GETTYSBURG-1863`, `SOUDER-LEAVES-1864` | the surgical history by region and operation, the manuals, the steward's duties, the Sanitary Commission's own report, a nurse's letters | seeds only |

### 2.4 The sources the task names

| source | present at the start? |
|---|---|
| Letterman, *Medical Recollections of the Army of the Potomac*, 1866 | **present** (ws9) |
| *The Medical and Surgical History of the War of the Rebellion* | **absent**; the three surgical volumes were downloaded by this step, the three medical volumes are planned |
| S. D. Gross, *A Manual of Military Surgery*, 1861 | **absent**; downloaded by this step (four printings: Philadelphia 1861 and 1862, Augusta 1861, Richmond 1862) |
| Tripler and Blackman, *Handbook for the Military Surgeon*, 1861 | **absent**; downloaded (1861 two printings, 1862 third edition two scans) |
| *The Hospital Steward's Manual* (Woodward) | **absent**; downloaded (1862, 1863) |
| Jacobs, *Notes on the Rebel Invasion*, 1864 | **present** (ws9) |
| The surgeons' reports of the Gettysburg hospitals | **partly present** (OR27: Letterman, Cuyler, Vollum, Guild, Patterson, part 3); the corps medical directors' and Surgeon Janes's reports are not local and not found by title search (proposed register entry EG-MED-PLAN-01) |

### 2.5 What the seed run taught (rules for every group)

* The archive.org date is a catalogue date, not an edition: the "1861" Gross item is the second edition of 1862, the other "1861" Gross item is an Augusta printing and a fourth is a Richmond reprint (both Confederate); the "1861" Tripler items are two printings, the 1862 items the third edition. Read the title page and write the edition into the ledger.
* Six Park Service reports (`NPS-CLR-1STDAY`, `NPS-CLR-ROT-V1/V2`, `NPS-CLR-CEMETERY`, `NPS-TPG-COMMEM`, `NPS-HSR-MCCLEAN-BARN`) interleave their columns in the reading-order text; the content-stream text (`raw`) is registered as the default file for them (`source.file` may be omitted). PDF page markers (`=== PAGE n ===`) give the page as `pdf:N`.
* OCR digits: the validator refuses a quote whose digits or spelled-out numbers differ from the text, so an OCR slip cannot be corrected silently; one stands in the seeds as an open gap (Cuyler's "35th instant", `med.gettysburg-statistics.008`). A number that a card will show is confirmed in the second scan of the volume or the page image first (`ocr.corrections`, basis `page-image` or `other-copy`).
* A footnote mark after a full stop ("July 5.9") is not part of a number; a digit touching the quote, or a comma and three digits continuing it, is.
* A quotation across a page break is matched with the running heads left out; a long quotation with a footnote or a figure inside is cut at those places with ` ... `.
* "That battle", "the corps", "it" are resolved only from the document or section named in `source.part` (the report, the entry, the page), never from outside it.
* The NPS teachers' guide and glossary entries are Park Service statements without a printed source: a row says what the guide states and the primary text carries the weight.

## 3. Sources to acquire (verified; details and md5 in `../SOURCES.md` section 4)

All identifiers below were fetched from `https://archive.org/metadata/<id>` on 2026-11-14 (title, date, file, size, md5, sha1 in `../sources-remote.json`); nothing in this list is downloaded yet except where section 2.3 says so.

* **Priority A (the first pass of the groups named needs it):** `USREGS-1861` (Revised Regulations: the Medical Department, hospitals, hospital diet, ambulances), `CSAREGS-1863`, `CHISOLM-1862`, `CSA-SURGEON-GENERAL-MANUAL-1863`, `HAMMOND-HYGIENE-1863` (camp sanitation, diet, hospitals), `TRIPLER-GANGRENE-1863`, `BRINTON-MEMOIRS-1914` (Brinton took the supply train to Gettysburg), `BUCKLIN-HOSPITAL-CAMP-1869` and the Souder letters (local), `STILLE-USSC-1866`, `USCC-1863` (Christian Commission second annual report), `USSC-BULLETIN-V1-1863`, `AMM-CATALOGUE-1866` (the Army Medical Museum's specimens with case notes, 2.9 MB), `NPS-SEM13-ESSAY5` ("War is a hellish way of settling a dispute": Letterman and the path of care from Manassas to Camp Letterman; 1,643,678 bytes; cited as NPS-Essay5 six times by the PDF and never read in full by this project).
* **Priority B:** `MSHWR-P1V1-1870`, `-P2V1-1879` (medical volumes: camp diseases, typhoid, dysentery, scurvy), `HAMMOND-ESSAYS-1864`, `CHISOLM-1861`, `CHISOLM-1864`, `WOODWARD-CAMP-DISEASES-1863`, `BROCKETT-CAMP-1866`, `USSC-BULLETIN-V2`, `USSC-DOCUMENTS-1866`, `OTIS-HIPJOINT-1867`, `NPS-SEM13-ESSAY1`, `NPS-SEM13-ESSAY6`.
* **Priority C:** `MSHWR-P3V1-1888`, `OTIS-EXCISION-FEMUR-1869`, `HOSPSCENES-1864-ALT` (a second scan for digit checks).
* **Library of Congress pictures** (10 records found by a www.loc.gov search; titles and call numbers are the search result, images not fetched or viewed): General Hospital Gettysburg August 1863, the Sanitary Commission and Christian Commission at the general hospital, a group of wounded with two nurses before tents, the Waud drawing of the Seminary as a hospital, the Seminary, Pennsylvania College and the German Reformed Church as hospitals (later views: never an 1863 layout), the Sanitary Commission headquarters. A later date is a later view.
* **Channels** the groups search themselves: Chronicling America (July to November 1863 reports from Gettysburg), the npshistory.com seminar index pages and structure reports, archive.org title and subject search, catalog.archives.gov record groups of the Surgeon General's Office.
* **Not acquirable here:** HathiTrust (bot block, not retried); Coco, *A Vast Sea of Misery* (in copyright, owner-only); the Adams County Historical Society and Gettysburg College holdings (not reachable, a written request is the owner's); HMDB, Wikipedia, HistoryNet, Civil War News, ABT and museum pages (leads only).

## 4. The 22 research groups

Grouping: trauma (3), treatment (7), equipment (1), organisation (4), sites (4, by area), Camp Letterman and burial (2), the numbers (1). Every group has its scope, questions, topics, kinds, sources, scene use, expected conflicts and expected gaps in `GROUPS.md` and `groups.json`. The row counts are what a pass must reach (least) and is expected to reach (aim); a group that cannot reach its least says why in its REPORT and registers the gap, it never pads. **Dependencies are advisory**: all groups run in parallel; a group that depends on another cites that group's rows if they exist when it writes and never waits.

| # | group id | area | rows (least / aim) | depends on | local texts | to acquire |
|---|---|---|---|---|---|---|
| 1 | `wounds-weapons` | trauma | 40 / 120 | - | 9 | 4 |
| 2 | `wounds-regions` | trauma | 60 / 180 | `wounds-weapons` | 6 | 3 |
| 3 | `wounds-limbs-joints` | trauma | 60 / 180 | `wounds-weapons` | 7 | 4 |
| 4 | `triage-first-aid` | treatment | 50 / 150 | `org-union-system`, `org-evacuation` | 9 | 3 |
| 5 | `anaesthesia-analgesia` | treatment | 35 / 100 | - | 7 | 4 |
| 6 | `amputations` | treatment | 60 / 200 | `anaesthesia-analgesia`, `instruments-supplies`, `triage-first-aid` | 9 | 5 |
| 7 | `operations-excision-ligation` | treatment | 35 / 100 | `amputations` | 5 | 4 |
| 8 | `wound-care-splints` | treatment | 50 / 150 | `wounds-regions`, `wounds-limbs-joints` | 6 | 3 |
| 9 | `nursing-diet-ward` | treatment | 50 / 150 | `org-union-system` | 9 | 5 |
| 10 | `infection-complications` | treatment | 40 / 120 | `wound-care-splints` | 7 | 6 |
| 11 | `instruments-supplies` | equipment | 50 / 150 | - | 7 | 6 |
| 12 | `org-union-system` | organisation | 60 / 160 | - | 9 | 5 |
| 13 | `org-evacuation` | organisation | 60 / 160 | `org-union-system` | 8 | 6 |
| 14 | `org-aid-societies` | organisation | 50 / 150 | `org-union-system` | 10 | 7 |
| 15 | `org-confederate` | organisation | 40 / 120 | `org-evacuation` | 14 | 4 |
| 16 | `sites-town` | sites | 80 / 220 | `org-union-system` | 14 | 7 |
| 17 | `sites-west-north` | sites | 70 / 200 | `org-confederate` | 17 | 4 |
| 18 | `sites-east-southeast` | sites | 80 / 220 | `org-union-system`, `org-evacuation` | 13 | 4 |
| 19 | `sites-south-southwest` | sites | 70 / 200 | `org-union-system`, `org-confederate` | 14 | 4 |
| 20 | `camp-letterman` | after | 60 / 180 | `org-evacuation`, `burial-practice` | 13 | 7 |
| 21 | `burial-practice` | after | 50 / 140 | `camp-letterman` | 15 | 3 |
| 22 | `gettysburg-statistics` | numbers | 50 / 140 | `org-union-system`, `org-evacuation`, `org-confederate` | 10 | 5 |
| | **22 groups** | | **1,200 / 3,490** | | | |

How the task's research areas map to the groups: wound classes by weapon and by region with frequencies (1, 2, 3); the treatment catalogue: triage (4), anaesthesia (5), operations including the amputation methods (6, 7), haemorrhage control (4, 6, 7), probing, extraction, splints and dressings (8), nursing and diet (9), infection under its period names (10); organisation: the Letterman ambulance and hospital system, dressing stations, division and corps hospitals, stewards, nurses, contract surgeons (12, 13), the Sanitary and Christian Commissions (14), the Confederate medical service (15); instruments and supplies (11); the documented hospital sites by area (16 to 19) with layout, capacity over time, staff and named cases; Camp Letterman afterwards (20); burial practice (21); and the counts and their conflicts (22).

## 5. The evidence contract

### 5.1 File, row and id

One file per group: `docs/battle-theatre/medical/evidence/<group>.jsonl`, UTF-8, LF, one JSON object per line, blank lines ignored. A row is **one supported statement with one quotation**. The id is `med.<group>.<nnn>` (lowercase letters, digits, hyphens in the group; three to five digits), unique over all groups; the group in the id is the file's group. Ids are never reused or renumbered.

### 5.2 Fields

| field | required | what it is |
|---|---|---|
| `id`, `group` | always | as above; `group` repeats the file's group |
| `topic` | always | dotted lowercase words; the first word is one of the group's topics in `groups.json` (or `misc`) |
| `kind` | always | one of the 15 kinds of 5.7; it fixes the `data` fields |
| `claim` | always | one sentence of 20 to 500 characters saying exactly what the quotation supports, in the words of the source, period terms as the sources use them; no number the quotation does not state; none of the words of 1 (copy audit) |
| `tier` | always | `documented`, `inferred`, `plausible-procedural`, `open gap` (5.3) |
| `source` | always | `{id, edition, file?, part?}`: the id of `sources.json` or the ledger, the **edition statement of the printing quoted**, the file key for a source with several files (OR27: `pt1`, `pt2`, `pt3`; a newspaper: the issue date; Park Service reports with a `raw` text: `raw` is the default), `part` the report, entry or section that gives "that battle", "the corps", "it" their meaning |
| `page` | always | a printed page (`195`, `154-155`, `xiv`), `pdf:N` for a Park Service text (the PDF page index; the validator checks it), or `n/a` where a source has no usable page |
| `quote` | documented, inferred (optional otherwise) | verbatim from the local text; 25 letters and digits at least, 1,500 characters at most; pieces joined by ` ... ` (or an ellipsis character) each of 12 letters and digits at least |
| `offset` | with a quote | `{start, end}`: character offsets of the quotation in the local file read as UTF-8 with `newline=''`, start inclusive; `--locate` prints them; the validator accepts a slack of 8 characters |
| `data` | per kind | the structured payload of 5.7 |
| `value`, `value_basis` | when the quotation states a number or range | `{kind: count|number|range|fraction|text|date|list, value|min,max, unit}`; basis `stated`, `stated-range`, `read-from-table` (each number is checked against the quotation) or `computed`, `sum`, `ratio`, `estimated` (never on a documented row) |
| `date_scope` | for `site-count`, `site-event`, `case`; else when the claim is bound to a time | `{from, to, granularity, note}`: `yyyy`, `yyyy-mm-dd` or `yyyy-mm-ddThh:mm` local time as printed (the Union and Confederate clocks differed by about 20 minutes: no correction); the page clock converts later |
| `site` | optional | ids of hospital records (`H-06`) or structures (`bld-spangler-farm`) of this repository; an unknown id fails |
| `basis_rows`, `inference` | inferred: required | ids of documented or inferred rows the step rests on; the step written out (30 characters or more) |
| `basis` | plausible-procedural: required | what the procedure follows and what is the builder's choice (20 characters or more) |
| `gap` | open gap: required | `{needed (20+ characters), acquire?, proposed_register?}` |
| `conflicts`, `conflict_set` | when sources disagree | `[{with: row id, kind: number|date|practice|identity|sequence|place|other, note}]` and `cs.<name>`; a conflict set needs two rows or more; **every reading is a row, none is the default** |
| `ocr` | when a digit or word of the text is misread | `{corrections: [{from, to, basis: page-image|internal-consistency|other-copy, image?}]}`: `from` occurs in the quotation, a `page-image` correction names the image |
| `scene` | always | `{use: show|context|none, may_show, min_setting: reduced|documentary, reduced_form, clips?, props?, marked?}` (5.6) |
| `notes` | optional | internal, never shipped |

### 5.3 Tiers

* **documented**: a non-lead source states exactly the claim; the quotation is in the local text. Source classes that may support it: `official-report`, `official-history`, `period-manual`, `memoir-primary`, `contemporary-print`, `institutional-history`, `regimental-history`, `nps-report`, `photo-record`. A single witness is documented **as that witness's statement** and the claim says so ("Letterman writes", "Cuyler reports", "the Park Service report says"); an eyewitness figure is never generalised.
* **inferred**: the quotation is a premise; `basis_rows` name documented or inferred rows; the step is written. Example in the seeds: `med.sites-west-north.007` (the Seminary hospital had tents of six iron bedsteads each) rests on three documented rows of the Patriot Daughters' account. `reference-secondary` sources support at most this tier.
* **plausible-procedural**: the builder's choice inside what the record allows; `basis` says what it follows; `scene.marked` must be true when the row is shown.
* **open gap**: what is missing; `gap.needed` says what source would close it; a lead source can support only this tier. A row of this tier with a quotation (an OCR digit that cannot be read) is allowed.

A concealed gap is a violation: a scene that shows something with no row behind it is a defect of the scene.

### 5.4 Quotations, offsets and OCR

The validator folds the quotation and the text the same way (letters and digits only, lower case, accents removed) so that whitespace, hyphenation at line ends, quotation marks and punctuation never decide a match. Order of attempts: exact on the text, exact on the text without running heads (so a quotation may cross a page break), approximate on both within a share of the quotation (`ocr_error_rate` per source, 4 to 7 per cent), then the pieces between ellipses in order within 4,000 characters. **An approximate match never changes a number**: digit runs and spelled-out numbers (one to a million, "twenty-five", "twentyfive") must be equal in the quotation and the text it matched, and a quotation may not begin or end inside a number. A quotation that fails says how near the best passage is.

### 5.5 Numbers, dates, conflicts

Every number in `claim` and every `value` of basis `stated` must be a number of the quotation (digits, or spelled out: "fourteen thousand one hundred and ninety-three" is 14,193; OCR's "1, 995" is read as 1,995 as well). A date in the claim is exempt only when `date_scope` is present. Totals, shares and any figure derived by arithmetic are rows of tier inferred with `basis_rows`. Strengths, casualties, counts and durations are **ranges or single witnesses with their basis**; never an average of sources. When sources disagree, every reading is its own row with its own quotation, the rows share a `conflict_set` and name each other in `conflicts`; the integration step makes the set a selectable scenario with **no default** (the PDF's recommended defaults stay PENDING OWNER). Seeds: `cs.wounded-union-total` (Letterman 14,193 against Vollum 13,603), `cs.wounded-total-both-armies` (Letterman 20,995 against the Park Service guide's 27,000), `cs.ambulance-corps-killed` (the report: 1 officer and 4 privates; the book of 1866: Lieutenant Clark and two privates).

### 5.6 What a scene may show, and Graphic detail

`scene.use` is `show` (a scene may draw it), `context` (a card or panel may state it) or `none`. For `show`, `may_show` says in plain words what a scene may draw **because of this row and no more than the claim supports**; `min_setting` is the lowest Graphic detail setting that shows it: `reduced` (the setting without open wounds: symbols, dressings, tables, bedding, people at work) or `documentary` (the default: wounds, operations, the dead, at the level of a museum exhibit of the period record); a `documentary` row names in `reduced_form` what Reduced shows instead (a covered table, a bandaged limb under a sheet, or `omit`). `clips` are names in `data/anim3d/clips.json` (checked); `props` are lowercase slugs the integration step collects into the request to the figures and structures owners. A plausible-procedural or open-gap row that is shown sets `marked: true`. The hospital layer opens with a content note; no wound is drawn at the Reduced setting; the choice is the viewer's and is a delegated default (DEC-OA10-12 item 6).

### 5.7 Kinds and their `data`

| kind | required `data` | use |
|---|---|---|
| `fact` | none | a statement that fits no other kind |
| `wound-class` | `name_period`, `weapon`, `region` (enumerations: weapons from small-arms-conical-ball to artillery-canister, edged-*, blunt, accident; regions from head to ankle-foot, multiple, unspecified); optional `appearance` | one class of wound as the period named it; feeds `wounds.json` |
| `wound-stat` | `population`, `measure`; the row has a `value` | a count or share (frequency, mortality, totals); feeds the sampling table |
| `treatment` | `name_period`, `category` (triage, first-aid, haemorrhage-control, anaesthesia, stimulant-analgesic, probing-extraction, wound-cleansing, dressing, splint-apparatus, amputation, excision-resection, ligation, trephining, other-operation, nursing, diet, hygiene, cautery-caustic, disease-treatment, transport, other); optional `setting`, `timing` (primary, intermediate, secondary, any) | a treatment or a rule of treatment; feeds `treatments.json` |
| `treatment-step` | `treatment` (an id such as `amputation.flap`), `order` (1 or more), `action`; optional `actor`, `instruments` | one step of a sequence; **only when the source gives the order** |
| `instrument`, `supply` | `name_period`, `use` / `item` | props and stores with the dimensions and quantities a source states |
| `role` | `title`, `duties` | steward, ward-master, nurse, bearer, driver, delegate |
| `org` | `entity` | the system, an order, a count of an organisation |
| `site` | `site_id` (`site.<slug>`), `name`, `side` (union, confederate, both, general) | identity of a hospital site, with `hospital_ids` (H-xx) and `structure_ids` (bld-*) |
| `site-layout` | `site_id`, `item` | where a table, tent, pile, spring or grave stood, as stated |
| `site-count` | `site_id`, `what` (patients, staff, surgeons, nurses, stewards, tents, beds, deaths, operations, amputations, ambulances, wagons, rations, graves, other); `value`, `date_scope` required | numbers over time |
| `site-event` | `site_id`, `event` (opened, closed, moved, captured, evacuated, shelled, burned, inspected, visited, other); `date_scope` required | the dated history of a site |
| `case` | `person` (as printed), `role`; `date_scope` required; optional `unit`, `site_id`, `wound`, `treatment`, `outcome` | a named patient, surgeon, nurse |
| `burial` | `practice`; optional `place` | how and where the dead were buried |
| `scene-practice` | `element` (table, tent, bedding, water, light, waste, kitchen, dead-house, pile, bandage, litter, ambulance, wagon, furniture, sign-flag, ground-cover, other), `description` | a thing a scene shows, with its source |

A complete seed row (`med.org-evacuation.003`, one half of a conflict) is in `org-evacuation.jsonl`; `--template <kind> <group>` prints a skeleton.

### 5.8 The validator

`python3 -I tools/bt/medical/validate_evidence.py <group> | --all | --self-test | --locate | --template | --check-sources | --list-groups`, options `--json PATH` (every row with its issues; **the integration step applies only rows with `ok` true**), `--summary`, `-v`, `--rate`. Exit 0 only when nothing failed; every failure (a bad row, a missing group file, an unknown group, a usage error, a failed self-test) exits 1. A group with no file yet is a warning for `--all` and a failure for that group. Checks (E fails the row, W warns): E002 field shape; E003 id; E004 group; E005 topic; E006 kind and `data`; E007 tier; E008 source (unknown, not local, no ledger line, hash differs, edition missing); E009 quotation missing or too long; E010 quotation not found; E011 a digit or number word differs, or the quotation begins or ends inside a number; E012 offset wrong or missing, PDF page wrong; E013 a number of the claim or value is not in the quotation; E014 inferred without basis, a basis row missing, failed or not documented or inferred; E015 plausible-procedural without basis, open gap without `gap`; E016 conflicts; E017 scene; E018 refused word in a shipped field; E019 lead or secondary source above its tier; E020 dates; E021 value; E022 OCR corrections; W001 approximate match; W002 page hint differs; W003 refused word in the quotation; W007 kind outside the group's list; W008 an OCR correction not read from the page image on a documented row. The self-test builds synthetic texts (hyphenation, running heads, OCR noise, digit slips, footnote marks, a CRLF file, a changed file) in a temporary folder and runs 88 checks, among them a random test of the approximate matcher against a plain dynamic programme and against 80 edited quotations; it reads nothing of the repository and writes nothing to it.

## 6. Hospital sites by area

The task asks for about 35 to 60 sites. The inventory scan (`site_scan.py`; `SITES-CANDIDATES.json`; the per-group tables in `GROUPS.md`) tested 68 name patterns against 165 local texts and counted, per pattern, the texts that put the name within 250 characters of a hospital, surgeon, amputation or wounded word: 62 patterns have at least one local text; six have none (`hankey`, `wolf-field`, `diener`, `conover`, `beitler`, `henry-spangler`: the last has a Park Service sentence the pattern missed). **The scan is an inventory of where to look, not evidence**: counts include OCR noise and ordinary uses of a word (tavern, school, rose). A pattern stands for a site, an area or a road corridor; the expected yield is about 50 distinct sites. Candidates by area group:

* **`sites-town`** (12 patterns): Presbyterian church (PDF H-01), St. Francis Xavier (H-02), Christ Lutheran (the College Church, held from the first day by the I Corps 2nd Division per the Patriot Daughters), German Reformed, Methodist, the Court House (400 Confederates and Union wounded, per the same account), Pennsylvania College, the depot, schools, hotels, warehouses, private houses (the town "one vast hospital", H-22).
* **`sites-west-north`** (19): the Seminary (H-03, H-20), McPherson farm (H-05), Dustman and Schultz houses, Crist, Wible, Leaper and Abraham Spangler properties, Black Horse Tavern, Benner, Hankey, Forney, Pitzer, Bream's mill, Daniel Lady (H-19), Cashtown, Marsh Creek and Willoughby Run, the Almshouse.
* **`sites-east-southeast`** (18): George Spangler (H-06), Granite Schoolhouse (H-07), the II Corps hospitals on Rock Creek (H-11), the XII Corps hospital at the Lightner farm, the Bushman, Diener, Conover, Beitler, Schwartz and Shaeffer farms (H-15, H-17), White Church (H-04), White Run (III and V Corps, H-09, H-10), VI Corps (H-14), Two Taverns, Hanover Road, Culp's Hill rear.
* **`sites-south-southwest`** (18): Weikert (H-08), Trostle (H-13), Hummelbaugh (H-12), Leister (H-16), Frey, Patterson, Codori, Sherfy, Rose, Slyder and Rummel (H-21), the Emmitsburg Road farms, the Round Top aid posts.
* **`camp-letterman`**: the general hospital (H-23).

Rules for a site row: the id is `site.<slug>`; the identity row (`kind site`) names the building(s), the side, the corps or units served, `hospital_ids` and `structure_ids` so that the structures badge and the data agree; units served are written as the sources print them (corps, division, brigade) so that the integration step can link them to the history layer for the carry paths; a layout item has a position in the site's own metres **only when a source states a place or a distance**; the sources' sentences are the layout; a candidate that no non-lead source documents is registered as lead-only, with its source named.

## 7. Scene work plan

### 7.1 What is built after the evidence (the integration step)

From the rows with `ok` true only, as **clean product data** under `docs/battle-theatre/app/data/medical/` (no internal notes, no source-production wording, only the shipped fields of 5.2): `wounds.json` (classes with period names, weapon, region, appearance, tier, source key, the Documentary and Reduced forms, the sampling table over weapon and region with its basis rows, marked borrowed where an Army-wide share is used), `treatments.json` (each treatment with its steps in the documented order, instruments, who performs it, setting, tier, source key, clips), `instruments.json` and `props.json` (every prop slug with the rows it rests on), `roles.json`, `sites.json` (per site: identity, events, counts as ranges with date and basis, staff, layout items with tier, cases, conditions, units served, sources), `flows.json` (the unit to hospital links by time, for the carry paths), `scenarios.json` (the conflict sets as selectable readings, no default), `graphic.json` (the two levels and the content note), `medical-manifest.json` (counts and sha256 of the files and of the evidence report).

### 7.2 The module `src/ext/hospital-scenes/`

An extension under `EXT-CONTRACT.md`, listed in `src/ext/index.mjs` (re-read before each edit: other workstreams add entries). `index.mjs` (`init`, `update`, `dispose`), `model.mjs` (loads the data, answers "which sites are open at minute t", "what does the record say at t"), `scene.mjs` (a **pure function** `sceneAt(siteId, tMin, choices, setting)`: patients with wound class, posture, dressing and place; staff with role, clip and prop; props with type and place; markers for what is a gap; deterministic by a seeded hash of the site and the index), `draw.mjs` (geometry through `host.addSceneHook` for props; no assignment of `host.R.ext`), `panel.mjs` (`registerPanel('field-hospitals', ...)`: the sites open at the clock time, a card per site with its tier-marked facts, counts as ranges, staff, layout, cases, sources, a jump to the site; the reading selector for each conflict set; the Graphic detail control; the content note) and `check.mjs` (pure checks for the gate runner, listed by shell append in `app/docs/GATE-HOOKS.md`). `registerLayerToggle('field-hospitals', ...)` switches the layer; the first switch-on shows the content note (remembered for the visit in a try/catch'd `sessionStorage`; the page works without it). Tests: `app/tests/hospital-scenes.test.mjs` with a fake `ctx` and the real loader as `tests/ext-loader.test.mjs` does; a browser run through the machine lock with software GL (what was seen is looked at in screenshots; no real-GPU timing is claimed).

### 7.3 Principles of a scene

* **Nothing before its time; arrival is a march.** A site exists from its documented opening; its patients arrive by carry paths and ambulance runs from the casualties layer's falls (gate Q26: every casualty event has a carry path to an aid station, a field hospital or burial); the people and tents of Camp Letterman are built up from 10 July as the camp is made, not spawned. A building that pre-existed (a barn, a church) is never given a construction animation.
* **Documented numbers govern what is drawn at a site; the casualties layer's procedural shares do not add or remove patients.** A card shows the range the sources give with its basis; a scene draws one figure per patient up to the low end of the documented range at that minute (DEC-008 as for the casualties), never fewer for performance (no capping without an owner decision), and a mismatch between the flow and the documented count is stated on the card as an open gap. The performance of very large wards (the Spangler range runs to about 2,000) is measured by the crowd owner; it is not a reason to draw fewer.
* **Documented endpoints bind the schedule.** All wounded within the lines were removed before daylight on 4 July (Letterman); the XII Corps had its wounded sheltered, fed and dressed within six hours and its capital operations done within twenty-four hours; the trains left from 7 July (Vollum's table: 1,463 gone before his arrival and 11,425 sent by the 22nd, read from the OCR and not yet confirmed in a second scan); Camp Letterman opens on dates still in conflict (20 or 22 July; the PDF reports tents moved in from 22 to 27 July on the NPS essay, not yet read). Speeds, queue orders and the number of bearers per run are plausible-procedural unless a row states them, and are marked.
* **Treatment is drawn as the period practised it**: no sterile technique, no gloves, no antiseptic, no antibiotics; chloroform or ether on a folded cloth as the manuals describe; a table of boards or a door; the amputation by the flap or circular method in the manuals' order; probes and bullet forceps; lint, water dressings, roller bandages; the pile of limbs where a source says so. A depiction is documented only where a period source states it, inferred where several imply it, plausible-procedural otherwise and then marked.
* **Night is night but never black** (gate Q10): lanterns at the Spangler tables are documented only where a primary or Park Service text says so; the luminance floor applies.
* **Same minute and camera, same pixels**; the choices (conflict readings, Graphic detail) are inputs.
* **Wording**: no text of the module or its data says how the page was produced; displayed strings pass the page copy test; quotations containing a refused word are not displayed (the card shows the claim, the source and the page).

### 7.4 What the scenes need from other workstreams (request notes are written by the integration step, each with its evidence rows)

* **figures**: patient variants (shirt-sleeved or undressed, head dressing, arm in a sling, splinted leg, strapped chest, stump on a pillow; blood and discharge only at Documentary), surgeon and assistants (dress and any apron or badge: **not yet documented**, the groups `instruments-supplies` and `org-union-system` look for it), steward, ward-master, nurse, orderly, bearer, driver, delegate; clips for dressing, tourniquet, holding the anaesthetic cloth, feeding, carrying a limb, writing the register, kneeling beside a patient (none exists; the documented steps are known after the evidence).
* **crowd**: a way for an extension to own an animated figure group with a per-figure state (place, heading, clip, phase, kit class, prop) and to read the figures' count; the extension contract gives a scene hook for geometry, not for figures.
* **structures**: hospital tents with the fly, bedsteads and cots, tables of boards or a door, litters, ambulance and medicine wagons, buckets, lanterns, barrels for limbs, grave headboards, dead house, embalming tent, cook house; the Camp Letterman tent city as a structure group with a build-up schedule; the Spangler forebay and barn as the documented tables' place.
* **history layer**: the unit to corps to hospital link by time (from `flows.json`) so that a fall event gets its carry path; the horse layer is separate.
* **audio**: any hospital sound has no documented source; it is plausible-procedural and off by default until the owner decides (DEC-001 option a applies to labelling).
* **the shell's scenario panel**: the `cs.*` conflict sets as readings; until it takes them the module's own panel carries the selector.

### 7.5 Checks and gates

Pure checks (node, no DOM, no clock) listed in `GATE-HOOKS.md` by shell append: every shown item has a row (Q23); no site, person or prop before its documented time (Q03); every casualty event has a carry path and every carry path ends at a documented site or burial (Q26); the field hospitals show the documented activity in the documented interval (Q26); night luminance (Q10); no `Math.random`; no refused word in any displayed string; at the Reduced setting no wound row with `min_setting documentary` is drawn. Regression: the Virtual Walkthrough and Monuments sections are untouched; `tests/ext-loader.test.mjs` and the four content-side `ext-*` tests still pass. **No gate is set to `passes: true` by this workstream unless it was run and passed; none was run in this step.**

## 8. Registered gaps (proposed; `GOVERNANCE/horde/ws-medical/proposed-register/`)

| id | gap |
|---|---|
| EG-MED-PLAN-01 | reports of the corps medical directors and of Surgeon Janes are not local |
| EG-MED-PLAN-02 | shares of wounds by weapon and region for Gettysburg alone are not yet found; the Army-wide shares are borrowed and marked |
| EG-MED-PLAN-03 | the in-copyright literature on the hospital sites (Coco) |
| EG-MED-PLAN-04 | layouts of the field hospitals; no plan or sketch is local |
| EG-MED-PLAN-05 | OCR digits: a number a card shows is read twice first |
| EG-MED-PLAN-06 | litter and ambulance designs, bearers' methods, dimensions (the PDF's own open gap) |
| EG-MED-PLAN-07 | the Confederate organisation and hospital sites beyond Guild and Patterson |
| EG-MED-PLAN-08 | the day of Cuyler's cumulative figure is misread by the OCR |

Each group adds its own entries (`<group>-*.md`).

## 9. Owner-only steps (written down, not done)

* Purchase or interlibrary loan of Coco's *A Vast Sea of Misery* and a decision on how much of it may be quoted (EG-MED-PLAN-03).
* Written requests to the Adams County Historical Society and the Gettysburg College Special Collections for surgeons' letters and hospital registers; the groups can draft the text; the owner sends it.
* Confirm or change the delegated Graphic detail default (Documentary) and whether the content note needs an explicit acknowledgment.
* Any fee for National Archives records.
* Nothing is deployed by this workstream; the owner publishes.

## 10. Order of work and acceptance

1. **This step**: plan, registry, validator, seeds, groups (done, section 11).
2. **Group passes** (22, in parallel): acquire, extract, rows, REPORT, proposed register entries; `validate_evidence.py <group>` exits 0.
3. **Integration**: `validate_evidence.py --all --json` first; failing rows are reported, not applied; build `data/medical/`, the module, the tests, `HOSPITAL-SCENES-NOTES.md`, `evidence/SUMMARY.md` (rows by tier, sites covered, what is missing and registered), the request notes, the GATE-HOOKS lines.
4. **Verification** by independent readers who re-match the quotations and run the checks.

A group pass is finished when: its rows reach `rows.least` or its REPORT says why not with the gap registered; every row passes the validator; every source it acquired has a ledger row; no lead source supports a tier above open gap; every conflict is carried as a set with every reading; every number that a card will show was confirmed in a second reading (5.2 `ocr`); the REPORT lists what was read, what was not, what is missing; proposed register entries exist for the gaps. The product is **not** reported complete until the Section Z checklist is true and `check_governance.py` passes.

## 11. What this step did and did not do

**Done and checked**: the inventory of sections 2.1 to 2.5; `sources.json` with 171 sources and 222 local files, each file hashed, `--check-sources` exits 0; 18 texts downloaded from archive.org with md5 equal to the archive.org record (MSHWR three surgical volumes and three second scans, Gross four, Tripler four, Woodward two, the Sanitary Commission's Gettysburg report, Souder), their title pages and the surgical volumes' chapter lists read; 25 archive.org candidates, three Park Service items and ten Library of Congress records listed with verified metadata or search results; `validate_evidence.py` with an 88-check self-test that passes (the approximate matcher was checked against a dynamic programme and a random edited-quotation test; the numpy and the pure-python views agree); 79 seed rows in 21 group files (77 documented, 1 inferred, 1 open gap) of which all pass `--all` (14 s, 7 s of CPU); `groups.json` (22 groups, every source id checked against the registry); `SITES-CANDIDATES.json`; eight proposed register entries; a node test `app/tests/medical-evidence.test.mjs` that runs the self-test, checks `groups.json` and the registry, and (when the texts are in the checkout) runs `--check-sources` and `--all`.

**Not done**: no group beyond its seed rows (the group `wounds-regions` has none); the MSHWR statistical tables, the medical volumes, Hammond, the Regulations, Chisolm, Brinton, Bucklin, the Commissions' reports, the Park Service essay 5 and the Library of Congress pictures are not downloaded or viewed; no page image was opened (the OCR digits are unconfirmed); no wound frequency, no layout position, no treatment sequence beyond the seeds; no product data, no module, no request note to another workstream; no browser, no GPU, no timing; no gate run; nothing deployed; no file outside this workstream's ownership changed. The register entries are proposed, not added to `register/`.
