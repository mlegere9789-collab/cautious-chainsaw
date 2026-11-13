from spec_lib import R, S, C, B, L
ROWS = []

ROWS.append(R('R14.E-12', 'partially_supported', 'open_gaps',
 pdf_claim="East Cemetery Hill, earth lunettes near the gatehouse (Stewart's Battery B, 4th US occupied a lunette; Battery L, 1st NY also marked): union batteries, builders unnamed (likely crews and infantry details: inference); built between Jul 1 evening and noon Jul 2 (inferred); existing by about 16:00 Jul 2; protected guns from the Benner's Hill barrage; no dimensions.",
 corrected="Per-gun earthworks on East Cemetery Hill were begun at dusk on Jul 1 (Wainwright, Hunt) by the battery crews on the artillery chief's order (Breck: 'by order of Colonel Wainwright, I caused [the position] to be intrenched'; Battery B, 1st Pa.: 'the men of this battery finished the construction of these four lunettes' on the morning of Jul 2; 'some of these earthworks having been commenced the previous evening at dusk'). The 1900-1902 New York books call them lunettes or redans for each gun. The OR itself never uses 'lunette' (searched). No source gives dimensions of the 1863 works: the NPS measures the preserved lunettes at about 30 in high at the highest point, but the East Cemetery Hill lunettes were reconstructed in 1878 and may not be used as an 1863 profile.",
 structures=['E-12', 'G-03'],
 sub=[
  S('a', "Per-gun earthworks at the batteries outside the cemetery gate were thrown up at dusk Jul 1 (Stewart's Battery B, 4th US among them); the battery commander of Battery L, 1st NY, had his position intrenched by order of the artillery chief; the 5th Maine threw up temporary earthworks during the night.", 'documented', 'supported', [
    C('OR1','R071',"the cemetery gate were posted as follows, and light earthworks thrown up in front of each gun to protect the men from the fire of the enemy's sharpshooters"),
    C('OR1','R028',"small earthwork thrown up in its front"),
    C('OR1','R074',"which position, by order of Colonel Wainwright, I caused ta be intrench"),
    C('OR1','R073',"During the night, temporary earthworks were thrown up covering the pieces"),
    C('LIB','ME-GB-1898',"During the night earthworks were constructed")]),
  S('b', "Builders: the battery crews (Cooper's Battery B, 1st Pa. finished four lunettes on the morning of Jul 2; the 1st NY battery men commenced redans or lunettes for each gun; artillerymen on the hill completed the lunettes begun at dusk).", 'documented', 'supported', [
    C('LIB','PA-GB-1914-v2',"On the morning of July 2, the men of this battery finished the construc tion of these four lunettes"),
    C('LIB','NY-GB-1902-v3',"by building redans or lunettes for each gun"),
    C('LIB','NY-GB-1900',"completing the lunettes which had been thrown up in front of each gun")],
    note="Secondary regimental/battery narratives (1900-1914). The OR names no builder other than the battery commanders' own orders."),
  S('c', "Form: lunette (semi-circular earthen berm built by artillery crews). The word is not in OR Part 1.", 'documented', 'partial', [
    C('NPS','NPS-CLR-ROT-V1',"A specifc type of earthwork, a lunette, was a semi-circular earthen berm constructed by artillery crews to protect their guns"),
    C('NPS','NPS-CLR-ROT-V1',"East Cemetery Hill Lunettes (1878)")],
    note="NPS CLR (2014) describes the type and says the present East Cemetery Hill lunettes were reconstructed or rehabilitated (1878). 1863 form is documented only by the 1900-1914 books (lunettes or redans) and the OR's 'small earthwork in front of each gun'."),
  S('d', "Window: begun at dusk Jul 1; finished the morning of Jul 2; in use at 16:00 Jul 2 (Cooper: the Confederate artillery crash came at 4 p.m.).", 'documented', 'supported', [
    C('OR1','R071',"At dusk, no attack having been made"),
    C('LIB','PA-GB-1914-v2',"At 4 p. m. the terrible crash of the enemy's artillery came")]),
  S('e', "Dimensions of the 1863 lunettes.", 'open_gap', 'unsupported', [
    C('NPS','NPS-SPANGLERS-SPRING',"the lunettes measure 30” at the point of greatest height", role='context')],
    note="The NPS proposal (undated in the saved text) measures the preserved lunettes on Stevens' Knoll and East Cemetery Hill at 30 in at the highest point, tapering toward the ends; these are the reconstructed works and are not an 1863 profile (standing rule: no 1863 profile from modern rebuilt works). Stays a gap."),
 ],
 stays_unsupported=["1863 dimensions of the lunettes", "Which units dug each lunette beyond the battery crews' own accounts", "Whether the 'lunette' shape was drawn on the first evening or only in the morning (documented: begun dusk, finished morning)"],
 register=['fence-1-EG-06'],
 blocked=[B('Wiki-ECH', 'https://en.wikipedia.org/wiki/East_Cemetery_Hill', "Wikipedia 'East Cemetery Hill' (URL formed from the title; host refused here; not a documented source under law 4): nothing to read"),
          B('GD-Housch', None, "Gettysburg Daily page cited as GD-Housch (URL not recorded; host gettysburgdaily.com refused here): read the dated photographs (Jul 7, 1863) of the gatehouse and lunette area for visible earthworks")],
 consequence=["E-12 / G-03 works records: builders = battery crews (Cooper B-1st Pa. four lunettes; Wiedrich I-1st NY; Breck L-1st NY; Stewart B-4th US), start dusk Jul 1, finish morning Jul 2; keep 'lunette' as the form label with the 1863 profile marked a gap; do not use the 30-in figure for 1863", "E-12 start window moves from 'between Jul 1 evening and noon Jul 2 (inferred)' to documented dusk Jul 1 to morning Jul 2"],
 lookups=[L('OR1','lunette|epaulement',0,'no hit in OR Part 1 (previous run, confirmed)'), L('NPS','lunettes? ... feet/ft/height',10,'NPS-SPANGLERS-SPRING p.16: 30 in; NPS-CLR-ROT-V1: definition and 1878 reconstruction')],
 changes=["builder unnamed -> battery crews (documented)", "window inferred -> dusk Jul 1 to morning Jul 2 (documented)", "lunette form: not in OR; documented by 1900-1914 books and the NPS CLR as a type"],
))

