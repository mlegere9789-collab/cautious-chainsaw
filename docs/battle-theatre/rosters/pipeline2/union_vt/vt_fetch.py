"""Acquire the source files of the Vermont roster (work item union-vt) and write the sha256 manifest.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_fetch.py            (run from the repository root)

What it does, in this order (archive.org only; /metadata/ and /cors/; one request at a time, at least 1.2 s apart; generic client name):
  1. checks the three pinned text files of VT-ROSTER-1892 (OCR search text, leaf index, printed page numbers) against the ledger sha256
     (data2/sources/VT-ROSTER-1892.json); a file that is missing or differs is requested again
  2. requests the item metadata (rights facts) and keeps it as <identifier>_metadata.json
  3. requests the item's word-box file <identifier>_djvu.xml (a transient file, about 70 MB) into tmp/library/rosters/_vt_xml/, records
     its sha256; it is deleted after the production run (vt_cleanup in vt_build.py), the sha256 stays in the manifest and the pointer file
  4. writes tmp/library/rosters/MANIFEST-union-vt.json (sha256 manifest of every file this work item used)
Standard library only.  A refused or failed request is written into the manifest under "failed" and nothing is worked around.
"""
import os, sys, json, time, hashlib, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
P2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, P2)
import fetch_text as F          # noqa: E402  (read-only use: the shared rate-limited getter)
import r2lib as R               # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
IDENT = 'cu31924080774148'
SRC = 'VT-ROSTER-1892'
RAW = os.path.join(TMP, SRC)
XMLDIR = os.path.join(TMP, '_vt_xml')
LEDGER = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2', 'sources', SRC + '.json')
MANIFEST = os.path.join(TMP, 'MANIFEST-union-vt.json')


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def main():
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(XMLDIR, exist_ok=True)
    led = json.load(open(LEDGER, encoding='utf-8'))
    ent = led['texts'][SRC + '.1']
    files, failed = [], []
    # 1. the pinned texts
    for role, f in ent['files'].items():
        p = os.path.join(RAW, f['name'])
        url = 'https://archive.org/cors/%s/%s' % (IDENT, urllib.parse.quote(f['name']))
        status, retrieved = 200, ent['retrieved']
        if not os.path.exists(p) or R.sha256_file(p) != f['sha256']:
            status, _ = F.get(url, p)
            retrieved = now()
            if status != 200:
                failed.append({'name': f['name'], 'url': url, 'http_status': status, 'at': now()})
                continue
        sha = R.sha256_file(p)
        files.append({'role': role, 'name': f['name'], 'url': url, 'bytes': os.path.getsize(p), 'sha256': sha,
                      'ledger_sha256': f['sha256'], 'sha256_matches_ledger': sha == f['sha256'],
                      'local_path': 'tmp/library/rosters/%s/%s' % (SRC, f['name']), 'retrieved_utc': retrieved, 'http_status': status,
                      'source_id': SRC, 'text_id': SRC + '.1', 'identifier': IDENT})
    # 2. metadata
    mp = os.path.join(RAW, IDENT + '_metadata.json')
    murl = 'https://archive.org/metadata/' + IDENT
    st, body = F.get(murl, mp)
    if st != 200:
        failed.append({'name': IDENT + '_metadata.json', 'url': murl, 'http_status': st, 'at': now()})
        meta = None
    else:
        meta = json.loads(body)
        files.append({'role': 'metadata', 'name': IDENT + '_metadata.json', 'url': murl, 'bytes': os.path.getsize(mp), 'sha256': R.sha256_file(mp),
                      'local_path': 'tmp/library/rosters/%s/%s' % (SRC, IDENT + '_metadata.json'), 'retrieved_utc': now(), 'http_status': st,
                      'source_id': SRC, 'text_id': SRC + '.1', 'identifier': IDENT})
    # 3. the word boxes (transient)
    if meta is not None:
        md = meta.get('metadata', {})
        if md.get('access-restricted-item') or meta.get('is_dark'):
            failed.append({'name': 'item', 'what': 'access-restricted item: word boxes not requested', 'at': now()})
        else:
            names = [f['name'] for f in meta.get('files', []) if f['name'].endswith('_djvu.xml')]
            if len(names) != 1:
                failed.append({'name': '*_djvu.xml', 'what': 'expected exactly one word-box file, found %r' % names, 'at': now()})
            else:
                xp = os.path.join(XMLDIR, names[0])
                xurl = 'https://archive.org/cors/%s/%s' % (IDENT, urllib.parse.quote(names[0]))
                if not os.path.exists(xp):
                    st, _ = F.get(xurl, xp)
                    if st != 200:
                        failed.append({'name': names[0], 'url': xurl, 'http_status': st, 'at': now()})
                        st = None
                else:
                    st = 200
                if st == 200:
                    files.append({'role': 'djvu_xml', 'name': names[0], 'url': xurl, 'bytes': os.path.getsize(xp), 'sha256': R.sha256_file(xp),
                                  'local_path': 'tmp/library/rosters/_vt_xml/' + names[0], 'retrieved_utc': now(), 'http_status': 200,
                                  'source_id': SRC, 'text_id': SRC + '.1', 'identifier': IDENT,
                                  'transient': 'deleted after the production run; sha256 and bytes stay here'})
    man = {'format': 'roster-manifest/1', 'work_item': 'union-vt', 'generated_utc': now(),
           'rules': 'archive.org only (/metadata/ and /cors/), one request at a time, at least 1.2 s apart, a generic client name; no login, key or workaround',
           'files': files, 'failed': failed}
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    print(json.dumps({'files': [(x['role'], x['bytes']) for x in files], 'failed': failed}))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
