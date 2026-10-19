import sys, json, csv, os, time
sys.path.insert(0, os.path.dirname(__file__))
from wp import get
API = 'https://api.sketchfab.com/v3/search'
QUERIES = ['american civil war soldier', 'union soldier', 'confederate soldier', 'civil war infantry', 'civil war uniform', 'kepi', 'civil war cannon', 'napoleon 12 pounder cannon',
           '3 inch ordnance rifle', 'parrott rifle', 'civil war rifle musket', 'springfield 1861 rifle', 'enfield 1853 rifle', 'civil war sword sabre', 'civil war horse', 'civil war cavalry',
           'civil war artillery limber caisson', 'civil war flag', 'civil war tent', 'civil war general', 'zouave', 'civil war drummer', 'civil war canteen', 'civil war knapsack']
rows = []
seen = set()
for q in QUERIES:
    for lic in ('by', 'cc0', 'by-sa'):
        d = get(API, {'type': 'models', 'q': q, 'downloadable': 'true', 'license': lic, 'count': 24, 'sort_by': '-likeCount'}, delay=2.0)
        for r in d.get('results', []):
            if r['uid'] in seen:
                continue
            seen.add(r['uid'])
            rows.append(dict(query=q, uid=r['uid'], name=r['name'], author=r['user']['displayName'], license=(r.get('license') or {}).get('label'), faces=r.get('faceCount'), vertices=r.get('vertexCount'),
                             animated=r.get('animationCount'), likes=r.get('likeCount'), views=r.get('viewCount'), published=(r.get('publishedAt') or '')[:10], url=r.get('viewerUrl'), tags=','.join(t['name'] for t in r.get('tags', [])[:8]),
                             pbr=r.get('isAgeRestricted'), staff=r.get('staffpicked')))
print('unique models', len(rows))
out = 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/assets/data/sketchfab-civil-war-scan.csv'
w = csv.DictWriter(open(out, 'w', newline='', encoding='utf8'), fieldnames=list(rows[0].keys()))
w.writeheader(); w.writerows(rows)
