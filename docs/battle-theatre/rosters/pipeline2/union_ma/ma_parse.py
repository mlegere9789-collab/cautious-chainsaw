"""Parser of the Massachusetts rosters (Massachusetts Soldiers, Sailors, and Marines in the Civil War, 1931-35) for the roster work item union-ma.
Layout 'flow' (roster2/2, see ../r2lib.py).  This module is the library (sections, tokens, headings, entry heads, rows); the command line is
../parse_ma_ssm.py.

The rules (one rule set, applied to the OCR text exactly as the Internet Archive prints it; nothing is corrected, completed or re-ordered):

  * A unit's roster is a run of whole leaves of one volume (ma_sections.py).  Page furniture is left out of every entry: the running head at the top of a
    leaf (the title of the unit in capitals, with the page number), a bare page number, the sub-heading "Three Years' Service", and the section headings
    COMPANY "A", FIELD AND STAFF, NON-COMMISSIONED STAFF, BAND, UNASSIGNED (they set the company code of the entries after them and are in no entry).
  * An entry head is  <name> - <rank> - Res.   (em dashes, which the OCR keeps as separate tokens in all but a few dozen places).  The company lists print
    "Surname, Given names"; the field and staff and the non-commissioned staff print "Given names Surname".  The name is the run of name-like tokens before
    the first dash back to the token that ends the entry above (a token that ends with a period and is not an initial, a suffix or an abbreviation of a
    given name, or a token that is not name-like at all); the rank is the tokens between the two dashes; the remarks are every other printed token of the
    entry from "Res." to the head of the next entry, in full, furniture left out.
  * name = the OCR tokens of the head joined by single blanks, verbatim (stray marks kept); rank = the printed rank tokens; co = the company code of the
    nearest heading above (A..M; FS field and staff; NCS non-commissioned staff; BAND; UNAS unassigned; "" where no heading applies (the batteries and
    the sharpshooters print a single list) or the heading's letter is damaged).
  * where the OCR damaged a head so that no rule finds it, a reviewed cut (ma_cuts.py: located by an exact string of the text) says where the entry
    begins; the tokens stay the printed tokens.  Every such row, and every row whose boundary to the entry above looks unusual, carries code H.
  * the caller checks every row against the text before anything is written (r2lib.verify_rows).

Standard library only.
"""
import re, os, sys, json, gzip, bisect, collections, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MA-SSM-1931')

TOK = re.compile(r'\S+')
DASH_CH = '—–'                                   # em dash, en dash
DASH_WORDS = {'-', '--', '---', '_', '~', '-—', '—-', '=', ':—'}
LEAD = r"""[\"'`\^\*\[\(\|\.\-\u2022\u25a0#\\<>{}~]*"""
CAP_TOK = re.compile(r"^" + LEAD + r"[A-Z][^\s,;:]*[,\.]?[,\.]?$|^" + LEAD + r"[A-Z][^\s;]*,[\.\"']?$")
INITIAL = re.compile(r"^" + LEAD + r"[A-Z0][\'`]?[\.,]{0,2}$")
SUFFIX = re.compile(r"^" + LEAD + r"(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d)|[Il]st)[\.,']*$")        # [Il]st: the OCR reads a printed 1st as Ist or lst
QUOTED_LETTER = re.compile(r"^[\"'`\u2018\u2019\u201c\u201d]+[A-Z0-9][\.,]?[\"'`\u2018\u2019\u201c\u201d]+[\.,]?$")   # a company letter in quotes (Co. "D.") closes the entry above
PARTICLE = {'de', 'De', 'van', 'Van', 'von', 'Von', 'la', 'La', 'le', 'Le', 'du', 'Du', 'di', 'Di', 'da', 'Da', 'del', 'Del', 'der', 'Der', 'den', 'Den',
            'ter', 'Ter', 'ten', 'Ten', 'dos', 'Dos', 'des', 'Des', 'el', 'El', 'al', 'Al', 'af', 'ap'}
NAME_ABBR = {'St.', 'Ste.', 'Wm.', 'Chas.', 'Geo.', 'Thos.', 'Jas.', 'Jno.', 'Benj.', 'Saml.', 'Danl.', 'Edw.', 'Fred.', 'Robt.', 'Alex.', 'Nath.', 'Jos.', 'Hy.',
             'Theo.', 'Eben.', 'Ezek.', 'Sam.', 'Chris.', 'Jr.', 'Sr.', 'Jr.,', 'Sr.,', 'Mt.', 'Ft.'}
RES_EXACT = re.compile(r'^Res[\.,:;]?$')
RES_LOOSE = re.compile(r'^[RKBHE][eoc][sa5][\.,:;]?$')


def is_dash_word(w):
    return w in DASH_WORDS or (w != '' and all(c in DASH_CH for c in w))


def strip_marks(w):
    return w.strip(",.;:\"'`^*|[]()<>—–-~_•■#")