ROWS.append(R('R14.E-13', 'corrected', 'open_gaps',
 pdf_claim="Little Round Top: no construction attributed; natural ledges and boulders; Vincent's brigade (16th Michigan, 44th NY, 83rd PA, 20th Maine) arrived about 15:30-16:00 Jul 2 and fought at once; 20th Maine Company B and the 2nd US Sharpshooters also used a wall (stone wall about 150 yd east of the hill for the sharpshooters).",
 corrected="The OR does contain a construction by Vincent's brigade: the 83rd Pennsylvania stood 'behind rocks and stones hastily thrown up for defense' before the attack at 15:15 (Woodward, 83rd PA; clock 14:30 for the move into position), so 'no works' is contradicted in part. The regimental reports of the 16th Michigan, 44th NY and 20th Maine mention no works; Rice and Chamberlain describe natural rocks and ledges. The 20th Maine Company B wall (NPS: a pre-1863 field wall, about 135 ft long and 2 ft high) is existing. Stone breastworks were built along the summit and Vincent Spur on the night of Jul 2 and the morning of Jul 3 (NPS), see E-14.",
 structures=['E-13', 'P-14'],
 sub=[
  S('a', "The 83rd Pennsylvania built a hasty defense of rocks and stones before the Confederate attack of Jul 2 (move into position at about 14:30, attack at 15:15, fight to nearly 18:00).", 'documented', 'supported', [
    C('OR1','R201',"posted behind rocks and stones hastily thrown up for defense"),
    C('OR1','R201',"was ordered into position on our extreme left"),
    C('OR1','R201',"At 3.15 p. m. the enemy advanced and engaged my skirmishers")],
    note="Woodward's clocks (14:30, 15:15) are earlier than the PDF's arrival window 15:30-16:00; carried as the unit's own clock (the C-012 conflict row is not changed here)."),
  S('b', "Natural cover: rocks and cliffs in the centre and a ledge of rocks on the right of Vincent's line; no works mentioned by Rice, Chamberlain, the 16th Michigan, 44th NY.", 'documented', 'supported', [
    C('OR1','R195',"composed mostly of high rocks and cliffs on the center"),
    C('OR1','R196',"rocky, and stragglingly wooded ground")],
    note="Silence of R196-R200 (searched for breastwork, barricade, stone wall, wall, intrench: none) is recorded as a failed lookup, not as a positive 'no works'."),
  S('c', "A field stone wall at the Jacob Weikert farm (20th Maine Company B position) existed before the battle: about 135 ft long and 2 ft high (NPS).", 'documented', 'supported', [
    C('NPS','NPS-CLI-LRT',"Field Stone Wall, Jacob Weikert Farm / Company B, 20th Maine Stone Wall (built pre-1863; Contributing)", occ=0),
    C('NPS','NPS-CLI-LRT',"The dry-laid stone wall is around 135 feet long and 2 feet high", occ=0)],
    note="Pre-existing wall (no construction animation); NPS statement, secondary."),
  S('d', "No construction at all on Little Round Top by Vincent's brigade (the PDF's positive claim).", 'open_gap', 'contradicted', [], note="Contradicted by R201 for the 83rd PA; for the other three regiments only silence."),
 ],
 stays_unsupported=["Positive 'no works' for the 16th Michigan, 44th NY and 20th Maine (silence only)", "Extent and position of the 83rd PA's hasty stones (no length given)"],
 conflicts=["Arrival: 15:30-16:00 (PDF) vs Woodward: into position about 14:30"],
 register=['fence-1-EG-07'],
 consequence=["E-13 must not be 'no_construction': add a hasty stone defense for the 83rd PA (Jul 2 about 14:30-15:15, documented), built by the regiment; keep Company B's wall as pre-existing; the other three regiments stay 'no works found' (gap, not a fact)"],
 lookups=[L('OR1','R195-R202 breastwork|barricade|stone wall|intrench',4,'only R201 83rd PA hasty stones; Rice/Chamberlain rocks'), L('NPS','NPS-CLI-LRT breastworks/stone walls',40,'night of Jul 2 and morning of Jul 3; pre-1863 walls')],
 changes=["Positive claim 'no works' contradicted for the 83rd PA by R201 (missed by the previous pass, which searched R195-R202 but did not flag 'hastily thrown up')"],
))

