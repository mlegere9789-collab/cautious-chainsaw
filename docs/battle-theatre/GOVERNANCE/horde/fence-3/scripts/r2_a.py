"""Round-2 patches for fence-3, rows S-053 .. S-063 (baseline = round-1 rows of 2026-11-13).
Every new or widened quote is cut from the raw local text between two anchors (r2lib), so it cannot be typed wrong."""
import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from r2lib import P, OR_span, SV_span, LIB_span, WEB_span  # noqa

PATCHES = {}


def patch(sid):
    def deco(fn):
        PATCHES[sid] = fn
        return fn
    return deco


# --------------------------------------------------------------------------------------------------
@patch('S-053')
def S053(d):
    p = P(d)
    c2 = SV_span('NY3', "During the fight the enemy's sharpshooters occupying a stone house", 'under Colonel Colgrove.', section='NY3-S025',
                 note='Battery M, 1st New York Light Artillery, regimental history in New York at Gettysburg vol. 3. OCR "liidiana" is Indiana ("Twenty-seventh Indiana"); the quotation now runs to the end of the sentence that names the regiment.')
    p.widen('c2', c2)
    p.rev('Round 2: the quotation of c2 widened to the end of its sentence ("especially the Twenty-seventh liidiana [Indiana], under Colonel Colgrove"), because the 27th Indiana of S-053.2 was outside the first quotation.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-054')
def S054(d):
    p = P(d)
    c4 = SV_span('PA2', "Pennington's Battery, of", 'making it untenable', section='PA2-S023',
                 note='2nd Pennsylvania Cavalry history (1914). OCR "Ouster\'s" is Custer\'s. The sentence names the two batteries (Pennington, Randol) that the claim attributes the fire to; the barn "making it untenable" is the end of the quotation.')
    p.widen('c4', c4)
    p.rev('Round 2: the quotation of c4 widened to the whole sentence, which names Pennington\'s and Randol\'s batteries (they were outside the first quotation).')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-056')
def S056(d):
    p = P(d)
    geary = p.cite(OR_span(1, 'OR27-1-R293', 'Everything being thus in readiness, at 3.30 a. m. (early dawn', 'was made by artillery and the infantry',
                           note='Geary, Second Division, Twelfth Corps: the dawn attack; the report goes on that the artillery fire continued, by previous arrangement, for ten minutes, and that Johnson\'s division then advanced. OCR "(early dawn>)": the closing bracket belongs after "dawn".'))
    order = p.cite(OR_span(1, 'OR27-1-R271', 'Orders were at once issued for an attack at daybreak', 'which had been lost',
                           note='Slocum, Twelfth Corps: after the repulse on the left and the return of the divisions "nearly midnight" of 2-3 Jul.'))
    s4 = p.cite(OR_span(1, 'OR27-1-R271', 'was placed in position during the night by Lieutenant-Colonel Best', 'opened the battle at 4 a. m. on the following morning',
                        note='Slocum, Twelfth Corps; the sentence names Batteries F 4th US, K 5th US, M 1st New York and Knap\'s Pennsylvania battery.'))
    p.edit(5, claim='The counterattack to regain the lost works was ordered at once after the Twelfth Corps returned about midnight (Slocum: "Orders were at once issued for an attack at daybreak, for the purpose of regaining that portion of the line which had been lost"); Geary dates the simultaneous attack by artillery and infantry at 3.30 a. m. (early dawn), Candy dates the first fire of the battery at 3.45 a. m., and Slocum has the corps artillery open the battle at 4 a. m.',
           why='Slocum (order), Geary (3.30 a. m.), Candy (3.45 a. m.): three reports, three start values between 3.30 and 4.00; the first round gave the 3.30 value only in this note, without a quotation. The quotes for "Geary under Slocum\'s orders" of the first round are replaced by the corps order and the three clock readings; no text says that Geary issued the order.',
           cites=['c3', geary, order, s4])
    p.rev('Round 2: S-056.5 rewritten to what its quotations say (corps order at daybreak, 3.30 / 3.45 / 4.00 a. m.); the Geary 3.30 a. m. and Slocum order quotations added, "ordered by Geary" withdrawn.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-057')
