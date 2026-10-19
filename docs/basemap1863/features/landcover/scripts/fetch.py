import sys, os, time, hashlib, requests, json
CACHE = os.path.join(os.path.dirname(__file__), '..', 'cache')
UA = 'gettysburg-map-landcover-research/1.0 (polite, rate-limited, cached; historical reconstruction project)'
_last = {}
def get(url, params=None, binary=False, min_gap=2.5, timeout=60):
    key = hashlib.sha1((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()[:16]
    ext = '.bin' if binary else '.txt'
    p = os.path.join(CACHE, key + ext)
    if os.path.exists(p):
        return open(p, 'rb').read() if binary else open(p, encoding='utf-8').read()
    host = url.split('/')[2]
    dt = time.time() - _last.get(host, 0)
    if dt < min_gap: time.sleep(min_gap - dt)
    r = requests.get(url, params=params, headers={'User-Agent': UA}, timeout=timeout, allow_redirects=True)
    _last[host] = time.time()
    r.raise_for_status()
    open(p, 'wb').write(r.content)
    open(p + '.meta', 'w').write(json.dumps({'url': r.url, 'status': r.status_code, 'ct': r.headers.get('content-type')}))
    return r.content if binary else r.text
def getj(url, params=None, **k): return json.loads(get(url, params, **k))
