"""Parsers of the conflict-resolution validator: clock expressions, numbers, day-of-month references, phrase matching, banned product copy.

Nothing here reads a file or the network. Everything works on the text of a QUOTE (the short passage a citation carries), so the validator can check
mechanically that a value a researcher states (a clock time, a number, a day, a name) stands in the passage that is supposed to state it.

A parse is deliberately generous (it returns every reading a phrase allows: "4 o'clock" is 04:00 and 16:00) and the check is a subset test
(the value must be one of the readings), so a correct statement is never refused; what the parsers cannot do is judge whether the passage means
what the researcher says, and that stays with the independent reviewer (PLAN.md, section 11).
"""
import re
import unicodedata

# ----------------------------------------------------------------------------------------------------------------------------- text
_QUOTES = str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', ' ': ' '})


def norm(text):
    """Lower-case, typographic quotes and dashes plain, whitespace collapsed."""
    t = unicodedata.normalize('NFKC', text or '').translate(_QUOTES).lower()
    return ' '.join(t.split())


# ----------------------------------------------------------------------------------------------------------------------------- number words
_ONES = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12,
         'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19}
_TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fourty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
_ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10, 'eleventh': 11,
        'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19,
        'twentieth': 20, 'thirtieth': 30}
_HOURWORDS = dict(_ONES)
_HOURWORDS = {k: v for k, v in _HOURWORDS.items() if v <= 12}


def _word_numbers(toks):
    """Numbers written in words in a list of lower-case word tokens: 'two hundred and fifty', 'thirteen hundred', 'twenty-five', 'a dozen'."""
    out = set()
    i, n = 0, len(toks)
    while i < n:
        w = toks[i]
        if w in ('a', 'an') and i + 1 < n and toks[i + 1] in ('dozen', 'score', 'hundred', 'thousand'):
            out.add({'dozen': 12, 'score': 20, 'hundred': 100, 'thousand': 1000}[toks[i + 1]])
            i += 2
            continue
        if w not in _ONES and w not in _TENS and w not in ('hundred', 'thousand', 'dozen', 'score'):
            i += 1
            continue
        total, cur, j, prev = 0, 0, i, None
        while j < n:
            x = toks[j]
            if x == 'and' and prev in ('hundred', 'thousand') and j + 1 < n and (toks[j + 1] in _ONES or toks[j + 1] in _TENS):
                j += 1
                continue
            if x in _ONES:
                if prev in ('small', 'unit'):
                    break
                cur += _ONES[x]
                prev = 'unit' if prev == 'tens' else 'small'
            elif x in _TENS:
                if prev in ('small', 'tens', 'unit'):
                    break
                cur += _TENS[x]
                prev = 'tens'
            elif x == 'hundred':
                if prev in ('hundred', 'thousand'):
                    break
                cur = max(cur, 1) * 100
                prev = 'hundred'
            elif x == 'thousand':
                if prev == 'thousand':
                    break
                total += max(cur, 1) * 1000
                cur = 0
                prev = 'thousand'
            elif x in ('dozen', 'score'):
                cur = max(cur, 1) * (12 if x == 'dozen' else 20)
                prev = 'unit'
            else:
                break
            j += 1
        if j > i:
            out.add(total + cur)
            # also the parts: 'twenty-five' is 25 but a reader may also quote 'twenty'
            if total == 0 and cur >= 20 and cur % 10 and cur < 100:
                out.add(cur - cur % 10)
            i = max(j, i + 1)
        else:
            i += 1
    return out


def numbers_in(text):
    """The numbers a text states: digit groups (thousands commas and the OCR thousands space 'N, NNN' joined), decimals, fractions, vulgar halves, number words.
    Returns a set of ints and floats."""
    t = norm(text).replace('½', ' 1/2 ').replace('¼', ' 1/4 ').replace('¾', ' 3/4 ')
    nums = set()
    t2 = re.sub(r'(?<=\d),\s?(?=\d{3}(?!\d))', '', t)
    for m in re.finditer(r'\d+(?:\.\d+)?', t2):
        v = float(m.group())
        nums.add(int(v) if v == int(v) else v)
    for m in re.finditer(r'(\d+)\s*/\s*(\d+)', t2):
        if float(m.group(2)):
            nums.add(float(m.group(1)) / float(m.group(2)))
    for m in re.finditer(r'(\d+)\s+(\d+)\s*/\s*(\d+)', t2):
        if float(m.group(3)):
            nums.add(float(m.group(1)) + float(m.group(2)) / float(m.group(3)))
    toks = re.findall(r"[a-z]+", t.replace('-', ' '))
    nums |= _word_numbers(toks)
    return nums


