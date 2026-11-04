"""NY family: parse and label entries of the New York Adjutant General's Registers (1893-1905 series).

Input: text of a register (one unit), entries of the form
  SURNAME, GIVEN.--Age, 31 years. Enlisted, August 8, 1862, at X, to serve three years; mustered in as
  private, Co. E, August 18, 1862; wounded in action, July 2, 1863, at Gettysburg, Pa.; discharged ...
or, for men who came in by transfer,
  SURNAME, GIVEN.--Private, Co. F, Thirtieth Infantry; transferred to Co. E, this regiment, May 25, 1863; ...
Python 3.11, standard library only. Run with -I -X utf8.

Rules follow rosters/PLAN.md section 2.2 (first rule that fires wins; conflicts are carried, never resolved).
"""
import re, datetime, difflib, calendar

MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)

# ---------------------------------------------------------------- dates (OCR tolerant)

_DIGIT_FIX = str.maketrans({'G': '6', 'g': '6', 'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1', 'S': '5', 's': '5', 'B': '8', ';': '', '^': '', ' ': '', '.': '', ',': ''})
_ABBR = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12}


def month_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if len(t) < 3:
        return None
    for i, m in enumerate(MONTHS):
        if t == m:
            return i + 1
    if t in _ABBR:
        return _ABBR[t]
    rs = sorted(((difflib.SequenceMatcher(None, t, m).ratio(), i + 1) for i, m in enumerate(MONTHS)), reverse=True)
    best, bi = rs[0]
    second = rs[1][0]
    if best >= 0.78:
        return bi
    if best >= 0.64 and best - second >= 0.12 and t[0] == MONTHS[bi - 1][0]:
        return bi
    return None


DATE_RX = re.compile(r"([A-Za-z]{3,10})\.?\s*,?\s*(?:[^\w\s]{1,2}\s*)?(\d{1,2}|[0-9lIO]{1,2})(?:\s*[-–]\s*\d{1,2})?[\s,\.•]*([1lI]\s?[8S]\s?[0-9GOlISB]\s?[0-9GOlISB]\b|[0-9GOlISB][\.•]?[0-9GOlISB][0-9GOlISB][\.•]?[0-9GOlISB]\b)")
MONTH_YEAR_RX = re.compile(r"([A-Za-z]{3,10})\.?\s*,?\s*([1lI]\s?[8S]\s?[0-9GOlISB]\s?[0-9GOlISB]\b)")


def parse_year(s):
    """(year, repaired). Plausible war years 1861-1866 pass. The ABBYY layer often reads the 6 of 186x as 0
    (1802, 1805): such a year is repaired to 186x and flagged; chronology is checked later in parse_body.
    Anything else (1860, 1870, 1S0) -> (None, False)."""
    t = re.sub(r'[\s\.•,;^]', '', s)
    if len(t) != 4:
        return None, False
    pos = [{'l': '1', 'I': '1'}, {'S': '8', 'B': '8', 'o': '0', 'O': '0'}, {'G': '6', 'g': '6', 'S': '5', 'O': '0', 'o': '0', 'l': '1', 'I': '1', 'B': '8'}, {'G': '6', 'g': '6', 'S': '5', 'O': '0', 'o': '0', 'l': '1', 'I': '1', 'B': '8'}]
    t = ''.join(pos[i].get(ch, ch) for i, ch in enumerate(t))
    if not t.isdigit():
        return None, False
    y = int(t)
    if 1861 <= y <= 1866:
        return y, False
    if 1801 <= y <= 1805:
        return y + 60, True
    return None, False


