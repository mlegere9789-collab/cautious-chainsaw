"""Phase 1: re-match every quotation printed in docs/.../horde/fence-3/results.jsonl against the local raw texts.
Quotes are harvested by regex from the free-text fields; each is searched in OR27 pt 1-3, the state volumes and the library.
Output: tmp/fence-3/data/recheck_existing.json + a table on stdout.  Run: python3 -I recheck_existing.py"""
import sys, json, re
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import lib, corpus
ROOT = lib.ROOT
rows = [json.loads(l) for l in open(ROOT + '/docs/battle-theatre/GOVERNANCE/horde/fence-3/results.jsonl')]
APOS = str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"'})
def flat(o):
    if isinstance(o, str): return [o]
    if isinstance(o, list): return [s for x in o for s in flat(x)]
    if isinstance(o, dict): return [s for x in o.values() for s in flat(x)]
    return []
C = corpus.Corpus()
res = []
seen = set()
for r in rows:
    txt = ' || '.join(flat({k: v for k, v in r.items() if k not in ('id',)}))
    txt = txt.translate(APOS)
    for m in re.finditer(r'"([^"]{12,300}?)"', txt):
        q = m.group(1).strip()
        if (r['id'], q) in seen: continue
        seen.add((r['id'], q))
        rec = {'row': r['id'], 'quote': q, 'or': [], 'sv': [], 'lib': []}
        for part in (1, 2, 3):
            for h in lib.or_verify(q, (part,)):
                rec['or'].append({'part': part, 'record': h['record'], 'who': h['who'], 'page': h['page'], 'start': h['start'], 'end': h['end']})
        try:
            for h in lib.sv_verify(q, list(lib.SF.SI.VOLUMES)):
                rec['sv'].append({'vol': h['vol'], 'section': h['section'], 'page': h['page'], 'offset': h['offset']})
        except Exception as e:
            rec['sv_err'] = str(e)
        qn = corpus.fold(lib.norm_query(q))
        for did, d in C.docs.items():
            p = d.n.find(qn)
            if p >= 0:
                rec['lib'].append({'doc': did, 'off': d.raw_off(p), 'pdf_page': d.pdf_page(d.raw_off(p))})
        res.append(rec)
json.dump(res, open(ROOT + '/tmp/fence-3/data/recheck_existing.json', 'w'), indent=1, ensure_ascii=False)
for rec in res:
    tag = 'OR' if rec['or'] else ('SV' if rec['sv'] else ('LIB' if rec['lib'] else 'NOT FOUND'))
    print('%-10s %-9s %s' % (rec['row'], tag, rec['quote'][:100].replace('\n', ' ')))
    for h in rec['or']: print('            OR pt%d %s %s p.%s off %d' % (h['part'], h['record'], h['who'][:30], h['page'], h['start']))
    for h in rec['sv'][:2]: print('            SV %s %s p.%s off %d' % (h['vol'], h['section'], h['page'], h['offset']))
    for h in rec['lib'][:2]: print('            LIB %s off %d pdfpage %s' % (h['doc'], h['off'], h['pdf_page']))
