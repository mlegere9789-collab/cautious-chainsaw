import json, os
from common import *
sm = json.load(open(os.path.join(TMP, 'ref', 'summits.json')))
# drop the quarry area and thin
sm = [x for x in sm if x['prom'] >= 10 and 303700 < x['e'] < 312300 and 4405750 < x['n'] < 4414600 and not (310100 < x['e'] < 310900 and 4407600 < x['n'] < 4408300)]
sm.sort(key=lambda x: -x['prom']); keep = []
for x in sm:
    if all((x['e'] - k['e']) ** 2 + (x['n'] - k['n']) ** 2 > 300 ** 2 for k in keep): keep.append(x)
keep.sort(key=lambda k: (-(k['n'] // 600), k['e']))
for i, k in enumerate(keep): k['id'] = 'S%03d' % i; k['a'] = 'summit z=%.0f' % k['z']; k['b'] = 'prom %.0f' % k['prom']
json.dump(keep, open(os.path.join(TMP, 'ref', 'summit_cands.json'), 'w'))
print(len(keep))
