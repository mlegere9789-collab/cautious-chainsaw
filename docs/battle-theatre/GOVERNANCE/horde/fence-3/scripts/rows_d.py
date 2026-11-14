import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from rowlib import Row
from cite import OR, SV, LIB, WEB, NPSW

WIKI = 'Wikipedia (not an admissible source, Law cl.4)'


def S077():
    R = Row('S-077')
    o1 = R.cite(NPSW('overview', 'To meet the demand, Camp Letterman General Hospital was established east of Gettysburg where all of the wounded were eventually taken to before transport to permanent hospitals in Philadelphia, Baltimore and Washington.'))
    o2 = R.cite(NPSW('overview', 'over 20,000 injured Union and Confederate soldiers that passed through the hospital’s wards'))
    o3 = R.cite(NPSW('overview', 'By January 1864, the last patients were gone as were the surgeons, guards, nurses, tents and cookhouses.'))
    le = R.cite(OR(1, 'who was left in charge of the hospitals at Gettysburg', rec='OR27-1-R016', note='Letterman, Medical Director, of Dr. [Henry] Janes; the next page adds that Janes "was left in general charge of the hospitals".'))
    gm = R.cite(LIB('NPS-GMP-1999-V1', 'General Hospital at Camp Letterman are some of these sites', title='NPS Final General Management Plan / EIS vol. 1 (1999)', note='Sentence: "...wounded were treated in makeshift hospitals, and later at the U.S. General Hospital at Camp Letterman are some of these sites."'))
    R.sub('camp_established_east_of_gettysburg_for_the_wounded', 'Camp Letterman General Hospital was established east of Gettysburg, where all of the wounded were eventually taken before transport to permanent hospitals; over 20,000 Union and Confederate wounded passed through its tented wards.', 'documented', [o1, o2, gm],
          why='NPS overview and General Management Plan (institutional secondary). The row\'s from-state "farm" is not described.')
    R.sub('medical_department_trigger', 'The Medical Department (Letterman) left Dr. Henry Janes in charge of the hospitals at Gettysburg in July 1863.', 'documented', [le], support='partial',
          why='Letterman\'s report names the officer in charge; it does not name or date the camp.')
    R.sub('closed_by_january_1864', 'The camp had emptied by January 1864: patients, surgeons, guards, nurses, tents and cookhouses gone.', 'documented', [o3],
          why='The printed "closes Nov 20" is therefore not the end of the camp\'s use (NPS gives January 1864; NPS event pages reported by a search summary give 19 Nov as the end of the patient period, page not fetched).')
    R.sub('construction_jul_10_opening_jul_20_or_22_and_nov_20', 'Construction began on 10 Jul; the camp opened on 20 Jul (ABT) or 22 Jul (CWN, Wikipedia) and closed on 20 Nov.', 'open_gap', [], support='none',
          why='No local text gives any of these dates; the two opening values of conflict C-044 stay selectable and unsourced here. NPS event pages (found only through a search summary) give 20 Jul to 19 Nov 1863 as the operating window; not fetched, so not cited.')
    R.lookup('OR27-1 R016 and the library: Camp Letterman, general hospital at Gettysburg, July 1863', 'OR27, ws9, NPS texts', 'NPS overview, GMP; Letterman names Janes only', 'done')
    R.lookup('Library of Congress search API (Chronicling America, 10 Jul to 31 Dec 1863, "Camp Letterman"), one request', 'web (reachable host)', '0 results', 'failed')
    R.lookup('WebSearch (lead only): NPS Camp Letterman dates', 'web', 'a search summary reports NPS event pages with 20 Jul to 19 Nov; the URLs were not returned and nothing was cited from them', 'done')
    R.unsupported('Construction on 10 Jul, the opening day (20 or 22 Jul) and the closing day 20 Nov.')
    return R.finish('partially_supported', 'blocked_host',
        'Camp Letterman General Hospital stood east of Gettysburg and received the wounded of both armies (over 20,000 passed through it) under the Medical Department; by January 1864 the last patients, staff and tents were gone (NPS). The printed dates (construction 10 Jul, opening 20 or 22 Jul, closing 20 Nov) have no local source.',
        register=['fence-3-EG-15'],
        blocked_host=[{'url': 'ABT (American Battlefield Trust, Camp Letterman: key ABT-Letterman), CWN (Civil War News: key CWN-Letterman), CWMed (Civil War Medicine: key CWMed-Letterman)', 'what_to_read': 'The plan prints keys and titles only. The opening day (20 Jul per ABT, 22 Jul per CWN and Wikipedia), construction from 10 Jul and the closing day 20 Nov. Hosts not in the reachable list. The NPS event pages that a search summary quotes (20 Jul to 19 Nov 1863) should be located on www.nps.gov and read.'}],
        product=['State schedule S-077 / H-23: keep the C-044 scenarios (open 20 Jul, open 22 Jul) with no default and no local source for either; closing: January 1864 is documented (NPS overview), 20 Nov is the end of the patient period only per an unread NPS event page; construction from 10 Jul is an open-gap marker.'])