ROWS.append(R('R14.E-14', 'partially_supported', 'open_gaps',
 pdf_claim="Little Round Top, south slope: stone breastworks from abundant nearby rock by Weed's brigade, five Pennsylvania Reserve regiments and an Ohio battery; evening Jul 2 (about 20:00 inferred) or after, into Jul 3; NPS says built on Jul 2, Wikipedia evening of Jul 2 or after, and credits most surviving works to Weed's brigade and the Reserves; O'Sullivan photographed the wall days later.",
 corrected="Two builders are documented, not one: Weed's brigade (under Garrard, after Weed fell) strengthened the ridge 'at night' on Jul 2 by building a stone wall about halfway down the slope wherever the rocks gave no cover (Garrard); Fisher's Pennsylvania Reserves, after the 5th and 12th Reserves and the 20th Maine went up Round Top at 22:00 Jul 2, 'in the morning' (Jul 3) threw up a stone wall across the entire ravine between the hills and up the hill (Fisher). Two Confederate brigade and regimental reports (Benning, Waddell) say the Union troops on the mountain side built two, then three lines of stone breastworks through the night of Jul 2-3, finished by dawn. The NPS landscape inventory says Union infantry built stone breastworks 'during the night of July 2 and morning of July 3'. The PDF's 'five Reserve regiments' and 'Ohio battery' as builders are not stated by any source read; Gibbs' Ohio guns were posted on the hill (Hunt) but are not said to have built anything. Both builders and both windows stay selectable.",
 structures=['E-14', 'P-14'],
 sub=[
  S('a', "Weed's brigade (Garrard commanding at the time of writing) built a stone wall about halfway down the slope at night on Jul 2.", 'documented', 'supported', [
    C('OR1','R217',"At night this ridge, naturally strong, was strengthened by building a stone wall about half way down the slope"),
    C('OR1','R217',"went into battery on the summit")]),
  S('b', "Fisher's Reserves: the 5th and 12th Pennsylvania Reserves and the 20th Maine went up Round Top at 22:00 Jul 2; in the morning (Jul 3) the other regiments threw up a stone wall across the entire ravine and up the hill.", 'documented', 'supported', [
    C('OR1','R220',"at 10 p. m. ascended the hill"),
    C('OR1','R220',"threw up a stone wall across the entire ravine and up the hill")]),
  S('c', "Union infantry built stone breastworks from the boulder-strewn slopes during the night of Jul 2 and the morning of Jul 3; stone wall defense works typically two to three feet high, none built for permanence; O'Sullivan photographed stone breastworks on the summit on Jul 6.", 'documented', 'supported', [
    C('NPS','NPS-CLI-LRT',"The hill’s boulder-strewn slopes also provided Union infantry ample materials to build stone breastworks during the night of July 2 and morning of July 3", occ=0),
    C('NPS','NPS-CLR-ROT-V1',"soldiers built stone wall defense works to either strengthen their defensive line or consolidate a position"),
    C('NPS','NPS-CLI-LRT',"Stone breastworks on the summit of Little Round Top, July 6, 1863")],
    note="NPS statements (secondary, modern). The NPS CLI states the present walls were reconstructed (GBMA restacked them 1882-1887): no 1863 profile from them."),
  S('f', "Confederate witnesses on the Round Top mountain side: the enemy built two lines (Benning) or three lines plus a fourth (Waddell) of stone breastworks through the night of Jul 2-3, complete at dawn.", 'documented', 'supported', [
    C('OR2','R458',"The enemy employed the whole night in throwing up two lines of breastworks"),
    C('OR2','R462',"the enemy employing himself in building breastworks on the mountain"),
    C('OR2','R462',"he had constructed in plain view three lines of breastworks")],
    note="Primary Confederate reports (Benning, 20th Georgia). 'The mountain' is Round Top / Little Round Top by context; the reports do not name the builders, so the identification with Weed's brigade or Fisher's Reserves is an inference. Benning says the upper line was high enough for its fire to pass over the lower."),
  S('d', "Builders 'five Pennsylvania Reserve regiments and an Ohio battery'.", 'open_gap', 'unsupported', [], note="Fisher names five regiments of his brigade in the order of events (two went up; the others covered the ravine) but does not say all five built the wall; no source says the Ohio battery built anything."),
  S('e', "Start about 20:00 Jul 2 (inferred).", 'inferred', 'partial', [], note="Garrard's 'at night' and Fisher's 'in the morning' bound the window to night Jul 2 to morning Jul 3; no printed hour."),
 ],
 stays_unsupported=["Five Reserve regiments and an Ohio battery as joint builders", "Printed hour of the start (about 20:00 is inferred)", "Wall length and height of the 1863 works (the 2-3 ft is a general NPS figure)"],
 conflicts=["Builder and window: Weed's brigade at night Jul 2 (Garrard) vs Fisher's Reserves in the morning Jul 3 (Fisher)"],
 register=['fence-1-EG-07'],
 blocked=[B('NPS-LRT', None, "NPS Little Round Top page/report cited as NPS-LRT in the PDF (exact URL not recorded; www.nps.gov is reachable but the page was not identified): the reachable NPS CLI and CLR texts are cited above instead"),
          B('Wiki-LRT', 'https://en.wikipedia.org/wiki/Little_Round_Top', "Wikipedia 'Little Round Top' (URL formed from the title; host refused here; not a documented source under law 4): nothing to read")],
 consequence=["E-14 / S-043: replace the single builder by two documented scenarios: (A) Weed's brigade at night Jul 2 (Garrard), (B) Fisher's Reserves morning Jul 3 (Fisher); keep both; start window night Jul 2 to morning Jul 3; PDF 'five regiments + Ohio battery' stays a labelled PDF scenario; DD-05 'walls built' is confirmed by Garrard and Fisher", "No 1863 profile from the rebuilt LRT walls"],
 lookups=[L('OR1','R210-R222 stone wall/breastwork',4,'R217 Garrard night Jul 2; R220 Fisher morning Jul 3; R201 83rd PA; others existing walls only'), L('NPS','NPS-CLI-LRT/CLR-ROT breastworks',20,'night of Jul 2 and morning of Jul 3')],
 changes=["previous pass said the OR does not credit Weed's brigade: Garrard R217 p.652 does ('At night ... building a stone wall')"],
))

