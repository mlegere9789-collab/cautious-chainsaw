"""Scratch helpers for shard tl-03 close-out: search and verify passages in the local library texts and OR vol.27.
Offsets are CHARACTER offsets in the raw file decoded as UTF-8 with newline='' (same convention as tools/bt/or27_lib.py).
Library = acquired_2.json items + reverified prior items + acquired_3.json (National Park Service texts, text layer) + extra files registered in EXTRA below."""
import os, re, sys, json, pickle, hashlib, bisect
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query
G = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE')
CACHE = os.path.join(ROOT, 'tmp', 'tl-03', 'cache')
ACQ = json.load(open(os.path.join(G, 'library/acquired_2.json'), encoding='utf-8'))
ITEMS = {it['id']: it for it in ACQ['items']}
for it in ACQ.get('reverified_prior_items', []):
    ITEMS[it['source_id']] = {'id': it['source_id'], 'local_path': it['local_path'], 'sha256': it.get('sha256_now'), 'archive_identifier': it.get('archive_identifier'), 'prior': True}
_a3 = os.path.join(G, 'library/acquired_3.json')
if os.path.exists(_a3):
    for it in json.load(open(_a3, encoding='utf-8')).get('items', []):
        if it.get('local_path') and it.get('text_sha256') and it['id'] not in ITEMS:
            ITEMS[it['id']] = {'id': it['id'], 'local_path': it['local_path'], 'sha256': it['text_sha256'], 'title': it.get('title'), 'nps': True}
# extra texts fetched or registered for this close-out (acquired_tl03.json written by me)
_ex = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/acquired_tl03.json')
if os.path.exists(_ex):
    for it in json.load(open(_ex, encoding='utf-8')).get('items', []):
        ITEMS[it['id']] = {'id': it['id'], 'local_path': it['local_path'], 'sha256': it['sha256'], 'title': it.get('title'), 'archive_identifier': it.get('archive_identifier'), 'extra': True}
# PA at Gettysburg vol.1 (1914 printing, 11th-111th Infantry; acquired.json PA-GB-1914a, archive.org pennsylvaniaatge04penn)
if 'PA-GB-1914-v1' not in ITEMS and os.path.exists(os.path.join(ROOT, 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt')):
    ITEMS['PA-GB-1914-v1'] = {'id': 'PA-GB-1914-v1', 'local_path': 'tmp/library/misc/pennsylvaniaatge04penn_djvu.txt', 'sha256': 'a819817be3edf5cd03f0f306e1b90b7e3c2598859c1ef2c0f2365815e7ac8668', 'archive_identifier': 'pennsylvaniaatge04penn', 'prior': True}

def path_of(sid):
    return os.path.join(ROOT, ITEMS[sid]['local_path'])

_raw = {}
def raw(sid):
    if sid not in _raw:
        with open(path_of(sid), encoding='utf-8', newline='') as f:
            _raw[sid] = f.read()
    return _raw[sid]

def sha(sid):
    h = hashlib.sha256(); h.update(open(path_of(sid), 'rb').read()); return h.hexdigest()

_nv = {}
def nview(sid):
    if sid not in _nv:
        cp = os.path.join(CACHE, 'nv_%s.pkl' % sid)
        got = None
        if os.path.exists(cp):
            try:
                got = pickle.load(open(cp, 'rb'))
            except Exception:
                got = None
        if got is None:
            nt, nm = build_nview(raw(sid))
            got = (nt, nm)
            os.makedirs(CACHE, exist_ok=True)
            pickle.dump(got, open(cp, 'wb'), protocol=4)
        _nv[sid] = got
    return _nv[sid]

def find(sid, quote):
    nt, nm = nview(sid)
    q = norm_query(quote); out = []; pos = 0
    while True:
        i = nt.find(q, pos)
        if i < 0: break
        out.append((nm[i], nm[i + len(q) - 1] + 1)); pos = i + 1
    return out

def search(sid, pattern, ctx=200, flags=re.I, maxhits=50):
    nt, nm = nview(sid)
    out = []
    for m in re.finditer(pattern, nt, flags):
        a = max(0, m.start() - ctx); b = min(len(nt), m.end() + ctx)
        out.append({'sid': sid, 'off': nm[m.start()], 'match': m.group(0), 'context': nt[a:b]})
        if len(out) >= maxhits: break
    return out

def window(sid, off, before=600, after=1200):
    nt, nm = nview(sid)
    i = bisect.bisect_left(nm, off)
    return nt[max(0, i - before):i + after]

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern'); ap.add_argument('--ids', default=''); ap.add_argument('-C', type=int, default=200); ap.add_argument('--max', type=int, default=20)
    ap.add_argument('--case', action='store_true')
    a = ap.parse_args()
    ids = [x for x in a.ids.split(',') if x] or sorted(ITEMS)
    n = 0
    for sid in ids:
        if not os.path.exists(path_of(sid)): continue
        for h in search(sid, a.pattern, a.C, 0 if a.case else re.I, a.max):
            print('[%s @%d] ...%s...' % (h['sid'], h['off'], h['context'])); print(); n += 1
    print(n, 'hit(s)')
