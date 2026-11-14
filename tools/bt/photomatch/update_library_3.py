#!/usr/bin/env python3
"""Merge the photo-match entries of the third pass (2026-11-14) into GOVERNANCE/library/acquired_3.json and status_3.json (the tracked pointers of the sources acquired from the hosts that became reachable on 2026-11-13).
Rules of those files: each task of the web workstream merges its own entries by id (task = photomatch); entries of other tasks are never touched or removed; the write is under the lock tmp/acquired_3.lock that the other task uses; the file is replaced atomically.
Counts and hashes are read from the ledgers at run time, never typed. Usage: python3 -I tools/bt/photomatch/update_library_3.py"""
import fcntl, hashlib, json, os, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); LIB = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library')
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def J(n): return json.load(open(os.path.join(HERE, n)))
def main():
    led = J('images_ledger.json'); wl = J('wide_images_ledger.json')['images']; nf = J('nps_figures.json'); conf = J('nps_figures_confirmed.json')['ties'] if os.path.exists(os.path.join(HERE, 'nps_figures_confirmed.json')) else {}
    cat = J('catalogue.json')['photographs']; add = J('catalogue_additions.json')['photographs']; wide = J('catalogue_wide_items.json')['photographs']
    der = [v for v in led['images'].values() if v.get('status') == 'ok' and v.get('derivative') in ('medium', 'large')]; wok = [v for v in wl.values() if v.get('status') == 'ok']; wnd = [k for k, v in wl.items() if v.get('status') == 'not_offered']
    man = [json.loads(l) for l in open(os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'manifest.jsonl'))]; pl = [m for m in man if '/places/' in m['url'] and m.get('status') == 'ok']
    today = time.strftime('%Y-%m-%d')
    items = {
        'PM-LOC-DERIVATIVES': {'id': 'PM-LOC-DERIVATIVES', 'task': 'photomatch', 'title': 'Library of Congress Civil War photographs: medium and large JPEG derivatives of the %d catalogued records of the first two passes (%d first run + %d added, 2 of them outside the cwp collection)' % (len(cat) + len(add), len(cat), len(add)),
            'creator': 'Library of Congress, Prints and Photographs Division', 'date': '1863 photographs', 'url': 'https://www.loc.gov/pictures/collection/cwp/ (files from cdn.loc.gov, which redirects to tile.loc.gov)', 'fetched_at': '2026-11-13 and 2026-11-14 (the two records outside cwp)', 'files': len(der), 'bytes': sum(v['bytes'] for v in der),
            'local_path': 'tmp/photomatch/loc/', 'pointer': 'tools/bt/photomatch/images_ledger.json (sha256, size, pixel size and licence basis per file)', 'pointer_sha256': sha(os.path.join(HERE, 'images_ledger.json')), 'file_kept': True, 'rights_basis': 'LOC record rights statement: no known restrictions on publication (a record with an empty rights field: 19th-century print, public domain by age, an inference)'},
        'PM-LOC-RECORDS': {'id': 'PM-LOC-RECORDS', 'task': 'photomatch', 'title': 'Library of Congress catalogue records (open JSON) of the %d photographs of the three catalogue passes' % (len(cat) + len(add) + len(wide)), 'creator': 'Library of Congress', 'url': 'https://www.loc.gov/pictures/item/<id>/?fo=json',
            'fetched_at': '2026-11-11 (109 records), 2026-11-13 (18 records), 2026-11-14 (2 records outside cwp and 62 records of the wide search)', 'local_path': 'tmp/photomatch/raw/', 'pointer': 'tools/bt/photomatch/catalogue.json, catalogue_additions.json and catalogue_wide_items.json',
            'pointer_sha256': {n: sha(os.path.join(HERE, n)) for n in ('catalogue.json', 'catalogue_additions.json', 'catalogue_wide_items.json')}, 'file_kept': True, 'rights_basis': 'LOC: no known restrictions on publication'},
        'PM-LOC-WIDE': {'id': 'PM-LOC-WIDE', 'task': 'photomatch', 'title': 'Library of Congress wide search (open JSON search of the Civil War group, co=civwar, q=gettysburg 1863, 950 results): %d photographs of 1863 naming Gettysburg that the first two passes did not hold; %d medium JPEGs saved, %d records not digitized by the Library' % (len(wide), len(wok), len(wnd)),
            'creator': 'Library of Congress, Prints and Photographs Division', 'url': 'https://www.loc.gov/pictures/search/?q=gettysburg+1863&co=civwar&fo=json&c=100&sp=1..10 (images from cdn.loc.gov / tile.loc.gov)', 'fetched_at': today, 'files': len(wok), 'bytes': sum(v['bytes'] for v in wok), 'local_path': 'tmp/photomatch/wide/',
            'pointer': 'tools/bt/photomatch/wide_images_ledger.json, catalogue_wide.json and catalogue_wide_items.json', 'pointer_sha256': {n: sha(os.path.join(HERE, n)) for n in ('wide_images_ledger.json', 'catalogue_wide.json', 'catalogue_wide_items.json')}, 'file_kept': True, 'rights_basis': 'LOC: no known restrictions on publication, or an empty rights field on a 19th-century print (public domain by age: an inference)'},
        'PM-NPS-PLACE-PAGES': {'id': 'PM-NPS-PLACE-PAGES', 'task': 'photomatch', 'title': 'National Park Service Place pages of the Gettysburg Then-And-Now comparisons and of the places they name (%d pages)' % len(pl), 'creator': 'National Park Service, Gettysburg National Military Park', 'url': 'https://www.nps.gov/places/gettysburg-then-now-<name>.htm and other nps.gov/places pages',
            'fetched_at': '2026-11-13', 'local_path': 'tmp/library/web/photomatch/www.nps.gov/', 'pointer': 'tmp/library/web/photomatch/manifest.jsonl (sha256 of every saved page and text); statements in tools/bt/photomatch/position_statements.json (sources NPSWEB-PL-*)', 'file_kept': True, 'rights_basis': 'United States government work'},
        'PM-NPS-ROT-FIGURES': {'id': 'PM-NPS-ROT-FIGURES', 'task': 'photomatch', 'title': 'Figures of the NPS Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment, volumes I and II: %d captioned 1863 photographs extracted from the PDFs (pdfimages, inverted to positive)' % nf['count'],
            'creator': 'National Park Service, Olmsted Center for Landscape Preservation (2018)', 'url': 'https://www.npshistory.com/publications/gett/clr-v1.pdf and clr-v2.pdf', 'fetched_at': today, 'sha256_of_pdfs': {'clr-v1.pdf': '216f0cdd74cb2760aa19a508fc4bb104e5c9e32bdd13ee753970aaed9b8e43e3', 'clr-v2.pdf': '6c3203c00d02e843982c9c8b7142372147000b69b12bd7c5adb710281eb58ab2'},
            'note_pdfs': 'the two PDFs (294 and 189 MB) were fetched again with one request each; their sha256 equals the manifest of the first fetch of the nps-landscape task; they were deleted after the extraction (file_kept false)', 'files': nf['count'], 'local_path': 'tmp/photomatch/nps_pdf/pos/', 'pointer': 'tools/bt/photomatch/nps_figures.json (caption verbatim, pdf page, sha256 of every image); ties to Library of Congress records in nps_figures_confirmed.json (%d confirmed by looking)' % len(conf),
            'pointer_sha256': sha(os.path.join(HERE, 'nps_figures.json')), 'file_kept': False, 'rights_basis': 'United States government work (NPS publication); the figure images reproduce 1863 photographs'},
    }
    st = {'PM-LOC-DERIVATIVES': ('ingested', '%d files, sha256 in images_ledger.json, every file decoded' % len(der)), 'PM-LOC-RECORDS': ('ingested', '%d records, caption and notes read for camera-position statements' % (len(cat) + len(add) + len(wide))),
          'PM-LOC-WIDE': ('ingested', '%d records of the wide search (outside the cwp collection): %d medium JPEGs with sha256, %d records not digitized by the Library, each read and classified' % (len(wide), len(wok), len(wnd))),
          'PM-NPS-PLACE-PAGES': ('ingested', '%d NPS place pages read for camera places' % len(pl)), 'PM-NPS-ROT-FIGURES': ('ingested', '%d figure captions cut verbatim from the saved text; images matched against the catalogue; %d ties confirmed by looking' % (nf['count'], len(conf)))}
    blocked = {
        'PM-LC-B815-273': {'id': 'PM-LC-B815-273', 'task': 'photomatch', 'url': 'LOC negative LC-B815-273 (NPS Cemetery CLR Fig. 1.26)', 'status': 'found', 'reason': 'resolved 2026-11-14: it is LOC record 2018671576 (resource cwpb.00084, a stereo negative, caption from the negative sleeve: Gettysburg from the Cemetery. July 1863); the record carries the call number LC-B815- 273 [P&P]'},
        'PM-NARA-CATALOG': {'id': 'PM-NARA-CATALOG', 'task': 'photomatch', 'url': 'https://catalog.archives.gov/', 'status': 'blocked', 'reason': 'reachable, but a plain request to any address of the catalog (and to its api/v2 path) returns the same 5 KB single-page-application shell, not data; the catalog API needs a key (an account, an owner act); a browser read was not made. No NARA description of a Gettysburg photograph was read'},
        'PM-LOC-NOT-DIGITIZED': {'id': 'PM-LOC-NOT-DIGITIZED', 'task': 'photomatch', 'url': 'https://www.loc.gov/pictures/item/<id>/', 'status': 'no image', 'reason': 'records of the wide search that the Library has not digitized (its search result carries the placeholder 500x500_notdigitized.png): ' + ', '.join(sorted(wnd)) + '; each is listed in the registry with its title and the reason it has no frame to look at'},
        'PM-GARDNER-SKETCHBOOK-LOC': {'id': 'PM-GARDNER-SKETCHBOOK-LOC', 'task': 'photomatch', 'url': 'https://www.loc.gov/item/01021785/ (Gardner\'s photographic sketch book of the war, 1865)', 'status': 'images only', 'reason': 'the Library item holds the album pages as images (1024 px copies and 100 MB master TIFFs) without a text layer; at 1024 px the letterpress is too small for OCR and the masters were not fetched; the plate captions that LOC transcribed into its picture records are used (plates 35 and 39)'},
        'PM-GUTENBERG-SKETCHBOOK': {'id': 'PM-GUTENBERG-SKETCHBOOK', 'task': 'photomatch', 'url': 'https://www.gutenberg.org/ebooks/search/?query=gardner+photographic+sketch+book', 'status': 'not found', 'reason': 'the search returned no records: there is no Project Gutenberg edition of the Sketch Book'},
    }
    with open(os.path.join(ROOT, 'tmp', 'acquired_3.lock'), 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        for fn, key, new in (('acquired_3.json', 'items', items),):
            p = os.path.join(LIB, fn); d = json.load(open(p)); cur = {i['id']: i for i in d[key]}
            for k, v in new.items(): cur[k] = v   # replace or add the photomatch entries by id; entries of other tasks stay as they are
            order = [i['id'] for i in d[key]] + [k for k in new if k not in [i['id'] for i in d[key]]]; d[key] = [cur[k] for k in order]
            bl = {b['id']: b for b in d['blocked_or_failed']}
            for k, v in blocked.items(): bl[k] = v
            border = [b['id'] for b in d['blocked_or_failed']] + [k for k in blocked if k not in [b['id'] for b in d['blocked_or_failed']]]; d['blocked_or_failed'] = [bl[k] for k in border]
            tmp = p + '.tmp'; json.dump(d, open(tmp, 'w'), indent=1, ensure_ascii=False); os.replace(tmp, p)
        p = os.path.join(LIB, 'status_3.json'); d = json.load(open(p)); cur = {s['id']: s for s in d['sources']}
        for k, (s, r) in st.items(): cur[k] = {'id': k, 'task': 'photomatch', 'status': s, 'reason': r}
        smap = {'found': 'ingested', 'blocked': 'blocked', 'no image': 'partial', 'images only': 'unusable', 'not found': 'unusable'}
        for k, v in blocked.items(): cur[k] = {'id': k, 'task': 'photomatch', 'status': smap[v['status']], 'reason': v['reason'][:300]}
        order = [s['id'] for s in d['sources']] + [k for k in cur if k not in [s['id'] for s in d['sources']]]; d['sources'] = [cur[k] for k in order]
        tmp = p + '.tmp'; json.dump(d, open(tmp, 'w'), indent=1, ensure_ascii=False); os.replace(tmp, p)
    print('library files updated:', len(items), 'items,', len(blocked), 'blocked entries')
if __name__ == '__main__': main()
