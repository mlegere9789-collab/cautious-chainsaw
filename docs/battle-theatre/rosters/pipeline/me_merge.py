"""Merge the 1 Dec 1863 return (me20_classified) with the 1898 participants list (meg20_people) for the 20th Maine."""
import json, re, difflib
from collections import Counter, defaultdict

ret = json.load(open('../cache/me20_classified.json'))
par = json.load(open('../cache/meg20_people.json'))


def norm_tokens(s):
    s = re.sub(r'\b(jr|sr|2d|2nd|3d)\b\.?', '', s, flags=re.I)
    s = re.sub(r"[^A-Za-z' ]", ' ', s)
    return [t for t in s.split() if t]


def ret_key(r):
    t = norm_tokens(r['name'])
    if not t:
        return None
    if r['sec'] == 'privates' or r['sec'] == 'joined':
        sur, giv = t[0], t[1:]
    else:
        sur, giv = t[-1], t[:-1]
    return sur.lower(), (giv[0].lower() if giv else ''), (''.join(x[0] for x in giv)).lower()


def par_key(p):
    t = norm_tokens(p['name'])
    if not t:
        return None
    return t[-1].lower(), (t[0].lower() if len(t) > 1 else ''), (''.join(x[0] for x in t[:-1])).lower()


P = [p for p in par if p.get('kind') in ('private', 'nco', 'detached') and p.get('name')]
for p in P:
    p['_k'] = par_key(p)
for r in ret:
    r['_k'] = ret_key(r)

# index return rows by company+surname
idx = defaultdict(list)
for i, r in enumerate(ret):
    if r['_k']:
        idx[(r['co'], r['_k'][0][:4])].append(i)
matched = 0
unmatched = []
for p in P:
    if not p['_k']:
        continue
    cands = idx.get((p['co'], p['_k'][0][:4]), [])
    best = None
    for i in cands:
        r = ret[i]
        s1 = difflib.SequenceMatcher(None, p['_k'][0], r['_k'][0]).ratio()
        s2 = difflib.SequenceMatcher(None, p['_k'][1], r['_k'][1]).ratio() if p['_k'][1] and r['_k'][1] else 0.5
        ini = 1.0 if (p['_k'][2][:1] == r['_k'][2][:1]) else 0.0
        sc = s1 * 0.5 + s2 * 0.4 + ini * 0.1
        if best is None or sc > best[0]:
            best = (sc, i)
    if best and best[0] >= 0.80:
        r = ret[best[1]]
        r.setdefault('participant', []).append(dict(name=p['name'], res=p['res'], kind=p['kind'], score=round(best[0], 2)))
        matched += 1
    else:
        unmatched.append(p)
print('participants (named, privates/NCO/detached):', len(P), 'matched to a 1863 return row in same company:', matched, 'unmatched:', len(unmatched))
json.dump([dict(name=p['name'], co=p['co'], res=p['res'], kind=p['kind']) for p in unmatched], open('../cache/meg20_unmatched.json', 'w'), indent=0)

# combine labels
out = []
for r in ret:
    lab, why = r['label'], r['why']
    if r.get('participant'):
        if lab == 'Absent-Documented':
            lab, why = 'Unknown', 'CONFLICT: return says absent/separated (' + r['why'] + ') but 1898 participants list names him'
        else:
            lab, why = 'Present-Documented', 'listed in Maine at Gettysburg (1898) 20th Regiment Participants; ' + ('return remark: ' + r['remarks'][:50] if r['remarks'] else 'return: no remark')
    elif lab == 'Present-Probable':
        lab, why = 'Unknown', 'on the 1 Dec 1863 return, no separation before the battle, but NOT named in the 1898 participants list (on roll, presence undetermined)'
    o = {k: v for k, v in r.items() if k not in ('_k',)}
    o['label'], o['why'] = lab, why
    out.append(o)
json.dump(out, open('../cache/me20_final.json', 'w'), indent=0)
print(Counter(o['label'] for o in out))
print(Counter((o['co'], o['label']) for o in out if o['label'] == 'Present-Documented'))
