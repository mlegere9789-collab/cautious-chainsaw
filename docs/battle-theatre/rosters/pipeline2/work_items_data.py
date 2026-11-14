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
    'Supplement to the Annual Reports of the Adjutant General 1861-1866 (1867): cover title "Alphabetical index of Maine volunteers ... mustered into the service of the United States during the war of 1861"; by its title the whole-war name source for every Maine unit, which would include the three units the earlier run left empty (10th Maine Battalion, 5th and 6th Maine Batteries)',
    'catalogued by the earlier plan as U04 (META, never parsed); its layout and fields (expected: name, regiment, company) are to be read on three sample pages in step 1 before any claim'),
  S('ME-APPD-1861', ['appendixdofannua00main'], 'roll', 'cols', 'verified-meta',
    'Appendix "D" of the Adjutant General report of 31 Dec 1861 (title only; 602 images)', 'content to be read in step 1: the 3rd to 7th Maine were mustered in 1861, so a second reading of their muster-in rolls is possible'),
  S('ME-GETT-1898', ['maineatgettysbur01main', 'maineatgettysbu00commgoog', 'maineatgettysbu01commgoog'], 'commission', 'cols', 'used-earlier',
    'Maine at Gettysburg (1898): participants lists by company for the 3rd, 4th, 5th, 6th, 7th, 16th, 17th, 19th and 20th Maine and 1st Maine Cavalry, and a revised casualty list',
    'the one source that places named men at the battle; about 575 names against 386 present for the 20th Maine: carried as printed, the contest is a gap (G04)'),
 ],
 'union-nh': [
  S('NH-AYLING-1895', ['cu31924096263128', 'cu31924096263136'], 'roll', 'flow', 'used-earlier',
    'Ayling, Revised Register of the Soldiers and Sailors of New Hampshire (1895): complete record per man, alphabetical per regiment; volume 1 holds the regiments 1 to 11 (2nd and 5th), volume 2 the 12th and the 1st Light Battery',
    'cross-reference lines ("Co. A. See 10 N. H. V.") are printed rows and are kept as rows'),
  S('NH-AGR-1865', ['reportofadjutant01newh', 'reportofadjutant02newh', 'reportofadjutant661newh', 'reportofadjutant0266newh'], 'roll', 'cols', 'lead',
    'Report of the Adjutant-General of New Hampshire, 1865 and 1866 editions, volumes 1 and 2 (titles only)', 'content not inspected in this pass: possible regimental lists as a second reading'),
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
    'Annual Reports of the Adjutant-General of New York 1893-1905, the Registers of the volunteer regiments (name, age, enlistment, muster-in, every later event): of the four Internet Archive volumes found, per the earlier run only annualreportadj02unkngoog holds Gettysburg regiments (the 75th to 80th); annualreportadj00, 01 and 06 hold the 114th, the veteran cavalry and mounted rifles and the 7th and 8th Artillery, none at Gettysburg',
    'the earlier run read the Registers of the other Gettysburg units from the New York State Military Museum PDFs (79 files); that host does not answer on this machine (see owner_steps), so for most New York units the Registers are not available here'),
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
    'Stryker, Record of Officers and Men of New Jersey in the Civil War (1876), vols 1 and 2 (infantry, cavalry and artillery; the volume of each regiment is resolved in step 1)', 'worst date columns of all the table sources (months such as Mav, years such as \'(>•\'); the earlier run read the 23rd NJ muster-out column only'),
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
    'Minnesota in the Civil and Indian Wars 1861-1865 (Board of Commissioners, 1890-93), vol 1: the 1st Minnesota roll (per the earlier run); the 2nd Company Minnesota Sharpshooters is expected in vol 2 (to be confirmed)', 'the 2nd Company Minnesota Sharpshooters is Company A of the 2nd United States Sharpshooters (Stevens, see union-us): read there'),
  S('MN-1ST-1916', ['(local text tmp/library/ws9: MN-1ST-1916)'], 'roll', 'flow', 'lead', 'History of the First Regiment Minnesota Volunteer Infantry 1861-1864 (1916)', 'a roster appendix and Gettysburg lists: not inspected'),
 ],
 'union-us': [
  S('US-HEITMAN-1903', ['historicalregist01heitrich', 'historicalregist02heitrich'], 'officers', 'flow', 'used-earlier', 'Heitman, Historical Register and Dictionary of the United States Army (1903): every Regular officer, with a Gettysburg battle entry', '283 officers tied to Gettysburg by the earlier run; brevets were attached to the wrong regiment in 45 cases before the audit'),
  S('US-ARMYREG-1863', ['officialarmyregi1863unit', 'officialarmyregi1865unit', 'officialarmyregi1866unit'], 'officers', 'flow', 'verified-meta', 'Official Army Register for 1863, 1865 and 1866: officers of each Regular regiment with dates', 'officers only'),
  S('US-VOLREG-1865', ['cu31924092911084', 'cu31924092911118', 'cu31924092911126', 'cu31924092911134', 'officialarmyregi00unit_0'], 'officers', 'flow', 'verified-meta', 'Official Army Register of the Volunteer Force (1865), parts 1 to 8 by state: volunteer officers by regiment', 'officers only'),
  S('US-BERDAN-1892', ['berdansunitedsta00stev', 'cu31924097557304'], 'roll', 'flow', 'verified-meta', 'Stevens, Berdan\'s United States Sharpshooters in the Army of the Potomac (1892): the history of the 1st and 2nd United States Sharpshooters; whether its appendix prints a roll of each company is to be confirmed on the page images in step 1', 'if it does, it is also the roll of the 2nd Company Minnesota Sharpshooters (Company A, 2nd USSS); the 1st Company Massachusetts Sharpshooters only if it prints them'),
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
    'Roster of Confederate Pensioners of Virginia (Auditor of Public Accounts, 1917; three Internet Archive items of 190, 90 and 206 images): a roster of surviving pensioners; its fields (expected: name, residence, company, regiment) are to be read in step 1', 'a list of survivors years later, not of the men at the battle: names and units as printed say nothing about 1863 and a regiment is covered only as far as survivors drew a pension. Not parsed by the earlier run'),
  S('VA-PAROLES-1887', ['cu31924030921773'], 'roll', 'cols', 'used-earlier', 'Brock (ed.), Paroles of the Army of Northern Virginia (SHSP vol. 15, 1887): the officers\' lists were read; the enlisted lists (two columns, ditto marks, no regiment per line) were not', 'only 74 of about 200 regiment headings are readable in the text layer; word boxes and the page images are needed; a name is a Appomattox survivor of April 1865'),
  S('VA-FIELDOFFICERS-1912', ['listoffieldoffic00este', 'cu31924030921138', 'listoffieldoffic0000unse'], 'officers', 'flow', 'used-earlier', 'Estes, List of Field Officers, Regiments and Battalions in the Confederate States Army (1912)', 'field officers only'),
  S('VA-RICHMOND-1879', ['05382282.3419.emory.edu', '05382282.3420.emory.edu'], 'compendium', 'flow', 'verified-meta', 'Chamberlayne, Record of the Richmond City and Henrico County Virginia Troops (1879): two pamphlets, 22 and 16 images', 'the earlier run found them narrative; not a roll'),
  S('VA-OTHER-HISTORIES', ['historyofsevente00wise', 'howoneleggedrebe01robs', 'historicalsketch00irby', 'understarsbarshi00jone', 'briefhistoryofmi00fone', 'richmondhowitzer00dani', 'contributionstoh00conf', 'ahistorylaurelb00washgoog', 'lifecampaignsof00mccl'], 'compendium', 'flow', 'lead',
    'regimental and battery histories found by title search (17th Virginia, 52nd Virginia, Surry Light Artillery, Carpenter\'s Battery, Richmond Howitzers, Laurel Brigade and others): whether each prints a roll is not inspected; a per-unit title search (one query per unit, 1.2 s apart) is step 1', 'identifiers in this list are leads from the search results, several may be duplicates of one book'),
  S('VA-LIBRARY-OF-VA', ['(Library of Virginia pension and disability records)'], 'roll', 'cols', 'blocked', 'pension and disability records, a database, not a bulk text', 'host not in the reachable list; records are later-life records'),
 ],
 'conf-sc': [
  S('SC-SALLEY-1914', ['southcarolinatr00sallgoog'], 'roll', 'flow', 'used-earlier', 'Salley (comp.), South Carolina Troops in Confederate Service, vol. II (1914): the 2nd and 3rd South Carolina, field and staff and every company, compiled from the surviving muster rolls and saying what each roll reported', 'the only source in any state built from the 30 June 1863 rolls; the scan repeats a heading and has pages out of order (3rd SC Companies F and G, 2nd SC Company K)'),
  S('SC-3RD-TENTATIVE-1908', ['tentativerostero01sall', 'tentativerostero02sall'], 'roll', 'flow', 'verified-meta', 'Salley (ed.), Tentative Roster of the Third Regiment, South Carolina Volunteers (1908), two parts of 148 and 150 images', 'by its title a tentative roster of the 3rd South Carolina, to be compared with Salley vol. II as an independent second reading'),
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
 'union-ny': ['Test the museum host once (it does not answer from this machine); if it still fails record it and build the units from the Internet Archive: the one Register volume with Gettysburg regiments (annualreportadj02unkngoog, 75th to 80th) and the 1864 Record volumes for the muster-in roll of every infantry regiment; search the Internet Archive for further Register volumes first (title:annual report adjutant-general New York registers, one query per year 1893 to 1905).', 'List the regiments in each IA volume (tables of contents) and write the volume-to-unit map into data2/sources/NY-*.json before parsing.', 'Add the Roll of Honor of NY-GETT-ROH-1900 as segments of the unit files (killed and mortally wounded, a stated presence).'],
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


# 1863 newspapers: the Richmond and state dailies printed regimental casualty lists after the battle (named killed, wounded and missing);
# a stated presence, and a contemporary source for the Confederate states whose rolls are thin.  Lead: coverage and OCR quality unread.
for _g in ('conf-va', 'conf-nc', 'conf-sc', 'conf-ga', 'conf-al', 'conf-ms', 'conf-la', 'conf-tn', 'conf-tx', 'conf-ar', 'conf-fl', 'conf-md'):
    SOURCES[_g].append(S('NEWS-1863-CASUALTIES', ['(chroniclingamerica.loc.gov: Richmond and state newspapers, July to September 1863)'], 'commission', 'flow', 'lead',
                         'named killed, wounded and missing by regiment as the 1863 newspapers printed them (page OCR text from the Library of Congress service)',
                         'the earlier run recorded the host as blocked (HTTP 403 on robots.txt for its user agent, VSG19); the host is on this machine\'s reachable list: one test request first, then at most 1 request per second; newspaper OCR is noisy and every name stays as printed'))


# ======================================================================================================================
# Run order, closure and status of the items that were started (added 14 November 2026).  Read by make_work_items.py and
# open_groups.py.  Nothing here is a roster row.
# ======================================================================================================================

# The planning step returns the OPEN items in this order (open_groups.py).  Two engineers run at a time (the workflow caps
# concurrent agents at CPUs - 2 = 2), a restart of the machine starts the planning step again and walks the list from the top, so
# (1) finished items are not returned, (2) long items (L) alternate with short ones (s) so that one slot is not blocked for hours
# while the other idles, (3) the first sample (roster-qa) comes early because its findings change the parsers of everything after it.
# s short (about 1 h), m medium (2 to 3 h), L long (several restarts).
RUN_ORDER = [
    'union-ma',                    # s  files exist and verify clean; pointer file, rights, reconciliation, report and closure are left
    'roster-qa',                   # m  round 1: the sample of the four closed items (ME, NH, VT, MA); no new units
    'conf-nc',                     # m  Moore, flow, prototype exists, 41 units, 49,347 earlier rows
    'union-pa',                    # L  Bates, cols, 82 units, 110,595 earlier rows: starts early so that it spans the restarts
    'union-wi',                    # s
    'union-ct',                    # s
    'union-oh',                    # L  seven volumes, cols
    'union-nj',                    # m
    'conf-la',                     # m  Booth, flow
    'union-ri',                    # s
    'union-ny',                    # L  98 units, volume map first
    'union-md', 'union-wv', 'union-in', 'union-il', 'union-mn',      # s
    'conf-fl', 'conf-tx',          # s
    'conf-va',                     # L  105 units, source search per unit
    'conf-md', 'conf-sc', 'conf-ga',  # s, m, m
    'roster-gettysburg-lists',     # m  sidecar files, independent of the state items
    'union-mi', 'union-de',        # m, s  thin record: source search, gaps
    'union-us',                    # L
    'conf-al', 'conf-ms', 'conf-tn', 'conf-ar', 'conf-cs-staff',     # m, m, s, s, s
    'union-me', 'union-nh', 'union-vt',   # round 2 only (round 1 is closed): depth for units that already have names comes after first-pass coverage of the units that have none
]

# Not returned as items while their round 1 is closed: union-me, union-nh, union-vt appear only for round 2 (the three at the end of the list);
# roster-index and roster-app are the Integrate step of the workflow (pipeline2/build_index.py already writes data2/INDEX.json).

RETURN_TITLES = {
    'union-ma': 'Massachusetts (Union): 24 unit files exist and verify clean; finish the pointer file (rights per text), the reconciliation with the earlier rolls, the report, the gaps and CLOSED.json',
    'roster-qa': 'Independent sample of stored lines against page images, round 1 on the closed items ME, NH, VT and MA (PDF route, look at each page; no new units); later rounds as more items close',
    'conf-nc': 'North Carolina (Confederate): 41 units from Moore, Roster of North Carolina Troops, four volumes (flow); a prototype of the 26th exists',
    'union-pa': 'Pennsylvania (Union): 82 units from Bates, History of Pennsylvania Volunteers, five volumes (cols), the largest table source; write each unit file as soon as it verifies',
    'union-wi': 'Wisconsin (Union): 6 units from the Roster of Wisconsin Volunteers (cols)',
    'union-ct': 'Connecticut (Union): 8 units from the Catalogue of Connecticut Volunteer Organizations (cols); the 1889 Record of Service covers earlier wars only',
    'union-oh': 'Ohio (Union): 19 units from the Official Roster of the Soldiers of the State of Ohio, seven volumes (cols)',
    'union-nj': 'New Jersey (Union): 15 units from Stryker, Record of Officers and Men of New Jersey (cols)',
    'conf-la': 'Louisiana (Confederate): 17 units from Booth, Records of Louisiana Confederate Soldiers (flow; known incomplete)',
    'union-ri': 'Rhode Island (Union): 6 units (2nd Infantry and five batteries) from the Official Register of Rhode Island and the battery histories',
    'union-ny': 'New York (Union): 98 units from the Registers and the 1864 Record on the Internet Archive (the museum host does not answer); build the volume-to-unit map first and write units as they are done',
    'union-md': 'Maryland (Union): 6 units from the History and Roster of Maryland Volunteers (cols)',
    'union-wv': 'West Virginia (Union): 4 units from the Adjutant General reports of 1864 and 1866',
    'union-in': 'Indiana (Union): 7 units from the Report of the Adjutant General of Indiana (Terrell); resolve the volume map first',
    'union-il': 'Illinois (Union): 3 units from the Revised Report of the Adjutant General of Illinois',
    'union-mn': 'Minnesota (Union): 2 units from Minnesota in the Civil and Indian Wars',
    'conf-fl': 'Florida (Confederate): 3 units from Soldiers of Florida (1903); one scan drops 6.1 percent of the names, read a second copy',
    'conf-tx': 'Texas (Confederate): 3 units from Polley, Hood\'s Texas Brigade (1910)',
    'conf-va': 'Virginia (Confederate): 105 units, no public-domain whole-war roll; search per unit, parse every roll or history that prints names, register the rest as gaps',
    'conf-md': 'Maryland (Confederate): 5 units from Goldsborough, The Maryland Line in the Confederate Army (1900)',
    'conf-sc': 'South Carolina (Confederate): 18 units from Salley vol. II, the Tentative Rosters and Tompkins; register Salley volumes I and III (not open) as gaps',
    'conf-ga': 'Georgia (Confederate): 45 units from Thomas, Warren, Nichols and the other open items; Henderson is never opened',
    'roster-gettysburg-lists': 'Statements of presence no roll prints: Official Records officers, National Cemetery burial lists, 1863 newspaper casualty lists, state commission volumes no state item parsed (written as sidecar files)',
    'union-me': 'Maine (Union), round 2 only: 1898 casualty and special-duty lists, 1861 muster-in returns, Appendix I of 1863 (deceased); round 1 is closed, do not redo it',
    'union-nh': 'New Hampshire (Union), round 2 only: the Register of Commissioned Officers as a further segment, the sideways Adjutant General reports (test a rotated read); round 1 is closed, do not redo it',
    'union-vt': 'Vermont (Union), round 2 only: the 1866 Adjutant General report as a second reading (probe first), the six lost names and prose notes; round 1 is closed, do not redo it',
    'union-mi': 'Michigan (Union): 12 units; few Record of Service volumes are on the Internet Archive (3, 8, 17, 22); read the 1865-66 reports and the 1913 survivors list, register the gaps',
    'union-de': 'Delaware (Union): 2 units; the state rolls are image PDFs on a host that is not reachable; search the Internet Archive and register the gap',
    'union-us': 'United States Regulars, Sharpshooters, Engineers and staff (Union): 43 units; no enlisted rolls are open; officers from Heitman and the Army Registers, Stevens for Berdan\'s men, named casualties',
    'conf-al': 'Alabama (Confederate): 19 units from Oates, Hurst and the regimental histories that print names; register the rest',
    'conf-ms': 'Mississippi (Confederate): 13 units from Quitman\'s Historical Sketch and regimental histories; register the rest',
    'conf-tn': 'Tennessee (Confederate): 3 units; no whole-war roll is open; search the Internet Archive and register the gap',
    'conf-ar': 'Arkansas (Confederate): 1 unit (3rd Arkansas) from the Appomattox paroles and regimental sources',
    'conf-cs-staff': 'General and staff officers of the Army of Northern Virginia (Confederate): 1 headquarters entry; officers named in the Official Records',
}

# What exists on 14 November 2026 for the items that were started (Measured: pipeline2/build_index.py, build_index.py --lint, the stored
# verify logs GOVERNANCE/horde/ws-rosters/plan/verify-*.jsonl, the reports).  A snapshot: open_groups.py reads the files, not this table.
STARTED = {
    'union-me': {'state': 'round 1 closed', 'unit_files': 14, 'rows': 33105, 'sources_read': ['ME-SUPP-1867 (index)', 'ME-AGR-1863-APPD (returns)', 'ME-GETT-1898 (participants)'],
                 'report': 'rosters/reports/union-me.md', 'pointer': 'rosters/sources/union-me.json', 'verify': '15 files, 0 name defects, 0 page defects (the report)',
                 'open': 'EG-ROS-ME-01 to -07 (round 2 below); R-G9 not run'},
    'union-nh': {'state': 'round 1 closed', 'unit_files': 4, 'rows': 6992, 'sources_read': ['NH-AYLING-1895 (two volumes)'],
                 'report': 'rosters/reports/union-nh.md', 'pointer': 'rosters/sources/union-nh.json', 'verify': 'verify_unit.py --all: 0 name and 0 page defects; app/tests/roster-union-nh.test.mjs 23 pass (the report)',
                 'open': 'EG-ROS-NH-01 to -04 (officers register not carried as rows; damaged entries; the sideways Adjutant General reports; Summary residuals): round 2; R-G9 not run: roster-qa'},
    'union-vt': {'state': 'round 1 closed', 'unit_files': 11, 'rows': 16854, 'sources_read': ['VT-ROSTER-1892'],
                 'report': 'rosters/reports/union-vt.md', 'pointer': 'rosters/sources/union-vt.json', 'verify': '11 of 11 files ok in the stored log verify-union-vt.jsonl (0 V1, 0 V3 defects)',
                 'open': 'EG-ROS-VT-01 to -06: six printed lines whose name the text layer lost, damaged date cells (40 percent), prose notes, no list of men present (roster-gettysburg-lists), the 1866 report not read: round 2; R-G9 not run: roster-qa'},
    'union-ma': {'state': 'round 1 open: files done, closure files missing', 'unit_files': 24, 'rows': 33748, 'sources_read': ['MA-SSM-1931 (volumes 1 to 6)'],
                 'report': None, 'pointer': None, 'verify': '24 of 24 files ok in the stored log verify-union-ma.jsonl (0 V1, 0 V3 defects); build_index.py --lint: 0 defects, 5 warnings (no rights basis in a pointer file that does not exist yet)',
                 'open': 'pointer file, rights note, reconciliation, report, gaps, CLOSED.json'},
}

# Open work of a closed item that is NOT a gap to register but source text that is already pinned or named: the item is returned a second
# time (same id) by open_groups.py until GOVERNANCE/horde/ws-rosters/<id>/CLOSED-R2.json exists.
ROUND2 = {
    'union-me': {
        'summary': '1898 casualty and special-duty lists, 1861 muster-in returns, Appendix I of 1863 (deceased), lines of unreadable unit',
        'tasks': [
            'EG-ROS-ME-01 and -02: parse the casualty lists ("Revised Report of Casualties") and the run-in special-duty paragraphs of ME-GETT-1898 (text pinned, parser union_me/me_gett.py) as further segments of the 14 unit files; a casualty list states presence (killed, wounded, captured): keep the printed sentence as the remarks.',
            'EG-ROS-ME-03: parse the 1861 muster-in returns of ME-APPD-1861 (text pinned; the report gives leaves 77 onward, the 3rd to 7th Regiments, printed pp. 121 onward) as segments; adapt the returns parser union_me/me_agr.py.',
            'EG-ROS-ME-04: parse Appendix I of the 1863 volume (deceased Maine volunteers, leaves 1300 to 1328 as the report states them; name, company and regiment in two column sets) as segments of the unit files named by the regiment column; a line whose regiment is unreadable goes to _other-ME-AGR-1863-APPD.jsonl.gz.',
            'EG-ROS-ME-05: the 3,666 index lines of unreadable unit (_other-ME-SUPP-1867.jsonl.gz) and the 106 index lines without a name: re-read with the page-image route of roster-qa once that item has tested it; never guess a unit or a name.',
            'Regenerate the report, the pointer file, the flag files and the index; keep every earlier line byte for byte where its source did not change; write CLOSED-R2.json.',
        ]},
}

ROUND2['union-nh'] = {
    'summary': 'the Register of Commissioned Officers as a segment, the sideways Adjutant General reports, page-image reads of the leaves the report names',
    'tasks': [
        'EG-ROS-NH-01: carry the Register of Commissioned Officers of the Ayling volume (vol. 2, printed pp. 1225-1248; text pinned) as a further segment of the four unit files with a second parser (rank headings as the carried rank rk; the "Not mustered" marks stay in the remarks as printed). The report records that 21, 15, 11 and 0 register lines of the 2nd, 5th, 12th and the battery match no roll row.',
        'EG-ROS-NH-03: test a rotated or orientation-detected read (tesseract on the text PDF, PRODUCTION-PLAN section 9.5) on three leaves of the sideways Adjutant General volumes that pipeline2/nh_agr_probe.py lists; look at the page with the Read tool; if the read agrees with the page, parse the three roster volumes as a second reading of the roll, otherwise record the test as the reason the gap stays.',
        'EG-ROS-NH-02 and -04: read the leaves the report names (damaged entries, the four Summary leaves, the 12th and 5th register leaves) with the same route and record what the page shows; a stored row is never overwritten, a row the text layer lost is added only with its own locator.',
        'Regenerate the report, pointer file, flag files and index; write CLOSED-R2.json.']}
ROUND2['union-vt'] = {
    'summary': 'the 1866 Adjutant General report as a second reading (probe first), the six lost names, the prose notes',
    'tasks': [
        'EG-ROS-VT-05: fetch and pin VT-AGR-1866 (Internet Archive reportofadjutant00verm), probe its text layer as pipeline2/nh_agr_probe.py did for New Hampshire, and if it reads parse the 11 units as a second segment; otherwise the probe is the recorded reason.',
        'EG-ROS-VT-01 and -02: after roster-qa has tested the page route, read the six leaves named in GOVERNANCE/horde/ws-rosters/union-vt/diag-no-name.json and write the names found as a segment of their own with their own locator; never alter a stored row; the damaged date cells (flags E and M) are read the same way only where the test showed the route reliable.',
        'EG-ROS-VT-03: the two prose notes at the foot of roll pages (William Scott; the Palmer brothers) as a list segment, printed words only.',
        'Regenerate the report, pointer file, flag files and index; write CLOSED-R2.json.']}

# Cross-cutting items.  roster-gettysburg-lists and roster-qa are returned as items; roster-index and roster-app are done by the
# Integrate step of the workflow (build_index.py already writes data2/INDEX.json and rosters/status.json) and are kept here as specifications.
CROSS = [
    {'id': 'roster-gettysburg-lists', 'title': 'Statements of presence at Gettysburg that no roll prints', 'army': 'both', 'returned_as_group': True,
     'engineer_note': 'The build prompt speaks of one state item, its units, a pointer file and a manifest. For this item only the tasks below apply: the sources are the four named, the files are the sidecars of output_contract, the pointer file is rosters/sources/roster-gettysburg-lists.json (same form) and the report is rosters/reports/roster-gettysburg-lists.md; write CLOSED.json last.',
     'depends_on': 'nothing (units.json and the local texts); it writes only files of its own, so it can run beside the state items',
     'output_contract': 'data2/<army>/<state>/<unit>.lists.jsonl.gz: one roster2/2 file per unit that has such a name (same header form as a unit file, "n" = rows; segments of the list sources); never rows inside a state item\'s unit file. pipeline2/build_index.py lists them as the sidecar "lists" of the unit.',
     'tasks': [
         'Officers named in the Official Records vol. 27 reports and returns (local text tmp/library/or27, index docs/battle-theatre/library/or27_index.json, tools/bt/or27_find.py): one row per named officer and unit, the printed sentence as the remarks, offsets in the pinned OR text (a ledger entry of its own); the units of the Gettysburg order of battle are the 640 of data2/units.json.',
         'The Soldiers\' National Cemetery burial lists (PA-CEM-1867: Internet Archive revisedreportmad00penn and revisedreportma00cemegoog; the local copies CEM-REPORT-1867 and CEM-BARTLETT-1874 in tmp/library/ws9): the named dead by state and unit, graves as printed; Confederate dead reburied in Richmond (lists not located, C15) stay a registered gap.',
         'The 1863 newspaper casualty lists on chroniclingamerica.loc.gov (one test request, then at most one request per second; stop and record a block): Richmond and state dailies of July to September 1863 for the Confederate units, the New York, Philadelphia and Boston dailies for the Union units; names as printed, never completed.',
         'State commission and regimental volumes already local in tmp/library/ws9 (NJ-TOOMBS-1888, NJ-FINAL-1891, VT-MON-1890, OH-DED-1887, OH-8TH-1889, IN-1913, MN-1ST-1916, MA-BURIAL-1863, the Pennsylvania at Gettysburg volumes) and the 1913 Michigan survivors list: take only those that the state item of the same state recorded as "not parsed" (read rosters/reports/<state item>.md section 6 first); the state items parse their own lists as segments of their unit files.',
         'Write CLOSED.json with the sources done and the sources recorded as blocked or not found.'],
     'gates': ['every row locatable (V1 to V3) in its own pinned text', 'a stated presence is only what the list prints: no inference from a name on a roll', 'nothing from a modern compilation', 'build_index.py --lint reports no defect']},
    {'id': 'roster-qa', 'title': 'Independent sample of stored lines against page images', 'army': 'both', 'returned_as_group': True,
     'engineer_note': 'The build prompt speaks of parsing units, a pointer file and a manifest. This item parses nothing new: it samples stored lines against page images and tests the second-reading route (tasks below); the report is rosters/reports/roster-qa.md, the data is data2/qa/*.json, and CLOSED.json (with "covers") is written last. Never change a stored line: a defect goes back to its item as a dated list in the report and in rosters/GAPS.md.',
     'depends_on': 'the unit files that exist; re-opened by open_groups.py when further items close',
     'output_contract': 'data2/qa/<item or source family>.json (plain JSON, never .jsonl.gz: verify_unit.py --all globs every .jsonl.gz under data2) and rosters/reports/roster-qa.md; one CLOSED.json whose "covers" lists the items sampled.',
     'tasks': [
         'Implement PLAN.md section 4.4 on the roster2/2 files with the route of PRODUCTION-PLAN section 7 (the text PDF through archive.org/cors, one page cut out with pdftoppm, the page image LOOKED AT with the Read tool as the independent reader; tesseract is the bulk second reader, not the sample reader): a seeded draw of pages per stratum (source family by layout; officers pages; the lowest decile of OCR damage flags), every row of a drawn page compared with the page for name, rank, company and remarks; counts, error kinds, the one-sided 95 percent Clopper-Pearson bound and every disagreement written to data2/qa/. The page images are transient and never stored.',
         'Round 1 (now): the four closed items ME, NH, VT, MA. Draw a smoke sample first (about 10 pages per source family and layout) to see the error kinds early, report them to the next engineers by a dated note in rosters/PRODUCTION-PLAN.md section 9 (a shell append, never a rewrite), then the full draw: 299 rows with zero errors give an upper bound of 1.0 percent, 628 rows with at most two errors per stratum.',
         'Re-verify the claims of each closed item\'s report against its files (row counts, verify_unit.py --all, build_index.py --lint, hashes of the pinned texts); list every claim that does not hold.',
         'Test the second-reading route before any use: 20 known pages per source family read with tesseract and compared with the printed page; report the agreement; then try it on the known losses (VT six lost names, ME lost names, the Pennsylvania muster years on 2,039 pages, the Florida 6.1 percent) and write any recovered row only with its own locator (a segment of a ledger text derived from the page read), never into an existing row.',
         'Later rounds (open_groups.py re-opens this item at the end of the list when new items close): the same sample for the new items.'],
     'gates': ['R-G1 names 99 percent or better', 'R-G2 dates', 'R-G9 independent sample passed for every stratum before publication; a stratum that fails goes back to its parser as a dated defect list', 'no gate is lowered for a failing stratum']},
    {'id': 'roster-index', 'title': 'Index, whole-set verification and size report', 'army': 'both', 'returned_as_group': False,
     'done_by': 'the Integrate step of the workflow; pipeline2/build_index.py exists (INDEX.json, rosters/status.json, --lint, --verify)',
     'depends_on': 'every state item (re-run at the end)',
     'tasks': ['Run build_index.py --write, --lint and --verify (through tools/horde/bench.sh) and publish the counts; fail on any V1 or V3 defect.',
               'Conservation per unit against the earlier CSV rows (rosters/data): listed, never resolved by guessing; the per-item differences files are in GOVERNANCE/horde/ws-rosters/<item>/.',
               'Size rule: the raw total of unit files is measured by build_index.py; the files are gzipped (DD-ROS-03); if the measured raw total ends under 80 MB the owner may choose plain files.'],
     'gates': ['R-G6 every row has a locator that resolves (verify_unit.py)', 'R-G7 conservation reported per unit', 'R-G8 no row without a source row']},
    {'id': 'roster-app', 'title': 'Roster section of the web page (docs/battle-theatre/app/roster)', 'army': 'both', 'returned_as_group': False,
     'done_by': 'the Integrate step of the workflow', 'depends_on': 'data2/INDEX.json and the unit files',
     'tasks': ['A reader for roster2/2 (gunzip with DecompressionStream, one file per unit, no server) and the sidecars named by the index: flags (roster2-flags/1; show the legend of the file, not a fixed table), cells (roster2-cells/1), lists (<unit>.lists.jsonl.gz); tests in app/tests/roster*.test.mjs on the real files.',
               'The page of PLAN.md section 4.2 without per-man presence labels: search by name and unit; the unit page with its segments, sources and rights; the printed remark as printed; a mark where a source states presence (a remark naming Gettysburg, a participants, casualty or burial list); "damaged in the text layer" on ocr_uncertain rows; "on the rolls in July 1863 (inferred from printed dates)" only with its basis; cross-reference lines shown as such; "n present, names not recovered" and the gap id on every unit with a gap.',
               'Rights per name: each row shows its segment source, volume, printed page and the ledger rights text; no file of the page may mention how the data was made (the copy audit allows the printed word in the name field only, DD-STG-02).'],
     'gates': ['copy audit (CLAUDE.md)', 'keyboard use, phone width, no colour-only marks', 'no per-man presence label is shown unless a source states it']},
]

# First tasks of the items that were started: they replace the planning-time text above so that nobody redoes finished work.
FIRST_TASKS['union-me'] = ['Round 1 is closed (14 unit files, 33,105 lines, three sources, report rosters/reports/union-me.md): do not redo it. The open work is the entry "round2" of this item.']
FIRST_TASKS['union-nh'] = ['Round 1 is closed (4 unit files, 6,992 lines, report rosters/reports/union-nh.md): do not redo it. The open work is the entry "round2" of this item; the independent sample is roster-qa.']
FIRST_TASKS['union-vt'] = ['Round 1 is closed (11 unit files, 16,854 lines, report rosters/reports/union-vt.md): do not redo it. The open work is the entry "round2" of this item; the independent sample is roster-qa.']
FIRST_TASKS['union-ma'] = [
    '24 unit files exist (33,748 rows, flag files, verify_unit.py ok on all 24, build_index.py --lint 0 defects): do not re-parse. Finish the item: (1) the pointer file rosters/sources/union-ma.json (form roster2-sources-pointer/1 as union-me.json) with the rights basis of every text id used (MA-SSM-1931.1 to .6 and MA-SSM-1937-INDEX), the 1931-37 imprint question in its rights note (PRODUCTION-PLAN section 8, owner step 4) and tmp/library/rosters/MANIFEST-union-ma.json; build_index.py --lint warns until the pointer file exists.',
    '(2) Reconcile with the earlier rows (rosters/data/NE/massachusetts): per-unit row and company counts, rows only in one reading, to GOVERNANCE/horde/ws-rosters/union-ma/differences-<unit>.csv; resolve none by guessing; resolve the 5th Massachusetts Battery (E) and the two OOB batteries E and F that match no OR battery (G-NE02).',
    '(3) rosters/reports/union-ma.md in the section order of reports/union-vt.md (summary, lines per unit against strength, the unit files and flag codes, sources and rights, checks, anomalies, gaps), gaps as G-MA lines appended to rosters/GAPS.md and proposed register entries EG-ROS-MA-nn under GOVERNANCE/horde/ws-rosters/proposed-register/, a request note for the flag legend if it differs from union-me and union-nh, one progress line, then CLOSED.json.']

ROUND2_NOTE = ('Round 1 of this item is closed. Do only the tasks of "round2" below. The build prompt\'s sentences about acquiring and parsing the whole item describe round 1 and do not apply to what is done: '
               'keep every existing line byte for byte unless its source text changed, add new material as new segments or sidecars, regenerate the report and the pointer file, write CLOSED-R2.json last.')
