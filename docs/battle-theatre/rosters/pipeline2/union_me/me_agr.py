"""Rows of the company returns in Appendix D of the Adjutant General's Report of Maine for 1863 (source ME-AGR-1863-APPD), from word boxes.

A return lists every man on the rolls at the return of 1 November 1862 (as published) and every man who joined since, with age,
residence, marital status, date of muster and a remark that is the status at the date of the return (1 to 5 November 1863) and every
change since 1 November 1862.  Layout of the table: Name | Age | Residence | Mar. or Single | Mustered into U.S. service | Remarks;
the field and staff and the present-organisation tables have Name | (Age) | Rank | Residence | Date of Rank | Remarks.

parse(leaves) walks the leaves in order with a small state machine: the heading of a page names the unit and the company; the rows
below the column headings are data rows, section headings (SERGEANTS. ...), or continuation lines of a remark.  Nothing is corrected.
"""
import re, difflib, statistics, collections
import mtable as T

ORD = {'First': 1, 'Second': 2, 'Third': 3, 'Fourth': 4, 'Fifth': 5, 'Sixth': 6, 'Seventh': 7, 'Eighth': 8, 'Ninth': 9, 'Tenth': 10,
       'Eleventh': 11, 'Twelfth': 12, 'Thirteenth': 13, 'Fourteenth': 14, 'Fifteenth': 15, 'Sixteenth': 16, 'Seventeenth': 17,
       'Eighteenth': 18, 'Nineteenth': 19, 'Twentieth': 20, 'Twenty-First': 21, 'Twenty-Second': 22}
UNIT_INF = {3: 'u-me-3rd-maine-infantry', 4: 'u-me-4th-maine-infantry', 5: 'u-me-5th-maine-infantry', 6: 'u-me-6th-maine-infantry',
            7: 'u-me-7th-maine-infantry', 16: 'u-me-16th-maine-infantry', 17: 'u-me-17th-maine-infantry', 19: 'u-me-19th-maine-infantry',
            20: 'u-me-20th-maine-infantry'}
UNIT_BTY = {2: 'u-me-2nd-maine-battery-b', 5: 'u-me-5th-maine-battery-e', 6: 'u-me-6th-maine-battery-f'}
UNIT_CAV, UNIT_BN10 = 'u-me-1st-maine-cavalry', 'u-me-10th-maine-infantry'

RE_HEAD = re.compile(r'(?i)(?:^|\s)(Return|Final\s+Record|Present\s+Organi[sz]ation|Organi[sz]ation\s+of\s+Field|Record\s+of\s+Recruits)\b')
RE_HDR = re.compile(r'(?i)^(?:Name|Narao|Nam[eo]|Remarks|Residence|Mustered|Single|Mar|service)\W*$')
RE_SECTION = [
    (re.compile(r"(?i)^commiss.{0,3}d?\s*officers?\W*$|^COMMISS.{0,4}OFFICERS"), "commiss'd officers."),
    (re.compile(r'(?i)^serg[a-z]{0,6}nts?\W*$|^sergeant\W*$'), 'SERGEANTS.'),
    (re.compile(r'(?i)^corporals?\W*$|^c[o0]rp[a-z]{2,5}s?\W*$'), 'CORPORALS.'),
    (re.compile(r'(?i)^musicians?\W*$'), 'MUSICIANS.'),
    (re.compile(r'(?i)^wagoners?\W*$'), 'WAGONER.'),
    (re.compile(r'(?i)^priv[a-z]{2,5}s?\W*$'), 'PRIVATES.'),
    (re.compile(r'(?i)^artificers?\W*$'), 'ARTIFICERS.'),
    (re.compile(r'(?i)^farriers?\W*$|^blacksmiths?\W*$|^saddlers?\W*$|^buglers?\W*$|^bugler\W*$'), None),
]
MONTH = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'june': 6, 'juno': 6, 'jun': 6, 'july': 7, 'jul': 7, 'aug': 8, 'sept': 9, 'sep': 9,
         'sopt': 9, 'oct': 10, 'nov': 11, 'dec': 12, 'deo': 12, 'ang': 8, 'january': 1, 'february': 2, 'march': 3, 'april': 4, 'august': 8,
         'september': 9, 'october': 10, 'november': 11, 'december': 12, 'sepl': 9, 'augt': 8}
