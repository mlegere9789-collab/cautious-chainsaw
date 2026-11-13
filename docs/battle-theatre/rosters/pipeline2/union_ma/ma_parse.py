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
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MA-SSM-1931')

TOK = re.compile(r'\S+')
DASH_CH = '—–'                                   # em dash, en dash
DASH_WORDS = {'-', '--', '---', '_', '~', '-—', '—-', '=', ':—'}
LEAD = r"""[\"'`\^\*\[\(\|\.\-•■#]*"""
CAP_TOK = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-’\.\"\^\*\|]*[,\.]?[,\.]?$")
INITIAL = re.compile(r"^" + LEAD + r"[A-Z0][\'`]?[\.,]{0,2}$")
SUFFIX = re.compile(r"^" + LEAD + r"(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d))[\.,']*$")
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
        return bool(re.search(r'\d', s)) and len(s) <= 8
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


def tokenize_section(text, pm, leaf_a, leaf_b):
    """content tokens of leaves leaf_a .. leaf_b-1 (absolute offsets), the section headings and the furniture lines.
    Returns (toks, heads, furn): heads = [(offset of the heading line, code, damaged, leaf, line text)], furn = [(leaf, offset, text)]"""
    toks, heads, furn = [], [], []
    for leaf in range(leaf_a, leaf_b):
        a, b = pm.span(leaf)
        pos = a
        for line in text[a:b].split('\n'):
            lstart = pos
            pos += len(line) + 1
            if not line.strip():
                continue
            h = classify_heading(line)
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
    c = w.rstrip('"\'`)]’')
    if not c or part_of_name(c):
        return False
    return c[-1] in '.;)' or c[-1].isdigit()


PREFIX_WORDS = PARTICLE | {'Mac', 'Mc', 'St.', 'Ste.', 'Mt.', 'Ft.', 'Fitz', 'Saint'}
PREFIX_O = re.compile(r"^[\"'`\u2018\u2019]?O['`\u2019\u2018]$")


def is_comma_tok(w):
    c = w.rstrip('"\'`)]\u2019')
    return c.endswith(',') and len(strip_marks(c)) >= 1


def _region(pieces, d1, lower):
    """the maximal run of name-like pieces that ends before the first dash d1 and starts after a piece that ends the entry above"""
    k = d1 - 1
    start = d1
    base = max(lower, d1 - 9)
    while k >= base:
        pc = pieces[k]
        w = pc.w
        if pc.dash:
            break
        if not name_like(w):
            if not (k == d1 - 1 and strip_marks(w) != '' and not ends_entry(w)):     # a damaged last name token is still the name's last token
                break
        elif ends_entry(w):
            break
        start = k
        k -= 1
    return start


def _given_ok(words):
    """tokens after the surname comma: given names and initials, at most one comma token (the one before a suffix), an optional suffix last"""
    if not words or len(words) > 6:
        return False
    for i, w in enumerate(words):
        last = i == len(words) - 1
        if SUFFIX.match(w):
            if not last:
                return False
            continue
        if INITIAL.match(w) or CAP_TOK.match(w):
            if is_comma_tok(w) and not (i == len(words) - 2 and SUFFIX.match(words[-1])):
                return False
            continue
        return False
    return True


def scan_name_start(pieces, d1, lower, style='comma'):
    """index of the first name piece of the head whose first dash is piece d1.  style 'comma': Surname, Given [Suffix] (the company lists); style 'given':
    Given [Middle] Surname (field and staff, non-commissioned staff).  Returns (start, kind): kind 'ok' or the reason the cut is unusual."""
    a = _region(pieces, d1, lower)
    words = [pieces[k].w for k in range(a, d1)]
    if style == 'comma':
        cands = [i for i, w in enumerate(words) if is_comma_tok(w)]
        for ci in cands:                                     # the earliest valid surname comma
            if _given_ok(words[ci + 1:]) or (ci == len(words) - 1):
                b = ci
                nb = 0
                while b > 0 and nb < 2 and (words[b - 1] in PREFIX_WORDS or PREFIX_O.match(words[b - 1])):
                    b -= 1
                    nb += 1
                return a + b, 'ok'
        if cands:
            return a + cands[-1], 'comma-given-invalid'
        return d1 - min(len(words), 3), 'no-comma'
    # given-first: at most 5 tokens, never beginning with a non-name token
    if len(words) > 5:
        return d1 - 4, 'long-region'
    return a, 'ok'


COMMA_END = re.compile(r"[,]\W*$|,[\.\"']?$")


def comma_index(words):
    """index of the surname token (the first token that ends with a comma) of a name, or -1"""
    for i, w in enumerate(words):
        if re.search(r"[A-Za-z][\.\"'`]?,[\.\"']?$", w) or w.endswith(',') or w.endswith('.,'):
            return i
    return -1


# --------------------------------------------------------------------------- entries
class Entry(object):
    __slots__ = ('n0', 'n1', 'd1', 'rk0', 'rk1', 'd2', 'res', 'kind', 'flags', 'end_piece', 'kind2', 'code', 'style')

    def __init__(self, n0, n1, d1, rk0, rk1, d2, res, kind):
        self.n0, self.n1, self.d1, self.rk0, self.rk1, self.d2, self.res, self.kind = n0, n1, d1, rk0, rk1, d2, res, kind
        self.flags = set()
        self.end_piece = None


def find_entries(pieces, loose=True):
    """Every head  NAME DASH RANK DASH Res.  Tier 1: the first dash, 1 to 5 rank tokens, the second dash, an exact 'Res' token.  Tier 2: the Res token is a
    damaged form (Kes. Ees. Rcs. ...) directly after the second dash.  Returns entries in text order (n0 filled later by the caller)."""
    ents = []
    n = len(pieces)
    for r in range(3, n):
        w = pieces[r].w
        if pieces[r].dash:
            continue
        exact = bool(RES_EXACT.match(w))
        if not exact and not (loose and RES_LOOSE.match(w)):
            continue
        if not pieces[r - 1].dash:
            continue
        d2 = r - 1
        d1 = None
        for k in range(d2 - 2, max(d2 - 7, -1), -1):               # the rank has 1 to 5 tokens
            if pieces[k].dash:
                d1 = k
                break
        if d1 is None:
            continue
        # the rank may not contain a Res-like or sentence-like token
        ranks = [pieces[j].w for j in range(d1 + 1, d2)]
        if any(x.endswith(';') for x in ranks):
            continue
        if not exact:
            # a damaged Res is accepted only after a printed rank word
            if not ranks:
                continue
        ents.append(Entry(None, d1, d1, d1 + 1, d2, d2, r, 'reg' if exact else 'res-damaged'))
    return ents
