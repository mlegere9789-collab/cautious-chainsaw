#!/usr/bin/env python3
"""Inventory of every image a built site tree serves or references (read-only).

    python tools/t0/images/inventory.py --dist release/R1c/dist [--json out.json] [--label "R1c without IMG"]
    python tools/t0/images/inventory.py --dist tmp/b1863/images/img-R1c/dist --json tmp/b1863/images/inv-after.json

Counts: image files, image references by kind (img, icon links, og/twitter, manifest icons/screenshots, css url(), js strings), pages, inline <svg>, PDFs with pictures,
and the raster imagery the map pulls from outside the tree (Mapbox styles, Google Street View embed), which is NOT in the tree and is reported separately.
Each image file is decoded with Pillow (verify + load) and classified:
  REAL-IMAGE-OF-GETTYSBURG   a row of docs/basemap1863/site-images/ledger.json (crop/resize of a public-domain 1863 photograph)
  NOT-GETTYSBURG             generic or generated art (stars, title cards with dots and contour lines), by file name rules below, or any raster that is neither in the ledger nor a UI glyph
  UI-GLYPH                   a sprite or inline icon of controls (not a picture of anything)
  UNKNOWN                    cannot be classified from the file (none expected)
"""
import argparse
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SITE = 'https://gettysburginteractivemap.com'
IMG_EXT = re.compile(r'\.(png|jpe?g|gif|webp|avif|ico|svg|bmp|tiff?)$', re.I)

# what the generic files of the pre-IMG trees are (found by looking at each file; see INVENTORY.md)
GENERIC = {
    'favicon.ico': 'generic gold five-point star on a dark tile (a symbol, not a place)',
    'apple-touch-icon.png': 'the same star icon, 180 px',
    'apple-touch-icon-precomposed.png': 'the same star icon, 180 px',
    'icons/icon-192.png': 'the star icon with a time-slider bar, 192 px',
    'icons/icon-512.png': 'the star icon with a time-slider bar, 512 px',
    'icons/icon-maskable-192.png': 'the star icon, maskable, 192 px',
    'icons/icon-maskable-512.png': 'the star icon, maskable, 512 px',
    'og/card-r1.png': 'generated title card: gold title text, red and blue dots and drawn contour lines on near-black (no photograph, no real terrain)',
    'screenshots/day1.png': 'generated title card "First contact on McPherson\'s Ridge" (dots, arrows, contours); labelled a screenshot in the manifest; production serves this file corrupt',
    'screenshots/day3.png': 'generated title card "Pickett\'s Charge across the open fields" (dots, arrows, contours); labelled a screenshot in the manifest; production serves this file corrupt',
}
UI = {'icons.svg': 'sprite of 19 stroke-line interface glyphs (compass, search, clock, menu ...); not referenced by any page; not well-formed XML (a double hyphen inside its comment)'}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def walk(d):
    out = []
    for root, _dirs, files in os.walk(d):
        for f in files:
            out.append(os.path.relpath(os.path.join(root, f), d).replace(os.sep, '/'))
    return sorted(out)


def read(d, rel):
    with open(os.path.join(d, rel), 'rb') as f:
        return f.read()


def attrs(tag):
    return {m.group(1).lower(): m.group(3) if m.group(3) is not None else m.group(4) for m in re.finditer(r'([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|\'([^\']*)\')', tag)}


