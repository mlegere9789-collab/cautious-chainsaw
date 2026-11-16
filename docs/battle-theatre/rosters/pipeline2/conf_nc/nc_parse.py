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
MARK_STRONG = re.compile(r"^(?:e|cm|em|en|enl|crn|cin|cni|cnn|ern|ciri|eni|enlisted|Enlisted|Enl)(?:[\.,;:]+[\-—~'’\"\^\*]{0,2}|[\^\-—~\*]{1,2})$")
MARK_BARE = re.compile(r"^(?:e|cm|em|enlisted|Enlisted)$")
MARK_GLUED = re.compile(r"^(?:e|cm|em)[\.,;:]+[A-Z][a-z]{2,}\S*$")
MARK_WEAK = re.compile(r"^(?:c|o|a|6|«|\^|¢|ε|е|€|G|0|\*|©|ie)[\.,;:]+[\-—~'’\"\^\*]{0,2}$")
EVENT = re.compile(r"^(?:d|dg|dt|k|w|p|pr|r|tr|m|c|res|dis|disch|dismissed|killed|died|wounded|promoted|resigned|transferred|detailed|captured|missing|deserted)\.?[,;]?$")
CO_TOK = re.compile(r"^(?:[cCoOeEG][oO0cCqQeE]|co|CO|Co|county|County|cc|ca|oo|ee)[\.,;:\s]*[,;]?$")
ORD_TOK = re.compile(r"^[^\w\s]{0,2}[0-9IilLsSZzo\-]{1,2}(?:st|d|nd|rd|th|lh|tb|tli|cl|sl|ih|tii|tn|ud)[\.,;]?$", re.I)

RANK_WORDS = ['colonel', 'lieutenant', 'lieut', 'lieutenaut', 'major', 'captain', 'adjutant', 'surgeon', 'assistant', 'chaplain', 'quartermaster', 'sergeant', 'sergt', 'corporal', 'musician',
              'bugler', 'artificer', 'farrier', 'blacksmith', 'saddler', 'sadler', 'wagoner', 'teamster', 'fifer', 'drummer', 'guidon', 'ensign', 'commissary', 'hospital', 'steward', 'ordnance',
              'private', 'cook', 'colonel', 'brigadier', 'general', 'master', 'band', 'leader', 'surgeon', 'chief', 'bandmaster']
RANK_EXACT = {'lt', 'col', 'maj', 'capt', 'adjt', 'asst', 'serg', 'sgt', 'corp', 'corpl', 'cpl', 'pvt', 'priv', 'qm', 'q', 'm', 'a', 'c', 's', 'ord', 'drum', 'sergtmajor', 'lieutcol', 'lt-col', 'artif'}
ABBREV_BAD = {'com', 'co', 'regt', 'reg', 'cav', 'capt', 'lieut', 'sergt', 'col', 'gen', 'va', 'md', 'ga', 'tenn', 'ala', 'miss', 'fla', 'ky', 'mo', 'pa', 'ill', 'ind', 'mass', 'conn', 'vt', 'nh', 'dc', 'nc',
              'sc', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'june', 'july', 'march', 'april', 'august', 'september', 'october', 'november',
              'december', 'january', 'february', 'note', 'company', 'regiment', 'battalion', 'battery', 'at', 'in', 'on', 'of', 'to', 'the', 'and', 'for', 'from', 'by', 'near', 'and', 'N', 'S', 'E', 'W'}


STRONG_RANKS = ['colonel', 'lieutenant', 'lieut', 'major', 'captain', 'adjutant', 'surgeon', 'sergeant', 'corporal', 'chaplain', 'quartermaster', 'musician', 'artificer', 'blacksmith',
                'saddler', 'wagoner', 'farrier', 'bugler', 'ensign', 'commissary', 'assistant', 'teamster', 'drummer', 'private', 'guidon']


def is_rankword(t):
    """A rank word of the roll: exact (Lieut., Sergt., Col., ...) or a close OCR misreading of a long rank word (Lieuteuant, Captaiu).  Names that look like rank words
    (Stewart, Alexander) are not matched: the fuzzy match is bounded in length and ratio."""
    if '-' in t.strip('-,.;:'):
        parts = [x for x in t.strip('-,.;:').split('-') if x]
        return len(parts) >= 2 and all(is_rankword(x) for x in parts)
    w = alpha(t)
    if not w:
        return False
    if w in RANK_EXACT or w in RANK_WORDS:
        return True
    if len(w) >= 5:
        return any(abs(len(w) - len(r)) <= 2 and difflib.SequenceMatcher(None, w, r).ratio() >= 0.86 for r in STRONG_RANKS if len(r) >= 5)
    return False


