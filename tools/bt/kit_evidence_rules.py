"""Content rules of the kit evidence checker (run by kit_evidence_check.py): the defect classes that three QC rounds kept finding by sampling are errors now.

    ASOF_NARROW      as_of (or an hour) is narrower than what the quote and note state: a point date for a stated span ("three days", "since we entered the Valley"),
                     an hour the text does not state, a range that does not cover a range the text names, an as_of that does not cover the period of the value
    ASOF_POINT       a point as_of on a narrative statement whose quote and note do not name that day
    TIER_UNIT        tier documented for a unit that neither the quote nor a declared anchor names
    VALUE_NAMES      a person or unit named in the value is in neither the quote nor a declared anchor (an inferred line may name it in its note)
    FIGURE_DISAGREE  a casualty or strength figure differs from another accepted line of the same unit, kind and overlapping dates, with neither a shared conflict key nor distinct_basis
    ENLISTED         men "enlisted_only" without a quote (or table columns) that say the officers are left out
    HEDGE            a bound or approximation ("less than", "not more than", "about", "over", "upward of" ...) on a recorded figure without the hedge field
    WAIVER / ANCHOR  malformed waive_rules, hedge, distinct_basis or anchor

Optional members of an evidence line that these rules read:
    anchor          [{"text": <12-600 characters of the same source and report, as the source prints them>, "offset": <character offset>}]  a heading or caption that names what the quote leaves out
    hedge           {"word": "less than", "bound": "upper" | "lower" | "approx"}  the bound word of the quote and what it does to the figure
    distinct_basis  words (20+) saying how this figure differs in kind or period from the figure it disagrees with (checked: period, scope or kinds must really differ)
    waive_rules     {"<RULE CODE>": "<reason, 25+ characters>"}  the line is correct as it stands; the reason is read by a reviewer (reported as the warning RULE_WAIVED)
"""
import datetime, difflib, itertools, re

RULE_CODES = ('ASOF_NARROW', 'ASOF_POINT', 'TIER_UNIT', 'VALUE_NAMES', 'FIGURE_DISAGREE', 'ENLISTED', 'HEDGE')
SHAPE_CODES = ('WAIVER', 'ANCHOR')
# bases whose date is printed in the heading of the table, not in the quoted row
TABLE_BASES = {'organization_table', 'casualty_return', 'corrected_return', 'abstract_return', 'ordnance_return', 'return', 'footnote', 'muster_or_roll', 'present_for_duty', 'effective_total',
               'aggregate_present', 'aggregate_present_and_absent', 'derived'}
MIN_REASON = 25
MIN_DISTINCT = 20

_UN = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
       'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19}
_TN = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
_ORD_UN = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14,
           'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19}
_ORD_TN = {'twentieth': 20, 'thirtieth': 30, 'fortieth': 40, 'fiftieth': 50, 'sixtieth': 60, 'seventieth': 70, 'eightieth': 80, 'ninetieth': 90}
_ORD_H = {'hundredth': 100}


# ------------------------------------------------------------------------------------------------------------------------------
# text normalisation
def ordinals_to_digits(t):
    """'Fifty-seventh Pennsylvania' -> '57 Pennsylvania' (spelled ordinals up to the hundreds), on lower-case text with hyphens already spaced."""
    toks = t.split(' ')
    out, i = [], 0
    while i < len(toks):
        w = toks[i]
        if w in _ORD_UN or w in _ORD_TN or w in _ORD_H or w in _UN or w in _TN or w == 'hundred':
            j, total, cur, last_ord, seen = i, 0, 0, False, False
            end = None
            val = None
            while j < len(toks):
                x = toks[j]
                if x in _UN:
                    cur += _UN[x]
                elif x in _TN:
                    cur += _TN[x]
                elif x in _ORD_UN:
                    cur += _ORD_UN[x]; last_ord = True
                elif x in _ORD_TN:
                    cur += _ORD_TN[x]; last_ord = True
                elif x == 'hundred':
                    cur = max(cur, 1) * 100
                elif x == 'hundredth':
                    cur = max(cur, 1) * 100; last_ord = True
                elif x == 'and' and seen and j + 1 < len(toks) and (toks[j + 1] in _UN or toks[j + 1] in _TN or toks[j + 1] in _ORD_UN or toks[j + 1] in _ORD_TN):
                    j += 1
                    continue
                else:
                    break
                seen = True
                if last_ord:
                    end, val = j, total + cur
                    break
                j += 1
            if end is not None:
                out.append(str(val))
                i = end + 1
                continue
        out.append(w)
        i += 1
    return ' '.join(out)


