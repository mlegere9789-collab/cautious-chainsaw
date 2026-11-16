"""Search profiles of the 47 conflicts: what the dossier builder looks for in the local library (names, units, places, clock words) and which unfetched sources to point at.

A profile has: event_date (the date the sources are weighed against), kinds (the kinds of value expected: PLAN.md section 3), focus (one neutral line: what is in dispute),
terms (names and words that find the timeline rows and shards about it), probes (proximity searches: label, anchors, near regexes, scopes) and acquire (keys of candidates.py).
Nothing here is a finding: the hints are questions to put to the sources, and the probes only list where to read.

Scopes: or (Official Records vol. 27 parts 1-3), books (the books, reports and papers of the ledger), nps (National Park Service texts), news (the Gettysburg weeklies of 1863),
ca (Chronicling America pages of 1863; slow), med (medical library). 'CLOCK' in a near list stands for the clock-expression regex of cfl_search.
"""
OR, BK, NP, NW, CA, MD = 'or', 'books', 'nps', 'news', 'ca', 'med'
DEF = (OR, BK, NP)


def pr(label, anchors, near=None, scope=DEF, window=320):
    return dict(label=label, anchors=anchors, near=near or [], scope=list(scope), window=window)


P = {}

P['C-001'] = dict(event_date='1863-07-02', kinds=['time'], focus='the hour Meade reached the field of Gettysburg on the night of Jul 1-2, and when he inspected the line',
    terms=['Meade', 'Taneytown', 'Cemetery Hill', 'Leister', 'army headquarters', 'headquarters of the army'],
    probes=[pr('Meade states his own arrival', ['arriving there', 'arrived at gettysburg', 'reached gettysburg', 'reached the field', 'arrived upon the field'], ['CLOCK']),
            pr('Meade and the inspection of the line at first light', ['so soon as it was light', 'as soon as it was light', 'at daylight', 'at daybreak'], ['meade|commanding general|headquarters|inspect']),
            pr('Others who place the commanding general on the field that night', ['general meade', 'meade'], [r'(arrived|reached|came|rode).{0,70}(gettysburg|field|cemetery)', 'CLOCK'], window=260),
            pr('Headquarters and midnight', ['midnight'], ['meade|headquarters|army', 'gettysburg|cemetery|field'], scope=(OR, BK))],
    hints=['Does the passage date the arrival at the field, at Cemetery Hill, or at the Leister house?', 'Which clock does the writer use (Union)?', 'Is the hour given as "about" or exactly?'],
    acquire=['JCCW-1865', 'DOUBLEDAY-1882', 'HUMPHREYS-1896', 'SWINTON-1866'])

P['C-002'] = dict(event_date='1863-07-02', kinds=['time'], focus='the hour Humphreys\'s division reached the field',
    terms=['Humphreys', 'Third Corps', 'III Corps', 'Emmitsburg road', 'bivouac'],
    probes=[pr('Humphreys\'s own report of the march and bivouac', ['humphreys'], ['bivouac|bivouacked|halted|arrived|reached|marched', 'CLOCK']),
            pr('Division in position, night of Jul 1-2', ['second division'], ['humphreys', 'CLOCK|midnight|daybreak|daylight'], scope=(OR, BK)),
            pr('Birney and Sickles on the arrival of the second division', ['sickles', 'birney'], ['humphreys', 'arrived|reached|came up|joined', 'CLOCK|night|morning'])],
    hints=['Midnight and 02:00 are both in the PDF row; which event does each describe (the head of the column, the last brigade, the bivouac)?'],
    acquire=['HUMPHREYS-1896', 'JCCW-1865'])

