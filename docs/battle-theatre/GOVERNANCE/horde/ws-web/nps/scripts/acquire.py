#!/usr/bin/env python3
"""Acquire openly readable National Park Service reports and extract their text.

For every catalogue entry (catalogue.json: id, url, ...):
  1. GET the file with curl (one request, then a pause of at least 1 s; no retries on a
     policy denial, no work-around for a refused host; a failure is recorded as failed).
  2. Record bytes and sha256 of the file as served.
  3. PDF: run pdfinfo and pdftotext twice (reading order and -layout) and write
       tmp/library/web/nps/<id>/<id>.txt          reading-order text
       tmp/library/web/nps/<id>/<id>.layout.txt   layout text (tables)
     each with a marker line '=== PAGE n ===' before every PDF page (n = 1-based PDF page
     index, NOT the printed page number).
     HTML: save the page and write a tag-stripped text with one marker '=== PAGE 1 ==='.
  4. Record text bytes, sha256 and text-layer coverage (pages with more than 200
     characters) in tmp/library/web/nps/MANIFEST.json and append one line to the tracked
     log (acquire_log.jsonl next to the catalogue).
  5. Delete the PDF when it is larger than --keep-pdf-mb (the text stays; the PDF hash and
     size stay recorded so that a re-download can be compared).

Each download lives in its own directory; this script lives elsewhere and is run with
`python3 -I`. Only the standard library, curl and poppler-utils are used.

Usage:
  python3 -I acquire.py --catalogue <catalogue.json> [--only ID[,ID...]] [--keep-pdf-mb 25]
"""
import argparse, datetime, hashlib, html, json, os, re, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..', '..'))
DEST = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
MANIFEST = os.path.join(DEST, 'MANIFEST.json')
PAUSE = 1.2


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as f:
            return json.load(f)
    return {'_doc': 'Local manifest of tmp/library/web/nps (untracked). One entry per acquired file.', 'items': {}}


def save_manifest(m):
    tmp = MANIFEST + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(m, f, indent=1, sort_keys=True)
    os.replace(tmp, MANIFEST)


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def pdf_info(path):
    p = run(['pdfinfo', path])
    info = {}
    for line in p.stdout.decode('utf-8', 'replace').splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            info[k.strip()] = v.strip()
    return info


BENCH = os.path.join(ROOT, 'tools', 'horde', 'bench.sh')
USE_BENCH = False


def pdf_text(path, out_path, layout):
    # the text extraction of a large PDF is the only CPU-heavy step: it goes through the machine lock
    cmd = ([BENCH] if USE_BENCH and os.path.getsize(path) > 20e6 else []) + ['pdftotext', '-enc', 'UTF-8']
    if layout:
        cmd.append('-layout')
    cmd += [path, '-']
    p = run(cmd)
    raw = p.stdout.decode('utf-8', 'replace')
    pages = raw.split('\f')
    if pages and pages[-1].strip() == '':
        pages = pages[:-1]
    with_text = 0
    with open(out_path, 'w', encoding='utf-8') as f:
        for i, pg in enumerate(pages, 1):
            if len(pg.strip()) > 200:
                with_text += 1
            f.write('=== PAGE %d ===\n' % i)
            f.write(pg.rstrip('\n') + '\n')
    return len(pages), with_text, p.returncode, p.stderr.decode('utf-8', 'replace')[:300]


def html_text(path, out_path):
    raw = open(path, 'rb').read().decode('utf-8', 'replace')
    raw = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw)
    raw = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|</h[1-6]>|</tr>', '\n', raw)
    txt = re.sub(r'(?s)<[^>]+>', ' ', raw)
    txt = html.unescape(txt)
    txt = re.sub(r'[ \t\r\f\v]+', ' ', txt)
    txt = re.sub(r' ?\n ?', '\n', txt)
    txt = re.sub(r'\n{3,}', '\n\n', txt).strip()
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('=== PAGE 1 ===\n' + txt + '\n')
    return 1, (1 if len(txt) > 200 else 0)


