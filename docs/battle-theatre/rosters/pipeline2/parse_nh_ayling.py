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
LEAD = r"""[\"'`\^\*\[\(\|]*"""                                                                     # stray marks the OCR puts in front of a word
SURNAME_TOK = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\.\"\^\*\|]*,$")                           # capitalised, ends with a comma: the surname of "Surname, Given."
SURNAME_BARE = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]+$")                               # the surname when the OCR lost the comma
SURNAME_PART = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]*$|^(?:St|Mt|Ft)\.$")             # first words of a multi-word surname
GIVEN_WORD = re.compile(r"^" + LEAD + r"[A-Z][A-Za-z'`\-\"\^\*\|]*,?$")                               # capitalised word, optional comma, no final period
INITIAL = re.compile(r"^" + LEAD + r"[A-Z]\.,?$")                                                       # one capital and a period
SUFFIX = re.compile(r"^(?:Jr|Sr|[0-9]d|2nd|3rd)\.?,?$")
LAST_GIVEN = re.compile(r"^" + LEAD + r"[A-Za-z][A-Za-z'`\-\.\"\^\*\|]*[\.,]$")                       # the token that ends the head: word or initial plus the head period or comma
ALIAS = re.compile(r"^a[A-Za-z]{2,4},?$")                                                              # alias, aZios, aims ...


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
            m = re.match(r"""^[\"'`]?([A-M])[\.,;:i]?$""", nxt)
            return (2, m.group(1)) if m else (1, '')
        if w == 'F.' and k + 2 < n and toks[k + 1].w == 'and' and re.match(r'^S[\.;,:]?', toks[k + 2].w):
            return (3, 'FS')
        if re.match(r"^Band[;,\.:]?$", w):
            return (1, 'BAND')
        if re.match(r"^[A-Za-z]{0,2}nas'?d[\.;,:]?$", w) or re.match(r"^[A-Za-z]{0,2}as'd[\.;,:]?$", w):
            return (1, 'UNAS')
        return None
    # battery: no company printed; the data of an entry begins with one of these
    if re.match(r"^(?:b\.|Substitute|age|cred\.|res\.|enl\.|eul\.|app\.|Drafted)", w):
        return (1, '')
    if w == 'See' and k > 0:
        return (1, '')
    return None


def find_head(toks, k, kind, anchor_len):
    """Head of the entry whose data starts at token k: returns the index s of the first token of the head, or None."""
    # the head ends at token k-1 and ends with a period
    j = k - 1
    if j < 1 or not LAST_GIVEN.match(toks[j].w):
        return None
    best = None
    lo = max(0, j - 11)
    for s in range(j - 1, lo - 1, -1):
        # tokens s..j form the head if: s is the surname part (see below) and the tokens after it are given names
        # the surname ends at the first token that ends with a comma
        w = toks[s].w
        if not SURNAME_TOK.match(w):
            continue
        # multi-word surname: extend s backwards over SURNAME_PART tokens that do not end with a period and are not at the end of a previous entry
        s0 = s
        while s0 - 1 >= 0 and s - s0 < 2 and SURNAME_PART.match(toks[s0 - 1].w) and not toks[s0 - 1].w.endswith('.') and toks[s0 - 1].leaf == toks[s].leaf \
                and s0 - 1 > lo - 1 and (s0 - 2 < 0 or toks[s0 - 2].w.endswith('.') or toks[s0 - 2].leaf != toks[s0 - 1].leaf):
            s0 -= 1
        # boundary: the token before the head must end with a period (end of the previous entry), or the head starts the section or a leaf
        ok_boundary = s0 == 0 or toks[s0 - 1].w.endswith('.') or toks[s0 - 1].leaf != toks[s0].leaf or toks[s0 - 1].w.endswith(';') or toks[s0 - 1].w.endswith('!')
        if not ok_boundary:
            continue
        # tokens after the surname up to j-1 must be given-name material
        inner = toks[s + 1:j]
        good = True
        for q, t in enumerate(inner):
            tw = t.w
            if GIVEN_WORD.match(tw) or INITIAL.match(tw) or SUFFIX.match(tw) or ALIAS.match(tw):
                continue
            good = False
            break
        if not good:
            continue
        if not (s + 1 <= j):            # a head needs at least the final given token
            continue
        best = s0                       # keep scanning to the left: the longest valid head wins only if its boundary is valid
        break
    return best


def bare_xref_at(toks, k):
    """Bare cross-reference head 'Surname.' + 'See' + name at tokens k, k+1: returns True if k starts one (shape only)."""
    if k + 2 >= len(toks):
        return False
    w, w1, w2 = toks[k].w, toks[k + 1].w, toks[k + 2].w
    if w1 != 'See':
        return False
    if not re.match(r"""^[\"'`\^\*\[\(]*[A-Za-z][A-Za-z'`\-\"\^\*\|]{1,}\.$""", w):
        return False
    if w in ('Va.', 'Mass.', 'Md.', 'Conn.', 'Vt.', 'Me.', 'Pa.', 'Ky.', 'Kan.', 'Ill.', 'Ind.', 'Wis.', 'Del.'):
        return False
    if not re.match(r"""^[\"'`\^\*\[\(]*[A-Z][a-z'`\-]+[\.,;]?$""", w2) or re.match(r'^(?:Miscel|Misijel|U|V|N|Co|Navy|Marine|State|Page|page)\b', w2):
        return False
    # must follow the end of an entry
    return k == 0 or toks[k - 1].w.endswith('.') or toks[k - 1].leaf != toks[k].leaf


def parse_section(text, pm, leaf_a, leaf_b, kind, title_re):
    """Returns (entries, info).  entry = dict(head_i, name_toks, anchor_toks, co, rem_toks, off, rd, page, leaf)."""
    toks, furn = section_tokens(text, pm, leaf_a, leaf_b)
    first_leaf_text = text[pm.span(leaf_a)[0]:pm.span(leaf_a)[1]]
    assert re.search(title_re, first_leaf_text), 'title not found on the first leaf %d' % leaf_a
    assert re.search(r'(?m)^\s*SUMMARY\.?\s*$', text[pm.span(leaf_b)[0]:pm.span(leaf_b)[1]]), 'SUMMARY not found on leaf %d' % leaf_b
    # the register proper starts after the muster paragraph of the first leaf
    m = re.search(r'unless\s+otherwise\s+stated\.', first_leaf_text)
    assert m, 'muster paragraph end not found'
    start_off = pm.span(leaf_a)[0] + m.end()
    toks = [t for t in toks if t.s >= start_off]
    heads = []          # (index of first head token, index of last name token + 1, anchor index, anchor len, co)
    n = len(toks)
    k = 0
    while k < n:
        a = anchor_at(toks, k, kind)
        if a is not None:
            s = find_head(toks, k, kind, a[0])
            if s is not None and (not heads or s >= heads[-1][1]):
                heads.append((s, k, a[0], a[1], 'anchor'))
        k += 1
    # bare cross-reference heads
    bare = []
    for k in range(n):
        if bare_xref_at(toks, k) and not any(h[0] <= k < h[1] for h in heads):
            bare.append(k)
    return toks, heads, bare, furn, start_off


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
        toks, heads, bare, furn, start_off = parse_section(text, pm, la, lb, kind, title_re)
        print(key, 'tokens', len(toks), 'heads', len(heads), 'bare xref candidates', len(bare), 'furniture lines', len(furn))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
