"""Round 2 of roster-qa: add the Moore scans to the pointer file rosters/sources/roster-qa.json and to the manifest tmp/library/rosters/MANIFEST-roster-qa.json.  Standard library only.

    python3 -I qa_sources_r2.py            add (or refresh) the entries of the eight Internet Archive items of Moore's Roster (source NC-MOORE-1882) from the PDFs on disk

The entries of round 1 are kept as they are.  For each of the eight items the text PDF (and its scan data where the PDF has fewer pages than the item has leaves) was fetched through
archive.org/cors (one request at a time, 1.2 s apart, a generic client name) by pipeline2/page_image.py; the file name inside the item is the identifier + .pdf for six items and
05913252_NNNN.pdf for the Emory items (page_image.pdf_remote_name).  Bytes and sha256 are of the files on disk; when a PDF has already been dropped from disk the previous entry is
kept (the pointer file is the record, the PDFs are transient).  The rights block is copied from the pointer file of conf-nc (the item that parsed the text); an imprint after 1928
never carries the basis 'public domain (United States publication before 1929)' (the test of app/tests/roster-qa.test.mjs).
"""
import sys, os, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import qa_lib as Q
import page_image as PI

TEXTS = [  # (volume, identifier, text id)
    ('1', 'rosternorthcaro00moorgoog', 'NC-MOORE-1882.1'), ('1', '05913252.3309.emory.edu', 'NC-MOORE-1882.1~b'),
    ('2', 'rosterofnorthcar02nort', 'NC-MOORE-1882.2'), ('2', '05913252.3310.emory.edu', 'NC-MOORE-1882.2~b'),
    ('3', 'rosterofnorthcar03moor', 'NC-MOORE-1882.3'), ('3', '05913252.3311.emory.edu', 'NC-MOORE-1882.3~b'),
    ('4', 'rosterofnorthcar04moor', 'NC-MOORE-1882.4'), ('4', '05913252.3312.emory.edu', 'NC-MOORE-1882.4~b'),
]


def main():
    pj = os.path.join(Q.R2, 'sources', 'roster-qa.json')
    mj = os.path.join(Q.TMP, 'MANIFEST-roster-qa.json')
    doc = Q.jload(pj)
    man = Q.jload(mj)
    nc = Q.jload(os.path.join(Q.R2, 'sources', 'conf-nc.json'))
    old = {s['text_id']: s for s in doc['sources'] if s['source_id'] == 'NC-MOORE-1882'}
    keep = [s for s in doc['sources'] if s['source_id'] != 'NC-MOORE-1882']
    mkeep = [x for x in man['files'] if x['source_id'] != 'NC-MOORE-1882']
    new, mnew = [], []
    for vol, ident, tid in TEXTS:
        src = next((s for s in nc['sources'] if s['identifier'] == ident), None)
        pdf = os.path.join(Q.PDFDIR, ident + '.pdf')
        sd = os.path.join(Q.PDFDIR, ident + '_scandata.xml')
        remote = PI.pdf_remote_name(ident)
        files = []
        for role, p, rname in (('pdf', pdf, remote), ('scandata', sd, remote[:-len('.pdf')] + '_scandata.xml')):
            if os.path.exists(p):
                files.append({'role': role, 'name': os.path.basename(p), 'remote_name': rname, 'url': 'https://archive.org/cors/%s/%s' % (ident, rname), 'bytes': os.path.getsize(p), 'sha256': Q.R.sha256_file(p),
                              'retrieved_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(p))), 'http_status': 200,
                              'kept': 'transient: deleted after the run (bytes and sha256 stay here)'})
        if not files and tid in old:
            new.append(old[tid])
            mnew.extend(x for x in man['files'] if x['source_id'] == 'NC-MOORE-1882' and x['identifier'] == ident)
            continue
        if not files:
            continue
        rights = dict(src['rights']) if src else {'basis': 'not established (no pointer-file entry of conf-nc)'}
        rights['copied_from'] = 'rosters/sources/conf-nc.json (source %s)' % ident
        pf = next((f for f in files if f['role'] == 'pdf'), None)
        new.append({'source_id': 'NC-MOORE-1882', 'volume': vol, 'text_id': tid, 'identifier': ident, 'title': (src or {}).get('title') or (src or {}).get('ia_title'), 'year': (src or {}).get('year'),
                    'page_url': 'https://archive.org/details/' + ident, 'url': pf['url'] if pf else None, 'bytes': pf['bytes'] if pf else None, 'sha256': pf['sha256'] if pf else None,
                    'use': 'single pages rendered with pdftoppm for the independent sample (round 2) and for the second reading; the page images are never stored', 'files': files, 'rights': rights})
        for f in files:
            mnew.append({'source_id': 'NC-MOORE-1882', 'identifier': ident, **f})
    doc['sources'] = keep + new
    doc['generated'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    man['files'] = mkeep + mnew
    man['generated'] = doc['generated']
    Q.jdump(pj, doc)
    Q.jdump(mj, man)
    print('pointer file: %d sources (%d of round 2), manifest: %d files (%d bytes of round 2)' % (len(doc['sources']), len(new), len(man['files']), sum(x['bytes'] for x in mnew)))


if __name__ == '__main__':
    main()