class Tok(object):
    __slots__ = ('s', 'e', 'w', 'leaf')

    def __init__(self, s, e, w, leaf):
        self.s, self.e, self.w, self.leaf = s, e, w, leaf


class Piece(object):
    """a token, or a piece of a token that carries a glued dash; raw = index of the whitespace token it belongs to"""
    __slots__ = ('s', 'e', 'w', 'raw', 'dash')

    def __init__(self, s, e, w, raw, dash):
        self.s, self.e, self.w, self.raw, self.dash = s, e, w, raw, dash


# --------------------------------------------------------------------------- volumes and leaves
_cache = {}


def load_volume(vol, idents):
    """text, PageMap of volume vol (the files pinned in the ledger)"""
    if vol in _cache:
        return _cache[vol]
    ident = idents[vol]
    t = R.load_text(os.path.join(LIB, ident + '_hocr_searchtext.txt.gz'))
    pm = R.PageMap(os.path.join(LIB, ident + '_hocr_pageindex.json.gz'), os.path.join(LIB, ident + '_page_numbers.json'))
    _cache[vol] = (t, pm)
    return _cache[vol]


def leaf_range(spec, pm, first_leaf=None):
    """first leaf, end leaf (exclusive) of the unit's section.  The first leaf is the leaf whose printed page is the contents page of the unit (or the leaf
    given, where that title leaf has no printed number); the end is the leaf whose printed page is next_page, or the end of the volume."""
    if first_leaf is not None:
        first = first_leaf
    else:
        c = [i for i in range(len(pm.ranges)) if pm.printed(i) == spec['page']]
        if len(c) != 1:
            raise ValueError('%s: printed page %s found on leaves %s' % (spec['key'], spec['page'], c))
        first = c[0]
    if spec['next_page'] is None:
        end = len(pm.ranges)
    else:
        c = [i for i in range(len(pm.ranges)) if pm.printed(i) == spec['next_page']]
        if len(c) != 1:
            raise ValueError('%s: next printed page %s found on leaves %s' % (spec['key'], spec['next_page'], c))
        end = c[0]
    return first, end


# --------------------------------------------------------------------------- furniture and headings
_WORDS = {'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FIFTEENTH', 'SIXTEENTH',
          'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH', 'TWENTY-SECOND', 'TWENTY-EIGHTH', 'THIRTY-SECOND', 'THIRTY-THIRD', 'THIRTY-SEVENTH', 'REGIMENT', 'MASSACHUSETTS',
          'MASS.', 'VOLUNTEER', 'VOL.', 'INFANTRY', 'CAVALRY', 'BATTERY', 'LIGHT', 'ARTILLERY', 'COMPANY', 'SHARPSHOOTERS', 'SHARPSHOOTERS.', 'SHARP-', 'SHOOTERS', 'MILITIA'}


def _lcs_ratio(a, b):
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if not la or not lb:
        return 0.0
    prev = [0] * (lb + 1)
    for i in range(1, la + 1):
        cur = [0] * (lb + 1)
        for j in range(1, lb + 1):
            cur[j] = prev[j - 1] + 1 if a[i - 1] == b[j - 1] else max(prev[j], cur[j - 1])
        prev = cur
    return 2.0 * prev[lb] / (la + lb)


_near_cache = {}


def _near_word(w):
    if w not in _near_cache:
        _near_cache[w] = max(_lcs_ratio(w, x) for x in _WORDS) >= 0.75
    return _near_cache[w]


def is_running_head(line):
    """the running head of a leaf (title of the unit in capitals, with or without the page number) or a bare page number.  Entries are set in lower case;
    the title words are matched approximately because the OCR damages them (THIRTEEXTH RZGBIEXT, TTV^NTY-SECOND)."""
    s = ' '.join(line.split())
    if not s:
        return True
    letters = [c for c in s if c.isalpha()]
    if not letters:
        # a bare page number; a number that ends with a period or a comma ('1864.') is the last word of an entry that the page break left alone on its line
        return bool(re.search(r'\d', s)) and len(s) <= 8 and not re.search(r'[\.,;]\s*$', s)
    if len(letters) < 6 or sum(1 for c in letters if c.isupper()) / len(letters) < 0.7:
        return False
    words = [re.sub(r'[^A-Z\-\.]', '', w.upper()) for w in s.split()]
    words = [w for w in words if len(w) >= 3]
    return bool(words) and sum(1 for w in words if _near_word(w)) >= max(2, int(0.5 * len(words)))


SUBHEAD = re.compile(r"^(?:Three|One|Nine|Six|Four|Twelve|Two)\s+(?:Years?|Months?)['’*‘`]*\s*(?:Service)?[\s\*\.]*(?:field\s+and\s+staff)?$", re.I)


