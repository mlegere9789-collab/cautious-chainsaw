# Kit evidence report: us-art-corps

Army of the Potomac, the seven corps artillery brigades (Wainwright, Hazard, Randolph and Clark, Martin, Tompkins, Osborn, Muhlenberg). 45 units of `groups.json` (7 artillery brigades, 38 batteries; Battery E, 1st New York, is an attachment of Battery L). Workstream `bt-oob-kit`. Evidence file `us-art-corps.jsonl`. Register proposals `GOVERNANCE/horde/ws-kit/proposed-register/us-art-corps-01-strength.md`, `-02-guns.md`, `-03-dress.md`, `-04-horses-casualties.md`. Request notes `GOVERNANCE/horde/requests/bt-oob-kit-us-art-corps-library.md`, `-catalog.md`, `-roster.md`, `-tools.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-us-art-corps/` (`kb.py`, `build.py` and the data modules `p1_table.py` to `p4_changes.py`) locates every quote through the evidence library, so offset, report id and printed page come from the tool. The reports were read through (Hunt R028, the seven brigade reports and the battery reports R071-R075, R132, R181-R186, R221-R222, R238-R242, R264-R270, R314). The organization table (pp. 157-166), the artillery blocks of the return of casualties (pp. 174, 177, 178, 180, 182, 183, 185) and the artillery rows of the field return of 4 July (p. 153) were read from the scans at 130 to 300 dpi; every row of the return was added up (the checker verifies it) and each block of battery rows was added to the total row of its brigade by hand. A scan of the windows around the designations of each battery in the local state volumes, Fox, Battles and Leaders and the other texts looked for strength, horses and dress. Three archive.org texts were fetched and declared (library note). Not run: `kit_verified.py build`, `kit_overrides.py compile` (only `--dry-run`, which crashed on the unpatched tool, see Not done and `-tools.md`).

## Counts

