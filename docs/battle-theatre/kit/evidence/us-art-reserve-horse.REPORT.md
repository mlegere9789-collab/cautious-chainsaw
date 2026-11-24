# Kit evidence report: us-art-reserve-horse

Army of the Potomac, the Artillery Reserve (Tyler: five brigades, the train guard and the headquarters) and the two horse artillery brigades of the Cavalry Corps (Robertson, Tidball). 41 units of `groups.json` (the Reserve, the Horse Artillery, five Reserve brigades, the 4th New Jersey and 33 battery units: 31 with the full set of required fields, and Batteries B and M of the 1st Connecticut Heavy with roster and commander only). Workstream `bt-oob-kit`. Evidence file `us-art-reserve-horse.jsonl`. Register proposals `GOVERNANCE/horde/ws-kit/proposed-register/us-art-reserve-horse-01-strength.md`, `-02-horses-casualties.md`, `-03-guns.md`, `-04-dress.md`. Request notes `GOVERNANCE/horde/requests/bt-oob-kit-us-art-reserve-horse-library.md`, `-catalog.md`, `-roster.md`, `-tools.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-us-art-reserve-horse/` (`kb.py`, `build.py` and the data modules `p1_table.py`, `p2_data.py`) locates every quote through the evidence library, so offset, report id and printed page come from the tool. Read through: Hunt (R028), Tyler and his ordnance officer (R315, R316), the brigade and battery reports R317 to R335, and the horse artillery reports R368 to R374 (R375, Fuller, Battery C, 3d US, belongs to another group's formation and was not used). The organization table (pp. 167-168), the artillery blocks of the return of casualties (pp. 186-187) and the Artillery Reserve rows of the abstracts (pp. 151-152) were read from the scans at 130 to 300 dpi; every battery row of the return was added to the total row of its brigade by hand, and the brigade totals to the total of the Reserve (2, 41, 15, 172, 12, 242). Every gun count of Hunt was re-read on the scan (pp. 233, 234, 235, 237, 238, 239). A scan of the state volumes, Fox, Battles and Leaders and the other local texts for the designations of each battery looked for strength, horses, guns and dress; one more text was fetched and declared (the history of the Fifth Massachusetts Battery). Not run: `kit_verified.py build`, `kit_overrides.py compile` (only `--dry-run`), the gate runners.

## Counts

`python -I tools/bt/kit_evidence_check.py us-art-reserve-horse --coverage --require-complete` exits 0: `us-art-reserve-horse: 285 lines (278 evidence, 6 gap, 1 source); accepted 271 (documented 265, inferred 6); rejected 0; superseded 7; 0 errors, 65 warnings; coverage: 251 of 251 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field: casualties 57 (35 rows of the return read from the scan: 27 battery or battery-pair rows and 8 total rows, those of the five brigades, of the two horse artillery brigades and of the Reserve; 20 report statements; 1 derived total of the Horse Artillery; 1 history), guns 54 (49 documented lines of Hunt, the reports and the state volumes; 5 derived brigade totals, inferred), commander 47 (the table's names; 7 replaced by dated lines with the event: Eakin, Mason, Milton, Ransom, Hart, Tyler, Robertson), roster 44 (41 units and 3 units the plan lacks), horses 26, strength 19, ammunition 16, detachment 8. Four conflict sets (below). The checker keeps 65 warnings (OCR corrections read from the scan, numbers waived with the reason, dates before the battle, strength rows with no cell that adds up to a printed total).

Guns: a documented line with a count for 1-3 July for 23 of the 31 batteries (Hunt on every battery of the Artillery Reserve, Calef from Hunt on 1 July, the 6th Maine also from its state volume); the Sixth New York, 2d US M and 1st US K have June figures only (lines dated before the battle); the 1st Connecticut Heavy has the type (4 1/2-inch) and no count; the 9th Michigan, 2d US B and L, 4th US E and 1st US E and G have none (gap line). The five Reserve brigade totals are derived sums (inferred); the Horse Artillery as a whole is 44 3-inch guns (Hunt). Casualties: a return row for 27 of the 31 batteries or battery pairs (a joint row serves both batteries of a pair); none for Maryland A (Rigby: no casualties whatever), 2d US B and L, 1st US E and G and the 1st Connecticut Heavy (B and M not engaged).

## Corrections

What the kit tables hold now (`--diff`) against what the record says. The kit's guns for the Reserve batteries rest on `SS-ArtReserve` (Stone Sentinels, a secondary site) and are `documented`.

| unit | field | kit now | evidence value | source and page | line |
|---|---|---|---|---|---|
| 9th Massachusetts | guns | 6 Napoleons (documented, SS-ArtReserve) | four 12-pounders (Hunt, 2 July); six guns in the history of the Fifth Massachusetts Battery (conflict set) | R028 p. 235; history | 0155 (A), 0278 (B) |
| 1st Connecticut Heavy | card name | 1st Conn Heavy B and H | Batteries B and M (the table prints B and M; Tyler: B and M); the 4 1/2-inch guns were sent to Westminster | R009 p. 168; R315 p. 872 | 0052-0054, 0262, 0270 |
| Artillery Reserve | strength | 2,364 (PDF, from Stone Sentinels, no range) | 104 officers and 2,464 men present for duty, 2,745 aggregate present, 30 June; 112, 2,882 and 3,148 on 10 July (4 July not reported) | R008 pp. 151, 152, 153 footnote | 0187-0192 |
| Artillery Reserve | casualties | 242 (PDF, weak source) | 242 (2 killed officers, 41 enlisted; 15 wounded officers, 172 enlisted; 12 missing) | R013 p. 187 | 0123 |
| Artillery Reserve | commander | Tyler | Tyler; Robertson, who commanded the Reserve on 3 July after Tyler's sunstroke | R009 p. 167; R368 p. 1021 | 0253, 0254 |
| 1st US H | commander | Eakin (wounded) | Eakin wounded 2 July; Mason assumed command | R028 pp. 233-234 | 0248, 0249 |
| 5th NY | commander | Taft | Taft (table, his report); the New York volume names First Lieutenant J. P. Denike as commanding the battery while Taft commanded the brigade | R009 p. 168; NY-GB-1902-v3 | 0061, 0062, 0255 |
| 6th NY, 2d US M, 1st US K | guns | gap | three (or two) 3-inch rifles lost at Brandy Station; six guns of Pennington's battery on 9 June; four pieces of Graham's on 21 June (all before the battle) | R370, R378, R345, R373 | 0263, 0264, 0268, 0269 |
| 5th and 9th Massachusetts, 15th New York, Pennsylvania C and F, 1st Pennsylvania F and G, 6th Maine | strength | equal share of 2,364 | 104, 104, 70, 105 (C and F), 144 (F and G), 103 taken into action or present | R319 footnote p. 884; PA-GB-1914-v2; ME-GB-1898; NY-GB-1902-v3; FOX-1889 | 0193-0204 |
| Horse Artillery | casualties | none | 23 (the two brigade totals, 8 and 15) | R013 p. 186 | 0089, 0096, 0124 |
| 6th Maine | guns | 4 Napoleons | four light 12-pounder Napoleon guns, 103 men and officers and 90 horses brought onto the field | ME-GB-1898; R028 p. 238 | 0178, 0179, 0204, 0219 |
| 5th Massachusetts | horses | none | 40 killed (report), about 50 lost, 59 killed (history): conflict set | R319; history | 0275-0277 |

OCR digit and word errors found against the scan: the footnote of McGilvery on p. 884 prints the Fifteenth New York at 3 officers (scan: 2) and C and F, Pennsylvania, at i officers (scan: 5), so that the four batteries add to the printed total 15 officers and 368 men (4, 4, 2, 5); Milton p. 886 prints C non-commissioned officers wounded (scan: 6); Calef p. 1032 prints 1.3 horses (scan: 13); Hunt p. 235 prints foiir for four James rifles, and breaks the word 12-/pounders at the end of a line (12- ?ounders); Hunt p. 239 prints Weir's six 13-pounders (scan: 12); Hunt pp. 233-234 print tlie for the and a stray quotation mark; the organization table prints Cth New York Battery (6th), 8d Battery (2d Connecticut), HuNTmaTON (Huntington, small capitals), EUjah (Elijah), PhiUips, HiU, Ma.son, McGilveey, CJonnecticut; the return of casualties prints the labels of p. 187 as Hassachusetts, Sth United States (5th), Isrf^ Penn'^vlvania Lierht (1st Pennsylvania Light), and loses the labels of the 2d Connecticut, 5th New York, 1st New Hampshire, 1st Ohio H, West Virginia C, the Maine, New Jersey and New York batteries of the Fourth Brigade and the totals of the Second and Fourth Brigades (the quote is then the line that heads the block, and the figures were read from the scan); p. 186 prints the 9th Michigan as a bullet and th Michigan and loses the 2d US M row and the label of the Second Brigade total; the abstract of 10 July (p. 152): the OCR gives the men of the Reserve as 2,682, the scan at 300 dpi reads 2,882.

## Conflicts

| conflict key | alternatives | lines |
|---|---|---|
| `us-art-reserve-mcgilvery-9ma|guns|1863-07-02-present` | A: four 12-pounders (Hunt); B: six guns, "saving five out of their six guns" (History of the Fifth Massachusetts Battery, 1902). Milton and McGilvery speak of four guns left on the field and two taken to the rear | 0155 (A), 0278 (B) |
| `us-art-reserve-mcgilvery-5ma|horses|1863-07-01-1863-07-03` | A: 40 horses killed and a number disabled (Phillips); B: 59 killed (a member of the battery, history of 1902); C: about fifty lost (an officer of the battery, same history) | 0275 (A), 0276 (B), 0277 (C) |
| `us.art.6th_ny|guns|1863-06-09-lost` | A: three 3-inch rifled guns (Martin); B: two guns (Lowell). Brandy Station, 9 June, before the battle | 0263 (A), 0264 (B) |
| `us.art.6th_ny|horses|1863-06-09` | A: 20 artillery horses (Martin); B: 32 horses (Lowell) | 0266 (A), 0267 (B) |

No default is chosen. Not conflicts and kept as separate lines: the same battery on different days (Phillips six 3-inch on both days; Thompson's Batteries C and F six 3-inch on 2 July and five on 3 July after one gun was lost; Taft's one 20-pounder that burst on 3 July), the casualty figures of different basis (the return of 1 to 4 July against a battery report of one day: the Fifteenth New York, 3 killed and 11 wounded enlisted in the return against 4 and 13 by McMahon; Ames 8 wounded against 7; the history of the Fifth Massachusetts, 7 killed and 12 wounded, against the return's 4 killed and 17 wounded), the strength of the First Volunteer Brigade batteries in McGilvery's footnote against the same figures in Fox, the New York and the Pennsylvania volumes (they agree once the OCR misprints of the footnote are corrected; no conflict). A statement of the New York volume that Denike commanded the Fifth New York Battery while Taft commanded the brigade stands against Taft's own report ("the battery commanded by me"): carried as a second commander line (order 2) and listed here; not declared as a conflict set because the two statements concern different parts of the record (succession against signature).

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | 23 units (every battery or pair without a figure: all but the 5th and 9th Massachusetts, the 15th New York, Pennsylvania C and F, 1st Pennsylvania F and G and the 6th Maine; the 1st Connecticut Heavy included) | the reports read through, R008 pp. 151-153, OR27-1 and OR27-3 by designation, the state volumes, Fox, Battles and Leaders, the declared history | not found | `us-art-reserve-horse-01-strength.md` |
| horses | 13 units (1st US H, 4th US C, 5th US C, 1st CT Heavy, 2d CT, 5th NY, Maryland A, the Sixth New York for 1-3 July, and five horse batteries) | same | not found | `us-art-reserve-horse-02-horses-casualties.md` |
| guns | 9th Michigan, 2d US B and L, 4th US E, 1st US E and G (1-3 July) | Hunt R028, R368-R374, state volumes | not found | `us-art-reserve-horse-03-guns.md` |
| casualties | 1st CT Heavy, 2d US B and L, 1st US E and G | return pp. 186-187 from the scan, R316, R324, R368, R372 | not found (no row) | `us-art-reserve-horse-02-horses-casualties.md` |
| strength, horses | Sixth New York for 1-3 July | monument and sketch in NY-GB-1902-v3, reports | not found | `-01`, `-02` |
| dress | all 31 batteries and pairs (the composite 1st CT Heavy included) | OR27-1 and OR27-3 by designation with the words of dress, the state volumes, the declared history | not found | `us-art-reserve-horse-04-dress.md` |

## Roster

- Units the record shows and the plan lacks (`unit_id: null` lines, reported to the roster owner in `bt-oob-kit-us-art-reserve-horse-roster.md`, never applied): the 10th New York Independent Battery (attached to the 5th Massachusetts, 0256), the 11th New York Independent Battery (attached to Battery K, 1st New York, 0257), the headquarters guard of the Reserve, Company C, 32d Massachusetts (0258), and the two brigades of the Horse Artillery with their own total rows of the return (0089, 0096; the roster has one unit for both).
- The kit card `US.ART.1st_Conn_Heavy_B_and_H` and the roster's B and M: the record says B and M (table p. 168, Tyler). Both batteries were marked not engaged and ordered to Westminster.
- Joint entries of the table and the return: 3d US F and K, Pennsylvania C and F, 1st Pennsylvania F and G, 2d US B and L, 1st US E and G are one entry each under one commander; the roster has two units for the first three, which therefore carry the same lines.
- 3d US Battery C (Fuller) is printed under Tidball with the footnote "With Huey's Cavalry Brigade, and not engaged in the battle"; it is not a unit of this group.
- The Horse Artillery brigade commanders (Robertson, Tidball) and the Reserve's second name (Robertson) are concurrent, not successive; the `role` of the lines says so.

## For other groups

- `us-cav` (and its horse batteries): Robertson (R368 p. 1021) detached Pennington's M, 2d US, and Elder's E, 4th US, on 29 June to the Third Division (Kilpatrick); Calef joined Buford on 14 June (R374); Martin's Sixth New York was assigned to Gregg on 9 July. Kilpatrick (R359) and Richmond (R362) name Elder and Pennington; the casualty table of R362 (p. 1008) gives Elder's battery by action, scrambled by the OCR. Duffie (R345): Pennington's six guns engaged on 9 June. Fuller's Battery C, 3d US: R375; the table's footnote on p. 167.
- `us-art-corps`: Hunt's remarks on the 44 3-inch guns of the Horse Artillery (p. 241), on Thompson's and Smith's guns lost (p. 236), and on the four guns of Turnbull's battery brought off (R315 p. 873).
- `army-hq`: Tyler's statement of 4 July (R315 p. 876: 14 officers wounded, 216 enlisted killed, wounded and missing, "but see revised statement, p. 187"), and the supply of 19,189 rounds issued at Gettysburg (R316).

## Sources

`OR27-1` (R008 pp. 151-153, R009 pp. 167-168, R010 p. 168 footnote, R013 pp. 186-187, R028, R315-R335, R345, R368-R374, R378), `ME-GB-1898` (6th Maine: guns, strength, horses), `NY-GB-1902-v3` (15th NY strength, 5th NY, 6th NY), `PA-GB-1914-v2` (Pennsylvania C and F and F and G: strength; detachment to the 1st Ohio), `FOX-1889` (9th Massachusetts strength). One declared text: History of the Fifth Massachusetts Battery (Boston, 1902), class `regimental_or_state_history`, fetched from archive.org on 24 November 2026 by the stream path (https://archive.org/stream/historyoffifthma00massrich/historyoffifthma00massrich_djvu.txt), one request, none refused; kept under `tmp/kit-us-art-reserve-horse/lib/historyoffifthma00massrich/`. Searched without result: the other state volumes, Battles and Leaders, Haskell, Meade, Letterman, the cemetery report, OR27-3, and archive.org catalogue titles for the 9th Massachusetts, 15th New York, 1st New Hampshire, 5th New York, 1st Pennsylvania F and G, 1st Connecticut Heavy (only the Second Heavy), the regular batteries and the 9th Michigan (nothing found).

## Not done

Every required (unit, field) pair is evidenced or recorded as a gap. Not done, though not required by the group sheet:
- Officer lines (lieutenants named in the reports and in the lists of officers killed or wounded, R013 pp. 188-192, and Hunt's lists): only the commanders and their changes were written.
- Arms of the batteries (no small-arms statements were found or sought) and the column of pieces of the abstract (R008 p. 151, pieces 110 on 30 June for the Reserve; the footnote says the original reports 150).
- The 30 June and 10 July abstracts for the Horse Artillery (no row of its own: the Cavalry Corps row includes it).
- The kit's casualty figures for the batteries from the Hunt table of losses (p. 241: the OCR prints it without its figures).
- Histories of the other batteries (searched by title on archive.org: none found).
- `kit_overrides.py compile --dry-run --group us-art-reserve-horse`: 32 operations, 48 unapplied (14 routed by design, 34 to review: unresolved piece types, conflict sets, off-window lines, a joined card). It no longer crashes on a battery that mixes a conflict set with plain dated lines (`bt-oob-kit-us-art-reserve-horse-tools.md`).

## QC sweep 2026-11-24
Corrections after the independent check of the evidence (checker exit 0 with `--coverage --require-complete`); details in `GOVERNANCE/horde/ws-kit/QC-SWEEP-2026-11-24.md`.
- Sweep B, organization-table lines under a footnote mark (CS pp. 283-290, US pp. 155-168): 8 lines (0039, 0040, 0085, 0086, 0053, 0054, 0056, 0058).
