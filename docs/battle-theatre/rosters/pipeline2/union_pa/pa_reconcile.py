"""Reconcile the new unit files of union-pa with the earlier family run (rosters/data/PA/units/*.csv, a second, independent reading of the same five volumes).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_reconcile.py          (from the repository root)

For every unit the lines of the new file and the rows of the earlier CSV are matched on the same leaf of the Internet Archive item and the same
reading of the name (the alphabetic words of two letters or more, lower case, in sorted order, so that "Hill, Horace" and "Horace Hill" agree).  What is left on
either side is listed; nothing is resolved by guessing.

Writes  GOVERNANCE/horde/ws-rosters/union-pa/differences-<unit>.csv      kind, leaf, printed page, company, name, remarks (one line per unmatched line)
        GOVERNANCE/horde/ws-rosters/union-pa/reconciliation.json         counts per unit and company
"""
import os, sys, json, csv, re, gzip, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU
R = L.R
EARLIER = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'PA', 'units')
OUT = L.GOV
# earlier unit file -> unit keys (the earlier run kept the artillery batteries and the Reserves under other ids)
MAP = {}


def earlier_files():
    units = json.load(open(os.path.join(L.D2, 'units.json'), encoding='utf-8'))['units']
    m = {}
    for x in units:
        if x['key'].startswith('u-pa-'):
            m[x['key']] = [os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters', e['file']) for e in x['existing']]
    for k, f in (('u-pa-46th-pennsylvania-infantry', 'X-46PA'), ('u-pa-107th-pennsylvania-infantry', 'X-107PA'), ('u-pa-139th-pennsylvania-infantry', 'X-139PA')):
        p = os.path.join(EARLIER, f + '.csv')
        if os.path.exists(p):
            m[k] = [p]
    return m


def key_of(name):
    ws = [w.lower() for w in re.findall(r'[A-Za-z]{2,}', name)]
    return ' '.join(sorted(ws))


def main():
    os.makedirs(OUT, exist_ok=True)
    ef = earlier_files()
    summary = {}
    tot = collections.Counter()
    for u in PU.U:
        path = os.path.join(L.D2, 'union', 'pa', u['key'][5:] + '.jsonl.gz')
        if not os.path.exists(path):
            continue
        head, segs, meta = R.read_unit(path)
        new = []                         # (leaf, key, company, name, remarks, page)
        text, pm, _ = L.load_text(u['vol'])
        for seg, rows in segs:
            for r in rows:
                leaf = pm.leaf(r[5])
                new.append([leaf, key_of(r[0]), r[2], r[0], r[3], r[4], False])
        old = []
        for p in ef.get(u['key'], []):
            if not os.path.exists(p):
                continue
            for x in csv.DictReader(open(p, newline='', encoding='utf-8')):
                try:
                    leaf = int(x['source_page_idx_ia']) - 1
                except Exception:
                    leaf = None
                co = x['company'] if x['company'] not in ('UNASSIGNED',) else 'UNAS'
                old.append([leaf, key_of(x['name_as_printed']), co, x['name_as_printed'], x['remarks_as_printed'], None, False])
        if u['co'] is not None:
            old = [o for o in old if o[2] in u['co']]
        if not old:
            summary[u['key']] = {'rows_new': len(new), 'rows_earlier': None, 'note': 'no earlier file for this unit'}
            continue
        # match on (leaf, key); then on key within +-1 leaf (a line at a page edge)
        idx = collections.defaultdict(list)
        for j, o in enumerate(old):
            idx[(o[0], o[1])].append(j)
        matched = 0
        co_differs = 0
        for n in new:
            for dl in (0, -1, 1):
                lst = [j for j in idx.get((n[0] + dl, n[1]), []) if not old[j][6]]
                if lst:
                    j = lst[0]
                    old[j][6] = True
                    n[6] = True
                    matched += 1
                    if old[j][2] != n[2]:
                        co_differs += 1
                    break
        only_new = [n for n in new if not n[6]]
        only_old = [o for o in old if not o[6]]
        with open(os.path.join(OUT, 'differences-%s.csv' % u['key'][5:]), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['kind', 'leaf', 'printed_page', 'company', 'name', 'remarks'])
            for n in only_new:
                w.writerow(['new-file-only', n[0], n[5], n[2], n[3], n[4][:160]])
            for o in only_old:
                w.writerow(['earlier-file-only', o[0], '', o[2], o[3], o[4][:160]])
        by_co = collections.Counter(n[2] for n in new)
        summary[u['key']] = {'rows_new': len(new), 'rows_earlier': len(old), 'matched': matched, 'new_only': len(only_new), 'earlier_only': len(only_old),
                             'company_differs': co_differs, 'companies_new': dict(sorted(by_co.items()))}
        tot['new'] += len(new)
        tot['earlier'] += len(old)
        tot['matched'] += matched
        tot['new_only'] += len(only_new)
        tot['earlier_only'] += len(only_old)
        tot['company_differs'] += co_differs
        print('%-52s new %5d earlier %5d matched %5d new-only %4d earlier-only %4d company differs %4d' % (u['key'][5:], len(new), len(old), matched, len(only_new), len(only_old), co_differs), flush=True)
    json.dump({'units': summary, 'totals': dict(tot), 'rule': 'a line matches a row of the earlier CSV when the alphabetic words (two letters or more, lower case, sorted) of the name are equal and the leaf is the same or the next one; '
               'nothing is matched by guessing; every unmatched line of either side is in differences-<unit>.csv'},
              open(os.path.join(OUT, 'reconciliation.json'), 'w'), indent=1)
    print(dict(tot))


if __name__ == '__main__':
    main()
