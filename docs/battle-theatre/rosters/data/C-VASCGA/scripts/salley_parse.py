"""2nd and 3rd South Carolina Volunteers (Kershaw's brigade): Salley (compiler), South Carolina Troops in Confederate Service, vol. II (1914),
IA southcarolinatr00sallgoog. Each entry is compiled from the surviving company muster rolls and says what each roll reported, so PLAN rule 6
(muster roll of 30 June 1863 plus the next roll) and rule 9 (absent on the roll) can be applied from the entry text.
Run: python -X utf8 salley_parse.py"""
import re, sys, collections, json
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SRC = CACHE + 'southcarolinatr00sallgoog_djvu.txt'
SID = 'SC-SALLEY-1914-VOL2-v1'
lines = open(SRC, encoding='utf-8', errors='replace').read().splitlines()

# (unit_id, company, first line, last line[, section forced at the start]); line numbers are 1-based lines of the djvu text.
# AUDIT 2026-10-30: the Google scan of vol. II has pages out of order. 3rd SC: lines 26753-27028 (printed pages 458-463) are the Company F privates pages repeated
# inside the Company G text, and the Privates heading of Company F before line 25885 (printed p.452) is missing from the scan (the pages after it are all privates).
# The repeated pages are parsed as Company F so the exact-repeat filter removes them; the forced section is flagged 'rank-inferred-from-page-break'.
REG = {'C-2SC': '2nd South Carolina Infantry', 'C-3SC': '3rd South Carolina Infantry'}
SEGS = [('C-2SC', 'FS', 208, 504), ('C-2SC', 'A', 505, 1928), ('C-2SC', 'B', 1929, 3342), ('C-2SC', 'C', 3343, 4922), ('C-2SC', 'D', 4923, 6334),
        ('C-2SC', 'E', 6335, 8045), ('C-2SC', 'F', 8046, 9758), ('C-2SC', 'G', 9759, 11123), ('C-2SC', 'H', 11124, 12254), ('C-2SC', 'I', 12255, 13689),
        ('C-2SC', 'K', 13690, 16448),
        ('C-3SC', 'FS', 16472, 16751), ('C-3SC', 'A', 16752, 18344), ('C-3SC', 'B', 18345, 20035), ('C-3SC', 'C', 20036, 21547), ('C-3SC', 'D', 21548, 23050),
        ('C-3SC', 'E', 23051, 24823), ('C-3SC', 'F', 24824, 25880, None), ('C-3SC', 'F', 25881, 26488, 'Privates.'), ('C-3SC', 'G', 26489, 26752, None), ('C-3SC', 'F', 26753, 27028, 'Privates.'), ('C-3SC', 'G', 27029, 28493, None), ('C-3SC', 'H', 28494, 29993), ('C-3SC', 'I', 29994, 31460),
        ('C-3SC', 'K', 31461, 32918)]

HEAD_RE = re.compile(r'^\s*(?:(F[Ii1]\w{2,3}|Second|Third|Fourth|Fifth|Sec\w+|Th\w+|Lieut\w*)\s+)?(Colonels?|Lieutenant[- ]Colonels?|Majors?|Adjutants?|Quartermasters?|Commissar\w+|Surgeons?|Assistant\s+Surgeons?|Chaplains?|Captains?|Lieutenants?|Lieutexants?|Sergeants?(?:[- ]Major)?|Corporals?|Musicians?|Privates?|Color[- ]?Bearers?|Ensigns?|Stewards?|Wardmasters?|Hospital\s+Stewards?|Ordnance\s+Sergeants?|Quartermaster[- ]Sergeants?|Commissary[- ]Sergeants?|Buglers?|Teamsters?|Wagoners?|Artificers?|Cooks?|Nurses?|Matrons?|Sharpshooters?|Pioneers?)\.?\s*$', re.I)
NAME_RE = re.compile(r"^([A-Z][A-Za-z'\u2019\-]{1,22}(?: [A-Z][a-z'\-]{1,15})?),\s+((?:[A-Z][A-Za-z\.\u2019']{0,20}\s?){1,4})(?:\([^)]*\))?\s*,")
NOT_GIVEN = re.compile(r'\b(January|February|March|April|May|June|July|August|September|October|November|December|Va|Pa|Md|Ga|Tenn|Ala|Miss|District|County|Sept|Oct|Nov|Dec|Jan|Feb|Mar|Apr)\b')
FOOT_RE = re.compile(r'unoffi\w*\s+comp\w*', re.I)
SEGS = [t if len(t) == 5 else tuple(t) + (None,) for t in SEGS]
PAGENO = re.compile(r'^\s*\d{1,3}\s*$')

