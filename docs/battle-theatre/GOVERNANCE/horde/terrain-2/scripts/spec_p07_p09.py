"""Row specs R13.P-07, R13.P-08 and R13.P-09 (terrain-2 close-out, 2026-11-13): the Oak Ridge wall, the Pardee Field wall and the lower Culp's Hill wall."""
from spec_lib import C, S, R, B, L

ROWS = []

# ---------------------------------------------------------------------------------------------------------------- P-07
ROWS.append(R(
    'R13.P-07', 'corrected', 'open_gaps',
    pdf_row="Wall on Oak Ridge (Baxter's brigade, about 14:00-15:00 Jul 1) | Oak Ridge | Existing wall | Present at frame one | documented | Wiki-D1",
    pdf_claim="An existing stone wall on Oak Ridge, held by Baxter's brigade about 14:00-15:00 on 1 Jul; present at frame one; documented.",
    corrected=("The wall is documented, but not by the passage the 2026-11-04 row used. Patterson's 88th Pennsylvania was 'drawn up in line of battle along a stone fence' after a two-mile march from Emmitsburg (about noon): that fence is an unplaced halt, not the Oak Ridge wall, and is withdrawn as its evidence. The Oak Ridge wall is stated by three other witnesses: Rodes says Iverson's brigade 'suffered very heavily from the enemy's musketry fire from behind a stone wall along the crest of the ridge', Iverson that the enemy was 'strongly posted in woods and behind a concealed stone wall', and Col. Prey (104th New York, Paul's brigade) that Confederates 'strongly posted behind a stone wall covered with thick underbrush' were driven from it by his left companies, after which he took position behind the same wall; Col. Wheelock (97th New York, Baxter's brigade) says his skirmishers drew fire from a stone wall and the embankment of the road. "
               "The NPS Cultural Landscape Report (First Day) says Baxter's and Paul's brigades were 'hidden in part behind the overgrown and tumbled-down stone walls along the east boundary of the Forney Farm', entrenched along the stone walls on Oak Ridge to the Mummasburg Road, and built additional breastworks of fence rails; by 2.00 p.m. they had formed the new line. The wall is a dry-laid farm boundary wall, probably built in the 18th century and tumbled down and brush-covered by 1863 (NPS, inferred). The OR has no clock for Iverson's advance: the PDF's 14:00-15:00 is consistent with the NPS 'by 2.00 p.m.' and with the arrival of Baxter's and Paul's regiments at about 1 p.m., but is not itself a reported time. Baxter's own report does not name the wall."),
    sub=[
        S('a', 'place', "A stone wall lay along the crest of the ridge where Baxter's and Paul's brigades met Iverson's: Rodes: Iverson's brigade suffered from musketry 'from behind a stone wall along the crest of the ridge'; Iverson: the enemy 'strongly posted in woods and behind a concealed stone wall'; Prey (104th New York): the enemy strongly posted behind a stone wall covered with thick underbrush, his three left companies gained the wall and drove them out, and he later took position behind it; Wheelock (97th New York): fire from a stone wall and the embankment of the road.", 'documented', 'supported', [
            C('OR2', 'R506', "Iverson's brigade attacked handsomely.'but suffered very heavily from the enemy's musketry fire from behind a stone wall along the crest of the ridge", note="Maj. Gen. R. E. Rodes; p.553"),
            C('OR2', 'R513', "strongly posted in woods and behind a concealed stone wall", note="Brig. Gen. Alfred Iverson; p.579"),
            C('OR1', 'R048', "where the enemy was strongly posted behind a stone wall covered with thick underbrush", note="Col. Gilbert G. Prey, 104th New York (Paul's brigade); p.301"),
            C('OR1', 'R048', "I ordered my three left companies to gain the wall and dislodge the enemy"),
            C('OR1', 'R048', "take position behind the stone wall from which we had previously driven the enemy"),
            C('OR1', 'R053', "finding it proceeding from a stone wall and the embankment of the road", note="Col. Charles Wheelock, 97th New York (Baxter's brigade); p.309")]),
        S('b', 'place', "Baxter's and Paul's brigades and the wall: the NPS says both brigades entrenched along stone walls on Oak Ridge along the Forney Farm boundary extending north to the Mummasburg Road and built additional breastworks out of fence rails, and lay in part behind the overgrown and tumbled-down stone walls along the east boundary of the Forney Farm; by 2.00 p.m. they had formed the new line along Oak Ridge.", 'documented', 'partial', [
            C('NPS', 'NPS-CLR-1STDAY', "Both brigades entrenched along stone walls on Oak Ridge along the Forney Farm boundary extending north to Mummasburg Road, and built additional breastworks out of fence rails", note="Cultural Landscape Report, First Day - Union 1st Corps Battlefield"),
            C('NPS', 'NPS-CLR-1STDAY~raw', "Baxter’s and Paul’s brigades, hidden in part behind the overgrown and tumbled-down stone walls along the east boundary of the Forney Farm", note="content-stream variant of the same report"),
            C('NPS', 'NPS-CLR-1STDAY', "By 2:00 p.m., Paul’s and Baxter’s brigades had formed a new Union line along Oak Ridge against the coming attack from Ewell’s 2nd Corps from the north and west")],
          note="Partial: a secondary source; Baxter's own report does not name the wall. 'Oak Ridge' is the NPS name (the OR has no 'Oak Ridge')."),
        S('c', 'state_at_start', "The wall pre-existed: a dry-laid stone fence along the boundary of the Forney and Wills farms with the McClean farm and Gilbert outlots, on both sides of the Mummasburg Road; probably built in the 18th century and, by the time of the battle, tumbled down and covered by brush (NPS, inferred); Iverson calls it 'concealed' and Prey 'covered with thick underbrush'.", 'inferred', 'supported', [
            C('NPS', 'NPS-CLR-1STDAY', "At the time of the battle, a dry-laid stone fence (wall) extended along the boundary of the Forney and Wills farms with the McClean Farm and Gilbert Outlots, north and south of Mummasburg Road"),
            C('NPS', 'NPS-CLR-1STDAY', "It was probably built in the 18th century and by the time of the battle may have been in a tumbled-down condition, covered by brush"),
            C('NPS', 'NPS-CLR-1STDAY', "A battle-era stone fence, used as a breastwork and modified after the battle, extends along the east boundary", note="the surviving fence was modified after the battle: no 1863 profile from it"),
            C('OR2', 'R513', "strongly posted in woods and behind a concealed stone wall")],
          note="Tier inferred: the NPS itself hedges ('probably', 'may have been')."),
        S('d', 'hour', "Clock: Prey's and Wheelock's regiments reached the field about 1 p.m. on 1 Jul; Prey's brigade formed and was first ordered to throw up a breastwork, countermanded; the NPS has the new line formed by 2.00 p.m.; the OR gives no clock for Iverson's attack. The PDF's 14:00-15:00 is consistent with these bounds but is not a reported time.", 'inferred', 'partial', [
            C('OR1', 'R048', "arrived about 1 o'clock >>> a breastwork of such material as they could find"),
            C('OR1', 'R053', "reaching Gettysburg, Pa., at 1 p. m. same day"),
            C('NPS', 'NPS-CLR-1STDAY', "By 2:00 p.m., Paul’s and Baxter’s brigades had formed a new Union line along Oak Ridge against the coming attack from Ewell’s 2nd Corps from the north and west")],
          note="Terrain-1 / tl rows carry the Iverson clock separately; no OR report read gives it."),
        S('e', 'construction_window', "Added works: the NPS says Baxter's and Paul's men built additional breastworks of fence rails on the wall line; Prey's regiment was first ordered to throw up a breastwork of any material and the order was countermanded within minutes (about 13:00); no OR report describes rails stacked on this wall.", 'inferred', 'partial', [
            C('NPS', 'NPS-CLR-1STDAY', "Both brigades entrenched along stone walls on Oak Ridge along the Forney Farm boundary extending north to Mummasburg Road, and built additional breastworks out of fence rails"),
            C('OR1', 'R048', "arrived about 1 o'clock >>> a breastwork of such material as they could find")],
          note="Rail breastworks on the wall: secondary only (NPS); the construction window is inside 13:00-14:00; builders Baxter's and Paul's brigades."),
        S('f', 'place', "The 88th Pennsylvania's 'stone fence' of the 2026-11-04 row is not on Oak Ridge: Patterson says that after hearing cannonading about 11 a.m. and marching some two miles the regiment was drawn up in line of battle along a stone fence, then changed position to a slight hill; after the fall-back through the town it threw up breastworks of rails and earth on Cemetery Hill.", 'documented', 'supported', [
            C('OR1', 'R054', "we heard cannonading, and kf ter marching in quick and double-quick time some 2 miles, we were drawn up in line of battle along a stone fence", note="Capt. E. Y. Patterson, 88th Pennsylvania; p.311; OCR 'kf ter'"),
            C('OR1', 'R054', "We then toolj; a position on the left of the hill, which was afterward the center of the line of battle, and threw up breastworks made of rails and earth", note="OCR 'toolj;'; the hill is Cemetery Hill")],
          note="This is the evidence the 2026-11-04 row used; it names an unplaced halt, not the Oak Ridge wall."),
    ],
    stays_unsupported=["An OR clock for Iverson's attack (the PDF's 14:00-15:00 is consistent but not reported)",
                       "Whether Baxter's brigade held the wall by name: no OR report of Baxter's brigade names it (Prey and Wheelock are the Union witnesses)",
                       "Height, length and gaps of the wall in 1863 (none given; the NPS says tumbled down and brush-covered)",
                       "Whether the rails the NPS says were stacked on it are in any OR report"],
    conflicts=["Condition: the NPS reading 'tumbled-down, covered by brush' vs the 'strong position' of Wheelock's line; both carried"],
    register=['terrain-2-EG-03'],
    blocked=[B('Wiki-D1', 'https://en.wikipedia.org/wiki/Battle_of_Gettysburg,_first_day', "Wikipedia, 'Battle of Gettysburg, first day' (the PDF prints no URL; the host is refused by the egress proxy, probed 2026-11-13; not acceptable for a documented tier). Nothing in this row depends on it now.")],
    consequence=["structures P-07: the wall on Oak Ridge is documented (Rodes, Iverson, Prey, Wheelock; NPS): keep it present at frame one, never constructed, state 'partly tumbled down and brush-covered' (inferred); remove the 88th Pennsylvania's stone fence as its evidence",
                 "state_schedule: add a Jul 1 ~13:00-14:00 rail breastwork on the wall line by Baxter's and Paul's brigades (NPS; inferred window) and the clearing of the wall by Prey's companies; builders named",
                 "tl rows: the 14:00-15:00 clock for the Oak Ridge fight stays PDF/NPS-based, no OR clock"],
    lookups=[L('OR Part 1 R036-R060', 'stone wall|stone fence|fence', 40, "First Corps reports: Prey, Wheelock and Patterson are the ones that matter"),
             L('OR Part 2 R504-R519', 'stone wall|stone fence', 10, "Rodes, Iverson, Ramseur, Doles"),
             L('OR Parts 1-2', 'Oak Ridge', 0, "0 hits: the OR says Oak Hill"),
             L('NPS texts', 'Forney|Oak Ridge', 8, "Cultural Landscape Report (First Day) pages 62, 299, 428")],
    structures=['P-07', 'E-01', 'E-02'],
    notes="OR-RECHECK: the quote of the old row was found verbatim (R054 p.311); its use as the Oak Ridge wall is withdrawn.",
    changes=["partially_supported -> corrected: the wall is documented (Rodes, Iverson, Prey, Wheelock, NPS) but the old row's only witness (the 88th Pennsylvania's stone fence) is an unplaced halt on the march",
             "new: tumbled-down and brush-covered condition (NPS), rail breastworks on the wall line (NPS), the 13:00-14:00 clock bounds"]))

