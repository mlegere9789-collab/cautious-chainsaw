"""Shared helpers for the C-VASCGA roster family: OCR-tolerant date reading, a service-history classifier
(PLAN section 2.2 rules, applied in order) and the CSV writer. Standard library only.
Run with: python -X utf8 (own code; the downloaded text files are only read as data)."""
import re, csv, datetime, json, os, ctypes
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)  # below normal
except Exception:
    pass

REPO = 'C:/Users/mlege/gettysburg-map'
CACHE = REPO + '/tmp/library/rosters/C-VASCGA/files/'
OUT = REPO + '/docs/battle-theatre/rosters/data/C-VASCGA/'

COLS = ['regiment', 'unit_id', 'company', 'section', 'name_as_printed', 'rank_as_printed', 'enlist_or_commission_date',
        'residence_or_county', 'remarks_as_printed', 'presence_label', 'presence_basis', 'basis_code', 'dup_group',
        'source_id', 'source_locator', 'parse_flags', 'roll_status']

GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCR_MON = {'ang': 8, 'julv': 7, 'jnne': 6, 'jnly': 7, 'mav': 5, 'deo': 12, 'dee': 12, 'jau': 1, 'ocl': 10, 'sept': 9}


def mon_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if len(t) < 3:
        return None
    if t[:3] in MONTHS:
        return MONTHS[t[:3]]
    return OCR_MON.get(t) or OCR_MON.get(t[:3])


def year_of(tok):
    """OCR year token -> int. No soldier enlisted in 1800-1809, so 180x is read as 186x."""
    s = tok.strip()
    for a, b in (('O', '0'), ('o', '0'), ('I', '1'), ('l', '1'), ('i', '1'), ('!', '1'), ('S', '5'), ('s', '5'), ('G', '6')):
        s = s.replace(a, b)
    s = re.sub(r'[^0-9]', '', s)
    if len(s) != 4 or not s.startswith('18'):
        return None
    y = int(s)
    if 1800 <= y <= 1809:
        y += 60
    return y if 1858 <= y <= 1899 else None


MON_PAT = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Ang|Sep|Oct|Nov|Dec|Deo|Dee|Mav|Julv|Jau)[A-Za-z]*\.?'
YEAR_TOK = r"[1Il][8S][0-9OoIlSi!G]{2}"
DATE_RE = re.compile(r'(' + MON_PAT + r')\s*(\d{1,2})?(?:st|d|nd|rd|th)?\s*[,\.]?\s*(' + YEAR_TOK + r')')
DATE_RE2 = re.compile(r'(\d{1,2})(?:st|d|nd|rd|th)?\s+(' + MON_PAT + r')\s*[,\.]?\s*(' + YEAR_TOK + r')')
YEAR_RE = re.compile(r'(?<![0-9A-Za-z])(' + YEAR_TOK + r')(?![0-9A-Za-z])')


def find_dates(s):
    """List of (date, precision, start, end) in text order; precision day|month|year."""
    out, taken = [], []
    for m in DATE_RE.finditer(s):
        if re.search(r'\d{1,2}(?:st|d|nd|rd|th)?\s+$', s[:m.start()]) and not m.group(2):
            continue        # day-first date, handled below
        mo = mon_of(m.group(1))
        y = year_of(m.group(3))
        if not mo or not y:
            continue
        d = int(m.group(2)) if m.group(2) else None
        if d is not None and not (1 <= d <= 31):
            d = None
        try:
            dt = datetime.date(y, mo, d if d else 1)
        except ValueError:
            dt = datetime.date(y, mo, 1)
            d = None
        out.append((dt, 'day' if d else 'month', m.start(), m.end()))
        taken.append((m.start(), m.end()))
    for m in DATE_RE2.finditer(s):
        if any(a <= m.start() < b or m.start() <= a < m.end() for a, b in taken):
            continue
        mo = mon_of(m.group(2))
        y = year_of(m.group(3))
        if not mo or not y:
            continue
        d = int(m.group(1))
        try:
            dt = datetime.date(y, mo, d)
        except ValueError:
            continue
        out.append((dt, 'day', m.start(), m.end()))
        taken.append((m.start(), m.end()))
    for m in YEAR_RE.finditer(s):
        if any(a <= m.start() < b for a, b in taken):
            continue
        y = year_of(m.group(1))
        if y:
            out.append((datetime.date(y, 1, 1), 'year', m.start(), m.end()))
    out.sort(key=lambda t: t[2])
    return out


def when(dt, prec):
    """'before' (certainly before 1 July 1863), 'after' (certainly after 3 July), 'during' or None (cannot tell)."""
    if prec == 'year':
        return 'before' if dt.year <= 1862 else 'after' if dt.year >= 1864 else None
    if prec == 'month':
        k = (dt.year, dt.month)
        return 'before' if k < (1863, 7) else 'after' if k > (1863, 7) else None
    return 'before' if dt < GB_START else 'after' if dt > GB_END else 'during'


