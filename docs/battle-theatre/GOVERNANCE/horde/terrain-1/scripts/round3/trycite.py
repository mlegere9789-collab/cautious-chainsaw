"""resolve candidate citations through the real builder (read-only): python3 -I trycite.py  (edit CANDS below)"""
import sys, os, json
sys.path.insert(0, '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/horde/terrain-1/scripts')
import build
from spec_lib import C, F
CANDS = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else []
for c in CANDS:
    kind = c.pop('kind')
    spec = (F(c['path'], c['quote'], c['sid'], c['cls'], page=c.get('page'), occ=c.get('occ')) if kind == 'F' else C(c['src'], c['ref'], c['quote'], occ=c.get('occ'), page=c.get('page')))
    try:
        r = build.resolve(spec)
        print('OK ', c.get('tag', ''), r.get('source_id'), r.get('report_id'), 'page', r.get('printed_page'), '|pdf', r.get('pdf_page'), '|', r['offset'], '|hint', r.get('page_hint'), '|', r['quote'][:70])
        if r.get('second_witness'): print('     second_witness', [(w.get('scan', '')[:40], w['found']) for w in r['second_witness']])
    except SystemExit as e:
        print('FAIL', c.get('tag', ''), str(e)[:200])
