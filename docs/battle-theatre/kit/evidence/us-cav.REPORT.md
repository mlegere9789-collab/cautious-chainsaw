# Kit evidence report: us-cav

Group: Army of the Potomac, Cavalry Corps (corps headquarters, three divisions, brigades, regiments; the 3d West Virginia and Purnell Legion kit records). Checker: `python -I tools/bt/kit_evidence_check.py us-cav --coverage --require-complete` exits 0, 0 errors. Written 2026-11-24.

## Counts
226 lines: 201 evidence, 13 gap, 12 source declarations; 14 evidence lines are `unit_id: null` (units the plan lacks). Required pairs: 270 of 270 evidenced or recorded as gaps; none open.

| field | lines by tier |
|---|---|
| arms | documented 10, inferred 2 |
| casualties | documented 42 |
| commander | documented 56 |
| detachment | documented 8 |
| dress | inferred 4 |
| horses | documented 6 |
| officer | documented 4, inferred 1 |
| roster | documented 51 |
| strength | documented 8, inferred 9 |

Units addressed: all 44 (42 roster + 2 kit records). By field, evidence rather than gap: roster 44, commander 44 (6th United States four names in order), casualties 42 of 44 (the return has no row for the 1st Massachusetts or Purnell Company A), strength 9 of 44 (corps, three divisions, Gamble, 6th United States, 9th New York, Purnell A), arms weapon 8 of 33 regiments (5th Michigan twice, 8th and 9th New York, 17th and 16th Pennsylvania, 3d Pennsylvania, 1st Massachusetts) with side arms for 16th Pennsylvania, 1st and 7th Michigan, 1st Massachusetts, horses 6 lines (division figures of 28 June, 8th Illinois, 3d Indiana, 6th United States), dress 1 regiment (1st Massachusetts: four of twelve fields).

## Corrections
| unit | field | kit value now | evidence value | source and page | line |
|---|---|---|---|---|---|
| us-cav-1d-gamble-12il | commander | Maj Lemmon, mortally wounded | Col. George H. Chapman (one commander for the 12th Illinois and 3d Indiana) | OR27-1-R009 p. 166 | see roster lines |
| us-cav-3d-farnsworth-1vt | commander | Col Preston | Lieut. Col. Addison W. Preston | OR27-1-R009 p. 167 | roster lines |
| us-cav-3d-farnsworth | commander | Farnsworth (k)/Richmond | Farnsworth killed 3 July (Richmond's report); Richmond assigned 4 July | OR27-1-R362 | officer lines |
| us-cav-1d-merritt-6us | commander | Starr wounded; Carpenter, Nolan; Claflin wounded | table order Starr, Carpenter, Nolan, Claflin; the report names the commanding officer wounded and captured at Fairfield (identification with Starr inferred) | OR27-1-R009 p. 166, R343 | officer lines |
| all 33 regiments | strength | an equal share of the Cavalry Corps figure (11,769) | corps present for duty 30 June: 773 officers, 14,200 men, aggregate present 17,104; the 4 July field return does not report the Cavalry Corps | OR27-1-R008 pp. 151, 153 | strength lines |

OCR digit errors found against the scan: the 5th United States "lost 3 horses" (Mason, R341) is 2 in the scan (not used); Cram's report "operations of June 31" is June 21; the 7th Michigan's enlisted killed prints like 18 and is 13 (the row must add to 100 and the brigade to 31); the 1st Maryland's aggregate prints like 8 and is 3; "Cor ne" is Corrie (8th Pennsylvania); the casualty return of the cavalry has many lost row labels (8th and 12th Illinois, 3d Indiana, 6th New York, Reserve Brigade regiments, 1st Maryland and 1st Pennsylvania), which are quoted by the nearest legible heading.

## Conflicts
No conflict sets. Two differences of basis are kept as two lines: Nolan's 290 enlisted men lost at Fairfield (report of 3 July) against the return's 232 for the 6th United States (period 1 to 4 July); the division figures of 28 June (kind not named, so `inferred`) against the corps figure of 30 June (present for duty, `documented`). Kilpatrick's 3,500 "actual" and "upward of 4,000 on paper" are two lines of different basis (estimate_in_report, muster_or_roll).

## Gaps
Gap lines: strength (35 units), casualties (2), arms weapon (25), bayonet (32), sidearm_sword (28), horses (29), dress all fields (31) and six fields of the 1st Massachusetts. Each names the sources and the regexes. Register proposals: kit-us-cav-01-strength, 02-arms, 03-horses, 04-dress, 05-casualties (proposed-register/us-cav-0N-*.md).

## Roster
Units the table shows and the plan lacks (null lines): 1st Ohio Company A and Company C (division headquarters guards), 3d Pennsylvania Heavy Artillery section of Battery H, and Huey's four regiments (2d and 4th New York, 6th Ohio, 8th Pennsylvania; brigade footnoted not engaged). See requests/bt-oob-kit-us-cav-roster.md.

## For other groups
- Horse artillery batteries of the Cavalry Corps (Robertson, Tidball) are in us-art-reserve-horse: return rows OR27-1-R013 p. 186 (9th Michigan, 6th New York, 2d US M, 4th US E, 1st US K, 2d US A) were read but written for no unit.
- Edie's ordnance report (OR27-1-R026) lists stores collected by Capt. W. G. Graves, 10th New York Cavalry (114 carbines, 51 sabers, 5 revolvers): collected on the field, not the regiment's own arms; no line written.
- Confederate cavalry (cs-cav): Brooke-Rawle (declared here as us-cav:0002) says Ferguson's brigade (14th, 16th, 17th Virginia Cavalry, 34th and 36th Virginia Battalions) was "armed as mounted infantry with Enfield muskets" on 3 July (page text at offset 700493), and Jenkins' dismounted men had Enfield rifles; Crowninshield's recollections describe Confederate cavalry arms in general.
- The July 14 return gives the Cavalry Corps 696 officers and 11,957 men plus artillery 7 and 484: the aggregate 13,144 equals the corps total of the 28 June field report (703 + 12,441), so the July 14 line repeats the June 28 figures.

## Sources
OR27-1 (R009 pp. 166-167, R013 pp. 185-186 from scan, R008 pp. 151-154, R336-R367, R026), OR27-3 (Purnell strength), MI-GB-1889, NY-GB-1902-v3, PA-GB-1914-v2, LETTERMAN not used here. Declared (archive.org, fetched 2026-11-24, one request per second): Crowninshield, Brooke-Rawle, Chenango (9th New York), Hard, Tobie, Boudrye, Kidd, Lang, Rodenbough, Preston, Pickerill, the 4th Pennsylvania history (12 source lines; list and hashes in requests/bt-oob-kit-us-cav-library.md). No host refused.

## Not done
No required pair is open. What was not done: the cavalry volumes for Vermont (Benedict, held by us-1c), West Virginia, Maryland, Illinois and Indiana regiments beyond the texts above were not read line by line; the books of the other regiments were searched with the regexes recorded in the gap lines, not read through; officer lines (killed and wounded lists, OR27-1-R013 pp. 188-192) were written only for the command changes found; the casualty rows of the horse artillery belong to us-art-reserve-horse. The July 14 return was not entered as a line (the kind of figure is not named).
