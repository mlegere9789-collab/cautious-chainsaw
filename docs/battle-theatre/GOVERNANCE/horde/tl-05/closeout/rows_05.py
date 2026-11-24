"""Close-out rows of shard tl-05 (T2-006 .. T2-062).  Every quote is re-matched in the local OR text by build.py."""
from tl58lib import *

D, I, P, G = 'documented', 'inferred', 'plausible-procedural', 'open gap'
S_, U_, C_, X_, K_ = 'supported', 'unsupported', 'conflict', 'contradicted', 'computed'
NOHOUR = 'Shard recorded this as a computed row; the project ephemeris is not a source in the sense of the merge rule.'

ROW('T2-006', 'unsupported',
    'No indexed OR passage records Longstreet issuing march orders at about 17:30 on Jul 1 after talking with Lee; the seed cites OR 27/2 p.733 through Freeman (secondary), and that printed page holds cavalry reports.',
    [SUB('Longstreet issues march orders about 17:30 on Jul 1 after talking with Lee', G, U_, [], 'seed cites OR 27/2 p.733 as cited by Freeman; no primary passage located'),
     SUB('Longstreet reports his own arrival times only: McLaws at Marsh Creek a little after dark, Hood near the same distance about midnight', D, S_, ['l_marsh'])],
    {'l_marsh': ('OR27-2-R430', 'McLaws\' division, however, reached Marsh Creek, 4 miles from Gettysburg, a little after dark')},
    remains=['The Jul 1 ~17:30 march-order event: no OR passage; Freeman page cite unresolved'],
    searched=[SR(r'Longstreet', near=r'(orders?|instructions?).{0,60}(march|move)', win=200, what='Longstreet and march orders, OR27 all parts (hit count only; none was a Jul 1 17:30 order by Longstreet)', parts=(2,))],
    register='tl-05-EG-006')

ROW('T2-007', 'partially_supported',
    'Hancock left Cemetery Hill for army headquarters at Taneytown "about dark" after Slocum arrived between 5 and 6 o\'clock and took command; the seed\'s about 18:00 is a conflicting secondary value, carried as a scenario without a default.',
    [SUB('Between 5 and 6 o\'clock Slocum arrived and Hancock transferred command to him', D, S_, ['h_slocum']),
     SUB('About dark Hancock started for army headquarters at Taneytown and reported to Meade in person', D, S_, ['h_dark']),
     SUB('The departure was about 18:00', I, C_, [], 'W-D1/SS1 secondary value; OR says about dark (sunset 19:32 LMT in the project ephemeris)'),
     SUB('He went to report that the battle should be fought at Gettysburg', I, U_, [], 'purpose not read in the passage cited')],
    {'h_slocum': ('OR27-1-R076', 'Between 5 and 6 o\'clock, my dispositions having been completed, Major-General Slocum arrived on the field'),
     'h_dark': ('OR27-1-R076', 'About dark I started for the headquarters of the army')},
    scenarios=[SCN('A', 'Hancock leaves about 18:00', 'seed (W-D1, SS1, secondary)', I),
               SCN('B', 'Hancock leaves about dark (after 19:00; sunset 19:32 LMT)', 'Hancock OR27-1-R076 p.369', D, ['h_dark'])],
    remains=['Hancock\'s purpose in going to Meade as stated by the seed'], register='tl-05-EG-001')

ROW('T2-008', 'partially_supported',
    'The 7th Indiana (Wadsworth\'s division) began a temporary breastwork at once on the hill east of Gettysburg on Jul 1; the 6th Wisconsin\'s own initiative with a dozen spades from its regimental wagon rests on Dawes\'s memoir (read online, not in the local texts) and is not re-read here.',
    [SUB('The 7th Indiana, on taking position on the hill east of Gettysburg, immediately commenced a temporary breastwork', D, S_, ['g_bw']),
     SUB('The 6th Wisconsin began works on its own initiative with about a dozen spades and shovels from the regimental wagon (Dawes memoir p.179)', I, U_, [], 'participant memoir written decades later; read at archive.org by the shard, not in a local text; not re-matched'),
     SUB('The rest of the division followed by nightfall; the 6th Wisconsin starting first', G, U_, [], 'in no report read')],
    {'g_bw': ('OR27-1-R038', 'We immediately commenced the construction of a temporary breastwork')},
    remains=['6th Wisconsin tools and initiative (memoir only)', 'the rest of the division by nightfall', 'any clock hour'], register='tl-05-EG-003',
    related=['T1-181'])

ROW('T2-009', 'partially_supported',
    'Dates and distance conflict: the 123rd NY lay on its arms the night of Jul 1 (Rogers) and McDougall puts the breastworks about 40 paces in advance of the stone wall, built after the brigade went into position on Jul 2; the seed\'s evening Jul 1 and 10 rods (about 165 ft) come from a soldier\'s letter via a secondary page.',
    [SUB('The 123rd NY lay on its arms the night of Jul 1', D, S_, ['r_arms']),
     SUB('McDougall: the front line was about 40 paces in advance of the stone wall, "when we immediately built breastworks"', D, S_, ['m_40']),
     SUB('Breastworks begun the evening of Jul 1, about 10 rods (165 ft) in front of a heavy stone wall', I, C_, [], 'soldier\'s letter via HistoryNet (secondary, not re-read)')],
    {'r_arms': ('OR27-1-R279', 'Lay on our arms that night'),
     'm_40': ('OR27-1-R274', 'about 40 paces in advance, when we immediately built breastworks')},
    scenarios=[SCN('A', 'Works begun the evening of Jul 1, about 10 rods in front of the wall', 'seed (HN-HRL, soldier letter via a secondary page)', I),
               SCN('B', 'Works built on Jul 2 about 40 paces in front of the wall, which is in rear of the front line', 'OR27-1-R279 and R274', D, ['r_arms', 'm_40'])],
    remains=['evening Jul 1 start (secondary only)'], register='tl-05-EG-002')

