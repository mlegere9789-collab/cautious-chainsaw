from spec_lib import R, S, C, B, L
ROWS = []

ROWS.append(R('R14.E-05', 'partially_supported', 'open_gaps',
 pdf_claim="Upper Culp's Hill (60th NY upper crest, 102nd and 149th in the saddle, 137th lower crest, 78th reserve), Greene's 3rd Brigade: felled trees cut into blocks and stacked as a close log fence, stones, earth, head logs on much of the line, cordwood piles, rifle pits, boughs and logs in front; about 5 ft high, about 300 yd at first; start about 06:00 Jul 2 (conflict: night of Jul 1-2, DMNA 60th NY); finish about 09:00-10:00 or about noon; Slocum and Geary thought works unnecessary, Greene (a former railroad engineer) ordered them.",
 corrected="Greene's brigade, camped the night of Jul 1 near Little Round Top, marched over about 06:00 Jul 2 (sunrise in Greene's 1893 address) and began at once to intrench: a close log fence of felled trees with cordwood set slanting against the outer face, earth where spades and picks were at hand, 'logs, cord-wood, stones, and earth' in Greene's report. Finish: about 09:00 (60th NY), about 10:00 (Jones, 60th NY, 1888), 'by 12 o'clock' good cover (Greene; the Cornell scan misreads it as 13, two other scans read 12), about noon (137th NY). The night-of-Jul-1 start is contradicted by the brigade's own accounts. A height of about five feet is given by an NPS report for the elaborate log-crib works on Culp's Hill in general. Head logs, boughs in front and the 300-yd first length are not in any source read here.",
 structures=['E-05', 'S-023', 'S-024'],
 sub=[
  S('a', "Start about 06:00 Jul 2 (not the night of Jul 1-2): the brigade camped the night of Jul 1 near Little Round Top and was marched to Culp's Hill about 06:00.", 'documented', 'supported', [
    C('OR1','R308',"at or about 6 a. m., the regiment with the brigade assumed position"),
    C('OR1','R307',"we took position at about G a. m. on the right of the First Corps"),
    C('LIB','BL-3',"About 6 o'clock the next morning it was marched over from that point"),
    C('LIB','BL-3',"camped on the night of the first day under the shadow of Little Eound Top"),
    C('LIB','NY-GB-1900',"At sunrise we marched to the extreme right of the army, to Culp’s Hill")],
    note="Greene's 1893 address says 'sunrise'; the OR and Jones say about 6 a.m. (sunrise at Gettysburg on Jul 2 was before 05:00): a clock difference carried. The Cornell OCR reads Greene's hour as 'G a. m.' (6)."),
  S('b', "Materials and method: felled trees blocked up into a close log fence, cordwood piles set slanting against the outer face, stones, earth where spades and picks were at hand.", 'documented', 'supported', [
    C('OR1','R307',"we began to intrench ourselves and throw up breastworks of the covering height, of logs, cord-wood, stones, and earth"),
    C('OR1','R310',"A breastwork of trees and dirt was soon thrown up"),
    C('OR1','R311',"cord-wood and rock"),
    C('LIB','BL-3',"blocked them up into a close log fence"),
    C('LIB','BL-3',"strengthened their work with earth"),
    C('LIB','EDDY-1864',"having constructed a breastwork of such material as was found convenient — earth, stone, and logs"),
    C('LIB','NY-GB-1900',"made with a few trees cut, and with cordwood and loose stones which we found in the immediate vicinity")]),
  S('c', "Finish: about 09:00 (60th NY), about 10:00 (Jones), 'by 12 o'clock' good cover (Greene), about noon (137th NY, Eddy).", 'documented', 'conflict', [
    C('OR1','R308',"worked with a will until about 9 a. m."),
    C('LIB','BL-3',"By 10 o'clock it was finished"),
    C('OR1','R307',"we had a good cover for the men"),
    C('OR1','R312',"The breastworks were completed about noon"),
    C('LIB','EDDY-1864',"by noon on the 2d, was successfully accomplished")],
    note="Greene's sentence reads 'By 13 o'clock' in the Cornell scan and 'By 12 o'clock' in both archive.org second scans (warofrebellion271unit, warofrebellion012701rootrich; second witnesses checked 2026-11-13). The PDF's two finish values (about 10:00 and about noon) are both documented; carry both."),
  S('d', "Height about 5 ft (the only height figure).", 'documented', 'partial', [
    C('NPS','NPS-CLR-ROT-V1',"In a few areas such as Culp’s Hill, elaborate defense works consisted of log cribs flled with stone and earth, built to fve feet in height")],
    note="NPS Cultural Landscape Report (Record of Treatment, vol. 1) states it for Culp's Hill works in general (secondary, modern; the PDF text layer drops the 'fi' ligature). It does not say 'Greene's brigade' or 'upper crest'; no 1863 source gives a height. Treat as documented-secondary for 'elaborate works on Culp's Hill'; per-regiment heights remain open."),
  S('e', "Length about 300 yd at first.", 'open_gap', 'blocked_host', [],
    note="Rests on Gettysburg Daily (GD-219, web page). Greene's report gives only the distance of Rock Creek (200-400 yd) and a stone wall about 300 yd behind Kane's line; no source read here gives the length of Greene's first works."),
  S('f', "Head logs on much of the line; boughs and logs in front as concealment; rifle pits.", 'open_gap', 'unsupported', [],
    note="No hit for head-log/head log/boughs in front near Culp's Hill in OR 1-3, the 99-text library, Eddy, Morhous, Dawes or the NPS reports (searches 2026-11-13). The 'cordwood' and 'earth' of the sources are not head logs."),
  S('g', "Greene, a former railroad engineer, ordered the works against the view of Slocum and Geary.", 'open_gap', 'unsupported', [],
    note="Greene's report says only 'As soon as we were in position, we began to intrench ourselves'; his 1893 address says 'We were ordered to erect defensive works'. The disagreement with Slocum and Geary is not in the texts read."),
 ],
 stays_unsupported=["Head logs, boughs in front, rifle pits", "First length about 300 yd (web source only)", "Per-regiment height (only a general NPS statement of five feet)", "Slocum/Geary opposition and Greene's engineering background"],
 conflicts=["Start: night of Jul 1-2 (DMNA, PDF) vs about 06:00 (Greene, Jones, 60th NY; contradicts DMNA)", "Finish: about 09:00 / 10:00 / noon by source", "March hour: 'sunrise' (Greene 1893) vs about 06:00 (OR)"],
 register=['fence-1-EG-03'],
 blocked=[B('GD-219', None, "Gettysburg Daily page cited as GD-219 (URL not recorded in the PDF source list; host gettysburgdaily.com refused here): read the length given for the first Culp's Hill works (about 300 yd) and the 800-yd figure for after 18:30"),
          B('DMNA-60NY', 'https://museum.dmna.ny.gov/unit-history/infantry-1/60th-infantry-regiment/historical-sketch', "NY State Military Museum 60th NY historical sketch (host museum.dmna.ny.gov refused here): read where it puts the start of the works (the PDF says night of Jul 1-2) and the 'angles and salients through the day' text"),
          B('HMDB-13997', 'https://www.hmdb.org/m.asp?m=13997', "Historical Marker Database entry 13997 (URL formed from the marker number in the PDF key; host hmdb.org refused here): read the marker text for the start hour and builders")],
 consequence=["E-05 works record: start 06:00 Jul 2 (documented) replaces any Jul 1-2 night start; finish windows 09:00-12:00 as selectable (Jones 10:00 default is documented; Greene noon)", "E-05 fabric: close log fence + cordwood battening + earth where tools; no head logs or boughs unless a source is found (mark as gap if drawn)", "E-05 height: 5 ft only as 'Culp's Hill log-crib works in general' (NPS, secondary); do not take profiles from the rebuilt works (CLR: Culp's Hill earthworks reconstructed 1882)"],
 lookups=[L('lib','head[- ]?logs? (regimental books, OR)',0,'no hit'), L('NPS','head logs / Culp\'s Hill works',35,'NPS-CLR-ROT-V1 p.83: five feet; no head logs'), L('OR1 second scans','Greene: By 13 o\'clock',2,'both scans read 12')],
 changes=["finish: 'By 13 o'clock' resolved to 12 by two second scans", "start: night of Jul 1-2 contradicted", "new documented: close log fence, cordwood battening, 10:00 finish (Jones), 5 ft (NPS, general)"],
))

