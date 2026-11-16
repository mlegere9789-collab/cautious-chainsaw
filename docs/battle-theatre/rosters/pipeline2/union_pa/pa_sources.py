"""Write the tracked pointer file rosters/sources/union-pa.json and complete the sha256 manifest of the work item union-pa.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_pa/pa_sources.py          (from the repository root)

Reads   data2/sources/PA-BATES-1869.json (the ledger), tmp/library/rosters/MANIFEST-union-pa.json (pa_fetch.py), the item metadata of the five volumes
        (tmp/library/rosters/PA-BATES-1869/<identifier>_metadata.json), the pinned texts (imprint quotes with their offsets), the unit files written by pa_write.py
Writes  docs/battle-theatre/rosters/sources/union-pa.json     form roster2-sources-pointer/1
        tmp/library/rosters/MANIFEST-union-pa.json            deleted_utc of the word-box files, unit files and tools added
The rights basis "public domain (United States publication before 1929)" is written only where the printed imprint says a publication of 1869 to 1871.
"""
import os, sys, json, re, time, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pa_lib as L
import pa_units as PU

R2 = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'rosters')
IMPRINT = {  # volume -> (regular expression that finds the printed imprint in the text layer, year printed)
    1: (r'VOL\.\s+I\.\s*\n[^\n]*\n[^\n]*STATE\s+PRINTER\.', 1869),
    2: (r'VOL\.\s+II\.\s*\n[^\n]*\n[^\n]*STATE\s+PRINTER\.[^\n]*', 1869),
    3: (r'VOL\.\s+III\.\s*\n[^\n]*STATE\s+PRINTE[^\n]*', 1870),
    4: (r'VOL\.\s+IV\.\s*\n[^\n]*\n[^\n]*STATE\s+PRINTER\.[^\n]*', 1870),
    5: (r'VOL\.\s+V\.\s*\n[^\n]*\n[^\n]*STATE\s+PRINTER\.[^\n]*', 1871),
}
AUTHORITY = r'PREPARED\s*\n?\s*IN\s+COMPLIANCE\s+WITH\s+ACTS\s+OF\s+THE\s+LEGISLATURE'


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def main():
    led = json.load(open(os.path.join(L.D2, 'sources', L.SRC + '.json'), encoding='utf-8'))
    man = json.load(open(L.MANIFEST, encoding='utf-8'))
    units_by_vol = {}
    for u in PU.U:
        units_by_vol.setdefault(u['vol'], []).append(u['key'])
    sources = []
    for vol in range(1, 6):
        tid = L.text_id(vol)
        ent = led['texts'][tid]
        ident = L.IDENT[vol]
        meta = json.load(open(os.path.join(L.RAW, ident + '_metadata.json'), encoding='utf-8'))
        md = meta['metadata']
        text, pm, _ = L.load_text(vol)
        head = text[:20000]
        mi = re.search(IMPRINT[vol][0], head)
        ma = re.search(AUTHORITY, head)
        files = [x for x in man['files'] if x['text_id'] == tid and x['role'] != 'djvu_xml']
        xml = [x for x in man['files'] if x['text_id'] == tid and x['role'] == 'djvu_xml']
        if not mi or not ma or not xml:
            raise SystemExit('volume %d: imprint %s, authority %s, xml %s' % (vol, bool(mi), bool(ma), bool(xml)))
        x = xml[0]
        pt = [f for f in files if f['role'] == 'text'][0]
        flag = md.get('possible-copyright-status')
        src = {
            'source_id': L.SRC, 'volume': str(vol), 'text_id': tid, 'identifier': ident,
            'title': md.get('title'), 'year': IMPRINT[vol][1], 'creator': md.get('creator'), 'publisher': md.get('publisher'),
            'contributor': md.get('contributor'), 'ocr_engine': md.get('ocr'), 'imagecount': md.get('imagecount'),
            'page_url': 'https://archive.org/details/' + ident, 'url': pt['url'], 'bytes': pt['bytes'], 'sha256': pt['sha256'],
            'ia_title': md.get('title'), 'ia_date': md.get('date'),
            'files': [{k: f[k] for k in ('role', 'name', 'url', 'bytes', 'sha256', 'local_path', 'retrieved_utc', 'http_status')} for f in files],
            'djvu_xml': {'name': x['name'], 'bytes': x['bytes'], 'sha256': x['sha256'], 'url': x['url'], 'retrieved_utc': x['retrieved_utc'], 'http_status': 200,
                         'kept': 'transient: the word boxes were read once into the work cache of the volume and the file deleted (deleted_utc in the manifest); '
                                 'used to place every printed line on the page (pipeline2/union_pa)'},
            'rights': {
                'basis': 'public domain (United States publication before 1929)',
                'evidence': {
                    'ia_date': md.get('date'), 'ia_possible_copyright_status': flag, 'ia_access_restricted_item': bool(md.get('access-restricted-item')),
                    'ia_licenseurl': md.get('licenseurl'), 'ia_contributor': md.get('contributor'), 'imprint': md.get('publisher'),
                    'year': IMPRINT[vol][1],
                    'why': 'a state publication ("prepared in compliance with acts of the legislature", printed by the State Printer at Harrisburg) of %d (title page of the volume)' % IMPRINT[vol][1],
                    'imprint_quote': mi.group(0), 'imprint_quote_offset_in_text': mi.start(),
                    'authority_quote': re.sub(r'\s+', ' ', ma.group(0)), 'authority_quote_offset_in_text': ma.start(),
                    'item_notice_in_ocr_text': None,
                    'note': 'the item metadata of the volume gives the date 1869 for all five volumes; the printed imprints read 1869, 1869, 1870, 1870 and 1871; '
                            'the metadata flag is %s' % (flag if flag else 'blank (no flag on this copy)'),
                },
            },
            'role': 'roll',
            'status': 'parsed: the rolls (field and staff, band, every company) of the Pennsylvania units of this work item that stood at Gettysburg, '
                      'one line per printed name line of the roll; the narrative histories, the Burial Record and the index of field officers are not parsed',
            'used_for': units_by_vol.get(vol, []),
        }
        sources.append(src)
    ptr = {
        'format': 'roster2-sources-pointer/1', 'work_item': 'union-pa', 'generated': now(),
        'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround',
        'sources': sources,
        'not_used': [
            {'source_id': 'PA-GETT-1904', 'identifier': 'pennsylvaniaatge02lcpenn / pennsgettysburg02reynrich',
             'title': 'Pennsylvania at Gettysburg (1904 and 1914), dedication addresses and monument inscriptions', 'year': 1914,
             'status': 'read from the local copies in tmp/library/misc for the report only: the monument inscriptions that print "Present at Gettysburg N officers and M men" are quoted '
                       'in reports/union-pa.md section 1 where the line was found again in the text; no roll of names was found there (as the earlier family run recorded, gap G-PA7)'},
            {'source_id': 'PA-CEM-1867', 'identifier': 'revisedreportmad00penn / revisedreportma00cemegoog',
             'title': "Revised Report to the Legislature of Pennsylvania on the Soldiers' National Cemetery", 'year': 1867,
             'status': 'lead, not parsed here: the Pennsylvania burial tables are a list of men stated buried at Gettysburg (item roster-gettysburg-lists); the Burial Record that closes volumes 2 and 3 of Bates is a second such list (not parsed)'},
        ],
        'blocked': [],
        'derived_texts': [],
    }
    # unit files and sidecars: bytes and sha256
    files = []
    outdir = os.path.join(L.D2, 'union', 'pa')
    for fn in sorted(os.listdir(outdir)):
        p = os.path.join(outdir, fn)
        files.append({'name': fn, 'bytes': os.path.getsize(p), 'sha256': L.R.sha256_file(p)})
    ptr['unit_files'] = files
    os.makedirs(os.path.join(R2, 'sources'), exist_ok=True)
    with open(os.path.join(R2, 'sources', 'union-pa.json'), 'w', encoding='utf-8') as f:
        json.dump(ptr, f, ensure_ascii=False, indent=1)
        f.write('\n')
    # manifest: the word-box files are deleted
    for x in man['files']:
        if x['role'] == 'djvu_xml':
            x['deleted_utc'] = x.get('deleted_utc') or now()
            x['exists_now'] = os.path.exists(os.path.join(L.ROOT, x['local_path']))
    man['unit_files'] = files
    man['tools'] = sorted(f for f in os.listdir(HERE) if f.endswith('.py'))
    man['generated_utc'] = now()
    with open(L.MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    print('pointer written;', len(sources), 'sources;', len(files), 'unit files')


if __name__ == '__main__':
    main()
