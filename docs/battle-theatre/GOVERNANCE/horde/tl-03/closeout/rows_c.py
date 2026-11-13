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
