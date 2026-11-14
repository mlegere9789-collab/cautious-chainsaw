"""Write horde/fence-1/proposed-register/fence-1-EG-01..19.md after the 2026-11-13 close-out (01-15 replace the earlier text, 16-19 are new), updated 2026-11-14 (wave 4: W4 below adds to or closes entries)."""
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'proposed-register')
TH = "Searched with tools/bt/or27_find (OR Ser. I vol. 27 parts 1-3, Cornell scan) and three further archive.org scans (warofrebellion271unit, warofrebellion012701rootrich, warofrebellion272unit, warofrebellionco272unit) as second witnesses; the 99-text library plus three added archive.org books; the 73 National Park Service documents under tmp/library/web/nps. Every quoted passage is in evidence_corrections/fence-1.jsonl. "
E = []
def add(n, title, rids, cat, desc, why, searched, subst, recon, tier, competing, marking, impact, owner_q, rec, status='open'):
    E.append(dict(n=n, title=title, rids=rids, cat=cat, desc=desc, why=why, searched=searched, subst=subst, recon=recon, tier=tier, competing=competing, marking=marking, impact=impact, owner_q=owner_q, rec=rec, status=status))

add(1, "Seminary Ridge rail barricade: length, gun count, start clock, fence source", "R14 (E-01, S-010, S-011), R07, R10", "evidence missing / source conflict",
 "Close-out 2026-11-13. Documented now: a rail, stump and earth barricade west of the Seminary on Jul 1; Doubleday ordered Robinson's division to intrench; Robinson set Paul's First Brigade (16th Maine, 94th NY, 104th NY, 13th Mass., 107th Pa.) to work between about 11:00 and 13:00 (Baxter reached the front at 11:00, the 16th Maine left for the right about 13:00); 'fence rails' (Maine adjutant) and 3,108 rails lost from Dr. Schmucker's adjacent farm (NPS). Guns: Hunt gives 16 concentrated plus Stewart's 6 (22 in four batteries), Wainwright says twelve concentrated; the PDF's 20 has no OR support. Still open: the 600-yd length, the curved plan, any length of fence dismantled, the hour the barricade fell (bounded 15:45-16:30), and the builder conflict (McFarland credits the 'Second Brigade, Second Division').",
 "The record gives no length, no plan and no clock for the start or the fall of the work (Law cl.3).", TH + "Searches for 600 yd near barricade or breastwork in OR 1-3 and the library: no hit.",
 "Barricade built by Paul's brigade in the 11:00-13:00 window, length drawn as a marked gap (plausible-procedural), form selectable: circular redoubt (Maine) or a line parallel to the Seminary through the west edge of the grove (McFarland); 22 guns default (Hunt), 12-concentrated (Wainwright) and 20 (PDF) selectable.",
 "Existence, material, place, builder (First Brigade) documented; start window inferred; length and plan plausible-procedural.", "documented (existence, material, place, builder); inferred (11:00-13:00); plausible-procedural (length, plan)",
 "Builder: First Brigade (Robinson, Farnham, Moffett) vs 'Second Brigade, Second Division' (McFarland); form: circular redoubt vs line; guns 22 / 12 / 20", "Tier overlay on length and plan; builder and form listed under Where sources disagree.", "Seminary Ridge scene, Jul 1 11:00-16:30",
 "None needed unless the PDF wording is to change. Next evidence: Bachelder papers; regimental histories of the 13th Mass., 104th NY and 107th Pa.; the 1863 Seminary Ridge photographs (photo-match).", "Carry the conflicts; do not pick a default among competing values (Law cl.6).")

add(2, "Culp's Hill Jul 1 evening works and the 123rd NY date conflict", "R14 (E-02, E-03, S-014, S-015), R17", "evidence conflict (partly closed)",
 "Close-out 2026-11-13. E-03/S-015 are corrected: the 123rd NY built its breastwork on the morning of Jul 2 (Rogers; Morhous 1879: worked until late in the afternoon); Ruger's division was ordered about 09:00 and built at once; the PDF's Jul 1 stays as the contradicted scenario. E-02/S-014: Wadsworth's division was placed on the hill by Hancock on the evening of Jul 1; the 6th Wisconsin dug on its own initiative with about a dozen spades from its wagon (Dawes 1890) and the 7th Indiana began a breastwork by command (Grover). Still open: the 18:00-21:00 clock, the order of regiments ('6th Wisconsin first'), the '10 rods' distance to a stone wall (web page only), and the Jul 1 log fabric.",
 "No source prints a clock for the Jul 1 evening works (Law cl.3).", TH + "Dawes 1890 and Morhous 1879 downloaded from archive.org 2026-11-13 (not in the earlier library).",
 "Window 18:00-21:00 kept as an inferred default for E-02; E-03 default Jul 2 after 09:00 (DD-03 unchanged).", "As stated; clock window inferred.", "documented (who, tools, Jul 2 date); inferred (clock)",
 "E-03 start: Jul 1 (PDF) vs Jul 2 morning (documented); wall distance 10 rods (letter) vs about 75 yd (Ruger)", "Tier overlay on the window; PDF Jul 1 shown as contradicted.", "Culp's Hill Jul 1 evening and Jul 2 morning",
 "None.", "Keep both E-03 dates selectable; default Jul 2 per DD-03.", status='partly_closed')

