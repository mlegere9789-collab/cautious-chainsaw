"""Test candidate quotes against the local sources exactly as build.py does.
usage: python3 -I qtest.py OR27 [REPORT] 'quote' ['quote2' ...]      (a quote starting with OR27-... is taken as the report id when given first)
       python3 -I qtest.py JACOBS-1864 'quote' ...                  (any library id of build.py: LIB)
Prints FOUND (report/page/offset) or MISSING; for MISSING shows the longest prefix that is found."""
import sys, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout')
sys.path.insert(0, ROOT + '/tools/bt')
import build as B
from or27_lib import norm_query
src = sys.argv[1]; args = sys.argv[2:]
report = None
if src == 'OR27' and args and args[0].startswith('OR27-'):
    report = args[0]; args = args[1:]
for q in args:
    nq = norm_query(q)
    if src == 'OR27':
        hits = B.F.verify(nq)
        if report: hits = [h for h in hits if h['record'] == report]
        if hits:
            print('FOUND  %s p.%s @%s-%s  %r' % (hits[0]['record'], hits[0]['page'], hits[0]['start'], hits[0]['end'], q[:80]))
            continue
        # longest found prefix by words
        w = nq.split(' ')
        best = 0
        for k in range(len(w), 2, -1):
            h = B.F.verify(' '.join(w[:k]))
            if h and (not report or any(x['record'] == report for x in h)):
                best = k; break
        print('MISSING %r | longest found prefix (%d of %d words): %r' % (q[:60], best, len(w), ' '.join(w[:best])[:100]))
    else:
        raw, nt, nm, rel, sha = B.lib_text(src)
        i = nt.find(nq)
        if i >= 0:
            print('FOUND  @%d  %r' % (nm[i], q[:80]))
        else:
            w = nq.split(' ')
            best = 0
            for k in range(len(w), 2, -1):
                if nt.find(' '.join(w[:k])) >= 0: best = k; break
            print('MISSING %r | longest found prefix (%d of %d words): %r' % (q[:60], best, len(w), ' '.join(w[:best])[:100]))
