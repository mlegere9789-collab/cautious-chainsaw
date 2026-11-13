from spec_lib import R, S, C, B, L
ROWS = []

_E02_SUBS = lambda: [
  S('a', "Evening of Jul 1: Wadsworth's First Division, I Corps, was ordered to the hill on the right of the cemetery (Culp's Hill) and held it Jul 2-3; Hancock placed it there.", 'documented', 'supported', [
    C('OR1','R032',"On the evening of the 1st, we were ordered to occupy a hill on the right of the cemetery"),
    C('OR1','R076',"First Corps, and a battery (thought to be the Fifth Maine) were placed on the eminence just across the turnpike"),
    C('OR1','R035',"in open field on Culp's Hill"),
    C('LIB','NY-GB-1900',"under orders from General Hancock, occupied Culp’s Hill, or that part of it on the right of the Eleventh Corps, and commenced throwing up earthworks")],
    note="R032 says 'a hill on the right of the cemetery' without the name; R035 (Dawes) and the 1900 New York volume name Culp's Hill. The New York volume is a 1900 narrative (secondary)."),
  S('b', "The 7th Indiana began a temporary breastwork on arrival, by command of Wadsworth, on the hill east of Gettysburg that formed the extreme right of the line.", 'documented', 'supported', [
    C('OR1','R038',"By command of General Wadsworth, we took up a position on the hill east of Gettysburg, forming at that time the extreme right of our lines"),
    C('OR1','R038',"We immediately commenced the construction of a temporary breastwork"),
    C('LIB','NY-GB-1900',"joined its command at Culp’s Hill on the evening of July")],
    note="Grover does not name Culp's Hill; the 1900 New York volume does."),
  S('c', "6th Wisconsin (Dawes) intrenched on its own initiative, using a dozen spades and shovels from the regimental wagon, on the right of the brigade line (participant memoir, 1890).", 'documented', 'supported', [
    C('LIB','DAWES-1890',"In the wagon were a dozen spades and shovels."),
    C('LIB','DAWES-1890',"There were no orders to construct these breastworks, but the situation plainly dictated their necessity"),
    C('LIB','DAWES-1890',"Taking our place on the right of the line of the brigade")],
    note="Dawes's official report (R035) does not mention digging; the claim rests on his 1890 memoir (a retrospective first-person account, secondary). Tier kept documented (named participant, non-lead source), source class stated."),
  S('d', "Clock window about 18:00-21:00 Jul 1.", 'inferred', 'unsupported', [],
    note="The OR gives only 'evening' (Wadsworth) and 'the succeeding night' (Grover); retreat from the town ended about 16:00-17:00 (Cutler: in action 10 a.m. to 4 p.m.; Robinson: withdrew nearly 5 p.m.). No source prints a clock for the start. The window stays an inferred value with its gap mark."),
  S('e', "The 6th Wisconsin began first and the rest of the division followed.", 'open_gap', 'unsupported', [],
    note="Dawes says only that his regiment dug on its own initiative; Grover's 7th Indiana began 'immediately' on arrival by Wadsworth's command. No source orders the regiments."),
  S('f', "Fabric: logs and earth.", 'open_gap', 'unsupported', [],
    note="Sources say 'temporary breastwork' (Grover) and 'earthworks' (1900 volume); logs are not named for Jul 1 evening."),
]
ROWS.append(R('R14.E-02', 'partially_supported', 'open_gaps',
 pdf_claim="Culp's Hill north slope, Stevens' Knoll to the summit: spades and shovels (about a dozen from the 6th Wisconsin's wagon), logs and earth; Wadsworth's 1st Division led by the 6th Wisconsin (Dawes), then the rest; Jul 1 evening (inferred about 18:00-21:00); rudimentary line by nightfall; 6th Wisconsin began on its own initiative.",
 corrected="On the evening of Jul 1 Hancock placed Wadsworth's division on the hill east of the Baltimore pike (Culp's Hill) and the division began to intrench. Documented: the 6th Wisconsin dug without orders with about a dozen spades and shovels from its wagon (Dawes, 1890 memoir) and the 7th Indiana began a temporary breastwork by command of Wadsworth (Grover, OR). Not documented: the clock (18:00-21:00 is inferred), which regiment began first, the log fabric, and the names 'Stevens' Knoll to the summit'.",
 structures=['E-02', 'S-014'],
 sub=_E02_SUBS(),
 stays_unsupported=["Clock 18:00-21:00 (inferred only)", "6th Wisconsin first, then the division", "Logs and earth fabric on Jul 1 evening", "Extent 'Stevens' Knoll to the summit' (no source names the line)"],
 register=['fence-1-EG-02'],
 blocked=[B('HN-Walls', None, "HistoryNet 'Crossroads: Walls of Fame (Culp's Hill)' (URL not recorded in the PDF source list; host historynet.com refused here): read the paragraph on the 6th Wisconsin's spades and the clock window it gives for Jul 1 evening")],
 consequence=["E-02 works record: builder units documented = 6th Wisconsin (own initiative, dozen spades) and 7th Indiana (by command), placed by Hancock's order; clock window stays an inferred default 18:00-21:00 with its gap mark; do not show 'logs' as documented for Jul 1 evening", "S-014: keep 'about 18:00-21:00' tier inferred; remove 'first' from the trigger text"],
 lookups=[L('OR1','Cul[pg] Hill in R005-R112',2,'only Dawes R035 and Morrow R033 name the hill'), L('lib DAWES-1890','dozen spades|no orders to construct',3,'found (page hint 180-181)'), L('OR1','R032,R037-R042 evening/night/clock',7,'no clock for the start of the Jul 1 evening works')],
))