_ROMAN = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10, 'xi': 11, 'xii': 12}


def nt(text):
    """Normal form for name matching: lower case, no punctuation or possessives, hyphens as spaces, ordinals as bare digits, roman corps numbers as digits."""
    t = (text or '').lower().replace('\u2019', "'").replace('\u2018', "'")
    t = re.sub(r"'s\b|'", '', t)
    t = re.sub(r'[-\u2013\u2014/]', ' ', t)
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    t = ' '.join(t.split())
    t = ordinals_to_digits(t)
    t = re.sub(r'\b(\d+)(?:st|nd|rd|th|d)\b', r'\1', t)
    t = re.sub(r'\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\b(?= (?:army )?corps)', lambda m: str(_ROMAN[m.group(1)]), t)
    return t


STATE_ALTS = {
    'pennsylvania': ('pa', 'penn', 'penna'), 'new york': ('ny', 'n y', 'new york'), 'massachusetts': ('mass', 'ma'), 'new jersey': ('nj', 'n j'), 'new hampshire': ('nh', 'n h', 'new hamp'),
    'maine': ('me',), 'vermont': ('vt',), 'connecticut': ('conn', 'ct'), 'rhode island': ('ri', 'r i'), 'michigan': ('mich',), 'wisconsin': ('wis',), 'minnesota': ('minn',), 'indiana': ('ind',),
    'ohio': ('o',), 'illinois': ('ill',), 'maryland': ('md',), 'delaware': ('del',), 'virginia': ('va',), 'north carolina': ('n c', 'nc', 'north carolina'), 'south carolina': ('s c', 'sc'),
    'georgia': ('ga',), 'alabama': ('ala',), 'mississippi': ('miss',), 'louisiana': ('la',), 'texas': ('tex',), 'florida': ('fla',), 'tennessee': ('tenn',), 'arkansas': ('ark',),
    'kentucky': ('ky',), 'missouri': ('mo',), 'west virginia': ('w va',), 'united states': ('us', 'u s', 'regular', 'regulars'),
}
FILLER = r'(?: (?:regiment|reg|infantry|volunteers?|vols?|vet|veteran|reserves?|cavalry|artillery|battalion|militia|battery|state|national guard|zouaves?|infty|inf|rifles?|sharpshooters?)){0,3}'


def _word_re(phrase):
    return r'(?<![a-z0-9])' + re.escape(phrase) + r'(?![a-z0-9])'


def unit_patterns(entry):
    """Regexes (on nt() text) that name the unit: its search terms with the abbreviations of the state, the designation of a division or corps, the surname of a brigade."""
    if not entry:
        return []
    pats = []
    terms = list(entry.get('search_terms') or [])
    for t in terms:
        n = nt(t)
        if not n:
            continue
        m = re.match(r'^(\d+)(?: (.*))?$', n)
        if m and m.group(2):
            rest = m.group(2)
            alts = [rest] + list(STATE_ALTS.get(rest, ()))
            first = rest.split(' ')[0]
            pats.append(r'(?<![a-z0-9])%s%s (?:%s)(?![a-z0-9])' % (m.group(1), FILLER, '|'.join(re.escape(a) for a in alts)))
            if rest in ('infantry', 'cavalry', 'battery', 'artillery') or first in ('us', 'regular'):
                pats.append(_word_re(n))
        else:
            pats.append(_word_re(n))
    name = nt(entry.get('name') or '') + ' ' + nt(entry.get('name_printed') or '')
    m = re.search(r'\b(\d+) (?:army )?corps\b', name)
    if m:
        pats.append(r'(?<![a-z0-9])%s (?:army )?corps(?![a-z0-9])' % m.group(1))
    m = re.search(r'\b(\d+) div(?:ision)?\b', name)
    if m:
        pats.append(r'(?<![a-z0-9])%s div(?:ision)?(?![a-z0-9])' % m.group(1))
    if entry.get('level') in ('brigade', 'division', 'corps', 'army', 'artillery_brigade', 'artillery_battalion', 'artillery_group', 'battery') or not pats:
        for w in nt(entry.get('name') or '').split(' '):
            if len(w) >= 4 and not w.isdigit() and w not in ('div', 'corps', 'brigade', 'division', 'battery', 'army', 'artillery', 'cavalry', 'infantry', 'reserve', 'battalion', 'horse', 'first', 'second', 'third'):
                pats.append(_word_re(w))
    return pats


