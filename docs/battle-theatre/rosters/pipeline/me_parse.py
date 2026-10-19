"""Parse the 20th Maine company returns (Adjutant General of Maine, Report for 1863, Appendix D, status 1 Dec 1863,
all changes since 1 Nov 1862) from the Internet Archive djvu.xml word coordinates."""
import json, re, statistics, sys
sys.path.insert(0, '.')
P = json.load(open('../cache/me_pages.json'))
FIRST, LAST = 791, 821   # 791 = Present Organization of Field and Staff, 792-821 = Cos A-K returns


def lines_of(words):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    lines, cur, last = [], [], None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if cur and yc - last > 15:
            lines.append(cur)
            cur = []
        cur.append(w)
        last = yc
    if cur:
        lines.append(cur)
    for l in lines:
        l.sort(key=lambda w: w[0])
    return lines


def clean(t):
    return re.sub(r'\s+', ' ', t).strip()


SECT = [('COMMISSIONED', 'officers'), ('SERGEANTS', 'sergeants'), ('CORPORALS', 'corporals'), ('MUSICIANS', 'musicians'),
        ('WAGONER', 'wagoner'), ('PRIVATES', 'privates'), ('Joined Co', 'joined')]
rows = []
company = None
for pn in range(FIRST, LAST + 1):
    words = P[str(pn)]
    lines = lines_of(words)
    # page company
    ptxt = ' '.join(w[4] for w in words[:60])
    m = re.search(r"Company\s+([A-K])\b", ptxt) or re.search(r"Company\s+([A-K])[,\.]", ptxt)
    if m and 'Return' in ptxt[:200] + ptxt:
        company = m.group(1)
    if pn == 791:
        company = 'FS'
    margin_pts = [l[0][0] for l in lines if 150 < l[0][0] < 340 and re.match(r"^[A-Z][a-z]", l[0][4])]
    ns = statistics.median(margin_pts) if margin_pts else 200
    # remark column anchor: x0 of words that start a remark
    rs_pts = [w[0] for w in words if w[0] > ns + 1000 and re.match(r'^(Disc|Died|Killed|Wd|Sick|Prom|Trans|Det|Desert|Absent|Pris|Missing|Tr\.|Furl|Wounded|Joined|Discharged)', w[4])]
    rs = statistics.median(rs_pts) if rs_pts else ns + 1290
    sc = (1490 - 200) / max(rs - ns, 500)
    off = 0
    first_page = 'Return of Captain' in re.sub(r'\s+', ' ', ptxt) or 'Return  of  Captain' in ptxt or pn == 791
    section = 'officers' if first_page else (rows[-1]['section'] if rows else 'officers')
    cur = None
    for l in lines:
        yc = (l[0][1] + l[0][3]) / 2
        if yc < 560:
            continue   # page header band
        cols = {'n': [], 'a': [], 'r': [], 'ms': [], 'd': [], 'm': []}
        for w in l:
            x = 200 + (w[0] - ns) * sc
            c = 'n' if x < 690 else 'a' if x < 770 else 'r' if x < 1090 else 'ms' if x < 1200 else 'd' if x < 1480 else 'm'
            cols[c].append(w[4])
        t = {k: clean(' '.join(v)) for k, v in cols.items()}
        full = clean(' '.join(w[4] for w in l))
        hit = None
        for key, name in SECT:
            if re.match(key, t['n'] or full, re.I) and not t['a'] and len(full) < 60:
                hit = name
        if hit:
            section = hit
            cur = None
            continue
        if re.search(r'Condensed|ADJUTANT|APPENDIX|Return of|Continued|Mustered|^Name', full) and not t['a']:
            continue
        first = l[0]
        is_start = (200 + (first[0] - ns) * sc) < 300 and re.match(r"^[A-ZÀ-ÿ][A-Za-z'\-]+", first[4]) is not None and (t['a'] or t['r'] or t['ms'] or len(t['n'].split()) >= 2)
        if is_start and (len(t['n']) > 2):
            cur = dict(page=pn, y=int(yc), co=company, section=section, name=t['n'], age=t['a'], res=t['r'], ms=t['ms'], mustered=t['d'], rem=t['m'], raw=[full])
            rows.append(cur)
        elif cur is not None and cur['page'] == pn:
            for k, kk in (('n', 'name'), ('a', 'age'), ('r', 'res'), ('ms', 'ms'), ('d', 'mustered'), ('m', 'rem')):
                if t[k]:
                    cur[kk] = clean(cur[kk] + ' ' + t[k])
            cur['raw'].append(full)
json.dump(rows, open('../cache/me20_rows.json', 'w'))
from collections import Counter
print(len(rows), Counter(r['co'] for r in rows))
print(Counter(r['section'] for r in rows))
