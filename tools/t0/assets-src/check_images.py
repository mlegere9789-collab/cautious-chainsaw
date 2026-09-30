#!/usr/bin/env python3
"""T0-IMG-01: every image a built (or legacy) dist references for social cards and the web-app manifest must decode.

    python tools/t0/assets-src/check_images.py --dist release/R1a/dist [--json out.json]     exit 0 = all good, 1 = problems

Checks (Pillow full decode, not just the header):
  * every og:image / twitter:image URL of every *.html resolves to a file in the dist and decodes; a card at /og/ must be exactly
    1200x630, 8-bit RGB PNG, <= 150 KB, and not the corrupt legacy file
  * manifest.json: every icon and screenshot exists, decodes and has the size it declares; purposes are exactly "any" or "maskable"
    (never the combined "any maskable"); every maskable icon is opaque and keeps its artwork inside the 80 % safe circle;
    no "orientation" lock; "id" is "/"; name/short_name equal the legacy values (identity changes are Train S2)
  * apple-touch-icon.png and favicon.ico still decode
  * the Search Console file, when present, is the recovered 53-byte file
"""
import argparse
import glob
import json
import math
import os
import re
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LEGACY = os.path.join(REPO, 'legacy', 'dist')
ORIGIN = 'https://gettysburginteractivemap.com'
GSC = ('google0dca4879c9657741.html', b'google-site-verification: google0dca4879c9657741.html')
META = re.compile(r'<meta\s+(?:property|name)="(og:image|twitter:image)"\s+content="([^"]+)"', re.I)


def decode(path):
    """(ok, info) -- opens and fully decodes the image."""
    try:
        with Image.open(path) as im:
            im.load()
            return True, {'format': im.format, 'mode': im.mode, 'size': im.size, 'bytes': os.path.getsize(path)}
    except Exception as e:  # noqa: BLE001 - any decoder failure is the finding
        return False, {'error': '%s: %s' % (type(e).__name__, e), 'bytes': os.path.getsize(path) if os.path.exists(path) else None}


def local(dist, url):
    if url.startswith(ORIGIN):
        url = url[len(ORIGIN):]
    if not url.startswith('/'):
        return None
    return os.path.join(dist, url.split('?')[0].lstrip('/'))