SEP_WORDS = re.compile(r'(?i)^(?:disch\w*|disc|dis|deser\w*|des|killed|kld|kid|k\.?i\.?a|died|dd|deceased|dropped|drop|transf\w*|resigned|resig\w*|dismissed|musd|cashiered|discharge|disehar\w*)$')
SAFE_WORDS = {'pr', 'promoted', 'prom', 'wd', 'wounded', 'sick', 'in', 'hospital', 'hosp', 'absent', 'prisoner', 'paroled', 'of', 'war', 'detached', 'det',
              'serv', 'service', 'on', 'ambulance', 'corps', 'color', 'bearer', 'guard', 'provost', 'at', 'the', 'and', 'to', 'sergt', 'sgt', 'sergeant',
              'corporal', 'corp', 'cor', 'serg', 'sent', 'north', 'returned', 'ranks', 'duty', 'furlough', 'recruiting', 'wash', 'washington', 'nurse',
              'cook', 'hostler', 'teamster', 'orderly', 'headquarters', 'hd', 'qrs', 'brig', 'div', 'general', 'staff', 'clerk', 'conscript', 'substitute',
              'present', 'a', 'm', 'co', 'since', 'reduced', 'by', 'sentence', 'court', 'martial', 'abs', 'mo', 'va', 'md', 'penn', 'pa', 'f', 'fair', 'oaks',
              'manass', 'antietam', 'fredericksburg', 'chancellorsville', 'gettysburg', 'ambulance', 'driver', 'pioneer', 'quartermaster', 'q', 'sergt',
              'com', 'dept', 'commissary', 'ord', 'ordnance', 'hospital', 'steward', 'musician', 'band', 'drummer', 'lt', 'lieut', 'capt', 'captain',
              'colonel', 'major', 'adjutant', 'also', 'but', 'not', 'taken', 'missing', 'action', 'while', 'for', 'with', 'from', 'rolls', 'who', 'is',
              'commissioned', 'officer', 'tenn', 'ct', 'ky', 'ga', 'ala', 'miss', 'la', 'sc', 'nc', 'n', 'y', 'ny', 'dc', 'd', 'l', 'island', 'david', 's'}


def ordinal_in(text):
    """Ordinal of the unit named in a heading: the word before Regiment / Battery / Battalion (fuzzy)."""
    m = re.search(r'(\S+)\s+(?:Regiment|Rogiment|Regimont|Uogiment|Regi\S{0,5}nt|Reg\.|Battery|Battalion)', text)
    if not m:
        return None
    w = re.sub(r'[^A-Za-z\-]', '', m.group(1))
    best = difflib.get_close_matches(w, list(ORD), n=1, cutoff=0.78)
    return ORD[best[0]] if best else None


def classify_heading(text):
    """(unit key or None for a unit that is not ours, kind, company letter or None, first_page)"""
    t = ' '.join(text.split())
    first = not re.search(r'(?i)\(?\s*Con(?:tinued|\b|\.|t)', t) and bool(re.search(r"(?i)Return\s+of\s+(?:Captain|Capt|Lieutenant|Lieut|Company|Compamj|Comp\s+any|Second\s+Lieut|First\s+Lieut|the\s+Field|a\s+Detach)", t))
    kind = 'return'
    if re.search(r'(?i)Present\s+Organi', t):
        kind = 'present'
    elif re.search(r'(?i)Final\s+Record', t):
        kind = 'final'
    company = None
    if re.search(r'(?i)Field\s*,?\s*(?:and\s+)?Staff', t):
        company = 'FS'
    else:
        m = re.search(r'(?i)Compa?m?[jy]?\s*(?:any)?\s+([A-Za-z0-9/])\b', t)
        if m:
            company = m.group(1).upper()
    if re.search(r'(?i)Battalion', t) and re.search(r'(?i)Tenth', t):
        return UNIT_BN10, kind, company, first
    n = ordinal_in(t)
    if re.search(r'(?i)Cavalry', t) and not re.search(r'(?i)D\.?\s*C\.?|District', t):
        return (UNIT_CAV if n == 1 else None), kind, company, first
    if re.search(r'(?i)Battery', t):
        return UNIT_BTY.get(n), kind, company, first
    if re.search(r'(?i)Regiment|Rogiment|Infantry|Infan', t):
        return UNIT_INF.get(n), kind, company, first
    return None, kind, company, first