INIT_RANKS = [('a', 'q', 'm'), ('a', 'c', 's'), ('q', 'm'), ('o', 'm'), ('a', 'a', 'g')]


def rank_phrase(toks, j, limit=5):
    """Number of tokens of a rank phrase starting at token j (0 when none).  A phrase: optional "p." (promoted), optional ordinal, then rank words (single letters count
    only inside the lettered ranks A. Q. M., A. C. S., Q. M.); it ends after a token that ends with a comma or semicolon, or when the next token is no rank word."""
    n = len(toks)
    k = j
    ini = [alpha(toks[x][2]) for x in range(j, min(j + 3, n))]
    lettered = 0
    for pat in INIT_RANKS:
        if tuple(ini[:len(pat)]) == pat and all(len(alpha(toks[x][2])) == 1 for x in range(j, j + len(pat))):
            lettered = len(pat)
            break
    if lettered:
        k = j + lettered
    else:
        if k < n and re.fullmatch(r"p\.?", toks[k][2]) and k + 1 < n and (ORD_TOK.match(toks[k + 1][2]) or (len(alpha(toks[k + 1][2])) >= 4 and is_rankword(toks[k + 1][2]))):
            k += 1
        if k < n and (ORD_TOK.match(toks[k][2]) or (len(toks[k][2].strip(",.;:'\"")) <= 4 and k + 1 < n and alpha(toks[k + 1][2]) in ('sergeant', 'corporal', 'lieutenant', 'lieut', 'sergt', 'corpl', 'serg', 'sergeaut', 'corpora')
                                                   and not re.fullmatch(r"[A-Za-z]\.?,?", toks[k][2]))):
            k += 1
            if k >= n:
                return 0
        if k >= n or len(alpha(toks[k][2])) < 2 or not is_rankword(toks[k][2]):
            return 0
        k += 1
    cnt = k - j
    while k < n and cnt < limit and not re.search(r'[,;]$', toks[k - 1][2]) and (is_rankword(toks[k][2]) and len(alpha(toks[k][2])) >= 2 or re.fullmatch(r"(?i)[ms]\.?[,;]?", toks[k][2]) and lettered
                                                                              or re.fullmatch(r"(?i)major|colonel|master|steward|surgeon|sergt?\.?|sergeant|of|subsistence|ordnance|artillery|engineers|volunteers|general", toks[k][2].strip('.,;'))):
        k += 1
        cnt += 1
    return k - j


SURNAME = re.compile(r"^[^\w\s]{0,2}[A-Z](?:[A-Za-z'’\-\^\\\.\*&0-9\|\(\)]|[;:](?=[A-Za-z])){1,23}[,;:][\-—~'’\"\*\^]{0,2}$")
SURNAME_DOT = re.compile(r"^[^\w\s]{0,2}[A-Z][A-Za-z'’\-\^\\\*&]{2,23}\.$")
ABBREV_NAME = {'wm', 'jas', 'jno', 'thos', 'geo', 'chas', 'benj', 'danl', 'robt', 'saml', 'edw', 'alex', 'archd', 'nath', 'hy', 'jr', 'sr', 'jun', 'zach', 'jos', 'fred', 'josh', 'ed', 'mich', 'nich', 'sam',
               'dav', 'cha', 'jon', 'wn', 'jos', 'elij', 'js', 'chr', 'xt', 'senr', 'esq', 'dr', 'rev', 'mr'}
PLACE = {'gettysburg', 'richmond', 'station', 'bern', 'hill', 'mill', 'manassas', 'fredericksburg', 'petersburg', 'wilderness', 'harbor', 'kinston', 'wilmington', 'raleigh', 'hospital', 'chancellorsville',
         'sharpsburg', 'williamsburg', 'malvern', 'pines', 'mechanicsville', 'winchester', 'spotsylvania', 'cedar', 'creek', 'wagner', 'charleston', 'goldsboro', 'salisbury', 'danville', 'virginia',
         'carolina', 'maryland', 'pennsylvania', 'georgia', 'tennessee', 'alabama', 'florida', 'mississippi', 'texas', 'kentucky', 'south', 'north', 'court', 'house', 'fort', 'point', 'camp', 'navy', 'army',
         'guards', 'regiment', 'battalion', 'battery', 'cavalry', 'infantry', 'artillery', 'troops', 'division', 'brigade', 'corps', 'county', 'prison', 'sergeant', 'lieutenant', 'captain', 'corporal', 'private',
         'privates', 'company', 'wounds', 'wound', 'disability', 'service', 'hospital', 'lines', 'line', 'swamp', 'green', 'run', 'mountain', 'maryland', 'harpers', 'ferry', 'boonsboro', 'funkstown', 'falling',
         'waters', 'hanover', 'junction', 'depot', 'bridge', 'river', 'plymouth', 'washington', 'newbern', 'neuse', 'roanoke', 'island', 'hatteras', 'tarboro', 'greensboro', 'lynchburg', 'staunton', 'ashland',
         'morehead', 'city', 'jackson', 'cold', 'savage', 'gaines', 'frazier', 'farm', 'oak', 'grove', 'reams', 'ream', 'hatchers', 'weldon', 'railroad', 'fisher', 'bentonville', 'averasboro', 'whitehall', 'goldsborough'}
