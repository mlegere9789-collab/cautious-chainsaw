"""Close-out row data of shard tl-03 (T1-150 .. T1-172). build.py re-matches every quote verbatim in the local source text and refuses the run if one is not found."""
from rowlib import *

ROWS = []
R029 = 'OR27-1-R029'; R032 = 'OR27-1-R032'; R043 = 'OR27-1-R043'; R044 = 'OR27-1-R044'; R045 = 'OR27-1-R045'; R055 = 'OR27-1-R055'; R071 = 'OR27-1-R071'; R076 = 'OR27-1-R076'; R243 = 'OR27-1-R243'; R250 = 'OR27-1-R250'; R253 = 'OR27-1-R253'
R426 = 'OR27-2-R426'; R467 = 'OR27-2-R467'; R470 = 'OR27-2-R470'; R506 = 'OR27-2-R506'; R507 = 'OR27-2-R507'; R527 = 'OR27-2-R527'; R534 = 'OR27-2-R534'; R549 = 'OR27-2-R549'; R551 = 'OR27-2-R551'; R556 = 'OR27-2-R556'; R557 = 'OR27-2-R557'; R558 = 'OR27-2-R558'
LOGNOTE = 'every search is logged with pattern, scope and hit counts per source in horde/tl-03/closeout/search_log.jsonl'
LIB182 = 'the 182 local library texts (acquired_2.json: 99 texts and the 9 earlier state volumes; acquired_3.json: 73 National Park Service texts; Pennsylvania at Gettysburg vol.1), regex search on whitespace-normalised text'

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-150
ROWS.append(dict(
    id='T1-150', verdict='corrected',
    limits={'start': 'Wadsworth\'s hour for the order to retire (3.45 o\'clock, R032 p.266); the seed\'s 15:30 is a National Park Service value that no report gives',
            'end': 'Howard\'s positive order to the First and Eleventh Corps to fall back (4.10 p. m., R243 p.704)'},
    claim=claim('The First Corps falls back to the seminary line: Wadsworth orders his division to retire at 3.45 (outflanked, pressed, ammunition nearly exhausted), the line making its stand behind the barricade of rails in front of the seminary; Doubleday gives about 4 p. m. for the enemy\'s re-enforced advance and then orders the fall-back; Howard sends word about 4 p. m. and a positive order at 4.10 to fall back to Cemetery Hill',
                'First Corps (Doubleday): First Division (Wadsworth), Third Division (Rowley), Second Division (Robinson later); Howard commanding the field',
                'From McPherson Ridge and the right flank to the seminary line (Seminary Ridge), then through the town to Cemetery Hill',
                'Jul 1, 15:45 to 16:10 (the seed 15:30-16:00 contains Wadsworth\'s 15:45)',
                'Wadsworth OR27-1-R032 p.266; Doubleday R029 p.250; Rowley R055 p.313; Howard R243 p.704',
                'Wadsworth: "Finding myself outflanked on both right and left, heavily pressed in front, and my ammunition nearly exhausted, at 3.45 o\'clock I ordered the command to retire. The movement was effected in good order, and all the artillery brought off safely, excepting one caisson"; he had received orders direct from Howard "to hold Seminary Ridge as long as possible". Doubleday: "About 4 p. m. the enemy, having been strongly re-enforced, advanced in large numbers ... It became necessary to retreat", and "I now gave orders to fall back, this and Meredith\'s brigades covering the movement by occupying the intrenchments in front of the seminary". '
                'Rowley: the position was held until nearly 4 o\'clock. Howard: "About 4 p. m. I sent word to General Doubleday that, if he could not hold out longer, he must fall back, fighting, to Cemetery Hill"; "At 4.10 p. m. ... I sent a positive order to the commanders of the First and Eleventh Corps to fall back gradually". NOT documented: 15:30 (the seed\'s National Park Service value) as the hour of any order.',
                'documented', '1863-07-01T15:45', '1863-07-01T16:10', marking='retire orders 15:45, about 16:00, 16:10: documented, separate orders (see T1-151); 15:30: not supported'),
    subs=[
        ('Wadsworth: at 3.45 o\'clock he ordered the command to retire, the movement effected in good order and all the artillery brought off safely but one caisson', 'documented', 'supported', ['w345', 'w_good']),
        ('Wadsworth had received orders direct from Howard to hold Seminary Ridge as long as possible', 'documented', 'supported', ['w_hold']),
        ('Doubleday: about 4 p. m. the enemy, strongly re-enforced, advanced in large numbers and it became necessary to retreat; he gave orders to fall back, Meredith\'s and another brigade covering the movement from the intrenchments in front of the seminary', 'documented', 'supported', ['d4', 'd_nec', 'd_fall']),
        ('Rowley: the position was held until nearly 4 o\'clock in the afternoon', 'documented', 'supported', ['row4']),
        ('Howard: about 4 p. m. word to Doubleday to fall back, fighting, to Cemetery Hill; at 4.10 p. m. a positive order to the First and Eleventh Corps to fall back gradually', 'documented', 'supported', ['h4', 'h410']),
        ('The First Corps fell back to the seminary at about 15:30 (National Park Service, seed)', 'open gap', 'unsupported', [], 'no report gives 15:30; Wadsworth\'s 3.45 is the earliest'),
    ],
    cites={
        'w345': OR('Finding myself outflanked on both right and left, heavily pressed in front, and my ammunition nearly exhausted, at 3.45 o\'clock I ordered the command to retire', R032, '266'),
        'w_good': OR('The movement was effected in good order, and all the artillery brought off safely', R032, '266'),
        'w_hold': OR('I received orders direct from Major-General Howard to hold Seminary Ridge as long as possible', R032, '266'),
        'd4': OR('About 4 p. m. the enemy, having been strongly re-enforced, advanced in large numbers', R029, '250'),
        'd_nec': OR('It became necessary to retreat', R029, '250'),
        'd_fall': OR('I now gave orders to fall back, this and Meredith\'s brigades covering the movement by occupying the intrenchments in front of the seminary', R029, '250'),
        'row4': OR('The position selected by General Reynolds had been steadily and determinedly maintained until nearly 4 o\'clock in the afternoon', R055, '313'),
        'h4': OR('About 4 p. m. I sent word to General Doubleday that, if he could not hold out longer, he must fall back, fighting, to Cemetery Hill and on the left of the Baltimore pike', R243, '704'),
        'h410': OR('At 4.10 p. m., finding that I could hold out no longer, and that the troops were already giving way, I sent a positive order to the commanders of the First and Eleventh Corps to fallback gradually, disputing every inch of ground', R243, '704', note='the OCR prints fallback'),
    },
    scenarios=[],
    default=None,
    remains=['an hour of 15:30 for any order (National Park Service)'],
    searched=['OR27-1-R032 (Wadsworth) p.266, R029 (Doubleday) pp.250-251, R055 (Rowley) p.313, R243 (Howard) pp.703-704 read', LIB182 + ' regex retire/retreat with 3.45 and 4 p. m.: only the reports above and National Park Service values', LOGNOTE],
    recheck='OR-RECHECK-2 (supported): Wadsworth 3.45; Doubleday p.251 repeats 3.45 and p.250 "About 4 p. m." is the enemy advance; "Seminary Ridge" from Doubleday\'s narrative. Applied: Howard\'s 4 p. m. message and 4.10 order are added; 15:30 is marked unsupported; the retreat orders are separate (row T1-151).',
    register=reg('The 15:30 hour of the First Corps\' fall-back', 'No report gives 15:30; the earliest order is Wadsworth\'s 3.45.', 'Fall-back from 15:45', 'documented', competing='15:30 (National Park Service, seed) vs 15:45 (Wadsworth)', impact='the fall-back starts at 15:45; the earlier hour is not drawn', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-151
ROWS.append(dict(
    id='T1-151', verdict='corrected',
    limits={'start': 'Wadsworth\'s hour for the order to retire (3.45 o\'clock, R032 p.266)',
            'end': 'Robinson\'s hour for the orders to withdraw reaching the Second Division (nearly 5 p. m., R043 p.290)'},
    claim=claim('The Union retreat from the First Corps front: different orders at different hours: 15:45 (Wadsworth, his division), about 16:00 (Doubleday\'s order, after the enemy\'s advance about 4; Howard\'s message about 4 and positive order 4.10), nearly 17:00 (Robinson, the Second Division); 16:30 is not in the reports; delegated default 16:00 inside 15:45-17:00',
                'First Corps: Wadsworth\'s, Rowley\'s and Robinson\'s divisions; Howard and Doubleday ordering',
                'The First Corps front west and north-west of Gettysburg, the seminary line, the town, Cemetery Hill',
                'Jul 1, 15:45 to nearly 17:00',
                'Wadsworth OR27-1-R032 p.266; Doubleday R029 p.250; Robinson R043 p.290; Howard R243 p.704; Rowley R055 p.313',
                'Wadsworth ordered his command to retire at 3.45; Doubleday gives about 4 p. m. for the enemy\'s re-enforced advance and then ordered the fall-back (the seed\'s "about 16:00" attributed to Doubleday is that order); Howard\'s message to Doubleday about 4 p. m. and positive order at 4.10; Robinson: his division held the right "from about noon until nearly 5 p. m., when I received orders to withdraw", the order reaching the Second Division after the other troops had started to the rear. '
                'The seed\'s 16:30 (Wikipedia) has no report. The delegated decision C-043 sets the default at 16:00 inside the documented window 15:45-17:00. The Union and Confederate clock offset is not applied.',
                'documented', '1863-07-01T15:45', '1863-07-01T17:00', marking='retreat orders 15:45 / about 16:00 / 16:10 / nearly 17:00: documented; 16:30: not in the reports; default 16:00 (C-043)'),
    subs=[
        ('Wadsworth ordered the First Division to retire at 3.45 o\'clock', 'documented', 'supported', ['w345']),
        ('Doubleday: about 4 p. m. the enemy advanced in large numbers; he then gave orders to fall back', 'documented', 'supported', ['d4', 'd_fall']),
        ('Howard: about 4 p. m. word to Doubleday to fall back to Cemetery Hill; 4.10 p. m. a positive order to the First and Eleventh Corps', 'documented', 'supported', ['h4', 'h410']),
        ('Robinson: the Second Division held the right from about noon until nearly 5 p. m., when he received orders to withdraw (the orders not received until all other troops except Stewart\'s battery had begun to move to the rear)', 'documented', 'supported', ['r5']),
        ('The retreat order at 16:30 (Wikipedia)', 'open gap', 'unsupported', []),
    ],
    cites={
        'w345': OR('Finding myself outflanked on both right and left, heavily pressed in front, and my ammunition nearly exhausted, at 3.45 o\'clock I ordered the command to retire', R032, '266'),
        'd4': OR('About 4 p. m. the enemy, having been strongly re-enforced, advanced in large numbers', R029, '250'),
        'd_fall': OR('I now gave orders to fall back, this and Meredith\'s brigades covering the movement by occupying the intrenchments in front of the seminary', R029, '250'),
        'h4': OR('About 4 p. m. I sent word to General Doubleday that, if he could not hold out longer, he must fall back, fighting, to Cemetery Hill and on the left of the Baltimore pike', R243, '704'),
        'h410': OR('At 4.10 p. m., finding that I could hold out no longer, and that the troops were already giving way, I sent a positive order to the commanders of the First and Eleventh Corps to fallback gradually, disputing every inch of ground', R243, '704', note='the OCR prints fallback'),
        'r5': OR('until nearly 5 p. m., when I received orders to withdraw', R043, '290'),
    },
    scenarios=[
        sc('A', '15:45 (Wadsworth)', 'Wadsworth OR27-1-R032 p.266', 'documented', ['w345']),
        sc('B', 'About 16:00 (Doubleday\'s order; Howard\'s message about 16:00)', 'Doubleday OR27-1-R029 p.250; Howard R243 p.704', 'documented', ['d4', 'd_fall', 'h4']),
        sc('C', '16:10 (Howard\'s positive order)', 'Howard OR27-1-R243 p.704', 'documented', ['h410']),
        sc('D', 'Nearly 17:00 (the order reaching the Second Division)', 'Robinson OR27-1-R043 p.290', 'documented', ['r5']),
        sc('E', '16:30 (seed, Wikipedia)', 'no report; no non-lead source read', 'open gap', []),
    ],
    default=dict(scenario='B', basis='DELEGATED DECISION C-043-DEFAULT (2026-11-11): 16:00 inside the documented window 15:45-17:00; reversible by the owner; the other hours stay selectable'),
    remains=['an hour of 16:30 for the retreat'],
    searched=['OR27-1-R032, R029 pp.250-251, R043 pp.289-290, R055, R243 pp.703-704 read', LOGNOTE],
    recheck='OR-RECHECK-2 (supported): the row\'s claim (Wadsworth 15:45) holds; Robinson p.290 gives nearly 5 p. m.; Doubleday\'s "About 4 p. m." is the enemy advance; 16:00 attribution and 16:30 not retreat hours in the OR. Applied: Doubleday\'s order after the advance and Howard\'s 4 p. m. and 4.10 orders are cited; the default of C-043 is recorded.',
    register=reg('The 16:30 hour of the Union retreat, Jul 1', 'No report gives 16:30; the reports give 15:45, about 16:00, 16:10 and nearly 17:00 for different orders.', 'Retreat inside the window 15:45-17:00 at the delegated default 16:00', 'documented', competing='15:45 / about 16:00 / 16:10 / 16:30 (Wikipedia) / nearly 17:00', impact='the retreat starts at 16:00 with the other hours selectable', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-152
ROWS.append(dict(
    id='T1-152', verdict='corrected',
    limits={'start': 'the hour at which Pettigrew\'s brigade was ordered to advance (2 p. m., Jones R550 p.643)',
            'end': 'the hour at which Pender\'s division passed over the Twenty-sixth (after the fighting of Heth\'s division, after 4 o\'clock, R557 p.661)'},
    claim=claim('The 26th North Carolina (Pettigrew\'s brigade) goes into the fight with over 800 men and comes out with 216 unhurt (OCR 21G), losing more than half its numbers killed and wounded; Colonel Burgwyn is killed (Heth) or shot through both lungs and dies shortly afterward (Captain Young, July 4); Lieutenant-Colonel Lane is severely wounded',
                '26th North Carolina Infantry (Col. H. K. Burgwyn jr., Lieut. Col. J. R. Lane), Pettigrew\'s brigade, Heth\'s division',
                'West of Gettysburg, McPherson Ridge / Herbst woods ground, in the first, second and third Union lines',
                'Jul 1 afternoon, from about 14:00 (the advance of Pettigrew\'s brigade) to about 16:00',
                'Heth OR27-2-R549 p.638; Young OR27-2-R551 p.645; Jones R550 p.643',
                'Heth: "The Twenty-sixth North Carolina Regiment lost in this action more than half its numbers in killed and wounded, among whom were Colonel Burgwyn killed and Lieutenant-Colonel Lane severely wounded." Captain J. J. Young, the regiment\'s quartermaster, in a letter of Jul 4 printed in the Official Records: "We went in with over 800 men in the regiment. There came out but 21G [216], all told, unhurt", and "Poor Colonel Burgwyn, jr., was shot through both lungs, and died shortly afterward". '
                'Jones: the Twenty-sixth, not receiving the order to fall back, collected ammunition from the enemy\'s dead until Pender\'s division passed over it. The seed figures 839 to about 212 are not in the reports (over 800 and 216 are); the shard note that Burgwyn\'s fate is not in the passage is wrong (it is), and the two reports differ in the wording (killed; shot through both lungs and died shortly afterward).',
                'documented', '1863-07-01T14:00', '1863-07-01T16:00', marking='loss and Burgwyn: documented; 839 and 212: not in the reports (over 800 and 216 are)'),
    subs=[
        ('Heth: the 26th North Carolina lost in this action more than half its numbers killed and wounded, among them Colonel Burgwyn killed and Lieutenant-Colonel Lane severely wounded', 'documented', 'supported', ['heth_lost']),
        ('Young (quartermaster, Jul 4): the regiment went in with over 800 men and 216 (OCR 21G) came out unhurt', 'documented', 'supported', ['y_800', 'y_216']),
        ('Young: Colonel Burgwyn was shot through both lungs and died shortly afterward', 'documented', 'conflict', ['y_burg']),
        ('Jones: the Twenty-sixth, not receiving the order to fall back, collected ammunition from the enemy\'s dead until Pender\'s division passed over it', 'documented', 'supported', ['j_amm']),
        ('The regiment fell from 839 to about 212; Burgwyn fatally wounded', 'open gap', 'unsupported', [], 'the reports have over 800 and 216; no 839 or 212'),
    ],
    cites={
        'heth_lost': OR('The Twenty-sixth North Carolina Regiment lost in this action more than half its numbers in killed and wounded, among whom were Colonel Burgwyn killed and Lieutenant-Colonel Lane severely wounded', R549, '638'),
        'y_800': OR('We went in with over 800 men in the regiment', R551, '645'),
        'y_216': OR('There came out but 21G, all told, unhurt', R551, '645', note='the OCR prints 21G; read as 216'),
        'y_burg': OR('Poor Colonel Burgwyn, jr., was shot throiigh both lungs, and died shortly afterward', R551, '645', note='the OCR prints throiigh'),
        'j_amm': OR('The Twenty-sixth, not receiving the order, were now engaged in collecting aminunition from the enemy\'s dead', 'OR27-2-R550', '643', note='the OCR prints aminunition'),
    },
    scenarios=[
        sc('A', 'Burgwyn killed', 'Heth OR27-2-R549 p.638', 'documented', ['heth_lost']),
        sc('B', 'Burgwyn shot through both lungs and died shortly afterward (fatally wounded)', 'Young OR27-2-R551 p.645 (letter of Jul 4)', 'documented', ['y_burg']),
    ],
    default=None,
    remains=['the figures 839 and about 212 of the seed (the reports give over 800 and 216)', 'a clean reading of 216 (OCR 21G) on the page image'],
    searched=['OR27-2-R549 (Heth), R550 (Jones), R551 (Young) read; regex 26th North Carolina figures over OR pt.2 and the library: Fox 1889 has the regiment\'s figures (not read for this row)', LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): heavy loss supported; Heth says Burgwyn killed (the shard note that his fate is absent is wrong); 839 to about 212 not in the passage. Applied: Young\'s letter (OR27-2-R551) gives over 800 and 216 and Burgwyn\'s wound; both readings of Burgwyn are carried.',
    register=reg('Exact strength and loss of the 26th North Carolina on Jul 1', 'The reports give over 800 in and 216 unhurt out (OCR 21G) and "more than half" killed and wounded; the seed figures 839 and 212 are in no report read.', 'Strength a range with declared basis (over 800; 216 unhurt); Burgwyn both readings', 'documented', competing='839 to about 212 (seed) vs over 800 to 216 (Young)', impact='the regiment is drawn at over 800 and reduced as the reports state', ask='none', rids='R04, R11'),
    related=['tl-03-EG-04']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-153
ROWS.append(dict(
    id='T1-153', verdict='partially_supported',
    limits={'start': 'the hour at which Pettigrew\'s brigade was ordered to advance (2 p. m., R550 p.643); Heth was wounded in the afternoon fight (no hour in any report)',
            'end': 'the hour at which Pender\'s division passed Heth\'s (after 4 o\'clock, R557 p.661)'},
    claim=claim('Major-General Heth is wounded in the afternoon fight of Jul 1: "slightly" (Hill and Lee); a glancing bullet to the head with about 24 hours unconsciousness (Wikipedia and Heth\'s memoir) is not in any text read; both descriptions are carried',
                'Maj. Gen. Henry Heth (division commander, Third Corps)',
                'Pettigrew\'s and Brockenbrough\'s line west of Gettysburg',
                'Jul 1 afternoon, about 14:00 to 16:00 (no hour)',
                'Hill OR27-2-R534 p.607; Lee R426 p.317',
                'Hill: "Major-General Heth was slightly wounded; Brigadier-General Archer was taken prisoner by the enemy; Brigadier-General Scales also wounded"; Lee: among the officers lost "Major-General Heth, slightly, and Brigadier-General Scales, of Pender\'s division, severely, wounded". '
                'The head wound and the unconsciousness of about 24 hours are not in the Official Records, the Southern Historical Society Papers or any other text read (Heth\'s postwar memoir is not in the library). The two descriptions differ in severity and are carried as scenarios; no hour.',
                'documented', '1863-07-01T14:00', '1863-07-01T16:00', marking='wounded: documented (slightly); head wound and 24 hours unconscious: gap'),
    subs=[
        ('Hill: Major-General Heth was slightly wounded', 'documented', 'supported', ['hill_sl']),
        ('Lee: Major-General Heth, slightly, among the officers wounded', 'documented', 'supported', ['lee_sl']),
        ('Heth was struck in the head by a glancing bullet and was unconscious for about 24 hours (Wikipedia and Heth\'s memoir, seed)', 'open gap', 'unsupported', []),
    ],
    cites={
        'hill_sl': OR('Major-General Heth was slightly wounded', R534, '607'),
        'lee_sl': OR('Major-General Heth, slightly, and Brigadier-General Scales, of Pender\'s division, severely, wounded', R426, '317', note='the OCR prints v.-ere and a stray quote for among whom were'),
    },
    scenarios=[
        sc('A', 'Slightly wounded', 'Hill OR27-2-R534 p.607; Lee OR27-2-R426 p.317', 'documented', ['hill_sl', 'lee_sl']),
        sc('B', 'Struck in the head by a glancing bullet, unconscious about 24 hours', 'Wikipedia and Heth\'s memoir (seed); no non-lead source read', 'open gap', []),
    ],
    default=None,
    remains=['the head wound and the 24 hours of unconsciousness', 'an hour of the wound'],
    searched=['OR27-2-R534 (Hill), R426 (Lee) pp.317-318, R549 (Heth) read; regex Heth near wounded/struck/unconscious over SHSP vols 4, 5, 6, 11, 12, Battles and Leaders, Alexander, Longstreet, the state volumes: only the Hill and Lee statements and a general statement of Hill in SHSP vol.4', LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Heth wounded supported, "slightly" per Hill; the head wound and the 24 hours not in the OR. Applied: Lee\'s "slightly" is added; the two descriptions are carried as scenarios without a default.',
    register=reg('Severity and hour of General Heth\'s wound, Jul 1', 'Hill and Lee say slightly; the head wound and the 24 hours unconscious rest on Wikipedia and a memoir not in the library.', 'Heth wounded slightly (documented); head wound as a selectable scenario marked open gap', 'documented', competing='slightly wounded vs a head wound with 24 hours unconsciousness', impact='Heth is shown wounded; the unconsciousness is not drawn as fact', ask='none: both stay selectable, no default', rids='R04, R11'),
    related=['tl-03-EG-04']))

R337 = 'OR27-1-R337'; R338 = 'OR27-1-R338'; R339 = 'OR27-1-R339'; R056 = 'OR27-1-R056'; R058 = 'OR27-1-R058'
R507b = 'OR27-2-R507'; R523 = 'OR27-2-R523'; R530 = 'OR27-2-R530'; R559 = 'OR27-2-R559'; R560 = 'OR27-2-R560'; R558b = 'OR27-2-R558'; R043b = 'OR27-1-R043'

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-154
ROWS.append(dict(
    id='T1-154', verdict='corrected',
    limits={'start': 'the hour at which Rodes\' division, marching with the sharpshooters ahead of it, was about 2.5 miles from the town (about 12 m., Daniel R507 p.566); Blackford\'s corps was deployed 2 miles out; no report dates its first contact'},
    claim=claim('Blackford\'s sharpshooters fight their way toward the town from tree to tree: they drive in the cavalry vedettes, repulse two charges of a large force of cavalry with a heavy line of dismounted skirmishers, hold the centre against a double line of sharpshooters (charging it once), and on the extreme left, driven back by the enemy in three lines, fall back firing from tree to tree until they meet Gordon\'s brigade advancing and are rallied on the centre at the sound of Blackford\'s bugle',
                'The corps (battalion) of sharpshooters of the Alabama brigade (Rodes\' brigade, Col. O\'Neal), Rodes\' division, Second Corps, under Maj. Eugene Blackford of the Fifth Alabama Infantry (the report is signed as commanding the Battalion of Sharpshooters; "5th Alabama Battalion" is not the report\'s name for it)',
                'North and north-east of Gettysburg: the line 2 miles out with its left on the Heidlersburg pike, advancing to about half a mile from the suburbs; the Eleventh Corps sketch places the battalion along the lane at the foot of Oak Hill to the apple orchard near Hagy\'s farm, close to the Mummasburg road',
                'Jul 1, from about 12:00 into the afternoon; the report gives no hour (the infantry advance through the town came after an hour or more of skirmishing)',
                'Blackford OR27-2-R527 pp.597-598; Rodes R506 p.557; O\'Neal R523 p.594; Daniel R507 p.566; Devin OR27-1-R339 p.939; 45th New York sketch, New York at Gettysburg vol.1 p.378',
                'Blackford (July 17): "The corps was deployed 2 miles from Gettysburg, with the left resting upon the Heidlersburg pike", moved forward "driving in the cavalry vedettes", met "a large force of cavalry ... in line, with a heavy line of men dismounted as skirmishers": "The former charged us twice, but were easily repulsed. After an hour or more of active skirmishing, the enemy\'s infantry advanced in force through the town". Against the centre "no movement by any force heavier than a double line of sharpshooters, whom our men invariably drove back, charging them once in gallant style"; on the extreme left the enemy "advanced in three lines" and the men "retired, firing from tree to tree until they met Gordon\'s brigade advancing, after which they were rallied on the center at the sound of my bugle". '
                'Rodes: "the sharpshooters of the Alabama brigade, under that promising young officer, Major [Eugene] Blackford, of the Fifth Alabama"; O\'Neal: "Major Blackford, commanding corps of sharpshooters". Union side: Devin\'s cavalry brigade was driven back "by the advance of the enemy\'s line of battle, coming from the direction of Heidlersburg" and held "the rebel line in check for two hours, until relieved by the arrival of the Eleventh Corps"; the 45th New York\'s skirmish line "encountered a battalion of Alabama sharpshooters, under Major Blackford, stretched along the lane at the foot of Oak Hill". '
                'No source names the Union cavalry that Blackford met (the identification with Devin\'s brigade is not made by either report) and none gives an hour for the skirmish, the repulse or the rally; the window opens at 12:00 with the first Confederate hours for the division and ends at the evening edge; the sharpshooters were ahead of the division, so the first contact may be earlier. No clock offset between Union and Confederate reports is applied.',
                'documented', '1863-07-01T12:00', '1863-07-01T18:00', marking='skirmish, cavalry repulse, rally by bugle: documented; the hour: not stated in any report'),
    subs=[
        ('Blackford: the corps was deployed 2 miles from Gettysburg with its left on the Heidlersburg pike and moved steadily forward upon the town, driving in the cavalry vedettes posted in the road and on commanding hills', 'documented', 'supported', ['dep', 'fwd']),
        ('About half a mile from the suburbs a large force of cavalry was seen in line with a heavy line of men dismounted as skirmishers; the cavalry charged twice and was easily repulsed', 'documented', 'supported', ['cav', 'charged']),
        ('After an hour or more of active skirmishing the enemy\'s infantry advanced in force through the town', 'documented', 'supported', ['hour']),
        ('Against the centre there was no movement by any force heavier than a double line of sharpshooters, whom the men invariably drove back, charging them once', 'documented', 'supported', ['centre']),
        ('On the extreme left the enemy advanced in three lines and drove in the men posted behind the trees; they retired firing from tree to tree until they met Gordon\'s brigade advancing and were then rallied on the centre at the sound of Blackford\'s bugle', 'documented', 'supported', ['left', 'rally']),
        ('The command is the corps (battalion) of sharpshooters of the Alabama brigade under Major Blackford of the Fifth Alabama Infantry (Rodes, O\'Neal; the report is signed Comdg. Battalion of Sharpshooters)', 'documented', 'supported', ['rodes_id', 'oneal_id', 'sign']),
        ('Daniel (Rodes\' division): his brigade was within about 2.5 miles of the town at about 12 m. when ordered to turn to the right', 'documented', 'supported', ['dan12']),
        ('Devin (Union cavalry): his skirmishers on the right were forced back by the advance of the enemy\'s line of battle coming from the direction of Heidlersburg and his brigade held the rebel line in check for two hours until relieved by the Eleventh Corps', 'documented', 'supported', ['dev_back', 'dev_two']),
        ('45th New York sketch (1900): its skirmish line met a battalion of Alabama sharpshooters under Major Blackford stretched along the lane at the foot of Oak Hill to the apple orchard near Hagy\'s farm; the 61st Ohio and 74th Pennsylvania came into skirmish line on its right about 1 o\'clock', 'documented', 'supported', ['ny_blk', 'ny_1']),
        ('The cavalry that Blackford met was Devin\'s brigade (same approach, before the Eleventh Corps deployed)', 'inferred', 'unsupported', [], 'neither report names the other; the identification rests on place and time only'),
        ('The hour of the cavalry repulse, the skirmish and the rally', 'open gap', 'unsupported', [], 'no report gives one; the infantry advance came after an hour or more of skirmishing'),
    ],
    cites={
        'dep': OR('The corps was deployed 2 miles from Gettysburg, with the left resting upon the Heidlersburg pike', 'OR27-2-R527', '597'),
        'fwd': OR('I moved steadily forward upon the town, driving in the cavalry vedettes, posted in the road and on commanding hills', 'OR27-2-R527', '597'),
        'cav': OR('About half a mile from the suburbs, a large force of cavalry was observed in line, with a heavy line of men dismounted as skirmishers', 'OR27-2-R527', '597'),
        'charged': OR('The former charged us twice, but were easily repulsed', 'OR27-2-R527', '597'),
        'hour': OR('After an hour or more of active skirmishing, the enemy\'s infantry advanced in force through the town', 'OR27-2-R527', '597'),
        'centre': OR('Against the center there was no movement by any force heavier than a double line of sharpshooters, whom our men invariably drove back, charging them once in gallant style', 'OR27-2-R527', '597'),
        'left': OR('On the extreme left, the enemy advanced in three lines, and drove in my men there posted behind the trees', 'OR27-2-R527', '597'),
        'rally': OR('These retired, firing from tree to tree until they met Gordon\'s brigade advancing, after which they were rallied on the center at the sound of my bugle', 'OR27-2-R527', '597'),
        'rodes_id': OR('the sharpshooters of the Alabama brigade, under that promising young officer', 'OR27-2-R506', '557', note='the printed text continues "Major [Eugene] Blackford, of the Fifth Alabama"'),
        'oneal_id': OR('a report from Major Blackford, commanding corps of sharpshooters', 'OR27-2-R523', '594'),
        'sign': OR('Major Fifth Alabama, Comdg. Battalion of Sharpshooters', 'OR27-2-R527', '598', note='the signature of the report, preceded by EUGENE BLACKFORD'),
        'dan12': OR('about 12 m. At this time I received orders to turn to the right', 'OR27-2-R507', '566', note='the preceding words of the sentence place the brigade within about 2.5 miles of the town (see T1-126)'),
        'dev_back': OR('my skirmishers on the right were forced back by the advance of the enemy\'s line of battle, coming from the direction of Heidlersburg', R339, '939'),
        'dev_two': OR('succeeded in holding the rebel line in check for two hours, until relieved by the arrival of the Eleventh Corps', R339, '939'),
        'ny_blk': L('NY-GB-1900', 'now encountered a battalion of Alabama sharpshooters, under Major Blackford, stretched along the lane at the foot of Oak Hill to the apple orchard', page='378', note='historical sketch by the regimental committee of the 45th New York, printed in 1900; the running head of the page reads 378 New York at Gettysburg'),
        'ny_1': L('NY-GB-1900', 'had now arrived, pushing through the centre of the town, and coming into skirmish line on our right, say about 1 o’clock', page='378', note='the same sketch, an estimate of the hour; the text names the 74th Pennsylvania where the 74th New York is meant to be read by the National Park Service study'),
    },
    scenarios=[],
    default=None,
    remains=['the hour of the cavalry repulse, the skirmish and the rally (no report gives one)'],
    searched=['OR27-2-R527 (Blackford) read in full pp.597-598; regex Blackford over OR parts 1-3: named in R527, R506 (Rodes) p.557, R523 (O\'Neal) p.594, R467 (Ewell) p.449 (Manassas Gap, July 23) and a list of officers; R506 pp.552-557 and R523 pp.591-594 read for an hour: none',
              'OR27-1-R339 (Devin) and R338 (Gamble) read for the Union cavalry on the north and west fronts; R337 p.924 (Buford, 10.10 a. m.: a large force at Heidlersburg driving his pickets) read; regex Heidlersburg with an hour over OR part 1 (one hit, Buford)',
              LIB182 + ' regex Blackford with sharpshooters/skirmishers: New York at Gettysburg vol.1 (45th New York sketch p.378), a National Park Service study of the McClean buildings (which repeats it), and two hits about Chancellorsville (not this event)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported): cavalry repulse and rally by bugle are in R527 p.597; the command is a "corps of sharpshooters" under Blackford, the report headed Fifth Alabama Infantry (the row has 5th Alabama Battalion); arms and hour not named. Applied: the unit name is corrected from Rodes\' and O\'Neal\'s reports and the signature; the Union side (Devin; the 45th New York sketch) is added; the window opens at the first Confederate hours for the division.',
    register=reg('Hour of the skirmish of Blackford\'s sharpshooters, Jul 1', 'No report gives an hour for the cavalry repulse, the skirmish or the rally; Devin\'s two hours and the 45th New York sketch place contact on this front before the Eleventh Corps had deployed (about 1 p. m.), the rally on the left depends on Gordon\'s brigade advancing (no hour in Early).', 'Events documented; hour shown inside the window 12:00-18:00 with the hour marked not stated', 'documented', competing='-', impact='the sharpshooters\' fight is placed inside the window; no hour is drawn as fact', ask='none', rids='R11, R04'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-155
ROWS.append(dict(
    id='T1-155', verdict='partially_supported',
    limits={'start': 'Hill\'s hour for the appearance of Ewell\'s right wing, after which Pender\'s division was ordered forward (about 2.30 o\'clock, R534 p.607)',
            'end': 'Robinson\'s hour for the orders to withdraw reaching the Second Division, the last First Corps division to leave the line (nearly 5 p. m., R043 p.290)'},
    claim=claim('Pender\'s division goes forward through and past Heth\'s division and attacks the First Corps line on Seminary Ridge: Hill orders it forward after about 2.30, keeping Thomas\' brigade in reserve; Perrin is ordered forward again about 3 and, after 4 o\'clock, ordered by Pender to advance and pass Heth\'s division; Scales advances under severe artillery fire, loses every field officer but one and is wounded; Lane covers the right flank against cavalry; Thomas remains in support until near sunset',
                'Pender\'s division, Third Corps: Perrin\'s (McGowan\'s) brigade, Scales\' brigade, Lane\'s brigade, Thomas\' brigade; Wainwright\'s batteries and Gamble\'s dismounted cavalry opposing',
                'The ground west and north-west of the Lutheran seminary on both sides of the Cashtown pike (Seminary Ridge), the cavalry on the Union left south of it',
                'Jul 1, about 14:30 (Hill\'s order) to about 17:00; the attack after 16:00 by Perrin\'s clock',
                'Hill OR27-2-R534 p.607; Perrin R557 pp.661-662; Scales R560 pp.669-670; Lane R558 p.665; Thomas R559 p.668; Wainwright OR27-1-R071 pp.356-357; Gamble R338 p.934; Doubleday R029 p.250; Pennsylvania at Gettysburg vol.1 p.493',
                'Hill: "About 2.30 o\'clock, the right wing of Ewell\'s corps made its appearance on my left ... Pender\'s division was then ordered forward, Thomas\' brigade being retained in reserve". Perrin: the brigade "remained in this position until about 3 o\'clock, and were again ordered forward", then "probably until after 4 o\'clock, when I was ordered by General Pender to advance, and to pass General Heth\'s division should I come up with it at a halt", and he "passed Brigadier-General Pettigrew\'s brigade, the men of which seemed much exhausted"; he found himself without support, Scales halted near the fence and Lane\'s brigade not in sight, and estimates the enemy artillery on the left "at least thirty pieces". '
                'Scales: advanced "after the lapse of some thirty minutes" under "severe artillery fire", "Every discharge made sad havoc", "Every field officer of the brigade save one had been disabled", he was wounded by a shell. Lane: deployed the Seventh North Carolina "to protect our flank, which was exposed to the enemy\'s cavalry", met cavalry and a few infantry from the woods and was ordered not to advance farther. Gamble: dismounted cavalry behind a stone wall opened "a sharp and rapid carbine fire" and fell back when overwhelmed. Thomas: moved to within about a mile in support of Heth\'s division and "remained until near sunset". Wainwright: twelve guns concentrated "hardly 5 yards apart" and Stewart\'s battery enfilading the line along the pike. '
                'NOT in any report or library text read: "about 20 guns of Wainwright" as the force that devastated Scales (the reports give twelve concentrated guns beside Stewart\'s battery, and Perrin\'s estimate of at least thirty pieces) and "a 50-yard gap between the 121st PA and Gamble\'s cavalry". The hours differ between orders and movements and are carried as scenarios; no clock offset is applied.',
                'documented', '1863-07-01T14:30', '1863-07-01T17:00', marking='advance of Pender\'s division, Thomas in reserve, Lane and the cavalry: documented; about 20 guns and the 50-yard gap: not in any source read'),
    subs=[
        ('Hill: about 2.30 o\'clock the right wing of Ewell\'s corps appeared on his left; Pender\'s division was then ordered forward, Thomas\' brigade being retained in reserve', 'documented', 'supported', ['hill_ord']),
        ('Hill: Perrin\'s brigade took position after position of the enemy and drove him through the town', 'documented', 'supported', ['hill_perrin']),
        ('Perrin: the brigade remained until about 3 o\'clock and was again ordered forward; after 4 o\'clock Pender ordered him to advance and pass Heth\'s division; he passed Pettigrew\'s brigade, the men much exhausted', 'documented', 'supported', ['p3', 'p4', 'p_pass']),
        ('Lane\'s brigade took position on Perrin\'s right to protect the flank from the enemy\'s cavalry (Perrin); later Perrin found Scales halted near the fence and Lane\'s brigade not moving on his right and not in sight', 'documented', 'conflict', ['p_lane', 'p_scales', 'p_nolane', 'l_adv']),
        ('Scales: advanced after about thirty minutes\' halt under severe artillery fire; every discharge made sad havoc; every field officer but one was disabled; he was wounded by a shell and the enemy gave way less than ten minutes after', 'documented', 'supported', ['s30', 's_art', 's_havoc', 's_field', 's_wound', 's_ten']),
        ('Perrin: the whole of the enemy\'s artillery on the left, at least thirty pieces, was limbered up and moved to the rear', 'documented', 'supported', ['p_30']),
        ('Wainwright: the enemy came up in two columns that outflanked the line by nearly a third of a mile, then in double line; twelve guns were concentrated hardly 5 yards apart and Stewart\'s battery enfiladed the line along the Cashtown pike', 'documented', 'supported', ['w_col', 'w_12', 'w_stew']),
        ('Lane: the Seventh North Carolina deployed to protect the right flank exposed to cavalry; cavalry and a few infantry opened from the woods; the enemy retreated to Cemetery Hill; Pender ordered Lane not to advance farther unless there was another general forward movement', 'documented', 'supported', ['l_flank', 'l_cav', 'l_ret', 'l_stop']),
        ('Gamble: dismounted cavalry behind a stone wall opened a sharp and rapid carbine fire that killed and wounded many of the first line, and fell back when the enemy came very close, to the next ridge on the left of the town', 'documented', 'supported', ['g_fire', 'g_back']),
        ('Thomas: formed on the left of the road, advanced to within about 1 mile of Gettysburg in readiness to support Heth\'s division, and remained until near sunset, then took position near the town in support of artillery', 'documented', 'supported', ['t_sun']),
        ('A Pennsylvania address (1914 volume): Pender, about 3.30 o\'clock, assailed the three small brigades of Stone, Morrow and Biddle', 'inferred', 'conflict', ['pa330']),
        ('Scales devastated by about 20 guns of Wainwright', 'open gap', 'unsupported', [], 'no report counts 20; Wainwright has twelve concentrated guns and Stewart\'s battery, Perrin at least thirty pieces; no report links a number of guns to Scales'),
        ('Perrin breaks a 50-yard gap between the 121st Pennsylvania and Gamble\'s cavalry', 'open gap', 'unsupported', [], 'no text read has the gap; A. Biddle (121st) says the line extended far beyond his left flank'),
    ],
    cites={
        'hill_ord': OR('About 2.30 o\'clock, the right wing of Ewell\'s corps made its appearance on my left, and thus formed a right angle with my line. Pender\'s division was then ordered forward, Thomas\' brigade being retained in reserve', 'OR27-2-R534', '607'),
        'hill_perrin': OR('Perrin\'s brigade taking position after position of the enemy, and driving him through the town of Gettysburg', 'OR27-2-R534', '607'),
        'p3': OR('remained in this position until about 3 o\'clock, and were again ordered forward', 'OR27-2-R557', '661', note='the OCR prints Wt for We at the start of the sentence'),
        'p4': OR('I remained in this position probably until after 4 o\'clock, when I was ordered by General Pender to advance, and to pass General Heth\'s division should I come up with it at a halt', 'OR27-2-R557', '661'),
        'p_pass': OR('I soon came up with and passed Brigadier-General Pettigrew\'s brigade, the men of which seemed much exhausted by several hours\' hard fighting', 'OR27-2-R557', '661'),
        'p_lane': OR('Here Brigadier-General Lane\'s brigade took position on my right, to protect our flank from the enemy\'s cavalry and some infantry', 'OR27-2-R557', '661'),
        'p_scales': OR('General Scales\' brigade had halted to return the enemy\'s fire, near the fence', 'OR27-2-R557', '662'),
        'p_nolane': OR('General Lane\'s brigade did not move upon my right at all, and was not at this time in sight of me', 'OR27-2-R557', '662'),
        'l_adv': OR('a body of the enemy\'s cavalry and a few infantry opened upon us from the woods subsequently occupied by Pegram\'s battalion of artillery', 'OR27-2-R558', '665', note='Lane\'s own account has his brigade moving forward across an open field on the right; the two accounts are carried'),
        's30': OR('After the lapse of some thirty minutes, we were again ordered to advance, which I did in good order', 'OR27-2-R560', '669'),
        's_art': OR('severe artillery fire from the enemy in my front', 'OR27-2-R560', '669', note='the OCR prints j^retty for pretty before this phrase'),
        's_havoc': OR('Every discharge made sad havoc', 'OR27-2-R560', '670', note='the rest of the sentence is damaged in the OCR (oiir for our)'),
        's_field': OR('Every field officer of the brigade save one had been disabled', 'OR27-2-R560', '670'),
        's_wound': OR('Here I received a painful wound from a piece of shell, and was disabled', 'OR27-2-R560', '670'),
        's_ten': OR('In less than ten minutes after I was disabled', 'OR27-2-R560', '670', note='the OCR prints a7id for and in the rest of the sentence'),
        'p_30': OR('This caused the whole of their artillery on our left, at least thirty pieces, to be limbered up and moved to the rear', 'OR27-2-R557', '662'),
        'w_col': OR('the enemy filed in two strong columns out of the woods, about 500 yards to our front, and marched steadily down to our left until they outflanked us nearly a third of a mile', R071, '356'),
        'w_12': OR('thus concentrating twelve guns in so small a space that they were hardly 5 yards apart', R071, '356'),
        'w_stew': OR('Lieutenant Davison, commanding the left half of Stewart\'s battery, swung his guns around on the Cashtown pike, so as to enfilade the whole line', R071, '357'),
        'l_flank': OR('to protect our flank, which was exposed to the enemy\'s cavalry', 'OR27-2-R558', '665'),
        'l_cav': OR('a body of the enemy\'s cavalry and a few infantry opened upon us from the woods subsequently occupied by Pegram\'s battalion of artillery', 'OR27-2-R558', '665'),
        'l_ret': OR('the whole of the enemy\'s force beating a hasty retreat to Cemetery Hill', 'OR27-2-R558', '665'),
        'l_stop': OR('I was ordered by General Pender not to advance farther unless there was another general forward movement', 'OR27-2-R558', '665'),
        'g_fire': OR('we opened a sharp and rapid carbine fire, which killed and wounded so many of the first line of the enemy that it fell back upon the second line', R338, '934'),
        'g_back': OR('ordered to mount and fall back rapidly to the next ridge, on the left of the town, where our artillery was posted', R338, '934'),
        't_sun': OR('Here we remained until near sunset, when, by General Pender\'s order, we took position near Gettysburg, on the right of the town, in support of artillery', 'OR27-2-R559', '668'),
        'pa330': L('PA-GB-1914-v1', 'Pender, about 3.30 o\'clock, assails the three small brigades of Stone, Morrow and Biddle', note='part of an address on the 90th Pennsylvania in Pennsylvania at Gettysburg (a veteran\'s statement long after; no basis for the hour is given)'),
        'd4': OR('About 4 p. m. the enemy, having been strongly re-enforced, advanced in large numbers', R029, '250'),
    },
    scenarios=[
        sc('A', 'About 14:30: Pender\'s division ordered forward (an order hour)', 'Hill OR27-2-R534 p.607', 'documented', ['hill_ord']),
        sc('B', 'About 15:00: Perrin\'s brigade again ordered forward and advancing about half a mile', 'Perrin OR27-2-R557 p.661', 'documented', ['p3']),
        sc('C', 'After 16:00 (Perrin\'s clock) and about 16:00 (Doubleday, Union clock): Perrin ordered to pass Heth\'s division and attack; the enemy re-enforced and advancing in large numbers', 'Perrin OR27-2-R557 p.661; Doubleday OR27-1-R029 p.250', 'documented', ['p4', 'd4']),
        sc('D', 'About 15:30: Pender assails the brigades of Stone, Morrow and Biddle', 'Pennsylvania at Gettysburg vol.1 p.493 (an address; no basis for the hour)', 'inferred', ['pa330']),
    ],
    default=None,
    remains=['"about 20 guns of Wainwright" (no source)', 'the 50-yard gap between the 121st Pennsylvania and Gamble\'s cavalry (no source)', 'one hour for the advance of Pender\'s division (the reports give 14:30 for the order, about 15:00 and after 16:00 for the movements)'],
    searched=['OR27-2-R534 (Hill) p.607, R557 (Perrin) pp.660-664, R558 (Lane) pp.664-668, R559 (Thomas), R560 (Scales) pp.669-671, OR27-1-R071 (Wainwright) pp.354-359, R338 (Gamble) pp.932-938, R058 (A. Biddle), R056 (C. Biddle), R055 (Rowley) read; regex gap/interval with cavalry or the 121st over OR part 1 and the library: no 50-yard gap',
              LIB182 + ' regex Pender with 2.30/3.30/4 p. m.: Pennsylvania at Gettysburg vols 1 and the 1904 edition (one address); Pierce 1914 (second day)',
              LOGNOTE],
    recheck='OR-RECHECK-2 (supported_partial): Perrin advanced after 4 (Confederate clock); Hill\'s 2.30 is an order hour; Scales\' devastation by about 20 guns, the 50-yard gap and Lane held up by cavalry not supported in the passages read. Applied: Scales\' casualties and the Seminary line fire, Lane\'s cavalry encounter (both sides), Thomas\' reserve until near sunset and Wainwright\'s guns are added from the reports; the two unsupported details are marked as gaps.',
    register=reg('Wainwright\'s "about 20 guns" and the 50-yard gap between the 121st Pennsylvania and Gamble\'s cavalry, Jul 1', 'No report or library text read counts 20 guns against Scales or has a 50-yard gap on the Union left; the reports give twelve concentrated guns beside Stewart\'s battery (Wainwright), at least thirty pieces (Perrin) and a dismounted cavalry line (Gamble).', 'Pender\'s attack with the reported gun counts and the cavalry line; the two details marked as gaps', 'documented', competing='twelve concentrated guns beside Stewart\'s battery (Wainwright) vs at least thirty pieces (Perrin) vs about 20 (seed)', impact='the figure 20 and the gap are not drawn as fact', ask='none', rids='R11, R04'),
    related=['tl-03-EG-08']))