# AUDIT 2026-10-30: OCR-damaged rank headings ('Privatbs.', 'Thibd Sebgeants.', 'FouKTH Corporals.', 'MVBICIANS.') were not recognised by HEAD_RE, so the
# entries that followed stayed under the previous rank (130 privates of Company G, 2nd SC, were labelled Musicians). A heading is now also accepted when
# a line on its own paragraph is a close fuzzy match (difflib ratio >= 0.7) of '<ordinal> <rank>' from the closed vocabulary below.
import difflib
_ORD = {'lieutenants': ['first', 'second', 'third'], 'sergeants': ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'], 'corporals': ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']}
_PLAIN = ['captains', 'colonels', 'lieutenant colonels', 'majors', 'surgeons', 'assistant surgeons', 'quartermasters', 'commissaries', 'chaplains', 'adjutants',
          'musicians', 'privates', 'color bearer', 'color bearers', 'sergeant majors', 'quartermaster sergeants', 'ordinary sergeants', 'hospital stewards']
_VOC = list(_PLAIN)
for _k, _ords in _ORD.items():
    for _o in _ords:
        _VOC += [_o + ' ' + _k, _o + ' ' + _k[:-1]]
_VOC = sorted(set(_VOC))


def canon_rank(printed, canon):
    """The rank heading with its OCR damage repaired ('Privatbs.' -> 'Privates'); the printed heading stays in `section`."""
    c = fuzzy_head(printed) if printed else None
    return (c or canon or printed or '').title().replace('Colonel', 'Colonel')


def fuzzy_head(s):
    if len(s) >= 45 or not re.fullmatch(r"[A-Za-z\^\|\.>\"' ]+", s):
        return None
    n = re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', '', s.lower())).strip()
    if len(n) < 5:
        return None
    best = max(_VOC, key=lambda v: difflib.SequenceMatcher(None, n, v).ratio())
    return best if difflib.SequenceMatcher(None, n, best).ratio() >= 0.7 else None

MON = r'(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Aug\.?|Sept?\.?|Oct\.?|Nov\.?|Dec\.?)'
YR = r'(1[8][0-9GBCOSl]{2})'
TOK = re.compile(MON + r'\s+(\d{1,2}|[0-9SlO]{1,2})\s*(?:,\s*(' + YR[1:-1] + r'))?')


def fix_year(y):
    if y is None:
        return None
    s = y.replace('G', '6').replace('B', '8').replace('C', '6').replace('O', '0').replace('S', '5').replace('l', '1')
    if not re.fullmatch(r'18\d\d', s):
        return None
    n = int(s)
    if 1880 <= n <= 1889:
        n -= 20      # 1883 -> 1863: no Confederate service dates fall in the 1880s
    if n == 1868:
        n = 1863
    if n == 1800 or 1800 <= n <= 1809:
        n += 60
    return n if 1860 <= n <= 1866 else None


MONNUM = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}


def toks_with_years(s):
    """Dates in s as list of (date, start, end); a month-day without a year takes the next printed year in the same list."""
    raw = []
    for m in TOK.finditer(s):
        mo = MONNUM[m.group(1)[:3].lower()]
        dd = m.group(2).replace('S', '5').replace('l', '1').replace('O', '0')
        try:
            d = int(dd)
        except ValueError:
            continue
        if d > 31 and str(d)[0] == '8':
            d = int('3' + str(d)[1:])
        y = fix_year(m.group(3)) if m.group(3) else None
        raw.append([mo, d, y, m.start(), m.end(), m.group(3) is not None])
    # forward fill
    nxt = None
    for r in reversed(raw):
        if r[5] and r[2] is None:
            r[2] = None   # printed but unreadable
        if r[2] is not None:
            nxt = r[2]
        elif not r[5]:
            r[2] = nxt
    out = []
    for mo, d, y, a, b, printed in raw:
        if y is None:
            out.append((None, a, b))
            continue
        try:
            out.append((datetime.date(y, mo, d), a, b))
        except ValueError:
            out.append((None, a, b))
    return out


