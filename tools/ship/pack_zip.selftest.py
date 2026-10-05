#!/usr/bin/env python3
"""Self-test of tools/ship/pack_zip.py (no network, no browser, about 5 s; writes only under tmp/<T0_AGENT>/shipst/).

    python tools/ship/pack_zip.py is only worth trusting if its own checks can fail.  An earlier version compared the dist with manifest.json through a
    test that was never true (it expected a bare digest string where the manifest holds {"bytes", "sha256"}), so it checked nothing.  Every case below
    would have caught that, because each one tampers with something and requires the pack to refuse.

Cases: 1 an honest dist packs, the files sit at the zip root, no directory entries, two packs are byte-identical; 2 a changed file, 3 an extra file,
4 a missing file, 5 a manifest entry without a digest, 6 a wrong tree digest, 7 an unreadable manifest: each is refused with exit 1 and no zip is left
that looks finished; 8 a dist without a manifest is packed and says nothing was cross-checked; 9 --staging adds `X-Robots-Tag: noindex` to the
`/*` block of _headers and changes nothing else, while the production zip never carries it (and a production dist whose _headers already has it is
refused); 10 when release/R1c/dist exists: the real train packs, equals the dist file for file, and the printed tree digest is the manifest's.
Exit 0 all cases passed, 1 a case failed.
"""
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
PACK = os.path.join(HERE, 'pack_zip.py')
ROOT = os.path.join(REPO, 'tmp', os.environ.get('T0_AGENT', 'ship'), 'shipst')
HEADERS = '# test\n\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n'
FILES = {
    'index.html': b'<!doctype html><title>x</title>\n',
    'assets/app-1234.js': b'console.log(1)\n',
    'assets/style-1234.css': b'body{}\n',
    '_headers': HEADERS.encode(),
    '_redirects': b'/old /new 301\n',
    'data/a.json': b'{"a":1}\n',
}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def tree(files):
    h = hashlib.sha256()
    for k in sorted(files):
        h.update(k.encode() + b'\0' + sha(files[k]).encode() + b'\n')
    return h.hexdigest()


def make(name, files=None, manifest='ok'):
    base = os.path.join(ROOT, name)
    shutil.rmtree(base, ignore_errors=True)
    dist = os.path.join(base, 'dist')
    files = dict(FILES if files is None else files)
    for k, v in files.items():
        p = os.path.join(dist, *k.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'wb') as f:
            f.write(v)
    if manifest:
        m = {'train': 'T', 'file_count': len(files), 'tree_sha256': tree(files), 'files': {k: {'bytes': len(v), 'sha256': sha(v)} for k, v in files.items()}}
        if manifest == 'nodigest':
            m['files']['index.html'] = {'bytes': 3}
        elif manifest == 'badtree':
            m['tree_sha256'] = '0' * 64
        elif manifest == 'unreadable':
            with open(os.path.join(base, 'manifest.json'), 'w') as f:
                f.write('{not json')
            return dist, base
        with open(os.path.join(base, 'manifest.json'), 'w') as f:
            json.dump(m, f)
    return dist, base


def pack(dist, out, *extra):
    r = subprocess.run([sys.executable, PACK, '--dist', dist, '--out', out] + list(extra), capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=REPO)
    return r.returncode, (r.stdout + r.stderr)


CASES = []


def case(title):
    def deco(fn):
        CASES.append((title, fn))
        return fn
    return deco


@case('1 an honest dist packs: files at the root, no directory entries, two packs give the same sha256')
def _():
    dist, base = make('ok')
    out = os.path.join(base, 'a.zip')
    rc, o = pack(dist, out)
    assert rc == 0 and 'manifest.json agrees: %d files' % len(FILES) in o, (rc, o)
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        assert names == sorted(FILES) and 'index.html' in names and not any(n.endswith('/') for n in names), names
        for k, v in FILES.items():
            assert z.read(k) == v, k
    rc, o2 = pack(dist, os.path.join(base, 'b.zip'))
    assert rc == 0
    with open(out, 'rb') as a, open(os.path.join(base, 'b.zip'), 'rb') as b:
        assert a.read() == b.read(), 'two packs of the same dist differ'
    with open(out + '.sha256') as f:
        assert f.read().split()[0] == sha(open(out, 'rb').read())
    tsv = open(out + '.files.tsv').read().splitlines()
    assert len(tsv) == len(FILES) and tsv[0].split('\t')[0] == sorted(FILES)[0]
    return '%d files, identical packs, sha256 and files.tsv written' % len(FILES)


