"""Reading of the printed dates of a Moore roster entry, for two derived marks that live in the flag files and never in a line:

  on_rolls_july_1863   'yes' / 'no' / 'unknown', INFERRED from the printed date of enlistment (or commission) and the printed dates of separation
                       (died, killed, discharged, resigned, deserted, transferred out), nothing else.  It is no statement that the man was at Gettysburg
                       (men sick, detached or prisoners were on the rolls too), and 'unknown' is the answer whenever a date is missing, damaged or ambiguous.
  names_gettysburg     the remarks print the word Gettysburg (OCR-tolerant, a lower bound); gettysburg_dated: the same clause prints 1, 2 or 3 July 1863.

Moore prints "e. May 17th, '61; Ashe co.; w. at Gettysburg." : the clauses are separated by semicolons; the abbreviations are
e. enlisted, cm. commissioned, c. captured, d. died, dg. discharged, dt. detailed, k. killed, m. missing, p. promoted, pr. prisoner, r. resigned,
tr. transferred, w. wounded.

Rules (clause by clause; a clause ends at a semicolon, at ':' or '|' that the OCR reads for it, and before a lost-semicolon event word):
  start   the first clause that begins with e. or cm. (or 'enlisted'): its date (a day date, or a month and year);
  end     a clause that begins with d. dg. k. r. (died, discharged, killed, resigned), des. / deserted / dismissed, or tr. to a place that is no company of the
          same regiment: the first full date of the clause; a promotion out of the regiment (p. ... of the Nth Regiment, Brigadier General, to the staff ...) is
          an end of unknown date unless the clause is dated;
  return  a clause that begins with returned, rejoined, re-enlisted, exchanged, tr. from: after an end it makes the answer 'unknown';
  yes     a start on or before 30 June 1863, no end dated before 1 July 1863, no undated end, no return, no damaged date in a start or end clause;
  no      a start after 3 July 1863, or an end dated before 1 July 1863 with no return;
  unknown every other entry.
A month-and-year date counts only where it lies certainly before or after the day it is compared with (June 1863 is before 1 July 1863; July 1863 is neither).
"""
import re

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
MONTH_WORD = r"(?P<mon>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
DATE = re.compile(MONTH_WORD + r"\.?,?\s*(?:(?P<day>[0-3]?[0-9])\s*(?:st|nd|rd|th|d)?\.?,?\s*)?(?:in\s+)?['’`‘\"]?\s*(?P<yr>(?:18)?6[0-5])\b", re.I)
DATE_NO_YEAR = re.compile(MONTH_WORD + r"\.?,?\s*(?:(?P<day>[0-3]?[0-9])\s*(?:st|nd|rd|th|d)?\.?)", re.I)
YEAR_DAMAGED = re.compile(r"['’`‘\"][0-9OoSsIl!\(\)\|a-z]{1,2}(?![0-9A-Za-z])")
GETTYS = re.compile(r"G[eo][it]{1,3}[yvj]s?[- ]?\s?b[uvn][ri][gqy]h?|Gett?ys|ettysburg|Gettysb", re.I)

START = re.compile(r"^(?:e|cm|em|en|crn|cin|cni|cnn|ern|enlisted|elected)\b\.?", re.I)
END = re.compile(r"^(?:d|dg|k|r|des|dism|deserted|dismissed|died|killed|discharged|resigned|drowned|executed|cashiered|dropped)\b\.?", re.I)
TR = re.compile(r"^tr\b\.?", re.I)
RETURN = re.compile(r"^(?:returned|rejoined|re-?enl\w*|exchanged|restored|retd)\b", re.I)
PROM = re.compile(r"^p\b\.?", re.I)
OUT_OF_REGIMENT = re.compile(r"(?:\d+(?:st|nd|rd|th|d)\s+(?:Regt|Regiment|Reg|Cav|N\.\s?C)|Regiment|Regt|Brigadier|General|Cavalry|Artillery|Navy|Battalion|Governor|Congress|Legislature|Staff|A\.\s?A\.\s?G|C\.\s?S\.|Commissary|Quartermaster|Q\.\s?M|Adjutant|Engineer|Ordnance|Signal|Secretary|Senator|Judge|Court)", re.I)
INTERNAL_TR = re.compile(r"^tr\.?\s+to\s+(?:Com\.?|Company|Co\.?)\s*[A-Z]?\b", re.I)
LOST_SEMI = re.compile(r"(?<=['’][0-9OoSsIl]{2}\.)\s+(?=(?:d|dg|k|r|tr|des|w|pr|c|m)\.\s)|(?<=[0-9]\.)\s+(?=(?:d|dg|k|r|tr|des)\.\s)")


