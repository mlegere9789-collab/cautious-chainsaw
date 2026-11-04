"""Shared presence classifier for the MW family (rules of PLAN section 2.2, applied in order).
Input: dict with name, rank, company, date_raw, year_hint, remarks, date_kind ('muster'|'enlist'|'rank'|None).
Output: (label, basis, enlist_iso, roll_status, events)"""
import re, datetime, difflib

MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCRM = {'apl': 4, 'mch': 3, 'jne': 6, 'jly': 7, 'octr': 10, 'sepr': 9, 'mav': 5, 'julv': 7, 'jnly': 7, 'juno': 6, 'june': 6, 'tune': 6, 'fune': 6, 'une': 6, 'junc': 6, 'sept': 9, 'dec': 12, 'deo': 12, 'dee': 12, 'jau': 1, 'fob': 2, 'sent': 9, 'sep': 9, 'ang': 8, 'auc': 8, 'aug': 8, 'ocl': 10, 'nov': 11, 'mai': 3, 'mar': 3, 'apr': 4, 'apri': 4, 'april': 4, 'jan': 1, 'feb': 2, 'july': 7, 'juiy': 7, 'jul': 7, 'jun': 6}
GB0 = datetime.date(1863, 7, 1)
GB1 = datetime.date(1863, 7, 3)

DATE_RE = re.compile(r"\b([A-Za-z]{2,6})\.?\s*(\d{1,2}|G)\s*[,\.]?\s*(?:['\"‘’`“”]\s*|\s)?([0-9GgOoIl!SB\-]{2,4})?")


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in OCRM:
        return OCRM[t]
    if t[:3] in MON and len(t) <= 9:
        return MON[t[:3]]
    return None


def norm_year(tok):
    if not tok:
        return None
    s = tok.replace('G', '6').replace('g', '6').replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('!', '1').replace('S', '5').replace('B', '3')
    s = re.sub(r'[^0-9]', '', s)
    if len(s) == 4 and s[:2] == '18':
        y = int(s)
        return y if 1860 <= y <= 1866 else None
    if len(s) >= 2:
        d = s[-2:] if len(s) > 2 and s[:2] in ('18',) else s[:2]
        if len(s) == 3 and s[0] == '1':
            d = s[1:]
        if d[0] in '60' and d[1] in '012345':
            return 1860 + int(d[1])
    return None


def find_dates(text, default_year=None):
    """list of (date, start, end, had_year) for every month-day[-year] found; year defaults to default_year (marked had_year False)."""
    out = []
    for m in DATE_RE.finditer(text):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        # reject words that merely start with a month-like prefix and are long
        w = re.sub(r'[^A-Za-z]', '', m.group(1)).lower()
        if len(w) > 5 and w not in ('august', 'march', 'april', 'june', 'july', 'sept'):
            continue
        day = 6 if m.group(2) == 'G' else int(m.group(2))
        if not 1 <= day <= 31:
            continue
        ytok = m.group(3)
        y = norm_year(ytok) if ytok else None
        had = y is not None
        if y is None:
            if ytok and re.search(r'\d', ytok) and len(re.sub(r'\D', '', ytok)) >= 2:
                continue  # a year was printed but is unreadable: do not guess
            if re.search(r"['’‘\"“”`]\s*$", m.group(0)) or re.match(r"\s*['’‘\"“”`]\s*\S", text[m.end():m.end() + 6] or ''):
                continue  # an apostrophe-year was printed but is unreadable
            y = default_year
        if y is None:
            continue
        maxd = 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31
        try:
            out.append((datetime.date(y, mo, min(day, maxd)), m.start(), m.end(), had))
        except ValueError:
            pass
    return out


SEP = [
    ('Discharged', r"\b(Disch(?:arged|'d|d)?|Dischar\w*|Dis\.|Disch)\b"),
    ('Died', r"\b(Died|Dicd|Diod|Dled|Died,)\b"),
    ('Killed', r"\b(Killed|Kill'd|Supposed\s+killed|Supp'd\s+killed|Missing,?\s+supp\w*\s+killed)\b"),
    ('Deserted', r"\b(Deserted|Desert\w*|Desrt)\b"),
    ('Transferred', r"\b(Transferred|Transf\w*|Trans\.?|Tr\.|Transfd)\b"),
    ('Resigned', r"\b(Resigned|Res\.|Resign\w*)\b"),
    ('Dismissed', r"\b(Dismissed|Dism\w*)\b"),
    ('Dropped', r"\b(Dropped|Drop'?d|Dropt)\b"),
    ('Mustered out', r"\b(Mustered\s+out|Must'?d\.?\s+out|M\.\s*O\.|Muster\s+out|mustered\s+out|flustered\s+out)\b"),
]
SEPRE = [(k, re.compile(p, re.I)) for k, p in SEP]
GETT = re.compile(r"[GC]ett|ettysb|Gcttys|Gettvs|Get\w*sb|Gettys|Gettysb", re.I)
OFFICER = re.compile(r"^(Colonels?|Lieut(?:enant)?s?\.?(?:\s*Colonels?)?|Majors?(?![a-z])|Captains?|(?:First|Second|1st|2d|2nd)\s*(?:Ass'?t\.?\s*)?(?:Lieut\w*|Surgeons?)|Adjutants?|Quartermasters?(?![a-z])(?!\s*Serg)|Surgeons?|Ass'?t\.?\s*Surgeons?|Assistant\s+Surgeons?|Chaplains?|Field|Staff|Commissioned)", re.I)


