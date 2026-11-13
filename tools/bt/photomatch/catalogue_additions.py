#!/usr/bin/env python3
"""Add Library of Congress records that the first catalogue run dropped by its date filter (Q16 catalogue completeness).
Why: catalogue.py kept only records whose catalogued date contains '1863'. LOC catalogues many Brady/Gardner Gettysburg battlefield prints as 'photographed between
1861 and 1865' (no year of its own), and the National Park Service cites one of them (ppmsca-32840, 'Herbst Woods ... looking southeast from the McPherson Farm',
July 1863) as a July 1863 photograph. Dropping them would silently narrow the catalogue. They are added here with an explicit date status; nothing is invented:
every field is copied from the LOC record (same open JSON endpoint, 1 request per second, cached under tmp/photomatch/raw).
Selection (hand-listed below, each with its reason): records of the Gettysburg battlefield whose subject is the aftermath of the July 1863 battle. Excluded and listed
with a reason in the output: post-war (1865, 1886) views, the November 1863 dedication, portraits, other places.
Output: tools/bt/photomatch/catalogue_additions.json.  Usage: python3 -I tools/bt/photomatch/catalogue_additions.py"""
import json, os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import catalogue as C
ADD = {
 '2012647700': 'Bigelow\'s battery dead horses (the same scene as record 2013645105 dated 1863 July)',
 '2012647701': 'Little Round Top (Brady/Gardner print series of the battlefield)',
 '2012647702': 'Bryan house (Brady print series of the battlefield)',
 '2012647703': 'Scene of the charge of the Louisiana Tigers (panorama half, East Cemetery Hill)',
 '2012647704': 'Culp\'s Hill (print series of the battlefield)',
 '2012647706': 'Scene of General Reynolds\'s death; NPS (CLR First Day, Fig. 0.1) cites it as a Brady photograph of July 1863 (LOC image 32840v)',
 '2012647708': 'Little Round Top and Round Top (print series of the battlefield)',
 '2012647714': 'Scene of Pickett\'s charge (print series of the battlefield)',
 '2012647845': 'Devil\'s Den (print series): KEPT BUT RECLASSIFIED after the NPS image match: it is the staged Weaver photograph of 11 November 1863 (NPS Then-And-Now Devil\'s Den no. 8, LOC ppmsca 32931), not July',
 '2012647846': 'Dead on Little Round Top (White Studio copy print, same copyright series as 2012647845: the date of the original is not stated and may be the November 1863 Weaver series)',
 '2012648410': 'General Lee\'s headquarters, Mrs. Thompson\'s house (Chambersburg Pike); the same building as record 2018666297 dated 1863 July',
 '2018670706': 'McPherson\'s woods on the left of the Chambersburg Pike (the same subject as records 2012647718/2012646949 dated 1863)',
 '2018671419': 'Place where Gen. Reynolds was killed',
 '2018671488': 'Meade\'s headquarters (Leister house); same subject as records 2018666296/2018672035 dated 1863 July',
 '98519365': 'Gen. G.G. Meade\'s headquarters (Leister house); same subject as records 2018666296/2018672035',
 '95503135': 'General Robert E. Lee\'s headquarters (Thompson house); same subject as record 2018666297',
 '2018672361': 'View from Culp\'s hill (catalogued between 1862 and 1865; subject: the Gettysburg battlefield)',
 '2018667213': 'A harvest of death, Gettysburg, July 1863 (the title states July 1863; the c1865 date is the print/publication date)',
}
EXCLUDED_REASON = {
 'Nov': 'dedication of the cemetery, 19 November 1863: not the July battlefield', '1865': 'photographed in July 1865 or later: not July 1863',
 '1886': 'photographed in 1886', 'portrait': 'portrait', 'other': 'not the Gettysburg battlefield (other place or subject)',
}
def main():
    cat = json.load(open(os.path.join(HERE, 'catalogue.json')))['photographs']; have = {c['loc_id'] for c in cat}
    sr = {}
    for n in ('s1.json', 's2.json'):
        for r in json.load(open(os.path.join(C.RAW, n)))['results']: sr[r['pk']] = r
    out = []
    for pk, why in ADD.items():
        if pk in have: continue
        it = json.loads(C.get(f'https://www.loc.gov/pictures/item/{pk}/?fo=json', f'item_{pk}.json'))['item']
        notes = [n['note'] for n in it.get('notes', [])]
        out.append({'loc_id': pk, 'loc_url': it.get('link'), 'title': it.get('title'), 'creator': (sr.get(pk) or {}).get('creator'), 'date_as_catalogued': it.get('created_published'), 'summary': it.get('summary'),
            'reproduction_numbers': (it.get('reproduction_number') or '').split('\n'), 'call_number': it.get('call_number'),
            'medium': it.get('medium_brief') or (it.get('mediums') or [{}])[0].get('medium'), 'formats': [f['title'] for f in it.get('formats', [])],
            'notes_loc': [n for n in notes if not n.startswith(('Forms part', 'General information', 'Credit line', 'Selected Civil', 'Corresponding print'))],
            'rights_information': it.get('rights_information'),
            'licence_basis': 'LOC record states: no known restrictions on publication (PD basis: 19th-century photograph)' if 'No known restrictions' in (it.get('rights_information') or '') else 'UNCLEAR: not used',
            'in_scope_july_1863_terrain': True, 'staged_flag': bool(C.STAGED.search(it.get('title') or '')),
            'date_status': 'added by catalogue_additions.py: LOC gives no 1863 year in the date field; the title or subject places the photograph on the July 1863 battlefield (see added_reason); not stated by LOC',
            'added_reason': why, 'image_urls': {'medium': it.get('service_medium'), 'thumb': it.get('thumb_gallery')}})
        if out[-1]['staged_flag']: out[-1]['staged_basis'] = 'title contains Devil\'s Den / sharpshooter: same rule as catalogue.py (PDF plan, staged Devil\'s Den photograph); terrain and rocks only, never body or prop positions'
    # which of the dropped search results were NOT added (reason recorded, nothing hidden)
    res = []
    for n in ('s1.json', 's2.json'):
        res += json.load(open(os.path.join(C.RAW, n)))['results']
    skipped = []
    for r in res:
        pk = r['pk']
        if pk in have or pk in ADD: continue
        d = r.get('created_published_date') or ''; t = r.get('title') or ''
        k = 'Nov' if re.search(r'Nov', d) or 'edication' in t else '1865' if '1865' in d else '1886' if '1886' in d else 'portrait' if re.search(r'Gen\.|Col\.|Lieut|Capt|Officers|Joseph|Adj|Major|Lt\.|Sherman|Chamberlain|Portrait', t) else 'other'
        skipped.append({'loc_id': pk, 'title': t, 'date': d, 'reason': EXCLUDED_REASON[k]})
    json.dump({'_doc': 'Records added to the Q16 catalogue after the first run dropped them (date filter: no 1863 in the date field). Fields copied from the LOC record by catalogue_additions.py; added_reason says why each is a July 1863 battlefield view. skipped_search_results lists the other dropped results with the reason each stays out.',
               'count': len(out), 'photographs': out, 'skipped_search_results': skipped}, open(os.path.join(HERE, 'catalogue_additions.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'added;', len(skipped), 'skipped with reason')
if __name__ == '__main__': main()
