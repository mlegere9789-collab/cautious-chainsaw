from spec_lib import R, S, C, B, L
ROWS = []

ROWS.append(R('R14.S-001', 'corrected', 'open_gaps',
 pdf_claim="Rock Creek railroad bridge/trestle: intact to burned, Jun 26-27 (sources vary), trigger Early's division.",
 corrected="The burning is dated to the evening of Friday Jun 26 (Jacobs; Early reached Gettysburg late on a rainy day and moved on next morning, 'the 27th', from Mummasburg). The bridge is the railroad bridge across Rock Creek east of the town (Gettysburg Compiler of Jun 29: the bridge across Rock Creek was set on fire; the central span burned and fell in, the other two spans stood badly damaged; ten to twelve cars burned per Early, seventeen per the Compiler; Tillie Pierce: the railroad bridge east of the town). The PDF flag 'sources vary 26 or 27' is resolved to Jun 26 evening by two contemporary or near-contemporary sources; Jun 27 stays selectable as the PDF scenario.",
 structures=['bld-rock-creek-rr-bridge', 'S-001'],
 sub=[
  S('a', "Date: the evening of Friday Jun 26 (Early reached Gettysburg late; moved next morning, the 27th).", 'documented', 'supported', [
    C('OR2','R470',"burned, as was also a small railroad bridge near the place"),
    C('OR2','R470',"I moved next morning (the 27th)"),
    C('LIB','JACOBS-1864',"During the evening of Friday, however, the Rebels burned the railroad bridge")]),
  S('b', "Which bridge and its state: the railroad bridge across Rock Creek; central span burned and fell in, the other two spans standing but badly damaged; burning cars were run onto the bridge.", 'documented', 'supported', [
    C('LIB','GBG-COMPILER-1863-06-29',"The railroad bridge across"),
    C('LIB','GBG-COMPILER-1863-06-29',"The other two are standing, but badly damaged"),
    C('LIB','TPIERCE-1889',"out to the railroad bridge east of the town, set the bridge and cars on fire and destroyed the track")],
    note="The Compiler OCR is badly garbled around 'Rock Creek' ('Bock i geek') and around 'central span ... burnt'; only the clean fragments are quoted. The reading 'central span burnt and fell in' is from the garbled line 'The .■«.ntra span of 1^0 bridge was burnf and ... fell in' and is not quoted as a verbatim match."),
 ],
 stays_unsupported=["Printed hour of the burning (evening only)", "Centre-span damage wording (OCR of the Compiler garbled; an image check is owed)"],
 conflicts=["Jun 26 evening (Jacobs, Early's sequence) vs Jun 27 (PDF alternative)"],
 register=[],
 blocked=[B('Wiki-GBRR', None, "Wikipedia 'Gettysburg Railroad' (host refused here; not a documented source under law 4): nothing to read")],
 consequence=["S-001: default date Jun 26 (evening) documented; Jun 27 stays a PDF scenario; the bridge object keeps the Rock Creek railroad bridge, damage state 'centre span burnt and fell in, two spans standing damaged' (documented-secondary, newspaper)"],
 lookups=[L('lib','Rock Creek railroad bridge',3,'Compiler Jun 29, Jacobs, Tillie Pierce')],
))

