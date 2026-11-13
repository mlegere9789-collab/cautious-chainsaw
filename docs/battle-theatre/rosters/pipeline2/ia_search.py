"""Polite Internet Archive catalogue search and item-metadata reader for the roster production plan.

    python3 -I ia_search.py search  QUERIES.json  OUT_DIR      # advancedsearch.php, one request per query
    python3 -I ia_search.py meta    IDS.txt       OUT_DIR      # archive.org/metadata/<identifier>, one request per item

Rules built in: one request at a time, at least 1.2 s between requests, every answer cached on disk
(a cached answer is never requested again), a generic client name, no login, no retry storm (at most
2 retries, 20 s apart, only on network errors and HTTP 5xx). A refused or failed request is written
to OUT_DIR/_failed.jsonl with the status; nothing is worked around.
Standard library only.
"""
import sys, os, json, time, hashlib, urllib.parse, urllib.request, urllib.error, ssl

UA = 'roster-research/1.0 (catalogue lookup; one request per second)'
GAP = 1.2
FIELDS = ['identifier', 'title', 'creator', 'year', 'date', 'volume', 'publisher', 'contributor',
          'possible-copyright-status', 'access-restricted-item', 'imagecount', 'language', 'collection']
_last = [0.0]


def _ctx():
    ca = os.environ.get('NODE_EXTRA_CA_CERTS') or '/root/.ccr/ca-bundle.crt'
    if os.path.exists(ca):
        return ssl.create_default_context(cafile=ca)
    return ssl.create_default_context()


def get(url, tries=3):
    last = None
    for i in range(tries):
        wait = GAP - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60, context=_ctx()) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            last = (e.code, b'')
            if e.code < 500:
                return last
        except Exception as e:  # network error
            last = (0, repr(e).encode())
        time.sleep(20)
    return last


def search(queries_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    qs = json.load(open(queries_path, encoding='utf-8'))
    for q in qs:
        key = q['key']
        fp = os.path.join(out_dir, key + '.json')
        if os.path.exists(fp):
            continue
        params = [('q', q['q']), ('rows', str(q.get('rows', 100))), ('output', 'json')]
        params += [('fl[]', f) for f in FIELDS]
        if q.get('sort'):
            params.append(('sort[]', q['sort']))
        url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(params)
        st, body = get(url)
        if st == 200:
            try:
                d = json.loads(body)
                d['_query'] = q
                d['_url'] = url
                d['_fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                json.dump(d, open(fp, 'w', encoding='utf-8'), ensure_ascii=False)
                print(key, d['response']['numFound'], flush=True)
                continue
            except Exception as e:
                st = -1
        with open(os.path.join(out_dir, '_failed.jsonl'), 'a', encoding='utf-8') as f:
            f.write(json.dumps({'key': key, 'url': url, 'status': st, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}) + '\n')
        print(key, 'FAILED', st, flush=True)


def meta(ids_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    ids = [l.strip() for l in open(ids_path, encoding='utf-8') if l.strip() and not l.startswith('#')]
    for ident in ids:
        fp = os.path.join(out_dir, ident + '.json')
        if os.path.exists(fp):
            continue
        url = 'https://archive.org/metadata/' + urllib.parse.quote(ident)
        st, body = get(url)
        if st == 200 and body.strip() not in (b'', b'{}'):
            try:
                d = json.loads(body)
                slim = {'identifier': ident, 'metadata': d.get('metadata', {}), 'files': [
                    {k: f.get(k) for k in ('name', 'format', 'size', 'sha1', 'source')}
                    for f in d.get('files', [])
                    if f.get('name', '').endswith(('_djvu.txt', '_djvu.xml', '_scandata.xml', '_page_numbers.json',
                                                   '_hocr_searchtext.txt.gz', '_hocr_pageindex.json.gz', '.pdf', '_chocr.html.gz'))],
                    'is_dark': d.get('is_dark'), 'server': d.get('server'), 'dir': d.get('dir'),
                    '_url': url, '_fetched': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
                json.dump(slim, open(fp, 'w', encoding='utf-8'), ensure_ascii=False)
                print(ident, 'ok', len(slim['files']), flush=True)
                continue
            except Exception:
                st = -1
        with open(os.path.join(out_dir, '_failed.jsonl'), 'a', encoding='utf-8') as f:
            f.write(json.dumps({'identifier': ident, 'url': url, 'status': st, 'body_empty': body.strip() in (b'', b'{}'),
                                'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}) + '\n')
        print(ident, 'FAILED', st, flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('search', 'meta'):
        print(__doc__)
        sys.exit(2)
    (search if sys.argv[1] == 'search' else meta)(sys.argv[2], sys.argv[3])
