"""Independent validator of timeline_corrections/tl-01.jsonl (written for the fourth start; does not import build.py)."""
import json, os, re, sys, hashlib, collections
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
seed = {}
for l in open(G + '/timeline_seed.jsonl', encoding='utf-8'):
    r = json.loads(l)
    seed[r['id']] = r
ver = {}
for l in open(G + '/timeline_verified.jsonl', encoding='utf-8'):
    r = json.loads(l); ver[r['id']] = r
res = {}
for l in open(G + '/horde/tl-01/results.jsonl', encoding='utf-8'):
    r = json.loads(l); res[r['id']] = r

problems = []
def P(rid, msg):
    problems.append((rid, msg))

ids = [r['id'] for r in rows]
exp = ['T1-%03d' % i for i in range(1, 58)]
if ids != exp:
    P('*', 'ids differ from T1-001..T1-057 in order: %r' % (set(exp) ^ set(ids)))
VERD = {'confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'}
TIERS = {'documented', 'inferred', 'plausible-procedural', 'open gap'}
SUPP = {'supported', 'unsupported', 'conflict', 'contradicted'}
BANNED = re.compile(r'\b(AI|Claude|Anthropic|agents?|subagents?|LLM|chatbot|language model)\b')

def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip()

filecache = {}
def readfile(p):
    if p not in filecache:
        raw = open(ROOT + '/' + p, 'rb').read()
        filecache[p] = (raw.decode('utf-8', errors='replace'), hashlib.sha256(raw).hexdigest())
    return filecache[p]

