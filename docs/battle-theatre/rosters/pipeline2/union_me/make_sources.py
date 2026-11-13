"""Tracked pointer file rosters/sources/union-me.json and the manifest tmp/library/rosters/MANIFEST-union-me.json for the Maine work item.

    python3 -I docs/battle-theatre/rosters/pipeline2/union_me/make_sources.py            (run from the repository root)
Standard library only.  Reads the ledger entries of data2/sources, the files under tmp/library/rosters and the transient djvu.xml files.
"""
import os, sys, json, re, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mlib as M

SOURCES = [
    ('ME-AGR-1863-APPD', 'ME-AGR-1863-APPD.1863', 'annualreportofad1863main', 'Annual report of the Adjutant General of the State of Maine, 1861-1866 (volume for the year ending 31 December 1863)',
     '1863', r'DECEMBER\s+31,\s+1863\.', 'parsed: company returns of Appendix D (leaves 224-821)'),
    ('ME-SUPP-1867', 'ME-SUPP-1867.1867', 'supplementtoannu00main', "Supplement to the Annual reports of the Adjutant General of the state of Maine, for the years 1861, '62, '63, '64, '65 and 1866 (Alphabetical Index)",
     '1867', r'STEVENS\s+&\s+SAYWARD,\s+PRINTERS\s+TO\s+THE\s+STATE', 'parsed: the two volunteer lists of the Alphabetical Index (leaves 12-578 and 630-1226)'),
    ('ME-APPD-1861', 'ME-APPD-1861.1861', 'appendixdofannua00main', 'Appendix "D" of the Annual report of the adjutant general of the state of Maine, December 31, 1861',
     '1862', None, 'text pinned, NOT parsed (see the report)'),
    ('ME-GETT-1898', 'ME-GETT-1898.1898', 'maineatgettysbur01main', 'Maine at Gettysburg',
     '1898', None, 'parsed: the participants lists of the 14 units; NOT parsed: the casualty lists and the special-duty paragraphs (see the report)'),
]
XML = {'ME-AGR-1863-APPD': 'annualreportofad1863main_djvu.xml', 'ME-SUPP-1867': 'supplementtoannu00main_djvu.xml', 'ME-GETT-1898': 'maineatgettysbur01main_djvu.xml',
       'ME-APPD-1861': 'appendixdofannua00main_djvu.xml'}
RIGHTS = 'public domain (United States publication before 1929)'
# facts of the transient word-box files, read when they were downloaded (the files are deleted after the production run)
XML_FACTS = {'supplementtoannu00main_djvu.xml': (60693021, 'f2e3467537c743f50ff9f167db4f81396304df905c3839ea4cc975af94a1bcae'),
             'annualreportofad1863main_djvu.xml': (59959006, '869aa626276c9a297ae04eedc6ef89b59de0724b9e4fa55503cf6d14121ddda2'),
             'maineatgettysbur01main_djvu.xml': (18214090, '0bd25a6c1f807f2962df3ade25dae1bc93508c596730ae83cb93f8ce69ecbc8c')}


