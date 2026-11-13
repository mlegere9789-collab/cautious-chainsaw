"""Source access for the vegetation claims: one search and one verify for the three families of text the claims rest on.

    OR27            Official Records Ser. I vol. 27, parts 1-3 (tools/bt/or27_find.py): cited by report and printed page
    NPS:<ID>        a National Park Service report saved under tmp/library/web/nps/<ID>/<ID>.txt (=== PAGE n === markers: PDF page index);
                    NPS:<ID>#layout reads the layout text of the same file (two-column pages stay in reading order there); NPS:<ID>#raw the pdftotext raw order (a few documents only)
    WS9:<ID>        a public-domain book or newspaper saved under tmp/library/ws9 (index: docs/battle-theatre/GOVERNANCE/library/acquired_2.json;
                    the OCR text has no page markers: the locator is the character offset in the sha256-pinned file and, when the text itself
                    shows one just before the match, the running head or page figure)

verify(src, quote) answers whether the words of a quote are in the source. The match is made on a "skeleton" of both texts (letters and
digits only, lower case) so that line-end hyphenation, line breaks, punctuation spacing and OCR whitespace do not matter; nothing else is
corrected (an OCR misreading stays a mismatch). The text returned as `found` is the source's own words (whitespace collapsed), which is
what the data files carry as the quote.

    python -I tools/bt/vegetation/srcs.py search NPS:NPS-CLI-PCB "wheat|oats" [ctx]
    python -I tools/bt/vegetation/srcs.py search 'WS9:GBG-COMPILER-1863-07-1*' "harvest"
    python -I tools/bt/vegetation/srcs.py verify NPS:NPS-CLI-PCB "Planted in corn at the time of the battle"
"""
import os, re, sys, json, glob, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
NPS_DIR = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
WS9_DIR = os.path.join(ROOT, 'tmp', 'library', 'ws9')
WS9_INDEX = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired_2.json')
sys.path.insert(0, os.path.join(HERE, '..'))

_cache = {}
_or_sk = {}


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def skeleton(s):
    """lower-case letters and digits only, with the index of each kept character in s"""
    keep, idx = [], []
    for i, ch in enumerate(s):
        c = ch.lower()
        if c.isalnum():
            keep.append(c)
            idx.append(i)
    return ''.join(keep), idx


def collapse(s):
    return re.sub(r'\s+', ' ', s).strip()


class Text:
    def __init__(self, key, path):
        self.key, self.path = key, path
        with open(path, encoding='utf-8', errors='replace') as f:
            self.raw = f.read()
        self.sha256 = sha256_file(path)
        self._sk = None
        self.pages = None
        if key.startswith('NPS:'):
            self.pages = [(m.start(), int(m.group(1))) for m in re.finditer(r'=== PAGE (\d+) ===', self.raw)]

    @property
    def sk(self):
        if self._sk is None:
            self._sk = skeleton(self.raw)
        return self._sk

    def page_at(self, off):
        if not self.pages:
            return None
        lo, hi = 0, len(self.pages) - 1
        ans = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if self.pages[mid][0] <= off:
                ans, lo = self.pages[mid][1], mid + 1
            else:
                hi = mid - 1
        return ans


def ws9_path(i):
    ix = json.load(open(WS9_INDEX))
    for it in ix['items']:
        if it['id'] == i:
            return os.path.join(ROOT, it['local_path'])
    raise KeyError('no ws9 item ' + i)


def ws9_ids(pattern):
    ix = json.load(open(WS9_INDEX))
    ids = [it['id'] for it in ix['items']]
    rx = re.compile('^' + re.escape(pattern).replace(r'\*', '.*') + '$')
    return [i for i in ids if rx.match(i)]


def load(key):
    if key in _cache:
        return _cache[key]
    fam, _, name = key.partition(':')
    if fam == 'NPS':
        base, _, variant = name.partition('#')       # NPS:<ID>#layout reads <ID>.layout.txt (columns kept apart where the plain text interleaves them)
        p = os.path.join(NPS_DIR, base, base + {'layout': '.layout.txt', 'raw': '.raw.txt'}.get(variant, '.txt'))
    elif fam == 'WS9':
        p = ws9_path(name)
    else:
        raise KeyError(key)
    if not os.path.exists(p):
        raise FileNotFoundError(p)
    _cache[key] = Text(key, p)
    return _cache[key]