def S057(d):
    p = P(d)
    c6 = OR_span(1, 'OR27-1-R314', 'At 4.30 a. m. the two rifl.e batteries (ten guns)', 'at a range of from 600 to 800 yards',
                 note='Muhlenberg, chief of artillery of the Twelfth Corps; OCR "rifl.e" is rifle, "IS-pouiider" is 12-pounder.')
    p.widen('c6', c6)
    c4 = OR_span(1, 'OR27-1-R271', 'was placed in position during the night by Lieutenant-Colonel Best', 'opened the battle at 4 a. m. on the following morning',
                 note='Slocum, Twelfth Corps; the sentence names Batteries F 4th US, K 5th US, M 1st New York and Knap\'s Pennsylvania battery.')
    p.widen('c4', c4)
    c5 = OR_span(1, 'OR27-1-R028', "At 1 a. m. of the 3d, Muhlenberg's", 'at a range of from 600 to 800 yards',
                 note='Hunt, chief of artillery of the army: Muhlenberg\'s (F, 4th US) and Kinzie\'s (K, 5th US) batteries posted at 1 a. m. opposite the centre of the Twelfth Corps line; OCR "12-poun(iers)" is 12-pounders.')
    p.widen('c5', c5)
    c8 = OR_span(1, 'OR27-1-R314', 'Commenced at 5.30 a. m., and continued firing at intervals until 10 a. m.', 'had regained their',
                 note='Muhlenberg; the sentence ends "works" after the running head of p.871.')
    p.widen('c8', c8)
    c7 = OR_span(1, 'OR27-1-R273', 'At 4. .30 o\'clock on the morning of July 3, fire was opened on the position held by the enemy', 'placed in position during the night',
                 note='Ruger, Third Brigade commander of the First Division (OR27-1 R273); OCR "4. .30" is 4.30.')
    p.widen('c7', c7)
    g14 = p.cite(OR_span(1, 'OR27-1-R293', 'Lieut. E. D. Muhlenberg', 'reported with fourteen pieces of artillery',
                         note='Geary: Muhlenberg reported to him with fourteen pieces; these were posted on a hill west of the turnpike about 500 yards in rear of the lost intrenchments. OCR ".corps" has a stray full stop.'))
    p.edit(2, claim='The Twelfth Corps artillery was placed in position during the night (Slocum: by Lieutenant-Colonel Best; Hunt: Muhlenberg\'s and Kinzie\'s batteries at 1 a. m. of the 3d) and opened the battle at 4 a. m. (Slocum) or at 4.30 a. m. (Hunt; Muhlenberg; Ruger "4. .30 o\'clock"); Muhlenberg\'s report counts two rifle batteries (ten guns) and two light 12-pounder batteries (ten guns) firing fifteen minutes without intermission at 600-800 yards (Hunt: the same fifteen minutes, 600-800 yards), then from 5.30 a. m. at intervals until 10 a. m., when the infantry had regained the works; Geary counts fourteen pieces reported by Muhlenberg at his order. The gun counts (ten at Hunt\'s 1 a. m. posting, twenty in Muhlenberg\'s own report, fourteen in Geary\'s) are not reconciled by any local text.',
           add_cites=[g14],
           why='Four officers give three start values (4.00, 4.30, 4.30, 4.30) and three gun counts. The target is the ground vacated by the Twelfth Corps and taken by the enemy (S-057.3). Round 1 stated the twenty guns, the 4.30 and the 5.30 without quoting them.')
    p.rev('Round 2: the quotations of Muhlenberg (4.30 a. m., ten + ten guns, 5.30 a. m. to 10 a. m.) and Ruger (4. .30) widened so that the hours and the gun count are inside them; Geary\'s fourteen pieces added; the three gun counts stated as unreconciled.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-058')
