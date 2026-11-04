"""Search the OR Ser. I vol. 27 (Gettysburg Campaign) OCR text and cite hits by report and printed page.

    python -I tools/bt/or27_find.py "Reynolds.{0,60}(killed|fell)" -C 200 --part 1 --max 10
    python -I tools/bt/or27_find.py --verify "exact phrase to confirm" [--part 1]
    python -I tools/bt/or27_find.py --self-test

Matching is done on a NORMALIZED view of each part: whitespace collapsed, end-of-line hyphenation joined ("con-\\ncerning" ->
"concerning"), printed running-head lines removed so that a phrase may cross a page break. Every hit is mapped back to character
offsets in the ORIGINAL raw file; the context shown is the original text (whitespace collapsed for display only).
Citation = OR Ser.I vol.27 pt.N, report id + author, printed page (page recovery: see or27_index.py / OR27-NOTES.md; a page marked
'~' is interpolated inside a run of pages whose running heads the OCR lost, the range is shown).
Regexes are matched case-insensitively unless --case is given. OCR errors are NOT corrected: search with tolerant patterns.
"""
import os, re, sys, json, bisect, pickle, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_lib import *
from or27_pages import get_heads, PageModel

utf8_stdout()
CACHE_DIR = os.path.join(RAW_DIR, 'cache')


class Part:
    def __init__(self, part):
        self.part = part
        self.text = load_text(part)
        sha = sha256_file(raw_path(part))[:16]
        cp = os.path.join(CACHE_DIR, 'nview_%d_%s_v1.pkl' % (part, sha))
        got = None
        if os.path.exists(cp):
            try:
                with open(cp, 'rb') as f:
                    got = pickle.load(f)
            except Exception:
                got = None
        if got is None:
            hs, pr = get_heads(self.text)
            spans = sorted((h['off'], h['end']) for h in hs)
            ntext, nmap = build_nview(self.text, blank_spans=spans)
            got = {'ntext': ntext, 'nmap': nmap, 'heads': hs, 'pages': pr}
            try:
                os.makedirs(CACHE_DIR, exist_ok=True)
                with open(cp, 'wb') as f:
                    pickle.dump(got, f, protocol=4)
            except Exception:
                pass
        self.ntext, self.nmap = got['ntext'], got['nmap']
        self.pm = PageModel(got['heads'], got['pages'])
        self.records = []

    def attach_records(self, recs):
        self.records = sorted((r for r in recs if r['part'] == self.part), key=lambda r: r['start_offset'])
        self._starts = [r['start_offset'] for r in self.records]

    def record_at(self, off):
        if not self.records:
            return None
        i = bisect.bisect_right(self._starts, off) - 1
        if i < 0:
            return None
        r = self.records[i]
        return r if off < r['end_offset'] else None

    def orig_span(self, ns, ne):
        return self.nmap[ns], self.nmap[ne - 1] + 1

    def cite(self, off_start, off_end):
        r = self.record_at(off_start)
        pa = self.pm.page_at(off_start)
        pb = self.pm.page_at(max(off_start, off_end - 1))

        def fmt(p):
            if p['page'] is None:
                return '?'
            return str(p['page']) if p['conf'].startswith(('head', 'front')) else '~%d (%s-%s)' % (p['page'], p['lo'], p['hi'])
        page = fmt(pa) if pa['page'] == pb['page'] else '%s-%s' % (fmt(pa), fmt(pb))
        if r is None:
            who = 'unindexed region'
        elif r['part'] == 3:
            who = '%s %s -> %s, %s' % (r['id'], (r.get('header_raw') or '')[:40], r.get('addressee') or '?', r.get('date_raw') or '')
        else:
            who = '%s %s %s' % (r['id'], r.get('rank') or '', r.get('author') or (r.get('toc_text') or '')[:40])
        return {'part': self.part, 'record': r['id'] if r else None, 'who': who.strip(), 'page': page, 'start': off_start, 'end': off_end,
                'cite': 'OR Ser.I vol.27 pt.%d, %s, p. %s' % (self.part, who.strip(), page)}


_parts = {}
_idx = None


def get_part(p):
    global _idx
    if _idx is None:
        try:
            with open(INDEX_PATH, encoding='utf-8') as f:
                _idx = json.load(f)['records']
        except Exception:
            _idx = []
    if p not in _parts:
        _parts[p] = Part(p)
        _parts[p].attach_records(_idx)
    return _parts[p]


def search(pattern, parts=(1, 2, 3), ctx=150, flags=re.I, max_hits=50):
    out = []
    rx = re.compile(pattern, flags)
    for p in parts:
        P = get_part(p)
        for m in rx.finditer(P.ntext):
            if m.end() == m.start():
                continue
            os_, oe = P.orig_span(m.start(), m.end())
            c = P.cite(os_, oe)
            a = max(0, m.start() - ctx)
            b = min(len(P.ntext), m.end() + ctx)
            c['match'] = m.group(0)
            c['context'] = P.ntext[a:b]
            c['context_match_at'] = [m.start() - a, m.end() - a]
            out.append(c)
            if len([x for x in out if x['part'] == p]) >= max_hits:
                break
    return out


def verify(quote, parts=(1, 2, 3)):
    """Return list of citations where the whitespace-normalized quote occurs verbatim (case-sensitive) in the normalized text."""
    q = norm_query(quote)
    hits = []
    for p in parts:
        P = get_part(p)
        pos = 0
        while True:
            i = P.ntext.find(q, pos)
            if i < 0:
                break
            os_, oe = P.orig_span(i, i + len(q))
            hits.append(P.cite(os_, oe))
            pos = i + 1
    return hits


