#!/usr/bin/env python3
"""Fetch the openly readable copies of the Q16 photographs: archive.org /cors/ route only (the loc.gov image hosts tile.loc.gov and
cdn.loc.gov, and the archive.org data nodes, are refused by this container's proxy: recorded, not circumvented). 1 request/second.
Originals and 1600-px working copies go under tmp/photomatch/img/ (gitignored). Tracked output: images_ledger.json (sha256, bytes, dims, licence basis).
Total cap for original bytes: 700 MB (Section C: headless bulk jobs with caps). Usage: python tools/bt/photomatch/fetch_images.py"""
import hashlib, json, os, subprocess, sys, time
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
IMG = os.path.join(ROOT, 'tmp', 'photomatch', 'img'); os.makedirs(IMG, exist_ok=True)
CAP = 700 * 1024 * 1024
AG = 'PhotographicWorksOfAlexanderGardner'
GARD_LICENCE = 'archive.org item licenseurl = Public Domain Mark 1.0; scan of LOC glass negative (LOC record: no known restrictions on publication); 1863 photograph'
MET_LICENCE = '1863 photograph, creator died before 1900 (public domain by age); archive.org item of the Metropolitan Museum of Art open-access programme; item rights field links the Met terms page: licence of the Met scan itself not separately verified here'
ITEMS = [
 {'key': 'LOC2018666303-L', 'loc_id': '2018666303', 'archive_id': AG, 'file': 'GettysburgPa.TheCenterOfTheFederalPositionViewedFromLittleRoundTopLeft.tiff', 'licence_basis': GARD_LICENCE},
 {'key': 'LOC2018666304-L', 'loc_id': '2018666304', 'archive_id': AG, 'file': 'GettysburgPa.InteriorViewOfBreastworksOnExtremeLeftOfTheFederalLineLeftNegative.tiff', 'licence_basis': GARD_LICENCE},
 {'key': 'LOC2018670702-L', 'loc_id': '2018670702', 'archive_id': AG, 'file': 'GettysburgPennsylvania.TheCemeteryGatehouseLeftNegative.tiff', 'licence_basis': GARD_LICENCE},
 {'key': 'MET268204', 'loc_id': None, 'archive_id': 'mma_gettysburg_from_the_west_268204', 'file': '268204.jpg', 'licence_basis': MET_LICENCE},
 {'key': 'MET268205', 'loc_id': None, 'archive_id': 'mma_gettysburg_from_the_west_268205', 'file': '268205.jpg', 'licence_basis': MET_LICENCE},
 {'key': 'MET268201', 'loc_id': None, 'archive_id': 'mma_gettysburg_john_burns_house_268201', 'file': '268201.jpg', 'licence_basis': MET_LICENCE},
 {'key': 'MET268202', 'loc_id': None, 'archive_id': 'mma_gettysburg_wheat_field_268202', 'file': '268202.jpg', 'licence_basis': MET_LICENCE},
 {'key': 'MET268203', 'loc_id': None, 'archive_id': 'mma_gettysburg_pennsylvania_268203', 'file': '268203.jpg', 'licence_basis': MET_LICENCE},
 {'key': 'MET286882', 'loc_id': None, 'archive_id': 'mma_field_where_general_reynolds_fell_gettysburg_286882', 'file': '286882.jpg', 'licence_basis': MET_LICENCE},
]
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def main():
    led_p = os.path.join(HERE, 'images_ledger.json')
    led = json.load(open(led_p)) if os.path.exists(led_p) else {'images': {}}
    total = sum(v.get('bytes', 0) for v in led['images'].values())
    for it in ITEMS:
        k = it['key']
        if k in led['images'] and os.path.exists(os.path.join(ROOT, led['images'][k]['local_original'])): continue
        url = f"https://archive.org/cors/{it['archive_id']}/{it['file']}"; dst = os.path.join(IMG, k + os.path.splitext(it['file'])[1])
        time.sleep(1.1)
        r = subprocess.run(['nice', '-n', '10', 'curl', '-sS', '-m', '900', '-o', dst, '-w', '%{http_code}', url], capture_output=True, text=True)
        if r.stdout != '200': print('FAILED', k, r.stdout, r.stderr[:200]); led['images'][k] = {'status': 'failed', 'url': url, 'http': r.stdout}; continue
        b = os.path.getsize(dst); total += b
        im = Image.open(dst); W, H = im.size; im = im.convert('L') if im.mode in ('I;16', 'I', 'F') or im.mode.startswith('I') else im.convert('RGB')
        if im.mode == 'L': pass
        sc = 1600 / max(W, H); work = os.path.join(IMG, k + '_1600.jpg')
        (im.resize((round(W * sc), round(H * sc)), Image.LANCZOS) if sc < 1 else im).convert('RGB').save(work, quality=92)
        led['images'][k] = {'status': 'ok', 'loc_id': it['loc_id'], 'archive_id': it['archive_id'], 'file': it['file'], 'url': url, 'bytes': b, 'sha256': sha(dst), 'width': W, 'height': H,
            'local_original': os.path.relpath(dst, ROOT), 'local_working_1600': os.path.relpath(work, ROOT), 'licence_basis': it['licence_basis'], 'fetched': time.strftime('%Y-%m-%d')}
        print('ok', k, b, W, H, flush=True)
        if total > CAP: print('cap reached'); break
    led['_doc'] = 'sha256 ledger of fetched photograph files (Q16). Files themselves live in gitignored tmp/photomatch/img/. Written by fetch_images.py.'
    led['total_bytes'] = total; json.dump(led, open(led_p, 'w'), indent=1)
main()