ROW('T2-010', 'partially_supported',
    'Johnson moved along the railroad late on the night of Jul 1 and Ewell sent him the order to take the wooded hill after 12 o\'clock at night; the seed\'s arrival about 19:00 and a dusk order are not in the reports.',
    [SUB('Johnson wrote that late on the night of Jul 1 he moved along the Gettysburg railroad', D, S_, ['j_late']),
     SUB('Ewell sent Johnson the order to take possession of the hill on returning to his headquarters after 12 o\'clock at night', D, S_, ['e_orders']),
     SUB('Johnson arrives about 19:00 (EPP) or after sunset about 19:32 (SS1) and Ewell orders the extension then', I, C_, [], 'secondary values; no dusk order in the OR')],
    {'j_late': ('OR27-2-R481', 'Late on the night of July 1, I moved along the Gettysburg'),
     'e_orders': ('OR27-2-R467', 'on my return to my headquarters, after 12 o \'clock at night, I sent orders to Johnson')},
    scenarios=[SCN('A', 'Arrival about 19:00-19:32 and extension order then', 'seed (EPP, SS1)', I),
               SCN('B', 'Johnson late on the night; Ewell\'s order after midnight', 'OR27-2-R481 p.504, R467 p.446', D, ['j_late', 'e_orders'])],
    register='tl-05-EG-001')

ROW('T2-011', 'partially_supported',
    'Coulter\'s report puts the move to support the Third Corps (about 7 o\'clock) and the Emmitsburg road position (about 10 p. m.) after the sentence that the brigade stayed until relieved "about noon next day", i.e. on Jul 2; the seed dates them Jul 1.',
    [SUB('Coulter: later in the evening (of Jul 1) the brigade moved toward the left and took position on the left of the Eleventh Corps', D, S_, ['c_eve']),
     SUB('Coulter: the brigade remained there, having built breastworks, until relieved about noon next day (Jul 2)', D, S_, ['c_noon']),
     SUB('About 7 o\'clock in the evening (printed after the noon sentence, therefore Jul 2) the brigade moved to support the Third Corps', D, S_, ['c_7']),
     SUB('The 19:00 and 22:00 moves happen on Jul 1', I, X_, [], 'passage order places them on Jul 2'),
     SUB('Breastwork dimensions', G, U_, [], 'not stated')],
    {'c_eve': ('OR27-1-R044', 'Later in the evening, moved toward the left'),
     'c_noon': ('OR27-1-R044', 'until relieved by the Third Division, Second Corps, about noon next day'),
     'c_7': ('OR27-1-R044', 'About 7 o\'clock in the evening')},
    scenarios=[SCN('A', 'The 19:00 and 22:00 moves on Jul 1', 'seed', I), SCN('B', 'The moves on Jul 2', 'Coulter OR27-1-R044 pp.293-294', D, ['c_7'])],
    remains=['breastwork dimensions'], register='tl-05-EG-002')

ROW('T2-012', 'partially_supported',
    'Johnson formed his line and sent a reconnoitering party to the hill; it met a superior force and a portion was captured (Ewell relating Johnson); no 7th Indiana picket is named and the time is late night, not after sunset.',
    [SUB('Johnson stated that after forming his line he sent a reconnoitering party to the hill; on nearing the summit it was met by a superior force which captured a portion, the rest escaping', D, S_, ['e_recon']),
     SUB('Johnson moved late on the night of Jul 1', D, S_, ['j_late']),
     SUB('The force met was the I Corps / 7th Indiana picket; time after sunset (about 19:00-19:32)', I, U_, [], 'unit not named in the reports; hour is a secondary value')],
    {'e_recon': ('OR27-2-R467', 'This party, on nearing the summit, was met by a superior force of the enemy, which succeeded in capturing a portion of the reconnoitering party'),
     'j_late': ('OR27-2-R481', 'Late on the night of July 1')},
    scenarios=[SCN('A', 'After sunset about 19:00-19:32, 7th Indiana picket, an officer and a man captured', 'seed (EPP, W-CH, W-D1)', I),
               SCN('B', 'After Johnson formed line, late at night; a portion captured, unit not named', 'OR27-2-R467 p.446, R481 p.504', D, ['e_recon'])],
    register='tl-05-EG-001')

ROW('T2-013', 'partially_supported',
    'Computed row (sunset 19:32 LMT; civil twilight ends about 20:04; astronomical twilight ends about 21:33) reproduces from the project ephemeris; it is not a source-text claim and carries no non-lead citation.',
    [SUB('Sunset 19:32 LMT, civil dusk 20:04, astronomical dusk 21:33 on Jul 1 1863 (project ephemeris, recomputed by the shard)', I, K_, [], 'COMPUTED; not checked against a USNO table'),
     SUB('Local sunset is earlier by an estimated 10-20 minutes because of the western hills', I, U_, [], 'estimate')],
    register='tl-05-EG-001', tier='inferred')

ROW('T2-014', 'partially_supported',
    'Moonrise 19:53 LMT and 99% illumination are computed; "cloud largely hid the moon" and the 21:00 overcast reading reach the repository only through secondary summaries of Jacobs (primary sheets not found).',
    [SUB('Moonrise about 19:53 LMT, 99.0% lit (project ephemeris)', I, K_, [], 'COMPUTED'),
     SUB('Cloud largely hid the moon; Jacobs 21:00 overcast', I, U_, [], 'secondary (Nofi, TeachersFirst); Jacobs original sheets not found (failed lookup 2026-11-04)')],
    register='tl-05-EG-013', tier='inferred')

ROW('T2-015', 'partially_supported',
    'Row (EPP, single weak source): about 20:00 Johnson decides to attack in the morning. In the OR Ewell, not Johnson, holds the decision; Johnson reported the superior force and was to refrain until Ewell ordered.',
    [SUB('Johnson reported that his reconnoitering party met a superior force', D, S_, ['e_recon']),
     SUB('Johnson decides about 20:00 to attack in the morning', I, U_, [], 'EPP only; the OR does not record a decision at that hour')],
    {'e_recon': ('OR27-2-R467', 'This party, on nearing the summit, was met by a superior force of the enemy, which succeeded in capturing a portion of the reconnoitering party')},
    scenarios=[SCN('A', 'About 20:00 Johnson decides to attack in the morning', 'seed (EPP)', I),
               SCN('B', 'The attack decision rests with Ewell and Lee in the small hours', 'OR27-2-R467 p.446', D, ['e_recon'])],
    register='tl-05-EG-001')

