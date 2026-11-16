#!/usr/bin/env python3
"""Register the Historic American Buildings Survey (HABS), Historic American Engineering Record (HAER) and Historic American Landscapes Survey (HALS)
documentation of Gettysburg National Military Park as sources of the nps-landscape task (workstream bt-web).

These are programmes of the National Park Service (Heritage Documentation Programs); the Library of Congress holds and serves the records. The park's farm buildings
and tour roads were documented from the 1930s to the 2010s; the Library's record of each carries the programme's significance statement and building dates, and the
data PDF the typed 'written historical and descriptive data' (the forms of the 1950s by Agnes A. Gilchrist, the 1980s-90s short histories, the HAER report on the tour
roads of 2006-ish, the 2013 report on the Cyclorama Building, a 2018 university team report on the Trostle summer kitchen).

What it does (offline: the records and PDFs were fetched on 2026-11-15, one request per second, into tmp/library/web/habs/ and tmp/library/web/habs/pdf/):
  - writes tmp/library/web/nps/NPS-HABS-<record>/NPS-HABS-<record>.txt : '=== PAGE 0 ===' = the record (title, notes verbatim, contributors, description); '=== PAGE n ===' = page n
    of the data PDF (pdftotext -layout; a page without text layer stays as an empty page so that the numbers hold); copies the record JSON and the data PDF there; hashes both
  - adds the sources to catalogue.json, to tmp/library/web/nps/MANIFEST.json and to source_meta.json (build_sources.py then writes sources.json, INDEX.md and acquired_3.json)
Run with python3 -I; then build_sources.py. Idempotent.
"""
import datetime, glob, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
HABS = os.path.join(ROOT, 'tmp', 'library', 'web', 'habs')
RIGHTS_NOTE = ("Documentation of the Historic American Buildings Survey / Engineering Record / Landscapes Survey (National Park Service, Heritage Documentation Programs), held by the "
               "Library of Congress. The Library's rights advisory for the records: 'No known restrictions on images made by the U.S. Government; images copied from other sources may be "
               "restricted.' The text quoted is the programme's own record text and data pages. Data pages written by named contract or university historians (listed on the record) "
               "are programme records but not necessarily works of federal employees: the owner confirms the basis before any wider reuse of those texts.")
