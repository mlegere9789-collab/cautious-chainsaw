"""List OR27 citations whose printed page (scan leaf map) differs from the running-head model; and how many were read on the image.
    python3 -I tmp/tl-02/audit/pagediff.py"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
T2 = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, T2)
import tl2lib as T
import build2
build2.load_rows()
cites, errs, nq = build2.check(None)
print('problems', len(errs))
n = ndiff = nimg = 0
c_img = collections.Counter()
for rid, cs in cites.items():
    for k, c in cs.items():
        if c['source_id'] != 'OR27':
            continue
        n += 1
        sc = c.get('scan') or {}
        if sc.get('printed_page_read_on_image'):
            nimg += 1
        if c.get('page_running_head_model'):
            ndiff += 1
            print('%s %-10s now p.%-8s model p.%-10s leaf %s img=%s | %s' % (rid, k, c['printed_page'], c['page_running_head_model'], sc.get('leaf'), sc.get('printed_page_read_on_image'), c['quote'][:50]))
print('OR27 citations', n, 'differing from the model', ndiff, 'read on the page image', nimg)
