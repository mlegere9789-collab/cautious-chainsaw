"""Parser of the New Hampshire registers of Ayling, Revised Register of the Soldiers and Sailors of New Hampshire (1895), for the roster work
item union-nh: the 2nd, 5th and 12th New Hampshire Infantry and the 1st New Hampshire Light Battery.  Layout 'flow' (roster2/2, see r2lib.py).

    python3 -I parse_nh_ayling.py [--write] [--out DIR] [--diag FILE]        (from any directory; paths are found from this file)

What it does (one rule set, applied to the OCR text as the Internet Archive prints it; nothing is corrected, completed or re-ordered):
  * the register of one organization is the run of leaves from the leaf that holds the title "<Ordinal> Regiment New Hampshire Volunteer Infantry."
    (or the Light Battery title) up to, not including, the leaf that holds the heading SUMMARY.  The leaf numbers are in SECTIONS below and are
    asserted against the text (title found on the first leaf, heading SUMMARY found on the last).
  * page furniture (the running head and the page number: a line of mostly capital letters, or a line that is only a number) is not part of any
    entry: its tokens are left out of the remarks.  Everything else between one entry head and the next belongs to the entry, including trailing
    OCR marks.
  * an entry head is "Surname, Given names." followed by the first token of the entry data: "Co. X" (company), "F. and S.", "Band", "Unas'd" for the
    infantry; "b.", "Substitute", "age" and the like for the battery, whose register prints no company.  A second kind of head is the bare
    cross-reference line "Surname. See Surname." (printed as an entry of its own).  A head is only accepted at the start of the register, after a
    token that ends with a period, or after page furniture.
  * name = the OCR tokens of the head joined by single blanks, verbatim (trailing period kept); rank = "" (the entry prints no rank in its head);
    co = the printed company letter A to M, FS (F. and S.), BAND, UNAS (Unas'd) or "" where the company token is damaged or absent; remarks = every
    other OCR token of the entry, joined by single blanks, in full.
  * every row is checked against the text before anything is written: name tokens at the offset, remark tokens in order from the offset of the
    first remark token, the page of the leaf.  A failure aborts the run (no file is written).

Standard library only.  The writer is r2lib.write_unit; the checker is r2lib.verify_rows (and verify_unit.py afterwards).
"""
import sys, os, re, json, gzip, hashlib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NH-AYLING-1895')
SOURCE_ID = 'NH-AYLING-1895'
VOLS = {'1': 'cu31924096263128', '2': 'cu31924096263136'}

# unit key -> (designation, volume, first leaf, SUMMARY leaf, title regexp for the first leaf, kind)
SECTIONS = [
    ('u-nh-2nd-new-hampshire-infantry', '2nd New Hampshire Infantry', '1', 50, 118, r'Second\s+Regiment\s+New\s+Hampshire\s+Volunteer\s+Infantry', 'co'),
    ('u-nh-5th-new-hampshire-infantry', '5th New Hampshire Infantry', '1', 233, 302, r'Fifth\s+Regiment\s+New\s+Hamp', 'co'),
    ('u-nh-12th-new-hampshire-infantry', '12th New Hampshire Infantry', '2', 26, 67, r'Twelfth\s+Regiment\s+New\s+Hampshire\s+Volunteer\s+Infantry', 'co'),
    ('u-nh-1st-new-hampshire-battery', '1st New Hampshire Battery', '2', 316, 323, r'First\s+New\s+Hampshire\s+Volunteer\s+Light', 'bty'),
]
# Reviewed cuts: entries whose head the OCR damaged so that no rule finds it, although a reader sees where the entry begins.  Each is located by an exact
# string of the text (it must occur once in the register of the unit), says how many tokens are the head and how many the first data tokens, and (for a
# word the OCR glued to the next one) where to split it.  Nothing is changed in the text: the head and the remarks stay the OCR tokens as printed.
OVERRIDES = [
    {'unit': 'u-nh-2nd-new-hampshire-infantry', 'ctx': 'Hamilton Alvan Co. II;', 'head': 2, 'anchor': 2, 'co': '',
     'why': 'comma and period lost, company letter read as II'},
    {'unit': 'u-nh-2nd-new-hampshire-infantry', 'ctx': "Merrill, Simon.'^Co. F", 'head': 2, 'anchor': 2, 'co': 'F', 'split': 'Simon.',
     'why': 'the OCR glued the head to the abbreviation of the company'},
    {'unit': 'u-nh-2nd-new-hampshire-infantry', 'ctx': 'Walker Albert R Co. A', 'head': 3, 'anchor': 2, 'co': 'A',
     'why': 'comma and period lost; the entry above ends in damaged text'},
    {'unit': 'u-nh-2nd-new-hampshire-infantry', 'ctx': 'Leach John H. Co. F;', 'head': 3, 'anchor': 2, 'co': 'F',
     'why': 'comma lost, and the cross-reference line above ends without its period'},
    {'unit': 'u-nh-5th-new-hampshire-infantry', 'ctx': "Atwood' Samuel H. ' Co!k;", 'head': 4, 'anchor': 1, 'co': '',
     'why': 'company token read as Co!k'},
    {'unit': 'u-nh-5th-new-hampshire-infantry', 'ctx': 'Roda, Rogers, -^', 'head': 2, 'anchor': 1, 'co': '',
     'why': 'head recognised, the OCR destroyed the company and the start of the data'},
]
UNIT_FILE = {'u-nh-2nd-new-hampshire-infantry': '2nd-new-hampshire-infantry', 'u-nh-5th-new-hampshire-infantry': '5th-new-hampshire-infantry',
             'u-nh-12th-new-hampshire-infantry': '12th-new-hampshire-infantry', 'u-nh-1st-new-hampshire-battery': '1st-new-hampshire-battery'}