ROW('T2-016', 'partially_supported',
    'Wright (OR): "Just before dark on the evening of July 1" the corps at Manchester received orders to move to Taneytown and was immediately put in motion; during the night the destination was changed to Gettysburg. The seed\'s 20:00 and the 30-35 mile distance are not in this passage.',
    [SUB('Just before dark on the evening of Jul 1, the corps being in camp near Manchester, orders were received to move to Taneytown and the troops were immediately put in motion', D, S_, ['w_dark']),
     SUB('During the night other orders changed the destination to Gettysburg', D, S_, ['w_night']),
     SUB('The march begins about 20:00', I, U_, [], 'Wright: just before dark (about 19:00-19:30); resumed about 21:00 per the shard\'s audit record (not re-found here)'),
     SUB('Distance about 30 miles (W-D2) or about 35 miles (SS1)', I, C_, [], 'secondary values; Wright\'s own figure is on p.665-666 and not cited here')],
    {'w_dark': ('OR27-1-R224', 'Just before dark on the evening of July 1, the corps being in camp near Manchester, orders were received to move to Taneytown'),
     'w_night': ('OR27-1-R224', 'During the night, and some time after crossing the Baltimore and Gettysburg pike, other orders were received, changing the destination of the corps')},
    remains=['start hour 20:00', 'the 30 versus 35 mile distance'], register='tl-05-EG-001')

ROW('T2-017', 'corrected',
    'Birney\'s division reached Gettysburg at 5.30 p. m. on Jul 1 (his own report), not at dusk about 20:00; the Wikipedia claim that the II Corps arrived about 22:30 on Jul 1 is contradicted by Hancock (II Corps about 3 miles in rear that night).',
    [SUB('Birney: "My command reached Gettysburg at 5.30 p. m."', D, S_, ['b_530']),
     SUB('Hancock: the Second Corps bivouacked for the night (of Jul 1) about 3 miles in rear of the town', D, S_, ['h_bivouac']),
     SUB('Birney arrives about 20:00 at dusk', D, X_, [], 'contradicted by Birney p.482')],
    {'b_530': ('OR27-1-R133', 'My command reached Gettysburg at 5.30 p. m'),
     'h_bivouac': ('OR27-1-R076', 'bivouacked for the night about 3 miles in rear of the town')},
    scenarios=[SCN('A', 'Birney arrives about 20:00 (W-CEMR)', 'seed (Wikipedia, lead only)', I),
               SCN('B', 'Birney arrives 17:30', 'OR27-1-R133 p.482', D, ['b_530'])],
    register='tl-05-EG-002')

ROW('T2-018', 'gap',
    'Neither the time of day nor the date of Lee\'s headquarters near the Thompson house is in an OR passage; the only source read is an interpretive NPS article (morning) against the seed (evening), a time-of-day conflict with no primary source.',
    [SUB('Lee\'s headquarters established at the Mary Thompson house on the Chambersburg Pike, evening of Jul 1', G, C_, [], 'NPS article places it in the morning; not a local text; neither value is primary')],
    remains=['primary source (Lee, Long, Venable, Marshall) for the establishment of the headquarters and its hour'],
    searched=[SR(r'Thompson', near=r'(headquarters|Hdqrs)', win=300, what='Thompson house and headquarters, OR27', parts=(1, 2, 3))],
    register='tl-05-EG-016', tier='open gap')

ROW('T2-019', 'partially_supported',
    'Ewell: "I received orders soon after dark to draw my corps to the right" (sender "the commanding general"); the seed\'s about 20:30 is consistent with soon after dark (sunset 19:32); the seed tier is inferred, so the row is not promoted.',
    [SUB('Ewell received orders soon after dark to draw his corps to the right, in case it could not be used to advantage where it was', D, S_, ['e_dark'])],
    {'e_dark': ('OR27-2-R467', 'I received orders soon after dark to draw my corps to the right')},
    remains=['the hour about 20:30 is an interpolation inside "soon after dark"'], register='tl-05-EG-001', tier='documented')

ROW('T2-020', 'partially_supported',
    'Humphreys was guided toward the Black Horse Tavern, found himself near the enemy in force, retraced his steps and bivouacked at 1 a. m. on Jul 2; the 21:00 hour of the encounter is not printed.',
    [SUB('Guided toward the Black Horse Tavern, Humphreys found himself in the immediate vicinity of the enemy, who occupied that road in strong force', D, S_, ['h_bht']),
     SUB('Humphreys\'s division was bivouacking at 1 a. m. on Jul 2', D, S_, ['h_biv']),
     SUB('The encounter occurred about 21:00', I, U_, [], 'EPP interpolation between 15:00 departure and 01:00 bivouac')],
    {'h_bht': ('OR27-1-R158', 'upon approaching the Black Horse Tavern, I found myself in the immediate vicinity of the enemy, who occupied that road in strong force'),
     'h_biv': ('OR27-1-R158', 'bivouacking at 1 a. m. on July 2')},
    register='tl-05-EG-002')

ROW('T2-021', 'partially_supported',
    'O\'Neal was recalled and ordered to form beyond the railroad, "Here I rested that night"; Ramseur halted and formed line in a street running east and west; the shard\'s Rodes and Doles statements were not re-found for this close-out.',
    [SUB('O\'Neal was recalled, ordered to form his brigade beyond the railroad, and rested there that night', D, S_, ['o_rest']),
     SUB('Ramseur received an order to halt and form line of battle in a street in Gettysburg running east and west', D, S_, ['r_street']),
     SUB('Rodes\'s other brigades set up a line on an east-west street (Rodes, Doles)', I, U_, [], 'Doles\'s report not read; Rodes\'s own wording not located')],
    {'o_rest': ('OR27-2-R523', 'Here I rested that night'),
     'r_street': ('OR27-2-R518', 'form line of battle in a street in Gettysburg running east and west')},
    register='tl-05-EG-003')

ROW('T2-022', 'gap',
    'OR reports show the seminary used as a hospital (McFarland: 173 wounded collected by Jul 6; Dance: a battery near the seminary used as a Yankee hospital); the Presbyterian church, college, courthouse, St. Francis Xavier hospitals, the Old Dorm last patient date and the surgeons-stay claim rest on sources not read.',
    [SUB('Hospital use of the seminary', D, U_, [], 'dated Jul 1-6 in the OR; the shard\'s McFarland and Dance entries were not re-found here'),
     SUB('Presbyterian church, college, courthouse and St. Francis Xavier hospitals; Old Dorm last patient Sept 16; surgeons stay', G, U_, [], 'HMDB/NPS/Stone Sentinels pages not retrieved')],
    remains=['site list, dates and counts'], register='tl-05-EG-011', tier='open gap')

