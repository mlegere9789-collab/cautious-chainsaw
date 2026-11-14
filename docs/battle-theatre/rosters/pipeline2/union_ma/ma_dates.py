"""Reading of the printed dates of a Massachusetts roster entry (Massachusetts Soldiers, Sailors, and Marines in the Civil War), for two derived marks that are
kept in the flag files and never in the line:

  * on_rolls_july_1863  'yes' / 'no' / 'unknown', INFERRED from the printed muster-in (or enlistment, commission, draft) date and the printed separation dates
    (discharge, muster out, death, desertion, transfer out), nothing else.  It is no statement that the man was at Gettysburg (men absent sick, on detached
    service or prisoners are on the rolls too), and 'unknown' is the answer whenever a date is missing, damaged, ambiguous, or the entry says the man returned.
  * names_gettysburg    the remarks print the word Gettysburg (an OCR-tolerant match, a lower bound); gettysburg_dated: the same clause prints 1, 2 or 3 July 1863.

The rules (all on the printed text of the remarks, clause by clause; a clause ends at a semicolon):
  start    the first clause that begins with 'enl.', 'must.' (not 'must. out'), 'draft', 'comm.', or a transfer in ('transf. ... from'): its date; when an entry has
           both 'enl.' and 'must.' the muster date counts; 'enl. and must.' is one date;
  end      clauses that begin with 'disch.', 'honorably disch.', 'must. out', 'died', 'killed', 'deserted', 'resigned', 'dismissed', 'dropped', 'transf.' (to, not from),
           'drowned', 'executed': the first full date of the clause;
  return   'gained from desertion', 'returned', 'retd.', 'rejoined', 'joined': any such clause after an end makes the answer 'unknown';
  yes      a start on or before 30 June 1863 and no end dated before 1 July 1863, no undated end, no return, no damaged date in a start or end clause;
  no       a start after 3 July 1863, or an end dated before 1 July 1863 with no return (the end clause date is a whole date or a month and year before July 1863);
  unknown  every other entry.
Month-and-year dates ('July, 1863') count only when they are certainly before or after the dates they are compared with.

Lost semicolons (added 14 November 2026, after a reading of 40 sampled rows found a 'yes' for a man printed 'enl. and must. Sept. 9, 1861 disch. Dec. 31, 1861'): the OCR
drops the semicolon between two events in about 3 percent of the entries.  A clause is therefore also cut where an event word (disch., must. out, died, killed, deserted,
transf., resigned, dismissed, dropped, ...) follows a year, and a start clause that still holds an event word after its first words (the event follows no year) can no
longer give 'yes': the answer is 'unknown'.  A start certainly after the battle still gives 'no' (nothing that follows can change it).
"""
import re

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
DATE = re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(?:(\d{1,2})\s*[,\.]?\s+)?(18[0-9]{2})\b")
YEAR_LIKE = re.compile(r"^[1lI|!][0-9SsGgOoBbIl|!]{3}$")
YEAR_OK = re.compile(r"^18[0-9]{2}$")
BATTLE_START = (1863, 7, 1)
BATTLE_END = (1863, 7, 3)

START = re.compile(r"^(?:enl\b|must\.(?!\s*,?\s*out)|draft\b|comm\b|enlisted\b)", re.I)
END = re.compile(r"^(?:disch|honorably\s+disch|discharged|must\s*[\.,]?\s*out|died|killed|deserted|resigned|dismissed|dropped|drowned|executed|transf\b)", re.I)
RETURN = re.compile(r"^(?:gained\b|returned|retd\b|rejoined|joined|reported\s+for|arrested|restored)", re.I)