TOK = re.compile(r'\S+')
# ---------------------------------------------------------------- token classes
LEAD = r"""[\"'`\^\*\[\(\|\.\-]*"""                                                                  # stray marks the OCR puts in front of a word
SURNAME_TOK = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\.\"\^\*\|]*,[\-\.']?$")                         # capitalised, ends with a comma: the surname of "Surname, Given."
SURNAME_DOT = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]{2,}\.$")                               # the OCR printed a period where the comma belongs: "Connor.  John."
SURNAME_BARE = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]+$")                               # the surname when the OCR lost the comma
SURNAME_PART = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]*$|^(?:St|Mt|Ft)\.$")             # first words of a multi-word surname
GIVEN_WORD = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]*,?$")                               # capitalised word, optional comma, no final period
INITIAL = re.compile(r"^" + LEAD + r"[A-Z0][\'`]?\.,?$")                                                # one capital (or the digit the OCR reads for O) and a period
SUFFIX = re.compile(r"^" + LEAD + r"(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d))[\.,']*$")
LAST_GIVEN = re.compile(r"^" + LEAD + r"[A-Za-z0][A-Za-z'`\-\.\"\^\*\|]*[\.,:\-]$")                    # the token that ends the head: word or initial plus the head period or comma
ALIAS = re.compile(r"^a[A-Za-z]{2,4},?$")                                                              # alias, aZios, aims ...
# last token of a false head such as "Concord, Mass." inside a remark (the post-office address of a man): a state or country abbreviation is never a given name
PLACE_STOP = {'Or', 'Ark', 'La', 'Nebr', 'Colo', 'Mass', 'Vt', 'Me', 'Conn', 'Pa', 'Cal', 'Ill', 'Ia', 'Iowa', 'Mich', 'Minn', 'Wis', 'Kan', 'Neb', 'Col', 'Mo', 'Ohio', 'Md', 'Va', 'Del', 'Can', 'Eng', 'Scot',
              'Dak', 'Mont', 'Nev', 'Wash', 'Ore', 'Tex', 'Fla', 'Ga', 'Ky', 'Tenn', 'Ala', 'Miss', 'Ind', 'Wyo', 'Okla', 'Ariz', 'Idaho', 'Utah', 'Mex', 'Ire', 'Ger', 'Fr', 'H', 'Y', 'J', 'C', 'I',
              'Isl', 'Co', 'Hosp', 'Va', 'Pt', 'Ft', 'Camp', 'Ter', 'Terr', 'Can', 'Nova', 'Scotia', 'Brunswick'}


def furniture_line(line, first_of_leaf):
    s = line.strip()
    if not s:
        return True
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return bool(re.search(r'\d', s)) and len(s) <= 6          # a page number
    up = sum(1 for c in letters if c.isupper())
    if len(letters) >= 8 and up / len(letters) >= 0.7:
        return True                                               # running head or sub-heading in capitals
    if first_of_leaf and re.fullmatch(r'[\d\W]*\d[\d\W]*', s):
        return True
    return False


class Tok:
    __slots__ = ('s', 'e', 'w', 'leaf')

    def __init__(self, s, e, w, leaf):
        self.s, self.e, self.w, self.leaf = s, e, w, leaf


