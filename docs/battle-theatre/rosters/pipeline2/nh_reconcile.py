"""Reconcile the New Hampshire unit files of the Ayling register with the earlier roll files (rosters/data/NE/new-hampshire/*.csv), step 5 of the
production plan.  Writes GOVERNANCE/horde/ws-rosters/union-nh/differences-<unit>.csv and reconciliation.json.  Nothing is resolved by guessing: a name
is compared by its letters only (lower case), the earlier files and the new files are two readings of the same OCR text, and every name present in only
one of them is listed with its locator.   python3 -I nh_reconcile.py   (from any directory)
"""
import sys, os, re, csv, json, gzip, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
OLD = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NE', 'new-hampshire')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-nh')
UNITS = [('u-nh-2nd-new-hampshire-infantry', '2nd-new-hampshire-infantry', '2nd-new-hampshire-volunteer-infantry.csv'),
         ('u-nh-5th-new-hampshire-infantry', '5th-new-hampshire-infantry', '5th-new-hampshire-volunteer-infantry.csv'),
         ('u-nh-12th-new-hampshire-infantry', '12th-new-hampshire-infantry', '12th-new-hampshire-volunteer-infantry.csv'),
         ('u-nh-1st-new-hampshire-battery', '1st-new-hampshire-battery', '1st-new-hampshire-volunteer-light-battery.csv')]


def key_of(name):
    return re.sub(r'[^a-z]', '', name.lower())


def main():
    os.makedirs(OUT, exist_ok=True)
    summary = {}
    for ukey, fname, oldcsv in UNITS:
        head, segs, meta = R.read_unit(os.path.join(D2, 'union', 'nh', fname + '.jsonl.gz'))
        mine = [r for _, rr in segs for r in rr]
        old = list(csv.DictReader(open(os.path.join(OLD, oldcsv), newline='', encoding='utf-8')))
        mc, oc = collections.defaultdict(list), collections.defaultdict(list)
        for r in mine:
            mc[key_of(r[0])].append(r)
        for i, r in enumerate(old):
            oc[key_of(r['name_as_printed'])].append((i + 2, r))                     # +2: header line and 1-based line number in the csv
        rows_out = []
        only_mine = only_old = 0
        for k in sorted(set(mc) | set(oc)):
            a, b = mc.get(k, []), oc.get(k, [])
            if len(a) > len(b):
                for r in a[len(b):]:
                    only_mine += 1
                    rows_out.append(['new-file-only', r[0], r[2], 'offset %d, page %s' % (r[5], r[4]), r[3][:90]])
            elif len(b) > len(a):
                for ln, r in b[len(a):]:
                    only_old += 1
                    rows_out.append(['earlier-file-only', r['name_as_printed'], r['company'], 'csv line %d' % ln, r['remarks_as_printed'][:90]])
        with open(os.path.join(OUT, 'differences-%s.csv' % fname), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['side', 'name_as_printed', 'company', 'locator', 'remarks_start'])
            w.writerows(rows_out)
        by_co_new = collections.Counter(r[2] or '-' for r in mine)
        by_co_old = collections.Counter(r['company'] or '-' for r in old)
        summary[ukey] = {'rows_new_file': len(mine), 'rows_earlier_file': len(old), 'names_matched': sum(min(len(mc.get(k, [])), len(oc.get(k, []))) for k in set(mc) | set(oc)),
                         'only_in_new_file': only_mine, 'only_in_earlier_file': only_old,
                         'company_counts_new': dict(sorted(by_co_new.items())), 'company_counts_earlier': dict(sorted(by_co_old.items()))}
        print(ukey, summary[ukey]['rows_new_file'], summary[ukey]['rows_earlier_file'], 'matched', summary[ukey]['names_matched'], 'only new', only_mine, 'only earlier', only_old)
    json.dump(summary, open(os.path.join(OUT, 'reconciliation.json'), 'w', encoding='utf-8'), indent=1)


if __name__ == '__main__':
    main()