ROWS.append(R('R14.E-06', 'corrected', 'open_gaps',
 pdf_claim="Traverse at the right-hand end of Greene's line (running back along a ridge crest toward the Baltimore Pike; where the line dropped into the swale): a traversing trench the 137th NY used to face south; Greene supervised personally; Jul 2 morning with E-05; work continued through the day; no dimensions documented.",
 corrected="The 137th NY (Colonel Ireland) commenced a traverse on the brigade's right early on Jul 2, extended it about twenty yards, and used it that evening: after the 18:30 withdrawal the 137th occupied Kane's trenches, was attacked on its right about 20:00, threw its right back perpendicular to the intrenchments and about 22:00 fell back to the traverse and reformed (Greene, OR and 1893 address). The PDF's 'no dimensions' is corrected to about twenty yards (Greene 1893, secondary, participant); the build clock is 'early in the day' by sequence, not a printed hour.",
 structures=['E-06', 'S-023', 'S-025'],
 sub=[
  S('a', "The 137th NY commenced a traverse on the brigade's right during the morning works; it was extended about twenty yards.", 'documented', 'supported', [
    C('LIB','NY-GB-1900',"commenced a traverse on our right, which was extended for about twenty yards"),
    C('LIB','NY-GB-1900',"This was completed early in the day, almost exclusively by the Third Brigade")],
    note="Greene's 1893 dedication address (New York at Gettysburg, 1900): a retrospective participant account (secondary). 'Early in the day' is the address's own wording for the main works; the traverse sentence follows it."),
  S('b', "Evening use: after the 18:30 withdrawal the 137th held Kane's trenches; about 20:00 attacked on its right, Ireland threw his line back perpendicular to the intrenchments; about 22:00 the regiment fell back to the traverse and reformed.", 'documented', 'supported', [
    C('OR1','R307',"throwing back his line perpendicular to the intrenchments"),
    C('OR1','R307',"About 8 p. m. the enemy appeared on our right flank"),
    C('LIB','NY-GB-1900',"to the traverse on our right, where they reformed in good order and maintained their position")]),
  S('c', "Traverse built in the morning with E-05 (PDF).", 'inferred', 'partial', [], note="Greene's 1893 address orders the traverse after the main works and before 'we rested on our arms'; no clock is printed. The OR reports (Greene, 137th) describe only the evening change of front, not a build."),
  S('d', "Traverse height, profile, and 'right angle' geometry.", 'open_gap', 'unsupported', [], note="Only the length (about twenty yards) is stated."),
 ],
 stays_unsupported=["Exact build hour of the traverse", "Height and profile of the traverse", "Whether it was built at right angles to the main line (the OR describes the line thrown back perpendicular, not the traverse)"],
 register=['fence-1-EG-03'],
 consequence=["E-06: traverse may be built on screen by the 137th NY in the Jul 2 morning window with length about 20 yd (documented-secondary); height and profile stay labelled gaps; before this, the previous note 'do not render a traverse in the morning' is lifted"],
 lookups=[L('lib','commenced a traverse on our right',1,'NY-GB-1900 p.264 (Greene address)')],
 changes=["dimension: 'no dimensions documented' -> about twenty yards (Greene 1893)", "builder: Greene supervised -> 137th NY, Colonel Ireland"],
))

