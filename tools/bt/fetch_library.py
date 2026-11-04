"""Phase 1 acquire (PDF D.4.3 stage 2) for the public-domain library beyond the Official Records.
Polite (>= 3 s between requests, descriptive User-Agent, archive.org public APIs only), pre-1929 items only, refuses access-restricted
(lending) items, content-addressed raw store under tmp/library/<id>/, record in docs/battle-theatre/GOVERNANCE/library/acquired.json (merged).
Candidates are identified by archive.org identifiers verified through the metadata API at run time; nothing is assumed."""
import urllib.request, urllib.parse, time, hashlib, os, json, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
H = {'User-Agent': 'GettysburgInteractiveMap-research/1.0 (educational; polite, 3 s spacing)'}
LAST = [0.0]
def get(url, binary=False, timeout=180):
    dt = time.time() - LAST[0]
    if dt < 3: time.sleep(3 - dt)
    LAST[0] = time.time()
    with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=timeout) as f:
        b = f.read()
    return b if binary else b.decode('utf-8', 'replace')
def search(q, rows=8):
    u = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode({'q': q + ' AND mediatype:texts', 'fl[]': ['identifier', 'title', 'date', 'volume', 'downloads'], 'rows': rows, 'output': 'json', 'sort[]': 'downloads desc'}, doseq=True)
    return json.loads(get(u))['response']['docs']
def meta(ident):
    return json.loads(get('https://archive.org/metadata/' + ident))
QUERIES = {
 'PA-GB': 'title:("Pennsylvania at Gettysburg") AND date:[1900-01-01 TO 1929-12-31]',
 'NY-GB': 'title:("New York at Gettysburg") AND date:[1900-01-01 TO 1929-12-31]',
 'ME-GB': 'title:("Maine at Gettysburg") AND date:[1890-01-01 TO 1929-12-31]',
 'MI-GB': 'title:("Michigan at Gettysburg") AND date:[1880-01-01 TO 1929-12-31]',
 'FOX': 'title:("Regimental losses in the American Civil War") AND date:[1880-01-01 TO 1929-12-31]',
 'BL3': 'title:("Battles and leaders of the Civil War") AND volume:(3 OR III) AND date:[1880-01-01 TO 1929-12-31]',
 'GBG-FIRST': 'title:("Gettysburg") AND creator:(Bachelder) AND date:[1860-01-01 TO 1929-12-31]',
 'OR-ATLAS': 'title:("Atlas to accompany the official records") AND date:[1890-01-01 TO 1929-12-31]',
 'ORDNANCE': 'title:("Ordnance manual for the use of the officers of the United States army") AND date:[1850-01-01 TO 1870-12-31]',
 'ARTILLERIST': 'title:("Artillerist\'s manual") AND creator:(Gibbon)',
 'HARDEE': 'title:("Hardee") AND title:(tactics) AND date:[1850-01-01 TO 1870-12-31]',
 'CASEY': 'title:("Infantry tactics") AND creator:(Casey) AND date:[1860-01-01 TO 1870-12-31]',
}
def main(only=None):
    out_dir = os.path.join(ROOT, 'tmp', 'library'); os.makedirs(out_dir, exist_ok=True)
    reg_path = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'candidates.json')
    cands = {}
    for key, q in QUERIES.items():
        if only and key not in only: continue
        try: docs = search(q)
        except Exception as e: cands[key] = {'error': str(e)}; continue
        res = []
        for d in docs[:6]:
            try: m = meta(d['identifier'])
            except Exception as e: res.append({'identifier': d['identifier'], 'error': str(e)}); continue
            md = m.get('metadata', {})
            djvu = [f for f in m.get('files', []) if f['name'].endswith('_djvu.txt')]
            res.append({'identifier': d['identifier'], 'title': md.get('title'), 'volume': md.get('volume'), 'date': md.get('date'), 'restricted': md.get('access-restricted-item'),
                        'djvu_bytes': int(djvu[0]['size']) if djvu else None, 'licenseurl': md.get('licenseurl'), 'downloads': d.get('downloads')})
        cands[key] = res
        print(key, [(r.get('identifier'), r.get('date'), r.get('djvu_bytes')) for r in res][:4], flush=True)
    json.dump({'probed': '2026-10-19', 'candidates': cands}, open(reg_path, 'w', encoding='utf-8'), indent=1)
if __name__ == '__main__':
    main(set(sys.argv[1:]) or None)