# note: Jackson, Washington, Fisher, Hill, Hanover, Green are also surnames: PLACE only bars a word from the FRONT of a given-first name, never from its last (surname) token


def initial_tok(t):
    core = re.sub(r"^[^\w\s]{0,2}", "", t)
    return bool(re.fullmatch(r"[A-Z0-9&]\.?[,;:]?", core)) or bool(re.fullmatch(r"[a-z]\.?[,;:]?", core) and core[0] in 'ijlo')


def garbled_initial(t):
    """A short token with a digit or a mark among at most two letters: an initial the scan damaged ("L).", ".7.,")."""
    core = re.sub(r"^[^\w\s]{0,2}", "", t)
    return len(t) <= 5 and len(re.findall(r"[A-Za-z]", core)) <= 2 and bool(re.search(r"[^A-Za-z\.,;:\s]", core))


def sentence_end(t):
    """A token that ends a clause or sentence: ends with . ; ! ? : and is no initial and no name abbreviation."""
    if not re.search(r"[\.;!\?:]$", t):
        return False
    if initial_tok(t) or garbled_initial(t):
        return False
    a = alpha(t)
    if a in ABBREV_NAME or a in ('jr', 'sr'):
        return False
    return True


GIVEN = re.compile(r"^[^\w\s]{0,2}(?:[A-Za-z0-9&][^\s,;]{0,19}|[A-Za-z0-9&]\.?)[,;:\.\'’\"\-—\*\^]{0,3}$")
LONEMARK = re.compile(r"^[,;:\.\-—\*]{1,2}$")
GIVEN_LOWER_OK = {'jr', 'sr', 'jun', 'senr', 'esq'}


def given_ok(t, before_mark=False, lower_ok=False, garbled_ok=False):
    """A token that may stand in the given-name part of a name (after the surname, or before the surname of a given-first name)."""
    if re.fullmatch(r"[^\w\s]{1,3}\.[,;]?", t) and len(t) <= 4 and garbled_ok:
        return True                                   # "('." : an initial the scan damaged beyond reading (kept as printed)
    if re.fullmatch(r"[0-9]{1,2}\.[,;]?", t) and garbled_ok:
        return True                                   # "51." "11.": a damaged initial
    if not GIVEN.match(t):
        return False
    a = alpha(t)
    if not a:
        return False
    if a in ABBREV_BAD and a not in GIVEN_LOWER_OK:
        return False
    core = re.sub(r"^[^\w\s]{0,2}", "", t)
    if re.match(r"^[0-9]{2,}", core):          # a date or number, not a name part
        return False
    if not lower_ok and core[0].islower() and not initial_tok(t) and a not in GIVEN_LOWER_OK:
        return False
    if re.search(r"\.$", core) and not initial_tok(t) and a not in ABBREV_NAME and not before_mark:
        return False
    return True


def split_glue(start, tok):
    """Tokens of the text layer that hold a name and its marker ("M.,e." / "A.,e.May" / ",e."): [(offset, text)] pieces; the offsets are exact.  The marker and whatever is
    glued behind it stay ONE piece (a remark token must be the tail of the text token it starts in), "e.June" alone is not split."""
    m = re.match(r"^(.+?[,;:])((?:e|c|o|cm|em)[\.,].*)$", tok)
    if m and len(m.group(1)) >= 2 and re.search(r"[A-Za-z]\.?[,;:]$", m.group(1)) and not re.match(r'^(?:co|Co|CO)', m.group(1)):
        return [(start, m.group(1)), (start + len(m.group(1)), m.group(2))]
    m = re.match(r"^(,)(e[\.,].*)$", tok)
    if m:
        return [(start, ','), (start + 1, m.group(2))]
    return [(start, tok)]


# ------------------------------------------------------------------ the token stream of a section part

