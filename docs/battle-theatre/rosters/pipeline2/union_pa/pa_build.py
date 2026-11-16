"""Build the rows of the Pennsylvania units (work item union-pa) from the cached word boxes of Bates, History of Pennsylvania Volunteers.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_build.py [--unit KEY]... [--dry] [--no-assert]     (from the repository root)

For every unit of pa_units.U: the leaves of its range are analysed (pa_page.analyse_leaf), every table line becomes a row (pa_rows.finalize_row),
every row is asserted against the pinned text of its volume (V1 name at the recorded offset, V2 remarks in order inside the leaf, V3 printed
page), and the unit file, its flags file and its diagnostics are written.  A row that fails the assertion is not written; it is listed.

Writes  tmp/library/rosters/union-pa-work/rows-<unit key>.json        (the rows with their facts; input of pa_write.py)
        tmp/library/rosters/union-pa-work/build-report.json            (counts, rejected lines, orphan lines, headings per unit)
"""
import os, sys, json, collections, time, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU
import pa_page as P
import pa_rows as RW

R = L.R


def next_letter(prev):
    if prev is None:
        return 'A'
    if prev in RW.LETTERS:
        i = RW.LETTERS.index(prev)
        return RW.LETTERS[i + 1] if i + 1 < len(RW.LETTERS) else None
    return None


def resolve_letter(raw, prev, wellformed):
    """The company letter of a heading: (letter, inferred).  The order of the headings decides when the letter of the heading is damaged."""
    exp = next_letter(prev)
    if raw == exp and raw in RW.LETTERS:
        return raw, False
    if prev is not None and raw == prev and raw in RW.LETTERS:
        return raw, False
    if exp and raw in RW.CONFUSE.get(exp, ''):
        return exp, True
    if wellformed and raw in RW.LETTERS and prev is not None and prev in RW.LETTERS and RW.LETTERS.index(raw) > RW.LETTERS.index(prev):
        return raw, True             # letters skipped: a heading between was not found (a gap in the sequence, reported)
    return (exp or '?'), True


def process_unit(u, caches, assert_all=True):
    vol = u['vol']
    text, pm, ti = caches[vol]
    ranges = [(u['a'], u['b'])] + list(u['also'])
    state = {'co': '', 'letter': None}
    rows, rejected, orphans, headings, skips = [], [], [], [], collections.Counter()
    notes = []
    leafinfo = {}
    for a, b in ranges:
        recs = {rec['leaf']: rec for rec in L.read_cache(vol, wanted=set(range(a, b + 1)))}
        ctx = {}
        state = {'co': state['co'] if (a, b) == ranges[0] else '', 'letter': state['letter'] if (a, b) == ranges[0] else None}
        if a in u.get('init_co', {}):
            state['co'] = u['init_co'][a]            # a section whose title page names the battery: the rows stand under that heading
            state['letter'] = u['init_co'][a]
        for leaf in range(a, b + 1):
            rec = recs.get(leaf)
            if rec is None:
                leafinfo[leaf] = {'kind': 'no-words'}
                continue
            r = P.analyse_leaf(rec, ctx)
            inf = r['info']
            li = {k: inf.get(k) for k in ('kind', 'pg', 'xd', 'nd', 'xd_source', 'xr', 'B1', 'B2', 'xn', 'table_score', 'pitch')}
            li['lost'] = 0
            li['kind'] = inf.get('kind', 'table')
            li['rows'] = 0
            if inf.get('kind') in ('narrative', 'empty', 'no-date-column'):
                leafinfo[leaf] = li
                if inf.get('kind') == 'no-date-column':
                    orphans.append({'leaf': leaf, 'why': 'table page whose date column the text layer lost: not parsed', 'text': '', 'co': state['co']})
                continue
            for it in r['items']:
                kind = it[0]
                if kind == 'heading':
                    hk, letter, txt, y = it[1], it[2], it[3], it[4]
                    if hk.startswith('company'):
                        lt, inferred = resolve_letter(letter, state['letter'], hk == 'company')
                        state['letter'] = lt
                        state['co'] = lt
                        state['co_inferred'] = inferred
                    else:
                        state['co'] = {'fs': 'FS', 'band': 'BAND', 'ncs': 'NCS', 'unassigned': 'UNAS'}.get(hk, '')
                        state['co_inferred'] = False
                    headings.append({'leaf': leaf, 'kind': hk, 'raw': letter, 'co': state['co'], 'inferred': bool(state.get('co_inferred')), 'text': txt[:60]})
                elif kind == 'row':
                    rec2, why = RW.finalize_row(it[1], inf, text, pm, ti, leaf)
                    if rec2 is None:
                        li['lost'] += 1
                        rejected.append({'leaf': leaf, 'y': round(it[1]['y']), 'co': state['co'], 'why': why,
                                         'left': ' '.join(w['w'] for w in it[1]['left_w']), 'rest': ' '.join(w['w'] for w in it[1]['post_w'])[:100]})
                        continue
                    rec2['row'][2] = state['co']
                    if state.get('co_inferred'):
                        rec2['facts']['flags'].append('C')
                    if assert_all:
                        bad = RW.assert_row(rec2['row'], text, pm, ti)
                        if bad:
                            rejected.append({'leaf': leaf, 'y': round(it[1]['y']), 'co': state['co'], 'why': 'assertion: ' + ','.join(bad),
                                             'left': rec2['row'][0], 'rest': rec2['row'][3][:100]})
                            continue
                    rec2['leaf'] = leaf
                    rows.append(rec2)
                    li['rows'] += 1
                elif kind == 'orphan':
                    orphans.append({'leaf': leaf, 'why': it[3], 'text': it[1][:100], 'y': round(it[2]), 'co': state['co']})
                elif kind == 'skip':
                    skips[it[1]] += 1
                    if it[1] == 'note':
                        pass
            leafinfo[leaf] = li
    # a company title that the text layer lost leaves a gap in the letters: the rows of the company before the gap may hold the rows of the missing ones
    letters = [h['co'] for h in headings if h['kind'].startswith('company') and h['co'] in RW.LETTERS]
    seq = []
    for c in letters:
        if not seq or seq[-1] != c:
            seq.append(c)
    gaps = []
    for a, b in zip(seq, seq[1:]):
        if RW.LETTERS.index(b) > RW.LETTERS.index(a) + 1:
            gaps.append((a, RW.LETTERS[RW.LETTERS.index(a) + 1:RW.LETTERS.index(b)]))
    q_cos = {a for a, miss in gaps}
    for x in rows:
        if x['row'][2] in q_cos:
            x['facts']['flags'].append('Q')
    return {'rows': rows, 'rejected': rejected, 'orphans': orphans, 'headings': headings, 'skips': dict(skips), 'leafinfo': leafinfo,
            'company_gaps': [{'after': a, 'missing': ''.join(m)} for a, m in gaps]}


