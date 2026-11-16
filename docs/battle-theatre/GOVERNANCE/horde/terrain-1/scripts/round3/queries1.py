"""Round-3 queries for the open sub-claims of terrain-1 (G-01 to G-08). Patterns are applied to whitespace-collapsed text, case-insensitive."""
Q = []
def add(id, pat, lit=(), note='', **kw):
    d = dict(id=id, pat=pat, lit=list(lit), note=note); d.update(kw); Q.append(d)

# G-01 Calef
add('g01-hollow', r'(Calef|Gamble|Buford|Roder|Pergel|Newman)[^.]{0,500}\bhollow\b|\bhollow\b[^.]{0,500}(Calef|Gamble|Roder|Pergel)', lit=['hollow'], note='G-01.c night of 30 Jun in a hollow')
add('g01-night', r'Calef[^.]{0,400}(night|bivouac|encamp|parked)[^.]{0,200}(June|30|Seminary|Cashtown|Chambersburg)', lit=['calef'], note='G-01 where Calef spent the night of 30 Jun')
add('g01-relief', r'Hall[\'’]?s\s+(battery|Second Maine|2nd Maine)[^.]{0,300}(10|ten)[.: ]?(\d\d)?\s*(a\.?\s*m|o.clock)', lit=['hall'], note='G-01.i relief clock')
add('g01-first', r'first\s+(gun|shot|shell)[^.]{0,200}(Calef|Roder|Buford|Union)', lit=['calef'], note='G-01.g first Union gun witnesses')

# G-02 I Corps batteries
add('g02-chambst', r'(batter(y|ies)|guns|artillery)[^.]{0,250}Chambersburg\s+(street|st\.)|Chambersburg\s+(street|st\.)[^.]{0,250}(batter(y|ies)|artillery|guns)', lit=['chambersburg'], note='G-02.e withdrawal route')
add('g02-rail', r'(artillery|batter(y|ies)|guns|pieces)[^.]{0,260}(behind|in rear of|covered by|protected by)[^.]{0,100}(rail|fence)[^.]{0,80}(breastwork|barricade|works?)', lit=['rail'], note='G-02.b guns behind the rail breastwork')
add('g02-rail2', r'(rail|fence)[^.]{0,60}(breastwork|barricade)s?[^.]{0,200}(artillery|batter(y|ies)|guns|pieces)', lit=['rail'], groups=('nps', 'ws9', 'extra'), note='G-02.b the other way round')
add('g02-wain', r'Wainwright[^.]{0,300}(sixteen|twelve|twenty|22|20)\s+guns', lit=['wainwright'], note='G-02.a count')

# G-03 East Cemetery Hill
add('g03-dim', r'lunettes?[^.]{0,300}\b(\d+|two|three|four|five|six|seven|eight)\s*(feet|foot|ft\.?|inches|yards?)', lit=['lunette'], note='G-03.f lunette dimensions')
add('g03-dim2', r'(earthworks?|epaulements?|redans?)[^.]{0,200}(East )?Cemetery Hill[^.]{0,300}\b(\d+|two|three|four|five|six)\s*(feet|foot|ft\.?|inches)', lit=['cemetery hill'], note='G-03.f works dimension')
add('g03-hays', r'(abatis|rifle[- ]pits?|rifle[- ]trenches)[^.]{0,300}(Hays|Harris|Louisiana|Hoke|Early)|(Hays|Harris)[^.]{0,300}(abatis|rifle[- ]pits?)', lit=['abatis'], note='G-03 abatis and rifle pits Hays met')
add('g03-depress', r'(depress|depression)[^.]{0,200}(guns|batter|pieces)[^.]{0,200}(Cemetery Hill|slope|canister)|(guns|batter)[^.]{0,200}(Cemetery Hill)[^.]{0,200}(depress)', lit=['depress', 'cemetery hill'], note='G-03.i depression and canister')
add('g03-wied', r'Wiedrich[^.]{0,250}\b(six|four|6|4|five|5)\s+(guns|pieces|3-inch|three-inch)', lit=['wiedrich'], note='G-03.a Wiedrich gun count')
add('g03-lun', r'lunettes?[^.]{0,300}(East Cemetery Hill|Stevens|Cemetery Hill)|(East Cemetery Hill|Stevens\W?s Knoll)[^.]{0,300}lunettes?', lit=['lunette'], groups=('nps',), note='G-03 NPS statements on the lunettes')