class Stream:
    """Tokens of text[a:b] with absolute offsets: toks[i] = (start, end, text, line_start).  Headings become events positioned before a token index;
    furniture lines are left out (their spans are kept)."""

    def __init__(self, text, a, b, leaf_starts=None):
        self.text, self.a, self.b = text, a, b
        leaf_starts = leaf_starts or set()
        self.toks = []
        self.events = []         # (token index, kind, payload text, offset)
        self.furniture = []      # (start, end)
        for off, ln in L.lines_of(text, a, b):
            if not ln.strip():
                continue
            lt = [(off + m.start(), off + m.end(), m.group(0)) for m in TOK.finditer(ln)]
            evs = L.heading_scan(lt)
            if not evs:
                if L.is_furniture(ln) or (off in leaf_starts and L.is_furniture_leaf_first(ln)):
                    self.furniture.append((off, off + len(ln)))
                    continue
                self._body(lt, True)
                continue
            first = evs[0][0]
            if first > 0:
                prefix = lt[:first]
                if L.is_furniture(' '.join(t[2] for t in prefix)):
                    self.furniture.append((prefix[0][0], prefix[-1][1]))
                else:
                    self._body(prefix, True)
            pos = first
            fresh = True
            for k, (ts, te, kind, payload) in enumerate(evs):
                if ts > pos:
                    self._body(lt[pos:ts], fresh)
                    fresh = False
                if kind == 'comp':
                    text_payload = ' '.join(t[2] for t in lt[ts:te])
                elif kind in ('fs', 'nco', 'off', 'priv', 'mus', 'abbr'):
                    text_payload = ' '.join(t[2] for t in lt[ts:te])
                self.events.append((len(self.toks), kind, text_payload, lt[ts][0]))
                pos = te
                fresh = True
            if pos < len(lt):
                self._body(lt[pos:], True)

    def _body(self, lt, line_start):
        for k, (s0, e0, tk) in enumerate(lt):
            for (so, piece) in split_glue(s0, tk):
                self.toks.append((so, so + len(piece), piece, line_start and k == 0 and so == s0))


# ------------------------------------------------------------------ head matching

def prev_text(S, i):
    return S.toks[i - 1][2] if i > 0 else ''


def boundary(S, i, ev_idx_set):
    """Strength of the boundary before token i: 2 strong (section part start, a token after . ; ! ?), 1 weak (line start, after a digit or quote, a year or a county token), 0 none."""
    if i == 0 or i in ev_idx_set:
        return 2
    p = S.toks[i - 1][2]
    if alpha(p) in ('com', 'co', 'company', 'regt', 'reg', 'cav', 'battalion', 'bn') and not S.toks[i][3]:
        return 0                                    # a letter after "Com." is a company letter, not the start of a name
    if re.search(r"[\.;!\?][,\)\]\"'’\-—~\*\^/]{0,2}$", p):
        return 2
    if S.toks[i][3]:
        return 1
    if re.search(r"[0-9\"'’\)\]:]$", p) or CO_TOK.match(p) or re.search(r"['’`][0-9OoSsIl]{2}[,\-]$", p) or re.search(r"(?:co|CO|Co)[,\-]$", p):
        return 1
    return 0


def county_phrase(toks, j, limit=3):
    """Length of a county phrase at token j: 1..limit capitalised tokens (no comma inside) and a "co." token, or a bare "county"; 0 when none."""
    n = len(toks)
    for ln in range(1, limit + 1):
        if j + ln < n:
            body = toks[j:j + ln]
            if all(re.match(r"^[^\w\s]{0,2}[A-Z][A-Za-z'’\-\^\\\*&]{1,18}$", b[2]) and alpha(b[2]) not in ABBREV_BAD for b in body) and CO_TOK.match(toks[j + ln][2]):
                return ln + 1
    if j < n and CO_TOK.match(toks[j][2]) and toks[j][2].lower().startswith(('co', 'cc')) and len(toks[j][2].strip('.,;:')) <= 6:
        return 0
    return 0


def evidence_at(S, j, name_last):
    """What follows a name at token j: ('mark', n), ('mark-weak', n), ('county', n), ('event', n), ('rank', n) or None.  name_last = text of the last name token."""
    toks = S.toks
    n = len(toks)
    if j >= n:
        return None
    t = toks[j][2]
    nxt = toks[j + 1][2] if j + 1 < n else ''
    if MARK_STRONG.match(t) or MARK_GLUED.match(t):
        return ('mark', 1)
    if MARK_BARE.match(t) and (is_month(nxt) or re.match(r"^['`‘’\"]", nxt)):
        return ('mark', 1)
    if MARK_WEAK.match(t) and (is_month(nxt) or re.match(r"^['`‘’\"][0-9OoSsIl]", nxt)):
        return ('mark-weak', 1)
    c = county_phrase(toks, j)
    if c and re.search(r"[,;]$", name_last):
        return ('county', 0)
    if EVENT.match(t) and re.search(r"[;,]$", name_last) and t.endswith('.') or (EVENT.match(t) and re.search(r";$", name_last)):
        return ('event', 0)
    r = rank_phrase(toks, j)
    if r and re.search(r"[,;]$", name_last):
        return ('rank', r)
    return None


