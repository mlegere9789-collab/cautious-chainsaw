"""Helpers for the positions claim ledger (scope B and others): dump a report with printed-page markers, and build claim
records whose quote / time phrase / place phrase are located BY CODE in the named OR record (no typed-from-memory text).

    python -I tools/bt/positions_lib.py dump OR27-1-R076 [out.txt]     # normalized text, [[p.N]] markers at page breaks
    python -I tools/bt/positions_lib.py find OR27-1-R076 REGEX [ctx]   # regex inside one record with page

Claim spec for build_claims(): see positions_B_data*.py. `rx` is a regex matched (case-sensitive unless (?i)) against the
normalized text of the record; the matched text becomes source.quote and must be < 15 words and is re-verified with
or27_find.verify(). `when_printed` and `place_printed` must occur verbatim (normalized, case-insensitive) within 700 characters
around the quote anchor, else the build aborts. Page = printed page at the anchor (range / interpolation flag from the index).
"""
import os, re, sys, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, INDEX_PATH, utf8_stdout

utf8_stdout()
with open(INDEX_PATH, encoding='utf-8') as f:
    IDX = json.load(f)
RECS = {r['id']: r for r in IDX['records']}


def rec_slice(rec):
    r = RECS[rec]
    P = F.get_part(r['part'])
    a = bisect.bisect_left(P.nmap, r['start_offset'])
    b = bisect.bisect_left(P.nmap, r['end_offset'])
    return P, a, b


def page_label(P, s, e):
    os_, oe = P.orig_span(s, e)
    pa = P.pm.page_at(os_)
    pb = P.pm.page_at(max(os_, oe - 1))
    interp = pa['conf'] == 'interp' or pb['conf'] == 'interp'
    lo, hi = pa['page'], pb['page']
    if interp:
        lo2, hi2 = pa['lo'], pb['hi']
        return ('%d-%d' % (lo2, hi2) if lo2 != hi2 else str(lo2)), True
    return (str(lo) if lo == hi else '%d-%d' % (lo, hi)), False


def dump(rec):
    P, a, b = rec_slice(rec)
    # page markers: head offsets (original) -> normalized index
    marks = []
    for off, pg in zip(P.pm.offs, P.pm.pages):
        i = bisect.bisect_left(P.nmap, off)
        if a <= i < b:
            marks.append((i, pg))
    out = []
    pos = a
    first = P.pm.page_at(P.orig_span(a, a + 1)[0])
    out.append('[[p.%s%s]] ' % (first['page'], '~' if first['conf'] == 'interp' else ''))
    for i, pg in marks:
        out.append(P.ntext[pos:i])
        out.append(' [[p.%d]] ' % pg)
        pos = i
    out.append(P.ntext[pos:b])
    return ''.join(out)


def find_in(rec, rx, ctx=200, flags=re.I):
    P, a, b = rec_slice(rec)
    res = []
    for m in re.finditer(rx, P.ntext[a:b], flags):
        s, e = a + m.start(), a + m.end()
        pl, ip = page_label(P, s, e)
        res.append((pl, ip, P.ntext[max(a, s - ctx):min(b, e + ctx)], m.group(0)))
    return res


def _norm(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


class BuildError(Exception):
    pass


def locate_claim(rec, rx, when_printed=None, place_printed=None, nth=0):
    P, a, b = rec_slice(rec)
    ms = list(re.finditer(rx, P.ntext[a:b], re.S))
    if len(ms) <= nth:
        raise BuildError('NO MATCH in %s for /%s/' % (rec, rx))
    m = ms[nth]
    s, e = a + m.start(), a + m.end()
    text = P.ntext[s:e]
    if len(text.split()) >= 15:
        raise BuildError('QUOTE TOO LONG (%d words) in %s: %s' % (len(text.split()), rec, text[:70]))
    r = RECS[rec]
    v = F.verify(text, (r['part'],))
    os_, oe = P.orig_span(s, e)
    if not any(h['start'] <= os_ and h['end'] >= oe - 1 for h in v):
        raise BuildError('QUOTE NOT VERIFIED in %s: %s' % (rec, text[:70]))
    window = _norm(P.ntext[max(a, s - 700):min(b, e + 700)])
    for lab, ph in (('when_printed', when_printed), ('place_printed', place_printed)):
        if ph and _norm(ph) not in window:
            raise BuildError('%s %r not within 700 chars of the quote in %s (/%s/)' % (lab, ph, rec, rx))
    pl, ip = page_label(P, s, e)
    return text, pl, ip


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'dump':
        t = dump(sys.argv[2])
        if len(sys.argv) > 3:
            with open(sys.argv[3], 'w', encoding='utf-8') as f:
                f.write(t)
        else:
            print(t)
    elif cmd == 'find':
        for pl, ip, c, m in find_in(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 200):
            print('[p.%s%s] ...%s...\n' % (pl, '~' if ip else '', c))
