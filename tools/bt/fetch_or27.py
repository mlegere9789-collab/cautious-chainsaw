"""Phase 1 acquire step (PDF D.4.3 stage 2): polite, content-addressed download of the public-domain Official Records Ser I vol 27 text
from archive.org (Cornell scans, 'no known copyright restrictions'). eHistory and HathiTrust were NOT used: eHistory answered 403 to scripted
access on 2026-10-19 and that block is respected, not circumvented. Writes tmp/library/or27/* (gitignored raw store) and
docs/battle-theatre/GOVERNANCE/library/acquired.json (hashes, sizes, licence note)."""
import urllib.request, time, hashlib, os, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
H = {'User-Agent': 'GettysburgInteractiveMap-research/1.0 (educational; polite, 3 s spacing)'}
ITEMS = [('OR-27-1', 'cu31924077699761'), ('OR-27-2', 'cu31924077728255'), ('OR-27-3', 'cu31924077700262')]
d = os.path.join(ROOT, 'tmp', 'library', 'or27'); os.makedirs(d, exist_ok=True)
rec = []
for sid, ident in ITEMS:
    p = os.path.join(d, ident + '_djvu.txt')
    if not os.path.exists(p):
        with urllib.request.urlopen(urllib.request.Request(f'https://archive.org/download/{ident}/{ident}_djvu.txt', headers=H), timeout=180) as f: open(p, 'wb').write(f.read())
        time.sleep(3)
    b = open(p, 'rb').read()
    rec.append({'source_id': sid, 'archive_identifier': ident, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'acquired': '2026-10-19',
                'licence_note': 'Cornell Univ. Library scan; archive.org item states no known US copyright restrictions; US Government publication (1880s)',
                'ocr_quality': 'UNVERIFIED raw djvu text; running heads/page numbers inline; second witness (HathiTrust) not yet diffed',
                'status': 'acquired-raw'})
json.dump({'_doc': 'Acquired raw sources. Raw text lives in tmp/library (not committed).', 'items': rec, 'blocked': [{'source': 'eHistory OR transcription', 'reason': 'HTTP 403 to scripted requests on 2026-10-19; not circumvented'}]},
          open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired.json'), 'w', encoding='utf-8'), indent=1)
print(json.dumps(rec, indent=1))