add(3, "Culp's Hill traverse (E-06): build time and size", "R14 (E-05, E-06, E-09)", "evidence missing (partly closed)",
 "Close-out 2026-11-13. Documented now: the 137th NY (Ireland) commenced a traverse on the brigade's right early on Jul 2 and extended it about twenty yards (Greene, 1893 address), and fell back to it about 22:00; Jones (60th NY, 1888) gives a 10:00 finish for the log fence works; the 149th NY (Barnum) adds 'rails' to the fabric and a 04:00 march (conflict with 06:00). Still open: the hour the traverse was begun, its height and profile, head logs, boughs in front, rifle pits, the 300-yd and 800-yd lengths (web pages only).",
 "No printed hour or height for the traverse; the length figures are web-only (Law cl.3).", TH + "Searches for head log, boughs in front, 5 ft, 300 yd near Culp's Hill: no hit in OR, library or NPS except an NPS general five-foot figure for Culp's Hill log-crib works.",
 "Traverse drawn with the documented length (about 20 yd) and a marked gap for height and profile; start in the morning window (inferred).", "Length documented-secondary; the rest procedural.", "documented (builder, length); inferred (morning start); plausible-procedural (height, profile)",
 "March hour: 04:00 (149th NY) vs about 06:00 (OR) vs sunrise (Greene 1893)", "Tier overlay on the traverse.", "Culp's Hill Jul 2 morning and evening",
 "None.", "No default; carry the march-hour conflict.", status='partly_closed')

add(4, "Lockwood's brigade Jul 2 position and work", "R14 (E-08)", "evidence missing (closed)",
 "Close-out 2026-11-13: CLOSED by evidence. Lockwood's own report (OR27-1-R282 p.805) has the First Potomac Home Brigade and the 150th NY arriving and reporting to the First Division, Twelfth Corps, at 08:00 on Jul 3; Greene has him reporting at 07:30. There was no Jul 2 position or work. The remaining open item is only the exact hour the first Williams-division works were finished (Ruger: built at once after the 09:00 order).",
 "-", TH, "Lockwood enters the lower works on Jul 3 as an occupant with no construction.", "Documented from Lockwood's own report.", "documented", "07:30 (Greene) vs 08:00 (Lockwood)", "Tier overlay none needed.", "Culp's Hill Jul 3 morning",
 "None.", "Close the entry; keep the hour difference.", status='closed')

add(5, "Rounds fired by Geary's command, Jul 3: 227,000 vs 250,000 vs 277,000", "R14 (E-11)", "evidence conflict (partly closed)",
 "Close-out 2026-11-13. The OR figure is 277,000 rounds (Geary, OR27-1-R293 p.833), now confirmed in three scans (Cornell, Illinois, rootrich); 227,000 (Wikipedia) and 250,000 (a soldier's letter) have no OR support. The Union artillery bombardment began 03:30 (Geary), 03:45 (Candy) or 04:00 (Greene) and lasted ten minutes plus about fifteen minutes (Geary); fourteen pieces under Muhlenberg plus Knap's battery. Still open: the physical damage state of the works and the 3-hour shelling length (web or letter only).",
 "Damage state and the longer shelling lengths have no OR support (Law cl.3).", TH,
 "Default 277,000 (OR) with the two PDF values selectable and marked unsupported; bombardment shown 25 minutes in two bursts as the documented default.", "As stated.", "documented (277,000; 25 minutes); no tier for damage",
 "227,000 / 250,000 / 277,000; start 03:30 / 03:45 / 04:00", "Tier overlay; competing values listed.", "Culp's Hill Jul 3 03:30-11:00",
 "None.", "Carry all three figures; OR figure first.", status='partly_closed')

add(6, "East Cemetery Hill gun works: lunette form and builders", "R14 (E-12, E-04)", "evidence missing (partly closed)",
 "Close-out 2026-11-13. Builders are now documented: the battery crews on the artillery chief's orders (Breck: 'by order of Colonel Wainwright, I caused [the position] to be intrenched'; Cooper's Battery B finished four lunettes on the morning of Jul 2; the 1st NY battery men built redans or lunettes for each gun). Window: begun at dusk Jul 1, finished the morning of Jul 2, in use by 16:00. The word lunette is not in the OR; the 1900-1914 books and the NPS use it. Still open: the 1863 dimensions (the preserved lunettes were reconstructed in 1878 and measure about 30 in high: not an 1863 profile).",
 "No 1863 measurement exists; the modern works are rebuilt (Law cl.3).", TH,
 "Lunettes drawn per gun with a marked gap for dimensions.", "Form and builders documented-secondary; dimensions procedural.", "documented (existence, builders, window); plausible-procedural (profile)",
 "-", "Tier overlay on the lunette profile.", "East Cemetery Hill, Jul 1 dusk to Jul 2 16:00",
 "None.", "Do not use the 30-in figure for 1863.", status='partly_closed')

