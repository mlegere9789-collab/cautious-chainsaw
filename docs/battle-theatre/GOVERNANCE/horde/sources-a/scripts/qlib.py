"""sources-a close-out: quote matching against the registered local texts (run with python3 -I).

  python3 -I qlib.py find SRC "exact quote"      -> offsets, page marker, context (or NOT FOUND)
  python3 -I qlib.py grep SRC "regex" [ctx]      -> regex hits with context (whitespace collapsed)
"""
import os, re, sys, json, bisect

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import slib  # noqa: E402

ROOT = slib.ROOT
REG = json.load(open(os.path.join(ROOT, 'tmp/sources-a/text/REGISTRY.json')))


def path_of(src):
    return os.path.join(ROOT, REG[src]['local_path'])


def page_marker(raw, off):
    """last '=== PAGE n ===' marker before off (pdf page of the NPS library text layers), else None"""
    pg = None
    for m in re.finditer(r'=== PAGE (\d+) ===', raw[:off]):
        pg = m.group(1)
    return pg


def find(src, quote, maxn=5):
    p = path_of(src)
    hits = slib.find_quote(p, quote, maxn=maxn)
    raw = slib.load(p)[0]
    out = []
    for a, b in hits:
        out.append(dict(offset=[a, b], pdf_page=page_marker(raw, a), text=raw[a:b]))
    return out


def count(src, quote):
    return slib.count_quote(path_of(src), quote)


def grep(src, pat, ctx=160, maxn=20, flags=re.I):
    p = path_of(src)
    raw, nt, nm = slib.load(p)
    res = []
    for m in re.finditer(pat, nt, flags):
        a = nm[m.start()]
        res.append(dict(off=a, pdf_page=page_marker(raw, a), ctx=' '.join(nt[max(0, m.start() - ctx): m.end() + ctx].split())))
        if len(res) >= maxn:
            break
    return res


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(1)
    if a[0] == 'find':
        r = find(a[1], a[2])
        if not r:
            print('NOT FOUND')
        for h in r:
            print(h['offset'], 'pdf p.', h['pdf_page'], '|', h['text'][:200])
    elif a[0] == 'grep':
        ctx = int(a[3]) if len(a) > 3 else 160
        for h in grep(a[1], a[2], ctx):
            print(h['off'], 'pdf p.', h['pdf_page'], '|', h['ctx'])