ROWS.append(R('R14.E-07', 'partially_supported', 'open_gaps',
 pdf_claim="Culp's Hill, either side of Greene: breastworks by Kane's 2nd Brigade (Greene's right) and Wadsworth's I Corps men (Greene's left); Jul 2 morning; end about same as E-05; per-regiment times not found.",
 corrected="Kane's brigade (Second Brigade, Geary's division) built a breastwork of logs, stone and earth at right angles to Greene's line; the order came soon after Kane assumed command at 06:00 and Kane says it was done 'before sundown' (Greene's 1893 address has Kane's 400 men already next on his right when his own works were finished early in the day). The PDF's morning window and Kane's 'before sundown' are both carried. Wadsworth's First Corps men had works on the hill (Cutler's brigade: 'threw up breastworks'), adjoining Greene's left; no per-regiment times exist.",
 structures=['E-07', 'S-024'],
 sub=[
  S('a', "Kane's brigade threw up a substantial breastwork of logs, stone and earth, at right angles to the Third Brigade's works, on a wooded hill.", 'documented', 'supported', [
    C('OR1','R302',"before sundown threw up a substantial breastwork"),
    C('OR1','R303',"threw up a breastwork of logs, stone, and earth"),
    C('LIB','NY-GB-1900',"Next on the right was General Kane, with about 400 men of the Second Brigade")]),
  S('b', "Clock: Kane assumed command at 06:00 Jul 2 and the brigade was ordered into line 'soon after'; the breastwork was done 'before sundown'; Cobham says the brigade remained there until evening.", 'documented', 'conflict', [
    C('OR1','R302',"I assumed command at 6 a. m. on the morning of the 2d instant"),
    C('OR1','R302',"The brigade was ordered forward into line with"),
    C('OR1','R303',"Here we remained till evening")],
    note="'Before sundown' (Kane) is wider than the PDF's 'Jul 2 morning'; Greene's address implies the Second Brigade's line stood early. Both windows carried."),
  S('c', "Wadsworth's First Corps men on Greene's left had works: Cutler's brigade threw up breastworks; the 60th NY connected with the right of the First Corps; the 95th NY held intrenchments on the right on Jul 2-3.", 'documented', 'supported', [
    C('OR1','R308',"connecting with the right of the First Army Corps"),
    C('OR1','R041',"On the 2d instant, we occupied the intrench"),
    C('LIB','NY-GB-1900-v2',"Cutler's Brigade threw up breastworks here, in which the Ninety-fifth remained during the succeeding two days of fighting")],
    note="The two First Corps witnesses place the works 'on the right' (Pye) and on 'Gulp's Hill' (1900 volume); neither gives a regimental clock."),
 ],
 stays_unsupported=["Per-regiment clock times for Kane's regiments and for Wadsworth's regiments", "Whether Wadsworth's works are 'on Greene's left' regiment by regiment"],
 conflicts=["Kane's works: after 06:00 and 'before sundown' (Kane) vs 'Jul 2 morning' (PDF)"],
 register=['fence-1-EG-14'],
 consequence=["E-07: window 06:00 to before sundown (default: morning to early afternoon, selectable), builder Kane's brigade (111th PA, Cobham commanding until Kane's arrival at 06:00)"],
 lookups=[L('OR1','R302 R303 R308 R041',4,'all quoted')],
))