def expand(key):
    """a key with * (WS9:GBG-COMPILER-1863-07-*) or NPS:* becomes the list of keys"""
    if key == 'OR27':
        return ['OR27']
    fam, _, name = key.partition(':')
    if fam == 'WS9' and '*' in name:
        return ['WS9:' + i for i in ws9_ids(name)]
    if fam == 'NPS' and '*' in name:
        rx = re.compile('^' + re.escape(name).replace(r'\*', '.*') + '$')
        return ['NPS:' + d for d in sorted(os.listdir(NPS_DIR)) if rx.match(d) and os.path.exists(os.path.join(NPS_DIR, d, d + '.txt'))]
    return [key]


def verify(key, quote, report=None):
    """-> {ok, count, found, locator{...}, sha256}; for OR27 locator carries report, page and cite"""
    if key == 'OR27':
        import or27_find as F
        hits = F.verify(quote, parts=(1, 2, 3))
        if report:
            hits = [h for h in hits if h.get('record') == report]
        if not hits:                                   # the OCR keeps stray marks inside a line (} < . ) that the letter-and-digit comparison ignores
            qs, _ = skeleton(quote)
            for part in (1, 2, 3):
                P = F.get_part(part)
                if part not in _or_sk:
                    _or_sk[part] = skeleton(P.ntext)
                sk, idx = _or_sk[part]
                pos = 0
                while len(qs) >= 12:
                    i = sk.find(qs, pos)
                    if i < 0:
                        break
                    a, b = idx[i], idx[i + len(qs) - 1] + 1
                    os_, oe = P.orig_span(a, b)
                    c = P.cite(os_, oe)
                    if not report or c['record'] == report:
                        hits.append(c)
                    pos = i + 1
                if hits:
                    break
        if not hits:
            return {'ok': False, 'count': 0, 'found': None}
        h = hits[0]
        P = F.get_part(h['part'])
        found = collapse(P.text[h['start']:h['end']])
        return {'ok': True, 'count': len(hits), 'found': found,
                'locator': {'part': h['part'], 'report': h['record'], 'who': h['who'], 'page': h['page'], 'cite': h['cite'], 'char_start': h['start'], 'char_end': h['end']}}
    t = load(key)
    qs, _ = skeleton(quote)
    if len(qs) < 12:
        return {'ok': False, 'count': 0, 'found': None, 'error': 'quote too short to be a test'}
    sk, idx = t.sk
    n, pos, first = 0, 0, None
    while True:
        i = sk.find(qs, pos)
        if i < 0:
            break
        n += 1
        if first is None:
            first = i
        pos = i + 1
    if first is None:
        return {'ok': False, 'count': 0, 'found': None}
    a, b = idx[first], idx[first + len(qs) - 1] + 1
    loc = {'char_start': a, 'char_end': b}
    pg = t.page_at(a)
    if pg is not None:
        loc['pdf_page'] = pg
    return {'ok': True, 'count': n, 'found': collapse(t.raw[a:b]), 'locator': loc, 'sha256': t.sha256}


def search(key, pattern, ctx=110, flags=re.I, maxn=200, skip=None):
    """yield (key, page, offset, before, match, after); the text is whitespace-collapsed for display only"""
    rx = re.compile(pattern, flags)
    sk = re.compile(skip, flags) if skip else None
    out = []
    for k in expand(key):
        if k == 'OR27':
            import or27_find as F
            for h in F.search(pattern, parts=(1, 2, 3), ctx=ctx, flags=flags, max_hits=maxn):
                c = h['context']
                a, b = h['context_match_at']
                if sk and sk.search(c):
                    continue
                out.append((k + ':' + str(h['record']), 'p.' + str(h['page']), h['start'], c[:a], c[a:b], c[b:]))
            continue
        t = load(k)
        n = 0
        for m in rx.finditer(t.raw):
            c0 = collapse(t.raw[max(0, m.start() - ctx):m.start()])
            c1 = collapse(t.raw[m.end():m.end() + ctx])
            if sk and sk.search(c0 + m.group(0) + c1):
                continue
            pg = t.page_at(m.start())
            out.append((k, ('pdf' + str(pg)) if pg is not None else '-', m.start(), c0, collapse(m.group(0)), c1))
            n += 1
            if n >= maxn:
                break
    return out


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    cmd, key = argv[1], argv[2]
    if cmd == 'search':
        ctx = int(argv[4]) if len(argv) > 4 else 110
        for k, pg, off, a, m, b in search(key, argv[3], ctx):
            print('[%s %s @%d] %s<<%s>>%s' % (k, pg, off, a, m, b))
    elif cmd == 'verify':
        r = verify(key, argv[3])
        print(json.dumps(r, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