def find_dates(clause):
    """list of dict(date, prec, start, end, bad); bad=True when day and month read but the year is not plausible."""
    out = []
    used = []
    for m in DATE_RX.finditer(clause):
        mo = month_of(m.group(1))
        if not mo:
            continue
        y, rep = parse_year(m.group(3))
        d = m.group(2)
        d = int(d.translate(_DIGIT_FIX)) if re.fullmatch(r'[0-9lIO]{1,2}', d) else None
        if d is None or not (1 <= d <= 31):
            continue
        if y is None:
            out.append(dict(date=None, prec='day', start=m.start(), end=m.end(), bad=True, month=mo, repaired=False))
        else:
            maxd = calendar.monthrange(y, mo)[1]
            out.append(dict(date=datetime.date(y, mo, min(d, maxd)), prec='day', start=m.start(), end=m.end(), bad=False, month=mo, repaired=rep))
        used.append((m.start(), m.end()))
    for m in MONTH_YEAR_RX.finditer(clause):
        if any(a <= m.start() < b for a, b in used):
            continue
        mo = month_of(m.group(1))
        y, rep = parse_year(m.group(2))
        if mo and y:
            out.append(dict(date=datetime.date(y, mo, 1), prec='month', start=m.start(), end=m.end(), bad=False, month=mo, repaired=rep))
    out.sort(key=lambda x: x['start'])
    return out


# ---------------------------------------------------------------- PDF text (museum ABBYY layer) normalisation

_RUN_RX = re.compile(r'(?<![A-Za-z])(?:[A-Za-z] ){2,}[A-Za-z](?![A-Za-z])')


def squash_runs(line):
    """ABBYY text of the museum PDFs is letter-spaced in places: 'A p r i l' -> 'April'."""
    return _RUN_RX.sub(lambda m: m.group(0).replace(' ', ''), line)


ORD_WORDS = set('ONE HUNDRED AND FIRST SECOND THIRD FOURTH FIFTH SIXTH SEVENTH EIGHTH NINTH TENTH ELEVENTH TWELFTH THIRTEENTH FOURTEENTH FIFTEENTH SIXTEENTH SEVENTEENTH EIGHTEENTH NINETEENTH TWENTIETH TWENTY THIRTY FORTY FIFTY SIXTY SEVENTY EIGHTY NINETY THIRTIETH FORTIETH FIFTIETH SIXTIETH SEVENTIETH EIGHTIETH NINETIETH HUNDREDTH INFANTRY CAVALRY ARTILLERY BATTERY REGIMENT VOLUNTEERS RIFLES MOUNTED INDEPENDENT LIGHT HEAVY VETERAN BATTALION AMD ANT'.split())


def is_page_furniture(line):
    s = line.strip()
    if not s:
        return True
    if re.fullmatch(r'\d{1,4}', s):
        return True
    sq = re.sub(r'[^A-Za-z]', '', s).upper()
    letters = [c for c in s if c.isalpha()]
    upper_ratio = sum(1 for c in letters if c.isupper()) / max(1, len(letters))
    if (sq.startswith(('REPORTOFTHE', 'REPORTOPTHE', 'REPORTOFTHF')) or ('ADJUTANT' in sq and 'GENERAL' in sq)) and len(sq) < 45:
        return True
    if upper_ratio > 0.9 and len(sq) < 70 and re.search(r'(INFANTRY|CAVALRY|ARTILLERY|BATTERY|VOLUNTEERS|RIFLES)$', sq) and ',' not in s:
        return True
    if upper_ratio > 0.9 and ',' not in s and len(s) < 70:
        words = [w for w in re.split(r'[\s\-]+', re.sub(r'[^A-Za-z\- ]', ' ', s).upper()) if w]
        if words and all(w in ORD_WORDS for w in words):
            return True
    return False


def pdf_text_to_register_text(pages):
    out = []
    for pn, pg in enumerate(pages):
        out.append('⟦p%d⟧' % pn)
        for ln in pg.split('\n'):
            ln = squash_runs(ln)
            ln = re.sub(r'\s+', ' ', ln).strip()
            if is_page_furniture(ln):
                continue
            out.append(ln)
    return '\n'.join(out)


# ---------------------------------------------------------------- entry splitting (stream: entries may share a line)

