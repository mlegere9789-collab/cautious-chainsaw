"""Writes the two source records of the roster work item union-nh (New Hampshire, Union):

    tmp/library/rosters/MANIFEST-union-nh.json              every file fetched for the item: url, bytes, sha256, UTC time, HTTP status, and the requests that failed
    docs/battle-theatre/rosters/sources/union-nh.json       the tracked pointer file: identifier, title, year, url, bytes, sha256 and the rights basis per source,
                                                            and the unit files made from them (path, rows, bytes, sha256)

    python3 -I nh_manifest.py            (from any directory; reads the ledgers data2/sources/NH-AYLING-1895.json and NH-AGR-1865.json and the pinned files)

The rights basis "public domain (United States publication before 1929)" is written only for an item whose imprint says it was published in the United
States in a year before 1929 (read here from the item's own metadata and, for the Ayling volumes, from the title page of the OCR text).
Standard library only.
"""
import sys, os, re, json, time, hashlib, gzip

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
LIB = os.path.join(ROOT, 'tmp', 'library', 'rosters')
PUBLIC_DOMAIN = 'public domain (United States publication before 1929)'

UNITS = ['u-nh-2nd-new-hampshire-infantry', 'u-nh-5th-new-hampshire-infantry', 'u-nh-12th-new-hampshire-infantry', 'u-nh-1st-new-hampshire-battery']
USED_FOR = {'NH-AYLING-1895.1': UNITS[:2], 'NH-AYLING-1895.2': UNITS[2:],
            'NH-AGR-1865.1': [], 'NH-AGR-1865.2': [], 'NH-AGR-1865.1866-1': [], 'NH-AGR-1865.1866-2': []}
STATUS = {'NH-AYLING-1895.1': 'used: the register of the 2nd and 5th New Hampshire Infantry is parsed from this text',
          'NH-AYLING-1895.2': 'used: the register of the 12th New Hampshire Infantry and of the 1st New Hampshire Light Battery is parsed from this text',
          'NH-AGR-1865.1': 'inspected, not usable: the regimental roster pages (2nd and 5th Regiment) are tables printed sideways and the OCR text layer of them is unreadable',
          'NH-AGR-1865.2': 'inspected, not usable: the roster pages (12th Regiment, First Light Battery) are tables printed sideways and the OCR text layer is unreadable',
          'NH-AGR-1865.1866-1': 'inspected, not usable: the roster pages (2nd, 5th and 12th Regiment) are tables printed sideways and the OCR text layer is unreadable',
          'NH-AGR-1865.1866-2': 'inspected, not usable: the roster pages are tables printed sideways and the OCR text layer is unreadable; the other pages are narrative history'}


def sha256_file(p):
    return R.sha256_file(p)


def iso(ts):
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(ts))