def S058(d):
    p = P(d)
    p.widen('c3', OR_span(1, 'OR27-1-R098', 'At the advance of the Third Corps at 4 p. m., the division was in the following order', "protecting Cushing's battery",
                          note='Gibbon, 2nd Division, Second Corps: the order of the division at the advance of the Third Corps at 4 p. m. on 2 Jul.'))
    p.widen('c4', OR_span(1, 'OR27-1-R132', 'The morning of July 3 was quiet until about 8 o\'clock', 'otherwise causing little loss',
                          note='Hazard, chief of artillery, Second Corps. Printed page 478 or 479 (the page model gives 478-479; the passage precedes the heading of p.479); the OCR breaks "lim- bers".'))
    p.widen('c6', OR_span(1, 'OR27-1-R104', "By 2.45 o'clock", "all the guns but one of Cushing's battery",
                          note='Webb, 2nd Brigade, 2nd Division, Second Corps; the sentence before: "About 1 p. m. the enemy opened with more than twenty batteries upon our line."'))
    p.widen('c7', OR_span(1, 'OR27-1-R028', "Brown's (B, First Rhode Island, six 12-pounders), Cushing's", 'six 3-inch',
                          note='Hunt, chief of artillery: the batteries of the Second Corps on the left of the line (first of the three places where Hunt gives the battery as six 3-inch; the longer quotation is unique).'))
    w3 = p.cite(OR_span(1, 'OR27-1-R104', "At 3 o'clock the enemy's line of battle left the woods", 'across the Emmitsburg road',
                        note='Webb: the sentence continues that the enemy formed several lines in the hollow and "advanced for the assault"; the Rhode Island battery had retired and Cowan\'s battery stood in its place.'))
    p.edit(5, claim='When the assault came (Webb: "At 3 o\'clock the enemy\'s line of battle left the woods in our front ... and advanced for the assault") three of Cushing\'s guns were run down to the fence/wall with their canister (Webb, Bachelder), and Cushing, severely wounded, "pushed his gun to the fence in front" and was killed there (Hall); Hazard: "fell on July 3, mortally wounded by a musket-shot".',
           add_cites=[w3])
    p.edit(7, claim='The state changes run from about 08:00 on the morning of 3 Jul (limbers) to the assault that began at about 15:00 (Webb); no text gives a clock time for the guns run down to the wall or for Cushing\'s death, so the printed "about 15:30" is not stated by any source read.',
           why='The printed upper bound "about 15:30" has no quotation; the assault hour is Webb\'s "At 3 o\'clock" (the enemy\'s line left the woods).', add_cites=[w3])
    p.sc(1)['claim'] = ('A stone wall and a fence stood on the Cemetery Ridge line where Webb\'s brigade and Cushing\'s battery formed on 2 Jul: Webb put the brigade "in position at 6.30 a. m. on the 2d, on Granite Ridge" with the 69th Pennsylvania "behind a fence a little in advance of the ridge" (his right on Cushing\'s battery), '
                        'and at the advance of the Third Corps at 4 p. m. Gibbon had the division with "Webb\'s brigade on the right, partially behind a low stone wall, and protecting Cushing\'s battery".')
    p.rev('Round 2: Gibbon\'s "at 4 p. m.", Hazard\'s "otherwise causing little loss" and Webb\'s "By 2.45 o\'clock" brought inside the quotations; Webb\'s "At 3 o\'clock" added for the assault hour; the printed 15:30 is stated as not found.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-059')