_RANKS = r"(?:Age|Private|Corporal|Sergeant|Musician|Wagoner|Artificer|Captain|Lieutenant|Colonel|Major|Quartermaster|Surgeon|Chaplain|Adjutant|First|Second|Hospital|Saddler|Blacksmith|Farrier|Bugler|Trumpeter|Drummer|Fifer|Mechanic|Teamster|Commissary|Assistant|Veteran|Enlisted|Ehlisted|Enlist|Mustered|Commissioned|Com\.)"
_LEAD = r"(?<![A-Za-z])"
# AUDIT 2026-10-30 (see data/NY/AUDIT.md, defects D1-D3): the surname may carry a prefix that is not all capitals in the
# printed Register (McARTHER, MeDERMOTT, O'ROURKE, D'ARCY); the given-name field may be "JR., GIVEN"; OCR leaves a few
# lower-case letters inside the given names (RLlBEN, ElWARD). Before the audit these headers were not recognised, so the
# entry was glued onto the previous man (about 1,500 men lost, their remarks read as the previous man's).
_PFX = r"(?:[ODL]\s?['`‘’]\s?|M[ce](?=[A-Z]{2})|Mac(?=[A-Z]{2}))?"
HEADER_RX = re.compile(
    _LEAD + r"(" + _PFX + r"[A-Z][A-Z]['`\-A-Z0-9]*[a-z]{0,2}(?: [A-Z][A-Z'`\-]{1,}){0,2})\s?,\s?[^\w\s]{0,2}\s?"
    r"((?:(?:JR|SR|Jr|Sr)\.?\s?,\s?)?[A-Z][A-Za-z\.'`\- ]{0,40}?(?:,\s?(?:JR|SR|Jr|Sr)\.?)?)\s?[\.,]?\s?[—–\-�~=]{1,3}\s?(?=" + _RANKS + r")")
XREF_RX = re.compile(_LEAD + r"(" + _PFX + r"[A-Z][A-Z'`\-]{1,}(?: [A-Z][A-Z'`\-]{1,}){0,2})\s?,\s?(?:([A-Z][A-Z\.'` ]{0,30}),\s?)?see\s+([A-Z][A-Za-z'`\-]+(?:,\s?[A-Z][A-Za-z\. ]{0,30})?)\s?\.")


# fallback header: the text layer garbles letters of the name (iSANDFORD, DEiNISTON, McOHESOSrEY, MoTAGGART). Used only where the strict header found
# nothing (inside the body of the previous entry), and only when the surname keeps at least 4 capitals and at most 2 other letters.
HEADER_RX2 = re.compile(
    _LEAD + r"([A-Za-z][A-Za-z'`\-0-9]{2,}(?: [A-Z][A-Z'`\-]{1,})?)\s?,\s?[^\w\s]{0,2}\s?"
    r"([A-Za-z][A-Za-z\.'`\- ]{0,40}?(?:,\s?(?:JR|SR|Jr|Sr)\.?)?)\s?[\.,]?\s?[—–\-�~=]{1,3}\s?(?=" + _RANKS + r")")


def _header2_ok(m):
    sn, gv = m.group(1), m.group(2)
    up = sum(1 for c in sn if c.isupper())
    lo = sum(1 for c in sn if c.islower())
    return up >= 4 and lo <= 2 and sum(1 for c in gv if c.islower()) <= 3 and any(c.isupper() for c in gv)


def _header_ok(m):
    """given-name field: at most 3 lower-case letters (OCR residue); otherwise the match is prose, not a header"""
    return sum(1 for c in m.group(2) if c.islower()) <= 3


FURN_RX = re.compile(r'(?:R[EB]PO[RB]T)\s?O[FP]\s?THE\s?AD[JI]UTANT\s?-?\s?GENERAL\s?\.?')
PM_RX = re.compile('⟦p(\\d+)⟧')


def _norm_surname(sn):
    """O ' ROURKE -> O'ROURKE (the museum text layer spaces the apostrophe)"""
    return re.sub(r"\s?['`‘’]\s?", "'", sn)


def strip_ord_prefix(surname):
    """page-header fragments such as 'ANDFORTIETH' glued in front of a surname"""
    toks = surname.split(' ')
    words = sorted(ORD_WORDS, key=len, reverse=True)

    def all_ord(tok):
        while tok:
            for w in words:
                if tok.startswith(w):
                    tok = tok[len(w):]
                    break
            else:
                return False
        return True
    while len(toks) > 1 and all_ord(toks[0]):
        toks = toks[1:]
    return ' '.join(toks)