def main():
    sources, files_all, ledger_failed = [], [], []
    for sid in ('NH-AYLING-1895', 'NH-AGR-1865'):
        led = json.load(open(os.path.join(D2, 'sources', sid + '.json'), encoding='utf-8'))
        ledger_failed += [dict(x, source_id=sid) for x in led.get('failed', [])]
        for tid, ent in led['texts'].items():
            ident = ent['ia_identifier']
            d = os.path.join(ROOT, ent['local_dir'])
            meta_path = os.path.join(d, ident + '_metadata.json')
            md = json.load(open(meta_path, encoding='utf-8'))['metadata']
            files = []
            for role in ('text', 'pageindex', 'page_numbers'):
                f = ent['files'][role]
                p = os.path.join(d, f['name'])
                assert sha256_file(p) == f['sha256'] and os.path.getsize(p) == f['bytes'], 'file differs from the ledger: ' + p
                files.append({'role': role, 'name': f['name'], 'url': 'https://archive.org/cors/%s/%s' % (ident, f['name']), 'bytes': f['bytes'], 'sha256': f['sha256'],
                              'local_path': os.path.relpath(p, ROOT).replace(os.sep, '/'), 'retrieved_utc': ent['retrieved'], 'http_status': 200})
            files.append({'role': 'metadata', 'name': os.path.basename(meta_path), 'url': 'https://archive.org/metadata/' + ident, 'bytes': os.path.getsize(meta_path),
                          'sha256': sha256_file(meta_path), 'local_path': os.path.relpath(meta_path, ROOT).replace(os.sep, '/'),
                          'retrieved_utc': iso(os.path.getmtime(meta_path)), 'http_status': 200})
            year = int(re.match(r'\d{4}', md['date']).group(0))
            usa = 'Concord' in (md.get('publisher') or '')          # Concord, New Hampshire: the imprint of the State Printer
            evidence = {'ia_date': md.get('date'), 'ia_possible_copyright_status': md.get('possible-copyright-status'),
                        'ia_access_restricted_item': bool(md.get('access-restricted-item')), 'ia_licenseurl': md.get('licenseurl'), 'ia_contributor': md.get('contributor'),
                        'imprint': md.get('publisher'), 'year': year}
            if year < 1929 and usa and not md.get('access-restricted-item'):
                basis = PUBLIC_DOMAIN
                evidence['why'] = 'a state publication printed at Concord, New Hampshire, in %d (imprint in the item metadata)' % year
            else:
                basis = 'not established'
            if sid == 'NH-AYLING-1895':
                txt = R.load_text(os.path.join(d, ent['files']['text']['name']))
                q = 'There are no known copyright restrictions in the United States on the use of the text.'
                assert q in ' '.join(txt[:2000].split()), 'the item notice is not in the OCR text'
                evidence['item_notice_in_ocr_text'] = q
                title_page = ' '.join(txt[:3000].split())
                assert 'Ira C. Evans, Public Printer. 1895.' in title_page, 'imprint of the title page not found'
                evidence['imprint_quote'] = 'Ira C. Evans, Public Printer. 1895.'
                evidence['imprint_quote_offset_in_text'] = txt.index('Ira  C.  Evans,  Public  Printer.')
            rights = {'basis': basis, 'evidence': evidence}
            sources.append({'source_id': sid, 'volume': ent['volume'], 'text_id': tid, 'identifier': ident, 'title': md['title'], 'year': year,
                            'ia_volume': md.get('volume'), 'creator': md.get('creator'), 'publisher': md.get('publisher'), 'contributor': md.get('contributor'),
                            'ocr_engine': md.get('ocr'), 'imagecount': md.get('imagecount'), 'page_url': 'https://archive.org/details/' + ident, 'ia_title': md['title'], 'ia_date': md.get('date'), 'files': files,
                            'rights': rights, 'role': 'roll' if sid == 'NH-AYLING-1895' else 'second reading (not usable)', 'status': STATUS[tid],
                            'used_for': USED_FOR[tid]})
            files_all += [dict(f, source_id=sid, text_id=tid, identifier=ident) for f in files]
    blocked = [{'what': 'page images of a leaf (to look at the Summary table and the sideways tables)',
                'request': 'https://archive.org/download/cu31924096263128/page/n118_w1200.jpg', 'result': 'archive.org answers with a redirect to the image server '
                'https://ia600608.us.archive.org/BookReader/BookReaderImages.php; the proxy refuses the connection (CONNECT tunnel failed, response 403)',
                'at_utc': '2026-11-13T20:29:00Z', 'action': 'one request, recorded as blocked (host ia600608.us.archive.org, the Internet Archive image servers); not retried; '
                'no other route tried'}]
    products = []
    for u in UNITS:
        path = os.path.join(D2, 'union', 'nh', u.replace('u-nh-', '') + '.jsonl.gz')
        head, segs, meta = R.read_unit(path)
        aux = path[:-len('.jsonl.gz')] + '.flags.json.gz'
        products.append({'unit': u, 'designation': head['name'], 'path': os.path.relpath(path, ROOT).replace(os.sep, '/'), 'rows': head['n'], 'file_bytes': os.path.getsize(path),
                         'file_sha256': sha256_file(path), 'raw_lines_sha256': meta['sha256'], 'flags_path': os.path.relpath(aux, ROOT).replace(os.sep, '/'),
                         'flags_bytes': os.path.getsize(aux), 'flags_sha256': sha256_file(aux), 'text_ids': sorted({s['t'] for s, _ in segs})})
    generated = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    manifest = {'format': 'roster-manifest/1', 'work_item': 'union-nh', 'generated_utc': generated,
                'rules': 'archive.org only (/metadata/ and /cors/ plus one refused image request), one request at a time, at least 1.2 s apart, a generic client name; no login, key or workaround',
                'files': files_all, 'failed_or_blocked': blocked + ledger_failed}
    os.makedirs(LIB, exist_ok=True)
    json.dump(manifest, open(os.path.join(LIB, 'MANIFEST-union-nh.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    pointer = {'format': 'roster2-sources-pointer/1', 'work_item': 'union-nh', 'generated': generated, 'sources': sources, 'derived_texts': [], 'blocked': blocked,
               'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround',
               'note': 'The texts are kept under tmp/library/rosters/<source_id>/ (not tracked); this file says which texts they are. Fetch each file from its url, then check the sha256 above. '
                       'The files made from them are listed under unit_files.', 'unit_files': products}
    os.makedirs(os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'sources'), exist_ok=True)
    json.dump(pointer, open(os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'sources', 'union-nh.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest files', len(files_all), 'sources', len(sources), 'products', len(products))
    for s in sources:
        print(s['text_id'], s['identifier'], s['year'], s['rights']['basis'], s['status'][:40])


if __name__ == '__main__':
    main()
