#!/usr/bin/env python3
"""Assemble GOVERNANCE/horde/ws-web/lookups-retry.jsonl: one line per recorded failed or blocked lookup (the rows of retry/lookups-inventory.jsonl),
with what was asked, every retry attempt (URL, HTTP result, what the page says, sha256 of the saved file and of its text), the outcome and the reason.

Inputs (all kept in this task's folder, nothing is read from the network here):
  retry/lookups-inventory.jsonl           rebuilt 2026-11-16 by scripts/build_inventory.py (303 rows: lookups.jsonl and web_lookups of the shards, timeline_verified failed_lookup rows, blocked_host entries)
  retry/fetches.jsonl                     every URL request (F-001..F-021, F-030..F-059, F-101..F-162 of 2026-11-13; F-200.. of 2026-11-16)
  retry/ca_log.jsonl, fts_log.jsonl       the 2026-11-13 Chronicling America and archive.org full-text queries (older numbering, mapped by hand below)
  retry/r2/ca_results.jsonl               the Chronicling America battery of 2026-11-16 (C01..C24)
  retry/r2/fts_attempts.jsonl             the archive.org full-text battery of 2026-11-16 (A01.., B01..)
  retry/r2/local_rescan_results.json      the local re-run of the shards' own "no hit" questions over the current local corpus (when it has run)
  GOVERNANCE/evidence_corrections/web-lookups.jsonl and timeline_corrections/web-lookups.jsonl     the evidence lines (matched by lookup_refs)
Output: ../../lookups-retry.jsonl (rewritten completely on every run) and r2/lookups-retry-summary.json (counts).
Run:  python3 -I assemble.py
"""
import collections, json, os, re, sys
from urllib.parse import urlparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'scripts'))
sys.path.insert(0, HERE)
import rlib

RETRY = rlib.RETRY
OUT = os.path.join(rlib.GOV, 'horde', 'ws-web', 'lookups-retry.jsonl')
SUMMARY = os.path.join(HERE, 'lookups-retry-summary.json')
TODAY = '2026-11-16'

inv = rlib.read_jsonl(os.path.join(RETRY, 'lookups-inventory.jsonl'))
FETCH = {r['fid']: r for r in rlib.read_jsonl(os.path.join(RETRY, 'fetches.jsonl'))}
CA = {r['id']: r for r in rlib.read_jsonl(os.path.join(HERE, 'ca_results.jsonl'))}
FTS = {}
for r in rlib.read_jsonl(os.path.join(HERE, 'fts_attempts.jsonl')):
    FTS[r['id']] = r
FTS_OLD = rlib.read_jsonl(os.path.join(RETRY, 'fts_log.jsonl'))
CA_OLD = rlib.read_jsonl(os.path.join(RETRY, 'ca_log.jsonl'))
LOCAL = {}
for _fn in ('local_rescan_small.json', 'local_rescan_results.json'):
    _p = os.path.join(HERE, _fn)
    if os.path.exists(_p):
        _d = json.load(open(_p))
        for _k, _v in _d.items():
            if not _k.startswith('_'):
                _v['_run_at'] = _d['_meta']['run_at']
                LOCAL[_k] = _v
EVID = []
for p in ('evidence_corrections', 'timeline_corrections'):
    EVID += rlib.read_jsonl(os.path.join(rlib.GOV, p, 'web-lookups.jsonl'))
EV_BY_LK = collections.defaultdict(list)
for e in EVID:
    for lk in e.get('lookup_refs', []):
        EV_BY_LK[lk].append(e)

DNR_HOSTS = {'babel.hathitrust.org', 'catalog.hathitrust.org', 'ehistory.osu.edu'}
REACH = {'archive.org', 'www.loc.gov', 'tile.loc.gov', 'cdn.loc.gov', 'chroniclingamerica.loc.gov', 'www.nps.gov', 'www.npshistory.com', 'npshistory.com', 'www.gutenberg.org',
         'gutenberg.org', 'catalog.archives.gov', 'gettysburginteractivemap.com', 'api.mapbox.com'}
HOSTRE = re.compile(r'\b((?:[a-z0-9-]+\.)+(?:com|org|gov|edu|net|us|mil))\b', re.I)
FOLD = {'historynet.com': 'www.historynet.com', 'gettysburgdaily.com': 'www.gettysburgdaily.com', 'hmdb.org': 'www.hmdb.org', 'battlefields.org': 'www.battlefields.org',
        'wikipedia.org': 'en.wikipedia.org', 'crossroadsofwar.org': 'www.crossroadsofwar.org', 'strategypage.com': 'www.strategypage.com', 'civilwarnews.com': 'www.civilwarnews.com',
        'davidrumsey.com': 'davidrumsey.com', 'loc.gov': 'www.loc.gov', 'nps.gov': 'www.nps.gov', 'npshistory.com': 'www.npshistory.com'}