`python -I tools/bt/kit_evidence_check.py us-art-corps --coverage --require-complete` exits 0: `us-art-corps: 312 lines (303 evidence, 6 gap, 3 source); accepted 281 (documented 277, inferred 4); rejected 0; superseded 22; 0 errors, 55 warnings; coverage: 294 of 294 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field: guns 67 (63 documented, 4 derived and inferred: the totals of the First, Second, Third and Fifth Corps brigades), commander 58 (the table's order of succession, 22 of them replaced by dated lines with the event: Reynolds, Breck, Stevens, Sheldon, Rorty, Rogers, T. F. Brown, Perrin, Woodruff, Cushing, Fuger, Randolph, Seeley, James, Bucklyn, Freeborn, Hazlett, Rittenhouse, Watson, MacConnell, Wilkeson, Bancroft), casualties 56 (35 rows of the return read from the scan: 28 batteries and the totals of the seven brigades; 20 report statements; 1 from a battery history), roster 46 (45 units and the 14th New York Battery as a unit the plan lacks), horses 23, strength 11 (four batteries and the seven brigades from the field return of 4 July), ammunition 10, dress 9 (Batteries B and E, 1st Rhode Island), detachment 1 (Battery E attached to Battery L). Four conflict sets (below). All 45 units are addressed.

Guns: a documented line for 30 of the 38 batteries (the eight without are the seven Sixth Corps batteries other than Cowan's, and Battery E, 1st New York, which served within Battery L: gap lines) and for six of the seven brigades (the Sixth is a gap). Seventeen batteries have lines of two or more dates and states (present, disabled, lost, captured, detached).

## Corrections

What the kit tables hold now (`--diff`) against what the record says. The kit's battery cards had no guns for 27 of these batteries (`gap`, tier inferred, source Wiki-OOB-Union); the record gives them.

| unit | field | kit now | evidence value | source and page | line |
|---|---|---|---|---|---|
| 2d Maine (B) | guns | gap | six 3-inch, 1 July (10.15 a.m.); three 3-inch on 2 July (conflict set) | Hunt R028 pp. 229, 233 | 0106, 0108 |
| 5th Maine (E) | guns | gap | six 12-pounders (Maine at Gettysburg; Hunt, 1 July evening and 3 July) | ME-GB-1898 pp. 81-82; R028 pp. 231, 238 | 0110-0112 |
| 1st NY L (with E) | guns | gap | six 3-inch, five after the loss of one gun (1 July evening), four on 3 July | R028 pp. 230-231, 238, 243 | 0113-0116 |
| 1st PA B | guns | gap | four 3-inch on 1, 2, 3 July | R071 p. 354; R028 p. 238; R075 p. 365 | 0117-0119 |
| 4th US B | guns | gap | six 12-pounders, four after two guns were disabled | R028 pp. 229-231, 238 | 0120-0123 |
| 1st NY B | guns | four 10-pdr Parrotts (inferred) | four 10-pounders (Hunt, Hazard); a battery history calls the five batteries six-gun (conflict set) | R028 p. 236; R132 p. 478 | 0124, 0125, 0298, 0299 |
| 4th NY | guns | six 10-pdr Parrotts (documented, monument) | six 10-pounders; three captured | R028 pp. 234, 243 | 0133, 0134 |
| 1st NY D, NJ 2d (1st NJ B), 1st RI E, 4th US K | guns | gap | six 12-pounders, six 10-pounders, six 12-pounders (scan p. 235), six 12-pounders (four from 5.30 p.m.) | R028 pp. 234-235; R186 p. 591 | 0135-0139 |
| 3d MA C, 5th US I, 1st OH L, 1st NY C | guns | gap | six 12, four 3-inch, six 12, four 3-inch | R028 p. 236 | 0140-0144 |
| Eleventh Corps batteries | guns | gap (13th NY: 3-inch, count not stated) | six, six, four, six, four; one lost (Osborn, Hunt) or two (Heckman) | R264 p. 747; R028 pp. 229-233, 243; R268 p. 755 | 0146-0157, 0280, 0281 |
| Twelfth Corps batteries | guns | gap | six, four, six, four (Hunt, 3 July); ten rifles and ten light 12-pounders (Muhlenberg) | R028 p. 237; R314 p. 870 | 0158-0161, 0277-0279 |
| 2d Maine, 5th Maine, 1st PA B, 3d NY | strength | no figure (equal share of corps) | 150 on rolls; 136 strong; 114 present for duty; 4 officers and 115 men | ME-GB-1898 pp. 20-25, 81-82; PA-GB-1914-v2 p. 913; NY-GB-1902-v3 p. 1285 | 0248-0251 |
| brigades | strength | corps share | 529, 475, 560, 444, 1,007, 494, 308 on 4 July | R008 p. 153 | 0300-0306 |
| Battery E, 1st NY | roster | (plan: a battery) | attached to Battery L from 20 June 1863; no data of its own | R009 p. 157 footnote; NY-GB-1902-v3 p. 1220 | 0274, 0275 |

OCR digit and word errors found against the scan: Hunt p. 229 and p. 233 "six 13-pounders" for Dilger's battery (the scan, p. 229, reads 12); p. 235 "six 13-pounders" for Randolph's battery (scan: 12); p. 238 Stevens' battery "six 13-pounders" (scan: 12); further "13-pounders" of the same kind at p. 234 (Winslow's, Kinzie's), p. 235 (Ames') and p. 239 (Weir's) were not read on the scan and are not used; Whittier's expenditure of ammunition (p. 362): spherical case 880 in the OCR, 380 on the scan (the parts then add to the printed total 979); Muhlenberg (p. 870): "IS-pouiider batteries" and "13-pounder Napoleons" read 12 on the scan, "rifl.e" reads rifle, "gO-pounder Parrott" is a 10-pounder; the field return of 4 July (p. 153), Third Corps artillery aggregate printed 560, OCR 660; the organization table (p. 161) prints "2d Battery" for the New Jersey battery and the OCR reads 3d; the casualty return labels the 5th US batteries "6th" and "Bth" in the OCR (p. 180) and the OCR of p. 163 reads Harn as "Ham"; names garbled by the OCR and corrected from the scan: Reynolds, Rorty, Rogers, Woodruff, Perrin, Tompkins, Malbone, MacConnell, Waterman, Butler, Dilger, Wiedrich's AViedrich.

## Conflicts

| conflict key | alternatives | lines |
|---|---|---|
| `us-1c-art-2me|guns|1863-07-02-present` | A: three 3-inch (Hunt, half the battery sent to Osborn, the other half disabled); B: four 3-inch (Osborn's list of the batteries sent to him) | 0108 (A), 0109 (B) |
| `us-11c-art-4usg|guns|1863-07-01-present` | A: six light 12-pounders (Osborn's list of his five batteries, total 26); B: four 12-pounders (Hunt, "about 11 a.m.") | 0146 (A), 0147 (B) |
| `us-11c-art-1ohk|guns|1863-07-01-lost` | A: one gun in the hands of the enemy (Osborn); B: one light 12-pounder (Hunt, the captures); C: two pieces (Heckman's own report) | 0151 (A), 0152 (B), 0153 (C) |
| `us-2c-art-1nyb|guns|1863-07-02-present` | A: four 10-pounders (Hunt); B: four 10-pounder Parrotts (Hazard); C: six, in a battery history that calls the five batteries of the corps six-gun (Aldrich, 1904) | 0124 (A), 0298 (B), 0299 (C) |

No default is chosen. Not conflicts and kept as separate lines: the same battery on different dates or at different hours of 1 July (Stewart six, then four; Reynolds six, five, four; Wiedrich six then four; Seeley six at 3 p.m. and four after 5.30 p.m.), and casualty figures of different basis (the return of 1 to 4 July against a brigade or battery report of one day: Hazard on Battery B, 1st New York and Rhode Island B; Battery B's own history says one officer wounded, three killed, 17 wounded and one prisoner on 2 July, line basis `state_volume`; Hazard's report says 1 killed, 7 wounded and 2 missing; the return gives 28 for 1 to 4 July).

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | 34 batteries (all but the four above and Battery E) | the reports named in the file (whole text), R008 p. 153, the state volumes and Fox, the three declared Rhode Island histories | not found | `us-art-corps-01-strength.md` |
| guns | Sixth Corps brigade; Massachusetts A, NY 3d, RI C and G, 2d US D and G, 5th US F; Battery E, 1st NY | R028, R231, R238-R242, NY-GB-1902-v3, R013 | not found | `us-art-corps-02-guns.md` |
| dress | all 38 batteries (kit fields `*`; lines exist for B and E, 1st Rhode Island) | reports, state volumes, Fox, OR27-3, the declared histories | not found | `us-art-corps-03-dress.md` |
| horses | 17 batteries (4th US B; RI A; US I; 4th US A; 5th US D; the Sixth Corps batteries but Cowan's; the Twelfth Corps batteries; Battery E) | reports, state volumes, histories | not found | `us-art-corps-04-horses-casualties.md` |
| casualties | Sixth Corps batteries but the 1st New York; 1st New York M; Battery E | return pp. 182, 185, reports, lists of officers killed | not found (no row in the return) | same |
| commander, strength, casualties, horses, guns | Battery E, 1st New York | table footnote, NY-GB-1902-v3 | attached to Battery L | none |

## Roster

- The 14th New York Battery (attached to Battery B, 1st New York): a `unit_id: null` line (`us-art-corps:0276`, parent `us-2c-art-1nyb`), reported to the roster owner in `bt-oob-kit-us-art-corps-roster.md`; never applied.
- Battery E, 1st New York: in the roster as a battery; the record has it attached to Battery L from 20 June 1863 (roster and detachment lines; gap lines for its other fields).
- Labels: "New Jersey Light, 2d Battery" is the roster's 1st NJ B (Clark's, Battery B, 1st New Jersey Light Artillery); "New York Light, 1st Battery" is Cowan's 1st New York Independent Battery; Harn's battery is spelt Harn.
- Randolph (wounded on 2 July) and Clark are the first and second commanders of the Third Corps brigade; Muhlenberg is a first lieutenant commanding the Twelfth Corps brigade; Hunt counts one lieutenant, three captains, one major and two colonels among the corps artillery commanders.

## For other groups

- `us-art-reserve-horse`: Hunt's totals (R028 p. 241-243): the three days' casualties table printed by the OCR without its figures; "67 batteries (373 guns)"; the ammunition expended in the three days, 32,781 rounds, "over 100 rounds per gun"; the supply carried was 270 rounds per gun; and the Oct. 4 note that six guns were lost (one from Reynolds' battery, one from Heckman's, three from Smith's, one from Thompson's: `python -I tools/bt/kit_evidence_lib.py cite OR27-1 "First Corps lost one gun, 3-inch, from Reynolds' battery"`).
- Pointers read: the casualty rows named by `us-1c`, `us-2c-1d`, `us-5c`, `us-6c`, `us-11c`, `us-12c` (106, 149, 43, 12, 69, 9) were re-read on the scans and agree; the 30 June abstract gives the First Corps 28 pieces and the Third Corps 30 pieces, which equal the sums of the battery lines derived here (`us-1c` and `us-3c-1d` lines).

## Sources

Official Records (`OR27-1`: R008, R009, R013, R028, R071-R075, R132, R181-R186, R221-R222, R238-R242, R264-R270, R314; `OR27-3` searched only), Maine at Gettysburg (`ME-GB-1898`: strength and guns of the Maine batteries), Pennsylvania at Gettysburg (`PA-GB-1914-v2`: Cooper's battery strength), New York at Gettysburg (`NY-GB-1902-v3`: Harn's strength, Battery E), and three declared texts: Aldrich, History of Battery A, 1st Rhode Island Light Artillery (1904), Rhodes, History of Battery B (1894) and Lewis, History of Battery E (1892), fetched from archive.org on 24 November 2026 by the stream path (https://archive.org/stream/<id>/<id>_djvu.txt: histbattery00aldrrich, historyofbattery04rhod, historybatterye00lewigoog; one request per second; none refused) and kept under `tmp/kit-us-art-corps/lib/`. Searched without result: the other state volumes, Fox, Battles and Leaders, Haskell, Meade, Letterman and the cemetery report.

## Not done

Every required (unit, field) pair is evidenced or recorded as a gap. Not done, though not required by the group sheet:
- Officer lines (lieutenants and sergeants named in the reports, the officers wounded or killed named in Hunt's lists and in R013 pp. 188-192 for the batteries): only the commanders and their changes were written.
- Arms of the batteries (the pieces' types are in the guns lines; no small-arms statements were found or sought).
- Brigade lines for horses and ammunition beyond the First Corps sum (about 80 horses) and the battery lines above; the 30 June abstract's pieces column (R008 p. 151) was not entered (a table row whose figures the contract does not allow as a documented guns quote).
- `kit_overrides.py compile --dry-run --group us-art-corps` crashes in `c_guns` (KeyError 'conflict') when a battery has a conflict set on one date and plain lines on others (`bt-oob-kit-us-art-corps-tools.md`); with that expression patched in memory it gives 41 operations and 44 unapplied (13 routed by design, 31 to review). The unpatched command was not rerun after a fix.
- Histories of Rhode Island C and G, the regular batteries, Massachusetts A and C, the New York, Ohio and Pennsylvania batteries other than those in the local volumes were searched for by title on archive.org (none found for C, G, Massachusetts A and C or the regular batteries) and not fetched.

## QC sweep 2026-11-24
Corrections after the independent check of the evidence (checker exit 0 with `--coverage --require-complete`); details in `GOVERNANCE/horde/ws-kit/QC-SWEEP-2026-11-24.md`.
- Sampled defects: 1 lines (0301).
- Sweep B, organization-table lines under a footnote mark (CS pp. 283-290, US pp. 155-168): 7 lines (0024, 0025, 0026, 0031, 0032, 0033, 0034).
us-art-corps:0301: men is not_stated (the row prints no officers figure; 475 is the artillery men column and the aggregate).
