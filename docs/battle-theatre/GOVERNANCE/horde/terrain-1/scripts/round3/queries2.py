"""Round-3 queries for the open sub-claims of terrain-1 (G-09 to G-16 and general)."""
Q = []
def add(id, pat, lit=(), note='', **kw):
    d = dict(id=id, pat=pat, lit=list(lit), note=note); d.update(kw); Q.append(d)

# G-09 Cabell
add('g09-brick', r'(small\s+)?brick\s+(house|building|dwelling)', lit=['brick'], groups=('or27',), note='G-09.h small brick house (OR)', per_file=40, maxn=80, ctx=330)
add('g09-brick2', r'(Cabell|Kershaw|Barksdale|Alexander|Pendleton|Longstreet)[^.]{0,500}brick\s+(house|building|dwelling)|brick\s+(house|building|dwelling)[^.]{0,500}(Cabell|Cabell[\'’]?s\s+battalion)', lit=['brick'], groups=('ws9', 'extra', 'nps'), note='G-09.h small brick house (books)', per_file=4)

# G-10 Bigelow
add('g10-zieg', r'Ziegler[\'’]?s?\s+Grove[^.]{0,400}(Milton|Turnbull|Bigelow|Battery K|Third Regulars?|Fifth|Whitworth)|(Milton|Turnbull)[^.]{0,400}Ziegler', lit=['ziegler'], note='G-10.h Ziegler Grove place name for Milton', per_file=4)
add('g10-hour', r'(Bigelow|Ninth Massachusetts|9th Massachusetts)[^.]{0,500}\b(6|six|5|five|7|seven)[.:]?\s*(\d\d)?\s*(p\.?\s*m\.?|o.clock)', lit=['bigelow'], note='G-10.f overrun hour', per_file=5)
add('g10-21st', r'(Twenty-first|21st)\s+Mississippi[^.]{0,400}(Bigelow|battery|guns)[^.]{0,300}\b(5|six|6|seven|7)[.:]?\s*(\d\d)?\s*(p\.?\s*m|o.clock)|(Bigelow|Trostle)[^.]{0,400}(Twenty-first|21st)\s+Mississippi[^.]{0,300}(p\.?\s*m|o.clock)', lit=['mississippi', 'bigelow'], note='G-10.f 21st Mississippi hour', per_file=4)
add('g10-trostlewall', r'(Bigelow|Ninth Massachusetts)[^.]{0,300}(wall|fence)[^.]{0,200}(Trostle|house|lane)', lit=['bigelow', 'trostle'], note='G-10 Trostle wall', per_file=3)

# G-11 McGilvery
add('g11-623', r'(six|6)\s+to\s+(twenty-three|23)\s+guns|(from|between)\s+(six|6)\s+(and|to)\s+(twenty-three|23)', lit=['guns'], note='G-11 6 to 23 guns', per_file=4)
add('g11-3jul', r'McGilvery[^.]{0,600}(earthwork|breastwork|epaulement|intrench|entrench|slight\s+work|rifle[- ]pit)', lit=['mcgilvery'], note='G-11 McGilvery 3 Jul works', per_file=4)
add('g11-slight', r'(slight|small)\s+(earthwork|breastwork|intrenchment|epaulement)s?[^.]{0,200}(guns|batter|artillery|Plum\s+Run|McGilvery)', lit=['slight'], note='G-11 slight works near guns', per_file=3)

# G-12 Cushing
add('g12-double', r'double[- ]?(shotted\s+)?canister', lit=['canister'], note='G-12.i double canister', per_file=5, maxn=60)
add('g12-works', r'Cushing[^.]{0,500}(earthwork|epaulement|gun[- ]pit|breastwork|intrench|entrench|embrasure)|(earthwork|epaulement|gun[- ]pit|breastwork|embrasure)[^.]{0,300}Cushing', lit=['cushing'], note='G-12.h works at Cushing guns', per_file=4)
add('g12-100yd', r'Cushing[^.]{0,600}(100|hundred)\s*(yards|yds)|(100|hundred)\s*(yards|yds)[^.]{0,200}Cushing', lit=['cushing'], note='G-12.i 100 yd', per_file=4)
add('g12-disabled', r'Cushing[\'’]?s?\s+(battery)?[^.]{0,300}(four\s+of|disabled|dismounted|knocked\s+out|silenced)[^.]{0,100}(guns|pieces)', lit=['cushing'], note='G-12.e four of six', per_file=4)