# --------------------------------------------------------------------------------------------- hand-made links of the 2026-11-13 attempts to rows
OLD_F = {
    'F-001': ['LKR-fence-3-L20'], 'F-002': ['LKR-tl-02-L3'], 'F-003': ['LKR-tl-01-L5', 'LKR-tl-01-L12'], 'F-004': ['LKR-sources-a-loc_99448794'], 'F-005': ['LKR-sources-a-loc_2004629149'],
    'F-006': ['LKR-sources-b-R21.PG.LOC-2004629149'], 'F-007': ['LKR-sources-b-R21.PG.LOC-99446453'], 'F-008': ['LKR-sources-b-R12.033.1', 'LKR-BH-fence-1-R14.S-003#bh1'],
    'F-009': ['LKR-sources-b-R12.033.2'], 'F-010': ['LKR-sources-b-R21.PG.LOC-CHRONAM'], 'F-011': ['LKR-terrain-1-W2'], 'F-012': ['LKR-sources-b-L1', 'LKR-terrain-2-L3'],
    'F-013': ['LKR-sources-b-L2', 'LKR-terrain-2-L4'], 'F-014': ['LKR-terrain-1-W3'], 'F-015': ['LKR-r03-2-W3', 'LKR-r03-2-W1', 'LKR-tl-12-W1', 'LKR-tl-12-W4', 'LKR-T3-217'],
    'F-016': ['LKR-sources-b-R12.029.1'],
    'F-017': ['LKR-sources-b-R21.PG.GUTENBERG-SEARCH-FREMANTLE', 'LKR-sources-b-R21.PG.GUTENBERG-SEARCH-HASKELL', 'LKR-sources-b-R21.PG.GUTENBERG-SEARCH-PIERCE'],
    'F-018': ['LKR-sources-a-not_requested-0', 'LKR-sources-b-R21.PG.NARA-102279222', 'LKR-fence-3-L56', 'LKR-BH-fence-3-R14.S-063#bh1'],
    'F-019': ['LKR-ws-town-L26', 'LKR-ws-town-L28', 'LKR-terrain-1-W2'],
    'F-034': ['LKR-BH-fence-1-R14.E-14#bh0', 'LKR-BH-fence-1-R14.E-15#bh0', 'LKR-BH-fence-1-R14.E-17#bh0', 'LKR-BH-terrain-1-R13.G-06#bh0', 'LKR-BH-terrain-2-R13.P-01#bh0'],
    'F-035': ['LKR-BH-fence-1-R14.E-14#bh0', 'LKR-BH-fence-1-R14.E-15#bh0', 'LKR-BH-fence-1-R14.E-17#bh0', 'LKR-BH-terrain-1-R13.G-06#bh0', 'LKR-BH-terrain-2-R13.P-01#bh0'],
    'F-050': ['LKR-T2-220', 'LKR-r03-2-W2', 'LKR-BH-fence-1-R14.S-016#bh0', 'LKR-BH-fence-1-R14.S-016#bh1'], 'F-051': ['LKR-T2-220', 'LKR-BH-fence-1-R14.S-016#bh1'],
    'F-052': ['LKR-fence-2-L54', 'LKR-BH-fence-2-R14.S-051#bh0'], 'F-053': ['LKR-tl-12-W1', 'LKR-tl-12-W4', 'LKR-T3-217', 'LKR-r03-2-W1'],
    'F-054': ['LKR-BH-fence-3-R14.S-083#bh1', 'LKR-BH-fence-3-R14.S-084#bh0'], 'F-057': ['LKR-T2-220', 'LKR-fence-2-L52'], 'F-058': ['LKR-T2-220', 'LKR-fence-2-L52'], 'F-059': ['LKR-T2-220'],
    'F-139': ['LKR-T2-220', 'LKR-BH-fence-1-R14.S-016#bh1'], 'F-140': ['LKR-fence-1-L98', 'LKR-fence-2-L98'], 'F-141': ['LKR-fence-1-L98', 'LKR-fence-2-L98'],
    'F-150': ['LKR-tl-02-L3', 'LKR-tl-01-L5', 'LKR-tl-02-L5', 'LKR-tl-02-L6'], 'F-160': ['LKR-r03-2-W1', 'LKR-tl-12-W1'], 'F-161': ['LKR-tl-12-W5', 'LKR-T3-137'], 'F-162': ['LKR-T3-217'],
}
# 2026-11-13 queries logged under the early running numbers (LKR-0036, 0046, 0051, 0052, 0057 of the first inventory): by topic
OLD_FTS_ROWS = {'jacobs': ['LKR-T2-053', 'LKR-T2-068', 'LKR-T2-073', 'LKR-T2-113', 'LKR-T3-048', 'LKR-T3-072', 'LKR-T3-095', 'LKR-tl-01-L7', 'LKR-tl-01-L8'],
                'jerome': ['LKR-T1-092', 'LKR-tl-02-L7']}