def fetch(url, out_path, max_time):
    p = run(['curl', '-sS', '-L', '--max-redirs', '3', '-m', str(max_time), '-o', out_path,
             '-w', '%{http_code} %{size_download} %{content_type} %{url_effective}', url], text=True)
    parts = p.stdout.strip().split(' ', 3)
    http = int(parts[0]) if parts and parts[0].isdigit() else None
    ctype = parts[2] if len(parts) > 2 else None
    eff = parts[3] if len(parts) > 3 else None
    return http, ctype, eff, p.returncode, p.stderr.strip()[:300]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--catalogue', required=True)
    ap.add_argument('--only', default='')
    ap.add_argument('--keep-pdf-mb', type=float, default=25.0)
    ap.add_argument('--max-time', type=int, default=3600)
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--bench', action='store_true', help='run pdftotext of files over 20 MB through tools/horde/bench.sh')
    a = ap.parse_args()
    global USE_BENCH
    USE_BENCH = a.bench
    cat = json.load(open(a.catalogue))
    log_path = os.path.join(os.path.dirname(os.path.abspath(a.catalogue)), 'acquire_log.jsonl')
    only = set(x for x in a.only.split(',') if x)
    os.makedirs(DEST, exist_ok=True)
    man = load_manifest()
    for e in cat['items']:
        sid = e['id']
        if only and sid not in only:
            continue
        if e.get('skip'):
            continue
        if not a.redo and sid in man['items'] and man['items'][sid].get('status') == 'acquired' \
                and os.path.exists(os.path.join(DEST, sid, sid + '.txt')):
            continue
        d = os.path.join(DEST, sid)
        os.makedirs(d, exist_ok=True)
        url = e['url']
        is_pdf = url.lower().split('?')[0].endswith('.pdf')
        fname = sid + ('.pdf' if is_pdf else '.html')
        fpath = os.path.join(d, fname)
        rec = {'id': sid, 'url': url, 'fetched_at': now()}
        http, ctype, eff, rc, err = fetch(url, fpath, a.max_time)
        time.sleep(PAUSE)
        rec.update({'http': http, 'content_type': ctype, 'url_effective': eff, 'curl_exit': rc})
        if rc != 0 or http != 200 or not os.path.exists(fpath) or os.path.getsize(fpath) == 0:
            rec.update({'status': 'failed', 'reason': (err or 'HTTP %s' % http)})
            if os.path.exists(fpath):
                os.remove(fpath)
        else:
            rec['bytes'] = os.path.getsize(fpath)
            rec['sha256'] = sha256_file(fpath)
            head = open(fpath, 'rb').read(8)
            if is_pdf and not head.startswith(b'%PDF'):
                rec.update({'status': 'failed', 'reason': 'served file is not a PDF (first bytes %r)' % head})
                os.remove(fpath)
            elif is_pdf:
                info = pdf_info(fpath)
                rec['pdf'] = {k: info.get(k) for k in ('Title', 'Author', 'Creator', 'Producer', 'CreationDate', 'ModDate', 'Pages', 'Encrypted')}
                t1 = os.path.join(d, sid + '.txt')
                t2 = os.path.join(d, sid + '.layout.txt')
                n, w, rc1, e1 = pdf_text(fpath, t1, False)
                n2, w2, rc2, e2 = pdf_text(fpath, t2, True)
                rec.update({'pages': n, 'pages_with_text': w, 'pdftotext_exit': [rc1, rc2],
                            'text_path': os.path.relpath(t1, ROOT), 'text_bytes': os.path.getsize(t1), 'text_sha256': sha256_file(t1),
                            'layout_text_path': os.path.relpath(t2, ROOT), 'layout_text_bytes': os.path.getsize(t2), 'layout_text_sha256': sha256_file(t2),
                            'status': 'acquired'})
                if e1:
                    rec['pdftotext_stderr'] = e1
                if rec['bytes'] > a.keep_pdf_mb * 1e6:
                    os.remove(fpath)
                    rec['file_kept'] = False
                else:
                    rec['file_kept'] = True
                    rec['file_path'] = os.path.relpath(fpath, ROOT)
            else:
                t1 = os.path.join(d, sid + '.txt')
                n, w = html_text(fpath, t1)
                rec.update({'pages': n, 'pages_with_text': w, 'text_path': os.path.relpath(t1, ROOT),
                            'text_bytes': os.path.getsize(t1), 'text_sha256': sha256_file(t1),
                            'file_kept': True, 'file_path': os.path.relpath(fpath, ROOT), 'status': 'acquired'})
        man = load_manifest()
        man['items'][sid] = rec
        save_manifest(man)
        with open(log_path, 'a') as f:
            f.write(json.dumps(rec, sort_keys=True) + '\n')
        print(sid, rec.get('status'), rec.get('http'), rec.get('bytes'), 'pages', rec.get('pages'), 'with_text', rec.get('pages_with_text'), flush=True)


if __name__ == '__main__':
    main()
