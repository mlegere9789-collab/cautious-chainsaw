import json, re, sys, os
ROOT = '/home/user/cautious-chainsaw'
P = ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
rows = [json.loads(l) for l in open(P, encoding='utf-8')]
cache = {}
def raw(path):
    if path not in cache:
        fp = path if path.startswith('/') else os.path.join(ROOT, path)
        cache[path] = open(fp, encoding='utf-8', errors='replace').read()
    return cache[path]
def norm(s):
    s = s.lower()
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = re.sub(r'-\s+', '', s)           # hyphen-joined line breaks
    s = re.sub(r'[^a-z0-9$%\.]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
bad = 0
tot = 0
for r in rows:
    for sc in r['subclaims']:
        if sc['support'] == 'none' or not sc['cites']:
            continue
        # quoted strings in the claim
        qs = re.findall(r'"([^"]{4,})"', sc['claim'])
        if not qs:
            continue
        pool_q = ' '.join(norm(r['citations'][c]['quote']) for c in sc['cites'])
        pool_w = ''
        for c in sc['cites']:
            ct = r['citations'][c]
            if ct.get('local_path') and ct.get('offset_start') is not None:
                t = raw(ct['local_path'])
                a = max(0, ct['offset_start'] - 1800)
                b = min(len(t), ct['offset_end'] + 1800)
                pool_w += ' ' + norm(t[a:b])
            if ct.get('note'):
                pool_q += ' ' + norm(ct['note'])
        for q in qs:
            tot += 1
            nq = norm(q)
            if nq in pool_q:
                continue
            if nq in pool_w:
                print('WINDOW-ONLY', sc['sc'], '|', q[:120])
                continue
            bad += 1
            print('MISSING     ', sc['sc'], '|', q[:140], '| cites', sc['cites'])
print('quoted strings checked', tot, 'not found in cited quotes/notes', bad)
