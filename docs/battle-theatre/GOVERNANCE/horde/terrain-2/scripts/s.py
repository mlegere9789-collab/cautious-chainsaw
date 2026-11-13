"""Quick search CLI.  python3 -I s.py or "regex" [part ...] | lib "regex" [sid-prefix ...] | nps "regex" [sid-prefix ...]   (-C n for context)"""
import sys, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
args = sys.argv[1:]
C = 220
if '-C' in args:
    i = args.index('-C'); C = int(args[i + 1]); del args[i:i + 2]
M = 12
if '-M' in args:
    i = args.index('-M'); M = int(args[i + 1]); del args[i:i + 2]
mode, pat, rest = args[0], args[1], args[2:]
if mode == 'or':
    parts = tuple(int(x) for x in rest) or (1, 2)
    for h in tlib.or_search(pat, parts, C, maxn=M):
        print('[%s] %s' % (h['cite'], h['start']))
        print('   ...' + h['ctx'] + '...')
elif mode == 'lib':
    ids = [s for s in sorted(tlib.lib_ids()) if (not rest or any(s.startswith(r) for r in rest)) and not s.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER'))]
    for sid in ids:
        for h in tlib.lib_search(sid, pat, C, maxn=M):
            print('[%s hint p.%s off %s]' % (h['sid'], h['hint'], h['off']))
            print('   ...' + h['ctx'] + '...')
elif mode == 'libnews':
    ids = [s for s in sorted(tlib.lib_ids()) if s.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER'))]
    for sid in ids:
        for h in tlib.lib_search(sid, pat, C, maxn=M):
            print('[%s off %s]' % (h['sid'], h['off']))
            print('   ...' + h['ctx'] + '...')
elif mode == 'nps':
    ids = [s for s in tlib.nps_ids() if (not rest or any(s.startswith(r) for r in rest))]
    for sid in ids:
        for h in tlib.nps_search(sid, pat, C, maxn=M):
            print('[%s pdf p.%s off %s]' % (h['sid'], h['pdf_page'], h['off']))
            print('   ...' + h['ctx'] + '...')
