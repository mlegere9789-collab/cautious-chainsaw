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
    'u-vt-5th-vermont-infantry': (157, 191), 'u-vt-6th-vermont-infantry': (192, 234), 'u-vt-1st-vermont-cavalry': (235, 281),
    'u-vt-12th-vermont-infantry': (473, 494), 'u-vt-13th-vermont-infantry': (495, 518), 'u-vt-14th-vermont-infantry': (519, 540),
    'u-vt-15th-vermont-infantry': (541, 561), 'u-vt-16th-vermont-infantry': (562, 584),
}
PRINTED = {}   # filled by main(): printed page range per unit


def col_of(w, cols):
    """0 residence, 1 enlistment (commission), 2 muster (issue), 3 remarks."""
    x = w['x0']
    if x < cols['res']:
        return 0
    if x < cols['enl_end'] - 105:       # boundary res|enl is E - 30; enl_end = E + 135
        return 1 if x >= cols['res'] else 0
    return 1


def cell_col(w, E):
    x = w['x0']
    if x < E - 30:
        return 0
    if x < E + 135:
        return 1
    if x < E + 310:
        return 2
    return 3


def make_row(r, info, text, pm, leaf, rowno):
    """One roster2 row (7 fields) from a cut row, plus the page facts.  Returns (row dict, None) or (None, reason)."""
    name_words = list(r['left'])
    if not name_words:
        return None, 'no name words'
    if name_words[0]['off'] is None:
        return None, 'first name word not in the text layer: %r' % name_words[0]['w']
    # the name: the words that stand one after the other in the text
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
    cells = [w for w in r['cells']]
    unaligned = [w for w in cells + rest if w['off'] is None]
    placed = [w for w in cells + rest if w['off'] is not None]
    placed.sort(key=lambda w: w['off'])
    if len({w['off'] for w in placed}) != len(placed):
        return None, 'two words at one offset'
    remarks = ' '.join(w['w'] for w in placed)
    rd = (placed[0]['off'] - off) if placed else 0
    # page order of the cells: column, then line, then x
    ys = sorted({round(w['yk']) for w in cells}) if cells else []
    pageorder = sorted(cells, key=lambda w: (cell_col(w, E), w['yk'], w['x0']))
    textorder = sorted([w for w in cells if w['off'] is not None], key=lambda w: w['off'])
    order_differs = [w['off'] for w in pageorder if w['off'] is not None] != [w['off'] for w in textorder]
    cols = ['', '', '', '']
    parts = [[], [], [], []]
    for w in sorted(cells, key=lambda w: (w['yk'], w['x0'])):
        parts[cell_col(w, E)].append(w)
    for i in range(4):
        cols[i] = ' '.join(w['w'] for w in sorted(parts[i], key=lambda w: (round(w['yk'] / 20), w['x0'])))
    rank = ('^' + r['rk']) if r['rk'] else ''
    row = R.row(name, rank, r['co'], remarks, pm.printed(leaf), off, rd)
    facts = {'leaf': leaf, 'n': rowno, 'y': round(r['y']), 'lines': r['nlines'], 'unaligned': [w['w'] for w in unaligned],
             'name_split': [w['w'] for w in rest], 'stray': bool(r.get('stray')), 'order_differs': order_differs,
             'cols': cols, 'nameonly': bool(r.get('nameonly')), 'name_words_conf': [w['conf'] for w in nm]}
    return {'row': row, 'facts': facts}, None


def main():
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
        # the assertion
        segs = [(L.SEG, [x['row'] for x in out])]
        st = R.verify_rows(segs, {L.TEXT_ID: text}, {L.TEXT_ID: pm})
        bad = {(x['t'], x['off'], x['kind']) for x in st['defects']}
        # verify_rows lists at most max_report defects: re-run without a cap to get every one
        st = R.verify_rows(segs, {L.TEXT_ID: text}, {L.TEXT_ID: pm}, max_report=10 ** 9)
        badoff = {}
        for x in st['defects']:
            if x['kind'] in ('name-not-at-offset', 'page-mismatch', 'remark-not-at-offset'):
                badoff.setdefault(x['off'], []).append(x['kind'])
        keep = []
        for x in out:
            o = x['row'][5]
            if o in badoff:
                rejected.append({'leaf': x['facts']['leaf'], 'y': x['facts']['y'], 'why': 'assertion: ' + ','.join(badoff[o]), 'left': x['row'][0],
                                 'cells': x['row'][3][:120]})
            else:
                keep.append(x)
        with open(os.path.join(L.WORK, 'rows-%s.json' % key), 'w', encoding='utf-8') as f:
            json.dump({'unit': key, 'rows': [{'row': x['row'], 'facts': x['facts']} for x in keep]}, f, ensure_ascii=False, separators=(',', ':'))
        report[key] = {'rows_cut': n, 'rows_kept': len(keep), 'rejected': rejected, 'events': dict(evc), 'event_samples': evs,
                       'stats_first_pass': {k: v for k, v in st.items() if k != 'defects'}, 'per_leaf': per_leaf}
        print(key, 'cut', n, 'kept', len(keep), 'rejected', len(rejected), {k: v for k, v in st.items() if k not in ('defects',)})
    json.dump(report, open(os.path.join(L.WORK, 'rows-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