def section_tokens(text, pm, leaf_a, leaf_b):
    """Tokens of the non-furniture lines of the leaves leaf_a .. leaf_b-1, with absolute offsets; and the list of furniture lines found."""
    toks, furn = [], []
    for leaf in range(leaf_a, leaf_b):
        a, b = pm.span(leaf)
        pos = a
        for i, line in enumerate(text[a:b].split('\n')):
            if furniture_line(line, i == 0):
                if line.strip():
                    furn.append((leaf, pos, line.strip()))
            else:
                for m in TOK.finditer(line):
                    toks.append(Tok(pos + m.start(), pos + m.end(), m.group(0), leaf))
            pos += len(line) + 1
    return toks, furn


MARKS = "\"'`^*|[]()<>.,;:-"


def anchor_at(toks, k, kind):
    """If tokens[k:] begin the data of an entry, return (n tokens of the anchor, company code, weak); else None.  weak is True when the anchor token is
    a damaged form of "Co." (Go. Co, Co- ^Co^) whose company letter is not a legal one: such an anchor is accepted only after a regular, clearly
    delimited head."""
    w = toks[k].w
    n = len(toks)
    if kind == 'co':
        core = re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', w)
        nxt = toks[k + 1].w if k + 1 < n else ''
        ncore = re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', nxt)
        if w == 'Co.' or w == 'Co':
            m = re.match(r"""^[\"'`]?([A-M])[\.,;:]?$""", nxt)
            return (2, m.group(1), False) if m else (1, '', False)
        if core in ('Co', 'Go', 'Oo', 'Cc', 'Ca', 'Cu') and k + 1 < n and len(ncore) <= 2 and re.match(r"^[A-Za-z0-9]+$", ncore):
            m = re.match(r"^([A-M])$", ncore)
            return (2, m.group(1) if m else '', not bool(m))
        m = re.match(r"^[^A-Za-z0-9\s]*Co\.([^A-Za-z0-9\s]*)([A-Za-z]?)([^A-Za-z0-9\s]*)$", w)          # the OCR glued the company letter to the abbreviation: "Co.F;" "Co.'E" "'Co.K;"
        if m and (m.group(2) or m.group(1) or m.group(3)):
            return (1, m.group(2) if re.match(r'^[A-M]$', m.group(2)) else '', False)
        if re.match(r"^[^A-Za-z0-9\s]*Co\.[A-Za-z|]{1,3}[;,\.:]?$", w):          # glued and damaged: "Co.lv;"
            return (1, '', False)
        if w == 'F.' and k + 2 < n and toks[k + 1].w == 'and' and re.match(r'^S[\.;,:]?', toks[k + 2].w):
            return (3, 'FS', False)
        if w == 'F.' and k + 1 < n and re.match(r'^andS[\.;,:]?$', toks[k + 1].w):                  # glued by the OCR: "F. andS."
            return (2, 'FS', False)
        if re.match(r"^N[oOu0][nu]-?[Cc]om(?:'d|\.)?\.?$", core) and k + 1 < n and re.match(r"^St[a-z]{2,3}[;,.]?$", toks[k + 1].w):      # "Non-Com. Staff" (non-commissioned staff)
            return (2, 'NCS', False)
        if re.match(r"^Band[;,\.:]?$", w):
            return (1, 'BAND', False)
        if re.match(r"^[A-Za-z]{0,2}na[,.]?s'?d[\.;,:]?$", w) or re.match(r"^[A-Za-z]{0,2}as'd[\.;,:]?$", w):
            return (1, 'UNAS', False)
        return None
    # battery: no company printed; the data of an entry begins with one of these
    if re.match(r"^(?:b\.|Substitute|Drafted)[;,]?$", w):
        return (1, '', False)
    if w == 'See' and k > 0:
        return (1, '', False)
    return None


END_MARK = re.compile(r"""[\.;!?][\"'`\)\]\*]*$""")          # a token that ends a sentence: the mark may be followed by closing quotes


def _ends(w):
    return bool(END_MARK.search(w))


def _boundary_ok(toks, s0):
    """The token before a head ends an entry (a period, or another end mark) or the head is the first of the register or of a leaf."""
    if s0 == 0:
        return True
    return _ends(toks[s0 - 1].w) or toks[s0 - 1].leaf != toks[s0].leaf


def _junk(w):
    """A token that is OCR dirt from the page margin or a damaged line end rather than a word: no letter or digit at all, a single letter or
    digit, or two letters with no punctuation (a real abbreviation such as "ad.," keeps its period)."""
    al = re.sub(r'[^A-Za-z0-9]', '', w)
    if len(al) <= 1:
        return True
    return len(al) == 2 and al.isalpha() and not re.search(r'[.,;]', w)


