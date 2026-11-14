"""Pointer file, manifest and rights evidence of work item union-ma (OA03).

    python3 -I ma_sources.py        writes  rosters/sources/union-ma.json            (tracked pointer file, form roster2-sources-pointer/1)
                                            tmp/library/rosters/MANIFEST-union-ma.json (sha256 of every file of the item, not tracked)
                                            GOVERNANCE/horde/ws-rosters/union-ma/rights-evidence.json

Inputs: the ledger data2/sources/MA-SSM-1931.json and MA-SSM-1937-INDEX.json (texts pinned by sha256), the pinned OCR texts under tmp/library/rosters/,
the item metadata files fetched on 14 November 2026 (tmp/library/rosters/MA-SSM-*/<identifier>_metadata.json), and GOVERNANCE/horde/ws-rosters/union-ma/
rights-images.json (title leaf and verso read from page images, ma_rights_images.py).

What is written about rights, and what is not.  The rights basis "public domain (United States publication before 1929)" is written for a text only where that
is true; it is not true for any text of this item: Massachusetts Soldiers, Sailors, and Marines in the Civil War was printed 1931 to 1935 (the index volume 1937;
the printed year of each volume is quoted from its title leaf with the offset).  What the files can say, and what they do not decide, is in the "basis" and the
"evidence" of each text: the item's own flag, the printed imprint, a search of the whole OCR text for a copyright notice, the leaves around the title page, and
the arithmetic of the term.  The decision is the owner's (PRODUCTION-PLAN section 8, owner step 4).  Standard library only.
"""
import sys, os, re, json, hashlib, datetime, gzip

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D2 = os.path.join(R2, 'data2')
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
USED = {'MA-SSM-1931.1', 'MA-SSM-1931.2', 'MA-SSM-1931.3', 'MA-SSM-1931.5', 'MA-SSM-1931.6'}
USED_FOR = {}          # text id -> unit keys (read from the unit files)
COVERS = {
    '1': 'volume I: 1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th (militia), 9th, 10th, 11th Infantry (contents list of the volume)',
    '2': 'volume II: 12th to 24th Infantry with the 1st and 2nd Company Sharpshooters (contents list)',
    '3': 'volume III: 25th to 37th Infantry (contents list)',
    '4': 'volume IV: 38th to 57th Infantry (contents list); no unit of this item',
    '5': 'volume V: 58th to 62nd Infantry, unattached companies and battalions, the Light Artillery batteries (the 1st Battery on printed p. 343, the 3rd on 371, the 5th on 397, the 9th on 452) and the Heavy Artillery regiments (contents list)',
    '6': 'volume VI: the cavalry regiments (the contents leaf has no text layer; the 1st Cavalry roster is on printed pp. 129-227)',
    '7': 'volume VII: Massachusetts soldiers in the Regular Army and the U.S. Volunteers (M to Z), Veteran Reserve Corps, Colored Troops, Navy officers and enlisted men A to E (contents list); no unit of this item',
    '8': 'volume VIII: Navy enlisted men F to Z and the Marine Corps (contents list); no unit of this item',
    '1937': 'Index to Army Records (Wright & Potter, Boston, 1937): an alphabetical list of every name with the volume and page of the record, for Volumes I to VI and part of VII; its foreword says so',
}