ROWS.append(R('R14.E-08', 'corrected', 'open_gaps',
 pdf_claim="Lower Culp's Hill, Williams's division, XII Corps (including Lockwood's brigade, position unconfirmed): log breastwork, Jul 2 morning on arrival; Lockwood's brigade position and work: open gap.",
 corrected="Williams's (then Ruger's) division was ordered about 09:00 Jul 2 onto Culp's Hill on Greene's right and built breastworks 'immediately' of logs, rocks and earth (Ruger); the Third Brigade (Colgrove) of rails, timber and stone, with the 107th NY ordered to construct and the others 'speedily' covering the whole line. Lockwood's brigade did not take part on Jul 2: his own report has the First Potomac Home Brigade and the 150th NY arriving at 08:00 on Jul 3 (Greene: 07:30). The Jul 2 evening move of the First Division left the works empty from about 18:30.",
 structures=['E-08'],
 sub=[
  S('a', "Ruger's division was ordered about 09:00 Jul 2 to the ridge called Culp's Hill and built breastworks of logs, rocks and earth along the whole line.", 'documented', 'supported', [
    C('OR1','R273',"About 9 a. m. I received orders from General Williams, commanding corps"),
    C('OR1','R273',"were immediately constructed of logs, rocks, and earth along the whole line")]),
  S('b', "The Third Brigade (Colgrove): 107th NY ordered to construct breastworks; works of rails, timber and stone speedily thrown up along the whole line.", 'documented', 'supported', [
    C('OR1','R286',"I ordered the One hundred and seventh New York to construct breastworks"),
    C('OR1','R286',"were speedily thrown up, covering the whole line"),
    C('OR1','R286',"Shortly before sundown, I received information through one of your aides")],
    note="Rails in Colgrove's line imply fence rails taken locally; the report does not name a fence (inference only)."),
  S('c', "Candy's 29th PA (Geary's division) began to fortify its own position on the 2d and ordered away at 19:00.", 'documented', 'supported', [
    C('OR1','R304',"commenced to fortify our position"),
    C('OR1','R304',"ordered by General Geary to leave our breastworks and move rapidly to the rear")]),
  S('d', "Lockwood's brigade position and work on Jul 2: none; the brigade reached the First Division at 08:00 Jul 3 and was later ordered to occupy the breastworks on the right.", 'documented', 'supported', [
    C('OR1','R282',"arrived, and reported to the First Division, Twelfth Army Corps, at 8 a. m. July 3"),
    C('OR1','R282',"ordered to occupy the breastworks on the right"),
    C('OR1','R307',"At 7.30 a. m. General Lockwood, with his brigade")]),
 ],
 stays_unsupported=["Exact hour the first Williams-division works were finished", "Where Lockwood's regiments stood on the morning of Jul 3 before 17:00 ('various places')"],
 register=['fence-1-EG-04'],
 consequence=["E-08: remove 'Lockwood's brigade (position unconfirmed)' from the Jul 2 builder list; Lockwood enters the lower works on Jul 3 (08:00) as an occupant, no construction", "E-08: add 'rails, timber and stone' for the Third Brigade (documented)"],
 lookups=[L('OR1','R282 Lockwood: arrival',1,'8 a.m. July 3')],
 changes=["Lockwood Jul 2 gap closed: not present until 08:00 Jul 3"],
))

