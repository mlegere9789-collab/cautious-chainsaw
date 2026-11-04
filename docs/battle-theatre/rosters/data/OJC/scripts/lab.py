"""Presence labelling for OJC rosters (PLAN section 2.2 rules; remark-text based).
Pure functions, standard library only.  Labels: Present-Documented, Absent-Documented, Unknown.
Every returned label carries a basis code and a plain-words basis; nothing is inferred from a roll alone.
"""
import re, datetime

GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'mch': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'ang': 8,
          'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12, 'julv': 7, 'jnly': 7, 'juue': 6, 'june': 6, 'july': 7, 'sept': 9, 'mav': 5, 'mai': 5, 'jau': 1, 'fob': 2, 'deo': 12, 'dee': 12}
MON_RE = re.compile(r"\b(Jan|Feb|Mar|Mch|Apr|May|Jun|Jul|Aug|Ang|Sep|Oct|Nov|Dec)[a-z]{0,6}\b\.?", re.I)
TAIL_RE = re.compile(r"""^\s*(?P<d>\d{1,2})?\s*(?:st|nd|rd|th|d)?\s*(?:[,\.]\s*|/)?\s*['‘’"`“”]*\s*(?P<y>[1Iil!][8S][6GCc0O(g\[][0-9OIlSGi]|18\d\d|[0-9OoIl°£(G]{2})?(?![0-9])""")

# casualty words
GETT_RE = re.compile(r"Gett?ys\W{0,3}b|Get\W{0,3}tys|Gett?[yv]?s?[b6]|\w{0,2}etty\W?s\W?b|ttysb|tysbu|ysburg|ysbnr|ysbur|ettvsb|Get\W?tys|Gettys|Gettvs|Gettyb|Gett\w{0,3}b\w?rg|Gettis|Gettsb|Gcttys|Gettysbnrg|Gctt", re.I)
CAS_RE = re.compile(r"kill|k\.\s*in|\bk\.\s*i\.|\bwd\b|\bwd\.|wound|\bwds\b|\bwnd|captur|prison|\bpris|missing|\bmiss\.|taken", re.I)
DIED_RE = re.compile(r"\bdied\b|\bd\.\s|\bdeath\b|\bdec'?d\b", re.I)
SEP_RE = re.compile(r"discharg|\bdisch|\bdis\.|resign|dismiss|deserted|\bdes\.|\bdropped|\bdied\b|\bdeath\b|killed|\bk\.\s*in|mustered out|\bmust\.?\s*out|\bm\.\s*o|\bm\. out|transf\w*|\btr\.|\btrans\.|v\. ?r\. ?c|veteran reserve|invalid corps|inv\. corps|honorably|\bhon\.|cashiered|\bexpelled|not mustered|\bto navy|navy|\bdrowned|accidentally\s+(?:killed|shot|drowned)|\bexecuted|\bsuicide|promoted\s+to\s+(?:Brig\w*\.?|Maj\w*\.?)\s*Gen\w*|promoted\s+to\s+[A-Za-z\.,' ]{3,30}?\s+\d{1,3}(?:st|d|nd|rd|th)\s+(?:O\.?\s*V\.?\s*[ICA]|U\.?\s*S|Reg|N\.\s*J|Conn)\w*\.?", re.I)
RET_RE = re.compile(r"returned|rejoined|re-?joined|ret'?d|re-?instated|restored|reappointed|re-?appointed|\bret\.|reported|revoked|rescind|re-?enlisted|re-?enl|\bre-?turned", re.I)
SAME_REG_TR = re.compile(r"\bCo\.\s*[A-K]\b|company\s+[A-K]\b|\bto Co\b|\bfrom Co\b", re.I)


_CASW = ('killed', 'wounded', 'captured', 'missing', 'wounds', 'prisoner')


