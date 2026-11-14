#!/usr/bin/env python3
"""Third pass (2026-11-14): LOC photographs of the July 1863 Gettysburg battlefield that lie OUTSIDE the cwp collection of the first catalogue run.
Why: the first run searched only the Civil War Photographs collection (co=cwp). The National Park Service cites at least two LOC records outside it by digital id
(ppmsca-12565, ppmsca-18947), so the catalogue was narrower than the Library's holdings. This script reads the open JSON search of the wider Civil War group
(co=civwar, q=gettysburg 1863, 10 pages of 100, 1 request per second, cached under tmp/photomatch/raw as wide_civwar_<n>.json), keeps the records that are photographs,
carry 1863 in the date or the title and name Gettysburg, removes the records the earlier passes already catalogued or dispositioned, and writes every remaining one to
catalogue_wide.json with its LOC fields and a disposition. It then fetches the medium JPEG (r.jpg, the search result's own image URL, cdn.loc.gov/tile.loc.gov) of each candidate
(1 request per second, no retry on a refusal) into tmp/photomatch/wide/ and records sha256, size and pixel size in wide_images_ledger.json.
Nothing is invented: every field is copied from the LOC search result. The disposition (same exposure as a catalogued record / new exposure / out of scope) is written by
match_wide.py (image matching) and by a person who looked at the images (wide_dispositions.py).
Usage: python3 -I tools/bt/photomatch/wide_search.py [--no-images]"""
import hashlib, json, os, re, subprocess, sys, time
from urllib.parse import urlparse
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import catalogue as C
OUT = os.path.join(ROOT, 'tmp', 'photomatch', 'wide'); os.makedirs(OUT, exist_ok=True)
ALLOWED = {'tile.loc.gov', 'cdn.loc.gov'}; PAUSE = 1.15; _last = [0.0]
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def candidates():
    res = []
    for sp in range(1, 11):
        d = json.loads(C.get(f'https://www.loc.gov/pictures/search/?q=gettysburg+1863&co=civwar&fo=json&c=100&sp={sp}', f'wide_civwar_{sp}.json')); res += d['results']
    cat = {c['loc_id'] for c in json.load(open(os.path.join(HERE, 'catalogue.json')))['photographs']}
    add = json.load(open(os.path.join(HERE, 'catalogue_additions.json'))); addids = {c['loc_id'] for c in add['photographs']}; skipped = {s['loc_id']: s for s in add['skipped_search_results']}
    out = []; seen = set()
    for r in res:
        pk = r['pk']
        if pk in seen: continue
        seen.add(pk)
        d = r.get('created_published_date') or ''; t = (r.get('title') or '') + ' ' + ' '.join(r.get('subjects') or []); med = (r.get('medium_brief') or '') + ' ' + (r.get('medium') or '')
        if not re.search(r'photograph|negative|stereo|albumen|glass', med, re.I): continue
        if '1863' not in d and '1863' not in (r.get('title') or ''): continue
        if 'ettysburg' not in t: continue
        where = 'catalogue.json' if pk in cat else 'catalogue_additions.json' if pk in addids else ('skipped_search_results: ' + skipped[pk]['reason']) if pk in skipped else None
        out.append({'loc_id': pk, 'loc_url': (r.get('links') or {}).get('item') or f'https://www.loc.gov/pictures/item/{pk}/', 'title': r.get('title'), 'creator': r.get('creator'), 'date_as_catalogued': d, 'medium': med.strip(),
                    'call_number': r.get('call_number'), 'reproduction_number': r.get('reproduction_number'), 'collections': r.get('collection'), 'image_url': (r.get('image') or {}).get('full'),
                    'already_considered': where})
    return out
def pace():
    dt = time.time() - _last[0]
    if dt < PAUSE: time.sleep(PAUSE - dt)
