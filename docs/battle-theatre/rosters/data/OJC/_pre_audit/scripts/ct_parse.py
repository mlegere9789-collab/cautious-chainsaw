import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""Parse the 1869 Catalogue of Connecticut Volunteer Organizations (IA connecticutvolorg00catarich) from djvu word boxes.
Output: CACHE/ct_rows.json (rows before labelling)."""
import json, re, collections
from ojc_common import *
from showpage import lines_of

SRC = 'connecticutvolorg00catarich'
P = json.load(open(os.path.join(CACHE, SRC + '.pages.json')))
P = {k: [[w[0], w[1], w[2], w[3], w[4].strip()] for w in v] for k, v in P.items()}

UNITS = {  # key -> (unit_id, label, header regex, extra)
    'FIFTH': ('U-5CT', '5th Connecticut Infantry', r'(?<![A-Za-z\-])FIFTH\s+REG'),
    'FOURTEENTH': ('U-14CT', '14th Connecticut Infantry', r'(?<![A-Za-z\-])FOURTEENTH\s+REG'),
    'SEVENTEENTH': ('U-17CT', '17th Connecticut Infantry', r'(?<![A-Za-z\-])SEVENTEENTH\s+REG'),
    'TWENTIETH': ('U-20CT', '20th Connecticut Infantry', r'(?<![A-Za-z\-])TWENTIETH\s+REG'),
    'TWENTY-SEVENTH': ('U-27CT', '27th Connecticut Infantry', r'TWENTY.SEVENTH\s+REG'),
}
RANKS = re.compile(r"^(Colonel|Lieut\.?\s*Colonel|Major|Adjutant|Qr\.?\s*Master|Quartermaster|Surgeon|(1st|2d|\d)\s*Asst\.?\s*Surgeon|Chaplain|Captain|(1st|2d|3d)\s*Lieutenant|Sergeants?|Corporals?|Musicians?|Wagoner|Privates?|Principal\s+Musician|Hospital\s+Steward|Sergeant\s+Major|Com\.?\s*Sergeant|Q\.?\s*M\.?\s*Sergeant|Band|Bugler|Saddler|Farrier|Blacksmith|Artificer|Chief\s+Bugler|Veterinary|Teamster|Ward\s*master|Cook|Cooks)\b\.?", re.I)


def page_top_text(words):
    ws = sorted(words, key=lambda z: (z[1] // 40, z[0]))[:18]
    return ' '.join(x[4] for x in ws)


def unit_of_page(pn):
    t = page_top_text(P[str(pn)])
    for key, (uid, lab, rx) in UNITS.items():
        if re.search(rx, t):
            return key
    if re.search(r'FIRST\s+REGIMENT\s+ARTIL', t) or re.search(r'FIRST\s+REGIMENT\s+HEAVY', t):
        return 'HA1'
    return None


def pages_for():
    ukeys = {pn: unit_of_page(pn) for pn in range(1, len(P) + 1)}
    return ukeys


MONTOK = re.compile(r"^(Jan|Jau|Feb|Fob|Mar|Mch|Apr|May|Mav|Mai|June?|July?|Jul|Aug|Ang|Sept?|Oct|Nov|Dec|Dee|Deo)[a-z]{0,6}\.?,?$", re.I)
NUMTOK = re.compile(r"^[0-9OIl,\./'’\"\-]{1,7}$")


def cell_split(line, name_x0):
    """Split a line into name / residence / date / remarks using the month token as the anchor of the date cell."""
    toks = sorted(line, key=lambda w: w[0])
    cols = {'n': [], 'r': [], 'd': [], 'm': []}
    m = None
    for i, w in enumerate(toks):
        if name_x0 + 520 < w[0] < name_x0 + 1100 and MONTHTOK(w[4]):
            m = i; break
    if m is not None:
        # date cell: month token + following number-ish tokens (at most 3)
        j = m + 1
        while j < len(toks) and j < m + 4 and NUMTOK.match(toks[j][4]) and toks[j][0] - toks[j - 1][2] < 200:
            j += 1
        for i, w in enumerate(toks):
            if i < m:
                cols['n' if w[0] < name_x0 + 470 else 'r'].append(w)
            elif i < j:
                cols['d'].append(w)
            else:
                cols['m'].append(w)
    else:
        for w in toks:
            x = w[0] - name_x0
            c = 'n' if x < 470 else 'r' if x < 840 else 'd' if x < 1090 else 'm'
            cols[c].append(w)
    return cols


def MONTHTOK(t):
    return bool(MONTOK.match(t))


def txt(ws):
    return re.sub(r'\s+', ' ', ' '.join(w[4] for w in ws)).strip()


DITTO = re.compile(r"^[\"'“”‘’„`,.:;〃»«]{1,3}$")


def resolve_ditto(cur, prev):
    toks = cur.split()
    if not toks or not prev:
        return cur, False
    ptoks = prev.split()
    out = []
    changed = False
    for i, tk in enumerate(toks):
        if DITTO.match(tk) and i < len(ptoks):
            out.append(ptoks[i]); changed = True
        else:
            out.append(tk)
    return ' '.join(out), changed


def parse():
    ukeys = pages_for()
    rows = []
    for key in list(UNITS) + ['HA1']:
        pns = [pn for pn, k in ukeys.items() if k == key]
        if not pns:
            print('NO PAGES', key); continue
        lo, hi = min(pns), max(pns)
        # include gaps inside the range
        pns = list(range(lo, hi + 1))
        if key == 'HA1':
            pass
        uid, lab = (UNITS[key][0], UNITS[key][1]) if key in UNITS else ('HA1', '1st Connecticut Heavy Artillery')
        company, section, block_year, rank_head = None, 'field-staff', None, ''
        cur = None
        prev_rem, prev_res = '', ''
        last_shift = 190
        for pn in pns:
            words = P[str(pn)]
            lines = lines_of(words)
            # name column x0 of this page: median first-word x of lines that carry a month token
            xs = []
            for l in lines:
                ts = sorted(l, key=lambda w: w[0])
                if any(MONTHTOK(w[4]) and w[0] > 700 for w in ts) and ts[0][0] < 400:
                    xs.append(ts[0][0])
            if len(xs) >= 3:
                xs.sort(); shift = xs[len(xs) // 4]; last_shift = shift
            else:
                shift = last_shift
            for l in lines:
                y = (l[0][1] + l[0][3]) / 2
                c = cell_split(l, shift)
                full = txt(l)
                if y < 330 and re.search(r'REGIMENT|INFANTRY|ARTILL|C\.\s*V', full):
                    continue
                # headings
                hm = re.search(r'(?:Infantry|Artillery|Cavalry)\s+Company\s+-?\s*([A-M])\b', full) or re.search(r'Recruits?\s+for\s+(?:Infantry\s+)?\(?Company\s+([A-M])\b', full, re.I) or \
                    re.search(r'Company\s+([A-M]),\s+First', full)
                if hm and len(full) < 130 and not re.search(r'\b(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)\b', full):
                    if cur: rows.append(cur); cur = None
                    company = hm.group(1)
                    section = 'recruits' if re.search(r'Recruits?|Kecruits|Hecruits|Beemits|ecruit', full, re.I) else 'company'
                    block_year = None
                    prev_rem = prev_res = ''
                    continue
                if re.search(r'^(?:\W*)(Name\s+and\s+(?:Rank|Hank|Kank|Ilank)|Name\.?)\b', full) or re.search(r'Residence|Remarks|Date\s+of\s+(Muster|Appoint|Enlist)', full) and not c['n']:
                    continue
                if re.search(r'Date\s+of\s+(Muster|Appoint|Enlist)|Muster\.?$', full) and not c['m']:
                    continue
                if re.search(r'FIELD\s+AND\s+STAFF', full) and len(full) < 60:
                    if cur: rows.append(cur); cur = None
                    company, section, block_year = 'FS', 'field-staff', None
                    continue
                if re.search(r'^\W*BAND\.?$', full):
                    if cur: rows.append(cur); cur = None
                    company, section, block_year = 'BAND', 'band', None
                    continue
                if re.search(r'Recruits\s+for\s+.*(?:Regiment|Unassigned|Unattached)|Unassigned\s+Recruits', full, re.I) and not c['d']:
                    if cur: rows.append(cur); cur = None
                    company, section, block_year = 'REC', 'recruits', None
                    continue
                if company is None:
                    continue
                # rank heading line: name column only (+ year in date col)
                nt, rt, dt, mt = txt(c['n']), txt(c['r']), txt(c['d']), txt(c['m'])
                if nt and not rt and not mt and RANKS.match(nt) and (not dt or re.match(r'^\W*(1[78]\d\d)\W*$', dt) or re.match(r'^\W*1\W*8\W*6\W*\d', dt)):
                    if cur: rows.append(cur); cur = None
                    rank_head = nt
                    ym = re.search(r'(18[56]\d)', dt)
                    if ym: block_year = int(ym.group(1))
                    continue
                if nt and (rt or dt or mt):
                    # new record
                    if cur: rows.append(cur)
                    cur = dict(unit=uid, regiment=lab, company=company or '?', section=section, rank=rank_head, name=nt, res=rt, date=dt, rem=mt,
                               page=pn, block_year=block_year, y=int(y))
                elif cur is not None and not nt:
                    # continuation line (remark overflow, residence second line, date second line)
                    if mt: cur['rem'] = (cur['rem'] + ' ' + mt).strip()
                    if rt: cur['res'] = (cur['res'] + ' ' + rt).strip()
                    if dt: cur['date'] = (cur['date'] + ' ' + dt).strip()
                elif cur is not None and nt and not (rt or dt or mt):
                    cur['name'] = (cur['name'] + ' ' + nt).strip()
        if cur: rows.append(cur)
    return rows


if __name__ == '__main__':
    rows = parse()
    json.dump(rows, open(os.path.join(CACHE, 'ct_rows.json'), 'w'))
    print(len(rows), collections.Counter(r['unit'] for r in rows))
    print(collections.Counter((r['unit'], r['company']) for r in rows if r['unit'] == 'HA1'))
