# Hardee's Rifle and Light Infantry Tactics against Casey (1862): extraction notes

Scope: PDF B.6.11 (loading drill, "Leads to verify"), gap **G19 "Hardee vs Casey differences"**, and the PDF's bugle-call and skirmish-practice gaps.
Files here: `drill_hardee.json` (100 items: 66 Hardee, 34 Casey/NY supplementary), `drill_compare.json` (64 comparison rows). Rebuild with `python tools/bt/drill_build.py`, verify with `python tools/bt/drill_check.py` (exit 1 on any failure). Specs: `tools/bt/drill_data_hardee.py`; builder `drill_build_hardee.py`; window/similarity helpers `drill_paras.py`; page recovery `drill_text.py` (now with Hardee, Memphis-copy and New York at Gettysburg entries and hand-read running heads). Casey items are cited from `drill_infantry.json` (INF-*) where one lies inside the compared passage, otherwise new `HCS-*` items.

## 1. Sources and method

* `HARDEE-1861b` = `riflelightinfant121hard` (Richmond, J. W. Randolph, 1861; vol. 1 Schools of the Soldier and Company + Instruction for Skirmishers + bugle calls, vol. 2 School of the Battalion; page numbers restart in vol. 2). Legible running heads; **all page citations come from this copy**.
* `HARDEE-1861a` = `hardeesrifleligh01hard` (Memphis 1861, "complete in one volume"). Poor OCR, running-head numbers mostly lost, so no printed page is claimed for it. It is a second witness: each Hardee item carries `witness_a`, the longest run (at least 5 words) of the item phrase found verbatim in this copy (38 of 65 items; the rest have no clean 5-word run there). Both copies print the same text and the same paragraph numbers (Load in nine times = No. 156 in both contents lists). Both reprint the Hardee text adopted by the War Department order of 29 March 1855 (`HAR-ED-02`); neither is a Casey reprint.
* Discipline as in `DRILL-NOTES.md`: one verbatim OCR phrase (14 words or fewer) per item, found by exact match after whitespace collapse; OCR line and n-th occurrence re-found by the checker; printed page and confidence recomputed from the running heads; paraphrases checked for 15-word runs against every OCR text; sha256 of all OCR files checked against `GOVERNANCE/library/acquired.json`.
* Running heads: the automatic reader missed or misread many Hardee heads (garbled numbers such as `4U` = 40, `,'i8` = 38). Heads for Hardee vol. 1 pp. 28-219 and vol. 2 pp. 6-19, and for Casey pp. 47-51, 72 and 214-233 (needed by this comparison), were read from the OCR by eye and entered in `drill_text.EXTRA_HEADS`; the checker verifies each entry's text on its line. A page whose number is garbled but fixed by the sequence is `medium`; where the number itself is legible it is `high`.
* **Corrections to the earlier Casey extraction** (found because the new head entries are more complete): INF-FIRE-03 and INF-FIRE-04 (Casey "Fire", para 184-186) are on printed p. 48, not 47; INF-LYING-02/03 page confidence rose from medium to high. Nothing else in `drill_infantry.json`, `drill_artillery.json` or `ordnance_tables.json` changed.
* The old checker would have crashed on the Hardee entry in `acquired.json` (`warn` was a list called as a function); fixed. `hardee_text_found` in `drill_infantry.json` is now true and points to these files (the check requires it to equal whether a Hardee text is in `acquired.json`).

### How a comparison row is decided (all recomputed by the checker)
Each row names an OCR line window in Hardee and one in Casey (paragraph ranges, or explicit lines) and cites an item from each, which must lie inside its window.
* **identical**: letters-only difflib similarity of the two windows at least 0.80; real dictionary words with no near match on the other side at most max(5, 15 percent) per side; unmatched OCR-garbled tokens at most 35 percent per side (`drill_paras.is_identical`). Measured: similarity 0.80 to 1.00 (most 0.91-0.98).
* **differs**: at least one verbatim phrase that occurs in one window and not in the other.
* **absent_hardee**: a Casey phrase, and a regular expression with zero hits in both Hardee printings.
* **unsettled**: the OCR does not allow a decision.
The bugle-call rows are matched call by call and in order (regex per call) instead of by similarity, because Hardee's call list is badly damaged in the OCR.

## 2. The loading and firing drill as printed in Hardee (item ids `HAR-*`)