ROWS.append(R('R14.S-002', 'partially_supported', 'open_gaps',
 pdf_claim="Pennsylvania Hall cupola: unused to Union signal post, Jun 30, trigger Union signal officers (Wikipedia only).",
 corrected="Primary and secondary sources place Union signal officers on a college or seminary cupola on Jun 30 and Jul 1 but do not agree on the building: Norton (Signal Corps report) puts Buford's signal officer on Jun 30 'in the steeple of the college'; the NPS landscape inventory says Buford used the cupola of the Seminary building as a signal station on Jun 30; Jacobs (Pennsylvania College professor) has a signal officer of Howard on the College cupola at 08:30 Jul 1 and Lee reconnoitring from it on Jul 3. 'Pennsylvania Hall' is not named in any source read; carry both buildings (Pennsylvania Hall cupola, Schmucker Hall cupola) as selectable.",
 structures=['bld-pennsylvania-hall#cupola', 'S-002'],
 sub=[
  S('a', "Jun 30: Buford's signal officer took position in the steeple of the college.", 'documented', 'supported', [
    C('OR1','R017',"On the 30th, general headquarters removed to Taneytown"),
    C('OR1','R017',"took position in the steeple of the college")]),
  S('b', "NPS reading: on Jun 30 Buford used the cupola of the Seminary building as a signal station.", 'documented', 'conflict', [
    C('NPS','NPS-CLI-1STDAY',"Arriving on June 30, General Buford used the cupola of the Seminary building as a signal station")]),
  S('c', "Jul 1 08:30: one of Howard's signal officers was on the College cupola; Jul 3: Lee reconnoitred from the College cupola (the College building was then a hospital).", 'documented', 'supported', [
    C('LIB','JACOBS-1864',"one of these officers was on the College cupola making observations"),
    C('LIB','JACOBS-1864',"During the day General Lee had reconnoitred our position from the College cupola")]),
  S('d', "The building is Pennsylvania Hall.", 'inferred', 'unsupported', [], note="'College cupola' and 'steeple of the college' point to Pennsylvania College (whose main building is Pennsylvania Hall) but no source read names the hall; the NPS reading points to the Seminary instead."),
 ],
 stays_unsupported=["Building identity (Pennsylvania Hall vs Schmucker Hall)", "Hour on Jun 30"],
 conflicts=["Building: college steeple (Norton) / College cupola (Jacobs) vs Seminary building cupola (NPS)"],
 register=[],
 blocked=[B('Wiki-PennHall', 'https://en.wikipedia.org/wiki/Pennsylvania_Hall_(Gettysburg_College)', "Wikipedia page (URL formed from the title; host refused here; not a documented source): nothing to read")],
 consequence=["S-002: split the signal-post event into the Jun 30 post (building scenario: Pennsylvania Hall cupola or Schmucker Hall cupola) and the Jul 1 08:30 Howard signal officer on the College cupola; both tier documented for the event, inferred for the building"],
 lookups=[L('lib','Pennsylvania Hall|College cupola',3,'no hit names Pennsylvania Hall; Jacobs College cupola'), L('NPS','Buford cupola Seminary',2,'NPS-CLI-1STDAY p.37')],
))

ROWS.append(R('R14.S-003', 'gap', 'blocked_host',
 pdf_claim="McPherson fences along the railroad grade: fenced to partly dismantled, Jun 30, trigger cavalry firewood/breastwork (Harrison); contested: a critic says no wartime account describes fences along the cut.",
 corrected="No source read supports or refutes the Jun 30 dismantling. OR Parts 1-3 have no 'firewood' hit and the Buford/Gamble/Devin reports name no fence use on Jun 30; the 99-text library plus Dawes, Morhous and Eddy and the 73 NPS documents have no statement that cavalry took the McPherson or railroad-grade fences on Jun 30. The NPS First Day CLR does say McPherson fences were 'destroyed' by July 1863 (photograph caption) without a date or cause. The row stays a contested open gap: no state change, both scenarios selectable.",
 structures=['FEN-mcpherson-railroad-grade', 'S-003'],
 sub=[
  S('a', "McPherson Farm fences were found destroyed after the battle (cause and date not stated).", 'documented', 'partial', [
    C('NPS','NPS-CLR-1STDAY',"A trampled corn field and destroyed fences on the McPherson")],
    note="Photograph caption (Brady, Jul 1863) in the NPS CLR; does not address Jun 30 or the railroad grade."),
  S('b', "Cavalry dismantled fences along the railroad grade on Jun 30 for firewood or breastwork (Harrison).", 'open_gap', 'blocked_host', [], note="Rests on Gettysburg Daily (GD-Fences) paraphrasing Harrison; not readable here."),
  S('c', "A critic says no wartime account describes fences along the cut.", 'open_gap', 'unsupported', [], note="Consistent with this search: no wartime account found (OR, library, NPS)."),
 ],
 stays_unsupported=["Jun 30 dismantling", "Harrison's claim and the critic's counterclaim"],
 conflicts=["Contested (Harrison vs critic); no default chosen"],
 register=['fence-1-EG-10'],
 blocked=[B('GD-Fences', 'https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/', "Gettysburg Daily fence article recorded in terrain_sources.json for the fence sources (the PDF key GD-Fences is not tied to this URL in the PDF; mapping unconfirmed; host gettysburgdaily.com refused here): read what it says about McPherson/railroad-grade fences and Harrison's firewood claim and the critic's reply"),
          B('Brady photograph (mid-Jul 1863)', 'https://www.loc.gov/pictures/collection/cwp/', "Library of Congress Civil War photographs (www.loc.gov is reachable but the specific image was not identified): look at the Brady mid-July 1863 McPherson ridge/railroad-cut view for fence lines (photo-match workstream)")],
 consequence=["S-003: no state change by default (both PDF scenarios stay; the critic scenario is 'no change'); the row stays tier 'contested' with the registered gap"],
 lookups=[L('OR1-3','firewood',0,'no hit'), L('lib+NPS','firewood|Harrison|cavalry ... fences',20,'no statement on Jun 30 fences'), L('NPS','Brady McPherson fences',5,'captions only')],
))

