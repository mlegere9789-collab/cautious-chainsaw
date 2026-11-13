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
PLACE_STOP = {'Mass', 'Vt', 'Me', 'Conn', 'Pa', 'Cal', 'Ill', 'Ia', 'Iowa', 'Mich', 'Minn', 'Wis', 'Kan', 'Neb', 'Col', 'Mo', 'Ohio', 'Md', 'Va', 'Del', 'Can', 'Eng', 'Scot',
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


def anchor_at(toks, k, kind):
    """If tokens[k:] begin the data of an entry, return (n tokens of the anchor, company code); else None."""
    w = toks[k].w
    n = len(toks)
    if kind == 'co':
        if w == 'Co.' or w == 'Co':
            nxt = toks[k + 1].w if k + 1 < n else ''
            m = re.match(r"""^[\"'`]?([A-M])[\.,;:]?$""", nxt)
            return (2, m.group(1)) if m else (1, '')
        m = re.match(r"^Co\.([^A-Za-z0-9\s]*)([A-Za-z]?)([^A-Za-z0-9\s]*)$", w)          # the OCR glued the company letter to the abbreviation: "Co.F;" "Co.'E"
        if m and (m.group(2) or m.group(1) or m.group(3)):
            return (1, m.group(2) if re.match(r'^[A-M]$', m.group(2)) else '')
        if re.match(r"^Co\.[A-Za-z|]{1,3}[;,\.:]?$", w):          # glued and damaged: "Co.lv;"
            return (1, '')
        if w == 'F.' and k + 2 < n and toks[k + 1].w == 'and' and re.match(r'^S[\.;,:]?', toks[k + 2].w):
            return (3, 'FS')
        if re.match(r"^Band[;,\.:]?$", w):
            return (1, 'BAND')
        if re.match(r"^[A-Za-z]{0,2}nas'?d[\.;,:]?$", w) or re.match(r"^[A-Za-z]{0,2}as'd[\.;,:]?$", w):
            return (1, 'UNAS')
        return None
    # battery: no company printed; the data of an entry begins with one of these
    if re.match(r"^(?:b\.|Substitute|Drafted)[;,]?$", w):
        return (1, '')
    if w == 'See' and k > 0:
        return (1, '')
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


ABBREV_STOP = {'Capt', 'Corp', 'Sergt', 'Priv', 'Lt', 'Col', 'Maj', 'Adjt', 'Surg', 'Chap', 'Muse', 'Musc', 'Art', 'Cav', 'Inf', 'Co', 'Gen', 'Com', 'Asst', 'Regt', 'Batt', 'Sept',
               'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Aug', 'Jun', 'Jul', 'June', 'July', 'Died', 'Ord', 'Seaman', 'Wagoner', 'Ex', 'Ad', 'Dis', 'Hosp', 'Isl', 'Pt', 'Ft', 'Camp', 'See'}
SURNAME_PREFIX = {'Van', 'Von', 'De', 'Du', 'La', 'Le', 'Del', 'Di', 'Mc', 'Mac', 'St.', 'Mt.', 'Ten', 'Ter', 'Vander', 'Dela', 'Da', 'Dos'}


def _given_ok(inner, last):
    """Tokens between the surname and the last token of a head (inner) and that last token: capitalised words and initials; a word that ends with a
    comma may only be followed by Jr./Sr./1st/2d or by alias (and the name that follows it)."""
    seq = list(inner) + [last]
    for q, t in enumerate(inner):
        w = t.w
        if not (GIVEN_WORD.match(w) or INITIAL.match(w) or SUFFIX.match(w) or ALIAS.match(w)):
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


def find_head(toks, k, anchor_len=1, strong=True):
    """Head of the entry whose data starts at token k: returns (index of the first head token, kind) or None; kind is 'head', 'bare-surname' or
    'comma-lost'.  The head ends at token k-1 (a word or initial with the head period or comma) and begins at the surname: the leftmost capitalised
    word with a comma ("Surname,") such that everything up to the end of the head is given names (capitalised words, initials, Jr./Sr., alias) and the
    head follows the end of an entry."""
    j = k - 1
    if j < 1 or not (LAST_GIVEN.match(toks[j].w) or SUFFIX.match(toks[j].w)):
        return None
    if toks[j].w.strip('.,"\'`^*[(|') in PLACE_STOP and len(toks[j].w.strip('.,')) > 1:
        return None
    lo = max(0, j - 11)
    cands = []
    for s in range(j - 1, lo - 1, -1):
        w = toks[s].w
        if SURNAME_TOK.match(w):
            if w.rstrip(',').rstrip('.') in ABBREV_STOP and w.endswith('.,'):
                continue
        elif SURNAME_DOT.match(w):
            if w.rstrip('.') in ABBREV_STOP or w.rstrip('.') in PLACE_STOP:
                continue
        else:
            continue
        if not _given_ok(toks[s + 1:j], toks[j]):
            continue
        cands.append((_extend_surname(toks, s), s))
    strict = [c for c, _ in cands if _strict_boundary(toks, c)]
    if strict:
        return min(strict), 'head'
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
    # the OCR lost the comma after the surname: "Bond    Henry  B."
    for s in (range(j - 1, lo - 1, -1) if strong else ()):
        if not SURNAME_BARE.match(toks[s].w) or toks[s].w.endswith('.'):
            continue
        inner = toks[s + 1:j]
        if not all(GIVEN_WORD.match(t.w) or INITIAL.match(t.w) or SUFFIX.match(t.w) for t in inner):
            continue
        if _strict_boundary(toks, s) and (s == 0 or _ends(toks[s - 1].w) or toks[s - 1].leaf != toks[s].leaf):
            return s, 'comma-lost'
    return None


NAMEISH = re.compile(r"^[^\d;:]*[A-Za-z][^\d;:]*$")


def irregular_head(toks, k):
    """A head whose words the OCR damaged so that no regular shape fits (a space inside the surname, a lower-case given name, a lost final period ...):
    taken only when the entry data follows a wide gap.  The head is the chain of at most seven name-like tokens (letters and punctuation, no digits)
    that ends at the token before the anchor and does not run back into the end of the previous entry; the row is marked uncertain by the caller."""
    s = None
    for q in range(k - 1, max(-1, k - 8), -1):
        w = toks[q].w
        if q < k - 1 and _ends(w) and not INITIAL.match(w) and not SUFFIX.match(w):
            break                                       # the last token of the previous entry
        if not (NAMEISH.match(w) or SUFFIX.match(w)) or toks[q].leaf != toks[k - 1].leaf:
            break
        s = q
    while s is not None and s < k and not re.match(r"^" + LEAD + r"[A-Z]", toks[s].w):
        s += 1
    if s is None or s >= k:
        return None
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


def parse_section(text, pm, leaf_a, leaf_b, kind, title_re):
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
    heads, orphans = [], []
    n = len(toks)
    for k in range(1, n):
        a = anchor_at(toks, k, kind)
        if a is None:
            continue
        gap = text[toks[k - 1].e:toks[k].s]
        wide = '\n' not in gap and len(gap) >= 3
        strong = kind == 'co' or bool(re.match(r'^(?:b\.|Substitute|Drafted)', toks[k].w))      # the battery's "See" occurs inside remarks too
        h = find_head(toks, k, a[0], strong)
        if h is None and wide and strong:
            h = irregular_head(toks, k)
        if h is None:
            if wide and strong:
                orphans.append(k)
            continue
        if heads and h[0] < heads[-1][1] + heads[-1][2] - 1:
            orphans.append(k)                       # overlaps the previous head: left to the report
            continue
        heads.append((h[0], k, a[0], a[1], h[1]))
    # bare cross-reference heads ("Bachelder.  See Batchelder.")
    covered = set()
    for s0, k0, al, co, typ in heads:
        covered.update(range(s0, k0 + al))
    bare = [k for k in range(n) if k not in covered and bare_xref_at(toks, k)]
    return toks, heads, bare, orphans, furn, start_off


def main(argv):
    out_dir = None
    write = '--write' in argv
    if '--out' in argv:
        out_dir = argv[argv.index('--out') + 1]
    texts = {}
    for vol, ident in VOLS.items():
        t = R.load_text(os.path.join(LIB, ident + '_hocr_searchtext.txt.gz'))
        pm = R.PageMap(os.path.join(LIB, ident + '_hocr_pageindex.json.gz'), os.path.join(LIB, ident + '_page_numbers.json'))
        texts[vol] = (t, pm)
    for key, desig, vol, la, lb, title_re, kind in SECTIONS:
        text, pm = texts[vol]
        toks, heads, bare, orphans, furn, start_off = parse_section(text, pm, la, lb, kind, title_re)
        print(key, 'tokens', len(toks), 'heads', len(heads), 'bare xref candidates', len(bare), 'orphans', len(orphans), 'furniture lines', len(furn))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
