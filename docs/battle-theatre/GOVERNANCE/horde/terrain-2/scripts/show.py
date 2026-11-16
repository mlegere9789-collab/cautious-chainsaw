"""Print one row of evidence_corrections/terrain-2.jsonl compactly.  python3 -I show.py R13.P-01 [--full]"""
import json, sys, os, textwrap
ROOT = '/home/user/cautious-chainsaw'
P = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-2.jsonl')
rid = sys.argv[1]
full = '--full' in sys.argv
rows = [json.loads(l) for l in open(P, encoding='utf-8') if l.strip()]
r = [x for x in rows if x['id'] == rid][0]
def w(s, ind=2):
    print(textwrap.fill(str(s), 190, initial_indent=' ' * ind, subsequent_indent=' ' * (ind + 2)))
print('ID', r['id'], '| verdict', r['verdict'], '| status', r['status'], '| prev', r['previous_status'], r['previous_verdict'])
print('PDF CLAIM:'); w(r['pdf_claim'])
print('CORRECTED CLAIM:'); w(r['corrected_claim'])
for s in r['sub_claims']:
    print('--', s['sc'], '|', s['kind'], '|', s['tier'], '|', s['support'])
    w(s['claim'], 4)
    if s.get('note'): w('NOTE: ' + s['note'], 4)
    for c in s['citations']:
        pg = c.get('printed_page') or c.get('page_hint') or c.get('pdf_page')
        sw = ''
        if c.get('second_witness'): sw = ' sw=' + ''.join('Y' if x['found'] else 'n' for x in c['second_witness'])
        w('[%s %s p.%s%s %s] "%s"' % (c['source_id'], c.get('report_id') or '', pg, sw, c.get('role'), c['quote'] if full else c['quote'][:300]), 6)
        if c.get('note'): w('note: ' + c['note'], 8)
print('STAYS UNSUPPORTED:'); [w('- ' + x) for x in r['stays_unsupported']]
print('CONFLICTS:'); [w('- ' + x) for x in r['conflicts_carried']]
print('REGISTER', r['register_refs'])
print('BLOCKED:'); [w('- ' + json.dumps(x)) for x in r['blocked_host']]
print('CONSEQUENCE:'); [w('- ' + x) for x in r['product_consequence']]
print('LOOKUPS:'); [w('- ' + json.dumps(x)) for x in r['lookups']]
print('NOTES:'); w(r['notes'])
print('CHANGES:'); [w('- ' + x) for x in r['changes_vs_previous']]
print('RECHECK:', json.dumps(r['recheck'])[:900])
