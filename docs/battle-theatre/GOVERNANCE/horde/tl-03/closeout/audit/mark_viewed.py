"""Record printed page numbers read on page images: python3 -I tmp/tl-03/audit/mark_viewed.py 1:937=914 2:589=584 ...
Each reading is compared with the printed page of the scan-leaf map (tools/bt/kit_or27_leafmap.py); a mismatch is reported and NOT stored."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_or27_leafmap as KL
VL = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'tl-03', 'closeout', 'audit', 'viewed_leaves.json')
doc = json.load(open(VL)) if os.path.exists(VL) else {
    '_doc': 'Printed page number read on the page image (header of the scanned page) by the engineer of the tl-03 close-out, 2026-11-14. Key "part:leaf" (archive.org leaf number of the item; the PDF page is leaf+1). Pages read from tmp/kit-plan/or27-pdf/<identifier>.pdf rendered with pdftoppm (130 dpi); the header strip (top 150 pixels of a 130 dpi page) was looked at for each leaf, the whole page where a digit of the text was checked.',
    'leaves': {}}
lms = {p: KL.load(p) for p in (1, 2, 3)}
bad = 0
for a in sys.argv[1:]:
    k, v = a.split('=')
    part, leaf = (int(x) for x in k.split(':'))
    rec = dict((l[0], l[2]) for l in lms[part].rec['leaves'])
    mp = rec.get(leaf)
    if mp != int(v):
        print('MISMATCH leaf %s: read %s, leaf map %s' % (k, v, mp)); bad += 1; continue
    doc['leaves'][k] = int(v)
doc['leaves'] = dict(sorted(doc['leaves'].items(), key=lambda kv: tuple(int(x) for x in kv[0].split(':'))))
json.dump(doc, open(VL, 'w'), indent=1)
print('stored', len(doc['leaves']), 'readings;', bad, 'mismatches')
