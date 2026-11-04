"""Search the state regimental volumes (Pennsylvania, New York, Maine, Michigan at Gettysburg; Fox; Battles and Leaders 3) and cite
hits by volume, section and printed page.

    python -I tools/bt/statevol_find.py "Horner" -C 200 --vol NY2 --max 10
    python -I tools/bt/statevol_find.py --section NY2-S028 [--from 0 --chars 6000]      (print a section's text, page-marked)
    python -I tools/bt/statevol_find.py --verify "exact phrase to confirm" [--vol NY2]
    python -I tools/bt/statevol_find.py --self-test

Matching is done on a NORMALIZED view of each volume: whitespace collapsed, end-of-line hyphenation joined ("con-\\ncerning" ->
"concerning"), running-head lines (the page heads that carry the page numbers) blanked so a phrase may cross a page break. Hits are
mapped back to character offsets in the ORIGINAL raw file; the citation names the index section (tools/bt/statevol_index.py) and the
printed page from the page model ('~' marks a range inside a run of pages whose running heads the OCR lost).
--verify is CASE-SENSITIVE and exact on the normalized text (OCR errors included): the output line starts with FOUND and names the
volume key, the section id, the printed page and the citation, or starts with NOT FOUND.
"""
import os, re, sys, json, bisect, pickle, argparse, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_lib import build_nview, norm_query, utf8_stdout
import statevol_index as SI

utf8_stdout()
CACHE_DIR = os.path.join(SI.RAW_DIR, 'cache')


class Vol:
    def __init__(self, key, index):
        self.key = key
        self.v = SI.VOLUMES[key]
        self.text = SI.load(key)
        self.vrec = next(r for r in index['volumes'] if r['key'] == key)
        self.secs = [s for s in index['sections'] if s['volume'] == key]
        self.sec_starts = [s['start'] for s in self.secs]
        self.pm = SI.PageModel([tuple(a) for a in self.vrec['anchors']])
        sha = hashlib.sha256(self.text.encode('utf-8', 'replace')).hexdigest()[:16]
        os.makedirs(CACHE_DIR, exist_ok=True)
        cp = os.path.join(CACHE_DIR, 'sv_nview_%s_%s_v1.pkl' % (key, sha))
        got = None
        if os.path.exists(cp):
            try:
                with open(cp, 'rb') as f:
                    got = pickle.load(f)
            except Exception:
                got = None
        if got is None:
            spans = self.head_spans()
            ntext, nmap = build_nview(self.text, spans)
            got = (ntext, list(nmap))
            with open(cp, 'wb') as f:
                pickle.dump(got, f)
        self.ntext, self.nmap = got
        self.ntext = fold(self.ntext)

    def head_spans(self):
        """Original-offset spans of the running-head lines (every page anchor line), blanked in the normalized view."""
        spans = []
        for off, _ in self.vrec['anchors']:
            e = self.text.find('\n', off)
            spans.append((off, len(self.text) if e < 0 else e))
        return sorted(spans)

    def section_at(self, off):
        i = bisect.bisect_right(self.sec_starts, off) - 1
        return self.secs[i] if i >= 0 else None

    def cite(self, off):
        sec = self.section_at(off)
        page, interp = self.pm.page_at(off)
        return sec, page, interp, '%s, %s, p. %s%s' % (self.v['cite'], (sec['title_ocr'].split(' | ')[0] if sec else 'front matter'), page, ' (interpolated)' if interp else '')

    def orig(self, n):
        return self.nmap[min(n, len(self.nmap) - 1)]


_INDEX = None
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})


def fold(s):
    """Typographic apostrophes and quotation marks folded to ASCII so a quote typed with either form matches (length preserved)."""
    return s.translate(APOS)



def index():
    global _INDEX
    if _INDEX is None:
        with open(SI.INDEX_PATH, encoding='utf-8') as f:
            _INDEX = json.load(f)
    return _INDEX


def search(pattern, vols, ctx=160, mx=20, case=False):
    rx = re.compile(pattern, 0 if case else re.I)
    n = 0
    for key in vols:
        V = Vol(key, index())
        for m in rx.finditer(V.ntext):
            o = V.orig(m.start())
            sec, page, interp, cite = V.cite(o)
            a, b = max(0, m.start() - ctx), min(len(V.ntext), m.end() + ctx)
            print('%s off=%d sec=%s page=%s | %s\n    ...%s...' % (key, o, sec['id'] if sec else '-', page, cite, V.ntext[a:b]))
            n += 1
            if n >= mx:
                print('(max %d hits reached)' % mx)
                return n
    print('%d hit(s)' % n)
    return n


