#!/usr/bin/env python3
"""Shared helpers of the lookup-retry task (workstream bt-web, task lookup-retries).

Polite fetch (one request per host at a time, a pause between requests to the same host, shared by every process
that uses this module through a lock file per host), sha256, jsonl appends under a lock, text normalisation and the
verbatim quote locator used by every evidence line.

No login, no CAPTCHA, no proxy tricks. A refusal (HTTP 403 from the site or 'CONNECT tunnel failed, response 403' from the
egress proxy) is recorded and never worked around.

Run scripts with:  python3 -I <script>
"""
import fcntl, hashlib, html, json, os, re, subprocess, sys, time
from urllib.parse import urlparse, quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', '..', '..', '..'))
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
RETRY = os.path.join(GOV, 'horde', 'ws-web', 'retry')
WEBDIR = os.path.join(ROOT, 'tmp', 'library', 'web', 'retry')
PACE_DIR = os.path.join(WEBDIR, '.pace')
UA = 'GettysburgBattleTheatre-SourceCheck/1.0 (non-commercial history research; one request at a time, at most 1 per second)'
PAUSE = {'www.loc.gov': 5.0, 'tile.loc.gov': 1.2, 'cdn.loc.gov': 1.2, 'chroniclingamerica.loc.gov': 2.0, 'archive.org': 1.2}
DEFAULT_PAUSE = 1.2


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''):
            h.update(ch)
    return h.hexdigest()


def rel(p):
    return os.path.relpath(os.path.abspath(p), ROOT)


def now_utc():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def today():
    return time.strftime('%Y-%m-%d', time.gmtime())


def jsonl_append(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'a') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps(obj, ensure_ascii=False, sort_keys=True) + '\n')
        f.flush()


def read_jsonl(path):
    out = []
    if not os.path.exists(path):
        return out
    with open(path) as f:
        for l in f:
            l = l.strip()
            if l:
                out.append(json.loads(l))
    return out


def paced(host, fn):
    os.makedirs(PACE_DIR, exist_ok=True)
    lk = os.path.join(PACE_DIR, host)
    pause = PAUSE.get(host, DEFAULT_PAUSE)
    with open(lk, 'a+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.seek(0)
        s = f.read().strip()
        last = float(s) if s else 0.0
        dt = time.time() - last
        if dt < pause:
            time.sleep(pause - dt)
        try:
            return fn()
        finally:
            f.seek(0)
            f.truncate()
            f.write(str(time.time()))
            f.flush()


def html_text(b):
    s = b.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript|svg)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>|</figcaption>|</td>', '\n', s)
    s = re.sub(r'(?s)<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t\r\f\v ]+', ' ', s)
    s = re.sub(r' *\n[ \n]*', '\n', s)
    return s.strip() + '\n'


def curl(url, dest=None, headers=None, max_time=180, follow=True, head=False, pause_host=None):
    """One paced request. Returns a dict: http, bytes, content_type, final_url, curl_exit, error, file, sha256, seconds."""
    host = pause_host or urlparse(url).netloc.lower()
    if dest:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
    part = (dest + '.part') if dest else '/dev/null'
    cmd = ['curl', '-sS', '-m', str(max_time), '-A', UA, '-o', part, '-w', '%{http_code}\t%{content_type}\t%{url_effective}\t%{size_download}\t%{num_redirects}']
    if follow and not head:
        cmd += ['-L', '--max-redirs', '5']
    if head:
        cmd += ['-I']
    for k, v in (headers or {}).items():
        cmd += ['-H', '%s: %s' % (k, v)]
    cmd.append(url)

    def one():
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r, time.time() - t0

    r, secs = paced(host, one)
    parts = (r.stdout or '').split('\t')
    rec = {'url': url, 'at': now_utc(), 'curl_exit': r.returncode, 'seconds': round(secs, 2)}
    rec['http'] = int(parts[0]) if parts and parts[0].isdigit() else 0
    rec['content_type'] = parts[1] if len(parts) > 1 else ''
    rec['final_url'] = parts[2] if len(parts) > 2 else url
    rec['bytes'] = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
    rec['redirects'] = int(parts[4]) if len(parts) > 4 and parts[4].isdigit() else 0
    err = (r.stderr or '').strip()
    if err:
        rec['error'] = err[:300]
    if dest and rec['http'] == 200 and os.path.exists(part) and os.path.getsize(part) > 0:
        os.replace(part, dest)
        rec['file'] = rel(dest)
        rec['sha256'] = sha_file(dest)
        rec['bytes'] = os.path.getsize(dest)
    else:
        if dest and os.path.exists(part):
            try:
                snippet = open(part, 'rb').read(600)
            except Exception:
                snippet = b''
            if snippet:
                rec['body_start'] = snippet.decode('utf-8', 'replace')[:300]
            os.remove(part)
    return rec


WS = re.compile(r'\s+')


def norm_ws(s):
    return WS.sub(' ', s).strip()


def find_quote(text, quote, start=0):
    """Locate quote in text with whitespace normalised on both sides. Returns (offset_in_text, matched_raw) or None.
    The offset is into the raw text (not the normalised one)."""
    q = norm_ws(quote)
    if not q:
        return None
    pat = r'\s+'.join(re.escape(w) for w in q.split(' '))
    m = re.compile(pat).search(text, start)
    if not m:
        return None
    return m.start(), m.group(0)


def file_text(path):
    with open(path, 'r', encoding='utf-8', errors='replace', newline='') as f:
        return f.read()


def abspath(p):
    return p if os.path.isabs(p) else os.path.join(ROOT, p)