def number_in(value, text):
    """True when the number `value` is among the numbers the text states."""
    have = numbers_in(text)
    return any(abs(float(value) - float(h)) < 1e-9 for h in have)


# ----------------------------------------------------------------------------------------------------------------------------- clock
_H = r'(\d{1,2}|' + '|'.join(sorted(_HOURWORDS, key=len, reverse=True)) + r')'
_AM = r"a\.?\s?m\b\.?"
_PM = r"p\.?\s?m\b\.?"
_AMPM = r'(' + _AM + '|' + _PM + r')'
_RX = [
    # 4.30 a. m. / 10:15 / 3.45 o'clock
    ('hm', re.compile(r"(?<![\d.])(\d{1,2})\s*[.:]\s*(\d{2})(?![\d])\s*(?:o'?\s?clock\s*)?" + r'(?:' + _AMPM + r')?')),
    # 1 a. m. / 2 p. m.
    ('h_ampm', re.compile(r'(?<![\d.:])' + _H + r'\s*' + _AMPM)),
    # 7 o'clock / seven o'clock, optional a. m./p. m.
    ('h_oclock', re.compile(r'(?<![\d.:])' + _H + r"\s*o'?\s?clock\s*(?:" + _AMPM + r')?')),
    # half past 3 / half-past three
    ('half', re.compile(r'half[\s-]*(?:past|after)\s+' + _H + r'\b')),
    ('quarter_past', re.compile(r'(?:a\s+)?quarter\s+(?:past|after)\s+' + _H + r'\b')),
    ('quarter_to', re.compile(r'(?:a\s+)?quarter\s+(?:to|before|of)\s+' + _H + r'\b')),
    ('min_rel', re.compile(r'(\d{1,2}|[a-z]+(?:[\s-][a-z]+)?)\s+minutes?\s+(past|after|before|to|of)\s+' + _H + r'\b')),
    # between 7 and 8 o'clock / from 4 to 5 p. m.
    ('pair', re.compile(r"(?<![\d.:])(\d{1,2})\s*(?:and|to|or|-)\s*(\d{1,2})\s*(?:o'?\s?clock\s*)?" + _AMPM)),
    ('pair_oc', re.compile(r"(?<![\d.:])(\d{1,2})\s*(?:and|to|or)\s*(\d{1,2})\s*o'?\s?clock")),
]
_PARTOFDAY_PM = re.compile(r'in the (afternoon|evening|night)|at night|p\.?\s?m')
_PARTOFDAY_AM = re.compile(r'in the (morning|forenoon)|a\.?\s?m')


def _hnum(tok):
    tok = tok.strip()
    if tok.isdigit():
        return int(tok)
    return _HOURWORDS.get(tok)


def _cands(h, m, ampm=None):
    """Minutes of day a reading allows: with a.m./p.m. one value, without both."""
    out = set()
    if h is None or m is None or not (0 <= m <= 59):
        return out
    if ampm == 'a':
        if 1 <= h <= 12:
            out.add((0 if h == 12 else h) * 60 + m)
    elif ampm == 'p':
        if 1 <= h <= 12:
            out.add((12 if h == 12 else h + 12) * 60 + m)
    else:
        if 0 <= h <= 24:
            if 1 <= h <= 11:
                out.add(h * 60 + m)
                out.add((h + 12) * 60 + m)
            elif h == 12:
                out.add(12 * 60 + m)
                out.add(0 * 60 + m)
            elif h == 0 or h == 24:
                out.add(0 * 60 + m)
            else:
                out.add(h * 60 + m)       # a 24-hour reading such as 14.30
    return out


