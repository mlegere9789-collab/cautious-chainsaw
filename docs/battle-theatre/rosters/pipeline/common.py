import re, datetime

MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
       'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCR_MON = {'mav': 5, 'lay': 5, 'julv': 7, 'jiilv': 7, 'jiily': 7, 'jnly': 7, 'jiine': 6, 'jime': 6,
           'junc': 6, 'sept': 9, 'siept': 9, 'deo': 12, 'dee': 12, 'jau': 1, 'fob': 2, 'kcb': 2, 'mai': 3}


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in OCR_MON:
        return OCR_MON[t]
    for k, v in OCR_MON.items():
        if len(k) >= 4 and t.startswith(k):
            return v
    return MON.get(t[:3])


DATE_RE = re.compile(r"([A-Za-z\.\\]{2,6})\.?\s*(\d{1,2})\s*[,\.]\s*['\"‘’`“”]?\s*([0-9OIlo!\.]{1,3})")


def fixyear(s):
    s = s.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('!', '1').replace('.', '')
    d = [c for c in s if c.isdigit()]
    if not d:
        return None
    if len(d) >= 2 and d[0] == '6':
        return 1860 + int(d[1])
    last = int(d[-1])
    return 1860 + last if last <= 5 else None


def parse_dates(s):
    out = []
    for m in DATE_RE.finditer(s):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        try:
            day = int(m.group(2))
        except ValueError:
            continue
        yr = fixyear(m.group(3))
        if yr is None or not (1 <= day <= 31):
            continue
        maxd = 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31
        try:
            out.append((datetime.date(yr, mo, min(day, maxd)), m.start(), m.end()))
        except ValueError:
            pass
    return out


GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)
