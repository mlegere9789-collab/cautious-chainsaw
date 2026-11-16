#!/usr/bin/env python3
"""Fill source_meta.json for the sources added on 2026-11-16 (official nps.gov pages, park newsletters, 2025 inventories, trails plan)
and add the reason for every new source that has no extract to not_extracted.json.

What a document says about itself is read from the saved text: the release date of a news release from its 'News Release Date:' line,
the issue of a newsletter from its masthead. Nothing is taken from memory. Run with python3 -I (idempotent)."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')

NOTE = {
    'NEWS': 'A news release dates the work it reports: a fence, wall, orchard, woodlot treatment, restoration or replanting announced in it is a modern or rebuilt state (use indirect) and never an 1863 profile; what it says about 1863 is use direct (hedged where it names no basis); later features (monuments, towers, the Cyclorama building, Camp Colt) are use none.',
    'HC': 'A page of the park history and culture section. The state-monument pages are finding aids of the park\'s monument files: their dates are those of the archival letters and programs they list and every monument is a later feature (use none); the Little Round Top pages describe the rehabilitation of 2022-2024 (use indirect) beside statements about 1863.',
    'NATURE': 'A natural-resource page of the park (undated): species and conditions as of the page (use indirect); a statement about the time of the battle names no source.',
    'EDU': 'A student-program page of the park: lesson narratives name no source (hedged); a reprinted account is the account of its author; claim lists are what the claimant listed.',
    'ART': 'An article of the National Park Service: it supports what it says; later features (Camp Colt of 1917-1919, the Cyclorama building of 1962, modern houses) are use none.',
    'EISE': 'A page of Eisenhower National Historic Site: statements about the farm in 1863 and about the later works of the 1950s (use none).',
}


def category(sid):
    m = re.match(r'NPSGOV-(NEWS|HC|NATURE|EDU|ART|EISE)-', sid)
    return m.group(1) if m else None


def release_date(sid):
    p = os.path.join(LIB, 'pages', sid, sid + '.txt')
    if not os.path.exists(p):
        return None
    m = re.search(r'News Release Date:\s*([A-Z][a-z]+ \d{1,2}, \d{4})', open(p, encoding='utf-8').read())
    return m.group(1) if m else None


NEWSLETTER = {  # issue masthead as printed on page 1 ('The official newsletter of Gettysburg National Military Park', season, volume and number)
    'V12N3': ('Fall 2005', 'Vol. 12, No. 3'), 'V13N1': ('Summer 2006', 'Vol. 13, No. 1'), 'V13N2': ('Fall 2006', 'Vol. 13, No. 2'),
    'V14N2': ('Fall 2007', 'Vol. 14, No. 2'), 'V15N1': ('Fall 2008', 'Vol. 15, No. 1'), 'V16N1': ('Spring 2009', 'Vol. 16, No. 1'),
    'V16N2': ('Fall 2009', 'Vol. 16, No. 2'), 'V17N1': ('Winter/Spring 2010', 'Vol. 17, No. 1'), 'V17N2': ('Summer 2010', 'Vol. 17, No. 2'),
    'V17N3': ('Fall 2010', 'Vol. 17, No. 3'), 'V18N1': ('Winter 2010/2011', 'Vol. 18, No. 1'), 'V18N2': ('Spring 2011', 'Vol. 18, No. 2'),
    'V18N3': ('Fall 2011', 'Vol. 18, No. 3'), 'V18N4': ('Winter 2011/2012', 'Vol. 17, No. 4 (as printed; the index of the host site says 17(18?))'),
    'V19N3': ('Fall 2012', 'Vol. 19, No. 3'), 'V19N4': ('Winter 2012/2013', 'Vol. 19, No. 4'),
}

NOT_EXTRACTED = {
    'NPS-EISE-CLI-LANDSCAPE-2025': 'read by keyword (the 2025 edition of the inventory of the Eisenhower farms): its significance statements and farm histories repeat the passages of the 2004 edition already extracted (NPSX-EISE-CLI-LANDSCAPE-p033-*) and the history of Farms 1 to 3 is in the cultural landscape report (NPS-EISE-CLR1); owed: a page-by-page second reading of the 2025 edition against the 2004 text',
    'NPS-EISE-NR-FARMSTEAD': 'typescript with a damaged text layer, about the purchases of the Eisenhower farm in 1950-1957; no statement on 1863; not extracted',
    'NPS-NEWSLETTER-V12N3': 'read by keyword: the one sentence on bringing back missing features of 1863 is cut by the column break (it continues on page 3); the rest is the Cyclorama program and the cannon carriages; no extract',
    'NPS-NEWSLETTER-V13N1': 'read by keyword: the merger of the two foundations in 2006 and the plan to remove modern intrusions from Cemetery Ridge; no statement on 1863; no extract',
    'NPS-NEWSLETTER-V15N1': 'read by keyword: the demolition plan for Cemetery Ridge to be completed in 2009 and the opening of the museum; no statement on 1863; no extract',
    'NPS-NEWSLETTER-V18N2': 'read by keyword: the Harman farm acquisition (extracted from the nps.gov release) and the buildings of the Eisenhower site; no extract of its own',
    'NPS-NEWSLETTER-V19N4': 'read by keyword: programs of the anniversary of 2013; no landscape statement; no extract',
    'NPS-TOURIST-GUIDE': 'skipped and deleted: a commercial visitor guide of about 1970 with advertisements, not a United States government work (see the catalogue entry)',
    'NPS-TRAILS-PLAN-DEA-2026': 'read by keyword (a draft environmental assessment of November 2026, modern): its statements on the 1863 landscape (PDF p. 49: fields converted to patches of native grasses, the goal of the landscape of July 1863) repeat the nps.gov pages already extracted; owed: a second reading of the cultural resources chapter (PDF pp. 44-52)',
    'NPSGOV-ART-ADVANCE-TO-BREAK-THE-DEADLOCK-AT-GETTYSBURG-BATTLEFIELD': 'read: a summary of a Teaching with Historic Places lesson; no statement on the landscape',
    'NPSGOV-ART-AFRICAN-AMERICANS-GETTYSBURG': 'keyword scan only (no landscape word); not read in full; owed',
    'NPSGOV-ART-ALONZO-CUSHING-GETTYSBURG': 'read: repeats the sentence on the stone wall of the Angle that is extracted from NPSGOV-HC-CUSHING-AT-GETTYSBURG',
    'NPSGOV-ART-CHARGE-FOR-VICTORY-OR-DEFEAT-AT-GETTYSBURG': 'keyword scan: no landscape statement',
    'NPSGOV-ART-CHRISTMAS-EVE-ON-A-GETTYSBURG-FARM': 'read: a poem of 1955 and its story (the Eisenhower farm); no statement on 1863',
    'NPSGOV-ART-CITIZENSHIP-AT-CAMP-COLT': 'keyword scan: Camp Colt of 1918 (a later feature); the camp facts are extracted from NPSGOV-ART-CAMP-COLT; owed: a reading for the layout of the camp',
    'NPSGOV-ART-DYING-IN-THE-HOSPITAL': 'read: a poem of 1864 from the Penn School of South Carolina; not about Gettysburg',
    'NPSGOV-ART-FROM-THE-FRONT-LINES-TO-THE-HOSPITAL': 'read: aid stations of Manassas and Frederick in the Maryland campaign; no Gettysburg statement',
    'NPSGOV-ART-GETTYSBURG-CAMPAIGN': 'read: a stub of a few lines',
    'NPSGOV-ART-GETTYSBURG-PARTNERSHIP': 'read: the pruning of the historic orchards by the Friends; repeats the news release extracted from NPSGOV-NEWS-GETTYSBURG-ORCHARDS',
    'NPSGOV-ART-NPS-GEODIVERSITY-ATLAS-GETTYSBURG-NATIONAL-MILITARY-PARK-PENNSYLVANIA': 'keyword scan: the geology of the park; no statement on the 1863 landscape; owed',
    'NPSGOV-ART-PHOTOGRAMMETRY-GETTYSBURG-CULTURAL': 'read: a cultural resource monitoring example; no statement on 1863',
    'NPSGOV-EDU-ESSENTIAL-BACKGROUND-THE-BATTLE-OF-GETTYSBURG': 'keyword scan: a general narrative of the battle; no landscape statement',
    'NPSGOV-EDU-FALLEN-SOLDIERS-EDUCATION-PROGRAM': 'read: a program description; no landscape statement',
    'NPSGOV-EDU-FALLEN-SOLDIERS-POST-VISIT-LESSON': 'read: a short lesson text; no landscape statement',
    'NPSGOV-EDU-FIELD-HOSPITAL-EDUCATION-PROGRAM': 'read: a program description and the oaths; it names no Gettysburg hospital site',
    'NPSGOV-EDU-PICKETT-S-CHARGE-EDUCATION-PROGRAM': 'read: a program description; no landscape statement',
    'NPSGOV-EDU-ROUND-TOPS-EDUCATION-PROGRAM': 'read: a program description (Oates and Chamberlain); no landscape statement',
    'NPSGOV-EDU-ROUND-TOPS-FIELD-TRIP-PRE-VISIT-LESSON': 'read: a lesson that reprints a novel and Chamberlain\'s report; the report is in the local Official Records',
    'NPSGOV-EDU-SLYDER-FAMILY-FARM-EDUCATION-PROGRAM': 'read: a program description; the lesson pages of the program are extracted',
    'NPSGOV-EDU-THE-ROUND-TOPS-POST-VISIT-LESSON': 'keyword scan: reprinted passages of the Official Records (Oates, Chamberlain and others, with their stone wall and stone fence); the reports are in the local Official Records and the page is not their source; no extract',
    'NPSGOV-EISE-LEARN-HISTORYCULTURE-EISENHOWERS-IN-GETTYSBURG': 'read: an index page of stories',
    'NPSGOV-EISE-LEARN-HISTORYCULTURE-PLACES': 'read: the purchase of the farm in 1950; no statement on 1863',
    'NPSGOV-EISE-LEARN-NATURE-NATURALFEATURESANDECOSYSTEMS': 'read: a short page on the natural features of the Eisenhower site (modern); no statement on 1863',
    'NPSGOV-EISE-LEARN-NATURE-TREESANDSHRUBS': 'read: a short page on trees and shrubs of the Eisenhower site (modern); no statement on 1863',
    'NPSGOV-HC-FLOWERING-PLANTS-LITTLE-ROUND-TOP': 'an image gallery with captions only (no text of its own)',
    'NPSGOV-HC-LITTLE-ROUND-TOP-GRASSES': 'an image gallery with captions only (no text of its own)',
    'NPSGOV-HC-LITTLE-ROUND-TOP-TREES': 'an image gallery with captions only (no text of its own)',
    'NPSGOV-HC-LRT-PROGRESS-PHOTOS': 'an image gallery with captions only (no text of its own)',
    'NPSGOV-NATURE-NONNATIVESPECIES': 'read: invasive plants of the park (modern); no statement on 1863',
    'NPSGOV-NEWS-BENNER-BARN-VANDALISM': 'read: a vandalism notice of 2024; no statement on the barn in 1863',
    'NPSGOV-NEWS-CEMETERY-RIDGE-REHAB-PROJECT': 'read: detours and parking for the Cemetery Ridge project of July 2016 (it reduces the parking area at Ziegler\'s Grove and brings back missing features); modern; no extract',
    'NPSGOV-NEWS-CENTURY-OF-SACRIFICE': 'read: a ranger program of 2023 on the national cemetery; no landscape statement',
    'NPSGOV-NEWS-CEREMONIAL-RIBBON-CUTTING-HELD-TO-CELEBRATE-THE-REOPENING-OF-LITTLE-ROUND-TOP': 'read: the reopening of Little Round Top on June 24, 2024 after a closure of twenty-two months and a project of $12.9 million; a modern rehabilitation; no statement on 1863',
    'NPSGOV-NEWS-CLOSURE-LITTLE-ROUND-TOP': 'read: the start of the rehabilitation in July 2022 (degraded vegetation, erosion, parking); modern; no statement on 1863',
    'NPSGOV-NEWS-COSTER-AVENUE': 'read: a closure of Coster Avenue to buses; no statement',
    'NPSGOV-NEWS-CULPS-HILL-PAVING-2024': 'read: a road paving notice; no statement',
    'NPSGOV-NEWS-CULTURAL-RESOURCE-SPECIALIST-RECOGNIZED': 'read: an award notice; no statement',
    'NPSGOV-NEWS-DEVIL-S-DEN-REOPENS': 'read: the reopening of Devil\'s Den on September 30, 2022 after a rehabilitation of trail surfaces and steps (a modern state; fenced vegetation until about 2024); no statement on 1863',
    'NPSGOV-NEWS-DEVILS-DEN-REHAB-PROJECT': 'read: the Devil\'s Den rehabilitation of 2022 (erosion and social trails); the photograph caption (taken between 1863 and 1880) dates no feature; no statement on 1863',
    'NPSGOV-NEWS-FALL-INTO-HISTORY': 'read: a program schedule; no statement',
    'NPSGOV-NEWS-GETTYSBURG-FORGOTTEN-HISTORY': 'read: a guided hike on vanished buildings (homes of the African American community, prisoner camps, tenant houses); it names none and dates none',
    'NPSGOV-NEWS-LITTLE-ROUND-TOP-PLAN': 'read: the environmental assessment of 2017 for Little Round Top (goals); no statement on 1863',
    'NPSGOV-NEWS-LITTLE-ROUND-TOP-PRESCRIBED-FIRE': 'read: the road closure notice for the burn of April 10, 2017 on the 52 acres of the west slope; the facts are extracted from the nature page and the completion release',
    'NPSGOV-NEWS-LITTLE-ROUND-TOP-SELECT-TREE-CUTTING': 'read: the removal of up to 63 trees along Sykes Avenue in February 2022; modern; no statement on 1863',
    'NPSGOV-NEWS-NATIONAL-CEMETERY-SPECIAL-EVENTS': 'read: the dates on which events are allowed in the national cemetery; no landscape statement',
    'NPSGOV-NEWS-PARDEE-FIELD-PRESCRIBED-BURN': 'read: road closures for the burn of April 13, 2017 on the 14 acres of Pardee Field; the statement that the field was open at the time of the battle is on the nature page (extracted)',
    'NPSGOV-NEWS-PARK-AWARDS-HILL-BRADY-4-2014': 'read: an award notice; no statement',
    'NPSGOV-NEWS-SPRING-BATTLEFIELD-FORAY': 'read: a program schedule; no statement',
    'NPSGOV-NEWS-TRAILS-PLAN': 'read: a notice of public comment on the trails plan; no statement',
}


def main():
    meta_path = os.path.join(NPS, 'source_meta.json')
    m = json.load(open(meta_path, encoding='utf-8'))
    items = m['items']
    lookups = {}
    for line in open(os.path.join(NPS, 'lookups.jsonl'), encoding='utf-8'):
        if line.strip():
            r = json.loads(line)
            lookups[r['id']] = r
    n = 0
    for sid, r in lookups.items():
        cat = category(sid)
        if not cat or sid in items or r.get('status') != 'ok':
            continue
        rd = release_date(sid)
        d = {'author': 'National Park Service', 'from': 'page title and the page itself', 'state_dates_note': NOTE[cat]}
        if rd:
            d['date'] = 'news release of %s' % rd
        elif cat == 'HC' and re.search(r'-(MONUMENT|MEMORIAL)$|MISSISSIPPI|SOLDIERS-AND-SAILORS|PENNSYLVANIA-MEMORIAL|LINCOLN-SPEECH', sid):
            d['date'] = 'web page, a finding aid of archival files dated 1895-2000; as served 2026-11-16'
        items[sid] = d
        n += 1
    for k, (season, vol) in NEWSLETTER.items():
        sid = 'NPS-NEWSLETTER-' + k
        items[sid] = {
            'title': 'Park News: The Gettysburg Quarterly, %s (%s)' % (vol, season),
            'author': 'Gettysburg National Military Park (National Park Service)',
            'date': season, 'from': 'masthead of page 1 ("The official newsletter of Gettysburg National Military Park")',
            'state_dates_note': NOTE['NEWS'].replace('A news release dates', 'A newsletter dates'),
            'text_quality': 'text layer of a 4-page PDF; its standard text interleaves columns and sidebars, so quotes are cleaned quotes cut from the content-stream-order text (rawtext.py)',
            'kind': 'official secondary (National Park Service newsletter)',
        }
    items['NPS-EISE-CLI-REDDING-2025'] = {'title': 'Cultural Landscapes Inventory: Clement Redding Farm, Eisenhower National Historic Site', 'author': 'National Park Service', 'date': '2004, revised 8/2025', 'from': 'PDF p. 1 (title page)',
        'state_dates_note': 'An inventory describes the farm as it stands (use indirect or none for later work: the bank barn of the mid-1860s to 1885, the brick house of 1898-1901); statements about 1863 (artillery fire, looting, breastworks, the stone wall hedged) are use direct; the Warren map of 1868-69 is read as a map of the years after the battle.'}
    items['NPS-EISE-CLI-LANDSCAPE-2025'] = {'title': 'Cultural Landscapes Inventory: Eisenhower NHS Landscape, Eisenhower National Historic Site', 'author': 'National Park Service', 'date': '2004, revised 8/2025', 'from': 'PDF p. 1 (title page)'}
    items['NPS-EISE-NR-FARMSTEAD'] = {'title': 'General Dwight D. Eisenhower Farmstead (National Register of Historic Places nomination)', 'author': 'National Park Service', 'date': 'not stated in the readable text (the farm purchases it lists run to 1957)', 'from': 'PDF pp. 1-2', 'text_quality': 'typescript with a damaged text layer'}
    items['NPS-TRAILS-PLAN-DEA-2026'] = {'title': 'Gettysburg National Military Park and Eisenhower National Historic Site Trails Plan Draft Environmental Assessment', 'author': 'National Park Service', 'date': 'November 2026', 'from': 'PDF p. 1 (title page)',
        'state_dates_note': 'A planning document of 2026: its descriptions are modern (use indirect); its statements about the 1863 landscape repeat the nps.gov pages.'}
    # scanned typescripts read from page images on 2026-11-16
    items['NPS-DEV-POLICY'] = {
        'title': 'Development Policy, Gettysburg National Military Park (Farm Lands and Farm Structures)',
        'author': 'National Park Service (memorandum for the Director, recommended by the Acting Chief of Planning, the Supervisor of Historic Sites and Buildings and the Superintendent of the park; approved by Director Arno B. Cammerer)',
        'date': 'memorandum of November 14, 1938; approved December 9, 1938; sent to the regional directors on January 4, 1939 (the last digit of the year of that covering memorandum is under a stamp; the stamp reads 1939)',
        'from': 'PDF p. 2 (heading and date of the memorandum), p. 3 (recommendations and approval of Dec. 9, 1938), p. 4 (covering memorandum); read as page images',
        'text_quality': 'poor photocopy of a typescript; the OCR by scripts/ocr.py is garbled in places (it reads the year of the memorandum as 1988); every number of every quote was confirmed on the page image and the extracts carry the list of images viewed',
        'state_dates_note': 'A statement of policy of 1938: what it says about the present condition of the farms (the present 18 farms, read on the enlarged image; the OCR gives 16) is a state of 1938 (use indirect); the structures that stand as they were at the time of the battle are the park\'s own statement of 1938, not a measurement; objectives to restore or rebuild are plans, never a state of 1863.',
        'used_for_extracts': '9 extracts (NPSX-DEV-POLICY-p002-01 to p003-02)',
        'kind': 'official record (National Park Service policy memorandum of 1938; a source for the policy of 1938, not for the state of 1863)',
    }
    h = items.get('NPS-HS-SPANGLER-HENRY', {})
    h['text_quality'] = 'photocopied typescript with a damaged text layer; the OCR made by scripts/ocr.py (tesseract) is registered and the quotes cut from it were confirmed digit by digit on the page images (the extracts list the images viewed)'
    h['used_for_extracts'] = '21 extracts (NPSX-HS-SPANGLER-HENRY-p002-01 to p008-02); keyed to the Henry Spangler farmstead (STR-SPANGLER_H-*), never to the George Spangler hospital farm (bld-spangler-farm, H-06)'
    h['kind'] = 'official secondary (National Park Service historical statement of 1956; it reports the recollection of Miss Ella M. Spangler, aged 88)'
    items['NPS-HS-SPANGLER-HENRY'] = h
    items['NPS-TOURIST-GUIDE'] = {'title': 'Tourist guide (commercial visitor booklet, about 1970)', 'rights_basis': 'not a United States government work; not kept'}
    json.dump(m, open(meta_path, 'w', encoding='utf-8'), indent=1)
    # not_extracted.json: merge (never remove an existing reason)
    ne_path = os.path.join(NPS, 'not_extracted.json')
    ne = json.load(open(ne_path, encoding='utf-8'))
    added = 0
    for k, v in NOT_EXTRACTED.items():
        if k not in ne['items']:
            ne['items'][k] = v
            added += 1
    json.dump(ne, open(ne_path, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('source_meta.json: %d web pages added, %d entries in all; not_extracted.json: %d reasons added' % (n, len(items), added))


if __name__ == '__main__':
    main()
