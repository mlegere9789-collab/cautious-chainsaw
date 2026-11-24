# Kit evidence report: cs-anderson

Army of Northern Virginia, Third Corps headquarters and R. H. Anderson's division (Wilcox, Mahone, Wright, Perry and Lang, Posey). 28 units of `groups.json`. Workstream `bt-oob-kit`. Evidence file: `cs-anderson.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-anderson-01-strength.md`, `cs-anderson-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-anderson-library.md`, `-roster.md`, `-catalog.md`. Written 24 November 2026. Builder and drafts in `tmp/kit-cs-anderson/` (`build_a.py`, `part2a.py` to `part6a.py`, `org2.py`; helpers shared from `tmp/kit-cs-hood/sh.py`).

## Counts
`--coverage --require-complete` exits 0: 222 lines (211 evidence, 5 gap, 6 source); 197 accepted (174 documented, 23 inferred), 14 superseded (organization-table commander lines replaced by the same commander with a change of command), 0 errors. Pairs 154 of 154. By field: roster 28, commander 63, casualties 70, strength 24, officer 5, dress 21, gap lines 5. Compile dry run: 0 operations (28 unapplied, all routed to the verified tables by design). Warnings: OFF_FIELD 49 (the returns of 20 and 31 July, the 23 July fight at Manassas Gap), OCR_CORRECTED 25, NO_IDENTITY 18 (division rows have no identity inside the row), PAGE_UNCHECKED 12, NUMBERS_WAIVED 1.

## Corrections
The kit and the roster hold no commander, strength or casualty figure for these units, so there is nothing to contradict; the record settles the following.

| unit | field | roster or plan now | evidence value | source and page | line |
|---|---|---|---|---|---|
| Wright's brigade | commander | one name | Wright, Col. William Gibson (assumed command on the march of 1 July, Wright ill), Wright again; Walker, McCurry, Andrews at Manassas Gap on 23 July | OR27-2-R539 p. 622; R536 p. 615 | 0033-0035, 0159-0163 |
| Perry's brigade | commander | Perry/Lang | Col. David Lang commanding; General Perry disabled with typhoid fever | OR27-2-R545 p. 631; R536 p. 614; CMH vol. XI | 0048, 0049 |
| 22nd Georgia | commander | none | Colonel Wasden killed (Wright) or wounded (McCurry): a conflict set | R539 p. 624; R542 p. 629 | 0165, 0166 |
| Wilcox's regiments | commander | none | Forney, Sanders, Pinckard and the Ninth's Smith wounded on 2 July; Shelley, Tayloe, Broome succeeded | R537 p. 619 | see file |
| Perry's brigade | strength | none | near 700 on 2 July; 22 officers and 233 men for duty on 19 July | R545 p. 633; CMH vol. XI | 0175, 0176 |
| Wilcox's brigade | strength | none | about 1,200 on 3 July | R537 p. 620 | 0142 |
| Anderson's division | casualties | none | Addenda 147 killed, 1,128 wounded, 840 missing, 2,115; Guild 143, 1,021, 1,164; report 2,266 for Gettysburg, Manassas Gap and minor affairs | R427 pp. 333, 343; R536 p. 616 | 0092, 0120, 0178 |
| the 21 regiments | dress (shoes) | default | one fourth of the division marched ragged and barefooted (inferred for each regiment) | R536 p. 616 | 0197 and the 20 lines after it |

