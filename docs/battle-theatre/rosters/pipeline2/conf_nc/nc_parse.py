"""Entry cutter of the conf-nc work item: one section of a Moore volume (the OCR text, offsets kept) -> rows of the roster2/2 form.

Standard library only.  Nothing is corrected: a row is made of tokens of the text, joined by single blanks, and every row records the
character offset of its name in the pinned text.  A name that the text layer garbles stays garbled.

Layout of Moore's roll (1882): a regiment (or battalion) section starts with a heading (SIXTEENTH REGIMENT-- INFANTRY.), a list of
abbreviations, FIELD AND STAFF, then for every company COMPANY A. / OFFICERS. / NON-COMMISSIONED OFFICERS. / PRIVATES.  Officers and
non-commissioned officers are printed "Given Surname, Rank, [cm. date;] County co.; remarks."  Privates are printed
"Surname, Given, e. date; County co.; remarks."  The text layer joins several entries into one text line, so heads are found inside the
lines (nc_parse.match_head), not at line starts only.

The cut rule (one rule, applied to the text as printed):
  a head is  NAME  followed by evidence that an entry begins, at a boundary:
    S  surname first:  Surname, Given [Given...],  then a marker (e. / cm. / em. / c. / o. ... and the glued forms "M.,e."), or a county
       phrase ("Hyde co."), or ";" and an event word (d. dg. k. w. p. pr. r. tr. m. c.), or a rank phrase (Sergt. ...)
    G  given name first:  Given [M.] Surname,  then a rank phrase (Captain, 1st Lieut., Sergt., Asst. Surgeon ...)
    B  bare:  a short name alone on a text line of a PRIVATES list (flagged; the entry has no remark)
  boundary = the first token of the section part, a token after a token that ends with . ; : ! ? or a digit or quote, or the first token of a
  text line (weak: then the evidence must be a marker or a rank).
Everything between two heads is the remarks of the first (running heads and page numbers left out, the notes of the roll left out).
"""
import re, difflib, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L

TOK = re.compile(r'\S+')

