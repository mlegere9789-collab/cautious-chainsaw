"""Builds units.csv, stats.json and the unit reconciliation for family C-VASCGA from the csv/ files. Run after all parsers.
Run: python -X utf8 finalize.py"""
import csv, glob, json, os, re, collections, hashlib, datetime, sys
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import OUT, COLS

oob = json.load(open(OUT + 'oob_scope.json'))['units']
files = sorted(glob.glob(OUT + 'csv/*.csv'))
by_unit = collections.defaultdict(list)       # unit -> list of (file, rows)
for f in files:
    base = os.path.basename(f)
    uid = base.split('.')[0] if base.count('.') > 1 else base[:-4]
    rows = list(csv.DictReader(open(f, encoding='utf-8')))
    for r in rows:
        assert set(r.keys()) == set(COLS), (f, r.keys())
    by_unit[uid].append((base, rows))

PRIMARY = {'C-4GA': 'full', 'C-12GA': 'full', 'C-21GA': 'full', 'C-44GA': 'full', 'C-2SC': 'full', 'C-3SC': 'full', 'C-1VA': 'full',
           'C-11GA': 'full-poor-ocr', 'C-9VA-CAV': 'full-names-only', 'C-61GA': 'partial-9-of-10-companies', 'C-14SC': 'partial-1-of-10-companies',
           'C-18VA': 'partial-1-of-10-companies', 'C-ART-Page': 'full-battery'}
unit_rows = []
tot_labels = collections.Counter()
tot_status = collections.Counter()
nrows = 0
named_units = 0
for u in oob:
    uid = u['id']
    srcs = by_unit.get(uid, [])
    allrows = [r for _, rs in srcs for r in rs]
    lab = collections.Counter(r['presence_label'] for r in allrows)
    stat = collections.Counter(r['roll_status'] for r in allrows)
    names = [r for r in allrows if r['presence_label'] != 'Duplicate-Xref']
    npd = sum(1 for r in names if r['presence_label'] == 'Present-Documented')
    cov = PRIMARY.get(uid)
    kinds = []
    for b, rs in srcs:
        kinds.append(b)
    if cov is None and srcs:
        cov = 'supplementary-only (' + ', '.join(sorted({b.split('.', 1)[1].rsplit('.', 1)[0] if b.count('.') > 1 else b for b, _ in srcs})) + ')'
    elif cov is None:
        cov = 'no-names'
    s = u.get('strength')
    status = ''
    if cov in ('full', 'full-poor-ocr', 'full-battery') and s:
        status = 'Short' if npd < 0.97 * s else 'Reconciled-or-Contested-check'
        status = 'Short (named present %d against OOB strength %d; the OOB value is second-hand from Busey and Martin)' % (npd, s) if npd < s else 'Contested (named present %d exceeds OOB strength %d)' % (npd, s)
    elif s:
        status = 'Short (unit roll not recovered in full)'
    if allrows:
        named_units += 1
    unit_rows.append(dict(unit_id=uid, designation=u['designation'], state=u['state'], branch=u['branch'], oob_strength_second_hand=s, oob_casualties=u.get('casualties'),
                          coverage=cov, files=';'.join(b for b, _ in srcs), rows=len(allrows), persons_excluding_xref=len(names),
                          present_documented=npd, absent_documented=sum(1 for r in names if r['presence_label'] == 'Absent-Documented'),
                          unknown=sum(1 for r in names if r['presence_label'] == 'Unknown'), unreadable_or_ambiguous=stat.get('unreadable-or-ambiguous', 0),
                          reconciliation=status))
    for r in allrows:
        tot_labels[r['presence_label']] += 1
        tot_status[r['roll_status']] += 1
    nrows += len(allrows)

with open(OUT + 'units.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(unit_rows[0].keys()))
    w.writeheader()
    w.writerows(unit_rows)

# names = distinct (unit, normalised name, company) across all files, excluding cross-references
keyset = set()
for uid, srcs in by_unit.items():
    for b, rs in srcs:
        for r in rs:
            if r['presence_label'] == 'Duplicate-Xref':
                continue
            keyset.add((uid, re.sub(r'[^a-z]', '', r['name_as_printed'].lower()), r['company']))
primary_rows = sum(len(rs) for uid, srcs in by_unit.items() for b, rs in srcs if b.count('.') == 1)
branch = collections.Counter(u['branch'] for u in oob)
branch_named = collections.Counter(r['branch'] for r in unit_rows if r['rows'] > 0)
flagged_garbled = sum(1 for srcs in by_unit.values() for b, rs in srcs for r in rs if 'name-garbled' in r['parse_flags'])
unread = tot_status.get('unreadable-or-ambiguous', 0)
stats = dict(family='C-VASCGA', generated=datetime.date.today().isoformat(),
             units_in_oob=len(oob), units_in_oob_by_branch=dict(branch), units_with_names=named_units, units_with_names_by_branch=dict(branch_named),
             units_with_full_roster_of_the_unit=sum(1 for r in unit_rows if r['coverage'].startswith('full')),
             units_with_partial_roster=sum(1 for r in unit_rows if r['coverage'].startswith('partial')),
             units_with_supplementary_lists_only=sum(1 for r in unit_rows if r['coverage'].startswith('supplementary')),
             units_without_names=sum(1 for r in unit_rows if r['coverage'] == 'no-names'),
             rows=nrows, name_rows_excluding_crossrefs=sum(1 for r in unit_rows for _ in range(r['persons_excluding_xref'])),
             distinct_unit_name_company_keys=len(keyset),
             share_by_label={k: round(v / nrows, 4) for k, v in tot_labels.items()}, count_by_label=dict(tot_labels),
             count_by_roll_status=dict(tot_status),
             rows_unreadable_or_ambiguous=unread, share_unreadable_or_ambiguous=round(unread / nrows, 4),
             rows_with_name_garbled_flag=flagged_garbled, share_name_garbled_flag=round(flagged_garbled / nrows, 4))
json.dump(stats, open(OUT + 'stats.json', 'w'), indent=1)
print(json.dumps(stats, indent=1))