* **Load in nine times** (S.S. paras 156-170, printed pp. 36-40): 1 Load; 2 Handle cartridge; 3 Tear cartridge; 4 Charge cartridge; 5 Draw rammer (3 motions); 6 Ram cartridge; 7 Return rammer (3 motions); 8 Prime (2 motions); 9 Shoulder arms (2 motions). Hands, piece position and text are in `HAR-S02..S10` (muzzle 3 in. from the body at "Load"). **The PDF's memory list is confirmed for Hardee, in the same order and with the same motions as Casey.**
* Maynard primer: footnote, "Load in eight times", eighth command shoulder arms from return rammer (`HAR-S11`; Casey: numbered para 195, same words). **Load in four times** and **at will** (`HAR-S27`, `S28`), Ready / Aim / Fire / Load / Recover / Shoulder from Ready (`S12-S19`), cartridge-box rule (`S04`).
* Fires: squad direct and Cease firing (`S29`), oblique (`S30`), by file (`S31`), by rank (`S32`), kneeling (`S33`), lying (`S34`); company school fire by company, file, rank, to the rear, signal to cease firing with a following bugle note (`C03-C08`); battalion fire by company, wing, battalion, file, rank, to the rear (`B01-B07`, vol. 2 pp. 11-16); bayonet drill: fix, charge, trail, unfix, guard against infantry and cavalry (`S20-S22`, `S35`).
* Skirmishers (Instruction for Skirmishers, pp. 171-215): general principles (Nos. 1-14; reserves, quick or double-quick time, the run only in urgent necessity, movements habitually indicated by the bugle), Article First deployments (15-69), Second marches (70-105), Third the firings (106-126), Fourth the rally (127-177), Fifth deploy the battalion (178-197) (`K01-K07`). Skirmisher firing, loading and rally rules are in `K04`, `K05`.
* Bugle calls: 25 general calls (24 legible; the 24th, Drill call, is garbled) and 23 skirmisher calls (20 legible; calls 9 and 17 are garbled and call 5 is missing from the OCR) are listed by name and order (pp. 217-219; `L01`, `L02`, `L03`); each legible call is matched in order by regex in the checker. The **musical notation is not in the OCR text**; no page image was inspected.

## 3. Hardee vs Casey (settles G19 for the text)

51 rows identical, 8 differ, 4 present only in Casey, 1 unsettled. The loading and firing drill is the same text: the nine times, Ready/Aim/Fire/Load, load in four times and at will, every squad, company and battalion fire, kneeling, lying, the bayonet exercise and the skirmisher firings agree in wording; Casey's S.S. paragraphs are Hardee's plus 7 up to the Load-after-Fire paragraphs (Hardee 186 = Casey 193), plus 9 afterwards (Casey inserts paras 194-195, the relocated footnotes); Casey's S.B. paragraphs are Hardee's plus 6; the S.C. and skirmisher numbers coincide. Casey's own preface ("not many changes from the original") is therefore confirmed for the loading drill.

| Row | Item | Hardee | Casey |
|---|---|---|---|
| CMP-S02 | Load (time 1) | muzzle 3 in. from the body | same, plus rifle-musket variant: right hand just below the upper band, muzzle 8 in. |
| CMP-S04 | cartridge box | footnote: boxes brought to the front for loading and firing | numbered para 194, only when the boxes are slung upon the waist-belt |
| CMP-S20 | Fix bayonet | sabre-bayonet only | "bayonet"; rifle musket: barrel inclined forward, muzzle 8 in., clasp turned |
| CMP-S22 | Unfix bayonet | sabre-bayonet only | adds full socket-bayonet method (turn clasp, grasp socket, wrest off point down) |
| CMP-S25 | Inspection of arms | muzzle about 3 in., sabre-bayonet | adds muzzle about 8 in. for the rifle musket; "bayonet" |
| CMP-S17 | Aim, plate note | absent | Casey-only note: skirmisher aims with the rear sight at high elevation (OCR damaged) |
| CMP-B08 | battalion fires | absent | two skirmisher companies per battalion do not fire with the line except behind a breastwork (the 11 Aug 1862 order suspended the two-company arrangement) |
| CMP-K06 | rally | rally on the battalion printed in the skirmisher instruction | adds commands to deploy again (groups, sections, platoons); rally on the battalion moved to vol. 2 |
| CMP-K07 | deploy the battalion | one major takes the reserve | senior and junior majors; junior major takes the reserve with the skirmisher companies |
| CMP-L01 | general bugle calls | 25 | 26 (adds "Signal of execution") |
| CMP-L04, L05 | drum | absent | 15 + 20 drum beats; drum-major staff signals |
| CMP-L03 | skirmisher call 5 | line missing in the OCR (numbers run 1-4, 6-23) | "The run." | **unsettled** |