ROWS.append(R('R14.E-03', 'corrected', 'open_gaps',
 pdf_claim="Lower Culp's Hill summit: 123rd NY (1st Division, XII Corps) breastworks begun Jul 1 (start hour not given); a soldier's letter puts the work about 10 rods (about 165 ft) in front of a heavy stone wall; the PDF itself notes that a XII Corps regiment working on Jul 1 sits oddly beside the 06:00 Jul 2 start.",
 corrected="The 123rd NY built its breastwork on the morning of Jul 2, not Jul 1: it lay on its arms the night of Jul 1, was ordered into position next morning and built a strong breastwork along its front in the woods right of Cemetery Hill (Rogers, OR); Morhous (1879) agrees and adds that the men worked until late in the afternoon. Ruger puts the division on Culp's Hill after an order received about 09:00 Jul 2 and says breastworks of logs, rocks and earth were 'immediately constructed' along the whole line, with a stone wall about 75 yd behind the First Brigade's works. The regiment left the works about 16:00 (Rogers) or the division about 18:00 (Ruger). The 10 rods figure rests on a web page that is not readable here.",
 structures=['E-03', 'P-09', 'S-015'],
 sub=[
  S('a', "Date of construction: the morning of Jul 2 (the night of Jul 1 on the arms; the PDF's Jul 1 is contradicted).", 'documented', 'supported', [
    C('OR1','R279',"Lay on our arms that night"),
    C('OR1','R279',"Next morning we were ordered in position on the hill near Rock Creek"),
    C('OR1','R279',"built a strong breastwork along its front"),
    C('LIB','MORHOUS-1879',"on the morning of July 2d they moved forward and took position near the Cemetery"),
    C('LIB','MORHOUS-1879',"Here they threw up breastworks.")]),
  S('b', "Duration: the work went on until late in the afternoon; the regiment marched to the left about 16:00 (Rogers); the division was ordered to the left about 18:00 (Ruger) - a clock difference carried.", 'documented', 'conflict', [
    C('LIB','MORHOUS-1879',"They worked until late in the afternoon, chopping down trees and shoveling dirt"),
    C('OR1','R279',"About 4 p. m., in connection with the rest of the brigade, marched to the left of the line"),
    C('OR1','R273',"The division remained in this position until about 6 p. m.")]),
  S('c', "Division works: ordered about 09:00 Jul 2 to the ridge called Culp's Hill; breastworks of logs, rocks and earth built at once along the whole line; a stone wall about 75 yd behind the First Brigade's works.", 'documented', 'supported', [
    C('OR1','R273',"About 9 a. m. I received orders from General Williams, commanding corps"),
    C('OR1','R273',"were immediately constructed of logs, rocks, and earth along the whole line"),
    C('OR1','R273',"was a stone wall, behind which the second line of the First Brigade")]),
  S('d', "Stone wall about 10 rods (about 165 ft) behind the work, per a soldier's letter.", 'open_gap', 'blocked_host', [],
    note="Rests on HistoryNet 'Hundreds of Rebels Lay...' (key HN-Hundreds); the host is refused here. Ruger's own figure is about 75 yd. Search of OR 1-3 and the library for '10 rods' near a stone wall: no match."),
 ],
 stays_unsupported=["10-rod distance to the stone wall (web page only)", "Hour the work began (after about 09:00 for the division; the regiment's own clock is 'next morning')"],
 conflicts=["Start date: Jul 1 (PDF, soldier's letter) vs Jul 2 morning (Rogers, Morhous, Ruger)", "Wall distance: 10 rods (letter) vs about 75 yd (Ruger)", "Occupation end: about 16:00 (Rogers) vs about 18:00 (Ruger)"],
 register=['fence-1-EG-02'],
 blocked=[B('HN-Hundreds', None, "HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded in the PDF source list; host historynet.com refused here): read the soldier's letter for the date the 123rd NY began the breastwork and for the '10 rods' distance to the heavy stone wall")],
 consequence=["E-03 / S-015: start window moves from Jul 1 (date only) to Jul 2 after about 09:00 and before about 16:00; PDF Jul 1 stays selectable as 'contradicted by the regiment's own report' (already DD-03)", "E-03 stone wall distance: show about 75 yd (Ruger) as the documented value; 10 rods marked blocked_host", "P-09 (stone wall behind the First Brigade's works): pre-existing, no construction state"],
 lookups=[L('lib','(ten|10) rods',6,'no stone-wall distance for the 123rd NY'), L('lib MORHOUS-1879','Here they threw up breastworks',2,'found: Jul 2 morning, worked until late afternoon')],
))

