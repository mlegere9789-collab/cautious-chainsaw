#!/usr/bin/env python3
"""Fifth photo-match session (2026-11-16): the letterpress pages of Gardner's Photographic Sketch Book of the War (Library of Congress copy of volume 1, ppmsca.12834; 1865-66), read by machine.
Why: the Library offers the 112 album pages of volume 1 as images only. The 1024-px derivative is too small for OCR (the earlier archive.org text read the binding, not the letterpress), but the master scans
(6685 x 4985 px, about 100 MB each) are legible: the letterpress of plate 35 'Gettysburg, Pennsylvania' (page 77) states where the view was taken. Each text page of the Gettysburg plates (35 to 44) is fetched once,
its size is checked against the Content-Length, the text block is cut out, read with tesseract (psm 6, the text block at half master size), and the master is deleted again (disk); what is kept is the OCR text, the
cut-out, and the sha256 of the master and of the text, in the manifest. The page images were also looked at by eye; where OCR and eye differ the OCR text is not used for a quote.
Order of the album: the letterpress page comes first (odd page), the mounted plate follows (even page): text page 77 + plate page 78 = plate 35; 79/80 = 36; 81/82 = 37; 83/84 = 38; 85/86 = 39; 87/88 = 40; 89/90 = 41; 91/92 = 42; 93/94 = 43; 95/96 = 44.
Output: tmp/library/web/photomatch/sketchbook_v1/p<page>.ocr.txt, .crop.png, manifest.json. 1 request per 1.2 s; a block is recorded and never worked around.
Usage: python3 -I tools/bt/photomatch/sketch_master_ocr.py [page ...]   (default: 77 79 81 83 85 87 89 91 93 95)"""
import hashlib, json, os, subprocess, sys, time
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'sketchbook_v1'); os.makedirs(OUT, exist_ok=True)
TIF = 'https://tile.loc.gov/storage-services/master/pnp/ppmsca/12800/12834/%05du.tif'
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def main():
    pages = [int(a) for a in sys.argv[1:]] or [77, 79, 81, 83, 85, 87, 89, 91, 93, 95]
    mp = os.path.join(OUT, 'manifest.json'); man = json.load(open(mp)) if os.path.exists(mp) else {'_doc': __doc__.split('\n')[0], 'pages': {}}
    for pg in pages:
        key = '%05d' % pg
        if key in man['pages'] and os.path.exists(os.path.join(OUT, f'p{key}.ocr.txt')): continue
        url = TIF % pg; tif = os.path.join(ROOT, 'tmp', 'photomatch', 'sketchbook', f'master_{key}.tif')
        if not os.path.exists(tif):
            hd = subprocess.run(['curl', '-sSI', '-m', '60', '-A', 'Mozilla/5.0 (compatible; research fetch; 1 request per second)', url], capture_output=True, text=True).stdout
            want = [int(l.split(':')[1]) for l in hd.splitlines() if l.lower().startswith('content-length')]; time.sleep(1.2)
            r = subprocess.run(['curl', '-sS', '-m', '900', '-A', 'Mozilla/5.0 (compatible; research fetch; 1 request per second)', '-o', tif + '.part', '-w', '%{http_code}', url], capture_output=True, text=True)
            if r.returncode != 0 or r.stdout.strip() != '200' or (want and os.path.getsize(tif + '.part') != want[-1]):
                man['pages'][key] = {'status': 'failed', 'http': r.stdout.strip(), 'error': r.stderr.strip()[:200], 'url': url}; json.dump(man, open(mp, 'w'), indent=1); continue
            os.replace(tif + '.part', tif); time.sleep(1.2)
        im = Image.open(tif).convert('L'); w, h = im.size
        crop = im.crop((int(w * 0.06), int(h * 0.22), int(w * 0.94), int(h * 0.80))); crop = crop.resize((crop.width // 2, crop.height // 2), Image.LANCZOS); crop = ImageOps.autocontrast(crop, cutoff=1)
        cp = os.path.join(OUT, f'p{key}.crop.png'); crop.save(cp)
        env = dict(os.environ, OMP_THREAD_LIMIT='1')
        subprocess.run(['nice', '-n', '10', 'tesseract', cp, os.path.join(OUT, f'p{key}.ocr'), '--psm', '6', '-l', 'eng'], capture_output=True, env=env)
        tp = os.path.join(OUT, f'p{key}.ocr.txt')
        man['pages'][key] = {'status': 'ok', 'page': pg, 'url': url, 'master_bytes': os.path.getsize(tif), 'master_sha256': sha(tif), 'master_px': [w, h], 'crop_fractions': [0.06, 0.22, 0.94, 0.80], 'crop_scale': 0.5,
                             'ocr_text': os.path.relpath(tp, ROOT), 'ocr_sha256': sha(tp), 'tesseract': subprocess.run(['tesseract', '--version'], capture_output=True, text=True).stdout.splitlines()[0],
                             'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'master_deleted_after_reading': True}
        os.remove(tif); json.dump(man, open(mp, 'w'), indent=1); print(key, 'ok', man['pages'][key]['ocr_sha256'][:12], flush=True)
if __name__ == '__main__': main()