def classify_heading(line):
    """(code, damaged, rest) for a section heading line, or None.  code: a company letter A-M, 'FS', 'NCS', 'BAND', 'UNAS', or '' for a company heading
    whose letter is unreadable; rest: the text after the heading on the same line (an entry may follow it)."""
    s = line.strip()
    if not s:
        return None
    m = re.match(r"^[^A-Za-z]*(COMP[A-Z]{1,4})\s+([^A-Za-z0-9]*)([A-Za-z0-9]{1,2})([^A-Za-z0-9\s]{0,3})(?:\s+(.*))?$", s)
    if m and _lcs_ratio(m.group(1), 'COMPANY') >= 0.7:
        letter = m.group(3)
        rest = m.group(5) or ''
        return (letter, False, rest) if re.fullmatch(r'[A-M]', letter) else ('', True, rest)
    up = ' '.join(s.split())
    letters = [c for c in up if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) >= 0.8:
        core = re.sub(r'[^A-Z]', '', up)
        if core.startswith('FIELDANDSTAFF'):
            return ('FS', False, '')
        if _lcs_ratio(core[:20], 'NONCOMMISSIONEDSTAFF') >= 0.85 and len(core) <= 24:
            return ('NCS', False, '')
        if core in ('BAND', 'IBAND', 'BANDI'):
            return ('BAND', False, '')
        if 7 <= len(core) <= 14 and _lcs_ratio(core, 'UNASSIGNED') >= 0.75:
            return ('UNAS', False, '')
    return None


def tokenize_section(text, pm, leaf_a, leaf_b, reviewed=None):
    """content tokens of leaves leaf_a .. leaf_b-1 (absolute offsets), the section headings and the furniture lines.
    Returns (toks, heads, furn): heads = [(offset of the heading line, code, damaged, leaf, line text)], furn = [(leaf, offset, text)]"""
    toks, heads, furn = [], [], []
    reviewed_hit = tokenize_section.hits = []
    for leaf in range(leaf_a, leaf_b):
        a, b = pm.span(leaf)
        pos = a
        for line in text[a:b].split('\n'):
            lstart = pos
            pos += len(line) + 1
            if not line.strip():
                continue
            h = classify_heading(line)
            if h is None and reviewed and ' '.join(line.split()) in reviewed:      # a heading read by review (ma_cuts.HEADINGS)
                h = (reviewed[' '.join(line.split())], False, '')
                reviewed_hit.append(lstart)
            if h is not None:
                heads.append((lstart, h[0], h[1], leaf, ' '.join(line.split())))
                furn.append((leaf, lstart, ' '.join(line.split())))
                rest = h[2]
                if rest:                                               # an entry (or its first words) follows the heading on the same line
                    k = line.index(rest)
                    for m in TOK.finditer(line, k):
                        toks.append(Tok(lstart + m.start(), lstart + m.end(), m.group(0), leaf))
                continue
            if is_running_head(line) or SUBHEAD.match(' '.join(line.split())):
                furn.append((leaf, lstart, ' '.join(line.split())))
                continue
            for m in TOK.finditer(line):
                toks.append(Tok(lstart + m.start(), lstart + m.end(), m.group(0), leaf))
    return toks, heads, furn


def make_pieces(toks):
    """split the tokens that carry a glued dash: 'William—' -> 'William', '—'; the standalone dash tokens stay as they are"""
    out = []
    for i, t in enumerate(toks):
        w = t.w
        if is_dash_word(w):
            out.append(Piece(t.s, t.e, w, i, True))
        elif any(c in DASH_CH for c in w):
            for m in re.finditer(r'[—–]+|[^—–]+', w):
                g = m.group(0)
                out.append(Piece(t.s + m.start(), t.s + m.end(), g, i, g[0] in DASH_CH))
        else:
            out.append(Piece(t.s, t.e, w, i, False))
    return out


# --------------------------------------------------------------------------- name tokens
def name_like(w):
    return w in PARTICLE or bool(CAP_TOK.match(w) or INITIAL.match(w) or SUFFIX.match(w))


def part_of_name(w):
    c = w.rstrip('"\'`)]’')
    return c in NAME_ABBR or bool(INITIAL.match(c)) or bool(SUFFIX.match(c)) or c in PARTICLE


def ends_entry(w):
    """a token that can end the entry above: ends with a period, ';', ')' or a digit and is not part of a name (an initial, a suffix, a given-name abbreviation)"""
    if QUOTED_LETTER.match(w):                                   # the closing token of 'as of Co. "D."' is the end of the entry above, not an initial of the next name
        return True
    c = w.rstrip('"\'`)]’')
    if not c or part_of_name(c):
        return False
    return c[-1] in '.;)' or c[-1].isdigit()


PREFIX_WORDS = PARTICLE | {'Mac', 'Mc', 'St.', 'Ste.', 'Mt.', 'Ft.', 'Fitz', 'Saint'}
PREFIX_O = re.compile(r"^[\"'`\u2018\u2019]?O['`\u2019\u2018]$")


def is_comma_tok(w):
    """a token that ends with a comma (a closing quote or mark after it is allowed) and carries at least two letters: the surname of 'Surname, Given'"""
    c = w.rstrip('"\'`)]\u2019')
    return c.endswith(',') and sum(1 for ch in c if ch.isalpha()) >= 2