def S078():
    R = Row('S-078')
    c1 = R.cite(LIB('NPS-CLR-1STDAY.raw', 'On April 6, 1895, just two months after the establishment of Gettysburg National Military Park', title='NPS Cultural Landscape Report, First Day, Union 1st Corps Battlefield (2021), pdf p.145', note='Sentence continues "the tenant-occupied McPherson farmhouse burned to the ground. The fire started in a flue in the rear log wing of the house". Quoted from the content-stream-order text variant (NPS-CLR-1STDAY.raw.txt).'))
    c2 = R.cite(LIB('NPS-CLR-1STDAY.raw', 'the tenant-occupied McPherson farmhouse burned to the ground', title='NPS Cultural Landscape Report, First Day, Union 1st Corps Battlefield (2021), pdf p.145'))
    c3 = R.cite(LIB('NPS-HS-MCPHERSON', 'burned down in the spring o f 1895', title='NPS, Edward McPherson Farm: Historical Study, pdf p.84', note='Sentence: the John Slentz family "stayed on until the house burned down in the spring of 1895"; OCR letter-spacing "o f". The note on the next page cites "Two Dwellings Burned", Gettysburg Compiler, 9 Apr 1895, p.3.'))
    c4 = R.cite(NPSW('bldgs', 'The home burned down in 1895'))
    R.sub('house_burned_6_apr_1895', 'The McPherson farmhouse burned on 6 Apr 1895 (the fire began in a flue of the rear log wing).', 'documented', [c1, c2, c3, c4],
          why='Three NPS documents agree (CLR 2021 gives the day; the 1980s historical study gives the spring of 1895 and cites the Compiler of 9 Apr 1895, not local; the web page gives 1895).')
    R.sub('barn_survives_and_house_standing_through_the_battle', 'The house stood through the battle and was lost only in 1895; the barn survives (RULE-01: the McPherson barn does not burn in the battle).', 'documented', [c4, c1],
          why='NPS: "the McPherson barn is the only remnant of the farm today".')
    R.sub('out_of_battle_scope', 'The row is not part of the battle animation (1895).', 'documented', [c1], why='A date 32 years after the battle.')
    R.lookup('NPS texts and pages: McPherson house burned 1895', 'NPS texts and pages', 'quotes above', 'done')
    R.unsupported('Nothing printed in the row is unsupported.')
    return R.finish('confirmed', 'closed',
        'The McPherson farmhouse burned to the ground on 6 Apr 1895 (NPS CLR 2021; the historical study gives the spring of 1895 and the Compiler of 9 Apr 1895); the house and barn stood through the battle and only the barn survives. Not scheduled in the battle animation.',
        register=[],
        product=['State schedule S-078 (out of scope, not scheduled): no change; RULE-01 (the McPherson barn does not burn) is supported. The date can be sharpened to 6 Apr 1895.'],
        changes=['The shard row was a negative check; three NPS documents now support it with a day.'])


def S079():
    R = Row('S-079')
    c1 = R.cite(LIB('NPS-CLI-PCB', 'CE 1884 Built Nicholas Codori barn is built.', title="NPS Cultural Landscapes Inventory: Pickett's Charge Battlefield (2024), chronology, pdf p.41"))
    c2 = R.cite(LIB('NPS-CLI-PCB', 'Nicholas Codori Farm: Barn. (1884, Contributing)', title="NPS Cultural Landscapes Inventory: Pickett's Charge Battlefield (2024), pdf p.96", note='Entry continues "The 2-story, 43x80-foot Pennsylvania bank barn features vertical flush laid siding and tongue & groove wainscot."'))
    R.sub('codori_barn_of_1863_does_not_survive', 'The Codori barn that stands now was built in 1884; the barn of 1863 does not survive.', 'documented', [c1, c2],
          why='NPS inventory: the existing bank barn is dated 1884. It does not say when or how the earlier barn went; "torn down 1882" has no local source.')
    R.sub('torn_down_1882', 'The original Codori barn was torn down in 1882.', 'open_gap', [], support='none', why='No local text gives 1882 or a demolition (the 1884 construction makes a removal before 1884 likely).')
    R.sub('rose_barn_burned_1910', 'The Rose barn burned in 1910.', 'open_gap', [], support='none', why='Searched the NPS inventories and records of treatment for the Rose barn: no passage gives a fire or 1910.')
    R.lookup('NPS texts: Codori barn demolished 1882, Rose barn burned 1910', 'NPS-CLI-PCB, NPS-CLI-ERR, NPS-CLR-ROT-V1/V2, NPS-GMP-1999', 'only the 1884 Codori barn entries', 'done')
    R.unsupported('The year 1882, the way the Codori barn went, and the Rose barn fire of 1910 (PDF sources SS-Rose and SS-Codori).')
    return R.finish('partially_supported', 'blocked_host',
        'The Codori barn standing now is a bank barn of 1884, so the barn of 1863 is gone (NPS); the plan\'s 1882 demolition and the Rose barn fire of 1910 have no local source. Both rows are outside the battle animation.',
        register=['fence-3-EG-15'],
        blocked_host=[{'url': 'https://gettysburg.stonesentinels.com/battlefield-farms/', 'what_to_read': 'The Codori and Rose farm entries (keys SS-Codori, SS-Rose): the 1882 removal of the Codori barn and the 1910 fire of the Rose barn. Lead sources; host refused (403) at the fence-2 probe.'}],
        product=['State schedule S-079 (out of scope, not scheduled): the Codori barn of 1863 is absent after 1884 at the latest; keep 1882 and 1910 as marked gaps.'])
