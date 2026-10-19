import json, re, sys
sys.path.insert(0, '.')
from dedupe import *
O = json.load(open('../cache/wis6_classified.json'))
recs = [o for o in O if o['co'] not in ('FS',) or True]
for o in recs:
    if o['sec'] == 'officers' and ',' not in o['name']:
        o['_ord'] = 'gs'
ex, var = find_dupes(recs, 'sf')
# classify exact pairs: transfer evidence ("From Co." in one, "Trans" in other) vs other
transfer, other = [], []
for a, b in ex:
    ra, rb = recs[a], recs[b]
    if re.search(r'From Co|Trans', ra['remarks'] + ' ' + rb['remarks']) and ra['co'] != rb['co']:
        transfer.append((a, b))
    else:
        other.append((a, b))
print('records', len(recs))
print('exact same-name pairs', len(ex), 'with transfer evidence', len(transfer), 'other (possible two men / re-enlistment)', len(other))
print('spelling-variant pairs', len(var))
# unique persons estimate: merge transfer pairs
parent = list(range(len(recs)))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
for a, b in transfer:
    parent[find(a)] = find(b)
roots = set(find(i) for i in range(len(recs)) if recs[i]['label'] != 'Duplicate-Xref')
print('unique persons after merging transfers and dropping Xref rows:', len(roots))
json.dump(dict(transfer=[(recs[a]['name'], recs[a]['co'], recs[b]['name'], recs[b]['co']) for a, b in transfer][:40],
               variants=[(recs[a]['name'], recs[a]['co'], recs[b]['name'], recs[b]['co']) for a, b in var][:60],
               other=[(recs[a]['name'], recs[a]['co'], recs[b]['name'], recs[b]['co'], recs[a]['remarks'][:40], recs[b]['remarks'][:40]) for a, b in other][:40]),
          open('../cache/wis6_dupes.json', 'w'), indent=1)
