"""Per cited archive.org item: which shift s (page_numbers leafNum = hocr leaf + s) makes the index agree with the page number printed at the top of each leaf.
    python3 -I tmp/tl-02/audit/shifts.py   -> table + shifts.json"""
import os, re, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
sys.argv = [sys.argv[0]]
src = open(os.path.join(HERE, 'libctx.py'), encoding='utf-8').read().split('\ndef main():')[0]
ns = {'__file__': os.path.join(HERE, 'libctx.py')}
exec(compile(src, 'libctx_funcs', 'exec'), ns)
leafmap = ns['leafmap']
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
items = {}
for r in rows:
    for c in r['citations']:
        if c.get('archive_identifier') and c['source_id'] not in ('OR27', 'COMPUTED'):
            items.setdefault(c['archive_identifier'], c['source_file'])


def headnum(h):
    m = re.match(r'^\W*(\d{1,4})\b', h)
    if m:
        return int(m.group(1))
    m = re.search(r'\b(\d{1,4})\W*$', h[:70])
    if m:
        return int(m.group(1))
    m = re.search(r'[A-Za-z.:—]\s+(\d{1,4})\b', h[:70])
    return int(m.group(1)) if m else None


res = {}
for ident, path in sorted(items.items()):
    d = os.path.join(ROOT, 'tmp', 'tl-02', 'scan', 'ia', ident)
    if not os.path.exists(os.path.join(d, ident + '_hocr_pageindex.json.gz')):
        print('%-30s no page index' % ident)
        continue
    lm = leafmap(ident, os.path.join(ROOT, path))
    t = lm['djvu']
    heads = []
    for leaf, off in lm['leaves']:
        h = re.sub(r'\s+', ' ', t[off:off + 100]).strip()
        heads.append((leaf, headnum(h)))
    def idx(leaf):
        v = lm['page_of'].get(leaf)
        return int(v) if v not in (None, '') and str(v).isdigit() else None
    best = None
    out = {}
    for s in (-1, 0, 1, 2):
        n = m = 0
        for leaf, hn in heads:
            ix = idx(leaf + s)
            if hn is not None and ix is not None:
                n += 1
                if hn == ix:
                    m += 1
        out[s] = (m, n)
        if best is None or m > best[1]:
            best = (s, m, n)
    first = min(lm['page_of']) if lm['page_of'] else None
    res[ident] = dict(best_shift=best[0], matches=best[1], compared=best[2], by_shift={str(k): v for k, v in out.items()}, first_leafNum=first, n_index=len(lm['page_of']), n_hocr=len(lm['leaves']))
    print('%-30s best shift %+d  match %d of %d  (all shifts %s)  first leafNum %s, index entries %d, aligned leaves %d' % (ident, best[0], best[1], best[2], out, first, len(lm['page_of']), len(lm['leaves'])))
json.dump(res, open(os.path.join(HERE, 'shifts.json'), 'w'), indent=1)
