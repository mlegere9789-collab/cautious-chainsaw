"""Count which OR27 records mention a pattern: python -I tools/bt/or27_where.py "Barksdale" [--part 2] [--min N]"""
import os, re, sys, json, bisect, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import INDEX_PATH, utf8_stdout
utf8_stdout()
IDX = json.load(open(INDEX_PATH, encoding='utf-8'))['records']
def where(pat, parts=(1, 2, 3), flags=re.I):
    rx = re.compile(pat, flags)
    cnt = collections.OrderedDict()
    for p in parts:
        P = F.get_part(p)
        for m in rx.finditer(P.ntext):
            os_, oe = P.orig_span(m.start(), m.end())
            r = P.record_at(os_)
            k = r['id'] if r else None
            if k not in cnt:
                cnt[k] = [0, r, P.cite(os_, oe)['page']]
            cnt[k][0] += 1
    return cnt
if __name__ == '__main__':
    a = sys.argv[1:]
    parts = (1, 2, 3)
    if '--part' in a:
        i = a.index('--part'); parts = (int(a[i+1]),); del a[i:i+2]
    mn = 1
    if '--min' in a:
        i = a.index('--min'); mn = int(a[i+1]); del a[i:i+2]
    for k, (n, r, pg) in where(a[0], parts).items():
        if n >= mn:
            print('%-14s %3d  p.%-8s %s %s' % (k, n, pg, (r or {}).get('rank') or '', ((r or {}).get('author') or (r or {}).get('header_raw') or '')[:40]))
