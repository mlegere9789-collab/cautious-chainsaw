#!/usr/bin/env python3
"""Fourth session (2026-11-15): the other images of the records of the wide search.
Why: wide_search.py saved one medium JPEG per record of the wide search (the search result's own image: the first resource). A Library record may offer more resources: the back of a stereo card (printed
text), the second half of a stereo pair, copy negatives of other prints. The first catalogue run saved every offered resource of its records (228 of 228); this script does the same for the 62 records of the wide search
(51 further resources), so that every catalogued photograph of the registry has been fetched and looked at.
Reads the raw item JSON of each wide record (tmp/photomatch/raw/item_<id>.json, written by catalogue_wide_items.py), takes every resource that offers a medium JPEG other than the one already saved, fetches it
(1 request per second, cdn.loc.gov / tile.loc.gov only, no retry on a refusal; the received size must equal the size the record declares (medium_s) and the file must decode to the last pixel), saves it under tmp/photomatch/wide/
as <record>_<resource>_r.jpg and writes wide_extra_images_ledger.json (sha256, size, pixel size, urls, the resource's own note, licence basis). Nothing is invented: every field is copied from the record or measured on the file.
Usage: python3 -I tools/bt/photomatch/wide_extra_images.py [--ledger-large]"""
import json, os, sys, time
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import wide_search as WS
RAW = os.path.join(ROOT, 'tmp', 'photomatch', 'raw'); OUT = WS.OUT; LED = os.path.join(HERE, 'wide_extra_images_ledger.json')
LICENCE = 'LOC record of an 1863-era photograph; JPEG derivative served by the Library of Congress; used only for viewing in the photo-match, not shipped'
def path_of(u): return u.split('://', 1)[-1].split('/', 1)[-1] if u else ''
def main():
    wide = json.load(open(os.path.join(HERE, 'catalogue_wide_items.json')))['photographs']; prim = json.load(open(os.path.join(HERE, 'wide_images_ledger.json')))['images']
    led = json.load(open(LED))['images'] if os.path.exists(LED) else {}; todo = []
    for w in wide:
        pk = w['loc_id']; f = os.path.join(RAW, f'item_{pk}.json')
        if not os.path.exists(f): print('no item json for', pk); continue
        res = json.load(open(f))['resources']; have = path_of((prim.get(pk) or {}).get('url_final') or (prim.get(pk) or {}).get('url'))
        for r in res:
            med = r.get('medium') or ''
            if not med or med.endswith('notdig.gif') or not r.get('id'): continue
            if path_of(med).split('storage-services/', 1)[-1] == have.split('storage-services/', 1)[-1] or path_of(med) == have: continue   # the image already saved as the primary
            todo.append((pk, r))
    print(len(todo), 'further resources offered by the records of the wide search')
    for pk, r in todo:
        key = f"{pk}|{r['id']}"; dst = os.path.join(OUT, f"{pk}_{r['id'].replace('.', '-')}_r.jpg"); cur = led.get(key)
        if cur and cur.get('status') == 'ok' and os.path.exists(dst) and WS.sha(dst) == cur.get('sha256'): continue
        res = WS.fetch(r['medium'], dst)
        if res['status'] != 'ok': led[key] = {'status': 'failed', 'loc_id': pk, 'resource': r['id'], 'url': r['medium'], 'http': res.get('http'), 'error': res.get('error'), 'hops': res.get('hops'), 'note': r.get('note')}; print('FAILED', key, res.get('http')); continue
        size = os.path.getsize(dst)
        try:
            with Image.open(dst) as I: I.load(); W, H = I.size
        except Exception as ex:
            os.remove(dst); led[key] = {'status': 'failed', 'loc_id': pk, 'resource': r['id'], 'url': r['medium'], 'error': 'not a complete JPEG: ' + str(ex)[:100], 'note': r.get('note')}; print('FAILED', key, 'decode'); continue
        decl = r.get('medium_s'); ok = (decl is None) or (decl == size)
        led[key] = {'status': 'ok' if ok else 'size_differs', 'loc_id': pk, 'resource': r['id'], 'url': r['medium'], 'url_final': res.get('url_final'), 'hops': res.get('hops'), 'fetched': time.strftime('%Y-%m-%d'), 'bytes': size, 'bytes_declared_by_record': decl,
                    'sha256': WS.sha(dst), 'width': W, 'height': H, 'local_file': os.path.relpath(dst, ROOT), 'note': r.get('note'), 'licence_basis': LICENCE}
        print('ok' if ok else 'SIZE DIFFERS', key, W, H, size, decl)
        json.dump({'_doc': 'Medium JPEG derivatives of the further resources (second stereo half, card back, copy negatives) of the records of the wide search; fourth session 2026-11-15. Files under gitignored tmp/photomatch/wide/.', 'images': led}, open(LED, 'w'), indent=1)
    json.dump({'_doc': 'Medium JPEG derivatives of the further resources (second stereo half, card back, copy negatives) of the records of the wide search; fourth session 2026-11-15. Files under gitignored tmp/photomatch/wide/.', 'images': led}, open(LED, 'w'), indent=1)
    from collections import Counter
    print(Counter(v['status'] for v in led.values()))
def ledger_large():
    """Record the 1024-px derivatives (v.jpg) of card backs that were fetched to read their printed text (fourth session, one request each at 1 request per second by the same fetch(); sizes compared with large_s of the record, every file decoded).
    Files named <record>_<resource>_v.jpg under tmp/photomatch/wide/ or tmp/photomatch/work/backs/ are moved into tmp/photomatch/wide/ and entered as <record>|<resource>|large."""
    import shutil, glob
    led = json.load(open(LED))['images']; n = 0
    for f in sorted(glob.glob(os.path.join(ROOT, 'tmp', 'photomatch', 'work', 'backs', '*_v.jpg')) + glob.glob(os.path.join(OUT, '*_v.jpg'))):
        base = os.path.basename(f)[:-6]; pk, rid = base.split('_', 1); rid = rid.replace('-', '.', 1); raw = json.load(open(os.path.join(RAW, f'item_{pk}.json')))['resources']; r = next(x for x in raw if x['id'] == rid)
        dst = os.path.join(OUT, f"{pk}_{rid.replace('.', '-')}_v.jpg")
        if os.path.abspath(f) != os.path.abspath(dst): shutil.move(f, dst)
        with Image.open(dst) as I: I.load(); W, H = I.size
        size = os.path.getsize(dst); decl = r.get('large_s'); key = f"{pk}|{rid}|large"
        led[key] = {'status': 'ok' if (decl is None or decl == size) else 'size_differs', 'loc_id': pk, 'resource': rid, 'derivative': 'large', 'url': r['large'], 'fetched': time.strftime('%Y-%m-%d'), 'bytes': size, 'bytes_declared_by_record': decl, 'sha256': WS.sha(dst), 'width': W, 'height': H,
                    'local_file': os.path.relpath(dst, ROOT), 'note': r.get('note'), 'licence_basis': LICENCE}; n += 1
    json.dump({'_doc': 'Medium JPEG derivatives of the further resources (second stereo half, card back, copy negatives) of the records of the wide search, and the 1024-px derivatives of the card backs that were read for their printed text; fourth session 2026-11-15. Files under gitignored tmp/photomatch/wide/.', 'images': led}, open(LED, 'w'), indent=1)
    from collections import Counter
    print(n, 'large derivatives entered;', Counter(v['status'] for v in led.values()))
if __name__ == '__main__': ledger_large() if '--ledger-large' in sys.argv else main()
