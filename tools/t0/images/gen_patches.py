#!/usr/bin/env python3
"""Write tools/t0/patches-next/IMG.json (the optional patch group IMG) and tools/t0/images/IMG-overlay.json (the manifest rows).

    python tools/t0/images/gen_patches.py [--dist release/R1c/dist] [--check]

The page rows are asserted string patches (`expect` = the number of times the anchor occurs on that page now; the builder fails the whole build if it is
different).  Which pages carry an og:image / twitter:image tag is read from --dist (a built R1c tree), nothing is guessed.  Alt text, captions and the file
names come from build_images.py, so the ledger, the patch and the files cannot drift apart.

Ordering: the anchors are the text AFTER the page group PG-maps (it moved every og:image from the corrupt screenshots/day3.png to og/card-r1.png), so the
wrapper tools/t0/images/img_build.py stages this file as the page group `PG-zimg` (page groups run in file-name order, after every fixed group).
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import build_images as BI  # noqa: E402

OG_OLD = 'https://gettysburginteractivemap.com/og/card-r1.png'
OG_NEW = 'https://gettysburginteractivemap.com/og/gettysburg-card.jpg'
CARD_ALT = [r for r in BI.ROWS if r['path'] == 'og/gettysburg-card.jpg'][0]['alt']

FIGURES = {   # page -> (ledger path, column padding like the page's <main>, caption colour, link colour, caption alignment): the figure lines up with the page's own column
    'education.html': ('img/gettysburg-from-the-west-1863.jpg', '6%', '#d5deef', '#ffd166', 'center'),      # blue page: --accent #ffd166, text #dde
    'turning-points.html': ('img/round-top-breastworks-july-1863.jpg', '5%', '#8a93a8', '#c9a24b', 'left'),
    'aftermath.html': ('img/trostle-farm-july-1863.jpg', '5%', '#8a93a8', '#c9a24b', 'left'),
}
SOURCE_LINK = {
    'SRC-MET-268205': ('The Metropolitan Museum of Art, 33.65.394', 'https://www.metmuseum.org/art/collection/search/268205', 'Public domain (Met Open Access)'),
    'SRC-NARA-533312': ('U.S. National Archives, ARC 533312', 'https://catalog.archives.gov/id/533312', 'Public domain'),
    'SRC-NARA-533316': ('U.S. National Archives, ARC 533316', 'https://catalog.archives.gov/id/533316', 'Public domain'),
}


def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def figure_html(row, pad, col, link, align):
    srcid = row['src']
    label, url, lic = SOURCE_LINK[srcid]
    w, h = row['px']
    return (
        '<figure class="gtbg-photo" style="max-width:720px;margin:18px auto 0;padding:0 %s">'
        '<img src="/%s" width="%d" height="%d" alt="%s" loading="lazy" decoding="async" '
        'style="display:block;width:100%%;height:auto;border:1px solid #1e1e2e;border-radius:6px" />'
        '<figcaption style="font-family:sans-serif;font-size:12px;line-height:1.5;color:%s;margin-top:8px;text-align:%s">%s '
        '<a href="%s" rel="noopener" style="color:%s">%s</a>. %s.</figcaption>'
        '</figure>\n'
    ) % (pad, row['path'], w, h, esc(row['alt']), col, align, esc(row['caption']), url, link, esc(label), esc(lic))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dist', default='release/R1c/dist')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args(argv)
    dist = os.path.join(REPO, a.dist)
    rows = {r['path']: r for r in BI.ROWS}
    # px of the figures comes from the ledger rows computed from the committed files
    import io
    from PIL import Image
    for p, r in rows.items():
        f = os.path.join(BI.OVERLAY, p)
        r['px'] = list(Image.open(f).size) if p != 'favicon.ico' else [48, 48]
    patches = []
    pages = sorted(f for f in os.listdir(dist) if f.endswith('.html'))
    n_og = n_tw = 0
    for page in pages:
        text = open(os.path.join(dist, page), encoding='utf-8', newline='').read()
        stem = page[:-5]
        og = len(re.findall(r'<meta property="og:image" content="%s" />' % re.escape(OG_OLD), text))
        tw = len(re.findall(r'<meta name="twitter:image" content="%s" />' % re.escape(OG_OLD), text))
        if og:
            assert og == 1, (page, og)
            patches.append({
                'id': 'IMG:og:%s:og-image' % stem, 'target': page,
                'find': '<meta property="og:image" content="%s" />' % OG_OLD,
                'repl': ('<meta property="og:image" content="%s" />\n<meta property="og:image:type" content="image/jpeg" />\n<meta property="og:image:width" content="1200" />\n'
                         '<meta property="og:image:height" content="630" />\n<meta property="og:image:alt" content="%s" />') % (OG_NEW, esc(CARD_ALT)),
                'expect': 1,
                'note': 'social card: the corrupt screenshots/day3.png (production) / the generated title card (R1c) becomes a real 1863 photograph of Gettysburg (docs/basemap1863/site-images/LEDGER.md)'})
            n_og += 1
        if tw:
            assert tw == 1, (page, tw)
            patches.append({
                'id': 'IMG:og:%s:twitter-image' % stem, 'target': page,
                'find': '<meta name="twitter:image" content="%s" />' % OG_OLD,
                'repl': '<meta name="twitter:image" content="%s" />\n<meta name="twitter:image:alt" content="%s" />' % (OG_NEW, esc(CARD_ALT)),
                'expect': 1, 'note': 'twitter card image, same file and alt text as og:image'})
            n_tw += 1
    for page, (path, pad, col, link, align) in sorted(FIGURES.items()):
        assert os.path.isfile(os.path.join(dist, page))
        text = open(os.path.join(dist, page), encoding='utf-8', newline='').read()
        assert text.count('</header>') == 1, page
        patches.append({
            'id': 'IMG:figure:%s' % page[:-5], 'target': page, 'find': '</header>', 'repl': '</header>\n' + figure_html(rows[path], pad, col, link, align), 'expect': 1,
            'note': 'one real period photograph with alt text and a provenance caption (source, date, licence link): %s' % path})
    patches.append({
        'id': 'IMG:icons:index-link-icon', 'target': 'index.html',
        'find': '<link rel="icon" href="/icons/icon-192.png" type="image/png" />', 'repl': '<link rel="icon" href="/icons/gettysburg-192.png" type="image/png" />', 'expect': 1,
        'note': 'tab icon: the generic star becomes the gatehouse photograph (new file name: the legacy netlify.toml serves /icons/* immutable for a year, so no icon is replaced under an old name)'})
    group = {
        'group': 'IMG',
        'description': 'Optional group IMG (owner requirement: the site uses ONLY actual images of Gettysburg). Replaces every generic or corrupt image (the star icons, the generated title cards, the corrupt screenshots/day*.png that production still names in og:image) by derivatives of public-domain 1863 photographs (Library of Congress, National Archives, The Metropolitan Museum of Art), adds 3 captioned period photographs, and removes the PWA "screenshots" that were never screenshots. Pages carry alt text and a provenance caption; every file is in docs/basemap1863/site-images/LEDGER.md. Generated by tools/t0/images/gen_patches.py; the files are tools/t0/images/overlay/common/** (applied by the wrapper tools/t0/images/img_build.py: it stages this file as the page group PG-zimg so that it runs after PG-maps).',
        'patches': patches,
        'delete': ['icons/icon-192.png', 'icons/icon-512.png', 'screenshots/day1.png', 'screenshots/day3.png'],
    }
    out = json.dumps(group, indent=1, ensure_ascii=False) + '\n'
    # the manifest rows (applied by the wrapper to the staged overlay manifest.json, asserted the same way)
    ov = {
        'file': 'manifest.json',
        'rows': [
            {'id': 'IMG:manifest:icons',
             'find': ('    {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},\n'
                      '    {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},\n'
                      '    {"src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},\n'
                      '    {"src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}\n'),
             'repl': ('    {"src": "/icons/gettysburg-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},\n'
                      '    {"src": "/icons/gettysburg-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},\n'
                      '    {"src": "/icons/gettysburg-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},\n'
                      '    {"src": "/icons/gettysburg-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}\n'),
             'expect': 1},
            {'id': 'IMG:manifest:screenshots',
             'find': ('  "screenshots": [\n'
                      '    {"src": "/screenshots/day1.png", "sizes": "1280x720", "type": "image/png", "label": "Day 1 -- July 1, 1863: First contact on McPherson\'s Ridge", "form_factor": "wide"},\n'
                      '    {"src": "/screenshots/day3.png", "sizes": "1280x720", "type": "image/png", "label": "Day 3 -- Pickett\'s Charge across the open fields", "form_factor": "wide"}\n'
                      '  ],\n'),
             'repl': '', 'expect': 1,
             'note': 'the two "screenshots" were generated title cards (production: corrupt files), not screenshots of the app; a manifest screenshot must show the app, so they are removed until real screenshots exist'},
        ],
        'remove_from_overlay': ['screenshots/day1.png', 'screenshots/day3.png', 'og/card-r1.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png'],
    }
    ov_out = json.dumps(ov, indent=1, ensure_ascii=False) + '\n'
    targets = {os.path.join(REPO, 'tools', 't0', 'patches-next', 'IMG.json'): out, os.path.join(HERE, 'IMG-overlay.json'): ov_out}
    bad = 0
    for p, txt in targets.items():
        if a.check:
            same = os.path.isfile(p) and open(p, encoding='utf-8', newline='').read() == txt
            print('%s %s' % ('same     ' if same else 'DIFFERS  ', os.path.relpath(p, REPO)))
            bad += 0 if same else 1
        else:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(txt)
            print('wrote', os.path.relpath(p, REPO))
    print('%d patches (%d og:image, %d twitter:image, %d figures, 1 link icon); %d deletes' % (len(patches), n_og, n_tw, len(FIGURES), len(group['delete'])))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
