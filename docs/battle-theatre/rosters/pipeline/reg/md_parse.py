"""Parse the roster tables of 'History and Roster of Maryland Volunteers, War of 1861-5' (1898, IA historyrosterofm01mary)
from the djvu.xml word coordinates.  Writes work/md_rows.json (all rows, all regiments) - the per-unit CSVs are cut from it.

Columns on a roster page: NAME | RANK | DATE OF ENLISTMENT OR MUSTER IN | DATE OF MUSTER OUT OR DISCHARGE | REMARKS.
A record is anchored by its dated line (the line carrying the rank and the dates); name words printed on the lines above
it (a wrapped surname) belong to it; remark-only lines below it are continuation of its remarks.
Run: python -I -X utf8 md_parse.py
"""
import json, re, os, sys, ctypes
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG', 'work')
SUF = os.environ.get('MD_SCAN', '')
P = json.load(open(os.path.join(W, 'md%s_pages.json' % SUF)))

MON = re.compile(r'^(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sep|Sept|Oct|Nov|Dec|Jau|Fob|Maj)[a-z]*[\.,]?$', re.I)
RANK = re.compile(r'^(Private|Sergt|Sergeant|Corpl|Corporal|Lieut|Capt|Captain|Colonel|Musician|Bugler|Farrier|Saddler|Blacksmith|Wagoner|Major|Surgeon|Hospital|Chaplain|Commissary|Quartermaster|Adj|Ordnance|Principal|Teamster|Cook|Artificer|Saddlr|Chief|Q\.|R\.|Com|Asst)', re.I)


def lines_of(words, tol=14):
    rows = []
    for x0, y0, x1, y1, t in sorted(words, key=lambda a: (a[1], a[0])):
        t = t.strip()
        if not t:
            continue
        if rows and abs(rows[-1][0] - y0) <= tol:
            rows[-1][1].append((x0, t))
        else:
            rows.append([y0, [(x0, t)]])
    return [(y, sorted(r)) for y, r in rows]


def header_of(words):
    if not words:
        return ''
    sc = scale_of(words)
    y0 = min(w[1] for w in words)
    band = [w for w in words if w[1] <= y0 + 70 * sc]
    txt = ' '.join(t for _, _, _, _, t in sorted(band, key=lambda a: a[0]))
    return re.sub(r'\s+', ' ', txt)


HDR = re.compile(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|\d+(?:st|nd|rd|th|d))\s+Reg\w*\.?\s*,?\s*(Eastern\s+Shore|Potomac\s+Home\s+Brigade)?\s*,?\s*(Infantry|Cavalry)?', re.I)


def scale_of(words):
    xs = sorted(w[0] for w in words)
    return max(1.0, xs[int(len(xs) * 0.99)] / 1900.0) if xs else 1.0


