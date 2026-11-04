import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""Parse the Official Roster of the Soldiers of the State of Ohio (1886-95) from djvu word boxes.
Columns: Names | Rank | Age | Date of entering the service | Period | Remarks.
Usage: oh_parse.py  -> CACHE/oh_rows.json"""
import json, re, collections
from ojc_common import *
from showpage import lines_of

VOLS = {2: 'bwb_W9-BTC-637', 7: 'officialrosterof07ohio', 3: 'ohiowarroster03howerich', 5: 'ohiowarroster05howerich', 6: 'ohiowarroster06howerich', 8: 'ohiowarroster08howerich',
        10: 'ohiowarroster10howerich', 11: 'officialrosterof11ohio'}
ORD = {4: 'FOURTH|FOURTU', 5: 'FIFTH|FIRTH|FIFTII|FIRREENTH|FIFTU', 7: 'SEVENTH|SEVENTO|SEVENTII|SEVENTU', 8: 'EIGHTH|EIGHTII|EIGHTU', 25: 'TWENTY.FIFTH', 29: 'TWENTY.NINTH', 55: 'FIFTY.FIFTH', 61: 'SIXTY.FIRST', 66: 'SIXTY.SIXTH',
       6: 'SIXTH|SIXTU', 1: 'FIRST|IST|1ST|FIRSI', 73: 'SEVENTY.THIRD', 75: 'SEVENTY.FIFTH', 82: 'EIGHTY.SECOND', 107: 'XXXX'}
# unit_id, label, volume, regiment number, kind
UNITS = [
    ('U-4OH', '4th Ohio Infantry', 2, 4, 'inf'), ('U-5OH', '5th Ohio Infantry', 2, 5, 'inf'), ('U-7OH', '7th Ohio Infantry', 2, 7, 'inf'),
    ('U-8OH', '8th Ohio Infantry', 2, 8, 'inf'), ('U-25OH', '25th Ohio Infantry', 3, 25, 'inf'), ('U-29OH', '29th Ohio Infantry', 3, 29, 'inf'),
    ('U-55OH', '55th Ohio Infantry', 5, 55, 'inf'), ('U-61OH', '61st Ohio Infantry', 5, 61, 'inf'), ('U-66OH', '66th Ohio Infantry', 5, 66, 'inf'),
    ('U-73OH', '73rd Ohio Infantry', 6, 73, 'inf'), ('U-75OH', '75th Ohio Infantry', 6, 75, 'inf'), ('U-82OH', '82nd Ohio Infantry', 6, 82, 'inf'),
    ('U-107OH', '107th Ohio Infantry', 7, 107, 'inf'),
    ('U-6OH-CAV', '6th Ohio Cavalry', 11, 6, 'cav'),
    ('U-ART-1OH', '1st Ohio Light Artillery (all batteries; H, I, K, L kept)', 10, 1, 'art'),
]
_P = {}
SCALE = {2: 0.79}
PAGE_RANGES = {'U-ART-1OH': (379, 458), 'U-6OH-CAV': (325, 382), 'U-4OH': (108, 140), 'U-5OH': (141, 192), 'U-7OH': (220, 255), 'U-8OH': (256, 282)}


def pages_of(vol):
    if vol not in _P:
        P = json.load(open(os.path.join(CACHE, VOLS[vol] + '.pages.json')))
        _P[vol] = {k: [[w[0], w[1], w[2], w[3], w[4].strip()] for w in v] for k, v in P.items()}
    return _P[vol]


def txt(ws):
    return re.sub(r'\s+', ' ', ' '.join(w[4] for w in ws)).strip()


def header_key(words):
    top = sorted([w for w in words if w[1] < 700], key=lambda w: (w[1] // 45, w[0]))
    return re.sub(r'[^A-Z0-9\.\-]', '', ' '.join(w[4] for w in top).upper())


def unit_pages(vol, ordre, kindword='VOLUNTEERINFANTRY'):
    """First page whose running header names this regiment, then forward until a header naming a different regiment appears."""
    import difflib
    P = pages_of(vol)
    keys = {int(k): header_key(P[k]) for k in P}
    pat = re.compile(r'(?<![A-Z0-9\-])(' + ordre + r')\.?-?REGIMENT')
    start = None
    for k in sorted(keys):
        if pat.search(keys[k]) or re.search(r'(?<![A-Z0-9\-])(' + ordre + r')REGIMENT', keys[k]):
            start = k; break
    if start is None:
        return []
    mine = re.sub(r'REGIMENT.*', '', pat.search(keys[start]).group(0) if pat.search(keys[start]) else '').replace('.', '')
    mynum = None
    mm = re.search(r'(\d+)(?:ST|ND|RD|TH|D)\|?', ordre)
    def other(h):
        m = re.search(r'([A-Z0-9\-\.]{3,25}?)\.?-?REGIMENT(?:OHIO|VOL)', h)
        if not m or pat.search(h):
            return None
        word = m.group(1).replace('.', '')
        if len(word) < 3:
            return None
        nm = re.fullmatch(r'(\d+)(?:ST|ND|RD|TH|D)', word)
        if nm and mm and nm.group(1) == (re.search(r'\|(\d+)\(', ordre).group(1) if re.search(r'\|(\d+)\(', ordre) else None):
            return None
        if difflib.SequenceMatcher(None, word, mine).ratio() >= 0.85:
            return None
        return word
    end = start
    ks = sorted(keys)
    for k in range(start + 1, max(keys) + 1):
        w = other(keys.get(k, ''))
        if w:
            # confirm with the next header-bearing page
            conf = False
            for j in range(k + 1, min(k + 5, max(keys) + 1)):
                w2 = other(keys.get(j, ''))
                if w2 and difflib.SequenceMatcher(None, w, w2).ratio() > 0.7:
                    conf = True; break
                if re.search(r'REGIMENT(?:OHIO|VOL)', keys.get(j, '')) and not w2:
                    break
            if conf:
                break
        end = k
    return list(range(start, end + 1))


SEQ = list('ABCDEFGHIKLM')
missing_head = set()
inferred = []
import lab as labmod
_MONRE = re.compile(r"^(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]{0,6}\.?,?$", re.I)


def is_month(t):
    t2 = t.strip('.,;:' + chr(39) + chr(34))
    return bool(_MONRE.match(t)) or t2.lower() in labmod.OCRM


NUMTOK = re.compile(r'^\d{1,2}$')


def parse_pages(vol, pns, uid, lab):
    P = pages_of(vol)
    rows = []
    cur = None
    company, section = 'FS', 'field-staff'
    nx_last = 77
    sc = SCALE.get(vol, 1.0)
    seen_mustered = False
    for pn in pns:
        words = P[str(pn)]
        lines = lines_of(words)
        nx = None
        for l in lines:
            for w in l:
                if re.match(r'^Names?\.?$', w[4]) and 150 < w[0] < 420:
                    nx = w[0] - 152 * sc; break
            if nx is not None: break
        if nx is None:
            nx = nx_last
        nx_last = nx
        for l in lines:
            y = (l[0][1] + l[0][3]) / 2
            full = txt(l)
            if y < 340 and re.search(r'REGIMENT|INFANTRY|VOLUNTEER|ROSTER|CAVALRY|ARTILLERY|BATTERY', full.upper()) and not re.search(r'COMPANY', full.upper()) and not re.fullmatch(r'\W*BATTERY\W{0,3}\s*[A-Z]{1,2}\W*', full):
                continue
            if re.fullmatch(r'\d{1,3}', full) and y < 340:
                continue
            hm = re.fullmatch(r'\W*(?:COMPANY|BATTERY|COMPANV|COMPAN)\W{0,3}\s*([A-Z!1\|]{1,2})?\W*', full)
            if hm:
                seen_mustered = False
                if cur: rows.append(cur); cur = None
                L = hm.group(1) or ''
                if L in ('II', 'IT', 'LI', 'IJ', 'Ii'): L = 'H'
                elif len(L) == 2: L = L[0]
                prevL = company if company in SEQ else None
                exp = SEQ[SEQ.index(prevL) + 1] if prevL and SEQ.index(prevL) + 1 < len(SEQ) else ('A' if prevL is None else None)
                if prevL is None or (L in SEQ and SEQ.index(L) > SEQ.index(prevL) and SEQ.index(L) - SEQ.index(prevL) <= 2) :
                    company = L if L in SEQ else (exp or L)
                elif exp:
                    company = exp; inferred.append((uid, pn, L, exp))
                else:
                    company = L
                section = 'company'
                seen_mustered = False
                continue
            up = re.sub(r'[^A-Z ]', '', full.upper()).strip()
            if full == full.upper() and (l[0][0] - nx) / sc < 1000 and up in ('FIELD AND STAFF', 'FIELD STAFF', 'NON COMMISSIONED STAFF', 'NONCOMMISSIONED STAFF', 'BAND', 'REGIMENTAL BAND', 'UNASSIGNED RECRUITS', 'RECRUITS'):
                if cur: rows.append(cur); cur = None
                company = {'FIELD AND STAFF': 'FS', 'FIELD STAFF': 'FS', 'NON COMMISSIONED STAFF': 'NCS', 'NONCOMMISSIONED STAFF': 'NCS', 'BAND': 'BAND', 'REGIMENTAL BAND': 'BAND'}.get(up, 'REC')
                section = 'staff' if company in ('FS', 'NCS') else 'band' if company == 'BAND' else 'recruits'
                continue
            if re.match(r'^(Names?\.?|Rank\.?|Date|of|Entering|the|Service\.?|Remarks\.?|Period|Age|Co\.?|Entering the|Date of)(\s|$)', full) and y < 600 and len(full) < 70:
                continue
            if re.match(r'^(Must\w*\s+(in|out)|Volunteer\s+Infantry|Regiment)', full) and not any(600 <= (w[0] - nx) / sc < 690 for w in l):
                # company muster-in/out description paragraph
                if re.match(r'^Must\w*\s+in\b', full) and (company in SEQ or company == 'FS'):
                    if seen_mustered and (company == 'FS' or SEQ.index(company) + 1 < len(SEQ)):
                        if cur: rows.append(cur); cur = None
                        company = 'A' if company == 'FS' else SEQ[SEQ.index(company) + 1]; inferred.append((uid, pn, 'no-heading', company))
                        missing_head.add((uid, company))
                    seen_mustered = True
                continue
            toks = sorted([w for w in l if not re.fullmatch(r'[\|\[\]\{\}]+', w[4])], key=lambda w: w[0])
            nameT, rankT, ageT, dateT, perT, remT = [], [], [], [], [], []
            mi = None
            for i, w in enumerate(toks):
                if 480 <= (w[0] - nx) / sc < 1000 and is_month(w[4]):
                    mi = i; break
            if mi is not None:
                j = mi + 1
                while j < len(toks) and j < mi + 4 and re.match(r"^[\d,\.OIlSGgi()'‘’\-:;!\|]{1,8}$", toks[j][4]) and toks[j][0] - toks[j - 1][2] < 260:
                    j += 1
                    if re.search(r'\d{3,4}|[Il1i][8S][6G0O(\d]', toks[j - 1][4]) and len(toks[j - 1][4]) >= 3:
                        break
                # period: '3 yrs.' / '1 yr.' / '100 days'
                k = j
                if k < len(toks) and re.match(r'^[\dIl]{1,3}$', toks[k][4]) and k + 1 < len(toks) and re.match(r'^(yrs?\.?|yr\.?|days?|mos\.?|months?|years?|vr\.?|vrs\.?)$', toks[k + 1][4], re.I):
                    k += 2
                elif k < len(toks) and re.match(r'^[\dIl]{1,3}(yrs?|yr|vrs?)\.?$', toks[k][4], re.I):
                    k += 1
                for i, w in enumerate(toks):
                    r = (w[0] - nx) / sc
                    if i < mi:
                        if r < 430: nameT.append(w)
                        elif r < 600: rankT.append(w)
                        else:
                            (ageT if re.match(r"^[\d\.OIlSGgi()'\-:;!\|]{1,4}$", w[4]) else rankT).append(w)
                    elif i < j: dateT.append(w)
                    elif i < k: perT.append(w)
                    else: remT.append(w)
            else:
                for w in toks:
                    r = (w[0] - nx) / sc
                    if r < 430: nameT.append(w)
                    elif r < 600: rankT.append(w)
                    elif r < 690: ageT.append(w)
                    elif r < 965: dateT.append(w)
                    elif r < 1110: perT.append(w)
                    else: remT.append(w)
            nt = txt(nameT)
            if not nt and mi is not None and (dateT or perT) and (rankT or ageT):
                if cur: rows.append(cur)
                cur = dict(unit=uid, regiment=lab, company=company, section=section, name='', rank=txt(rankT), age=txt(ageT), date=txt(dateT), per=txt(perT),
                           rem=txt(remT), page=pn, y=int(y), cflag=('company-heading-missing' if (uid, company) in missing_head else ''), noname=True)
            elif nt and re.search(r'[A-Za-z]', nt) and (rankT or ageT or dateT or perT):
                if cur: rows.append(cur)
                cur = dict(unit=uid, regiment=lab, company=company, section=section, name=nt, rank=txt(rankT), age=txt(ageT), date=txt(dateT), per=txt(perT),
                           rem=txt(remT), page=pn, y=int(y), cflag=('company-heading-missing' if (uid, company) in missing_head else ''))
            elif cur is not None:
                contT = [w for w in toks if (w[0] - nx) / sc >= 1100]
                if contT: cur['rem'] = (cur['rem'] + ' ' + txt(contT)).strip()
                elif nt and not rankT and not ageT and not dateT:
                    cur['name'] = (cur['name'] + ' ' + nt).strip()
    if cur: rows.append(cur)
    return rows


if __name__ == '__main__':
    only = sys.argv[1:]
    allrows = []
    for uid, lab, vol, num, kind in UNITS:
        if only and uid not in only: continue
        if not os.path.exists(os.path.join(CACHE, VOLS[vol] + '.pages.json')):
            print('no pages for vol', vol, uid); continue
        pns = list(range(PAGE_RANGES[uid][0], PAGE_RANGES[uid][1] + 1)) if uid in PAGE_RANGES else unit_pages(vol, ORD[num] + '|' + str(num) + '(?:ST|ND|RD|TH|D)')
        if not pns:
            print('no pages found', uid); continue
        rs = parse_pages(vol, pns, uid, lab)
        c = collections.Counter(r['company'] for r in rs)
        print(uid, 'pages', pns[0], pns[-1], 'rows', len(rs), sorted(c.items()))
        allrows += rs
    print('inferred company letters:', inferred)
    out = os.path.join(CACHE, 'oh_rows.json')
    old = []
    if only and os.path.exists(out):
        old = [r for r in json.load(open(out)) if r['unit'] not in only]
    json.dump(old + allrows, open(out, 'w'))
