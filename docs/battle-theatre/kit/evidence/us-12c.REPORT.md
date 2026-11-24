# Kit evidence report: us-12c

Army of the Potomac, XII Corps: corps headquarters and the infantry of the two divisions (Williams and Ruger, Geary). 37 units of `groups.json` (1 corps, 2 divisions, 6 brigades, 28 regiments). Workstream `bt-oob-kit`. Evidence file: `us-12c.jsonl`. Register proposals: `GOVERNANCE/horde/ws-kit/proposed-register/us-12c-01-strength.md`, `us-12c-02-arms-dress.md`. Request notes: `GOVERNANCE/horde/requests/bt-oob-kit-us-12c-roster.md`, `-library.md`, `-catalog.md`. Written on 24 November 2026.

How the file was made. A builder in `tmp/kit-us-12c/` (`kb.py`, `build.py`, packages `p1_table.py` to `p5_arms_dress.py`) locates each quote through the evidence library, so offset, report id and printed page come from the tool. The figures the OCR scrambles (the rows of the return of casualties on pp. 184 to 185, the field return of 4 July on p. 153, Geary's table on p. 833) were read from the scan at 220 to 330 dpi and added up against the printed totals; the checker verifies the row arithmetic. Eleven archive.org texts were fetched on 24 November 2026 from the `/stream/` path (one request per second, no refusal; the text between the pre tags, unescaped) and declared as `type: source` lines; six are cited, five only appear in the searched lists of gap lines. `kit_overrides.py compile --dry-run --group us-12c` (writes nothing): 28 operations, 50 entries unapplied (37 routed to the verified tables by design, 13 to review: see the catalog note).

## Counts

`python -I tools/bt/kit_evidence_check.py us-12c --coverage --require-complete` exits 0:
`us-12c: 260 lines (236 evidence, 13 gap, 11 source); accepted 227 (documented 200, inferred 27); rejected 0; superseded 9; 0 errors, 35 warnings; coverage: 204 of 204 required (unit, field) pairs evidenced or recorded as gaps; 0 units have open pairs.`

Active evidence lines by field and tier: roster 38 documented; commander 51 documented; strength 46 documented; casualties 37 documented (every row of the return for the corps, two divisions, six brigades and 28 regiments, with the corps, division and brigade totals added up); arms 17 documented; dress 11 documented and 27 inferred (the badge). Nine table lines of commanders and of the roster of Lockwood's brigade are superseded by dated lines.

Warnings: `OFF_FIELD` 18 (arms and uniforms of 1861 and 1862, the badge issue of April 1863, the Adjutant General's June and 13 June figures), `PAGE_UNCHECKED` 10 (volumes without page model), `OCR_CORRECTED` 5, `NUMBERS_WAIVED` 2 (a printed "1, 350"; a sum of two printed figures).

Verified status by the rule of section 9: the corps, both divisions and the six brigades have roster, commander and strength lines; 21 of 28 regiments have a strength line (7 are gaps); the strength kinds are `taken_into_action` (22 lines), `present_for_duty` (4), `effective_total` (9), `estimate_in_report` (3).

## Corrections

"kit now" is what `groups.json` prints.

| unit | field | kit now | evidence value | source, page | line |
|---|---|---|---|---|---|
| XII Corps | strength | 9,755 (Stone Sentinels via the PDF, weak) | 9,757 on 4 July, "for duty equipped" (540 officers and 9,217 men, with 9 + 299 artillery); the Artillery Brigade is 308 of it | OR27-1-R008 p. 153 | 0135 and the following 4 July lines |
| XII Corps | casualties | 1,082 | 1,082: 18 + 186 killed, 43 + 769 wounded, 2 + 64 missing; the OCR prints "1,083" | R013 p. 185 | corps row |
| divisions, brigades, 28 regiments | casualties | none | rows of the return (First Division 533, Second 540; brigades 80, 174, 279, 139, 98, 303) | R013 pp. 184 to 185 | casualty lines |
| divisions, brigades | strength | none | 4 July: First Division 4,363 (without Lockwood), Second 3,454, Lockwood 1,462, 10th Maine 170; taken into action: McDougall 1,830, Colgrove 1,571, Candy 1,798, Kane 700, Greene 1,424, Second Division 3,922 | R008 p. 153; R274 p. 782; R287 p. 815; R293 p. 833 | strength lines |
| regiments | commander | none (the plan gives none below the brigade) | every commander the table prints, in order (28 regiments; 29th Ohio, 111th Pennsylvania and others with the order of succession) and the changes of Ruger, Colgrove, Mudge/Morse, Kane, Lane, Stevens/Hayes | R009 pp. 165 to 166; R273, R288, R297, R302, R311 | commander lines |
| regiments | strength | an equal share of 9,755 | e.g. 5th Connecticut 221, 20th Connecticut 321/317/310 (1, 2, 3 July), 123d New York 495, 145th New York 245, 27th Indiana 339, 107th New York 319, 7th Ohio 365 enlisted, 109th Pennsylvania 149, 28th Pennsylvania 303 (without Company B), 60th New York 255 men | R274, R287, R290, R296, R305, R308; PA-GB-1914-v2 | strength lines |
| 1st Maryland Eastern Shore | commander | none | Col. James Wallace (the scan of p. 165; the OCR drops the name; Lockwood's report names Colonel Wallace) | R009 p. 165; R282 | commander lines |
| 13th New Jersey | badge | none | red five-pointed star (First Division), Toombs; documented | NJ-TOOMBS-1888 | dress lines |
| 137th New York | badge | none | white flannel star on hat or cap, Second Division (April 1863) | NY-GB-1902-v3 (NY3-S002) | dress lines |
| 27th Indiana | arms | default draw | 1862: four companies "Minnie" rifles with sword bayonets, six companies English Enfields (replacing Belgian rifles); no later statement | Brown 1899 | arms lines |
| 3d Wisconsin, 7th Ohio, 60th New York, 5th Connecticut, 2d Massachusetts | arms | default draw | Springfield rifles of the improved pattern taken on the field after Antietam (3d WI); Springfield rifles of July 1862 in place of converted flintlocks (7th OH); Enfield rifles (60th NY, Antietam); Springfield rifle (5th CT, 1862); Enfield then Springfield (2d MA, 1861) | Hinkley, Wilson, Eddy, Marvin, Quint | arms lines |
| 29th Pennsylvania | dress | none | grey cap, jacket and pants of 1861, army blue "some few months afterwards" | PA-GB-1904 (PA1-S007) | dress lines |
| 109th Pennsylvania | pack, shoes | none | overcoats and extra shoes thrown away on the march of 28 April 1863 | PA-GB-1904 (PA1-S041) | dress lines |
| Greene's five regiments | arms, sword | default draw | 1,240 muskets and 70 swords in the five regiments on 2 July | NY-GB-1902-v3 (NY3-S007) | arms lines |

The PDF's 9,755 and the record's 9,757 differ by 2; the PDF's casualty figure 1,082 agrees with the return.

## Conflicts

| key | alternatives | where |
|---|---|---|
| 3d Wisconsin, taken into action | A 246 officers and men (Colgrove's footnote, p. 815); B 21 officers and 339 enlisted men, 360 (Colonel Hawley's report) | 0147 (A); 0148 (B) |
| 2d Massachusetts, taken into action, officers and men | A 320 (Colgrove's footnote); B 316 (22 officers and 294 men: Quint 1867; Brown 1899 prints the monument text with the same 22 and 294) | 0143 (A); 0179 (B) |

Not conflicts (different kind or date): the 2d Massachusetts' 294 enlisted men (Cogswell, enlisted only); the 46th Pennsylvania's 262 (Adjutant General, effective) and McDougall's 262; the 109th Pennsylvania's 149 (Gimber and the Adjutant General agree); the 20th Connecticut's three dated figures; Greene's brigade 1,350 (his report), 1,424 (Geary's table, with officers), 1,310 (a later address, 2 July evening), "about 1,300" (the sketch of the 60th New York).

OCR digit errors found against the scan:
- R013 pp. 184 to 185: corps aggregate "1,083" (1,082); "S33" (533), "S40" (540), "SOS" (303), "Z19" (279), "SO" (90), "48" for 43 (29th Pennsylvania wounded), "S8" for 28 (28th Pennsylvania), "18" for 13 (29th Pennsylvania killed), "6" for 5 (First Brigade of the Second Division wounded officers), "86th Ohio" (66th); the Third Brigade killed enlisted 47 and the 149th New York's killed (6) and missing (3) are smeared in print and were fixed by the row and brigade sums; labels "SOth ry»TiTi*^cti<!!it" (20th Connecticut), "IBOth New York" (150th), "ISrth New York" (137th), "lOTth New Tork" (107th).
- R009 p. 165 to 166: "Bamum" and "EandaU" (Barnum, Randall); "Hammersteln"; "Rugeb"; "Tliird Bi-igade"; "Lieut. Cpl." for Lieut. Col. Powell (66th Ohio; kept as printed in the quote); the OCR drops the name of Colonel Wallace of the 1st Maryland Eastern Shore.
- R008 p. 153: "Artillery Brigades" row run together with the total; the Twelfth Corps' division rows run as columns.
- R293 p. 833: Second Brigade's enlisted men "653" (652); the total "230" (220).
- R274 p. 788: the second and third rows of the 20th Connecticut are both labelled "(July 3)" by the OCR; the scan reads July 2 (317) and July 3 (310).
- Section index: NY2-S027, which `groups.json` gives the 123d New York, is the 124th New York (inscriptions "124th New York Infantry"); the 123d has no regimental text in the local volumes.

## Gaps

| field | units | what was searched | result | register proposal |
|---|---|---|---|---|
| strength | 1st Maryland (both), 150th NY, 5th, 29th, 66th Ohio, 149th NY | OR27-1 R271 to R313; NY-GB-1902-v3, NY-GB-1900, MA-BURIAL-1863; Cook (150th NY), Sechrist (29th Ohio) | not found (line 0248) | kit-us-12c-01-strength |
| arms (weapon) | 18 regiments | OR27-1 R271 to R313; PA, NY, NJ volumes; Toombs, Storrs, Cook, Sechrist, monument report of the 123d | not found (0249) | kit-us-12c-02-arms-dress |
| arms (bayonet) | 27 regiments | the same | not found (0250) | kit-us-12c-02-arms-dress |
| arms (sidearm_sword) | 23 regiments | the same | not found (0251) | kit-us-12c-02-arms-dress |
| dress (headgear, coat, shirt, trousers, shoes, accoutrements, sash, pack_state, flag_or_instrument) | 26 to 28 regiments each | R271 to R313; PA, NY volumes; Quint, Brown | not found (0252 to 0260) | kit-us-12c-02-arms-dress |

## Roster

- Units the record shows and the plan lacks (reported, never applied): the 10th Maine Infantry (four companies), Capt. John D. Beardsley, the corps provost guard (lines for roster, commander and the 4 July strength row: 6 officers, 164 men). The corps artillery brigade (Muhlenberg) is in group `us-art-corps`.
- Lockwood's brigade: the table footnote says it was unassigned during the battle and afterwards attached to the First Division as Second Brigade; the field return of 4 July counts it on a row of its own and the First Division row (4,363) excludes it. The plan's `us-12c-1d-lockwood` is right as a brigade and wrong if it is meant to be inside the First Division's figure.
- The First Division's brigades are printed First (McDougall), Second (Lockwood), Third (Ruger, Colgrove); the Second Division's First (Candy), Second (Cobham, Kane, Cobham), Third (Greene).
- Williams commanded the corps from 2 July (R273); Ruger the First Division, Colgrove the Third Brigade.
- 123d New York: the roster index points to the wrong section (above).

## For other groups

- `us-art-corps` (Muhlenberg's XII Corps Artillery Brigade): the return of casualties p. 185 rows "Pennsylvania Light, Battery E" (3 wounded enlisted), "4th United States, Battery F" (1), "5th United States, Battery K" (5), total 9; the field return p. 153 gives the Artillery Brigade 9 officers and 299 men, 308 (the 1st New York Battery M is not included, footnote §). The organization table p. 166 names the battery commanders.
- `us-6c`: Shaler's brigade relieved Cobham's exhausted men at 10 a.m. on 3 July (PA-GB-1904, the 111th Pennsylvania's account); the 111th Pennsylvania expended 160 rounds a man.
- `us-11c`, `us-1c`: Greene's report (R307) names the regiments sent to relieve his brigade: Dawes (6th Wisconsin), the 14th Brooklyn and 147th New York, "in all about 356 men"; the 82d Illinois, 45th New York and 61st Ohio, "about 400 men".

## Sources

OR27-1 (R008, R009, R013, R271 to R313) for the table, the returns and the reports; PA-GB-1904 (29th and 109th Pennsylvania dress), PA-GB-1914-v2 (the Adjutant General's letters: 28th, 29th, 46th, 109th, 111th, 147th Pennsylvania), NY-GB-1900-v2 (102d New York muster), NY-GB-1902-v3 (137th, 149th, 150th New York), NJ-TOOMBS-1888 (13th New Jersey badge). Declared new texts (archive.org, 24 November 2026, stream path): Quint (2d Massachusetts, 1867), Brown (27th Indiana, 1899), Hinkley (3d Wisconsin, 1912), Eddy (60th New York, 1864), Wilson (7th Ohio, 1907), Marvin (5th Connecticut, 1889), and for the gap lines Storrs (20th Connecticut), Sechrist (29th Ohio), Toombs 1876 (13th New Jersey), Cook (150th New York), the monument report of the 123d New York. No host refused. The archive.org title search (one request per query, 1 second apart) returned no regimental history for the 5th and 66th Ohio, 107th and 145th New York, 3d Maryland, the 1st Maryland regiments, 78th, 102d, 137th and 149th New York or the Pennsylvania regiments beyond the state volumes; none was fetched and none was refused.

## Not done

Every required (unit, field) pair has a line or a gap line (0 open). What the pass did not do:
- The abstract rows of the corps for 10 and 30 June and 10, 20 and 31 July (OR27-1-R008 pp. 151 to 152, present for duty and aggregate present) were not entered; the corps' strength pair rests on the field return of 4 July.
- The lists of officers killed and mortally wounded (R013 pp. 188 to 192) and company officers were not entered as `officer` lines; the commanders' changes are from the reports.
- Seven regiments have no strength, 18 no weapon line, and the dress of 1863 is a gap except the badge, the 29th Pennsylvania (1861), the 109th Pennsylvania and the 150th New York. The arms lines of 1861 and 1862 (2d Massachusetts, 27th Indiana, 3d Wisconsin, 7th Ohio, 60th New York, 5th Connecticut) are outside 26 June to 16 July 1863 and do not compile; nothing says the arms of July 1863 were different or the same.
- The 5th Connecticut history was read only for arms words; the 20th Connecticut, 29th Ohio and 150th New York histories only for strength, arms and dress words (no cover-to-cover reading).  Regiments with no regimental text beyond the Official Records are listed under Sources.

## QC sweep 2026-11-24
Corrections after the independent check of the evidence (checker exit 0 with `--coverage --require-complete`); details in `GOVERNANCE/horde/ws-kit/QC-SWEEP-2026-11-24.md`.
- Sweep B, organization-table lines under a footnote mark (CS pp. 283-290, US pp. 155-168): 1 lines (0016).