def names_unit(entry, text):
    pats = unit_patterns(entry)
    if not pats:
        return True                          # nothing to match (a unit the plan lacks): the rule cannot judge
    n = nt(text)
    return any(re.search(p, n) for p in pats)


SUFFIX = {'jr', 'sr', 'ii', 'iii', 'iv', 'esq'}


def surname(name):
    toks = [t for t in nt(name).split(' ') if t and t not in SUFFIX]
    return toks[-1] if toks else ''


def has_word(text_n, w):
    """w in the normalised text, exactly or within OCR distance (one or two letters wrong)."""
    if not w:
        return True
    toks = set(text_n.split(' '))
    if w in toks:
        return True
    if len(w) < 5:
        return False
    for t in toks:
        if abs(len(t) - len(w)) <= 2 and difflib.SequenceMatcher(None, t, w).ratio() >= 0.8:
            return True
    # a name run together or split by the print: 'de trobriand' vs 'detrobriand'
    return w in text_n.replace(' ', '')


DESIG_STOP = {'the', 'of', 'and', 'regiment', 'infantry', 'volunteers', 'volunteer', 'vols', 'battalion', 'brigade', 'division', 'corps', 'army', 'battery', 'artillery', 'cavalry', 'company', 'reserves',
              'reserve', 'headquarters', 'staff', 'light', 'horse', 'a', 'in', 'at', 'with', 'first'}


def designation_named(designation, text):
    """The distinctive words and numbers of a printed designation are all in the text."""
    designation = re.sub(r'\([^)]*\)', ' ', designation).split(',')[0]          # the unit's own designation: not the places that follow it, not an alternative name in brackets
    d = [t for t in nt(designation).split(' ') if t and t not in DESIG_STOP]
    n = nt(text)
    return all(has_word(n, t) or (t.isdigit() and re.search(r'(?<![0-9])%s(?![0-9])' % t, n)) for t in d)


# ------------------------------------------------------------------------------------------------------------------------------
# dates
_MON = {'june': 6, 'jun': 6, 'july': 7, 'jul': 7}
_ORD = r'(?:st|nd|rd|th|d)'
_NOT_DATE_NEXT = r'(?!\s+(?i:division|brigade|corps|regiment|regt|battery|battalion|army|infantry|cavalry|artillery|regulars|sharpshooters|zouaves|excelsior|volunteers|reserves|vols?|pa|ny|massachusetts|new|pennsylvania|georgia|alabama|texas|virginia|ohio|maine|vermont|indiana|michigan|wisconsin|illinois|north|south|carolina|florida|mississippi|louisiana|tennessee|arkansas|kentucky|maryland|delaware|connecticut|jersey|york|hampshire|island|minnesota|missouri|iowa|u\.?\s?s|mass|penn|conn|mich|wis|minn|ind|ill|ala|miss|tenn|ark|fla|tex|ga|va|nc|sc|n\.\s?[cyjh])\b|\s+[A-Z][A-Za-z]{0,3}\.)'


def _seq(s):
    """('1, 2 and 3') -> ([1, 2, 3], is_range) ; 'to' or a dash between two numbers makes the days between them part of it."""
    nums = [(int(x), c) for x, c in re.findall(r'(\d{1,2})(?!\d)' + _ORD + r'?(\s*(?:,|and|&|to|-|\u2013|\u2014)\s*)?', s)]
    days, rng = [], False
    for k, (d, c) in enumerate(nums):
        days.append(d)
        if k + 1 < len(nums) and c and re.search(r'to|-|\u2013|\u2014', c):
            lo, hi = d, nums[k + 1][0]
            if hi > lo:
                days += list(range(lo, hi + 1))
                rng = True
    return sorted(set(days)), len(set(days)) > 1


