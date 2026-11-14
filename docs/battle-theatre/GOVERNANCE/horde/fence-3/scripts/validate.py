"""Independent mechanical check of docs/.../evidence_corrections/fence-3.jsonl: for every citation, cut the span
[offset_start, offset_end) out of the raw file named by local_path and compare, whitespace- and hyphen-tolerant, with the quote."""
import json, re, sys, hashlib, os
ROOT = '/home/user/cautious-chainsaw'
P = ROOT + '/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
APOS = str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"'})
def norm(s):
    s = s.translate(APOS)
    s = re.sub(r'(\w)-\s*\n\s*(?=[a-z])', r'\1', s)      # line-break hyphenation
    s = re.sub(r'(?<=\w)-\s+(?=[a-z])', '', s)            # hyphen + space (OCR) joined
    return re.sub(r'\s+', '', s)
cache = {}
bad = 0; n = 0; ids = set()
for line in open(P, encoding='utf-8'):
    d = json.loads(line)
    ids.add(d['id'])
    for cid, c in d['citations'].items():
        n += 1
        path = ROOT + '/' + c['local_path']
        if path not in cache:
            cache[path] = open(path, encoding='utf-8', newline='').read()
        t = cache[path]
        span = t[c['offset_start']:c['offset_end']]
        if norm(span) != norm(c['quote']):
            bad += 1
            print('MISMATCH', d['id'], cid, c['source_id'], repr(c['quote'][:70]), '| span:', repr(span[:90]))
        if hashlib.sha256(open(path, 'rb').read()).hexdigest() != c['text_sha256']:
            bad += 1; print('SHA', d['id'], cid)
    # every documented subclaim has at least one citation
    for sc in d['subclaims']:
        if sc['tier'] == 'documented' and sc['support'] == 'supported' and not sc['cites']:
            bad += 1; print('NO CITE', d['id'], sc['sc'])
        for cid in sc['cites']:
            if cid not in d['citations']:
                bad += 1; print('DANGLING', d['id'], sc['sc'], cid)
print('rows', len(ids), 'citations', n, 'problems', bad)
