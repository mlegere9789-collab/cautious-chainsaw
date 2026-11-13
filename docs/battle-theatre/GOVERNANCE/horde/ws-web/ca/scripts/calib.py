#!/usr/bin/env python3
"""Shared helpers for the Chronicling America task (bt-web, newspapers-1863).

Everything here is read-only against public Library of Congress hosts:
  * search:  https://www.loc.gov/collections/chronicling-america/?q=...&fo=json   (JSON search of the page-level OCR index)
  * text:    https://tile.loc.gov/storage-services/service/ndnp/<batch path>/<page>.xml   (the ALTO OCR file of the page)
  * images:  https://tile.loc.gov/image-services/iiif/...   (page derivatives; crops of a quoted passage)
The old host chroniclingamerica.loc.gov answers 308 and points to www.loc.gov; it is not used any more.

Rules built in: at most one request start per second across all processes of this task (flock on a
stamp file), every request logged to ../acquire_log.jsonl, no retry of a refused answer, no User-Agent
disguise, a Cloudflare challenge page ("Just a moment") is recorded as blocked (per kind of URL) and never
worked around. Known: www.loc.gov/resource/<lccn>/<date>/ed-N/manifest.json and the HTML landing pages answer
with a challenge; the JSON search, the text service and the image service do not.
"""
import datetime, fcntl, hashlib, json, os, re, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
CA_DOCS = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(HERE, *(['..'] * 7)))
TMP = os.path.join(ROOT, 'tmp', 'library', 'web', 'ca')
SEARCH_DIR = os.path.join(TMP, 'search')
PAGES_DIR = os.path.join(TMP, 'pages')
IMAGES_DIR = os.path.join(TMP, 'images')
STAMP = os.path.join(TMP, '.ratestamp')
LOG = os.path.join(CA_DOCS, 'acquire_log.jsonl')
PAGES_MANIFEST = os.path.join(CA_DOCS, 'pages.jsonl')
SEARCH_INDEX = os.path.join(CA_DOCS, 'searches.jsonl')
MIN_GAP = 1.1  # seconds between request starts (rule: at most 1 request per second)

SEARCH_BASE = 'https://www.loc.gov/collections/chronicling-america/'
TEXT_SVC = 'https://tile.loc.gov/text-services/word-coordinates-service'


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def rel(p):
    return os.path.relpath(p, ROOT)