def day_mentions(text):
    """(points, multis): points = {(month or None, day)} the text names; multis = [(month or None, [days])] for a mention of two or more days together ('July 1, 2 and 3', 'the 1st to the 3d')."""
    pts, multis = set(), []

    def add(m, days, multi):
        for d in days:
            if 1 <= d <= 31:
                pts.add((m, d))
        if multi:
            multis.append((m, [d for d in days if 1 <= d <= 31]))
    for m in re.finditer(r'1863-(\d\d)-(\d\d)(?:T\d\d:\d\d)?(?:/1863-(\d\d)-(\d\d))?', text):
        a = (int(m.group(1)), int(m.group(2)))
        pts.add(a)
        if m.group(3):
            b = (int(m.group(3)), int(m.group(4)))
            pts.add(b)
            if a != b:
                multis.append((a[0], [a[1], b[1]]) if a[0] == b[0] else (None, [a[1], b[1]]))
    seq = r'((?:\d{1,2}(?!\d)' + _ORD + r'?(?:\s*(?:,|and|&|to|-|\u2013|\u2014)\s*(?:the\s+)?)?)+)'
    for m in re.finditer(r'\b(june|july|jun|jul)\b\.?\s*(?:the\s+)?' + seq, text, re.I):
        days, multi = _seq(m.group(2))
        add(_MON[m.group(1).lower()], days, multi)
    for m in re.finditer(r'\b' + seq + r'\s*(?:day\s+)?(?:of\s+)?(june|july|jun|jul)\b', text, re.I):
        days, multi = _seq(m.group(1))
        add(_MON[m.group(2).lower()], days, multi)
    for m in re.finditer(r'\b(?:the|on|of)\s+((?:\d{1,2}(?!\d)' + _ORD + r'\b(?:\s*(?:,|and|&|to|-|\u2013|\u2014)\s*(?:the\s+)?)?)+)' + _NOT_DATE_NEXT, text):
        days, multi = _seq(m.group(1))
        add(None, days, multi)
    return pts, multis


SPAN_PHRASES = re.compile(
    r"\b(?:(?:two|three|four|five|six|seven|eight|nine|ten|\d+) days|the (?:whole|entire) (?:battle|campaign|time|engagement|action|period)|during the (?:battle|engagement|fight|action|campaign|march|three|whole|entire|siege|week)"
    r"|throughout|since (?:we|the|leaving|crossing|entering|our|June|July|May)|from the day|all (?:day|night|the day|the time)|day and night|every day|nearly every day|for (?:several|many|some|a few|the last|the past) days"
    r"|(?:entire|whole) campaign|within the last few days|the last few days|during the last|through the (?:battle|campaign|three)|the three days|the two days)\b", re.I)
CLOCK = re.compile(r"\b\d{1,2}(?::\d{2})?\s*(?:o'?\s?clock|a\.?\s?m\b|p\.?\s?m\b|m\b\.?)|\bnoon\b|\bmidnight\b|\b\d{3,4}\s*hours?\b|\b\d{1,2}\.\d{2}\s*(?:a|p)\.?\s?m", re.I)


def parse_asof(s):
    """(date lo, date hi, has_hour) or None."""
    if not isinstance(s, str):
        return None
    try:
        parts = s.split('/')
        ds = [datetime.date(int(p[0:4]), int(p[5:7]), int(p[8:10])) for p in parts]
        return ds[0], ds[-1], any('T' in p for p in parts)
    except Exception:
        return None


def _month_candidates(m, d, lo, hi):
    out = []
    for mm in ([m] if m else sorted({lo.month, hi.month})):
        try:
            out.append(datetime.date(1863, mm, d))
        except ValueError:
            pass
    return out


def dated_texts(o, anchor_text=''):
    q = o.get('quote') if isinstance(o.get('quote'), str) else ''
    note = ' '.join(x for x in (o.get('note'), o.get('basis_note')) if isinstance(x, str))
    return q, note, anchor_text or ''


def _value_period(o):
    v = o.get('value') if isinstance(o.get('value'), dict) else {}
    per = parse_asof(v.get('period')) if isinstance(v.get('period'), str) else None
    out = []
    if per:
        out.append(('period', per[0], per[1]))
    fr = parse_asof(v.get('from')) if isinstance(v.get('from'), str) else None
    to = parse_asof(v.get('to')) if isinstance(v.get('to'), str) else None
    if fr and to:
        out.append(('from..to', fr[0], to[1]))
    return out


