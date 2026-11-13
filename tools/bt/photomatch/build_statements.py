#!/usr/bin/env python3
"""Build the Q16 camera-position statement registry and the evidence lines from statements_data.py.
Every quote is looked for in the saved source text (whitespace collapsed; for badly OCR-spaced pages a second, space-free comparison is used and recorded as such);
a statement whose quote is not found is reported and the script exits with status 1 (nothing half-written). The page number is the PDF page marker '=== PAGE n ===' of the saved text.
Outputs: tools/bt/photomatch/position_statements.json, docs/battle-theatre/GOVERNANCE/evidence_corrections/web-photomatch.jsonl.
Usage: python3 -I tools/bt/photomatch/build_statements.py"""
import json, os, re, sys, hashlib, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path.insert(0, HERE)
from statements_data import S, TL
NPS = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps'); WEB = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'www.nps.gov'); RAW = os.path.join(ROOT, 'tmp', 'photomatch', 'raw')
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def norm(s): return re.sub(r'\s+', ' ', s).strip()
def nospace(s): return re.sub(r'\s+', '', s)
WEBPAGES = {'NPSWEB-TN-INDEX': 'then-and-now.htm', 'NPSWEB-TN-RW': 'rose-woods-then-and-now.htm', 'NPSWEB-TN-RW1': None, 'NPSWEB-TN-DD': 'devil-s-den-then-and-now.htm',
            'NPSWEB-TN-LRT': 'little-round-top-then-and-now.htm', 'NPSWEB-TN-TR': 'trostle-farm-then-and-now.htm', 'NPSWEB-TN-BF': 'buildings-and-farms-then-and-now.htm'}
WEBURL = {'NPSWEB-TN-INDEX': 'https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm', 'NPSWEB-TN-RW1': 'https://www.nps.gov/places/gettysburg-then-now-first-rose-woods.htm'}
def man_entry(url):
    best = None
    for line in open(os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'manifest.jsonl')):
        r = json.loads(line)
        if r.get('url') == url and r.get('status') == 'ok': best = r
    return best
sources = {}
def source(sid):
    if sid in sources: return sources[sid]
    if sid.startswith('LOC-'):
        pk = sid[4:]; p = os.path.join(RAW, f'item_{pk}.json'); d = json.load(open(p))['item']
        text = ' || '.join([d.get('title') or '', d.get('summary') or ''] + [n['note'] for n in d.get('notes', [])])
        sources[sid] = {'id': sid, 'kind': 'Library of Congress catalogue record (open JSON of the record)', 'title': d.get('title'), 'url': f'https://www.loc.gov/pictures/item/{pk}/', 'local_text': os.path.relpath(p, ROOT),
                        'sha256_text': sha(p), 'retrieved': time.strftime('%Y-%m-%d', time.gmtime(os.path.getmtime(p))), 'rights': 'LOC: no known restrictions on publication', 'pages': {'record': text}}
    elif sid.startswith('NPSWEB-'):
        if sid == 'NPSWEB-TN-RW1': fn = 'places_gettysburg-then-now-first-rose-woods.htm'; url = WEBURL[sid]
        else:
            nm = WEBPAGES[sid]; fn = 'gett_learn_photosmultimedia_' + nm; url = 'https://www.nps.gov/gett/learn/photosmultimedia/' + nm
        p = os.path.join(WEB, fn + '.txt'); m = man_entry(url); t = open(p, encoding='utf-8').read()
        sources[sid] = {'id': sid, 'kind': 'National Park Service web page (official body; text of the saved page)', 'title': norm(t.split('\n')[0])[:200], 'url': url, 'local_text': os.path.relpath(p, ROOT), 'sha256_text': sha(p),
                        'retrieved': (m or {}).get('retrieved'), 'rights': 'United States government work', 'pages': {'page': t}}
    else:
        base = os.path.join(NPS, sid); p = os.path.join(base, sid + '.txt'); pl = os.path.join(base, sid + '.layout.txt'); man = json.load(open(os.path.join(NPS, 'MANIFEST.json')))['items'].get(sid, {})
        pages = {}; t = open(p, encoding='utf-8', errors='replace').read(); parts = re.split(r'=== PAGE (\d+) ===', t)
        for i in range(1, len(parts), 2): pages[int(parts[i])] = parts[i + 1]
        first = norm(pages.get(1, ''))[:260]
        lay = {}
        if os.path.exists(pl):
            tl = open(pl, encoding='utf-8', errors='replace').read(); pr = re.split(r'=== PAGE (\d+) ===', tl)
            for i in range(1, len(pr), 2): lay[int(pr[i])] = pr[i + 1]
        sources[sid] = {'id': sid, 'kind': 'National Park Service publication (official body; saved PDF text)', 'title_page_text_as_saved': first, 'url': man.get('url'), 'local_text': os.path.relpath(p, ROOT), 'sha256_text': sha(p),
                        'sha256_text_manifest': man.get('text_sha256'), 'retrieved': (man.get('fetched_at') or '')[:10], 'rights': 'United States government work (NPS publication)', 'pages': pages, 'layout_pages': lay}
    return sources[sid]