def _ampm_of(tok):
    if not tok:
        return None
    return 'a' if tok.replace(' ', '').startswith('a') else 'p'


def clock_readings(text):
    """List of {'minutes': set of minutes-of-day, 'form': str, 'span': (a, b), 'text': str} for every clock expression of the text."""
    t = norm(text)
    out = []

    def add(minutes, form, m):
        if minutes:
            out.append({'minutes': set(minutes), 'form': form, 'span': m.span(), 'text': m.group(0).strip()})

    for form, rx in _RX:
        for m in rx.finditer(t):
            g = m.groups()
            tail = t[m.end():m.end() + 24]
            hint = None
            if _PARTOFDAY_PM.match(tail.lstrip()) and not re.match(r'\s*p\.?\s?m', tail):
                hint = 'p'
            elif _PARTOFDAY_AM.match(tail.lstrip()) and not re.match(r'\s*a\.?\s?m', tail):
                hint = 'a'
            if form == 'hm':
                h, mi, ap = int(g[0]), int(g[1]), _ampm_of(g[2])
                add(_cands(h, mi, ap or hint), form, m)
            elif form == 'h_ampm':
                add(_cands(_hnum(g[0]), 0, _ampm_of(g[1])), form, m)
            elif form == 'h_oclock':
                ap = _ampm_of(g[1]) if len(g) > 1 else None
                add(_cands(_hnum(g[0]), 0, ap or hint), form, m)
            elif form == 'half':
                add(_cands(_hnum(g[0]), 30, hint), form, m)
            elif form == 'quarter_past':
                add(_cands(_hnum(g[0]), 15, hint), form, m)
            elif form == 'quarter_to':
                h = _hnum(g[0])
                if h:
                    add({(x - 15) % 1440 for x in _cands(h, 0, hint)}, form, m)
            elif form == 'min_rel':
                k = g[0]
                kv = int(k) if k.isdigit() else (_word_numbers(re.findall(r'[a-z]+', k)) or {None}).pop()
                h = _hnum(g[2])
                if kv is not None and h and 0 < kv < 60:
                    base = _cands(h, 0, hint)
                    sign = 1 if g[1] in ('past', 'after') else -1
                    add({(x + sign * kv) % 1440 for x in base}, form, m)
            elif form in ('pair', 'pair_oc'):
                ap = _ampm_of(g[2]) if form == 'pair' else None
                add(_cands(int(g[0]), 0, ap or hint) | _cands(int(g[1]), 0, ap or hint), form, m)
    for m in re.finditer(r'\bnoon\b|\bmeridian\b|(?<![\d.])12\s*m\b\.?(?!\w)', t):
        out.append({'minutes': {720}, 'form': 'noon', 'span': m.span(), 'text': m.group(0)})
    for m in re.finditer(r'\bmidnight\b', t):
        out.append({'minutes': {0, 1440}, 'form': 'midnight', 'span': m.span(), 'text': m.group(0)})
    return out


