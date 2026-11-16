"""resolve the quote specs of the fifth start to exact strings of the builder's normalised view (writes quotes5.json)"""
import sys, re, json, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B, extra_sources as X
SPECS = json.load(open(sys.argv[1], encoding='utf-8'))
out = {}
for key, (sid, a, b) in SPECS.items():
    X.register(B.LIB, B.FIXED_PAGE, B.LABEL, [sid])
    raw, nt, nm, rel, sha = B.lib_text(sid)
    ma = re.search(a, nt)
    if not ma:
        print('NOT FOUND start', key); continue
    mb = re.search(b, nt[ma.start():])
    if not mb:
        print('NOT FOUND end', key); continue
    q = nt[ma.start(): ma.start() + mb.end()]
    n = nt.count(q)
    out[key] = q
    print('%-14s %-32s n=%d len=%d' % (key, sid, n, len(q)))
    print('     ' + q[:420])
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