OLD_CA_ROWS = {'Sandoe': ['LKR-T1-013', 'LKR-tl-01-L1'], 'Gettysburg Wade killed bullet baking': ['LKR-fence-2-L54']}


EXTRA_F = {'F-320': ['LKR-fence-2-L123'], 'F-321': ['LKR-fence-2-L123'], 'F-318': ['LKR-fence-2-L87'], 'F-350': ['LKR-fence-2-L87'], 'F-161': ['LKR-BH-fence-3-R14.S-066#bh1'], 'F-317': [], 'F-309': []}


def _img(p):
    return {'file': p, 'sha256': rlib.sha_file(rlib.abspath(p))}


MANUAL = {
    'LKR-terrain-2-L2': [{'attempt': 'LT-or27-selftest', 'kind': 'local_tool_run', 'at': '2026-11-16T01:30:00Z', 'command': 'python3 -I tools/bt/or27_find.py --self-test',
                          'says': 'ends "SELF-TEST OK" (exit 0, 0.9 s); the three Official Records volume texts are in tmp/library/or27', 'text_file': 'tmp/library/or27/cu31924077699761_djvu.txt',
                          'text_sha256': rlib.sha_file(rlib.abspath('tmp/library/or27/cu31924077699761_djvu.txt'))}],
    'LKR-fence-3-L8': [{'attempt': 'LT-brien-images', 'kind': 'local_page_image_reading', 'at': '2026-11-16T01:25:00Z', 'tool': 'pdftoppm (now installed) at 130 and 150 dpi, viewed; tesseract at 300 dpi',
                        'pdf': 'tmp/library/web/nps/NPS-BRIEN-FARM/NPS-BRIEN-FARM.pdf', 'pdf_sha256': '76a1a095b7fae524fe440a0f1c606b02ed0a65b4f810a3756283c0dcdaa40eda', 'pages': [7, 15],
                        'images': [_img('tmp/library/web/retry/F-366/img/p007.png'), _img('tmp/library/web/retry/F-366/img/p015.png')], 'text_file': 'tmp/library/web/retry/F-366/ocr_p7-15.txt',
                        'text_sha256': rlib.sha_file(rlib.abspath('tmp/library/web/retry/F-366/ocr_p7-15.txt')),
                        'says': 'page images read: "194 panels ... worth $174; stone fence destroyed worth $5.00" (printed p. 134) and "received only $15, out of $1,028 requested" (printed p. 5); the PDF text layer misreads them (195, $175)'}],
    'LKR-fence-3-L84': [{'attempt': 'LT-cemstudy-images', 'kind': 'local_page_image_reading', 'at': '2026-11-16T01:20:00Z', 'tool': 'pdftoppm 115 and 300 dpi, viewed; tesseract at 300 dpi (pages 7-11)',
                         'pdf': 'tmp/library/web/retry/F-350/cemetery-enclosures.pdf', 'pdf_sha256': 'a9c293c13a6e82890f883c28e7eebb4208928af8b5ad28cfc86a9e12061c29c2', 'pages': [1, 7, 8, 9, 10, 11],
                         'images': [_img('tmp/library/web/retry/F-350/ocr3/img/p%03d.png' % n) for n in (7, 8, 9, 10, 11)] + [_img('tmp/library/web/retry/F-350/pages/title-001.png')],
                         'text_file': 'tmp/library/web/retry/F-350/ocr3/ocr_p7-11.txt', 'text_sha256': rlib.sha_file(rlib.abspath('tmp/library/web/retry/F-350/ocr3/ocr_p7-11.txt')),
                         'says': 'cover: K R Georg, June 16, 1978; printed p. 8: "The first enclosure to be completed was the division fence between the Evergreen and National Cemeteries" (iron railing of gas pipe, 1726 feet, Wills to Curtin 6 March 1865); p. 6 note 13: Wills, 8 July 1864, "If we can now avoid the expense of the fence between the two cemeteries we should do so"'}],
    'LKR-tl-01-L6': [{'attempt': 'LT-jacobs-verbatim', 'kind': 'local_text_read', 'at': '2026-11-16T01:10:00Z', 'text_file': 'tmp/library/ws9/JACOBS-1864__notesonrebelinva00jaco_djvu.txt',
                      'text_sha256': rlib.sha_file(rlib.abspath('tmp/library/ws9/JACOBS-1864__notesonrebelinva00jaco_djvu.txt')), 'says': 'p. 25: "one of these officers was on the College cupola making observations"; p. 15: the Confederate cavalry at "3J p. m."'},
                     {'attempt': 'LT-jacobs-page-images', 'kind': 'local_page_image_reading', 'at': '2026-11-16T01:44:00Z', 'tool': 'pdftoppm at 150 dpi (full pages) and 500 dpi (line crops), viewed',
                      'pdf': 'tmp/library/web/retry/F-373/notesonrebelinva00jaco.pdf', 'pdf_sha256': rlib.sha_file(rlib.abspath('tmp/library/web/retry/F-373/notesonrebelinva00jaco.pdf')), 'pages': [25, 35, 51],
                      'images': [_img('tmp/library/web/retry/F-373/img/p%03d.png' % n) for n in (25, 35, 51)] + [_img('tmp/library/web/retry/F-373/img/' + n) for n in ('p15_3J.png', 'p25_8J.png', 'p41_2J.png')],
                      'says': 'the page images print the fractions that the OCR text reads as "J": p. 15 "3¼ P. M." (cavalry into Gettysburg, 26 June), p. 25 "8½ A. M." (signal officer on the College cupola, 1 July), p. 41 "2½ P. M."; '
                              'the second-hand reading recorded in the row ("advance guard in Gettysburg 3.30 p.m.") is not what the page prints'}],
    'LKR-r03-1-L2': [{'attempt': 'LT-bl3-law', 'kind': 'local_text_read', 'at': '2026-11-16T01:22:00Z', 'text_file': 'tmp/library/misc/battlesleadersof03cent_djvu.txt',
                      'text_sha256': rlib.sha_file(rlib.abspath('tmp/library/misc/battlesleadersof03cent_djvu.txt')), 'says': 'Law, "The Struggle for Round Top", Battles and Leaders vol. III pp. 318 ff.: every "minutes" in the article\'s pages read; no ten- or fifteen-minute interval about Vincent'}],
}
MANUAL['LKR-tl-02-L5'] = MANUAL['LKR-tl-02-L6'] = MANUAL['LKR-tl-01-L6']
MANUAL['LKR-fence-2-L87'] = MANUAL['LKR-fence-3-L84']
MANUAL['LKR-r03-1-L4'] = MANUAL['LKR-r03-1-L2']