def split_stream(text):
    import bisect
    text = text.replace('\r', '')
    text = re.sub(r'-\n(?=[a-z])', '', text)
    # split on page markers, normalise each page's text separately and remember where each page starts
    parts = PM_RX.split(text)  # [before, pageno, text, pageno, text, ...]
    chunks = []
    pm2 = []
    pos = 0
    for i in range(1, len(parts), 2):
        t = re.sub(r'([A-Z]{2,}) ?[-‐‑] ?\n ?([A-Z]{2,} ?,)', r'\1\2', parts[i + 1])
        t = t.replace('\n', ' ')
        t = FURN_RX.sub(' ', t)
        t = re.sub(r'\s+', ' ', t).strip()
        pm2.append((pos, int(parts[i])))
        chunks.append(t)
        pos += len(t) + 1
    text = ' '.join(chunks)
    starts = [a for a, _ in pm2]

    def page_at(pos):
        i = bisect.bisect_right(starts, pos) - 1
        return pm2[i][1] if i >= 0 else None
    marks = []
    for m in HEADER_RX.finditer(text):
        if not _header_ok(m):
            continue
        marks.append((m.start(), m.end(), 'e', m))
    for m in XREF_RX.finditer(text):
        marks.append((m.start(), m.end(), 'x', m))
    spans = [(a, b) for a, b, _, _ in marks]
    for m in HEADER_RX2.finditer(text):  # AUDIT D3b: garbled headers inside the body of the previous entry
        if not _header2_ok(m) or any(a < m.end() and m.start() < b for a, b in spans):
            continue
        marks.append((m.start(), m.end(), 'e', m))
    marks.sort(key=lambda t: t[0])
    ents = []
    for i, (a, b, kind, m) in enumerate(marks):
        nxt = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        if kind == 'x':
            ents.append(dict(raw=text[a:b], surname=_norm_surname(m.group(1)), given=(m.group(2) or '').strip(), body='', xref=m.group(3), page=page_at(a)))
            continue
        body = text[b:nxt].strip()
        ents.append(dict(raw=text[a:nxt].strip(), surname=_norm_surname(strip_ord_prefix(m.group(1).strip())), given=m.group(2).strip(), body=body, xref=None, page=page_at(a)))
    return ents


# ---------------------------------------------------------------- body parsing

CASUALTY = ('killed', 'wounded', 'captured', 'missing', 'died_wounds')
SEPARATION = ('discharged', 'deserted', 'dismissed', 'resigned', 'died', 'killed', 'mustered_out', 'transferred_out', 'dropped')