Plus the unchanged wording but different place of the Maynard footnote (CMP-S11, identical text).

## 4. Rate of fire, misfires, fouling, cartridge, range (both manuals)

* **Rate**: only the training standard: every man to load with cartridges and "fire at least three rounds in a minute with ease and regularity" (S.C. para 47, p. 101 Hardee, p. 110 Casey; `HAR-C02`); manual-of-arms motions at 1/90 minute except the cartridge, rammer and bayonet motions (`HAR-S01`). No combat rate.
* **Misfires**: procedure only (`HAR-C10`, `HAR-S26`): uncock and watch for smoke from the tube; no smoke = pick and prime again; second cartridge noticed by the height of the load; ball screw for three cartridges; stopped tube after a missed-fire cap gets a new cap without picking; "Spring rammer" to learn whether pieces discharged. Identical in Casey. **No misfire rate in either manual.**
* **Fouling**: no statement in Hardee or Casey (count 0 in all four OCR texts).
* **Buck and ball / cartridge description**: neither manual mentions buckshot or the cartridge's contents beyond the loading motions (tear the paper to the powder, empty the powder, ball point up). The buck-and-ball cartridge (ball plus 3 buckshot, 12-buckshot variant) stays an Ordnance Manual item (`drill_infantry.json` INF-AMMO-01..03).
* **Effective range**: none printed. The only yard figures in Hardee are two marching rates (4,000 yards in about 25 minutes at double quick; about 1,100 yards in 7 minutes).
(All "not found" statements are regex re-counts over the OCR; the Memphis OCR is poor, so the Richmond copy and Casey carry the weight.)

## 5. Which manual did each army use in 1863?

* **Union: partly established.** Casey's own front matter prints a War Department order dated Washington, 11 August 1862 adopting Casey for "the Infantry of the Armies of the United States, whether Regular, Volunteer, or Militia", suspending the two permanent skirmisher companies and substituting a ten-company order of posting (`HCS-U01`, `INF-HC-02`, `HCS-U04`). The preface says Scott's and Hardee's systems had both been in use for some years and that Casey presided over the 1854 board that reviewed Hardee's translation (`HCS-U02`, `HCS-U03`). The only regiment-level statement in the downloaded texts is a New York at Gettysburg address on the 44th New York, whose later-added companies moved "to Casey's Tactics" (`HCS-U05`, p. 363, medium). **Whether every regiment had switched by July 1863 is not stated.**
* **Confederate: not established.** The Hardee printings are Richmond and Memphis imprints of 1861 and reprint the **U.S.** War Department order of 29 March 1855 adopting Hardee "for the instruction of the troops when acting as Light Infantry or Riflemen" and for the militia (`HAR-ED-01..03`). That shows the book was printed in the South in 1861, not that any Confederate regiment used it in 1863. A search of Battles and Leaders vol. 3, OR vol. 27 parts 1-3, the OR Atlas, the Pennsylvania, New York, Maine and Michigan Gettysburg volumes and Fox found no statement naming a manual (one hit: the 44th NY sentence); counts and file hashes are re-checked (`usage_search`).

## 6. Unsettled, and what would settle it

| Open | Source needed |
|---|---|
| Bugle-call notation and exact identity of Hardee skirmisher call 5 (and calls 9 and 17, which are only garbled) | Page images of Hardee vol. 1 pp. 217-219 (archive.org `riflelightinfant121hard`); another Hardee OCR |
| Memphis copy: page numbers, and a clean copy of the wing/battalion fire paragraphs (Richmond OCR of S.B. Nos. 46-47 is damaged; CMP-B03 rests on the legible commands) | Page images |
| Which Confederate (or Union) units drilled by which manual in June-July 1863 | Regimental histories, OR reports, orders; none of the downloaded texts says |
| Combat rate of fire, misfire rates, effective range of the 1855/1861 rifle musket | Ordnance Department test reports and instruction-of-musketry texts (not Hardee or Casey) |
| Casey vol. 1 pages for HCS-K02 (p. 183, low): a page head near line 8040 is missing in the OCR | Page image |

No page image was inspected for any item; every printed page, quotation and count is "as the OCR reads" with the stated confidence. Hardee is the U.S. infantry text of 1855 for light infantry and riflemen; Casey replaces it for U.S. infantry from August 1862.
