"""Fetch the OCR text of one Internet Archive volume for the roster production and pin it in the ledger.

    python3 -I fetch_text.py SOURCE_ID VOLUME IA_IDENTIFIER [--suffix ~b] [--repo /path/to/repo]

Writes (text only, no page images):
    tmp/library/rosters/<SOURCE_ID>/<identifier>_hocr_searchtext.txt.gz
    tmp/library/rosters/<SOURCE_ID>/<identifier>_hocr_pageindex.json.gz
    tmp/library/rosters/<SOURCE_ID>/<identifier>_page_numbers.json        (when the item has one)
and adds the text entry  "<SOURCE_ID>.<VOLUME><suffix>"  to
    docs/battle-theatre/rosters/data2/sources/<SOURCE_ID>.json            (file names, bytes, sha256, rights flags)

Access rules built in: only https://archive.org/metadata/<id> and https://archive.org/cors/<id>/<file>;
one request at a time, at least 1.2 s apart; a generic client name; an item whose metadata says
access-restricted-item (a lending copy) is refused; a failed or refused request is written to the
ledger under "failed" and nothing is worked around.  A file already present with the ledger's sha256
is not requested again.  Items without a search-text file are reported (the fallback, deriving the
text from <identifier>_djvu.xml and deleting the xml, is done with xml_text.py).
Standard library only.
"""
import sys, os, json, time, hashlib, argparse, urllib.request, urllib.error, urllib.parse, ssl

UA = 'roster-research/1.0 (public-domain text; one request per second)'
GAP = 1.2
_last = [0.0]
HERE = os.path.dirname(os.path.abspath(__file__))


def _ctx():
    ca = os.environ.get('NODE_EXTRA_CA_CERTS') or '/root/.ccr/ca-bundle.crt'
    return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def get(url, dest=None, tries=3):
    last = (0, b'')
    for _ in range(tries):
        wait = GAP - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=300, context=_ctx()) as r:
                body = r.read()
                if dest:
                    with open(dest + '.part', 'wb') as f:
                        f.write(body)
                    os.replace(dest + '.part', dest)
                return r.status, body
        except urllib.error.HTTPError as e:
            last = (e.code, b'')
            if e.code < 500:
                return last
        except Exception as e:
            last = (0, repr(e).encode())
        time.sleep(20)
    return last


def pick(names, suffix):
    """The one file of an item whose name ends with suffix.  Most items name their files <identifier>_hocr_searchtext.txt.gz, but
    the *.emory.edu copies use <number>_<number>_hocr_searchtext.txt.gz, so the file is found by its ending, never by guessing."""
    c = [n for n in names if n.endswith(suffix)]
    return c[0] if len(c) == 1 else None


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source_id')
    ap.add_argument('volume')
    ap.add_argument('identifier')
    ap.add_argument('--suffix', default='')
    ap.add_argument('--repo', default=os.path.abspath(os.path.join(HERE, '..', '..', '..', '..')))
    a = ap.parse_args()
    raw_dir = os.path.join(a.repo, 'tmp', 'library', 'rosters', a.source_id)
    led_dir = os.path.join(a.repo, 'docs', 'battle-theatre', 'rosters', 'data2', 'sources')
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(led_dir, exist_ok=True)
    led_path = os.path.join(led_dir, a.source_id + '.json')
    led = json.load(open(led_path, encoding='utf-8')) if os.path.exists(led_path) else {
        'format': 'roster2-source/1', 'source_id': a.source_id, 'texts': {}, 'failed': []}
    text_id = '%s.%s%s' % (a.source_id, a.volume, a.suffix)

    st, body = get('https://archive.org/metadata/' + urllib.parse.quote(a.identifier))
    if st != 200 or body.strip() in (b'', b'{}'):
        led['failed'].append({'identifier': a.identifier, 'what': 'metadata', 'status': st, 'at': now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('FAILED metadata', st)
        return 1
    d = json.loads(body)
    md = d.get('metadata', {})
    if md.get('access-restricted-item') or d.get('is_dark'):
        led['failed'].append({'identifier': a.identifier, 'what': 'access-restricted item: not opened', 'at': now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('REFUSED: access-restricted item')
        return 1
    names = {f['name']: f for f in d.get('files', [])}
    want = [(pick(names, '_hocr_searchtext.txt.gz'), 'text'), (pick(names, '_hocr_pageindex.json.gz'), 'pageindex'),
            (pick(names, '_page_numbers.json'), 'page_numbers')]
    if want[0][0] is None or want[1][0] is None:
        led['failed'].append({'identifier': a.identifier, 'what': 'item has no hocr search text or page index; use xml_text.py',
                              'has_djvu_xml': pick(names, '_djvu.xml') is not None, 'at': now()})
        json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('NO SEARCH TEXT for', a.identifier)
        return 2
    files = {}
    old = led['texts'].get(text_id, {}).get('files', {})
    for name, role in want:
        if name is None or name not in names:
            continue
        dest = os.path.join(raw_dir, name)
        if os.path.exists(dest) and old.get(role, {}).get('sha256') == sha256_file(dest):
            files[role] = old[role]
            continue
        st, _ = get('https://archive.org/cors/%s/%s' % (urllib.parse.quote(a.identifier), urllib.parse.quote(name)), dest)
        if st != 200:
            led['failed'].append({'identifier': a.identifier, 'what': name, 'status': st, 'at': now()})
            json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('FAILED', name, st)
            return 1
        files[role] = {'name': name, 'bytes': os.path.getsize(dest), 'sha256': sha256_file(dest)}

    def one(v):
        return v if isinstance(v, str) or v is None else '; '.join(map(str, v))
    led['texts'][text_id] = {
        'source_id': a.source_id, 'volume': a.volume, 'kind': 'ia-hocr-searchtext', 'ia_identifier': a.identifier,
        'ia_title': one(md.get('title')), 'ia_volume': one(md.get('volume')), 'ia_date': one(md.get('date')),
        'ia_publisher': one(md.get('publisher')), 'ia_contributor': one(md.get('contributor')),
        'ia_possible_copyright_status': one(md.get('possible-copyright-status')),
        'ia_access_restricted_item': False, 'ia_ocr': one(md.get('ocr')), 'ia_imagecount': one(md.get('imagecount')),
        'url_base': 'https://archive.org/cors/%s/' % a.identifier, 'files': files, 'retrieved': now(),
        'local_dir': 'tmp/library/rosters/%s/' % a.source_id,
        'page_numbers': 'page_numbers' in files,
    }
    json.dump(led, open(led_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('OK', text_id, {k: v['bytes'] for k, v in files.items()})
    return 0


if __name__ == '__main__':
    sys.exit(main())
