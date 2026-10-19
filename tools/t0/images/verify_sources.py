#!/usr/bin/env python3
"""Re-read the institutions' own records for every source in sources.json and compare them with what the ledger says (network, read-only, polite).

    python tools/t0/images/verify_sources.py [--only SRC-LOC] [--tries 6] [--out docs/basemap1863/site-images/verification.json]

For each source:
  * Met (SRC-MET-*): the Open Access collection API record must say isPublicDomain true, the same title, artist, objectDate and accession number, and its primaryImage must be the file_url we ship from;
  * Library of Congress (SRC-LOC-*): the item record (?fo=json) must give the date '1863 July', the photographer, rights_information 'No known restrictions on publication.' and the
    plate number of Gardner's Sketch Book; LoC's own 1024 px service image is fetched and compared with the pinned master copy (normalised correlation must be >= 0.98);
  * National Archives (SRC-NARA-*): the catalogue page needs JavaScript and an API key, so it cannot be read by script; the check that IS possible is the Wikimedia Commons file page
    (NARA template: ARC number, local identifier, date, author) and the Commons sha1 of the file against the sha1 of the bytes we hold.
One request every 6 s (LoC robots.txt Crawl-delay 5), identifying User-Agent, nothing is submitted, nothing is cached outside tmp/b1863/images/.
A check has three outcomes: ok true, ok false (the record disagrees with the ledger: exit 1) and ok null (the host kept answering 429 / was unreachable: NOT verified, said so, exit 0
unless --strict).  --only restricts the run to the sources whose id starts with the given text and merges its results into the existing --out file (so a rate-limited LoC part can
be repeated later without repeating the others).
"""
import argparse
import hashlib
import io
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC_DIR = os.path.join(REPO, 'tmp', 'b1863', 'images', 'sources')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join('docs', 'basemap1863', 'site-images', 'verification.json'))
    ap.add_argument('--only', default='')
    ap.add_argument('--tries', type=int, default=6)
    ap.add_argument('--strict', action='store_true', help='exit 1 also when a check could not be made')
    a = ap.parse_args(argv)
    import requests
    import numpy as np
    from PIL import Image
    doc = json.load(open(os.path.join(HERE, 'sources.json'), encoding='utf-8'))
    ua = {'User-Agent': doc['ua']}

    def get(u, **kw):
        for att in range(a.tries):   # polite: 6 s between requests; a 429/503 (rate limit) waits 1, 2, 4 ... minutes and tries again
            time.sleep(6 if att == 0 else 60 * (2 ** (att - 1)))
            r = requests.get(u, headers=ua, timeout=120, **kw)
            if r.status_code not in (429, 503):
                return r
            print('  rate limited (HTTP %s) by %s; waiting' % (r.status_code, u.split('/')[2]), flush=True)
        return r

    checks = []

    def check(sid, name, ok, detail):
        checks.append({'source': sid, 'check': name, 'ok': (None if ok is None else bool(ok)), 'detail': str(detail)[:400]})
        print('%-6s %-20s %-48s %s' % ('NOTRUN' if ok is None else ('OK' if ok else 'FAIL'), sid, name, str(detail)[:120]))

    for s in doc['sources']:
        sid = s['id']
        if a.only and not sid.startswith(a.only):
            continue
        path = os.path.join(SRC_DIR, sid + '.jpg')
        raw = open(path, 'rb').read()
        check(sid, 'pinned file hashes to sources.json', hashlib.sha256(raw).hexdigest() == s['sha256'], s['sha256'][:16])
        if sid.startswith('SRC-MET'):
            r = get(s['record_api'])
            j = r.json() if r.status_code == 200 else {}
            check(sid, 'Met API record reachable', r.status_code == 200, r.status_code)
            check(sid, 'isPublicDomain is true', j.get('isPublicDomain') is True, j.get('isPublicDomain'))
            check(sid, 'title matches', j.get('title') == s['title'], j.get('title'))
            check(sid, 'artist is O\'Sullivan', "Sullivan" in (j.get('artistDisplayName') or ''), j.get('artistDisplayName'))
            check(sid, 'objectDate is 1863', j.get('objectDate') == '1863', j.get('objectDate'))
            check(sid, 'accession number matches the repository line', (j.get('accessionNumber') or '@') in s['repository'], j.get('accessionNumber'))
            check(sid, 'primaryImage is the file we hold', j.get('primaryImage') == s['file_url'], j.get('primaryImage'))
        elif sid.startswith('SRC-LOC'):
            r = get(s['record_api'])
            saved = os.path.join(REPO, 'docs', 'basemap1863', 'site-images', 'evidence', 'loc-' + sid.split('-')[-1] + '.json')
            tag = ''
            if r.status_code != 200:   # rate limited or down: say so (a fresh read was not possible), and check the copy of the record saved when it was read
                check(sid, 'LoC item record read afresh', None, 'HTTP %s after %d tries: not re-read in this run' % (r.status_code, a.tries))
                if not os.path.isfile(saved):
                    continue
                j = json.load(open(saved, encoding='utf-8'))
                tag = ' (saved copy, not a fresh read)'
                r = None
            else:
                j = r.json()
                check(sid, 'LoC item record read afresh', True, r.status_code)
            it = j.get('item', {})
            check(sid, "date is '1863 July, c1866.'" + tag, it.get('created_published_date') == '1863 July, c1866.', it.get('created_published_date'))
            check(sid, 'rights: no known restrictions on publication' + tag, it.get('rights_information') == 'No known restrictions on publication.', it.get('rights_information'))
            check(sid, 'creator is O\'Sullivan (photographer)' + tag, any('Sullivan' in c.get('title', '') for c in it.get('creators', [])), [c.get('title') for c in it.get('creators', [])])
            check(sid, "plate: Gardner's Sketch Book v. 1 no. 39" + tag, 'v. 1, no. 39' in json.dumps(it.get('notes')), 'notes')
            svc = (j.get('resources') or [{}])[0].get('large')
            r2 = get(svc) if svc else None
            if r2 is None or r2.status_code != 200:
                check(sid, "pinned master == LoC's own service image", None, 'service image not fetched (HTTP %s): not verified in this run' % (r2.status_code if r2 is not None else 'no URL'))
                continue
            a1 = Image.open(io.BytesIO(r2.content)).convert('L')
            b1 = Image.open(path).convert('L').resize(a1.size, Image.LANCZOS)
            x = np.asarray(a1, float)
            y = np.asarray(b1, float)
            x = (x - x.mean()) / x.std()
            y = (y - y.mean()) / y.std()
            corr = float((x * y).mean())
            check(sid, "pinned master == LoC's own service image (correlation >= 0.98)", corr >= 0.98, round(corr, 4))
        elif sid.startswith('SRC-NARA'):
            title = s['file_page'].split('/wiki/')[1]
            r = get('https://commons.wikimedia.org/w/api.php', params={'action': 'query', 'titles': title.replace('_', ' '), 'prop': 'revisions|imageinfo', 'rvprop': 'content', 'rvslots': 'main',
                                                                       'iiprop': 'sha1|size|url', 'format': 'json'})
            p = list(r.json()['query']['pages'].values())[0]
            txt = p['revisions'][0]['slots']['main']['*']
            ii = p['imageinfo'][0]
            arc = s['record_url'].rsplit('/', 1)[1]
            check(sid, 'Commons file page reachable', r.status_code == 200, r.status_code)
            check(sid, 'NARA template cites the ARC number', ('ARC                     = ' + arc) in txt or ('ARC' in txt and arc in txt), arc)
            check(sid, 'date 1863-07 and author O\'Sullivan', '1863-07' in txt and "O'Sullivan" in txt, 'template')
            check(sid, 'PD-USGov licence template', 'PD-USGov' in txt, 'template')
            check(sid, 'Commons sha1 equals the sha1 of our bytes', ii['sha1'] == hashlib.sha1(raw).hexdigest(), ii['sha1'])
    p = os.path.join(REPO, a.out)
    old = []
    if a.only and os.path.isfile(p):   # merge: keep the entries of the sources this run did not touch
        old = [c for c in json.load(open(p, encoding='utf-8')).get('checks', []) if not c['source'].startswith(a.only)]
    allc = old + checks
    out = {'when': time.strftime('%Y-%m-%d'), 'checks': allc, 'failed': sum(1 for c in allc if c['ok'] is False), 'not_run': sum(1 for c in allc if c['ok'] is None)}
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write(chr(10))
    print('%d checks, %d failed, %d not run -> %s' % (len(allc), out['failed'], out['not_run'], a.out))
    return 1 if out['failed'] or (a.strict and out['not_run']) else 0


if __name__ == '__main__':
    sys.exit(main())
