"""Shared helpers for the C-NCLA family: polite cached fetch, sha256 ledger, below-normal priority."""
import os, sys, json, time, hashlib, urllib.request, urllib.error, datetime, ctypes

ROOT = r'C:\Users\mlege\gettysburg-map'
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'C-NCLA')
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'C-NCLA')
ACQ = os.path.join(DATA, 'acquired.json')
UA = 'gettysburg-map-research/1.0 (public-domain roster transcription; read-only, rate-limited, respects robots.txt)'
_last = [0.0]


def low_priority():
    try:
        k = ctypes.windll.kernel32
        k.SetPriorityClass(k.GetCurrentProcess(), 0x00004000)  # BELOW_NORMAL_PRIORITY_CLASS
    except Exception:
        pass


def load_acq():
    if os.path.exists(ACQ):
        return json.load(open(ACQ, encoding='utf-8'))
    return {'family': 'C-NCLA', 'user_agent': UA, 'files': [], 'blocked': []}


def save_acq(a):
    json.dump(a, open(ACQ, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


def total_bytes():
    return sum(f.get('bytes', 0) for f in load_acq()['files'])


def get(url, fname, expect_text=False, min_gap=2.0, timeout=120):
    """Fetch url into CACHE/fname unless cached. Records sha256 in acquired.json. Returns path or None (blocked)."""
    low_priority()
    path = os.path.join(CACHE, fname)
    acq = load_acq()
    for f in acq['files']:
        if f['file'] == fname and os.path.exists(path):
            return path
    if total_bytes() > 1.4e9:
        raise RuntimeError('family download budget reached')
    wait = min_gap - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        data = r.read()
        ctype = r.headers.get('Content-Type', '')
        status = r.status
    except urllib.error.HTTPError as e:
        _last[0] = time.time()
        acq['blocked'].append(dict(url=url, status=e.code, when=datetime.datetime.now().isoformat(timespec='seconds')))
        save_acq(acq)
        return None
    except Exception as e:
        _last[0] = time.time()
        acq['blocked'].append(dict(url=url, error=str(e)[:200], when=datetime.datetime.now().isoformat(timespec='seconds')))
        save_acq(acq)
        return None
    _last[0] = time.time()
    open(path, 'wb').write(data)
    acq['files'].append(dict(file=fname, url=url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), content_type=ctype,
                             status=status, retrieved=datetime.datetime.now().isoformat(timespec='seconds')))
    save_acq(acq)
    return path


def get_json(url, min_gap=2.0):
    low_priority()
    wait = min_gap - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=60))
    except Exception as e:
        _last[0] = time.time()
        return {'_error': str(e)}
    _last[0] = time.time()
    return d