def asof_findings(o, anchor_text):
    out = []
    a = parse_asof(o.get('as_of'))
    if not a:
        return out
    lo, hi, has_hour = a
    q, note, anc = dated_texts(o, anchor_text)
    stated = ' '.join((q, note, anc))
    point = '/' not in (o.get('as_of') or '')
    if has_hour and not CLOCK.search(stated):
        out.append(('ASOF_NARROW', 'as_of %s names an hour that neither the quote nor the note states (use the date alone, or quote the hour)' % o['as_of']))
    pts, multis = day_mentions(stated)
    quoted = q + ' ' + anc
    if point:
        sp = SPAN_PHRASES.search(stated if o.get('basis') not in TABLE_BASES else quoted)
        pts_q, multis = day_mentions(quoted)
        if sp:
            out.append(('ASOF_NARROW', 'as_of is the single day %s but the text says "%s": a span (give the range the text supports)' % (o['as_of'][:10], sp.group(0))))
        elif any(len(set(ds)) > 1 for _m, ds in multis):
            out.append(('ASOF_NARROW', 'as_of is the single day %s but the text names several days together (%s)' % (o['as_of'][:10], '; '.join('%s' % (ds,) for _m, ds in multis))))
    else:
        for m, ds in day_mentions(quoted)[1]:
            if len(set(ds)) < 2:
                continue
            ok = True
            for d in (min(ds), max(ds)):
                cands = _month_candidates(m, d, lo, hi)
                if cands and not any(lo <= c <= hi for c in cands):
                    ok = False
            if not ok:
                out.append(('ASOF_NARROW', 'as_of %s does not cover the days the text names together (%s)' % (o['as_of'][:21], ds)))
                break
    for what, p_lo, p_hi in _value_period(o):
        if lo > p_lo or hi < p_hi:
            out.append(('ASOF_NARROW', 'as_of %s does not cover value %s %s/%s: as_of is narrower than the period of the value' % (o['as_of'], what, p_lo, p_hi)))
    if point and not o.get('quote_mode') == 'image_row' and (o.get('basis') not in TABLE_BASES):
        d = lo
        if not any((m is None or m == d.month) and day == d.day for m, day in pts):
            out.append(('ASOF_POINT', 'as_of is the single day %s but neither the quote nor the note names that day (a statement without a date takes the range it supports)' % o['as_of'][:10]))
    return out


# ------------------------------------------------------------------------------------------------------------------------------
# names
def names_findings(o, entry, anchor_text):
    out = []
    q, note, anc = dated_texts(o, anchor_text)
    tier = o.get('tier')
    v = o.get('value') if isinstance(o.get('value'), dict) else {}
    text = q + ' ' + anc
    if o.get('quote_mode') == 'image_row' and isinstance(v.get('label_read'), str):
        text += ' ' + v['label_read']           # the printed label as read on the scan page: the quote of an image_row line is the OCR of that label
    if tier == 'documented' and entry is not None and not names_unit(entry, text):
        out.append(('TIER_UNIT', 'tier documented, but neither the quote nor an anchor names the unit (%s): quote the passage that names it, add an anchor (the heading), or make the line inferred' % (entry.get('name') or entry.get('name_printed'))))
    ntext = nt(text + (' ' + note if tier == 'inferred' else ''))
    f = o.get('field')
    if f in ('commander', 'officer') and isinstance(v.get('name'), str):
        s = surname(v['name'])
        if s and not has_word(ntext, s):
            out.append(('VALUE_NAMES', 'the name %r of the value is not in the quote or an anchor' % v['name']))
    if f == 'roster' and isinstance(v.get('designation'), str) and v['designation'].strip():
        if not designation_named(v['designation'], text + (' ' + note if tier == 'inferred' else '')):
            out.append(('VALUE_NAMES', 'the designation %r of the value is not in the quote or an anchor' % v['designation']))
    return out


# ------------------------------------------------------------------------------------------------------------------------------
# enlisted_only
ENLISTED_RE = re.compile(r"enlisted|exclusive of|excluding|not including|exclusively|besides|in addition|not counting|apart from|rank and file|non-?commissioned|privates|"
                         r"(?:and|with|plus|also)\s+(?:\w+\s+){0,3}officers|officers?\s+(?:not|are not|were not)|without (?:the )?officers|(?:the )?officers? (?:and|being|are)", re.I)


def enlisted_findings(o, anchor_text):
    v = o.get('value') if isinstance(o.get('value'), dict) else {}
    if o.get('field') != 'strength' or v.get('men') != 'enlisted_only':
        return []
    cols = [str(c).lower() for c in (v.get('row_columns') or [])]
    if any('officer' in c for c in cols) and any(('men' in c or 'enlisted' in c) and 'officer' not in c for c in cols):
        return []                                            # the table prints the officers in a column of their own
    q = o.get('quote') if isinstance(o.get('quote'), str) else ''
    if ENLISTED_RE.search(q + ' ' + (anchor_text or '')):
        return []
    return [('ENLISTED', 'men is enlisted_only but the quote does not say the officers are left out (use men not_stated, or quote the sentence or column that excludes them)')]