def utc(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def digests(path):
    sha, md5, sha1 = hashlib.sha256(), hashlib.md5(), hashlib.sha1()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            sha.update(b); md5.update(b); sha1.update(b)
    return sha.hexdigest(), md5.hexdigest(), sha1.hexdigest()


def find_imprint(text, pm):
    """the title leaf: the first leaf that holds 'Compiled and Published' and 'Adjutant General'; returns (leaf, authority quote + offset, imprint quote + offset, year)"""
    for leaf in range(0, min(len(pm.ranges), 40)):
        a, b = pm.span(leaf)
        t = text[a:b]
        m = re.search(r'Compiled\s+and\s+Published\s+BY\s+THE\s+ADJUTANT\s+GENERAL\W{0,3}\s+in\s+accordance\s+with\s+Chapt\w+\s+4\d\d,\s+Acts\s+\S+\s+1899\s+AND\s+Chapt\w+\s+64,\s+\S+\s+\S+\s+1930', t, re.I)
        if m:
            auth = (a + m.start(), t[m.start():m.end()])
            # imprint: from the place of printing to the end of the leaf
            mi = re.search(r'(NORWOOD,\s+MASS\.|BROOKLINE,\s+MASS\.|WRIGHT\s+&\s+POTTER)', t)
            imp = None
            if mi:
                imp = (a + mi.start(), t[mi.start():].rstrip())
            return leaf, auth, imp
    return None, None, None


def main():
    notes = {}
    manifest_files = []
    sources = []
    evidence = {}
    for source_id in ('MA-SSM-1931', 'MA-SSM-1937-INDEX'):
        led = json.load(open(os.path.join(D2, 'sources', source_id + '.json'), encoding='utf-8'))
        for tid, ent in sorted(led['texts'].items(), key=lambda kv: (len(kv[0]), kv[0])):
            ident = ent['ia_identifier']
            d = os.path.join(ROOT, ent['local_dir'])
            f = ent['files']
            meta_path = os.path.join(d, ident + '_metadata.json')
            meta = json.load(open(meta_path, encoding='utf-8'))
            m = meta['metadata']
            iafiles = {x['name']: x for x in meta['files']}
            files_out = []
            for role in ('text', 'pageindex', 'page_numbers'):
                name = f[role]['name']
                p = os.path.join(d, name)
                sha, md5, sha1 = digests(p)
                ia = iafiles.get(name, {})
                rec = {'role': role, 'name': name, 'url': ent['url_base'] + name, 'bytes': os.path.getsize(p), 'sha256': sha, 'ledger_sha256': f[role]['sha256'],
                       'sha256_matches_ledger': sha == f[role]['sha256'], 'local_path': os.path.relpath(p, ROOT).replace(os.sep, '/'), 'retrieved_utc': ent['retrieved'],
                       'http_status': 200,
                       'ia_listed_md5': ia.get('md5'), 'ia_listed_sha1': ia.get('sha1'), 'ia_listed_size': int(ia['size']) if ia.get('size') else None,
                       'ia_md5_matches': md5 == ia.get('md5') if ia.get('md5') else None, 'ia_sha1_matches': sha1 == ia.get('sha1') if ia.get('sha1') else None,
                       'ia_size_matches': (os.path.getsize(p) == int(ia['size'])) if ia.get('size') else None}
                files_out.append(rec)
            msha, _, _ = digests(meta_path)
            files_out.append({'role': 'metadata', 'name': ident + '_metadata.json', 'url': 'https://archive.org/metadata/' + ident, 'bytes': os.path.getsize(meta_path), 'sha256': msha,
                              'local_path': os.path.relpath(meta_path, ROOT).replace(os.sep, '/'), 'retrieved_utc': utc(os.path.getmtime(meta_path)), 'http_status': 200})
            text = R.load_text(os.path.join(d, f['text']['name']))
            pm = R.PageMap(os.path.join(d, f['pageindex']['name']), os.path.join(d, f['page_numbers']['name']))
            leaf, auth, imp = find_imprint(text, pm)
            year = None
            if imp:
                ym = re.search(r'\b(19[0-9]{2})\b', imp[1])
                year = int(ym.group(1)) if ym else None
            # a search of the whole OCR text for a copyright notice
            pats = [('copyright', r'copy\s*-?\s*right'), ('all rights reserved', r'all\s+rights?\s+reserved'), ('copr.', r'\bcopr\.'), ('(c) / circled c', r'©|\(c\)\s*19')]
            hits = {}
            for label, rx in pats:
                found = [mm.start() for mm in re.finditer(rx, text, re.I)]
                hits[label] = {'count': len(found), 'first_offsets': found[:5], 'context': [text[max(0, o - 40):o + 60].replace('\n', ' ') for o in found[:3]]}
            imgs = None
            vol = ent['volume']
            ri = json.load(open(os.path.join(GOV, 'rights-images.json'), encoding='utf-8')) if os.path.exists(os.path.join(GOV, 'rights-images.json')) else None
            if ri and vol in ri['volumes'] and tid in USED:
                rv = ri['volumes'][vol]
                l5, l6 = rv['leaves'].get('5', {}), rv['leaves'].get('6', {})
                imgs = {'leaves_rendered': sorted(int(k) for k in rv['leaves']), 'title_leaf': 5, 'verso_leaf': 6,
                        'verso_tesseract_chars': l6.get('tesseract_chars'), 'verso_pinned_ocr_chars': l6.get('pinned_text_chars'),
                        'title_tesseract_notice_hits': l5.get('notice_pattern_hits_in_tesseract_text'), 'title_pinned_notice_hits': l5.get('notice_pattern_hits_in_pinned_leaf'),
                        'looked_at_with_the_read_tool': {'1': 'title leaf and verso', '2': 'verso', '3': 'verso', '5': 'verso', '6': 'verso'}.get(vol),
                        'result': 'the verso leaf is a blank page in the image (scan noise at the edge only); no copyright notice on the title leaf in the tesseract reading of the image '
                                  '(and, for volume 1, in the image itself)'}
            ia_date = m.get('date')
            year_txt = str(year) if year else 'year not read'
            basis = ('printed %s (state publication, %s), after the 1929 cutoff: public domain is not established by the date of publication; Internet Archive flag %s; %s; '
                     'owner decision pending (owner step 4, PRODUCTION-PLAN section 8)' % (
                         year_txt, ' '.join(imp[1].split('\n')[0].split()) if imp else 'imprint not found', m.get('possible-copyright-status'),
                         ('no copyright notice found in the OCR text (%d hits for copyright, all rights reserved, copr., a circled c)' % sum(v['count'] for v in hits.values()))
                         if sum(v['count'] for v in hits.values()) == 0 else ('the OCR text has %d notice-like hits (listed in the evidence)' % sum(v['count'] for v in hits.values()))))
            ev = {'ia_date': ia_date, 'ia_title': m.get('title'), 'ia_volume': m.get('volume'), 'ia_possible_copyright_status': m.get('possible-copyright-status'),
                  'ia_access_restricted_item': bool(m.get('access-restricted-item')), 'ia_licenseurl': m.get('licenseurl'), 'ia_contributor': m.get('contributor'),
                  'ia_sponsor': m.get('sponsor'), 'ia_collection': m.get('collection'), 'ia_publisher': m.get('publisher'), 'ia_scandate': m.get('scandate'),
                  'ia_date_is_series_date': (year is not None and str(year) != str(ia_date)),
                  'printed_year': year, 'title_leaf': leaf,
                  'authority_quote': auth[1] if auth else None, 'authority_quote_offset_in_text': auth[0] if auth else None,
                  'imprint_quote': imp[1] if imp else None, 'imprint_quote_offset_in_text': imp[0] if imp else None,
                  'copyright_notice_search_of_the_whole_ocr_text': hits, 'page_images': imgs if imgs else 'not inspected (this text is not parsed by the unit files)',
                  'term_arithmetic': ('Computed, not a legal reading: if a United States copyright subsisted in a work first published in %s, the term of 95 years from publication ends on 31 December %d, '
                                      'so the work is out of any term from 1 January %d; whether a copyright subsisted at all (a state publication, no notice on the title leaf or its verso) is not decided here'
                                      % (year_txt, year + 95, year + 96)) if year else None,
                  'checks': 'the three text files were compared with the md5 and sha1 that the item metadata lists for them (ia_md5_matches, ia_sha1_matches in files[])'}
            used = tid in USED
            vol_key = ent['volume']
            src = {'source_id': source_id, 'volume': vol_key, 'text_id': tid, 'identifier': ident, 'title': m.get('title') + (' (%s)' % m.get('volume') if m.get('volume') else ''), 'year': year,
                   'ia_date': ia_date, 'creator': m.get('creator'), 'publisher': m.get('publisher'), 'contributor': m.get('contributor'), 'ocr_engine': m.get('ocr'), 'imagecount': m.get('imagecount'),
                   'page_url': 'https://archive.org/details/' + ident, 'url': ent['url_base'] + f['text']['name'], 'bytes': files_out[0]['bytes'], 'sha256': files_out[0]['sha256'],
                   'ia_title': m.get('title'), 'files': files_out, 'rights': {'basis': basis, 'evidence': ev},
                   'role': 'index' if source_id == 'MA-SSM-1937-INDEX' else 'roll', 'covers': COVERS[vol_key],
                   'status': ('parsed: the unit files of this item read their rosters from this volume' if used else 'pinned and hashed, not parsed (no unit of this item stands in it; kept as the volume map and for the rights record)')
                             if source_id == 'MA-SSM-1931' else 'pinned and hashed, not parsed: a name index with volume and page references; a second reading of the names is open work (EG-ROS-MA-05)',
                   'used_for': []}
            sources.append(src)
            evidence[tid] = ev
            for x in files_out:
                mf = dict(x)
                mf.update({'source_id': source_id, 'text_id': tid, 'identifier': ident})
                manifest_files.append(mf)
    # which units read which text
    for p in sorted(os.listdir(os.path.join(D2, 'union', 'ma'))):
        if p.endswith('.jsonl.gz') and not p.endswith('.flags.json.gz') and not p.endswith('.cells.json.gz') and not p.endswith('.lists.jsonl.gz'):
            head, segs, meta = R.read_unit(os.path.join(D2, 'union', 'ma', p))
            for seg, rows in segs:
                for s in sources:
                    if s['text_id'] == seg['t']:
                        s['used_for'].append(head['u'])
    unit_files = []
    for p in sorted(os.listdir(os.path.join(D2, 'union', 'ma'))):
        if p.endswith('.jsonl.gz') and not p.endswith('.lists.jsonl.gz'):
            fp = os.path.join(D2, 'union', 'ma', p)
            head, segs, meta = R.read_unit(fp)
            flp = fp[:-len('.jsonl.gz')] + '.flags.json.gz'
            fsha, _, _ = digests(fp)
            gsha, _, _ = digests(flp)
            unit_files.append({'unit': head['u'], 'file': 'data2/union/ma/' + p, 'rows': head['n'], 'file_bytes': os.path.getsize(fp), 'file_sha256': fsha, 'raw_lines_sha256': meta['sha256'],
                               'text_ids': [seg['t'] for seg, rows in segs], 'flags_file': 'data2/union/ma/' + os.path.basename(flp), 'flags_bytes': os.path.getsize(flp), 'flags_sha256': gsha})
    pointer = {
        'format': 'roster2-sources-pointer/1', 'work_item': 'union-ma', 'generated': utc(datetime.datetime.now(datetime.timezone.utc).timestamp()),
        'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround',
        'rights_note': ('No text of this item can carry the basis of a United States publication before 1929: the volumes were printed 1931 to 1935 and the index in 1937. '
                        'Each text carries what the files show (the item flag, the printed imprint, the search for a copyright notice, the leaves around the title page) and the open question; '
                        'the decision is the owner step 4 of PRODUCTION-PLAN section 8, and under DEC-019 no permission request is made.'),
        'sources': sources, 'unit_files': unit_files, 'derived_texts': [],
        'not_used': [
            {'source_id': 'MA-RECORD-1868', 'identifier': 'adjutantmassrec01courrich, adjutantmassrec02courrich, recordofmassachu00mass', 'title': 'Record of the Massachusetts Volunteers, 1861-1865 (Adjutant General, 1868-1870)',
             'status': 'lead, not fetched: regimental narratives and officers by the Adjutant General of 1868-70, printed before 1929; a second reading of the officers and a source of casualty statements (gap EG-ROS-MA-06)'},
            {'source_id': 'MA-BURIAL-1863', 'identifier': 'reportofjointspe3677bost', 'title': 'Report of the Joint Special Committee on the burial of Massachusetts dead at Gettysburg (1863)',
             'status': 'local copy in tmp/library/ws9 (library/acquired_2.json), not read for names by this item: a list of named dead, a stated presence; assigned to the item roster-gettysburg-lists (gap EG-ROS-MA-02)'}],
        'blocked': [{'what': 'page images of the volumes for a second reading of the damaged lines', 'hosts': ['archive.org/download/<id>/page/nN_w.jpg (redirects to a data host)', 'iiif.archive.org'],
                     'result': 'refused by the proxy (Measured by the Vermont and New Hampshire engineers on 13 November 2026); not retried here',
                     'route_used': 'the text PDF of the item through archive.org/cors/<id>/<id>.pdf, one page cut out with pdftoppm and read with tesseract (pipeline2/page_image.py); used here for the leaves around the title page of the five volumes the unit files read (rights-images.json); the PDFs were deleted after use'}]}
    os.makedirs(os.path.join(R2, 'sources'), exist_ok=True)
    with open(os.path.join(R2, 'sources', 'union-ma.json'), 'w', encoding='utf-8') as fh:
        json.dump(pointer, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    with open(os.path.join(GOV, 'rights-evidence.json'), 'w', encoding='utf-8') as fh:
        json.dump({'format': 'ma-rights-evidence/1', 'about': 'the evidence block of every text id of the pointer file rosters/sources/union-ma.json, one place', 'texts': evidence}, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    man = {'format': 'roster-manifest/1', 'work_item': 'union-ma', 'generated_utc': pointer['generated'],
           'rules': 'archive.org only (/metadata/ and /cors/), one request at a time, at least 1.2 s apart, a generic client name; no login, key or workaround',
           'files': manifest_files,
           'transient': [{'what': 'text PDFs of volumes 1, 2, 3, 5 and 6 (leaves around the title page, ma_rights_images.py)', 'url_pattern': 'https://archive.org/cors/<identifier>/<identifier>.pdf',
                          'bytes': {'1': 63757338, '2': 67278670, '3': 60414730, '5': 65992329, '6': 60483266}, 'kept': 'no: deleted after the pages were rendered (sha256 not recorded)'}],
           'failed': []}
    with open(os.path.join(TMP, 'MANIFEST-union-ma.json'), 'w', encoding='utf-8') as fh:
        json.dump(man, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    # summary to the terminal
    bad = [x for x in manifest_files if x.get('sha256_matches_ledger') is False or x.get('ia_md5_matches') is False or x.get('ia_sha1_matches') is False or x.get('ia_size_matches') is False]
    print('texts', len(sources), 'files', len(manifest_files), 'mismatches', len(bad))
    for s in sources:
        e = s['rights']['evidence']
        print(s['text_id'], 'printed', s['year'], 'ia_date', s['ia_date'], '| notice hits', sum(v['count'] for v in e['copyright_notice_search_of_the_whole_ocr_text'].values()), '| used_for', len(s['used_for']))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