# ------------------------------------------------------------------ token classes
MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
MON_ABB = {'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'sept'}
MON_OCR = {'mav', 'hay', 'lay', 'juno', 'junc', 'jnne', 'jime', 'jane', 'jnly', 'julv', 'julj', 'jiily', 'jiiue', 'jauu', 'janu', 'fob', 'kcb', 'marcli', 'marcb', 'apiil', 'aprd', 'augu', 'augnst',
           'sepl', 'siept', 'septem', 'octo', 'nov', 'novem', 'deo', 'dee', 'decem', 'jau', 'ang', 'sep', 'feby', 'jany'}


def alpha(s):
    return re.sub(r'[^A-Za-z]', '', s).lower()


def is_month(t):
    w = alpha(t)
    if len(w) < 3:
        return False
    if w[:3] in MON_ABB or w in MON_OCR:
        return True
    return any(difflib.SequenceMatcher(None, w, m).ratio() >= 0.74 for m in MONTHS)


YEARISH = re.compile(r"^['`‘’\"]?[0-9OoSsIl\(\)\!]{2}[\.,;:]*$")
MARK_STRONG = re.compile(r"^(?:e|cm|em|en|enl|crn|cin|cni|cnn|ern|ciri|eni|enlisted|Enlisted|Enl)[\.,;:]+$")
MARK_BARE = re.compile(r"^(?:e|cm|em)$")
MARK_WEAK = re.compile(r"^(?:c|o|a|6|«|\^|¢|ε|е|€|G|0)[\.,;:]+$")
EVENT = re.compile(r"^(?:d|dg|dt|k|w|p|pr|r|tr|m|c|res|dis|disch|dismissed|killed|died|wounded|promoted|resigned|transferred|detailed|captured|missing|deserted)\.?[,;]?$", re.I)
CO_TOK = re.compile(r"^(?:[cCoOeEG][oO0cCqQeE]|co|CO|Co|county|County|cc|ca|oo|ee)[\.,;:\s]*[,;]?$")
ORD_TOK = re.compile(r"^(?:[0-9IilLsS]{1,2}(?:st|d|nd|rd|th|cl|sl)|[0-9]{1,2}d|[1I]st|[2z]d|[3]d|ist|Isi|lst|2cl|Zd)[\.,;]?$", re.I)

RANK_WORDS = ['colonel', 'lieutenant', 'lieut', 'lieutenaut', 'major', 'captain', 'adjutant', 'surgeon', 'assistant', 'chaplain', 'quartermaster', 'sergeant', 'sergt', 'corporal', 'musician',
              'bugler', 'artificer', 'farrier', 'blacksmith', 'saddler', 'sadler', 'wagoner', 'teamster', 'fifer', 'drummer', 'guidon', 'ensign', 'commissary', 'hospital', 'steward', 'ordnance',
              'private', 'cook', 'colonel', 'brigadier', 'general', 'master', 'band', 'leader', 'surgeon', 'chief', 'bandmaster']
RANK_EXACT = {'lt', 'col', 'maj', 'capt', 'adjt', 'asst', 'serg', 'sgt', 'corp', 'corpl', 'cpl', 'pvt', 'priv', 'qm', 'q', 'm', 'a', 'c', 's', 'ord', 'drum', 'sergtmajor', 'lieutcol', 'lt-col', 'artif'}
ABBREV_BAD = {'com', 'co', 'regt', 'reg', 'cav', 'capt', 'lieut', 'sergt', 'col', 'gen', 'va', 'md', 'ga', 'tenn', 'ala', 'miss', 'fla', 'ky', 'mo', 'pa', 'ill', 'ind', 'mass', 'conn', 'vt', 'nh', 'dc', 'nc',
              'sc', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'june', 'july', 'march', 'april', 'august', 'september', 'october', 'november',
              'december', 'january', 'february', 'note', 'company', 'regiment', 'battalion', 'battery', 'at', 'in', 'on', 'of', 'to', 'the', 'and', 'for', 'from', 'by', 'near', 'and', 'N', 'S', 'E', 'W'}


def is_rankword(t):
    w = alpha(t)
    if not w:
        return False
    if w in RANK_EXACT or w in RANK_WORDS:
        return True
    if len(w) >= 5:
        return any(difflib.SequenceMatcher(None, w, r).ratio() >= 0.8 for r in RANK_WORDS if len(r) >= 5)
    return False


def rank_phrase(toks, j, limit=4):
    """Number of tokens of a rank phrase starting at token j (0 when none).  A phrase: optional ordinal, then rank words; it ends after a token that ends with a
    comma or semicolon, or when the next token is no rank word."""
    n = len(toks)
    k = j
    if k < n and ORD_TOK.match(toks[k][2]):
        k += 1
        if k >= n:
            return 0
    if k >= n or not is_rankword(toks[k][2]):
        return 0
    k += 1
    cnt = 1
    while k < n and cnt < limit and not re.search(r'[,;]$', toks[k - 1][2]) and (is_rankword(toks[k][2]) or re.fullmatch(r"[A-Za-z]\.?[,;]?", toks[k][2]) or re.fullmatch(r"(?i)major|colonel|master|steward|surgeon|sergt?\.?|sergeant", toks[k][2].strip('.,;'))):
        k += 1
        cnt += 1
    return k - j


SURNAME = re.compile(r"^[^\w\s]{0,2}[A-Z][A-Za-z'’\-\^\\\.\*&0-9\|\(\)]{1,23}[,;:]$")
SURNAME_DOT = re.compile(r"^[^\w\s]{0,2}[A-Z][A-Za-z'’\-\^\\\*&]{2,23}\.$")
GIVEN = re.compile(r"^[^\w\s]{0,2}(?:[A-Z0-9][A-Za-z'’\-\^\\\.\*&0-9\|\(\)\"]{0,18}|[a-z]\.)[,;:\.]{0,2}$")
GIVEN_LOWER_OK = {'jr', 'sr', 'jun', 'senr', 'esq'}


def split_glue(start, tok):
    """Tokens of the text layer that hold two items ("M.,e."  /  "e.May"): [(offset, text)] pieces; the offsets are exact."""
    m = re.match(r"^(.+?[,;:])((?:e|c|o|cm|em)[\.,])(.*)$", tok)
    if m and len(m.group(1)) >= 2 and re.search(r"[A-Za-z]\.?[,;:]$", m.group(1)) and not re.match(r'^(?:co|Co|CO)', m.group(1)):
        out = [(start, m.group(1)), (start + len(m.group(1)), m.group(2))]
        if m.group(3):
            out.append((start + len(m.group(1)) + len(m.group(2)), m.group(3)))
        return out
    m = re.match(r"^((?:e|cm|em)\.)([A-Z][a-z]{2,}\S*)$", tok)
    if m:
        return [(start, m.group(1)), (start + len(m.group(1)), m.group(2))]
    return [(start, tok)]


# ------------------------------------------------------------------ the token stream of a section part

class Stream:
    """Tokens of text[a:b] with absolute offsets: toks[i] = (start, end, text, line_start).  Headings become events positioned before a token index;
    furniture lines are left out (their spans are kept); notes are recorded."""

    def __init__(self, text, a, b):
        self.text, self.a, self.b = text, a, b
        self.toks = []
        self.events = []         # (token index, kind, payload text, offset)
        self.furniture = []      # (start, end)
        self.preamble = True
        for off, ln in L.lines_of(text, a, b):
            if not ln.strip():
                continue
            if L.is_furniture(ln):
                self.furniture.append((off, off + len(ln)))
                continue
            # headings inside the line (capitals only)
            ev = L.heading_events(ln, off)
            pos = off
            first = True
            pieces = []
            for (s, e, kind, payload) in ev:
                # a company heading may carry the letter right after "COMPANY"; the letter token stays part of the heading
                if kind == 'comp':
                    m = re.match(r"\s*([^\s]{1,3})", text[e:b]) if False else None
                pieces.append((pos, s, 'body'))
                pieces.append((s, e, (kind, payload)))
                pos = e
            pieces.append((pos, off + len(ln), 'body'))
            for (s, e, what) in pieces:
                if what == 'body':
                    seg = text[s:e]
                    fl = first
                    for m in TOK.finditer(seg):
                        for (so, tk) in split_glue(s + m.start(), m.group(0)):
                            self.toks.append((so, so + len(tk), tk, fl and (so == s + m.start())))
                        fl = False
                    if seg.strip():
                        first = False
                else:
                    kind, payload = what
                    self.events.append((len(self.toks), kind, payload, s))
                    first = True