def verify(quote, vols):
    q0 = fold(norm_query(quote))
    J = lambda m: m.group(1) + m.group(2)
    H = lambda m: m.group(1) + '-' + m.group(2)
    # the normalized view joins end-of-line hyphenation ('fifty- fourth' -> 'fiftyfourth'): try the quote as typed, then joined forms
    cands = [q0, re.sub(r'(\w)- (\w)', J, q0), re.sub(r'(\w)-(\w)', J, q0), re.sub(r'(\w)- (\w)', H, q0)]
    q = q0
    found = []
    for key in vols:
        V = Vol(key, index())
        p = -1
        for cq in cands:
            p = V.ntext.find(cq)
            if p >= 0:
                q = cq
                break
        while p >= 0:
            o = V.orig(p)
            sec, page, interp, cite = V.cite(o)
            found.append((key, o, sec, page, interp, cite))
            p = V.ntext.find(q, p + 1)
            if len(found) > 20:
                break
    if not found:
        print('NOT FOUND (%d words): %s' % (len(q.split()), q))
        return False
    for key, o, sec, page, interp, cite in found:
        print('FOUND %s %s page=%s%s off=%d | %s | words=%d' % (key, sec['id'] if sec else '-', page, ' interpolated' if interp else '', o, cite, len(q.split())))
    return True


def show_sents(sec_id, rx_text, start=0, chars=None):
    """Print the sentences of a section (or a window of it) that match a regex, each with its offset in the section and printed page."""
    key = sec_id.split('-')[0]
    V = Vol(key, index())
    sec = next(s for s in V.secs if s['id'] == sec_id)
    a = sec['start'] + start
    b = sec['end'] if not chars else min(sec['end'], a + chars)
    rx = re.compile(rx_text, re.I)
    body = V.text[a:b]
    print('== %s %s | %s | pages %s | chars %d | ocr %s | window +%d..+%d' % (sec['id'], V.v['cite'], sec['title_ocr'], sec['printed_pages'], sec['chars'], sec['ocr_grade'], start, b - sec['start']))
    shown = 0
    for m in re.finditer(r'[^.!?]*[.!?]+(?=\s|$)|[^.!?]+$', body):
        sent = ' '.join(m.group(0).split())
        if len(sent) > 20 and rx.search(sent):
            page, interp = V.pm.page_at(a + m.start())
            print('[+%d p.%s] %s' % (a + m.start() - sec['start'], page, sent))
            shown += len(sent)
    print('(%d chars of %d shown)' % (shown, b - a))


def show_section(sec_id, start=0, chars=6000, paras=None):
    key = sec_id.split('-')[0]
    V = Vol(key, index())
    sec = next(s for s in V.secs if s['id'] == sec_id)
    a = sec['start'] + start
    b = min(sec['end'], a + chars)
    print('== %s %s | %s | pages %s | chars %d | ocr %s' % (sec['id'], V.v['cite'], sec['title_ocr'], sec['printed_pages'], sec['chars'], sec['ocr_grade']))
    if paras:
        # print only the paragraphs (blank-line separated) matching the regex, each with its offset in the section and printed page
        rx = re.compile(paras, re.I)
        pos = sec['start']
        shown = 0
        for para in re.split('\n[ \t]*\n', V.text[a:b]):
            txt = ' '.join(para.split())
            if txt and rx.search(txt) and len(txt) > 40:
                page, interp = V.pm.page_at(pos)
                print('[+%d p.%s] %s' % (pos - sec['start'], page, txt))
                shown += len(txt)
            pos += len(para) + 2
        print('(%d chars of %d shown)' % (shown, sec['chars']))
        return
    # print the original text with page marks inserted at the anchors
    anchors = [x for x in V.vrec['anchors'] if a <= x[0] < b]
    pos = a
    out = []
    for off, pg in anchors:
        out.append(V.text[pos:off])
        out.append('\n=== p. %d ===\n' % pg)
        pos = off
    out.append(V.text[pos:b])
    print(''.join(out))
    if b < sec['end']:
        print('... (%d chars remain; --from %d)' % (sec['end'] - b, b - sec['start']))


def self_test():
    ok = True
    tests = [('NY3', 'Coster'), ('PA2', '153'), ('MI', 'Rummel'), ('NY2', 'Excelsior')]
    for key, q in tests:
        V = Vol(key, index())
        p = V.ntext.find(q)
        o = V.orig(p) if p >= 0 else -1
        good = p >= 0 and V.text[o:o + len(q)] == q
        print(key, q, 'nview->orig roundtrip', 'ok' if good else 'FAIL', o)
        ok = ok and good
    print('self-test', 'OK' if ok else 'FAILED')
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern', nargs='?')
    ap.add_argument('--verify')
    ap.add_argument('--section')
    ap.add_argument('--from', dest='frm', type=int, default=0)
    ap.add_argument('--chars', type=int, default=6000)
    ap.add_argument('--paras', help='section mode: print only paragraphs matching this regex')
    ap.add_argument('--sents', help='section mode: print only sentences matching this regex (window: --from/--chars)')
    ap.add_argument('--vol', action='append')
    ap.add_argument('-C', type=int, default=160)
    ap.add_argument('--max', type=int, default=20)
    ap.add_argument('--case', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    vols = a.vol or list(SI.VOLUMES)
    if a.self_test:
        sys.exit(0 if self_test() else 1)
    if a.section and a.sents:
        show_sents(a.section, a.sents, a.frm, a.chars if a.chars != 6000 else None)
    elif a.section:
        show_section(a.section, a.frm, a.chars, a.paras)
    elif a.verify:
        sys.exit(0 if verify(a.verify, vols) else 1)
    elif a.pattern:
        search(a.pattern, vols, a.C, a.max, a.case)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
