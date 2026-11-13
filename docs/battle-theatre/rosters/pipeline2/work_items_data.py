"""Knowledge tables for rosters/work-items.json (read by make_work_items.py).  Nothing here is a roster row.

A source entry says where the names can be read.  Fields:
  id       short source id used as "s" in the segment header of a unit file and as the name of data2/sources/<id>.json
  ia       Internet Archive identifiers (primary copy first, then second copies that give an independent reading)
  role     roll (whole-war roll of the unit), index (alphabetical index with unit and company), commission (state Gettysburg
           commission volume: participants, casualty or inscription lists), burial (cemetery list), officers (officers only),
           compendium (a work that prints some rolls among narrative)
  layout   flow (one entry per line or paragraph: the hocr search text is parsed directly), cols (table whose columns are separate
           text blocks: word boxes of the item's djvu.xml are aligned to the search text offsets), index (flow, entries by surname)
  status   used-earlier   parsed by an earlier family run in rosters/data, layout and defects known
           verified-meta  this planning pass read the Internet Archive metadata (not access-restricted, flags and sizes recorded)
           lead           named by a search or a family README, content and coverage not inspected
           blocked        refused, bot-blocked or lending-restricted: recorded, not used, not worked around
  covers   what the source covers, as far as it is known (never more)
Rights are never typed here: the generator copies possible-copyright-status, the date and the access flag from the item metadata and
adds the standing note for imprints after 1930.
"""

FAM = {
    'union-me': 'NE', 'union-nh': 'NE', 'union-vt': 'NE', 'union-ma': 'NE',
    'union-ny': 'NY', 'union-pa': 'PA',
    'union-mi': 'MW', 'union-wi': 'MW', 'union-in': 'MW', 'union-il': 'MW', 'union-mn': 'MW',
    'union-oh': 'OJC', 'union-nj': 'OJC', 'union-ct': 'OJC',
    'union-ri': 'REG', 'union-md': 'REG', 'union-de': 'REG', 'union-wv': 'REG', 'union-us': 'REG',
    'conf-nc': 'C-NCLA', 'conf-la': 'C-NCLA',
    'conf-va': 'C-VASCGA', 'conf-sc': 'C-VASCGA', 'conf-ga': 'C-VASCGA',
    'conf-al': 'C-ALMSTX', 'conf-ms': 'C-ALMSTX', 'conf-tx': 'C-ALMSTX', 'conf-ar': 'C-ALMSTX', 'conf-fl': 'C-ALMSTX',
    'conf-tn': 'C-ALMSTX', 'conf-md': 'C-ALMSTX', 'conf-cs-staff': 'C-VASCGA',
}

# (army, OR state code) of each group; 'conf-md' is Confederate Maryland, 'union-md' Union Maryland
SCOPE = {
    'union-me': ('union', 'me'), 'union-nh': ('union', 'nh'), 'union-vt': ('union', 'vt'), 'union-ma': ('union', 'ma'),
    'union-ri': ('union', 'ri'), 'union-ct': ('union', 'ct'), 'union-ny': ('union', 'ny'), 'union-nj': ('union', 'nj'),
    'union-pa': ('union', 'pa'), 'union-de': ('union', 'de'), 'union-md': ('union', 'md'), 'union-wv': ('union', 'wv'),
    'union-oh': ('union', 'oh'), 'union-in': ('union', 'in'), 'union-il': ('union', 'il'), 'union-mi': ('union', 'mi'),
    'union-wi': ('union', 'wi'), 'union-mn': ('union', 'mn'), 'union-us': ('union', 'us'),
    'conf-va': ('confederate', 'va'), 'conf-nc': ('confederate', 'nc'), 'conf-sc': ('confederate', 'sc'),
    'conf-ga': ('confederate', 'ga'), 'conf-al': ('confederate', 'al'), 'conf-ms': ('confederate', 'ms'),
    'conf-la': ('confederate', 'la'), 'conf-fl': ('confederate', 'fl'), 'conf-tn': ('confederate', 'tn'),
    'conf-tx': ('confederate', 'tx'), 'conf-ar': ('confederate', 'ar'), 'conf-md': ('confederate', 'md'),
    'conf-cs-staff': ('confederate', 'cs'),
}

TITLES = {
    'union-me': 'Maine (Union)', 'union-nh': 'New Hampshire (Union)', 'union-vt': 'Vermont (Union)',
    'union-ma': 'Massachusetts (Union)', 'union-ri': 'Rhode Island (Union)', 'union-ct': 'Connecticut (Union)',
    'union-ny': 'New York (Union)', 'union-nj': 'New Jersey (Union)', 'union-pa': 'Pennsylvania (Union)',
    'union-de': 'Delaware (Union)', 'union-md': 'Maryland (Union)', 'union-wv': 'West Virginia (Union)',
    'union-oh': 'Ohio (Union)', 'union-in': 'Indiana (Union)', 'union-il': 'Illinois (Union)',
    'union-mi': 'Michigan (Union)', 'union-wi': 'Wisconsin (Union)', 'union-mn': 'Minnesota (Union)',
    'union-us': 'United States Regulars, Sharpshooters, Engineers, headquarters and staff (Union)',
    'conf-va': 'Virginia (Confederate)', 'conf-nc': 'North Carolina (Confederate)', 'conf-sc': 'South Carolina (Confederate)',
    'conf-ga': 'Georgia (Confederate)', 'conf-al': 'Alabama (Confederate)', 'conf-ms': 'Mississippi (Confederate)',
    'conf-la': 'Louisiana (Confederate)', 'conf-fl': 'Florida (Confederate)', 'conf-tn': 'Tennessee (Confederate)',
    'conf-tx': 'Texas (Confederate)', 'conf-ar': 'Arkansas (Confederate)', 'conf-md': 'Maryland (Confederate)',
    'conf-cs-staff': 'General and staff officers of the Army of Northern Virginia (Confederate)',
}

# wave: 1 = a whole-war roll source is known for most units; 2 = partial sources or a source to resolve first;
#       3 = the open record is thin: source search is most of the work and the gap is registered
WAVE = {
    'union-pa': 1, 'union-oh': 1, 'union-nj': 1, 'union-ct': 1, 'union-wi': 1, 'union-nh': 1, 'union-ma': 1, 'union-me': 1,
    'union-vt': 1, 'conf-nc': 1, 'conf-la': 1,
    'union-ny': 2, 'union-in': 2, 'union-il': 2, 'union-mn': 2, 'union-md': 2, 'union-ri': 2, 'union-wv': 2,
    'conf-fl': 2, 'conf-tx': 2, 'conf-ga': 2, 'conf-sc': 2, 'conf-md': 2,
    'union-mi': 3, 'union-de': 3, 'union-us': 3, 'conf-va': 3, 'conf-al': 3, 'conf-ms': 3, 'conf-tn': 3, 'conf-ar': 3,
    'conf-cs-staff': 3,
}


def S(id, ia, role, layout, status, covers, note=''):
    return {'id': id, 'ia': list(ia), 'role': role, 'layout': layout, 'status': status, 'covers': covers, 'note': note}