def clauses(remarks):
    """Clauses of the remarks (the county and place clauses stay: they carry no event word and are ignored by the rules)."""
    t = re.sub(r"(?<=[a-z])-\s+(?=[a-z])", "", remarks)                    # 'Chancel- lorsville': a word cut at the end of a printed line
    out = []
    for c in re.split(r"[;|]", t):
        for p in LOST_SEMI.split(c):
            p = re.sub(r"^[^A-Za-z0-9]+", "", p)
            p = ' '.join(p.split()).strip(' .,')
            if p:
                out.append(p)
    return out


def parse_date(c):
    """(year, month, day or None) of the first date of a clause, 'damaged' when the clause prints a month and an unreadable year, or None."""
    m = DATE.search(c)
    if m:
        y = int(m.group('yr')[-2:]) + 1800
        d = int(m.group('day')) if m.group('day') else None
        if d is not None and not (1 <= d <= 31):
            return 'damaged'
        return (y, MONTHS[m.group('mon')[:3].lower()], d)
    if re.search(MONTH_WORD, c, re.I) and (YEAR_DAMAGED.search(c) or re.search(r"['’`‘\"][0-9][^0-9\s]|['’`‘\"][^0-9\s][0-9]", c)):
        return 'damaged'
    return None


def position(d):
    """'before' (certainly before 1 July 1863), 'during' (1-3 July 1863), 'after' (certainly after 3 July 1863), 'july' (July 1863 without a day)."""
    y, mo, dd = d
    if (y, mo) < (1863, 7):
        return 'before'
    if (y, mo) > (1863, 7):
        return 'after'
    if dd is None:
        return 'july'
    if dd < 1:
        return 'before'
    return 'during' if dd <= 3 else 'after'


def onroll(remarks):
    """('yes' | 'no' | 'unknown', basis text or None).  See the module docstring for the rules."""
    cl = clauses(remarks)
    start = None
    ends = []
    returned = False
    damaged = False
    ambiguous = False
    for c in cl:
        low = c
        if START.match(low) and start is None:
            d = parse_date(c)
            if d == 'damaged':
                damaged = True
            elif d:
                start = d
            continue
        if RETURN.match(low):
            returned = True
            continue
        if TR.match(low):
            if re.match(r"^tr\.?\s+from\b", low, re.I):
                returned = returned or bool(ends)
                continue
            if INTERNAL_TR.match(low):
                continue
            d = parse_date(c)
            ends.append((d, c))
            continue
        if PROM.match(low):
            if OUT_OF_REGIMENT.search(c):
                d = parse_date(c)
                if d:
                    ends.append((d, c))
                else:
                    ambiguous = True
            continue
        if END.match(low):
            d = parse_date(c)
            ends.append((d, c))
            continue
    if start is None:
        return 'unknown', None
    sp = position(start)
    stext = 'enl %s' % ('%d-%02d%s' % (start[0], start[1], '-%02d' % start[2] if start[2] else ''))
    if sp == 'after':
        return 'no', 'start after 3 July 1863: ' + stext
    if damaged or ambiguous:
        return 'unknown', None
    before = [(d, c) for d, c in ends if d and d != 'damaged' and position(d) == 'before']
    if before and not returned:
        d, c = before[0]
        return 'no', 'separation before 1 July 1863: ' + ' '.join(c.split()[:1]).lower() + ' %d-%02d' % (d[0], d[1])
    if any(d == 'damaged' or d is None for d, c in ends):
        return 'unknown', None
    if returned and ends:
        return 'unknown', None
    if sp in ('before',):
        return 'yes', stext
    if sp == 'during':
        return 'yes', stext
    return 'unknown', None


def names_gettysburg(remarks):
    return bool(GETTYS.search(remarks))


def gettysburg_dated(remarks):
    for c in clauses(remarks):
        if GETTYS.search(c):
            for m in DATE.finditer(c):
                if int(m.group('yr')[-2:]) == 63 and m.group('mon')[:3].lower() == 'jul' and m.group('day') and 1 <= int(m.group('day')) <= 3:
                    return True
    return False
