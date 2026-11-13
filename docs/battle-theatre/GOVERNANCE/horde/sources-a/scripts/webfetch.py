#!/usr/bin/env python3
"""sources-a polite fetcher (public, openly readable pages only).

Rules kept here (task rule 4): one request at a time, at least 1.2 s between any two requests (5.5 s for
www.loc.gov, whose robots.txt asks for a crawl delay of 5), robots.txt of every host read first and honoured,
no login, no CAPTCHA, no bot-block circumvention; a refusal (proxy 403 on CONNECT, HTTP 401/403/429, DNS failure)
is logged as blocked and never retried or worked around. The client name is generic (no project name, no contact data).

Every request, answered or not, is appended as one JSON line to
docs/battle-theatre/GOVERNANCE/horde/sources-a/lookups.jsonl; bodies are saved under tmp/sources-a/fetch (gitignored)
with their sha256.

Usage (run with python3 -I):
  webfetch.py get <id> <url> [--accept TYPE] [--max-mb N] [--force]
  webfetch.py batch <file-with-lines "id<TAB>url<TAB>accept(optional)">
"""
import os, sys, json, time, hashlib, datetime, urllib.parse, urllib.robotparser, fcntl

import requests

ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'tmp/sources-a/fetch')
LOG = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/sources-a/lookups.jsonl')
LAST = os.path.join(ROOT, 'tmp/sources-a/.last_request.json')
UA = 'research-fetch/1.0 (public-domain source check; honours robots.txt)'
GAP = {'www.loc.gov': 5.5}
DEFAULT_GAP = 1.2
os.makedirs(OUT, exist_ok=True)

_robots = {}


def utc():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _wait(host):
    """cross-process spacing: one lock file holds the time of the last request of this workstream"""
    fd = os.open(LAST + '.lock', os.O_CREAT | os.O_RDWR)
    fcntl.flock(fd, fcntl.LOCK_EX)
    try:
        try:
            d = json.load(open(LAST))
        except Exception:
            d = {}
        now = time.time()
        need = max(GAP.get(host, DEFAULT_GAP), DEFAULT_GAP)
        last_any = d.get('any', 0)
        last_host = d.get(host, 0)
        wait = max(last_any + DEFAULT_GAP - now, last_host + need - now, 0)
        if wait > 0:
            time.sleep(wait)
        now = time.time()
        d['any'] = now
        d[host] = now
        json.dump(d, open(LAST, 'w'))
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def _log(rec):
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')


def _classify(exc_text, status):
    t = (exc_text or '').lower()
    if status in (401, 403, 429):
        return 'refused_http_%d' % status
    if 'proxy' in t and ('403' in t or 'forbidden' in t or 'tunnel' in t):
        return 'blocked_host'
    if 'name or service not known' in t or 'nodename' in t or 'getaddrinfo' in t or 'resolve' in t:
        return 'dns_failure'
    if 'timed out' in t or 'timeout' in t:
        return 'timeout'
    return None


def robots_for(host, scheme='https'):
    if host in _robots:
        return _robots[host]
    url = '%s://%s/robots.txt' % (scheme, host)
    rp = urllib.robotparser.RobotFileParser()
    rid = 'robots_' + host
    _wait(host)
    t0 = time.time()
    rec = dict(id=rid, url=url, utc=utc(), method='GET', purpose='robots.txt before first request to host')
    try:
        r = requests.get(url, headers={'User-Agent': UA}, timeout=(10, 30))
        rec.update(status=r.status_code, bytes=len(r.content), ctype=r.headers.get('content-type'))
        open(os.path.join(OUT, rid + '.txt'), 'wb').write(r.content)
        rec['sha256'] = hashlib.sha256(r.content).hexdigest()
        if r.status_code == 200:
            rp.parse(r.text.splitlines())
            _robots[host] = rp
        elif r.status_code in (401, 403):
            rec['robots'] = 'robots.txt refused (%d): host treated as blocked' % r.status_code
            _robots[host] = None
        else:
            rp.parse([])  # no robots.txt: everything allowed
            _robots[host] = rp
    except Exception as e:
        et = '%s: %s' % (type(e).__name__, str(e)[:300])
        rec.update(status=None, error=et, blocked=_classify(et, None))
        _robots[host] = None
    rec['seconds'] = round(time.time() - t0, 2)
    _log(rec)
    return _robots[host]