ROWS.append(R('R14.S-004', 'unsupported', 'blocked_host',
 pdf_claim="Presbyterian Church (208 Baltimore St): church to Cavalry Corps 1st Division hospital, Jun 30, trigger corps medical staff (HMDB 17939).",
 corrected="Not supported by any source readable here. OR Part 1-3 have no 'Presbyterian church' hit; Cuyler, Vollum and Letterman (R003, R004, R016) name no building; the library and the NPS documents contain no statement that a town church was a cavalry hospital on Jun 30 (the NPS Cemetery CLR records two soldiers buried in the United Presbyterian churchyard, a different fact). The claim rests on a Historical Marker Database entry that is not reachable.",
 structures=['bld-presbyterian-church', 'H-01', 'S-004'],
 sub=[
  S('a', "Church used as a cavalry hospital on Jun 30.", 'open_gap', 'blocked_host', [], note="No local source; HMDB 17939 not readable."),
 ],
 stays_unsupported=["Whole claim: building, date, trigger"],
 register=['fence-1-EG-11'],
 blocked=[B('HMDB-17939', 'https://www.hmdb.org/m.asp?m=17939', "Historical Marker Database marker 17939 (URL formed from the marker number in the PDF key and the m.asp?m= pattern of other recorded HMDB URLs; host hmdb.org refused here): read the marker text for the church, the date and the cavalry unit; then find a primary source (division surgeon report, Letterman)")],
 consequence=["S-004 / H-01: keep the open gap marked; do not show the church as a Jun 30 hospital"],
 lookups=[L('OR1-3','Presbyterian church',0,'no hit'), L('lib+NPS','Presbyterian church hospital',12,'none supports the claim')],
))

ROWS.append(R('R14.S-005', 'corrected', 'open_gaps',
 pdf_claim="Fence along McPherson Ridge: intact to used as cover by Gamble's carbines, from about 07:30 Jul 1 (Wikipedia).",
 corrected="Gamble's brigade used fences for cover on the morning of Jul 1, but the clock is about 08:00, not 07:30: Gamble was told at about 8 o'clock that the enemy was approaching and Buford puts the report between 8 and 9 a.m.; Gamble's skirmishers fought 'under cover of trees and fences'. In the afternoon Gamble's men were dismounted behind part of a stone wall. The NPS landscape report adds that Gamble's brigade built a right-angle piled-rail breastwork near Calef's battery. The place name 'McPherson Ridge' is not in the OR passages (Gamble says the next ridge, 200 yd back).",
 structures=['FEN-gamble-cavalry', 'S-005'],
 sub=[
  S('a', "Fences used as cover by Gamble's skirmishers on the morning of Jul 1.", 'documented', 'supported', [
    C('OR1','R338',"fighting under cover of trees and fences")]),
  S('b', "Clock: about 08:00 (Gamble), between 08:00 and 09:00 (Buford) - not 07:30.", 'documented', 'supported', [
    C('OR1','R338',"About 8 o'clock on the morning of the 1st instant"),
    C('OR1','R337',"On July 1, between 8 and 9 a. m., reports came in from the First Brigade")]),
  S('c', "Afternoon: half of three regiments dismounted behind a portion of a stone wall (existing wall); a low stone fence gave partial shelter.", 'documented', 'supported', [
    C('OR1','R338',"placed behind a portion of a stone wall and under cover of trees"),
    C('OR1','R337',"partial shelter behind a low stone fence")]),
  S('d', "Gamble's brigade built a right-angle piled-rail breastwork near Calef's battery on McPherson Ridge.", 'documented', 'supported', [
    C('NPS','NPS-CLR-1STDAY',"trenched behind piled-rail breastworks"),
    C('NPS','NPS-CLR-1STDAY',"as the right-angle work built by Gamble’s")],
    note="NPS CLR (2021), secondary. The PDF text layer interleaves two columns here, so the sentence 'Some of the troops were entrenched behind piled-rail breastworks, such as the right-angle work built by Gamble's brigade near where Calef's Battery was positioned' is quoted in two contiguous fragments."),
  S('e', "About 07:30 and the name 'McPherson Ridge'.", 'open_gap', 'unsupported', [], note="Neither is in the OR passages; 07:30 is Wikipedia's."),
 ],
 stays_unsupported=["07:30 clock", "Exact place name in the 1863 reports"],
 register=[],
 consequence=["S-005: start clock 'from about 08:00' (documented) replaces 07:30 (PDF scenario, unsupported); add the right-angle rail work near Calef's battery (documented-secondary, builder Gamble's brigade) as a works record"],
 lookups=[L('OR1','R337 R338 clock lines',2,'about 8 o\'clock; between 8 and 9')],
))

