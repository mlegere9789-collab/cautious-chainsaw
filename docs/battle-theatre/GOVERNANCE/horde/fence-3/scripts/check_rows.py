"""Structural checks of the fence-3 corrections file (any path): schema, tiers vs support, citations used, blocked_host entries."""
import json, sys, re
P = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-3.jsonl'
KEYS = ['id', 'shard', 'schedule_id', 'requirement', 'sub_requirement_text', 'printed', 'before', 'verdict', 'status', 'corrected_claim', 'subclaims', 'citations', 'unsupported', 'lookups', 'register', 'blocked_host',
        'product_consequence', 'changes_from_shard', 'tier_after', 'tier_after_rule', 'date', 'workstream', 'method', 'round2', 'round3', 'status_rule']
bad = 0
rows = [json.loads(l) for l in open(P, encoding='utf-8')]
ids = [r['id'] for r in rows]
exp = ['R14.S-%03d' % i for i in range(53, 89)]
if ids != exp:
    print('IDS differ from R14.S-053..S-088', set(exp) ^ set(ids)); bad += 1
for r in rows:
    for k in KEYS:
        if k not in r:
            print(r['id'], 'missing key', k); bad += 1
    if r['verdict'] not in ('confirmed', 'corrected', 'partially_supported', 'unsupported', 'gap'):
        print(r['id'], 'bad verdict', r['verdict']); bad += 1
    if r['status'] not in ('closed', 'open', 'blocked_host'):
        print(r['id'], 'bad status', r['status']); bad += 1
    used = set()
    for s in r['subclaims']:
        if s['tier'] not in ('documented', 'inferred', 'open_gap') or s['support'] not in ('supported', 'partial', 'none'):
            print(r['id'], s['sc'], 'bad tier/support', s['tier'], s['support']); bad += 1
        if s['tier'] == 'documented' and (s['support'] == 'none' or not s['cites']):
            print(r['id'], s['sc'], 'documented without support/cites'); bad += 1
        if s['tier'] == 'open_gap' and s['support'] != 'none':
            print(r['id'], s['sc'], 'open_gap with support', s['support']); bad += 1
        if s['tier'] == 'open_gap' and s['cites'] and not re.search(r'context|hedged|pre-battle|CLR says', s['claim'] + s.get('why', '')):
            pass
        for c in s['cites']:
            used.add(c)
            if c not in r['citations']:
                print(r['id'], s['sc'], 'dangling', c); bad += 1
    if set(r['citations']) != used:
        print(r['id'], 'unused citations', sorted(set(r['citations']) - used)); bad += 1
    for cid, c in r['citations'].items():
        for k in ('source_id', 'source', 'quote', 'offset_start', 'offset_end', 'local_path', 'text_sha256', 'source_class'):
            if k not in c or c[k] in (None, ''):
                print(r['id'], cid, 'missing', k); bad += 1
        if len(c['quote']) < 8:
            print(r['id'], cid, 'short quote', c['quote']); bad += 1
    if r['status'] == 'blocked_host' and not r['blocked_host']:
        print(r['id'], 'blocked_host status without entries'); bad += 1
    if r['status'] != 'blocked_host' and r['blocked_host']:
        print(r['id'], 'blocked_host entries with status', r['status']); bad += 1
    for b in r['blocked_host']:
        if 'url' not in b or 'what_to_read' not in b:
            print(r['id'], 'blocked entry lacks url/what_to_read'); bad += 1
    if not r['round3']:
        print(r['id'], 'no round3 note'); bad += 1
    txt = json.dumps(r, ensure_ascii=False)
    for w in (' AI ', 'Claude', 'Anthropic', 'subagent'):
        if w in txt:
            print(r['id'], 'banned word in row', w); bad += 1
n_sc = sum(len(r['subclaims']) for r in rows); n_c = sum(len(r['citations']) for r in rows)
print('rows', len(rows), 'subclaims', n_sc, 'citations', n_c, 'problems', bad)