add(7, "Little Round Top and Devil's Den: no-works claims, hand-hauling, first fire 17:45", "R14 (E-13, E-14, E-15, E-16)", "evidence conflict",
 "Close-out 2026-11-13. E-13 is contradicted in part: the 83rd Pa. stood 'behind rocks and stones hastily thrown up for defense' before the attack (Woodward, OR27-1-R201). E-14: both builders documented: Weed's brigade 'at night' Jul 2 (Garrard R217), Fisher's Reserves in the morning Jul 3 (Fisher R220), plus two to three or four lines of stone breastworks seen from the Confederate side built through the night (Benning R458, Waddell R462) and the NPS statement; the PDF's five Reserve regiments and Ohio battery as builders are unsupported. E-15: first fire on arrival about 16:30 (Hunt, Martin), not 17:45; hauling method conflicts (by hand, with horses and infantry, teams). E-16: the OR is silent for Ward's brigade; NPS says stone wall defense works were built near Devil's Den (builder and date unstated). Still open: positive 'no works' for three of Vincent's regiments and for Ward's brigade; the hauling method; whether an epaulement existed.",
 "Silence in the reports is not proof of absence; the hauling accounts conflict (Law cl.3).", TH,
 "Show the 83rd PA's hasty stones; both E-14 builders as scenarios (default Garrard night Jul 2); first fire on arrival; hauling method a selector.", "As stated.", "documented (builders, windows); inferred (hour of the wall start); gap (hauling method)",
 "Builder: Weed's brigade night Jul 2 vs Fisher morning Jul 3; hauling: hand vs horses vs teams; guns six (Hunt) vs four (NY narrative)", "Tier overlay; scenarios.", "Little Round Top Jul 2 14:30 to Jul 3 morning",
 "None.", "Carry the scenarios.")

add(8, "Cemetery Ridge rail and stone breastworks (E-17): PDF says none found, OR says documented", "R14 (E-17)", "evidence conflict (partly closed)",
 "Close-out 2026-11-13. CONTRADICTION confirmed and widened: rail and stone breastworks are documented by unit, material and window on Jul 1 evening (Robinson's division on the line left of Cemetery Hill, parallel with the Emmitsburg road), Jul 2 from about 16:00 (Harrow's regiments, the 7th Michigan, the 80th NY and 151st Pa.), and Jul 3 (28th Mass., 69th Pa., Stone's brigade, Vermont brigade, 142nd, 121st and 69th/71st Pa., 88th Pa. at 18:00). Still open: continuity of a line, dimensions, per-regiment clocks, and the 69th Pa. date (July 2 in two scans, July 3 in the Cornell scan).",
 "No source prints a length or profile and none states continuity (Law cl.3).", TH,
 "Works built on screen in the documented windows (DD-02), regiment-length short works, dimensions marked as a gap.", "Existence, units, materials documented; dimensions procedural.", "documented (existence, units, materials, windows); plausible-procedural (dimensions)",
 "69th Pa.: July 2 vs July 3; Robinson relieved about 10:00 (Baxter) vs noon (Coulter)", "Tier overlay; the PDF wording shown as contradicted.", "Cemetery Ridge Jul 1 17:00 to Jul 3 18:00",
 "Rewording of the PDF E-17 text is the owner's call (the text is not changed here).", "Adopt the documented works; keep the PDF wording as a selectable scenario (DD-02).", status='partly_closed')

add(9, "Confederate works Jul 2-3 (E-18): sites other than the night of Jul 3-4 intrenching", "R14 (E-18)", "evidence missing (partly closed)",
 "Close-out 2026-11-13. Documented now: a Middle Street barricade begun early Jul 2 (Jacobs); McMillan's fencing used in Confederate entrenchments after Jul 1 (NPS); Ewell's divisions intrenched the hills near the town on the night of Jul 3-4 and Jul 4 (Steuart, O'Neal, Pickens, Goodgame, Hopkins); Hood's division ordered to erect breastworks facing down the Emmitsburg road on Jul 4 (Benning); the Texas brigade breastworks; Lee's order of Jul 4 along the whole ridge from Oak Hill to the Emmitsburg road (NPS). Still open: any Confederate work at Seminary Ridge, Warfield Ridge, Oak Hill or Benner's Hill on Jul 2-3, and all dimensions.",
 "No source found for Jul 2-3 works at those sites (Law cl.3).", TH + "Part 2 search for intrench, fortif, breastwork, rifle-pit, barricad, abatis, earthwork read through R570; no hit for 'Benner'.",
 "Dated Confederate works drawn from Jul 3-4 night; Jul 2-3 sites stay marked gaps.", "As stated.", "documented (Jul 3-4 works, Middle Street barricade); open gap (Jul 2-3 at the other sites)",
 "-", "Tier overlay.", "Seminary Ridge and the town, Jul 2-4",
 "None.", "Keep the Jul 2-3 gap visible.", status='partly_closed')

