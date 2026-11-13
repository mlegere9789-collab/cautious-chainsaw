#!/usr/bin/env python3
"""Write a content-stream-order text variant (pdftotext -raw) of a saved PDF.

Reason: for two-column reports with floating captions the default reading-order text
(and the -layout text) interleave columns and captions, so a sentence cannot be quoted from it.
`pdftotext -raw` follows the order in which the publisher's layout program wrote the text
frames, which keeps each column's story together.

  rawtext.py ID [ID...]     needs tmp/library/web/nps/<ID>/<ID>.pdf (re-download with fetch below if deleted)
  rawtext.py --fetch ID     re-download the PDF named in catalogue.json (1 request) and check its sha256 against
                            the manifest before using it

Output: tmp/library/web/nps/<ID>/<ID>.raw.txt with the same '=== PAGE n ===' markers as the other variants,
and an entry raw_text_sha256 / raw_text_bytes in tmp/library/web/nps/MANIFEST.json.
Run with python3 -I.
"""
import hashlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def fetch(sid):
    cat = {i['id']: i for i in json.load(open(os.path.join(NPS, 'catalogue.json')))['items']}
    man = json.load(open(os.path.join(LIB, 'MANIFEST.json')))
    url = cat[sid]['url']
    d = os.path.join(LIB, sid)
    os.makedirs(d, exist_ok=True)
    dest = os.path.join(d, sid + '.pdf')
    subprocess.run(['curl', '-sS', '-L', '--max-time', '900', '-o', dest, url], check=True)
    got, want = sha(dest), man['items'][sid]['sha256']
    print(sid, 'sha256 as recorded' if got == want else 'SHA256 DIFFERS from the manifest: %s vs %s' % (got, want))
    if got != want:
        sys.exit(1)


def build(sid):
    d = os.path.join(LIB, sid)
    pdf = os.path.join(d, sid + '.pdf')
    if not os.path.exists(pdf):
        sys.exit('no PDF for %s (run: rawtext.py --fetch %s)' % (sid, sid))
    n = int(subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout.split('Pages:')[1].split()[0])
    out = []
    # one call per page keeps the page markers exact
    for p in range(1, n + 1):
        t = subprocess.run(['pdftotext', '-raw', '-f', str(p), '-l', str(p), pdf, '-'], capture_output=True, text=True, check=True).stdout
        out.append('=== PAGE %d ===\n%s' % (p, t.replace('\f', '')))
    dest = os.path.join(d, sid + '.raw.txt')
    with open(dest, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) if not out[-1].endswith('\n') else ''.join(x if x.endswith('\n') else x + '\n' for x in out))
    mp = os.path.join(LIB, 'MANIFEST.json')
    man = json.load(open(mp))
    it = man['items'][sid]
    it['raw_text_path'] = os.path.relpath(dest, ROOT)
    it['raw_text_bytes'] = os.path.getsize(dest)
    it['raw_text_sha256'] = sha(dest)
    tmp = mp + '.tmp'
    json.dump(man, open(tmp, 'w'), indent=1, sort_keys=True)
    os.replace(tmp, mp)
    print(sid, n, 'pages ->', dest, it['raw_text_bytes'], 'bytes', it['raw_text_sha256'])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--fetch':
        for sid in a[1:]:
            fetch(sid)
    else:
        for sid in a:
            build(sid)