EVENT_WORD = r"(?:disch\w*|hon\.?\s*disch\w*|honorably|must\.?\s*,?\s*out|died|killed|deserted|resigned|dismissed|dropped|drowned|executed|transf\w*|returned|retd|rejoined|joined|gained|missing|prisoner|wounded|reported|arrested|restored|apptd|prom\b|re-?\s?enlist\w*|reduced)"
LOST_SEMICOLON = re.compile(r"(?<=[0-9SsGgOoBbIl]{4})[\.,:]?\s+(?=" + EVENT_WORD + r"\b)", re.I)
# a separation word after an abbreviation or a place ('Va. deserted Sept. 16, 1862') begins a clause of its own
LOST_SEMICOLON_PERIOD = re.compile(r"(?<=[A-Za-z0-9]\.)\s+(?=(?:disch\w*|must\.?\s*,?\s*out|died|killed|deserted|resigned|dismissed|dropped|drowned|executed|transf\w*)\b)", re.I)
EVENT_INSIDE = re.compile(r"\b(?:disch\w*|must\.?\s*,?\s*out|died|killed|deserted|resigned|dismissed|dropped|drowned|executed|transf\.?\s+to|returned|rejoined|retd)\b", re.I)
LEAD_WORDS = re.compile(r"^(?:and|also|but|then|accidentally|dishonorably|honorably|hon\.?|not\s+mustered)\s+", re.I)
STRAY_LETTER = re.compile(r"^[A-Za-z]\s+(?=(?:disch|must|died|killed|deserted|resigned|dismissed|dropped|drowned|executed|transf|hon|dishon|enl|draft|comm|returned|rejoined|joined|gained)\b)", re.I)
CROSS_REF = re.compile(r"\bSee\s")


def clauses(remarks):
    """clauses of the part of the remarks before the first cross-reference ('See Co. ...': what follows describes the man's record elsewhere).  A clause ends at ';' or at
    ':' or '|' (the OCR reads a printed semicolon so), at a lost semicolon before an event word, and a stray mark, a stray letter or a leading 'and' / 'hon.' /
    'dishonorably' / 'accidentally' in front of an event word is dropped."""
    m = CROSS_REF.search(remarks)
    if m:
        remarks = remarks[:m.start()]
    out = []
    for c in re.split(r"[;:|]", remarks):
        for part in LOST_SEMICOLON.split(c):                      # 'must. June 21, 1861 deserted July 13, 1861' is two clauses
            for p2 in LOST_SEMICOLON_PERIOD.split(part):          # 'near Fair Oaks, Va. deserted Sept. 16, 1862' too
                p2 = re.sub(r"^[^A-Za-z0-9]+", "", p2)
                p2 = STRAY_LETTER.sub("", p2)
                for _ in range(3):
                    p2 = LEAD_WORDS.sub("", p2)
                p2 = ' '.join(p2.split()).strip(' .,')
                if p2:
                    out.append(p2)
    return out


def dates_in(clause):
    """list of (year, month, day or None, matched text) in the order printed"""
    out = []
    for m in DATE.finditer(clause):
        mon = MONTHS[m.group(1).lower()]
        out.append((int(m.group(3)), mon, int(m.group(2)) if m.group(2) else None, ' '.join(m.group(0).split())))
    return out


def damaged_year(clause):
    """a token that looks like a year but is not one (1S63, l862, 18G1): the date of the clause cannot be read"""
    for w in clause.split():
        t = w.strip('.,;:()"\'')
        if len(t) == 4 and YEAR_LIKE.match(t) and not YEAR_OK.match(t) and sum(ch.isdigit() for ch in t) >= 1:
            return True
    return False


def _cmp_july(d):
    """position of a date against the battle: 'before' (certainly before 1 July 1863), 'during' (1-3 July 1863), 'after' (certainly after 3 July 1863),
    'july' (July 1863 without a day), None never"""
    y, mo, dd, _ = d
    if (y, mo) < (1863, 7):
        return 'before'
    if (y, mo) > (1863, 7):
        return 'after'
    if dd is None:
        return 'july'
    if dd < 1:
        return 'before'
    if dd <= 3:
        return 'during'
    return 'after'


INTERNAL_TRANSF = re.compile(r"""^transf\.?\s+(?:[A-Z][a-z]{2,8}\.?,?\s+\d{0,2},?\s*(?:18\d\d)?,?\s+)?to\s+(?:Co\.?|Company)\s*["'\u201c]*\s*[A-M]\s*["'\u201d]*\s*[,\.]?\s*(?:(?:[A-Z][a-z]{2,8}\.?\s*\d{0,2},?\s*(?:18\d\d)?)?\s*)?$""", re.I)


