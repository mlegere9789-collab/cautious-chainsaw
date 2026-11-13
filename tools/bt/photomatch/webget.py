#!/usr/bin/env python3
"""Polite fetch of an openly readable public page or file for the Q16 camera-position search.
One GET per call, at least 1.2 s after the previous request to the same host (lock file per host, shared by every process that uses this tool).
Allowed hosts only (official bodies and archive.org); redirects are followed only inside the allow-list. No login, no CAPTCHA, no retry on a block.
Saves: tmp/library/web/photomatch/<host>/<name> (raw bytes), <name>.txt (text: HTML stripped, or pdftotext -layout for a PDF),
and appends one line to tmp/library/web/photomatch/manifest.jsonl (url, final url, http, bytes, sha256 of raw and of text, retrieved date).
Usage: python3 -I tools/bt/photomatch/webget.py <url> [--name <file name>] [--force]"""
import fcntl, hashlib, html, json, os, re, subprocess, sys, time
from urllib.parse import urlparse
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
BASE = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch'); MAN = os.path.join(BASE, 'manifest.jsonl')
ALLOWED = {'www.nps.gov', 'home.nps.gov', 'nps.gov', 'www.npshistory.com', 'npshistory.com', 'www.loc.gov', 'loc.gov', 'tile.loc.gov', 'cdn.loc.gov', 'archive.org',
           'www.gutenberg.org', 'catalog.archives.gov', 'irma.nps.gov', 'museum.nps.gov', 'npgallery.nps.gov'}
PAUSE = 1.2
def sha(b): return hashlib.sha256(b).hexdigest()
def paced(host, fn):
    os.makedirs(BASE, exist_ok=True); lk = os.path.join(BASE, '.pace-' + host)
    with open(lk, 'a+') as f:
        fcntl.flock(f, fcntl.LOCK_EX); f.seek(0); s = f.read().strip(); last = float(s) if s else 0.0
        dt = time.time() - last
        if dt < PAUSE: time.sleep(PAUSE - dt)
        try: return fn()
        finally: f.seek(0); f.truncate(); f.write(str(time.time())); f.flush()
def html_text(b):
    s = b.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript|svg)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>|</figcaption>|</td>', '\n', s)
    s = re.sub(r'(?s)<[^>]+>', ' ', s); s = html.unescape(s)
    s = re.sub(r'[ \t\r\f\v ]+', ' ', s); s = re.sub(r' *\n[ \n]*', '\n', s); return s.strip() + '\n'
def get(url, name=None, force=False):
    u = url; hops = []
    for _ in range(4):
        host = urlparse(u).netloc.lower()
        if host not in ALLOWED: return {'url': url, 'status': 'not_requested', 'reason': f'host {host} is not on the allow-list', 'hops': hops}
        d = os.path.join(BASE, host); os.makedirs(d, exist_ok=True)
        nm = name or (re.sub(r'[^A-Za-z0-9._-]+', '_', (urlparse(u).path.strip('/') or 'index') + ('_' + urlparse(u).query if urlparse(u).query else ''))[-150:])
        dst = os.path.join(d, nm)
        if os.path.exists(dst) and os.path.getsize(dst) > 0 and not force and not hops:
            return {'url': url, 'status': 'cached', 'file': os.path.relpath(dst, ROOT)}
        def one():
            r = subprocess.run(['curl', '-sS', '-m', '300', '-A', 'Mozilla/5.0 (compatible; research fetch; 1 request per second)', '-o', dst + '.part', '-w', '%{http_code}\t%{redirect_url}\t%{content_type}', u], capture_output=True, text=True)
            return (r.stdout or '\t\t').split('\t') + [r.stderr.strip()[:200]]
        p = paced(host, one); code, loc, ctype, err = p[0], p[1] if len(p) > 1 else '', p[2] if len(p) > 2 else '', p[-1]
        hops.append({'url': u, 'http': code})
        if code in ('301', '302', '303', '307', '308') and loc:
            if os.path.exists(dst + '.part'): os.remove(dst + '.part')
            u = loc; continue
        rec = {'url': url, 'url_final': u, 'http': code, 'content_type': ctype, 'hops': hops, 'retrieved': time.strftime('%Y-%m-%d'), 'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
        if code != '200':
            if os.path.exists(dst + '.part'): os.remove(dst + '.part')
            rec.update(status='failed', error=err or ('HTTP ' + code))
        else:
            os.replace(dst + '.part', dst); b = open(dst, 'rb').read(); rec.update(status='ok', file=os.path.relpath(dst, ROOT), bytes=len(b), sha256=sha(b))
            txt = None
            if b[:5] == b'%PDF-':
                subprocess.run(['pdftotext', '-layout', dst, dst + '.txt'], capture_output=True)
                if os.path.exists(dst + '.txt'): txt = open(dst + '.txt', 'rb').read()
            elif 'html' in ctype or b[:200].lstrip().lower().startswith((b'<!doctype', b'<html')):
                txt = html_text(b).encode('utf-8'); open(dst + '.txt', 'wb').write(txt)
            elif ctype.startswith('text/') or 'json' in ctype:
                txt = b
            if txt is not None: rec.update(text_file=os.path.relpath(dst + '.txt', ROOT) if os.path.exists(dst + '.txt') else rec['file'], text_bytes=len(txt), text_sha256=sha(txt))
        with open(MAN, 'a') as f:
            fcntl.flock(f, fcntl.LOCK_EX); f.write(json.dumps(rec) + '\n')
        return rec
    return {'url': url, 'status': 'failed', 'error': 'too many redirects', 'hops': hops}
if __name__ == '__main__':
    a = sys.argv[1:]; force = '--force' in a; name = a[a.index('--name') + 1] if '--name' in a else None
    for u in [x for i, x in enumerate(a) if x.startswith('http')]:
        print(json.dumps(get(u, name, force)))
