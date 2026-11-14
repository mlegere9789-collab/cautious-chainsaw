"""Citation builders for the fence-3 close-out. Every builder re-matches the quote in the local text and raises if it is not found
(exactly once, unless `nth` is given), so a citation can only be written if the quote is really there."""
import os, re, sys, json, hashlib
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import lib, corpus
from or27_lib import norm_query

ROOT = lib.ROOT
OR_IDX = {r['id']: r for r in json.load(open(ROOT + '/docs/battle-theatre/library/or27_index.json'))['records']}
_sha = {}


def sha(path):
    if path not in _sha:
        _sha[path] = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    return _sha[path]


_C = None


def C():
    global _C
    if _C is None:
        _C = corpus.Corpus()
    return _C


OR_TITLE = 'Official Records of the War of the Rebellion, Ser. I, vol. 27, part %d (Cornell scan, archive.org item %s)'
OR_ITEM = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}


def OR(part, quote, rec=None, page=None, nth=None, note=None):
    hits = lib.or_verify(quote, (part,))
    if rec:
        hits = [h for h in hits if h['record'] == rec]
    if nth is not None:
        hits = [hits[nth]]
    if len(hits) != 1:
        raise SystemExit('OR quote not unique/found (%d hits): %r' % (len(hits), quote))
    h = hits[0]
    r = OR_IDX.get(h['record']) or {}
    path = lib.raw_or(part) and ROOT + '/tmp/library/or27/%s_djvu.txt' % OR_ITEM[part]
    pg = page or h['page']
    interp = str(h['page']).startswith('~')
    return {'source_id': 'OR-27-%d' % part, 'source': OR_TITLE % (part, OR_ITEM[part]), 'part': part, 'report_id': h['record'],
            'author': ((r.get('rank') or '') + ' ' + (r.get('author') or '')).strip(), 'unit': r.get('unit_scope'),
            'printed_page': pg, 'page_basis': ('interpolated, page model range ' + str(h['page'])) if interp and not page else ('running head' if not page else 'set by hand from the running head in the raw text'),
            'quote': quote, 'offset_start': h['start'], 'offset_end': h['end'], 'offset_basis': 'character offset in the raw djvu text (utf-8, newline untouched)',
            'local_path': os.path.relpath(path, ROOT), 'text_sha256': sha(path), 'matched': 'exact after whitespace normalisation (tools/bt/or27_find.py verify, run 2026-11-13)', 'note': note}


SV_TITLE = {
    'NY3': ('NY-GB-1902-v3', 'New York at Gettysburg (1902) vol. 3', 'cu31924052145475'),
    'NY2': ('NY-GB-1900-v2', 'New York at Gettysburg (1900) vol. 2', 'finalreportonba00chatgoog'),
    'NY1': ('NY-GB-1900', 'New York at Gettysburg (1900) vol. 1', 'newyorkatgettysb0001unse'),
    'PA1': ('PA-GB-1904', 'Pennsylvania at Gettysburg (1904) vol. 1', 'pennsylvaniaatge02lcpenn'),
    'PA1B': ('PA-GB-1914a', 'Pennsylvania at Gettysburg (1914) vol. 1', 'pennsylvaniaatge04penn'),
    'PA2': ('PA-GB-1914-v2', 'Pennsylvania at Gettysburg (1914) vol. 2', 'pennsgettysburg02reynrich'),
    'ME': ('ME-GB-1898', 'Maine at Gettysburg (1898)', 'maineatgettysbu01commgoog'),
    'MI': ('MI-GB-1889', 'Michigan at Gettysburg (1889)', 'cu31924030924736'),
    'FOX': ('FOX-1889', 'Fox, Regimental Losses in the American Civil War (1889)', 'reglossescivilwar00foxwrich'),
    'BL3': ('BL-3', 'Battles and Leaders of the Civil War vol. 3', 'battlesleadersof03cent'),
}


def SV(vol, quote, page=None, nth=None, note=None, section=None):
    V = lib.sv_vol(vol)
    q0 = lib.SF.fold(norm_query(quote))
    J = lambda m: m.group(1) + m.group(2)
    H = lambda m: m.group(1) + '-' + m.group(2)
    cands = [q0, re.sub(r'(\w)- (\w)', J, q0), re.sub(r'(\w)-(\w)', J, q0), re.sub(r'(\w)- (\w)', H, q0)]
    pos = []
    q = q0
    for cq in cands:
        p = V.ntext.find(cq)
        if p >= 0:
            q = cq
            break
    p = V.ntext.find(q) if q in V.ntext else -1
    while p >= 0:
        pos.append(p)
        p = V.ntext.find(q, p + 1)
    if nth is not None:
        pos = [pos[nth]]
    if len(pos) != 1:
        raise SystemExit('SV quote not unique/found (%d): %s %r' % (len(pos), vol, quote))
    p = pos[0]
    o0 = V.orig(p)
    o1 = V.orig(p + len(q) - 1) + 1
    sec, pg, interp, cite = V.cite(o0)
    sid, title, item = SV_TITLE[vol]
    path = ROOT + '/tmp/library/misc/%s_djvu.txt' % item
    real = os.path.realpath(path)
    return {'source_id': sid, 'source': title + ' (archive.org item %s)' % item, 'volume_key': vol, 'section_id': sec['id'] if sec else None,
            'section_title': (sec['title_ocr'].split(' | ')[0] if sec else None), 'printed_page': str(page or pg),
            'page_basis': ('set by hand' if page else ('interpolated by the page model' if interp else 'running head')),
            'quote': quote, 'offset_start': o0, 'offset_end': o1, 'offset_basis': 'character offset in the raw djvu text (utf-8, newline untouched)',
            'local_path': os.path.relpath(real, ROOT), 'text_sha256': sha(real), 'matched': 'exact after whitespace normalisation (tools/bt/statevol_find.py logic, run 2026-11-13)', 'note': note}


