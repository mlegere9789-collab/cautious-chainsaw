"""Generic coordinate table parser for the Indiana AG report (1866) and Illinois AG report (1900) rosters.
usage: tab_gen.py <family IN|IL> <pages.json> <first_page> <last_page> <label> <out.json> [skip_pages comma list]
Columns are found relative to the fitted left margin L(y) of the name column (tilt-corrected per page).
Output rows keep the printed text of each column and the page index (IA djvu page number).
Rows whose name the OCR lost (a date or remark is present, the name is not) are kept with an empty name (R-G7: no silent drops)."""
import json, re, sys, statistics, os
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cls_gen

fam, pages_json, FIRST, LAST, LABEL, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], sys.argv[6]
SKIP = set(int(x) for x in sys.argv[7].split(',')) if len(sys.argv) > 7 and sys.argv[7] else set()
P = json.load(open(pages_json))

CFG = {
    'IN': dict(name_end=460, res_end=800, d1_end=None, date_end=1085, lmin=60, lmax=330),
    'IL': dict(name_end=490, res_end=880, d1_end=1200, date_end=1480, lmin=60, lmax=400),
    'MN': dict(name_end=500, res_end=600, d1_end=880, date_end=1135, lmin=150, lmax=330),
}[fam]


def clean(t):
    return re.sub(r'\s+', ' ', t).strip()


def lines_of(words):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    lines = []; cur = []; last = None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if last is not None and yc - last > 15:
            lines.append(cur); cur = []
        cur.append(w); last = yc if not cur[:-1] else (last * 0.5 + yc * 0.5)
    if cur:
        lines.append(cur)
    for l in lines:
        l.sort(key=lambda w: w[0])
    return lines


def fit_margin(lines):
    pts = []
    for l in lines:
        w0 = l[0]
        if CFG['lmin'] <= w0[0] <= CFG['lmax'] and re.match(r'^[A-Za-z\'\.]', w0[4]) and len(l) >= 3 and any(x[0] > 800 for x in l):
            pts.append(((w0[1] + w0[3]) / 2, w0[0]))
    if len(pts) < 4:
        return None
    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
    mx = statistics.median(xs)
    keep = [i for i in range(len(pts)) if abs(xs[i] - mx) < 45]
    if len(keep) < 4:
        return None
    ys = [ys[i] for i in keep]; xs = [xs[i] for i in keep]
    sl = []
    for i in range(len(ys)):
        for j in range(i + 1, len(ys)):
            if abs(ys[j] - ys[i]) > 300:
                sl.append((xs[j] - xs[i]) / (ys[j] - ys[i]))
    slope = statistics.median(sl) if sl else 0.0
    b = statistics.median([xs[i] - slope * ys[i] for i in range(len(xs))])
    return slope, b


RANKHEAD = re.compile(r"^(First|Second|1st|2d|Sergeant|Sergeants|Corporals?|Musicians?|Principal|Wagoners?|Privates?|Band|Quartermasters?|Q\.\s*M|Commissary|Commis\.|Hospital|Sergt|Serg|Drum|Fife|Teamsters?|Blacksmiths?|Saddlers?|Farriers?|Buglers?|Chief|Veterans?|Recruits?|Colonels?|Lieut|Lieutenants?|Captains?|Majors?|Adjutants?|Chaplains?|Surgeons?|Assistant|Ass't|Asst|Regimental|Non|Field|Staff|Unassigned|Saddler|Artificer|Veterinary|Bugler|Commissary)", re.I)
HDR_TOKENS = set('date of name and rank residence or en listment remarks muster remarkb rkmarks remaeks rmarks eemarks remakks remabks reharks names mustered in out'.split())