# ------------------------------------------------------------------------------------------------------------------------------
# hedges
UPPER = ('less than', 'fewer than', 'not more than', 'no more than', 'not exceeding', 'under')
LOWER = ('over', 'upward of', 'upwards of', 'more than', 'at least', 'not less than', 'exceeding')
APPROX = ('about', 'nearly', 'almost', 'approximately', 'around')
BOUND_WORDS = UPPER + LOWER + APPROX
BOUND_KIND = {w: 'upper' for w in UPPER}
BOUND_KIND.update({w: 'lower' for w in LOWER})
BOUND_KIND.update({w: 'approx' for w in APPROX})
_HEDGE_RE = re.compile(r'(?<![a-z])(' + '|'.join(sorted((re.escape(w).replace('\\ ', r'\s+') for w in BOUND_WORDS), key=len, reverse=True)) + r')(?![a-z])\s*(?:the\s+|a\s+)?(?:total\s+of\s+)?', re.I)
_NUMW = set(_UN) | set(_TN) | {'hundred', 'thousand', 'and', 'a'}


def _next_number(s):
    toks = re.findall(r"[A-Za-z]+|\d[\d,]*", s[:80])
    run = []
    for t in toks:
        tl = t.lower()
        if t[0].isdigit() or tl in _NUMW:
            run.append(t)
        else:
            break
        if len(run) >= 6:
            break
    while run and run[-1].lower() in ('and', 'a'):
        run.pop()
    if not run:
        return None
    import kit_evidence_lib as K
    nums = K.numbers_in_text(' '.join(run))
    return max(nums) if nums else None


def hedge_in_text(q, wanted):
    """[(word, number)] of the bound words of the text that stand directly before a number of `wanted`."""
    out = []
    for m in _HEDGE_RE.finditer(q):
        n = _next_number(q[m.end():])
        if n is not None and n in wanted:
            out.append((re.sub(r'\s+', ' ', m.group(1).lower()), n))
    return out


def hedge_findings(o, anchor_text):
    import kit_evidence_lib as K
    f, v = o.get('field'), o.get('value')
    if f not in K.NUMBER_PATHS or not isinstance(v, dict):
        return []
    q = (o.get('quote') if isinstance(o.get('quote'), str) else '') + ' ' + (anchor_text or '')
    wanted = set(K.value_numbers(f, v))
    if f == 'strength':
        wanted |= {x for x in (v.get('low'), v.get('high')) if isinstance(x, int) and x > 0}
    found = hedge_in_text(q, wanted) if o.get('quote_mode') != 'image_row' else []
    h = o.get('hedge')
    out = []
    if found and not isinstance(h, dict):
        w, n = found[0]
        out.append(('HEDGE', 'the quote says "%s %s" and the line has no hedge field ({"word": "%s", "bound": "%s"})' % (w, n, w, BOUND_KIND[w])))
    elif isinstance(h, dict):
        w = str(h.get('word', '')).lower()
        if w not in BOUND_WORDS:
            out.append(('HEDGE', 'hedge.word %r is one of %s' % (h.get('word'), ', '.join(BOUND_WORDS))))
        elif not re.search(r'(?<![a-z])' + re.escape(w).replace('\\ ', r'\s+') + r'(?![a-z])', q, re.I):
            out.append(('HEDGE', 'hedge.word %r is not in the quote' % h.get('word')))
        elif BOUND_KIND[w] != h.get('bound'):
            out.append(('HEDGE', 'hedge.bound for "%s" is %s, not %r' % (w, BOUND_KIND[w], h.get('bound'))))
    return out


# ------------------------------------------------------------------------------------------------------------------------------
def line_findings(o, entry, anchor_text=''):
    """[(code, message)] of the content rules for one evidence line that has a quote, before waivers."""
    if not isinstance(o.get('quote'), str) or o.get('tier') not in ('documented', 'inferred') or o.get('basis') == 'derived':
        return []
    out = []
    out += asof_findings(o, anchor_text)
    out += names_findings(o, entry, anchor_text)
    out += enlisted_findings(o, anchor_text)
    out += hedge_findings(o, anchor_text)
    return out


