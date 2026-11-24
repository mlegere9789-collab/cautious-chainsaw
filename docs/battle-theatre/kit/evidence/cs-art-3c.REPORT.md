# Kit evidence report: cs-art-3c

Army of Northern Virginia, Third Corps artillery: the battalions of Lane for Cutts (the Sumter Battalion, Anderson's division), Garnett (Heth's), Poague (Pender's) and the Reserve Artillery under Colonel R. Lindsay Walker (McIntosh's and Pegram's battalions). 19 units of `groups.json` (6 formations and 13 batteries). Workstream `bt-oob-kit`. Evidence file `cs-art-3c.jsonl`. Register proposals `GOVERNANCE/horde/ws-kit/proposed-register/cs-art-3c-01-strength.md`, `-02-horses-casualties.md`, `-03-guns.md`, `-04-dress.md`, `-05-commanders.md`. Request notes `GOVERNANCE/horde/requests/bt-oob-kit-cs-art-3c-library.md` and `-roster.md`. Written 24 November 2026.

How the file was made. A builder in `tmp/kit-cs-art-2c/` (shared with group cs-art-2c) locates every quote through the evidence library, so offset, report id and printed page come from the tool. Read through: Pendleton (R428; the table of the artillery after Gettysburg, p. 356, from the scan), Walker (R535), Lane (R548), Garnett and Richardson (R554, R555), Poague, McIntosh and Brunson (R562-R564), the organization table (pp. 288-290, scans at 200 dpi), the Addenda return of casualties (pp. 343-345, scans at 170 dpi) and Guild's return (pp. 333-334); R425 gives artillery by army corps only. Page 654 was read on the scan for the calibre of Moore's rifle. Not run: `kit_verified.py build`, `kit_overrides.py compile` (only `--dry-run`), the gate runners. No network request was made.

## Counts

`python -I tools/bt/kit_evidence_check.py cs-art-3c --coverage --require-complete` exits 0: `cs-art-3c: 114 lines (96 evidence, 6 gap, 12 source); accepted 95 (documented 92, inferred 3); rejected 0; superseded 1; 0 errors, 52 warnings; coverage: 115 of 115 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field: commander 28, roster 26, guns 25, casualties 15, officer 1. Of them 21 are `unit_id: null` lines for units the plan lacks (Sumter Companies A, B, C: roster, commander, guns, casualties row; Poague's four batteries: roster and commander; the Crenshaw lieutenant). Guns: every battalion has the figure of Pendleton's undated table after Gettysburg (Cutts 17, McIntosh 15, Poague 16, Pegram 18, Garnett 11; the figures add to the printed 77 of the Third Corps) and a figure for the battle in a report's words (Pegram 19 on 1 July, Garnett 15, Poague 16, Sumter 17 derived from Lane's three companies); batteries: Donaldsonville, Huger, Lewis, Danville, Hardaway, 2d Rockbridge, Fredericksburg, Pee Dee, Purcell have a count, a section or a piece (some with the count left null where the report says only a battery of Napoleons or a section); Norfolk Blues, Johnson, Letcher and Crenshaw are gaps. Casualties: the battalion totals of the Addenda return (the battery rows are blank in the print) and report statements for McIntosh's batteries.

## Corrections

The kit's guns for all 13 batteries are `gap` and its commanders absent or the PDF's; none of these kit fields holds a value that the record contradicts. What the record says:

| unit | field | kit now | evidence value | source and page | line |
|---|---|---|---|---|---|
| Donaldsonville (Maurin) | guns | gap | six rifled pieces of the battalion under Maurin on 1 July; two 3-inch rifles and a 10-pounder Parrott detached on 4 July | R554 p. 652; R555 p. 654 | 0068, 0069 |
| Huger (Moore) | guns | gap | one 10-pounder Parrott and one 3-inch rifle detached on 4 July (the OCR prints li-inch; the scan reads 3-inch) | R555 p. 654 | 0070 |
| Lewis | guns | gap | two rifled pieces abandoned on the night of 13 July | R554 p. 653 | 0071 |
| Hardaway (Hurt) | guns | gap | two Whitworth guns | R563 p. 675 | 0073 |
| Pegram's battalion | guns | gap | 19 on 1 July (ten Napoleons, seven rifled guns, two 12-pounder howitzers not in position) | R564 p. 678 | 0066 |
| Pegram's battalion | commander | PDF names | Pegram assumed command on 30 June (dated line replaces the table line); Brunson commanded until then | R535 p. 610; R424 p. 290 | 0107 (supersedes 0027), 0026 |
| Cutts's battalion | commander | PDF names | Lane commanded; Cutts absent (indisposition) | R424 p. 288; R535 p. 610; R548 | 0014, 0015 |
| Garnett's battalion | commander | PDF names | Garnett; Richardson commanded a detachment at Gettysburg and the battalion at Hagerstown | R554 pp. 652-653 | 0017, 0018 |

OCR digit and word errors found against the scan: Guild's rows of McIntosh's total print 7 20 32 (scan: 7, 25, 32); the Sumter Battalion rows and the artillery rows of pp. 344-345 lose or scramble their labels (Hurt's, Lusk's, Johnson's, Rice's, Brander's, Brunson's, Crenshaw's, McGraw's, Marye's all print blank rows); the organization table prints Hardawav, Rockljridge, Virgmia, Artiller;', Vii-ginia, Puss for Ross, Wingfleld for Wingfield, Caj^tain Moore; Brunson's report prints lu men killed for 10 and Ka])oleons; Pendleton's tables come out as detached columns; Garnett's report prints Mauriu for Maurin.

## Conflicts

No conflict set is declared. Discrepancies that are of different periods or kinds, listed for the owner and kept as separate lines: McIntosh's statement (24 killed and wounded and 10 captured since leaving Fredericksburg, footnote: but see p. 345) against the Addenda return (7 killed, 25 wounded, 32 for the battle alone: more than the statement gives for a longer period); Garnett's statement (5 wounded, 14 missing for the campaign) against the Addenda return (5 wounded, 17 captured or missing for the battle); Guild's total for the Third Corps artillery (14 killed, 101 wounded, 115, p. 334) against the Addenda rows (Sumter 3, 21, 30; Garnett 0, 5, 22; Poague 2, 24, 32; McIntosh 7, 25, 32; Pegram 10, 37, 48: 134 killed and wounded, 164 with the missing), a difference of the kind the headnote of the Addenda return describes (the figures of the commanders were generally adopted where they disagree with Guild's detailed statement; the compilation is approximative); the Addenda return of the Third Corps reserve artillery (17, 62, 1, 80) equals the sum of McIntosh's and Pegram's totals. No default is chosen.

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | all 13 batteries | the reports by regex, R425 pp. 291-293 (artillery by corps only), SHSP-12, Alexander, twelve state and regimental texts by battery name | not found | `cs-art-3c-01-strength.md` |
| dress | all 13 batteries (all kit fields) | same, dress words | not found | `cs-art-3c-04-dress.md` |
| horses | all 13 batteries | reports by regex; battalion figures (McIntosh 38, Brunson 38) and Sumter companies only | not found | `cs-art-3c-02-horses-casualties.md` |
| casualties | Donaldsonville, Huger, Lewis, Norfolk Blues, 2d Rockbridge, Crenshaw, Fredericksburg, Letcher, Pee Dee, Purcell | Addenda rows (blank), footnotes, reports | not found | `cs-art-3c-02-horses-casualties.md` |
| guns | Norfolk Blues, Johnson, Letcher, Crenshaw | reports by regex; Walker's inclosures | not found | `cs-art-3c-03-guns.md` |
| commander | Crenshaw | table p. 290 (no captain printed), R535, R564 | not found | `cs-art-3c-05-commanders.md` |

## Roster

- Units the record shows and the plan lacks (`unit_id: null` lines, reported in `bt-oob-kit-cs-art-3c-roster.md`, never applied): Companies A (Ross), B (Patterson), C (Wingfield) of the Sumter Battalion; Poague's Albemarle (Wyatt), Charlotte (Graham), Madison Light Artillery (Ward) and Virginia Battery (Brooke).
- The Crenshaw battery has no printed commander; the plan's `CS.ART.HURT` is the Hardaway (Alabama) battery of Captain W. B. Hurt; the casualty return calls one of McIntosh's batteries Lusk's, the table the 2d Rockbridge under Lieutenant Wallace: not equated.

## For other groups

- `cs-art-2c` (same author): the Second Corps half of Pendleton's table.
- `cs-heth`, `cs-anderson`, `cs-pender`: Guild's rows and the Addenda return carry the artillery of their divisions as formations of this group (Heth's artillery 5 wounded, 17 missing, 22; Pender's 2, 24, 6, 32; Anderson's Sumter Battalion 3, 21, 6, 30); Lane's report names Wilcox as the brigade to which Patterson was sent (R548 p. 635); Richardson's detachment went to Imboden (R555).
- `army-hq`: Walker's inclosures p. 612 (ammunition expended, casualties and losses by battalion), scrambled in the OCR.

## Sources

`OR27-2` (R424 pp. 288-290; R427 pp. 343-345; R428 p. 356; R535; R548; R554-R555; R562-R564). Searched without a result: SHSP-04, 05, 06, 11, 12, BL-3, Alexander, Longstreet, and the 12 declared texts (see the library note). No host asked or refused.

## Not done

Every required (unit, field) pair is evidenced or recorded as a gap. Not done, though not required: Walker's inclosures (ammunition by battalion, casualties by battalion and the table of losses of horses, guns and caissons, p. 612) because the OCR scrambles the columns and no reading of the scan was made; officer lines of the casualty lists; arms; ammunition lines (McIntosh's rounds by kind, Brunson's 3,800, Lane's rounds by company); Brunson's figures for 1 and 2 July and Zimmerman's wounded of the retreat (digits misread); the unit-level horses of Poague's Wyatt (8 horses) and of the Sumter companies (Ross 9, Patterson 7, Wingfield 20). `kit_overrides.py compile --dry-run --group cs-art-3c`: 12 operations, 21 unapplied (12 routed by design, 9 to review).
