"""Row specs R13.G-01 and R13.G-02 (terrain-1 close-out, 2026-11-13)."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- G-01
ROWS.append(R(
    'R13.G-01', 'corrected', 'open_gaps',
    pdf_row="Calef, Battery A, 2nd US (six 3-inch rifles) | McPherson Ridge | Night of June 30 in a hollow; right and center sections about 600 yd forward on morning of Jul 1; fired first Union gun; relieved about 10:00 by Hall's 2nd Maine | Improvised field position | Left section pulled back because woods came within 200 yd; the 'first shot' marker location is unverified | documented | CWT-Calef; SS-7820",
    pdf_claim="Calef's Battery A, 2nd US (six 3-inch) spent the night of 30 Jun in a hollow; the right and centre sections went about 600 yd forward on the morning of 1 Jul; it fired the first Union gun; Hall's 2nd Maine relieved it about 10:00; improvised field position; the LEFT section was pulled back because the woods came within 200 yd.",
    corrected="Calef's battery had six 3-inch guns (Hunt). On 30 Jun it went into position 'just outside of town' on what Calef calls the Carlisle road; no source read says 'hollow'. About 8 a.m. on 1 Jul Gamble asked Calef to choose a position; he chose one about 600 yd in front of the night position, a pioneer party levelled the intervening fences and the fence in front of it, and Calef moved forward (the report speaks of the battery moving, not of two sections). Buford then had one section placed immediately left of the road (Newman, left section) and one still farther left (Pergel, centre section); Roder's right section fired 'the first gun' on a column of cavalry on the right of the road (Calef's own claim; the NPS handbook repeats it). The section withdrawn because the enemy's woods came within 200 yd of its right was Pergel's CENTRE section, not the left. Hall's 2nd Maine took the first position vacated by Roder's section (NPS: about 10:00; Hunt: ordered in about 10:15; Hall: first fire 10:45); after about half an hour it was disabled and Wadsworth ordered Calef's left and centre sections up again. Calef could serve five guns on 2 Jul. No work of any kind is named: improvised (inferred from a detailed report's silence). The 'First Shot' marker is the Wisler Farm marker for the purported first shot of the battle, not a marker of Calef's gun.",
    sub=[
        S('a', 'unit', "Unit and guns: Battery A, 2nd US Artillery (Lt John H. Calef), six 3-inch.", 'documented', 'supported', [
            C('OR1', 'R028', "Calef's horse battery (A, Second United States, six 3-inch)"),
            C('OR1', 'R374', "Colonel Gamble, commanding the brigade of cavalry to which my battery was attached")]),
        S('b', 'count', "Guns serving on the morning of 2 Jul: five (short of men).", 'documented', 'supported', [
            C('OR1', 'R374', "On the morning of the 2d, the attack commenced directly in front of where my battery was parked"),
            C('OR1', 'R374', "For want of men, I could serve but five guns")]),
        S('c', 'place', "Night of 30 Jun: 'just outside of town' on the road Calef calls the Carlisle road. The PDF's 'in a hollow' is in no source read.", 'documented', 'partial', [
            C('OR1', 'R374', "June 30.— Marched through Emmitsburg, Md., to Gettysburg, Pa. , and went into position, just outside of town"),
            C('OR1', 'R374', "Our position on Carlisle road")],
          note="'hollow' searched in OR Part 1 (48 hits, none about Calef or his night position) and in the NPS First Day texts: not found. Blocked pages that may carry the PDF's wording are listed under blocked_host."),
        S('d', 'hour', "Alarm and forward move on the morning of 1 Jul: about 8 a.m.; Gamble requested Calef to select his own position; the new position was about 600 yd in front of the night position.", 'documented', 'supported', [
            C('OR1', 'R374', "Enemy reported to be advancing in heavy columns on Carlisle pike, and preparations were immediately made to receive them. This was about 8 a. m."),
            C('OR1', 'R374', "Colonel Gamble, commanding the brigade of cavalry to which my battery was attached, requested me to select my own position"),
            C('OR1', 'R374', "I accordingly selected a position about 600 yards in front of the one held during the night")]),
        S('e', 'movement', "Fence state: a pioneer party levelled the intervening fences and the fence in front of the new position before Calef moved forward (the report says 'I moved forward', not that only the right and centre sections did).", 'documented', 'supported', [
            C('OR1', 'R374', "As soon as the pioneer party had leveled the intervening fences, as well as the one in front of my position, I moved forward and took up the advanced position")]),
        S('f', 'place', "Sections: Newman's left section immediately left of the road, Pergel's centre section still farther left; Roder's right section on the right of the road. NPS: four guns straddled the pike, two more were about 700 yd away south of Herbst Woods.", 'documented', 'supported', [
            C('OR1', 'R374', "I accordingly placed First Sergeant Newman, commanding left section, on immediate left of road, and Sergeant Pergel, commanding center section, still farther to the left"),
            C('NPS', 'NPS-HARMON-FARM', "Four guns of Calef’s Battery A, 2d U.S. Artillery, were straddling the pike on a ridge east of Willoughby’s Run and northwest of the Edward McPherson farm buildings. Two more guns of this battery had been posted south of Herbst Woods, almost 700 yards away from the other four")],
          note="The NPS Harmon Farm report (secondary) puts four guns on the pike and two south of Herbst Woods; Calef puts one section on each side of the road and the centre section 'still farther to the left'. The two readings agree on the farthest section only."),
        S('g', 'movement', "First Union gun: Lt Roder's right section fired 'the first gun' on a column of rebel cavalry advancing on the right of the road (Calef's own claim); the NPS handbooks and the NPS Cultural Landscape Report repeat that Calef's battery fired the first Union shot; the OR has no second witness for the claim.", 'documented', 'supported', [
            C('OR1', 'R374', "Lieutenant Roder now fired the first gun (which opened the sanguinary battle of Gettysburg) on the head of a column of rebel cavalry advancing on the right of the road"),
            C('NPS', 'NPS-HB9-1954', "Calef's battery, one of whose guns had fired the first shot at Gettysburg, was replaced by Hall's Maine artillery"),
            C('NPS', 'NPS-HB9-1962', "Calef's battery, one of whose guns had fired the first Union cannon shot at Gettysburg, was replaced by Hall's Maine artillery"),
            C('NPS', 'NPS-CLR-1STDAY~raw', "Pegram’s Battalion purportedly fired the first Confederate artillery from just west of Herr’s Tavern, while Calef’s Battery fired the first Union artillery under direction of General John Buford")],
          note="'purportedly' is the NPS word for the Confederate first shot; for Calef the NPS handbook says 'one of whose guns had fired the first shot'."),
        S('h', 'movement', "Section withdrawn because the enemy-held woods came within 200 yd of its right: Sergeant Pergel's CENTRE section (not the left section as the PDF says). The left section (Newman) drew off a piece after four horses were killed.", 'documented', 'contradicted', [
            C('OR1', 'R374', "Having but a small cavalry support, and the woods occupied by the enemy extending up within 200 yards of the right of the section, I thought it unadvisable to wait till they arrived within canister range, and therefore withdrew the section"),
            C('OR1', 'R374', "Sergeant Newman having four horses killed and disabled at his left piece")]),
        S('i', 'hour', "Relief by Hall's 2nd Maine (six 3-inch): Hall took the first position on the right of the road after Roder's section withdrew. Clocks: NPS about 10:00; Hunt: Hall ordered into action about 10:15; Hall's own report (in Wainwright): first fire 10:45.", 'documented', 'conflict', [
            C('OR1', 'R374', "occupied the first position on the right of the road held by Lieutenant Roder's section after the latter had withdrawn"),
            C('OR1', 'R028', "About 10. 15 a. m. Hall's battery (Second Maine, six 3-inch) was ordered into action by General Reynolds"),
            C('OR1', 'R071', "We opened upon this battery with shot and shell at 10.45 a. m."),
            C('NPS', 'NPS-HB9-1954', "At 10 o'clock timely aid arrived as troops from Gen. John F. Reynolds' First Infantry corps began streaming over Seminary Ridge from the south and relieved Buford's exhausted fighters"),
            C('NPS', 'NPS-CLR-1STDAY~raw', "Captain James Hall’s 2nd Maine Battery joined Tidball’s Brigade (Calef’s Battery) along Chambersburg Pike across from the McPherson farmstead")],
          note="The PDF's about 10:00 is the NPS clock; the OR clocks are 10:15 (order) and 10:45 (first fire). All three stay selectable."),
        S('j', 'damage', "Hall's battery was disabled in about half an hour; Calef's left and centre sections were ordered up again by Wadsworth to the ground Hall had left; the battery lost 12 men badly wounded and 13 horses killed (OCR '1.3').", 'documented', 'supported', [
            C('OR1', 'R374', "In about haK an hour this battery was disabled"),
            C('OR1', 'R374', "The left and center sections of my battery were then ordered up again by General Wadsworth to reoccupy the ground just abandoned by Captain Hall"),
            C('OR1', 'R374', "the battery lost 12 men badly wounded and 1.3 horses killed", note="OCR '1.3' for 13; the PDF's horse table prints 13")]),
        S('k', 'state_at_start', "Prepared or improvised: no gun work is named; the guns stood in open ground after the fences were levelled (inference from a detailed report that mentions the fences but no earth). The piled-rail breastwork nearby was an infantry work of Gamble's brigade.", 'inferred', 'partial', [
            C('NPS', 'NPS-CLR-1STDAY~raw', "such as the right-angle work built by Gamble’s brigade near where Calef’s Battery was positioned")],
          note="Absence of evidence is recorded as inferred, not documented (Law cl.7)."),
        S('l', 'place', "'First shot' marker: the NPS First Shot marker stands at the Wisler Farm site on Chambersburg Road, just over a mile west of Herr's Ridge, for the purported first shot of the battle; it is not Calef's gun position. The ground position of Roder's first gun has no coordinate in any source read.", 'open_gap', 'partial', [
            C('NPS', 'NPS-CLI-1STDAY', "The battlefield landscape also includes the First Shot site, just over a mile west of the Herr’s Ridge, where the purported first shot of the battle occurred."),
            C('NPS', 'NPS-TPG-COMMEM', "The commission marked these with single cannons and shot pyramids of the type historically used at the position")],
          note="Calef's Battery tablet and gun were set by the park commission (ca. 1894-96) along Chambersburg Road; those markers are commemorative, not 1863 evidence."),
    ],
    stays_unsupported=["'Night of June 30 in a hollow' (no wording in the OR or the NPS texts read)",
                       "Which of the 8 a.m. reports named the first target and the coordinate of the first gun (no map point)",
                       "Time of the actual relief: three clocks (about 10:00, 10:15, 10:45)"],
    conflicts=["Relief clock: about 10:00 (NPS) vs 10:15 (Hunt) vs 10:45 (Hall)",
               "Section withdrawn at 200 yd: left (PDF) vs centre (Calef)",
               "Sections forward: 'right and centre' (PDF) vs 'I moved forward' (Calef; the report does not restrict the move to two sections)"],
    register=['terrain-1-EG-01'],
    blocked=[B('SS-7820 / CWT-Calef', None, "PDF keys 'SS-7820' (Stone Sentinels, Calef) and 'CWT-Calef' (CivilWarTalk, Calef at Gettysburg, a forum): URLs are not printed in the PDF's source list for these keys (the PDF prints https://gettysburg.stonesentinels.com/?p=203 only for the farms page); gettysburg.stonesentinels.com was refused here (HTTP 403, fence-2 probe 2026-11-13) and a forum is not an acceptable source. Read at the Stone Sentinels Calef page whether it says 'hollow' and which sections moved 600 yd.")],
    consequence=["structures G-01: keep emplacement_class improvised; set the Jul 1 forward move to Calef's battery (the report does not say two sections) about 08:00-09:00; fence lines between the night position and the new position and the fence in front of it are levelled by a pioneer party before the move (fence state change, window 08:00-09:00 Jul 1)",
                 "structures G-01: replace 'left section pulled back' by 'centre section (Pergel) pulled back'; section layout right (Roder) on the road's right, left (Newman) immediately left, centre (Pergel) farthest left (NPS: about 700 yd from the other four)",
                 "structures G-01: Hall relief window 10:00-10:45 with the three clocks selectable; Calef returns with left and centre sections after about half an hour",
                 "kit US.ART.2nd_US_A: six 3-inch confirmed; five serviceable guns on 2 Jul; 13 horses killed on 1 Jul (PDF horse table agrees)"],
    lookups=[L('OR Part 1', 'first (gun|shot)|opened the (fight|battle)|opening (gun|shot)', 8, "only Calef's claim; no second OR witness and no contradiction"),
             L('OR Part 1', 'hollow', 48, "no hit about Calef or the night of 30 Jun"),
             L('NPS texts', 'First Shot|first shot', 14, "First Shot marker = Wisler Farm site for the purported first shot of the battle, not Calef's gun")],
    structures=['G-01', 'E-01'],
    changes=["G-01 verdict partially_supported -> corrected: the PDF's 'left section' is the centre section, the forward move is Calef's own ('I moved forward'), 'hollow' is unsupported, the 10:00 relief is an NPS clock (OR 10:15 / 10:45)",
             "first-shot marker wording refined (Wisler Farm marker is for the cavalry's purported first shot)"],
))

# ---------------------------------------------------------------------------------------------------------------- G-02
ROWS.append(R(
    'R13.G-02', 'corrected', 'open_gaps',
    pdf_row="I Corps batteries (Wainwright, 20-22 guns; four batteries) | Seminary Ridge, behind the E-01 rail barricade | Jul 1 afternoon to about 16:30 | Improvised (guns behind hasty rail works) | Artillery withdrew down Chambersburg Street after the line collapsed | documented | Wiki-D1; HN-Pender",
    pdf_claim="I Corps batteries under Wainwright (20-22 guns in four batteries) stood on Seminary Ridge behind the E-01 rail barricade from the afternoon of 1 Jul to about 16:30, improvised behind hasty rail works, and withdrew down Chambersburg Street after the line collapsed.",
    corrected="On the Seminary line Hunt counts sixteen guns concentrated (Cooper's four 3-inch, Stevens' six 12-pdr, Reynolds' L/1st NY six 3-inch) plus Stewart's six 12-pdr = 22 in four batteries; Wainwright counts twelve concentrated (Cooper 4 + Stevens 6 + Wilber's 2) 'hardly 5 yards apart'. The guns did not stand behind the rail barricade: Wainwright put Breck's sections behind 'a strong stone wall on the seminary crest', Cooper stood in front of the professor's house, Stevens on Cooper's right, Stewart half between the Cashtown pike and the railroad and half across the railroad in the corner of a wood; the loose-rail breastwork was an infantry work some 40 yd down the slope in front of a battery (Robinson). There is no gun pit or earth. Clocks: Cooper was first placed about noon, the 5th Maine was in position at the seminary a few minutes past 2 p.m.; the retreat began when the infantry fell back (Hunt: about 4 p.m. for the troops; Cooper: about 5 p.m. when the battery retired through Gettysburg). They moved off down the Cashtown pike at a walk, then a trot, through the town (the OR does not name Chambersburg Street) to Cemetery Hill; Wilber's last gun was lost. Losses 83 men and about 80 horses (Hunt, Wainwright).",
    sub=[
        S('a', 'guns', "Guns and batteries on the line: Cooper B/1st Pa. four 3-inch, Stevens 5th Maine six 12-pdr, Reynolds L/1st NY six 3-inch (Breck's two sections + Wilber's section), Stewart B/4th US six 12-pdr = 22 in four batteries (Hunt); Wainwright counts twelve concentrated.", 'documented', 'conflict', [
            C('OR1', 'R028', "thus concentrating sixteen guns"),
            C('OR1', 'R028', "Stewart's battery (B, Fourth United States, six 12-pounders) was also on the same line"),
            C('OR1', 'R071', "thus concentrating twelve guns in so small a space that they were hardly 5 yards apart"),
            C('OR1', 'R028', "Stevens (Fifth Maine, six 12- pounders) was soon after posted by General Doubleday on Cooper's right"),
            C('OR1', 'R028', "(L, First New York, six 3-inch; Fifth Maine, six 12-pounders, and Cooper's, B, First Pennsylvania, four 3-inch) to the same position, thus concentrating sixteen guns")],
          note="Hunt's 16 + Stewart's 6 = 22; the PDF's 20-22 is inside the Hunt reading; Wainwright's 12 excludes Breck's two sections behind the wall and Stewart."),
        S('b', 'place', "Position: Cooper in front of the professor's house on the seminary ridge, Stevens on his right, Breck's two sections behind a stone wall on the seminary crest near Stevens, Stewart half between the Cashtown pike and the railroad and half across the railroad in the corner of a wood; the batteries stood behind the seminary crest, the loose-rail breastwork (E-01) was an infantry work 40 yd in front of a battery.", 'documented', 'contradicted', [
            C('OR1', 'R028', "to a strong stone wall on the seminary crest, near Stevens' position"),
            C('OR1', 'R071', "directed Captain Cooper to take a good position in front of the professor's house on this ridge"),
            C('OR1', 'R071', "Lieutenant Stewart's battery was also in position on the same line, half the battery between the Cashtown pike and the railroad, the other half across the railroad in the corner of a wood"),
            C('OR1', 'R036', "Down the slope, some 40 yards in front of this battery, I found a slight breastwork of loose rails")],
          note="The PDF's 'behind the E-01 rail barricade' is read as 'behind the infantry's loose-rail work'; the OR puts the work down the slope in front of the guns, and Breck's guns behind a stone wall, a pre-existing feature (no construction animation)."),
        S('c', 'hour', "Arrival: Cooper placed about noon on the left of the Third Division, then moved near the seminary where he stood unengaged for a few minutes; Stewart posted about 200 yd south of the seminary; the 5th Maine in position on the left of the seminary at a few minutes past 2 p.m.; Breck's sections moved to the stone wall when the enemy was within about 200 yd.", 'documented', 'supported', [
            C('OR1', 'R075', "Here it was placed in position by Colonel Wainwright, about 12 m., on the left of the Third Division, First Army Corps"),
            C('OR1', 'R075', "the colonel ordered the battery to be placed in position near the Gettysburg Seminary"),
            C('OR1', 'R075', "unengaged for a few minutes"),
            C('OR1', 'R073', "At a few minutes past 2, July 1, the battery being in position on"),
            C('OR1', 'R071', "which had previously been posted some 200 yards south of the seminary, but not engaged"),
            C('OR1', 'R071', "I withdrew Lieutenant Breck's two sections when their first line was within about 200 yards, and ordered him behind a strong stone wall on the seminary crest")]),
        S('d', 'hour', "End of the position: Hunt has the troops withdrawn to Cemetery Hill about 4 p.m. (First Corps about the same time); Cooper's battery retired through Gettysburg 'at about 5 p. m.'; Wiedrich says the infantry were repulsed about 5 p.m. The PDF's about 16:30 lies between.", 'documented', 'conflict', [
            C('OR1', 'R028', "About 4 p. m. the troops were withdrawn to Cemetery Hill"),
            C('OR1', 'R028', "The First Corps was withdrawn about the same time as the Eleventh."),
            C('OR1', 'R075', "At about 5 p. m., all infantry support having been driven back, the battery was compelled to retire through Gettysburg to Cemetery Hill"),
            C('OR1', 'R265', "When, about 5 p. m., our infantry, which had advanced through the town, was repulsed")],
          note="Compare the delegated default of C-043 (16:00 inside the documented window 15:45-17:00)."),
        S('e', 'movement', "Withdrawal route: the batteries limbered to the rear and moved off down the Cashtown pike at a walk until the infantry had left it, then at a trot, and passed through the town to Cemetery Hill. The OR does not name Chambersburg Street.", 'documented', 'partial', [
            C('OR1', 'R071', "All the batteries were at once limbered to the rear, and moved at a walk doWn the Cashtown pike until the infantry had all left it and passed under cover of the railroad embankment"),
            C('OR1', 'R071', "The batteries passed immediately through the town along with the other troops"),
            C('OR1', 'R028', "the batteries were all limbered to the rear, and moved off down the Cashtown pike, maintaining a walk until the infantry had left it")],
          note="'Chambersburg Street' is the PDF's name for the pike inside the town; no OR text uses it."),
        S('f', 'damage', "Losses on 1 Jul: 83 officers and men and about 80 horses, a large proportion of the horses between the Seminary Ridge and the town (Hunt; Wainwright); Wilber's last piece (L/1st NY) lost after one wheel-horse and then three others were shot; of Stewart's battery three caisson bodies broken down, one caisson exploded and two guns disabled by the breaking of their pointing rings; three of Hall's guns dismounted (Hunt).", 'documented', 'supported', [
            C('OR1', 'R071', "The loss of the batteries during the day's engagement was heavy, amounting in all to 83 officers and men and about 80 horses"),
            C('OR1', 'R028', "and about 80 horses, a large proportion of the latter between the Seminary"),
            C('OR1', 'R028', "last piece (L, First New York, six 3-inch) had 1 of its wheel-horses shot, and, by the time this could be disengaged, 3 others were shot"),
            C('OR1', 'R028', "It was impossible to move the piece off, and it was lost."),
            C('OR1', 'R028', "Three of the caisson bodies of Stewart's battery were broken down, 1 of his caissons exploded, 2 of his guns had been disabled by the breaking of their pointing rings, and 3 of Hall's guns dismounted")]),
        S('g', 'state_at_start', "Prepared or improvised: improvised; no gun pit, epaulement or earth is named at the seminary line; the loose rails were an infantry work; the stone wall behind Breck's guns pre-existed.", 'inferred', 'partial', [
            C('OR1', 'R071', "ordered him behind a strong stone wall on the seminary crest"),
            C('OR1', 'R036', "a slight breastwork of loose rails")],
          note="Silence about gun works is recorded as inferred."),
    ],
    stays_unsupported=["Exact withdrawal instant (4:00, 4:30 and 5:00 p.m. are all in the record)",
                       "Any gun work of earth at the Seminary line (none named)",
                       "The street name 'Chambersburg Street' for the route in the town"],
    conflicts=["Guns on the line: 22 (Hunt) vs 12 (Wainwright) vs 20 (PDF)",
               "Withdrawal clock: about 16:00 (Hunt) vs about 17:00 (Cooper, Wiedrich) vs 16:30 (PDF)"],
    register=['terrain-1-EG-02'],
    blocked=[B('Wiki-D1 / HN-Pender', None, "Wikipedia 'Battle of Gettysburg, first day' and HistoryNet 'Dorsey Pender's July 1 attack': the PDF prints no URL for these keys in its source list; historynet.com was refused here (fence-1 probe); Wikipedia is not an acceptable source for a 'documented' tier. Nothing in this row now depends on them.", status='blocked_host')],
    consequence=["structures G-02: guns are on the seminary crest behind a pre-existing stone wall (Breck) and in the open (Cooper, Stevens, Stewart), NOT behind the E-01 loose-rail work; the rail work is 40 yd down the slope in front of a battery",
                 "structures G-02: gun count selector 22 (Hunt) / 12 (Wainwright) / PDF 20-22; four batteries Cooper 4, Stevens 6, Reynolds 6 (Breck 4 + Wilber 2), Stewart 6",
                 "structures G-02: withdrawal window 16:00-17:00 on 1 Jul with the three clocks selectable; route Cashtown pike then through the town to Cemetery Hill; Wilber's last piece abandoned; 83 casualties and about 80 horses",
                 "kit US.ART.5th_Maine_E (six 12-pdr), 4th_US_B (six 12-pdr), 2nd_Maine_B (six 3-inch) and L/1st NY (six 3-inch) are 'gap' in the kit file but the OR gives the guns"],
    lookups=[L('OR Part 1', 'withdrawal time of the I Corps batteries', 6, "Hunt about 4 p.m., Cooper about 5 p.m., Wiedrich about 5 p.m.; no 16:30 statement")],
    structures=['G-02', 'E-01'],
    changes=["G-02 verdict partially_supported -> corrected: guns were NOT behind the rail barricade; withdrawal clock is 16:00-17:00 not 16:30; gun count 22 (Hunt) is a sum of per-battery OR figures"],
))