def shape_errors(o):
    """Errors of the form of hedge, anchor and distinct_basis (waive_rules is judged by resolve)."""
    out = []
    if 'hedge' in o:
        h = o['hedge']
        if not (isinstance(h, dict) and set(h) == {'word', 'bound'} and isinstance(h['word'], str) and h['bound'] in ('upper', 'lower', 'approx')):
            out.append(('HEDGE', 'hedge is {"word": "<bound word of the quote>", "bound": "upper" | "lower" | "approx"}'))
    if 'anchor' in o:
        a = o['anchor']
        if not (isinstance(a, list) and a and len(a) <= 4 and all(isinstance(x, dict) and set(x) <= {'text', 'offset', 'note'} and {'text', 'offset'} <= set(x) and isinstance(x['text'], str) and 12 <= len(x['text']) <= 600
                                                                   and isinstance(x['offset'], int) and not isinstance(x['offset'], bool) and x['offset'] >= 0 for x in a)):
            out.append(('ANCHOR', 'anchor is a list of 1 to 4 {"text": 12-600 characters of the source, "offset": character offset}'))
    if 'distinct_basis' in o and not (isinstance(o['distinct_basis'], str) and len(o['distinct_basis'].strip()) >= MIN_DISTINCT):
        out.append(('FIGURE_DISAGREE', 'distinct_basis is a sentence (%d+ characters) saying how the figure differs in kind or period' % MIN_DISTINCT))
    return out


def waivers(o):
    """({code: reason} of valid waivers, [(code, message)] of malformed ones)."""
    w = o.get('waive_rules')
    if w is None:
        return {}, []
    if not isinstance(w, dict) or not w:
        return {}, [('WAIVER', 'waive_rules is {"<RULE CODE>": "<reason>"}')]
    good, bad = {}, []
    for k, r in w.items():
        if k not in RULE_CODES:
            bad.append(('WAIVER', 'waive_rules: %r is not a rule code (%s)' % (k, ', '.join(RULE_CODES))))
        elif not (isinstance(r, str) and len(r.strip()) >= MIN_REASON):
            bad.append(('WAIVER', 'waive_rules.%s needs a reason of at least %d characters (why the line is correct as it stands)' % (k, MIN_REASON)))
        else:
            good[k] = r.strip()
    return good, bad


def resolve(o, findings):
    """(errors, waived codes): a finding whose code has a valid waiver is not an error; a malformed waiver is."""
    good, bad = waivers(o)
    errs = list(bad)
    waived = set()
    for c, m in findings:
        if c in good:
            waived.add(c)
        else:
            errs.append((c, m))
    return errs, sorted(waived)


# ------------------------------------------------------------------------------------------------------------------------------
# figures of different lines
_KINDS = ('killed', 'wounded', 'missing')
_MEN_GROUP = {'officers_only': 'O', 'enlisted_only': 'E', 'rank_and_file': 'E', 'officers_and_men': 'T', 'aggregate': 'T', 'not_stated': 'T'}
_STRENGTH_KIND = {'taken_into_action': 'action', 'estimate_in_report': 'action', 'present_for_duty': 'pfd', 'effective_total': 'eff', 'aggregate_present': 'agg',
                  'aggregate_present_and_absent': 'aggabs', 'muster_or_roll': 'roll'}


def _kind_total(d):
    if not isinstance(d, dict):
        return None
    if d.get('total') is not None:
        return d['total']
    if d.get('officers') is not None or d.get('enlisted') is not None:
        return (d.get('officers') or 0) + (d.get('enlisted') or 0)
    return None


def cas_facts(v):
    scope = v.get('scope') or ''
    kinds = {k: _kind_total(v.get(k)) for k in _KINDS}
    kinds = {k: t for k, t in kinds.items() if t is not None}
    facts = {}
    for r in range(1, len(kinds) + 1):
        for combo in itertools.combinations(sorted(kinds), r):
            facts[(scope, frozenset(combo))] = sum(kinds[k] for k in combo)
    for c in v.get('combined') or []:
        if isinstance(c, dict) and isinstance(c.get('total'), int):
            facts[(scope, frozenset(c.get('kinds') or ()))] = c['total']
    if v.get('total') is not None and not (v.get('combined') and not kinds):
        facts[(scope, frozenset(_KINDS))] = v['total']
    return facts


def _dates(o, use_period):
    v = o.get('value') if isinstance(o.get('value'), dict) else {}
    a = parse_asof(v.get('period')) if use_period and isinstance(v.get('period'), str) else None
    a = a or parse_asof(o.get('as_of'))
    return (a[0], a[1]) if a else None


