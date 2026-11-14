"""Unified normalised search over every local text used for the fence-3 close-out.
 - OR Ser.I vol.27 pt.1-3 (via tools/bt/or27_find)
 - state volumes NY1 NY2 NY3 PA1 PA1B PA2 ME MI FOX BL3 (via tools/bt/statevol_find)
 - the 99-text library tmp/library/ws9 (+ prior)
 - NPS documents tmp/library/web/nps/<ID>/<ID>.txt (page markers '=== PAGE n ===')
CLI:  python3 -I corpus.py REGEX [--only PREFIX[,PREFIX]] [--ctx N] [--max N] [--case]
Library: import corpus; C = corpus.Corpus(); C.grep(rx, only=...)
"""
import os, re, sys, glob, pickle, hashlib, bisect, json
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/tools/bt')
sys.path.insert(0, ROOT + '/tmp/fence-3/scripts')
from or27_lib import build_nview, norm_query
import lib

CACHE = ROOT + '/tmp/fence-3/cache'
os.makedirs(CACHE, exist_ok=True)

APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})


def fold(s):
    return s.translate(APOS)


class Doc:
    def __init__(self, did, path, kind):
        self.id = did
        self.path = path
        self.kind = kind
        self.raw = open(path, encoding='utf-8', newline='').read()
        sha = hashlib.sha256(self.raw.encode('utf-8', 'replace')).hexdigest()[:12]
        cp = os.path.join(CACHE, '%s_%s.pkl' % (did.replace('/', '_'), sha))
        got = None
        if os.path.exists(cp):
            try:
                got = pickle.load(open(cp, 'rb'))
            except Exception:
                got = None
        if got is None:
            n, m = build_nview(self.raw)
            got = (fold(n), list(m))
            pickle.dump(got, open(cp, 'wb'), protocol=4)
        self.n, self.m = got
        self.pages = None
        if kind == 'nps':
            self.pages = [(mm.start(), int(mm.group(1))) for mm in re.finditer(r'=== PAGE (\d+) ===', self.raw)]
            self._pstarts = [p[0] for p in self.pages]

    def raw_off(self, i):
        return self.m[min(i, len(self.m) - 1)]

    def pdf_page(self, raw_off):
        if not self.pages:
            return None
        k = bisect.bisect_right(self._pstarts, raw_off) - 1
        return self.pages[k][1] if k >= 0 else None


class Corpus:
    def __init__(self, load=('ws9', 'nps')):
        self.docs = {}
        if 'ws9' in load:
            for p in sorted(glob.glob(ROOT + '/tmp/library/ws9/*_djvu.txt')):
                did = os.path.basename(p).split('__')[0]
                self.docs[did] = Doc(did, p, 'ws9')
        if 'nps' in load:
            for p in sorted(glob.glob(ROOT + '/tmp/library/web/nps/*/*.txt')):
                b = os.path.basename(p)
                if b.endswith('.layout.txt'):
                    continue
                did = b[:-4]
                self.docs[did] = Doc(did, p, 'nps')

    def grep(self, rx, only=None, ctx=250, max_per=15, flags=re.I):
        r = re.compile(rx, flags)
        out = []
        for did, d in self.docs.items():
            if only and not any(did.startswith(o) for o in only):
                continue
            n = 0
            for m in r.finditer(d.n):
                a, b = max(0, m.start() - ctx), min(len(d.n), m.end() + ctx)
                out.append({'doc': did, 'kind': d.kind, 'raw_off': d.raw_off(m.start()), 'raw_end': d.raw_off(max(m.end() - 1, m.start())) + 1, 'pdf_page': d.pdf_page(d.raw_off(m.start())),
                            'match': m.group(0), 'context': d.n[a:b], 'at': (m.start() - a, m.end() - a)})
                n += 1
                if n >= max_per:
                    break
        return out


def grep_or(rx, parts=(1, 2, 3), ctx=250, max_hits=40, flags=re.I):
    out = []
    for h in lib.or_search(rx, parts, ctx, flags, max_hits):
        out.append({'doc': 'OR27-pt%d' % h['part'], 'cite': h['cite'], 'raw_off': h['start'], 'page': h['page'], 'match': h['match'], 'context': h['context'], 'at': h['context_match_at'], 'record': h['record']})
    return out


def grep_sv(rx, vols=None, ctx=250, max_hits=40, flags=re.I):
    vols = vols or list(lib.SF.SI.VOLUMES)
    out = []
    for h in lib.sv_search(rx, vols, ctx, flags, max_hits):
        out.append({'doc': h['vol'], 'section': h['section'], 'title': h['section_title'], 'page': h['page'], 'interp': h['interpolated'], 'raw_off': h['offset'], 'match': h['match'], 'context': h['context'], 'at': h['at']})
    return out


def show(h):
    c = h['context']
    a, b = h['at']
    tag = h['doc']
    if 'cite' in h:
        tag = h['cite']
    elif 'section' in h:
        tag = '%s %s "%s" p.%s%s' % (h['doc'], h['section'], (h.get('title') or '')[:40], h['page'], '~' if h.get('interp') else '')
    elif h.get('pdf_page') is not None:
        tag = '%s pdf p.%s' % (h['doc'], h['pdf_page'])
    print('[%s | off %s]\n    ...%s<<%s>>%s...' % (tag, h['raw_off'], c[:a], c[a:b], c[b:]))


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('rx')
    ap.add_argument('--only', default='')
    ap.add_argument('--ctx', type=int, default=250)
    ap.add_argument('--max', type=int, default=12)
    ap.add_argument('--case', action='store_true')
    ap.add_argument('--no-or', action='store_true')
    ap.add_argument('--no-sv', action='store_true')
    ap.add_argument('--no-lib', action='store_true')
    a = ap.parse_args()
    flags = 0 if a.case else re.I
    only = [x for x in a.only.split(',') if x] or None
    if not a.no_or and (not only or any(o.startswith('OR27') for o in only)):
        parts = (1, 2, 3)
        for o in (only or []):
            if o.startswith('OR27-pt'):
                parts = (int(o[-1]),)
        for h in grep_or(a.rx, parts, a.ctx, a.max, flags):
            show(h)
    if not a.no_sv and (not only or any(o in lib.SF.SI.VOLUMES for o in only)):
        vols = [o for o in (only or []) if o in lib.SF.SI.VOLUMES] or None
        for h in grep_sv(a.rx, vols, a.ctx, a.max, flags):
            show(h)
    if not a.no_lib:
        C = Corpus()
        for h in C.grep(a.rx, [o for o in (only or []) if not o.startswith('OR27') and o not in lib.SF.SI.VOLUMES] or None, a.ctx, a.max, flags):
            show(h)
