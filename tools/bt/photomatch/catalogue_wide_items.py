#!/usr/bin/env python3
"""Third pass (2026-11-14): the 62 Library of Congress records of the wide search (wide_search.py; open JSON search of the Civil War group, outside the cwp collection of the first run) that the first two catalogue passes did not hold,
written in the schema of catalogue_additions.json, so that the registry treats them as the other records.
Every field is copied from the LOC item record (same open JSON endpoint, cached under tmp/photomatch/raw by wide_search.py's companion fetch); the classification (scope, staged flag, same exposure as an already catalogued record) is the hand-written
table wide_data.py, written after looking at every image on contact sheets and at the feature-matching leads of wide_to_catalogue.json. A record without an entry in wide_data.py stops the run (nothing is dropped silently).
Output: tools/bt/photomatch/catalogue_wide_items.json.  Usage: python3 -I tools/bt/photomatch/catalogue_wide_items.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import catalogue as C
from wide_data import W
RAW = os.path.join(ROOT, 'tmp', 'photomatch', 'raw')
def main():
    wide = json.load(open(os.path.join(HERE, 'catalogue_wide.json'))); led = json.load(open(os.path.join(HERE, 'wide_images_ledger.json')))['images']
    new = [r for r in wide['records'] if not r['already_considered']]; missing = [r['loc_id'] for r in new if r['loc_id'] not in W]
    if missing: raise SystemExit('no entry in wide_data.py for ' + ', '.join(missing))
    out = []
    for r in new:
        pk = r['loc_id']; it = json.load(open(os.path.join(RAW, f'item_{pk}.json')))['item']; notes = [n['note'] for n in it.get('notes', [])]; w = W[pk]
        rights = it.get('rights_information') or ''
        staged = bool(C.STAGED.search(it.get('title') or '')) or bool(w.get('staged'))
        e = {'loc_id': pk, 'loc_url': it.get('link') or r['loc_url'], 'title': it.get('title'), 'creator': r.get('creator') or ((it.get('creators') or [{}])[0].get('title')), 'date_as_catalogued': it.get('created_published'), 'summary': it.get('summary'),
             'reproduction_numbers': (it.get('reproduction_number') or '').split('\n'), 'call_number': it.get('call_number'), 'medium': it.get('medium_brief') or (it.get('mediums') or [{}])[0].get('medium'), 'formats': [f['title'] for f in it.get('formats', [])],
             'notes_loc': [n for n in notes if not n.startswith(('Forms part', 'General information', 'Credit line', 'Selected Civil', 'Corresponding print'))], 'rights_information': it.get('rights_information'),
             'licence_basis': ('LOC record states: no known restrictions on publication (PD basis: 19th-century photograph)' if 'No known restrictions' in rights else
                               'LOC rights field is empty for this record; a 19th-century print (made before 1929, so public domain in the United States by age: an inference, not a LOC statement); used only for viewing in the photo-match, in no shipped file'),
             'in_scope_july_1863_terrain': w['code'] not in ('OUT',) and not w.get('not_july'), 'staged_flag': staged, 'date_status': 'wide search (third pass): the LOC date field reads "%s"; the search keeps records of 1863 that name Gettysburg; see added_reason' % (it.get('created_published') or ''),
             'added_reason': w['reason'], 'found_by': 'wide_search.py (open JSON search of the LOC Civil War group, co=civwar, q=gettysburg 1863): outside the cwp collection that the first catalogue run read',
             'image_urls': {'medium': (r.get('image_url') or '')}, 'image_ledger': 'wide_images_ledger.json', 'image_status': led.get(pk, {}).get('status'), 'same_exposure_as': w.get('copy_of') or [], 'rejected_ties': w.get('rejected_ties') or []}
        if staged: e['staged_basis'] = w.get('staged_basis') or "title contains Devil's Den / sharpshooter: same rule as catalogue.py (the staged Devil's Den photograph; terrain and rocks only, never body or prop positions)"
        out.append(e)
    json.dump({'_doc': 'Records of the wide search (third pass) that the first two catalogue passes did not hold, in the schema of catalogue_additions.json. Fields copied from the LOC item record by catalogue_wide_items.py; classification in wide_data.py.', 'count': len(out), 'photographs': out},
              open(os.path.join(HERE, 'catalogue_wide_items.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'records')
if __name__ == '__main__': main()
