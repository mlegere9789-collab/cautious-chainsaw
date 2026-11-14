"""Quote tester for shard tl-03 close-out.
  python3 -I tmp/tl-03/tools/q.py "verbatim quote" [--src OR|SID[,SID]] [--ctx 0]
Prints where the (whitespace-normalised, case-sensitive) quote occurs verbatim: OR report id + printed page, or library id + offset."""
import os, sys, re, json
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-03', 'tools'))
from or27_lib import norm_query
import or27_find as F
import ws9lib as W

def main():
    args = sys.argv[1:]
    src = 'OR'; ctx = 0
    if '--src' in args:
        i = args.index('--src'); src = args[i + 1]; del args[i:i + 2]
    if '--ctx' in args:
        i = args.index('--ctx'); ctx = int(args[i + 1]); del args[i:i + 2]
    for q in args:
        qn = norm_query(q)
        print('QUOTE:', qn[:100])
        if src == 'OR':
            hs = F.verify(qn)
            if not hs: print('   OR: NOT FOUND')
            for h in hs:
                print('   OR27 pt%d %s p.%s @%d-%d  %s' % (h['part'], h['record'], h['page'], h['start'], h['end'], h['who'][:50]))
                if ctx:
                    P = F.get_part(h['part']); print('      ...' + P.text[max(0, h['start'] - ctx):h['end'] + ctx].replace('\n', ' ') + '...')
        else:
            for sid in src.split(','):
                hs = W.find(sid, qn)
                if not hs: print('   %s: NOT FOUND' % sid)
                for a, b in hs:
                    print('   %s @%d-%d' % (sid, a, b))
                    if ctx: print('      ...' + W.raw(sid)[max(0, a - ctx):b + ctx].replace('\n', ' ') + '...')

if __name__ == '__main__':
    main()
