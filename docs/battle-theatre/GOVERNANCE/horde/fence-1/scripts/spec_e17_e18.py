from spec_lib import R, S, C, B, L
ROWS = []

ROWS.append(R('R14.E-17', 'corrected', 'open_gaps',
 pdf_claim="Cemetery Ridge, rail works: unknown unit, unknown dates; 'No source found for rail breastworks on Cemetery Ridge. Do not animate rail piles as documented. A July 2 evening gap south of the Copse implies no continuous works there.' (open gap)",
 corrected="CONTRADICTED by the Official Records: rail and stone breastworks on the Cemetery Ridge line are documented by unit, material and clock window in three waves. Jul 1 evening (Robinson's division, First Corps, on the line left of Cemetery Hill parallel with the Emmitsburg road): Baxter (about 17:00, until relieved about 10:00 Jul 2), Coulter, the 107th Pa. and the 88th Pa. (rails and earth). Jul 2 from about 16:00 (Second Corps, Harrow's 15th Mass. and 82nd NY, the 7th Michigan and the 80th NY / 151st Pa. in the evening): fences torn down or rails piled and breastworks built; Hancock names 'a slight breastwork of such materials as the adjoining fences afforded' on the crest right of the brick house. Jul 3 (before and during the cannonade and after): the 28th Mass., the 69th Pa. (fence-rail breastwork strengthened with stone; 'July 3' in the Cornell scan, 'July 2' in two other scans), Stone's brigade (143rd, 149th/150th Pa. rails and stones), the 142nd and 121st Pa., the Vermont brigade, the 69th/71st Pa., and the 88th Pa. again about 18:00. No source describes a continuous line (each is a regiment-length 'slight', 'small' or 'hasty' work) and no 1863 dimension is printed; the NPS says rapid works were mostly no higher than three feet.",
 structures=['E-17', 'P-01', 'FEN-emmitsburg-road', 'FEN-cemetery-ridge-walls', 'S-062'],
 sub=[
  S('a', "Jul 1 evening (from about 17:00): Robinson's division made temporary breastworks on the line left of Cemetery Hill parallel with the Emmitsburg road; the 88th Pa. used rails and earth; the 107th Pa. threw up strong breastworks; Coulter built them of materials at hand; relieved by the Second Corps about 10:00 (Baxter) or noon (Coulter) Jul 2.", 'documented', 'supported', [
    C('OR1','R052',"About 5 o'clock the brigade moved, with the division, from Cemetery Hill to the left and forward, near and parallel with the Emmitsburg road"),
    C('OR1','R052',"made temporary breastworks, and remained in this position until about 10 o'clock on the morning of the 2d"),
    C('OR1','R044',"having built breastworks of such materials as were at hand"),
    C('OR1','R051',"we fell back to the left of Cemetery Hill, and threw up strong breastworks"),
    C('OR1','R054',"threw up breastworks made of rails and earth")],
    note="Baxter says the line stood until about 10:00 Jul 2 (relieved by Webb); Coulter says about noon (relieved by the Third Division, Second Corps). The place name is 'left of Cemetery Hill' / 'parallel with the Emmitsburg road', not a surveyed line."),
  S('b', "Jul 2 from about 16:00: Harrow's 15th Mass. and 82nd NY, sent forward when the Third Corps advanced at 16:00, tore down fences, piled rails and built breastworks along the Emmitsburg road right of the brick house; Hancock calls it a slight breastwork of fence materials; the 7th Michigan turned a rail fence into a barricade.", 'documented', 'supported', [
    C('OR1','R098',"At 4 o'clock the Third Corps advanced"),
    C('OR1','R098',"tore down the fences and constructed breastworks"),
    C('OR1','R099',"hastily taken down and piled in their front"),
    C('OR1','R101',"we built a small breastwork of rails behind the fence"),
    C('OR1','R076',"a slight breastwork of such materials as the adjoining fences afforded"),
    C('OR1','R112',"converted into a sort of barricade by bringing rails from the adjoining fences")]),
  S('c', "Jul 2 evening: the 80th NY (20th NYSM) and the 151st Pa. on the left center constructed a breastwork of the rail fence and other material; the same fence barricade proved of service next day.", 'documented', 'supported', [
    C('OR1','R057',"constructed a breastwork of the fence"),
    C('OR1','R057',"rail fence, which they converted into a barricade"),
    C('NPS','NPS-CLR-ROT-V1',"about 4 p.m., “I was ordered to move to the front on our left center", role='context'),
    C('NPS','NPS-CLR-ROT-V1',"breastwork of an old fence and such other material as could be readily procured", role='context')],
    note="This is the Gates passage that the previous pass attached to Cemetery Hill (E-04); the text places it on 'the last and lowest of the ridges between the Taneytown and Emmitsburg roads', with Stannard's regiments on the right and left, i.e. on the Cemetery Ridge line. The NPS (CLR Record of Treatment) quotes a version 'breastwork of an old fence ... about 4 p.m.', which is not in the Cornell, Illinois or rootrich scans of the OR."),
  S('d', "Jul 3 morning to afternoon: 28th Mass. erected breastworks of rails and earth in the morning; Stone's brigade threw up rails-and-stone breastworks; 69th Pa. behind a breastwork of fence rails strengthened with stone; 69th and 71st Pa. behind a low stone wall and a slight breastwork hastily constructed by them; Vermont troops threw up a breastwork 100 ft in advance; 142nd and 121st Pa. behind breastworks of rails during the attack.", 'documented', 'supported', [
    C('OR1','R083',"in the morning erected breastworks of rails and earth"),
    C('OR1','R062',"threw up a rude breastwork of"),
    C('OR1','R063',"this command threw up a slight breastwork of rails and stones in front of its position"),
    C('OR1','R064',"This morning at daylight we commenced throwing up such breastworks as could be made"),
    C('OR1','R105',"strengthened witli stone, on the morning of July 3"),
    C('OR1','R076',"behind a low stone wall and a slight breastwork hastily constructed by them"),
    C('OR1','R057',"the Vermont troops threw up a breastwork to my left and about 100 feet in advance of my line"),
    C('OR1','R059',"was advanced to a rude breastwork of rails"),
    C('OR1','R056',"placed behind a breastwork of rails near the crest of a hill")],
    note="R105 (Davis, 69th Pa.): the Cornell scan reads 'on the morning of July 3'; the Illinois (warofrebellion271unit) and rootrich (warofrebellion012701rootrich) scans both read 'on the morning of July 2' (printed p.431, leaf 449 of the Illinois item). The printed page image was not read (the archive.org data-node host is refused here), so both dates are carried; 2 of 3 scans give July 2."),
  S('e', "Jul 3 about 18:00, after the repulse: the 88th Pa. ran to the center and at once threw up breastworks of rails.", 'documented', 'supported', [
    C('OR1','R054',"We immediately threw up breastworks of rails")]),
  S('f', "NPS: wooden rails of fences dismantled before Jul 2 fighting were used for new breastworks; breastworks east of the Emmitsburg Road north of Klingel used Klingel-Codori boundary fence material; rapid works mostly no higher than three feet; earthworks were thrown up in woods east of the Cemetery Ridge crest on Jul 2-3.", 'documented', 'supported', [
    C('NPS','NPS-CLI-ERR',"Some were dismantled before the fighting began on July 2 to allow ease of troop movement, while the wooden rails were used to create new breastworks"),
    C('NPS','NPS-CLI-ERR',"breastworks constructed on eastern side of road, north of Klingel, also used material from Klingel-Codori property boundary fence"),
    C('NPS','NPS-CLR-ROT-V1',"Due to their rapid construction, most were no higher than three feet"),
    C('NPS','NPS-CLR-ROT-V1',"Earthworks were thrown up within and on the edge of the woods by Union troops during the second and third days of the battle")],
    note="Modern NPS statements (secondary); the CLI draws on a 2000 draft CLR; the three-foot figure is a general statement for rapidly built works, not a measurement of any Cemetery Ridge work."),
  S('g', "A continuous line of rail breastworks along Cemetery Ridge.", 'open_gap', 'unsupported', [], note="Every source describes a regiment- or brigade-length work; none states continuity. The PDF's 'gap south of the Copse on Jul 2 evening' is neither confirmed nor refuted here."),
  S('h', "Dimensions (length, height, profile) of any specific Cemetery Ridge work.", 'open_gap', 'unsupported', [], note="Only qualitative words ('slight', 'small', 'rude', 'hastily', 'low')."),
 ],
 stays_unsupported=["Continuity of a line along Cemetery Ridge", "Dimensions of any work", "Printed date of the 69th Pa. breastwork (July 2 vs July 3; page image owed)", "Clock hours of most Jul 3 works (only 'morning', 'daylight', 'during the cannonade', '18:00')"],
 conflicts=["69th Pa. works: July 3 (Cornell scan) vs July 2 (two other scans)", "Gates: about 16:00 Jul 2 order (NPS quote) vs about 17:00 (OR report text)", "Robinson's division relieved about 10:00 (Baxter) vs about noon (Coulter), Jul 2"],
 register=['fence-1-EG-08'],
 blocked=[B('NPS-CWS10', None, "NPS source cited as NPS-CWS10 in the PDF (exact URL not recorded; www.nps.gov and www.npshistory.com are reachable but the item was not identified): read what it says on rail breastworks on Cemetery Ridge"),
          B('OR27-1 p.431 page image', 'https://archive.org/details/warofrebellion271unit', "archive.org item warofrebellion271unit, printed p.431 (leaf 449): read the page image to settle 'July 2' vs 'July 3' in Davis's report; the image host (dn*.archive.org) is refused here, so only the OCR was compared")],
 consequence=["E-17 must change from open_gap/'no source' to documented works: add works records (builder unit, material, window) for (1) Robinson's division Jul 1 17:00-22:00 on the line left of Cemetery Hill / along the Emmitsburg road, (2) Harrow's 15th Mass. and 82nd NY Jul 2 16:00-17:00 at the brick house, 80th NY/151st Pa. Jul 2 evening, (3) the Jul 3 regimental works listed above; each as a short rail/stone breastwork, dimensions marked gap (no 1863 profile)",
              "FEN-emmitsburg-road: fences torn down by Harrow's regiments from about 16:00 Jul 2 (and earlier removal north of Klingel per NPS): do not show an intact Emmitsburg Road fence in front of the brick house after 16:00 Jul 2; RULE-03 not violated (works are after Jul 2 begins)",
              "DD-02 (Cemetery Ridge breastworks built on screen) is confirmed and widened; 'July 2 gap south of the Copse' stays unevidenced",
              "FEN-cemetery-ridge-walls and the Angle wall remain pre-existing (no construction animation); rail works are additions beside them"],
 lookups=[L('OR1','(breastwork|barricade|intrenchment)... (rails|rail fence|fence)',30,'R036 R045 R052 R054 R056 R057 R059 R060 R062-R064 R076 R083 R099 R101 R105 R112 and others; relevant ones used'), L('OR1 second scans','Davis R105: July 2 vs July 3',2,'both second scans read July 2'), L('NPS','rails breastwork Cemetery Ridge/Klingel',6,'NPS-CLI-ERR, NPS-CLR-ROT-V1')],
 changes=["PDF 'no source found' contradicted (already DD-02)", "Gates's breastwork moved here from E-04", "new units: Robinson's division Jul 1, Stone's brigade, 28th Mass., Vermont brigade, 88th Pa. Jul 3"],
))

