#!/usr/bin/env python3
"""Gate Q25 inputs, recounted: the three status files and the three acquisition ledgers of GOVERNANCE/library.  Read-only; prints one JSON object.
    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5/library_counts.py"""
import json, os, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
L = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library')
J = lambda f: json.load(open(os.path.join(L, f), encoding='utf-8'))
def rows(d):
    x = d.get('sources', d) if isinstance(d, dict) else d
    return x if isinstance(x, list) else [dict(v, id=k) for k, v in x.items()]
st = {f: rows(J(f)) for f in ('status.json', 'status_2.json', 'status_3.json')}
ids = [set(r['id'] for r in v) for v in st.values()]
allrows = [r for v in st.values() for r in v]
out = {'entries_per_file': {f: len(v) for f, v in st.items()}, 'entries': len(allrows), 'distinct_ids': len(set().union(*ids)),
       'ids_in_both_of_the_first_two': len(ids[0] & ids[1]), 'ids_of_the_third_also_in_an_earlier_file': len(ids[2] & (ids[0] | ids[1])),
       'status_words': len(set(r['status'] for r in allrows)), 'status_counts': dict(collections.Counter(r['status'] for r in allrows).most_common()),
       'status_3': [(r['id'], r['status']) for r in st['status_3.json']]}
for f in ('acquired.json', 'acquired_2.json', 'acquired_3.json'):
    d = J(f)
    out[f] = {k: len(v) for k, v in d.items() if isinstance(v, (list, dict))}
a3 = J('acquired_3.json')
out['acquired_3_items_by_task'] = dict(collections.Counter(i.get('task') for i in a3['items']))
out['acquired_3_blocked_or_failed'] = [(b.get('id'), b.get('status')) for b in a3['blocked_or_failed']]
out['files'] = sorted(os.listdir(L))
print(json.dumps(out, indent=1))
