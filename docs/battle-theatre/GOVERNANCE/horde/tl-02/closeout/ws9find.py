"""Search the local public-domain text library (tmp/library/ws9 and ws9/prior) with a regex or verify an exact quote.

    python3 -I tmp/tl-02/ws9find.py "regex" [-C 200] [--src JACOBS-1864] [--max 10]
    python3 -I tmp/tl-02/ws9find.py --verify "exact phrase" [--src JACOBS-1864]
    python3 -I tmp/tl-02/ws9find.py --raw JACOBS-1864 12345 [--chars 1500]     (print the raw text around an offset)

Matching is on a normalised view (whitespace collapsed, line-break hyphenation joined); offsets printed are CHARACTER offsets
into the ORIGINAL file (utf-8, newline=''), the same convention as tools/bt/or27_lib.py.
"""
import os, re, sys, json, glob, pickle, argparse, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query, utf8_stdout
utf8_stdout()
LIB = os.path.join(ROOT, 'tmp', 'library', 'ws9')
CACHE = os.path.join(ROOT, 'tmp', 'tl-02', 'cache')
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})


def sources():
    out = {}
    for f in sorted(glob.glob(os.path.join(LIB, '*.txt')) + glob.glob(os.path.join(LIB, 'prior', '*.txt'))):
        b = os.path.basename(f)
        sid = b.split('__')[0]
        out[sid] = f
    for f in sorted(glob.glob(os.path.join(ROOT, 'tmp', 'tl-02', 'acq', '*', '*_djvu.txt'))):
        out[os.path.basename(os.path.dirname(f))] = f
    return out


import collections
from array import array
_cache = collections.OrderedDict()
_CACHE_MAX = 4


def load(sid):
    if sid in _cache:
        _cache.move_to_end(sid)
        return _cache[sid]
    path = sources()[sid]
    with open(path, encoding='utf-8', errors='replace', newline='') as f:
        text = f.read()
    sha = hashlib.sha256(text.encode('utf-8', 'replace')).hexdigest()[:16]
    os.makedirs(CACHE, exist_ok=True)
    cp = os.path.join(CACHE, 'nv_%s_%s.pkl' % (re.sub(r'[^A-Za-z0-9_-]', '_', sid), sha))
    got = None
    if os.path.exists(cp):
        try:
            with open(cp, 'rb') as fh:
                got = pickle.load(fh)
        except Exception:
            got = None
    if got is None:
        ntext, nmap = build_nview(text)
        got = (ntext, array('i', nmap))
        with open(cp, 'wb') as fh:
            pickle.dump(got, fh, protocol=4)
    ntext, nmap = got
    if not isinstance(nmap, array):
        nmap = array('i', nmap)
    _cache[sid] = (text, ntext.translate(APOS), nmap, path)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    return _cache[sid]


def search(pattern, sids=None, ctx=200, flags=re.I, max_hits=10):
    rx = re.compile(pattern, flags)
    res = []
    for sid in (sids or list(sources())):
        text, ntext, nmap, path = load(sid)
        n = 0
        for m in rx.finditer(ntext):
            if m.end() == m.start():
                continue
            a = max(0, m.start() - ctx)
            b = min(len(ntext), m.end() + ctx)
            res.append({'src': sid, 'start': nmap[m.start()], 'end': nmap[m.end() - 1] + 1, 'match': m.group(0),
                        'context': ntext[a:m.start()] + '<<' + m.group(0) + '>>' + ntext[m.end():b]})
            n += 1
            if n >= max_hits:
                break
    return res


def verify(quote, sids=None):
    q = norm_query(quote).translate(APOS)
    hits = []
    for sid in (sids or list(sources())):
        text, ntext, nmap, path = load(sid)
        pos = 0
        while True:
            i = ntext.find(q, pos)
            if i < 0:
                break
            hits.append({'src': sid, 'start': nmap[i], 'end': nmap[i + len(q) - 1] + 1})
            pos = i + 1
    return hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern', nargs='?')
    ap.add_argument('-C', '--context', type=int, default=200)
    ap.add_argument('--src', action='append')
    ap.add_argument('--max', type=int, default=10)
    ap.add_argument('--case', action='store_true')
    ap.add_argument('--verify')
    ap.add_argument('--raw', nargs=2)
    ap.add_argument('--chars', type=int, default=1500)
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    if a.list:
        for k, v in sources().items():
            print(k, os.path.getsize(v))
        return
    sids = None
    if a.src:
        allk = list(sources())
        sids = []
        for s in a.src:
            sids += [k for k in allk if k.startswith(s)]
    if a.raw:
        text, ntext, nmap, path = load(a.raw[0])
        off = int(a.raw[1])
        print(text[max(0, off - a.chars):off] + '<<<HERE>>>' + text[off:off + a.chars])
        return
    if a.verify:
        hits = verify(a.verify, sids)
        if not hits:
            print('NOT FOUND')
            sys.exit(2)
        for h in hits:
            print('FOUND %s offsets %d-%d' % (h['src'], h['start'], h['end']))
        return
    res = search(a.pattern, sids, a.context, 0 if a.case else re.I, a.max)
    for h in res:
        print('[%s @%d-%d]' % (h['src'], h['start'], h['end']))
        print('   ...' + h['context'] + '...')
    print('%d hit(s)' % len(res))


if __name__ == '__main__':
    main()