def LIB(doc, quote, nth=None, page=None, issue=None, note=None, title=None):
    """ws9 texts and NPS texts. doc = id as in the corpus (e.g. 'HOSPSCENES-1864', 'NPS-CLI-ERR')."""
    d = C().docs[doc]
    q = corpus.fold(norm_query(quote))
    pos = []
    p = d.n.find(q)
    while p >= 0:
        pos.append(p)
        p = d.n.find(q, p + 1)
    if nth is not None:
        pos = [pos[nth]]
    if len(pos) != 1:
        raise SystemExit('LIB quote not unique/found (%d): %s %r' % (len(pos), doc, quote))
    p = pos[0]
    o0 = d.raw_off(p)
    o1 = d.raw_off(p + len(q) - 1) + 1
    out = {'source_id': doc, 'source': title or doc, 'printed_page': page, 'quote': quote, 'offset_start': o0, 'offset_end': o1,
           'offset_basis': 'character offset in the raw text file (utf-8, newline untouched)', 'local_path': os.path.relpath(d.path, ROOT), 'text_sha256': sha(d.path),
           'matched': 'exact after whitespace normalisation (run 2026-11-13)', 'note': note}
    if d.kind == 'nps':
        out['pdf_page'] = d.pdf_page(o0)
        out['page_basis'] = 'pdf_page = page index of the file as served (=== PAGE n === marker); printed page given only if stated'
    else:
        out['page_basis'] = 'printed page not recoverable from the OCR text' if page is None else 'set by hand'
    if issue:
        out['issue'] = issue
    return out


def WEB(path, quote, url, fetched, title, nth=None, note=None, source_id=None, page=None):
    """A page fetched from a reachable host and saved as text under tmp/fence-3/web (derived text; offsets refer to that file)."""
    full = path if path.startswith('/') else ROOT + '/' + path
    raw = open(full, encoding='utf-8', newline='').read()
    from or27_lib import build_nview
    n, m = build_nview(raw)
    n = corpus.fold(n)
    q = corpus.fold(norm_query(quote))
    pos = []
    p = n.find(q)
    while p >= 0:
        pos.append(p)
        p = n.find(q, p + 1)
    if nth is not None:
        pos = [pos[nth]]
    if len(pos) != 1:
        raise SystemExit('WEB quote not unique/found (%d): %s %r' % (len(pos), path, quote))
    p = pos[0]
    o0 = m[p]
    o1 = m[p + len(q) - 1] + 1
    return {'source_id': source_id or os.path.basename(full).rsplit('.', 1)[0], 'source': title, 'url': url, 'fetched': fetched, 'printed_page': page, 'quote': quote,
            'offset_start': o0, 'offset_end': o1, 'offset_basis': 'character offset in the text file derived from the saved HTML (utf-8)', 'local_path': os.path.relpath(full, ROOT),
            'text_sha256': sha(full), 'page_basis': 'web page, no pagination', 'matched': 'exact after whitespace normalisation (run 2026-11-13)', 'note': note}