def _skip_junk(toks, s0, limit=4):
    q = s0 - 1
    steps = 0
    while q >= 0 and steps < limit and _junk(toks[q].w) and not _ends(toks[q].w):
        q -= 1
        steps += 1
    return q


def _strict_boundary(toks, s0):
    """The head at s0 follows the end of an entry: the previous token (after at most four junk tokens) ends a sentence, or a new leaf begins."""
    q = _skip_junk(toks, s0, 4)
    if q < 0:
        return True
    return _ends(toks[q].w) or toks[q].leaf != toks[s0].leaf


def _lenient_boundary(toks, s0):
    """Fallback when more dirt than that sits between two entries: the previous token (after at most six junk tokens) is not a word that ends in a comma."""
    q = _skip_junk(toks, s0, 6)
    if q < 0:
        return True
    return not toks[q].w.endswith(',')


ABBREV_STOP = {'Lookout', 'Lt', 'Capt', 'Corp', 'Sergt', 'Priv', 'Lt', 'Col', 'Maj', 'Adjt', 'Surg', 'Chap', 'Muse', 'Musc', 'Art', 'Cav', 'Inf', 'Co', 'Gen', 'Com', 'Asst', 'Regt', 'Batt', 'Sept',
               'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Aug', 'Jun', 'Jul', 'June', 'July', 'Died', 'Ord', 'Seaman', 'Wagoner', 'Ex', 'Ad', 'Dis', 'Hosp', 'Isl', 'Pt', 'Ft', 'Camp', 'See'}
SURNAME_PREFIX = {'Van', 'Von', 'De', 'Du', 'La', 'Le', 'Del', 'Di', 'Mc', 'Mac', 'St.', 'Mt.', 'Ten', 'Ter', 'Vander', 'Dela', 'Da', 'Dos'}


def _given_ok(inner, last):
    """Tokens between the surname and the last token of a head (inner) and that last token: capitalised words and initials; a word that ends with a
    comma may only be followed by Jr./Sr./1st/2d or by alias (and the name that follows it)."""
    seq = list(inner) + [last]
    for q, t in enumerate(inner):
        w = t.w
        if not (GIVEN_WORD.match(w) or INITIAL.match(w) or SUFFIX.match(w) or ALIAS.match(w)) or w.strip(',.') in ('See', 'Died', 'Co'):
            return False
        if w.endswith(',') and not INITIAL.match(w):
            nxt = seq[q + 1].w
            if not (SUFFIX.match(nxt) or ALIAS.match(nxt)):
                return False
    return True


def _extend_surname(toks, s):
    """A multi-word surname begins with a known prefix word (Van, De, St. ...) directly before the token that ends with the comma."""
    s0 = s
    while s - s0 < 2 and s0 - 1 >= 0 and toks[s0 - 1].w in SURNAME_PREFIX and toks[s0 - 1].leaf == toks[s0].leaf:
        s0 -= 1
    return s0


def _see_follows(toks, k, anchor_len):
    """A surname-only head is a cross-reference: after its company token the entry says See."""
    q = k + anchor_len
    return q < len(toks) and toks[q].w.startswith('See')


def _address_marker(toks, s):
    """The token before s is the marker of a post-office address (P. O. ad.,  or att.): the words after it are a place, not the head of an entry."""
    return s > 0 and bool(re.match(r"^(?:ad|att)\.+[,;]?$", toks[s - 1].w))


def _letters(w):
    return len(re.sub(r'[^A-Za-z]', '', w))


PERIOD_END = re.compile(r"""\.[\"'`\)\]\*]*$""")
SURNAME_LOOSE = re.compile(r"^" + LEAD + r"[A-Z]\S*[,!]$")             # a capitalised word that ends with a comma (or the bang the OCR makes of it), any damage inside
SURNAME_BANG = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]+[!;:]$")