ROWS.append(R('R14.E-04', 'corrected', 'open_gaps',
 pdf_claim="Cemetery Hill 'fortified' (undetailed): von Steinwehr's division and two batteries (Howard left infantry and artillery; Hancock directed troops after 16:00), Jul 1 afternoon-night; Wikipedia says von Steinwehr fortified it, no method or time.",
 corrected="No source says Cemetery Hill was fortified as a whole or that von Steinwehr built works. Documented: the infantry stood 'partly behind stone fences' on Jul 1 and 'behind stone fences surrounding the hill' on Jul 2 (Steinwehr, existing walls, no construction); at dusk Jul 1 the batteries outside the cemetery gate had light earthworks thrown up in front of each gun (Wainwright, Hunt; see E-12). The rail-fence breastwork the previous pass attached here (Gates, 80th NY) lies on the Cemetery Ridge line (E-17), not on Cemetery Hill. Howard dates the smashing of cemetery fences to the cannonade of about 13:00 Jul 3; the schedule row S-045 says Jul 2.",
 structures=['E-04', 'S-020', 'FEN-evergreen-cemetery', 'P-02', 'P-03'],
 sub=[
  S('a', "Infantry on Cemetery Hill were covered by existing stone fences (Jul 1 and Jul 2); no construction is stated.", 'documented', 'supported', [
    C('OR1','R250',"the infantry being placed partly behind stone fences"),
    C('OR1','R250',"Our infantry was posted behind stone fences surrounding' the hill")]),
  S('b', "At dusk Jul 1 light earthworks were thrown up in front of each gun of the batteries outside the cemetery gate (Wainwright, Hunt); Breck's battery position was intrenched by order of Wainwright; Whittier: temporary earthworks covering the pieces during the night.", 'documented', 'supported', [
    C('OR1','R071',"the cemetery gate were posted as follows, and light earthworks thrown up in front of each gun to protect the men from the fire of the enemy's sharpshooters"),
    C('OR1','R028',"small earthwork thrown up in its front"),
    C('OR1','R074',"which position, by order of Colonel Wainwright, I caused ta be intrench"),
    C('OR1','R073',"During the night, temporary earthworks were thrown up covering the pieces")],
    note="Same facts as E-12; the builders are the battery crews on the orders of the artillery chief (Breck: 'I caused ... to be intrenched')."),
  S('c', "Von Steinwehr (or the Eleventh Corps) fortified the whole hill on Jul 1.", 'open_gap', 'unsupported', [],
    note="Steinwehr's own report says the position was 'quite strong' because of stone fences and batteries; Howard's report names no works. Wikipedia's 'fortified' has no OR counterpart (searched Part 1 for Cemetery Hill/the cemetery near intrench, fortif, breastwork, earthwork, epaulment, rifle-pit: only the per-gun earthworks, the 107th Pa. and Baxter works on the Cemetery Ridge side)."),
  S('d', "Cemetery fences smashed: Howard dates it to the cannonade of about 13:00 (Jul 3); the schedule row says Jul 2.", 'documented', 'conflict', [
    C('OR1','R243',"overturning tombstones, and smashing fences"),
    C('OR1','R243',"At about 1 p. m. a terrific cannonade opened upon us from the west, northwest, north, and northeast")],
    note="Howard's report does not print the day beside the sentence; the sequence (cannonade ceases 15:30, infantry line emerges from Seminary Ridge) places it on Jul 3. Jul 2 for FEN-evergreen-cemetery rests on Wikipedia only."),
 ],
 stays_unsupported=["Whole-hill 'fortified' wording and von Steinwehr as builder", "Date and extent of cemetery fence damage (Jul 2 vs Jul 3)"],
 conflicts=["Cemetery fence damage date: Jul 3 about 13:00 (Howard) vs Jul 2 (PDF/Wikipedia)"],
 register=[],
 blocked=[B('Wiki-D1/Wiki-CH', None, "Wikipedia pages (not a source for any documented claim under CLAUDE.md law 4; host refused here); nothing to read: the claim 'von Steinwehr fortified Cemetery Hill' stays an open gap unless a primary source is found")],
 consequence=["E-04 must not be built as a construction event for Cemetery Hill as a whole; keep the stone fences (pre-existing, P-02/P-03) and the per-gun earthworks (E-12) as the documented state; S-020 'Occupied and fortified (vague)' becomes 'Occupied; stone fences as cover; per-gun earthworks at dusk' (tier documented) with the 'fortified' wording marked gap", "S-045 / FEN-evergreen-cemetery: add the scenario 'fences smashed Jul 3 about 13:00 (Howard)'; Jul 2 stays the PDF scenario (inferred)", "Gates's rail-fence breastwork moves to E-17 (Cemetery Ridge)"],
 lookups=[L('OR1','(Cemetery (Hill|Ridge)|the cemetery) near intrench|fortif|breastwork|earthwork',6,'only per-gun earthworks and Robinson-division works on the Ridge side; no whole-hill fortification')],
))

