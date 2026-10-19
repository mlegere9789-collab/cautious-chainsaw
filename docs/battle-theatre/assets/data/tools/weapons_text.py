import sys, re, json
sys.path.insert(0, '.')
from wp import get
API = 'https://en.wikipedia.org/w/api.php'
T = ['Springfield Model 1861', 'Springfield Model 1863', 'Pattern 1853 Enfield', 'Lorenz rifle', 'Sharps rifle', 'Spencer repeating rifle', 'Henry rifle', 'M1857 12-pounder Napoleon', '3-inch ordnance rifle', 'Parrott rifle', 'Whitworth rifle',
     'Blakely rifle', 'M1841 12-pounder howitzer', 'Colt Army Model 1860', 'Model 1860 light cavalry saber', 'Model 1840 cavalry saber', 'Colt Navy Model 1851', 'Burnside carbine', 'Limber (artillery)', 'Caisson (artillery)', 'Union Army corps badges', 'Corps badge']
NUM = re.compile(r'[^.]*\d[^.]*\b(?:inch|inches|in\b|pounds?|lb|lbs|kg|yards?|yd|feet|ft|mm|m\b|rounds?|caliber|calibre|bore)[^.]*\.', re.I)
out = {}
for t in T:
    d = get(API, {'action': 'query', 'titles': t, 'prop': 'extracts|info', 'explaintext': 1, 'inprop': 'url', 'format': 'json', 'redirects': 1}, delay=1.0)
    p = list(d['query']['pages'].values())[0]
    if 'missing' in p:
        print('MISSING', t); continue
    ex = p['extract']
    sents = [s.strip() for s in NUM.findall(ex.replace('\n', ' '))]
    out[t] = {'url': p['fullurl'], 'title': p['title'], 'sentences': sents[:14]}
    print('==', t, '->', p['title'], p['fullurl'])
    for s in sents[:8]:
        print('    -', s[:210])
json.dump(out, open('weapons_text.json', 'w'), indent=1)
