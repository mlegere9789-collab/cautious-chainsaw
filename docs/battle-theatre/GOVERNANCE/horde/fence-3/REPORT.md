# Shard fence-3 report (R14.S-053 to R14.S-088, 36 rows), close-out of 2026-11-13

Slice check: the 36 rows S-053..S-088 of `results.jsonl` are all present (none missing, duplicated or out of slice). Close-out output: `GOVERNANCE/evidence_corrections/fence-3.jsonl` (36 lines, 165 sub-claims, 283 citations), proposed register entries `proposed-register/fence-3-EG-01..18.md` (they supersede the ten entries of 2026-11-04, filed as register EG-0093..EG-0102; the ten old files are kept at `tmp/fence-3/superseded-register-2026-11-04/`), `extra-evidence-nov18-19.jsonl` (11 lines found outside the rows), the request note `GOVERNANCE/horde/requests/world-content-fence-3-structures.md`, delegated decisions DD-F3-01..09 (section "Added 2026-11-13 by bt-evidence, shard fence-3" of DELEGATED-DECISIONS-2026-11-11.md) and 75 lines appended to `lookups.jsonl`. Scratch and scripts: `tmp/fence-3/`.

## What the earlier report said, and what is true now

The 2026-11-04 report (36 rows: 21 verified, 3 inferred, 11 gap, 1 failed_lookup) rested on second-witness extractions because the Official Records text was not local; 19 of the 21 "verified" rows were a negative check of the PDF row text (the row prints no fence state), not a historical claim. Since then the OR text (vol. 27 pts 1-3), 99 library texts and 73 National Park Service documents are local, and the proxy lets through www.nps.gov, www.loc.gov (item and newspaper-page JSON) and tile.loc.gov, so every citation was re-matched and every printed sub-claim searched again.

