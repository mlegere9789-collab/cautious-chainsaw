"""Soldiers' National Cemetery, Gettysburg: Revised Report (1867, IA revisedreportma00cemegoog) -> Pennsylvania burial rows.
Columns by x position (the table is 4 columns: grave no, name, company, regiment). Output: data/PA/snc_pa_rows.json"""
import sys, os, re, json, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

d = json.load(open(os.path.join(C.CACHE, 'derived', 'snc.pages.json')))
pages = d['pages']
# state header pages: first words near the top
hdr = {}
for p, w in pages.items():
    top = ' '.join(x[4] for x in sorted([x for x in w if x[1] < 420], key=lambda x: (x[1] // 30, x[0])))
    hdr[int(p)] = top
pa_pages = [p for p in sorted(hdr) if re.search(r'Pennsylvania', hdr[p], re.I) and 'Cemetery' not in hdr[p][:0] and 15 <= p <= 60]
print('header pages', pa_pages)

rows = []
for p in range(min(pa_pages), max(pa_pages) + 12):
    w = [x for x in pages.get(str(p), []) if x[4]]
    if len(w) < 20:
        continue
    # skip pages whose header names another state
    h = hdr[p]
    # baseline clusters
    ws = sorted(w, key=lambda x: x[3])
    cl = []
    for x in ws:
        if cl and abs(x[3] - statistics.mean(y[3] for y in cl[-1])) <= 14:
            cl[-1].append(x)
        else:
            cl.append([x])
    for c in cl:
        c.sort(key=lambda x: x[0])
        g = [x for x in c if x[0] < 285]
        nm = [x for x in c if 285 <= x[0] < 560]
        co = [x for x in c if 560 <= x[0] < 636]
        rg = [x for x in c if x[0] >= 636]
        gtxt = ' '.join(x[4] for x in g)
        m = re.match(r'^[\d\.]{1,5}$', gtxt.strip())
        if not (m or (nm and rg)):
            continue
        rows.append(dict(page=p, y=int(statistics.mean(x[3] for x in c)), grave=gtxt.strip(), name=' '.join(x[4] for x in nm).strip(),
                         company=' '.join(x[4] for x in co).strip(), regiment=' '.join(x[4] for x in rg).strip()))
json.dump(rows, open(os.path.join(C.DATA, 'snc_raw_rows.json'), 'w'), indent=0)
print(len(rows))
for r in rows[:25]:
    print(r)