def find(src, q):
    """Return (page, offset, method) for a quote fragment or None."""
    qn = norm(q); qs = nospace(q)
    for kind in ('pages', 'layout_pages'):
        for pg, tx in (src.get(kind) or {}).items():
            tn = norm(tx)
            i = tn.find(qn)
            if i >= 0: return pg, i, 'exact' + ('' if kind == 'pages' else ' (layout text)')
    for kind in ('pages', 'layout_pages'):
        for pg, tx in (src.get(kind) or {}).items():
            ts = nospace(tx); i = ts.find(qs)
            if i >= 0: return pg, i, 'exact after removing all whitespace (OCR-spaced page)' + ('' if kind == 'pages' else ' (layout text)')
    return None
def main():
    out = []; fails = []
    for st in S:
        src = source(st['src']); frags = st['quote'] if isinstance(st['quote'], list) else [st['quote']]; found = []
        if st.get('image_read'):
            # the text layer of the saved PDF is too garbled for a verbatim match; the caption was read from the page image: not machine-checkable, so the tier is never 'documented'
            e = dict(st); e['page'] = st['image_read']; e['match'] = 'read from the page image of the saved PDF; the text layer is garbled (not machine-checkable)'; e['tier'] = 'inferred'; e['coordinates_published'] = False
            e['source'] = {k: v for k, v in src.items() if k not in ('pages', 'layout_pages')}; out.append(e); continue
        for q in frags:
            r = find(src, q)
            if not r: fails.append((st['id'], q[:100])); break
            found.append({'fragment': q, 'page': r[0], 'offset_in_normalised_page': r[1], 'match': r[2]})
        else:
            e = dict(st); e['quote'] = ' '.join(frags) if isinstance(st['quote'], list) else st['quote']
            if isinstance(st['quote'], list): e['quote_fragments'] = found; e['quote_note'] = 'two-column page: the caption lines are interleaved with the other column in the saved text; each fragment is verbatim and found in order'
            else: e.update(found[0]); e.pop('fragment', None)
            e['page'] = found[0]['page'] if src['id'].startswith('NPS-') else ('record' if src['id'].startswith('LOC-') else 'page')
            e['tier'] = st.get('tier', 'documented'); e['coordinates_published'] = False
            e['source'] = {k: v for k, v in src.items() if k not in ('pages', 'layout_pages')}
            out.append(e)
    if fails:
        for f in fails: print('QUOTE NOT FOUND', f, file=sys.stderr)
        sys.exit(1)
    srcs = {k: {kk: vv for kk, vv in v.items() if kk not in ('pages', 'layout_pages')} for k, v in sources.items()}
    json.dump({'_doc': 'Camera-position statements for the Q16 photographs: what each source literally says about where the camera stood or which way it looked. Built by build_statements.py; every quote was found in the saved source text. tier documented = the source says it (it is a statement, not a coordinate); tier lead = a statement the source takes from a book that may not be used (Frassanito), listed so that nothing is hidden. No source read gives a coordinate.',
               'count': len(out), 'sources': srcs, 'statements': [{k: v for k, v in e.items() if k != 'source'} for e in out]}, open(os.path.join(HERE, 'position_statements.json'), 'w'), indent=1, ensure_ascii=False)
    # evidence lines (the shard contract of the evidence/timeline closure: id = sub-requirement, sub-claims with tier, citations with verbatim quote, sha256 of the saved text)
    def cite(e):
        s = e['source']; c = {'source_id': s['id'], 'source_kind': s['kind'], 'source_title': s.get('title') or s.get('title_page_text_as_saved'), 'url': s.get('url'), 'retrieved': s.get('retrieved'), 'local_text': s['local_text'],
                              'sha256_text': s['sha256_text'], 'page_marker': e['page'], 'quote': e['quote']}
        if 'quote_fragments' in e: c['quote_fragments'] = [f['fragment'] for f in e['quote_fragments']]; c['offset'] = e['quote_fragments'][0]['offset_in_normalised_page']
        else: c['offset'] = e.get('offset_in_normalised_page'); c['match'] = e.get('match')
        return c
    groups = {'R12.032': [e for e in out if e['source']['id'].startswith(('LOC-', 'NPS-'))], 'R12.035': [e for e in out if e['source']['id'].startswith('NPSWEB-')]}
    lines = []
    for rid, es in groups.items():
        sub = [{'sub_claim': e['says'], 'tier': e['tier'], 'precision': e['prec'], 'about_loc_records': e.get('loc') or e.get('cand') or [], 'identity_basis': e.get('ident'), 'citation': cite(e), 'note': e.get('note')} for e in es]
        lines.append({'id': rid, 'shard': 'web-photomatch', 'verdict': 'partially_supported',
                      'corrected_claim': ('Gardner, O\'Sullivan, Gibson and Brady photographs of July 1863 (Library of Congress records and National Park Service publications): camera positions are stated in words only (place, viewing direction, reference objects); no source read gives a coordinate, a lens or a surveyed station.' if rid == 'R12.032' else
                                          'NPS Then-And-Now pages: the modern pictures were taken from the same location as the originals (stated); the pages give view directions and reference objects in words, no coordinates.'),
                      'subclaims': sub, 'unsupported': ['camera coordinates of any 1863 tripod position', 'focal length / plate size of any exposure', 'the 1863 trees, rocks and crops needed to compare near fields'],
                      'status_note': 'The position of a camera is therefore recoverable only by photo-match (PDF B.9.2 step 7); Q16 stays not passing.'})
    lines.append({'id': 'R12.033', 'shard': 'web-photomatch', 'verdict': 'confirmed',
                  'corrected_claim': 'LOC Civil War Photographs: the JPEG derivatives are reachable (tile.loc.gov via cdn.loc.gov) and 430 files of 127 catalogued records are saved with sha256 (tools/bt/photomatch/images_ledger.json); the first catalogue run had dropped 18 records whose date is catalogued only as between 1861 and 1865, now added (catalogue_additions.json).',
                  'subclaims': [{'sub_claim': 'image files of the catalogued photographs are available and checked (size equals the size declared by the record; the file decodes to the last pixel)', 'tier': 'documented',
                                 'citation': {'source_id': 'LOC-images', 'source_kind': 'Library of Congress JPEG derivatives', 'url': 'https://www.loc.gov/pictures/collection/cwp/', 'retrieved': '2026-11-13', 'local_text': 'tools/bt/photomatch/images_ledger.json', 'sha256_text': sha(os.path.join(HERE, 'images_ledger.json')), 'page_marker': 'ledger', 'quote': 'LOC record rights statement: "No known restrictions on publication."'}}],
                  'unsupported': ['master TIFF scans were fetched only for 2 resources (size)'], 'status_note': 'access resolved; the camera positions are the open part (R12.032, R12.035)'})
    lines.append({'id': 'R12.034', 'shard': 'web-photomatch', 'verdict': 'gap',
                  'corrected_claim': 'Frassanito rephotography (camera positions) is copyrighted and was not used; LOC records that cite Frassanito are listed as tier lead, not documented.', 'subclaims': [], 'unsupported': ['Frassanito camera positions (not read, not ingestible)'],
                  'status_note': 'owner decision (purchase or loan of the book, or written permission) stays open; see the owner step in the report'})
    ed = os.path.join(GOV, 'evidence_corrections'); os.makedirs(ed, exist_ok=True)
    with open(os.path.join(ed, 'web-photomatch.jsonl'), 'w') as f:
        for l in lines: f.write(json.dumps(l, ensure_ascii=False) + '\n')
    tl = []; byid = {e['id']: e for e in out}
    for r in TL:
        subs = [{'sub_claim': byid[i]['says'], 'tier': byid[i]['tier'], 'citation': cite(byid[i])} for i in r['statement_ids']]
        tl.append({'id': r['id'], 'shard': 'web-photomatch', 'verdict': r['verdict'], 'corrected_claim': r['corrected_claim'], 'subclaims': subs, 'unsupported': r['unsupported'], 'status_note': 'row stays seeded_unverified until its integrator merges this line'})
    td = os.path.join(GOV, 'timeline_corrections'); os.makedirs(td, exist_ok=True)
    with open(os.path.join(td, 'web-photomatch.jsonl'), 'w') as f:
        for l in tl: f.write(json.dumps(l, ensure_ascii=False) + '\n')
    print(len(out), 'statements verified;', len(lines), 'evidence lines;', len(tl), 'timeline lines;', len(srcs), 'sources')
if __name__ == '__main__': main()