rows = []; cur = None
company = 'FS'; rank = ''; year = None; carry = None; ordr = 'gf'; since_hdr = 99
lines_all = []
for pn in range(FIRST, LAST + 1):
    if pn in SKIP:
        continue
    words = P.get(str(pn))
    if not words:
        continue
    lines = lines_of(words)
    fm = fit_margin(lines)
    page_lines = []
    for l in lines:
        yc = (l[0][1] + l[0][3]) / 2
        if fm:
            L = fm[1] + fm[0] * yc
        elif carry:
            L = carry
        else:
            L = 160
        if fm:
            carry = L
        cols = {'n': [], 'r': [], 'd': [], 'd2': [], 'm': []}
        for w in l:
            x = w[0] - L
            if x < CFG['name_end']:
                c = 'n'
            elif x < CFG['res_end']:
                c = 'r'
            elif CFG['d1_end'] and x < CFG['d1_end']:
                c = 'd'
            elif CFG['d1_end'] and x < CFG['date_end']:
                c = 'd2'
            elif x < CFG['date_end']:
                c = 'd'
            else:
                c = 'm'
            cols[c].append(w[4])
        t = {k: clean(' '.join(v)) for k, v in cols.items()}
        full = clean(' '.join(w[4] for w in l))
        first_x = l[0][0] - L
        page_lines.append(dict(page=pn, y=int(yc), full=full, fx=int(first_x), **t))
    if fam == 'IL':
        nd = sum(1 for q in page_lines if (q['d'] and cls_gen.find_dates(q['d'], 1862)) or (q['d2'] and cls_gen.find_dates(q['d2'], 1862)))
        hs = any(re.search(r'Residence|Remarks|rank or|listment', q['full']) for q in page_lines)
        if not ((nd >= 3 and hs) or nd >= 8):
            page_lines = []
    lines_all.extend(page_lines)