def cas_positions(s):
    """AUDIT: start offsets of casualty words, exact (CAS_RE) or fuzzy (OCR: 'iilled', 'Wouuded', 'Raptured', 'Mis,sing', 'Cajitured')."""
    import difflib
    pos = [m.start() for m in CAS_RE.finditer(s)]
    for m in re.finditer(r"[A-Za-z][A-Za-z'.,\-]{3,12}", s):
        w = re.sub(r"[^a-z]", '', m.group(0).lower())
        if len(w) < 5 or len(w) > 10:
            continue
        if any(abs(m.start() - p) < 3 for p in pos):
            continue
        if max(difflib.SequenceMatcher(None, w, c).ratio() for c in _CASW) >= 0.74:
            pos.append(m.start())
    return sorted(pos)


def norm_year(tok):
    if tok is None:
        return None
    t = tok.strip()
    if len(t) == 4 and re.fullmatch(r"[1Iil!][8S][6GCc0O(g\[][0-9OIlSGi]", t):
        d = {'0': 0, 'O': 0, '1': 1, 'I': 1, 'l': 1, 'i': 1, '2': 2, '3': 3, '4': 4, '5': 5, 'S': 5, '6': 6, 'G': 6}.get(t[3])
        if d is not None and 0 <= d <= 6 and not (t[2] in '6' and False):
            y = 1860 + d
            if t[2] == '6' and t[3].isdigit() and 0 <= int(t[3]) <= 6:
                y = 1860 + int(t[3])
            return y if 1861 <= y <= 1866 else None
        return None
    if len(t) == 2:
        a, b = t[0], t[1]
        a = {'6': 6, '0': 6, 'O': 6, 'o': 6, 'G': 6, '(': 6, '°': 6, '£': 6, 'b': 6}.get(a)
        b = {'0': 0, 'O': 0, 'o': 0, '1': 1, 'I': 1, 'l': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6}.get(b)
        if a is None or b is None:
            return None
        if b == 0 and False:
            return None
        return 1860 + b
    return None


OCRM = {'fell': 'Feb', 'feh': 'Feb', 'fcb': 'Feb', 'fob': 'Feb', 'fel': 'Feb', 'fet': 'Feb', 'frb': 'Feb', 'dei': 'Dec', 'dee': 'Dec', 'deo': 'Dec', 'dcc': 'Dec', 'dec': 'Dec',
        'jnlv': 'July', 'julv': 'July', 'jnly': 'July', 'jidy': 'July', 'jaly': 'July', 'jnne': 'June', 'juno': 'June', 'jmie': 'June', 'juue': 'June', 'jime': 'June', 'junc': 'June',
        'ang': 'Aug', 'auo': 'Aug', 'aiig': 'Aug', 'ail': 'Aug', 'auj': 'Aug', 'aug': 'Aug', 'mav': 'May', 'mai': 'May', 'mny': 'May', 'sc1': 'Sept', 'scpt': 'Sept', 'sepl': 'Sept', 'sepi': 'Sept', 'siept': 'Sept',
        'sc1t': 'Sept', 'sept': 'Sept', 'ocl': 'Oct', 'oet': 'Oct', 'oc': 'Oct', 'nuv': 'Nov', 'noy': 'Nov', 'novr': 'Nov', 'ian': 'Jan', 'jau': 'Jan', 'jun': 'June', 'mch': 'Mar', 'marcli': 'March', 'aprd': 'Apr', 'apiil': 'April', 'apr': 'Apr'}
_OCRM_RE = re.compile(r"(?<![A-Za-z])(" + '|'.join(sorted(OCRM, key=len, reverse=True)) + r")(?![A-Za-z])[\.,:\"']{0,2}(?=\s*[0-9OIlS°:!°]{1,3}[,\.\s]{0,3}['‘’\"`]?\s*[0-9OGl(6°']{1,4})", re.I)


def fix_ocr_months(text):
    return _OCRM_RE.sub(lambda m: OCRM[m.group(1).lower()] + '.', text)


