#!/usr/bin/env python3
"""WP-T0-14 image / manifest / verification-file generator (own tool, own output folder).

    python tools/t0/assets-src/build_assets.py            render + convert + write tools/t0/overlay/common/** + assets.lock.json
    python tools/t0/assets-src/build_assets.py --check    (no Chrome) verify the overlay files against assets.lock.json and decode them

Inputs : card.html (own vector/typographic art, D-MEDIA: no third-party basemap imagery), legacy/dist/icons/icon-512.png,
         legacy/dist/manifest.json (only to prove the fields that must stay unchanged), the verification text below.
Outputs (all under tools/t0/overlay/common/, applied to R1a and later trains by build.py):
    og/card-r1.png                 1200x630 8-bit RGB, <= 150 KB   (og:image / twitter:image of the 21 pages; new path)
    screenshots/day1.png           1280x720 8-bit RGB              (manifest screenshot; replaces the corrupt 17,585 B file)
    screenshots/day3.png           1280x720 8-bit RGB              (manifest screenshot; replaces the corrupt 17,585 B file)
    icons/icon-maskable-192.png    192x192  8-bit RGB, full bleed, artwork inside the 80 % safe circle (NEW names: /icons/* is immutable)
    icons/icon-maskable-512.png    512x512  same
    manifest.json                  id "/", no orientation, purposes split, screenshots kept (name/short_name/description unchanged)
    google0dca4879c9657741.html    Search Console file (bytes recovered from the archived deploy zips, see below)
Deterministic given the same Chrome/fonts; the committed PNGs are the artifacts the build copies (the build never runs Chrome).
"""
import hashlib
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OVERLAY = os.path.join(REPO, 'tools', 't0', 'overlay', 'common')
LEGACY = os.path.join(REPO, 'legacy', 'dist')
LOCK = os.path.join(HERE, 'assets.lock.json')
AGENT = os.environ.get('T0_AGENT', 't0-maps')
RAW = os.path.join(REPO, 'tmp', AGENT, 'render')

GSC_NAME = 'google0dca4879c9657741.html'
# Recovered byte for byte (53 bytes, no trailing newline) from C:/Users/mlege/gettysburg-archive/zips/{deploy-6a3a0355a036dd8d9892e747,
# gettysburg_fixed_verified_dist,gettysburg_fixed_with_verification,...}.zip: the only google*.html in the 127 archived zips (6 zips, one distinct content).
GSC_BYTES = b'google-site-verification: google0dca4879c9657741.html'

IMAGES = {   # overlay path -> (width, height, max bytes or None)
    'og/card-r1.png': (1200, 630, 150 * 1024),
    'screenshots/day1.png': (1280, 720, None),
    'screenshots/day3.png': (1280, 720, None),
    'icons/icon-maskable-192.png': (192, 192, None),
    'icons/icon-maskable-512.png': (512, 512, None),
}
OUTPUTS = list(IMAGES) + ['manifest.json', GSC_NAME]


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def read(p):
    with open(p, 'rb') as fh:
        return fh.read()


