"""Polite Internet Archive helper for family C-ALMSTX. Standard library only.
Every GET is spaced >= 2.0 s from the previous one, identified, cached by URL under tmp/library/rosters/C-ALMSTX/, and logged in acquired.json with sha256."""
import json, time, urllib.parse, urllib.request, hashlib, os, sys, datetime, urllib.error
UA = 'gettysburg-map-research/1.0 (public-domain roster research; read-only, rate-limited)'
ROOT = r'C:\Users\mlege\gettysburg-map'
CACHE = ROOT + r'\tmp\library\rosters\C-ALMSTX'
DATA = ROOT + r'\docs\battle-theatre\rosters\data\C-ALMSTX'
LEDGER = DATA + r'\acquired.json'
_last = [0.0]
def _wait():
    d = time.time() - _last[0]
    if d < 2.2: time.sleep(2.2 - d)
    _last[0] = time.time()
def load_ledger():
    try: return json.load(open(LEDGER, encoding='utf-8'))
    except Exception: return []
def save_ledger(l):
    json.dump(l, open(LEDGER, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
def get_json(url, timeout=60):
    _wait()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return json.load(urllib.request.urlopen(req, timeout=timeout))
def search(q, rows=12):
    url = 'https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(q) + ''.join('&fl%5B%5D=' + f for f in ['identifier','title','date','volume','creator']) + '&rows=%d&output=json' % rows
    d = get_json(url)
    return d['response']['numFound'], d['response']['docs']
def meta(ident):
    return get_json('https://archive.org/metadata/' + ident)
def rights(m):
    md = m.get('metadata', {})
    return dict(id=md.get('identifier'), title=md.get('title'), date=md.get('date'), pcs=md.get('possible-copyright-status'), lic=md.get('licenseurl'), restricted=md.get('access-restricted-item'), collection=md.get('collection'), size=m.get('item_size'), files=[f['name'] for f in m.get('files', []) if f['name'].endswith(('_djvu.txt', '_djvu.xml'))])
def fetch(url, fname, family_note=''):
    """GET url once into CACHE/fname unless present; log sha256. Returns path or None."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, fname)
    led = load_ledger()
    if os.path.exists(path) and any(e['file'] == fname for e in led):
        return path
    _wait()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        r = urllib.request.urlopen(req, timeout=120)
        data = r.read()
        status = r.status
    except urllib.error.HTTPError as e:
        led.append(dict(url=url, file=fname, status='BLOCKED-or-ERROR', http=e.code, when=datetime.datetime.now().isoformat(timespec='seconds'), note=family_note)); save_ledger(led); return None
    except Exception as e:
        led.append(dict(url=url, file=fname, status='ERROR', error=str(e)[:200], when=datetime.datetime.now().isoformat(timespec='seconds'), note=family_note)); save_ledger(led); return None
    open(path, 'wb').write(data)
    led.append(dict(url=url, file=fname, status='FETCHED', http=status, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), when=datetime.datetime.now().isoformat(timespec='seconds'), note=family_note))
    save_ledger(led)
    return path
