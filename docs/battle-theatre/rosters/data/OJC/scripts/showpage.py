import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojc_common import *
def lines_of(words, tol=None):
    ws = sorted(words, key=lambda w: (w[1]+w[3])/2)
    lines = []; cur = []; last = None
    for w in ws:
        yc = (w[1]+w[3])/2
        h = w[3]-w[1]
        if cur and yc - last > max(9, 0.33*h):
            lines.append(cur); cur = []
        cur.append(w); last = yc if len(cur) == 1 else last*0.7+yc*0.3
    if cur: lines.append(cur)
    return [sorted(l, key=lambda w: w[0]) for l in lines]
if __name__ == '__main__':
    src, pn = sys.argv[1], sys.argv[2]
    P = json.load(open(os.path.join(CACHE, src + '.pages.json')))
    for l in lines_of(P[pn]):
        print(int((l[0][1]+l[0][3])/2), ' | '.join('%d:%s' % (w[0], w[4]) for w in l)[:230])
