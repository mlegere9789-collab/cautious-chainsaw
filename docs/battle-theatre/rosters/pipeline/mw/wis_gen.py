"""Generalised Wisconsin parser (pilot wis_parse + wis_records + wis_classify, parameterised).
usage: wis_gen.py <pages.json> <first_page> <last_page> <regiment label> <out.json>
Column offsets (395/650/895) and the margin fit are those of the pilot; tuned on volume 1, checked on volume 2 in QA."""
import json, re, sys, statistics, difflib, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from common import parse_dates, GB_START, GB_END
from collections import Counter

pages_json, FIRST, LAST, REG, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
P = json.load(open(pages_json))


def lines_of(words):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    lines = []; cur = []; last = None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if last is not None and yc - last > 13:
            lines.append(cur); cur = []
        cur.append(w); last = yc if not cur[:-1] else (last * 0.5 + yc * 0.5)
    if cur:
        lines.append(cur)
    for l in lines:
        l.sort(key=lambda w: w[0])
    return lines


def clean(t):
    return re.sub(r'\s+', ' ', t).strip()


rows_all = []
for pn in range(FIRST, LAST + 1):
    words = P.get(str(pn))
    if not words:
        continue
    lines = lines_of(words)
    pts = []
    for l in lines:
        w0 = l[0]
        if w0[0] < 260 and ',' in ' '.join(x[4] for x in l[:3]) and re.match(r'^[A-Za-z]', w0[4]):
            pts.append(((w0[1] + w0[3]) / 2, w0[0]))
    if len(pts) >= 3:
        ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
        sl = []
        for i in range(len(pts)):
            for j in range(i + 1, len(pts)):
                if abs(ys[j] - ys[i]) > 300:
                    sl.append((xs[j] - xs[i]) / (ys[j] - ys[i]))
        slope = statistics.median(sl) if sl else 0
        b = statistics.median([xs[i] - slope * ys[i] for i in range(len(pts))])
    else:
        slope = -0.01
        b = statistics.median([p[1] for p in pts]) if pts else 160
    for l in lines:
        yc = (l[0][1] + l[0][3]) / 2
        ns = b + slope * yc
        cols = {'n': [], 'r': [], 'd': [], 'm': []}
        for w in l:
            x = w[0] - ns
            c = 'n' if x < 395 else 'r' if x < 650 else 'd' if x < 895 else 'm'
            cols[c].append(w[4])
        t = {k: clean(' '.join(v)) for k, v in cols.items()}
        first = l[0]
        is_start = (first[0] - ns) < 48 and re.match(r"^[A-Za-z']", first[4]) is not None and bool(re.search(r',', ' '.join(cols['n'])) or len(cols['n']) > 0 and (len(t['d']) > 3 or len(t['r']) > 2))
        rows_all.append(dict(page=pn, y=int(yc), start=is_start, **t, full=clean(' '.join(w[4] for w in l))))