def row_text(r):
    return ' '.join(w['w'] for w in sorted(r, key=lambda w: w['x0']))


RE_HDR2 = re.compile(r'(?i)^(?:name|rank|residence|remarks|date|narao|nam[eo])\W*$')


def is_header_row(r):
    toks = [w['w'] for w in r]
    return sum(1 for t in toks if RE_HDR.match(t)) >= 2 or sum(1 for t in toks if RE_HDR2.match(t)) >= 2


def section_of(r):
    ws = sorted(r, key=lambda w: w['x0'])
    t = ' '.join(w['w'] for w in ws)
    t1 = re.sub(r'[^A-Za-z\' ]', '', t).strip()
    for rx, lab in RE_SECTION:
        if rx.match(t1) and len(ws) <= 3:
            return lab or t
    if re.match(r'(?i)^Joined\s+Co', t1) or re.match(r'(?i)^Joined\s+(?:the\s+)?(?:Co|Company|Batt)', t1):
        return 'Joined Co. since Nov. 1, 1862.'
    if re.match(r'(?i)^Joined\s+Field', t1):
        return 'Joined Field and Staff since Nov. 1, 1862.'
    if len(ws) <= 4 and len(t) <= 40 and re.search(r'(?i)serge|serg\b|lieut|saddler|farrier|blacksmith|bugler|wagoner|musician|corporal|private|officer|artificer|surgeon|steward|brev', t) \
            and not re.search(r'\d{2}', t) and not re.search(r'[a-z]{3,},', t):
        return t
    return None


# ---------------------------------------------------------------------------------------------------- inference of the muster / separation
def _num(tok):
    t = tok.strip(".,;:'’‘“”\"*[]()|")
    t = re.sub(r'(?<=\d)(?:d|st|nd|rd|th)$', '', t)
    t = t.translate(str.maketrans({'l': '1', 'I': '1', 'O': '0', 'o': '0', 'G': '6', 'S': '5'}))
    return int(t) if re.fullmatch(r'\d{1,4}', t) else None


def _year(tok):
    t = tok.strip(".,;:*[]()|")
    t = t.translate(str.maketrans({'G': '6', 'g': '6', 'l': '1', 'I': '1', 'O': '0', 'o': '0', 'S': '5'}))
    m = re.fullmatch(r"[’'‘`]?(\d{2})", t)
    if m and m.group(1) in ('61', '62', '63', '64', '65'):
        return 1800 + int(m.group(1))
    m = re.fullmatch(r"(18\d\d)", t)
    return int(m.group(1)) if m else None


def find_dates(tokens):
    """[(index of month token, (year or None, month, day or None), end index)] in a token list."""
    out = []
    i = 0
    while i < len(tokens):
        key = re.sub(r'[^A-Za-z]', '', tokens[i]).lower()
        if key in MONTH and re.sub(r'[^A-Za-z]', '', tokens[i]) and tokens[i][0].isupper():
            mo, d, y, j = MONTH[key], None, None, i + 1
            if j < len(tokens):
                dn = _num(tokens[j])
                if dn is not None and 1 <= dn <= 31 and not re.fullmatch(r'[’\'‘`]\d\d', tokens[j].strip('.,;')):
                    d, j = dn, j + 1
            if j < len(tokens):
                yy = _year(tokens[j])
                if yy:
                    y, j = yy, j + 1
            out.append((i, (y, mo, d), j))
            i = j
        else:
            i += 1
    return out


def resolve(date, section_after_nov1862=False):
    y, mo, d = date
    if y is None:
        y = 1862 if mo >= 11 else 1863
    return (y, mo, d or 1)


BATTLE_START, BATTLE_END = (1863, 7, 1), (1863, 7, 3)