# G-04 Benner's Hill
add('g04-37', r'\b(thirty[- ]seven|37)\s+(guns|pieces|cannon|batteries)', lit=['37'], note='G-04.h the PDF 37 Union guns', per_file=3)
add('g04-37b', r'(thirty[- ]seven)\s+(guns|pieces|cannon)', lit=['thirty'], note='G-04.h spelled', per_file=3)
add('g04-count', r'(Raine|Dement|Carpenter|Chesapeake|Alleghany|Lee)[\'’]?s?\s+(battery|artillery)?[^.]{0,200}\b(four|six|two|three|\d)\s+(guns|pieces|Napoleons?|rifles?|howitzers?|Parrotts?)', lit=['latimer'], note='G-04 per-battery gun counts', per_file=6)
add('g04-graham', r'Graham[\'’]?s\s+battery[^.]{0,250}(Dance|loan|lent|detach|attach|reinforc)|(Dance|loan|lent)[^.]{0,200}Graham[\'’]?s\s+battery', lit=['graham'], note='G-04.a Graham loaned from Dance')
add('g04-benner', r'Benner[\'’]?s\s+Hill[^.]{0,300}(guns|batter(y|ies)|artillery)[^.]{0,200}\b(\d+|twenty|sixteen|ten|twelve|fifteen)\b', lit=["benner"], note='G-04.b Benner Hill gun counts', per_file=4)

# G-05 Smith's battery
add('g05-shift', r'Smith[\'’]?s\s+(battery|section)[^.]{0,350}(shifted|changed\s+position|moved\s+(to\s+the\s+)?right|to the right)', lit=['smith'], note='G-05.g section shift', per_file=4)
add('g05-six', r'(Smith|Fourth New York|4th New York)[^.]{0,300}\b(6|six)\s*(p\.?\s*m\.?|o.clock)', lit=['smith'], note='G-05.g 6 pm', per_file=4)
add('g05-arrive', r'(Smith|Fourth New York)[\'’]?s?\s+(battery)?[^.]{0,250}(arrived|reached|reported)[^.]{0,120}(nine|9|morning)', lit=['smith'], note='G-05 arrival at 09:00', per_file=4)

# G-06 Hazlett
add('g06-fire', r'Hazlett[^.]{0,500}\b(5|six|6|four|4)[.:]?\s*(\d\d)?\s*(p\.?\s*m|o.clock)', lit=['hazlett'], note='G-06.c Hazlett first fire clock', per_file=5)
add('g06-hand', r'Hazlett[^.]{0,500}(by hand|drag|hauled|lifted|handspike|prolonge)', lit=['hazlett'], note='G-06.e hauling', per_file=5)
add('g06-emplace', r'(Hazlett|Battery D)[^.]{0,400}(epaulement|earthwork|breastwork|gun[- ]pit|embrasure|intrench)', lit=['hazlett'], note='G-06.f prepared emplacement', per_file=4)

# G-07 Hart
add('g07-wfroad', r'wheat[- ]?field\s+road', lit=['wheat'], note='G-07 Wheatfield Road', per_file=6, maxn=60)
add('g07-knox', r'Knox[^.]{0,300}(by hand|drag|haul|pulled|drew|a gun|a piece)|(by hand)[^.]{0,200}Knox', lit=['knox'], note='G-07.g Knox pulled a gun off by hand', per_file=4)
add('g07-hartcan', r'Hart[\'’]?s\s+(battery|Fifteenth)[^.]{0,500}canister', lit=['hart'], note='G-07.d Hart canister clock', per_file=4)

# G-08 Alexander's battalion
add('g08-count', r'(Parker|Rhett|Moody|Gilbert|Taylor|Jordan|Woolfolk|Eubank)[\'’]?s?\s+(battery|guns|howitzers)?[^.]{0,220}\b(four|six|two|three|\d)\s+(guns|pieces|Napoleons?|rifles?|howitzers?|Parrotts?|Blakely)', lit=['alexander'], note='G-08.d per-battery gun counts', per_file=6)
add('g08-36', r'\b(thirty[- ]six|36)\s+(guns|pieces|cannon)', lit=['peach orchard'], note='G-08 36 guns', per_file=4)

