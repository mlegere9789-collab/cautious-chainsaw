#!/usr/bin/env python3
"""Build the Q16 photograph catalogue from the LOC Civil War Photographs collection (cwp).
Open JSON endpoints only (loc.gov/pictures), 1 request/second, back off on 429/5xx, never circumvent.
Raw responses are cached under tmp/photomatch/raw (gitignored); the tracked output is catalogue.json (metadata only).
Usage: python tools/bt/photomatch/catalogue.py
Nothing here is invented: every field is copied from the LOC record; 'caption_location' is set only when the LOC title states a place."""
import json, os, re, subprocess, time, hashlib, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
RAW = os.path.join(ROOT, 'tmp', 'photomatch', 'raw'); os.makedirs(RAW, exist_ok=True)
OUT = os.path.join(os.path.dirname(__file__), 'catalogue.json')
_last = [0.0]
def get(url, cache):
    p = os.path.join(RAW, cache)
    if os.path.exists(p) and os.path.getsize(p) > 50: return open(p, encoding='utf-8').read()
    for attempt in range(6):
        dt = time.time() - _last[0]
        if dt < 1.1: time.sleep(1.1 - dt)
        r = subprocess.run(['curl', '-sS', '-m', '60', '-w', '\n%{http_code}', '-H', 'Accept: application/json', url], capture_output=True, text=True)
        _last[0] = time.time(); body, _, code = r.stdout.rpartition('\n')
        if code == '200': open(p, 'w', encoding='utf-8').write(body); return body
        wait = 15 * (attempt + 1); print('HTTP', code, 'back off', wait, 's', url, file=sys.stderr); time.sleep(wait)
    raise SystemExit('failed: ' + url)
def search():
    res = []
    for sp in (1, 2, 3):
        d = json.loads(get(f'https://www.loc.gov/pictures/search/?q=gettysburg&co=cwp&fo=json&c=100&sp={sp}', f's{sp}.json'))
        if not d.get('results'): break
        res += d['results']
    return res
def keep(r):
    d = (r.get('created_published_date') or '')
    if '1863' not in d or re.search(r'Nov|June|May', d): return False
    t = (r.get('title') or '') + ' ' + ' '.join(r.get('subjects') or [])
    return 'ettysburg' in t
def main():
    cat = []
    for r in search():
        if not keep(r): continue
        pk = r['pk']; it = json.loads(get(f'https://www.loc.gov/pictures/item/{pk}/?fo=json', f'item_{pk}.json'))['item']
        notes = [n['note'] for n in it.get('notes', [])]
        cat.append({'loc_id': pk, 'loc_url': it.get('link'), 'title': it.get('title'), 'creator': r.get('creator'),
            'date_as_catalogued': it.get('created_published'), 'summary': it.get('summary'),
            'reproduction_numbers': (r.get('reproduction_number') or '').split('\n'), 'call_number': it.get('call_number'),
            'medium': it.get('medium_brief') or (it.get('mediums') or [{}])[0].get('medium'), 'formats': [f['title'] for f in it.get('formats', [])],
            'notes_loc': [n for n in notes if not n.startswith(('Forms part', 'General information', 'Credit line', 'Selected Civil', 'Corresponding print'))],
            'rights_information': it.get('rights_information'), 'licence_basis': 'LOC record states: no known restrictions on publication (PD basis: 1863 photograph, creator d. before 1900)' if 'No known restrictions' in (it.get('rights_information') or '') else 'UNCLEAR: not used',
            'image_urls': {'medium': it.get('service_medium'), 'thumb': it.get('thumb_gallery')}})
    cat.sort(key=lambda c: c['loc_id'])
    json.dump({'_doc': 'Q16 photograph catalogue. Source: LOC Civil War Photographs (cwp) JSON, fields copied verbatim; filter = catalogued 1863 (not Nov/June/May), Gettysburg in title or subjects. Dates/titles that LOC says come from Frassanito are LOC statements, recorded as such; no Frassanito text or image is used. Built by tools/bt/photomatch/catalogue.py', 'count': len(cat), 'photographs': cat}, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(len(cat), 'photographs')
if __name__ == '__main__': main()