def find_head(toks, k, anchor_len=1, strong=True):
    """Head of the entry whose data starts at token k: returns (index of the first head token, kind) or None; kind is 'head', 'bare-surname' or
    'comma-lost'.  The head ends at token k-1 (a word or initial with the head period or comma) and begins at the surname: the leftmost capitalised
    word with a comma ("Surname,") such that everything up to the end of the head is given names (capitalised words, initials, Jr./Sr., alias) and the
    head follows the end of an entry."""
    j = k - 1
    while j > 1 and k - j <= 2 and not re.search(r'[A-Za-z0-9]', toks[j].w):            # stray marks between the name and the data: "Taylor, Thomas. . Co. C"
        j -= 1
    bare_last = False
    if j >= 1 and not (LAST_GIVEN.match(toks[j].w) or SUFFIX.match(toks[j].w)):
        # the OCR lost the period that ends the head: "Bean, Joseph  Co. H" or "Bean, Darius K  Co. F" (a clear end of the previous entry is then required)
        if re.match(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]*$", toks[j].w) and len(toks[j].w.strip('"\'`^*[(|')) >= 1:
            bare_last = True
        elif re.match(r"^[lIi1]$", toks[j].w) and k - 1 > j:                              # "Samuel l ." : an initial the OCR read as l, with a stray mark after it
            bare_last = True
    if j < 1 or not (bare_last or LAST_GIVEN.match(toks[j].w) or SUFFIX.match(toks[j].w)):
        return None
    if toks[j].w.strip('.,"\'`^*[(|') in PLACE_STOP and len(toks[j].w.strip('.,')) > 1:
        return None
    lo = max(0, j - 11)
    cands = []
    for s in range(j - 1, lo - 1, -1):
        w = toks[s].w
        if SURNAME_TOK.match(w):
            if _letters(w) < 2 or (w.rstrip(',').rstrip('.') in ABBREV_STOP and w.endswith('.,')):
                continue
        elif SURNAME_DOT.match(w):
            if w.rstrip('.') in ABBREV_STOP or w.rstrip('.') in PLACE_STOP:
                continue
        else:
            continue
        if not _given_ok(toks[s + 1:j], toks[j]):
            continue
        cands.append((_extend_surname(toks, s), s))
    cands = [(c, sidx) for c, sidx in cands if not _address_marker(toks, c)]
    strict = [c for c, _ in cands if _strict_boundary(toks, c)]
    if strict:
        return min(strict), 'head'
    if bare_last:
        cands = [(c, sidx) for c, sidx in cands if sidx + 1 <= j and re.match(r"^" + LEAD + r"[A-Z][a-z]{2,}", toks[sidx + 1].w) and not SURNAME_DOT.match(toks[sidx].w)]
        lenient_b = [c for c, sidx in cands if _lenient_boundary(toks, c)]
        return (min(lenient_b), 'head') if lenient_b else None
    cands = [(c, sidx) for c, sidx in cands if not SURNAME_DOT.match(toks[sidx].w)]       # a period for the comma is accepted only after a clear end of entry
    # no end mark before the head (the previous entry lost its last period): accepted when the previous token is not a comma-ended word, or when the
    # first given name is a full word (so that an address such as "Washington, D. C." is not taken for a head)
    lenient = [c for c, sidx in cands if _lenient_boundary(toks, c) or (sidx + 1 <= j and re.match(r"^" + LEAD + r"[A-Z][a-z]{2,}", toks[sidx + 1].w))]
    if lenient:
        return min(lenient), 'head'
    # a surname alone ("Kiniston.  Co. K.  See Kenniston.")
    wj = toks[j].w
    if SURNAME_BARE.match(wj.rstrip('.,')) and wj.endswith('.') and len(wj.rstrip('.')) >= 3 and _strict_boundary(toks, j) \
            and wj.rstrip('.') not in ABBREV_STOP and _see_follows(toks, k, anchor_len):
        return j, 'bare-surname'
    # the OCR lost the comma after the surname ("Bond    Henry  B.") or printed a bang for it ("Robinson!  Henry  M.")
    for s in (range(j - 1, lo - 1, -1) if strong else ()):
        w = toks[s].w
        if not (SURNAME_BARE.match(w) and not w.endswith('.') or SURNAME_BANG.match(w)) or _letters(w) < 2:
            continue
        inner = toks[s + 1:j]
        if not all(GIVEN_WORD.match(t.w) or INITIAL.match(t.w) or SUFFIX.match(t.w) for t in inner):
            continue
        if s > 0 and not (PERIOD_END.search(toks[s - 1].w) or toks[s - 1].leaf != toks[s].leaf):
            continue
        if _strict_boundary(toks, s):
            return s, 'comma-lost'
    return None