ROW('T2-023', 'gap',
    'McPherson barn used as a hospital, date inferred as Jul 1 and the statement that it did not burn: Stone Sentinels, Emerging Civil War and NPS building data, none a local text and none re-read.',
    [SUB('The barn was captured and used as a field hospital on Jul 1 night', I, U_, [], 'date inferred by the seed note; no local source text'),
     SUB('The barn did not burn on Jul 1', I, U_, [], 'modern-source claim; needs an NPS building record')],
    remains=['non-lead primary or NPS record for the barn use and date'], register='tl-05-EG-012', tier='inferred')

ROW('T2-024', 'gap',
    'Klingle farm with 14-16 wounded Confederates and the family leaving on Jul 2 rests on Stone Sentinels only; no non-lead source retrieved.',
    [SUB('Klingle farm sheltered 14-16 wounded Confederates through the night; the family left Jul 2', G, U_, [], 'SS-KLINGLE not a local text; not documented under Law cl.4')],
    remains=['a non-lead source for the wounded and the family'], register='tl-05-EG-013', tier='open gap')

ROW('T2-025', 'partially_supported',
    'Ewell told the commanding general the hill was unoccupied by the enemy and "He decided to let me remain"; the 22:00 hour and Ewell\'s belief that Johnson "had not taken" the hill are not printed (Ewell believed the hill unoccupied by the enemy).',
    [SUB('Ewell represented that the hill was unoccupied by the enemy, and the commanding general decided to let him remain', D, S_, ['e_remain']),
     SUB('Ewell returned to his headquarters after 12 o\'clock at night', D, S_, ['e_orders']),
     SUB('The exchange is at about 22:00', I, U_, [], 'EPP; the OR places Ewell back at his headquarters after midnight')],
    {'e_remain': ('OR27-2-R467', 'He decided to let me remain'),
     'e_orders': ('OR27-2-R467', 'on my return to my headquarters, after 12 o \'clock at night, I sent orders to Johnson')},
    register='tl-05-EG-001')

ROW('T2-026', 'partially_supported',
    'Early\'s own report says he rode to find Ewell, Rodes or Hill "for the purpose of urging an immediate advance"; the seed (Wikipedia) has him opposing an attack on Culp\'s Hill; the York-road report and Gordon\'s detachment are supported.',
    [SUB('Early rode to find the corps commander for the purpose of urging an immediate advance', D, S_, ['e_urge']),
     SUB('Early opposes attacking Culp\'s Hill', I, C_, [], 'W-D1; contradicted by Early\'s own report of urging advance')],
    {'e_urge': ('OR27-2-R470', 'for the purpose of urging an immediate advance')},
    scenarios=[SCN('A', 'Early opposes attacking Culp\'s Hill', 'seed (W-D1)', I),
               SCN('B', 'Early urges an immediate advance', 'OR27-2-R470 p.469', D, ['e_urge'])],
    remains=['Gordon and Smith York-road detachment: not quoted in this close-out'], register='tl-05-EG-004')

ROW('T2-027', 'unsupported',
    'Batchelder\'s 13th Massachusetts report has the regiment on Cemetery Hill supporting batteries on Jul 2; no rails, rifle pit or Bryan farm appear for the night of Jul 1-2 (shard read).',
    [SUB('13th Massachusetts gathers rails and digs a rifle pit south of the Bryan farm on the night of Jul 1-2', G, U_, [], 'not in the OR report; Cemetery Hill placement on Jul 2 sits uneasily with the seed place')],
    remains=['rails, rifle pit and Bryan-farm location'], register='tl-05-EG-007', tier='open gap')

ROW('T2-028', 'partially_supported',
    'Calef: the battery remained in position until toward evening, then moved to the left about a mile and bivouacked for the night; "near the Third Corps" and the six 3-inch rifles are not in the passage.',
    [SUB('Calef\'s battery moved to the left about a mile toward evening and bivouacked for the night', D, S_, ['c_mile']),
     SUB('The bivouac was near the Third Corps; six 3-inch rifles', I, U_, [], 'not in this passage')],
    {'c_mile': ('OR27-1-R374', 'Remained in this position until toward evening, when we moved to the left about a mile, and bivouacked for the night')},
    register='tl-05-EG-008', tier='inferred')

ROW('T2-029', 'partially_supported',
    'Pickets for three commands are in the OR (Johnson: pickets thrown well to the front; Geary: the command rested on their arms); picket fires, sentry posts and the other commands named in the seed remain a gap.',
    [SUB('Johnson: pickets were thrown well to the front and the troops slept on their arms', D, S_, ['j_pick']),
     SUB('Geary: the command rested on their arms during the night', D, S_, ['g_rest']),
     SUB('Picket details, fires and sentry posts of the other commands (Gibbon, Hays, Early, Rodes)', G, U_, [], 'not read')],
    {'j_pick': ('OR27-2-R481', 'Pickets were thrown well to the front, and the troops slept on their arms'),
     'g_rest': ('OR27-1-R293', 'The command rested on their arms during the night')},
    remains=['fires, sentry posts, details of other commands'], register='tl-05-EG-009', tier='open gap')

ROW('T2-030', 'gap',
    'Design hypothesis (rear campfires at 2000-2500 K, no fires on contact lines): no source; plausible-procedural and marked.',
    [SUB('Campfires and cooking in rear camps; no fires on contact lines', P, 'procedural', [], 'unsourced military practice; ENV-NIGHT design hypothesis')],
    register=None, tier='plausible-procedural')

ROW('T2-031', 'gap',
    'Civilian sheltering in cellars, house searches and snipers from dawn Jul 2 rest on ABT, Gettysburg Daily and Wikipedia pages; no non-lead source retrieved.',
    [SUB('Civilians shelter in cellars; Confederates control the town and search houses; snipers occupy buildings from dawn Jul 2', G, U_, [], 'ABT-CIV, GD-TOWN, W-BATTLEFIELD are not documented under Law cl.4')],
    remains=['a civilian diary or account read directly'], register='tl-05-EG-014', tier='open gap')

ROW('T2-032', 'gap',
    'Burials, campfires and civilian activity of the night of Jul 1-2: open gap confirmed (no source retrieved).',
    [SUB('Detail of burials, campfires and civilian activity on the night of Jul 1-2', G, U_, [], 'seed itself an open gap')],
    remains=['the Compiler, the Jacobs, Pierce and Wade accounts named in the seed'], register='tl-05-EG-014', tier='open gap')