SURNAME_LOWER = re.compile(r"^[^\w\s]{0,2}[a-z][A-Za-z'’\-\^\\\*&]{2,23}[,;:][\-—~'’\"\*\^]{0,2}$")
SURNAME_SPLIT1 = re.compile(r"^[^\w\s]{0,2}[A-Z][a-z]{2,10}$")
SURNAME_SPLIT2 = re.compile(r"^[a-z][a-z'’\-\.]{1,10}[,;:][\-—~'’\"\*\^]{0,2}$")


def match_S(S, i, bd=2):
    """Surname-first head at token i: (kind, last name token index, rank end index) or None."""
    toks = S.toks
    n = len(toks)
    t0 = toks[i][2]
    dot = False
    lower = False
    split = False
    if SURNAME.match(t0):
        pass
    elif SURNAME_DOT.match(t0) and i + 1 < n and (initial_tok(toks[i + 1][2]) or (re.match(r"^[A-Z][A-Za-z'’\-]{2,}[,;]$", toks[i + 1][2]) and i + 2 < n and MARK_STRONG.match(toks[i + 2][2]))):
        dot = True                                 # "Davis. A. M., e." / "Griswold. John, e.": a period for the comma, only before an initial or a given name and the marker
    elif SURNAME_LOWER.match(t0) and bd >= 2:
        lower = True                               # "liaker, Ambrose, e." : the first letter garbled; only at a strong boundary with a marker
    elif SURNAME_SPLIT1.match(t0) and i + 2 < n and SURNAME_SPLIT2.match(toks[i + 1][2]) and bd >= 1:
        split = True                               # "Daugh ton, Joseph, e." : a surname split by the scan; only with a strict marker
    else:
        return None
    w = alpha(t0)
    month_name = is_month(t0) and len(w) <= 5
    if len(w) < 2 or (w in ABBREV_BAD and w not in ('may', 'march', 'june', 'july', 'august', 'april')):
        return None
    if re.match(r"^[^\w\s]{0,2}[0-9]", t0):
        return None
    if len(w) >= 5 and is_rankword(t0) and not split and (w != 'major' or (i + 1 < n and re.match(r"^(?:cm|em|crn|cin|cni)[\.,;:]", toks[i + 1][2]))):
        return None                                # a rank word is no surname: the head of an officer entry the other matcher could not read
    j = i + (2 if split else 1)
    lone = 0
    given = 0
    while j < n and j <= i + 6:
        tj = toks[j][2]
        ev = evidence_at(S, j, toks[j - 1][2])
        if ev:
            kind = ev[0]
            if (dot or lower or split or month_name) and kind not in ('mark',):
                return None
            if given == 0 and kind not in ('mark',):
                return None                           # surname alone needs a strong marker
            end_rank = j + ev[1] if kind == 'rank' else None
            return ('S-' + kind, j - 1, end_rank)
        if LONEMARK.match(tj) and lone == 0 and j + 1 < n and (MARK_STRONG.match(toks[j + 1][2]) or MARK_GLUED.match(toks[j + 1][2])):
            lone += 1
            j += 1
            continue
        nxt_is_mark = j + 1 < n and (MARK_STRONG.match(toks[j + 1][2]) or MARK_GLUED.match(toks[j + 1][2]) or MARK_WEAK.match(toks[j + 1][2]))
        if not given_ok(tj, before_mark=nxt_is_mark, garbled_ok=nxt_is_mark):
            return None
        if re.search(r"[,;]$", tj) and not nxt_is_mark and j + 1 < n and not re.fullmatch(r"(?i)(?:jr|sr|jun|[23]d|[23]nd|3rd|esq)\.?[,;]?", toks[j + 1][2]) \
                and evidence_at(S, j + 1, tj) is None:
            return None                           # a comma-ended token in the middle of the name: a new head starts there ("... Gettysburg, Rivenbark, John W., e.")
        given += 1
        j += 1
    return None


def name_token_ok(t, first=False):
    return given_ok(t)