# battles wholly before 1 July 1863 (the year may be unprinted or garbled)
PRE_BATTLES = (r"(Malvern|Gaines|Seven\s+Pines|Fair\s+Oaks|Sharpsburg|Antietam|South\s+Mountain|Boonsboro|Cedar\s+(Mountain|Run)|"
               r"Manassas|Bull\s+Run|Chancellorsville|Fredericksburg|Savage|Frazier|Mechanicsville|Williamsburg|Yorktown|Cross\s+Keys|"
               r"Port\s+Republic|McDowell|Crampton|Ox\s+Hill|Chantilly|Groveton|Salem\s+Church|Beaver\s+Dam|Eltham|"
               r"Ellison|Allegh?eny|Greenbrier|Cheat\s+Mountain|Seven\s+Days|Slaughter\s+Mountain|Kelly.?s\s+Ford|Brandy\s+Station)")  # AUDIT 2026-10-30: Ellison's Mill (Mechanicsville, 26 June 1862), Allegheny (Dec 1861) etc. fall wholly before 1 July 1863
LATER = (r"(Wilderness|Spott?sylvania|Cold\s+Harbor|Petersburg|Winchester|Cedar\s+Creek|Fisher|Appomattox|Monocacy|Mine\s+Run|Hatcher|"
         r"Sailor|Stedman|Berryville|Opequon|Kernstown|Harper|Bethesda|Strasburg|Fort\s+Harrison|Hanover|Reams|Weldon|Jerusalem|Gravel)")
GBURG = r"G[eo][tl][tl]?[yv]s[bh][un]?[rn]?g|Gettys|Gettvs|Gettsb"
CAS_WORDS = (r"(wound|kill|captur|prison|missing|disabled|lost\s+(an?\s+|his\s+)?(arm|leg|eye|hand|foot)|maimed|shot|"
             r"mortally|injured|struck|shell|explosion)")
SEP_VERB = r"(killed|died|death|discharged|resigned|retired|dismissed|deserted|dropped|substitute|disability|over\s+age|transferred|term\s+(?:of\s+service\s+)?expired)"


def split_sent(s):
    s = re.sub(r'\s+', ' ', s)
    parts = re.split(r'(?<=[a-z0-9\)\]])\.\s+(?=[A-Z"\'])|;\s+(?=[A-Z])', s)
    return [p.strip() for p in parts if p.strip()]


def is_postwar(sn):
    return bool(re.search(r'(living|since the war|after the war|released after|paroled|surrender|died\s+in\s+(18[7-9]\d|19\d\d)|'
                          r'(died|death)\s+\w+.{0,25}(18[7-9]\d|19\d\d))', sn, re.I))


