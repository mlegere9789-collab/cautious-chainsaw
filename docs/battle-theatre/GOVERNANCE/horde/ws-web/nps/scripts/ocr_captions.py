#!/usr/bin/env python3
"""Read the caption strip of photograph pages of a scanned typescript and add it to the OCR text of the page.

Why: on a page that is mostly a halftone photograph the full-page OCR of scripts/ocr.py is noise and the one line that matters
(the caption: plate number, photographer, date, subject) comes out garbled. This script crops the caption strip out of the cached
page image (tmp/library/web/nps/_ocr/<ID>/p<nnn>.png), reads the strip alone with tesseract (--psm 6) and appends the reading to the
text of that page in <ID>.ocr.txt, after a marker line, so that the builder can quote it with the OCR variant (flag ~O).
The full-page reading is left in place. MANIFEST.json gets ocr_caption_pages and a note.

  ocr_captions.py ID PAGE:x0,y0,x1,y1[:ROT] [PAGE:...]
     x0..y1 are fractions (0 to 1) of the page image, ROT is 0 (default), 90 or 270 (degrees counter-clockwise to turn the strip upright)
Run with python3 -I. A quote from the strip is only ever used after the page image was looked at (see ocrq.py)."""
import json, os, re, subprocess, sys

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
MARK = '[caption strip, read separately from the page image]'


def sha(p):
    import hashlib
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def main():
    sid, specs = sys.argv[1], sys.argv[2:]
    dest = os.path.join(LIB, sid, sid + '.ocr.txt')
    parts = re.split(r'^=== PAGE (\d+) ===\n', open(dest, encoding='utf-8').read(), flags=re.M)
    pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    done = []
    for spec in specs:
        pg, _, rest = spec.partition(':')
        box, _, rot = rest.partition(':')
        x0, y0, x1, y1 = [float(v) for v in box.split(',')]
        p = int(pg)
        img = cv2.imread(os.path.join(LIB, '_ocr', sid, 'p%03d.png' % p), cv2.IMREAD_GRAYSCALE)
        H, W = img.shape
        crop = img[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
        if rot == '90':
            crop = cv2.rotate(crop, cv2.ROTATE_90_COUNTERCLOCKWISE)
        elif rot == '270':
            crop = cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE)
        tmp = os.path.join(LIB, '_ocr', sid, 'cap%03d.png' % p)
        cv2.imwrite(tmp, crop)
        r = subprocess.run(['nice', '-n', '10', 'tesseract', tmp, 'stdout', '-l', 'eng', '--psm', '6'], capture_output=True, text=True, env=env)
        os.remove(tmp)
        text = r.stdout.replace('\f', '').strip()
        base = pages[p].split(MARK)[0].rstrip('\n')
        key = lambda t: re.sub(r'[^a-z0-9]', '', t.lower())
        if key(text)[:60] and key(text)[:60] in key(base):
            pages[p] = base + '\n'   # the full-page reading already holds this caption: nothing to add
            print('page %d: the full-page reading already has the caption; strip not appended' % p)
            continue
        pages[p] = base + '\n' + MARK + '\n' + text + '\n'
        done.append(p)
        print('page %d strip: %s' % (p, ' '.join(text.split())[:200]))
    with open(dest + '.tmp', 'w', encoding='utf-8') as f:
        for k in sorted(pages):
            t = pages[k]
            f.write('=== PAGE %d ===\n%s' % (k, t if t.endswith('\n') or not t else t + '\n'))
    os.replace(dest + '.tmp', dest)
    mp = os.path.join(LIB, 'MANIFEST.json')
    man = json.load(open(mp))
    it = man['items'][sid]
    it['ocr_text_bytes'] = os.path.getsize(dest)
    it['ocr_text_sha256'] = sha(dest)
    it['ocr_caption_pages'] = sorted(k for k in pages if MARK in pages[k])
    it['ocr_caption_note'] = 'on these photograph pages the caption strip was read separately (tesseract --psm 6 on the cropped strip, scripts/ocr_captions.py) and appended to the page text after the line "%s"' % MARK
    json.dump(man, open(mp + '.tmp', 'w'), indent=1, sort_keys=True)
    os.replace(mp + '.tmp', mp)


if __name__ == '__main__':
    main()