ROW('T2-033', 'unsupported',
    'A cavalry camp at the edge of the tenant\'s wheat field (Rose/Ogden land) rests on Stone Sentinels; Buford\'s report puts his division bivouacked on the left of the position and names no wheat field.',
    [SUB('A cavalry camp (unit not named) at the edge of the wheat field of the Ogden/Rose land', G, U_, [], 'SB-ROSE only; unit and location open')],
    remains=['unit and place of the camp'], register='tl-05-EG-015', tier='open gap')

ROW('T2-034', 'partially_supported',
    'Merritt: "On the 2d instant, we marched to Emmitsburg"; Buford\'s bivouac on the left and pickets toward Fairfield are in his report; brigade positions of Gamble and Devin for the night remain a gap.',
    [SUB('Merritt\'s reserve brigade marched to Emmitsburg on the 2d', D, S_, ['m_emm']),
     SUB('Night positions of Gamble\'s and Devin\'s brigades', G, U_, [], 'not found')],
    {'m_emm': ('OR27-1-R340', 'On the 2d instant, we marched to Emmitsburg')},
    remains=['Buford\'s brigades on the night of Jul 1-2'], register='tl-05-EG-009', tier='open gap')

ROW('T2-035', 'partially_supported',
    'Stuart\'s report: at Carlisle he shelled the town, burned the cavalry barracks, received a dispatch from Lee during the night that the army was at Gettysburg and started that night; his advance reached Gettysburg Jul 2. The seed names Chambliss at Carlisle, which his report does not; the departure hour is a declared gap.',
    [SUB('At Carlisle Stuart was forced to shell the place; only the United States cavalry barracks were burned, by his order', D, S_, ['s_shell']),
     SUB('During the night Stuart received a dispatch from General Lee that the army was at Gettysburg, and started himself that night', D, S_, ['s_night']),
     SUB('His advance reached Gettysburg on Jul 2', D, S_, ['s_jul2']),
     SUB('The three brigades were Hampton\'s, Fitz Lee\'s and Chambliss\'s', I, U_, [], 'Stuart names Hampton, Fitz Lee and W. H. F. Lee; Chambliss commanded the last only after Brandy Station and is not named at Carlisle')],
    {'s_shell': ('OR27-2-R565', 'I was forced to the alternative of shelling the place'),
     's_night': ('OR27-2-R565', 'during the night, I received a dispatch from General Lee'),
     's_jul2': ('OR27-2-R565', 'My advance reached Gettysburg July 2')},
    remains=['departure hour from Carlisle'], register='tl-05-EG-010')

ROW('T2-036', 'partially_supported',
    'Hunt: Meade reached Gettysburg about 2 a.m. of the 2d and he was directed to see to the artillery; the Reserve\'s overnight placement times are not printed, and "Spangler farm" is not an OR place name.',
    [SUB('Hunt: Meade reached Gettysburg about 2 a. m. of the 2d', D, S_, ['hu_2am']),
     SUB('Arrival times and overnight battery placement of the Artillery Reserve', G, U_, [], 'Tyler\'s p.872-873 entries not re-found here')],
    {'hu_2am': ('OR27-1-R028', 'reached Gettysburg about 2 a. m. of the 2d')},
    remains=['Reserve arrival times and overnight batteries'], register='tl-05-EG-008', tier='open gap')

ROW('T2-037', 'partially_supported',
    'Two OR pictures: McLaws\'s division at Marsh Creek, 4 miles from Gettysburg, a little after dark (Longstreet) and Kershaw about 2 miles out going into camp at 12 p. m.; the seed has the whole division at Marsh Creek about 00:00.',
    [SUB('Longstreet: McLaws\' division reached Marsh Creek, 4 miles from Gettysburg, a little after dark', D, S_, ['l_marsh']),
     SUB('Kershaw: marched to a point on the Gettysburg road some 2 miles from the place, going into camp at 12 p. m.', D, S_, ['k_camp'])],
    {'l_marsh': ('OR27-2-R430', 'McLaws\' division, however, reached Marsh Creek, 4 miles from Gettysburg, a little after dark'),
     'k_camp': ('OR27-2-R432', 'going into camp at 12 p. m')},
    scenarios=[SCN('A', 'Division at Marsh Creek about 00:00', 'seed (EPP)', I),
               SCN('B', 'Division at Marsh Creek a little after dark (about 20:00-21:00); Kershaw 2 miles out at 24:00', 'Longstreet R430 p.358; Kershaw R432 p.366', D, ['l_marsh', 'k_camp'])],
    remains=['the strung-out column reading is inferred'], register='tl-05-EG-004')

ROW('T2-038', 'confirmed',
    'Kershaw\'s own report: on Jul 1 the brigade marched to a point on the Gettysburg road some 2 miles from the town, "going into camp at 12 p. m."',
    [SUB('Kershaw\'s brigade marched on Jul 1 to a point on the Gettysburg road about 2 miles from Gettysburg', D, S_, ['k_2mi']),
     SUB('It went into camp at 12 p. m. (about midnight)', D, S_, ['k_camp'])],
    {'k_2mi': ('OR27-2-R432', 'we marched to a point on the Gettysburg road, some 2 miles from that place'),
     'k_camp': ('OR27-2-R432', 'going into camp at 12 p. m')})

ROW('T2-039', 'partially_supported',
    'Meade arrived "at 1 a. m. of the 2d" (Meade) or about 2 a. m. (Hunt); the Evergreen gatehouse and a conference with corps commanders that night are not in these passages (Meade: "So soon as it was light, I proceeded to inspect").',
    [SUB('Meade: arriving there at 1 a. m. of the 2d', D, S_, ['m_1am']),
     SUB('Hunt: Meade reached Gettysburg about 2 a. m. of the 2d', D, S_, ['hu_2am']),
     SUB('So soon as it was light Meade proceeded to inspect the lines (pre-dawn inspection)', D, S_, ['m_light']),
     SUB('Meade confers with corps commanders at the Evergreen gatehouse on arrival', I, U_, [], 'not in the OR passages; EPP puts the arrival at 04:00')],
    {'m_1am': ('OR27-1-R006', 'arriving there at 1 a. m. of the 2d'),
     'hu_2am': ('OR27-1-R028', 'reached Gettysburg about 2 a. m. of the 2d'),
     'm_light': ('OR27-1-R006', 'So soon as it was light, I proceeded to inspect')},
    scenarios=[SCN('A', 'Arrival 01:00', 'Meade OR27-1-R006 p.115', D, ['m_1am']), SCN('B', 'Arrival about 02:00', 'Hunt OR27-1-R028 p.232', D, ['hu_2am']),
               SCN('C', 'Arrival 04:00', 'seed (EPP, non-OR)', I)],
    register='tl-05-EG-005')