def is_junk_short(w):
    """a short token that is mostly marks (a stray mark of the scan, or an initial the OCR turned into marks: '0-', '\\.', ':'); never an initial or a suffix"""
    if len(w) > 3 or is_dash_word(w) and w not in ('-', '--'):
        return False
    if INITIAL.match(w) and sum(1 for ch in w if ch.isalpha()) == 1 and w[:1].isalpha():
        return False
    if SUFFIX.match(w):
        return False
    return sum(1 for ch in w if ch.isalpha()) <= 1


GLUED_COMMA = re.compile(r"^[^,\s]*[A-Za-z][^,\s]*,['\"`\^\.]?[A-Za-z\.\-][^\s]*$")


def _window(pieces, ne, lower):
    """the pieces before ne, back to (not including) the first hard stop: a dash, a piece that ends with ';', a piece that ends the entry above (a period-ended
    word that is not part of a name; the last name token itself is exempt), the lower bound, or 9 pieces."""
    k = ne - 1
    start = ne
    base = max(lower, ne - 9)
    while k >= base:
        pc = pieces[k]
        w = pc.w
        if pc.dash and not (w in ('-', '--', '_', '~', '=') and k == ne - 1):
            break
        if w.endswith(';'):
            break
        if k < ne - 1 and ends_entry(w) and not is_comma_tok(w) and not GLUED_COMMA.match(w):
            break
        start = k
        k -= 1
    return start


def _name_suffix(pieces, ne, lower):
    """start of the maximal run of name-like pieces that ends before ne (the last piece is accepted whatever it looks like); stops at a dash, a piece that
    ends the entry above, a non-name-like piece"""
    k = ne - 1
    start = ne
    base = max(lower, ne - 9)
    while k >= base:
        pc = pieces[k]
        w = pc.w
        junk = is_junk_short(w) or strip_marks(w) == ''
        if pc.dash and not (junk and w in ('-', '--', '_', '~', '=')):
            break
        if not (name_like(w) or is_comma_tok(w) or junk or (k == ne - 1 and strip_marks(w) != '')):
            break
        if not junk and ends_entry(w) and not is_comma_tok(w) and k < ne - 1:
            break
        start = k
        k -= 1
    while start < ne - 1 and (is_junk_short(pieces[start].w) or strip_marks(pieces[start].w) == ''):
        start += 1
    return start


def _given_ok(words):
    """tokens after the surname comma: at most 6, none ending with ';', at most one further comma token (the one before a suffix), the suffix last"""
    if len(words) > 6:
        return False
    for i, w in enumerate(words):
        if w.endswith(';'):
            return False
        if SUFFIX.match(w) and i != len(words) - 1:
            return False
        if is_comma_tok(w) and not (SUFFIX.match(w) and i == len(words) - 1) \
                and not (i == len(words) - 2 and (SUFFIX.match(words[-1]) or INITIAL.match(words[-1]))):
            return False
    return True


_ABBREV_END = set()          # period-ended words that end entries in this volume set (filled by learn_abbrev); a word not in it is not an abbreviation


def learn_abbrev(counter, threshold=5):
    _ABBREV_END.clear()
    _ABBREV_END.update(w for w, c in counter.items() if c >= threshold)


ALT_WORDS = {'or', 'alias', 'Alias', 'alias,'}


def _fragment(w):
    """a token that can be the piece of a surname the OCR split by a blank: letters only (a stray mark at an edge is allowed), no period, no comma, not an initial"""
    c = strip_marks(w)
    return bool(c) and c.isalpha() and not w.endswith(',') and not w.rstrip('"\'`)]').endswith('.') and not INITIAL.match(w)


def _extend_start(pieces, st, a):
    """The name cut found by the comma rule can leave printed tokens of the same head behind (they would end up at the end of the entry above): (1) the head
    prints two names ('Shelters or Shultis, George', 'Mclntee, Arthur alias Mclntire, Arthur'): the word 'or' / 'alias' stands directly before the cut: the name
    starts at the first token of the window (the window starts after the last token that can end the entry above; initials such as 'D. C.' at its start belong to the
    entry above and are left out), when at most 5 tokens are in between; (2) the OCR split the surname by a blank ('Know] ton,', 'Danf or th,', 'Fitzpa trick,'): the first
    token of the cut is a lower-case fragment: the (at most 3) fragment tokens directly before it join the name.  Returns (start, kind), kind None when nothing was extended."""
    if st <= a:
        return st, None
    w = strip_marks(pieces[st].w)
    if w[:1].islower() and w not in PARTICLE:                       # checked first: in 'Danf or th,' the word 'or' is a fragment, not an alternate marker
        s2 = st
        while s2 > a and st - s2 < 3 and _fragment(pieces[s2 - 1].w):
            s2 -= 1
        if s2 < st:
            return s2, 'fragment-extended'
    if pieces[st - 1].w in ALT_WORDS and st - a <= 5:
        s2 = a
        while s2 < st - 2 and INITIAL.match(pieces[s2].w) and pieces[s2].w.endswith('.'):
            s2 += 1
        return s2, 'alternate-name'
    return st, None


