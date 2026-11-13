#!/usr/bin/env python3
"""Make an OCR text variant of a saved scanned PDF (photocopied typescripts whose embedded text layer is damaged).

Why: several National Park Service studies are photocopies of typescripts; their text layer is full of speckle
noise and cannot be quoted. This script renders each page at 300 dpi, removes photocopy specks that lie outside the
text lines (OpenCV connected components), and reads the page with tesseract (single thread, page segmentation 6).

  ocr.py ID [ID...] [--pages A-B] [--psm N] [--dpi N]
  needs tmp/library/web/nps/<ID>/<ID>.pdf (re-download with rawtext.py --fetch ID; the sha256 is checked against the manifest)

Output (never replaces the text layer): tmp/library/web/nps/<ID>/<ID>.ocr.txt with the same '=== PAGE n ===' markers
as the other variants; MANIFEST.json gets ocr_text_path / ocr_text_bytes / ocr_text_sha256 / ocr_engine; page images
used for reading are cached under tmp/library/web/nps/_ocr/<ID>/p<nnn>.png (scratch, untracked).

The OCR text is a machine reading: a quote from it is only ever used after the page image was looked at (the extract
record says so in `image_checked`) and every letter that differs from the page is listed with the explicit
{{saved|fixed}} form of the extract definition files. Digits are always checked against the image.
Run with python3 -I through the machine lock: tools/horde/bench.sh python3 -I ocr.py ID
"""
import hashlib, json, os, subprocess, sys, time

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
SCRATCH = os.path.join(LIB, '_ocr')
ENGINE_FMT = 'tesseract %s eng, --psm %d, OMP_THREAD_LIMIT=1; pdftoppm -r %d -gray; speck filter of scripts/ocr.py (connected components outside the text lines removed)'


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def clean_page(gray):
    """Remove photocopy specks: keep letter-like components, components inside the text bands, and small marks
    (periods, commas, i-dots) that have a letter-like component beside them on the same line."""
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    n, lab, st, cen = cv2.connectedComponentsWithStats(bw, connectivity=8)
    H, W = bw.shape
    if n < 30:
        return gray
    area, w, h = st[:, cv2.CC_STAT_AREA], st[:, cv2.CC_STAT_WIDTH], st[:, cv2.CC_STAT_HEIGHT]
    core = (area >= 80) & (area <= 5000) & (h >= 14) & (h <= 150) & (w <= 200)
    core[0] = False
    if core.sum() < 30:
        return gray
    mask = np.isin(lab, np.where(core)[0]).astype(np.uint8)
    prof = mask.sum(axis=1).astype(np.float32)
    prof = cv2.GaussianBlur(prof.reshape(-1, 1), (1, 41), 0).ravel()
    rows = prof > max(8, prof.max() * 0.06)
    xs = np.concatenate([np.arange(st[i, 0], st[i, 0] + st[i, 2]) for i in np.where(core)[0]])
    x0, x1 = np.percentile(xs, 0.5), np.percentile(xs, 99.5)
    cidx = np.where(core)[0]
    ccx, ccy = cen[cidx, 0], cen[cidx, 1]
    keep = np.zeros(n, bool)
    for i in range(1, n):
        cx, cy = cen[i]
        if not (rows[min(H - 1, max(0, int(cy)))] and (x0 - 40) <= cx <= (x1 + 40)):
            continue
        if area[i] >= 90:
            keep[i] = True
        elif area[i] >= 14:
            keep[i] = bool(np.any((np.abs(ccy - cy) < 60) & (np.abs(ccx - cx) < 45)))
    return np.where(keep[lab], 0, 255).astype(np.uint8)


def tesseract_version():
    return subprocess.run(['tesseract', '--version'], capture_output=True, text=True).stdout.split()[1]


def fetch_if_missing(sid):
    pdf = os.path.join(LIB, sid, sid + '.pdf')
    if not os.path.exists(pdf):
        subprocess.run([sys.executable, '-I', os.path.join(HERE, 'rawtext.py'), '--fetch', sid], check=True)
    return pdf


def ocr_source(sid, pages=None, psm=6, dpi=300):
    pdf = fetch_if_missing(sid)
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    npages = int(info.split('Pages:')[1].split()[0])
    lo, hi = pages or (1, npages)
    sd = os.path.join(SCRATCH, sid)
    os.makedirs(sd, exist_ok=True)
    dest = os.path.join(LIB, sid, sid + '.ocr.txt')
    done = {}
    if os.path.exists(dest):  # resume: keep pages already read
        import re
        parts = re.split(r'^=== PAGE (\d+) ===\n', open(dest, encoding='utf-8').read(), flags=re.M)
        done = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    t0 = time.time()
    for p in range(1, npages + 1):
        if p in done and not (pages and lo <= p <= hi):
            continue
        if p < lo or p > hi:
            continue
        stem = os.path.join(sd, 'raw%03d' % p)
        subprocess.run(['pdftoppm', '-r', str(dpi), '-gray', '-f', str(p), '-l', str(p), '-png', '-singlefile', pdf, stem], check=True)
        gray = cv2.imread(stem + '.png', cv2.IMREAD_GRAYSCALE)
        os.remove(stem + '.png')
        out = clean_page(gray)
        png = os.path.join(sd, 'p%03d.png' % p)
        cv2.imwrite(png, out)
        try:
            r = subprocess.run(['timeout', '240', 'tesseract', png, 'stdout', '-l', 'eng', '--psm', str(psm)], capture_output=True, text=True, env=env)
            text = r.stdout
        except Exception as e:  # keep going; the page is recorded as unread
            text = ''
        done[p] = text.replace('\f', '')
        print('%s page %d/%d: %d chars (%.0fs elapsed)' % (sid, p, npages, len(done[p]), time.time() - t0), flush=True)
        # write after every page so an interrupted run resumes
        with open(dest + '.tmp', 'w', encoding='utf-8') as f:
            for k in sorted(done):
                t = done[k]
                f.write('=== PAGE %d ===\n%s' % (k, t if t.endswith('\n') or not t else t + '\n'))
        os.replace(dest + '.tmp', dest)
    mp = os.path.join(LIB, 'MANIFEST.json')
    man = json.load(open(mp))
    it = man['items'][sid]
    it['ocr_text_path'] = os.path.relpath(dest, ROOT)
    it['ocr_text_bytes'] = os.path.getsize(dest)
    it['ocr_text_sha256'] = sha(dest)
    it['ocr_engine'] = ENGINE_FMT % (tesseract_version(), psm, dpi)
    it['ocr_pages'] = sorted(done)
    tmp = mp + '.tmp'
    json.dump(man, open(tmp, 'w'), indent=1, sort_keys=True)
    os.replace(tmp, mp)
    print(sid, 'OCR text', it['ocr_text_path'], it['ocr_text_bytes'], 'bytes', it['ocr_text_sha256'])


if __name__ == '__main__':
    a = sys.argv[1:]
    pages = None
    psm, dpi = 6, 300
    ids = []
    i = 0
    while i < len(a):
        if a[i] == '--pages':
            x, _, y = a[i + 1].partition('-'); pages = (int(x), int(y or x)); i += 2
        elif a[i] == '--psm':
            psm = int(a[i + 1]); i += 2
        elif a[i] == '--dpi':
            dpi = int(a[i + 1]); i += 2
        else:
            ids.append(a[i]); i += 1
    for sid in ids:
        ocr_source(sid, pages, psm, dpi)
