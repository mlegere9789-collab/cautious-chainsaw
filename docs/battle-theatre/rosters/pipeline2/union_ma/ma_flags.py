"""Marks derived from the printed text of a Massachusetts roster entry, for the flag files (never written into the unit file).  See ma_dates.py for the date marks.

Codes of ocr_uncertain (a row carries every code that matched; an empty result does not say the line is clean, it says no pattern matched):
  N  name text damaged: a digit or a mark inside a name token, a lower-case first letter, a period where the comma belongs, no comma in a head that has one
  H  the head (name, rank, "Res.") was cut by a rule that is a reading, or by review: a reviewed cut, no comma, a period for the comma, a stray mark in place of a dash
  R  rank text damaged: the printed rank is not one of the ranks the volumes print
  Q  the word "Res." is damaged
  C  the company heading above is damaged (the letter is unreadable): the row has no company code; the letter the sequence of headings gives is in company_inferred
  Y  a year in the line is damaged (1S63, 18G1, l862)
  G  garbage marks of the scan stand in or beside the line (^ | ~ and the like, a stray mark taken out of the head)
"""
import re

KNOWN_RANKS = re.compile(r"""^(?:Priv\.|Corpl\.|Sergt\.|1st Sergt\.|Music\.|Prin\. Music\.|Musician|Wagoner|Drummer|Fifer|Artificer|Bugler|Farrier|Saddler|Blacksmith|
Teamster|Cook|Leader|Captain|1st Lieut\.|2d Lieut\.|Lieut\. Colonel|Colonel|Major|Adjutant|Surgeon|Asst\. Surgeon|Chaplain|Qr\. Master|Quarter Master|
Sergt\. Major|Qr\. Master Sergt\.|Quarter Master Sergt\.|Commy\. Sergt\.|Hospl\. Steward|Hospital Steward|Drum Major|Band Master|Band Leader|Chief Wagoner|
Regtl\. Wagoner|Sergt\. Farrier|Ord\. Sergt\.|Actg\. 1st Lieut\.|Farrier and Blacksmith|Qr\. Master Sergeant|
1st Lieut,? (?:and|&) (?:Adjutant|Qr\. Master|Quarter Master|Regtl\. Adjutant|Regtl\. Qr\. Master|Regtl\. Quarter Master)|1st Lieut\. (?:and|&) (?:Adjutant|Qr\. Master|Quarter Master))$""".replace('\n', ''))

TOK = re.compile(r'\S+')
MARKS = ",.;:\"'`^*|[]()<>—–-~_•■#"
YEAR_LIKE = re.compile(r"^[1lI|!][0-9SsGgOoBbIl|!]{3}$")
YEAR_OK = re.compile(r"^18[0-9]{2}$")


def strip_marks(w):
    return w.strip(MARKS)


def name_damaged(name, cut_kind):
    toks = name.split()
    if cut_kind in ('no-comma', 'no-comma-long', 'period-for-comma', 'comma-given-invalid'):
        return True
    for t in toks:
        c = strip_marks(t)
        if not c:
            continue
        if re.search(r"[0-9]", c) and not re.fullmatch(r"[1-9][0-9]?(?:st|nd|rd|th|d)", c):
            return True
        if re.search(r"[^A-Za-z'\-\.’ ]", c):
            return True
        if c[:1].islower() and c not in ('de', 'van', 'von', 'la', 'le', 'du', 'di', 'da', 'del', 'der', 'den', 'ter', 'ten', 'dos', 'des', 'el', 'al', 'af', 'ap', 'alias', 'or', 'and'):
            return True
    return False


def rank_damaged(rank):
    return bool(rank) and not KNOWN_RANKS.match(rank)


def year_damaged(text):
    for w in text.split():
        t = w.strip('.,;:()"\'')
        if len(t) == 4 and YEAR_LIKE.match(t) and not YEAR_OK.match(t) and sum(ch.isdigit() for ch in t) >= 1:
            return True
    return False


def garbage_marks(text):
    for w in text.split():
        if re.search(r"[\^|~■•]", w):
            return True
        if len(w) <= 3 and strip_marks(w) == '' and any(ch in '^|~*■•#{}<>_' for ch in w):
            return True
    return False


def normalise_name(name, comma_style=True):
    """'Surname, Given M., Jr.' -> 'Given M. Surname Jr.'; no letter is changed, stray marks at the ends of the tokens are taken off; '' where the printed head has no
    comma after the surname (the cut is a reading) or no readable token"""
    toks = [t for t in name.split()]
    clean = []
    for t in toks:
        c = t.strip("\"'`^*|[]()<>~_•■#:;")
        if c.endswith(',') or c.endswith('.,'):
            pass
        if c:
            clean.append(c)
    if not clean:
        return ''
    idx = -1
    for i, w in enumerate(clean):
        if w.endswith(','):
            idx = i
            break
    if comma_style:
        if idx < 0:
            return ''
        surname = ' '.join(w.rstrip(',') for w in clean[:idx + 1])
        rest = [w.rstrip(',') for w in clean[idx + 1:]]
        suffix = ''
        if rest and re.fullmatch(r"(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d))\.?", rest[-1]):
            suffix = rest.pop()
        return ' '.join(rest + [surname] + ([suffix] if suffix else [])).strip()
    return ' '.join(w.rstrip(',') if i < len(clean) - 1 and w.endswith(',') and False else w for i, w in enumerate(clean))


def running_head_page(text, pm, leaf):
    """printed page number as the running head of the leaf prints it (first non-empty line, a number at its start or its end), or None"""
    a, b = pm.span(leaf)
    for line in text[a:b].split('\n')[:3]:
        s = ' '.join(line.split())
        if not s:
            continue
        m = re.match(r"^(\d{1,4})\s+\D", s) or re.search(r"\D\s+(\d{1,4})$", s)
        if m:
            return int(m.group(1))
        break
    return None