def show(h, ctx_flag=True):
    print('[%s]' % h['cite'])
    if ctx_flag and 'context' in h:
        a, b = h['context_match_at']
        c = h['context']
        print('   ...%s<<%s>>%s...' % (c[:a], c[a:b], c[b:]))
    print('   (part %d offsets %d-%d)' % (h['part'], h['start'], h['end']))


def self_test():
    ok = True

    def check(name, cond, detail=''):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + name + (' -- ' + detail if detail else ''))
        ok = ok and cond
    # 1. regex hit maps back to the original text
    h = search(r'Reports\s+of\s+Maj\.\s+Gen\.\s+George\s+G\.\s+Meade', parts=(1,), ctx=0, max_hits=3)
    check('Meade report heading found in Part 1', bool(h))
    if h:
        P = get_part(1)
        seg = norm_query(P.text[h[0]['start']:h[0]['end']])
        check('hit offsets point at the same words in the ORIGINAL file', seg.lower().startswith('reports of maj. gen. george g. meade'), seg[:60])
        check('Meade report resolves to its record and page 61', 'R006' in (h[0]['record'] or '') and h[0]['page'] == '61', h[0]['cite'])
    # 2. line-break hyphenation is joined: 'Poto- mac' style breaks and plain words
    P = get_part(1)
    hy = [m for m in re.finditer(r'[a-z]-[ ]*\n[ ]*[a-z]', P.text)][:200]
    done = False
    for m in hy:
        a = P.text.rfind(' ', 0, m.start()) + 1
        b = P.text.find(' ', m.end())
        word = P.text[a:b]
        joined = re.sub(r'-[ ]*\n[ ]*', '', word)
        if re.fullmatch(r'[a-z]{6,}', joined):
            hits = search(r'\b' + joined + r'\b', parts=(1,), ctx=0, max_hits=200)
            good = [x for x in hits if x['start'] <= a <= x['end'] + 3 or abs(x['start'] - a) < 3]
            check('hyphenated line break joined (%r)' % joined, bool(good))
            done = True
            break
    check('hyphen test ran', done)
    # 3. a phrase crossing a printed page break matches (running head removed)
    hs = P.pm.offs
    cross_ok = False
    tried = 0
    for k in range(10, len(hs) - 1, 37):
        off = hs[k]
        before = norm_query(P.text[max(0, off - 400):off]).split(' ')[-5:]
        e = P.text.find('\n', P.text.find('\n', off) + 1)
        after = norm_query(P.text[off:off + 700]).split(' ')
        # skip the head line itself: take words from the first line after the head
        line_end = P.text.find('\n', off)
        after = norm_query(P.text[line_end:line_end + 400]).split(' ')[:5]
        if len(before) == 5 and len(after) == 5 and all(re.fullmatch(r'[A-Za-z,\.]+', w) for w in before + after):
            q = ' '.join(before + after)
            v = verify(q, parts=(1,))
            tried += 1
            if v:
                cross_ok = True
                break
            if tried > 12:
                break
    check('phrase across a running head matches', cross_ok, 'tried %d' % tried)
    # 4. verify() is exact and case-sensitive
    check('verify rejects a fabricated sentence', not verify('General Meade ordered the army to march to Mars'))
    # 5. Part 3 citation carries a document id
    h3 = search(r'Meade\s+to\s+Halleck|Major-General\s+Meade', parts=(3,), ctx=0, max_hits=2)
    check('Part 3 hit cites a document', bool(h3) and h3[0]['record'] is not None and h3[0]['record'].startswith('OR27-3-D'), h3[0]['cite'] if h3 else '')
    # 6. the upside-down page (Sudsburg report) is not findable: the search tool must not pretend otherwise
    check('inverted-page report is not matched by its own author name in text', not search(r'Sudsburg', parts=(1,), ctx=0, max_hits=500) or all(
        (x['record'] or '') != 'OR27-1-R277' for x in search(r'Sudsburg', parts=(1,), ctx=0, max_hits=500)))
    print('SELF-TEST', 'OK' if ok else 'FAILED')
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pattern', nargs='?')
    ap.add_argument('--part', type=int, action='append', choices=(1, 2, 3))
    ap.add_argument('-C', '--context', type=int, default=150, help='characters of context each side (default 150)')
    ap.add_argument('--max', type=int, default=25, help='max hits per part (default 25)')
    ap.add_argument('--case', action='store_true', help='case-sensitive')
    ap.add_argument('--verify', metavar='QUOTE', help='exact (whitespace-normalized, case-sensitive) phrase check; prints citations or NOT FOUND')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    parts = tuple(a.part) if a.part else (1, 2, 3)
    if a.self_test:
        sys.exit(0 if self_test() else 1)
    if a.verify:
        hits = verify(a.verify, parts)
        if a.json:
            print(json.dumps(hits, ensure_ascii=False, indent=1))
        elif not hits:
            print('NOT FOUND')
        for h in hits:
            show(h, False)
        sys.exit(0 if hits else 2)
    if not a.pattern:
        ap.error('pattern required')
    hits = search(a.pattern, parts, a.context, 0 if a.case else re.I, a.max)
    if a.json:
        print(json.dumps(hits, ensure_ascii=False, indent=1))
    else:
        for h in hits:
            show(h)
        print('%d hit(s) shown (max %d per part)' % (len(hits), a.max))


if __name__ == '__main__':
    main()