EXTRA = {'C07': ['LKR-BH-fence-3-R14.S-066#bh1'], 'A08': ['LKR-BH-fence-3-R14.S-066#bh1'], 'B06': ['LKR-BH-fence-3-R14.S-066#bh1'], 'B27': ['LKR-BH-fence-3-R14.S-066#bh1', 'LKR-T3-137'],
         'C08': ['LKR-fence-2-L7', 'LKR-fence-2-L9', 'LKR-fence-2-L125'], 'C04': ['LKR-fence-2-L122'], 'A04': ['LKR-fence-2-L122'], 'B16': ['LKR-fence-2-L122']}


def norm_host(h):
    h = h.lower()
    return FOLD.get(h, h)


def host_of(u):
    try:
        return norm_host(urlparse(u).netloc)
    except Exception:
        return ''


ALIAS = [(r'Wikipedia', 'en.wikipedia.org'), (r'HistoryNet', 'www.historynet.com'), (r'Stone Sentinels|stonesentinels', 'gettysburg.stonesentinels.com'), (r'Gettysburg Daily', 'www.gettysburgdaily.com'),
         (r'Emerging Civil War|\bECW\b', 'emergingcivilwar.com'), (r'\bHMDB\b|Historical Marker Database', 'www.hmdb.org'), (r'Crossroads of War', 'www.crossroadsofwar.org'),
         (r'Civil War News|\bCWN\b', 'www.civilwarnews.com'), (r'CivilWarTalk|Civil War Talk', 'civilwartalk.com'), (r'StrategyPage|Strategypage', 'www.strategypage.com'),
         (r'American Battlefield Trust|\bABT\b', 'www.battlefields.org'), (r'Aleteia', 'aleteia.org'), (r'NY State Military Museum|\bDMNA\b', 'museum.dmna.ny.gov'),
         (r'Civil War in the East', 'civilwarintheeast.com'), (r'Eyewitness to History', 'www.eyewitnesstohistory.com'), (r'Gettysburg Foundation', 'gettysburgfoundation.org'),
         (r'Library of Congress blog', 'blogs.loc.gov'), (r'Savas Beatie', 'www.savasbeatie.com'), (r'Warfare History Network|WHN-', 'warfarehistorynetwork.com'), (r'Iron Brigader|Iron-\d', 'ironbrigader.com')]


