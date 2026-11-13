#!/usr/bin/env python3
"""Fetch web pages (HTML) of official bodies at 1 request per second, save the body and a
tag-stripped text, and append one JSON line per request to the tracked lookup log.

Usage: python3 -I fetch_pages.py <list.txt> [--log lookups.jsonl]
  list.txt: one 'ID<space>URL' per line ('#' comments allowed).
Saved as tmp/library/web/nps/pages/<ID>/<ID>.html and <ID>.txt (one '=== PAGE 1 ===' marker).
A non-200 answer or a refused host is recorded as failed/blocked and never retried here.
"""
import datetime, hashlib, html, json, os, re, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..', '..'))
DEST = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps', 'pages')
DEFAULT_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lookups.jsonl')


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def to_text(raw):
    title = None
    m = re.search(r'(?is)<title[^>]*>(.*?)</title>', raw)
    if m:
        title = html.unescape(re.sub(r'\s+', ' ', m.group(1))).strip()
    body = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', raw)
    body = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>|</blockquote>', '\n', body)
    body = re.sub(r'(?s)<[^>]+>', ' ', body)
    body = html.unescape(body).replace('\xa0', ' ')
    body = re.sub(r'[ \t\r\f\v]+', ' ', body)
    body = re.sub(r' ?\n ?', '\n', body)
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return title, body


def main():
    lst = sys.argv[1]
    log = DEFAULT_LOG
    if '--log' in sys.argv:
        log = sys.argv[sys.argv.index('--log') + 1]
    for line in open(lst):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        sid, url = line.split(None, 1)
        d = os.path.join(DEST, sid)
        if os.path.exists(os.path.join(d, sid + '.txt')):
            continue
        os.makedirs(d, exist_ok=True)
        fp = os.path.join(d, sid + '.html')
        p = subprocess.run(['curl', '-sS', '-L', '--max-redirs', '3', '-m', '90', '-o', fp, '-w',
                            '%{http_code} %{content_type} %{url_effective}', url], capture_output=True, text=True)
        time.sleep(1.2)
        parts = p.stdout.strip().split(' ', 2)
        http = int(parts[0]) if parts and parts[0].isdigit() else None
        rec = {'id': sid, 'url': url, 'at': now(), 'http': http, 'curl_exit': p.returncode,
               'url_effective': parts[2] if len(parts) > 2 else None}
        if p.returncode != 0 or http != 200 or not os.path.exists(fp):
            rec['status'] = 'failed'
            rec['reason'] = p.stderr.strip()[:200] or ('HTTP %s' % http)
            if os.path.exists(fp):
                os.remove(fp)
        else:
            raw = open(fp, 'rb').read().decode('utf-8', 'replace')
            title, body = to_text(raw)
            tp = os.path.join(d, sid + '.txt')
            with open(tp, 'w', encoding='utf-8') as f:
                f.write('=== PAGE 1 ===\n' + body + '\n')
            rec.update({'status': 'ok', 'bytes': os.path.getsize(fp), 'sha256': sha(fp), 'title': title,
                        'text_path': os.path.relpath(tp, ROOT), 'text_bytes': os.path.getsize(tp), 'text_sha256': sha(tp)})
        with open(log, 'a') as f:
            f.write(json.dumps(rec, sort_keys=True) + '\n')
        print(sid, rec['status'], http, rec.get('bytes'), (rec.get('title') or '')[:90], flush=True)


if __name__ == '__main__':
    main()