def _sim(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def gettysburg_in(c):
    for w in re.findall(r'[A-Za-z]{6,}', c):
        wl = w.lower()
        if wl.startswith('gett') or wl.endswith('ysburg') or _sim(wl, 'gettysburg') >= 0.8:
            return True
    return False


SELF_NAMES = []  # normalised letters-only names of the unit whose Register is being read, e.g. 'fifthbattery', 'ninthcavalry'


def set_self_names(names):
    SELF_NAMES[:] = [re.sub(r'[^a-z]', '', n.lower()) for n in names]


def is_self_tail(tail):
    if re.search(r'\bu\s?\.\s?s\b|united\s+states|regular', tail.lower()):
        return False  # 'Battery C, U. S. Artillery' is another service, never this regiment
    t = re.sub(r'[^a-z]', '', tail.lower())
    return any(n and t.startswith(n) for n in SELF_NAMES)


EXTERNAL_RX = re.compile(r'(infantry|cavalry|artillery|battery|regiment|corps|navy|marine|battalion|signal|regulars|u\.\s?s\.|volunteers|brigade|engineers|hospital|invalid)', re.I)


def classify_clause(c):
    """kinds present in one semicolon clause, from its leading verb and key phrases"""
    low = c.strip().lower()
    kinds = set()
    head = re.split(r'[ ,]', low, 1)[0]

    def lead(stem):
        return head.startswith(stem[:5]) or _sim(head, stem) >= 0.8
    if lead('killed'):
        kinds.add('killed')
    if lead('wounded') or 'wounded in action' in low or low.startswith('wounded') or 'wounded and' in low[:20]:
        kinds.add('wounded')
    if lead('captured') or 'captured' in low[:25]:
        kinds.add('captured')
    if lead('missing') or 'missing in action' in low:
        kinds.add('missing')
    if lead('died'):
        kinds.add('died')
        if 'wound' in low:
            kinds.add('died_wounds')
    if lead('discharged') or low.startswith('discharg'):
        kinds.add('discharged')
    if lead('deserted'):
        kinds.add('deserted')
    if lead('dismissed'):
        kinds.add('dismissed')
    if lead('resigned'):
        kinds.add('resigned')
    if lead('dropped'):
        kinds.add('dropped')
    if (lead('mustered') or lead('mastered')) and 'out' in low[:16]:
        kinds.add('mustered_out')
    if lead('transferred') or low.startswith('transf'):
        kinds.add('transferred')
        tail = re.sub(r'^transf\w*\s+to\s+', '', low)
        tail2 = re.sub(r'^co\.?\s*[a-z0-9]\s*,?\s*', '', tail)
        if is_self_tail(tail) or is_self_tail(tail2):
            kinds.add('transferred_in_self')
        elif EXTERNAL_RX.search(tail) and not re.match(r'co\.?\s*[a-z0-9]\s*[,\.]?\s*(?:[a-z]+\s+\d|\d)', tail) and 'this regiment' not in tail:
            kinds.add('transferred_out')
    if lead('paroled'):
        kinds.add('paroled')
    if lead('released'):
        kinds.add('released')
    if lead('rejoined') or lead('returned') or 'rejoined' in low[:20]:
        kinds.add('rejoined')
    if 'no record' in low or 'no further record' in low:
        kinds.add('no_record')
    if 'absent' in low[:15]:
        kinds.add('absent')
    if lead('promoted') or lead('appointed'):
        kinds.add('promoted')
    if lead('commissioned'):
        kinds.add('commissioned')
    if 're-enlisted' in low or 'reenlisted' in low:
        kinds.add('reenlisted')
    return kinds


def parse_body(body):
    out = dict(age=None, enlisted=None, mustered=None, company=None, rank_in=None, transfer_in=None, events=[], bad_enter=False, prior=None)
    m = re.search(r'Age\s*,?\s*(\d{1,2})\W{0,4}y', body) or re.search(r'Age\s*,?\s*(\d{1,2})', body)
    if m:
        out['age'] = int(m.group(1))
    # AUDIT D4: an officer's entry ends with a sentence "Commissioned captain, September 10, 1862, with rank from ..." that follows the
    # last event after a full stop; its dates are commission dates, never events (they were read as the separation date).
    mcm = re.search(r'\.\s+(?:Not commissioned|Commissioned|Commission\b)', body)
    main_body = body[:mcm.start() + 1] if mcm else body
    clauses = [c.strip().rstrip('.') for c in re.split(r';\s*', main_body) if c.strip()]
    order = 0
    for i, c in enumerate(clauses):
        ds = find_dates(c)
        for d in ds:
            order += 1
            d['_order'] = order
        low = c.lower()
        mb = re.match(r'transf\w*\s+to\s+Battery\s*([A-Z])', c.strip(), re.I)
        if mb:
            gd = [d for d in ds if not d['bad']]
            out.setdefault('_btr', []).append((gd[0]['date'] if gd else None, mb.group(1).upper()))
        mm = re.search(r'(?:mustered|mastered|musteied|musterod|mustcred|muster\w{1,3}d)\s*i\s?n[:;,\.]?\s*(?:as|slb|ae)?\s*([A-Za-z\- \.]+?)(?:,\s*(?:[CGO]\s?o\s?[\.,]?|Battery,?)\s*([A-Z0-9])\b|,\s*(unassigned)|,|$)', c, re.I)
        if re.search(r'\b(?:enl\w{3,6}|enrol\w{2,4})\b', low[:60]) and i <= 1:
            cut = mm.start() if mm else len(c)
            e0 = [d for d in ds if d['start'] < min(cut, 90)]
            if e0:
                out['_d_enlisted'] = e0[0]
                ds = [d for d in ds if d is not e0[0]]
        if mm and i <= 2:
            out['rank_in'] = mm.group(1).strip()
            out['company'] = (mm.group(2) or mm.group(3) or None)
            md = [d for d in ds if d['start'] >= mm.start()]
            if md:
                out['_d_mustered'] = md[0]
                ds = [d for d in ds if d is not md[0]]
            continue
        tm = re.search(r'(?:transf\w*[,\s]+to\s+[^;]{0,30}?|promoted\s+[^;]{0,45}?)t\s?h\s?[il]\s?s\s+regiment\s*,?', c, re.I)  # AUDIT D12: OCR in "Co. I)", "Co-. G", "Co*. F", "transferred, to"; promoted into this regiment from another
        if not tm and i <= 4 and SELF_NAMES:
            mt = re.match(r'transf\w+\s+to\s+(.*)$', c.strip(), re.I)
            if mt:
                tl = mt.group(1)
                tl2 = re.sub(r'^(?:co\.?|battery)\s*[a-z0-9]\s*,?\s*', '', tl, flags=re.I)
                if is_self_tail(tl) or is_self_tail(tl2):
                    tm = mt
        if tm and i <= 4:
            if ds:
                out['_d_transfer_in'] = ds[0]
                ds = ds[1:]
            out['prior'] = c[:120]
            if not ds:
                continue
        if i == 0 and re.match(r'(?:age|private|corporal|sergeant|musician|wagoner|[a-z\-]+)\b', low) and not ds and ('infantry' in low or 'cavalry' in low or 'artillery' in low or low.startswith('age')):
            continue  # lead-in clause such as 'Private, Co. F, Thirtieth Infantry'
        kinds = classify_clause(c)
        out['events'].append(dict(text=c, kinds=sorted(kinds), dates=ds, gettysburg=gettysburg_in(c), has_bad_date=any(d['bad'] for d in ds)))
    _chronology(out)
    cur = (out['company'] or '').upper() if out['company'] and len(out['company']) == 1 else None
    amb = False
    for d, b in out.get('_btr', []):
        if d is None:
            amb = True
        elif d <= GB_END:
            cur = b
    out['battery_at_gb'] = cur
    out['battery_ambiguous'] = amb
    return out


def _chronology(out):
    """a repaired year is kept only when the entry's dates stay in order; otherwise the date is treated as unreadable."""
    seq = []
    for role in ('enlisted', 'mustered', 'transfer_in'):
        d = out.get('_d_' + role)
        if d:
            seq.append(d)
    for e in out['events']:
        if 'commissioned' in e['kinds']:
            continue
        for d in e['dates']:
            seq.append(d)
    seq.sort(key=lambda d: d.get('_order', 0))
    valid = [d for d in seq if not d['bad']]
    for i, d in enumerate(valid):
        if not d.get('repaired') or d['date'] is None:
            continue
        prev = [x['date'] for x in valid[:i] if x['date'] is not None]
        nxt = [x['date'] for x in valid[i + 1:] if x['date'] is not None and not x.get('repaired')]
        if (prev and d['date'] < max(prev)) or (nxt and d['date'] > min(nxt)):
            d['bad'] = True
            d['date'] = None
            d['repaired'] = False
    for role in ('enlisted', 'mustered', 'transfer_in'):
        d = out.get('_d_' + role)
        if d is not None:
            if d['bad']:
                out['bad_enter'] = True
                out[role] = None
            else:
                out[role] = d['date']


# ---------------------------------------------------------------- classification

def _good(ev):
    return [d for d in ev['dates'] if not d['bad']]


RET_RX = re.compile(r'\b(again\s+mustered|re-?mustered|re-?instated|restored|re-?appointed|re-?commissioned|rejoined|returned\s+to\s+(?:duty|company|regiment|command)|returned\s+from|returned,|desertion\s+(?:removed|revoked|annulled)|charge\s+of\s+desertion\s+removed|discharge\s+revoked|order\s+revoked|revoked)', re.I)


def _is_return(e):
    return bool(RET_RX.search(e['text'])) and not re.search(r'returned\s+to\s+(?:the\s+)?ranks', e['text'], re.I)


def classify(p):
    """returns (label, roll_status, basis_code, basis_text, flags)"""
    flags = []
    ev = p['events']
    enter0 = p['transfer_in'] or p['mustered'] or p['enlisted']

    def _late(kind, text):
        # AUDIT D9: an entry date after the battle contradicts a Gettysburg casualty or place remark of the same entry (one of the two is misread): rule 10, Unknown, contested
        return ('Unknown', 'contested', 'CONFLICT', 'CONFLICT inside the Register entry: entered this regiment %s (after the battle) but %s: "%s"' % (enter0.isoformat(), kind, text[:100]), flags + ['contested', 'entry-after-battle-with-gettysburg-remark'])
    for e in ev:  # rule 2
        k = set(e['kinds'])
        if k & set(CASUALTY):
            gd = [d for d in _good(e) if GB_START <= d['date'] <= GB_END]
            if e['gettysburg']:
                if enter0 and enter0 > GB_END:
                    return _late('a Gettysburg casualty is named', e['text'])
                return ('Present-Documented', 'named-present', 'CAS-REMARK', 'Register remark names Gettysburg: "%s"' % e['text'][:120], flags)
            if gd and not re.search(r'\b(at|near|before) [A-Z]', e['text']):
                if enter0 and enter0 > GB_END:
                    return _late('a casualty is dated in the battle window', e['text'])
                return ('Present-Documented', 'named-present', 'CAS-REMARK-DATE', 'Register casualty dated %s with no place printed: "%s"' % (gd[0]['date'].isoformat(), e['text'][:100]), flags + ['gb-date-no-place'])
            if gd:
                flags.append('casualty-dated-gb-other-place')
    for e in ev:  # place and date inside the battle window (desertion, death, discharge or other event 'at Gettysburg')
        gd = [d for d in _good(e) if GB_START <= d['date'] <= GB_END]
        if e['gettysburg'] and gd and not (set(e['kinds']) & {'rejoined'}):
            if enter0 and enter0 > GB_END:
                return _late('an event is placed at Gettysburg in the battle window', e['text'])
            return ('Present-Documented', 'named-present', 'GB-PLACE-DATE', 'Register places him at Gettysburg on %s: "%s"' % (gd[0]['date'].isoformat(), e['text'][:110]), flags + ['not-a-casualty-clause'])
    for e in ev:
        if e['gettysburg']:
            flags.append('gettysburg-named-outside-battle-window')
            break
    bad_sep = None
    sep_then_return = None
    for ei, e in enumerate(ev):  # rule 7
        k = set(e['kinds'])
        sep = k & set(SEPARATION)
        if not sep:
            continue
        if k & {'rejoined', 'released', 'paroled'} and not (k & {'discharged', 'deserted', 'dismissed', 'resigned'}):
            continue
        gd = _good(e)
        if gd:
            d0 = gd[0]['date']
            ent0 = p['transfer_in'] or p['mustered'] or p['enlisted']
            if ent0 and d0 < ent0 - datetime.timedelta(days=1):
                flags = flags + ['sep-date-before-entry-ocr']
                continue
            if d0 < GB_START:
                # AUDIT D5: a discharge or desertion followed by a re-muster, restoration or return (a later clause) is not a final separation
                if any(_is_return(e2) for e2 in ev[ei + 1:]):
                    if sep_then_return is None:
                        sep_then_return = e
                    continue
                return ('Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE', 'Register: "%s"' % e['text'][:120], flags + (['date-month-only'] if gd[0]['prec'] == 'month' else []))
        elif e['has_bad_date'] and bad_sep is None:
            bad_sep = e
        elif not e['dates']:
            my = re.search(r'(?<![0-9])(186[0-2])(?![0-9])', e['text'])
            if my and (k & {'discharged', 'deserted', 'dismissed', 'resigned', 'died', 'killed', 'mustered_out'}):
                return ('Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE', 'Register (year only, %s): "%s"' % (my.group(1), e['text'][:110]), flags + ['date-year-only'])
    enter = p['transfer_in'] or p['mustered'] or p['enlisted']
    if enter and enter > GB_END:  # rule 8
        return ('Absent-Documented', 'not-yet-enlisted', 'ENL-AFTER', 'Register: entered this regiment %s' % enter.isoformat(), flags)
    for e in ev:  # rule 9: the Register itself says he was absent (sick, detached, in arrest...) since a date before the battle
        if 'absent' in e['kinds'] and re.search(r'since\s+[A-Za-z]', e['text']) and not (set(e['kinds']) & {'rejoined'}):
            gd = _good(e)
            if gd and gd[0]['date'] < GB_START and not re.search(r'(rejoin|return)', e['text'], re.I):
                return ('Absent-Documented', 'absent-notation', 'ABS-NOTATION', 'Register: "%s"' % e['text'][:120], flags)
    if bad_sep is not None:  # rule 13
        return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'Separation clause whose year is unreadable: "%s"' % bad_sep['text'][:110], flags)
    if enter is None:
        return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'no readable enlistment, muster-in or transfer-in date', flags)
    if sep_then_return is not None:
        return ('Unknown', 'on-roll-undetermined', 'SEP-THEN-RETURN', 'Register gives a separation before the battle followed by a re-muster or return, no later separation before it: "%s"' % sep_then_return['text'][:110], flags + ['separation-then-return'])
    for e in ev:
        k = set(e['kinds'])
        if (k & {'discharged', 'deserted', 'dismissed', 'resigned', 'died', 'killed', 'dropped'}) and not e['dates']:
            return ('Unknown', 'unreadable-or-ambiguous', 'DATE-NOT-PRINTED', 'Register gives a separation with no date: "%s"' % e['text'][:110], flags)
    for e in ev:
        if 'no_record' in e['kinds']:
            gd = _good(e)
            if gd and gd[0]['date'] < GB_START:
                return ('Unknown', 'on-roll-undetermined', 'NO-RECORD-AFTER', 'Register: last record dated before the battle, no separation: "%s"' % e['text'][:110], flags)
    return ('Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS', 'Register gives no separation before the battle and no Gettysburg remark; the Register has no 30 June 1863 status', flags)


