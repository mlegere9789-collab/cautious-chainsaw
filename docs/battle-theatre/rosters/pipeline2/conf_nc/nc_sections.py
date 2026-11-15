"""Sections of Moore's volumes: where the roll of a regiment or battalion starts and ends in a pinned text.

The heading of a section is a line of capitals "TWENTY-SIXTH  REGIMENT-- INFANTRY." followed within a few hundred characters by the list of abbreviations.
The OCR garbles the ordinals (SEVENTENTH, TBIRTY-FIFTH, THIRTY-NIINTH), so the ordinal is read by the closest canonical ordinal; a heading the OCR lost
completely is a reviewed override with the offset and the reason (OVERRIDES).  A section ends where the next heading of the volume starts.
"""
import re, difflib, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L

_U = ['', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH',
      'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH']
_T = {20: 'TWENTY', 30: 'THIRTY', 40: 'FORTY', 50: 'FIFTY', 60: 'SIXTY', 70: 'SEVENTY'}
_TO = {20: 'TWENTIETH', 30: 'THIRTIETH', 40: 'FORTIETH', 50: 'FIFTIETH', 60: 'SIXTIETH', 70: 'SEVENTIETH'}
ORD = {}
for n in range(1, 76):
    if n < 20:
        ORD[n] = _U[n]
    elif n % 10 == 0:
        ORD[n] = _TO[n]
    else:
        ORD[n] = _T[n // 10 * 10] + '-' + _U[n % 10]
ORD_REV = {v: k for k, v in ORD.items()}


def ordinal_of(s):
    """Number of an ordinal as the OCR prints it ("TBIRTY-FIFTH" -> 35), or None."""
    t = re.sub(r'[^A-Z\-]', '', s.upper().replace(' ', '-').replace('--', '-')).strip('-')
    if not t:
        return None
    best, bn = 0.0, None
    for n, o in ORD.items():
        r = difflib.SequenceMatcher(None, t, o).ratio()
        if r > best:
            best, bn = r, n
    return bn if best >= 0.8 else None


RE_HEAD = re.compile(r"^\W*(?P<ord>[A-Z][A-Z\-\s\.\*•■]{2,40}?)\s*(?P<kind>(?i:[a-z\.]{0,2}[ef]?g?i?ment|r[ef][gc]\w{3,6}|battalion|battal\w+))(?P<arm>.{0,35})$")


def headings(tid):
    """[{off, line, number, unit_kind ('regiment'|'battalion'), arm}] of the real section headings of a text (those followed by the list of abbreviations)."""
    text, pm, ent = L.load(tid)
    out = []
    for off, ln in L.lines_of(text, 0, len(text)):
        s = ln.strip()
        if not (5 < len(s) < 90):
            continue
        m = RE_HEAD.match(s)
        if not m:
            continue
        if len(re.findall(r'[a-z]', m.group('ord'))) > 0:
            continue
        n = ordinal_of(m.group('ord'))
        if n is None and re.match(r'^\W*BETHEL', s):
            n = 'BETHEL'
        if n is None:
            continue
        tail = text[off + len(ln): off + len(ln) + 900]
        if not re.search(r'(?i)capt|comm|coun|abbrev|enlist|compan|promot|resign', tail[:500]):
            continue
        kind = 'battalion' if m.group('kind').upper().startswith('BATT') else 'regiment'
        out.append({'off': off, 'line': s, 'number': n, 'unit_kind': kind, 'arm': m.group('arm').strip(' .,-—')})
    return out


# reviewed overrides: a heading the text layer lost or garbled beyond reading, found by reading the text; {text id: {(number, unit_kind): offset}}
OVERRIDES = {
    # found by reading the text around the printed page of the heading (the printed page numbers of the two scans agree); the offset is that of the heading line
    'NC-MOORE-1882.3': {(57, 'regiment'): 1864663},        # "FIFTY-SEVENTH" / "■INFANTRY." on two lines of the Google scan (printed page 608)
    'NC-MOORE-1882.3~b': {(39, 'regiment'): 268279},       # "THIRTY-NIINTfl  REGIMENT-INFANTRY." (printed page 83)
    'NC-MOORE-1882.4~b': {(3, 'battalion'): 601942 + len('Field  and  Staff— Third  Battalion.  231\n')},   # "THIfjD  BATTALION-LIGHT  ARTILLERY." (printed page 231)
}


def section(tid, number, unit_kind='regiment'):
    """(start offset, end offset, heading line) of the section of the regiment (or battalion) with that number in the text; the end is the next heading."""
    hs = headings(tid)
    ov = OVERRIDES.get(tid, {})
    pts = [(h['off'], h['number'], h['unit_kind'], h['line']) for h in hs]
    for (num, uk), off in ov.items():
        pts.append((off, num, uk, 'override'))
    pts.sort()
    best = None
    for i, (off, num, uk, line) in enumerate(pts):
        if num == number and uk == unit_kind:
            end = pts[i + 1][0] if i + 1 < len(pts) else len(L.load(tid)[0])
            if best is None or end - off > best[1] - best[0]:
                best = (off, end, line)       # a number that stands twice (a table of contents line, a page head): the section is the longer one
    return best
