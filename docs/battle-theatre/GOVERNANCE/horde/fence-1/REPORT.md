# Shard fence-1 report (R14, items 1-35): close-out 2026-11-13

Scope: R14.0000, E-01..E-18 (works chronology), S-001..S-016 (state schedule). These rows are earthwork, fence, building-state and hospital rows; fence relevance is marked on each row of `results.jsonl`.

Machine-readable result: `GOVERNANCE/evidence_corrections/fence-1.jsonl` (35 lines, one per row: verdict, corrected claim, sub-claims with tier, citations with source id, part, report id, printed page, verbatim quote and character offset, what stays unsupported, blocked web sources, product consequence). Proposed register entries: `proposed-register/fence-1-EG-01..19.md`. World-content request note: `GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md`. Scripts that rebuild and check everything: `scripts/` (build_corrections.py, verify_corrections.py, gen_register.py, gen_report.py).

## What was run (2026-11-13)

1. Every one of the 92 citations of the earlier pass was re-matched verbatim in the local Official Records (OR Ser. I vol. 27 parts 1-2, Cornell scan, via tools/bt/or27_find): all 92 found, each with the same report id, printed page and character offsets as before (recorded per row in `recheck`). The 92 lines of this shard in `horde/OR-RECHECK/results.jsonl` are all found=yes, none fuzzy.
2. Second witnesses: four further archive.org scans of OR vol. 27 were downloaded (warofrebellion271unit, warofrebellion012701rootrich for part 1; warofrebellion272unit, warofrebellionco272unit for part 2; sha256 in `scripts/witness.py`). Of the 205 OR citations in the new file, 154 are found in both extra scans, 39 in one, 12 in none (OCR spelling differences only, listed in each citation).
3. Every sub-claim without support was searched in OR parts 1-3, the 99-text library, three added archive.org books (Dawes 1890, Morhous 1879, Eddy 1864) and the 73 National Park Service documents now local (tmp/library/web/nps). 78 searches are logged in `lookups.jsonl` (including the failed ones). Results: 293 citations in the new file, drawn from OR-27-1 177, OR-27-2 28, NY-GB-1900 13, NPS-CLR-ROT-V1 10, NPS-CLR-1STDAY 7, ME-GB-1898 6, DAWES-1890 6, BL-3 6, JACOBS-1864 6, PA-GB-1914-v2 4, MORHOUS-1879 4, NPS-CLI-LRT 4.
4. `scripts/verify_corrections.py` re-checks all 293 citations independently (offsets in the named local file, squashed text equals squashed quote): 0 mismatches.

## Result by verdict

| verdict | rows |
|---|---|
| confirmed | 1 (E-10) |
| corrected | 12 (E-03, E-04, E-06, E-08, E-11, E-13, E-17, E-18, S-001, S-005, S-009, S-015) |
| partially_supported | 19 (0000, E-01, E-02, E-05, E-07, E-09, E-12, E-14, E-15, E-16, S-002, S-006, S-007, S-010, S-011, S-012, S-013, S-014, S-016) |
| unsupported | 2 (S-004, S-008) |
| gap | 1 (S-003) |

Sub-claims: documented/conflict 8; documented/partial 6; documented/supported 84; inferred/partial 8; inferred/unsupported 4; n/a (aggregate)/supported 2; open_gap/blocked_host 9; open_gap/contradicted 2; open_gap/partial 2; open_gap/unsupported 23.

Row status: `open_gaps` = all supportable parts closed, named gaps remain registered; `blocked_host` = what is left rests only on web pages this machine cannot read (S-003, S-004, S-008, S-016).

