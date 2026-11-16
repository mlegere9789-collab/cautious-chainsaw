"""Reconciliation of the new unit files of the conf-nc work item with two other readings of the same roll:

  * the EARLIER roll file of the family C-NCLA (rosters/data/C-NCLA/units/C-<n>NC.csv, one entry per line of the djvu text, a double reading of two scans);
  * the SECOND SCAN of the same volume (the other Internet Archive copy of the 1882 edition), parsed by the same parser.

Both are compared with the unit file line by line by alignment (nc_align.align): the key of a line is its company and the letters of its name tokens, sorted, so that the
printed order does not matter.  What is in one reading only is listed and resolved by nobody: a line that differs only by the damage of the name in one of the readings
stays two lines of two readings.  Per unit: lines, matched, only in the file (new), only in the other reading, and the company counts of both.

    python3 -I nc_reconcile.py [--unit KEY ...]      writes GOVERNANCE/horde/ws-rosters/conf-nc/reconciliation.json and differences-<unit>.csv
"""
import os, sys, csv, json, re, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_lib as L, nc_build as B, nc_align as A, nc_units as U

EARLIER_DIR = os.path.join(L.R2, 'data', 'C-NCLA', 'units')
MAXROWS = 400      # rows listed per side in a differences file (the counts are complete; the listing is cut here and says so)


def earlier_rows(unit_key):
    code = U.EARLIER.get(unit_key)
    if not code:
        return None
    path = os.path.join(EARLIER_DIR, code + '.csv')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    return code, rows


def reconcile_unit(key):
    d = B.decide(key)
    new = d['P1']['kept']
    new7 = [r['row'] for r in new]
    out = {'unit': key, 'primary': d['primary'], 'lines': len(new7), 'company_counts': dict(sorted(collections.Counter(r[2] for r in new7).items()))}
    # second scan
    al = d['align']
    out['second_scan'] = {'text_id': d['P2']['parse']['tid'], 'lines': d['P2']['rows'], 'matched': al['matched'], 'only_in_file': sum(b - a for a, b in al['only_prim']),
                          'only_in_second': sum(b - a for a, b in al['only_sec']), 'replace_blocks': len(al['replace']), 'second_only_runs': [{'at_file_row': i, 'second_rows': [j1, j2]} for i, j1, j2 in d['second_only_runs']],
                          'company_counts': dict(sorted(collections.Counter(r['row'][2] for r in d['P2']['kept']).items()))}
    # earlier file
    e = earlier_rows(key)
    diffs = []
    if e:
        code, old = e
        old7 = [[o['name_as_printed'], o['rank'], o['company'], o['moore_1882_entry'], None, 0, 0] for o in old]
        al2 = A.align(new7, old7)
        out['earlier'] = {'file': 'data/C-NCLA/units/%s.csv' % code, 'lines': len(old), 'matched': al2['matched'], 'only_in_file': sum(b - a for a, b in al2['only_prim']),
                          'only_in_earlier': sum(b - a for a, b in al2['only_sec']), 'replace_blocks': len(al2['replace']),
                          'company_counts': dict(sorted(collections.Counter(o['company'] for o in old).items())), 'source': old[0]['source_id'] if old else None}
        # lines of each side that no alignment block matched (inserts and the unmatched side of replace blocks, by key multiset)
        nk = collections.Counter(A.key(r) for r in new7)
        ok = collections.Counter(A.key(r) for r in old7)
        only_new_keys = nk - ok
        only_old_keys = ok - nk
        out['earlier']['only_in_file_by_key'] = sum(only_new_keys.values())
        out['earlier']['only_in_earlier_by_key'] = sum(only_old_keys.values())
        left_new = dict(only_new_keys)
        for r, nr in zip(new7, new):
            k = A.key(r)
            if left_new.get(k, 0) > 0:
                left_new[k] -= 1
                diffs.append(('only-in-file', r[2], r[0], r[3][:80], 'offset %d, page %s' % (r[5], r[4])))
        left_old = dict(only_old_keys)
        for o, r in zip(old, old7):
            k = A.key(r)
            if left_old.get(k, 0) > 0:
                left_old[k] -= 1
                diffs.append(('only-in-earlier', o['company'], o['name_as_printed'], o['moore_1882_entry'][:80], '%s | %s' % (o['row_id'], o['source_locator'])))
    return out, diffs, d


def main(argv):
    keys = [u[0] for u in U.UNITS if u[3] is not None]
    if '--unit' in argv:
        sel = [argv[i + 1] for i, a in enumerate(argv) if a == '--unit']
        keys = [k for k in keys if k in sel]
    path = os.path.join(L.WS, 'reconciliation.json')
    res = {}
    if os.path.exists(path):
        res = json.load(open(path, encoding='utf-8')).get('units', {})
    os.makedirs(L.WS, exist_ok=True)
    for k in keys:
        out, diffs, d = reconcile_unit(k)
        res[k] = out
        if diffs:
            with open(os.path.join(L.WS, 'differences-%s.csv' % k[len('c-nc-'):]), 'w', encoding='utf-8', newline='') as f:
                w = csv.writer(f)
                w.writerow(['side', 'company', 'name_as_printed', 'remarks_first_80_characters', 'locator'])
                n_new = n_old = 0
                for row in diffs:
                    if row[0] == 'only-in-file':
                        n_new += 1
                        if n_new > MAXROWS:
                            continue
                    else:
                        n_old += 1
                        if n_old > MAXROWS:
                            continue
                    w.writerow(row)
                if n_new > MAXROWS or n_old > MAXROWS:
                    w.writerow(['(listing cut)', '', 'only-in-file rows: %d, only-in-earlier rows: %d; the first %d of each side are listed' % (n_new, n_old, MAXROWS), '', ''])
        e = out.get('earlier')
        print('%-44s lines %5d | second scan matched %5d only-file %4d only-second %4d | earlier %s' % (
            k[5:], out['lines'], out['second_scan']['matched'], out['second_scan']['only_in_file'], out['second_scan']['only_in_second'],
            ('%d lines, matched %d, only-file %d, only-earlier %d' % (e['lines'], e['matched'], e['only_in_file'], e['only_in_earlier'])) if e else 'no earlier file'), flush=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'format': 'conf-nc-reconciliation/1', 'about': __doc__.split('\n\n')[0], 'units': res}, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
