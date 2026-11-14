"""regex search over the local library texts (build.LIB): python3 -I libgrep.py 'regex' [ctx=200] [max_per_text=4] [id-regex]"""
import sys, re
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B
pat = re.compile(sys.argv[1], re.I)
ctx = int(sys.argv[2]) if len(sys.argv) > 2 else 200
mx = int(sys.argv[3]) if len(sys.argv) > 3 else 4
idre = re.compile(sys.argv[4]) if len(sys.argv) > 4 else None
tot = 0
for sid in sorted(B.LIB):
    if sid.startswith('OR-') or sid.startswith('ORSER'): continue
    if idre and not idre.search(sid): continue
    raw, nt, nm, rel, sha = B.lib_text(sid)
    n = 0
    for m in pat.finditer(nt):
        if n == 0: print('## ' + sid)
        n += 1; tot += 1
        if n <= mx: print('   @%d: %s' % (nm[m.start()], re.sub(r'\s+', ' ', nt[max(0, m.start() - ctx): m.end() + ctx])))
    if n > mx: print('   ... %d hits in total' % n)
print('TOTAL', tot)
