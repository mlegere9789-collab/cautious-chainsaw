# Kit evidence report: cs-art-1c

Army of Northern Virginia, First Corps artillery: the battalions of Cabell, Dearing and Henry and the corps reserve (Alexander, Washington Artillery). 29 units of `groups.json` (13 roster units, 16 kit-only batteries). Feeds Q14 (guns per battery). Workstream `bt-oob-kit`. Evidence file: `cs-art-1c.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/cs-art-1c-01-strength.md`, `-02-guns.md`, `-03-casualties.md`, `-04-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-cs-art-1c-roster.md`, `-library.md`. Written 24 November 2026. Builder in `tmp/kit-cs-art-1c/` (`build_a.py`, `part2a.py`, `part3a.py`).

## Counts
`--coverage --require-complete` exits 0: 114 lines (109 evidence, 5 gap, 0 source declarations); 109 accepted (106 documented, 3 inferred), 0 superseded, 0 errors. Pairs 182 of 182. Evidence by field: roster 29, commander 33, guns 20 (18 documented, 2 derived), casualties 18 (17 documented, 1 derived), horses 8, dress 1, strength 0 (gap). Compile dry run: lines routed to the verified batteries; entries listed as 'to review' by the compile (guns with piece type candidates only, battery lines of scope section or derived).

## Corrections
| unit | field | kit or plan now | record | source and page | line |
|---|---|---|---|---|---|
| the five battalions | guns | none for battalions | guns on hand after Gettysburg (undated table of Pendleton): Cabell 15, Henry 18, Dearing 18, Alexander 22, Eshleman 10; corps 83 | OR27-2-R428 p. 355 | guns lines |
| Washington Artillery | guns | none | eight Napoleons and two 12-pounder howitzers on the morning of 3 July (Eshleman) | R466 p. 434 | guns line |
| Pulaski, McCarthy's, Manly's, Troup, Bath, Madison | guns | card values of Stone Sentinels | four guns each (Pulaski: two 10-pounder Parrotts and two 3-inch rifles; McCarthy: two 3-inch rifles and two Napoleons; Bath: four Napoleons; Madison: four 24-pounder howitzers; Troup: four pieces, Parrotts and 12-pounder howitzers; Manly: four guns) | R435, R436, R437, R438, R440, R442, R465 | guns lines |
| all batteries | commander | one name | captain and lieutenant in order from the table; Troup's Carlton is printed Charlton in Cabell's table | R424 pp. 283-285 | commander lines |
| Cabell's batteries | casualties | none | Carlton 1, 6, 7; Fraser 4, 14, 18; McCarthy 2, 3, 5; Manly 1, 6, 7 (Addenda) | R427 p. 338 | casualty lines |

## Conflicts
No conflict set. Kept as separate lines by basis or period: Guild (pp. 329-330) and Addenda (pp. 338-340) casualties (Alexander's battalion 19, 103, 122 against 19, 114, 6, 139; Washington 4, 32, 36 against 3, 26, 16, 45); guns of the Washington Artillery on 3 July (10) and after Gettysburg (10 with different types after losses and a captured rifle); McCarthy's guns are given as two sections and a derived battery line. The Addenda total of the Reserve Artillery (22, 137, 22, 181) does not equal the sum of its two battalions (wounded 140, aggregate 184); waiver recorded.
OCR digit and label errors found against the scan: Pendleton's table (p. 355) is scrambled in the OCR and read from the scan; Henry's 10-pounder Parrott cell is smudged and read as 6 (the column total 14 requires it); 13-pounder for 12-pounder in Eshleman's report; Alexander's total prints 1.39 and a 0 for 139 and 6; Henry's total prints 34.<r for 23; Reserve Artillery prints 3,290 inside the row (a figure of the corps total); the table labels Troup's Carlton as Charlton, Dearing as Bearing and Dealing.

## Gaps
Strength of the 22 batteries (`cs-art-1c-01-strength.md`; the abstract gives the corps artillery only); guns of the batteries of Dearing (4), Henry (4) and Alexander (Ashland, Bedford, Brooks, Parker's) (`-02-guns.md`; Parker's battery had four guns at Fredericksburg in December 1862, not July 1863); casualties and horses of the batteries of Alexander, Henry and the Washington companies (`-03-casualties.md`); dress of the 22 batteries except the shoes of the Bath battery (`-04-dress.md`). Five gap lines, each naming sources and regex.

## Roster
The table prints two batteries of Alexander's battalion as Virginia Battery (Parker and Taylor); the roster calls them Richmond and Bath. Dearing's fourth battery is Blount's Virginia Battery. The corps unit has no commander in the table; Eshleman's reports are addressed to Col. Walton as Chief of Artillery, First Corps. See the request note.

## For other groups
cs-art-2c and cs-art-3c: the rows of Pendleton's table p. 355 and p. 356 for the Second and Third Corps battalions (the rows of Andrews, Carter, Jones, Brown, Nelson; McIntosh, Poague, Pegram, Garnett, Cutts; the OCR prints 'In all, 81 guns' for the Second Corps, 'In all, 77 guns' for the Third and 'In all, S41 guns' for the army), and the Addenda rows pp. 341, 345 of their batteries. cs-art-2c: Dance's and Nelson's totals on p. 341.

## Sources
OR27-2 (R424 pp. 283-285, R425 p. 292, R427 pp. 329-330 and 338-340, R428 with the addenda table p. 355, R429, R435 to R440, R442, R463 to R466; pages 283-285, 329, 330, 338-340, 355 read from the scan); ALEXANDER-1907 searched (one hit of 1862 not used). No new fetch, no host refused.

## Not done
No required pair is open. Not done beyond the pairs: the abstract rows of the First Corps artillery (20 July: 93, 1,691, 1,967, 2,900, 1,325; 31 July: 96, 1,724, 1,724, 1,996, 2,873, 2,927, 83 pieces) were read but not written as lines (the corps artillery has no strength field in the required set); officer lines (Fraser's wound, Norcom, Apps, Brown, Woolfolk, Gilbert) and Baldwin's list of captured guns (R429) were not written; Pendleton's table for the lost pieces (rows Lost) was not written as separate lines; the battery casualty tables of Cabell's own report (columns scrambled) were not used because the Addenda rows say the same.
