"""Search IA for candidate PA items, then fetch each candidate's metadata (rights flags). Results to ../ia_candidates.json"""
import sys, os, json, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

queries = [
    'title:(history of pennsylvania volunteers) AND mediatype:texts',
    'title:(bates pennsylvania volunteers) AND mediatype:texts',
    'title:(pennsylvania at gettysburg) AND mediatype:texts',
    'creator:(bates, samuel p) AND mediatype:texts',
]
found = {}
for i, q in enumerate(queries):
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
        [('q', q), ('fl[]', 'identifier'), ('fl[]', 'title'), ('fl[]', 'volume'), ('fl[]', 'year'), ('fl[]', 'creator'), ('rows', '60'), ('output', 'json')])
    p = C.fetch(url, 'search/q%d.json' % i, force=False)
    if not p:
        print('FAILED', q)
        continue
    d = json.load(open(p, encoding='utf8'))
    for doc in d['response']['docs']:
        found[doc['identifier']] = doc
        print(doc['identifier'], '|', doc.get('title'), '|', doc.get('volume'), '|', doc.get('year'), '|', doc.get('creator'))
json.dump(found, open(os.path.join(C.DATA, 'ia_candidates.json'), 'w', encoding='utf8'), indent=1)
print(len(found))