def scan_name_start(pieces, ne, lower, style='comma'):
    """index of the first name piece of a head whose name ends before piece ne.  style 'comma': Surname, Given [Suffix] (the company lists); style 'given':
    Given [Middle] Surname (field and staff, non-commissioned staff).  Returns (start, kind): kind 'ok' or the reason the cut is unusual."""
    a = _window(pieces, ne, lower)
    words = [pieces[k].w for k in range(a, ne)]
    core = list(words)
    while core and (is_junk_short(core[-1]) or strip_marks(core[-1]) == ''):      # trailing stray marks stay in the name (as printed)
        core.pop()
    if style == 'comma':
        cands = []
        for i, w in enumerate(core):
            if is_comma_tok(w):
                cands.append(i)
            elif GLUED_COMMA.match(w) and i == 0 or (GLUED_COMMA.match(w) and not name_like(core[i - 1] if i else '')):
                cands.append(i)                                                    # 'Tibbetts,'James' / 'Slyman,John-': surname, comma and given name in one token
            elif w == ',' and i >= 1:                                              # 'Greenleaf , George': the comma is a token of its own
                cands.append(i - 1)
        for ci in cands:                                                           # the earliest valid surname comma
            rest = core[ci + 1:]
            if rest and rest[0] == ',':
                rest = rest[1:]
            if _given_ok(rest):
                b = ci
                nb = 0
                while b > 0 and nb < 2 and (core[b - 1] in PREFIX_WORDS or PREFIX_O.match(core[b - 1])):
                    b -= 1
                    nb += 1
                if b > 0 and nb == 0 and re.fullmatch(r'[A-Z]', core[b - 1]) and core[b][:1].islower():     # the OCR split a surname: 'M acomber,'
                    b -= 1
                st, how = _extend_start(pieces, a + b, a)
                return st, ('ok' if how is None else how)
        if cands:
            return a + cands[-1], 'comma-given-invalid'
        # a period where the comma belongs ('Washburn. Henry N.'): the word before the window is the surname when no abbreviation of the volume looks like it
        if a > lower and a > 0:
            pw = pieces[a - 1].w
            c = pw.rstrip('"\'`)]\u2019')
            if c.endswith('.') and CAP_TOK.match(pw) and sum(1 for ch in c if ch.isalpha()) >= 3 and c not in _ABBREV_END and not pieces[a - 1].dash and core:
                return a - 1, 'period-for-comma'
        a2 = _name_suffix(pieces, ne, lower)
        if ne - a2 <= 5:
            return a2, 'no-comma'
        return ne - 3, 'no-comma-long'
    # given-first: the run of name-like pieces; leading initials of an entry above ('U. S. A.') are dropped when 4 or more pieces are left
    a2 = _name_suffix(pieces, ne, lower)
    ws = [pieces[k].w for k in range(a2, ne)]
    dropped = 0
    while len(ws) - dropped >= 5 and (INITIAL.match(ws[dropped]) or ws[dropped] in ('INFANTRY', 'Infantry,')) or ws[dropped:dropped + 1] == ['INFANTRY'] and len(ws) - dropped >= 3:
        dropped += 1
    if len(ws) - dropped > 5:
        return ne - 4, 'long-region'
    return a2 + dropped, ('ok' if dropped == 0 else 'initials-dropped')


COMMA_END = re.compile(r"[,]\W*$|,[\.\"']?$")


def comma_index(words):
    """index of the surname token (the first token that ends with a comma) of a name, or -1"""
    for i, w in enumerate(words):
        if re.search(r"[A-Za-z][\.\"'`]?,[\.\"']?$", w) or w.endswith(',') or w.endswith('.,'):
            return i
    return -1


# --------------------------------------------------------------------------- entries
class Entry(object):
    """one entry head found in the pieces: name pieces [n0, ne), rank pieces [rk0, rk1), second dash d2 (None when damaged beyond reading), Res piece res"""
    __slots__ = ('n0', 'ne', 'rk0', 'rk1', 'd1', 'd2', 'res', 'kind', 'cut', 'code', 'style', 'junk')

    def __init__(self, ne, rk0, rk1, d1, d2, res, kind):
        self.ne, self.rk0, self.rk1, self.d1, self.d2, self.res, self.kind = ne, rk0, rk1, d1, d2, res, kind
        self.n0 = None
        self.cut = 'ok'
        self.code = ''
        self.style = 'comma'
        self.junk = 0


def _is_junkpiece(pc):
    return (not pc.dash) and (is_junk_short(pc.w) or strip_marks(pc.w) == '')


RANK_WINDOW = 7


def _rank_like(words, rank_vocab):
    """a rank as printed, or as the OCR damages it: equal to a rank of the vocabulary, or similar to one"""
    t = ' '.join(words)
    if not rank_vocab:
        return True
    if t in rank_vocab:
        return True
    return max(_lcs_ratio(t, r) for r in rank_vocab) >= 0.6


