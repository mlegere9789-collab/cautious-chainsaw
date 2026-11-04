"""Shared helpers for the PA roster family. Standard library only.
Import with: sys.path.insert(0, <this dir>) then import pa_common (run python with -I -X utf8).
- sets the process to BELOW_NORMAL priority (performance run in progress on this machine)
- polite cached fetch (1.5-3 s between requests, sha256 ledger in data/PA/acquired.json, 1.5 GB cap)
"""
import os, sys, time, json, hashlib, random, urllib.request, urllib.error, datetime

try:
    import ctypes
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(DATA, '..', '..', '..', '..', '..'))
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'PA')
LEDGER = os.path.join(DATA, 'acquired.json')
UA = 'gettysburg-map-research/1.0'
CAP = 1.5 * 1024 ** 3
os.makedirs(CACHE, exist_ok=True)

_last = [0.0]


def ledger():
    if os.path.exists(LEDGER):
        return json.load(open(LEDGER, encoding='utf8'))
    return {"family": "PA", "user_agent": UA, "files": [], "blocked": []}


def save_ledger(L):
    json.dump(L, open(LEDGER, 'w', encoding='utf8'), indent=1)


def cache_bytes():
    n = 0
    for dp, dn, fn in os.walk(CACHE):
        for f in fn:
            n += os.path.getsize(os.path.join(dp, f))
    return n


def fetch(url, name, force=False, timeout=120):
    """Download url to CACHE/name unless present. Returns path or None (blocked/failed, recorded)."""
    path = os.path.join(CACHE, name)
    L = ledger()
    if os.path.exists(path) and not force:
        return path
    if cache_bytes() > CAP:
        raise RuntimeError('cache cap reached')
    wait = _last[0] + random.uniform(1.6, 2.6) - time.time()
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            if r.headers.get('Content-Encoding', '').lower() == 'gzip':
                import gzip
                data = gzip.decompress(data)
            ctype = r.headers.get('Content-Type', '')
            status = r.status
    except urllib.error.HTTPError as e:
        _last[0] = time.time()
        L['blocked'].append(dict(url=url, status=e.code, reason=str(e.reason), date=datetime.date.today().isoformat()))
        save_ledger(L)
        return None
    except Exception as e:
        _last[0] = time.time()
        L['blocked'].append(dict(url=url, status=None, reason=repr(e), date=datetime.date.today().isoformat()))
        save_ledger(L)
        return None
    _last[0] = time.time()
    head = data[:300].lower()
    if b'<html' in head and not name.endswith(('.html', '.htm')) and (b'challenge' in data[:4000].lower() or b'captcha' in data[:4000].lower()):
        L['blocked'].append(dict(url=url, status=status, reason='bot challenge page; not saved', date=datetime.date.today().isoformat()))
        save_ledger(L)
        return None
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)
    L['files'].append(dict(url=url, file=os.path.relpath(path, ROOT).replace('\\', '/'), bytes=len(data),
                           sha256=hashlib.sha256(data).hexdigest(), content_type=ctype, status=status,
                           retrieved=datetime.datetime.now().isoformat(timespec='seconds')))
    save_ledger(L)
    return path


def register_existing(path, url_note):
    """Record a file that was already on disk (not downloaded by this run) in the ledger with its hash."""
    L = ledger()
    rel = os.path.relpath(path, ROOT).replace('\\', '/')
    if any(f['file'] == rel for f in L['files']):
        return
    data = open(path, 'rb').read()
    L['files'].append(dict(url=url_note, file=rel, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                           content_type='text/plain', status='pre-existing local copy',
                           retrieved='(earlier session; hashed %s)' % datetime.date.today().isoformat()))
    save_ledger(L)


def progress(line):
    with open(os.path.join(DATA, 'progress.md'), 'a', encoding='utf8') as f:
        f.write('- %s  %s\n' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), line))