def infer_on_rolls(muster_toks, rem_toks, joined, carry):
    """Returns (code, basis, new carry).  code: 'yes' | 'no' | None (unknown).  Inference from printed dates only."""
    basis = []
    E = None
    ds = find_dates(muster_toks)
    if ds:
        E = resolve(ds[0][1])
        carry = E
        basis.append('muster %04d-%02d-%02d printed' % E)
    elif muster_toks and carry:
        E = carry
        basis.append('muster date by ditto of the line above (%04d-%02d-%02d)' % E)
    if joined:
        if E is None:
            return None, '', carry
        if E > BATTLE_END:
            return 'no', ' '.join(basis) + '; after the battle', carry
    else:
        if E is None and not muster_toks:
            return None, '', carry
        if E is not None and E > BATTLE_END:
            return None, '', carry
    # separations in the remark
    words = [re.sub(r'[^A-Za-z]', '', t).lower() for t in rem_toks]
    sep_idx = [i for i, t in enumerate(rem_toks) if SEP_WORDS.match(re.sub(r'[.,;:]+$', '', t).strip('[]()“”"*'))]
    dates = find_dates(rem_toks)
    if sep_idx:
        # first separation keyword followed by a date within 5 tokens
        sd = None
        for i in sep_idx:
            for di, dv, de in dates:
                if i < di <= i + 5:
                    sd = dv
                    break
            if sd:
                break
        if not sd:
            return None, '', carry
        sdate = resolve(sd)
        if any(w in ('returned', 'ret', 'rejoined', 'restored') for w in words):
            return None, '', carry
        if E is None and not joined:
            return None, '', carry
        if sdate < BATTLE_START:
            return 'no', '; '.join(basis + ['separation printed %04d-%02d-%02d, before the battle' % sdate]), carry
        return 'yes', '; '.join(basis + ['separation printed %04d-%02d-%02d, not before the battle' % sdate]), carry
    # no separation word: every alphabetic word of the remark must be a known non-separation word
    odd = [w for w in words if w and w not in SAFE_WORDS and w not in MONTH and len(w) > 1]
    if odd:
        return None, '', carry
    if E is None and not joined:
        return None, '', carry
    return 'yes', '; '.join(basis + ['no separation printed']), carry


# ---------------------------------------------------------------------------------------------------- the stream of leaves
SEQ = 'ABCDEFGHIKLM'
NAME_BOUND = 470          # a token whose left edge is further right than this (from the first token of the row) is not part of a name


def _age_token(r, n0):
    """The age cell: the first numeric token at least 380 px right of the name start (OCR noise tolerated)."""
    for w in sorted(r, key=lambda w: w['x0']):
        if w['x0'] >= n0 + 380 and re.fullmatch(r"[\d,.:;!|lIOoGSi]{1,3}", w['w']) and re.search(r'\d|[lIOoi]', w['w']):
            return w
    return None


