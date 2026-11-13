"""Tracked pointer file rosters/sources/union-vt.json and the sha256 manifest tmp/library/rosters/MANIFEST-union-vt.json (work item union-vt).

    python3 -I docs/battle-theatre/rosters/pipeline2/union_vt/vt_sources.py [--xml-deleted]            (run from the repository root)

Reads the ledger entry of data2/sources/VT-ROSTER-1892.json, the files under tmp/library/rosters/VT-ROSTER-1892 and the manifest written by vt_fetch.py.
--xml-deleted marks the transient word-box file as deleted (its bytes and sha256 stay).  Standard library only.
"""
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vt_lib as L          # noqa: E402

R = L.R
IDENT = 'cu31924080774148'
MANIFEST = os.path.join(L.TMP, 'MANIFEST-union-vt.json')
POINTER = os.path.join(L.D2, '..', 'sources', 'union-vt.json')
RIGHTS = 'public domain (United States publication before 1929)'
UNIT_KEYS = [k for k, _, _ in L.UNITS]


def main(xml_deleted):
    led = L.V.load_source  # noqa: F841  (the ledger is read below)
    ledger = json.load(open(os.path.join(L.D2, 'sources', L.SRC + '.json'), encoding='utf-8'))
    ent = ledger['texts'][L.TEXT_ID]
    text, pm, _ = L.load_text()
    man = json.load(open(MANIFEST, encoding='utf-8'))
    meta = json.load(open(os.path.join(L.TMP, L.SRC, IDENT + '_metadata.json'), encoding='utf-8'))['metadata']
    # rights evidence: the imprint of the title page, found in the pinned text at its offset
    m = re.search(r'Press\s+of\s+the\s+Watchman\s+Publishing\s+Co\.,\s+Publishers\s+and\s+Printers\.\s+1892\.', text)
    ev = {'ia_date': meta.get('date'), 'ia_possible_copyright_status': meta.get('possible-copyright-status'), 'ia_access_restricted_item': bool(meta.get('access-restricted-item')),
          'ia_licenseurl': meta.get('licenseurl'), 'ia_contributor': meta.get('contributor'), 'imprint': meta.get('publisher'), 'year': 1892,
          'why': 'a state publication ("compiled by authority of the General Assembly under direction of Theodore S. Peck, Adjutant-General") printed at Montpelier, '
                 'Vermont, in 1892 (title page of the item)'}
    if m:
        assert text[m.start():m.end()] == m.group(0)
        ev['imprint_quote'] = m.group(0)
        ev['imprint_quote_offset_in_text'] = m.start()
    m2 = re.search(r'COMPILED\s+BY\s+AUTHORITY\s+OF\s+THE\s+GENERAL\s+ASSEMBLY', text)
    if m2:
        ev['authority_quote'] = text[m2.start():m2.end()]
        ev['authority_quote_offset_in_text'] = m2.start()
    m3 = re.search(r'In\s+compliance\s+with\s+current\s+copyright\s+law,\s+Cornell\s+University\s+Library\s+produced\s+this\s+replacement\s+volume', text)
    if m3:
        ev['item_notice_in_ocr_text'] = ' '.join(text[m3.start():m3.end()].split()) + ' ...'
        ev['item_notice_offset_in_text'] = m3.start()
        ev['item_notice_reading'] = 'a notice of the library that made a paper replacement copy of the 1892 volume in 1997; it states no restriction on the text'
    files = []
    for x in man['files']:
        if x['role'] == 'djvu_xml':
            continue
        files.append({k: x[k] for k in ('role', 'name', 'url', 'bytes', 'sha256', 'local_path', 'retrieved_utc', 'http_status') if k in x})
    xml = next(x for x in man['files'] if x['role'] == 'djvu_xml')
    if xml_deleted:
        xml['deleted_utc'] = L.now()
        xml['transient'] = 'deleted after the production run; bytes and sha256 stay in this manifest'
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    xinfo = {'name': xml['name'], 'bytes': xml['bytes'], 'sha256': xml['sha256'], 'url': xml['url'], 'retrieved_utc': xml['retrieved_utc'], 'http_status': 200,
             'kept': 'transient: deleted after the production run (deleted_utc in the manifest); word boxes only, used to place every line on the page (pipeline2/union_vt)'}
    if xml.get('deleted_utc'):
        xinfo['deleted_utc'] = xml['deleted_utc']
    out = {'format': 'roster2-sources-pointer/1', 'work_item': 'union-vt', 'generated': L.now(),
           'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround',
           'sources': [{
               'source_id': L.SRC, 'volume': '1', 'text_id': L.TEXT_ID, 'identifier': IDENT,
               'title': 'Revised roster of Vermont volunteers and lists of Vermonters who served in the army and navy of the United States during the war of the rebellion, 1861-66',
               'year': 1892, 'creator': meta.get('creator'), 'publisher': meta.get('publisher'), 'contributor': meta.get('contributor'), 'ocr_engine': meta.get('ocr'),
               'imagecount': meta.get('imagecount'), 'page_url': 'https://archive.org/details/' + IDENT, 'url': 'https://archive.org/cors/%s/%s_hocr_searchtext.txt.gz' % (IDENT, IDENT),
               'bytes': ent['files']['text']['bytes'], 'sha256': ent['files']['text']['sha256'], 'ia_title': ent.get('ia_title'), 'ia_date': ent.get('ia_date'),
               'files': files, 'djvu_xml': xinfo,
               'rights': {'basis': RIGHTS, 'evidence': ev},
               'role': 'roll', 'status': 'parsed: the rolls of the 11 units (Field and Staff, Non-Commissioned Staff, Band, every company) and the printed final statement of each',
               'used_for': UNIT_KEYS}],
           'not_used': [
               {'source_id': 'VT-AGR-1866', 'identifier': 'reportofadjutant00verm', 'title': 'Report of the Adjutant and Inspector General of Vermont, 1866', 'year': 1866,
                'status': 'lead, not fetched: the earlier roll on which the Revised Roster rests; a second reading for a later pass (gap G-VT03)'},
               {'source_id': 'VT-MON-1890', 'identifier': 'vermontmonuments00verm', 'title': 'Vermont monuments at Gettysburg. Report of the Vermont commissioners, 1890', 'year': 1890,
                'status': 'read from the local copy (tmp/library/ws9, 85,612 bytes): prose and monument inscriptions, no roll of privates or non-commissioned men; no line made from it'},
               {'source_id': 'VT-GB-1914', 'identifier': 'vermontatgettysb00chen', 'title': 'Vermont at Gettysburg, July, 1863, and fifty years later', 'year': 1914,
                'status': 'read from the local copy (tmp/library/ws9, 132,979 bytes): prose, no roll of names; no line made from it'}],
           'blocked': [
               {'what': 'page images of the Revised Roster (a second reading of the damaged lines)', 'hosts': ['ia800707.us.archive.org (redirect target of archive.org/download/<id>/page/nN_w1400.jpg)', 'iiif.archive.org'],
                'result': 'one request each on 2026-11-13 about 21:15 UTC: the proxy answered CONNECT tunnel failed, response 403; the zip-member route on archive.org/cors answered 302 to the same data host; not retried, not followed',
                'owner_step': 'add the two hosts to the allowed hosts of the cloud environment if page images are wanted (an environment setting that needs approval); until then the independent page-image sample (R-G9) cannot be run for this item'}]}
    os.makedirs(os.path.dirname(POINTER), exist_ok=True)
    json.dump(out, open(POINTER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('pointer written', os.path.normpath(POINTER), 'rights:', RIGHTS, '| imprint at', ev.get('imprint_quote_offset_in_text'), '| xml deleted' if xml_deleted else '| xml kept')


if __name__ == '__main__':
    main('--xml-deleted' in sys.argv)
