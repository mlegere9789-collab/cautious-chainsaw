"""Row specs R13.G-09 to R13.G-12 (terrain-1 close-out, 2026-11-13)."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- G-09
ROWS.append(R(
    'R13.G-09', 'corrected', 'open_gaps',
    pdf_row="Cabell's battalion | Edge of woods by the Emmitsburg Road | First to open Jul 2 | No works described | July 3 guns several hundred yd in front of the infantry near a small brick house, firing about 13:00 for over two hours | documented | Cabell-OR",
    pdf_claim="Cabell's battalion stood at the edge of the woods by the Emmitsburg Road and was first to open on 2 Jul; no works described; on 3 Jul its guns stood several hundred yd in front of the infantry near a small brick house and fired from about 13:00 for over two hours.",
    corrected="Cabell's report: on 2 Jul the battalion went into position on the edge of the wood, its right near the road from Gettysburg to Emmitsburg, 600 or 700 yd from a large number of batteries in a peach orchard, and 'being first to open fire' took a concentrated fire; it lost heavily (Capt. Fraser mortally wounded). The battery reports add a pre-existing feature the PDF omits: Fraser's battery stood 'behind a loose rock fence' and Carlton's Parrott section 'behind the stone fence between Manly's and McCarthy's batteries'. Four batteries with four guns each give 16 guns (Manly four, McCarthy two 3-inch rifles + two Napoleons, Fraser two Parrotts + two 3-inch, Carlton two Parrotts + two 12-pdr howitzers); Pendleton records 'lost 1 3-inch rifle' for 15 after the battle; Alexander's 1907 memoir counts 18. On 3 Jul six guns (Payne's two of Manly's, Anderson's two of McCarthy's, Furlong's two Parrotts of Fraser's) stood several hundred yd in front of the infantry near a small brick house, fronting the road, with Carlton's battery and two of McCarthy's Napoleons to the left in front of Pickett; the fire opened about 1 p.m. and the cannonade was almost continuous for over two hours; about 4 p.m. the guns advanced to a line about 700 yd from Cemetery Hill and held to dark. Which house is the 'small brick house' is not stated by any source read (the NPS 'small brick house' hits are the Dustman/Riggs house on the First Day field).",
    sub=[
        S('a', 'unit', "Battalion and batteries: Col. H. C. Cabell's battalion: Manly's (Co. A, 1st NC Artillery), McCarthy's (1st Richmond Howitzers), Fraser's (Pulaski, Georgia) and Carlton's (Troup, Georgia) batteries.", 'documented', 'supported', [
            C('OR2', 'R435', "Captain [H. H.J Carlton's battery and a section of Captain McCarthy's battery (two Napoleons) were ordered to the left of the line, in front of Pickett's division"),
            C('OR2', 'R438', "I herewith have the honor to report the part Capt. J. C. Fraser's battery took in the engagements near Gettysburg, Pa., on the 2d and 3d instant")]),
        S('b', 'count', "Guns: Manly four; McCarthy a rifle section (two 3-inch) and a Napoleon section (two); Fraser four (two 10-pdr Parrotts and two 3-inch); Carlton four (a Parrott section and a 12-pdr howitzer section) = 16; Pendleton: 1 3-inch rifle lost; Alexander (1907): 18.", 'documented', 'conflict', [
            C('OR2', 'R437', "I crossed the Potomac with four guns"),
            C('OR2', 'R438', "the battery opened fire from four guns (two lO-pounder Parrotts and two 3-inch rifled guns)"),
            C('OR2', 'R440', "with the four pieces of my command"),
            C('OR2', 'R435', "Captain [H. H.J Carlton's battery and a section of Captain McCarthy's battery (two Napoleons) were ordered to the left of the line, in front of Pickett's division"),
            C('OR2', 'R428', "Lost 1 3-inch rifle, turned into ordnance train, and 1 caisson, disabled at Gettysburg"),
            C('LIB', 'ALEXANDER-1907', "was engaged with 18 guns; and in front of Barksdale were 18 of my own battalion", note="printed page 395 (running head in the text)")],
          note="16 is the sum of four per-battery statements (the OR gives no battalion total); the McCarthy rifle/Napoleon sections are stated in Cabell's report (two 3-inch rifles + two Napoleons)."),
        S('c', 'place', "2 Jul: on the edge of the wood, the right resting near the road from Gettysburg to Emmitsburg; the enemy's batteries 600 or 700 yd off in a peach orchard and a rocky mountain on the right.", 'documented', 'supported', [
            C('OR2', 'R435', "Near the crest of the hill, I turned to the right, and placed the battalion in position on the edge of the wood, the right resting near the road leading from Gettysburg to Emmitsburg"),
            C('OR2', 'R435', "directly in front, about 600 or 700 yards distant, were a large number of batteries, occupying a peach orchard")]),
        S('d', 'hour', "First to open on 2 Jul: Cabell's own statement; no second witness for 'first'.", 'documented', 'supported', [
            C('OR2', 'R435', "The battalion, being first to open fire, received for a short time a concentrated fire from the enemy's batteries")],
          note="McCarthy's rifle section opened at about 4 p.m. (R436); Manly engaged at 2.30 p.m. (R437): the battalion's batteries opened at different clocks."),
        S('e', 'state_at_start', "Works on 2 Jul: none dug; Fraser's battery stood behind a loose rock fence and Carlton's Parrott section behind the stone fence between Manly's and McCarthy's batteries (a pre-existing fence).", 'documented', 'supported', [
            C('OR2', 'R438', "the battery was placed in position on the right of the battalion, behind a loose rock fence"),
            C('OR2', 'R440', "the section of Parrott guns occupying a position behind the stone fence between Captains")],
          note="The PDF's 'no works described' stays true for earth; the fences are a pre-existing feature to show."),
        S('f', 'place', "3 Jul: two 3-inch rifles (Payne, Manly's), two 3-inch rifles of McCarthy's (Anderson) and two Parrotts of Fraser's (Furlong) several hundred yd in front of the infantry, near a small brick house, fronting the Gettysburg-Emmitsburg road; Carlton's battery and two McCarthy Napoleons to the left in front of Pickett's division, considerably left of the brick house.", 'documented', 'supported', [
            C('OR2', 'R435', "These guns were placed several hundred yards in front of the infantry, near a small brick house, and fronted the road leading from Gettysburg to Emmitsburg"),
            C('OR2', 'R435', "Captain [H. H.J Carlton's battery and a section of Captain McCarthy's battery (two Napoleons) were ordered to the left of the line, in front of Pickett's division")]),
        S('g', 'hour', "3 Jul: the fire opened about 1 p.m. and the cannonading was almost continuous for over two hours; about 4 p.m. the guns advanced to a line about 700 yd from Cemetery Hill and held to dark.", 'documented', 'supported', [
            C('OR2', 'R435', "The fire of the artillery was opened about 1 p. m. For over two hours the cannonading on both sides was almost continuous and incessant"),
            C('OR2', 'R435', "The change in the position of the guns was made about 4 p. m. , with orders to hold it till night"),
            C('OR2', 'R435', "The position occupied by these guns was about 700 yards from the Cemetery Hill")]),
        S('h', 'place', "Identity of 'the small brick house': not named by Cabell or any battery officer; the PDF row leaves it unplaced.", 'open_gap', 'unsupported', [],
          note="NPS 'small brick house' hits (Dustman/Riggs house, Chambersburg Road, First Day field) do not describe the Emmitsburg Road."),
    ],
    stays_unsupported=["Identity and 1863 location of 'the small brick house' (gap for the basemap)",
                       "A battalion gun total in the OR (16 is a sum of battery statements)",
                       "Why the memoir counts 18"],
    conflicts=["Cabell's guns: 16 (sum of battery reports; 15 after the battle) vs 18 (Alexander 1907)"],
    register=['terrain-1-EG-09'],
    blocked=[],
    consequence=["structures G-09: Jul 2 position at the edge of the wood with a pre-existing loose rock / stone fence in front of Fraser's and Carlton's guns; sixteen guns in four batteries (selector 16/18); first-to-open stays Cabell's claim",
                 "structures G-09: Jul 3 forward group of six guns near 'a small brick house' (house unplaced: marker on the map), Carlton and two Napoleons to the left in front of Pickett; fire from about 13:00, advance about 16:00 to a line about 700 yd from Cemetery Hill",
                 "kit CS.ART.* Cabell battalion (Manly, McCarthy, Carlton, Fraser): guns per battery now documented (four each)"],
    lookups=[L('OR Part 2', 'Cabell battery reports R436-R440', 5, "per-battery gun counts and the stone/rock fences"),
             L('NPS texts', 'small brick house', 3, "only the Dustman/Riggs house on the First Day field")],
    structures=['G-09'],
    changes=["G-09 supported -> corrected: per-battery gun counts (16 total) and the pre-existing fences found in the battery reports; the 'no works' wording is true for earth only; the house stays an open gap"],
))

# ---------------------------------------------------------------------------------------------------------------- G-10
ROWS.append(R(
    'R13.G-10', 'corrected', 'open_gaps',
    pdf_row="Bigelow's 9th Mass. (six Napoleons) | Wheatfield Road, then by prolonge about 400 yd to the stone wall near Trostle's house | 16:30-18:00; second position 18:00-18:30; overrun 21st Mississippi, about 18:30 | Improvised; first position open, second behind existing wall (P-06) | Hand-to-hand fighting; two serviceable guns under Milton in Ziegler's Grove on Jul 3. Losses conflict (65 horses lost vs 80 of 88) | documented | CWE-9Mass; CWN-2025",
    pdf_claim="Bigelow's 9th Massachusetts (six Napoleons) stood on the Wheatfield Road, retired by prolonge about 400 yd to the stone wall near Trostle's house (16:30-18:00 first position, second 18:00-18:30), was overrun by the 21st Mississippi about 18:30; improvised, the second position behind an existing wall (P-06); hand-to-hand fighting; two serviceable guns under Milton in Ziegler's Grove on 3 Jul; horse losses 65 vs 80 of 88.",
    corrected="The battery was marched up from the Reserve park about 4 p.m. (Milton) and went in battery with the Third Corps' batteries on the extreme left, its left within 50 yd of a dense wood; after about an hour's slow firing it fired by prolonge and retired 300 yd (Milton; McGilvery's order to all batteries was 350 yd, his new line 400 yd to the rear) to 'a position near which two stone walls met at an obtuse angle', ordered to hold at all hazards without infantry support, where flanking infantry closed in at about a quarter to six and silenced the four pieces on its right; four guns were left and two under Milton were taken off (six guns; Hunt lists four 12-pounders). The NPS identifies those walls with the Trostle farm wall and its narrow gate, which stayed standing and, with an overturned limber, trapped four guns taken by the 21st Mississippi; Hunt (B&L) and Meade's Life and Letters place the stand 'close by the Trostle house'. The four guns were hauled back by an infantry detail at 8 p.m. and Milton withdrew to park at 9 p.m. The 18:30 hour is not in any source: between about 17:45 and 21:00. Milton's loss is 45 horses killed and 15 wounded (60), which two more scans confirm; Fox (1889) misquotes it as 50 + 15 (65), Hunt (Century Magazine, via Fox) says 80 of 88, Meade's Life and Letters says 28 men and 80 horses. On 3 Jul Milton took two pieces, with two of Battery K, 3rd US, to the left of Cemetery Hill under Baxter (right centre); the OR does not say Ziegler's Grove. 'Wheatfield Road' is not in the OR.",
    sub=[
        S('a', 'guns', "Guns: McGilvery: four guns left on the field plus two under Milton taken to the rear = six; Hunt lists Bigelow's (9th Mass.) as four 12-pounders; the PDF says six Napoleons.", 'documented', 'conflict', [
            C('OR1', 'R318', "he was forced to leave four guns and retire"),
            C('OR1', 'R318', "Two guns under command of Lieutenant Milton were taken safely to the rear"),
            C('OR1', 'R028', "Bigelow's (Ninth Massachusetts, four 12-pounders)")]),
        S('b', 'hour', "First position and hours: ordered from park about 4 p.m. (Milton); McGilvery got his order at about 3.30 p.m.; about an hour's slow firing; the infantry gave way about a quarter to 6.", 'documented', 'supported', [
            C('OR1', 'R320', "Went in battery in line with batteries of the Third Corps, on extreme left of the line, our left being within 50 yards of a dense woods"),
            C('OR1', 'R318', "At about a quarter to 6 o'clock the enemy's infantry gained possession of the woods immediately on the left of my line of batteries"),
            C('OR1', 'R318', "whereupon I ordered them to retire 350 yards and renew their fire")]),
        S('c', 'movement', "Retirement: by prolonge, firing canister; Milton gives 300 yd, McGilvery ordered 350 yd for the batteries and formed his new line about 400 yd to the rear; the PDF's 400 yd is McGilvery's new-line figure.", 'documented', 'conflict', [
            C('OR1', 'R318', "Captain Bigelow retired by prolonge, firing canister"),
            C('OR1', 'R320', "we retired 300 yards, until we reached a position near which two stone walls met at an obtuse angle"),
            C('OR1', 'R318', "In the meantime I formed a new line of artillery about 400 yards to the rear, close under the woods")]),
        S('d', 'place', "Second position: 'a position near which two stone walls met at an obtuse angle' (Milton); the NPS ties the walls and gate to the Trostle farm and 'Bigelow's Battery Wall' (pre-1863); Hunt (B&L), Meade's Life and Letters and Toombs (1888) say 'near the Trostle house'. The OR does not name Trostle.", 'documented', 'supported', [
            C('OR1', 'R320', "This position, without infantry support and under an enfilading artillery fire, we were ordered to hold at all hazards"),
            C('NPS', 'NPS-CLI-ERR', "Field Stone Wall, Abraham Trostle Farm. (pre-1863, Contributing)"),
            C('NPS', 'NPS-CLI-ERR', "The north portion of the wall is Bigelow’s Battery Wall"),
            C('LIB', 'BL-3', "Bigelow's 9th Massachusetts made a stand close bv the Trostle house in the corner of the field through which he had retired fighting with prolonges fixed"),
            C('LIB', 'MEADE-LL-v2', "Bigelow's Ninth Massachusetts Battery makes a final stand near the Trostle house"),
            C('LIB', 'NJ-TOOMBS-1888', "Bigelow's battery, which took position near the Trostle house")],
          note="The wall pre-existed (NPS: pre-1863): no construction animation (PDF B.7.3 rule). The PDF's 'stone wall near Trostle's house' is thus documented in NPS and three books; the OR says 'two stone walls met at an obtuse angle'."),
        S('e', 'damage', "Loss and capture: the infantry closed in on both flanks and silenced the four pieces on the right; they could not be withdrawn for want of officers, men and horses; the NPS: the narrow gate was blocked by an overturned limber and four guns were trapped and captured by the 21st Mississippi; the four guns were hauled off at 8 p.m. by a detail of the 6th Maine and Seeley's battery; Milton parked at 9 p.m.", 'documented', 'supported', [
            C('OR1', 'R320', "Its flanks closing in on either side of us, obtained a cross-fire, which silenced the four pieces on my right, and prevented their withdrawal"),
            C('NPS', 'NPS-CLI-ERR', "When the gate was blocked by an overturned limber, four guns of Bigelow’s Battery were trapped and captured by the 21st Mississippi Regiment."),
            C('OR1', 'R318', "The guns of the two batteries, numbering eight, were brought safely to the rear"),
            C('OR1', 'R320', "Under orders from Lieutenant-Colonel McGilvery, to whom I then reported, I withdrew a mile and a half to the rear and went into park, it being then 9 p. m.")],
          note="The OR has no Confederate report naming the 21st Mississippi's capture (no Barksdale report); the identification rests on the NPS inventory. 'Hand-to-hand fighting' is not in these reports."),
        S('f', 'hour', "The PDF's 18:00-18:30 for the second position and about 18:30 for the overrun: not stated in any source; bounded by about 17:45 (infantry gave way) and 21:00 (Milton parked).", 'inferred', 'partial', [
            C('OR1', 'R318', "At about a quarter to 6 o'clock the enemy's infantry gained possession of the woods immediately on the left of my line of batteries")],
          note="Fence-2 (S-039) reached the same bounds."),
        S('g', 'damage', "Horse losses: Milton: 45 horses killed and 15 wounded (60; two more scans agree); Fox (1889) quotes Milton as 50 killed and 15 wounded (65); Hunt (Century, in Fox): 80 of 88; Meade's Life and Letters: 28 men and 80 horses.", 'documented', 'conflict', [
            C('OR1', 'R320', "45 horses were killed and 15 wounded"),
            C('LIB', 'FOX-1889', "Bigelow lost, at Gettysburg, 50 horses killed and 15 wounded, according to the official report of Lieutenant Milton"),
            C('LIB', 'FOX-1889', "states that Bigelow lost 80 horses killed or wounded, out of 88 horses"),
            C('LIB', 'MEADE-LL-v2', "the whole loss of the battery from the beginning to the end of the afternoon being twentyeight men and eighty horses")],
          note="The PDF's '65' is Fox's reading of Milton, which the OR text does not bear out (45 + 15 = 60)."),
        S('h', 'place', "3 Jul: Milton with two pieces of Battery K, 3rd US (Turnbull) was placed on the right centre, on the left of Cemetery Hill, under Baxter, and was under fire of two Whitworth guns about two miles off; the OR does not say 'Ziegler's Grove'.", 'documented', 'partial', [
            C('OR1', 'R320', "was placed in position on right center, on left of Cemetery Hill, under immediate command of General Baxter, First Corps")]),
        S('i', 'state_at_start', "State: first position open ground (no work named); second position at a pre-existing stone wall corner (NPS: pre-1863).", 'inferred', 'supported', [
            C('NPS', 'NPS-CLI-ERR', "Trostle Lane fencing: Not initially removed because of east-west orientation; prevented troop movements north-south across fields, trapping Bigelow’s 9th Massachusetts")]),
    ],
    stays_unsupported=["The exact overrun hour (about 18:30 is not in any source)",
                       "'Hand-to-hand fighting' at the walls (no OR statement)",
                       "'Wheatfield Road' and 'Ziegler's Grove' as OR place names for this battery"],
    conflicts=["Retirement distance 300 (Milton) / 350 (McGilvery) / 400 (PDF)",
               "Guns: six (McGilvery 4 + 2) vs four (Hunt) vs six Napoleons (PDF)",
               "Horse losses: 60 (OR) / 65 (Fox's reading) / 80 of 88 (Hunt via Fox, Meade) "],
    register=['terrain-1-EG-10'],
    blocked=[B('CWE-9Mass / CWN-2025', None, "PDF keys 'CWE-9Mass' (Civil War in the East, 9th Mass.) and 'CWN-2025' (Civil War News, 'The work of the very devil himself'): the PDF prints no URL for these keys; civilwarnews.com was not probed here. Read them only for the origin of '65 horses (narrative)' and '80 of 88': the second figure is now found in Fox (1889) as a quotation of Hunt in the Century Magazine.")],
    consequence=["structures G-10 and P-06: second position at the Trostle farm stone wall corner is now documented (OR: two stone walls at an obtuse angle; NPS CLI: pre-1863 Trostle wall and 'Bigelow's Battery Wall'): the wall pre-exists, no construction animation; the narrow gate blocked by a limber is the trap",
                 "structures G-10: retirement 300 yd by prolonge (Milton) default per DD-F2-04, 350 and 400 selectable; capture window 17:45-21:00 (18:30 selectable PDF value); capturing unit 21st Mississippi (NPS) stays a secondary claim",
                 "structures G-10: horse-loss selector 60 / 65 / 80-of-88; remove 'hand-to-hand fighting' or mark it unsupported",
                 "kit US.ART.9th_Massachusetts: six guns (four left + two with Milton), type 12-pdr Napoleon; 3 Jul Milton two pieces left of Cemetery Hill under Baxter"],
    lookups=[L('OR Part 1', 'Bigelow, Milton, McGilvery', 12, "second position and horse numbers; no Confederate report names the capture"),
             L('library', 'Bigelow horses', 5, "Fox 1889 (50+15 and 80 of 88), Meade Life and Letters (28 men, 80 horses)"),
             L('second scans', '45 horses were killed and 15 wounded', 2, "found in warofrebellion271unit and warofrebellion012701rootrich; '50' not found")],
    structures=['G-10', 'P-06'],
    changes=["G-10 conflict -> corrected: the Trostle second position is documented (Milton, NPS, three books); '65 horses' is Fox's misreading of Milton's 45 + 15; the 18:30 hour stays unsupported"],
))

# ---------------------------------------------------------------------------------------------------------------- G-11
ROWS.append(R(
    'R13.G-11', 'corrected', 'open_gaps',
    pdf_row="McGilvery's Plum Run line | South of Cemetery Ridge, along Plum Run | Assembled Jul 2 evening from various commands | Improvised | Varied from 6 to 23 guns as batteries arrived and left | documented | CWN-2025",
    pdf_claim="McGilvery's Plum Run line, south of Cemetery Ridge along Plum Run, assembled on the evening of 2 Jul from various commands; improvised; varied from 6 to 23 guns as batteries arrived and left.",
    corrected="The first-draft close-out was right that one state does not fit both days. 2 Jul evening (improvised): McGilvery formed a new line about 400 yd to the rear, close under the woods and covering the opening to the Gettysburg and Taneytown road, of Battery I 5th US, an unnamed volunteer battery, three guns of the 5th Mass. and two of Thompson's; the 6th Maine reported just before sundown, Pettit's came and left, Seeley's was placed about 8 p.m. A brook with low bushes ran between the lines; the line was fired on by the enemy's sharpshooters. No gun total is stated for the evening line and the PDF's 6-to-23 range appears in no source. 3 Jul morning: McGilvery brought the batteries into line on the low ground on the left centre: Ames six 12-pdr, Dow's 6th Maine four 12-pdr, a New Jersey battery six 3-inch, Rank's section two 3-inch, 2nd Connecticut four James rifles and two howitzers, Hart four 12-pdr, Phillips six 3-inch, Thompson five 3-inch: 'thirty-nine guns' (6+4+6+2+6+4+6+5 = 39), 'in front of these guns I had a slight earthwork thrown up', sufficient to resist every projectile; Tyler found 'some shelter' thrown up for the artillery along the crest; the Maine book says the cannoneers were ordered to shelter behind the earthworks in front of their guns. The 'Plum Run line' is Hunt's name (B&L) for the line formed beyond the Trostle position.",
    sub=[
        S('a', 'guns', "3 Jul morning: Ames six 12-pdr; Dow's 6th Maine four 12-pdr; a New Jersey battery six 3-inch; Rank's section two 3-inch; 2nd Connecticut four James rifles and two howitzers; Hart four 12-pdr; Phillips six 3-inch; Thompson five 3-inch: 39 guns.", 'documented', 'supported', [
            C('OR1', 'R318', "early on the morning of July 3 brought them into line on the low ground on our left center"),
            C('OR1', 'R318', "total, ihirtyruine guns", note="OCR for 'thirty-nine'; 6+4+6+2+6+4+6+5 = 39")]),
        S('b', 'state_at_start', "3 Jul state: prepared: a slight earthwork in front of the guns, built on McGilvery's order during the night and early morning of 3 Jul, sufficient to resist all projectiles; the cannoneers sheltered behind it; Tyler: some shelter thrown up for the artillery along the crest.", 'documented', 'supported', [
            C('OR1', 'R318', "In front of these guns I had a slight earthwork thrown up, which proved sufficient to resist all the projectiles which struck it"),
            C('OR1', 'R315', "The infantry had constructed a slight breastwork of such materials a& the erround afforded along the entire crest of the hill, and some shelter Had been thrown up for the artillery", note="OCR 'a&' and 'erround'"),
            C('LIB', 'ME-GB-1898', "the cannoneers were ordered not to reply, but to shelter themselves behind the earthworks in front of their guns")]),
        S('c', 'count', "2 Jul evening line: Battery I 5th US, an unnamed volunteer battery, three guns of the 5th Mass., two of Thompson's; Dow's 6th Maine reported just before sundown; Pettit's came and left; Seeley's placed about 8 p.m. No gun total is stated.", 'documented', 'supported', [
            C('OR1', 'R318', "In the meantime I formed a new line of artillery about 400 yards to the rear, close under the woods"),
            C('OR1', 'R318', "Battery I, Fifth Regular, and a volunteer battery which I have never been able to learn the name of; three guns of the Fifth Masschusetts and two of Captain Thompson's Pennsylvania battery"),
            C('OR1', 'R318', "As soon as the Sixth Maine Battery reported, which was just before sundown"),
            C('OR1', 'R318', "I then placed Captain Seeley's regular battery")],
          note="The PDF's 'varied from 6 to 23 guns' is in no source read (searched 'twenty-three guns')."),
        S('d', 'state_at_start', "2 Jul evening state: improvised at the edge of the woods; a brook with low bushes between the lines held sharpshooters; no work named.", 'inferred', 'partial', [
            C('OR1', 'R318', "A brook, running through low bushes parallel to our front, midway between ours and the enemy's lines")],
          note="Silence of McGilvery's report on works on 2 Jul."),
        S('e', 'place', "Place: 'the low ground on our left center'; 'Plum Run line' is Hunt's name (B&L) for the line in front of the wood beyond Plum Run formed from the serviceable batteries.", 'documented', 'supported', [
            C('LIB', 'BL-3', "that is, on what we have called the \"Plum Run line.\"", note="curly quotation marks in the text are straight in the OCR")],
          note="The OR report names the ground but not Plum Run."),
        S('f', 'hour', "Cannonade on 3 Jul: the enemy opened at about 12.30 o'clock with at least 140 guns (McGilvery).", 'documented', 'supported', [
            C('OR1', 'R318', "At about 12.30 o'clock the enemy opened a terrific fire upon our lines with at least one hundred and forty guns")]),
    ],
    stays_unsupported=["'Varied from 6 to 23 guns' (no source)",
                       "The gun total of the 2 Jul evening line (not stated)",
                       "Dimensions of the 3 Jul earthwork ('slight')"],
    conflicts=["3 Jul line total: 39 guns (McGilvery) vs 'six or eight batteries' (NPS-quoted Haskell) vs Hunt's roster without the New Jersey battery"],
    register=['terrain-1-EG-11'],
    blocked=[B('CWN-2025', None, "PDF key 'CWN-2025' (Civil War News, 'The work of the very devil himself'): no URL printed in the PDF; read it only for the '6 to 23 guns' wording; not probed here.")],
    consequence=["structures G-11: split into G-11a (2 Jul evening, improvised, guns as McGilvery lists, no total, unit list by sundown) and G-11b (3 Jul morning, prepared: slight earthwork built by the batteries on McGilvery's order between the evening of 2 Jul and 12:30 on 3 Jul; 39 guns in eight batteries); confirms DD-04",
                 "works_stages: add a G-11b work with the batteries as builders and no 1863 dimension (plausible-procedural)",
                 "kit: McGilvery brigade batteries Ames 6, Dow 4, NJ battery 6, Rank 2, 2nd Conn 6, Hart 4, Phillips 6, Thompson 5 on 3 Jul; remove the unsupported 6-to-23 range or mark it PDF-only"],
    lookups=[L('OR Parts 1-2 and library', 'twenty-three guns', 5, "no McGilvery count of 23; the library hits are other armies")],
    structures=['G-11', 'S-061'],
    changes=["G-11 conflict_with_seed -> corrected (split confirmed); the evening line has no total; the 3 Jul earthwork is now corroborated by Tyler and the Maine book"],
))

# ---------------------------------------------------------------------------------------------------------------- G-12
ROWS.append(R(
    'R13.G-12', 'corrected', 'open_gaps',
    pdf_row="Cushing's Battery A, 4th US (six 3-inch rifles) | Angle, below the crest between the 71st and 72nd PA; two guns run to the wall | Jul 2 late afternoon (attached to Webb); Jul 3 about 13:00-15:30 | Prepared position in line; guns run forward to the pre-existing wall for canister | Four of six knocked out in the bombardment; three limbers exploded in the morning of Jul 3 per Hazard; double canister at about 100 yd; Cushing killed at the last shot | documented | WHN-Cushing; Iron-9699; SS-7888",
    pdf_claim="Cushing's Battery A, 4th US (six 3-inch) stood at the Angle below the crest between the 71st and 72nd Pa., two guns run to the wall; in position on the late afternoon of 2 Jul (attached to Webb) and 13:00-15:30 on 3 Jul; a prepared position in line with guns run forward to the pre-existing wall for canister; four of six knocked out in the bombardment, three limbers exploded on the morning of 3 Jul (Hazard), double canister at about 100 yd, Cushing killed at the last shot.",
    corrected="Hunt, Hancock and Hazard place Cushing's six 3-inch guns in the Second Corps line (right to left Woodruff, Arnold, Cushing, Brown, Rorty), posted on the morning of 2 Jul (Webb: in position at 6.30 a.m. with his right on Cushing's battery), not on the late afternoon. Gibbon: Webb's brigade 'partially behind a low stone wall, and protecting Cushing's battery ... on its right'; Webb put two companies of the 71st behind the stone wall on the right of Cushing's battery and kept the 72nd under the crest in reserve. The NPS puts the battery in the angle of the wall just in front of the crest. No gun pit, epaulement or other earthwork is named by any report read (the wall pre-existed): the engine rule 'prepared, built on screen' has no basis for this battery (a general statement of Tyler that some shelter was thrown up for the artillery along the crest applies to the line, not to Cushing). Three limbers were exploded about 8 a.m. on 3 Jul (Hazard) or during the cannonade and replaced with the caisson limbers (Hall). By 2:45 p.m. all guns but one were silenced (Webb) - not 'four of six' - and three guns were run down to the fence (Webb), one gun (Hall) or two (NPS, Nesbit); Cushing, wounded in both thighs, fought on for an hour and a half and was killed at the fence while serving his last canister (Webb, Hall). 'Double canister' and 'about 100 yd' are in no source for Cushing's guns (the NPS gives Cowan's battery double canister at under 20 yd and Smith's account of the guns seen at about 200 feet).",
    sub=[
        S('a', 'guns', "Unit and guns: Battery A, 4th US (Lt Alonzo H. Cushing), six 3-inch.", 'documented', 'supported', [
            C('OR1', 'R028', "Cushing's (A, Fourth United States, six 3-inch)", occ=0),
            C('OR1', 'R132', "Battery A, Fourth U. S. Artillery (both six 3-in6h batteries)", note="OCR '3-in6h'")]),
        S('b', 'place', "Place: Second Corps line from right to left Woodruff, Arnold, Cushing, Brown, Rorty; Webb's right resting on Cushing's battery; Gibbon: Webb's brigade partly behind a low stone wall protecting Cushing's battery on its right; two companies of the 71st behind the wall on the right of the battery, the 72nd under the crest in reserve; NPS: the battery stood in the angle of the wall just in front of the crest.", 'documented', 'supported', [
            C('OR1', 'R076', "The batteries of the corps were disposed from right to left as follows: Woodruil's (I. First U. S. Artillery), Arnold's (A, First Rhode Island), Cushing's (A, Fourth U. S. Artillery), Brown's (B, First Rhode Island), and Rorty's (B, First New York)", note="OCR 'Woodruil's'"),
            C('OR1', 'R098', "Webb's brigade on the right, partially behind a low stone wall, and protecting Cushing's battery. Fourth U. S. Artillery, which was on its right"),
            C('OR1', 'R104', "Colonel Smith, commanding the Seventy-first Pennsylvania Volunteers, threw two companies of his command behind the stone wall on the right of Cushing's battery"),
            C('OR1', 'R104', "The Seventy-second Pennsylvania volunteers were held in reserve under ~tEe crest of the hill", note="OCR '~tEe'"),
            C('NPS', 'NPS-COMMON-PRIDE-1', "but this proved impossible due to the presence of L t . Alonzo Cushing's Battery A, 4th United States Artillery in this same angle and just in front of the crest of the ridge")],
          note="'Between the 71st and 72nd' is not in the OR: the 71st was in the front line and on the wall right of the battery, the 72nd in reserve under the crest."),
        S('c', 'hour', "Arrival: the batteries of the Second Corps were posted on the morning of 2 Jul; Webb's brigade was put in position at 6.30 a.m. with its right on Cushing's battery. The PDF's 'late afternoon 2 Jul' is contradicted.", 'documented', 'contradicted', [
            C('OR1', 'R028', "The batteries of the Second Corps were posted on the morning of the 2d by its chief of artillery"),
            C('OR1', 'R104', "this brigade was put in position at 6.30 a. m. on the 2d, on Granite Ridge, on the right of the division, its right resting on Cushing's battery (A, Fourth U. S. Artillery), and its left on Battery B, First Rhode Island Artillery, Lieutenant Brown commanding"),
            C('OR1', 'R132', "upon the establishment of the battle-line of the corps to the left of the Taneytown road, took position in the following order, as shown in diagram")]),
        S('d', 'damage', "Three limbers exploded: about 8 o'clock on the morning of 3 Jul (Hazard) or during the cannonade, changed with the caisson limbers under fire (Hall).", 'documented', 'conflict', [
            C('OR1', 'R132', "The morning of July 3 was quiet until about 8 o'clock, when the enemy suddenly opened fire upon our position, exploding three limbers of Battery A, Fourth U. S. Artillery, but otherwise causing little loss"),
            C('OR1', 'R109', "Three of his limbers were blown up and changed with the caisson limbers under fire")]),
        S('e', 'damage', "Bombardment losses: by 2.45 p.m. the enemy had silenced all the guns but one of Cushing's battery; the other batteries were exhausted of ammunition but canister; the PDF's 'four of six knocked out' is not stated.", 'documented', 'contradicted', [
            C('OR1', 'R104', "By 2.45 o'clock had silenced the Rhode Island battery and all the guns but one of Cushing's battery")]),
        S('f', 'movement', "Guns run to the wall: three (Webb), one gun with cannoneers enough for a section (Hall), two (NPS from Nesbit's account); the PDF says two.", 'documented', 'conflict', [
            C('OR1', 'R104', "Three of Cushing's guns were ruh~3own to the fence, carrying with them theii canister", note="OCR '~3own' for 'down'"),
            C('OR1', 'R109', "with but cannoneers enough to man a section"),
            C('OR1', 'R109', "he pushed his gun to the fence in front, and was killed while serving his last canister into the ranks of the advancing enemy")]),
        S('g', 'damage', "Cushing's death: mortally wounded at the fence by the side of his guns; he fought on for an hour and a half after reporting that he was wounded in both thighs; killed while serving his last canister (Hall). Fifty men of the 71st Pa. helped work the battery on 3 Jul.", 'documented', 'supported', [
            C('OR1', 'R104', "Lieut. A. H. Gushing, Fourth U. S. Artillery, fell, mortally wounded, at the fence by the side of his guns", note="OCR 'Gushing' for Cushing"),
            C('OR1', 'R104', "he fought for an hour and a half after he had reported to me that he was wounded in both thighs"),
            C('OR1', 'R106', "On the 3d instant, some 50 of my men assisted in working Lieutenant Cushing's battery, while the balance were in position, protected by a stone wall from an infantry attack")]),
        S('h', 'state_at_start', "Prepared or improvised: no gun pit or earth is named for Cushing's battery in any report read; the stone wall in front pre-existed; the PDF's 'prepared position in line, built on screen' has no OR basis.", 'inferred', 'partial', [
            C('OR1', 'R098', "Webb's brigade on the right, partially behind a low stone wall, and protecting Cushing's battery. Fourth U. S. Artillery, which was on its right")],
          note="Recorded as inferred from silence; Tyler's general 'some shelter' for the artillery along the crest is cited at G-11/G-13."),
        S('i', 'other', "'Double canister at about 100 yd': in no source for Cushing's guns; Hall says only 'his last canister'.", 'open_gap', 'unsupported', []),
    ],
    stays_unsupported=["'Four of six knocked out' (Webb: all but one silenced by 14:45)",
                       "Double canister at about 100 yd for Cushing",
                       "Any earthwork, epaulement or gun pit at Cushing's guns"],
    conflicts=["Guns run to the wall: 3 (Webb) vs 1 (Hall) vs 2 (NPS/Nesbit, PDF)",
               "Limbers: exploded about 08:00 (Hazard) vs during the cannonade (Hall)",
               "Guns serviceable at 14:45: one (Webb) vs two (PDF)"],
    register=['terrain-1-EG-12'],
    blocked=[B('WHN-Cushing / Iron-9699 / SS-7888', None, "PDF keys 'WHN-Cushing' (Warfare History Network, Cushing), 'Iron-9699' (Iron Brigader, Hazard's report) and 'SS-7888' (Stone Sentinels, Cushing monument): the PDF prints no URLs for these keys; gettysburg.stonesentinels.com was refused here (403). Hazard's report itself is read in the Official Records (R132). Read the Warfare History Network page only for 'double canister at about 100 yd'.")],
    consequence=["structures G-12: battery in place from the morning of 2 Jul (not late afternoon), Second Corps order Woodruff-Arnold-Cushing-Brown-Rorty; no earthwork: the Angle wall pre-exists and is never animated; remove 'built on screen' (confirms DD-04)",
                 "structures G-12: 3 Jul events: three limbers exploded about 08:00 (Hazard) with Hall's during-cannonade reading selectable; all guns but one silenced by 14:45; guns run to the wall one/two/three selectable; 50 men of the 71st Pa. serve the guns; Cushing killed at the fence",
                 "kit US.ART.4th_US_A: six 3-inch confirmed; mark double canister and 100 yd as PDF-only"],
    lookups=[L('OR Part 1', 'Cushing', 22, "Hunt, Hancock, Gibbon, Webb, Hall, Hazard, E. Penn Smith: no earthwork named for the battery"),
             L('NPS Common Pride', 'Cushing', 25, "angle of the wall in front of the crest; two guns (Nesbit); guns protruding through the wall")],
    structures=['G-12', 'P-14'],
    changes=["G-12 conflict_with_seed -> corrected: arrival morning of 2 Jul; one gun serviceable at 14:45; earthwork unsupported; double canister unsupported"],
))
