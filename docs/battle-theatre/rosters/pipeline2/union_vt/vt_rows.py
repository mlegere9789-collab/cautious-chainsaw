"""Stage 1 of the Vermont build: rows of every unit from the cached word boxes, each row asserted against the pinned text.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_rows.py            (run from the repository root)

Reads   tmp/library/rosters/union-vt-work/leaves.json.gz       (vt_cache.py)
Writes  tmp/library/rosters/union-vt-work/rows-<unit key>.json  one record per row with the 7 fields of roster2, the cells in the
                                                                order of the page and the facts of the row (leaf, line, flags)
        tmp/library/rosters/union-vt-work/rows-report.json      counts, rejected rows, events per unit

The assertion (the parser's own, before anything is written): for every row the name tokens stand in the pinned text at the recorded offset, the
remark tokens stand in the text in order from the recorded offset inside the leaf, and the printed page of the leaf is the recorded page
(r2lib.verify_rows: V1, V2, V3).  A row that fails is not written; it is listed with the reason.
"""
import os, sys, json, gzip, re, collections, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L          # noqa: E402
import vt_parse as P        # noqa: E402
R = L.R

# leaf range of every unit: first leaf = the title leaf of the regiment, last leaf = the leaf before the next regiment's title leaf
RANGES = {
    'u-vt-2nd-vermont-infantry': (42, 81), 'u-vt-3rd-vermont-infantry': (82, 120), 'u-vt-4th-vermont-infantry': (121, 156),
    'u-vt-5th-vermont-infantry': (157, 191), 'u-vt-6th-vermont-infantry': (192, 228), 'u-vt-1st-vermont-cavalry': (229, 281),
    'u-vt-12th-vermont-infantry': (473, 494), 'u-vt-13th-vermont-infantry': (495, 518), 'u-vt-14th-vermont-infantry': (519, 540),
    'u-vt-15th-vermont-infantry': (541, 561), 'u-vt-16th-vermont-infantry': (562, 584),
}
PRINTED = {}   # filled by main(): printed page range per unit


def cell_col(w, E):
    """0 residence, 1 enlistment (commission), 2 muster (issue), 3 remarks."""
    x = w['x0']
    if x < E - 30:
        return 0
    if x < E + 135:
        return 1
    if x < E + 310:
        return 2
    return 3


def make_row(r, info, text, pm, leaf, rowno):
    """One roster2 row (7 fields) from a cut row, plus the facts of the line.  Returns (record, None) or (None, reason)."""
    name_words = list(r['left'])
    if not name_words:
        return None, 'no name words'
    if name_words[0]['off'] is None:
        return None, 'first name word not in the text layer: %r' % name_words[0]['w']
    # the name: the words that stand one after the other in the text (a word that does not is a remark word)
    nm = [name_words[0]]
    rest = []
    for w in name_words[1:]:
        prev = nm[-1]
        ok = (not rest) and w['off'] is not None and w['off'] > prev['off'] and \
            text[prev['off'] + len(prev['w']):w['off']].strip() == '' and w['off'] - (prev['off'] + len(prev['w'])) < 400
        if ok:
            nm.append(w)
        else:
            rest.append(w)
    off = nm[0]['off']
    name = ' '.join(w['w'] for w in nm)
    E = info['E']
    cells = list(r['cells'])
    unaligned = [w for w in cells + rest if w['off'] is None]
    placed = sorted([w for w in cells + rest if w['off'] is not None], key=lambda w: w['off'])
    if len({w['off'] for w in placed}) != len(placed):
        return None, 'two words at one offset'
    remarks = ' '.join(w['w'] for w in placed)
    rd = (placed[0]['off'] - off) if placed else 0
    # order of the page: line of the row (the heading line above first), then x; order of the text layer: offset
    page_order = [w['off'] for w in sorted([w for w in cells if w['off'] is not None], key=lambda w: (cell_col(w, E), w.get('rl', 0), w['x0']))]
    text_order = [w['off'] for w in sorted([w for w in cells if w['off'] is not None], key=lambda w: w['off'])]
    order_differs = page_order != text_order
    parts = [[], [], [], []]
    for w in cells:
        parts[cell_col(w, E)].append(w)
    cols = [' '.join(w['w'] for w in sorted(parts[i], key=lambda w: (w.get('rl', 0), w['x0']))) for i in range(4)]
    col_offs = [min([w['off'] for w in parts[i] if w['off'] is not None] or [None]) if parts[i] else None for i in range(4)]
    rank = ('^' + r['rk']) if r['rk'] else ''
    row = R.row(name, rank, r['co'], remarks, pm.printed(leaf), off, rd)
    facts = {'leaf': leaf, 'n': rowno, 'y': round(r['y']), 'lines': r['nlines'], 'unaligned': [w['w'] for w in unaligned],
             'name_split': [w['w'] for w in rest], 'stray': bool(r.get('stray')), 'order_differs': order_differs,
             'cols': cols, 'col_offs': col_offs, 'nameonly': bool(r.get('nameonly')), 'E': E, 'conf_min': min([w['conf'] for w in nm if w['conf'] is not None] or [None])}
    return {'row': row, 'facts': facts}, None


class TokenIndex:
    """The white-space tokens of every leaf of the pinned text with, for each distinct token, the sorted list of its positions (token numbers) in the leaf:
    the same facts r2lib._match_tokens walks through one regular-expression search at a time, here with a binary search."""

    def __init__(self, text, pm):
        self.text, self.pm = text, pm
        self.leaf_tokens = {}      # leaf -> (offsets list, tokens list, {token: [positions]})
        self.low = text.casefold() if len(text.casefold()) == len(text) else None

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


