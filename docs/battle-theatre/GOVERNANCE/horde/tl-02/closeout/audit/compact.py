"""Compact reader: python3 -I tmp/tl-02/audit/compact.py T1-062 [...]  (event, sub-claims with their cited quotes, scenarios, remains)"""
import os, sys, json, textwrap
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-02.jsonl'), encoding='utf-8')}
def w(s, i=0): print(textwrap.fill(str(s), width=170, initial_indent=' ' * i, subsequent_indent=' ' * (i + 3)))
for rid in sys.argv[1:]:
    r = rows[rid]; cc = r['corrected_claim']; cites = {c['key']: c for c in r['citations']}
    print('=' * 100); w('%s [%s | claim tier %s] %s' % (rid, r['verdict'], cc['tier'], cc['event']))
    w('WHEN: ' + cc['time_window']['text'], 2)
    for s in r['sub_claims']:
        w('(%d) %s/%s: %s' % (s['n'], s['tier'], s['support'], s['claim']), 2)
        for k in s['citations']:
            c = cites.get(k)
            if not c: continue
            if c['source_id'] == 'COMPUTED': w('<%s> COMPUTED %s' % (k, c['value'][:100]), 8)
            else: w('<%s> %s p.%s: "%s"' % (k, c['source_id'], c['printed_page'], c['quote'][:260]), 8)
    for sc in r['scenarios']: w('SCN %s [%s] %s' % (sc['id'], sc['tier'], sc['value']), 2)
    if r['remains_unsupported']: w('REMAINS: ' + ' | '.join(r['remains_unsupported']), 2)