P['C-003'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when the head of the V Corps reached the field on Jul 2 (05:00 or 08:00 near Power\'s Hill)',
    terms=['V Corps', 'Fifth Corps', 'Sykes', 'Power\'s Hill', 'Powers Hill', 'Barnes', 'Ayres', 'Crawford'],
    probes=[pr('Fifth Corps reaches the field', ['fifth corps', 'sykes'], [r'(arrived|reached|came up|halted|marched|head of the column)', 'CLOCK|daylight|sunrise|daybreak']),
            pr('Power\'s Hill', ['power\'s hill', 'powers hill', 'powers\' hill'], ['CLOCK|corps|column|arrived']),
            pr('Division commanders of the corps on the morning of Jul 2', ['barnes', 'ayres', 'crawford'], ['arrived|reached|marched|bivouac|halted', 'CLOCK|daylight|sunrise|morning'], scope=(OR, BK)),
            pr('Slocum on Culp\'s Hill and the corps arriving', ['slocum'], ['fifth corps|sykes|fifth army corps', 'CLOCK|morning|arrived'], scope=(OR,))],
    hints=['"Head of column" and "the corps" are different moments; the PDF value 08:00 is for the head.', 'Union clock; compare the corps commander\'s report with the reports of its divisions.'],
    acquire=['POWELL-1896', 'BATES-1875', 'SWINTON-1866'])

P['C-004'] = dict(event_date='1863-07-02', kinds=['time', 'time_window', 'period'], focus='when the II Corps reached the field (22:30 Jul 1, at dawn, 06:00, 07:00)',
    terms=['II Corps', 'Second Corps', 'Hancock', 'Gibbon', 'Caldwell', 'Hays', 'Webb', 'Taneytown'],
    probes=[pr('Second Corps arrival in the report of Hancock', ['hancock'], [r'(second corps|corps).{0,120}(arrived|reached|came up|marched|bivouac|position)', 'CLOCK|daylight|sunrise|daybreak|dawn']),
            pr('Gibbon\'s division and the position on Cemetery Ridge', ['gibbon'], ['arrived|reached|marched|position|bivouac|relieved', 'CLOCK|daylight|sunrise|daybreak']),
            pr('Caldwell and Hays', ['caldwell', 'hays'], ['arrived|reached|marched|position|bivouac|sunrise|daylight', 'CLOCK|daylight|sunrise|daybreak']),
            pr('Brigade reports: Webb, Harrow, Willard, Carroll', ['webb', 'harrow', 'willard', 'carroll', 'kelly', 'zook', 'cross', 'brooke'], ['arrived|reached|marched|position|bivouac', 'CLOCK|daylight|sunrise|daybreak|dawn'], scope=(OR,)),
            pr('Marching all night / arriving in the night of Jul 1', ['second corps', 'hancock\'s corps'], ['night|midnight|10.30|22.30|ten and a half', 'arrived|marched|reached'], scope=(OR, BK))],
    hints=['Head versus tail of the corps, and division versus brigade, give different hours: sort the passages by what moved.', '22:30 on Jul 1 and 06:00-07:00 on Jul 2 may be different units.'],
    acquire=['WALKER-1886', 'DOUBLEDAY-1882'])

P['C-005'] = dict(event_date='1863-07-02', kinds=['time'], focus='when Hood\'s division stood on Seminary Ridge (05:30, 06:30, 07:30)',
    terms=['Hood', 'Seminary Ridge', 'Law', 'Robertson', 'Benning', 'Anderson', 'Longstreet'],
    probes=[pr('Hood and Seminary Ridge', ['hood'], ['seminary', 'CLOCK|sunrise|daybreak|daylight']),
            pr('The march of Law\'s and Hood\'s divisions on the morning of Jul 2', ['law', 'hood\'s division'], ['marched|arrived|reached|came up|moved', 'CLOCK|sunrise|daybreak|daylight|morning'], scope=(OR, BK)),
            pr('Kershaw\'s departure from camp', ['kershaw'], ['left camp|marched|sunrise|daybreak|started', 'CLOCK|sunrise|daybreak']),
            pr('Longstreet\'s corps arrives near the ridge', ['longstreet'], ['hood|mclaws|his corps|divisions', 'arrived|reached|marched|came up', 'CLOCK|sunrise|daybreak|morning'], window=380)],
    hints=['No report of Hood exists for Gettysburg; the question is which other writers date his arrival.', 'Sunrise on Jul 2 was about 04:35 local mean time (PDF B.2.1).'],
    acquire=['HOOD-1880', 'SHSP-07', 'SORREL-1905', 'ANNALS-1879'])

P['C-006'] = dict(event_date='1863-07-02', kinds=['time', 'period'], focus='when Longstreet reported at Lee\'s headquarters on Jul 2 (05:15, 08:00, "stars bright", pre-dawn)',
    terms=['Longstreet', 'Lee', 'headquarters', 'Thompson house', 'stars'],
    probes=[pr('Longstreet\'s memoir: the stars on the morning of Jul 2', ['stars were shining', 'stars shining', 'stars were bright', 'stars bright'], ['longstreet|lee|head-?quarters|general']),
            pr('Longstreet at Lee\'s headquarters', ['longstreet'], [r'(reported|went|rode|called|arrived).{0,100}(lee|headquarters)', 'CLOCK|sunrise|daybreak|dawn|morning|stars']),
            pr('Lee\'s orders to Longstreet in the morning', ['lee'], ['longstreet', r'(sunrise|daybreak|dawn|morning|stars|a\.? ?m)', 'order|ordered|conversation|consult|interview']),
            pr('Staff memoirs: Sorrel, Taylor, Long, Fremantle', ['sorrel', 'colonel taylor', 'general long', 'fremantle'], ['longstreet', 'CLOCK|sunrise|daybreak|morning|stars'], scope=(BK,))],
    hints=['Sunrise on Jul 2 was about 04:35 local mean time (PDF B.2.1): compare any hour with it.', 'A single retrospective witness is weighted below a record of the day (PLAN.md section 5).'],
    acquire=['ANNALS-1879', 'SORREL-1905', 'TAYLOR-1877', 'SHSP-07'])

P['C-007'] = dict(event_date='1863-07-02', kinds=['time'], focus='when McLaws\'s division stood on the ridge (08:00, 08:30)',
    terms=['McLaws', 'Seminary Ridge', 'Kershaw', 'Barksdale', 'Semmes', 'Wofford'],
    probes=[pr('McLaws on the ridge', ['mclaws'], ['ridge|seminary|arrived|reached|formed|halted|bivouac', 'CLOCK|sunrise|daybreak|morning']),
            pr('Kershaw\'s report of the march', ['kershaw'], ['sunrise|daybreak|left camp|marched|halted|ridge', 'CLOCK|sunrise|daybreak|morning']),
            pr('Barksdale, Semmes and Wofford on the morning of Jul 2', ['barksdale', 'semmes', 'wofford'], ['arrived|marched|reached|ridge|halted|bivouac', 'CLOCK|sunrise|daybreak|morning'], scope=(OR, BK))],
    hints=['Which unit of the division is meant: the head (Kershaw) or the division as a whole?'],
    acquire=['SHSP-07', 'SORREL-1905'])

P['C-008'] = dict(event_date='1863-07-02', kinds=['time', 'period'], focus='the hour of Lee\'s order to attack on Jul 2 (about 09:00 from a forum; 11:00)',
    terms=['Lee', 'order', 'Longstreet', 'attack', 'Ewell', 'Marshall'],
    probes=[pr('Longstreet on the order of Jul 2', ['longstreet'], [r'(order|ordered|orders).{0,120}(attack|advance|move)', 'CLOCK|eleven|noon|forenoon']),
            pr('Lee\'s decision and the hour', ['lee'], [r'(determined|decided|resolved|ordered|directed).{0,120}(attack|assault)', 'CLOCK|morning|forenoon|noon'], scope=(OR, BK)),
            pr('The order delivered to Longstreet and to Hood and McLaws', ['ordered', 'order'], ['hood|mclaws|longstreet', 'CLOCK|noon|eleven|forenoon', 'attack|advance|move'], scope=(OR, BK), window=380),
            pr('Marshall and Taylor: the hour of the order', ['marshall', 'taylor'], ['order', 'attack', 'CLOCK|noon|eleven|morning'], scope=(BK,))],
    hints=['An "about 09:00" attributed to a forum is a lead: look for the primary text it relays.', 'Is the hour that of the order given, received, or of the attack?'],
    acquire=['ANNALS-1879', 'TAYLOR-1877', 'LONG-1886', 'SORREL-1905'])

P['C-009'] = dict(event_date='1863-07-02', kinds=['time'], focus='when Berdan\'s reconnaissance started (11:00, 11:15, noon)',
    terms=['Berdan', 'sharpshooters', 'reconnaissance', 'Pitzer', 'Peach Orchard', 'Birney', 'Hunt'],
    probes=[pr('Berdan\'s own report', ['berdan'], ['reconnoi|reconnaiss|sharpshooters|skirmishers|ordered', 'CLOCK|noon|forenoon']),
            pr('Birney and Hunt on the reconnaissance', ['reconnoi', 'reconnaiss'], ['berdan|sharpshooter|third corps|birney', 'CLOCK|noon|forenoon']),
            pr('Pitzer\'s woods and the Emmitsburg road in the forenoon', ['pitzer'], ['berdan|sharpshooters|reconnoi|skirmish', 'CLOCK|noon|forenoon|morning'], scope=(OR, BK, NP))],
    hints=['Which of the three hours is the order to Berdan, which the start of the march, which the first contact?'],
    acquire=['JCCW-1865', 'HUMPHREYS-1896'])

P['C-010'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when Sickles advanced to the Peach Orchard line (noon, 14:00, 16:00)',
    terms=['Sickles', 'Peach Orchard', 'Emmitsburg road', 'Birney', 'Hunt', 'Meade'],
    probes=[pr('Sickles forms his corps', ['sickles'], [r'(formed|advanced|moved|ordered|occupied).{0,100}(corps|line|peach orchard|emmitsburg)', 'CLOCK|noon']),
            pr('Hunt on the Peach Orchard', ['hunt'], ['sickles|peach orchard|emmitsburg', 'CLOCK|noon']),
            pr('Birney\'s division advances to the line', ['birney'], [r'(advanced|moved|formed|occupied|took).{0,100}(line|peach orchard|emmitsburg)', 'CLOCK|noon|afternoon']),
            pr('Meade\'s orders to Sickles and the hour', ['meade'], ['sickles', 'CLOCK|noon|afternoon', 'order|line|position'], scope=(OR, BK))],
    hints=['"Advance" may mean the movement of the corps, of the first line, or of a skirmish line; each has its own hour.', 'Union clock; the Confederate reports use another.'],
    acquire=['JCCW-1865', 'HUMPHREYS-1896', 'DOUBLEDAY-1882'])

P['C-011'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when Hood\'s attack began (16:00, 16:30)',
    terms=['Hood', 'Law', 'Robertson', 'Devil\'s Den', 'Round Top', 'Wheatfield', 'Alexander'],
    probes=[pr('The opening of the fight on the right', ['hood'], [r'(opened|began|attack|advance|moved forward|ordered forward)', 'CLOCK|afternoon']),
            pr('Alexander\'s guns and the infantry soon after', ['alexander'], ['opened|fire|guns', 'hood|infantry|advance', 'CLOCK|afternoon'], scope=(OR, BK)),
            pr('Law\'s and Robertson\'s brigades step off', ['law', 'robertson'], ['advance|moved forward|attack|ordered forward', 'CLOCK|afternoon|four|half past'], scope=(OR, BK)),
            pr('Union reports of the first shots on the left', ['little round top', 'devil\'s den', 'round top'], ['attack|attacked|opened|engaged|began', 'CLOCK'], scope=(OR,)),
            pr('Garrett / Robertson / Benning on the hour', ['benning', 'anderson', 'garrett'], ['advance|attack|moved|ordered forward', 'CLOCK|afternoon'], scope=(OR,))],
    hints=['Guns and infantry have different hours: Alexander\'s guns are said to open first.', 'Confederate and Union clocks differ by about 20 minutes (PDF B.2.1).'],
    acquire=['HOOD-1880', 'OATES-1905', 'POWELL-1896'])

P['C-012'] = dict(event_date='1863-07-02', kinds=['duration'], focus='how many minutes Vincent\'s brigade reached the summit of Little Round Top before Law\'s men (10 or 15 minutes)',
    terms=['Vincent', 'Law', 'Oates', 'Little Round Top', 'Round Top', 'minutes'],
    probes=[pr('Minutes before the enemy: Vincent and Law', ['vincent'], ['minutes', 'law|oates|enemy|alabama|round top']),
            pr('Oates and Law on the race for the hill', ['oates', 'law'], ['minutes', 'vincent|round top|summit|crest']),
            pr('Rice, Chamberlain, Barnes: the time Vincent took the hill', ['chamberlain', 'rice', 'barnes'], ['minutes', 'vincent|round top|hill']),
            pr('"ten minutes" and "fifteen minutes"', ['ten minutes', 'fifteen minutes', '10 minutes', '15 minutes'], ['vincent|round top|law|oates|alabama'], scope=(OR, BK, NP))],
    hints=['The first pass found no source for either figure: look for who first printed "ten" or "fifteen".', 'A figure printed in a later book may relay an earlier statement: find the earliest.'],
    acquire=['OATES-1905', 'NORTON-1913', 'CHAMBERLAIN-1915', 'POWELL-1896'])

P['C-013'] = dict(event_date='1863-07-02', kinds=['time', 'period', 'none'], focus='the clock time of the 20th Maine\'s bayonet charge (17:30 inferred; no clock time in the sources)',
    terms=['Chamberlain', '20th Maine', 'Twentieth Maine', 'bayonet', 'Little Round Top', 'Oates'],
    probes=[pr('Chamberlain\'s report of the charge', ['chamberlain'], ['bayonet', 'CLOCK|dusk|dark|twilight|sun|hour|minutes']),
            pr('The 20th Maine and the order to charge', ['twentieth maine', '20th maine'], ['bayonet|charge|charged', 'CLOCK|dusk|dark|twilight|sun|hour']),
            pr('Oates on the hour of the fight', ['oates'], ['twentieth maine|20th maine|chamberlain|bayonet', 'CLOCK|dusk|dark|twilight|sun|hour']),
            pr('Rice and Barnes on the hour of the repulse', ['rice', 'barnes'], ['charge|bayonet|repulse', 'CLOCK|dusk|dark|twilight|sun'], scope=(OR,))],
    hints=['If the sources give no clock time, record the failed searches: that is a result.', 'Sunset on Jul 2 was 19:32 (PDF B.2.1).'],
    acquire=['CHAMBERLAIN-1915', 'OATES-1905', 'NORTON-1913', 'POWELL-1896'])

P['C-014'] = dict(event_date='1863-07-02', kinds=['count', 'count_range'], focus='prisoners taken in the 20th Maine front (218-368; 400+25)',
    terms=['prisoners', 'Chamberlain', '20th Maine', 'Rice', 'Barnes', '15th Alabama', '47th Alabama'],
    probes=[pr('Chamberlain on the prisoners', ['prisoners'], ['chamberlain|twentieth maine|20th maine|my command|regiment', r'\b\d{2,3}\b']),
            pr('Rice and Barnes: prisoners of the brigade', ['prisoners'], ['rice|barnes|vincent|brigade', r'\b\d{2,3}\b'], scope=(OR,)),
            pr('Oates and Law on the losses and the prisoners of the Alabama regiments', ['prisoners'], ['oates|alabama|law', r'\b\d{2,3}\b'], scope=(OR, BK)),
            pr('Numbers of prisoners in the state volume of Maine', ['prisoners'], ['twentieth|20th', r'\b\d{2,3}\b'], scope=(BK,))],
    hints=['"400+25" reads as 400 taken plus 25 more (Chamberlain); record the parts.', 'Which front: the regiment, the brigade, or the whole Round Top fight?'],
    acquire=['CHAMBERLAIN-1915', 'OATES-1905', 'NORTON-1913'])

P['C-015'] = dict(event_date='1863-07-02', kinds=['count'], focus='the strength of the 20th Maine (385 or 386)',
    terms=['20th Maine', 'Twentieth Maine', 'Chamberlain', '386', '385', 'effective', 'present'],
    probes=[pr('Chamberlain\'s own count', ['twentieth maine', '20th maine', 'chamberlain'], [r'\b38[4-7]\b|three hundred and eighty|three hundred and eighty-six|three hundred and eighty-five']),
            pr('Strength stated for the regiment', ['twentieth maine', '20th maine'], ['strength|present|effective|muskets|men|rifles|aggregate', r'\b3[5-9]\d\b']),
            pr('Maine at Gettysburg and Fox on the regiment', ['twentieth maine', '20th maine'], [r'\b3[5-9]\d\b', 'present|engaged|strength|aggregate'], scope=(BK,))],
    hints=['"386 all told, 358 guns" (first pass): the count of men and the count of rifles are different figures.', 'The soldiers instanced follow the printed unit strength (DEC-008).'],
    acquire=['CHAMBERLAIN-1915', 'NORTON-1913'])

P['C-016'] = dict(event_date='1863-07-02', kinds=['place'], focus='where the 48th Alabama fought (Devil\'s Den; Little Round Top)',
    terms=['48th Alabama', 'Forty-eighth Alabama', 'Sheffield', 'Devil\'s Den', 'Little Round Top', 'Law'],
    probes=[pr('The 48th Alabama named with a place', ['forty-eighth alabama', '48th alabama', 'forty-eighth regiment'], ['devil|round top|ravine|slaughter|wheatfield|hill|position']),
            pr('Law\'s brigade order of battle on Jul 2', ['law'], ['forty-eighth|48th', 'devil|round top|ravine|position|right|left']),
            pr('Sheffield, Oates and Bulger', ['sheffield', 'bulger'], ['forty-eighth|48th|alabama', 'devil|round top|ravine|position']),
            pr('The Slaughter Pen and the right of Law\'s line', ['48th alabama', 'forty-eighth'], ['slaughter|houck|devil|round top'], scope=(NP,))],
    hints=['Law filed no report; the 48th Alabama\'s own colonel (Sheffield) and the accounts of the regiments beside it are the sources to find.'],
    acquire=['OATES-1905', 'NORTON-1913', 'HOOD-1880'])

P['C-017'] = dict(event_date='1863-07-02', kinds=['person'], focus='who took over the III Corps after Sickles fell (Birney; Hancock)',
    terms=['Sickles', 'Birney', 'Hancock', 'Third Corps', 'III Corps', 'command'],
    probes=[pr('Sickles wounded and the command of the corps', ['sickles'], ['wounded|fell|leg|disabled', 'command|relieved|succeeded|assumed|turned over']),
            pr('Birney assumes command of the corps', ['birney'], [r'(assumed|took|was assigned|in command|command of the corps|succeeded)', 'corps|sickles|wounded']),
            pr('Hancock directed to take command of the Third Corps', ['hancock'], ['third corps|sickles|birney', 'command|direct|ordered|assigned']),
            pr('Meade\'s dispatch of the command of the corps', ['meade'], ['sickles|birney|third corps', 'command|assign|relieved'], scope=(OR, BK))],
    hints=['The PDF default says Birney commanded the corps and Hancock oversaw the sector: find whether the two statements concern different times.'],
    acquire=['JCCW-1865', 'DOUBLEDAY-1882', 'WALKER-1886'])

P['C-018'] = dict(event_date='1863-07-02', kinds=['person', 'category', 'place'], focus='who stopped Wright\'s Georgia brigade on Jul 2 (Webb, Stannard, or none), and whether it reached the crest',
    terms=['Wright', 'Webb', 'Stannard', 'Cemetery Ridge', 'Georgia', 'crest', 'Perry', 'Wilcox'],
    probes=[pr('Wright\'s report: the crest', ['wright'], ['crest|cemetery ridge|reached|gained|ridge', 'brigade|georgia|artillery|guns']),
            pr('Union reports naming a Georgia brigade', ['georgia'], ['brigade', 'webb|stannard|hancock|gibbon|harrow|hall|willard|gibbon'], scope=(OR,)),
            pr('Webb\'s and Stannard\'s reports of Jul 2 evening', ['webb', 'stannard'], ['repulsed|drove|checked|advanced|attack|enemy', 'evening|p\\. ?m|dusk|dark'], scope=(OR,)),
            pr('Wilcox and Perry in the same fight', ['wilcox', 'perry'], ['crest|cemetery ridge|reached|gained', 'wright|georgia|support'], scope=(OR,))],
    hints=['Record the claims as claims: the question of attribution may not be settled by any source (first pass: open gap).'],
    acquire=['WALKER-1886'])

P['C-019'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when Johnson\'s attack on Culp\'s Hill began (19:00, 19:30, 20:00)',
    terms=['Johnson', 'Culp\'s Hill', 'Steuart', 'Walker', 'Greene', 'Geary', 'Williams'],
    probes=[pr('Greene and Geary on the opening of the attack', ['greene', 'geary'], ['attack|assault|advanced|opened|engaged', 'CLOCK|dark|dusk|sunset|evening|twilight']),
            pr('Johnson\'s division advances', ['johnson', 'steuart', 'walker'], ['advance|advanced|attack|assault|ordered forward', 'CLOCK|dark|dusk|sunset|evening|twilight']),
            pr('Williams and Slocum on the evening attack', ['williams', 'slocum'], ['attack|assault', 'CLOCK|dark|dusk|sunset|evening'], scope=(OR, BK)),
            pr('Culp\'s Hill, evening of Jul 2, in the Park Service studies', ['culp'], ['attack|assault', 'CLOCK|dusk|dark|evening|p\\. ?m'], scope=(NP,))],
    hints=['Different regiments were hit at different moments: sort the hours by unit.', 'Sunset on Jul 2 was 19:32 (PDF B.2.1).'],
    acquire=['EARLY-1912', 'GORDON-1903'])

P['C-020'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when the assault on East Cemetery Hill began (19:30, 20:00, 20:00-21:00)',
    terms=['East Cemetery Hill', 'Hays', 'Early', 'Hoke', 'Avery', 'Ricketts', 'Osborn', 'Wiedrich', 'Louisiana Tigers'],
    probes=[pr('Union reports of the attack on Cemetery Hill in the evening', ['cemetery hill'], ['attack|assault|advanced|charge', 'CLOCK|dusk|dark|twilight|evening|sunset']),
            pr('Hays, Hoke and Avery', ['hays', 'hoke', 'avery'], ['attack|advance|assault|charge', 'CLOCK|dusk|dark|twilight|evening|sunset']),
            pr('Ricketts, Osborn and Wiedrich', ['ricketts', 'osborn', 'wiedrich'], ['attack|assault|repulse|charge', 'CLOCK|dusk|dark|twilight|evening|sunset'], scope=(OR,)),
            pr('Early\'s report and the signal to attack', ['early'], ['cemetery hill|attack|signal', 'CLOCK|dusk|dark|twilight|evening'], scope=(OR, BK))],
    hints=['Union and Confederate clocks differ by about 20 minutes; the PDF rows do not correct for it.'],
    acquire=['EARLY-1912', 'GORDON-1903'])

P['C-021'] = dict(event_date='1863-07-02', kinds=['date', 'period', 'time'], focus='when Pickett\'s division reached the field (night of Jul 2; Jul 3; march from 06:00 Jul 2)',
    terms=['Pickett', 'Chambersburg', 'Garnett', 'Kemper', 'Armistead', 'Lee', 'Marsh Creek'],
    probes=[pr('Pickett\'s division arrives', ['pickett'], [r'(arrived|reached|came up|joined|bivouac|marched|encamped)', 'CLOCK|night|morning|afternoon|evening|daylight|dawn']),
            pr('Lee\'s report of Pickett\'s division and Chambersburg', ['pickett'], ['chambersburg|relieved|not yet|reached|arrived', 'july|second|third|2d|3d|night|morning']),
            pr('Longstreet and Alexander on the arrival of Pickett', ['longstreet', 'alexander'], ['pickett', 'arrived|reached|came up|joined|night|morning', 'CLOCK|night|morning|dawn|daylight'], scope=(OR, BK)),
            pr('Brigade reports: Garnett, Kemper, Armistead', ['garnett', 'kemper', 'armistead'], ['arrived|marched|reached|bivouac|night|morning', 'CLOCK|night|morning|dawn|daylight'], scope=(OR, BK, NP))],
    hints=['Gate Q04: Pickett is not drawn before sunrise on Jul 3 (04:36) in the default views; a changed default must be reconciled in the open with the gate spec.', 'Lee\'s report of 1863 and his report of 1864 give different dates.'],
    acquire=['TAYLOR-1877', 'LONG-1886', 'ANNALS-1879'])

P['C-022'] = dict(event_date='1863-07-02', kinds=['time', 'time_window'], focus='when the VI Corps arrived (head about 14:00; main body about 17:00)',
    terms=['VI Corps', 'Sixth Corps', 'Sedgwick', 'Wright', 'Howe', 'Newton', 'Manchester', 'Taneytown'],
    probes=[pr('Sedgwick and the march', ['sedgwick'], ['arrived|reached|marched|came up|head of|halted', 'CLOCK|afternoon|noon']),
            pr('Wright\'s division reaches the field', ['wright', 'neill', 'howe', 'wheaton'], ['arrived|reached|marched|came up|head of|halted|position', 'CLOCK|afternoon|noon|evening']),
            pr('Meade and the Sixth Corps on Jul 2', ['sixth corps'], ['arrived|reached|come up|marched|head of', 'CLOCK|afternoon|noon|evening|p\\. ?m'], scope=(OR, BK)),
            pr('Brigade reports of the Sixth Corps', ['bartlett', 'torbert', 'russell', 'shaler', 'eustis'], ['arrived|marched|reached|ordered|position', 'CLOCK|afternoon|evening|p\\. ?m'], scope=(OR,))],
    hints=['Head of column, first brigade in action and the corps closed up are three different moments.'],
    acquire=['STEVENS-1866', 'WALKER-1886', 'BATES-1875'])

P['C-023'] = dict(event_date='1863-07-02', kinds=['time', 'time_window', 'period'], focus='when Stuart reached Lee (noon-13:00, mid-afternoon, afternoon, evening) and when his brigades arrived',
    terms=['Stuart', 'Hampton', 'Fitz Lee', 'Chambliss', 'Carlisle', 'Lee', 'Hunterstown'],
    probes=[pr('Stuart\'s report: the junction with Lee', ['stuart'], [r'(arrived|reached|joined|reported|rejoined).{0,100}(lee|gettysburg|army)', 'CLOCK|afternoon|evening|noon|night']),
            pr('Others who see Stuart arrive', ['stuart'], ['arrived|joined|reported|came up|rejoined|appeared', 'CLOCK|afternoon|evening|noon|night|dusk'], scope=(OR, BK)),
            pr('Hampton and the brigades on Jul 2', ['hampton', 'fitz lee', 'chambliss'], ['arrived|marched|reached|bivouac|joined', 'CLOCK|afternoon|evening|night|dusk'], scope=(OR, BK)),
            pr('Carlisle to Gettysburg, Jul 1-2', ['carlisle'], ['stuart', 'CLOCK|night|morning|afternoon'], scope=(OR, BK))],
    hints=['Gate Q04: Stuart\'s brigades are not drawn before 19:32 on Jul 2 in the default views (Hampton\'s rear guard at Hunterstown exempt); a changed default must be reconciled in the open with the gate spec.', 'Stuart himself and each brigade arrived at different hours: split the value.'],
    acquire=['MCCLELLAN-1885', 'TAYLOR-1877', 'LONG-1886'])

P['C-024'] = dict(event_date='1863-07-02', kinds=['time_window', 'time'], focus='when the Union council of war met on the night of Jul 2 (21:00, midnight, late)',
    terms=['council', 'Meade', 'Gibbon', 'Butterfield', 'Leister', 'consultation', 'conference', 'corps commanders'],
    probes=[pr('The council of war at army headquarters', ['council'], ['meade|headquarters|generals|corps commanders|butterfield', 'CLOCK|night|evening|midnight|late']),
            pr('Butterfield, Gibbon, Warren and Williams at the council', ['butterfield', 'gibbon', 'warren', 'williams', 'newton', 'birney', 'sedgwick'], ['council|consultation|conference|met at', 'CLOCK|night|evening|midnight|late|nine|ten'], scope=(OR, BK)),
            pr('Meade\'s dispatch after the council', ['meade'], ['council|consult|corps commanders', 'CLOCK|night|evening|midnight'], scope=(OR, BK)),
            pr('Park Service account of the council (Handbook 9)', ['council'], ['meade|headquarters|leister|generals'], scope=(NP,))],
    hints=['Two sittings (an early one and a later one) may be described by different witnesses.'],
    acquire=['JCCW-1865', 'DOUBLEDAY-1882'])

P['C-025'] = dict(event_date='1863-07-03', kinds=['time_window', 'time', 'period'], focus='when Geary\'s division went back to Culp\'s Hill (overnight, 23:00, 04:00)',
    terms=['Geary', 'Culp\'s Hill', 'Greene', 'Candy', 'Kane', 'Slocum', 'Williams', 'Lockwood'],
    probes=[pr('Geary\'s report of the return to the hill', ['geary'], [r'(returned|back|reoccupied|moved|marched).{0,100}(hill|position|breastworks|entrenchments|works)', 'CLOCK|night|morning|daylight|dawn']),
            pr('Williams and Slocum on the reoccupation', ['williams', 'slocum'], ['geary', 'returned|reoccupied|back|position|works', 'CLOCK|night|morning|daylight|dawn'], scope=(OR, BK)),
            pr('Candy, Kane and Greene', ['candy', 'kane', 'greene'], ['returned|reoccupied|back|position|works', 'CLOCK|night|morning|daylight|dawn'], scope=(OR,)),
            pr('Culp\'s Hill at night in the Park Service studies', ['geary'], ['returned|night|reoccup|four'], scope=(NP,))],
    hints=['Which unit returned when: a division, a brigade or a regiment.'],
    acquire=['WALKER-1886'])

P['C-026'] = dict(event_date='1863-07-02', kinds=['date', 'period'], focus='when the Sherfy barn burned (Jul 2 evening; Jul 3)',
    terms=['Sherfy', 'barn', 'Peach Orchard', 'Emmitsburg road', 'burned', 'fire'],
    probes=[pr('Sherfy and the barn', ['sherfy'], ['barn|burn|fire|flames|house']),
            pr('A barn burning on the Emmitsburg road', ['barn'], ['burn|fire|flames', 'peach orchard|emmitsburg|sherfy|wilcox|barksdale|brewster'], scope=(OR, BK, NP)),
            pr('Barksdale\'s advance and the burning buildings', ['barksdale'], ['burn|fire|flames|barn|house'], scope=(OR, BK)),
            pr('Weeklies of July 1863 on the farms of the field', ['sherfy', 'barn'], ['burn|fire|flames', 'peach|emmitsburg|sherfy'], scope=(NW,))],
    hints=['The first pass found the word Sherfy zero times in the Official Records; try "barn" with the units that fought there.'],
    acquire=['BATES-1875'])

P['C-027'] = dict(event_date='1863-07-02', kinds=['place'], focus='where Buford went from Gettysburg on Jul 2 (Taneytown, Westminster, Emmitsburg)',
    terms=['Buford', 'Taneytown', 'Westminster', 'Emmitsburg', 'Gamble', 'Devin', 'Merritt', 'Pleasonton'],
    probes=[pr('Buford\'s destination on Jul 2', ['buford'], ['taneytown|westminster|emmitsburg|frederick|mechanicstown', 'march|moved|ordered|started|arrived|proceeded|retired']),
            pr('Pleasonton\'s orders for the First Division', ['pleasonton'], ['buford|first division', 'taneytown|westminster|emmitsburg']),
            pr('Gamble and Devin', ['gamble', 'devin'], ['taneytown|westminster|emmitsburg|frederick', 'march|moved|ordered|arrived|proceeded|retired'], scope=(OR,)),
            pr('Merritt\'s reserve brigade', ['merritt'], ['taneytown|westminster|emmitsburg|mechanicstown|fairfield', 'march|moved|ordered|arrived|proceeded'], scope=(OR,))],
    hints=['Different units of the division may have gone to different places on different days: sort by unit and date.'],
    acquire=['BATES-1875'])

P['C-028'] = dict(event_date='1863-07-03', kinds=['time'], focus='when Union guns opened on Jul 3 (04:30 batteries; 05:30)',
    terms=['Hunt', 'Culp\'s Hill', 'batteries', 'opened', 'Jul 3', 'Muhlenberg', 'Winslow', 'Rigby'],
    probes=[pr('Hunt\'s report of the batteries opening', ['hunt'], ['opened|fire|batteries', 'CLOCK|daylight|dawn|morning']),
            pr('Culp\'s Hill batteries on the morning of Jul 3', ['batteries', 'battery'], [r'(opened|fire)', 'CLOCK|daylight|dawn|morning', 'culp|johnson|ewell|steuart|slocum']),
            pr('Williams, Geary and Slocum on the opening of the fight at dawn', ['williams', 'geary', 'slocum'], ['opened|fire|artillery|batteries', 'CLOCK|daylight|dawn'], scope=(OR,)),
            pr('Johnson\'s and Steuart\'s reports on the morning attack', ['johnson', 'steuart'], ['artillery|guns|fire|opened', 'CLOCK|daylight|dawn|morning'], scope=(OR,))],
    hints=['The first pass reads both hours as true events (different batteries): check each against its own battery.'],
    acquire=['WALKER-1886', 'BATES-1875'])

P['C-029'] = dict(event_date='1863-07-03', kinds=['time'], focus='when the great cannonade ended (14:00, 14:30, 15:00)',
    terms=['cannonade', 'Hunt', 'Alexander', 'Webb', 'Hancock', 'Smyth', 'Peyton', 'ceased'],
    probes=[pr('Hunt\'s order to cease fire', ['hunt'], ['cease|stop|slacken|gradually|fire', 'CLOCK|afternoon']),
            pr('Confederate reports: the cannonade ceased', ['cannonade', 'firing', 'fire'], ['ceased|slackened|slacken|silenced|abated|ended|stopped', 'CLOCK|two hours|hour|afternoon'], scope=(OR,)),
            pr('Alexander and Longstreet on the cessation', ['alexander', 'longstreet'], ['cease|fire|ammunition|guns', 'CLOCK|afternoon'], scope=(OR, BK)),
            pr('Union brigade and division reports of the end of the fire', ['webb', 'hays', 'smyth', 'hall', 'harrow', 'gibbon'], ['ceased|silenced|slackened|abated|continued|uninterrupted', 'CLOCK'], scope=(OR,))],
    hints=['"Ceased" on the Union side (a decision) and "abated" on the Confederate side (a result) are different events.'],
    acquire=['WALKER-1886', 'ANNALS-1879'])

P['C-030'] = dict(event_date='1863-07-03', kinds=['time'], focus='when the infantry stepped off for Pickett\'s Charge (14:00, 15:00)',
    terms=['Pickett', 'Longstreet', 'Alexander', 'Pettigrew', 'Trimble', 'advance', 'step off'],
    probes=[pr('Reports of the advance of the infantry', ['pickett', 'pettigrew', 'trimble', 'garnett', 'kemper', 'armistead'], ['advance|moved forward|step|started|ordered forward', 'CLOCK|afternoon']),
            pr('Alexander and Longstreet: the hour of the advance', ['alexander', 'longstreet', 'peyton'], ['advance|infantry|moved forward|ordered', 'CLOCK|afternoon'], scope=(OR, BK)),
            pr('Union reports of the advance coming on', ['advance', 'advanced', 'charge'], ['webb|hays|gibbon|hancock|hall|harrow|stannard|smyth|brown|doubleday', 'CLOCK'], scope=(OR,)),
            pr('Park Service study of the charge (A Common Pride and Fame)', ['advance', 'stepped off', 'step off'], ['CLOCK|pickett|afternoon'], scope=(NP,))],
    hints=['Which unit\'s step-off: Pickett\'s division, Pettigrew\'s, the whole line?'],
    acquire=['ANNALS-1879', 'WALKER-1886'])

P['C-031'] = dict(event_date='1863-07-03', kinds=['time', 'time_window'], focus='when the final charge on Culp\'s Hill ended (10:00; noon)',
    terms=['Culp\'s Hill', 'Ruger', 'Williams', 'Johnson', 'Steuart', 'Daniel', 'Walker', 'Colgrove'],
    probes=[pr('Ruger on the end of the fight', ['ruger', 'colgrove'], ['continued|ceased|ended|repulsed|charge', 'CLOCK|morning']),
            pr('Culp\'s Hill: the last assault', ['culp'], ['assault|charge|attack|repulse', 'CLOCK|morning|forenoon|noon']),
            pr('Johnson, Steuart, Daniel, Walker on the end of the attack', ['johnson', 'steuart', 'daniel', 'walker', 'jones'], ['charge|attack|assault|retired|withdrew|ordered', 'CLOCK|morning|forenoon|noon'], scope=(OR,)),
            pr('Slocum and Williams: the repulse', ['slocum', 'williams'], ['repulsed|charge|assault|ceased', 'CLOCK|morning|forenoon|noon'], scope=(OR,))],
    hints=['"The end of the fight", "the last charge" and "the Confederates withdrew" are different statements.'],
    acquire=['WALKER-1886'])

P['C-032'] = dict(event_date='1863-07-03', kinds=['time', 'time_window'], focus='when the cavalry fight east of Gettysburg began (13:00, 15:00; first pass: about noon)',
    terms=['East Cavalry Field', 'Gregg', 'Custer', 'Stuart', 'Hampton', 'McIntosh', 'Rummel', 'Cress Ridge'],
    probes=[pr('Gregg\'s report of the cavalry fight', ['gregg'], ['engaged|attack|opened|charge|skirmish', 'CLOCK|noon|afternoon|morning']),
            pr('Custer and McIntosh', ['custer', 'mcintosh'], ['engaged|attack|opened|charge|ordered', 'CLOCK|noon|afternoon|morning'], scope=(OR, BK)),
            pr('Stuart, Hampton and Chambliss', ['stuart', 'hampton', 'chambliss', 'fitz lee'], ['engaged|attack|opened|charge|advanced|moved', 'CLOCK|noon|afternoon|morning'], scope=(OR,)),
            pr('Rummel farm and Cress Ridge', ['rummel', 'cress'], ['cavalry|fight|charge|engaged', 'CLOCK|noon|afternoon'], scope=(OR, BK, NP))],
    hints=['Skirmishing, the first artillery, and the main charge are separate moments.'],
    acquire=['KIDD-1908', 'MCCLELLAN-1885'])

P['C-033'] = dict(event_date='1863-07-04', kinds=['date', 'period'], focus='when Imboden\'s wagon train left (Jul 4 afternoon; Jul 5)',
    terms=['Imboden', 'wagons', 'wounded', 'train', 'Williamsport', 'Chambersburg', 'Cashtown'],
    probes=[pr('Imboden\'s own account of the order and the start', ['imboden'], ['wagons|train|wounded|ordered|started|moved|set out', 'CLOCK|afternoon|evening|night|july|4th|5th|fourth|fifth']),
            pr('Lee\'s orders for the wounded train', ['wounded'], ['imboden|train|wagons|ordered', 'CLOCK|afternoon|evening|night|4th|5th|fourth|fifth'], scope=(OR, BK)),
            pr('Pendleton and others on the departure', ['pendleton', 'longstreet', 'ewell'], ['train|wagons|wounded|imboden', 'july|4th|5th|fourth|fifth|night|afternoon'], scope=(OR,)),
            pr('Union pursuit reports that met the train', ['imboden'], ['train|wagons|captured|attack|overtaken'], scope=(OR, NP))],
    hints=['The PDF default says "Jul 4 afternoon"; the first pass found an OR statement for the evening: check which part of the train each statement means.'],
    acquire=['TAYLOR-1877', 'LONG-1886'])

P['C-034'] = dict(event_date='1863-07-04', kinds=['count', 'count_range'], focus='wagons at Monterey Pass (40; 150; 300; 400-500)',
    terms=['Monterey', 'Kilpatrick', 'Custer', 'Farnsworth', 'wagons', 'Imboden', 'Ewell', 'Fairfield'],
    probes=[pr('Reports naming Monterey Pass and wagons', ['monterey'], ['wagon|train|ambulance|captured|destroyed', r'\b\d{2,3}\b']),
            pr('Kilpatrick, Custer and Farnsworth: wagons captured', ['wagons'], ['kilpatrick|custer|farnsworth|monterey|fairfield|ringgold', r'\b\d{2,3}\b'], scope=(OR,)),
            pr('Confederate reports of the wagons lost', ['wagons'], ['captured|destroyed|lost|burned', 'monterey|fairfield|waynesboro|ewell|ramseur|early|imboden'], scope=(OR, BK)),
            pr('Park Service pages on Monterey Pass', ['monterey'], ['wagon|train|captured'], scope=(NP,))],
    hints=['Count what each source counts: wagons, wagons and ambulances, prisoners with them, or the length of the train.'],
    acquire=['KIDD-1908', 'BATES-1875'])

P['C-035'] = dict(event_date='1863-07-14', kinds=['count', 'count_range'], focus='prisoners at Falling Waters (500; 1,000-2,000)',
    terms=['Falling Waters', 'Kilpatrick', 'Buford', 'Gamble', 'Pettigrew', 'Heth', 'prisoners', 'Custer'],
    probes=[pr('Prisoners taken at Falling Waters', ['falling waters'], ['prisoners|captured', r'\b\d{2,4}\b']),
            pr('Buford, Gamble, Kilpatrick and Custer on the capture', ['prisoners'], ['falling waters|williamsport|pettigrew|heth|rear guard', r'\b\d{2,4}\b'], scope=(OR,)),
            pr('Heth\'s and Lee\'s reports of the loss', ['falling waters'], ['loss|lost|captured|missing|prisoners', r'\b\d{2,4}\b'], scope=(OR, BK)),
            pr('Weeklies of July 1863 on the capture', ['falling waters', 'williamsport'], ['prisoners|captured', r'\b\d{2,4}\b'], scope=(NW,))],
    hints=['A prisoner count of the day and the figure of a later book may count different things (wounded, stragglers, the 61 turned over).'],
    acquire=['KIDD-1908', 'BATES-1875'])

P['C-036'] = dict(event_date='1863-07-06', kinds=['date'], focus='when the fight at Williamsport took place (Jul 6; Jul 7)',
    terms=['Williamsport', 'Buford', 'Kilpatrick', 'Imboden', 'Jul 6', 'Jul 7', 'Boonsborough'],
    probes=[pr('Williamsport and the date', ['williamsport'], ['buford|kilpatrick|imboden|attack|engaged|fight', r'july|6th|7th|sixth|seventh|\b[67]\b']),
            pr('Buford\'s and Kilpatrick\'s reports', ['williamsport'], ['attack|engaged|drove|arrived|skirmish'], scope=(OR,)),
            pr('Imboden\'s account of Williamsport', ['imboden'], ['williamsport', 'attack|fight|defend|engaged'], scope=(OR, BK)),
            pr('Weeklies and national dailies of July 1863', ['williamsport'], ['attack|fight|engaged|cavalry'], scope=(NW,))],
    hints=['A division moving on "July 7" to Boonsborough (OR) may be the source of the later date; read what each source dates.'],
    acquire=['KIDD-1908', 'BATES-1875'])

P['C-037'] = dict(event_date='1863-07-02', kinds=['date', 'date_window'], focus='when Barksdale died (Jul 2; Jul 3)',
    terms=['Barksdale', 'mortally', 'died', 'wounded', 'Hospital', 'Mississippi', 'McLaws'],
    probes=[pr('Barksdale killed or wounded and dead', ['barksdale'], ['killed|mortally|wounded|died|death|fell', 'july|2d|3d|second|third|night|evening|hospital']),
            pr('McLaws and Humphreys on the fall of Barksdale', ['barksdale'], ['fell|killed|wounded|mortally|captured|hospital|died'], scope=(OR,)),
            pr('Barksdale\'s brigade after the fight (Mississippi regiments)', ['barksdale'], ['died|death|buried|prisoner|hospital|field'], scope=(BK, NW)),
            pr('Park Service pages on Barksdale', ['barksdale'], ['died|death|killed|mortally|hospital'], scope=(NP,))],
    hints=['"Killed" in a report of the day may be a figure of speech; find the first source that gives the day of death and the place.'],
    acquire=['CMH-1899-V7', 'HOOD-1880'])

P['C-038'] = dict(event_date='1863-07-04', kinds=['count', 'count_range'], focus='wounded at the Spangler farm hospital (1,000; 1,500; 1,800; 1,900; 2,000)',
    terms=['Spangler', 'hospital', 'wounded', 'XI Corps', 'Eleventh Corps', 'Baltimore Pike', 'Rock Creek'],
    probes=[pr('Spangler farm and the wounded', ['spangler'], ['wounded|hospital|surgeons', r'\b\d[\d,]{2,5}\b']),
            pr('Eleventh Corps hospital on the Baltimore pike', ['eleventh corps', 'xi corps'], ['hospital', 'wounded', r'\b\d[\d,]{2,5}\b'], scope=(OR, BK, NP, MD)),
            pr('Counts of the wounded at one hospital in the surgeons\' reports', ['hospital'], ['spangler|baltimore pike|rock creek', r'\b\d[\d,]{2,5}\b'], scope=(OR, BK, NP, MD)),
            pr('Weeklies and the Sanitary Commission on the Spangler hospital', ['spangler'], ['wounded|hospital|surgeons'], scope=(NW, MD))],
    hints=['A hospital held different numbers on different days: date every figure and say which corps\' wounded it counts.'],
    acquire=['BATES-1875'])

P['C-039'] = dict(event_date='1863-07-01', kinds=['time', 'time_window'], focus='when Hancock reached the field on Jul 1 (about 15:00; before 16:00; 16:00; 16:30)',
    terms=['Hancock', 'Cemetery Hill', 'Howard', 'Buford', 'Warren', 'Meade', 'Wadsworth'],
    probes=[pr('Hancock arrives on Cemetery Hill', ['hancock'], [r'(arrived|reached|came upon|rode up|took command|assumed command)', 'CLOCK|afternoon']),
            pr('Howard\'s and Doubleday\'s reports of Hancock', ['hancock'], ['howard|doubleday|command|arrived|came|assumed', 'CLOCK|afternoon|4 p|four|half past'], scope=(OR, BK)),
            pr('Meade\'s dispatch sending Hancock', ['hancock'], ['meade|direct|instructed|ordered|sent|proceed', 'CLOCK|1\\.?30|one|afternoon'], scope=(OR,)),
            pr('Buford and Warren and the first sight of Hancock', ['buford', 'warren', 'wadsworth'], ['hancock', 'CLOCK|afternoon'], scope=(OR, BK))],
    hints=['The hour of Hancock\'s arrival and the hour he took command (and Howard\'s claim of seniority) are different statements.'],
    acquire=['HOWARD-1907', 'DOUBLEDAY-1882', 'JCCW-1865', 'WALKER-1886'])

P['C-040'] = dict(event_date='1863-07-01', kinds=['time', 'time_window'], focus='when Reynolds was killed (10:15, 10:30, 10:40-10:50; first pass adds 11:15, 11:30)',
    terms=['Reynolds', 'killed', 'fell', 'shot', 'McPherson', 'Wadsworth', 'Meredith', 'Doubleday'],
    probes=[pr('Reynolds is shot', ['reynolds'], ['killed|fell|shot|death|dead|struck', 'CLOCK|forenoon|morning']),
            pr('Doubleday and Wadsworth on the death of the corps commander', ['reynolds'], ['killed|fell|shot|death|dead', 'doubleday|wadsworth|meredith|cutler|command'], scope=(OR, BK)),
            pr('Howard\'s report: the news reached him', ['reynolds'], ['news|informed|received|word|announcement|killed', 'CLOCK|afternoon|noon|11|eleven'], scope=(OR, BK)),
            pr('Buford, Wainwright, Biddle and Rowley', ['reynolds'], ['killed|fell|shot|death', 'CLOCK|morning|forenoon'], scope=(OR,)),
            pr('Weeklies of July 1863', ['reynolds'], ['killed|fell|shot', 'CLOCK|morning|forenoon|ten|eleven'], scope=(NW,))],
    hints=['Time of the wound, time of death and time the news arrived are three different statements.', 'The PDF 10:40-10:50 is a range: find its source.'],
    acquire=['DOUBLEDAY-1882', 'HOWARD-1907', 'BATES-1875'])

P['C-041'] = dict(event_date='1863-07-01', kinds=['time', 'time_window'], focus='when Rodes\'s attack began (13:30, 14:00, 14:30)',
    terms=['Rodes', 'Oak Hill', 'Iverson', 'Daniel', 'Ramseur', 'Doles', 'O\'Neal', 'Carter'],
    probes=[pr('Rodes\'s report: the artillery and the advance', ['rodes'], ['advance|attack|opened|artillery|moved|ordered|engaged', 'CLOCK|afternoon|noon']),
            pr('Brigade reports under Rodes', ['iverson', 'daniel', 'ramseur', 'doles', 'o\'neal', 'carter'], ['advance|attack|moved|ordered|engaged|opened', 'CLOCK|afternoon|noon'], scope=(OR,)),
            pr('Union reports of Ewell\'s advance from the north', ['ewell', 'rodes'], ['advance|attack|appeared|moved|opened|engaged', 'CLOCK|afternoon|noon'], scope=(OR, BK)),
            pr('Doubleday, Robinson, Baxter and Paul on Oak Hill', ['oak hill', 'oak ridge'], ['attack|advance|appeared|opened|engaged', 'CLOCK|afternoon|noon'], scope=(OR, NP))],
    hints=['Artillery, first contact and the infantry assault are three moments; the Confederate clock runs about 20 minutes apart from the Union one (PDF B.2.1).'],
    acquire=['DOUBLEDAY-1882', 'EARLY-1912', 'BATES-1875'])

P['C-042'] = dict(event_date='1863-07-01', kinds=['time'], focus='when Lee reached the field on Jul 1 (13:30; 14:30)',
    terms=['Lee', 'Seminary Ridge', 'Heth', 'Hill', 'Cashtown', 'Herr Ridge', 'Marshall'],
    probes=[pr('Lee arrives on the field', ['general lee', 'lee'], [r'(arrived|reached|came upon|rode up|joined).{0,100}(field|gettysburg|ridge|front)', 'CLOCK|afternoon|noon']),
            pr('Heth and A. P. Hill on the arrival of Lee', ['lee'], ['heth|hill|arrived|joined|present|reached', 'CLOCK|afternoon|noon'], scope=(OR, BK)),
            pr('Staff memoirs of Lee on the road from Cashtown', ['cashtown'], ['lee|general lee', 'CLOCK|afternoon|noon|morning|arrived'], scope=(BK,)),
            pr('Rodes, Early and Pender on the presence of Lee', ['lee'], ['present|arrived|joined|came|rode', 'CLOCK|afternoon'], scope=(OR,))],
    hints=['Union and Confederate clocks differ by about 20 minutes; the PDF keeps the two sources apart rather than averaging them (note C-042).'],
    acquire=['LONG-1886', 'TAYLOR-1877', 'ANNALS-1879'])

P['C-043'] = dict(event_date='1863-07-01', kinds=['time', 'time_window'], focus='when the Union retreat order was given on Jul 1 (15:45, 16:00, 16:30, 17:00)',
    terms=['retire', 'retreat', 'fall back', 'Howard', 'Doubleday', 'Wadsworth', 'Schurz', 'Cemetery Hill'],
    probes=[pr('Wadsworth on the order to retire', ['wadsworth'], ['retire|retreat|fall back|order|withdraw', 'CLOCK|afternoon|4']),
            pr('Howard\'s order to retire to Cemetery Hill', ['howard'], ['retire|retreat|fall back|order|withdraw|cemetery hill', 'CLOCK|afternoon|4']),
            pr('Doubleday, Robinson and Rowley on the order', ['doubleday', 'robinson', 'rowley', 'newton'], ['retire|retreat|fall back|withdraw|order', 'CLOCK|afternoon'], scope=(OR, BK)),
            pr('Schurz, Barlow, Devin and Buford on the retreat', ['schurz', 'barlow', 'devin', 'buford', 'schimmelfennig'], ['retire|retreat|fall back|withdraw|order', 'CLOCK|afternoon'], scope=(OR,))],
    hints=['The order to the I Corps, to the XI Corps and to the cavalry are different orders; the PDF hours may belong to different ones.'],
    acquire=['DOUBLEDAY-1882', 'HOWARD-1907', 'JCCW-1865'])

P['C-044'] = dict(event_date='1863-07-20', kinds=['date'], focus='when Camp Letterman opened (Jul 20; Jul 22)',
    terms=['Camp Letterman', 'general hospital', 'Letterman', 'Janes', 'York Pike', 'Wheatfield Road', 'Gettysburg'],
    probes=[pr('Camp Letterman opened or established', ['camp letterman', 'general hospital'], ['opened|established|organized|commenced|began|first|removed', 'july|20th|22d|22nd|20|22']),
            pr('Surgeon Janes and the general hospital', ['janes'], ['general hospital|camp|tents|opened|established', 'july|20|22'], scope=(OR, BK, MD)),
            pr('Letterman on the evacuation and the general hospital', ['letterman'], ['general hospital|camp|gettysburg|removed', 'july|20|22'], scope=(OR, BK, MD)),
            pr('Weeklies of July and August 1863 on the camp hospital', ['camp hospital', 'general hospital', 'tents'], ['gettysburg|wounded|opened|established', 'july|20|22'], scope=(NW, MD)),
            pr('Park Service pages on the camp', ['camp letterman', 'general hospital'], ['july|20|22|opened|established'], scope=(NP,))],
    hints=['Opening for patients, completion of the tents and the first transfer of men are different days.'],
    acquire=['BATES-1875'])

P['C-045'] = dict(event_date='1863-07-02', kinds=['quantity', 'category'], focus='the wind on Jul 2-3 (12 mph; 2 mph)',
    terms=['wind', 'breeze', 'weather', 'thermometer', 'Jacobs', 'sultry', 'Jul 2', 'Jul 3'],
    probes=[pr('Jacobs\'s notes on the weather', ['wind', 'breeze'], ['july|battle|gettysburg|thermometer|weather', 'miles|light|gentle|fresh|calm|west|south|east|north'], scope=(BK, NW)),
            pr('Wind in Official Records reports of Jul 2-3', ['wind', 'breeze'], ['smoke|dust|sound|fire|artillery|heard', 'light|gentle|fresh|calm|west|south|east|north'], scope=(OR,)),
            pr('The weather of the three days in the weeklies', ['weather', 'thermometer'], ['july|battle|gettysburg', 'wind|breeze|sultry|hot|warm'], scope=(NW,)),
            pr('Meteorological notes in the Park Service studies', ['wind'], ['july|battle|1863', 'miles|light|gentle|mph'], scope=(NP,))],
    hints=['Look for a printed observation (a reading by an instrument at a place), not an impression: record who observed, where and when.'],
    acquire=['SMITHSONIAN-1863'])

P['C-046'] = dict(event_date='1863-07-03', kinds=['count_range'], focus='the dead of the battle (several totals in the notes)',
    terms=['killed', 'dead', 'casualties', 'Guild', 'Letterman', 'burial', 'Union', 'Confederate'],
    probes=[pr('Killed in the summary returns of the Army of the Potomac', ['killed'], ['aggregate|total|recapitulation|casualties', r'\b\d[\d,]{3,6}\b'], scope=(OR,)),
            pr('Guild\'s return of the Confederate killed', ['guild'], ['killed|wounded|missing|medical director', r'\b\d[\d,]{3,6}\b'], scope=(OR, BK)),
            pr('The dead buried: Union and Confederate', ['buried'], ['gettysburg|field|confederate|union|soldiers', r'\b\d[\d,]{3,6}\b'], scope=(BK, NP, MD)),
            pr('Historians\' totals', ['killed'], ['battle of gettysburg|gettysburg', 'total|aggregate|casualties', r'\b\d[\d,]{3,6}\b'], scope=(BK, NP))],
    hints=['Killed in action, died of wounds and buried are different counts; the default is a range with its basis declared (DEC-003, DEC-008).'],
    acquire=['LIVERMORE-1900', 'PHISTERER-1883', 'BATES-1875', 'PARIS-1888-V3'])

P['C-047'] = dict(event_date='1863-07-01', kinds=['count_range'], focus='strengths and casualty totals of the armies (several totals in the notes)',
    terms=['present for duty', 'aggregate', 'strength', 'casualties', 'Army of the Potomac', 'Army of Northern Virginia', 'Livermore', 'Fox'],
    probes=[pr('Returns of the Army of the Potomac, June 30', ['present for duty', 'aggregate'], ['army of the potomac|corps', r'\b\d{2,3},\d{3}\b'], scope=(OR,)),
            pr('Lee\'s strength and casualties', ['lee'], ['strength|present|effective|casualties|losses', r'\b\d{2,3},\d{3}\b'], scope=(OR, BK)),
            pr('Casualty totals of the two armies', ['casualties', 'losses'], ['army of the potomac|army of northern virginia|union|confederate', r'\b\d{2,3},\d{3}\b|\b\d{2}\.\d{3}\b'], scope=(OR, BK, NP)),
            pr('Regimental strengths and losses (Fox, state volumes)', ['aggregate', 'engaged'], ['losses|killed|wounded|missing', r'\b\d{3,4}\b'], scope=(BK,))],
    hints=['Present for duty, engaged and effective are different counts; the soldiers instanced follow the printed unit strength (DEC-008).'],
    acquire=['LIVERMORE-1900', 'PHISTERER-1883', 'BATES-1875', 'PARIS-1888-V3'])

assert sorted(P) == ['C-%03d' % i for i in range(1, 48)], sorted(set(['C-%03d' % i for i in range(1, 48)]) - set(P))