comp_re = re.compile(r'(?:COMPANY|C[O0]MPANY)\W{0,4}([A-M])(?![A-Za-z])')
comp_any = re.compile(r'(?:ENLISTED|STED)\s+MEN\s+O[FP]\s+C[O0]MPANY|C[O0]MPANY\s+ENLISTED\s+MEN')
SEQ = 'ABCDEFGHIKLM'
for r in lines_all:
    f = r['full']
    # page furniture: running heads, page numbers
    if re.fullmatch(r"[\W\d]*(?:[A-Z\-' ]{3,}\s+)?(?:INFANTRY|CAVALRY|REGIMENT|REPORT|VOLUNTEERS)[\W\dA-Z]*", f) and not re.search(r'[a-z]{3}', f):
        if not (comp_re.search(f) or comp_any.search(f)) and not re.search(r'UN\s*ASSIGNED|FIELD|STAFF|RECRUIT', f, re.I):
            continue
    if re.search(r'^[\W\d]*(Vol\.?\s*[IVX]+|VOLUME)', f):
        continue
    toks = [re.sub(r'[^a-z]', '', x.lower()) for x in f.split()]
    if toks and all((t in HDR_TOKENS or t == '' or len(t) <= 1 or re.fullmatch(r'18\d\d|\d+', t)) for t in toks) and (any(t in HDR_TOKENS for t in toks)):
        ym = re.search(r'\b1[8S][0-9OG(]?[0-9]\b', r['d'] + ' ' + f)
        if ym and fam == 'IN':
            dg = ym.group(0)[-1]
            if dg in '12345':
                year = 1860 + int(dg)
        continue
    since_hdr += 1
    if fam == 'MN':
        if re.search(r'Continued|Contiuued|Coutinued', f):
            continue
        mh = re.match(r'^\W*[RK]OST\w*\W+(?:OF\W+)?C\w*P\w*\W+([A-K])\W*$', f)
        if mh:
            company = mh.group(1); rank = ''; ordr = 'gf'; cur = None; since_hdr = 0; continue
        if re.fullmatch(r'\W*COMPANY\W+[A-M]\W*', f):
            continue
        if re.fullmatch(r'\W*OFFICERS\W*', f):
            if company == 'FS':
                company = 'A'
            elif since_hdr > 12:
                company = SEQ[min(SEQ.index(company) + 1, len(SEQ) - 1)]
            rank = ''; ordr = 'gf'; cur = None; since_hdr = 0; continue
        if re.fullmatch(r'\W*ENLISTED\s+MEN\W*', f):
            rank = 'ENLISTED MEN'; ordr = 'sf'; cur = None; continue
        if re.search(r'FIELD\s+AND\s+STAFF', f):
            company = 'FS'; rank = ''; ordr = 'gf'; cur = None; continue
        if re.fullmatch(r'[\W\d]*(THE\s+)?FIRST\s+REGIMENT[\W\dA-Z]*', f):
            continue
    m = comp_re.search(f)
    if comp_any.search(f) and not re.search(r'[a-z]{3,}', f):
        company = SEQ[min(SEQ.index(company) + 1, len(SEQ) - 1)] if (company in SEQ and len(company) == 1) else 'A'
        rank = ''; year = None; cur = None; continue
    if m and (re.search(r'ENLISTED|MEN OF|ROSTER|OFFICERS', f) or re.fullmatch(r'\W*COMPANY\W+[A-M]\W*', f)) and not re.search(r'[a-z]{3,}', f):
        company = m.group(1); rank = ''; year = None; cur = None; continue
    if re.search(r'COMPANY', f) and re.fullmatch(r'\W*COMPANY\W*', f):
        company = SEQ[min(SEQ.index(company) + 1, len(SEQ) - 1)] if (company in SEQ and len(company) == 1) else 'A'
        rank = ''; year = None; cur = None; continue
    if re.search(r'UN\s*ASSIGNED|\(?JN\s*ASSIGNED', f, re.I) and not re.search(r'[a-z]{3,}', f.replace('ASSIGNED', '')):
        company = 'UNASSIGNED'; rank = ''; cur = None; continue
    if re.search(r'FIELD\s+AND\s+STAFF', f, re.I) and not re.search(r'[a-z]{4,}', f):
        company = 'FS'; rank = ''; cur = None; continue
    if re.search(r'NON-?\s*COMMISSIONED\s+STAFF', f, re.I) and not re.search(r'[a-z]{4,}', f):
        company = 'NCS'; rank = ''; cur = None; continue
    if fam == 'IN' and re.fullmatch(r'\W*1[8S][0-9OG(]?[0-9]\W*', r['d']) and not r['n'] and not r['m']:
        dgt = re.sub(r'\D', '', r['d'])[-1:]
        if dgt in '12345':
            year = 1860 + int(dgt)
        continue
    # rank headings (name column only)
    if r['n'] and not r['r'] and not r['d'] and not r['d2'] and not r['m'] and RANKHEAD.match(r['n']) and not re.search(r',', r['n']) and len(r['n'].split()) <= 4 and r['fx'] > 20 and not re.search(r'\.\s*\w', r['n'].rstrip('. ')):
        rank = re.sub(r'[^A-Za-z\' \-\.]', '', r['n']).strip(' .')
        cur = None
        continue
    has_date = bool(cls_gen.find_dates(r['d'], 1861)) if r['d'] else False
    if fam == 'IL' and r['d2'] and not has_date:
        has_date = bool(cls_gen.find_dates(r['d2'], 1861))
    named_start = bool(r['n']) and r['fx'] < 70 and bool(r['d'] or r['d2'] or r['r'] or r['m'] or re.search(r',', r['n'])) and re.match(r"^[A-Za-z'\.\*\-•]", r['n'])
    nameless_start = (not r['n']) and has_date and not r['m'][:0]
    if named_start or nameless_start:
        cur = dict(page=r['page'], y=r['y'], company=company, rank=rank, ordr=ordr, name=r['n'], res=r['r'], date=r['d'], date2=r['d2'], rem=r['m'], year=year, raw=[r['full']])
        rows.append(cur)
    elif cur is not None and (r['n'] or r['r'] or r['d'] or r['d2'] or r['m']):
        if r['n']:
            cur['name'] += ' ' + r['n']
        if r['r']:
            cur['res'] += ' ' + r['r']
        if r['d']:
            cur['date'] += ' ' + r['d']
        if r['d2']:
            cur['date2'] += ' ' + r['d2']
        if r['m']:
            cur['rem'] += ' ' + r['m']
        cur['raw'].append(r['full'])

json.dump(rows, open(OUT, 'w'), indent=0)
print(LABEL, len(rows), 'nameless', sum(1 for x in rows if not x['name'].strip()), dict(Counter(x['company'] for x in rows)), 'ranks', dict(Counter(x['rank'] for x in rows).most_common(5)))
