"""Fetch the page-number data of the archive.org items behind the library citations of tl-03 (public domain; at most one request per second):
metadata (with the page_numbers block), <id>_hocr_pageindex.json.gz and <id>_hocr_searchtext.txt.gz.  Output: tmp/tl-03/scan/ia/<id>/.
    python3 -I tmp/tl-03/audit/ia_fetch.py [ident ...]"""
import os, sys, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
OUT = os.path.join(ROOT, 'tmp', 'tl-03', 'scan', 'ia')
rows = []
idents = []
if len(sys.argv) > 1:
    idents = sys.argv[1:]
log = []
last = [0.0]


def get(url, dest):
    dt = time.time() - last[0]
    if dt < 1.05:
        time.sleep(1.05 - dt)
    last[0] = time.time()
    r = subprocess.run(['curl', '-sS', '-L', '-m', '120', '-A', 'library-research-client', '-o', dest, '-w', '%{http_code}', url], capture_output=True, text=True)
    code = r.stdout.strip()
    ok = code == '200' and os.path.exists(dest) and os.path.getsize(dest) > 0
    if not ok and os.path.exists(dest):
        os.remove(dest)
    return code, ok


for ident in idents:
    d = os.path.join(OUT, ident)
    os.makedirs(d, exist_ok=True)
    res = {'ident': ident}
    code, ok = get('https://archive.org/metadata/' + ident, os.path.join(d, 'metadata.json'))
    res['metadata'] = code
    names = []
    if ok:
        m = json.load(open(os.path.join(d, 'metadata.json'), encoding='utf-8'))
        names = [f['name'] for f in m.get('files', [])]
        res['has_page_numbers'] = bool(m.get('page_numbers'))
        res['leaves'] = len((m.get('page_numbers') or {}).get('pages') or [])
    for fn in (ident + '_hocr_pageindex.json.gz', ident + '_hocr_searchtext.txt.gz'):
        if names and fn not in names:
            res[fn] = 'not in item'
            continue
        code, ok = get('https://archive.org/cors/%s/%s' % (ident, fn), os.path.join(d, fn))
        res[fn] = code if not ok else 'ok'
    print(json.dumps(res), flush=True)
    log.append(res)
json.dump(log, open(os.path.join(OUT, 'fetch_log.json'), 'w'), indent=1)
