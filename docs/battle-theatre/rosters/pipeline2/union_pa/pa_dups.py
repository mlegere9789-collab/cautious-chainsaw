"""Volume 4 holds the printed pages 545 to 560 twice (leaves 577-592 and 981-996).  This script reads the second set (leaves 982-996) with the same
page analyser and matches its lines by name against the first set; the result is written to GOVERNANCE/horde/ws-rosters/union-pa/duplicate-leaves.json.
    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_dups.py
"""
import os, sys, json, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_page as P
import pa_rows as RW


def key(n):
    return ' '.join(sorted(w.lower() for w in re.findall(r'[A-Za-z]{2,}', n)))


def rows_of(vol, leaves, text, pm, ti):
    out = collections.defaultdict(list)
    ctx = {'seen_heading': True}
    for rec in L.read_cache(vol, wanted=set(leaves)):
        r = P.analyse_leaf(rec, ctx)
        if r['info'].get('kind') in ('narrative', 'empty', 'no-date-column'):
            continue
        for it in r['items']:
            if it[0] == 'row':
                rec2, why = RW.finalize_row(it[1], r['info'], text, pm, ti, rec['leaf'])
                if rec2:
                    out[rec['leaf']].append((key(rec2['row'][0]), rec2['row'][3][:30]))
    return out


def main():
    text, pm, ent = L.load_text(4)
    ti = RW.TokenIndex(text, pm)
    first = rows_of(4, range(577, 593), text, pm, ti)
    second = rows_of(4, range(982, 997), text, pm, ti)
    names_first = collections.Counter(k for v in first.values() for k, _ in v)
    res = {'volume': 4, 'first_set_leaves': [577, 592], 'second_set_leaves': [981, 996], 'per_leaf': {}}
    for lf, v in sorted(second.items()):
        hit = sum(1 for k, _ in v if names_first.get(k))
        best = None
        for l1, v1 in first.items():
            c = len({k for k, _ in v} & {k for k, _ in v1})
            if best is None or c > best[1]:
                best = (l1, c)
        res['per_leaf'][str(lf)] = {'lines': len(v), 'names_found_on_first_set': hit, 'best_matching_first_set_leaf': best[0] if best else None, 'names_in_common': best[1] if best else 0,
                                    'printed_page_in_item_file': pm.printed(lf)}
    res['totals'] = {'lines': sum(x['lines'] for x in res['per_leaf'].values()), 'names_found': sum(x['names_found_on_first_set'] for x in res['per_leaf'].values())}
    json.dump(res, open(os.path.join(L.GOV, 'duplicate-leaves.json'), 'w'), indent=1)
    print(res['totals'])


if __name__ == '__main__':
    main()
