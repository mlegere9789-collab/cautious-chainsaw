"""Marks derived from the printed text of a Massachusetts roster entry, for the flag files (never written into the unit file).  See ma_dates.py for the date marks.

Codes of ocr_uncertain (a row carries every code that matched; an empty result does not say the line is clean, it says no pattern matched):
  N  name text damaged: a digit or a mark inside a name token, a lower-case first letter, a period where the comma belongs, no comma in a head that has one
  H  the head (name, rank, "Res.") was cut by a rule that is a reading, or by review: a reviewed cut, no comma, a period for the comma, a stray mark in place of a dash
  R  rank text damaged: the printed rank is not one of the ranks the volumes print
  Q  the word "Res." is damaged
  C  the company heading above is damaged (the letter is unreadable): the row has no company code; the letter the sequence of headings gives is in company_inferred
  Y  a year in the line is damaged (1S63, 18G1, l862); since 14 November 2026 also a word where the month belongs that is none of the month words of MONTHS (Xov., Julj, Jime),
     a day printed as IS, 2S and the like
  G  garbage marks of the scan stand in or beside the line (^ | ~ and the like, a stray mark taken out of the head); since 14 November 2026 also a single mark or letter standing
     alone between two words (! [ ] ' j i J, a lone I that is no company letter)
  W  (since 14 November 2026) a word of the remarks is damaged: a capital letter inside a word, a digit or a mark inside a word, the ordinal 1st read Ist, or a word that stands
     at most 10 times in the 24 unit files and differs by one look-alike pair of characters from a word that stands at least 25 times and ten times as often
  N  (since 14 November 2026, in addition) a mark in front of a name token, Mc followed by a lower-case l, a name token that stands at most 10 times in the 24 unit files and
     differs by one look-alike pair of characters from a name token that stands at least 3 times as often

The marks of 14 November 2026 are the patterns of damage that the independent smoke sample of roster-qa found (6 pages of this item, 129 lines compared with the printed page, 51
lines differ from the print, 20 of the 51 carried a flag before the marks were widened); they were written after reading those errors, so the share of the 51 that they flag is
no estimate of the share they flag on lines nobody compared.  A line that no pattern matches is not thereby clean.
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


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# Marks added on 14 November 2026 (see the docstring).  Everything below only reads the text of a row; no field of a row is changed by it.

PUNCT = ".,;:()\"'`[]!|^*~_<>{}#•■—–-"
STRAY_SINGLE = frozenset("|!^[]{}()'`*~_#<>•■ijJ\\/")
STRAY_ONLY = re.compile(r"^[!^\[\]{}'`*~_#<>•■|\\/]{1,3}$")
STRAY_LETTER_QUOTE = re.compile(r"^[A-Za-z]['`^]+[.,]?$")             # L'.  M^  (a double quote is printed around company letters: Co. "E")
DAY_WITH_COMMA = re.compile(r"^[0-9]{1,2},$")
YEAR_TOKEN = re.compile(r"^[1lI|!][0-9SsGgOoBbIl|!]{3}[,.;]?$")
YEAR_STRIPPED = re.compile(r"^[1lI|!][0-9SsGgOoBbIl|!]{3}$")
DAY_DAMAGED = re.compile(r"^[IlOSsGgBbi|!1-9]{1,2}[,.;]?$")
DAMAGED_NUMBER = re.compile(r"^(?:[Il][SG8]|2[SG])$")                    # 18 or 28 read IS, lS, I8, 2S
MONTHS = frozenset(['Jan', 'Jany', 'Feb', 'Febr', 'Febry', 'Mar', 'March', 'Mch', 'Apr', 'April', 'May', 'June', 'July', 'Aug', 'Augt', 'Sept', 'Sep', 'Sepr', 'Oct',
                    'Octr', 'Nov', 'Novr', 'Dec', 'Decr', 'or', 'and', 'to'])
INNER_CAP_PREFIX = re.compile(r"^(?:Mc|Mac|De|Di|La|Le|Van|Von|O')")
ORDINAL_OK = re.compile(r"^[0-9]+(?:st|nd|rd|th|d)$")
ORDINAL_DAMAGED = re.compile(r"^(?:[Il][s5][tl]\.?|[0-9][cC][lI1])$")
# pairs of characters the text layer exchanges (both directions)
CONFUSED = (('rn', 'm'), ('ni', 'm'), ('ii', 'u'), ('li', 'h'), ('o', 'e'), ('c', 'e'), ('a', 'o'), ('a', 'e'), ('l', 'i'), ('I', 'l'), ('I', 'i'), ('n', 'u'), ('h', 'b'),
            ('y', 'v'), ('j', 'y'), ('S', '8'), ('S', '5'), ('0', 'O'), ('G', 'C'), ('H', 'R'), ('R', 'K'), ('t', 'f'), ('r', 'n'), ('ri', 'n'))
REMARK_WORD_MAX, REMARK_NEIGHBOUR_MIN, REMARK_RATIO = 10, 25, 10
NAME_TOKEN_MAX, NAME_NEIGHBOUR_MIN, NAME_RATIO = 10, 3, 3


class Vocab:
    """Counts over the rows of all unit files of the item: the alphabetic remark words (lower case) and the alphabetic name tokens (as printed)."""

    def __init__(self, rows):
        import collections
        self.rem = collections.Counter()
        self.name = collections.Counter()
        for r in rows:
            for t in r[3].split():
                s = t.strip(PUNCT)
                if s.isalpha():
                    self.rem[s.lower()] += 1
            for t in r[0].split():
                s = t.strip(PUNCT)
                if s.isalpha():
                    self.name[s] += 1


def confusable_variants(w):
    out = set()
    for a, b in CONFUSED:
        for x, y in ((a, b), (b, a)):
            start = 0
            while True:
                i = w.find(x, start)
                if i < 0:
                    break
                out.add(w[:i] + y + w[i + len(x):])
                start = i + 1
    out.discard(w)
    return out


def stray_marks(rem):
    """tokens of the remarks that are stray marks of the scan standing alone (G)"""
    toks = rem.split()
    out = []
    for i, t in enumerate(toks):
        prev = toks[i - 1] if i else ''
        nxt = toks[i + 1] if i + 1 < len(toks) else ''
        if len(t) == 1 and t in STRAY_SINGLE:
            out.append(t)
        elif t == 'I' and not (prev in ('Co.', 'Co', 'Cos.', 'Cos') or prev.endswith('"') or nxt.startswith('"')):
            out.append(t)
        elif t == '1' and DAY_WITH_COMMA.match(prev) and YEAR_TOKEN.match(nxt):
            out.append(t)
        elif STRAY_ONLY.match(t) or STRAY_LETTER_QUOTE.match(t):
            out.append(t)
    return out


def damaged_words(rem, vocab):
    """(kind, token) of the words of the remarks that are damaged (W)"""
    out = []
    toks = rem.split()
    for i, t in enumerate(toks):
        s = t.strip(PUNCT)
        if not s:
            continue
        if re.search(r"[a-z][A-Z]", INNER_CAP_PREFIX.sub('', s)):
            out.append(('capital inside a word', t))
            continue
        if re.search(r"[A-Za-z]", s) and not ORDINAL_OK.match(s) and not YEAR_STRIPPED.match(s):
            if re.search(r"[0-9]", s) and not re.fullmatch(r"[0-9]+[,.\-][0-9]+", s):
                out.append(('digit inside a word', t))
                continue
            if re.search(r"[\[\]()|^~*#{}<>!;:\"\\/]", s):
                out.append(('mark inside a word', t))
                continue
        if ORDINAL_DAMAGED.match(s):
            out.append(('ordinal', t))
            continue
        if s == 'let' and i + 1 < len(toks) and toks[i + 1][:1].isupper():
            out.append(('ordinal', t))
            continue
        if s.isalpha() and len(s) >= 4:
            w = s.lower()
            c = vocab.rem[w]
            if c <= REMARK_WORD_MAX:
                need = max(REMARK_NEIGHBOUR_MIN if len(w) >= 5 else 200, REMARK_RATIO * c)
                near = sorted(x for x in confusable_variants(w) if vocab.rem.get(x, 0) >= need)
                if near:
                    out.append(('look-alike of ' + near[0], t))
    return out


def damaged_dates(rem):
    """(kind, token) of the dates of the remarks that are damaged beyond a year (Y)"""
    toks = rem.split()
    out = []
    for i, t in enumerate(toks):
        s = t.strip(PUNCT)
        if DAMAGED_NUMBER.match(s):
            out.append(('number', t))
        if i + 2 < len(toks) and s.isalpha() and DAY_DAMAGED.match(toks[i + 1]) and YEAR_TOKEN.match(toks[i + 2]):
            if s not in MONTHS:
                out.append(('month', t))
            elif not re.match(r"^[0-9]{1,2}[,.;]?$", toks[i + 1]):
                out.append(('day', toks[i + 1]))
    return out


def name_marks(name, vocab):
    """(kind, token) of the tokens of a name that are damaged by a pattern of 14 November 2026 (N)"""
    out = []
    for t in name.split():
        if re.match(r"^\.[A-Za-z]", t):
            out.append(('mark in front of the name', t))
        s = t.strip(PUNCT)
        if re.match(r"^Mcl", s):
            out.append(('Mc and a lower-case l', t))
        if s.isalpha() and len(s) >= 4:
            c = vocab.name[s]
            if c <= NAME_TOKEN_MAX:
                near = sorted(v for v in confusable_variants(s) if vocab.name.get(v, 0) >= max(NAME_NEIGHBOUR_MIN, NAME_RATIO * c))
                if near:
                    out.append(('look-alike of ' + near[0], t))
    return out