ROW('T2-040', 'partially_supported',
    'Humphreys\'s report has his division bivouacking at 1 a. m. on Jul 2 near Gettysburg, east of the Emmitsburg road; the seed (EPP) has it on Cemetery Ridge about midnight, and the row note that 02:00 is the B.2.5 default has no OR backing.',
    [SUB('Humphreys: bivouacking at 1 a. m. on July 2', D, S_, ['h_biv']),
     SUB('The division arrives about 00:00 on Cemetery Ridge', I, C_, [], 'EPP single weak source')],
    {'h_biv': ('OR27-1-R158', 'bivouacking at 1 a. m. on July 2')},
    scenarios=[SCN('A', 'About 00:00', 'seed (EPP)', I), SCN('B', '01:00, east of the Emmitsburg road', 'OR27-1-R158 p.531', D, ['h_biv']), SCN('C', 'About 02:00', 'T2-042 seed (SS1)', I)],
    register='tl-05-EG-004', tier='inferred')

ROW('T2-041', 'partially_supported',
    'Longstreet: Hood\'s division got within nearly the same distance of the town (4 miles) about 12 o\'clock at night; the seed\'s 01:00 halt at Marsh Creek is about an hour later.',
    [SUB('Hood\'s division got within nearly the same distance of the town about 12 o\'clock at night', D, S_, ['l_hood'])],
    {'l_hood': ('OR27-2-R430', 'got within nearly the same distance of the town about 12 o\'clock at night')},
    scenarios=[SCN('A', 'Halts about 01:00', 'seed (EPP)', I), SCN('B', 'About 24:00', 'OR27-2-R430 p.358', D, ['l_hood'])],
    register='tl-05-EG-004', tier='inferred')

ROW('T2-042', 'corrected',
    'Humphreys\'s division bivouacked at 1 a. m. on Jul 2 (his report), not about 02:00; the event (backtracking from the Black Horse Tavern road and halting near the Third Corps) is supported.',
    [SUB('Humphreys: bivouacking at 1 a. m. on July 2', D, S_, ['h_biv']),
     SUB('The division reaches Sickles about 02:00', D, X_, [], 'hour differs from Humphreys\'s own report')],
    {'h_biv': ('OR27-1-R158', 'bivouacking at 1 a. m. on July 2')},
    scenarios=[SCN('A', 'About 02:00', 'seed (SS1)', I), SCN('B', '01:00', 'OR27-1-R158 p.531', D, ['h_biv'])],
    register='tl-05-EG-004')

ROW('T2-043', 'partially_supported',
    'Hunt examined the positions on Cemetery Hill as far as darkness permitted; the overnight placement and resupply of the named batteries is not in the passages read.',
    [SUB('Overnight placement and resupply of Hunt\'s batteries on the line (Hazard, Osborn, Randolph)', G, U_, [], 'Hunt p.232 and Tyler p.873 entries not re-found here')],
    remains=['battery-by-battery placement and ammunition'], register='tl-05-EG-008', tier='open gap')

ROW('T2-044', 'partially_supported',
    'Anderson stayed in position until the morning of the 2d; Lee\'s overnight reconnaissance and the contents of his plan are not in the reports cited.',
    [SUB('Lee\'s overnight reconnaissance and plan; Anderson\'s and Rodes\'s overnight positions', G, U_, [], 'Anderson p.613 entry ("until the morning of the 2d") occurs twice in the text and is not unique')],
    remains=['Lee\'s reconnaissance and plan'], register='tl-05-EG-017', tier='open gap')

ROW('T2-045', 'partially_supported',
    'OR supports Wadsworth\'s (I Corps) breastworks from Jul 1 and XII Corps works from the morning of Jul 2 ("immediately thrown up", "immediately built breastworks"); DMNA\'s "night of July 1-2" start is not in these reports; hour-by-hour night work is a gap.',
    [SUB('Geary\'s division: breastworks "immediately thrown up" on taking position on Jul 2', D, S_, ['g_up']),
     SUB('McDougall: front line about 40 paces in advance, "when we immediately built breastworks"', D, S_, ['m_bw']),
     SUB('Construction began the night of Jul 1-2 (DMNA 60th NY)', I, C_, [], 'secondary; not supported by the OR passages'),
     SUB('Hour-by-hour work and watch during the night', G, U_, [], 'not documented')],
    {'g_up': ('OR27-1-R293', 'immediately thrown up'),
     'm_bw': ('OR27-1-R274', 'immediately built breastworks')},
    scenarios=[SCN('A', 'XII Corps works begin the night of Jul 1-2', 'seed (DMNA60)', I), SCN('B', 'XII Corps works begin the morning of Jul 2', 'OR27-1-R293 p.826, R274 p.783', D, ['g_up', 'm_bw'])],
    register='tl-05-EG-007', tier='open gap')

ROW('T2-046', 'gap',
    'Ground fog and dew over low ground before dawn: inference from a foggy dawn recorded by Strategypage (secondary) and humid conditions; no nighttime observation exists.',
    [SUB('Ground fog and dew over low ground before dawn; very humid air', P, 'procedural', [], 'ENV-WX inference')],
    tier='plausible-procedural')

ROW('T2-047', 'corrected',
    'Moon illumination from the project ephemeris: 98.55% at 00:00 and 97.95% at 04:35 on Jul 2; the seed\'s "99% falling to 93% by dawn" mixes the Jul 1 moonrise value with the Jul 3 dawn value (93.1%). Computed, not a source-text claim.',
    [SUB('Moon altitude/azimuth at 00:00 and 02:00 LMT on Jul 2: 29.96 deg/163.8 and 30.31 deg/195.9 (project ephemeris)', I, K_, [], 'COMPUTED'),
     SUB('Illumination falls from 99% to 93% by dawn of Jul 2', I, X_, [], 'ephemeris gives 98.0% at dawn of Jul 2; 93% is Jul 3 dawn'),
     SUB('Moon hidden by cloud (Nofi)', I, U_, [], 'secondary')],
    scenarios=[], register='tl-05-EG-018', tier='inferred')

