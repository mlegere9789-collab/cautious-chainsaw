import re, sys, json, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
import fetchlib as f

ORD = {1: 'FIRST', 2: 'SECOND', 3: 'THIRD', 4: 'FOURTH', 5: 'FIFTH', 6: 'SIXTH', 7: 'SEVENTH', 8: 'EIGHTH', 9: 'NINTH', 10: 'TENTH',
       11: 'ELEVENTH', 12: 'TWELFTH', 13: 'THIRTEENTH', 14: 'FOURTEENTH', 15: 'FIFTEENTH', 16: 'SIXTEENTH', 17: 'SEVENTEENTH',
       18: 'EIGHTEENTH', 19: 'NINETEENTH', 20: 'TWENTIETH', 21: 'TWENTY-FIRST', 22: 'TWENTY-SECOND', 23: 'TWENTY-THIRD',
       24: 'TWENTY-FOURTH', 25: 'TWENTY-FIFTH', 26: 'TWENTY-SIXTH', 27: 'TWENTY-SEVENTH', 28: 'TWENTY-EIGHTH', 29: 'TWENTY-NINTH',
       30: 'THIRTIETH', 31: 'THIRTY-FIRST', 32: 'THIRTY-SECOND', 33: 'THIRTY-THIRD', 34: 'THIRTY-FOURTH', 35: 'THIRTY-FIFTH',
       36: 'THIRTY-SIXTH', 37: 'THIRTY-SEVENTH', 38: 'THIRTY-EIGHTH', 39: 'THIRTY-NINTH', 40: 'FORTIETH'}


def lev(a, b):
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def norm_ord(s):
    return re.sub(r'[^A-Z]', '', s.upper())


ORDN = {n: norm_ord(w) for n, w in ORD.items()}


def ordinal_of(headtext):
    t = headtext.upper()
    m = re.match(r'\s*([A-Z][A-Z\-\s]{3,22}?)\s+(REGIMENT|INFANTRY|BATTERY|CAVALRY|COMPANY)', t)
    if not m:
        return None
    w = norm_ord(m.group(1))
    best = None
    for n, o in ORDN.items():
        d = lev(w, o)
        lim = 1 if len(o) <= 6 else 2
        if d <= lim and (best is None or d < best[0]):
            best = (d, n)
    return best[1] if best else None


HEAD_L = re.compile(r'^\s*(\d{1,3})\s{2,}([A-Z][A-Z\.\s,\-\(\)\"\'\*]{8,})$')
HEAD_R = re.compile(r'^\s*([A-Z][A-Z\.\s,\-\(\)\"\'\*]{8,}?)\s{2,}(\d{1,3})\s*$')
KEYW = re.compile(r'REGIMENT|BATTERY|BATTALION|CAVALRY|ARTILLERY|INFANTRY|SHARPSHOOTERS|VOLUNTEER')

ENTRY = re.compile(r"^(?P<name>[A-Z][^\n—–]{1,70}?)\s*(?:[—–]|\s-\s)\s*(?P<rank>[^—–\n]{1,45}?)\s*(?:[—–]|\s-\s)\s*(?P<body>.*)$")
COMP = re.compile(r'^\s*C[O0]M\w{1,5}\W*([A-Z])\W*$')
UNASS = re.compile(r'^[A-Z\-\\.\s]{0,6}SIG[A-Z]{0,4}\s*$')


def vol_text(vol):
    ident = 'massachusettssol%d1931mass' % vol
    p = os.path.join(f.CACHE, ident + '_djvu.txt')
    return open(p, encoding='utf-8', errors='replace').read().split('\n')


