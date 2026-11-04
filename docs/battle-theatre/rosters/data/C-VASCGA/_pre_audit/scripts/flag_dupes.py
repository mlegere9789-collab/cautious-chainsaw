"""Flags same-name pairs inside one unit file (same company, same normalised printed name) with a dup_group id and the flag same-name-pair.
Nothing is merged and no row is dropped (two men can share a name; the pilot found 10 to 67 such pairs per regiment). Rows already grouped by a parser
(officer cross-references in the Salley volume) keep their group. Run after the parsers: python -X utf8 flag_dupes.py"""
import csv, glob, os, re, collections, sys
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import OUT, COLS

tot = 0
for f in sorted(glob.glob(OUT + 'csv/*.csv')):
    rows = list(csv.DictReader(open(f, encoding='utf-8')))
    g = collections.defaultdict(list)
    for i, r in enumerate(rows):
        if r['dup_group'] or r['presence_label'] == 'Duplicate-Xref':
            continue
        key = (r['unit_id'], r['company'], re.sub(r'[^a-z]', '', r['name_as_printed'].lower()))
        if len(key[2]) >= 4:
            g[key].append(i)
    n = 0
    base = os.path.basename(f).split('.')[0]
    for key, idx in g.items():
        if len(idx) > 1:
            n += 1
            for i in idx:
                rows[i]['dup_group'] = '%s-sn%d' % (base, n)
                fl = [x for x in rows[i]['parse_flags'].split(';') if x]
                if 'same-name-pair' not in fl:
                    fl.append('same-name-pair')
                rows[i]['parse_flags'] = ';'.join(sorted(set(fl)))
    tot += n
    with open(f, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    if n:
        print(os.path.basename(f), n, 'same-name groups')
print('total groups', tot)