def refused(name, expect, mutate=None, manifest='ok', files=None):
    dist, base = make(name, files=files, manifest=manifest)
    if mutate:
        mutate(dist)
    out = os.path.join(base, 'x.zip')
    rc, o = pack(dist, out)
    assert rc != 0 and expect in o, (rc, o)
    assert not os.path.exists(out + '.sha256'), 'a refused pack must not leave a .sha256 that looks like a finished zip'
    return o.strip().splitlines()[-1][:120]


@case('2 a file changed after the build (manifest sha256 differs) is refused')
def _():
    def m(dist):
        with open(os.path.join(dist, 'assets', 'app-1234.js'), 'wb') as f:
            f.write(b'console.log(2)\n')
    return refused('changed', 'disagrees with the dist', m)


@case('3 a file that is not in the manifest is refused')
def _():
    def m(dist):
        with open(os.path.join(dist, 'extra.txt'), 'wb') as f:
            f.write(b'x')
    return refused('extra', 'list different files', m)


@case('4 a file the manifest lists but the dist lacks is refused')
def _():
    return refused('missing', 'list different files', lambda d: os.remove(os.path.join(d, '_redirects')))


@case('5 a manifest entry without a sha256 is refused')
def _():
    return refused('nodigest', 'no sha256 for index.html', manifest='nodigest')


@case('6 a wrong tree digest is refused')
def _():
    return refused('badtree', 'tree digest', manifest='badtree')


@case('7 an unreadable manifest is refused')
def _():
    return refused('unreadable', 'cannot read', manifest='unreadable')


@case('8 a dist without a manifest is packed and says nothing was cross-checked')
def _():
    dist, base = make('nomanifest', manifest=None)
    rc, o = pack(dist, os.path.join(base, 'n.zip'))
    assert rc == 0 and 'no manifest.json beside the dist' in o, (rc, o)
    return 'packed, with the notice'


@case('9 --staging adds the noindex header to the /* block of _headers only; production never carries it')
def _():
    dist, base = make('staging')
    prod = os.path.join(base, 'prod.zip')
    stag = os.path.join(base, 'stag.zip')
    assert pack(dist, prod)[0] == 0
    rc, o = pack(dist, stag, '--staging')
    assert rc == 0 and 'STAGING' in o, (rc, o)
    with zipfile.ZipFile(prod) as p, zipfile.ZipFile(stag) as s:
        assert p.namelist() == s.namelist()
        diff = [n for n in p.namelist() if p.read(n) != s.read(n)]
        assert diff == ['_headers'], diff
        assert b'X-Robots-Tag' not in p.read('_headers')
        h = s.read('_headers').decode()
        assert h.count('X-Robots-Tag: noindex') == 1
        blk = h.split('/*\n', 1)[1].split('\n\n', 1)[0]
        assert blk.splitlines()[0] == '  X-Robots-Tag: noindex' and 'nosniff' in blk, blk      # the first line of the /* block, as `ops/sha-list.mjs stage` writes it
    # a production dist whose _headers already sets X-Robots-Tag must be refused, and so must a staging variant made from one
    bad = dict(FILES)
    bad['_headers'] = (HEADERS.replace('/*\n', '/*\n  X-Robots-Tag: noindex\n', 1)).encode()
    d2, b2 = make('prodnoindex', files=bad)
    rc, o = pack(d2, os.path.join(b2, 'p.zip'))
    assert rc != 0 and 'sets X-Robots-Tag' in o, (rc, o)
    rc, o = pack(d2, os.path.join(b2, 's.zip'), '--staging')
    assert rc != 0 and 'already sets X-Robots-Tag' in o, (rc, o)
    return 'only _headers differs (one line, first in the /* block); an X-Robots-Tag already in _headers is refused for both variants'