ROWS.append(R('R14.S-006', 'partially_supported', 'open_gaps',
 pdf_claim="Chambersburg Pike post-and-rail fences: intact (documented Jul 1) - a documented-present row (Gettysburg Daily).",
 corrected="Fences along the Chambersburg Pike on Jul 1 are documented, but the type is a conflict: Wainwright describes a 'paling fence' running parallel to and within 50 yd of the road (east of the seminary); Dawes records a fence on the turnpike without a type; the NPS CLR says the north side of the pike through the McPherson Farm was lined by Virginia worm fence in 1863 (the park later rebuilt five-rail split fences on both sides). 'Post-and-rail along the whole pike' is therefore not supported; carry paling, post-and-rail and Virginia worm as selectable types by reach.",
 structures=['FEN-chambersburg-pike', 'S-006'],
 sub=[
  S('a', "A paling fence ran parallel to and within 50 yd of the road near the seminary on Jul 1.", 'documented', 'supported', [
    C('OR1','R071',"from behind a paling fence running parallel to and within 50 yards")]),
  S('b', "Dawes's line reached a fence on the Chambersburg turnpike about 40 rods from the enemy (type not stated).", 'documented', 'supported', [
    C('OR1','R035',"reached a fence on the Chambersburg turnpike")]),
  S('c', "The north side of the pike through the McPherson Farm was lined by Virginia worm fence in 1863.", 'documented', 'supported', [
    C('NPS','NPS-CLR-1STDAY',"the park maintained five-rail split fences along both sides of Chambersburg Pike through the McPherson Farm, although the north side had been lined by Virginia worm fences in 1863")],
    note="NPS CLR (2021), secondary; the parenthetical refers to its figure 1.159."),
  S('d', "Post-and-rail along the whole pike.", 'open_gap', 'blocked_host', [], note="Gettysburg Daily (GD-Fences) and Emerging Civil War 'Fence Friday' are the PDF's sources; hosts refused."),
 ],
 stays_unsupported=["Post-and-rail along the whole pike"],
 conflicts=["Fence type: paling (Wainwright) vs post-and-rail (PDF) vs Virginia worm on the north side at the McPherson Farm (NPS)"],
 register=['fence-1-EG-12'],
 blocked=[B('GD-Fences', 'https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/', "Gettysburg Daily fence article (mapping to the PDF key unconfirmed; host refused here): read the Chambersburg Pike fence type passage"),
          B('ECW fence Friday', 'http://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/', "Emerging Civil War 'Fence Friday: post and rail' (host refused here): read general post-and-rail dimensions and any Chambersburg Pike statement")],
 consequence=["S-006 / FEN-chambersburg-pike: fence type becomes a per-reach selector (paling near the seminary, Virginia worm north of the pike at the McPherson Farm, post-and-rail elsewhere as PDF scenario); presence on Jul 1 stays documented"],
 lookups=[L('NPS','Chambersburg Pike fence types',8,'NPS-CLR-1STDAY p.177')],
))

ROWS.append(R('R14.S-007', 'partially_supported', 'open_gaps',
 pdf_claim="Unfinished railroad cut (P-12): open grade to cover for infantry and attack on Davis's brigade, about 11:00 Jul 1, trigger 6th Wisconsin, 95th NY, 84th NY.",
 corrected="The unfinished railroad cut west of the seminary is named by Dawes (6th Wisconsin), whose line, with the 95th NY and 14th Brooklyn, charged the cut after the Confederates took refuge in it; Davis's brigade fought there. The OR prints no clock for the charge: Reynolds fell about 10:15 and Cutler's brigade was in action from 10 a.m.; about 11:00 stays an inferred value bounded between about 10:15 and the 15:45 retire order.",
 structures=['P-12', 'S-007'],
 sub=[
  S('a', "The cut was an unfinished railroad cut through the ridge west of the seminary; Confederates took refuge in it and the 6th Wisconsin, 95th NY and 14th Brooklyn charged it.", 'documented', 'supported', [
    C('OR1','R035',"an unfinished railroad cut through the ridge west of the seminary"),
    C('OR1','R040',"The enemy then took possession of a railroad cut")]),
  S('b', "Clock: Reynolds fell about 10:15; the cut fight followed; Cutler's brigade in action from 10 a.m.; about 11:00 is not printed.", 'inferred', 'partial', [
    C('OR1','R032',"at this time (about 10. 15 a. m.) our gallant leader fell, mortally wounded"),
    C('OR1','R037',"having been in action from 10 a. m.")],
    note="No OR report gives a clock for the charge on the cut; about 11:00 is an inference."),
 ],
 stays_unsupported=["Printed clock 'about 11:00'"],
 register=[],
 consequence=["S-007: window stays inferred 'about 10:30-11:30'; the cut is pre-existing (no construction state)"],
 lookups=[L('OR1+OR2','railroad cut clocks',12,'no printed clock for the charge')],
))

