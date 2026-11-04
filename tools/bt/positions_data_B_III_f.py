"""Scope B, III Corps (part f): the Artillery Brigade (Randolph) and its five batteries."""
from positions_claims import claim, gap

RA = 'OR27-1-R181'     # Randolph
CL = 'OR27-1-R182'     # Clark, 1st NJ B
WI = 'OR27-1-R183'     # Winslow, 1st NY D
SM = 'OR27-1-R184'     # Smith, 4th NY
FR = 'OR27-1-R185'     # Freeborn, 1st RI E
JA = 'OR27-1-R186'     # James, 4th US K
HU = 'OR27-1-R028'     # Hunt
MG = 'OR27-1-R318'     # McGilvery
DW = 'OR27-1-R331'     # Dow, 6th Maine
B1 = 'OR27-1-R133'     # Birney

A = 'us-3c-art'
NJB = 'us-3c-art-1njb'
NYD = 'us-3c-art-1nyd'
NY4 = 'us-3c-art-4ny'
RIE = 'us-3c-art-1rie'
USK = 'us-3c-art-4usk'


def C(unit, kind, rec, rx, act, wp=None, md='07-02', hm=None, pl=None, road=None, gz=None, tier='documented', **kw):
    t = '1863-%sT%s' % (md, hm) if hm else None
    return claim(unit, kind, rec, rx, act, when_printed=wp, date='1863-' + md, t_iso=t, place_printed=pl, road=road, gz=gz, tier=tier, **kw)