NEG_STATUS = re.compile(r'(absent|sick|hospital|furlough|wounded|prisoner|in\s+the\s+hands|deserted|under\s+arrest|missing|desert|home|leave|AWOL|detached|detail|extra|daily\s+duty|on\s+duty\s+at|not\s+present|captured|dead|died|killed|disabled|discharged)', re.I)
STATIONARY_DETAIL = re.compile(r'(detached|detail|extra\s+duty|daily\s+duty)', re.I)
FAR_NEG = re.compile(r'(absent|sick|hospital|furlough|wounded|prisoner|in\s+the\s+hands|deserted|under\s+arrest|missing|home|leave|captured)', re.I)


def classify_entry(txt):
    """Apply PLAN rules to a Salley entry."""
    t = re.sub(r'\s+', ' ', txt)
    t = re.sub(r'(\w)- (\w)', lambda m: m.group(1) + m.group(2) if m.group(2).islower() else m.group(0), t)
    flags = []
    clauses = [c.strip() for c in re.split(r';\s*', t) if c.strip()]
    rolls = {}      # date -> status text (lower)
    mentioned = set()
    notonroll = []
    cas, absent_sep, other_sep, amb = [], [], [], []
    enl = None
    for cl in clauses:
        m = re.search(r'(?:reported\s+)?on\s+(?:the\s+)?(?:muster\s+)?rolls?\s+of\s+(.*?),?\s+as\s+(.*)$', cl, re.I) or \
            re.search(r'(?:reported\s+)?on\s+(?:the\s+)?(?:muster\s+)?rolls?\s+of\s+(.*?),\s+and\s+(.*)$', cl, re.I)
        if re.search(r'rolls?\s+of', cl, re.I) and re.search(r'\bas\b', cl, re.I):
            m = re.search(r'rolls?\s+of\s+(.*?)\s*,?\s+as\s+(.*)$', cl, re.I)
            if m:
                ds = [d for d, a, b in toks_with_years(m.group(1)) if d]
                for d in ds:
                    rolls[d] = m.group(2).strip().lower()
        if re.search(r'(?<![a-z])not\s+on(?![a-z])', cl, re.I) and re.search(r'(that\s+of|next\s+available|subsequent|roll)', cl, re.I) and not re.search(r'Surrender', cl):
            notonroll.append([d for d, a, b in toks_with_years(cl) if d])
        elif re.search(r'muster\s+rolls?|regimental\s+roster|(?<![a-z])roll(?![a-z])', cl, re.I):
            for d, a, b in toks_with_years(cl):
                if d:
                    mentioned.add(d)
        g = re.search(r"G[A-Za-z\^\)\(\|]{3,9}[ub]r[g]|Gett|Gtett|GM\^s", cl)
        july = [d for d, a, b in toks_with_years(cl) if d and datetime.date(1863, 7, 1) <= d <= datetime.date(1863, 7, 3)]
        if (g or july) and re.search(r'(wound|w\w{2,5}ded|kill|k[il1]{2}[el1]d|captur|prison|taken|missing|mortally|lost\s+(an?\s+)?(arm|leg|eye|hand|foot)|disabled|died)', cl, re.I) and not re.search(r'reported\s+on\s+muster', cl[:40], re.I):
            cas.append(cl[:160])
            continue
        if g and re.search(r'(muster\s+rolls?)', cl, re.I) is None:
            amb.append('Gettysburg mentioned: ' + cl[:110])
        low = cl.lower()
        ds = [d for d, a, b in toks_with_years(cl) if d]
        if enl is None and re.search(r'(joined|enrolled|enlisted|mustered\s+into|conscripted|volunteered|substitute|reenlisted)', low) and ds and not re.search(r'(promot|elected)', low[:30]):
            enl = ds[0]
        sep = re.search(r'\b(discharged|resigned|died|killed|deserted|dropped|dismissed|retired|transferred\s+to\s+(?!Company)|supernumerary|disabled)', low)
        if sep and not re.search(r'(since|after)\s+the\s+(war|surrender)|paroled', low):
            dd = [d for d in ds if d]
            when_ = dd[0] if dd else None
            pb = re.search(PRE_BATTLES, cl)
            if when_ and when_ < datetime.date(1863, 7, 1):
                absent_sep.append(cl[:160])
            elif when_:
                other_sep.append(cl[:160])
            elif pb and re.search(r'(killed|died)', low):
                absent_sep.append(cl[:160] + ' [battle named; dated before 1 July 1863]')
            else:
                if not re.search(LATER, cl):
                    amb.append('undated separation: ' + cl[:110])
    return t, rolls, cas, absent_sep, other_sep, amb, enl, flags, mentioned, notonroll


