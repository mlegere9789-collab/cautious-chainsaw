import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, sys, urllib.parse
from ojc_common import *
qs = {
 'ohio_roster': 'title:(official roster soldiers state ohio war rebellion)',
 'nj_stryker': 'title:(record of officers and men of new jersey)',
 'ct_catalogue': 'title:(catalogue connecticut volunteer organizations)',
}
for k,q in qs.items():
    url = 'https://archive.org/advancedsearch.php?q=%s&fl[]=identifier&fl[]=title&fl[]=volume&fl[]=date&fl[]=possible-copyright-status&fl[]=access-restricted-item&rows=60&output=json' % urllib.parse.quote(q)
    d = get_json(url, 'search_%s.json' % k)
    if not d: continue
    for x in d['response']['docs']:
        print(k, x.get('identifier'), '|', str(x.get('title'))[:70], '|', x.get('volume'), x.get('date'), x.get('possible-copyright-status'), x.get('access-restricted-item'))
