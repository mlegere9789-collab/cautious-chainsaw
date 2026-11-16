"""Build tmp/tl-04/audit/viewed_leaves.json (leaves whose printed page was read on the page image) from
  - tools2/ocr2_heads.json (second OCR, tesseract, of the page image: the page number printed in the first lines equals the leaf-map page) and
  - audit/manual_views.json (leaves the engineer looked at on a rendered page image: {"part:leaf": {"page": N, "note": "..."}}).
    python3 -I tmp/tl-04/tools2/mk_viewed.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(HERE, '..', 'audit')
out = {}
heads = json.load(open(os.path.join(HERE, 'ocr2_heads.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'ocr2_heads.json')) else {}
for k, v in heads.items():
    if v.get('agree') is True:
        out[k] = dict(page=v['page_leaf_map'], by='second OCR (tesseract) of the page image')
mp = os.path.join(AUD, 'manual_views.json')
manual = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
for k, v in manual.items():
    out[k] = dict(page=v['page'], by='looked at on the rendered page image' if k not in out else 'second OCR (tesseract) of the page image and looked at on the rendered page image')
json.dump(dict(_doc='leaves whose printed page was read on the page image; see tools2/mk_viewed.py', leaves=out), open(os.path.join(AUD, 'viewed_leaves.json'), 'w', encoding='utf-8'), indent=0, sort_keys=True)
print('viewed leaves:', len(out), '(second OCR %d, manual %d)' % (sum(1 for v in out.values() if 'second OCR' in v['by']), len(manual)))
