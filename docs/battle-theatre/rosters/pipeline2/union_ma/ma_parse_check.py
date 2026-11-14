"""Compare what the parser (union_ma/ma_parse.py, with the third head rule) produces now with the unit files that are stored under rosters/data2/union/ma.
Writes nothing into data2; writes GOVERNANCE/horde/ws-rosters/union-ma/parse-delta.json.

    python3 -I ma_parse_check.py

For every unit: rows now, rows stored, rows added (an offset that the stored file has no row for), rows removed (the reverse), rows changed (same offset, other
name, rank, company or remarks), rows unchanged.  Every row built is checked against the pinned text by parse_ma_ssm.build_unit (V1 name, V2 remarks, V3 page,
V4 rank, offsets increasing), exactly as the production run does.
"""
import sys, os, json, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.dirname(HERE)
sys.path.insert(0, PIPE)
sys.path.insert(0, HERE)
import r2lib as R
import parse_ma_ssm as PM
from ma_sections import SECTIONS

ROOT = PM.ROOT
GOV = PM.GOV


def main():
    PM.check_ledger()
    vocab = PM.prepare_vocab()
    out = {'format': 'ma-parse-delta/1', 'about': 'rows of the parser now against the stored unit files (by character offset); nothing was written to data2', 'units': {}}
    tot = collections.Counter()
    for spec in SECTIONS:
        S, rows, info, seg, st = PM.build_unit(spec, vocab)
        head, segs, meta = R.read_unit(os.path.join(PM.OUT, spec['file'] + '.jsonl.gz'))
        stored = {r[5]: r for _, rr in segs for r in rr}
        now = {r[5]: r for r in rows}
        added = sorted(set(now) - set(stored))
        removed = sorted(set(stored) - set(now))
        changed, same = [], 0
        for off in sorted(set(now) & set(stored)):
            a, b = now[off], stored[off]
            if a[0] == b[0] and a[1] == b[1] and a[2] == b[2] and a[3] == b[3] and a[4] == b[4] and a[6] == b[6]:
                same += 1
            else:
                changed.append(off)
        kinds = {inf['entry'].kind for inf in info if inf['entry'].kind != 'reg'}
        ent = {'rows_now': len(rows), 'rows_stored': len(stored), 'added': len(added), 'removed': len(removed), 'changed': len(changed), 'unchanged': same,
               'added_rows': [{'off': o, 'page': now[o][4], 'co': now[o][2], 'name': now[o][0], 'rank': now[o][1], 'remarks_start': now[o][3][:70]} for o in added],
               'changed_rows': [{'off': o, 'name': now[o][0], 'remarks_now_chars': len(now[o][3]), 'remarks_stored_chars': len(stored[o][3]),
                                 'name_same': now[o][0] == stored[o][0], 'rank_same': now[o][1] == stored[o][1], 'co_same': now[o][2] == stored[o][2]} for o in changed],
               'removed_rows': [{'off': o, 'name': stored[o][0]} for o in removed], 'verify': {k: v for k, v in st.items() if k != 'defects'}}
        out['units'][spec['key']] = ent
        for k in ('added', 'removed', 'changed', 'unchanged'):
            tot[k] += ent[k]
        tot['rows_now'] += len(rows)
        tot['rows_stored'] += len(stored)
        print('%-45s now %5d stored %5d added %3d removed %3d changed %3d unchanged %5d' % (spec['name'], len(rows), len(stored), len(added), len(removed), len(changed), same), flush=True)
    out['totals'] = dict(tot)
    os.makedirs(GOV, exist_ok=True)
    with open(os.path.join(GOV, 'parse-delta.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('totals', dict(tot))
    return 0


if __name__ == '__main__':
    sys.exit(main())