## Conflicts
`cs-3c-anderson-wright-22ga|commander|fate_of_colonel_wasden`: A (Wright's report: Colonel Wasden killed at the head of his command, line 0165), B (Captain McCurry's report: the colonel and adjutant were wounded and left on the field, line 0166). No default chosen.
Differences that are not conflicts because the basis differs: Wright's report says 688 lost on 2 July, the Addenda 668 (40, 295, 333); Walker's report 196 for the 3rd Georgia against 100 in the return's row (which has no missing figure); Hall's report 212 for the 48th Georgia against 90; Confederate Military History gives the 5th Florida 17 killed and 76 wounded against 12 and 63 in the returns, the 8th Florida 5 and 65 against 10 and 84; Hill's corps total in Guild's return (273, 1,384, 1,657) equals Pender's division and the artillery (with 100 fewer wounded) and omits Anderson's and Heth's divisions, and is carried as printed with that note (line 0093). Wilcox's and Lang's 3 July figures: about 1,200 (Wilcox) and about 1,400 for the two brigades together (Lang), different scopes.
OCR digit and label errors found against the scan: 12th Virginia printed 13th, 22d Georgia 32d, 2d Georgia Battalion 3d, 8th Florida Hth, 5th Florida a garbled mark, 12th Mississippi 13th, 16th Mississippi IGth, 6th Virginia (ith, 61st Virginia (51st (organization table p. 288); 22d Georgia ZJd (p. 333); Perry's brigade missing 206 for 205, Mahone's brigade killed figure blurred in the scan and read 8 from the sum 8+55+39=102 (p. 343); Anderson's division loss 2,260 for 2,266 (p. 616); Walker's 190 for 196 (p. 628); Hall's 2VZ for 212 (p. 629); Hill's 4.289 for 4,289 (p. 609); Lang's TOO for 700 (p. 633, first digit faint, number check waived).

## Gaps
Strength of the brigades of Mahone, Wright and Posey and of all 21 regiments (the reports give losses and some officer counts only: the 48th Georgia lost 5 of 6 captains and 11 of 17 lieutenants that went in). Weapon, bayonet and side arm of the 21 regiments; every dress field of the 21 regiments other than the shoes. Searched: OR27-2 R534, R536 to R547 whole text and OR27-3 by regex; Confederate Military History vols. Alabama, Florida, Georgia, Virginia, Mississippi; Alexander, Longstreet, Fremantle, Battles and Leaders vol. 3, Southern Historical Society Papers vols. 4, 5, 6, 11, 12. Register proposals: `cs-anderson-01-strength.md`, `cs-anderson-02-arms-dress.md`.

## Roster
All 28 units are shown by the table (p. 288). The plan names Perry's brigade Perry/Lang: the table heads it Perry's Brigade over Col. David Lang, and Lang's report heads it Perry's Brigade. The Sumter battalion (Lane) has no unit in this group (cs-art-3c). Request note `bt-oob-kit-cs-anderson-roster.md`.

## For other groups
cs-art-3c: Addenda p. 343, Sumter battalion: Company A (Ross) 1 killed, 7 wounded, 8; B (Patterson) 2, 5, 7; C (Wingfield) none, 9, 9; total 3, 21, 6 missing, 30 (read from the scan). Anderson's report and R548 (Lane) are for that group. Guild p. 334: Artillery Third Corps 14, 101, 115; Addenda p. 345: Total Third Army Corps 837, 4,407, 1,491, 6,735 (line 0121 here). cs-pender: Pender's division rows pp. 334, 344, 345 (Guild 259, 1,383, 1,542; Addenda 262, 1,312, 116, 1,690), and the footnote that General Lane reports his loss at 660. cs-heth: Pettigrew, Archer and Davis rows are in cs-heth.

## Sources
OR27-2: R424 p. 288 (table), R425 p. 292 (abstracts, Third Corps rows), R427 pp. 332-334, 343-345 (returns), R534, R536 to R547 (reports); ALEXANDER-1907 (table of 31 May). Declared: Confederate Military History vol. XI (Lang's letter of 19 July 1863, fetched 24 November 2026), vol. VIII Tennessee (fetched, searched), Alabama Extended Edition (copied), Georgia, Virginia, Mississippi volumes (on disk). Two requests to archive.org, none refused.

## Not done
None open. Not read: the nominal lists of casualties of the brigades that the brigade reports say they forwarded (none is printed in the reports read), so officers are named only where the reports and histories name them.