ROWS.append(R('R14.E-15', 'partially_supported', 'open_gaps',
 pdf_claim="Little Round Top summit, Hazlett's Battery D, 5th US (six guns): guns hauled by hand up the rocky slope (one driven to the summit, per another account); ammunition run up from caissons; no prepared epaulement; march about 16:30 Jul 2, first fire 17:45; fired until after dark, remained Jul 3; guns could not depress enough; Hazlett mortally wounded kneeling by Weed, Rittenhouse took command.",
 corrected="Hazlett's battery (six 10-pounders, Hunt) was moved to the left about 16:30 and, on taking position on the summit, 'immediately opened upon the enemy' and fired until dark (Martin, Hunt); the PDF's first-fire 17:45 is not supported (Rittenhouse: the battery had been engaged only about an hour when Hazlett fell; he died at 20:00). Garrard says the battery 'ascended the ridge immediately in rear of' the 140th NY and went into battery on the summit. How the guns got up is a conflict among secondary books: dragged by hand by the 155th Pa. men (155th Pa. address), lifted by hand and handspike (Maine), horses lashed to their utmost with the infantry at the wheels (NY 140th narrative, which counts four guns), teams plunging under the drivers' lash (NY Final report). Rittenhouse commanded on Round Top on Jul 3 (Hunt). The OR does not mention a prepared emplacement either way.",
 structures=['E-15', 'G-06', 'S-038'],
 sub=[
  S('a', "Move about 16:30 Jul 2 to Round Top; battery of six 10-pounders; opened immediately; continuous fire until dark.", 'documented', 'supported', [
    C('OR1','R028',"About 4.30 p. m. Hazlett's battery was moved to the extreme left"),
    C('OR1','R028',"Hazlett's (D, Fifth United States, six 10-pounders)"),
    C('OR1','R221',"Immediately upon taking up the position, the battery opened upon the enemy"),
    C('OR1','R221',"The battery kept up a continuous fire until dark")]),
  S('b', "Hazlett fell after about an hour of fire (the PDF's first fire 17:45 would put that after 18:45); he died at 20:00; Garrard has the battery going into battery on the summit behind the 140th NY.", 'documented', 'supported', [
    C('OR1','R221',"The battery had been engaged only about an hour, when First Lieut. Charles E."),
    C('OR1','R221',"He was carried to the rear, and died at 8 p. m."),
    C('OR1','R217',"ascended the ridge immediately in rear of this regiment")]),
  S('c', "Hand-hauling vs teams: dragged by hand by the 155th Pa.; lifted by hand and handspike; horses lashed to their utmost with the infantry at the wheels (four guns, per the 140th NY narrative); teams plunging under the lash.", 'documented', 'conflict', [
    C('LIB','PA-GB-1914-v2',"dragged the guns of Hazletts regular battery by hand"),
    C('LIB','ME-GB-1898',"lifted his guns by hand and handspike"),
    C('LIB','NY-GB-1902-v3',"the horses being lashed to their utmost exertions"),
    C('LIB','NY-GB-1900',"succeeded in dragging the heavy cannon up the steep")],
    note="All four are secondary books (1898-1914); the OR says only 'ascended' and 'moved'. No default is chosen: hand-hauled, horse-hauled with infantry help and teams-only stay selectable. Gun count: Hunt six; the 140th NY narrative says four."),
  S('d', "First fire 17:45.", 'open_gap', 'unsupported', [], note="Martin and Hunt put the first fire at the move (about 16:30, 'immediately'); NY 140th narrative puts the fight between 16:00 and 17:00 and Weed's death soon after 17:00. No source prints 17:45."),
  S('e', "No prepared emplacement.", 'open_gap', 'unsupported', [], note="Neither the OR nor the books read mention an epaulement either way; Rittenhouse is 'on top of Round Top' on Jul 3 (Hunt p.238)."),
  S('f', "Rittenhouse took command and the battery remained Jul 3.", 'documented', 'supported', [
    C('OR1','R028',"on the top of Round Top")]),
 ],
 stays_unsupported=["First fire 17:45", "Hand-hauling as the one method", "Presence or absence of an epaulement", "Ammunition run up from the caissons (not found)"],
 conflicts=["Hauling method: by hand (155th Pa., Maine) vs by horses with infantry help (NY) vs teams (NY Final report)", "Gun count: six (Hunt) vs four (NY 140th narrative)"],
 register=['fence-1-EG-07'],
 blocked=[B('NPS-Hazlett', None, "NPS page cited as NPS-Hazlett in the PDF (exact URL not recorded; www.nps.gov is reachable but the page was not identified): read what it says about hand-hauling and the hour of first fire"),
          B('SS-8009', None, "Stone Sentinels page 8009 (weak source in the PDF; host gettysburg.stonesentinels.com refused here): read the hauling account and the 17:45 time"),
          B('SS-10491', None, "Stone Sentinels page 10491 (weak source; host refused here): read the 'one driven to the summit' account")],
 consequence=["E-15 / S-038: first-fire window moves to 'on arrival about 16:30' (documented), the 17:45 stays a PDF scenario; hauling method becomes a selector with the three accounts; no epaulement drawn (gap)"],
 lookups=[L('lib','dragged the guns|lifted his guns|lashed to their utmost|dragging the heavy cannon',4,'4 books; conflicting methods'), L('OR1','Hazlett (R028, R217, R221)',3,'move 16:30, immediate fire, died 20:00')],
 changes=["first fire 17:45 now flagged unsupported with the documented alternative", "hauling: conflict recorded with four accounts"],
))