def parse(leaves, words_of, pm):
    """leaves: iterable of leaf numbers in order; words_of(leaf) -> aligned words; returns (rows, notes)
    row: dict(unit, leaf, co, rk, kind, name [words], rank [words], rest [words], muster [tokens], rem [tokens], flags)"""
    rows, notes = [], []
    ctx = {'unit': None, 'co': '', 'kind': 'return', 'rk': '', 'joined': False, 'carry': None, 'last_letter': None}
    for leaf in leaves:
        ws = [w for w in words_of(leaf) if w.get('off') is not None]
        if not ws:
            continue
        rs = T.cluster_rows(ws, 18.0)
        rs = [sorted(r, key=lambda w: w['x0']) for r in rs]
        # page margin of the name column
        firsts = [r[0]['x0'] for r in rs if len(r) >= 4]
        pg_n0 = statistics.median(sorted(firsts)[:max(3, len(firsts) // 3)]) if firsts else 0
        state = 'top'           # top | title | hdr | body
        title_txt, hdr_y, last_data = '', None, None
        for i, r in enumerate(rs):
            txt = ' '.join(w['w'] for w in r)
            y = statistics.mean(w['yc'] for w in r)
            if RE_HEAD.search(txt) and not (state == 'body' and len(r) > 5 and r[0]['x0'] > pg_n0 + 100 and not re.match(r'(?i)^(Return|Present|Final)', txt)):
                if state != 'title':
                    title_txt = ''
                state = 'title'
                title_txt += ' ' + txt
                continue
            if state == 'title' and is_header_row(r):
                unit, kind, comp, first = classify_heading(title_txt)
                if kind == 'present' and unit is None and not re.search(r'(?i)Regiment|Battalion|Battery|Cavalry', title_txt):
                    unit = ctx['unit']                       # the present organisation of the company above
                    if comp == 'FS':
                        ctx['co'] = 'FS'
                elif unit != ctx['unit']:
                    ctx['unit'], ctx['co'], ctx['last_letter'] = unit, '', None
                ctx['unit'], ctx['kind'] = unit, kind
                if comp == 'FS':
                    ctx['co'] = 'FS'
                elif first and kind == 'return':
                    letter = comp if (comp and comp in SEQ) else None
                    if letter is None and unit not in (UNIT_BTY.values()):
                        k = SEQ.index(ctx['last_letter']) + 1 if (ctx['last_letter'] and ctx['last_letter'] in SEQ) else 0
                        letter = SEQ[k] if k < len(SEQ) else ''
                        notes.append({'leaf': leaf, 'company letter inferred from the sequence': letter, 'unit': unit, 'heading': title_txt[:100]})
                    ctx['co'] = letter or ''
                    ctx['last_letter'] = ctx['co'] or ctx['last_letter']
                elif kind == 'present' and comp not in (None, 'FS') and comp in SEQ:
                    pass
                if first or kind == 'present':
                    ctx['rk'] = ''
                    ctx['joined'] = False
                    ctx['carry'] = None
                state, hdr_y = 'hdr', y
                continue
            if state == 'title':
                title_txt += ' ' + txt           # the heading continues on the next line
                continue
            if state == 'hdr':
                if is_header_row(r) or y < hdr_y + 100 or (len(r) <= 2 and not re.search(r'[A-Za-z]{3}', txt)):
                    continue
                state = 'body'
            if state != 'body':
                continue
            if ctx['unit'] is None:
                continue
            # --- body row
            sec = section_of(r)
            if sec:
                ctx['rk'] = sec
                ctx['joined'] = sec.startswith('Joined')
                last_data = None
                continue
            n0 = r[0]['x0']
            if len(r) <= 1 and not re.search(r'[A-Za-z]{3}', txt):
                continue
            if re.match(r'(?i)^(discharged\s+and\s+deceased|band\s+mustered|leader|lieut|quartermaster|\[rank\s+not)', txt) or re.match(r'(?i)^(see\s+|note)', txt):
                last_data = None
                notes.append({'leaf': leaf, 'prose': txt[:120], 'unit': ctx['unit']})
                continue
            age = _age_token(r, n0)
            if age is None and sum(1 for w in r if w['w'].endswith(',')) >= 3 and sum(1 for w in r if w['w'].endswith(';')) + sum(1 for w in r if w['w'].endswith(',')) >= 4:
                last_data = None
                notes.append({'leaf': leaf, 'prose': txt[:120], 'unit': ctx['unit']})
                continue
            bound = (age['x0'] - 25) if age else n0 + NAME_BOUND
            name = [w for w in r if w['x0'] < min(bound, n0 + NAME_BOUND + 20)]
            rest = [w for w in r if w not in name]
            # a line that carries no name column text is the continuation of the remark above
            if n0 > pg_n0 + 600 and last_data is not None:
                last_data['rest2'].extend(r)
                continue
            if not name or not re.search(r'[A-Za-z]{2}', ' '.join(w['w'] for w in name)):
                if last_data is not None and rest:
                    last_data['rest2'].extend(r)
                continue
            row = {'unit': ctx['unit'], 'leaf': leaf, 'co': ctx['co'], 'rk': ctx['rk'] if ctx['kind'] == 'return' else ('Present Organization of the Company.' if ctx['co'] != 'FS' else 'Present Organization of Field and Staff.'),
                   'kind': ctx['kind'], 'joined': ctx['joined'], 'name': name, 'rest': rest, 'rest2': [], 'age': age, 'n0': n0, 'y': y}
            rows.append(row)
            last_data = row
    return rows, notes