def find_entries(pieces, rank_vocab=None):
    """Every head  NAME DASH RANK DASH Res.  Tier 1: the first dash, the rank (1 to 7 pieces), the second dash, an exact 'Res' piece.  A run of several dash
    pieces counts as one dash.  The tolerant forms the OCR makes of a head are accepted and named in Entry.kind: a stray mark between the second dash and
    Res ('junk-after-d2'), a stray mark in place of a dash ('d1-damaged', 'd2-damaged'), no first dash after a rank that is in rank_vocab ('d1-missing'), no
    rank ('no-rank'), and a damaged Res after the second dash ('res-damaged').  Returns entries in text order; the name start n0 is filled in by the caller."""
    ents = []
    n = len(pieces)
    for r in range(3, n):
        w = pieces[r].w
        if pieces[r].dash:
            continue
        exact = bool(RES_EXACT.match(w))
        loose = bool(RES_LOOSE.match(w))
        if not exact and not loose:
            continue
        j = r - 1
        kinds = []
        junk = 0
        if _is_junkpiece(pieces[j]) and j >= 1 and (pieces[j - 1].dash or _is_junkpiece(pieces[j - 1])):
            kinds.append('junk-after-d2')
            junk = 1
            j -= 1
        if pieces[j].dash:
            d2 = j
            while d2 - 1 >= 0 and pieces[d2 - 1].dash:                 # a run of dashes counts as one
                d2 -= 1
            d2_last = j
        elif exact and _is_junkpiece(pieces[j]):
            d2 = d2_last = j
            kinds.append('d2-damaged')
        else:
            continue
        if not exact:
            kinds.append('res-damaged')
        d1 = d1_last = None
        for k in range(d2 - 1, max(d2 - RANK_WINDOW - 1, -1), -1):
            if pieces[k].dash:
                d1_last = k
                d1 = k
                while d1 - 1 >= 0 and pieces[d1 - 1].dash:
                    d1 -= 1
                break
        rk0 = ne = None
        if d1 is not None and d2 - d1_last >= 2:
            rk0, ne = d1_last + 1, d1
            ranks = [pieces[x].w for x in range(rk0, d2)]
            if len(ranks) > 7 or any(x.endswith(';') or re.search(r'\d{3,}', x) for x in ranks):
                d1 = None                                           # the nearest dash belongs to the entry above
                rk0 = ne = None
        else:
            d1 = None
        if d1 is None:
            # a stray mark in place of the first dash, directly before a rank that looks like one
            for L in (1, 2, 3, 4):
                k = d2 - L - 1
                if k < 1:
                    break
                if _is_junkpiece(pieces[k]) and strip_marks(pieces[k - 1].w) != '' and _rank_like([pieces[x].w for x in range(k + 1, d2)], rank_vocab) \
                        and name_like(pieces[k - 1].w):
                    d1 = d1_last = k
                    rk0, ne = k + 1, k
                    kinds.append('d1-damaged')
                    break
        if d1 is None and rank_vocab:
            # no first dash at all: the last piece(s) before d2 are a known rank
            for L in (1, 2, 3, 4):
                cand = ' '.join(pieces[x].w for x in range(d2 - L, d2))
                if cand in rank_vocab and d2 - L - 1 >= 0 and (name_like(pieces[d2 - L - 1].w) or _is_junkpiece(pieces[d2 - L - 1])):
                    rk0, ne = d2 - L, d2 - L
                    kinds.append('d1-missing')
                    break
        if rk0 is None:
            # no rank at all: 'Name - Res.'  (one dash, then Res)
            if pieces[d2].dash and d2 >= 2 and (name_like(pieces[d2 - 1].w) or _is_junkpiece(pieces[d2 - 1])) and \
                    any(is_comma_tok(pieces[x].w) for x in range(max(0, d2 - 5), d2)) and not any(pieces[x].dash for x in range(max(0, d2 - 5), d2)):
                rk0, ne = d2, d2
                d1 = d2
                kinds.append('no-rank')
            else:
                continue
        kind = '+'.join(kinds) if kinds else 'reg'
        e = Entry(ne, rk0, d2, d1, d2, r, kind)
        e.junk = junk
        ents.append(e)
    ents.extend(_third_rule_entries(pieces, rank_vocab, {e.res for e in ents}, {e.d1 for e in ents if e.d1 is not None}, {e.d2 for e in ents if e.d2 is not None}))
    ents.sort(key=lambda e: e.res)
    return ents


THIRD_RULE_MAX_RANK_PIECES = 7