add(10, "McPherson / railroad-grade fences on Jun 30", "R14 (S-003)", "evidence conflict / evidence missing",
 "Close-out 2026-11-13. No source supports or refutes the Jun 30 dismantling: OR 1-3 have no 'firewood' hit, the library, three added books and the NPS documents contain no statement; the NPS First Day CLR only says fences on the McPherson Farm were destroyed in July 1863 (caption). The Gettysburg Daily article is not readable here.",
 "No wartime account found (Law cl.3).", TH,
 "No state change by default; both PDF scenarios kept.", "-", "open gap", "Harrison (dismantled) vs critic (no account)", "Contested marker.", "McPherson Ridge Jun 30",
 "None.", "Retry when the host is reachable; photo-match the Brady mid-July view.")

add(11, "Hospital buildings S-004, S-008, S-012, S-013, S-016", "R14 (S-004, S-008, S-012, S-013, S-016)", "evidence missing",
 "Close-out 2026-11-13. S-004 (Presbyterian church) and S-008 (St. Francis Xavier) have no source here; S-012 and S-013 (seminary): hospital documented (McFarland R060, Dance R532, NPS: hospital for both sides for weeks), damage documented only as holes in walls and a rebuilt northeast corner (NPS), glass loss not documented; S-016 (George Spangler farm): a field hospital per the NPS, corps and hour not documented.",
 "Place-level hospital records are not in the OR (Law cl.3).", TH,
 "Use only the documented parts; mark the rest as gaps.", "-", "documented (seminary hospital, Spangler farm hospital); open gap (church uses, glass loss, XI Corps, hours)", "-", "Tier overlay.", "Town and seminary hospital scenes",
 "None.", "Seek a primary source (corps medical director reports, Letterman's returns by place).", status='partly_closed')

add(12, "Chambersburg Pike fence type: paling vs post-and-rail", "R14 (S-006)", "evidence conflict",
 "Close-out 2026-11-13. Wainwright (OR27-1-R071 p.357) says a paling fence parallel to and within 50 yd of the road; Dawes (R035 p.276) a fence on the turnpike; the NPS First Day CLR says the north side through the McPherson Farm was lined by Virginia worm fence in 1863. 'Post-and-rail along the whole pike' has no source here (web only).",
 "Fence type differs by reach and source (Law cl.6).", TH,
 "Fence type a per-reach selector; no default.", "-", "documented (presence); conflict (type)", "paling / post-and-rail / Virginia worm", "Scenario selector.", "Chambersburg Pike Jul 1",
 "Which type is the default? Until decided, none.", "Carry all three by reach.")

add(13, "McMillan fence felling on Jul 1", "R14 (S-009)", "evidence conflict (partly closed)",
 "Close-out 2026-11-13. The NPS landscape inventory says Union troops tore down David McMillan's fences on the morning of Jul 1 and, after the Union withdrawal, the Confederates used his fencing in entrenchments; the PDF's 'neighbor reportedly' (Emerging Civil War) is not readable here.",
 "The felling is not in the OR (Law cl.3).", TH,
 "Actor default 'Union troops' (NPS), 'neighbor' selectable.", "-", "documented-secondary (NPS)", "Actor: neighbor (ECW) vs Union troops (NPS)", "Tier overlay.", "McMillan farm Jul 1",
 "None.", "Carry both actors.", status='partly_closed')

add(14, "Second Brigade (Kane) breastwork on Culp's Hill: Jul 2 morning (PDF) vs \"before sundown\" (Kane)", "R14 (E-07), R17", "evidence conflict",
 "Close-out 2026-11-13. Kane assumed command at 06:00 Jul 2 and says the brigade was ordered into line soon after and threw up a substantial breastwork before sundown; Cobham: a breastwork of logs, stone and earth at right angles to the Third Brigade, remained until evening; Greene 1893 places Kane's 400 men next on his right in the line he describes after the early-day works. Wadsworth's men: Cutler's brigade threw up breastworks. No per-regiment clocks.",
 "No clock for the start (Law cl.3).", TH,
 "Window 06:00 to before sundown; default morning to early afternoon.", "-", "inferred", "Jul 2 morning (PDF) vs before sundown (Kane)", "Both windows listed.", "Culp's Hill Jul 2",
 "Which window is the default? Until decided, none.", "Carry both.")