def classify(r, all_ranks_officer=False):
    name = r.get('name') or ''
    rank = r.get('rank') or ''
    rem = re.sub(r'\s+', ' ', r.get('remarks') or '').strip()
    kind = r.get('date_kind')
    hint = r.get('year_hint')
    is_officer = bool(OFFICER.match(rank)) or r.get('is_officer', False) or all_ranks_officer
    # date
    dd = find_dates(r.get('date_raw') or '', hint)
    unreadable_date = False
    enl = None
    if dd and not is_officer:
        enl = dd[0][0]
    elif not dd and (r.get('date_raw') or '').strip() and not is_officer:
        unreadable_date = True
    if enl and (enl.year < 1861 or enl > datetime.date(1866, 1, 1)):
        enl = None
    rd = find_dates(rem, None)
    events = []
    for seg in re.split(r"[;]|(?<=\d)\.\s+(?=[A-Z])|(?<=\')\d\d\.\s+(?=[A-Z])", rem):
        seg = seg.strip(' .*')
        for kind_, rx in SEPRE:
            m = rx.search(seg)
            if m:
                ds = find_dates(seg[m.end():], None)
                events.append((kind_, ds[0][0] if ds else None, seg))
                break
    gett = bool(GETT.search(rem))
    d13 = [d for d, _, _, _ in rd if GB0 <= d <= GB1]
    sep_before = None; sep_after = None; sep_nodate = None
    for k, d, seg in events:
        if d is None:
            sep_nodate = sep_nodate or k
        elif d < GB0:
            sep_before = sep_before or (k, d)
        else:
            sep_after = sep_after or (k, d)
    # decisive rules in the PLAN section 2.2 order
    if gett and not (sep_before and not (re.search(r'wound|killed|died|captur|missing|pris', rem, re.I))):
        casualty = bool(re.search(r'wound|wnd|wd\b|killed|died|captur|missing|pris|lost|lost\s+(an?\s+)?(arm|leg)', rem, re.I))
        label = 'Present-Documented'
        gm = GETT.search(rem)
        ctx = rem[max(0, gm.start() - 70): gm.end() + 40]
        basis = ('CAS-REMARK: roster remark names Gettysburg: ' if casualty else 'GETTYSBURG-REMARK: roster remark names Gettysburg: ') + '...' + ctx + '...'
        if sep_before:
            basis += ' | CONFLICT flagged: a separation also dated before the battle (probably an OCR year misread)'
        return label, basis, str(enl) if enl else '', 'named-present', events
    if d13 and not sep_before:
        return 'Present-Documented', f'EVENT-DATED-IN-BATTLE: remark carries a date {d13[0]}: ' + rem[:80], str(enl) if enl else '', 'named-present', events
    if enl and enl >= GB0:
        return 'Absent-Documented', f'ENL-AFTER: muster/enlistment date {enl} is after the battle', str(enl), 'not-yet-enlisted', events
    if sep_before:
        return 'Absent-Documented', f'SEP-BEFORE: {sep_before[0]} dated {sep_before[1]} (before the battle)', str(enl) if enl else '', 'off-roll-before-battle', events
    if sep_nodate:
        segtxt = next((sg for k, d, sg in events if d is None), '')
        if not re.search(r'\d', segtxt):
            return 'Unknown', f'ONROLL-NO-STATUS: "{sep_nodate}" is printed without a date (event undated in the source); enlistment/muster ' + (str(enl) if enl else 'date not legible') + '; cannot place him before or after 1 Jul 1863', str(enl) if enl else '', 'on-roll-undetermined' if enl else 'unreadable-or-ambiguous', events
    if sep_nodate and not is_officer and (enl is None):
        return 'Unknown', f'OCR-DATE-LOST: "{sep_nodate}" event present but its date is not legible; enlistment date not legible', '', 'unreadable-or-ambiguous', events
    if sep_nodate:
        return 'Unknown', f'OCR-DATE-LOST: "{sep_nodate}" event present but its date is not legible in the OCR text layer', str(enl) if enl else '', 'unreadable-or-ambiguous', events
    if is_officer:
        return 'Unknown', 'ONROLL-NO-STATUS: officer on the roll; officer rank date is not an enlistment date and no separation before 1 Jul 1863 is printed; needs an evidence pass (reports, regimental history)', '', 'on-roll-undetermined', events
    if enl is None and (unreadable_date or not (r.get('date_raw') or '').strip()):
        return 'Unknown', 'OCR-DATE-LOST: muster/enlistment date missing or not legible in the OCR text layer; no separation printed', '', 'unreadable-or-ambiguous', events
    if enl is None:
        return 'Unknown', 'OCR-DATE-LOST: muster/enlistment date not legible', '', 'unreadable-or-ambiguous', events
    return 'Unknown', 'ONROLL-NO-STATUS: on roll before the battle (muster/enlistment ' + str(enl) + '); no separation before 1 Jul 1863 printed; the roster has no 30 June 1863 status', str(enl), 'on-roll-undetermined', events


def flags(name):
    f = []
    n = name or ''
    if not n.strip():
        return 'name-not-in-ocr-text-layer'
    if re.match(r"^(e\.|cm\.|'|\W)", n) or re.search(r'e\.\s', n):
        f.append('name-garbled')
    if re.search(r"[^A-Za-z\.' \-,]", n):
        f.append('ocr-noise-in-name')
    return ';'.join(f)