def _third_rule_entries(pieces, rank_vocab, used_res, used_d1, used_d2):
    """Third head rule (added by the reconciliation of union-ma, 14 November 2026).  A head whose 'Res.' the OCR lost or damaged beyond every tolerant form of
    find_entries ('Re3.', 'Ries.', 'Pes.', 'lies.', '-Res.', 'Res?', 'Res.Barre;', 'P.es-', or no 'Res' at all before the residence) is still  NAME DASH RANK DASH
    <anything>.  Accepted only when (a) both dashes are dash pieces, (b) the pieces between them are a rank of the vocabulary or close to one (the same test the
    'd1-damaged' form uses), none of them ends with ';' or holds a run of three digits, (c) a name-like piece or a stray mark stands directly before the first dash,
    (d) the piece after the second dash is not itself a dash and is not already the Res piece of an entry, and neither dash run belongs to a head that the other rules found.  The remarks of such a row start at that piece, so the
    row says what is printed (for example 'Res.Barre; 33; lawyer' or 'West Roxbury ; 38'); kind 'res-lost' (flag Q: the remarks do not start with 'Res.', and H)."""
    out = []
    if not rank_vocab:
        return out
    n = len(pieces)
    k = 0
    while k < n:
        if not pieces[k].dash or (k > 0 and pieces[k - 1].dash):
            k += 1
            continue
        d1 = k
        d1_last = k
        while d1_last + 1 < n and pieces[d1_last + 1].dash:
            d1_last += 1
        k = d1_last + 1
        if d1 < 1 or not (name_like(pieces[d1 - 1].w) or _is_junkpiece(pieces[d1 - 1])) or pieces[d1 - 1].dash:
            continue
        j = d1_last + 1
        while j < n and not pieces[j].dash and j - d1_last <= THIRD_RULE_MAX_RANK_PIECES + 1:
            j += 1
        if j >= n or not pieces[j].dash or j - d1_last < 2 or j - d1_last - 1 > THIRD_RULE_MAX_RANK_PIECES:
            continue
        d2 = j
        d2_last = d2
        while d2_last + 1 < n and pieces[d2_last + 1].dash:
            d2_last += 1
        res = d2_last + 1
        if res >= n or pieces[res].dash or res in used_res or d1 in used_d1 or d2 in used_d2:
            continue
        ranks = [pieces[x].w for x in range(d1_last + 1, d2)]
        if any(x.endswith(';') or re.search(r'\d{3,}', x) for x in ranks) or not _rank_like(ranks, rank_vocab):
            continue
        e = Entry(d1, d1_last + 1, d2, d1, d2, res, 'res-lost')
        out.append(e)
    return out


def HEADINGS_FOR(unit_key):
    import ma_cuts
    return [h for h in ma_cuts.HEADINGS if h[0] == unit_key]


def CUTS_FOR(unit_key):
    import ma_cuts
    return [c for c in ma_cuts.NAME_CUTS if c[0] == unit_key]


# --------------------------------------------------------------------------- one section
class Section(object):
    pass


def entry_end_counts(S):
    """counts of the period-ended tokens that stand right before a name start (the last token of the entry above)"""
    c = collections.Counter()
    for e in S.ents:
        if e.n0 and e.n0 > 0 and e.cut == 'ok':
            w = S.pieces[e.n0 - 1].w
            if w.endswith('.') or w.endswith('."'):
                c[w] += 1
    return c


def analyse(spec, idents, first_leaf=None, rank_vocab=None):
    """Read the section of one unit: tokens, pieces, headings, entries with their name cut and company code.  Nothing is written."""
    S = Section()
    S.spec = spec
    S.text, S.pm = load_volume(spec['vol'], idents)
    S.leaf_a, S.leaf_b = leaf_range(spec, S.pm, first_leaf if first_leaf is not None else spec.get('first_leaf'))
    if spec.get('last_leaf') is not None:                          # the roster ends on this leaf; the leaves after it hold no entry (asserted by the caller)
        S.leaf_b = spec['last_leaf'] + 1
    reviewed = {line: code for unit, line, code, why in HEADINGS_FOR(spec['key'])}
    S.toks, S.heads, S.furn = tokenize_section(S.text, S.pm, S.leaf_a, S.leaf_b, reviewed)
    S.reviewed_heads = list(tokenize_section.hits)
    if len(S.reviewed_heads) != len(reviewed):
        raise ValueError('%s: %d reviewed headings, %d found' % (spec['key'], len(reviewed), len(S.reviewed_heads)))
    S.tail_dropped = []
    if spec.get('end_note'):                                       # a printed note after the last entry is no part of the entry
        a0, b0 = S.pm.span(S.leaf_b - 1)
        m = re.search(spec['end_note'], S.text[a0:b0])
        if not m:
            raise ValueError('%s: end note not found' % spec['key'])
        cut = a0 + m.start()
        keep = [t for t in S.toks if t.s < cut]
        S.tail_dropped.append(('end note', cut, ' '.join(t.w for t in S.toks if t.s >= cut)))
        S.toks = keep
    while S.toks and (strip_marks(S.toks[-1].w) == '' or (re.fullmatch(r'\d{1,4}', S.toks[-1].w) and len(S.toks) > 1 and S.toks[-2].w.endswith('.'))):
        t = S.toks.pop()                                           # a printer's mark or a bare folio number after the last entry
        S.tail_dropped.append(('stray mark or folio', t.s, t.w))
    S.pieces = make_pieces(S.toks)
    S.ents = find_entries(S.pieces, rank_vocab)
    hoffs = [h[0] for h in S.heads]
    prev_res = -1
    for e in S.ents:
        off = S.pieces[e.ne - 1].s if e.ne > 0 else 0
        k = bisect.bisect_right(hoffs, off) - 1
        if k >= 0:
            e.code = S.heads[k][1]
        else:
            e.code = 'FS' if spec['arm'] in ('infantry', 'cavalry') else ''
        e.style = 'given' if e.code in ('FS', 'NCS') else 'comma'
        e.n0, e.cut = scan_name_start(S.pieces, e.ne, prev_res + 1, e.style)
        prev_res = e.res
    S.applied_cuts = []
    for unit, name, why in CUTS_FOR(spec['key']):
        toks_ = name.split()
        hit = [e for e in S.ents if e.ne - len(toks_) >= 0 and [S.pieces[k].w for k in range(e.ne - len(toks_), e.ne)] == toks_]
        if len(hit) != 1:
            raise ValueError('reviewed cut %r of %s: found %d times' % (name, unit, len(hit)))
        e = hit[0]
        e.n0, e.cut = e.ne - len(toks_), 'reviewed'
        S.applied_cuts.append((name, why, e))
    # a reviewed cut moves the name start of an entry; the entry above must not overlap it
    for a, b in zip(S.ents, S.ents[1:]):
        if b.n0 <= a.res:
            raise ValueError('%s: name of the entry at piece %d starts before the Res piece of the entry above' % (spec['key'], b.n0))
    return S


