import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""Parse Stryker, Record of Officers and Men of New Jersey (1876): IA newjerseyincivil01recorich / 02recorich, from djvu word boxes.
Columns: NO. | NAME | RANK | ENROLLED | COM. or MUST'D IN | PERIOD | MUST'D OUT / REMARKS.
Output: CACHE/nj_rows.json"""
import json, re, collections
from ojc_common import *
from showpage import lines_of

OFF = 6   # djvu index = printed page + 6 in volume 1 (verified on 480 pages)
# (unit_id, label, first printed page, last printed page, volume)
UNITS = [
    ('U-1NJ-1', '1st New Jersey Infantry', 68, 101, 1),
    ('U-2NJ', '2nd New Jersey Infantry', 102, 149, 1),
    ('U-3NJ', '3rd New Jersey Infantry', 150, 181, 1),
    ('U-4NJ', '4th New Jersey Infantry', 182, 227, 1),
    ('U-5NJ', '5th New Jersey Infantry', 228, 266, 1),
    ('U-6NJ', '6th New Jersey Infantry', 267, 299, 1),
    ('U-7NJ', '7th New Jersey Infantry', 300, 365, 1),
    ('U-8NJ', '8th New Jersey Infantry', 366, 429, 1),
    ('U-11NJ', '11th New Jersey Infantry', 542, 584, 1),
    ('U-12NJ', '12th New Jersey Infantry', 585, 627, 1),
    ('U-13NJ', '13th New Jersey Infantry', 628, 661, 1),
    ('U-23NJ', '23rd New Jersey Infantry', 779, 798, 1),
]
VOL = {1: 'newjerseyincivil01recorich', 2: 'newjerseyincivil02recorich'}
_P = {}


def pages_of(vol):
    if vol not in _P:
        P = json.load(open(os.path.join(CACHE, VOL[vol] + '.pages.json')))
        _P[vol] = {k: [[w[0], w[1], w[2], w[3], w[4].strip()] for w in v] for k, v in P.items()}
    return _P[vol]


def txt(ws):
    return re.sub(r'\s+', ' ', ' '.join(w[4] for w in ws)).strip()


SEQ = list('ABCDEFGHIKLM')
company_inferred = []
HEAD = re.compile(r'^(?:[A-Z][A-Z\.\s\-\']{3,60})$')
SECTION_WORDS = re.compile(r'(DIED|DESERTED|TRANSFERRED|DISCHARGED|KILLED|MUSTERED|MISSING|NOT ACCOUNTED|COMMISSIONED|UNKNOWN|ENLISTED|RECRUITS|SUBSTITUTES|PROMOTED|RESIGNED|DISMISSED|WOUNDED|PRISONERS|VETERANS|FIELD|STAFF|OFFICERS)', re.I)


def parse_range(vol, first_idx, last_idx, uid, lab, ordinal_re, fixed=None):
    P = pages_of(vol)
    rows = []
    company, section = fixed, ''
    cur = None
    for pn in range(first_idx, last_idx + 1):
        words = P.get(str(pn))
        if not words:
            continue
        lines = lines_of(words)
        ptxt = ' '.join(w[4] for w in words[:60])
        if re.search(r'RECAPITULATION', ' '.join(w[4] for w in words)) and not re.search(r'NAME\.', ' '.join(w[4] for w in words)):
            if cur: rows.append(cur); cur = None
            continue
        # name_x0: from NAME. header word
        nx = None
        for l in lines:
            for w in l:
                if re.match(r'^NAME\.?$', w[4], re.I) and 150 < w[0] < 450:
                    nx = w[0] - 123
                    break
            if nx: break
        if nx is None:
            # fall back: median x of first letter-led token in lines that contain a rank/date column word
            nx = getattr(parse_range, 'last_nx', 150)
        parse_range.last_nx = nx
        for l in lines:
            y = (l[0][1] + l[0][3]) / 2
            full = txt(l)
            if y < 330 and re.search(r'OFFICERS\s+AND\s+MEN|IN\s+THE\s+WAR|REBELLION', full) and len(full) < 90:
                continue
            m = re.search(r'(Compan\w*|ompany|Field\s+and\s+Staff|Non.?commissioned\s+Staff|Regimental\s+Band|Band|Recruits?)\W{0,3}\s*([A-Z])?[a-z]?\W{0,3}\s*(?:' + ordinal_re + r')\s+[RK]egiment', full, re.I)
            if m and len(full) < 100 and not fixed:
                if cur: rows.append(cur); cur = None
                g = m.group(1).lower()
                if g.startswith('compan') or g == 'ompany':
                    L = (m.group(2) or '').upper()
                    prevL = company if company in SEQ else None
                    exp = SEQ[SEQ.index(prevL) + 1] if prevL and SEQ.index(prevL) + 1 < len(SEQ) else ('A' if prevL is None else None)
                    if L in SEQ and (prevL is None or SEQ.index(L) > SEQ.index(prevL)) and (L == exp or prevL is None or SEQ.index(L) - SEQ.index(prevL) <= 2):
                        company = L
                    elif exp:
                        company = exp
                        company_inferred.append((pn, L, exp))
                    else:
                        company = L or company
                else:
                    company = 'FS' if g.startswith('field') else 'NCS' if g.startswith('non') else 'BAND' if 'band' in g else 'REC'
                section = ''
                continue
            if re.search(r'^(NO\.|NAME\.|RANK\.|ENROLLED|ENLISTED)', full) or re.search(r'MUST.?D\s+(IN|OUT)|PERIOD|REMARKS\.?|COM\.', full) and y < 600 and len(full) < 140:
                continue
            if company is None:
                continue
            toks = sorted(l, key=lambda w: w[0])
            rel = [(w[0] - nx, w) for w in toks]
            body = [(r, w) for r, w in rel if r >= -30]
            nameT = [w for r, w in body if -30 <= r < 330]
            rankT = [w for r, w in body if 330 <= r < 510]
            enrT = [w for r, w in body if 510 <= r < 700]
            musT = [w for r, w in body if 700 <= r < 880]
            perT = [w for r, w in body if 880 <= r < 1140]
            remT = [w for r, w in body if r >= 1140]
            nt = txt(nameT)
            # section heading line: caps only, in the name/rank area, nothing in remark column or date columns
            if nt and not remT and not enrT and not musT and HEAD.match(txt(nameT + rankT)) and SECTION_WORDS.search(txt(nameT + rankT)) and not re.search(r'[a-z]', txt(nameT + rankT)):
                if cur: rows.append(cur); cur = None
                section = txt(nameT + rankT)
                continue
            has_alpha_name = bool(nt) and bool(re.search(r'[A-Za-z]', nt))
            numT = [w for r, w in rel if -95 <= r < -20 and re.fullmatch(r'\d{1,3}', w[4])]
            if not has_alpha_name and numT and (enrT or musT or remT or perT):   # AUDIT: a row-number in the NO. column opens a row even when the name and date cells are missing from the OCR (remarks were being joined to the row above)
                if cur: rows.append(cur)
                cur = dict(unit=uid, regiment=lab, company=company, section=section, name='', rank=txt(rankT), enr=txt(enrT), mus=txt(musT),
                           per=txt(perT), rem=txt(remT), page=pn, y=int(y), noname=True)
                continue
            if has_alpha_name and (rankT or enrT or musT or perT or remT or len(nameT) >= 2):
                if cur: rows.append(cur)
                cur = dict(unit=uid, regiment=lab, company=company, section=section, name=nt, rank=txt(rankT), enr=txt(enrT), mus=txt(musT),
                           per=txt(perT), rem=txt(remT), page=pn, y=int(y))
            elif cur is not None and (remT or (not nt)):
                if remT: cur['rem'] = (cur['rem'] + ' ' + txt(remT)).strip()
                if perT and not cur['per']: cur['per'] = txt(perT)
                if enrT and not cur['enr']: cur['enr'] = txt(enrT)
                if musT and not cur['mus']: cur['mus'] = txt(musT)
                if rankT and not cur['rank']: cur['rank'] = txt(rankT)
    if cur: rows.append(cur)
    return rows


ORDS = {'U-1NJ-1': 'First', 'U-2NJ': 'Second', 'U-3NJ': 'Third', 'U-4NJ': 'Fourth', 'U-5NJ': 'Fifth', 'U-6NJ': 'Sixth', 'U-7NJ': 'Seventh', 'U-8NJ': 'Eighth',
        'U-11NJ': 'Eleventh', 'U-12NJ': 'Twelfth', 'U-13NJ': 'Thirteenth', 'U-23NJ': r'Twenty.third'}

EXTRA = [('U-1NJ-CAV', '1st New Jersey Cavalry', 1180 - 946, 1254 - 946, 2, 'First', None),
         ('U-ART-B1NJ', 'Battery B, 1st New Jersey Artillery', 1380 - 946, 1390 - 946, 2, 'First', 'B')]

if __name__ == '__main__':
    allrows = []
    for uid, lab, a, b, vol in UNITS:
        rs = parse_range(vol, a + OFF, b + OFF, uid, lab, ORDS[uid])
        c = collections.Counter(r['company'] for r in rs)
        print(uid, len(rs), sorted(c.items()))
        allrows += rs
    json.dump(allrows, open(os.path.join(CACHE, 'nj_rows.json'), 'w'))

    for uid, lab, a, b, vol, ordn, fixed in EXTRA:
        rs = parse_range(vol, a, b, uid, lab, ordn, fixed)
        c = collections.Counter(r['company'] for r in rs)
        print(uid, len(rs), sorted(c.items()))
        allrows += rs
    json.dump(allrows, open(os.path.join(CACHE, 'nj_rows.json'), 'w'))
    print('inferred company letters:', company_inferred)