ROWS.append(R('R14.E-18', 'corrected', 'open_gaps',
 pdf_claim="Seminary Ridge, Warfield Ridge, Oak Hill, Benner's Hill, town barricades: Confederate units, unknown dates; 'No Confederate works found in the notes for July 2-3' (open gap).",
 corrected="Confederate works are documented, though not for all five sites and not on the dates the PDF searched. Town: on the early morning of Jul 2 the Confederates began barricading the south side of Middle Street from Seminary Ridge to Stratton Street and broke down fences on the north side (Jacobs). Jul 2: the Confederates in McMillan's farmstead used his fencing in entrenchments after the Union withdrawal on Jul 1 (NPS). Night of Jul 3-4 and Jul 4: Ewell's divisions intrenched on the hills near the town (Steuart, O'Neal, Pickens, Goodgame, Hopkins), Hood's division was ordered to erect breastworks in a line facing down the Emmitsburg road (Benning; the ridge is not named in his report, Warfield Ridge is by position), the Texas brigade threw up breastworks on the ridge, Lee ordered breastworks along the whole ridge from Oak Hill south to the Emmitsburg road on Jul 4 (NPS), with stacked-rail works through the seminary campus and earthen works on Oak Ridge. A Union officer saw Confederates 'fortifying' a wooded ridge in the night of Jul 3-4 (McCandless). Benner's Hill: nothing found (the OR text has no 'Benner' hit in the OCR; recall limited). The 'July 2-3' gap in the PDF stays true for Seminary Ridge and Warfield Ridge on Jul 2-3 (no source found).",
 structures=['E-18', 'G-14', 'S-009'],
 sub=[
  S('a', "Town barricade: early Jul 2 the Confederates began barricading Middle Street (south side, Seminary Ridge to Stratton Street) and broke down fences on the north side so reinforcements could pass.", 'documented', 'supported', [
    C('LIB','JACOBS-1864',"They commenced barricading Middle street"),
    C('LIB','JACOBS-1864',"they also broke down the fences, on the north side")],
    note="Prof. M. Jacobs, Pennsylvania College, a resident witness (1864, secondary book); 'Early on Thursday morning' = Jul 2. Dimensions and materials not stated."),
  S('b', "Night of Jul 3-4 and Jul 4, Ewell's corps near the town: Steuart's brigade occupied and intrenched the crest toward midnight; the 26th Alabama intrenched on a hill commanding the city at 02:00 Jul 4; the 12th Alabama occupied and fortified the hills; O'Neal's brigade fortified the hill left of the railroad on Jul 4; the 45th NC built small fortifications on Jul 4.", 'documented', 'supported', [
    C('OR2','R482',"occupied and intrenched itself on the crest of the hill"),
    C('OR2','R530',"intrenched ourselves on a hill commanding the city"),
    C('OR2','R529',"We retired to the rear of the town, occupied and fortified the hills"),
    C('OR2','R523',"ordered to occupy the hill to the left of the railroad and fortify, which I did during Saturday, July 4"),
    C('OR2','R510',"built small fortifications during July 4")]),
  S('c', "Warfield Ridge / Emmitsburg Road, Jul 3-4: Hood's division (Benning's brigade on the left of the road) was ordered to erect breastworks on Jul 4; the 5th Texas threw up breastworks on the crest of the ridge from which the Jul 2 charge started.", 'documented', 'supported', [
    C('OR2','R458',"was ordered to erect breastworks, which it did"),
    C('OR2','R457',"Here we tiirew up breastworks, behind which we remained during the night")],
    note="R457's date is 'the night' after the withdrawal to the ridge (Jul 3-4 sequence); the OCR reads 'tiirew'. Benning R458: 'The next day (the 4th)'. Neither report names Warfield Ridge: the identification is by position (Hood's division line facing down the Emmitsburg road; 'the crest of the ridge from which the charge of the day previous commenced')."),
  S('d', "Lee ordered the troops to spend Jul 4 building and strengthening breastworks along the whole ridge from Oak Hill south to the Emmitsburg road; stacked-rail works through the seminary campus and Seminary Grove, earthen works on Oak Ridge (Daniel's and O'Neal's brigades).", 'documented', 'supported', [
    C('NPS','NPS-CLI-1STDAY',"he ordered his troops to spend the following day, July 4, building and strengthening breastworks along the entire ridge to the north and south of the Thompson House, from Oak Hill south to Emmitsburg Road"),
    C('NPS','NPS-CLI-1STDAY',"Daniel’s and O’Neal’s brigades occupied Oak Ridge north of the railroad cut, and there dug earthen breastworks through the woods"),
    C('LIB','JACOBS-1864',"where, during the day, they occupied some time in strengthening their breastworks")],
    note="NPS CLI (secondary, 2021 CLR); Jacobs (1864) agrees for the day of Jul 4 on Seminary Ridge."),
  S('e', "A Union officer saw the Confederates fortify a wooded ridge half a mile in front in the night of Jul 3-4; McMillan's fencing was used in Confederate entrenchments after the Jul 1 Union withdrawal (NPS).", 'documented', 'supported', [
    C('OR1','R219',"busy during the night chopping timber and fortifying"),
    C('NPS','NPS-CLI-PCB',"Following the Union withdrawal, Confederate forces took possession of the farmstead. During this time, McMillan’s fencing was used in constructing entrenchments")]),
  S('f', "Oak Hill and Seminary Ridge works on Jul 2-3; Benner's Hill works.", 'open_gap', 'unsupported', [], note="No source read describes Confederate works at those sites on Jul 2-3 (OR 2 intrench|fortif|breastwork|rifle-pit|barricad|abatis|earthwork: 312 hits read through R570; Benner's Hill: no hit for 'Benner' in OCR). Traces of Confederate breastworks between the turnpike and the seminary were still visible in 1873 (Bachelder), date of building not stated."),
 ],
 stays_unsupported=["Confederate works on Jul 2-3 at Seminary Ridge, Warfield Ridge, Oak Hill and Benner's Hill", "Dimensions of any Confederate work", "Length/form of the Middle Street barricade"],
 register=['fence-1-EG-09'],
 consequence=["E-18: replace the whole-row open gap by dated Confederate works: Middle Street barricade (Jul 2 morning), Ewell's hill works (Jul 3-4 night), Hood's Warfield Ridge works (Jul 4), the Seminary Ridge ridge-long works (Jul 4); the units are Confederate and arrive/stand as documented; Jul 2-3 stays a marked gap for the other sites"],
 lookups=[L('OR2','intrench|fortif|breastwork|rifle-pit|barricad|abatis|earthwork R430-R570',312,'read; Gettysburg Jul 3-4 hits used'), L('lib','Benner works',1,'no Confederate works at Benner\'s Hill'), L('OR1/2','Benner',0,'no OCR hit')],
))