def match_G(S, i):
    """Given-name-first head at token i: ('G-rank', last name token index, rank end index) or None."""
    toks = S.toks
    n = len(toks)
    t0 = toks[i][2]
    if not given_ok(t0, garbled_ok=True) or sentence_end(t0) or not (re.match(r"^[^\w\s]{0,2}[A-Z]", t0) or initial_tok(t0) or re.fullmatch(r"[^\w\s]{1,3}\.[,;]?", t0) or re.fullmatch(r"[0-9]{1,2}\.", t0)):
        return None
    if alpha(t0) in PLACE and not initial_tok(t0):
        return None
    for k in range(i + 2, min(i + 6, n) + 1):         # name tokens i .. k-1
        last = toks[k - 1][2]
        if not (re.search(r"[,;][\-—~'’\"\*\^]{0,2}$", last) or (re.search(r"[A-Za-z]\.$", last) and len(alpha(last)) >= 4)):
            continue
        if len(alpha(last)) < 2 or alpha(last) in ABBREV_BAD:
            continue
        front = [toks[x][2] for x in range(i, k - 1)]
        if any(not given_ok(f, garbled_ok=True) or sentence_end(f) or (alpha(f) in PLACE and not initial_tok(f) and not re.search(r"[,;]$", f)) or (len(alpha(f)) >= 3 and is_rankword(f)) for f in front):
            continue
        if not (given_ok(last, before_mark=True, lower_ok=True)) or (len(alpha(last)) >= 3 and is_rankword(last)):
            continue
        r = rank_phrase(toks, k)
        if r:
            return ('G-rank', k - 1, k + r)
        # a rank missing: the entry names a marker straight after the surname ("T. L. Johnston, cm. Oct. 8th")
        if k < n and MARK_STRONG.match(toks[k][2]):
            return ('G-mark', k - 1, None)
    return None


def contiguous(S, a, b):
    """True when the tokens a..b of the stream follow one another in the text with only white space between them (nothing was taken out between them)."""
    toks = S.toks
    for t in range(a, b):
        if S.text[toks[t][1]:toks[t + 1][0]].strip():
            return False
    return True


def find_heads(S, a, b, section, ev_idx):
    """Heads of the token range a..b (indexes into S.toks): [(token index, kind, last name token index, rank end index or None)].  Greedy from the left,
    then a second pass for strict markers that stand inside the remarks of a head (a merged entry whose name the first pass could not read)."""
    toks = S.toks
    heads = []
    i = a
    while i < b:
        bd = boundary(S, i, ev_idx)
        got = None
        order = (match_G, match_S) if section in ('officers', 'fs', 'nco') else (match_S, match_G)
        prev = toks[i - 1][2] if i > 0 else ''
        for fn in order:
            if fn is match_G and bd < 1 and (re.fullmatch(r"(?:at|in|of|to|from|and|by|near|for|on|the|as|a|an|with|or|but)", prev) or re.search(r"[A-Za-z]-$", prev)):
                continue
            g = fn(S, i, bd) if fn is match_S else fn(S, i)
            if g and not contiguous(S, i, g[1]):
                g = None                          # a heading or a running head stands between the name tokens: the name would not be in the text as one run
            if g:
                kind = g[0]
                if bd == 0 and kind not in ('S-mark', 'G-rank'):
                    continue                      # no boundary: only a head with a strict marker or a rank phrase may begin here
                if bd == 1 and not (kind in ('S-mark', 'G-rank', 'G-mark', 'S-rank', 'S-county')):
                    continue
                got = g
                break
        if got:
            kind, last, rend = got
            heads.append((i, kind, last, rend))
            i = (rend if rend else last + 1)
            continue
        i += 1
    # second pass: a strict marker (e. / cm. + month or year) inside the remarks of a head, with a name-like run in front of it
    own = set()
    for (hs, kind, last, rend) in heads:
        own.update(range(hs, (rend if rend else last + 1) + 1))
    added = []
    for m in range(a + 2, b - 1):
        if m in own or not (MARK_STRONG.match(toks[m][2]) or MARK_GLUED.match(toks[m][2])):
            continue
        nxt = toks[m + 1][2]
        if not (MARK_GLUED.match(toks[m][2]) or is_month(nxt) or re.match(r"^['`‘’\"][0-9OoSsIl]", nxt)):
            continue
        k = m - 1
        while k >= a and m - k <= 7 and not sentence_end(toks[k][2]) and toks[k][2] not in ('co.', 'CO.') and not re.match(r"^['’`][0-9OoSsIl]{2}[\-,\.;]?$", toks[k][2]):
            k -= 1
        kstart = k + 1
        while kstart < m - 1 and not contiguous(S, kstart, m - 1):
            kstart += 1                               # a heading or a running head stands inside the run: the name starts after it
        run = toks[kstart:m]
        if not (2 <= len(run) <= 7):
            continue
        if not any(re.search(r"[,;]", t[2]) for t in run[:3]):
            continue
        if any(re.match(r"^(?:at|in|of|to|from|and|on|by|for|near|the)$", t[2]) for t in run):
            continue
        if any(is_rankword(t[2]) and len(alpha(t[2])) >= 4 for t in run):
            continue                                  # the run holds a rank word: "p. 2d Lieut. cm. ..." is a promotion in the remarks of one entry
        if sum(1 for t in run if re.search(r"[A-Za-z]{2}", t[2])) < 1:
            continue
        added.append((kstart, 'S-recovered', m - 1, None))
    if added:
        heads = sorted(heads + added, key=lambda h: h[0])
        # a recovered head swallows heads that start inside its name run
        out = []
        for h in heads:
            if out and h[0] <= out[-1][2] and h[1] != 'S-recovered' and out[-1][1] == 'S-recovered':
                continue
            if out and h[1] == 'S-recovered' and out[-1][1] != 'S-recovered' and h[0] <= (out[-1][3] if out[-1][3] else out[-1][2]):
                continue
            out.append(h)
        heads = out
    return heads