# G-13 3 Jul Union line
add('g13-34', r'\b(thirty[- ]four|34)\s+(guns|pieces|cannon|batteries)', lit=['cannon'], note='G-13.f 34 disabled', per_file=3)
add('g13-120', r'\b(one hundred and twenty|120)\s+(guns|pieces|cannon)', lit=['cannon'], note='G-13.a 120 guns', per_file=3)
add('g13-counter', r'countermand[^.]{0,250}(Hancock|Hunt|fire|firing)|(Hancock|Hunt)[^.]{0,250}countermand', lit=['countermand'], note='G-13.d countermand', per_file=4)
add('g13-hancockhunt', r'Hancock[^.]{0,300}(ordered|directed)[^.]{0,200}(open|fire)[^.]{0,300}Hunt|Hunt[^.]{0,300}(cease|stop|slacken)[^.]{0,200}(fire|firing)[^.]{0,200}Hancock', lit=['hancock', 'hunt'], note='G-13.d Hancock-Hunt dispute witnesses', per_file=3)

# G-14 Confederate 3 Jul line
add('g14-179', r'\b(179|one hundred and seventy[- ]nine)\s+(guns|pieces|cannon)', lit=['179'], note='G-14 179 guns', per_file=4)
add('g14-2mi', r'(two|2)\s+miles[^.]{0,250}(guns|batter(y|ies)|artillery)[^.]{0,100}(line|Peach|Emmitsburg)|(guns|batter(y|ies)|artillery)[^.]{0,250}(two|2)\s+miles', lit=['two miles'], note='G-14.c two miles', per_file=4)
add('g14-poague', r'Poague[^.]{0,350}(lunette|earthwork|breastwork|intrench|rifle[- ]pit)|(lunette)[^.]{0,200}Poague', lit=['poague'], note='G-14.f Poague lunettes', per_file=4)
add('g14-reilly', r'Reilly[\'’]?s?[^.]{0,300}(lunette|earthwork|stone|breastwork)|(lunette)[^.]{0,200}Reilly', lit=['reilly'], note='G-14.f Reilly lunettes', per_file=4)

# G-15 Carter
add('g15-carter', r'Carter[\'’]?s\s+(battalion|rifles)[^.]{0,400}(Oak\s+Hill|railroad\s+cut|Cemetery\s+Hill|Gettysburg\s+and\s+Hagerstown)', lit=['carter'], note='G-15 Carter battalion rifles', per_file=4)
add('g15-batt', r'(Page|Reese|Fry|Carter|Graham)[\'’]?s?\s+battery[^.]{0,300}\b(rifles?|guns|Parrotts?)[^.]{0,200}(Oak\s+Hill|cut)', lit=['carter'], note='G-15 which batteries', per_file=4)

# G-16 Whitworths
add('g16-signal', r'Whitworth[^.]{0,350}\bsignal|\bsignal[^.]{0,350}Whitworth', lit=['whitworth'], note='G-16.f Whitworth signal', per_file=4)
add('g16-hardaway', r'(Hardaway|Hurt)[\'’]?s?[^.]{0,350}(tablet|marker|Whitworth|three-inch|3-inch)', lit=['whitworth'], note='G-16.a Hardaway Hurt Whitworth', per_file=5)
add('g16-3in', r'Whitworth[^.]{0,150}(two|2)\s+(three|3)[- ]inch|(two|2)\s+(three|3)[- ]inch[^.]{0,150}Whitworth', lit=['whitworth'], note='G-16 two 3-inch with the Whitworths', per_file=4)
add('g16-oakhill', r'Oak\s+(Hill|Ridge)[^.]{0,300}Whitworth|Whitworth[^.]{0,300}Oak\s+(Hill|Ridge)', lit=['whitworth'], note='G-16 Oak Hill Whitworths', per_file=4)