ROWS.append(R('R14.S-008', 'unsupported', 'blocked_host',
 pdf_claim="St. Francis Xavier church: church to hospital, pews removed, boards laid, by noon Jul 1, trigger wounded arrive (Aleteia).",
 corrected="Not supported by any source readable here: 'St. Francis' and 'Xavier' have no hit in OR Parts 1-3; the library has no statement; the NPS documents mention St. Francis Xavier only as a 1918 influenza ward (Eisenhower camp history) and in bibliographies. The claim rests on an Aleteia page that is not reachable.",
 structures=['bld-st-francis-xavier', 'H-02', 'S-008'],
 sub=[
  S('a', "Church used as a hospital with pews removed and boards laid by noon Jul 1.", 'open_gap', 'blocked_host', [], note="No local source."),
 ],
 stays_unsupported=["Whole claim"],
 register=['fence-1-EG-11'],
 blocked=[B('Aleteia', 'https://aleteia.org/', "Aleteia page on the St. Francis Xavier parish (the exact article URL is not recorded in the PDF; the only Aleteia URL recorded in the repository is https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/ - unconfirmed as this source; host refused here): read the church-as-hospital passage, the date and its own source; then find a primary witness (a Daughters of Charity or priest account)")],
 consequence=["S-008 / H-02: keep the open gap marked; do not show pews removed by noon Jul 1"],
 lookups=[L('OR1-3','St. Francis|Xavier',0,'no hit'), L('lib+NPS','Xavier / Catholic church hospital',10,'none for 1863')],
))

ROWS.append(R('R14.S-009', 'corrected', 'open_gaps',
 pdf_claim="McMillan fences: standing to felled for Union troops, Jul 1, trigger 'neighbor reportedly' (Emerging Civil War, Bliss farm; secondary).",
 corrected="The NPS landscape inventory (from the National Register form) says Union troops themselves tore down David McMillan's fences on the morning of Jul 1 to facilitate movement, a Union battery stood in his yard, and after the Union withdrawal the Confederates used his fencing in entrenchments. This corrects the trigger from 'a neighbor' to Union troops, and adds a second state change (fence rails into Confederate works after Jul 1). The OR is silent on the felling; Lane (Part 2) places a stone fence and a peach orchard near McMillan's house.",
 structures=['FEN-mcmillan', 'S-009'],
 sub=[
  S('a', "Morning of Jul 1: Union troops tore down McMillan's fences to move troops; a Union battery was in the yard.", 'documented', 'supported', [
    C('NPS','NPS-CLI-PCB',"On the morning of July 1, 1863 Union troops advanced across McMillan’s land, tearing down his fences to facilitate movement of troops")],
    note="Secondary (NPS CLI quoting the 2004 National Register form), a non-lead source; the felling is not in the OR."),
  S('b', "After the Union withdrawal, McMillan's fencing was used in Confederate entrenchments.", 'documented', 'supported', [
    C('NPS','NPS-CLI-PCB',"Following the Union withdrawal, Confederate forces took possession of the farmstead. During this time, McMillan’s fencing was used in constructing entrenchments")]),
  S('c', "Setting: a stone fence and a peach orchard near McMillan's house on Seminary Ridge.", 'documented', 'supported', [
    C('OR2','R558',"peach orchard near McMillan's house")]),
  S('d', "Felled by a neighbor (ECW).", 'open_gap', 'blocked_host', [], note="Emerging Civil War Bliss-farm article not readable here; the NPS account (Union troops) differs."),
 ],
 stays_unsupported=["'Neighbor' as the actor", "Hour of the felling and number of panels"],
 conflicts=["Actor: neighbor (ECW) vs Union troops (NPS)"],
 register=['fence-1-EG-13'],
 blocked=[B('ECW-Bliss', 'http://emergingcivilwar.com', "Emerging Civil War article on the Bliss farm (exact URL not recorded in the PDF; host refused here): read the passage on the McMillan fences felled by a neighbor for Union troops")],
 consequence=["S-009 / FEN-mcmillan: trigger becomes 'Union troops (NPS)' as the documented-secondary default with 'neighbor reportedly (ECW)' selectable; add the second change 'rails used in Confederate entrenchments after Jul 1 withdrawal'"],
 lookups=[L('NPS','McMillan fences',44,'NPS-CLI-PCB p.72'), L('lib','McMillan ... fence',1,'only Lane (SHSP-05)')],
 changes=["previous: failed lookup; now supported by the NPS landscape inventory (trigger corrected)"],
))

