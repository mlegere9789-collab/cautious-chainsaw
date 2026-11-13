"""Row specs R13.G-13 to R13.G-16 and R13.0000 (terrain-1 close-out, 2026-11-13)."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- G-13
ROWS.append(R(
    'R13.G-13', 'partially_supported', 'open_gaps',
    pdf_row="Union ridge line Jul 3 (Hunt) | Cemetery Hill to Little Round Top | By 13:00 Jul 3 | Mixed; prepared batteries on the ridge | About 80 (Wikipedia) to as many as 120 (ABT) guns for counterbattery; 34 Union cannon disabled in the bombardment; Hunt's slowdown and Hancock's countermand carried as a conflict | documented, with count range | Wiki-PC; ABT-Art; Wiki-CR",
    pdf_claim="The Union ridge line on 3 Jul (Hunt), Cemetery Hill to Little Round Top, in position by 13:00; mixed, with prepared batteries on the ridge; about 80 (Wikipedia) to as many as 120 (ABT) guns for counterbattery; 34 Union cannon disabled in the bombardment; Hunt's slowdown and Hancock's countermand carried as a conflict.",
    corrected="Counts from the record: Hunt's report has 75 guns on the western crest line (aided by a few on Cemetery Hill) and 'not more than eighty' that he could bring to reply effectively; in Battles and Leaders he has 77 guns on the Second Corps line 'to oppose nearly 150'; Tyler counts the Artillery Reserve's 108 guns on the field all in position; Alexander's 1907 memoir counts 166 Federal guns at the start of the cannonade and 220 engaged after 10 batteries came up from the reserves, against 172 on the Confederate side. The PDF's 'as many as 120 (ABT)' and '34 disabled' are in no source read. Clocks: the Confederate fire opened about 1 p.m. (Hunt, Hancock; McGilvery 12.30; Tyler about 12; Longstreet puts the signal about 2 p.m.), Hunt had the fire gradually stopped about 2.30 p.m. when ammunition ran low. Hunt's cease-fire and a Hancock order to the contrary are both documented from participants: Hunt rode along the ridge 'ordering the fire to cease' and wrote that Hazard's batteries had exhausted their long-range projectiles 'under the orders of their corps commander'; Hart records that Hancock ordered him to open on the enemy's batteries and McGilvery ordered him to cease after a few rounds. Works: McGilvery's line had a slight earthwork (G-11b), Cemetery Hill had per-gun earthworks (G-03), Tyler found 'some shelter' thrown up for the artillery along the crest; no works are documented for Cushing's and the other Second Corps batteries (G-12).",
    sub=[
        S('a', 'count', "Union guns on the line: 75 on the western crest line and not more than eighty able to reply (Hunt, OR); 77 on the Second Corps line (Hunt, B&L); 108 guns of the Artillery Reserve all in position (Tyler); 166 at the start and 220 engaged (Alexander, 1907).", 'documented', 'conflict', [
            C('OR1', 'R028', "We had thus on the western crest line seventy-five guns"),
            C('OR1', 'R028', "To oppose these we could not, from our restricted position, bring more than eighty to reply effectively"),
            C('OR1', 'R315', "The one hundred and eight guns which were on the field were all in position"),
            C('LIB', 'BL-3', "so that on the Second Corps line, within the space of a mile, were 77 guns to oppose nearly 150", page='371', note="Henry J. Hunt, 'The Third Day at Gettysburg' (byline in the text layer)"),
            C('LIB', 'ALEXANDER-1907', "The Federal gun's in position on their lines at the commencement of the cannonade were 166, and during it 10 batteries were brought up from their reserves, raising the number engaged to 220 against 172 used upon our side during the same time", page='419', note="OCR \"gun's\" for guns")],
          note="The PDF's 'up to 120 (ABT)' is not found in any source read; Hunt's 100-120 is his estimate of the Confederate guns."),
        S('b', 'hour', "Opening clock: Hunt about 1 p.m.; Hancock about 1 o'clock apparently by a given signal; McGilvery about 12.30; Tyler about 12 o'clock; Longstreet has the signal about 2 p.m.; Hancock: the enemy's fire became less furious after an hour and forty-five minutes.", 'documented', 'conflict', [
            C('OR1', 'R028', "when the enemy opened, at about 1 p. m., along his whole right, a furious cannonade on the left of our line"),
            C('OR1', 'R076', "About 1 o'clock, apparently by a given signal, the enemy opened upon our Iff ont with tiie heaviest artillery fire I have ever known", note="OCR 'Iff ont', 'tiie'"),
            C('OR1', 'R318', "At about 12.30 o'clock the enemy opened a terrific fire upon our lines with at least one hundred and forty guns"),
            C('OR1', 'R315', "Everything was moderately quiet until about 12 o'clock, when, as I was returning with Captain Robertson from reconnoitering a position for artillery opposite our left, the enemy opened a terrific fire of artillery"),
            C('OR2', 'R430', "About 2 p. m. General Pickett, who had been charged with the duty of arranging the lines behind our batteries, reported that the troops were in order"),
            C('OR1', 'R076', "After an hour and forty-five minutes, the fire of the enemy became less furious")]),
        S('c', 'movement', "Hunt's slowdown: about 2.30 p.m., ammunition low and caissons exploding, Hunt directed the fire to be gradually stopped; in Battles and Leaders he rode along the ridge ordering the fire to cease.", 'documented', 'supported', [
            C('OR1', 'R028', "finding our ammunition running low and that it was very unsafe to bring up loads of it, a number of caissons and limbers having been exploded, I directed that the fire should be gradually stopped, which was done, and the enemy soon slackened his fire also"),
            C('LIB', 'BL-3', "I rode back along the ridge, orderiug the fire to cease.", page='374', note="Henry J. Hunt, 'The Third Day at Gettysburg'; OCR 'orderiug'")]),
        S('d', 'movement', "Hancock's countermand: Hart (15th NY) records that Hancock ordered him to open on the enemy's batteries and McGilvery ordered him to cease after a few rounds; Hunt wrote that Hazard's batteries had exhausted their long-range projectiles during the cannonade 'under the orders of their corps commander'. Neither Hancock's report nor Hunt's OR report mentions an order countermanding Hunt's.", 'documented', 'conflict', [
            C('OR1', 'R321', "until ordered by General Hancock to open on the enemy's batteries. I obeyed this order, but after firing a few rounds Major McGilvery ordered me to cease firing"),
            C('LIB', 'BL-3', "They had unfortunately exhausted their long range projectiles during the cannonade, under the orders of their corps commander, and it was too late to replace them.", page='375', note="Henry J. Hunt, 'The Third Day at Gettysburg'")],
          note="The PDF's 'Hancock's countermand' is therefore documented only as these two participant statements; the wording 'countermand' is the PDF's."),
        S('e', 'state_at_start', "State: mixed: McGilvery's line had a slight earthwork (G-11b); Cemetery Hill had per-gun works (G-03); Tyler found the infantry had made a slight breastwork along the crest and 'some shelter' for the artillery; no works are documented for Cushing's and the other Second Corps batteries.", 'documented', 'supported', [
            C('OR1', 'R315', "The infantry had constructed a slight breastwork of such materials a& the erround afforded along the entire crest of the hill, and some shelter Had been thrown up for the artillery", note="OCR 'a&' and 'erround'"),
            C('OR1', 'R318', "In front of these guns I had a slight earthwork thrown up, which proved sufficient to resist all the projectiles which struck it")]),
        S('f', 'damage', "'34 Union cannon disabled in the bombardment': not stated. Hunt reports a large destruction of materiel and many caissons and limbers exploded; Cushing's, Arnold's and Rorty's batteries were withdrawn, Brown's retired before the cannonade ceased; Hunt's three-day table: 320 guns, Union losses by arm.", 'open_gap', 'unsupported', [
            C('OR1', 'R076', "Brown's battery (B, First Rhode Island), which had suffered severely on the 2d, and expended all of its canister on that day, retired before the cannonading ceased, not being effective for further service")],
          note="'thirty-four' occurs in the OR only as 'six batteries of thirty-four guns' (Tyler, 2 Jul) and in unrelated places."),
    ],
    stays_unsupported=["'As many as 120' Union guns (ABT)",
                       "'34 Union cannon disabled' in the bombardment",
                       "The word 'countermand' for Hancock's order (Hart's and Hunt's statements are as quoted)"],
    conflicts=["Union guns: 75/80 (Hunt OR) vs 77 (Hunt B&L) vs 108 Reserve guns (Tyler) vs 166-220 (Alexander 1907)",
               "Cannonade opening: 12:00 (Tyler) / 12:30 (McGilvery) / 13:00 (Hunt, Hancock) / 14:00 (Longstreet)",
               "Cease-fire: Hunt's order vs Hancock's order to open (Hart; Hunt in B&L)"],
    register=['terrain-1-EG-13'],
    blocked=[B('Wiki-PC / ABT-Art / Wiki-CR', None, "Wikipedia 'Pickett's Charge' and 'Cemetery Ridge', and the American Battlefield Trust article on artillery placements on 3 Jul (ABT-ART): the PDF prints no URL for these keys; battlefields.org was not probed here; Wikipedia is not an acceptable source for a documented tier. Read the ABT article only for 'up to 120' and the '34 disabled' figure.")],
    consequence=["structures G-13 and S-061: Union line count selector 75 / 80 (Hunt OR), 77 (Hunt B&L), 108 Reserve guns on the field (Tyler); the PDF's 120 and 34-disabled marked unsupported",
                 "S-061 clocks: Confederate opening 12:30-14:00 selectable (13:00 Hunt and Hancock); Union slowdown about 14:30 (Hunt); the Hunt-versus-Hancock order dispute shown with its two participant sources (Hart, Hunt in B&L)",
                 "state: ridge line 'mixed': earthworks in G-03 and G-11b; 'some shelter' along the crest (Tyler); no works for the Second Corps batteries (G-12)"],
    lookups=[L('OR Parts 1-2', 'thirty-four', 6, "no Union cannon-disabled count"),
             L('library', "Hancock countermand / cease firing", 6, "Hunt in B&L (cease-fire, Hazard's batteries under their corps commander); no explicit 'countermand' text")],
    structures=['G-13', 'S-061'],
    changes=["G-13 partially_supported (unchanged verdict): the Hancock order is documented in Hart's report and Hunt's B&L article; the Union count range gains 77, 108 and 166-220 from three documented sources; 120 and 34 stay unsupported"],
))

# ---------------------------------------------------------------------------------------------------------------- G-14
ROWS.append(R(
    'R13.G-14', 'partially_supported', 'open_gaps',
    pdf_row="Confederate line Jul 3 | More than 2 miles from the Peach Orchard along the Emmitsburg Road | Placed from dawn Jul 3; fire from about 13:00 | Open positions | 138-179 estimates (see B.2.5 conflict register); reasoned range 142-155 | documented, with count range | Wiki-PC; SP-Guns",
    pdf_claim="The Confederate line on 3 Jul stretched more than 2 miles from the Peach Orchard along the Emmitsburg Road; guns placed from dawn, fire from about 13:00; open positions; 138-179 estimates; reasoned range 142-155.",
    corrected="Pendleton found much already done on the right at a very early hour; his count is 'nearly one hundred and fifty' guns opening at about 1 p.m. on the concerted signal and 'nearly sixty guns' of the First Corps' right wing 'in a sweeping curve of about a mile'; Hancock puts them at 115 to 150; McGilvery at least 140; Hunt 100-120 with 115 from a newspaper figure; Hunt's B&L text 'about one hundred and fifty'; the first-person B&L account of the assault's commander '150 Confederate cannon'. Alexander (1907): Longstreet's 83 guns (8 on the far right, 75 in an irregular line about 1,300 yd long from the Peach Orchard), the Third Corps' 60 guns on Seminary Ridge plus two Whitworths nearly a mile north (Poague's battalion: ten guns in position and six howitzers in rear), 20 rifles of Carter's plus four of Graham's of the Second Corps firing solid shot, 172 in all, with 80 of the 84 Second and Third Corps guns in one line and 56 idle; he does not give 179 in the memoir (the 179 of the PDF is in no source read). Eshleman's Washington Artillery had eight Napoleons and two howitzers. 'More than two miles' is the NPS description of the whole Confederate line on Seminary and Warfield Ridges, not of the guns from the Peach Orchard along the Emmitsburg Road; Alexander gives 1,300 yd for the First Corps guns. No works are described (open positions). The guns were placed 'from dawn' (Pendleton: a very early hour) and Alexander says he began revising the line about 9 a.m.",
    sub=[
        S('a', 'count', "Total: Pendleton nearly 150; Hancock 115-150; McGilvery at least 140; Hunt 100-120 (115 by a newspaper figure) and about 150; B&L 150; Alexander (1907) 172 used (Longstreet 83 [8 + 75] + Third Corps 60 + 2 Whitworths + Second Corps 24), 9 howitzers added.", 'documented', 'conflict', [
            C('OR2', 'R428', "our guns in position, nearly one hundred and fifty, opened fire along the entire line from right to left"),
            C('OR1', 'R076', "Their number is variously estimated at from one nundred and fifteen to one hundred and fifty", note="OCR 'nundred'"),
            C('OR1', 'R318', "At about 12.30 o'clock the enemy opened a terrific fire upon our lines with at least one hundred and forty guns"),
            C('OR1', 'R028', "making one hundred and fifteen in all"),
            C('LIB', 'BL-3', "Finally a powerful artillery force, about one hundred and fifty guns, was ordered to prepare the way for the assault by cannonade", page='370', note="Henry J. Hunt, 'The Third Day at Gettysburg'"),
            C('LIB', 'ALEXANDER-1907', "Of Longstreet's 83 guns, 8 were left on our extreme right to cover our flank, and the remaining 75 were posted in an irregular line about 1300 yards long, beginning in the Peach Orchard and ending near the northeast corner of the Spangler wood", page='418'),
            C('LIB', 'ALEXANDER-1907', "The Federal gun's in position on their lines at the commencement of the cannonade were 166, and during it 10 batteries were brought up from their reserves, raising the number engaged to 220 against 172 used upon our side during the same time", page='419', note="OCR \"gun's\"; the 172 is Alexander's Confederate count")],
          note="The PDF's range ends at 179 (Alexander): the memoir read gives 172 used; 179 is not found (searched the library). The 142-155 'reasoned range' is StrategyPage (blocked) and stays a PDF inference."),
        S('b', 'count', "Parts of the line: First Corps right wing nearly sixty guns in a sweeping curve of about a mile (Pendleton); Eshleman's eight Napoleons and two howitzers; Alexander: Third Corps 60 guns plus two Whitworths, Second Corps 20 + 4 rifles firing solid shot, 56 of 84 Second and Third Corps guns idle.", 'documented', 'supported', [
            C('OR2', 'R428', "making nearly sixty guns for that wing, all well advanced in a sweeping curve of about a mile"),
            C('OR2', 'R466', "of eight Napoleon guns and two 13-pounder howitzers"),
            C('LIB', 'ALEXANDER-1907', "It comprised. 60 guns, extending on Seminary Ridge as far as the Hagerstown road, and two Whitworth rifles located nearly a mile farther north on the same ridge", page='419'),
            C('LIB', 'ALEXANDER-1907', "In this interval were located 20 rifle guns of the 2d corps under Col. Carter. Four more rifles of the same corps under Capt. Graham were located about one and a half miles northeast of Cemetery Hill", page='419'),
            C('OR2', 'R562', "Late in the evening of the 2d, by your order, I reported to Major- General Anderson for duty, and at last succeeded in getting ten of my guns into position"),
            C('OR2', 'R562', "The balance (six howitzers) were kept a short distance in rear, as no place could be found from which they could be used with advantage")]),
        S('c', 'length', "Length: Alexander's First Corps guns in an irregular line about 1,300 yd long from the Peach Orchard; Pendleton's right wing a curve of about a mile; the NPS says the Confederate line on Seminary and Warfield Ridges stretches over two miles south of Gettysburg. 'More than 2 miles from the Peach Orchard along the Emmitsburg Road' is not stated for the guns.", 'documented', 'partial', [
            C('LIB', 'ALEXANDER-1907', "Of Longstreet's 83 guns, 8 were left on our extreme right to cover our flank, and the remaining 75 were posted in an irregular line about 1300 yards long, beginning in the Peach Orchard and ending near the northeast corner of the Spangler wood", page='418'),
            C('NPS', 'NPSGOV-CONFED-LINE', "The wooded slopes of Seminary Ridge, extending to Warfield Ridge, stretch for over two miles south of Gettysburg and sit opposite from Cemetery Ridge.")]),
        S('d', 'hour', "Placement from dawn and opening about 13:00: Pendleton visited the lines at a very early hour and found much already done by Alexander; Alexander began revising the line about 9 a.m.; the fire opened about 1 p.m. (Pendleton, Hunt, Hancock; Longstreet about 2 p.m.).", 'documented', 'conflict', [
            C('OR2', 'R428', "Visiting the lines at a very early hour toward securing readiness for this great attempt, I found much (by Colonel Alexander's energy) already accomplished on the right"),
            C('LIB', 'ALEXANDER-1907', "about 9 A.M. I began to revise our line and post it for the cannonade", page='418'),
            C('OR2', 'R430', "About 2 p. m. General Pickett, who had been charged with the duty of arranging the lines behind our batteries, reported that the troops were in order")]),
        S('e', 'state_at_start', "Works in the OR: none described for the gun line (open positions); Pendleton calls the guns 'well advanced' and notes the enemy's, not the Confederate, earthworks.", 'inferred', 'partial', [
            C('OR2', 'R428', "making nearly sixty guns for that wing, all well advanced in a sweeping curve of about a mile")],
          note="Silence of the OR; but see f: the NPS records battle-origin lunettes on part of the line."),
        S('f', 'construction_window', "Works found in the NPS texts: Poague's Battalion lunettes (Third Corps, advanced to the right wing's line by 3 Jul per Pendleton) and Reilly's Section stone lunettes are battle-origin works rebuilt in 1903 and 1895; the NPS lists Poague's lunettes among the documented 1863 defenseworks. The date inside the battle, the builders and the profile are not given.", 'documented', 'partial', [
            C('NPS', 'NPS-CLI-PCB', "Documented defenseworks include McMillan Woods earthworks, McMillan Woods rifle pits, Pender's Division earthworks, Poague's Battalion lunettes, and Spangler Woods defense works."),
            C('NPS', 'NPS-CLR-ROT-V1', "East Cemetery Hill Lunettes (1878), Stevens Knoll Lunettes (1880–90), McGilvery’s Battalion Lunettes (1891), Poague’s Battalion Lunettes (1903), and Reilly’s Section Stone Lunettes (1895)."),
            C('NPS', 'NPS-TPG-COMMEM', "It also rebuilt others, including Reilly’s Section stone lunettes along South Confederate Avenue in 1895, and Poague’s Battalion lunettes along West Confederate Avenue in 1903."),
            C('OR2', 'R428', "Major Poague's battalion had been advanced to the line of the right wing, and was not far from its left"),
            C('OR2', 'R562', "Late in the evening of the 2d, by your order, I reported to Major- General Anderson for duty, and at last succeeded in getting ten of my guns into position"),
            C('OR2', 'R562', "About dusk on the evening of the 4th, the battalion moved in the direction of Hagerstown, Md.")],
          note="Poague's own report names no work; its bounds: the guns reached the position late in the evening of 2 Jul and the battalion left about dusk on 4 Jul, so any Poague lunette was built between those instants. 'Open positions' therefore holds for the OR's description only; the window of the Poague and Reilly works (1-4 Jul) is an open gap and must be marked, not assumed (Law cl.7)."),
    ],
    stays_unsupported=["Date inside the bounds 'late evening 2 Jul to dusk 4 Jul', builders and profile of the Poague's Battalion lunettes and Reilly's Section stone lunettes (NPS gives existence only)",
                       "Alexander's 179 (only 172 found)",
                       "'More than 2 miles from the Peach Orchard along the Emmitsburg Road' for the gun line",
                       "The reasoned range 142-155 (StrategyPage, blocked)"],
    conflicts=["Total: 115-150 (OR) vs 150 (B&L) vs 172 (Alexander 1907) vs 138-179 (PDF)",
               "Line length: 1,300 yd (Alexander) / a mile (Pendleton, right wing) / over two miles (NPS, whole infantry line)"],
    register=['terrain-1-EG-14'],
    blocked=[B('Wiki-PC / SP-Guns', None, "Wikipedia 'Pickett's Charge' and StrategyPage 'guns' (key SP-Guns): no URLs printed in the PDF for these keys; strategypage.com was not probed here. Read StrategyPage for the 138-179 and 142-155 figures and for Alexander's 179.")],
    consequence=["structures G-14 and S-061: Confederate count selector 115-150 (OR), 150 (B&L), 172 (Alexander 1907), 138-179 (PDF) with no default; first-corps gun curve about a mile / Alexander's 1,300 yd line from the Peach Orchard; Third Corps 60 + 2 Whitworths on Seminary Ridge; Second Corps 24 solid-shot guns; 56 idle guns",
                 "S-061 opening 13:00-14:00 and placement before 09:00-dawn on 3 Jul",
                 "remove 'more than 2 miles from the Peach Orchard along the Emmitsburg Road' or mark it PDF-only"],
    lookups=[L('library', '179 guns', 4, "only a Fredericksburg 1862 hit; no Gettysburg 179"),
             L('OR Part 2', 'Pendleton p.351-352', 3, "nearly 150; nearly sixty on the right wing; very early hour")],
    structures=['G-14', 'S-061'],
    changes=["G-14 conflict -> partially_supported: 172 (Alexander) and the Third/Second Corps breakdown are documented; 179 is not found; the NPS 'over two miles' describes the infantry line"],
))

# ---------------------------------------------------------------------------------------------------------------- G-15
ROWS.append(R(
    'R13.G-15', 'confirmed', 'open_gaps',
    pdf_row="Carter's rifles | Both sides of the railroad cut, Oak Hill region | Jul 3 | No works described | Ten rifled guns on high ground firing at Cemetery Hill; smoothbores behind the college | documented | Carter-OR",
    pdf_claim="Carter's rifles on both sides of the railroad cut, Oak Hill region, on 3 Jul; no works described; ten rifled guns on high ground firing at Cemetery Hill; smoothbores behind the college.",
    corrected="Carter's report confirms the row: on Friday 3 Jul ten rifled guns were posted on the high ridge on the right and left of the railroad cut and their fire directed on the batteries on Cemetery Hill, to divert fire from Hill's and Pickett's troops and from three batteries of the First Virginia Artillery under Dance temporarily under him; the battalion's smoothbores were held ready behind Gettysburg College and not needed; on 2 Jul the battalion was held ready but not engaged. The NPS Cultural Landscape Report puts those ten guns on either side of the cut and calls Oak Hill the Confederate line held by Carter's battalion. Alexander (1907) counts 20 rifles of Carter's with four of Graham's 1.5 miles northeast of Cemetery Hill, all ordered to fire solid shot because their fuses were unreliable (Brown: the batteries used solid shot for the same reason). The OR has no works for these guns. 'Oak Hill region' is the NPS name for the ground; Carter says 'the high ridge'.",
    sub=[
        S('a', 'guns', "Carter's battalion on 3 Jul: ten rifled guns on the high ridge on the right and left of the railroad cut firing at the batteries on Cemetery Hill; the smoothbores held ready behind Gettysburg College.", 'documented', 'supported', [
            C('OR2', 'R531', "On Friday, July 3, ten rifled guns were posted on the high ridge on the right and left of the railroad cut, and their fires directed on the batteries planted on the Cemetery Hill"),
            C('OR2', 'R531', "The smooth-bore guns of my battalion were held in readiness to move in rear of Gettysburg College, but were not needed")]),
        S('b', 'place', "Place: the NPS Cultural Landscape Report repeats the ten guns either side of the cut and says Oak Hill was on the Confederate lines held by Carter's battalion; Carter says 'the high ridge'.", 'documented', 'supported', [
            C('NPS', 'NPS-CLI-1STDAY', "replaced them with ten rifled guns from Carter’s battalion that were positioned to either side of the railroad cut"),
            C('NPS', 'NPS-CLR-1STDAY~raw', "Because Oak Hill was on the Confederate lines held by Carter’s Artillery Battalion")]),
        S('c', 'unit', "Attachments and purpose: three batteries of the First Virginia Artillery under Captain Dance were temporarily under Carter; the fire was meant to divert the enemy's guns from Hill's and Pickett's troops and from those batteries.", 'documented', 'supported', [
            C('OR2', 'R531', "These three batteries had been ordered to fire, in conjunction with a large number of guns on their right, on a salient part of the enemy's line prior to the charge of infantry"),
            C('OR2', 'R468', "the First Virginia Artillery and a portion of Carter's and [William] Nelson's battalions engaged the enemy's batteries")]),
        S('d', 'count', "Alexander (1907): 20 rifles of Carter's and four of Graham's, all firing solid shot because the fuses were unreliable; the OR says ten rifled guns; Brown says the batteries used solid shot because of defective shell.", 'documented', 'conflict', [
            C('LIB', 'ALEXANDER-1907', "In this interval were located 20 rifle guns of the 2d corps under Col. Carter. Four more rifles of the same corps under Capt. Graham were located about one and a half miles northeast of Cemetery Hill", page='419'),
            C('OR2', 'R468', "owing to the proximity of our infantry to the enemy, and the defective character of some of the shell, the batteries were compelled to use solid shot")]),
        S('e', 'state_at_start', "Works: none described; on 2 Jul the battalion was held ready and not engaged.", 'inferred', 'partial', [
            C('OR2', 'R531', "On Thursday, July 2, my battalion was held in readiness to move into position, but was not engaged")],
          note="Silence of the report."),
    ],
    stays_unsupported=["Which batteries (Carter's, Page's, Reese's, Fry's) formed the ten guns (not stated)",
                       "The 20 versus ten count"],
    conflicts=["Ten rifled guns (Carter) vs 20 rifles of Carter's (Alexander 1907)"],
    register=['terrain-1-EG-15'],
    blocked=[],
    consequence=["structures G-15: ten rifled guns both sides of the railroad cut on Oak Ridge / Oak Hill (Carter, NPS), smoothbores behind the college; count selector 10 (Carter) / 20 (Alexander); solid shot only",
                 "kit CS.ART.Carter battalion: guns per battery stay a gap; the three Dance batteries temporarily attached"],
    lookups=[L('NPS texts', "Carter's battalion Oak Hill", 8, "CLI/CLR First Day: ten rifled guns either side of the cut; Oak Hill held by Carter")],
    structures=['G-15'],
    changes=["G-15 supported -> confirmed (with an added count conflict): Alexander's 20 rifles is a second count; the NPS wording for 'Oak Hill region' found"],
))

# ---------------------------------------------------------------------------------------------------------------- G-16
ROWS.append(R(
    'R13.G-16', 'partially_supported', 'open_gaps',
    pdf_row="Hurt's guns (McIntosh's battalion) | Oak Hill/Oak Ridge: two Whitworths plus two 3-inch rifles per the Oak Hill marker | Jul 3 | No works described | One account says Whitworths on Oak Ridge fired the signal; NPS handbook says two guns near the Peach Orchard (Miller's battery) fired at about 13:00 | documented, with conflict | CWT-Whit; HN-Thunder; NPS-HB9",
    pdf_claim="Hurt's guns (McIntosh's battalion) on Oak Hill / Oak Ridge: two Whitworths plus two 3-inch rifles per the Oak Hill marker; 3 Jul; no works; one account has the Whitworths on Oak Ridge firing the signal, the NPS handbook has two guns near the Peach Orchard (Miller's battery) firing at about 13:00.",
    corrected="McIntosh: on 1 Jul a section of Hurt's Whitworths and Rice's Napoleons were first in position beside the turnpike and the Whitworths shelled the woods to the right of the town; the rest of Hurt's battery went with Johnson's to a hill near the Fairfield road; on 2 Jul the battalion stood behind a stone wall on the range of hills to the left of the town; on Friday morning the two Whitworths were moved by A. P. Hill's direction 'to a commanding point north of the railroad cut' to enfilade the enemy; they fired 133 rounds in the battle and one had an axle broken twice. The NPS Cultural Landscape Report says Hurt's (Hardaway Alabama) battery came into position on 3 Jul with two Whitworth guns, twelve-pounder British rifles, on the highest position on Oak Hill, marked in 1906; Alexander puts two Whitworth rifles nearly a mile north of the Third Corps line on Seminary Ridge; a Union officer reports being under fire of two Whitworth guns about two miles distant on 3 Jul. No source read gives two 3-inch rifles at the marker. The signal: the NPS handbook, Eshleman's report (Washington Artillery) and Furlong's report all have two guns fired in quick succession at about 1 p.m. (Eshleman: between 1 and 2 p.m., Miller's battery near the Peach Orchard; Alexander in B&L: two guns of the Washington Artillery); nothing in the OR or in McIntosh's report has the Whitworths firing the signal.",
    sub=[
        S('a', 'unit', "Unit: Capt. W. B. Hurt's (Hardaway Alabama Artillery) battery of McIntosh's battalion, Third Corps; a section of Whitworths with Rice's Napoleons on 1 Jul, the remaining section with Johnson's battery on a hill near the Fairfield road.", 'documented', 'supported', [
            C('OR2', 'R563', "a section of Whitworths were placed first in position a short distance to tlie right of the turnpike", note="OCR 'tlie'"),
            C('NPS', 'NPS-CLI-1STDAY', "Artillery Tablet Group – Hardaway’s Alabama Artillery – Hurt’s C.S. Battery.")]),
        S('b', 'place', "Place on 3 Jul: the two Whitworths were moved Friday morning by A. P. Hill's direction to a commanding point north of the railroad cut; the NPS: the position marked on Oak Hill, 'the highest position on Oak Hill' (the Hardaway Alabama Artillery marker, 1906); Alexander: two Whitworth rifles nearly a mile north of the Third Corps line on Seminary Ridge.", 'documented', 'supported', [
            C('OR2', 'R563', "to a commanding point ncjrth of the railroad cut. to enable them to enfilade the enemy's position", note="OCR 'ncjrth'"),
            C('NPS', 'NPS-CLR-1STDAY~raw', "This position was the highest position on Oak Hill."),
            C('LIB', 'ALEXANDER-1907', "It comprised. 60 guns, extending on Seminary Ridge as far as the Hagerstown road, and two Whitworth rifles located nearly a mile farther north on the same ridge", page='419')]),
        S('c', 'guns', "Guns: two Whitworths on 3 Jul (McIntosh; NPS; Alexander); 133 rounds of Whitworth fired in the battle; one Whitworth had an axle broken on 1 Jul and again on 3 Jul. The marker's 'plus two 3-inch rifles' is in none of these sources.", 'documented', 'supported', [
            C('NPS', 'NPS-CLR-1STDAY~raw', "came into position on July 3 with two Whitworth guns, which were powerful British-made twelve-pound rifles that had a range of up to six miles"),
            C('OR2', 'R563', "Rounds of Whitworth 133")],
          note="The OR call Hurt's other section 'the remaining section of Captain Hurt's' without naming its guns."),
        S('d', 'damage', "Union witness: on 3 Jul Milton, with two pieces of Battery K, 3rd US on the left of Cemetery Hill, was under fire of two Whitworth guns planted by the enemy about two miles distant, without loss.", 'documented', 'supported', [
            C('OR1', 'R320', "Was under fire of two Whitworth guns, planted by the enemy about 2 miles distant, the rest of the day, but sustained no loss")]),
        S('e', 'hour', "Signal: two guns in quick succession from Miller's battery (Washington Artillery) between 1 and 2 p.m. (Eshleman), at 1 o'clock (NPS handbook); Furlong: two guns fired in quick succession on the signal; Alexander (B&L): two guns fired by the Washington Artillery. Longstreet: signal guns about 2 p.m.", 'documented', 'conflict', [
            C('OR2', 'R466', "you ordered me to give the signal for opening along the entire _line"),
            C('OR2', 'R466', "Two gtms in quick succession were fired from Captain Miller's battery", note="OCR 'gtms'"),
            C('OR2', 'R438', "On the signal being given on our right (two. guns fired in quick succession)", note="OCR 'two. guns'"),
            C('NPS', 'NPS-HB9-1954', "At 1 o'clock two guns of Miller's Battery, posted near the Peach Orchard, opened fire in rapid succession"),
            C('LIB', 'BL-3', "Greneral Longstreet should order two guns fired by the Washington Artillery", page='362', note="E. Porter Alexander, 'The Great Charge and Artillery Fighting at Gettysburg' (byline in the text layer); OCR 'Greneral'"),
            C('OR2', 'R430', "The signal guns were fired, and all the batteries opened very handsomely and apparently with effective fire")]),
        S('f', 'movement', "'One account says Whitworths on Oak Ridge fired the signal': in no source read (McIntosh does not say it; the OR says Miller's battery).", 'open_gap', 'unsupported', [],
          note="The PDF cites CivilWarTalk (CWT-Whit) and HistoryNet (HN-Thunder): a forum and a blocked host."),
        S('g', 'state_at_start', "Works: none described; on 2 Jul the battalion stood behind a pre-existing stone wall on the range of hills to the left of the town.", 'inferred', 'partial', [
            C('OR2', 'R563', "On Thursday morning. July 2. the battalion was put in position behind a st<jiie w-all. on the range of hills to the left of the town of Gettysburg", note="OCR 'st<jiie w-all.'")]),
    ],
    stays_unsupported=["Two 3-inch rifles with the Whitworths at the Oak Hill marker (no source read)",
                       "A Whitworth signal (forum/HistoryNet claim; no primary witness)",
                       "The ground coordinates of the Whitworth position"],
    conflicts=["Signal: Miller's two guns (Eshleman, NPS, Furlong, Alexander) vs Whitworths on Oak Ridge (forum)",
               "Signal clock: about 13:00 (NPS, Hunt, Hancock) / between 13:00 and 14:00 (Eshleman) / about 14:00 (Longstreet)"],
    register=['terrain-1-EG-16'],
    blocked=[B('CWT-Whit / HN-Thunder / HMDB (Oak Hill marker)', 'https://civilwartalk.com/threads/whitworths-at-gettysburg.129286/', "PDF keys 'CWT-Whit' (CivilWarTalk, Whitworths) and 'HN-Thunder' (HistoryNet, Explore Thunder at Gettysburg): the URL given here is the one the PDF prints for the key CWTalk-Whitworth (same title; the PDF does not print one for 'CWT-Whit' itself) and no URL is printed for 'HN-Thunder'; civilwartalk.com was not probed here (a forum is not an acceptable source for a documented tier); historynet.com was refused here (fence-1 probe). The text of the Oak Hill artillery marker ('two Whitworths plus two 3-inch rifles') is on the park's Hardaway Alabama Artillery tablet: read the tablet text (a park photograph, or the tablet transcription at the Historical Marker Database, hmdb.org, refused here) for the gun list.")],
    consequence=["structures G-16: two Whitworths on the highest ground of Oak Hill north of the railroad cut from the morning of 3 Jul (McIntosh, NPS), 133 rounds; no 3-inch rifles unless the tablet text is read; remove the 'Whitworths fired the signal' alternative or mark it unsupported",
                 "S-061 signal row: two guns of Miller's battery (Washington Artillery) near the Peach Orchard, 13:00-14:00 selector, with Eshleman, Furlong, Alexander and the NPS handbook as witnesses",
                 "kit CS.ART.Miller (Washington Artillery) 3rd Company: the guns of the battalion are eight Napoleons and two howitzers (Eshleman); Hurt: Whitworth pair documented"],
    lookups=[L('OR Part 2 and Part 1', 'Whitworth', 12, "McIntosh, Pendleton, Milton: two Whitworths on 3 Jul; none says they fired the signal"),
             L('NPS texts', 'Hardaway Hurt Whitworth', 10, "CLR First Day: position marked 1906 with two Whitworth guns, the highest position on Oak Hill")],
    structures=['G-16', 'S-061'],
    changes=["G-16 conflict -> partially_supported: two Whitworths on 3 Jul are documented by McIntosh, the NPS and Alexander; the signal by Miller's battery by four witnesses; '2 x 3-inch per the marker' and 'Whitworth signal' stay unsupported"],
))

# ---------------------------------------------------------------------------------------------------------------- R13.0000
ROWS.append(R(
    'R13.0000', 'gap', 'open_gaps',
    pdf_row="R13.0000 (requirements.json): 'Top-level acceptance: all child sub-requirements pass or link to an open register entry with active reconstruction.'",
    pdf_claim="R13.0000: all child sub-requirements (G-01..G-18, P-01..P-14) pass or link to an open register entry with active reconstruction.",
    corrected="Cannot pass and must not be marked passing. In this slice (R13.0000 plus G-01..G-16) none of the sixteen gun rows is confirmed as the PDF prints it: every one is 'corrected' by this close-out (no row 'confirmed'), each with documented parts and marked unsupported parts, and each links to an open proposed register entry (terrain-1-EG-01..17, existing register EG-0149..EG-0164 for the rows). Children outside the slice (G-17, G-18, P-01..P-14) belong to terrain-2. No gate was run (Q03, Q07, Q08, Q09, Q26) and no passes flag was touched.",
    sub=[
        S('a', 'other', "Slice state: G-01..G-16 each have verdict corrected, an open register link and active reconstruction (documented OR/state-volume/NPS evidence with page and offset); none passes.", 'documented', 'supported', [],
          note="Internal bookkeeping: the evidence is in evidence_corrections/terrain-1.jsonl rows R13.G-01..G-16."),
        S('b', 'other', "Open items that block a pass: the unsupported sub-claims listed per row (e.g. G-01 'hollow', G-04 '37 guns', G-05 '18:00 section shift', G-07 'Wheatfield Road' and Knox, G-10 overrun hour, G-11 '6 to 23', G-12 'double canister at 100 yd', G-13 '120' and '34', G-14 '179', G-16 '3-inch rifles' and Whitworth signal), the unplaced brick house of G-09, and blocked pages.", 'open_gap', 'unsupported', []),
        S('c', 'other', "No exception is claimed (Law cl.3, cl.5): the open items stay registered and marked in the product with their tier.", 'documented', 'supported', []),
    ],
    stays_unsupported=["Every sub-claim marked unsupported in R13.G-01..G-16",
                       "Gate results Q03/Q07/Q08/Q09/Q26 (not run)"],
    conflicts=[],
    register=['terrain-1-EG-17'],
    blocked=[],
    consequence=["R13.0000 stays failing and listed as failing; see the request note for the world-content workstream for the changes the corrected rows require"],
    lookups=[],
    structures=['R13'],
    changes=["R13.0000 not_satisfied -> gap (same meaning; vocabulary of the close-out)"],
))
