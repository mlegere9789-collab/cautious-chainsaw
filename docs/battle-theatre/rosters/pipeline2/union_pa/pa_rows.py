"""Rows of the Bates roll pages: from the analysed leaf to roster2 rows, each one asserted against the pinned text.

A row = the name words of the line (consecutive in the text layer), the rank words, and every other word of the line and of its
continuation lines (date, term digit, remarks) in the order of the text layer (the cells file keeps the order of the page).
Nothing is corrected.  A row that cannot be located is not written; it is listed with the reason.
"""
import re, bisect, collections
import pa_tok as T
import pa_geom as G
import r2lib as R

LETTERS = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'          # the companies of a Pennsylvania regiment: no J
CONFUSE = {'A': 'AR4', 'B': 'BR8E3', 'C': 'CGO0Q', 'D': 'DO0Q', 'E': 'EFB', 'F': 'FEP', 'G': 'GCO0Q6R', 'H': 'HNMI', 'I': 'IJL1T', 'K': 'KIS',
           'L': 'LI1', 'M': 'MNH', 'N': 'NMH', 'O': 'OQ0DC', 'P': 'PF', 'Q': 'QO0'}


class TokenIndex:
    """White-space tokens of every leaf of a pinned text, for the assertion (the same rule as r2lib._match_tokens, with a binary search)."""

    def __init__(self, text, pm):
        self.text, self.pm = text, pm
        self.leaf_tokens = {}

    def leaf(self, leaf):
        t = self.leaf_tokens.get(leaf)
        if t is None:
            a, b = self.pm.span(leaf)
            offs, toks, pos = [], [], collections.defaultdict(list)
            for m in re.finditer(r'\S+', self.text[a:b]):
                pos[m.group(0)].append(len(toks))
                offs.append(a + m.start())
                toks.append(m.group(0))
            t = (offs, toks, pos)
            self.leaf_tokens[leaf] = t
        return t

    def index_of(self, leaf, off):
        offs, toks, pos = self.leaf(leaf)
        i = bisect.bisect_left(offs, off)
        return i if i < len(offs) and offs[i] == off else None


def in_order(ti, leaf, off, tokens):
    """The tokens stand in the text in order from the offset (the first one exactly at it, the rest one after the other with other tokens
    stepped over inside the leaf; the last one may be followed by glued punctuation): r2lib._match_tokens with the leaf as the gap."""
    offs, toks, pos = ti.leaf(leaf)
    i = bisect.bisect_right(offs, off) - 1
    if i < 0:
        return False
    if ti.text[off:off + len(tokens[0])] != tokens[0]:
        return False
    cur = i
    for k in range(1, len(tokens)):
        tok = tokens[k]
        last = k == len(tokens) - 1
        lst = pos.get(tok)
        j = None
        if lst:
            q = bisect.bisect_right(lst, cur)
            if q < len(lst):
                j = lst[q]
        if last:
            cand = None
            for jj in range(cur + 1, len(toks)):
                if toks[jj].startswith(tok):
                    cand = jj
                    break
            if cand is not None and (j is None or cand < j):
                j = cand
        if j is None:
            return False
        cur = j
    return True


def assert_row(row, text, pm, ti):
    """V1 name, V2 remarks, V3 page of one 7-field row.  Returns a list of defect kinds ([] when the row is locatable)."""
    name, rank, co, rem, page, off, rd = row
    kinds = []
    if not R._match_tokens(text, off, name.split(), 0):
        kinds.append('name-not-at-offset')
    leaf = pm.leaf(off)
    if rem:
        if leaf is None or not in_order(ti, leaf, off + rd, rem.split()):
            kinds.append('remark-not-at-offset')
    if leaf is None or pm.printed(leaf) != page:
        kinds.append('page-mismatch')
    return kinds


# ------------------------------------------------------------------------------------------------------------ flags of a row
DATE_FULL = re.compile(r"^[.'‘’`\"]*(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]{0,6}[.,;:]*$")
GOOD_WORD = re.compile(r"^[A-Za-z][A-Za-z'’.\-,]*$")