| id | verdict | status | corrected claim (short; the full text and every quote are in the jsonl) |
|---|---|---|---|
| R14.0000 | partially_supported | open_gaps | Close-out of fence-1 on 2026-11-13: every one of the 92 original citations is re-matched verbatim in the local Official Records (offset, report and printed page unchanged; 92 of 92 found by the OR-RECHECK pass), second witnesses ... |
| R14.E-01 | partially_supported | open_gaps | A breastwork of rails, stumps and earth stood immediately west of the Seminary building on Jul 1. Doubleday ordered Robinson's division to intrench on its arrival and Robinson set Paul's First Brigade (16th Maine, 94th NY, 104th ... |
| R14.E-02 | partially_supported | open_gaps | On the evening of Jul 1 Hancock placed Wadsworth's division on the hill east of the Baltimore pike (Culp's Hill) and the division began to intrench. Documented: the 6th Wisconsin dug without orders with about a dozen spades and ... |
| R14.E-03 | corrected | open_gaps | The 123rd NY built its breastwork on the morning of Jul 2, not Jul 1: it lay on its arms the night of Jul 1, was ordered into position next morning and built a strong breastwork along its front in the woods right of Cemetery Hill ... |
| R14.E-04 | corrected | open_gaps | No source says Cemetery Hill was fortified as a whole or that von Steinwehr built works. Documented: the infantry stood 'partly behind stone fences' on Jul 1 and 'behind stone fences surrounding the hill' on Jul 2 (Steinwehr, ... |
| R14.E-05 | partially_supported | open_gaps | Greene's brigade, camped the night of Jul 1 near Little Round Top, marched over about 06:00 Jul 2 (sunrise in Greene's 1893 address) and began at once to intrench: a close log fence of felled trees with cordwood set slanting ... |
| R14.E-06 | corrected | open_gaps | The 137th NY (Colonel Ireland) commenced a traverse on the brigade's right early on Jul 2, extended it about twenty yards, and used it that evening: after the 18:30 withdrawal the 137th occupied Kane's trenches, was attacked on ... |
| R14.E-07 | partially_supported | open_gaps | Kane's brigade (Second Brigade, Geary's division) built a breastwork of logs, stone and earth at right angles to Greene's line; the order came soon after Kane assumed command at 06:00 and Kane says it was done 'before sundown' ... |
| R14.E-08 | corrected | open_gaps | Williams's (then Ruger's) division was ordered about 09:00 Jul 2 onto Culp's Hill on Greene's right and built breastworks 'immediately' of logs, rocks and earth (Ruger); the Third Brigade (Colgrove) of rails, timber and stone, ... |
| R14.E-09 | partially_supported | open_gaps | The First Division left about 18:30 and Geary's First and Second Brigades about 19:00 (Geary, at 7 p.m., 'the First Division had gone nearly half an hour previously'); Greene was ordered to occupy the whole of the intrenchments ... |
| R14.E-10 | confirmed | open_gaps | Confirmed as an occupation, with a documented conflict on whether the works were empty: Union reports say the works were left unoccupied when the First Division and Geary's brigades withdrew (Greene, Rickards, Cobham, Kane: fire ... |
| R14.E-11 | corrected | open_gaps | Geary's own report prints the figure 277,000 rounds (confirmed in three scans), not the PDF's 227,000 or 250,000. The Union artillery bombardment began 03:30 (Geary, 'early dawn'), 03:45 (Candy) or 04:00 (Greene) and lasted ten ... |
| R14.E-12 | partially_supported | open_gaps | Per-gun earthworks on East Cemetery Hill were begun at dusk on Jul 1 (Wainwright, Hunt) by the battery crews on the artillery chief's order (Breck: 'by order of Colonel Wainwright, I caused [the position] to be intrenched'; ... |
| R14.E-13 | corrected | open_gaps | The OR does contain a construction by Vincent's brigade: the 83rd Pennsylvania stood 'behind rocks and stones hastily thrown up for defense' before the attack at 15:15 (Woodward, 83rd PA; clock 14:30 for the move into position), ... |
| R14.E-14 | partially_supported | open_gaps | Two builders are documented, not one: Weed's brigade (under Garrard, after Weed fell) strengthened the ridge 'at night' on Jul 2 by building a stone wall about halfway down the slope wherever the rocks gave no cover (Garrard); ... |
| R14.E-15 | partially_supported | open_gaps | Hazlett's battery (six 10-pounders, Hunt) was moved to the left about 16:30 and, on taking position on the summit, 'immediately opened upon the enemy' and fired until dark (Martin, Hunt); the PDF's first-fire 17:45 is not ... |
| R14.E-16 | partially_supported | open_gaps | The OR is silent about any works built by Ward's brigade before the attack: Ward's report mentions a stone wall about 160 yd ahead that both sides fought for (an existing wall), and no regimental report of the brigade reports ... |
| R14.E-17 | corrected | open_gaps | CONTRADICTED by the Official Records: rail and stone breastworks on the Cemetery Ridge line are documented by unit, material and clock window in three waves. Jul 1 evening (Robinson's division, First Corps, on the line left of ... |
| R14.E-18 | corrected | open_gaps | Confederate works are documented, though not for all five sites and not on the dates the PDF searched. Town: on the early morning of Jul 2 the Confederates began barricading the south side of Middle Street from Seminary Ridge to ... |
| R14.S-001 | corrected | open_gaps | The burning is dated to the evening of Friday Jun 26 (Jacobs; Early reached Gettysburg late on a rainy day and moved on next morning, 'the 27th', from Mummasburg). The bridge is the railroad bridge across Rock Creek east of the ... |
| R14.S-002 | partially_supported | open_gaps | Primary and secondary sources place Union signal officers on a college or seminary cupola on Jun 30 and Jul 1 but do not agree on the building: Norton (Signal Corps report) puts Buford's signal officer on Jun 30 'in the steeple ... |
| R14.S-003 | gap | blocked_host | No source read supports or refutes the Jun 30 dismantling. OR Parts 1-3 have no 'firewood' hit and the Buford/Gamble/Devin reports name no fence use on Jun 30; the 99-text library plus Dawes, Morhous and Eddy and the 73 NPS ... |
| R14.S-004 | unsupported | blocked_host | Not supported by any source readable here. OR Part 1-3 have no 'Presbyterian church' hit; Cuyler, Vollum and Letterman (R003, R004, R016) name no building; the library and the NPS documents contain no statement that a town church ... |
| R14.S-005 | corrected | open_gaps | Gamble's brigade used fences for cover on the morning of Jul 1, but the clock is about 08:00, not 07:30: Gamble was told at about 8 o'clock that the enemy was approaching and Buford puts the report between 8 and 9 a.m.; Gamble's ... |
| R14.S-006 | partially_supported | open_gaps | Fences along the Chambersburg Pike on Jul 1 are documented, but the type is a conflict: Wainwright describes a 'paling fence' running parallel to and within 50 yd of the road (east of the seminary); Dawes records a fence on the ... |
| R14.S-007 | partially_supported | open_gaps | The unfinished railroad cut west of the seminary is named by Dawes (6th Wisconsin), whose line, with the 95th NY and 14th Brooklyn, charged the cut after the Confederates took refuge in it; Davis's brigade fought there. The OR ... |
| R14.S-008 | unsupported | blocked_host | Not supported by any source readable here: 'St. Francis' and 'Xavier' have no hit in OR Parts 1-3; the library has no statement; the NPS documents mention St. Francis Xavier only as a 1918 influenza ward (Eisenhower camp history) ... |
| R14.S-009 | corrected | open_gaps | The NPS landscape inventory (from the National Register form) says Union troops themselves tore down David McMillan's fences on the morning of Jul 1 to facilitate movement, a Union battery stood in his yard, and after the Union ... |
| R14.S-010 | partially_supported | open_gaps | The rails of the Seminary Ridge barricade are documented and in part tied to fences: a Maine adjutant says Paul's brigade built the redoubt of earth and fence rails in front of the seminary; the seminary steward's neighbor Dr. ... |
| R14.S-011 | partially_supported | open_gaps | Union side: Wadsworth ordered the command to retire at 15:45 and held until then; Robinson's division withdrew at 'nearly 5 p.m.'; Confederate side: Pender ordered his three brigades forward 'about 4 o'clock' (Engelhard) and ... |
| R14.S-012 | partially_supported | open_gaps | The seminary main building was a First Corps hospital: McFarland names 'the seminary hospital' with his wounded collected there; the NPS landscape report shows battle damage on the east front (July 1863 photograph) and records ... |
| R14.S-013 | partially_supported | open_gaps | A Confederate battery stood near 'the seminary used as a Yankee hospital' on Jul 3 (Dance), so the building was in Confederate-held ground by then, and the NPS CLR has it a hospital for both sides for weeks. The late-afternoon ... |
| R14.S-014 | partially_supported | open_gaps | Same evidence as E-02: the First Division was placed on the hill by Hancock on the evening of Jul 1 and intrenched; the 6th Wisconsin dug on its own initiative and the 7th Indiana by Wadsworth's command. The window 18:00-21:00 ... |
| R14.S-015 | corrected | open_gaps | The breastwork was built on the morning of Jul 2 (Rogers, 123rd NY; Morhous 1879), after the regiment lay on its arms the night of Jul 1; see E-03. The PDF's Jul 1 stays a selectable scenario labelled contradicted by the unit's ... |
| R14.S-016 | partially_supported | blocked_host | The NPS records that the George Spangler farm served as a field hospital (corps and date not stated). The XI Corps assignment and the mid-afternoon Jul 1 hour are not supported by any source readable here. The OR 'Spangler's ... |

## Where the earlier shard text was wrong or incomplete

- E-04: the 80th NY / 151st Pa. rail-fence breastwork (Gates) is on the Cemetery Ridge line (E-17), not on Cemetery Hill; no source says von Steinwehr fortified the hill.
- E-05: Greene's 'By 13 o'clock' is 'By 12 o'clock' in two other scans; the 149th NY lists 'rails' and a 04:00 march; Jones (60th NY, 1888) gives a 10:00 finish; NPS gives a general five-foot figure for the log-crib works.
- E-06: a traverse was commenced by the 137th NY and extended about twenty yards (Greene 1893); the earlier 'no dimension' is replaced.
- E-08: Lockwood's brigade did not serve on Jul 2: it reached the First Division at 08:00 Jul 3 (own report); the 3rd Wisconsin threw down fences and walls in its front.
- E-09: 750 reinforcements = about 400 (Eleventh Corps) + about 350 (Wadsworth) (Eddy 1864); the 18:30 change is an occupation of existing works, not a construction; withdrawal clocks 18:30 (First Division) and 19:00 (Geary).
- E-11: Geary's 277,000 rounds confirmed in three scans; bombardment 03:30/03:45/04:00, ten minutes plus about fifteen.
- E-12: builders (battery crews on the artillery chief's order), window (dusk Jul 1 to morning Jul 2) and the word lunette (books, NPS) are now sourced.
- E-13: contradicted in part: the 83rd Pa. stood 'behind rocks and stones hastily thrown up' (OR27-1-R201).
- E-14: the OR does credit Weed's brigade (Garrard R217: 'At night ... building a stone wall'); Confederate reports (Benning R458, Waddell R462) saw two and three lines of stone breastworks built through the night of Jul 2-3.
- E-15: first fire 17:45 is unsupported; Hunt and Martin put it on arrival about 16:30; hauling method conflicts.
- E-17: the contradiction of the PDF is widened by unit and window (Jul 1 evening, Jul 2 from 16:00, Jul 3 morning to 18:00); the 69th Pa. breastwork date is July 2 in two scans and July 3 in the Cornell scan.
- E-18: Confederate works are documented for Jul 2 (Middle Street barricade), the night of Jul 3-4 and Jul 4; Jul 2-3 at the other sites stays a gap.
- S-001: Jun 26 evening (Jacobs, Early's sequence); the bridge is the Rock Creek railroad bridge (Gettysburg Compiler, Jun 29, 1863).
- S-002: the building is a conflict (college steeple / Seminary building cupola / College cupola); S-005: 08:00 not 07:30; S-006: type conflict now three-way; S-009: Union troops tore the fences down (NPS), then Confederates used the rails in entrenchments; S-010: 3,108 rails lost (Schmucker); S-012: holes in walls and a rebuilt northeast corner (NPS); S-016: only a general NPS field-hospital statement.
- E-01: builder (Paul's First Brigade), window (about 11:00-13:00), 22 guns (Hunt), fence rails (Maine adjutant, NPS) are now sourced; 600 yd and the curved plan remain unsupported.
- E-02/E-03: Dawes 1890 confirms the spades and the lack of orders; Morhous 1879 confirms the 123rd NY built on the morning of Jul 2 and worked until late afternoon.

## Blocked web sources (status blocked_host): URL and what to read

Tested 2026-11-13, one request each: historynet.com, hmdb.org, museum.dmna.ny.gov, gettysburgdaily.com, aleteia.org, emergingcivilwar.com, gettysburg.stonesentinels.com, battlefields.org, en.wikipedia.org all answer "CONNECT tunnel failed, response 403" from the egress proxy; blocked, not worked around. Nothing below was asserted from memory. Where the repository records a URL it is given; where it does not the entry says so and gives the title.

- **HN-Walls** (URL not recorded): HistoryNet 'Crossroads: Walls of Fame (Culp's Hill)' (URL not recorded in the PDF source list; host historynet.com refused here): read the paragraph on the 6th Wisconsin's spades and the clock window it gives for Jul 1 evening. Rows: E-02.
- **HN-Hundreds** (URL not recorded): HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded in the PDF source list; host historynet.com refused here): read the soldier's letter for the date the 123rd NY began the breastwork and for the '10 rods' distance to the heavy stone wall. / HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded; host refused here): read the soldier's letter for the 250,000 rounds and 24 guns / 3-hour shelling claims. / HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded in the PDF source list; host refused here): read the letter for the date it gives the 123rd NY's works. Rows: E-03, E-11, S-015.
- **Wiki-D1/Wiki-CH** (URL not recorded): Wikipedia pages (not a source for any documented claim under Law cl.4; host refused here); nothing to read: the claim 'von Steinwehr fortified Cemetery Hill' stays an open gap unless a primary source is found. Rows: E-04.
- **GD-219** (URL not recorded): Gettysburg Daily page cited as GD-219 (URL not recorded in the PDF source list; host gettysburgdaily.com refused here): read the length given for the first Culp's Hill works (about 300 yd) and the 800-yd figure for after 18:30. / Gettysburg Daily page cited as GD-219 (URL not recorded; host gettysburgdaily.com refused here): read the 800-yd figure and the 'single thin line' wording. Rows: E-05, E-09.
- **DMNA-60NY** (https://museum.dmna.ny.gov/unit-history/infantry-1/60th-infantry-regiment/historical-sketch): NY State Military Museum 60th NY historical sketch (host museum.dmna.ny.gov refused here): read where it puts the start of the works (the PDF says night of Jul 1-2) and the 'angles and salients through the day' text. Rows: E-05.
- **HMDB-13997** (https://www.hmdb.org/m.asp?m=13997): Historical Marker Database entry 13997 (URL formed from the marker number in the PDF key; host hmdb.org refused here): read the marker text for the start hour and builders. Rows: E-05.
- **Wiki-Culp** (URL not recorded): Wikipedia 'Battle of Culp's Hill' (URL not recorded; host en.wikipedia.org refused here; Wikipedia is not a documented source under Law cl.4): nothing to read for documented tier. Rows: E-11.
- **Wiki-ECH** (URL not recorded): Wikipedia 'East Cemetery Hill' (URL not recorded; host refused here; not a documented source under law 4): nothing to read. Rows: E-12.
- **GD-Housch** (URL not recorded): Gettysburg Daily page cited as GD-Housch (URL not recorded; host gettysburgdaily.com refused here): read the dated photographs (Jul 7, 1863) of the gatehouse and lunette area for visible earthworks. Rows: E-12.
- **NPS-LRT** (URL not recorded): NPS Little Round Top page/report cited as NPS-LRT in the PDF (exact URL not recorded; www.nps.gov is reachable but the page was not identified): the reachable NPS CLI and CLR texts are cited above instead. Rows: E-14.
- **Wiki-LRT** (URL not recorded): Wikipedia 'Little Round Top' (URL not recorded; host refused here; not a documented source under law 4): nothing to read. Rows: E-14.
- **NPS-Hazlett** (URL not recorded): NPS page cited as NPS-Hazlett in the PDF (exact URL not recorded; www.nps.gov is reachable but the page was not identified): read what it says about hand-hauling and the hour of first fire. Rows: E-15.
- **SS-8009** (URL not recorded): Stone Sentinels page 8009 (weak source in the PDF; host gettysburg.stonesentinels.com refused here): read the hauling account and the 17:45 time. Rows: E-15.
- **SS-10491** (URL not recorded): Stone Sentinels page 10491 (weak source; host refused here): read the 'one driven to the summit' account. Rows: E-15.
- **NPS-CWS10** (URL not recorded): NPS source cited as NPS-CWS10 in the PDF (exact URL not recorded; www.nps.gov and www.npshistory.com are reachable but the item was not identified): read what it says on rail breastworks on Cemetery Ridge. Rows: E-17.
- **OR27-1 p.431 page image** (https://archive.org/details/warofrebellion271unit): archive.org item warofrebellion271unit, printed p.431 (leaf 449): read the page image to settle 'July 2' vs 'July 3' in Davis's report; the image host (dn*.archive.org) is refused here, so only the OCR was compared. Rows: E-17.
- **Wiki-GBRR** (URL not recorded): Wikipedia 'Gettysburg Railroad' (host refused here; not a documented source under law 4): nothing to read. Rows: S-001.
- **Wiki-PennHall** (URL not recorded): Wikipedia page on Pennsylvania Hall (URL not recorded; host refused here; not a documented source): nothing to read. Rows: S-002.
- **GD-Fences** (https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/): Gettysburg Daily fence article recorded in terrain_sources.json for the fence sources (the PDF key GD-Fences is not tied to this URL in the PDF; mapping unconfirmed; host gettysburgdaily.com refused here): read what it says about McPherson/railroad-grade fences and Harrison's firewood claim and the critic's reply. / Gettysburg Daily fence article (mapping to the PDF key unconfirmed; host refused here): read the Chambersburg Pike fence type passage. Rows: S-003, S-006.
- **Brady photograph (mid-Jul 1863)** (https://www.loc.gov/pictures/collection/cwp/): Library of Congress Civil War photographs (www.loc.gov is reachable but the specific image was not identified): look at the Brady mid-July 1863 McPherson ridge/railroad-cut view for fence lines (photo-match workstream). Rows: S-003.
- **HMDB-17939** (https://www.hmdb.org/m.asp?m=17939): Historical Marker Database marker 17939 (URL formed from the marker number in the PDF key and the m.asp?m= pattern of other recorded HMDB URLs; host hmdb.org refused here): read the marker text for the church, the date and the cavalry unit; then find a primary source (division surgeon report, Letterman). Rows: S-004.
- **ECW fence Friday** (http://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/): Emerging Civil War 'Fence Friday: post and rail' (host refused here): read general post-and-rail dimensions and any Chambersburg Pike statement. Rows: S-006.
- **Aleteia** (URL not recorded): Aleteia page on the St. Francis Xavier parish (the exact article URL is not recorded in the PDF; the only Aleteia URL recorded in the repository is https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/ - unconfirmed as this source; host refused here): read the church-as-hospital passage, the date and its own source; then find a primary witness (a Daughters of Charity or priest account). Rows: S-008.
- **ECW-Bliss** (URL not recorded): Emerging Civil War article on the Bliss farm (exact URL not recorded in the PDF; host refused here): read the passage on the McMillan fences felled by a neighbor for Union troops. Rows: S-009.
- **HN-Spangler** (URL not recorded): HistoryNet 'The war came knocking on Spangler's barn door' (URL not recorded in the PDF source list; host historynet.com refused here): read the corps, the date and the hour of conversion and the counts. Rows: S-016.
- **Gettysburg Foundation George Spangler Farm** (https://gettysburgfoundation.org/george-spangler-farm): Gettysburg Foundation page recorded in terrain_sources.json (host refused here): read the hospital history of the farm. Rows: S-016.

## Product consequence

One request note for the world-content workstream: `GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md` (structures.json, state_schedule.json, works_stages.json and data/works3d.json entries that change, with tier, clock and source per change). No product file was touched by this shard.

## Open gaps (registered as proposed entries fence-1-EG-01..19)

- E-01: Length about 600 yd; Dismantling of a fence line over 600 yd; curved plan; Start clock of the work (only the 11:00-13:00 window from the arrival of the division); Builder conflict: First Brigade (Robinson) vs 'Second Brigade, Second Division' (McFarland); Hour the barricade was overrun
- E-02: Clock 18:00-21:00 (inferred only); 6th Wisconsin first, then the division; Logs and earth fabric on Jul 1 evening; Extent 'Stevens' Knoll to the summit' (no source names the line)
- E-03: 10-rod distance to the stone wall (web page only); Hour the work began (after about 09:00 for the division; the regiment's own clock is 'next morning')
- E-04: Whole-hill 'fortified' wording and von Steinwehr as builder; Date and extent of cemetery fence damage (Jul 2 vs Jul 3)
- E-05: Head logs, boughs in front, rifle pits; First length about 300 yd (web source only); Per-regiment height (only a general NPS statement of five feet); Slocum/Geary opposition and Greene's engineering background
- E-06: Exact build hour of the traverse; Height and profile of the traverse; Whether it was built at right angles to the main line (the OR describes the line thrown back perpendicular, not the traverse)
- E-07: Per-regiment clock times for Kane's regiments and for Wadsworth's regiments; Whether Wadsworth's works are 'on Greene's left' regiment by regiment
- E-08: Exact hour the first Williams-division works were finished; Where Lockwood's regiments stood on the morning of Jul 3 before 17:00 ('various places')
- E-09: 800-yd length; Any construction of a new extension at 18:30
- E-10: Single 'empty vs defended' answer (both carried); Exact start of the occupation inside 19:00-20:00
- E-11: Physical damage state of the works; Shelling length beyond 10+15 minutes (3 hours); 5 batteries / 24 guns (web or letter)
- E-12: 1863 dimensions of the lunettes; Which units dug each lunette beyond the battery crews' own accounts; Whether the 'lunette' shape was drawn on the first evening or only in the morning (documented: begun dusk, finished morning)
- E-13: Positive 'no works' for the 16th Michigan, 44th NY and 20th Maine (silence only); Extent and position of the 83rd PA's hasty stones (no length given); A stone wall about 150 yd east of the hill used by the 2nd US Sharpshooters (not in the sources read)
- E-14: Five Reserve regiments and an Ohio battery as joint builders; Printed hour of the start (about 20:00 is inferred); Wall length and height of the 1863 works (the 2-3 ft is a general NPS figure)
- E-15: First fire 17:45; Hand-hauling as the one method; Presence or absence of an epaulement; Ammunition run up from the caissons (not found)
- E-16: Reason for no works; Positive 'no works' for Ward's brigade; Builders, dates and locations of the Devil's Den stone walls
- E-17: Continuity of a line along Cemetery Ridge; Dimensions of any work; Printed date of the 69th Pa. breastwork (July 2 vs July 3; page image owed); Clock hours of most Jul 3 works (only 'morning', 'daylight', 'during the cannonade', '18:00')
- E-18: Confederate works on Jul 2-3 at Seminary Ridge, Warfield Ridge, Oak Hill and Benner's Hill; Dimensions of any Confederate work; Length/form of the Middle Street barricade
- S-001: Printed hour of the burning (evening only); Centre-span damage wording (OCR of the Compiler garbled; an image check is owed)
- S-002: Building identity (Pennsylvania Hall vs Schmucker Hall); Hour on Jun 30
- S-003: Jun 30 dismantling; Harrison's claim and the critic's counterclaim
- S-004: Whole claim: building, date, trigger
- S-005: 07:30 clock; Exact place name in the 1863 reports
- S-006: Post-and-rail along the whole pike
- S-007: Printed clock 'about 11:00'
- S-008: Whole claim
- S-009: 'Neighbor' as the actor; Hour of the felling and number of panels
- S-010: 600 yd of fence removed; Which fences (locations) supplied the rails
- S-011: Printed hour the barricade fell; 16:30 end
- S-012: Lost window glass; A crack (the rebuilt northeast corner is the nearest documented damage)
- S-013: Hour the seminary building passed to Confederate control
- S-014: Clock 18:00-21:00 (inferred only); 6th Wisconsin first, then the division
- S-015: Jul 1 date (contradicted)
- S-016: XI Corps ownership; Hour of conversion to a hospital

## Delegated decisions recorded

DD-FENCE1-01..20 appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (the section headed "bt-evidence, shard fence-1"). Every alternative stays selectable; nothing written to decision_log.md.

## Not run, owed, owner-only

- No gate was run, no `passes` flag touched, no product or governance data file other than the three outputs above was changed; nothing committed or deployed.
- Owed: the printed page image of OR27-1-R105 p.431 (archive.org item warofrebellion271unit, leaf 449) to settle July 2 vs July 3; an image check of the garbled Gettysburg Compiler lines on the Rock Creek bridge (S-001); reading the blocked web pages listed above from a machine with access.
- Owner-only acts: none needed for this shard (reading web pages is not an owner-only act; the PDF text itself is not changed here: the E-17 and E-03 wording is the owner's decision).

## Earlier passes (kept for history)

The pass of 2026-11-04 (results.jsonl, unchanged) read only the local OCR and found 24 verified, 5 inferred, 5 failed lookups; its audit of 2026-11-04 could not re-run or_find because the OR text was missing from that checkout. All of its citations were re-matched in this close-out; the statements it got wrong or left open are listed above.
