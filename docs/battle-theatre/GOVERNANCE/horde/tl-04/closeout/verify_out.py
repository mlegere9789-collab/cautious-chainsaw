"""Independent re-check of the written corrections file: for every citation, re-read the source file at the stored offsets and compare
with the stored quote (normalised view, running heads tolerated inside the span). Also: json validity, line count, ids, tiers, banned words,
every sub-claim cites existing keys, every scenario cites existing keys, results.jsonl and corrections ids agree, sha256 of every source file.
  python3 -I tmp/tl-04/verify_out.py"""
import os, re, sys, json, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-04.jsonl'), encoding='utf-8')]
res = [json.loads(l) for l in open(os.path.join(G, 'horde', 'tl-04', 'results.jsonl'), encoding='utf-8')]
errs = []
want = ['T1-%03d' % i for i in range(173, 226)] + ['T2-%03d' % i for i in range(1, 6)]
if [r['id'] for r in rows] != want:
    errs.append('corrections ids are not the 58 shard ids in order')
if [r['id'] for r in res] != want:
    errs.append('results ids are not the 58 shard ids in order')
seed = {json.loads(l)['id'] for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')}
for w in want:
    if w not in seed:
        errs.append('seed missing %s' % w)
cache = {}
shas = {}
BAN = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')
n = 0
for r in rows:
    keys = {c['key'] for c in r['citations']}
    if len(keys) != len(r['citations']):
        errs.append('%s duplicate citation keys' % r['id'])
    used = set()
    for s in r['sub_claims']:
        for k in s['citations']:
            used.add(k)
            if k not in keys:
                errs.append('%s sub-claim %d cites missing key %s' % (r['id'], s['n'], k))
        if s['tier'] == 'documented' and not s['citations']:
            errs.append('%s sub-claim %d documented without citation' % (r['id'], s['n']))
        if s['tier'] == 'documented' and s['citations'] and all(next(c for c in r['citations'] if c['key'] == k)['source_id'] in ('COMPUTED', 'PROJECT-DATA') for k in s['citations']):
            errs.append('%s sub-claim %d documented on a computation or project data only' % (r['id'], s['n']))
    for sc in r['scenarios']:
        for k in sc['citations']:
            used.add(k)
            if k not in keys:
                errs.append('%s scenario %s cites missing key %s' % (r['id'], sc['id'], k))
    for k in keys - used:
        errs.append('%s citation %s unused' % (r['id'], k))
    if r['verdict'] not in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
        errs.append('%s bad verdict' % r['id'])
    if BAN.search(json.dumps(r, ensure_ascii=False)):
        errs.append('%s banned word' % r['id'])
    if r['verdict'] in ('partially_supported', 'unsupported', 'gap') and not r['register_proposed']:
        errs.append('%s lacks a proposed register entry' % r['id'])
    if r['register_proposed'] and not os.path.exists(os.path.join(G, 'horde', 'tl-04', 'proposed-register', r['register_proposed'] + '.md')):
        errs.append('%s register file missing' % r['id'])
    for c in r['citations']:
        if c['source_id'] in ('COMPUTED', 'PROJECT-DATA'):
            continue
        n += 1
        p = os.path.join(ROOT, c['source_file'])
        if p not in cache:
            cache[p] = open(p, encoding='utf-8', errors='replace', newline='').read()
            shas[p] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        if shas[p] != c['sha256']:
            errs.append('%s %s: sha256 of %s differs from the stored value' % (r['id'], c['key'], c['source_file']))
        raw = cache[p]
        a, b = c['text_offset'], c['text_offset_end']
        seg = raw[a:b]
        nt, _ = build_nview(seg)
        nt = nt.translate(APOS)
        q = norm_query(c['quote']).translate(APOS)
        k = min(12, len(q)); k0 = min(7, len(q))
        ok = nt.startswith(q[:k0]) and nt.endswith(q[-k:]) and len(nt) >= len(q)
        if not ok:
            errs.append('%s %s: stored offsets do not re-read to the quote (%r ... %r)' % (r['id'], c['key'], nt[:40], nt[-40:]))
print('rows', len(rows), 'results', len(res), 'citations re-read', n, 'errors', len(errs))
for e in errs[:60]:
    print('  !!', e)
json.dump(dict(rows=len(rows), citations=n, errors=len(errs)), open(os.path.join(HERE, 'verify_result.json'), 'w', encoding='utf-8'))
sys.exit(1 if errs else 0)