ROWS.append(R('R14.E-09', 'partially_supported', 'open_gaps',
 pdf_claim="Whole Culp's Hill line: 'hastily built extension' when the Federal right fell back; 137th NY changed front into the traverse; line stretched to about 800 yd, a single thin line; Greene's brigade alone plus about 750 reinforcements from I and XI Corps later; 18:30 Jul 2; Greene spaced men a foot to several feet apart and sent a skirmish line down the slope.",
 corrected="The First Division left about 18:30 and Geary's First and Second Brigades about 19:00 (Geary, at 7 p.m., 'the First Division had gone nearly half an hour previously'); Greene was ordered to occupy the whole of the intrenchments with his brigade. This was an extension of the garrison along existing works, not a construction: Greene's 1893 address says the Third Brigade extended its lines 'attenuating it to a considerable degree and leaving about a foot between each man', and Jones calls it 'a thin line of separate men'. Reinforcements: about 400 from the Eleventh Corps (Greene) and about 350 from Wadsworth's division (Eddy 1864), 750 together as the PDF says, arriving after the attack began. The 800-yd length is a web-page figure.",
 structures=['E-09', 'S-041', 'S-050'],
 sub=[
  S('a', "About 18:30-19:00 Williams's division and Geary's First and Second Brigades left; Greene was ordered to occupy the whole of the intrenchments with his brigade.", 'documented', 'supported', [
    C('OR1','R307',"leaving the intrenchments of Kane's brigade and Williams' division unoccupied"),
    C('OR1','R307',"I received orders to occupy the whole of the intrenchments"),
    C('OR1','R293',"The First Division had gone nearly half an hour previously")]),
  S('b', "Single thin line: men about a foot apart behind the breastworks.", 'documented', 'supported', [
    C('LIB','NY-GB-1900',"attenuating it to a considerable degree and leaving about a foot between each man in the breastworks"),
    C('LIB','BL-3',"The brigade was strung out into a thin line of separate men")]),
  S('c', "Reinforcements: about 400 men of the Eleventh Corps and about 350 of Wadsworth's division, 750 together.", 'documented', 'supported', [
    C('OR1','R307',"in all about 400 men"),
    C('LIB','EDDY-1864',"about 350 men from the former, and 400 from the latter")],
    note="Greene's own sum is only the Eleventh Corps part (about 400, plus First Corps units named separately); the 350 is Eddy's (60th NY history, 1864, secondary). Greene's 1893 address says 'two regiments from Generals Howard and Wadsworth' were in reserve at the right."),
  S('d', "A 'hastily built extension' of the works.", 'open_gap', 'unsupported', [],
    note="No source describes construction of new works at 18:30; the sources describe occupying the existing intrenchments (and the 137th throwing its line back, E-06)."),
  S('e', "Line length about 800 yd.", 'open_gap', 'blocked_host', [], note="Gettysburg Daily (GD-219), inferred in the PDF; no OR figure. Greene's report gives no length."),
 ],
 stays_unsupported=["800-yd length", "Any construction of a new extension at 18:30"],
 conflicts=["Withdrawal clock: 18:30 (Greene, First Division) vs 19:00 (Geary, Geary's brigades; Rickards 7 p.m.)"],
 register=['fence-1-EG-03'],
 blocked=[B('GD-219', None, "Gettysburg Daily page cited as GD-219 (URL not recorded; host gettysburgdaily.com refused here): read the 800-yd figure and the 'single thin line' wording")],
 consequence=["E-09/S-041: the 18:30 change is an occupation (garrison spread to one man per foot) not a construction; the two clocks 18:30 (First Division) and 19:00 (Geary's brigades) are both documented; 750 reinforcements = 400 XI Corps + about 350 First Corps; 800 yd stays marked inferred"],
 lookups=[L('lib','The First Brigade of the Second Division was reserved for picket duty',1,'Greene address pp.264-265')],
))

