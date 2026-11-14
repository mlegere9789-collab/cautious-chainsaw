import json, re, os
ROOT = '/home/user/cautious-chainsaw'
P = ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
rows = [json.loads(l) for l in open(P, encoding='utf-8')]
cache = {}
def raw(path):
    if path not in cache:
        fp = path if path.startswith('/') else os.path.join(ROOT, path)
        cache[path] = open(fp, encoding='utf-8', errors='replace').read()
    return cache[path]
def digits(s):
    return set(re.findall(r'\$?\d[\d,]*\d(?:\.\d+)?|\$\d', s))
flag = 0
for r in rows:
    pool = json.dumps(r['printed'], ensure_ascii=False) + ' ' + ' '.join(sc['claim'] + ' ' + (sc.get('why') or '') for sc in r['subclaims'])
    for c, ct in r['citations'].items():
        pool += ' ' + ct['quote'] + ' ' + (ct.get('note') or '')
        if ct.get('local_path') and ct.get('offset_start') is not None:
            t = raw(ct['local_path'])
            pool += ' ' + t[max(0, ct['offset_start'] - 2500): ct['offset_end'] + 2500]
    pool_n = pool.replace(',', '')
    for field in ('corrected_claim',):
        txt = r[field]
        for n in sorted(digits(txt)):
            if len(re.sub(r'\D', '', n)) < 3 and not n.startswith('$'):
                continue
            if n.replace(',', '') in pool_n:
                continue
            flag += 1
            print('NUM-NOT-FOUND', r['id'], field, n, '|', txt[:100])
    for field in ('product_consequence', 'changes_from_shard', 'unsupported'):
        for txt in r[field]:
            for n in sorted(digits(txt)):
                if len(re.sub(r'\D', '', n)) < 3 and not n.startswith('$'):
                    continue
                if n.replace(',', '') in pool_n:
                    continue
                flag += 1
                print('NUM-NOT-FOUND', r['id'], field, n, '|', txt[:110])
print('flagged', flag)