@case('9b a dist whose build failed (BUILD-FAILED.json, or gate.json ok:false) is refused')
def _():
    dist, base = make('failed1')
    with open(os.path.join(base, 'BUILD-FAILED.json'), 'w') as f:
        f.write('{}')
    rc, o = pack(dist, os.path.join(base, 'f.zip'))
    assert rc != 0 and 'build of this dist failed' in o, (rc, o)
    dist, base = make('failed2')
    with open(os.path.join(base, 'gate.json'), 'w') as f:
        json.dump({'ok': False}, f)
    rc, o = pack(dist, os.path.join(base, 'f.zip'))
    assert rc != 0 and 'gate FAILED' in o, (rc, o)
    assert not os.path.exists(os.path.join(base, 'f.zip'))
    return 'both refused, no zip written'


@case('10 the real R1c dist (when built) packs and equals the dist; the manifest line carries its tree digest')
def _():
    dist = os.path.join(REPO, 'release', 'R1c', 'dist')
    if not os.path.isfile(os.path.join(dist, 'index.html')):
        return 'release/R1c/dist not built here: skipped'
    out = os.path.join(ROOT, 'real', 'R1c.zip')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    rc, o = pack(dist, out)
    man = json.load(open(os.path.join(REPO, 'release', 'R1c', 'manifest.json'), encoding='utf-8'))
    assert rc == 0 and ('tree %s' % man['tree_sha256'][:12]) in o, (rc, o)
    n = 0
    with zipfile.ZipFile(out) as z:
        for name in z.namelist():
            with open(os.path.join(dist, *name.split('/')), 'rb') as f:
                assert f.read() == z.read(name), name
            n += 1
    assert n == man['file_count'], (n, man['file_count'])
    note = '%d files, tree %s' % (n, man['tree_sha256'][:12])
    # the staging zip must equal the staging copy that `node ops/sha-list.mjs stage` makes, file for file
    sd = os.path.join(ROOT, 'real', 'stage-R1c')
    r = subprocess.run(['node', os.path.join(REPO, 'ops', 'sha-list.mjs'), 'stage', dist, sd, '--force'], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=REPO)
    if r.returncode != 0:
        return note + '; staging comparison skipped (sha-list stage exit %d)' % r.returncode
    sz = os.path.join(ROOT, 'real', 'R1c-staging.zip')
    rc, o = pack(dist, sz, '--staging')
    assert rc == 0, o
    with zipfile.ZipFile(sz) as z:
        names = set(z.namelist())
        for name in sorted(names):
            with open(os.path.join(sd, *name.split('/')), 'rb') as f:
                assert f.read() == z.read(name), 'staging zip differs from the sha-list stage copy: ' + name
        have = set()
        for dp, _dn, fn in os.walk(sd):
            for f in fn:
                have.add(os.path.relpath(os.path.join(dp, f), sd).replace(os.sep, '/'))
        assert have == names, sorted(have ^ names)[:5]
    return note + '; the staging zip equals the sha-list stage copy'


def main():
    os.makedirs(ROOT, exist_ok=True)
    bad = 0
    for title, fn in CASES:
        try:
            note = fn()
            print('PASS  %s -- %s' % (title, note))
        except AssertionError as e:
            bad += 1
            print('FAIL  %s\n      %s' % (title, str(e)[:600]))
        except Exception as e:  # noqa: BLE001
            bad += 1
            print('FAIL  %s\n      %s: %s' % (title, type(e).__name__, str(e)[:600]))
    print('pack_zip self-test: %s' % ('all %d passed' % len(CASES) if not bad else '%d of %d FAILED' % (bad, len(CASES))))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
