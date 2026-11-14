"""Pointer file rosters/sources/roster-qa.json and manifest tmp/library/rosters/MANIFEST-roster-qa.json of the roster-qa item.  Standard library only.

    python3 -I qa_sources.py            write both files from the PDFs on disk (tmp/library/rosters/_pdf) and the item pointer files

The item downloads nothing as a source text: it renders single pages of the item PDFs (archive.org /cors/ only, one request at a time, 1.2 s apart) and reads them a second time.
The PDFs are transient (deleted after the run); their bytes and sha256 stay here.  The rights block of every source is copied from the pointer file of the item that parsed
that source (it states the basis and quotes the evidence); a source whose imprint is after 1928 never carries the basis 'public domain (United States publication before 1929)'.
"""
import sys, os, json, time, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q

SOURCES = [  # (source id, volume, identifier, item pointer file, text id)
    ('ME-AGR-1863-APPD', None, 'annualreportofad1863main', 'union-me', 'ME-AGR-1863-APPD.1863'),
    ('ME-SUPP-1867', None, 'supplementtoannu00main', 'union-me', 'ME-SUPP-1867.1867'),
    ('ME-GETT-1898', None, 'maineatgettysbur01main', 'union-me', 'ME-GETT-1898.1898'),
    ('NH-AYLING-1895', '1', 'cu31924096263128', 'union-nh', 'NH-AYLING-1895.1'),
    ('NH-AYLING-1895', '2', 'cu31924096263136', 'union-nh', 'NH-AYLING-1895.2'),
    ('VT-ROSTER-1892', '1', 'cu31924080774148', 'union-vt', 'VT-ROSTER-1892.1'),
    ('MA-SSM-1931', '1', 'massachusettssol11931mass', 'union-ma', 'MA-SSM-1931.1'),
    ('MA-SSM-1931', '2', 'massachusettssol21931mass', 'union-ma', 'MA-SSM-1931.2'),
]


def sha(path):
    return Q.R.sha256_file(path)


def main():
    ptrs = {}
    for it in ('union-me', 'union-nh', 'union-vt', 'union-ma'):
        ptrs[it] = Q.jload(os.path.join(Q.R2, 'sources', it + '.json'))
    sources, manifest = [], []
    for sid, vol, ident, item, tid in SOURCES:
        src = next((s for s in ptrs[item]['sources'] if s['identifier'] == ident), None)
        pdf = os.path.join(Q.PDFDIR, ident + '.pdf')
        sd = os.path.join(Q.PDFDIR, ident + '_scandata.xml')
        files = []
        for role, p, url in (('pdf', pdf, 'https://archive.org/cors/%s/%s.pdf' % (ident, ident)), ('scandata', sd, 'https://archive.org/cors/%s/%s_scandata.xml' % (ident, ident))):
            if os.path.exists(p):
                f = {'role': role, 'name': os.path.basename(p), 'url': url, 'bytes': os.path.getsize(p), 'sha256': sha(p),
                     'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(p))), 'http_status': 200,
                     'kept': 'transient: deleted after the run (bytes and sha256 stay here)'}
                files.append(f)
                manifest.append({'source_id': sid, 'identifier': ident, **f})
        rights = dict(src['rights']) if src else {'basis': 'not established (no pointer-file entry of the item)'}
        rights['copied_from'] = 'rosters/sources/%s.json (source %s)' % (item, ident)
        sources.append({'source_id': sid, 'volume': vol, 'text_id': tid, 'identifier': ident, 'title': (src or {}).get('title') or (src or {}).get('ia_title'), 'year': (src or {}).get('year'),
                        'page_url': 'https://archive.org/details/' + ident, 'url': 'https://archive.org/cors/%s/%s.pdf' % (ident, ident),
                        'bytes': next((f['bytes'] for f in files if f['role'] == 'pdf'), None), 'sha256': next((f['sha256'] for f in files if f['role'] == 'pdf'), None),
                        'use': 'single pages rendered with pdftoppm for the independent sample and for the second reading; the page images are never stored', 'files': files, 'rights': rights})
    led = Q.jload(os.path.join(Q.D2, 'sources', 'QA-PAGEREAD.json'))
    doc = {'format': 'roster2-sources-pointer/1', 'work_item': 'roster-qa', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'access_rules': 'archive.org /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround; the page routes archive.org/download/<id>/page/ and iiif.archive.org are refused by the proxy and were not used',
           'sources': sources,
           'derived_texts': {'ledger': 'rosters/data2/sources/QA-PAGEREAD.json', 'texts': len(led['texts']), 'what': 'tesseract readings of single pages (psm 6, 300 dpi, table rules removed), pinned by sha256; second readings for the lines the first layer lost and for the eight leaves without text',
                             'local_dir': 'tmp/library/rosters/_qa/pageread'},
           'blocked': [], 'not_used': [{'what': 'page images of the Internet Archive page routes', 'why': 'refused by the proxy (documented by the Vermont and New Hampshire engineers); the text PDF route is used instead'}]}
    Q.jdump(os.path.join(Q.R2, 'sources', 'roster-qa.json'), doc)
    Q.jdump(os.path.join(Q.TMP, 'MANIFEST-roster-qa.json'), {'format': 'roster2-manifest/1', 'work_item': 'roster-qa', 'generated': doc['generated'], 'files': manifest})
    print('pointer file and manifest written:', len(sources), 'sources,', len(manifest), 'files,', sum(f['bytes'] for f in manifest), 'bytes')


if __name__ == '__main__':
    main()
