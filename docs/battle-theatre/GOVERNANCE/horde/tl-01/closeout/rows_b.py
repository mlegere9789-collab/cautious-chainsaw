"""Close-out row data, T1-022 .. T1-041."""
from rowlib import *

R007 = 'OR27-1-R007'; R470 = 'OR27-2-R470'; R477 = 'OR27-2-R477'; R565 = 'OR27-2-R565'; R426 = 'OR27-2-R426'; R534 = 'OR27-2-R534'; R549 = 'OR27-2-R549'; R506 = 'OR27-2-R506'; R467 = 'OR27-2-R467'

ROWS = []

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-022
ROWS.append(dict(
    id='T1-022', verdict='partially_supported',
    claim=claim('Positions at the end of Jun 27: the Union corps at the villages the march ended in, Longstreet\'s and Hill\'s corps at Chambersburg and Fayetteville, Ewell\'s at Carlisle and Early near Berlin',
                'Army of the Potomac (I, II, III, V, VI, XII Corps; HQ), Longstreet\'s corps, Hill\'s corps (Anderson), Ewell\'s Rodes and Johnson, Early\'s division',
                'Union: HQ Frederick; I and III Corps Middletown; II Barnesville; V Ballinger\'s Creek near Frederick; VI near Poolesville; XII Knoxville. Confederate: Longstreet near Chambersburg; Anderson at Fayetteville; Rodes and Johnson at Carlisle; Early a short distance beyond Berlin',
                'Jun 27, end of the day (destinations of the day\'s march; the exact bivouac sites are not given)', 'Itinerary of the Army of the Potomac OR27-1-R007 p.143; Lee OR27-2-R426 p.316; Anderson OR27-2-R536 p.613; Rodes OR27-2-R506 p.551; Early OR27-2-R470 p.466; Howard OR27-1-R243 p.707; Fremantle 1864',
                'On Jun 27 the Itinerary has Army HQ moving to Frederick, the First and Third Corps to Middletown, the Second to Barnesville, the Fifth to Ballinger\'s Creek near Frederick, the Sixth to near Poolesville and the Twelfth to Knoxville (Md.). Lee reports Longstreet and Hill encamped near Chambersburg on the 27th (Fremantle has Longstreet and Hill\'s corps near Chambersburg); Anderson\'s division went through Chambersburg to Fayetteville and halted there until Jul 1; Rodes and Johnson reached Carlisle on the 27th; Early encamped a short distance beyond Berlin. '
                'The Eleventh Corps was in the Middletown Valley on the morning of Jun 28 (two divisions near Middletown, one at Boonsborough Gap: Howard) and Hood\'s division was passing through Chambersburg at about 6 p.m. (Fremantle). '
                'These are place-level end-of-day positions; exact bivouac sites and McLaws and Pickett at division level are not stated.',
                'documented', '1863-06-27T00:00', '1863-06-28T04:03', marking='village-level end-of-day positions: documented; exact bivouac sites: gap (inferred from the day\'s destination)'),
    subs=[
        ('Union Army HQ, First and Third Corps (Middletown), Second (Barnesville) and Fifth (Ballinger\'s Creek near Frederick), Sixth (near Poolesville), Twelfth (Knoxville): the places the day\'s march of Jun 27 ended', 'documented', 'supported', ['it27a', 'it27b']),
        ('Longstreet\'s and Hill\'s corps encamped near Chambersburg on the 27th; Longstreet\'s headquarters were near Chambersburg', 'documented', 'supported', ['lee316', 'frem_chamb', 'frem_both']),
        ('Anderson\'s division of Hill\'s corps went through Chambersburg on the 27th to Fayetteville and halted there until Jul 1', 'documented', 'supported', ['anderson']),
        ('Rodes\' and Johnson\'s divisions reached Carlisle on the 27th', 'documented', 'supported', ['rodes27']),
        ('Early\'s main body moved on the 27th toward Dover and encamped a short distance beyond Berlin; Gordon\'s camp on the York pike was about four miles away', 'documented', 'supported', ['early_berlin']),
        ('The Eleventh Corps, after the day of Jun 27: on the morning of Jun 28 it was located in the Middletown Valley, two divisions near Middletown and one holding Boonsborough Gap (Howard)', 'documented', 'supported', ['howard28']),
        ('Hood\'s division was passing through Chambersburg at about 6 p.m. on Saturday Jun 27, when Fremantle entered the town', 'documented', 'supported', ['frem_27', 'frem_6pm', 'frem_hood']),
        ('The exact bivouac sites, and McLaws\' and Pickett\'s divisions by name, on the night of Jun 27', 'open gap', 'unsupported', []),
    ],
    cites={
        'it27a': OR('the First Corps from Jefferson to Middletown, Md. ; the Second Corps from near Edwards Ferry, via PoolesvUle, to Barnesville, Md. ; the Third Corps from Point of Rocks, via Jefferson, to Middletown, Md.;', R007, '143'),
        'it27b': OR('the Fifth Corps from a point between Edwards Ferry and the mouth of the Monocacy to Ballinger\'s Creek, near Frederick, Md. ; the Sixth Corps from Dranesville, Va., via Edwards Ferry, to near Poolesville, Md. ; the Twelfth Corps from near the mouth of the Monocacy, via Point of Rocks, to Knoxville, Md.;', R007, '143'),
        'lee316': OR('On the 24th, Longstreet and Hill were put in mo\'ifon to follow Ewell, and, on the 27th, eiicamped near Chambersburg.', R426, '316'),
        'frem_chamb': L('FREMANTLE-1864', 'I rode slowly on to rejoin General Longstreet, near Chambersburg'),
        'frem_both': L('FREMANTLE-1864', 'orps of Generals A. P. Hill and Longstreet are now near this place, all full of confidence and in high spuits', page='242', page_check=True, page_basis='the head of p.242 (the text layer prints it "2i2 MAJOR-GENEKAL HOOD.", the OCR of "242 MAJOR-GENERAL HOOD.") stands 612 characters before the passage, between the head of p.241 before it and the head of p.243 after it'),
        'anderson': OR('and on the 27th, through Chambersburg to Fayetteville, at which place it halted until July 1', 'OR27-2-R536', '613'),
        'rodes27': OR('the two, moving on slowly without noteworthyincident, reached Carlisle on the 27th', R506, '551'),
        'early_berlin': OR('New Chester, Hampton, and East Berlin, toward Dover, and encamped a short distance beyond Berlin; and 1 rode over to Gordon\'s camp, on the York pike, which was about 4 miles distant, to arrange with him the manner of the approach upon York', R470, '466'),
        'howard28': OR('On the morning of June 38, my corps was located in the Middletown Valley, Md., two divisions near Middletown and one holding Boonsborough Gap', 'OR27-1-R243', '707', reading='On the morning of June 28, my corps was located in the Middletown Valley, Md., two divisions near Middletown and one holding Boonsborough Gap', note='the OCR text layer prints the date as "June 38"; the report is dated Sept 9 1863 and goes on with the march to Frederick of the same day (2 p.m., arrival at 8 p.m.)'),
        'frem_27': L('FREMANTLE-1864', 'June (Saturday). — Lawley was so ill this morning that he couldn\'t possibly ride', reading='27th June (Saturday). \u2014 Lawley was so ill this morning that he couldn\'t possibly ride', note='the OCR text layer prints the date of the entry as "2T^A"; the entry is that of Saturday, which was Jun 27 1863; it carries on to the entry into Chambersburg at 6 p.m.'),
        'frem_6pm': L('FREMANTLE-1864', 'I entered Chambersbnrg at 6 p. m.', reading='I entered Chambersburg at 6 p. m.'),
        'frem_hood': L('FREMANTLE-1864', 'Others were pointing and laughing at Hood\'s ragged Jacks, who were passing at the time'),
    },
    scenarios=[],
    remains=['exact bivouac sites of every corps on the night of Jun 27', 'McLaws\' and Pickett\'s divisions by name for Jun 27'],
    searched=['OR27-1-R007 (Itinerary of the Army of the Potomac) read in full pp.143-145; OR vol.27 pt.2 regex (27th|28th|June 2[78]) within 160 characters of Chambersburg|Greencastle|Fayetteville|Marsh Creek: 6 hits read (Lee p.316, Cabell p.375, Ewell p.443, Rodes p.551, Goodgame p.602, Anderson p.613)',
              'Fremantle 1864 pp.236-246 (diary of Jun 26-29) read; Hancock OR27-1-R076 p.367 for the II Corps',
              'The Itinerary has no Eleventh Corps entry for Jun 27; second pass of 2026-11-13: Howard\'s report places the corps on the morning of Jun 28 in the Middletown Valley (OR27-1-R243 p.707, cited) and Fremantle places Hood\'s division at Chambersburg at about 6 p.m. on Jun 27 (cited); no division-level Jun 27 position of McLaws or Pickett was found (Cabell p.375: McLaws\' artillery crossed the Potomac on the 26th and encamped beyond Chambersburg on the 28th; Lee p.317: Pickett at Chambersburg on Jun 29)'],
    recheck='OR-RECHECK-2 (supported_partial) applied and widened: the Itinerary page is now cited verbatim for each corps (report OR27-1-R007 p.143, destination level); the Confederate side, "not searched" in the shard, now has Lee, Anderson, Rodes, Early and Fremantle.',
    register=reg('Exact bivouac sites of the corps on the night of Jun 27, and the divisions of Longstreet\'s corps', 'The Itinerary and the reports give the village a march ended in, not a bivouac site; no division-level Jun 27 position of McLaws or Pickett was found.',
                 'Each corps placed as an area at the destination village (documented at village level; the night position within it inferred)', 'inferred',
                 competing='-', impact='camp placement on the night of Jun 27 is an area at the village, marked inferred', ask='none', rids='R01, R07, R02', subst='destination village as an area, not a point'),
    related=['tl-01-EG-003']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-023
ROWS.append(dict(
    id='T1-023', verdict='corrected',
    claim=claim('Jun 28 weather: a very warm day at Wrightsville and York; rain during the night at Frederick; the seed readings (dry, 63/67/68 F) are not found in any text read',
                'Environment (regional)', 'Wrightsville and York, Pa.; Frederick, Md.', 'Jun 28: day (very warm, Early); night (rain at Frederick, 61st Ohio)',
                'Early OR27-2-R470 p.466; Bown OR27-1-R258 p.738',
                'On Jun 28 Early records that Gordon\'s men had marched a little over 20 miles on a very warm day (Wrightsville, York County), and the 61st Ohio at Middletown and Frederick records weather rainy during the night. '
                'The seed values (no rain; 63 F at 07:00, 67 F at 14:00, 68 F at 21:00) are Jacobs\'s readings known only through secondary summaries; they are not found in any text read, and they do not agree with Early\'s "very warm day". Both are carried as scenarios.',
                'documented', '1863-06-28T00:00', '1863-06-28T23:59', marking='very warm day and rainy night: documented (regional); seed readings: plausible-procedural, original not read'),
    subs=[
        ('Gordon\'s men marched a little over 20 miles on a very warm day (Jun 28, to Wrightsville)', 'documented', 'supported', ['early_warm']),
        ('Weather rainy during the night of Jun 28 at Frederick (61st Ohio, from Middletown to Frederick)', 'documented', 'supported', ['bown28']),
        ('No rain on Jun 28; 63 F at 07:00, 67 F at 14:00, 68 F at 21:00 (seed)', 'plausible-procedural', 'unsupported', []),
    ],
    cites={
        'early_warm': OR('his men had marched a little over 20 miles, on a very warm day', R470, '466'),
        'bown28': OR('weather rainy during the night', 'OR27-1-R258', '738'),
    },
    scenarios=[
        sc('A', 'Dry day, 63 F (07:00), 67 F (14:00), 68 F (21:00)', 'seed values from secondary summaries of M. Jacobs\'s readings; original not read; a lead, kept as the PDF value (delegated method 3: no source supports any value)', 'plausible-procedural', []),
        sc('B', 'A very warm day in York County; rain during the night at Frederick', 'Early OR27-2-R470 p.466; Bown OR27-1-R258 p.738 (regional: Wrightsville 90 miles from, Frederick about 35 miles south of, Gettysburg)', 'documented', ['early_warm', 'bown28']),
    ],
    remains=['the thermometer readings 63 / 67 / 68 F and "no rain" at Gettysburg (Jacobs readings, original not read)'],
    searched=['OR vol.27 pts 1-3 sentence scan for weather words near Jun 25-30 dates (wx3 scan): Jun 28 hits are R258 and the Early passage; Library regex thermomet|Fahrenheit|meteorolog in 108 texts: no 1863 reading',
              'Jacobs 1864 pp.19-20 (Sunday, June 28) read: no weather; Compiler Jun 29 (printed Monday): no weather for Jun 28',
              'Jacobs 1885 readings: not on archive.org (see T1-003)'],
    recheck='OR-RECHECK-2 (not_found: Jacobs-sourced weather row) applied: the OR now supplies two regional statements for Jun 28 that do not agree with the seed; the readings stay open.',
    register=reg('Jun 28 weather: dry/63-68 F (seed) against very warm day and rainy night (OR)', 'The seed readings are known only through secondary summaries; the OR statements are regional and qualitative.', 'Both values carried; temperature as a marked range', 'plausible-procedural',
                 competing='dry 63/67/68 F (seed) against "very warm day" at Wrightsville and rain at Frederick (OR)', impact='rain or dry ground and air temperature on Jun 28', ask='Fetch Jacobs 1885 (see T1-003); no default is chosen', rids='R15, R03'),
    related=['tl-01-EG-001']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-024
ROWS.append(dict(
    id='T1-024', verdict='corrected',
    claim=claim('Stuart\'s three brigades cross the Potomac at Rowser\'s Ford into Maryland: scenarios (before midnight of Jun 27 / about 03:00 Jun 28 / dawn Jun 28)',
                'Stuart\'s cavalry brigades (Hampton, Fitz. Lee, W. H. F. Lee/Chambliss), six guns and ambulances', 'Rowser\'s Ford on the Potomac (Hampton moved directly for it from Dranesville)',
                'Night of Jun 27-28 (the sources differ: crossing begun early in the night and complete before 12 o\'clock; about 03:00; dawn)', 'Stuart OR27-2-R565 pp.693-694; Alexander 1907',
                'Stuart: Hampton\'s brigade crossed early in the night, the artillery was got over by hard labour before 12 o\'clock that night and the entire command was in bivouac on Maryland soil; the march was resumed early on the 28th. Alexander (1907): at midnight of the 27th. '
                'The seed times (about 03:00, or dawn) rest on a Wikipedia article and an earlier note and are not supported by any text read. Scenarios carried, no default.',
                'documented', '1863-06-27T20:04', '1863-06-28T04:35'),
    subs=[
        ('Hampton\'s brigade crossed early in the night; before 12 o\'clock that night every piece was over and the entire command in bivouac on Maryland soil', 'documented', 'conflict', ['stuart_mid']),
        ('Hampton\'s brigade was ordered from Dranesville to move directly for Rowser\'s Ford on the Potomac', 'documented', 'supported', ['stuart_ford']),
        ('The march was resumed northward early on the 28th', 'documented', 'supported', ['stuart_resume']),
        ('Alexander: Stuart crossed at Rowser\'s Ford at midnight of the 27th', 'documented', 'conflict', ['alex_mid']),
        ('Crossing about 03:00 on Jun 28 (seed, Wikipedia per the approach note): no text read says so; it conflicts with the documented crossing before midnight', 'open gap', 'conflict', []),
        ('Crossing at dawn on Jun 28 (seed note): no text read says so; it conflicts with the documented crossing before midnight', 'open gap', 'conflict', []),
    ],
    cites={
        'stuart_mid': OR('before 12 o\'clock that night, in spite of the difficulties, to all', R565, '693'),
        'stuart_resume': OR('resumed the march northward early on the 2sth', R565, '694', reading='resumed the march northward early on the 28th', note='The OCR text layer prints the date as "2sth"; the two other archive.org scans of part 2 (warofrebellion272unit, warofrebellionco272unit) read "28th" (closeout/second_scan.jsonl).'),
        'stuart_ford': OR('and was ordered to move directly for Rowser\'s Ford, on the Potomac', R565, '693'),
        'alex_mid': L('ALEXANDER-1907', 'he crossed the Potomac at Rowser\'s Ford at midnight of the 27th'),
    },
    scenarios=[
        sc('A', 'Crossing about 03:00 on Jun 28', 'seed source W-GC (Wikipedia, lead); no text read supports it', 'open gap', []),
        sc('B', 'Crossing at dawn on Jun 28', 'seed note V1-TL (lead); no text read supports it', 'open gap', []),
        sc('C', 'Crossing begun early in the night and complete before midnight of Jun 27, the march resumed early on the 28th', 'Stuart OR27-2-R565 pp.693-694 (the commander\'s own report)', 'documented', ['stuart_mid', 'stuart_resume']),
        sc('D', 'Crossing at midnight of the 27th', 'Alexander, Military Memoirs of a Confederate (1907) p.375', 'documented', ['alex_mid']),
    ],
    remains=[],
    searched=['OR27-2-R565 pp.692-695 read; Library regex Rowser|Rowzer, whole set: Alexander 1907 (midnight of the 27th), Minnesota 1916 (no hour); Haskell/Orser/SHSP hits are the word trousers'],
    recheck='OR-RECHECK: both stored quotes found (p.693, p.694). Shard verdict "conflict" applied; Alexander 1907 adds a second independent witness for the night of Jun 27.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-025
ROWS.append(dict(
    id='T1-025', verdict='confirmed',
    claim=claim('Meade assumes command of the Army of the Potomac early on Jun 28 (order delivered at about 03:00; dispatch acknowledging it at 07:00)',
                'Army of the Potomac: Maj. Gen. G. G. Meade (had commanded the V Corps), Maj. Gen. G. Sykes takes the V Corps', 'Meade\'s camp at Ballinger\'s Creek near Frederick; Hooker\'s headquarters at Frederick, Md.',
                'Jun 28, between about 03:00 (order delivered) and 07:00 (Meade\'s dispatch: "The order placing me in command of this army is received"), after the interview at Hooker\'s headquarters at daylight',
                'Meade OR27-1-R006 p.61 (7 a.m. dispatch); Life and Letters of G. G. Meade vol.2 pp.1-2; Itinerary OR27-1-R007 p.144; Hancock OR27-1-R076 p.367',
                'Early on Jun 28 Meade was roused at about three o\'clock by Colonel Hardie, bearer of the despatches (the order), rode with him to Hooker\'s headquarters, reached just after daylight, and assumed command; his dispatch of 7 a.m. to Halleck says the order is received; Hancock reports that Meade "had that day assumed command". '
                'General Sykes took command of the V Corps. The hour of the formal assumption is a window, 03:00 to 07:00.',
                'documented', '1863-06-28T03:00', '1863-06-28T07:00'),
    subs=[
        ('Meade\'s dispatch of June 28, 7 a.m., from Frederick: the order placing him in command is received', 'documented', 'supported', ['meade7', 'meade7h']),
        ('The order was delivered to Meade at about 03:00 and he reached Hooker\'s headquarters just after daylight', 'documented', 'supported', ['hardie3', 'hq_day']),
        ('Meade was in camp at Ballinger\'s Creek, just outside Frederick, on the afternoon of Jun 27', 'documented', 'supported', ['ll_camp']),
        ('Meade "had that day assumed command of the army" (Hancock, Jun 28)', 'documented', 'supported', ['hancock_assumed']),
        ('Meade relinquished command of the Fifth Corps to Maj. Gen. George Sykes and assumed command of the Army of the Potomac, relieving Hooker', 'documented', 'supported', ['it_sykes']),
    ],
    cites={
        'meade7': OR('The order placing me in command of this army is received.', 'OR27-1-R006', '61'),
        'meade7h': OR('Jime 28, 1863—7 a. m.', 'OR27-1-R006', '61', note='The OCR prints the month of the dispatch heading as Jime; the heading reads Frederick, June 28, 1863, 7 a.m., received 10 a.m. (the same line)'),
        'hardie3': L('MEADE-LL-v2', 'General Meade lay quietly asleep in his tent at three o\'clock of the morning of June 28', page='1', page_basis='first page of Part V of the volume (opening narrative of the Gettysburg campaign); no running head is printed on it', witness='narrative by G. Meade, aide-de-camp and son of the general (1913)'),
        'll_camp': L('MEADE-LL-v2', 'arrived toward afternoon at Ballinger\'s Creek, just outside of Frederick City', page='1', page_basis='first page of Part V of the volume (opening narrative of the Gettysburg campaign); no running head is printed on it', witness='narrative by G. Meade, aide-de-camp and son of the general (1913)'),
        'hq_day': L('MEADE-LL-v2', 'head-quarters being reached just after daylight', page='2', page_basis='second page of Part V, the running head "2 LIFE AND LETTERS OF GENERAL MEADE" precedes it', witness='narrative by G. Meade, aide-de-camp and son of the general (1913)'),
        'hancock_assumed': OR('by Major-General Meade, who had that day assumed command of the army', 'OR27-1-R076', '367'),
        'it_sykes': OR('Gen. George G. Meade relinquished command of the Fifth Corps to Maj. Gen. George Sykes, and assumed coESgiand of the Amtiy of the FptoniiiQ, relieving Maj. Ges, Joseph Hooker', R007, '144', reading='Maj. Gen. George G. Meade relinquished command of the Fifth Corps to Maj. Gen. George Sykes, and assumed command of the Army of the Potomac, relieving Maj. Gen. Joseph Hooker', note='the OCR text layer is damaged in the second half of the sentence; the two other archive.org scans of part 1 (warofrebellion271unit, warofrebellion012701rootrich) read it as given here (closeout/second_scan.jsonl)'),
    },
    scenarios=[], remains=[],
    searched=['OR27-1-R006 pp.61-62 read; OR27-1-R076 (Hancock) p.367; Itinerary OR27-1-R007 p.144; Life and Letters of G. G. Meade vol.2 pp.1-2 read (the 03:00 delivery)'],
    recheck='OR-RECHECK: stored quote found at p.61. The citation without a stored quote (Hancock p.367) now carries the verbatim passage. The shard note "hour not stated" is answered with a documented window 03:00-07:00.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-026
ROWS.append(dict(
    id='T1-026', verdict='partially_supported',
    claim=claim('Stuart\'s cavalry captures a United States wagon train at Rockville on Jun 28: more than 125 wagons (train about eight miles long)',
                'Stuart\'s brigades (W. H. F. Lee\'s brigade at the head)', 'Rockville, Md.', 'Jun 28 (day)', 'Stuart OR27-2-R565 p.694; Halleck OR27-1-R006 p.63; Meigs OR27-3-D0845 p.378; Alexander 1907; 1st Minnesota history 1916',
                'On Jun 28 at Rockville Stuart secured "more than one hundred and twenty-five" of the best United States model wagons with their teams, a train eight miles long (Alexander); the 1st Minnesota history says 125 six-mule wagons. '
                'The Union side of the same day gives 150: Halleck wrote to Meade at 3 p.m. that his train of one hundred and fifty wagons had been captured by Fitzhugh Lee near Rockville, and Meigs wrote at 4.05 p.m. that carelessness had cost 150 wagons and 900 mules captured between Washington and Rockville. The count "about 140" of the seed is not found in any text read. Scenarios carried, no default.',
                'documented', '1863-06-28T00:00', '1863-06-28T23:59', marking='125 or more wagons (Stuart) and 150 wagons (Union dispatches): documented, carried as scenarios; 140: not supported'),
    subs=[
        ('More than 125 best-model United States wagons with teams were secured at Rockville on Jun 28', 'documented', 'supported', ['stuart125', 'mn125']),
        ('The captured train was about eight miles long', 'documented', 'supported', ['alex8']),
        ('Union dispatches of Jun 28: Halleck (3 p.m.) reports that Meade\'s train of one hundred and fifty wagons has been captured by Fitzhugh Lee near Rockville; Meigs (4.05 p.m.) that 150 wagons and 900 mules were captured by cavalry between Washington and Rockville', 'documented', 'supported', ['halleck150', 'meigs150']),
        ('A count of about 140 wagons', 'open gap', 'unsupported', []),
    ],
    cites={
        'stuart125': OR('More than one hundred and tAventy-five best United States model', R565, '694'),
        'mn125': L('MN-1ST-1916', 'he captured 125 six-mule wagons laden with supplies for Meade\'s army', page='315', page_check=True, page_basis='the folio is printed at the foot of the page: the text layer prints "315" 380 characters after the passage, and the PDF page 344 of the archive.org scan that holds the passage ends with 315 (closeout/acquired_tl01.json)'),
        'alex8': L('ALEXANDER-1907', 'Next morning at Rockville, a train of wagons eight miles long was captured'),
        'halleck150': OR('your train of one hundred and fifty wagons has been captured by Fitzhugh Lee, near Rockville', 'OR27-1-R006', '63'),
        'meigs150': OR('has this morning cost us 150 wagons and 900 mules, captured by cavalry between this and Rockville', 'OR27-3-D0845', '378'),
    },
    scenarios=[
        sc('A', 'More than 125 wagons secured (Stuart); 125 six-mule wagons (the Minnesota history)', 'Stuart OR27-2-R565 p.694; Minnesota 1916 p.315', 'documented', ['stuart125', 'mn125']),
        sc('B', '150 wagons (and 900 mules) captured', 'Halleck OR27-1-R006 p.63 and Meigs OR27-3-D0845 p.378, Union dispatches of Jun 28 (the figure of the owner of the train)', 'documented', ['halleck150', 'meigs150']),
        sc('C', 'About 140 wagons', 'the seed (source not identified; no text read has 140)', 'open gap', []),
    ],
    remains=['the count about 140 wagons (the seed)'],
    searched=['OR27-2-R565 p.694 read; Library regex Rockville.{0,250}(wagons|train) in 13 texts (Alexander, Minnesota, Pennsylvania, New York, Michigan, SHSP 4-12, Adams Sentinel Jul 7/14, Compiler Jul 13): 125 (Minnesota), eight miles long (Alexander); no 140 or 150',
              'OR vol.27 pts 1-3 regex (140|150) wagons.{0,60}Rockville: no hit (the first pass; the pattern missed the dispatches below because the words are spelled out or more than 60 characters apart)',
              'second pass of 2026-11-13: OR vol.27 parts 1 and 3 regex Rockville within 300 characters of wagon or train, hits with a count read: OR27-1-R006 p.63 (Halleck: one hundred and fifty wagons), OR27-3-D0845 p.378 (Meigs: 150 wagons and 900 mules), OR27-3-D0806 p.355 (Ingalls of Jun 27 asks for one hundred and fifty wagons to be sent: a request, not a capture count); no 140'],
    recheck='OR-RECHECK: quote found at p.694. Shard note applied (only the 125+ is in the Confederate text). Second pass of 2026-11-13: the "about 150" of the seed is in the Union dispatches of Jun 28 and is documented; only "about 140" stays unsupported.',
    register=reg('Rockville wagon count about 140', 'The texts read give more than 125 (Stuart), 125 (Minnesota history) and 150 (Halleck and Meigs, Union dispatches of Jun 28); no text read gives about 140.', 'Shown as scenarios: more than 125, or 150; 140 not shown as fact', 'documented',
                 competing='125+ (Stuart) / 150 (Union dispatches) / about 140 (seed)', impact='number of wagons in Stuart\'s train', ask='none', rids='R03, R16'),
    related=[]))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-027
ROWS.append(dict(
    id='T1-027', verdict='confirmed',
    claim=claim('Cavalry Corps organization of Jun 28: Farnsworth takes the First and Custer the Second (Michigan) Brigade of Kilpatrick\'s Third Division',
                'Cavalry Corps (Pleasonton): Brig. Gen. E. J. Farnsworth, Brig. Gen. G. A. Custer, Third Division (Kilpatrick)', 'Cavalry Corps headquarters, Frederick, Md.', 'Jun 28 (Special Orders No. 98)', 'Special Orders No. 98 OR27-3-D0840 p.376; Itinerary OR27-1-R007 p.144',
                'By Special Orders No. 98 of the Cavalry Corps at Frederick, Jun 28, the Third Division was organized with Farnsworth\'s First Brigade (1st Vermont, 1st West Virginia, 18th Pennsylvania, 5th New York) and Custer\'s Second (Michigan) Brigade (First, Fifth, Sixth, Seventh Michigan); the Itinerary also dates Kilpatrick\'s division and the two brigade commanders to Jun 28. The Jun 29 date of one Michigan site is not supported by the OR.',
                'documented', '1863-06-28T00:00', '1863-06-28T23:59'),
    subs=[
        ('Special Orders No. 98, Cavalry Corps, Frederick, Jun 28: Brig. Gen. E. J. Farnsworth is assigned to the Third Division', 'documented', 'supported', ['so_head', 'so_farns']),
        ('The Second Brigade is composed of the First, Fifth, Sixth and Seventh Michigan Regiments', 'documented', 'supported', ['so_mich']),
        ('The Itinerary of Jun 28: Stahel\'s division assigned as the Third Division under Kilpatrick, Farnsworth commanding the First and Custer the Second Brigade', 'documented', 'supported', ['it_cav']),
    ],
    cites={
        'so_farns': OR('The following-named general officers are assigned to duty with the Third Division, and will report for duty to Brigadier-General Kilpatrick without delay: Brig. Gen. E. J. Farnsworth, U. S. Volunteers', 'OR27-3-D0840', '376'),
        'so_head': OR('Special Orders, ) Headquarters Cavalry Corps, No. 98. f Frederick, Md., June 28, 1863', 'OR27-3-D0840', '376'),
        'so_mich': OR('the First, Fifth, Sixth, and Seventh Michigan Regiments will compose the Second Brigade', 'OR27-3-D0840', '376'),
        'it_cav': OR('Stahel\'s cavalry division was assigned to the Cavalry Corps, as the Third Division, under Brig. Gen. Judson Kilpatriek, with Brig.«Gen. Elon J. Farnsworth commanding the First Brigade and Brig. Gen. George A. Custer commanding the Second Brigade', R007, '144', reading='Stahel\'s cavalry division was assigned to the Cavalry Corps, as the Third Division, under Brig. Gen. Judson Kilpatrick, with Brig. Gen. Elon J. Farnsworth commanding the First Brigade and Brig. Gen. George A. Custer commanding the Second Brigade'),
    },
    scenarios=[], remains=[],
    searched=['OR27-3-D0840 and OR27-1-R007 pp.143-144 read; the Jun 29 date of one Michigan site is a Web site (lead) and was not looked for further'],
    recheck='OR-RECHECK: both stored quotes found at p.376. The Itinerary, which also dates the assignment to Jun 28, is now cited verbatim.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-028
ROWS.append(dict(
    id='T1-028', verdict='corrected',
    claim=claim('Gordon\'s brigade reaches Wrightsville on the Susquehanna on Jun 28 (about 20 miles); the militia (about 1,200) is driven off; the bridge is burned; Gordon fights the town fire',
                'Gordon\'s brigade (Early\'s division); Pennsylvania militia (reported at about 1,200 men)', 'Wrightsville, Pa., on the Susquehanna opposite Columbia',
                'Jun 28; Early rode out "a short time before night" and saw the smoke of the bridge', 'Gordon OR27-2-R477 pp.491-492; Early OR27-2-R470 pp.466-467; Jacobs 1864 p.20',
                'On Jun 28 Gordon (a march of about 20 miles, a very warm day) found a body of militia nearly equal to his brigade, about 1,200 men (Gordon: reported by their captured commander; Early: some 1,200 strong), intrenched at Wrightsville, drove them off with his battery, and the bridge, fired about midway by the retreating militia, burned (one mile and a quarter long); the town caught fire and Gordon formed his brigade around the burning buildings to arrest the flames. Early saw the smoke "a short time before night". '
                'Jacobs dates the affair to Sunday Jun 28.',
                'documented', '1863-06-28T12:00', '1863-06-28T23:59', marking='date: documented (Early, Jacobs); militia strength about 1,200: documented (Gordon, and Early on the page image)'),
    subs=[
        ('Gordon, on the pike to Wrightsville, found a body of Pennsylvania militia nearly equal in number to his brigade, reported by the commanding officer (whom we captured) at 1,200 men, strongly intrenched; the fatigue of the men from the march of 20 miles is stated in the same report', 'documented', 'supported', ['gord_1200', 'gord_20']),
        ('Early, from Gordon: a command of militia some 1,200 strong, intrenched, which fled at the bursting of the third shell; Gordon\'s men had marched a little over 20 miles on a very warm day', 'documented', 'supported', ['early_1200', 'early_fled', 'early_warm'],
         'The OCR text layer of the Official Records prints the strength as "1.300 .strong"; the page image reads "some 1,200 strong", and the two other archive.org scans of the part agree with the page image. The earlier reading 1,300 was an OCR error and is withdrawn: Gordon and Early give the same figure.'),
        ('The bridge, prepared for the purpose, was fired about midway by the retreating militia and was entirely consumed; it was one mile and a quarter long; the town caught fire and Gordon\'s men arrested the flames', 'documented', 'supported', ['gord_fired', 'gord_fire', 'gord_line', 'early_bridge']),
        ('Date: Early saw an immense smoke over the Susquehanna "a short time before night" on Jun 28, after Gordon marched into York that morning; Jacobs: Sunday, June 28', 'documented', 'supported', ['early_york28', 'early_smoke', 'jac_wright']),
    ],
    cites={
        'gord_1200': OR('We moved by the direct pike to Wrightsville, on the Susquehanna. At this i^oint I found a body of Pennsylvania militia nearly equal in number to my brigade, reported by the commanding officer (wliom we captured) at 1,200 men, strongly intrenched', R477, '491-492'),
        'gord_20': OR('notwithstanding the excessive fatigue of the men from the march of 20 miles', R477, '492'),
        'early_1200': OR('he found a command of militia some 1.300 .strong,', R470, '466', reading='he found a command of militia some 1,200 strong,', image_check=ORIMG(2, 466, 'he found a command of militia some 1,200 strong, intrenched')),
        'early_fled': OR('he opened his artillery on tlie militia, which fled at the bursting of the third shell', R470, '466'),
        'early_warm': OR('his men had marched a little over 20 miles, on a very warm day', R470, '466'),
        'gord_fired': OR('In his retreat across the bridge, the enemy fired it about midway with the most inflammable materials.', R477, '492'),
        'gord_fire': OR('Every effort was made to extinguish this fire and save the bridge, but it was impossible.', R477, '492'),
        'gord_line': OR('I formed my brigade in line around the burning buildings, and resisted the progress of the flames until they were checked', R477, '492'),
        'early_bridge': OR('This bridge was one mile and a quarter in length', R470, '467'),
        'early_smoke': OR('A short time before night, I rode out in the direction of Columbia Bridge, to ascertain the result of Gordon\'s expedition, and had not proceeded far before I saw an immense smoke rising in the direction of the Susquehanna, which I subsequently discovered to proceed from the burning of the bridge in question', R470, '466'),
        'early_york28': OR('Next morning (the 28th), General Gordon marched into the town of York without opposition', R470, '466'),
        'jac_wright': L('JACOBS-1864', 'A portion of his command was sent forward to Wrightsville'),
    },
    scenarios=[],
    remains=[],
    searched=['Gordon pp.491-492 and Early pp.466-467 re-read; Jacobs 1864 p.20 read for the date; Pennypacker (PA-GB-1914-v2 p.787) for the 26th\'s detachment at Wrightsville',
              'second pass: Early p.466 read on the page image of the archive.org PDF (the OCR text layer has "1.300 .strong"; the page reads "some 1,200 strong") and on two other archive.org scans of part 2 (closeout/second_scan.jsonl)'],
    recheck='OR-RECHECK: stored quote found at p.491-492. The item without a stored quote (Early p.466) now carries verbatim passages; the shard note "date is an inference from the sequence" is answered by Early\'s "short time before night" and Jacobs\'s dating to Sunday Jun 28. Second pass of 2026-11-13: the 1,300 of Early (an OCR error for 1,200, read on the page image) is withdrawn, so the strength is no longer a source conflict (the scenario B of the first close-out is removed).'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-029
ROWS.append(dict(
    id='T1-029', verdict='partially_supported',
    claim=claim('Positions at the end of Jun 28: Union corps at the villages the march ended in; Longstreet near Chambersburg, Anderson at Fayetteville, Rodes and Johnson at Carlisle, Early at York and Wrightsville',
                'Army of the Potomac (I, II, III, V, VI, XI, XII Corps; cavalry), Longstreet\'s corps, Hill\'s corps (Anderson), Ewell\'s Rodes and Johnson, Early\'s division',
                'Union: I Corps Frederick; II Monocacy Junction; III near Woodsborough; V Ballinger\'s Creek; VI Hyattstown; XI near Frederick; XII Frederick; Buford at Middletown. Confederate: Longstreet at and beyond Chambersburg; Anderson Fayetteville; Rodes and Johnson Carlisle; Early at York (Hays and Smith at Lauck\'s Mills), Gordon at Wrightsville',
                'Jun 28, end of the day (destinations of the day\'s march; exact bivouac sites not given)', 'Itinerary OR27-1-R007 pp.143-144; Hancock OR27-1-R076 p.367; Cabell OR27-2-R435 p.375; Early OR27-2-R470 p.466; Fremantle 1864',
                'On Jun 28 the First Corps marched Middletown to Frederick, the Second to Monocacy Junction (Hancock confirms), the Third to near Woodsborough, the Sixth to Hyattstown, the Eleventh to near Frederick, the Twelfth to Frederick; Crawford\'s Reserves joined the Fifth Corps at Ballinger\'s Creek; Buford went to Middletown. '
                'Longstreet\'s corps was still at Chambersburg (Fremantle; McLaws\' artillery encamped a mile beyond it); Anderson at Fayetteville until Jul 1; Rodes at Carlisle; Early took Hays and Smith to Lauck\'s Mills near York and Gordon was at Wrightsville that evening. Place-level; exact sites are not stated.',
                'documented', '1863-06-28T00:00', '1863-06-29T04:03', marking='village-level end-of-day positions: documented; exact bivouac sites: gap (inferred)'),
    subs=[
        ('Union corps at the end of Jun 28: First at Frederick, Second at Monocacy Junction, Third near Woodsborough, Sixth at Hyattstown, Eleventh near Frederick, Twelfth at Frederick; Buford at Middletown', 'documented', 'supported', ['it28']),
        ('Crawford\'s Pennsylvania Reserves joined the Fifth Corps at Ballinger\'s Creek (the Fifth Corps was there)', 'documented', 'supported', ['it28b']),
        ('The Second Corps was ordered into camp near Monocacy Junction by Meade on Jun 28', 'documented', 'supported', ['hancock_assumed']),
        ('Longstreet\'s corps: McLaws\' artillery encamped a mile beyond Chambersburg on the 28th; Longstreet\'s headquarters at Chambersburg (Fremantle, Jun 28 and 29)', 'documented', 'supported', ['cabell', 'frem_28']),
        ('Anderson\'s division remained at Fayetteville until Jul 1; Rodes at Carlisle (reached on the 27th, there until the 30th)', 'documented', 'supported', ['anderson', 'rodes27', 'rodes30']),
        ('Early: Hays\' and Smith\'s brigades camped at Lauck\'s Mills near York; Avery in York; Gordon at Wrightsville in the evening', 'documented', 'supported', ['early_york', 'early_smoke']),
        ('The exact bivouac sites of every corps on the night of Jun 28', 'open gap', 'unsupported', []),
    ],
    cites={
        'it28': OR('The First Corps marched from Middletown to Frederick; the Second Corps from Barnesville to Monocacy Junction ; the Third Corps * from Middletown to near Woodsborough ; the Sixth Corps from near Poolesville to Hyattstown ; the Eleventh Corps from Middletown to near Frederick, and the Twelfth Corps from Knoxyille to Frederick. Buf ord\'s cavalry division moved from near Jefferson to Middletown', R007, '143-144'),
        'it28b': OR('Crawford\'s Pennsylvania Reserves marched from the mouth of the Monocacy, and joined the Fifth Corpsf at Ballinger\'s Creek.', R007, '144'),
        'hancock_assumed': OR('When near Monocacy Junction, the corps was ordered into camp near that place by Major-General Meade', 'OR27-1-R076', '367'),
        'cabell': OR('We encamped a mile beyond Chambersburg on the 28th', 'OR27-2-R435', '375'),
        'frem_28': L('FREMANTLE-1864', '29^A June (Monday). — We are still at Chambersburg.'),
        'anderson': OR('and on the 27th, through Chambersburg to Fayetteville, at which place it halted until July 1', 'OR27-2-R536', '613'),
        'rodes27': OR('the two, moving on slowly without noteworthyincident, reached Carlisle on the 27th', R506, '551'),
        'rodes30': OR('but on the 30th, having received orders to move toward the balance of the army, then supposed to be at or near Cashtown, we set out for that place', R506, '552'),
        'early_york': OR('sending Hays" and Smith\'s brigades into camp at Lauck\'s Mills, near the railroad, some 2 miles north of the town. Avery\'s command was marched into the town, and put into quarters', R470, '466'),
        'early_smoke': OR('A short time before night, I rode out in the direction of Columbia Bridge, to ascertain the result of Gordon\'s expedition, and had not proceeded far before I saw an immense smoke rising in the direction of the Susquehanna, which I subsequently discovered to proceed from the burning of the bridge in question. On arriving at Wrightsville, on the banks of the Susquehanna, opposite Columbia, I ascei-- tained from General Gordon that', R470, '466'),
    },
    scenarios=[],
    remains=['exact bivouac sites of every corps on the night of Jun 28', 'the Fifth Corps\' own Jun 28 move (the Itinerary lists none; Crawford joined it at Ballinger\'s Creek)', 'Hood\'s and Pickett\'s divisions by name'],
    searched=['OR27-1-R007 pp.143-144 read; OR27-1-R076 (Hancock) p.367 read; OR vol.27 pt.2 regex (27th|28th|June 2[78]) near Chambersburg|Greencastle|Fayetteville (6 hits read); Fremantle 1864 pp.244-246',
              'OR vol.27 pts 1-3 for division-level Jun 28 bivouacs of Hood and Pickett: not found (search_log 2026-11-13)'],
    recheck='OR-RECHECK-2 (supported_partial) applied and widened: the Itinerary passage across the page break pp.143-144 is cited verbatim; Hancock p.367 independently confirms the Second Corps at Monocacy Junction; the Confederate side (not searched in the shard) now has Cabell, Anderson, Rodes, Early and Fremantle.',
    register=reg('Exact bivouac sites of the corps on the night of Jun 28, and Hood and Pickett by name', 'The Itinerary and the reports give the village a march ended in, not a bivouac site.', 'Each corps placed as an area at the destination village (documented at village level; night position inferred)', 'inferred',
                 competing='-', impact='camp placement on the night of Jun 28 is an area, marked inferred', ask='none', rids='R01, R07, R02', subst='destination village as an area, not a point'),
    related=['tl-01-EG-003']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-030
ROWS.append(dict(
    id='T1-030', verdict='corrected',
    claim=claim('Jun 29 weather: rain and mud on the Union march (Frederick to Emmitsburg, Taneytown), "inclement" weather on the Confederate concentration; the seed readings (dry, dust, 66/72/69 F) are not found',
                'Environment (regional: Frederick-Emmitsburg, Md.; Chambersburg-Cashtown, Pa.)', 'Frederick to Emmitsburg and Taneytown, Md.; the Chambersburg-Cashtown road, Pa.', 'Jun 29 (day of march)',
                'Howard OR27-1-R243 p.707; Slocum OR27-1-R271 p.758; Batchelder OR27-1-R046 p.297; Roath (107th Pennsylvania; printed Eoath in the OCR) OR27-1-R051 p.304; Bown OR27-1-R258 p.738; Lee OR27-2-R426 p.317; Eshleman OR27-2-R466 p.433',
                'On Jun 29 four Union reports describe rain: the XI Corps\' day was rainy and the roads heavy, the XII Corps marched 23 miles mostly in a heavy rain-storm, a regiment of the I Corps marched over mud roads in very bad condition owing to continued rains, the 61st Ohio marched in rain; '
                'Lee says the weather was inclement for the Confederate concentration, while Eshleman describes excessive heat, dry weather and dust for the march of Longstreet\'s column over Jun 25-Jul 2. '
                'The seed (dry, ground drying, dust inferred, 66 F / 72 F / 69 F) rests on secondary summaries of Jacobs and is not found in any text read; "dust" is inferred. Scenarios carried, no default.',
                'documented', '1863-06-29T00:00', '1863-06-29T23:59', marking='rain and mud on the Union march: documented (regional); dry/dust/readings: plausible-procedural; Confederate heat and dust: documented (scope Jun 25-Jul 2)'),
    subs=[
        ('XI Corps: "The day was rainy, the roads heavy, and the march wearisome" (Frederick to Emmitsburg, Jun 29)', 'documented', 'supported', ['howard_rain']),
        ('XII Corps: the corps marched 23 miles, performing most of it during a heavy rain-storm (Jun 29)', 'documented', 'supported', ['slocum_rain']),
        ('I Corps: 26 miles on Jun 29, the greater part over mud roads in very bad condition owing to continued rains (13th Massachusetts)', 'documented', 'supported', ['batch_mud']),
        ('107th Pennsylvania: all day in rain and mud (Frederick to Emmitsburg); 61st Ohio: weather rainy', 'documented', 'supported', ['roath_mud', 'bown29']),
        ('Lee: the weather was inclement for the march of Jun 29-30', 'documented', 'supported', ['lee_inclement']),
        ('Longstreet\'s column: excessive heat, dry weather and dust over Jun 25-Jul 2 (Washington Artillery)', 'documented', 'conflict', ['eshleman']),
        ('Dry day, roads begin to dust under the columns (inferred); 66 F at 07:00, 72 F at 14:00, 69 F at 21:00', 'plausible-procedural', 'unsupported', []),
    ],
    cites={
        'howard_rain': OR('The First and Eleventh Corps were to march to Emmitsburg ; the Eleventh to leave the turnpike to its left, marching by Creagerstown. The day was rainy, the roads heavy, and the march wearisome', 'OR27-1-R243', '707'),
        'slocum_rain': OR('still the corps marched 23 miles, performing most of it during a heavy rain-storm', 'OR27-1-R271', '758'),
        'batch_mud': OR('Distance marched was 26 miles, the greater part of the march being over mud roads in very bad condition, owing to continued rains', 'OR27-1-R046', '297'),
        'roath_mud': OR('Having marched all day in rain and mud', 'OR27-1-R051', '304'),
        'bown29': OR('June 29.— Marched from Frederick City to Emmitsburg; weather rainy.', 'OR27-1-R258', '738'),
        'lee_inclement': OR('The advance of the enemy if) the latter jjlace was unknown, and the weather being inclement', R426, '317'),
        'eshleman': OR('Owing to the excessive heat, dry Aveather, and dust, the march was a severe one', 'OR27-2-R466', '433'),
    },
    scenarios=[
        sc('A', 'Dry, ground drying, roads begin to dust; 66 F / 72 F / 69 F', 'seed values from secondary summaries of M. Jacobs\'s readings, original not read; kept as the PDF value (delegated method 3)', 'plausible-procedural', []),
        sc('B', 'Rain, mud and heavy roads on the Union march of Jun 29; inclement weather on the Confederate concentration', 'Howard p.707, Slocum p.758, Batchelder p.297, Roath p.304, Bown p.738 (Maryland, 25-45 miles from Gettysburg), Lee p.317', 'documented', ['howard_rain', 'slocum_rain', 'batch_mud', 'roath_mud', 'bown29', 'lee_inclement']),
        sc('C', 'Excessive heat, dry weather and dust on Longstreet\'s march (Jun 25-Jul 2, scope not dated to a single day)', 'Eshleman OR27-2-R466 p.433', 'documented', ['eshleman']),
    ],
    remains=['dry weather and dust at Gettysburg on Jun 29 (inferred, no text)', 'the thermometer readings 66 / 72 / 69 F'],
    searched=['OR vol.27 pts 1-3 sentence scan for weather words near Jun 25-30 dates and the 17-hit scan (wx2, wx3): Howard, Slocum, Batchelder, Roath, Bown, Lee, Eshleman read; Library thermomet|Fahrenheit: no 1863 reading',
              'Jacobs 1864 p.20 (Monday, June 29) read: no weather statement; Pennypacker (PA-GB-1914-v2 p.787): the 26th "lay upon the bank in the fort exposed to the rain" at Harrisburg on nights after Jun 28'],
    recheck='OR-RECHECK-2 (not_found: Jacobs-sourced weather and dust inference) applied: the OR contradicts the "dry" reading for the Union columns of Jun 29; the readings stay open and both are carried.',
    register=reg('Jun 29 weather conflict: dry/66-72 F (seed) against rain and mud (OR) and heat and dust (Eshleman)', 'The seed readings are secondary summaries; the OR statements are regional and the Eshleman statement covers eight days.', 'Rain and mud on the Union columns of Jun 29 (documented, regional); temperature range marked; dust inferred', 'plausible-procedural',
                 competing='dry, dust (seed) / rain, mud (Howard, Slocum, Batchelder, Roath, Bown) / inclement (Lee) / heat, dust (Eshleman)', impact='ground state and dust on the roads on Jun 29', ask='Fetch Jacobs 1885 (see T1-003); no default is chosen', rids='R15, R03'),
    related=['tl-01-EG-001']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-031
ROWS.append(dict(
    id='T1-031', verdict='confirmed',
    claim=claim('Jun 29: Gordon\'s cavalry burns fourteen railroad bridges on the line toward York; the brigade marches to York and rejoins the division',
                'Gordon\'s brigade and its cavalry (Early\'s division)', 'Wrightsville to York, Pa.', 'Jun 29: left Wrightsville in the morning; ordered back to York "next day" after Jun 28', 'Gordon OR27-2-R477 p.492; Early OR27-2-R470 p.467',
                'Leaving Wrightsville on the morning of Jun 29 Gordon sent the cavalry to burn all the bridges on the railroad leading to York (fourteen in number) and marched his brigade to York, rejoining the division from which it had been separated since Jun 26; Early ordered him to return to York "next day" (Jun 29).',
                'documented', '1863-06-29T00:00', '1863-06-29T23:59'),
    subs=[
        ('Leaving Wrightsville on the morning of the 29th Gordon sent the cavalry to burn the railroad bridges toward York (fourteen in number)', 'documented', 'supported', ['gord14']),
        ('Gordon marched his brigade to York and rejoined the division, from which it had been separated since Jun 26', 'documented', 'supported', ['gord_rejoin']),
        ('Early ordered Gordon to move his command back to York next day (Jun 29)', 'documented', 'supported', ['early_next']),
    ],
    cites={
        'gord14': OR('Leaving Wrightsville on the morning of the 29th, I sent the cavalry under my c(jmmancl to bui\'n all tlie bridges (fourteen in number) on the railroad leading to York', R477, '492'),
        'gord_rejoin': OR('to which place I marched my brigade, and rejoined the division, from which we had been separated since June 2U', R477, '492', reading='to which place I marched my brigade, and rejoined the division, from which we had been separated since June 26', note='the OCR text layer prints "June 2U"; the other archive.org scan warofrebellionco272unit reads "separated since June 26" (the third scan, warofrebellion272unit, has the line damaged); the 26th is also the day Gordon was detached at the forks near Cashtown (row T1-006)'),
        'early_next': OR('I therefore ordered General Gordon to move his command back to York next day, and returned to that place myself that night.', R470, '467'),
    },
    scenarios=[], remains=[],
    searched=['Gordon p.492 and Early p.467 read'],
    recheck='OR-RECHECK: stored quote found at p.492. The date of the separation ("June 2U" in the OCR) is Jun 26 by the sequence of Early p.465; the corrected claim gives the Jun 29 return through Early\'s order.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-032
ROWS.append(dict(
    id='T1-032', verdict='corrected',
    claim=claim('York is occupied by Early\'s division: Gordon marches in on the morning of Jun 28, Early and the rest follow that day; the division is still at York on Jun 29 and leaves at daylight on Jun 30',
                'Early\'s division (Gordon\'s, Hays\', Hoke\'s/Avery\'s and Smith\'s brigades, artillery)', 'York, Pa. (Avery in town; Hays and Smith at Lauck\'s Mills 2 miles north)',
                'Occupation from Jun 28 (Gordon in the morning, Early later the same day) to daylight on Jun 30; Jun 29 is inside it', 'Early OR27-2-R470 pp.466-467; Jacobs 1864 p.20',
                'Early reports that on the morning of Jun 28 Gordon marched into York without opposition and that he followed the same day with the rest of the command, quartering Avery in town and sending Hays and Smith to Lauck\'s Mills; he received his orders back on the evening of Jun 29 and moved at daylight on Jun 30. '
                'Jacobs says Early entered and occupied York on Sunday Jun 28. The seed date (Jun 29) is inside the occupation but is not the day of entry.',
                'documented', '1863-06-28T00:00', '1863-06-30T04:03'),
    subs=[
        ('Next morning (the 28th) General Gordon marched into the town of York without opposition; Early followed with the rest the same day', 'documented', 'supported', ['early_28']),
        ('Early quartered Avery\'s command in the town and sent Hays\' and Smith\'s brigades to camp at Lauck\'s Mills, 2 miles north', 'documented', 'supported', ['early_laucks']),
        ('General Early to-day (Sunday, June 28) also entered and occupied York', 'documented', 'supported', ['jac_york']),
        ('The division was still at York on Jun 29: Early received Lee\'s order that evening and at daylight on the 30th put his whole command in motion', 'documented', 'supported', ['early_29', 'early_30']),
        ('Early occupies York on Jun 29 (seed: the day of occupation)', 'documented', 'contradicted', ['early_28', 'jac_york']),
    ],
    cites={
        'early_28': OR('Next morning (the 28th), General Gordon marched into the town of York without opposition', R470, '466'),
        'jac_york': L('JACOBS-1864', 'General Early to-day also entered and occupied York.'),
        'early_laucks': OR('sending Hays" and Smith\'s brigades into camp at Lauck\'s Mills, near the railroad, some 2 miles north of the town. Avery\'s command was marched into the town, and put into quarters', R470, '466'),
        'early_29': OR('On the evening of the 29th. I received, through Capt. Elliott Johnston, aide to General Ewell, a copy of a note from General Lee', R470, '467'),
        'early_30': OR('accordingly, at daylight on the morning of the 30th, I put my whole command in motion', R470, '467'),
    },
    scenarios=[
        sc('A', 'Early occupies York on Jun 29', 'seed source W-GC (Wikipedia, lead); inside the real occupation but not its start', 'open gap', []),
        sc('B', 'Gordon enters York on the morning of Jun 28; Early and the rest the same day; departure at daylight Jun 30', 'Early OR27-2-R470 pp.466-467; Jacobs 1864 p.20', 'documented', ['early_28', 'jac_york', 'early_30']),
    ],
    remains=[], searched=['Early pp.466-467 read; Jacobs p.20; Library regex York in Adams Sentinel Jul 7 and Compiler Jul 13: not needed once two witnesses agree'],
    recheck='OR-RECHECK: stored quote found at p.466. Shard verdict "conflict" applied; Jacobs 1864 (eyewitness at Gettysburg, secondhand for York) is a second source for Jun 28; the seed date is kept as a scenario and also lies inside the documented occupation.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-033
ROWS.append(dict(
    id='T1-033', verdict='confirmed',
    claim=claim('Rodes\' division is in camp at Carlisle on Jun 29; Jenkins\' cavalry reconnoitres toward Harrisburg',
                'Rodes\' division (Daniel, Iverson, Ramseur in the U.S. barracks; Doles on the Dickinson College campus; O\'Neal\'s Alabama brigade on the Baltimore turnpike); Jenkins\' cavalry', 'Carlisle, Pa. (Alabama brigade picketing 1.5 miles out on the Baltimore turnpike); toward Harrisburg',
                'Jun 27 to Jun 30 at Carlisle; Jenkins\' reconnaissance of Harrisburg on Jun 29', 'Rodes OR27-2-R506 pp.551-552',
                'Rodes reached Carlisle on Jun 27; Daniel\'s, Iverson\'s and Ramseur\'s brigades occupied the United States barracks, Doles bivouacked on the Dickinson College campus, the Alabama brigade bivouacked and picketed the Baltimore turnpike 1.5 miles out; Jenkins\' cavalry advanced toward Harrisburg and made a thorough reconnaissance of its defenses on the 29th.',
                'documented', '1863-06-29T00:00', '1863-06-29T23:59'),
    subs=[
        ('Rodes\' division reached Carlisle on the 27th; the advance on Harrisburg planned for the 30th was not made, because on the 30th it received orders to move toward the army and set out for Cashtown: the division was therefore at Carlisle on the 29th', 'documented', 'supported', ['rodes27', 'rodes_plan', 'rodes30']),
        ('The brigades of Daniel, Iverson and Ramseur occupied the United States barracks at Carlisle; Doles bivouacked on the campus of Dickinson College, a part of his force acting as guard for the town; the Alabama brigade (Rodes\' old brigade, Col. O\'Neal) bivouacked on and picketed the Baltimore turnpike 1 1/2 miles from town', 'documented', 'supported', ['rodes_barracks', 'rodes_doles', 'rodes_alabama', 'rodes_oneal'],
         'The OCR text layer prints the distance as "H miles"; the page image of printed page 551 reads "1 1/2 miles from town".'),
        ('On arrival at Carlisle Jenkins\' cavalry advanced toward Harrisburg and on the 29th made a thorough reconnaissance of the defenses of the place', 'documented', 'supported', ['rodes_jenkins']),
    ],
    cites={
        'rodes27': OR('the two, moving on slowly without noteworthyincident, reached Carlisle on the 27th', R506, '551'),
        'rodes_plan': OR('a step which every man in the division contemplated with eagerness, and which was to have been executed on the 3()th', R506, '552', reading='a step which every man in the division contemplated with eagerness, and which was to have been executed on the 30th',
                         note='The OCR text layer prints the date as "3()th"; the next clause ("but on the 30th") and the two other archive.org scans of part 2 read the 30th (closeout/second_scan.jsonl).'),
        'rodes30': OR('but on the 30th, having received orders to move toward the balance of the army, then supposed to be at or near Cashtown, we set out for that place', R506, '552'),
        'rodes_barracks': OR('The brigades of Daniel, Iverson, and Ramseur occupied the United States barracks', R506, '551'),
        'rodes_doles': OR('that of General Doles bivouacked on the camxius of Dickinson College', R506, '551', reading='that of General Doles bivouacked on the campus of Dickinson College',
                          image_check=ORIMG(2, 551, 'that of General Doles bivouacked on the campus of Dickinson College, a portion of his force acting as guard for the town')),
        'rodes_alabama': OR('while the Alabama brigade bivouacked on and picketed the Baltimore turnpike, H miles from town', R506, '551', reading='while the Alabama brigade bivouacked on and picketed the Baltimore turnpike, 1 1/2 miles from town',
                          image_check=ORIMG(2, 551, 'while the Alabama brigade bivouacked on and picketed the Baltimore turnpike, 1 1/2 miles from town')),
        'rodes_oneal': OR("Rodes' (Alabama) brigade, commanded by Col.' E. A. O'Neal, composed of Third Alabama", R506, '545'),
        'rodes_jenkins': OR("On our arrival at Carlisle, Jenkins' cavalry advanced toward Harrisburg, and had on the 29tli made a tliorough reconnaissance of the defenses of the place", R506, '551', reading="On our arrival at Carlisle, Jenkins' cavalry advanced toward Harrisburg, and had on the 29th made a thorough reconnaissance of the defenses of the place",
                            note='the sentence runs over the page break of printed pages 551 and 552; the other two archive.org scans of part 2 read "29th" and "thorough" (closeout/second_scan.jsonl)'),
    },
    scenarios=[], remains=[], searched=['Rodes pp.545 and 551-552 read; printed page 551 read on the page image (archive.org PDF warofrebellion272unit, PDF page 557) for the distance "1 1/2 miles" that the OCR text layer prints as "H miles"'], recheck='none needed: both stored quotes were found at the stated report and page (OR-RECHECK). Second pass of 2026-11-13: the Doles, Alabama-brigade and distance clauses were not inside the first quotes and now have their own; the stay at Carlisle on the 29th is shown by the dates of arrival and departure.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-034
ROWS.append(dict(
    id='T1-034', verdict='confirmed',
    claim=claim('Jun 29 morning: Hill\'s Third Corps is encamped near Fayetteville on the Chambersburg-Gettysburg road; Hill is directed toward York',
                'A. P. Hill\'s Third Corps (Anderson, Heth, Pender; five artillery battalions under Col. R. L. Walker)', 'Fayetteville, on the road from Chambersburg to Gettysburg', 'Morning of Jun 29', 'Hill OR27-2-R534 p.606',
                'On the morning of Jun 29 the Third Corps, composed of the divisions of Anderson, Heth and Pender and five battalions of artillery under Col. R. L. Walker, was encamped on the road from Chambersburg to Gettysburg near Fayetteville; Hill was directed to move on this road in the direction of York.',
                'documented', '1863-06-29T00:00', '1863-06-29T12:00'),
    subs=[
        ('The corps (Anderson, Heth, Pender; five battalions under Col. R. L. Walker) was encamped on the Chambersburg-Gettysburg road near Fayetteville on the morning of Jun 29', 'documented', 'supported', ['hill_camp']),
        ('Hill was directed to move on this road in the direction of York and to cross the Susquehanna', 'documented', 'supported', ['hill_york']),
    ],
    cites={
        'hill_camp': OR('On the morning of June 29, the Third Corps, composed of the divisions of Major-Generals Anderson, Heth, and Pender, and five battalions of artillery, under command of Col. R. L. Walker, was encamped on the road from Chambersburg to Gettysburg, near the village of Fayetteville', R534, '606'),
        'hill_york': OR('I was directed to move on this road in the direction of York, and to cross the Susquehanna', R534, '606'),
    },
    scenarios=[], remains=[], searched=['Hill p.606 read'], recheck='none needed: the stored quote was found at p.606 (OR-RECHECK).'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-035
ROWS.append(dict(
    id='T1-035', verdict='corrected',
    claim=claim('Heth\'s division reaches Cashtown on Jun 29, at the base of the South Mountain: 8 or 9 miles from Gettysburg (both carried)',
                'Heth\'s division (Hill\'s corps)', 'Cashtown, on the Chambersburg-Gettysburg road, 8 miles (Hill, Fremantle, Alexander) or 9 miles (Heth) from Gettysburg', 'Jun 29', 'Hill OR27-2-R534 p.607; Heth OR27-2-R549 p.637 and the same report in SHSP vol.6',
                'On Jun 29 Hill moved Heth\'s division to Cashtown, "some 8 miles from Gettysburg" (Hill); Heth\'s own report, which the OR text prints with damaged figures ("June 20", "0 miles"), reads in the Southern Historical Society Papers: reached Cashtown on the 29th of June, at the base of the South Mountain, "nine miles from the latter place". '
                'Fremantle and Alexander give eight miles, Buford\'s dispatch of the night of Jun 30 nine. Both distances are carried; no default.',
                'documented', '1863-06-29T00:00', '1863-06-29T23:59'),
    subs=[
        ('Hill: on the 29th I moved General Heth\'s division to Cashtown, some 8 miles from Gettysburg', 'documented', 'conflict', ['hill8']),
        ('Heth: the division reached Cashtown on the 29th of June; Cashtown is at the base of the South Mountain on the road from Chambersburg via Fayetteville, nine miles from Gettysburg (the OR text reads "0 miles distant")', 'documented', 'conflict', ['heth_or', 'heth_shsp']),
        ('Eight miles also in Fremantle (Cashtown, a little village eight miles from Gettysburg) and in Alexander (Cashtown, eight miles west of Gettysburg); nine miles in Buford\'s dispatch of the night of Jun 30 (OR27-1-R337 p.923)', 'documented', 'conflict', ['frem8', 'alex8', 'buford9']),
    ],
    cites={
        'hill8': OR('on the 29th I moved General Heth\'s division to Cashtown, some 8 miles', R534, '607'),
        'heth_or': OR('Cashtown is situated at the base of the South ilountain, on the direct road from Chambersburg, via Fayetteville, to Gettysburg, and 0 miles distant from the latter place', R549, '637',
                   reading='Cashtown is situated at the base of the South Mountain, on the direct road from Chambersburg, via Fayetteville, to Gettysburg, and 9 miles distant from the latter place',
                   image_check=ORIMG(2, 637, 'The division reached Cashtown, Pa., on June 29. Cashtown is situated at the base of the South Mountain, on the direct road from Chambersburg, via Fayetteville, to Gettysburg, and 9 miles distant from the latter place.')),
        'heth_shsp': L('SHSP-06', 'Cashtown is situated at the base of the South Mountain, on the direct road from Chambersburg via Fayetteville to Gettysburg, and nine miles from the latter place.'),
        'frem8': L('FREMANTLE-1864', 'Cashtown, a little village eight miles from Gettysburg'),
        'alex8': L('ALEXANDER-1907', 'which would concentrate the three corps at Cashtown, eight miles west of Gettysburg'),
        'buford9': OR('I am satisfied that A. P. Hill\'s corps is massed just back of Cashtown, about 9 miles from this place', 'OR27-1-R337', '923'),
    },
    scenarios=[
        sc('A', 'Cashtown is 8 miles from Gettysburg', 'Hill OR27-2-R534 p.607; Fremantle (diary of Jun 30-Jul 1); Alexander 1907 (eight miles west of Gettysburg)', 'documented', ['hill8', 'frem8', 'alex8']),
        sc('B', 'Cashtown is 9 miles from Gettysburg', 'Heth OR27-2-R549 p.637 (OCR "0 miles") and SHSP vol.6 (nine miles); Buford\'s dispatch of Jun 30 (OR27-1-R337 p.923)', 'documented', ['heth_or', 'heth_shsp', 'buford9']),
    ],
    remains=[], searched=['Hill p.607 and Heth p.637 re-read; Library regex Cashtown.{0,140}(nine|9|eight|8) miles in 13 texts (Fremantle, Alexander, SHSP 4 and 6, Meade, Pierce, Pennsylvania at Gettysburg): the same two values'],
    recheck='OR-RECHECK: the item without a stored quote (Heth p.637) now carries the verbatim OCR passage; the date and distance damaged in the OCR ("June 20", "0 miles") are read from the same report printed in SHSP vol.6 (June 29, nine miles). Shard scenarios kept.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-036
ROWS.append(dict(
    id='T1-036', verdict='corrected',
    claim=claim('Lee learns the Union army has crossed the Potomac and orders the concentration at Cashtown: scenarios (scout on the night of Jun 28, orders issued Jun 29; a further order reaches Ewell on the night of Jun 30)',
                'Lee\'s army (Longstreet, Hill, Ewell); Hill ordered toward Cashtown on the 29th, Longstreet to follow on the 30th, Ewell recalled from Carlisle', 'Chambersburg to Carlisle',
                'Night of Jun 28 (scout) and Jun 29 (orders); a second order reaches Ewell on the night of Jun 30', 'Lee OR27-2-R426 pp.307, 317; Ewell OR27-2-R467 pp.443-444',
                'Lee reports that on the night of Jun 28 information was received from a scout that the Federal army had crossed the Potomac; Hill was ordered toward Cashtown on the 29th, Longstreet to follow the next day, Pickett left at Chambersburg, and Ewell was recalled from Carlisle to join the army at Cashtown or Gettysburg; Ewell had his order on the 29th and a second order reached him at Heidlersburg on the night of Jun 30. '
                'The seed has the order on Jun 29 (also given as the evening of Jun 30). Scenarios carried, no default.',
                'documented', '1863-06-28T20:04', '1863-06-30T23:59'),
    subs=[
        ('On the night of the 28th information was received from a scout that the Federal army had crossed the Potomac', 'documented', 'supported', ['lee_scout']),
        ('Hill\'s corps was ordered to move toward Cashtown on the 29th, Longstreet to follow the next day, Pickett to stay at Chambersburg; Ewell was recalled from Carlisle to join the army at Cashtown or Gettysburg', 'documented', 'supported', ['lee_orders', 'lee_ewell']),
        ('Ewell, on the 29th, was starting for Harrisburg when ordered to join the main body at Cashtown', 'documented', 'supported', ['ewell_order']),
        ('A further order reached Ewell at Heidlersburg on the night of Jun 30 (the seed alternative "Jun 30 evening")', 'documented', 'conflict', ['ewell_order']),
    ],
    cites={
        'lee_scout': OR('on the night of the 28th, information was received from a scout that the Federal Army, having crossed the Potomac, was advancing northward', R426, '307'),
        'lee_orders': OR('Hill\'s corps was accordingly ordered to move toward Cashtown on the •^9th, and Longstreet to follow the next day, leaving Pickett\'s division at Chambersburgto guard the rear', R426, '317',
                    reading='Hill\'s corps was accordingly ordered to move toward Cashtown on the 29th, and Longstreet to follow the next day',
                    image_check='the two other archive.org scans of part 2 print the date as 29th (closeout/second_scan.jsonl); the base OCR prints a stray mark before 9th'),
        'lee_ewell': OR('General Ewell was recalled from Carlisle, and directed to join the army at Cashtown or Gettysburg', R426, '317'),
        'ewell_order': OR('to reconnoitre the defenses of Harrisburg, and was starting on the 29th for that place when oi\'dered by the general commanding to join the main body of the army at Cashtown', R467, '443', page_fix=PGFIX(2, 443), reading='to reconnoitre the defenses of Harrisburg, and was starting on the 29th for that place when ordered by the general commanding to join the main body of the army at Cashtown'),
    },
    scenarios=[
        sc('A', 'Order received or issued on Jun 29', 'seed source W-BG; Lee p.317 (Hill ordered toward Cashtown on the 29th)', 'documented', ['lee_orders']),
        sc('B', 'Scout reports on the night of Jun 28; orders issue on Jun 29', 'Lee OR27-2-R426 pp.307, 317', 'documented', ['lee_scout', 'lee_orders']),
        sc('C', 'A further order reaches Ewell on the night of Jun 30', 'seed source W-GC; Ewell OR27-2-R467 pp.443-444', 'documented', ['ewell_order']),
    ],
    remains=[], searched=['Lee pp.307 and 316-317 and Ewell pp.443-444 re-read; OR vol.27 pt.3 regex Cashtown (39 hits, all Union messages of Jun 30-Jul 1)'],
    recheck='OR-RECHECK: both stored quotes found (p.307, p.443). Shard scenarios kept; the Lee p.317 passage (Hill and Longstreet order of the 29th and 30th, Ewell recalled) is now cited verbatim.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-037
ROWS.append(dict(
    id='T1-037', verdict='corrected',
    claim=claim('Stuart\'s column reaches Westminster at about 5 p.m. on Jun 29 and routs two companies of the 1st Delaware Cavalry (95 men, Maj. N. B. Knight)',
                'Stuart\'s head of column against two companies of the 1st Delaware Cavalry, 95 men (Maj. N. B. Knight)', 'Westminster, Md.', 'Jun 29: word at about 3.30 p.m.; the head of the column reached Westminster about 5 p.m.', 'Stuart OR27-2-R565 p.695; Knight OR27-2-R401 p.201',
                'At about 5 p.m. on Jun 29 the head of Stuart\'s column reached Westminster and its advance was obstinately disputed for a short time by a squadron of the 1st Delaware Cavalry; "what were not killed were either captured or saved themselves by precipitate flight" (Stuart). Knight had two companies, 95 men, and word at about 3.30 p.m. that the enemy was advancing in force. '
                'The Jenkins-at-Sporting-Hill date note of the seed is a different event (Jun 30 in the table) and is not part of this claim.',
                'documented', '1863-06-29T15:30', '1863-06-29T20:04'),
    subs=[
        ('The head of Stuart\'s column reached Westminster about 5 p.m.', 'documented', 'supported', ['stuart5']),
        ('A squadron of the First Delaware Cavalry obstinately disputed the advance for a short time; those not killed were captured or fled', 'documented', 'supported', ['stuart_routed']),
        ('Knight: two companies, 95 men in all; about 3.30 p.m. word came that the enemy advanced in force', 'documented', 'supported', ['knight95', 'knight_330', 'knight_force']),
        ('General Return of Casualties: at Westminster, Md., June 29 the Union forces lost 2 men killed, 8 men wounded, 3 officers and 36 men captured or missing, 49 in all', 'documented', 'supported', ['gr_westminster'],
         'Read on the page image of printed page 193 (archive.org PDF of part 1, PDF page 211): the base OCR text holds only the list of the places, the figures stand in separate columns; 2 + 8 + 3 + 36 = 49.'),
    ],
    cites={
        'stuart5': OR('reached Westminster about 5 p. m.', R565, '695'),
        'stuart_routed': OR('At this place, our advance was obstinately disputed for a short time by a squadron of the First Delaware Cavalry, but what were not killed were either captured or saved themselves by precipitate flight.', R565, '695'),
        'knight95': OR('with two companies of my command, numbering in all 95 men', 'OR27-2-R401', '201'),
        'knight_330': OR('About 3. 30 o\'clock on the afternoon of the 29th', 'OR27-2-R401', '202'),
        'knight_force': OR('the enemy were advancing in force on the Washington road', 'OR27-2-R401', '202'),
        'gr_westminster': OR('Westminster, Md., June 29 Hanover, Pa., June 30', 'OR27-1-R015', '193', page_fix=PGFIX(1, 193),
                             reading='Westminster, Md., June 29: killed, officers none, enlisted men 2; wounded, officers none, enlisted men 8; captured or missing, officers 3, enlisted men 36; aggregate 49',
                             image_check=ORIMG(1, 193, 'Westminster, Md., June 29 ... 2 | 8 | 3 | 36 | 49 (General Return of Casualties in the Union forces during the Gettysburg Campaign, June 3-August 1, 1863)')),
    },
    scenarios=[], remains=[], searched=['Stuart pp.694-696 and Knight p.201 read; second pass of 2026-11-13: the General Return of Casualties (OR27-1 p.193) read on the page image for the Westminster line'],
    recheck='OR-RECHECK: both stored quotes found (p.695, p.201). Shard note "routed not tested" answered by Stuart\'s sentence on the squadron\'s loss and flight; the Jenkins note is withdrawn from this row (different event).'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-038
ROWS.append(dict(
    id='T1-038', verdict='confirmed',
    claim=claim('XII Corps, 1st Division (Williams) marches from Frederick to Taneytown on Jun 29',
                'XII Corps, 1st Division (Brig. Gen. A. S. Williams)', 'Frederick to Taneytown, Md.', 'Jun 29', 'Williams OR27-1-R272 p.771; Itinerary OR27-1-R007 p.144',
                'On Jun 29 the division marched through Frederick to Taneytown and on the 30th from Taneytown to Littlestown (Williams); the Itinerary has the Twelfth Corps from Frederick to Taneytown and Bruceville on Jun 29.',
                'documented', '1863-06-29T00:00', '1863-06-29T23:59'),
    subs=[
        ('Williams: marched on June 29 through Frederick to Taneytown, and on the 30th from Taneytown to Littlestown', 'documented', 'supported', ['williams']),
        ('Itinerary, Jun 29: the Twelfth Corps from Frederick to Taneytown and Bruceville', 'documented', 'supported', ['it29']),
    ],
    cites={
        'williams': OR('June 29, through Frederick to Taney town, Md., and, on the 30th, from Taneytown to Littlestown', 'OR27-1-R272', '771'),
        'it29': OR('the Twelfth Corps from Frederick to Taneytown and Bruceville', R007, '144'),
    },
    scenarios=[], remains=[], searched=['Williams p.771 and Itinerary p.144 read'], recheck='none needed: the stored quote was found at p.771 (OR-RECHECK); the Itinerary adds the corps-level entry.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-039
ROWS.append(dict(
    id='T1-039', verdict='corrected',
    claim=claim('I Corps (Reynolds): bivouac on the heights north of Emmitsburg on the night of Jun 29, on Marsh Creek (Marsh Run, Moritz Tavern) on the night of Jun 30',
                'I Corps (Reynolds)', 'Heights north of Emmitsburg (Jun 29); Marsh Creek, Moritz Tavern (Jun 30)',
                'Night of Jun 29: Emmitsburg heights; night of Jun 30: Marsh Creek', 'Doubleday OR27-1-R029 p.243; Itinerary OR27-1-R007 p.144; Reynolds OR27-3-D0920 p.417 and D0921 p.418; Howard OR27-1-R243 p.701',
                'Doubleday reports that on Jun 29 the corps bivouacked for the night on the heights north of Emmitsburg and that on the 30th it made a short march of 3 or 4 miles to Marsh Creek and took up a defensive position; the Itinerary has the First Corps at Emmitsburg on Jun 29 and at Marsh Run on Jun 30; Reynolds\' headquarters were at Moritz Tavern on Jun 30. '
                'The seed has the Marsh Creek bivouac on the night of Jun 29-30; in the OR it is the night of Jun 30. Scenarios carried, no default.',
                'documented', '1863-06-29T20:04', '1863-07-01T04:03'),
    subs=[
        ('Jun 29: the First Corps left Frederick, arrived at Emmitsburg, passed through and bivouacked for the night on the heights to the north', 'documented', 'supported', ['dbl29']),
        ('Jun 30: a short march of 3 or 4 miles to Marsh Creek, where the corps took up a defensive position; Itinerary: First Corps from Emmitsburg to Marsh Run', 'documented', 'supported', ['dbl30', 'it30']),
        ('Reynolds\' headquarters on Jun 30 were at Moritz Tavern; two divisions behind Marsh Run', 'documented', 'supported', ['reynolds_hq', 'reynolds_moritz']),
        ('On the evening of Jun 30 the First Corps was near Marsh Run (Howard)', 'documented', 'supported', ['howard_marsh']),
        ('The I Corps was on Marsh Creek on the night of Jun 29-30 (seed)', 'documented', 'conflict', ['dbl29', 'dbl30']),
    ],
    cites={
        'dbl29': OR('On the 29th, it left Frederick, and after a long and toilsome march ^arrived at Emmitsburg; passed through that place, and bivouacked for the night on the ^heights to the north', 'OR27-1-R029', '243'),
        'dbl30': OR('we made a short march of 3 or 4 miles to Marsh Creek', 'OR27-1-R029', '243'),
        'it30': OR('the First Corps from Emmitsburg to Marsh Run', R007, '144'),
        'reynolds_moritz': OR('Two divisions of the First Corps behind Marsh Run, one on the road leading to Gettysburg, and one on the road leading from Fairfield to the Chambersburg road at Moritz Tavern', 'OR27-3-D0921', '418'),
        'reynolds_hq': OR('My headquarters are at Moritz Tavern', 'OR27-3-D0920', '417'),
        'howard_marsh': OR('On the evening of June 30, the First Corps, with the exception of one brigade and the supply train at Emmitsburg, was located in the vicinity of Marsh Run, on the direct road from Emmitsburg to Gettysburg, and nearly midway between those towns. The Eleventh Corps was at Emmitsburg.', 'OR27-1-R243', '701'),
    },
    scenarios=[
        sc('A', 'Marsh Creek bivouac on the night of Jun 29-30', 'seed source NPS-CWS (lead)', 'open gap', []),
        sc('B', 'Heights north of Emmitsburg on the night of Jun 29; Marsh Creek (Moritz Tavern) on the night of Jun 30', 'Doubleday OR27-1-R029 p.243; Itinerary OR27-1-R007 p.144; Reynolds OR27-3-D0920 p.417 and D0921 p.418', 'documented', ['dbl29', 'dbl30', 'it30', 'reynolds_hq', 'reynolds_moritz']),
    ],
    remains=[], searched=['Doubleday pp.243-244, Reynolds D0921-D0923 pp.418-419, Howard p.701 and the Itinerary p.144 read'],
    recheck='OR-RECHECK: both stored quotes found (p.243, p.418). Shard verdict "conflict" applied: the Marsh Creek night is Jun 30 in the OR (Doubleday, Itinerary); the "Moritz Tavern = Marsh Creek" identification is supported by Reynolds\' own dispatch.'))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-040
ROWS.append(dict(
    id='T1-040', verdict='partially_supported',
    claim=claim('Night of Jun 29: the Union columns\' night camps are documented at corps level by the Itinerary (headquarters at Middleburg, I and XI Corps at Emmitsburg, II at Uniontown, III at Taneytown, V at Liberty, VI at New Windsor, XII at Taneytown and Bruceville, Buford near Fairfield, Kilpatrick at Littlestown) with fragments of camp life; fires, pickets, lights and civilians across both armies remain an open gap',
                'Both armies: the Army of the Potomac\'s headquarters, corps, cavalry and Artillery Reserve; Longstreet\'s headquarters mess; Hill\'s troops above Cashtown; the head of Stuart\'s column', 'Middleburg, Emmitsburg, Uniontown, Taneytown, Liberty, New Windsor, Bruceville, near Fairfield, Littlestown (Union); Chambersburg, the slope of the mountain above Cashtown, Union Mills and Westminster (Confederate)', 'Evening and night of Jun 29',
                'Itinerary OR27-1-R007 p.144 (Jun 29 entry); Life and Letters of G. G. Meade vol.2; Pennsylvania at Gettysburg vol.2; Maine at Gettysburg; Fremantle 1864 (Jun 29); Jacobs 1864 pp.19 and 21',
                'The Itinerary lists, for Jun 29, the place each Union column marched to (headquarters Middleburg; I and XI Corps Emmitsburg; II Uniontown; III Taneytown; V Liberty; VI New Windsor; XII Taneytown and Bruceville; Gamble\'s and Devin\'s brigades near Fairfield; Merritt\'s brigade Mechanicstown; Gregg New Windsor; Kilpatrick Littlestown; Artillery Reserve Bruceville); Meade passed the night at Middleburg and wrote home that the men were in good spirits; Buford\'s division camped near Fairfield in a country with forage and water; the First Corps came through Emmitsburg with drums beating and flags flying and encamped in the twilight on high ground north and a little west of the town (the 16th Maine at Emmitsburg that night). '
                'Fremantle records that on the evening of Jun 29 Longstreet and he talked at length about Texas at headquarters near Chambersburg; Jacobs saw, by field-glass, the Rebel encampments above Cashtown considerably enlarged on Jun 29 (and the camp-fires of Hill\'s advance party on the evening of Jun 28); a secondary narrative halts the head of Stuart\'s column that night at Union Mills. '
                'Campfires, picket lines, lights, sounds and the civilians\' contact with the troops on the night of Jun 29 across both armies remain an open gap: no passage found describes them for that night.',
                'open gap', '1863-06-29T20:04', '1863-06-30T04:03', marking='night positions and fragments: documented (one inferred); the army-wide camp life: open gap, shown only as marked procedural scene detail'),
    subs=[
        ('At Longstreet\'s headquarters at Chambersburg on the evening of Jun 29 Fremantle and Longstreet talked at length about Texas', 'documented', 'supported', ['frem_chamb29', 'frem_eve']),
        ('The Rebel encampments above Cashtown, seen by field-glass from Gettysburg on Jun 29, had been considerably enlarged', 'documented', 'supported', ['jac_enlarged', 'jac_cashtown']),
        ('On the evening of Jun 28 the camp-fires of an advance party of Hill\'s corps were seen on the eastern slope of the mountain about a mile above Cashtown (adjacent night)', 'documented', 'supported', ['jac_fires']),
        ('On Jun 29 the Union columns marched to: army headquarters Middleburg; First and Eleventh Corps Emmitsburg; Second Corps Uniontown; Third Corps Taneytown; Fifth Corps Liberty; Sixth Corps New Windsor; Twelfth Corps Taneytown and Bruceville; Gamble\'s and Devin\'s brigades near Fairfield; Merritt\'s brigade Mechanicstown; Gregg\'s division New Windsor; Kilpatrick\'s division Littlestown; the Artillery Reserve Bruceville (the places the day\'s march ended, read here as the night camps)', 'documented', 'supported', ['it29a', 'it29b', 'it29c', 'it29d'],
         'The Itinerary is a record of the day\'s marches; that each column stayed where its march ended through the night is the reading of the day entries (a march continued after dark is not excluded for any one column).'),
        ('Meade established his headquarters at Middleburg, where he passed the night of the 29th; in the evening he wrote home from there that the men were in good spirits', 'documented', 'supported', ['meade_mid', 'meade_letter', 'meade_spirits']),
        ('Buford\'s division encamped on the night of the 29th a few miles short of Fairfield, in a region abounding in forage and water for the horses', 'documented', 'supported', ['meade_buford', 'pa_buford']),
        ('The First Corps passed through Emmitsburg on the evening of the 29th with beating drums and flying colors and in the twilight encamped on high ground north and a little to the west of the town; the 16th Maine encamped at Emmitsburg during the night of the 29th', 'documented', 'supported', ['pa_first', 'me_16th']),
        ('The head of Stuart\'s column halted on the night of the 29th at Union Mills, the column strung out between there and Westminster', 'inferred', 'supported', ['meade_stuart'],
         'A narrative of 1913 without a primary citation; Stuart\'s own report names Westminster at about 5 p.m. (row T1-037) and not the night camp.'),
        ('Campfires, picket lines, lights, sounds and civilians\' contact with the troops of both armies on the night of Jun 29', 'open gap', 'unsupported', []),
    ],
    cites={
        'frem_eve': L('FREMANTLE-1864', 'but this evening he and I had a long talk about Texas'),
        'frem_chamb29': L('FREMANTLE-1864', '29^A June (Monday). — We are still at Chambersburg.'),
        'jac_enlarged': L('JACOBS-1864', 'The Rebel encampments, by the aid of a fieldglass, were seen to have been considerably enlarged. Hill had thrown a large portion of his corps, probably the whole of Heath\'s division, over the mountain'),
        'jac_cashtown': L('JACOBS-1864', 'Until the day of the battle, these were employed ill foraging and gathering provisions for the army amongst the farmers in the vicinity of Cashtown'),
        'jac_fires': L('JACOBS-1864', 'On this evening, the camp-fires of an advance party of A. P. Hill, then halting at Fayetteville, were to be seen on the eastern slope of the mountain, about a mile above Cashtown.'),
        'it29a': OR('June 29. \u2014 Headquarters Army of the Potomac moved from Frederick to Middleburg ; the First and Eleventh Corps from Frederick to Emmitsburg ; the Second Corps from Monocacy Junction, via Liberty and Johnsville, to Uniontown', R007, '144'),
        'it29b': OR('the Third Corps from near Woodsborough to Taneytown ; the Fifth Corps from Ballinger\'s Creek, via Frederick and Mount Pleasant, to Liberty ; the Sixth Corps from Hyattstown, via New Market and Ridgeville, to New Windsor ; the Twelfth Corps from Frederick to Taneytown and Bruceville', R007, '144'),
        'it29c': OR('Gamble\'s (First) and Devin\'s (Second) brigades, of Buf ord\'s (First) cavalry division, from Middletown, via Boonsborough, Cavetown, and Monterey Springs, to near Fairfield', R007, '144',
                    reading='Gamble\'s (First) and Devin\'s (Second) brigades, of Buford\'s (First) cavalry division, from Middletown, via Boonsborough, Cavetown, and Monterey Springs, to near Fairfield'),
        'it29d': OR('Merritt\'s reserve cavalry brigade, of the same division, from Middletown to Mechanicstown; Gregg\'s (Second) cavalry division from New Market and Ridgeville to New Windsor ; Kilpatrick\'s (Third) cavalry division from Frederick to Littlestown ; and the Artillery Reserve from Frederick to Bruceville', R007, '144'),
        'meade_mid': L('MEADE-LL-v2', 'General Meade established his head-quarters at Middleburg, where he passed the night of the 29th of June', page='12', page_check=True, page_basis='the head "12 LIFE AND LETTERS OF GENERAL MEADE" of p.12 precedes the passage and the head "THE BATTLE OF GETTYSBURG 13" of p.13 (text offset 39648) follows it'),
        'meade_letter': L('MEADE-LL-v2', 'Headquarters, Middleburg, Md., June 29, 1863', page='13', page_basis='the head "THE BATTLE OF GETTYSBURG 13" of p.13 (text offset 39648) precedes the passage and the head "14 LIFE AND LETTERS OF GENERAL MEADE" (text offset 42378) follows it', note='the letter to Mrs. Meade written from Middleburg in the evening of Jun 29 (the narrative: "From Middleburg, in the evening, General Meade again wrote home")'),
        'meade_spirits': L('MEADE-LL-v2', 'The men are in good spirits', page='14', page_check=True, page_basis='the head "14 LIFE AND LETTERS OF GENERAL MEADE" of p.14 precedes the passage (the letter of Jun 29 begins on p.13 and runs over the page break)'),
        'meade_buford': L('MEADE-LL-v2', 'had encamped on the night of the 29th of June a few miles short of Fairfield', page='17', page_basis='the head "THE BATTLE OF GETTYSBURG 17" of p.17 (text offset 50355) precedes the passage and the head "18 LIFE AND LETTERS OF GENERAL MEADE" (text offset 53040) follows it'),
        'pa_buford': L('PA-GB-1914-v2', 'it went into camp near Fairfield for the night, in a region abounding in forage and water for our jaded horses', witness='oration at the dedication of the monument of the 17th Pennsylvania Cavalry, printed in Pennsylvania at Gettysburg'),
        'pa_first': L('PA-GB-1914-v2', 'On the evening of the 29th, the First Corps passed through Emmitsburg with beating drums and flying colors, and in the twilight encamped on high ground north and a little to the west of the town'),
        'me_16th': L('ME-GB-1898', 'the Sixteenth was allowed a breathing space before plunging into battle. Encamping at Emmitsburg during the night of June 29th'),
        'meade_stuart': L('MEADE-LL-v2', 'The head of the column was halted that night (the 29th) at Union Mills, while the column remained strung out between that place and Westminster'),
    },
    scenarios=[],
    remains=['campfires, pickets, lights, sounds and civilians\' contact with the troops of both armies on the night of Jun 29 (positions and marches are documented, the life of the camps is not)'],
    searched=['Fremantle 1864 pp.244-247 (Jun 29) and Jacobs pp.20-21 read',
              'second pass of 2026-11-13: the whole local library (178 texts: the 108 texts of the library and 70 National Park Service texts of library/acquired_3.json) searched for a date marker of Jun 29 (June 29, 29th, Monday) within 220 characters of a night or camp word (night, evening, bivouac, encamp, camp-fire, picket, supper, dusk): 193 windows in 50 texts (closeout/search_log.jsonl; the 193 windows are kept in closeout/lib_search_t1040.txt, the script is closeout/tools/libsearch.py); the Pennsylvania, New York, Maine, Michigan, New Jersey, Vermont, Minnesota, Indiana and Ohio volumes, Meade\'s Life and Letters, Alexander, Longstreet, Battles and Leaders and the Southern Historical Society Papers read where a window was a campaign passage; most windows are other years or other dates; the usable passages are positions of camps (Meade, Buford, the First Corps, the 16th Maine, Stuart) and none describes fires, pickets, lights or civilians on the night of Jun 29',
              'OR vol.27 part 1 Itinerary (p.144, Jun 29 entry) read for the places the Union columns marched to; the OR reports give marches and positions, not camp life',
              'not found in the library: any diary entry or letter for the night of Jun 29 that describes the camp itself; the soldiers\' diaries named by the seed (Broadhead, Myers, McCreary) are civilian diaries of Gettysburg and are not in the library (blocked: Broadhead scan, HTTP 403 for automated access)'],
    recheck='OR-RECHECK-2 (not_found: open gap) applied: three documented fragments were added in the first close-out; the second pass added the Union night camps of the Itinerary and four fragments from the library; the army-wide camp life stays the open gap named in the seed.',
    register=reg('Camp life, fires, pickets and civilians on the night of Jun 29 (both armies)', 'The sources read give positions and marches; only Fremantle (Longstreet\'s evening), Jacobs (enlarged camps above Cashtown), Meade (headquarters mess letter) and a few regimental passages describe the night or the evening around it; none describes campfires, pickets, lights or the civilians.',
                 'Documented night positions and fragments shown; the rest drawn only as marked plausible-procedural scene detail under the luminance floor', 'plausible-procedural',
                 competing='-', impact='camp scenes of Jun 29 night', ask='none: the library was searched; a diary or letter of the night of Jun 29 would have to come from a source outside it (soldier diaries not in the library)', rids='R18, R05, R21', subst='procedural camp scene with the Q10 luminance floor, tier-marked'),
    related=['tl-01-EG-002']))

# ------------------------------------------------------------------------------------------------------------------------------------------------ T1-041
ROWS.append(dict(
    id='T1-041', verdict='corrected',
    claim=claim('Jun 30 weather: rain at Emmitsburg (61st Ohio, all day), rain on the nights at Harrisburg; the seed readings (dry, warm, dust, 68/79/71 F) are not found',
                'Environment (regional: Emmitsburg, Md.; Harrisburg, Pa.)', 'Emmitsburg, Md.; Harrisburg, Pa.', 'Jun 30 (all day at Emmitsburg; the nights of Jun 28-30 at Harrisburg)', 'Bown OR27-1-R258 p.738; Pennypacker PA-GB-1914-v2 p.787',
                'On Jun 30 the 61st Ohio remained in camp at Emmitsburg all day, weather rainy; the 26th Pennsylvania lay on the bank at Fort Washington, Harrisburg, exposed to the rain on the nights after its arrival on Jun 28. '
                'The seed (dry, warm, dust under the columns inferred, 68 F at 07:00, 79 F at 14:00, 71 F at 21:00) rests on secondary summaries of Jacobs, is not found in any text read and is inconsistent with these reports; both are carried as scenarios. No text read gives the weather at Gettysburg on Jun 30.',
                'documented', '1863-06-30T00:00', '1863-06-30T23:59', marking='rain at Emmitsburg and Harrisburg: documented (regional); dry/warm/dust/readings: plausible-procedural'),
    subs=[
        ('June 30: remained in camp at Emmitsburg all day; weather rainy (61st Ohio)', 'documented', 'supported', ['bown30']),
        ('For two days after Jun 28 the 26th Pennsylvania was without tents and lay through the nights on the bank in the fort exposed to the rain (Harrisburg)', 'documented', 'supported', ['penny_rain']),
        ('Dry and warm; dust under the road columns inferred; 68 F at 07:00, 79 F at 14:00, 71 F at 21:00', 'plausible-procedural', 'unsupported', []),
    ],
    cites={
        'bown30': OR('June 30. — Remained in camp at Emmitsburg all day; weather rainy.', 'OR27-1-R258', '738'),
        'penny_rain': L('PA-GB-1914-v2', 'through the nights lay upon the bank in the fort exposed to the rain'),
    },
    scenarios=[
        sc('A', 'Dry and warm, dust under the columns (inferred), 68 / 79 / 71 F', 'seed values from secondary summaries of M. Jacobs\'s readings, original not read; kept as the PDF value (delegated method 3)', 'plausible-procedural', []),
        sc('B', 'Rainy at Emmitsburg on Jun 30 and rain on the nights at Harrisburg', 'Bown OR27-1-R258 p.738; Pennypacker (PA-GB-1914-v2 p.787)', 'documented', ['bown30', 'penny_rain']),
    ],
    remains=['dry weather, warmth, dust and the readings 68 / 79 / 71 F at Gettysburg on Jun 30'],
    searched=['OR vol.27 pts 1-3 sentence scan (wx2, wx3) for weather near Jun 30: R258 only; Jacobs 1864 pp.21-23 (Tuesday, June 30) read: field-glass observations, no weather statement; Library thermomet|Fahrenheit: no 1863 reading',
              'Buford R337 p.923, Gamble R338 p.934 and Devin report read for Jun 30 weather: none'],
    recheck='OR-RECHECK-2 (not_found: Jacobs-sourced weather and dust inference) applied: the OR report of rain at Emmitsburg on Jun 30 contradicts "dry"; the readings stay open and both are carried.',
    register=reg('Jun 30 weather: dry/warm 68-79 F (seed) against rain at Emmitsburg and Harrisburg (OR, Pennypacker)', 'The seed readings are secondary summaries; the OR statement is regional (Emmitsburg, 10 miles south of Gettysburg).', 'Rain at Emmitsburg on Jun 30 (documented, regional); temperature range marked; dust inferred', 'plausible-procedural',
                 competing='dry, warm, dust (seed) against rainy (Bown, Pennypacker)', impact='ground state and dust on the roads on Jun 30 (Buford\'s arrival)', ask='Fetch Jacobs 1885 (see T1-003); no default is chosen', rids='R15, R03'),
    related=['tl-01-EG-001']))
