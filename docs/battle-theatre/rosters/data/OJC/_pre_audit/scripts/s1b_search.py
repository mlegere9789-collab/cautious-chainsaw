import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import urllib.parse
from ojc_common import *
for k, q in {'ohio_v2': 'title:(official roster soldiers ohio) AND volume:(2 OR II OR 02)', 'ohio_v2b': '(ohio roster 1886 volume II first to twentieth infantry)'}.items():
    url = 'https://archive.org/advancedsearch.php?q=%s&fl[]=identifier&fl[]=title&fl[]=volume&fl[]=possible-copyright-status&fl[]=access-restricted-item&rows=40&output=json' % urllib.parse.quote(q)
    d = get_json(url, 'search_%s.json' % k)
    if d:
        for x in d['response']['docs']: print(k, x.get('identifier'), '|', str(x.get('title'))[:80], '|', x.get('volume'), x.get('possible-copyright-status'), x.get('access-restricted-item'))