def write(rel, data):
    p = os.path.join(OVERLAY, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as fh:
        fh.write(data)


def save_rgb_png(im, rel):
    """8-bit RGB (colour type 2, no alpha), best deflate, no metadata."""
    p = os.path.join(OVERLAY, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.convert('RGB').save(p, format='PNG', optimize=True, compress_level=9)


def maskable(size):
    """Full-bleed dark background + the existing star/slider artwork scaled into the 80 % safe circle (radius 0.4 * size)."""
    src = Image.open(os.path.join(LEGACY, 'icons', 'icon-512.png')).convert('RGBA')
    bg = (10, 10, 20)                                            # the icon's own fill (sampled: 10,10,20)
    flat = Image.new('RGBA', src.size, bg + (255,))
    flat.alpha_composite(src)
    flat = flat.convert('RGB')                                   # opaque from here on (no alpha edge effects when resampling)
    # The star + slider live inside x 100..412, y 92..455; the gold ring (32..41 px, rounded corners) never enters this window.
    window = (90, 88, 422, 462)
    px = flat.load()
    xs, ys = [], []
    for y in range(window[1], window[3]):
        for x in range(window[0], window[2]):
            r, g, b = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 24:
                xs.append(x)
                ys.append(y)
    box = (min(xs) - 3, min(ys) - 3, max(xs) + 4, max(ys) + 4)   # content bbox with a 3 px guard of plain background
    art = flat.crop(box)
    k = 0.80 * size / 512.0                                      # keeps every content pixel inside the 0.4 * size safe radius (asserted below)
    w, h = max(1, round(art.width * k)), max(1, round(art.height * k))
    art = art.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), bg)
    canvas.paste(art, ((size - w) // 2, (size - h) // 2))
    cpx = canvas.load()
    far = max(((x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2) ** 0.5 for y in range(size) for x in range(size)
              if sum(abs(cpx[x, y][i] - bg[i]) for i in range(3)) > 24)
    assert far <= 0.40 * size, 'maskable %d: content radius %.1f exceeds the safe radius %.1f' % (size, far, 0.40 * size)
    return canvas


def render_raw():
    env = dict(os.environ, T0_AGENT=AGENT)
    os.makedirs(RAW, exist_ok=True)
    r = subprocess.run(['node', os.path.join(HERE, 'render.mjs'), RAW], cwd=REPO, env=env)
    if r.returncode != 0:
        sys.exit('render.mjs failed')


def manifest_text():
    legacy = json.loads(read(os.path.join(LEGACY, 'manifest.json')).decode('utf-8'))
    # fields that must stay unchanged in T0 (D-NAME / S2): echo them from the legacy file, never retype them
    name, short, desc = legacy['name'], legacy['short_name'], legacy['description']
    d = {
        'id': '/', 'name': name, 'short_name': short, 'description': desc, 'start_url': legacy['start_url'],
        'display': legacy['display'], 'background_color': legacy['background_color'], 'theme_color': legacy['theme_color'],
    }
    icons = [
        {'src': '/icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': '/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': '/icons/icon-maskable-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
        {'src': '/icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ]
    shots = [dict(s, form_factor='wide') for s in legacy['screenshots']]   # same src/sizes/type/label, now real 1280x720 images
    for s in shots:
        assert s['sizes'] == '1280x720' and s['type'] == 'image/png'
    j = lambda o: json.dumps(o, ensure_ascii=False)       # noqa: E731
    lines = ['{']
    for k, v in d.items():
        lines.append('  %s: %s,' % (j(k), j(v)))
    lines.append('  "icons": [')
    lines.append(',\n'.join('    ' + json.dumps(i, ensure_ascii=False) for i in icons))
    lines.append('  ],')
    lines.append('  "categories": %s,' % j(legacy['categories']))
    lines.append('  "screenshots": [')
    lines.append(',\n'.join('    ' + json.dumps(s, ensure_ascii=False) for s in shots))
    lines.append('  ],')
    lines.append('  "prefer_related_applications": %s' % j(legacy['prefer_related_applications']))
    lines.append('}')
    text = '\r\n'.join(lines) + '\r\n'                   # the legacy file is CRLF
    json.loads(text)                                      # must parse
    return text


def build():
    render_raw()
    for name, rel, (w, h, cap) in (('og', 'og/card-r1.png', IMAGES['og/card-r1.png']), ('day1', 'screenshots/day1.png', IMAGES['screenshots/day1.png']),
                                   ('day3', 'screenshots/day3.png', IMAGES['screenshots/day3.png'])):
        im = Image.open(os.path.join(RAW, name + '.png'))
        assert im.size == (w, h), '%s rendered %s, want %dx%d' % (name, im.size, w, h)
        save_rgb_png(im, rel)
    save_rgb_png(maskable(192), 'icons/icon-maskable-192.png')
    save_rgb_png(maskable(512), 'icons/icon-maskable-512.png')
    write('manifest.json', manifest_text().encode('utf-8'))
    write(GSC_NAME, GSC_BYTES)
    lock = {rel: {'bytes': len(read(os.path.join(OVERLAY, rel))), 'sha256': sha256(read(os.path.join(OVERLAY, rel)))} for rel in OUTPUTS}
    with open(LOCK, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(lock, fh, indent=2, sort_keys=True)
        fh.write('\n')
    print('wrote %d files under tools/t0/overlay/common/ and assets.lock.json' % len(OUTPUTS))
    return check()


def check():
    """Decode every image with PIL and compare with the lock; no Chrome needed.  Returns 0 when everything holds."""
    bad = []
    lock = json.load(open(LOCK, encoding='utf-8')) if os.path.isfile(LOCK) else {}
    for rel in OUTPUTS:
        p = os.path.join(OVERLAY, rel)
        if not os.path.isfile(p):
            bad.append('missing %s' % rel)
            continue
        data = read(p)
        if lock.get(rel, {}).get('sha256') != sha256(data):
            bad.append('%s differs from assets.lock.json (rebuild or update the lock)' % rel)
    for rel, (w, h, cap) in IMAGES.items():
        p = os.path.join(OVERLAY, rel)
        if not os.path.isfile(p):
            continue
        im = Image.open(p)
        im.load()                                        # full decode, not just the header
        size = os.path.getsize(p)
        ok = im.format == 'PNG' and im.mode == 'RGB' and im.size == (w, h) and (cap is None or size <= cap)
        print('%-30s %s %s %dx%d %8d B  %s' % (rel, im.format, im.mode, im.width, im.height, size, 'ok' if ok else 'BAD'))
        if not ok:
            bad.append('%s: %s %s %s %d B (want PNG RGB %dx%d%s)' % (rel, im.format, im.mode, im.size, size, w, h, ' <= %d B' % cap if cap else ''))
    g = os.path.join(OVERLAY, GSC_NAME)
    if os.path.isfile(g) and read(g) != GSC_BYTES:
        bad.append('%s content differs from the recovered bytes' % GSC_NAME)
    m = os.path.join(OVERLAY, 'manifest.json')
    if os.path.isfile(m):
        mj = json.loads(read(m).decode('utf-8'))
        lj = json.loads(read(os.path.join(LEGACY, 'manifest.json')).decode('utf-8'))
        if 'orientation' in mj:
            bad.append('manifest still has orientation')
        for k in ('name', 'short_name', 'description', 'start_url', 'display', 'background_color', 'theme_color', 'categories'):
            if mj.get(k) != lj.get(k):
                bad.append('manifest field %s changed' % k)
        if mj.get('id') != '/':
            bad.append('manifest id is not "/"')
        for icon in mj['icons']:
            if icon['purpose'] not in ('any', 'maskable'):
                bad.append('icon purpose %r not split' % icon['purpose'])
    for b in bad:
        print('CHECK FAIL:', b)
    print('assets check: %s' % ('OK' if not bad else '%d problem(s)' % len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(check() if '--check' in sys.argv else build())