def row_hosts(r):
    hs = set()
    txt0 = ' '.join([r['asked'] or '', r.get('orig_result') or ''])
    for pat, h in ALIAS:
        if re.search(pat, txt0):
            hs.add(h)
    for u in r['urls']:
        h = host_of(u)
        if h:
            hs.add(h)
    for h in HOSTRE.findall(' '.join([r['asked'] or '', r.get('orig_result') or ''])):
        hs.add(norm_host(h))
    return hs


# --------------------------------------------------------------------------------------------- attempt records
def says_of_fetch(f):
    if f.get('http') == 200:
        t = f.get('title') or f.get('item_title')
        s = (t + ': ' if t else '') + (f.get('page_start') or '')[:200]
        return s.strip()
    if f.get('error'):
        return f['error'][:200] + (' (final URL after redirects: %s)' % f['final_url'] if f.get('final_url') and f['final_url'] != f.get('asked_url') else '')
    return 'HTTP %s' % f.get('http')


def fetch_attempt(f):
    a = {'attempt': f['fid'], 'kind': 'url_request', 'at': f.get('at'), 'url': f['asked_url'], 'http': f.get('http'), 'curl_exit': f.get('curl_exit'), 'final_url': f.get('final_url'),
         'redirects': f.get('redirects'), 'bytes': f.get('bytes'), 'content_type': f.get('content_type'), 'says': says_of_fetch(f), 'purpose': f.get('purpose')}
    if f.get('error'):
        a['error'] = f['error'][:200]
    if f.get('file'):
        a['saved_file'] = f['file']
        a['file_sha256'] = f.get('sha256')
    if f.get('text_file'):
        a['text_file'] = f['text_file']
        a['text_sha256'] = f.get('text_sha256')
    elif f.get('file') and f.get('sha256'):
        a['text_file'] = f['file']
        a['text_sha256'] = f['sha256']
    if f.get('bot_challenge'):
        a['bot_challenge_page'] = True
    if f.get('alt'):
        a['alt_requests'] = [{'url': x['asked_url'], 'http': x.get('http'), 'via': x.get('via'), 'saved_file': x.get('file'), 'file_sha256': x.get('sha256'), 'item_title': x.get('item_title'),
                              'item_date': x.get('item_date')} for x in f['alt']]
    return a


def ca_attempt(c):
    s = c['search']
    return {'attempt': c['id'], 'kind': 'chronicling_america_search_and_ocr_read', 'at': s.get('at'), 'query': c['q'], 'dates': c['dates'], 'url': s.get('url'), 'http': s.get('http'),
            'results_in_index': s.get('of'), 'pages_read': c.get('pages_read'), 'pages_with_the_term': c.get('pages_with_show'), 'pages_with_term_near_context': c.get('pages_with_prox'),
            'search_response_file': s.get('file'), 'search_response_sha256': s.get('sha256'), 'says': c.get('outcome'),
            'pages': [{'page_id': p['page_id'], 'text_file': p.get('text_file'), 'text_sha256': p.get('text_sha256')} for p in c.get('pages', []) if p.get('text_file')][:25]}


def fts_attempt(f):
    pd = [h for h in f['hits'] if h['year'] and int(h['year']) <= 1930]
    return {'attempt': f['id'], 'kind': 'archive_org_fulltext_search', 'at': f['at'], 'query': f['q'], 'http': f['http'], 'total_hits': f['total_hits'], 'hits_listed': len(f['hits']),
            'hits_dated_1930_or_earlier': [{'identifier': h['identifier'], 'year': h['year'], 'title': h['title']} for h in pd][:6], 'response_file': f.get('response_file'),
            'response_sha256': f.get('response_sha256'), 'says': '%s hits in the index; %d of the first %d listed are dated 1930 or earlier (snippets of the index are leads, never evidence)' % (f['total_hits'], len(pd), len(f['hits']))}