# ---------------------------------------------------------------------------------------------------------------- P-08
ROWS.append(R(
    'R13.P-08', 'confirmed', 'open_gaps',
    pdf_row="Stone wall in Pardee Field (attacked about Jul 3 by the 1st Maryland PHB) | Culp's Hill | Existing wall | Present at frame one | documented | Wiki-Culp; HN-Walls",
    pdf_claim="An existing stone wall in Pardee Field, attacked about 3 Jul by the 1st Maryland Potomac Home Brigade; present at frame one; documented.",
    corrected=("Confirmed with additions. Geary (Second Division, XII Corps) places the wall: it 'extended parallel to Generals Ruger's and Kane's intrenchments and about 200 yards in rear of them', was occupied by the enemy on the night of 2 Jul 'as a protection against attack from the direction of the turnpike', and at 5 a.m. on 3 Jul the 147th Pennsylvania (Lt. Col. Pardee) was ordered to charge and carry it, after which the enemy 'abandoned the entire line of the stone wall'; Candy says the regiment occupied 'a stone fence in front of the enemy' after the 3.45 a.m. battery fire; Lockwood says the 1st Maryland Potomac Home Brigade (Maulsby) entered the woods and drove the enemy 'back behind a stone wall, which was nearly parallel with the turnpike'; Maulsby says the regiment attacked 'a position of the enemy on the right, behind a stone wall, running through and covered by a dense woods' and nearly reached it when another brigade came up. Clock conflict: about 4 a.m. (Maulsby) vs about 6 a.m. (Lockwood). "
               "Cobham (111th Pennsylvania) records on the night of 2 Jul fire 'from behind a stone wall in the rear of our breastworks'. The NPS Record of Treatment names Pardee Field (Abraham Spangler Field 8) and the stone wall along Abraham Spangler's Spring Road that bordered it. The name Pardee is the 147th Pennsylvania's lieutenant colonel (Ario Pardee, Jr.); the OR does not use 'Pardee Field'. Existing is inferred: the wall already stood when Greene's and Kane's lines were formed on 2 Jul, nobody reports building it, and the Confederates used it (no Confederate construction is reported)."),
    sub=[
        S('a', 'place', "The wall: a stone wall extending parallel to Ruger's and Kane's intrenchments about 200 yards in rear of them, occupied by the enemy on the night of 2 Jul as protection against attack from the direction of the turnpike; Cobham's brigade was fired on from behind 'a stone wall in the rear of our breastworks' that the enemy had taken during its absence; Williams and Wooster say the enemy held the stone fence/wall with the breastworks.", 'documented', 'supported', [
            C('OR1', 'R293', "its right near a stone wall, which extended parallel to Generals Ruger's and Kane's intrenchments and about 200 yards in rear of them", note="Brig. Gen. John W. Geary; p.827"),
            C('OR1', 'R293', "This stone wall was occupied by a force of the enemy as a protection against attack from the direction of the turnpike"),
            C('OR1', 'R303', "fired upon from behind a stone wall in the rear of our breastworks", note="Col. George A. Cobham (111th Pennsylvania), commanding Kane's brigade; p.849"),
            C('OR1', 'R272', "found the whole of his original intrenched line, as well as the stone fence, held in force by the enemy", note="Brig. Gen. A. S. Williams; p.774"),
            C('OR1', 'R276', "the enemy had advanced on the right, and gained the breastworks in front and the stone wall, where we had previously been placed as a reserve", note="Lt. Col. W. B. Wooster, 20th Connecticut; p.793; the same wall as P-09")]),
        S('b', 'unit', "Attack of 3 Jul: the 1st Maryland Potomac Home Brigade (Maulsby) entered the woods and drove the enemy back behind a stone wall nearly parallel with the turnpike (Lockwood: about 6 a.m.); Maulsby: ordered about 4 a.m. to attack a position of the enemy behind a stone wall running through a dense woods, the wall nearly reached and bayonets fixed when another brigade approached; the 147th Pennsylvania was ordered to charge and carry the wall at 5 a.m. (Geary), having occupied a stone fence in front of the enemy after the 3.45 a.m. battery fire (Candy).", 'documented', 'conflict', [
            C('OR1', 'R282', "At about 6 a, m. I received orders to deploy a regiment and engage the enemy within these woods", note="Brig. Gen. H. H. Lockwood; p.804"),
            C('OR1', 'R282', "the enemy engaged and driven back behind a stone wall, which was nearly parallel with the turnpike"),
            C('OR1', 'R283', "about 4 a. m. the 3d instant this regiment was ordered to attack a position of the enemy on the right, behind a stone wall, running through and covered by a dense woods", note="Col. W. P. Maulsby, 1st Potomac Home Brigade; p.806"),
            C('OR1', 'R283', "the stone wall nearly reached, and bayonets were fixed for a charge over it"),
            C('OR1', 'R293', "At 5 a. m. the One hundred and forty-seventh Pennsylvania Volunteers, of Candy's brigade, was ordered to charge and carry the stone wall occupied by the enemy", note="p.828"),
            C('OR1', 'R293', "who then abandoned the entire line of the stone wall"),
            C('OR1', 'R294', "Remained in the latter position until 3.45 a. m. [July 3], when the enemy were opened upon by a battery placed for the purpose of shelling them", note="Col. Charles Candy; p.836"),
            C('OR1', 'R294', "the One hundred and forty-seventh Pennsylvania Volunteers were ordered forward, and occupied a stone fence in front of the enemy")],
          note="Clock conflict carried: Maulsby about 4 a.m., Lockwood about 6 a.m., Geary's 147th Pennsylvania charge 5 a.m. The 147th (not the 1st Maryland) carried the wall."),
        S('c', 'place', "The identification with Pardee Field: the NPS names Pardee Field (Abraham Spangler Field 8) and says Candy's brigade stood in Abraham Spangler's orchard fronting 'a narrow lane running from the turnpike to the stone wall' bordering Pardee Field (the same sentence is in Geary's report); the stone wall along Abraham Spangler's Spring Road is the NPS caption of the field's wall; Lt. Col. Pardee's 147th Pennsylvania moved forward 'to a point which commanded the right of the line of intrenchments'.", 'documented', 'supported', [
            C('OR1', 'R293', "Immediately in front of the First Brigade was a narrow lane running from the turnpike to the stone wall previously mentioned"),
            C('NPS', 'NPS-CLR-ROT-V1', "fronting “a narrow lane running from the turnpike to the stone wall” bordering Pardee Field (Abraham Spangler Field 8)", note="Record of Treatment vol. I (2015), the passage quoting Geary"),
            C('OR1', 'R301', "I was ordered by General Geary, commanding division, to move forward with my regiment to a point which commanded the right of the line of intrenchments", note="Lt. Col. Ario Pardee, Jr., 147th Pennsylvania; p.846")],
          note="The OR never says 'Pardee Field': the name is the NPS's (after the 147th's lieutenant colonel)."),
        S('d', 'state_at_start', "Pre-existing: the wall stood when the lines formed on 2 Jul (Geary calls it 'the stone wall previously mentioned'); no report says anyone built or altered it; the Confederates used it as cover. No construction by either side is reported, no height, length or thickness is given.", 'inferred', 'partial', [
            C('OR1', 'R293', "its right near a stone wall, which extended parallel to Generals Ruger's and Kane's intrenchments and about 200 yards in rear of them"),
            C('NPS', 'NPS-CLR-ROT-V2', "The pre-battle farm stone walls were built for permanence and livestock control while the stone wall defense works were hastily stacked for an expedient purpose", note="general NPS statement for the park")],
          note="Inferred: no source says 'existing'; the wall is already there in the first mention."),
    ],
    stays_unsupported=["The OR name 'Pardee Field' (the NPS name; the OR describes a stone wall with a lane)",
                       "Height, length and thickness of the wall in 1863",
                       "Whether the Confederates altered the wall (no report; the PDF notes no Confederate works for 2-3 Jul)",
                       "The exact hour of the 1st Maryland's attack (4 a.m. or 6 a.m.)"],
    conflicts=["Hour of the 1st Maryland Potomac Home Brigade's attack: about 4 a.m. (Maulsby) vs about 6 a.m. (Lockwood); the 147th Pennsylvania's charge at 5 a.m. (Geary)",
               "Who carried the wall: the 147th Pennsylvania (Geary) vs the 1st Maryland drove the enemy back to it (Lockwood) and was stopped short (Maulsby)"],
    register=['terrain-2-EG-05'],
    blocked=[B('Wiki-Culp / HN-Walls', None, "Wikipedia 'Culp's Hill' and HistoryNet 'Crossroads: Walls of Fame' (the PDF prints no URL; both hosts are refused by the egress proxy, probed 2026-11-13; Wikipedia is not acceptable for a documented tier). Nothing in this row depends on them now.")],
    consequence=["structures P-08: keep the Pardee Field wall present at frame one; position: parallel to the lower Culp's Hill intrenchments about 200 yd behind them, nearly parallel with the turnpike; the wall is the same wall the Confederates (Steuart) held from the night of 2 Jul to about 5-6 a.m. on 3 Jul; no construction animation; do not derive an 1863 profile from the modern rebuilt Culp's Hill walls",
                 "state_schedule: occupation by the Confederates from about 20:00 2 Jul; 1st Maryland PHB advance about 04:00-06:00 3 Jul (conflict); 147th Pennsylvania charge 05:00 (Geary) carries the wall",
                 "world content: a narrow lane from the turnpike to the wall (Geary) = the farm lane of Abraham Spangler's field"],
    lookups=[L('OR Part 1 R272-R306', 'stone wall|stone fence', 40, "Williams, Ruger, McDougall, Wooster, Price, Lockwood, Maulsby, Geary, Candy, Cobham, Pardee"),
             L('NPS texts', 'Pardee Field', 12, "Record of Treatment vol. I (pdf p.293, 300, 311-312) and the Culp's Hill CLI")],
    structures=['P-08', 'E-03', 'E-04', 'S-056'],
    notes="OR-RECHECK: the four quotes of the old row (Lockwood p.804, Cobham p.849, Candy p.836, Williams p.773) were found verbatim. The old row had not read Geary (R293) or Maulsby (R283): they place the wall and the attack.",
    changes=["partially_supported -> confirmed with additions: Geary gives the wall's position (about 200 yd in rear of the intrenchments) and the 5 a.m. charge of the 147th Pennsylvania; Maulsby the 4 a.m. attack",
             "new: clock conflict 4 a.m. vs 6 a.m.; the same wall held by the enemy from the night of 2 Jul (Cobham, Williams, Wooster)"]))