## Method (what was run)
1. The quotations and embedded strings of the 36 records (66 strings, `tmp/fence-3/data/recheck_existing.json`) were re-checked with the matchers of `tools/bt/or27_find.py` (OR27 pts 1-3), `statevol_find` (New York, Pennsylvania, Maine and Michigan volumes, Battles and Leaders 3) and the 99-text library; the OR-RECHECK file has five lines for this shard: four quotes found exactly (S-056 R272 p.773 and R294 p.836, S-058 R109 p.439 and R111 p.446: same report ids, pages and offsets; the R294 offset lies inside the cited span), the fifth (S-066) is a fragment of the shard's own prose, not a source quotation, and is dropped.
2. For every row the printed claim (object, from-state, to-state, window, trigger, tier, source keys) was split into sub-claims (unit, place, hour, length, count, state at start, damage or construction window) and each was searched in OR27, the state volumes, the 99-text library (newspapers of July 1863, Jacobs, Haskell, Hospital Scenes, Meade's testimony, Bachelder), the NPS documents and pages, the Library of Congress records and, new in this close-out, the Washington Evening Star and the New-York Daily Tribune of 19-21 Nov 1863 (28 pages, read through the Library of Congress JSON API and tile.loc.gov). 62 lookups are logged inside the rows (10 failed) and 75 lines were appended to `lookups.jsonl`.
3. Every citation was written through a builder that refuses a quote it cannot find exactly once in the raw text, and a second, independent validator (`tmp/fence-3/scripts/validate.py`) cuts the span `[offset_start, offset_end)` out of the raw file named by `local_path`, compares it (whitespace and hyphen tolerant) with the quote and checks the sha256 of the text file: 283 citations, 0 problems. Two further consistency checks were run over the finished file: every double-quoted string of every sub-claim looked up in the cited quotes and notes (92 strings; 16 not found, all explained: an OCR-garbled word read in clean spelling and flagged in the citation note, the plan's own printed text such as "Gone" or "Razed 1921", or a bracketed reading), and every number of three or more digits looked up in the cited text windows (the remaining flags are row labels, plan values, catalogue numbers, bibliographic years and numbers printed in words). These checks found wording faults that were corrected before this report: the S-072 Brinton statement, the unreliable year of a Tilberg report (S-063), a Candy and a Maulsby quotation (S-056), the NY at Gettysburg quotation of S-060, "in the afternoon" in S-086, a hospital-archive location (S-063), the Hunt page for the Cushing guns (S-058), and the Sentinel's hour of the first shells (S-059).
4. Page images viewed with the image reader: the local Library of Congress derivatives of the Leister, gatehouse and second headquarters photographs and the crowd of 19 Nov (readings, no measurement), and two crops fetched from tile.loc.gov for two figures: the list of remains in the Tribune of 21 Nov 1863 (total 1,188, sub-totals 606 and 582 add to it) and the Evening Star's hour of the President's arrival (6 1/2 o'clock). Two other crops showed other text and were not used.
5. Not run: any browser or render check, any real-GPU or audio check (none is involved), the integrator (`tools/bt/evidence_merge.py`), the node suite, any gate. No `passes` flag was touched.

## Counts
Verdicts: confirmed 3 (S-064, S-067, S-078), corrected 19, partially_supported 12, unsupported 2 (S-065, S-071), gap 0. Status: closed 5 (S-064, S-067, S-074, S-078, S-081), open 10, blocked_host 21. Sub-claims: documented 124, inferred 12, open gap 29 (support: supported 102, partial 34, none 29). Citations: official reports 91, NPS and other institutional studies 93, contemporary newspapers 47, state regimental and commission volumes 27, participant letters, memoirs, catalogue records and cemetery-commission volumes 25. Verdict meanings: confirmed = every printed and shard claim supported; corrected = at least one printed or shard claim is refined or contradicted by a quoted source and the corrected claim replaces it; partially_supported = some claims supported, others without any source; unsupported = nothing supported. The row tier is documented for confirmed and corrected, inferred for partially_supported, open gap for unsupported.

| Row | Object | Verdict | Status | Register |
|---|---|---|---|---|
| S-053 | Taney house | corrected | blocked_host | EG-01 |
| S-054 | Rummel barn | partially_supported | blocked_host | EG-02 |
| S-055 | Rummel fences | corrected | blocked_host | EG-02 |
| S-056 | Culp's Hill final action | corrected | open | EG-03 |
| S-057 | Powers Hill guns | corrected | open | EG-04 |
| S-058 | Cushing's battery | corrected | open | EG-05 |
| S-059 | Leister house | corrected | blocked_host | EG-06 |
| S-060 | Meade HQ | corrected | open | EG-06 |
| S-061 | Confederate and Union gun lines | corrected | open | EG-07 |
| S-062 | Emmitsburg Road fences | corrected | blocked_host | EG-08 |
| S-063 | Brian fences | corrected | blocked_host | EG-09 |
| S-064 | Leister house/barn | confirmed | closed | - |
| S-065 | Granite Schoolhouse | unsupported | blocked_host | EG-10 |
| S-066 | Spangler | corrected | blocked_host | EG-10 |
| S-067 | Confederate position | confirmed | closed | - |
| S-068 | Klingle farm | partially_supported | blocked_host | EG-11 |
| S-069 | Plum Run and low ground | partially_supported | open | EG-12 |
| S-070 | Hospital sites | partially_supported | blocked_host | EG-12 |
| S-071 | Hummelbaugh | unsupported | blocked_host | EG-10 |
| S-072 | Armistead | corrected | blocked_host | EG-10 |
| S-073 | Trostle hospital | partially_supported | blocked_host | EG-10 |
| S-074 | Pierce house | corrected | closed | - |
| S-075 | Leister wall, gatehouse | corrected | blocked_host | EG-13 |
| S-076 | Railroad | partially_supported | blocked_host | EG-14 |
| S-077 | Camp Letterman | partially_supported | blocked_host | EG-15 |
| S-078 | McPherson house | confirmed | closed | - |
| S-079 | Rose barn, Codori barn | partially_supported | blocked_host | EG-15 |
| S-080 | Land | corrected | open | EG-16 |
| S-081 | Reburials | corrected | closed | - |
| S-082 | Layout | corrected | open | EG-17 |
| S-083 | Platform | corrected | blocked_host | EG-17 |
| S-084 | Surrounding ground | partially_supported | blocked_host | EG-17 |
| S-085 | Season | partially_supported | open | EG-18 |
| S-086 | Sun and sky | partially_supported | open | EG-18 |
| S-087 | Crowd | corrected | blocked_host | EG-18 |
| S-088 | Torch-lit evening before | partially_supported | blocked_host | EG-18 |

## Corrections to the 2026-11-04 shard (all with quotes in the JSONL)
1. S-056: the wall behind the Twelfth Corps works was attacked at dawn (battery 03:45 Candy; 1st Maryland PHB about 04:00 Maulsby; 147th PA ordered at 05:00 Geary), not at 10:00-11:00; the last charge came at 10:25-10:30 and the fighting ended between 10:30 and about 11:00; "about 12 m." is Maulsby's own end (C-031 noon alternative, documented for one regiment); the identification of the wall with the Pardee Field wall is an inference.
2. S-057: the printed trigger "Meade's HQ moves" is contradicted: the Twelfth Corps guns opened at 04:00-04:30 on the order to retake the works; the headquarters moved in the afternoon.
3. S-058: "four of six guns knocked out" is in no text (Webb: all but one silenced by 14:45); the limbers blew up about 08:00; three guns were run down to the fence at the assault; the wall and fence existed on 2 Jul.
4. S-059: the 13:00-15:00 window is supported for the shell damage, not for the burning of the rails; "all" rails, the bedstead, apple and peach trees, the spoiled spring and "2 tons" are in no text (the only peach tree is alive at about 13:00).
5. S-060: Meade's staff first withdrew to the fenced yard, then went to Slocum's headquarters on Powers Hill (NY at Gettysburg, Norton, Bachelder); a 2nd Pennsylvania Cavalry narrative names "more secure quarters in the woods, south of the Taneytown road" (second selectable destination).
6. S-061: the "Union slowdown about 13:30-14:00" is not found; the Union reply was withheld for the opening minutes and Hunt ordered the fire stopped at about 14:30; the end is given as 14:15 to 15:00 (C-029).
7. S-062: "intact morning Jul 3" is contradicted by the removals of 2 Jul (Higgins, Bodine, Humphreys, Gibbon, Harrow, Hancock, Joslin); double post-and-rail fences stood on 3 Jul; the 836-hole rail and the hours 15:30-16:15 for the fences are unsupported.
8. S-063: "nearly destroyed, Jul 3" is unsupported: the window is 1-3 Jul, removal for firewood and works; the Warren and Cope maps disagree on material; claim figures documented (195 panels, $1,028 claimed, $15 received).
9. S-066, S-072: Armistead reached the Spangler hospital at about 16:00 on 3 Jul (Brinton, Holland), not about 20:00, and died on 5 Jul at about 09:00; the summer kitchen is in no text.
10. S-068: "all fences missing, Jul 4" is not what the NPS inventory says (portions dismantled); a Tribune correspondent saw wooden fences torn down along the Emmitsburg road on 17 Nov.
11. S-074: the Pierce house was not vacant: the family was at home; Tillie returned on the forenoon of 7 Jul.
12. S-075: the Library of Congress dates the photographs July 1863 only; 6 Jul and 7 Jul are not photograph dates (7 Jul is Tillie Pierce's passage); the wall height cannot be measured; one headquarters negative (LOC 2018672035) shows leafless trees on viewing, so it is not a July view (a reading of the image, tier inferred).
13. S-077: no local text gives 10 Jul, 20 Jul, 22 Jul or 20 Nov for Camp Letterman; the camp was empty by January 1864; a Chronicling America search for the name returned nothing.
14. S-080: $2,475.87 is the price of the twelve acres sold on 14 Aug 1863, not of seventeen acres; a Tribune correspondent gives about $3,150 for the seventeen.
15. S-081: the count of 1,258 on 19 Nov is in no text; the superintendent's list printed in the Tribune of 21 Nov 1863 totals 1,188 (the NPS typescript agrees; the CLR says about 1,200); the Oct 17 and Oct 27 start dates are two sequential facts. The row is closed.
16. S-082, S-083: the existence of an iron fence on 19 Nov is not documented (three forms of the built fence); the platform has three placements ("centre of the cemetery" in the Evening Star and the Sentinel) and is called inadequately sized.
17. S-084: the row changes from unsupported to partially supported: a Tribune correspondent documents rifle-pits, scattered gear, torn-down wooden fences and marked trees along the Emmitsburg road and on the first day's field on 17 Nov; nothing describes the cemetery ground itself; the Blue Ridge is unsupported.
18. S-086, S-087, S-088: four contemporary newspapers describe a bright, unclouded morning (none says cloudy); the Tribune documents the crowd (about 15,000 civilians; at least 15,000 in town), the military escort, ladies and the governors on the platform; the President's arrival on 18 Nov is given as about 5, the afternoon, the evening and 6 1/2 o'clock; the band of the 5th New York Artillery serenaded him; torches and alcohol are in no text read.
19. S-053, S-054, S-055: occupation and shelling are documented; "ruins", "plank walls and loopholes" and "destroyed" are not. S-065 and S-071 (hospital use, evacuation, headquarters) are unsupported rows.

## Blocked hosts (probed once each on 2026-11-13, not retried, not worked around)
`gettysburg.stonesentinels.com` (keys SS-*; base URL printed in the plan p.103: https://gettysburg.stonesentinels.com/battlefield-farms/), `www.historynet.com` (HN-Spangler, HN-Thunder), `www.gettysburgdaily.com` (GD-14708, GD-Housch, GD-EmmRd), `www.savasbeatie.com` (the Hessler excerpt, exact URL https://www.savasbeatie.com/content/Titles/Fall%202014/Pickett%20Hessler/excerpt%20From%20Picketts%20Charge.pdf), `www.battlefields.org` (ABT-Charge, ABT-Letterman), `blogs.loc.gov` (https://blogs.loc.gov/loc/2023/11/where-did-lincoln-stand-while-delivering-the-gettysburg-address/) and `www.eyewitnesstohistory.com` (EWH, named in the plan as "Eyewitness to History, Lincoln's Gettysburg Address"): the proxy answers 403 on CONNECT. `chroniclingamerica.loc.gov` answers 308 to `www.loc.gov/resource/...`, whose HTML page answers a bot challenge (403): not worked around; the documented JSON API of www.loc.gov and tile.loc.gov answered normally and were the only routes used. `catalog.archives.gov` answers 200 but its search is a JavaScript application (no records returned, no key used). Wikipedia (W-CONS, Wiki-*) was not probed (not an admissible source). Rows with status blocked_host: S-053, S-054, S-055, S-059, S-062, S-063, S-065, S-066, S-068, S-070, S-071, S-072, S-073, S-075, S-076, S-077, S-079, S-083, S-084, S-087, S-088; each row's `blocked_host` lists the exact URL where the plan or a repository file records one and what must be read there; where the plan prints only a key and a title (HN-Spangler, GD-*, ABT-*, CWMed, CWN, EWH, W-CONS) the entry says so and no URL is invented. None of these leads can raise a claim above inferred (Law cl.4); local primary and institutional texts replaced them wherever they say the same thing.

## Owner-only or owed
- Pennsylvania State Archives damage claims (Rummel, Leister, Klingel; series RG 2, Board of Commissioners to Assess Damages in Border Counties) and the National Archives claim files of Abraham Brien cited by Sherfy 1972: a visit or a request; not done (owner-only acts).
- Print sources: Wills, Lincoln at Gettysburg (1992), Frassanito, Early Photography at Gettysburg (1995), Kirkwood on the Spangler hospitals, the Savas-Hessler passage on the 836-hole rail.
- Hosts that refuse the connection: read the pages listed above from a machine with access (not owner-only; not done here).
- The New York Times and Philadelphia Inquirer reports of 19-20 Nov 1863 and further newspapers of 22-23 Nov (only the Evening Star and the New-York Daily Tribune of 19-21 Nov were read).
- Full-size photographs of 19 Nov (Gardner, ppmsca-32850 to 32852) for fence lines, and a scale-based measurement of the Leister wall (photo-matching workstream).
- NPS event pages for Camp Letterman (20 Jul to 19 Nov 1863 as reported by a search summary): not located.

## Delegated decisions recorded (reversible, every alternative stays selectable)
DD-F3-01 Armistead's arrival and place; DD-F3-02 Culp's Hill wall attack and end hour (evidence addendum to C-031: Maulsby's noon is an OR value); DD-F3-03 Meade's headquarters; DD-F3-04 Powers Hill trigger; DD-F3-05 Emmitsburg Road fences by sector; DD-F3-06 no default for the Brien layout, the boundary fence and the platform; DD-F3-07 land price and reburial count; DD-F3-08 weather on 19 Nov (E-007); DD-F3-09 no default for the President's arrival on 18 Nov. A note to C-044 records that no local text gives 20 or 22 Jul. No `decision_log.md` edit.

## Disclosures
- The first re-check script of this close-out built the 285 MB corpus cache (over two minutes of CPU) outside `tools/horde/bench.sh`; it was allowed to finish and every later run reused the cache. Nothing else heavy was run outside the machine lock.
- One 503 on a newspaper page (Evening Star 21 Nov p.3) was retried once and answered; two LOC item requests and the first newspaper redirect are described above.
- Nothing was committed, pushed or deployed. Outside the owned folders only the allowed appends were made: one block to DELEGATED-DECISIONS-2026-11-11.md, lines to `progress.md` and the one request note.