ROWS.append(R('R14.S-010', 'partially_supported', 'open_gaps',
 pdf_claim="Seminary Ridge fences: standing to dismantled to a rail barricade (about 600 yd), Jul 1 afternoon before about 16:00, trigger I Corps (Pender/HistoryNet, Wikipedia).",
 corrected="The rails of the Seminary Ridge barricade are documented and in part tied to fences: a Maine adjutant says Paul's brigade built the redoubt of earth and fence rails in front of the seminary; the seminary steward's neighbor Dr. Schmucker counted 3,108 rails lost from his adjacent farm (the NPS says most probably into the Union rail breastworks of Jul 1, or burned). The work was begun about 11:00-13:00, not 'afternoon' (see E-01); the latest bound before about 16:00 stands (Wadsworth's retire order 15:45). The 600-yd length of dismantled fence is not in any source.",
 structures=['FEN-seminary-ridge', 'E-01', 'S-010'],
 sub=[
  S('a', "A fence ran along the south end of the seminary grove about 14:00 and the breastwork of rails and stumps lay through the west edge of the grove.", 'documented', 'supported', [
    C('OR1','R060',"take a position behind a fence running along the south end"),
    C('OR1','R060',"temporary breastwork made of rails, stumps, &c., by the Second Brigade"),
    C('OR1','R057',"fell back slowly behind a barricade of rails")]),
  S('b', "Rails came from fences: 'earth and fence rails' (Maine adjutant); Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably used in the Union rail breastworks late in the fighting of Jul 1 or burned for fuel (NPS); Union troops later assembled stacked-rail breastworks along the west edge of Seminary Grove (NPS).", 'documented', 'supported', [
    C('LIB','ME-GB-1898',"By command of General Robinson, the First Brigade hastily threw up a redoubt of earth and fence rails"),
    C('NPS','NPS-CLR-1STDAY',"Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably going to build the Union rail breastworks late in the fighting on July 1, or burned for fuel"),
    C('NPS','NPS-CLI-1STDAY',"Union troops later assembled stacked-rail breastworks along the west edge of Seminary Grove")],
    note="The NPS inference ('most probably') is the NPS's own; the number 3,108 is a damage count by the owner."),
  S('c', "Window: ordered about 11:00-13:00; in use by 14:00-15:00; Wadsworth ordered the retire at 15:45.", 'inferred', 'partial', [
    C('OR1','R032',"at 3.45 o'clock I ordered the command to"),
    C('OR1','R052',"arriving near the front where the battle was raging at 11 a. m.")]),
  S('d', "About 600 yd of fence removed.", 'open_gap', 'unsupported', [], note="See E-01 (searched: no source). The 3,108 rails suggest a long line but give no length."),
 ],
 stays_unsupported=["600 yd of fence removed", "Which fences (locations) supplied the rails"],
 register=['fence-1-EG-01'],
 consequence=["S-010: window 'about 11:00-13:00 to before 16:00'; add the 3,108-rail loss (Schmucker) as the documented quantity of rails lost from the adjoining farm fences; 600 yd stays a gap"],
 lookups=[L('NPS','Schmucker rails lost',2,'NPS-CLR-1STDAY p.66')],
))

