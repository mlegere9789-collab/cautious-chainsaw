#!/usr/bin/env python3
"""Fetch a crop of the page image around a quoted passage, to read the print against the OCR text.

Usage: python3 -I crop_quote.py PAGE_ID 'quote text' [--pad 120] [--maxw 1500] [--tag name]
The quote is located in the word list of the page's ALTO file (plain token match); the region is its
bounding box plus padding, scaled from ALTO units to image pixels with the image service's info.json
(one request, cached per page), and requested from the IIIF image service of tile.loc.gov (one request).
Prints the saved path; view it with an image viewer and compare to the quote. 1 request per second applies.
"""
import hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib, rebuild_cols

IIIF = 'https://tile.loc.gov/image-services/iiif/'


def iiif_id(segment):
    s = segment
    assert s.startswith('/service/ndnp/') and s.endswith('.xml')
    return 'service:ndnp:' + s[len('/service/ndnp/'):-4].replace('/', ':')


def main():
    a = sys.argv[1:]
    pid, quote = a[0], ' '.join(a[1].split())
    pad = int(a[a.index('--pad') + 1]) if '--pad' in a else 120
    maxw = int(a[a.index('--maxw') + 1]) if '--maxw' in a else 1500
    tag = a[a.index('--tag') + 1] if '--tag' in a else hashlib.sha1(quote.encode()).hexdigest()[:8]
    man = calib.load_manifest()[pid]
    gz = os.path.join(calib.ROOT, man['alto_gz_path'])
    text, words, info = rebuild_cols.rebuild(gz)
    box = rebuild_cols.quote_box(words, quote)
    if not box:
        print('quote not found as a plain token run in the word list'); sys.exit(2)
    ident = iiif_id(man['segment'])
    infop = os.path.join(calib.IMAGES_DIR, pid + '.info.json')
    if not os.path.exists(infop):
        r = calib.http_get(IIIF + ident + '/info.json', infop, timeout=60, note='image info')
        if r.get('status') != 200:
            print('info.json failed', r); sys.exit(3)
    inf = json.load(open(infop))
    sc = inf['width'] / float(info['width'])
    x0, y0, x1, y1 = box
    X0 = max(0, int(x0 * sc) - pad)
    Y0 = max(0, int(y0 * sc) - pad)
    X1 = min(inf['width'], int(x1 * sc) + pad)
    Y1 = min(inf['height'], int(y1 * sc) + pad)
    w, h = X1 - X0, Y1 - Y0
    size = 'full' if w <= maxw else '%d,' % maxw
    url = '%s%s/%d,%d,%d,%d/%s/0/default.jpg' % (IIIF, ident, X0, Y0, w, h, size)
    out = os.path.join(calib.IMAGES_DIR, pid + '.%s.jpg' % tag)
    r = calib.http_get(url, out, timeout=120, note='image crop of a quote')
    if r.get('status') != 200:
        print('crop failed', r); sys.exit(4)
    calib.append_jsonl(os.path.join(calib.CA_DOCS, 'images.jsonl'), {'page_id': pid, 'tag': tag, 'quote': quote, 'url': url, 'local_path': calib.rel(out),
                       'sha256': r.get('sha256'), 'bytes': r.get('bytes'), 'region_px': [X0, Y0, w, h], 'image_px': [inf['width'], inf['height']],
                       'fetched_at': calib.now()})
    print(out)
    print('region %dx%d px at (%d,%d); image %dx%d; scale %.4f' % (w, h, X0, Y0, inf['width'], inf['height'], sc))


if __name__ == '__main__':
    main()
