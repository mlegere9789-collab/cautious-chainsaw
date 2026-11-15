"""Printed pages for the book citations that have no usable running head in the flat OCR text (wave 5, 2026-11-15).
Reads the built evidence_corrections/fence-1.jsonl (or FENCE1_OUT), and for every citation of a book without a printed page looks the quote up in the
archive.org page-by-page OCR (tmp/fence-1/dl/xml/<id>_djvu.xml, downloaded from https://archive.org/cors/<id>/<id>_djvu.xml; see page_from_xml.py for the
confirmation rule) and writes horde/fence-1/page_overrides.json: key 'source_id|offset start|offset end' -> printed page, leaf, method.
build_corrections.py applies the overrides to citations that still have no printed page. Run: python3 -I make_page_overrides.py"""
import os, sys, re, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from page_from_xml import PageMap
ROOT = '/home/user/cautious-chainsaw'
SRC = os.environ.get('FENCE1_OUT') or os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-1.jsonl')
XML = os.path.join(ROOT, 'tmp/fence-1/dl/xml')
ACQ = {'ACQ-BIDDLE-1880_djvu.txt': 'firstdaybattleg00biddgoog', 'ACQ-HARD-1868_djvu.txt': 'historyofeighthc00hard', 'ACQ-USCC-SMITH-1868_djvu.txt': 'incidentsamongsh00smit',
       'K2-pa_banes.txt': 'historyofphilade01bane', 'K2-pa69_mcdermott.txt': 'briefhistoryof00mcde'}
def archive_id(local_path):
    b = os.path.basename(local_path)
    if b in ACQ: return ACQ[b]
    if b.startswith('KIT-'): return b[4:-len('_djvu.txt')]
    if '__' in b: return b.split('__', 1)[1][:-len('_djvu.txt')]
    if b.endswith('_djvu.txt'): return b[:-len('_djvu.txt')]
    return None
rows = [json.loads(l) for l in open(SRC, encoding='utf-8') if l.strip()]
maps = {}; out = {}; stats = {'no page': 0, 'filled': 0, 'no xml': 0, 'unconfirmed': 0}
for r in rows:
    for s in r['sub_claims']:
        for c in s['citations']:
            if c.get('printed_page') not in (None, ''): continue
            if c['source_id'].startswith(('OR-', 'NPS', 'CA:', 'GBG', 'ADAMS')): continue
            stats['no page'] += 1
            aid = archive_id(c['local_path']); xp = os.path.join(XML, (aid or '') + '_djvu.xml')
            if not aid or not os.path.exists(xp) or os.path.getsize(xp) < 100000: stats['no xml'] += 1; continue
            if aid not in maps: maps[aid] = PageMap(xp)
            leaf, page, how = maps[aid].page_of(c['quote'])
            if page is None: stats['unconfirmed'] += 1; continue
            out['%s|%d|%d' % (c['source_id'], c['offset'][0], c['offset'][1])] = dict(printed_page=str(page), archive_item=aid, leaf=leaf + 1, method=how, quote=c['quote'][:80])
            stats['filled'] += 1
json.dump(dict(_doc="Printed pages found in the archive.org page-by-page OCR for citations whose flat OCR text has no running head near the quote. Rebuild with scripts/make_page_overrides.py.", overrides=out), open(os.path.join(HERE, '..', 'page_overrides.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(stats)