NPS_TAG = {
    '1njcav': ('tmp/fence-3/web/nps_1njcav.txt', 'https://www.nps.gov/places/1st-nj-cavalry-monument.htm', 'NPS web page: 1st New Jersey Cavalry Monument (last updated 23 Sep 2022)', 'NPS-WEB-1NJCAV'),
    'leister_place': ('tmp/fence-3/web/nps_leister_place.txt', 'https://www.nps.gov/places/lydia-leister-farm.htm', "NPS web page: Lydia Leister Farm: Meade's Headquarters (last updated 10 Apr 2024)", 'NPS-WEB-LEISTER-FARM'),
    'leister3d': ('tmp/fence-3/web/nps_leister3d.txt', 'https://www.nps.gov/gett/learn/photosmultimedia/lydia-leister-house-3d.htm', 'NPS web page: Lydia Leister House 3D Tour (last updated 12 Jan 2021)', 'NPS-WEB-LEISTER-3D'),
    'snm': ('tmp/fence-3/web/nps_snm.txt', 'https://www.nps.gov/places/soldiers-national-monument.htm', "NPS web page: Soldiers' National Monument (last updated 23 Sep 2022)", 'NPS-WEB-SNM'),
    'bldgs': ('tmp/fence-3/web/nps_bldgs.txt', 'https://www.nps.gov/gett/learn/photosmultimedia/buildings-and-farms-then-and-now.htm', 'NPS web page: Buildings and Farms Then and Now (last updated 18 Nov 2022); the PDF source key NPS-Bldgs', 'NPS-WEB-BLDGS'),
    'trostle': ('tmp/fence-3/web/nps_trostle.txt', 'https://www.nps.gov/gett/learn/photosmultimedia/trostle-farm-then-and-now.htm', 'NPS web page: Trostle Farm Then and Now (last updated 17 Jul 2023)', 'NPS-WEB-TROSTLE'),
    'loc_gardner_leister': ('tmp/fence-3/web/loc_2018666296.txt', 'https://www.loc.gov/item/2018666296/', 'Library of Congress item record 2018666296: [Gettysburg, Pa. Headquarters of Gen. George G. Meade on Cemetery Ridge] (Gardner)', 'LOC-2018666296'),
    'loc_meade_stereo': ('tmp/fence-3/web/loc_2011660054.txt', 'https://www.loc.gov/item/2011660054/', "Library of Congress item record 2011660054: General Meade's Headquarters at Gettysburg (War Photograph & Exhibition Co. stereograph)", 'LOC-2011660054'),
    'star_1119_p1': ('tmp/fence-3/web/chronam/star_1863-11-19_sp1.derived.txt', 'https://www.loc.gov/resource/sn83045462/1863-11-19/ed-1/?sp=1&st=text', 'Evening Star (Washington, D.C.), 19 Nov 1863, page 1 (Library of Congress, Chronicling America; OCR text of the page as served by the Library of Congress)', 'LOC-STAR-1863-11-19-P1'),
    'star_1119_p2': ('tmp/fence-3/web/chronam/star_1863-11-19_sp2.derived.txt', 'https://www.loc.gov/resource/sn83045462/1863-11-19/ed-1/?sp=2&st=text', 'Evening Star (Washington, D.C.), 19 Nov 1863, page 2 (Library of Congress, Chronicling America; OCR text of the page as served by the Library of Congress)', 'LOC-STAR-1863-11-19-P2'),
    'star_1120_p2': ('tmp/fence-3/web/chronam/star_1863-11-20_sp2.derived.txt', 'https://www.loc.gov/resource/sn83045462/1863-11-20/ed-1/?sp=2&st=text', 'Evening Star (Washington, D.C.), 20 Nov 1863, page 2 (Library of Congress, Chronicling America; OCR text of the page as served by the Library of Congress)', 'LOC-STAR-1863-11-20-P2'),
    'tribune_1120_p1': ('tmp/fence-3/web/chronam/tribune_1863-11-20_sp1.derived.txt', 'https://www.loc.gov/resource/sn83030213/1863-11-20/ed-1/?sp=1&st=text', 'New-York Daily Tribune, 20 Nov 1863, page 1 (Library of Congress, Chronicling America; OCR text of the page as served by the Library of Congress)', 'LOC-NYTRIB-1863-11-20-P1'),
    'tribune_1121_p2': ('tmp/fence-3/web/chronam/tribune_1863-11-21_sp2.derived.txt', 'https://www.loc.gov/resource/sn83030213/1863-11-21/ed-1/?sp=2&st=text', 'New-York Daily Tribune, 21 Nov 1863, page 2 (Library of Congress, Chronicling America; OCR text of the page as served by the Library of Congress; letters of a special correspondent dated 17 and 19 Nov)', 'LOC-NYTRIB-1863-11-21-P2'),
    'overview': ('tmp/fence-3/web/nps_overview.txt', 'https://www.nps.gov/gett/learn/historyculture/gettysburg-overview.htm', 'NPS web page: Gettysburg Overview (Gettysburg NMP)', 'NPS-WEB-OVERVIEW'),
    'snc_article': ('tmp/fence-3/web/nps_snc_article.txt', 'https://www.nps.gov/articles/000/soldiers-national-cemetery.htm', "NPS web article: History of the Soldiers' National Cemetery", 'NPS-WEB-SNC-ARTICLE'),
    'wills': ('tmp/fence-3/web/nps_wills.txt', 'https://www.nps.gov/places/david-wills-house.htm', 'NPS web page: David Wills House', 'NPS-WEB-WILLS'),
    'ecf_tour': ('tmp/fence-3/web/nps_ecf_tour.txt', 'https://www.nps.gov/gett/learn/photosmultimedia/east-cavalry-battlfield-virtual-tour.htm', 'NPS web page: East Cavalry Battlefield Virtual Tour', 'NPS-WEB-ECF-TOUR'),
}


def NPSW(tag, quote, **kw):
    p, u, t, sid = NPS_TAG[tag]
    return WEB(p, quote, u, '2026-11-13', t, source_id=sid, **kw)