ITEMS = [
    # ================================================================ ARTILLERY BRIGADE (Randolph)
    C(A, 'night_position', RA, r'the batteries of the corps, with one exception, were encamped near Middletown', 'Morning of June 28: the batteries of the corps (except Clark\'s) encamped near Middletown, Md.',
      wp='On the morning of June 28', md='06-28', pl='Middletown, Md.'),
    C(NJB, 'night_position', RA, r'Clark.s battery was near Crampton.s Pass, with one brigade of infantry', 'Morning of June 28: Clark\'s battery (1st NJ B) was near Crampton\'s Pass with one brigade of infantry', wp='On the morning of June 28', md='06-28', pl="Crampton's Pass"),
    C(A, 'march', RA, r'I marched to Frederick, where I encamped and fed about noon', 'Randolph marched to Frederick early on June 28 and fed about noon; Clark\'s battery joined an hour or two later', wp='about noon', md='06-28', hm='12:00', approx=True, pl='Frederick'),
    C(NJB, 'march', RA, r'where I was joined by Clark.s battery an hour or two later', 'Clark\'s battery joined at Frederick an hour or two after noon', wp='an hour or two later', md='06-28', approx=True, pl='Frederick'),
    C(A, 'march', RA, r'In the afternoon the corps marched to Woodville', 'Afternoon of June 28 the corps (and batteries) marched to Woodville', wp='In the afternoon', md='06-28', approx=True, pl='Woodville'),
    C(A, 'march', RA, r'on June 29, to Taneytown, encamping a mile north of the town', 'June 29 batteries with the corps to Taneytown, encamping a mile north of the town', wp='on June 29', md='06-29', pl='Taneytown'),
    C(A, 'march', RA, r'On the afternoon of the 30th, the corps, including batteries, marched to Bridgeport', 'June 30 afternoon batteries with the corps to Bridgeport (about 2 miles from Taneytown on the road to Emmitsburg)', wp='On the afternoon of the 30th', md='06-30', pl='Bridgeport'),
    C(A, 'march', RA, r'and pushed on the next morning to the latter place', 'Pushed on the next morning (July 1) to Emmitsburg', wp='the next morning', md='07-01', pl='Emmitsburg', label='art-emm'),
    C(RIE, 'march', RA, r'encamped on the left of the town, near the Taneytown road', 'Afternoon of July 1 by Sickles\' command three batteries (Randolph\'s E 1st RI, Clark\'s B 1st NJ with the First Division, Seeley\'s K 4th US with the Second) marched to Gettysburg and encamped on the left of the town near the Taneytown road',
      wp='In the afternoon of July 1', md='07-01', pl='on the left of the town', road='Taneytown road', gz='GZ-042', label='art-arr', note='Ledger gate for the artillery brigade is a gap; Smith\'s 09:00 Devil\'s Den is the only gate (4ny). Randolph\'s account puts the encampment near the Taneytown road, not on the Emmitsburg road.'),
    C(NJB, 'arrival_road', RA, r'encamped on the left of the town, near the Taneytown road', 'Clark\'s battery accompanied the First Division to Gettysburg July 1 afternoon, encamping near the Taneytown road', wp='In the afternoon of July 1', md='07-01', pl='on the left of the town', road='Taneytown road', gz='GZ-042'),
    C(USK, 'arrival_road', RA, r'encamped on the left of the town, near the Taneytown road', 'Seeley\'s battery accompanied the Second Division to Gettysburg July 1 afternoon, encamping near the Taneytown road', wp='In the afternoon of July 1', md='07-01', pl='on the left of the town', road='Taneytown road', gz='GZ-042'),
    C(USK, 'arrival_road', 'OR27-1-R158', r'the First and Second Brigades, with one battery of artillery, Seeley.s', 'Seeley\'s battery accompanied the First and Second Brigades of the Second Division from Emmitsburg toward Gettysburg on the afternoon of July 1 by the western road and the counter-march (Humphreys)', wp='3 p. m.', md='07-01', hm='15:00', approx=True, label='art-seeley-hum'),
    C(A, 'position', RA, r'Randolph.s and Clark.s batteries were placed in position', 'Early July 2 Randolph\'s and Clark\'s batteries placed on the line held by Birney\'s division, from near the left of the Second Corps to the base of Round Top; low, unprotected and commanded by the Emmitsburg road ridge',
      wp='Early on the morning of July 2', md='07-02', pl="the line held by General Birney's division"),
    C(RIE, 'position', RA, r'Randolph.s and Clark.s batteries were placed in position', 'Randolph\'s battery (1st RI E) placed on Birney\'s line early July 2 (low and unprotected)', wp='Early on the morning of July 2', md='07-02'),
    C(NJB, 'position', RA, r'Randolph.s and Clark.s batteries were placed in position', 'Clark\'s battery placed on Birney\'s line early July 2', wp='Early on the morning of July 2', md='07-02'),
    C(USK, 'position', RA, r'Seeley.s battery remained in the field', 'Seeley\'s battery remained in the field where it had encamped (July 2 morning)', md='07-02'),
    C(NY4, 'position', RA, r'Smith.s and Winslow.s batteries, on their arrival from Emmitsburg', 'Smith\'s and Winslow\'s batteries on their arrival from Emmitsburg were parked near Seeley\'s until a better disposition could be made', md='07-02', pl="near Seeley's", label='smith-0900'),
    C(NYD, 'position', RA, r'Smith.s and Winslow.s batteries, on their arrival from Emmitsburg', 'Winslow\'s battery parked near Seeley\'s on arrival from Emmitsburg', md='07-02', pl="near Seeley's"),
    C(NY4, 'position', RA, r'I placed Smith.s battery near the extreme left', 'After Sickles\' order of between 1 and 2 p. m. Randolph placed Smith\'s battery near the extreme left between Round Top and the woods on a rocky hill commanding a long valley running toward Emmitsburg', wp='Between 1 and 2 p. m.', md='07-02', approx=True, pl='a rocky hill commanding a long valley running toward Emmitsburg', label='smith-ra-pos'),
    C(NYD, 'position', RA, r'in which I placed Winslow.s battery of light 12-pounders', 'Winslow\'s battery placed in an opening on the right of Smith, past a belt of woods, surrounded by woods', wp='Between 1 and 2 p. m.', md='07-02', approx=True, pl='an opening'),
    C(NJB, 'position', RA, r'on his right Clark.s', 'Clark\'s battery in the open field on the right of Bigelow\'s (Artillery Reserve), then Ames in the peach orchard; all fronting toward Emmitsburg', md='07-02', approx=True, pl='the open field'),
    C(RIE, 'position', RA, r'Randolph.s battery was placed on the Emmitsburg road, fronting nearly perpendicular', 'Randolph\'s battery on the Emmitsburg road fronting nearly perpendicular to the line of Smith-Winslow-Bigelow-Clark-Ames', md='07-02', approx=True, pl='the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(USK, 'position', RA, r'near the extreme left of the line held by the corps, was Seeley.s', 'Seeley\'s battery still farther to the right (Randolph\'s wording: "near the extreme left of the line held by the corps"), placed near the Emmitsburg road', md='07-02', approx=True, pl='near the extreme left of the line held by the corps', note='Wording kept as printed; Hunt (R028) puts Seeley along the Emmitsburg road facing west, well to the right of Randolph.'),
    C(NJB, 'engagement', RA, r'I directed Captain Clark to take the position before mentioned', 'At about 2 p. m. a Confederate battery near the Fairfield-Emmitsburg intersection opened; Randolph directed Clark to take his position and reply while Ames went into the orchard',
      wp='at about 2 p. m.', md='07-02', hm='14:00', approx=True, pl='the peach orchard', gz='GZ-014'),
    C(NJB, 'position', RA, r'Clark.s battery, B, First New Jersey, was placed in position about 2 p\. m\.', 'Clark\'s battery placed in position about 2 p. m.; opened on a column moving on the Fairfield road toward the left of the line', wp='about 2 p. m.', md='07-02', hm='14:00', approx=True, road='Fairfield road', label='clark-0200'),
    C(A, 'engagement', RA, r'at about 3 p\. m\. the enemy reopened fire', 'About 3 p. m. the enemy reopened fire and pushed infantry against the position; the left (Smith) assailed in the most furious manner', wp='at about 3 p. m.', md='07-02', hm='15:00', approx=True),
    C(NY4, 'position', RA, r'Four of Captain Smith.s guns', 'Four of Smith\'s guns placed in battery on the rocky hill; two a few yards in rear pointed obliquely into the woods on the left in front of Round Top; three of the four forward guns left on the hill when the supports retired',
      md='07-02'),
    C(NYD, 'engagement', RA, r'fire solid shot into the woods over our troops', 'Winslow\'s battery fired solid shot into the woods over our troops fighting behind a stone wall, then case and canister; retired by piece on Birney\'s command, losing heavily', md='07-02', pl='the woods'),
    C(RIE, 'position', RA, r'battery, E, First Rhode Island, was placed in position to counteract a cross-fire', 'Randolph\'s battery placed to counteract a cross-fire from the woods in front of the Emmitsburg road upon Ames\' battery and the troops in the peach orchard; remained until the peach orchard support was withdrawn; Lieut. Bucklyn wounded',
      md='07-02', gz='GZ-014', ocr=True, note='OCR "Kandolph", "rqad". The woods are in front of the Emmitsburg road.'),
    C(USK, 'position', RA, r'was placed near the left of our corps line about 3 p\. m\.', 'Seeley\'s battery, supported by the Second Division, placed near the left of the corps line about 3 p. m. and engaged; wounded about 5.30 p. m.; withdrawn; a second position held until the next morning',
      wp='about 3 p. m.', md='07-02', hm='15:00', approx=True, label='seeley-pos', conflicts=['label:adv-humphreys']),
    C(USK, 'engagement', RA, r'About 5\.30 p\. m\. Lieutenant Seeley was badly wounded', 'About 5.30 p. m. Lt. Seeley badly wounded; command devolved on Lt. Robert James; battery withdrawn as the supports fell back', wp='About 5.30 p. m.', md='07-02', hm='17:30', approx=True),
    C(USK, 'night_position', RA, r'A second position was taken and held till the next morning', 'Second position taken and held until the next morning, when ordered to the rear', wp='the next morning', md='07-02'),
    C(A, 'movement', RA, r'At about 5 p\. m\. I rode along the line', 'About 5 p. m. Randolph found the batteries exhausted; Sickles applied for Artillery Reserve batteries which arrived too late to relieve but in time to form McGilvery\'s second line', wp='At about 5 p. m.', md='07-02', hm='17:00', approx=True),
    C(A, 'movement', RA, r'each of my batteries was compelled to retire', 'Each of Randolph\'s batteries was compelled to retire on July 2', md='07-02'),
    C(A, 'strength_note', RA, r'A wound that I received in the shoulder early in the action', 'Randolph wounded in the shoulder early in the action (command of the brigade passed in practice to Capt. A. J. Clark as acting chief of artillery)', md='07-02'),
    C(NY4, 'position', HU, r'Smith.s battery \(Fourth New York, six 10-pounders\) on the extreme left', 'Hunt: Smith\'s battery on the extreme left on a steep and rocky eminence in advance of Sugar Loaf', wp='About 2 p. m.', md='07-02', hm='14:00', approx=True, pl='a steep and rocky eminence in advance of Sugar Loaf', label='smith-hunt'),
    C(NYD, 'position', HU, r'in a wheat-field, separated from Smith by a belt of woods', 'Hunt: Winslow\'s battery in a wheat-field, separated from Smith by a belt of woods', md='07-02', approx=True, pl='a wheat-field', gz='GZ-013'),
    C(NJB, 'position', HU, r'on the line to the left of the peach orchard', 'Hunt: Clark\'s battery on the line to the left of the peach orchard facing south, perpendicular to the Emmitsburg road', md='07-02', approx=True, pl='the peach orchard', gz='GZ-014'),
    C(RIE, 'position', HU, r'Randolph.s \(E, First Rhode Island, six 13-pounders\)', 'Hunt: Randolph\'s battery along the Emmitsburg road facing west', md='07-02', approx=True, pl='along the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(USK, 'position', HU, r'Seeley.s well to the right of Randolph.s', 'Hunt: Seeley\'s battery along the Emmitsburg road, well to the right of Randolph\'s', md='07-02', approx=True, pl='the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(USK, 'night_position', MG, r'I then placed Captain Seeley.s regular battery', 'McGilvery placed Seeley\'s battery (Lt. James) near Dow\'s (6th Maine) battery to watch the enemy after the firing ceased at about 8 o\'clock', wp="about 8 o'clock", md='07-02', hm='20:00', approx=True),
    C(USK, 'night_position', DW, r'who placed Seeley.s battery, under command of Lieutenant James, in my position', 'At 7.30 p. m. McGilvery relieved the 6th Maine and put Seeley\'s battery (Lt. James) in its position', wp='7.80 p. m.', md='07-02', hm='19:30', ocr=True, note='OCR "7.80 p. m." for 7.30.'),
    C(NY4, 'strength_note', 'OR27-1-R134', r'three Parrott guns of the Fourth New York Independent Battery', 'French (Sept. 13, 1863): the only guns lost by the corps were three Parrott guns of the 4th NY Battery on July 2', md='07-02', pl='the engagement of July 2'),

    # ---------------------------------------------------------------- Clark's battery (1st NJ B)
    C(NJB, 'position', CL, r'placed in the second, near the left, of the line of batteries', 'Early July 2 moved to the front and placed in the second line, near the left, of the line of batteries', wp='Early on the morning of July 2', md='07-02'),
    C(NJB, 'movement', CL, r'the battery, by your orders, was moved to the front and left', 'About 9.30 a. m. moved to the front and left, in line on the rise of ground midway between Sickles\' headquarters and the peach orchard on the Emmitsburg road; remained until about 2 p. m.',
      wp='About 9.30 a. m.', md='07-02', hm='09:30', approx=True, pl='peach orchard', road='Emmitsburg road', gz='GZ-014', label='clark-0930'),
    C(NJB, 'engagement', CL, r'passing in column across the Emmitsburg road to our left and front', 'About 2 p. m. enemy infantry seen passing in column across the Emmitsburg road to the left and front (about 1,400 yards); Clark opened by Sickles\' direction with shell and case shot; 6-7 rounds',
      wp='about 2 p. m.', md='07-02', hm='14:00', approx=True, pl='the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(NJB, 'position', CL, r'at the foot of the next slope, near the peach orchard', 'About 3 p. m. the battery was in line at the foot of the next slope near the peach orchard; ordered back to attack a Confederate battery 1,400 yards in front', wp='about 3', md='07-02', approx=True, pl='the peach orchard', gz='GZ-014', ocr=True),
    C(NJB, 'engagement', CL, r'About 3\.30 p\. m\. the enemy.s infantry commenced moving down', 'About 3.30 p. m. enemy infantry columns moving down from the front and right under heavy artillery fire; battery fired shell and case shot; at 6.30 p. m. canister on a column 350 yards away',
      wp='About 3.30 p. m.', md='07-02', hm='15:30', approx=True),
    C(NJB, 'movement', CL, r'to near the ground occupied the previous evening', 'Having no supports, retired to near the ground occupied the previous evening; one caisson and a caisson body left, recovered later', md='07-02', pl='the ground occupied the previous evening'),
    C(NJB, 'position', CL, r'In the battle of the following day the battery was not engaged', 'July 3 the battery was not engaged', wp='the following day', md='07-03'),

    # ---------------------------------------------------------------- Winslow's battery (1st NY D)
    C(NYD, 'position', WI, r'my battery was left with a brigade of the First Division at Emmitsburg', 'Afternoon of July 1 Winslow\'s battery was left with a brigade of the First Division at Emmitsburg', wp='On the afternoon of July 1', md='07-01', pl='Emmitsburg'),
    C(NYD, 'march', WI, r'I received orders to march with the brigade and rejoin the corps at Gettysburg', 'At 3 o\'clock on the morning of July 2 ordered to march with the brigade and rejoin the corps at Gettysburg; halted for a rest within about 3 miles of Gettysburg, then pushed on on word of enemy skirmishers a mile away',
      wp="At 3 o'clock on the morning of July 2", md='07-02', hm='03:00', pl='Gettysburg', label='winslow-dep', conflicts=['label:trob-order']),
    C(NYD, 'arrival_road', WI, r'reaching the corps about 11 a\. m\.', 'Reached the corps about 11 a. m. and was put into position in the line of battle then being formed', wp='about 11 a. m.', md='07-02', hm='11:00', approx=True, pl='the corps', label='art-winslow-arr'),
    C(NYD, 'position', WI, r'in a small wheat-field near the base of Round Top hill', 'An hour or two later the line was moved to the left and front: position near the left of the line in a small wheat-field near the base of Round Top hill', wp='An hour or two later', md='07-02', approx=True, pl='a small wheat-field near the base of Round Top hill', gz='GZ-013'),
    C(NYD, 'engagement', WI, r'opened between 3 and 4 p\. m\. upon our lines', 'A Confederate battery nearly in front opened between 3 and 4 p. m.; Winslow fired solid shot by Hunt\'s command, then at Birney\'s direction in the direction of the heaviest musketry, shell and case at 1-1.5 second fuse', wp='between 3 and 4 p. m.', md='07-02', approx=True),
    C(NYD, 'movement', WI, r'which was done by piece in succession from the left', 'With the enemy within 25 yards of his left and on his right, withdrew the battery by piece in succession from the left, continuing to fire; pieces impressed 2 horses of Smith\'s', md='07-02'),
    C(NYD, 'night_position', WI, r'I was ordered by them to move my battery to the rear', 'Meeting Sickles and Randolph after leaving the field was ordered to the rear to refit; moved to the front next morning (July 3) but not engaged', md='07-02'),
    C(NYD, 'position', WI, r'but was not engaged in the action of that day', 'July 3 moved to the front next morning but was not engaged', wp='next morning', md='07-03'),

    # ---------------------------------------------------------------- Smith's battery (4th NY)
    C(NY4, 'position', SM, r'a hill \(near the Devil.s Cave\) on the left of General Bimey.s line', 'Two sections placed on a hill (near the "Devil\'s Cave") on the left of Birney\'s line; one section with caissons and horses 150 yards in the rear; the 4th Maine detailed as support',
      md='07-02', pl="Devil's Cave", label='smith-own',
      note='Printed "Devil\'s Cave"; the gazetteer place nearest in name is Devil\'s Den (GZ-011), not asserted here. Ledger: PO-27 14:00 and PO-28 09:00 at Devil\'s Den.'),
    C(NY4, 'engagement', SM, r'the enemy opened fire on my right and front from several guns', 'About 2.30 p. m. the enemy opened fire on Smith\'s right and front from several guns; Ward\'s aide ordered him to return the fire; 20 minutes later drove off a section placed to enfilade the line; a six-gun battery went in 1,400 yards in front',
      wp='About 2.30 p. m.', md='07-02', hm='14:30', label='smith-1430'),
    C(NY4, 'engagement', SM, r'charged upon us', 'Anderson\'s brigade of Hood\'s division charged; Smith used case, shell and canister; then called on the 4th Maine; later the 6th NJ and 40th NY came to support', md='07-02', pl=None),
    C(NY4, 'movement', SM, r'When I left three guns on the hill', 'Three guns left on the hill (one sent to the rear disabled) when the supporting regiments were forced back; later reported lost', md='07-02', pl='the hill'),
    C(NY4, 'night_position', SM, r'a field near the Baltimore turnpike, three-quarters of a mile from Third Corps headquarters', 'Conducted the command to a field near the Baltimore turnpike, three-quarters of a mile from Third Corps headquarters, and encamped for the night; three guns reported for service next morning to Capt. Clark',
      md='07-02', pl='near the Baltimore turnpike', road='Baltimore turnpike', gz='GZ-039'),
    C(NY4, 'strength_note', SM, r'Three 10-pounder Parrott guns and gun-carriages', 'Three 10-pounder Parrott guns lost (supposed taken from the field by the Twelfth Corps); 240 rounds expended; 2 killed, 10 wounded', md='07-02'),

    # ---------------------------------------------------------------- Bucklyn / Freeborn (1st RI E)
    C(RIE, 'position', FR, r'the battery was in position in the second line of battle', 'On the morning of July 2 in position in the second line of battle under Lt. Bucklyn, without firing until 3 p. m.', wp='On the morning of July 2', md='07-02', pl='the second line of battle'),
    C(RIE, 'movement', FR, r'when it was ordered to the front', 'At 3 p. m. ordered to the front; moved up and took a position near the Emmitsburg road under heavy artillery fire', wp='3 p. m.', md='07-02', hm='15:00', pl='the Emmitsburg road', road='Emmitsburg road', gz='GZ-041'),
    C(RIE, 'position', FR, r'operated on the road near a small house', 'Right section detached and operated on the road near a small house; annoyed by sharpshooters in a barn in front of the section', md='07-02', pl='the road near a small house'),
    C(RIE, 'movement', FR, r'for twenty minutes before we left the battery was without any support', 'Without any support for twenty minutes before it left; withdrew with the artillery and infantry on its left falling back; one caisson abandoned, later recovered', md='07-02'),
    C(RIE, 'night_position', FR, r'did not participate in any of the subsequent fighting', 'Lt. Bucklyn wounded; the battery ordered to the rear, badly cut up, and took no part in the subsequent fighting', md='07-02'),

    # ---------------------------------------------------------------- Seeley / James (4th US K)
    C(USK, 'position', JA, r'on the crest of a small hill near the left center of our line', 'About 3 p. m. July 2 ordered to the crest of a small hill near the left center of the line, immediately in front of the Second Brigade, Second Division, Third Corps; silenced a battery about 800 yards in front in about fifteen minutes',
      wp='About 3 p. m.', md='07-02', hm='15:00', pl='a small hill near the left center of our line', label='seeley-james', conflicts=['label:adv-humphreys', 'label:seeley-pos']),
    C(USK, 'engagement', JA, r'About 5\.30 p\. m\. the enemy placed in position to our left and front', 'About 5.30 p. m. four Confederate batteries about 1,000 yards to the left and front opened; enemy infantry advanced in heavy columns; Seeley wounded; infantry having fallen back, canister fired, then battery retired', wp='About 5.30 p. m.', md='07-02', hm='17:30', approx=True),
    C(USK, 'movement', JA, r'I then took a position about 400 yards to the right', 'Retired and took a position about 400 yards to the right to enfilade the enemy line; enemy skirmishers on the right flank and rear 30 yards away; withdrew by the left flank', md='07-02', pl='400 yards to the right'),
    C(USK, 'night_position', JA, r'a position in an open field to the rear and, left', 'On McGilvery\'s order took a position in an open field to the rear and left, about 1,200 yards from the original position, with four guns, and remained during the night', md='07-02', pl='an open field to the rear and, left'),
    C(USK, 'engagement', JA, r'the enemy opened upon the battery with sixteen guns', 'At daybreak July 3 the enemy opened upon the battery with sixteen guns from about 1,300 yards; replied; expended the limber ammunition; retired and reported to the corps commander; then held in reserve', wp='At daybreak on the morning of the 3d', md='07-03', pl='an open field'),
    C(USK, 'movement', JA, r'the battery was held in reserve during', 'Held in reserve during the remainder of July 3', wp='the remaind.er of the day', md='07-03', ocr=True),
    C(USK, 'night_position', JA, r'I succeeded in bringing from the field seven guns', 'On the night of the 3d, with the 6th Maine Battery and under McGilvery, brought from the field seven guns abandoned by other troops; next morning returned three light 12-pounders to the 9th Massachusetts Battery', wp='on the night of the 3d', md='07-03'),
]

ITEMS += [
    C(A, 'movement', 'OR27-1-R334', r'when Captain Randolph, chief of artillery Third Army Corps', "Ames (Artillery Reserve, G 1st NY), reported to Sickles at 11 a. m.; sheltered behind the woods on the Emmitsburg road near the stone barn until 3 p. m., when Randolph ordered him forward about 800 yards into a thick peach orchard",
      wp='3 p. m.', md='07-02', hm='15:00', pl='a thick peach orchard', gz='GZ-014', road='Emmitsburg road', note='Reserve battery attached to the corps; Randolph R181 puts Ames into the orchard shortly after about 2 p. m.'),
]

# ----------------------------------------------------------------------- gap: the artillery brigade as a whole (positions of the caissons / trains)
ITEMS += [
    gap(A, 'position', ['Third Corps artillery park July 1 caissons ammunition train Emmitsburg', 'Randolph artillery brigade July 3 position reserve Third Corps batteries', 'Third Corps batteries July 4 July 5 position march Mechanicstown'],
        'OR vol. 27 gives no position for the Third Corps artillery brigade as a unit after July 2 (Winslow, Clark and Smith report only that they were refitting on July 3; no battery report covers July 4-7 movements).',
        reports=['OR27-1-R181', 'OR27-1-R182', 'OR27-1-R183', 'OR27-1-R184', 'OR27-1-R185', 'OR27-1-R186'], activity='Artillery brigade July 3-7 positions and departure not in the OR'),
    gap(RIE, 'position', ['Bucklyn Rhode Island battery E July 3', 'Battery E First Rhode Island Third Corps July 4', 'Freeborn battery refit rear'],
        'Freeborn R185 says only that the battery was ordered to the rear and took no part in later fighting; no place or hour is given for July 3-7.',
        reports=['OR27-1-R185', 'OR27-1-R181'], activity='1st RI E: position July 3 onward not stated'),
]