def get(id_, url, accept=None, max_mb=60, force=False, ext=None, save=True):
    """returns dict(ok, status, path, sha256, bytes, blocked, error)"""
    u = urllib.parse.urlparse(url)
    host = u.netloc
    ext = ext or ('.json' if 'fo=json' in url or url.endswith('.json') or 'f=json' in url or 'format=json' in url else
                  '.pdf' if u.path.lower().endswith('.pdf') else '.txt' if u.path.lower().endswith('.txt') else '.html')
    path = os.path.join(OUT, id_ + ext)
    if os.path.exists(path) and not force:
        b = open(path, 'rb').read()
        return dict(ok=True, cached=True, status=200, path=path, sha256=hashlib.sha256(b).hexdigest(), bytes=len(b))
    rp = robots_for(host, u.scheme)
    if rp is None and _robots.get(host, 'x') is None:
        rec = dict(id=id_, url=url, utc=utc(), method='GET', status=None, blocked='robots_unavailable_or_host_blocked',
                   note='robots.txt could not be read or was refused; the page was not requested')
        _log(rec)
        return dict(ok=False, status=None, blocked='robots_unavailable_or_host_blocked')
    if rp is not None and not rp.can_fetch(UA, url):
        rec = dict(id=id_, url=url, utc=utc(), method='GET', status=None, blocked='robots_disallow',
                   note='robots.txt of %s disallows this path for this client; not requested' % host)
        _log(rec)
        return dict(ok=False, status=None, blocked='robots_disallow')
    _wait(host)
    t0 = time.time()
    rec = dict(id=id_, url=url, utc=utc(), method='GET')
    hdr = {'User-Agent': UA}
    if accept:
        hdr['Accept'] = accept
    try:
        r = requests.get(url, headers=hdr, timeout=(10, 90), stream=True, allow_redirects=True)
        body = b''
        lim = max_mb * 1024 * 1024
        for chunk in r.iter_content(65536):
            body += chunk
            if len(body) > lim:
                rec['truncated_at_bytes'] = len(body)
                break
        rec.update(status=r.status_code, final_url=r.url, ctype=r.headers.get('content-type'),
                   clen=r.headers.get('content-length'), bytes=len(body), lastmod=r.headers.get('last-modified'))
        rec['sha256'] = hashlib.sha256(body).hexdigest()
        if r.status_code == 200 and save:
            open(path, 'wb').write(body)
            rec['saved'] = os.path.relpath(path, ROOT)
        bl = _classify('', r.status_code)
        if bl:
            rec['blocked'] = bl
        rec['seconds'] = round(time.time() - t0, 2)
        _log(rec)
        return dict(ok=(r.status_code == 200), status=r.status_code, path=path if r.status_code == 200 else None,
                    sha256=rec['sha256'], bytes=len(body), blocked=bl, final_url=r.url)
    except Exception as e:
        et = '%s: %s' % (type(e).__name__, str(e)[:400])
        bl = _classify(et, None)
        rec.update(status=None, error=et, blocked=bl, seconds=round(time.time() - t0, 2))
        _log(rec)
        return dict(ok=False, status=None, error=et, blocked=bl)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(1)
    if a[0] == 'get':
        id_, url = a[1], a[2]
        accept = a[a.index('--accept') + 1] if '--accept' in a else None
        mb = float(a[a.index('--max-mb') + 1]) if '--max-mb' in a else 60
        res = get(id_, url, accept=accept, max_mb=mb, force='--force' in a)
        print(json.dumps(res))
    elif a[0] == 'batch':
        for line in open(a[1]):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'):
                continue
            parts = line.split('\t')
            res = get(parts[0], parts[1], accept=parts[2] if len(parts) > 2 and parts[2] else None)
            print(parts[0], json.dumps({k: v for k, v in res.items() if k != 'path'}))