def rank_text(S, e):
    return ' '.join(S.pieces[k].w for k in range(e.rk0, e.rk1)) if e.rk1 > e.rk0 else ''


def count_ranks(S):
    c = collections.Counter()
    for e in S.ents:
        if e.kind == 'reg':
            c[rank_text(S, e)] += 1
    return c


# --------------------------------------------------------------------------- rows
CODE_FOR_NO_HEADING = {'infantry': 'FS', 'cavalry': 'FS'}


def _junkonly(w):
    return strip_marks(w) == ''


def build_rows(S):
    """the 7-field rows of the section (r2lib): [name, rank, co, remarks, page, off, rd], and a parallel list of dicts (entry, stray marks, ...).  Stray marks of the
    scan (a lone ^ ■ • ' and the like) at the edges of the name, at the edges of the rank and between the second dash and Res. are not part of any field: they are
    listed in info['marks'] as (offset, text, where) and written to the flag file."""
    rows, info = [], []
    ents = S.ents
    hoffs = [h[0] for h in S.heads]
    for i, e in enumerate(ents):
        marks = []
        n0, ne = e.n0, e.ne
        while ne - 1 > n0 and _junkonly(S.pieces[ne - 1].w) and not S.pieces[ne - 1].dash:
            ne -= 1
            marks.append((S.pieces[ne].s, S.pieces[ne].w, 'after name'))
        rk0, rk1 = e.rk0, e.rk1
        while rk0 < rk1 and _junkonly(S.pieces[rk0].w) and not S.pieces[rk0].dash:
            marks.append((S.pieces[rk0].s, S.pieces[rk0].w, 'before rank'))
            rk0 += 1
        while rk1 - 1 >= rk0 and _junkonly(S.pieces[rk1 - 1].w) and not S.pieces[rk1 - 1].dash:
            rk1 -= 1
            marks.append((S.pieces[rk1].s, S.pieces[rk1].w, 'after rank'))
        for k in range(e.rk1, e.res):                                 # between the second dash and Res.
            pc = S.pieces[k]
            if not pc.dash and _junkonly(pc.w) and not (k == e.rk1 and 'd2-damaged' in e.kind):
                marks.append((pc.s, pc.w, 'before Res.'))
        marks.sort()
        a = S.pieces[n0]
        off = a.s
        name = ' '.join(S.pieces[k].w for k in range(n0, ne))
        rank = ' '.join(S.pieces[k].w for k in range(rk0, rk1))
        res = S.pieces[e.res]
        raw0 = res.raw
        raw_end = S.pieces[ents[i + 1].n0].raw if i + 1 < len(ents) else len(S.toks)
        first = S.text[res.s:S.toks[raw0].e]
        rest = [S.toks[k].w for k in range(raw0 + 1, raw_end)]
        remarks = ' '.join([first] + rest)
        k = bisect.bisect_right(hoffs, off) - 1
        code = S.heads[k][1] if k >= 0 else CODE_FOR_NO_HEADING.get(S.spec['arm'], '')
        leaf = S.pm.leaf(off)
        page = S.pm.printed(leaf)
        rows.append([name, rank, code, remarks, page, off, res.s - off])
        info.append({'entry': e, 'marks': marks, 'damaged_heading': bool(k >= 0 and S.heads[k][2]), 'leaf': leaf, 'heading_index': k})
    return rows, info
