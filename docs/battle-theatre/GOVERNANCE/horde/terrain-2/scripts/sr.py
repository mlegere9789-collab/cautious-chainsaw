"""Search the OR within a range of report ids.  python3 -I sr.py "regex" R076-R135 [-C 250] [-M 100] [--part 2]"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
args = sys.argv[1:]
C = 250; M = 100; part = 1
for flag, name in (('-C', 'C'), ('-M', 'M'), ('--part', 'part')):
    if flag in args:
        i = args.index(flag); v = int(args[i + 1]); del args[i:i + 2]
        if name == 'C': C = v
        elif name == 'M': M = v
        else: part = v
pat, rng = args[0], args[1]
a, b = rng.split('-')
lo, hi = int(a[1:]), int(b[1:])
n = 0
for h in tlib.or_search(pat, (part,), C, maxn=100000):
    m = re.search(r'OR27-%d-[RSD](\d+)' % part, h['cite'])
    if not m: continue
    k = int(m.group(1))
    if lo <= k <= hi:
        print('[%s] %s' % (h['cite'], h['start']))
        print('   ...' + h['ctx'] + '...')
        n += 1
        if n >= M: break
print('hits', n)