ROWS.append(R('R14.S-014', 'partially_supported', 'open_gaps',
 pdf_claim="Culp's Hill north slope (Wadsworth, 6th Wisconsin): bare ground to rudimentary line, Jul 1 evening (about 18:00-21:00), trigger '6th Wisconsin first, then the division'.",
 corrected="Same evidence as E-02: the First Division was placed on the hill by Hancock on the evening of Jul 1 and intrenched; the 6th Wisconsin dug on its own initiative and the 7th Indiana by Wadsworth's command. The window 18:00-21:00 stays inferred; 'first' is not documented.",
 structures=['E-02', 'S-014'],
 sub=_E02_SUBS()[:3] + [_E02_SUBS()[3], _E02_SUBS()[4]],
 stays_unsupported=["Clock 18:00-21:00 (inferred only)", "6th Wisconsin first, then the division"],
 register=['fence-1-EG-02'],
 consequence=["S-014: trigger text 'Wadsworth's division intrenches (6th Wisconsin on its own initiative; 7th Indiana by command)'; window stays inferred 18:00-21:00"],
 lookups=[L('OR1/lib','see R14.E-02',0,'shared evidence')],
))

ROWS.append(R('R14.S-015', 'corrected', 'open_gaps',
 pdf_claim="Culp's Hill lower summit (123rd NY): bare ground to breastwork, Jul 1 (date only).",
 corrected="The breastwork was built on the morning of Jul 2 (Rogers, 123rd NY; Morhous 1879), after the regiment lay on its arms the night of Jul 1; see E-03. The PDF's Jul 1 stays a selectable scenario labelled contradicted by the unit's own report.",
 structures=['E-03', 'S-015', 'P-09'],
 sub=[
  S('a', "State change bare ground to breastwork happened the morning of Jul 2 (not Jul 1).", 'documented', 'supported', [
    C('OR1','R279',"Lay on our arms that night"),
    C('OR1','R279',"built a strong breastwork along its front"),
    C('LIB','MORHOUS-1879',"Here they threw up breastworks.")]),
  S('b', "Date Jul 1 (PDF).", 'open_gap', 'contradicted', [], note="HN-Hundreds (web page, refused host) is the PDF's only source; contradicted by the regiment's own report."),
 ],
 stays_unsupported=["Jul 1 date (contradicted)"],
 register=['fence-1-EG-02'],
 blocked=[B('HN-Hundreds', None, "HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded in the PDF source list; host refused here): read the letter for the date it gives the 123rd NY's works")],
 consequence=["S-015: window changes to Jul 2 morning (after about 09:00 for the division per Ruger) to about 16:00; Jul 1 kept as the contradicted PDF scenario"],
 lookups=[L('OR1/lib','see R14.E-03',0,'shared evidence')],
))