comp_re = re.compile(r'COMPANY\W{0,4}([A-LI])\W{0,3}(?:\s|$)')
recs = []; cur = None; company = 'FS'; section = 'officers'
for r in rows_all:
    f = r['full']
    if re.search(r'ROSTER\s+OF\s+RECRUITS', f, re.I):
        company = 'REC'; section = 'enlisted'; cur = None; continue
    m = comp_re.search(f)
    if m and not re.search(r'[a-z]{4}', f.replace('COMPANY', '').replace('ROSTER', '').replace('VOLUNTEERS', '').replace('REMARKS', '').replace('RESIDENCE', '')[:60]) :
        company = m.group(1).upper().replace('L', 'I'); section = 'officers'; cur = None; continue
    if re.search(r'[A-Z]OSTER\s+OF\s+UNASSIGNED', f):
        company = 'UNASSIGNED'; section = 'enlisted'; cur = None; continue
    if re.search(r'FIELD\s+AND\s+STAFF', f, re.I):
        company = 'FS'; section = 'officers'; cur = None; continue
    if re.search(r'ENLISTED\s+MEN', f, re.I) or re.match(r'^\W*[A-Z]{2,8}STED\s+M\w{0,2}', f) or re.match(r'^\W*[A-Z\.\-\|]{2,10}\s+M[A-Z]{1,2}\W{0,3}\s*Enlist', f):
        section = 'enlisted'; cur = None
    if re.search(r'NON-?\s*COM', f, re.I) and not r['d']:
        section = 'nco'; cur = None; continue
    if re.search(r'ROSTER.{0,8}(WISCONSIN|VOLUNTEERS)|WISCONSIN.{0,3}VOLUNTEERS|REGIM.{0,3}\s*INFANTRY', f, re.I) or re.match(r'^[\W\d]*(NAME|RESIDENCE)\b', f, re.I) or re.match(r'^\W*\d{3}\W*(\bNAME.*)?$', f):
        continue
    if re.match(r'^(NAME|RESIDENCE|DATE|REMARKS)\W*(\s+(NAME|RESIDENCE|DATE|REMARKS)\W*)*$', f, re.I):
        continue
    if r['start']:
        cur = dict(page=r['page'], y=r['y'], company=company, section=section, name=r['n'], res=r['r'], date=r['d'], rem=r['m'], raw=[f])
        recs.append(cur)
    elif cur is not None and (r['page'] == cur['page'] or r['y'] < 500):
        if r['n'] and not r['r'] and not r['d'] and not r['m']:
            if re.match(r'^[A-Z][a-z]+s?\.?$|^(1st|2nd|Q\.)', r['n']) and len(r['n'].split()) <= 3 and not re.search(r',', r['n']) and (section != 'enlisted'):
                if re.search(r'(Captain|Lieut|Sergeant|Corporal|Musician|Wagoner|Private|Surgeon|Chaplain|Colonel|Major|Adjutant|Steward|Quarter|Com\.|Principal)', r['n'], re.I):
                    cur = None; continue
            cur['name'] += ' ' + r['n']
        else:
            cur['name'] += (' ' + r['n'] if r['n'] else '')
            cur['res'] += (' ' + r['r'] if r['r'] else '')
            cur['date'] += (' ' + r['d'] if r['d'] else '')
            cur['rem'] += (' ' + r['m'] if r['m'] else '')
        cur['raw'].append(f)

# AUDIT-FIX (MW audit, 30 Oct 2026): when the OCR dropped the "ENLISTED MEN" heading, a company stays in section 'officers' to its end and
# the enlistment dates of the enlisted men are discarded. The enlisted roll is alphabetical, the officer list is not: switch at the first run of
# 12 consecutive rows with non-decreasing surnames.
def _sur(r):
    return re.sub(r'[^a-z]', '', (r['name'].split(',')[0] if ',' in r['name'] else (r['name'].split()[-1] if r['name'].split() else '')).lower())[:6]
def _first(r):
    nm = r['name'].strip()
    return re.sub(r'[^a-z]', '', (nm.split(',')[0] if ',' in nm else nm.split(' ')[0]).lower())[:6]
for co in set(r['company'] for r in recs):
    idx = [i for i, r in enumerate(recs) if r['company'] == co and r['section'] == 'officers']
    if co in ('FS',) or len(idx) <= 30:
        continue
    keys = [_first(recs[i]) for i in idx]
    for j in range(len(idx) - 12):
        if all(keys[k] and keys[k] <= keys[k + 1] for k in range(j, j + 12)):
            # back up over earlier rows that continue the same sorted run
            while j > 0 and keys[j - 1] and keys[j - 1] <= keys[j]:
                j -= 1
            for i in idx[j:]:
                recs[i]['section'] = 'enlisted'
            print('AUDIT-FIX section repair', REG, co, 'rows switched to enlisted:', len(idx) - j, 'kept as officers:', j)
            break

