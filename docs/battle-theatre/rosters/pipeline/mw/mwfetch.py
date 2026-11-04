"""Polite cached fetcher for the MW family. Run with python -I -X utf8.
Every file lands in tmp/library/rosters/MW/ ; sha256 recorded in data/MW/acquired.json."""
import json, os, time, hashlib, urllib.request, urllib.error, sys, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MW')
ACQ = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'MW', 'acquired.json')
UA = 'gettysburg-map-research/1.0 (public-domain roster transcription; read-only, rate-limited)'
_last = [0.0]
BYTES_FILE = os.path.join(CACHE, '_bytes.json')


def _load():
    return json.load(open(ACQ, encoding='utf8')) if os.path.exists(ACQ) else {'family': 'MW', 'files': {}, 'blocked': []}


def _save(a):
    json.dump(a, open(ACQ, 'w', encoding='utf8'), indent=1)


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def total_bytes():
    a = _load()
    return sum(v.get('bytes', 0) for v in a['files'].values() if not v.get('copied_from_pilot_cache'))


def get_json(url):
    wait = 2.0 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch(url, name, source_id, note=''):
    a = _load()
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and name in a['files']:
        return path
    if total_bytes() > 1.4e9:
        raise RuntimeError('download budget reached')
    wait = 2.2 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(path + '.part', 'wb') as f:
            ctype = r.headers.get('Content-Type', '')
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b)
    except urllib.error.HTTPError as e:
        a['blocked'].append(dict(url=url, source_id=source_id, status=e.code, when=datetime.datetime.now().isoformat(timespec='seconds')))
        _save(a)
        if os.path.exists(path + '.part'):
            os.remove(path + '.part')
        print('HTTP', e.code, url)
        return None
    os.replace(path + '.part', path)
    a['files'][name] = dict(url=url, source_id=source_id, sha256=sha(path), bytes=os.path.getsize(path), retrieved=datetime.datetime.now().isoformat(timespec='seconds'), user_agent=UA, content_type=ctype, note=note)
    _save(a)
    print('OK', name, a['files'][name]['bytes'])
    return path