def find_dates(text):
    text = fix_ocr_months(text)
    """Return list of dicts: month, day (or None), year (or None), start, end, date (datetime.date or None)."""
    out = []
    for m in MON_RE.finditer(text):
        mon = MONTHS.get(m.group(1).lower()[:3]) or MONTHS.get(m.group(1).lower())
        if not mon:
            continue
        # do not treat 'Mar' in 'March' ok; but skip things like 'Mayor'
        word = re.match(r"[A-Za-z]+", text[m.start():]).group(0)
        if word.lower() not in ('jan', 'january', 'feb', 'february', 'mar', 'march', 'mch', 'apr', 'april', 'may', 'jun', 'june', 'jul', 'july',
                                'aug', 'august', 'ang', 'sep', 'sept', 'september', 'oct', 'october', 'nov', 'november', 'dec', 'december',
                                'julv', 'jnly', 'juue', 'augt', 'octr', 'novr', 'mav', 'mai', 'jau', 'fob', 'deo', 'dee', 'janv', 'febv'):
            continue
        tail = text[m.end():m.end() + 24]
        tm = TAIL_RE.match(tail)
        day = yr = None
        if tm:
            if tm.group('d'):
                day = int(tm.group('d'))
                if not 1 <= day <= 31:
                    day = None
            yr = norm_year(tm.group('y'))
        if not yr:
            win = re.split(r"[A-Za-z]{3,}", tail)[0][:20]
            ym = re.search(r"['‘’`\"]\s*([0-9OoIl(G6£°!]{2})(?![0-9])", win) or re.search(r"/\s*([0-9OoIl]{2})(?![0-9])", win) or re.search(r"\b(18[56]\d)\b", win)
            if ym:
                y2 = norm_year(ym.group(1))
                if y2:
                    yr = y2
                    if not day:
                        dm = re.match(r"\s*(\d{1,2})(?!\d)", win)
                        if dm and 1 <= int(dm.group(1)) <= 31 and dm.end() <= ym.start():
                            day = int(dm.group(1))
        if not (day and yr):
            tail2 = re.sub(r"(?<=\d)\s+(?=\d)", '', tail)
            if tail2 != tail:
                tm2 = TAIL_RE.match(tail2)
                if tm2 and tm2.group('d') and tm2.group('y'):
                    d2 = int(tm2.group('d')); y2 = norm_year(tm2.group('y'))
                    if 1 <= d2 <= 31 and y2:
                        tm, day, yr = tm2, d2, y2
        d = None
        if day and yr:
            try:
                d = datetime.date(yr, mon, day)
            except ValueError:
                try:
                    d = datetime.date(yr, mon, min(day, 28))
                except ValueError:
                    d = None
        out.append(dict(month=mon, day=day, year=yr, start=m.start(), end=m.end() + (tm.end() if tm else 0), date=d))
    return out


def segments(text):
    # AUDIT: split on a semicolon only when a word follows (an OCR year such as '186:;,' holds a stray semicolon and used to cut the clause in two)
    segs = re.split(r"\s*;(?=\s*[A-Za-z]{3})\s*|\s{2,}", text)
    return [s.strip() for s in segs if s and s.strip()]