add(15, "Steuart on Culp's Hill, night of Jul 2: works empty (Rickards, PDF) vs works defended (Steuart, Johnson)", "R14 (E-10)", "evidence conflict",
 "Close-out 2026-11-13. Confirmed as a two-version conflict: Union reports (Greene, Rickards, Cobham, Kane) say the works were left unoccupied and the enemy took possession; Steuart and Johnson say Steuart charged a work and scattered the enemy behind it; Ewell says Steuart took part of the breastworks and held them until ordered out at noon. Clock: Johnson attacked about dusk; Greene was attacked a few minutes before 19:00 and found the enemy in the works about 20:00; Steuart rested from about 23:00 (OCR 'lip. m.' in the Cornell scan, '11 p. m.' in the BYU scan).",
 "The sources disagree (Law cl.6).", TH,
 "Both versions selectable; no default.", "-", "documented (occupation, duration); conflict (empty vs defended)", "Empty vs defended", "Both versions listed.", "Culp's Hill lower works, Jul 2 19:00 to Jul 3 noon",
 "Which version is the default? Until decided, none.", "Carry both.")

add(16, "69th Pennsylvania breastwork date: July 2 or July 3 (OR27-1-R105 p.431)", "R14 (E-17)", "evidence conflict (OCR)",
 "Captain Davis's report reads 'on the morning of July 3' in the Cornell scan and 'on the morning of July 2' in the archive.org Illinois (warofrebellion271unit) and rootrich (warofrebellion012701rootrich) scans (printed p.431; leaf 449 of the Illinois item). The page image could not be read (the archive.org data-node host is refused by the egress proxy).",
 "Page image not readable from this machine.", "Three OCR scans compared 2026-11-13.", "Both dates carried; neither promoted.", "-", "inferred (OCR witnesses disagree)", "July 2 (2 scans) vs July 3 (1 scan)", "Date shown with both readings.", "69th Pa. at the Angle, Jul 2 morning or Jul 3 morning",
 "None (a page-image check by any reader with image access settles it).", "Read leaf 449 of archive.org item warofrebellion271unit.")

add(17, "Signal post building on Jun 30-Jul 1: Pennsylvania Hall cupola vs Schmucker Hall cupola (S-002)", "R14 (S-002)", "evidence conflict",
 "Norton (OR27-1-R017 p.201): Buford's signal officer on Jun 30 'in the steeple of the college'; the NPS First Day inventory: Buford used the cupola of the Seminary building on Jun 30; Jacobs (1864): a signal officer on the College cupola at 08:30 Jul 1 and Lee on it on Jul 3. No source names Pennsylvania Hall.",
 "The sources name 'college' or 'Seminary building', not the hall (Law cl.3).", TH,
 "Both buildings selectable; default the primary wording 'college' (Pennsylvania Hall).", "-", "documented (event); inferred (building)", "Pennsylvania Hall vs Schmucker Hall", "Building choice shown with both sources.", "Signal post, Jun 30 and Jul 1",
 "None.", "Carry both.")

add(18, "Web-only sources for the fence shard: URLs and what to read (blocked from this machine)", "R14, R21", "evidence blocked (host)",
 "The PDF rests rows on pages at hosts refused here (HistoryNet, HMDB, NY State Military Museum, Gettysburg Daily, Emerging Civil War, Aleteia, Stone Sentinels, Wikipedia). evidence_corrections/fence-1.jsonl lists, row by row, the URL where one is recorded in the repository (DMNA 60th NY sketch https://museum.dmna.ny.gov/unit-history/infantry-1/60th-infantry-regiment/historical-sketch; HMDB 13997 and 17939 formed from the marker numbers; Gettysburg Daily https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/; Emerging Civil War http://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/) and says 'URL not recorded' where none is (HistoryNet titles: Walls of Fame, Hundreds of Rebels Lay, King of the Hill, Dorsey Pender's July 1 attack, Spangler's barn). Nothing was asserted from memory.",
 "The egress proxy refuses these hosts (CONNECT 403, tested 2026-11-13).", "One request per host on 2026-11-13: historynet.com, hmdb.org, museum.dmna.ny.gov, gettysburgdaily.com, aleteia.org, emergingcivilwar.com, gettysburg.stonesentinels.com, battlefields.org, en.wikipedia.org: all refused. No workaround attempted.",
 "None applied; the claims stay as the PDF's scenarios with their tier.", "-", "open gap", "-", "Visible marker where a claim rests only on a blocked page.", "-",
 "Reading these pages is not an owner-only act: any machine with access (or the owner) may read them; the exact step is listed per row.", "Retry from a machine with access; confirm each claim against a non-lead source.")

