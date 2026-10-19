#!/usr/bin/env python3
"""Derive every image the IMG group ships from the verified source photographs (tools/t0/images/sources.json) and write the licence ledger.

    python tools/t0/images/fetch_sources.py            # once: the sources, sha256-pinned, into tmp/b1863/images/sources/
    python tools/t0/images/build_images.py             # derivatives -> tools/t0/images/overlay/common/** , ledger -> docs/basemap1863/site-images/
    python tools/t0/images/build_images.py --check     # rebuild in memory and compare with the committed files (exit 1 on any difference)

Everything here is a crop, a resize, a tone-neutral JPEG/PNG encode, or (the social card only) a title text laid over a crop of a real photograph.  Nothing is
painted, retouched, colourised or generated: the pixels of every derivative are pixels of an 1863 photograph (the icons and figures) or those pixels under a
dark gradient and white text (the social card).  Fonts for the card: Georgia Bold and Segoe UI from the Windows font folder (not redistributed).

Outputs (paths are dist-relative, the overlay root is tools/t0/images/overlay/common):
  og/gettysburg-card.jpg              1200x630  social card (og:image, twitter:image)
  favicon.ico                         16/32/48  from the gatehouse crop
  apple-touch-icon.png + -precomposed 180x180
  icons/gettysburg-192.png, -512.png                 'any' icons (rounded, gold keyline)
  icons/gettysburg-maskable-192.png, -512.png        'maskable' icons (full bleed, subject inside the central 80 percent)
  img/gettysburg-from-the-west-1863.jpg      figure on education.html
  img/round-top-breastworks-july-1863.jpg    figure on turning-points.html
  img/trostle-farm-july-1863.jpg             figure on aftermath.html
and  docs/basemap1863/site-images/ledger.json  +  LEDGER.md  (every shipped file: what it shows, source, licence, attribution, derivation, sha256).
"""
import argparse
import hashlib
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OVERLAY = os.path.join(HERE, 'overlay', 'common')
DOCS = os.path.join(REPO, 'docs', 'basemap1863', 'site-images')
SRC_DIR = os.path.join(REPO, 'tmp', 'b1863', 'images', 'sources')
GOLD = (201, 162, 75)
BG = (10, 10, 20)
FONTS = 'C:/Windows/Fonts/'


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def load_doc():
    with open(os.path.join(HERE, 'sources.json'), encoding='utf-8') as f:
        return json.load(f)


def open_src(src_id):
    im = Image.open(os.path.join(SRC_DIR, src_id + '.jpg'))
    im.load()
    return im.convert('RGB')


def jpeg(im, q=84):
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if q >= 90 else 2)
    return b.getvalue()


def png(im):
    """8-bit palette PNG (256-colour octree, no dithering): an albumen print is a one-tone image and the result is visually identical at icon sizes (checked
    side by side at 512 px); keeps the icons near 75 KB instead of 370 KB.  Alpha (the rounded corners of the 'any' icons) is kept."""
    q = im.convert('RGBA').quantize(256, Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO()
    q.save(b, 'PNG', optimize=True)
    return b.getvalue()


def crop(im, box):
    return im.crop(tuple(int(round(v)) for v in box))


def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


# ---------------------------------------------------------------- crops (pixel boxes in the source files; the margins/mounts/handwriting are excluded)
CROPS = {
    # Met 268204: the print area is x 40..2510, y 60..1900; the card keeps the full print width and a 1.905:1 band from the sky down into the dark foreground
    'card': ('SRC-MET-268204', (70, 400, 2480, 1665)),
    # Met 268205: the print area (the mount shows a white border)
    'west': ('SRC-MET-268205', (60, 45, 2545, 1905)),
    'roundtop': ('SRC-NARA-533312', (75, 45, 2900, 2185)),
    'trostle': ('SRC-NARA-533316', (70, 48, 2950, 2190)),
    # LoC gateway: the photograph inside the album page is (1343, 891, 4816, 3567); icon squares are centred on the gatehouse
    'gate_any': ('SRC-LOC-2006692500', (1611, 1278, 1611 + 1844, 1278 + 1844)),
    'gate_mask': ('SRC-LOC-2006692500', (1343 + 20 * 2.9735, 891 + 70 * 2.9735, 1343 + 780 * 2.9735, 891 + 830 * 2.9735)),
}


def _rounded_icon(sq, size, radius_frac=0.19, border_frac=0.035):
    """'any' icon: the crop, rounded corners (transparent outside) and a gold keyline"""
    S = size * 4
    big = sq.resize((S, S), Image.LANCZOS)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(big, (0, 0), mask)
    line = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(line)
    bw = max(2, int(S * border_frac))
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), outline=GOLD + (255,), width=bw)
    out = Image.alpha_composite(out, line)
    return out.resize((size, size), Image.LANCZOS)