def clock_set(text):
    """Set of 'HH:MM' strings (24 h) every clock expression of the text can mean."""
    s = set()
    for r in clock_readings(text):
        for mn in r['minutes']:
            mn %= 1440
            s.add('%02d:%02d' % (mn // 60, mn % 60))
    return s


def hhmm_to_min(s):
    m = re.fullmatch(r'(\d{1,2}):(\d{2})', s or '')
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def clock_in(hhmm, text):
    """True when the 24-hour 'HH:MM' is among the readings of the clock expressions in the text ('24:00' is read as 00:00)."""
    if hhmm == '24:00':
        hhmm = '00:00'
    return hhmm in clock_set(text)


# ----------------------------------------------------------------------------------------------------------------------------- days
_MONTHS = {'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3, 'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
           'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9, 'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12}
_MON_RX = r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'


def days_in(text):
    """(set of day-of-month numbers, set of month numbers) a text mentions: '2d', '3rd', 'July 2', '2 July', 'the second', 'the 2d inst.'. Months may be empty."""
    t = norm(text)
    days, months = set(), set()
    for m in re.finditer(r'(?<![\d.:])(\d{1,2})\s*(?:st|nd|rd|th|d)\b', t):
        v = int(m.group(1))
        if 1 <= v <= 31:
            days.add(v)
    for m in re.finditer(_MON_RX + r'\.?\s+(\d{1,2})(?![\d:])', t):
        v = int(m.group(2))
        if 1 <= v <= 31:
            days.add(v)
            months.add(_MONTHS[m.group(1)[:3] if m.group(1)[:3] in _MONTHS else m.group(1)])
    for m in re.finditer(r'(?<![\d:.])(\d{1,2})\s+' + _MON_RX + r'\b', t):
        v = int(m.group(1))
        if 1 <= v <= 31:
            days.add(v)
            months.add(_MONTHS[m.group(2)[:3] if m.group(2)[:3] in _MONTHS else m.group(2)])
    for m in re.finditer(r'\b(?:the\s+)?(' + '|'.join(sorted(_ORD, key=len, reverse=True)) + r')\b(?:\s+(?:inst|instant|ult|ultimo|of))?', t):
        days.add(_ORD[m.group(1)])
    for m in re.finditer(_MON_RX + r'\b', t):
        months.add(_MONTHS[m.group(1)[:3] if m.group(1)[:3] in _MONTHS else m.group(1)])
    return days, months


def date_in(iso, text):
    """True when an ISO date 'YYYY-MM-DD' (or 'MM-DD') has its day among the days of the text (and its month, when the text names months)."""
    m = re.fullmatch(r'(?:\d{4}-)?(\d{2})-(\d{2})', iso or '')
    if not m:
        return False
    mon, day = int(m.group(1)), int(m.group(2))
    days, months = days_in(text)
    if day not in days:
        return False
    return (not months) or (mon in months)


# ----------------------------------------------------------------------------------------------------------------------------- phrases
_LIG = {'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl'}


def skeleton(text):
    """Lower-case letters and digits only (ligatures and accents reduced): the comparison form of a phrase."""
    t = unicodedata.normalize('NFKD', (text or '').lower())
    for k, v in _LIG.items():
        t = t.replace(k, v)
    return ''.join(ch for ch in t if ch.isascii() and ch.isalnum())


def phrase_in(phrase, text):
    sp = skeleton(phrase)
    return bool(sp) and sp in skeleton(text)


# ----------------------------------------------------------------------------------------------------------------------------- banned copy
BANNED = re.compile(r"\b(?:AI|A\.I\.|Claude|Anthropic|LLMs?|sub-?agents?|agents?|automated(?:ly)?|machine[- ]generated|language[- ]model|chat-?bots?|prompts?)\b", re.I)


def banned_words(text):
    """The words of a product text that would reveal how the site was made (copy audit, CLAUDE.md): a list, empty when the text is clean."""
    return sorted({m.group(0) for m in BANNED.finditer(text if isinstance(text, str) else '')})


# ----------------------------------------------------------------------------------------------------------------------------- hedges
HEDGES = {
    'exact': None,
    'about': r'\b(?:about|abt|nearly|near|around|some\s+time|towards?|toward)\b',
    'upper': r'\b(?:before|ere|not\s+later\s+than|by|until|till|up\s+to|prior\s+to)\b',
    'lower': r'\b(?:after|not\s+before|since|from|later\s+than)\b',
    'soon_after': r'\b(?:soon\s+after|shortly\s+after|just\s+after|a\s+little\s+after|immediately\s+after|directly\s+after)\b',
    'window': r'\b(?:between|from)\b.*\b(?:and|to)\b',
}


def hedge_in(hedge, text):
    """Warning-level check that a stated hedge ('about', 'upper', ...) has a word in the quote that carries it. True when no hedge is claimed or one is found."""
    rx = HEDGES.get(hedge)
    if rx is None:
        return True
    return bool(re.search(rx, norm(text)))


if __name__ == '__main__':
    import sys
    for s in sys.argv[1:]:
        print(s, '->', sorted(clock_set(s)), sorted(numbers_in(s)), days_in(s))
