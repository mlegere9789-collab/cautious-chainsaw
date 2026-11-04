"""Merge reader draft files into tools/bt/positions_B_recheck_<CORPS>.json (the decisions the builder reads).
    python -I tools/bt/recheck_B_merge.py II [III XII]      merges draft_B/recheck/<CORPS>-NN.json (open-gap ids are taken from GAP.json only)
Never overwrites a decision already merged unless --replace is given. Prints counts."""
import os, sys, json, glob, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
P = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
replace = '--replace' in sys.argv
frozen = {}
for l in open(os.path.join(P, '_orig_B', 'positions_B.before_recheck.jsonl'), encoding='utf-8'):
    c = json.loads(l)
    frozen[c['claim_id']] = c
CORPS = {'2c': 'II', '3c': 'III', '12c': 'XII'}
for K in args:
    out = os.path.join(HERE, 'positions_B_recheck_%s.json' % K)
    cur = json.load(open(out, encoding='utf-8')) if os.path.exists(out) else {}
    files = sorted(glob.glob(os.path.join(P, 'draft_B', 'recheck', '%s-[0-9][0-9].json' % K)))
    if K == 'GAP':
        files = [os.path.join(P, 'draft_B', 'recheck', 'GAP.json')]
    n_new = 0
    for fn in files:
        for d in json.load(open(fn, encoding='utf-8')):
            cid = d['id']
            if cid not in frozen:
                print('unknown id', cid, fn); continue
            isgap = frozen[cid]['tier'] == 'open gap'
            if (K == 'GAP') != isgap:
                continue
            if CORPS[frozen[cid]['unit_id'].split('-')[1]] != K and K != 'GAP':
                print('claim of another corps in', fn, cid); continue
            dd = {k: v for k, v in d.items() if k != 'id'}
            if cid in cur and not replace:
                continue
            cur[cid] = dd; n_new += 1
    # keep file order = ledger order
    order = list(frozen)
    cur = {k: cur[k] for k in sorted(cur, key=lambda c: order.index(c))}
    json.dump(cur, open(out, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    want = [c for c in frozen.values() if (CORPS[c['unit_id'].split('-')[1]] == K and c['tier'] != 'open gap')] if K != 'GAP' else [c for c in frozen.values() if c['tier'] == 'open gap']
    miss = [c['claim_id'] for c in want if c['claim_id'] not in cur]
    print(K, 'merged', n_new, 'total', len(cur), 'of', len(want), 'missing', len(miss), miss[:5], dict(collections.Counter(v['fc'] for v in cur.values())))
