"""List every citation of the current row files (resolved with TL2_NOPAGES=1, so a library citation without a page decision is accepted)
as a minimal corrections file for audit/libpages_final.py:  TL2_NOPAGES=1 python3 -I tmp/tl-02/audit/mk_tmp_corr.py  ->  tmp/tl-02/audit/tmp_corr.jsonl"""
import os, sys, json
os.environ['TL2_NOPAGES'] = '1'
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import tl2lib as T
import build2
build2.load_rows()
cites, errs, nq = build2.check(None)
if errs:
    print('problems:', errs); sys.exit(1)
with open(os.path.join(HERE, 'tmp_corr.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
    for rid, cs in cites.items():
        f.write(json.dumps(dict(id=rid, citations=list(cs.values())), ensure_ascii=False) + '\n')
print('wrote tmp_corr.jsonl: %d rows, %d citations' % (len(cites), nq))
