"""Shared date/event helpers for the NE family (Massachusetts, New Hampshire, Vermont, Maine).
Presence rules follow rosters/PLAN.md section 2.2. Python standard library only."""
import re, datetime

GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
# OCR variants seen in the Massachusetts and other volumes, mapped to month number
OCR_MON = {'julj': 7, 'julv': 7, 'jnly': 7, 'jidy': 7, 'jul': 7, 'juue': 6, 'junc': 6, 'jime': 6, 'jnne': 6, 'jane': 6,
           'sept': 9, 'siept': 9, 'spet': 9, 'dee': 12, 'deo': 12, 'jany': 1, 'feby': 2, 'mav': 5, 'mareh': 3, 'marcli': 3,
           'aprll': 4, 'apiil': 4, 'oet': 10, 'ocl': 10, 'noy': 11, 'nov': 11, 'ang': 8, 'aug': 8, 'angust': 8, 'augnst': 8}

MON_PAT = (r"(?:Jan(?:y|uary)?|Feb(?:y|ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|Jul[yjv]?|Aug(?:ust)?|Ang(?:ust)?|"
           r"Sept?|S-?ept|Oct|Nov|Dec|Jnly|Juue|Junc|Dee|Deo)")
YEAR_PAT = r"([1lI]\s?[8S]\s?[6GCO]\s?[0-9OSBGlIZ])"
DATE_RE = re.compile(
    r"(?P<mon>" + MON_PAT + r")\.?\s*(?:,\s*)?(?:['’‘`]?\s*(?P<day>\d{1,2})(?:st|d|nd|rd|th)?\s*[,\.]?\s*[,\.]?\s*)?(?:in\s+)?['’‘`]?\s*(?P<yr>" + YEAR_PAT + r")",
    re.I)


def mon_num(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in OCR_MON:
        return OCR_MON[t]
    return MONTHS.get(t[:3])


def fix_year(s):
    s = re.sub(r'\s', '', s).upper().replace('L', 'l')
    if len(s) != 4:
        return None
    c = list(s)
    if c[0] in 'lI':
        c[0] = '1'
    if c[1] in 'S':
        c[1] = '8'
    if c[2] in 'GC':
        c[2] = '6'
    if c[2] == 'O':
        c[2] = '6'
    m = {'O': '0', 'S': '5', 'B': '8', 'G': '6', 'l': '1', 'I': '1', 'Z': '2'}
    c[3] = m.get(c[3], c[3])
    try:
        y = int(''.join(c))
    except ValueError:
        return None
    return y if 1860 <= y <= 1866 else None


def find_dates(text):
    """returns [(date, precision, start, end, raw)] ; precision 'day' or 'month' (day set to 15)"""
    out = []
    for m in DATE_RE.finditer(text):
        mo = mon_num(m.group('mon'))
        yr = fix_year(m.group('yr'))
        if not mo or not yr:
            continue
        if m.group('day'):
            d = int(m.group('day'))
            prec = 'day'
            if not (1 <= d <= 31):
                d, prec = 15, 'month'
        else:
            d, prec = 15, 'month'
        mx = 29 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31
        d = min(d, mx)
        try:
            out.append((datetime.date(yr, mo, d), prec, m.start(), m.end(), m.group(0)))
        except ValueError:
            continue
    return out


GETT = re.compile(r"G[eo]t{1,2}[yv]\w{0,9}|G[eo]tt\w{0,3}b[ua]r?g", re.I)


def classify_after_battle(d, prec):
    """-1 before 1 July 1863, 0 inside 1-3 July, 1 after 3 July, None ambiguous (month precision in July 1863)"""
    if prec == 'month' and d.year == 1863 and d.month == 7:
        return None
    if d < GB_START:
        return -1
    if d <= GB_END:
        return 0
    return 1


YEAR_ONLY = re.compile(r"(?<![0-9A-Za-z])([1lI][8S][6GCO][0-9OSBGlIZ])(?![0-9A-Za-z])")


def year_only(text):
    """years found in text even when the month/day is unreadable; returns list of ints"""
    out = []
    for m in YEAR_ONLY.finditer(text):
        y = fix_year(m.group(1))
        if y:
            out.append(y)
    return out