ncit = 0; nsub = 0
slice_ok = 0; slice_bad = []; pb = []
sha_bad = set()
for r in rows:
    rid = r['id']
    if r.get('verdict') not in VERD: P(rid, 'bad verdict %r' % r.get('verdict'))
    cc = r.get('corrected_claim') or {}
    for k in ('event', 'unit', 'place', 'time_window', 'text', 'tier', 'marking'):
        if k not in cc: P(rid, 'corrected_claim lacks ' + k)
    tw = cc.get('time_window') or {}
    for k in ('text', 'start', 'end', 'basis'):
        if not tw.get(k): P(rid, 'time_window lacks ' + k)
    if cc.get('tier') not in TIERS: P(rid, 'row tier %r' % cc.get('tier'))
    cites = {c['key']: c for c in r.get('citations', [])}
    if len(cites) != len(r.get('citations', [])): P(rid, 'duplicate citation key')
    for s in r.get('sub_claims', []):
        nsub += 1
        if s.get('tier') not in TIERS: P(rid, 'sub %s tier %r' % (s.get('n'), s.get('tier')))
        if s.get('support') not in SUPP: P(rid, 'sub %s support %r' % (s.get('n'), s.get('support')))
        for k in s.get('citations', []):
            if k not in cites: P(rid, 'sub %s cites unknown key %s' % (s.get('n'), k))
        if s.get('tier') == 'documented' and s.get('support') in ('supported', 'contradicted', 'conflict') and not s.get('citations'):
            P(rid, 'sub %s documented without a citation' % s.get('n'))
        if s.get('tier') == 'documented' and s.get('support') == 'unsupported':
            P(rid, 'sub %s documented but unsupported' % s.get('n'))
        if s.get('tier') == 'open gap' and s.get('support') == 'supported':
            P(rid, 'sub %s open gap but supported' % s.get('n'))
    for sc in r.get('scenarios', []):
        for k in sc.get('citations', []):
            if k not in cites: P(rid, 'scenario %s cites unknown key %s' % (sc.get('id'), k))
        if sc.get('tier') not in TIERS: P(rid, 'scenario %s tier %r' % (sc.get('id'), sc.get('tier')))
    used = set(k for s in r.get('sub_claims', []) for k in s.get('citations', [])) | set(k for sc in r.get('scenarios', []) for k in sc.get('citations', []))
    for k in cites:
        if k not in used: P(rid, 'citation %s used by no sub-claim or scenario' % k)
    for k, c in cites.items():
        ncit += 1
        for f in ('source_id', 'printed_page', 'quote', 'text_offset', 'text_offset_end', 'source_file', 'sha256'):
            if c.get(f) in (None, ''): P(rid, 'citation %s lacks %s' % (k, f))
        if c.get('source_id') == 'OR27' and not c.get('report_id'): P(rid, 'OR citation %s lacks report_id' % k)
        if c.get('source_id') == 'OR27' and c.get('part') not in (1, 2, 3): P(rid, 'OR citation %s lacks part' % k)
        try:
            txt, sha = readfile(c['source_file'])
        except Exception as e:
            P(rid, 'citation %s: source file unreadable %s' % (k, e)); continue
        if sha != c.get('sha256'): sha_bad.add(c['source_file'])
        # raw decode with newline='' convention = keep \r\n; our decode of bytes keeps them
        sl = txt[c['text_offset']:c['text_offset_end']]
        def squash(x):
            return re.sub(r'[\s\-\u2010\u2011\u2012\u2013\u2014]+', '', norm(x))
        if squash(sl) == squash(c['quote']):
            slice_ok += 1
        elif squash(c['quote']) in squash(sl) or squash(sl) in squash(c['quote']):
            slice_ok += 1   # a page break (running head) inside the slice, or a one-sided end
            pb.append((rid, k))
        else:
            # page-break tolerant: quote parts split on ellipsis marker? record
            slice_bad.append((rid, k, norm(sl)[:90], norm(c['quote'])[:90]))
    if r['verdict'] != 'confirmed' and not r.get('remains_unsupported') and r['verdict'] != 'corrected':
        P(rid, 'non-confirmed verdict with empty remains_unsupported')
    needs_reg = r['verdict'] in ('partially_supported', 'unsupported', 'gap') or bool(r.get('remains_unsupported')) or any(x['support'] == 'unsupported' for x in r['sub_claims'])
    has_reg = bool(r.get('register_proposed')) and os.path.exists(G + '/horde/tl-01/proposed-register/' + r['register_proposed'] + '.md')
    if needs_reg and not has_reg:
        P(rid, 'no proposed register entry file (verdict %s, remains %d, unsupported subs %d)' % (r['verdict'], len(r.get('remains_unsupported', [])), sum(1 for x in r['sub_claims'] if x['support'] == 'unsupported')))
    if has_reg and not needs_reg:
        P(rid, 'register entry present although nothing is partial or unsupported')
    for fld in ('event', 'unit', 'place', 'text', 'marking'):
        if BANNED.search(cc.get(fld, '') or ''): P(rid, 'banned word in corrected_claim.%s: %s' % (fld, BANNED.search(cc[fld]).group(0)))
    if ver[rid].get('seed_tier') and r['seed']['tier'] != seed[rid]['tier'] if 'tier' in seed[rid] else False:
        P(rid, 'seed tier differs')

print('rows', len(rows), 'sub_claims', nsub, 'citations', ncit)
print('of which with extra text inside the slice (page break or head):', len(pb)); print('slice agree', slice_ok, 'disagree', len(slice_bad), 'sha mismatch files', sorted(sha_bad))
for x in slice_bad[:40]: print('  SLICE', x)
import glob
files = sorted(os.path.basename(f)[:-3] for f in glob.glob(G + '/horde/tl-01/proposed-register/tl-01-CO-*.md'))
want = sorted(r['register_proposed'] for r in rows if r.get('register_proposed'))
if files != want: print('REGISTER FILES differ from register_proposed:', set(files) ^ set(want))
print('register entries', len(files), 'rows needing one', sum(1 for r in rows if (r['verdict'] in ('partially_supported','unsupported','gap') or r.get('remains_unsupported') or any(x['support']=='unsupported' for x in r['sub_claims']))))
print('problems', len(problems))
for p in problems[:80]: print('  ', p)
c = collections.Counter(r['verdict'] for r in rows); print(dict(c))