def name_damage(tokens):
    """Is the name text damaged in the text layer (a rule that flags generously, never a change to the name)?"""
    if not tokens:
        return True
    txt = ' '.join(tokens)
    for t in tokens:
        c = t.strip('.,;:\'"`')
        if not c:
            continue
        if re.search(r'[0-9^~|*\\\[\]{}<>=_@#%&+/]', c):
            return True
        # a lower-case letter inside a capitalised word, or an upper-case letter inside a word (other than Mc, M', De, La, Mac prefixes)
        if len(c) > 3 and re.search(r'[a-z][A-Z]', c) and not re.match(r"^(M['’]|Mc|Mac|De|La|Le|Di|Van|Von|O['’])", c):
            return True
        if c[0].islower() and len(c) > 1:
            return True
    letters = re.findall(r'[A-Za-z]{2,}', txt)
    if len(letters) < 1:
        return True
    return False


def remark_damage(tokens):
    for t in tokens:
        c = t.strip('.,;:\'"`()-—')
        if not c:
            continue
        if re.search(r'[A-Za-z][0-9]|[0-9][A-Za-z]', c) and not re.match(r"^(\d+(st|d|nd|rd|th)|\d+[A-Za-z]?\.?)$", c):
            return True
        if re.search(r'[\^~|\\{}<>=_@#%&]', c):
            return True
    return False


# ------------------------------------------------------------------------------------------------------------ one row
_YEAR = re.compile(r"^[.'‘’`\"■●•\-—]*(?:18)?[5-6][0-9OoIil]?[.,;:]*$|^[.'‘’`\"]*\d\d[.,;:]*$")
_DAY = re.compile(r"^[.,]*[0-9OoIl]{1,2}[.,;:]*$")


def _mark(t):
    return len(T.core(t)) <= 1 and not T.is_ditto(t)