# ---------------------------------------------------------------------------------------------------------------- P-09
ROWS.append(R(
    'R13.P-09', 'corrected', 'open_gaps',
    pdf_row="'Heavy stone wall' about 10 rods behind the 123rd NY's breastwork | Lower Culp's Hill | Existing wall | Present at frame one | documented | HN-Hundreds",
    pdf_claim="A 'heavy stone wall' about 10 rods (165 ft, 55 yd) behind the 123rd New York's breastwork on lower Culp's Hill; existing; present at frame one; documented.",
    corrected=("The wall is documented (First Brigade, First Division, XII Corps), the distance is not 10 rods in any source: Williams 'a thick stone fence parallel to the ridge, less than 50 yards behind it' (the breastworks); Ruger 'about 75 yards' behind the First Brigade's breastworks; McDougall's own report 'our rear line behind a stone wall, our front line parallel to the stone wall and about 40 paces in advance'; Price (145th New York) 'some 125 feet in rear of the first line'. The PDF's 10 rods (55 yd) lies inside that spread but is not in any source. 'Heavy' is the PDF's word (Williams has 'thick'). "
               "The 123rd New York (Lt. Col. Rogers) was in the front line of the brigade and 'built a strong breastwork along its front' on the morning of 2 Jul after moving 'into the woods to the right of Cemetery Hill'. The wall pre-existed and was repaired: Price says his regiment was 'repairing the stone wall' while the first line built breastworks (afternoon of 2 Jul). Wall damage and possession: on the evening of 2 Jul the enemy gained the breastworks and the wall (Wooster, Cobham), the 20th Connecticut retook both at about 10.30 a.m. on 3 Jul and the 123rd relieved it; the 123rd 'gained the stone wall' (Ruger). The wall is the same as P-08's. No source calls it pre-existing in words; the 145th NY's repair shows it existed."),
    sub=[
        S('a', 'length', "Distance of the stone wall behind the First Brigade's breastworks: Williams: less than 50 yards behind the ridge breastworks; Ruger: about 75 yards behind the First Brigade's breastworks and nearly parallel; McDougall: front line about 40 paces in advance of the wall; Price: about 125 feet in rear of the first line; PDF: 10 rods (165 ft = 55 yd).", 'documented', 'conflict', [
            C('OR1', 'R272', "A thick stone fence parallel to the ridge, less than 50 yards behind it, furnished an excellent cover for this second line", note="Brig. Gen. A. S. Williams; p.773"),
            C('OR1', 'R273', "In rear of breastworks of First Brigade, and about 75 yards therefrom, and nearly parallel therewith, was a stone wall, behind which the second line of the First Brigade was placed", note="Brig. Gen. T. H. Ruger (OCR 'Euger'); p.778"),
            C('OR1', 'R274', "our rear line behind a stone wall, our front line parallel to the stone wall and about 40 paces in advance, when we immediately built breastworks to protect the front line", note="Col. A. L. McDougall, commanding the First Brigade; p.783"),
            C('OR1', 'R280', "I was ordered to form my regiment in the second line of battle, parallel with and behind a stone wall, some 125 feet in rear of the first line", note="Col. E. L. Price, 145th New York; p.800")],
          note="Four OR distances (<50 yd, 40 paces, 125 ft, 75 yd) and the PDF's 10 rods (55 yd): carry all, no default."),
        S('b', 'unit', "The 123rd New York in the front line of the First Brigade built a strong breastwork along its front on the morning of 2 Jul, in the woods to the right of Cemetery Hill (Rogers); the breastwork is the one in front of the wall.", 'documented', 'supported', [
            C('OR1', 'R279', "Next morning we were ordered in position on the hill near Rock Creek", note="Lt. Col. J. C. Rogers, 123rd New York; p.798"),
            C('OR1', 'R279', "Here the regiment, being in the front line of the brigade, built a strong breastwork along its front")],
          note="The date is the morning of 2 Jul (not 1 Jul); consistent with fence-1 R14.E-03."),
        S('c', 'construction_window', "The wall was repaired, not built: Price's regiment was 'repairing the stone wall' while the first-line regiments built breastworks (to 6.30 p.m. on 2 Jul); the Williams/Ruger/McDougall texts take the wall as already there.", 'documented', 'supported', [
            C('OR1', 'R280', "repairing the stone wall in the meantime, the regiments in the first line building breastworks", note="145th New York; p.800"),
            C('OR1', 'R274', "The brigade, after having established its breastworks in front, with the stone wall in rear, had a very strong position", note="McDougall; p.783")]),
        S('d', 'damage', "Possession and loss of the wall: on the evening of 2 Jul the enemy gained the breastworks and the stone wall; the wall was shelled at daylight on 3 Jul; at about 10.30 a.m. the 20th Connecticut occupied wall and breastworks after the rebels were driven out, and was relieved by the 123rd; Ruger: the 123rd New York 'gained the stone wall' and the enemy fell back over the breastworks.", 'documented', 'supported', [
            C('OR1', 'R276', "the enemy had advanced on the right, and gained the breastworks in front and the stone wall, where we had previously been placed as a reserve", note="Lt. Col. W. B. Wooster, 20th Connecticut; p.793"),
            C('OR1', 'R276', "the rebels having been driven by our fire and shells from the stone wall and breastworks in our front, my regiment steadily advanced in line, and occupied both the wall and breastworks", note="p.794"),
            C('OR1', 'R273', "The One hundred and twenty-third New York Volunteers, First Brigade, which had meantime been advanced from the left of the division, gained the stone wall", note="p.781")],
          note="No damage to the stones themselves is reported."),
        S('e', 'state_at_start', "'Heavy' stone wall: Williams calls it 'thick'; no source says 'heavy' or gives a thickness; no source says who built it or when; the NPS says the farm walls were built for permanence, which makes the wall inferred pre-existing.", 'inferred', 'partial', [
            C('OR1', 'R272', "A thick stone fence parallel to the ridge, less than 50 yards behind it, furnished an excellent cover for this second line"),
            C('NPS', 'NPS-CLR-ROT-V2', "The pre-battle farm stone walls were built for permanence and livestock control while the stone wall defense works were hastily stacked for an expedient purpose", note="general NPS statement for the park")],
          note="HistoryNet 'Hundreds of Rebels Lay' (the PDF's source for 'heavy' and '10 rods') is a blocked host."),
    ],
    stays_unsupported=["The PDF's 10 rods (55 yd) and the word 'heavy' (source HistoryNet, blocked host)",
                       "Which distance is right (four OR values)",
                       "Builder and date of the wall; its height and thickness",
                       "Whether the wall is the 'second line' wall of the Third Brigade as well (Ruger names the First Brigade's)"],
    conflicts=["Distance of the wall behind the breastworks: <50 yd (Williams) / 40 paces (McDougall) / 125 ft (Price) / 75 yd (Ruger) / 10 rods = 55 yd (PDF)"],
    register=['terrain-2-EG-05'],
    blocked=[B('HN-Hundreds', None, "HistoryNet, 'Hundreds of Rebels Lay' (the PDF prints no URL; historynet.com is refused by the egress proxy, probed 2026-11-13). Read it for the '10 rods' and 'heavy stone wall' wording and what source it gives; a magazine page is a lead, not support.")],
    consequence=["structures P-09: the wall behind the First Brigade's breastworks is documented; keep it present at frame one with no construction animation; the distance becomes a selector (<50 yd Williams / 40 paces McDougall / 125 ft Price / 75 yd Ruger / 10 rods PDF-only); never draw 'heavy' as a sourced fact",
                 "state_schedule: add a repair state (145th New York, 2 Jul to 18:30) and the possession states of the wall (enemy from the evening of 2 Jul to about 10:30 on 3 Jul; the 20th Connecticut retook it; the 123rd New York relieved it)",
                 "fence-1 R14.E-03: the 123rd New York's breastwork is dated to the morning of 2 Jul (Rogers), not 1 Jul"],
    lookups=[L('OR Part 1 R272-R282', 'stone wall|stone fence|rods', 36, "Williams, Ruger, McDougall, Wooster, Rogers, Price, Lockwood"),
             L('OR Part 1 R271-R313', 'rods', 5, "none concerns the wall's distance; the PDF's 10 rods is not in the OR")],
    structures=['P-09', 'E-03', 'S-015'],
    notes="OR-RECHECK: the four quotes of the old row were found verbatim (R273 p.778 and p.781, R280 p.800, R272 p.773). The old row had three distances; McDougall's 40 paces is new, so there are four OR distances.",
    changes=["verified (conflict) -> corrected: four OR distances (Williams, Ruger, McDougall, Price), none is 10 rods; the wall was repaired by the 145th New York and held by the enemy from 2 Jul evening to about 10:30 on 3 Jul",
             "new: McDougall's 40 paces; Wooster's possession account; Rogers dates the 123rd's breastwork to the morning of 2 Jul"]))
