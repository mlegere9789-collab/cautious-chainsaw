"""Close-out row data of shard tl-03 (T1-134 .. T1-153). build.py re-matches every quote verbatim in the local source text and refuses the run if one is not found."""
from rowlib import *

ROWS = []

R029 = 'OR27-1-R029'; R043 = 'OR27-1-R043'; R055 = 'OR27-1-R055'; R071 = 'OR27-1-R071'; R076 = 'OR27-1-R076'; R243 = 'OR27-1-R243'; R030 = 'OR27-1-R030'; R033 = 'OR27-1-R033'
R426 = 'OR27-2-R426'; R506 = 'OR27-2-R506'; R534 = 'OR27-2-R534'; R549 = 'OR27-2-R549'; R550 = 'OR27-2-R550'; R507 = 'OR27-2-R507'; R513 = 'OR27-2-R513'; R520 = 'OR27-2-R520'; R477 = 'OR27-2-R477'; R478 = 'OR27-2-R478'; R467 = 'OR27-2-R467'
LOGNOTE = 'every search is logged with pattern, scope and hit counts per source in horde/tl-03/closeout/search_log.jsonl'
LIB182 = 'the 182 local library texts (acquired_2.json: 99 texts and the 9 earlier state volumes; acquired_3.json: 73 National Park Service texts; Pennsylvania at Gettysburg vol.1), regex search on whitespace-normalised text'

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-134
ROWS.append(dict(
    id='T1-134', verdict='corrected',
    limits={'start': 'the hour at which Pettigrew\'s brigade was ordered to advance (2 p. m., Jones R550 p.643)',
            'end': 'the hour the Union reports give for the general advance of the enemy\'s infantry (about 4 p. m., Doubleday R029 p.250; Rowley R055 p.313: nearly 4 o\'clock)'},
    claim=claim('After resting in line of battle for an hour or more, Heth\'s division (Pettigrew\'s and Brockenbrough\'s brigades in the front line, Archer\'s Colonel Fry on the right) is ordered to attack with Pender\'s division in support; Pettigrew\'s brigade is ordered to advance at 2 p. m. (its own clock) and, with Brockenbrough\'s on its left, is hotly engaged within 100 yards; Hill orders Pender forward after Ewell appears (about 2.30); the Union reports date the general advance of the enemy at about 4',
                'Heth\'s division (Third Corps): Pettigrew\'s (Maj. J. Jones commanding), Brockenbrough\'s and Archer\'s (Col. Fry) brigades; Pender\'s division in support',
                'West of Gettysburg on the right of the Chambersburg pike, against McPherson Ridge and Seminary Ridge',
                'Jul 1, about 14:00 to about 16:00 (14:30 of the seed is the hour of Hill\'s Ewell sentence, not of Heth\'s attack)',
                'Heth OR27-2-R549 p.638; Jones R550 p.643; Hill R534 p.607; Lee R426 p.317; Doubleday R029 p.250; Rowley R055 p.313',
                'Heth: "After resting in line of battle for one hour or more, orders were received to attack the enemy in my front, with the notification that General Pender\'s division would support me"; the division had not advanced 100 yards before it was hotly engaged; Pettigrew\'s brigade broke through the enemy\'s first, second and third lines, and Brockenbrough was held in check on the left for a short time and then drove the enemy in confusion; Archer (Colonel Fry) changed front against cavalry on the right. '
                'Jones (Pettigrew\'s brigade): the brigade stood in line of battle until 2 p. m., "when orders to advance were received", and moved forward with Brockenbrough on its left. Hill: after Ewell\'s right wing appeared (about 2.30) "Pender\'s division was then ordered forward". Lee: Heth\'s troops, having suffered heavily, were relieved by Pender\'s. The Union side: Rowley holds the position "until nearly 4 o\'clock in the afternoon" when "a general advance of the enemy\'s infantry was now made in two very strong lines"; Doubleday: about 4 p. m. the enemy, strongly re-enforced, advanced in large numbers overlapping the left, pressing the right and overwhelming the centre. '
                'NOT documented: Hill\'s 14:30 as the hour of Heth\'s attack (Hill\'s sentence gives it for Ewell\'s appearance and Pender\'s order); an attack of Heth and Rodes together on the whole line as one act (the reports describe separate attacks that overlap).',
                'documented', '1863-07-01T14:00', '1863-07-01T16:00', marking='attack of Heth\'s fresh brigades: documented; hour: Confederate 14:00 against Union about 16:00, scenarios, no default'),
    subs=[
        ('Heth: after resting in line of battle for one hour or more, orders were received to attack with Pender\'s division in support; the division was hotly engaged within 100 yards', 'documented', 'supported', ['h_rest', 'h_100']),
        ('Pettigrew\'s brigade broke through the enemy\'s first, second and third lines; Brockenbrough was held in check on the left and then drove the enemy in confusion', 'documented', 'supported', ['h_three']),
        ('Jones (Pettigrew\'s brigade): in line of battle until 2 p. m., when orders to advance were received; moved forward with Brockenbrough on the left', 'documented', 'conflict', ['j2', 'j_brock']),
        ('Hill: about 2.30 Ewell\'s right wing appeared on his left; Pender\'s division was then ordered forward; Lee: Heth\'s troops were relieved by Pender\'s', 'documented', 'supported', ['hill_pender', 'lee_rel']),
        ('Union reports: Rowley, until nearly 4 o\'clock the position was held, then a general advance of the enemy in two very strong lines; Doubleday: about 4 p. m. the enemy advanced in large numbers, overlapping the left, pressing the right, overwhelming the centre', 'documented', 'conflict', ['row4', 'row_gen', 'd4']),
        ('Hill\'s 14:30 is the hour of Heth\'s renewed attack; Heth and Rodes attack the whole First Corps front together', 'open gap', 'unsupported', [], 'Hill\'s 2.30 is Ewell\'s appearance; the attacks are separate in the reports'),
    ],
    cites={
        'h_rest': OR('After resting in line of battle for one hour or more, orders were received to attack the enemy in my front, with the notification that General Pender\'s division would support me', R549, '638'),
        'h_100': OR('The division had not advanced more than 100 yards before it became hotly engaged', R549, '638'),
        'h_three': OR('Pettigrew\'s brigade encountered the enemy in heavy force, and broke through his first, second, and third lines', R549, '638'),
        'j2': OR('we remained in line of battle until 2 p. m., when orders to advance were received', R550, '643'),
        'j_brock': OR('just with the brigade on our left, commanded by Colonel Brockenbrough', R550, '643'),
        'hill_pender': OR("About 2.30 o'clock, the right wing of Ewell's corps made its appearance on my left, and thus formed a right angle with my line. Pender's division was then ordered forward, Thomas' brigade being retained in reserve", R534, '607'),
        'lee_rel': OR('Heth\'s troops, having suffered heavily in their protracted contest with a superior force, were relieved by Pender\'s', R426, '317'),
        'row4': OR('The position selected by General Reynolds had been steadily and determinedly maintained until nearly 4 o\'clock in the afternoon', R055, '313'),
        'row_gen': OR('A general advance of the enemy\'s infantry was now made in two very strong lines', R055, '313'),
        'd4': OR('About 4 p. m. the enemy, having been strongly re-enforced, advanced in large numbers', R029, '250'),
    },
    scenarios=[
        sc('A', 'Pettigrew\'s brigade ordered to advance at 14:00 (Confederate clock)', 'Jones OR27-2-R550 p.643', 'documented', ['j2']),
        sc('B', 'About 14:30 (seed; Hill\'s 2.30 for Ewell\'s appearance and Pender\'s order)', 'Hill OR27-2-R534 p.607; National Park Service value of the seed', 'inferred', ['hill_pender']),
        sc('C', 'General advance of the enemy nearly 15:45 to about 16:00 (Union clock)', 'Rowley OR27-1-R055 p.313; Doubleday R029 p.250', 'documented', ['row4', 'd4']),
    ],
    default=None,
    remains=['an hour for Heth\'s own order to attack (Heth gives none)', 'Hill\'s 14:30 as the hour of Heth\'s attack'],
    searched=['OR27-2-R549 (Heth), R550 (Jones), R534 (Hill), R426 (Lee) pp.317-318; R055 (Rowley), R029 (Doubleday) p.250; regex scan of hour statements in R548-R563 (Heth\'s and Pender\'s divisions)',
              LIB182 + ' regex Heth/Pettigrew/Pender near 2.30 and 4 o\'clock: no value beyond those of the reports',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): event supported in outline; no hour in Heth; Hill\'s 2.30 is for Ewell\'s appearance. Applied: Jones\' 2 p. m. and the Union 4 p. m. are carried as scenarios, Hill\'s 2.30 is cited for Pender, and the claim that Hill gives 14:30 for Heth\'s attack is marked unsupported.',
    register=reg('Hour of Heth\'s second attack on Jul 1', 'Heth gives no hour; Pettigrew\'s brigade orders at 2 p. m. (Confederate) against about 4 p. m. (Union) for the general advance; Hill\'s 2.30 belongs to Ewell\'s appearance.',
                 'Attack shown inside the window 14:00 to 16:00 with both clocks named; no default', 'documented', competing='14:00 (Jones) / 14:30 (seed) / nearly 16:00 (Rowley, Doubleday)', impact='Heth\'s brigades advance in a two-hour window; Pender\'s division follows', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-135
ROWS.append(dict(
    id='T1-135', verdict='partially_supported',
    limits={'start': 'noon, the start of the afternoon (tolerances.json time.day_parts); the seed gives "afternoon (time n/s)"'},
    claim=claim('First Corps medical officers: Surgeon J. Theodore Heard (medical director) and Surgeon T. H. Bache (medical inspector) remained in Gettysburg during the Confederate occupation to care for the wounded; the First Corps used the Schmucker farm buildings by the Seminary to shelter wounded on Jul 1 (National Park Service); the other hospital sites named (Seminary Schmucker Hall, Pennsylvania College, courthouse, churches) and the name A. J. Ward are not documented by a non-lead source read',
                'First Corps medical staff (Surg. J. T. Heard, medical director; Surg. T. H. Bache, medical inspector)',
                'Gettysburg town; the Seminary and the Schmucker farm buildings on Seminary Ridge',
                'Jul 1 afternoon (no hour) through the occupation of the town',
                'Newton OR27-1-R030 p.263; National Park Service CLR First Day',
                'Newton, commanding the First Corps in his report, writes that "Surg. J. Theodore Heard, medical director, and Surg. T. H. Bache, medical inspector, remained in the town of Gettysburg during its occupation by the enemy, and deserve the highest praise for their zealous and unremitting attention to the wounded". '
                'The National Park Service Cultural Landscape Report says the Schmucker farm buildings "were used by the 1st Corps to shelter the wounded on July 1, and remained filled with the Union wounded while the area was under Confederate control" and that the seminary\'s main building was a hospital until the late summer or fall of 1863 (secondary). '
                'NOT documented by a non-lead source read: the division hospitals of the First Corps in Schmucker Hall, Pennsylvania College, the courthouse and churches on the afternoon of Jul 1; the name A. J. Ward; the marker text HMDB 17936 (host refused, not retried). The Letterman 1866 text read has the First Corps medical table of Fredericksburg, not Gettysburg.',
                'inferred', '1863-07-01T12:00', '1863-07-01T23:59', marking='Heard and Bache remained: documented; Schmucker farm use: inferred (National Park Service); other sites and A. J. Ward: gap'),
    subs=[
        ('Surgeon J. Theodore Heard (medical director) and Surgeon T. H. Bache (medical inspector) of the First Corps remained in the town of Gettysburg during its occupation by the enemy to attend the wounded', 'documented', 'supported', ['newton']),
        ('The Schmucker farm buildings near the Seminary were used by the First Corps to shelter the wounded on Jul 1 and stayed filled with Union wounded under Confederate control', 'inferred', 'supported', ['nps_sch']),
        ('The main building of the Seminary served as a hospital until the late summer or fall of 1863', 'inferred', 'supported', ['nps_sem']),
        ('First Corps division hospitals in the Seminary (Schmucker Hall), Pennsylvania College, the courthouse and churches on the afternoon of Jul 1; the corps hospital officer A. J. Ward', 'open gap', 'unsupported', []),
    ],
    cites={
        'newton': OR('Surg. J. Theodore Heard, medical director, and Surg. T. H. Bache, medical inspector, remained in the town of Gettysburg during its occupation by the enemy, and deserve the highest praise for their zealous and unremitting attention to the wounded', R030, '263'),
        'nps_sch': L('NPS-CLR-1STDAY', 'ter the wounded on July 1, and remained filled with', reading='the text layer interleaves two columns: "They were used by the 1st Corps to shel-" continues "ter the wounded on July 1, and remained filled with the Union wounded while the area was under Confederate control"; the buildings are the Schmucker farm buildings of the paragraph'),
        'nps_sem': L('NPS-CLR-1STDAY', 'After the military relinquished use of the main building as a hospital in the late summer or fall of 1863'),
    },
    scenarios=[],
    default=None,
    remains=['First Corps division hospitals in the Seminary, Pennsylvania College, the courthouse and churches on Jul 1', 'the name A. J. Ward and corps hospital officers', 'the marker text HMDB 17936 (host refused)'],
    searched=['OR vol.27 pt.1 regex Heard|Ward|Seminary|Schmucker with hospital: Newton R030 p.263 (Heard and Bache); Letterman R016 pp.195-199 read for the First Corps: no hospital sites; OR pts 1-3 regex "A. J. Ward" and "Surg. Ward": no hit',
              LIB182 + ' regex Seminary/Schmucker Hall/Pennsylvania College/courthouse with hospital/wounded over Letterman 1866 (the First Corps table is Fredericksburg), Hospital Scenes 1864 (July after the battle), Tillie Pierce 1889, the National Park Service texts and the state volumes: only the Park Service statements cited',
              'HMDB marker 17936: the host was refused by the proxy in an earlier probe of this campaign (hmdb.org, fence-2 close-out); not retried and not circumvented',
              LOGNOTE],
    recheck='OR-RECHECK-2 (not_found): no OR27 passage on the First Corps hospital sites or on Heard and Ward. Applied: Newton\'s report (R030 p.263) gives Heard and Bache remaining in the town; the National Park Service text gives the Schmucker farm and the Seminary; the hospital sites in the seed and A. J. Ward stay unsupported.',
    register=reg('First Corps hospital sites in town on Jul 1 and the surgeon A. J. Ward', 'No report or text read lists the First Corps division hospitals by building on Jul 1; the marker text is not retrievable from here.', 'Heard and Bache documented; Schmucker farm and Seminary as National Park Service statements; other sites shown as marked gaps', 'inferred', impact='hospital use of the town buildings is not drawn as fact for Jul 1 afternoon', ask='an owner-only step: a person may open HMDB marker 17936 in a browser and paste its inscription (the proxy refuses the host)', rids='R05, R13'),
    related=['tl-03-EG-05']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-136
ROWS.append(dict(
    id='T1-136', verdict='corrected',
    limits={'start': 'the hour of Robinson\'s arrival at the seminary (Baxter at the front at 11 a. m.), when Doubleday directed intrenchments to be thrown up and Paul\'s brigade was set to intrench the ridge',
            'end': 'the hour at which Wadsworth ordered the First Division to retire to the seminary line (3.45 o\'clock, R032 p.266, row T1-150); the barricade is occupied from then'},
    claim=claim('A barricade of rails west of the seminary, begun in the morning at Doubleday\'s order and Robinson\'s (Paul\'s brigade set to intrench the ridge), with rail breastworks thrown up by troops earlier in the day, is held from about 3.45 p. m. by Biddle\'s, Meredith\'s and Gates\' men with the batteries on the seminary crest (Cooper, Stevens, Wilber\'s section, Stewart; twelve guns concentrated)',
                'First Corps (Doubleday): Paul\'s brigade (intrenching), Biddle\'s brigade (121st, 142nd, 151st Pennsylvania and 20th New York State Militia under Gates), the Iron Brigade remnants, batteries of Wainwright\'s brigade',
                'West of the Lutheran Theological Seminary, in front of the seminary and of Gettysburg College (Gates: an eighth of a mile in rear of his earlier position); the guns on the seminary crest',
                'Jul 1, built from about 11:00; held from about 15:45 (before the retreat of about 16:00)',
                'Doubleday OR27-1-R029 pp.247 and 250; Robinson R043 p.289; Rowley R055 p.313; Gates R057 p.317; Morrow R033 p.269; W. W. Robinson R036 p.280; A. Biddle R058 p.323; Wainwright R071 p.356; National Park Service CLR First Day',
                'Doubleday directed Robinson to station his division in reserve at the seminary and "to throw up some slight intrenchments", and says the First Brigade of Meredith\'s and another occupied "the intrenchments in front of the seminary, which I had directed to be thrown up as a precautionary measure"; Robinson set Paul\'s brigade at work to intrench the ridge; Colonel W. W. Robinson (7th Wisconsin) found "a slight breastwork of loose rails ... thrown together by some of our troops in the earlier part of the day"; Rowley: the First Brigade fell back to "a cover of rails hastily thrown up by some of the other troops in front of the seminary"; Gates fell back "behind a barricade of rails, some eighth of a mile in our rear and in front of Gettysburg College"; Morrow was wounded "just before reaching the barricade, west of the seminary building". '
                'Wainwright: Cooper\'s and Stevens\' batteries and Wilber\'s section on one line, "concentrating twelve guns in so small a space that they were hardly 5 yards apart", with Stewart\'s battery on the same line and Breck\'s sections behind a strong stone wall on the seminary crest. NOT documented: the length (600 yards), a barricade curving through the small wood, the dismantling of particular fences, the gun counts 17, 20 and 22 of the seed (no non-lead source read); the bundled notes on the XII Corps works and Buford\'s strength belong to other rows.',
                'documented', '1863-07-01T11:00', '1863-07-01T15:45', marking='barricade of rails, hasty rail breastworks, order to intrench, twelve guns: documented; length, curve, 17/20/22 guns: gap'),
    subs=[
        ('Doubleday directed Robinson\'s division to the seminary to throw up some slight intrenchments; Robinson set Paul\'s brigade at work to intrench the ridge of the seminary', 'documented', 'supported', ['d_intr', 'rob_intr']),
        ('Doubleday: the line fell back occupying the intrenchments in front of the seminary which he had directed to be thrown up as a precautionary measure; the feeble barricade of rails held the enemy until the greater part of the corps had retired', 'documented', 'supported', ['d_prec', 'd_feeble']),
        ('Colonel W. W. Robinson (7th Wisconsin) found a slight breastwork of loose rails thrown together by some of the troops in the earlier part of the day, 40 yards in front of a battery', 'documented', 'supported', ['wwr']),
        ('Rowley: the First Brigade fell back to a cover of rails hastily thrown up by some of the other troops in front of the seminary; Gates: a barricade of rails an eighth of a mile in the rear and in front of Gettysburg College; Morrow: the barricade west of the seminary building; A. Biddle: the fence barricade', 'documented', 'supported', ['row_cover', 'gates_bar', 'mor_bar', 'abid']),
        ('Wainwright: twelve guns concentrated hardly 5 yards apart (Cooper, Stevens, Wilber\'s section), Stewart\'s battery on the same line, Breck\'s sections behind a strong stone wall on the seminary crest', 'documented', 'conflict', ['w12', 'w_stew', 'w_wall']),
        ('The barricade was about 600 yards long, curved through the small wood and was built from dismantled fences; the batteries numbered 17, 20 or 22 guns', 'open gap', 'unsupported', [], 'no non-lead source read gives a length, a curve or a number of 17, 20 or 22'),
        ('Rails were taken from the neighbouring fields: Dr. Schmucker counted 3,108 rails lost from his adjacent farm, "most probably going to build the Union rail breastworks late in the fighting" (National Park Service)', 'inferred', 'supported', ['nps_rails']),
    ],
    cites={
        'd_intr': OR('I immediately directed General Robinson to station his division in reserve at the seminary, and to throw up some slight intrenchments, to aid me in holding that point in case I should be driven back', R029, '247'),
        'rob_intr': OR('the First Brigade, under Brigadier-General Paul, was set at work to intrench the ridge on which it is situated', R043, '289'),
        'd_prec': OR('by occupying the intrenchments in front of the seminary, which I had directed to be thrown up as a precautionary measure to assist in holding the new position', R029, '250'),
        'd_feeble': OR('From behind the feeble barricade of rails these brave men stemmed the fierce tide which pressed upon them incessantly, and held the rebel lines, which encircled them on three sides, at bay until the greater portion of the corps had retired', R029, '250'),
        'wwr': OR('some 40 yards in front of this battery, I found a slight breastwork of loose rails, which, I suppose, had been thrown together by some of our troops in the earlier part of the day, behind which I threw the regiment', 'OR27-1-R036', '280'),
        'row_cover': OR('until it reached a cover of rails hastily thrown up by some of the other troops in front of the seminary', R055, '313'),
        'gates_bar': OR('fell back slowly behind a barricade of rails, some eighth of a mile in our rear and in front of Gettysburg College', 'OR27-1-R057', '317'),
        'mor_bar': OR('I was wounded just before reaching the barricade, west of the seminary building, and left the field', R033, '269'),
        'abid': OR('returned to the fence barricade', 'OR27-1-R058', '323'),
        'w12': OR('concentrating twelve guns in so small a space that they were hardly 5 yards apart', R071, '356'),
        'w_stew': OR('Lieutenant Stewart\'s battery was also in position on the same line', R071, '356'),
        'w_wall': OR('ordered him behind a strong stone wall on the seminary crest', R071, '356'),
        'nps_rails': L('NPS-CLR-1STDAY', 'Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably going to build the Union rail breastworks late in the', reading='the sentence ends "fighting"; the claim of the rails is Schmucker\'s, the use for the breastworks is the Park Service\'s "most probably"'),
    },
    scenarios=[
        sc('A', 'Twelve guns concentrated on the seminary line (Cooper, Stevens, Wilber\'s section)', 'Wainwright OR27-1-R071 p.356', 'documented', ['w12']),
        sc('B', 'The twelve guns plus Stewart\'s battery on the same line (the number of its guns on the line is not stated)', 'Wainwright OR27-1-R071 p.356', 'documented', ['w12', 'w_stew']),
        sc('C', '17 guns (seed, Wikipedia value), 20 (seed, HistoryNet), 22 (seed, HistoryNet and Dorsey Pender)', 'seed values; no non-lead source read', 'open gap', []),
    ],
    default=None,
    remains=['length of the barricade (about 600 yards in the seed) and its curve through the small wood', 'a number of guns of 17, 20 or 22', 'which fences supplied the rails (only Schmucker\'s farm by the Park Service)'],
    searched=['OR27-1 reports R028-R075 scanned for barricade|breastwork|intrench|cover of rails: Doubleday, Morrow, W. W. Robinson, J. C. Robinson, Farnham, Patterson, Rowley, Biddle, Gates, A. Biddle, McCalmont, McFarland, Dana, Musser, Randall, Wainwright; R029 pp.247-251, R071 pp.354-358 read',
              LIB182 + ' regex rail breastworks/barricade/Schmucker rails: National Park Service CLR First Day (3,108 rails); no source for 600 yards',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): rail barricade confirmed; length, dismantled fences, breastwork length, the before-16:00 bound and Buford\'s strength not in the passages. Applied: the order to intrench (11:00 on), the hasty rail cover and the barricade position are cited from eight reports; the bundled seed notes (XII Corps works, Buford\'s strength, Early, Slocum) are marked as belonging to other rows.',
    register=reg('Length, shape and gun count of the seminary barricade line on Jul 1', 'The reports give the barricade of rails, its place and the guns concentrated hardly 5 yards apart, but no length, curve or gun total; 17, 20 and 22 guns are seed values without a non-lead source.',
                 'Rail barricade west of the seminary from about 11:00 and held from 15:45 (documented); length and shape plausible-procedural; guns twelve plus Stewart', 'documented', competing='twelve / twelve plus Stewart / 17 / 20 / 22', impact='the barricade is built on screen in the window with the plausible-procedural dimension mark', ask='none', rids='R13, R14'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-137
ROWS.append(dict(
    id='T1-137', verdict='corrected',
    limits={'start': 'the hour of Robinson\'s arrival at the seminary (Baxter at the front at 11 a. m.), when the order to intrench was given',
            'end': 'the hour at which Wadsworth ordered the First Division to retire to the seminary line (3.45 o\'clock, R032 p.266)'},
    claim=claim('Rails for the barricade and breastworks are taken from fences (the reports say the rails were thrown together by troops; only the National Park Service says whose); the fences met on the Chambersburg pike side are a rail fence (33 paces in front of the 149th Pennsylvania at the railroad cut) and a paling fence parallel to the pike within 50 yards (Wainwright); post-and-rail along the pike is not stated for Jul 1',
                'First Corps troops (Paul\'s, Biddle\'s, Iron Brigade); 149th Pennsylvania (Dwight); batteries on the pike (Wainwright)',
                'Seminary Ridge and the Chambersburg (Cashtown) pike west of Gettysburg',
                'Jul 1 afternoon, 11:00 to 15:45',
                'Rowley OR27-1-R055 p.313; W. W. Robinson R036 p.280; Dwight R065 p.342; Wainwright R071 p.357; National Park Service CLR First Day',
                'Rowley: a cover of rails "hastily thrown up by some of the other troops in front of the seminary"; W. W. Robinson: a slight breastwork of loose rails thrown together by some of the troops in the earlier part of the day; Dwight (149th Pennsylvania, at the railroad cut): the enemy "reached a rail fence, 33 paces in my front" and a rail fence 100 paces to the front; Wainwright: on the retreat down the pike the enemy\'s skirmishers fired "from behind a paling fence running parallel to and within 50 yards of the road". '
                'The National Park Service: Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably going to build the Union rail breastworks. NOT documented: a "fence-damage event keyed to the barricade schedule" as a dated act of stripping fields; that the Chambersburg pike fences were post-and-rail on Jul 1 (the reports read name rail and paling fences there; post-and-rail occurs in reports of Jul 2-3 for the fields east of Seminary Ridge).',
                'inferred', '1863-07-01T11:00', '1863-07-01T15:45', marking='rails taken by troops: documented; whose fences and the fence type on the pike: inferred'),
    subs=[
        ('Rowley: the First Brigade fell back to a cover of rails hastily thrown up by some of the other troops in front of the seminary', 'documented', 'supported', ['row_cover']),
        ('W. W. Robinson (7th Wisconsin): a slight breastwork of loose rails thrown together by some of the troops in the earlier part of the day', 'documented', 'supported', ['wwr']),
        ('Dwight (149th Pennsylvania): the enemy reached a rail fence 33 paces in front of his regiment at the railroad cut; a rail fence 100 paces in front where a company engaged the enemy\'s advance', 'documented', 'supported', ['dw33', 'dw100']),
        ('Wainwright: the enemy\'s skirmishers fired from behind a paling fence running parallel to and within 50 yards of the pike', 'documented', 'supported', ['paling']),
        ('Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably going to build the Union rail breastworks (National Park Service)', 'inferred', 'supported', ['nps_rails']),
        ('Fences along the Chambersburg pike were post-and-rail on Jul 1; a dated fence-stripping event for the barricade', 'open gap', 'unsupported', [], 'the reports name rail and paling fences there; post-and-rail occurs only in reports of Jul 2-3 and for other ground'),
    ],
    cites={
        'row_cover': OR('until it reached a cover of rails hastily thrown up by some of the other troops in front of the seminary', R055, '313'),
        'wwr': OR('I found a slight breastwork of loose rails, which, I suppose, had been thrown together by some of our troops in the earlier part of the day, behind which I threw the regiment', 'OR27-1-R036', '280'),
        'dw33': OR('My position was undiscovered by the enemy until he reached a rail fence, 33 paces in my front', 'OR27-1-R065', '342'),
        'dw100': OR('to my front 100 paces, to rail fence', 'OR27-1-R065', '341', note='the OCR joins the words of the sentence "I had ordered Captain McCullough, of Company E, to my front 100 paces, to rail fence"'),
        'paling': OR('opened a severe fire from behind a paling fence running parallel to and within 50 yards of the road', R071, '357'),
        'nps_rails': L('NPS-CLR-1STDAY', 'Dr. Schmucker counted 3,108 rails lost from his adjacent farm, most probably going to build the Union rail breastworks late in the', reading='the sentence ends "fighting"'),
    },
    scenarios=[],
    default=None,
    remains=['the type (post-and-rail or other) of the fences along the Chambersburg pike on Jul 1', 'a dated event of stripping rails from the fields for the barricade'],
    searched=['OR vol.27 pt.1 regex post and rail|paling fence|rail fence over the whole text: Jul 1 hits Wainwright p.357 (paling), Dwight pp.341-342 (rail); the post-and-rail hits are Jul 2-3 (Wright, Harris, Davis) and Stuart\'s cavalry; R055, R036 read',
              LIB182 + ' regex Chambersburg Pike fences: National Park Service CLR First Day (Schmucker rails); BFR-Fence (the seed source) is a secondary article not read',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): rail barricade confirmed; where the rails came from and the post-and-rail type are not in the passage. Applied: the troops\' own statements (Rowley, W. W. Robinson) are cited; the fence types found on the pike are rail and paling; the post-and-rail claim is marked unsupported.',
    register=reg('Type of the Chambersburg pike fences and the dated stripping of rails on Jul 1', 'The reports read give rail and paling fences at the pike on Jul 1 and say troops threw rails together; the post-and-rail type appears only for Jul 2-3 and other ground.', 'Rails thrown up by troops (documented); fence type on the pike shown as rail and paling where the reports name them, otherwise inferred', 'inferred', impact='fence rails vanish from the fields near the barricade as it is built; the fence type is shown with the inferred glyph', ask='none', rids='R14'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-138
ROWS.append(dict(
    id='T1-138', verdict='unsupported',
    limits={'start': 'noon, the start of the afternoon (tolerances.json time.day_parts); the seed gives "afternoon (time n/s)"'},
    claim=claim('A McMillan neighbour reportedly fells his own fences for Union troops on Jul 1: no report or text read supports it and the place name does not match any McMillan of the sources read',
                'A neighbour of the McMillan farm (unnamed) and Union troops of the First Corps',
                'McMillan farm, Seminary Ridge area (the National Park Service McMillan places read are the McMillan woods and orchards on the Emmitsburg road ridge, not the Seminary Ridge area)',
                'Jul 1 afternoon (time not stated)',
                'none (the seed cites a Bliss-farm article, a secondary source flagged weak)',
                'No report of the Official Records, no state volume, no newspaper and no National Park Service text read says that a neighbour of a McMillan farm felled fences for Union troops on Jul 1; the National Park Service texts that name McMillan describe the McMillan Woods, Orchard and Farm Lane of the Emmitsburg road ridge. The hasty rail breastworks of the afternoon were thrown up by troops (rows T1-136, T1-137). The row stays an open gap and must not drive a fence-removal event.',
                'open gap', None, None, marking='open gap: no source; no fence-removal event is driven from it'),
    subs=[
        ('A neighbour of the McMillan farm felled his own fences for Union troops on Jul 1', 'open gap', 'unsupported', []),
    ],
    cites={},
    scenarios=[],
    default=None,
    remains=['any source for the neighbour, his fences and the McMillan farm of the row'],
    searched=['OR vol.27 pts 1-3 regex McMillan: Confederate and Union mentions of persons only (4 hits in pt.2, 4 in pt.3), none about fences or a farm',
              LIB182 + ' regex McMillan near fence/rails/felled/cut down: the National Park Service CLI Pickett\'s Charge Battlefield and CLR Record of Treatment (modern fence installations at the McMillan woods and orchard of the Emmitsburg road ridge), SHSP vol.5 (a stone fence near McMillan\'s house on Jul 2); NPS-MCMILLAN-HOUSE (architectural report) has no fence event',
              'the Bliss-farm article cited by the seed is not in the library and its host is not on the reachable list; not retrieved',
              LOGNOTE],
    recheck='OR-RECHECK-2 (not_found): single weak secondary; no OR27 passage. Applied: no event is driven from it; the McMillan places found in the Park Service texts are of other ground.',
    register=reg('McMillan neighbour felling fences on Jul 1', 'The only source is a secondary article on the Bliss farm flagged weak; no report, newspaper or Park Service text read mentions it, and the McMillan places in the Park Service texts lie on the Emmitsburg road ridge.', 'Left an open gap; the real fence removals of the afternoon are those of rows T1-136 and T1-137', 'open gap', impact='nothing is drawn for this row', ask='none', rids='R14'),
    related=['tl-03-EG-05']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-139
ROWS.append(dict(
    id='T1-139', verdict='corrected',
    limits={'start': 'the hour at which Tillie Pierce and Mrs. Schriver started on foot for the Weikert farm (about one o\'clock, TPIERCE-1889)',
            'end': 'the edge of the calendar date: she carried water to the soldiers until night came on (TPIERCE-1889)'},
    claim=claim('About one o\'clock Tillie Pierce, with Mrs. Schriver and her two children, walks from Baltimore Street through the Evergreen Cemetery to the Taneytown road and her grandparent\'s farm, Jacob Weikert\'s, on the eastern slope of Round Top; she carries water from the spring and then the pump to the passing artillery and infantry until the spring is empty and till night; the wounded fill the barn before night; she returns home on the forenoon of Jul 7',
                'Tillie Pierce (civilian); Mrs. Schriver and her two children; the Weikert family; passing Union artillery and infantry',
                'Gettysburg (Baltimore Street, Evergreen Cemetery) to the Jacob Weikert farm on the Taneytown road, eastern slope of Round Top; the spring on the north side and the pump on the south side of the house',
                'Jul 1 from about 13:00 to night; return home Jul 7 forenoon',
                'Tillie Pierce, At Gettysburg: or What a Girl Saw and Heard of the Battle (1889), the chapters of the first day',
                'Her own account, written long after (1889): after dinner on Jul 1 Mrs. Schriver, a neighbour, said she would go to her father\'s (Jacob Weikert), who lived on the Taneytown road at the eastern slope of the Round Top, and asked that Tillie come with her; "About one o\'clock we started on foot", out Baltimore Street into the Evergreen Cemetery, where the men "were already planting cannon". At Weikert\'s Union artillery came hurrying by, then infantry; "Obtaining a bucket, I hastened to the spring, and there, with others, carried water to the moving column until the spring was empty", then from the pump, until night came on; "Before night the barn was filled with the shattered and dying heroes". '
                'She started home "sometime during the forenoon of Tuesday, the 7th", with Mrs. Schriver and her children. This replaces the seed\'s failed lookup: the memoir is in the library. NOT stated in the memoir text read: her age ("15" is the seed\'s); the hour of the first soldiers at the spring (the afternoon).',
                'documented', '1863-07-01T13:00', '1863-07-01T23:59', marking='memoir of a participant written in 1889: documented as her account; age: not in the text'),
    subs=[
        ('After dinner Mrs. Schriver proposed to go to her father Jacob Weikert\'s on the Taneytown road at the eastern slope of Round Top and asked that Tillie come with her', 'documented', 'supported', ['tp_wk']),
        ('About one o\'clock they started on foot; passing through the Evergreen Cemetery on Cemetery Hill, the men were already planting cannon', 'documented', 'supported', ['tp_1', 'tp_cem']),
        ('At Weikert\'s she carried water with others from the spring to the moving column until the spring was empty, then from the pump, until night', 'documented', 'supported', ['tp_water']),
        ('Before night the barn was filled with wounded', 'documented', 'supported', ['tp_barn']),
        ('She started for home on the forenoon of Tuesday, Jul 7, on foot with Mrs. Schriver and her children', 'documented', 'supported', ['tp_7']),
        ('Her age (15)', 'open gap', 'unsupported', [], 'not in the text read'),
    ],
    cites={
        'tp_wk': L('TPIERCE-1889', 'who lived on the Taneytown road at the eastern slope of the Round Top'),
        'tp_1': L('TPIERCE-1889', 'About one o\'clock w^e started on foot'),
        'tp_cem': L('TPIERCE-1889', 'As we were passing along the Cemetery hill, our men were already planting cannon'),
        'tp_water': L('TPIERCE-1889', 'Obtaining a bucket, I hastened to the spring, and there, with others, carried water to the moving column until the spring was empty'),
        'tp_barn': L('TPIERCE-1889', 'Before night the barn was filled with the shattered and dying heroes'),
        'tp_7': L('TPIERCE-1889', 'Sometime during- the forenoon of Tuesday, the 7th'),
    },
    scenarios=[],
    default=None,
    remains=['her age in the text', 'the date and hour at which the first soldiers came to the spring (afternoon only)'],
    searched=['TPIERCE-1889 (At Gettysburg, 1889) read for the first-day chapters: departure, route, the spring, the pump, the barn, the return on Jul 7',
              'OR vol.27: no civilian account of this kind; the hospital use of the Weikert barn is not in the reports read',
              LOGNOTE],
    recheck='OR-RECHECK-2 (not_found): Tillie Pierce\'s memoir is not in the OR or the library. Corrected: the memoir is in the library (TPIERCE-1889, library/acquired_2.json) and supports the row; the earlier failed lookup is withdrawn.',
    register=reg('Age and exact hour of the water carrying of Tillie Pierce', 'The memoir gives the hour of departure (about one o\'clock) and the water carrying through the afternoon until night but no age and no hour for the first soldiers.', 'Departure about 13:00 and water carrying to night as her own account; age not asserted', 'documented', impact='a civilian figure walks to the Weikert farm and carries water in the afternoon, marked as a witness account', ask='none', rids='R05, R13'),
    related=['tl-03-EG-05']))

R044 = 'OR27-1-R044'; R052 = 'OR27-1-R052'; R247 = 'OR27-1-R247'; R269 = 'OR27-1-R269'; R028 = 'OR27-1-R028'; R253 = 'OR27-1-R253'; R061 = 'OR27-1-R061'; R514 = 'OR27-2-R514'; R551 = 'OR27-2-R551'; R032 = 'OR27-1-R032'; R523 = 'OR27-2-R523'; R472 = 'OR27-2-R472'; R470 = 'OR27-2-R470'; R271 = 'OR27-1-R271'; R006 = 'OR27-1-R006'; R337 = 'OR27-1-R337'; R009 = 'OR27-1-R009'; R013 = 'OR27-1-R013'; R064 = 'OR27-1-R064'

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-140
ROWS.append(dict(
    id='T1-140', verdict='partially_supported',
    limits={'start': '12:00, the start of the afternoon (tolerances.json time.day_parts); the seed gives "mid-afternoon" and "first wounded by about 16:00"; no text read gives an hour'},
    claim=claim('The Eleventh Corps hospital (Second Division, Dr. D. G. Brinton in charge) was at the George Spangler farm on the Baltimore pike east of Cemetery Hill; the date of its taking, the hour of the first wounded, the confinement of the family and the counts 1,500 / 1,900 / 2,000 are not documented by any text read',
                'Eleventh Corps medical staff (Second Division hospital, Dr. D. G. Brinton)',
                'George Spangler farm, Hospital Road / Baltimore pike side, east of Cemetery Hill',
                'Jul 1 afternoon (the hospital is documented as the Eleventh Corps hospital; the hour of its taking is not)',
                'National Park Service Boundary Study (1988), NPS Common Pride (Brinton), NPS Record of Treatment vol.1 and the 1932 tablet list',
                'The National Park Service texts say the George Spangler farm "served as a field hospital", that the 11th Corps hospital there was the site of General Armistead\'s death and that Dr. D. G. Brinton was in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler farm; the 1932 list of tablets puts the Eleventh Corps hospital tablet on Hospital Road 700 feet east of the George Spangler house. '
                'NOT documented by a non-lead source read: that the farm was taken on Jul 1 in the mid-afternoon, the first wounded by about 16:00, the family confined to an upstairs room, and any count (1,000 / 1,500 / 1,800 / 1,900 / 2,000 are listed by the delegated decision C-038 as an open gap with no headline number). The Official Records report nothing on this farm (Spangler occurs there only for a lieutenant and a mill); the National Park Service Historical Statement of the Henry Spangler farm has an unreadable text layer. The seed also carries an unrelated Pettigrew Jun 30 note (parse bleed of another row).',
                'inferred', '1863-07-01T12:00', '1863-07-01T23:59', marking='Spangler farm as the Eleventh Corps hospital: inferred (National Park Service); date, hour, family, counts: gap'),
    subs=[
        ('The George Spangler farm served as a field hospital; the 11th Corps hospital located there was the site of Armistead\'s death (National Park Service)', 'inferred', 'supported', ['nps_fh', 'nps_arm']),
        ('Dr. D. G. Brinton was in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler farm (National Park Service quoting a postwar account)', 'inferred', 'supported', ['nps_brin']),
        ('The tablet of the Eleventh Corps hospital is on Hospital Road 700 feet east of the George Spangler house', 'inferred', 'supported', ['nps_tab']),
        ('The farm was taken by the Eleventh Corps medical staff in the mid-afternoon of Jul 1 and the first wounded were there by about 16:00; the family was confined to an upstairs room', 'open gap', 'unsupported', []),
        ('Counts of wounded 1,500 / about 1,900 / about 2,000 (seed) and 1,000 / 1,800 (delegated decision C-038)', 'open gap', 'unsupported', []),
    ],
    cites={
        'nps_fh': L('NPS-CLR-ROT-V1', 'the George Spangler farm served as a feld hospital', note='the OCR prints feld for field'),
        'nps_arm': L('NPS-BOUNDARY-1988', 'The 11th Corps hospital located here was the site of General Armistead\'s death'),
        'nps_brin': L('NPS-COMMON-PRIDE-2', 'Dr. D. G. Brinton, in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler'),
        'nps_tab': L('NPS-MON-LOC-1932', 'The Eleventh Corps on Hospital Road 700 feet east of George Spangler'),
    },
    scenarios=[
        sc('A', '1,000', 'delegated decision C-038 (PDF B.2.5 value); no source read', 'open gap', []),
        sc('B', '1,500', 'PDF recommended value; no source read', 'open gap', []),
        sc('C', '1,800', 'PDF B.2.5 value; no source read', 'open gap', []),
        sc('D', 'about 1,900', 'seed (HistoryNet); no non-lead source read', 'open gap', []),
        sc('E', 'about 2,000', 'seed; no non-lead source read', 'open gap', []),
    ],
    default=dict(scenario='-', basis='DELEGATED DECISION C-038-DEFAULT (2026-11-11): range 1,000-2,000, all five values listed, no headline number; no scenario is a default'),
    remains=['date and hour at which the Spangler farm was taken as the Eleventh Corps hospital and the hour of the first wounded', 'the family confined upstairs', 'any count of wounded at the farm on Jul 1'],
    searched=['OR vol.27 pts 1-3 regex Spangler: lieutenants, a mill and an index entry only; no report of the farm hospital; Letterman R016 pp.195-199 read: no farm-level counts',
              LIB182 + ' regex Spangler with hospital/wounded/Eleventh Corps: National Park Service Boundary Study, Common Pride vol.2, Record of Treatment vol.1, tablet lists 1932 and 1993; NPS-HS-SPANGLER-HENRY (Historical Statement of the Henry Spangler farm) text layer unreadable (OCR garbage), not usable; HistoryNet (the seed source) not on the reachable list',
              LOGNOTE],
    recheck='OR-RECHECK-2 (not_found): no OR27 passage; citation a HistoryNet article. Applied: the National Park Service statements that the farm was the Eleventh Corps hospital are cited; the hour, family and counts stay unsupported; the delegated decision C-038 (no headline number) is recorded.',
    register=reg('Date and counts of the wounded at the Spangler farm hospital, Jul 1', 'No report or text read gives the hour at which the farm became a hospital or a count on Jul 1; the National Park Service Historical Statement cannot be read.', 'Hospital use documented from the Park Service statements; hour and counts shown as marked gaps; counts a range with no headline (C-038)', 'inferred', competing='1,000 / 1,500 / 1,800 / 1,900 / 2,000', impact='the farm appears as the Eleventh Corps hospital with no count drawn as fact', ask='an owner-only step for a better text: the Henry Spangler Farm Historical Statement (National Park Service) can be obtained as a clean copy; none is available here', rids='R05, R13'),
    related=['tl-03-EG-05']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-141
ROWS.append(dict(
    id='T1-141', verdict='corrected',
    limits={'start': 'the hour at which Baxter was engaged and relieved after more than two hours (11 a. m. arrival, general fire about 12.30 p. m., R044 p.292)',
            'end': 'the hour after which Coulter says the First (Paul\'s) Brigade relieved Baxter\'s (after 3 p. m., R044 p.292)'},
    claim=claim('Paul\'s brigade comes to Baxter\'s support (part posted behind Baxter, part perpendicular to the line) and relieves Baxter\'s brigade after 3 p. m.; Paul is severely wounded in the head by a bullet through both eyes (blind)',
                'Second Division, First Corps: Paul\'s First Brigade (Brig. Gen. G. R. Paul; command to Colonels Leonard, Root, then Prey), Baxter\'s Second Brigade',
                'The ridge on the right of the First Division north of the Chambersburg road',
                'Jul 1, about 12:30 to after 15:00',
                'Robinson as quoted in Doubleday OR27-1-R029 p.249; Coulter R044 p.292; Baxter R052 p.307; Bachelder 1873; Maine at Gettysburg 1898; New York at Gettysburg vol.2; Pennsylvania at Gettysburg vol.1',
                'Doubleday sent Robinson with Paul\'s brigade to Baxter\'s assistance; part of Paul\'s brigade was posted as a support to Baxter and part perpendicular to the line; Robinson: "the veteran commander of the First Brigade, Brigadier-General Paul, who fell, severely wounded". Baxter was "relieved by the First Brigade of the Second Division, having been engaged over two hours"; Coulter: the line was held "until after 3 p. m." when part of the First Brigade relieved it. '
                'That Paul lost both eyes is stated by Bachelder (1873: a bullet passing into one eye and out at the other, totally blind since), by the 16th Maine (shot through both eyes), by Colonel Prey of the 104th New York ("losing the sight of both eyes") and by the 107th/other Pennsylvania address ("losing both eyes"); no report of the Official Records says it. The hour of Paul\'s wound is not stated. The seed says Baxter "withdraws" and Paul "replaces him": the reports say Baxter was relieved after more than two hours and Paul reinforced and relieved him, not that Baxter first withdrew.',
                'documented', '1863-07-01T12:30', '1863-07-01T15:00', marking='Paul wounded, relief of Baxter: documented; blinded: documented in non-OR accounts; hour of the wound: gap'),
    subs=[
        ('Paul\'s brigade went to Baxter\'s assistance; part was posted as a support to Baxter against an enemy advancing on the front and part perpendicular to the line to protect the right flank', 'documented', 'supported', ['d_paul', 'd_part']),
        ('Baxter was engaged over two hours and relieved by the First Brigade of the Second Division; the line held until after 3 p. m. when part of the First Brigade relieved it', 'documented', 'supported', ['b_rel', 'c3']),
        ('Paul fell severely wounded while directing his command (Robinson, quoted by Doubleday)', 'documented', 'supported', ['paul_w']),
        ('Paul lost the sight of both eyes (Bachelder 1873; Maine at Gettysburg; New York at Gettysburg vol.2; Pennsylvania at Gettysburg vol.1)', 'documented', 'supported', ['bach', 'me16', 'ny104', 'pa107']),
        ('The hour of Paul\'s wound; that Baxter withdrew before Paul replaced him', 'open gap', 'unsupported', [], 'the reports give relief, not withdrawal; no hour for the wound'),
    ],
    cites={
        'd_paul': OR('Finding Baxter was in danger of being overpowered, I directed General Robinson to go in person to his assistance with the remainder of his division', 'OR27-1-R029', '249'),
        'd_part': OR('Part of Paul\'s brigade was posted by General Robinson as a support to Baxter against an enemy advancing on our front', 'OR27-1-R029', '249'),
        'b_rel': OR('We were relieved by the First Brigade of the Second Division, having been engaged over two hours', R052, '307'),
        'c3': OR('The line was steadily maintained under a brisk fire until after 3 p. m.', R044, '292'),
        'paul_w': OR('Brigadier-General Paul, who fell, severely wounded, while gallantly directing and encouraging his command', 'OR27-1-R029', '249'),
        'bach': L('BACH-WHATTOSEE-1873', 'here that the gallant General Paul received a fearful wound, — a bullet passing into one eye and out at the other, — from which he has since been totally blind', note='Bachelder, Gettysburg: What to See (1873)'),
        'me16': L('ME-GB-1898', 'General Paul, conmiander of the bris[ade, was shot through both eyes', note='the OCR prints conmiander of the bris[ade'),
        'ny104': L('NY-GB-1900-v2', 'Prior to this time General Paul had been severely wounded, losing the sight of both eyes', note='Colonel Gilbert G. Prey, the 104th New York at Gettysburg'),
        'pa107': L('PA-GB-1914-v1', 'It was at this time that General Paul, who commanded the First Brigade, was so severely wounded in the head, losing both eyes', note='address of a Pennsylvania regiment of Paul\'s brigade (a participant\'s statement made long after)'),
    },
    scenarios=[],
    default=None,
    remains=['the hour of Paul\'s wound', 'a report that Baxter\'s brigade first withdrew'],
    searched=['OR27-1-R029 pp.247-250, R043 pp.289-290, R044 pp.292-293, R052 p.307 read for Paul and Baxter',
              LIB182 + ' regex Paul near both eyes/blind/shot through the head: Bachelder 1873 and 1889, Bachelder Key 1864 (shot through the head), Maine at Gettysburg, New York at Gettysburg vols 1 and 2, Pennsylvania at Gettysburg vols 1 and 2, Battles and Leaders vol.3',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Paul\'s wound supported; reinforcement not replacement of a withdrawn Baxter; "blinded" not in the OR; no hour. Applied: "blinded" is cited from five non-OR accounts; the relief after 3 p. m. from Coulter; the replacement wording is corrected.',
    register=reg('Hour of General Paul\'s wound on Jul 1', 'The reports say only that Paul fell severely wounded in one of the repeated attacks on the Second Division; the accounts of the blinding give no hour.', 'Paul wounded inside the window 12:30 to 15:00 marked inferred; blindness as documented in non-OR accounts', 'documented', impact='Paul falls in the afternoon fight on the right; command passes to the colonels', ask='none', rids='R11, R04'),
    related=['tl-03-EG-04']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-142
ROWS.append(dict(
    id='T1-142', verdict='corrected',
    limits={'start': 'Lambeth\'s hour: the 14th North Carolina of Ramseur\'s brigade was moved to the front and engaged about 2 p. m. (R521 p.590)',
            'end': 'Grimes\'s hour: the 4th North Carolina arrived near the battle-field about 4 p. m. (R520 p.589)'},
    claim=claim('Daniel\'s brigade engages the enemy strongly posted along the railroad cut and makes a charge across the railroad; Ramseur\'s brigade, kept in reserve to support Iverson and O\'Neal, is ordered forward last, a few minutes after O\'Neal\'s brigade falls back; the hours of Ramseur\'s regiments differ (about 2 p. m. and about 4 p. m.)',
                'Daniel\'s brigade (32nd, 43rd, 45th, 53rd North Carolina, 2nd North Carolina Battalion) and Ramseur\'s brigade (2nd, 4th, 14th, 30th North Carolina), Rodes\' division',
                'The railroad cut and the ridge north of the Chambersburg pike (Rodes: across the railroad); the later names are not used',
                'Jul 1, about 14:00 to about 16:00 (no hour for Daniel; two hours for Ramseur\'s regiments)',
                'Rodes OR27-2-R506 pp.553-554; Daniel R507 p.566; O\'Neal R523 p.593; Lambeth R521 p.590; Grimes R520 p.589',
                'Daniel engaged the enemy "very strongly posted along a railroad cut" with his Second Battalion and 45th Regiment, and Rodes: "General Daniel made a most desperate, gallant, and entirely successful charge upon the enemy" across the railroad; "Just as his last effort was made, Ramseur\'s brigade ... was ordered forward" and "hurled ... upon the enemy just where he had repulsed O\'Neal". O\'Neal: "In a few minutes after we had fallen back, General Ramseur with his brigade arrived". '
                'Hours: Lambeth (14th North Carolina): about 2 p. m. the command moved to the front and engaged; Grimes (4th North Carolina): about 4 p. m. arrived near the battle-field and formed on the left of the brigade (Rodes has Ramseur in reserve from the start). NOT documented: a clock for Daniel\'s attack; "along the pike" (Rodes says across the railroad); the seed 15:00.',
                'documented', '1863-07-01T14:00', '1863-07-01T16:00', marking='order of attack and the railroad cut: documented; hours: Ramseur\'s regiments give about 14:00 and about 16:00, no default'),
    subs=[
        ('Daniel engaged the enemy very strongly posted along a railroad cut and in the woods behind it', 'documented', 'supported', ['dan_cut']),
        ('Rodes: Daniel made a most desperate, gallant and entirely successful charge across the railroad', 'documented', 'supported', ['r_dan']),
        ('Rodes: Ramseur\'s brigade, kept in reserve to support Iverson and O\'Neal, was ordered forward just as Daniel\'s last effort was made, and went in where O\'Neal had been repulsed', 'documented', 'supported', ['r_ram', 'r_res']),
        ('O\'Neal: in a few minutes after the Alabama regiments fell back General Ramseur\'s brigade arrived', 'documented', 'supported', ['o_ram']),
        ('Lambeth (14th North Carolina): about 2 p. m. the command was moved to the front and engaged the enemy; Grimes (4th North Carolina): about 4 p. m. arrived near the battle-field', 'documented', 'conflict', ['lam2', 'grim4']),
        ('Daniel attacks along the pike; Ramseur\'s attack at 15:00', 'open gap', 'unsupported', [], 'Rodes has the charge across the railroad; the reports give 14:00 and 16:00 for Ramseur\'s regiments'),
    ],
    cites={
        'dan_cut': OR('and engaged the enemy, very strongly posted . along a railroad cut, and in the edge of the woods in rear of the cut', R507, '566', note='the OCR prints a stray period and space in "posted . along"'),
        'r_dan': OR('General Daniel made a most desperate, gallant, and entirely successful charge upon the enemy', R506, '554'),
        'r_ram': OR("Just as his last effort was made, Ramseur's brigade,, which under my orders had been so disposed as to support both Iverson and O'Neal, was ordered forward, and was hurled by its commander with the skill and gallantry for which he is always conspicuous, and with irresistible force, upon the enemy just where he had repulsed O'Neal and checked Iverson's advance", R506, '554', note='the OCR prints a doubled comma after brigade'),
        'r_res': OR('Ramseur was in reserve', R506, '553'),
        'o_ram': OR('In a few minutes after we had fallen back, General Ramseur with his brigade arrived', R523, '593'),
        'lam2': OR('about 2 p. m., the command was moved to the front, and engaged the enemy', 'OR27-2-R521', '590'),
        'grim4': OR('About 4 p. m. arrived near the battle-field, and formed in line of battle', R520, '589'),
    },
    scenarios=[
        sc('A', 'Ramseur\'s brigade engages about 14:00', 'Lambeth, 14th North Carolina, OR27-2-R521 p.590', 'documented', ['lam2']),
        sc('B', 'Ramseur\'s brigade arrives near the field about 16:00', 'Grimes, 4th North Carolina, OR27-2-R520 p.589', 'documented', ['grim4']),
    ],
    default=None,
    remains=['an hour for Daniel\'s attack on the railroad cut', 'one hour for Ramseur\'s brigade (14:00 or 16:00)'],
    searched=['OR27-2-R506 (Rodes) pp.552-554, R507 (Daniel), R518 (Ramseur), R520 (Grimes), R521 (Lambeth), R523 (O\'Neal) read for hours; Ramseur\'s own report gives none',
              LIB182 + ' regex Daniel/Ramseur near 3 p. m. or 4 p. m.: no value beyond those of the reports',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): order of attack supported; the pike route and 15:00 not in the passages. Applied: the railroad cut is cited from Daniel; Ramseur\'s late arrival is cited from O\'Neal; the two regimental hours of Ramseur\'s brigade are carried as scenarios (the shard\'s Grimes 4 p. m. reading is confirmed on the OCR text).',
    register=reg('Hours of the attacks of Daniel\'s and Ramseur\'s brigades on Jul 1', 'No report gives an hour for Daniel; Ramseur\'s regiments give about 2 p. m. (14th North Carolina) and about 4 p. m. (4th North Carolina) although Rodes has the brigade in reserve from the start.', 'Order of attack documented; hours inside the window 14:00-16:00 marked inferred, both regimental hours selectable', 'documented', competing='about 14:00 (Lambeth) / about 16:00 (Grimes)', impact='Ramseur\'s brigade follows Daniel\'s charge inside the window', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-143
ROWS.append(dict(
    id='T1-143', verdict='corrected',
    limits={'start': 'Hancock\'s own hour of arrival (3 p. m., R076 p.368)',
            'end': 'Howard\'s hour at which the columns reached Cemetery Hill (4.30 p. m., R243 p.704), after which Hancock "came to me about this time"'},
    claim=claim('Hancock reaches Gettysburg and assumes command of the field: at 3 p. m. (his report), at 4 p. m. (Howard\'s dispatch and Slocum), about 4.25 p. m. (his 5.25 dispatch "an hour since") or after 4.30 p. m. (Howard\'s narrative); about the time of the withdrawal (Meade)',
                'Maj. Gen. W. S. Hancock (Second Corps) with Lt. Col. Morgan and the signal party; Maj. Gen. O. O. Howard; Maj. Gen. H. W. Slocum',
                'Cemetery Hill / Gettysburg (Hancock: arrived at Gettysburg; the First and Eleventh Corps retiring through the town)',
                'Jul 1, 15:00 to about 16:30 (four primary values; the delegated default is about 15:00-16:00)',
                'Hancock OR27-1-R076 pp.366-368; Howard R243 p.696; Slocum R271 p.768; Meade R006 p.115; Buford R337 p.927; Organization R009 p.167',
                'Hancock: "At 3 p. m. I arrived at Gettysburg and assumed the command"; his dispatch to Meade at 5.25 p. m.: "When I arrived here an hour since" (about 4.25); Howard\'s 10 p. m. dispatch: "General Hancock arrived at 4 p. m., and communicated his instructions"; Slocum: Howard commanded the field until 4 p. m., "when General Howard was relieved by the arrival of General Hancock"; Meade: "About the time of this withdrawal, Major-General Hancock arrived"; the Organization note: Howard commanded all troops on the field until the arrival of Hancock on the afternoon of Jul 1. '
                'The values conflict (15:00 / 16:00 / about 16:25) and are carried as scenarios; the delegated default is about 15:00-16:00 (C-039). The seed\'s secondary values (before 16:00, about 16:30) are not in the Official Records. The clock offset of about 20 minutes is not applied.',
                'documented', '1863-07-01T15:00', '1863-07-01T16:30', marking='four primary hours as scenarios; delegated default about 15:00-16:00'),
    subs=[
        ('Hancock\'s report: at 3 p. m. he arrived at Gettysburg and assumed command; the First and Eleventh Corps were retiring through the town', 'documented', 'conflict', ['h3']),
        ('Hancock\'s dispatch of 5.25 p. m. to Meade: "When I arrived here an hour since"', 'documented', 'conflict', ['h525']),
        ('Howard: General Hancock arrived at 4 p. m. and communicated his instructions; Slocum: Howard was relieved by the arrival of Hancock at 4 p. m.', 'documented', 'conflict', ['how4', 'slo4']),
        ('Howard\'s narrative: at 4.30 p. m. the columns reached Cemetery Hill, the enemy pressing hard, and "General Hancock came to me about this time" saying Meade had sent him', 'documented', 'conflict', ['how430', 'how_came']),
        ('Meade: about the time of the withdrawal Hancock arrived; Buford: while he was on Cemetery Hill Hancock arrived; Organization note: Howard commanded until Hancock\'s arrival on the afternoon of Jul 1', 'documented', 'supported', ['meade_wd', 'buf_h', 'org_n']),
    ],
    cites={
        'h3': OR('At 3 p. m. I arrived at Gettysburg and assumed the command', R076, '368'),
        'h525': OR('Second Army Corps. 5.25 [p. M., July 1, 1863,] General: When I arrived here an hour since', R076, '366'),
        'how4': OR('General Hancock arrived at 4 p. m., and communicated his instructions', R243, '696'),
        'slo4': OR('to 4 p. m. of same day (when General Howard was relieved by the arrival of General Hancock', 'OR27-1-R271', '768'),
        'how430': OR('At 4.30 p. m. the columns reached Cemetery Hill, the enemy pressing hard', R243, '704'),
        'how_came': OR('General Hancock came to me about this time, and said General Meade had sent him on hearing the state of affairs', R243, '704'),
        'meade_wd': OR('About the time of this withdrawal, Major-General Hancock arrived, whom I had dispatched to represent me on the field', 'OR27-1-R006', '115'),
        'buf_h': OR('While there. General Hancock arrived, and in a few moments he made superb disposition to resist any attack that might be made', 'OR27-1-R337', '927'),
        'org_n': OR('During the interval between the death of General Reynolds and the arrival of General Hancock, on the afternoon of July 1', 'OR27-1-R009', '164'),
    },
    scenarios=[
        sc('A', 'About 15:00 (Hancock\'s report)', 'Hancock OR27-1-R076 p.368', 'documented', ['h3']),
        sc('B', '16:00 (Howard\'s dispatch; Slocum)', 'Howard OR27-1-R243 p.696; Slocum OR27-1-R271 p.768', 'documented', ['how4', 'slo4']),
        sc('C', 'About 16:25 (Hancock\'s dispatch of 5.25 p. m., "an hour since")', 'Hancock OR27-1-R076 p.366', 'documented', ['h525']),
        sc('D', 'Before 16:00 (Civil War Monitor, seed value)', 'secondary (CWM); no non-lead source read', 'open gap', []),
        sc('E', 'About 16:30: "General Hancock came to me about this time" after the columns reached Cemetery Hill at 4.30 p. m. (also the seed value of Civil War News)', 'Howard OR27-1-R243 p.704 (narrative); the seed\'s CWN value has the same hour', 'documented', ['how430', 'how_came']),
    ],
    default=dict(scenario='A', basis='DELEGATED DECISION C-039-DEFAULT (2026-11-11): about 15:00-16:00 (documented), PDF default agrees; every other hour stays selectable; reversible by the owner'),
    remains=[],
    searched=['OR27-1-R076 (Hancock) pp.366-368, R243 (Howard) p.696, R271 (Slocum) p.768, R006 (Meade) p.115, R337 (Buford) p.927, R009 organization note read',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported): Hancock 3 p. m.; 5.25 dispatch "an hour since"; Howard 4 p. m.; the primaries conflict. Applied: Slocum\'s 4 p. m., Meade, Buford and the organization note are added; the delegated default C-039 is recorded and the secondary hours are kept as open-gap scenarios.',
    register=None,
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-144
ROWS.append(dict(
    id='T1-144', verdict='partially_supported',
    limits={'start': 'Hays\'s hour for the order to Gordon (a little after 2 o\'clock, R472 p.479)',
            'end': 'Doles\'s hour for his own occupation of the cavalry\'s hill (about 3.30 p. m., R514 p.581), the end of the period of the order'},
    claim=claim('Gordon\'s brigade, formed on the right of Early\'s division with the 26th Georgia detached to support the artillery, is ordered forward about 3 p. m. (Gordon; Hays: a little after 2) to the support of Rodes\' left (Doles\'), moves slowly until about 300 yards from the enemy, then advances rapidly over rail and plank fences and a creek and charges the line on the crest of a hill',
                'Gordon\'s brigade (Early\'s division): without the 26th Georgia (detached to the artillery under Lt. Col. Jones)',
                'North-east of Gettysburg between the Heidlersburg road and Rock Creek, on Doles\' left; the hill later called Barlow\'s Knoll (not named in the reports)',
                'Jul 1, a little after 14:00 to about 15:30',
                'Gordon OR27-2-R477 p.492; Hays R472 p.479; Early R470 p.468; Doles R514 p.581',
                'Gordon: "In accordance with orders from Major-General Early, I formed my brigade in line of battle on the right of the division, one regiment (the Twenty-sixth Georgia) having been detached to support the artillery under Lieutenant-Colonel Jones. About 3 p. m. I was ordered to move my brigade forward to the support of Major-General Rodes\' left"; the men moved slowly until within about 300 yards of the enemy\'s line (the OCR prints :>,()(); read as 300 on the page image), then rapidly, over rail and plank fences and a creek, and charged a line on the crest of a hill, part of it woodland. '
                'Hays puts the order to Gordon a little after 2 o\'clock. Doles gives about 3.30 p. m. for his own occupation of the cavalry\'s hill. NOT documented: the strength of about 1,200 after one regiment detached (no figure in the reports); the name Barlow\'s Knoll.',
                'documented', '1863-07-01T14:00', '1863-07-01T15:30', marking='order, regiments and charge: documented; strength 1,200: gap; hour: a little after 14:00 (Hays) or about 15:00 (Gordon)'),
    subs=[
        ('Gordon formed his brigade on the right of the division, with the 26th Georgia detached to support the artillery under Lt. Col. Jones', 'documented', 'supported', ['g_form']),
        ('About 3 p. m. Gordon was ordered to move his brigade forward to the support of Rodes\' left', 'documented', 'conflict', ['g3']),
        ('Hays: a little after 2 o\'clock Gordon was ordered to advance', 'documented', 'conflict', ['h2']),
        ('The brigade moved forward slowly until within about 300 yards of the enemy (the OCR prints :>,()(); read as 300 on the page image), then rapidly, over rail and plank fences and a creek, and charged a line drawn up on the crest of a hill', 'documented', 'supported', ['g_300', 'g_adv']),
        ('Jones placed twelve guns in position and opened fire on the enemy\'s artillery and on the flank of a column being massed; as Gordon advanced the fire was directed farther left', 'documented', 'supported', ['j12', 'j12b', 'j12c']),
        ('Strength about 1,200 after one regiment detached; the name Barlow\'s Knoll', 'open gap', 'unsupported', [], 'no figure of Gordon\'s strength in his report or Early\'s; the knoll names are later'),
    ],
    cites={
        'g_form': OR('one regiment (the Twenty-sixth Georgia) having been detached to support the artillery under Lieutenant-Colonel Jones', R477, '492'),
        'g3': OR("About 3 p. m. I was ordered to move my Indgade forward to the supp(jrt of Major-General Rodes' left", R477, '492', note='the OCR prints Indgade for brigade and supp(jrt for support'),
        'h2': OR('Brigadier-General Gordon, a little after 2 o\'clock, was ordered to advance', R472, '479',),
        'g_adv': OR('Moving forward under heavy fire over rail and plank fences, and crossing a creek', R477, '492', note='the sentence continues: whose banks were so abrupt as to prevent a passage excepting at certain points'),
        'g_300': OR('I therefore caused them to move forward slowly until within about :>,()() yards of the enemy\'s line', 'OR27-2-R477', '492', note='the OCR prints :>,()() for 300', image_check='digits read on the page image (part 2 leaf 497, printed page 492): "within about 300 yards of the enemy\'s line"'),
        'j12': OR('I immediately placed twelve guns in position', R478, '495', note='the OCR prints ojDcned for opened later in the sentence'),
        'j12b': OR('and upon the flank of a column of troops that were being inassed upon our light', 'OR27-2-R478', '495', note='the OCR prints inassed for massed and light for right'),
        'j12c': OR('On the advance of General Gordon\'s brigade from, our right, we directed ()ur fire fart', 'OR27-2-R478', '495', note='the sentence ends at the word fart(her): the OCR prints ()ur for our'),
    },
    scenarios=[
        sc('A', 'Order to Gordon a little after 14:00', 'Hays OR27-2-R472 p.479', 'documented', ['h2']),
        sc('B', 'Order to Gordon about 15:00', 'Gordon OR27-2-R477 p.492', 'documented', ['g3']),
    ],
    default=None,
    remains=['the strength of Gordon\'s brigade on Jul 1 (no figure; about 1,200 is the seed\'s)', 'the name of the hill'],
    searched=['OR27-2-R477 (Gordon) pp.491-493, R472 (Hays) p.479, R470 (Early) pp.468-469, R478 (Jones) p.495 read; regex strength figures for Gordon\'s brigade: none',
              LIB182 + ' regex Gordon near 1,200: Pennsylvania at Gettysburg and National Park Service texts give no number from a report',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): hour and order supported; OCR garbles brigade and support; 1,200 and the knoll are not in the OR; Doles 3.30. Applied: Hays\'s earlier hour is carried beside Gordon\'s; the 26th Georgia detachment is cited; the strength is marked unsupported.',
    register=reg('Strength of Gordon\'s brigade on Jul 1', 'Neither Gordon nor Early gives a strength; the seed\'s about 1,200 after one regiment detached has no source read.', 'Brigade shown with its regiments; strength as a roster range', 'documented', impact='Gordon attacks at the chosen hour with the regiments of his brigade less the 26th Georgia', ask='none', rids='R11, R04'),
    related=['tl-03-EG-04']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-145
ROWS.append(dict(
    id='T1-145', verdict='corrected',
    limits={'start': 'Howard\'s hour for the enemy showing himself in force in front of the Eleventh Corps (about 2.45 p. m., R243 p.703); Hays has the order to Gordon a little after 2',
            'end': 'Schurz\'s hour for the whole line engaged and the movement to the rear (after about 3 o\'clock; he reached Cemetery Hill after 5 o\'clock); the fight is inside this period, no end hour is printed'},
    claim=claim('Jones\' artillery opens; Gordon\'s brigade, supported by Hays\' and Avery\'s (Hoke\'s), attacks Barlow\'s division after a short but hot contest, breaks it and captures the severely wounded Barlow; the Eleventh Corps\' Second Brigade of the First Division falls back in disorder, the First Brigade (von Gilsa) is forced back contesting every inch; about 3 o\'clock the enemy appears with heavy masses (Schurz)',
                'Barlow\'s First Division (von Gilsa\'s First Brigade: 41st, 54th, 68th New York, 153rd Pennsylvania; Ames\' Second Brigade) and Early\'s division (Gordon\'s, Hays\', Avery\'s brigades; Jones\' artillery battalion)',
                'The hill west of Rock Creek on the Heidlersburg road north-east of the town; the First Division\'s line east of the Mummasburg road',
                'Jul 1, about 14:45 to after 15:00 (no end hour; the fight lasted less than an hour by no text read)',
                'Early OR27-2-R470 pp.468-469; Ewell R467 p.445; Gordon R477 p.492; Jones R478 p.495; Schurz R253 pp.728-729; Ames R244 p.712; Organization R009 p.167',
                'Early: Jones\' battalion opened with considerable effect; Gordon was ordered forward in support of Doles, then Hays\' and Hoke\'s brigades in line; "After a short but hot contest, Gordon succeeded in routing the force opposed to him, consisting of a division of the Eleventh Corps, commanded by Brigadier-General Barlow", captured Barlow, "who was severely wounded", and drove the division back with great slaughter; Ewell: Gordon\'s brigade "after an obstinate contest, broke Barlow\'s division, captured General Barlow". '
                'Schurz: about 3 o\'clock the enemy appeared in front with heavy masses of infantry, the Second Brigade, First Division fell back in considerable disorder, Barlow was severely wounded and carried off, the First Brigade, forced back, contested every inch; Ames took the First Division; the orders to withdraw to Cemetery Hill followed. Jones placed twelve guns in position and opened. '
                'The First Brigade of Barlow\'s division is von Gilsa\'s: the 41st New York (nine companies), 54th and 68th New York and 153rd Pennsylvania. NOT documented: the length of the fight (about 20 minutes or less than an hour: no text read); that Barlow was "shot" (the reports say severely wounded); Ames\'s "retreat" is his own division\'s falling back (R244).',
                'documented', '1863-07-01T14:45', '1863-07-01T15:30', marking='attack and breaking of Barlow\'s division: documented; length of the fight: gap; knoll names: later'),
    subs=[
        ('Early: Jones\' artillery opened on the enemy\'s infantry and artillery; Gordon was ordered forward to the support of Doles; Hays\' and Hoke\'s brigades were then ordered forward in line', 'documented', 'supported', ['e_art', 'e_gord']),
        ('Early: after a short but hot contest Gordon routed a division of the Eleventh Corps under Barlow and drove it back with great slaughter, capturing Barlow, severely wounded', 'documented', 'supported', ['e_short', 'e_barlow']),
        ('Ewell: Gordon\'s brigade, to the left of Doles\', after an obstinate contest, broke Barlow\'s division', 'documented', 'supported', ['ew_broke']),
        ('Schurz: about 3 o\'clock the enemy appeared in front with heavy masses of infantry; the Second Brigade, First Division fell back in considerable disorder; Barlow was severely wounded and carried off; the First Brigade was forced back, contesting every inch', 'documented', 'supported', ['s_three', 's_fell', 's_barlow']),
        ('Jones placed twelve guns in position and opened with considerable effect on the enemy\'s artillery and a column being massed', 'documented', 'supported', ['j12']),
        ('The First Brigade of the First Division: von Gilsa\'s 41st (nine companies), 54th and 68th New York and 153rd Pennsylvania', 'documented', 'supported', ['oob']),
        ('The fight lasted about 20 minutes (Civil War News) or less than an hour (Wikipedia); Barlow was shot', 'open gap', 'unsupported', [], 'no text read gives a duration; the reports say severely wounded'),
    ],
    cites={
        'e_art': OR('Jones\' battalion of artillery was posted in a field on the left of the Heidlersburg road, immediately in front of Hoke\'s brigade', R470, '468'),
        'e_gord': OR('Gordon\'s brigade was then ordered forward to the support of Doles\' brigade', R470, '468'),
        'e_short': OR('After a short but hot contest. Gordon succeeded in routing the force opposed to him', R470, '468', note='the OCR prints a period for the comma'),
        'e_barlow': OR('General Barlow himself, who was severely wounded', R470, '469'),
        'ew_broke': OR('which, after an obstinate contest, broke Barlow\'s division', R467, '445'),
        's_three': OR('about 3 o\'clock, before the forward movement of the First Division, could be arrested by my orders, the enemy appeared in our front with lieavy masses of infantry', R253, '728', note='the OCR prints lieavy for heavy'),
        's_fell': OR('the Second Brigade, First Division, whose flank had been most exposed in consequence of the advance, fell back in considerable disorder', R253, '729'),
        's_barlow': OR('was severely wounded, and had to be carried off the battle-field', R253, '729'),
        'j12': OR('I immediately placed twelve guns in position', R478, '495'),
        'oob': OR('68th New York, Col. Gotthilf Bourry', R009, '164', note='the First Brigade, Col. Leopold von Gilsa: 41st New York (nine companies), 54th New York, 68th New York, 153rd Pennsylvania (the OCR prints J53d)'),
    },
    scenarios=[
        sc('A', 'The enemy appears in force about 14:45 (Union clock)', 'Howard OR27-1-R243 p.703', 'documented', []),
        sc('B', 'Gordon ordered forward a little after 14:00', 'Hays OR27-2-R472 p.479', 'documented', []),
        sc('C', 'Gordon ordered forward about 15:00; the enemy in heavy masses about 15:00 (Schurz)', 'Gordon OR27-2-R477 p.492; Schurz OR27-1-R253 p.728', 'documented', ['s_three']),
    ],
    default=None,
    remains=['the length of the fight (about 20 minutes or under an hour)', 'that Barlow was shot'],
    searched=['OR27-2-R470 pp.468-469, R467 p.445, R477 p.492, R478 p.495, R472; OR27-1-R253 pp.727-731, R244, R245, R009 p.167 read',
              LIB182 + ' regex Barlow near the length of the fight: not found',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Gordon breaks Barlow, captured; Schurz about 3 o\'clock; Ewell says captured not shot; Ames, von Gilsa\'s regiments, Jones\' artillery and the duration not in the passages. Applied: all are cited from Early, Schurz, Jones and the organization list; the duration and "shot" are marked unsupported.',
    register=reg('Length of the fight on Barlow\'s Knoll and the cause of Barlow\'s wound', 'No report gives a duration (the seed has about 20 minutes and under an hour); Barlow is "severely wounded" in Early and Schurz.', 'Fight inside the window 14:45 to 15:30 with no duration claimed', 'documented', competing='about 20 minutes / under an hour', impact='the knoll falls inside the window; Barlow is shown wounded and captured', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-146
ROWS.append(dict(
    id='T1-146', verdict='corrected',
    limits={'start': 'the hour at which the 17th Connecticut came into Gettysburg (between 1 and 2 p. m., Brady R247 p.716) and the Eleventh Corps\' First Division was engaged on the plain',
            'end': 'Schurz\'s hour for the collapse (after about 3 o\'clock) with the retreat to Cemetery Hill after 5 o\'clock; no hour of either death is printed'},
    claim=claim('Lieut. Colonel Douglas Fowler of the 17th Connecticut is killed when his six companies advance and deploy north of the town (Ames\' brigade); Lieut. Bayard Wilkeson, commanding Battery G, 4th U.S. Artillery, is mortally wounded soon after the battery opens on the north side of the York road (Barlow\'s division); neither is a late counterattack of the knoll and neither rank or name of the seed is right',
                '17th Connecticut (Lieut. Col. D. Fowler, Maj. A. G. Brady); Battery G, 4th U.S. Artillery (Lieut. B. Wilkeson, then Lieut. E. A. Bancroft)',
                'North of Gettysburg, left and front of the town, Ames\' brigade; the battery on the north side of the York road east of the poor-house, Barlow\'s division',
                'Jul 1, between about 11:00 (the battery in action) and the retreat (no hour of either death)',
                'Casualty return OR27-1-R013 pp.186-193; Brady R247 p.717; Bancroft R269 p.756; Hunt R028 p.230; Howard R243 p.705',
                'The casualty return lists among the officers killed, Connecticut, "Lieut. Colonel Douglas Fowler, 17th Infantry"; Brady: the regiment (six companies under Lieutenant-Colonel Fowler) advanced with the other regiments of the brigade to the left and front of the town, behind the 107th Ohio, deployed at the double-quick, and "Lieutenant-Colonel Fowler was killed when the regiment advanced and deployed". '
                'Wilkeson: Hunt says "About 11 a. m. Wilkeson\'s battery ... came up, and reported to General Barlow, who posted it close to the enemy\'s line of infantry ... In the commencement of this unequal contest, Lieut. Bayard Wilkeson ... fell, mortally wounded, and was carried from the field"; Bancroft: the battery reached the town at 11 a. m., engaged on the north side of the York road eastward of the poor-house, and "Lieutenant Wilkeson was struck in the right leg by a shot from the enemy\'s artillery, and mortally wounded" before the sections retired after half an hour; Howard also records him mortally wounded. '
                'The seed\'s "Col. Douglas Fowler" is Lieutenant-Colonel and "Lt. Col. Baynard Wilkeson" is First Lieutenant Bayard Wilkeson. NOT documented: the hour of either death; that either was in a "counterattack on the knoll".',
                'documented', '1863-07-01T13:00', '1863-07-01T15:30', marking='names, ranks, deaths: documented; hours: gap; place of Wilkeson: documented (York road); Fowler: north of the town'),
    subs=[
        ('Lieut. Colonel Douglas Fowler, 17th Connecticut, is listed among the officers killed (casualty return, Connecticut)', 'documented', 'supported', ['f_ret']),
        ('Lieutenant-Colonel Fowler was killed when the six companies of the regiment advanced and deployed to the left and front of the town', 'documented', 'supported', ['f_brady', 'f_adv']),
        ('Wilkeson\'s battery (G, 4th U.S.) came up about 11 a. m., was posted by Barlow close to the enemy\'s infantry and in the commencement of the unequal contest Lieut. Bayard Wilkeson fell mortally wounded', 'documented', 'supported', ['w_hunt']),
        ('Bancroft: the battery reached the town at 11 a. m.; Lieutenant Wilkeson was struck in the right leg by a shot from the enemy\'s artillery and mortally wounded on the north side of the York road', 'documented', 'supported', ['w_ban11', 'w_ban']),
        ('The rank and name in the seed: Col. Douglas Fowler and Lt. Col. Baynard Wilkeson', 'documented', 'contradicted', ['f_ret', 'w_ban'], 'Fowler was a lieutenant-colonel; Wilkeson a first lieutenant named Bayard'),
        ('The hours of the two deaths; that either fell in a counterattack on the knoll', 'open gap', 'unsupported', []),
    ],
    cites={
        'f_ret': OR('Lieut. Colonel Douglas Fowler, 17th Infantry', R013, '188', note='the OCR of the return loses the running head; the Connecticut list is on the pages 186-193'),
        'f_brady': OR('The remainder of the regiment (six companies), under Lieutenant- Colonel Fowler, advanced with the other regiments of the brigade to the left and front of the town', R247, '717'),
        'f_adv': OR('Lieutenant-Colonel Fowler was killed when the regiment advanced and deployed', R247, '717'),
        'w_hunt': OR('the commencement of this unequal contest', R028, '230', note='the sentence continues: Lieut. Bayard Wilkeson (Fourth U. S. Artillery), commanding the battery, a young officer of great gallantry, fell, mortally wounded'),
        'w_ban11': OR('the battery reached the town at 11 a. m.', R269, '756'),
        'w_ban': OR('Lieutenant Wilkeson was struck in the right leg by a shot from the enemy\'s artillery, and mortally wounded', R269, '756'),
    },
    scenarios=[],
    default=None,
    remains=['the hour of Fowler\'s and of Wilkeson\'s death', 'that either fell in a late counterattack on Barlow\'s Knoll'],
    searched=['OR27-1-R013 (Return of Casualties) officers killed, Connecticut; R247 (Brady) pp.716-719, R269 (Bancroft) p.756, R028 (Hunt) p.230, R243 (Howard) p.705 read',
              LIB182 + ' regex Fowler/Wilkeson: New York at Gettysburg vol.1 and the Connecticut volume are not in the library; the state volumes read give nothing earlier than the reports',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): names and fates, ranks corrected (Lieutenant-Colonel Fowler; Lieut. Bayard Wilkeson); the hit times not given; the casualty return page head lost in the OCR. Applied: the casualty return is cited with the page pair 186-193; Fowler\'s and Wilkeson\'s places and the 11 a. m. hour of the battery come from Brady, Bancroft and Hunt; the seed\'s ranks and names are marked contradicted.',
    register=reg('Hours of the deaths of Lt. Col. Fowler and Lieut. Wilkeson on Jul 1', 'The reports give the places and the order of events but no hour for either death; Wilkeson fell at the start of the artillery duel after 11 a. m., Fowler as the regiment deployed.', 'Both deaths shown in the window 13:00-15:30 with the Union clock; names and ranks as the reports', 'documented', impact='two officers fall on the north side of the town; no hour is claimed', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-147
ROWS.append(dict(
    id='T1-147', verdict='partially_supported',
    limits={'start': 'Doubleday\'s hour for the enemy\'s advance with the 151st Pennsylvania and 24th Michigan engaged until the retreat (the First Corps engaged since about 10:15); no hour for the collapse of either regiment is printed; 15:00 is the seed\'s',
            'end': 'Wadsworth\'s hour for the order to retire (3.45 o\'clock, R032 p.266)'},
    claim=claim('The 151st Pennsylvania (Biddle\'s brigade) goes in with 21 officers and 446 men (467) and has 8 officers and 113 men answer the roll next morning; the 24th Michigan (Iron Brigade) has 496 men at the start (OCR) and loses 399 (OCR digits damaged); Colonel Morrow is wounded, left on the field and falls with the other wounded into the enemy\'s hands; the hour of the collapse is not given',
                '151st Pennsylvania (Lieut. Col. G. F. McFarland), First Brigade, Third Division; 24th Michigan (Col. H. A. Morrow), Iron Brigade, First Division, First Corps',
                'McPherson Ridge and the line west of the seminary; the barricade west of the seminary building',
                'Jul 1 afternoon, until the retreat at 15:45 (seed: 15:00-15:30)',
                'McFarland OR27-1-R060 p.328; Morrow R033 pp.269-270; Rowley R055 p.313; Wadsworth R032 p.266',
                'McFarland: the 151st Pennsylvania "moved through the town to Cemetery Hill, where 8 officers and 113 men answered to roll-call next morning, though 21 officers and 446 men had gone into the fight"; the regiment "did not number one-fourth of what it did two hours earlier". Morrow: the strength on Jul 1 is printed in a table (OCR digits: field officers 3, staff 1, line officers 34, non-commissioned officers and privates 468, total 49ft, which reads 496 but the printed parts add to 506); the losses table has 79 killed and 237 wounded and about 80 enlisted men and 3 officers missing (the OCR of the total is 3m: a total of 399 would be 79 + 237 + 83); "I was wounded just before reaching the barricade, west of the seminary building, and left the field" and "Nearly all our wounded, myself among them, fell into the hands of the enemy when he took possession of the town". '
                'The revised statement of casualties in the First Corps (R013 p.173) is too damaged in the OCR to read for the 151st Pennsylvania. NOT documented: losses of 337 of 467 (467 minus the roll-call of 121 is 346) and 399 of 496 as printed numbers; that Morrow was "captured" as such (he fell into enemy hands as a wounded man); the hour 15:00-15:30.',
                'documented', '1863-07-01T15:00', '1863-07-01T15:45', marking='strengths and roll-call: documented; losses 337 and 399: OCR damaged, gap; collapse hour: gap'),
    subs=[
        ('The 151st Pennsylvania went into the fight with 21 officers and 446 men and 8 officers and 113 men answered to roll-call next morning on Cemetery Hill', 'documented', 'supported', ['mcf_roll']),
        ('The 24th Michigan\'s strength on Jul 1 is printed in a table (OCR: total 49ft, read 496) and its losses in a table (OCR: 79 killed, 237 wounded, about 80 enlisted men and 3 officers missing)', 'documented', 'supported', ['mor_str', 'mor_miss'], 'the OCR digits of the totals are damaged and do not all add up; not checked on the page image'),
        ('Morrow was wounded just before reaching the barricade west of the seminary building and left the field; nearly all the regiment\'s wounded, himself among them, fell into the hands of the enemy when he took possession of the town', 'documented', 'supported', ['mor_wd', 'mor_cap']),
        ('The 151st Pennsylvania lost 337 of 467; the 24th Michigan 399 of 496', 'open gap', 'unsupported', [], 'the revised return is unreadable in the OCR; 467 minus the roll-call 121 is 346, not 337'),
        ('The collapse of Biddle\'s and the Iron Brigade lines at 15:00-15:30 (seed "SS")', 'open gap', 'unsupported', [], 'no report gives that hour; Wadsworth\'s order to retire is 3.45'),
    ],
    cites={
        'mcf_roll': OR('It moved through the town to Cemetery Hill, where 8 officers and 113 men answered to roll-call next morning, though 21 officers and 446 men had gone into the fight', 'OR27-1-R060', '328'),
        'mor_str': OR('The strength of the regiment on July 1 was as follows', R033, '269'),
        'mor_miss': OR('About 80 of the enlisted men and 3 officers were reported as missing in action', R033, '269'),
        'mor_wd': OR('I was wounded just before reaching the barricade, west of the seminary building, and left the field', R033, '269'),
        'mor_cap': OR('myself among them, fell into the hands of the enemy when he took possession of the town of Gettysburg', R033, '270'),
    },
    scenarios=[],
    default=None,
    remains=['the numbers of killed, wounded and missing of the 151st Pennsylvania and 24th Michigan as clean figures (the return is damaged)', 'the hour of the collapse of Biddle\'s and the Iron Brigade lines'],
    searched=['OR27-1-R060 (McFarland) p.328, R033 (Morrow) pp.267-270, R013 pp.172-175 (revised casualty statement: unreadable for these regiments) read',
              LIB182 + ' regex 151st/24th Michigan with loss figures: Pennsylvania at Gettysburg vol.2, Michigan at Gettysburg 1889, Fox 1889 (not read for the 151st and 24th rows)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): 151st: 21 officers and 446 men went in (467), roll-call 8 and 113 (the row\'s 337 is secondary); 24th Michigan not found in R033 as 399/496; Morrow "scalp wound" and not captured. Applied: Morrow\'s own words (wounded, left the field, fell into enemy hands) and his strength table are cited; the 337 and 399 are marked unsupported; the collapse hour is marked unsupported.',
    register=reg('Clean loss figures of the 151st Pennsylvania and 24th Michigan and the hour of the collapse, Jul 1', 'The casualty tables are damaged in the OCR (the page image was not read); the roll-call of the 151st is not a loss figure; no report gives an hour for the collapse.', 'Strengths and roll-call as printed; losses as ranges with the damaged-table note; collapse placed before the 15:45 retreat order', 'documented', impact='the two regiments appear at their strengths and shrink to the roll-call; figures not drawn beyond that', ask='an owner-only step: a page-image reading of OR27-1 p.173 and p.269 (the OCR digits are damaged)', rids='R11, R04'),
    related=['tl-03-EG-04']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-148
ROWS.append(dict(
    id='T1-148', verdict='corrected',
    limits={'start': 'the hour at which Stone posted his brigade (11 o\'clock, R061 p.329)',
            'end': 'Wadsworth\'s order to retire (3.45 o\'clock, R032 p.266); Stone was wounded before that and carried from the field'},
    claim=claim('Colonel Stone is severely wounded in the fight of his brigade on the Chambersburg road and at the railroad cut against Daniel (or the other attackers) and carried from the field (to the McPherson barn stable for first aid, per the National Park Service); Wister takes command; "captured" is not in the reports',
                'Second Brigade, Third Division, First Corps (Col. R. Stone: 143rd, 149th, 150th Pennsylvania); Col. L. Wister, then Col. E. Dana',
                'The Chambersburg (Cashtown) road and the railroad cut, McPherson ridge; the McPherson barn',
                'Jul 1, between 11:00 and 15:45 (no hour for the wound)',
                'Stone OR27-1-R061 p.330; Doubleday R029 pp.247-249; Rowley R055 p.313; National Park Service McPherson Farm study',
                'Stone: "Being wounded about this time and carried from the field, I cannot speak so definitely of the remainder of the action. Colonel Wister ... assumed command of the brigade"; Doubleday: "Stone himself was shot down, battling to the last. The gallant Colonel Wister, who succeeded him in command, was also wounded, and the command devolved upon Colonel Dana", and "It was in this affair that Colonel Stone was severely wounded, and Colonel Wister assumed command of the brigade" (the fight at the railroad cut against the enemy battery enfilading it). '
                'The National Park Service McPherson study says Stone was carried into the stable area of the McPherson barn to receive first aid until he could be evacuated, and that he lay within the stone walls of the barn. "Captured" (the Stone Sentinels reading) is not in the Official Records or the texts read; the two readings are not mutually exclusive. Daniel as the opponent and the hour 15:00-16:00 are not in these passages.',
                'documented', '1863-07-01T11:00', '1863-07-01T15:45', marking='wounded: documented; captured: not documented (secondary only); hour of the wound: gap'),
    subs=[
        ('Doubleday: Stone himself was shot down, battling to the last; Wister, who succeeded him, was also wounded and the command devolved upon Dana', 'documented', 'supported', ['d_down']),
        ('Doubleday: in the fight at the railroad cut Colonel Stone was severely wounded and Colonel Wister assumed command of the brigade', 'documented', 'supported', ['d_aff']),
        ('Stone: being wounded he was carried from the field; Wister assumed command', 'documented', 'supported', ['s_own']),
        ('Stone was carried into the stable area of the McPherson barn for first aid until he could be evacuated (National Park Service, citing participants)', 'inferred', 'supported', ['nps_stone']),
        ('Stone was captured (Stone Sentinels); the opponent was Daniel; the hour 15:00-16:00', 'open gap', 'unsupported', []),
    ],
    cites={
        'd_down': OR('Stone himself was shot down, battling to the last', R029, '247'),
        'd_aff': OR('It was in this affair that Colonel Stone was severely wounded, and Colonel Wister assumed command of the brigade', R029, '249'),
        's_own': OR('Being wounded about this time and carried from the field, I cannot speak so definitely of the remainder of the action', R061, '330'),
        'nps_stone': L('NPS-HS-MCPHERSON', 'Stone was carried in to the stable area o f the McPherson barn to receive " f i r s t aid " treatment u n t il he could be evacuated', note='the text layer of this study spaces its letters; the quote is the layer as printed'),
    },
    scenarios=[
        sc('A', 'Stone wounded and carried from the field (Official Records)', 'Stone OR27-1-R061 p.330; Doubleday R029 pp.247-249', 'documented', ['d_down', 's_own']),
        sc('B', 'Stone captured (Stone Sentinels, seed)', 'secondary; not found in a source read', 'open gap', []),
    ],
    default=None,
    remains=['"captured"', 'Daniel as the opponent', 'the hour of the wound'],
    searched=['OR27-1-R061 (Stone) in full, R029 pp.247-249, R055 read; OR27-1-R062 (Wister): Stone wounded before the 150th\'s stand',
              LIB182 + ' regex Stone with captured/prisoner: only the National Park Service McPherson study (barn first aid)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): wounded supported; "captured" is secondary; Daniel and the hour not in the passage. Applied: Stone\'s own report (carried from the field) and the Park Service barn account are added; the two readings are carried as scenarios without a default.',
    register=reg('Whether Colonel Stone was captured and the hour of his wound', 'The reports say wounded and carried from the field; the Stone Sentinels reading of captured is a secondary statement not found in any text read.', 'Wounded and carried to the barn for first aid (documented / inferred); captured not asserted', 'documented', competing='wounded (OR) vs captured (secondary)', impact='Stone leaves the line wounded; no capture is drawn', ask='none: both readings stay selectable', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-149
ROWS.append(dict(
    id='T1-149', verdict='corrected',
    limits={'start': 'the hour at which Doles formed his line (about 1 p. m., R514 p.581)',
            'end': 'the hour at which Doles says the brigade occupied the cavalry\'s hill (about 3.30 p. m., R514 p.581) and the attack on the rock fence followed'},
    claim=claim('Doles\' brigade drives off the Union cavalry picket on its front and left flank with skirmishers and occupies the cavalry\'s hill to its left about 3.30 p. m. (his clock); after the enemy moves against the left, the brigade moves by the left flank and, with Gordon, attacks the enemy on that hill, driving him from behind a rock fence',
                'Doles\' brigade (4th, 12th, 21st, 44th Georgia), Rodes\' division; Union cavalry picket (Buford\'s division); Gordon\'s brigade',
                'A hill on the left of Doles\' line, north-east of Gettysburg (Doles does not say east or west of Rock Creek); the rock fence on the hill in the later attack',
                'Jul 1, about 15:30 (Doles\' clock) and after',
                'Doles OR27-2-R514 pp.581-582',
                'Doles: "The enemy\'s cavalry picket appearing in force on our front and left flank, skirmishers from this command were ordered to dislodge him. After a short engagement, he was driven from his position, when we occupied his position (a hill to our left), about 3.30 p. m." The enemy then moved his force from the front, made a strong demonstration on the left and drove the skirmishers from the hill; "The command was then moved by the left flank"; with Gordon\'s brigade joining on the left "we moved forward to attack the enemy in his position. Our effort was successful. He was driven from behind a rock fence, with heavy loss in killed and wounded". '
                'NOT documented: "east of Rock Creek" (not in the report) and the seed\'s "later attacks a stone barrier" is the rock fence of the same fight.',
                'documented', '1863-07-01T15:30', '1863-07-01T16:00', marking='hour about 15:30 (Doles\' own clock): documented; the place east of Rock Creek: gap'),
    subs=[
        ('The enemy\'s cavalry picket appeared in force on Doles\' front and left flank; skirmishers were ordered to dislodge him; after a short engagement he was driven off and the brigade occupied his position, a hill to its left, about 3.30 p. m.', 'documented', 'supported', ['d_pick', 'd_330']),
        ('The brigade later attacked the enemy on the hill with Gordon on its left and drove him from behind a rock fence with heavy loss', 'documented', 'supported', ['d_rock']),
        ('The hill lay east of Rock Creek', 'open gap', 'unsupported', []),
    ],
    cites={
        'd_pick': OR('The enemy\'s cavalry picket appearing in force on our front and left flank, skirmishers from this command were ordered to dislodge him', R514, '581'),
        'd_330': OR('After a short engagement, he was driven from his position, when we occupied his position (a hill to our left), about 3.30 p. m.', R514, '581'),
        'd_rock': OR('He was driven from behind a rock fence, with heavy loss in killed and wounded', R514, '582'),
    },
    scenarios=[],
    default=None,
    remains=['the place of the hill relative to Rock Creek'],
    searched=['OR27-2-R514 (Doles) read in full; R515, R516, R517 for the same fight', LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Doles\' hour and the seizure of the hill supported; east of Rock Creek and a stone barrier not in the page text read. Applied: the rock fence is found in the next sentences of the same report; the place relative to Rock Creek is marked unsupported.',
    register=reg('Position of Doles\' hill relative to Rock Creek, Jul 1', 'Doles calls it only "a hill to our left"; the later names of the hill are National Park Service names.', 'The hill shown to the left of Doles\' line; no east or west of Rock Creek asserted', 'documented', impact='the hill is placed by Doles\' description; the name is not drawn as 1863 usage', ask='none', rids='R13'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-150..T1-153 are in rows_c.py
