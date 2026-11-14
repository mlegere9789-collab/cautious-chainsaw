"""Show raw text of a library source around a raw offset: python3 -I libctx.py SID OFFSET [before=500] [after=700]"""
import sys, re, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B
sid = sys.argv[1]; off = int(sys.argv[2]); b = int(sys.argv[3]) if len(sys.argv) > 3 else 500; a = int(sys.argv[4]) if len(sys.argv) > 4 else 700
raw, nt, nm, rel, sha = B.lib_text(sid)
print(sid, rel, off)
print(re.sub(r'\s+', ' ', raw[max(0, off - b): off] + ' >>> ' + raw[off: off + a]))