def finalize_row(row, info, text, pm, ti, leaf):
    """(record, None) or (None, reason).  record = {'row': 7 fields without company (set by the caller), 'facts': {...}}"""
    W, xd, B1, B2 = info['W'], info['xd'], info['B1'], info['B2']
    xn = info.get('xn') or 0
    left = sorted(row['left_w'], key=lambda w: w['x0'])
    flags = set(row['flags'])
    marks = []
    # tokens of the name zone / rank zone
    # the rank cell starts at the first word that reads as a rank (or a ditto mark) and stands in the rank column (up to 0.05 W left of its
    # edge); a page whose rank cells begin further left than the edge estimate is thereby handled; words before it are the name
    cut_x = B1
    for w in left:
        if w['x0'] >= B1 - 0.05 * W and (T.is_ditto(w['w']) or (T.rank_like(w['w']) and len(T.core(w['w'])) >= 3 and w['x0'] > xn + 0.12 * W)):
            if w['x0'] < cut_x:
                cut_x = w['x0']
            break
    nz = [w for w in left if w['x0'] < cut_x]
    rz = [w for w in left if w['x0'] >= cut_x]
    # a middle initial that stands in the rank column's area right behind the name ("Taylor, William H..") is a name word, unless it sits on the rule
    xrule = info.get('xrule')
    while nz and rz and re.match(r'^[A-HJ-KM-Z][.,]*$', rz[0]['w']) and not (xrule is not None and abs(rz[0]['x0'] - xrule) <= 0.008 * W) \
            and rz[0]['x0'] - nz[-1]['x1'] < 0.04 * W and not T.is_ditto(rz[0]['w']):
        nz.append(rz.pop(0))
        flags.add('G') if False else None
    # the name zone: leading marks left of the first letter-bearing token are marks of the margin, not name words
    while nz and not T.core(nz[0]['w']) and nz[0]['x0'] < xn - 0.01 * W:
        marks.append(nz.pop(0))
    name_str_tokens = [[w, w['w']] for w in nz]
    rank_tail = ''
    glued = None
    # a lone mark at the end of the name cell (a leader dot, a comma, a rule) is not a name word: it goes to the marks
    while len(name_str_tokens) > 1 and not T.core(name_str_tokens[-1][1]):
        marks.append(name_str_tokens.pop()[0])
    if name_str_tokens:
        wlast, tlast = name_str_tokens[-1]
        sg = T.split_glued(tlast)
        if sg:
            glued = (tlast, sg[0], sg[1])
            name_str_tokens[-1][1] = sg[0]
            rank_tail = sg[1].lstrip('.')
            flags.add('J')
    rank_w = [w for w in rz if not _mark(w['w'])]
    marks += [w for w in rz if _mark(w['w'])]
    if rank_tail and rank_w:
        rank_str = rank_tail + ' ' + ' '.join(w['w'] for w in rank_w)
    elif rank_tail:
        rank_str = rank_tail
    else:
        rank_str = ' '.join(w['w'] for w in rank_w)
    # a name needs at least one word with a letter or digit
    if not any(T.core(t) for _, t in name_str_tokens):
        return None, 'no name (the text layer lost the name cell)'
    # name tokens: the first one must be in the text layer; the others must follow it one after the other
    first = name_str_tokens[0][0]
    if first['off'] is None:
        return None, 'first name word is not in the text layer under that spelling: %r' % first['w']
    nm = [name_str_tokens[0]]
    leftover = []
    idx0 = ti.index_of(leaf, first['off'])
    if idx0 is None:
        return None, 'first name word does not start a text token'
    prev = idx0
    cut = False
    for w, t in name_str_tokens[1:]:
        if not cut and w['off'] is not None and ti.index_of(leaf, w['off']) == prev + 1:
            nm.append([w, t])
            prev += 1
        else:
            cut = True
            leftover.append(w)
    if leftover:
        flags.add('S')
        # a name word that does not follow the others in the text layer goes to the remarks (its cell is the name cell: flag S)
    name = ' '.join(t for _, t in nm)
    off = first['off']
    rem_w = marks + leftover + list(row['post_w']) + list(row['cont_w'])
    unaligned = [w for w in rem_w if w['off'] is None]
    placed = sorted([w for w in rem_w if w['off'] is not None], key=lambda w: w['off'])
    if len({w['off'] for w in placed}) != len(placed):
        return None, 'two words at one offset'
    # a remark word that stands inside the name tokens' own range is the name's glued tail: not a remark
    nm_offs = {w['off'] for w, _ in nm}
    placed = [w for w in placed if w['off'] not in nm_offs]
    remarks = ' '.join(w['w'] for w in placed)
    rd = (placed[0]['off'] - off) if placed else 0
    page_sorted = sorted(placed, key=lambda w: (w['li'], w['x0']))
    rem_page = ' '.join(w['w'] for w in page_sorted)
    big = [w for w in placed if len(T.core(w['w'])) >= 2]
    if [w['off'] for w in sorted(big, key=lambda w: (w['li'], w['x0']))] != [w['off'] for w in big]:
        flags.add('O')            # the text layer lists the words of the line in another order than the page (beyond the term digit and marks)
    if unaligned:
        flags.add('W')
    if marks:
        flags.add('G')
    # --- flags (damage heuristics on the printed cells)
    ntoks = [t for _, t in nm]
    if name_damage(ntoks):
        flags.add('N')
    if not rank_str:
        flags.add('R')
    elif not all(T.rank_like(t) or len(T.core(t)) >= 2 for t in rank_str.split()):
        flags.add('R')
    anchor_post = [w for w in row['post_w']]
    dm = [w for w in anchor_post if T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W]
    if dm:
        # words of the anchor line between the rank cell and the month are marks of the table rules
        if any(w['x0'] < dm[0]['x0'] - 2 and w['off'] is not None for w in anchor_post):
            flags.add('G')
    if not dm:
        flags.add('D')
    else:
        dz = [w for w in anchor_post if dm[0]['x0'] < w['x0'] <= dm[0]['x0'] + 0.20 * W]
        has_day = any(_DAY.match(w['w']) for w in dz)
        has_year = any(_YEAR.match(w['w']) for w in dz)
        if not (has_day and has_year):
            flags.add('D')
    if remark_damage([w['w'] for w in placed]):
        flags.add('K')
    if row['lines'] > 6:
        flags.add('L')
    rec = R.row(name, rank_str, '', remarks, pm.printed(leaf), off, rd)
    facts = {'leaf': leaf, 'y': round(row['y']), 'lines': row['lines'], 'glued': glued, 'flags': sorted(flags), 'unaligned': [w['w'] for w in unaligned],
             'name_split': [w['w'] for w in leftover], 'marks': [w['w'] for w in marks], 'h': round(row['h'])}
    facts['rem_page'] = rem_page if rem_page != remarks else ''
    return {'row': rec, 'facts': facts}, None