def fetch(url, dst):
    hops = []; u = url
    for _ in range(3):
        host = urlparse(u).netloc
        if host not in ALLOWED: return {'status': 'failed', 'error': f'host {host} not allowed; not requested', 'hops': hops}
        pace(); r = subprocess.run(['curl', '-sS', '-m', '120', '-o', dst + '.part', '-w', '%{http_code}\t%{redirect_url}\t%{content_type}', u], capture_output=True, text=True); _last[0] = time.time()
        p = (r.stdout or '\t\t').split('\t'); code, loc, ctype = p[0], p[1] if len(p) > 1 else '', p[2] if len(p) > 2 else ''; hops.append({'url': u, 'http': code})
        if code in ('301', '302', '307', '308') and loc:
            if os.path.exists(dst + '.part'): os.remove(dst + '.part')
            u = loc; continue
        if code == '200' and ctype.startswith('image/jpeg'):
            os.replace(dst + '.part', dst); return {'status': 'ok', 'http': code, 'url_final': u, 'hops': hops}
        if os.path.exists(dst + '.part'): os.remove(dst + '.part')
        return {'status': 'failed', 'http': code, 'url_final': u, 'hops': hops, 'error': r.stderr.strip()[:200] or f'content-type {ctype}'}
    return {'status': 'failed', 'error': 'more than two redirects', 'hops': hops}
def main():
    cands = candidates(); new = [c for c in cands if not c['already_considered']]
    print(len(cands), 'photographs of 1863 naming Gettysburg in the wider search;', len(new), 'not catalogued or dispositioned before')
    led = {}; lp = os.path.join(HERE, 'wide_images_ledger.json')
    if os.path.exists(lp): led = json.load(open(lp)).get('images', {})
    if '--no-images' not in sys.argv:
        for c in new:
            pk = c['loc_id']; url = c.get('image_url'); dst = os.path.join(OUT, pk + '_r.jpg')
            if not url: led[pk] = {'status': 'not_offered', 'loc_id': pk, 'reason': 'the search result carries no image URL'}; continue
            cur = led.get(pk)
            if cur and cur.get('status') == 'ok' and os.path.exists(dst) and sha(dst) == cur.get('sha256'): continue
            res = fetch(url, dst)
            if res['status'] == 'ok':
                try:
                    with Image.open(dst) as I: I.load(); W, H = I.size
                except Exception as ex:
                    os.remove(dst); led[pk] = {'status': 'failed', 'loc_id': pk, 'url': url, 'error': 'not a complete JPEG: ' + str(ex)[:100]}; print('FAILED', pk); continue
                led[pk] = {'status': 'ok', 'loc_id': pk, 'url': url, 'url_final': res.get('url_final'), 'hops': res.get('hops'), 'fetched': time.strftime('%Y-%m-%d'), 'bytes': os.path.getsize(dst), 'sha256': sha(dst), 'width': W, 'height': H,
                          'local_file': os.path.relpath(dst, ROOT), 'licence_basis': 'LOC record of an 1863-era photograph; JPEG derivative served by the Library of Congress; used only for viewing in the photo-match, not shipped'}
                print('ok', pk, W, H)
            else:
                led[pk] = {'status': 'failed', 'loc_id': pk, 'url': url, 'http': res.get('http'), 'error': res.get('error'), 'hops': res.get('hops')}; print('FAILED', pk, res.get('http'))
        json.dump({'_doc': 'Medium JPEG derivatives of the candidates of catalogue_wide.json (third pass). Files under gitignored tmp/photomatch/wide/.', 'images': led}, open(lp, 'w'), indent=1)
    json.dump({'_doc': 'Photographs of 1863 naming Gettysburg found by the open JSON search of the LOC Civil War group (co=civwar, q=gettysburg 1863, 950 results) that carry a photographic medium and 1863 in the date or title. already_considered says which earlier list holds the record (null = first seen in the third pass). Built by wide_search.py; dispositions are in wide_dispositions.json.',
               'search': {'url': 'https://www.loc.gov/pictures/search/?q=gettysburg+1863&co=civwar&fo=json&c=100&sp=1..10', 'results': 950, 'retrieved': '2026-11-14'}, 'count': len(cands), 'not_considered_before': len(new), 'records': cands},
              open(os.path.join(HERE, 'catalogue_wide.json'), 'w'), indent=1, ensure_ascii=False)
if __name__ == '__main__': main()