SPECIAL_TOPICS = {'pa3648': ['general', 'monuments'], 'pa3988': ['general', 'monuments'], 'pa4166': ['cemetery']}


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def iso(p):
    return datetime.datetime.fromtimestamp(os.path.getmtime(p), datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def main():
    cat_p = os.path.join(NPS, 'catalogue.json')
    cat = json.load(open(cat_p, encoding='utf-8'))
    have = {i['id']: i for i in cat['items']}
    man_p = os.path.join(LIB, 'MANIFEST.json')
    man = json.load(open(man_p))
    mp = os.path.join(NPS, 'source_meta.json')
    meta = json.load(open(mp, encoding='utf-8'))
    n = 0
    for jp in sorted(glob.glob(os.path.join(HABS, 'pa*.json'))):
        rid = os.path.basename(jp)[:-5]
        try:
            d = json.load(open(jp, encoding='utf-8'))
            it = d['item']
        except Exception as e:
            print('record not usable (not registered):', rid, e)
            continue
        sid = 'NPS-HABS-' + rid
        sdir = os.path.join(LIB, sid)
        os.makedirs(sdir, exist_ok=True)
        shutil.copyfile(jp, os.path.join(sdir, sid + '.record.json'))
        pp = os.path.join(HABS, 'pdf', rid + 'data.pdf')
        url_pdf = None
        for r in d.get('resources', []):
            for fl in r.get('files', []):
                for x in fl:
                    if x.get('type') == 'data' and x.get('mimetype') == 'application/pdf':
                        url_pdf = x['url']
        pages = []
        lines = ['LIBRARY OF CONGRESS RECORD %s (National Park Service documentation programme: Historic American Buildings Survey, Engineering Record or Landscapes Survey)' % rid,
                 'TITLE: %s' % it.get('title', '')]
        for nt in it.get('notes', []):
            lines.append('NOTE: ' + ' '.join(nt.split()))
        cn = it.get('contributor_names') or []
        if cn:
            lines.append('CONTRIBUTORS: ' + '; '.join(cn))
        for k in ('created_published', 'description'):
            v = it.get(k)
            if v:
                lines.append('%s: %s' % (k.upper(), ' | '.join(v) if isinstance(v, list) else v))
        pages.append('\n'.join(lines) + '\n')
        extra = []
        if os.path.exists(pp):
            shutil.copyfile(pp, os.path.join(sdir, sid + '.pdf'))
            txt = subprocess.run(['pdftotext', '-layout', pp, '-'], capture_output=True, text=True).stdout
            parts = txt.split('\f')
            if parts and not parts[-1].strip():
                parts = parts[:-1]
            for pg in parts:
                pages.append(pg.rstrip() + '\n')
            extra.append({'what': 'data PDF of the record (its text is pages 1 onward of the saved text: page n = PDF page n)', 'url': url_pdf, 'bytes': os.path.getsize(pp), 'sha256': sha(pp),
                          'fetched_at': iso(pp), 'file_path': os.path.relpath(os.path.join(sdir, sid + '.pdf'), ROOT)})
        out = os.path.join(sdir, sid + '.txt')
        with open(out, 'w', encoding='utf-8') as f:
            for i, t in enumerate(pages):
                f.write('=== PAGE %d ===\n%s' % (i, t))
        title = it.get('title', rid)
        url = 'https://www.loc.gov/item/%s/' % rid
        topics = SPECIAL_TOPICS.get(rid, ['buildings'])
        if sid not in have:
            cat['items'].append({'id': sid, 'url': url, 'listing_title': title, 'topics': topics})
        man['items'][sid] = {
            'id': sid, 'status': 'acquired', 'http': 200, 'fetched_at': iso(jp), 'bytes': os.path.getsize(jp), 'sha256': sha(jp), 'pages': max(len(pages) - 1, 1),
            'pages_with_text': len([p for p in pages if len(p.strip()) > 80]), 'text_path': os.path.relpath(out, ROOT), 'text_bytes': os.path.getsize(out), 'text_sha256': sha(out),
            'file_kept': True, 'file_path': os.path.relpath(os.path.join(sdir, sid + '.record.json'), ROOT), 'content_type': 'application/json',
            'extra_files': extra,
        }
        hist = [c.split(',')[0] for c in cn if c.endswith(', historian')]
        prog = 'Historic American Engineering Record' if 'HAER' in ' '.join(it.get('notes', [])) else ('Historic American Landscapes Survey' if 'HALS' in ' '.join(it.get('notes', [])) else 'Historic American Buildings Survey')
        author = '%s, National Park Service (record held by the Library of Congress)%s' % (prog, ('; historian: ' + ', '.join(hist)) if hist else '')
        cp = it.get('created_published')
        meta['items'].setdefault(sid, {}).update({
            'title': title, 'author': author,
            'date': (cp[0] if isinstance(cp, list) and cp else cp) or 'not stated',
            'from': 'the Library of Congress record %s (fields title, notes, contributor_names, created_published, description) and its data PDF' % rid,
            'rights_basis': 'United States government work', 'rights_note': RIGHTS_NOTE,
            'kind': 'official record (National Park Service documentation programme: HABS / HAER / HALS)',
            'text_quality': ('page 0 is the record as the Library serves it (the notes verbatim; a significance note that ends in an ellipsis is the Library\'s own abridgement); '
                             'page n is page n of the data PDF: the text layer of the Library\'s scan (typed forms of the 1950s carry recognition errors such as "Gulp" for "Culp"; every quote is checked '
                             'against the page image) or, for the reports of the 1980s onward, born-digital text'),
            'covers': 'record notes (page 0)' + ('; data PDF: %d page(s)' % (len(pages) - 1) if len(pages) > 1 else '; no data PDF saved'),
            'state_dates_note': ('The record states the building dates and what the programme found; a form or drawing set describes the building as measured (1930s to 2010s), so a material or '
                                 'plan statement refers to that date unless it says otherwise. Statements about July 1863 are the historian\'s account and are dated 1863 only where the text says so.'),
            'used_for_extracts': meta['items'].get(sid, {}).get('used_for_extracts', 'see extracts/src/c0-habs.xdef (if no extract names this source, the record carries no statement on the 1863 landscape; see not_extracted.json)'),
        })
        n += 1
    json.dump(cat, open(cat_p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    tmp = man_p + '.tmp'
    json.dump(man, open(tmp, 'w'), indent=1, sort_keys=True)
    os.replace(tmp, man_p)
    open(mp, 'w', encoding='utf-8').write(json.dumps(meta, indent=1, ensure_ascii=False))
    print('registered %d HABS/HAER/HALS records' % n)


if __name__ == '__main__':
    main()
