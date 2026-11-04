import os, sys, time, json, hashlib, urllib.request, urllib.error, datetime, ctypes
UA = 'gettysburg-map-research/1.0'
ROOT = r'C:\Users\mlege\gettysburg-map'
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NE')
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NE')
ACQ = os.path.join(DATA, 'acquired.json')


def lowprio():
    try:
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
    except Exception:
        pass


lowprio()
_last = [0.0]


def throttle(lo=2.0):
    d = time.time() - _last[0]
    if d < lo:
        time.sleep(lo - d)
    _last[0] = time.time()


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def load_acq():
    if os.path.exists(ACQ):
        return json.load(open(ACQ, encoding='utf-8'))
    return {'user_agent': UA, 'files': []}


def record(url, path, status, note=''):
    a = load_acq()
    rel = os.path.relpath(path, ROOT).replace(chr(92), '/') if path else None
    ent = {'url': url, 'cache_path': rel, 'status': status, 'note': note,
           'retrieved_utc': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}
    if path and os.path.exists(path):
        ent['bytes'] = os.path.getsize(path)
        ent['sha256'] = sha256(path)
    a['files'] = [f for f in a['files'] if f['url'] != url] + [ent]
    json.dump(a, open(ACQ, 'w', encoding='utf-8'), indent=1)


def get(url, name, force=False, maxbytes=400 << 20):
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and not force:
        return path
    throttle(2.2)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            clen = int(r.headers.get('Content-Length') or 0)
            if clen > maxbytes:
                record(url, None, 'SKIPPED-TOO-LARGE', f'{clen} bytes')
                return None
            tmp = path + '.part'
            with open(tmp, 'wb') as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            os.replace(tmp, path)
    except urllib.error.HTTPError as e:
        record(url, None, f'HTTP-{e.code}', str(e))
        print('HTTP', e.code, url)
        return None
    except Exception as e:
        record(url, None, 'ERROR', repr(e))
        print('ERR', e, url)
        return None
    record(url, path, 'FETCHED')
    return path


def getjson(url, name, force=False):
    p = get(url, name, force)
    return json.load(open(p, encoding='utf-8')) if p else None