def classify(remark, enl=None, enl_note='', section='', ctx=None):
    """remark: remark text (ditto-resolved). enl: datetime.date of enlistment/muster-in or None.
    Returns dict(label, roll_status, code, basis, flags, events)."""
    ctx = ctx or {}
    flags = []
    t = re.sub(r"\s+", ' ', remark or '').strip()
    events = []
    gett = bool(GETT_RE.search(t))
    # --- rule 2: casualty or capture at Gettysburg
    cas_seg = None
    segs_all = segments(t) or [t]
    for s in segs_all:
        gm = GETT_RE.search(s)
        if gm:
            for cp in cas_positions(s):
                if abs(cp - gm.start()) <= 110:
                    cas_seg = s
                    break
        if cas_seg:
            break
    if not cas_seg:
        # a casualty word immediately followed by a date inside 1-3 July 1863 (no place named)
        for s in segs_all:
            for cm in CAS_RE.finditer(s):
                w = s[cm.end():cm.end() + 48]
                sm = SEP_RE.search(w)
                if sm:
                    w = w[:sm.start()]
                dl = [d for d in find_dates(w) if d['year'] or d['day']]
                if dl and dl[0]['date'] and GB_START <= dl[0]['date'] <= GB_END:
                    cas_seg = s
                    break
            if cas_seg:
                break
    if cas_seg:
        # a casualty dated before the battle cannot be this battle if the text names another place and no Gettysburg
        return dict(label='Present-Documented', roll_status='named-present', code='CAS-REMARK',
                    basis='remark names a casualty/capture at Gettysburg or dated 1-3 July 1863: ' + cas_seg[:110], flags=flags, events=['gettysburg-casualty'])
    # --- Gettysburg named with no casualty word: hospital / burial after the battle
    if gett and re.search(r"Nat\.?\s*Cem|National\s+Cem|Soldiers'?\s+Nat", t, re.I) and re.search(r"Gett|Sec\.|Grave", t, re.I):
        return dict(label='Present-Documented', roll_status='named-present', code='POW-BURIAL',
                    basis="burial in the Soldiers' National Cemetery at Gettysburg named in remark: " + t[:100], flags=flags, events=['gettysburg-burial'])
    if gett:
        flags.append('gettysburg-named-no-casualty')
    # --- separation before the battle (rule 7)
    sep_before = None
    sep_unclear = None
    ret = bool(RET_RE.search(t))
    ms = list(SEP_RE.finditer(t))
    for i, m in enumerate(ms):
        start = m.end()
        nxt = ms[i + 1].start() if i + 1 < len(ms) else len(t)
        window = t[start:min(nxt, start + 80)]
        verb_ctx = t[max(0, m.start() - 12):start + 25]
        # transfer between companies of the same regiment is not a separation
        if re.match(r"^(tr|transf\w*|trans)\b", m.group(0), re.I) and re.match(r"^\.?\s*(back\s+)?(to|from)?\s*(Co\b|company\b)", t[start:start + 18], re.I):
            continue
        if re.match(r"^\W*(to|from)?\s*Co\.?\s*[A-K]\b", t[start:start + 14], re.I) and re.match(r"^(tr|transf\w*|trans)", m.group(0), re.I):
            continue
        if re.search(r"(pro\.?|promoted|prom\.?)\s*$", t[max(0, m.start() - 12):m.start()], re.I) and re.match(r"^(dis|resign|desert)", m.group(0), re.I) is None:
            continue
        ds = [d for d in find_dates(window) if d['date'] or d['year']]
        if ds:
            d = ds[0]
            dt = d['date'] or (datetime.date(d['year'], d['month'], 15) if d['year'] else None)
            if dt and dt < GB_START and sep_before is None:
                # AUDIT: the dates written before the separation verb (promotions, appointments) cannot be later than the separation; if they are,
                # the separation year is an OCR misread ('64' read as '61'): no label from it
                prior = [p['date'] for p in find_dates(t[:m.start()]) if p['date']]
                if prior and dt < max(prior) - datetime.timedelta(days=20):
                    sep_unclear = sep_unclear or t[m.start():min(len(t), m.start() + 70)]
                    flags.append('separation-date-before-earlier-date-in-remark')
                    continue
                sep_before = (t[m.start():min(len(t), m.start() + 70)], dt, d['date'] is None)
        else:
            yo = re.search(r"\b(18\d\d)\b", window)
            if yo and int(yo.group(1)) < 1863 and sep_before is None:
                sep_before = (t[m.start():min(len(t), m.start() + 70)], datetime.date(int(yo.group(1)), 6, 15), True)
            elif not yo and sep_unclear is None and re.match(r"(discharg|\bdisch|\bdis\.|resign|dismiss|deserted|died|death|killed|mustered out|must\.? out|\bm\. out)", m.group(0), re.I):
                sep_unclear = t[m.start():min(len(t), m.start() + 70)]
    if sep_before and enl is not None and sep_before[1] < enl:
        # the separation date precedes the legible enlistment date: one of the two years is an OCR misread
        if enl > GB_END:
            flags.append('sep-date-before-enlistment-ignored')
            return dict(label='Absent-Documented', roll_status='not-yet-enlisted', code='ENL-AFTER',
                        basis='mustered in %s, after the battle (the separation date in the remark precedes it and is treated as an OCR misread)' % enl.isoformat(), flags=flags, events=[])
        flags.append('date-order-conflict')
        return dict(label='Unknown', roll_status='unreadable-or-ambiguous', code='CONFLICT',
                    basis='separation date precedes enlistment date (OCR year misread): ' + sep_before[0], flags=flags, events=[])
    if sep_before and not ret:
        return dict(label='Absent-Documented', roll_status='off-roll-before-battle', code='SEP-BEFORE',
                    basis='separation dated before 1 July 1863: ' + sep_before[0] + (' (day not legible)' if sep_before[2] else ''),
                    flags=flags + (['date-partial'] if sep_before[2] else []), events=['sep-before'])
    if sep_before and ret:
        flags.append('separation-before-but-return-noted')
        return dict(label='Unknown', roll_status='on-roll-undetermined', code='CONFLICT',
                    basis='remark shows a separation before the battle and also a return/re-enlistment: ' + t[:110], flags=flags, events=[])
    # --- enlisted after the battle (rule 8)
    if enl is not None and enl > GB_END:
        return dict(label='Absent-Documented', roll_status='not-yet-enlisted', code='ENL-AFTER',
                    basis='mustered in %s, after the battle%s' % (enl.isoformat(), (' (' + enl_note + ')') if enl_note else ''), flags=flags, events=[])
    # --- rule 12/13
    if enl is None:
        return dict(label='Unknown', roll_status='unreadable-or-ambiguous', code='OCR-DATE-LOST',
                    basis='no legible muster/enlistment date%s' % ((' (' + enl_note + ')') if enl_note else ''), flags=flags + ['no-enlist-date'], events=[])
    if sep_unclear:
        flags.append('separation-without-legible-date')
        return dict(label='Unknown', roll_status='unreadable-or-ambiguous', code='OCR-DATE-LOST',
                    basis='separation recorded but its date is not legible: ' + sep_unclear, flags=flags, events=[])
    return dict(label='Unknown', roll_status='on-roll-undetermined', code='ONROLL-NO-STATUS',
                basis='on the roll (mustered %s), no separation before the battle, no source placing him at Gettysburg%s' % (enl.isoformat(), (' (' + enl_note + ')') if enl_note else ''),
                flags=flags, events=[])


if __name__ == '__main__':
    tests = [
        ("Killed July 3, 1863, Gettysburg, Pa.", None),
        ("Died Aug. 14, '63, of wds. rec'd at Gettysburg.", None),
        ("Discharged, disability, April 29, 1863.", None),
        ("Mustered out May 31, '65, Alexandria, Va.", None),
        ("Wd. June 18/64. M. out May 31/65.", None),
        ("Killed in action at Gettysburg, Pa., July 2, '63; buried at Nat. Cemetery", None),
        ("Deserted Sept. 9, 1862; returned Feb 1863", None),
        ("Tr. to Co. B Jan 1863", None),
        ("Died at Richmond, Va.", None),
        ("Died Feb. 28, 1864, of wds. rec'd at Morton's F.", None),
        ("Wounded July 2, 1863; Disch. March 4, 1864", None),
        ("Resigned Dec. 20, 1862.", None),
    ]
    for t, e in tests:
        r = classify(t, enl=datetime.date(1862, 8, 1))
        print(r['label'], r['code'], '|', t)
    print(find_dates("Disch. Nov. 27, '01 and May 3, '63, Aug 25/64, Nov., 1864, Jan. 20/64 and 'tuL-Yug. 20"))