add(19, "1863 dimensions of every Gettysburg field work (lengths, heights, profiles) and the rebuilt works", "R14 (all E rows), R13", "evidence missing (cross-cutting)",
 "No source read gives an 1863 measurement of any work built by the armies: the only figures are general (NPS: rapid works mostly under 3 ft; Culp's Hill log-crib works built to five feet; stone wall works 2-3 ft; the reconstructed East Cemetery Hill and Stevens Knoll lunettes about 30 in high; Greene 1893: a traverse extended about twenty yards). The preserved Culp's Hill earthworks (1882), Rowley's (1887), Caldwell's (1891), the East Cemetery Hill lunettes (1878), Stevens Knoll (1880-90), McGilvery's and Poague's lunettes and the Little Round Top stone walls were reconstructed or rehabilitated, so their profiles are not 1863 evidence.",
 "None was measured in 1863 or the measure is not in the record (Law cl.3).", TH,
 "Every work is drawn with an overlay marking the dimensions as plausible-procedural; no profile from a rebuilt work.", "-", "plausible-procedural", "-", "Dimension overlay on every works record.", "All earthworks",
 "None.", "Look for the 1863-64 engineer surveys and the Warren survey notes (map workstream).")

# ---- wave 4 (2026-11-14): additions to the entries above (the 2026-11-13 text stays; each addition is dated)
W4 = {
 1: dict(desc=" WAVE 4 (2026-11-14): the curved plan is now sourced as a conflict of form: a circular redoubt of earth and fence rails 'just in front of the seminary' (Small, 16th Maine, 1886) and a 'semicircular line of breast works' west of the seminary (Toombs 1888) against McFarland's line through the west edge of the grove (OR27-1-R060); Bates 1875: ordered as the line to which the division could fall back; the hour it was turned: Cooper 'after 4 p.m.', Pender 'about 4 o'clock', NPS 'by about 5:00 p.m.'. Still open: the 600 yd length, any length of fence removed, the start clock.",
         competing=" Form: circular (Small) / semicircular (Toombs) / line (McFarland); overrun: after 4 p.m. (Cooper) / about 4 (Pender) / by about 5 p.m. (NPS)."),
 2: dict(desc=" WAVE 4 (2026-11-14): Curtis 1891 says the 24th Michigan's remnant ('the ninety and nine of the regiment that rallied around the flag') built a line of breastworks on Culp's Hill 'the first night of the battle', on the left of the Iron Brigade's new line 'from the top of the elevation to the foot of the hill facing the town'; no hour, no fabric; the clock window 18:00-21:00 stays inferred."),
 5: dict(desc=" WAVE 4 (2026-11-14): the 5th Maine battery's history (Maine at Gettysburg, 1898) says 'Twenty guns in all opened at 4 a. m. ... This cannonade was continued with but short intervals until 10 a. m.'; carried against Geary's ten minutes plus about fifteen; the damage state of the works is still not described anywhere read.",
         competing=" Duration: ten minutes plus about fifteen (Geary) / 4 to 10 a.m. with short intervals (5th Maine battery history) / 30 minutes to 3 hours (PDF)."),
 6: dict(desc=" WAVE 4 (2026-11-14): the builder, fabric and hour are a three-way conflict of testimony: the OR (battery crews, light earthworks at dusk, lunettes finished the morning of Jul 2); Bates 1875 and Curtis 1891 (Steinwehr's division, solid lunettes with 'smooth and perfectly level platforms' during Jul 1; the New York and Pennsylvania volumes and Toombs and Pierce also call Steinwehr's position fortified); Hancock (letter of 17 Jan 1878, who reached the hill about 15:00-15:30): 'a great error ... all that I saw ... were some holes (not deep) dug to sink the wheels and trails'. Biddle 1880: Bates's authority 'does not appear'. No 1863 report credits Steinwehr.",
         competing=" Builders and fabric: battery crews, light, dusk (OR) / Steinwehr's division, solid, during Jul 1 (Bates, Curtis) / holes for wheels and trails only at 15:00-15:30 (Hancock).",
         rec=" Default stays the OR scenario (DD-FENCE1-16); the other two are selectable with their tier (DD-FENCE1-22)."),
 7: dict(desc=" WAVE 4 (2026-11-14): the NPS Little Round Top report quotes veterans: the 44th NY 'threw up a small breast-work' on Jul 2 (Nash 1911); the 140th NY 'built stone walls in the dark' (Hazen 1894); the 146th NY was 'instructed by Colonel Garrand to erect a rough stone wall' before the attack of Jul 2 (Brainard 1915); a veteran of the 1st Pa. Reserves wrote in 1892 that the breastworks in front of the 16th Michigan 'were not there at the time of the battle' and were thrown up the night of Jul 3 'principally by Crawford's Division'; Pennsylvania at Gettysburg: the 91st Pa. threw up a stone wall during the night. The Ohio battery as a builder has no support. E-15: the First Minnesota (1916) also has the guns dragged by hand.",
         competing=" Slope works: night Jul 2 (Garrard, 91st Pa., 140th NY) / before the attack Jul 2 (146th NY history) / morning Jul 3 (Fisher) / night Jul 3 (Hamilton 1892)."),
 8: dict(desc=" WAVE 4 (2026-11-14): the 69th Pa. date is settled by the page image (EG-16 closed): 'on the morning of July 2'. The 126th NY (Hays's division) made breastworks of 'a low stone wall, and an old rail fence' on the crest from about 08:00 on Jul 2 (Willson 1870). NPS Common Pride: earth thrown over the existing stone wall by Gibbon's division, the 20th Mass. behind a rail-topped work, one printed height 'a little over knee-high', the 13th Vermont's forenoon rail work under Sergeant Scott."),
 9: dict(desc=" WAVE 4 (2026-11-14): the NPS Cultural Landscapes Inventory (Pickett's Charge area) lists documented 1863 Confederate defenseworks at McMillan Woods (earthworks, rifle pits), Pender's Division (earthworks), Poague's Battalion (lunettes) and Spangler Woods without dates; a photograph of Confederate prisoners on a stacked-rail breastwork on Seminary Lane is dated circa 15 Jul 1863. The days of building at these sites stay open."),
 10: dict(cat="evidence conflict (partly closed)", status='partly_closed', repl=[("No source supports or refutes the Jun 30 dismantling:", "At the first close-out no source read supported or refuted the Jun 30 dismantling (see WAVE 4 below):")],
          desc=" WAVE 4 (2026-11-14): the NPS Historic Structures Report of the McPherson farm says that on the Tuesday night before the battle (Jun 30) the tenant Slentz watched men tear down his fencing 'for firewood and for possible use as breastworks on the morrow' and that Buford's troopers cut and threw down about a quarter mile of post and rail fence 'to make way for the battle' and used another cord of rails for firewood; it cites Hall's Sixth New York Cavalry (1908) and Slentz's claims, but the phrase is not in the local text of Hall; the NPS First Day report adds that most fences along the Chambersburg Pike were destroyed (McPherson claimed 6,844 rails). The railroad-grade claim (Harrison) and the critic's reply are still web-only.",
          competing=" Harrison (along the railroad grade) / NPS Historic Structures Report (a quarter mile of fence on the McPherson farm, Jun 30 evening; secondary, partial) / critic (no wartime account)."),
 11: dict(status='partly_closed', repl=[("S-004 (Presbyterian church) and S-008 (St. Francis Xavier) have no source here;", "At the first close-out S-004 (Presbyterian church) and S-008 (St. Francis Xavier) had no source here (see WAVE 4 below);"), ("S-016 (George Spangler farm): a field hospital per the NPS, corps and hour not documented.", "S-016 (George Spangler farm): a field hospital per the NPS, corps and hour not documented at that time (corps now documented, see WAVE 4 below).")],
          desc=" WAVE 4 (2026-11-14): S-004: the documented church hospital is Jul 1 after noon, not Jun 30: the 8th Illinois Cavalry's surgeons moved their wounded from the depot hospital to 'the Presbyterian church near the center of the town' (Hard 1868); the Cavalry Corps tablet stands before the church (NPS 1932 list; NPS treatment guidelines); the marker page (Jun 30, 208 Baltimore St) is unreadable here. S-008: the Catholic church was a hospital for both armies from Jul 2-3 (Bates 1875) through the Sunday after the battle (Stoever); 'by noon Jul 1, pews removed, boards laid' (Aleteia) has no source. S-016: the Eleventh Corps hospital at the George Spangler farm is documented (NPS Common Pride vol. 2: Dr. Brinton's 2nd Division hospital, Armistead there on the afternoon of Jul 3; NPS 1988; Bates 1875); the opening day and hour are not. S-012: the Adams Sentinel of 21 Jul 1863 says the seminary 'was struck by a number of shells and balls'."),
 12: dict(repl=[("Dawes (R035 p.276) a fence on the turnpike;", "Dawes (R035 p.276) a fence on the turnpike without a type;")], desc=" WAVE 4 (2026-11-14): Dawes (1890): 'the two post and rail fences that lined the turnpike' where the 6th Wisconsin charged on Jul 1; Fairfield (National Tribune, via the NPS) found an old fence on the south side and 'a new post-and-rail fence' on the north side, Sullivan (memoir, via the NPS) 'a stake and rider fence on each side'; fences on both sides are therefore documented for the McPherson-farm stretch (type: a conflict), paling for the stretch near the seminary (Wainwright), Virginia worm for the NPS's 1863 north-side fence; no whole-pike type."),
 16: dict(cat="evidence conflict (closed by page image)", status='closed',
          set=dict(why="Closed: the page image of OR27-1 p.431 was read (2026-11-13 and again 2026-11-14).", searched="Three OCR scans compared 2026-11-13; the page image of leaf 449 of warofrebellion271unit (rendered at 300 dpi) looked at.",
                   subst="None needed: the printed date is the morning of July 2.", recon="Davis's report prints 'on the morning of July 2'; the 69th Pa. built its rail-and-stone breastwork that morning on Webb's order.", tier="documented (printed text of the report)",
                   competing="July 3 (Cornell OCR only; a misread digit) is no longer a competing value.", marking="Date shown as the morning of July 2.", impact="69th Pa. at the Angle, Jul 2 morning", owner_q="None."),
          desc=" WAVE 4 (2026-11-14): CLOSED. The page image of OR27-1 p.431 (leaf 449 of warofrebellion271unit, rendered at 300 dpi and looked at) prints 'rails, strengthened with stone, on the morning of July 2, and remained in that position till the enemy advanced upon us, about 4 o'clock in the afternoon'; the same page says the battle began 'on the 3d instant' and the regiment 'still held the position assigned us the day previous'. The Cornell scan's 'July 3' is a misread digit. Crops and sha256 in horde/fence-1/image_checks.json.",
          rec=" Close the entry: July 2 morning is the printed date."),
 17: dict(desc=" WAVE 4 (2026-11-14): the Jul 1 morning post is documented as the Seminary cupola (Bates 1875 quoting the signal officer: 'early in the morning taken his station in the cupola of the Theological Seminary'; Toombs; the New York monuments volume; Bachelder's guide), while Norton's 'steeple of the college' is dated Jun 30 and Jacobs's 'College cupola' is one of Howard's signal officers at 08:30 on Jul 1: two buildings, two events; whether Norton's college steeple is Pennsylvania Hall is not stated in any source read."),
 19: dict(desc=" WAVE 4 (2026-11-14): further figures found: Olmsted (two weeks after the battle, via the NPS First Day report) of the Federal breastworks: loose stones gathered at night with a little earth, 'not more than three feet high ... like the slightest kind of stone fence of our New England sheep-pastures'; 'a slight barricade of stones, fence rails and knapsacks filled with dirt a little over knee-high' (one regiment's work in Harrow's brigade, NPS Common Pride); traverses 'about thirty feet apart' at right angles to a stone wall on the Emmitsburg road (Bachelder 1873); a 1940 NPS survey of the surviving works (20 to 30 inches, modern, not 1863). None is a profile of a named 1863 work."),
 18: dict(desc=" WAVE 4 (2026-11-14): the nine hosts were asked once more on 2026-11-14 (one request each): all still answer CONNECT 403 (log in tmp/fence-1/run4/host_probe_2026-11-14.txt). Rows that changed from blocked to partly read: S-003 (NPS Historic Structures Report), S-004 (Hard 1868), S-008 (Bates, Barton, Stoever), S-016 (NPS, Bates); what still rests only on the web pages: S-003 'along the railroad grade' and the critic; S-004 Jun 30 and the address; S-008 'by noon Jul 1, pews removed'; S-016 hour."),
}
for e in E:
    w = W4.get(e['n'])
    if not w: continue
    if 'desc' in w: e['desc'] += w['desc']
    if 'competing' in w: e['competing'] = (e['competing'] or '') + w['competing']
    if 'rec' in w: e['rec'] = (e['rec'] or '') + w['rec']
    if 'cat' in w: e['cat'] = w['cat']
    if 'status' in w: e['status'] = w['status']
    for k, v in w.get('set', {}).items(): e[k] = v
    for a, b in w.get('repl', []):
        assert a in e['desc'], (e['n'], a)
        e['desc'] = e['desc'].replace(a, b, 1)
    if e['n'] == 16: e['desc'] = e['desc'].replace("The page image could not be read (the archive.org data-node host is refused by the egress proxy). ", "At the first close-out (2026-11-13) the page image had not yet been read. ")

