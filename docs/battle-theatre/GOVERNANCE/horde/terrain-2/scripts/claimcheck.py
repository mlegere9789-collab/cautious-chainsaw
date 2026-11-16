"""Second-reading helper for evidence_corrections/terrain-2.jsonl (read-only).
For every sub-claim that claims support (supported / partial / conflict / contradicted) it lists the details of the claim text that are NOT
found in what the sub-claim cites: numbers, 'single-quoted' strings and Capitalised names, searched in (1) the cited quotes and notes
(NOTE-POOL) and (2) a window of 1800 characters either side of each cited span in the source text (WINDOW-ONLY: present near the cited quote
but not inside it; cite the exact words or cut the claim).  Output is a to-do list for a human reading, not a verdict.
Run: python3 -I claimcheck.py [R13.P-01 ...]   (no id = all rows)"""
import json, re, sys, os, unicodedata
ROOT = '/home/user/cautious-chainsaw'
P = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-2.jsonl')
rows = [json.loads(l) for l in open(P, encoding='utf-8') if l.strip()]
want = set(a for a in sys.argv[1:] if not a.startswith('-'))
_c = {}
def raw(p):
    if p not in _c:
        _c[p] = open(os.path.join(ROOT, p), encoding='utf-8', errors='replace', newline='').read()
    return _c[p]
def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('­', '')
    s = re.sub(r'-\s*\n\s*(?=[a-z])', '', s)
    s = unicodedata.normalize('NFKD', s).lower()
    s = re.sub(r'[^a-z0-9$%.]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
STOP = set('A An The In On At By Of For To From With Without And Or But Not No Yes It Its His Her Their This That These Those There Then When While After Before During Under Over Along Between Behind Beyond Near Per See Note Documented Inferred Supported Partial Conflict Jul July Aug Sun Mon Tue Wed Thu Fri Sat All Both Each Every Some Any One Two Three Four Five Six Seven Eight Nine Ten First Second Third Fourth Fifth Sixth Division Brigade Corps Regiment Battery Pennsylvania New York Maine Ohio Connecticut Massachusetts Michigan Indiana Maryland Virginia Georgia Carolina Union Confederate Army Official Records OR NPS PDF Gettysburg'.split())
def details(text):
    nums = set(re.findall(r'\d+(?:[.,:]\d+)*', text))
    nums = {n for n in nums if len(re.sub(r'\D', '', n)) >= 2}
    quoted = re.findall(r"(?<![\w])'([^'\n]{5,}?)'(?![\w])", text)
    caps = set(re.findall(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{3,}(?:'s)?)\b", text)) - STOP
    caps = {c[:-2] if c.endswith("'s") else c for c in caps}
    return nums, quoted, caps
tot = flag = 0
for r in rows:
    if want and r['id'] not in want: continue
    for s in r['sub_claims']:
        if s['support'] not in ('supported', 'partial', 'conflict', 'contradicted'): continue
        if not s['citations']: continue
        pool = norm(' '.join(c['quote'] + ' ' + (c.get('note') or '') for c in s['citations']) + ' ' + (s.get('note') or ''))
        win = ''
        for c in s['citations']:
            if c.get('offset') and c.get('local_path'):
                t = raw(c['local_path']); a, b = c['offset']
                win += ' ' + norm(t[max(0, a - 1800): b + 1800])
        nums, quoted, caps = details(s['claim'])
        miss = []
        for n in sorted(nums):
            nn = norm(n)
            if nn in pool: continue
            miss.append(('NUM', n, 'WINDOW-ONLY' if nn in win else 'MISSING'))
        for q in quoted:
            nq = norm(q)
            if nq in pool: continue
            miss.append(('QUOTE', q[:90], 'WINDOW-ONLY' if nq in win else 'MISSING'))
        for cp in sorted(caps):
            nc = norm(cp)
            if nc in pool: continue
            miss.append(('NAME', cp, 'WINDOW-ONLY' if nc in win else 'MISSING'))
        tot += 1
        if miss:
            flag += 1
            print('%s [%s/%s]' % (s['sc'], s['tier'], s['support']))
            for k, v, w in miss: print('    %-5s %-12s %s' % (k, w, v))
print('sub-claims checked', tot, 'with at least one detail not in the cited quotes/notes', flag)