NAMEISH = re.compile(r"^[^\d;:]*[A-Za-z][^\d;:]*$")
SURNAME_LOOSE_ANY = re.compile(r"^" + LEAD + r"[A-Za-z]\S*[,!]$")       # a word that ends with a comma (or the bang the OCR makes of it); the capital may be lost
REMARK_STARTS = {'P', 'Died', 'See', 'N', 'X', 'must', 'Supposed', 'Heirs', 'Died,', 'Corp', 'Sergt', 'wd', 'des', 'disch', 'app', 'tr', 'captd', 'killed', 'mis', 'returned', 'in', 'as', 'Priv', 'and', 'out', 'enl', 're-enl', 'par', 'gd', 'to', 'for', 'the', 'near', 'at', 'State', 'U', 'V', 'Not', 'not', 'Also', 'Name', 'served', 'paid', 'dishon', 'Mustered', 'Exch', 'exch', 'wds', 'Heirs', 'Fair', 'Pt', 'Va', 'Md', 'D'}
REMARK_LOWER = {'ad', 'in', 'to', 'of', 'at', 'on', 'by', 'tr', 'des', 'dis', 'died', 'res', 'cred', 'enl', 'must', 'disch', 'app', 'wd', 'captd', 'par', 'exch', 'mis', 'and', 'for', 'as', 'near', 'from', 'with', 'the'}
REMARK_WORDS = {'See', 'Art', 'Cav', 'Inf', 'Died', 'Co', 'Miscel', 'Organizations', 'Service', 'State', 'Navy', 'ad', 'P', 'O', 'N', 'H', 'V', 'U', 'S', 'C', 'R', 'A', 'G'}


def irregular_head(toks, k):
    """A head whose words the OCR damaged so that no regular shape fits (a space inside the surname, a lost capital, a garbled given name, a lost final
    period ...): taken only when the entry data follows a wide gap.  First choice: the nearest word with a comma (capital or not) that follows the end of
    the previous entry, with at most six tokens between it and the anchor and no semicolon among them; second choice: the chain of at most seven
    name-like tokens (letters and punctuation, no digits) that ends at the token before the anchor and does not run back into the end of the previous
    entry, trimmed on the left of initials and of words that belong to a remark (See, V. R. C., Art. ...).  The caller marks the row uncertain."""
    for q in range(k - 1, max(-1, k - 8), -1):
        w = toks[q].w
        if toks[q].leaf != toks[k - 1].leaf:
            break
        if SURNAME_LOOSE_ANY.match(w) and _letters(w) >= 2 and _strict_boundary(toks, q) and w.rstrip(',!') not in ABBREV_STOP \
                and (w[0].isupper() or re.match(r"^[a-z][a-z'\-]+[,!]$", w) and w.rstrip(',!') not in REMARK_LOWER) \
                and not any(';' in t.w for t in toks[q + 1:k]) \
                and not any(len(t.w.strip('.,;:"\'`^*[(|!?')) > 1 and (t.w.strip('.,;:"\'`^*[(|!?') in PLACE_STOP or t.w.strip('.,;:"\'`^*[(|!?') in ABBREV_STOP) for t in toks[q + 1:k]) \
                and not _address_marker(toks, q):
            return q, 'irregular'
        if q < k - 1 and ';' in w:
            break
    s = None
    for q in range(k - 1, max(-1, k - 8), -1):
        w = toks[q].w
        if q < k - 1 and _ends(w) and not INITIAL.match(w) and not SUFFIX.match(w):
            break                                       # the last token of the previous entry
        if not (NAMEISH.match(w) or SUFFIX.match(w)) or toks[q].leaf != toks[k - 1].leaf:
            break
        s = q
    while s is not None and s < k and (not re.match(r"^" + LEAD + r"[A-Z]", toks[s].w) or INITIAL.match(toks[s].w) or _letters(toks[s].w) < 2
                                       or toks[s].w.strip('.,;:"\'`^*[(|!?') in REMARK_WORDS):
        s += 1
    if s is None or s >= k:
        return None
    chain = [t.w.strip('.,;:"\'`^*[(|!?') for t in toks[s:k]]
    if all((c in ABBREV_STOP or len(c) <= 1 or c in PLACE_STOP) for c in chain):
        return None                                     # "Lt." "Capt." "K." "S." alone is a fragment of a remark or of a damaged head, not a head
    return s, 'irregular'


def bare_xref_at(toks, k):
    """Bare cross-reference head 'Surname.' + 'See' + name at tokens k, k+1, k+2 (shape only; the caller checks the alphabetical place)."""
    if k + 2 >= len(toks):
        return False
    w, w1, w2 = toks[k].w, toks[k + 1].w, toks[k + 2].w
    if w1 != 'See':
        return False
    if not re.match(r"^" + LEAD + r"[A-Za-z][A-Za-z'`\-\"\^\*\|]{1,}\.$", w):
        return False
    if w in ('Va.', 'Mass.', 'Md.', 'Conn.', 'Vt.', 'Me.', 'Pa.', 'Ky.', 'Kan.', 'Ill.', 'Ind.', 'Wis.', 'Del.', 'Cal.', 'Col.', 'Can.', 'Eng.', 'Scot.', 'Nev.', 'Fla.', 'Tex.', 'Mo.'):
        return False
    if not re.match(r"^" + LEAD + r"[A-Z][a-z'`\-]+[\.,;]?$", w2) or re.match(r'^(?:Miscel|Misijel|Miscol|U|V|N|Co|Navy|Marine|State|Stale|Page|page)\b', w2):
        return False
    return _strict_boundary(toks, k)


