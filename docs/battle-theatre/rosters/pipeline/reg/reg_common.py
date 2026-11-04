"""Shared helpers for the REG family: date parsing (OCR tolerant), presence labelling by PLAN 2.2, CSV writing.
Python standard library only."""
import re, csv, datetime, os

GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)
MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCR_MON = {'jau': 1, 'fob': 2, 'feh': 2, 'mav': 5, 'julv': 7, 'jnly': 7, 'sept': 9, 'sep': 9, 'deo': 12, 'dee': 12, 'ang': 8, 'auc': 8, 'oct': 10, 'ocl': 10, 'noy': 11, 'nov': 11}

COLUMNS = ['unit_id', 'regiment', 'company', 'section', 'name_as_printed', 'rank_as_printed', 'residence', 'age',
           'date_in', 'date_out', 'remarks_as_printed', 'presence_label', 'presence_basis', 'roll_status',
           'source_id', 'source_locator', 'parse_flags']

DATE_RE = re.compile(r"([A-Za-z]{3,9})\.?,?\s*(\d{1,2})\s*[,.]?\s*['\"‘’`“”]?\s*(1[S8]\s?[0-9OSIlfiGC\.]{1,3}|[0-9OSIl]{2})(?!\d)")


def fix_year(s):
    s = s.strip().replace(' ', '')
    t = s.replace('fi', '6').replace('S', '8').replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('G', '6').replace('C', '6').replace('.', '')
    d = re.sub(r'\D', '', t)
    if len(d) == 5 and d.startswith('18'):
        d = d[:4]
    if len(d) == 4 and d.startswith('18'):
        y = int(d)
        if 1801 <= y <= 1805:  # the OCR reads the 6 of 186x as 0
            y += 60
        return y
    if len(d) == 3 and d.startswith('18'):
        return None
    if len(d) == 2 and d[0] in '56':
        return 1800 + int(d)
    return None


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in OCR_MON:
        return OCR_MON[t]
    return MON.get(t[:3])


def parse_dates(s):
    """list of (date, start, end) found in s; day clipped to month length."""
    out = []
    for m in DATE_RE.finditer(s or ''):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        yr = fix_year(m.group(3))
        if yr is None or not (1855 <= yr <= 1870):
            continue
        try:
            day = int(m.group(2))
        except ValueError:
            continue
        maxd = 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31
        if not 1 <= day <= 31:
            continue
        try:
            out.append((datetime.date(yr, mo, min(day, maxd)), m.start(), m.end()))
        except ValueError:
            pass
    return out


CAS = re.compile(r'(k[il1u]{1,3}e?d|w[o0][uan]{1,3}d|wnd|captur|prisoner|mortal|miss[il1]ng|died of w|desert|m[il1]ssing)', re.I)
GETT = re.compile(r'[GCOQ][eo]tt?[yvuj]?[a-z]?[bh]', re.I)


SEPW = re.compile(r'(desert|disch|dismiss|resign|died|death|transfer|mustered out|muster-out|mus\. out|killed|drop|cashier)', re.I)
NOSEP = re.compile(r'(return|rejoin|restor|reduc|not guilty|removed|reinstat|exchang|paroled|re-?enlist|veteran|promot)', re.I)


def remark_separation(rem):
    if not rem or NOSEP.search(rem):
        return None
    m = SEPW.search(rem)
    if not m:
        return None
    ds = parse_dates(rem[m.start():])
    return ds[0][0] if ds else None


def label_from_dates(date_in, date_out, remarks, has_out_column=True):
    """PLAN 2.2 rules 2, 7, 8, 12, 13 for a roll that carries an enlistment and a separation date.
    Returns (label, basis, roll_status)."""
    rem = remarks or ''
    if GETT.search(rem) and CAS.search(rem):
        return 'Present-Documented', 'CAS-REMARK: remark names Gettysburg with a casualty event', 'named-present'
    if gb_casualty(rem):
        return 'Present-Documented', 'CAS-REMARK: remark states a casualty dated 1-3 July 1863', 'named-present'
    if date_out and date_out < GB_START:
        return 'Absent-Documented', 'SEP-BEFORE: separation from this roll dated %s, before 1 July 1863' % date_out.isoformat(), 'off-roll-before-battle'
    if date_in and date_in > GB_END:
        return 'Absent-Documented', 'ENL-AFTER: enlisted or mustered in %s, after 3 July 1863' % date_in.isoformat(), 'not-yet-enlisted'
    sep, _cl = clause_sep(rem)
    if sep and sep < GB_START and not date_out:
        return 'Absent-Documented', 'SEP-BEFORE: remark states a separation dated %s, before 1 July 1863' % sep.isoformat(), 'off-roll-before-battle'
    if GETT.search(rem):
        return 'Unknown', 'remark mentions Gettysburg without a casualty word: check page image', 'unreadable-or-ambiguous'
    if date_in is None:
        return 'Unknown', 'no legible enlistment date', 'unreadable-or-ambiguous'
    return 'Unknown', 'ONROLL-NO-STATUS: on the roll before the battle, no separation before it; the roll gives no status for 30 June 1863', 'on-roll-undetermined'


def write_csv(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def clause_sep(rem):
    """Earliest separation date stated in a remark, clause by clause (clauses split at ';').
    Returns (date, clause) or (None, None).  A discharge 'to accept promotion' is not a separation from the unit;
    a clause that only says 'transferred from' is not a separation; 'transferred to' with a date is one."""
    best = (None, None)
    for cl in re.split(r';', rem or ''):
        c = cl.strip()
        if re.search(r'accept\w*\s+(a\s+)?(promotion|commission)', c, re.I):
            continue
        if re.search(r'(re-?enlist|veteran|returned|rejoin|released|paroled|exchanged)', c, re.I) and not re.search(r'(disch|died|killed|deserted|dismiss)', c, re.I):
            continue
        has_to = re.search(r'trans\w*\.?\s+to', c, re.I)
        has_from = re.search(r'trans\w*\.?\s+from', c, re.I)
        if re.search(r"(disch|dis'd|diach|disoh|dlsch|des'd|dismiss|resign|died|killed|desert|mustered out|mus'd out|mus\. out|dropped|cashier)", c, re.I) or (has_to and not has_from):
            ds = parse_dates(c)
            if ds:
                d = ds[0][0]
                if best[0] is None or d < best[0]:
                    best = (d, c)
    return best


def gb_casualty(rem):
    """True when a clause of the remark names a casualty event and a date inside 1-3 July 1863 (a Gettysburg-date casualty)."""
    for cl in re.split(r';', rem or ''):
        if CAS.search(cl):
            for d, a, b in parse_dates(cl):
                if GB_START <= d <= GB_END:
                    return True
    return False