ROW('T2-048', 'unsupported',
    'Longstreet\'s report: Law\'s brigade "joined about noon on the 2d"; the seed\'s 03:00 departure of Longstreet (Cullen via Freeman) and of Law (B&L via Freeman) is not in any OR report; EPP has 06:00.',
    [SUB('Law\'s brigade was ordered forward to its division during the day and joined about noon on the 2d', D, S_, ['l_noon']),
     SUB('Longstreet leaves camp at 03:00 and Law\'s brigade starts at 03:00', G, U_, [], 'Freeman citations of Cullen and B&L p.319; not in the OR')],
    {'l_noon': ('OR27-2-R430', 'joined about noon on the 2d')},
    scenarios=[SCN('A', '03:00', 'seed (FREE)', I), SCN('B', 'morning of the 2d, no hour', 'Scruggs OR27-2-R443 p.391 (not re-quoted here)', I), SCN('C', '06:00', 'seed (EPP)', I)],
    remains=['03:00 departure of Longstreet and Law'], register='tl-05-EG-006', tier='open gap')

ROW('T2-049', 'partially_supported',
    'Shepherd\'s regiment (2nd Georgia, Benning\'s brigade) "At .3 a. m. it resumed the march" (OCR digit uncertain; the printed volume was not checked); the seed has Hood\'s division at 03:30.',
    [SUB('One regiment of Benning\'s brigade resumed the march at about 3 a. m. on Jul 2 (OCR reads ".3 a. m.")', D, S_, ['sh_3am'], 'OCR digit; printed-volume check not done'),
     SUB('Hood\'s division resumes the march about 03:30', I, U_, [], 'EPP; a regiment of one brigade is not the division')],
    {'sh_3am': ('OR27-2-R459', 'At .3 a. m. it resumed the march')},
    register='tl-05-EG-004', tier='inferred')

ROW('T2-050', 'partially_supported',
    'Hancock: the Second Corps arrived on the field about 7 a. m. of the 2d; Webb: brigade put in position at 6.30 a. m. on Granite Ridge; the seed\'s pre-dawn/dawn arrival and the 13th Massachusetts (I Corps) are not in these passages.',
    [SUB('Hancock: Second Corps arrival on the field about 7 a. m. of the 2d', D, S_, ['h_7']),
     SUB('Webb: brigade put in position at 6.30 a. m. on the 2d, on Granite Ridge', D, S_, ['w_630']),
     SUB('Hancock rides the lines and II Corps moves in pre-dawn to dawn around the 13th Massachusetts', I, C_, [], 'EPP 06:00, OR 06:30-07:00; Wikipedia 22:30 Jul 1 contradicted')],
    {'h_7': ('OR27-1-R076', 'about 7 a. m. of the 2d'),
     'w_630': ('OR27-1-R104', 'put in position at 6.30 a. m. on the 2d, on Granite Ridge')},
    scenarios=[SCN('A', 'Pre-dawn to dawn', 'seed', I), SCN('B', 'About 06:00', 'EPP', I), SCN('C', '06:30-07:00', 'OR27-1-R104 p.427, R076 p.369', D, ['h_7', 'w_630'])],
    register='tl-05-EG-007')

ROW('T2-051', 'partially_supported',
    'Kershaw: "The command was ordered to move at 4 o\'clock on the morning of the 2d, but did not leave camp until about sunrise"; the order to move at 4 is in the OR, while "changed to sunrise" as an order and Hood\'s role are not stated.',
    [SUB('The command (Kershaw\'s) was ordered to move at 4 o\'clock on the 2d but did not leave camp until about sunrise', D, S_, ['k_sun'])],
    {'k_sun': ('OR27-2-R432', 'did not leave camp until about sunrise')},
    remains=['an order "changed to sunrise"'], register='tl-05-EG-004')

ROW('T2-052', 'partially_supported',
    'Computed row: civil dawn about 04:03 and sunrise 04:35 LMT on Jul 2 (project ephemeris); Freeman and Thayer values are secondary.',
    [SUB('Civil twilight begins 04:03 and sunrise 04:35 LMT, Jul 2', I, K_, [], 'COMPUTED')], tier='inferred')

ROW('T2-053', 'gap',
    'Foggy dawn, 74 F at 07:00 and overcast at 08:00 reach the repository only through secondary summaries of Jacobs; the primary Jacobs thermometer sheets were not found (failed lookup).',
    [SUB('Foggy dawn; 74 F at 07:00; overcast at 08:00; gentle south breeze', G, U_, [], 'Strategypage, Emerging Civil War, TeachersFirst: secondary')],
    remains=['primary Jacobs readings'], register='tl-05-EG-018', tier='open gap')

ROW('T2-054', 'partially_supported',
    'Computed row: sunrise 04:35 LMT; the cloud-cover statement (overcast to afternoon clearing versus drizzle) is secondary and conflicting.',
    [SUB('Sunrise 04:35 LMT, Jul 2', I, K_, [], 'COMPUTED'),
     SUB('Overcast until clearing in the afternoon (Jacobs 08:00, Boston Globe) versus drizzle (Strategypage)', I, C_, [], 'secondary')], tier='inferred')

ROW('T2-055', 'partially_supported',
    'Geary (R293): "At 5 a. m. on the 2d, having been relieved by the Third Army Corps" his division was placed right of center; Birney: "At 7 a. m., under orders from Major-General Sickles, I relieved Geary\'s division"; Little Round Top by name is the seed\'s EPP only.',
    [SUB('Geary: at 5 a. m. on the 2d, having been relieved by the Third Army Corps, the division was moved', D, S_, ['g_5am']),
     SUB('Birney: at 7 a. m., under orders from Sickles, he relieved Geary\'s division', D, S_, ['b_7am']),
     SUB('Geary leaves Little Round Top about 05:00 and moves to reinforce Culp\'s Hill', I, C_, [], 'EPP names Little Round Top; the reports have Geary near Sugar Loaf Mountain')],
    {'g_5am': ('OR27-1-R293', 'At 5 a. m. on the 2d, having been relieved by the Third Army Corps'),
     'b_7am': ('OR27-1-R133', 'At 7 a. m., under orders from Major-General Sickles, I relieved Geary\'s division')},
    scenarios=[SCN('A', 'Geary leaves about 05:00', 'Geary OR27-1-R293 p.825', D, ['g_5am']), SCN('B', 'Relieved at 07:00', 'Birney OR27-1-R133 p.482', D, ['b_7am'])],
    register='tl-05-EG-004')