# ---------------------------------------------------------------- names

def tidy_name(surname, given):
    def tc(s):
        s = re.sub(r'\.{2,}', ' ', s)
        s = re.sub(r'\s+', ' ', s).strip(' .,')
        out = []
        for w in s.split(' '):
            if not re.search(r'[A-Za-z]', w):
                continue  # AUDIT: stray '.' tokens ('A . WILLIAM') no longer become '..'
            mm = re.match(r"^(M[cCe])([A-Z]{2,}.*)$", w)
            if mm and len(w) >= 5:  # McARTHER, MCDONALD, MeDERMOTT (prefix kept as read)
                out.append(('Mc' if mm.group(1).lower() == 'mc' else 'Me') + mm.group(2).capitalize())
            elif "'" in w:
                out.append("'".join(x.capitalize() for x in w.split("'")))
            elif '-' in w:
                out.append('-'.join(x.capitalize() for x in w.split('-')))
            else:
                out.append(w.capitalize() if len(w) > 1 else w + '.')
        return ' '.join(out)
    suffix = ''
    given = given.strip()
    mj = re.match(r'^(JR|SR|Jr|Sr)\.?\s?,\s?(.+)$', given)  # AUDIT: printed "ASHLEY, JR., JOHN J." -> "Ashley, John J., Jr."
    if mj:
        given, suffix = mj.group(2), mj.group(1).upper()
    else:
        mj = re.match(r'^(.+?)\s?,\s?(JR|SR|Jr|Sr)\.?$', given)
        if mj:
            given, suffix = mj.group(1), mj.group(2).upper()
    g = tc(given)
    return tc(surname) + ', ' + g + ((', ' + suffix.capitalize() + '.') if suffix else '')