J30 = datetime.date(1863, 6, 30)
A31 = datetime.date(1863, 8, 31)
J31 = datetime.date(1863, 7, 31)


def label_entry(txt):
    t, rolls, cas, absent_sep, other_sep, amb, enl, flags, mentioned, notonroll = classify_entry(txt)
    res = dict(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS', flags=flags, enlisted=enl.isoformat() if enl else '', text=t,
               basis='on the company roll; the entry gives no status for 30 June 1863 and no Gettysburg casualty')
    # the roll of the battle period: dated 30 June 1863 for most companies, 1 July 1863 for the 2nd South Carolina
    d30 = J30 if J30 in rolls else (datetime.date(1863, 7, 1) if datetime.date(1863, 7, 1) in rolls else J30)
    st30 = rolls.get(d30)
    if d30.day == 1 and st30 is not None:
        flags = flags + ['roll-dated-1-july']
    nxt = [d for d in sorted(rolls) if d > d30]
    nxt_st = rolls[nxt[0]] if nxt else None
    is_present = lambda s: s is not None and re.match(r'^(present|present\s+for\s+duty)\b(?!.*(sick|absent|wound|arrest|hospital))', s) is not None
    # absence on the 30 June roll
    abs30 = st30 is not None and FAR_NEG.search(st30) and not STATIONARY_DETAIL.search(st30) and not re.match(r'^present', st30)
    det30 = st30 is not None and STATIONARY_DETAIL.search(st30) and not FAR_NEG.search(st30)
    if enl and enl > datetime.date(1863, 7, 3) and not st30:
        enl_after = True
    else:
        enl_after = False
    if cas and (absent_sep or abs30):
        res.update(label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='CONFLICT',
                   basis='the compiled entry reports both a Gettysburg casualty and an earlier separation or an absence on the 30 June roll: ' + ' | '.join(cas[:1] + absent_sep[:1] + ([st30] if abs30 else [])))
        res['flags'] = flags + ['contested']
    elif cas:
        res.update(label='Present-Documented', roll_status='named-present', basis_code='CAS-REMARK', basis='entry: ' + cas[0])
    elif st30 is not None and is_present(st30) and (nxt_st is not None and (is_present(nxt_st) or re.search(r'Gettysburg|wound', nxt_st))):
        res.update(label='Present-Documented', roll_status='named-present', basis_code='MUSTER-JUN63-PRESENT',
                   basis='entry: reported on the muster roll of 30 June 1863 as "%s" and on the next roll (%s) as "%s"' % (st30[:40], nxt[0].isoformat(), nxt_st[:40]))
    elif abs30:
        res.update(label='Absent-Documented', roll_status='off-roll-before-battle', basis_code='ABS-NOTATION',
                   basis='entry: reported on the muster roll of 30 June 1863 as "%s"' % st30[:90])
    elif absent_sep:
        res.update(label='Absent-Documented', roll_status='off-roll-before-battle', basis_code='SEP-BEFORE', basis='entry: ' + absent_sep[0])
    elif notonroll and not st30 and (mentioned | set(d for d, a, b in toks_with_years(t) if d)) and max(mentioned | set(d for d, a, b in toks_with_years(t) if d)) < J30 and any((nd and nd[0] <= J30) or not nd for nd in notonroll):
        res.update(label='Absent-Documented', roll_status='off-roll-before-battle', basis_code='ABS-NOTATION',
                   basis='entry: the last date given for him is %s and he is on no later available roll; the company roll of 30 June 1863 is among those available and does not carry him' % max(mentioned | set(d for d, a, b in toks_with_years(t) if d)).isoformat())
        res['flags'] = flags + ['absent-by-roll-omission']
    elif enl_after:
        res.update(label='Absent-Documented', roll_status='not-yet-enlisted', basis_code='ENL-AFTER', basis='joined %s' % enl.isoformat())
    elif st30 is not None and is_present(st30):
        res.update(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS',
                   basis='entry: present on the 30 June 1863 roll but the following roll does not confirm (%s); rule 6 needs both' % (nxt_st[:60] if nxt_st else 'no following roll named'))
        res['flags'] = flags + ['present-on-30-june-roll-only']
    elif det30:
        res.update(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS',
                   basis='entry: on detail or extra duty on the 30 June 1863 roll ("%s"); place not stated' % st30[:80])
        res['flags'] = flags + ['detached-place-unclear']
    elif amb:
        res.update(label='Unknown', roll_status='unreadable-or-ambiguous', basis_code='OCR-DATE-LOST', basis='; '.join(amb[:2]))
    elif re.search(r'not\s+on\s+(any\s+)?(subsequent|next)\s+(available\s+)?muster', t, re.I):
        res.update(label='Unknown', roll_status='on-roll-undetermined', basis_code='ONROLL-NO-STATUS',
                   basis='entry says he is on no later available muster roll; no separation dated; no status for 30 June 1863')
        res['flags'] = flags + ['not-on-later-rolls']
    return res