os.makedirs(OUT, exist_ok=True)
for e in E:
    n = e['n']; pid = 'fence-1-EG-%02d' % n
    rows = [('ID', pid), ('Requirement IDs', e['rids']), ('Category', e['cat']), ('Description', e['desc']),
            ('Why literal 100% is not possible or blocked', e['why']), ('Evidence searched', e['searched']),
            ('Autonomous substitute applied', e['subst']), ('Strongest evidence-based reconstruction', e['recon']),
            ('Confidence tier', e['tier']), ('Competing values', e['competing']), ('Product marking', e['marking']),
            ('Visual and audio impact', e['impact']), ('Review status', 'internal review only (DEC-006: no public review label)'),
            ('Owner decision requested', e['owner_q']), ('Agent recommendation', e['rec']),
            ('Status', e['status'] + (' (close-out 2026-11-13 by shard fence-1; for n=16..19 proposed new)' if n >= 16 else ' (updated by the close-out 2026-11-13; the earlier text is superseded)') + ('; updated 2026-11-14 (wave 4)' if n in W4 else '')),
            ('Owner decision and date', '(filled only from the Decision Log)')]
    body = '# %s: %s\n\n| Field | Content |\n|---|---|\n' % (pid, e['title']) + ''.join('| %s | %s |\n' % (a, str(b).replace('|', '/')) for a, b in rows)
    open(os.path.join(OUT, pid + '.md'), 'w', encoding='utf-8').write(body)
print('wrote', len(E), 'entries to', os.path.abspath(OUT))