def _overlap(x, y):
    return x is not None and y is not None and x[0] <= y[1] and y[0] <= x[1]


def _hedged_compatible(o1, o2, a, b):
    """a and b are the figures; True when a hedge on either line makes the two figures consistent."""
    for o, x, y in ((o1, a, b), (o2, b, a)):
        h = o.get('hedge')
        if isinstance(h, dict):
            if h.get('bound') == 'upper' and y <= x:
                return True
            if h.get('bound') == 'lower' and y >= x:
                return True
            if h.get('bound') == 'approx' and x and abs(x - y) <= 0.15 * max(x, y):
                return True
    return False


def _sig(o):
    v = o.get('value') if isinstance(o.get('value'), dict) else {}
    if o.get('field') == 'casualties':
        per = v.get('period') if isinstance(v.get('period'), str) else o.get('as_of')
        kinds = tuple(k for k in _KINDS if _kind_total(v.get(k)) is not None)
        return (per, v.get('scope') or '', kinds, tuple(sorted(tuple(c.get('kinds') or ()) for c in v.get('combined') or [] if isinstance(c, dict))))
    return (o.get('as_of'), v.get('scope') or '', _MEN_GROUP.get(v.get('men')), _STRENGTH_KIND.get(o.get('basis')))


def _differ(o1, o2):
    f = o1['field']
    v1, v2 = o1['value'], o2['value']
    if f == 'casualties':
        if not _overlap(_dates(o1, True), _dates(o2, True)):
            return None
        f1, f2 = cas_facts(v1), cas_facts(v2)
        for k in f1:
            if k in f2 and f1[k] != f2[k] and not _hedged_compatible(o1, o2, f1[k], f2[k]):
                return 'casualties %s: %s against %s' % (sorted(k[1]), f1[k], f2[k])
        return None
    if f == 'strength':
        if _STRENGTH_KIND.get(o1.get('basis')) != _STRENGTH_KIND.get(o2.get('basis')) or _MEN_GROUP.get(v1.get('men')) != _MEN_GROUP.get(v2.get('men')):
            return None
        if (v1.get('scope') or '') != (v2.get('scope') or '') or not _overlap(_dates(o1, False), _dates(o2, False)):
            return None
        if (v1['low'], v1['high']) == (v2['low'], v2['high']):
            return None
        if _hedged_compatible(o1, o2, v1['high'], v2['high']) or _hedged_compatible(o1, o2, v1['low'], v2['low']):
            return None
        return 'strength %s-%s against %s-%s' % (v1['low'], v1['high'], v2['low'], v2['high'])
    return None


def disagreements(lines, in_set):
    """{id: message}: the later line of every pair of accepted casualty or strength lines of one unit whose figures differ over overlapping dates, unless both are in one conflict set
    (the same key), the pair differs in period, scope or kind and one line says so in distinct_basis, or the later line waives FIGURE_DISAGREE with a reason."""
    by = {}
    for lid, o in lines:
        if o.get('field') in ('casualties', 'strength') and o.get('unit_id') and isinstance(o.get('value'), dict) and o.get('basis') != 'derived':
            by.setdefault((o['unit_id'], o['field']), []).append((lid, o))
    out = {}
    for _k, ms in by.items():
        for j in range(1, len(ms)):
            lid2, o2 = ms[j]
            good, _bad = waivers(o2)
            if 'FIGURE_DISAGREE' in good:
                continue
            for i in range(j):
                lid1, o1 = ms[i]
                try:
                    why = _differ(o1, o2)
                except (KeyError, TypeError):
                    why = None
                if not why:
                    continue
                c1, c2 = o1.get('conflict'), o2.get('conflict')
                if isinstance(c1, dict) and isinstance(c2, dict) and c1.get('key') == c2.get('key'):
                    continue
                decl = [o for o in (o1, o2) if isinstance(o.get('distinct_basis'), str) and len(o['distinct_basis'].strip()) >= MIN_DISTINCT]
                if decl:
                    if _sig(o1) != _sig(o2):
                        continue
                    out[lid2] = 'distinct_basis is declared against %s but the two lines have the same period, scope and kinds (%s): they are one quantity with two figures, give both the same conflict key' % (lid1, why)
                    break
                out[lid2] = 'differs from the accepted line %s (%s) and shares no conflict key: set conflict {"key", "alt"} on both (no default is picked), or declare distinct_basis if the period, scope or kind differs' % (lid1, why)
                break
    return out