SOURCES = {
 'union-me': [
  S('ME-AGR-1863-APPD', ['annualreportofad1863main'], 'roll', 'cols', 'used-earlier',
    'Adjutant General report for 1863, Appendix D: company returns of 1 Dec 1863 with every change since 1 Nov 1862, for the 3rd to 7th, 16th, 17th, 19th and 20th Maine, 1st Maine Cavalry and 2nd Maine Battery',
    'surname-first for privates; columns shift per page (per-page scale needed); the remark is December status, so a Gettysburg wound survives only for men still absent'),
  S('ME-SUPP-1867', ['supplementtoannu00main'], 'index', 'index', 'verified-meta',
    'Supplement to the Annual Reports of the Adjutant General 1861-1866 (1867): cover title "Alphabetical index of Maine volunteers ... mustered into the service of the United States during the war of 1861"; the whole-war name source for every Maine unit, including the three units that the earlier run left empty (10th Maine Battalion, 5th and 6th Maine Batteries)',
    'catalogued by the earlier plan as U04 (META, never parsed); layout to be fixed on a sample page in step 1; names with regiment and company, not a status list'),
  S('ME-APPD-1861', ['appendixdofannua00main'], 'roll', 'cols', 'verified-meta',
    'Appendix D of the Adjutant General report of 31 Dec 1861: rolls of the regiments as mustered in 1861', 'second reading for the 3rd to 7th Maine; muster-in only'),
  S('ME-GETT-1898', ['maineatgettysbur01main', 'maineatgettysbu00commgoog', 'maineatgettysbu01commgoog'], 'commission', 'cols', 'used-earlier',
    'Maine at Gettysburg (1898): participants lists by company for the 3rd, 4th, 5th, 6th, 7th, 16th, 17th, 19th and 20th Maine and 1st Maine Cavalry, and a revised casualty list',
    'the one source that places named men at the battle; about 575 names against 386 present for the 20th Maine: carried as printed, the contest is a gap (G04)'),
 ],
 'union-nh': [
  S('NH-AYLING-1895', ['cu31924096263128', 'cu31924096263136'], 'roll', 'flow', 'used-earlier',
    'Ayling, Revised Register of the Soldiers and Sailors of New Hampshire (1895): complete record per man, alphabetical per regiment; volume 1 holds the regiments 1 to 11 (2nd and 5th), volume 2 the 12th and the 1st Light Battery',
    'cross-reference lines ("Co. A. See 10 N. H. V.") are printed rows and are kept as rows'),
  S('NH-AGR-1865', ['reportofadjutant01newh', 'reportofadjutant02newh', 'reportofadjutant661newh', 'reportofadjutant0266newh'], 'roll', 'cols', 'lead',
    'Report of the Adjutant-General of New Hampshire, 1865 and 1866 editions, volumes 1 and 2: regimental rosters of the war years', 'second reading; content not inspected in this pass'),
 ],
 'union-vt': [
  S('VT-ROSTER-1892', ['cu31924080774148'], 'roll', 'cols', 'verified-meta',
    'Revised Roster of Vermont Volunteers and Lists of Vermonters Who Served in the Army and Navy of the United States (1892): rolls by regiment and company (name and rank, residence, date of enlistment, date of muster, remarks); text fetched and pinned in this pass',
    'the earlier run recorded this source as unreachable (SOURCES U16); the text file answered in this pass. Prototype on the 10th Vermont: djvu.xml words align to the search text 25,422 of 25,423; table rows carry rank headings in the name column that the production parser must handle'),
  S('VT-AGR-1866', ['reportofadjutant00verm'], 'roll', 'cols', 'lead', 'Report of the Adjutant and Inspector General of Vermont, 1866', 'second reading; content not inspected'),
  S('VT-MON-1890', ['vermontmonuments00verm', 'vermontmonuments01verm'], 'commission', 'flow', 'lead',
    'Vermont Monuments at Gettysburg (1890): Report of the Vermont commissioners', 'named officers present; a local copy of the text also sits in tmp/library/ws9 (VT-MON-1890)'),
 ],
 'union-ma': [
  S('MA-SSM-1931', ['massachusettssol11931mass', 'massachusettssol21931mass', 'massachusettssol31931mass', 'massachusettssol41931mass',
                    'massachusettssol51931mass', 'massachusettssol61931mass', 'massachusettssol71931mass', 'massachusettssol81931mass'], 'roll', 'flow', 'used-earlier',
    'Massachusetts Soldiers, Sailors and Marines in the Civil War (Adjutant General, 1931-37), by regiment: per the earlier run vol 1 holds the 1st, 2nd, 7th, 9th, 10th, vol 2 the 12th to 22nd, vol 3 the 28th to 37th, vol 5 the batteries, vol 6 the cavalry; vol 8 is Navy only',
    'rights: 1931-37 state imprint; the Internet Archive flag is NOT_IN_COPYRIGHT; a work published in 1931 leaves US copyright term on 1 Jan 2027 at the latest and a state publication may be a government work: the ledger records the flag and the question, no licence is involved'),
  S('MA-SSM-1937-INDEX', ['massachusettssol1937mass'], 'index', 'index', 'verified-meta', 'the 1937 volume of the same work (index); fetched by the earlier run, not used', 'second reading for names'),
  S('MA-RECORD-1868', ['adjutantmassrec01courrich', 'adjutantmassrec02courrich', 'recordofmassachu00mass'], 'compendium', 'flow', 'lead',
    'Record of the Massachusetts Volunteers 1861-1865 (Adjutant General, 1868-70), volumes 1 and 2: regimental narratives and officers', 'lead for officers and casualty statements'),
  S('MA-BURIAL-1863', ['(local text tmp/library/ws9: MA-BURIAL-1863)'], 'burial', 'flow', 'lead',
    'Report of the Joint Special Committee on the burial of Massachusetts dead at Gettysburg (1863)', 'a list of named dead: a stated presence; the text is already in tmp/library/ws9 (acquired_2.json)'),
 ],
 'union-ri': [
  S('RI-REG-1866', ['officialregister00rhod'], 'roll', 'cols', 'used-earlier',
    'Official Register of Rhode Island officers and soldiers (Adjutant General, 1866), volume 1: 1st Detached Militia and the 2nd Rhode Island', 'only volume 1 is on the Internet Archive; the volume of the batteries is not'),
  S('RI-BATT-A-1904', ['histbattery00aldrrich', 'historybatterya00aldrgoog'], 'compendium', 'flow', 'used-earlier', 'Aldrich, History of Battery A, 1st Rhode Island Light Artillery (1904): appendix roll, partial by design', ''),
  S('RI-BATT-B-1894', ['historyofbattery03rhod', 'historyofbattery01rhod', 'historyofbattery04rhod'], 'roll', 'flow', 'used-earlier', 'Rhodes, History of Battery B (1894): full roster', ''),
  S('RI-BATT-E-1892', ['historyofbattery00lewi', 'cu31924030915866', 'historybatterye00lewigoog'], 'compendium', 'flow', 'lead', 'Lewis, History of Battery E, 1st Rhode Island Light Artillery (1892)', 'whether it prints a roll is not yet inspected'),
 ],
 'union-ct': [
  S('CT-CAT-1869', ['connecticutvolorg00catarich'], 'roll', 'cols', 'used-earlier',
    'Catalogue of Connecticut Volunteer Organizations (infantry, cavalry and artillery), Adjutant General, 1869: whole-war roll of each organization', 'columns Name and Rank, Residence, Date of Muster, Remarks; printed ditto marks in two columns'),
  S('CT-20TH-1886', ['twentiethconnec00storgoog'], 'compendium', 'flow', 'lead', 'Storrs, The Twentieth Connecticut, a regimental history (1886)', 'lead from a web search recorded as OJC04 in SOURCES.csv; whether it prints named present and wounded lists is not inspected'),
  S('CT-CAT-1864', ['catalogueconnec00offigoog', 'catalogueconnec00morsgoog', 'catalogueofconne00conn', 'enlistmentcasual00horarich'], 'roll', 'cols', 'verified-meta',
    'the 1864 editions of the Catalogue (with additional enlistments and casualties to that date)', 'independent second reading of the same roll, earlier in time'),
 ],
 'union-ny': [
  S('NY-AGR-REGISTERS', ['annualreportadj01unkngoog', 'annualreportadj02unkngoog', 'annualreportadj06offigoog', 'annualreportadj00unkngoog'], 'roll', 'flow', 'verified-meta',
    'Annual Reports of the Adjutant-General of New York 1893-1905, the Registers of the volunteer regiments (name, age, enlistment, muster-in, every later event): the four Internet Archive volumes found list some Registers only (the earlier run used annualreportadj02unkngoog for the 75th to 80th)',
    'the earlier run read most Registers from the New York State Military Museum PDFs (79 files); that host does not answer on this machine (see owner_steps)'),
  S('NY-RECORD-1864', ['recordofcommissi00newy', 'recordofcommiss00newy', 'recordofcommis00newy', 'cu31924092925167', 'cu31924092925233'], 'roll', 'flow', 'verified-meta',
    'A record of the commissioned officers, non-commissioned officers, and privates, of the regiments which were organized in the State of New York (Adjutant General, 1864): the muster-in roll of each regiment by company; volumes 1 to 3 and the cu31924092925xxx series (the earlier run cached ten texts and did not parse them)',
    'muster-in names with company and rank and no 1863 status, but a name source that does not need the blocked museum host; the identifiers of the other cu31924092925xxx volumes are to be listed in step 1 (title search, 1.2 s apart)'),
  S('NY-GETT-ROH-1900', ['newyorkatgettysb0001unse'], 'commission', 'cols', 'used-earlier',
    'New York at Gettysburg (1900), vols I and II: Roll of Honor, killed and mortally wounded, by regiment and battery (leaves 265-283)', '923 lines the earlier OCR did not resolve (roh_unresolved.csv)'),
  S('NY-PHISTERER', ['newyorkinwarofre01phisrich', 'newyorkinwarofre02phisrich', 'newyorkinwarofre03phisrich', 'newyorkinwarofre04phisrich', 'newyorkinwarofre05phisrich', 'newyorkinwarofre06phisrich'], 'officers', 'flow', 'verified-meta',
    'Phisterer, New York in the War of the Rebellion (1912), 6 vols: regimental histories, field officers and Gettysburg casualty rows', 'the Gettysburg row of each unit page is a reconciliation figure, not a roll'),
 ],
 'union-nj': [
  S('NJ-STRYKER-1876', ['newjerseyincivil01recorich', 'newjerseyincivil02recorich'], 'roll', 'cols', 'used-earlier',
    'Stryker, Record of Officers and Men of New Jersey in the Civil War (1876), vol 1 (infantry) and vol 2 (cavalry, artillery and others)', 'worst date columns of all the table sources (months such as Mav, years such as \'(>•\'); the earlier run read the 23rd NJ muster-out column only'),
  S('NJ-GETT-1888', ['(local text tmp/library/ws9: NJ-TOOMBS-1888, NJ-FINAL-1891)'], 'commission', 'flow', 'lead',
    'Toombs, New Jersey Troops in the Gettysburg Campaign (1888); Final Report of the New Jersey Gettysburg Battlefield Commission (1891)', 'lists of casualties and officers present: not yet inspected'),
 ],
 'union-pa': [
  S('PA-BATES-1869', ['historyofpennsyl01bate', 'historyofpennsyl02bate', 'historyofpennsyl03bate', 'historyofpennsyl04bate', 'historyofpennsyl00bate'], 'roll', 'cols', 'used-earlier',
    'Bates, History of Pennsylvania Volunteers 1861-5, 5 vols: the roll of every regiment (name, rank, date of muster, remarks) for the 68 infantry, 9 cavalry and 5 artillery units; volume 5 is historyofpennsyl00bate',
    'rows are anchored on name-start words; the muster year is lost on a large share of pages (second OCR of the date column covered 373 of 2,039 pages); Windows OCR was used then and is not available here'),
  S('PA-GETT-1904', ['pennsylvaniaatge01lcpenn', 'pennsylvaniaatge02lcpenn', 'pennsgettysburg01reynrich', 'pennsgettysburg02reynrich'], 'commission', 'flow', 'verified-meta',
    'Pennsylvania at Gettysburg (1904 and 1914): the dedication addresses with regimental narratives; every monument inscription in the 1914 vol. 2 gives "Present at Gettysburg N officers and M men"', 'the earlier run found narrative only and no name lists (G-PA7) and used the inscriptions for strengths; whether any address prints a roster of men engaged is a question for step 1, not a claim'),
  S('PA-CEM-1867', ['revisedreportmad00penn', 'revisedreportma00cemegoog'], 'burial', 'cols', 'verified-meta',
    'Revised Report to the Legislature of Pennsylvania on the Soldiers\' National Cemetery (1867): the dead by state and unit, with graves', 'the Pennsylvania tables were located and not used (column parse incomplete)'),
 ],
 'union-de': [
  S('DE-SEVILLE-1884', ['historyoffirstre00sevi', 'historyfirstreg00sevigoog'], 'compendium', 'flow', 'used-earlier', 'Seville, History of the First Regiment, Delaware Volunteers (1884)', '26 rows in all: the roll is not in the text'),
  S('DE-SMITH-1909', ['briefaccountofse53smit'], 'compendium', 'flow', 'used-earlier', 'Smith, A Brief Account of the Services Rendered by the Second Regiment Delaware Volunteers (1909)', '3 rows'),
  S('DE-MURPHEY-1866', ['fouryearsinwarhi00murp', 'fouryearsinwarhi00murp_0'], 'roll', 'cols', 'used-earlier', 'Murphey, Four Years in the War: the 1st Delaware Veteran Volunteers (1866)', 'roster tables unusable in the text layer; needs a second reading of the page images'),
  S('DE-STATE-ROLLS', ['(civilwar.delaware.gov/volumes/volunteers.shtml: three state image PDFs)'], 'roll', 'cols', 'blocked',
    'the Delaware Public Archives volumes of the volunteers: handwritten image PDFs, no text layer', 'host not in the reachable list on this machine; image-only: a vision or OCR reading of page images would be the route'),
 ],
 'union-md': [
  S('MD-ROSTER-1898', ['historyrosterofm01mary', 'historyandroste00assegoog', 'rosterormaryland00vernrich', 'cu31924092925134'], 'roll', 'cols', 'used-earlier',
    'History and Roster of Maryland Volunteers, War of 1861-5 (Maryland Commission on Public Records, 1898-99): the 1st Potomac Home Brigade, 1st Eastern Shore, 3rd Maryland, 1st Maryland Cavalry and the Purnell Legion', 'the second scan has twice the resolution (per-page scale); the third scan timed out at the metadata call'),
 ],
 'union-wv': [
  S('WV-AGR-1864', ['annualreportadj07offigoog', 'annualreportofad1864west'], 'roll', 'cols', 'used-earlier', 'Annual Report of the Adjutant General of West Virginia for 1864, Appendix B returns', 'a printed muster date repeats as a ditto mark; the earlier run inherited the last full date on the page and flagged it'),
  S('WV-AGR-1866', ['annualreportsofa00west'], 'roll', 'cols', 'used-earlier', 'Annual Reports of the Adjutant General and Quarter-Master General of West Virginia (1866)', 'second reading'),
  S('WV-LANG-1895', ['loyalwestvirgini00lang', 'loyalwestvirgin00langgoog'], 'compendium', 'flow', 'verified-meta', 'Lang, Loyal West Virginia from 1861 to 1865 (1895)', 'rosters of officers and some regiments: coverage to be read'),
 ],
 'union-oh': [
  S('OH-ROSTER-1886', ['bwb_W9-BTC-637', 'ohiowarroster03howerich', 'ohiowarroster05howerich', 'ohiowarroster06howerich', 'officialrosterof07ohio', 'ohiowarroster10howerich', 'officialrosterof11ohio'], 'roll', 'cols', 'used-earlier',
    'Official Roster of the Soldiers of the State of Ohio (1886-95): vol 2 (1st to 20th Infantry, via bwb_W9-BTC-637), vol 3 (21st to 36th), vol 5 (54th to 69th), vol 6 (70th to 87th), vol 7 (107th), vol 10 (artillery), vol 11 (cavalry)',
    'columns Names, Rank, Age, Date of entering the service, Period, Remarks; the 1886 imprint of volume 2 carries no copyright flag (public domain by date); the earlier run used a second Internet Archive copy after HTTP 504 on the first'),
  S('OH-ROSTER-2NDCOPIES', ['officialrosters06commgoog', 'ohiowarroster04howerich', 'ohiowarroster08howerich', 'ohiowarroster09howerich'], 'roll', 'cols', 'verified-meta', 'other Internet Archive copies and volumes of the same work', 'independent scans for a second reading'),
  S('OH-GETT-1887', ['(local text tmp/library/ws9: OH-DED-1887, OH-8TH-1889)'], 'commission', 'flow', 'lead', 'Dedication of the Ohio memorials at Gettysburg (1887); The Eighth Ohio at Gettysburg (1889)', 'lists of men engaged and casualties: not inspected'),
 ],
 'union-in': [
  S('IN-AGR-1865-69', ['reportindiana04dougrich', 'reportindiana05dougrich', 'reportindiana06dougrich', 'reportindiana07dougrich', 'reportindiana08dougrich', 'reportofadjutant02indi', 'reportofadjutant03indi'], 'roll', 'cols', 'used-earlier',
    'Terrell, Report of the Adjutant General of the State of Indiana: vol 4 holds the 14th, 19th, 20th and 27th Infantry, vol 5 the 3rd Cavalry (45th Regiment); the volumes of the 7th Infantry and 1st Cavalry (28th Regiment) are to be resolved',
    'enlisted men and non-commissioned staff only per the earlier run (the officer lists are printed apart)'),
  S('IN-1913', ['(local text tmp/library/ws9: IN-1913)'], 'commission', 'flow', 'lead', 'Indiana at the Fiftieth Anniversary of the Battle of Gettysburg (1913)', 'named survivors: not inspected'),
 ],
 'union-il': [
  S('IL-AGR-1900', ['reportofadjutantv5illi', 'reportofadjutantv8illi', 'reportofadjutant05illi1', 'reportofadjutant08illi1'], 'roll', 'cols', 'used-earlier',
    'Report of the Adjutant General of the State of Illinois, revised edition 1900: vol 5 (82nd Infantry), vol 8 (8th and 12th Cavalry); the 1867 first edition is a second reading (reportofadjutant05illi, 08illi)', 'the 12th Cavalry Consolidated is excluded; two columns print dates in different forms'),
 ],
 'union-mi': [
  S('MI-ROS-1905', ['recordofserviceo03mich', 'recordofserviceo08mich', 'recordofserviceo17mich', 'recordofserviceo22mich', 'servicerecordmich00browrich'], 'roll', 'cols', 'used-earlier',
    'Record of Service of Michigan Volunteers in the Civil War 1861-1865 (Kalamazoo, 1905), one volume per regiment: only vol 3 (3rd Infantry), vol 8, 17 and 22 are on the Internet Archive; the volumes of the other Gettysburg regiments were not found',
    'the 3rd Michigan roll was read in full; the other ten units have only the 1913 survivors list (a gap)'),
  S('MI-AGR-1865', ['annualreporto186566mich', 'annualreportof186566mich', 'annualreportofa186566mich', 'annualreportofad00mich'], 'roll', 'cols', 'verified-meta',
    'Annual Reports of the Adjutant General of Michigan, 1865-66 (four Internet Archive items): the contemporary regimental lists', 'coverage not inspected: first thing to read in step 1'),
  S('MI-INWAR-1882', ['michiganinwar00mich', 'michiganinwar00robegoog'], 'officers', 'flow', 'verified-meta', 'Michigan in the War (1882): officers and regimental sketches', 'officers'),
  S('MI-GETT-1889', ['cu31924030924736'], 'commission', 'flow', 'used-earlier', 'Michigan at Gettysburg, 1889: proceedings and monument inscriptions with effective strengths', 'strength figures, not names'),
  S('MI-SURVIVORS-1913', ['rosterofsurvivor00boie'], 'commission', 'flow', 'used-earlier', 'Roster of the Survivors of the Battle of Gettysburg Living in the State of Michigan, May 1913: named survivors by regiment', 'the only names the earlier run had for ten of the eleven Michigan units; a man on it is stated present'),
 ],
 'union-wi': [
  S('WI-ROSTER-1886', ['rosterofwisconsi01wisc', 'rosterofwisconsi02wisc', 'rosterofwisconsi01wisco', 'rosterofwisconsi02wisco'], 'roll', 'cols', 'used-earlier',
    'Roster of Wisconsin Volunteers, War of the Rebellion 1861-1865 (1886): vol 1 holds the 2nd, 3rd, 5th, 6th and 7th Infantry, vol 2 the 26th; the "wisco" items are second scans', 'four columns (name, residence, date, remarks); the pages of Companies G, H and I lose most years'),
 ],
 'union-mn': [
  S('MN-CIVIL-1890', ['minnesotacivil01minnrich', 'minnesotaincivil01minn', 'minnesotacivil02minnrich', 'minnesotaincivi00warsgoog'], 'roll', 'cols', 'used-earlier',
    'Minnesota in the Civil and Indian Wars 1861-1865 (Board of Commissioners, 1890-93), vol 1: the 1st Minnesota roll; vol 2: the sharpshooters', 'the 2nd Company Minnesota Sharpshooters is Company A of the 2nd United States Sharpshooters (Stevens, see union-us): read there'),
  S('MN-1ST-1916', ['(local text tmp/library/ws9: MN-1ST-1916)'], 'roll', 'flow', 'lead', 'History of the First Regiment Minnesota Volunteer Infantry 1861-1864 (1916)', 'a roster appendix and Gettysburg lists: not inspected'),
 ],
 'union-us': [
  S('US-HEITMAN-1903', ['historicalregist01heitrich', 'historicalregist02heitrich'], 'officers', 'flow', 'used-earlier', 'Heitman, Historical Register and Dictionary of the United States Army (1903): every Regular officer, with a Gettysburg battle entry', '283 officers tied to Gettysburg by the earlier run; brevets were attached to the wrong regiment in 45 cases before the audit'),
  S('US-ARMYREG-1863', ['officialarmyregi1863unit', 'officialarmyregi1865unit', 'officialarmyregi1866unit'], 'officers', 'flow', 'verified-meta', 'Official Army Register for 1863, 1865 and 1866: officers of each Regular regiment with dates', 'officers only'),
  S('US-VOLREG-1865', ['cu31924092911084', 'cu31924092911118', 'cu31924092911126', 'cu31924092911134', 'officialarmyregi00unit_0'], 'officers', 'flow', 'verified-meta', 'Official Army Register of the Volunteer Force (1865), parts 1 to 8 by state: volunteer officers by regiment', 'officers only'),
  S('US-BERDAN-1892', ['berdansunitedsta00stev', 'cu31924097557304'], 'roll', 'flow', 'verified-meta', 'Stevens, Berdan\'s United States Sharpshooters in the Army of the Potomac (1892): the roster of the 1st and 2nd United States Sharpshooters', 'also the roll of the 2nd Company Minnesota Sharpshooters (Company A, 2nd USSS) and the source for the 1st Company Massachusetts Sharpshooters only if it prints them: to be read'),
  S('US-ARMY-1896', ['armyofunitedstat00roderich'], 'compendium', 'flow', 'verified-meta', 'Rodenbough and Haskin, The Army of the United States (1896): historical sketches of staff and line, with officers', 'officers'),
  S('US-OR27', ['warofrebellion012701rootrich', 'cu31924077699761', 'cu31924077728255'], 'officers', 'flow', 'used-earlier', 'Official Records vol 27 parts 1 and 2: organization tables, returns, reports and lists of officers killed and wounded', 'names of commanders and staff, not a roll'),
 ],
 'conf-nc': [
  S('NC-MOORE-1882', ['rosternorthcaro00moorgoog', 'rosterofnorthcar02nort', 'rosterofnorthcar03moor', 'rosterofnorthcar04moor'], 'roll', 'flow', 'used-earlier',
    'Moore, Roster of North Carolina Troops in the War between the States (1882), vols 1 to 4: every regiment, battalion and battery, officers and men, compiled from the muster rolls; vol 2 (26th) was fetched and pinned in this pass',
    'entry form "Surname, Given, e. date; county; remarks", abbreviations e. cm. w. k. pr. d. dg. tr. p.; the OCR sometimes glues the next entry to a line; the earlier run read the Emory scans and the primary scans separately (a double reading)'),
  S('NC-CLARK-1901', ['cu31924092908536', 'cu31924092908544', 'cu31924092908551', 'cu31924092908569', 'historiessevera03clargoog'], 'commission', 'flow', 'used-earlier',
    'Clark, Histories of the Several Regiments and Battalions from North Carolina (1901), 5 vols: present for duty by company on 30 June 1863 for some regiments (26th: 885), officers present, casualties', 'figures and officer lists inside narrative'),
 ],
 'conf-la': [
  S('LA-BOOTH-1920', ['recordsofl00loui', 'recordsoflo00loui', 'recordsoflouisi00loui', 'recordsofloui00loui', 'recordsoflouis00loui', 'recordsoflou00loui', 'recordsoflouisia00loui'], 'roll', 'flow', 'used-earlier',
    'Booth, Records of Louisiana Confederate Soldiers and Louisiana Confederate Commands (1920): vol 1, vol 2 parts 1 and 2, vol 3 books 1 and 2; the 10 infantry regiments and the Washington Artillery', 'known incomplete; 747 Booth entries with western-theatre evidence only were withheld as unit-unresolved'),
 ],
 'conf-va': [
  S('VA-LOEHR-1884', ['warhistoryold00loehrich'], 'roll', 'flow', 'used-earlier', 'Loehr, War History of the Old First Virginia Infantry (1884): list of members with years of service and fate', 'years not dates'),
  S('VA-BEALE-1899', ['historyofninthvi00beal'], 'roll', 'flow', 'used-earlier', 'Beale, History of the Ninth Virginia Cavalry (1899): roster by company', 'names only'),
  S('VA-PAGE-1885', ['sketchofpagesbat00page'], 'roll', 'flow', 'used-earlier', 'Page, Sketch of Page\'s Battery, or Morris Artillery (1885): an entry for every man', ''),
  S('VA-IRBY-1878', ['historicalsketc00irbygoog'], 'roll', 'flow', 'used-earlier', 'Irby, Historical Sketch of the Nottoway Grays, Company G, 18th Virginia (1878): condensed roll', 'one company'),
  S('VA-PENSIONERS-1917', ['rosterofconfeder00virg', 'rosterofconfeder1917virg', 'rosterofconfede191921virg'], 'roll', 'flow', 'verified-meta',
    'Roster of Confederate Pensioners of Virginia (Auditor of Public Accounts, 1917-?): name, residence, company and regiment of every surviving pensioner', 'a roll of survivors years later, not of the men at the battle; names and units are as printed and say nothing about 1863; coverage of a regiment is whatever survivors drew a pension. Not parsed by the earlier run'),
  S('VA-PAROLES-1887', ['cu31924030921773'], 'roll', 'cols', 'used-earlier', 'Brock (ed.), Paroles of the Army of Northern Virginia (SHSP vol. 15, 1887): the officers\' lists were read; the enlisted lists (two columns, ditto marks, no regiment per line) were not', 'only 74 of about 200 regiment headings are readable in the text layer; word boxes and the page images are needed; a name is a Appomattox survivor of April 1865'),
  S('VA-FIELDOFFICERS-1912', ['listoffieldoffic00este', 'cu31924030921138', 'listoffieldoffic0000unse'], 'officers', 'flow', 'used-earlier', 'Estes, List of Field Officers, Regiments and Battalions in the Confederate States Army (1912)', 'field officers only'),
  S('VA-RICHMOND-1879', ['05382282.3419.emory.edu', '05382282.3420.emory.edu'], 'compendium', 'flow', 'verified-meta', 'Chamberlayne, Record of the Richmond City and Henrico County Virginia Troops (1879): two pamphlets, 22 and 16 images', 'the earlier run found them narrative; not a roll'),
  S('VA-OTHER-HISTORIES', ['historyofsevente00wise', 'howoneleggedrebe01robs', 'historicalsketch00irby', 'understarsbarshi00jone', 'briefhistoryofmi00fone', 'richmondhowitzer00dani', 'contributionstoh00conf', 'ahistorylaurelb00washgoog', 'lifecampaignsof00mccl'], 'compendium', 'flow', 'lead',
    'regimental and battery histories found by title search (17th Virginia, 52nd Virginia, Surry Light Artillery, Carpenter\'s Battery, Richmond Howitzers, Laurel Brigade and others): whether each prints a roll is not inspected; a per-unit title search (one query per unit, 1.2 s apart) is step 1', 'identifiers in this list are leads from the search results, several may be duplicates of one book'),
  S('VA-LIBRARY-OF-VA', ['(Library of Virginia pension and disability records)'], 'roll', 'cols', 'blocked', 'pension and disability records, a database, not a bulk text', 'host not in the reachable list; records are later-life records'),
 ],
 'conf-sc': [
  S('SC-SALLEY-1914', ['southcarolinatr00sallgoog'], 'roll', 'flow', 'used-earlier', 'Salley (comp.), South Carolina Troops in Confederate Service, vol. II (1914): the 2nd and 3rd South Carolina, field and staff and every company, compiled from the surviving muster rolls and saying what each roll reported', 'the only source in any state built from the 30 June 1863 rolls; the scan repeats a heading and has pages out of order (3rd SC Companies F and G, 2nd SC Company K)'),
  S('SC-3RD-TENTATIVE-1908', ['tentativerostero01sall', 'tentativerostero02sall'], 'roll', 'flow', 'verified-meta', 'Salley (ed.), Tentative Roster of the Third Regiment, South Carolina Volunteers (1908), two parts of 148 and 150 images', 'an earlier printing of the 3rd SC roll: an independent second reading for that regiment'),
  S('SC-TOMPKINS-1897', ['06269758.3416.emory.edu'], 'roll', 'flow', 'used-earlier', 'Tompkins, Company K, Fourteenth South Carolina Volunteers (1897): the original roll and the killed, wounded and prisoner rolls', 'one company (text layer pinned and test-fetched in this pass)'),
  S('SC-SALLEY-V1-V3', ['(Salley vols I 1913 and III 1930)'], 'roll', 'flow', 'blocked', 'the volumes that would cover the 1st Provisional Army, 1st Rifles, 7th, 8th, 12th, 13th, 14th, 15th and the 3rd Battalion', 'not found as open Internet Archive items by title, creator or identifier; a 1930 imprint is outside the pre-1931 rule in any case'),
 ],
 'conf-ga': [
  S('GA-THOMAS-1903', ['historyofdolesco00thom', 'cu31924032376414'], 'roll', 'flow', 'used-earlier', 'Thomas, History of the Doles-Cook Brigade (1903): field and staff and company rolls of the 4th, 12th, 21st and 44th Georgia (5,654 rows)', 'entries "SURNAME, GIVEN - Rank, date. remarks"; clean type'),
  S('GA-WARREN-1863', ['historyofelevent00warr'], 'roll', 'cols', 'used-earlier', 'Warren, History of the Eleventh Georgia Vols., embracing the muster rolls (1863)', 'about 3 names in 5 are damaged on the first page: needs a second reading of the images; printed before the battle'),
  S('GA-NICHOLS-1898', ['01494987.3402.emory.edu'], 'roll', 'flow', 'used-earlier', 'Nichols, A Soldier\'s Story of His Regiment (61st Georgia, 1898): roster of Companies B to K', 'Company A missing in the earlier read'),
  S('GA-HEROES-1864', ['heroesmartyrsofg00fols'], 'compendium', 'flow', 'lead', 'Folsom, Heroes and Martyrs of Georgia (1864): Georgia\'s record, with lists of the dead', 'not inspected; possible named dead of 1861-63'),
  S('GA-VAULT', ['(Georgia Archives Virtual Vault, record group 22-1-63, Confederate muster rolls, page images)'], 'roll', 'cols', 'blocked', 'the original company muster rolls as handwritten page images', 'the https endpoint failed certificate verification from this machine (not bypassed) and the host is not in the reachable list'),
  S('GA-HENDERSON', ['rosterofconfeder0004unse'], 'roll', 'flow', 'blocked', 'the complete modern source', 'copyrighted and lending-restricted on the Internet Archive: never opened'),
 ],
 'conf-al': [
  S('AL-OATES-1905', ['01897724.3053.emory.edu'], 'roll', 'flow', 'used-earlier', 'Oates, The War between the Union and the Confederacy (1905), with the roll of the 15th Alabama', '1,562 rows for the 15th Alabama'),
  S('AL-HURST-1863', ['historyoffourtee01hurs'], 'roll', 'flow', 'used-earlier', 'Hurst, History of the Fourteenth Regiment Alabama Volunteers, with a list of the names of every man that ever belonged to it (1863)', 'a roll made before the battle: a man listed as died or discharged is absent from it'),
  S('AL-PARK-1906', ['04680903.3233.emory.edu'], 'compendium', 'flow', 'used-earlier', 'Park, Sketch of the Twelfth Alabama Infantry (1906): casualty lists and Appomattox paroles', 'partial'),
  S('AL-BREWER-1872', ['alabamaherhistor00brew', 'alabamaherhisto01brewgoog', 'cu31924028794042'], 'officers', 'flow', 'used-earlier', 'Brewer, Alabama: Her History, Resources, War Record and Public Men (1872): officers of each regiment', 'officers only'),
  S('AL-MONTGOMERY-GREYS-1908', ['19598551.3307.emory.edu'], 'roll', 'flow', 'used-earlier', 'Montgomery Greys under Two Flags (1908): a roster, OCR too poor in the earlier run', 'needs a second reading'),
  S('AL-ADAH', ['(Alabama Department of Archives and History, Civil War Service Database)'], 'roll', 'flow', 'blocked', 'a web database; terms unread, no bulk download; not queried', 'host not in the reachable list on this machine'),
 ],
 'conf-ms': [
  S('MS-REGISTER-1908', ['officialstatisti00missuoft'], 'officers', 'flow', 'used-earlier', 'Rowland, Official and Statistical Register of the State of Mississippi (1908): officers of each Confederate unit', 'officers only; 232 rows carry a remark after a list of names'),
  S('MS-QUITMAN-1866', ['historicalsketch00newo'], 'roll', 'flow', 'used-earlier', 'A Historical Sketch of the Quitman Guards, Company E, 16th Mississippi (1866)', 'one company'),
  S('MS-MDAH', ['(Mississippi Department of Archives and History)'], 'roll', 'flow', 'blocked', 'the state archive; no free name database found', 'host not in the reachable list'),
 ],
 'conf-fl': [
  S('FL-SOLDIERS-1903', ['soldiersofflorid00flor'], 'roll', 'cols', 'used-earlier', 'Soldiers of Florida in the Seminole Indian, Civil and Spanish-American Wars (1903): the rolls of the 2nd, 5th and 8th Florida', '6.1 percent of rows had an empty name in the earlier run (the text layer drops names): a second reading of the page images is needed'),
 ],
 'conf-tn': [
  S('TN-LINDSLEY-1886', ['militaryannalsof00lind', 'militaryannalso00lind', 'cu31924032778700'], 'compendium', 'flow', 'lead', 'Lindsley, The Military Annals of Tennessee, Confederate, first series (1886): "regimental histories and memorial rosters"', 'not inspected by the earlier run, which found only field officers (Estes) for the 1st Provisional, 7th and 14th Tennessee: first thing to read in step 1'),
  S('TN-ESTES-1912', ['listoffieldoffic00este'], 'officers', 'flow', 'used-earlier', 'Estes, List of Field Officers (1912)', 'field officers only'),
  S('TN-TSLA', ['(Tennessee State Library and Archives)'], 'roll', 'flow', 'blocked', 'the robots file answered 403 in the earlier run', 'not used'),
 ],
 'conf-tx': [
  S('TX-POLLEY-1910', ['hoodstexasbrigad00poll', 'cu31924032778817', 'hoodstexasbriga00poll'], 'roll', 'cols', 'used-earlier', 'Polley, Hood\'s Texas Brigade (1910): rolls of the 1st, 4th and 5th Texas', 'two-column pages with page-wide company headings; Company E and K of the 4th Texas are run-on name lists'),
  S('TX-CHILTON-1911', ['unveilingdedicat01chil', 'unveilingdedicat02chil'], 'compendium', 'flow', 'used-earlier', 'Chilton, Unveiling and Dedication of the Monument to Hood\'s Texas Brigade (1911)', 'second source for 4th Texas Company H'),
 ],
 'conf-ar': [
  S('AR-3RD-APPOMATTOX', ['cu31924030921773'], 'roll', 'cols', 'used-earlier', 'the Appomattox paroles list (SHSP vol. 15): 141 survivors of the 3rd Arkansas', 'survivors of April 1865 only'),
  S('AR-OTHER', ['(searched: ar_third, ar_subj; nothing that prints a roll of the 3rd Arkansas)'], 'roll', 'flow', 'not-found', 'no open roll of the 3rd Arkansas Infantry was found on the Internet Archive; the Arkansas State Archives answered with an error in the earlier run', ''),
 ],
 'conf-md': [
  S('MD-GOLDSBOROUGH-1900', ['marylandlineinco00gold'], 'roll', 'flow', 'used-earlier', 'Goldsborough, The Maryland Line in the Confederate Army (the item is dated 1900): rosters of the 1st Maryland and of the batteries (Baltimore Light, Chesapeake and the others)', 'two different Goldsborough rosters are filed under one id in the earlier run (1,242 rows): the identity of the "1st Maryland" is contested'),
 ],
 'conf-cs-staff': [
  S('CS-OR27-2', ['cu31924077728255'], 'officers', 'flow', 'used-earlier', 'Official Records vol 27 part 2: organization of the Army of Northern Virginia, reports (named commanders and staff)', 'names inside tables and reports'),
  S('CS-ESTES-1912', ['listoffieldoffic00este', 'cu31924030921138'], 'officers', 'flow', 'used-earlier', 'Estes (1912) and the War Department list of field officers', 'field officers by regiment'),
  S('CS-PAROLES-1887', ['cu31924030921773'], 'officers', 'cols', 'used-earlier', 'Paroles of the Army of Northern Virginia, officers\' lists', 'staff officers of April 1865'),
 ],
}