ROWS.append(R('R14.E-10', 'confirmed', 'open_gaps',
 pdf_claim="Empty lower-hill Union works (1st Division, Kane and Candy areas): occupation, not construction, by Steuart's brigade after dark Jul 2 (about 19:00-22:00; Johnson's attacks ended by about 22:00), held several hours, driven out Jul 3; Virginians took the empty works on the 137th's right; the 6th Wisconsin ran into their fire; the 14th Brooklyn drove them back.",
 corrected="Confirmed as an occupation, with a documented conflict on whether the works were empty: Union reports say the works were left unoccupied when the First Division and Geary's brigades withdrew (Greene, Rickards, Cobham, Kane: fire from the works when they returned in the dark), Confederate reports say Steuart charged a line of breastworks and scattered the defenders (Steuart, Johnson), Ewell says Steuart took part of the enemy's breastworks and held them until ordered out at noon next day. Clock: Johnson attacked about dusk after the artillery ceased just before sundown (Ewell); Greene was attacked on his front a few minutes before 19:00 and found the enemy in the works on his right about 20:00; Steuart's brigade rested from about 23:00. Both versions kept (no default).",
 structures=['E-10', 'S-042'],
 sub=[
  S('a', "Steuart's brigade held part of the Union works from the night of Jul 2 until ordered out at noon Jul 3.", 'documented', 'supported', [
    C('OR2','R467',"and held them till ordered out at noon next day"),
    C('OR2','R481',"carried a line of breastworks which ran perpendicular")]),
  S('b', "Version A (Confederate): the brigade charged the work and scattered the enemy behind it.", 'documented', 'supported', [
    C('OR2','R482',"The left of the brigade now rested very near one line"),
    C('OR2','R482',"charged the work, and scattered the enemy which was behind it")]),
  S('c', "Version B (Union): the works were left unoccupied; the enemy took possession in the absence of the regiments.", 'documented', 'supported', [
    C('OR1','R304',"having taken possession of them in our absence"),
    C('OR1','R303',"which the enemy had taken possession of during our absence"),
    C('OR1','R302',"At twilight we were removed to the batteries on the turnpike, and shortly after ordered to return to our former position"),
    C('OR1','R307',"leaving the intrenchments of Kane's brigade and Williams' division unoccupied")]),
  S('d', "Clock: Johnson's attack 'about dusk' after the artillery stopped just before sundown; Greene attacked a few minutes before 19:00; enemy in the works on Greene's right about 20:00.", 'documented', 'supported', [
    C('OR2','R467',"General Johnson ordered forward his division to attack"),
    C('OR2','R467',"and about dusk"),
    C('OR1','R307',"were attacked on the whole of our front by a large force a few minutes before 7 p. m."),
    C('OR1','R307',"About 8 p. m. the enemy appeared on our right flank")]),
  S('e', "The window 19:00-22:00 as a whole.", 'inferred', 'partial', [], note="The source clocks support a start between about 19:00 and 20:00; the end of the Confederate attacks 'about 10 p.m.' is Greene's (R307) and Greene 1893; no source prints 22:00 for the occupation start."),
 ],
 stays_unsupported=["Single 'empty vs defended' answer (both carried)", "Exact start of the occupation inside 19:00-20:00"],
 conflicts=["Works empty (Union: Greene, Rickards, Cobham, Kane) vs defended (Steuart, Johnson)"],
 register=['fence-1-EG-15'],
 consequence=["E-10 / S-042: keep both scenarios selectable; clock window 19:00-20:00 for the start (documented bounds), the PDF's 22:00 upper bound moves to 'enemy attacks ended about 22:00'"],
 lookups=[L('OR2','R482 Steuart clock lines',4,'dark/dusk, rested from about 11 p.m.')],
))