ROW('T2-056', 'partially_supported',
    'Slocum: "The Fifth Corps arrived at 5 a. m. on July 2"; Sykes: reached the field about 8 a. m. and massed near the Rock Creek bridge; "near Power\'s Hill" is not an OR statement.',
    [SUB('Slocum: the Fifth Corps arrived at 5 a. m. on July 2', D, S_, ['sl_5am']),
     SUB('V Corps near Power\'s Hill', I, U_, [], 'not in either report')],
    {'sl_5am': ('OR27-1-R271', 'The Fifth Corps arrived at 5 a. m. on July 2')},
    scenarios=[SCN('A', 'About 05:00', 'Slocum OR27-1-R271 p.759 and EPP', D, ['sl_5am']), SCN('B', 'About 08:00', 'Sykes OR27-1-R187 p.592 (Freeman cite; not re-quoted here)', I)],
    register='tl-05-EG-005')

ROW('T2-057', 'partially_supported',
    'Kershaw: McLaws\'s command "did not leave camp until about sunrise" on Jul 2; that it followed Hood is not stated; seed tier inferred.',
    [SUB('Kershaw\'s command did not leave camp until about sunrise', D, S_, ['k_sun']),
     SUB('McLaws follows Hood', I, U_, [], 'not stated')],
    {'k_sun': ('OR27-2-R432', 'did not leave camp until about sunrise')}, tier='documented')

ROW('T2-058', 'unsupported',
    'Lee-Longstreet conference near daybreak: no OR statement of its hour (Taylor 08:00; daylight; before dawn; Hood shortly after daybreak; Fremantle after 05:00; Freeman 05:15), none from a local text.',
    [SUB('Lee-Longstreet conference at Lee\'s headquarters about 05:15', G, U_, [], 'Freeman estimate; the six values are memoir/secondary')],
    remains=['an OR statement of the conference hour'],
    searched=[SR(r'Longstreet', near=r'(conference|consult).{0,80}(daybreak|sunrise|morning)', win=250, what='Lee-Longstreet conference near daybreak, OR27 part 2', parts=(2,))],
    register='tl-05-EG-006', tier='open gap')

ROW('T2-059', 'partially_supported',
    'Greene took position at about 6 a. m. (OCR "G a. m.") and began to intrench as soon as in position; Geary: breastworks "immediately thrown up along our entire line"; this supports a 05:00-06:00 start, not DMNA\'s night of Jul 1-2, and "former civil engineer" is not in Greene\'s report.',
    [SUB('Greene took position at about 6 a. m. on Jul 2 (OCR reads "G a. m.")', D, S_, ['gr_6am'], 'OCR letter G read as 6'),
     SUB('As soon as in position the brigade began to intrench', D, S_, ['gr_intr']),
     SUB('Geary: breastworks immediately thrown up along the entire line', D, S_, ['g_up']),
     SUB('Greene, a former civil engineer, directs felling trees; start the night of Jul 1-2 (DMNA)', I, U_, [], 'not in Greene\'s report')],
    {'gr_6am': ('OR27-1-R307', 'at about G a. m'),
     'gr_intr': ('OR27-1-R307', 'As soon as we were in position, we began to intrench'),
     'g_up': ('OR27-1-R293', 'immediately thrown up along our entire line')},
    scenarios=[SCN('A', 'About 06:00 (HMDB, HistoryNet)', 'Greene OR27-1-R307 p.855-856', D, ['gr_6am', 'gr_intr']), SCN('B', 'Night of Jul 1-2', 'seed (DMNA)', I)],
    register='tl-05-EG-007')

ROW('T2-060', 'unsupported',
    'Capt. Johnston\'s reports of one regiment and a battery on the Emmitsburg Road and of no large formations on the Union left are not in the OR (Pendleton\'s different, contrary observation is).',
    [SUB('Confederate scouts (Capt. Johnston) report one Union regiment and a battery on the Emmitsburg Road, then no large formations on the Union left', G, U_, [], 'PHIF only; not in the OR')],
    remains=['Johnston\'s two reports'], register='tl-05-EG-006', tier='open gap')

ROW('T2-061', 'partially_supported',
    'Kane: "I assumed command at 6 a. m."; the materials list (logs, cordwood, stones, earth) is in Greene\'s report as the shard read it; the 5-foot height, head logs, concealment brush, 50-yard visibility and traverse layout are dimension gaps.',
    [SUB('Kane assumed command of his brigade at 6 a. m. on Jul 2', D, S_, ['k_6am']),
     SUB('Work height about 5 ft, head logs, brush for concealment, works hard to distinguish at 50 yards, traverse layout', G, U_, [], 'not in the OR')],
    {'k_6am': ('OR27-1-R302', 'I assumed command at 6 a. m')},
    remains=['dimensions and materials of the 06:00 works'], register='tl-05-EG-007')

ROW('T2-062', 'partially_supported',
    'Lee (1863): Pickett "joined Longstreet the following morning" (Jul 3); Peyton: the brigade "reached the field about 9 a. m."; no OR gives a 06:00 Jul 2 march (EPP); the ledger B.2.4 forbids showing Pickett before his documented arrival.',
    [SUB('Lee: Pickett\'s division joined Longstreet the following morning', D, S_, ['l_pick']),
     SUB('Peyton: the brigade reached the field about 9 a. m.', D, S_, ['p_9am']),
     SUB('Pickett begins marching to Gettysburg at 06:00 on Jul 2', I, U_, [], 'EPP')],
    {'l_pick': ('OR27-2-R426', 'joined Longstreet the following morning'),
     'p_9am': ('OR27-2-R441', 'reached the field about 9 a. m')},
    scenarios=[SCN('A', 'On the field the night of Jul 2', 'seed (W-D2, PHIF)', I), SCN('B', 'Joined Longstreet the morning of Jul 3', 'Lee OR27-2-R426 p.308', D, ['l_pick']),
               SCN('C', 'Reached the field about 9 a. m. (Jul 3)', 'Peyton OR27-2-R441 p.385', D, ['p_9am'])],
    register='tl-05-EG-006')
