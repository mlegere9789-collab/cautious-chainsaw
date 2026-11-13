"""Row specs R13.G-05 to R13.G-08 (terrain-1 close-out, 2026-11-13)."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- G-05
ROWS.append(R(
    'R13.G-05', 'partially_supported', 'open_gaps',
    pdf_row="Smith's 4th NY (six 10-pdr Parrotts) | Devil's Den / Houck's Ridge | Arrived 09:00; four guns above Devil's Den at 14:00; one section shifted right about 18:00 | Improvised (ordered to fire west into the woods) | Two guns in the Plum Run valley fired canister at Benning's brigade; three ridge guns captured by the 1st Texas and later given to Henry's battalion | documented | SS-NY1958; GD-Smith; NPS-HB9",
    pdf_claim="Smith's 4th NY Independent Battery (six 10-pdr Parrotts) arrived at 09:00; four guns stood above Devil's Den at 14:00 and one section shifted right about 18:00; improvised (ordered to fire west into the woods); two guns in the Plum Run valley fired canister at Benning's brigade; three ridge guns were captured by the 1st Texas and later given to Henry's battalion.",
    corrected="Smith had six 10-pounder Parrotts. He rejoined the corps and division at 9 a.m. (Smith, 1888 address) and was led to Devil's Den about 1 p.m.; four guns stood on the crest (the rocky eminence was too small for more), two guns with the caissons 75 yd (address) or 150 yd (report) to the rear to cover the Plum Run gorge, because the four front guns could not be depressed to reach the gorge (address; NPS). The duel began about 2 p.m. (address) or 2:30 p.m. (report); Warren had Smith fire a shot into the woods and Hunt ordered the guns to open on Cabell's battalion (NPS, Hunt). The rear section opened with canister on the force pushing through the gorge; Benning wrote of 'the terrible fire' of two guns that swept the gorge. The OR has no 'section shifted right about 18:00': the battery stayed on the ground from 2 to 6 p.m. and the last guns were abandoned when the infantry gave way. Three guns on the hill were lost (one of the four had been withdrawn disabled). Who took them is a conflict: Benning ('the three front guns'), Waddell (20th Georgia), Robertson and Work (1st Texas, who count six guns, three brought off), and Henry's battalion journal ('captured and brought off the field this night three 10-pounder Parrott rifles'); Pendleton lists three 10-pdr Parrotts among the guns taken. Loss: 2 killed, 10 wounded, 11 horses killed and disabled; three Parrotts and carriages lost.",
    sub=[
        S('a', 'guns', "Unit and guns: Smith's 4th NY Independent Battery, six 10-pounder Parrotts; four placed on the height, two with the caissons in rear.", 'documented', 'supported', [
            C('OR1', 'R028', "Smith's battery (Fourth New York, six 10-pounders) on the extreme left and on a steep and rocky eminence in advance of Sugar Loaf"),
            C('OR1', 'R184', "I placed two sections of my battery on a hill (near the Devil's Cave) on the left of General Bimey's line, leaving one section, together with caissons and horses, 150 yards in the rear", note="OCR 'Devil's Cave', 'Bimey' for Devil's Den, Birney"),
            C('LIB', 'NY-GB-1900', "The two remaining guns, with the caissons and horses, were left 150 yards in the rear, where they commanded the gorge of Plum Run")],
          note="The 1888 address (NY at Gettysburg vol. 3, p.1289) puts the rear section about 75 yd behind the crest; the report and the 1900 book say 150 yd."),
        S('b', 'hour', "Arrival: the battery rejoined the corps and division at 9 o'clock a.m. (Smith, 1888) after leaving Emmitsburg; Randolph led it to Devil's Den about 1 p.m.", 'documented', 'supported', [
            C('LIB', 'NY-GB-1902-v3', "rejoining the corps and division at 9 o'clock, a. m."),
            C('LIB', 'NY-GB-1902-v3', "About i o'clock, p. m., Capt. G. E. Randolph, chief of Third Corps Artillery, piloted the battery to")],
          note="The OR report has no arrival hour; the 9 a.m. is Smith's 1888 recollection (participant, retrospective). The text layer reads 'About i o'clock, p. m.': read as 1 o'clock (one scan; the same address puts the duel at about 2 p.m.)."),
        S('c', 'hour', "Action clocks: duel began about 2 p.m. (Smith 1888) or about 2:30 p.m. (Smith report); the battery was on the ground from 2 to 6 p.m.; four guns used against the infantry attack from about 3:30.", 'documented', 'conflict', [
            C('OR1', 'R184', "About 2.30 p. m. the enemy opened fire on my right and front from several guns, directing a portion of their fire upon my position. I was ordered by one of General Ward's aides' to return their fire"),
            C('LIB', 'NY-GB-1902-v3', "This artillery battle began about 2 p. m."),
            C('LIB', 'NY-GB-1902-v3', "About 3:30 o'clock the enemy's infantry appeared in line of battle, moving directly upon the Round Tops"),
            C('LIB', 'NY-GB-1902-v3', "The battery was on the ground from 2 until 6 o'clock, p. m.")]),
        S('d', 'state_at_start', "State: improvised; the difficulty of getting the guns up the rocky height delayed Smith's opening; no work is named. NPS: Warren had Smith fire a shot into the woods; Smith's report: one of Ward's aides ordered him to return fire.", 'inferred', 'supported', [
            C('OR1', 'R028', "The difficulty of getting these guns up the height had caused the delay in Smith's opening his fire"),
            C('OR1', 'R028', "went to his battery to ascertain the cause. When I arrived, he had succeeded in getting his guns into position, and just opened fire"),
            C('NPS', 'NPS-HB9-1954', "Smith's New York battery, emplaced at Devil's Den, immediately was ordered to fire a shot into these woods")],
          note="'Ordered to fire west into the woods' is the NPS handbook's order by Warren, not Smith's report."),
        S('e', 'place', "The four front guns could not be depressed enough to cover the Plum Run gorge, so two guns in rear were trained on it.", 'documented', 'supported', [
            C('LIB', 'NY-GB-1902-v3', "The four guns could not be depressed to reach troops moving through the gorge, hence the necessity for this arrangement."),
            C('NPS', 'NPS-SLAUGHTER-PEN', "Since the four front guns could not be depressed enough to cover any Confederate advance through the Plum Run gorge between Round Top and the", note="NPS text layer garbled after 'the'; the NPS cites Smith's 1892 book")]),
        S('f', 'movement', "Two guns in the Plum Run valley: Smith ran to the rear section and fired canister on the force coming through the gorge; the OR report says the section fired obliquely through the gully; Benning wrote of the terrible fire of two guns that swept the gorge.", 'documented', 'supported', [
            C('OR1', 'R184', "I then went to the rear, and opened that section of guns, firing obliquely through the gully, doing good execution"),
            C('OR2', 'R458', "Where that line crossed the gorge running between the peak an<l the mountain, a point 500 or GOO yards in the rear of the peak, were two other guns.", note="OCR 'an<l', 'GOO' for 'and', '600'"),
            C('OR2', 'R458', "by the terrible fire from them which swept down the goro-e.", note="OCR 'goro-e' for 'gorge'"),
            C('LIB', 'NY-GB-1902-v3', "The remaining two guns were stationed in rear about seventy-five yards, where they could be used to advantage, covering the Plum Run Gorge passage"),
            C('LIB', 'NY-GB-1902-v3', "their battle flag drops three different times from the effect of our canister")],
          note="'Canister' for the rear section is Smith's 1888 address (NY at Gettysburg vol. 3 p.1291), not the report; Benning does not say canister. The PDF says the target was 'Benning's brigade': Benning's report is the Confederate witness."),
        S('g', 'movement', "'One section shifted right about 18:00': not supported; in Smith's 1888 address the four guns stay on the crest and the two in the rear fire on the gorge until the infantry fall back, then the two guns are run through the woods to take position on the right of Winslow's battery as it limbers up and retires; the battery was on the ground from 2 until 6 o'clock.", 'documented', 'unsupported', [
            C('LIB', 'NY-GB-1902-v3', "The two guns are ran through the woods, and, seeing Winslow's Battery in position, I take position on his right just as he limbers up and retires", note="OCR 'ran' for 'run'"),
            C('LIB', 'NY-GB-1902-v3', "The battery was on the ground from 2 until 6 o'clock, p. m.")],
          note="Nothing in the OR, the 1888 address, the 1900 book or the NPS texts read has a section moving right at about 18:00."),
        S('h', 'damage', "Losses: 2 killed, 10 wounded, 11 horses killed and disabled; three 10-pounder Parrotts left on the hill (one of the four had been sent to the rear disabled) and lost; 240 rounds fired.", 'documented', 'supported', [
            C('OR1', 'R184', "I regret to report the loss of 2 brave men, viz, Corpl. John A. Thompson and Private Isaiah Smith, and the wounding of 10 privates, many severely"),
            C('OR1', 'R184', "Eleven horses were killed"),
            C('OR1', 'R184', "When I left three guns on the hill (one having been sent to the rear disabled)"),
            C('OR1', 'R184', "Three 10-pounder Parrott guns and gun-carriages (supposed to have been taken from the field by the Twelfth Corps) were lost"),
            C('OR1', 'R184', "Total amount of ammunition expended, 240 rounds"),
            C('OR1', 'R028', "He got off one of the four guns he had placed on the height, but was compelled to abandon the other three")]),
        S('i', 'other', "Capture: three 10-pounder Parrotts were taken and brought off the field the same night; who captured them is a conflict: Smith himself supposed in 1863 that the Twelfth Corps had taken them from the field and wrote in 1888 that the enemy took them off after dark; Benning ('only the three front guns'), Waddell for the 20th Georgia, Robertson and Work for the 1st Texas (six guns, three brought off), Henry's battalion journal ('captured and brought off the field this night three 10-pounder Parrott rifles'); Pendleton lists three 10-pdr Parrotts among the guns taken.", 'documented', 'conflict', [
            C('OR2', 'R458', "so that we captured only the three front guns. These were 10- pounder Parrotts."),
            C('OR2', 'R462', "three 10-pounder Parrott guns captured. They were brought off that night, and the next day turned against the enemy in that terrible artillery fight"),
            C('OR2', 'R452', "held the field and the batteries taken by the First Texas"),
            C('OR2', 'R452', "Three of the guns were brought off the field and secured"),
            C('OR2', 'R454', "I sent three pieces of the artillery captured to the rear"),
            C('OR2', 'R463', "Captured and brought off the field this night three 10-pounder Parrott rifles."),
            C('OR2', 'R428', "We wrested from him, on the battle-field at Gettysburg, three 10- pounder Parrotts, one 3-inch rifle, and three Napoleons, all ready for use against himself."),
            C('OR1', 'R184', "Three 10-pounder Parrott guns and gun-carriages (supposed to have been taken from the field by the Twelfth Corps) were lost", note="Smith's own supposition in 1863"),
            C('LIB', 'NY-GB-1902-v3', "Before the crest was abandoned one of the four guns, having been disabled, was withdrawn; this left but three, and these were taken off by the enemy after dark", note="Smith's 1888 address")],
          note="The PDF's 'captured by the 1st Texas and later given to Henry's battalion' joins two documented statements (Robertson/Work for the capture, Henry for the possession); no source says the guns were 'given'."),
    ],
    stays_unsupported=["One section shifted right about 18:00 (no source)",
                       "Whether the first Union shot of the 4th NY was ordered by Warren, Hunt or Ward's aide at the minute it came",
                       "The rear section's distance behind the crest (75 vs 150 yd)"],
    conflicts=["Who captured the guns: Benning's brigade / 20th Georgia / 1st Texas / Henry's battalion (Smith's 1863 report supposed the Twelfth Corps had taken them from the field; his 1888 address says the enemy took them off after dark)",
               "Rear section 75 yd (1888 address) vs 150 yd (report, 1900 book)",
               "Duel start 14:00 (address) vs 14:30 (report)"],
    register=['terrain-1-EG-05'],
    blocked=[B('SS-NY1958 / GD-Smith', None, "Stone Sentinels 'NY artillery' (key SS-NY1958) and Gettysburg Daily 'Smith's battery' (key GD-Smith): the PDF prints no URL; gettysburg.stonesentinels.com and gettysburgdaily.com were refused here (403, fence-2 probes 2026-11-13). Read them only for the '18:00 one section shifted right' claim.")],
    consequence=["structures G-05: four guns on the crest (arrival 09:00, in position about 13:00, fire from about 14:00-14:30), two with caissons in rear (75-150 yd selector) covering the Plum Run gorge; no work named (improvised)",
                 "structures G-05: remove 'one section shifted right about 18:00' (unsupported); keep 'two guns in the gorge' with Benning's report as the witness and canister as Smith's 1888 statement",
                 "structures G-05: the three ridge guns stay on the hill and are captured when the infantry gave way (about 17:30-18:00); capture attribution selector: Benning / 20th Georgia / 1st Texas (three or six guns) / Henry's battalion",
                 "kit US.ART.4th_NY: six 10-pdr Parrotts confirmed (Hunt p.234, p.236; Smith); losses 2 killed, 10 wounded, 11 horses"],
    lookups=[L('OR Part 2', 'captured guns at Devil\'s Den', 8, "Benning, Waddell, Robertson, Work, Henry, Pendleton: three Parrotts (Robertson and Work count six)"),
             L('library', "Smith's Fourth New York Battery", 6, "1888 address in NY at Gettysburg vol. 3 (arrival 9 a.m., 75 yd, 2-6 p.m.) and the 1900 book")],
    structures=['G-05'],
    changes=["G-05 supported -> partially_supported: arrival 09:00 and the four/two arrangement are now documented in the 1888 address; the 18:00 section shift is unsupported; capture attribution is a conflict, not a settled fact"],
))

# ---------------------------------------------------------------------------------------------------------------- G-06
ROWS.append(R(
    'R13.G-06', 'corrected', 'open_gaps',
    pdf_row="Hazlett's Battery D, 5th US | Little Round Top summit | March 16:30; first fire 17:45; fired until after dark | Improvised; hand-hauled | See E-15 | documented | NPS-Hazlett; SS-8009",
    pdf_claim="Hazlett's Battery D, 5th US marched at 16:30, first fired at 17:45 and fired until after dark from the summit of Little Round Top; improvised and hand-hauled.",
    corrected="Battery D, 5th US had six 10-pounder Parrotts (Hunt). It moved to the left about 4:30 p.m. and, 'immediately upon taking up the position', opened on the enemy and kept up a continuous fire until dark (Martin); the PDF's first fire at 17:45 is not in any source (Hunt: 'immediately opened'; Rittenhouse: Hazlett fell after the battery had been engaged only about an hour and died at 8 p.m.). Garrard has the battery ascending the ridge immediately behind the 140th NY and going into battery on the summit; the same report has the brigade build a stone wall about half-way down the slope that night (an infantry work; the walls on the summit that stand now were restacked in 1882-87). Hauling by hand is a conflict among secondary books (hand and handspike, dragged by the 155th Pa., horses lashed to their utmost with the infantry at the wheels); the NPS handbook quotes an eyewitness that the six guns' passage through the roadless woods and rocks was marvelous and they went immediately into battle. Guthrie's section of Gibbs' L/1st Ohio stood on the same hill on the right (Hunt, Martin).",
    sub=[
        S('a', 'guns', "Unit and guns: Battery D, 5th US (Lt Charles E. Hazlett), six 10-pounder Parrotts; Guthrie's section of Gibbs' battery (L/1st Ohio, light 12-pdr) on the same hill on the right of Hazlett.", 'documented', 'supported', [
            C('OR1', 'R028', "Hazlett's (D, Fifth United States, six 10-pounders)"),
            C('OR1', 'R028', "Guthrie's section of Gibbs' battery was posted on the same hill on the right of Hazlett")]),
        S('b', 'hour', "March: moved to the left about 4:30 p.m. (Hunt, Martin); Garrard's brigade was moved rapidly forward from about 4 p.m.", 'documented', 'supported', [
            C('OR1', 'R217', "the brigade with the division remained idle, lying by their arms until about 4 p. m. At this time the brigade was moved rapidly forward"),
            C('OR1', 'R028', "About 4.30 p. m. Hazlett's battery was moved to the extreme left"),
            C('OR1', 'R221', "On the 2d instant, about 4.30 p. m., Battery D, Fifth U. S. Artillery, was moved to the left of the First Division about three-quarters of a mile")]),
        S('c', 'hour', "First fire: 'immediately upon taking up the position' and a continuous fire until dark; Hazlett was shot after the battery had been engaged only about an hour and died at 8 p.m. The PDF's 17:45 first fire is in no source and would put Hazlett's wound after 18:45.", 'documented', 'contradicted', [
            C('OR1', 'R221', "Immediately upon taking up the position, the battery opened upon the enemy, who was engaging the First Division, completely enfilading the enemy's lines with marked effect"),
            C('OR1', 'R221', "The battery kept up a continuous fire until dark"),
            C('OR1', 'R221', "The battery had been engaged only about an hour, when First Lieut. Charles E. Hazlett (who conunanded the battery) was shot in the head"),
            C('OR1', 'R221', "He was carried to the rear, and died at 8 p. m.")],
          note="OCR 'conunanded' for 'commanded'. Delegated decision DD-FENCE1-07 already has first fire on arrival about 16:30."),
        S('d', 'place', "Place: the summit of Little Round Top: the battery ascended behind the 140th NY and went into battery on the summit; Rittenhouse commanded 'on the top of Round Top' on 3 Jul.", 'documented', 'supported', [
            C('OR1', 'R217', "Hazlett's battery ascended the ridge immediately in rear of this regiment (the One hundred and fortieth New York Volunteers, Col. P. H. O'Rorke commanding), and went into battery on the summit"),
            C('OR1', 'R028', "on the top of Round Top")]),
        S('e', 'movement', "Hand-hauling vs teams: dragged by hand by the 155th Pa.; lifted by hand and handspike; horses lashed to their utmost with the infantry at the wheels; passage 'marvelous' (NPS, an eyewitness). All are 1889-1914 or later accounts; the OR report says only that the battery ascended and went into battery.", 'documented', 'conflict', [
            C('LIB', 'PA-GB-1914-v2', "dragged the guns of Hazletts regular battery by hand"),
            C('LIB', 'ME-GB-1898', "lifted his guns by hand and handspike"),
            C('LIB', 'NY-GB-1902-v3', "the horses being lashed to their utmost exertions"),
            C('LIB', 'NY-GB-1900', "succeeded in dragging the heavy cannon up the steep"),
            C('NPS', 'NPS-HB9-1954', "The passage of the six guns through the roadless woods and amongst the rocks was marvelous")],
          note="The PDF's 'hand-hauled' is one of four selectable readings, not the sole account."),
        S('f', 'state_at_start', "State: improvised on the summit; no gun emplacement is named; the stone wall half-way down the slope was built that night by the infantry brigade; the walls on the summit were restacked by the GBMA in 1882-87 and may not set an 1863 profile.", 'inferred', 'partial', [
            C('OR1', 'R217', "At night this ridge, naturally strong, was strengthened by building a stone wall about half way down the slope"),
            C('NPS', 'NPS-CLI-LRT', "Defensive stone walls are built along the summit of Little Round Top and at Vincent Spur"),
            C('NPS', 'NPS-CLI-LRT', "In 1882-1887, the GBMA restacks the defensive stone walls at the Little Round Top summit")]),
        S('g', 'damage', "Loss: Hazlett fell mortally wounded while offering his assistance to General Weed on the summit (Garrard); shot in the head, he was carried to the rear and died at 8 p.m. (Rittenhouse in Martin's report); the battery lost 1 officer and 6 men killed and 6 men wounded (Martin).", 'documented', 'supported', [
            C('OR1', 'R217', "Lieutenant Hazlett, commanding the battery, while offering his assistance to General Weed, fell, mortally wounded"),
            C('OR1', 'R221', "First Lieut. Charles E. Hazlett (who conunanded the battery) was shot in the head. He was carried to the rear, and died at 8 p. m.", note="OCR 'conunanded' for 'commanded'; the passage is Rittenhouse's text inside Martin's report"),
            C('OR1', 'R221', "The battery lost in killed, 1 officer and 6 men; in wounded, 6 men")]),
    ],
    stays_unsupported=["First fire 17:45 (no source; contradicted)",
                       "Which of the four hauling accounts is right (all are retrospective books)",
                       "A prepared emplacement or its absence on the summit (the OR is silent)"],
    conflicts=["Hauling: by hand vs by horses with infantry at the wheels (four secondary books)",
               "First fire: on arrival about 16:30 (OR) vs 17:45 (PDF)"],
    register=['terrain-1-EG-06'],
    blocked=[B('NPS-Hazlett / SS-8009', None, "PDF keys 'NPS-Hazlett' (NPS, Hazlett's Battery) and 'SS-8009' (Stone Sentinels, Hazlett): the PDF prints no URL for either. nps.gov is reachable but the NPS page is not identified by the PDF and no nps.gov search is allowed beyond the page lists already saved; gettysburg.stonesentinels.com was refused (403). Read the NPS Hazlett's Battery page for any 'first fire' hour and the hauling wording.")],
    consequence=["structures G-06 and E-15: first fire on arrival about 16:30-17:00 (default per DD-FENCE1-07), the 17:45 value kept only as the PDF's unsupported alternative; battery six 10-pdr Parrotts; Guthrie's two guns on the hill's right",
                 "structures G-06: hauling method a four-way selector with no default (hand and handspike / dragged by infantry / horses with infantry at the wheels / teams under the lash)",
                 "works_stages LRT: infantry stone wall half-way down the slope built the night of 2 Jul by Weed's brigade; the summit walls are 1882-87 restacks: no profile from them"],
    lookups=[L('NPS texts', 'Hazlett', 26, "NPS handbook eyewitness quotation; CLI LRT: walls restacked 1882-87"),
             L('OR Part 1', 'Hazlett', 12, "Hunt, Martin, Garrard: 16:30 march, immediate fire, death 20:00")],
    structures=['G-06', 'E-15'],
    changes=["G-06 partially_supported -> corrected: 17:45 first fire is contradicted by Martin/Rittenhouse; hauling is a selector"],
))

# ---------------------------------------------------------------------------------------------------------------- G-07
ROWS.append(R(
    'R13.G-07', 'partially_supported', 'open_gaps',
    pdf_row="Hart's 15th NY (four Napoleons) | Peach Orchard, on the Wheatfield Road facing south | Ordered forward 16:00; placed about 16:30; canister at about 17:30 | Improvised (open field) | Lieutenant Knox pulled a gun off by hand | documented | Wiki-15NY",
    pdf_claim="Hart's 15th NY Independent Battery (four Napoleons) in the Peach Orchard on the Wheatfield Road facing south; ordered forward 16:00, placed about 16:30, canister at about 17:30; improvised in an open field; Lieutenant Knox pulled a gun off by hand.",
    corrected="Hart had four light 12-pounders (Napoleons). The New York book of 1902 gives the timeline: ordered to the front at 4 p.m., placed by Hunt at 4:30 p.m. in the Peach Orchard with the four guns pointed south, shrapnel changed to canister as the Confederate infantry came into range, about two hours in action. Hart's report: McGilvery pointed out a position, Hunt ordered him to the left of the Peach Orchard; McGilvery says in a peach orchard on the right and a little in front of the New Jersey battery. 3 men killed, 5 wounded, 13 horses killed (report); 25 horses killed or wounded (book). About 5:45 the infantry gave way and he retired about a mile after dark. 'Wheatfield Road' is not in these texts. Knox is praised in Hart's report and wounded on 3 Jul, but nothing says he pulled a gun off by hand. On 3 Jul Hart stood in McGilvery's line (G-11); Hancock ordered him to open, McGilvery ordered him to cease.",
    sub=[
        S('a', 'guns', "Unit and guns: Hart's 15th NY Independent Battery, four light 12-pounders (Napoleons).", 'documented', 'supported', [
            C('OR1', 'R318', "Hart's Fifteenth New York Independent Battery, four light 12- pounders"),
            C('OR1', 'R028', "Hart's (Fifteenth New York, four 12-pounders)", occ=0)]),
        S('b', 'hour', "Hours: ordered to the front at 4 p.m.; placed by Hunt at 4:30 p.m. (New York book); McGilvery received at about 3:30 p.m. an order to report to General Sickles with one light 12-pounder and one rifled battery.", 'documented', 'supported', [
            C('LIB', 'NY-GB-1902-v3', "At 4 p. m. Captain Hart was ordered to take his battery to the front, and go into position on General Sickles' line"),
            C('LIB', 'NY-GB-1902-v3', "placed the battery at 4:30 p. m. in the Peach Orchard, with the four guns pointed south"),
            C('OR1', 'R318', "at about 3.30 p. m. on July 2, 1 received an order from yourself to report to General Sickles with one light 12-pounder and one rifled battery", note="OCR '1 received'")]),
        S('c', 'place', "Place: McGilvery: in a peach orchard on the right and a little in front of the New Jersey battery; Hart: Hunt ordered him to a position on the left of the Peach Orchard. 'Wheatfield Road' is in no text read.", 'documented', 'conflict', [
            C('OR1', 'R321', "who ordered me to take a position on the left of the peach orchard"),
            C('OR1', 'R318', "Hart's Fifteenth New York Independent Battery reporting at that time, I placed it in Sosition in a peach orchard on the right and a little in front of the few Jersey battery", note="OCR 'Sosition', 'few Jersey' for position, New Jersey")]),
        S('d', 'hour', "Canister: shrapnel on the first infantry column, then canister; two attacks repulsed (Hart); the enemy's infantry gained the woods on the left of McGilvery's line about a quarter to 6 and the battery retired. No source gives a clock for the first canister: it lies between the placing at about 4:30 p.m. (New York book) and the retirement about 5:45 p.m., which contains the PDF's about 17:30.", 'documented', 'partial', [
            C('OR1', 'R321', "I then changed to canister, repulsing the attack made on my battery"),
            C('OR1', 'R321', "After the first repulse of the enemy, they reformed and advanced on me a second time, and were repulsed"),
            C('LIB', 'NY-GB-1902-v3', "He ordered his gunners to use shrapnel, which was soon changed to canister as the advancing lines of Confederate infantry came within close range"),
            C('OR1', 'R318', "At about a quarter to 6 o'clock the enemy's infantry gained possession of the woods immediately on the left of my line of batteries"),
            C('OR1', 'R318', "The Fifteenth New York Battery also retired from the field")],
          note="Neither Hart's report nor the New York book has a clock for the canister; the 17:30 of the PDF is a value inside the bounds, not a documented time."),
        S('e', 'damage', "Loss: 3 men killed, 5 wounded, 13 horses killed (report); about 25 horses killed or wounded and 16 killed or wounded among the men (state book).", 'documented', 'supported', [
            C('OR1', 'R321', "killing 3 of my men and wounding 5, also killing 13 horses"),
            C('LIB', 'NY-GB-1902-v3', "The battery carried 2 officers and 68 men into action at Gettysburg, of whom 16 were killed or wounded"),
            C('LIB', 'NY-GB-1902-v3', "the battery lost 25 horses killed or wounded")]),
        S('f', 'state_at_start', "State: improvised in open ground; no work is named on 2 Jul in Hart's or McGilvery's report (McGilvery's line on 3 Jul had a slight earthwork: G-11).", 'inferred', 'partial', [],
          note="Silence of two detailed reports; recorded as inferred, with no citation because an absence cannot be quoted."),
        S('g', 'movement', "'Lieutenant Knox pulled a gun off by hand': not in Hart's report or the New York book; both only praise Knox and record his wound.", 'open_gap', 'unsupported', [
            C('OR1', 'R321', "The noble and gallant conduct of Lieutenant Knox deserves the highest honor that could be conferred on him"),
            C('LIB', 'NY-GB-1902-v3', "Lieutenant Knox, who was severely wounded, is mentioned in Captain Hart's report")],
          note="The hand-hauled gun in McGilvery's report belongs to Phillips' 5th Massachusetts, not Hart's battery."),
        S('h', 'other', "3 Jul: Hart stood in McGilvery's line; Hancock ordered him to open on the enemy's batteries and McGilvery ordered him to cease after a few rounds (the PDF's Hunt-Hancock conflict, G-13).", 'documented', 'supported', [
            C('OR1', 'R321', "until ordered by General Hancock to open on the enemy's batteries. I obeyed this order, but after firing a few rounds Major McGilvery ordered me to cease firing")]),
    ],
    stays_unsupported=["'On the Wheatfield Road' (no text places the battery on that road)",
                       "Knox pulling a gun off by hand (no source)",
                       "Exact minute of the first canister (no source clock: it lies between about 16:30 and about 17:45)"],
    conflicts=["Place: left of the Peach Orchard (Hart) vs in a peach orchard on the right and a little in front of the New Jersey battery (McGilvery)"],
    register=['terrain-1-EG-07'],
    blocked=[B('Wiki-15NY', None, "Wikipedia '15th New York Battery': the PDF prints no URL; Wikipedia is not an acceptable source for a documented tier. Nothing in this row now depends on it; the Knox statement stays unsupported until a non-lead source is read.")],
    consequence=["structures G-07: four 12-pdr Napoleons facing south in the Peach Orchard area; clocks 16:00 ordered, 16:30 placed (state book), canister at an unstated minute between 16:30 and about 17:45 (PDF 17:30 inside), retire about 17:45; position selector 'left of the orchard' (Hart) vs 'right and a little in front of the New Jersey battery' (McGilvery)",
                 "structures G-07: remove 'Wheatfield Road' and 'Knox pulled a gun off by hand' or mark them unsupported",
                 "kit US.ART.15th_NY: four light 12-pdr, 13 horses killed (report) / 25 killed or wounded (book); losses 3 killed, 5 wounded"],
    lookups=[L('OR Part 1', 'Wheatfield road', 0, "no hit"),
             L('library NY at Gettysburg', 'Knox', 6, "praise and wound only; no gun hauled by hand")],
    structures=['G-07'],
    changes=["G-07 partially_supported (unchanged verdict): clocks now documented in the New York book (4 p.m., 4:30 p.m.); 'Wheatfield Road' and Knox's gun stay unsupported"],
))

# ---------------------------------------------------------------------------------------------------------------- G-08
ROWS.append(R(
    'R13.G-08', 'confirmed', 'open_gaps',
    pdf_row="Huger's four batteries (Moody, Parker, Taylor, Rhett/Gilbert) of Alexander's battalion | Peach Orchard region, about 500 yd from the enemy | About 16:00 Jul 2 | No works described | Silenced Union guns in half an hour; 36 Confederate guns fired for 30 minutes at the Peach Orchard around 16:00 (Wikipedia) | documented | Alexander-OR; Wiki-D2",
    pdf_claim="Huger's four batteries (Moody, Parker, Taylor, Rhett/Gilbert) of Alexander's battalion stood in the Peach Orchard region about 500 yd from the enemy at about 16:00 on 2 Jul; no works; they silenced the Union guns in half an hour; 36 Confederate guns fired for 30 minutes at the Peach Orchard around 16:00.",
    corrected="Alexander's report names the four batteries (Moody, Parker, Taylor, Rhett under Lt Gilbert), Major Huger commanding all, placed about 4 p.m. in action against a heavy artillery and infantry force about 500 yd off in a peach orchard on the Emmitsburg pike; after a spirited half-hour engagement, assisted by Cabell's battalion, the guns were silenced (Pendleton: within an hour). Jordan's and Woolfolk's batteries came up as the infantry charged. The OR gives gun counts only for Taylor (four Napoleons) and, for Moody, four 24-pdr howitzers (Dearing, 3 Jul). Alexander's 1907 memoir gives the PDF's 36: 'about 3.45 P.M., 36 guns were in action against the Peach Orchard' = 18 of Cabell's battalion plus 18 of his own, with 8 of his guns held close behind and the Washington Artillery's 10 in reserve; ten guns of Henry's battalion were engaged across the Emmitsburg road. (The OR batteries of Cabell total 16, not 18: see G-09.) No works are described. A Mississippian detachment helped manoeuvre Moody's guns on very difficult ground; the battalion lost 139 men and 116 horses in the two days.",
    sub=[
        S('a', 'unit', "Units: Moody, Parker, Taylor and Rhett (Lt Gilbert) of Alexander's battalion, the whole commanded by Major Frank Huger, Alexander having been ordered to control also the other battalions of artillery on the field; Jordan's and Woolfolk's batteries (the two remaining) came up as the infantry charged.", 'documented', 'supported', [
            C('OR2', 'R464', "I placed four batteries (those of Captains [George V.J Moody, [W. W.] Parker, [0. TB.] Taylor, and [A. B.] Rhett, the latter commanded by Lieutenant [S. C.J Gilbert", note="OCR 'V.J', '0. TB.', 'S. C.J' for the bracketed initials"),
            C('OR2', 'R464', "and the whole commanded by Ma j. Frank Huger, I having been ordered to control also the other battalions of artillery on the field", note="OCR 'Ma j.' for 'Maj.'"),
            C('OR2', 'R464', "I had ordered up my two remaining batteries, [T. C.l Jordan's and [P.] Woolfolk", note="OCR 'C.l' for 'C.]'"),
            C('OR2', 'R464', "These, arriving on the ground just as the infantry charge was made")]),
        S('b', 'place', "Place: about 500 yd from a heavy force, in a peach orchard on the Emmitsburg pike; Pendleton: fronting the peach orchard near the Emmitsburg road.", 'documented', 'supported', [
            C('OR2', 'R464', "about 500 yards distant, in a peach orchard on the Emmitsburg pike"),
            C('OR2', 'R428', "Alexander's battalion moved into position, fronting the peach orchard near the Emmitsburg road, and opened with vigor, as did the battalions to its right")]),
        S('c', 'hour', "Hour and duration: about 4 p.m.; a spirited half-hour engagement (Alexander); within an hour (Pendleton); about 3:45 p.m. for the memoir's 36 guns.", 'documented', 'conflict', [
            C('OR2', 'R464', "After a spirited engagement of a half hour, assisted by Cabell's battalion from a short distance on our right, the enemy's guns were silenced"),
            C('OR2', 'R428', "Within an hour, however, his guns were silenced and his position was carried"),
            C('OR2', 'R465', "About 4 p.m. I was ordered into position within 500 yards of the enemy's batteries"),
            C('LIB', 'ALEXANDER-1907', "After this cannonade had continued for perhaps 30 minutes, Hood received the order to advance", page='395'),
            C('LIB', 'ALEXANDER-1907', "Thus, about 3.45 P.M., 36 guns were in action against the Peach Orchard", page='395')]),
        S('d', 'count', "Guns: the OR gives Taylor's four Napoleons and (3 Jul) Moody's four 24-pdr howitzers; no OR text gives Parker's or Rhett's count. Alexander's memoir (1907): 18 guns of his battalion in front of Barksdale (plus 8 held close), 18 of Cabell's, 36 against the Peach Orchard at about 3:45 p.m.; 10 of Henry's across the Emmitsburg road; the Washington Artillery's 10 in reserve.", 'documented', 'conflict', [
            C('OR2', 'R465', "I opened upon the batteries with my four Napoleons, firing canister and spherical case"),
            C('OR2', 'R442', "Captain Moody's four 24-pounder howitzers"),
            C('LIB', 'ALEXANDER-1907', "was engaged with 18 guns; and in front of Barksdale were 18 of my own battalion", page='395'),
            C('LIB', 'ALEXANDER-1907', "Ten guns, also of Henry's battalion, were engaged across the Emmitsburg road", page='395'),
            C('LIB', 'ALEXANDER-1907', "The remaining 8 guns of my own battalion were held close by, to follow the infantry promptly in any advance", page='395'),
            C('LIB', 'ALEXANDER-1907', "Thus, about 3.45 P.M., 36 guns were in action against the Peach Orchard, and the enemy's adjacent lines and 10 guns against the enemy's left", page='395')],
          note="The PDF's 36 comes from Alexander's memoir, not the OR (the shard of 2026-11-04 had called it a Wikipedia figure). The per-battery counts of the four batteries are not in the OR."),
        S('e', 'state_at_start', "Works: none described; Alexander mentions only the ground ('very difficult ground') at Moody's guns; recorded as open ground.", 'inferred', 'partial', [
            C('OR2', 'R464', "There were also 2 killed and 3 wounded of a detachment of 8 gallant Mississippians at Captain Moody's guns, who volunteered to help maneuver them on very difficult ground")]),
        S('f', 'damage', "Loss: 19 killed, 114 wounded, 6 missing (139 men) and 116 horses killed and disabled in the two days; Huger's batteries' loss in animals was serious.", 'documented', 'supported', [
            C('OR2', 'R464', "killed, 19 ; wounded, 114 ; missing. 6 ; total. 139 men"),
            C('OR2', 'R464', "Horses killed and disabled in action, 116"),
            C('OR2', 'R464', "Major Huger also followed with the four batteries under his control as soon as the teams could be disencumbered of killed and wounded animals (for his loss had been serious)")]),
    ],
    stays_unsupported=["Guns per battery for Moody, Parker and Rhett (OR); the 36 total rests on a retrospective memoir",
                       "Which Union guns were silenced in the half hour (the report says 'the enemy's guns')"],
    conflicts=["Duration: half an hour (Alexander) vs within an hour (Pendleton)",
               "Cabell's guns: 18 (Alexander 1907) vs 16 (sum of the four battery reports, G-09)"],
    register=['terrain-1-EG-08'],
    blocked=[B('Wiki-D2', None, "Wikipedia 'Battle of Gettysburg, second day': the PDF prints no URL; Wikipedia is not an acceptable source. The 36-gun figure it repeats is now found in Alexander (1907), a non-lead source.")],
    consequence=["structures G-08: no works; four batteries named with Huger commanding; the 36-gun total (18 + 18, Alexander 1907) as a selectable count with the OR per-battery gaps marked; Taylor four Napoleons, Moody four 24-pdr howitzers (3 Jul note)",
                 "structures G-08: duration selector 30 minutes (Alexander) / within an hour (Pendleton)",
                 "kit CS.ART.* Alexander's battalion: 26 guns in six batteries is the memoir's implied total (18 + 8); the OR is silent: mark the per-battery counts as gap"],
    lookups=[L('OR Part 2', 'Alexander, Huger, Moody, Parker, Taylor, Rhett', 10, "report and battery reports read; per-battery counts only for Taylor and Moody"),
             L('library', 'Alexander 1907 guns Peach Orchard', 3, "36 guns at about 3:45 p.m.: 18 + 18; 10 of Henry's; Washington Artillery's 10")],
    structures=['G-08'],
    changes=["G-08 partially_supported -> confirmed: the 36-gun figure traces to Alexander's 1907 memoir, which is a participant source; the OR per-battery counts remain a gap"],
))