def safe_radius(path):
    with Image.open(path) as im:
        im = im.convert('RGB')
        px, s = im.load(), im.width
        bg = px[0, 0]
        far = 0.0
        for y in range(im.height):
            for x in range(im.width):
                p = px[x, y]
                if sum(abs(p[i] - bg[i]) for i in range(3)) > 24:
                    far = max(far, math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2))
        return far / s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', required=True)
    ap.add_argument('--json')
    a = ap.parse_args()
    dist = os.path.abspath(os.path.join(REPO, a.dist))
    problems, report = [], {'dist': os.path.relpath(dist, REPO).replace(os.sep, '/'), 'pages': {}, 'manifest': {}, 'other': {}}

    # ---- social cards
    urls = {}
    for f in sorted(glob.glob(os.path.join(dist, '*.html'))):
        text = open(f, encoding='utf-8').read()
        for kind, url in META.findall(text):
            urls.setdefault(os.path.basename(f), []).append((kind.lower(), url))
    report['pages_with_og_image'] = sum(1 for v in urls.values() if any(k == 'og:image' for k, _ in v))
    seen = {}
    for page, items in urls.items():
        for kind, url in items:
            p = local(dist, url)
            if p is None or not os.path.isfile(p):
                problems.append('%s %s -> %s does not resolve to a file in the dist' % (page, kind, url))
                continue
            if p not in seen:
                seen[p] = decode(p)
            ok, info = seen[p]
            rel = os.path.relpath(p, dist).replace(os.sep, '/')
            report['pages'].setdefault(page, {})[kind] = {'src': rel, 'ok': ok, **info}
            if not ok:
                problems.append('%s %s -> %s does not decode (%s)' % (page, kind, rel, info['error']))
            elif rel.startswith('og/'):
                if info['format'] != 'PNG' or info['mode'] != 'RGB' or info['size'] != (1200, 630) or info['bytes'] > 150 * 1024:
                    problems.append('%s: card %s is %s %s %s %d B (want PNG RGB 1200x630 <= 150 KB)' % (page, rel, info['format'], info['mode'], info['size'], info['bytes']))
    for p, (ok, info) in seen.items():
        report['other'][os.path.relpath(p, dist).replace(os.sep, '/')] = {'ok': ok, **info}

    # ---- manifest
    mpath = os.path.join(dist, 'manifest.json')
    m = json.load(open(mpath, encoding='utf-8'))
    lm = json.load(open(os.path.join(LEGACY, 'manifest.json'), encoding='utf-8'))
    for k in ('name', 'short_name'):
        if m.get(k) != lm.get(k):
            problems.append('manifest %s changed (%r != %r): identity changes are Train S2' % (k, m.get(k), lm.get(k)))
    if 'orientation' in m:
        problems.append('manifest still locks orientation (%r)' % m['orientation'])
    if m.get('id') != '/':
        problems.append('manifest id is %r, want "/"' % m.get('id'))
    for section in ('icons', 'screenshots'):
        for ent in m.get(section, []):
            p = local(dist, ent['src'])
            ok, info = decode(p) if p and os.path.isfile(p) else (False, {'error': 'file missing'})
            rec = {'src': ent['src'], 'declared': ent.get('sizes'), 'purpose': ent.get('purpose'), 'ok': ok, **info}
            report['manifest'].setdefault(section, []).append(rec)
            if not ok:
                problems.append('manifest %s %s does not decode (%s)' % (section, ent['src'], info['error']))
                continue
            declared = tuple(int(x) for x in ent['sizes'].split('x'))
            if tuple(info['size']) != declared:
                problems.append('manifest %s %s declares %s but is %s' % (section, ent['src'], ent['sizes'], info['size']))
            if section == 'icons':
                purpose = ent.get('purpose', 'any')
                if purpose not in ('any', 'maskable', 'monochrome'):
                    problems.append('manifest icon %s purpose %r must be a single purpose' % (ent['src'], purpose))
                if purpose == 'maskable':
                    if info['mode'] != 'RGB':
                        problems.append('maskable icon %s has mode %s (must be opaque)' % (ent['src'], info['mode']))
                    r = safe_radius(p)
                    rec['safe_radius_ratio'] = round(r, 3)
                    if r > 0.40:
                        problems.append('maskable icon %s artwork reaches %.3f of the size (safe zone is 0.400)' % (ent['src'], r))
    if not any(e.get('purpose') == 'maskable' for e in m.get('icons', [])):
        problems.append('manifest has no maskable icon')

    # ---- other root images and the verification file
    for rel in ('apple-touch-icon.png', 'favicon.ico'):
        p = os.path.join(dist, rel)
        ok, info = decode(p) if os.path.isfile(p) else (False, {'error': 'missing'})
        report['other'][rel] = {'ok': ok, **info}
        if not ok:
            problems.append('%s does not decode (%s)' % (rel, info['error']))
    g = os.path.join(dist, GSC[0])
    report['gsc_file'] = os.path.isfile(g) and open(g, 'rb').read() == GSC[1]
    if os.path.isfile(g) and not report['gsc_file']:
        problems.append('%s content differs from the recovered bytes' % GSC[0])

    report['problems'] = problems
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump(report, open(a.json, 'w', encoding='utf-8'), indent=2, default=list)
    print('images referenced by og/twitter meta: %d files on %d pages; manifest icons %d, screenshots %d' % (
        len(seen), report['pages_with_og_image'], len(m.get('icons', [])), len(m.get('screenshots', []))))
    for p in problems:
        print('PROBLEM:', p)
    print('check_images: %s' % ('OK' if not problems else '%d problem(s)' % len(problems)))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