ROWS.append(R('R14.E-11', 'corrected', 'open_gaps',
 pdf_claim="Culp's Hill, shelling of the lower works and counterattack: about 04:00 Jul 3 to battle end about 11:00; shelling length 30 minutes to 3 hours; 5 batteries or 24 guns; Geary's men fired about 227,000 (Wikipedia) or about 250,000 (letter) rounds; works damaged, unevenly held; Greene rotated regiments out.",
 corrected="Geary's own report prints the figure 277,000 rounds (confirmed in three scans), not the PDF's 227,000 or 250,000. The Union artillery bombardment began 03:30 (Geary, 'early dawn'), 03:45 (Candy) or 04:00 (Greene) and lasted ten minutes, with a second fifteen-minute burst twenty minutes later (Geary); Muhlenberg reported with fourteen pieces and Knap's battery was also in position. The infantry fight ran to about 10:30-11:00 (Greene 10:30, Geary recalled the 147th NY at 11:00). The 147th Pa. charged and carried a stone wall at 05:00; Greene's works were retaken early in the day. A physical damage state of the works is not documented.",
 structures=['E-11', 'S-050', 'S-056', 'P-08'],
 sub=[
  S('a', "Union artillery opened about 03:30-04:00 Jul 3.", 'documented', 'conflict', [
    C('OR1','R293',"at 3.30 a. m. (early dawn) a simultaneous attack was made by artillery"),
    C('OR1','R294',"until 3.45 a. m."),
    C('OR1','R307',"At 4 a. m. our artillery, which had been posted to attack the enemy")]),
  S('b', "Duration of the bombardment: ten minutes, then about fifteen minutes after a twenty-minute pause (Geary); pieces: fourteen under Muhlenberg plus Knap's battery.", 'documented', 'supported', [
    C('OR1','R293',"Our artillery fire continued, by previous arrangement, for ten miautes"),
    C('OR1','R293',"This artillery fire lasted about fifteen minutes"),
    C('OR1','R293',"reported with fourteen pieces of artillery")],
    note="'Shelling length 30 minutes to 3 hours' (PDF) is not supported beyond 10+15 minutes of Union fire in the OR; the three-hour figure is not found."),
  S('c', "Rounds fired by Geary's command on Jul 3 and in later skirmishing: 277,000.", 'documented', 'supported', [
    C('OR1','R293',"expended in the fight on July 3, and in subsequent skirmishing, 277,000 rounds")],
    note="Second scans (warofrebellion271unit, warofrebellion012701rootrich) read the same. The PDF's 227,000 and 250,000 have no OR support (web page/letter)."),
  S('d', "Works retaken early; the 147th Pa. charged and carried a stone wall at 05:00 (existing wall); battle ended about 10:30-11:00.", 'documented', 'supported', [
    C('OR1','R307',"The enemy were early in the day driven from our intrenchments"),
    C('OR1','R293',"At 5 a. m. the One hundred and forty-seventh Pennsylvania Volunteers"),
    C('OR1','R294',"occupied a stone fence in front of the enemy")]),
  S('e', "Physical damage state of the works after the shelling.", 'open_gap', 'unsupported', [], note="No OR statement of damage to the works themselves; the Union artillery fire was aimed at the Confederates in them."),
 ],
 stays_unsupported=["Physical damage state of the works", "Shelling length beyond 10+15 minutes (3 hours)", "5 batteries / 24 guns (web or letter)"],
 conflicts=["Start 03:30 (Geary) / 03:45 (Candy) / 04:00 (Greene)", "Rounds 277,000 (OR, three scans) vs 227,000 / 250,000 (web, letter)"],
 register=['fence-1-EG-05'],
 blocked=[B('HN-Hundreds', None, "HistoryNet 'Hundreds of Rebels Lay...' (URL not recorded; host refused here): read the soldier's letter for the 250,000 rounds and 24 guns / 3-hour shelling claims"),
          B('Wiki-Culp', 'https://en.wikipedia.org/wiki/Battle_of_Culp%27s_Hill', "Wikipedia 'Battle of Culp's Hill' (URL formed from the title; host en.wikipedia.org refused here; Wikipedia is not a documented source under CLAUDE.md law 4): nothing to read for documented tier")],
 consequence=["E-11: rounds default 277,000 (OR) with 227,000 and 250,000 selectable; bombardment 03:30-04:00 start, 25 minutes of fire in two bursts as the documented default, longer values selectable; damage state of the works stays a gap and must not be drawn as documented"],
 lookups=[L('OR1 + 2 scans','277,000 rounds',3,'confirmed in Cornell, Illinois and rootrich scans')],
))