ROWS.append(R('R14.S-011', 'partially_supported', 'open_gaps',
 pdf_claim="Seminary rail barricade: complete to overrun, about 16:00-16:30 Jul 1, trigger Pender's attack (Wikipedia).",
 corrected="Union side: Wadsworth ordered the command to retire at 15:45 and held until then; Robinson's division withdrew at 'nearly 5 p.m.'; Confederate side: Pender ordered his three brigades forward 'about 4 o'clock' (Engelhard) and Perrin's regiments drove the Union troops from the rail breastwork near the college. The OR prints no hour for the barricade being taken; 16:00-16:30 is bounded by the Union retire order (15:45) and the Confederate advance (about 16:00; the sides' clocks differ by about 20 min).",
 structures=['E-01', 'S-011'],
 sub=[
  S('a', "Pender ordered the advance about 16:00 (Confederate clock); Perrin's 1st and 14th SC drove the enemy from the rail breastwork near the college.", 'documented', 'supported', [
    C('OR2','R556',"About 4 o'clock, General Pender ordered an"),
    C('OR2','R557',"breastwork of rails behind"),
    C('OR2','R557',"driving him from his breastwork near the college")]),
  S('b', "Union side: retire ordered 15:45 (Wadsworth); Robinson on the right until nearly 17:00.", 'documented', 'supported', [
    C('OR1','R032',"at 3.45 o'clock I ordered the command to"),
    C('OR1','R043',"from about noon until nearly 5 p. m.")]),
  S('c', "Hour the barricade was overrun and the 16:30 end.", 'inferred', 'unsupported', [], note="No OR clock for the barricade falling; 16:30 is inferred from the start only."),
 ],
 stays_unsupported=["Printed hour the barricade fell", "16:30 end"],
 conflicts=["Union retire order 15:45 vs Robinson nearly 17:00 vs Confederate 'about 4 o'clock' (clock offset about 20 min)"],
 register=['fence-1-EG-01'],
 consequence=["S-011: window 15:45-16:30 (documented bounds), tier documented for the bounds and inferred for the instant"],
 lookups=[L('OR1+OR2','R032 R043 R556 R557',4,'clocks above')],
))

ROWS.append(R('R14.S-012', 'partially_supported', 'open_gaps',
 pdf_claim="Seminary / Schmucker Hall: intact to I Corps hospital; lost window glass, bullet holes, crack; Day 1 onward (Stone Sentinels).",
 corrected="The seminary main building was a First Corps hospital: McFarland names 'the seminary hospital' with his wounded collected there; the NPS landscape report shows battle damage on the east front (July 1863 photograph) and records the later repair: rebuilding the northeast corner of the main building and filling holes in walls. Lost window glass is not stated for the seminary building in any source read; the broken-sash and glass passage in the NPS text belongs to the McPherson farmhouse.",
 structures=['bld-schmucker-hall', 'H-03', 'S-012'],
 sub=[
  S('a', "Hospital: wounded collected in the seminary hospital.", 'documented', 'supported', [
    C('OR1','R060',"collected in the seminary hospital")]),
  S('b', "Damage: the east front showed battle damage in July 1863; repairs included rebuilding the northeast corner and filling holes in walls.", 'documented', 'supported', [
    C('NPS','NPS-CLR-1STDAY',"seminary main building showing battle damage"),
    C('NPS','NPS-CLR-1STDAY',"Repairs included rebuilding the northeast corner of the main building, filling holes in walls, cleaning and repainting")]),
  S('c', "Lost window glass, bullet holes, a crack.", 'open_gap', 'partial', [], note="'Holes in walls' and a damaged northeast corner are documented (NPS); glass and 'crack' are not."),
 ],
 stays_unsupported=["Lost window glass", "A crack (the rebuilt northeast corner is the nearest documented damage)"],
 register=['fence-1-EG-11'],
 consequence=["S-012 / H-03: damage state = holes in walls and damaged NE corner (documented-secondary); glass loss stays a marked gap"],
 lookups=[L('NPS','seminary main building damage',6,'NPS-CLR-1STDAY p.66, p.88')],
))

ROWS.append(R('R14.S-013', 'partially_supported', 'open_gaps',
 pdf_claim="Seminary: Union hospital to Confederate-held, late afternoon Jul 1 on (HistoryNet).",
 corrected="A Confederate battery stood near 'the seminary used as a Yankee hospital' on Jul 3 (Dance), so the building was in Confederate-held ground by then, and the NPS CLR has it a hospital for both sides for weeks. The late-afternoon Jul 1 capture is bounded by the Union retire order (15:45) and Pender's advance (about 16:00) but no source prints the hour the building changed hands.",
 structures=['bld-schmucker-hall', 'H-03', 'S-013'],
 sub=[
  S('a', "Jul 3: Confederate guns near the seminary 'used as a Yankee hospital'.", 'documented', 'supported', [
    C('OR2','R532',"near the seminary used as a Yankee hospital")]),
  S('b', "Late afternoon Jul 1 capture (bounds 15:45-16:30).", 'inferred', 'partial', [
    C('OR1','R032',"at 3.45 o'clock I ordered the command to"),
    C('OR2','R556',"About 4 o'clock, General Pender ordered an")]),
 ],
 stays_unsupported=["Hour the seminary building passed to Confederate control"],
 register=['fence-1-EG-11'],
 consequence=["S-013: window 'from about 16:00-17:00 Jul 1' inferred; Jul 3 Confederate-held documented"],
 lookups=[L('NPS','seminary hospital both sides',3,'NPS-CLR-1STDAY p.66')],
))