def parse_seg(uid, comp, a, b, force=None):
    rows = []
    section = force
    sect_canon = 'privates' if force else None
    cur = None
    page = None
    foot = 0

    def flush():
        nonlocal cur
        if not cur:
            return
        body = squash(' '.join(cur['body']))
        c = label_entry(body)
        nm = cur['name']
        fl = name_flags(nm) + list(c['flags']) + (['rank-inferred-from-page-break'] if force else [])
        rows.append(dict(regiment=REG[uid], unit_id=uid, company=comp, section=cur['section'], name_as_printed=nm, rank_as_printed=canon_rank(cur['section'], cur['canon']),
                         enlist_or_commission_date=c['enlisted'], residence_or_county='', remarks_as_printed=body + (' [footnote: ' + ' '.join(cur['foot']) + ']' if cur['foot'] else ''),
                         _canon=cur['canon'], presence_label=c['label'], presence_basis=c['basis'], basis_code=c['basis_code'], dup_group='', source_id=SID,
                         source_locator='vol.2 p.%s' % (cur['page'] or '?'), parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))
        cur = None

    prev_blank = True
    for i in range(a - 1, b):
        ln = re.sub(r'\s+', ' ', lines[i])
        s = ln.strip()
        if not s:
            prev_blank = True
            foot = 0
            continue
        if PAGENO.match(s):
            page = s
            continue
        if FOOT_RE.search(s) and len(s) < 140:
            if cur is not None:
                cur['foot'].append(s)
            foot = 1 if not s.endswith('.') else 0
            continue
        if foot:
            if cur is not None:
                cur['foot'].append(s)
            foot = 0
            continue
        mh = HEAD_RE.match(ln)
        fz = None if mh else (fuzzy_head(s) if prev_blank else None)
        if (mh or fz) and prev_blank and len(s) < 45:
            flush()
            section = squash(s)
            sect_canon = fz or section
            prev_blank = False
            continue
        if section is None:
            prev_blank = False
            continue
        mn = NAME_RE.match(s)
        newentry = False
        if mn and not NOT_GIVEN.search(mn.group(2)) and (prev_blank or (cur is not None and cur['body'] and re.search(r'[\.\)\]]\s*$', cur['body'][-1]))):
            newentry = True
        if newentry:
            flush()
            nm = squash(mn.group(1) + ', ' + mn.group(2))
            cur = dict(name=nm, section=section, canon=sect_canon, body=[s[mn.end():].strip()], page=page, foot=[])
        elif cur is not None:
            cur['body'].append(s)
        prev_blank = False
    flush()
    return rows


OFFICER_SECTIONS = re.compile(r'(Colonel|Major|Adjutant|Quartermaster|Commissar|Surgeon|Chaplain|Captain|Lieutenant|Lieutexant)', re.I)


def namekey(nm):
    sur, _, giv = nm.partition(',')
    ini = re.sub(r'[^A-Za-z]', '', giv)[:1].lower()
    return re.sub(r'[^a-z]', '', sur.lower()) + '|' + ini


def fullkey(nm):
    return re.sub(r'[^a-z]', '', nm.lower())


