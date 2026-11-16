"""Acquire the source files of one volume of Bates (work item union-pa) and write the sha256 manifest entries.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_fetch.py VOL [--no-xml]      (VOL = 1..5; run from the repository root)

What it does, in this order (archive.org only; /metadata/ and /cors/; one request at a time, at least 1.2 s apart; generic client name):
  1. checks the three pinned text files of PA-BATES-1869.<VOL> (OCR search text, leaf index, printed page numbers) against the ledger
     sha256 (data2/sources/PA-BATES-1869.json); a file that is missing or differs is requested again
  2. requests the item metadata (rights facts) and keeps it as <identifier>_metadata.json
  3. unless --no-xml: requests the item's word-box file <identifier>_djvu.xml (a transient file, 30 to 110 MB) into
     tmp/library/rosters/_pa_xml/ and records its sha256; pa_cache.py reads it once into the word cache and deletes it
  4. writes the entries of this volume into tmp/library/rosters/MANIFEST-union-pa.json (sha256 manifest of every file this work item used)
Standard library only.  A refused or failed request is written into the manifest under "failed" and nothing is worked around.
"""
import os, sys, json, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..')))
import pa_lib as L
import fetch_text as F          # noqa: E402  (read-only use: the shared rate-limited getter)
import r2lib as R               # noqa: E402

LEDGER = os.path.join(L.D2, 'sources', L.SRC + '.json')


def load_manifest():
    if os.path.exists(L.MANIFEST):
        return json.load(open(L.MANIFEST, encoding='utf-8'))
    return {'format': 'roster-manifest/1', 'work_item': 'union-pa', 'generated_utc': L.now(),
            'rules': 'archive.org only (/metadata/ and /cors/), one request at a time, at least 1.2 s apart, a generic client name; no login, key or workaround',
            'files': [], 'failed': []}


def save_manifest(man):
    man['generated_utc'] = L.now()
    tmp = L.MANIFEST + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    os.replace(tmp, L.MANIFEST)


def main(argv):
    vol = int(argv[0])
    want_xml = '--no-xml' not in argv
    ident = L.IDENT[vol]
    tid = L.text_id(vol)
    os.makedirs(L.RAW, exist_ok=True)
    os.makedirs(L.XMLDIR, exist_ok=True)
    led = json.load(open(LEDGER, encoding='utf-8'))
    ent = led['texts'][tid]
    man = load_manifest()
    man['files'] = [x for x in man['files'] if x.get('text_id') != tid or x.get('role') == 'djvu_xml' and not want_xml]
    man['failed'] = [x for x in man['failed'] if x.get('text_id') != tid]
    files, failed = [], []

    def rec(role, name, url, path, **kw):
        d = {'role': role, 'name': name, 'url': url, 'bytes': os.path.getsize(path), 'sha256': R.sha256_file(path),
             'local_path': os.path.relpath(path, L.ROOT).replace(os.sep, '/'), 'retrieved_utc': kw.pop('retrieved', L.now()), 'http_status': 200,
             'source_id': L.SRC, 'text_id': tid, 'identifier': ident}
        d.update(kw)
        return d

    # 1. the pinned texts
    for role, f in ent['files'].items():
        p = os.path.join(L.RAW, f['name'])
        url = 'https://archive.org/cors/%s/%s' % (ident, urllib.parse.quote(f['name']))
        retrieved = ent['retrieved']
        if not os.path.exists(p) or R.sha256_file(p) != f['sha256']:
            status, _ = F.get(url, p)
            retrieved = L.now()
            if status != 200:
                failed.append({'name': f['name'], 'url': url, 'http_status': status, 'at': L.now(), 'text_id': tid})
                continue
        d = rec(role, f['name'], url, p, retrieved=retrieved, ledger_sha256=f['sha256'])
        d['sha256_matches_ledger'] = d['sha256'] == f['sha256']
        files.append(d)
    # 2. metadata
    mp = os.path.join(L.RAW, ident + '_metadata.json')
    murl = 'https://archive.org/metadata/' + ident
    meta = None
    if os.path.exists(mp):
        meta = json.load(open(mp, encoding='utf-8'))
        files.append(rec('metadata', ident + '_metadata.json', murl, mp,
                         retrieved=__import__('time').strftime('%Y-%m-%dT%H:%M:%SZ', __import__('time').gmtime(os.path.getmtime(mp)))))
    else:
        st, body = F.get(murl, mp)
        if st != 200:
            failed.append({'name': ident + '_metadata.json', 'url': murl, 'http_status': st, 'at': L.now(), 'text_id': tid})
        else:
            meta = json.loads(body)
            files.append(rec('metadata', ident + '_metadata.json', murl, mp))
    # 3. the word boxes (transient)
    if want_xml and meta is not None:
        md = meta.get('metadata', {})
        if md.get('access-restricted-item') or meta.get('is_dark'):
            failed.append({'name': 'item', 'what': 'access-restricted item: word boxes not requested', 'at': L.now(), 'text_id': tid})
        else:
            names = [f['name'] for f in meta.get('files', []) if f['name'].endswith('_djvu.xml')]
            if len(names) != 1:
                failed.append({'name': '*_djvu.xml', 'what': 'expected exactly one word-box file, found %r' % names, 'at': L.now(), 'text_id': tid})
            else:
                xp = os.path.join(L.XMLDIR, names[0])
                xurl = 'https://archive.org/cors/%s/%s' % (ident, urllib.parse.quote(names[0]))
                st = 200
                if not os.path.exists(xp):
                    st, _ = F.get(xurl, xp)
                    if st != 200:
                        failed.append({'name': names[0], 'url': xurl, 'http_status': st, 'at': L.now(), 'text_id': tid})
                if st == 200 and os.path.exists(xp):
                    files.append(rec('djvu_xml', names[0], xurl, xp,
                                     transient='deleted after the word cache of the volume is written; bytes and sha256 stay here'))
    man['files'].extend(files)
    man['failed'].extend(failed)
    save_manifest(man)
    print(json.dumps({'vol': vol, 'files': [(x['role'], x['bytes']) for x in files], 'failed': failed}))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
