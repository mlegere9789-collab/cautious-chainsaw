"""Polite fetcher for the REG family (Regular Army, DE, MD, RI, WV, HQ and trains).

Rules (task brief, PLAN 1.4): identified User-Agent, 1.5 to 3 s between requests, every file cached under
tmp/library/rosters/REG/ with sha256 recorded in docs/battle-theatre/rosters/data/REG/acquired.json,
total download under 1.5 GB, robots.txt honoured per host, 403 / challenge / login -> recorded as blocked and
never circumvented.  Python standard library only.  Run with -I -X utf8.

Usage:  python -I -X utf8 regfetch.py get <url> <cache_name> [--note TEXT]
        python -I -X utf8 regfetch.py ia-meta <identifier>
        python -I -X utf8 regfetch.py ia-search "<lucene query>" [rows]
        python -I -X utf8 regfetch.py ia-text <identifier>      (downloads _djvu.txt after a metadata check)
"""
import hashlib, json, os, sys, time, datetime, urllib.request, urllib.parse, urllib.error, urllib.robotparser

try:  # run below normal priority (a performance acceptance run is measuring this machine)
    import ctypes
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG')
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
LEDGER = os.path.join(DATA, 'acquired.json')
UA = 'gettysburg-map-research/1.0 (public-domain roster research; read-only, rate-limited)'
CAP = 1.5 * 1024 ** 3
os.makedirs(CACHE, exist_ok=True)
os.makedirs(DATA, exist_ok=True)

_last = [0.0]
_robots = {}


def _load():
    if os.path.exists(LEDGER):
        return json.load(open(LEDGER, encoding='utf-8'))
    return {'family': 'REG', 'user_agent': UA, 'files': [], 'blocked': [], 'metadata_checks': []}


def _save(d):
    json.dump(d, open(LEDGER, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)


def total_bytes():
    return sum(os.path.getsize(os.path.join(CACHE, f)) for f in os.listdir(CACHE) if os.path.isfile(os.path.join(CACHE, f)))


def robots_ok(url):
    p = urllib.parse.urlparse(url)
    host = p.scheme + '://' + p.netloc
    if host not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(host + '/robots.txt', headers={'User-Agent': UA})
            txt = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
            rp.parse(txt.splitlines())
        except Exception:
            rp.parse([])
        _robots[host] = rp
        time.sleep(2)
    return _robots[host].can_fetch(UA, url)


def _wait():
    d = time.time() - _last[0]
    gap = 2.2
    if d < gap:
        time.sleep(gap - d)
    _last[0] = time.time()


def get(url, name, note='', binary=True):
    """Download url into the cache as name.  Returns path or None.  Records the result in the ledger."""
    led = _load()
    path = os.path.join(CACHE, name)
    if os.path.exists(path):
        return path
    if total_bytes() > CAP:
        raise SystemExit('cap of 1.5 GB reached')
    if not robots_ok(url):
        led['blocked'].append({'url': url, 'reason': 'robots.txt disallows this path for our user agent', 'date': str(datetime.date.today())})
        _save(led)
        print('BLOCKED by robots.txt', url)
        return None
    _wait()
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    try:
        resp = urllib.request.urlopen(req, timeout=80)
        data = resp.read()
        ctype = resp.headers.get('Content-Type', '')
    except urllib.error.HTTPError as e:
        led['blocked'].append({'url': url, 'reason': 'HTTP %s %s' % (e.code, e.reason), 'date': str(datetime.date.today())})
        _save(led)
        print('HTTP error', e.code, url)
        return None
    except Exception as e:
        led['blocked'].append({'url': url, 'reason': 'network error: %s' % e, 'date': str(datetime.date.today())})
        _save(led)
        print('ERR', e, url)
        return None
    head = data[:600].lower()
    if b'just a moment' in head or b'cf-challenge' in head or b'captcha' in head:
        led['blocked'].append({'url': url, 'reason': 'bot challenge page returned; not fetched, not circumvented', 'date': str(datetime.date.today())})
        _save(led)
        print('CHALLENGE', url)
        return None
    open(path, 'wb').write(data)
    led['files'].append({'file': name, 'url': url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                         'content_type': ctype, 'retrieved': datetime.datetime.now().isoformat(timespec='seconds'), 'note': note})
    _save(led)
    print('OK', name, len(data))
    return path


def getjson(url):
    if not robots_ok(url):
        print('robots disallow', url)
        return None
    _wait()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=60).read().decode('utf-8'))
    except Exception as e:
        print('ERR', e, url)
        return None


def ia_meta(ident):
    d = getjson('https://archive.org/metadata/' + ident)
    if not d or 'metadata' not in d:
        return None
    m = d['metadata']
    files = [(f['name'], f.get('size')) for f in d.get('files', []) if f['name'].endswith(('_djvu.txt', '_djvu.xml'))]
    rec = {'identifier': ident, 'title': m.get('title'), 'date': m.get('date') or m.get('year'),
           'possible_copyright_status': m.get('possible-copyright-status'), 'licenseurl': m.get('licenseurl'),
           'access_restricted_item': m.get('access-restricted-item'), 'collection': m.get('collection'),
           'contributor': m.get('contributor'), 'publisher': m.get('publisher'),
           'text_files': files, 'checked': str(datetime.date.today())}
    led = _load()
    led['metadata_checks'] = [x for x in led['metadata_checks'] if x['identifier'] != ident] + [rec]
    _save(led)
    return rec


def ia_search(q, rows=15):
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
        {'q': q, 'fl[]': ['identifier', 'title', 'year', 'creator', 'downloads'], 'rows': rows, 'output': 'json'}, doseq=True)
    d = getjson(url)
    if not d:
        return []
    return d['response']['docs']


def ia_text(ident):
    rec = ia_meta(ident)
    if not rec:
        print('no metadata', ident)
        return None
    if rec['access_restricted_item'] in (True, 'true', 'True'):
        print('LENDING-RESTRICTED: not opened', ident)
        led = _load()
        led['blocked'].append({'url': 'https://archive.org/details/' + ident, 'reason': 'access-restricted-item true (lending copy); never opened', 'date': str(datetime.date.today())})
        _save(led)
        return None
    name = ident + '_djvu.txt'
    return get('https://archive.org/download/%s/%s' % (ident, urllib.parse.quote(name)), name,
               note='IA %s; possible-copyright-status=%s; title=%s' % (ident, rec['possible_copyright_status'], rec['title']))


def ia_xml(ident):
    rec = ia_meta(ident)
    if not rec or rec['access_restricted_item'] in (True, 'true', 'True'):
        print('restricted or missing', ident)
        return None
    name = ident + '_djvu.xml'
    return get('https://archive.org/download/%s/%s' % (ident, urllib.parse.quote(name)), name,
               note='IA %s djvu.xml (word coordinates); possible-copyright-status=%s' % (ident, rec['possible_copyright_status']))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'get':
        get(a[1], a[2], note=a[4] if len(a) > 4 else '')
    elif a[0] == 'ia-meta':
        print(json.dumps(ia_meta(a[1]), indent=1))
    elif a[0] == 'ia-search':
        for r in ia_search(a[1], int(a[2]) if len(a) > 2 else 15):
            print(r.get('identifier'), '|', r.get('year'), '|', (r.get('title') or '')[:110], '|', r.get('creator'), '|', r.get('downloads'))
    elif a[0] == 'ia-xml':
        ia_xml(a[1])
    elif a[0] == 'ia-text':
        ia_text(a[1])