def evid_short(e):
    return {'xid': e['xid'], 'id': e['id'], 'tier': e['tier'], 'support': e.get('support'), 'sub_claim': e['sub_claim'][:240], 'quote': e['citation'].get('quote', '')[:200],
            'source_id': e['citation'].get('source_id'), 'text_sha256': e['citation'].get('text_sha256')}


def build():
    # attempts per row
    att = collections.defaultdict(list)
    seen = collections.defaultdict(set)

    def add(lk, a):
        if a['attempt'] not in seen[lk]:
            seen[lk].add(a['attempt'])
            att[lk].append(a)

    for fid, f in FETCH.items():
        n = int(fid.split('-')[1])
        a = fetch_attempt(f)
        for lk in f.get('lk') or []:
            add(lk, a)
        for lk in OLD_F.get(fid, []) + EXTRA_F.get(fid, []):
            add(lk, a)
    # host probes of 2026-11-13 (F-101..F-139, no row list): by host
    probes = [f for fid, f in FETCH.items() if 101 <= int(fid.split('-')[1]) <= 139 or 203 <= int(fid.split('-')[1]) <= 241 or int(fid.split('-')[1]) in (370, 371)]
    for r in inv:
        hs = row_hosts(r)
        for f in probes:
            if host_of(f['asked_url']) in hs:
                add(r['lk_id'], fetch_attempt(f))
    for cid, c in CA.items():
        for lk in c.get('lk', []) + EXTRA.get(cid, []):
            add(lk, ca_attempt(c))
    for fid, f in FTS.items():
        for lk in f.get('lk', []) + EXTRA.get(fid, []):
            add(lk, fts_attempt(f))
    for f in FTS_OLD:
        t = f['query']
        key = 'jacobs' if 'Jacobs' in t or 'Smithsonian meteorological' in t else ('jerome' if 'Jerome' in t else None)
        if key:
            a = {'attempt': 'FTS-2026-11-13-' + rlib.sha_bytes(t.encode())[:8], 'kind': 'archive_org_fulltext_search', 'at': f['at'], 'query': t, 'http': f['http'], 'total_hits': f.get('total_hits'),
                 'response_file': f.get('response_file'), 'response_sha256': f.get('response_sha256'), 'says': '%s hits in the index (query of 2026-11-13)' % f.get('total_hits')}
            for lk in OLD_FTS_ROWS[key]:
                add(lk, a)
    for c in CA_OLD:
        for k, rows in OLD_CA_ROWS.items():
            if c['q'].startswith(k):
                a = {'attempt': 'CA-2026-11-13-' + rlib.sha_bytes((c['q'] + c['dates']).encode())[:8], 'kind': 'chronicling_america_search', 'at': c['at'], 'query': c['q'], 'dates': c['dates'], 'url': c['url'],
                     'http': c['http'], 'results_in_index': c.get('of'), 'search_response_sha256': c.get('response_sha256'), 'says': '%s results in the index (query of 2026-11-13)' % c.get('of')}
                for lk in rows:
                    add(lk, a)
    for lk, v in LOCAL.items():
        add(lk, {'attempt': 'LR-' + lk, 'kind': 'local_rescan', 'at': v['_run_at'], 'asked': v['asked'], 'regex': v['regex'], 'files_scanned': v['files_scanned'], 'files_with_match': v['files_with_match'],
                 'matches': v['matches'], 'first_contexts': v['first_contexts'][:2], 'says': '%d of %d local files match (%d matches) for the shard\'s own question, re-run over the current local corpus' % (v['files_with_match'], v['files_scanned'], v['matches'])})
    for lk, lst in MANUAL.items():
        for a in lst:
            add(lk, a)
    return att


if __name__ == '__main__':
    import decide
    import local_rescan
    decide.PENDING_LOCAL = {s[0] for s in local_rescan.SPECS if s[0] not in LOCAL}
    print('local re-run questions without a result yet:', len(decide.PENDING_LOCAL))
    att = build()
    decide.run(inv, att, EV_BY_LK, OUT, SUMMARY, TODAY, row_hosts, host_of, DNR_HOSTS, REACH, evid_short)