# ------------------------------------------------------------------ the section driver

def head_text(kind, payload):
    t = ' '.join(payload.split())
    return t.rstrip('.,;: ')


def read_letter(payload):
    m = re.match(r"^C[O0]MPAN[YV]\s*([^\s]{0,3})", payload)
    return (m.group(1) if m else '').strip('.,;:*\'"')


def _merge_pieces(S, rem_toks):
    """Pieces that split_glue cut out of one text token and that stand inside the remarks are joined again: a remark token must be a token of the text."""
    out = []
    for t in rem_toks:
        if out and out[-1][1] == t[0]:
            prev = out[-1]
            out[-1] = (prev[0], t[1], S.text[prev[0]:t[1]], prev[3])
        else:
            out.append(t)
    return out


def parse_section(tid, a, b, co_start='', verbose=False):
    """Rows of the section text[a:b] of the text id: a dict with rows (7-field plus extras), notes, events, diagnostics."""
    text, pm, ent = L.load(tid)
    S = Stream(text, a, b, leaf_starts=set(pm.starts))
    toks = S.toks
    n = len(toks)
    ev_by_idx = {}
    for (ti, kind, payload, off) in S.events:
        ev_by_idx.setdefault(ti, []).append((kind, payload, off))
    ev_idx = set(ev_by_idx)
    # parts: token ranges between events, with the state that holds there
    cuts = sorted(ev_idx | {0, n})
    state = {'co': co_start, 'section': None, 'head': '', 'prev_section': None, 'comp_since_priv': True, 'started': False, 'co_rule': '', 'co_heading': '', 'co_off': None}
    parts, log = [], []
    heading_log = []
    for ci in range(len(cuts)):
        ti = cuts[ci]
        for (kind, payload, off) in ev_by_idx.get(ti, []):
            if kind == 'abbr':
                continue
            if kind == 'comp':
                hl = read_letter(payload)
                prev = state['co']
                exp = 'A' if prev in ('FS', '', None) else (L.LETTERS[L.LETTERS.index(prev) + 1] if prev in L.LETTERS and L.LETTERS.index(prev) + 1 < len(L.LETTERS) else None)
                hmap = L.CMAP.get(hl, hl.upper())
                rule = 'letter'
                if exp and (hl == exp or hmap == exp):
                    co = exp
                elif exp and (hl in L.CONFUSE.get(exp, ()) or hmap in L.CONFUSE.get(exp, ()) or hmap not in L.LETTERS):
                    co, rule = exp, 'sequence'                # the printed letter is one the scan confuses with the expected letter, or no letter: the sequence gives it
                elif hl in L.LETTERS and exp and L.LETTERS.index(hl) > L.LETTERS.index(exp) and L.LETTERS.index(hl) - L.LETTERS.index(exp) <= 3:
                    co, rule = hl, 'skip'                     # a clean letter further on: the roll has no company in between
                elif exp:
                    co, rule = exp, 'sequence'                # the printed letter repeats an earlier one or is far off: the sequence of the headings gives the letter
                else:
                    co, rule = hmap, 'out-of-sequence'
                heading_log.append({'off': off, 'heading': ' '.join(payload.split()), 'letter_read': hl, 'assigned': co, 'rule': rule, 'prev': prev})
                state.update(co=co, section='officers', head='', comp_since_priv=True, started=True, co_rule=rule, co_heading=' '.join(payload.split()), co_off=off)
            elif kind == 'fs':
                state.update(co='FS', section='fs', head=head_text(kind, payload), started=True, co_rule='', co_heading='', co_off=None)
            elif kind == 'off':
                if state['section'] in ('nco', 'privates') and state['co'] not in ('FS', '', None) and not state['comp_since_priv']:
                    prev = state['co']
                    nxt = L.LETTERS[L.LETTERS.index(prev) + 1] if prev in L.LETTERS and L.LETTERS.index(prev) + 1 < len(L.LETTERS) else prev
                    heading_log.append({'off': off, 'heading': 'OFFICERS (company heading lost)', 'letter_read': '', 'assigned': nxt, 'rule': 'inferred-after-privates', 'prev': prev})
                    state.update(co=nxt, co_rule='inferred-after-privates', co_heading='OFFICERS (company heading lost)', co_off=off)
                state.update(section='officers', head=head_text(kind, payload), comp_since_priv=False if state['section'] in ('nco', 'privates') else state['comp_since_priv'], started=True)
                state['comp_since_priv'] = False
            elif kind == 'nco':
                state.update(section='nco', head=head_text(kind, payload), started=True)
            elif kind == 'priv':
                state.update(section='privates', head=head_text(kind, payload), comp_since_priv=False, started=True)
            elif kind == 'mus':
                state.update(section='musicians', head=head_text(kind, payload), started=True)
        if ci + 1 < len(cuts):
            parts.append((ti, cuts[ci + 1], dict(state)))
    rows, notes, preamble_tokens = [], [], 0
    for (ta, tb, st) in parts:
        if ta >= tb:
            continue
        if not st['started']:
            preamble_tokens += tb - ta
            continue
        # notes: "Note.--" up to the next strong head or the end of the part
        i = ta
        pieces = []                 # token ranges of the part without notes
        seg_start = ta
        while i < tb:
            t = toks[i][2]
            if re.match(r"^N[o0]t[ec]\.?[—\-–=]*$", t, re.I) and (i + 1 < tb and re.match(r"^[—\-–=\.]{1,3}", toks[i + 1][2]) or re.search(r"[—\-–]$", t)):
                if seg_start < i:
                    pieces.append((seg_start, i))
                # skip until a strong head after a sentence end
                j = i + 1
                end = tb
                while j < tb:
                    if boundary(S, j, ev_idx) >= 2:
                        g = match_G(S, j) or match_S(S, j)
                        if g and g[0] in ('S-mark', 'G-rank', 'G-mark'):
                            end = j
                            break
                    j += 1
                notes.append({'off': toks[i][0], 'end': toks[end - 1][1] if end > i else toks[i][1], 'text': ' '.join(x[2] for x in toks[i:end])[:400], 'tokens': end - i, 'co': st['co']})
                i = end
                seg_start = end
                continue
            i += 1
        if seg_start < tb:
            pieces.append((seg_start, tb))
        for (pa, pb) in pieces:
            heads = find_heads(S, pa, pb, st['section'], ev_idx)
            for hi, (hs, kind, last, rend) in enumerate(heads):
                nxt = heads[hi + 1][0] if hi + 1 < len(heads) else pb
                nt = [x[2] for x in toks[hs:last + 1]]
                while len(nt) > 1 and LONEMARK.match(nt[-1]):
                    nt.pop()
                name = ' '.join(nt)
                name = re.sub(r"[,;:]+$", '', name)
                off = toks[hs][0]
                if rend:
                    rank = ' '.join(x[2] for x in toks[last + 1:rend])
                    rank = re.sub(r"[,;:]+$", '', rank)
                    rs = rend
                else:
                    rank, rs = '', last + 1
                if not rank and st['head']:
                    rank = '^' + st['head']
                rem_toks = _merge_pieces(S, toks[rs:nxt])
                remarks = ' '.join(x[2] for x in rem_toks)
                rd = (rem_toks[0][0] - off) if rem_toks else 0
                leaf = pm.leaf(off)
                page = pm.printed(leaf) if leaf is not None else None
                row = R.row(name, rank, st['co'], remarks, page, off, rd)
                rows.append({'row': row, 'kind': kind, 'section': st['section'], 'head': st['head'], 'line_start': toks[hs][3], 'tok': hs, 'end': (rem_toks[-1][1] if rem_toks else (toks[rs - 1][1])),
                             'leaf': leaf, 'co_rule': st.get('co_rule', ''), 'co_heading': st.get('co_heading', ''), 'co_off': st.get('co_off'),
                             'lone_dropped': len(nt) < (last + 1 - hs), 'lowercase_head': bool(re.match(r"^[^\w\s]{0,2}[a-z]", toks[hs][2]) and not initial_tok(toks[hs][2]))})
    return {'rows': rows, 'notes': notes, 'headings': heading_log, 'preamble_tokens': preamble_tokens, 'furniture': len(S.furniture), 'tokens': n, 'stream': S}


R = L.R