def _in_order(ti, leaf, off, tokens):
    """The tokens stand in the text in order from the offset (the first one exactly at it, the rest one after the other, other tokens may be
    stepped over inside the leaf); the last token may be followed by glued punctuation.  Same rule as r2lib._match_tokens with the leaf as gap."""
    import bisect
    offs, toks, pos = ti.leaf(leaf)
    i = bisect.bisect_right(offs, off) - 1
    if i < 0:
        return False
    first = tokens[0]
    # the first token must start exactly at off (off may point inside a text token)
    if ti.text[off:off + len(first)] != first:
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
        if last:                                  # glued punctuation after the last token: any token that starts with it
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


def assert_rows(rows, text, pm, ti=None):
    """The parser's assertion for every row (the rules of r2lib.verify_rows, V1 to V4, with the token and heading searches made cheap).
    Returns the counts and the list of (index, kinds) of the rows that fail V1, V2 or V3 (V4 is counted)."""
    import bisect
    ti = ti or TokenIndex(text, pm)
    st = collections.Counter()
    bad = []
    for i, (name, rank, co, rem, page, off, rd) in enumerate(rows):
        st['rows'] += 1
        kinds = []
        if R._match_tokens(text, off, name.split(), 0):
            st['name_ok'] += 1
        else:
            kinds.append('name-not-at-offset')
        leaf = pm.leaf(off)
        if rem:
            ok = leaf is not None and _in_order(ti, leaf, off + rd, rem.split())
            if ok:
                st['remark_ok'] += 1
                a, b = pm.span(leaf)
                if len(rem.split()) > 1 and rd >= 0 and False:
                    pass
            else:
                kinds.append('remark-not-at-offset')
        if leaf is not None and pm.printed(leaf) == page:
            st['page_ok'] += 1
        else:
            kinds.append('page-mismatch')
        if rank.startswith('^'):
            lowtext = ti.low if ti.low is not None else text.casefold()
            hay = lowtext[max(0, off - 400000):off]
            if all(t in hay for t in rank[1:].casefold().split()):
                st['rank_ok'] += 1
            else:
                kinds.append('rank-not-above')
        if kinds:
            bad.append((i, kinds))
    return dict(st), bad


def main(assert_all=True):
    text, pm, ent = L.load_text()
    d = json.load(gzip.open(os.path.join(L.WORK, 'leaves.json.gz'), 'rt', encoding='utf-8'))
    report = {}
    for key, desig, stem in L.UNITS:
        a, b = RANGES[key]
        state = {'co': '', 'rk': ''}
        out, rejected, evc, evs = [], [], collections.Counter(), collections.defaultdict(list)
        per_leaf = {}
        n = 0
        for leaf in range(a, b + 1):
            rows, events, info = P.analyse_leaf(leaf, d[str(leaf)], state)
            per_leaf[leaf] = {'rows': len(rows), 'table': info.get('table'), 'pg': info.get('pg')}
            for e in events:
                evc[e[0]] += 1
                if e[0] not in ('heading', 'noise-line-dropped', 'page-number', 'footnote', 'heading-noise-dropped') and len(evs[e[0]]) < 400:
                    evs[e[0]].append([leaf, round(e[1]), e[2]])
                if e[0] == 'footnote':
                    evs['footnote'].append([leaf, round(e[1]), e[2]])
            for r in rows:
                n += 1
                rec, why = make_row(r, info, text, pm, leaf, n)
                if rec is None:
                    rejected.append({'leaf': leaf, 'y': round(r['y']), 'why': why, 'left': ' '.join(w['w'] for w in r['left']),
                                     'cells': ' '.join(w['w'] for w in r['cells'])[:120]})
                    continue
                rec['facts']['E'] = info['E']
                rec['facts']['co_inferred'] = bool(state.get('co_inferred')) and r['co'] == state['co']
                out.append(rec)
        # the assertion: V1 name, V2 remarks, V3 page (rows that fail are not written), V4 rank heading (counted)
        st, bad = assert_rows([x['row'] for x in out], text, pm) if assert_all else ({'assertion': 'skipped (development run)'}, [])
        failing = {i: k for i, k in bad if any(c != 'rank-not-above' for c in k)}
        keep = []
        for i, x in enumerate(out):
            if i in failing:
                rejected.append({'leaf': x['facts']['leaf'], 'y': x['facts']['y'], 'why': 'assertion: ' + ','.join(failing[i]), 'left': x['row'][0],
                                 'cells': x['row'][3][:120]})
            else:
                keep.append(x)
        st['rank_heading_not_above'] = sum(1 for i, k in bad if 'rank-not-above' in k)
        with open(os.path.join(L.WORK, 'rows-%s.json' % key), 'w', encoding='utf-8') as f:
            json.dump({'unit': key, 'rows': [{'row': x['row'], 'facts': x['facts']} for x in keep]}, f, ensure_ascii=False, separators=(',', ':'))
        report[key] = {'rows_cut': n, 'rows_kept': len(keep), 'rejected': rejected, 'events': dict(evc), 'event_samples': evs,
                       'assertion': st, 'per_leaf': per_leaf}
        print(key, 'cut', n, 'kept', len(keep), 'rejected', len(rejected), st)
    json.dump(report, open(os.path.join(L.WORK, 'rows-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(assert_all='--no-assert' not in sys.argv)
