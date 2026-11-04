"""Polite Wikimedia Commons imageinfo probe (descriptive UA, 3 s spacing). Usage: commons_probe.py 'File:...' ... ; writes tmp/troopmaps/commons_probe.json"""
import sys, json, time, urllib.request, urllib.parse, os
UA = 'gettysburg-map-research/1.0 (non-commercial historical research; polite, rate-limited, cached)'
out = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'tmp', 'troopmaps', 'commons_probe.json'); res = {}
if os.path.exists(out): res = json.load(open(out))
for t in sys.argv[1:]:
    q = urllib.parse.urlencode(dict(action='query', titles=t, prop='imageinfo', iiprop='size|mime|sha1|url|extmetadata', format='json'))
    r = urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers={'User-Agent': UA})
    try:
        d = json.load(urllib.request.urlopen(r, timeout=60))
        p = list(d['query']['pages'].values())[0]; ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
        res[t] = dict(width=ii.get('width'), height=ii.get('height'), bytes=ii.get('size'), mime=ii.get('mime'), sha1=ii.get('sha1'), url=ii.get('url'), license=(em.get('LicenseShortName') or {}).get('value'), credit=(em.get('Credit') or {}).get('value', '')[:200], date=(em.get('DateTimeOriginal') or {}).get('value'), desc=(em.get('ImageDescription') or {}).get('value', '')[:300])
    except Exception as e:
        res[t] = dict(error=str(e))
    print(t, res[t].get('width'), res[t].get('height'), res[t].get('bytes'), res[t].get('license'), res[t].get('error', ''))
    time.sleep(3)
json.dump(res, open(out, 'w'), indent=1)
