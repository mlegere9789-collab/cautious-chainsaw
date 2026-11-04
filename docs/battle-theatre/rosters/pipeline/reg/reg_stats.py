"""Per-family statistics for REG -> data/REG/stats.json"""
import csv, os, json, collections, sys, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
OOB = os.path.join(ROOT, 'baseline', 'dist', 'data', 'oob')

scope = []
for f in sorted(glob.glob(os.path.join(OOB, 'union_regiments_*.json'))):
    for r in json.load(open(f, encoding='utf-8'))['regiments']:
        if r['state'] in ('Delaware', 'Maryland', 'Rhode Island', 'West Virginia', 'Regular Army'):
            scope.append((r['regiment_id'], r['designation'], r.get('strength')))
d = json.load(open(os.path.join(OOB, 'union_cavalry_artillery.json'), encoding='utf-8'))
for r in d['regiments']:
    if r['state'] in ('Delaware', 'Maryland', 'Rhode Island', 'West Virginia', 'Regular Army'):
        scope.append((r['regiment_id'], r['designation'], r.get('strength')))
for r in d['horse_artillery']:
    scope.append((r['battery_id'], r['designation'], r.get('strength')))
a = json.load(open(os.path.join(OOB, 'union_artillery.json'), encoding='utf-8'))


def walk(o):
    if isinstance(o, dict):
        if 'battery_id' in o:
            yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


for b in walk(a):
    des = b['designation']
    if 'US Artillery' in des or 'Rhode Island' in des or 'West Virginia' in des:
        scope.append((b['battery_id'], des, b.get('strength')))

files = {}
for p in glob.glob(os.path.join(OUT, '*.csv')):
    n = os.path.basename(p)
    if n.startswith('heitman'):
        continue
    files[n] = list(csv.DictReader(open(p, encoding='utf-8')))

per_unit = {}
lab_all = collections.Counter()
rs_all = collections.Counter()
rows_total = 0
unreadable = 0
persons = set()
for n, rows in files.items():
    c = collections.Counter(r['presence_label'] for r in rows)
    cs = collections.Counter(r['roll_status'] for r in rows)
    per_unit[n] = dict(rows=len(rows), labels=dict(c), roll_status=dict(cs))
    shared_dup = n in ('u-3us-2.csv', 'u-12us-2.csv')  # same regiment-level rows as the -1 file
    for r in rows:
        if r['presence_label'] == 'Duplicate-Xref' or shared_dup:
            continue
        lab_all[r['presence_label']] += 1
        rs_all[r['roll_status']] += 1
        rows_total += 1
        if r['roll_status'] == 'unreadable-or-ambiguous':
            unreadable += 1
        persons.add((r['unit_id'].split('-officers')[0], r['name_as_printed'].lower()))

# map OOB id -> file names
def has(uid):
    base = uid.lower().replace('_', '-')
    cands = [base + '.csv', base + '-officers.csv']
    if uid == 'U-1WV-CAV-b':
        cands = ['u-1wv-cav.csv']  # the detachment shares the regiment roll
    return [c for c in cands if c in files and len(files[c]) > 0]


covered = {}
missing = []
for uid, des, st in scope:
    h = has(uid)
    if h:
        covered[uid] = h
    else:
        missing.append(uid)
recon = {}
for uid, des, st in scope:
    fl = covered.get(uid, [])
    pd = onroll = absent = unk = 0
    for n in fl:
        for r in files[n]:
            if r['presence_label'] == 'Present-Documented':
                pd += 1
            elif r['presence_label'] == 'Absent-Documented':
                absent += 1
            elif r['roll_status'] == 'on-roll-undetermined':
                onroll += 1
            elif r['presence_label'] == 'Unknown':
                unk += 1
    recon[uid] = dict(designation=des, oob_strength=st, files=fl, named_present_documented=pd, on_roll_undetermined=onroll, absent_documented=absent, unreadable_unknown=unk,
                      status='Short: strength %s per the repository OOB (second-hand from Busey and Martin); %d named present; the remainder is not named' % (st, pd))
stats = dict(reconciliation=recon, 
    family='REG', units_in_oob=len(scope), units_with_names=len(covered), oob_ids_without_names=missing,
    names_rows_distinct_unit_name=len(persons), rows_total_published=rows_total,
    rows_unreadable_or_ambiguous=unreadable, unreadable_share=round(unreadable / rows_total, 4) if rows_total else None,
    share_by_label={k: round(v / rows_total, 4) for k, v in lab_all.items()}, counts_by_label=dict(lab_all), counts_by_roll_status=dict(rs_all),
    per_file=per_unit, oob_unit_to_files=covered,
    note='rows = one per name as printed per source; persons are not merged across sources; roster files (MD, RI, WV) carry whole-war rolls; officer files carry only officers named by OR 27/1 or Heitman.')
qdir = os.path.join(OUT, '_quarantine')   # AUDIT 2026-10-30: rows that were page headers or narrative text, tombstoned with a reason (R-G7)
stats['rows_quarantined_by_audit'] = {os.path.basename(p): len(list(csv.DictReader(open(p, encoding='utf-8')))) for p in sorted(glob.glob(os.path.join(qdir, '*.csv')))}
stats['rows_quarantined_total'] = sum(stats['rows_quarantined_by_audit'].values())
json.dump(stats, open(os.path.join(OUT, 'stats.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps({k: v for k, v in stats.items() if k not in ('per_file', 'oob_unit_to_files')}, indent=1))
