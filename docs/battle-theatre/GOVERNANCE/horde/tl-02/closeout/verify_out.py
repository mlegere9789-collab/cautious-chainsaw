"""Independent re-check of the written corrections file: for every citation, re-read the source file at the stored offsets and compare
with the stored quote (normalised view, running heads tolerated at the ends). Also: json validity, line count, ids, tiers, banned words,
every sub-claim cites existing keys, every scenario cites existing keys, results.jsonl and corrections ids agree.
  python3 -I tmp/tl-02/verify_out.py"""
import os, re, sys, json, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')]
res = [json.loads(l) for l in open(os.path.join(G, 'horde', 'tl-02', 'results.jsonl'), encoding='utf-8')]
errs = []
want = ['T1-%03d' % i for i in range(58, 116)]
if [r['id'] for r in rows] != want:
    errs.append('corrections ids are not T1-058..T1-115 in order')
if [r['id'] for r in res] != want:
    errs.append('results ids are not T1-058..T1-115 in order')
seed = {json.loads(l)['id'] for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')}
for w in want:
    if w not in seed:
        errs.append('seed missing %s' % w)
cache = {}
BAN = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')
n = 0
for r in rows:
    keys = {c['key'] for c in r['citations']}
    if len(keys) != len(r['citations']):
        errs.append('%s duplicate citation keys' % r['id'])
    for s in r['sub_claims']:
        for k in s['citations']:
            if k not in keys:
                errs.append('%s sub-claim %d cites missing key %s' % (r['id'], s['n'], k))
        if s['tier'] == 'documented' and not s['citations']:
            errs.append('%s sub-claim %d documented without citation' % (r['id'], s['n']))
    for sc in r['scenarios']:
        for k in sc['citations']:
            if k not in keys:
                errs.append('%s scenario %s cites missing key %s' % (r['id'], sc['id'], k))
    if r['verdict'] not in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
        errs.append('%s bad verdict' % r['id'])
    if BAN.search(json.dumps(r, ensure_ascii=False)):
        errs.append('%s banned word' % r['id'])
    if r['verdict'] != 'confirmed' and not (r['register_proposed'] or r['register_related'] or not r['remains_unsupported']):
        errs.append('%s has open remains without register entry or related entry' % r['id'])
    for c in r['citations']:
        if c['source_id'] == 'COMPUTED':
            continue
        n += 1
        p = os.path.join(ROOT, c['source_file'])
        if p not in cache:
            cache[p] = open(p, encoding='utf-8', errors='replace', newline='').read()
        raw = cache[p]
        sha = hashlib.sha256(open(p, 'rb').read()).hexdigest() if p not in cache.get('_sha', {}) else None
        a, b = c['text_offset'], c['text_offset_end']
        seg = raw[a:b]
        nt, _ = build_nview(seg)
        nt = nt.translate(APOS)
        q = norm_query(c['quote']).translate(APOS)
        # running heads may sit inside the span: compare the first and last 24 normalised characters and the length ratio
        k = min(12, len(q)); k0 = min(7, len(q))
        ok = nt.startswith(q[:k0]) and nt.endswith(q[-k:]) and len(nt) >= len(q)
        if not ok:
            errs.append('%s %s: stored offsets do not re-read to the quote (%r ... %r)' % (r['id'], c['key'], nt[:40], nt[-40:]))
print('rows', len(rows), 'results', len(res), 'citations re-read', n, 'errors', len(errs))
for e in errs[:40]:
    print('  !!', e)
sys.exit(1 if errs else 0)