def S059(d):
    p = P(d)
    from r2lib import cite
    hb9 = p.cite(LIB_span('NPS-HB9-1954', 'arrived on the field near midnight, July 1', 'called a council of his corps commanders in this house', title='NPS Historical Handbook 9, Gettysburg National Military Park (1954)',
                          note='Handbook 9 (1954), Stop 9, Meade\'s Headquarters: arrival near midnight of 1 Jul, the Leister house as headquarters, the council of the night of 2 Jul.'))
    web = p.cite(cite.NPSW('leister_place', 'General George G. Meade, commanding the 90,000-man Unites States Army of the Potomac, established his headquarters here early on July 2.',
                           note='NPS page as served on 2026-11-13; "Unites" is in the source.'))
    p.edit(1, claim='The Leister house was Meade\'s headquarters: Handbook 9 has Meade arrive "on the field near midnight, July 1" and use the Leister house, and the NPS page has him establish the headquarters there "early on July 2"; on the night of 2 Jul he "called a council of his corps commanders in this house" (Handbook 9), "late in the evening of July 2" (NPS).',
           add_cites=[hb9, web])
    web2 = p.cite(cite.NPSW('leister3d', 'Late in the evening of July 2, Meade held a council of war in this house to decide if the Union army should stay and hold their hard-fought high ground or abandon their position.',
                            nth=0, note='NPS 3D tour page as served on 2026-11-13 (the page repeats the paragraph in its "Audio Described" section; the first occurrence is cited).'))
    p.sc(1)['cites'].append(web2)
    h330 = p.cite(OR_span(1, 'OR27-1-R028', 'About 2. 30 p. m.', 'the enemy soon slackened his fire also',
                          note='Hunt, chief of artillery of the army; the sentence runs from the 2. 30 p. m. reading to the slackening of the enemy\'s fire.'))
    h3 = p.cite(OR_span(1, 'OR27-1-R028', 'About 3 p. m., and soon after the enemy\'s fire had ceased', 'he formed a column of attack',
                        note='Hunt: the enemy\'s fire had ceased soon before the column formed.'))
    p.edit(7, claim='The shell damage fell during the cannonade: it opened at about 1 p. m. (Hunt); Hunt had the Union fire gradually stopped at about 2.30 p. m. and "the enemy soon slackened his fire also"; the column of attack formed "about 3 p. m., and soon after the enemy\'s fire had ceased" (Hunt). The damage to the house is not dated within these hours by any source; the window is the cannonade.',
           cites=['c9', h330, h3, 'c2'], why='Hunt\'s three readings (1 p. m., 2.30 p. m., 3 p. m.) bound the cannonade; Hancock, Gibbon and Lee give durations (S-061). The window applies to the shell damage and the dead horses, not to the rails.')
    p.rev('Round 2: S-059.1 now carries the Handbook 9 and NPS statements for the arrival, the early-on-2-Jul headquarters and the council of war (the first quotations did not mention them); the window of S-059.7 rests on Hunt\'s 2.30 and 3 p. m. quotations.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-060')
def S060(d):
    p = P(d)
    w3 = p.cite(OR_span(1, 'OR27-1-R104', "At 3 o'clock the enemy's line of battle left the woods", 'across the Emmitsburg road',
                        note='Webb: the hour of the start of the assault, used for "when the assault began" in Bachelder\'s sentence.'))
    p.edit(2, add_cites=[w3], claim='The staff only moved to the "fenced yard in the immediate rear" of the house, where "the work of directing the battle was resumed" (Captain Meade), and Meade was at Slocum\'s headquarters on Powers Hill when the assault began (Bachelder; Webb puts the enemy\'s line leaving the woods at 3 o\'clock), reaching the field as it was repulsed (Bachelder).')
    p.rev('Round 2: Webb\'s "At 3 o\'clock" added to S-060.2 for the hour of the start of the assault.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-061')
