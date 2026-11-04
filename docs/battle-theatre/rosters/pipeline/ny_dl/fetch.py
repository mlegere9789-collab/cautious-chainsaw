import ctypes
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)  # BELOW_NORMAL
except Exception: pass
import json, os, time, hashlib, urllib.request, urllib.parse, sys, datetime
UA = 'gettysburg-map-research/1.0 (roster program, NY family; read-only, rate-limited; contact via site owner)'
ROOT = r'C:\Users\mlege\gettysburg-map'
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NY')
ACQ = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NY', 'acquired.json')
os.makedirs(CACHE, exist_ok=True)
_last = [0.0]
def polite(sec=2.0):
    d = time.time() - _last[0]
    if d < sec: time.sleep(sec - d)
    _last[0] = time.time()
def get(url, timeout=60):
    polite()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()
def search(q, rows=50, fields=('identifier','title','date','mediatype')):
    u = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode([('q', q), ('rows', rows), ('output', 'json')] + [('fl[]', f) for f in fields])
    st, b = get(u)
    return json.loads(b)['response']['docs']
def meta(ident):
    st, b = get('https://archive.org/metadata/' + ident)
    return json.loads(b)
def load_acq():
    if os.path.exists(ACQ): return json.load(open(ACQ, encoding='utf-8'))
    return {'family': 'NY', 'user_agent': UA, 'files': []}
def download(ident, fname, dest=None, maxbytes=400_000_000):
    """download https://archive.org/download/ident/fname to cache; record sha256."""
    acq = load_acq()
    dest = dest or os.path.join(CACHE, fname.replace('/', '_'))
    url = 'https://archive.org/download/%s/%s' % (ident, urllib.parse.quote(fname))
    for f in acq['files']:
        if f['url'] == url and os.path.exists(dest):
            return dest
    polite()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    h = hashlib.sha256(); n = 0
    with urllib.request.urlopen(req, timeout=120) as r, open(dest + '.part', 'wb') as o:
        status = r.status
        while True:
            c = r.read(1 << 20)
            if not c: break
            n += len(c); h.update(c); o.write(c)
            if n > maxbytes: raise RuntimeError('too large')
    os.replace(dest + '.part', dest)
    acq['files'].append({'url': url, 'identifier': ident, 'file': os.path.basename(dest), 'bytes': n, 'sha256': h.hexdigest(),
                         'http_status': status, 'retrieved': datetime.datetime.now().isoformat(timespec='seconds')})
    os.makedirs(os.path.dirname(ACQ), exist_ok=True)
    json.dump(acq, open(ACQ, 'w', encoding='utf-8'), indent=1)
    return dest
