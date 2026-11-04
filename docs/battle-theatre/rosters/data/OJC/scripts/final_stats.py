import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csv, json, glob, collections, re
from ojc_common import *
import emit
OOB = os.path.join(REPO, 'baseline', 'dist', 'data', 'oob')
units = {}
def walk(o):
    if isinstance(o, dict):
        for key in ('regiment_id', 'battery_id'):
            if key in o and (o.get('state') in ('Ohio', 'New Jersey', 'Connecticut') or re.search(r'Ohio|New Jersey|Connecticut', str(o.get('designation', '')))):
                units[o[key]] = dict(designation=o.get('designation'), strength=o.get('strength'), casualties=o.get('casualties'), brigade=o.get('parent_brigade_id'))
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in glob.glob(os.path.join(OOB, 'union_*.json')):
    walk(json.load(open(f, encoding='utf8')))
stats = {}
tot = collections.Counter(); totl = collections.Counter(); totrs = collections.Counter()
for f in sorted(glob.glob(os.path.join(DATA, '*.csv'))):
    if os.path.basename(f).startswith('OR27'): continue
    R = list(csv.DictReader(open(f, encoding='utf8')))
    if not R: continue
    uid = R[0]['unit_id']
    st = emit.stats_of(R)
    st['file'] = os.path.basename(f); st['source_ids'] = sorted(set(r['source_id'] for r in R))
    o = units.get(uid, {})
    st['oob_designation'] = o.get('designation'); st['oob_strength'] = o.get('strength'); st['oob_casualties'] = o.get('casualties')
    pd = st['labels'].get('Present-Documented', 0)
    st['reconciliation'] = ('Short: %d named present against an OOB strength of %s (names not recovered: %s; count, not invented names)' % (pd, o.get('strength'), (o.get('strength') or 0) - pd)) if (o.get('strength') or 0) >= pd else 'Contested: %d named present exceed the OOB strength %s' % (pd, o.get('strength'))
    stats[uid] = st
    tot['rows'] += st['rows']; tot['name_flagged'] += st['name_flagged_rows']; tot['unreadable'] += st['unreadable_or_ambiguous_rows']
    for k, v in st['labels'].items(): totl[k] += v
    for k, v in st['roll_status'].items(): totrs[k] += v
missing = [u for u in units if u not in stats]
fam = dict(family='OJC', units_in_oob=len(units), units_with_names=len(stats), names=tot['rows'], rows_unreadable_or_ambiguous=tot['unreadable'],
           unreadable_share=round(tot['unreadable'] / tot['rows'], 4), name_flagged_rows=tot['name_flagged'], share_by_label={k: round(v / tot['rows'], 4) for k, v in totl.items()},
           labels=dict(totl), roll_status=dict(totrs), units_in_oob_without_names=missing, units=stats)
json.dump(fam, open(os.path.join(DATA, 'stats.json'), 'w', encoding='utf8'), indent=1)
print(json.dumps({k: v for k, v in fam.items() if k != 'units'}, indent=1))
for uid, st in stats.items(): print(uid, st['rows'], st['labels'].get('Present-Documented', 0), st['oob_strength'], st['oob_casualties'], round(st['unreadable_share'], 3))
