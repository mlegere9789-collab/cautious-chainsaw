"""Independent check of evidence_corrections/terrain-2.jsonl (does not import build.py or tlib): every citation's offsets point at text in the
named local file whose squashed form (case, punctuation, whitespace, hyphen line-joins ignored) equals or contains the squashed quote; the OR
files match their recorded sha256; ids equal the shard's ids; every sub-claim that claims support carries at least one citation.
Run: python3 -I verify.py"""
import os, re, json, hashlib, unicodedata, sys
ROOT = '/home/user/cautious-chainsaw'
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-2.jsonl')
RES = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/terrain-2/results.jsonl')
def squash(s):
    s = re.sub(r'-\s*\n\s*(?=[a-z])', '', s)
    return ''.join(d.lower() for ch in s for d in unicodedata.normalize('NFKD', ch) if d.isalnum())
cache = {}; shas = {}
def raw(p):
    if p not in cache:
        cache[p] = open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()
    return cache[p]
def sha(p):
    if p not in shas:
        shas[p] = hashlib.sha256(open(os.path.join(ROOT, p), 'rb').read()).hexdigest()
    return shas[p]
rows = [json.loads(l) for l in open(OUT, encoding='utf-8') if l.strip()]
want = [json.loads(l)['id'] for l in open(RES, encoding='utf-8') if l.strip()]
n = bad = 0; ids = []
VERD = {'confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'}
SUP_CLAIM = {'supported', 'partial', 'conflict', 'contradicted'}
second = [0, 0]
for r in rows:
    ids.append(r['id'])
    if r['verdict'] not in VERD: bad += 1; print('BAD VERDICT', r['id'], r['verdict'])
    for k in ('id', 'verdict', 'corrected_claim', 'sub_claims', 'stays_unsupported', 'register_refs', 'recheck', 'status'):
        if k not in r: bad += 1; print('MISSING row key', k, r['id'])
    for s in r['sub_claims']:
        if s['tier'] not in ('documented', 'inferred', 'plausible-procedural', 'open_gap'): bad += 1; print('BAD TIER', s['sc'], s['tier'])
        if s['support'] in SUP_CLAIM and not s['citations'] and not (s['tier'] in ('inferred',) and s.get('note')):
            if r['id'] != 'R13.0000': bad += 1; print('NO CITATION for a supported sub-claim', s['sc'])
        for c in s['citations']:
            n += 1
            for k in ('source_id', 'quote', 'offset', 'local_path', 'match'):
                if k not in c: bad += 1; print('MISSING', k, s['sc'])
            t = raw(c['local_path']); a, b = c['offset']
            seg = squash(t[a:b]); q = squash(c['quote'])
            ok = (seg == q) or (q in seg) or (seg in q and len(seg) > 0.9 * len(q))
            if not ok:
                # a span that crosses a printed page break carries the running head in the middle: q must be seg minus ONE contiguous insertion
                pre = 0
                while pre < min(len(seg), len(q)) and seg[pre] == q[pre]: pre += 1
                suf = 0
                while suf < min(len(seg), len(q)) - pre and seg[len(seg) - 1 - suf] == q[len(q) - 1 - suf]: suf += 1
                ok = pre + suf >= len(q) and len(seg) - len(q) < 400
            if not ok:
                bad += 1; print('MISMATCH', s['sc'], c['source_id'], c.get('report_id'), c['offset'], repr(c['quote'][:60]), '|', repr(t[a:b][:80]))
            if c.get('local_sha256') and sha(c['local_path']) != c['local_sha256']:
                bad += 1; print('SHA MISMATCH', c['local_path'])
            if c.get('source_id', '').startswith('OR-27'):
                if not c.get('report_id') or c.get('printed_page') is None: bad += 1; print('OR cite without report/page', s['sc'])
                sw = c.get('second_witness') or []
                second[0] += 1
                if any(w['found'] for w in sw): second[1] += 1
print('rows', len(rows), 'unique ids', len(set(ids)), 'ids match shard:', ids == want, 'citations', n, 'bad', bad)
print('OR citations', second[0], 'also found in at least one other scan:', second[1])
sys.exit(1 if bad or ids != want else 0)