ROWS.append(R('R14.E-16', 'partially_supported', 'open_gaps',
 pdf_claim="Devil's Den / Houck's Ridge: no works; Ward lacked time or inclination; Ward's brigade, Smith's 4th NY Battery (emplaced at Devil's Den).",
 corrected="The OR is silent about any works built by Ward's brigade before the attack: Ward's report mentions a stone wall about 160 yd ahead that both sides fought for (an existing wall), and no regimental report of the brigade reports works. The 'lacked time or inclination' reason is not in any source. The NPS landscape report states that soldiers built stone wall defense works in the vicinity of Devil's Den (builder and date not given). A positive 'no works' therefore remains unproven.",
 structures=['E-16', 'P-05'],
 sub=[
  S('a', "Existing stone wall about 160 yd in advance, fought for for about an hour and a half.", 'documented', 'supported', [
    C('OR1','R135',"a position behind a stone wall, about 160 yards in advance"),
    C('OR1','R135',"both parties endeavoring to gain possession of the stone wall")]),
  S('b', "No works in Ward's brigade reports or Smith's battery report.", 'open_gap', 'partial', [], note="Searched R135-R146 and R181-R185 for breastwork, barricade, thrown up, hastily, stone wall/fence, fortif, rifle-pit, intrench: only the existing wall (R135, R181) and a Jul 4 line of breastworks behind which the 124th NY moved (R136, made by others). Silence, not a positive statement."),
  S('c', "Stone wall defense works were built in the vicinity of Devil's Den (builder and date unstated), typically two to three feet high.", 'documented', 'partial', [
    C('NPS','NPS-CLR-ROT-V1',"STONE WALL DEFENSE WORKS Located predominantly in the vicinity of Little Round Top, Big Round Top, and Devil’s Den")],
    note="NPS CLR (2014), secondary and general; they were built 'to strengthen their defensive line or consolidate a position that had been gained through offensive action', which fits the Confederate side after Jul 2."),
  S('d', "Reason: Ward lacked time or inclination.", 'open_gap', 'unsupported', [], note="Not in the OR or the NPS texts read."),
 ],
 stays_unsupported=["Reason for no works", "Positive 'no works' for Ward's brigade", "Builders, dates and locations of the Devil's Den stone walls"],
 register=['fence-1-EG-07'],
 consequence=["E-16: keep 'no works found' as a gap-marked state for Ward's brigade (not a fact); add an unplaced scenario 'stone wall defense works near Devil's Den, builder and date open (NPS)'"],
 lookups=[L('OR1','R135-R146, R181-R185 works terms',3,'only the existing stone wall'), L('NPS','Devil\'s Den works',5,'NPS-CLR-ROT-V1 p.83 general statement')],
))