def segment(vol, wanted):
    """wanted: dict ordinal-number -> unit_id for regiments; returns {unit_id: [(page, lineno, line)]}"""
    L = vol_text(vol)
    cur = None
    page = None
    out = {}
    lastpage = None
    for i, ln in enumerate(L):
        pg = txt = None
        m = HEAD_L.match(ln)
        if m:
            pg, txt = int(m.group(1)), m.group(2)
        else:
            m = HEAD_R.match(ln)
            if m:
                pg, txt = int(m.group(2)), m.group(1)
        if txt and KEYW.search(txt):
            n = ordinal_of(txt)
            if n is not None:
                T = txt.upper()
                if 'COMPANY' in T and 'SHARPSHOOTERS' in T:
                    cur = None
                else:
                    if 'CAVALRY' in T:
                        kind = 'CAV'
                    elif 'HEAVY' in T:
                        kind = 'HA'
                    elif 'BATTERY' in T or 'BATTLN' in T:
                        kind = 'BATMIL' if 'MILIT' in T else 'BAT'
                    else:
                        kind = 'INF'
                    cur = wanted.get((n, kind))
                    if cur is None and kind == 'INF':
                        cur = wanted.get(n)
            if lastpage is None or (lastpage - 3 <= pg <= lastpage + 6):
                lastpage = pg
            else:
                lastpage = (lastpage or 0) + 1
            page = lastpage
            continue
        if cur:
            out.setdefault(cur, []).append((page, i, ln))
    return out


def entries_of(lines, flat=False):
    """lines: [(page,lineno,text)] -> list of entry dicts."""
    ents = []
    co = None
    sec = 'fs'
    cur = None
    started = bool(flat)
    nextco = 'A'
    if flat:
        co, sec = 'BTY', 'battery'
    for page, i, ln in lines:
        s = ln.strip()
        if not s:
            continue
        mc = COMP.match(s)
        if mc:
            letter = mc.group(1)
            if letter not in 'ABCDEFGHIKLM':
                letter = nextco
            co = letter
            if letter in 'ABCDEFGHIKLM':
                k = 'ABCDEFGHIKLM'.index(letter)
                nextco = 'ABCDEFGHIKLM'[min(k + 1, 9)]
            sec = 'company'
            cur = None
            started = True
            continue
        if started and sec == 'company' and UNASS.match(s) and len(s) < 30:
            co, sec, cur = 'UNASSIGNED', 'unassigned', None
            continue
        low = re.sub(r'\s+', ' ', s.lower())
        if re.fullmatch(r'(field and staff|non[ -]?commissioned staff|non com\.? staff|band|three years.? service.*|three years|\(re-enlisted\)|\(veteran\)|infantry|.{0,3}field and staff.{0,3})', low):
            if 'field' in low:
                co, sec = 'FS', 'field_staff'
                started = True
            elif 'non' in low:
                co, sec = 'NCS', 'non_com_staff'
            elif low == 'band':
                co, sec = 'BAND', 'band'
            cur = None
            continue
        m = ENTRY.match(s)
        if m and started and co is not None and len(m.group('name')) < 60 and (not flat or re.match(r'(Res|Eres|Rcs|Age|age|Born)', m.group('body'))):
            cur = dict(co=co, sec=sec, page=page, line=i, name=m.group('name').strip(), rank=m.group('rank').strip(), text=m.group('body').strip())
            ents.append(cur)
        elif cur is not None:
            cur['text'] += ' ' + s
        # else: narrative or stray text
    return ents


if __name__ == '__main__':
    vol = int(sys.argv[1])
    wanted = {int(a.split(':')[0]): a.split(':')[1] for a in sys.argv[2:]}
    seg = segment(vol, wanted)
    for u, lines in seg.items():
        ents = entries_of(lines)
        from collections import Counter
        c = Counter(e['co'] for e in ents)
        print(u, len(lines), len(ents), dict(sorted(c.items(), key=lambda x: str(x[0]))))


def odd_heads(lines):
    out = []
    for page, i, ln in lines:
        s = ln.strip()
        if 3 < len(s) < 45 and sum(c.isupper() for c in s) >= 0.6 * sum(c.isalpha() for c in s) and re.search('[A-Z]{4}', s) and '—' not in s and not COMP.match(s):
            out.append((page, i, s))
    return out