def S061(d):
    p = P(d)
    p.widen('c3', OR_span(2, 'OR27-2-R428', 'about 1 p. m., on the concerted', 'from right to left',
                          note='Pendleton, chief of artillery, Army of Northern Virginia: "our guns in position, nearly one hundred and fifty, opened fire along the entire line from right to left".'))
    p.widen('c11', OR_span(1, 'OR27-1-R132', 'for an hour and a quarter we were subjected to a very warm artillery fire', 'excepting canister, had been expended',
                           note='Hazard, Artillery Brigade, Second Corps (printed p.480, after the page break of p.479).'))
    p.widen('c13', OR_span(1, 'OR27-1-R028', 'About 2. 30 p. m.', 'the enemy soon slackened his fire also',
                           note='Hunt, chief of artillery of the army.'))
    p.widen('c14', LIB_span('NPS-HB9-1962', 'For nearly 2 hours the duel continued', 'conserve ammunition', title='NPS Historical Handbook 9, Gettysburg National Military Park (1962)',
                            note='OCR spaces the name "H u n t".'))
    p.widen('c19', OR_span(2, 'OR27-2-R430', 'About 2 p. m. General Pickett', 'all the batteries opened',
                           note='Longstreet: Pickett reported the troops in order; "Colonel Walton was ordered to open the batteries. The signal guns were fired, and all the batteries opened".'))
    p.edit(5, claim='The firing ended between about 14:15 and 15:00 on the durations as stated, taking the start as 1 p. m.: Hazard "an hour and a quarter" (about 14:15), Hancock "an hour and forty-five minutes" (about 14:45), Gibbon "two hours" and Lee "about two hours" (about 15:00); Hunt stopped the Union fire about 2.30 p. m. and "the enemy soon slackened his fire also", and "about 3 p. m., and soon after the enemy\'s fire had ceased" the column formed. The clock readings 14:15, 14:45 and 15:00 are computed from the stated durations, not printed.',
           why='This is the range behind conflict C-029 (end 14:00, 14:30 or 15:00). Every value is a published primary statement of a duration or an hour; the printed lull "to about 14:45-15:00" is inside it. No default is chosen here. Round 2 makes the computed clock readings explicit.')
    p.edit(4, claim='Hunt directed that the Union fire be "gradually stopped" at about 2.30 p. m., finding the ammunition running low and caissons and limbers having been exploded, and "the enemy soon slackened his fire also" (Hunt); Handbook 9 says the Union fire slackened after "nearly 2 hours" and that Hunt "had ordered a partial cessation in order to cool the guns and conserve ammunition".')
    p.edit(1, claim='The cannonade opened at about 13:00 on 3 Jul on a concerted signal of two guns fired from Miller\'s battery of the Washington Artillery by order of Colonel Alexander (Eshleman: "Between 1 and 2 p. m. you ordered me to give the signal"; Handbook 9: "At 1 p.m. two guns of Miller\'s Battery ... opened fire in rapid succession"), followed by the whole line of "nearly one hundred and fifty" guns (Pendleton).')
    p.rev('Round 2: Pendleton\'s "nearly one hundred and fifty", Hazard\'s "an hour and a quarter", Hunt\'s "About 2. 30 p. m.", the Handbook 9 sentence on Hunt\'s partial cessation and Longstreet\'s "About 2 p. m. ... the signal guns were fired" brought inside the quotations; the computed clock ends 14:15 / 14:45 / 15:00 are marked as computed.')
    return p.finish()


# --------------------------------------------------------------------------------------------------
@patch('S-062')
def S062(d):
    p = P(d)
    p.widen('c3', OR_span(2, 'OR27-2-R552', 'Within ISO or 200 yards of his works', 'jjlank fences',
                          note='Shepard, 7th Tennessee (Archer\'s brigade). The OCR prints "ISO" for the first distance (read 180 from the context, not checked on the page image) and "jjlank" for plank.'))
    p.widen('c19', OR_span(2, 'OR27-2-R539', 'In this advance, I was compelled to pass for more than a mile across an open plain', 'swept by the enemy\'s artillery',
                           note='Wright, brigade commander in Anderson\'s division, the advance of about 5 p. m. on 2 Jul; OCR "numer(jus" is numerous.'))
    p.edit(1, claim='Post-and-rail (and post-and-plank) fences stood on the line of the advance on 3 Jul and had to be climbed: Peyton climbed "three high post and rail fences"; Shepard came, within "ISO [read 180] or 200 yards of his works", to "a lane inclosed by two stout post and plank fences" ("a very great obstruction to us"); Davis met "a strong post and rail fence" and "other fences of a similar character".')
    p.edit(5, claim='Wright\'s brigade of Anderson\'s division, advancing on 2 Jul at about 5 p. m., had to cross "for more than a mile ... an open plain, intersected by numerous post and rail fences" (another sector, not the Emmitsburg Road of 3 Jul).')
    p.rev('Round 2: the Shepard quotation widened to the whole clause (the OCR "ISO" distance is flagged, not page-checked); the Wright quotation widened from the bare words "post and rail fences" to the sentence that carries the claim.')
    return p.finish()
