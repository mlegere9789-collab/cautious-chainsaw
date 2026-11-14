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
    for sc in r['subclaims']:
        if sc['support'] == 'none':
            continue
        nums = {n for n in digits(sc['claim']) if len(re.sub(r'\D', '', n)) >= 3 or n.startswith('$')}
        if not nums:
            continue
        pool = ''
        for c in sc['cites']:
            ct = r['citations'][c]
            pool += ' ' + ct['quote'] + ' ' + (ct.get('note') or '')
            if ct.get('local_path') and ct.get('offset_start') is not None:
                t = raw(ct['local_path'])
                pool += ' ' + t[max(0, ct['offset_start'] - 2500): ct['offset_end'] + 2500]
        pool_n = pool.replace(',', '')
        for n in sorted(nums):
            nn = n.replace(',', '')
            if nn in pool_n or n in pool:
                continue
            flag += 1
            print('NUM-NOT-IN-CITED-TEXT', sc['sc'], n, '|', sc['claim'][:150].replace('\n', ' '), '| cites', sc['cites'])
print('flagged', flag)