def merge_duplicates(rows):
    """A man is listed once per rank he held (Captains, First Lieutenants, ..., Sergeants, Corporals, Privates).
    Entries of the same company and the same printed name, in different rank sections, are one man's successive ranks (officers also match across
    companies by surname and first initial). The entry with the strongest evidence carries the label; the others become cross-references.
    Same name inside one section is NOT merged (two men can share a name)."""
    order = {'Present-Documented': 0, 'Absent-Documented': 1, 'Unknown': 2}
    groups = collections.defaultdict(list)
    for r in rows:
        if OFFICER_SECTIONS.search(r.get('_canon') or r['section']):
            groups[('O', r['unit_id'], namekey(r['name_as_printed']))].append(r)
        else:
            groups[('N', r['unit_id'], r['company'], fullkey(r['name_as_printed']))].append(r)
    n = 0
    for k, g in groups.items():
        secs = set(r['section'] for r in g)
        if len(g) < 2 or (k[0] == 'N' and len(secs) < 2):
            continue
        n += 1
        gid = 'sd%d' % n
        labs = set(r['presence_label'] for r in g if r['presence_label'] in ('Present-Documented', 'Absent-Documented'))
        best = sorted(g, key=lambda r: (order.get(r['presence_label'], 3), 0 if r['roll_status'] != 'unreadable-or-ambiguous' else 1))[0]
        for r in g:
            r['dup_group'] = gid
            if r is not best:
                r['presence_basis'] = 'cross-reference: the same man is entered under another rank; the label is carried by the entry with the strongest evidence (%s, company %s)' % (best['section'], best['company'])
                r['presence_label'] = 'Duplicate-Xref'
                r['roll_status'] = 'xref'
                r['basis_code'] = 'DUP-XREF'
        if len(labs) > 1:
            best['presence_basis'] = 'entries under different ranks disagree (present and absent evidence); both kept: ' + best['presence_basis']
            best['presence_label'] = 'Unknown'
            best['roll_status'] = 'unreadable-or-ambiguous'
            best['basis_code'] = 'CONFLICT'
            best['parse_flags'] = (best['parse_flags'] + ';contested').strip(';')
    return rows


if __name__ == '__main__':
    out = collections.defaultdict(list)
    tomb = []
    for uid, comp, a, b, force in SEGS:
        out[uid] += parse_seg(uid, comp, a, b, force)
    for uid, rows in out.items():
        seen = set()
        near = {}
        uniq = []
        for r in rows:       # the scan repeats a Company G heading and its pages: drop exact repeats within a company
            k = (r['company'], r['name_as_printed'], r['remarks_as_printed'][:120])
            # AUDIT: the repeated pages of the scan are OCR'd a little differently each time ('mus- tered' / 'mustered', '3rd' / '8rd'), so an exact match missed
            # 21 groups per regiment; a repeat is now an entry with the same company, name, rank heading and printed page whose text is >= 80 percent similar.
            nk = (r['company'], r['name_as_printed'], r['rank_as_printed'], r['source_locator'])
            norm_txt = re.sub(r'[^a-z]', '', r['remarks_as_printed'].lower())
            fuzzy_dup = any(difflib.SequenceMatcher(None, norm_txt, o).ratio() >= 0.8 for o in near.get(nk, []))
            if k in seen or fuzzy_dup:
                tomb.append(dict(unit_id=uid, company=r['company'], name_as_printed=r['name_as_printed'], printed_rank=r['section'], page=r['source_locator'],
                                 reason='repeat of an entry already read (the scan repeats pages; same company, name, rank heading and printed page, text at least 80 percent alike)'))      # AUDIT: every dropped row is listed (R-G7)
                continue
            seen.add(k)
            near.setdefault(nk, []).append(norm_txt)
            uniq.append(r)
        rows = merge_duplicates(uniq)
        write_csv(OUT + 'csv/%s.csv' % uid, rows)
        print(uid, len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), dict(collections.Counter(r['basis_code'] for r in rows)))
        print({c: sum(1 for r in rows if r['company'] == c) for c in 'FS A B C D E F G H I K'.split()})
    import csv as _csv
    with open(OUT + 'tombstones_C-2SC-3SC.csv', 'w', newline='', encoding='utf-8') as _fh:
        _w = _csv.DictWriter(_fh, fieldnames=['unit_id', 'company', 'name_as_printed', 'printed_rank', 'page', 'reason'])
        _w.writeheader()
        _w.writerows(tomb)