def make_icons():
    files = {}
    srcid, box = CROPS['gate_any']
    sq = crop(open_src(srcid), box)
    for n in (192, 512):
        files['icons/gettysburg-%d.png' % n] = png(_rounded_icon(sq, n))
    srcid, box = CROPS['gate_mask']
    mk = crop(open_src(srcid), box)
    for n in (192, 512):
        files['icons/gettysburg-maskable-%d.png' % n] = png(mk.resize((n, n), Image.LANCZOS))
    a180 = sq.resize((180, 180), Image.LANCZOS)          # iOS rounds the corners itself: full bleed
    files['apple-touch-icon.png'] = png(a180)
    files['apple-touch-icon-precomposed.png'] = files['apple-touch-icon.png']
    ico_src = sq.resize((256, 256), Image.LANCZOS)
    b = io.BytesIO()
    ico_src.save(b, 'ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    files['favicon.ico'] = b.getvalue()
    return files


def make_card():
    srcid, box = CROPS['card']
    ph = crop(open_src(srcid), box).resize((1200, 630), Image.LANCZOS).convert('RGB')
    W, H = ph.size
    # dark scrim from the bottom (the foreground of the print is already dark) and a thin gold bar on top, as on the old card
    grad = Image.new('L', (1, H), 0)
    for y in range(H):
        t = max(0.0, (y - H * 0.28) / (H * 0.72))
        grad.putpixel((0, y), int(235 * min(1.0, t ** 1.35)))
    grad = grad.resize((W, H))
    ph = Image.composite(Image.new('RGB', (W, H), BG), ph, grad)
    d = ImageDraw.Draw(ph)
    d.rectangle([0, 0, W, 5], fill=GOLD)
    x = 64
    d.text((x, 292), 'JULY 1\u20133, 1863', font=font('segoeuib.ttf', 25), fill=GOLD)
    d.text((x, 330), 'The Battle', font=font('georgiab.ttf', 84), fill=(240, 237, 228))
    d.text((x, 418), 'of Gettysburg', font=font('georgiab.ttf', 84), fill=(240, 237, 228))
    d.line([(x, 530), (x + 92, 530)], fill=GOLD, width=3)
    d.text((x, 544),'An interactive, animated map of the three-day battle', font=font('segoeui.ttf', 26), fill=(190, 198, 214))
    cred = "Photograph: T. H. O\u2019Sullivan, 1863. The Metropolitan Museum of Art, public domain"
    f = font('segoeui.ttf', 15)
    w = d.textlength(cred, font=f)
    d.text((W - w - 22, H - 28), cred, font=f, fill=(176, 184, 200))
    return jpeg(ph, 86)


def make_figures():
    out = {}
    for key, name, width in (('west', 'img/gettysburg-from-the-west-1863.jpg', 1000), ('roundtop', 'img/round-top-breastworks-july-1863.jpg', 1000),
                             ('trostle', 'img/trostle-farm-july-1863.jpg', 1000)):
        srcid, box = CROPS[key]
        im = crop(open_src(srcid), box)
        h = int(round(im.size[1] * width / im.size[0]))
        out[name] = jpeg(im.resize((width, h), Image.LANCZOS), 82)
    return out


# ---------------------------------------------------------------- ledger rows
ATTR = {
    'SRC-MET-268204': "Timothy H. O'Sullivan, [Gettysburg, Pennsylvania from Seminary Ridge], 1863. The Metropolitan Museum of Art, New York, Harris Brisbane Dick Fund, 1933 (33.65.393). Public domain / CC0 (Met Open Access).",
    'SRC-MET-268205': "Timothy H. O'Sullivan, [Gettysburg, Pennsylvania from the West], 1863. The Metropolitan Museum of Art, New York, Harris Brisbane Dick Fund, 1933 (33.65.394). Public domain / CC0 (Met Open Access).",
    'SRC-LOC-2006692500': "Negative by Timothy H. O'Sullivan, July 1863; positive by Alexander Gardner. Gateway of cemetery, Gettysburg. Library of Congress, Prints and Photographs Division, LC-DIG-ppmsca-12560. No known restrictions on publication.",
    'SRC-NARA-533312': "Timothy H. O'Sullivan (negative, July 1863; print by Alexander Gardner, c. 1865). Interior view of breastworks on Round Top. National Archives (ARC 533312). Public domain.",
    'SRC-NARA-533316': "Timothy H. O'Sullivan (negative, July 1863; print by Alexander Gardner, c. 1865). Trossel's (Trostle's) House. National Archives (ARC 533316). Public domain.",
}

ROWS = [
    {'path': 'og/gettysburg-card.jpg', 'use': 'og:image / twitter:image on all 21 pages that name a social card (1200x630)', 'src': 'SRC-MET-268204',
     'shows': "Fields and rooftops of Gettysburg seen from Seminary Ridge, a photograph by T. H. O'Sullivan, with the site title laid over the dark foreground",
     'place_date': 'Seminary Ridge and the town of Gettysburg, Pennsylvania; 1863 (month not recorded)',
     'derivation': 'crop of the print area (x 70-2480, y 400-1665 of the 2553x1964 source), resized to 1200x630, dark gradient and text drawn over it, JPEG q86',
     'alt': "Sepia photograph by Timothy H. O'Sullivan, 1863, of the fields, stone walls and rooftops of Gettysburg seen from Seminary Ridge, with the title The Battle of Gettysburg: an interactive, animated map of the three-day battle."},
    {'path': 'favicon.ico', 'use': 'browser tab icon (/favicon.ico, link rel=icon sizes=any)', 'src': 'SRC-LOC-2006692500',
     'shows': 'The brick gatehouse of Evergreen Cemetery on Cemetery Hill, as photographed in July 1863',
     'place_date': 'Cemetery Hill, Gettysburg; July 1863', 'derivation': 'square crop around the gatehouse (1844 px), resized to 16, 32 and 48 px',
     'alt': 'Icon: the gatehouse of Evergreen Cemetery on Cemetery Hill, from an 1863 photograph'},
    {'path': 'apple-touch-icon.png', 'use': 'iOS home-screen icon (link rel=apple-touch-icon), 180x180', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863', 'place_date': 'Cemetery Hill, Gettysburg; July 1863', 'derivation': 'square crop (1844 px) resized to 180 px, full bleed',
     'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'apple-touch-icon-precomposed.png', 'use': 'legacy iOS icon path, same bytes as apple-touch-icon.png', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863', 'place_date': 'Cemetery Hill, Gettysburg; July 1863', 'derivation': 'identical to apple-touch-icon.png',
     'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'icons/gettysburg-192.png', 'use': 'web app manifest icon, purpose any (192)', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863', 'place_date': 'Cemetery Hill, Gettysburg; July 1863',
     'derivation': 'square crop (1844 px), resized to 192 px, rounded corners and a gold keyline', 'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'icons/gettysburg-512.png', 'use': 'web app manifest icon, purpose any (512)', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863', 'place_date': 'Cemetery Hill, Gettysburg; July 1863',
     'derivation': 'square crop (1844 px), resized to 512 px, rounded corners and a gold keyline', 'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'icons/gettysburg-maskable-192.png', 'use': 'web app manifest icon, purpose maskable (192)', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863 (inside the central 80 percent safe zone)', 'place_date': 'Cemetery Hill, Gettysburg; July 1863',
     'derivation': 'wider square crop (2260 px) resized to 192 px, full bleed', 'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'icons/gettysburg-maskable-512.png', 'use': 'web app manifest icon, purpose maskable (512)', 'src': 'SRC-LOC-2006692500',
     'shows': 'The Evergreen Cemetery gatehouse, July 1863 (inside the central 80 percent safe zone)', 'place_date': 'Cemetery Hill, Gettysburg; July 1863',
     'derivation': 'wider square crop (2260 px) resized to 512 px, full bleed', 'alt': 'Icon: the gatehouse of Evergreen Cemetery, from an 1863 photograph'},
    {'path': 'img/gettysburg-from-the-west-1863.jpg', 'use': 'figure on education.html', 'src': 'SRC-MET-268205',
     'shows': 'The town of Gettysburg seen from the west: a two-storey masonry house and a fenced orchard in the foreground, the roofs and steeples of the town behind',
     'place_date': 'Gettysburg, Pennsylvania, looking east; 1863 (month not recorded)', 'derivation': 'crop of the print area (x 60-2545, y 45-1905), resized to 1000 px wide, JPEG q82',
     'alt': 'Photograph from 1863 taken west of Gettysburg: a two-storey masonry house and a fenced orchard in the foreground, with the roofs and steeples of the town and low hills beyond.',
     'caption': "Gettysburg from the west, photographed in 1863 by Timothy H. O\u2019Sullivan."},
    {'path': 'img/round-top-breastworks-july-1863.jpg', 'use': 'figure on turning-points.html', 'src': 'SRC-NARA-533312',
     'shows': 'A rough stone breastwork and a large boulder among fallen branches and scattered papers, with hazy woods behind', 'place_date': 'Round Top, Gettysburg; July 1863',
     'derivation': 'crop of the print (x 75-2900, y 45-2185; mount and handwriting excluded), resized to 1000 px wide, JPEG q82',
     'alt': 'Sepia photograph of a rough stone breastwork and a large boulder on rocky ground among fallen branches and scattered papers, with hazy woods behind.',
     'caption': "Interior view of breastworks on Round Top, as catalogued by the National Archives. Negative by Timothy H. O\u2019Sullivan, July 1863."},
    {'path': 'img/trostle-farm-july-1863.jpg', 'use': 'figure on aftermath.html', 'src': 'SRC-NARA-533316',
     'shows': 'A white two-storey clapboard farmhouse with a picket fence; dead horses lie on the open ground in front of it', 'place_date': 'Trostle farm, Gettysburg; July 1863',
     'derivation': 'crop of the print (x 70-2950, y 48-2190; mount and handwriting excluded), resized to 1000 px wide, JPEG q82',
     'alt': 'Sepia photograph of a white two-storey clapboard farmhouse with a picket fence and large trees; dead horses lie on the open ground in the foreground.',
     'caption': "The Trostle farmhouse (catalogued as \u201cTrossel\u2019s (Trostle\u2019s) House\u201d), photographed with dead horses in the foreground. Negative by Timothy H. O\u2019Sullivan, July 1863. The photograph shows dead animals."},
]

# non-photographic files that stay, listed so the owner sees every served image-like file (no sha256: other agents may edit them)
UI_ROWS = [
    {'path': 'icons.svg', 'class': 'UI-GLYPH', 'what': 'Sprite of 19 stroke-line user-interface glyphs (compass, search, clock, menu, camera, ...) used on buttons and menus. They are controls, not pictures of Gettysburg; kept. Owner may restyle them.'},
]


def build_all():
    files = {}
    files.update(make_icons())
    files['og/gettysburg-card.jpg'] = make_card()
    files.update(make_figures())
    return files


def ledger(files):
    doc = load_doc()
    srcs = {s['id']: s for s in doc['sources']}
    rows = []
    for r in ROWS:
        s = srcs[r['src']]
        data = files[r['path']]
        im = Image.open(io.BytesIO(data))
        rows.append(dict(r, bytes=len(data), sha256=sha256(data), px=list(im.size) if r['path'] != 'favicon.ico' else [48, 48],
                         status='OK', klass='REAL-IMAGE-OF-GETTYSBURG', attribution=ATTR[r['src']], source=dict(
                             id=s['id'], title=s['title'], creator=s['creator'], date=s['date'], repository=s['repository'], type=s['type'], record_url=s['record_url'],
                             file_url=s['file_url'], licence=s['licence'], licence_url=s['licence_url'], uncertain=s.get('uncertain', ''))))
    return {'schema': 1, 'rows': rows, 'ui': UI_ROWS, 'sources': doc['sources']}


def ledger_md(led):
    L = []
    L.append('# Licence ledger of the images the site serves (IMG group)\n')
    L.append('Generated by `tools/t0/images/build_images.py` from `tools/t0/images/sources.json`; `tests/t0/images.spec.mjs` reads this file and fails on any served image that is missing here or whose sha256 differs.\n')
    L.append('Rule of the owner: the site uses only actual images of Gettysburg. Every row below is a crop or resize of a real 1863 photograph of the Gettysburg battlefield (the social card also carries the site title). Nothing is generated, painted or retouched. Only public-domain sources are used (Library of Congress, U.S. National Archives, The Metropolitan Museum of Art Open Access). Nothing comes from Google Earth, Google Maps, Bing, Maxar or Mapbox.\n')
    L.append('## Shipped images\n')
    L.append('| Path | What it shows | Place and date | Source id | Licence | Derivation | sha256 |')
    L.append('|---|---|---|---|---|---|---|')
    for r in led['rows']:
        L.append('| `%s` | %s | %s | %s | %s | %s | `%s` |' % (r['path'], r['shows'], r['place_date'], r['source']['id'], r['source']['licence'].split(';')[0].split(' (')[0], r['derivation'], r['sha256']))
    L.append('')
    L.append('## Where each file is used\n')
    L.append('| Path | Use | Alt text (for a figure, a page photo; for an icon, its accessible name) |')
    L.append('|---|---|---|')
    for r in led['rows']:
        L.append('| `%s` | %s | %s |' % (r['path'], r['use'], r['alt']))
    L.append('')
    L.append('## Non-photographic files that are kept\n')
    L.append('| Path | Class | What |')
    L.append('|---|---|---|')
    for r in led['ui']:
        L.append('| `%s` | %s | %s |' % (r['path'], r['class'], r['what']))
    L.append('')
    L.append('## Sources\n')
    for s in led['sources']:
        L.append('### %s: %s\n' % (s['id'], s['title']))
        L.append('* Creator: %s' % s['creator'])
        L.append('* Date: %s (record type %s: contemporary primary record)' % (s['date'], s['type']))
        L.append('* Medium: %s' % s['medium'])
        L.append('* Repository: %s' % s['repository'])
        L.append('* Record: %s' % s['record_url'])
        if s.get('record_api'):
            L.append('* Record data read: %s' % s['record_api'])
        L.append('* File fetched: %s' % s['file_url'])
        if s.get('file_page'):
            L.append('* Commons file page: %s' % s['file_page'])
        L.append('* Licence: %s (%s)' % (s['licence'], s['licence_url']))
        L.append('* Source file sha256: `%s` (%dx%d px)' % (s['sha256'], s['px'][0], s['px'][1]))
        L.append('* How it was checked: %s' % s['verified'])
        L.append('* Uncertain: %s' % s['uncertain'])
        L.append('* Attribution line shipped with it: %s\n' % ATTR[s['id']])
    L.append('## What is not claimed\n')
    L.append('* The photographs are real but they are views of the ground, not of the armies in motion; the Round Top and Trostle prints were exposed in July 1863 after the fighting, the two Met prints are dated 1863 without a month.')
    L.append('* No photograph here is an aerial or satellite view: none exists for 1863. The reconstructed 1863 basemap is a separate, labelled reconstruction (docs/basemap1863/).')
    L.append('* Crops remove the album mounts and handwriting; the full plates are at the record URLs above.')
    return '\n'.join(L) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args(argv)
    for s in load_doc()['sources']:
        if not os.path.isfile(os.path.join(SRC_DIR, s['id'] + '.jpg')):
            print('source missing: run tools/t0/images/fetch_sources.py first')
            return 2
    files = build_all()
    led = ledger(files)
    md = ledger_md(led)
    js = json.dumps(led, indent=1, ensure_ascii=False) + '\n'
    if a.check:
        bad = 0
        for p, data in files.items():
            f = os.path.join(OVERLAY, p)
            if not os.path.isfile(f) or open(f, 'rb').read() != data:
                print('DIFFERS', p)
                bad += 1
        for p, txt in (('LEDGER.md', md), ('ledger.json', js)):
            f = os.path.join(DOCS, p)
            if not os.path.isfile(f) or open(f, encoding='utf-8', newline='').read() != txt:
                print('DIFFERS', p)
                bad += 1
        print('check: %s' % ('identical' if not bad else '%d differ' % bad))
        return 1 if bad else 0
    for p, data in files.items():
        f = os.path.join(OVERLAY, p)
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f, 'wb') as fh:
            fh.write(data)
    os.makedirs(DOCS, exist_ok=True)
    with open(os.path.join(DOCS, 'LEDGER.md'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(md)
    with open(os.path.join(DOCS, 'ledger.json'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(js)
    tot = sum(len(v) for v in files.values())
    for p, data in sorted(files.items()):
        print('%-44s %8d B' % (p, len(data)))
    print('total %d B in %d files' % (tot, len(files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