def append_jsonl(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    line = json.dumps(obj, ensure_ascii=False, sort_keys=True) + '\n'
    with open(path, 'a', encoding='utf-8') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(line)
        fcntl.flock(f, fcntl.LOCK_UN)


def _pace():
    """Block until one MIN_GAP has passed since the last request start of any process of this task."""
    os.makedirs(TMP, exist_ok=True)
    with open(STAMP, 'a+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.seek(0)
        try:
            last = float(f.read().strip() or 0)
        except ValueError:
            last = 0.0
        wait = last + MIN_GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        f.seek(0)
        f.truncate()
        f.write('%.3f' % time.time())
        f.flush()
        fcntl.flock(f, fcntl.LOCK_UN)


BLOCKED_FILE = os.path.join(TMP, 'blocked_patterns.json')


def url_pattern(url):
    """host + path with digit runs folded: one pattern per kind of URL (a challenge page on one kind never stops another)."""
    u = urllib.parse.urlparse(url)
    return u.netloc + re.sub(r'\d+', 'N', u.path)


def blocked_patterns():
    try:
        return json.load(open(BLOCKED_FILE))
    except Exception:
        return []


def is_blocked(url):
    return url_pattern(url) in blocked_patterns()


def mark_blocked(url):
    pats = blocked_patterns()
    pat = url_pattern(url)
    if pat not in pats:
        pats.append(pat)
        os.makedirs(TMP, exist_ok=True)
        json.dump(pats, open(BLOCKED_FILE, 'w'), indent=1)


def http_get(url, out_path, timeout=150, note=None):
    """GET url into out_path (via curl). Returns dict(status, ctype, bytes, sha256, seconds, blocked).
    Never retries; a challenge page is flagged and sets tmp/.../BLOCKED so later calls stop."""
    if is_blocked(url):
        return {'status': 0, 'blocked': True, 'error': 'this kind of URL answered with a challenge page earlier; not requested again'}
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp = out_path + '.part'
    _pace()
    t0 = time.time()
    p = subprocess.run(['curl', '-sS', '-m', str(timeout), '-o', tmp, '-w', '%{http_code}\t%{content_type}\t%{size_download}', url],
                       capture_output=True, text=True)
    secs = round(time.time() - t0, 2)
    rec = {'ts': now(), 'url': url, 'seconds': secs, 'note': note}
    if p.returncode != 0:
        rec.update(status=0, error=p.stderr.strip()[:300], blocked=False)
        append_jsonl(LOG, rec)
        if os.path.exists(tmp):
            os.remove(tmp)
        return rec
    code, ctype, size = (p.stdout.split('\t') + ['', '', ''])[:3]
    rec.update(status=int(code or 0), content_type=ctype, bytes=int(size or 0))
    body_head = b''
    if os.path.exists(tmp):
        with open(tmp, 'rb') as f:
            body_head = f.read(4000)
    blocked = rec['status'] in (403, 429) and (b'Just a moment' in body_head or b'challenge' in body_head.lower())
    rec['blocked'] = blocked
    if blocked:
        mark_blocked(url)
    if rec['status'] == 200 and os.path.exists(tmp):
        os.replace(tmp, out_path)
        rec['sha256'] = sha256_file(out_path)
        rec['saved'] = rel(out_path)
    else:
        if os.path.exists(tmp):
            os.remove(tmp)
    append_jsonl(LOG, rec)
    return rec


# ---------------------------------------------------------------- search

def search_url(q=None, dates=None, c=100, sp=1, extra=None):
    params = [('fo', 'json'), ('at', 'results,pagination'), ('dl', 'page'), ('c', str(c))]
    if q:
        params.append(('q', q))
    if dates:
        params.append(('dates', dates))
    if sp and sp > 1:
        params.append(('sp', str(sp)))
    for k, v in (extra or {}).items():
        params.append((k, v))
    return SEARCH_BASE + '?' + urllib.parse.urlencode(params, safe='/')


def search(q=None, dates=None, c=100, sp=1, extra=None, force=False):
    """Run (or reuse) one search; returns (path, parsed_json or None, record)."""
    url = search_url(q, dates, c, sp, extra)
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    path = os.path.join(SEARCH_DIR, key + '.json')
    rec = None
    if force or not os.path.exists(path):
        rec = http_get(url, path, timeout=240, note='search')
        if rec.get('status') != 200:
            return path, None, rec
        d = json.load(open(path, encoding='utf-8'))
        append_jsonl(SEARCH_INDEX, {'key': key, 'url': url, 'q': q, 'dates': dates, 'c': c, 'sp': sp, 'extra': extra,
                                    'ts': now(), 'results': len(d.get('results', [])),
                                    'of': d.get('pagination', {}).get('of'), 'sha256': sha256_file(path)})
    d = json.load(open(path, encoding='utf-8'))
    return path, d, rec


def result_meta(r):
    """Normalise one search-result entry."""
    def first(x):
        return x[0] if isinstance(x, list) and x else x
    lccn = first(r.get('number_lccn'))
    date = r.get('date')
    ed = first(r.get('number_edition')) or '1'
    seq = int(first(r.get('number_page')) or r.get('shelf_id') or 0)
    wc = r.get('word_coordinates_url') or ''
    seg = urllib.parse.parse_qs(urllib.parse.urlparse(wc).query).get('segment', [''])[0]
    title = first(r.get('partof_title')) or ''
    return {'page_id': '%s/%s/ed-%s/seq-%d' % (lccn, date, ed, seq), 'lccn': lccn, 'date': date, 'edition': int(ed), 'seq': seq,
            'segment': seg, 'paper': title, 'city': first(r.get('location_city')), 'state': first(r.get('location_state')),
            'resource_url': 'https://www.loc.gov/resource/%s/%s/ed-%s/?sp=%d&st=text' % (lccn, date, ed, seq),
            'image_title': r.get('title'), 'snippet': first(r.get('description')) or ''}


# ---------------------------------------------------------------- page text

ALTO_BASE = 'https://tile.loc.gov/storage-services'


def page_paths(page_id):
    base = os.path.join(PAGES_DIR, *page_id.split('/'))
    return base + '.txt', base + '.alto.xml.gz'


def fetch_page(meta, force=False):
    """Fetch the ALTO OCR file of one page (tile.loc.gov storage service), keep it gzipped, rebuild the column-ordered
    reading text (rebuild_cols.py), save it, append a manifest line. meta: needs page_id, lccn, date, edition, seq, segment.
    Returns the manifest dict, or None when the service has no such page (404) or fails."""
    import gzip, shutil
    sys.path.insert(0, HERE)
    import rebuild_cols
    txt, gz = page_paths(meta['page_id'])
    man = load_manifest().get(meta['page_id'])
    if man and man.get('rules') == rebuild_cols.VERSION and os.path.exists(txt) and not force:
        return man
    seg = meta['segment']
    url = ALTO_BASE + seg
    raw = txt + '.alto.tmp'
    rec = http_get(url, raw, timeout=120, note='page ALTO')
    if rec.get('status') != 200:
        return None
    alto_sha = sha256_file(raw)
    alto_bytes = os.path.getsize(raw)
    os.makedirs(os.path.dirname(gz), exist_ok=True)
    with open(raw, 'rb') as fi, open(gz, 'wb') as fz, gzip.GzipFile(filename='', mode='wb', fileobj=fz, compresslevel=9, mtime=0) as fo:
        shutil.copyfileobj(fi, fo)
    text, words, info = rebuild_cols.rebuild(raw)
    os.remove(raw)
    with open(txt, 'w', encoding='utf-8') as f:
        f.write(text)
    m = {'page_id': meta['page_id'], 'lccn': meta['lccn'], 'paper': meta.get('paper'), 'city': meta.get('city'), 'state': meta.get('state'),
         'date': meta['date'], 'edition': meta['edition'], 'seq': meta['seq'], 'segment': seg,
         'resource_url': 'https://www.loc.gov/resource/%s/%s/ed-%s/?sp=%d&st=text' % (meta['lccn'], meta['date'], meta['edition'], meta['seq']),
         'text_url': url, 'alto_url': url, 'alto_sha256': alto_sha, 'alto_bytes': alto_bytes, 'alto_gz_path': rel(gz),
         'local_path': rel(txt), 'chars': len(text), 'text_sha256': sha256_file(txt), 'columns': info['columns'],
         'rules': info['rules'], 'fetched_at': now()}
    append_jsonl(PAGES_MANIFEST, m)
    return m


_MAN = None


def load_manifest():
    global _MAN
    out = {}
    if os.path.exists(PAGES_MANIFEST):
        for l in open(PAGES_MANIFEST, encoding='utf-8'):
            l = l.strip()
            if l:
                d = json.loads(l)
                out[d['page_id']] = d
    return out


def page_text(page_id):
    p, _ = page_paths(page_id)
    return open(p, encoding='utf-8').read()


def norm(s, dehyphen=False):
    """Whitespace-normalised view used for quote matching. dehyphen: join word pieces split by a line-end hyphen."""
    if dehyphen:
        s = re.sub(r'(?<=\w)-\s*\n\s*(?=\w)', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def all_search_results():
    """All distinct results in all saved searches, as meta dicts keyed by page_id (with the queries that found them)."""
    out = {}
    if not os.path.isdir(SEARCH_DIR):
        return out
    idx = {}
    if os.path.exists(SEARCH_INDEX):
        for l in open(SEARCH_INDEX, encoding='utf-8'):
            if l.strip():
                d = json.loads(l)
                idx[d['key']] = d
    for fn in sorted(os.listdir(SEARCH_DIR)):
        if not fn.endswith('.json'):
            continue
        key = fn[:-5]
        try:
            d = json.load(open(os.path.join(SEARCH_DIR, fn), encoding='utf-8'))
        except Exception:
            continue
        for r in d.get('results', []):
            m = result_meta(r)
            e = out.setdefault(m['page_id'], dict(m, found_by=[]))
            q = idx.get(key, {}).get('q')
            if q and q not in e['found_by']:
                e['found_by'].append(q)
    return out