# Facts the plan states per group: what the earlier run could not do, and owner-only steps (written, never done by Claude)
GAPS = {
 'union-me': ['G03 Maine final roster of the 1864-65 report (Digital Maine answers with a bot challenge)', 'G04 575 names on the 1898 participants list against 386 present (20th Maine): contested, carried as printed'],
 'union-vt': ['no earlier roll rows for any Vermont unit: all ten infantry regiments and the cavalry start from the 1892 Revised Roster'],
 'union-ny': ['G-NY2 the Registers of 79 regiments came from a host that does not answer here; two units had no roster earlier (61st NY image-only, 71st NY)', 'row text of the Registers is not on this machine: the earlier CSV rows carry no offsets and cannot be re-anchored to a text that is not here'],
 'union-mi': ['ten of eleven Michigan units had only the 1913 survivors list: the Record of Service volumes are not on the Internet Archive for them'],
 'union-de': ['both Delaware regiments have 26 and 3 rows: the state rolls are image PDFs'],
 'union-us': ['no enlisted roll of the Regular Army exists in any open source found: officers (Heitman, Official Army Register), named casualties and the USSS roster only'],
 'conf-va': ['G11 no whole-war Virginia roll in the public domain: 42 infantry regiments, 31 cavalry and 42 artillery units rest on regimental and battery histories, pensioner rosters and the Appomattox lists', 'five Virginia infantry units had no names at all earlier: 7th, 49th, 50th, 52nd Virginia and the 22nd Virginia Battalion'],
 'conf-ga': ['23 Georgia regiments had only officer and hospital names; seven had none (Cobb\'s and Phillips Legions, 2nd Battalion, 14th, 35th, 45th, 49th)'],
 'conf-sc': ['Salley volumes I and III are not open: 9 of 11 infantry units depend on other sources'],
 'conf-al': ['16 Alabama units had officers only'],
 'conf-ms': ['no open enlisted roll for any Mississippi unit'],
 'conf-tn': ['the three Tennessee units had field officers only (Lindsley not yet read)'],
 'conf-ar': ['the 3rd Arkansas has the 141 Appomattox survivors only'],
}