def main(argv):
    only = [argv[i + 1] for i, a in enumerate(argv) if a == '--unit']
    dry = '--dry' in argv
    assert_all = '--no-assert' not in argv
    os.makedirs(L.WORK, exist_ok=True)
    caches = {}
    report = {}
    t0 = time.process_time()
    for u in PU.U:
        if only and not any(o in u['key'] for o in only):
            continue
        vol = u['vol']
        if vol not in caches:
            text, pm, ent = L.load_text(vol)
            caches[vol] = (text, pm, RW.TokenIndex(text, pm))
        res = process_unit(u, caches, assert_all)
        rows = res['rows']
        rej, orph = res['rejected'], res['orphans']
        if u['co'] is not None:
            keep = [x for x in rows if x['row'][2] in u['co']]
            # lost-name lines and stray lines that stand under another company of the shared leaves belong to that company's unit
            rej = [x for x in rej if x['co'] in u['co']]
            orph = [x for x in orph if x.get('co') in u['co']]
            res['rejected'], res['orphans'] = rej, orph
        else:
            keep = rows
        cnt = collections.Counter()
        for x in keep:
            for f in x['facts']['flags']:
                cnt[f] += 1
        report[u['key']] = {'rows_cut': len(rows), 'rows_kept': len(keep), 'rejected': len(res['rejected']), 'orphans': len(res['orphans']),
                            'flags': dict(cnt), 'company_gaps': res['company_gaps'], 'skips': res['skips'], 'companies': dict(collections.Counter(x['row'][2] for x in rows)),
                            'leaves': {k: {kk: vv for kk, vv in v.items() if vv is not None} for k, v in res['leafinfo'].items()}}
        if not dry:
            json.dump(report[u['key']], open(os.path.join(L.WORK, 'unitinfo-%s.json' % u['key']), 'w'), indent=0)
            with open(os.path.join(L.WORK, 'rows-%s.json' % u['key']), 'w', encoding='utf-8') as f:
                json.dump({'unit': u['key'], 'rows': keep, 'rejected': res['rejected'], 'orphans': res['orphans'], 'headings': res['headings'], 'company_gaps': res['company_gaps']},
                          f, ensure_ascii=False, separators=(',', ':'), default=list)
        print('%-62s cut %5d kept %5d rejected %4d orphans %4d  cpu %.1f' % (u['key'][5:], len(rows), len(keep), len(res['rejected']),
                                                                          len(res['orphans']), time.process_time() - t0), flush=True)
    if not only and not dry:
        json.dump(report, open(os.path.join(L.WORK, 'build-report.json'), 'w'), indent=0)


if __name__ == '__main__':
    main(sys.argv[1:])