def decode_ok(d, rel):
    from PIL import Image
    if rel.endswith('.svg'):
        t = read(d, rel).decode('utf-8', 'replace')
        return ('svg', None, '<svg' in t and '</svg>' in t.rstrip()[-8:], '')
    try:
        im = Image.open(os.path.join(d, rel))
        fmt = im.format
        im.verify()
        im = Image.open(os.path.join(d, rel))
        im.load()
        return (fmt, list(im.size), True, '')
    except Exception as e:   # noqa: BLE001
        return (None, None, False, str(e)[:120])


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dist', required=True)
    ap.add_argument('--json')
    ap.add_argument('--label', default='')
    a = ap.parse_args(argv)
    d = os.path.join(REPO, a.dist)
    files = walk(d)
    led_path = os.path.join(REPO, 'docs', 'basemap1863', 'site-images', 'ledger.json')
    ledger = {}
    if os.path.isfile(led_path):
        with open(led_path, encoding='utf-8') as f:
            ledger = {r['path']: r for r in json.load(f)['rows']}
    imgs = []
    for rel in files:
        if rel.startswith('_ops/') or not IMG_EXT.search(rel):
            continue
        raw = read(d, rel)
        fmt, px, ok, err = decode_ok(d, rel)
        if rel in UI:
            klass, what = 'UI-GLYPH', UI[rel]
        elif rel in ledger and ledger[rel]['sha256'] == sha(raw):
            klass, what = 'REAL-IMAGE-OF-GETTYSBURG', ledger[rel]['shows']
        elif rel in GENERIC:
            klass, what = 'NOT-GETTYSBURG', GENERIC[rel]
        else:
            klass, what = ('NOT-GETTYSBURG' if rel not in ledger else 'UNKNOWN'), 'raster that is not in the ledger'
        imgs.append({'path': rel, 'bytes': len(raw), 'sha256': sha(raw), 'format': fmt, 'px': px, 'decodes': ok, 'error': err, 'class': klass, 'what': what})
    # references
    refs = []
    pages = [f for f in files if f.endswith('.html')]
    inline_svg = {}
    for p in pages:
        t = read(d, p).decode('utf-8', 'replace')
        n = len(re.findall(r'<svg\b', t, re.I))
        if n:
            inline_svg[p] = n
        for m in re.finditer(r'<img\b[^>]*>', t, re.I):
            at = attrs(m.group(0))
            refs.append({'from': p, 'kind': 'img', 'url': at.get('src', ''), 'alt': at.get('alt')})
        for m in re.finditer(r'<link\b[^>]*>', t, re.I):
            at = attrs(m.group(0))
            if re.search(r'icon|image_src', at.get('rel', ''), re.I):
                refs.append({'from': p, 'kind': 'link-' + at.get('rel', ''), 'url': at.get('href', '')})
        for m in re.finditer(r'<meta\b[^>]*>', t, re.I):
            at = attrs(m.group(0))
            k = (at.get('property') or at.get('name') or '').lower()
            if re.match(r'^(og:image|twitter:image)$', k):
                refs.append({'from': p, 'kind': k, 'url': at.get('content', '')})
    if 'manifest.json' in files:
        mf = json.loads(read(d, 'manifest.json'))
        for i in mf.get('icons', []):
            refs.append({'from': 'manifest.json', 'kind': 'manifest-icon', 'url': i['src']})
        for i in mf.get('screenshots', []):
            refs.append({'from': 'manifest.json', 'kind': 'manifest-screenshot', 'url': i['src']})
    css_urls = 0
    for f in files:
        if f.endswith('.css'):
            for m in re.finditer(r'url\(\s*([\'"]?)([^)\'"]+)\1\s*\)', read(d, f).decode('utf-8', 'replace')):
                u = m.group(2)
                if not (u.startswith('#') or u.startswith('%23') or u.startswith('data:')):
                    css_urls += 1
                    refs.append({'from': f, 'kind': 'css-url', 'url': u})
    by_kind = {}
    for r in refs:
        by_kind[r['kind']] = by_kind.get(r['kind'], 0) + 1
    entry = ''
    for f in files:
        if re.match(r'assets/index-[0-9a-f]+\.js$', f) or re.match(r'assets/index-.*\.js$', f):
            entry = read(d, f).decode('utf-8', 'replace')
            break
    ext = {
        'mapbox_satellite_style_in_entry': len(re.findall(r'mapbox://styles/mapbox/satellite-v9', entry)),
        'mapbox_standard_style_in_entry': len(re.findall(r'mapbox://styles/mapbox/standard', entry)),
        'google_streetview_embed_in_entry': len(re.findall(r'google\.com/maps/embed/v1/streetview', entry)),
        'pages_with_mapbox_gl_script': sorted(p for p in pages if re.search(r'mapbox-gl\.js', read(d, p).decode('utf-8', 'replace'))),
        'pages_with_satellite_style': sorted(p for p in pages if re.search(r'satellite-v9', read(d, p).decode('utf-8', 'replace'))),
        'data_uri_images_in_entry': len(re.findall(r'data:image/[a-z+]+;base64', entry)),
    }
    pdf = {}
    for f in files:
        if f.endswith('.pdf'):
            b = read(d, f).decode('latin1')
            pdf[f] = {'image_xobjects': len(re.findall(r'/Subtype\s*/Image\b', b)), 'bytes': len(b)}
    counts = {
        'image_files': len(imgs),
        'raster_files': sum(1 for i in imgs if not i['path'].endswith('.svg')),
        'REAL-IMAGE-OF-GETTYSBURG': sum(1 for i in imgs if i['class'] == 'REAL-IMAGE-OF-GETTYSBURG'),
        'NOT-GETTYSBURG': sum(1 for i in imgs if i['class'] == 'NOT-GETTYSBURG'),
        'UI-GLYPH': sum(1 for i in imgs if i['class'] == 'UI-GLYPH'),
        'UNKNOWN': sum(1 for i in imgs if i['class'] == 'UNKNOWN'),
        'files_that_do_not_decode': sum(1 for i in imgs if not i['decodes']),
        'image_references': len(refs),
        'references_by_kind': by_kind,
        'pages': len(pages),
        'pages_with_og_image': len({r['from'] for r in refs if r['kind'] == 'og:image'}),
        'distinct_og_images': len({r['url'] for r in refs if r['kind'] == 'og:image'}),
        'img_elements': sum(1 for r in refs if r['kind'] == 'img'),
        'img_elements_with_alt': sum(1 for r in refs if r['kind'] == 'img' and (r.get('alt') or '').strip()),
        'og_image_alt_tags': sum(len(re.findall(r'property="og:image:alt"', read(d, p).decode('utf-8', 'replace'))) for p in pages),
        'inline_svg_elements': sum(inline_svg.values()),
        'inline_svg_pages': inline_svg,
        'total_image_bytes': sum(i['bytes'] for i in imgs),
    }
    res = {'label': a.label or a.dist, 'dist': a.dist, 'counts': counts, 'images': imgs, 'references': refs, 'external_imagery': ext, 'pdf': pdf}
    if a.json:
        os.makedirs(os.path.dirname(os.path.join(REPO, a.json)) or '.', exist_ok=True)
        with open(os.path.join(REPO, a.json), 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    print('== %s' % res['label'])
    for k, v in counts.items():
        if k not in ('references_by_kind', 'inline_svg_pages'):
            print('  %-32s %s' % (k, v))
    print('  references_by_kind              %s' % json.dumps(by_kind))
    for i in imgs:
        print('  %-34s %-6s %-12s %8d B  %-26s %s' % (i['path'], i['format'], 'x'.join(map(str, i['px'])) if i['px'] else '-', i['bytes'], i['class'], '' if i['decodes'] else 'DOES NOT DECODE ' + i['error']))
    print('  external imagery (not in the tree): %s' % json.dumps({k: (v if not isinstance(v, list) else len(v)) for k, v in ext.items()}))
    print('  pdf: %s' % json.dumps(pdf))
    return 0


if __name__ == '__main__':
    sys.exit(main())