def classify(c):
    """'return' | 'end' | 'transf-in' | 'start' | None for a clause"""
    if RETURN.match(c):
        return 'return'
    if re.match(r"^transf\b", c, re.I):
        if INTERNAL_TRANSF.match(c):
            return None                                   # transferred to another company of the same regiment: no separation
        low = c.lower()
        i_from = low.find(' from ')
        i_to = low.find(' to ')
        if i_from >= 0 and (i_to < 0 or i_from < i_to):
            return 'transf-in'
        return 'end'
    if END.match(c):
        return 'end'
    if START.match(c):
        return 'start'
    return None


def onroll(remarks):
    """('yes' | 'no' | 'unknown', basis text or None); the basis is the printed date text the answer rests on"""
    cl = clauses(remarks)
    cands = []            # (kind, date) of start events seen before any end
    ends = []             # (date or None, clause)
    returned = False
    damaged = False
    ambiguous = False     # a start clause that still holds an event word (the semicolon was lost where no year stands before the event)
    for c in cl:
        if re.match(r"^res\b", c, re.I):
            continue
        k = classify(c)
        if k is None:
            if EVENT_INSIDE.search(c[4:]):       # a clause that is none of start, end or return and still holds a separation word: the reading is not certain
                ambiguous = True
            continue
        if k == 'return':
            if ends:
                returned = True
            continue
        ds = dates_in(c)
        if k == 'end':
            if damaged_year(c):
                damaged = True
            ends.append((ds[0] if ds else None, c))
            continue
        # start events count only before the first end
        if ends:
            continue
        if damaged_year(c):
            damaged = True
        if EVENT_INSIDE.search(c[6:]):
            ambiguous = True
        if not ds:
            continue
        low = c.lower()
        if k == 'transf-in':
            cands.append(('transf-in', ds[0]))
        elif low.startswith('must'):
            cands.append(('must', ds[0]))
        elif low.startswith('enl'):
            cands.append(('must' if re.match(r"enl\.?\s+and\s+must", c, re.I) else 'enl', ds[0]))
        elif low.startswith('draft'):
            cands.append(('must' if re.search(r"\band\s+must\b", c, re.I) else 'draft', ds[0]))
        elif low.startswith('comm'):
            cands.append(('comm', ds[0]))
    if not cands or damaged:
        return 'unknown', None
    # the first start event; an enlistment, draft or commission is followed by its muster-in, which is the date the man is on the rolls from
    first_kind, first_date = cands[0]
    start = first_date
    if first_kind in ('enl', 'draft', 'comm') and len(cands) > 1 and cands[1][0] == 'must':
        start = cands[1][1]
    pos = _cmp_july(start)
    if pos == 'after':
        return 'no', 'enl-after %s' % start[3]
    if pos in ('during', 'july'):
        return 'unknown', None
    if ambiguous:
        return 'unknown', None
    # the start is certainly before the battle: look at the ends
    if any(d is None for d, c in ends):
        return 'unknown', None
    before = [d for d, c in ends if _cmp_july(d) == 'before']
    unclear = [d for d, c in ends if _cmp_july(d) == 'july']
    if unclear:
        return 'unknown', None
    if before:
        if returned:
            return 'unknown', None
        return 'no', 'sep-before %s' % before[0][3]
    if returned:
        return 'unknown', None
    return 'yes', 'enl %s' % start[3]


GETTY = re.compile(r"G[eo][it]{1,3}[yvj]s?[- ]?\s?b[uvn][ri][gqy]h?", re.I)


def names_gettysburg(remarks):
    return bool(GETTY.search(remarks))


def gettysburg_dated(remarks):
    """a clause that names Gettysburg and prints 1, 2 or 3 July 1863"""
    for c in clauses(remarks):
        if GETTY.search(c):
            for y, mo, dd, _ in dates_in(c):
                if (y, mo) == (1863, 7) and dd in (1, 2, 3):
                    return True
    return False