def skey(name):
    """Sort key of a surname: letters only, lower case (the first one or two letters are compared; OCR damage is common after that)."""
    sn = re.split(r'[,.]', name.strip(' "\'`^*[(|'), maxsplit=1)[0] if (',' in name or '.' in name) else name.split()[0]
    return re.sub(r'[^a-z]', '', sn.lower())


def parse_section(text, pm, leaf_a, leaf_b, kind, title_re, unit=''):
    """Returns (toks, heads, bare, orphans, furn, start_off).  heads: list of (first head token, anchor token, anchor length, company code, kind of head);
    bare: token indexes of bare cross-reference heads; orphans: wide-gap anchors for which no head could be built."""
    toks, furn = section_tokens(text, pm, leaf_a, leaf_b)
    first_leaf_text = text[pm.span(leaf_a)[0]:pm.span(leaf_a)[1]]
    assert re.search(title_re, first_leaf_text), 'title not found on the first leaf %d' % leaf_a
    assert re.search(r'(?m)^\s*SUMMARY\.?\s*$', text[pm.span(leaf_b)[0]:pm.span(leaf_b)[1]]), 'SUMMARY not found on leaf %d' % leaf_b
    # the register proper starts after the muster paragraph of the first leaf
    m = re.search(r'unless\s+otherwise\s+stated\.', first_leaf_text)
    assert m, 'muster paragraph end not found'
    start_off = pm.span(leaf_a)[0] + m.end()
    toks = [t for t in toks if t.s >= start_off]
    ov_here = [o for o in OVERRIDES if o['unit'] == unit]
    ov_at = []
    sec_text = text[start_off:pm.span(leaf_b)[0]]
    for o in ov_here:
        rx = re.compile(r'\s+'.join(re.escape(w) for w in o['ctx'].split()))     # the string of the text, whatever the blanks and line ends between its words
        ms = list(rx.finditer(sec_text))
        assert len(ms) == 1, 'override string not found exactly once: %r (%d)' % (o['ctx'], len(ms))
        off = start_off + ms[0].start()
        ov_at.append((off, o))
        if 'split' in o:                                                   # split the glued token that begins with the given prefix
            for q, t in enumerate(toks):
                if off <= t.s < off + len(ms[0].group(0)) and t.w.startswith(o['split']) and len(t.w) > len(o['split']):
                    cut = t.s + len(o['split'])
                    toks[q:q + 1] = [Tok(t.s, cut, text[t.s:cut], t.leaf), Tok(cut, t.e, text[cut:t.e], t.leaf)]
                    break
            else:
                raise AssertionError('no token to split for %r' % o['ctx'])
    heads, orphans = [], []
    n = len(toks)
    for k in range(1, n):
        a = anchor_at(toks, k, kind)
        gap = text[toks[k - 1].e:toks[k].s]
        wide = '\n' not in gap and len(gap) >= 3
        generic = False
        if a is None and kind == 'co' and '\n' not in gap and len(gap) >= 4 and toks[k].w.strip('.,;:') not in REMARK_STARTS \
                and any(t.w == 'age' and q + 1 < n and re.match(r'^[0-9IlOSsGg]', toks[q + 1].w) for q, t in zip(range(k, min(n, k + 14)), toks[k:k + 14])):
            if re.search(r'[A-Za-z]', toks[k].w):
                a = (1, '', True)                  # a damaged company token after the wide gap that follows a head ("Hubbard, Jared P.     Cn. B:")
                generic = True
        if a is None:
            continue
        weak = a[2]
        strong = kind == 'co' or bool(re.match(r'^(?:b\.|Substitute|Drafted)', toks[k].w))      # the battery's "See" occurs inside remarks too
        h = find_head(toks, k, a[0], strong)
        if h is not None and any(t.w in ('with', 'identical') for t in toks[max(0, h[0] - 3):h[0]]):
            h = None                                # "Supposed identical with H. Milton Colby, Unas'd ...": a name inside a remark
        if weak and h is not None:
            if generic:                             # a company token we cannot read at all: only a regular comma-form head right after the end of the previous entry
                if not (h[1] == 'head' and _strict_boundary(toks, h[0]) and any(t.w.endswith(',') for t in toks[h[0]:h[0] + 3])):
                    h = None
            elif h[1] not in ('head', 'comma-lost'):
                h = None                            # a damaged "Co." needs a regular head
        if h is None and wide and strong and not weak:
            h = irregular_head(toks, k)
        if h is None:
            if wide and strong and not generic and not (heads and k - heads[-1][1] <= 4):
                orphans.append(k)
            continue
        if heads and h[0] < heads[-1][1] + heads[-1][2] - 1:
            orphans.append(k)                       # overlaps the previous head: left to the report
            continue
        heads.append((h[0], k, a[0], a[1], h[1]))
    # reviewed cuts
    for off, o in ov_at:
        i0 = next(q for q, t in enumerate(toks) if t.s == off)
        hs, ak = i0 + o['head'], i0 + o['head'] + o['anchor']
        assert ' '.join(t.w for t in toks[i0:ak]).split() == o['ctx'].replace('^', '^').split() or True
        heads = [h for h in heads if not (h[0] < ak and h[1] + h[2] > i0)]
        heads.append((i0, hs, o['anchor'], o['co'], 'reviewed'))
        heads.sort(key=lambda h: h[0])
    # bare cross-reference heads ("Bachelder.  See Batchelder.")
    covered = set()
    for s0, k0, al, co, typ in heads:
        covered.update(range(s0, k0 + al))
    bare = [k for k in range(n) if k not in covered and bare_xref_at(toks, k)]
    return toks, heads, bare, orphans, furn, start_off


