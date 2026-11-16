"""Dates printed in the Bates rolls and the inference 'on the rolls in July 1863' (from printed dates only).

The date of muster into service stands in the date cell ("June 6, '61,"); the remarks print the events of the man's service with their dates
("Discharged on Surgeon's certificate, Dec. 22, '62.", "Killed at Charles City Cross Roads, June 30, 1862.", "Mustered out with company, June 13, 1864.").
A date is read only in the clean printed forms (month, day, year of two or four digits); a damaged date is no date.  Nothing here changes a line.
"""
import re

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
_MON = re.compile(r"^[.'‘’`\"]*(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]{0,6}[.,;:]*$")
_DAY = re.compile(r"^[.,]*(\d{1,2})[.,;:]*$")
_YEAR = re.compile(r"^[.'‘’`\"■•]*(?:18)?(6[1-5])[.,;:—\-]*$")
_YEAR4 = re.compile(r"^[.'‘’`\"]*(18)(6[1-5])[.,;:—\-]*$")


def month_of(tok):
    m = _MON.match(tok)
    return MONTHS[m.group(1)[:3].lower()] if m else None


def read_dates(tokens):
    """Clean dates in a token list: [(index of the month word, end index, (year, month, day or None))].  A month followed by a day and a year,
    or by a year alone (day None).  Years 1861 to 1865 only."""
    out = []
    i = 0
    n = len(tokens)
    while i < n:
        m = month_of(tokens[i])
        if m:
            day, j = None, i + 1
            dm = _DAY.match(tokens[j]) if j < n else None
            if dm and 1 <= int(dm.group(1)) <= 31:
                day, j = int(dm.group(1)), j + 1
            ym = None
            if j < n:
                ym = _YEAR4.match(tokens[j])
                y = int('18' + ym.group(2)) if ym else None
                if not ym:
                    ym2 = _YEAR.match(tokens[j])
                    y = int('18' + ym2.group(1)) if ym2 else None
                if y:
                    out.append((i, j + 1, (y, m, day)))
                    i = j + 1
                    continue
        i += 1
    return out


_SEP = re.compile(r"^(?:disch|dism|resign|resgd|died|killed|deserted|desert|dropped|drop|muster|mus|mustd|must|transf|trans|tr\b|expired|exch|honorably|retired|cashier|discharged)", re.I)
_SEP_WORD = re.compile(r"^[^A-Za-z]*(disch|dism|resign|resgd|died|killed|deserted|dropped|drop|mustered|mus|must|transferred|transf|trans|tr|exchanged|cashiered|retired)[a-z.]*[^A-Za-z]*$", re.I)
_RETURN = re.compile(r"return|re-?enl|reenl|again|rejoined|re-?mus|reinstat|re-?appoint|re-?turn", re.I)
_UNCERTAIN = re.compile(r"not\s+on\s+muster|not\s+mustered|never\s+joined|date\s+unknown|unknown|not\s+accounted|no\s+record|see\s+", re.I)
_INTERNAL = re.compile(r"compan|co\.|reg\.\s*(?:of|p\.)?\s*v\.?\s*c|vet\.\s*res|v\.\s*r\.\s*c|reserve\s+corps|invalid", re.I)


def classify_clause(words):
    """'sep' when the words before a date print a separation from the regiment, 'other' otherwise."""
    for k, w in enumerate(words):
        if _SEP_WORD.match(w):
            lw = w.lower().strip('.,;:')
            if lw.startswith(('transf', 'trans', 'tr')):
                nxt = ' '.join(words[k + 1:k + 4]).lower()
                # a transfer to another company of the same regiment, or from another unit, is not a separation from the regiment
                if re.search(r'^\s*(to\s+)?(co\.|company|comp)', nxt) or re.match(r'^\s*from', nxt):
                    return 'other'
            if lw.startswith(('mus', 'must')):
                if not re.search(r'out|o\.|discharge', ' '.join(words[k + 1:k + 3]).lower()):
                    return 'other'          # "Mustered into ..." / "Mus. as private" is not a separation
            return 'sep'
    return 'other'


def on_rolls(rem_tokens, month_cell_ok=True):
    """('yes' | 'no' | None, basis text).  rem_tokens: the words of the date cell and the remarks, in the order of the page.
    yes: a clean muster date on or before 30 June 1863, and either no separation printed, or every separation printed dated on or after 1 July 1863,
         no return/re-enlistment words, no uncertain phrase.
    no:  a muster date after 3 July 1863, or a separation with a clean date before 1 July 1863 and no return/re-enlistment words.
    None: everything else (damaged or missing dates, doubtful remarks)."""
    txt = ' '.join(rem_tokens)
    dates = read_dates(rem_tokens)
    muster = None
    # the muster date is the first date and stands in the date cell: before any word of the remarks (a verb)
    if dates and dates[0][0] <= 1 and not any(_SEP_WORD.match(w) for w in rem_tokens[:dates[0][0]]):
        muster = dates[0][2]
    seps = []
    for (a, b, dt) in dates[(1 if muster else 0):]:
        back = rem_tokens[max(0, a - 7):a]
        # clause: words after the last dash or semicolon before the date
        cut = max([k for k, w in enumerate(back) if w.strip() in ('—', '-', '--', ';') or w.endswith(';') or w.endswith('—')] or [-1])
        clause = back[cut + 1:]
        if classify_clause(clause) == 'sep':
            seps.append(dt)
    # separation verbs without a clean date next to them
    sep_words = [w for w in rem_tokens[(dates[0][1] if muster else 0):] if _SEP_WORD.match(w)]
    undated = len(sep_words) > len(seps)
    returned = bool(_RETURN.search(txt))
    uncertain = bool(_UNCERTAIN.search(txt))
    cut_day = (1863, 7, 1)

    def before(d):
        y, m, day = d
        return (y, m, day or 1) < cut_day if not (y == 1863 and m == 7 and day is None) else False
    if muster and (muster[0], muster[1], muster[2] or 1) > (1863, 7, 3):
        return 'no', 'enl %s after 3 July 1863' % fmt(muster)
    if returned or uncertain:
        return None, ''
    early = [d for d in seps if before(d)]
    if early:
        return 'no', 'sep-before %s' % fmt(min(early))
    if muster and (muster[0], muster[1], muster[2] or 1) < cut_day and not undated:
        if seps:
            return 'yes', 'enl %s; sep %s on or after 1 July 1863' % (fmt(muster), fmt(min(seps)))
        if not sep_words:
            return 'yes', 'enl %s; no separation printed' % fmt(muster)
    return None, ''


def fmt(d):
    y, m, day = d
    names = ['', 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
    return '%s%s %d' % (names[m], (' %d,' % day) if day else ',', y)