KEYS = {'g01-hollow': ['hollow'], 'g01-night': ['calef'], 'g01-relief': ['hall'], 'g01-first': ['first gun', 'first shot', 'first shell'], 'g02-chambst': ['chambersburg st'], 'g02-rail': ['rail', 'fence'], 'g02-rail2': ['breastwork', 'barricade'], 'g02-wain': ['wainwright'], 'g03-dim': ['lunette'], 'g03-dim2': ['cemetery hill'], 'g03-hays': ['abatis', 'rifle-pit', 'rifle pit', 'rifle-trench', 'rifle trench'], 'g03-depress': ['depress'], 'g03-wied': ['wiedrich'], 'g03-lun': ['lunette'], 'g04-37': ['37 guns', '37 pieces', '37 cannon', '37 batteries', 'thirty-seven', 'thirty seven'], 'g04-37b': ['thirty-seven', 'thirty seven'], 'g04-count': ['raine', 'dement', 'carpenter', 'chesapeake', 'alleghany'], 'g04-graham': ['graham'], 'g04-benner': ['benner'], 'g05-shift': ['smith'], 'g05-six': ['smith', 'fourth new york', '4th new york'], 'g05-arrive': ['smith', 'fourth new york'], 'g06-fire': ['hazlett'], 'g06-hand': ['hazlett'], 'g06-emplace': ['hazlett', 'battery d'], 'g07-wfroad': ['wheatfield road', 'wheat field road', 'wheat-field road', 'wheat-field road'], 'g07-knox': ['knox'], 'g07-hartcan': ['hart'], 'g08-count': ['parker', 'rhett', 'moody', 'gilbert', 'taylor', 'jordan', 'woolfolk', 'eubank'], 'g08-36': ['36 guns', 'thirty-six guns', 'thirty six guns', '36 pieces', '36 cannon', 'thirty-six pieces', 'thirty-six cannon'], 'g09-brick': ['brick'], 'g09-brick2': ['brick'], 'g10-zieg': ['ziegler'], 'g10-hour': ['bigelow', 'ninth massachusetts', '9th massachusetts'], 'g10-21st': ['mississippi'], 'g10-trostlewall': ['bigelow', 'ninth massachusetts'], 'g11-623': ['to 23 guns', 'to twenty-three guns', 'and 23 guns', 'and twenty-three guns', 'six and twenty', '6 and 23'], 'g11-3jul': ['mcgilvery'], 'g11-slight': ['slight earthwork', 'small earthwork', 'slight breastwork', 'small breastwork', 'slight intrenchment', 'small intrenchment', 'slight epaulement', 'small epaulement'], 'g12-double': ['double canister', 'double-canister', 'double shotted', 'double-shotted', 'double charge'], 'g12-works': ['cushing'], 'g12-100yd': ['cushing'], 'g12-disabled': ['cushing'], 'g13-34': ['34 guns', '34 pieces', '34 cannon', '34 batteries', 'thirty-four guns', 'thirty-four pieces', 'thirty-four cannon', 'thirty four guns', 'thirty four pieces', 'thirty four cannon'], 'g13-120': ['120 guns', '120 pieces', '120 cannon', 'one hundred and twenty guns', 'one hundred and twenty pieces', 'one hundred and twenty cannon'], 'g13-counter': ['countermand'], 'g13-hancockhunt': ['hancock', 'hunt'], 'g14-179': ['179', 'seventy-nine'], 'g14-2mi': ['two miles', '2 miles'], 'g14-poague': ['poague'], 'g14-reilly': ['reilly'], 'g15-carter': ['carter'], 'g15-batt': ['carter'], 'g16-signal': ['whitworth'], 'g16-hardaway': ['hardaway', 'hurt'], 'g16-3in': ['whitworth'], 'g16-oakhill': ['whitworth']}
for d in Q:
    d['key'] = KEYS[d['id']]
