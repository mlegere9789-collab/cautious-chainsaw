"""Row specs R13.P-04, R13.P-05 and R13.P-06 (terrain-2 close-out, 2026-11-13): walls of the Wheatfield, Houck's Ridge and the Trostle farm."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- P-04
ROWS.append(R(
    'R13.P-04', 'confirmed', 'open_gaps',
    pdf_row="Stone wall between Rose's Woods and the Wheatfield's south edge (17th Maine) | Wheatfield | Existing wall | Present at frame one; damage by fire/trampling only if sourced | documented | NPS-CWS8",
    pdf_claim="An existing stone wall between Rose's Woods and the south edge of the Wheatfield, where the 17th Maine stood; present at frame one; damage by fire or trampling only if sourced.",
    corrected=("Confirmed with additions. The wall is documented by two Union and one Confederate account: Lt. Col. Merrill (17th Maine) says that about 4 p.m. on 2 Jul his line, crossing an interval between Birney's two brigades to connect with Ward's right, 'was formed behind a stone wall, which afforded a strong position', that the enemy was within 100 yards, and that the regiment later fell back 'across a wheat-field in our rear to the edge of the woods'; De Trobriand says he moved the 17th Maine 'across a wheatfield, in order to fill a gap' and that it 'took a strong position behind a stone wall'; Kershaw (Confederate) saw 'in rear of the wheat-field, and between that and the mountain, the enemy's main line of battle, posted behind a stone wall'. So the wall lay on the far (south) side of the wheat-field from the Peach Orchard line, which agrees with the PDF. "
               "The place name Rose's Woods is not in the OR (Tilton: 'a piece of woods at the south of Mr. Rose's house'); the NPS names 'Rose Woods' and says walls bordered the Rose farm woods and the wheatfield. No source says the wall was built or altered by the regiment: pre-existing is inferred (a wall already stood when the line formed). Damage: none is sourced for this wall; Ward's skirmish line demolished 'all stone walls and fences in our front to the Emmitsburg road' at 10-11 a.m. on 2 Jul (P-05, P-10), yet this wall still stood at 4 p.m., so the demolition did not include it. The Confederate account of 3 Jul (Bane) of a 2-ft wall thrown up at dawn is another wall near the base of the mountain, not this one."),
    sub=[
        S('a', 'place', "About 4 p.m. on 2 Jul the 17th Maine (De Trobriand's brigade) formed behind a stone wall 'which afforded a strong position', crossing an interval to connect with the right of Ward's line, the enemy within 100 yards; De Trobriand moved it 'across a wheatfield, in order to fill a gap open there' and it 'took a strong position behind a stone wall'; the regiment later fell back across a wheat-field in its rear to the edge of the woods.", 'documented', 'supported', [
            C('OR1', 'R153', "About 4 p. m. >>> afforded a strong position", note="Lt. Col. Charles B. Merrill, 17th Maine"),
            C('OR1', 'R153', "We opened fire upon the enemy, then within 100 yards of us"),
            C('OR1', 'R153', "we fell back across a wheat-field in our rear to the edge of the woods"),
            C('OR1', 'R152', "I extended my right by moving the Seventeenth Maine Volunteers >>> did good service at this point", note="Col. de Trobriand, commanding the Third Brigade")]),
        S('b', 'place', "Where the wall lay: Kershaw (Confederate) places the enemy's main line 'in rear of the wheat-field, and between that and the mountain, posted behind a stone wall', and a stone wall 'on the right' of the stone house running parallel with his own line; the NPS says stone walls bordered the Rose farm woods and the wheatfield, and a line of stone walls and fences reinforced the western edge of Houck Field; Tilton places his brigade in a piece of woods south of Rose's house.", 'documented', 'supported', [
            C('OR2', 'R432', "In rear of the wheat-field, and between that and the mountain, was the enemy's main line of battle, posted behind a stone wall", note="Brig. Gen. J. B. Kershaw; p.368"),
            C('OR2', 'R432', "Behind the stone house, on the left, was a morass ; on the right a stone wall ruiming parallel with our line of battle", note="p.367; OCR 'ruiming'"),
            C('NPS', 'NPS-DCP-LRT', "the stone walls bordering the Rose farm woods and the wheatfield", note="Draft Development Concept Plan / EA, Little Round Top and Devil's Den; the sentence refers to the Confederate left at dusk on 2 Jul"),
            C('NPS', 'NPS-CLR-ROT-V2', "reinforced by a line of stone walls and fences, created cover and an obstacle for both forces at the western edge of Houck Field", note="Cultural Landscape Report, Record of Treatment vol. II, Houck's Ridge Redoubt"),
            C('OR1', 'R192', "in a piece of woods at the south of Mr. Rose's house", note="Col. W. S. Tilton, First Brigade, First Division, Fifth Corps, 4.30 p.m. 2 Jul; 'Rose's Woods' as a name is not in the OR")]),
        S('c', 'state_at_start', "The wall pre-existed the fight: the line formed behind it when it arrived and no report says it was built or altered; the NPS describes the walls of the Rose farm and its woods as farm walls; no source gives its height, length or builder.", 'inferred', 'partial', [
            C('OR1', 'R153', "our line was formed behind a stone wall, which afforded a strong position", note="a wall already there when the regiment formed"),
            C('NPS', 'NPS-CLR-ROT-V2', "The pre-battle farm stone walls were built for permanence and livestock control while the stone wall defense works were hastily stacked for an expedient purpose", note="general NPS statement for the park")],
          note="Inferred, not documented: the OR never says 'existing'; the NPS statement is general."),
        S('d', 'damage', "Damage by fire or trampling: none is sourced for this wall in any text read. The only documented clearing nearby is the 10-11 a.m. demolition of walls and fences 'in our front to the Emmitsburg road' by 35 men of the 86th New York (Ward's brigade); this wall still stood at 4 p.m.", 'open_gap', 'unsupported', [
            C('OR1', 'R146', "I was ordered by General Ward to send forward a sufiicient body of men >>> to the Emmitsburg road", note="cross-reference to P-05 and P-10")],
          note="Keep the PDF's own rule: no damage state unless a source gives one."),
    ],
    stays_unsupported=["Height, length and builder of the wall (no source)",
                       "Damage to the wall by fire or trampling (no source; none shown)",
                       "'Rose's Woods' as a 1863 name (OR: woods south of Mr. Rose's house)",
                       "That the wall is pre-existing (inferred; no statement 'existing' or 'built')"],
    conflicts=[],
    register=['terrain-2-EG-03'],
    blocked=[B('NPS-CWS8', 'https://www.npshistory.com/publications/civil_war_series/16/sec8.htm', "NPS Civil War Series, The Battle of Gettysburg, section 8 (the PDF prints no URL; this address follows the form its own note gives for section 3, https://npshistory.com/publications/civil_war_series/16/sec3.htm; www.npshistory.com answered HTTP 502 on three probes on 2026-11-13 and the bare host npshistory.com is refused by the proxy). Read it for the Wheatfield text about the 17th Maine and the stone wall and what it says of Rose's Woods.")],
    consequence=["structures P-04: keep the wall present at frame one, never a construction animation; place it on the south side of the Wheatfield, on the line the 17th Maine took about 16:00 on 2 Jul; 'documented' stands (Merrill, De Trobriand, Kershaw); add the unit arrival of the 17th Maine at about 16:00 as a march across the wheat-field",
                 "structures P-04: no height, length or damage state may be shown as sourced; keep them marked as gaps",
                 "state_schedule: the 10:00-11:00 demolition of walls and fences in front of Ward's line to the Emmitsburg road (86th New York) must not remove this wall, which stood at 16:00"],
    lookups=[L('OR Part 1 R152-R153, R192', 'stone wall|wheat-field|Rose', 8, "De Trobriand, Merrill, Tilton"),
             L('OR Part 2 R432', 'stone wall', 12, "Kershaw's report has the walls of the Peach Orchard and Wheatfield area"),
             L('NPS texts', 'Rose Woods|Wheatfield near stone wall', 9, "DCP-LRT and the Record of Treatment vol. II have the passages used; the Rose field lists in the Record of Treatment are lists of figures"),
             L('web', 'https://www.npshistory.com/publications/civil_war_series/16/sec3.htm and sec8.htm, handbooks/historical/9/hh9e.htm', 0, "HTTP 502 (error page of the site) on 2026-11-13 at 1.5-second spacing; not retried further")],
    structures=['P-04', 'E-14'],
    notes="OR-RECHECK: the three quotes of the old row were found verbatim; the old caveat ('the wall wording is a compiler reading') is withdrawn: Merrill p.522 and De Trobriand p.520 state the wall directly. The old row had no Confederate witness; Kershaw p.367-368 is new.",
    changes=["partially_supported -> confirmed with additions: the 17th Maine's stone wall is stated in two Union reports and one Confederate report",
             "new: the wall lies on the far (south) side of the wheat-field (Kershaw); Rose's Woods is an NPS name"]))

# ---------------------------------------------------------------------------------------------------------------- P-05
ROWS.append(R(
    'R13.P-05', 'corrected', 'open_gaps',
    pdf_row="Low stone fence on Houck's Ridge (124th NY counterattack) | Devil's Den area | Existing fence | Present at frame one | documented | Wiki-D2",
    pdf_claim="A low stone fence on Houck's Ridge, where the 124th New York counterattacked; existing; present at frame one; documented.",
    corrected=("The 2026-11-04 row had no support and is replaced. Stone walls and fences are documented in this ground, but not the one the PDF names: Ward's brigade (20th Indiana, 86th New York, 124th New York) was formed 'behind a stone wall' at about 7.30 a.m. on 2 Jul (Higgins); at 10 a.m. Ward had 'all stone walls and fences in our front to the Emmitsburg road' demolished by 35 men of the 86th (back about 11 a.m.); when the Confederates came Ward advanced 'with a view of obtaining a position behind a stone wall, about 160 yards in advance', and for an hour and a half both sides tried to gain possession of it (Ward); the New York state book says the brigade advanced its line to a stone wall in the charge in which Colonel Ellis and Major Cromwell fell; the NPS study places that wall at the base of the Weikert field in the Plum Run valley, from which the 124th withdrew and which Georgians and Texans then held, and says Ellis fell before the Confederates retired 'back to reform behind the rail fence'. "
               "So the counterattack wall is a valley wall about 160 yards in front of the ridge (stone, per Ward), not a fence 'on Houck's Ridge', and the NPS narrative names a rail fence for the last stage. Confederate reports confirm a stone fence at the foot of the first height held by Union skirmishers and sharpshooters (Bryan, Robertson, Manning) and fall-back lines at stone fences (Work). 'Low' is in no source; no height exists for any of these walls. The NPS says a line of stone walls and fences reinforced the western edge of Houck Field (inferred pre-existing: the line stood behind a wall at 7.30 a.m., before any fighting here)."),
    sub=[
        S('a', 'place', "Ward's brigade stood behind a stone wall on the line it took about 7.30 a.m. on 2 Jul (the 86th New York with the 20th Indiana on its right and the 124th New York on its left); the 124th held 'a rocky bluff, near the extreme left of the line'.", 'documented', 'supported', [
            C('OR1', 'R146', "my regiment left carap with 368 men for line of battle >>> the One hundred and twenty-fourth New York on my left", note="Lt. Col. B. L. Higgins, 86th New York; OCR 'carap'"),
            C('OR1', 'R146', "march my regiment to the right by the flank until I cleared the stone wall", note="about noon: the wall of the first position still stood"),
            C('OR1', 'R147', "being in position on a rocky bluff, near the extreme left of the line", note="Lt. Col. F. M. Cummins, 124th New York")]),
        S('b', 'damage', "Demolition: at 10 a.m. Ward ordered 'all stone walls and fences in our front to the Emmitsburg road' demolished; Captain Baker's 35 men of the 86th New York did it and reported back at about 11 a.m.", 'documented', 'supported', [
            C('OR1', 'R146', "I was ordered by General Ward to send forward a sufiicient body of men >>> to the Emmitsburg road"),
            C('OR1', 'R146', "At about 11 a. m. Captain Baker returned, and reported his mission accomplished")],
          note="Cross-reference: P-10 (Emmitsburg Road fences). 'In our front' is the ground west of Ward's line; the wall behind which the line stood was not demolished."),
        S('c', 'place', "The counterattack wall: Ward advanced 'with a view of obtaining a position behind a stone wall, about 160 yards in advance, and which the enemy was endeavoring to reach'; for one and a half hours both parties tried to gain it; New York at Gettysburg (1900): the brigade advanced its line to a stone wall, gained and lost repeatedly (Ellis and Cromwell killed in the charge); the NPS study: the stone wall at the base of the Weikert field in the Plum Run valley, held afterwards by Georgians and Texans; Ellis fell before the Confederates retired back to reform behind the rail fence.", 'documented', 'conflict', [
            C('OR1', 'R135', "I advanced my right and center with a view of obtaining a position behind a stone wall, about 160 yards in advance, and which the enemy was endeavoring to reach", note="Brig. Gen. J. H. Hobart Ward; p.493"),
            C('OR1', 'R135', "both parties endeavoring to gain possession of the stone wall", note="p.493"),
            C('LIB', 'NY-GB-1900', "the brigade advanced its line to a stone wall, the possession of which was gained and lost repeatedly during the fight", page='46', note="New York at Gettysburg vol. I (1900), the 124th New York entry"),
            C('NPS', 'NPS-SLAUGHTER-PEN', "the shattered remnant of the 124th continued to exchange shots >>> at the wall in that valley", note="Georg 1984; the text layer is a poor OCR (the quote keeps its errors); the sentence is about the Georgians and Texans at the wall in the valley after the 124th's withdrawal from the base of Weikert's field"),
            C('NPS', 'NPS-SLAUGHTER-PEN', "they were compelled to fall back to the stone wall at the >>> WeiJ.ert field at least twice", note="the 15th Georgia and 1st Texas at the wall at the base of the Weikert field"),
            C('NPS', 'NPS-SLAUGHTER-PEN', "fell by one of the last shots before his enemy retired back to reform behind the rail fence", note="Colonel Ellis; the NPS narrative names a rail fence for this stage")],
          note="The PDF's 'on Houck's Ridge' is not what the sources say: the wall is about 160 yd forward, in the valley; the rail fence is named by the NPS narrative for the last stage. Carry both readings."),
        S('d', 'place', "Confederate reports: Union sharpshooters and skirmishers behind a stone fence at the foot of the first height (5th Texas); the enemy's main line 'posted behind rocks and a stone fence' and numerous stone and rail fences across the field (Robertson); the enemy 'strongly posted behind a rock fence at the edge of woods' (3rd Arkansas); the 1st Texas fell back to a stone fence about 100 yards in rear.", 'documented', 'supported', [
            C('OR2', 'R456', "The enemy had a line of sharpshooters at the foot of the first height, behind a stone fence", note="Lt. Col. K. Bryan, 5th Texas; p.412"),
            C('OR2', 'R456', "A short halt was made at the stone fence >>> every man leaped the fence"),
            C('OR2', 'R452', "my whole line encountered the fire of the enemy's main line, p(jsted behind rocks and a stone fence", note="Brig. Gen. J. B. Robertson; p.404; OCR 'p(jsted'"),
            C('OR2', 'R452', "the numerous stone and rail fences that intersected the field through which we were advancing"),
            C('OR2', 'R453', "strongly posted behind a rock fence at the edge of woods", note="Col. Van H. Manning, 3rd Arkansas; p.407"),
            C('OR2', 'R454', "fall back to a stone fence about 100 yards in rear", note="Lt. Col. P. A. Work, 1st Texas; p.409")]),
        S('e', 'state_at_start', "The NPS reads a line of stone walls and fences at the western edge of Houck Field (its stone parts documented in the 1863 Bachelder and Cope maps) that gave cover and was an obstacle to both forces; the skirmishers of Sickles's line used the stone walls of the Rose, Snyder and Slyder farms as breastworks.", 'inferred', 'partial', [
            C('NPS', 'NPS-CLR-ROT-V2', "reinforced by a line of stone walls and fences, created cover and an obstacle for both forces at the western edge of Houck Field", note="Record of Treatment vol. II (2015), Houck's Ridge Redoubt; the web extract of the same report on pdf p.143 gives the maps"),
            C('NPS', 'NPS-SLAUGHTER-PEN', "usi.ng the stone wall,s of the Rose, Snyder, and Slyder Farms as breastwork", note="Georg 1984")],
          note="Pre-existing is inferred from the walls being farm walls and from Ward's line standing behind a wall at 7.30 a.m.; no statement 'existing' or 'built' for the counterattack wall."),
        S('f', 'length', "Height: no source gives any height for the Houck's Ridge walls or fences, so 'low' is unsupported. Battle-built works nearby are documented separately: Maj. Bane (4th Texas) had 'a stone wall about 2 feet high thrown up' at dawn on 3 Jul; the NPS summarises stone defence works near Little Round Top, Big Round Top and Devil's Den as typically two to three feet.", 'open_gap', 'unsupported', [
            C('OR2', 'R455', "At the dawn of day, I had a stone wall about 2 feet high thrown up", note="Maj. John P. Bane, 4th Texas; p.411; a wall built by the regiment at dawn on 3 Jul (not a pre-existing feature)"),
            C('NPS', 'NPS-CLR-ROT-V2', "Each work varied in height—typically two to three feet—and mass, but none were constructed for permanence", note="about battle-built stone defence works, not farm walls")],
          note="Neither citation is a height of the PDF's fence."),
    ],
    stays_unsupported=["That the counterattack wall or fence stood 'on Houck's Ridge' (the sources put it about 160 yd forward, in the valley)",
                       "Any height ('low'), length or type of the fence the PDF names",
                       "Which stage of the 124th's counterattack ran to a stone wall and which to a rail fence",
                       "Whether any of the walls near the line was also demolished by the 10 a.m. party"],
    conflicts=["Counterattack barrier: stone wall about 160 yd in advance (Ward) / stone wall at the base of Weikert's field (NPS, NY 1900) / rail fence (NPS narrative of Ellis's death) / PDF: low stone fence on the ridge"],
    register=['terrain-2-EG-04'],
    blocked=[B('Wiki-D2', 'https://en.wikipedia.org/wiki/Second_day_of_the_Battle_of_Gettysburg', "Wikipedia, 'Battle of Gettysburg, second day' (the PDF prints no URL; the host is refused by the egress proxy, probed 2026-11-13; not acceptable for a documented tier). Nothing in this row depends on it.")],
    consequence=["structures P-05: replace 'low stone fence on Houck's Ridge' by the documented walls: the wall behind Ward's line at 07:30 on 2 Jul, the counterattack wall about 160 yd in front of the line in the Plum Run valley (stone, Ward; rail fence in the NPS narrative of the last stage), the stone fence at the foot of the first height held by Union skirmishers; 'low' is unsupported and must not be drawn as a sourced height",
                 "state_schedule: the 10:00-11:00 demolition of walls and fences in front of Ward's line (86th New York, 35 men) is documented; walls behind which the line stood are not demolished",
                 "unit moves: 124th New York counterattack to the valley wall (Ellis and Cromwell killed)",
                 "Confederate side: a 2-ft stone wall thrown up by the 4th Texas at dawn on 3 Jul is a battle-built work (window dawn 3 Jul; builder 4th Texas); never pre-placed"],
    lookups=[L('OR Part 1 R135, R146, R147', 'stone wall|stone fence', 6, "Ward, Higgins, Cummins"),
             L('OR Part 2 R452-R458', 'stone wall|stone fence|rock fence', 11, "Robertson, Manning, Work, Bane, Bryan, Benning"),
             L('NPS texts', 'Houck|124th New York|Devil\'s Den near wall', 12, "Record of Treatment vol. II, Slaughter Pen study (poor OCR)"),
             L('library', '124th|Ellis|Cromwell near fence', 2, "New York at Gettysburg (1900) has the wall in the charge")],
    structures=['P-05', 'G-05'],
    notes="OR-RECHECK: both quotes of the old row were found verbatim (Cummins p.512, Higgins p.511). The old row said 'no OR passage names a fence'; it had not read Ward (R135) or the Confederate reports (part 2).",
    changes=["not_supported/gap -> corrected: the walls of this ground are documented (Higgins, Ward, Robertson, Bryan, Manning, Work, NPS) but they are not the PDF's 'low stone fence on Houck's Ridge'; the counterattack barrier is a stone wall about 160 yd in front (or a rail fence in the NPS narrative)",
             "new: Higgins's 07:30 wall and the 10:00-11:00 demolition; Bane's 2-ft wall of dawn 3 Jul"]))

# ---------------------------------------------------------------------------------------------------------------- P-06
ROWS.append(R(
    'R13.P-06', 'confirmed', 'open_gaps',
    pdf_row="Stone wall near the Trostle house (Bigelow's second position, about 18:00-18:30) | Trostle farm | Existing wall | Present at frame one | documented | CWE-9Mass",
    pdf_claim="An existing stone wall near the Trostle house, at Bigelow's second position, about 18:00-18:30 on 2 Jul; present at frame one.",
    corrected=("Confirmed with additions. Milton (9th Massachusetts battery) retired 300 yards by prolonge 'until we reached a position near which two stone walls met at an obtuse angle', where the battery was ordered 'to hold at all hazards' without infantry support; the OR does not name Trostle (Hunt in Battles and Leaders: 'close by the Trostle house'; Meade's Life and Letters and Toombs: 'near the Trostle house'). The NPS Cultural Landscapes Inventory (2024) lists 'Bigelow's Battery Stone Walls (pre-1863)', an L-shaped wall in front of the A. Trostle farmhouse, built by Peter Trostle, today about 4 ft wide, 2 ft high and 960 ft long, and says the Trostle farm wall and its narrow gate were the key access for artillery and infantry to the Peach Orchard line: the wall beside the gate stayed standing, a limber overturned in the gate and four guns of Bigelow's battery were trapped and captured by the 21st Mississippi. "
               "Existing is documented by the NPS (pre-1863), not by an 1863 report. Two corrections: the angle is 'obtuse' in Milton and 'L-shape' in the NPS (carried as a conflict); the PDF's 18:00-18:30 is not in the OR: Milton was ordered into battery about 4 p.m., fired 'an hour' and retired; McGilvery has the enemy in the woods on his left at a quarter to six and Bigelow retiring by prolonge, so the stand begins about 18:00 and the overrun has no clock (McGilvery's detail for the four guns left at 8 p.m. is the latest bound). Dimensions are modern readings (the wall was rebuilt in places): never an 1863 profile."),
    sub=[
        S('a', 'place', "Bigelow's 9th Massachusetts battery's second position: Milton retired 300 yards by prolonge to a position near which two stone walls met at an obtuse angle, ordered to hold it at all hazards without infantry support; Hunt (Battles and Leaders, 1887), Meade (Life and Letters) and Toombs (1888) place the stand near or close by the Trostle house.", 'documented', 'supported', [
            C('OR1', 'R320', "we retired 300 yards, until we reached a position near which two stone walls met at an obtuse angle", note="Lt. Richard S. Milton"),
            C('OR1', 'R320', "This position, without infantry support and under an enfilading artillery fire, we were ordered to hold at all hazards"),
            C('LIB', 'BL-3', "Bigelow's 9th Massachusetts made a stand close >>> prolonges fixed", page='310', note="Hunt, 'The Second Day at Gettysburg', Battles and Leaders III; OCR 'bv'"),
            C('LIB', 'MEADE-LL-v2', "Bigelow's Ninth Massachusetts Battery makes a final stand near the Trostle house", page='85'),
            C('LIB', 'NJ-TOOMBS-1888', "Bigelow's battery, which took position near the Trostle house", page='249')]),
        S('b', 'state_at_start', "The walls were pre-1863: the NPS lists Bigelow's Battery Stone Walls (pre-1863), an L-shaped wall in front of the A. Trostle farmhouse, built by Peter Trostle but associated with the A. Trostle farm during the battle, and the Trostle farm Field Stone Wall (pre-1863; dry-laid granite, rider fence on part of it, 1,200 ft overall, 1.5 to 3 ft wide and high), of which the north portion is Bigelow's Battery Wall.", 'documented', 'supported', [
            C('NPS', 'NPS-CLI-ERR', "Bigelow’s Battery Stone Walls. (pre-1863, Contributing) >>> Built by Peter Trostle but associated with A. Trostle Farm during the battle", note="Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield (2024), p.83 of the document (printed 'Page 78 of 117'); dimensions are today's reading of the surviving wall"),
            C('NPS', 'NPS-CLI-ERR', "Field Stone Wall, Abraham Trostle Farm. (pre-1863, Contributing) >>> not including Bigelow’s Battery Walls", note="the text crosses a page break (the running head sits in the middle)"),
            C('NPS', 'NPS-CLI-ERR', "The north portion of the wall is Bigelow’s Battery Wall")],
          note="Existing is documented by the NPS, not by an 1863 text. The dimensions (4 ft by 2 ft by 960 ft) are a modern survey of a wall that was restacked in places: not an 1863 profile."),
        S('c', 'damage', "The wall and its gate: the stone wall and gate gave the key access from the Trostle lane to the Peach Orchard line for artillery and infantry; the wall beside the gate stayed standing, so the narrow gate became an obstacle; a limber overturned in the gate and four guns of Bigelow's battery were trapped and captured by the 21st Mississippi (NPS); the OR says only that the enemy's flanks closed in, silenced the four pieces on Milton's right and prevented their withdrawal, and that McGilvery had the four guns hauled off at about 8 p.m.", 'documented', 'partial', [
            C('NPS', 'NPS-CLI-ERR', "the Trostle farm stone wall and gate provided the key access point from the Trostle Lane to the Peach Orchard battle line for artillery and infantry units"),
            C('NPS', 'NPS-CLI-ERR', "Because the stone wall adjacent to the gate remained standing, the narrow gate opening became an obstacle to the orderly retreat of Union forces from the Peach Orchard line"),
            C('NPS', 'NPS-CLI-ERR', "When the gate was blocked by an overturned limber, four guns of Bigelow’s Battery were trapped and captured by the 21st Mississippi Regiment"),
            C('OR1', 'R320', "Its flanks closing in on either side of us, obtained a cross-fire, which silenced the four pieces on my right, and prevented their withdrawal from loss of officers, men, and horses"),
            C('OR1', 'R318', "I instructed Lieutenant Dow to procure an infantry detail, and haul off the four guns of the Ninth Massachusetts, all of which was accomplished")],
          note="Partial: no Confederate report names the capture; the NPS names the 21st Mississippi and the limber, and does not give a clock."),
        S('d', 'hour', "Clock: Milton went into battery after 4 p.m. on 2 Jul, fired about an hour and retired; McGilvery has the enemy's infantry in the woods on his left at about a quarter to six and Bigelow retiring by prolonge, firing canister; the overrun has no clock (Milton withdrew a mile and a half and parked at 9 p.m.; McGilvery's 8 p.m. detail hauled off the four guns). The PDF's 18:00-18:30 is therefore a window inferred from these bounds, not a reported time.", 'inferred', 'partial', [
            C('OR1', 'R320', "Remained in park until 4 p. m. >>> Sickles' corps"),
            C('OR1', 'R320', "After an hour's slow firing, the batteries fell back"),
            C('OR1', 'R318', "At about a quarter to 6 o'clock the enemy's infantry gained possession of the woods immediately on the left of my line of batteries"),
            C('OR1', 'R318', "Captain Bigelow retired by prolonge, firing canister"),
            C('OR1', 'R320', "Under orders from Lieutenant-Colonel McGilvery, to whom I then reported, I withdrew a mile and a half to the rear and went into park, it being then 9 p. m")],
          note="Terrain-1 G-10 carries the same bounds (capture window 17:45-21:00)."),
        S('e', 'length', "Form of the walls: Milton says two stone walls met at an obtuse angle; the NPS says the wall forms an L-shape (an L is a right angle). Carry both.", 'documented', 'conflict', [
            C('OR1', 'R320', "two stone walls met at an obtuse angle"),
            C('NPS', 'NPS-CLI-ERR', "The wall forms an L-shape, with the east-west section running parallel to United States Avenue in front of the A. Trostle farmhouse >>> perpendicular to the road")],
          note="'Obtuse' (Milton) and 'L-shape' (NPS) may describe different walls or loose language; no source reconciles them.")
    ],
    stays_unsupported=["The Trostle name in the OR (Milton does not use it; the library books of 1887-1888 and the NPS do)",
                       "An 1863 height and thickness of the walls (only modern survey values)",
                       "The clock of the overrun (no report)",
                       "Which Confederate regiment captured the guns in a report (the 21st Mississippi is NPS and Hunt in Battles and Leaders)",
                       "The Civil War in the East '9th Mass.' page the PDF cites (CWE-9Mass; host not probed here)"],
    conflicts=["Angle of the walls: 'obtuse' (Milton) vs L-shape (NPS)",
               "Clock: PDF 18:00-18:30 vs OR bounds from about 17:45 to 20:00"],
    register=['terrain-2-EG-03'],
    blocked=[B('CWE-9Mass', None, "Civil War in the East, '9th Massachusetts Battery' (civilwarintheeast.com; the PDF prints no URL; the host was not probed from this shard). Read it for the wall near Trostle's house and the hours it gives; a website is a lead, not support.")],
    consequence=["structures P-06 / G-10: keep the wall present at frame one (pre-1863 farm wall of the Trostle farm, NPS), no construction animation; give it the OR's 'two stone walls meeting at an angle' with the NPS L-shape as a selectable alternative, the narrow gate (documented) and the wall beside the gate standing",
                 "the PDF's 18:00-18:30 stands as an inferred window; the OR gives about 17:45 for the retirement and no clock for the overrun",
                 "no 1863 dimensions: the NPS values (4 ft by 2 ft by 960 ft; 1.5 to 3 ft) are modern and may not be used as an 1863 profile"],
    lookups=[L('OR Part 1 R320, R318', 'stone wall|Bigelow|prolonge', 8, "Milton, McGilvery"),
             L('OR Part 1', 'Trostle', 0, "0 hits (as in terrain-1 G-10 and fence-2 S-039); Bigelow wrote no report in the volume"),
             L('library', 'Trostle', 6, "Hunt in Battles and Leaders III p.310, Meade's Life and Letters II p.85, Toombs (1888) p.249 (the same three as terrain-1 G-10.d)"),
             L('NPS texts', 'Trostle', 14, "NPS-CLI-ERR p.82-83 and p.79 have the wall, its dimensions and the gate")],
    structures=['P-06', 'G-10', 'S-039'],
    notes="OR-RECHECK: the quote of the old row was found verbatim (R320 p.886). The old row said 'Trostle has 0 hits in OR27': true; the NPS inventory and three books supply the identification that the old row called an inference, so the verdict rises to confirmed with additions.",
    changes=["partially_supported -> confirmed with additions: the identification with the Trostle walls is documented by the NPS inventory (pre-1863) and three books",
             "new: L-shape vs obtuse angle; the gate; 18:00-18:30 is an inferred window"]))