KWS = ['Disch', 'Died', 'Killed', 'Deserted', 'Trans', 'Resigned', 'Dismissed', 'Detached', 'Mustered']
SEPKW = re.compile(r'^(Disch|Died|Killed|Deserted|Trans|Resigned|Dismissed)$', re.I)
out = []
for r in recs:
    nm = re.sub(r'(\s*[\.·,]\s*)+$', '', r['name'].strip())
    nm = re.sub(r'(\s\.)+', ' ', nm).strip(' .,')
    nm = re.sub(r'\s+', ' ', nm)
    rem = re.sub(r'\s+', ' ', r['rem']).strip()
    date = r['date']
    enl = parse_dates(date)
    enl_d = enl[0][0] if enl else None
    is_officer = r['section'] == 'officers' or (r['company'] == 'FS' and r['section'] != 'enlisted')
    if is_officer:
        enl_d = None
    if is_officer or enl_d is None:
        m = re.search(r'Enl\.?\s*(.*?)(;|$)', rem)
        if m:
            e2 = parse_dates(m.group(1))
            if e2:
                enl_d = e2[0][0]
    events = []
    for seg in re.split(r'[;:]', rem):
        seg = seg.strip(' .*')
        w = re.sub(r'[^A-Za-z]', '', seg.split(' ')[0]) if seg else ''
        if not w:
            continue
        best = None
        if w.lower().startswith('res'):
            best = (1.0, 'Resigned')
        for kw in KWS:
            rt = difflib.SequenceMatcher(None, w.lower(), kw.lower()).ratio()
            if rt >= 0.66 and (best is None or rt > best[0]):
                best = (rt, kw)
        if best:
            pd = parse_dates(seg)
            events.append((best[1], pd[0][0] if pd else None))
    gett = bool(re.search(r'[GC]ett|ettysb|Gcttys|Gettvs|Get\w*sb', rem, re.I))
    rd = parse_dates(rem)
    d13 = [d for d, _, _ in rd if GB_START <= d <= GB_END]
    sep_before = None; sep_unreadable = None
    for kw, d in events:
        if SEPKW.match(kw):
            if d is not None and d < GB_START:
                sep_before = (kw, d); break
            if d is None:
                sep_unreadable = sep_unreadable or kw
    xref = bool(re.match(r'^(See|Same as)\b', rem))
    drafted = bool(re.search(r'Dra[fl][tl]', rem))
    if enl_d and ((enl_d.year == 1861 and enl_d.month < 4) or enl_d.year < 1861):
        enl_d = None
    if xref:
        label, why = 'Duplicate-Xref', 'cross-reference row: ' + rem[:60]
    elif drafted and not (gett or d13):
        label, why = 'Unknown', 'Drafted man: draft year not legible enough to place him before or after the battle (no regiment-wide draftee rule applied for this regiment)'
    elif enl_d and enl_d >= GB_START:
        label, why = 'Absent-Documented', f'enlisted/rank date {enl_d} is after the battle'
    elif gett and not sep_before:
        label, why = 'Present-Documented', 'roster remark names Gettysburg: ' + rem[:80]
    elif d13 and not sep_before:
        label, why = 'Present-Documented', f'event dated {d13[0]} in remarks'
    elif sep_before:
        label, why = 'Absent-Documented', f'{sep_before[0]} dated {sep_before[1]} (before the battle)'
    elif sep_unreadable:
        label, why = 'Unknown', f'"{sep_unreadable}" event present but its date is not legible in the OCR layer'
    elif enl_d is None and re.search(r'\bVet\b|Ver\.', rem):
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: enlistment year lost to OCR; Vet. (re-enlisted Jan 1864) implies service before the battle; no earlier separation'
    elif enl_d is None and re.search(r'term\s*exp', rem, re.I):
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: enlistment year lost to OCR; muster-out by term expiry in 1864 implies 1861 enlistment; no earlier separation'
    elif enl_d is None:
        label, why = 'Unknown', 'enlistment year not recoverable from OCR layer; needs image check or muster roll'
    else:
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: on roll before battle; no separation dated before 1 Jul 1863 in remarks (roster has no June 1863 muster status)'
    if gett and label == 'Absent-Documented' and not xref:
        label, why = 'Present-Documented', 'roster remark names Gettysburg; the apparent before-battle date is an OCR year misread (CONFLICT flagged): ' + rem[:70]
    out.append(dict(co=r['company'], sec=r['section'], name_raw=r['name'], name=nm, res=re.sub(r'\s+', ' ', r['res']).strip(' .,'),
                    date_raw=date, enl=str(enl_d) if enl_d else None, remarks=rem, label=label, why=why, page=r['page']))
json.dump(out, open(OUT, 'w'), indent=0)
print(REG, len(out), dict(Counter(o['label'] for o in out)), dict(Counter(o['co'] for o in out)))
