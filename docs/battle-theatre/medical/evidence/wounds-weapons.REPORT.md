# Evidence pass: group `wounds-weapons` (weapons, missiles and the wounds they made)

Written 2026-11-15 by the evidence engineer of the medical workstream (OA12). File of the rows: `wounds-weapons.jsonl` (279 rows). Plan and contract: `PLAN.md`, `groups.json`. Proposed register entries: `GOVERNANCE/horde/ws-medical/proposed-register/wounds-weapons-EG-MED-WW-01` to `-08`. Delegated decisions: `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`, section of 2026-11-15 (DD-MED-WW-01 to -03).

## 1. Result in numbers

* **279 rows**; the group asked for at least 40 and aimed at 120. `python3 -I tools/bt/medical/validate_evidence.py wounds-weapons` exits 0: 279 rows, 0 failed. `--check-sources` exits 0 (0 problems).
* Tiers: **267 documented, 3 inferred, 3 plausible-procedural, 6 open gap.** Kinds: 143 `fact`, 81 `wound-stat`, 55 `wound-class`. 37 rows are `scene.use` show (23 at the Documentary setting with their Reduced form, 14 at Reduced), 242 are context.
* Warnings: 11 W001 (an approximate match: the OCR of the text differs from the quotation by noise, never in a digit), 81 W002 (the validator's page hint differs by more than two pages; see 8), 3 W003 (a quotation that contains a word the page copy test refuses: "accuracy", "generated", and "ai" inside an OCR misreading; the product shows the claim and the source, not the quotation).
* Rows by source:

| source | rows |
|---|---|
| `MSHWR-P3V2-1883` | 139 |
| `CHISOLM-1864` | 27 |
| `GROSS-1862-2ED` | 24 |
| `TRIPLER-BLACKMAN-1862-3ED` | 22 |
| `MSHWR-P1V2-1870-ALT` | 20 |
| `LETTERMAN-1866` | 20 |
| `AMM-CATALOGUE-1866` | 10 |
| `MSHWR-P3V2-1883-2NDISSUE` | 4 |
| `NPS-CARE-WOUNDED-GUIDE` | 4 |
| `HAMMOND-ESSAYS-1864` | 4 |
| `CHISOLM-1862` | 2 |
| `MSHWR-P1V2-1870` | 2 |
| `MSHWR-P2V2-1876` | 1 |

* 68 rows carry `ocr.corrections` (every one read from a page image, named, none from another scan or from consistency); 66 rows carry a table row as a list value.
* Ids: `001` to `003` are the seed rows of the planning step (kept; the page of `003` corrected, see 7); `004` to `025` are the rows of the earlier run of this group from Gross; `026` to `279` were written in this pass. No id was renumbered or reused.

## 2. What was acquired, and what was looked at

* The four texts the group named were already local from the earlier run and each has its ledger line (2026-11-14): `AMM-CATALOGUE-1866`, `CHISOLM-1862`, `CHISOLM-1864`, `HAMMOND-ESSAYS-1864` (sha256 and archive.org md5 recorded there).
* This pass added two page-image scans, each downloaded once from archive.org with the md5 equal to the archive.org record, moved to `tmp/library/medical/<id>/`, ledger lines appended to `SOURCES.md` (2026-11-15): `MSHWR-P3V2-1883-2NDISSUE-PDF` (140,424,292 bytes; the second issue of the third surgical volume) and `LETTERMAN-1866-PDF` (11,818,381 bytes). They are used only to read by eye the cells that the OCR garbles; the rows quote the OCR text.
* Page images looked at (rendered with `pdftoppm`; the printed page is the PDF page minus 86 for the Surgical History): PDF page 782 (printed 696, Table CXXI), 783 (697, Fig. 373 and its caption), 772 (686, Table CXV and the footnote with General Williams's letter), PDF page 90 of Letterman (printed 86, the table of the wounded at Fredericksburg). The renderings are in `tmp/medical-wounds-weapons/img/` (`p696-0782.png`, `p697hi-0783.png`, `pdf772hi.png`, `lett90.png`); any other resolution of the same page does as well.
* Nothing was refused or blocked: archive.org answered every request (one request per download; the metadata calls are the only others).

## 3. What was read (and what each question took)

Read for the group's purpose (the passages named; not every page of each book): Gross, *A Manual of Military Surgery*, 2nd ed. 1862, chapter V "Wounds and other injuries", printed pages 46 to 73 (by the earlier run; rows `004` to `025`); the Surgical History, third surgical volume (1883, first issue) chapter XII "Wounds and complications", printed pages 685 to 714 and 757 to 761 (sabre and bayonet wounds, the classes of projectiles, firearms and their projectiles, the effects of large projectiles and of small-arm missiles, entrance and exit, distorted bullets, contusions, lodgement, the primary symptoms), and the cases of Gettysburg named in chapters X and elsewhere; Tripler and Blackman, *Hand-book for the Military Surgeon*, 3rd ed. 1862, the chapter on gunshot wounds (pages 36 to 45); Chisolm, *A Manual of Military Surgery*, 3rd ed. 1864, pages 119 to 121, 157 to 163, 177 to 182 and 212 to 214, and the second edition (1862) for one passage; Letterman, *Medical Recollections*, the table of page 86 and the pages round it; the Surgical History first volume (1870) on the scalp (pages 81 to 92), the sabre and bayonet wounds of the face and chest, and the sabre cases of the scalp that name Gettysburg; the second volume for the sabre and bayonet wounds of the abdominal wall; the Army Medical Museum catalogue (1866) for the Gettysburg specimens that name a missile and for the wounded arms of Gettysburg; three passages of Hammond's essays; four statements of the Park Service teachers' guide.

| question of `groups.json` | rows |
|---|---|
| 1. shares of the wounded by small arms, artillery missiles, edged weapons | `026` (246,712 wounds by weapons of war: 245,790 shot, 922 sabre and bayonet, 0.37 per cent.), `027` (2.4 per cent. in European wars), `042` (90.1 per cent. of 141,961 known missiles from small arms), `102` to `130` (Table CXXI, 29 seats of injury by missile), `131` (aggregates), `132` and `133` (inferred: artillery 14,032 of 141,961; conoidal to round 6.45), `175` (scalp, Table V of 1870), `183` (evulsion of a lower limb by large projectiles: 62 of 164 fatal), `232` to `251` (the Army of the Potomac at Fredericksburg: cannon-ball 86, shell 811, bullet 3,519, unclassified 2,684), `198` (the Park Service guide: 94 of every 100) |
| 2. what each period source says of the conical ball and the round ball on soft parts and bone | Gross `002`, `005`; Surgical History `074` to `077`, `087` to `094`, `096`, `097`; Tripler `136`, `141`, `152`; Chisolm `154` to `155`, `169`, `173`; the Fig. 373 rows give the calibre and weight of the Springfield, Enfield, Austrian and other small-arm missiles (`045` to `052`) |
| 3. period names of the classes of wound by missile | the `wound-class` rows (55): gunshot wound as a contused wound (`004`, `039`, `040`), flesh wound, shot injury and shot penetrating wound as the seats of Table CXXI, the bone classes (`092`: contusions, simple fractures, partial fractures, penetrations, perforations, complete fractures), the contusion without a wound (`012`, `065`, `089`, `161`), the brush of a ball and windage (`072`, `148`) |
| 4. artillery wounds: shell fragment, solid shot, windage, case shot; fatal on the field | `016`, `017`, `053` to `059`, `063` to `073`, `138`, `147`, `158` to `162`, `271`; the share fatal on the field is an open gap (`272`, EG-MED-WW-06) |
| 5. edged-weapon wounds recorded and where | `026` to `038`, Table CXV (`185` to `195` and `275` to `279`: 15 of 17 rows and the aggregates), `179` to `182`, Chisolm `171`, `172`, Hammond `200`; named Gettysburg cases `220` to `227` (sabre, sword blow, bayonet) and `231` |
| 6. how surgeons found and named the missile | Gross `020` to `025`; Chisolm `252` to `259` (direction, palpation, help of the patient, the position of the limb, the rule of removal, the bullet forceps, the Confederate-issue pattern, the toothed forceps); the Nelaton probe (`260`, `261`); Tripler's immediate accidents (`262`) |

Rows by topic (ids; the first word of the topic is one of the group's topics):

| topic | rows | ids |
|---|---|---|
| `appearance.bleeding` | 2 | 013, 201 |
| `appearance.bullet` | 2 | 080, 167 |
| `appearance.foreign-body` | 5 | 090-091, 095, 098, 273 |
| `appearance.muscle` | 2 | 019, 088 |
| `appearance.orifice` | 16 | 006-009, 081-086, 150, 163-165, 168, 265 |
| `appearance.pain` | 2 | 101, 143 |
| `appearance.scalp` | 2 | 177-178 |
| `appearance.shock` | 5 | 014-015, 100, 144, 151 |
| `classification.gunshot` | 7 | 004, 039-040, 092, 145, 149, 262 |
| `classification.missile` | 4 | 041, 135, 159, 268 |
| `frequency.edged` | 29 | 026-031, 035, 179-182, 185-195, 266, 270, 275-279 |
| `frequency.missile` | 62 | 042, 102-133, 175-176, 183, 198, 232-251, 263-264, 267, 269, 272 |
| `mechanism.bone` | 2 | 153, 174 |
| `mechanism.conical-ball` | 12 | 074-075, 077, 093, 141, 152, 155-156, 169-170, 173, 199 |
| `mechanism.deflection` | 2 | 139, 274 |
| `mechanism.entrance` | 1 | 011 |
| `mechanism.extraction` | 6 | 023-024, 256-259 |
| `mechanism.fieldworks` | 1 | 142 |
| `mechanism.foreign-body` | 1 | 010 |
| `mechanism.grape` | 1 | 071 |
| `mechanism.large-projectile` | 3 | 063-064, 271 |
| `mechanism.locating-ball` | 10 | 020-022, 166, 252-255, 260-261 |
| `mechanism.lodgement` | 4 | 096-097, 099, 140 |
| `mechanism.poisoned-ball` | 1 | 134 |
| `mechanism.round-ball` | 4 | 076, 087, 094, 157 |
| `mechanism.shell` | 6 | 067-070, 073, 162 |
| `mechanism.shock` | 1 | 184 |
| `mechanism.solid-shot` | 3 | 066, 147, 160 |
| `mechanism.spent-ball` | 4 | 012, 065, 089, 161 |
| `mechanism.windage` | 2 | 072, 148 |
| `missile` | 3 | 001-003 |
| `missile.accident` | 1 | 017 |
| `missile.buck-and-ball` | 3 | 046, 060-061 |
| `missile.buckshot` | 1 | 146 |
| `missile.canister` | 1 | 055 |
| `missile.case-shot` | 1 | 056 |
| `missile.conical-ball` | 13 | 005, 044, 047-052, 136-137, 154, 196, 202 |
| `missile.grape` | 1 | 054 |
| `missile.indirect` | 1 | 059 |
| `missile.round-ball` | 1 | 045 |
| `missile.shell` | 3 | 057, 158, 197 |
| `missile.small-arms` | 3 | 043, 078-079 |
| `missile.solid-shot` | 4 | 016, 053, 058, 138 |
| `weapon.buckshot` | 2 | 218-219 |
| `weapon.canister` | 1 | 211 |
| `weapon.conical-ball` | 1 | 217 |
| `weapon.edged` | 20 | 018, 025, 032-034, 036-038, 171-172, 200, 220-227, 231 |
| `weapon.grape` | 2 | 206, 212 |
| `weapon.round-ball` | 2 | 203, 216 |
| `weapon.shell` | 6 | 207-209, 213-215 |
| `weapon.small-arms` | 4 | 062, 228-230 |
| `weapon.solid-shot` | 3 | 204-205, 210 |

## 4. Tables read from page images

The OCR text garbles Table CXXI, Table CXV and Letterman's table of page 86. For each row the quotation is the OCR text of the row as it stands; `ocr.corrections` (basis `page-image`, the image named) replaces the garbled span by the reading of the page. Every reading was tested by sums before it was used:

* **Table CXXI** (page 696; 29 seats, rows `102` to `130`; aggregates `131`): each row total equals the sum of its eight cells and each of the nine column sums equals the printed Aggregates row (359, 12,520, 1,153, 108,049, 16,742, 3,008, 130, 103,829, 245,790); the small-arm cells add to the 127,929 of the text and the ascertained cells to the 141,961 of the text.
* **Table CXV** (page 686; fifteen of seventeen rows and the aggregates, `185` to `195` and `275` to `279`): the fifteen rows add to 914 of 922 cases (522 sabre, 392 of 400 bayonet) and their recoveries, fatal and undetermined cases add to the aggregates less the two rows with no digits in the OCR (EG-MED-WW-04); the footnote counts agree (282 + 49 + 37 = 368 sabre wounds of the head; 80 + 4 + 6 + 7 = 97 of the upper extremities; 176 + 7 + 1 = 184 bayonet wounds of the lower extremities). The face row prints 43.4 for the bayonet mortality (as printed; 1 fatal of 23 with a result would be 4.3).
* **Letterman, page 86** (rows `232` to `249` by region, total `250`, inferred share `251`): the book heads the table "Wounded in the First Corps", the heading of the table of page 83; its total, 7,100, equals the sum of the seven corps tables of pages 79 to 85 (2,565 + 534 + 672 + 1,149 + 1,796 + 332 + 52), so it is the army total. The columns (cannon-ball, shell, bullet, unclassified) are read from the image; the four missile columns add to the number wounded in every row printed and each column adds to the Total row (86, 811, 3,519, 2,684).
* **Fig. 373** (page 697): the caption's calibres and weights were read from a 2x rendering; the OCR's Spencer calibre .55 is .56 and Sharp's (52 is .52 (rows `051`, `052`).

The numbers of these rows are not yet read by a second person (EG-MED-WW-07); a card that shows a digit from them waits for that reading.

## 5. Conflicts carried (every reading a row; no default is set by the evidence rows)

* `cs.scalp-missile`: the scalp by missile, 1870 Table V (round musket ball 384; 3,737 not named; row `175`) against 1883 Table CXXI (521; 3,600; row `102`); the totals agree (7,739). The text under the 1870 table says 72.6 per cent. small arms; its own items give 77.9 per cent. (row `176`; gap `267`).
* `cs.small-arms-share`: 90.1 per cent. of the shot wounds of known missile (row `042`) against the Park Service guide's 94 of every 100 wounds from bullets, or Minie balls, without source or base (row `198`).
* `cs.missile-share-basis`: Table CXXI (artillery 14,032 of 141,961 known missiles, about 9.9 per cent.; rows `131`, `132`) against Letterman at Fredericksburg (cannon-ball and shell 897 of 4,416 classed wounds, about 20.3 per cent.; rows `250`, `251`). They are different populations and neither is a Gettysburg figure; the choice of the basis of the sampling table is DD-MED-WW-01 (delegated; default Table CXXI, the other selectable, both marked as borrowed).

## 6. Open gaps (rows of tier open gap; register entries proposed, not added to `register/`)

| row | gap | entry |
|---|---|---|
| `263` | no table of the wounded of Gettysburg by missile in the local texts (the Surgical History tables are Army-wide; Letterman's classified table is Fredericksburg) | EG-MED-WW-01 |
| `264` | no classification of the Confederate wounded by missile | EG-MED-WW-02 |
| `265` | plates XXXIX and XL (the period pictures of early wounds) not viewed | EG-MED-WW-03 |
| `266` | two rows of Table CXV have no digits in the OCR | EG-MED-WW-04 |
| `267` | the 1870 text and its table disagree | EG-MED-WW-05 |
| `272` | the missile of the killed, so the share of artillery wounds fatal on the field, is not printed | EG-MED-WW-06 |

EG-MED-WW-07 (the tables above need a second reading) and EG-MED-WW-08 (the named Gettysburg cases are a record, not a sample) have no row of tier open gap. The three plausible-procedural rows (`268` the missile word on a patient card, `269` the two borrowed bases, `270` how few sabre and bayonet patients a hospital shows) set `scene.marked` true: the product shows them as the builder's choice.

## 7. Seed rows corrected

* `med.wounds-weapons.003` (the iron balls of spherical case-shot often lodged, third surgical volume): the planning step gave page 33, which is the validator's hint; the running head `LODGEMENT OF MISSILES IN SOFT PARTS. 23` stands before the sentence, so the printed page is **23**. Corrected in the file. Seeds `001` and `002` were not changed.

## 8. Why 81 rows carry W002

The validator's page model for these OCR texts reads the running heads, and in the Surgical History, Letterman and the Army Medical Museum catalogue the heads are often not recognised, so the hint can be many pages out (the hint for chapter XII of the third volume is 5 to 15 pages low). The printed pages in the rows were read from the running heads and page numbers in the text itself (the number printed with the head before and after the passage), and for the tables from the page images. A reader who finds a page differing from the hint should trust the printed head. Pages that rest on the head before the passage only are marked in `notes` (row `205`).

## 9. What was done with care, and what was left

Rules followed: no number, name or date in a claim that its quotation does not carry (the validator checks the numbers; a second review compared the words of every claim with its quotation and adjusted about twenty rows (a claim trimmed, or a quotation widened to carry what the claim says)); the period terms of the sources (conoidal ball, round ball, grape, canister, shell, buckshot, sabre, bayonet, solid shot, "shot wounds", "brayed", "pulpified"); a single witness is stated as that witness (Gross writes, Tripler writes, Chisolm writes, Letterman's table, the Park Service guide); the Park Service guide is a pointer only; no modern medical knowledge was used as evidence.

Left, with the reason:

* Not read: the other chapters of Gross, the Augusta and Richmond printings of Gross (`GROSS-1861`), Tripler's 1861 editions, the medical volumes of the Surgical History (not local), most of the second volume, the first volume outside the scalp, face and chest passages named above, the Letterman tables of pages 79 to 85 by corps (only the army total was read), Chisolm's second edition beyond one passage (its OCR is poor), the Hammond essays beyond three passages (they are mostly about treatment).
* The Army Medical Museum catalogue names Gettysburg about 320 times; ten specimens that name one missile each are rows. The Surgical History names hundreds of Gettysburg cases; about twenty are rows. A count by class of these would measure what was reported and kept, not what was inflicted (EG-MED-WW-08).
* No picture was drawn or looked at except the page images listed in 2: plates XXXIX and XL are not viewed; no scene, data file or module was made; no browser, no GPU, no timing was used; no gate was run; nothing was deployed; no file outside this group's ownership was changed (the decisions file and `SOURCES.md` were appended to by shell, as the rules allow).
* The names of soldiers are printed as the sources print them (the Surgical History prints full names; the catalogue prints initials). Whether a patient card may show a printed name is a question for the integration step.

## 10. For the integration step

* Apply only rows with `ok` true (all 279). Table rows have `value.kind` list and `data.columns` naming the columns; blank cells are `null`. Use `value_basis` read-from-table.
* The sampling table: weapon by seat from Table CXXI (`102` to `130`) or by region from Letterman (`232` to `249`), the choice as in DD-MED-WW-01; edged weapons by seat from Table CXV; the named Gettysburg cases and specimens (`204` to `231`) are documented cases and not weights.
* Props named in the rows: `round-musket-ball`, `buck-and-ball-cartridge`, `springfield-rifled-musket-ball`, `enfield-rifled-musket-ball`, `round-shot`, `grape-shot`, `canister-shot` (the Fig. 373 rows and the ordnance rows, with the calibres and weights printed in the quotations); the Confederate-issue bullet forceps and the toothed dissecting forceps of Chisolm are described in `258` and `259` (an instrument prop for the instruments group).
* The Reduced setting: wound appearance rows with `min_setting` documentary give a `reduced_form` (a dressing, a bandaged part under a sheet, no opening drawn).
* Copy audit: no claim, `may_show`, `reduced_form` or `data` text contains a refused word (E018 passes); three quotations contain one (W003): show the claim and the source for them.

## 11. How the file was made, so it can be rebuilt

The rows were written as specification files and turned into the evidence file by a builder that finds every quotation with the validator's own matcher (offsets and page hints), keeps ids stable and refuses to drop an id. Both are scratch under `tmp/medical-wounds-weapons/` (`build.py`, `specs/s01` to `s09`, `ids.json`, `tools/`); the evidence file is the deliverable and is complete without them.

To regenerate a page image: `pdftoppm -f <PDF page> -l <PDF page> -r 110 -png -singlefile tmp/library/medical/MSHWR-P3V2-1883-2NDISSUE-PDF/medicalsurgical32barnrich.pdf out` (PDF page 782 is printed page 696), and the same for `tmp/library/medical/LETTERMAN-1866-PDF/medicalrecollect00lettuoft.pdf` (PDF page 90 is printed page 86).