KEYS = {'g01-hollow': ['hollow'], 'g01-night': ['calef'], 'g01-relief': ['hall'], 'g01-first': ['first gun', 'first shot', 'first shell'], 'g02-chambst': ['chambersburg st'], 'g02-rail': ['rail', 'fence'], 'g02-rail2': ['breastwork', 'barricade'], 'g02-wain': ['wainwright'], 'g03-dim': ['lunette'], 'g03-dim2': ['cemetery hill'], 'g03-hays': ['abatis', 'rifle-pit', 'rifle pit', 'rifle-trench', 'rifle trench'], 'g03-depress': ['depress'], 'g03-wied': ['wiedrich'], 'g03-lun': ['lunette'], 'g04-37': ['37 guns', '37 pieces', '37 cannon', '37 batteries', 'thirty-seven', 'thirty seven'], 'g04-37b': ['thirty-seven', 'thirty seven'], 'g04-count': ['raine', 'dement', 'carpenter', 'chesapeake', 'alleghany'], 'g04-graham': ['graham'], 'g04-benner': ['benner'], 'g05-shift': ['smith'], 'g05-six': ['smith', 'fourth new york', '4th new york'], 'g05-arrive': ['smith', 'fourth new york'], 'g06-fire': ['hazlett'], 'g06-hand': ['hazlett'], 'g06-emplace': ['hazlett', 'battery d'], 'g07-wfroad': ['wheatfield road', 'wheat field road', 'wheat-field road', 'wheat-field road'], 'g07-knox': ['knox'], 'g07-hartcan': ['hart'], 'g08-count': ['parker', 'rhett', 'moody', 'gilbert', 'taylor', 'jordan', 'woolfolk', 'eubank'], 'g08-36': ['36 guns', 'thirty-six guns', 'thirty six guns', '36 pieces', '36 cannon', 'thirty-six pieces', 'thirty-six cannon'], 'g09-brick': ['brick'], 'g09-brick2': ['brick'], 'g10-zieg': ['ziegler'], 'g10-hour': ['bigelow', 'ninth massachusetts', '9th massachusetts'], 'g10-21st': ['mississippi'], 'g10-trostlewall': ['bigelow', 'ninth massachusetts'], 'g11-623': ['to 23 guns', 'to twenty-three guns', 'and 23 guns', 'and twenty-three guns', 'six and twenty', '6 and 23'], 'g11-3jul': ['mcgilvery'], 'g11-slight': ['slight earthwork', 'small earthwork', 'slight breastwork', 'small breastwork', 'slight intrenchment', 'small intrenchment', 'slight epaulement', 'small epaulement'], 'g12-double': ['double canister', 'double-canister', 'double shotted', 'double-shotted', 'double charge'], 'g12-works': ['cushing'], 'g12-100yd': ['cushing'], 'g12-disabled': ['cushing'], 'g13-34': ['34 guns', '34 pieces', '34 cannon', '34 batteries', 'thirty-four guns', 'thirty-four pieces', 'thirty-four cannon', 'thirty four guns', 'thirty four pieces', 'thirty four cannon'], 'g13-120': ['120 guns', '120 pieces', '120 cannon', 'one hundred and twenty guns', 'one hundred and twenty pieces', 'one hundred and twenty cannon'], 'g13-counter': ['countermand'], 'g13-hancockhunt': ['hancock', 'hunt'], 'g14-179': ['179', 'seventy-nine'], 'g14-2mi': ['two miles', '2 miles'], 'g14-poague': ['poague'], 'g14-reilly': ['reilly'], 'g15-carter': ['carter'], 'g15-batt': ['carter'], 'g16-signal': ['whitworth'], 'g16-hardaway': ['hardaway', 'hurt'], 'g16-3in': ['whitworth'], 'g16-oakhill': ['whitworth']}
for d in Q:
    d['key'] = KEYS[d['id']]
