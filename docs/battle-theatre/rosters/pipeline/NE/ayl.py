"""New Hampshire: Ayling, Revised Register (1895). Entry splitting, date parsing and event analysis for its abbreviation style."""
import re, datetime, sys, os
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\rosters\NE\scripts')
from rosterlib import GB_START, GB_END, classify_after_battle, GETT, mon_num
import events as ev

MON = r"(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec|Deo|Uec|Dee|Doc|Jnne|Jan|Ang|Juue|Jul|Hec|Fen|Fob|Nay|Mav)"
# '61 style: apostrophe then two year digits; OCR variants '01 for '61, '04 for '64, 'G3 for '63
AD = re.compile(MON + r"\.?\s*(\d{1,2}(?:\.\d)?)?\s*[,\.]?\s*(?:for\s+\d\s+\w+\.?,?\s*)?[\'’‘`\"]\s*([0-9OoGgSsIl][0-9OoGgSsIl\']?[0-9OoGgSsIl]?)", re.I)
ADM = {'dec': 12, 'deo': 12, 'uec': 12, 'dee': 12, 'doc': 12, 'hec': 12, 'ang': 8, 'juue': 6, 'jnne': 6, 'fen': 2, 'fob': 2, 'nay': 5, 'mav': 5}


def ay_month(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if t in ADM:
        return ADM[t]
    return mon_num(tok)


def ay_year(raw):
    r = raw.replace("'", '')
    r = r.replace('O', '0').replace('o', '0').replace('G', '6').replace('g', '6').replace('S', '5').replace('s', '5').replace('I', '1').replace('l', '1')
    if len(r) < 2 or not r[:2].isdigit():
        return None
    a, b = r[0], r[1]
    if a == '0':
        a = '6'
    if a != '6':
        return None
    y = 1860 + int(b)
    return y if 1861 <= y <= 1866 else None


def ay_dates(text):
    out = []
    for m in AD.finditer(text):
        mo = ay_month(m.group(1))
        yr = ay_year(m.group(3))
        if not mo or not yr:
            continue
        dd = m.group(2)
        prec = 'month'
        d = 15
        if dd:
            dd = dd.replace('.', '')
            try:
                d = int(dd)
                prec = 'day'
            except ValueError:
                d = 15
            if not (1 <= d <= 31):
                d, prec = 15, 'month'
        mx = 29 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31
        try:
            out.append((datetime.date(yr, mo, min(d, mx)), prec, m.start(), m.end(), m.group(0)))
        except ValueError:
            pass
    return out


ENTRY = re.compile(r"^(?P<sn>[A-Z][A-Za-z\'\-\.\s]{1,28}?),\s+(?P<gn>[A-Z][A-Za-z\.\s,\'\-]{0,44}?)\.\s+(?P<rest>(?:Co\.|F\.\s?and\s?S|F\.\s?&\s?S|Unas|Band|Non|Field|Reg|Co\s|Un\.|N\.\s?C\.\s?S).*)$")


def seg_kind(seg):
    s = re.sub(r'\s+', ' ', seg.strip()).lower()
    s = re.sub(r'^(and|then)\s+', '', s)
    if re.match(r'(re-?\s?enl|reenl|re-eul|re-eni)', s):
        return 'reenlist'
    if re.match(r'(enl|eul|eni)\b', s):
        return 'enl'
    if re.match(r'(must\.? in|umst\.? in|mast\.? in|must, in)', s):
        return 'must'
    if re.match(r'(app\.|appointed|comm\.|prom\.|promoted)', s):
        return 'comm'
    if re.match(r'(disch|discli|disoh|dis\.? ch|discharged)', s):
        return 'disch'
    if re.match(r'(des\.|desert|dest)', s):
        return 'deserted'
    if re.match(r'(dismiss|dism\.|cashier|dropped|drop\.)', s):
        return 'dismiss'
    if re.match(r'(res\.\s+[a-z]{3,}\.?\s+\d)', s) or re.match(r'(resigned|res\.\s*,)', s):
        return 'resign'
    if re.match(r'(died|dead|drowned)', s):
        return 'died'
    if re.match(r'(k\.|killed|k\. in)', s):
        return 'killed'
    if re.match(r'(must\.? out|mus?t\.? out)', s):
        return 'mustout'
    if re.match(r'(tr\. from|trans\. from|transf\. from)', s):
        return 'transf_in'
    if re.match(r'(tr\.|trans|transf|transferred)', s):
        return 'transf_out'
    if re.match(r'(wd\.|wounded|sev\. wd|wd,)', s):
        return 'wounded'
    if re.match(r'(captd|captured|mis\.|missing|par\.|paroled|ex\.|exch|pris)', s):
        return 'prisoner'
    if re.match(r'(see\b)', s):
        return 'see'
    return 'other'


OTHER_UNIT = re.compile(r"(N\.\s?H\.|Art\.|Cav\.|Inf\.|V\.\s?R\.\s?C|Navy|Marine|U\.\s?S\.|Mass|Me\.|Vt\.|Conn|N\.\s?Y|Vols|Regt|Reg\.|Batt|Corps|Miscel|Sharp|Signal|Brig|Hosp|Engr|[0-9]+\s+[A-Z])", re.I)


def postwar(seg):
    """True when the segment's year is 1867 or later (post-service death, late discharge) or it is an address"""
    ys = re.findall(r"['’‘`]\s*([0-9OoGgSsIl][0-9OoGgSsIl])", seg)
    if not ys:
        return False
    for y in ys:
        yy = y.replace('O', '0').replace('o', '0').replace('S', '5').replace('s', '5').replace('I', '1').replace('l', '1').replace('G', '6').replace('g', '6')
        if yy.isdigit() and int(yy) >= 67:
            return True
    return False


def analyse(text):
    t = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)       # undo hyphenation (keeps 're- enl.' joined as re-enl)
    t = re.sub(r'\s{4,}', ' || ', t)
    t = re.sub(r'\s+', ' ', t)
    parts = t.split(' || ')
    service = parts[0]
    post = parts[1:]
    # sentences after '||' that start with Died are service-time deaths only if dated before 1866
    segs = [x.strip() for x in service.split(';') if x.strip()]
    for pp in post:
        if re.match(r'\s*(Died|Killed)', pp):
            segs.append(pp.strip())
    facts = dict(E=None, E_prec=None, E_raw=None, E_kind=None, sep=[], gett_cas=[], cas_in_window=[], events=[], unreadable=[],
                 intra_out=None, intra_in=False, other_from=None, wounded_1863_noplace=False, returned_after_sep=False,
                 nodate_sep=[], segs=segs, xref_only=False)
    body = re.sub(r'^(Co\.\s*[A-Z]|F\.\s?and\s?S\.?|Unas\'?d\.?|Band|Non[\- ]?com\.?\s*staff)\s*[\.;]?', '', segs[0] if segs else '').strip()
    if re.fullmatch(r"\s*See\b.*", body) and len(segs) == 1:
        facts['xref_only'] = True
    for seg in segs:
        kind = seg_kind(seg)
        if kind == 'see':
            continue
        if postwar(seg):
            continue
        dts = ay_dates(seg)
        has_g = bool(GETT.search(seg))
        facts['events'].append((kind, seg, dts))
        if has_g:
            if kind in ('deserted', 'disch', 'resign', 'mustout', 'transf_out', 'dismiss') and dts and dts[0][0] < GB_START:
                facts.setdefault('gett_conflict', []).append((kind, seg))
            else:
                facts['gett_cas'].append((kind, seg))
        for d, prec, a, b, raw in dts:
            if kind in ('wounded', 'prisoner', 'killed') or (kind == 'died' and re.search(r'wd|wound', seg, re.I)):
                if GB_START <= d <= GB_END and prec == 'day':
                    facts['cas_in_window'].append((kind, d, seg))
        if kind == 'wounded' and not dts and not has_g:
            facts['wounded_1863_noplace'] = False
        if kind in ('enl', 'must', 'comm', 'transf_in') and facts['E'] is None:
            if kind == 'transf_in':
                if not OTHER_UNIT.search(re.sub(r'tr\.?\s*from', '', seg, flags=re.I)):
                    facts['intra_in'] = True
                    continue
                facts['other_from'] = seg
            if dts:
                d, prec, a, b, raw = dts[0]
                facts['E'], facts['E_prec'], facts['E_raw'], facts['E_kind'] = d, prec, raw, kind
        if kind in ('disch', 'resign', 'dismiss', 'deserted', 'died', 'killed', 'mustout', 'transf_out'):
            if kind == 'transf_out':
                rest = re.sub(r'^(tr\.|trans\.|transf\.|transferred)\s*(to)?', '', seg.strip(), flags=re.I)
                if re.match(r"\s*Co\.\s*[A-K]\b[^A-Za-z]*(,|\.|$)", rest) or re.match(r"\s*(Co\.\s*)?[A-K]\s*(,|\.|$)", rest):
                    facts['intra_out'] = dts[0][0] if dts else True
                    continue
            if kind in ('killed', 'died') and has_g:
                continue
            if dts:
                d, prec, a, b, raw = dts[0]
                facts['sep'].append((kind, d, prec, seg))
            else:
                from rosterlib import year_only
                yy = [y for y in [ay_year(m.group(1)) for m in re.finditer(r"[\'’‘`]([0-9OoGgSsIl][0-9OoGgSsIl])", seg)] if y]
                if yy:
                    y = min(yy)
                    if y <= 1862:
                        facts['sep'].append((kind, datetime.date(y, 12, 31), 'year', seg))
                    elif y == 1863:
                        facts['unreadable'].append((kind, seg))
                else:
                    facts['nodate_sep'].append((kind, seg))
    # E fallback: 'must. in' elsewhere or any date at all
    if facts['E'] is None:
        for kind, seg, dts in facts['events']:
            if kind in ('enl', 'must') and not dts:
                yy = [y for y in [ay_year(m.group(1)) for m in re.finditer(r"[\'’‘`]([0-9OoGgSsIl][0-9OoGgSsIl])", seg)] if y]
                if yy:
                    facts['E'], facts['E_prec'], facts['E_raw'], facts['E_kind'] = datetime.date(yy[0], 1, 1), 'year', str(yy[0]) + ' (month unreadable)', kind
                    break
    # return after separation
    if facts['sep']:
        s0 = facts['sep'][0]
        idx = [i for i, e in enumerate(facts['events']) if e[1] == s0[3]]
        if s0[0] in ('deserted', 'dismiss', 'disch'):
            early = False
            anyr = False
            for e in facts['events'][idx[0] + 1:] if idx else []:
                if re.search(r"(voluntarily returned|returned|rejoined|apprehended|apprehd|apprch|restored|surrendered|reinstated|sent to regt|joined)", e[1], re.I):
                    anyr = True
                    if not e[2] or e[2][0][0] <= GB_END:
                        early = True
            facts['returned_after_sep'] = early
            facts['returned_late'] = anyr and not early
    return facts
