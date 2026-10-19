#!/usr/bin/env python3
"""Fetch the source photographs named in tools/t0/images/sources.json into tmp/b1863/images/sources/<id>.jpg and verify them.

    python tools/t0/images/fetch_sources.py [--dest tmp/b1863/images/sources] [--check-only]

Polite and read-only: one request every 6 s, an identifying User-Agent, no retries that hammer (a 429 waits 20 s, 40 s, ...), files are cached by sha256 so a
second run makes no request.  Every file must hash to the sha256 pinned in sources.json (and, for Wikimedia Commons copies, to the sha1 Commons publishes);
a mismatch stops with exit 2 and nothing is used.  Only public-domain / openly licensed hosts: images.metmuseum.org (Met Open Access), upload.wikimedia.org
(Commons copies of Library of Congress / NARA items).  Google, Bing, Maxar and Mapbox are never contacted.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
ALLOWED_HOSTS = ('images.metmuseum.org', 'upload.wikimedia.org', 'cdn.loc.gov', 'tile.loc.gov')


def sha(path, algo='sha256'):
    h = hashlib.new(algo)
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load_sources():
    with open(os.path.join(HERE, 'sources.json'), encoding='utf-8') as f:
        return json.load(f)


def local_path(dest, s):
    return os.path.join(dest, s['id'] + '.jpg')


def fetch(s, dest, ua, legacy_dirs):
    out = local_path(dest, s)
    if os.path.isfile(out) and sha(out) == s['sha256']:
        return 'cached'
    for d in legacy_dirs:   # files a person already downloaded by hand during the audit
        if os.path.isdir(d):
            for fn in os.listdir(d):
                p = os.path.join(d, fn)
                if os.path.isfile(p) and os.path.getsize(p) > 100000 and sha(p) == s['sha256']:
                    shutil.copyfile(p, out)
                    return 'copied from ' + d
    from urllib.parse import urlparse
    host = urlparse(s['file_url']).hostname
    if host not in ALLOWED_HOSTS:
        raise SystemExit('refusing host %s (not in the public-domain allow-list)' % host)
    import requests
    for att in range(5):
        time.sleep(6 * (1 + att * 3))
        r = requests.get(s['file_url'], headers={'User-Agent': ua}, timeout=180)
        if r.status_code == 200:
            with open(out, 'wb') as f:
                f.write(r.content)
            return 'downloaded %d bytes' % len(r.content)
        if r.status_code not in (429, 503):
            raise SystemExit('%s -> HTTP %s' % (s['file_url'], r.status_code))
    raise SystemExit('%s: still rate limited after 5 tries' % s['file_url'])


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dest', default=os.path.join('tmp', 'b1863', 'images', 'sources'))
    ap.add_argument('--check-only', action='store_true', help='verify the files already in --dest, fetch nothing')
    a = ap.parse_args(argv)
    dest = os.path.join(REPO, a.dest)
    os.makedirs(dest, exist_ok=True)
    doc = load_sources()
    legacy = [os.path.join(REPO, 'tmp', 'b1863', 'images', 'src'), os.path.join(REPO, 'tmp', 'b1863', 'images', 'met')]
    bad = 0
    for s in doc['sources']:
        try:
            how = 'present' if a.check_only else fetch(s, dest, doc['ua'], legacy)
        except SystemExit as e:
            print('FAIL', s['id'], e)
            bad += 1
            continue
        p = local_path(dest, s)
        if not os.path.isfile(p):
            print('MISSING', s['id'])
            bad += 1
            continue
        got = sha(p)
        ok = got == s['sha256']
        if ok and s.get('commons_sha1'):
            ok = sha(p, 'sha1') == s['commons_sha1']
        print('%-4s %-20s %s  %s' % ('OK' if ok else 'BAD', s['id'], how, got[:16]))
        bad += 0 if ok else 1
    return 2 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
