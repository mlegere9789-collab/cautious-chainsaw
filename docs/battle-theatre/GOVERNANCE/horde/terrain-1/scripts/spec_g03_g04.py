"""Row specs R13.G-03 and R13.G-04 (terrain-1 close-out, 2026-11-13)."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- G-03
ROWS.append(R(
    'R13.G-03', 'corrected', 'open_gaps',
    pdf_row="Wiedrich (1st NY I), Ricketts (Pa. F&G); Stewart (Battery B, 4th US) in a lunette; Battery L, 1st NY | East Cemetery Hill, lunettes near gatehouse | Lunettes by about 16:00 Jul 2; fighting about 19:30-21:00 | Prepared (earth lunettes) | Slope limited gun depression, so canister; gunners fought hand to hand when Hays's Louisianans reached the guns | documented (existence); builder unknown | Wiki-ECH; GD-Housch",
    pdf_claim="Wiedrich (I/1st NY), Ricketts (F&G/1st Pa.), Stewart (B/4th US, in a lunette) and Reynolds (L/1st NY) on East Cemetery Hill in earth lunettes near the gatehouse by about 16:00 on 2 Jul; fighting about 19:30-21:00; prepared; the slope limited gun depression so they used canister; the gunners fought hand to hand when Hays's Louisianans reached the guns; builder unknown.",
    corrected="The first-draft close-out of 2026-11-04 called this a conflict with the seed; the library shows it is mostly confirmed and needs only corrections of builder, date and form. Per-gun earthworks were begun at dusk on 1 Jul by the batteries' own crews on Wainwright's order, against sharpshooters (Wainwright, Hunt, Whittier, Breck); the state books of 1900-1914 call them lunettes or redans and say Cooper's men finished four lunettes on the morning of 2 Jul, so they stood ready for the 4 p.m. artillery duel; the OR itself says 'a small earthwork' in front of each gun and never 'lunette'. Guns at the evening of 1 Jul: Stewart four light 12-pdr across the road (two of his guns disabled), Wiedrich four 3-inch (Osborn says six), Cooper four 3-inch, Reynolds five 3-inch = thirteen 3-inch (Hunt, Wainwright), Stevens' six 12-pdr on a knoll 50 yd in front; Ricketts' six 3-inch relieved Cooper on 2 Jul. The attack came a little before 8 p.m. (Hays), about 8 p.m. (Ricketts, Wiedrich, Wainwright 'dusk'), 'between 7 and 8' (Osborn). 'Slope limited depression' is documented only in Bachelder (1889) and the New York book of 1900; it is not in the OR. Hand-to-hand fighting with handspikes, rammers, pistols, fence rails and stones is documented. Hays found a stone wall at the foot of a fortified hill, an abatis and rifle-pits in front of the guns. No dimension is given anywhere; the lunettes preserved today were rebuilt in 1878 and may not be used as an 1863 profile.",
    sub=[
        S('a', 'guns', "Guns at the evening of 1 Jul on East Cemetery Hill north of the pike: Stewart (B/4th US) four light 12-pdr across the road, Wiedrich (I/1st NY) four 3-inch, Cooper (B/1st Pa.) four 3-inch, Reynolds (L/1st NY) five 3-inch = thirteen 3-inch; Stevens' 5th Maine six 12-pdr on a knoll about 50 yd in front. Osborn counts Wiedrich at six 3-inch.", 'documented', 'conflict', [
            C('OR1', 'R028', "Stewart's battery (B, Fourth United States, four light 12-pounders) across the road, so as to command the approaches from town"),
            C('OR1', 'R028', "in all thirteen 3-inch guns"),
            C('OR1', 'R071', "Four guns of Battery B, Fourth U. S. Artillery, across the road so as to command the approaches from the town (two guns of this battery had been disabled by loss of pointing rings)"),
            C('OR1', 'R264', "Battery I, First New York Artillery, commanded by Capt. M. AViedrich, six 3-inch")],
          note="Wiedrich four (Hunt, Wainwright) vs six (Osborn, at the start of the day): the difference is not explained in the OR."),
        S('b', 'place', "Position: Wiedrich on the hill immediately in front of the cemetery entrance, north of the Baltimore turnpike; Ricketts to the right of the turnpike on Cemetery Hill.", 'documented', 'supported', [
            C('OR1', 'R264', "Captain Wiedrich was assigned, on his arrival upon the field, to a position on the hill immediately in front of the cemetery entrance and overlooking the town"),
            C('OR1', 'R328', "who placed me in position on Cemetery Hill, to the right of the turnpike leading into Gettysburg")]),
        S('c', 'construction_window', "Per-gun earthworks were thrown up at dusk on 1 Jul to protect the men from sharpshooters (Wainwright, Hunt); temporary earthworks covered the pieces during the night (5th Maine); Breck intrenched his position by Wainwright's order.", 'documented', 'supported', [
            C('OR1', 'R071', "At dusk, no attack having been made, the batteries on the hill outside the cemetery gate were posted as follows"),
            C('OR1', 'R071', "light earthworks thrown up in front of each gun to protect the men from the fire of the enemy's sharpshooters"),
            C('OR1', 'R028', "Each of the guns in these batteries had a small earthwork thrown up in its front, to afford a partial shelter from the fire of the enemy's sharpshooters"),
            C('OR1', 'R073', "During the night, temporary earthworks were thrown up covering the pieces"),
            C('OR1', 'R074', "which position, by order of Colonel Wainwright, I caused ta be intrenched, and held during the two following days of the battle", note="OCR 'ta' for 'to'")]),
        S('d', 'construction_window', "Finished the morning of 2 Jul by the battery's own men (Cooper's four lunettes), in use for the 4 p.m. duel; the books of 1900-1914 call the works lunettes or redans for each gun.", 'documented', 'supported', [
            C('LIB', 'PA-GB-1914-v2', "On the morning of July 2, the men of this battery finished the construc tion of these four lunettes", note="OCR 'construc tion' split by a line break"),
            C('LIB', 'PA-GB-1914-v2', "At 4 p. m. the terrible crash of the enemy's artillery came"),
            C('LIB', 'NY-GB-1902-v3', "by building redans or lunettes for each gun"),
            C('LIB', 'NY-GB-1900', "completing the lunettes which had been thrown up in front of each gun")],
          note="So the PDF's 'lunettes by about 16:00 on 2 Jul' is supported as 'in place for the 4 p.m. duel'; 'built at dusk 1 Jul, finished the morning of 2 Jul' is the documented window."),
        S('e', 'other', "Builder: the batteries' own crews on the artillery chief's order (Breck; Cooper's men); the PDF's 'builder unknown' is superseded.", 'documented', 'supported', [
            C('OR1', 'R074', "which position, by order of Colonel Wainwright, I caused ta be intrenched, and held during the two following days of the battle", note="OCR 'ta' for 'to'"),
            C('LIB', 'PA-GB-1914-v2', "On the morning of July 2, the men of this battery finished the construc tion of these four lunettes")]),
        S('f', 'state_at_start', "Form and dimensions: a small earthwork per gun (OR); lunette/redan (state books); the NPS describes a lunette as a semi-circular earthen berm built by artillery crews, and records 'East Cemetery Hill Lunettes (1878)' as a reconstruction. No 1863 height, thickness or plan is given by any source read.", 'open_gap', 'partial', [
            C('NPS', 'NPS-CLR-ROT-V1', "A specifc type of earthwork, a lunette, was a semi-circular earthen berm constructed by artillery crews to protect their guns"),
            C('NPS', 'NPS-CLR-ROT-V1', "East Cemetery Hill Lunettes (1878)")],
          note="Do not derive an 1863 profile from the 1878 reconstruction (Law cl.3; PDF B.7.6 principle)."),
        S('g', 'hour', "Assault: a little before 8 p.m. (Hays), about 8 p.m. (Ricketts, Wiedrich), 'between 7 and 8' (Osborn), about sunset/dusk (Hunt, Wainwright). The PDF's 19:30-21:00 window starts later than the earliest OR value.", 'documented', 'conflict', [
            C('OR2', 'R472', "A little before 8 p. m. I was ordered to advance with my own and Hoke's brigade on my left"),
            C('OR1', 'R328', "At about 8 p. m. a heavy column of the enemy charged on my battery, and succeeded in capturing and spiking my left piece"),
            C('OR1', 'R265', "About 8 p. m. the enemy charged on the battery with a brigade of infantry"),
            C('OR1', 'R264', "Between 7 and 8 o'clock in the evening, a rebel brigade charged from the town upon the hill and upon Captain Wiedrich's battery")],
          note="Delegated default C-020: window 19:30-20:00 around about 20:00."),
        S('h', 'damage', "Hand-to-hand fighting: the cannoneers fought with handspikes, rammers, pistols, fence rails and stones; Ricketts' left piece was spiked; Wiedrich's guns were entered by the infantry; all guns retaken.", 'documented', 'supported', [
            C('OR1', 'R328', "The cannoneers fought them hand to hand with handspikes, rammers, and pistols"),
            C('OR1', 'R028', "fought with handspikes, rammers, and even stones"),
            C('OR1', 'R071', "The cannoneers of both these batteries stood well to their guns, driving the enemy off with fence-rails and stones and capturing a few prisoners"),
            C('OR1', 'R265', "got into the intrenchments of my battery")]),
        S('i', 'other', "Slope limited gun depression so the guns used canister: documented in Bachelder (1889) and the New York book of 1900 as the guns on East Cemetery Hill not being depressible enough; not in the OR.", 'inferred', 'partial', [
            C('LIB', 'BACH-WHATTOSEE-1889', "But the guns on East Cemetery Hill could not be sufficiently depressed to be very effective"),
            C('LIB', 'NY-GB-1900', "or inability to depress the guns sufficiently, the assaulting column suffered but little from this fire")],
          note="Inferred because both statements are secondary and do not name the batteries; the OR reports of Wiedrich and Ricketts only say canister was used."),
        S('j', 'place', "Works in front of the guns: Hays met a stone wall at the foot of a fortified hill, an abatis of fallen timber and a third line in rifle-pits; builders and dates of the wall, abatis and pits are not stated.", 'documented', 'supported', [
            C('OR2', 'R472', "we continued to move forward until we reached the second line, behind a stone wall at the foot of a fortified hill"),
            C('OR2', 'R472', "we came upon an abatis of fallen timber and the third line, disposed in rifle-pits")],
          note="Construction window of the abatis and the rifle-pits stays an open gap (E-12 covers the gun works only)."),
    ],
    stays_unsupported=["1863 dimensions of the gun works (no height, thickness or plan anywhere)",
                       "Builder and date of the abatis and rifle-pits met by Hays",
                       "Why Wiedrich counts six guns (Osborn) and four (Hunt, Wainwright)"],
    conflicts=["Assault clock: 19:00-20:00 (OR) vs 19:30-21:00 (PDF)",
               "Wiedrich's guns: 4 (Hunt, Wainwright) vs 6 (Osborn)",
               "Name of the works: 'small earthwork' (OR) vs 'lunettes/redans' (state books)"],
    register=['terrain-1-EG-03'],
    blocked=[B('Wiki-ECH / GD-Housch', None, "Wikipedia 'Battle of East Cemetery Hill' and Gettysburg Daily 'Housch, East Cemetery Hill': the PDF prints no URL for these keys; gettysburgdaily.com was refused here (fence-2 probe, 403); Wikipedia is not an acceptable source for a documented tier. Nothing in this row depends on them now; read the Gettysburg Daily page only to see whether it gives the PDF's 'builder unknown' and '19:30' wording.")],
    consequence=["structures G-03: keep emplacement_class prepared and built-on-screen, but set the build to per-gun small earthworks (lunette/redan form marked 'state books') begun at dusk 1 Jul by the battery crews, finished the morning of 2 Jul; in place by 16:00 on 2 Jul; delegated decision DD-04 stands and its 'not lunettes' wording should read 'lunettes are the state books' name, OR says small earthwork'",
                 "works_stages G-03: stage model per gun: layout and digging at dusk 1 Jul (builder = battery crews), completion morning 2 Jul (Cooper's four lunettes); dimensions marked plausible-procedural gap; never use the 1878 reconstruction",
                 "structures G-03: infantry works in front (stone wall, abatis, rifle-pits: Hays) as pre-existing at the evening of 2 Jul with their own construction gap",
                 "kit: Wiedrich I/1st NY four 3-inch on 1-2 Jul evening (six at the start of 1 Jul per Osborn: selector); Stewart four serviceable 12-pdr (two disabled); Cooper four; Reynolds five (Hunt, Wainwright); Ricketts six from about 19:00 Jul 2 (Cooper R075 relieved at about 7 p.m.)"],
    lookups=[L('OR Parts 1-2', 'lunette', 2, "no Cemetery Hill hit; the two hits are Winchester"),
             L('OR Parts 1-2', 'depress', 12, "no Cemetery Hill gun-depression statement"),
             L('library', 'depress near Cemetery Hill', 4, "Bachelder 1889 and New York at Gettysburg 1900 say the guns could not be depressed enough"),
             L('library', 'lunette near East Cemetery Hill', 4, "Pennsylvania at Gettysburg 1914 (Cooper), New York at Gettysburg 1900 and 1902 use the words lunette / redan")],
    structures=['G-03', 'E-12', 'P-12'],
    changes=["G-03 verdict conflict_with_seed -> corrected: the 2026-11-04 call that the PDF's 'lunettes by 16:00 Jul 2' is contradicted is withdrawn: the state books say lunettes finished the morning of 2 Jul",
             "builder 'unknown' replaced by the battery crews on Wainwright's order",
             "'slope limited depression' moved from unsupported to inferred (Bachelder 1889, New York 1900)"],
))

# ---------------------------------------------------------------------------------------------------------------- G-04
ROWS.append(R(
    'R13.G-04', 'corrected', 'open_gaps',
    pdf_row="Latimer's battalion, about 20 guns in five batteries (Chesapeake, Alleghany, 1st Md, Lee, Rockbridge loaned from Dance) | Benner's Hill | About 16:00 Jul 2 | No works described | Outgunned by 37 Union guns from Culp's Hill to East Cemetery Hill; by dusk only four guns remained | documented | ECW-Benner; Wiki-ECH",
    pdf_claim="Latimer's battalion of about 20 guns in five batteries (Chesapeake, Alleghany, 1st Maryland, Lee, Rockbridge loaned from Dance) opened about 16:00 on 2 Jul from Benner's Hill; no works described; outgunned by 37 Union guns from Culp's Hill to East Cemetery Hill; by dusk only four guns remained.",
    corrected="Johnson's report names Andrews' battalion (Major J. W. Latimer commanding) as Raine's, Dement's, Brown's and Carpenter's batteries; Graham's battery (1st Virginia Artillery, Rockbridge) 'aided'. Andrews' own report counts fourteen guns of the battalion on the hill plus two 20-pounder Parrotts placed on an eminence in rear 'with Captain Graham's battery'; the New York book of 1900 counts twenty guns in all (14 + six 20-pounder Parrotts of Graham's and Raine's batteries), which is the PDF's 'about 20'. The hill is the 'only eligible' one, a little left of Cemetery Hill and in front of the wooded mountain (Culp's Hill), exposed to concentrated fire from both and an enfilade from a battery near the Baltimore road; Andrews found great difficulty sheltering horses and caissons; no works are named. Opening: 4 p.m. (Johnson, Brown, Pendleton, Andrews), about 5 p.m. (Ewell); the Union side puts the Confederate battery in action about 3:30 (Hunt) or about 4 p.m. (Wainwright) and counts ten guns. The fight lasted about two hours (Johnson, Cooper 2.5 h, Wainwright 1.5 h, Ewell one hour). Latimer withdrew all but four guns (Johnson, Andrews) = one battery (Brown, Ewell) and was mortally wounded with them. The name 'Benner's Hill' is not in the OR; Bachelder (1873, 1889), Maine at Gettysburg and New York at Gettysburg use it. The 37-gun Union figure is in no source read. Union witnesses: four limbers or caissons exploded; two guns drawn off by hand; 28 dead horses on the knoll.",
    sub=[
        S('a', 'unit', "Battalion: Andrews' battalion (Major J. W. Latimer commanding) = Raine's, Dement's, Brown's and Carpenter's batteries; Graham's (Rockbridge, 1st Virginia Artillery) aided; the PDF's five batteries Chesapeake (Brown), Alleghany (Carpenter), 1st Md (Dement), Lee (Raine), Rockbridge (Graham) are all named.", 'documented', 'supported', [
            C('OR2', 'R481', "Andrews' battalion of artillery. Major [J. W.J Latimer commanding, consisting of Raine's, Dement's, Brown's, and Carpenter's batteries"),
            C('OR2', 'R468', "aided by [A.] Graham's battery (First Virginia Artillery)"),
            C('OR2', 'R467', "Andrews' battalion and [Archibald] Graham's battery, the whole under Major [J. W.] Latmier", note="OCR 'Latmier' for Latimer")],
          note="'Rockbridge loaned from Dance' is not in the OR: Brown calls Graham's battery part of the First Virginia Artillery (Dance's command); the battery name 'Rockbridge' does not occur in the passages read."),
        S('b', 'count', "Guns: 14 of Andrews' battalion on the hill plus two 20-pounder Parrotts in rear = 16 (Andrews); twenty in all with Graham's battery (New York 1900: 14 + six 20-pdr Parrotts of Graham's and Raine's); the Union estimate is ten guns (Hunt, Wainwright).", 'documented', 'conflict', [
            C('OR2', 'R505', "Fourteen guns of the battalion were then planted on this hill above mentioned."),
            C('OR2', 'R505', "The two remaining guns (20-pounder Parrotts)"),
            C('LIB', 'NY-GB-1900', "Latimer had posted fourteen guns on Benner’s Hill, together with six twenty-pounder Parrotts, of Graham’s and Raines’ batteries, twenty guns in all."),
            C('OR1', 'R028', "At about 3.30 p. m. the enemy established a battery of ten. guns (four 20-pounders and six 10-pounder Parrotts) in a wheat-field", note="Union estimate; OCR 'ten. guns'"),
            C('OR1', 'R071', "planted a battery of four 20-pounders and six 10-pounder Parrotts in a wheat-field on our immediate front, at about 1,300 yards")],
          note="No source read gives a per-battery gun count; Andrews gives the order Brown right, Carpenter centre, Dement and Raine (one section) left."),
        S('c', 'place', "Place: the only eligible hill in front, a little to the left of Cemetery Hill and in front of the wooded mountain, exposed to concentrated fire and to an enfilade from a battery near the Baltimore road; little shelter for horses and caissons. The name 'Benner's Hill' is in Bachelder, Maine and New York books, not in the OR.", 'documented', 'supported', [
            C('OR2', 'R481', "and a little to the left of the Cemetery Hill; consequently exposed to the concentrated fire from both, and also to an enfilade fire from a battery near the Baltimore road"),
            C('OR2', 'R505', "The ground offered very few advantages, and the major found great difficulty in sheltering his horses and caissons."),
            C('LIB', 'BACH-WHATTOSEE-1889', "Benner's Hill was occupied by Confederate artillery.")]),
        S('d', 'hour', "Opening: 4 p.m. (Johnson, Brown, Pendleton); about 5 p.m. (Ewell); the Union side puts it at about 3:30 (Hunt) or about 4 (Wainwright).", 'documented', 'conflict', [
            C('OR2', 'R481', "desultory firing was maintained with their skirmishers until 4 p. m., at which hour I ordered Major Latimer to open fire with all of his pieces from the only eligible hill within range"),
            C('OR2', 'R428', "About 4 p. m. the guns of the Second Corps, in position on that front, generally opened with a well-directed and effective fire"),
            C('OR2', 'R467', "about 5 p. m."),
            C('OR1', 'R028', "At about 3.30 p. m. the enemy established a battery of ten. guns (four 20-pounders and six 10-pounder Parrotts) in a wheat-field", note="Union clock")]),
        S('e', 'hour', "Duration: about two hours (Johnson); Ewell one hour; the Union batteries needed an hour or more (Hunt), an hour and a half (Wainwright).", 'documented', 'supported', [
            C('OR2', 'R481', "The unequal contest was maintained for two hours with considerable damage to the enemy")]),
        S('f', 'damage', "Outcome: Latimer withdrew most guns and left four (one battery) on the hill, where he was mortally wounded; Union side: four limbers or caissons blown up, two guns drawn off by hand, 28 dead horses on the knoll.", 'documented', 'supported', [
            C('OR2', 'R481', "withdraw all of his pieces excepting four, which were left in position to cover the advance of my infantry"),
            C('OR2', 'R505', "Most of the guns were then withdrawn, leaving four guns on the hill to repel any advance of the enemy's infantry."),
            C('OR2', 'R468', "after a most gallant fight, Major Latimer was forced to withdraw three of his batteries, leaving one to repel any advance of their infantry"),
            C('OR1', 'R028', "compelled them to withdraw, drawing off two of their pieces by hand"),
            C('OR1', 'R071', "Twenty-eight dead horses were found on the knoll occupied by this battery"),
            C('LIB', 'ME-GB-1898', "in less than half an hour four of their limbers or caissons exploded and their batteries were dlenced", note="OCR 'dlenced'")]),
        S('g', 'state_at_start', "Works: none named; Andrews says the ground offered few advantages. Recorded as no works described (open ground), not as a documented absence.", 'inferred', 'partial', [
            C('OR2', 'R505', "All the guns excepting two long-range guns had to be crowded on this small hill, which was not in our favor.")]),
        S('h', 'count', "Union guns opposing: the PDF's 37 from Culp's Hill to East Cemetery Hill. Brown says only that the number concentrated at that point was so great; Hunt counts the Union battery that answered at the enemy's ten guns. No source read gives 37.", 'open_gap', 'unsupported', []),
    ],
    stays_unsupported=["The PDF's 37 Union guns (no source)",
                       "Per-battery gun counts of Raine, Dement, Brown, Carpenter and Graham (no source read)",
                       "The statement that Graham's battery was 'loaned from Dance' (Brown only lists it with the First Virginia Artillery)"],
    conflicts=["Guns: 16 (Andrews) vs 20 (New York 1900, PDF) vs ten (Union estimate)",
               "Opening clock: 15:30 (Hunt) / 16:00 (Johnson, Brown, Pendleton, Andrews) / 17:00 (Ewell)",
               "Guns left at the end: four (Johnson, Andrews) = one battery (Brown, Ewell)"],
    register=['terrain-1-EG-04'],
    blocked=[B('ECW-Benner / Wiki-ECH', None, "Emerging Civil War 'Benner's Hill' and Wikipedia 'Battle of East Cemetery Hill': the PDF prints no URL for these keys; emergingcivilwar.com is not on the reachable list. Read the ECW page only for the PDF's 37-gun figure and the per-battery counts.")],
    consequence=["structures G-04: no works (open ground) stays; gun count selector 16 (Andrews) / 20 (New York 1900, PDF) with the five batteries named and ten as the Union estimate; place named 'Benner's Hill' with its source (Bachelder, Maine and New York books), not an OR name",
                 "structures G-04: opening window 15:30-17:00 on 2 Jul with the clocks selectable; four guns (one battery) stay on the hill after the withdrawal; Latimer mortally wounded there",
                 "kit CS.ART.Chesapeake / 1st_Md / Alleghany / Lee / Rockbridge: guns per battery stay 'gap'; the 37 Union guns of the PDF row stay unsupported and must be marked; Union battery on the knoll opposite (G-04 counter) loses four limbers/caissons"],
    lookups=[L('OR Parts 1-3', 'thirty-seven guns|37 guns', 0, "no hit"),
             L('library', 'Benner', 20, "place name in Bachelder 1873/1889, Maine 1898, New York 1900; Latimer's battalion '14 + 6 = 20 guns' in New York 1900")],
    structures=['G-04'],
    changes=["G-04 gap -> corrected with documented 14 + 2 guns (Andrews) and twenty (New York 1900); 'Benner's Hill' now found in the library; four-guns-left confirmed by Johnson and Andrews; 37 Union guns stay unsupported"],
))
