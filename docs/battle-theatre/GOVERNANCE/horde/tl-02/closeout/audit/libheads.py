"""For every library citation of tl-02: stored page, page of the archive.org index for the leaf holding the quote start, and the number found in the
first 90 characters of that leaf's OCR text (the running head printed at the top of the page).  Output table + libheads.json.
    python3 -I tmp/tl-02/audit/libheads.py"""
import os, re, sys, json, bisect, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
corr = os.environ.get('TL2_CORR') or os.path.join(G, 'timeline_corrections', 'tl-02.jsonl')
sys.argv = [sys.argv[0]]
# reuse leafmap from libctx (it runs main() on import: load the functions by exec of the top part)
src = open(os.path.join(HERE, 'libctx.py'), encoding='utf-8').read().split('\ndef main():')[0]
ns = {'__file__': os.path.join(HERE, 'libctx.py')}
exec(compile(src, 'libctx_funcs', 'exec'), ns)
leafmap = ns['leafmap']
rows = [json.loads(l) for l in open(corr, encoding='utf-8')]
cache = {}
out = []
NUM = re.compile(r'(?<![\d,.$])(\d{1,4})(?![\d,]|\.\d)')


def head_num(t):
    h = re.sub(r'\s+', ' ', t[:110]).strip()
    cands = []
    m = re.match(r'^\W*(\d{1,4})\b', h)
    if m:
        cands.append(int(m.group(1)))
    for m in re.finditer(r'\b(\d{1,4})\b', h[:70]):
        cands.append(int(m.group(1)))
    return h, cands


for r in rows:
    for c in r['citations']:
        if c['source_id'] in ('OR27', 'COMPUTED'):
            continue
        ident = c.get('archive_identifier')
        d = os.path.join(ROOT, 'tmp', 'tl-02', 'scan', 'ia', ident or '_none_', 'metadata.json')
        if not ident or not os.path.exists(os.path.join(os.path.dirname(d), ident + '_hocr_pageindex.json.gz')):
            out.append(dict(row=r['id'], key=c['key'], src=c['source_id'], stored=c['printed_page'], index=None, head=None, note='no page index for the item'))
            continue
        if ident not in cache:
            cache[ident] = leafmap(ident, os.path.join(ROOT, c['source_file']))
        lm = cache[ident]
        starts = [x[1] for x in lm['leaves']]
        i = bisect.bisect_right(starts, c['text_offset']) - 1
        j = bisect.bisect_right(starts, c['text_offset_end'] - 1) - 1
        if i < 0:
            out.append(dict(row=r['id'], key=c['key'], src=c['source_id'], stored=c['printed_page'], index=None, head=None, note='before first leaf'))
            continue
        la = lm['leaves'][i][0]
        lb = lm['leaves'][j][0]
        t = lm['djvu']
        h1, n1 = head_num(t[lm['leaves'][i][1]:lm['leaves'][i][1] + 200])
        # next leaf head (in case the quote crosses)
        pa = lm['page_of'].get(la)
        pb = lm['page_of'].get(lb)
        out.append(dict(row=r['id'], key=c['key'], src=c['source_id'], stored=c['printed_page'], leaf=la, leaf_end=lb, index=pa, index_end=pb, head=h1[:90], head_nums=n1[:4]))
json.dump(out, open(os.path.join(HERE, 'libheads.json'), 'w'), indent=1)
for x in out:
    st = x['stored']
    ok = ''
    try:
        s = int(str(st).split('-')[0]) if st not in (None, 'None') else None
    except Exception:
        s = None
    ix = x.get('index')
    try:
        ixn = int(ix) if ix not in (None, '') else None
    except Exception:
        ixn = None
    hn = x.get('head_nums') or []
    flag = ''
    if s is not None and ixn is not None and s != ixn: flag += ' IDX!=STORED'
    if s is not None and hn and s not in hn: flag += ' HEAD!=STORED'
    if s is None: flag += ' STORED-NONE'
    if flag:
        print('%s %-12s %-20s stored=%-6s index=%-6s heads=%-14s |%s| %s' % (x['row'], x['key'], x['src'], st, ix, hn, flag.strip(), (x.get('head') or x.get('note') or '')[:80]))
