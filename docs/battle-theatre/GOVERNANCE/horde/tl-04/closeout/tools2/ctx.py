"""Show the normalised source text around the citations of a row:   python3 -I tmp/tl-04/tools2/ctx.py T1-174 w_march [before=700] [after=900]
The stored quote is marked [[ ]].  Use it to extend a quote to the whole claim (the extension must stay verbatim)."""
import sys, os, json, re
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
rid, key = sys.argv[1], sys.argv[2]
bef = int(sys.argv[3]) if len(sys.argv) > 3 else 700
aft = int(sys.argv[4]) if len(sys.argv) > 4 else 900
src = sys.argv[5] if len(sys.argv) > 5 else 'timeline_corrections/tl-04.jsonl'
G = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE')
row = [json.loads(l) for l in open(os.path.join(G, src), encoding='utf-8') if json.loads(l)['id'] == rid][0]
c = [x for x in row['citations'] if x['key'] == key][0]
raw = open(os.path.join(ROOT, c['source_file']), encoding='utf-8', errors='replace', newline='').read()
a, b = c['text_offset'], c['text_offset_end']
pre, _ = build_nview(raw[max(0, a - bef * 2):a])
mid, _ = build_nview(raw[a:b])
post, _ = build_nview(raw[b:b + aft * 2])
pre, mid, post = pre.translate(APOS)[-bef:], mid.translate(APOS), post.translate(APOS)[:aft]
print('%s %s %s p.%s' % (rid, key, c['source_id'], c['printed_page']))
print(pre + ' [[' + mid + ']] ' + post)
