import json, sys, textwrap
P = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
rows = {}
for l in open(P, encoding='utf-8'):
    d = json.loads(l)
    rows[d['schedule_id']] = d
ids = sys.argv[1:]
full = '--full' in ids
ids = [i for i in ids if not i.startswith('--')]
def cit(c):
    k = ''
    for key in ('report_id', 'part', 'author', 'section', 'unit'):
        if c.get(key):
            k += ' %s=%s' % (key, c[key])
    return '%s%s p.%s' % (c['source_id'], k, c.get('printed_page'))
for i in ids:
    d = rows[i]
    p = d['printed']
    print('=' * 100)
    print(d['id'], d['verdict'], d['status'], 'tier_after', d['tier_after'], 'reg', d['register'])
    print('PRINTED:', json.dumps(p, ensure_ascii=False))
    print('CORRECTED:', d['corrected_claim'])
    for sc in d['subclaims']:
        print('  SC', sc['sc'], sc['kind'], '|', sc['tier'], sc['support'], '|', sc['claim'], '| cites', sc['cites'], '| why:', (sc.get('why') or '')[:300])
    print('UNSUPPORTED:', json.dumps(d['unsupported'], ensure_ascii=False))
    print('BLOCKED:', json.dumps(d['blocked_host'], ensure_ascii=False))
    print('PRODUCT:', json.dumps(d['product_consequence'], ensure_ascii=False))
    print('CHANGES:', json.dumps(d['changes_from_shard'], ensure_ascii=False))
    if full:
        for k, c in d['citations'].items():
            print('  CIT', k, cit(c), '|', c['quote'][:160].replace('\n', ' '))
    else:
        print('  CITS:', '; '.join('%s %s' % (k, cit(c)) for k, c in d['citations'].items()))
    print('LOOKUPS:', json.dumps(d['lookups'], ensure_ascii=False)[:1200])