ROWS.append(R('R14.S-016', 'partially_supported', 'blocked_host',
 pdf_claim="Spangler farm: farm to XI Corps hospital, mid-afternoon Jul 1; wounded by about 16:00 (HistoryNet).",
 corrected="The NPS records that the George Spangler farm served as a field hospital (corps and date not stated). The XI Corps assignment and the mid-afternoon Jul 1 hour are not supported by any source readable here. The OR 'Spangler's farm' hit (McFarland, p.326) is George Spangler's farm near Emmitsburg, a different place and must not be used as evidence.",
 structures=['bld-spangler-farm', 'H-06', 'S-016'],
 sub=[
  S('a', "The George Spangler farm served as a field hospital.", 'documented', 'partial', [
    C('NPS','NPS-CLR-ROT-V1',"In the southern section, the George Spangler farm served as a feld hospital")],
    note="General statement in the NPS Record of Treatment; no corps, no date."),
  S('b', "XI Corps hospital; mid-afternoon Jul 1; wounded by about 16:00.", 'open_gap', 'blocked_host', [], note="Rests on HistoryNet 'Spangler's barn' (HN-Spangler)."),
 ],
 stays_unsupported=["XI Corps ownership", "Hour of conversion to a hospital"],
 register=['fence-1-EG-11'],
 blocked=[B('HN-Spangler', None, "HistoryNet 'The war came knocking on Spangler's barn door' (URL not recorded in the PDF source list; host historynet.com refused here): read the corps, the date and the hour of conversion and the counts"),
          B('Gettysburg Foundation George Spangler Farm', 'https://gettysburgfoundation.org/george-spangler-farm', "Gettysburg Foundation page recorded in terrain_sources.json (host refused here): read the hospital history of the farm")],
 consequence=["S-016 / H-06: hospital use documented-secondary (corps and hour open); do not show 'XI Corps at about 16:00' as documented"],
 lookups=[L('NPS','George Spangler farm hospital',23,'NPS-CLR-ROT-V1 p.327 general statement')],
))

ROWS.append(R('R14.0000', 'partially_supported', 'open_gaps',
 pdf_claim="R14 aggregate for this shard: E-01..E-18 and S-001..S-016 (34 children). Previous status gap with 24 verified, 5 inferred, 5 failed lookups.",
 corrected="Close-out of fence-1 on 2026-11-13: every one of the 92 original citations is re-matched verbatim in the local Official Records (offset, report and printed page unchanged; 92 of 92 found by the OR-RECHECK pass), second witnesses (three further archive.org scans of OR vol. 27) were checked, and new exact evidence was added from the library, three further archive.org books and the National Park Service reports now available locally. Rows by verdict are in REPORT.md. The aggregate stays 'not satisfied': open gaps remain and are registered; blocked web sources are listed with URLs.",
 structures=['structures.json', 'state_schedule.json', 'works_stages.json'],
 sub=[
  S('a', "All original OR citations are verbatim, with the same report, page and offsets.", 'n/a (aggregate)', 'supported', [], note="92 citations in the 34 child rows; tools: the build script in horde/fence-1/scripts and OR-RECHECK (92 lines, all found=yes)."),
  S('b', "Rows corrected by new evidence (see the verdict counts in REPORT.md).", 'n/a (aggregate)', 'supported', []),
  S('c', "Open gaps remain (1863 dimensions, continuity, clocks, web-only claims).", 'open_gap', 'unsupported', []),
 ],
 stays_unsupported=["See each child row"],
 register=['fence-1-EG-01', 'fence-1-EG-02', 'fence-1-EG-03', 'fence-1-EG-04', 'fence-1-EG-05', 'fence-1-EG-06', 'fence-1-EG-07', 'fence-1-EG-08', 'fence-1-EG-09', 'fence-1-EG-10', 'fence-1-EG-11', 'fence-1-EG-12', 'fence-1-EG-13', 'fence-1-EG-14', 'fence-1-EG-15'],
 consequence=["One request note for the world-content workstream: GOVERNANCE/horde/requests/bt-evidence-fence-1-world-content.md"],
))
