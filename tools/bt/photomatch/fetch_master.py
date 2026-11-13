#!/usr/bin/env python3
"""Fetch the Library of Congress master TIFF of single catalogued resources (only where a higher resolution than the 1024-px JPEG is needed for a
comparison), derive a working JPEG (longest side 4096 px), record both in images_ledger.json, and delete the TIFF to keep the scratch tree small.
Hosts and pacing as fetch_loc.py (tile.loc.gov / cdn.loc.gov, 1 request per second, redirects checked against the allow-list).
Also converts the three archive.org TIFFs of the first run to 3200-px working copies and removes the originals (their URL and sha256 stay in the ledger).
Usage: python3 -I tools/bt/photomatch/fetch_master.py <resource id> [...]      e.g. cwpb.00084
       python3 -I tools/bt/photomatch/fetch_master.py --shrink-first-run"""
import hashlib, json, os, sys, time, glob
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
import fetch_loc as F
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
def working(src, dst, side):
    im = Image.open(src); W, H = im.size
    if im.mode not in ('L', 'RGB'): im = im.convert('L') if im.mode.startswith(('I', 'F')) else im.convert('RGB')
    sc = side / max(W, H); out = im.resize((round(W * sc), round(H * sc)), Image.LANCZOS) if sc < 1 else im
    out.convert('RGB').save(dst, quality=92); return W, H, out.size
def main():
    led = json.load(open(F.LED)); im = led['images']
    if '--shrink-first-run' in sys.argv:
        for k, v in im.items():
            lo = v.get('local_original')
            if not lo or not lo.endswith('.tiff'): continue
            p = os.path.join(ROOT, lo)
            if not os.path.exists(p): continue
            assert F.sha(p) == v['sha256'], k
            dst = p[:-5] + '_3200.jpg'; working(p, dst, 3200)
            v['local_working_3200'] = os.path.relpath(dst, ROOT); v['working_3200_sha256'] = F.sha(dst)
            v['local_original_removed'] = time.strftime('%Y-%m-%d') + ': TIFF deleted after the sha256 was re-checked and the 3200-px working copy was written (free disk); re-fetch from url'
            os.remove(p); F.log('shrunk', k)
        F.save(led); return
    res = {}
    for f in sorted(glob.glob(os.path.join(F.RAW, 'item_*.json'))):
        d = json.load(open(f))
        for i, r in enumerate(d.get('resources') or []): res[r['id']] = (d['item'], i, r)
    for rid in [a for a in sys.argv[1:] if not a.startswith('-')]:
        it, i, r = res[rid]; pk = it['control_number']; url = r.get('larger') or ''; key = f"LOC{pk}_{rid}_u"; rights = it.get('rights_information') or ''
        if not url.endswith('.tif'): im[key] = {'status': 'not_offered', 'loc_id': pk, 'resource_id': rid, 'derivative': 'master', 'url': url}; continue
        dst = os.path.join(F.OUT, rid + '_u.tif'); wk = os.path.join(F.OUT, rid + '_u4096.jpg')
        if im.get(key, {}).get('status') == 'ok' and os.path.exists(wk): print('have', key); continue
        # fetch() accepts image/jpeg only; a master is image/tiff, so the single GET (and the redirect check) is done here
        u = url; hops = []; ok = False
        for hop in range(3):
            from urllib.parse import urlparse
            if urlparse(u).netloc not in F.ALLOWED: break
            code, loc, ctype, err = F.curl(u, dst + '.part'); hops.append({'url': u, 'http': code})
            if code in ('301', '302', '307', '308') and loc: os.remove(dst + '.part') if os.path.exists(dst + '.part') else None; u = loc; continue
            ok = code == '200' and ctype.startswith('image/tiff'); break
        e = {'status': 'ok' if ok else 'failed', 'loc_id': pk, 'resource_id': rid, 'resource_index': i, 'resource_note': r.get('note'), 'derivative': 'master', 'url': url, 'url_final': u, 'hops': hops, 'fetched': time.strftime('%Y-%m-%d')}
        if ok:
            os.replace(dst + '.part', dst); W, H, ws = working(dst, wk, 4096)
            e.update(bytes=os.path.getsize(dst), bytes_declared_by_record=r.get('larger_s'), sha256=F.sha(dst), width=W, height=H, local_file=None,
                     local_original_removed='TIFF deleted after the working copy was written (free disk); re-fetch from url',
                     local_working_4096=os.path.relpath(wk, ROOT), working_4096_sha256=F.sha(wk), working_px=list(ws),
                     licence_basis='LOC record rights statement: "' + rights + '"; 1863 photograph (public domain by age); master file served by the Library of Congress')
            os.remove(dst); F.log('ok master', key, e['bytes'], W, H)
        else:
            if os.path.exists(dst + '.part'): os.remove(dst + '.part')
            e['error'] = 'HTTP ' + (hops[-1]['http'] if hops else 'none'); F.log('FAILED master', key, e['error'])
        im[key] = e; F.save(led)
if __name__ == '__main__': main()