def main():
    out = {'format': 'roster2-sources-pointer/1', 'work_item': 'union-me', 'generated': M.now(), 'sources': [], 'derived_texts': [], 'blocked': [], 'access_rules': 'archive.org metadata and /cors/ downloads only, one request at a time, at least 1.2 s apart, generic client name; no login, key or bot-block workaround'}
    manifest = {'format': 'roster2-manifest/1', 'work_item': 'union-me', 'generated': M.now(), 'files': []}
    for sid, tid, ident, title, year, quote_rx, status in SOURCES:
        led = M.ledger_load(sid)
        ent = led['texts'][tid]
        text, pm, _ = M.load_text(sid, tid)
        ev = {'ia_date': ent.get('ia_date'), 'ia_possible_copyright_status': ent.get('ia_possible_copyright_status'), 'ia_contributor': ent.get('ia_contributor')}
        if quote_rx:
            m = re.search(quote_rx, text)
            if m:
                ev['imprint_quote'] = ' '.join(m.group(0).split())
                ev['imprint_quote_offset_in_text'] = m.start()
        rights_ok = year and int(year) < 1929 and (ent.get('ia_date') in (year, None) or ent.get('ia_date', '').startswith(year))
        files = []
        for role, f in ent['files'].items():
            url = 'https://archive.org/cors/%s/%s' % (ident, f['name'])
            files.append({'role': role, 'name': f['name'], 'bytes': f['bytes'], 'sha256': f['sha256'], 'url': url})
            manifest['files'].append({'source_id': sid, 'role': role, 'url': url, 'path': 'tmp/library/rosters/%s/%s' % (sid, f['name']), 'bytes': f['bytes'], 'sha256': f['sha256'], 'retrieved_utc': ent.get('retrieved'), 'status': 'FETCHED'})
        manifest['files'].append({'source_id': sid, 'role': 'metadata', 'url': 'https://archive.org/metadata/' + ident, 'path': None, 'status': 'FETCHED (read, not stored; the facts are in the ledger)', 'retrieved_utc': ent.get('retrieved')})
        xml = XML.get(sid)
        xp = os.path.join(M.XMLDIR, xml) if xml else None
        xinfo = None
        if xml in XML_FACTS and not os.path.exists(xp):
            nb, sh = XML_FACTS[xml]
            xinfo = {'name': xml, 'bytes': nb, 'sha256': sh, 'url': 'https://archive.org/cors/%s/%s' % (ident, xml), 'kept': 'transient: deleted after the production run; word boxes only, used to build rows'}
            manifest['files'].append({'source_id': sid, 'role': 'djvu_xml', 'url': xinfo['url'], 'path': None, 'bytes': nb, 'sha256': sh, 'retrieved_utc': '2026-11-13 (during the run of this item)', 'status': 'FETCHED (transient, deleted after use)'})
        elif xp and os.path.exists(xp):
            xinfo = {'name': xml, 'bytes': os.path.getsize(xp), 'sha256': M.sha256_file(xp), 'url': 'https://archive.org/cors/%s/%s' % (ident, xml),
                     'kept': 'transient: deleted after the production run; word boxes only, used to build rows (see pipeline2/union_me)'}
            manifest['files'].append({'source_id': sid, 'role': 'djvu_xml', 'url': xinfo['url'], 'path': 'tmp/library/rosters/_me_xml/' + xml, 'bytes': xinfo['bytes'], 'sha256': xinfo['sha256'],
                                      'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(xp))), 'status': 'FETCHED (transient)'})
        out['sources'].append({'source_id': sid, 'text_id': tid, 'identifier': ident, 'title': title, 'year': int(year), 'page_url': 'https://archive.org/details/' + ident,
                               'ia_title': ent.get('ia_title'), 'ia_date': ent.get('ia_date'), 'files': files, 'djvu_xml': xinfo, 'status': status,
                               'rights': {'basis': RIGHTS if rights_ok else 'not established', 'evidence': ev}})
        out['derived_texts'] += [{'text_id': k, 'kind': v['kind'], 'base_text_id': v.get('base_text_id'), 'files': v['files'], 'derived_from': v['derived_from']} for k, v in led['texts'].items() if v.get('kind') == 'ia-djvuxml-positional']
    out['blocked'].append({'what': 'Digital Maine (Maine State Archives): the 1864-65 final roster and the 20th Maine deceased list (gap G03)', 'host': 'digitalmaine.com',
                           'result': 'one HEAD request on 2026-11-13 20:42 UTC: the proxy answered CONNECT tunnel failed, response 403; not retried, not worked around',
                           'owner_step': 'download the files in a browser into tmp/library/rosters/ME-AGR-1864; the work item then reads them from there'})
    os.makedirs(os.path.join(M.D2, '..', 'sources'), exist_ok=True)
    json.dump(out, open(os.path.join(M.D2, '..', 'sources', 'union-me.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(manifest, open(os.path.join(M.TMP, 'MANIFEST-union-me.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in out['sources']:
        print(s['source_id'], s['rights']['basis'], s['rights']['evidence'].get('imprint_quote'), s['djvu_xml'] and s['djvu_xml']['bytes'])


if __name__ == '__main__':
    main()