def parse_page(pg, words):
    sc = scale_of(words)
    ln = lines_of(words, 14 * sc)
    ymin = min(w[1] for w in words) if words else 0
    hdr = header_of(words)
    # drop header band: everything above the first table header line (DATE / ENLISTMENT / REMARKS) or first dated line
    rank_xs = [x for y, r in ln for x, t in r if RANK.match(t) and x > 250 * sc]
    date_xs = []
    for y, r in ln:
        for x, t in r:
            if MON.match(t) and x > 250 * sc:
                date_xs.append(x)
    if not date_xs:
        return hdr, []
    date_xs.sort()
    lo = date_xs[max(0, len(date_xs) // 20)]
    cl = [x for x in date_xs if abs(x - lo) <= 50 * sc]
    d1 = sorted(cl)[len(cl) // 2]
    rank_x = sorted(rank_xs)[len(rank_xs) // 2] if rank_xs else d1 - 210 * sc
    rank_lo = rank_x - 60 * sc
    rem_x = d1 + 440 * sc
    recs = []
    pending_name = []
    cur = None
    for y, r in ln:
        if y < min(ymin + 185 * sc, 300 * sc):
            continue
        name_t = [t for x, t in r if x < rank_lo]
        rank_t = [t for x, t in r if rank_lo <= x < d1 - 25 * sc]
        date_t = [t for x, t in r if d1 - 25 * sc <= x < rem_x]
        date1_t = [t for x, t in r if d1 - 25 * sc <= x < d1 + 200 * sc]
        date2_t = [t for x, t in r if d1 + 200 * sc <= x < rem_x]
        rem_t = [t for x, t in r if x >= rem_x]
        up = ' '.join(t for _, t in r).upper()
        if not re.search(r'[a-z]', ' '.join(t for _, t in r)) and not date_t and not (rank_t and RANK.match(rank_t[0])) and y < ymin + 900 * sc:
            continue
        if any(k in up for k in ('ENLISTED MEN', 'COMMISSIONED OFF', 'NON-COMMISSIONED', 'REMARKS', 'MUSTER OUT', 'ENLISTMENT', 'DISCHARGE')) and not date_t:
            if 'ENLISTED' in up or 'COMMISSIONED' in up:
                pending_name = []
                cur = None
            continue
        YR = re.compile(r'^(1|I|l)?[S8]\d\d$|^18\w\w\.?$|^1[S8]\w\w$|^\d{4}[,.]?$')
        if cur is not None and (date1_t or date2_t):
            # a year printed on a wrapped line belongs to the previous record's incomplete date
            for col, key in ((date1_t, 'date1'), (date2_t, 'date2')):
                yrs = [t for t in col if YR.match(t.strip(',.'))]
                if yrs and col == [t for t in col] and len(yrs) == len(col) and cur[key].strip().endswith(','):
                    cur[key] += ' ' + ' '.join(yrs)
                    cur['dates'] += ' ' + ' '.join(yrs)
                    for t in yrs:
                        col.remove(t)
                        date_t.remove(t)
        if not date_t and not rank_t and not rem_t and not name_t:
            continue
        if date_t and not name_t and not rank_t and not pending_name and cur is not None:
            cur['dates'] += ' ' + ' '.join(date_t)
            cur['date1'] += ' ' + ' '.join(date1_t)
            cur['date2'] += ' ' + ' '.join(date2_t)
            if rem_t:
                cur['remarks'] += ' ' + ' '.join(rem_t)
            continue
        if date_t or (rank_t and RANK.match(rank_t[0])):
            cur = {'name_parts': pending_name + name_t, 'rank': ' '.join(rank_t), 'dates': ' '.join(date_t), 'date1': ' '.join(date1_t), 'date2': ' '.join(date2_t), 'remarks': ' '.join(rem_t), 'y': y, 'page': pg}
            recs.append(cur)
            pending_name = []
        elif name_t and not rem_t:
            if cur is not None and not rank_t and pending_name == [] and False:
                pass
            pending_name.extend(name_t)
            # a name-only line that completes a name with no date line (OCR lost) is kept as a pending name until a dated line arrives
            if rank_t and cur:
                pass
        elif rem_t and cur is not None and not name_t:
            cur['remarks'] += ' ' + ' '.join(rem_t)
            if rank_t:
                cur['rank'] += ' ' + ' '.join(rank_t)
        elif rank_t and cur is not None and not name_t:
            cur['rank'] += ' ' + ' '.join(rank_t)
        else:
            if name_t:
                pending_name.extend(name_t)
            if rem_t and cur is not None:
                cur['remarks'] += ' ' + ' '.join(rem_t)
    return hdr, recs


def main():
    out = []
    stats = {}
    for pg in sorted(P, key=int):
        w = P[pg]
        hdr, recs = parse_page(pg, w)
        m = re.search(r'Company\s+([A-K])\b', hdr)
        isroster = bool(re.search(r'Company|Field\s+and\s+Staff|Unassigned|Non-?[Cc]ommissioned', hdr)) and bool(recs)
        if not isroster:
            continue
        h = HDR.search(hdr)
        for r in recs:
            r['hdr'] = hdr[:140]
            r['company'] = m.group(1) if m else ('FS' if re.search('Field', hdr, re.I) else ('UA' if 'Unassigned' in hdr else ''))
            out.append(r)
    json.dump(out, open(os.path.join(W, 'md%s_rows.json' % SUF), 'w'))
    print(len(out), 'rows')


if __name__ == '__main__':
    main()
