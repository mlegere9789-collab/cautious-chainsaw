"""quote probe: python3 -I qp.py SID REGEX [CTX]  -> normalised context (the view the builder matches quotes in) with page by the builder's rules"""
import sys, re, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B, extra_sources as X
sid, pat = sys.argv[1], sys.argv[2]
ctx = int(sys.argv[3]) if len(sys.argv) > 3 else 200
X.register(B.LIB, B.FIXED_PAGE, B.LABEL, [sid])
raw, nt, nm, rel, sha = B.lib_text(sid)
n = 0
for m in re.finditer(pat, nt, re.I):
    n += 1
    gp, ph, nh = B.lib_page_generic(sid, raw, nm[m.start()])
    pg = B.FIXED_PAGE.get(sid, (None, None))[0] or gp or B.lib_page(sid, nt, m.start())[0]
    print('@%d (raw %d) page %s [prev head %s | next head %s]' % (m.start(), nm[m.start()], pg, ph and (ph[0], ph[2][:30]), nh and (nh[0], nh[2][:30])))
    print('   ' + nt[max(0, m.start() - ctx):m.end() + ctx])
print('hits', n)
