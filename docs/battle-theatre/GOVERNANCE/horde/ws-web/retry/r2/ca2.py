#!/usr/bin/env python3
"""Chronicling America access for the lookup retries (2026-11-16): documented JSON search of loc.gov plus the OCR (ALTO) text of the pages.

  * search:  https://www.loc.gov/collections/chronicling-america/?q=...&dates=...&fo=json   (path /collections/ is allowed by robots.txt;
             the robots.txt crawl delay of 5 seconds is kept: rlib.PAUSE['www.loc.gov'] = 5)
  * text:    https://tile.loc.gov/storage-services<segment>   (ALTO XML of the page), rebuilt into column-ordered reading text by the
             newspapers task's rebuild_cols.py (rules in its docstring: nothing corrected, only the order of the lines changes)
Every request is logged (retry/r2/ca_attempts.jsonl) with http, size and sha256; a page already held by the newspapers task is read from its
copy and not requested again. A challenge page or a refusal is recorded and never worked around.
Run scripts with:  python3 -I <script>
"""
import gzip, hashlib, json, os, re, shutil, sys, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
RETRY = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(RETRY, 'scripts'))
import rlib
CA_SCRIPTS = os.path.abspath(os.path.join(RETRY, '..', 'ca', 'scripts'))
sys.path.insert(0, CA_SCRIPTS)
import rebuild_cols  # the newspapers task's ALTO reader (read-only use)
import calib         # only for the pure helpers result_meta / page_paths (read-only use)

rlib.PAUSE['www.loc.gov'] = 5.0
rlib.PAUSE['tile.loc.gov'] = 1.2
OUT = os.path.join(rlib.WEBDIR, 'ca')
LOG = os.path.join(HERE, 'ca_attempts.jsonl')
BASE = 'https://www.loc.gov/collections/chronicling-america/'
ALTO_BASE = 'https://tile.loc.gov/storage-services'


def search(q, dates, c=50, sp=1):
    params = [('fo', 'json'), ('at', 'results,pagination'), ('dl', 'page'), ('c', str(c)), ('q', q), ('dates', dates)]
    if sp > 1:
        params.append(('sp', str(sp)))
    url = BASE + '?' + urllib.parse.urlencode(params, safe='/')
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    dest = os.path.join(OUT, 'search', key + '.json')
    cached = os.path.exists(dest)
    rec = {'kind': 'search', 'q': q, 'dates': dates, 'c': c, 'sp': sp, 'url': url, 'cached': cached}
    if not cached:
        r = rlib.curl(url, dest, max_time=180)
        rec.update({k: r.get(k) for k in ('at', 'http', 'bytes', 'sha256', 'error', 'body_start', 'curl_exit') if r.get(k) is not None})
        if r.get('http') != 200:
            rlib.jsonl_append(LOG, rec)
            return None, rec
    else:
        rec['at'] = rlib.now_utc()
        rec['http'] = 200
        rec['sha256'] = rlib.sha_file(dest)
    d = json.load(open(dest, encoding='utf-8'))
    rec['file'] = rlib.rel(dest)
    rec['of'] = (d.get('pagination') or {}).get('of')
    rec['returned'] = len(d.get('results', []))
    rlib.jsonl_append(LOG, rec)
    return d, rec


def page_text(meta):
    """Return (path_to_reading_text, note) for one result page; fetches the ALTO once."""
    pid = meta['page_id']
    shared, _ = calib.page_paths(pid)  # the newspapers task's copy, if it already holds the page
    if os.path.exists(shared):
        return shared, 'copy held by the newspapers task'
    base = os.path.join(OUT, 'pages', *pid.split('/'))
    txt = base + '.txt'
    if os.path.exists(txt):
        return txt, 'cached by this task'
    seg = meta['segment']
    if not seg:
        return None, 'no text segment in the search result'
    url = ALTO_BASE + seg
    raw = base + '.alto.tmp'
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    r = rlib.curl(url, raw, max_time=120)
    rec = {'kind': 'page', 'page_id': pid, 'url': url}
    rec.update({k: r.get(k) for k in ('at', 'http', 'bytes', 'sha256', 'error', 'body_start', 'curl_exit') if r.get(k) is not None})
    if r.get('http') != 200:
        rlib.jsonl_append(LOG, rec)
        return None, 'HTTP %s' % r.get('http')
    gz = base + '.alto.xml.gz'
    with open(raw, 'rb') as fi, open(gz, 'wb') as fz, gzip.GzipFile(filename='', mode='wb', fileobj=fz, compresslevel=9, mtime=0) as fo:
        shutil.copyfileobj(fi, fo)
    text, words, info = rebuild_cols.rebuild(raw)
    os.remove(raw)
    with open(txt, 'w', encoding='utf-8') as f:
        f.write(text)
    rec['text_file'] = rlib.rel(txt)
    rec['text_sha256'] = rlib.sha_file(txt)
    rec['alto_gz'] = rlib.rel(gz)
    rec['rules'] = info.get('rules')
    rlib.jsonl_append(LOG, rec)
    return txt, 'fetched'


def meta_of(r):
    return calib.result_meta(r)
