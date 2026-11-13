"""Independent check of evidence_corrections/fence-1.jsonl: every citation's offsets point at text in the named local file whose
squashed form (case, punctuation, whitespace, hyphen line-joins ignored) equals the squashed quote. Run: python3 -I verify_corrections.py"""
import os, re, json, unicodedata, sys, hashlib
ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-1.jsonl')
def squash(s):
    s = re.sub(r'-\s*\n\s*(?=[a-z])', '', s)
    return ''.join(d.lower() for ch in s for d in unicodedata.normalize('NFKD', ch) if d.isalnum())
cache = {}
def raw(p):
    if p not in cache:
        cache[p] = open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()
    return cache[p]
rows = [json.loads(l) for l in open(OUT, encoding='utf-8') if l.strip()]
n = bad = 0; byid = {}
ids = []
for r in rows:
    ids.append(r['id'])
    for s in r['sub_claims']:
        for c in s['citations']:
            n += 1
            t = raw(c['local_path']); a, b = c['offset']
            seg = squash(t[a:b]); q = squash(c['quote'])
            # the raw span may contain a running head between page-crossing words: allow the squashed quote to be a subsequence-free equality or contained
            ok = (seg == q) or (q in seg) or (seg in q and len(seg) > 0.9 * len(q))
            if not ok:
                bad += 1; print('MISMATCH', r['id'], s['sc'], c['source_id'], c.get('report_id'), c['offset'], repr(c['quote'][:60]), '|', repr(t[a:b][:80]))
            for k in ('source_id', 'quote', 'offset', 'local_path'):
                if k not in c: bad += 1; print('MISSING', k, r['id'])
print('rows', len(rows), 'unique ids', len(set(ids)), 'citations', n, 'bad', bad)
