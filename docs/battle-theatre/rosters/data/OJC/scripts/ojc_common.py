"""Shared helpers for the OJC (Ohio, New Jersey, Connecticut) roster family.
Run with: python -I -X utf8 script.py   (isolated mode; downloaded files are data, never code)
"""
import os, sys, time, json, hashlib, urllib.request, urllib.error, ctypes, datetime

# below-normal priority for this process (hard rule: a performance run is measuring the machine)
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass

REPO = r'C:\Users\mlege\gettysburg-map'
CACHE = os.path.join(REPO, 'tmp', 'library', 'rosters', 'OJC')
DATA = os.path.join(REPO, 'docs', 'battle-theatre', 'rosters', 'data', 'OJC')
ACQ = os.path.join(DATA, 'acquired.json')
UA = 'gettysburg-map-research/1.0 (public-domain roster extraction; read-only, 1.5-3 s between requests)'
os.makedirs(CACHE, exist_ok=True)
_last = [0.0]
MAX_BYTES = 1_500_000_000


def _load_acq():
    if os.path.exists(ACQ):
        return json.load(open(ACQ, encoding='utf8'))
    return {'family': 'OJC', 'user_agent': UA, 'files': []}


def total_cached():
    return sum(os.path.getsize(os.path.join(CACHE, f)) for f in os.listdir(CACHE))


def polite_get(url, fname, force=False, timeout=60):
    """Download url to CACHE/fname (once). Returns path or None. Records sha256 in acquired.json."""
    path = os.path.join(CACHE, fname)
    if os.path.exists(path) and not force:
        return path
    if total_cached() > MAX_BYTES:
        print('BUDGET EXCEEDED'); return None
    wait = 2.0 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            status = r.status
            ctype = r.headers.get('Content-Type', '')
    except urllib.error.HTTPError as e:
        _last[0] = time.time()
        print('HTTP', e.code, url)
        if e.code in (401,403,429,451):
            record_block(url, 'HTTP %s' % e.code)
        return None
    except Exception as e:
        _last[0] = time.time()
        print('ERR', url, e)
        return None
    _last[0] = time.time()
    open(path, 'wb').write(data)
    acq = _load_acq()
    acq['files'] = [f for f in acq['files'] if f['file'] != fname]
    acq['files'].append({'file': fname, 'url': url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                         'retrieved_utc': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'), 'http_status': status, 'content_type': ctype})
    json.dump(acq, open(ACQ, 'w', encoding='utf8'), indent=1)
    return path


def record_block(url, reason):
    acq = _load_acq()
    acq.setdefault('blocked', [])
    if not any(b['url'] == url for b in acq['blocked']):
        acq['blocked'].append({'url': url, 'reason': reason, 'when_utc': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')})
    json.dump(acq, open(ACQ, 'w', encoding='utf8'), indent=1)


def get_json(url, fname):
    p = polite_get(url, fname)
    if not p:
        return None
    try:
        return json.load(open(p, encoding='utf8'))
    except Exception as e:
        print('bad json', e); return None


def progress(line):
    with open(os.path.join(DATA, 'progress.md'), 'a', encoding='utf8') as f:
        f.write('- %s %s\n' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), line))