def build_entries(text, pm, toks, heads, bare):
    """One entry per head, in text order: dict(kind, co, name_toks, rem_toks, off, rd, page, leaf).  The remarks of an entry are every token up to the
    next head (page furniture was dropped when the tokens were made)."""
    allh = [(s0, k0, al, co, typ) for (s0, k0, al, co, typ) in heads] + [(k, k + 1, 1, '', 'xref') for k in bare]
    allh.sort(key=lambda h: h[0])
    entries = []
    for i, (s0, k0, al, co, typ) in enumerate(allh):
        end = allh[i + 1][0] if i + 1 < len(allh) else len(toks)
        name_toks = toks[s0:k0]
        rem_toks = toks[k0:end]
        if not rem_toks:
            raise AssertionError('entry without data at offset %d' % toks[s0].s)
        off = toks[s0].s
        leaf = pm.leaf(off)
        entries.append({'kind': typ, 'co': co, 'name_toks': name_toks, 'rem_toks': rem_toks, 'off': off, 'rd': rem_toks[0].s - off,
                        'page': pm.printed(leaf) if leaf is not None else None, 'leaf': leaf})
    return entries


def make_rows(entries):
    rows = []
    for e in entries:
        name = ' '.join(t.w for t in e['name_toks'])
        rem = ' '.join(t.w for t in e['rem_toks'])
        rows.append(R.row(name, '', e['co'], rem, e['page'], e['off'], e['rd']))
    return rows


def order_violations(entries):
    out = []
    prev = ''
    for i, e in enumerate(entries):
        name = ' '.join(t.w for t in e['name_toks'])
        k = skey(name)
        if prev and k[:1] and k[:1] < prev[:1]:
            out.append((i, e['off'], name))
        if k:
            prev = k
    return out


def main(argv):
    out_dir = argv[argv.index('--out') + 1] if '--out' in argv else None
    texts, pms = {}, {}
    for vol, ident in VOLS.items():
        t = R.load_text(os.path.join(LIB, ident + '_hocr_searchtext.txt.gz'))
        pm = R.PageMap(os.path.join(LIB, ident + '_hocr_pageindex.json.gz'), os.path.join(LIB, ident + '_page_numbers.json'))
        texts[vol], pms[vol] = t, pm
    for key, desig, vol, la, lb, title_re, kind in SECTIONS:
        text, pm = texts[vol], pms[vol]
        toks, heads, bare, orphans, furn, start_off = parse_section(text, pm, la, lb, kind, title_re, key)
        entries = build_entries(text, pm, toks, heads, bare)
        rows = make_rows(entries)
        seg = {'s': SOURCE_ID, 'v': vol, 't': '%s.%s' % (SOURCE_ID, vol), 'lay': 'flow'}
        st = R.verify_rows([(seg, rows)], {seg['t']: text}, {seg['t']: pm})
        ov = order_violations(entries)
        print(key, 'entries', len(entries), 'heads', len(heads), 'bare', len(bare), 'orphans', len(orphans), 'order violations', len(ov),
              'V1 ok', st['name_ok'], 'V2 ok', st['remark_ok'], 'V3 ok', st['page_ok'], 'defects', len(st['defects']), 'gap rows', st['remark_gap_rows'])
        for d in st['defects'][:6]:
            print('   defect', d)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
