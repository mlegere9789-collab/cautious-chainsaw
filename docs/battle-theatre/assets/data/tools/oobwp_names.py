import re, json, csv, unicodedata
from collections import Counter
info = json.load(open('wp_links_info.json'))
RK = re.compile(r'\b(MG|BG|LG|Gen|Col|Ltc|Maj|Cpt|Capt|Lt|1Lt|2Lt|Dr\.)\s+((?:[A-Z][A-Za-z\.\'\-]*\s?){2,5}?)(?=\s*(?:\(|,|;|:|$|\bMG\b|\bBG\b|\bCol\b|\bLtc\b|\bMaj\b|\bCpt\b|\bLt\b))')
RANKN = {'MG': 'Major General', 'BG': 'Brigadier General', 'LG': 'Lieutenant General', 'Gen': 'General', 'Col': 'Colonel', 'Ltc': 'Lieutenant Colonel', 'Maj': 'Major', 'Cpt': 'Captain', 'Capt': 'Captain', 'Lt': 'Lieutenant', '1Lt': 'First Lieutenant', '2Lt': 'Second Lieutenant', 'Dr.': 'Doctor'}
rows = []
for side in ('Union', 'Confederate'):
    lines = open(f'oobwp_{side}.txt', encoding='utf8').read().split('\n')
    head = ''
    for l in lines:
        if not RK.search(l):
            head = l[:80]; continue
        pre = l.split(':')[0][:80] if ':' in l else head
        for m in RK.finditer(l):
            rows.append(dict(side=side, context=pre, rank=RANKN[m.group(1)], name=m.group(2).strip()))
seen = set(); out = []
for r in rows:
    k = (r['side'], r['name'])
    if k in seen: continue
    seen.add(k); out.append(r)
print('distinct (side,name)', len(out), Counter(r['side'] for r in out))

def norm(s):
    s = unicodedata.normalize('NFKD', s); s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'\(.*?\)', '', s); s = re.sub(r'[.,\'"]', ' ', s)
    return [t for t in s.lower().split() if t not in ('jr', 'sr', 'ii', 'iii', 'iv')]
pidx = {}
for t, v in info.items():
    if not v: continue
    tn = norm(t)
    if tn: pidx.setdefault(tn[-1], []).append((t, v, tn))
linked = 0; withimg = 0
for r in out:
    n = norm(r['name']); r['wp_title'] = ''; r['has_image'] = ''
    if not n: continue
    for t, v, tn in pidx.get(n[-1], []):
        f, g = n[0], tn[0]
        if f == g or (len(f) <= 2 and g[0] == f[0]) or (len(g) <= 2 and f[0] == g[0]) or (f[0] == g[0] and (f.startswith(g) or g.startswith(f))):
            r['wp_title'] = t; r['has_image'] = 'yes' if v.get('img') else 'no'; break
    linked += bool(r['wp_title']); withimg += r['has_image'] == 'yes'
print('linked to a wikipedia page (OOB-link match):', linked, 'with lead image:', withimg)
w = csv.DictWriter(open('C:/Users/mlege/gettysburg-map/docs/battle-theatre/assets/data/commanders-wikipedia-oob.csv', 'w', newline='', encoding='utf8'), fieldnames=['side', 'context', 'rank', 'name', 'wp_title', 'has_image'])
w.writeheader(); w.writerows(out)