def classify_history(text, allow_rank_date=True):
    """Apply PLAN 2.2 rules (2 CAS/4 history presence, 7 SEP-BEFORE, 8 ENL-AFTER, 10 CONFLICT, 12, 13) to a service-history entry.
    The entry text begins with rank and enlistment date (as printed in the 1903 type of company roll)."""
    flags = []
    t = re.sub(r'\s+', ' ', text or '').strip()
    res = dict(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS', basis='', flags=flags, enlisted='')
    ds = find_dates(t)
    enl = ds[0] if (allow_rank_date and ds and ds[0][2] <= 45) else None
    if enl and re.search(r'(discharg|died|killed|wounded|captur|resign|deserted|transferred|retired|dropped|promoted)', t[:enl[2]], re.I):
        enl = None      # the first date belongs to an event, not to enlistment ('Recruit. Discharged, 1864.')
    if enl is None and not allow_rank_date:
        # AUDIT: condensed rolls without a leading date ('Nottoway, enlisted 1864'): an 'enlisted <date>' phrase (not re-enlisted) gives the enlistment date
        for mph in re.finditer(r'\b(?:enlisted|enrolled|joined\s+(?:the\s+)?company)\b', t, re.I):
            if re.search(r're-?\s*$', t[max(0, mph.start() - 4):mph.start()], re.I):
                continue
            d2 = find_dates(t[mph.end():mph.end() + 40])
            if d2:
                enl = (d2[0][0], d2[0][1], mph.end() + d2[0][2], mph.end() + d2[0][3])
                flags.append('enlistment-from-phrase')
            break
    if enl:
        res['enlisted'] = enl[0].isoformat() if enl[1] == 'day' else (enl[0].strftime('%Y-%m') if enl[1] == 'month' else str(enl[0].year))
    present, absent, amb = [], [], []
    survived = False    # AUDIT: 'Survived the war. Died in Macon' is a post-war death, not a separation
    for sn in split_sent(t):
        if re.search(r'(surviv\w*\s+the\s+war|served\s+through\s+the\s+war|through\s+the\s+war|until\s+the\s+(?:close|end|surrender)|to\s+the\s+(?:close|end)\s+of\s+the\s+war|close\s+of\s+the\s+war)', sn, re.I):
            survived = True
        if re.search(GBURG, sn, re.I):
            if re.search(r'(not\s+at|absent|on\s+furlough|left\s+behind|before\s+Gettys|did\s+not)', sn, re.I):
                amb.append('Gettysburg mentioned with absence or negation: ' + sn[:110])
            elif re.search(CAS_WORDS, sn, re.I):
                present.append(('CAS-REMARK', sn[:150]))
            elif re.search(r'(color|flag|battle\s+of|engaged|participated|in\s+the\s+fight|present\s+at|took\s+part|served|fought)', sn, re.I):
                present.append(('OFFICER-HISTORY', sn[:150]))
            else:
                amb.append('Gettysburg mentioned without a stated casualty or presence: ' + sn[:110])
            continue
        mv = re.search(SEP_VERB, sn, re.I)
        if not mv:
            continue
        kind = mv.group(1).lower()
        if kind == 'transferred' and not re.search(r'(navy|cavalry|artillery|battery|battalion|legion|regiment|army|corps)', sn, re.I):
            continue
        if kind == 'transferred' and re.search(r'to\s+Company|to\s+Co\.', sn):
            continue
        if survived and kind in ('died', 'death') and not re.search(r'(hospital|disease|smallpox|fever|wounds|wounded|killed|battle)', sn, re.I):
            continue
        if is_postwar(sn) and kind in ('died', 'death', 'killed') and not re.search(r'(hospital|disease|smallpox|fever|wounds|killed\s+at)', sn, re.I):
            continue
        if kind in ('died', 'death') and re.search(r'since', sn, re.I) and not re.search(r'(hospital|disease|smallpox|wounds|fever|camp)', sn, re.I):
            continue
        dated = None
        for dt, prec, a, b in find_dates(sn):
            w = when(dt, prec)
            if w:
                dated = (w, dt, prec)
                break
        if dated and dated[0] == 'before' and re.search(LATER, sn):
            amb.append('date and battle disagree (OCR year?): ' + sn[:110])
        elif dated and dated[0] == 'before':
            absent.append(('SEP-BEFORE', sn[:150]))
        elif dated and dated[0] in ('after', 'during'):
            continue
        else:
            pb = re.search(PRE_BATTLES, sn)
            later = re.search(LATER, sn)
            if later:
                continue
            if pb and kind in ('killed', 'died', 'death'):
                absent.append(('SEP-BEFORE', sn[:150] + ' [battle named; dated before 1 July 1863]'))
            elif kind in ('killed', 'died', 'death', 'discharged', 'resigned', 'retired', 'dismissed', 'deserted', 'dropped', 'disability', 'over age', 'substitute', 'transferred') or kind.startswith('term'):
                amb.append('separation without a date: ' + sn[:110])
    if absent and re.search(r're-?enlist|reenlist|re-?entered|rejoined|returned\s+to\s+(the\s+)?(company|regiment|service)|re-?joined', t, re.I):
        amb.append('separation followed by re-enlistment or return: ' + absent[0][1][:90])
        absent = []
    enl_after = enl is not None and when(enl[0], enl[1]) == 'after'
    if present and enl_after and not absent:
        # a casualty at Gettysburg cannot precede enlistment: the date is read as an OCR/print error, the Gettysburg remark is kept
        res.update(label='Present-Documented', roll_status='named-present', basis_code=present[0][0],
                   basis='remark: ' + present[0][1] + ' [enlistment date printed as ' + res['enlisted'] + ' conflicts: treated as OCR or print error]')
        flags.append('ocr-date-conflict')
    elif present and absent:
        res.update(label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='CONFLICT',
                   basis='the entry disagrees with itself: ' + ' | '.join(x[1] for x in present + absent))
        flags.append('contested')
    elif present:
        res.update(label='Present-Documented', roll_status='named-present', basis_code=present[0][0], basis='remark: ' + present[0][1])
    elif absent:
        res.update(label='Absent-Documented', roll_status='off-roll-before-battle', basis_code='SEP-BEFORE', basis='remark: ' + absent[0][1])
    elif enl_after:
        res.update(label='Absent-Documented', roll_status='not-yet-enlisted', basis_code='ENL-AFTER', basis='enlisted ' + res['enlisted'] + ' (after 3 July 1863)')
    elif amb:
        res.update(label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='OCR-DATE-LOST', basis='; '.join(amb[:2]))
    elif allow_rank_date and not enl and re.search(r'(private|sergeant|corporal|musician|recruit)', t[:30], re.I) and not re.search(r'recruit', t[:30], re.I):
        res.update(label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='OCR-DATE-LOST', basis='no legible enlistment date in the entry')
    else:
        res.update(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS',
                   basis='on the unit roll; no separation dated before 1 July 1863 and no Gettysburg remark; the source gives no status for 30 June 1863')
    return res


def name_flags(name):
    f = []
    letters = re.sub(r'[^A-Za-z]', '', name)
    if re.search(r'[0-9\[\]{}|*^~<>=_\\]', name) or re.search(r'[a-z][A-Z]{2,}', name) or len(letters) < 3:
        f.append('name-garbled')
    return f


def write_csv(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=COLS, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)


def squash(s):
    return re.sub(r'\s+', ' ', s).strip(' -\u2014~_.,')
