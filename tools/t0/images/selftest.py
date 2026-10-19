#!/usr/bin/env python3
"""Self-test of the IMG tooling.  Builds go to tmp/b1863/images/selftest/ (git-ignored); nothing under release/ is touched.  About 4 minutes (Chrome is used for 1 case only).

    python tools/t0/images/selftest.py [--keep]

 1  the wrapper refuses to write into release/<train>
 2  build with IMG twice: identical tree digest (deterministic), every IMG anchor matched exactly once, and the spec passes on the result
 3  build without IMG (the control) through the wrapper: the tree has the generic files again and the spec's feature tests fail (red-first on a real build); 3b the control equals the stock build.py tree
 4  a mutated page anchor in IMG.json stops the build (exit 2) and names the patch id; nothing is shipped
 5  a mutated manifest anchor in IMG-overlay.json stops the wrapper with a message naming the row
 6  mutants of a good tree, each must turn exactly the intended spec test red:
       truncated PNG -> IMG-01; one flipped byte of a JPEG -> IMG-03; alt removed -> IMG-05; figcaption removed -> IMG-05; og:image back on the old name -> IMG-06 (and 03/04);
       manifest size lie -> IMG-07; hot-linked <img> -> IMG-08; truncated JPEG (no EOI) -> IMG-01; a generic star icon added back -> IMG-04; caption font 10 px -> IMG-10 (Chrome)
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tmp', 'b1863', 'images', 'selftest')
RESULTS = []


def run(argv, **kw):
    return subprocess.run(argv, cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)


def tree_digest(d):
    h = hashlib.sha256()
    for root, _dirs, files in sorted(os.walk(d)):
        for f in sorted(files):
            p = os.path.join(root, f)
            h.update(os.path.relpath(p, d).replace(os.sep, '/').encode())
            h.update(hashlib.sha256(open(p, 'rb').read()).digest())
    return h.hexdigest()


def build(out, *extra):
    return run([sys.executable, os.path.join(HERE, 'img_build.py'), '--train', 'R1c', '--out', os.path.relpath(out, REPO), '--no-gate', *extra])


def spec(dist, *extra):
    r = run(['node', os.path.join(REPO, 'tests', 't0', 'images.spec.mjs'), '--dist', os.path.relpath(dist, REPO), *extra])
    failed = sorted({line.split()[1] for line in r.stdout.splitlines() if line.startswith('FAIL')})
    return r, failed


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print('%s  %s %s' % ('PASS' if ok else 'FAIL', name, ('- ' + detail) if detail else ''), flush=True)


def main():
    keep = '--keep' in sys.argv
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    # 1
    r = run([sys.executable, os.path.join(HERE, 'img_build.py'), '--train', 'R1c', '--out', 'release/R1c', '--no-gate'])
    check('1 refuses release/R1c', r.returncode != 0 and 'refusing' in (r.stdout + r.stderr), (r.stdout + r.stderr).strip().splitlines()[-1][:100] if (r.stdout + r.stderr).strip() else '')
    # 2
    a = os.path.join(OUT, 'a')
    b = os.path.join(OUT, 'b')
    ra, rb = build(a), build(b)
    da, db = tree_digest(os.path.join(a, 'dist')), tree_digest(os.path.join(b, 'dist'))
    anchors = json.load(open(os.path.join(a, 'anchors.json'), encoding='utf-8'))
    recs = [x for x in (anchors if isinstance(anchors, list) else anchors.get('patches', anchors.get('records', []))) if str(x.get('id', '')).startswith('IMG:')]
    check('2a builds with IMG are identical', ra.returncode == 0 and rb.returncode == 0 and da == db, da[:16])
    check('2b every IMG anchor matched exactly once', len(recs) >= 36 and all(x['ok'] and x['found'] == x['expect'] for x in recs), '%d IMG records' % len(recs))
    r, failed = spec(os.path.join(a, 'dist'), '--no-browser')
    check('2c spec passes on the IMG build (no browser)', r.returncode == 0 and not failed, ','.join(failed))
    # 3
    c = os.path.join(OUT, 'control')
    rc = build(c, '--without-img')
    r, failed = spec(os.path.join(c, 'dist'), '--no-browser', '--expect-red')
    red = [ln for ln in r.stdout.splitlines() if ln.startswith('red-first')]
    check('3 control build (--without-img) is red-first', rc.returncode == 0 and r.returncode == 0 and bool(red), red[-1] if red else (r.stdout + r.stderr)[-200:])
    stock = os.path.join(OUT, 'stock')
    rs = run([sys.executable, os.path.join(REPO, 'tools', 't0', 'build.py'), '--train', 'R1c', '--out', os.path.relpath(stock, REPO), '--no-gate'])
    check('3b control build equals the stock build.py tree (the wrapper adds nothing of its own)', rs.returncode == 0 and tree_digest(os.path.join(stock, 'dist')) == tree_digest(os.path.join(c, 'dist')), tree_digest(os.path.join(c, 'dist'))[:16])
    # 4
    img = json.load(open(os.path.join(REPO, 'tools', 't0', 'patches-next', 'IMG.json'), encoding='utf-8'))
    img['patches'][0]['find'] = img['patches'][0]['find'].replace('og:image', 'og:imagX')
    mj = os.path.join(OUT, 'IMG-mutant.json')
    json.dump(img, open(mj, 'w', encoding='utf-8'))
    m = os.path.join(OUT, 'm4')
    rm = build(m, '--img-json', mj)
    txt = rm.stdout + rm.stderr
    check('4 mutated page anchor stops the build (exit 2) and names the patch', rm.returncode == 2 and img['patches'][0]['id'] in txt and not os.path.isdir(os.path.join(m, 'dist')), txt.strip().splitlines()[-1][:120])
    # 5
    ov = json.load(open(os.path.join(HERE, 'IMG-overlay.json'), encoding='utf-8'))
    ov['rows'][0]['find'] = ov['rows'][0]['find'].replace('icon-192', 'icon-193')
    oj = os.path.join(OUT, 'IMG-overlay-mutant.json')
    json.dump(ov, open(oj, 'w', encoding='utf-8'))
    ro = build(os.path.join(OUT, 'm5'), '--overlay-json', oj)
    check('5 mutated manifest anchor stops the wrapper', ro.returncode != 0 and 'IMG:manifest:icons' in (ro.stdout + ro.stderr), (ro.stdout + ro.stderr).strip().splitlines()[-1][:120])
    # 6 mutants
    good = os.path.join(a, 'dist')

    def mutant(name, want, fn, *extra):
        d = os.path.join(OUT, 'mut-' + name)
        shutil.copytree(good, os.path.join(d, 'dist'))
        fn(os.path.join(d, 'dist'))
        r, failed = spec(os.path.join(d, 'dist'), *(extra or ('--no-browser',)))
        check('6 mutant %-34s -> %s' % (name, want), want in failed, 'failed: %s' % ','.join(failed))

    def edit(dist, rel, f, binary=False):
        p = os.path.join(dist, rel)
        if binary:
            data = bytearray(open(p, 'rb').read())
            data = f(data)
            open(p, 'wb').write(bytes(data))
        else:
            t = open(p, encoding='utf-8', newline='').read()
            t2 = f(t)
            assert t2 != t, 'mutation did nothing: ' + rel
            open(p, 'w', encoding='utf-8', newline='').write(t2)

    mutant('truncated-png', 'T0-RIMG-01', lambda d: edit(d, 'icons/gettysburg-512.png', lambda b: b[:1200], True))
    mutant('flipped-jpeg-byte', 'T0-RIMG-03', lambda d: edit(d, 'og/gettysburg-card.jpg', lambda b: (b.__setitem__(60000, b[60000] ^ 0xFF) or b), True))
    mutant('alt-removed', 'T0-RIMG-05', lambda d: edit(d, 'education.html', lambda t: t.replace(' alt="Photograph from 1863', ' data-x="Photograph from 1863')))
    mutant('figcaption-removed', 'T0-RIMG-05', lambda d: edit(d, 'aftermath.html', lambda t: t.replace('<figcaption', '<div').replace('</figcaption>', '</div>')))
    mutant('og-image-old-name', 'T0-RIMG-06', lambda d: edit(d, 'search.html', lambda t: t.replace('og/gettysburg-card.jpg', 'og/card-r1.png', 1)))
    mutant('manifest-size-lie', 'T0-RIMG-07', lambda d: edit(d, 'manifest.json', lambda t: t.replace('"sizes": "512x512", "type": "image/png", "purpose": "any"', '"sizes": "1024x1024", "type": "image/png", "purpose": "any"')))
    mutant('hotlinked-image', 'T0-RIMG-08', lambda d: edit(d, 'privacy.html', lambda t: t.replace('</header>', '<img src="https://example.com/x.jpg" alt="x"></header>', 1) if '</header>' in t else t.replace('<body>', '<body><img src="https://example.com/x.jpg" alt="x">', 1)))
    mutant('truncated-jpeg-no-eoi', 'T0-RIMG-01', lambda d: edit(d, 'img/trostle-farm-july-1863.jpg', lambda b: b[:-12], True))

    def add_star(d):
        shutil.copyfile(os.path.join(REPO, 'baseline', 'dist', 'icons', 'icon-192.png'), os.path.join(d, 'icons', 'icon-192.png'))
    mutant('generic-star-added-back', 'T0-RIMG-04', add_star)
    mutant('caption-font-10px', 'T0-RIMG-10', lambda d: edit(d, 'turning-points.html', lambda t: t.replace('font-size:12px;line-height:1.5;color:#8a93a8', 'font-size:10px;line-height:1.5;color:#8a93a8')), '--filter', 'T0-RIMG-10')
    bad = [n for n, ok, _ in RESULTS if not ok]
    print('\nself-test: %d/%d passed' % (len(RESULTS) - len(bad), len(RESULTS)))
    if not keep:
        for d in os.listdir(OUT):
            if d.startswith('mut-') or d == 'm4':
                shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
