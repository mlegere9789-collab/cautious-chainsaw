#!/usr/bin/env python3
"""Register the Historic American Buildings Survey (HABS) and Historic American Engineering Record (HAER) documentation of Gettysburg National Military Park
(National Park Service programmes whose records the Library of Congress holds) as sources of the nps-landscape task.

Why: the park's farm buildings and tour roads were documented by the National Park Service's Heritage Documentation Programs; the Library of Congress record of each
carries the programme's significance statement and building dates, and its data PDF the typed 'written historical and descriptive data' (the forms of the 1950s by
Agnes A. Gilchrist, the report on the tour roads). These are United States government works (rights advisory of the record: 'No known restrictions on images made
by the U.S. Government; images copied from other sources may be restricted').

What it does (offline: the records and PDFs were fetched on 2026-11-15, one request per second, into tmp/library/web/habs/):
  - writes tmp/library/web/nps/NPS-HABS-<record>/NPS-HABS-<record>.txt : page 1 = the record (title, notes verbatim, contributors), pages 2.. = the text of the data PDF
    (pdftotext, one page per PDF page); copies the record JSON and the data PDF there; hashes both
  - adds the sources to catalogue.json, to tmp/library/web/nps/MANIFEST.json and to source_meta.json (build_sources.py then writes sources.json, INDEX.md and acquired_3.json)
Run with python3 -I; then build_sources.py.
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
HABS = os.path.join(ROOT, 'tmp', 'library', 'web', 'habs')
RETRIEVED = '2026-11-15'
RIGHTS_NOTE = ("Historic American Buildings Survey / Historic American Engineering Record documentation (National Park Service Heritage Documentation Programs) held by the "
               "Library of Congress. The Library's rights advisory for the record: 'No known restrictions on images made by the U.S. Government; images copied from other sources may be "
               "restricted.' The text quoted is the programme's own record text and data pages; the authors of some data pages are named contract historians: the owner confirms before any wider reuse.")
INCLUDE = ['pa0005', 'pa0006', 'pa0007', 'pa0008', 'pa0011', 'pa0012', 'pa0014', 'pa0015', 'pa0016', 'pa0017', 'pa0018', 'pa0019', 'pa0020', 'pa0021', 'pa1357', 'pa1639',
           'pa1676', 'pa1692', 'pa1693', 'pa1728', 'pa1739', 'pa1740', 'pa1745', 'pa1746', 'pa1747', 'pa1788', 'pa1789', 'pa1800', 'pa1817', 'pa1818', 'pa1819', 'pa1820',
           'pa2625', 'pa2627', 'pa4151', 'pa4187', 'pa4166', 'pa3648']


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def main():
    cat_p = os.path.join(NPS, 'catalogue.json')
    cat = json.load(open(cat_p, encoding='utf-8'))
    have = {i['id'] for i in cat['items']}
    man_p = os.path.join(LIB, 'MANIFEST.json')
    man = json.load(open(man_p))
    meta_add = {}
    for rid in INCLUDE:
        jp = os.path.join(HABS, rid + '.json')
        pp = os.path.join(HABS, 'pdf', rid + 'data.pdf')
        if not os.path.exists(jp):
            print('missing record', rid)
            continue
        d = json.load(open(jp, encoding='utf-8'))
        if 'item' not in d:
            print('bad record', rid)
            continue
        it = d['item']
        sid = 'NPS-HABS-' + rid
        sdir = os.path.join(LIB, sid)
        os.makedirs(sdir, exist_ok=True)
        shutil.copyfile(jp, os.path.join(sdir, sid + '.record.json'))
        pdf_info = None
        pages = []
        # page 1: the record
        lines = ['LIBRARY OF CONGRESS RECORD %s (Historic American Buildings Survey / Engineering Record, National Park Service)' % rid,
                 'TITLE: %s' % it.get('title', '')]
        for n in it.get('notes', []):
            lines.append('NOTE: ' + n)
        cn = it.get('contributor_names') or []
        if cn:
            lines.append('CONTRIBUTORS: ' + '; '.join(cn))
        for k in ('created_published', 'description'):
            v = it.get(k)
            if v:
                lines.append('%s: %s' % (k.upper(), ' | '.join(v) if isinstance(v, list) else v))
        pages.append('\n'.join(lines) + '\n')
        url_pdf = None
        for r in d.get('resources', []):
            for fl in r.get('files', []):
                for x in fl:
                    if x.get('type') == 'data' and x.get('mimetype') == 'application/pdf':
                        url_pdf = x['url']
        if os.path.exists(pp):
            shutil.copyfile(pp, os.path.join(sdir, sid + '.pdf'))
            txt = subprocess.run(['pdftotext', '-layout', pp, '-'], capture_output=True, text=True).stdout
            for pg in txt.split('\f'):
                if pg.strip():
                    pages.append(pg.rstrip() + '\n')
            pdf_info = {'url': url_pdf, 'bytes': os.path.getsize(pp), 'sha256': sha(pp)}
        out = os.path.join(sdir, sid + '.txt')
        with open(out, 'w', encoding='utf-8') as f:
            for i, t in enumerate(pages, 1):
                f.write('=== PAGE %d ===\n%s' % (i, t))
        jb = os.path.getsize(jp)
        title = it.get('title', rid)
        url = 'https://www.loc.gov/item/%s/' % rid
        if sid not in have:
            cat['items'].append({'id': sid, 'url': url, 'listing_title': title, 'topics': ['buildings']})
        man['items'][sid] = {
            'id': sid, 'status': 'acquired', 'http': 200, 'fetched_at': RETRIEVED + 'T00:00:00Z', 'bytes': jb, 'sha256': sha(jp), 'pages': len(pages), 'pages_with_text': len([p for p in pages if len(p.strip()) > 80]),
            'text_path': os.path.relpath(out, ROOT), 'text_bytes': os.path.getsize(out), 'text_sha256': sha(out), 'file_kept': True, 'file_path': os.path.relpath(os.path.join(sdir, sid + '.record.json'), ROOT),
            'url': url, 'url_effective': url, 'content_type': 'application/json',
            'data_pdf': pdf_info,
        }
        meta_add[sid] = {
            'title': title, 'author': 'Historic American Buildings Survey, National Park Service (record at the Library of Congress)' if not rid == 'pa3648' else 'Historic American Engineering Record, National Park Service (record at the Library of Congress)',
            'date': 'documentation compiled after 1933 (the survey year is not given; the data pages of the 1950s carry their own dates)',
            'from': 'the Library of Congress record %s (fields title, notes, contributor_names) and its data PDF' % rid,
            'rights_basis': 'United States government work', 'rights_note': RIGHTS_NOTE,
            'kind': 'official record (Historic American Buildings Survey / Engineering Record, National Park Service)',
            'text_quality': 'page 1 is the record as the Library serves it (notes verbatim; some significance notes end in an ellipsis because the Library prints a summary); pages 2 onward are the OCR text layer of the data PDF',
            'covers': 'data PDF: %s' % (('%s, %s bytes, sha256 %s' % (pdf_info['url'], pdf_info['bytes'], pdf_info['sha256'])) if pdf_info else 'none'),
            'used_for_extracts': 'see extracts/src/c0-habs.xdef',
        }
    json.dump(cat, open(cat_p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    tmp = man_p + '.tmp'
    json.dump(man, open(tmp, 'w'), indent=1, sort_keys=True)
    os.replace(tmp, man_p)
    mp = os.path.join(NPS, 'source_meta.json')
    m = json.load(open(mp, encoding='utf-8'))
    for k, v in meta_add.items():
        m['items'].setdefault(k, {}).update(v)
    open(mp, 'w', encoding='utf-8').write(json.dumps(m, indent=1))
    print('registered %d HABS/HAER records' % len(meta_add))


if __name__ == '__main__':
    main()