OWNER_STEPS = {
 'union-ny': ['If the New York State Military Museum Register PDFs are wanted again, the cloud environment needs the hosts museum.dmna.ny.gov and nysmm.org in its allowed network hosts (an environment setting that needs approval; the host answered during the earlier run and does not answer now). Nothing else is needed from the owner: the Internet Archive volumes are the fallback.'],
 'union-me': ['Digital Maine files (the 1864-65 roster, the 20th Maine deceased list) can be fetched only by a person in a browser; no bypass is attempted. Drop the files into tmp/library/rosters/ME-AGR-1864 and the work item reads them from there.'],
 'union-de': ['The Delaware volunteer rolls are image PDFs on civilwar.delaware.gov: if the host is added to the allowed network hosts, a vision reading of the pages is the route (a decision on a second-OCR route, G02).'],
 'conf-ga': ['The Georgia Archives Virtual Vault page images need the host in the allowed network hosts and a certificate path that verifies; nothing is bypassed.'],
 'conf-al': ['The ADAH database has no bulk download and its terms are unread: the owner decides whether a request to the archives is wanted (DEC-019 says no permission requests are sent).'],
}


# Group-specific first tasks (after the common steps in work-items.json "common.steps"): what to do first and why
FIRST_TASKS = {
 'union-me': ['Read three sample pages of ME-SUPP-1867 (the 1867 alphabetical index, never parsed), fix its line layout, and build the rolls of all 14 Maine units from it: this is the only whole-war name source for the 10th Maine Battalion and the 5th and 6th Batteries and an independent reading for the rest.',
              'Re-parse ME-AGR-1863-APPD (cols) and ME-GETT-1898 (participants and casualties) as further segments of the infantry and cavalry files; carry the 575-against-386 contest unresolved.',
              'Try the Maine items on Digital Maine once through the allowed route only if the host answers; on a challenge page stop and record it (G03).'],
 'union-nh': ['Re-parse NH-AYLING-1895 volumes 1 and 2 as flow entries for the 2nd, 5th and 12th New Hampshire and the 1st Light Battery; keep the cross-reference rows.', 'Inspect NH-AGR-1865 for the same regiments as an independent reading.'],
 'union-vt': ['Build the offsets for VT-ROSTER-1892 (djvu.xml words to search-text offsets; the prototype aligned 25,422 of 25,423 words) and parse the ten infantry regiments and the cavalry; treat rank headings in the name column as the carried rank.', 'Read VT-MON-1890 for named officers present (local text in tmp/library/ws9).'],
 'union-ma': ['Re-read the five volumes the earlier run used (flow entries) and add volume 4 and 7 only if a Gettysburg unit is in them; the batteries are in vol 5 and the cavalry in vol 6.', 'Resolve the 5th Massachusetts Battery (E) and the two OOB batteries E and F that match no OR battery (GAPS G-NE02).', 'Record the 1931-37 imprint question in the ledger rights note.'],
 'union-ri': ['Re-parse the 2nd Rhode Island from RI-REG-1866 (cols) and the rolls of Batteries A and B from their histories; read RI-BATT-E-1892 to see whether it prints a roll; find Batteries C and G (nothing found so far) by a per-battery title search.'],
 'union-ct': ['Re-parse CT-CAT-1869 (cols) for the five infantry regiments and the three batteries; use the 1864 editions as an independent reading of the same men; the 2nd Connecticut Light Battery had no rows earlier.'],
 'union-ny': ['Test the museum host once (it does not answer from this machine); if it still fails record it and build the units from the Internet Archive: the Register volumes (four found) and the 1864 Record volumes for the muster-in roll of every infantry regiment.', 'List the regiments in each IA volume (tables of contents) and write the volume-to-unit map into data2/sources/NY-*.json before parsing.', 'Add the Roll of Honor of NY-GETT-ROH-1900 as segments of the unit files (killed and mortally wounded, a stated presence).'],
 'union-nj': ['Re-parse NJ-STRYKER-1876 vol 1 (infantry; 11 of 12 regiments had rolls) and vol 2 (cavalry, Battery B); the 15th New Jersey and Battery A had no rows earlier.', 'Check the 12th New Jersey number in the OR OCR (the table prints 13th).'],
 'union-pa': ['Re-parse the five Bates volumes (cols) for the 68 infantry, 9 cavalry and 5 artillery units: the largest single table family (about 116,000 rows earlier); resolve the muster-year loss by a second reading of the date column (a page-image OCR run is needed; see PRODUCTION-PLAN section 7).', 'Read PA-GETT-1904 for lists of men engaged inside the addresses; add the Pennsylvania tables of PA-CEM-1867 as burial segments once the column parse is complete.'],
 'union-de': ['Re-read DE-SEVILLE-1884 and DE-SMITH-1909 for any roll printed in the text; find the 1st Delaware Veteran roll in DE-MURPHEY-1866 by a second reading of the page images; record the state image PDFs as blocked.'],
 'union-md': ['Re-parse MD-ROSTER-1898 (cols; the second scan has twice the resolution) for the 3rd Maryland, 1st Potomac Home Brigade, 1st Eastern Shore, 1st Maryland Cavalry and the Purnell Legion; Battery A, Maryland Light Artillery had 1 row.'],
 'union-wv': ['Re-parse WV-AGR-1864 (cols; ditto marks inherited and flagged) for the 7th West Virginia, the two cavalry regiments and Battery C; read WV-LANG-1895 for rolls.'],
 'union-oh': ['Re-parse the seven Ohio volumes (cols) for the 13 infantry regiments, the 6th Cavalry and four batteries; the 1st Ohio Cavalry had no rows earlier (find its volume: the cavalry are in vol 11, check whether the 1st is there).'],
 'union-in': ['Resolve the volumes of the 7th Indiana Infantry and 1st Indiana Cavalry (28th Regiment) in the Terrell report; re-parse the four regiments and the 3rd Cavalry.'],
 'union-il': ['Re-parse volumes 5 and 8 of the 1900 report for the 82nd Illinois and the 8th and 12th Cavalry; use the 1867 first edition as a second reading.'],
 'union-mi': ['Read the four Michigan AG 1865-66 items to see which regimental lists they print; look for each missing Record of Service volume by a per-regiment title search; add the 1913 survivors roster as a stated-presence segment; the 9th Michigan Battery had no rows earlier.'],
 'union-wi': ['Re-parse volumes 1 and 2 (cols) for the six regiments; the 6th Wisconsin was the pilot (2,098 rows) and its Gettysburg footnotes (Dawes) are a separate source.'],
 'union-mn': ['Re-parse the 1st Minnesota roll; the 2nd Company Minnesota Sharpshooters is read from Stevens (union-us) once that source is parsed; read MN-1ST-1916.'],
 'union-us': ['Parse US-BERDAN-1892 for the 1st and 2nd United States Sharpshooters (and the 2nd Company Minnesota Sharpshooters, Company A of the 2nd USSS); keep Heitman and the Army Registers as officer segments for the Regular regiments and batteries; register the missing enlisted roll as a gap in the Evidence-Gap Register.'],
 'conf-nc': ['Re-parse Moore vols 1 to 4 as flow entries (the earlier run read two scans of each volume: use both as independent readings and keep every disagreement); the 4 cavalry regiments and 4 batteries are in vol 1 and the first part of vol 2 (confirm); the prototype on the 26th (1,737 rows, all name, remark and page checks passed) shows the segmentation approach.', 'Add Clark 1901 present-for-duty figures as notes in the ledger, not as rows.'],
 'conf-la': ['Re-parse Booth (seven IA items for six books) for the ten infantry regiments and seven artillery units; keep the 747 unit-unresolved entries in a separate list file, not in a unit file.'],
 'conf-va': ['Run a per-unit title search (about 105 queries at 1.2 s) for every Virginia infantry, cavalry and artillery unit and record which hits print a roll; parse the rolls found (Loehr, Beale, Page, Irby are done in the old format).', 'Parse VA-PENSIONERS-1917 (Roster of Confederate Pensioners of Virginia, three IA items) as a clearly labelled survivors list by company and regiment, and the Appomattox enlisted paroles with word boxes; both state nothing about 1863.', 'Register the Virginia roll gap (G11) at the unit level in the Evidence-Gap Register.'],
 'conf-sc': ['Parse SC-SALLEY-1914 (the 2nd and 3rd SC, from the 30 June 1863 muster rolls) and SC-3RD-TENTATIVE-1908 as an independent reading; find volumes I and III of Salley by a last title search, else record them as not found; Company K of the 14th SC (Tompkins).'],
 'conf-ga': ['Parse Thomas (4th, 12th, 21st, 44th), Warren (11th; needs a second reading of the images), Nichols (61st); read GA-HEROES-1864; record the Vault and Henderson as blocked.'],
 'conf-al': ['Re-parse Oates (15th) and Hurst (14th) and the officers lists of Brewer; look for rolls of the other 15 units by a per-unit title search; record the ADAH database as blocked.'],
 'conf-ms': ['Re-parse the Register (officers) and the Quitman Guards roll; search per regiment for printed rolls (the 11 regiments and the Jeff. Davis Legion); record the MDAH as blocked.'],
 'conf-fl': ['Re-parse the three Florida regiments (cols); the 6.1 percent empty names need a second reading of the page images; keep empty-name rows only as counted gaps, never invented.'],
 'conf-tn': ['Read Lindsley (three IA items) for memorial rosters of the 1st Provisional, 7th and 14th Tennessee; that source was not read by the earlier run.'],
 'conf-tx': ['Re-parse Polley (1st, 4th, 5th Texas) with the two-column page rule; use Chilton for the 4th Texas Company H.'],
 'conf-ar': ['Re-search for a roll of the 3rd Arkansas (per-unit title query and the Arkansas state host); keep the 141 Appomattox survivors as a labelled list.'],
 'conf-md': ['Re-parse Goldsborough (1st Maryland, the Baltimore Light Artillery, Chesapeake and Griffin batteries); resolve the identity of the "1st Maryland" rosters (infantry battalion, cavalry battalion) with the OR table before filing any row to a unit; the 1st Maryland Cavalry Battalion had no rows earlier.'],
 'conf-cs-staff': ['Name the generals and staff of the Army of Northern Virginia from the OR table (part 2), the Estes list and the Paroles officers lists; one file, no roll of enlisted men.'],
}
